import { z } from "zod";

const optionalAddress = z
  .string()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined))
  .pipe(z.union([z.undefined(), z.string().regex(/^0x[a-fA-F0-9]{40}$/)]));

const envSchema = z.object({
  NEXT_PUBLIC_TOKEN_ADDRESS: optionalAddress,
  NEXT_PUBLIC_TIMELOCK_ADDRESS: optionalAddress,
  NEXT_PUBLIC_GOVERNOR_ADDRESS: optionalAddress,
  NEXT_PUBLIC_BOX_ADDRESS: optionalAddress,
  NEXT_PUBLIC_RPC_URL: z.string().url().optional().default("http://127.0.0.1:8545"),
});

export type FrontendEnv = z.infer<typeof envSchema>;

/**
 * @description Lee y valida variables públicas del frontend.
 * @returns Config tipada; sin addresses → modo demo local.
 */
export function getFrontendEnv(): FrontendEnv {
  return envSchema.parse({
    NEXT_PUBLIC_TOKEN_ADDRESS: process.env.NEXT_PUBLIC_TOKEN_ADDRESS,
    NEXT_PUBLIC_TIMELOCK_ADDRESS: process.env.NEXT_PUBLIC_TIMELOCK_ADDRESS,
    NEXT_PUBLIC_GOVERNOR_ADDRESS: process.env.NEXT_PUBLIC_GOVERNOR_ADDRESS,
    NEXT_PUBLIC_BOX_ADDRESS: process.env.NEXT_PUBLIC_BOX_ADDRESS,
    NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL,
  });
}

/**
 * @description True si hay direcciones suficientes para modo live.
 * @param env Config validada.
 */
export function isLiveMode(env: FrontendEnv): boolean {
  return Boolean(
    env.NEXT_PUBLIC_TOKEN_ADDRESS &&
      env.NEXT_PUBLIC_TIMELOCK_ADDRESS &&
      env.NEXT_PUBLIC_GOVERNOR_ADDRESS &&
      env.NEXT_PUBLIC_BOX_ADDRESS,
  );
}
