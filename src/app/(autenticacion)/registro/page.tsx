import type { Metadata } from "next";
import Link from "next/link";
import { tokenCsrf } from "@/modules/autenticacion";
import { FormularioAutenticacion } from "../FormularioAutenticacion";

export const metadata: Metadata = { title: "Crear cuenta" };

export default async function RegistroPage() {
  return (
    <>
      <h1>Crear cuenta</h1>
      <p>Tu cuenta tendrá el rol de mesero. El administrador puede cambiarlo después.</p>
      <FormularioAutenticacion modo="registro" csrf={await tokenCsrf()} />
      <p>
        <Link href="/login">Ya tengo una cuenta. Iniciar sesión</Link>
      </p>
    </>
  );
}
