// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";

import {TimelockController} from "../../src/TimelockController.sol";
import {Box} from "../../src/Box.sol";

/**
 * @dev Target malicioso: al ser llamado intenta reentrar `execute` del Timelock.
 */
contract ReenteringTarget {
    TimelockController public timelock;
    bytes32 public salt;
    bool public entered;

    function arm(TimelockController timelock_, bytes32 salt_) external {
        timelock = timelock_;
        salt = salt_;
    }

    function attack() external {
        entered = true;
        // Reentra con la misma operación (ya marcada done / under nonReentrant).
        timelock.execute(address(this), 0, abi.encodeCall(this.attack, ()), bytes32(0), salt);
    }
}

/**
 * @title TimelockReentrancyAttackTest
 * @notice SWC-107: reentrada en `execute` bloqueada por `nonReentrant` + CEI.
 */
contract TimelockReentrancyAttackTest is Test {
    uint256 internal constant MIN_DELAY = 1 days;

    TimelockController internal timelock;
    ReenteringTarget internal target;

    address internal admin = makeAddr("admin");
    address internal proposer = makeAddr("proposer");
    address internal executor = makeAddr("executor");

    bytes32 internal constant SALT = bytes32(uint256(42));

    function setUp() public {
        address[] memory proposers = new address[](1);
        proposers[0] = proposer;
        address[] memory executors = new address[](1);
        executors[0] = executor;

        timelock = new TimelockController(MIN_DELAY, proposers, executors, admin);
        target = new ReenteringTarget();
        target.arm(timelock, SALT);
    }

    /**
     * @notice SWC-107: el callback del target no puede reentrar `execute`; la tx revierte entera.
     */
    function test_Attack_reenterExecute_revertsGuard() public {
        bytes memory data = abi.encodeCall(ReenteringTarget.attack, ());
        bytes32 id = timelock.hashOperation(address(target), 0, data, bytes32(0), SALT);

        vm.prank(proposer);
        timelock.schedule(address(target), 0, data, bytes32(0), SALT, MIN_DELAY);
        vm.warp(block.timestamp + MIN_DELAY);

        vm.prank(executor);
        vm.expectRevert(ReentrancyGuard.ReentrancyGuardReentrantCall.selector);
        timelock.execute(address(target), 0, data, bytes32(0), SALT);

        // Revert atómico: ni done ni side-effects del target.
        assertFalse(target.entered());
        assertTrue(timelock.isOperationReady(id));
        assertFalse(timelock.isOperationDone(id));
    }
}

/**
 * @title TimelockUnauthorizedAttackTest
 * @notice Auth: stranger no schedule / no execute sin rol.
 */
contract TimelockUnauthorizedAttackTest is Test {
    uint256 internal constant MIN_DELAY = 1 days;

    TimelockController internal timelock;
    Box internal box;

    address internal admin = makeAddr("admin");
    address internal proposer = makeAddr("proposer");
    address internal executor = makeAddr("executor");
    address internal stranger = makeAddr("stranger");

    function setUp() public {
        address[] memory proposers = new address[](1);
        proposers[0] = proposer;
        address[] memory executors = new address[](1);
        executors[0] = executor;

        timelock = new TimelockController(MIN_DELAY, proposers, executors, admin);
        box = new Box(address(timelock));
    }

    function test_Attack_strangerCannotSchedule() public {
        bytes memory data = abi.encodeCall(Box.store, (1));
        bytes32 role = timelock.PROPOSER_ROLE();

        vm.expectRevert(abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, stranger, role));
        vm.prank(stranger);
        timelock.schedule(address(box), 0, data, bytes32(0), bytes32(uint256(1)), MIN_DELAY);
    }

    function test_Attack_strangerCannotExecute() public {
        bytes memory data = abi.encodeCall(Box.store, (1));
        bytes32 salt = bytes32(uint256(2));

        vm.prank(proposer);
        timelock.schedule(address(box), 0, data, bytes32(0), salt, MIN_DELAY);
        vm.warp(block.timestamp + MIN_DELAY);

        vm.expectRevert(TimelockController.UnauthorizedExecutor.selector);
        vm.prank(stranger);
        timelock.execute(address(box), 0, data, bytes32(0), salt);

        assertEq(box.retrieve(), 0);
    }
}
