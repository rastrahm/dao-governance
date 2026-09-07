import { AppToolbar } from "@/components/AppToolbar";

/**
 * @description Ayuda: perfiles, tema y ciclo de gobernanza.
 * @returns Contenido estático de ayuda.
 */
export default function AyudaPage() {
  return (
    <div className="app-grid">
      <AppToolbar showHome />
      <header className="hero">
        <h1 className="brand" style={{ fontSize: "2.2rem" }}>
          Ayuda
        </h1>
        <p className="lede">Cómo usar la demo de gobernanza DAO.</p>
      </header>
      <section className="panel">
        <h2 className="panel-title">Perfiles</h2>
        <ul className="help-list">
          <li>
            <strong>Observador</strong> — solo lectura del estado.
          </li>
          <li>
            <strong>Holder</strong> — delegar y votar.
          </li>
          <li>
            <strong>Proponente</strong> — crear propuestas (+ votar/delegar).
          </li>
          <li>
            <strong>Operador</strong> — queue / execute vía Timelock.
          </li>
        </ul>
      </section>
      <section className="panel">
        <h2 className="panel-title">Tema</h2>
        <p className="muted">
          Usá el botón <strong>Claro / Oscuro</strong> en la barra. La preferencia se guarda en{" "}
          <code>localStorage</code> (`dao-theme`).
        </p>
      </section>
      <section className="panel">
        <h2 className="panel-title">Ciclo</h2>
        <ol className="help-list">
          <li>Delegar poder de voto.</li>
          <li>Proponer (p. ej. cambiar el Box).</li>
          <li>Votar For / Against / Abstain.</li>
          <li>Queue → esperar MIN_DELAY on-chain → Execute.</li>
        </ol>
      </section>
    </div>
  );
}
