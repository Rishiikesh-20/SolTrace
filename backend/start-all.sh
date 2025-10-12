#!/bin/bash


echo "🚀 Starting all Supply Chain IoT services..."

open_terminal() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        osascript -e "tell app \"Terminal\" to do script \"cd $(pwd) && $1\""
    elif command -v gnome-terminal &> /dev/null; then
        gnome-terminal -- bash -c "cd $(pwd) && $1; exec bash"
    elif command -v konsole &> /dev/null; then
        konsole -e bash -c "cd $(pwd) && $1; exec bash"
    elif command -v xterm &> /dev/null; then
        xterm -e bash -c "cd $(pwd) && $1; exec bash" &
    else
        echo "Could not detect terminal. Please run manually: $1"
    fi
}

echo "1️⃣  Starting IPFS daemon..."
open_terminal "ipfs daemon"
sleep 3

echo "2️⃣  Starting Solana test validator..."
open_terminal "solana-test-validator"
sleep 5

echo "3️⃣  Starting MQTT broker..."
open_terminal "npm run broker"
sleep 2

echo "4️⃣  Starting API server..."
open_terminal "npm run start"
sleep 2

echo "5️⃣  Starting IoT gateway..."
open_terminal "npm run gateway"
sleep 2

echo "6️⃣  Starting Oracle service..."
open_terminal "npm run oracle"

echo ""
echo "✅ All services started!"
echo ""
echo "📊 Services running:"
echo "  - IPFS:           http://localhost:5001"
echo "  - Solana RPC:     http://localhost:8899"
echo "  - MQTT Broker:    localhost:1883"
echo "  - API Server:     http://localhost:3000"
echo "  - IoT Gateway:    Simulating data every 5 seconds"
echo "  - Oracle:         Processing IoT data"
echo ""
echo "💡 To create a test batch: node create-test-batch.js"
echo "🛑 To stop all: Close all terminal windows or press Ctrl+C in each"