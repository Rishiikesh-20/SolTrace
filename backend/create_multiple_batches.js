// backend/create_multiple_batches.js
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import CryptoJS from 'crypto-js';
import { CONFIG } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NUM_BATCHES = 10; // Number of batches to create (batch1 to batch10)

function loadKeypair(p) {
    const secret = JSON.parse(fs.readFileSync(p, 'utf-8'));
    return Keypair.fromSecretKey(new Uint8Array(secret));
}

const adminKeypair = loadKeypair(path.join(__dirname, 'admin-keypair.json'));
const oracleKeypair = loadKeypair(path.join(__dirname, 'oracle-keypair.json'));
const programId = new PublicKey(CONFIG.PROGRAM_ID);
const connection = new Connection(CONFIG.SOLANA_RPC_URL, 'confirmed');

function sha256Hex(obj) {
    return CryptoJS.SHA256(JSON.stringify(obj)).toString(CryptoJS.enc.Hex);
}

function hexToBytes(hex) {
    const out = [];
    for (let i = 0; i < hex.length; i += 2) out.push(parseInt(hex.slice(i, i + 2), 16));
    return Uint8Array.from(out);
}

const deriveUserPDA = (wallet) => PublicKey.findProgramAddressSync([Buffer.from('user'), wallet.toBuffer()], programId)[0];
const deriveBatchPDA = (batchId) => PublicKey.findProgramAddressSync([Buffer.from('batch'), Buffer.from(batchId)], programId)[0];
const deriveConfigPDA = () => PublicKey.findProgramAddressSync([Buffer.from('config')], programId)[0];

async function ensureFunding() {
    const minSol = 1 * 1e9; // 1 SOL
    const balAdmin = await connection.getBalance(adminKeypair.publicKey).catch(() => 0);
    if (balAdmin < minSol) {
        const sig = await connection.requestAirdrop(adminKeypair.publicKey, 10 * 1e9);
        await connection.confirmTransaction(sig);
        console.log('[Init] Admin wallet funded');
    }
    const balOracle = await connection.getBalance(oracleKeypair.publicKey).catch(() => 0);
    if (balOracle < minSol) {
        const sig = await connection.requestAirdrop(oracleKeypair.publicKey, 10 * 1e9);
        await connection.confirmTransaction(sig);
        console.log('[Init] Oracle wallet funded');
    }
}

