#!/bin/bash
# ============================================================
#  RideGraph - one-click setup and run for macOS
#  Needs: Python 3 (python3) and Neo4j running (ridegraph-db).
#  Node.js is NOT needed: the website is already built in src/frontend/dist.
#
#  HOW TO START (first time): open Terminal and run
#      bash "/path/to/RideSense/run_mac.command"
#  (tip: type  bash  and a space, then drag this file into the Terminal window).
#  If the drive allows it you can run  chmod +x run_mac.command  once and then
#  double-click the file in Finder.
# ============================================================

# Always work from the folder this script lives in (works from any drive/location)
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT" || exit 1

echo "[1/6] Checking Python..."
if ! command -v python3 >/dev/null 2>&1; then
    echo "ERROR: python3 was not found. Install Python 3 from https://www.python.org/downloads/"
    read -r -p "Press Enter to close..." _; exit 1
fi
python3 --version || { echo "ERROR: python3 does not work (macOS may be asking you to install the Command Line Tools - accept it, then run this again)."; read -r -p "Press Enter to close..." _; exit 1; }

echo "[2/6] Virtual environment..."
# The Windows 'venv' folder cannot be used on a Mac, so the Mac gets its own: venv_mac
VENV="$ROOT/venv_mac"
if [ -x "$VENV/bin/python" ] && ! "$VENV/bin/python" --version >/dev/null 2>&1; then
    rm -rf "$VENV"     # broken (e.g. copied from another Mac) -> rebuild
fi
if [ ! -x "$VENV/bin/python" ]; then
    echo "Creating venv_mac (first run only)..."
    python3 -m venv "$VENV" || { echo "ERROR: could not create the virtual environment."; echo "If this drive is read-only for macOS (NTFS), copy the whole RideSense folder to your Mac first."; read -r -p "Press Enter to close..." _; exit 1; }
fi

echo "[3/6] Installing packages..."
"$VENV/bin/python" -m pip install --quiet -r "$ROOT/src/backend/requirements.txt" || { echo "ERROR: pip install failed. Check your internet."; read -r -p "Press Enter to close..." _; exit 1; }

echo "[4/6] Checking the website files..."
if [ -f "$ROOT/src/frontend/dist/index.html" ]; then
    echo "Website is already built. OK."
elif command -v npm >/dev/null 2>&1; then
    echo "Building the website with Node.js (first time only)..."
    (cd "$ROOT/src/frontend" && npm install && npm run build)
    [ -f "$ROOT/src/frontend/dist/index.html" ] || { echo "ERROR: website build failed."; read -r -p "Press Enter to close..." _; exit 1; }
else
    echo "ERROR: src/frontend/dist is missing and Node.js is not installed."
    echo "Copy the src/frontend/dist folder from the original project, or install Node.js and run this again."
    read -r -p "Press Enter to close..." _; exit 1
fi

echo "[5/6] Loading seed data into Neo4j..."
cd "$ROOT/src/backend" || exit 1
if ! "$VENV/bin/python" seed.py; then
    echo
    echo "Could not reach Neo4j. Open Neo4j Desktop, click Start on your database,"
    echo "wait until it says RUNNING (password must match src/backend/.env), then run this again."
    read -r -p "Press Enter to close..." _; exit 1
fi

# macOS often uses port 5000 for "AirPlay Receiver". If it is taken, use 5001 instead.
PORT=5000
if lsof -nP -iTCP:5000 -sTCP:LISTEN >/dev/null 2>&1; then
    PORT=5001
    echo "Port 5000 is busy (probably AirPlay Receiver) - using port $PORT instead."
fi
export RIDEGRAPH_PORT="$PORT"

echo "[6/6] Starting RideGraph at http://localhost:$PORT  (press Control+C or close this window to stop)"
# open the browser a few seconds after the server starts
( sleep 3; open "http://localhost:$PORT" ) &
"$VENV/bin/python" app.py
