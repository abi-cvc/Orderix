# Accesibilidad de Orderix: revisión manual

Este documento registra qué funciona y qué no en la revisión manual de accesibilidad de Orderix, con sugerencias de solución para lo que falla. Complementa las pruebas automáticas con axe (`e2e/accesibilidad.spec.ts`), que no detectan todo lo que percibe una persona que usa lector de pantalla o teclado.

**Objetivo de referencia:** WCAG 2.2, nivel AA.

## 1. Alcance y método

| Aspecto                   | Detalle                                                                     |
| ------------------------- | --------------------------------------------------------------------------- |
| Versión revisada          | Sitio desplegado en Render, noviembre de 2026                               |
| Navegador                 | Chrome                                                                      |
| Roles usados              | Mesero (login, nuevo pedido, detalle de pedido, chat) y cocina (cocina)     |
| Lector de pantalla        | Narrador de Windows (ver sección 6: falta repetir con NVDA)                 |
| Herramienta de estructura | WAVE (extensión de WebAIM), pestaña "Order" para ver el orden de navegación |
| Teclado                   | Recorrido con Tab                                                           |
| Zoom                      | 200 % del navegador                                                         |
| Pantallas                 | Login, cocina, nuevo pedido, detalle de pedido y chat                       |

## 2. Resumen

| Pantalla          | Orden de navegación                                           | Lector de pantalla                                | Zoom al 200 %         | Resultado                          |
| ----------------- | ------------------------------------------------------------- | ------------------------------------------------- | --------------------- | ---------------------------------- |
| Login             | Correcto                                                      | Correcto                                          | Sin cortes ni encimes | Aprobada                           |
| Cocina            | Correcto                                                      | Correcto, con una observación en el pie de página | Sin cortes ni encimes | Aprobada con observación           |
| Nuevo pedido      | Correcto                                                      | Correcto                                          | Sin cortes ni encimes | Aprobada                           |
| Detalle de pedido | Salta el contenido del pedido al usar Tab                     | Por verificar en modo exploración                 | No se registró        | Con observación                    |
| Chat              | No se llega al botón "Enviar" con Tab; mensajes no navegables | Fallas corregidas (ver sección 4)                 | Sin cortes ni encimes | **Revisada, hallazgos corregidos** |

## 3. Qué funciona

- **Orden lógico y consistente en todas las pantallas:** enlace "Saltar al contenido", logo, navegación principal, interruptor "Modo claro", "Cerrar sesión" y luego el contenido de la pantalla.
- **Navegación principal identificada:** el lector anuncia la región de navegación y marca la página actual ("Inicio, current page").
- **Login:** los campos "Correo electrónico" y "Clave" se anuncian con su etiqueta y tipo, el botón "Mostrar clave" se anuncia como botón de activación y los enlaces "Olvidé mi clave" y "Crear una cuenta" están agrupados en una región "Opciones de acceso".
- **Nuevo pedido:** cada producto es una opción de selección con su nombre y precio ("Café pasado $1,75"). Los campos Mesa, Buscar producto, Cantidad, Alergias, Notas y Notas del pedido tienen etiqueta, y los opcionales lo indican en el texto.
- **Cocina:** el botón de acción lleva el contexto de la mesa ("Empezar preparación (mesa 5)"), de modo que no es ambiguo entre varios pedidos. La urgencia se muestra con ícono y texto ("Urgente"), no solo con color. Hay un texto de resumen ("1 pedido pendiente, 1 con más de 15 minutos de espera").
- **Zoom al 200 %:** el menú lateral pasa a un botón "Menú" y el contenido se reorganiza sin pérdida de información, sin cortes ni elementos encimados.

## 4. Hallazgos y sugerencias de solución

Prioridad: **Alta** impide completar una tarea, **Media** dificulta o confunde, **Baja** es una mejora.

