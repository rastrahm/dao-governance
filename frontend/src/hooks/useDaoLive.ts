"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { id as keccakId, type Signer } from "ethers";
import { createReadContracts, createWriteContracts, encodeBoxStore, createReadProvider } from "@/lib/contracts";
import type { FrontendEnv } from "@/lib/env";

/** Etiquetas en español (índice = enum ProposalState de OZ Governor). */
export const PROPOSAL_STATE_LABELS = [
  "Pendiente",
  "Activa",
  "Cancelada",
  "Derrotada",
  "Aprobada",
  "Encolada",
  "Expirada",
  "Ejecutada",
] as const;

/** Índices del enum on-chain (para lógica UI, no textos). */
export const ProposalState = {
  Pending: 0,
  Active: 1,
  Canceled: 2,
  Defeated: 3,
  Succeeded: 4,
  Queued: 5,
  Expired: 6,
  Executed: 7,
} as const;

export type LiveProposal = {
  id: string;
  description: string;
  boxValue: number;
  targets: string[];
  values: bigint[];
  calldatas: string[];
  descriptionHash: string;
  state: number;
  stateLabel: string;
};

export type LiveSnapshot = {
  balance: string;
  votes: string;
  delegatedTo: string | null;
  boxValue: string;
  proposalThreshold: string;
  votingDelay: string;
  votingPeriod: string;
  minDelay: string;
  message: string;
  busy: boolean;
};

const EMPTY: LiveSnapshot = {
  balance: "0",
  votes: "0",
  delegatedTo: null,
  boxValue: "0",
  proposalThreshold: "0",
  votingDelay: "0",
  votingPeriod: "0",
  minDelay: "0",
  message: "Conectá la wallet (MetaMask → Anvil) para operar on-chain.",
  busy: false,
};

/**
 * @description Ciclo DAO on-chain contra Anvil + avance de bloques/tiempo.
 * @param env Config de contratos.
 * @param signer Signer de la wallet o null.
 * @param address Dirección conectada o null.
 */