async function ensureSystemConfig() {
    const configPda = deriveConfigPDA();
    const ai = await connection.getAccountInfo(configPda);
    if (ai) {
        console.log(`[Init] system_config exists: ${configPda.toString()}`);
        return;
    }
    console.log('[Init] Initializing system_config...');
    const discriminator = Uint8Array.from([38, 75, 134, 154, 249, 64, 246, 46]); // initialize_system_config
    const data = Buffer.concat([
        Buffer.from(discriminator),
        Buffer.from(adminKeypair.publicKey.toBytes()),
        Buffer.from(oracleKeypair.publicKey.toBytes())
    ]);
    const keys = [
        { pubkey: configPda, isSigner: false, isWritable: true },
        { pubkey: adminKeypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
    ];
    const ix = new TransactionInstruction({ keys, programId, data });
    const tx = new Transaction().add(ix);
    tx.feePayer = adminKeypair.publicKey;
    const sig = await connection.sendTransaction(tx, [adminKeypair], { preflightCommitment: 'confirmed' });
    await connection.confirmTransaction(sig, 'confirmed');
    console.log('[Init] system_config initialized:', sig);
}

async function ensureUserProfile() {
    const userPda = deriveUserPDA(adminKeypair.publicKey);
    const ai = await connection.getAccountInfo(userPda);
    if (ai) {
        console.log(`[Init] user_profile exists: ${userPda.toString()}`);
        return userPda;
    }
    console.log('[Init] Creating user_profile...');
    const discriminator = Uint8Array.from([2, 241, 150, 223, 99, 214, 116, 97]); // register_user
    const profile = { name: 'Test Producer', location: 'Bangalore, IN', certifications: [], role: 'Producer' };
    const profileHashBytes = Buffer.from(hexToBytes(sha256Hex(profile)));
    const data = Buffer.concat([Buffer.from(discriminator), profileHashBytes]);
    const keys = [
        { pubkey: adminKeypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: userPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
    ];
    const ix = new TransactionInstruction({ keys, programId, data });
    const tx = new Transaction().add(ix);
    tx.feePayer = adminKeypair.publicKey;
    const sig = await connection.sendTransaction(tx, [adminKeypair], { preflightCommitment: 'confirmed' });
    await connection.confirmTransaction(sig, 'confirmed');
    console.log('[Init] user_profile created:', sig);
    return userPda;
}

async function ensureApprovedProducer(userPda) {
    console.log('[Init] Approving user as Producer...');
    const discriminator = Uint8Array.from([62, 2, 57, 73, 112, 114, 126, 68]); // approve_user
    const roleBuf = Buffer.from([1]); // Role::Producer
    const data = Buffer.concat([Buffer.from(discriminator), roleBuf]);
    const systemConfigPda = deriveConfigPDA();
    const keys = [
        { pubkey: adminKeypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: userPda, isSigner: false, isWritable: true },
        { pubkey: systemConfigPda, isSigner: false, isWritable: false }
    ];
    const ix = new TransactionInstruction({ keys, programId, data });
    const tx = new Transaction().add(ix);
    tx.feePayer = adminKeypair.publicKey;
    try {
        const sig = await connection.sendTransaction(tx, [adminKeypair], { preflightCommitment: 'confirmed' });
        await connection.confirmTransaction(sig, 'confirmed');
        console.log('[Init] User approved as Producer:', sig);
    } catch (e) {
        const msg = e.logs ? e.logs.join('\n') : String(e);
        if (msg.includes('AlreadyApproved') || msg.includes('6000')) {
            console.log('[Init] User already approved or role already set. Continuing.');
        } else {
            console.error('[Init] Approval error:', msg);
            throw e;
        }
    }
}

async function createBatch(batchId) {
    try {
        console.log(`Creating ${batchId}...`);
        console.log(`Using Program ID: ${CONFIG.PROGRAM_ID}`);
        console.log(`Using RPC URL: ${CONFIG.SOLANA_RPC_URL}`);
        
        const batchPDA = deriveBatchPDA(batchId);
        const existingBatch = await connection.getAccountInfo(batchPDA);
        
        if (existingBatch) {
            console.log(`Batch ${batchId} already exists at ${batchPDA.toString()}`);
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
            batchId: batchId,
            producer: adminKeypair.publicKey.toString(),
            createdAt: new Date().toISOString()
        };
        
        const metadataHash = hexToBytes(sha256Hex(metadata));
        const metadataCid = `QmTestBatchCID${batchId}`;
        
        const discriminator = Uint8Array.from([159, 198, 248, 43, 248, 31, 235, 86]); // create_batch
        const batchIdLen = Buffer.alloc(4);
        batchIdLen.writeUInt32LE(batchId.length, 0);
        const batchIdBuf = Buffer.from(batchId);
        
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
        console.log(`✅ ${batchId} created successfully!`);
        console.log(`Transaction: ${sig}`);
        console.log(`Batch PDA: ${batchPDA.toString()}`);
        
    } catch (error) {
        console.error(`Error creating ${batchId}:`, error);
        if (error.logs) console.error('Logs:', error.logs);
    }
}

async function main() {
    console.log('[Init] Starting batch creation for multiple batches...');
    console.log(`[Init] Using Program ID: ${CONFIG.PROGRAM_ID}`);
    console.log(`[Init] Using RPC URL: ${CONFIG.SOLANA_RPC_URL}`);
    
    await ensureFunding();
    await ensureSystemConfig();
    const userPda = await ensureUserProfile();
    await ensureApprovedProducer(userPda);
    
    for (let i = 1; i <= NUM_BATCHES; i++) {
        const batchId = `batch${i}`;
        await createBatch(batchId);
    }
    console.log('[Init] All batches created.');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});