#!/bin/bash

# ========================================
# Development Server Startup Script
# Starts both backend and frontend servers
# ========================================

echo "========================================"
echo "Attendance System - Development Mode"
echo "========================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 is not installed"
    exit 1
fi

# Install backend dependencies if needed
if [ ! -d "server/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd server
    npm install
    cd ..
fi

echo ""
echo "🚀 Starting servers..."
echo ""

# Start backend server in background
echo "▶  Starting backend server on port 3000..."
cd server
node server.js &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 2

# Start frontend server in background
echo "▶  Starting frontend server on port 8000..."
python3 -m http.server 8000 &
FRONTEND_PID=$!

sleep 1

echo ""
echo "========================================"
echo "✅ Both servers are running!"
echo "========================================"
echo ""
echo "📱 Frontend: http://localhost:8000"
echo "🔧 Backend API: http://localhost:3000/api"
echo ""
echo "Press Ctrl+C to stop both servers"
echo "========================================"
echo ""

# Wait for Ctrl+C
trap "echo ''; echo '🛑 Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID; echo '✅ Servers stopped'; exit" INT

# Keep script running
wait
