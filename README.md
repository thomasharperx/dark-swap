# Dark Swap

Dark Swap is a privacy-preserving ETH to cUSDT swap built on Zama FHEVM. It mints encrypted balances and lets users
decrypt their actual cUSDT balance on demand, while keeping on-chain data private by default.

## Project Overview

This project implements a fixed-rate swap contract where 1 ETH always equals 2300 cUSDT. The cUSDT contract is external
and immutable. The frontend shows the encrypted cUSDT balance and provides a decrypt action to reveal the real balance.

## Problem It Solves

Most on-chain swaps expose user balances and swap amounts in plaintext, which can leak sensitive information and enable
unwanted profiling. Dark Swap keeps balances encrypted while still providing a simple, deterministic swap experience.

## Solution

Dark Swap uses FHE-enabled Solidity to store cUSDT balances in encrypted form. Users swap ETH for cUSDT at a fixed rate,
then choose when to decrypt their balance in the UI. This provides privacy by default without changing the user flow.

## Advantages

- Private balances by default through FHE encryption.
- Deterministic pricing with no slippage or price oracle risk.
- Simple, predictable UX: swap, then decrypt to view balance.
- Clear separation between swap logic and the external cUSDT token.

## Key Features

- ETH to cUSDT swap at a fixed rate of 1 ETH = 2300 cUSDT.
- Encrypted cUSDT balance display in the UI.
- One-click decrypt action to reveal the actual balance.
- Hardhat tasks and tests for local and Sepolia workflows.
- Sepolia deployment flow using private key based credentials.

## Tech Stack

- Smart contracts: Solidity, Hardhat, Zama FHEVM
- Frontend: React, Vite, viem (read), ethers (write), rainbow
- Tooling: npm

## Architecture

- `contracts/`: Swap contract logic built for FHEVM.
- `deploy/`: Deployment scripts for local node and Sepolia.
- `tasks/`: Hardhat tasks to assist local workflows.
- `test/`: Contract tests.
- `deployments/sepolia/`: Contract ABI used by the frontend.
- `ui/`: Vite-based frontend with encrypted balance UX.

## Design Constraints and Rules

- The cUSDT contract is not modified.
- View functions do not rely on `msg.sender` to determine addresses.
- Frontend reads use viem; writes use ethers.
- No Tailwind and no frontend environment variables.
- No localstorage usage and no localhost network in the frontend.
- Frontend ABI must come from `deployments/sepolia/`.

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Install Dependencies

```bash
npm install
```

### Local Development Flow

1. Start a local FHEVM-ready node:

```bash
npx hardhat node
```

2. Deploy to the local node:

```bash
npx hardhat deploy --network localhost
```

3. Run tasks and tests:

```bash
npx hardhat test
```

### Sepolia Deployment

After local tasks and tests succeed, deploy to Sepolia. Deployment uses a private key and requires `INFURA_API_KEY`.
Do not use a mnemonic.

```bash
npx hardhat deploy --network sepolia
```

Optional verification:

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

### Frontend Usage

The frontend is located in `ui/`. It is configured to work with Sepolia and does not use localhost networks or
environment variables. Use the ABI from `deployments/sepolia/`.

```bash
cd ui
npm install
npm run dev
```

## Security Notes

- Encrypted balances protect privacy but do not replace standard wallet security.
- Fixed rate swaps reduce complexity but do not provide market price discovery.
- Always validate contract addresses and network selection in the UI.

## Future Roadmap

- Multi-asset swaps with encrypted reserves.
- Optional variable rate pools with transparency controls.
- Improved UX for decrypt permissions and transaction status.
- Formal security review and gas optimization passes.
- Expanded task automation for test and deployment pipelines.

## License

BSD-3-Clause-Clear. See `LICENSE` for details.
