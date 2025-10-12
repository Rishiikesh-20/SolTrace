// backend/oracle.js - Oracle Service for Solana Bridge
import mqtt from 'mqtt';
import { create } from 'ipfs-http-client';
import { MerkleTree } from 'merkletreejs';
import CryptoJS from 'crypto-js';
import {
    Connection,
    PublicKey,
    Keypair,
    SystemProgram,
    Transaction,
    TransactionInstruction
} from '@solana/web3.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CONFIG } from './config.js';

// Define __filename and __dirname manually in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Thresholds for breach detection
const THRESHOLDS = {
    MAX_TEMP: CONFIG.MAX_TEMP,
    MIN_HUMIDITY: CONFIG.MIN_HUMIDITY,
    MAX_BREACH_DURATION: CONFIG.MAX_BREACH_DURATION
};

// Load keypairs
const loadKeypair = (file) => {
    const secret = JSON.parse(fs.readFileSync(file, 'utf-8'));
    return Keypair.fromSecretKey(new Uint8Array(secret));
};

const oracleKeypair = loadKeypair(path.join(__dirname, 'oracle-keypair.json'));
const adminKeypair = loadKeypair(path.join(__dirname, 'admin-keypair.json'));

// Solana setup
const connection = new Connection(CONFIG.SOLANA_RPC_URL, 'confirmed');
const programId = new PublicKey(CONFIG.PROGRAM_ID);

// MQTT client
const mqttClient = mqtt.connect(CONFIG.MQTT_BROKER_URL, {
    clientId: `oracle-${Math.random().toString(16).substr(2, 8)}`
});

// IPFS client
const ipfs = create({ 
    host: 'localhost', 
    port: CONFIG.IPFS_API_PORT, 
    protocol: 'http' 
});

// Helpers
const computeHash = (data) => CryptoJS.SHA256(JSON.stringify(data)).toString(CryptoJS.enc.Hex);

const hexToBytes = (hex) => {
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return bytes;
};

const calculateMerkleRoot = (readings) => {
    const leaves = readings.map(r => Buffer.from(computeHash(r), 'hex'));
    const tree = new MerkleTree(leaves, (data) => Buffer.from(computeHash(data.toString('utf8')), 'hex'), { sortPairs: true });
    return tree.getRoot().toString('hex');
};

const checkThresholds = (readings) => {
    let breachDetected = false, breachCount = 0;
    const breaches = [];
    for (const r of readings) {
        let breached = false;
        if (r.temperature > THRESHOLDS.MAX_TEMP) {
            breached = true;
            breaches.push({ type: 'temperature', value: r.temperature, threshold: THRESHOLDS.MAX_TEMP, timestamp: r.timestamp });
        }
        if (r.humidity < THRESHOLDS.MIN_HUMIDITY) {
            breached = true;
            breaches.push({ type: 'humidity', value: r.humidity, threshold: THRESHOLDS.MIN_HUMIDITY, timestamp: r.timestamp });
        }
        if (breached) { breachDetected = true; breachCount++; }
    }
    return { breachDetected, breachCount, breaches };
};

// PDA derivation
const deriveBatchPDA = (batchId) => PublicKey.findProgramAddressSync([Buffer.from('batch'), Buffer.from(batchId)], programId)[0];
const deriveConfigPDA = () => PublicKey.findProgramAddressSync([Buffer.from('config')], programId)[0];

