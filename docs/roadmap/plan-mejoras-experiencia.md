# Plan de evolución: navegación, conocimiento y experiencia

## Objetivo

Ampliar Libreta con herramientas de lectura, navegación y consulta que hagan más cómodo explorar la documentación y entender el contenido disponible, manteniendo el proyecto como una web estática, ligera, accesible y segura.

Este documento es la hoja de ruta del PR. Las funcionalidades se implementarán por fases y se marcarán como completadas únicamente después de revisar sus pruebas. No se pretende desarrollar todo de una vez.

## Criterios generales

- Mantener la identidad visual actual: negro, rojo oscuro, grises y blanco de apoyo.
- Reutilizar la arquitectura existente (árbol de `res/json/tree.json`, router de `res/js/script.js`, lógica de página de `res/js/page.js` y sistema CSS modular).
- Priorizar HTML, CSS y JavaScript nativos; no añadir dependencias salvo que exista una justificación clara.
- Mantener el funcionamiento en GitHub Pages, sin backend ni servicios externos obligatorios.
- Respetar el aislamiento actual del iframe: no añadir `allow-same-origin` ni relajar la CSP para facilitar la comunicación.
- Diseñar primero para teclado y móvil; incluir estados accesibles, foco visible y soporte para `prefers-reduced-motion`.
- Persistir únicamente preferencias y datos de navegación no sensibles, con almacenamiento local versionado y tolerancia a datos corruptos o bloqueados.
- Cada fase debe incorporar pruebas automatizadas y una comprobación visual/responsive antes de pasar a la siguiente.

## Plan de implementación

### Fase 0 — Base común y preferencias de lectura

**Objetivo:** preparar una base coherente para que las nuevas funciones compartan configuración y comportamiento.

- Definir un pequeño sistema de preferencias de lectura: tamaño de texto, ancho de lectura y espaciado.
- Añadir un panel discreto para consultar y modificar esas preferencias.
- Guardar la configuración en almacenamiento local desde el contexto principal; comunicar al contenido del iframe solo los valores permitidos mediante mensajes validados.
- Aplicar valores por defecto y recuperación segura si el almacenamiento no está disponible o contiene datos inválidos.
- Documentar los eventos/mensajes internos que se vayan a reutilizar.

**Validación:** preferencias persistentes tras recargar, valores por defecto correctos, navegación por teclado, móvil y escritorio, y ninguna relajación de la sandbox/CSP.

### Fase 1 — Índice dinámico de lectura

**Objetivo:** facilitar la orientación dentro de documentos largos.

- Generar automáticamente un índice a partir de los encabezados reales (`h2`, `h3` y, cuando proceda, `h4`).
- Permitir saltar a cada sección y reflejar cuál está activa mientras se lee.
- Mostrar progreso de lectura de forma discreta.
- Mantener una jerarquía visual clara y plegable en pantallas pequeñas.
- Omitir encabezados sin contenido útil y resolver IDs repetidos sin romper enlaces existentes.

**Validación:** documentos cortos y largos, encabezados anidados, IDs duplicados, desplazamiento manual, enlaces directos, teclado, móvil y movimiento reducido.

### Fase 2 — Historial y navegación inteligente

**Objetivo:** poder volver rápidamente a páginas consultadas y recuperar el contexto de navegación.

- Aprovechar el router y el historial del navegador para soportar atrás/adelante sin desincronizar el iframe.
- Añadir una lista de páginas visitadas recientemente, con título y ruta validados.
- Ofrecer acceso rápido a las últimas páginas desde la interfaz principal.
- Evitar duplicados consecutivos, limitar el tamaño del historial y permitir limpiarlo.
- No registrar parámetros, fragmentos arbitrarios ni rutas que no estén presentes en el árbol autorizado.

**Validación:** atrás/adelante, recarga, enlaces internos, rutas inválidas, historial vacío/lleno, limpieza y persistencia local.

### Fase 3 — Panel de conocimiento y estadísticas

**Objetivo:** ofrecer una visión útil del contenido de Libreta, no solo de las métricas del código del repositorio.

- Crear un panel de conocimiento separado de las estadísticas técnicas ya existentes.
- Calcular métricas a partir de `tree.json`: secciones, documentos, profundidad, etiquetas y distribución por categorías.
- Mostrar accesos a las áreas más desarrolladas y permitir navegar desde cada indicador.
- Diferenciar claramente datos calculados del árbol y datos que no estén disponibles.
- Mantener los cálculos ligeros y evitar peticiones externas.

**Validación:** coherencia con el árbol, recuentos en nodos anidados, datos incompletos, estados vacíos y navegación desde el panel.

### Fase 4 — Bloques de código avanzados

**Objetivo:** mejorar la lectura y reutilización de ejemplos técnicos.

