TARGET_LIB = libcommon.a
EXTRA_TARGETS = libcommon_kernel.a
OBJS = common.o vram.o sysmem-imports.o
KERNEL_OBJS = common_kernel.o vram.o sysmem-imports.o

INCDIR = 
CFLAGS = -O0 -G 0 -g -Wall
CXXFLAGS = $(CFLAGS) -fno-exceptions -fno-rtti
ASFLAGS = $(CFLAGS)

LIBDIR =
LDFLAGS = -G0

PSPSDK=$(shell psp-config --pspsdk-path)
include $(PSPSDK)/lib/build.mak

%.o: %.S
	$(AS) $(ASFLAGS) -c -o $@ $<

common_kernel.o: common.c
	$(CC) $(CFLAGS) -DCOMMON_KERNEL=1 -c -o $@ $<

libcommon_kernel.a: $(KERNEL_OBJS)
	$(AR) cru $@ $(KERNEL_OBJS)
	$(RANLIB) $@
