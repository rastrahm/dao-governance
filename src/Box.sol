// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Box
 * @notice Target de demo gobernado: solo el owner (Timelock) puede `store`.
 */
contract Box is Ownable {
    uint256 private _value;

    event ValueChanged(uint256 newValue);

    /**
     * @notice Despliega el Box con `initialOwner` (normalmente el Timelock).
     * @param initialOwner Dirección autorizada a mutar el estado.
     */
    constructor(address initialOwner) Ownable(initialOwner) {}

    /**
     * @notice Guarda un nuevo valor. Solo owner.
     * @param newValue Valor a persistir.
     */
    function store(uint256 newValue) external onlyOwner {
        _value = newValue;
        emit ValueChanged(newValue);
    }

    /**
     * @notice Lee el valor almacenado.
     * @return Valor actual.
     */
    function retrieve() external view returns (uint256) {
        return _value;
    }
}
