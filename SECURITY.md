# Seguridad de Libreta

## Controles implementados

- El iframe usa `sandbox="allow-scripts"` sin `allow-same-origin`.
- La comunicación se limita a mensajes explícitos; el padre valida la ventana emisora y el origen opaco `null`, y el hijo valida el padre y su origen mediante el referrer.
- El router vuelve a validar las rutas contra el árbol.
- La wiki no usa manejadores inline.
- Se ha eliminado Google Fonts.
- Quality checks ejecuta `npm audit --audit-level=high`.
- El workflow de estadísticas no persiste credenciales Git y expone el token solo durante el push.

## Configuración pendiente en GitHub

GitHub Pages no permite definir todas las cabeceras HTTP desde archivos del repositorio. La CSP meta solo protege páginas que la incluyen; `frame-ancestors` no funciona desde meta y los headers HTTP HSTS, CSP, X-Content-Type-Options y Referrer-Policy no quedan configurados aquí.

1. En Settings → Rules → Rulesets, crear reglas para `master`: PR obligatoria, checks Quality checks, End-to-end tests y CodeQL requeridos, bloquear force-push y borrado. No exigir aprobación si solo hay un mantenedor.
2. En Settings → Code security and analysis, activar Secret scanning, Push protection y Dependabot alerts cuando estén disponibles.
3. Revisar alertas CodeQL y Dependabot.

## Cobertura CSP

La CSP meta se ha añadido a la portada, wiki y plantilla. Los documentos HTML existentes deben recibir la misma etiqueta para que la cobertura sea completa. Los headers HTTP y la protección de rama requieren verificación en la configuración real de GitHub.
