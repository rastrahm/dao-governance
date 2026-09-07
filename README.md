# 10 — On-Chain DAO Governance & Timelock

Gobernanza DAO on-chain con ERC-20Votes (checkpoints + delegación), ciclo de propuestas y Timelock con `MIN_DELAY`. Solidity `0.8.24` + Foundry.

**Estado:** Fases **0–5** ✅ (módulo completo: contratos + fuzz/SWC + deploy).

> **Frontend:** no incluido en v1. Si se agrega, carpeta `frontend/` + reglas Next.js del curso.

---

## Stack

| Capa | Tecnología |
|------|------------|
| Contratos | Solidity `0.8.24` |
| Tooling | Foundry (`forge` / `cast` / `anvil`) |
| Librerías | OpenZeppelin Contracts v5.2, forge-std |
| Seguridad | CEI, custom errors, Timelock delay, proposal threshold |

---

## Documentación

| Doc | Descripción |
|-----|-------------|
| [doc/planificacion.md](./doc/planificacion.md) | Plan, fases TDD y criterios |
| [doc/SWC-AUDIT.md](./doc/SWC-AUDIT.md) | Auditoría SWC-100–136 |
| [doc/diagrama-de-clases.md](./doc/diagrama-de-clases.md) | UML de contratos |
| [doc/diagrama-de-flujo.md](./doc/diagrama-de-flujo.md) | Máquina de estados de propuestas |
| [doc/flujograma.md](./doc/flujograma.md) | Flujo extremo a extremo |

---

## Deploy (Anvil)

```shell
export PATH="$HOME/.foundry/bin:$PATH"
anvil   # otra terminal

forge script script/Deploy.s.sol:Deploy --rpc-url http://127.0.0.1:8545 --broadcast
# Opcional: MIN_DELAY=3600 MINT_AMOUNT=1000000000000000000000
```

Tras el deploy: `delegate` → `propose` → `castVote` → `queue` → esperar `MIN_DELAY` → `execute` (target `Box`).

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

## Estructura

```text
src/       # Contratos (GovernanceToken, MyGovernor, Timelock, Box)
test/      # Unit, fuzz y anti flash-loan
script/    # Deploy scripts
doc/       # Planificación y diagramas
lib/       # forge-std + OpenZeppelin (gitignored)
```

---

## Fases

| Fase | Descripción | Estado |
|------|-------------|--------|
| 0 | Setup Foundry + OZ v5 | ✅ |
| 1 | GovernanceToken (ERC20Votes) | ✅ |
| 2 | TimelockController | ✅ |
| 3 | MyGovernor + lifecycle | ✅ |
| 4 | Fuzz & hardening | ✅ |
| 5 | Scripts / demo deploy | ✅ |
