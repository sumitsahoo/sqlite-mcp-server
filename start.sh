#!/bin/bash

# Define colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting SQLite MCP Server & DataStudio...${NC}\n"

# Clean up existing processes on ports 3001 and 5173
echo -e "${YELLOW}🧹 Cleaning up existing processes on ports 3001 and 5173...${NC}"
kill $(lsof -t -i:3001) 2>/dev/null || true
kill $(lsof -t -i:5173) 2>/dev/null || true
# Wait briefly for ports to be freed
sleep 1

# Trap SIGINT (Ctrl+C) to kill background processes when the script exits
trap 'kill 0' SIGINT

# Start the server in the background
echo -e "${BLUE}▶ Starting Server (Port 3001)...${NC}"
cd server || exit 1
npm run dev &
SERVER_PID=$!

# Go back to root and start the client in the background
cd ..
echo -e "${BLUE}▶ Starting Client (Port 5173)...${NC}"
cd client || exit 1
npm run dev &
CLIENT_PID=$!

echo -e "\n${GREEN}✅ Both services are starting up!${NC}"
echo -e "Server: http://localhost:3001/sse"
echo -e "Client: http://localhost:5173"
echo -e "\nPress Ctrl+C to stop both services.\n"

# Wait for background processes to prevent script from exiting
wait
