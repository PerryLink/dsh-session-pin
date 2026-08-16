# 📌 dsh-session-pin

<p align="center">
  <a href="README.md">English</a> ·
  <a href="README.zh-CN.md">中文</a> ·
  <a href="README.es.md">Español</a> ·
  <a href="README.pt.md">Português</a> ·
  <a href="README.hi.md">हिन्दी</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-Apache%202.0-blue.svg" alt="Licencia: Apache-2.0">
  <img src="https://img.shields.io/npm/v/dsh-session-pin" alt="versión npm">
  <img src="https://img.shields.io/npm/dm/dsh-session-pin" alt="descargas npm">
  <img src="https://github.com/PerryLink/dsh-session-pin/actions/workflows/ci.yml/badge.svg" alt="CI">
  <a href="https://github.com/topics/dsh-plugin"><img src="https://img.shields.io/badge/topic-dsh--plugin-2ea44f.svg" alt="Topic: dsh-plugin"></a>
  <img src="https://img.shields.io/badge/DSH-0.1.0--rc.6-3884ff.svg" alt="Línea base de DSH: 0.1.0-rc.6">
  <img src="https://img.shields.io/github/stars/PerryLink/dsh-session-pin?style=flat" alt="Estrellas de GitHub">
</p>

> **Fija las conversaciones que importan — y coloréalas para encontrarlas de un vistazo.** Un plugin de doble cara (host + navegador) para [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) con dos niveles de pin (espacios de trabajo y sesiones), un botón de color tras cada pin que tiñe la fila, y cuatro superficies de pin: un par [pin][color] al pasar el cursor en cada fila, un interruptor de pin en la cabecera de la sesión, una acción al pie de la barra lateral con un panel de fijados, y un fijado persistente por navegador que conserva pines y colores entre reinicios.

## ¿Por qué fijar?

Las listas de sesiones se ordenan por lo más reciente: la conversación de la que dependes toda la semana se hunde poco a poco hasta el fondo, y cada chat nuevo la entierra un poco más. Arrastrar filas en el modo de ordenación Manual funciona, pero nadie lo descubre — y los chats fijados que se vuelven a reordenar por actividad son justo lo que más critican los usuarios de otros agentes de programación. `dsh-session-pin` te da en su lugar la experiencia de un clic:

```
┌─ Workspaces ────────────────────────────┐
│ 🎨 Workbench            ███             │  ← espacio fijado, teñido en rojo
│   📌 Implement login flow         3h    │  ← sesión fijada, teñida en turquesa
│     Fix the auth bug              1h    │  ← al pasar el cursor aparecen pin gris + botón de color
│   Refactor the DB layer           2d    │
└─────────────────────────────────────────┘
```

## ✨ Características

