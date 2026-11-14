# 0001. Referencias entre módulos sin clave foránea

- **Fecha:** 2026-11-13
- **Estado:** aceptada

## Contexto

El código se organiza en cinco módulos (`autenticacion`, `menu`, `pedidos`, `tiempo-real`, `calificaciones`) y cada uno es dueño de sus tablas. En el segundo bimestre cada módulo pasa a ser un microservicio con su propia base de datos.

Si `pedidos` tuviera una clave foránea hacia `usuarios`, o `items_pedido` hacia `productos`, al separar las bases habría que cortar esas relaciones y reescribir las consultas que las usan con `include`.

## Decisión

- Las relaciones **dentro** de un módulo usan `@relation` y clave foránea. Ejemplos: `items_pedido` → `pedidos`, `mensajes` → `salas`, `sesiones` → `usuarios`.
- Las referencias **entre** módulos son columnas simples sin clave foránea: `pedidos.meseroId`, `items_pedido.productoId`, `cambios_estado.usuarioId`, `calificaciones.pedidoId`, `calificaciones.cajeroId` y `mensajes.autorId`.
- Para mostrar datos de otro módulo sin consultarlo se guarda una copia en el momento en que se crea el registro:
  - `pedidos.meseroNombre`: el nombre del mesero.
  - `items_pedido.nombreProducto` y `items_pedido.precioUnitario`: el nombre y el precio del producto.
  - `mensajes.autorNombre`: el nombre del autor.
- Los usuarios se desactivan (`activo = false`) en lugar de borrarse, para que las referencias históricas sigan siendo válidas.

## Consecuencias

- La base no impide guardar un `meseroId` inexistente. Lo comprueba el servicio que crea el registro, preguntándole al servicio del otro módulo.
- Si un usuario cambia de nombre, los pedidos y mensajes viejos conservan el nombre anterior. Para un registro histórico eso es lo esperado; para el precio es justo lo que se busca, porque un cambio de menú no debe alterar pedidos pasados.
- En el segundo bimestre cada módulo se lleva sus tablas tal cual, sin migraciones para eliminar claves foráneas. Estas copias son el punto de partida del análisis de refactorización de datos.
