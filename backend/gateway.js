// backend/gateway.js - Fixed batch discovery
import mqtt from 'mqtt';
import { create } from 'ipfs-http-client';
import CryptoJS from 'crypto-js';
import { Connection, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { CONFIG } from './config.js';

const PROGRAM_ID = new PublicKey(CONFIG.PROGRAM_ID);
const connection = new Connection(CONFIG.SOLANA_RPC_URL, 'confirmed');

const mqttClient = mqtt.connect(CONFIG.MQTT_BROKER_URL, {
    clientId: 'iot-gateway-' + Math.random().toString(16).substr(2, 8)
});

const ipfs = create({
    host: 'localhost',
    port: CONFIG.IPFS_API_PORT,
    protocol: 'http'
});

let discoveredBatches = new Set();
let lastScanTime = 0;
const SCAN_INTERVAL = 60000;

function computeHash(data) {
    const jsonString = JSON.stringify(data);
    const hash = CryptoJS.SHA256(jsonString);
    return hash.toString(CryptoJS.enc.Hex);
}

// ✅ FIXED: Proper batch discovery with correct discriminator check
async function discoverBatches() {
    try {
        console.log('[Gateway] Scanning for batches...');
        
        // Batch discriminator [156,194,70,44,22,88,137,44]
        const BATCH_DISCRIMINATOR = Buffer.from([156, 194, 70, 44, 22, 88, 137, 44]);
        
        // ✅ Use memcmp filter to only get Batch accounts by discriminator
        const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
            filters: [
                {
                    memcmp: {
                        offset: 0,
                        bytes: BATCH_DISCRIMINATOR.toString('base64'),
                    }
                }
            ]
        });

        console.log(`[Gateway] Found ${accounts.length} batch accounts`);

        const newBatches = new Set();
        
        for (const account of accounts) {
            try {
                const data = account.account.data;
                let offset = 8; // Skip discriminator (already filtered)
                
                // Read batch ID (u32 length + string)
                if (data.length < offset + 4) continue;
                const batchIdLen = data.readUInt32LE(offset);
                offset += 4;
                
                if (data.length < offset + batchIdLen) continue;
                const batchId = data.slice(offset, offset + batchIdLen).toString('utf8');
                
                // Validate batch ID
                if (batchId && batchId.length > 0 && batchId.length <= 64) {
                    newBatches.add(batchId);
                    console.log(`[Gateway]   ✓ Discovered batch: ${batchId}`);
                }
            } catch (e) {
                // Skip invalid accounts silently
            }
        }

        const addedCount = [...newBatches].filter(b => !discoveredBatches.has(b)).length;
        if (addedCount > 0) {
            console.log(`[Gateway] 🎉 Discovered ${addedCount} new batches`);
        }
        
        discoveredBatches = newBatches;
        console.log(`[Gateway] Total active batches: ${discoveredBatches.size}`);
        
        if (discoveredBatches.size === 0) {
            console.log('[Gateway] ⚠️  No batches found. Make sure batches are created on-chain.');
        }
        
    } catch (error) {
        console.error('[Gateway] Error discovering batches:', error.message);
    }
}

function generateTelemetryData() {
    const readings = [];
    const numReadings = 5;
    const baseTime = Date.now();

    for (let i = 0; i < numReadings; i++) {
        const isNonBreaching = Math.random() < 0.7;

        let temperature, humidity;

        if (isNonBreaching) {
            temperature = Math.random() * 4.0;
            humidity = 40.0 + Math.random() * 40.0;
        } else {
            temperature = Math.random() * 8.0;
            humidity = 20.0 + Math.random() * 60.0;
        }

        readings.push({
            timestamp: baseTime + (i * 1000),
            temperature: Number(temperature.toFixed(2)),
            humidity: Number(humidity.toFixed(2)),
            gps: {
                lat: 12.9716 + (Math.random() * 0.01),
                lng: 77.5946 + (Math.random() * 0.01)
            },
            deviceId: `iot-device-${i + 1}`
        });
    }

    return readings;
}

