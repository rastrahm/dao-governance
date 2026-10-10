const I18N = {
  es: {
    'html.lang': 'es',
    'meta.title': 'DAO Governance + Timelock — Rolando Strahm',
    'meta.description':
      'Gobernanza DAO on-chain con ERC20Votes, Timelock MIN_DELAY, optimización de gas y auditoría SWC. Foundry · Solidity 0.8.24 · Next.js.',

    'nav.overview': 'Proyecto',
    'nav.pillars': 'Pilares',
    'nav.gas': 'Gas',
    'nav.swc': 'SWC',
    'nav.process': 'Proceso',
    'nav.attacks': 'Ataques',
    'nav.repos': 'Repos',
    'nav.close': '← Cerrar',

    'hero.tag': '// MÓDULO 10 · PORTFOLIO WEB3',
    'hero.title': 'DAO GOVERNANCE<br>+ TIMELOCK',
    'hero.role': 'Solidity 0.8.24 · Foundry · Gas · SWC · Next.js',
    'hero.sub':
      'Sistema de gobernanza on-chain con poder de voto checkpointed, ciclo de propuestas y Timelock con delay mínimo — más UI live, gas consciente y matriz SWC sin hallazgos explotables.',
    'hero.cta1': 'Ver en GitHub',
    'hero.cta2': 'Ver en GitLab',

    'ov.eyebrow': '// 01 — CONTEXTO',
    'ov.title': 'Por qué este proyecto',
    'ov.lead':
      'Para no oxidar mis conocimientos en <strong>Solidity</strong>, construí una DAO de punta a punta con Foundry: token de votos, Governor, Timelock y un target demo. El foco está en <strong>optimización de gas</strong>, <strong>verificación SWC</strong> y el flujo real Delegar → Proponer → Votar → Encolar → Ejecutar.',

    'pi.eyebrow': '// 02 — TRES PILARES',
    'pi.title': 'Qué entrega el módulo',
    'p1.num': '// PILAR_01',
    'p1.title': 'Gobernanza on-chain',
    'p1.desc':
      'GovernanceToken (ERC20Votes), MyGovernor y TimelockController propio: delegación, quorum, umbral y ejecución diferida sobre Box.',
    'p1.l1': 'Checkpoints anti flash-loan voting',
    'p1.l2': 'Estados Pending → … → Executed',
    'p1.l3': 'MIN_DELAY obligatorio post-Succeeded',
    'p2.num': '// PILAR_02',
    'p2.title': 'Optimización de gas',
    'p2.desc':
      'Immutables, role hashes constant, custom errors, APIs external y CEI + nonReentrant solo donde hay .call.',
    'p2.l1': 'MIN_DELAY immutable (sin SLOAD)',
    'p2.l2': 'PROPOSER / EXECUTOR keccak constant',
    'p2.l3': 'via_ir + custom errors compactos',
    'p3.num': '// PILAR_03',
    'p3.title': 'Verificación de ataques',
    'p3.desc':
      'Matriz SWC-100–136, fuzz ≥1000 runs y suite attack: reentrancy, unauthorized y votos post-snapshot.',
    'p3.l1': '0 vulnerabilidades SWC explotables',
    'p3.l2': '4 informativos documentados',
    'p3.l3': 'Attack + fuzz en Foundry',

    'gas.eyebrow': '// 03 — OPTIMIZACIÓN DE GAS',
    'gas.title': 'Menos SLOAD, más control',
    'gas.lead':
      'En gobernanza el hot path es votar, encolar y ejecutar. Cada decisión de gas busca lecturas baratas y reverts compactos, sin micro-ahorros que rompan claridad o seguridad. Tradeoffs documentados en NatSpec / auditoría.',
    'gas.th1': 'Optimización',
    'gas.th2': 'Tradeoff / efecto',
    'gas.r1a': 'MIN_DELAY immutable en Timelock',
    'gas.r1b': 'Lectura ~100 gas vs SLOAD de storage en cada chequeo de delay',
    'gas.r2a': 'PROPOSER_ROLE / EXECUTOR_ROLE / CANCELLER_ROLE constant',
    'gas.r2b': 'keccak precomputado; sin hash en runtime por llamada de rol',
    'gas.r3a': 'Custom errors (MinDelayNotMet, ExecutionFailed, …)',
    'gas.r3b': 'Reverts más baratos que require con strings',
    'gas.r4a': 'API pública external + view selectivas',
    'gas.r4b': 'ABI más eficiente; menos copia de calldata a memory',
    'gas.r5a': 'CEI + nonReentrant solo en execute / executeBatch',
    'gas.r5b': 'Guardia de gas donde hay .call; sin overhead en schedule puro',
    'gas.r6a': 'hashOperation / batch con abi.encode',
    'gas.r6b': 'IDs estables sin encodePacked ambiguo; coste predecible',
    'gas.r7a': 'foundry.toml via_ir = true en Deploy',
    'gas.r7b': 'Evita stack-too-deep; bytecode optimizado por IR (tradeoff: compile time)',

    'swc.eyebrow': '// 04 — VERIFICACIÓN SWC',
    'swc.title': 'SWC Registry · EIP-1470',
    'swc.lead':
      'Matriz completa <strong>SWC-100 → SWC-136</strong> sobre Token, Governor, Timelock y Box. Informe en <code>doc/SWC-AUDIT-ES.md</code>. Conclusión: <strong>0 vulnerabilidades explotables</strong> en el alcance v1.',
    'swc.s1': 'Mitigados / N/A',
    'swc.s2': 'Informativos (diseño)',
    'swc.s3': 'Vulnerables',
    'swc.th1': 'SWC clave',
    'swc.th2': 'Mitigación en los contratos',
    'swc.r101': 'Integer overflow: Solidity 0.8.24 + SafeCast OZ / fuzz amounts',
    'swc.r103': 'Floating pragma: pragma solidity 0.8.24 fijo en todo src/',
    'swc.r104': 'Unchecked call: Timelock verifica success y burbujea returndata',
    'swc.r107': 'Reentrancy: nonReentrant + CEI (_beforeExecute marca done antes del call)',
    'swc.r121': 'Signature replay: nonces OZ en Permit / delegateBySig / votos firmados',
    'swc.r133': 'Hash collisions: hashOperation* con abi.encode (no packed dinámicos)',
    'swc.info': 'INFORMATIVO',
    'swc.i1t': 'block.timestamp (MIN_DELAY)',
    'swc.i1d':
      'SWC-116: el delay usa timestamp. Aceptable para buffers de gobernanza (horas/días); no para subastas de último segundo.',
    'swc.i2t': 'Orden de execute / MEV',
    'swc.i2d':
      'SWC-114: con EXECUTOR abierto, cualquiera puede ejecutar una op ready. Intencional; el delay da ventana de salida social.',

    'pr.eyebrow': '// 05 — PROCESO',
    'pr.title': 'Fases 0–6 cerradas',
    'pr.lead':
      'Entrega por gates: bootstrap, token, Timelock+Box, Governor, fuzz/attack/SWC, deploy Anvil y frontend live con wallet.',
    'ph.0': 'Bootstrap Foundry + OZ 5.2',
    'ph.12': 'GovernanceToken + Timelock/Box',
    'ph.34': 'MyGovernor + fuzz / attack / SWC',
    'ph.56': 'Deploy script + frontend Next.js',
    'st.1': 'Fases',
    'st.2': 'Contratos',
    'st.3': 'SWC críticos',
    'st.4': 'Informativos SWC',
    'term.label': 'rolando@strahm:~/10-dao-governance',
    'term.1': 'forge test --match-path test/attack/',
    'term.2': '[PASS] TimelockAttack · reentrancy + unauthorized',
    'term.3': 'cat doc/SWC-AUDIT-ES.md | head',
    'term.4': 'Vulnerable: 0 · Informativos: 4 · Mitigados/N/A: 32',
    'term.5': 'echo status',
    'term.6': 'MODULE_10_CLOSED · DAO_LIFECYCLE_OK',

    'at.eyebrow': '// 06 — CAMPAÑAS DE ATAQUE',
    'at.title': 'Defensivo, no ofensivo',
    'at.lead':
      'Tests Foundry donde el “ataque” debe revertir. Sin PoCs ofensivos: reentrancy en Timelock, roles, votos post-snapshot, ejecución antes del delay y fuzz de umbrales.',
    'cA.t': 'Reentrancy',
    'cA.d': 'Callback malicioso en execute; nonReentrant + CEI.',
    'cB.t': 'Unauthorized',
    'cB.d': 'schedule / cancel / execute sin rol → revert.',
    'cC.t': 'Flash-loan vote',
    'cC.d': 'Tokens post-snapshot no pesan en la propuesta.',
    'cD.t': 'MinDelay',
    'cD.d': 'Execute antes de eta → MinDelayNotMet.',
    'cE.t': 'Fuzz',
    'cE.d': 'Umbrales, quorum y delays con bound() ≥1000 runs.',

    're.eyebrow': '// 07 — CÓDIGO ABIERTO',
    're.title': 'Repositorios',
    're.lead':
      'El mismo código está en GitHub y GitLab: contratos, tests, SWC, deploy y frontend.',
    're.cta': 'Contactar',
    're.linkedin': 'LinkedIn',

    'ft.left': 'ROLANDO STRAHM — DAO Governance + Timelock · Portfolio',
    'ft.right': 'FOUNDRY · SOLC 0.8.24 · ALL_SYSTEMS_OPERATIONAL',
  },

  en: {
    'html.lang': 'en',
    'meta.title': 'DAO Governance + Timelock — Rolando Strahm',
    'meta.description':
      'On-chain DAO governance with ERC20Votes, Timelock MIN_DELAY, gas optimization, and SWC audit. Foundry · Solidity 0.8.24 · Next.js.',

    'nav.overview': 'Project',
    'nav.pillars': 'Pillars',
    'nav.gas': 'Gas',
    'nav.swc': 'SWC',
    'nav.process': 'Process',
    'nav.attacks': 'Attacks',
    'nav.repos': 'Repos',
    'nav.close': '← Close',

    'hero.tag': '// MODULE 10 · WEB3 PORTFOLIO',
    'hero.title': 'DAO GOVERNANCE<br>+ TIMELOCK',
    'hero.role': 'Solidity 0.8.24 · Foundry · Gas · SWC · Next.js',
    'hero.sub':
      'On-chain governance with checkpointed voting power, full proposal lifecycle, and a minimum-delay Timelock — plus live UI, gas-aware design, and an SWC matrix with zero exploitable findings.',
    'hero.cta1': 'View on GitHub',
    'hero.cta2': 'View on GitLab',

    'ov.eyebrow': '// 01 — CONTEXT',
    'ov.title': 'Why this project',
    'ov.lead':
      'To keep my <strong>Solidity</strong> skills sharp, I built an end-to-end DAO with Foundry: voting token, Governor, Timelock, and a demo target. Focus on <strong>gas optimization</strong>, <strong>SWC verification</strong>, and the real flow Delegate → Propose → Vote → Queue → Execute.',

    'pi.eyebrow': '// 02 — THREE PILLARS',
    'pi.title': 'What the module ships',
    'p1.num': '// PILLAR_01',
    'p1.title': 'On-chain governance',
    'p1.desc':
      'GovernanceToken (ERC20Votes), MyGovernor, and a custom TimelockController: delegation, quorum, threshold, and delayed execution on Box.',
    'p1.l1': 'Checkpoints vs flash-loan voting',
    'p1.l2': 'States Pending → … → Executed',
    'p1.l3': 'Mandatory MIN_DELAY after Succeeded',
    'p2.num': '// PILLAR_02',
    'p2.title': 'Gas optimization',
    'p2.desc':
      'Immutables, constant role hashes, custom errors, external APIs, and CEI + nonReentrant only where .call exists.',
    'p2.l1': 'Immutable MIN_DELAY (no SLOAD)',
    'p2.l2': 'Constant PROPOSER / EXECUTOR keccak',
    'p2.l3': 'via_ir + compact custom errors',
    'p3.num': '// PILLAR_03',
    'p3.title': 'Attack verification',
    'p3.desc':
      'SWC-100–136 matrix, fuzz ≥1000 runs, and attack suite: reentrancy, unauthorized access, and post-snapshot votes.',
    'p3.l1': '0 exploitable SWC findings',
    'p3.l2': '4 documented informational items',
    'p3.l3': 'Foundry attack + fuzz suites',

    'gas.eyebrow': '// 03 — GAS OPTIMIZATION',
    'gas.title': 'Fewer SLOADs, more control',
    'gas.lead':
      'In governance the hot path is vote, queue, and execute. Gas choices favor cheap reads and compact reverts—without micro-savings that hurt clarity or safety. Tradeoffs documented in NatSpec / audit notes.',
    'gas.th1': 'Optimization',
    'gas.th2': 'Tradeoff / effect',
    'gas.r1a': 'Immutable MIN_DELAY in Timelock',
    'gas.r1b': '~100 gas reads vs storage SLOAD on every delay check',
    'gas.r2a': 'Constant PROPOSER_ROLE / EXECUTOR_ROLE / CANCELLER_ROLE',
    'gas.r2b': 'Precomputed keccak; no runtime hash per role check',
    'gas.r3a': 'Custom errors (MinDelayNotMet, ExecutionFailed, …)',
    'gas.r3b': 'Cheaper reverts than require with strings',
    'gas.r4a': 'external public API + selective view',
    'gas.r4b': 'More efficient ABI; less calldata→memory copying',
    'gas.r5a': 'CEI + nonReentrant only on execute / executeBatch',
    'gas.r5b': 'Gas guard where .call exists; no overhead on pure schedule',
    'gas.r6a': 'hashOperation / batch via abi.encode',
    'gas.r6b': 'Stable IDs without ambiguous encodePacked; predictable cost',
    'gas.r7a': 'foundry.toml via_ir = true for Deploy',
    'gas.r7b': 'Avoids stack-too-deep; IR-optimized bytecode (tradeoff: compile time)',

    'swc.eyebrow': '// 04 — SWC VERIFICATION',
    'swc.title': 'SWC Registry · EIP-1470',
    'swc.lead':
      'Full matrix <strong>SWC-100 → SWC-136</strong> across Token, Governor, Timelock, and Box. Report in <code>doc/SWC-AUDIT-EN.md</code>. Conclusion: <strong>0 exploitable vulnerabilities</strong> in v1 scope.',
    'swc.s1': 'Mitigated / N/A',
    'swc.s2': 'Informational (design)',
    'swc.s3': 'Vulnerable',
    'swc.th1': 'Key SWC',
    'swc.th2': 'Mitigation in the contracts',
    'swc.r101': 'Integer overflow: Solidity 0.8.24 + OZ SafeCast / fuzz amounts',
    'swc.r103': 'Floating pragma: fixed pragma solidity 0.8.24 across src/',
    'swc.r104': 'Unchecked call: Timelock checks success and bubbles returndata',
    'swc.r107': 'Reentrancy: nonReentrant + CEI (_beforeExecute marks done before call)',
    'swc.r121': 'Signature replay: OZ nonces on Permit / delegateBySig / signed votes',
    'swc.r133': 'Hash collisions: hashOperation* with abi.encode (no packed dynamics)',
    'swc.info': 'INFORMATIONAL',
    'swc.i1t': 'block.timestamp (MIN_DELAY)',
    'swc.i1d':
      'SWC-116: delay uses timestamp. Acceptable for governance buffers (hours/days); not for last-second auctions.',
    'swc.i2t': 'Execute ordering / MEV',
    'swc.i2d':
      'SWC-114: with open EXECUTOR, anyone may execute a ready op. Intentional; delay gives a social exit window.',

    'pr.eyebrow': '// 05 — PROCESS',
    'pr.title': 'Phases 0–6 closed',
    'pr.lead':
      'Gate-based delivery: bootstrap, token, Timelock+Box, Governor, fuzz/attack/SWC, Anvil deploy, and live wallet frontend.',
    'ph.0': 'Foundry bootstrap + OZ 5.2',
    'ph.12': 'GovernanceToken + Timelock/Box',
    'ph.34': 'MyGovernor + fuzz / attack / SWC',
    'ph.56': 'Deploy script + Next.js frontend',
    'st.1': 'Phases',
    'st.2': 'Contracts',
    'st.3': 'Critical SWC',
    'st.4': 'Informational SWC',
    'term.label': 'rolando@strahm:~/10-dao-governance',
    'term.1': 'forge test --match-path test/attack/',
    'term.2': '[PASS] TimelockAttack · reentrancy + unauthorized',
    'term.3': 'cat doc/SWC-AUDIT-EN.md | head',
    'term.4': 'Vulnerable: 0 · Informational: 4 · Mitigated/N/A: 32',
    'term.5': 'echo status',
    'term.6': 'MODULE_10_CLOSED · DAO_LIFECYCLE_OK',

    'at.eyebrow': '// 06 — ATTACK CAMPAIGNS',
    'at.title': 'Defensive, not offensive',
    'at.lead':
      'Foundry tests where the “attack” must revert. No offensive PoCs: Timelock reentrancy, roles, post-snapshot votes, early execute, and threshold fuzzing.',
    'cA.t': 'Reentrancy',
    'cA.d': 'Malicious callback on execute; nonReentrant + CEI.',
    'cB.t': 'Unauthorized',
    'cB.d': 'schedule / cancel / execute without role → revert.',
    'cC.t': 'Flash-loan vote',
    'cC.d': 'Post-snapshot tokens do not weigh on that proposal.',
    'cD.t': 'MinDelay',
    'cD.d': 'Execute before eta → MinDelayNotMet.',
    'cE.t': 'Fuzz',
    'cE.d': 'Thresholds, quorum, and delays with bound() ≥1000 runs.',

    're.eyebrow': '// 07 — OPEN SOURCE',
    're.title': 'Repositories',
    're.lead':
      'The same codebase is on GitHub and GitLab: contracts, tests, SWC, deploy, and frontend.',
    're.cta': 'Contact',
    're.linkedin': 'LinkedIn',

    'ft.left': 'ROLANDO STRAHM — DAO Governance + Timelock · Portfolio',
    'ft.right': 'FOUNDRY · SOLC 0.8.24 · ALL_SYSTEMS_OPERATIONAL',
  },
};

function setLanguage(lang) {
  const dict = I18N[lang] || I18N.es;
  document.documentElement.lang = dict['html.lang'];
  document.title = dict['meta.title'];

  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc && dict['meta.description']) {
    metaDesc.setAttribute('content', dict['meta.description']);
  }

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const val = dict[key];
    if (val == null) return;
    if (el.hasAttribute('data-i18n-html')) el.innerHTML = val;
    else el.textContent = val;
  });

  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });

  localStorage.setItem('dao-portfolio-lang', lang);

  try {
    const url = new URL(window.location.href);
    url.searchParams.set('lang', lang);
    history.replaceState(null, '', url);
  } catch (_) {
    /* file:// without opaque origin quirks */
  }
}

function initI18n() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('lang');
  const saved = localStorage.getItem('dao-portfolio-lang');
  const preferred =
    (fromQuery === 'en' || fromQuery === 'es' ? fromQuery : null) ||
    saved ||
    (navigator.language?.startsWith('en') ? 'en' : 'es');

  setLanguage(preferred);

  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
  });
}

document.addEventListener('DOMContentLoaded', initI18n);
