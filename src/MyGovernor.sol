// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {Governor} from "@openzeppelin/contracts/governance/Governor.sol";
import {GovernorSettings} from "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import {GovernorCountingSimple} from "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import {GovernorVotes} from "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import {GovernorVotesQuorumFraction} from "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";

import {TimelockController} from "./TimelockController.sol";

/**
 * @title MyGovernor
 * @notice Governor ERC-20Votes con umbral, quorum y ejecución obligatoria vía Timelock.
 * @dev Cableado a nuestro `TimelockController` (no al de OZ) con errores del módulo.
 */
contract MyGovernor is Governor, GovernorSettings, GovernorCountingSimple, GovernorVotes, GovernorVotesQuorumFraction {
    TimelockController private _timelock;
    mapping(uint256 proposalId => bytes32) private _timelockIds;

    error ProposalNotFound();
    error VotingClosed();
    error ProposalNotSucceeded();

    event TimelockUpdated(address indexed oldTimelock, address indexed newTimelock);

    /**
     * @notice Despliega el Governor ligado a token y Timelock.
     * @param token_ Token de votos (`GovernanceToken` / IVotes).
     * @param timelock_ Timelock que ejecutará las acciones.
     * @param votingDelay_ Bloques hasta Active.
     * @param votingPeriod_ Duración de la votación en bloques.
     * @param proposalThreshold_ Votos mínimos para proponer.
     * @param quorumNumerator_ Numerador de quorum (denominador 100), ej. 4 = 4%.
     */
    constructor(
        IVotes token_,
        TimelockController timelock_,
        uint48 votingDelay_,
        uint32 votingPeriod_,
        uint256 proposalThreshold_,
        uint256 quorumNumerator_
    )
        Governor("MyGovernor")
        GovernorSettings(votingDelay_, votingPeriod_, proposalThreshold_)
        GovernorVotes(token_)
        GovernorVotesQuorumFraction(quorumNumerator_)
    {
        _updateTimelock(timelock_);
    }

    /**
     * @notice Dirección del Timelock.
     */
    function timelock() public view returns (address) {
        return address(_timelock);
    }

    /**
     * @inheritdoc Governor
     * @dev Mapea inexistente → `ProposalNotFound` y refleja estado del Timelock si está Queued.
     */
    function state(uint256 proposalId) public view override returns (ProposalState) {
        if (proposalSnapshot(proposalId) == 0) {
            revert ProposalNotFound();
        }

        ProposalState currentState = super.state(proposalId);
        if (currentState != ProposalState.Queued) {
            return currentState;
        }

        bytes32 queueId = _timelockIds[proposalId];
        if (_timelock.isOperationPending(queueId)) {
            return ProposalState.Queued;
        }
        if (_timelock.isOperationDone(queueId)) {
            return ProposalState.Executed;
        }
        return ProposalState.Canceled;
    }

    /**
     * @inheritdoc Governor
     */
    function proposalNeedsQueuing(uint256) public view virtual override returns (bool) {
        return true;
    }

    /**
     * @inheritdoc Governor
     * @dev Requiere propuesta Active; si no, `VotingClosed` / `ProposalNotFound`.
     */
    function castVote(uint256 proposalId, uint8 support) public override returns (uint256) {
        _requireActiveProposal(proposalId);
        return super.castVote(proposalId, support);
    }

    /**
     * @inheritdoc Governor
     */
    function castVoteWithReason(uint256 proposalId, uint8 support, string calldata reason)
        public
        override
        returns (uint256)
    {
        _requireActiveProposal(proposalId);
        return super.castVoteWithReason(proposalId, support, reason);
    }

    /**
     * @inheritdoc Governor
     */
    function castVoteWithReasonAndParams(
        uint256 proposalId,
        uint8 support,
        string calldata reason,
        bytes memory params
    ) public override returns (uint256) {
        _requireActiveProposal(proposalId);
        return super.castVoteWithReasonAndParams(proposalId, support, reason, params);
    }

    /**
     * @inheritdoc Governor
     */
    function castVoteBySig(uint256 proposalId, uint8 support, address voter, bytes memory signature)
        public
        override
        returns (uint256)
    {
        _requireActiveProposal(proposalId);
        return super.castVoteBySig(proposalId, support, voter, signature);
    }

    /**
     * @inheritdoc Governor
     */
    function castVoteWithReasonAndParamsBySig(
        uint256 proposalId,
        uint8 support,
        address voter,
        string calldata reason,
        bytes memory params,
        bytes memory signature
    ) public override returns (uint256) {
        _requireActiveProposal(proposalId);
        return super.castVoteWithReasonAndParamsBySig(proposalId, support, voter, reason, params, signature);
    }

    /**
     * @inheritdoc Governor
     * @dev Solo desde `Succeeded`; si no, `ProposalNotSucceeded` / `ProposalNotFound`.
     */
    function queue(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash)
        public
        override
        returns (uint256)
    {
        uint256 proposalId = hashProposal(targets, values, calldatas, descriptionHash);
        _requireSucceededProposal(proposalId);
        return super.queue(targets, values, calldatas, descriptionHash);
    }

    /**
     * @inheritdoc Governor
     * @dev Desde `Succeeded` o `Queued`. El Timelock impone `MinDelayNotMet` si es prematuro.
     */
    function execute(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash)
        public
        payable
        override
        returns (uint256)
    {
        uint256 proposalId = hashProposal(targets, values, calldatas, descriptionHash);
        if (proposalSnapshot(proposalId) == 0) {
            revert ProposalNotFound();
        }

        ProposalState current = state(proposalId);
        if (current != ProposalState.Succeeded && current != ProposalState.Queued) {
            revert ProposalNotSucceeded();
        }

        return super.execute(targets, values, calldatas, descriptionHash);
    }

    /**
     * @dev Agenda el batch en el Timelock con `MIN_DELAY`.
     */
    function _queueOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override returns (uint48) {
        uint256 delay = _timelock.getMinDelay();
        bytes32 salt = _timelockSalt(descriptionHash);
        bytes32 id = _timelock.hashOperationBatch(targets, values, calldatas, bytes32(0), salt);
        _timelockIds[proposalId] = id;
        _timelock.scheduleBatch(targets, values, calldatas, bytes32(0), salt, delay);
        return SafeCast.toUint48(block.timestamp + delay);
    }

    /**
     * @dev Ejecuta el batch ya encolado en el Timelock.
     */
    function _executeOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override {
        _timelock.executeBatch{value: msg.value}(targets, values, calldatas, bytes32(0), _timelockSalt(descriptionHash));
        delete _timelockIds[proposalId];
    }

    /**
     * @dev Cancela también la operación pendiente en el Timelock.
     */
    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override returns (uint256) {
        uint256 proposalId = super._cancel(targets, values, calldatas, descriptionHash);
        bytes32 timelockId = _timelockIds[proposalId];
        if (timelockId != bytes32(0)) {
            _timelock.cancel(timelockId);
            delete _timelockIds[proposalId];
        }
        return proposalId;
    }

    /**
     * @dev El ejecutor de gobernanza es el Timelock (owner de targets como `Box`).
     */
    function _executor() internal view override returns (address) {
        return address(_timelock);
    }

    function _requireActiveProposal(uint256 proposalId) private view {
        if (proposalSnapshot(proposalId) == 0) {
            revert ProposalNotFound();
        }
        if (state(proposalId) != ProposalState.Active) {
            revert VotingClosed();
        }
    }

    function _requireSucceededProposal(uint256 proposalId) private view {
        if (proposalSnapshot(proposalId) == 0) {
            revert ProposalNotFound();
        }
        if (state(proposalId) != ProposalState.Succeeded) {
            revert ProposalNotSucceeded();
        }
    }

    function _timelockSalt(bytes32 descriptionHash) private view returns (bytes32) {
        return bytes20(address(this)) ^ descriptionHash;
    }

    function _updateTimelock(TimelockController newTimelock) private {
        emit TimelockUpdated(address(_timelock), address(newTimelock));
        _timelock = newTimelock;
    }

    // ============ Overrides de resolución de herencia ============

    function votingDelay() public view override(Governor, GovernorSettings) returns (uint256) {
        return super.votingDelay();
    }

    function votingPeriod() public view override(Governor, GovernorSettings) returns (uint256) {
        return super.votingPeriod();
    }

    function proposalThreshold() public view override(Governor, GovernorSettings) returns (uint256) {
        return super.proposalThreshold();
    }
}
