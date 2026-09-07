import { describe, expect, it } from "vitest";
import { getProfile, isDaoProfileId, DAO_PROFILES } from "@/lib/profiles";
import { delegateFormSchema, proposeFormSchema, themeModeSchema } from "@/lib/schemas";

describe("profiles", () => {
  it("expone cuatro perfiles", () => {
    expect(DAO_PROFILES).toHaveLength(4);
  });

  it("getProfile retorna Operador con todos los permisos", () => {
    const op = getProfile("operator");
    expect(op.canDelegate && op.canPropose && op.canVote && op.canQueueExecute).toBe(true);
  });

  it("Observador no puede mutar", () => {
    const o = getProfile("observer");
    expect(o.canDelegate || o.canPropose || o.canVote || o.canQueueExecute).toBe(false);
  });

  it("isDaoProfileId valida ids", () => {
    expect(isDaoProfileId("holder")).toBe(true);
    expect(isDaoProfileId("admin")).toBe(false);
  });
});

describe("schemas", () => {
  it("acepta temas válidos", () => {
    expect(themeModeSchema.parse("dark")).toBe("dark");
    expect(themeModeSchema.parse("light")).toBe("light");
  });

  it("valida delegate yo/self", () => {
    expect(delegateFormSchema.parse({ delegatee: "yo" }).delegatee).toBe("yo");
    expect(delegateFormSchema.parse({ delegatee: "self" }).delegatee).toBe("self");
  });

  it("rechaza propuesta corta", () => {
    const r = proposeFormSchema.safeParse({ description: "ab", boxValue: 1 });
    expect(r.success).toBe(false);
  });
});
