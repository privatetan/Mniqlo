#!/bin/bash

# Ensure we are in the project directory
PROJECT_DIR="/home/node/Mniqlo"
cd "$PROJECT_DIR" || exit

echo "Starting deployment restart script..."

# 1. Pull latest code
echo "1. Git Pull..."
git pull

# 2. Build the project
echo "2. Building..."
npm run build

# 3. Kill process on port 3000
echo "3. Cleaning up port 3000..."
# Find PID listening on port 3000
PID=$(lsof -t -i:3000)

if [ -n "$PID" ]; then
    echo "Killing process $PID..."
    kill -9 $PID
else
    echo "No process found on port 3000."
fi

# 4. Start the application with nohup
echo "4. Starting application..."
nohup npm start > nohup.out 2>&1 &

echo "Restart complete! Logs are being written to nohup.out"
