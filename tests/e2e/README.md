# Pruebas E2E de Libreta

Libreta utiliza Playwright para comprobar el comportamiento de la web en Chromium, Firefox y WebKit, tanto en escritorio como en un viewport responsive. Estas pruebas son herramientas de desarrollo: no se cargan en la web publicada ni forman parte de sus recursos de ejecución.

## Requisitos

- Node.js 22 o compatible.
- Python 3.
- npm.

## Instalación

Desde la raíz del repositorio:

```bash
npm ci
npx playwright install chromium firefox webkit
```

En Linux, para instalar también las dependencias del sistema:

```bash
npx playwright install --with-deps chromium firefox webkit
```

## Ejecutar las pruebas

Ejecutar la suite completa en los seis proyectos:

```bash
npm run test:e2e
```

Ejecutar solo Firefox de escritorio:

```bash
npm run test:e2e:firefox
```

Ejecutar solo Firefox responsive (viewport de 390 × 844):

```bash
npm run test:e2e:responsive
```

Ejecutar otro proyecto concreto:

```bash
npx playwright test --project="Chromium Desktop"
npx playwright test --project="Chromium Responsive"
npx playwright test --project="WebKit Desktop"
npx playwright test --project="WebKit Responsive"
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
| Chromium Desktop | Blink | Perfil de escritorio Chromium |
| Chromium Responsive | Blink | Chromium con viewport de 390 × 844 |
| Firefox Desktop | Gecko | Perfil de escritorio Firefox |
| Firefox Responsive | Gecko | Firefox con viewport de 390 × 844 |
| WebKit Desktop | WebKit | Perfil de escritorio Safari |
| WebKit Responsive | WebKit | WebKit con viewport de 390 × 844 |

Los proyectos responsive comprueban el diseño a un tamaño de pantalla móvil mediante cambio de viewport. No representan navegadores instalados en Android o iOS ni una emulación completa de esos sistemas operativos.

## Estructura

- `playwright.config.js`: configuración, proyectos de navegador, servidor local y diagnósticos.
- `tests/e2e/server.py`: servidor local que reproduce el prefijo `/Libreta/` utilizado por GitHub Pages.
- `tests/e2e/helpers/tree.js`: comprobación compartida del árbol y de sus secciones esenciales; evita depender de un número fijo o de la posición de las categorías.
- `tests/e2e/specs/navigation.spec.js`: portada, árbol, navegación por iframe y breadcrumbs.
- `tests/e2e/specs/search.spec.js`: búsqueda, normalización de acentos, limpieza y sincronización de etiquetas.
- `tests/e2e/specs/tree.spec.js`: expansión de ramas, Biblioteca de aplicaciones y Modding.
- `tests/e2e/specs/responsive.spec.js`: control del índice en móvil pequeño, móvil, tablet y portátil.
- El resto de los archivos `*.spec.js` cubre carga, movimiento, preferencias de lectura, historial, índice dinámico, bloques de código, exportación PDF y seguridad.

## Integración continua

GitHub Actions ejecuta Chromium, Firefox y WebKit en escritorio y responsive para las pull requests dirigidas a `master`, los pushes configurados y las ejecuciones manuales. Si una prueba falla, Playwright conserva capturas, trazas e informes como artefactos durante siete días.

Las pruebas deben comprobar comportamientos visibles y estables. Para las secciones del árbol se usan identificadores semánticos (`data-cat`) y un helper compartido, no posiciones ni cantidades fijas. Al añadir una sección, actualiza el contrato compartido y añade una prueba funcional específica de la nueva navegación.

Una prueba no debe eliminarse, relajarse ni cambiar sus esperas para ocultar un fallo: primero hay que identificar si la causa está en el producto, en el entorno de ejecución o en una expectativa obsoleta.
