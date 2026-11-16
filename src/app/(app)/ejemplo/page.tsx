import type { Metadata } from "next";
import { Anuncio } from "@/componentes/Anuncio";
import { ConfirmarYEnviar } from "@/componentes/ConfirmarYEnviar";
import { EtiquetaEstado } from "@/componentes/EtiquetaEstado";
import { Paginacion } from "@/componentes/Paginacion";
import { TablaAdaptable } from "@/componentes/TablaAdaptable";
import { EstadoPedido } from "@/generated/prisma/enums";
import { FILAS_POR_PAGINA, numeroDePagina, usuarioDePagina } from "@/lib/pagina";
import { tokenCsrf } from "@/modules/autenticacion";
import { FormularioEjemplo } from "./FormularioEjemplo";

export const metadata: Metadata = { title: "Componentes de ejemplo" };

interface FilaEjemplo {
  id: number;
  mesa: number;
  mesero: string;
  estado: EstadoPedido;
  total: number;
}

// Datos ficticios fijos. Un listado real pide al servicio solo la página actual
// (skip/take en el repositorio), nunca todas las filas.
const ESTADOS = Object.values(EstadoPedido);
const DATOS: FilaEjemplo[] = Array.from({ length: 47 }, (_, i) => ({
  id: 1000 + i,
  mesa: (i % 12) + 1,
  mesero: i % 2 === 0 ? "Ana Torres" : "Luis Andrade",
  estado: ESTADOS[i % ESTADOS.length] ?? EstadoPedido.CREADO,
  total: 4.5 + ((i * 3.25) % 40),
}));

const moneda = new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" });

/**
 * Pantalla de referencia del esqueleto: muestra cada componente base y cómo se
 * usa. La revisan las pruebas de accesibilidad (axe) del paso 8.
 */
export default async function EjemploPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await usuarioDePagina();
  const totalPaginas = Math.ceil(DATOS.length / FILAS_POR_PAGINA);
  const parametros = await searchParams;
  const pagina = Math.min(numeroDePagina(parametros.pagina), totalPaginas);
  const cancelado = parametros.cancelado === "1000" ? "1000" : undefined;
  const filas = DATOS.slice((pagina - 1) * FILAS_POR_PAGINA, pagina * FILAS_POR_PAGINA);
  const csrf = await tokenCsrf();

  return (
    <>
      <h1>Componentes de ejemplo</h1>
      <p>Referencia para construir las pantallas. Los datos son ficticios.</p>

      <section className="seccion" aria-labelledby="titulo-tabla">
        <h2 id="titulo-tabla">Listado paginado</h2>
        <TablaAdaptable
          titulo={`Pedidos de ejemplo, página ${pagina} de ${totalPaginas}`}
          filas={filas}
          claveFila={(fila) => fila.id}
          columnas={[
            { titulo: "N.º", celda: (f) => f.id },
            { titulo: "Mesa", celda: (f) => f.mesa },
            { titulo: "Mesero", celda: (f) => f.mesero },
            { titulo: "Estado", celda: (f) => <EtiquetaEstado estado={f.estado} /> },
            { titulo: "Total", celda: (f) => moneda.format(f.total) },
          ]}
        />
        <Paginacion paginaActual={pagina} totalPaginas={totalPaginas} ruta="/ejemplo" />
      </section>

      <section className="seccion" aria-labelledby="titulo-formulario">
        <h2 id="titulo-formulario">Formulario con validación en el servidor</h2>
        <FormularioEjemplo csrf={csrf} />
      </section>

      <section className="seccion" aria-labelledby="titulo-confirmar">
        <h2 id="titulo-confirmar">Acción con confirmación</h2>
        <Anuncio
          tipo="exito"
          mensaje={cancelado ? `Ejemplo: el pedido ${cancelado} se habría cancelado.` : undefined}
        />
        {/* Ejemplo sin acción real. En una pantalla real: <form action={accionDeServidor}>
            con <input type="hidden" name={CAMPO_CSRF} value={csrf} />, como el formulario de arriba. */}
        <form action="/ejemplo" method="get">
          <input type="hidden" name="cancelado" value="1000" />
          <ConfirmarYEnviar
            textoBoton="Cancelar pedido 1000"
            titulo="¿Cancelar el pedido 1000?"
            descripcion="El pedido pasará a Cancelado y no podrá avanzar a otro estado."
            textoConfirmar="Sí, cancelar pedido"
            peligro
          />
        </form>
      </section>

      <section className="seccion" aria-labelledby="titulo-avisos">
        <h2 id="titulo-avisos">Avisos</h2>
        <Anuncio tipo="exito" mensaje="Pedido enviado a cocina." />
        <Anuncio tipo="alergia" mensaje="ALERGIA: mesa 4, maní en el encebollado." />
      </section>
    </>
  );
}
