import { BrowserProvider, Contract, JsonRpcProvider, type Signer, Interface } from "ethers";
import tokenAbi from "@/abi/GovernanceToken.json";
import governorAbi from "@/abi/MyGovernor.json";
import timelockAbi from "@/abi/TimelockController.json";
import boxAbi from "@/abi/Box.json";
import type { FrontendEnv } from "@/lib/env";

export type DaoContracts = {
  token: Contract;
  governor: Contract;
  timelock: Contract;
  box: Contract;
};

/**
 * @description Provider de solo lectura al RPC (Anvil).
 * @param rpcUrl URL JSON-RPC.
 */
export function createReadProvider(rpcUrl: string): JsonRpcProvider {
  return new JsonRpcProvider(rpcUrl);
}

/**
 * @description Contratos de lectura.
 * @param env Config live.
 * @param provider Provider opcional.
 */
export function createReadContracts(env: FrontendEnv, provider?: JsonRpcProvider): DaoContracts & { provider: JsonRpcProvider } {
  const p = provider ?? createReadProvider(env.NEXT_PUBLIC_RPC_URL);
  return {
    provider: p,
    token: new Contract(env.NEXT_PUBLIC_TOKEN_ADDRESS, tokenAbi, p),
    governor: new Contract(env.NEXT_PUBLIC_GOVERNOR_ADDRESS, governorAbi, p),
    timelock: new Contract(env.NEXT_PUBLIC_TIMELOCK_ADDRESS, timelockAbi, p),
    box: new Contract(env.NEXT_PUBLIC_BOX_ADDRESS, boxAbi, p),
  };
}

/**
 * @description Contratos con signer (wallet).
 * @param env Config live.
 * @param signer Signer de la wallet.
 */
export function createWriteContracts(env: FrontendEnv, signer: Signer): DaoContracts {
  return {
    token: new Contract(env.NEXT_PUBLIC_TOKEN_ADDRESS, tokenAbi, signer),
    governor: new Contract(env.NEXT_PUBLIC_GOVERNOR_ADDRESS, governorAbi, signer),
    timelock: new Contract(env.NEXT_PUBLIC_TIMELOCK_ADDRESS, timelockAbi, signer),
    box: new Contract(env.NEXT_PUBLIC_BOX_ADDRESS, boxAbi, signer),
  };
}

/**
 * @description Codifica `Box.store(uint256)`.
 * @param value Nuevo valor.
 */
export function encodeBoxStore(value: number | bigint): string {
  const iface = new Interface(boxAbi as never);
  return iface.encodeFunctionData("store", [value]);
}

/**
 * @description BrowserProvider desde wallet inyectada.
 */
export function getBrowserProvider(): BrowserProvider {
  const eth = typeof window !== "undefined" ? window.ethereum : undefined;
  if (!eth) {
    throw new Error("No hay wallet inyectada. Instalá MetaMask y conectala a Anvil.");
  }
  return new BrowserProvider(eth);
}

/**
 * @description Intenta agregar/cambiar a la chain Anvil en la wallet.
 * @param chainId Chain id numérico (31337).
 * @param rpcUrl RPC HTTP.
 */
export async function ensureAnvilChain(chainId: number, rpcUrl: string): Promise<void> {
  const eth = window.ethereum;
  if (!eth) throw new Error("No hay wallet inyectada.");
  const hexId = `0x${chainId.toString(16)}`;
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexId }] });
  } catch (err) {
    const code = (err as { code?: number })?.code;
    if (code === 4902) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: hexId,
            chainName: "Anvil Local",
            nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
            rpcUrls: [rpcUrl],
          },
        ],
      });
      return;
    }
    throw err;
  }
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
      off?: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}
