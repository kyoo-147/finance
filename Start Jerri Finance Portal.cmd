@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul || (echo Node.js 24 or later is required.& pause & exit /b 1)
if not exist "node_modules\" (
  echo Installing local dependencies...
  call npm install || (echo Installation failed.& pause & exit /b 1)
)
if not exist "dist\index.html" (
  echo Building the local portal...
  call npm run build || (echo Build failed.& pause & exit /b 1)
)

curl.exe -fsS "http://127.0.0.1:4747/api/health" >nul 2>nul
if errorlevel 1 start "Jerri Finance Portal" /min cmd /c "npm run server"

set READY=
for /L %%I in (1,1,20) do (
  curl.exe -fsS "http://127.0.0.1:4747/api/health" >nul 2>nul
  if not errorlevel 1 set READY=1
  if defined READY goto :open
  timeout /t 1 /nobreak >nul
)
echo The local portal did not start. Keep this window open and check the server message.
pause
exit /b 1

:open
start "" "http://127.0.0.1:4747"
endlocal
