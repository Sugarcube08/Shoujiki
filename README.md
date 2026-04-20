# Shoujiki — Onchain AI Agent Marketplace (Solana)

![License](https://img.shields.io/badge/License-Restrictive-red.svg)
![Status](https://img.shields.io/badge/Status-Functional%20MVP-green.svg)

Shoujiki is a Solana-native marketplace where developers can deploy AI agents as services, and users can hire them using a crypto wallet. It features real on-chain payment verification, secure isolated sandboxes, and a modern web interface.

---

## ⚖️ License & Terms of Use

**IMPORTANT:** By cloning, downloading, or using this repository, you agree to the terms specified in the [LICENSE](./LICENSE) file.

- **Strictly for Personal and Educational Use:** This project is intended for research and learning.
- **Commercial Use Prohibited:** Any commercial use of this code, its architecture, or its ideas without written acceptance from the author/owner is **strictly prohibited**.
- **Legal Consequences:** Violations of these terms may result in legal action.

---

## 🚀 System Architecture

Shoujiki is built with a security-first, multi-service architecture:

- **Backend (FastAPI)**: Orchestrates registry, auth, and **bulletproof Solana instruction parsing**.
- **Frontend (Next.js)**: Modern UI with **Phantom/Backpack** wallet integration and real-time transaction confirmation.
- **Sandbox (Docker)**: High-security isolated environment using **subprocess isolation**, **AST-level static analysis**, and **network-level lockdowns**.
- **SDK & CLI**: Easy-to-use Python toolkit for developers to package and deploy agents.
- **Database (PostgreSQL)**: Robust persistence for agents, tasks, and anti-replay payment protection.

---

## 🚀 Quick Deploy to Render

You can deploy the entire Shoujiki stack (Web, API, Sandbox, and Postgres) to Render using the included Blueprint:

1. **Connect your GitHub repository** to Render.
2. Render will automatically detect the `render.yaml` file and prompt you to create the "Shoujiki" Blueprint.
3. Click **Apply** to provision:
   - A **Web Service** running the mono-container (Next.js + FastAPI).
   - A **Managed PostgreSQL** database.
4. **Environment Variables**: Render will automatically generate a `SECRET_KEY` and `PLATFORM_SECRET_SEED`. You should only need to update `SOLANA_RPC_URL` if you are using a custom RPC.

---

## 🛠️ Setup & Run

### 1. Prerequisites
- Docker & Docker Compose
- A Solana Wallet (Phantom/Backpack) set to **Devnet**

### 2. Launch the System
```bash
docker-compose up --build
```
- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:8000/docs`

---

## 🧑‍💻 Developer Flow (Deploying an Agent)

1. **Install SDK Dependencies**:
   ```bash
   pip install requests
   ```
2. **Set your Auth Token**:
   Log in via the frontend, copy your JWT, and set it:
   ```bash
   export SHOUJIKI_TOKEN="your_jwt_here"
   ```
3. **Deploy the Sample Agent**:
   ```bash
   python sdk/cli.py deploy test_agent.py --id my-agent --name "Hello Agent" --price 0.01
   ```
   *Note: The system will automatically validate your code structure via AST before accepting it.*

---

## 🛒 User Flow (Executing an Agent)

1. **Connect Wallet**: Use the "Select Wallet" button in the UI.
2. **Login to API**: Click "Login to API" to sign a message and authenticate securely via Base58.
3. **Configure & Run**: Select an agent, provide JSON input (e.g., `{"text": "Solana"}`).
4. **Pay & Run**: Sign the Devnet transaction. The frontend will wait for on-chain confirmation.
5. **Verification**: The backend parses the **SystemProgram instruction** to verify sender, receiver, and exact amount.
6. **Isolated Result**: View the output generated from the secure, resource-limited sandbox.

---

## 🛡️ Security Hardening (Zero-Trust)

- **AST-Level Static Analysis**: Prevents `__import__('os')` and other dynamic exploits.
- **Network Isolation**: The sandbox has zero access to the DB or external internet.
- **Anti-Replay Protection**: Database-level tracking of transaction signatures prevents reuse.
- **Instruction Parsing**: Real-time validation of on-chain bytecode instructions for payments.

---

## ⚠️ Current Limitations / Future Work

- **Database Migrations**: Uses `create_all` for MVP simplicity; production requires Alembic.
- **On-chain Escrow**: Payments currently use direct transfers; future versions will implement a dedicated Solana Program for trustless holding.
- **Advanced AST**: Current validation blocks common dangerous imports; future versions could include deeper behavior analysis.

---
**Copyright © 2026. All Rights Reserved.**
