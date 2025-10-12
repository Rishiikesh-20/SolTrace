// backend/create-test-batch.js - Create a test batch for the oracle to update
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';
import CryptoJS from 'crypto-js';

// Configuration
const SOLANA_RPC_URL = 'http://localhost:8899';
const PROGRAM_ID = 'EYepFssLBo8cFgnFFChmYiPCxCHTaoPGtcXfx4zDMx16';
const BATCH_ID = 'batch2'; // Use 'batch2' to avoid event overflow in 'batch1'

const __dirname = path.dirname(__filename);

// Load keypairs and IDL
const adminKeypair = loadKeypair(path.join(__dirname, 'admin-keypair.json'));
const idl = JSON.parse(fs.readFileSync(path.join(__dirname, 'idl.json'), 'utf-8'));
const programId = new PublicKey(PROGRAM_ID);

const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

// Helper to load keypair
function loadKeypair(file) {
    const secret = JSON.parse(fs.readFileSync(file, 'utf-8'));
    return Keypair.fromSecretKey(new Uint8Array(secret));
}

// Helper to compute hash
function computeHash(data) {
    const jsonString = JSON.stringify(data);
    const hash = CryptoJS.SHA256(jsonString);
    return hash.toString(CryptoJS.enc.Hex);
}

function hexToBytes(hex) {
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return bytes;
}

function encodeString(str) {
    const buf = Buffer.from(str, 'utf8');
    const len = Buffer.alloc(4);
    len.writeUInt32LE(buf.length, 0);
    return Buffer.concat([len, buf]);
}

// Derive PDAs
function deriveBatchPDA(batchId) {
    const [batchPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('batch'), Buffer.from(batchId)],
        programId
    );
    return batchPDA;
}

function deriveUserPDA(wallet) {
    const [userPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('user'), wallet.toBuffer()],
        programId
    );
    return userPDA;
}

async function createTestBatch() {
    try {
        console.log('Creating test batch...');
        console.log(`Admin wallet: ${adminKeypair.publicKey.toString()}`);
        console.log(`Batch ID: ${BATCH_ID}`);
        
        // Check if batch already exists
        const batchPDA = deriveBatchPDA(BATCH_ID);
        const existingBatch = await connection.getAccountInfo(batchPDA);
        
        if (existingBatch) {
            console.log(`Batch ${BATCH_ID} already exists at ${batchPDA.toString()}`);
            return;
        }
        
        // Prepare origin details
        const originDetails = {
            production_date: Math.floor(Date.now() / 1000),
            quantity: 1000,
            weight: 500.5,
            product_type: "Fish"
        };
        
        // Prepare metadata
        const metadata = {
            batchId: BATCH_ID,
            origin: originDetails,
            producer: adminKeypair.publicKey.toString(),
            createdAt: new Date().toISOString()
        };
        
        const metadataHash = hexToBytes(computeHash(metadata));
        const metadataCid = "QmTestBatchCID123"; // Mock CID for test
        
        // Derive user PDA
        const userPDA = deriveUserPDA(adminKeypair.publicKey);
        
        console.log(`Batch PDA: ${batchPDA.toString()}`);
        console.log(`User PDA: ${userPDA.toString()}`);
        
        // Create batch transaction
        const discriminator = Uint8Array.from([159, 198, 248, 43, 248, 31, 235, 86]);
        const batchIdLen = Buffer.alloc(4);
        batchIdLen.writeUInt32LE(BATCH_ID.length, 0);
        const batchIdBuf = Buffer.from(BATCH_ID);
        
        const productionDateBuf = Buffer.alloc(8);
        productionDateBuf.writeBigInt64LE(BigInt(originDetails.production_date), 0);
        
        const quantityBuf = Buffer.alloc(8);
        quantityBuf.writeBigUInt64LE(BigInt(originDetails.quantity), 0);
        
        const weightBuf = Buffer.alloc(8);
        weightBuf.writeDoubleLE(originDetails.weight, 0);
        
        const productTypeLen = Buffer.alloc(4);
        productTypeLen.writeUInt32LE(originDetails.product_type.length, 0);
        const productTypeBuf = Buffer.from(originDetails.product_type);
        
        const originBuf = Buffer.concat([productionDateBuf, quantityBuf, weightBuf, productTypeLen, productTypeBuf]);
        
        const metadataCidLen = Buffer.alloc(4);
        metadataCidLen.writeUInt32LE(metadataCid.length, 0);
        const metadataCidBuf = Buffer.from(metadataCid);
        
        const data = Buffer.concat([Buffer.from(discriminator), batchIdLen, batchIdBuf, originBuf, Buffer.from(metadataHash), metadataCidLen, metadataCidBuf]);
        
        const keys = [
            { pubkey: batchPDA, isSigner: false, isWritable: true },
            { pubkey: userPDA, isSigner: false, isWritable: false },
            { pubkey: adminKeypair.publicKey, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
        ];
        
        const ix = new TransactionInstruction({ keys, programId, data });
        const tx = new Transaction().add(ix);
        tx.feePayer = adminKeypair.publicKey;
        const sig = await connection.sendTransaction(tx, [adminKeypair], { preflightCommitment: 'confirmed' });
        await connection.confirmTransaction(sig, 'confirmed');
        console.log(`✅ Batch created successfully!`);
        console.log(`Transaction: ${sig}`);
        console.log(`View: https://explorer.solana.com/tx/${sig}?cluster=custom&customUrl=http://localhost:8899`);
        
    } catch (error) {
        console.error('Error creating batch:', error);
        if (error.logs) console.error('Logs:', error.logs);
    }
}

createTestBatch();