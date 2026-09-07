"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { daoProfileIdSchema } from "@/lib/schemas";
import { getProfile, type DaoProfile, type DaoProfileId } from "@/lib/profiles";

const STORAGE_KEY = "dao-profile";

/**
 * @description Hook de perfil DAO con persistencia en localStorage.
 * @returns profile, profileId, setProfileId, ready.
 */
export function useProfile() {
  const [profileId, setProfileIdState] = useState<DaoProfileId>("observer");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const parsed = daoProfileIdSchema.safeParse(stored);
    if (parsed.success) {
      setProfileIdState(parsed.data);
    }
    setReady(true);
  }, []);

  const setProfileId = useCallback((id: DaoProfileId) => {
    window.localStorage.setItem(STORAGE_KEY, id);
    setProfileIdState(id);
  }, []);

  const profile: DaoProfile = useMemo(() => getProfile(profileId), [profileId]);

  return { profile, profileId, setProfileId, ready };
}
