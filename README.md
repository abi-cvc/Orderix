# Orderix

[![CI](https://github.com/abi-cvc/Orderix/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/abi-cvc/Orderix/actions/workflows/ci.yml)

Plataforma web de gestión de pedidos y cocina para restaurantes. Proyecto de la materia Aplicaciones Web Avanzadas, Facultad de Ingeniería de Sistemas, Escuela Politécnica Nacional. Primer bimestre: monolito.

**Demo en línea:** <https://orderix-6il2.onrender.com> (plan gratuito: si estuvo inactiva, la primera carga tarda cerca de un minuto).

## El problema

En un restaurante pequeño (PYME) los pedidos suelen pasar del mesero a la cocina en papel o de palabra. Se pierden comandas, las alergias no llegan claras a quien cocina, el mesero no sabe cuándo un plato está listo y nadie sabe cuánto tarda cada mesa en ser atendida.

Orderix reemplaza ese flujo. El mesero registra el pedido desde el celular y la cocina lo recibe al instante, con las alergias resaltadas. Cuando el plato está listo, el mesero recibe el aviso, lo entrega y el cajero cobra y cierra el pedido. Cada cambio de estado queda guardado con la persona y la hora. El personal tiene además un chat general para coordinarse.

El planteamiento completo, los objetivos y el cronograma están en [docs/planteamiento.md](docs/planteamiento.md), y los requisitos en [docs/requisitos.md](docs/requisitos.md).

### Roles

| Rol           | Qué hace                                                                       | Qué no puede hacer                   |
| ------------- | ------------------------------------------------------------------------------ | ------------------------------------ |
| Mesero        | Crea pedidos para sus mesas, agrega ítems, alergias y notas, marca "entregado" | Ver pedidos de otros meseros, cobrar |
| Cocina        | Ve la cola de pedidos, los pasa a "en preparación" y "listo"                   | Editar el menú, cobrar               |
| Cajero        | Cobra los pedidos entregados y puede cancelar pedidos no cobrados              | Crear o editar pedidos               |
| Administrador | Gestiona usuarios y el menú, ve todos los pedidos                              | Cambiar el estado de los pedidos     |

### Flujo de un pedido

```text
CREADO → EN PREPARACIÓN → LISTO → ENTREGADO → COBRADO
   └────────────┴────────────┴────────┴──→ CANCELADO
```

1. El mesero crea el pedido. Cocina recibe un aviso en tiempo real.
2. Cocina lo pasa a "en preparación" y luego a "listo"; el mesero recibe el aviso.
3. El mesero lo entrega. El cajero lo cobra (con confirmación del total) y queda cerrado.
4. Si se agrega o cambia una alergia con el pedido ya enviado, cocina recibe una alerta.

El mesero puede cancelar solo antes de que cocina empiece; el cajero, mientras no esté cobrado. "Eliminar" un pedido es cancelarlo: el registro y su historial se conservan.

## Funcionalidades

- **Cuentas:** registro (siempre con rol mesero; el administrador asigna roles), inicio y cierre de sesión, recuperación de clave con enlace de un solo uso que vence en 30 minutos, enviado por correo con Brevo (o mostrado en la consola del servidor si el correo no está configurado).
- **Pedidos (CRUD):** crear con varios productos, alergias y notas; listado paginado con filtros por número, mesa y estado; detalle por id con historial; agregar o editar ítems; cancelar con confirmación.
- **Cocina y caja:** cola de cocina en tarjetas con alergias resaltadas; pantalla de caja con los pedidos por cobrar.
- **Menú (CRUD):** productos con búsqueda por nombre, filtros por categoría y disponibilidad, paginación, activar, desactivar y eliminar con confirmación.
- **Tiempo real:** chat general con historial guardado y lista de conectados; avisos de pedido creado, cambio de estado y alergia agregada.

## Stack

| Capa                 | Tecnología                                                             |
| -------------------- | ---------------------------------------------------------------------- |
| Aplicación           | Next.js 16 con servidor Node propio (`server.ts`), TypeScript estricto |
| Tiempo real          | Socket.IO, en el mismo proceso y puerto                                |
| Acceso a datos       | Prisma 7, con migraciones versionadas                                  |
| Base de datos        | PostgreSQL 17 (Neon en producción, Docker en local)                    |
| Validación           | Zod, con los mismos esquemas en cliente y servidor                     |
| Seguridad            | Argon2id, sesiones en BD, CSRF, helmet + CSP con nonce                 |
| Pruebas              | `node:test` (servicios y validaciones), Playwright con axe             |
| Calidad de código    | ESLint con jsx-a11y y reglas de módulos, Prettier                      |
| Contenedores         | Dockerfile y docker-compose                                            |
| Integración continua | GitHub Actions y Dependabot                                            |
| Despliegue           | Render (servicio web Docker) y Neon (base de datos)                    |

## Arquitectura

Monolito modular: un solo proceso Node atiende las páginas (Next.js, renderizadas en el servidor) y el WebSocket (Socket.IO). La lógica vive en cinco módulos con fronteras claras, pensados para separarse en microservicios en el segundo bimestre:

| Módulo           | Responsable | Tablas propias                                |
| ---------------- | ----------- | --------------------------------------------- |
| `autenticacion`  | Alejandro   | `usuarios`, `sesiones`, `tokens_recuperacion` |
| `menu`           | Ricardo     | `productos`                                   |
| `pedidos`        | Carol       | `pedidos`, `items_pedido`, `cambios_estado`   |
| `tiempo-real`    | Roberth     | `salas`, `mensajes`                           |
| `calificaciones` | (ejemplo)   | `calificaciones`                              |

Un módulo nunca consulta las tablas de otro: le pide el dato a su API pública. Por eso las referencias entre módulos no tienen clave foránea y guardan copias de lectura (por ejemplo, el nombre y el precio del producto en cada ítem). La decisión está en [docs/decisiones/0001](docs/decisiones/0001-referencias-entre-modulos.md) y las reglas para el equipo en [src/modules/README.md](src/modules/README.md).

- [Diagrama de arquitectura](docs/arquitectura.md)
- [Modelo entidad-relación](docs/modelo-datos.md)

## Ejecutar en local

Requisitos: Node 22 o superior y Docker.

```bash
git clone https://github.com/abi-cvc/Orderix.git
cd Orderix
cp .env.example .env            # y completa SESSION_SECRET (ver abajo)
npm install
docker compose up -d db         # PostgreSQL local
npm run db:deploy               # aplica las migraciones
npm run db:seed                 # 5 usuarios de prueba, 12 productos y la sala del chat
npm run dev                     # http://localhost:3000
```

Usuarios de la semilla local (clave `orderix-demo-2026`, solo para desarrollo): `mesero@orderix.test`, `mesero2@orderix.test`, `cocina@orderix.test`, `cajero@orderix.test` y `admin@orderix.test`. En producción la semilla usa otra clave, que no está en el repositorio.

Para levantar todo con Docker (aplicación + base): `docker build -t orderix-app:local .` y luego `docker compose up`.

| Comando                      | Qué hace                                                   |
| ---------------------------- | ---------------------------------------------------------- |
| `npm run dev`                | Servidor de desarrollo con recarga                         |
| `npm run build && npm start` | Compila y arranca en modo producción                       |
| `npm run lint`               | ESLint (incluye accesibilidad y reglas de módulos)         |
| `npm run typecheck`          | Revisión de tipos                                          |
| `npm test`                   | Pruebas unitarias de servicios, validaciones y seguridad   |
| `npm run test:e2e`           | Pruebas con navegador: axe, teclado y 320 px (requiere BD) |
| `npm run db:seed:volumen`    | 10.000 pedidos ficticios para medir rendimiento            |
| `npm run db:seed:sql`        | Genera la semilla como SQL (para el editor de Neon)        |

### Variables de entorno

Copia `.env.example` como `.env`. El archivo `.env` nunca se sube al repositorio.

| Variable                  | Para qué sirve                                                                                                | Ejemplo local                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `NODE_ENV`                | `development`, `test` o `production`                                                                          | `development`                                               |
| `HOST`, `PORT`            | Dirección y puerto del servidor (Render define `PORT`)                                                        | `0.0.0.0`, `3000`                                           |
| `APP_URL`                 | URL pública exacta; se usa para verificar el origen de formularios y WebSocket                                | `http://localhost:3000`                                     |
| `DATABASE_URL`            | Conexión que usa la aplicación (en Neon, la cadena con pooler)                                                | `postgresql://orderix:orderix_local@localhost:5432/orderix` |
| `DIRECT_URL`              | Conexión que usan las migraciones (en Neon, la cadena directa)                                                | igual que `DATABASE_URL`                                    |
| `TRUST_PROXY`             | `true` detrás del proxy de Render, para obtener la IP real del cliente                                        | `false`                                                     |
| `SESSION_SECRET`          | Secreto que firma los tokens CSRF. Mínimo 32 caracteres aleatorios                                            | genera uno con el comando de abajo                          |
| `SESSION_TTL_HOURS`       | Duración de la sesión en horas                                                                                | `8`                                                         |
| `DEV_FAKE_USER_ROLE`      | Solo desarrollo: usuario falso con ese rol. El servidor no arranca si se usa en producción                    | vacío                                                       |
| `BREVO_API_KEY`           | Opcional. Clave de la API de Brevo para enviar el correo de recuperación. Vacía: el enlace sale en la consola | vacío                                                       |
| `CORREO_REMITENTE`        | Correo remitente verificado en Brevo (obligatorio si hay `BREVO_API_KEY`)                                     | vacío                                                       |
| `CORREO_REMITENTE_NOMBRE` | Nombre del remitente en los correos                                                                           | `Orderix`                                                   |

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

## Despliegue

- **Render**, servicio web con el `Dockerfile` desde la rama `develop`. Al arrancar aplica las migraciones (`prisma migrate deploy`). Health check: `/api/salud`.
- **Neon**, PostgreSQL en la misma región (Ohio).
- Render termina HTTPS y el WebSocket viaja por `wss`. Con `APP_URL` en https se activan HSTS, la cookie `Secure` con prefijo `__Host-` y `upgrade-insecure-requests`.

## Seguridad

El análisis completo con el OWASP Top 10:2025 está en [docs/seguridad.md](docs/seguridad.md). Resumen de lo implementado:

| Riesgo (OWASP 2025)                | Cómo se aborda en Orderix                                                                                                                                                                                |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A01 Control de acceso roto         | `requireRole` en cada página, acción y evento; el mesero solo ve sus pedidos (un pedido ajeno responde como inexistente); reglas de estado por rol en el servidor                                        |
| A02 Configuración insegura         | helmet, CSP con nonce por petición, HSTS, `X-Frame-Options`, secretos solo en variables de entorno, usuario falso bloqueado en producción                                                                |
| A03 Cadena de suministro           | `npm audit` en el CI, Dependabot semanal, lockfile versionado                                                                                                                                            |
| A04 Fallas criptográficas          | Argon2id con sal por clave; tokens de sesión y recuperación aleatorios de 32 bytes guardados solo como SHA-256; HTTPS y `wss`                                                                            |
| A05 Inyección                      | Prisma parametrizado (sin SQL concatenado); React escapa el texto; `dangerouslySetInnerHTML` prohibido por ESLint; chat sin caracteres de control ni invisibles                                          |
| A06 Diseño inseguro                | Precios y totales calculados en el servidor; transiciones de estado validadas; cambios concurrentes (doble cobro) detectados                                                                             |
| A07 Fallas de autenticación        | Mismo error para correo o clave incorrectos; límite de 5 intentos fallidos por correo y 30 por IP; sesión renovada al entrar e invalidada en el servidor al salir; WebSocket autenticado en el handshake |
| A08 Integridad de software y datos | Zod en cada formulario y mensaje de WebSocket; CSRF con verificación de origen y token firmado                                                                                                           |
| A09 Registro y alertas             | Los registros nunca incluyen claves, tokens ni sesiones; escaneo de secretos (gitleaks) en el CI                                                                                                         |
| A10 Condiciones excepcionales      | Errores de dominio con mensajes seguros; errores inesperados con mensaje genérico; operaciones críticas en transacciones                                                                                 |

## Accesibilidad (WCAG 2.2 AA)

**Revisado:**

- axe sin violaciones WCAG 2.2 AA en inicio de sesión, inicio, pedidos, nuevo pedido, chat y la pantalla de ejemplo, también con errores de formulario visibles (se ejecuta en cada PR).
- Navegación completa con teclado, enlace "Saltar al contenido" y foco siempre visible.
- Diálogos de confirmación con foco inicial en la opción segura, Escape para cerrar y retorno del foco.
- Etiquetas visibles y errores enlazados con `aria-describedby`; validación propia en lugar de la del navegador.
- Avisos en tiempo real con `aria-live` (cortés para estados y chat, alerta para alergias) sin mover el foco.
- Estados y alergias con texto y símbolo, nunca solo color; contraste de al menos 4,5:1.
- Diseño adaptable desde 320 px sin desplazamiento horizontal; tablas que pasan a tarjetas en el celular; botones de 44 px.
- **Login, nuevo pedido, cocina y chat** revisados manualmente con teclado y Narrador de Windows (ver detalle y hallazgos en [`docs/accesibilidad.md`](docs/accesibilidad.md)). Las fallas A-01 a A-04 y el bug "En línea (0)" están corregidos.

**Pendiente:**

- Repetir la revisión con NVDA (el lector más usado); la actual se hizo con el Narrador de Windows.
- Aviso antes de que expire la sesión con opción de extenderla.

## Rendimiento

Paginación en el servidor, índices en los campos de filtro y orden, y medición de consultas con 100.000 pedidos. La medición detectó un índice poco útil en el listado del mesero; con un índice compuesto la consulta pasó de 22,6 ms a 0,48 ms. Detalle en [docs/rendimiento.md](docs/rendimiento.md).

## Calidad

- **Pruebas unitarias** (`npm test`): servicios de autenticación, pedidos, menú y chat, reglas de estado, límite de intentos, CSRF y cookies.
- **Pruebas con navegador** (`npm run test:e2e`): axe, teclado, diálogo, 320 px y permisos.
- **CI** en cada PR: lint, tipos, formato, pruebas, build, pruebas con navegador sobre PostgreSQL, `npm audit` y escaneo de secretos. `develop` y `main` están protegidas: solo se mergea por PR con el CI en verde.
- **Flujo de trabajo:** ramas `feature/*` y `docs/*` desde `develop`, PR a `develop` con revisión; `develop` pasa a `main` en cada hito.

## Integrantes

| Integrante         | Frente                                                                                                                                                     |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Carol Velásquez    | Esqueleto del proyecto, seguridad base, tiempo real base, UI base, pedidos, cocina y caja, gestión de usuarios del administrador, pruebas, CI y despliegue |
| Alejandro Veloz    | Usuarios y seguridad: registro, inicio de sesión, recuperación, límite de intentos, plan de seguridad OWASP                                                |
| Ricardo Villarreal | Menú: CRUD de productos; requisitos, historias de usuario y diagramas                                                                                      |
| Roberth Jácome     | Tiempo real y chat: chat general, historial y conectados; planteamiento y cronograma                                                                       |

## Uso de IA

Cada integrante declara cómo usó herramientas de IA. Todo el código y los documentos fueron revisados, probados y entendidos por el equipo antes de integrarse.

| Integrante | Herramienta                     | Para qué se usó                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Carol      | Claude (Anthropic), Claude Code | Planificación del esqueleto, implementación guiada de la seguridad base, tiempo real, UI base, pedidos, gestión de usuarios, pruebas y CI; revisión de los PR del equipo; redacción de documentación. Cada paso se verificó y commiteó de forma manual.                                                                                                                                                                                              |
| Ricardo    | IA (asistente)                  | Redactar y organizar las historias de usuario, criterios de aceptación y requisitos no funcionales; proponer y revisar los diagramas Mermaid.                                                                                                                                                                                                                                                                                                        |
| Ricardo    | GitHub Copilot                  | Implementar el CRUD de productos, sus validaciones y la interfaz.                                                                                                                                                                                                                                                                                                                                                                                    |
| Alejandro  | Codex (OpenAI)                  | Lectura del contexto, consulta de fuentes oficiales y redacción de la tabla OWASP de `docs/seguridad.md`.                                                                                                                                                                                                                                                                                                                                            |
| Alejandro  | _por completar_                 | _Pantallas y servicio de autenticación (completar si se usó IA)._                                                                                                                                                                                                                                                                                                                                                                                    |
| Roberth    | Antigravity (Google DeepMind)   | Implementación asistida del módulo de chat (validadores, repositorio, servicio), eventos Socket.IO (manejadores.ts), pantalla del chat (ChatCliente.tsx), contador de mensajes no leídos, indicador de usuarios escribiendo, hora relativa en Ecuador, avisos sonoros en cocina con Web Audio API, correcciones de accesibilidad A-01 a A-04 y pruebas unitarias de cada componente. Todo el código fue revisado, ajustado y commiteado manualmente. |
