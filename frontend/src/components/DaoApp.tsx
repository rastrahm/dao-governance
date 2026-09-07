"use client";

import { useMemo, useState } from "react";
import { AppToolbar } from "@/components/AppToolbar";
import { ProfileSwitcher } from "@/components/ProfileSwitcher";
import { WalletBar } from "@/components/WalletBar";
import { ProposalState, useDaoLive } from "@/hooks/useDaoLive";
import { useProfile } from "@/hooks/useProfile";
import { useWallet } from "@/hooks/useWallet";
import { getFrontendEnv } from "@/lib/env";
import { delegateFormSchema, proposeFormSchema } from "@/lib/schemas";

/**
 * @description Shell DAO live: wallet Anvil + perfiles + ciclo on-chain.
 * @returns UI completa de gobernanza.
 */
export function DaoApp() {
  const env = useMemo(() => getFrontendEnv(), []);
  const wallet = useWallet(env);
  const live = useDaoLive(env, wallet.signer, wallet.address);
  const { profile, profileId, setProfileId } = useProfile();

  const [error, setError] = useState<string | null>(null);
  const [delegateInput, setDelegateInput] = useState("yo");
  const [description, setDescription] = useState("Actualizar Box a 42");
  const [boxValue, setBoxValue] = useState("42");
  const [support, setSupport] = useState<"0" | "1" | "2">("1");

  const connected = Boolean(wallet.address && !wallet.wrongChain);
  const statusMsg = wallet.error ?? error ?? live.snap.message;

  /**
   * @description Delegación on-chain.
   */
  async function onDelegate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = delegateFormSchema.safeParse({ delegatee: delegateInput });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Formulario inválido");
      return;
    }
    await live.delegate(parsed.data.delegatee);
  }

  /**
   * @description Crea propuesta on-chain (Box.store).
   */
  async function onPropose(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = proposeFormSchema.safeParse({ description, boxValue });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Formulario inválido");
      return;
    }
    await live.propose(parsed.data.description, parsed.data.boxValue);
  }

  /**
   * @description Emite voto on-chain.
   */
  async function onVote(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!live.proposal) {
      setError("No hay propuesta cargada. Creá una primero.");
      return;
    }
    await live.vote(Number(support));
  }

  return (
    <div className="app-grid">
      <AppToolbar />

      <header className="hero">
        <p className="eyebrow">Módulo 10 · Anvil</p>
        <h1 className="brand">DAO Governance</h1>
        <p className="lede">
          Conectá MetaMask a Anvil (cuenta #0 del deploy), elegí un perfil y ejecutá el ciclo real on-chain.
        </p>
        <div className="cta-row">
          <WalletBar
            address={wallet.address}
            chainId={wallet.chainId}
            connecting={wallet.connecting}
            wrongChain={wallet.wrongChain}
            expectedChainId={env?.NEXT_PUBLIC_CHAIN_ID ?? 31337}
            onConnect={() => void wallet.connect()}
            onDisconnect={wallet.disconnect}
          />
        </div>
      </header>

      {!env ? (
        <section className="panel error-box" role="alert">
          Falta configuración. Creá <code>frontend/.env.local</code> con las direcciones del{" "}
          <code>forge script Deploy</code>.
        </section>
      ) : null}

      <section className="panel" aria-labelledby="profiles-title">
        <h2 id="profiles-title" className="panel-title">
          Perfil de UI
        </h2>
        <ProfileSwitcher profileId={profileId} onChange={setProfileId} />
        <p className="muted tiny" data-testid="profile-summary">
          {profile.summary} El poder real lo define tu wallet on-chain.
        </p>
      </section>

      <section className="panel" aria-labelledby="status-title">
        <h2 id="status-title" className="panel-title">
          Estado on-chain
        </h2>
        <dl className="stats">
          <div>
            <dt>Balance</dt>
            <dd data-testid="stat-balance">{live.snap.balance}</dd>
          </div>
          <div>
            <dt>Votos</dt>
            <dd data-testid="stat-power">{live.snap.votes}</dd>
          </div>
          <div>
            <dt>Delegado a</dt>
            <dd data-testid="stat-delegated">
              {live.snap.delegatedTo ? `${live.snap.delegatedTo.slice(0, 6)}…` : "—"}
            </dd>
          </div>
          <div>
            <dt>Box</dt>
            <dd data-testid="stat-box">{live.snap.boxValue}</dd>
          </div>
        </dl>
        <p className="muted tiny">
          delay={live.snap.votingDelay} · period={live.snap.votingPeriod} · MIN_DELAY={live.snap.minDelay}s
        </p>
        {live.proposal ? (
          <p className="pill tiny" data-testid="active-proposal">
            {live.proposal.id.slice(0, 12)}… · {live.proposal.stateLabel} · {live.proposal.description}
          </p>
        ) : null}
        <p className="muted tiny" data-testid="last-message" role="status">
          {statusMsg}
        </p>
        <div className="actions" style={{ marginTop: "0.75rem" }}>
          <button
            type="button"
            className="btn"
            data-testid="refresh"
            disabled={!connected || live.snap.busy}
            onClick={() => void live.refresh()}
          >
            Refrescar
          </button>
          <button
            type="button"
            className="btn"
            data-testid="mine-open"
            disabled={!env || live.snap.busy}
            onClick={() => void live.mineBlocks(Number(live.snap.votingDelay || 1) + 1)}
          >
            Minar (abrir voto)
          </button>
          <button
            type="button"
            className="btn"
            data-testid="mine-close"
            disabled={!env || live.snap.busy}
            onClick={() => void live.mineBlocks(Number(live.snap.votingPeriod || 1) + 1)}
          >
            Minar (cerrar voto)
          </button>
          <button
            type="button"
            className="btn"
            data-testid="warp-delay"
            disabled={!env || live.snap.busy}
            onClick={() => void live.warpSeconds(Number(live.snap.minDelay || env?.NEXT_PUBLIC_MIN_DELAY || 60))}
          >
            Adelantar MIN_DELAY
          </button>
        </div>
      </section>

      {connected && profile.canDelegate ? (
        <section className="panel" aria-labelledby="delegate-title">
          <h2 id="delegate-title" className="panel-title">
            Delegar
          </h2>
          <form onSubmit={(e) => void onDelegate(e)}>
            <label className="field">
              Destinatario
              <input
                name="delegatee"
                value={delegateInput}
                onChange={(ev) => setDelegateInput(ev.target.value)}
                placeholder="yo o 0x…"
                aria-label="Dirección del destinatario"
              />
            </label>
            <button type="submit" className="btn btn-primary" data-testid="delegate-submit" disabled={live.snap.busy}>
              Delegar en cadena
            </button>
          </form>
        </section>
      ) : null}

      {connected && profile.canPropose ? (
        <section className="panel" aria-labelledby="propose-title">
          <h2 id="propose-title" className="panel-title">
            Proponer
          </h2>
          <form onSubmit={(e) => void onPropose(e)}>
            <label className="field">
              Descripción
              <input
                name="description"
                value={description}
                onChange={(ev) => setDescription(ev.target.value)}
                aria-label="Descripción de la propuesta"
              />
            </label>
            <label className="field">
              Valor Box
              <input
                name="boxValue"
                type="number"
                min={0}
                value={boxValue}
                onChange={(ev) => setBoxValue(ev.target.value)}
                aria-label="Valor a guardar en Box"
              />
            </label>
            <button type="submit" className="btn btn-primary" data-testid="propose-submit" disabled={live.snap.busy}>
              Crear propuesta
            </button>
          </form>
        </section>
      ) : null}

      {connected && profile.canVote ? (
        <section className="panel" aria-labelledby="vote-title">
          <h2 id="vote-title" className="panel-title">
            Votar
          </h2>
          <form onSubmit={(e) => void onVote(e)}>
            <label className="field">
              Soporte
              <select
                name="support"
                value={support}
                onChange={(ev) => setSupport(ev.target.value as "0" | "1" | "2")}
                aria-label="Tipo de voto"
              >
                <option value="1">A favor</option>
                <option value="0">En contra</option>
                <option value="2">Abstención</option>
              </select>
            </label>
            <button
              type="submit"
              className="btn btn-primary"
              data-testid="vote-submit"
              disabled={live.snap.busy || !live.proposal}
            >
              Emitir voto
            </button>
          </form>
          <p className="muted tiny">Si está Pendiente: usá «Minar (abrir voto)» antes de votar.</p>
        </section>
      ) : null}

      {connected && profile.canQueueExecute ? (
        <section className="panel" aria-labelledby="ops-title">
          <h2 id="ops-title" className="panel-title">
            Timelock
          </h2>
          <div className="actions">
            <button
              type="button"
              className="btn btn-primary"
              data-testid="queue-submit"
              disabled={live.snap.busy || live.proposal?.state !== ProposalState.Succeeded}
              onClick={() => void live.queue()}
            >
              Encolar
            </button>
            <button
              type="button"
              className="btn"
              data-testid="execute-submit"
              disabled={live.snap.busy || live.proposal?.state !== ProposalState.Queued}
              onClick={() => void live.execute()}
            >
              Ejecutar
            </button>
          </div>
          <p className="muted tiny">Tras Encolar, usá «Adelantar MIN_DELAY» y después Ejecutar.</p>
        </section>
      ) : null}

      {!connected && env ? (
        <p className="muted" data-testid="connect-hint">
          Conectá la wallet para ver las acciones del perfil. Importá en MetaMask la private key de Anvil #0
          (<code>0xac09…ff80</code>) y red localhost:8545 / chainId 31337.
        </p>
      ) : null}

      {error ? (
        <div className="error-box" role="alert" data-testid="form-error">
          {error}
        </div>
      ) : null}
    </div>
  );
}
