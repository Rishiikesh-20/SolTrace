// backend/test_system.js - Test the complete system
import mqtt from 'mqtt';
import { create } from 'ipfs-http-client';

const MQTT_BROKER_URL = 'mqtt://localhost:1883';
const IPFS_URL = 'http://localhost:5001';

console.log('🧪 Testing SolTrace System...\n');

// Test 1: MQTT Connection
console.log('1. Testing MQTT connection...');
const mqttClient = mqtt.connect(MQTT_BROKER_URL, {
    clientId: 'test-client-' + Math.random().toString(16).substr(2, 8)
});

mqttClient.on('connect', () => {
    console.log('✅ MQTT broker connected');
    
    // Test 2: IPFS Connection
    console.log('\n2. Testing IPFS connection...');
    const ipfs = create({ host: 'localhost', port: 5001, protocol: 'http' });
    
    // Test IPFS by adding a simple test file
    const testData = {
        test: true,
        timestamp: Date.now(),
        message: 'Hello from test system!'
    };
    
    ipfs.add(JSON.stringify(testData))
        .then(result => {
            console.log('✅ IPFS connected, test file added:', result.path);
            
            // Test 3: MQTT Subscription
            console.log('\n3. Testing MQTT subscription...');
            mqttClient.subscribe('iot/cid', { qos: 1 }, (err) => {
                if (!err) {
                    console.log('✅ Subscribed to iot/cid topic');
                    
                    // Test 4: Wait for messages
                    console.log('\n4. Waiting for IoT messages (30 seconds)...');
                    let messageCount = 0;
                    
                    mqttClient.on('message', async (topic, payload) => {
                        messageCount++;
                        try {
                            const message = JSON.parse(payload.toString());
                            console.log(`📨 Message ${messageCount} received:`);
                            console.log(`   Batch ID: ${message.batchId}`);
                            console.log(`   CID: ${message.cid}`);
                            console.log(`   Hash: ${message.hash.substring(0, 16)}...`);
                            console.log(`   Timestamp: ${new Date(message.timestamp).toLocaleTimeString()}`);
                            
                            // Test IPFS retrieval
                            console.log('   🔍 Testing IPFS retrieval...');
                            try {
                                let data = '';
                                for await (const chunk of ipfs.cat(message.cid)) {
                                    data += chunk.toString();
                                }
                                const parsed = JSON.parse(data);
                                console.log(`   ✅ IPFS data retrieved: ${parsed.readings?.length || 0} readings`);
                            } catch (err) {
                                console.log(`   ❌ IPFS retrieval failed: ${err.message}`);
                            }
                            
                        } catch (err) {
                            console.log(`❌ Message parse error: ${err.message}`);
                        }
                    });
                    
                    // Stop after 30 seconds
                    setTimeout(() => {
                        console.log(`\n📊 Test Summary:`);
                        console.log(`   Messages received: ${messageCount}`);
                        console.log(`   MQTT: ✅ Connected`);
                        console.log(`   IPFS: ✅ Connected`);
                        console.log(`   System: ${messageCount > 0 ? '✅ Working' : '⚠️ No messages received'}`);
                        
                        mqttClient.end();
                        process.exit(0);
                    }, 30000);
                    
                } else {
                    console.log('❌ MQTT subscription failed:', err);
                    process.exit(1);
                }
            });
        })
        .catch(err => {
            console.log('❌ IPFS test failed:', err.message);
            process.exit(1);
        });
});

mqttClient.on('error', (err) => {
    console.log('❌ MQTT connection failed:', err.message);
    process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Test interrupted');
    mqttClient.end();
    process.exit(0);
});
