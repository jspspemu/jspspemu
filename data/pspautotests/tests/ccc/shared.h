#pragma once

#include <common.h>
#include "ccc-imports.h"

struct AutoCCCModule {
	AutoCCCModule();
	~AutoCCCModule();

	bool IsValid() {
		return id >= 0 || RUNNING_ON_EMULATOR;
	}

	SceUID id;
};

bool LoadCCCTables();
