"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BrowserProvider, Signer } from "ethers";
import { ensureAnvilChain, getBrowserProvider } from "@/lib/contracts";
import type { FrontendEnv } from "@/lib/env";

export type WalletState = {
  address: string | null;
  chainId: number | null;
  connecting: boolean;
  error: string | null;
};

type EthereumEvents = {
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
  off?: (event: string, handler: (...args: unknown[]) => void) => void;
};

function unsubscribe(eth: EthereumEvents, event: string, handler: (...args: unknown[]) => void) {
  eth.removeListener?.(event, handler);
  eth.off?.(event, handler);
}

/**
 * @description Conexión a wallet inyectada + switch/add Anvil.
 * @param env Config live (null = sin contratos).
 */
export function useWallet(env: FrontendEnv | null) {
  const [state, setState] = useState<WalletState>({
    address: null,
    chainId: null,
    connecting: false,
    error: null,
  });
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<Signer | null>(null);
  const providerRef = useRef<BrowserProvider | null>(null);

  const refresh = useCallback(async (bp: BrowserProvider) => {
    const network = await bp.getNetwork();
    const s = await bp.getSigner();
    const address = await s.getAddress();
    providerRef.current = bp;
    setProvider(bp);
    setSigner(s);
    setState({ address, chainId: Number(network.chainId), connecting: false, error: null });
  }, []);

  const disconnect = useCallback(() => {
    providerRef.current = null;
    setProvider(null);
    setSigner(null);
    setState({ address: null, chainId: null, connecting: false, error: null });
  }, []);

  const connect = useCallback(async () => {
    if (!env) {
      setState((s) => ({ ...s, error: "Falta .env.local con direcciones del deploy." }));
      return;
    }
    setState((s) => ({ ...s, connecting: true, error: null }));
    try {
      const bp = getBrowserProvider();
      await bp.send("eth_requestAccounts", []);
      await ensureAnvilChain(env.NEXT_PUBLIC_CHAIN_ID, env.NEXT_PUBLIC_RPC_URL);
      const bp2 = getBrowserProvider();
      await refresh(bp2);
    } catch (err) {
      setState((s) => ({
        ...s,
        connecting: false,
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }, [env, refresh]);

  useEffect(() => {
    const eth = window.ethereum as EthereumEvents | undefined;
    if (!eth?.on) return;

    const onAccounts = (accounts: unknown) => {
      const list = accounts as string[];
      if (!list?.length) disconnect();
      else if (providerRef.current) void refresh(providerRef.current);
    };
    const onChain = () => {
      if (providerRef.current) void refresh(providerRef.current);
    };

    eth.on("accountsChanged", onAccounts);
    eth.on("chainChanged", onChain);
    return () => {
      unsubscribe(eth, "accountsChanged", onAccounts);
      unsubscribe(eth, "chainChanged", onChain);
    };
  }, [refresh, disconnect]);

  const wrongChain =
    state.chainId != null && env != null && state.chainId !== env.NEXT_PUBLIC_CHAIN_ID;

  return { ...state, provider, signer, connect, disconnect, wrongChain };
}
