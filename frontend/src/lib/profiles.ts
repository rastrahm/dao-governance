/**
 * Perfiles de uso de la UI DAO (acciones habilitadas por rol de demo).
 */
export type DaoProfileId = "observer" | "holder" | "proposer" | "operator";

export type DaoProfile = {
  id: DaoProfileId;
  label: string;
  summary: string;
  canDelegate: boolean;
  canPropose: boolean;
  canVote: boolean;
  canQueueExecute: boolean;
};

export const DAO_PROFILES: readonly DaoProfile[] = [
  {
    id: "observer",
    label: "Observador",
    summary: "Solo lectura: estado de propuestas y parámetros.",
    canDelegate: false,
    canPropose: false,
    canVote: false,
    canQueueExecute: false,
  },
  {
    id: "holder",
    label: "Holder",
    summary: "Delegar poder de voto y consultar checkpoints.",
    canDelegate: true,
    canPropose: false,
    canVote: true,
    canQueueExecute: false,
  },
  {
    id: "proposer",
    label: "Proponente",
    summary: "Crear propuestas si supera el proposalThreshold.",
    canDelegate: true,
    canPropose: true,
    canVote: true,
    canQueueExecute: false,
  },
  {
    id: "operator",
    label: "Operador",
    summary: "Encolar y ejecutar tras el Timelock (MIN_DELAY).",
    canDelegate: true,
    canPropose: true,
    canVote: true,
    canQueueExecute: true,
  },
] as const;

/**
 * @description Busca un perfil por id.
 * @param id Identificador del perfil.
 * @returns Perfil o el Observador por defecto.
 */
export function getProfile(id: DaoProfileId): DaoProfile {
  return DAO_PROFILES.find((p) => p.id === id) ?? DAO_PROFILES[0];
}

/**
 * @description Valida si un string es un DaoProfileId.
 * @param value Valor a comprobar.
 */
export function isDaoProfileId(value: string): value is DaoProfileId {
  return DAO_PROFILES.some((p) => p.id === value);
}
