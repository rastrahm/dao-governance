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
 * @notice Deploy local del stack DAO: Token → Timelock → Governor → Box + wiring de roles.
 * @dev Ejemplo Anvil:
 *      `export PATH="$HOME/.foundry/bin:$PATH"`
 *      `anvil`
 *      `forge script script/Deploy.s.sol:Deploy --rpc-url http://127.0.0.1:8545 --broadcast`
 *
 * @dev Opcional: `PRIVATE_KEY`, `MIN_DELAY` (segundos), `MINT_AMOUNT`.
 * @dev Frontend: fuera de alcance v1 (ver `doc/planificacion.md`).
 */
contract Deploy is Script {
    uint48 internal constant VOTING_DELAY = 1;
    uint32 internal constant VOTING_PERIOD = 50400; // ~1 semana @ 12s/bloque
    uint256 internal constant PROPOSAL_THRESHOLD = 0; // demo local: cualquiera con votos delegados
    uint256 internal constant QUORUM_NUMERATOR = 4; // 4%

    /**
     * @notice Despliega y cablea el sistema; renuncia el admin EOA del Timelock.
     */
    function run() external {
        uint256 pk =
            vm.envOr("PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80));
        address deployer = vm.addr(pk);

        uint256 minDelay = vm.envOr("MIN_DELAY", uint256(1 days));
        uint256 mintAmount = vm.envOr("MINT_AMOUNT", uint256(1_000_000 ether));

        vm.startBroadcast(pk);

        GovernanceToken token = new GovernanceToken("DAO Token", "DAO");

        address[] memory proposers = new address[](0);
        address[] memory executors = new address[](1);
        executors[0] = address(0); // execute abierto

        TimelockController timelock = new TimelockController(minDelay, proposers, executors, deployer);

        MyGovernor governor = new MyGovernor(
            IVotes(address(token)),
            timelock,
            VOTING_DELAY,
            VOTING_PERIOD,
            PROPOSAL_THRESHOLD,
            QUORUM_NUMERATOR
        );

        bytes32 proposerRole = timelock.PROPOSER_ROLE();
        bytes32 cancellerRole = timelock.CANCELLER_ROLE();
        bytes32 adminRole = timelock.DEFAULT_ADMIN_ROLE();

        timelock.grantRole(proposerRole, address(governor));
        timelock.grantRole(cancellerRole, address(governor));

        // Solo el Timelock (vía propuestas) administra roles de aquí en más.
        timelock.renounceRole(adminRole, deployer);

        Box box = new Box(address(timelock));

        token.mint(deployer, mintAmount);
        // Demo: el deployer sigue como owner del token para mint local.
        // Producción: transferOwnership → Timelock + acceptOwnership vía propuesta.

        vm.stopBroadcast();

        console2.log("=== DAO Governance Deploy ===");
        console2.log("Deployer", deployer);
        console2.log("GovernanceToken", address(token));
        console2.log("TimelockController", address(timelock));
        console2.log("MyGovernor", address(governor));
        console2.log("Box", address(box));
        console2.log("MIN_DELAY (s)", minDelay);
        console2.log("Minted to deployer", mintAmount);
        console2.log("Next: token.delegate(deployer) then propose/vote/queue/execute");
    }
}
