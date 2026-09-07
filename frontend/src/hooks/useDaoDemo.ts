"use client";

import { useCallback, useMemo, useState } from "react";

export type DemoProposalState = "Pending" | "Active" | "Succeeded" | "Queued" | "Executed" | "Defeated";

export type DemoProposal = {
  id: string;
  description: string;
  boxValue: number;
  state: DemoProposalState;
  forVotes: number;
  againstVotes: number;
};

export type DemoDaoState = {
  delegated: boolean;
  votingPower: number;
  proposals: DemoProposal[];
  boxValue: number;
  lastMessage: string;
};

const INITIAL: DemoDaoState = {
  delegated: false,
  votingPower: 1000,
  proposals: [],
  boxValue: 0,
  lastMessage: "Modo demo: sin cadena. Cambiá de perfil para ver acciones.",
};

/**
 * @description Estado local que simula el ciclo DAO para la UI (sin wallet).
 * @returns Estado y acciones demo tipadas.
 */
export function useDaoDemo() {
  const [state, setState] = useState<DemoDaoState>(INITIAL);

  const delegateSelf = useCallback(() => {
    setState((s) => ({
      ...s,
      delegated: true,
      lastMessage: `Delegaste a vos mismo. Poder activo: ${s.votingPower}.`,
    }));
  }, []);

  const propose = useCallback((description: string, boxValue: number) => {
    setState((s) => {
      if (!s.delegated) {
        return { ...s, lastMessage: "Primero delegá tus votos (perfil Holder+)." };
      }
      const id = `0xdemo${(s.proposals.length + 1).toString(16).padStart(4, "0")}`;
      const proposal: DemoProposal = {
        id,
        description,
        boxValue,
        state: "Active",
        forVotes: 0,
        againstVotes: 0,
      };
      return {
        ...s,
        proposals: [proposal, ...s.proposals],
        lastMessage: `Propuesta creada (${id}). Estado: Active.`,
      };
    });
  }, []);

  const vote = useCallback((proposalId: string, support: "0" | "1" | "2") => {
    setState((s) => {
      const proposals = s.proposals.map((p) => {
        if (p.id !== proposalId || p.state !== "Active") return p;
        const next = { ...p };
        if (support === "1") next.forVotes += s.votingPower;
        if (support === "0") next.againstVotes += s.votingPower;
        if (next.forVotes > next.againstVotes) next.state = "Succeeded";
        else if (next.againstVotes >= next.forVotes && support === "0") next.state = "Defeated";
        return next;
      });
      return { ...s, proposals, lastMessage: `Voto registrado en ${proposalId}.` };
    });
  }, []);

  const queue = useCallback((proposalId: string) => {
    setState((s) => ({
      ...s,
      proposals: s.proposals.map((p) =>
        p.id === proposalId && p.state === "Succeeded" ? { ...p, state: "Queued" } : p,
      ),
      lastMessage: `Propuesta ${proposalId} en Timelock (Queued). Esperá MIN_DELAY.`,
    }));
  }, []);

  const execute = useCallback((proposalId: string) => {
    setState((s) => {
      const target = s.proposals.find((p) => p.id === proposalId);
      if (!target || target.state !== "Queued") {
        return { ...s, lastMessage: "Solo se ejecuta desde Queued (tras el delay)." };
      }
      return {
        ...s,
        boxValue: target.boxValue,
        proposals: s.proposals.map((p) => (p.id === proposalId ? { ...p, state: "Executed" } : p)),
        lastMessage: `Ejecutada. Box.store(${target.boxValue}).`,
      };
    });
  }, []);

  const activeProposal = useMemo(() => state.proposals[0] ?? null, [state.proposals]);

  return { state, activeProposal, delegateSelf, propose, vote, queue, execute };
}
