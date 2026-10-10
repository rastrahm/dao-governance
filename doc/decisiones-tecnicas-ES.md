# Decisiones técnicas, lógica y gas — Módulo 10 DAO Governance

Documento de referencia para entender **qué se decidió**, **por qué**, **cómo fluye el sistema** y **dónde aún se puede ahorrar gas**.

> 🌐 [English](./decisiones-tecnicas-EN.md) · **Español**

Relacionado: [`planificacion-ES.md`](./planificacion-ES.md), [`SWC-AUDIT-ES.md`](./SWC-AUDIT-ES.md), [`diagrama-de-flujo-ES.md`](./diagrama-de-flujo-ES.md).

---

## 1. Arquitectura en una frase

Un **token de votos** (checkpoints + delegación) alimenta un **Governor** que solo puede **agendar** acciones; un **Timelock** propio espera `MIN_DELAY` y recién ahí hace `.call` al **target** (p. ej. `Box`).

```
Holder → delegate → getVotes
     ↓
MyGovernor: propose → vote → queue
     ↓
TimelockController: schedule → wait MIN_DELAY → execute (.call)
     ↓
Box (u otro contrato owned por el Timelock)
```

---

## 2. Decisiones técnicas

### 2.1 Stack y compilador

| Decisión | Elección | Motivo |
|----------|----------|--------|
| Pragma | `solidity 0.8.24` fijo (sin `^`) | Evita floating pragma (SWC-103); alinea suite |
| Tooling | Foundry (`forge` / `anvil` / `cast`) | Tests con `vm.warp` / `vm.roll`, fuzz, gas report |
| EVM | Cancun | Perfil actual del monorepo |
| Optimizer | `optimizer = true`, `runs = 10_000` | Favorece **runtime** (votos / execute frecuentes) vs deploy barato |
| IR | `via_ir = true` | Evita `stack-too-deep` en `Deploy.s.sol`; bytecode vía pipeline IR |

### 2.2 Librerías vs código propio

| Pieza | Decisión | Motivo |
|-------|----------|--------|
| `GovernanceToken` | OZ `ERC20` + `ERC20Permit` + `ERC20Votes` + `Ownable2Step` | Checkpoints y Permit auditados; menos superficie casera |
| `MyGovernor` | OZ Governor + Settings + CountingSimple + Votes + QuorumFraction | Estándar de ciclo de propuestas |
| **Timelock** | **Implementación propia** (no `TimelockController` de OZ ni `GovernorTimelockControl`) | Control total de errores (`MinDelayNotMet`, `ExecutionFailed`), CEI explícito y cableado al módulo |
| `Box` | Ownable mínimo | Target demo; solo el Timelock es owner |

**Tradeoff Timelock propio:** más código que mantener y que auditar; a cambio, errores del módulo y tests de ataque alineados al diseño del curso (no a la API exacta de OZ Timelock).

### 2.3 Poder de voto

| Decisión | Motivo |
|----------|--------|
| ERC20Votes + checkpoints | El peso se fija en el **snapshot** de la propuesta; tokens comprados después no cuentan |
| Hay que `delegate` (aunque sea a uno mismo) | Sin delegación, `getVotes == 0` aunque haya balance — patrón OZ intencional |
| Un solo token de gobernanza | No un token por votación; una unidad de poder para toda la DAO |

### 2.4 Ciclo de propuestas

| Decisión | Motivo |
|----------|--------|
| `proposalNeedsQueuing() → true` | Toda propuesta exitosa **debe** pasar por Timelock |
| `proposalThreshold` | Anti-spam de propuestas |
| Quorum por fracción (`quorumNumerator`, den. 100) | Participación mínima configurable / fuzzable |
| Overrides de `castVote*` | Requieren estado `Active`; si no → `VotingClosed` / `ProposalNotFound` |
| `queue` solo desde `Succeeded` | Evita encolar basura |
| `execute` desde `Succeeded` o `Queued` | El Timelock impone el delay real |

Estados (vista Governor + Timelock):

`Pending` → `Active` → `Defeated` | `Succeeded` → `Queued` → `Executed` | `Expired` / `Canceled`

### 2.5 Timelock y roles

| Decisión | Motivo |
|----------|--------|
| `MIN_DELAY` **immutable** | No cambia post-deploy; lectura barata |
| `PROPOSER` / `CANCELLER` = Governor (post-deploy) | Solo lo que la DAO votó se agenda / cancela vía Governor |
| `EXECUTOR` = `address(0)` (abierto) | Cualquiera puede ejecutar una op **ready** (sin privilegio de ejecución) |
| Admin EOA renuncia tras setup | El Timelock se administra a sí mismo (`DEFAULT_ADMIN_ROLE` en el contrato) |
| Ejecución con `.call` + chequeo `success` | Acciones arbitrarias; si falla → bubble / `ExecutionFailed` |
| CEI + `nonReentrant` en `execute` / `executeBatch` | Mitiga reentrancy (SWC-107); suite en `test/attack/` |

