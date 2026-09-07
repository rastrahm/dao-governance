# Planificación — Módulo 10: On-Chain DAO Governance & Timelock

## 1. Objetivo

Construir un sistema de gobernanza DAO on-chain de nivel producción con:

- Poder de voto ERC-20 con checkpoints históricos y delegación (`ERC20Votes`).
- Ciclo de vida completo de propuestas.
- Timelock con delay mínimo (`MIN_DELAY`) antes de ejecutar acciones arbitrarias.
- Stack: **Foundry + Solidity `0.8.24`** (pragma fijo, sin floating).

---

## 2. Alcance

| Incluido | Excluido (por ahora) |
|----------|----------------------|
| Token de gobernanza con votos y delegación | UI Next.js (si se agrega, seguir `nextjs.cursorrules`) |
| Governor: propose → vote → queue → execute | Multichain / bridge |
| Timelock: delay + ejecución vía `.call` | Upgradeability (proxy) salvo que se planifique después |
| Tests unitarios, anti flash-loan, fuzz | Indexer / subgraph |

---

## 3. Stack y restricciones técnicas

### Suite (`evm-smart-contracts-suite`)

- Solidity **exacto** `0.8.24`.
- OpenZeppelin Contracts v5.x (herencia auditada).
- Foundry: unit + fuzz (`bound`) + time travel (`vm.warp` / `vm.roll`).
- Custom errors (no `require` con strings).
- CEI / `ReentrancyGuard` donde haya llamadas externas.
- ETH solo con `.call{value: ...}("")`.
- NatSpec en toda API pública/externa.
- Layout: Interfaces → Libraries → Contracts → State → Events → Errors → Modifiers → Functions.

### Módulo 10

- Checkpoints para impedir doble voto / flash-loan voting.
- Estados: `Pending` → `Active` → `Defeated` | `Succeeded` → `Queued` → `Executed` | `Expired`.
- `proposalThreshold` obligatorio al crear propuesta.
- Timelock: `MIN_DELAY` antes de ejecutar; si falla el `.call` → `ExecutionFailed`.

---

## 4. Arquitectura de contratos

```
GovernanceToken (ERC20Votes)
        ↑ getVotes / getPastVotes
MyGovernor
        │ queue / execute
        ↓
TimelockController (MIN_DELAY)
        │ .call(target, value, data)
        ↓
Target contracts (Box, Treasury, etc.)
```

### Contratos previstos

| Contrato | Responsabilidad |
|----------|-----------------|
| `GovernanceToken` | ERC-20 + votes + delegation + checkpoints |
| `MyGovernor` | Propuestas, votación, quorum, umbral, estados |
| `TimelockController` | Encolar, esperar delay, ejecutar acciones |
| `Box` (ejemplo) | Target de demo (`store` / `retrieve`) para tests de ejecución |

---

## 5. Parámetros de gobernanza (iniciales sugeridos)

| Parámetro | Descripción | Valor sugerido (ajustable) |
|-----------|-------------|----------------------------|
| `votingDelay` | Bloques hasta que la propuesta pasa a Active | 1 bloque |
| `votingPeriod` | Duración de la votación | ~1 día en bloques de test |
| `proposalThreshold` | Votos mínimos para proponer | > 0 (anti-spam) |
| `quorum` | % o cantidad mínima de participación | Configurable / fuzzable |
| `MIN_DELAY` | Delay del Timelock | ≥ 1 día (tests con `vm.warp`) |

---

## 6. Errores custom (obligatorios del módulo)

```solidity
error ProposalNotFound();
error VotingClosed();
error MinDelayNotMet();
error ProposalNotSucceeded();
error ExecutionFailed();
```

Ampliar según necesidad (umbral, quorum, ya votó, etc.) manteniendo custom errors.

---

## 7. Plan de implementación (TDD)

Orden obligatorio según reglas Foundry/Solidity: **tests primero**, luego contratos.

### Fase 0 — Setup Foundry

1. `forge init` / `foundry.toml` (fuzz runs ≥ 1000 en suite).
2. Instalar OpenZeppelin v5.
3. Estructura: `src/`, `test/`, `script/`.

### Fase 1 — Token de gobernanza

1. Tests: mint, transfer, `delegate`, `getVotes`, checkpoints tras transfer.
2. Implementar `GovernanceToken` (ERC20 + ERC20Permit + ERC20Votes).
3. Verificar que el poder de voto no se mueve sin `delegate`.

### Fase 2 — Timelock

1. Tests: queue, ejecutar antes de delay → revert `MinDelayNotMet`, ejecutar tras warp → OK.
2. Implementar / configurar Timelock con roles (proposer = Governor, executor = anyone o Governor).
3. Ejecución con `.call` y manejo de `success` / bytes de revert → `ExecutionFailed`.

### Fase 3 — Governor

1. Tests ciclo completo: Delegate → Propose → Vote → Queue → Warp → Execute.
2. Tests anti flash-loan: tokens comprados/transferidos **después** de crear la propuesta no cuentan para esa propuesta.
3. Tests: sin umbral → revert; votación cerrada → `VotingClosed`; propuesta inexistente → `ProposalNotFound`.
4. Implementar `MyGovernor` cableado a token + timelock.

### Fase 4 — Fuzz & hardening

1. Fuzz de umbrales, quorum y delays con `bound()`.
2. Cobertura de ramas de fallo con `vm.expectRevert`.
3. Revisar CEI, access control, NatSpec.

### Fase 5 — Scripts / demo (opcional)

1. Script de deploy local/anvil.
2. Target `Box` gobernado por Timelock.

---

## 8. Matriz de pruebas

| Caso | Qué valida |
|------|------------|
| Lifecycle feliz | Delegate → Propose → Vote → Queue → Warp → Execute |
| Flash-loan / post-snapshot | Transfer post-creación no altera peso de la propuesta activa |
| Delay prematuro | Execute antes de `MIN_DELAY` falla |
| Umbral | Propose sin votos suficientes falla |
| Quorum | Sin quorum → Defeated |
| Fuzz | Thresholds, quorum, delays |

---

## 9. Seguridad (checklist)

- [x] CEI en funciones con llamadas externas.
- [x] Timelock obligatorio para toda ejecución exitosa.
- [x] Snapshots/checkpoints en bloque de snapshot de la propuesta.
- [x] Custom errors en todos los reverts de dominio.
- [x] Roles Timelock: solo Governor propone; admin renunciado o 2-step.
- [x] Sin floating pragma; sin `transfer`/`send` de ETH.
- [x] Auditoría SWC (`doc/SWC-AUDIT.md`) alineada a módulo 08.
- [x] Fuzz threshold / quorum / delay + suite `test/attack/`.

---

## 10. Entregables de documentación (`doc/`)

| Archivo | Contenido |
|---------|-----------|
| `planificacion.md` | Este documento |
| `SWC-AUDIT.md` | Matriz SWC-100–136 + riesgos informativos |
| `diagrama-de-clases.md` | Estructura y relaciones entre contratos |
| `diagrama-de-flujo.md` | Máquina de estados de la propuesta |
| `flujograma.md` | Flujo actor-sistema extremo a extremo |

---

## 11. Criterios de aceptación

1. Compila con `pragma solidity 0.8.24`.
2. Ciclo de gobernanza completo pasa en Foundry.
3. Test anti double-voting / flash-loan en verde.
4. Execute prematuro falla con error de delay.
5. Fuzz de parámetros críticos sin fallos inesperados.
6. NatSpec + custom errors en APIs públicas.
