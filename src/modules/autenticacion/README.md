# Autenticación (primer bimestre)

Los servicios reciben entrada `unknown` y vuelven a validarla con Zod. Los
formularios pueden importar los esquemas directamente desde `./validadores`,
que no contiene dependencias de servidor.

- `registrarUsuario({ nombre, correo, clave })`: normaliza el correo, guarda la
  clave con Argon2id y crea siempre un MESERO. Devuelve `id`, `nombre` y `rol`.
- `verificarCredenciales({ correo, clave })`: devuelve esos mismos datos o lanza
  `ErrorNoAutenticado` con «Correo o clave incorrectos.» para correo desconocido,
  clave incorrecta o cuenta inactiva. La acción de servidor debe llamar después
  a `iniciarSesion(usuario.id)` para crear la cookie.
- `solicitarRecuperacion({ correo })`: devuelve el mismo mensaje para cualquier
  correo válido. Para cuentas activas guarda únicamente el SHA-256 del token,
  con vigencia de 30 minutos, e imprime el enlace en consola para simular el correo.
- `restablecerClave({ token, clave })`: reclama un token vigente y sin usar,
  actualiza la clave y elimina las sesiones en una transacción. Después llama
  al contrato `cerrarTodasLasSesiones(usuarioId)`. Los tokens de cuentas inactivas
  se rechazan. Una actualización condicional impide consumir dos veces el token.

El enlace usa `APP_URL` y la ruta `/restablecer-clave?token=...`.

## Pantallas y acciones

- `/login`: verifica las credenciales, llama a `iniciarSesion(usuario.id)` y
  redirige al inicio protegido.
- `/registro`: solicita nombre, correo y clave; no ofrece selector de rol.
  Confirma la creación de la cuenta y permite ir a iniciar sesión.
- `/recuperar`: solicita el correo y muestra la respuesta genérica del servicio.
- `/restablecer-clave?token=...`: solicita la nueva clave. Si falta el token o
  tiene un formato inválido, ofrece pedir otro enlace. Los tokens vencidos o
  usados se rechazan al enviar el formulario.
- El encabezado de las pantallas protegidas incluye «Cerrar sesión»: llama a
  `cerrarSesion()`, desconecta las conexiones en tiempo real del usuario y
  redirige a `/login`.

Las acciones viven en `src/app/(autenticacion)/acciones.ts`. Todas comprueban
primero `await protegerFormulario(formData)`. Los formularios incluyen el campo
CSRF, validan con los mismos esquemas Zod en el navegador y muestran errores
generales y por campo. Los servicios vuelven a validar en el servidor.
El correo utiliza `autocomplete="username"`; la clave de login,
`current-password`; las nuevas claves, `new-password`. Se permite pegar en todos
los campos. No se devuelve la clave como parte del estado del formulario.

Login y recuperación aplican automáticamente el limitador en memoria de
`src/lib/seguridad/limite.ts`. Antes de consultar la base o calcular hashes se
comprueba el bloqueo sin consumir intentos. En login solo se cuentan los accesos
rechazados (clave incorrecta, correo inexistente o cuenta inactiva): cinco por
correo normalizado y 30 por IP. Un acceso correcto reinicia los fallos de ese
correo, conservando los acumulados por IP. Los accesos correctos no consumen
cuota, por lo que varios usuarios pueden entrar desde la misma red.

En recuperación se cuenta cada solicitud: cinco por correo y 30 por IP,
independientemente de que la cuenta exista. Las cuotas de login y recuperación
son independientes. Al alcanzar cada cuota empieza un bloqueo de 15 minutos,
que no se extiende con los rechazos ni con fallos que ya estaban en vuelo.
Las verificaciones de login que ya estaban en curso pueden terminar; los
bloqueos se comprueban antes de comenzar la verificación de cada solicitud.
Los contadores que no alcanzan la cuota vencen a los 15 minutos desde el primer
intento. La IP se obtiene con `ipCliente(await headers())`; nunca se
toma de un campo del formulario. El estado se pierde al reiniciar el proceso
y no se comparte entre instancias del servidor.

Pruebas de validadores y servicios, sin base de datos ni librerías adicionales:

```sh
npm ci
npm run db:generate
npx tsx --test src/modules/autenticacion/servicio.test.ts src/lib/seguridad/limite.test.ts
npm run typecheck
npm run lint
```

Las pruebas sustituyen el repositorio mediante `DependenciasAutenticacion`.
No verifican las transacciones contra PostgreSQL real.

Uso de IA: Alejandro utilizó Codex para implementar y verificar los servicios,
validadores, consultas del repositorio y pruebas de esta iteración.