### 2.6 Seguridad y calidad

| Decisión | Motivo |
|----------|--------|
| Custom errors (sin `require` strings) | Gas + claridad; regla del monorepo |
| Fuzz ≥ 1000 runs | `foundry.toml` + `test/fuzz/` |
| Matriz SWC-100–136 | `doc/SWC-AUDIT-ES.md` — **0 vulnerables**, 4 informativos |
| Frontend Next.js separado | Demo live (wallet Anvil); perfiles UI ≠ permisos on-chain |

### 2.7 Deploy (Anvil / demo)

Orden en `script/Deploy.s.sol`:

1. Token  
2. Timelock (admin = deployer temporal, executors abiertos)  
3. Governor  
4. Grant `PROPOSER` + `CANCELLER` al Governor  
5. Renunciar `DEFAULT_ADMIN_ROLE` del deployer en Timelock  
6. Box con owner = Timelock  
7. Mint inicial al deployer  

Defaults locales típicos: `MIN_DELAY=60`, `VOTING_PERIOD=10` (para no esperar días en demo).

---

## 3. Lógica que sigue el sistema

### 3.1 Flujo feliz (end-to-end)

1. **Mint / hold** tokens (owner del token; en demo, deployer).  
2. **Delegar** (`delegate(self)` o a otro) → aparecen votos en el siguiente checkpoint.  
3. **Proponer** (si `getVotes(proposer) ≥ proposalThreshold`): targets + values + calldatas + description.  
   - Se fija **snapshot** (`voteStart` tras `votingDelay`).  
4. **Esperar** `votingDelay` bloques → estado `Active`.  
5. **Votar** For / Against / Abstain con el peso del snapshot.  
6. Tras `votingPeriod`: si quorum + más a favor → `Succeeded`; si no → `Defeated`.  
7. **Queue**: Governor agenda batch en Timelock con delay ≥ `MIN_DELAY` → `Queued`.  
8. **Esperar** hasta `eta` (`block.timestamp`).  
9. **Execute**: Timelock marca done (CEI) y hace `.call` a cada target (p. ej. `Box.store`) → `Executed`.

### 3.2 Por qué el snapshot importa

Al crear la propuesta, el Governor usa el poder de voto **histórico** en un bloque concreto. Si alguien pide un flash loan **después** de ese snapshot, esos tokens **no** aumentan su voto en esa propuesta. Eso es la defensa “anti flash-loan voting” del módulo.

### 3.3 Por qué el Timelock importa

Aunque gane una propuesta maliciosa, nadie ejecuta al instante: hay una ventana (`MIN_DELAY`) para salir / alertar / cancelar (si hay rol). El tiempo se mide con `block.timestamp` (aceptable para delays largos; informativo SWC-116).

### 3.4 Quién puede hacer qué (on-chain)

| Acción | Quién |
|--------|--------|
| `mint` | Owner del token (idealmente Timelock vía propuesta a futuro) |
| `delegate` / `transfer` | Holders |
| `propose` / `castVote` | Quien tenga poder / umbral |
| `queue` | Cualquiera tras `Succeeded` (vía Governor; agenda el Timelock como proposer) |
| `schedule` directo en Timelock | Solo `PROPOSER_ROLE` (Governor) |
| `execute` Timelock | Quien tenga `EXECUTOR` (en demo: cualquiera) |
| `Box.store` | Solo owner = Timelock |

Los **perfiles de la UI** (Observador / Titular / …) solo muestran u ocultan paneles; no dan roles on-chain.

---

## 4. Gas: qué ya se hizo y cómo mejorar

### 4.1 Optimizaciones ya aplicadas

| Técnica | Dónde | Efecto |
|---------|--------|--------|
| `MIN_DELAY` immutable | Timelock | Evita SLOAD (~2100) en lecturas del delay |
| Role IDs `constant` | Timelock | `keccak256` de strings en compile-time |
| Custom errors | Todo `src/` | Reverts más baratos que strings |
| Funciones `external` | APIs públicas | Menos copia calldata→memory vs `public` innecesario |
| CEI + `nonReentrant` solo en execute | Timelock | No pagás el guard en `schedule` puro |
| `abi.encode` en hashes de ops | Timelock | Correctitud (anti colisión) con coste predecible |
| `optimizer_runs = 10_000` | foundry | Prioriza llamadas repetidas |
| `via_ir` | foundry | Compila scripts gordos; IR puede ayudar al codegen |

El **token y el Governor** heredan mucho de OZ: ahí el gas “base” es el de la librería (checkpoints, storage de propuestas, etc.), no un ERC-20 minimalista a mano.

