// backend/broker.js - Local MQTT Broker
import aedes from 'aedes';
import net from 'net';
import { CONFIG } from './config.js';

const broker = aedes({
    heartbeatInterval: 60000,
    connectTimeout: 30000,
    queueLimit: 1000,
    concurrency: 100
});

// Create TCP server
const server = net.createServer(broker.handle);

// Handle broker events
broker.on('client', (client) => {
    console.log(`[MQTT Broker] Client connected: ${client.id}`);
});

broker.on('clientDisconnect', (client) => {
    console.log(`[MQTT Broker] Client disconnected: ${client.id}`);
});

broker.on('publish', (packet, client) => {
    if (client) {
        console.log(`[MQTT Broker] Message published:`);
        console.log(`  Topic: ${packet.topic}`);
        console.log(`  Payload: ${packet.payload.toString()}`);
        console.log(`  From: ${client.id}`);
    }
});

broker.on('subscribe', (subscriptions, client) => {
    console.log(`[MQTT Broker] Client ${client.id} subscribed to:`, subscriptions.map(s => s.topic).join(', '));
});

// Start server
server.listen(CONFIG.MQTT_PORT, '0.0.0.0', () => {
    console.log(`[MQTT Broker] Server running on port ${CONFIG.MQTT_PORT}`);
    console.log('[MQTT Broker] Ready for connections...');
    console.log(`[MQTT Broker] Listening on 0.0.0.0:${CONFIG.MQTT_PORT}`);
});

server.on('error', (err) => {
    console.error('[MQTT Broker] Server error:', err);
});

broker.on('error', (err) => {
    console.error('[MQTT Broker] Broker error:', err);
});

// Keep the process alive
process.on('uncaughtException', (err) => {
    console.error('[MQTT Broker] Uncaught exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[MQTT Broker] Unhandled rejection at:', promise, 'reason:', reason);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n[MQTT Broker] Shutting down gracefully...');
    broker.close(() => {
        server.close(() => {
            process.exit(0);
        });
    });
});