precision mediump float;

//#define DEBUG 1

#define GU_TCC_RGB       0
#define GU_TCC_RGBA      1

uniform int u_enableColors;
uniform int u_enableTextures;
uniform int u_enableBilinear;

#ifdef VERTEX_COLOR
	varying vec4 v_Color;
#else
	uniform vec4 uniformColor;
#endif

#ifdef VERTEX_TEXTURE
	uniform sampler2D uSampler;
	uniform vec2 textureSize;
	uniform vec2 pixelSize;
	uniform int tfx;
	uniform int tcc;
	varying vec4 v_Texcoord;

	#ifdef TEXTURE_CLUT
		uniform sampler2D samplerClut;
		uniform float samplerClutStart;
		uniform float samplerClutShift;
		uniform float samplerClutMask;
	#endif
#endif

#ifdef ALPHATEST
	uniform int alphaTestFunc;
	uniform int alphaTestReference;
	uniform int alphaTestMask;
#endif

uniform float time;

#ifdef TEXTURE_CLUT
vec4 getClutColor(float color) {
	return texture2D(samplerClut, vec2(color + (samplerClutStart / 256.0), 0.0));
}

vec4 getClutColorAt(vec2 coords) {
	return getClutColor(texture2D(uSampler, vec2(coords.s, coords.t)).x);
}

vec4 bilinearInterpolate(in vec4 topLeft, in vec4 topRight, in vec4 bottomLeft, in vec4 bottomRight, in vec2 mixFactor) {
	vec4 top = mix(topLeft, topRight, mixFactor.x);
	vec4 bottom = mix(bottomLeft, bottomRight, mixFactor.x);
    return mix(top, bottom, mixFactor.y);
}

vec4 getInterpolatedClutColor(vec2 coords) {
	vec2 centerCoords = floor(coords * textureSize) / textureSize;
	vec4 topLeft = getClutColorAt(centerCoords + vec2(0, 0));
	if (u_enableBilinear == 0) return topLeft;
	vec4 topRight = getClutColorAt(centerCoords + vec2(+pixelSize.x, 0));
	vec4 bottomLeft = getClutColorAt(centerCoords + vec2(0, +pixelSize.y));
	vec4 bottomRight = getClutColorAt(centerCoords + vec2(+pixelSize.x, +pixelSize.y));
	vec2 mixFactor = fract(coords * textureSize);
	return bilinearInterpolate(topLeft, topRight, bottomLeft, bottomRight, mixFactor);
}
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
			vec4 texColor;
			#ifdef TEXTURE_CLUT
				texColor = getInterpolatedClutColor(v_Texcoord.st);
			#else
				texColor = texture2D(uSampler, vec2(v_Texcoord.s, v_Texcoord.t));
			#endif
			if (u_enableTextures == 0) {
				texColor.rgb = vec3(1.0, 1.0, 1.0);
			}

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

			if (u_enableColors != 0) {
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
			} else {
				gl_FragColor = texColor;
			}
		#endif
	#endif
}
