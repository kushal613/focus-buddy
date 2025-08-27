# Focus Warmup Server Management

This document explains how to manage the Focus Warmup API servers to prevent the "Could not reach AI service" error.

## Quick Start

### Start Servers
```bash
./start-servers.sh
```

### Stop Servers
```bash
./stop-servers.sh
```

## Server Details

### Main API Server (Port 3131)
- **Purpose**: Handles chat functionality and general AI interactions
- **Location**: `focus-warmup-api/server.js`
- **Endpoint**: `http://localhost:3131`
- **Key Endpoints**:
  - `GET /` - Health check
  - `POST /chat` - Chat functionality

### PDF AI Backend (Port 3132)
- **Purpose**: Handles PDF processing and MCQ generation
- **Location**: `pdf-ai-backend/server.js`
- **Endpoint**: `http://localhost:3132`
- **Key Endpoints**:
  - `GET /health` - Health check
  - `POST /upload` - Upload PDF
  - `POST /prompt` - Generate teaching prompts
  - `POST /evaluate` - Evaluate MCQ answers

## Troubleshooting

### "Could not reach AI service" Error

This error occurs when the Chrome extension can't connect to the API servers. Here's how to fix it:

1. **Check if servers are running**:
   ```bash
   curl http://localhost:3131/
   curl http://localhost:3132/health
   ```

2. **If servers are not responding, restart them**:
   ```bash
   ./stop-servers.sh
   ./start-servers.sh
   ```

3. **Check for port conflicts**:
   ```bash
   lsof -i :3131
   lsof -i :3132
   ```

4. **Kill conflicting processes**:
   ```bash
   lsof -ti:3131,3132 | xargs kill -9
   ```

### Common Issues

1. **Port already in use**: Another process is using ports 3131 or 3132
   - Solution: Run `./stop-servers.sh` then `./start-servers.sh`

2. **Node.js not found**: Make sure Node.js is installed
   - Solution: Install Node.js from https://nodejs.org/

3. **Missing dependencies**: Run `npm install` in both server directories
   ```bash
   cd focus-warmup-api && npm install
   cd ../pdf-ai-backend && npm install
   ```

4. **OpenAI API key not configured**: Make sure the `.env` files contain your API key
   - Check `focus-warmup-api/.env` and `pdf-ai-backend/.env`

## Manual Server Management

If you prefer to manage servers manually:

### Start Main API Server
```bash
cd focus-warmup-api
node server.js
```

### Start PDF Backend Server
```bash
cd pdf-ai-backend
node server.js
```

### Using nodemon for Development
```bash
cd focus-warmup-api
npm run dev
```

```bash
cd pdf-ai-backend
npm run dev
```

## Logs

Server logs are saved to:
- `api.log` - Main API server logs
- `pdf.log` - PDF AI backend logs

To view logs in real-time:
```bash
tail -f api.log
tail -f pdf.log
```

## Chrome Extension Reload

After starting/stopping servers, you may need to reload the Chrome extension:

1. Go to `chrome://extensions/`
2. Find "Focus Warmup"
3. Click the refresh/reload button
4. Or toggle the extension off and on

## Testing

Test that everything is working:

1. **Test API endpoints**:
   ```bash
   curl -X POST http://localhost:3131/chat \
     -H "Content-Type: application/json" \
     -d '{"topic": "test", "conversationHistory": []}'
   ```

2. **Test Chrome extension**:
   - Visit a distraction site (Facebook, Instagram, etc.)
   - The Focus Warmup overlay should appear
   - Click "Learn More" to test AI functionality

## Environment Variables

Make sure both `.env` files contain your OpenAI API key:

**focus-warmup-api/.env**:
```
OPENAI_API_KEY=sk-proj-your-api-key-here
```

**pdf-ai-backend/.env**:
```
OPENAI_API_KEY=sk-proj-your-api-key-here
```

## Automatic Startup (Optional)

To automatically start servers when you open a terminal, add to your shell profile:

```bash
# Add to ~/.bashrc or ~/.zshrc
alias focus-warmup-start='cd /path/to/Extension && ./start-servers.sh'
alias focus-warmup-stop='cd /path/to/Extension && ./stop-servers.sh'
```

Then you can simply run:
```bash
focus-warmup-start
focus-warmup-stop
```
