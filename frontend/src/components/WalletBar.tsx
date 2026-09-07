"use client";

type WalletBarProps = {
  address: string | null;
  chainId: number | null;
  connecting: boolean;
  wrongChain: boolean;
  expectedChainId: number;
  onConnect: () => void;
  onDisconnect: () => void;
};

/**
 * @description Barra de conexión wallet (MetaMask / Anvil).
 * @param props Estado y callbacks de wallet.
 * @returns Controles Conectar / Desconectar.
 */
export function WalletBar({
  address,
  chainId,
  connecting,
  wrongChain,
  expectedChainId,
  onConnect,
  onDisconnect,
}: WalletBarProps) {
  const short = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : null;

  return (
    <div className="wallet-bar" data-testid="wallet-bar">
      {address ? (
        <>
          <span className="pill" data-testid="wallet-address" title={address}>
            {short}
          </span>
          <span className="muted tiny" data-testid="wallet-chain">
            chain {chainId ?? "?"}
            {wrongChain ? ` (esperada ${expectedChainId})` : ""}
          </span>
          <button type="button" className="btn btn-ghost" data-testid="wallet-disconnect" onClick={onDisconnect}>
            Desconectar
          </button>
        </>
      ) : (
        <button
          type="button"
          className="btn btn-primary"
          data-testid="wallet-connect"
          disabled={connecting}
          onClick={onConnect}
        >
          {connecting ? "Conectando…" : "Conectar wallet"}
        </button>
      )}
    </div>
  );
}
