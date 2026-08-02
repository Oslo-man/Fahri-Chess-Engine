@echo off
REM ===== Chess Analyzer launcher =====
REM Starts a small local web server in this folder and opens the app.
REM Close this window to stop the server.

cd /d "%~dp0"

set PORT=8777

echo Starting Chess Analyzer on http://localhost:%PORT% ...
echo (Keep this window open. Close it to stop the server.)
echo.

REM Open the browser after a short delay so the server is up first.
start "" cmd /c "timeout /t 1 >nul & start http://localhost:%PORT%/index.html"

REM Try the Windows 'py' launcher first, then fall back to 'python'.
where py >nul 2>nul
if %errorlevel%==0 (
    py -m http.server %PORT%
) else (
    python -m http.server %PORT%
)

REM If we get here the server stopped or Python wasn't found.
echo.
echo Server stopped. If you saw a "not recognized" error above,
echo Python is not installed or not on PATH.
pause
