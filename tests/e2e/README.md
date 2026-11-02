# Pruebas E2E de Libreta

Libreta utiliza Playwright para comprobar el comportamiento de la web en Firefox, sobre el motor Gecko. Estas pruebas son herramientas de desarrollo: no se cargan en la web publicada ni forman parte de sus recursos de ejecución.

## Requisitos

- Node.js 22 o compatible.
- Python 3.
- npm.

## Instalación

Desde la raíz del repositorio:

```bash
npm install --no-package-lock
npx playwright install firefox
```

En Linux, si faltan bibliotecas del navegador:

```bash
npx playwright install --with-deps firefox
```

## Ejecutar las pruebas

Ejecutar la suite completa en los proyectos Firefox Desktop y Firefox Responsive:

```bash
npm run test:e2e
```

Ejecutar solo el proyecto de escritorio:

```bash
npm run test:e2e:firefox
```

Ejecutar solo la configuración responsive (viewport de 390 × 844):

```bash
npm run test:e2e:responsive
```

Abrir el navegador mientras se ejecutan las pruebas:

```bash
npm run test:e2e:headed
```

Consultar el informe HTML de la última ejecución:

```bash
npm run test:e2e:report
```

## Matriz de ejecución

| Proyecto | Motor | Configuración |
| --- | --- | --- |
| Firefox Desktop | Gecko | Perfil de escritorio Firefox |
| Firefox Responsive | Gecko | Firefox con viewport de 390 × 844 |

El proyecto responsive comprueba el diseño a un tamaño de pantalla móvil mediante cambio de viewport. No representa Firefox para Android ni una emulación del sistema operativo móvil.

## Estructura

- `playwright.config.js`: configuración, proyectos de navegador, servidor local y diagnósticos.
- `tests/e2e/server.py`: servidor local que reproduce el prefijo `/Libreta/` utilizado por GitHub Pages.
- `tests/e2e/specs/navigation.spec.js`: portada, árbol, navegación por iframe y breadcrumbs.
- `tests/e2e/specs/search.spec.js`: búsqueda, normalización de acentos, limpieza y sincronización de etiquetas.
- `tests/e2e/specs/tree.spec.js`: expansión de ramas y panel lateral.
- `tests/e2e/specs/responsive.spec.js`: control del índice en móvil pequeño, móvil, tablet y portátil.

## Integración continua

GitHub Actions instala Firefox y ejecuta los dos proyectos en cada PR y push a `master`, además de permitir ejecuciones manuales. Si una prueba falla, Playwright conserva capturas y trazas; el informe y los resultados se publican como artefactos durante siete días.

Las pruebas deben comprobar comportamientos visibles y estables. Si cambia intencionadamente la interfaz o el flujo de navegación, actualiza la prueba correspondiente junto con el cambio funcional.
