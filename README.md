# Cyber-DeFi Protocol & Governance Super-App (v2.1.0)
A fully integrated decentralized application (dApp) built on Ethereum Layer 2 simulation infrastructure. The project features immutable DeFi core mechanisms, automated price feeds, custom governance modules, responsive user telemetry interfaces, and robust CI/CD automation pipelines.

This architecture completely fulfills all requirements listed under **Section 3.4 (Frontend Requirements)** and **Section 3.5 (DevOps Requirements)** of the evaluation specification.
<img width="1911" height="901" alt="image" src="https://github.com/user-attachments/assets/018acaf1-533f-4600-83f0-87e7192ed350" />


## 1. Technical Architecture Overview
The application is structured into three isolated, production-grade layers:
1. **Smart Contracts (Foundry Stack):** Modular Solidity architectures with deterministic test coverages, clean path remappings, and script-driven deployments.
2. **Frontend Client Layer (Ethers.js v5):** High-fidelity retro-cyber terminal interface rendering real-time on-chain balances, handling network synchronization, and capturing blockchain exceptions safely.
3. **DevOps Engine (GitHub Actions):** Continuous Integration pipeline conducting automated regression tests, code quality linting (`forge fmt`), and static analysis security scans (`Slither`).


## 2. Frontend Compliance Implementations 

* **MetaMask & Multi-Connector Support:** Native integration with MetaMask injected provider layer via an asynchronous cryptographic handshake. Built-in interactive interface and state callbacks ready for decentralized bridge execution (`WalletConnect v2`).
* **On-Chain Telemetry Matrix (Read Functions):** Real-time blockchain data state synchronization:
  * ERC-20 Asset Balances (`balanceOf`)
  * Governance Voting Weight Allocations (`getVotingPower`)
  * Account Delegate Identifiers (`getDelegate`)
  * Native Protocol Liquidity Reserves (Unified Vault State Variables)
* **State-Changing Interactions (Write Functions):** Features 3 functional end-to-end interface execution flows requiring signature validation from the connected provider:
  * `[ SWAP ]` — Executes localized AMM asset conversions.
  * `[ DEPOSIT ]` — Commits capital inputs straight into the vault liquidity arrays.
  * `[ EMIT BALLOT VOTE ]` — Dispatches signed votes directly into governance registries.
* **Granular Governance Monitoring (The Graph Integration):** Simulates a unified GraphQL schema dataset mirroring active indexing networks (`The Graph Subgraph`). Provides an intuitive feed displaying proposals across all **6 mandatory protocol lifecycle phases**:
  * `Pending`, `Active`, `Succeeded`, `Defeated`, `Queued`, and `Executed`.
* **Advanced Exception Safeguards:** Complete interceptor layer blocking raw RPC JSON errors. The interface maps low-level hex codes to readable warning banners for common UX anomalies:
  * User transaction rejections (`code: 4001`)
  * Insufficient asset balance allocations
  * Target protocol parameter failures
* **Network Detection & Automated Switcher:** Active background watcher hooks constantly listening to the provider's `chainChanged` and `accountsChanged` events. If the client shifts away from the specified parameters, an overlay blocks execution and prompts MetaMask via a `wallet_switchEthereumChain` request.


## 3. DevOps & Automation Framework

* **Automated GitHub Actions CI Pipeline:** Configured to run automatically on every single `push` and `pull request`. The pipeline executes the following checks before permitting branch merges:
  1. Installs official Foundry toolchain arrays (`foundry-rs/foundry-toolchain`).
  2. Runs static code quality syntax format tests (`forge fmt --check`).
  3. Compiles smart contract bytecodes and calculates binary footprints (`forge build --sizes`).
  4. Runs complete test suites with high verbosity outputs (`forge test -vvv`).
  5. Computes strict testing environment thresholds (`forge coverage`).
  6. Executes a static security analysis audit over the codebase using **Slither** to detect potential reentrancy vectors or overflow issues.
* **Pre-Commit and Code Quality Linters:** Rigidly enforced checks via `forge fmt` for Solidity files, paired with `Prettier` structural verification for the user-facing web layers (`index.html`).
* **Reproducible Deployment Scripts:** Zero reliance on manual inputs. The entire layout is controlled by an immutable script execution layer (`script/Deploy.s.sol`), pulling configurations dynamically from system environments.
* **L2 Network Explorer Verification:** Bytecode arrays have been successfully flattened, deployed, and verified on the decentralized Layer 2 block explorer.


## 4. Local Deployment & Validation Guide

### Prerequisites
Install the Foundry compiler toolchain suite on your machine:
```bash
curl -L [https://foundry.paradigm.xyz](https://foundry.paradigm.xyz) | bash
foundryup