- Detectar bloques `pre > code` existentes sin exigir reescribir todos los documentos.
- Añadir botón para copiar, confirmación accesible y tratamiento de errores del portapapeles.
- Mostrar lenguaje cuando pueda inferirse de forma fiable.
- Añadir numeración de líneas opcional y mantener la selección/copia limpia, sin incluir números ni controles.
- Permitir plegar bloques extensos sin ocultar el contenido a tecnologías de asistencia.
- No introducir resaltado pesado ni cargar bibliotecas externas por defecto.

**Validación:** bloques largos/cortos, texto con caracteres especiales, copia, fallback, móvil, impresión y lectores de pantalla.

### Fase 5 — Exportación a PDF

**Objetivo:** permitir conservar o compartir documentación sin introducir un servicio de conversión externo.

- Incorporar una acción de impresión/exportación desde la página actual.
- Preparar estilos de impresión específicos para documentos, encabezados, tablas, imágenes y bloques de código.
- Ocultar navegación, controles, notificaciones y elementos decorativos que no aporten al documento.
- Evitar cortes incómodos en bloques de código y títulos cuando sea posible.
- Utilizar el diálogo nativo del navegador (Imprimir / Guardar como PDF), sin subir contenido a terceros.

**Validación:** documentos de distinta longitud, tablas, imágenes, código, márgenes, saltos de página y ausencia de controles en el PDF.

### Fase 6 — Transiciones entre secciones y pantalla de carga

**Objetivo:** pulir el cambio entre documentos sin duplicar ni degradar las animaciones incorporadas recientemente.

- Revisar el sistema de movimiento existente antes de añadir efectos nuevos.
- Afinar los estados de carga, entrada, error y cambio rápido de documento.
- Añadir una pantalla/indicador de carga coherente con la identidad visual, con duración ligada al estado real de carga y sin bloquear innecesariamente la interfaz.
- Evitar parpadeos, loaders infinitos y animaciones simultáneas al navegar rápidamente.
- Mantener una alternativa inmediata con `prefers-reduced-motion`.

**Validación:** carga lenta/rápida, error de carga, cambios consecutivos, navegación con teclado, móvil y movimiento reducido.

### Fase 7 — Sistema de notificaciones

**Objetivo:** comunicar el resultado de acciones sin interrumpir la lectura.

- Crear notificaciones tipo toast para acciones como copiar, guardar preferencias, limpiar historial o preparar impresión.
- Usar mensajes breves, estados visuales discretos y regiones accesibles (`aria-live`).
- Permitir cierre manual y desaparición automática razonable, sin ocultar mensajes críticos demasiado pronto.
- Evitar duplicados y no mostrar notificaciones para acciones triviales que ya tengan feedback visible.
- Mantener la comunicación entre iframe y ventana principal limitada a eventos tipados y validados.

**Validación:** teclado, lector de pantalla, ráfagas de eventos, cierre manual, temporización, móvil y mensajes no confiables.

### Fase 8 — Integración y revisión final

**Objetivo:** asegurar que todas las mejoras funcionan juntas y no afectan a la documentación existente.

- Ejecutar la suite completa de validación, pruebas unitarias y E2E en Chromium, Firefox y WebKit.
- Añadir pruebas específicas para preferencias, índice dinámico, historial, estadísticas, código, impresión, carga y notificaciones.
- Revisar CSP, sandbox, `postMessage`, almacenamiento local y manejo de entradas.
- Comprobar responsive, contraste, foco, accesibilidad y `prefers-reduced-motion`.
- Revisar rendimiento y evitar dependencias, listeners o temporizadores innecesarios.
- Actualizar documentación y marcar cada fase como completada solo con evidencias de prueba.

## Seguimiento

- [x] Fase 0 — Base común y preferencias de lectura
- [x] Fase 1 — Índice dinámico de lectura
- [x] Fase 2 — Historial y navegación inteligente
- [x] Fase 3 — Panel de conocimiento y estadísticas
- [x] Fase 4 — Bloques de código avanzados
- [ ] Fase 5 — Exportación a PDF
- [ ] Fase 6 — Transiciones y pantalla de carga
- [ ] Fase 7 — Sistema de notificaciones
- [ ] Fase 8 — Integración y revisión final

## Fuera de alcance

- Backend, cuentas de usuario o sincronización en la nube.
- Envío de documentos a servicios externos para generar PDF.
- Bibliotecas pesadas de resaltado o animación sin necesidad demostrada.
- Cambios en la identidad visual o relajación de las medidas de seguridad existentes.

## Forma de trabajo

Cada fase se desarrolla en una PR independiente, creada desde `master` actualizado y limitada a su alcance. La PR se mantiene abierta hasta completar las comprobaciones automatizadas y la revisión manual. Solo después de aprobar e integrar una fase se inicia la siguiente. La hoja de ruta sirve como visión global, pero no implica mezclar varias fases en una misma PR.
