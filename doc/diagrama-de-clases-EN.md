# Class diagram — DAO Governance & Timelock

> 🌐 **English** · [Español](./diagrama-de-clases-ES.md)

Structural view of the contracts, OpenZeppelin inheritance, and composition/usage relationships.

## Diagram (Mermaid)

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
        <<example target>>
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

    MyGovernor o-- GovernanceToken : reads votes
    MyGovernor o-- TimelockController : queue / execute
    TimelockController ..> Box : .call executes
    MyGovernor ..> ProposalState : state()
    MyGovernor ..> ProposalCore : stores
```

## Key relationships

| From | To | Type | Reason |
|------|----|------|--------|
| `MyGovernor` | `GovernanceToken` | Association | `getPastVotes` at the proposal snapshot |
| `MyGovernor` | `TimelockController` | Association | Only successful proposals are queued/executed with a delay |
| `TimelockController` | Targets (`Box`, etc.) | Dependency | Safe arbitrary execution via low-level `.call` |
| `GovernanceToken` | Internal checkpoints | Composition (OZ) | Voting power history per block/timepoint |

## Design notes

1. **OZ v5 inheritance**: reuse audited modules; don't reinvent counting/quorum/timelock control.
2. **Timelock roles**: `PROPOSER_ROLE` → Governor; `EXECUTOR_ROLE` → `address(0)` or scoped roles; renounce `DEFAULT_ADMIN_ROLE` after setup.
3. **Separation of concerns**: the token knows nothing about proposals; the Governor runs no business logic; the Timelock is the only privileged caller towards targets.
