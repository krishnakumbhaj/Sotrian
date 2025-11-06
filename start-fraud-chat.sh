#!/bin/bash

# Quick Start Script for Fraud Detection Chat
# Run this from the project root

echo "🚀 Starting Fraud Detection Chat System..."
echo ""

# Check if we're in the right directory
if [ ! -d "Katalyst" ] || [ ! -d "Models" ]; then
    echo "❌ Error: Run this from the project root directory"
    echo "   Expected structure: Katalyst/ and Models/ folders"
    exit 1
fi

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo "⚠️  Port $1 is already in use"
        return 1
    else
        return 0
    fi
}

# Check ports
echo "📡 Checking ports..."
check_port 3000 || echo "   Next.js may already be running"
check_port 8000 || echo "   FastAPI may already be running"
echo ""

# Check environment files
echo "🔧 Checking environment setup..."
if [ ! -f "Katalyst/.env.local" ]; then
    echo "⚠️  Warning: Katalyst/.env.local not found"
    echo "   Copy Katalyst/.env.example to Katalyst/.env.local and configure"
fi

if [ ! -f "Models/.env" ]; then
    echo "⚠️  Warning: Models/.env not found"
    echo "   Create Models/.env with ALLOWED_ORIGINS"
fi
echo ""

# Start FastAPI in background
echo "🐍 Starting FastAPI server (port 8000)..."
cd Models
python fastapi_server.py &
FASTAPI_PID=$!
cd ..
echo "   FastAPI PID: $FASTAPI_PID"
sleep 3

# Check if FastAPI started successfully
if ! check_port 8000; then
    echo "✅ FastAPI server is running"
else
    echo "❌ FastAPI failed to start"
    exit 1
fi
echo ""

# Start Next.js in background
echo "⚛️  Starting Next.js server (port 3000)..."
cd Katalyst
npm run dev &
NEXTJS_PID=$!
cd ..
echo "   Next.js PID: $NEXTJS_PID"
sleep 5

# Check if Next.js started successfully
if ! check_port 3000; then
    echo "✅ Next.js server is running"
else
    echo "❌ Next.js failed to start"
    kill $FASTAPI_PID 2>/dev/null
    exit 1
fi
echo ""

echo "✨ Both servers are running!"
echo ""
echo "📱 Access the application:"
echo "   Chat UI:  http://localhost:3000/chat"
echo "   FastAPI:  http://localhost:8000/docs"
echo ""
echo "📝 Next steps:"
echo "   1. Navigate to http://localhost:3000/chat"
echo "   2. Click 'Configure API Key'"
echo "   3. Add your Google Gemini API key"
echo "   4. Start detecting fraud!"
echo ""
echo "🛑 To stop servers:"
echo "   kill $FASTAPI_PID $NEXTJS_PID"
echo "   or press Ctrl+C and then run: pkill -f 'python fastapi_server.py' && pkill -f 'next dev'"
echo ""

# Keep script running
wait
