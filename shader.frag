precision mediump float;

//#define DEBUG 1

#define GU_TCC_RGB       0
#define GU_TCC_RGBA      1

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

	#ifdef TEXTURE_CLUT
		uniform sampler2D samplerClut;
	#endif
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
			vec4 texColor = texture2D(uSampler, vec2(v_Texcoord.s, v_Texcoord.t));
			#ifdef TEXTURE_CLUT
				texColor = texture2D(samplerClut, vec2(texColor.r, 0.0));
			#endif

			#ifdef ALPHATEST
				int alphaTestColor = int(texColor.a * 255.0);
				if (alphaTestMask != 0xFF) alphaTestColor = 0;

				     if (alphaTestFunc == 0) { discard; } // GU_NEVER
				else if (alphaTestFunc == 1) { } // GU_ALWAYS
				else if (alphaTestFunc == 2) { if (!(alphaTestColor == alphaTestReference)) discard; } // GU_EQUAL
				else if (alphaTestFunc == 3) { if (!(alphaTestColor != alphaTestReference)) discard; } // GU_NOT_EQUAL
				else if (alphaTestFunc == 4) { if (!(alphaTestColor  < alphaTestReference)) discard; } // GU_LESS
				else if (alphaTestFunc == 5) { if (!(alphaTestColor <= alphaTestReference)) discard; } // GU_LESS_OR_EQUAL
				else if (alphaTestFunc == 6) { if (!(alphaTestColor  > alphaTestReference)) discard; } // GU_GREATER
				else if (alphaTestFunc == 7) { if (!(alphaTestColor >= alphaTestReference)) discard; } // GU_GREATER_OR_EQUAL
			#endif

			if (tfx == 0) { // GU_TFX_MODULATE
				gl_FragColor.rgb = texColor.rgb * gl_FragColor.rgb;
				gl_FragColor.a = (tcc == GU_TCC_RGBA) ? (gl_FragColor.a * texColor.a) : texColor.a;
			} else if (tfx == 1) { // GU_TFX_DECAL
				if (tcc == GU_TCC_RGB) {
					gl_FragColor.rgba = texColor.rgba;
				} else {
					gl_FragColor.rgb = texColor.rgb * gl_FragColor.rgb;
					gl_FragColor.a = texColor.a;
				}
			} else if (tfx == 2) { // GU_TFX_BLEND
				gl_FragColor.rgba = mix(texColor, gl_FragColor, 0.5);
			} else if (tfx == 3) { // GU_TFX_REPLACE
				gl_FragColor.rgb = texColor.rgb;
				gl_FragColor.a = (tcc == GU_TCC_RGB) ? gl_FragColor.a : texColor.a;
			} else if (tfx == 4) { // GU_TFX_ADD
				gl_FragColor.rgb += texColor.rgb;
				gl_FragColor.a = (tcc == GU_TCC_RGB) ? gl_FragColor.a : (texColor.a * gl_FragColor.a);
			} else {
				gl_FragColor = vec4(1, 0, 1, 1);
			}
		#endif
	#endif
}
