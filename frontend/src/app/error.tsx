"use client";

/**
 * @description Error boundary de la ruta raíz.
 * @param error Error capturado.
 * @param reset Función para reintentar.
 * @returns UI de error.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="panel">
      <h1 className="panel-title">Error</h1>
      <p className="muted">{error.message || "Algo falló al cargar la gobernanza."}</p>
      <button type="button" className="btn btn-primary" onClick={reset} style={{ marginTop: "1rem" }}>
        Reintentar
      </button>
    </section>
  );
}
