#!/bin/bash


echo "🚀 Setting up Supply Chain IoT Backend..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v18+"
    exit 1
fi

if ! command -v ipfs &> /dev/null; then
    echo "❌ IPFS is not installed. Please install go-ipfs from https://dist.ipfs.io"
    exit 1
fi

if ! command -v solana &> /dev/null; then
    echo "❌ Solana CLI is not installed. Please install from https://docs.solana.com/cli/install-solana-cli-tools"
    exit 1
fi

if ! command -v anchor &> /dev/null; then
    echo "❌ Anchor is not installed. Please install from https://www.anchor-lang.com/docs/installation"
    exit 1
fi

echo "✅ All required tools are installed"

echo "📦 Installing npm dependencies..."
npm install

if [ ! -d ~/.ipfs ]; then
    echo "🔧 Initializing IPFS..."
    ipfs init
fi

if [ -f ../contracts/target/idl/contracts.json ]; then
    echo "📋 Copying IDL file..."
    cp ../contracts/target/idl/contracts.json ./idl.json
else
    echo "⚠️  IDL file not found. Please run 'anchor build' first"
fi

if [ ! -f oracle-keypair.json ]; then
    echo "🔑 Generating oracle keypair..."
    solana-keygen new --no-passphrase -o oracle-keypair.json
fi

if [ ! -f admin-keypair.json ]; then
    echo "🔑 Generating admin keypair..."
    solana-keygen new --no-passphrase -o admin-keypair.json
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Start IPFS daemon:         ipfs daemon"
echo "2. Start Solana validator:    solana-test-validator"
echo "3. Start MQTT broker:         npm run broker"
echo "4. Start API server:          npm run start"
echo "5. Start IoT gateway:         npm run gateway"
echo "6. Start Oracle service:      npm run oracle"
echo ""
echo "Or run all at once with:      npm run dev (requires concurrently)"
echo ""
echo "💡 To create a test batch:    node create-test-batch.js"