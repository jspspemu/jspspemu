
export class Atrac3plusConstants {
    static AT3P_ERROR = -1
    static CH_UNIT_MONO = 0        ///< unit containing one coded channel
    static CH_UNIT_STEREO = 1        ///< unit containing two jointly-coded channels
    static CH_UNIT_EXTENSION = 2        ///< unit containing extension information
    static CH_UNIT_TERMINATOR = 3        ///< unit sequence terminator
    static ATRAC3P_POWER_COMP_OFF = 15   ///< disable power compensation
    static ATRAC3P_SUBBANDS = 16         ///< number of PQF subbands
    static ATRAC3P_SUBBAND_SAMPLES = 128 ///< number of samples per subband
    static ATRAC3P_FRAME_SAMPLES = Atrac3plusConstants.ATRAC3P_SUBBANDS * Atrac3plusConstants.ATRAC3P_SUBBAND_SAMPLES
    static ATRAC3P_PQF_FIR_LEN = 12      ///< length of the prototype FIR of the PQF

    static AT3_MAGIC = 0x0270 // "AT3"
    static AT3_PLUS_MAGIC = 0xFFFE // "AT3PLUS"
    static RIFF_MAGIC = 0x46464952 // "RIFF"
    static WAVE_MAGIC = 0x45564157 // "WAVE"
    static FMT_CHUNK_MAGIC = 0x20746D66 // "FMT "
    static FACT_CHUNK_MAGIC = 0x74636166 // "FACT"
    static SMPL_CHUNK_MAGIC = 0x6C706D73 // "SMPL"
    static DATA_CHUNK_MAGIC = 0x61746164 // "DATA"

    static ATRAC3_CONTEXT_READ_SIZE_OFFSET = 160
    static ATRAC3_CONTEXT_REQUIRED_SIZE_OFFSET = 164
    static ATRAC3_CONTEXT_DECODE_RESULT_OFFSET = 188

    static PSP_ATRAC_ALLDATA_IS_ON_MEMORY = -1
    static PSP_ATRAC_NONLOOP_STREAM_DATA_IS_ON_MEMORY = -2
    static PSP_ATRAC_LOOP_STREAM_DATA_IS_ON_MEMORY = -3

    static PSP_ATRAC_STATUS_NONLOOP_STREAM_DATA = 0
    static PSP_ATRAC_STATUS_LOOP_STREAM_DATA = 1

    static ATRAC_HEADER_HASH_LENGTH = 512
    static ERROR_ATRAC_UNKNOWN_FORMAT = -0x7f9cfffa
    static ERROR_ATRAC_INVALID_SIZE = -0x7f9cffef

    static PSP_CODEC_AT3PLUS = 0x00001000
    static PSP_CODEC_AT3 = 0x00001001
    static PSP_CODEC_MP3 = 0x00001002
    static PSP_CODEC_AAC = 0x00001003
}

export enum CodecType {
    PSP_MODE_AT_3_PLUS = 0x00001000,
    PSP_MODE_AT_3 = 0x00001001,
}
