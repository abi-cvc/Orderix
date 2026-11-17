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

El enlace usa `APP_URL` y la ruta `/restablecer-clave?token=...`. Esta iteración
implementa los servicios, no las páginas; el formulario futuro de esa ruta debe
enviar `token` y `clave`. Las acciones deberán aplicar `protegerFormulario` y
el límite de intentos existente antes de llamar al servicio.

Pruebas de validadores y servicios, sin base de datos ni librerías adicionales:

```sh
npm ci
npm run db:generate
npx tsx --test src/modules/autenticacion/servicio.test.ts
npm run typecheck
npm run lint
```

Las pruebas sustituyen el repositorio mediante `DependenciasAutenticacion`.
No verifican las transacciones contra PostgreSQL real.

Uso de IA: Alejandro utilizó Codex para implementar y verificar los servicios,
validadores, consultas del repositorio y pruebas de esta iteración.
