#pragma once

#ifdef __cplusplus
extern "C" {
#endif

int sceCccSetTable(u16 *jis2ucs, u16 *ucs2jis);
u32 sceCccUCStoJIS(u32 ucs, u32 fallback);
u32 sceCccJIStoUCS(u32 jis, u32 fallback);

int sceCccUTF8toUTF16(u16 *dst, u32 dstSize, const char *src);
int sceCccUTF8toSJIS(char *dst, u32 dstSize, const char *src);
int sceCccUTF16toUTF8(char *dst, u32 dstSize, const u16 *src);
int sceCccUTF16toSJIS(char *dst, u32 dstSize, const u16 *src);
int sceCccSJIStoUTF8(char *dst, u32 dstSize, const char *src);
int sceCccSJIStoUTF16(u16 *dst, u32 dstSize, const char *src);

int sceCccStrlenUTF8(const char *str);
int sceCccStrlenUTF16(const u16 *str);
int sceCccStrlenSJIS(const char *str);

char *sceCccEncodeUTF8(char **dst, u32 ucs);
void sceCccEncodeUTF16(u16 **dst, u32 ucs);
char *sceCccEncodeSJIS(char **dst, u32 ucs);

u32 sceCccDecodeUTF8(const char **dst);
u32 sceCccDecodeUTF16(const u16 **dst);
u32 sceCccDecodeSJIS(const char **dst);

u16 sceCccSetErrorCharUTF8(u16 errChar);
u16 sceCccSetErrorCharUTF16(u16 errChar);
u16 sceCccSetErrorCharSJIS(u16 errChar);

int sceCccIsValidUTF8(u32 c);
int sceCccIsValidUTF16(u32 c);
int sceCccIsValidSJIS(u32 c);
int sceCccIsValidUCS2(u32 c);
int sceCccIsValidUCS4(u32 c);
int sceCccIsValidJIS(u32 c);

#ifdef __cplusplus
}
#endif
