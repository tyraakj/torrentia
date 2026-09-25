#!/usr/bin/env bash
set -e

echo "Building smart contracts..."
forge build

echo "Exporting ABIs to frontend/src/lib/abis/..."
node -e "
const fs = require('fs');
const r = JSON.parse(fs.readFileSync('out/ModelRegistry.sol/ModelRegistry.json', 'utf8'));
fs.writeFileSync('../frontend/src/lib/abis/ModelRegistry.json', JSON.stringify(r.abi, null, 2));
const s = JSON.parse(fs.readFileSync('out/SplitPayment.sol/SplitPayment.json', 'utf8'));
fs.writeFileSync('../frontend/src/lib/abis/SplitPayment.json', JSON.stringify(s.abi, null, 2));
const s2 = JSON.parse(fs.readFileSync('out/SplitPaymentV2.sol/SplitPaymentV2.json', 'utf8'));
fs.writeFileSync('../frontend/src/lib/abis/SplitPaymentV2.json', JSON.stringify(s2.abi, null, 2));
fs.writeFileSync('../frontend/src/lib/abis/SplitPaymentV2ABI.ts', 'export const SPLIT_PAYMENT_V2_ABI = ' + JSON.stringify(s2.abi, null, 2) + ' as const;\n');
"

echo "ABIs successfully exported!"
