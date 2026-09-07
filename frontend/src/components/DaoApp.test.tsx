import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DaoApp } from "@/components/DaoApp";

describe("DaoApp", () => {
  it("muestra marca y perfiles", () => {
    render(<DaoApp />);
    expect(screen.getByRole("heading", { name: "DAO Governance" })).toBeInTheDocument();
    expect(screen.getByTestId("profile-observer")).toBeInTheDocument();
    expect(screen.getByTestId("profile-operator")).toBeInTheDocument();
  });

  it("Observador no ve acciones de mutación", () => {
    render(<DaoApp />);
    expect(screen.queryByTestId("delegate-submit")).not.toBeInTheDocument();
    expect(screen.queryByTestId("propose-submit")).not.toBeInTheDocument();
  });

  it("cambia a Operador y muestra Queue/Execute", async () => {
    const user = userEvent.setup();
    render(<DaoApp />);
    await user.click(screen.getByTestId("profile-operator"));
    expect(screen.getByTestId("profile-summary")).toHaveTextContent(/Timelock/i);
    expect(screen.getByTestId("queue-submit")).toBeInTheDocument();
    expect(screen.getByTestId("execute-submit")).toBeInTheDocument();
    expect(screen.getByTestId("delegate-submit")).toBeInTheDocument();
  });

  it("flujo demo: delegar → proponer → votar → queue → execute", async () => {
    const user = userEvent.setup();
    render(<DaoApp />);
    await user.click(screen.getByTestId("profile-operator"));
    await user.click(screen.getByTestId("delegate-submit"));
    expect(screen.getByTestId("stat-delegated")).toHaveTextContent("Sí");
    await user.click(screen.getByTestId("propose-submit"));
    expect(screen.getByTestId("stat-proposals")).toHaveTextContent("1");
    await user.click(screen.getByTestId("vote-submit"));
    await user.click(screen.getByTestId("queue-submit"));
    await user.click(screen.getByTestId("execute-submit"));
    expect(screen.getByTestId("stat-box")).toHaveTextContent("42");
  });

  it("toggle de tema actualiza aria-label", async () => {
    const user = userEvent.setup();
    render(<DaoApp />);
    const toggle = screen.getByTestId("theme-toggle");
    const before = toggle.getAttribute("aria-label");
    await user.click(toggle);
    expect(toggle.getAttribute("aria-label")).not.toBe(before);
  });
});
