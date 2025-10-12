import { PublicKey } from '@solana/web3.js';

export const PROGRAM_ID = new PublicKey(
  import.meta.env.VITE_PROGRAM_ID || '5fm9Ah8DmB6mMFv6jqgBVEj4MZbNF5qDP62TwekEbdev'
);

export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export const BatchStatus = {
  Registered: 0,
  InProcessing: 1,
  InTransit: 2,
  Sold: 3,
  Flagged: 4,
  Recalled: 5,
  Compliant: 6,
} as const;

export const BatchStatusLabels: Record<number, string> = {
  0: 'Registered',
  1: 'In Processing',
  2: 'In Transit',
  3: 'Sold',
  4: 'Flagged',
  5: 'Recalled',
  6: 'Compliant',
};

export const EventType = {
  HandOver: 0,
  BreachDetected: 1,
  ThresholdUpdated: 2,
  Flagged: 3,
  Recalled: 4,
} as const;

export const EventTypeLabels: Record<number, string> = {
  0: 'Hand Over',
  1: 'Breach Detected',
  2: 'Threshold Updated',
  3: 'Flagged',
  4: 'Recalled',
};
