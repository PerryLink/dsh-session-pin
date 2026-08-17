<div align="center">

# 📌 dsh-session-pin

**Fija sesiones y espacios de trabajo en la parte superior de la barra lateral de DeepSeek Harness con colores por pin.**

*Un plugin de doble cara (host + navegador): dos niveles de pin, un botón de 8 colores por pin y un organizador de navegación — boards, etiquetas, vistas guardadas, resúmenes de salud y `/goto`.*

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![DSH plugin](https://img.shields.io/badge/dsh-plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-brightgreen.svg)](#)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-session-pin/ci.yml?branch=main&label=CI)](https://github.com/PerryLink/dsh-session-pin/actions)
[![Version](https://img.shields.io/github/v/tag/PerryLink/dsh-session-pin?label=version)](https://github.com/PerryLink/dsh-session-pin/releases)
[![npm version](https://img.shields.io/npm/v/dsh-session-pin)](https://www.npmjs.com/package/dsh-session-pin)
[![npm downloads](https://img.shields.io/npm/dm/dsh-session-pin)](https://www.npmjs.com/package/dsh-session-pin)

[English](README.md) · [简体中文](README.zh.md) · [Español](README.es.md) · [Português](README.pt.md) · [हिन्दी](README.hi.md)

</div>

---

## Compatibility

| Superficie | Estado |
|---|---|
| Harness | DeepSeek Harness `0.1.0-rc.6` (paquetes de cliente `0.1.0-rc.6`) |
| Node | `>= 22` (base mínima de desarrollo) |
| Plataformas | Web GUI (doble cara: host + navegador) |
| Modelo | Cualquiera (solo UI — sin tráfico de modelo, sin eventos de sesión) |

## What you get

`dsh-session-pin` mantiene arriba en la barra lateral las conversaciones que importan y las colorea para encontrarlas de un vistazo:

- **Dos niveles de pin** — fija espacios de trabajo enteros y sesiones individuales; un espacio fijado pasa al frente de la lista de espacios y una sesión fijada al frente de su cuenta.
- **Colores de fila por pin** — el botón de color tras cada pin recorre una paleta de 8 colores (Shift+clic lo limpia); la fila recibe una barra de acento a la izquierda y un tinte translúcido.
- **Cuatro superficies de pin** — un par `[pin][color]` al pasar el cursor en cada fila, un interruptor en la cabecera de la sesión, una acción al pie de la barra lateral con un panel de fijados, y un fijado duradero por navegador que conserva pines y colores entre reinicios.
- **Cero cambios en el núcleo** — un plugin independiente para la Web GUI oficial de DSH; cada superficie se degrada con elegancia en líneas base más antiguas.

```text
┌─ Workspaces ────────────────────────────┐
│ 🎨 Workbench            ███             │  ← espacio fijado, teñido de rojo
│   📌 Implement login flow         3h    │  ← sesión fijada, teñida de turquesa
│     Fix the auth bug              1h    │  ← al pasar el cursor: pin gris + botón de color
│   Refactor the DB layer           2d    │
└─────────────────────────────────────────┘
```

## Navigation organizer

Cuatro capacidades locales del navegador organizan el trabajo multi-sesión por encima del fijado. Todo el estado vive en el mismo almacén `session-pin` (por navegador; nada se sube) y cada una tiene un interruptor de Config.

- **Boards** — los pines se agrupan con nombre; el panel muestra un chip por board (más «All») que filtra la lista.
- **Etiquetas y vistas** — las entidades llevan hasta 8 etiquetas (≤24 caracteres cada una); la barra filtra por texto y etiquetas, y cualquier filtro se guarda como vista con nombre (hasta 20) para cambiar con un clic.
- **Resumen de salud** — cada fila de sesión fijada añade una línea de solo lectura y saneada (`N msgs · you|ai · tiempo relativo`) derivada de la instantánea pública de la sesión — solo conteos y direcciones, nunca contenido.
- **`/goto <palabra>`** — una línea del compositor que empiece por `/goto` más Enter salta: una coincidencia única abre, varias se listan, ninguna lo explica. La línea de comando nunca llega al modelo.

## Quick start

```sh
# 1. instala el bundle en tu perfil
dsh plugin --profile web add "github:PerryLink/dsh-session-pin#main"

# o desde npm (versiones publicadas)
dsh plugin --profile web add dsh-session-pin

# 2. reinicia y verifica la fila
dsh --profile web --dump-config | grep -A3 'id: session-pin'
```

> **Entry id del loader.** En builds del harness cuyo bundle `dsh-base` monta el servicio host integrado `@deepseek-ai/dsh-session-pin` (entry id `session-pin`), asigna a este plugin un entry id distinto, p. ej. `id: session-pin-ui` en la fila del patch del perfil — un id `session-pin` duplicado hace fallar el arranque con "duplicate loader entry id".

## Install & uninstall

- **Canal git** (último `main`): `dsh plugin --profile web add "github:PerryLink/dsh-session-pin#main"` — `pnpm run build` emite la mitad host (`lib/index.js`) y la mitad navegador (`lib/client.js`).
- **Canal npm** (versiones publicadas): `dsh plugin --profile web add dsh-session-pin`.
- **Canal tarball**: `pnpm pack` en este repo, luego `dsh plugin --profile web add ./dsh-session-pin-<version>.tgz`.
- **Desinstalar**: `dsh plugin --profile web remove dsh-session-pin` (o elimina la fila del patch del perfil; la sección `session-pin` de `settings.yaml` también puede borrarse).

## Configuration

Todas las opciones son campos Schemastery `Config` (modificables desde cordis.yml). `cordis.patch.yml` monta el bundle con los valores por defecto siguientes.

| Clave | Por defecto | Significado |
|---|---|---|
| `maxPins` | `0` | Máximo de entidades fijadas por nivel (sesiones y espacios de trabajo tienen presupuesto propio); `0` = ilimitado |
| `reorderOnLoad` | `true` | Reafirma los prefijos de fijados (el pin más reciente primero) una vez que las listas están listas |
| `pruneStale` | `true` | Elimina pines y colores de entidades ausentes de una lista preparada (borradas/archivadas) |
| `enableBoards` | `true` | Habilita los grupos de pines (boards) en el panel lateral |
| `enableTags` | `true` | Habilita las etiquetas de sesión/espacio de trabajo y la barra de filtros del panel |
| `enableViews` | `true` | Habilita las vistas de filtro guardadas |
| `enableHealth` | `true` | Habilita el resumen de salud por sesión fijada (solo lectura, saneado) |
| `enableGoto` | `true` | Habilita el comando `/goto <palabra>` del compositor |

## Tools & surfaces

| Superficie | Tipo | Notas |
|---|---|---|
| Controles de fila `[pin][color]` | Slot de UI / superposición DOM | Controles al pasar el cursor en cada fila de sesión y espacio de trabajo |
| Interruptor de cabecera de sesión | Slot de UI | El mismo control en la fila de acciones de la cabecera, indexado por id de sesión |
| Pie de barra lateral + panel de fijados | Slot de UI / superposición | Lista espacios y sesiones fijados (el pin más reciente primero) con puntos de color |
| `/goto <palabra>` | command | Salto rápido del compositor por título/etiqueta; la línea nunca llega al modelo |
| Namespace de ajustes `session-pin` | servicio host | Almacén duradero por navegador de pines, colores y estado del organizador |

## Permissions & data

- **Permisos**: el manifiesto `dshWorkshop` declara `browser:local-storage`, `settings:read` y `settings:write`.
- **Datos**: pines, colores y estado del organizador viven por navegador en el namespace de ajustes `session-pin`, degradando a un documento versionado de `localStorage` (los documentos v1 migran) donde el proxy web no sirve el namespace. No se sube nada.
- **Registro de sesión**: ninguno — este plugin no añade eventos de sesión ni tokens a ninguna petición del modelo.

## Security boundaries

- **Solo UI.** Sin efectos visibles al modelo, sin red, sin subprocesos; cada superficie se degrada con elegancia en líneas base más antiguas.
- **Estado duradero y acotado.** Pines y colores se podan con las entidades borradas (`pruneStale`); `maxPins` limita el número de fijados por nivel.
- **Salud de solo lectura.** El resumen de salud deriva conteos y direcciones de la instantánea pública de la sesión y no escribe nada de vuelta.

## Known limitations

- **Alcance de la persistencia** — donde el proxy web no sirve el namespace `session-pin`, pines y colores recurren al `localStorage` del navegador; el registro del host se convierte en el almacén duradero automáticamente una vez que upstream expone el namespace.
- **Alcance del orden** — la posición fijada es estable solo bajo el orden **Manual**; bajo el orden **Updated** la promoción por actividad del núcleo vuelve a adelantar sesiones activas, y `reorderOnLoad` reafirma los prefijos al cargar.
- **Navegadores remotos** — los RPC de ajustes son solo loopback en la línea base; los navegadores remotos recurren al `localStorage` local.
- **Respaldo de la insignia de fila** — donde el slot de fila de upstream no está disponible, las filas de sesión se emparejan por el texto del título; con títulos duplicados la insignia aparece en cada fila coincidente y alterna la primera coincidencia (cosmético).
- **Dependencia del DOM de las filas** — la superposición depende de la estructura `role="treeitem"` de las filas del núcleo y debe seguir los cambios de UI de upstream.

## Development

```sh
pnpm install                    # instalar dependencias
pnpm run typecheck              # tsc --noEmit
pnpm test                       # pruebas unitarias de vitest
pnpm run build                  # build de doble mitad + compuerta de pureza del cliente
node scripts/verify-live.mjs    # comprobación en vivo contra un `dsh web` (env DSH_CHECKOUT)
```

## Topics

`deepseek-harness`, `dsh`, `dsh-plugin`, `session-pin`, `pin`, `workspace`

## Contributors

- [@PerryLink](https://github.com/PerryLink) — creador y mantenedor: experiencia de pin, persistencia duradera, ordenamiento de espacios de trabajo, colores por pin, el organizador de navegación y la documentación en cinco idiomas.

## License

[Apache License 2.0](LICENSE) © 2026 colaboradores de dsh-session-pin