- 🧷 **Controles de fila** — una chincheta gris aparece suavemente a la izquierda del título de la sesión al pasar el cursor; las filas fijadas mantienen un pin ámbar sólido. Donde la build declara el slot por fila de upstream (`sessions.row.action`), el par [pin][color] se renderiza a través de él con el id de sesión autoritativo — y la superposición de DOM omite por completo las filas de sesión, de modo que una fila nunca puede mostrar dos juegos de pin. En líneas base sin el slot, la superposición de DOM cubre las filas de sesión por título.
- 📂 **Pines de espacio de trabajo** — las filas de cabecera de espacio de trabajo obtienen el mismo par [pin][color] (el slot de upstream no se renderiza allí, así que la superposición las cubre, emparejadas por el nombre de espacio de trabajo, único por imposición del host). Fijar un espacio de trabajo lo mueve al frente de la lista de espacios de trabajo mediante el RPC público `workspace.insertBefore`.
- 🎨 **Colores de fila** — el botón de color tras cada pin recorre una paleta de 8 colores con cada clic (Shift+clic lo limpia). La fila coloreada recibe una barra de acento a la izquierda más un tinte translúcido — sesiones y espacios de trabajo por separado, para distinguir una región de un vistazo. Los colores persisten con los pines y se podan con las entidades borradas.
- 📌 **Interruptor de cabecera** — el mismo control de pin se encuentra en la fila de acciones de la cabecera de la sesión (`conversation.session.header.actions`), indexado por el id de sesión resuelto por el framework: los títulos duplicados y las sesiones en blanco se fijan correctamente aquí.
- 🗂 **Panel de fijados** — una acción al pie de la barra lateral abre un panel flotante que lista los espacios de trabajo y las sesiones fijados (el pin más reciente primero) con el punto de color de cada fila; hacer clic en uno salta a él. Escape o un clic fuera lo cierra.
- 📐 **Orden superior** — fijar mueve la sesión al frente de su cuenta del espacio de trabajo mediante el RPC público `workspace.insertSessionBefore`, y un espacio de trabajo fijado se mueve al frente de la lista de espacios de trabajo; `reorderOnLoad` reafirma ambos prefijos de fijados después de que las listas carguen (idempotente, de modo que nunca entra en conflicto con el reordenamiento propio del núcleo). Bajo el orden **Manual** del núcleo, la posición se mantiene fija.
- 💾 **Fijado persistente** — la mitad host registra el namespace de ajustes durable `session-pin` (declarado expuesto por cable mediante `settings.register({ expose: true })` en los builds que lo soportan); la mitad navegador lee a través de los RPC estándar `settings.*`. En builds cuyo proxy web no sirve los namespaces de plugins, la mitad navegador recurre a un documento versionado de `localStorage` (los documentos v1 migran), con sincronización entre pestañas mediante eventos `storage`.
- 📡 **Canal de escritura respaldado por log** — en builds que montan el servicio integrado `dsh-session-pin`, cada cambio de sesión se confirma primero mediante el RPC `session.setPinned` (el log de eventos `session/pin` es la residencia canónica) y se refleja en el almacén de ajustes, de modo que la lista ordenada, el panel y el reordenamiento del espacio de trabajo se mantienen consistentes. Un RPC fallido o lento degrada a una escritura directa en ajustes; la siguiente generación de conexión lo vuelve a habilitar. El interruptor de la cabecera de sesión lee la proyección `pin` cuando el host la sirve: los cambios entre dispositivos convergen a través de ella. Los pines de espacio de trabajo y los colores son estado local del plugin y siempre se escriben en el almacén.
- 🔢 **Límite opcional** — `config.maxPins` limita la cantidad de fijados por nivel (por defecto `0` = ilimitado); superarlo muestra una pista de límite inline en la insignia.
- 🧹 **Estado autorreparable** — `pruneStale` elimina pines y colores de espacios de trabajo/sesiones borrados o archivados una vez que las listas están listas.
- 🌍 **UI localizada** — los textos de insignia, botón de color, cabecera, pie y panel se envían en 中文 e inglés a través del servicio de locale; las composiciones sin él conservan el respaldo en inglés. Readmes: English · 中文 · Español · Português · हिन्दी.
- 🧩 **Cero cambios en el núcleo** — un plugin independiente para la Web GUI oficial de DSH; cada superficie nueva se degrada con elegancia en líneas base más antiguas.

## 🚀 Inicio rápido

1. **Instalar** — añade el plugin al `cordis.yml` de tu perfil:

```yaml
plugins:
  'dsh-session-pin':
    path: /path/to/dsh-session-pin
    config:
      maxPins: 5        # optional; 0 = unlimited (default)
      reorderOnLoad: true   # optional; re-assert pinned order after load (default)
      pruneStale: true      # optional; drop pins of deleted sessions (default)
```

> **Entry id del loader.** El loader deduplica los entry ids en todo el árbol
> raíz de includes. En builds de harness cuyo bundle `dsh-base` monta el
> servicio host integrado `@deepseek-ai/dsh-session-pin` (entry id
> `session-pin` — el estado de pin respaldado por log y el RPC
> `session.setPinned`), asigna a ESTE plugin un entry id distinto, p. ej.
> `id: session-pin-ui` en la fila del patch del perfil. Un id `session-pin`
> duplicado hace fallar todo el arranque con "duplicate loader entry id".
> El `name` cordis interno del plugin y su namespace de settings siguen
> siendo `session-pin` — solo el entry id del perfil debe diferir.

2. **Compilar** (la app web se niega a arrancar si falta el bundle de cliente):

```sh
pnpm install
pnpm run build      # lib/index.js + lib/client.js
```

3. **Reinicia** `dsh web` y pasa el cursor por cualquier fila de la barra lateral — la insignia de pin (y el botón de color) aparece a la izquierda del título. Haz clic para fijar; haz clic en el botón de color para recorrer los colores; Shift+clic para limpiar el color; alterna de nuevo desde la cabecera de la sesión; abre la lista de fijados desde el pie de la barra lateral.

