# Technical decisions, logic and gas — Module 10 DAO Governance

> 🌐 **English** · [Español](./decisiones-tecnicas-ES.md)

Reference document to understand **what was decided**, **why**, **how the system flows**, and **where gas can still be saved**.

Related: [`planificacion-EN.md`](./planificacion-EN.md), [`SWC-AUDIT-EN.md`](./SWC-AUDIT-EN.md), [`diagrama-de-flujo-EN.md`](./diagrama-de-flujo-EN.md).

---

## 1. Architecture in one sentence

A **voting token** (checkpoints + delegation) feeds a **Governor** that can only **schedule** actions; a custom **Timelock** waits `MIN_DELAY` and only then performs a `.call` to the **target** (e.g. `Box`).

```
Holder → delegate → getVotes
     ↓
MyGovernor: propose → vote → queue
     ↓
TimelockController: schedule → wait MIN_DELAY → execute (.call)
     ↓
Box (or any other contract owned by the Timelock)
```

---

## 2. Technical decisions

### 2.1 Stack and compiler

| Decision | Choice | Reason |
|----------|--------|--------|
| Pragma | Fixed `solidity 0.8.24` (no `^`) | Avoids floating pragma (SWC-103); aligns with the suite |
| Tooling | Foundry (`forge` / `anvil` / `cast`) | Tests with `vm.warp` / `vm.roll`, fuzzing, gas report |
| EVM | Cancun | Current monorepo profile |
| Optimizer | `optimizer = true`, `runs = 10_000` | Favors **runtime** (frequent votes / executes) over cheap deployment |
| IR | `via_ir = true` | Avoids `stack-too-deep` in `Deploy.s.sol`; bytecode through the IR pipeline |

### 2.2 Libraries vs custom code

