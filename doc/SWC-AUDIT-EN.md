# SWC Audit — On-Chain DAO Governance & Timelock

> 🌐 **English** · [Español](./SWC-AUDIT-ES.md)

Verification of `GovernanceToken`, `MyGovernor`, `TimelockController` and `Box` against the [SWC Registry](https://swcregistry.io/) (EIP-1470) and the monorepo principles (custom errors, CEI, `ReentrancyGuard`, AccessControl, ERC20Votes checkpoints).

> **Note:** The SWC Registry has not been actively maintained since ~2020. Complement it with [SCSVS](https://github.com/ComposableSecurity/SCSVS) and [EEA EthTrust](https://entethalliance.org/specs/ethtrust/).

**Audited contracts:** `src/GovernanceToken.sol`, `src/MyGovernor.sol`, `src/TimelockController.sol`, `src/Box.sol`  
**Date:** 2026-09-07  
**Test references:** `test/GovernanceToken.t.sol`, `test/TimelockController.t.sol`, `test/MyGovernor.t.sol`, `test/fuzz/`, `test/attack/`  
**Style:** aligned with [`08-flash-loans/doc/SWC-AUDIT.md`](../../08-flash-loans/doc/SWC-AUDIT.md)

---

## Executive summary

| Status | Count |
|--------|-------|
| ✅ Mitigated / Not applicable | 32 |
| ⚠️ Informational (design / trust / time) | 4 |
| ❌ Vulnerable | 0 |

**Conclusion:** No exploitable SWC vulnerabilities in the v1 scope (voting token + Governor + Timelock + demo target). Informational risks: use of `block.timestamp` for `MIN_DELAY` (SWC-116), transaction-order dependence on the open `execute` (SWC-114), centralization of the token `owner` / Timelock admin until renounced, and the arbitrary `.call` surface bounded by roles + delay.

**Suite principles verified:**

| Principle | Status |
|-----------|--------|
| Custom errors (no `require` strings) | ✅ |
| Fixed pragma `0.8.24` | ✅ |
| CEI + `nonReentrant` on `execute` / `executeBatch` | ✅ + `test/attack/` |
| AccessControl (PROPOSER / EXECUTOR / CANCELLER) | ✅ + Unauthorized attack |
| ERC20Votes snapshots (anti flash-loan voting) | ✅ + MyGovernor + fuzz |
| Mandatory Timelock post-Succeeded | ✅ lifecycle |
| Fuzz ≥ 1000 runs | ✅ `foundry.toml` + `test/fuzz/` |

---

## Full matrix SWC-100 — SWC-136

| ID | Title | Applies | Status | Evidence in DAO Governance |
|----|-------|---------|--------|----------------------------|
| SWC-100 | Function Default Visibility | Yes | ✅ | Explicit visibility across `src/` |
| SWC-101 | Integer Overflow and Underflow | Yes | ✅ | Solidity `0.8.24`; OZ Votes/Governor SafeCast; fuzzed amounts/delays |
| SWC-102 | Outdated Compiler Version | Yes | ✅ | `pragma solidity 0.8.24` + `foundry.toml` `solc = "0.8.24"` |
| SWC-103 | Floating Pragma | Yes | ✅ | Exact pragma (no `^`) across `src/` / `test/` |
| SWC-104 | Unchecked Call Return Value | Yes | ✅ | Timelock checks the `.call` `success`; bubbles returndata or `ExecutionFailed` |
| SWC-105 | Unprotected Ether Withdrawal | Partial | ✅ | `receive` + payable `execute` only run scheduled ops; no free ETH withdrawal |
| SWC-106 | Unprotected SELFDESTRUCT | No | N/A | No `selfdestruct` |
| SWC-107 | Reentrancy | Yes | ✅ | `nonReentrant` + CEI (`_beforeExecute` marks done before the call); attack test |
| SWC-108 | State Variable Default Visibility | Yes | ✅ | Explicit `immutable` / `private` / `constant` |
| SWC-109 | Uninitialized Storage Pointer | No | N/A | No legacy storage pointers |
| SWC-110 | Assert Violation | No | N/A | No production `assert` |
| SWC-111 | Deprecated Solidity Functions | Yes | ✅ | No `suicide` / `throw` / `tx.origin` / ETH `transfer`/`send` |
| SWC-112 | Delegatecall to Untrusted Callee | No | N/A | No `delegatecall` (only `.call`) |
| SWC-113 | DoS with Failed Call | Yes | ✅ | Target revert → bubble / `ExecutionFailed`; op stays not-done if the tx reverts |
| SWC-114 | Transaction Order Dependence | Yes | ⚠️ | Whoever calls `execute` after eta can be ordered (MEV); see risks |
| SWC-115 | Authorization through tx.origin | No | N/A | Auth via `msg.sender` + roles / Ownable |
| SWC-116 | Block values as a proxy for time | Yes | ⚠️ | `MIN_DELAY` uses `block.timestamp`; acceptable for long delays |
| SWC-117 | Signature Malleability | Partial | ✅ | Permit/Votes via OZ ECDSA (anti-malleability); no custom raw `ecrecover` |
| SWC-118 | Incorrect Constructor Name | No | N/A | 0.8+ `constructor` |
| SWC-119 | Shadowing State Variables | Yes | ✅ | No state shadowing in `src/` |
| SWC-120 | Weak Sources of Randomness | No | N/A | No RNG |
| SWC-121 | Missing Protection against Signature Replay | Partial | ✅ | OZ nonces on Permit / `delegateBySig` / signed votes |
| SWC-122 | Lack of Proper Signature Verification | Partial | ✅ | OZ ECDSA + EIP-712 |
| SWC-123 | Requirement Violation | Yes | ✅ | Module custom errors + OZ Governor; unit/fuzz/attack |
| SWC-124 | Write to Arbitrary Storage Location | No | N/A | Assembly only for `revert(returndata)` |
| SWC-125 | Incorrect Inheritance Order | Yes | ✅ | Token: ERC20→Permit→Votes→Ownable2Step; Governor: Settings/Votes/Quorum/Counting |
| SWC-126 | Insufficient Gas Griefing | Partial | ⚠️ | Batch of arbitrary `.call`s: gas bounded by the executor's tx |
| SWC-127 | Arbitrary Jump with Function Type Variable | No | N/A | No dynamic function types |
| SWC-128 | DoS With Block Gas Limit | Partial | ⚠️ | `executeBatch` is O(n); huge batches may OOG (design / UI) |
| SWC-129 | Typographical Error | Yes | ✅ | Review + `forge build` / suite PASS |
| SWC-130 | Right-To-Left-Override | No | N/A | ASCII |
| SWC-131 | Presence of unused variables | Yes | ✅ | No material dead code in `src/` |
| SWC-132 | Unexpected Ether balance | Partial | ✅ | Timelock can receive ETH for ops with `value`; no logic depending on a "surprise" balance |
| SWC-133 | Hash Collisions (var-length args) | Yes | ✅ | `hashOperation` / `hashOperationBatch` with `abi.encode` (no loose `encodePacked` of dynamics) |
| SWC-134 | Message call with hardcoded gas | No | N/A | No `{gas: …}` |
| SWC-135 | Code With No Effects | No | N/A | No relevant no-ops |
| SWC-136 | Unencrypted Private Data On-Chain | Partial | ✅ | Proposals, votes and ops are public by DAO design |

---

## Informational risks

### SWC-116 — `block.timestamp` as the Timelock clock

`MIN_DELAY` is measured with `block.timestamp`. Validators can influence seconds, not whole days. **Acceptable** for governance buffers (hours/days). Don't use this pattern for "last-second" auctions.

### SWC-114 — `execute` ordering

With `EXECUTOR_ROLE` open (`address(0)`), anyone can execute a ready op. That's intentional (there's no execution privilege), but the **ordering between executors** may compete for MEV if the calldata has extractable value. Mitigation: exit delay + social review while queued.

### Centralization / post-deploy trust

| Topic | Risk | v1 treatment |
|-------|------|--------------|
| `GovernanceToken.owner` | Can mint without limit | `Ownable2Step`; renounce or transfer to the Timelock via proposal |
| Timelock `DEFAULT_ADMIN_ROLE` | Admin can change roles without a vote | Grant admin to the Timelock itself and renounce the EOA after setup |
| Extra `PROPOSER_ROLE` | Governor bypass | Only the Governor as proposer (tests + docs) |
| Arbitrary `.call` | Timelock can call any target | Bounded by what the DAO votes and queues |

### SWC-126 / SWC-128 — Large batches

`scheduleBatch` / `executeBatch` don't limit `targets.length`. A gigantic batch may run out of gas. Operational mitigation: proposals with few actions; future improvement: `MAX_BATCH_SIZE`.

---

## Monorepo principles checklist (+ module 10)

| Principle | Compliant? | Notes |
|-----------|------------|-------|
| Custom errors | ✅ | `MinDelayNotMet`, `ExecutionFailed`, `ProposalNotFound`, `VotingClosed`, `ProposalNotSucceeded`, … |
| ReentrancyGuard (OZ) | ✅ | `execute` / `executeBatch` |
| CEI | ✅ | `_beforeExecute` effects → interactions |
| AccessControl | ✅ | Timelock roles |
| ERC20Votes checkpoints | ✅ | Anti double-vote / flash-loan voting |
| NatSpec on public/external | ✅ | Token, Timelock, Governor, Box |
| Fuzz ≥ 1000 runs | ✅ | `test/fuzz/Governance.fuzz.t.sol` |
| Attack suite | ✅ | Reentrancy + unauthorized |
| No floating pragma | ✅ | `0.8.24` |
| No ETH `transfer`/`send` | ✅ | Only `.call{value}` |

---

## Verification findings (code)

### Confirmed mitigations

1. **Timelock `execute`:** role check → `_beforeExecute` (ready + mark done) → `.call` → `success` check / bubble.
2. **Governor:** `proposalNeedsQueuing = true`; queue/execute go through the Timelock; module domain errors in `castVote*` / `queue` / `execute` / `state`.
3. **Votes:** power read at `proposalSnapshot`; post-snapshot mint/transfer doesn't change weight (unit + fuzz).
4. **No** `require` strings / `tx.origin` / `delegatecall` / `selfdestruct` / floating pragma in `src/`.

### Phase 4 hardening

| # | Change | Reason |
|---|--------|--------|
| 1 | Override every `castVote*` in `MyGovernor` | Prevent `VotingClosed` bypass via `castVoteWithReason` / bySig |
| 2 | `test/fuzz/` suite | Threshold, quorum, delays, post-snapshot weight |
| 3 | `test/attack/` suite | SWC-107 reentrancy + unauthorized schedule/execute |

### Non-blocking observations (v2)

| # | Observation | Severity | Suggested action |
|---|-------------|----------|------------------|
| 1 | No `MAX_BATCH_SIZE` | Info | On-chain cap or off-chain policy |
| 2 | Timelock admin / token owner after deploy | Info | Renounce script in Phase 5 |
| 3 | `castVoteBySig` requires an Active proposal before verifying the sig | Info | UX: may spend gas on an invalid sig after the state check |
| 4 | Formal Foundry invariants | Improvement | propose/vote/queue handler (optional) |

---

## SWC → tests mapping

| SWC | Test(s) |
|-----|---------|
| SWC-101 | Fuzz amounts/delays/threshold; OZ SafeCast in Governor |
| SWC-103 | `forge build` with fixed pragma |
| SWC-104 | Timelock unit `ExecutionFailed` + custom error bubbling |
| SWC-107 | `test/attack/TimelockAttack.t.sol` (`reenterExecute`) |
| SWC-113 | Target revert / `ExecutionFailed` |
| SWC-114 | Documentary; open execute by design |
| SWC-116 | Documentary; delay fuzz with `vm.warp` |
| SWC-123 | Governor/Timelock/Token unit + fuzz + attack |
| Auth | `strangerCannotSchedule` / `strangerCannotExecute` |
| Flash-loan voting | `MyGovernor.test_FlashLoan_*` + `testFuzz_PostSnapshotMint_*` |
| Threshold / quorum / delay | `test/fuzz/Governance.fuzz.t.sol` |

---

## Execution result

```text
forge test --summary
GovernanceTokenTest             15 PASS
MyGovernorTest                   9 PASS
TimelockControllerTest          14 PASS
TimelockReentrancyAttackTest     1 PASS
TimelockUnauthorizedAttackTest   2 PASS
GovernanceFuzzTest               5 PASS
Total: 46 PASS / 0 FAIL / 0 SKIP
```

---

## References

- [SWC Registry](https://swcregistry.io/)
- [EIP-1470](https://eips.ethereum.org/EIPS/eip-1470)
- Module 08: [`08-flash-loans/doc/SWC-AUDIT.md`](../../08-flash-loans/doc/SWC-AUDIT.md)
- Plan: [`planificacion-EN.md`](./planificacion-EN.md)
