# Diagrama de clases — DAO Governance & Timelock

Vista estructural de contratos, herencia OpenZeppelin y relaciones de composición/uso.

## Diagrama (Mermaid)

```mermaid
classDiagram
    direction TB

    class IERC20Votes {
        <<interface>>
        +getVotes(account) uint256
        +getPastVotes(account, timepoint) uint256
        +delegates(account) address
        +delegate(delegatee)
    }

    class ERC20 {
        <<OZ>>
        +name() string
        +symbol() string
        +totalSupply() uint256
        +balanceOf(account) uint256
        +transfer(to, amount) bool
        +approve(spender, amount) bool
        +transferFrom(from, to, amount) bool
    }

    class ERC20Permit {
        <<OZ>>
        +permit(owner, spender, value, deadline, v, r, s)
        +nonces(owner) uint256
        +DOMAIN_SEPARATOR() bytes32
    }

    class ERC20Votes {
        <<OZ>>
        +delegate(delegatee)
        +delegateBySig(...)
        +getVotes(account) uint256
        +getPastVotes(account, timepoint) uint256
        +getPastTotalSupply(timepoint) uint256
        #_update(from, to, value)
        #_getVotingUnits(account) uint256
    }

    class GovernanceToken {
        <<contract>>
        -address minter
        +constructor(name, symbol)
        +mint(to, amount)
    }

    class IGovernor {
        <<interface>>
        +propose(targets, values, calldatas, description) uint256
        +castVote(proposalId, support) uint256
        +state(proposalId) ProposalState
        +queue(targets, values, calldatas, descriptionHash) uint256
        +execute(targets, values, calldatas, descriptionHash) uint256
    }

    class Governor {
        <<OZ>>
        +name() string
        +votingDelay() uint256
        +votingPeriod() uint256
        +quorum(timepoint) uint256
        +proposalThreshold() uint256
        +propose(...) uint256
        +castVote(...) uint256
        +state(proposalId) ProposalState
    }

    class GovernorVotes {
        <<OZ>>
        -IVotes token
        +token() IVotes
        #_getVotes(account, timepoint, params) uint256
    }

    class GovernorVotesQuorumFraction {
        <<OZ>>
        +quorumNumerator() uint256
        +quorumDenominator() uint256
        +quorum(timepoint) uint256
    }

    class GovernorCountingSimple {
        <<OZ>>
        +COUNTING_MODE() string
        +hasVoted(proposalId, account) bool
        #_countVote(proposalId, account, support, weight, params)
        #_quorumReached(proposalId) bool
        #_voteSucceeded(proposalId) bool
    }

    class GovernorTimelockControl {
        <<OZ>>
        -TimelockController _timelock
        +timelock() address
        +queue(...) uint256
        +execute(...) uint256
        #_queueOperations(...)
        #_executeOperations(...)
    }

    class MyGovernor {
        <<contract>>
        +constructor(token, timelock)
        +votingDelay() uint256
        +votingPeriod() uint256
        +proposalThreshold() uint256
        +quorum(timepoint) uint256
    }

    class TimelockController {
        <<OZ / custom>>
        +uint256 MIN_DELAY
        +hashOperation(target, value, data, predecessor, salt) bytes32
        +schedule(target, value, data, predecessor, salt, delay)
        +execute(target, value, data, predecessor, salt)
        +getMinDelay() uint256
        +isOperationReady(id) bool
        +isOperationDone(id) bool
    }

    class Box {
        <<target ejemplo>>
        -uint256 value
        +store(newValue)
        +retrieve() uint256
    }

    class ProposalCore {
        <<struct>>
        uint64 voteStart
        uint64 voteEnd
        bool executed
        bool canceled
    }

    class ProposalState {
        <<enum>>
        Pending
        Active
        Canceled
        Defeated
        Succeeded
        Queued
        Expired
        Executed
    }

    ERC20 <|-- ERC20Permit
    ERC20Permit <|-- ERC20Votes
    ERC20Votes <|-- GovernanceToken
    IERC20Votes <|.. ERC20Votes

    Governor <|-- GovernorVotes
    GovernorVotes <|-- GovernorVotesQuorumFraction
    Governor <|-- GovernorCountingSimple
    Governor <|-- GovernorTimelockControl
    GovernorVotesQuorumFraction <|-- MyGovernor
    GovernorCountingSimple <|-- MyGovernor
    GovernorTimelockControl <|-- MyGovernor
    IGovernor <|.. MyGovernor

    MyGovernor o-- GovernanceToken : lee votos
    MyGovernor o-- TimelockController : queue / execute
    TimelockController ..> Box : .call ejecuta
    MyGovernor ..> ProposalState : state()
    MyGovernor ..> ProposalCore : almacena
```

## Relaciones clave

| Desde | Hacia | Tipo | Motivo |
|-------|-------|------|--------|
| `MyGovernor` | `GovernanceToken` | Asociación | `getPastVotes` en el snapshot de la propuesta |
| `MyGovernor` | `TimelockController` | Asociación | Solo propuestas exitosas se encolan/ejecutan con delay |
| `TimelockController` | Targets (`Box`, etc.) | Dependencia | Ejecución arbitraria segura vía low-level `.call` |
| `GovernanceToken` | Checkpoints internos | Composición (OZ) | Historial de poder de voto por bloque/timepoint |

## Notas de diseño

1. **Herencia OZ v5**: reutilizar módulos auditados; no reinventar counting/quorum/timelock control.
2. **Roles Timelock**: `PROPOSER_ROLE` → Governor; `EXECUTOR_ROLE` → `address(0)` o roles acotados; renunciar `DEFAULT_ADMIN_ROLE` tras setup.
3. **Separación de concerns**: el token no conoce propuestas; el Governor no ejecuta lógica de negocio; el Timelock es el único caller privilegiado hacia targets.
