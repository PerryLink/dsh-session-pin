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
  <a href="https://github.com/topics/dsh-plugin"><img src="https://img.shields.io/badge/topic-dsh--plugin-2ea44f.svg" alt="Topic: dsh-plugin"></a>
  <img src="https://img.shields.io/badge/DSH-0.1.0--rc.6-3884ff.svg" alt="Línea base de DSH: 0.1.0-rc.6">
  <img src="https://img.shields.io/github/stars/PerryLink/dsh-session-pin?style=flat" alt="Estrellas de GitHub">
</p>

> **Fija las conversaciones que importan.** Un plugin de doble cara (host + navegador) para [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) que coloca un pin de un clic en cada fila de sesión — gris al pasar el cursor, ámbar mientras está fijada — mueve las sesiones fijadas al principio de su grupo de espacio de trabajo y conserva el pin entre reinicios y navegadores.

## ¿Por qué fijar?

Las listas de sesiones se ordenan por actividad reciente: la conversación en la que confías toda la semana se hunde poco a poco, y cada chat nuevo la entierra un poco más. Arrastrar filas en el modo de ordenación Manual funciona, pero nadie lo descubre — y los chats fijados que se reordenan con la actividad son justo lo que más critican los usuarios de otros agentes de programación. `dsh-session-pin` te da la experiencia de un clic:

```
┌─ Sesiones ─────────────────────────────┐
│ 📌 Implementar el login        3h      │  ← fijada: pin ámbar siempre visible
│   Corregir el bug de auth      1h      │  ← al pasar el cursor aparece un pin gris
│   Refactorizar la capa de BD   2d      │
└─────────────────────────────────────────┘
```

## ✨ Características

- 🧷 **Pin al pasar el cursor** — un chincheta gris aparece a la izquierda del título al pasar el cursor; las sesiones fijadas muestran un pin ámbar fijo. Un clic alterna, sin abrir la sesión.
- 📌 **Orden superior** — fijar mueve la sesión al frente de su cuenta de espacio de trabajo mediante el RPC público `workspace.insertSessionBefore`. En el orden **Manual** del núcleo la posición se mantiene — sin reordenar por actividad.
- 💾 **Duradero y entre navegadores** — el conjunto fijado vive en el namespace de ajustes `session-pin` del host (respaldado en archivo, recarga en caliente), escrito mediante los RPC estándar `settings.*`. Reinicia DSH, cambia de navegador: los pines sobreviven.
- 🔢 **Límite opcional** — `config.maxPins` limita el número de fijados (por defecto `0` = ilimitado); superarlo se rechaza con una línea de log.
- 🧩 **Cero cambios en el núcleo** — un plugin independiente para la Web GUI oficial de DSH; sin harness parcheado.
- 🌍 **Cinco idiomas** — English · 中文 · Español · Português · हिन्दी.

## 🚀 Inicio rápido

1. **Instalar** — añade el plugin al `cordis.yml` de tu perfil:

```yaml
plugins:
  '@dsh-external/dsh-session-pin':
    path: /path/to/dsh-session-pin
    config:
      maxPins: 5      # opcional; 0 = ilimitado (por defecto)
```

2. **Compilar** (la app web se niega a arrancar si falta el bundle de cliente):

```sh
pnpm install
pnpm run build      # lib/index.js + lib/client.js
```

3. **Reinicia** `dsh web` y pasa el cursor por cualquier fila de sesión de la barra lateral — el pin aparece a la izquierda del título. Haz clic para fijar.

**Desinstalar** — elimina la fila del plugin de `cordis.yml` y reinicia. La sección `session-pin` también puede eliminarse de `settings.yaml`; no se escribe nada más.

## ⚙️ Configuración

| Clave | Tipo | Por defecto | Significado |
|---|---|---|---|
| `maxPins` | entero | `0` | Máximo de sesiones fijadas; `0` = ilimitado. Desfijar siempre funciona. |

## 🧠 Cómo funciona

- **Mitad host** (`src/index.ts`) — registra el namespace de ajustes `session-pin` (`{ pinned: string[], maxPins }`). Sin eventos de sesión, sin tráfico de modelo.
- **Mitad navegador** (`src/client.ts`) — enlaza el namespace mediante `ctx.settingsScope`, dibuja los pines sobre las filas del núcleo y ordena mediante `ctx.workspaces`. Un `MutationObserver` reaplica los pines tras los re-renderizados de React; las filas se identifican por `[role="treeitem"][aria-selected]` más el texto del título (aún no existe un slot de extensión por fila para plugins de terceros).
- **Compilación** — esbuild genera la mitad ESM del host y la mitad CJS del cliente envuelta en la factoría de arranque web (`window.__ModuleLoader__.load({ id, factory })`), con una compuerta de pureza que falla la compilación si cualquier importación de valor `@deepseek-ai/*` se filtra al bundle del navegador.

**Puntos de extensión usados:** `settings` (host); `sessions` / `workspaces` / `settingsScope` / `connection` / `remote` (cliente). **Efectos visibles para el modelo: ninguno** — es un plugin solo de UI: no añade eventos de sesión ni tokens a ninguna petición del modelo.

## 📦 Compatibilidad

| Capa | Línea base |
|---|---|
| DeepSeek Harness | snapshot 0812 / generación npm `@deepseek-ai/dsh@0.1.0-rc.6` (paquetes de cliente `0.1.0-rc.6`) |
| Peer de Cordis | `@deepseek-ai/cordis: ^4.0.1` |
| Node (desarrollo) | ≥ 22 |

## 🧪 Desarrollo

```sh
pnpm install
pnpm run typecheck  # tsc --noEmit
pnpm run test       # tests unitarios con vitest
pnpm run build      # compilación de ambas mitades + compuerta de pureza
```

## 🗺️ Hoja de ruta

- Entrada «Fijar» en el menú contextual / menú de fila (requiere un slot por fila en el núcleo o una superposición del menú).
- Sección **Fijados** independiente arriba de la barra lateral, estilo Slack Starred — Cursor, Claude, Slack, Notion y Telegram convergen todas en un bloque fijado dedicado.
- Residencia canónica: un evento `session/pin` respaldado por el log (el patrón `session/title`) cuando exista un canal de proyección legible por el cliente.

## ⚠️ Limitaciones conocidas

- **Alcance del orden** — la posición fijada es estable solo en el orden **Manual**; en el orden **Updated** la promoción por actividad del núcleo vuelve a adelantar sesiones activas. Las vistas Ungrouped y de lista plana no tienen cuenta en el host, por lo que la posición no persiste allí (los pines y el estado siguen funcionando).
- **Navegadores remotos** — los RPC de ajustes son solo loopback; los navegadores remotos usan `localStorage` local.
- **Títulos duplicados** — las filas se emparejan por texto del título; con títulos duplicados el pin aparece en todas las filas coincidentes y alterna la primera (cosmético).
- **Dependencia del DOM de las filas** — la superposición depende de la estructura `role="treeitem"` / `aria-selected` de las filas del núcleo y debe seguir los cambios de UI del upstream.

## 🌐 Comunidad

- [Discord de DeepSeek Harness](https://discord.gg/Ycq5dCaS4) · [discusiones oficiales](https://github.com/deepseek-ai/deepseek-harness/discussions)
- Descubre más plugins en el [topic `dsh-plugin`](https://github.com/topics/dsh-plugin).

## 📜 Licencia

Apache License 2.0 — véase [LICENSE](LICENSE). Copyright © 2026 colaboradores de dsh-session-pin.
