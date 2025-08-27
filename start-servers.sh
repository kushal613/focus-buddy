#!/bin/bash

# Focus Warmup Server Startup Script
# This script ensures both API servers are running properly

echo "🚀 Starting Focus Warmup Servers..."

# Kill any existing processes on the ports
echo "Cleaning up existing processes..."
lsof -ti:3131,3132 | xargs kill -9 2>/dev/null || true
pkill -f "node server.js" 2>/dev/null || true
pkill -f "nodemon" 2>/dev/null || true

# Wait a moment for ports to be freed
sleep 2

# Start the main API server
echo "Starting main API server (port 3131)..."
cd focus-warmup-api
nohup node server.js > ../api.log 2>&1 &
API_PID=$!
cd ..

# Start the PDF AI backend server
echo "Starting PDF AI backend (port 3132)..."
cd pdf-ai-backend
nohup node server.js > ../pdf.log 2>&1 &
PDF_PID=$!
cd ..

# Wait for servers to start
echo "Waiting for servers to start..."
sleep 5

# Test the servers
echo "Testing servers..."

# Test main API
if curl -s http://localhost:3131/ > /dev/null; then
    echo "✅ Main API server is running on port 3131"
else
    echo "❌ Main API server failed to start"
    exit 1
fi

# Test PDF backend
if curl -s http://localhost:3132/health > /dev/null; then
    echo "✅ PDF AI backend is running on port 3132"
else
    echo "❌ PDF AI backend failed to start"
    exit 1
fi

# Test chat functionality
echo "Testing chat functionality..."
CHAT_RESPONSE=$(curl -s -X POST http://localhost:3131/chat \
    -H "Content-Type: application/json" \
    -d '{"topic": "test", "conversationHistory": []}')

if echo "$CHAT_RESPONSE" | grep -q "reply"; then
    echo "✅ Chat functionality is working"
else
    echo "❌ Chat functionality failed"
    exit 1
fi

echo ""
echo "🎉 All servers are running successfully!"
echo "📊 Main API: http://localhost:3131"
echo "📚 PDF AI Backend: http://localhost:3132"
echo ""
echo "💡 To stop servers, run: ./stop-servers.sh"
echo "📝 Logs are saved in: api.log and pdf.log"
echo ""
echo "Process IDs:"
echo "  Main API: $API_PID"
echo "  PDF Backend: $PDF_PID"

# Save PIDs for easy stopping
echo "$API_PID" > .api.pid
echo "$PDF_PID" > .pdf.pid
