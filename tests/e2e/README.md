# Pruebas E2E de Libreta

Libreta utiliza Playwright para comprobar el comportamiento de la web en un navegador real. Estas pruebas son herramientas de desarrollo: no se cargan en la web publicada ni forman parte de sus recursos de ejecución.

## Requisitos

- Node.js 22 o compatible.
- Python 3.
- npm.

## Instalación

Desde la raíz del repositorio:

```bash
npm install
npx playwright install chromium
```

En Linux, si faltan bibliotecas del navegador:

```bash
npx playwright install --with-deps chromium
```

## Ejecutar las pruebas

```bash
npm run test:e2e
```

Abrir el navegador mientras se ejecutan:

```bash
npm run test:e2e:headed
```

Consultar el informe HTML de la última ejecución:

```bash
npm run test:e2e:report
```

## Estructura

- `playwright.config.js`: configuración, servidor local, navegador y diagnósticos.
- `tests/e2e/server.py`: servidor local que reproduce el prefijo `/Libreta/` utilizado por GitHub Pages.
- `tests/e2e/specs/navigation.spec.js`: portada, árbol, navegación por iframe y breadcrumbs.
- `tests/e2e/specs/search.spec.js`: búsqueda, normalización de acentos, limpieza y sincronización de etiquetas.
- `tests/e2e/specs/tree.spec.js`: expansión de ramas y panel lateral.
- `tests/e2e/specs/responsive.spec.js`: control del índice en móvil pequeño, móvil, tablet y portátil.

## Diagnósticos

Si una prueba falla, Playwright conserva una captura de pantalla y una traza de la ejecución. En CI también se publica el informe y los resultados como artefacto de GitHub Actions durante siete días.

Las pruebas deben comprobar comportamientos visibles y estables. Si cambia intencionadamente la interfaz o el flujo de navegación, actualiza la prueba correspondiente junto con el cambio funcional.
