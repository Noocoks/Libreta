<div align="center">

# CIBERNOTAS

### `// CiberCalvoCabrón · Technical Knowledge Base`

**Aprender. Experimentar. Documentar.**

Una libreta técnica para reunir conocimientos, herramientas, laboratorios y documentación práctica sobre ciberseguridad, Android, inteligencia artificial y desarrollo.

<p>
  <a href="https://noocoks.github.io/Libreta/">
    <img src="https://img.shields.io/badge/ABRIR-LIBRETA-0D1117?style=for-the-badge&labelColor=790018" alt="Abrir Libreta"/>
  </a>
  <a href="https://noocoks.github.io/Libreta/wiki.html">
    <img src="https://img.shields.io/badge/EXPLORAR-WIKI-0D1117?style=for-the-badge&labelColor=790018" alt="Explorar wiki"/>
  </a>
  <a href="https://github.com/Noocoks/Libreta">
    <img src="https://img.shields.io/badge/VER-REPOSITORIO-0D1117?style=for-the-badge&labelColor=790018" alt="Ver repositorio"/>
  </a>
</p>

<p>
  <img src="https://img.shields.io/badge/STATUS-ACTIVE-0D1117?style=flat-square&labelColor=790018" alt="Estado activo"/>
  <img src="https://img.shields.io/badge/STACK-HTML%20·%20CSS%20·%20JS-0D1117?style=flat-square&labelColor=790018" alt="Stack"/>
  <img src="https://img.shields.io/github/actions/workflow/status/Noocoks/Libreta/project-stats.yml?branch=master&style=flat-square&label=PROJECT%20STATS&labelColor=790018&color=0D1117" alt="Estado de estadísticas automáticas"/>
</p>

</div>

---

## `01 / OVERVIEW`

Libreta es una **base de conocimiento estática y ligera**, organizada para consultar información técnica, documentar procedimientos y mantener reunidos recursos de aprendizaje en un único lugar.

No pretende ser un manual cerrado: crece con cada nota, práctica, herramienta y laboratorio que se incorpora.

| Área | Contenido |
|---|---|
| **Ciberseguridad** | OSINT, reconocimiento, auditoría, redes y phishing |
| **Android** | ADB, Fastboot, Magisk, ROMs y herramientas |
| **Inteligencia artificial** | APIs, modelos locales, Python e integración |
| **Desarrollo** | HTML, CSS, JavaScript, Git y automatización |
| **Laboratorios** | Prácticas locales, configuraciones y escenarios controlados |

## `02 / EXPLORE THE TOOLKIT`

| Área | Herramientas y tecnologías |
|---|---|
| Auditoría de credenciales | Hydra · Medusa |
| Reconocimiento y escaneo | Nmap · Legion |
| OSINT | ExifTool · Holehe |
| Laboratorios de phishing | GoPhish · MailHog |
| IA y desarrollo | OpenAI · Anthropic · Shell-GPT · Python · Git |
| Android | ADB · Fastboot · Magisk |

*La lista refleja herramientas documentadas en el proyecto; no implica que todas estén integradas en la web.*

## `03 / PROJECT ARCHITECTURE`

La estructura separa contenido, presentación, lógica y automatizaciones para que el proyecto pueda crecer sin convertir sus archivos principales en bloques difíciles de mantener.

```text
.
├── index.html
├── wiki.html
├── images/
├── res/
│   ├── css/
│   │   ├── styles.css       # Punto de entrada
│   │   ├── variables.css    # Variables y recursos visuales
│   │   ├── base.css         # Fundamentos globales y elementos HTML
│   │   ├── components.css   # Componentes de contenido reutilizables
│   │   ├── responsive.css   # Adaptación a pantallas
│   │   ├── home.css         # Portada
│   │   └── theme.css        # Identidad visual
│   ├── js/
│   │   └── project-stats.js # Interfaz de estadísticas
│   └── json/
│       ├── tree.json        # Índice de navegación
│       └── project-stats.json
├── subpags/
│   ├── ciberseguridad/
│   ├── android/
│   └── ia/
├── scripts/
│   └── update_project_stats.py
└── .github/
    └── workflows/
        └── project-stats.yml
```

### Diseño modular

El CSS se divide por responsabilidades, pero la web continúa cargando una única referencia: `res/css/styles.css`. Este archivo importa seis hojas funcionales —`variables.css`, `base.css`, `components.css`, `responsive.css`, `home.css` y `theme.css`— en un orden definido para conservar la cascada. `base.css` contiene los fundamentos globales; `components.css`, la estructura base de los componentes de contenido; `theme.css`, sus acabados visuales; y `responsive.css`, los ajustes por resolución.

