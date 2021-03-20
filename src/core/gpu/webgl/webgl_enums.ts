// https://www.khronos.org/registry/webgl/specs/1.0/#5.14
export const enum GL {
    DEPTH_BUFFER_BIT               = 0x00000100,
    STENCIL_BUFFER_BIT             = 0x00000400,
    COLOR_BUFFER_BIT               = 0x00004000,

    POINTS                         = 0x0000,
    LINES                          = 0x0001,
    LINE_LOOP                      = 0x0002,
    LINE_STRIP                     = 0x0003,
    TRIANGLES                      = 0x0004,
    TRIANGLE_STRIP                 = 0x0005,
    TRIANGLE_FAN                   = 0x0006,

    // BlendingFactorDest
    ZERO                           = 0,
    ONE                            = 1,
    SRC_COLOR                      = 0x0300,
    ONE_MINUS_SRC_COLOR            = 0x0301,
    SRC_ALPHA                      = 0x0302,
    ONE_MINUS_SRC_ALPHA            = 0x0303,
    DST_ALPHA                      = 0x0304,
    ONE_MINUS_DST_ALPHA            = 0x0305,

    // BlendingFactorSrc
    DST_COLOR                      = 0x0306,
    ONE_MINUS_DST_COLOR            = 0x0307,
    SRC_ALPHA_SATURATE             = 0x0308,

    // DataType
    BYTE                           = 0x1400, // 5120
    UNSIGNED_BYTE                  = 0x1401, // 5121
    SHORT                          = 0x1402, // 5122
    UNSIGNED_SHORT                 = 0x1403, // 5123
    INT                            = 0x1404, // 5124
    UNSIGNED_INT                   = 0x1405, // 5125
    FLOAT                          = 0x1406, // 5126

    NEVER                          = 0x0200,
    LESS                           = 0x0201,
    EQUAL                          = 0x0202,
    LEQUAL                         = 0x0203,
    GREATER                        = 0x0204,
    NOTEQUAL                       = 0x0205,
    GEQUAL                         = 0x0206,
    ALWAYS                         = 0x0207,

    KEEP                           = 0x1E00,
    REPLACE                        = 0x1E01,
    INCR                           = 0x1E02,
    DECR                           = 0x1E03,
    INVERT                         = 0x150A,
    INCR_WRAP                      = 0x8507,
    DECR_WRAP                      = 0x8508,

    FUNC_ADD                       = 0x8006,
    BLEND_EQUATION                 = 0x8009,
    BLEND_EQUATION_RGB             = 0x8009,   /* same as BLEND_EQUATION */
    BLEND_EQUATION_ALPHA           = 0x883D,

    FUNC_SUBTRACT                  = 0x800A,
    FUNC_REVERSE_SUBTRACT          = 0x800B,

    NO_ERROR                       = 0,
    INVALID_ENUM                   = 0x0500,
    INVALID_VALUE                  = 0x0501,
    INVALID_OPERATION              = 0x0502,
    OUT_OF_MEMORY                  = 0x0505,

    REPEAT = 0x2901,
    CLAMP_TO_EDGE = 0x812F,
    MIRRORED_REPEAT = 0x8370,
}

export enum ClearBufferSet {
	ColorBuffer = 1,
	StencilBuffer = 2,
	DepthBuffer = 4,
	FastClear = 16
}

