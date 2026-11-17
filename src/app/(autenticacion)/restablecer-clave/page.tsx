import type { Metadata } from "next";
import Link from "next/link";
import { Anuncio } from "@/componentes/Anuncio";
import { tokenCsrf } from "@/modules/autenticacion";
import { esquemaRestablecerClave } from "@/modules/autenticacion/validadores";
import { FormularioAutenticacion } from "../FormularioAutenticacion";

export const metadata: Metadata = { title: "Restablecer clave" };

export default async function RestablecerPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;
  const tokenValido = esquemaRestablecerClave.shape.token.safeParse(token);
  return (
    <>
      <h1>Restablecer clave</h1>
      {tokenValido.success ? (
        <>
          <p>Elige una nueva clave para tu cuenta.</p>
          <FormularioAutenticacion
            modo="restablecer"
            csrf={await tokenCsrf()}
            token={tokenValido.data}
          />
        </>
      ) : (
        <Anuncio
          mensaje="El enlace de recuperación no es válido. Solicita uno nuevo."
          tipo="error"
        />
      )}
      <p>
        <Link href="/recuperar">Solicitar otro enlace de recuperación</Link>
      </p>
      <p>
        <Link href="/login">Volver a iniciar sesión</Link>
      </p>
    </>
  );
}
