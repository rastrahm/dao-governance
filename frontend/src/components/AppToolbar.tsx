"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

type AppToolbarProps = {
  showHome?: boolean;
};

/**
 * @description Barra superior: ayuda + tema claro/oscuro.
 * @param showHome Si true, muestra enlace a inicio.
 * @returns Toolbar de navegación.
 */
export function AppToolbar({ showHome = false }: AppToolbarProps) {
  return (
    <div className="hero-top toolbar">
      {showHome ? (
        <Link href="/" className="btn btn-ghost" data-testid="home-link">
          Inicio
        </Link>
      ) : (
        <Link href="/ayuda" className="btn btn-ghost" data-testid="help-link" aria-label="Ayuda">
          Ayuda
        </Link>
      )}
      <ThemeToggle />
    </div>
  );
}
