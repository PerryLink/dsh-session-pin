<div align="center">

# 📌 dsh-session-pin
- **Canal 1024 store**: `npm i -g dsh1024` uma vez, depois `dsh1024 plugin --profile web add dsh-session-pin` (conta para o ranking de instalações do [deepseek1024.com](https://deepseek1024.com)).

**Fixe sessões e espaços de trabalho no topo da barra lateral do DeepSeek Harness com cores por pin.**

*Um plugin de duas faces (host + navegador): dois níveis de pin, um botão de 8 cores por pin e um organizador de navegação — boards, tags, vistas salvas, resumos de saúde e `/goto`.*

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
[![dshfind](https://dshfind.com/api/badge/PerryLink/dsh-session-pin?metric=downloads&lang=pt)](https://dshfind.com/pt/plugins/PerryLink/dsh-session-pin?ref=badge)

[English](README.md) · [简体中文](README-zh.md) · [Español](README-es.md) · [Português](README-pt.md) · [हिन्दी](README-hi.md)

</div>

---

## Compatibility

| Superfície | Status |
|---|---|
| Harness | DeepSeek Harness `dsh-v0.1.7-rc.1` (tag do GitHub; verificado em 2026-09-22: typecheck de régua dupla + suítes unitárias/de composição + verificações estáticas de costura; a rodada de navegador fica com o mantenedor). Pin npm `0.1.7-rc.1`, peers `>=0.1.2-rc.1 <0.2.0 || >=0.1.5-alpha.1 <0.2.0 || >=0.1.6-0 <0.2.0 || >=0.1.7-0 <0.2.0`. |
| Node | `>= 22` (piso de desenvolvimento) |
| Plataformas | Web GUI (duas faces: host + navegador) |
| Modelo | Qualquer (somente UI — sem tráfego de modelo, sem eventos de sessão) |
| Eventos `session/pin` | Com portão prévio: escritos apenas quando o vocabulário de eventos em tempo de execução conhece o tipo (o append da linha alpha não consegue mais estampar o marcador `ignorable`, então o vocabulário é o único sinal do portão — adaptado em 2026-09-18); caso contrário a projeção degrada para o cache de settings e um aviso é emitido antes da primeira escrita. |

## What you get

O `dsh-session-pin` mantém no topo da barra lateral as conversas que importam e as colore para encontrá-las de relance:

- **Dois níveis de pin** — fixe espaços de trabalho inteiros e sessões individuais; um espaço fixado vai para a frente da lista de espaços e uma sessão fixada para a frente da sua conta.
- **Cores de linha por pin** — o botão de cor após cada pin percorre uma paleta de 8 cores (Shift+clique limpa); a linha ganha uma barra de destaque à esquerda e um tom translúcido.
- **Quatro superfícies de pin** — um par `[pin][cor]` ao passar o mouse em cada linha, um alternador no cabeçalho da sessão, uma ação no rodapé da barra lateral com um painel de fixados, e fixação durável por navegador que mantém pins e cores entre reinícios.
- **Clique para abrir** — clicar numa linha fixada (na barra lateral ou no painel de fixados) abre a sessão na janela atual (a mesma costura usada pelo `/goto`); ambos navegam pelo canal de retenção de sessão do host na linha alpha.
- **Zero mudanças no núcleo** — um plugin independente para a Web GUI padrão do DSH; cada superfície degrada com elegância em linhas de base mais antigas.

```text
┌─ Workspaces ────────────────────────────┐
│ 🎨 Workbench            ███             │  ← espaço fixado, tingido de vermelho
│   📌 Implement login flow         3h    │  ← sessão fixada, tingida de azul-petróleo
│     Fix the auth bug              1h    │  ← ao passar o mouse: alfinete cinza + botão de cor
│   Refactor the DB layer           2d    │
└─────────────────────────────────────────┘
```

## Navigation organizer

Quatro capacidades locais do navegador organizam o trabalho multi-sessão por cima da fixação. Todo o estado vive no mesmo armazenamento `session-pin` (por navegador; nada é enviado) e cada uma tem um interruptor de Config.

- **Boards** — pins em grupos nomeados; a linha de chips cria, renomeia e exclui boards e os reordena arrastando (a ordem persiste por navegador), enquanto o painel agrupa os pins de cada board sob um cabeçalho recolhível.
- **Tags e vistas** — as entidades levam até 8 tags (≤24 caracteres cada), definidas por linha no botão de gerir do painel (que também atribui o board do pin); a barra filtra por texto e tags, e qualquer filtro é salvo como vista nomeada (até 20) para trocar com um clique.
- **Resumo de saúde** — cada linha de sessão fixada acrescenta uma linha de somente leitura e higienizada (`N msgs · you|ai · tempo relativo`) derivada da snapshot pública da sessão — apenas contagens e direções, nunca conteúdo.
- **`/goto <palavra>`** — uma linha do compositor começando com `/goto` mais Enter salta: uma correspondência única abre, várias listam, nenhuma explica. A linha de comando nunca chega ao modelo.

## How it works

- **Metade host** (`src/index.ts`) — declara o formulário de settings `session-pin` como o próprio Config ao vivo do plugin: as duas listas de ids fixados, os dois mapas de cor, o estado do organizador e a política do host (`maxPins`/`reorderOnLoad`/`pruneStale` mais os cinco interruptores de recurso) são todos campos `.volatile()`. No contrato de settings `0.1.7` o namespace de um formulário é o id local de sua entrada de perfil, então a linha `id: session-pin` do patch do bundle dá nome ao formulário, a página Plugins o edita e as edições aceitas são aplicadas a quente ao plugin em execução; sem eventos de sessão, sem tráfego de modelo.
- **Metade navegador** (`src/client.ts`) — monta um `PinStore` sem framework (o formulário de Config ao vivo da metade host, lido via `ctx.configForms.get(entryId)`, degradando para um documento versionado de `localStorage` com sincronização entre abas), um `PinController` (máquina de estados de alternar / ciclo de cor / podar / reordenar) e a UI: a sobreposição de linhas, o registro opcional do slot, o alternador de cabeçalho, a ação do rodapé e o painel de fixados. A ordenação passa por `ctx.workspaces`.
- **Canal de escrita respaldado por log** — em builds que montam o serviço integrado `dsh-session-pin`, cada alternância de sessão confirma primeiro pelo RPC `session.setPinned` (o log de eventos `session/pin` é a residência canônica) e espelha no armazenamento de settings; um RPC falho ou lento degrada para escrita direta.
- **Leitura de projeção respaldada por log** — `enableLogBacking` (Config do host, padrão desligado fail-closed) monta um leitor que dobra eventos `session/pin` ao vivo para o conjunto canônico e espelha `pinned`/`colors` no Config ao vivo. O schema, o fold puro (`foldPinEvents`) e a costura de append com portão prévio (`PinLogAppender`) vivem em `src/pin-log.ts`: o vocabulário de eventos em tempo de execução é o único sinal do portão, decidido ANTES do primeiro append (o append da linha alpha não consegue mais estampar `ignorable`, então a sonda do marcador desapareceu), então hosts que não podem transportar o evento com segurança — um vocabulário que não conhece o tipo falha fechado na leitura — nunca recebem um; o armazenamento Config ao vivo/localStorage segue como rota de compatibilidade e degradação.
- **Seam do cliente** — a metade navegador lê os brands `SessionId`/`WorkspaceId` de `@deepseek-ai/dsh-client-connection` (o pacote removido `dsh-client-runtime` não existe mais nos hosts atuais); os assentos do kit padrão do slot de cabeçalho são tipados como contrato estrutural local. Em hosts `0.1.2-rc.1` o slot de linha `sessions.row.action` não é declarado, então as linhas de sessão recorrem à sobreposição DOM e o registro do slot fica diferido.
- **Compilação** — o esbuild emite a metade ESM do host e a metade CJS do cliente envolvida na fábrica de boot web (`window.__ModuleLoader__.load({ id, factory })`); `react` é externalizado para o React do shell, e uma barreira de pureza falha o build se uma importação de valor `@deepseek-ai/*` vazar para o bundle do navegador.

**Pontos de extensão usados:** `settings` (host); `sessions`, `workspaces`, `configForms`, `connection`, `slots` (cliente); `locale` (cliente, opcional); `conversation.session.header.actions`, `sidebar.footer.action`, `shell.overlay`, e o slot de linha `sessions.row.action` quando declarado (hosts `0.1.2-rc.1` não o declaram — a sobreposição DOM cobre ali as linhas de sessão). **Efeitos visíveis ao modelo: nenhum** — plugin somente de UI: não adiciona eventos de sessão nem tokens.

## Quick start

```sh
# 1. instale o bundle no seu perfil
dsh plugin --profile web add "github:PerryLink/dsh-session-pin#main"

# ou do npm (versões publicadas)
dsh plugin --profile web add dsh-session-pin

# 2. reinicie e verifique a linha
dsh --profile web --dump-config | grep -A3 'id: session-pin'
```

> **Entry id do loader.** Em builds do harness cujo bundle `dsh-base` monta o serviço host integrado `@deepseek-ai/dsh-session-pin` (entry id `session-pin`), dê a este plugin um entry id distinto, p. ex. `id: session-pin-ui` na linha do patch do perfil — um id `session-pin` duplicado faz o boot falhar com "duplicate loader entry id".

## Install & uninstall

- **Canal git** (último `main`): `dsh plugin --profile web add "github:PerryLink/dsh-session-pin#main"` — `pnpm run build` emite a metade host (`lib/index.js`) e a metade navegador (`lib/client.js`).
- **Canal npm** (versões publicadas): `dsh plugin --profile web add dsh-session-pin`.
- **Canal tarball**: `pnpm pack` neste repo, depois `dsh plugin --profile web add ./dsh-session-pin-<version>.tgz`.
- **Desinstalar**: `dsh plugin --profile web remove dsh-session-pin` (ou remova a linha do patch do perfil — a linha É o namespace do formulário de settings, então removê-la também remove os valores armazenados do formulário).

## Configuration

Todas as opções são campos Schemastery `Config`. Cada campo da tabela é `.volatile()`, então pode ser editado ao vivo tanto pelo `cordis.yml` quanto pela página Plugins do perfil (uma edição aceita é confirmada no plugin em execução sem remontá-lo); as listas de fixados, os mapas de cor e o estado do organizador são o mesmo tipo de campo, e é isso que torna durável o armazenamento da metade navegador. `enableLogBacking` NÃO é volatile de propósito: nunca fez parte da superfície editável e nenhuma metade navegador o lê. O `cordis.patch.yml` monta o bundle com os valores padrão abaixo.

| Chave | Padrão | Significado |
|---|---|---|
| `maxPins` | `0` | Máximo de entidades fixadas por nível (sessões e espaços de trabalho têm orçamento próprio); `0` = ilimitado |
| `reorderOnLoad` | `true` | Reafirma os prefixos de fixados (o pin mais recente primeiro) assim que as listas ficam prontas |
| `pruneStale` | `true` | Remove pins e cores de entidades ausentes de uma lista pronta (excluídas/arquivadas) |
| `enableBoards` | `true` | Ativa os grupos de pins (boards) no painel lateral |
| `enableTags` | `true` | Ativa as tags de sessão/workspace e a barra de filtros do painel |
| `enableViews` | `true` | Ativa as vistas de filtro salvas |
| `enableHealth` | `true` | Ativa o resumo de saúde por sessão fixada (somente leitura, higienizado) |
| `enableGoto` | `true` | Ativa o comando `/goto <palavra>` do compositor |
| `enableLogBacking` | `false` | Dobra eventos `session/pin` em uma projeção respaldada pelo log e a espelha no cache de settings (fail-closed: o log é canônico quando ativado) |

## Tools & surfaces

| Superfície | Tipo | Notas |
|---|---|---|
| Controles de linha `[pin][cor]` | Slot de UI / sobreposição DOM | Controles ao passar o mouse em cada linha de sessão e espaço de trabalho |
| Alternador do cabeçalho da sessão | Slot de UI | O mesmo controle na linha de ações do cabeçalho, indexado por id de sessão |
| Rodapé da barra lateral + painel de fixados | Slot de UI / sobreposição | Lista espaços e sessões fixados, agrupados por board (recolhível) com gestão de board/tags por linha e pontos de cor |
| `/goto <palavra>` | command | Salto rápido do compositor por título/tag; a linha nunca chega ao modelo |
| Formulário de settings `session-pin` | serviço host | O próprio Config ao vivo do plugin, durável por perfil: pins, cores e estado do organizador |

## Permissions & data

- **Permissões**: o manifesto `dshWorkshop` declara `browser:local-storage`, `settings:read` e `settings:write`.
- **Dados**: pins, cores e estado do organizador vivem no formulário de settings `session-pin` do plugin (os campos volatile Config `pinned`/`workspacePinned`/`colors`/`workspaceColors`/`boards`/`tags`/`views`), degradando para um documento versionado de `localStorage` (documentos v1 migram) onde o proxy web não serve a entrada. Nada é enviado. Com `enableLogBacking`, o Config ao vivo se torna o cache idempotente da projeção `session/pin` respaldada por log.
- **Registro de sessão**: nenhum por padrão — este plugin não adiciona eventos de sessão nem tokens a nenhuma requisição do modelo. Com `enableLogBacking` ativo, o host dobra o evento `session/pin` de apenas-log (escrito pelo RPC `session.setPinned` do upstream) para a projeção canônica; o `PinLogAppender` aplica o portão prévio às próprias escritas, então hosts que não podem transportar o evento (`0.1.2-rc.1`) nunca recebem uma. Os efeitos visíveis ao modelo continuam nenhum.

## Security boundaries

- **Somente UI.** Sem efeitos visíveis ao modelo, sem rede, sem subprocessos; cada superfície degrada com elegância em linhas de base mais antigas.
- **Estado durável e limitado.** Pins e cores são podados com as entidades excluídas (`pruneStale`); `maxPins` limita a contagem de fixados por nível.
- **Saúde de somente leitura.** O resumo de saúde deriva contagens e direções da snapshot pública da sessão e não escreve nada de volta.

## Known limitations

- **Alcance da persistência** — a residência canônica respaldada por log é opcional (`enableLogBacking`, fail-closed por padrão desligado) e seu laço de leitura ao vivo exige builds que emitam o evento `session/pin` (o RPC `session.setPinned` do upstream); em linhas de base sem ele, pins e cores recorrem ao formulário de settings `session-pin` do plugin e depois ao `localStorage` do navegador. Em hosts cujo vocabulário de eventos não conhece o tipo, o portão prévio desativa por completo os appends ao log (a rota de leitura fail-closed rejeitaria tais logs), então a projeção degrada ali para o cache de settings.
- **Alcance da ordenação** — a posição fixada é estável somente na ordenação **Manual**; na ordenação **Updated** a promoção por atividade do núcleo volta a adiantar sessões ativas, e o `reorderOnLoad` reafirma os prefixos ao carregar.
- **Navegadores remotos** — os RPCs de settings são apenas loopback na linha de base; navegadores remotos recorrem ao `localStorage` local.
- **Fallback da insígnia de linha** — onde o slot de linha do upstream não está disponível, as linhas de sessão são casadas pelo texto do título; com títulos duplicados a insígnia aparece em cada linha correspondente e alterna a primeira correspondência (cosmético).
- **Dependência do DOM das linhas** — a sobreposição depende da estrutura `role="treeitem"` das linhas do núcleo e deve acompanhar as mudanças de UI do upstream.

## Roadmap

- Entrada «Fixar» no menu de contexto / menu da linha (precisa de um slot de menu em nível de linha no núcleo; o slot de insígnia de linha já está no upstream).
- ~~Residência canônica: um evento `session/pin` baseado em log + uma projeção `pin` + um RPC de escrita (upstream) — o namespace de settings então se aposenta e o plugin consome `useProjection('pin')`.~~ **Implementado (P0):** o plugin agora inclui o schema do evento `session/pin`, o fold puro da projeção (`foldPinEvents`), a costura de append com portão prévio (`PinLogAppender`) e um leitor de projeção no host (`enableLogBacking`) que dobra os eventos `session/pin` ao vivo de volta ao cache do Config ao vivo; o armazenamento Config ao vivo/localStorage segue como rota de compatibilidade e degradação, e o log é canônico quando ativado.
- Um seletor de cor completo em popover (cores personalizadas) uma vez que a residência canônica existir; o botão de ciclo atual cobre a paleta predefinida.

## Development

```sh
pnpm install                    # instalar dependências
pnpm run typecheck              # tsc --noEmit
pnpm test                       # testes unitários do vitest
pnpm run build                  # build de duas metades + barreira de pureza do cliente
node scripts/verify-live.mjs    # verificação ao vivo contra um `dsh web` (env DSH_CHECKOUT)
```

## Topics

`deepseek-harness`, `dsh`, `dsh-plugin`, `session-pin`, `pin`, `workspace`

## Contributors

- [@PerryLink](https://github.com/PerryLink) — criador e mantenedor: experiência de pin, persistência durável, ordenação de espaços de trabalho, cores por pin, o organizador de navegação e a documentação em cinco idiomas.

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

[Apache License 2.0](LICENSE) © 2026 contribuidores do dsh-session-pin

### Instalar a partir do mercado do DSH Desktop

Todos os plugins PerryLink podem ser explorados no mercado integrado do DSH Desktop: **Market → Sources → add source → colar** `https://perrylink-dsh-catalog.perrylink.workers.dev/catalog-source.json` **→ selecionar**. A instalação continua passando pela verificação de identidade npm do mercado e pela sua confirmação.
