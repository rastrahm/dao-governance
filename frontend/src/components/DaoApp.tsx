"use client";

import { useState } from "react";
import { AppToolbar } from "@/components/AppToolbar";
import { ProfileSwitcher } from "@/components/ProfileSwitcher";
import { useDaoDemo } from "@/hooks/useDaoDemo";
import { useProfile } from "@/hooks/useProfile";
import { delegateFormSchema, proposeFormSchema, voteFormSchema } from "@/lib/schemas";

/**
 * @description Shell principal de la DAO: perfiles, tema (vía toolbar) y flujos demo.
 * @returns UI de gobernanza con paneles condicionados por perfil.
 */
export function DaoApp() {
  const { profile, profileId, setProfileId } = useProfile();
  const demo = useDaoDemo();
  const [error, setError] = useState<string | null>(null);

  const [delegateInput, setDelegateInput] = useState("self");
  const [description, setDescription] = useState("Actualizar Box a 42");
  const [boxValue, setBoxValue] = useState("42");
  const [voteId, setVoteId] = useState("");
  const [support, setSupport] = useState<"0" | "1" | "2">("1");

  /**
   * @description Maneja el submit de delegación (demo).
   */
  function onDelegate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = delegateFormSchema.safeParse({ delegatee: delegateInput });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Formulario inválido");
      return;
    }
    demo.delegateSelf();
  }

  /**
   * @description Maneja el submit de propuesta (demo).
   */
  function onPropose(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = proposeFormSchema.safeParse({ description, boxValue });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Formulario inválido");
      return;
    }
    demo.propose(parsed.data.description, parsed.data.boxValue);
    setVoteId("");
  }

  /**
   * @description Maneja el submit de voto (demo).
   */
  function onVote(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const id = voteId || demo.activeProposal?.id || "";
    const parsed = voteFormSchema.safeParse({ proposalId: id, support });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Formulario inválido");
      return;
    }
    demo.vote(parsed.data.proposalId, parsed.data.support);
  }

  return (
    <div className="app-grid">
      <AppToolbar />

      <header className="hero">
        <p className="eyebrow">Módulo 10</p>
        <h1 className="brand">DAO Governance</h1>
        <p className="lede">
          Delegá, proponé, votá y ejecutá tras el Timelock. Cambiá de perfil para ver qué puede hacer cada rol.
        </p>
      </header>

      <section className="panel" aria-labelledby="profiles-title">
        <h2 id="profiles-title" className="panel-title">
          Perfil
        </h2>
        <ProfileSwitcher profileId={profileId} onChange={setProfileId} />
        <p className="muted tiny" data-testid="profile-summary">
          {profile.summary}
        </p>
      </section>

      <section className="panel" aria-labelledby="status-title">
        <h2 id="status-title" className="panel-title">
          Estado demo
        </h2>
        <dl className="stats">
          <div>
            <dt>Delegado</dt>
            <dd data-testid="stat-delegated">{demo.state.delegated ? "Sí" : "No"}</dd>
          </div>
          <div>
            <dt>Poder</dt>
            <dd data-testid="stat-power">{demo.state.votingPower}</dd>
          </div>
          <div>
            <dt>Box</dt>
            <dd data-testid="stat-box">{demo.state.boxValue}</dd>
          </div>
          <div>
            <dt>Propuestas</dt>
            <dd data-testid="stat-proposals">{demo.state.proposals.length}</dd>
          </div>
        </dl>
        <p className="muted tiny" data-testid="last-message" role="status">
          {demo.state.lastMessage}
        </p>
        {demo.activeProposal ? (
          <p className="pill tiny" data-testid="active-proposal">
            {demo.activeProposal.id} · {demo.activeProposal.state} · {demo.activeProposal.description}
          </p>
        ) : null}
      </section>

      {profile.canDelegate ? (
        <section className="panel" aria-labelledby="delegate-title">
          <h2 id="delegate-title" className="panel-title">
            Delegar
          </h2>
          <form onSubmit={onDelegate}>
            <label className="field">
              Delegatee
              <input
                name="delegatee"
                value={delegateInput}
                onChange={(ev) => setDelegateInput(ev.target.value)}
                placeholder="self o 0x…"
                aria-label="Dirección delegatee"
              />
            </label>
            <button type="submit" className="btn btn-primary" data-testid="delegate-submit">
              Delegar
            </button>
          </form>
        </section>
      ) : null}

      {profile.canPropose ? (
        <section className="panel" aria-labelledby="propose-title">
          <h2 id="propose-title" className="panel-title">
            Proponer
          </h2>
          <form onSubmit={onPropose}>
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
            <button type="submit" className="btn btn-primary" data-testid="propose-submit">
              Crear propuesta
            </button>
          </form>
        </section>
      ) : null}

      {profile.canVote ? (
        <section className="panel" aria-labelledby="vote-title">
          <h2 id="vote-title" className="panel-title">
            Votar
          </h2>
          <form onSubmit={onVote}>
            <label className="field">
              Proposal ID
              <input
                name="proposalId"
                value={voteId}
                onChange={(ev) => setVoteId(ev.target.value)}
                placeholder={demo.activeProposal?.id ?? "0x…"}
                aria-label="ID de propuesta"
              />
            </label>
            <label className="field">
              Soporte
              <select
                name="support"
                value={support}
                onChange={(ev) => setSupport(ev.target.value as "0" | "1" | "2")}
                aria-label="Tipo de voto"
              >
                <option value="1">For</option>
                <option value="0">Against</option>
                <option value="2">Abstain</option>
              </select>
            </label>
            <button type="submit" className="btn btn-primary" data-testid="vote-submit">
              Emitir voto
            </button>
          </form>
        </section>
      ) : null}

      {profile.canQueueExecute ? (
        <section className="panel" aria-labelledby="ops-title">
          <h2 id="ops-title" className="panel-title">
            Timelock
          </h2>
          <div className="actions">
            <button
              type="button"
              className="btn btn-primary"
              data-testid="queue-submit"
              disabled={!demo.activeProposal || demo.activeProposal.state !== "Succeeded"}
              onClick={() => demo.activeProposal && demo.queue(demo.activeProposal.id)}
            >
              Queue
            </button>
            <button
              type="button"
              className="btn"
              data-testid="execute-submit"
              disabled={!demo.activeProposal || demo.activeProposal.state !== "Queued"}
              onClick={() => demo.activeProposal && demo.execute(demo.activeProposal.id)}
            >
              Execute
            </button>
          </div>
          <p className="muted tiny">En demo el delay es instantáneo al pulsar Execute tras Queue.</p>
        </section>
      ) : null}

      {error ? (
        <div className="error-box" role="alert" data-testid="form-error">
          {error}
        </div>
      ) : null}
    </div>
  );
}
