import { SelectorTema } from "@/componentes/SelectorTema";
import { EstadoNoEncontrado } from "@/componentes/EstadoNoEncontrado";

export default function PaginaNoEncontrada() {
  return (
    <main id="contenido" className="contenido pagina-no-encontrada" tabIndex={-1}>
      <SelectorTema />
      <EstadoNoEncontrado />
    </main>
  );
}
