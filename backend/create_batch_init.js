// backend/create_batch_init.js - Initialize user_profile and batch for testing
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';
import CryptoJS from 'crypto-js';
import { fileURLToPath } from 'url';
import { CONFIG } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BATCH_ID = CONFIG.INIT_BATCH_ID;

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
        { pubkey: adminKeypair.publicKey, isSigner: true, isWritable: true }, // user
        { pubkey: userPda, isSigner: false, isWritable: true }, // user_profile
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false } // system_program
    ];
    const ix = new TransactionInstruction({ keys, programId, data });
    const tx = new Transaction().add(ix);
    tx.feePayer = adminKeypair.publicKey;
    const sig = await connection.sendTransaction(tx, [adminKeypair], { preflightCommitment: 'confirmed' });
    await connection.confirmTransaction(sig, 'confirmed');
    console.log('[Init] user_profile created:', sig);
    return userPda;
}

function buildInitializeConfigIx(adminPubkey, oraclePubkey, configPda) {
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
}

async function ensureSystemConfig() {
    const configPda = deriveConfigPDA();
    const ai = await connection.getAccountInfo(configPda);
    if (ai) {
        console.log(`[Init] system_config exists: ${configPda.toString()}`);
        return;
    }
    console.log('[Init] Initializing system_config...');
    const ix = buildInitializeConfigIx(adminKeypair.publicKey, oracleKeypair.publicKey, configPda);
    const tx = new Transaction().add(ix);
    tx.feePayer = adminKeypair.publicKey;
    const sig = await connection.sendTransaction(tx, [adminKeypair], { preflightCommitment: 'confirmed' });
    await connection.confirmTransaction(sig, 'confirmed');
    console.log('[Init] system_config initialized:', sig);
}

async function ensureFunding() {
    const minSol = 1 * 1e9;
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

async function ensureApprovedProducer(userPda) {
    console.log('[Init] Approving user as Producer...');
    const discriminator = Uint8Array.from([62, 2, 57, 73, 112, 114, 126, 68]); // approve_user
    const roleBuf = Buffer.from([1]); // Role::Producer (variant 1, assuming None=0, Producer=1)
    const data = Buffer.concat([Buffer.from(discriminator), roleBuf]);
    const systemConfigPda = deriveConfigPDA();
    const keys = [
        { pubkey: adminKeypair.publicKey, isSigner: true, isWritable: true }, // admin
        { pubkey: userPda, isSigner: false, isWritable: true }, // user_profile
        { pubkey: systemConfigPda, isSigner: false, isWritable: false } // system_config
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

async function ensureBatch(userPda) {
    const batchPda = deriveBatchPDA(BATCH_ID);
    const ai = await connection.getAccountInfo(batchPda);
    if (ai) {
        console.log(`[Init] batch exists: ${batchPda.toString()}`);
        return batchPda;
    }
    console.log('[Init] Creating batch...');
    const origin = {
        production_date: Math.floor(Date.now() / 1000),
        quantity: 1000,
        weight: 500.5,
        product_type: 'Fish'
    };
    const metadata = { batchId: BATCH_ID, producer: adminKeypair.publicKey.toString() };
    const metadataHash = hexToBytes(sha256Hex(metadata));
    const metadataCid = 'QmTestBatchCID123';
    const discriminator = Uint8Array.from([159, 198, 248, 43, 248, 31, 235, 86]);
    const batchIdLen = Buffer.alloc(4);
    batchIdLen.writeUInt32LE(BATCH_ID.length, 0);
    const batchIdBuf = Buffer.from(BATCH_ID);
    
    const productionDateBuf = Buffer.alloc(8);
    productionDateBuf.writeBigInt64LE(BigInt(origin.production_date), 0);
    
    const quantityBuf = Buffer.alloc(8);
    quantityBuf.writeBigUInt64LE(BigInt(origin.quantity), 0);
    
    const weightBuf = Buffer.alloc(8);
    weightBuf.writeDoubleLE(origin.weight, 0);
    
    const productTypeLen = Buffer.alloc(4);
    productTypeLen.writeUInt32LE(origin.product_type.length, 0);
    const productTypeBuf = Buffer.from(origin.product_type);
    
    const originBuf = Buffer.concat([productionDateBuf, quantityBuf, weightBuf, productTypeLen, productTypeBuf]);
    
    const metadataCidLen = Buffer.alloc(4);
    metadataCidLen.writeUInt32LE(metadataCid.length, 0);
    const metadataCidBuf = Buffer.from(metadataCid);
    
    const data = Buffer.concat([Buffer.from(discriminator), batchIdLen, batchIdBuf, originBuf, Buffer.from(metadataHash), metadataCidLen, metadataCidBuf]);
    
    const keys = [
        { pubkey: batchPda, isSigner: false, isWritable: true },
        { pubkey: userPda, isSigner: false, isWritable: false },
        { pubkey: adminKeypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
    ];
    
    const ix = new TransactionInstruction({ keys, programId, data });
    const tx = new Transaction().add(ix);
    tx.feePayer = adminKeypair.publicKey;
    const sig = await connection.sendTransaction(tx, [adminKeypair], { preflightCommitment: 'confirmed' });
    await connection.confirmTransaction(sig, 'confirmed');
    console.log('[Init] batch created:', sig);
    return batchPda;
}

async function main() {
    console.log('[Init] Starting...');
    console.log(`[Init] Using Program ID: ${CONFIG.PROGRAM_ID}`);
    console.log(`[Init] Using RPC URL: ${CONFIG.SOLANA_RPC_URL}`);
    console.log(`[Init] Creating batch: ${BATCH_ID}`);
    
    await ensureFunding();
    await ensureSystemConfig();
    const userPda = await ensureUserProfile();
    await ensureApprovedProducer(userPda);
    await ensureBatch(userPda);
    console.log('[Init] Done');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});