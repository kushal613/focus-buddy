#!/bin/bash

# Focus Warmup Server Stop Script

echo "🛑 Stopping Focus Warmup Servers..."

# Kill processes by PID if available
if [ -f .api.pid ]; then
    API_PID=$(cat .api.pid)
    if kill -0 $API_PID 2>/dev/null; then
        echo "Stopping main API server (PID: $API_PID)..."
        kill $API_PID
    fi
    rm .api.pid
fi

if [ -f .pdf.pid ]; then
    PDF_PID=$(cat .pdf.pid)
    if kill -0 $PDF_PID 2>/dev/null; then
        echo "Stopping PDF AI backend (PID: $PDF_PID)..."
        kill $PDF_PID
    fi
    rm .pdf.pid
fi

# Kill any remaining processes on the ports
echo "Cleaning up any remaining processes..."
lsof -ti:3131,3132 | xargs kill -9 2>/dev/null || true
pkill -f "node server.js" 2>/dev/null || true
pkill -f "nodemon" 2>/dev/null || true

echo "✅ All servers stopped"
