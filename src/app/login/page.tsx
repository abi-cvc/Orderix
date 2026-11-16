import type { Metadata } from "next";

export const metadata: Metadata = { title: "Iniciar sesión" };

/**
 * PROVISIONAL (esqueleto): Frente A (Alejandro) reemplaza esta página por el
 * formulario de inicio de sesión. Mientras tanto, para probar pantallas usa
 * DEV_FAKE_USER_ROLE en tu .env (ver src/modules/README.md).
 */
export default function LoginPage() {
  return (
    <main id="contenido" className="contenido" tabIndex={-1}>
      <h1>Iniciar sesión</h1>
      <p>El formulario de inicio de sesión todavía está en construcción.</p>
    </main>
  );
}
