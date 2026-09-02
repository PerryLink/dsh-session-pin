<div align="center">

# 📌 dsh-session-pin
- **Canal 1024 store**: `npm i -g dsh1024` uma vez, depois `dsh1024 plugin --profile web add dsh-session-pin` (conta para o ranking de instalações do [deepseek1024.com](https://deepseek1024.com)).

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
| Eventos `session/pin` | Com portão prévio: nunca escritos em hosts cujo vocabulário de eventos não conhece o tipo e cujo append deixou cair o marcador `ignorable` (`0.1.2-alpha.5`); a projeção degrada para o cache de settings 0.1.2-alpha.5 (adaptado em 2026-09-02): o envelope de sessão mantém seu campo ignorable apenas para compatibilidade de leitura de logs armazenados - o Session.append ainda não consegue estampá-lo, então o comportamento da porta não muda. |

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
- **Leitura de projeção respaldada por log** — `enableLogBacking` (Config do host, padrão desligado fail-closed) monta um leitor que dobra eventos `session/pin` ao vivo para o conjunto canônico e espelha `pinned`/`colors` no namespace de settings. O schema, o fold puro (`foldPinEvents`) e a costura de append com portão prévio (`PinLogAppender`) vivem em `src/pin-log.ts`: o vocabulário de eventos do host mais seu marcador `ignorable` são sondados ANTES da primeira escrita (resultado em cache por processo), então hosts que não podem transportar o evento com segurança — `0.1.2-alpha.5` rejeita tipos desconhecidos na leitura — nunca recebem um; o armazenamento settings/localStorage segue como rota de compatibilidade e degradação.
- **Seam do cliente** — a metade navegador lê os brands `SessionId`/`WorkspaceId` de `@deepseek-ai/dsh-client-connection` (o pacote removido `dsh-client-runtime` não existe mais nos hosts atuais); os assentos do kit padrão do slot de cabeçalho são tipados como contrato estrutural local. Em hosts `0.1.2-alpha.5` o slot de linha `sessions.row.action` não é declarado, então as linhas de sessão recorrem à sobreposição DOM e o registro do slot fica diferido.
- **Compilação** — o esbuild emite a metade ESM do host e a metade CJS do cliente envolvida na fábrica de boot web (`window.__ModuleLoader__.load({ id, factory })`); `react` é externalizado para o React do shell, e uma barreira de pureza falha o build se uma importação de valor `@deepseek-ai/*` vazar para o bundle do navegador.

**Pontos de extensão usados:** `settings` (host); `sessions`, `workspaces`, `settingsScope`, `connection`, `remote`, `slots` (cliente); `locale` (cliente, opcional); `conversation.session.header.actions`, `sidebar.footer.action`, `shell.overlay`, e o slot de linha `sessions.row.action` quando declarado (hosts `0.1.2-alpha.5` não o declaram — a sobreposição DOM cobre ali as linhas de sessão). **Efeitos visíveis ao modelo: nenhum** — plugin somente de UI: não adiciona eventos de sessão nem tokens.

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
| `enableLogBacking` | `false` | Dobra eventos `session/pin` em uma projeção respaldada pelo log e a espelha no cache de settings (fail-closed: o log é canônico quando ativado) |

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
- **Registro de sessão**: nenhum por padrão — este plugin não adiciona eventos de sessão nem tokens a nenhuma requisição do modelo. Com `enableLogBacking` ativo, o host dobra o evento `session/pin` de apenas-log (escrito pelo RPC `session.setPinned` do upstream) para a projeção canônica; o `PinLogAppender` aplica o portão prévio às próprias escritas, então hosts que não podem transportar o evento (`0.1.2-alpha.5`) nunca recebem uma. Os efeitos visíveis ao modelo continuam nenhum.

## Security boundaries

- **Somente UI.** Sem efeitos visíveis ao modelo, sem rede, sem subprocessos; cada superfície degrada com elegância em linhas de base mais antigas.
- **Estado durável e limitado.** Pins e cores são podados com as entidades excluídas (`pruneStale`); `maxPins` limita a contagem de fixados por nível.
- **Saúde de somente leitura.** O resumo de saúde deriva contagens e direções da snapshot pública da sessão e não escreve nada de volta.

## Known limitations

- **Alcance da persistência** — onde o proxy web não serve o namespace `session-pin`, pins e cores recorrem ao `localStorage` do navegador; o registro do host vira o armazenamento durável automaticamente assim que upstream expõe o namespace. Em hosts `0.1.2-alpha.5` o portão prévio desativa por completo os appends ao log (o vocabulário de eventos fail-closed rejeitaria tais logs), então a projeção degrada ali para o cache de settings.
- **Alcance da ordenação** — a posição fixada é estável somente na ordenação **Manual**; na ordenação **Updated** a promoção por atividade do núcleo volta a adiantar sessões ativas, e o `reorderOnLoad` reafirma os prefixos ao carregar.
- **Navegadores remotos** — os RPCs de settings são apenas loopback na linha de base; navegadores remotos recorrem ao `localStorage` local.
- **Fallback da insígnia de linha** — onde o slot de linha do upstream não está disponível, as linhas de sessão são casadas pelo texto do título; com títulos duplicados a insígnia aparece em cada linha correspondente e alterna a primeira correspondência (cosmético).
- **Dependência do DOM das linhas** — a sobreposição depende da estrutura `role="treeitem"` das linhas do núcleo e deve acompanhar as mudanças de UI do upstream.

## Roadmap

- Entrada «Fixar» no menu de contexto / menu da linha (precisa de um slot de menu em nível de linha no núcleo; o slot de insígnia de linha já está no upstream).
- ~~Residência canônica: um evento `session/pin` baseado em log + uma projeção `pin` + um RPC de escrita (upstream) — o namespace de settings então se aposenta e o plugin consome `useProjection('pin')`.~~ **Implementado (P0):** o plugin agora inclui o schema do evento `session/pin`, o fold puro da projeção (`foldPinEvents`), a costura de append com portão prévio (`PinLogAppender`) e um leitor de projeção no host (`enableLogBacking`) que dobra os eventos `session/pin` ao vivo de volta ao cache de settings; o armazenamento settings/localStorage segue como rota de compatibilidade e degradação, e o log é canônico quando ativado.
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

Este projeto é um dos [33 plugins de DeepSeek Harness](https://github.com/PerryLink) mantidos por [PerryLink](https://github.com/PerryLink). Se este ajuda você, os outros provavelmente também:

| Plugin | One-liner |
|---|---|
| **[dsh-dsh-auto-review](https://github.com/PerryLink/dsh-dsh-auto-review)** | Auto-revisão de segundo modelo na cadeia de aprovação, com falha fechada por padrão | |
| **[dsh-dsh-background-agents](https://github.com/PerryLink/dsh-dsh-background-agents)** | Agentes filhos em segundo plano duráveis com barra lateral de UI web, mensagens e interrupção | |
| **[dsh-dsh-budget](https://github.com/PerryLink/dsh-dsh-budget)** | Governança de custos para DeepSeek Harness: orçamentos, carbono e latência em um painel. | |
| **[dsh-dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-dsh-checkpoint-rewind)** | Equivalente ao /rewind do Claude Code: instantâneos, bifurcações de sessão, restauração de uso único | |
| **[dsh-dsh-claude-move](https://github.com/PerryLink/dsh-dsh-claude-move)** | Migre sessões, memória, habilidades e CLAUDE.md do Claude Code para o DSH | |
| **[dsh-dsh-click](https://github.com/PerryLink/dsh-dsh-click)** | Controle de desktop nativo multiplataforma para DeepSeek Harness — Windows primeiro. | |
| **[dsh-dsh-composer-history](https://github.com/PerryLink/dsh-dsh-composer-history)** | Histórico de entrada estilo terminal para o compositor web: setas, busca Ctrl+R | |
| **[dsh-dsh-data-quality](https://github.com/PerryLink/dsh-dsh-data-quality)** | Verificações de qualidade de datasets e verificação de citações (a ponte numérica opcional consumida aqui) | |
| **[dsh-dsh-defend](https://github.com/PerryLink/dsh-dsh-defend)** | Defesa contra injeção de prompt, jailbreak e vazamento de segredos para DeepSeek Harness. | |
| **[dsh-dsh-doublecheck](https://github.com/PerryLink/dsh-dsh-doublecheck)** | Guardião de disciplina de engenharia: sabatina de requisitos, portões de teste, revisão adversária | |
| **[dsh-dsh-draw](https://github.com/PerryLink/dsh-dsh-draw)** | Roteamento unificado de geração de imagens estáticas para DeepSeek Harness. | |
| **[dsh-dsh-fast](https://github.com/PerryLink/dsh-dsh-fast)** | Diagnóstico de desempenho só de leitura para DeepSeek Harness. | |
| **[dsh-dsh-fund-research](https://github.com/PerryLink/dsh-dsh-fund-research)** | Relatórios de pesquisa deterministas para fundos mútuos públicos chineses | |
| **[dsh-dsh-github](https://github.com/PerryLink/dsh-dsh-github)** | Integração de PR/issues do GitHub para o DSH, cada escrita controlada por aprovação | |
| **[dsh-dsh-industry-research](https://github.com/PerryLink/dsh-dsh-industry-research)** | Orquestração de pesquisa setorial que sela as suas entregas através do `ctx.researchReport.assemble` deste plugin | |
| **[dsh-dsh-library](https://github.com/PerryLink/dsh-dsh-library)** | Base de conhecimento documental local para DeepSeek Harness. | |
| **[dsh-dsh-local-ai](https://github.com/PerryLink/dsh-dsh-local-ai)** | Integração de modelos locais (Ollama) para DeepSeek Harness. | |
| **[dsh-dsh-lsp-actions](https://github.com/PerryLink/dsh-dsh-lsp-actions)** | Diagnósticos, formatação, autocompletar, ações de código e renomeação LSP sobre servidores de linguagem | |
| **[dsh-dsh-mask](https://github.com/PerryLink/dsh-dsh-mask)** | Middleware de mascaramento de PII: anonimiza no limite do modelo, restaura na camada de exibição | |
| **[dsh-dsh-mcp-panel](https://github.com/PerryLink/dsh-dsh-mcp-panel)** | Painel de tempo de execução MCP somente leitura: comando /mcp + aba Settings com status, ferramentas e erros | |
| **[dsh-dsh-memento](https://github.com/PerryLink/dsh-dsh-memento)** | Memória entre sessões controlada por aprovação: costura ctx.memory + SQLite + ferramenta de memória | |
| **[dsh-dsh-observe](https://github.com/PerryLink/dsh-dsh-observe)** | Exportador de observabilidade OpenTelemetry e Langfuse para DeepSeek Harness. | |
| **[dsh-dsh-output-styles](https://github.com/PerryLink/dsh-dsh-output-styles)** | Troca de estilo em tempo de execução equivalente ao outputStyles do Claude Code | |
| **[dsh-dsh-permission-rules](https://github.com/PerryLink/dsh-dsh-permission-rules)** | Regras de permissão declarativas allow/deny/ask estilo Claude Code com auditoria | |
| **[dsh-dsh-plugin-guide](https://github.com/PerryLink/dsh-dsh-plugin-guide)** | Base de conhecimento de desenvolvimento de plugins como habilidade de agente sob demanda | |
| **[dsh-dsh-research-report](https://github.com/PerryLink/dsh-dsh-research-report)** | Motor de relatórios de pesquisa verificáveis com evidência endereçada por conteúdo | |
| **[dsh-dsh-score](https://github.com/PerryLink/dsh-dsh-score)** | Pontuação de qualidade multidimensional para plugins de DeepSeek Harness. | |
| **[dsh-dsh-session-sync](https://github.com/PerryLink/dsh-dsh-session-sync)** | Sincronização de sessões entre dispositivos para DeepSeek Harness — um espelho git dedicado do seu armazenamento de sessões. | |
| **[dsh-dsh-skill-pack-security](https://github.com/PerryLink/dsh-dsh-skill-pack-security)** | Pacote de habilidades de auditoria de segurança: varredura de segredos, revisão de dependências e cadeia de suprimentos | |
| **[dsh-dsh-talk](https://github.com/PerryLink/dsh-dsh-talk)** | Loop de sessão com voz para DeepSeek Harness: fale e ouça a resposta. | |
| **[dsh-dsh-test-drive](https://github.com/PerryLink/dsh-dsh-test-drive)** | Test drives isolados de instalação e smoke para plugins de DeepSeek Harness. | |
| **[dsh-dsh-translate](https://github.com/PerryLink/dsh-dsh-translate)** | Tradução de parâmetros entre fornecedores e reparo determinístico de JSON para DeepSeek Harness. | |

## License

[Apache License 2.0](LICENSE) © 2026 contribuidores do dsh-session-pin
