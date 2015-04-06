TARGET = benchmark
OBJS = main.o
PSP_EBOOT_TITLE = benchmark

BUILD_PRX = 1
PSP_FW_VERSION = 500

PSP_DRIVE = /cygdrive/j
USE_PSPSDK_LIBC = 1

INCDIR = 
CFLAGS = -O2 -G0 -Wall -fno-tree-loop-optimize -fno-inline-small-functions
CXXFLAGS = $(CFLAGS) -fno-exceptions -fno-rtti 
ASFLAGS = $(CFLAGS)

LIBDIR = 
LDFLAGS = 
LIBS= -lpspgu -lpspgum -lpsppower -lpsprtc -lpspctrl -lc -lm -lz

#EXTRA_TARGETS = EBOOT.PBP
#PSP_EBOOT_ICON = icon.png

PSPSDK=$(shell psp-config --pspsdk-path)
include $(PSPSDK)/lib/build.mak