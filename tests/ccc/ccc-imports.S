.set noreorder

#include "pspimport.s"

# Not sure what the flags should be?
IMPORT_START "sceCcc",0x40090011

IMPORT_FUNC  "sceCcc",0xB4D1CBBF,sceCccSetTable
IMPORT_FUNC  "sceCcc",0x00D1378F,sceCccUTF8toUTF16
IMPORT_FUNC  "sceCcc",0x6F82EE03,sceCccUTF8toSJIS
IMPORT_FUNC  "sceCcc",0x41B724A5,sceCccUTF16toUTF8
IMPORT_FUNC  "sceCcc",0xF1B73D12,sceCccUTF16toSJIS
IMPORT_FUNC  "sceCcc",0xA62E6E80,sceCccSJIStoUTF8
IMPORT_FUNC  "sceCcc",0xBEB47224,sceCccSJIStoUTF16
IMPORT_FUNC  "sceCcc",0xb7d3c112,sceCccStrlenUTF8
IMPORT_FUNC  "sceCcc",0x4BDEB2A8,sceCccStrlenUTF16
IMPORT_FUNC  "sceCcc",0xd9392ccb,sceCccStrlenSJIS
IMPORT_FUNC  "sceCcc",0x92C05851,sceCccEncodeUTF8
IMPORT_FUNC  "sceCcc",0x8406F469,sceCccEncodeUTF16
IMPORT_FUNC  "sceCcc",0x068c4320,sceCccEncodeSJIS
IMPORT_FUNC  "sceCcc",0xc6a8bee2,sceCccDecodeUTF8
IMPORT_FUNC  "sceCcc",0xe0cf8091,sceCccDecodeUTF16
IMPORT_FUNC  "sceCcc",0x953e6c10,sceCccDecodeSJIS
IMPORT_FUNC  "sceCcc",0x90521ac5,sceCccIsValidUTF8
IMPORT_FUNC  "sceCcc",0xcc0a8bda,sceCccIsValidUTF16
IMPORT_FUNC  "sceCcc",0x67bf0d19,sceCccIsValidSJIS
IMPORT_FUNC  "sceCcc",0x76e33e9c,sceCccIsValidUCS2
IMPORT_FUNC  "sceCcc",0xd2b18485,sceCccIsValidUCS4
IMPORT_FUNC  "sceCcc",0xa2d5d209,sceCccIsValidJIS
IMPORT_FUNC  "sceCcc",0x17e1d813,sceCccSetErrorCharUTF8
IMPORT_FUNC  "sceCcc",0xb8476cf4,sceCccSetErrorCharUTF16
IMPORT_FUNC  "sceCcc",0xc56949ad,sceCccSetErrorCharSJIS
IMPORT_FUNC  "sceCcc",0x70ecaa10,sceCccUCStoJIS
IMPORT_FUNC  "sceCcc",0xfb7846e2,sceCccJIStoUCS
