// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";

import {GovernanceToken} from "../src/GovernanceToken.sol";
import {TimelockController} from "../src/TimelockController.sol";
import {MyGovernor} from "../src/MyGovernor.sol";
import {Box} from "../src/Box.sol";

/**
 * @title Deploy
 * @notice Deploy local del stack DAO para Anvil + frontend con wallet.
 * @dev `MIN_DELAY=60 VOTING_PERIOD=10 forge script script/Deploy.s.sol:Deploy --rpc-url http://127.0.0.1:8545 --broadcast`
 */
contract Deploy is Script {
    /**
     * @notice Despliega Token, Timelock, Governor, Box; cablea roles; renuncia admin EOA.
     */
    function run() external {
        uint256 pk =
            vm.envOr("PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80));
        address deployer = vm.addr(pk);
        uint256 minDelay = vm.envOr("MIN_DELAY", uint256(60));
        uint256 mintAmount = vm.envOr("MINT_AMOUNT", uint256(1_000_000 ether));
        uint48 votingDelay_ = uint48(vm.envOr("VOTING_DELAY", uint256(1)));
        uint32 votingPeriod_ = uint32(vm.envOr("VOTING_PERIOD", uint256(10)));
        uint256 proposalThreshold_ = vm.envOr("PROPOSAL_THRESHOLD", uint256(0));
        uint256 quorumNumerator_ = vm.envOr("QUORUM_NUMERATOR", uint256(4));

        address[] memory proposers = new address[](0);
        address[] memory executors = new address[](1);
        executors[0] = address(0);

        vm.startBroadcast(pk);

        GovernanceToken token = new GovernanceToken("DAO Token", "DAO");
        TimelockController timelock = new TimelockController(minDelay, proposers, executors, deployer);
        MyGovernor governor = new MyGovernor(
            IVotes(address(token)), timelock, votingDelay_, votingPeriod_, proposalThreshold_, quorumNumerator_
        );
        timelock.grantRole(timelock.PROPOSER_ROLE(), address(governor));
        timelock.grantRole(timelock.CANCELLER_ROLE(), address(governor));
        timelock.renounceRole(timelock.DEFAULT_ADMIN_ROLE(), deployer);
        Box box = new Box(address(timelock));
        token.mint(deployer, mintAmount);

        vm.stopBroadcast();

        console2.log("=== DAO Governance Deploy ===");
        console2.log("Deployer", deployer);
        console2.log("GovernanceToken", address(token));
        console2.log("TimelockController", address(timelock));
        console2.log("MyGovernor", address(governor));
        console2.log("Box", address(box));
        console2.log("MIN_DELAY (s)", minDelay);
        console2.log("votingDelay", uint256(votingDelay_));
        console2.log("votingPeriod", uint256(votingPeriod_));
    }
}
