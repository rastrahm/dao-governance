// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";

import {TimelockController} from "../src/TimelockController.sol";
import {Box} from "../src/Box.sol";

/**
 * @title TimelockControllerTest
 * @notice Schedule → delay → execute; MinDelayNotMet y ExecutionFailed.
 */
contract TimelockControllerTest is Test {
    TimelockController internal timelock;
    Box internal box;

    address internal admin = makeAddr("admin");
    address internal proposer = makeAddr("proposer");
    address internal executor = makeAddr("executor");
    address internal stranger = makeAddr("stranger");

    uint256 internal constant MIN_DELAY = 1 days;
    bytes32 internal constant SALT = bytes32(uint256(1));
    bytes32 internal constant PREDECESSOR = bytes32(0);

    function setUp() public {
        address[] memory proposers = new address[](1);
        proposers[0] = proposer;
        address[] memory executors = new address[](1);
        executors[0] = executor;

        vm.prank(admin);
        timelock = new TimelockController(MIN_DELAY, proposers, executors, admin);

        box = new Box(address(timelock));
    }

    // ============ Deploy ============

    function test_Deploy_SetsMinDelayAndRoles() public view {
        assertEq(timelock.MIN_DELAY(), MIN_DELAY);
        assertEq(timelock.getMinDelay(), MIN_DELAY);
        assertTrue(timelock.hasRole(timelock.PROPOSER_ROLE(), proposer));
        assertTrue(timelock.hasRole(timelock.EXECUTOR_ROLE(), executor));
        assertTrue(timelock.hasRole(timelock.DEFAULT_ADMIN_ROLE(), admin));
        assertEq(box.owner(), address(timelock));
    }

    // ============ Schedule ============

    function test_Schedule_QueuesOperationWithEta() public {
        bytes memory data = abi.encodeCall(Box.store, (42));
        bytes32 id = timelock.hashOperation(address(box), 0, data, PREDECESSOR, SALT);

        vm.prank(proposer);
        timelock.schedule(address(box), 0, data, PREDECESSOR, SALT, MIN_DELAY);

        assertTrue(timelock.isOperationPending(id));
        assertFalse(timelock.isOperationReady(id));
        assertEq(timelock.getTimestamp(id), block.timestamp + MIN_DELAY);
    }

    function test_Schedule_RevertsWhenCallerNotProposer() public {
        bytes memory data = abi.encodeCall(Box.store, (1));
        bytes32 proposerRole = timelock.PROPOSER_ROLE();

        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, stranger, proposerRole)
        );
        vm.prank(stranger);
        timelock.schedule(address(box), 0, data, PREDECESSOR, SALT, MIN_DELAY);
    }

    function test_Schedule_RevertsWhenDelayBelowMin() public {
        bytes memory data = abi.encodeCall(Box.store, (1));

        vm.prank(proposer);
        vm.expectRevert(TimelockController.MinDelayNotMet.selector);
        timelock.schedule(address(box), 0, data, PREDECESSOR, SALT, MIN_DELAY - 1);
    }

    function test_Schedule_RevertsWhenAlreadyScheduled() public {
        bytes memory data = abi.encodeCall(Box.store, (7));

        vm.startPrank(proposer);
        timelock.schedule(address(box), 0, data, PREDECESSOR, SALT, MIN_DELAY);
        vm.expectRevert(TimelockController.OperationAlreadyScheduled.selector);
        timelock.schedule(address(box), 0, data, PREDECESSOR, SALT, MIN_DELAY);
        vm.stopPrank();
    }

    // ============ Execute / delay ============

    function test_Execute_RevertsBeforeDelay_MinDelayNotMet() public {
        bytes memory data = abi.encodeCall(Box.store, (99));

        vm.prank(proposer);
        timelock.schedule(address(box), 0, data, PREDECESSOR, SALT, MIN_DELAY);

        vm.prank(executor);
        vm.expectRevert(TimelockController.MinDelayNotMet.selector);
        timelock.execute(address(box), 0, data, PREDECESSOR, SALT);

        assertEq(box.retrieve(), 0);
    }

    function test_Execute_AfterWarp_UpdatesBox() public {
        bytes memory data = abi.encodeCall(Box.store, (123));
        bytes32 id = timelock.hashOperation(address(box), 0, data, PREDECESSOR, SALT);

        vm.prank(proposer);
        timelock.schedule(address(box), 0, data, PREDECESSOR, SALT, MIN_DELAY);

        vm.warp(block.timestamp + MIN_DELAY);
        assertTrue(timelock.isOperationReady(id));

        vm.prank(executor);
        timelock.execute(address(box), 0, data, PREDECESSOR, SALT);

        assertEq(box.retrieve(), 123);
        assertTrue(timelock.isOperationDone(id));
    }

    function test_Execute_RevertsWhenCallerNotExecutor() public {
        bytes memory data = abi.encodeCall(Box.store, (5));

        vm.prank(proposer);
        timelock.schedule(address(box), 0, data, PREDECESSOR, SALT, MIN_DELAY);
        vm.warp(block.timestamp + MIN_DELAY);

        vm.expectRevert(TimelockController.UnauthorizedExecutor.selector);
        vm.prank(stranger);
        timelock.execute(address(box), 0, data, PREDECESSOR, SALT);
    }

    function test_Execute_RevertsWhenNotScheduled() public {
        bytes memory data = abi.encodeCall(Box.store, (1));

        vm.prank(executor);
        vm.expectRevert(TimelockController.OperationNotFound.selector);
        timelock.execute(address(box), 0, data, PREDECESSOR, SALT);
    }

    function test_Execute_RevertsWhenTargetCallFails_ExecutionFailed() public {
        // store solo puede llamarlo el owner (timelock); forzamos fallo con selector inválido
        // sobre un contrato que revierte: Box.store llamado con valor que el target no acepta
        // vía payload a dirección que revierte siempre.
        RevertingTarget target = new RevertingTarget();
        bytes memory data = abi.encodeCall(RevertingTarget.boom, ());

        vm.prank(proposer);
        timelock.schedule(address(target), 0, data, PREDECESSOR, SALT, MIN_DELAY);
        vm.warp(block.timestamp + MIN_DELAY);

        vm.prank(executor);
        vm.expectRevert(TimelockController.ExecutionFailed.selector);
        timelock.execute(address(target), 0, data, PREDECESSOR, SALT);
    }

    function test_Execute_BubblesCustomErrorFromTarget() public {
        RevertingTarget target = new RevertingTarget();
        bytes memory data = abi.encodeCall(RevertingTarget.boomWithReason, ());

        vm.prank(proposer);
        timelock.schedule(address(target), 0, data, PREDECESSOR, SALT, MIN_DELAY);
        vm.warp(block.timestamp + MIN_DELAY);

        vm.prank(executor);
        vm.expectRevert(RevertingTarget.Boom.selector);
        timelock.execute(address(target), 0, data, PREDECESSOR, SALT);
    }

    function test_Execute_RevertsOnSecondCall() public {
        bytes memory data = abi.encodeCall(Box.store, (11));

        vm.prank(proposer);
        timelock.schedule(address(box), 0, data, PREDECESSOR, SALT, MIN_DELAY);
        vm.warp(block.timestamp + MIN_DELAY);

        vm.startPrank(executor);
        timelock.execute(address(box), 0, data, PREDECESSOR, SALT);
        vm.expectRevert(TimelockController.OperationNotFound.selector);
        timelock.execute(address(box), 0, data, PREDECESSOR, SALT);
        vm.stopPrank();
    }

    // ============ Cancel ============

    function test_Cancel_RemovesPendingOperation() public {
        bytes memory data = abi.encodeCall(Box.store, (3));
        bytes32 id = timelock.hashOperation(address(box), 0, data, PREDECESSOR, SALT);

        vm.prank(proposer);
        timelock.schedule(address(box), 0, data, PREDECESSOR, SALT, MIN_DELAY);

        vm.prank(proposer);
        timelock.cancel(id);

        assertEq(timelock.getTimestamp(id), 0);
        assertFalse(timelock.isOperation(id));
    }

    // ============ Fuzz ============

    function testFuzz_ExecuteOnlyAfterDelay(uint256 delay, uint256 earlySkew, uint256 value) public {
        delay = bound(delay, MIN_DELAY, 30 days);
        earlySkew = bound(earlySkew, 0, delay - 1);
        value = bound(value, 1, type(uint256).max);

        bytes memory data = abi.encodeCall(Box.store, (value));

        vm.prank(proposer);
        timelock.schedule(address(box), 0, data, PREDECESSOR, SALT, delay);

        vm.warp(block.timestamp + earlySkew);
        vm.prank(executor);
        vm.expectRevert(TimelockController.MinDelayNotMet.selector);
        timelock.execute(address(box), 0, data, PREDECESSOR, SALT);

        vm.warp(block.timestamp + (delay - earlySkew));
        vm.prank(executor);
        timelock.execute(address(box), 0, data, PREDECESSOR, SALT);

        assertEq(box.retrieve(), value);
    }
}

/**
 * @dev Target de prueba: revierte con y sin returndata.
 */
contract RevertingTarget {
    error Boom();

    function boom() external pure {
        revert();
    }

    function boomWithReason() external pure {
        revert Boom();
    }
}
