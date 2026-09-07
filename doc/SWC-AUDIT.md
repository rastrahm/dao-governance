# Auditoría SWC — On-Chain DAO Governance & Timelock

Verificación de `GovernanceToken`, `MyGovernor`, `TimelockController` y `Box` contra el [SWC Registry](https://swcregistry.io/) (EIP-1470) y principios del monorepo (custom errors, CEI, `ReentrancyGuard`, AccessControl, ERC20Votes checkpoints).

> **Nota:** El SWC Registry no se mantiene activamente desde ~2020. Complementar con [SCSVS](https://github.com/ComposableSecurity/SCSVS) y [EEA EthTrust](https://entethalliance.org/specs/ethtrust/).

**Contratos auditados:** `src/GovernanceToken.sol`, `src/MyGovernor.sol`, `src/TimelockController.sol`, `src/Box.sol`  
**Fecha:** 2026-09-07  
**Referencia tests:** `test/GovernanceToken.t.sol`, `test/TimelockController.t.sol`, `test/MyGovernor.t.sol`, `test/fuzz/`, `test/attack/`  
**Estilo:** alineado a [`08-flash-loans/doc/SWC-AUDIT.md`](../../08-flash-loans/doc/SWC-AUDIT.md)

---

## Resumen ejecutivo

| Estado | Cantidad |
|--------|----------|
| ✅ Mitigado / No aplicable | 32 |
| ⚠️ Informativo (diseño / trust / tiempo) | 4 |
| ❌ Vulnerable | 0 |

**Conclusión:** Sin vulnerabilidades SWC explotables en el alcance v1 (token de votos + Governor + Timelock + target demo). Riesgos informativos: uso de `block.timestamp` para `MIN_DELAY` (SWC-116), dependencia del orden de txs en `execute` abierto (SWC-114), centralización del `owner` del token / admin del Timelock hasta renuncia, y superficie de `.call` arbitrario acotada por roles + delay.

**Principios del suite verificados:**

| Principio | Estado |
|-----------|--------|
| Custom errors (no `require` strings) | ✅ |
| Pragma fijo `0.8.24` | ✅ |
| CEI + `nonReentrant` en `execute` / `executeBatch` | ✅ + `test/attack/` |
| AccessControl (PROPOSER / EXECUTOR / CANCELLER) | ✅ + Unauthorized attack |
| Snapshots ERC20Votes (anti flash-loan voting) | ✅ + MyGovernor + fuzz |
| Timelock obligatorio post-Succeeded | ✅ lifecycle |
| Fuzz ≥ 1000 runs | ✅ `foundry.toml` + `test/fuzz/` |

---

## Matriz completa SWC-100 — SWC-136

| ID | Título | Aplica | Estado | Evidencia en DAO Governance |
|----|--------|--------|--------|------------------------------|
| SWC-100 | Function Default Visibility | Sí | ✅ | Visibilidad explícita en `src/` |
| SWC-101 | Integer Overflow and Underflow | Sí | ✅ | Solidity `0.8.24`; OZ Votes/Governor SafeCast; fuzz amounts/delays |
| SWC-102 | Outdated Compiler Version | Sí | ✅ | `pragma solidity 0.8.24` + `foundry.toml` `solc = "0.8.24"` |
| SWC-103 | Floating Pragma | Sí | ✅ | Pragma exacto (sin `^`) en todo `src/` / `test/` |
| SWC-104 | Unchecked Call Return Value | Sí | ✅ | Timelock verifica `success` del `.call`; bubble returndata o `ExecutionFailed` |
| SWC-105 | Unprotected Ether Withdrawal | Parcial | ✅ | `receive` + `execute` payable solo ejecutan ops agendaadas; sin withdraw libre de ETH |
| SWC-106 | Unprotected SELFDESTRUCT | No | N/A | Sin `selfdestruct` |
| SWC-107 | Reentrancy | Sí | ✅ | `nonReentrant` + CEI (`_beforeExecute` marca done antes del call); attack test |
| SWC-108 | State Variable Default Visibility | Sí | ✅ | `immutable` / `private` / `constant` explícitos |
| SWC-109 | Uninitialized Storage Pointer | No | N/A | Sin punteros storage legacy |
| SWC-110 | Assert Violation | No | N/A | Sin `assert` de producción |
| SWC-111 | Deprecated Solidity Functions | Sí | ✅ | Sin `suicide` / `throw` / `tx.origin` / ETH `transfer`/`send` |
| SWC-112 | Delegatecall to Untrusted Callee | No | N/A | Sin `delegatecall` (solo `.call`) |
| SWC-113 | DoS with Failed Call | Sí | ✅ | Target revert → bubble / `ExecutionFailed`; op queda no-done si revierte la tx |
| SWC-114 | Transaction Order Dependence | Sí | ⚠️ | Quien llama `execute` tras eta es ordenable (MEV); ver riesgos |
| SWC-115 | Authorization through tx.origin | No | N/A | Auth por `msg.sender` + roles / Ownable |
| SWC-116 | Block values as a proxy for time | Sí | ⚠️ | `MIN_DELAY` usa `block.timestamp`; aceptable para delays largos |
| SWC-117 | Signature Malleability | Parcial | ✅ | Permit/Votes vía OZ ECDSA (anti-malleability); sin `ecrecover` crudo propio |
| SWC-118 | Incorrect Constructor Name | No | N/A | `constructor` 0.8+ |
| SWC-119 | Shadowing State Variables | Sí | ✅ | Sin shadowing de estado en `src/` |
| SWC-120 | Weak Sources of Randomness | No | N/A | Sin RNG |
| SWC-121 | Missing Protection against Signature Replay | Parcial | ✅ | Nonces OZ en Permit / `delegateBySig` / votos firmados |
| SWC-122 | Lack of Proper Signature Verification | Parcial | ✅ | OZ ECDSA + EIP-712 |
| SWC-123 | Requirement Violation | Sí | ✅ | Custom errors módulo + OZ Governor; unit/fuzz/attack |
| SWC-124 | Write to Arbitrary Storage Location | No | N/A | Assembly solo para `revert(returndata)` |
| SWC-125 | Incorrect Inheritance Order | Sí | ✅ | Token: ERC20→Permit→Votes→Ownable2Step; Governor: Settings/Votes/Quorum/Counting |
| SWC-126 | Insufficient Gas Griefing | Parcial | ⚠️ | Batch de `.call` arbitrarios: gas acotado por la tx del executor |
| SWC-127 | Arbitrary Jump with Function Type Variable | No | N/A | Sin function types dinámicos |
| SWC-128 | DoS With Block Gas Limit | Parcial | ⚠️ | `executeBatch` O(n); batches enormes pueden OOG (diseño / UI) |
| SWC-129 | Typographical Error | Sí | ✅ | Revisión + `forge build` / suite PASS |
| SWC-130 | Right-To-Left-Override | No | N/A | ASCII |
| SWC-131 | Presence of unused variables | Sí | ✅ | Sin dead code material en `src/` |
| SWC-132 | Unexpected Ether balance | Parcial | ✅ | Timelock puede recibir ETH para ops con `value`; sin lógica que dependa del balance “sorpresa” |
| SWC-133 | Hash Collisions (var-length args) | Sí | ✅ | `hashOperation` / `hashOperationBatch` con `abi.encode` (no `encodePacked` de dinámicos sueltos) |
| SWC-134 | Message call with hardcoded gas | No | N/A | Sin `{gas: …}` |
| SWC-135 | Code With No Effects | No | N/A | Sin no-ops relevantes |
| SWC-136 | Unencrypted Private Data On-Chain | Parcial | ✅ | Propuestas, votos y ops son públicos por diseño DAO |

---

## Riesgos informativos

### SWC-116 — `block.timestamp` como reloj del Timelock

`MIN_DELAY` se mide con `block.timestamp`. Validadores pueden influir segundos, no días enteros. **Aceptable** para buffers de gobernanza (horas/días). No usar este patrón para subastas “último segundo”.

### SWC-114 — Orden de `execute`

Con `EXECUTOR_ROLE` abierto (`address(0)`), cualquiera puede ejecutar una op ready. Eso es intencional (no hay privilegio de ejecución), pero el **orden entre ejecutores** puede competir por MEV si la calldata tiene valor extractable. Mitigación: delay de salida + review social durante la cola.

### Centralización / trust post-deploy

| Tema | Riesgo | Tratamiento v1 |
|------|--------|----------------|
| `GovernanceToken.owner` | Puede mintear ilimitado | `Ownable2Step`; renunciar o transferir a Timelock vía propuesta |
| `Timelock` `DEFAULT_ADMIN_ROLE` | Admin puede cambiar roles sin voto | Otorgar admin al propio Timelock y renunciar EOA tras setup |
| `PROPOSER_ROLE` extra | Bypass del Governor | Solo Governor como proposer (tests + docs) |
| `.call` arbitrario | Timelock puede llamar cualquier target | Acotado por lo que la DAO vote y encole |

### SWC-126 / SWC-128 — Batches grandes

`scheduleBatch` / `executeBatch` no limitan `targets.length`. Un batch gigante puede fallar por gas. Mitigación operativa: propuestas con pocas acciones; mejora futura: `MAX_BATCH_SIZE`.

---

## Checklist principios monorepo (+ módulo 10)

| Principio | ¿Cumple? | Notas |
|-----------|----------|--------|
| Custom errors | ✅ | `MinDelayNotMet`, `ExecutionFailed`, `ProposalNotFound`, `VotingClosed`, `ProposalNotSucceeded`, … |
| ReentrancyGuard (OZ) | ✅ | `execute` / `executeBatch` |
| CEI | ✅ | `_beforeExecute` effects → interactions |
| AccessControl | ✅ | Roles Timelock |
| ERC20Votes checkpoints | ✅ | Anti double-vote / flash-loan voting |
| NatSpec públicas/externas | ✅ | Token, Timelock, Governor, Box |
| Fuzz ≥ 1000 runs | ✅ | `test/fuzz/Governance.fuzz.t.sol` |
| Attack suite | ✅ | Reentrancy + unauthorized |
| Sin floating pragma | ✅ | `0.8.24` |
| Sin ETH `transfer`/`send` | ✅ | Solo `.call{value}` |

---

## Hallazgos de verificación (código)

### Mitigaciones confirmadas

1. **Timelock `execute`:** checks rol → `_beforeExecute` (ready + marca done) → `.call` → check `success` / bubble.
2. **Governor:** `proposalNeedsQueuing = true`; queue/execute pasan por Timelock; errores de dominio del módulo en `castVote*` / `queue` / `execute` / `state`.
3. **Votes:** poder leído en `proposalSnapshot`; mint/transfer post-snapshot no altera peso (unit + fuzz).
4. **Sin** `require` strings / `tx.origin` / `delegatecall` / `selfdestruct` / floating pragma en `src/`.

### Hardening Fase 4

| # | Cambio | Motivo |
|---|--------|--------|
| 1 | Override de todos los `castVote*` en `MyGovernor` | Evitar bypass de `VotingClosed` vía `castVoteWithReason` / bySig |
| 2 | Suite `test/fuzz/` | Threshold, quorum, delays, post-snapshot weight |
| 3 | Suite `test/attack/` | SWC-107 reentrancy + unauthorized schedule/execute |

### Observaciones no bloqueantes (v2)

| # | Observación | Severidad | Acción sugerida |
|---|-------------|-----------|-----------------|
| 1 | Sin `MAX_BATCH_SIZE` | Info | Cap on-chain o política off-chain |
| 2 | Admin Timelock / owner token tras deploy | Info | Script de renuncia en Fase 5 |
| 3 | `castVoteBySig` exige propuesta Active antes de verificar sig | Info | UX: puede gastar gas en sig inválida tras check de estado |
| 4 | Invariantes Foundry formales | Mejora | Handler propose/vote/queue (opcional) |

---

## Mapeo SWC → tests

| SWC | Test(s) |
|-----|---------|
| SWC-101 | Fuzz amounts/delays/threshold; OZ SafeCast en Governor |
| SWC-103 | `forge build` pragma fijo |
| SWC-104 | Timelock unit `ExecutionFailed` + bubble custom error |
| SWC-107 | `test/attack/TimelockAttack.t.sol` (`reenterExecute`) |
| SWC-113 | Target revert / `ExecutionFailed` |
| SWC-114 | Documental; execute abierto por diseño |
| SWC-116 | Documental; fuzz delay con `vm.warp` |
| SWC-123 | unit Governor/Timelock/Token + fuzz + attack |
| Auth | `strangerCannotSchedule` / `strangerCannotExecute` |
| Flash-loan voting | `MyGovernor.test_FlashLoan_*` + `testFuzz_PostSnapshotMint_*` |
| Threshold / quorum / delay | `test/fuzz/Governance.fuzz.t.sol` |

---

## Resultado de ejecución

```text
forge test --summary
GovernanceTokenTest             15 PASS
MyGovernorTest                   9 PASS
TimelockControllerTest          14 PASS
TimelockReentrancyAttackTest     1 PASS
TimelockUnauthorizedAttackTest   2 PASS
GovernanceFuzzTest               5 PASS
Total: 46 PASS / 0 FAIL / 0 SKIP
```

---

## Referencias

- [SWC Registry](https://swcregistry.io/)
- [EIP-1470](https://eips.ethereum.org/EIPS/eip-1470)
- Módulo 08: [`08-flash-loans/doc/SWC-AUDIT.md`](../../08-flash-loans/doc/SWC-AUDIT.md)
- Plan: [`planificacion.md`](./planificacion.md)