// Build raw instruction for initialize_system_config
const buildInitializeConfigIx = (adminPubkey, oraclePubkey, configPda) => {
    const discriminator = Uint8Array.from([38, 75, 134, 154, 249, 64, 246, 46]);
    const data = Buffer.concat([
        Buffer.from(discriminator),
        Buffer.from(adminPubkey.toBytes()),
        Buffer.from(oraclePubkey.toBytes())
    ]);
    const keys = [
        { pubkey: configPda, isSigner: false, isWritable: true },
        { pubkey: adminPubkey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
    ];
    return new TransactionInstruction({ keys, programId, data });
};

// Ensure funding for wallets
const ensureFunding = async () => {
    const minSol = 1 * 1e9; // 1 SOL
    const balAdmin = await connection.getBalance(adminKeypair.publicKey).catch(() => 0);
    if (balAdmin < minSol) {
        const sig = await connection.requestAirdrop(adminKeypair.publicKey, 10 * 1e9);
        await connection.confirmTransaction(sig);
        console.log('[Oracle] Admin wallet funded');
    }
    const balOracle = await connection.getBalance(oracleKeypair.publicKey).catch(() => 0);
    if (balOracle < minSol) {
        const sig = await connection.requestAirdrop(oracleKeypair.publicKey, 10 * 1e9);
        await connection.confirmTransaction(sig);
        console.log('[Oracle] Oracle wallet funded');
    }
};

// Ensure system config exists
const initializeSystemIfNeeded = async () => {
    const configPda = deriveConfigPDA();
    const ai = await connection.getAccountInfo(configPda);
    if (ai) {
        console.log(`[Oracle] system_config exists: ${configPda.toString()}`);
        return;
    }
    console.log('[Oracle] Initializing system_config...');
    const ix = buildInitializeConfigIx(adminKeypair.publicKey, oracleKeypair.publicKey, configPda);
    const tx = new Transaction().add(ix);
    tx.feePayer = adminKeypair.publicKey;
    const sig = await connection.sendTransaction(tx, [adminKeypair], { preflightCommitment: 'confirmed' });
    await connection.confirmTransaction(sig, 'confirmed');
    console.log('[Oracle] system_config initialized:', sig);
};

// CORRECTED: Function to check if batch exists
const checkBatchExists = async (batchPDA) => {
    try {
        const accountInfo = await connection.getAccountInfo(batchPDA);
        if (!accountInfo) {
            console.log(`[Oracle] Batch account does not exist: ${batchPDA.toString()}`);
            return false;
        }
        console.log(`[Oracle] Batch account exists: ${batchPDA.toString()}`);
        return true;
    } catch (e) {
        console.log(`[Oracle] Error checking batch existence: ${e.message}`);
        return false;
    }
};

// CORRECTED: Function to read batch timestamp from on-chain account
const getBatchTimestamp = async (batchPDA) => {
    try {
        const accountInfo = await connection.getAccountInfo(batchPDA);
        if (!accountInfo || !accountInfo.data) {
            return 0;
        }
        
        const data = accountInfo.data;
        let offset = 8; // Skip 8-byte discriminator
        
        // Skip batch_id (string)
        const batchIdLen = data.readUInt32LE(offset);
        offset += 4 + batchIdLen;
        
        // Skip producer (32 bytes)
        offset += 32;
        
        // Skip current_owner (32 bytes)  
        offset += 32;
        
        // Skip status (1 byte)
        offset += 1;
        
        // Skip origin_details
        // production_date (8) + quantity (8) + weight (8) + product_type (string)
        offset += 8 + 8 + 8;
        const productTypeLen = data.readUInt32LE(offset);
        offset += 4 + productTypeLen;
        
        // Skip metadata_hash (32 bytes)
        offset += 32;
        
        // Skip metadata_cid (string)
        const metadataCidLen = data.readUInt32LE(offset);
        offset += 4 + metadataCidLen;
        
        // Skip events vector (4 bytes for length + variable data)
        const eventsLen = data.readUInt32LE(offset);
        offset += 4;
        // Skip each event (we don't need to parse events, just skip them)
        for (let i = 0; i < eventsLen; i++) {
            // Skip event_type (1 byte) + timestamp (8) + from_wallet (32) + to_wallet (32) 
            // + details_hash (32) + details_cid (string)
            offset += 1 + 8 + 32 + 32 + 32;
            const detailsCidLen = data.readUInt32LE(offset);
            offset += 4 + detailsCidLen;
        }
        
        // Now we're at iot_summary
        // Read timestamp (first 8 bytes of IoTSummaryStruct)
        const timestamp = Number(data.readBigInt64LE(offset));
        console.log(`[Oracle] Successfully read batch timestamp: ${timestamp}`);
        return timestamp;
        
    } catch (e) {
        console.log(`[Oracle] Could not read batch timestamp: ${e.message}`);
        console.log(`[Oracle] Defaulting timestamp to 0`);
        return 0;
    }
};

// Build raw instruction for update_iot_summary
const buildUpdateIotSummaryIx = (batchPda, oraclePubkey, systemConfigPda, summarySnake, hashBytes, cid) => {
    const discriminator = Uint8Array.from([73, 239, 117, 188, 144, 71, 40, 16]);
    const timestampBuf = Buffer.alloc(8);
    timestampBuf.writeBigInt64LE(BigInt(summarySnake.timestamp), 0);
    const minTempBuf = Buffer.alloc(4);
    minTempBuf.writeFloatLE(summarySnake.min_temp, 0);
    const maxTempBuf = Buffer.alloc(4);
    maxTempBuf.writeFloatLE(summarySnake.max_temp, 0);
    const avgTempBuf = Buffer.alloc(4);
    avgTempBuf.writeFloatLE(summarySnake.avg_temp, 0);
    const minHumidityBuf = Buffer.alloc(4);
    minHumidityBuf.writeFloatLE(summarySnake.min_humidity, 0);
    const maxHumidityBuf = Buffer.alloc(4);
    maxHumidityBuf.writeFloatLE(summarySnake.max_humidity, 0);
    const avgHumidityBuf = Buffer.alloc(4);
    avgHumidityBuf.writeFloatLE(summarySnake.avg_humidity, 0);
    const locationSummaryLen = Buffer.alloc(4);
    locationSummaryLen.writeUInt32LE(summarySnake.location_summary.length, 0);
    const locationSummaryBuf = Buffer.from(summarySnake.location_summary);
    const breachDetectedBuf = Buffer.from([summarySnake.breach_detected ? 1 : 0]);
    const breachCountBuf = Buffer.alloc(4);
    breachCountBuf.writeUInt32LE(summarySnake.breach_count, 0);
    const summaryBuf = Buffer.concat([
        timestampBuf, minTempBuf, maxTempBuf, avgTempBuf,
        minHumidityBuf, maxHumidityBuf, avgHumidityBuf,
        locationSummaryLen, locationSummaryBuf, breachDetectedBuf, breachCountBuf
    ]);
    const hashBuf = Buffer.from(hashBytes);
    const cidLen = Buffer.alloc(4);
    cidLen.writeUInt32LE(cid.length, 0);
    const cidBuf = Buffer.from(cid);
    const data = Buffer.concat([Buffer.from(discriminator), summaryBuf, hashBuf, cidLen, cidBuf]);
    const keys = [
        { pubkey: batchPda, isSigner: false, isWritable: true },
        { pubkey: oraclePubkey, isSigner: true, isWritable: true },
        { pubkey: systemConfigPda, isSigner: false, isWritable: false }
    ];
    return new TransactionInstruction({ keys, programId, data });
};

// Throttle state per batch
const batchState = new Map();

// Track last timestamps per batch to ensure monotonic increase
const lastTimestamps = new Map();

// Track batches that have too many events or don't exist
const problematicBatches = new Set();

// CORRECTED: Build summary with improved timestamp logic
const buildIoTSummary = (readings, breachDetected, breachCount, batchId, onChainTimestamp) => {
    const temps = readings.map(r => r.temperature);
    const humidities = readings.map(r => r.humidity);
    
    const currentTime = Math.floor(Date.now() / 1000);
    
    // Ensure the new timestamp is strictly greater than the on-chain timestamp
    let newTimestamp;
    if (onChainTimestamp === 0) {
        // First update for this batch
        newTimestamp = currentTime;
    } else {
        // Must be greater than existing timestamp
        newTimestamp = Math.max(currentTime, onChainTimestamp + 1);
    }
    
    // Update our local cache
    lastTimestamps.set(batchId, newTimestamp);
    
    console.log(`[Oracle] Timestamp logic: on-chain=${onChainTimestamp}, current=${currentTime}, final=${newTimestamp}`);
    
    return {
        timestamp: newTimestamp,
        min_temp: Math.min(...temps),
        max_temp: Math.max(...temps),
        avg_temp: temps.reduce((a, b) => a + b, 0) / temps.length,
        min_humidity: Math.min(...humidities),
        max_humidity: Math.max(...humidities),
        avg_humidity: humidities.reduce((a, b) => a + b, 0) / humidities.length,
        location_summary: 'Bangalore, IN',
        breach_detected: breachDetected,
        breach_count: breachCount
    };
};

// Helper function for retries
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Process IoT data
const processIoTData = async (message) => {
    let batchId;
    try {
        const { cid, batchId: msgBatchId, timestamp, summary } = message;
        batchId = msgBatchId; // Store for error handling
        
        console.log(`[Oracle] Processing Batch: ${batchId}, CID: ${cid}`);

        // Check if this batch is marked as problematic
        if (problematicBatches.has(batchId)) {
            console.log(`[Oracle] Skipping batch ${batchId} - marked as problematic`);
            return;
        }

        // Temporary: Add delay between updates to ensure timestamp uniqueness
        await wait(2000);

        // Fetch from IPFS
        let chunks = [];
        try {
            for await (const chunk of ipfs.cat(cid)) {
                chunks.push(chunk);
            }
        } catch (ipfsError) {
            console.error(`[Oracle] IPFS fetch error for CID ${cid}:`, ipfsError);
            return;
        }
        
        const buf = Buffer.concat(chunks);
        let data = buf.toString('utf8').trim();
        
        // Remove BOM if present
        if (data.charCodeAt(0) === 0xFEFF) {
            data = data.slice(1);
        }
        
        let parsed;
        try {
            parsed = JSON.parse(data);
        } catch (parseError) {
            console.error(`[Oracle] JSON parse error for CID ${cid}:`, parseError);
            return;
        }
        
        const readings = parsed.readings || [];
        if (!Array.isArray(readings) || readings.length === 0) {
            console.error(`[Oracle] Invalid IPFS payload: readings not found or empty for CID ${cid}`);
            return;
        }

        console.log(`[Oracle] Found ${readings.length} readings in batch ${batchId}`);

        const { breachDetected, breachCount, breaches } = checkThresholds(readings);
        if (breachDetected) {
            console.log(`[Oracle] ⚠️ Breach detected: ${breachCount} breaches`);
            breaches.forEach(b => console.log(`  - ${b.type}: ${b.value} (threshold: ${b.threshold})`));
        } else {
            console.log('[Oracle] ✅ No breaches detected');
        }

        const merkleRoot = calculateMerkleRoot(readings);
        const merkleRootBytes = hexToBytes(merkleRoot);
        console.log(`[Oracle] Merkle Root: ${merkleRoot}`);

        // Throttle check
        const now = Date.now();
        const state = batchState.get(batchId) || { sentCount: 0, lastSent: 0 };
        if (now - state.lastSent < 30000) { // 30s min interval to reduce event spam
            console.log(`[Oracle] Throttled - too soon since last update for ${batchId} (${Math.round((now - state.lastSent)/1000)}s ago)`);
            return;
        }

        const batchPDA = deriveBatchPDA(batchId);
        const configPDA = deriveConfigPDA();

        // NEW: Check if batch exists before proceeding
        const batchExists = await checkBatchExists(batchPDA);
        if (!batchExists) {
            console.log(`[Oracle] ❌ Batch ${batchId} does not exist on-chain. Skipping update.`);
            problematicBatches.add(batchId);
            return;
        }

        // Fetch the current timestamp from the on-chain account data.
        const currentBatchTimestamp = await getBatchTimestamp(batchPDA);
        console.log(`[Oracle] Current on-chain batch timestamp: ${currentBatchTimestamp}`);

        // Safety check: if we can't read the timestamp properly, wait and retry later
        if (currentBatchTimestamp === 0 && (batchState.get(batchId)?.sentCount || 0) > 0) {
            console.log(`[Oracle] ⚠️  Timestamp read as 0 but we've sent updates before. Possible account data issue.`);
            console.log(`[Oracle] Skipping this update to avoid timestamp conflict.`);
            return;
        }

        // Pass the on-chain timestamp to the summary builder.
        const iotSummarySnake = buildIoTSummary(readings, breachDetected, breachCount, batchId, currentBatchTimestamp);

        console.log(`[Oracle] Sending transaction for batch ${batchId} with new timestamp ${iotSummarySnake.timestamp}...`);
        const ix = buildUpdateIotSummaryIx(batchPDA, oracleKeypair.publicKey, configPDA, iotSummarySnake, merkleRootBytes, cid);
        const tx = new Transaction().add(ix);
        tx.feePayer = oracleKeypair.publicKey;
        
        const sig = await connection.sendTransaction(tx, [oracleKeypair], {
            preflightCommitment: 'confirmed',
            skipPreflight: false
        });
        await connection.confirmTransaction(sig, 'confirmed');
        console.log(`[Oracle] ✅ Transaction successful: ${sig}`);
        
        // Update state
        batchState.set(batchId, { sentCount: state.sentCount + 1, lastSent: now });
        console.log(`[Oracle] Batch ${batchId} state updated`);

    } catch (error) {
        console.error('[Oracle] Error processing IoT data:', error.message);
        if (error.logs) {
            console.error('Transaction logs:', error.logs);
        }
        
        // Handle specific errors
        if (error.message.includes('InvalidTimestamp') || error.message.includes('0x177f')) {
            console.log(`[Oracle] Timestamp conflict detected for batch ${batchId}. Waiting before retry...`);
            
            // Reset the local timestamp to force a fresh read next time
            lastTimestamps.delete(batchId);
            
            // Wait 5 seconds before allowing next update
            await wait(5000);
            return;
        }
        
        if (error.message.includes('TooManyEvents') || error.message.includes('0x177d')) {
            console.log(`[Oracle] 🚨 Too many events in batch ${batchId}. Marking as problematic.`);
            problematicBatches.add(batchId);
            return;
        }
        
        if (error.message.includes('AccountNotInitialized') || error.message.includes('0xbc4')) {
            console.log(`[Oracle] 🚨 Batch ${batchId} not initialized. Marking as problematic.`);
            problematicBatches.add(batchId);
            return;
        }
    }
};

// MQTT events
mqttClient.on('connect', () => {
    console.log('[Oracle] Connected to MQTT broker');
    console.log('[Oracle] Configuration:');
    console.log(`  Program ID: ${CONFIG.PROGRAM_ID}`);
    console.log(`  Solana RPC: ${CONFIG.SOLANA_RPC_URL}`);
    console.log(`  MQTT Broker: ${CONFIG.MQTT_BROKER_URL}`);
    console.log(`  IPFS URL: ${CONFIG.IPFS_URL}`);
    console.log(`  Thresholds: Temp=${CONFIG.MAX_TEMP}°C, Humidity=${CONFIG.MIN_HUMIDITY}%`);
    
    mqttClient.subscribe('iot/cid', { qos: 1 }, (err) => {
        if (!err) console.log('[Oracle] Subscribed to topic: iot/cid');
    });
});

mqttClient.on('message', async (topic, payload) => {
    try {
        const message = JSON.parse(payload.toString());
        
        // Check if we've marked this batch as problematic
        if (problematicBatches.has(message.batchId)) {
            console.log(`[Oracle] Skipping batch ${message.batchId} - marked as problematic`);
            return;
        }
        
        await processIoTData(message);
    } catch (err) {
        console.error('[Oracle] Error parsing message:', err);
        console.error('[Oracle] Payload that caused error:', payload.toString());
    }
});

mqttClient.on('error', (err) => console.error('[Oracle] MQTT error:', err));

// System initialization
const initialize = async () => {
    console.log('[Oracle] Starting Oracle Service...');
    try {
        console.log('[Oracle] Connected to Solana:', await connection.getVersion());
        await ensureFunding();
        await initializeSystemIfNeeded();
        console.log('[Oracle] Ready to process IoT data...');
    } catch (err) {
        console.error('[Oracle] Initialization error:', err);
        process.exit(1);
    }
};

initialize();

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n[Oracle] Shutting down...');
    mqttClient.end();
    process.exit(0);
});