function calculateSummary(readings) {
    const temps = readings.map(r => r.temperature);
    const humidities = readings.map(r => r.humidity);

    return {
        minTemp: Math.min(...temps),
        maxTemp: Math.max(...temps),
        avgTemp: temps.reduce((a, b) => a + b, 0) / temps.length,
        minHumidity: Math.min(...humidities),
        maxHumidity: Math.max(...humidities),
        avgHumidity: humidities.reduce((a, b) => a + b, 0) / humidities.length,
        readingCount: readings.length,
        timespan: {
            start: readings[0].timestamp,
            end: readings[readings.length - 1].timestamp
        }
    };
}

mqttClient.on('connect', async () => {
    console.log('[Gateway] Connected to MQTT broker');
    console.log('[Gateway] Configuration:');
    console.log(`  Solana RPC: ${CONFIG.SOLANA_RPC_URL}`);
    console.log(`  Program ID: ${CONFIG.PROGRAM_ID}`);
    console.log(`  Simulation Interval: ${CONFIG.SIMULATION_INTERVAL}ms`);
    console.log('[Gateway] Starting IoT simulation with dynamic batch discovery...');

    // Initial batch discovery
    await discoverBatches();

    // Start simulation loop
    startSimulation();
});

mqttClient.on('error', (error) => {
    console.error('[Gateway] MQTT error:', error);
});

async function startSimulation() {
    setInterval(async () => {
        try {
            // Periodically scan for new batches
            const now = Date.now();
            if (now - lastScanTime > SCAN_INTERVAL) {
                await discoverBatches();
                lastScanTime = now;
            }

            if (discoveredBatches.size === 0) {
                console.log('[Gateway] No batches found, skipping simulation cycle');
                return;
            }

            // Select random batch
            const batchArray = Array.from(discoveredBatches);
            const randomIndex = Math.floor(Math.random() * batchArray.length);
            const batchId = batchArray[randomIndex];
            
            console.log(`\n[Gateway] ━━━ Simulating for batch: ${batchId} ━━━`);

            const telemetryData = generateTelemetryData();
            const summary = calculateSummary(telemetryData);

            const batch = {
                batchId: batchId,
                timestamp: Date.now(),
                readings: telemetryData,
                summary: summary,
                gateway: 'gateway-001',
                version: '1.0'
            };

            // Add to IPFS
            const jsonString = JSON.stringify(batch);
            const result = await ipfs.add(jsonString);
            const cid = result.path;

            const hash = computeHash(batch);

            const message = {
                cid: cid,
                hash: hash,
                batchId: batchId,
                timestamp: batch.timestamp,
                summary: summary
            };

            const topic = 'iot/cid';
            mqttClient.publish(topic, JSON.stringify(message), { qos: 1 }, (err) => {
                if (err) {
                    console.error('[Gateway] ❌ Failed to publish:', err);
                } else {
                    console.log('[Gateway] ✅ Published batch data:');
                    console.log(`  CID: ${cid}`);
                    console.log(`  Batch: ${batchId}`);
                    console.log(`  Temp: ${summary.minTemp.toFixed(2)}°C - ${summary.maxTemp.toFixed(2)}°C`);
                    console.log(`  Humidity: ${summary.minHumidity.toFixed(2)}% - ${summary.maxHumidity.toFixed(2)}%`);

                    if (summary.maxTemp > CONFIG.MAX_TEMP) {
                        console.log(`  ⚠️  Temperature breach! ${summary.maxTemp.toFixed(2)}°C > ${CONFIG.MAX_TEMP}°C`);
                    }
                    if (summary.minHumidity < CONFIG.MIN_HUMIDITY) {
                        console.log(`  ⚠️  Humidity breach! ${summary.minHumidity.toFixed(2)}% < ${CONFIG.MIN_HUMIDITY}%`);
                    }
                }
            });

        } catch (error) {
            console.error('[Gateway] Error in simulation:', error);
        }
    }, CONFIG.SIMULATION_INTERVAL);

    console.log(`[Gateway] 🚀 Simulation started - Publishing every ${CONFIG.SIMULATION_INTERVAL/1000}s`);
}

process.on('SIGINT', () => {
    console.log('\n[Gateway] Shutting down gracefully...');
    mqttClient.end();
    process.exit(0);
});