# SolTrace

SolTrace is a Solana-based supply chain traceability platform with:

- On-chain state management using Anchor
- Backend services for API, MQTT, oracle automation, and IPFS storage
- React frontend for user registration, admin approval, and batch tracking

## What You Get

- Role-based user onboarding (admin approval flow)
- Batch lifecycle tracking across supply chain stages
- IoT data summaries and compliance signals
- IPFS-backed metadata and profile records
- End-to-end local development flow (contracts + backend + frontend)

## Repository Structure

```text
SolTrace/
├── contracts/   # Anchor program, IDL, and tests
├── backend/     # Express API + MQTT broker + gateway + oracle
└── frontend/    # React + Vite web application
```

## Quick Start

### 1. Build contract artifacts

```bash
cd contracts
npm install
anchor build
```

### 2. Setup backend

```bash
cd ../backend
npm install
chmod +x setup.sh
./setup.sh
```

### 3. Start required infrastructure

Run these in separate terminals:

```bash
ipfs daemon
```

```bash
solana-test-validator --reset --rpc-port 8899
```

### 4. Start backend services

```bash
cd backend
npm run dev
```

### 5. Run frontend

```bash
cd ../frontend
npm install
```

Create frontend/.env:

```env
VITE_SOLANA_RPC_URL=http://localhost:8899
VITE_PROGRAM_ID=5fm9Ah8DmB6mMFv6jqgBVEj4MZbNF5qDP62TwekEbdev
VITE_BACKEND_URL=http://localhost:3000
```

Start UI:

```bash
npm run dev
```

## Prerequisites

- Node.js 18+
- npm
- Rust toolchain
- Solana CLI
- Anchor CLI
- IPFS CLI (Kubo)

Optional:

- Docker + Docker Compose

## Local Defaults

- Program ID: 5fm9Ah8DmB6mMFv6jqgBVEj4MZbNF5qDP62TwekEbdev
- Solana RPC: http://localhost:8899
- Backend API: http://localhost:3000

## Backend API

- GET /health
- POST /api/register
- GET /api/profile/:cid
- POST /api/batch/metadata
- GET /api/batch/metadata/:cid
- GET /api/iot/:batchId

## Anchor Instructions

- intialize_config
- register_user
- approve_user
- create_batch
- log_handover
- flag_batch
- issue_certification
- check_compliance
- update_iot_summary

## Useful Commands

From backend directory:

```bash
npm run start      # API server
npm run broker     # MQTT broker
npm run gateway    # IoT gateway simulation
npm run oracle     # Oracle service
npm run dev        # Start all backend services
./start_system.sh  # Scripted multi-service start
./restart_system.sh
node test_system.js
```

From contracts directory:

```bash
anchor build
anchor test
```

From frontend directory:

```bash
npm run dev
npm run build
```

## Docker Option (Backend)

From backend directory:

```bash
docker compose up --build
```

This starts ipfs, solana validator, broker, init, gateway, oracle, and api.

## Troubleshooting

- IPFS unavailable:
  - Check ipfs daemon is running on port 5001.
- Solana unavailable:
  - Check solana-test-validator is running on port 8899.
- Backend IDL mismatch:
  - Re-run anchor build in contracts, then run backend setup.sh.
- Frontend cannot connect:
  - Verify frontend/.env values and restart the frontend dev server.

## Additional Docs

- frontend/README_SOLTRACE.md
