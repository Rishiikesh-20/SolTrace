// src/utils/solana.ts - COMPLETE FIXED VERSION
import { Connection, PublicKey } from '@solana/web3.js';
import { PROGRAM_ID } from './constants';
import { UserProfile, UserRole } from '@/contexts/UserContext';

export const connection = new Connection(
  import.meta.env.VITE_SOLANA_RPC_URL || 'http://localhost:8899',
  'confirmed'
);

// PDA derivation functions
export const deriveUserProfilePDA = (userWallet: PublicKey): PublicKey => {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('user'), userWallet.toBuffer()],
    PROGRAM_ID
  );
  return pda;
};

export const deriveBatchPDA = (batchId: string): PublicKey => {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('batch'), Buffer.from(batchId)],
    PROGRAM_ID
  );
  return pda;
};

export const deriveSystemConfigPDA = (): PublicKey => {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    PROGRAM_ID
  );
  return pda;
};

// Parse user profile
export const parseUserProfile = (data: Buffer): UserProfile | null => {
  try {
    if (data.length < 83) return null;

    const userWallet = new PublicKey(data.slice(8, 40)).toBase58();
    const role = data[40] as UserRole;
    const profileHash = Array.from(data.slice(41, 73));
    const isApproved = data[73] === 1;
    const registeredAt = Number(
      BigInt.asIntN(64, data.readBigInt64LE(74))
    );

    return {
      userWallet,
      role,
      profileHash,
      isApproved,
      registeredAt,
    };
  } catch (error) {
    console.error('Error parsing user profile:', error);
    return null;
  }
};

// Batch interfaces
export interface BatchOriginDetails {
  productionDate: number;
  quantity: number;
  weight: number;
  productType: string;
}

export interface BatchEvent {
  eventType: number;
  timestamp: number;
  fromWallet: string;
  toWallet: string;
  detailsHash: number[];
  detailsCid: string;
}

export interface IoTSummary {
  timestamp: number;
  minTemp: number;
  maxTemp: number;
  avgTemp: number;
  minHumidity: number;
  maxHumidity: number;
  avgHumidity: number;
  locationSummary: string;
  breachDetected: boolean;
  breachCount: number;
}

export interface Threshold {
  maxTemp: number;
  maxHumidity: number;
  maxBreachDuration: number;
}

export interface ComplianceFlags {
  coldChainCompliant: boolean;
  fraudDetected: boolean;
  certificationIssued: boolean;
}

export interface Batch {
  id: string;
  producer: string;
  currentOwner: string;
  status: number;
  originDetails: BatchOriginDetails;
  metadataHash: number[];
  metadataCid: string;
  events: BatchEvent[];
  iotSummary: IoTSummary;
  iotHash: number[];
  iotCid: string;
  threshold: Threshold;
  compliance: ComplianceFlags;
}

