# 10 — On-Chain DAO Governance & Timelock

Gobernanza DAO on-chain con ERC-20Votes (checkpoints + delegación), ciclo de propuestas y Timelock con `MIN_DELAY`. Solidity `0.8.24` + Foundry.

**Estado:** Fases **0–1** ✅ (setup + GovernanceToken).

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
| [doc/diagrama-de-clases.md](./doc/diagrama-de-clases.md) | UML de contratos |
| [doc/diagrama-de-flujo.md](./doc/diagrama-de-flujo.md) | Máquina de estados de propuestas |
| [doc/flujograma.md](./doc/flujograma.md) | Flujo extremo a extremo |

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
| 2 | TimelockController | ⏳ |
| 3 | MyGovernor + lifecycle | ⏳ |
| 4 | Fuzz & hardening | ⏳ |
| 5 | Scripts / demo | ⏳ |
