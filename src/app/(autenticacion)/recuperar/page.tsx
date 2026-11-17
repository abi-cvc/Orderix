import type { Metadata } from "next";
import Link from "next/link";
import { tokenCsrf } from "@/modules/autenticacion";
import { FormularioAutenticacion } from "../FormularioAutenticacion";

export const metadata: Metadata = { title: "Recuperar clave" };

export default async function RecuperarPage() {
  return (
    <>
      <h1>Recuperar clave</h1>
      <p>Ingresa tu correo para solicitar un enlace con el que podrás cambiar tu clave.</p>
      <FormularioAutenticacion modo="recuperar" csrf={await tokenCsrf()} />
      <p>
        <Link href="/login">Volver a iniciar sesión</Link>
      </p>
    </>
  );
}
