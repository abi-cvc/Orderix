# Orderix

Plataforma web de gestión de pedidos y cocina para restaurantes. Proyecto de la materia Aplicaciones Web Avanzadas, Facultad de Ingeniería de Sistemas, Escuela Politécnica Nacional.

## De qué se trata

En un restaurante pequeño los pedidos suelen pasar del mesero a la cocina en papel o de palabra. Se pierden comandas, las alergias no llegan claras a quien cocina y nadie sabe cuánto tarda cada mesa en ser atendida.

Orderix reemplaza ese flujo. El mesero registra el pedido desde el celular y la cocina lo recibe al instante en su pantalla, con las alergias resaltadas. Cuando el plato está listo, el mesero recibe el aviso, lo entrega y el cajero cobra y cierra el pedido. Cada cambio de estado queda guardado con la persona y la hora, y de ahí salen los tiempos de servicio. El personal también tiene un chat general para coordinarse (por ejemplo, avisar que se acabó un plato).

### Roles

| Rol           | Qué hace                                                                     |
| ------------- | ---------------------------------------------------------------------------- |
| Mesero        | Crea pedidos para sus mesas, agrega ítems, alergias y notas, marca entregado |
| Cocina        | Ve la cola de pedidos y los pasa a "en preparación" y "listo"                |
| Cajero        | Cobra y cierra los pedidos                                                   |
| Administrador | Gestiona usuarios y el menú, y ve los reportes                               |

### Flujo de un pedido

1. El mesero crea el pedido y lo envía. Cocina recibe un aviso en tiempo real.
2. Cocina lo pasa a "en preparación".
3. Cocina lo marca "listo" y el mesero recibe el aviso.
4. El mesero lo entrega y lo marca "entregado".
5. El cajero lo cobra y lo cierra.

Un pedido también puede quedar "cancelado".

### Etapas

- **Primer bimestre:** monolito. Las vistas se renderizan en el servidor y el servidor de WebSocket vive en el mismo proyecto.
- **Segundo bimestre:** frontend desacoplado y microservicios. El código ya se organiza por módulos para que esa separación sea directa.

## Stack

| Capa                 | Tecnología                                                             |
| -------------------- | ---------------------------------------------------------------------- |
| Aplicación           | Next.js 16 con servidor Node propio (`server.ts`), TypeScript estricto |
| Tiempo real          | Socket.IO, montado en el mismo proceso y puerto                        |
| Acceso a datos       | Prisma, con migraciones versionadas                                    |
| Base de datos        | PostgreSQL (Neon en producción, Docker en local)                       |
| Validación           | Zod, con los mismos esquemas en cliente y servidor                     |
| Pruebas              | Vitest (servicios y validaciones), Playwright con axe                  |
| Calidad de código    | ESLint con jsx-a11y, Prettier                                          |
| Contenedores         | Dockerfile y docker-compose                                            |
| Integración continua | GitHub Actions                                                         |
| Despliegue           | Render (servicio web Node) y Neon (base de datos)                      |

## Integrantes

| Nombre             | Rol         |
| ------------------ | ----------- |
| Carol Velasquez    | Por asignar |
| Alejandro Veloz    | Por asignar |
| Roberth Jacome     | Por asignar |
| Ricardo Villarreal | Por asignar |

## Uso de IA

| Actividad | Uso de IA |
| --------- | --------- |
| Historias de usuario y diagramas | Se utilizó IA para redactar y organizar las historias de usuario, los criterios de aceptación, las reglas del flujo de pedidos y los requisitos no funcionales en `docs/requisitos.md`, además de proponer y revisar los diagramas Mermaid de arquitectura y modelo de datos en `docs/arquitectura.md` y `docs/modelo-datos.md`. El contenido fue revisado y validado contra los requisitos del proyecto. |
