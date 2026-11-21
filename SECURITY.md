# Seguridad de Libreta

## Controles implementados en el repositorio

- Las páginas HTML publicadas y la plantilla declaran una Content Security Policy (CSP) con allowlist explícita para los recursos del sitio. El validador rechaza directivas duplicadas, directivas desconocidas, orígenes adicionales, comodines y valores distintos de la política aprobada.
- La CSP no permite JavaScript inline, `eval` ni estilos inline. `script-src 'self'`, `script-src-attr 'none'`, `style-src 'self'`, `style-src-attr 'none'` y `style-src-elem 'self'` restringen la ejecución y aplicación de código y estilos a recursos locales.
- La política se entrega mediante meta CSP. Es una defensa útil, pero no equivale a una cabecera HTTP CSP; `frame-ancestors` no se puede aplicar desde una meta CSP.
- El iframe de la wiki usa `sandbox="allow-scripts"` sin `allow-same-origin`.
- La comunicación entre la wiki y el iframe utiliza mensajes explícitos. El padre valida la ventana emisora exacta, el origen opaco `null`, el tipo y los datos; las rutas se seleccionan mediante índices de una lista permitida y se vuelven a validar en el router.
- Las pruebas E2E comprueban navegación, aislamiento del iframe, mensajes malformados, índices fuera de rango y mensajes falsificados.
- Se ha eliminado Google Fonts y la carga de recursos externos no necesarios.
- Quality checks ejecuta `npm audit --audit-level=high`, validación de recursos y rutas, pruebas unitarias Python, `actionlint` y `zizmor`.
- Las versiones de `actionlint` y `zizmor` usadas por CI se fijan y sus archivos descargados se verifican mediante SHA-256 antes de ejecutarse.
- El workflow de estadísticas no persiste credenciales Git ni escribe directamente en `master`: abre una PR automática con permisos limitados.

## Protección real de la rama principal

El ruleset **Master Prote** está activo sobre la rama predeterminada e incluye:

- Bloqueo de force-push y borrado de la rama.
- Pull request obligatoria para integrar cambios.
- Historial lineal obligatorio.
- Checks obligatorios y estrictos: `CodeQL`, `Browser tests (Firefox)` y `Validate project`.
- CodeQL bloquea alertas de severidad alta o superior y exige que no queden alertas de análisis.
- Sin actores de bypass.

No se exige aprobación adicional, una decisión razonable para un repositorio mantenido por una sola persona. La configuración efectiva debe revisarse si cambia el modelo de mantenimiento.

## Configuración y controles que requieren comprobación fuera del código

1. Revisar en Settings → Code security and analysis el estado de Secret scanning, Push protection y Dependabot alerts. Su estado no se da por confirmado por el mero hecho de que los workflows pasen.
2. Revisar periódicamente las alertas abiertas de CodeQL y Dependabot, incluidas las que no estén relacionadas con la PR actual.
3. GitHub Pages no permite configurar desde este repositorio todas las cabeceras HTTP de seguridad. La meta CSP no configura HSTS, `X-Content-Type-Options`, `Permissions-Policy` ni una cabecera HTTP `Referrer-Policy`. Verificar las cabeceras efectivas del sitio publicado y documentar las limitaciones del alojamiento.
4. Si se incorporan nuevas páginas o componentes, comprobar que no introducen atributos `style`, bloques `<style>` ni estilos generados inline; el validador y las pruebas de navegador deben seguir rechazándolos.

## Alcance y límites

Estas medidas reducen la superficie de ataque y detectan regresiones, pero no convierten el sitio en invulnerable. Los checks automatizados no sustituyen una auditoría manual, pruebas dinámicas, revisión de dependencias, vigilancia de alertas ni la verificación de la configuración real del alojamiento. Las pruebas E2E cubren los flujos definidos, no todas las combinaciones posibles de navegador y contenido.
