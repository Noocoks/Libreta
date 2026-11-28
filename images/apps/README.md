# Iconografía de aplicaciones

Los recursos se guardan localmente para evitar dependencias de CDNs y conservar una presentación estable.

## Simple Icons

La mayoría de los SVG proceden del proyecto [Simple Icons](https://github.com/simple-icons/simple-icons), distribuido bajo CC0 1.0. Se utilizan sus glifos vectoriales de marca sin alterar la geometría. El repositorio de Libreta no reclama titularidad sobre marcas ni logotipos.

## Recursos oficiales de los proyectos

| Archivo | Procedencia |
| --- | --- |
| `mixxx.svg` | [Mixxx, repositorio oficial](https://github.com/mixxxdj/mixxx/blob/main/res/images/icons/scalable/apps/mixxx.svg) |
| `kdeconnect.svg` | [KDE Connect, repositorio oficial](https://invent.kde.org/network/kdeconnect-kde/-/blob/master/icons/app/sc-apps-kdeconnect.svg) |
| `windhawk.svg` | [Windhawk, repositorio oficial](https://github.com/ramensoftware/windhawk/blob/main/src/windhawk-core/ui/icons/main-icon-no-background.svg) |
| `seelen-ui.svg` | [Seelen UI, repositorio oficial](https://github.com/eythaann/Seelen-UI/blob/master/src/static/icons/app/icon.svg) |
| `quicklook.svg` | [QuickLook, repositorio oficial](https://github.com/QL-Win/QuickLook/blob/master/QuickLook/Resources/app.svg) |

Estos recursos se conservan desde los repositorios oficiales de sus respectivos proyectos. No se presupone que sus logotipos tengan licencia CC0: los derechos de autor y marcas siguen perteneciendo a sus titulares. Se usan únicamente para identificar el software documentado.

## Mantenimiento

- No redibujar ni deformar las marcas.
- No sustituir un logotipo oficial por un icono inventado.
- Mantener la relación de aspecto con `object-fit: contain`.
- Si no existe un recurso fiable o no se puede comprobar su procedencia, no mostrar un falso logotipo: se conserva el fallback tipográfico de la tarjeta.
- Los SVG locales se validan para rechazar scripts, elementos activos y referencias externas.
