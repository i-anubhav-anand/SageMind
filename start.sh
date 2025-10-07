#!/bin/bash

# Kill any processes on ports 8000 and 3000
echo "Checking for processes on ports 8000 and 3000..."
PIDS=$(lsof -ti:8000,3000 2>/dev/null)
if [ -n "$PIDS" ]; then
    echo "Killing processes on ports 8000 and 3000: $PIDS"
    kill -9 $PIDS
fi

# Build and start the application using docker-compose
echo "Starting application with Docker Compose..."
docker-compose -f docker-compose.dev.yaml up --build

# To stop the application, press Ctrl+C 