import Link from "next/link";
import { AppToolbar } from "@/components/AppToolbar";

/**
 * @description Manual in-app: arquitectura DAO, wallet Anvil y ciclo de gobernanza.
 * @returns Guía de ayuda ampliada.
 */
export default function AyudaPage() {
  return (
    <div className="app-grid">
      <AppToolbar showHome />

      <header className="hero">
        <p className="eyebrow">Módulo 10</p>
        <h1 className="brand" style={{ fontSize: "2.2rem" }}>
          Ayuda
        </h1>
        <p className="lede">
          Cómo funciona esta DAO on-chain: tokens de voto, propuestas, Timelock y la prueba con MetaMask
          + Anvil.
        </p>
      </header>

      <nav className="panel" aria-label="Índice">
        <h2 className="panel-title">Índice</h2>
        <ul className="help-toc">
          <li>
            <a href="#que-es">Qué es</a>
          </li>
          <li>
            <a href="#piezas">Piezas</a>
          </li>
          <li>
            <a href="#poder">Poder de voto</a>
          </li>
          <li>
            <a href="#ciclo">Ciclo</a>
          </li>
          <li>
            <a href="#timelock">Timelock</a>
          </li>
          <li>
            <a href="#perfiles">Perfiles UI</a>
          </li>
          <li>
            <a href="#setup">Arranque</a>
          </li>
          <li>
            <a href="#wallet">Wallet</a>
          </li>
          <li>
            <a href="#ui">Botones</a>
          </li>
          <li>
            <a href="#problemas">Problemas</a>
          </li>
        </ul>
      </nav>

      <section className="panel" id="que-es">
        <h2 className="panel-title">1. Qué es esta DAO</h2>
        <p className="muted">
          Una <strong>DAO de gobernanza on-chain</strong> decide cambios mediante votos ponderados por
          tokens. Nadie (ni un “admin” de la UI) ejecuta a mano el resultado: si una propuesta gana, pasa
          por un <strong>Timelock</strong> y recién después se aplica (en la demo, escribir un valor en el
          contrato <code>Box</code>).
        </p>
        <p className="help-callout">
          No hay un panel de administrador mágico. Tras el deploy, el rol admin del Timelock se renuncia:
          lo que manda es el token + el Governor + el delay.
        </p>
      </section>

      <section className="panel" id="piezas">
        <h2 className="panel-title">2. Piezas del sistema</h2>
        <dl className="help-dl">
          <div>
            <dt>GovernanceToken (ERC-20Votes)</dt>
            <dd>
              Token de la DAO. Tener balance <strong>no alcanza</strong> para votar: hay que{" "}
              <strong>delegar</strong> (a vos o a otro). Guarda checkpoints históricos para evitar que un
              flash loan compre votos a mitad de una propuesta.
            </dd>
          </div>
          <div>
            <dt>MyGovernor</dt>
            <dd>
              Crea propuestas, cuenta votos (a favor / en contra / abstención), exige umbral y quorum, y
              manda a encolar/ejecutar vía Timelock.
            </dd>
          </div>
          <div>
            <dt>TimelockController</dt>
            <dd>
              Cola con espera mínima (<code>MIN_DELAY</code>). Solo ejecuta lo que ya fue agendado tras el
              delay, con <code>.call</code> al target.
            </dd>
          </div>
          <div>
            <dt>Box</dt>
            <dd>
              Contrato demo gobernado: solo el Timelock (como owner) puede <code>store</code>. Si Ejecutar
              funciona, ves el nuevo valor en la UI.
            </dd>
          </div>
        </dl>
      </section>

      <section className="panel" id="poder">
        <h2 className="panel-title">3. Poder de voto</h2>
        <ul className="help-list">
          <li>
            <strong>Delegar</strong> activa el poder. Sin delegar, <code>getVotes</code> es 0 aunque
            tengas tokens.
          </li>
          <li>
            Al crear una propuesta se fija un <strong>snapshot</strong> (bloque <code>voteStart</code>).
            Los tokens que lleguen <em>después</em> de ese snapshot no cuentan para esa votación.
          </li>
          <li>
            Por eso hay <code>votingDelay</code>: un margen en bloques entre “proponer” y “poder votar”.
          </li>
        </ul>
      </section>

      <section className="panel" id="ciclo">
        <h2 className="panel-title">4. Ciclo de una propuesta</h2>
        <table className="help-table">
          <thead>
            <tr>
              <th>Estado</th>
              <th>Significado</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Pendiente</td>
              <td>Creada; aún no abrió la votación (falta el votingDelay).</td>
            </tr>
            <tr>
              <td>Activa</td>
              <td>Se puede votar hasta que termine el votingPeriod.</td>
            </tr>
            <tr>
              <td>Aprobada</td>
              <td>Ganó (quorum + más votos a favor). Lista para Encolar.</td>
            </tr>
            <tr>
              <td>Derrotada</td>
              <td>Perdió o no hubo quorum.</td>
            </tr>
            <tr>
              <td>Encolada</td>
              <td>En el Timelock; corre el MIN_DELAY (ventana de salida).</td>
            </tr>
            <tr>
              <td>Ejecutada</td>
              <td>El Timelock ya ejecutó la acción (p. ej. Box.store).</td>
            </tr>
          </tbody>
        </table>
        <p className="help-subtitle">Orden obligatorio</p>
        <ol className="help-list">
          <li>Delegar</li>
          <li>Proponer</li>
          <li>Abrir votación → Votar</li>
          <li>Cerrar votación → Encolar</li>
          <li>Esperar delay → Ejecutar</li>
        </ol>
      </section>

      <section className="panel" id="timelock">
        <h2 className="panel-title">5. Para qué sirve el Timelock</h2>
        <p className="muted">
          Aunque la votación apruebe algo peligroso, nadie puede ejecutarlo al instante. Durante{" "}
          <code>MIN_DELAY</code> (en esta demo local suele ser ~60 s) la comunidad puede reaccionar
          (vender tokens, alertar, cancelar si hay rol). El tiempo on-chain usa{" "}
          <code>block.timestamp</code>: sirve para delays largos, no para “último segundo” de una subasta.
        </p>
      </section>

      <section className="panel" id="perfiles">
        <h2 className="panel-title">6. Perfiles de la UI</h2>
        <p className="muted">
          Los chips (Observador / Titular / Proponente / Operador) <strong>solo muestran u ocultan
          paneles</strong>. No otorgan permisos en la blockchain. Quien firma con MetaMask es la cuenta
          que tiene (o no) votos y puede llamar al Governor.
        </p>
        <table className="help-table">
          <thead>
            <tr>
              <th>Perfil</th>
              <th>Qué ves en la UI</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Observador</td>
              <td>Estado y ayudas; sin formularios de acción.</td>
            </tr>
            <tr>
              <td>Titular</td>
              <td>Delegar + votar.</td>
            </tr>
            <tr>
              <td>Proponente</td>
              <td>Titular + crear propuestas.</td>
            </tr>
            <tr>
              <td>Operador</td>
              <td>Todo lo anterior + Encolar / Ejecutar.</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="panel" id="setup">
        <h2 className="panel-title">7. Arranque local</h2>
        <ol className="help-list">
          <li>
            Terminal 1: <code>anvil</code> (RPC <code>http://127.0.0.1:8545</code>).
          </li>
          <li>
            Terminal 2 — deploy rápido:
            <br />
            <code>
              MIN_DELAY=60 VOTING_PERIOD=10 forge script script/Deploy.s.sol:Deploy --rpc-url
              http://127.0.0.1:8545 --broadcast
            </code>
          </li>
          <li>
            Copiá Token / Timelock / Governor / Box a <code>frontend/.env.local</code>.
          </li>
          <li>
            Terminal 3: <code>cd frontend && npm run dev</code> →{" "}
            <Link href="/">http://127.0.0.1:3000</Link>
          </li>
        </ol>
      </section>

      <section className="panel" id="wallet">
        <h2 className="panel-title">8. Conectar MetaMask a Anvil</h2>
        <ol className="help-steps">
          <li>
            Red personalizada: RPC <code>http://127.0.0.1:8545</code>, chain ID <strong>31337</strong>,
            símbolo ETH.
          </li>
          <li>
            Importá Anvil #0 (la del deploy), private key:
            <br />
            <code>0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80</code>
          </li>
          <li>
            En la home, <strong>Conectar wallet</strong>. La app intentará cambiar/agregar la chain
            31337.
          </li>
          <li>
            Deberías ver balance del <code>DAO Token</code> (mint al deployer) y poder delegar.
          </li>
        </ol>
      </section>

      <section className="panel" id="ui">
        <h2 className="panel-title">9. Botones especiales (solo Anvil)</h2>
        <dl className="help-dl">
          <div>
            <dt>Minar (abrir voto)</dt>
            <dd>
              Avanza bloques para pasar de Pendiente → Activa (<code>votingDelay</code>). Habla al RPC de
              Anvil, no firma la wallet.
            </dd>
          </div>
          <div>
            <dt>Minar (cerrar voto)</dt>
            <dd>
              Avanza el <code>votingPeriod</code> para que la propuesta deje de estar Activa.
            </dd>
          </div>
          <div>
            <dt>Adelantar MIN_DELAY</dt>
            <dd>
              Adelanta el reloj de Anvil para que el Timelock acepte Ejecutar sin esperar en tiempo real.
            </dd>
          </div>
        </dl>
        <p className="help-callout">
          Flujo recomendado con perfil Operador: Delegar → Proponer → Minar abrir → Votar a favor → Minar
          cerrar → Encolar → Adelantar MIN_DELAY → Ejecutar → mirá el valor de Box.
        </p>
      </section>

      <section className="panel" id="problemas">
        <h2 className="panel-title">10. Problemas frecuentes</h2>
        <ul className="help-list">
          <li>
            <strong>VotingClosed / no puedo votar:</strong> la propuesta sigue Pendiente o ya cerró. Usá
            Minar (abrir/cerrar).
          </li>
          <li>
            <strong>MinDelayNotMet:</strong> falta Adelantar MIN_DELAY (o esperar el delay real).
          </li>
          <li>
            <strong>Votos en 0:</strong> delegá con <code>yo</code> y esperá el siguiente bloque (Refrescar
            / minar 1).
          </li>
          <li>
            <strong>Wrong chain:</strong> MetaMask debe estar en 31337; desconectá y volvé a conectar.
          </li>
          <li>
            <strong>Anvil reiniciado:</strong> las addresses cambian; redeploy y actualizá{" "}
            <code>.env.local</code>, luego reiniciá <code>npm run dev</code>.
          </li>
        </ul>
      </section>
    </div>
  );
}
