@echo off
REM SET XWALK_PATH=C:\dev\crosswalk-6.35.131.4
SET XWALK_PATH=C:\dev\crosswalk-5.34.104.5
mkdir "%~dp0\xwalk"
mkdir "%~dp0\xwalk\polyfills"
mkdir "%~dp0\xwalk\flash0"
mkdir "%~dp0\xwalk\lib"
copy "%~dp0\xwalk_manifest.json" "%~dp0\xwalk\manifest.json"
copy "%~dp0\..\icon128.png" "%~dp0\xwalk\icon128.png"
copy "%~dp0\..\index.html" "%~dp0\xwalk\index.html"
copy "%~dp0\..\jspspemu.js" "%~dp0\xwalk\jspspemu.js"
copy "%~dp0\..\pspemu.css" "%~dp0\xwalk\pspemu.css"
copy "%~dp0\..\workertask.js" "%~dp0\xwalk\workertask.js"
copy "%~dp0\..\MediaEngine.js" "%~dp0\xwalk\MediaEngine.js"
copy "%~dp0\..\shader.frag" "%~dp0\xwalk\shader.frag"
copy "%~dp0\..\shader.vert" "%~dp0\xwalk\shader.vert"
copy "%~dp0\..\buttons.ttf" "%~dp0\xwalk\buttons.ttf"
xcopy /y /e "%~dp0\..\polyfills" "%~dp0\xwalk\polyfills"
xcopy /y /e "%~dp0\..\flash0" "%~dp0\xwalk\flash0"
xcopy /y /e "%~dp0\..\lib" "%~dp0\xwalk\lib"
PUSHD %XWALK_PATH%
python make_apk.py --manifest="%~dp0\xwalk\manifest.json"
POPD
adb install %XWALK_PATH%\jspspemu_0.0.0.1_arm.apk