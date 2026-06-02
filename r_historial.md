# Registro de cambios

| Área          | Cambio                                                                        |
| ------------- | ----------------------------------------------------------------------------- |
| Arquitectura  | Separación entre índice principal e iframe de contenido                       |
| Arquitectura  | Centralización de navegación mediante `changeFrame()`                         |
| Arquitectura  | Comunicación índice ↔ iframe mediante `postMessage`                           |
| Categorías    | Migración de categorías individuales a sistema `data-cat`                     |
| Categorías    | Soporte para múltiples categorías simultáneas                                 |
| Categorías    | Sustitución de clases específicas por selectores `[data-cat~="..."]`          |
| Categorías    | Herencia automática de color desde la categoría principal                     |
| Categorías    | Creación de categorías de contexto (`arq`, `lab`, `cmds`, `ini`, `peruse`)    |
| Categorías    | Eliminación de combinaciones específicas por herramienta                      |
| Iconos        | Migración de iconos manuales a variables CSS                                  |
| Iconos        | Inserción automática del icono en el `<h1>`                                   |
| Iconos        | Separación entre color e icono                                                |
| Colores       | Migración de colores específicos a sistema de variables CSS                   |
| Breadcrumbs   | Migración de breadcrumbs escritos manualmente a generación automática         |
| Breadcrumbs   | Eliminación de `<div id="breadcrumb"></div>` de las páginas                   |
| Breadcrumbs   | Generación dinámica desde la estructura del árbol                             |
| Navegación    | Migración de enlaces directos a navegación controlada por iframe              |
| Navegación    | Interceptación automática de enlaces internos                                 |
| Navegación    | Conservación del historial mediante hash                                      |
| Árbol lateral | Migración de estructura estática a carga desde `tree.json`                    |
| Árbol lateral | Creación de expansión y colapso automáticos                                   |
| Árbol lateral | Apertura automática durante búsquedas                                         |
| Árbol lateral | Restauración automática del estado inicial                                    |
| Árbol lateral | Creación del panel ocultable                                                  |
| Búsqueda      | Migración de búsqueda simple a filtrado completo del árbol                    |
| Búsqueda      | Soporte para nombres                                                          |
| Búsqueda      | Soporte para tags                                                             |
| Búsqueda      | Normalización de mayúsculas                                                   |
| Búsqueda      | Normalización de acentos                                                      |
| Tags          | Creación del sistema `node-tags`                                              |
| Tags          | Migración de etiquetas informativas a etiquetas interactivas                  |
| Tags          | Integración de tags con el buscador                                           |
| Tags          | Resaltado automático de coincidencias                                         |
| Tags          | Sincronización índice ↔ iframe                                                |
| Atajos        | Creación de acceso rápido mediante `!`                                        |
| Atajos        | Creación de acceso rápido mediante `Escape`                                   |
| Atajos        | Unificación de funcionamiento entre índice e iframe                           |
| Diseño        | Migración de páginas heterogéneas a estructura común                          |
| Diseño        | Estandarización mediante `box`                                                |
| Diseño        | Estandarización mediante `box box--info`                                      |
| Diseño        | Estandarización mediante `node-tags`                                          |
| Diseño        | Estandarización de títulos y subtítulos                                       |
| Diseño        | Estandarización de recursos relacionados                                      |
| Diseño        | Estandarización de laboratorios                                               |
| Diseño        | Estandarización de arquitecturas                                              |
| Diseño        | Estandarización de páginas de comandos                                        |
| Diseño        | Sustitución de listas simples por bloques visuales                            |
| Diseño        | Creación del formato "Herramientas Disponibles"                               |
| Diseño        | Creación del formato "Ramas Disponibles"                                      |
| Diseño        | Creación del formato "Recursos Relacionados"                                  |
| Enlaces       | Migración visual para que los enlaces internos se comporten como texto normal |
| Enlaces       | Conservación de navegación mediante JavaScript                                |
| Herramientas  | Migración de Hydra al nuevo formato                                           |
| Herramientas  | Migración de Holehe al nuevo formato                                          |
| Herramientas  | Migración de ExifTool al nuevo formato                                        |
| Herramientas  | Migración de Legion al nuevo formato                                          |
| Herramientas  | Migración de Nmap / Zenmap al nuevo formato                                   |
| Herramientas  | Preparación de Medusa para futura documentación                               |
| Categorías    | Migración de Fuerza Bruta al nuevo formato                                    |
| Categorías    | Migración de Escaneo de Redes y Puertos al nuevo formato                      |
| Categorías    | Migración de OSINT al nuevo formato                                           |
| Categorías    | Migración de Ciberseguridad al nuevo formato                                  |
| Categorías    | Preparación de Phishing para migración                                        |
| Comandos      | Migración de páginas de comandos a bloques temáticos                          |
| Arquitecturas | Migración de diagramas tipo steps a bloques visuales                          |
| Laboratorios  | Migración de laboratorios a formato modular uniforme                          |
| Metadatos     | Revisión de títulos                                                           |
| Metadatos     | Revisión de keywords                                                          |
| Metadatos     | Revisión de descriptions                                                      |
| Documentación | Definición de descripciones cortas para herramientas                          |
| Documentación | Definición de tags por herramienta                                            |
| Documentación | Definición de tags por categoría                                              |
| Limpieza      | Eliminación de breadcrumbs manuales                                           |
| Limpieza      | Eliminación de estructuras antiguas redundantes                               |
| Limpieza      | Eliminación de estilos específicos innecesarios                               |
| Limpieza      | Reducción de lógica innecesaria en el motor                                   |
| Estado actual | Sistema de categorías operativo                                               |
| Estado actual | Sistema de iconos operativo                                                   |
| Estado actual | Sistema de breadcrumbs operativo                                              |
| Estado actual | Sistema de búsqueda operativo                                                 |
| Estado actual | Sistema de tags operativo                                                     |
| Estado actual | Sistema de navegación operativo                                               |
| Estado actual | Migración progresiva de contenidos en curso                                   |
