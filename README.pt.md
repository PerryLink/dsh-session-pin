<div align="center">

# 📌 dsh-session-pin

**Fixe sessões e espaços de trabalho no topo da barra lateral do DeepSeek Harness com cores por pin.**

*Um plugin de duas faces (host + navegador): dois níveis de pin, um botão de 8 cores por pin e um organizador de navegação — boards, tags, vistas salvas, resumos de saúde e `/goto`.*

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

| Superfície | Status |
|---|---|
| Harness | DeepSeek Harness `0.1.1-rc.2` (pacotes de cliente `0.1.1-rc.2`) |
| Node | `>= 22` (piso de desenvolvimento) |
| Plataformas | Web GUI (duas faces: host + navegador) |
| Modelo | Qualquer (somente UI — sem tráfego de modelo, sem eventos de sessão) |

## What you get

O `dsh-session-pin` mantém no topo da barra lateral as conversas que importam e as colore para encontrá-las de relance:

- **Dois níveis de pin** — fixe espaços de trabalho inteiros e sessões individuais; um espaço fixado vai para a frente da lista de espaços e uma sessão fixada para a frente da sua conta.
- **Cores de linha por pin** — o botão de cor após cada pin percorre uma paleta de 8 cores (Shift+clique limpa); a linha ganha uma barra de destaque à esquerda e um tom translúcido.
- **Quatro superfícies de pin** — um par `[pin][cor]` ao passar o mouse em cada linha, um alternador no cabeçalho da sessão, uma ação no rodapé da barra lateral com um painel de fixados, e fixação durável por navegador que mantém pins e cores entre reinícios.
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

- **Metade host** (`src/index.ts`) — registra o namespace de settings durável `session-pin` (as duas listas de ids fixados, os dois mapas de cor e o estado do organizador, mais a política do host `maxPins`/`reorderOnLoad`/`pruneStale`); sem eventos de sessão, sem tráfego de modelo.
- **Metade navegador** (`src/client.ts`) — monta um `PinStore` sem framework (transporte de settings, degradando para um documento versionado de `localStorage` com sincronização entre abas), um `PinController` (máquina de estados de alternar / ciclo de cor / podar / reordenar) e a UI: a sobreposição de linhas, o registro opcional do slot, o alternador de cabeçalho, a ação do rodapé e o painel de fixados. A ordenação passa por `ctx.workspaces`.
- **Canal de escrita respaldado por log** — em builds que montam o serviço integrado `dsh-session-pin`, cada alternância de sessão confirma primeiro pelo RPC `session.setPinned` (o log de eventos `session/pin` é a residência canônica) e espelha no armazenamento de settings; um RPC falho ou lento degrada para escrita direta.
- **Compilação** — o esbuild emite a metade ESM do host e a metade CJS do cliente envolvida na fábrica de boot web (`window.__ModuleLoader__.load({ id, factory })`); `react` é externalizado para o React do shell, e uma barreira de pureza falha o build se uma importação de valor `@deepseek-ai/*` vazar para o bundle do navegador.

**Pontos de extensão usados:** `settings` (host); `sessions`, `workspaces`, `settingsScope`, `connection`, `remote`, `slots` (cliente); `locale` (cliente, opcional); `conversation.session.header.actions`, `sidebar.footer.action`, `shell.overlay`, e o slot de linha `sessions.row.action` quando declarado. **Efeitos visíveis ao modelo: nenhum** — plugin somente de UI: não adiciona eventos de sessão nem tokens.

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
- **Desinstalar**: `dsh plugin --profile web remove dsh-session-pin` (ou remova a linha do patch do perfil; a seção `session-pin` de `settings.yaml` também pode ser removida).

## Configuration

Todas as opções são campos Schemastery `Config` (modificáveis a partir do cordis.yml). O `cordis.patch.yml` monta o bundle com os valores padrão abaixo.

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

## Tools & surfaces

| Superfície | Tipo | Notas |
|---|---|---|
| Controles de linha `[pin][cor]` | Slot de UI / sobreposição DOM | Controles ao passar o mouse em cada linha de sessão e espaço de trabalho |
| Alternador do cabeçalho da sessão | Slot de UI | O mesmo controle na linha de ações do cabeçalho, indexado por id de sessão |
| Rodapé da barra lateral + painel de fixados | Slot de UI / sobreposição | Lista espaços e sessões fixados, agrupados por board (recolhível) com gestão de board/tags por linha e pontos de cor |
| `/goto <palavra>` | command | Salto rápido do compositor por título/tag; a linha nunca chega ao modelo |
| Namespace de settings `session-pin` | serviço host | Armazenamento durável por navegador de pins, cores e estado do organizador |

## Permissions & data