| ID   | Pantalla                             | Prioridad | Qué ocurre                                                                                                                                                                                          | Por qué importa                                                                                                                                | Sugerencia de solución                                                                                                                                                                                                                                                         | Estado                                                                                                                                                                                                                    |
| ---- | ------------------------------------ | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A-01 | Chat                                 | Alta      | Al escribir un mensaje no se puede llegar con Tab al botón "Enviar". WAVE tampoco lo incluye en el orden de navegación después del campo de texto.                                                  | Una persona que usa solo teclado no puede enviar mensajes (WCAG 2.1.1 Teclado).                                                                | Revisar que el botón esté después del campo en el DOM y que no esté con `disabled` mientras el campo está vacío o la conexión se establece. Es preferible usar `aria-disabled` con un mensaje de error al enviar vacío, y permitir enviar con Enter.                           | **Corregido** — El botón ya no usa `disabled`; usa `aria-disabled` y valida en `onSubmit`. El campo y el botón están en orden en el DOM.                                                                                  |
| A-02 | Chat                                 | Alta      | Tras "Cerrar sesión" el lector pasa directo al campo de escribir. El área de mensajes no se detecta ni se lee.                                                                                      | El historial no es accesible para teclado ni lector (WCAG 1.3.1, 2.1.1).                                                                       | Marcar la lista de mensajes con `role="log"` y `aria-label="Mensajes del chat"`, y darle `tabIndex={0}` con un indicador de foco visible, para que se pueda enfocar y desplazar con las flechas. Mantener el historial inicial fuera de la región que anuncia mensajes nuevos. | **Corregido** — El área de mensajes tiene `role="log"`, `aria-label="Mensajes del chat"` y `tabIndex={0}`. Los mensajes nuevos se anuncian con `aria-live="polite"` y `aria-relevant="additions"` en una región separada. |
| A-03 | Chat                                 | Media     | El título "Chat general" y su descripción no se leen al pasar con Tab; el foco salta de "Cerrar sesión" al campo de texto.                                                                          | Con Tab solo se enfocan elementos interactivos, así que el lector no presenta el título. La persona no sabe en qué pantalla está (WCAG 2.4.6). | Hacer que "Saltar al contenido" mueva el foco al contenedor principal (`<main id="contenido" tabIndex={-1}>`), de modo que el lector empiece leyendo el título. Confirmar que el título es un `<h1>`.                                                                          | **Corregido** — El `<main>` del layout tiene `id="contenido"` y `tabIndex={-1}`; el enlace "Saltar al contenido" apunta a `#contenido`. El lector anuncia el `<h1>` al aterrizar.                                         |
| A-04 | Todas                                | Media     | Al pulsar "Saltar al contenido" el flujo del lector cambia.                                                                                                                                         | El enlace debe llevar el foco y la lectura al contenido principal (WCAG 2.4.1).                                                                | Igual que A-03: destino con `tabIndex={-1}` y comprobar que el foco aterriza ahí en todas las pantallas.                                                                                                                                                                       | **Corregido** — Mismo fix que A-03; aplica a todas las pantallas del layout compartido.                                                                                                                                   |
| A-05 | Detalle de pedido                    | Media     | Tras "Volver", la siguiente parada con Tab es el pie de página; el contenido del pedido (estado, mesero, productos, alergia) no recibe foco.                                                        | Es normal que el texto estático no reciba foco, pero conviene asegurar que se lea bien en modo exploración.                                    | Usar estructura semántica: encabezados (`h2` "Productos"), lista o lista de definición para los datos y la alerta de alergia con texto visible, no solo color. Probar con las flechas en modo exploración del lector.                                                          | Por verificar                                                                                                                                                                                                             |
| A-06 | Cocina, nuevo pedido (pie de página) | Baja      | Con Tab, el pie se anuncia como "Información sobre el contenido… Vínculo: chat general", sin el texto "¿Necesitas ayuda? Escribe en el chat general o pide apoyo al administrador del restaurante". | Quien navega con Tab oye solo el nombre del vínculo, sin su contexto.                                                                          | Que el vínculo tenga un nombre autoexplicativo ("Abrir el chat general") o relacionarlo con el párrafo con `aria-describedby`.                                                                                                                                                 | Abierto                                                                                                                                                                                                                   |

## 5. Observación adicional (no es de accesibilidad)

- **Chat, lista "En línea":** ~~en la captura del chat aparece "En línea (0)" y "No hay usuarios conectados" aunque hay una sesión activa~~ — **Corregido.** El cliente ahora pide explícitamente la lista de conectados al montar (`chat:conectados`) y el manejador del servidor responde con el estado actual. Ya no depende de que el evento llegue exactamente al conectarse.

## 6. Pendiente por verificar

- **Repetir con NVDA.** La revisión se hizo con el Narrador de Windows. Conviene repetir login, nuevo pedido, cocina y chat con NVDA, que es el lector más usado, y comparar resultados.
- **Navegar solo con Shift + Tab y las flechas** (en listas de opciones y radios), y revisar cómo cambia el flujo del lector tras "Saltar al contenido".
- **Mensajes nuevos del chat en vivo:** comprobar que se anuncian de forma amable (`aria-live="polite"`) sin leer de nuevo el historial.
- **Avisos de cocina:** comprobar que los pedidos nuevos y las alergias se anuncian al lector además de mostrarse.
- **Contraste en modo claro** y revisión de WAVE en las pestañas "Contrast" y "Structure" (solo se revisó "Order").
- **Pantallas pequeñas (320 px)** y orientación horizontal en móvil.

## 7. Cómo repetir la revisión

1. Iniciar sesión con un usuario mesero y otro de cocina en dos navegadores.
2. Activar el lector de pantalla y recorrer con Tab: login, nuevo pedido, cocina y chat. Anotar qué se lee en cada parada.
3. Abrir WAVE y revisar la pestaña "Order" en cada pantalla.
4. Ampliar el navegador al 200 % y comprobar que nada se corta ni se encima.
5. Ejecutar `npx playwright test e2e/accesibilidad.spec.ts` para la parte automática.

## 8. Referencias

- WCAG 2.2: 1.3.1 Información y relaciones, 1.4.4 Cambio de tamaño del texto, 1.4.10 Reflujo, 2.1.1 Teclado, 2.4.1 Evitar bloques, 2.4.3 Orden del foco, 2.4.6 Encabezados y etiquetas, 4.1.3 Mensajes de estado.
