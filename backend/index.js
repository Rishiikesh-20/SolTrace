// backend/index.js - Express API Server
import express from 'express';
import cors from 'cors';
import { create } from 'ipfs-http-client';
import CryptoJS from 'crypto-js';
import { CONFIG } from './config.js';

const app = express();

// IPFS client
const ipfs = create({
    host: 'localhost',
    port: CONFIG.IPFS_API_PORT,
    protocol: 'http'
});

// Middleware
app.use(cors());
app.use(express.json());

// Helper function to compute SHA-256 hash
function computeHash(data) {
    const jsonString = JSON.stringify(data);
    const hash = CryptoJS.SHA256(jsonString);
    return hash.toString(CryptoJS.enc.Hex);
}

// Helper function to convert hex string to byte array
function hexToBytes(hex) {
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return bytes;
}

// API Endpoints

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'Supply Chain Backend API',
        timestamp: new Date().toISOString(),
        config: {
            programId: CONFIG.PROGRAM_ID,
            batchId: CONFIG.BATCH_ID
        }
    });
});

// Register profile - stores profile data in IPFS
app.post('/api/register', async (req, res) => {
    try {
        const { name, location, certifications, role } = req.body;
        
        if (!name || !location) {
            return res.status(400).json({ error: 'Name and location are required' });
        }

        const profileData = {
            name,
            location,
            certifications: certifications || [],
            role: role || 'Producer',
            registeredAt: new Date().toISOString()
        };

        // Add to IPFS
        const jsonString = JSON.stringify(profileData);
        const result = await ipfs.add(jsonString);
        const cid = result.path;

        // Compute hash
        const hash = computeHash(profileData);
        const hashBytes = hexToBytes(hash);

        console.log(`[API] Profile registered - CID: ${cid}, Hash: ${hash}`);

        res.json({
            profileHash: hashBytes,
            profileHashHex: hash,
            cid,
            profileData
        });
    } catch (error) {
        console.error('[API] Error registering profile:', error);
        res.status(500).json({ error: 'Failed to register profile' });
    }
});

// Fetch profile from IPFS using CID
app.get('/api/profile/:cid', async (req, res) => {
    try {
        const { cid } = req.params;
        
        // Fetch from IPFS
        let data = '';
        for await (const chunk of ipfs.cat(cid)) {
            data += chunk.toString();
        }
        
        const profileData = JSON.parse(data);
        console.log(`[API] Profile fetched - CID: ${cid}`);
        
        res.json(profileData);
    } catch (error) {
        console.error('[API] Error fetching profile:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Simulate IoT data endpoint (for frontend testing)
app.get('/api/iot/:batchId', (req, res) => {
    const { batchId } = req.params;
    
    // Generate mock IoT readings
    const readings = [];
    const numReadings = 5;
    
    for (let i = 0; i < numReadings; i++) {
        readings.push({
            timestamp: Date.now() - (i * 60000), // 1 minute apart
            temperature: Math.random() * 10, // 0-10°C
            humidity: Math.random() * 100, // 0-100%
            gps: {
                lat: 12.9716 + (Math.random() * 0.01), // Bangalore area
                lng: 77.5946 + (Math.random() * 0.01)
            },
            deviceId: `device-${i + 1}`
        });
    }
    
    const iotData = {
        batchId,
        readings,
        summary: {
            totalReadings: readings.length,
            avgTemp: readings.reduce((sum, r) => sum + r.temperature, 0) / readings.length,
            avgHumidity: readings.reduce((sum, r) => sum + r.humidity, 0) / readings.length,
            timespan: {
                start: readings[readings.length - 1].timestamp,
                end: readings[0].timestamp
            }
        },
        generatedAt: new Date().toISOString()
    };
    
    console.log(`[API] IoT data generated for batch: ${batchId}`);
    res.json(iotData);
});

// Store batch metadata in IPFS
app.post('/api/batch/metadata', async (req, res) => {
    try {
        const { batchId, origin, metadata } = req.body;
        
        const batchData = {
            batchId,
            origin,
            metadata,
            createdAt: new Date().toISOString()
        };
        
        // Add to IPFS
        const jsonString = JSON.stringify(batchData);
        const result = await ipfs.add(jsonString);
        const cid = result.path;
        
        // Compute hash
        const hash = computeHash(batchData);
        const hashBytes = hexToBytes(hash);
        
        console.log(`[API] Batch metadata stored - CID: ${cid}, Hash: ${hash}`);
        
        res.json({
            metadataHash: hashBytes,
            metadataHashHex: hash,
            cid,
            batchData
        });
    } catch (error) {
        console.error('[API] Error storing batch metadata:', error);
        res.status(500).json({ error: 'Failed to store batch metadata' });
    }
});

// Fetch batch metadata from IPFS
app.get('/api/batch/metadata/:cid', async (req, res) => {
    try {
        const { cid } = req.params;
        
        // Fetch from IPFS
        let data = '';
        for await (const chunk of ipfs.cat(cid)) {
            data += chunk.toString();
        }
        
        const batchData = JSON.parse(data);
        console.log(`[API] Batch metadata fetched - CID: ${cid}`);
        
        res.json(batchData);
    } catch (error) {
        console.error('[API] Error fetching batch metadata:', error);
        res.status(500).json({ error: 'Failed to fetch batch metadata' });
    }
});

// Start server
app.listen(CONFIG.API_PORT, () => {
    console.log(`[API] Server running on http://localhost:${CONFIG.API_PORT}`);
    console.log('[API] Configuration:');
    console.log(`  Program ID: ${CONFIG.PROGRAM_ID}`);
    console.log(`  Solana RPC: ${CONFIG.SOLANA_RPC_URL}`);
    console.log(`  IPFS URL: ${CONFIG.IPFS_URL}`);
    console.log('[API] Endpoints available:');
    console.log('  GET  /health');
    console.log('  POST /api/register');
    console.log('  GET  /api/profile/:cid');
    console.log('  GET  /api/iot/:batchId');
    console.log('  POST /api/batch/metadata');
    console.log('  GET  /api/batch/metadata/:cid');
});