- **Permissões**: o manifesto `dshWorkshop` declara `browser:local-storage`, `settings:read` e `settings:write`.
- **Dados**: pins, cores e estado do organizador vivem por navegador no namespace de settings `session-pin`, degradando para um documento versionado de `localStorage` (documentos v1 migram) onde o proxy web não serve o namespace. Nada é enviado.
- **Registro de sessão**: nenhum — este plugin não adiciona eventos de sessão nem tokens a nenhuma requisição do modelo.

## Security boundaries

- **Somente UI.** Sem efeitos visíveis ao modelo, sem rede, sem subprocessos; cada superfície degrada com elegância em linhas de base mais antigas.
- **Estado durável e limitado.** Pins e cores são podados com as entidades excluídas (`pruneStale`); `maxPins` limita a contagem de fixados por nível.
- **Saúde de somente leitura.** O resumo de saúde deriva contagens e direções da snapshot pública da sessão e não escreve nada de volta.

## Known limitations

- **Alcance da persistência** — onde o proxy web não serve o namespace `session-pin`, pins e cores recorrem ao `localStorage` do navegador; o registro do host vira o armazenamento durável automaticamente assim que upstream expõe o namespace.
- **Alcance da ordenação** — a posição fixada é estável somente na ordenação **Manual**; na ordenação **Updated** a promoção por atividade do núcleo volta a adiantar sessões ativas, e o `reorderOnLoad` reafirma os prefixos ao carregar.
- **Navegadores remotos** — os RPCs de settings são apenas loopback na linha de base; navegadores remotos recorrem ao `localStorage` local.
- **Fallback da insígnia de linha** — onde o slot de linha do upstream não está disponível, as linhas de sessão são casadas pelo texto do título; com títulos duplicados a insígnia aparece em cada linha correspondente e alterna a primeira correspondência (cosmético).
- **Dependência do DOM das linhas** — a sobreposição depende da estrutura `role="treeitem"` das linhas do núcleo e deve acompanhar as mudanças de UI do upstream.

## Roadmap

- Entrada «Fixar» no menu de contexto / menu da linha (precisa de um slot de menu em nível de linha no núcleo; o slot de insígnia de linha já está no upstream).
- Residência canônica: um evento `session/pin` baseado em log + uma projeção `pin` + um RPC de escrita (upstream) — o namespace de settings então se aposenta e o plugin consome `useProjection('pin')`.
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

Este projeto é um dos [plugins do DeepSeek Harness](https://github.com/PerryLink) mantidos por [PerryLink](https://github.com/PerryLink). Se este ajudar você, os outros provavelmente também ajudarão:

| Plugin | Em uma linha |
|---|---|
| [dsh-mask](https://github.com/PerryLink/dsh-mask) | Middleware de mascaramento de PII: anonimiza no limite do modelo, restaura na camada de exibição |
| [dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel) | Painel MCP somente leitura: comando /mcp + aba de configurações com status, ferramentas e erros |
| [dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck) | Guarda de disciplina de engenharia: interrogatório de requisitos, portões de teste, revisão adversária |
| [dsh-background-agents](https://github.com/PerryLink/dsh-background-agents) | Agentes filhos em segundo plano com barra lateral web, mensagens e interrupção |
| [dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions) | Diagnóstico, formatação, autocompletar, ações de código e renomear via LSP |
| [dsh-output-styles](https://github.com/PerryLink/dsh-output-styles) | Troca de estilo em runtime equivalente ao outputStyles do Claude Code |
| [dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind) | Equivalente ao /rewind do Claude Code: snapshots, forks de sessão, restauração em um clique |
| [dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules) | Regras de permissão declarativas allow/deny/ask estilo Claude Code, com auditoria |
| [dsh-auto-review](https://github.com/PerryLink/dsh-auto-review) | Revisão automática de segundo modelo na cadeia de aprovação, fail-closed por padrão |
| [dsh-memento](https://github.com/PerryLink/dsh-memento) | Memória entre sessões com aprovação: seam ctx.memory + SQLite + ferramenta memory |
| [dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security) | Pacote de skills de auditoria de segurança: varredura de segredos, revisão de dependências e cadeia de suprimentos |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | Fixa sessões na barra lateral web com ordenação durável |
| [dsh-composer-history](https://github.com/PerryLink/dsh-composer-history) | Histórico de entrada estilo terminal para o compositor web: setas, busca Ctrl+R |
| [dsh-github](https://github.com/PerryLink/dsh-github) | Integração de PR/issues do GitHub para DSH, toda escrita com aprovação |
| [dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide) | Base de conhecimento de desenvolvimento de plugins como skill de agente sob demanda |
| [dsh-claude-move](https://github.com/PerryLink/dsh-claude-move) | Migra sessões, memória, skills e CLAUDE.md do Claude Code para DSH |

## License

[Apache License 2.0](LICENSE) © 2026 contribuidores do dsh-session-pin
