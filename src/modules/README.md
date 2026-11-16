# Módulos de Orderix

Toda la lógica de negocio vive aquí, en cinco módulos. Cada uno es dueño de sus tablas y en el segundo bimestre se convierte en un microservicio (o en parte de uno).

| Módulo           | Frente        | Tablas propias                                |
| ---------------- | ------------- | --------------------------------------------- |
| `autenticacion`  | A, Alejandro  | `usuarios`, `sesiones`, `tokens_recuperacion` |
| `menu`           | B, Ricardo    | `productos`                                   |
| `pedidos`        | C, Carol      | `pedidos`, `items_pedido`, `cambios_estado`   |
| `tiempo-real`    | D, Roberth    | `salas`, `mensajes`                           |
| `calificaciones` | ejemplo (y B) | `calificaciones`                              |

**`calificaciones` es el módulo de ejemplo.** Antes de escribir el tuyo, léelo completo: tiene el patrón que seguimos todos.

## Archivos de cada módulo

```
src/modules/<modulo>/
├── index.ts          API pública: lo ÚNICO que importan los demás
├── servicio.ts       lógica de negocio, permisos y reglas
├── repositorio.ts    consultas a la base (el único archivo con Prisma)
├── validadores.ts    esquemas Zod, compartidos con el navegador
└── servicio.test.ts  pruebas del servicio
```

Si un archivo crece demasiado se puede partir (por ejemplo `servicio-items.ts`), pero manteniendo las mismas responsabilidades.

## Reglas

ESLint revisa las tres primeras. Si las rompes, `npm run lint` falla y el CI también.

1. **Desde fuera de un módulo solo se importa su API pública**: `@/modules/pedidos`. Nunca `@/modules/pedidos/repositorio`. Las excepciones son `validadores`, `eventos` y `tipos`, que se pueden importar directo porque también los usa el navegador.
2. **Solo el repositorio usa Prisma** (`@/lib/prisma`). Las páginas, los componentes y los servicios no.
3. **Fuera de los repositorios, los enums se importan desde `@/generated/prisma/enums`**, no desde el cliente de Prisma.
4. **Un módulo nunca consulta las tablas de otro.** Si necesitas un dato de otro módulo, llama a su API pública. Si la función que necesitas no existe, pídesela al responsable de ese módulo (o propón un PR pequeño en su `index.ts`).
5. **Las páginas y las acciones de servidor solo llaman a servicios.** Nada de lógica de negocio en componentes.
6. **Las referencias a tablas de otro módulo no llevan clave foránea.** Ver [docs/decisiones/0001](../../docs/decisiones/0001-referencias-entre-modulos.md).

## Cómo se escribe un servicio

Copia el patrón de `calificaciones/servicio.ts`:

```ts
export async function hacerAlgo(usuario: UsuarioSesion, entrada: unknown) {
  // 1. Permiso (aunque la página ya llamó a requireRole)
  if (usuario.rol !== Rol.MESERO) throw new ErrorProhibido();
  // 2. Validar SIEMPRE en el servidor con el mismo esquema del formulario
  const datos = validar(esquemaHacerAlgo, entrada);
  // 3. Datos de otros módulos, por su API pública
  // 4. Reglas de negocio → ErrorConflicto, ErrorNoEncontrado...
  // 5. Guardar con el repositorio propio
  return repositorio.crear(datos);
}
```

- La entrada llega como `unknown`: el servidor nunca confía en lo que manda el navegador.
- Los errores que se lanzan están en `@/lib/errores`. Su mensaje se le muestra al usuario, así que debe ser claro y no llevar datos internos.
- Si el dato pertenece a alguien (por ejemplo, el pedido de un mesero), el servicio comprueba que `usuario.id` sea el dueño.

## Contratos entre módulos

Están en el esqueleto y cambian solo con un PR pequeño que revisamos los cuatro.

