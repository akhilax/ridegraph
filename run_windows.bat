@echo off
REM ============================================================
REM  RideGraph - one-click setup and run (works from any drive)
REM  Needs: Python installed, and Neo4j running (ridegraph-db).
REM  Node.js is NOT needed: the website is already built in frontend\dist.
REM ============================================================
setlocal
set "ROOT=%~dp0"
cd /d "%ROOT%"

echo [1/6] Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python was not found. Install Python and tick "Add to PATH".
    pause & exit /b 1
)

echo [2/6] Virtual environment...
REM A venv copied from another PC does not work, so rebuild it if it is broken.
if exist "%ROOT%venv\Scripts\python.exe" (
    "%ROOT%venv\Scripts\python.exe" --version >nul 2>&1
    if errorlevel 1 rmdir /s /q "%ROOT%venv"
)
if not exist "%ROOT%venv\Scripts\python.exe" (
    echo Creating venv ^(first run only^)...
    python -m venv "%ROOT%venv"
    if errorlevel 1 ( echo ERROR: could not create venv. & pause & exit /b 1 )
)

echo [3/6] Installing packages...
"%ROOT%venv\Scripts\python.exe" -m pip install --quiet -r "%ROOT%backend\requirements.txt"
if errorlevel 1 ( echo ERROR: pip install failed. Check your internet. & pause & exit /b 1 )

echo [4/6] Checking the website files...
if exist "%ROOT%frontend\dist\index.html" (
    echo Website is already built. OK.
) else (
    REM dist is missing: build it, but only if Node.js is available
    where npm >nul 2>&1
    if errorlevel 1 (
        echo ERROR: frontend\dist is missing and Node.js is not installed.
        echo Copy the frontend\dist folder from the original project, or install Node.js and run this again.
        pause & exit /b 1
    )
    echo Building the website with Node.js ^(first time only^)...
    pushd "%ROOT%frontend"
    call npm install
    call npm run build
    popd
    if not exist "%ROOT%frontend\dist\index.html" ( echo ERROR: website build failed. & pause & exit /b 1 )
)

echo [5/6] Loading seed data into Neo4j...
cd /d "%ROOT%backend"
"%ROOT%venv\Scripts\python.exe" seed.py
if errorlevel 1 (
    echo.
    echo Could not reach Neo4j. Open Neo4j Desktop, click Start on "ridegraph-db",
    echo wait until it says RUNNING, then run this file again.
    pause & exit /b 1
)

echo [6/6] Starting RideGraph at http://localhost:5000  (close this window to stop)
REM Open the browser a few seconds after the server starts.
start "" cmd /c "timeout /t 3 >nul & start http://localhost:5000"
"%ROOT%venv\Scripts\python.exe" app.py
pause