export function useDaoLive(env: FrontendEnv | null, signer: Signer | null, address: string | null) {
  const [snap, setSnap] = useState<LiveSnapshot>(EMPTY);
  const [proposal, setProposal] = useState<LiveProposal | null>(null);
  const proposalRef = useRef<LiveProposal | null>(null);
  proposalRef.current = proposal;

  const refresh = useCallback(async () => {
    if (!env || !address) return;
    try {
      const { token, governor, box, timelock } = createReadContracts(env);
      const [balance, votes, delegatedTo, boxValue, threshold, vDelay, vPeriod, minDelay] =
        await Promise.all([
          token.balanceOf(address),
          token.getVotes(address),
          token.delegates(address),
          box.retrieve(),
          governor.proposalThreshold(),
          governor.votingDelay(),
          governor.votingPeriod(),
          timelock.getMinDelay(),
        ]);

      const active = proposalRef.current;
      let messageExtra = "";
      if (active) {
        const state = Number(await governor.state(active.id));
        const stateLabel = PROPOSAL_STATE_LABELS[state] ?? String(state);
        messageExtra = `Propuesta ${active.id.slice(0, 10)}… → ${stateLabel}`;
        setProposal({ ...active, state, stateLabel });
      }

      setSnap((s) => ({
        ...s,
        balance: balance.toString(),
        votes: votes.toString(),
        delegatedTo: delegatedTo === "0x0000000000000000000000000000000000000000" ? null : delegatedTo,
        boxValue: boxValue.toString(),
        proposalThreshold: threshold.toString(),
        votingDelay: vDelay.toString(),
        votingPeriod: vPeriod.toString(),
        minDelay: minDelay.toString(),
        busy: false,
        message: messageExtra || (s.message.startsWith("Conectá") ? "Wallet lista. Delegá y proponé." : s.message),
      }));
    } catch (err) {
      setSnap((s) => ({
        ...s,
        busy: false,
        message: err instanceof Error ? err.message : String(err),
      }));
    }
  }, [env, address]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const withBusy = useCallback(
    async (fn: () => Promise<string>) => {
      setSnap((s) => ({ ...s, busy: true, message: "Enviando transacción…" }));
      try {
        const message = await fn();
        setSnap((s) => ({ ...s, busy: false, message }));
        await refresh();
      } catch (err) {
        setSnap((s) => ({
          ...s,
          busy: false,
          message: err instanceof Error ? err.message : String(err),
        }));
      }
    },
    [refresh],
  );

  const delegate = useCallback(
    async (delegateeInput: string) => {
      if (!env || !signer || !address) throw new Error("Wallet no conectada");
      const self = delegateeInput === "self" || delegateeInput === "yo";
      const delegatee = self ? address : delegateeInput;
      await withBusy(async () => {
        const { token } = createWriteContracts(env, signer);
        const tx = await token.delegate(delegatee);
        await tx.wait();
        return `Delegado a ${delegatee}`;
      });
    },
    [env, signer, address, withBusy],
  );

  const propose = useCallback(
    async (description: string, boxValueNum: number) => {
      if (!env || !signer) throw new Error("Wallet no conectada");
      await withBusy(async () => {
        const { governor } = createWriteContracts(env, signer);
        const targets = [env.NEXT_PUBLIC_BOX_ADDRESS];
        const values = [0n];
        const calldatas = [encodeBoxStore(boxValueNum)];
        const tx = await governor.propose(targets, values, calldatas, description);
        const receipt = await tx.wait();
        const descriptionHash = keccakId(description);
        const proposalId = await governor.hashProposal(targets, values, calldatas, descriptionHash);
        const state = Number(await governor.state(proposalId));
        const next: LiveProposal = {
          id: proposalId.toString(),
          description,
          boxValue: boxValueNum,
          targets,
          values,
          calldatas,
          descriptionHash,
          state,
          stateLabel: PROPOSAL_STATE_LABELS[state] ?? String(state),
        };
        setProposal(next);
        return `Propuesta creada: ${next.id} (tx ${receipt?.hash ?? ""})`;
      });
    },
    [env, signer, withBusy],
  );

  const vote = useCallback(
    async (support: number) => {
      if (!env || !signer || !proposalRef.current) throw new Error("Sin propuesta activa");
      const p = proposalRef.current;
      await withBusy(async () => {
        const { governor } = createWriteContracts(env, signer);
        const tx = await governor.castVote(p.id, support);
        await tx.wait();
        const supportLabel = support === 0 ? "en contra" : support === 1 ? "a favor" : "abstención";
        return `Voto emitido (${supportLabel})`;
      });
    },
    [env, signer, withBusy],
  );

  const queue = useCallback(async () => {
    if (!env || !signer || !proposalRef.current) throw new Error("Sin propuesta");
    const p = proposalRef.current;
    await withBusy(async () => {
      const { governor } = createWriteContracts(env, signer);
      const tx = await governor.queue(p.targets, p.values, p.calldatas, p.descriptionHash);
      await tx.wait();
      return "Propuesta encolada en el Timelock";
    });
  }, [env, signer, withBusy]);

  const execute = useCallback(async () => {
    if (!env || !signer || !proposalRef.current) throw new Error("Sin propuesta");
    const p = proposalRef.current;
    await withBusy(async () => {
      const { governor } = createWriteContracts(env, signer);
      const tx = await governor.execute(p.targets, p.values, p.calldatas, p.descriptionHash);
      await tx.wait();
      return "Propuesta ejecutada — Box actualizado";
    });
  }, [env, signer, withBusy]);

  const mineBlocks = useCallback(
    async (count: number) => {
      if (!env) return;
      const p = createReadProvider(env.NEXT_PUBLIC_RPC_URL);
      setSnap((s) => ({ ...s, busy: true, message: `Minando ${count} bloques…` }));
      for (let i = 0; i < count; i++) {
        await p.send("evm_mine", []);
      }
      setSnap((s) => ({ ...s, busy: false, message: `Minados ${count} bloques.` }));
      await refresh();
    },
    [env, refresh],
  );

  const warpSeconds = useCallback(
    async (seconds: number) => {
      if (!env) return;
      const p = createReadProvider(env.NEXT_PUBLIC_RPC_URL);
      setSnap((s) => ({ ...s, busy: true, message: `Adelantando +${seconds}s…` }));
      await p.send("evm_increaseTime", [seconds]);
      await p.send("evm_mine", []);
      setSnap((s) => ({ ...s, busy: false, message: `Tiempo avanzado ${seconds}s.` }));
      await refresh();
    },
    [env, refresh],
  );

  return {
    snap,
    proposal,
    refresh,
    delegate,
    propose,
    vote,
    queue,
    execute,
    mineBlocks,
    warpSeconds,
  };
}