**Desinstalar** — elimina la fila del plugin de `cordis.yml` y reinicia. La sección `session-pin` también puede eliminarse de `settings.yaml`; no se escribe nada más.

## ⚙️ Configuración

| Clave | Tipo | Por defecto | Significado |
|---|---|---|---|
| `maxPins` | entero | `0` | Máximo de entidades fijadas por nivel (las sesiones y los espacios de trabajo tienen su propio presupuesto); `0` = ilimitado. Desfijar siempre funciona. |
| `reorderOnLoad` | booleano | `true` | Reafirma los prefijos de fijados (el pin más reciente primero) una vez que las listas de sesiones/espacios de trabajo están listas y en cambios del espacio de trabajo. |
| `pruneStale` | booleano | `true` | Elimina pines y colores de entidades ausentes de una lista ya preparada (borradas/archivadas). |
| `enableBoards` | boolean | `true` | Habilita los grupos de pines (boards) en el panel lateral. |
| `enableTags` | boolean | `true` | Habilita las etiquetas de sesión/espacio de trabajo y la barra de filtros del panel. |
| `enableViews` | boolean | `true` | Habilita las vistas de filtro guardadas. |
| `enableHealth` | boolean | `true` | Habilita el resumen de salud por sesión pineada (solo lectura, saneado). |
| `enableGoto` | boolean | `true` | Habilita el comando `/goto <palabra>` del compositor. |

## 🧭 Organizador de navegación

Sobre el pineado: **boards** (los pines se agrupan con nombre; el panel muestra chips que filtran por grupo), **etiquetas y vistas guardadas** (hasta 8 etiquetas por entidad; la barra filtra por texto y etiqueta, y cualquier filtro se guarda como vista con un clic), **resumen de salud** (cada fila de sesión pineada muestra una línea saneada y de solo lectura — nº de mensajes, dirección del último, tiempo relativo — derivada de la instantánea pública de la sesión; solo conteos y direcciones, nunca contenido) y **`/goto <palabra>`** (una línea del compositor que empiece por `/goto` y Enter salta: coincidencia única abre, varias listan, ninguna lo explica; la línea de comando nunca llega al modelo). Todo el estado queda local en el navegador.
## 🧠 Cómo funciona

- **Mitad host** (`src/index.ts`) — registra el namespace de ajustes `session-pin` (`{ pinned, workspacePinned, colors, workspaceColors, maxPins, reorderOnLoad, pruneStale }`), con la política aplicada en la capa base de composición. Sin eventos de sesión, sin tráfico de modelo.
- **Mitad navegador** (`src/client.ts`) — ensambla un `PinStore` sin framework (transporte de settings, que se degrada a un documento versionado de `localStorage` con sincronización entre pestañas), un `PinController` (máquina de estados de alternar en dos niveles / ciclo de color / purgar / reordenar) y la UI: la superposición de filas (filas de espacio de trabajo siempre; filas de sesión solo mientras el slot de fila no está declarado), el registro opcional del slot de fila, el interruptor de cabecera, la acción del pie de la barra lateral y el panel de superposición. El ordenamiento pasa por `ctx.workspaces`; el tinte de fila es CSS puro (`:has()` indexado por la clase `data-color` del botón de color).
- **Compilación** — esbuild emite la mitad ESM del host y la mitad CJS del cliente envuelta en la factoría de arranque web (`window.__ModuleLoader__.load({ id, factory })`); `react` se externaliza sobre la palabra semilla de la tabla de módulos para que el bundle se renderice con el React propio del shell. Una compuerta de pureza falla la compilación si cualquier importación de valor `@deepseek-ai/*` se filtra al bundle del navegador.

**Puntos de extensión usados:** `settings` (host); `sessions`, `workspaces`, `settingsScope`, `connection`, `remote`, `slots` (cliente); `locale` (cliente, opcional); `conversation.session.header.actions`, `sidebar.footer.action`, `shell.overlay`, y el slot de fila de upstream `sessions.row.action` cuando está declarado. **Efectos visibles para el modelo: ninguno** — este es un plugin solo de UI: no añade eventos de sesión ni tokens a ninguna petición del modelo.

## 📦 Compatibilidad

| Capa | Línea base |
|---|---|
| DeepSeek Harness | generación npm `@deepseek-ai/dsh@0.1.0-rc.6` (paquetes de cliente `0.1.0-rc.6`); las builds más nuevas activan el slot de fila, los settings expuestos por wire y la proyección `session/pin` automáticamente |
| Peer de Cordis | `@deepseek-ai/cordis: ^4.0.1` |
| Node (desarrollo) | ≥ 22 |

