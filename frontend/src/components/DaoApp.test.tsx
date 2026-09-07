import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DaoApp } from "@/components/DaoApp";

vi.mock("@/lib/env", () => ({
  getFrontendEnv: () => ({
    NEXT_PUBLIC_TOKEN_ADDRESS: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    NEXT_PUBLIC_TIMELOCK_ADDRESS: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    NEXT_PUBLIC_GOVERNOR_ADDRESS: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    NEXT_PUBLIC_BOX_ADDRESS: "0x0165878A594ca255338adfa4d48449f69242Eb8F",
    NEXT_PUBLIC_RPC_URL: "http://127.0.0.1:8545",
    NEXT_PUBLIC_CHAIN_ID: 31337,
    NEXT_PUBLIC_MIN_DELAY: 60,
  }),
  isLiveMode: () => true,
}));

vi.mock("@/hooks/useDaoLive", () => ({
  useDaoLive: () => ({
    snap: {
      balance: "0",
      votes: "0",
      delegatedTo: null,
      boxValue: "0",
      proposalThreshold: "0",
      votingDelay: "1",
      votingPeriod: "10",
      minDelay: "60",
      message: "Wallet lista.",
      busy: false,
    },
    proposal: null,
    refresh: vi.fn(),
    delegate: vi.fn(),
    propose: vi.fn(),
    vote: vi.fn(),
    queue: vi.fn(),
    execute: vi.fn(),
    mineBlocks: vi.fn(),
    warpSeconds: vi.fn(),
  }),
}));

vi.mock("@/hooks/useWallet", () => ({
  useWallet: () => ({
    address: null,
    chainId: null,
    connecting: false,
    error: null,
    provider: null,
    signer: null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    wrongChain: false,
  }),
}));

describe("DaoApp live shell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra Connect wallet y perfiles", () => {
    render(<DaoApp />);
    expect(screen.getByRole("heading", { name: "DAO Governance" })).toBeInTheDocument();
    expect(screen.getByTestId("wallet-connect")).toBeInTheDocument();
    expect(screen.getByTestId("profile-operator")).toBeInTheDocument();
    expect(screen.getByTestId("connect-hint")).toBeInTheDocument();
  });

  it("sin wallet no muestra acciones de mutación", () => {
    render(<DaoApp />);
    expect(screen.queryByTestId("delegate-submit")).not.toBeInTheDocument();
  });

  it("cambia perfil a Operador", async () => {
    const user = userEvent.setup();
    render(<DaoApp />);
    await user.click(screen.getByTestId("profile-operator"));
    expect(screen.getByTestId("profile-summary")).toHaveTextContent(/Timelock/i);
  });
});
