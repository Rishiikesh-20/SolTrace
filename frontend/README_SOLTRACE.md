# SolTrace - Supply Chain Tracking on Solana

A comprehensive blockchain-based supply chain tracking system built on Solana with React.js frontend.

## Features

- **Wallet Integration**: Connect with Phantom and other Solana wallets
- **Role-Based Access**: Producer, Processor, Distributor, Retailer, Consumer, Regulator, Administrator
- **Batch Tracking**: Create and track product batches throughout the supply chain
- **IoT Data Visualization**: Real-time monitoring with Chart.js
- **IPFS Integration**: Decentralized metadata storage via backend API
- **Admin Panel**: User management and approval system
- **Compliance Tracking**: Cold chain compliance, fraud detection, certification

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui
- **Blockchain**: Solana Web3.js, Anchor Framework
- **Wallet**: @solana/wallet-adapter
- **Charts**: Chart.js, react-chartjs-2
- **HTTP**: Axios
- **Notifications**: react-toastify, sonner

## Setup

1. **Clone and Install**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   Create a `.env` file based on `.env.example`:
   ```
   VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
   VITE_PROGRAM_ID=5fm9Ah8DmB6mMFv6jqgBVEj4MZbNF5qDP62TwekEbdev
   VITE_BACKEND_URL=http://localhost:3000
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Build for Production**
   ```bash
   npm run build
   ```

## Backend Requirements

The frontend expects a backend API running at `http://localhost:3000` (or your configured URL) with the following endpoints:

- `POST /api/register` - Register user profile to IPFS
- `POST /api/batch/metadata` - Upload batch metadata to IPFS
- `GET /api/batch/metadata/:cid` - Retrieve batch metadata
- `GET /api/profile/:cid` - Retrieve user profile
- `GET /api/iot/:batchId` - Get IoT sensor data for a batch

## User Flow

1. **Connect Wallet**: Connect Phantom or compatible Solana wallet
2. **Register**: Submit profile information (name, location, certifications, role)
3. **Await Approval**: Admin reviews and approves the account
4. **Create Batches** (Producers): Register new product batches
5. **Track Batches**: View batch details, IoT data, compliance status
6. **Handover** (Supply Chain): Transfer batch ownership
7. **Monitor Compliance** (Regulators): Flag issues, issue certifications

## Program Integration

The app integrates with a Solana program (Anchor) using these instructions:

- `register_user`: Register user profile on-chain
- `approve_user`: Admin approves user (assigns role)
- `create_batch`: Producer creates new batch
- `log_handover`: Transfer batch ownership
- `flag_batch`: Regulator flags compliance issue
- `issue_certification`: Issue certification
- `check_compliance`: Verify compliance status

## Development Notes

- Uses Solana Devnet by default
- PDA derivation for accounts (user profiles, batches, certifications)
- Borsh serialization for on-chain data
- Mock IoT data via backend API
- Responsive design with mobile support

## Project Structure

```
src/
├── components/        # Reusable UI components
├── contexts/          # React contexts (Wallet, User)
├── pages/            # Page components
├── utils/            # Utility functions (Solana, API, constants)
└── App.tsx           # Main app component with routing
```

## License

MIT
