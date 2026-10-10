# Flowchart — Full DAO governance cycle

> 🌐 **English** · [Español](./flujograma-ES.md)

End-to-end flow between actors and contracts: from delegation to execution on the target.

## Actors

| Actor | Role |
|-------|------|
| Token Holder | Holds `GovernanceToken`; must delegate to vote |
| Proposer | Holder with votes ≥ `proposalThreshold` |
| Voter | Holder (or delegate) voting For / Against / Abstain |
| Anyone / Executor | Whoever calls `queue` / `execute` once conditions are met |
| Timelock | Contract enforcing `MIN_DELAY` and executing `.call` |
| Target | Governed contract (e.g. `Box`) |

---

## Main flowchart (Mermaid)

```mermaid
flowchart TD
    Start([Start]) --> Mint[Distribute / mint tokens]
    Mint --> Del{Votes delegated?}
    Del -->|No| DelAct[delegate to self or another]
    Del -->|Yes| Ready[Voting power active]
    DelAct --> Ready

    Ready --> PropIntent[Proposer creates proposal]
    PropIntent --> Thr{getVotes ≥ proposalThreshold?}
    Thr -->|No| RejThr[Revert: insufficient threshold]
    Thr -->|Yes| Create[propose → Pending\nVote snapshot fixed]

    Create --> WaitDelay[Wait votingDelay]
    WaitDelay --> Active[State: Active]

    Active --> VoteLoop[Voters: castVote]
    VoteLoop --> Closed{votingPeriod over?}
    Closed -->|No| VoteLoop
    Closed -->|Yes| Outcome{Quorum + more votes for?}

    Outcome -->|No| Defeated[Defeated — end]
    Outcome -->|Yes| Succeeded[Succeeded]

    Succeeded --> Queue[queue → Timelock.schedule]
    Queue --> Queued[Queued — eta = now + MIN_DELAY]
    Queued --> ExitNote[Exit window for holders]
    ExitNote --> WaitTL{block.timestamp ≥ eta?}

    WaitTL -->|No| Early[premature execute]
    Early --> ErrDelay[Revert: MinDelayNotMet]
    ErrDelay --> WaitTL

    WaitTL -->|Yes| Exec[execute → Timelock .call]
    Exec --> CallOK{success == true?}
    CallOK -->|No| ErrExec[Revert: ExecutionFailed]
    CallOK -->|Yes| Done[Executed — target updated]

    Done --> End([End])
    Defeated --> End
    RejThr --> End
```

---

## Anti flash-loan / double-voting flowchart

```mermaid
flowchart TD
    A[Proposal created at block S] --> B[Snapshot = S or voteStart - 1]
    B --> C[Attacker buys tokens at block > S]
    C --> D[Attacker tries castVote]
    D --> E[Governor: getPastVotes attacker, snapshot]
    E --> F{Had votes at snapshot?}
    F -->|No / 0| G[Weight = 0 — outcome unchanged]
    F -->|Yes, prior| H[Only the checkpointed balance counts]
    G --> I[Proposal protected]
    H --> I
```

---

## Timelock execution flowchart (detail)

```mermaid
flowchart TD
    Q[queue Succeeded proposal] --> H[Compute operationId / salt]
    H --> Sch[Timelock.schedule with delay ≥ MIN_DELAY]
    Sch --> W[Wait until eta]
    W --> X[execute]
    X --> CEI1[Checks: ready, not done, roles]
    CEI1 --> CEI2[Effects: mark operation done]
    CEI2 --> CEI3[Interactions: target.call value data]
    CEI3 --> R{success?}
    R -->|false| Bubble[Revert ExecutionFailed\nor bubble bytes]
    R -->|true| OK[State Executed]
```

---

## Simplified sequence (Delegate → Execute)

```mermaid
sequenceDiagram
    autonumber
    actor H as Holder / Proposer
    participant T as GovernanceToken
    participant G as MyGovernor
    participant TL as Timelock
    participant B as Box Target

    H->>T: delegate(H)
    T-->>H: voting power checkpointed

    H->>G: propose(targets, values, calldatas, desc)
    G->>T: getVotes(H) ≥ threshold
    G-->>H: proposalId (Pending → Active)

    H->>G: castVote(proposalId, For)
    G->>T: getPastVotes(H, snapshot)
    G-->>H: weight counted

    Note over G: votingPeriod ends → Succeeded

    H->>G: queue(...)
    G->>TL: schedule(..., MIN_DELAY)
    TL-->>G: Queued

    Note over TL: vm.warp / real time ≥ eta

    H->>G: execute(...)
    G->>TL: execute(...)
    TL->>B: .call(store/newValue)
    B-->>TL: success
    TL-->>G: done
    G-->>H: Executed
```

---

## Operational summary

1. **No `delegate`, no vote** — the ERC-20 balance alone is not enough.
2. **Snapshot at creation / vote start** — later transfers don't count for that proposal.
3. **Winning the vote ≠ immediate execution** — always Timelock + `MIN_DELAY`.
4. **Checked `.call`** — target failure ⇒ `ExecutionFailed`.
5. **Foundry tests** must walk this whole flowchart plus the error paths (`MinDelayNotMet`, `VotingClosed`, `ProposalNotFound`, `ProposalNotSucceeded`).