| Piece | Decision | Reason |
|-------|----------|--------|
| `GovernanceToken` | OZ `ERC20` + `ERC20Permit` + `ERC20Votes` + `Ownable2Step` | Audited checkpoints and Permit; less home-grown surface |
| `MyGovernor` | OZ Governor + Settings + CountingSimple + Votes + QuorumFraction | Standard proposal lifecycle |
| **Timelock** | **Custom implementation** (not OZ's `TimelockController` nor `GovernorTimelockControl`) | Full control over errors (`MinDelayNotMet`, `ExecutionFailed`), explicit CEI, and module wiring |
| `Box` | Minimal Ownable | Demo target; only the Timelock is owner |

**Custom Timelock tradeoff:** more code to maintain and audit; in exchange, module-specific errors and attack tests aligned with the course design (not with OZ Timelock's exact API).

### 2.3 Voting power

| Decision | Reason |
|----------|--------|
| ERC20Votes + checkpoints | Weight is fixed at the proposal **snapshot**; tokens bought afterwards don't count |
| You must `delegate` (even to yourself) | Without delegation, `getVotes == 0` even with a balance — intentional OZ pattern |
| Single governance token | Not one token per vote; a single unit of power for the whole DAO |

### 2.4 Proposal lifecycle

| Decision | Reason |
|----------|--------|
| `proposalNeedsQueuing() → true` | Every successful proposal **must** go through the Timelock |
| `proposalThreshold` | Anti proposal spam |
| Fractional quorum (`quorumNumerator`, denominator 100) | Configurable / fuzzable minimum participation |
| `castVote*` overrides | Require `Active` state; otherwise → `VotingClosed` / `ProposalNotFound` |
| `queue` only from `Succeeded` | Avoids queuing junk |
| `execute` from `Succeeded` or `Queued` | The Timelock enforces the real delay |

States (Governor + Timelock view):

`Pending` → `Active` → `Defeated` | `Succeeded` → `Queued` → `Executed` | `Expired` / `Canceled`

### 2.5 Timelock and roles

| Decision | Reason |
|----------|--------|
| **Immutable** `MIN_DELAY` | Doesn't change after deployment; cheap reads |
| `PROPOSER` / `CANCELLER` = Governor (post-deploy) | Only what the DAO voted on gets scheduled / canceled via the Governor |
| `EXECUTOR` = `address(0)` (open) | Anyone can execute a **ready** operation (no execution privilege) |
| EOA admin renounces after setup | The Timelock administers itself (`DEFAULT_ADMIN_ROLE` held by the contract) |
| Execution via `.call` + `success` check | Arbitrary actions; on failure → bubble / `ExecutionFailed` |
| CEI + `nonReentrant` on `execute` / `executeBatch` | Mitigates reentrancy (SWC-107); suite in `test/attack/` |

### 2.6 Security and quality

| Decision | Reason |
|----------|--------|
| Custom errors (no `require` strings) | Gas + clarity; monorepo rule |
| Fuzz ≥ 1000 runs | `foundry.toml` + `test/fuzz/` |
| SWC-100–136 matrix | `doc/SWC-AUDIT-EN.md` — **0 vulnerable**, 4 informational |
| Separate Next.js frontend | Live demo (Anvil wallet); UI profiles ≠ on-chain permissions |

### 2.7 Deploy (Anvil / demo)

Order in `script/Deploy.s.sol`:

1. Token  
2. Timelock (admin = temporary deployer, open executors)  
3. Governor  
4. Grant `PROPOSER` + `CANCELLER` to the Governor  
5. Renounce the deployer's `DEFAULT_ADMIN_ROLE` on the Timelock  
6. Box with owner = Timelock  
7. Initial mint to the deployer  

Typical local defaults: `MIN_DELAY=60`, `VOTING_PERIOD=10` (so the demo doesn't take days).

---

## 3. System logic

### 3.1 Happy path (end-to-end)

1. **Mint / hold** tokens (token owner; in the demo, the deployer).  
2. **Delegate** (`delegate(self)` or to someone else) → votes appear at the next checkpoint.  
3. **Propose** (if `getVotes(proposer) ≥ proposalThreshold`): targets + values + calldatas + description.  
   - The **snapshot** is fixed (`voteStart` after `votingDelay`).  
4. **Wait** `votingDelay` blocks → `Active` state.  
5. **Vote** For / Against / Abstain with the snapshot weight.  
6. After `votingPeriod`: if quorum + more votes for → `Succeeded`; otherwise → `Defeated`.  
7. **Queue**: the Governor schedules the batch in the Timelock with delay ≥ `MIN_DELAY` → `Queued`.  
8. **Wait** until `eta` (`block.timestamp`).  
9. **Execute**: the Timelock marks it done (CEI) and `.call`s each target (e.g. `Box.store`) → `Executed`.

### 3.2 Why the snapshot matters

When the proposal is created, the Governor uses the **historical** voting power at a specific block. If someone takes a flash loan **after** that snapshot, those tokens do **not** increase their vote on that proposal. That's the module's "anti flash-loan voting" defense.

### 3.3 Why the Timelock matters

Even if a malicious proposal wins, nobody can execute it instantly: there's a window (`MIN_DELAY`) to exit / raise alarms / cancel (if a role allows it). Time is measured with `block.timestamp` (fine for long delays; SWC-116 informational).

### 3.4 Who can do what (on-chain)

| Action | Who |
|--------|-----|
| `mint` | Token owner (ideally the Timelock via a future proposal) |
| `delegate` / `transfer` | Holders |
| `propose` / `castVote` | Anyone with power / meeting the threshold |
| `queue` | Anyone after `Succeeded` (via the Governor, which schedules on the Timelock as proposer) |
| Direct `schedule` on the Timelock | Only `PROPOSER_ROLE` (Governor) |
| Timelock `execute` | Whoever holds `EXECUTOR` (in the demo: anyone) |
| `Box.store` | Only owner = Timelock |

The **UI profiles** (Observer / Holder / …) only show or hide panels; they don't grant on-chain roles.

---

## 4. Gas: what's done and how to improve

### 4.1 Optimizations already applied

| Technique | Where | Effect |
|-----------|-------|--------|
| Immutable `MIN_DELAY` | Timelock | Avoids SLOAD (~2100) on delay reads |
| `constant` role IDs | Timelock | `keccak256` of strings at compile time |
| Custom errors | All of `src/` | Cheaper reverts than strings |
| `external` functions | Public APIs | Less calldata→memory copying vs unnecessary `public` |
| CEI + `nonReentrant` only on execute | Timelock | You don't pay for the guard on plain `schedule` |
| `abi.encode` in operation hashes | Timelock | Correctness (no collisions) with predictable cost |
| `optimizer_runs = 10_000` | foundry | Prioritizes repeated calls |
| `via_ir` | foundry | Compiles heavy scripts; IR may help codegen |

The **token and Governor** inherit heavily from OZ: there, the "base" gas is the library's (checkpoints, proposal storage, etc.), not a hand-written minimalist ERC-20.

### 4.2 Possible gas improvements (without changing the product)

Indicative priority: impact vs effort / risk.

#### High priority / good ROI

1. **Cache storage reads in hot paths**  
   In the Timelock, if a function reads `_timestamps[id]` several times, keep it in a local variable (already done in several `isOperation*`; review `execute` / `_beforeExecute` / `_after` to avoid repeated SLOADs).

2. **`calldata` instead of `memory` in Governor entrypoints**  
   Where OZ overrides allow it, prefer `calldata` for arrays/bytes in public `queue` / `execute` (less copying). Limitation: OZ signatures sometimes force `memory`.

3. **Cheaper events**  
   In `scheduleBatch`, emitting one event per index is expensive for long batches. Alternative: a single event with the batch hash + length (loses fine-grained indexing in explorers).

4. **`MAX_BATCH_SIZE` limit**  
   Doesn't save gas on small txs, but prevents OOG / griefing on huge batches (SWC-126/128 informational). Operational improvement + cost ceiling.

#### Medium priority

5. **Reduce `_timelockIds` mapping storage**  
   Today it's `proposalId → bytes32`. The id could be derived on the fly if the hash is deterministic from targets/values/calldatas/salt (as the Timelock already does). Tradeoff: more keccak CPU vs 1 SLOAD; measure with `forge test --gas-report`.

6. **Packed structs / fewer slots in custom state**  
   Little room: almost all the "heavy" state lives in OZ Governor/Votes.

7. **`unchecked` in `for (uint256 i; i < length; ++i)` loops**  
   Once `length` is fixed and bounded by `MAX_BATCH_SIZE`, `++i` can go into `unchecked` (small per-iteration saving).

8. **Custom errors vs OZ errors on override paths**  
   Module errors are already used at the edges (`VotingClosed`, etc.). Don't add new `require` strings.

#### Low priority / strong tradeoffs

9. **Lower `optimizer_runs`**  
   Cheaper deployment, more expensive runtime. Only if deployment is the bottleneck on a cheap L2 with low usage.

10. **Drop `via_ir` if no longer needed**  
    Faster compiles; measure bytecode size/gas before and after.

11. **OZ Timelock instead of the custom one**  
    Less custom code, but **not** a guaranteed gas improvement; it changes the surface and the errors.

12. **A more "minimal" Governor without so many OZ extensions**  
    Real bytecode/gas savings, at a high security and maintenance cost.

### 4.3 How to measure before "optimizing"

```bash
export PATH="$HOME/.foundry/bin:$PATH"
forge test --gas-report
forge snapshot   # or forge test --gas-report --match-contract MyGovernor
```

Compare hot functions: `castVote`, `propose`, `queue`, `execute`, `schedule`, `delegate`.

Rule of thumb: **don't** micro-optimize without a snapshot; in DAOs the cost of one bad security tx outweighs a thousand gas.

### 4.4 What isn't worth "saving"

- Removing checkpoints / snapshot → breaks anti flash-loan.  
- Removing the Timelock / `MIN_DELAY` → breaks the exit model.  
- Loose `encodePacked` in dynamic operation hashes → SWC-133 risk.  
- Removing `nonReentrant` on execute "because CEI is enough" → reentrancy regressions.

---

## 5. Quick file map

| Path | Role |
|------|------|
| `src/GovernanceToken.sol` | ERC20 + Permit + Votes |
| `src/MyGovernor.sol` | Proposals, votes, queue/execute → Timelock |
| `src/TimelockController.sol` | Delay + `.call` + roles |
| `src/Box.sol` | Demo target |
| `script/Deploy.s.sol` | Anvil wiring |
| `test/`, `test/fuzz/`, `test/attack/` | Lifecycle, fuzz, reentrancy/unauthorized |
| `frontend/` | Live UI (Spanish) |
| `portfolio/` | ES/EN portfolio explainer page |

---

## 6. Summary

- **Decisions:** OZ for token/Governor; custom Timelock; checkpoint-based votes; always-deferred execution; hard roles at deploy; custom errors + Foundry + SWC.  
- **Logic:** Delegate → Propose (snapshot) → Vote → Queue → Wait → Execute → on-chain effect.  
- **Gas:** Immutables, constants, errors and an aggressive optimizer are already in place; the real margin is fewer events per batch, fewer repeated SLOADs, calldata, a batch ceiling, and measuring with the gas report — without touching the security model.