### 4.2 Mejoras de gas posibles (sin cambiar el producto)

Prioridad orientativa: impacto vs esfuerzo / riesgo.

#### Alta prioridad / buen ROI

1. **Cachear lecturas de storage en hot paths**  
   En Timelock, si una función lee `_timestamps[id]` varias veces, guardar en variable local (ya se hace en varios `isOperation*`; revisar `execute` / `_beforeExecute` / `_after` para no repetir SLOAD).

2. **`calldata` en vez de `memory` en entrypoints del Governor**  
   Donde OZ lo permita overrides, preferir `calldata` para arrays/bytes en `queue` / `execute` públicos (menos copia). Limitación: firmas de OZ a veces fuerzan `memory`.

3. **Eventos más baratos**  
   En `scheduleBatch`, emitir un evento por índice es caro en batches largos. Alternativa: un solo evento con hash del batch + length (pierde indexabilidad fina en exploradores).

4. **Límite `MAX_BATCH_SIZE`**  
   No ahorra gas por tx pequeña, pero evita OOG / griefing en batches enormes (SWC-126/128 informativos). Mejora operativa + techo de coste.

#### Media prioridad

5. **Reducir storage del mapping `_timelockIds`**  
   Hoy `proposalId → bytes32`. Se podría derivar el id on-the-fly si el hash es determinista desde targets/values/calldatas/salt (como ya hace el Timelock). Tradeoff: más CPU keccak vs 1 SLOAD; medir con `forge test --gas-report`.

6. **Packed structs / menos slots en estado propio**  
   Poco margen: casi todo el estado “gordo” está en OZ Governor/Votes.

7. **`unchecked` en bucles `for (uint256 i; i < length; ++i)`**  
   Tras fijar `length` y acotar `MAX_BATCH_SIZE`, el `++i` puede ir en `unchecked` (ahorro pequeño por iteración).

8. **Custom errors vs OZ errors en paths override**  
   Ya se usan errores del módulo en bordes (`VotingClosed`, etc.). No mezclar `require` strings nuevos.

#### Baja prioridad / tradeoffs fuertes

9. **Bajar `optimizer_runs`**  
   Deploy más barato, runtime más caro. Solo si el cuello es deploy en L2 barata y poco uso.

10. **Sacar `via_ir` si ya no hace falta**  
    Compiles más rápidos; medir tamaño/gas de bytecode antes/después.

11. **Timelock OZ en vez del propio**  
    Menos código propio, pero **no** es mejora de gas garantizada; cambia superficie y errores.

12. **Governor más “minimal” sin tantas extensiones OZ**  
    Ahorro real de bytecode/gas, coste alto de seguridad y mantenimiento.

### 4.3 Cómo medir antes de “optimizar”

```bash
export PATH="$HOME/.foundry/bin:$PATH"
forge test --gas-report
forge snapshot   # o forge test --gas-report --match-contract MyGovernor
```

Comparar funciones calientes: `castVote`, `propose`, `queue`, `execute`, `schedule`, `delegate`.

Regla práctica: **no** micro-optimizar sin snapshot; en DAOs el coste de una tx mala de seguridad supera mil gas.

### 4.4 Lo que no conviene “ahorrar”

- Quitar checkpoints / snapshot → rompe anti flash-loan.  
- Quitar Timelock / `MIN_DELAY` → rompe el modelo de salida.  
- `encodePacked` suelto en hashes de ops dinámicas → riesgo SWC-133.  
- Quitar `nonReentrant` en execute “porque el CEI alcanza” → regresiones de reentrancy.

---

## 5. Mapa rápido de archivos

| Ruta | Rol |
|------|-----|
| `src/GovernanceToken.sol` | ERC20 + Permit + Votes |
| `src/MyGovernor.sol` | Propuestas, votos, queue/execute → Timelock |
| `src/TimelockController.sol` | Delay + `.call` + roles |
| `src/Box.sol` | Target demo |
| `script/Deploy.s.sol` | Cableado Anvil |
| `test/`, `test/fuzz/`, `test/attack/` | Lifecycle, fuzz, reentrancy/unauthorized |
| `frontend/` | UI live ES |
| `portfolio/` | Página explicativa portafolio ES/EN |

---

## 6. Resumen

- **Decisiones:** OZ para token/Governor; Timelock propio; votos por checkpoint; ejecución siempre diferida; roles duros en deploy; custom errors + Foundry + SWC.  
- **Lógica:** Delegar → Proponer (snapshot) → Votar → Queue → Wait → Execute → efecto on-chain.  
- **Gas:** Ya hay immutables, constants, errors y optimizer agresivo; el margen real está en menos eventos por batch, menos SLOADs repetidos, calldata, techo de batch y medición con gas report — sin tocar el modelo de seguridad.
