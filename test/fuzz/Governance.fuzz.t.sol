// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {IGovernor} from "@openzeppelin/contracts/governance/IGovernor.sol";

import {GovernanceToken} from "../../src/GovernanceToken.sol";
import {TimelockController} from "../../src/TimelockController.sol";
import {MyGovernor} from "../../src/MyGovernor.sol";
import {Box} from "../../src/Box.sol";

/**
 * @title GovernanceFuzzTest
 * @notice Fase 4: fuzz de thresholds, quorum y delays con `bound()`.
 */
contract GovernanceFuzzTest is Test {
    uint48 internal constant VOTING_DELAY = 1;
    uint32 internal constant VOTING_PERIOD = 8;
    uint256 internal constant QUORUM_NUMERATOR = 4; // 4%

    GovernanceToken internal token;
    TimelockController internal timelock;
    MyGovernor internal governor;
    Box internal box;

    address internal admin = makeAddr("admin");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    function setUp() public {
        // Deployed per-test where params vary; shared stack for delay fuzz.
    }

    /**
     * @notice Execute solo tras `delay >= MIN_DELAY`; prematuro → `MinDelayNotMet`.
     */
    function testFuzz_Timelock_ExecuteOnlyAfterDelay(uint256 minDelay, uint256 scheduledDelay, uint256 earlySkew)
        public
    {
        minDelay = bound(minDelay, 1 hours, 30 days);
        scheduledDelay = bound(scheduledDelay, minDelay, 60 days);
        earlySkew = bound(earlySkew, 0, scheduledDelay - 1);

        TimelockController tl = _newTimelock(minDelay);
        Box b = new Box(address(tl));
        bytes memory data = abi.encodeCall(Box.store, (77));

        vm.prank(makeAddr("proposer"));
        tl.schedule(address(b), 0, data, bytes32(0), bytes32(uint256(1)), scheduledDelay);

        uint256 readyAt = block.timestamp + scheduledDelay;
        vm.warp(block.timestamp + earlySkew);
        vm.prank(makeAddr("executor"));
        vm.expectRevert(TimelockController.MinDelayNotMet.selector);
        tl.execute(address(b), 0, data, bytes32(0), bytes32(uint256(1)));

        vm.warp(readyAt);
        vm.prank(makeAddr("executor"));
        tl.execute(address(b), 0, data, bytes32(0), bytes32(uint256(1)));
        assertEq(b.retrieve(), 77);
    }

    function _newTimelock(uint256 minDelay) internal returns (TimelockController tl) {
        address[] memory proposers = new address[](1);
        proposers[0] = makeAddr("proposer");
        address[] memory executors = new address[](1);
        executors[0] = makeAddr("executor");
        tl = new TimelockController(minDelay, proposers, executors, admin);
    }

    /**
     * @notice Propose falla si votos del proposer < threshold (fuzz).
     */
    function testFuzz_Propose_RevertsBelowThreshold(uint256 threshold, uint256 proposerVotes) public {
        threshold = bound(threshold, 1 ether, 500 ether);
        proposerVotes = bound(proposerVotes, 0, threshold - 1);

        _deployStack(threshold);

        vm.prank(admin);
        token.mint(bob, proposerVotes);
        vm.prank(bob);
        token.delegate(bob);
        vm.roll(block.number + 1);

        (address[] memory targets, uint256[] memory values, bytes[] memory calldatas) = _boxProposal(1);

        vm.prank(bob);
        vm.expectRevert(
            abi.encodeWithSelector(
                IGovernor.GovernorInsufficientProposerVotes.selector, bob, proposerVotes, threshold
            )
        );
        governor.propose(targets, values, calldatas, "fuzz below threshold");
    }

    /**
     * @notice Propose OK si votos >= threshold; lifecycle hasta Succeeded con quorum.
     */
    function testFuzz_Propose_SucceedsAtOrAboveThreshold(uint256 threshold, uint256 extraVotes) public {
        threshold = bound(threshold, 1 ether, 200 ether);
        extraVotes = bound(extraVotes, 0, 800 ether);
        uint256 aliceVotes = threshold + extraVotes;

        _deployStack(threshold);

        vm.prank(admin);
        token.mint(alice, aliceVotes);
        vm.prank(alice);
        token.delegate(alice);
        vm.roll(block.number + 1);

        (address[] memory targets, uint256[] memory values, bytes[] memory calldatas) = _boxProposal(42);
        string memory desc = "fuzz above threshold";

        vm.prank(alice);
        uint256 proposalId = governor.propose(targets, values, calldatas, desc);

        vm.roll(governor.proposalSnapshot(proposalId) + 1);
        vm.prank(alice);
        governor.castVote(proposalId, 1);
        vm.roll(governor.proposalDeadline(proposalId) + 1);

        assertEq(uint8(governor.state(proposalId)), uint8(IGovernor.ProposalState.Succeeded));
    }

    /**
     * @notice Sin quorum (participación insuficiente) → Defeated.
     */
    function testFuzz_Quorum_NotReached_Defeated(uint256 totalSupply, uint256 voterShareBps) public {
        totalSupply = bound(totalSupply, 10_000 ether, 100_000 ether);
        // Votar con < 4% del supply → sin quorum (numerator 4 / 100).
        voterShareBps = bound(voterShareBps, 1, 399); // < 4.00%
        uint256 voterAmount = (totalSupply * voterShareBps) / 10_000;
        if (voterAmount == 0) voterAmount = 1;

        uint256 threshold = 1; // umbral mínimo para poder proponer
        _deployStack(threshold);

        vm.startPrank(admin);
        token.mint(alice, voterAmount);
        token.mint(bob, totalSupply - voterAmount);
        vm.stopPrank();

        vm.prank(alice);
        token.delegate(alice);
        // bob NO delega → su supply cuenta para quorum total pero no vota
        vm.roll(block.number + 1);

        (address[] memory targets, uint256[] memory values, bytes[] memory calldatas) = _boxProposal(9);
        vm.prank(alice);
        uint256 proposalId = governor.propose(targets, values, calldatas, "no quorum");

        vm.roll(governor.proposalSnapshot(proposalId) + 1);
        vm.prank(alice);
        governor.castVote(proposalId, 1);
        vm.roll(governor.proposalDeadline(proposalId) + 1);

        assertEq(uint8(governor.state(proposalId)), uint8(IGovernor.ProposalState.Defeated));
    }

    /**
     * @notice Tokens acuñados post-snapshot no aportan peso (anti flash-loan, fuzz amount).
     */
    function testFuzz_PostSnapshotMint_ZeroVoteWeight(uint256 flashAmount) public {
        flashAmount = bound(flashAmount, 1 ether, type(uint128).max);
        _deployStack(100 ether);

        vm.prank(admin);
        token.mint(alice, 1_000 ether);
        vm.prank(alice);
        token.delegate(alice);
        vm.roll(block.number + 1);

        (address[] memory targets, uint256[] memory values, bytes[] memory calldatas) = _boxProposal(1);
        vm.prank(alice);
        uint256 proposalId = governor.propose(targets, values, calldatas, "flash fuzz");
        uint256 snapshot = governor.proposalSnapshot(proposalId);

        vm.roll(snapshot + 1);

        address attacker = makeAddr("attacker");
        vm.prank(admin);
        token.mint(attacker, flashAmount);
        vm.prank(attacker);
        token.delegate(attacker);

        assertEq(governor.getVotes(attacker, snapshot), 0);
        vm.prank(attacker);
        assertEq(governor.castVote(proposalId, 1), 0);
    }

    function _deployStack(uint256 proposalThreshold_) internal {
        vm.startPrank(admin);
        token = new GovernanceToken("DAO", "DAO");

        address[] memory proposers = new address[](0);
        address[] memory executors = new address[](1);
        executors[0] = address(0);

        timelock = new TimelockController(1 days, proposers, executors, admin);
        governor = new MyGovernor(
            IVotes(address(token)), timelock, VOTING_DELAY, VOTING_PERIOD, proposalThreshold_, QUORUM_NUMERATOR
        );
        timelock.grantRole(timelock.PROPOSER_ROLE(), address(governor));
        timelock.grantRole(timelock.CANCELLER_ROLE(), address(governor));
        box = new Box(address(timelock));
        vm.stopPrank();
    }

    function _boxProposal(uint256 value)
        internal
        view
        returns (address[] memory targets, uint256[] memory values, bytes[] memory calldatas)
    {
        targets = new address[](1);
        targets[0] = address(box);
        values = new uint256[](1);
        values[0] = 0;
        calldatas = new bytes[](1);
        calldatas[0] = abi.encodeCall(Box.store, (value));
    }
}
