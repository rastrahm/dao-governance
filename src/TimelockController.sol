// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TimelockController
 * @notice Encola operaciones (simple o batch) y solo las ejecuta tras `MIN_DELAY` vía `.call`.
 * @dev Roles: PROPOSER agenda, EXECUTOR ejecuta, CANCELLER cancela. Admin opcional en deploy.
 */
contract TimelockController is AccessControl, ReentrancyGuard {
    /// @notice Rol que puede `schedule` / `scheduleBatch`.
    bytes32 public constant PROPOSER_ROLE = keccak256("PROPOSER_ROLE");
    /// @notice Rol que puede `execute` (si se otorga a `address(0)`, queda abierto).
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    /// @notice Rol que puede cancelar operaciones pendientes.
    bytes32 public constant CANCELLER_ROLE = keccak256("CANCELLER_ROLE");

    uint256 private constant _DONE_TIMESTAMP = 1;

    /// @notice Delay mínimo en segundos entre schedule y execute.
    uint256 public immutable MIN_DELAY;

    /// @dev `0` = unset, `1` = done, otro = timestamp (eta) de readiness.
    mapping(bytes32 id => uint256) private _timestamps;

    error MinDelayNotMet();
    error ExecutionFailed();
    error OperationNotFound();
    error OperationAlreadyScheduled();
    error UnauthorizedExecutor();
    error InvalidOperationLength();

    event CallScheduled(
        bytes32 indexed id,
        uint256 indexed index,
        address target,
        uint256 value,
        bytes data,
        bytes32 predecessor,
        uint256 delay
    );
    event CallExecuted(bytes32 indexed id, uint256 indexed index, address target, uint256 value, bytes data);
    event Cancelled(bytes32 indexed id);

    /**
     * @notice Configura delay y roles iniciales.
     * @param minDelay Delay mínimo (immutable) en segundos.
     * @param proposers Cuentas con PROPOSER + CANCELLER.
     * @param executors Cuentas con EXECUTOR (`address(0)` = abierto a cualquiera).
     * @param admin Admin opcional; `address(0)` desactiva admin externo.
     */
    constructor(uint256 minDelay, address[] memory proposers, address[] memory executors, address admin) {
        if (minDelay == 0) {
            revert MinDelayNotMet();
        }

        MIN_DELAY = minDelay;

        _grantRole(DEFAULT_ADMIN_ROLE, address(this));
        if (admin != address(0)) {
            _grantRole(DEFAULT_ADMIN_ROLE, admin);
        }

        uint256 proposersLength = proposers.length;
        for (uint256 i; i < proposersLength; ++i) {
            _grantRole(PROPOSER_ROLE, proposers[i]);
            _grantRole(CANCELLER_ROLE, proposers[i]);
        }

        uint256 executorsLength = executors.length;
        for (uint256 i; i < executorsLength; ++i) {
            _grantRole(EXECUTOR_ROLE, executors[i]);
        }
    }

    /// @dev Permite recibir ETH para operaciones con `value`.
    receive() external payable {}

    /**
     * @notice Delay mínimo configurado.
     * @return Segundos de `MIN_DELAY`.
     */
    function getMinDelay() external view returns (uint256) {
        return MIN_DELAY;
    }

    /**
     * @notice Timestamp eta (o `_DONE_TIMESTAMP`) de la operación.
     * @param id Hash de la operación.
     */
    function getTimestamp(bytes32 id) public view returns (uint256) {
        return _timestamps[id];
    }

    /**
     * @notice True si la operación existe (pending, ready o done).
     */
    function isOperation(bytes32 id) public view returns (bool) {
        return _timestamps[id] > 0;
    }

    /**
     * @notice True si está waiting o ready (aún no done).
     */
    function isOperationPending(bytes32 id) public view returns (bool) {
        uint256 timestamp = _timestamps[id];
        return timestamp > _DONE_TIMESTAMP;
    }

    /**
     * @notice True si el delay ya venció y aún no se ejecutó.
     */
    function isOperationReady(bytes32 id) public view returns (bool) {
        uint256 timestamp = _timestamps[id];
        return timestamp > _DONE_TIMESTAMP && timestamp <= block.timestamp;
    }

    /**
     * @notice True si ya se ejecutó.
     */
    function isOperationDone(bytes32 id) public view returns (bool) {
        return _timestamps[id] == _DONE_TIMESTAMP;
    }

    /**
     * @notice Hash determinista de una operación simple.
     */
    function hashOperation(address target, uint256 value, bytes calldata data, bytes32 predecessor, bytes32 salt)
        public
        pure
        returns (bytes32)
    {
        return keccak256(abi.encode(target, value, data, predecessor, salt));
    }

    /**
     * @notice Hash determinista de un batch de operaciones.
     */
    function hashOperationBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata payloads,
        bytes32 predecessor,
        bytes32 salt
    ) public pure returns (bytes32) {
        return keccak256(abi.encode(targets, values, payloads, predecessor, salt));
    }

    /**
     * @notice Encola una operación simple ejecutable tras `delay` (≥ `MIN_DELAY`).
     */
    function schedule(
        address target,
        uint256 value,
        bytes calldata data,
        bytes32 predecessor,
        bytes32 salt,
        uint256 delay
    ) external onlyRole(PROPOSER_ROLE) {
        bytes32 id = hashOperation(target, value, data, predecessor, salt);
        _schedule(id, delay);
        emit CallScheduled(id, 0, target, value, data, predecessor, delay);
    }

    /**
     * @notice Encola un batch de llamadas bajo un único `id` / eta.
     */
    function scheduleBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata payloads,
        bytes32 predecessor,
        bytes32 salt,
        uint256 delay
    ) external onlyRole(PROPOSER_ROLE) {
        if (targets.length != values.length || targets.length != payloads.length) {
            revert InvalidOperationLength();
        }

        bytes32 id = hashOperationBatch(targets, values, payloads, predecessor, salt);
        _schedule(id, delay);

        uint256 length = targets.length;
        for (uint256 i; i < length; ++i) {
            emit CallScheduled(id, i, targets[i], values[i], payloads[i], predecessor, delay);
        }
    }

    /**
     * @notice Cancela una operación pendiente.
     * @param id Hash de la operación.
     */
    function cancel(bytes32 id) external onlyRole(CANCELLER_ROLE) {
        if (!isOperationPending(id)) {
            revert OperationNotFound();
        }
        delete _timestamps[id];
        emit Cancelled(id);
    }

    /**
     * @notice Ejecuta una operación simple ready con low-level `.call`.
     * @dev CEI: checks → marcar done → interacción. ReentrancyGuard adicional.
     */
    function execute(address target, uint256 value, bytes calldata data, bytes32 predecessor, bytes32 salt)
        external
        payable
        nonReentrant
    {
        _checkExecutor();
        bytes32 id = hashOperation(target, value, data, predecessor, salt);
        _beforeExecute(id, predecessor);

        (bool success, bytes memory returndata) = target.call{value: value}(data);
        if (!success) {
            _revertFromReturnData(returndata);
        }

        emit CallExecuted(id, 0, target, value, data);
    }

    /**
     * @notice Ejecuta un batch ready; cada item vía `.call`.
     */
    function executeBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata payloads,
        bytes32 predecessor,
        bytes32 salt
    ) external payable nonReentrant {
        if (targets.length != values.length || targets.length != payloads.length) {
            revert InvalidOperationLength();
        }

        _checkExecutor();
        bytes32 id = hashOperationBatch(targets, values, payloads, predecessor, salt);
        _beforeExecute(id, predecessor);

        uint256 length = targets.length;
        for (uint256 i; i < length; ++i) {
            (bool success, bytes memory returndata) = targets[i].call{value: values[i]}(payloads[i]);
            if (!success) {
                _revertFromReturnData(returndata);
            }
            emit CallExecuted(id, i, targets[i], values[i], payloads[i]);
        }
    }

    /**
     * @dev Registra eta si delay ≥ MIN_DELAY y el id está libre.
     */
    function _schedule(bytes32 id, uint256 delay) private {
        if (delay < MIN_DELAY) {
            revert MinDelayNotMet();
        }
        if (_timestamps[id] != 0) {
            revert OperationAlreadyScheduled();
        }
        _timestamps[id] = block.timestamp + delay;
    }

    /**
     * @dev Valida ready + predecessor y marca done (effects antes de calls).
     */
    function _beforeExecute(bytes32 id, bytes32 predecessor) private {
        uint256 timestamp = _timestamps[id];

        if (timestamp == 0 || timestamp == _DONE_TIMESTAMP) {
            revert OperationNotFound();
        }
        if (timestamp > block.timestamp) {
            revert MinDelayNotMet();
        }
        if (predecessor != bytes32(0) && !isOperationDone(predecessor)) {
            revert OperationNotFound();
        }

        _timestamps[id] = _DONE_TIMESTAMP;
    }

    /**
     * @dev EXECUTOR_ROLE en caller, o rol abierto en `address(0)`.
     */
    function _checkExecutor() private view {
        if (hasRole(EXECUTOR_ROLE, address(0))) {
            return;
        }
        if (!hasRole(EXECUTOR_ROLE, msg.sender)) {
            revert UnauthorizedExecutor();
        }
    }

    /**
     * @dev Propaga returndata del target si existe; si no, `ExecutionFailed`.
     */
    function _revertFromReturnData(bytes memory returndata) private pure {
        uint256 length = returndata.length;
        if (length > 0) {
            assembly ("memory-safe") {
                revert(add(returndata, 0x20), length)
            }
        }
        revert ExecutionFailed();
    }
}