| Contrato                                | Módulo          | Para qué                                                                   |
| --------------------------------------- | --------------- | -------------------------------------------------------------------------- |
| `UsuarioSesion` (`id`, `nombre`, `rol`) | `autenticacion` | El usuario que reciben todos los servicios                                 |
| `requireRole(...roles)`                 | `autenticacion` | Proteger páginas y acciones. Lanza `ErrorNoAutenticado` o `ErrorProhibido` |
| `obtenerUsuarioSesion()`                | `autenticacion` | El usuario actual o `null` (por ejemplo, para el menú de navegación)       |
| `iniciarSesion(usuarioId)`              | `autenticacion` | Crear la sesión después de verificar la clave (login)                      |
| `cerrarSesion()`                        | `autenticacion` | Cerrar la sesión actual (logout)                                           |
| `cerrarTodasLasSesiones(usuarioId)`     | `autenticacion` | Al restablecer la clave o desactivar un usuario                            |
| `tokenCsrf()` y `CAMPO_CSRF`            | `autenticacion` | Campo oculto de los formularios que cambian datos                          |
| `protegerFormulario(formData)`          | `autenticacion` | Primera línea de toda acción que cambia datos (origen + CSRF)              |
| `publicarEvento(tipo, datos)`           | `tiempo-real`   | Enviar avisos en tiempo real. Tipos en `tiempo-real/eventos.ts`            |
| `obtenerEstadoPedido(id)`               | `pedidos`       | Estado actual de un pedido (lo usa `calificaciones`)                       |

Eventos que publica `pedidos`:

| Evento                   | Cuándo                                                 | Lo reciben                     |
| ------------------------ | ------------------------------------------------------ | ------------------------------ |
| `pedido.creado`          | El mesero envía un pedido                              | Cocina                         |
| `pedido.estadoCambiado`  | Cualquier cambio de estado                             | Cocina, caja y el mesero dueño |
| `pedido.alergiaAgregada` | Se agrega o cambia una alergia en un pedido ya enviado | Cocina (como alerta)           |

## Formularios que cambian datos (CSRF)

Todo formulario que crea, edita o borra algo lleva el token CSRF, y su acción de servidor lo comprueba antes de hacer nada:

```tsx
// En la página (componente de servidor)
<form action={crearProducto}>
  <input type="hidden" name={CAMPO_CSRF} value={await tokenCsrf()} />
  ...
</form>
```

```ts
// En la acción de servidor
"use server";
export async function crearProducto(datos: FormData) {
  await protegerFormulario(datos); // 1. origen y token
  const usuario = await requireRole("ADMINISTRADOR"); // 2. sesión y rol
  await servicio.crearProducto(usuario, Object.fromEntries(datos)); // 3. el servicio valida
}
```

Las rutas `POST` de `/api` hacen lo mismo y responden los errores con `respuestaDeError(error)` de `@/lib/respuestas`. Login, registro y recuperación no tienen sesión todavía: `protegerFormulario` solo comprueba el origen.

Para el límite de intentos, la IP real del cliente se obtiene con `ipCliente(await headers())` de `@/lib/seguridad/peticion` (ya tiene en cuenta `TRUST_PROXY`).

## Tiempo real (WebSocket)

El servidor ya rechaza las conexiones sin sesión o de otro origen, une cada conexión a la sala de su rol (`rol:COCINA`) y a la suya (`usuario:7`), corta la conexión cuando vence la sesión, limita a 20 eventos cada 10 segundos y a 16 KB por mensaje.

- **Avisos desde un servicio:** `publicarEvento("pedido.creado", datos)`. Los destinatarios ya están definidos en `tiempo-real/publicador.ts`.
- **En el navegador:** `obtenerSocket()` de `@/lib/socket-cliente` devuelve la conexión compartida. Suscríbete con `socket.on(...)` dentro de un `useEffect` y quita el oyente al salir.
- **Eventos que envía el navegador (chat):** se registran en `tiempo-real/manejadores.ts`. El autor siempre sale de la sesión, nunca de lo que mande el cliente.
- **Al cerrar sesión, restablecer la clave o desactivar un usuario:** llamar también a `desconectarUsuario(usuarioId)` de `@/modules/tiempo-real`.

## Trabajar sin el módulo de autenticación terminado

Mientras el frente A no termine el inicio de sesión, pon en tu `.env`:

```
DEV_FAKE_USER_ROLE=MESERO
```

`requireRole` devolverá el primer usuario activo con ese rol (los de la semilla). Cámbialo a `COCINA`, `CAJERO` o `ADMINISTRADOR` para probar otras pantallas. En producción el servidor se niega a arrancar si esta variable tiene valor.
