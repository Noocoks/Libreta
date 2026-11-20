# Seguridad de Libreta

## Controles implementados

- Las 48 páginas publicadas y la plantilla HTML declaran una política CSP. La lista permite explícitamente el origen de GitHub Pages y el servidor local usado por Playwright para que los recursos del iframe aislado puedan cargarse.
- El iframe de la wiki usa `sandbox="allow-scripts"` sin `allow-same-origin`.
- La comunicación se limita a mensajes explícitos. El padre valida la ventana emisora exacta y el origen opaco `null`; el documento hijo valida la ventana padre y su origen mediante el referrer.
- El router vuelve a validar las rutas recibidas contra el árbol.
- La wiki no usa manejadores de eventos inline.
- Se ha eliminado Google Fonts.
- Quality checks ejecuta `npm audit --audit-level=high`.
- El workflow de estadísticas no persiste credenciales Git y expone el token solo durante el push.
- La dirección de correo de contacto se ha retirado del HTML público de la wiki.

## Configuración pendiente en GitHub

GitHub Pages no permite definir todas las cabeceras HTTP desde archivos del repositorio. La CSP meta no sustituye una cabecera CSP HTTP y `frame-ancestors` no funciona desde meta. HSTS, X-Content-Type-Options y Referrer-Policy tampoco quedan configurados aquí.

1. En Settings → Rules → Rulesets, crear reglas para `master`: PR obligatoria, checks Quality checks, End-to-end tests y CodeQL requeridos, bloquear force-push y borrado. No exigir aprobación si solo hay un mantenedor.
2. En Settings → Code security and analysis, activar Secret scanning, Push protection y Dependabot alerts cuando estén disponibles.
3. Revisar alertas CodeQL y Dependabot.

La protección de rama, las funciones de análisis del repositorio y las cabeceras HTTP requieren verificación en la configuración real de GitHub.
