import { z } from "zod";

export const themeModeSchema = z.enum(["dark", "light"]);
export type ThemeMode = z.infer<typeof themeModeSchema>;

export const daoProfileIdSchema = z.enum(["observer", "holder", "proposer", "operator"]);

export const delegateFormSchema = z.object({
  delegatee: z
    .string()
    .trim()
    .min(1, "Indicá una dirección o ‘self’")
    .refine((v) => v === "self" || /^0x[a-fA-F0-9]{40}$/.test(v), "Dirección inválida o usá ‘self’"),
});

export const proposeFormSchema = z.object({
  description: z.string().trim().min(3, "Descripción demasiado corta").max(280, "Máx. 280 caracteres"),
  boxValue: z.coerce.number().int().nonnegative("Valor ≥ 0"),
});

export const voteFormSchema = z.object({
  proposalId: z.string().trim().min(1, "Indicá el proposalId"),
  support: z.enum(["0", "1", "2"], { message: "0 Against · 1 For · 2 Abstain" }),
});

export type DelegateForm = z.infer<typeof delegateFormSchema>;
export type ProposeForm = z.infer<typeof proposeFormSchema>;
export type VoteForm = z.infer<typeof voteFormSchema>;
