import type { Metadata } from "next";
import Link from "next/link";
import { tokenCsrf } from "@/modules/autenticacion";
import { FormularioAutenticacion } from "../FormularioAutenticacion";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage() {
  return (
    <>
      <h1>Iniciar sesión</h1>
      <p>Ingresa con tu correo y clave para acceder a Orderix.</p>
      <FormularioAutenticacion modo="login" csrf={await tokenCsrf()} />
      <nav aria-label="Opciones de acceso" className="autenticacion__enlaces">
        <Link href="/recuperar">Olvidé mi clave</Link>
        <Link href="/registro">Crear una cuenta</Link>
      </nav>
    </>
  );
}
