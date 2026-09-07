import { z } from "zod";

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Dirección inválida");

const envSchema = z.object({
  NEXT_PUBLIC_TOKEN_ADDRESS: addressSchema,
  NEXT_PUBLIC_TIMELOCK_ADDRESS: addressSchema,
  NEXT_PUBLIC_GOVERNOR_ADDRESS: addressSchema,
  NEXT_PUBLIC_BOX_ADDRESS: addressSchema,
  NEXT_PUBLIC_RPC_URL: z.string().url().default("http://127.0.0.1:8545"),
  NEXT_PUBLIC_CHAIN_ID: z.coerce.number().int().positive().default(31337),
  NEXT_PUBLIC_MIN_DELAY: z.coerce.number().int().nonnegative().default(60),
});

export type FrontendEnv = z.infer<typeof envSchema>;

/**
 * @description Lee y valida variables públicas (modo live / Anvil).
 * @returns Config tipada o null si falta algo.
 */
export function getFrontendEnv(): FrontendEnv | null {
  const raw = {
    NEXT_PUBLIC_TOKEN_ADDRESS: process.env.NEXT_PUBLIC_TOKEN_ADDRESS,
    NEXT_PUBLIC_TIMELOCK_ADDRESS: process.env.NEXT_PUBLIC_TIMELOCK_ADDRESS,
    NEXT_PUBLIC_GOVERNOR_ADDRESS: process.env.NEXT_PUBLIC_GOVERNOR_ADDRESS,
    NEXT_PUBLIC_BOX_ADDRESS: process.env.NEXT_PUBLIC_BOX_ADDRESS,
    NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL ?? "http://127.0.0.1:8545",
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID ?? "31337",
    NEXT_PUBLIC_MIN_DELAY: process.env.NEXT_PUBLIC_MIN_DELAY ?? "60",
  };

  const parsed = envSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/**
 * @description True si la config live está completa.
 * @param env Config o null.
 */
export function isLiveMode(env: FrontendEnv | null): boolean {
  return env != null;
}
