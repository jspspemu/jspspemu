precision mediump float;

//#define DEBUG 1

#define GU_TFX_MODULATE  0
#define GU_TFX_DECAL     1
#define GU_TFX_BLEND     2
#define GU_TFX_REPLACE   3
#define GU_TFX_ADD       4

#define GU_TCC_RGB       0
#define GU_TCC_RGBA      1

#define GU_NEVER 0
#define GU_ALWAYS 1
#define GU_EQUAL 2
#define GU_NOT_EQUAL 3
#define GU_LESS 4
#define GU_LESS_OR_EQUAL 5
#define GU_GREATER 6
#define GU_GREATER_OR_EQUAL 7

#ifdef VERTEX_COLOR
	varying vec4 v_Color;
#else
	uniform vec4 uniformColor;
#endif

#ifdef VERTEX_TEXTURE
	uniform sampler2D uSampler;
	uniform int tfx;
	uniform int tcc;
	varying vec4 v_Texcoord;
#endif

#ifdef ALPHATEST
	uniform int alphaTestFunc;
	uniform int alphaTestReference;
	uniform int alphaTestMask;
#endif

void main() {
	#ifdef DEBUG
		#ifdef VERTEX_TEXTURE
			gl_FragColor = vec4(v_Texcoord.s, v_Texcoord.t, 0.0, 1.0);
		#else
			gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
		#endif
		return;
	#else
		#ifdef VERTEX_COLOR
			gl_FragColor = v_Color;
		#else
			gl_FragColor = uniformColor;
		#endif

		#ifdef VERTEX_TEXTURE
			//gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
			vec4 texColor = texture2D(uSampler, vec2(v_Texcoord.s, v_Texcoord.t));

			#ifdef ALPHATEST
				int alphaTestColor = int(texColor.a * 255.0);
				if (alphaTestMask != 0xFF) alphaTestColor = 0;

				     if (alphaTestFunc == GU_NEVER           ) { discard; }
				else if (alphaTestFunc == GU_ALWAYS          ) { }
				else if (alphaTestFunc == GU_EQUAL           ) { if (!(alphaTestColor == alphaTestReference)) discard; }
				else if (alphaTestFunc == GU_NOT_EQUAL       ) { if (!(alphaTestColor != alphaTestReference)) discard; }
				else if (alphaTestFunc == GU_LESS            ) { if (!(alphaTestColor  < alphaTestReference)) discard; }
				else if (alphaTestFunc == GU_LESS_OR_EQUAL   ) { if (!(alphaTestColor <= alphaTestReference)) discard; }
				else if (alphaTestFunc == GU_GREATER         ) { if (!(alphaTestColor  > alphaTestReference)) discard; }
				else if (alphaTestFunc == GU_GREATER_OR_EQUAL) { if (!(alphaTestColor >= alphaTestReference)) discard; }
			#endif

			if (tfx == GU_TFX_MODULATE) {
				gl_FragColor.rgb = texColor.rgb * gl_FragColor.rgb;
				gl_FragColor.a = (tcc == GU_TCC_RGBA) ? (gl_FragColor.a * texColor.a) : texColor.a;
			} else if (tfx == GU_TFX_DECAL) {
				if (tcc == GU_TCC_RGB) {
					gl_FragColor.rgba = texColor.rgba;
				} else {
					gl_FragColor.rgb = texColor.rgb * gl_FragColor.rgb;
					gl_FragColor.a = texColor.a;
				}
			} else if (tfx == GU_TFX_BLEND) {
				gl_FragColor.rgba = mix(texColor, gl_FragColor, 0.5);
			} else if (tfx == GU_TFX_REPLACE) {
				gl_FragColor.rgb = texColor.rgb;
				gl_FragColor.a = (tcc == GU_TCC_RGB) ? gl_FragColor.a : texColor.a;
			} else if (tfx == GU_TFX_ADD) {
				gl_FragColor.rgb += texColor.rgb;
				gl_FragColor.a = (tcc == GU_TCC_RGB) ? gl_FragColor.a : (texColor.a * gl_FragColor.a);
			} else {
				gl_FragColor = vec4(1, 0, 1, 1);
			}
		#endif
	#endif
}
