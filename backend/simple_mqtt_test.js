// Simple MQTT test
import mqtt from 'mqtt';

console.log('Testing MQTT connection...');

const client = mqtt.connect('mqtt://localhost:1883', {
    clientId: 'test-' + Math.random().toString(16).substr(2, 8),
    connectTimeout: 5000,
    reconnectPeriod: 0
});

client.on('connect', () => {
    console.log('✅ Connected to MQTT broker');
    client.end();
    process.exit(0);
});

client.on('error', (err) => {
    console.log('❌ MQTT error:', err.message);
    process.exit(1);
});

client.on('offline', () => {
    console.log('❌ MQTT offline');
});

setTimeout(() => {
    console.log('❌ Connection timeout');
    client.end();
    process.exit(1);
}, 10000);

