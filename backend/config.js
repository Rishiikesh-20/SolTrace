// backend/config.js - Centralized configuration
import { config } from 'dotenv';

config();

export const CONFIG = {
    // Solana Configuration
    PROGRAM_ID: process.env.PROGRAM_ID || '5fm9Ah8DmB6mMFv6jqgBVEj4MZbNF5qDP62TwekEbdev',
    SOLANA_RPC_URL: process.env.SOLANA_RPC_URL || 'http://solana:8899',
    
    // MQTT Configuration
    MQTT_BROKER_URL: process.env.MQTT_BROKER_URL || 'mqtt://broker:1883',
    MQTT_PORT: parseInt(process.env.MQTT_PORT) || 1883,
    
    // IPFS Configuration
    IPFS_URL: process.env.IPFS_URL || 'http://ipfs:5001',
    IPFS_API_PORT: parseInt(process.env.IPFS_API_PORT) || 5001,
    IPFS_GATEWAY_PORT: parseInt(process.env.IPFS_GATEWAY_PORT) || 8080,
    
    // Service Configuration
    API_PORT: parseInt(process.env.API_PORT) || 3000,
    BATCH_ID: process.env.BATCH_ID || 'batch3',
    INIT_BATCH_ID: process.env.INIT_BATCH_ID || 'batch2',
    
    // IoT Thresholds
    MAX_TEMP: parseFloat(process.env.MAX_TEMP) || 4.0,
    MIN_HUMIDITY: parseFloat(process.env.MIN_HUMIDITY) || 40.0,
    MAX_BREACH_DURATION: parseInt(process.env.MAX_BREACH_DURATION) || 300,
    
    // Simulation Settings
    SIMULATION_INTERVAL: parseInt(process.env.SIMULATION_INTERVAL) || 30000,
};

export default CONFIG;