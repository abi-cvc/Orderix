# Orderix: Planteamiento del proyecto

**Materia:** Aplicaciones Web Avanzadas, Facultad de Ingeniería de Sistemas, EPN
**Etapa:** Primer bimestre, monolito con base de datos y chat por WebSocket
**Equipo:** Alejandro Veloz, Carol Velásquez, Ricardo Villareal y Roberth Jácome
**Entrega y defensa:** jueves 19 de noviembre de 2026

---

## 1. Introducción

Orderix es una plataforma web de gestión de pedidos y cocina para restaurantes. Permite registrar pedidos, administrar los productos del menú y supervisar el estado de preparación de cada orden. El personal de atención y el de cocina se coordinan mediante actualizaciones y notificaciones en tiempo real.

El proyecto se desarrolla en dos etapas. En el primer bimestre se construye un **monolito**: vistas renderizadas en el servidor, lógica, persistencia y servidor WebSocket dentro de un solo proyecto desplegable. En el segundo bimestre ese monolito se convertirá en un frontend desacoplado con microservicios. Por eso, desde ahora el código se organiza en módulos con fronteras claras, pensando en esa migración.

## 2. Planteamiento del problema

En un restaurante pequeño o mediano (PYME), el pedido pasa por varias personas: el mesero que lo toma, la cocina que lo prepara, el cajero que lo cobra. Cuando esa comunicación depende de papel, de gritos o de mensajes sueltos, aparecen problemas recurrentes:

- **Errores en los pedidos:** ítems mal anotados, notas que no llegan a cocina o pedidos adicionales que se pierden.
- **Alergias sin visibilidad:** una alergia anotada a mano o comentada de palabra puede no llegar a quien cocina, con riesgo para el cliente.
- **Falta de seguimiento:** el mesero no sabe cuándo un pedido está listo y cocina no tiene una cola ordenada de lo pendiente.
- **Sin trazabilidad:** no queda registro de quién cambió el estado de un pedido ni cuándo, por lo que no se pueden medir los tiempos de servicio.
- **Comunicación informal dispersa:** avisos como "se acabó un plato" se pierden entre el personal.
- **Control de acceso débil:** cada persona debería ver y hacer solo lo que le corresponde (un mesero no debería ver los pedidos de otro, ni cocina cobrar).

**Pregunta central:** ¿cómo puede un restaurante coordinar a su personal de atención, cocina y caja, reduciendo errores y mejorando la eficiencia, mediante una aplicación web segura con actualizaciones en tiempo real?

## 3. Justificación

Orderix responde a ese problema centralizando el ciclo de vida del pedido en un solo sistema con roles diferenciados, avisos automáticos en tiempo real y un historial de cambios de estado. Desde el punto de vista académico, el proyecto permite aplicar de forma integrada autenticación segura, CRUD con paginación, comunicación por WebSockets, persistencia en base de datos relacional, pruebas automatizadas, accesibilidad y despliegue, además de preparar la arquitectura para su evolución a microservicios en el segundo bimestre.

## 4. Objetivos

### 4.1 Objetivo general

Desarrollar una aplicación web monolítica de gestión de pedidos y cocina para restaurantes, con autenticación segura, CRUD de pedidos y chat/notificaciones en tiempo real por WebSocket, que reduzca errores y mejore la coordinación entre meseros, cocina, caja y administración.

### 4.2 Objetivos específicos

1. Implementar el registro de usuarios con validación de datos, el inicio de sesión contra la base de datos con contraseñas almacenadas con hash y sal, y la recuperación de clave mediante un token de un solo uso con caducidad.
2. Controlar el acceso por cuatro roles (mesero, cocina, cajero y administrador), con rutas protegidas y cierre de sesión.
3. Construir el CRUD del pedido (entidad principal) con búsqueda o filtro, consulta por identificador, listado paginado y eliminación con confirmación, y el CRUD de productos del menú.
4. Registrar el flujo completo del pedido (creado, en preparación, listo, entregado y cobrado, o cancelado), guardando quién realizó cada cambio y cuándo.
5. Gestionar las alergias como un campo propio de cada ítem, resaltado en cocina y notificado en tiempo real si cambia con el pedido ya enviado.
6. Implementar un chat por WebSocket integrado en el mismo servidor, con sala general, historial en base de datos, lista de usuarios conectados y notificaciones automáticas de pedidos.
7. Aplicar medidas de seguridad contra inyección SQL, XSS y CSRF, validación en cliente y servidor, secretos en variables de entorno y autenticación en el handshake del WebSocket.
8. Diseñar una interfaz adaptable y accesible (WCAG 2.2 nivel AA) y medir el rendimiento (tiempo de consulta con y sin índice, informe de Lighthouse).
9. Asegurar la calidad con al menos 5 pruebas automatizadas (meta: unas 12), integración continua, un README completo y un repositorio público con commits de todos los integrantes.
10. Documentar la arquitectura del monolito y el modelo de datos, y dejar el código preparado (módulos desacoplados) para la migración a microservicios.

## 5. Alcance

### 5.1 Incluye

