// backend/create-batch3.js
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import CryptoJS from 'crypto-js';
import { CONFIG } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BATCH_ID = CONFIG.BATCH_ID;

function loadKeypair(file) {
    const secret = JSON.parse(fs.readFileSync(file, 'utf-8'));
    return Keypair.fromSecretKey(new Uint8Array(secret));
}

const adminKeypair = loadKeypair(path.join(__dirname, 'admin-keypair.json'));
const programId = new PublicKey(CONFIG.PROGRAM_ID);
const connection = new Connection(CONFIG.SOLANA_RPC_URL, 'confirmed');

function computeHash(data) {
    return CryptoJS.SHA256(JSON.stringify(data)).toString(CryptoJS.enc.Hex);
}

function hexToBytes(hex) {
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return bytes;
}

function deriveBatchPDA(batchId) {
    return PublicKey.findProgramAddressSync([Buffer.from('batch'), Buffer.from(batchId)], programId)[0];
}

function deriveUserPDA(wallet) {
    return PublicKey.findProgramAddressSync([Buffer.from('user'), wallet.toBuffer()], programId)[0];
}

async function createBatch() {
    try {
        console.log('Creating batch3...');
        console.log(`Using Program ID: ${CONFIG.PROGRAM_ID}`);
        console.log(`Using RPC URL: ${CONFIG.SOLANA_RPC_URL}`);
        
        const batchPDA = deriveBatchPDA(BATCH_ID);
        const existingBatch = await connection.getAccountInfo(batchPDA);
        
        if (existingBatch) {
            console.log(`Batch ${BATCH_ID} already exists at ${batchPDA.toString()}`);
            return;
        }

        const userPDA = deriveUserPDA(adminKeypair.publicKey);
        
        const originDetails = {
            production_date: Math.floor(Date.now() / 1000),
            quantity: 1000,
            weight: 500.5,
            product_type: "Fish"
        };
        
        const metadata = {
            batchId: BATCH_ID,
            producer: adminKeypair.publicKey.toString(),
            createdAt: new Date().toISOString()
        };
        
        const metadataHash = hexToBytes(computeHash(metadata));
        const metadataCid = "QmTestBatchCID456";
        
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
        console.log(`✅ Batch3 created successfully!`);
        console.log(`Transaction: ${sig}`);
        console.log(`Batch PDA: ${batchPDA.toString()}`);
        
    } catch (error) {
        console.error('Error creating batch:', error);
        if (error.logs) console.error('Logs:', error.logs);
    }
}

createBatch();