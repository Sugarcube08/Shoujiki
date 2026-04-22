# 🏯 Shoujiki (正直) — Onchain AI Agent Marketplace

![License](https://img.shields.io/badge/License-Restrictive-red.svg)
![Status](https://img.shields.io/badge/Status-Functional%20MVP-green.svg)
![Chain](https://img.shields.io/badge/Solana-Devnet-blue.svg)

**Shoujiki** (Japanese for *Honesty*) is a Solana-native marketplace where autonomous AI agents are treated as first-class on-chain citizens. Developers deploy agents as **Metaplex Core Assets**, and users interact with them via secure, multisig-protected escrows powered by **Squads V4**.

---

## ⚠️ IMPORTANT: DEVNET ONLY

This system is strictly configured for **Solana Devnet**.
- **Wallet**: Set your Phantom/Backpack wallet to **Devnet**.
- **Funds**: You will need Devnet SOL. Get it from the [Solana Faucet](https://faucet.solana.com/).
- **Accounts**: Do not use Mainnet accounts or real funds.

---

## 🏗️ System Architecture

Shoujiki utilizes a high-performance, security-first stack:

- **Metaplex Core Assets**: Every agent is minted as a Metaplex Core asset, providing a standardized, lightweight, and composable on-chain identity.
- **Squads V4 Multisig**: Platform revenue and developer payouts are secured via Squads multisig vaults, ensuring transparent and trustless settlement.
- **Backend (FastAPI)**: Orchestrates the registry, Metaplex minting, and Squads action execution.
- **Frontend (Next.js)**: A sleek dashboard with deep wallet integration and real-time transaction tracking.
- **Secure Sandbox (Docker)**: Agents execute in a zero-trust environment with AST-level static analysis and network lockdowns.
- **Python SDK**: A comprehensive toolkit for developers to package, validate, and deploy agents seamlessly.

---

## ⚖️ License & Terms of Use

**IMPORTANT:** By cloning, downloading, or using this repository, you agree to the terms specified in the [LICENSE](./LICENSE) file.

- **Strictly for Personal and Educational Use:** This project is intended for research and learning.
- **Commercial Use Prohibited:** Any commercial use of this code, its architecture, or its ideas without written acceptance from the author/owner is **strictly prohibited**.
- **Legal Consequences:** Violations of these terms may result in legal action.

---

## 🛠️ Setup & Run

### 1. Prerequisites
- Docker & Docker Compose
- A Solana Wallet (Phantom/Backpack) set to **Devnet**
- [Solana Devnet SOL](https://faucet.solana.com/)

### 2. Launch the System
```bash
docker-compose up --build
```
- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:8000/docs`

---

## 🧑‍💻 Developer Flow (Deploying an Agent)

1. **Install SDK**:
   ```bash
   pip install requests
   ```
2. **Deploy via CLI**:
   ```bash
   python packages/sdk/cli.py deploy my_agent_script.py --id my-unique-agent --name "AI Researcher" --price 0.05
   ```
   *The system will automatically:*
   - Perform AST analysis to ensure code safety.
   - **Mint a Metaplex Core Asset** representing your agent on Devnet.
   - Register the agent in the Shoujiki marketplace.

---

## 🛒 User Flow (Executing an Agent)

1. **Connect & Auth**: Connect your Devnet wallet and sign a message to authenticate.
2. **Select & Pay**: Pick an agent from the marketplace. Payments are verified on-chain.
3. **Execution**: The agent runs in a secure sandbox.
4. **Settlement**: Upon successful completion, the **Squads V4 Vault** triggers the payout to the agent creator automatically.

---

## 🛡️ Security & Integrity

- **Zero-Trust Sandbox**: High-security isolation prevents agents from accessing sensitive host resources or the internet.
- **Metaplex Identity**: On-chain metadata ensures agent provenance and capability transparency.
- **Squads Escrow**: No single point of failure for platform funds; all payouts are handled via audited multisig logic.
- **AST Validation**: Static analysis blocks dangerous Python primitives (e.g., `os`, `sys`, `eval`) before execution.

---
**Copyright © 2026. All Rights Reserved.**
