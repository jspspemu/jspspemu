///<reference path="./global.d.ts" />

import '../src/emu/global';
import {LoggerLevel, loggerPolicies} from "../src/global/utils";

loggerPolicies.minLogLevel = LoggerLevel.WARN

import './pspautotests';
