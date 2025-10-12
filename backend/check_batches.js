// backend/check_batches.js - Diagnostic tool to verify batches
import { Connection, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { CONFIG } from './config.js';

const PROGRAM_ID = new PublicKey(CONFIG.PROGRAM_ID);
const connection = new Connection(CONFIG.SOLANA_RPC_URL, 'confirmed');

async function checkBatches() {
    console.log('='.repeat(60));
    console.log('BATCH DISCOVERY DIAGNOSTIC');
    console.log('='.repeat(60));
    console.log(`Program ID: ${PROGRAM_ID.toBase58()}`);
    console.log(`RPC URL: ${CONFIG.SOLANA_RPC_URL}`);
    console.log('');

    try {
        // Check 1: Get ALL program accounts
        console.log('📊 Check 1: Fetching ALL program accounts...');
        const allAccounts = await connection.getProgramAccounts(PROGRAM_ID);
        console.log(`   Found ${allAccounts.length} total accounts\n`);

        if (allAccounts.length === 0) {
            console.log('❌ No accounts found! Check:');
            console.log('   1. Is the program deployed?');
            console.log('   2. Is RPC URL correct?');
            console.log('   3. Are you on the right network?');
            return;
        }

        // Check 2: Analyze discriminators
        console.log('📊 Check 2: Analyzing account discriminators...');
        const discriminators = new Map();
        
        for (const account of allAccounts) {
            const disc = account.account.data.slice(0, 8);
            const discStr = Array.from(disc).join(',');
            discriminators.set(discStr, (discriminators.get(discStr) || 0) + 1);
        }

        console.log('   Account types found:');
        for (const [disc, count] of discriminators.entries()) {
            const type = getAccountType(disc);
            console.log(`   - ${type}: ${count} account(s) [${disc}]`);
        }
        console.log('');

        // Check 3: Parse batch accounts
        console.log('📊 Check 3: Parsing Batch accounts...');
        const BATCH_DISCRIMINATOR = [156, 194, 70, 44, 22, 88, 137, 44];
        const BATCH_DISC_STR = BATCH_DISCRIMINATOR.join(',');
        
        const batchAccounts = allAccounts.filter(account => {
            const disc = Array.from(account.account.data.slice(0, 8)).join(',');
            return disc === BATCH_DISC_STR;
        });

        console.log(`   Found ${batchAccounts.length} Batch accounts\n`);

        if (batchAccounts.length === 0) {
            console.log('❌ No Batch accounts found!');
            console.log('   This means no batches have been created yet.');
            console.log('   Run: npm run create-batches');
            return;
        }

        // Check 4: Parse batch IDs
        console.log('📊 Check 4: Extracting batch IDs...');
        const batches = [];
        
        for (let i = 0; i < batchAccounts.length; i++) {
            const account = batchAccounts[i];
            try {
                const data = account.account.data;
                let offset = 8; // Skip discriminator
                
                // Read batch ID
                const batchIdLen = data.readUInt32LE(offset);
                offset += 4;
                const batchId = data.slice(offset, offset + batchIdLen).toString('utf8');
                
                // Read producer
                offset += batchIdLen;
                const producer = new PublicKey(data.slice(offset, offset + 32));
                offset += 32;
                
                // Read current owner
                const currentOwner = new PublicKey(data.slice(offset, offset + 32));
                offset += 32;
                
                // Read status
                const status = data[offset];
                
                const statusNames = ['Registered', 'InProcessing', 'InTransit', 'Sold', 'Flagged', 'Recalled', 'Compliant'];
                
                batches.push({
                    batchId,
                    producer: producer.toBase58(),
                    currentOwner: currentOwner.toBase58(),
                    status: statusNames[status] || `Unknown(${status})`,
                    address: account.pubkey.toBase58(),
                });
                
                console.log(`   ${i + 1}. Batch ID: ${batchId}`);
                console.log(`      Status: ${statusNames[status] || `Unknown(${status})`}`);
                console.log(`      Producer: ${producer.toBase58().slice(0, 8)}...`);
                console.log(`      Owner: ${currentOwner.toBase58().slice(0, 8)}...`);
                console.log(`      Address: ${account.pubkey.toBase58()}`);
                console.log('');
                
            } catch (error) {
                console.log(`   ❌ Failed to parse batch ${i + 1}: ${error.message}`);
            }
        }

        // Check 5: Test memcmp filter
        console.log('📊 Check 5: Testing memcmp filter...');
        const filteredAccounts = await connection.getProgramAccounts(PROGRAM_ID, {
            filters: [
                {
                    memcmp: {
                        offset: 0,
                        bytes: Buffer.from(BATCH_DISCRIMINATOR).toString('base64'),
                    }
                }
            ]
        });
        console.log(`   memcmp returned ${filteredAccounts.length} accounts`);
        
        if (filteredAccounts.length !== batchAccounts.length) {
            console.log(`   ⚠️  Warning: memcmp count doesn't match manual filter!`);
        } else {
            console.log(`   ✅ Filter working correctly!\n`);
        }

        // Summary
        console.log('='.repeat(60));
        console.log('SUMMARY');
        console.log('='.repeat(60));
        console.log(`✅ Total accounts: ${allAccounts.length}`);
        console.log(`✅ Batch accounts: ${batchAccounts.length}`);
        console.log(`✅ Successfully parsed: ${batches.length}`);
        console.log('');
        
        if (batches.length > 0) {
            console.log('🎉 Gateway should discover these batches!');
            console.log('   Restart gateway with: npm run gateway');
        } else {
            console.log('⚠️  No batches to discover.');
            console.log('   Create batches with: npm run create-batches');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    }
}

function getAccountType(discStr) {
    const types = {
        '218,150,16,126,102,185,75,1': 'SystemConfig',
        '32,37,119,205,179,180,13,194': 'UserProfile',
        '156,194,70,44,22,88,137,44': 'Batch',
        '141,130,166,168,167,23,163,147': 'Certification',
    };
    return types[discStr] || 'Unknown';
}

checkBatches().catch(console.error);