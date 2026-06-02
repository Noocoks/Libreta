# Registro de cambios

## Arquitectura

* Separación entre índice principal e iframe de contenido.
* Centralización de navegación mediante `changeFrame()`.
* Comunicación índice ↔ iframe mediante `postMessage`.
* Carga dinámica de contenido.
* Conservación del historial mediante hash.
* Reorganización progresiva de la estructura documental.
* Creación de una arquitectura modular basada en categorías y subcategorías.

## Navegación

* Migración de enlaces directos a navegación controlada.
* Interceptación automática de enlaces internos.
* Generación automática de breadcrumbs.
* Sincronización entre índice principal e iframe.
* Incorporación de navegación contextual mediante recursos relacionados.
* Creación de relaciones cruzadas entre contenidos.

## Árbol lateral

* Migración de estructura estática a carga dinámica desde `tree.json`.
* Creación de expansión y colapso automáticos.
* Apertura automática durante búsquedas.
* Restauración automática del estado inicial.
* Creación del panel lateral ocultable.

## Sistema de categorías

* Migración a sistema basado en `data-cat`.
* Soporte para múltiples categorías simultáneas.
* Sustitución de clases específicas por selectores dinámicos.
* Herencia automática de colores.
* Creación de categorías de contexto.
* Eliminación de combinaciones específicas por herramienta.
* Normalización de categorías principales y secundarias.

## Sistema de iconos

* Migración a variables CSS.
* Inserción automática de iconos en encabezados.
* Separación entre iconografía y color.
* Unificación visual del sistema de categorías.

## Sistema de búsqueda

* Migración de búsqueda simple a filtrado completo del árbol.
* Soporte para nombres.
* Soporte para etiquetas.
* Normalización de mayúsculas y minúsculas.
* Normalización de acentos.
* Compatibilidad con caracteres especiales.
* Integración completa con el sistema de tags.

## Sistema de etiquetas

* Creación de `node-tags`.
* Migración a etiquetas interactivas.
* Integración con el buscador.
* Resaltado automático de coincidencias.
* Sincronización índice ↔ iframe.
* Definición de etiquetas específicas por herramienta.
* Definición de etiquetas específicas por categoría.

## Sistema de atajos

* Acceso rápido mediante `!`.
* Acceso rápido mediante `Escape`.
* Unificación del comportamiento entre índice e iframe.

## Diseño y experiencia visual

* Migración progresiva a una estructura común.
* Estandarización mediante `box`.
* Estandarización mediante `box box--info`.
* Estandarización mediante `node-tags`.
* Normalización de títulos y subtítulos.
* Creación de bloques reutilizables para:

  * Herramientas disponibles.
  * Ramas disponibles.
  * Recursos relacionados.
  * Arquitectura.
  * Dependencias.
  * Objetivos.
  * Código.
  * Laboratorios.
* Sustitución de listas simples por bloques visuales.
* Unificación progresiva del aspecto visual de toda la documentación.

## Metadatos

* Revisión global de títulos.
* Revisión global de palabras clave.
* Revisión global de descripciones.
* Incorporación sistemática de:

  * `author`
  * `keywords`
  * `description`
  * `viewport`
* Optimización de metadatos para documentación estática.

## Documentación

### Ciberseguridad

* Migración de Hydra al nuevo formato.
* Migración de Holehe al nuevo formato.
* Migración de ExifTool al nuevo formato.
* Migración de Legion al nuevo formato.
* Migración de Nmap / Zenmap al nuevo formato.
* Preparación de Medusa para futura documentación.
* Migración de:

  * Fuerza Bruta.
  * Escaneo de Redes y Puertos.
  * OSINT.
  * Ciberseguridad.
* Preparación de Phishing para migración.

### Inteligencia Artificial

* Creación de la categoría principal de IA.
* Creación del índice principal de IA.
* Documentación de:

  * Entornos virtuales Python.
  * Gestión de APIs.
  * OpenAI.
  * Anthropic.
  * Shell-GPT.
  * Integración con Git.
* Creación de ejemplos funcionales para:

  * OpenAI.
  * Anthropic.
  * Uso combinado de múltiples modelos.
* Documentación de:

  * Uso Dual V1.
  * Uso Dual V2.
* Incorporación de ejemplos completos en Python.
* Incorporación de buenas prácticas para gestión de credenciales.

## Git y control de versiones

* Documentación de protección de secretos mediante `.gitignore`.
* Exclusión de entornos virtuales.
* Exclusión de cachés de Python.
* Gestión segura de claves API.
* Eliminación de secretos previamente versionados.
* Integración documentada entre Git e Inteligencia Artificial.

## Código y ejemplos

* Migración progresiva desde exportaciones de CherryTree.
* Sustitución de bloques fragmentados por bloques `<pre><code>`.
* Mejora de legibilidad de scripts extensos.
* Normalización de ejemplos de código.
* Preparación para futuras integraciones y automatizaciones.

## Limpieza y refactorización

* Eliminación de breadcrumbs manuales.
* Eliminación de estructuras redundantes.
* Eliminación de estilos específicos innecesarios.
* Simplificación del motor de navegación.
* Reducción de lógica duplicada.
* Normalización progresiva del contenido existente.

## Estado actual

### Completado

* Sistema de navegación.
* Sistema de búsqueda.
* Sistema de categorías.
* Sistema de iconos.
* Sistema de breadcrumbs.
* Sistema de etiquetas.
* Árbol dinámico.
* Integración JSON.
* Rama de Inteligencia Artificial.

### En progreso

* Migración completa del contenido heredado.
* Homogeneización visual de todas las páginas.
* Ampliación de laboratorios.
* Ampliación de documentación técnica.
* Nuevas herramientas y categorías.
