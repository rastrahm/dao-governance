import Link from "next/link";

/**
 * @description Página 404.
 * @returns Mensaje y enlace al inicio.
 */
export default function NotFoundPage() {
  return (
    <section className="panel">
      <h1 className="brand" style={{ fontSize: "2rem" }}>
        404
      </h1>
      <p className="muted">No encontramos esa ruta.</p>
      <Link href="/" className="btn btn-primary" style={{ marginTop: "1rem" }}>
        Volver al inicio
      </Link>
    </section>
  );
}
