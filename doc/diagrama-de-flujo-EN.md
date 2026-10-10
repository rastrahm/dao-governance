# Flow diagram — Proposal state machine

> 🌐 **English** · [Español](./diagrama-de-flujo-ES.md)

Official transitions in the lifecycle of a DAO proposal (module 10).

## Diagram (Mermaid)

```mermaid
stateDiagram-v2
    [*] --> Pending: propose()\n(snapshot + proposalThreshold OK)

    Pending --> Active: block.number >= voteStart\n(votingDelay elapsed)

    Active --> Succeeded: votingPeriod ends\n+ quorum reached\n+ more votes for
    Active --> Defeated: votingPeriod ends\n+ no quorum\nOR more votes against

    Succeeded --> Queued: queue()\n(actions sent to the Timelock)

    Queued --> Executed: execute()\nafter MIN_DELAY\n+ successful .call
    Queued --> Expired: grace window\nexceeded without execute

    Defeated --> [*]
    Executed --> [*]
    Expired --> [*]

    note right of Pending
        Voting power fixed
        at snapshot (checkpoints).
        Later transfers do NOT
        affect this proposal.
    end note

    note right of Queued
        Users can exit
        during MIN_DELAY
        if the proposal is malicious.
    end note
```

## Transition table

| Current state | Condition | Next state | Error if violated |
|---------------|-----------|------------|-------------------|
| — | `getVotes(proposer) >= proposalThreshold` | `Pending` | (custom: threshold / unauthorized) |
| `Pending` | `block >= voteStart` | `Active` | — (read-only `state`) |
| `Active` | Period open | stays `Active` | `VotingClosed` if attempted outside |
| `Active` | End + quorum + for > against | `Succeeded` | — |
| `Active` | End + quorum/vote failure | `Defeated` | — |
| `Succeeded` | `queue(...)` | `Queued` | `ProposalNotSucceeded` |
| `Queued` | `now < eta` (delay) | stays `Queued` | `MinDelayNotMet` on execute |
| `Queued` | delay OK + `.call` OK | `Executed` | `ExecutionFailed` |
| `Queued` | grace period expired | `Expired` | — |
| any | invalid `proposalId` | — | `ProposalNotFound` |

## `state(proposalId)` decision flow

```mermaid
flowchart TD
    A[Query proposalId] --> B{Exists?}
    B -->|No| E1[ProposalNotFound]
    B -->|Yes| C{Executed?}
    C -->|Yes| S1[Executed]
    C -->|No| D{Canceled?}
    D -->|Yes| S2[Canceled]
    D -->|No| F{block < voteStart?}
    F -->|Yes| S3[Pending]
    F -->|No| G{block <= voteEnd?}
    G -->|Yes| S4[Active]
    G -->|No| H{Quorum and success?}
    H -->|No| S5[Defeated]
    H -->|Yes| I{In Timelock?}
    I -->|No| S6[Succeeded]
    I -->|Yes Ready| S7[Queued]
    I -->|Yes Done| S1
    I -->|Grace expired| S8[Expired]
```

## Invariants

1. A proposal **never** jumps from `Active` to `Executed` without going through `Succeeded` → `Queued`.
2. Voting weight is read with `getPastVotes(account, snapshot)` — not the current balance.
3. Every on-chain execution of proposal actions goes through the Timelock + `MIN_DELAY`.