## 🧪 Desarrollo

```sh
pnpm install
pnpm run typecheck  # tsc --noEmit
pnpm run test       # vitest unit tests (pin-core, store, controller, overlay, host registration)
pnpm run build      # dual-half build + client-bundle purity check
node scripts/verify-live.mjs   # live check against a running `dsh web` (DSH_CHECKOUT env)
```

## 🗺️ Hoja de ruta

- Entrada «Fijar» en el menú contextual / menú de fila (necesita un slot de menú a nivel de fila en el núcleo; el slot de insignia de fila ya está en upstream).
- Residencia canónica: un evento `session/pin` respaldado por el log + una proyección `pin` + un RPC de escritura (upstream) — el namespace de settings se retira entonces como almacén durable y el plugin consume `useProjection('pin')`.
- Un selector de color completo en popover (colores personalizados) una vez que exista la residencia canónica; el botón de ciclo actual cubre la paleta predefinida.

## ⚠️ Limitaciones conocidas

- **Alcance de la persistencia** — en builds cuyo proxy web no sirve los namespaces de settings de plugins, la mitad navegador guarda los pines y colores en un documento versionado de `localStorage` (local al navegador) hasta que upstream exponga el namespace (declarado mediante `settings.register({ expose: true })` en builds más nuevas). El registro del lado del host ya está en su sitio y se convierte automáticamente en el almacén durable.
- **Alcance del orden** — la posición fijada es estable solo bajo el orden **Manual**; bajo el orden **Updated** la promoción por actividad del núcleo vuelve a adelantar las sesiones activas, y `reorderOnLoad` reafirma los prefijos al cargar y en cambios del espacio de trabajo. Las vistas Ungrouped y de lista plana no tienen cuenta en el lado del host, por lo que la posición de las sesiones no se persiste allí (las insignias, los colores y el estado del pin siguen funcionando). El orden de los espacios de trabajo persiste a través del orden de visualización del registro.
- **Navegadores remotos** — los RPC de settings son solo loopback en la línea base; los navegadores remotos recurren al `localStorage` local al navegador.
- **Respaldo de la insignia de fila** — donde el slot de fila de upstream no está disponible, las filas de sesión se emparejan por el texto del título; con títulos duplicados la insignia aparece en cada fila coincidente y alterna la primera coincidencia (cosmético). El interruptor de cabecera siempre va indexado por id y no se ve afectado. En builds CON el slot, las filas de sesión se renderizan solo a través del slot — la duplicación del respaldo es imposible.
- **Emparejado de filas de espacio de trabajo** — los controles de espacio de trabajo se emparejan por nombre (único por imposición del host); renombrar sigue automáticamente. El cubo «Ungrouped» y las filas de resultados de búsqueda no muestran controles a propósito.
- **Dependencia del DOM de las filas** — la superposición depende de la estructura `role="treeitem"` / `aria-selected` / `aria-expanded` de las filas del núcleo y debe seguir los cambios de UI de upstream. El tinte de fila necesita CSS `:has()` (Chrome 105+, Firefox 121+, Safari 15.4+); navegadores más antiguos siguen viendo el punto de color, solo sin tinte.

## 🌐 Comunidad

- [Discord de DeepSeek Harness](https://discord.gg/Ycq5dCaS4) · [discusiones oficiales](https://github.com/deepseek-ai/deepseek-harness/discussions)
- Descubre más plugins en el [topic `dsh-plugin`](https://github.com/topics/dsh-plugin).

## 👥 Contribuidores

Gracias a todas las personas que han dado forma a este plugin:

- [**PerryLink**](https://github.com/PerryLink) — creador y mantenedor: experiencia de pin, persistencia durable, ordenamiento de espacios de trabajo, colores por pin, documentación en cinco idiomas e ingeniería comunitaria (v0.1.0 → v0.3.0).

_¡Contribuciones bienvenidas! Abre un [issue](https://github.com/PerryLink/dsh-session-pin/issues) o inicia una [discusión](https://github.com/PerryLink/dsh-session-pin/discussions) para participar._

## 📜 Licencia

Apache License 2.0 — véase [LICENSE](LICENSE). Copyright © 2026 colaboradores de dsh-session-pin.
