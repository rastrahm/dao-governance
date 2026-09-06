# Diagrama de flujo — Máquina de estados de la propuesta

Transiciones oficiales del ciclo de vida de una propuesta DAO (módulo 10).

## Diagrama (Mermaid)

```mermaid
stateDiagram-v2
    [*] --> Pending: propose()\n(snapshot + proposalThreshold OK)

    Pending --> Active: block.number >= voteStart\n(votingDelay transcurrido)

    Active --> Succeeded: votingPeriod fin\n+ quorum alcanzado\n+ más votos a favor
    Active --> Defeated: votingPeriod fin\n+ sin quorum\nO más votos en contra

    Succeeded --> Queued: queue()\n(acciones enviadas al Timelock)

    Queued --> Executed: execute()\ntras MIN_DELAY\n+ .call exitoso
    Queued --> Expired: ventana de gracia\nsuperada sin execute

    Defeated --> [*]
    Executed --> [*]
    Expired --> [*]

    note right of Pending
        Poder de voto fijado
        en snapshot (checkpoints).
        Transfers posteriores
        NO alteran esta propuesta.
    end note

    note right of Queued
        Usuarios pueden salir
        (exit) durante MIN_DELAY
        si la propuesta es maliciosa.
    end note
```

## Tabla de transiciones

| Estado actual | Condición | Estado siguiente | Error si se viola |
|---------------|-----------|------------------|-------------------|
| — | `getVotes(proposer) >= proposalThreshold` | `Pending` | (custom: umbral / no autorizado) |
| `Pending` | `block >= voteStart` | `Active` | — (solo lectura de `state`) |
| `Active` | Periodo abierto | sigue `Active` | `VotingClosed` si se intenta fuera |
| `Active` | Fin + quorum + for > against | `Succeeded` | — |
| `Active` | Fin + fallo quorum/votos | `Defeated` | — |
| `Succeeded` | `queue(...)` | `Queued` | `ProposalNotSucceeded` |
| `Queued` | `now < eta` (delay) | sigue `Queued` | `MinDelayNotMet` al execute |
| `Queued` | delay OK + `.call` OK | `Executed` | `ExecutionFailed` |
| `Queued` | grace period vencido | `Expired` | — |
| cualquier | `proposalId` inválido | — | `ProposalNotFound` |

## Flujo de decisión de `state(proposalId)`

```mermaid
flowchart TD
    A[Consultar proposalId] --> B{¿Existe?}
    B -->|No| E1[ProposalNotFound]
    B -->|Sí| C{¿Executed?}
    C -->|Sí| S1[Executed]
    C -->|No| D{¿Canceled?}
    D -->|Sí| S2[Canceled]
    D -->|No| F{block < voteStart?}
    F -->|Sí| S3[Pending]
    F -->|No| G{block <= voteEnd?}
    G -->|Sí| S4[Active]
    G -->|No| H{¿Quorum y éxito?}
    H -->|No| S5[Defeated]
    H -->|Sí| I{¿En Timelock?}
    I -->|No| S6[Succeeded]
    I -->|Sí Ready| S7[Queued]
    I -->|Sí Done| S1
    I -->|Grace vencida| S8[Expired]
```

## Invariantes

1. Una propuesta **nunca** salta de `Active` a `Executed` sin pasar por `Succeeded` → `Queued`.
2. El peso de voto se lee con `getPastVotes(account, snapshot)` — no con balance actual.
3. Toda ejecución on-chain de acciones de propuesta pasa por Timelock + `MIN_DELAY`.
