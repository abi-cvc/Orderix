import type { Metadata } from "next";
import { TablaAdaptable, type Columna } from "@/componentes/TablaAdaptable";
import { Rol } from "@/generated/prisma/enums";
import { estadoDeError } from "@/lib/formularios";
import { moneda } from "@/lib/formato";
import { usuarioDePagina } from "@/lib/pagina";
import { obtenerReporteMeseros, type FilaReporteMesero } from "@/modules/reportes";

export const metadata: Metadata = { title: "Reportes de meseros" };

type Parametros = Record<string, string | string[] | undefined>;

function valorUnico(valor: string | string[] | undefined): string | undefined {
  return typeof valor === "string" ? valor : undefined;
}

function fechaHoyEcuador(): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const valores = Object.fromEntries(partes.map(({ type, value }) => [type, value]));
  return `${valores.year}-${valores.month}-${valores.day}`;
}

function fechaBonita(fecha: string): string {
  const fechaParseada = new Date(`${fecha}T12:00:00-05:00`);
  if (Number.isNaN(fechaParseada.getTime())) return fecha;
  return new Intl.DateTimeFormat("es-EC", {
    timeZone: "America/Guayaquil",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(fechaParseada);
}

function duracion(minutos: number | null): string {
  if (minutos === null) return "Sin datos";
  if (minutos < 1) return `${Math.round(minutos * 60)} s`;
  return `${new Intl.NumberFormat("es-EC", { maximumFractionDigits: 1 }).format(minutos)} min`;
}

function promedioPuntaje(puntaje: number | null): string {
  if (puntaje === null) return "Sin calificaciones";
  return `${new Intl.NumberFormat("es-EC", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(puntaje)} / 5`;
}

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<Parametros>;
}) {
  const usuario = await usuarioDePagina(Rol.MESERO, Rol.ADMINISTRADOR);
  const parametros = await searchParams;
  const hoy = fechaHoyEcuador();
  const tieneFiltro = parametros.desde !== undefined || parametros.hasta !== undefined;
  const desde = tieneFiltro ? (valorUnico(parametros.desde) ?? "") : `${hoy.slice(0, 7)}-01`;
  const hasta = tieneFiltro ? (valorUnico(parametros.hasta) ?? "") : hoy;
  let filas: FilaReporteMesero[] = [];
  let error: string | undefined;

  try {
    const reporte = await obtenerReporteMeseros(usuario, { desde, hasta });
    filas = reporte.filas;
  } catch (causa) {
    const estado = estadoDeError(causa);
    error = estado.mensaje;
  }

  const periodo =
    desde && hasta ? `${fechaBonita(desde)} – ${fechaBonita(hasta)}` : "el rango indicado";
  const columnas: Columna<FilaReporteMesero>[] = [
    ...(usuario.rol === Rol.ADMINISTRADOR
      ? [{ titulo: "Mesero", celda: (fila: FilaReporteMesero) => fila.meseroNombre }]
      : []),
    { titulo: "Pedidos atendidos", celda: (fila) => fila.pedidosAtendidos },
    { titulo: "Pedidos cobrados", celda: (fila) => fila.pedidosCobrados },
    { titulo: "Pedidos cancelados", celda: (fila) => fila.pedidosCancelados },
    { titulo: "Total vendido", celda: (fila) => moneda(fila.totalVendido) },
    {
      titulo: "Tiempo promedio de cocina",
      celda: (fila) => duracion(fila.tiempoPromedioCocinaMinutos),
    },
    {
      titulo: "Tiempo promedio de entrega",
      celda: (fila) => duracion(fila.tiempoPromedioEntregaMinutos),
    },
    {
      titulo: "Calificación promedio",
      celda: (fila) => promedioPuntaje(fila.calificacionPromedio),
    },
  ];

  return (
    <>
      <header className="pagina-cabecera">
        <h1>{usuario.rol === Rol.MESERO ? "Mi reporte de desempeño" : "Reporte de meseros"}</h1>
        <p>
          Consulta pedidos atendidos, ventas, tiempos de servicio y calificaciones durante un
          período.
        </p>
      </header>

      <form method="get" action="/reportes" className="filtros" aria-label="Filtrar reporte">
        <div className="campo">
          <label htmlFor="reporte-desde" className="campo__etiqueta">
            Fecha de inicio
          </label>
          <input
            id="reporte-desde"
            className="campo__control"
            type="date"
            name="desde"
            defaultValue={desde}
            max={hasta || undefined}
            required
          />
        </div>
        <div className="campo">
          <label htmlFor="reporte-hasta" className="campo__etiqueta">
            Fecha de fin
          </label>
          <input
            id="reporte-hasta"
            className="campo__control"
            type="date"
            name="hasta"
            defaultValue={hasta}
            min={desde || undefined}
            required
          />
        </div>
        <div className="grupo-botones filtros__botones">
          <button type="submit" className="boton boton--primario">
            Generar reporte
          </button>
        </div>
      </form>

      <p className="reporte-periodo">
        Período consultado: <strong>{periodo}</strong>
      </p>
      {error && (
        <p className="aviso aviso--error" role="alert">
          {error}
        </p>
      )}

      {usuario.rol === Rol.MESERO && (
        <TablaAdaptable
          titulo={`Desempeño de ${usuario.nombre}, ${periodo}`}
          filas={filas}
          claveFila={(fila) => fila.meseroId}
          vacio="No tienes pedidos en el período seleccionado."
          columnas={columnas}
        />
      )}
      {usuario.rol === Rol.ADMINISTRADOR && (
        <TablaAdaptable
          titulo={`Desempeño de meseros, ${periodo}`}
          filas={filas}
          claveFila={(fila) => fila.meseroId}
          vacio="No hay pedidos de meseros en el período seleccionado."
          columnas={columnas}
        />
      )}
    </>
  );
}
