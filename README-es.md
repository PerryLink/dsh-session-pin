<div align="center">

# 📌 dsh-session-pin
- **Canal 1024 store**: `npm i -g dsh1024` una vez, luego `dsh1024 plugin --profile web add dsh-session-pin` (cuenta para el ranking de instalaciones de [deepseek1024.com](https://deepseek1024.com)).

**Fija sesiones y espacios de trabajo en la parte superior de la barra lateral de DeepSeek Harness con colores por pin.**

*Un plugin de doble cara (host + navegador): dos niveles de pin, un botón de 8 colores por pin y un organizador de navegación — boards, etiquetas, vistas guardadas, resúmenes de salud y `/goto`.*

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Gitee](https://img.shields.io/badge/Gitee-mirror-c71d23?logo=gitee)](https://gitee.com/perrylink/dsh-session-pin)
[![DSH plugin](https://img.shields.io/badge/dsh--plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![dsh-doctor](https://raw.githubusercontent.com/PerryLink/dsh-plugin-doctor/main/badges/PerryLink__dsh-session-pin.svg)](https://github.com/PerryLink/dsh-plugin-doctor#verified-徽章)
[![DSH Market](https://raw.githubusercontent.com/2BingLing/dsh-market/master/assets/readme/badge-listed-en.svg)](https://dsh.market/)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-brightgreen.svg)](#)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-session-pin/ci.yml?branch=main&label=CI)](https://github.com/PerryLink/dsh-session-pin/actions)
[![Version](https://img.shields.io/github/v/tag/PerryLink/dsh-session-pin?label=version)](https://github.com/PerryLink/dsh-session-pin/releases)
[![npm version](https://img.shields.io/npm/v/dsh-session-pin)](https://www.npmjs.com/package/dsh-session-pin)
[![npm downloads](https://img.shields.io/npm/dm/dsh-session-pin)](https://www.npmjs.com/package/dsh-session-pin)
[![dshfind](https://dshfind.com/api/badge/PerryLink/dsh-session-pin?metric=downloads&lang=es)](https://dshfind.com/es/plugins/PerryLink/dsh-session-pin?ref=badge)

[English](README.md) · [简体中文](README-zh.md) · [Español](README-es.md) · [Português](README-pt.md) · [हिन्दी](README-hi.md)

</div>

---

## Compatibility

| Superficie | Estado |
|---|---|
| Harness | DeepSeek Harness `dsh-v0.1.7-alpha.2` (tag de GitHub; verificado el 2026-09-22: typecheck de doble regla + suites unitarias/de composición + comprobaciones estáticas de costuras; la ronda de navegador queda a cargo del mantenedor). Pin npm `0.1.7-alpha.2`, peers `>=0.1.2-rc.1 <0.2.0 || >=0.1.5-alpha.1 <0.2.0 || >=0.1.6-0 <0.2.0 || >=0.1.7-0 <0.2.0`. |
| Node | `>= 22` (base mínima de desarrollo) |
| Plataformas | Web GUI (doble cara: host + navegador) |
| Modelo | Cualquiera (solo UI — sin tráfico de modelo, sin eventos de sesión) |
| Eventos `session/pin` | Con compuerta previa: se escriben solo cuando el vocabulario de eventos en tiempo de ejecución conoce el tipo (el append de la línea alpha ya no puede estampar el marcador `ignorable`, así que el vocabulario es la única señal de la puerta — adaptado el 2026-09-18); en caso contrario la proyección degrada a la caché de settings y se emite un aviso antes de la primera escritura. |

## What you get

`dsh-session-pin` mantiene arriba en la barra lateral las conversaciones que importan y las colorea para encontrarlas de un vistazo:

- **Dos niveles de pin** — fija espacios de trabajo enteros y sesiones individuales; un espacio fijado pasa al frente de la lista de espacios y una sesión fijada al frente de su cuenta.
- **Colores de fila por pin** — el botón de color tras cada pin recorre una paleta de 8 colores (Shift+clic lo limpia); la fila recibe una barra de acento a la izquierda y un tinte translúcido.
- **Cuatro superficies de pin** — un par `[pin][color]` al pasar el cursor en cada fila, un interruptor en la cabecera de la sesión, una acción al pie de la barra lateral con un panel de fijados, y un fijado duradero por navegador que conserva pines y colores entre reinicios.
- **Clic para abrir** — al hacer clic en una fila fijada (en la barra lateral o en el panel de fijados) se abre la sesión en la ventana actual (la misma costura que usa `/goto`); ambos navegan por el canal de retención de sesión del host en la línea alpha.
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

- **Boards** — los pines se agrupan con nombre; la fila de chips crea, renombra y elimina boards y los reordena arrastrando (el orden persiste por navegador), mientras el panel agrupa los pines de cada board bajo una cabecera plegable.
- **Etiquetas y vistas** — las entidades llevan hasta 8 etiquetas (≤24 caracteres cada una), fijadas por fila desde el botón de gestionar del panel (que también asigna el board del pin); la barra filtra por texto y etiquetas, y cualquier filtro se guarda como vista con nombre (hasta 20) para cambiar con un clic.
- **Resumen de salud** — cada fila de sesión fijada añade una línea de solo lectura y saneada (`N msgs · you|ai · tiempo relativo`) derivada de la instantánea pública de la sesión — solo conteos y direcciones, nunca contenido.
- **`/goto <palabra>`** — una línea del compositor que empiece por `/goto` más Enter salta: una coincidencia única abre, varias se listan, ninguna lo explica. La línea de comando nunca llega al modelo.

## How it works

- **Mitad host** (`src/index.ts`) — declara el formulario de ajustes `session-pin` como el propio Config en vivo del plugin: las dos listas de ids fijados, los dos mapas de color, el estado del organizador y la política del host (`maxPins`/`reorderOnLoad`/`pruneStale` más los cinco interruptores de función) son todos campos `.volatile()`. En el contrato de ajustes `0.1.7` el namespace de un formulario es el id local de su entrada de perfil, así que la fila `id: session-pin` del patch del bundle da nombre al formulario, la página Plugins lo edita y las ediciones aceptadas se aplican en caliente al plugin en ejecución; sin eventos de sesión, sin tráfico de modelo.
- **Mitad navegador** (`src/client.ts`) — ensambla un `PinStore` sin framework (el formulario de Config en vivo de la mitad host, leído mediante `ctx.configForms.get(entryId)`, degradando a un documento versionado de `localStorage` con sincronización entre pestañas), un `PinController` (máquina de estados de alternar / ciclo de color / purgar / reordenar) y la UI: la superposición de filas, el registro opcional del slot de fila, el interruptor de cabecera, la acción del pie y el panel de fijados. El orden pasa por `ctx.workspaces`.
- **Canal de escritura respaldado por log** — en builds que montan el servicio integrado `dsh-session-pin`, cada cambio de sesión se confirma primero por el RPC `session.setPinned` (el log de eventos `session/pin` es la residencia canónica) y se refleja en el almacén de ajustes; un RPC fallido o lento degrada a una escritura directa.
- **Lectura de proyección respaldada por log** — `enableLogBacking` (Config del host, por defecto desactivado en modo fail-closed) monta un lector que pliega eventos `session/pin` en vivo al conjunto canónico y refleja `pinned`/`colors` en el Config en vivo. El esquema, el pliegue puro (`foldPinEvents`) y la costura de anexado con compuerta previa (`PinLogAppender`) viven en `src/pin-log.ts`: el vocabulario de eventos en tiempo de ejecución es la única señal de la puerta, decidida ANTES del primer anexado (el append de la línea alpha ya no puede estampar `ignorable`, así que la sonda del marcador desapareció), de modo que los hosts que no pueden transportar el evento con seguridad — un vocabulario que no conoce el tipo falla cerrado al leer — nunca reciben uno; el almacén Config en vivo/localStorage sigue siendo la ruta de compatibilidad y degradación.
- **Seam del cliente** — la mitad navegador lee los brands `SessionId`/`WorkspaceId` desde `@deepseek-ai/dsh-client-connection` (el paquete eliminado `dsh-client-runtime` ya no existe en los hosts actuales); los asientos del kit estándar del slot de cabecera se tipan como contrato estructural local. En hosts `0.1.2-rc.1` el slot de fila `sessions.row.action` no está declarado, así que las filas de sesión recurren a la superposición DOM y el registro del slot queda diferido.
- **Compilación** — esbuild emite la mitad ESM del host y la mitad CJS del cliente envuelta en la factoría de arranque web (`window.__ModuleLoader__.load({ id, factory })`); `react` se externaliza al React del shell, y una compuerta de pureza falla el build si una importación de valor `@deepseek-ai/*` se filtra al bundle del navegador.

**Puntos de extensión usados:** `settings` (host); `sessions`, `workspaces`, `configForms`, `connection`, `slots` (cliente); `locale` (cliente, opcional); `conversation.session.header.actions`, `sidebar.footer.action`, `shell.overlay`, y el slot de fila `sessions.row.action` cuando está declarado (los hosts `0.1.2-rc.1` no lo declaran — la superposición DOM cubre allí las filas de sesión). **Efectos visibles al modelo: ninguno** — plugin solo de UI: no añade eventos de sesión ni tokens.

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
- **Desinstalar**: `dsh plugin --profile web remove dsh-session-pin` (o elimina la fila del patch del perfil — la fila ES el namespace del formulario de ajustes, así que al quitarla también se eliminan los valores guardados del formulario).

## Configuration

Todas las opciones son campos Schemastery `Config`. Cada campo de la tabla es `.volatile()`, así que se puede editar en vivo tanto desde `cordis.yml` como desde la página Plugins del perfil (una edición aceptada se confirma en el plugin en ejecución sin remontarlo); las listas de fijados, los mapas de color y el estado del organizador son el mismo tipo de campo, que es lo que hace durable el almacén de la mitad navegador. `enableLogBacking` NO es volatile a propósito: nunca formó parte de la superficie editable y ninguna mitad navegador lo lee. `cordis.patch.yml` monta el bundle con los valores por defecto siguientes.

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
| `enableLogBacking` | `false` | Pliega los eventos `session/pin` en una proyección respaldada por el registro y la refleja en la caché de settings (fail-closed: el registro es canónico al activarse) |

## Tools & surfaces

| Superficie | Tipo | Notas |
|---|---|---|
| Controles de fila `[pin][color]` | Slot de UI / superposición DOM | Controles al pasar el cursor en cada fila de sesión y espacio de trabajo |
| Interruptor de cabecera de sesión | Slot de UI | El mismo control en la fila de acciones de la cabecera, indexado por id de sesión |
| Pie de barra lateral + panel de fijados | Slot de UI / superposición | Lista espacios y sesiones fijados, agrupados por board (plegable) con gestión de board/etiquetas por fila y puntos de color |
| `/goto <palabra>` | command | Salto rápido del compositor por título/etiqueta; la línea nunca llega al modelo |
| Formulario de ajustes `session-pin` | servicio host | El propio Config en vivo del plugin, duradero por perfil: pines, colores y estado del organizador |

## Permissions & data

- **Permisos**: el manifiesto `dshWorkshop` declara `browser:local-storage`, `settings:read` y `settings:write`.
- **Datos**: pines, colores y estado del organizador viven en el formulario de ajustes `session-pin` del plugin (los campos volatile Config `pinned`/`workspacePinned`/`colors`/`workspaceColors`/`boards`/`tags`/`views`), degradando a un documento versionado de `localStorage` (los documentos v1 migran) donde el proxy web no sirve la entrada. No se sube nada. Con `enableLogBacking`, el Config en vivo se convierte en la caché idempotente de la proyección `session/pin` respaldada por log.
- **Registro de sesión**: ninguno por defecto — este plugin no añade eventos de sesión ni tokens a ninguna petición del modelo. Con `enableLogBacking` activo, el host pliega el evento `session/pin` de solo-log (escrito por el RPC `session.setPinned` de upstream) a la proyección canónica; `PinLogAppender` compuerta sus propias escrituras por adelantado, de modo que los hosts que no pueden transportar el evento (`0.1.2-rc.1`) nunca reciben una. Los efectos visibles al modelo siguen siendo ninguno.

## Security boundaries

- **Solo UI.** Sin efectos visibles al modelo, sin red, sin subprocesos; cada superficie se degrada con elegancia en líneas base más antiguas.
- **Estado duradero y acotado.** Pines y colores se podan con las entidades borradas (`pruneStale`); `maxPins` limita el número de fijados por nivel.
- **Salud de solo lectura.** El resumen de salud deriva conteos y direcciones de la instantánea pública de la sesión y no escribe nada de vuelta.

## Known limitations

- **Alcance de la persistencia** — la residencia canónica respaldada por log es opcional (`enableLogBacking`, fail-closed por defecto desactivado) y su bucle de lectura en vivo requiere builds que emitan el evento `session/pin` (el RPC `session.setPinned` de upstream); en líneas base sin él, pines y colores recurren al formulario de ajustes `session-pin` del plugin y luego al `localStorage` del navegador. En hosts cuyo vocabulario de eventos no conoce el tipo, la compuerta previa desactiva por completo los anexados al log (la ruta de lectura fail-closed rechazaría tales logs), así que la proyección degrada allí a la caché de settings.
- **Alcance del orden** — la posición fijada es estable solo bajo el orden **Manual**; bajo el orden **Updated** la promoción por actividad del núcleo vuelve a adelantar sesiones activas, y `reorderOnLoad` reafirma los prefijos al cargar.
- **Navegadores remotos** — los RPC de ajustes son solo loopback en la línea base; los navegadores remotos recurren al `localStorage` local.
- **Respaldo de la insignia de fila** — donde el slot de fila de upstream no está disponible, las filas de sesión se emparejan por el texto del título; con títulos duplicados la insignia aparece en cada fila coincidente y alterna la primera coincidencia (cosmético).
- **Dependencia del DOM de las filas** — la superposición depende de la estructura `role="treeitem"` de las filas del núcleo y debe seguir los cambios de UI de upstream.

## Roadmap

- Entrada «Fijar» en el menú contextual / menú de fila (necesita un slot de menú a nivel de fila en el núcleo; el slot de insignia de fila ya está en upstream).
- ~~Residencia canónica: un evento `session/pin` respaldado por log + una proyección `pin` + un RPC de escritura (upstream) — el namespace de ajustes se retira entonces y el plugin consume `useProjection('pin')`.~~ **Implementado (P0):** el plugin ahora incluye el esquema del evento `session/pin`, el pliegue puro de la proyección (`foldPinEvents`), el canal de anexado con compuerta previa (`PinLogAppender`) y un lector de proyección en el host (`enableLogBacking`) que pliega los eventos `session/pin` en vivo de vuelta a la caché del Config en vivo; el almacén Config en vivo/localStorage sigue siendo la ruta de compatibilidad y degradación, y el registro es canónico al activarse.
- Un selector de color completo en popover (colores personalizados) una vez que exista la residencia canónica; el botón de ciclo actual cubre la paleta predefinida.

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

## PerryLink DSH Plugin Family

This project is one of the **45 DeepSeek Harness plugins** maintained by [PerryLink](https://github.com/PerryLink). If this one helps you, the others likely will too:

| Plugin | One-liner |
|---|---|
| **[dsh-auto-review](https://github.com/PerryLink/dsh-auto-review)** | Second-model auto-review on the approval chain, fail-closed by default | |
| **[dsh-autotier](https://github.com/PerryLink/dsh-autotier)** | Automatic strong/cheap model-tier routing with deterministic risk guards and a `/tier` command | |
| **[dsh-background-agents](https://github.com/PerryLink/dsh-background-agents)** | Durable background child agents with a Web UI sidebar, messaging and interrupt | |
| **[dsh-budget](https://github.com/PerryLink/dsh-budget)** | Cost governance for DeepSeek Harness: budgets, carbon, and latency in one panel. | |
| **[dsh-catalog](https://github.com/PerryLink/dsh-catalog)** | DSH Desktop Market standard catalog source for the PerryLink family | |
| **[dsh-cert-mcp](https://github.com/PerryLink/dsh-cert-mcp)** | Read-only MCP server exposing the certification registry: grades, snapshots and five-dimension evidence | |
| **[dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind)** | Claude Code /rewind-equivalent: snapshots, session forks, one-shot restore | |
| **[dsh-claude-move](https://github.com/PerryLink/dsh-claude-move)** | Migrate Claude Code sessions, memory, skills and CLAUDE.md into DSH | |
| **[dsh-click](https://github.com/PerryLink/dsh-click)** | Cross-platform native desktop control for DeepSeek Harness — Windows first. | |
| **[dsh-composer-history](https://github.com/PerryLink/dsh-composer-history)** | Terminal-style input history for the web composer: arrows, Ctrl+R search | |
| **[dsh-data-quality](https://github.com/PerryLink/dsh-data-quality)** | Dataset quality checks and citation cross-checks (the optional numeric bridge consumed here) | |
| **[dsh-defend](https://github.com/PerryLink/dsh-defend)** | Prompt-injection, jailbreak, and secret-leak defense for DeepSeek Harness. | |
| **[dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck)** | Engineering-discipline guard: requirements grill, test gates, adversary review | |
| **[dsh-draw](https://github.com/PerryLink/dsh-draw)** | Unified static-image generation routing for DeepSeek Harness. | |
| **[dsh-fast](https://github.com/PerryLink/dsh-fast)** | Read-only performance diagnostics for DeepSeek Harness. | |
| **[dsh-fund-research](https://github.com/PerryLink/dsh-fund-research)** | Deterministic research reports for Chinese public mutual funds | |
| **[dsh-github](https://github.com/PerryLink/dsh-github)** | GitHub PR/issues integration for DSH, every write gated by approval | |
| **[dsh-industry-research](https://github.com/PerryLink/dsh-industry-research)** | Industry research orchestration that seals its deliverables through this plugin's `ctx.researchReport.assemble` | |
| **[dsh-laya](https://github.com/PerryLink/dsh-laya)** | Laya typed decisions (`noul`/`choice`/`score`) as a first-class Cordis service and model-visible tools | |
| **[dsh-library](https://github.com/PerryLink/dsh-library)** | Local document knowledge base for DeepSeek Harness. | |
| **[dsh-local-ai](https://github.com/PerryLink/dsh-local-ai)** | Local-model (Ollama) integration for DeepSeek Harness. | |
| **[dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions)** | LSP diagnostics, formatting, completion, code actions and rename over language servers | |
| **[dsh-mask](https://github.com/PerryLink/dsh-mask)** | PII masking middleware: anonymize at the model boundary, restore at the display layer | |
| **[dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel)** | Read-only MCP runtime panel: /mcp command + Settings tab with status, tools and errors | |
| **[dsh-memento](https://github.com/PerryLink/dsh-memento)** | Approval-gated cross-session memory: ctx.memory seam + SQLite + memory tool | |
| **[dsh-observe](https://github.com/PerryLink/dsh-observe)** | OpenTelemetry and Langfuse observability exporter for DeepSeek Harness. | |
| **[dsh-output-styles](https://github.com/PerryLink/dsh-output-styles)** | Claude Code outputStyles-equivalent runtime style switching | |
| **[dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules)** | Claude Code-style declarative allow/deny/ask permission rules with audit | |
| **[dsh-plugin-certification](https://github.com/PerryLink/dsh-plugin-certification)** | Community certification registry with repro-checkable grades and badges | |
| **[dsh-plugin-doctor](https://github.com/PerryLink/dsh-plugin-doctor)** | Zero-dependency static + sandbox smoke detector for DSH plugins | |
| **[dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide)** | Plugin-development knowledge base as an on-demand agent skill | |
| **[dsh-plugin-kit](https://github.com/PerryLink/dsh-plugin-kit)** | Shared zero-runtime-dependency toolkit for the PerryLink DSH plugins | |
| **[dsh-plugin-upgrade](https://github.com/PerryLink/dsh-plugin-upgrade)** | One-package, one-corridor-index plugin upgrade skill: routes a repository to the matching closed corridor card | |
| **[dsh-plugin-upgrade-015](https://github.com/PerryLink/dsh-plugin-upgrade-015)** | Merged `0.1.3-alpha.1` → `0.1.5-rc.1` upgrade corridor card plus a zero-dependency seam scanner | |
| **[dsh-reach](https://github.com/PerryLink/dsh-reach)** | Multi-channel approval/question bridge: WeChat/Telegram/Feishu, session console | |
| **[dsh-research-report](https://github.com/PerryLink/dsh-research-report)** | Verifiable research-report engine: content-addressed evidence ledger and sealed versions | |
| **[dsh-score](https://github.com/PerryLink/dsh-score)** | Multi-dimensional quality scoring for DeepSeek Harness plugins. | |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | Pin sessions in the Web sidebar with durable ordering | |
| **[dsh-session-sync](https://github.com/PerryLink/dsh-session-sync)** | Cross-device session sync for DeepSeek Harness — a dedicated git mirror of your session store. | |
| **[dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security)** | Security-audit skill pack: secret scan, dependency and supply-chain review | |
| **[dsh-talk](https://github.com/PerryLink/dsh-talk)** | Voice-first session loop for DeepSeek Harness: talk to it, hear it answer. | |
| **[dsh-team-rooms](https://github.com/PerryLink/dsh-team-rooms)** | Cross-session team rooms: shared message bus, task board and timeline | |
| **[dsh-test-drive](https://github.com/PerryLink/dsh-test-drive)** | Isolated install-and-smoke test drives for DeepSeek Harness plugins. | |
| **[dsh-ticktick](https://github.com/PerryLink/dsh-ticktick)** | TickTick/Dida365 task bridge: session-header panel + 11 tools | |
| **[dsh-translate](https://github.com/PerryLink/dsh-translate)** | Vendor parameter translation and deterministic JSON repair for DeepSeek Harness. | |


## License

[Apache License 2.0](LICENSE) © 2026 colaboradores de dsh-session-pin

### Instalar desde el mercado de DSH Desktop

Todos los plugins de PerryLink pueden explorarse en el mercado integrado de DSH Desktop: **Market → Sources → add source → pegar** `https://perrylink-dsh-catalog.perrylink.workers.dev/catalog-source.json` **→ seleccionarlo**. La instalación sigue pasando por la verificación de identidad npm del mercado y tu confirmación.
