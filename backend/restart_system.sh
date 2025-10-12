#!/bin/bash

echo "🔄 Restarting SolTrace System..."

# Kill all existing processes
echo "Stopping existing processes..."
pkill -f "node.*broker.js" 2>/dev/null || true
pkill -f "node.*gateway.js" 2>/dev/null || true
pkill -f "node.*oracle.js" 2>/dev/null || true
sleep 2

# Start MQTT broker
echo "Starting MQTT broker..."
npm run broker &
BROKER_PID=$!
sleep 3

# Start gateway
echo "Starting IoT gateway..."
npm run gateway &
GATEWAY_PID=$!
sleep 2

# Start oracle
echo "Starting Oracle service..."
npm run oracle &
ORACLE_PID=$!
sleep 2

echo ""
echo "✅ SolTrace System Restarted!"
echo "📊 Process IDs:"
echo "   MQTT Broker: $BROKER_PID"
echo "   IoT Gateway: $GATEWAY_PID"
echo "   Oracle: $ORACLE_PID"
echo ""
echo "🔍 Monitor logs in separate terminals or check system status"
echo "🛑 To stop: pkill -f 'node.*\.js'"
