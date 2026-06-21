#!/bin/bash

PROJECT_DIR="$HOME/Projects/stefan-recovery-os"
PORT=8181
URL="http://localhost:$PORT"

# Verify the project folder exists
if [ ! -d "$PROJECT_DIR" ]; then
    echo "ERROR: Project folder not found: $PROJECT_DIR"
    echo "Check that the project is at $PROJECT_DIR and try again."
    exit 1
fi

cd "$PROJECT_DIR"

# Verify index.html is present before starting
if [ ! -f "index.html" ]; then
    echo "ERROR: index.html not found in $PROJECT_DIR"
    echo "The project may be incomplete or moved."
    exit 1
fi

# Open in Chrome if available, otherwise fall back to the default browser
open_browser() {
    echo "Opening browser..."
    if [ -d "/Applications/Google Chrome.app" ]; then
        open -a "Google Chrome" "$URL"
    else
        open "$URL"
    fi
}

# Check whether something is already listening on the port
if lsof -i :"$PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "Local server is already running on port $PORT."
    open_browser
    echo ""
    echo "No new server was started. Close this window when you are done."
else
    echo "Starting Stefan Recovery OS..."
    echo ""

    # Kill the server cleanly when this script exits (Ctrl+C or window close)
    trap 'kill "$SERVER_PID" 2>/dev/null' EXIT

    python3 -m http.server "$PORT" &
    SERVER_PID=$!

    # Brief pause so the server is ready before the browser opens
    sleep 1

    open_browser

    echo ""
    echo "Server running at $URL"
    echo "Keep this window open while using the app."
    echo "Press Ctrl+C or close this Terminal window to stop the server."
    echo ""

    wait "$SERVER_PID"
fi
