# Planning — Module 10: On-Chain DAO Governance & Timelock

> 🌐 **English** · [Español](./planificacion-ES.md)

## 1. Goal

Build a production-grade on-chain DAO governance system with:

- ERC-20 voting power with historical checkpoints and delegation (`ERC20Votes`).
- Full proposal lifecycle.
- Timelock with a minimum delay (`MIN_DELAY`) before executing arbitrary actions.
- Stack: **Foundry + Solidity `0.8.24`** (fixed pragma, no floating).

---

## 2. Scope

| Included | Excluded (v1 contracts) / v2 UI |
|----------|---------------------------------|
| Token, Governor, Timelock, Box, tests, SWC, deploy | Multichain / bridge / proxy |
| **Phase 6:** Next.js frontend (theme + profiles) | Indexer / subgraph |

---

## 3. Stack and technical constraints

### Suite (`evm-smart-contracts-suite`)

- **Exact** Solidity `0.8.24`.
- OpenZeppelin Contracts v5.x (audited inheritance).
- Foundry: unit + fuzz (`bound`) + time travel (`vm.warp` / `vm.roll`).
- Custom errors (no `require` with strings).
- CEI / `ReentrancyGuard` wherever there are external calls.
- ETH only via `.call{value: ...}("")`.
- NatSpec on every public/external API.
- Layout: Interfaces → Libraries → Contracts → State → Events → Errors → Modifiers → Functions.

### Module 10

- Checkpoints to prevent double voting / flash-loan voting.
- States: `Pending` → `Active` → `Defeated` | `Succeeded` → `Queued` → `Executed` | `Expired`.
- `proposalThreshold` required to create a proposal.
- Timelock: `MIN_DELAY` before executing; if the `.call` fails → `ExecutionFailed`.

---

## 4. Contract architecture

```
GovernanceToken (ERC20Votes)
        ↑ getVotes / getPastVotes
MyGovernor
        │ queue / execute
        ↓
TimelockController (MIN_DELAY)
        │ .call(target, value, data)
        ↓
Target contracts (Box, Treasury, etc.)
```

### Planned contracts

| Contract | Responsibility |
|----------|----------------|
| `GovernanceToken` | ERC-20 + votes + delegation + checkpoints |
| `MyGovernor` | Proposals, voting, quorum, threshold, states |
| `TimelockController` | Queue, wait for the delay, execute actions |
| `Box` (example) | Demo target (`store` / `retrieve`) for execution tests |

---

## 5. Governance parameters (suggested initial values)

| Parameter | Description | Suggested value (adjustable) |
|-----------|-------------|------------------------------|
| `votingDelay` | Blocks until the proposal becomes Active | 1 block |
| `votingPeriod` | Voting duration | ~1 day in test blocks |
| `proposalThreshold` | Minimum votes to propose | > 0 (anti-spam) |
| `quorum` | Minimum participation % or amount | Configurable / fuzzable |
| `MIN_DELAY` | Timelock delay | ≥ 1 day (tests with `vm.warp`) |

---

## 6. Custom errors (required by the module)

```solidity
error ProposalNotFound();
error VotingClosed();
error MinDelayNotMet();
error ProposalNotSucceeded();
error ExecutionFailed();
```

Extend as needed (threshold, quorum, already voted, etc.) while keeping custom errors.

---

## 7. Implementation plan (TDD)

Mandatory order per the Foundry/Solidity rules: **tests first**, then contracts.

### Phase 0 — Foundry setup

1. `forge init` / `foundry.toml` (fuzz runs ≥ 1000 across the suite).
2. Install OpenZeppelin v5.
3. Structure: `src/`, `test/`, `script/`.

### Phase 1 — Governance token

1. Tests: mint, transfer, `delegate`, `getVotes`, checkpoints after transfer.
2. Implement `GovernanceToken` (ERC20 + ERC20Permit + ERC20Votes).
3. Verify voting power does not move without `delegate`.

### Phase 2 — Timelock

1. Tests: queue, execute before delay → revert `MinDelayNotMet`, execute after warp → OK.
2. Implement / configure the Timelock with roles (proposer = Governor, executor = anyone or Governor).
3. Execution via `.call` handling `success` / revert bytes → `ExecutionFailed`.

### Phase 3 — Governor

1. Full lifecycle tests: Delegate → Propose → Vote → Queue → Warp → Execute.
2. Anti flash-loan tests: tokens bought/transferred **after** the proposal is created don't count for that proposal.
3. Tests: no threshold → revert; voting closed → `VotingClosed`; nonexistent proposal → `ProposalNotFound`.
4. Implement `MyGovernor` wired to token + timelock.

### Phase 4 — Fuzz & hardening

1. Fuzz thresholds, quorum and delays with `bound()`.
2. Cover failure branches with `vm.expectRevert`.
3. Review CEI, access control, NatSpec.

### Phase 6 — Frontend (Next.js) ✅ planned

1. App Router + **light / dark** theme (persistence + flash-free boot).
2. **Usage profiles:** Observer, Holder, Proposer, Operator (actions per profile).
3. Demo flows: delegate, propose, vote, queue/execute; Zod validation.
4. Vitest + Testing Library; strict typing; `error.tsx` / `not-found.tsx`.

---

## 8. Test matrix

| Case | What it validates |
|------|-------------------|
| Happy lifecycle | Delegate → Propose → Vote → Queue → Warp → Execute |
| Flash-loan / post-snapshot | Post-creation transfer doesn't change weight on the active proposal |
| Premature delay | Execute before `MIN_DELAY` fails |
| Threshold | Propose without enough votes fails |
| Quorum | No quorum → Defeated |
| Fuzz | Thresholds, quorum, delays |

---

## 9. Security (checklist)

- [x] CEI in functions with external calls.
- [x] Timelock mandatory for every successful execution.
- [x] Snapshots/checkpoints at the proposal snapshot block.
- [x] Custom errors in every domain revert.
- [x] Timelock roles: only the Governor proposes; admin renounced or 2-step.
- [x] No floating pragma; no ETH `transfer`/`send`.
- [x] SWC audit (`doc/SWC-AUDIT-EN.md`) aligned with module 08.
- [x] Threshold / quorum / delay fuzz + `test/attack/` suite.

---

## 10. Documentation deliverables (`doc/`)

| File | Content |
|------|---------|
| `planificacion-EN.md` | This document |
| `SWC-AUDIT-EN.md` | SWC-100–136 matrix + informational risks |
| `diagrama-de-clases-EN.md` | Structure and relationships between contracts |
| `diagrama-de-flujo-EN.md` | Proposal state machine |
| `flujograma-EN.md` | End-to-end actor-system flow |
| `decisiones-tecnicas-EN.md` | Technical decisions, logic and gas |

Each file has a Spanish version with the `-ES.md` suffix.

Frontend (Phase 6): see `frontend/README.md`.

---

## 11. Acceptance criteria

1. Compiles with `pragma solidity 0.8.24`.
2. Full governance cycle passes in Foundry.
3. Anti double-voting / flash-loan test green.
4. Premature execute fails with a delay error.
5. Fuzzing of critical parameters with no unexpected failures.
6. NatSpec + custom errors on public APIs.
