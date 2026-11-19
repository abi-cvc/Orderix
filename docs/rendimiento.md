# Rendimiento: índices y medición

Este documento registra cómo se midió el rendimiento de las consultas principales y qué
decisiones salieron de esa medición.

## Decisiones de diseño

- **Paginación en el servidor:** los listados piden solo la página actual (15 filas, `FILAS_POR_PAGINA`)
  con `skip`/`take` y un orden fijo (`creadoEn` y luego `id`), para que las páginas no se desordenen.
- **Sin consultas N+1:** el listado de pedidos trae sus ítems en la misma consulta de Prisma (`include` con `select`).
- **Índices** en los campos por los que se filtra u ordena:

| Índice                              | Lo usa                                                |
| ----------------------------------- | ----------------------------------------------------- |
| `pedidos (estado, creadoEn)`        | Cola de cocina, pedidos por cobrar, filtro por estado |
| `pedidos (meseroId, creadoEn)`      | Listado "Mis pedidos" del mesero                      |
| `items_pedido (pedidoId)`           | Ítems de cada pedido (listados y detalle)             |
| `cambios_estado (pedidoId, fecha)`  | Historial de un pedido                                |
| `productos (nombre)`, `(categoria)` | Búsqueda y filtro del menú                            |
| `usuarios (correo)` único           | Inicio de sesión                                      |
| `mensajes (salaId, enviadoEn)`      | Historial del chat                                    |

## Cómo se midió

- Base PostgreSQL 17 local (Docker) con **100.000 pedidos y 250.491 ítems** generados con
  `npm run db:seed:volumen -- 100000`, en una base temporal aparte.
- Las mismas consultas que genera la aplicación, con `EXPLAIN (ANALYZE)`.
- Cada consulta se ejecutó 2 veces para calentar la caché y luego 7 veces; se reporta la **mediana**
  del tiempo de ejecución en PostgreSQL.
- Primero con los índices; luego se eliminaron, se ejecutó `ANALYZE` y se repitió.

## Resultados (100.000 pedidos, mediana en ms)

| Consulta                                                     | Con índice | Sin índice | Mejora    |
| ------------------------------------------------------------ | ---------- | ---------- | --------- |
| Ítems de una página de pedidos (`pedidoId IN (...)`)         | 0,73       | 27,33      | ~37 veces |
| Conteo de pedidos por estado (caja, filtro)                  | 1,23       | 13,57      | ~11 veces |
| Cola de cocina (`estado IN (...)` ordenada por fecha)        | 7,00       | 14,40      | ~2 veces  |
| Listado del mesero con índice simple `meseroId`              | 22,57      | 26,39      | casi nada |
| Listado del mesero con índice compuesto `meseroId, creadoEn` | **0,48**   | 26,39      | ~55 veces |

## Lo que encontró la medición

El esquema original tenía un índice solo por `meseroId`. La medición mostró que casi no ayudaba
(22,6 ms contra 26,4 ms sin índice): cada mesero tiene muchos pedidos (en la prueba, la mitad cada uno),
así que PostgreSQL igual debía leerlos y ordenarlos por fecha para devolver los 15 más recientes.

Se reemplazó por un índice compuesto `(meseroId, creadoEn)` (migración
`20261117033917_indice_mesero_fecha`). Con él, PostgreSQL recorre el índice ya ordenado y se detiene
al llegar a 15 filas: la consulta bajó a **0,48 ms**. En la base local con 10.000 pedidos el plan es
`Index Scan Backward using "pedidos_meseroId_creadoEn_idx"` y tarda 0,30 ms.

En la aplicación completa (servicio + Prisma + red local), el listado de caja tarda entre 13 y 28 ms
con 10.000 pedidos, incluida la consulta de total para la paginación.

## Lighthouse

Medido con Chrome DevTools → Lighthouse (modo navegación, escritorio) sobre el despliegue en Render.

| Pantalla   | Rendimiento | Accesibilidad | Buenas prácticas |
| ---------- | ----------- | ------------- | ---------------- |
| `/login`   | _pendiente_ | _pendiente_   | _pendiente_      |
| `/pedidos` | _pendiente_ | _pendiente_   | _pendiente_      |
| `/cocina`  | _pendiente_ | _pendiente_   | _pendiente_      |

La accesibilidad además se verifica automáticamente con axe (WCAG 2.2 AA) en cada PR, en
`e2e/accesibilidad.spec.ts`.

## Cómo repetir la medición

```bash
docker compose up -d db
npm run db:deploy && npm run db:seed
npm run db:seed:volumen -- 100000
# En psql:
EXPLAIN (ANALYZE) SELECT id FROM pedidos WHERE "meseroId" = 1 ORDER BY "creadoEn" DESC, id DESC LIMIT 15;
```
