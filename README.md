<div align="center">

# CIBERNOTAS

### `// CiberCalvoCabrón · Technical Knowledge Base`

<img src="https://img.shields.io/badge/STATUS-ACTIVE-0D1117?style=for-the-badge&labelColor=790018&color=0D1117" alt="Active project"/>
<img src="https://img.shields.io/badge/STACK-HTML%20%2F%20CSS%20%2F%20JS-0D1117?style=for-the-badge&labelColor=790018&color=0D1117" alt="HTML CSS JavaScript"/>

**Apuntes, herramientas y laboratorios** sobre ciberseguridad, IA y automatización.

</div>

---

## `01 / EXPLORE`

- **Ciberseguridad:** OSINT, escaneo, auditoría de credenciales y phishing.
- **Inteligencia artificial:** APIs, modelos, Python y automatización.
- **Laboratorios:** prácticas locales, configuraciones y ejemplos.

## `02 / TOOLKIT`

| Área | Herramientas |
|---|---|
| Auditoría | Hydra · Medusa |
| Escaneo | Nmap · Legion |
| OSINT | ExifTool · Holehe |
| Phishing | GoPhish · MailHog |
| IA y desarrollo | OpenAI · Anthropic · Shell-GPT · Python · Git |

## `03 / STRUCTURE`

```text
.
├── index.html          # Interfaz principal
├── wiki.html           # Página interactiva
├── images/             # Recursos gráficos
├── res/
│   ├── css/             # Estilos modulares
│   │   ├── styles.css   # Punto de entrada CSS
│   │   ├── variables.css
│   │   ├── base.css
│   │   ├── responsive.css
│   │   ├── home.css
│   │   └── theme.css
│   ├── js/              # Lógica e interfaz
│   └── json/            # Índice y estadísticas
├── subpags/
│   ├── ciberseguridad/
│   ├── android/
│   └── ia/
├── scripts/             # Automatizaciones del proyecto
└── .github/
    └── workflows/       # GitHub Actions
```

## `04 / ABOUT`

Proyecto personal de documentación técnica: consulta rápida, navegación sencilla y contenido reutilizable. Diseñado para funcionar como una base de conocimiento estática y ligera.

<div align="center">

<sub><code>LEARN · TEST · DOCUMENT · REPEAT</code></sub>

</div>


<div align="center">

# CHANGELOG

<sub><code>// EVOLUCIÓN DEL PROYECTO</code></sub>

<img src="https://img.shields.io/badge/PROJECT-CIBERNOTAS-0D1117?style=for-the-badge&labelColor=790018" alt="CiberNotas"/>

</div>

---

## `01 / CORE`

- Arquitectura modular por categorías y subcategorías.
- Navegación dinámica mediante árbol e iframe.
- Historial y enlaces internos sincronizados.
- Índice JSON, breadcrumbs y contenido relacionado.

## `02 / INTERFACE`

- Buscador con soporte para acentos, etiquetas y caracteres especiales.
- Categorías, iconos y colores centralizados mediante CSS.
- Panel lateral plegable y navegación contextual.
- Componentes visuales reutilizables para notas, código y laboratorios.
- CSS dividido por responsabilidades: variables, estilos base, responsive, portada y tema visual.
- Tooltip de información en la wiki con estadísticas del código por lenguaje.

## `03 / DOCUMENTATION`

- Incorporación de documentación de ciberseguridad, OSINT y phishing.
- Guías y laboratorios de Hydra, Medusa, Nmap, Legion, ExifTool, Holehe y GoPhish.
- Sección de IA con ejemplos de APIs, Python, OpenAI, Anthropic y Git.
- Normalización progresiva de páginas y ejemplos de código.

## `04 / SECURITY & MAINTENANCE`

- Exclusión de secretos, claves API, cachés y entornos virtuales.
- CSS modularizado en cinco hojas especializadas, manteniendo `styles.css` como punto de entrada y conservando el orden de la cascada.
- Estadísticas de líneas automatizadas mediante GitHub Actions en cada push a `master`.
- Script Python que recorre los formatos configurados y actualiza `res/json/project-stats.json`.
- La wiki obtiene las estadísticas desde JSON; no es necesario editar los recuentos manualmente.
- Limpieza de estilos y lógica duplicada.
- Simplificación de navegación y estructuras heredadas.

## `05 / STATUS`

- **Operativo:** navegación, búsqueda, categorías, etiquetas, índice dinámico y estadísticas automáticas del proyecto.
- **Automatización:** workflow `.github/workflows/project-stats.yml`, script `scripts/update_project_stats.py` y datos en `res/json/project-stats.json`.
- **En desarrollo:** migración del contenido antiguo, mejoras visuales y nuevos laboratorios.

<div align="center">
  <sub><code>BUILDING THE KNOWLEDGE BASE · ONE NOTE AT A TIME</code></sub>
</div>

<div align="center">

# KNOWLEDGE INDEX

<sub><code>// MAPA DE CONTENIDOS</code></sub>

<img src="https://img.shields.io/badge/INDEX-LIBRETA-0D1117?style=for-the-badge&labelColor=790018" alt="Libreta index"/>

</div>

---

## `01 / CYBERSECURITY`

- **OSINT:** reconocimiento, cuentas, correos e información pública.
- **Network scanning:** hosts, puertos, servicios e infraestructura.
- **Credential auditing:** Hydra, Medusa y auditoría de contraseñas.
- **Phishing:** campañas simuladas, plantillas y laboratorios.

## `02 / ARTIFICIAL INTELLIGENCE`

- APIs: OpenAI y Anthropic.
- Automatización con Python.
- Integración de modelos.
- Gestión de credenciales.

## `03 / DEVELOPMENT`

- Scripts y entornos virtuales.
- Git y control de versiones.
- Automatización y gestión de proyectos.

## `04 / LABS`

- Entornos locales y máquinas virtuales.
- Pruebas controladas.
- Escenarios prácticos.

<div align="center">
  <sub><code>FIND IT · STUDY IT · PUT IT TO WORK</code></sub>
</div>
