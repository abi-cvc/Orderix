import Link from "next/link";

export function EstadoNoEncontrado() {
  return (
    <>
      <p className="rotulo">Error 404</p>
      <h1>Página no encontrada</h1>
      <Link href="/" className="boton boton--primario">
        Volver al inicio
      </Link>
    </>
  );
}
