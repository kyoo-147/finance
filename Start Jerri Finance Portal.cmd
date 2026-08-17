@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo Checking Node.js...
where node >nul 2>nul || (echo ERROR: Node.js 24 or later is required. Install it from https://nodejs.org/ & pause & exit /b 1)
for /f "delims=." %%V in ('node -p "process.versions.node"') do set NODE_MAJOR=%%V
if not defined NODE_MAJOR (echo ERROR: Unable to read the Node.js version.& pause & exit /b 1)
if %NODE_MAJOR% LSS 24 (echo ERROR: Node.js 24 or later is required. Found Node.js %NODE_MAJOR%.& pause & exit /b 1)
echo Node.js version accepted.

if not exist "node_modules\" (
  echo Installing local dependencies...
  call npm install || (echo ERROR: Dependency installation failed.& pause & exit /b 1)
)
if not exist "dist\index.html" (
  echo Building the local portal...
  call npm run build || (echo ERROR: Production build failed.& pause & exit /b 1)
)

curl.exe -fsS "http://127.0.0.1:4747/api/health" >nul 2>nul
if errorlevel 1 (
  echo Starting the local portal...
  start "Jerri Finance Portal" /min cmd /c "npm run server"
)

set READY=
for /L %%I in (1,1,30) do (
  curl.exe -fsS "http://127.0.0.1:4747/api/health" >nul 2>nul
  if not errorlevel 1 set READY=1
  if defined READY goto :open
  timeout /t 1 /nobreak >nul
)
echo ERROR: The local portal did not become healthy on http://127.0.0.1:4747.
echo Keep the server window open and inspect its error output.
pause
exit /b 1

:open
start "" "http://127.0.0.1:4747"
echo Jerri Finance Portal is ready.
endlocal
