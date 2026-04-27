# DeFi Super-App

A full-stack decentralized protocol combining AMM, Lending, and ERC-4626 Yield Vault, powered by Chainlink oracles, governed by a DAO, indexed with The Graph, and deployed on L2.

# Features

* AMM (x·y = k) with 0.3% fee and LP tokens
* Lending system with LTV, health factor, liquidation
* ERC-4626 vault for yield generation
* DAO governance (Governor + Timelock)
* Chainlink price feeds with staleness check
* Subgraph indexing (GraphQL)
* L2 deployment (Arbitrum/Optimism/Base/zkSync)

# Tech Stack

* Solidity + Foundry
* React + Wagmi + Ethers.js
* The Graph
* GitHub Actions + Slither

#  Testing

* ≥ 80 tests (unit, fuzz, invariant, fork)
* ≥ 90% coverage
* All tests pass in CI

# Security

* Reentrancy protection
* Access control (OpenZeppelin)
* SafeERC20 usage
* Slither: 0 High / 0 Medium

# Governance

* Voting delay: 1 day
* Voting period: 1 week
* Quorum: 4%
* Timelock: 2 days

# Run Locally

git clone <repo>

forge install

forge test

cd frontend && npm install && npm run dev

# Deliverables

* Smart contracts
* Tests + coverage
* Frontend dApp
* Subgraph
* Deployment scripts
* Audit + Architecture docs
