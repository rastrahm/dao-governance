"use client";

import { DAO_PROFILES, type DaoProfileId } from "@/lib/profiles";

type ProfileSwitcherProps = {
  profileId: DaoProfileId;
  onChange: (id: DaoProfileId) => void;
};

/**
 * @description Selector de perfiles DAO (Observador / Titular / Proponente / Operador).
 * @param profileId Perfil activo.
 * @param onChange Callback al cambiar perfil.
 * @returns Grupo de botones de perfil.
 */
export function ProfileSwitcher({ profileId, onChange }: ProfileSwitcherProps) {
  return (
    <div className="profile-switcher" role="group" aria-label="Perfil de uso">
      {DAO_PROFILES.map((p) => {
        const active = p.id === profileId;
        return (
          <button
            key={p.id}
            type="button"
            className={`profile-chip${active ? " is-active" : ""}`}
            data-testid={`profile-${p.id}`}
            aria-pressed={active}
            onClick={() => onChange(p.id)}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
