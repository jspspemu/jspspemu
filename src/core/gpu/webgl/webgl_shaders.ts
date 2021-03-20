// https://plugins.jetbrains.com/plugin/6993-glsl-support

//language=glsl
export const shader_frag = `
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
#endif

#ifdef ALPHATEST
  uniform int alphaTestFunc;
  uniform int alphaTestReference;
  uniform int alphaTestMask;
#endif

uniform float time;

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
      texColor = texture2D(uSampler, vec2(v_Texcoord.s, v_Texcoord.t));
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
`

//language=glsl
export const shader_vert = `
//#extension GL_ARB_gpu_shader_fp64 : enable
//#pragma optionNV(fastmath off)
//#pragma optionNV(fastprecision off)

precision mediump float;

uniform mat4 u_modelViewProjMatrix;

attribute vec4 vPosition;

uniform int u_enableSkinning;

#define TYPE_VOID 0
#define TYPE_BYTE 1
#define TYPE_SHORT 2
#define TYPE_FLOAT 3

#define COLOR_VOID 0
#define COLOR_5650 4
#define COLOR_5551 5
#define COLOR_4444 6
#define COLOR_8888 7

#ifdef VERTEX_COLOR
  attribute highp vec4 vColor;
  varying vec4 v_Color;
#endif

#ifdef VERTEX_TEXTURE
  uniform mat4 u_texMatrix;
  attribute highp vec4 vTexcoord;
  varying vec4 v_Texcoord;
#endif

#ifdef VERTEX_NORMAL
  attribute vec4 vNormal;
#endif

#if (VERTEX_SKINNING >= 1)
  uniform mat4 matrixBone0;
  uniform mat4 matrixBone1;
  uniform mat4 matrixBone2;
  uniform mat4 matrixBone3;
  uniform mat4 matrixBone4;
  uniform mat4 matrixBone5;
  uniform mat4 matrixBone6;
  uniform mat4 matrixBone7;

  attribute vec4 vertexWeight1;
  attribute vec4 vertexWeight2;

  mat4 getMatrixBone(int index) {
    if (index == 0) return matrixBone0;
    if (index == 1) return matrixBone1;
    if (index == 2) return matrixBone2;
    if (index == 3) return matrixBone3;
    if (index == 4) return matrixBone4;
    if (index == 5) return matrixBone5;
    if (index == 6) return matrixBone6;
    return matrixBone7;
  }

  
  float _getVertexWeight(int index) {
    if (index == 0) return vertexWeight1.x;
    if (index == 1) return vertexWeight1.y;
    if (index == 2) return vertexWeight1.z;
    if (index == 3) return vertexWeight1.w;
    if (index == 4) return vertexWeight2.x;
    if (index == 5) return vertexWeight2.y;
    if (index == 6) return vertexWeight2.z;
    if (index == 7) return vertexWeight2.w;
    return 0.0;
  }
  
  float getVertexWeight(int index) {
    float weight = _getVertexWeight(index);
    
    #if VERTEX_WEIGHT == TYPE_BYTE
    weight /= 128.0;
    #elif VERTEX_WEIGHT == TYPE_SHORT
    weight /= 32768.0;
    #endif

    return weight;
  }

  vec4 performSkinning(vec4 vertexIn) {
    vec4 vertexOut = vec4(0.0, 0.0, 0.0, 0.0);
  
    float totalWeight = 0.0;
    for (int n = 0; n < VERTEX_SKINNING; n++) totalWeight += (getVertexWeight(n));
    for (int n = 0; n < VERTEX_SKINNING; n++) vertexOut += (getMatrixBone(n) * (getVertexWeight(n)) / totalWeight) * vertexIn;

    return vertexOut;
  }

  //vec4 prepareNormal(vec4 normal) {
  //  return hasReversedNormal ? -normal : normal;
  //}
#endif

#ifdef VERTEX_COLOR

// We will be able to use >> and && when webgl2 is released.
// Since the emulator requires quite power, probably mobiles/desktops
// that we will be able to run it at decent speeds will support opengl es 3.0,
// and thus webgl2

void DecodeColor5650(inout highp vec4 C)
{
    int packedBits = int(C.x);
    int rBits = packedBits - (packedBits / 32 * 32);
    int gBits = (packedBits / 32) - (packedBits / 32 / 64 * 64);
    int bBits = packedBits / 2048;
    C.r = float((rBits * 8) + (rBits /  4));
    C.g = float((gBits * 4) + (gBits / 16));
    C.b = float((bBits * 8) + (bBits /  4));
    C.a = 1.0;
    C.rgb /= 255.0;
}

void DecodeColor5551(inout highp vec4 C)
{
    int packedBits = int(C.x);
    int rBits = packedBits - (packedBits / 32 * 32);
    int gBits = (packedBits / 32) - (packedBits / 32 / 32 * 32);
    int bBits = (packedBits / 1024) - (packedBits / 1024 / 32 * 32);
    C.r = float((rBits * 8) + (rBits / 4));
    C.g = float((gBits * 8) + (gBits / 4));
    C.b = float((bBits * 8) + (bBits / 4));
    C.a = float(packedBits / 32768);
    C.rgb /= 255.0;
}
void DecodeColor4444(inout highp vec4 C)
{
    int packedBits = int(C.x);
    int rBits = packedBits - (packedBits / 16 * 16);
    int gBits = (packedBits / 16) - (packedBits / 16 / 16 * 16);
    int bBits = (packedBits / 256) - (packedBits / 256 / 16 * 16);
    int aBits = packedBits / 4096;
    C.r = float((rBits * 16) + rBits);
    C.g = float((gBits * 16) + gBits);
    C.b = float((bBits * 16) + bBits);
    C.a = float((aBits * 16) + aBits);
    C /= 255.0;
}
#endif

void main() {
  #ifdef VERTEX_COLOR
    v_Color = vColor;
    #ifdef OPTIMIZED
      #if VERTEX_COLOR == COLOR_5650
      DecodeColor5650(v_Color);
      #elif VERTEX_COLOR == COLOR_5551
      DecodeColor5551(v_Color);
      #elif VERTEX_COLOR == COLOR_4444
      DecodeColor4444(v_Color);
      #elif VERTEX_COLOR == COLOR_8888
      v_Color /= vec4(255.0);
      #endif
    #endif
  #endif
  
  #ifdef VERTEX_TEXTURE
    vec4 tcoord = vTexcoord;
    #ifndef TRANSFORM_2D
      #if VERTEX_TEXTURE == TYPE_BYTE
      tcoord.xy /= vec2(128.0);
      #elif VERTEX_TEXTURE == TYPE_SHORT
      tcoord.xy /= vec2(32768.0);
      #endif
    #endif
    v_Texcoord = u_texMatrix * tcoord;
  #endif

  vec4 pos = vPosition;
  #ifndef TRANSFORM_2D
    #if VERTEX_POSITION == TYPE_BYTE
    pos.xyz /= vec3(127.0);
    #elif VERTEX_POSITION == TYPE_SHORT
    pos.xyz /= vec3(32767.0);
    #endif
  #endif
  
  #if (VERTEX_SKINNING >= 1)
    if (u_enableSkinning != 0) {
      pos = performSkinning(pos);
    }
  #endif

  gl_Position = u_modelViewProjMatrix * pos;
}
`