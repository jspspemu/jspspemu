precision mediump float;

#define GU_TFX_MODULATE  0
#define GU_TFX_DECAL     1
#define GU_TFX_BLEND     2
#define GU_TFX_REPLACE   3
#define GU_TFX_ADD       4

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
#endif

void main() {
	#ifdef VERTEX_COLOR
		gl_FragColor = v_Color;
	#else
		gl_FragColor = uniformColor;
	#endif

	#ifdef VERTEX_TEXTURE
		vec4 texColor = texture2D(uSampler, vec2(v_Texcoord.s, v_Texcoord.t));

		if (tfx == GU_TFX_MODULATE) {
			gl_FragColor *= texColor;
		} else if (tfx == GU_TFX_ADD) {
			gl_FragColor.rgb += texColor.rgb;
			gl_FragColor.a = (tcc == GU_TCC_RGB) ? gl_FragColor.a : (texColor.a * gl_FragColor.a);
		} else {
			gl_FragColor *= texColor;
		}
	#endif
}
