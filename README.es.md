<div align="center">

# 📌 dsh-session-pin
- **Canal 1024 store**: `npm i -g dsh1024` una vez, luego `dsh1024 plugin --profile web add dsh-session-pin` (cuenta para el ranking de instalaciones de [deepseek1024.com](https://deepseek1024.com)).

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
| Harness | DeepSeek Harness `0.1.1-rc.2` (paquetes de cliente `0.1.1-rc.2`) |
| Node | `>= 22` (base mínima de desarrollo) |
| Plataformas | Web GUI (doble cara: host + navegador) |
| Modelo | Cualquiera (solo UI — sin tráfico de modelo, sin eventos de sesión) |
| Eventos `session/pin` | Con compuerta previa: nunca se escriben en hosts cuyo vocabulario de eventos no conoce el tipo y cuyo append dejó caer el marcador `ignorable` (`0.1.2-alpha.1`); la proyección degrada a la caché de settings |

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

- **Boards** — los pines se agrupan con nombre; la fila de chips crea, renombra y elimina boards y los reordena arrastrando (el orden persiste por navegador), mientras el panel agrupa los pines de cada board bajo una cabecera plegable.
- **Etiquetas y vistas** — las entidades llevan hasta 8 etiquetas (≤24 caracteres cada una), fijadas por fila desde el botón de gestionar del panel (que también asigna el board del pin); la barra filtra por texto y etiquetas, y cualquier filtro se guarda como vista con nombre (hasta 20) para cambiar con un clic.
- **Resumen de salud** — cada fila de sesión fijada añade una línea de solo lectura y saneada (`N msgs · you|ai · tiempo relativo`) derivada de la instantánea pública de la sesión — solo conteos y direcciones, nunca contenido.
- **`/goto <palabra>`** — una línea del compositor que empiece por `/goto` más Enter salta: una coincidencia única abre, varias se listan, ninguna lo explica. La línea de comando nunca llega al modelo.

## How it works

- **Mitad host** (`src/index.ts`) — registra el namespace de ajustes durable `session-pin` (las dos listas de ids fijados, los dos mapas de color y el estado del organizador, más la política del host `maxPins`/`reorderOnLoad`/`pruneStale`); sin eventos de sesión, sin tráfico de modelo.
- **Mitad navegador** (`src/client.ts`) — ensambla un `PinStore` sin framework (transporte de ajustes, degradando a un documento versionado de `localStorage` con sincronización entre pestañas), un `PinController` (máquina de estados de alternar / ciclo de color / purgar / reordenar) y la UI: la superposición de filas, el registro opcional del slot de fila, el interruptor de cabecera, la acción del pie y el panel de fijados. El orden pasa por `ctx.workspaces`.
- **Canal de escritura respaldado por log** — en builds que montan el servicio integrado `dsh-session-pin`, cada cambio de sesión se confirma primero por el RPC `session.setPinned` (el log de eventos `session/pin` es la residencia canónica) y se refleja en el almacén de ajustes; un RPC fallido o lento degrada a una escritura directa.
- **Lectura de proyección respaldada por log** — `enableLogBacking` (Config del host, por defecto desactivado en modo fail-closed) monta un lector que pliega eventos `session/pin` en vivo al conjunto canónico y refleja `pinned`/`colors` en el namespace de settings. El esquema, el pliegue puro (`foldPinEvents`) y la costura de anexado con compuerta previa (`PinLogAppender`) viven en `src/pin-log.ts`: el vocabulario de eventos del host más su marcador `ignorable` se prueban ANTES de la primera escritura (resultado cacheado por proceso), de modo que los hosts que no pueden transportar el evento con seguridad — `0.1.2-alpha.1` rechaza tipos desconocidos al leer — nunca reciben uno; el almacén settings/localStorage sigue siendo la ruta de compatibilidad y degradación.
- **Seam del cliente** — la mitad navegador lee los brands `SessionId`/`WorkspaceId` desde `@deepseek-ai/dsh-client-connection` (el paquete eliminado `dsh-client-runtime` ya no existe en los hosts actuales); los asientos del kit estándar del slot de cabecera se tipan como contrato estructural local. En hosts `0.1.2-alpha.1` el slot de fila `sessions.row.action` no está declarado, así que las filas de sesión recurren a la superposición DOM y el registro del slot queda diferido.
- **Compilación** — esbuild emite la mitad ESM del host y la mitad CJS del cliente envuelta en la factoría de arranque web (`window.__ModuleLoader__.load({ id, factory })`); `react` se externaliza al React del shell, y una compuerta de pureza falla el build si una importación de valor `@deepseek-ai/*` se filtra al bundle del navegador.

**Puntos de extensión usados:** `settings` (host); `sessions`, `workspaces`, `settingsScope`, `connection`, `remote`, `slots` (cliente); `locale` (cliente, opcional); `conversation.session.header.actions`, `sidebar.footer.action`, `shell.overlay`, y el slot de fila `sessions.row.action` cuando está declarado (los hosts `0.1.2-alpha.1` no lo declaran — la superposición DOM cubre allí las filas de sesión). **Efectos visibles al modelo: ninguno** — plugin solo de UI: no añade eventos de sesión ni tokens.

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
| `enableLogBacking` | `false` | Pliega los eventos `session/pin` en una proyección respaldada por el registro y la refleja en la caché de settings (fail-closed: el registro es canónico al activarse) |

## Tools & surfaces

| Superficie | Tipo | Notas |
|---|---|---|
| Controles de fila `[pin][color]` | Slot de UI / superposición DOM | Controles al pasar el cursor en cada fila de sesión y espacio de trabajo |
| Interruptor de cabecera de sesión | Slot de UI | El mismo control en la fila de acciones de la cabecera, indexado por id de sesión |
| Pie de barra lateral + panel de fijados | Slot de UI / superposición | Lista espacios y sesiones fijados, agrupados por board (plegable) con gestión de board/etiquetas por fila y puntos de color |
| `/goto <palabra>` | command | Salto rápido del compositor por título/etiqueta; la línea nunca llega al modelo |
| Namespace de ajustes `session-pin` | servicio host | Almacén duradero por navegador de pines, colores y estado del organizador |

## Permissions & data

- **Permisos**: el manifiesto `dshWorkshop` declara `browser:local-storage`, `settings:read` y `settings:write`.
- **Datos**: pines, colores y estado del organizador viven por navegador en el namespace de ajustes `session-pin`, degradando a un documento versionado de `localStorage` (los documentos v1 migran) donde el proxy web no sirve el namespace. No se sube nada.
- **Registro de sesión**: ninguno por defecto — este plugin no añade eventos de sesión ni tokens a ninguna petición del modelo. Con `enableLogBacking` activo, el host pliega el evento `session/pin` de solo-log (escrito por el RPC `session.setPinned` de upstream) a la proyección canónica; `PinLogAppender` compuerta sus propias escrituras por adelantado, de modo que los hosts que no pueden transportar el evento (`0.1.2-alpha.1`) nunca reciben una. Los efectos visibles al modelo siguen siendo ninguno.

## Security boundaries

- **Solo UI.** Sin efectos visibles al modelo, sin red, sin subprocesos; cada superficie se degrada con elegancia en líneas base más antiguas.
- **Estado duradero y acotado.** Pines y colores se podan con las entidades borradas (`pruneStale`); `maxPins` limita el número de fijados por nivel.
- **Salud de solo lectura.** El resumen de salud deriva conteos y direcciones de la instantánea pública de la sesión y no escribe nada de vuelta.

## Known limitations

- **Alcance de la persistencia** — donde el proxy web no sirve el namespace `session-pin`, pines y colores recurren al `localStorage` del navegador; el registro del host se convierte en el almacén duradero automáticamente una vez que upstream expone el namespace. En hosts `0.1.2-alpha.1` la compuerta previa desactiva por completo los anexados al log (el vocabulario de eventos fail-closed rechazaría tales logs), así que la proyección degrada allí a la caché de settings.
- **Alcance del orden** — la posición fijada es estable solo bajo el orden **Manual**; bajo el orden **Updated** la promoción por actividad del núcleo vuelve a adelantar sesiones activas, y `reorderOnLoad` reafirma los prefijos al cargar.
- **Navegadores remotos** — los RPC de ajustes son solo loopback en la línea base; los navegadores remotos recurren al `localStorage` local.
- **Respaldo de la insignia de fila** — donde el slot de fila de upstream no está disponible, las filas de sesión se emparejan por el texto del título; con títulos duplicados la insignia aparece en cada fila coincidente y alterna la primera coincidencia (cosmético).
- **Dependencia del DOM de las filas** — la superposición depende de la estructura `role="treeitem"` de las filas del núcleo y debe seguir los cambios de UI de upstream.

## Roadmap

- Entrada «Fijar» en el menú contextual / menú de fila (necesita un slot de menú a nivel de fila en el núcleo; el slot de insignia de fila ya está en upstream).
- ~~Residencia canónica: un evento `session/pin` respaldado por log + una proyección `pin` + un RPC de escritura (upstream) — el namespace de ajustes se retira entonces y el plugin consume `useProjection('pin')`.~~ **Implementado (P0):** el plugin ahora incluye el esquema del evento `session/pin`, el pliegue puro de la proyección (`foldPinEvents`), el canal de anexado con compuerta previa (`PinLogAppender`) y un lector de proyección en el host (`enableLogBacking`) que pliega los eventos `session/pin` en vivo de vuelta a la caché de settings; el almacén settings/localStorage sigue siendo la ruta de compatibilidad y degradación, y el registro es canónico al activarse.
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

Este proyecto es uno de los [33 complementos de DeepSeek Harness](https://github.com/PerryLink) mantenidos por [PerryLink](https://github.com/PerryLink). Si este te ayuda, probablemente los demás también:

| Plugin | One-liner |
|---|---|
| **[dsh-dsh-auto-review](https://github.com/PerryLink/dsh-dsh-auto-review)** | Auto-revisión de segundo modelo en la cadena de aprobación, con cierre en fallo por defecto | |
| **[dsh-dsh-background-agents](https://github.com/PerryLink/dsh-dsh-background-agents)** | Agentes hijos en segundo plano durables con barra lateral de UI web, mensajería e interrupción | |
| **[dsh-dsh-budget](https://github.com/PerryLink/dsh-dsh-budget)** | Gobernanza de costes para DeepSeek Harness: presupuestos, carbono y latencia en un panel. | |
| **[dsh-dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-dsh-checkpoint-rewind)** | Equivalente a /rewind de Claude Code: instantáneas, bifurcaciones de sesión, restauración de un solo uso | |
| **[dsh-dsh-claude-move](https://github.com/PerryLink/dsh-dsh-claude-move)** | Migra sesiones, memoria, habilidades y CLAUDE.md de Claude Code a DSH | |
| **[dsh-dsh-click](https://github.com/PerryLink/dsh-dsh-click)** | Control de escritorio nativo multiplataforma para DeepSeek Harness — Windows primero. | |
| **[dsh-dsh-composer-history](https://github.com/PerryLink/dsh-dsh-composer-history)** | Historial de entrada estilo terminal para el compositor web: flechas, búsqueda Ctrl+R | |
| **[dsh-dsh-data-quality](https://github.com/PerryLink/dsh-dsh-data-quality)** | Comprobaciones de calidad de datasets y verificación de citas (el puente numérico opcional consumido aquí) | |
| **[dsh-dsh-defend](https://github.com/PerryLink/dsh-dsh-defend)** | Defensa contra inyección de prompts, jailbreak y fuga de secretos para DeepSeek Harness. | |
| **[dsh-dsh-doublecheck](https://github.com/PerryLink/dsh-dsh-doublecheck)** | Guardián de disciplina de ingeniería: interrogatorio de requisitos, puertas de pruebas, revisión adversaria | |
| **[dsh-dsh-draw](https://github.com/PerryLink/dsh-dsh-draw)** | Enrutamiento unificado de generación de imágenes estáticas para DeepSeek Harness. | |
| **[dsh-dsh-fast](https://github.com/PerryLink/dsh-dsh-fast)** | Diagnóstico de rendimiento de solo lectura para DeepSeek Harness. | |
| **[dsh-dsh-fund-research](https://github.com/PerryLink/dsh-dsh-fund-research)** | Informes de investigación deterministas para fondos mutuos públicos chinos | |
| **[dsh-dsh-github](https://github.com/PerryLink/dsh-dsh-github)** | Integración de PR/issues de GitHub para DSH, cada escritura controlada por aprobación | |
| **[dsh-dsh-industry-research](https://github.com/PerryLink/dsh-dsh-industry-research)** | Orquestación de investigación sectorial que sella sus entregables mediante el `ctx.researchReport.assemble` de este plugin | |
| **[dsh-dsh-library](https://github.com/PerryLink/dsh-dsh-library)** | Base de conocimiento documental local para DeepSeek Harness. | |
| **[dsh-dsh-local-ai](https://github.com/PerryLink/dsh-dsh-local-ai)** | Integración de modelos locales (Ollama) para DeepSeek Harness. | |
| **[dsh-dsh-lsp-actions](https://github.com/PerryLink/dsh-dsh-lsp-actions)** | Diagnósticos, formato, autocompletado, acciones de código y renombrado LSP sobre servidores de lenguaje | |
| **[dsh-dsh-mask](https://github.com/PerryLink/dsh-dsh-mask)** | Middleware de enmascaramiento de PII: anonimiza en el límite del modelo, restaura en la capa de visualización | |
| **[dsh-dsh-mcp-panel](https://github.com/PerryLink/dsh-dsh-mcp-panel)** | Panel de tiempo de ejecución MCP de solo lectura: comando /mcp + pestaña Settings con estado, herramientas y errores | |
| **[dsh-dsh-memento](https://github.com/PerryLink/dsh-dsh-memento)** | Memoria entre sesiones controlada por aprobación: costura ctx.memory + SQLite + herramienta de memoria | |
| **[dsh-dsh-observe](https://github.com/PerryLink/dsh-dsh-observe)** | Exportador de observabilidad OpenTelemetry y Langfuse para DeepSeek Harness. | |
| **[dsh-dsh-output-styles](https://github.com/PerryLink/dsh-dsh-output-styles)** | Cambio de estilo en tiempo de ejecución equivalente a outputStyles de Claude Code | |
| **[dsh-dsh-permission-rules](https://github.com/PerryLink/dsh-dsh-permission-rules)** | Reglas de permisos declarativas allow/deny/ask estilo Claude Code con auditoría | |
| **[dsh-dsh-plugin-guide](https://github.com/PerryLink/dsh-dsh-plugin-guide)** | Base de conocimiento de desarrollo de plugins como habilidad de agente bajo demanda | |
| **[dsh-dsh-research-report](https://github.com/PerryLink/dsh-dsh-research-report)** | Motor de informes de investigación verificables con evidencia direccionada por contenido | |
| **[dsh-dsh-score](https://github.com/PerryLink/dsh-dsh-score)** | Puntuación de calidad multidimensional para plugins de DeepSeek Harness. | |
| **[dsh-dsh-session-sync](https://github.com/PerryLink/dsh-dsh-session-sync)** | Sincronización de sesiones entre dispositivos para DeepSeek Harness — un espejo git dedicado de tu almacén de sesiones. | |
| **[dsh-dsh-skill-pack-security](https://github.com/PerryLink/dsh-dsh-skill-pack-security)** | Paquete de habilidades de auditoría de seguridad: escaneo de secretos, revisión de dependencias y cadena de suministro | |
| **[dsh-dsh-talk](https://github.com/PerryLink/dsh-dsh-talk)** | Bucle de sesión con voz para DeepSeek Harness: háblale y escucha su respuesta. | |
| **[dsh-dsh-test-drive](https://github.com/PerryLink/dsh-dsh-test-drive)** | Pruebas de instalación y humo aisladas para plugins de DeepSeek Harness. | |
| **[dsh-dsh-translate](https://github.com/PerryLink/dsh-dsh-translate)** | Traducción de parámetros entre proveedores y reparación determinista de JSON para DeepSeek Harness. | |

## License

[Apache License 2.0](LICENSE) © 2026 colaboradores de dsh-session-pin