## `04 / AUTOMATION & PROJECT METRICS`

Las estadísticas del código no se mantienen a mano. **GitHub Actions las recalcula automáticamente** cuando se hace push a la rama `master`.

```text
PUSH A MASTER
     │
     ▼
GitHub Actions
     │
     ▼
update_project_stats.py
     │
     ▼
project-stats.json
     │
     ▼
Tooltip de información en la wiki
```

- El script recorre los archivos del proyecto y agrupa las líneas por lenguaje.
- El resultado se guarda en `res/json/project-stats.json`.
- La wiki carga ese JSON y presenta el desglose al pasar el cursor o enfocar el icono de información.
- Se cuentan **líneas no vacías**, incluidos comentarios.
- Si el resultado no cambia, no se genera un commit innecesario.
- El workflow también se puede ejecutar manualmente desde la pestaña **Actions** de GitHub.

Formatos contemplados: HTML, CSS, JavaScript, JSON, Python, TXT y Markdown.

[Ver el workflow de estadísticas](https://github.com/Noocoks/Libreta/actions/workflows/project-stats.yml) · [Consultar los datos generados](https://github.com/Noocoks/Libreta/blob/master/res/json/project-stats.json)

## `05 / CHANGELOG`

### Estructura y experiencia
- Organización de la navegación mediante árbol, categorías y subcategorías.
- Historial, enlaces internos, breadcrumbs y contenido relacionado.
- Buscador con soporte para acentos, etiquetas y caracteres especiales.
- Panel lateral plegable y navegación contextual.
- Portada y wiki con identidad visual industrial/carmesí.

### Mantenimiento y escalabilidad
- Modularización del CSS en seis hojas funcionales, con `styles.css` como punto de entrada.
- Separación real entre fundamentos globales (`base.css`) y componentes de contenido (`components.css`).
- Variables visuales centralizadas y capas independientes de tema, portada y adaptación responsive.
- Separación de scripts, datos JSON y contenido documental.
- Recuento de líneas automatizado mediante GitHub Actions.

### Documentación
- Incorporación progresiva de contenidos de ciberseguridad, OSINT y phishing.
- Guías y laboratorios relacionados con Hydra, Medusa, Nmap, Legion, ExifTool, Holehe y GoPhish.
- Documentación de Android, herramientas, sistemas y personalización.
- Recursos de IA, APIs, modelos locales, Python y automatización.
- Dualvers V2: validación de nombres de sesión, protección frente a traversal y enlaces simbólicos, aislamiento de rutas y configuración del proveedor bajo demanda.

## `06 / KNOWLEDGE INDEX`

- **CYBERSECURITY** — OSINT, reconocimiento, escaneo de red, auditoría de credenciales y phishing.
- **ANDROID** — ADB/Fastboot, Magisk, sistemas alternativos y herramientas.
- **ARTIFICIAL INTELLIGENCE** — APIs, modelos, asistentes locales e integración.
- **DEVELOPMENT** — Scripts, entornos, Git, estructura web y automatización.
- **LABS** — Entornos locales, máquinas virtuales y pruebas controladas.

## `07 / DUALVERS V2`

Dualvers V2 es un proyecto local de integración con modelos de IA, documentado dentro de la sección de inteligencia artificial. La implementación incorpora controles para trabajar con sesiones de forma más segura:

- Validación estricta de los identificadores de sesión.
- Rechazo de separadores de ruta, traversal y enlaces simbólicos.
- Comprobación de que las rutas resueltas permanecen dentro del directorio de sesiones.
- Creación de directorios con permisos restrictivos.
- Inicialización bajo demanda del SDK y del proveedor seleccionado.
- Comprobación de la clave API correspondiente al proveedor activo.

## `08 / PROJECT NOTES`

- Proyecto personal de documentación técnica y aprendizaje continuo.
- Desarrollado como sitio estático con HTML, CSS y JavaScript.
- El contenido se organiza para facilitar la consulta, reutilización y ampliación.
- Los laboratorios y ejemplos de seguridad están orientados al aprendizaje y a entornos autorizados.

---

<div align="center">

### `LEARN · TEST · DOCUMENT · REPEAT`

<sub>Una nota cada vez. Un proyecto en constante evolución.</sub>

</div>