// ✅ FIXED: Robust batch parser with better error handling
function parseBatchAccount(data: Buffer): Batch | null {
  try {
    let offset = 8; // Skip discriminator

    // Parse batch ID
    if (data.length < offset + 4) {
      console.warn('Insufficient data for batch ID length');
      return null;
    }
    const batchIdLen = data.readUInt32LE(offset);
    offset += 4;
    
    if (data.length < offset + batchIdLen || batchIdLen > 64) {
      console.warn('Invalid batch ID length');
      return null;
    }
    const id = data.slice(offset, offset + batchIdLen).toString('utf8');
    offset += batchIdLen;

    // Parse producer (32 bytes)
    if (data.length < offset + 32) return null;
    const producer = new PublicKey(data.slice(offset, offset + 32)).toBase58();
    offset += 32;

    // Parse current owner (32 bytes)
    if (data.length < offset + 32) return null;
    const currentOwner = new PublicKey(data.slice(offset, offset + 32)).toBase58();
    offset += 32;

    // Parse status (1 byte)
    if (data.length < offset + 1) return null;
    const status = data[offset];
    offset += 1;

    // Parse origin details
    if (data.length < offset + 24) return null;
    const productionDate = Number(data.readBigInt64LE(offset));
    offset += 8;
    const quantity = Number(data.readBigUInt64LE(offset));
    offset += 8;
    const weight = data.readDoubleLE(offset);
    offset += 8;
    
    if (data.length < offset + 4) return null;
    const productTypeLen = data.readUInt32LE(offset);
    offset += 4;
    
    if (data.length < offset + productTypeLen || productTypeLen > 64) return null;
    const productType = data.slice(offset, offset + productTypeLen).toString('utf8');
    offset += productTypeLen;

    const originDetails: BatchOriginDetails = {
      productionDate,
      quantity,
      weight,
      productType,
    };

    // Parse metadata hash (32 bytes)
    if (data.length < offset + 32) return null;
    const metadataHash = Array.from(data.slice(offset, offset + 32));
    offset += 32;

    // Parse metadata CID
    if (data.length < offset + 4) return null;
    const metadataCidLen = data.readUInt32LE(offset);
    offset += 4;
    
    if (data.length < offset + metadataCidLen) return null;
    const metadataCid = data.slice(offset, offset + metadataCidLen).toString('utf8');
    offset += metadataCidLen;

    // Parse events
    if (data.length < offset + 4) return null;
    const eventsLen = data.readUInt32LE(offset);
    offset += 4;

    const events: BatchEvent[] = [];
    for (let i = 0; i < eventsLen; i++) {
      if (data.length < offset + 1) break;
      const eventType = data[offset];
      offset += 1;

      if (data.length < offset + 8) break;
      const timestamp = Number(data.readBigInt64LE(offset));
      offset += 8;

      if (data.length < offset + 64) break;
      const fromWallet = new PublicKey(data.slice(offset, offset + 32)).toBase58();
      offset += 32;
      const toWallet = new PublicKey(data.slice(offset, offset + 32)).toBase58();
      offset += 32;

      if (data.length < offset + 32) break;
      const detailsHash = Array.from(data.slice(offset, offset + 32));
      offset += 32;

      if (data.length < offset + 4) break;
      const detailsCidLen = data.readUInt32LE(offset);
      offset += 4;

      if (data.length < offset + detailsCidLen) break;
      const detailsCid = data.slice(offset, offset + detailsCidLen).toString('utf8');
      offset += detailsCidLen;

      events.push({
        eventType,
        timestamp,
        fromWallet,
        toWallet,
        detailsHash,
        detailsCid,
      });
    }

    // Parse IoT summary
    if (data.length < offset + 8) return null;
    const iotTimestamp = Number(data.readBigInt64LE(offset));
    offset += 8;

    if (data.length < offset + 24) return null;
    const minTemp = data.readFloatLE(offset);
    offset += 4;
    const maxTemp = data.readFloatLE(offset);
    offset += 4;
    const avgTemp = data.readFloatLE(offset);
    offset += 4;
    const minHumidity = data.readFloatLE(offset);
    offset += 4;
    const maxHumidity = data.readFloatLE(offset);
    offset += 4;
    const avgHumidity = data.readFloatLE(offset);
    offset += 4;

    if (data.length < offset + 4) return null;
    const locationSummaryLen = data.readUInt32LE(offset);
    offset += 4;
    
    if (data.length < offset + locationSummaryLen) return null;
    const locationSummary = data.slice(offset, offset + locationSummaryLen).toString('utf8');
    offset += locationSummaryLen;

    if (data.length < offset + 5) return null;
    const breachDetected = data[offset] === 1;
    offset += 1;
    const breachCount = data.readUInt32LE(offset);
    offset += 4;

    // Parse IoT hash and CID
    if (data.length < offset + 32) return null;
    const iotHash = Array.from(data.slice(offset, offset + 32));
    offset += 32;

    if (data.length < offset + 4) return null;
    const iotCidLen = data.readUInt32LE(offset);
    offset += 4;
    
    if (data.length < offset + iotCidLen) return null;
    const iotCid = data.slice(offset, offset + iotCidLen).toString('utf8');
    offset += iotCidLen;

    // Parse thresholds
    if (data.length < offset + 12) return null;
    const maxTempThreshold = data.readFloatLE(offset);
    offset += 4;
    const maxHumidityThreshold = data.readFloatLE(offset);
    offset += 4;
    const maxBreachDuration = data.readUInt32LE(offset);
    offset += 4;

    // Parse compliance flags
    if (data.length < offset + 3) return null;
    const coldChainCompliant = data[offset] === 1;
    offset += 1;
    const fraudDetected = data[offset] === 1;
    offset += 1;
    const certificationIssued = data[offset] === 1;

    return {
      id,
      producer,
      currentOwner,
      status,
      originDetails,
      metadataHash,
      metadataCid,
      events,
      iotSummary: {
        timestamp: iotTimestamp,
        minTemp,
        maxTemp,
        avgTemp,
        minHumidity,
        maxHumidity,
        avgHumidity,
        locationSummary,
        breachDetected,
        breachCount,
      },
      iotHash,
      iotCid,
      threshold: {
        maxTemp: maxTempThreshold,
        maxHumidity: maxHumidityThreshold,
        maxBreachDuration,
      },
      compliance: {
        coldChainCompliant,
        fraudDetected,
        certificationIssued,
      },
    };
  } catch (error) {
    console.error('Error parsing batch account:', error);
    return null;
  }
}

// ✅ FIXED: Get all batches with proper filtering
export const getAllBatches = async (): Promise<Batch[]> => {
  try {
    console.log('Fetching all batches from program:', PROGRAM_ID.toBase58());
    
    // Batch discriminator [156,194,70,44,22,88,137,44]
    const BATCH_DISCRIMINATOR = [156, 194, 70, 44, 22, 88, 137, 44];
    
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: bs58.encode(Buffer.from(BATCH_DISCRIMINATOR)),
          }
        }
      ],
    });

    console.log(`Found ${accounts.length} batch accounts`);

    const batches: Batch[] = [];
    for (const account of accounts) {
      try {
        const batch = parseBatchAccount(account.account.data);
        if (batch) {
          batches.push(batch);
        }
      } catch (error) {
        console.error('Error parsing batch:', error);
      }
    }

    console.log(`Successfully parsed ${batches.length} batches`);
    return batches;
  } catch (error: any) {
    console.error('Error fetching all batches:', error);
    throw new Error(`Failed to fetch batches: ${error.message}`);
  }
};

export const getUserBatches = async (userPublicKey: PublicKey): Promise<Batch[]> => {
  const allBatches = await getAllBatches();
  return allBatches.filter(
    batch => 
      batch.producer === userPublicKey.toBase58() ||
      batch.currentOwner === userPublicKey.toBase58()
  );
};

export const getBatch = async (batchId: string): Promise<Batch | null> => {
  const pda = deriveBatchPDA(batchId);
  const accountInfo = await connection.getAccountInfo(pda);
  
  if (!accountInfo) return null;
  
  return parseBatchAccount(accountInfo.data);
};

export const getUserProfile = async (wallet: PublicKey): Promise<UserProfile | null> => {
  const pda = deriveUserProfilePDA(wallet);
  const accountInfo = await connection.getAccountInfo(pda);
  
  if (!accountInfo) return null;
  
  return parseUserProfile(accountInfo.data);
};