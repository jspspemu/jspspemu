@echo off

set OPTIONS="%~dp0\options.txt"
echo -t ES5 > %OPTIONS%
echo -m commonjs >> %OPTIONS%
echo --outDir js >> %OPTIONS%
dir "%~dp0\src\*.ts" /b /s >> %OPTIONS%
dir "%~dp0\test\*.ts" /b /s >> %OPTIONS%
dir "%~dp0\typings\*.ts" /b /s >> %OPTIONS%
rd /s /q "%~dp0\js"
CALL tsc @%OPTIONS%

node utils\http_server.js