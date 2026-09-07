// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {IGovernor} from "@openzeppelin/contracts/governance/IGovernor.sol";

import {GovernanceToken} from "../src/GovernanceToken.sol";
import {TimelockController} from "../src/TimelockController.sol";
import {MyGovernor} from "../src/MyGovernor.sol";
import {Box} from "../src/Box.sol";

/**
 * @title MyGovernorTest
 * @notice Lifecycle Delegate→Propose→Vote→Queue→Warp→Execute, anti flash-loan y errores del módulo.
 */
contract MyGovernorTest is Test {
    GovernanceToken internal token;
    TimelockController internal timelock;
    MyGovernor internal governor;
    Box internal box;

    address internal admin = makeAddr("admin");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal attacker = makeAddr("attacker");

    uint256 internal constant MIN_DELAY = 1 days;
    uint48 internal constant VOTING_DELAY = 1;
    uint32 internal constant VOTING_PERIOD = 5;
    uint256 internal constant PROPOSAL_THRESHOLD = 100 ether;
    uint256 internal constant QUORUM_NUMERATOR = 4; // 4%
    uint256 internal constant ALICE_SUPPLY = 900 ether;
    uint256 internal constant BOB_SUPPLY = 100 ether;

    address[] internal targets;
    uint256[] internal values;
    bytes[] internal calldatas;
    string internal description = "Store 42 in Box";

    function setUp() public {
        vm.startPrank(admin);
        token = new GovernanceToken("DAO Token", "DAO");

        address[] memory proposers = new address[](0);
        address[] memory executors = new address[](1);
        executors[0] = address(0); // execute abierto

        timelock = new TimelockController(MIN_DELAY, proposers, executors, admin);
        governor = new MyGovernor(
            IVotes(address(token)),
            timelock,
            VOTING_DELAY,
            VOTING_PERIOD,
            PROPOSAL_THRESHOLD,
            QUORUM_NUMERATOR
        );

        bytes32 proposerRole = timelock.PROPOSER_ROLE();
        bytes32 cancellerRole = timelock.CANCELLER_ROLE();
        timelock.grantRole(proposerRole, address(governor));
        timelock.grantRole(cancellerRole, address(governor));

        box = new Box(address(timelock));

        token.mint(alice, ALICE_SUPPLY);
        token.mint(bob, BOB_SUPPLY);
        vm.stopPrank();

        vm.prank(alice);
        token.delegate(alice);
        vm.prank(bob);
        token.delegate(bob);

        // Checkpoints efectivos en el siguiente bloque.
        vm.roll(block.number + 1);

        targets = new address[](1);
        targets[0] = address(box);
        values = new uint256[](1);
        values[0] = 0;
        calldatas = new bytes[](1);
        calldatas[0] = abi.encodeCall(Box.store, (42));
    }

    // ============ Lifecycle ============

    function test_Lifecycle_DelegateProposeVoteQueueWarpExecute() public {
        uint256 proposalId = _proposeAs(alice);
        assertEq(uint8(governor.state(proposalId)), uint8(IGovernor.ProposalState.Pending));

        vm.roll(block.number + VOTING_DELAY + 1);
        assertEq(uint8(governor.state(proposalId)), uint8(IGovernor.ProposalState.Active));

        vm.prank(alice);
        governor.castVote(proposalId, 1); // For

        vm.roll(block.number + VOTING_PERIOD + 1);
        assertEq(uint8(governor.state(proposalId)), uint8(IGovernor.ProposalState.Succeeded));

        vm.prank(alice);
        governor.queue(targets, values, calldatas, keccak256(bytes(description)));
        assertEq(uint8(governor.state(proposalId)), uint8(IGovernor.ProposalState.Queued));

        vm.prank(alice);
        vm.expectRevert(TimelockController.MinDelayNotMet.selector);
        governor.execute(targets, values, calldatas, keccak256(bytes(description)));

        vm.warp(block.timestamp + MIN_DELAY);
        vm.prank(bob);
        governor.execute(targets, values, calldatas, keccak256(bytes(description)));

        assertEq(box.retrieve(), 42);
        assertEq(uint8(governor.state(proposalId)), uint8(IGovernor.ProposalState.Executed));
    }

    // ============ Anti flash-loan ============

    function test_FlashLoan_TokensAfterProposeDoNotCount() public {
        uint256 proposalId = _proposeAs(alice);
        uint256 snapshot = governor.proposalSnapshot(proposalId);

        // La votación abre tras el snapshot; ahí el poder queda fijado.
        vm.roll(snapshot + 1);
        assertEq(uint8(governor.state(proposalId)), uint8(IGovernor.ProposalState.Active));

        // Attacker compra/delega DURANTE la propuesta activa (post-snapshot).
        vm.prank(admin);
        token.mint(attacker, 10_000 ether);
        vm.prank(attacker);
        token.delegate(attacker);

        uint256 weight = governor.getVotes(attacker, snapshot);
        assertEq(weight, 0);

        vm.prank(attacker);
        uint256 votedWeight = governor.castVote(proposalId, 1);
        assertEq(votedWeight, 0);

        // Alice vota Against → Defeated; el supply del attacker no altera el snapshot.
        vm.prank(alice);
        governor.castVote(proposalId, 0);

        vm.roll(block.number + VOTING_PERIOD + 1);
        assertEq(uint8(governor.state(proposalId)), uint8(IGovernor.ProposalState.Defeated));
    }

    // ============ Errores del módulo ============

    function test_Propose_RevertsBelowThreshold() public {
        // bob tiene 100 ether == threshold, ok; stranger con 0 falla
        address poor = makeAddr("poor");
        vm.prank(poor);
        vm.expectRevert(
            abi.encodeWithSelector(IGovernor.GovernorInsufficientProposerVotes.selector, poor, 0, PROPOSAL_THRESHOLD)
        );
        governor.propose(targets, values, calldatas, description);
    }

    function test_CastVote_RevertsProposalNotFound() public {
        vm.expectRevert(MyGovernor.ProposalNotFound.selector);
        governor.castVote(uint256(keccak256("missing")), 1);
    }

    function test_CastVote_RevertsVotingClosed() public {
        uint256 proposalId = _proposeAs(alice);

        // Aún Pending
        vm.prank(alice);
        vm.expectRevert(MyGovernor.VotingClosed.selector);
        governor.castVote(proposalId, 1);

        vm.roll(governor.proposalSnapshot(proposalId) + 1);
        vm.prank(alice);
        governor.castVote(proposalId, 1);

        vm.roll(governor.proposalDeadline(proposalId) + 1);
        vm.prank(bob);
        vm.expectRevert(MyGovernor.VotingClosed.selector);
        governor.castVote(proposalId, 1);
    }

    function test_Queue_RevertsProposalNotSucceeded() public {
        uint256 proposalId = _proposeAs(alice);
        vm.roll(governor.proposalSnapshot(proposalId) + 1);

        vm.expectRevert(MyGovernor.ProposalNotSucceeded.selector);
        governor.queue(targets, values, calldatas, keccak256(bytes(description)));
    }

    function test_Queue_RevertsProposalNotFound() public {
        vm.expectRevert(MyGovernor.ProposalNotFound.selector);
        governor.queue(targets, values, calldatas, keccak256(bytes("unknown")));
    }

    function test_Execute_RevertsProposalNotSucceededWhenActive() public {
        uint256 proposalId = _proposeAs(alice);
        vm.roll(governor.proposalSnapshot(proposalId) + 1);

        vm.expectRevert(MyGovernor.ProposalNotSucceeded.selector);
        governor.execute(targets, values, calldatas, keccak256(bytes(description)));
    }

    function test_State_RevertsProposalNotFound() public {
        vm.expectRevert(MyGovernor.ProposalNotFound.selector);
        governor.state(1);
    }

    // ============ Helpers ============

    function _proposeAs(address proposer) internal returns (uint256 proposalId) {
        vm.prank(proposer);
        proposalId = governor.propose(targets, values, calldatas, description);
    }
}
