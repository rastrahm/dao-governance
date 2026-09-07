// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";

/**
 * @title GovernanceToken
 * @notice ERC-20 de gobernanza con Permit (EIP-2612), Votes y checkpoints históricos.
 * @dev El balance no otorga votos hasta `delegate`. Solo el owner puede `mint`.
 */
contract GovernanceToken is ERC20, ERC20Permit, ERC20Votes, Ownable2Step {
    /// @dev Se usó la dirección cero donde está prohibida.
    error ZeroAddress();

    /**
     * @notice Despliega el token y asigna la ownership al deployer.
     * @param name_ Nombre ERC-20 (también domain EIP-712).
     * @param symbol_ Símbolo ERC-20.
     */
    constructor(string memory name_, string memory symbol_)
        ERC20(name_, symbol_)
        ERC20Permit(name_)
        Ownable(msg.sender)
    {}

    /**
     * @notice Acuña `amount` tokens a `to`. Solo el owner.
     * @param to Destinatario (no cero).
     * @param amount Cantidad a acuñar.
     */
    function mint(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) {
            revert ZeroAddress();
        }
        _mint(to, amount);
    }

    /**
     * @dev Hook de transferencia/mint/burn: actualiza balances y unidades de voto (checkpoints).
     */
    function _update(address from, address to, uint256 amount) internal override(ERC20, ERC20Votes) {
        super._update(from, to, amount);
    }

    /**
     * @dev Resuelve el conflicto de herencia `nonces` entre Permit y Votes.
     */
    function nonces(address owner_) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner_);
    }
}
