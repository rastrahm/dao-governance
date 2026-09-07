// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {Votes} from "@openzeppelin/contracts/governance/utils/Votes.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {GovernanceToken} from "../src/GovernanceToken.sol";

/**
 * @title GovernanceTokenTest
 * @notice Tests del token de gobernanza: mint, transfer, delegación y checkpoints.
 */
contract GovernanceTokenTest is Test {
    GovernanceToken internal token;

    address internal owner = makeAddr("owner");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal charlie = makeAddr("charlie");

    uint256 internal constant MINT_AMOUNT = 1_000 ether;

    function setUp() public {
        vm.prank(owner);
        token = new GovernanceToken("DAO Token", "DAO");
    }

    // ============ Deploy ============

    function test_Deploy_SetsMetadataAndOwner() public view {
        assertEq(token.name(), "DAO Token");
        assertEq(token.symbol(), "DAO");
        assertEq(token.decimals(), 18);
        assertEq(token.totalSupply(), 0);
        assertEq(token.owner(), owner);
    }

    // ============ Mint ============

    function test_Mint_IncreasesBalanceAndSupply() public {
        vm.prank(owner);
        token.mint(alice, MINT_AMOUNT);

        assertEq(token.balanceOf(alice), MINT_AMOUNT);
        assertEq(token.totalSupply(), MINT_AMOUNT);
    }

    function test_Mint_RevertsWhenCallerNotOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        token.mint(alice, MINT_AMOUNT);
    }

    function test_Mint_RevertsWhenToZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(GovernanceToken.ZeroAddress.selector);
        token.mint(address(0), MINT_AMOUNT);
    }

    // ============ Transfer ============

    function test_Transfer_UpdatesBalances() public {
        vm.prank(owner);
        token.mint(alice, MINT_AMOUNT);

        vm.prank(alice);
        assertTrue(token.transfer(bob, 100 ether));

        assertEq(token.balanceOf(alice), MINT_AMOUNT - 100 ether);
        assertEq(token.balanceOf(bob), 100 ether);
    }

    // ============ Delegation / voting power ============

    function test_GetVotes_IsZeroWithoutDelegate() public {
        vm.prank(owner);
        token.mint(alice, MINT_AMOUNT);

        assertEq(token.balanceOf(alice), MINT_AMOUNT);
        assertEq(token.getVotes(alice), 0);
    }

    function test_Delegate_SelfActivatesVotingPower() public {
        vm.prank(owner);
        token.mint(alice, MINT_AMOUNT);

        vm.prank(alice);
        token.delegate(alice);

        assertEq(token.delegates(alice), alice);
        assertEq(token.getVotes(alice), MINT_AMOUNT);
    }

    function test_Delegate_ToOtherTransfersVotingPower() public {
        vm.prank(owner);
        token.mint(alice, MINT_AMOUNT);

        vm.prank(alice);
        token.delegate(bob);

        assertEq(token.delegates(alice), bob);
        assertEq(token.getVotes(alice), 0);
        assertEq(token.getVotes(bob), MINT_AMOUNT);
    }

    function test_Transfer_AfterSelfDelegate_MovesVotingPower() public {
        vm.prank(owner);
        token.mint(alice, MINT_AMOUNT);

        vm.prank(alice);
        token.delegate(alice);

        vm.prank(bob);
        token.delegate(bob);

        vm.prank(alice);
        token.transfer(bob, 250 ether);

        assertEq(token.getVotes(alice), MINT_AMOUNT - 250 ether);
        assertEq(token.getVotes(bob), 250 ether);
    }

    function test_Transfer_WithoutDelegate_DoesNotGrantVotesToRecipient() public {
        vm.prank(owner);
        token.mint(alice, MINT_AMOUNT);

        vm.prank(alice);
        token.transfer(bob, 400 ether);

        assertEq(token.balanceOf(bob), 400 ether);
        assertEq(token.getVotes(bob), 0);
        assertEq(token.getVotes(alice), 0);
    }

    // ============ Checkpoints / getPastVotes ============

    function test_GetPastVotes_ReflectsCheckpointAtPriorBlock() public {
        vm.prank(owner);
        token.mint(alice, MINT_AMOUNT);

        vm.prank(alice);
        token.delegate(alice);
        assertEq(token.getVotes(alice), MINT_AMOUNT);

        uint256 snapshotBlock = block.number;
        vm.roll(snapshotBlock + 1);

        vm.prank(alice);
        token.transfer(bob, 300 ether);

        // Tras el transfer, poder actual baja; el pasado en snapshotBlock se conserva.
        assertEq(token.getVotes(alice), MINT_AMOUNT - 300 ether);
        assertEq(token.getPastVotes(alice, snapshotBlock), MINT_AMOUNT);
    }

    function test_GetPastVotes_RevertsOnFutureLookup() public {
        vm.prank(owner);
        token.mint(alice, MINT_AMOUNT);

        vm.prank(alice);
        token.delegate(alice);

        vm.expectRevert(
            abi.encodeWithSelector(Votes.ERC5805FutureLookup.selector, block.number, uint48(block.number))
        );
        token.getPastVotes(alice, block.number);
    }

    function test_NumCheckpoints_IncreasesOnDelegateAndTransfer() public {
        vm.prank(owner);
        token.mint(alice, MINT_AMOUNT);

        assertEq(token.numCheckpoints(alice), 0);

        vm.prank(alice);
        token.delegate(alice);
        assertEq(token.numCheckpoints(alice), 1);

        vm.roll(block.number + 1);
        vm.prank(alice);
        token.transfer(bob, 50 ether);
        assertEq(token.numCheckpoints(alice), 2);
    }

    // ============ Fuzz ============

    function testFuzz_MintAndSelfDelegate_VotesEqualBalance(address account, uint256 amount) public {
        vm.assume(account != address(0));
        amount = bound(amount, 1, type(uint128).max);

        vm.prank(owner);
        token.mint(account, amount);

        vm.prank(account);
        token.delegate(account);

        assertEq(token.getVotes(account), amount);
        assertEq(token.balanceOf(account), amount);
    }

    function testFuzz_TransferWithoutDelegate_VotesRemainZero(uint256 amount) public {
        amount = bound(amount, 1, MINT_AMOUNT);

        vm.prank(owner);
        token.mint(alice, MINT_AMOUNT);

        vm.prank(alice);
        token.transfer(charlie, amount);

        assertEq(token.getVotes(alice), 0);
        assertEq(token.getVotes(charlie), 0);
        assertEq(token.balanceOf(charlie), amount);
    }
}