- Registro, inicio de sesión, recuperación de clave (envío del correo simulado en consola) y cierre de sesión.
- Cuatro roles con permisos diferenciados:
  - **Mesero:** crea pedidos para sus mesas, agrega ítems, alergias y notas, y marca el pedido como entregado. Solo ve sus propios pedidos.
  - **Cocina:** ve la cola de pedidos, los pasa a "en preparación" y a "listo", y ve las alergias resaltadas.
  - **Cajero:** cobra y cierra pedidos.
  - **Administrador:** gestiona usuarios y menú.
- CRUD de pedidos e ítems, con historial de cambios de estado.
- CRUD de productos del menú con búsqueda y paginación.
- Chat con sala general y notificaciones en tiempo real (pedido creado, estado cambiado, alergia agregada).
- Base de datos PostgreSQL con esquema documentado y diagrama entidad-relación.
- Pruebas automatizadas, integración continua y despliegue en Render y Neon.

### 5.2 Funciones opcionales (solo si el núcleo está terminado el lunes 16 de noviembre)

- Calificación del servicio por parte del cliente, mediante una pantalla con cinco caritas que abre el cajero para un pedido ya cobrado (una calificación por pedido).
- Reporte por mesero: promedio de calificaciones, cantidad de pedidos, tiempos de preparación y entrega, y cancelaciones. Cada mesero ve solo sus números y el administrador los de todos.

Estas funciones no están en la rúbrica del primer bimestre, por lo que se construyen únicamente si el núcleo está listo.

### 5.3 Fuera del alcance de esta etapa

- Pasarelas de pago reales o facturación electrónica (el cobro es el cambio de estado a "cobrado").
- Envío real de correos (se simula en consola).
- Servicios externos de tiempo real como Pusher, Firebase o Ably (no permitidos por la guía).
- Separación en microservicios y frontend desacoplado (segundo bimestre).

## 6. Enfoque técnico

| Componente           | Tecnología                                                            |
| -------------------- | --------------------------------------------------------------------- |
| Aplicación           | Next.js con servidor Node propio (no serverless), TypeScript estricto |
| Acceso a datos       | Prisma con migraciones versionadas                                    |
| Base de datos        | PostgreSQL (Neon en producción, Docker en local)                      |
| Tiempo real          | Socket.IO montado en el mismo servidor Node                           |
| Validación           | Zod (mismos esquemas en cliente y servidor)                           |
| Pruebas              | Vitest, y Playwright con axe                                          |
| Contenedores         | Dockerfile y docker-compose                                           |
| Integración continua | GitHub Actions                                                        |
| Despliegue           | Render (servicio web) y Neon (base de datos)                          |

**Reglas de arquitectura para facilitar proyecto de segundo bimestre:**

- Código organizado en `src/modules` con cinco módulos: `autenticacion`, `menu`, `pedidos`, `tiempo-real` y `calificaciones`, cada uno con servicio, repositorio, validadores y pruebas.
- Las páginas y controladores solo llaman a servicios; la lógica de negocio vive en los servicios.
- Un módulo nunca consulta las tablas de otro: pide el dato al servicio correspondiente.
- La protección de rutas se centraliza en `requireRole` y el envío de eventos en `publicarEvento(tipo, datos)`.

## 7. Equipo y reparto de responsabilidades

Los cuatro frentes se asignarán entre Alejandro, Carol, Ricardo y Roberth.

| Frente                           | Descripción                                                                                                                | Responsable |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------- |
| A. Usuarios y seguridad          | Registro, inicio de sesión, recuperación de clave, roles, permisos por ruta, límite de intentos y pruebas de autenticación | Alejandro   |
| B. Menú, calificación y reportes | CRUD de productos con búsqueda y paginación; calificación y reporte por mesero (opcionales)                                | Ricardo     |
| C. Pedidos                       | CRUD de pedidos e ítems, alergias, estados, historial, pantalla de cocina y pantalla del cajero (el frente más pesado)     | Carol       |
| D. Tiempo real y chat            | Servidor Socket.IO, autenticación del handshake, sala general, historial, usuarios conectados y notificaciones             | Roberth     |

Cada integrante debe tener commits reales en su propio frente, trabajar en su propia rama y abrir pull requests pequeños revisados por otra persona del equipo.

## 8. Cronograma

| Fechas                  | Actividad                                                                 | Responsables                |
| ----------------------- | ------------------------------------------------------------------------- | --------------------------- |
| Jue 12 – vie 13 de nov. | Esqueleto del proyecto                                                    | Carol                       |
| Vie 13 – mar 17         | Requisitos, diagramas y presentación                                      | Todos                       |
| Vie 13 – lun 16         | Autenticación y roles (A), menú (B), tiempo real y chat (D)               | Alejandro, Ricardo, Roberth |
| Sáb 14 – mar 17         | Pedidos, cocina y caja (C)                                                | Carol                       |
| Lun 16 – mié 18         | Integración, pruebas y despliegue                                         | Todos                       |
| Mar 17                  | **Puerta 2: funciones congeladas**                                        | Todos                       |
| Mié 18 – jue 19         | Ensayo, README y etiqueta `v1.0-b1`                                       | Todos                       |
| **Jue 19 de nov.**      | **Entrega y defensa** (15 min + 5 de preguntas, con demostración en vivo) | Todos                       |
