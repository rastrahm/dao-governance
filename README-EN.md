# 10 — On-Chain DAO Governance & Timelock

> 🌐 **English** · [Español](./README-ES.md) · [Index](./README.md)

On-chain DAO governance with ERC-20Votes (checkpoints + delegation), a proposal lifecycle and a Timelock with `MIN_DELAY`. Solidity `0.8.24` + Foundry.

**Status:** Phases **0–6** ✅ (contracts + SWC + deploy + frontend).

> **Frontend:** `frontend/` — light/dark theme + DAO profiles (local demo).

---

## Stack

| Layer | Technology |
|-------|------------|
| Contracts | Solidity `0.8.24` |
| Tooling | Foundry (`forge` / `cast` / `anvil`) |
| Libraries | OpenZeppelin Contracts v5.2, forge-std |
| Security | CEI, custom errors, Timelock delay, proposal threshold |

---

## Documentation

| Doc | Description |
|-----|-------------|
| [doc/planificacion-EN.md](./doc/planificacion-EN.md) | Plan, TDD phases and criteria |
| [doc/SWC-AUDIT-EN.md](./doc/SWC-AUDIT-EN.md) | SWC-100–136 audit |
| [doc/diagrama-de-clases-EN.md](./doc/diagrama-de-clases-EN.md) | Contract UML |
| [doc/diagrama-de-flujo-EN.md](./doc/diagrama-de-flujo-EN.md) | Proposal state machine |
| [doc/flujograma-EN.md](./doc/flujograma-EN.md) | End-to-end flow |
| [doc/decisiones-tecnicas-EN.md](./doc/decisiones-tecnicas-EN.md) | Technical decisions, logic and gas |

---

## Deploy (Anvil)

```shell
export PATH="$HOME/.foundry/bin:$PATH"
anvil   # another terminal

forge script script/Deploy.s.sol:Deploy --rpc-url http://127.0.0.1:8545 --broadcast
# Optional: MIN_DELAY=3600 MINT_AMOUNT=1000000000000000000000
```

After deploying: `delegate` → `propose` → `castVote` → `queue` → wait `MIN_DELAY` → `execute` (target `Box`).

---

## Frontend

```shell
cd frontend
npm install
npm run dev      # http://localhost:3000
npm test
```

**Live:** MetaMask → Anvil (chain 31337) + `.env.local` with the addresses from the Deploy.  
Light/dark theme + UI profiles. Guide: [`frontend/README.md`](./frontend/README.md).

---

## Setup

```shell
export PATH="$HOME/.foundry/bin:$PATH"

forge install foundry-rs/forge-std --no-git
forge install OpenZeppelin/openzeppelin-contracts@v5.2.0 --no-git

forge build
forge test
```

---

## Tests

```shell
forge test --match-contract GovernanceTokenTest
# 15 PASS (mint, transfer, delegate, checkpoints, fuzz)

forge test --match-contract TimelockControllerTest
# 14 PASS (schedule, MinDelayNotMet, execute, ExecutionFailed, fuzz)

forge test --match-contract MyGovernorTest
# 9 PASS (lifecycle, flash-loan snapshot, ProposalNotFound/VotingClosed/ProposalNotSucceeded)

forge test --match-path 'test/fuzz/*'
# 5 PASS × 1000 runs (threshold, quorum, delay, post-snapshot)

forge test --match-path 'test/attack/*'
# 3 PASS (reentrancy + unauthorized)
```

---

## Structure

```text
src/       # Contracts (GovernanceToken, MyGovernor, Timelock, Box)
test/      # Unit, fuzz and anti flash-loan
script/    # Deploy scripts
doc/       # Planning and diagrams (-ES / -EN)
lib/       # forge-std + OpenZeppelin (gitignored)
```

---

## Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Foundry + OZ v5 setup | ✅ |
| 1 | GovernanceToken (ERC20Votes) | ✅ |
| 2 | TimelockController | ✅ |
| 3 | MyGovernor + lifecycle | ✅ |
| 4 | Fuzz & hardening | ✅ |
| 5 | Scripts / demo deploy | ✅ |
| 6 | Next.js frontend (theme + profiles) | ✅ |
