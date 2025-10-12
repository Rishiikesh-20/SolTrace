#!/bin/bash

# SolTrace System Startup Script
echo "🚀 Starting SolTrace Supply Chain System..."
echo "=========================================="

# Check if Solana validator is running
if ! pgrep -f "solana-test-validator" > /dev/null; then
    echo "❌ Solana test validator is not running!"
    echo "Please start it first with: solana-test-validator --reset --rpc-port 8899"
    exit 1
fi

# Check if IPFS is running
if ! curl -s http://localhost:5001/api/v0/version > /dev/null 2>&1; then
    echo "❌ IPFS is not running!"
    echo "Please start IPFS first with: ipfs daemon"
    exit 1
fi

echo "✅ Solana validator: Running"
echo "✅ IPFS: Running"

# Start MQTT broker
echo ""
echo "📡 Starting MQTT broker..."
npm run broker &
BROKER_PID=$!
sleep 3

# Start gateway
echo "🌐 Starting IoT gateway..."
npm run gateway &
GATEWAY_PID=$!
sleep 2

# Start oracle
echo "🔮 Starting Oracle service..."
npm run oracle &
ORACLE_PID=$!
sleep 2

echo ""
echo "🎉 SolTrace System Started Successfully!"
echo "========================================"
echo "📊 System Status:"
echo "   MQTT Broker: Running (PID: $BROKER_PID)"
echo "   IoT Gateway: Running (PID: $GATEWAY_PID)"
echo "   Oracle: Running (PID: $ORACLE_PID)"
echo ""
echo "📈 What's happening:"
echo "   1. Gateway generates IoT sensor data every 5 seconds"
echo "   2. Data is stored in IPFS and published to MQTT"
echo "   3. Oracle receives MQTT messages and processes data"
echo "   4. Oracle sends transactions to Solana blockchain"
echo ""
echo "🔍 Monitor the system:"
echo "   - Check logs in separate terminals"
echo "   - Run: node test_system.js (to test end-to-end)"
echo "   - View Solana transactions in explorer"
echo ""
echo "🛑 To stop the system:"
echo "   Press Ctrl+C or run: pkill -f 'node.*\.js'"

# Wait for user interrupt
trap 'echo ""; echo "🛑 Stopping SolTrace System..."; kill $BROKER_PID $GATEWAY_PID $ORACLE_PID 2>/dev/null; echo "✅ System stopped"; exit 0' INT

# Keep script running
wait

