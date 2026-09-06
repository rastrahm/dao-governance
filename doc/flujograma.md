# Flujograma — Ciclo completo de gobernanza DAO

Flujo extremo a extremo entre actores y contratos: desde la delegación hasta la ejecución en el target.

## Actores

| Actor | Rol |
|-------|-----|
| Token Holder | Posee `GovernanceToken`; debe delegar para votar |
| Proposer | Holder con votos ≥ `proposalThreshold` |
| Voter | Holder (o delegado) que vota For / Against / Abstain |
| Anyone / Executor | Quien llama `queue` / `execute` tras las condiciones |
| Timelock | Contrato que impone `MIN_DELAY` y ejecuta `.call` |
| Target | Contrato gobernado (ej. `Box`) |

---

## Flujograma principal (Mermaid)

```mermaid
flowchart TD
    Start([Inicio]) --> Mint[Distribuir / mint tokens]
    Mint --> Del{¿Delegó votos?}
    Del -->|No| DelAct[delegate a sí mismo o a otro]
    Del -->|Sí| Ready[Poder de voto activo]
    DelAct --> Ready

    Ready --> PropIntent[Proposer crea propuesta]
    PropIntent --> Thr{getVotes ≥ proposalThreshold?}
    Thr -->|No| RejThr[Revert: umbral insuficiente]
    Thr -->|Sí| Create[propose → Pending\nSnapshot de votos fijado]

    Create --> WaitDelay[Esperar votingDelay]
    WaitDelay --> Active[Estado: Active]

    Active --> VoteLoop[Voters: castVote]
    VoteLoop --> Closed{¿votingPeriod terminó?}
    Closed -->|No| VoteLoop
    Closed -->|Sí| Outcome{¿Quorum + más votos a favor?}

    Outcome -->|No| Defeated[Defeated — fin]
    Outcome -->|Sí| Succeeded[Succeeded]

    Succeeded --> Queue[queue → Timelock.schedule]
    Queue --> Queued[Queued — eta = now + MIN_DELAY]
    Queued --> ExitNote[Ventana de salida para holders]
    ExitNote --> WaitTL{¿block.timestamp ≥ eta?}

    WaitTL -->|No| Early[execute prematuro]
    Early --> ErrDelay[Revert: MinDelayNotMet]
    ErrDelay --> WaitTL

    WaitTL -->|Sí| Exec[execute → Timelock .call]
    Exec --> CallOK{¿success == true?}
    CallOK -->|No| ErrExec[Revert: ExecutionFailed]
    CallOK -->|Sí| Done[Executed — target actualizado]

    Done --> End([Fin])
    Defeated --> End
    RejThr --> End
```

---

## Flujograma anti flash-loan / double voting

```mermaid
flowchart TD
    A[Propuesta creada en bloque S] --> B[Snapshot = S o voteStart - 1]
    B --> C[Attacker compra tokens en bloque > S]
    C --> D[Attacker intenta castVote]
    D --> E[Governor: getPastVotes attacker, snapshot]
    E --> F{¿Tenía votos en snapshot?}
    F -->|No / 0| G[Peso = 0 — no altera resultado]
    F -->|Sí, previos| H[Solo cuenta el balance checkpointed]
    G --> I[Propuesta protegida]
    H --> I
```

---

## Flujograma de ejecución Timelock (detalle)

```mermaid
flowchart TD
    Q[queue propuesta Succeeded] --> H[Calcular operationId / salt]
    H --> Sch[Timelock.schedule con delay ≥ MIN_DELAY]
    Sch --> W[Esperar hasta eta]
    W --> X[execute]
    X --> CEI1[Checks: ready, no done, roles]
    CEI1 --> CEI2[Effects: marcar operación done]
    CEI2 --> CEI3[Interactions: target.call value data]
    CEI3 --> R{success?}
    R -->|false| Bubble[Revert ExecutionFailed\no bubbling bytes]
    R -->|true| OK[Estado Executed]
```

---

## Secuencia simplificada (Delegate → Execute)

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
    G-->>H: weight contabilizado

    Note over G: votingPeriod ends → Succeeded

    H->>G: queue(...)
    G->>TL: schedule(..., MIN_DELAY)
    TL-->>G: Queued

    Note over TL: vm.warp / tiempo real ≥ eta

    H->>G: execute(...)
    G->>TL: execute(...)
    TL->>B: .call(store/newValue)
    B-->>TL: success
    TL-->>G: done
    G-->>H: Executed
```

---

## Resumen operativo

1. **Sin `delegate`, no hay voto** — el balance ERC-20 solo no basta.
2. **Snapshot al crear / al inicio de voto** — transfers posteriores no cuentan para esa propuesta.
3. **Éxito de votación ≠ ejecución inmediata** — siempre Timelock + `MIN_DELAY`.
4. **`.call` verificado** — fallo de target ⇒ `ExecutionFailed`.
5. **Tests Foundry** deben recorrer este flujograma completo y los caminos de error (`MinDelayNotMet`, `VotingClosed`, `ProposalNotFound`, `ProposalNotSucceeded`).
