# 📌 dsh-session-pin

<p align="center">
  <a href="README.md">English</a> ·
  <a href="README.zh-CN.md">中文</a> ·
  <a href="README.es.md">Español</a> ·
  <a href="README.pt.md">Português</a> ·
  <a href="README.hi.md">हिन्दी</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-Apache%202.0-blue.svg" alt="Licença: Apache-2.0">
  <img src="https://img.shields.io/npm/v/dsh-session-pin" alt="versão npm">
  <img src="https://img.shields.io/npm/dm/dsh-session-pin" alt="downloads npm">
  <img src="https://github.com/PerryLink/dsh-session-pin/actions/workflows/ci.yml/badge.svg" alt="CI">
  <a href="https://github.com/topics/dsh-plugin"><img src="https://img.shields.io/badge/topic-dsh--plugin-2ea44f.svg" alt="Topic: dsh-plugin"></a>
  <img src="https://img.shields.io/badge/DSH-0.1.0--rc.6-3884ff.svg" alt="Linha de base DSH: 0.1.0-rc.6">
  <img src="https://img.shields.io/github/stars/PerryLink/dsh-session-pin?style=flat" alt="Estrelas no GitHub">
</p>

> **Fixe as conversas que importam — e dê cores a elas para encontrá-las de relance.** Um plugin de duas faces (host + navegador) para o [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) com dois níveis de pin (espaços de trabalho e sessões), um botão de cor após cada pin que tinge a linha, e quatro superfícies de pin: um par [pin][cor] ao passar o mouse em cada linha, um alternador de pin no cabeçalho da sessão, uma ação no rodapé da barra lateral com um painel de fixados, e fixação durável por navegador que mantém pins e cores entre reinícios.

## Por que fixar?

As listas de sessões ordenam por recência: a conversa em que você confia a semana toda afunda lentamente para o fundo, e cada novo chat a enterra ainda mais. Arrastar linhas no modo de ordenação Manual funciona, mas ninguém descobre — e chats fixados que ainda são reordenados por atividade são exatamente o que os usuários de outros agentes de programação reclamam. O `dsh-session-pin` oferece a experiência de um clique:

```
┌─ Workspaces ────────────────────────────┐
│ 🎨 Workbench            ███             │  ← espaço fixado, tingido de vermelho
│   📌 Implement login flow         3h    │  ← sessão fixada, tingida de azul-petróleo
│     Fix the auth bug              1h    │  ← passar o mouse mostra alfinete cinza + botão de cor
│   Refactor the DB layer           2d    │
└─────────────────────────────────────────┘
```

## ✨ Recursos

- 🧷 **Controles de linha** — um alfinete cinza surge suavemente à esquerda do título da sessão ao passar o mouse; linhas fixadas mantêm um alfinete âmbar sólido. Onde a build declara o slot por linha do upstream (`sessions.row.action`), o par [pin][cor] renderiza por meio dele com o id de sessão autoritativo — e a sobreposição de DOM pula totalmente as linhas de sessão, então uma linha nunca pode mostrar dois conjuntos de pin. Em linhas de base sem o slot, a sobreposição de DOM cobre as linhas de sessão por título.
- 📂 **Pins de espaço de trabalho** — as linhas de cabeçalho de espaço de trabalho recebem o mesmo par [pin][cor] (o slot do upstream não renderiza ali, então a sobreposição as cobre, casando pelo nome de espaço de trabalho, único por imposição do host). Fixar um espaço de trabalho o move para a frente da lista de espaços de trabalho via o RPC público `workspace.insertBefore`.
- 🎨 **Cores de linha** — o botão de cor após cada pin percorre uma paleta de 8 cores a cada clique (Shift+clique limpa). A linha colorida ganha uma barra de destaque à esquerda mais um tom translúcido — sessões e espaços de trabalho de forma independente, para identificar uma região de relance. As cores persistem com os pins e são podadas com as entidades excluídas.
- 📌 **Alternador de cabeçalho** — o mesmo controle de pin fica na linha de ações do cabeçalho da sessão (`conversation.session.header.actions`), indexado pelo id de sessão resolvido pelo framework: títulos duplicados e sessões em branco são fixados corretamente aqui.
- 🗂 **Painel de fixados** — uma ação no rodapé da barra lateral abre um painel flutuante listando os espaços de trabalho e as sessões fixados (pin mais recente primeiro) com o ponto de cor de cada linha; clicar em um pula para ele. Escape ou um clique fora o fecha.
- 📐 **Ordenação no topo** — fixar move a sessão para a frente da conta do espaço de trabalho via o RPC público `workspace.insertSessionBefore`, e um espaço de trabalho fixado move-se para a frente da lista de espaços de trabalho; o `reorderOnLoad` reafirma ambos os prefixos de fixados depois que as listas carregam (idempotente, então nunca conflita com a reordenação do próprio núcleo). Na ordenação **Manual** do núcleo a posição permanece.
- 💾 **Fixação persistente** — a metade host registra o namespace de settings durável `session-pin` (declarado exposto na rede via `settings.register({ expose: true })` em builds que o suportam); a metade navegador lê pelos RPCs padrão `settings.*`. Em builds cujo proxy web não serve namespaces de plugins, a metade navegador recorre a um documento versionado de `localStorage` (documentos v1 migram), com sincronização entre abas por eventos `storage`.
- 📡 **Canal de escrita respaldado por log** — em builds que montam o serviço integrado `dsh-session-pin`, cada alternância de sessão confirma primeiro pelo RPC `session.setPinned` (o log de eventos `session/pin` é a residência canônica) e espelha o commit no armazenamento de settings, mantendo lista ordenada, painel e reordenação do espaço de trabalho consistentes. Um RPC falho ou lento degrada para escrita direta em settings; a próxima geração de conexão o reabilita. O alternador do cabeçalho da sessão lê a projeção `pin` quando o host a serve — commits entre dispositivos convergem por ela. Pins de espaço de trabalho e cores são estado local do plugin e sempre gravam no armazenamento.
- 🔢 **Limite opcional** — `config.maxPins` limita a contagem de fixados por nível (padrão `0` = ilimitado); excedê-la mostra uma dica de limite inline na insígnia.
- 🧹 **Estado autorreparável** — o `pruneStale` remove pins e cores cujos espaços de trabalho/sessões foram excluídos ou arquivados assim que as listas ficam prontas.
- 🌍 **UI localizada** — os textos de insígnia, botão de cor, cabeçalho, rodapé e painel são enviados em 中文 e inglês pelo serviço de locale; composições sem ele mantêm o fallback em inglês. Readmes: English · 中文 · Español · Português · हिन्दी.
- 🧩 **Zero mudanças no núcleo** — um plugin independente para a Web GUI padrão do DSH; cada nova superfície degrada com elegância em linhas de base mais antigas.

## 🚀 Início rápido

1. **Instalar** — adicione o plugin ao `cordis.yml` do seu perfil:

```yaml
plugins:
  'dsh-session-pin':
    path: /path/to/dsh-session-pin
    config:
      maxPins: 5        # optional; 0 = unlimited (default)
      reorderOnLoad: true   # optional; re-assert pinned order after load (default)
      pruneStale: true      # optional; drop pins of deleted sessions (default)
```

> **Entry id do loader.** O loader deduplica entry ids em toda a árvore raiz
> de includes. Em builds do harness cujo bundle `dsh-base` monta o serviço
> host integrado `@deepseek-ai/dsh-session-pin` (entry id `session-pin` — o
> estado de pin respaldado por log e o RPC `session.setPinned`), dê a ESTE
> plugin um entry id distinto, p. ex. `id: session-pin-ui`, na linha do patch
> do perfil. Um id `session-pin` duplicado faz todo o boot falhar com
> "duplicate loader entry id". O `name` cordis interno do plugin e seu
> namespace de settings continuam sendo `session-pin` — apenas o entry id do
> perfil deve diferir.

2. **Compilar** (o app web se recusa a iniciar sem o bundle do cliente):

```sh
pnpm install
pnpm run build      # lib/index.js + lib/client.js
```

3. **Reinicie** o `dsh web` e passe o mouse sobre qualquer linha na barra lateral — a insígnia de pin (e o botão de cor) aparece à esquerda do título. Clique para fixar; clique no botão de cor para percorrer as cores; Shift+clique para limpar a cor; alterne novamente pelo cabeçalho da sessão; abra a lista de fixados pelo rodapé da barra lateral.

**Desinstalar** — remova a linha do plugin do `cordis.yml` e reinicie. A seção `session-pin` também pode ser removida do `settings.yaml`; nada mais é gravado.

## ⚙️ Configuração

| Chave | Tipo | Padrão | Significado |
|---|---|---|---|
| `maxPins` | inteiro | `0` | Máximo de entidades fixadas por nível (sessões e espaços de trabalho têm orçamento próprio); `0` = ilimitado. Desafixar sempre funciona. |
| `reorderOnLoad` | booleano | `true` | Reafirma os prefixos de fixados (pin mais recente primeiro) assim que as listas de sessões/espaços de trabalho ficam prontas e em mudanças do espaço de trabalho. |
| `pruneStale` | booleano | `true` | Remove pins e cores de entidades ausentes de uma lista pronta (excluídas/arquivadas). |
| `enableBoards` | boolean | `true` | Ativa os grupos de pins (boards) no painel lateral. |
| `enableTags` | boolean | `true` | Ativa as tags de sessão/workspace e a barra de filtros do painel. |
| `enableViews` | boolean | `true` | Ativa as vistas de filtro salvas. |
| `enableHealth` | boolean | `true` | Ativa o resumo de saúde por sessão fixada (somente leitura, higienizado). |
| `enableGoto` | boolean | `true` | Ativa o comando `/goto <palavra>` do compositor. |

## 🧭 Organizador de navegação

Sobre a fixação: **boards** (pins em grupos nomeados; o painel mostra chips que filtram por grupo), **tags e vistas salvas** (até 8 tags por entidade; a barra filtra por texto e tag, e qualquer filtro é salvo como vista com um clique), **resumo de saúde** (cada linha de sessão fixada mostra uma linha higienizada e somente leitura — nº de mensagens, direção da última, tempo relativo — derivada da snapshot pública da sessão; apenas contagens e direções, nunca conteúdo) e **`/goto <palavra>`** (uma linha do compositor começando com `/goto` + Enter pula: correspondência única abre, várias listam, nenhuma explica; a linha de comando nunca chega ao modelo). Todo o estado fica local no navegador.
## 🧠 Como funciona

- **Metade host** (`src/index.ts`) — registra o namespace de settings `session-pin` (`{ pinned, workspacePinned, colors, workspaceColors, maxPins, reorderOnLoad, pruneStale }`), com a política aplicada na camada base de composição. Sem eventos de sessão, sem tráfego de modelo.
- **Metade navegador** (`src/client.ts`) — monta um `PinStore` sem framework (transporte de settings, degradando para um documento versionado de `localStorage` com sincronização entre abas), um `PinController` (máquina de estados de alternar em dois níveis / ciclo de cor / podar / reordenar) e a UI: a sobreposição de linhas (linhas de espaço de trabalho sempre; linhas de sessão apenas enquanto o slot de linha não está declarado), o registro opcional do slot de linha, o alternador de cabeçalho, a ação do rodapé da barra lateral e o painel de sobreposição. A ordenação passa por `ctx.workspaces`; o tom da linha é CSS puro (`:has()` indexado pela classe `data-color` do botão de cor).
- **Compilação** — o esbuild emite a metade ESM do host e a metade CJS do cliente envolvida na fábrica de boot web (`window.__ModuleLoader__.load({ id, factory })`); o `react` é externalizado para a palavra-semente da tabela de módulos para que o bundle renderize com o React do próprio shell. Uma barreira de pureza falha a compilação se qualquer importação de valor `@deepseek-ai/*` vazar para o bundle do navegador.

**Pontos de extensão usados:** `settings` (host); `sessions`, `workspaces`, `settingsScope`, `connection`, `remote`, `slots` (cliente); `locale` (cliente, opcional); `conversation.session.header.actions`, `sidebar.footer.action`, `shell.overlay`, e o slot de linha do upstream `sessions.row.action` quando declarado. **Efeitos visíveis ao modelo: nenhum** — este é um plugin somente de UI: não adiciona eventos de sessão nem tokens a nenhuma requisição do modelo.

## 📦 Compatibilidade

| Camada | Linha de base |
|---|---|
| DeepSeek Harness | geração npm `@deepseek-ai/dsh@0.1.0-rc.6` (pacotes de cliente `0.1.0-rc.6`); builds mais novas ativam o slot de linha, os settings expostos por wire e a projeção `session/pin` automaticamente |
| Peer do Cordis | `@deepseek-ai/cordis: ^4.0.1` |
| Node (desenvolvimento) | ≥ 22 |

## 🧪 Desenvolvimento

```sh
pnpm install
pnpm run typecheck  # tsc --noEmit
pnpm run test       # vitest unit tests (pin-core, store, controller, overlay, host registration)
pnpm run build      # dual-half build + client-bundle purity check
node scripts/verify-live.mjs   # live check against a running `dsh web` (DSH_CHECKOUT env)
```

## 🗺️ Roteiro

- Entrada «Fixar» no menu de contexto / menu da linha (precisa de um slot de menu em nível de linha no núcleo; o slot de insígnia de linha já está no upstream).
- Residência canônica: um evento `session/pin` baseado em log + uma projeção `pin` + um RPC de escrita (upstream) — o namespace de settings então se aposenta como armazenamento durável e o plugin consome `useProjection('pin')`.
- Um seletor de cor completo em popover (cores personalizadas) uma vez que a residência canônica existir; o botão de ciclo atual cobre a paleta predefinida.

## ⚠️ Limitações conhecidas

- **Alcance da persistência** — em builds cujo proxy web não serve namespaces de settings de plugins, a metade navegador guarda os pins e cores em um documento versionado de `localStorage` (local ao navegador) até o upstream expor o namespace (declarado via `settings.register({ expose: true })` em builds mais novas). O registro do lado do host já está no lugar e se torna o armazenamento durável automaticamente.
- **Alcance da ordenação** — a posição fixada é estável apenas na ordenação **Manual**; na ordenação **Updated** a promoção por atividade do núcleo volta a adiantar sessões ativas, e o `reorderOnLoad` reafirma os prefixos ao carregar e em mudanças do espaço de trabalho. As visualizações Ungrouped e de lista plana não têm conta no lado do host, então a posição das sessões não é persistida nelas (insígnias, cores e estado do pin ainda funcionam). A ordenação dos espaços de trabalho persiste pela ordem de exibição do registro.
- **Navegadores remotos** — os RPCs de settings são apenas loopback na linha de base; navegadores remotos recorrem ao `localStorage` local ao navegador.
- **Fallback da insígnia de linha** — onde o slot de linha do upstream não está disponível, as linhas de sessão são emparelhadas pelo texto do título; com títulos duplicados a insígnia aparece em cada linha correspondente e alterna a primeira correspondência (cosmético). O alternador de cabeçalho é sempre indexado por id e não é afetado. Em builds COM o slot, as linhas de sessão renderizam apenas pelo slot — a duplicação do fallback é impossível.
- **Emparelhamento de linhas de espaço de trabalho** — os controles de espaço de trabalho são casados pelo nome (único por imposição do host); renomear acompanha automaticamente. O balde Ungrouped e as linhas de resultados de busca não exibem controles de propósito.
- **Dependência do DOM das linhas** — a sobreposição depende da estrutura `role="treeitem"` / `aria-selected` / `aria-expanded` das linhas do núcleo e deve acompanhar as mudanças de UI do upstream. O tom da linha precisa de CSS `:has()` (Chrome 105+, Firefox 121+, Safari 15.4+); navegadores mais antigos ainda veem o ponto de cor, só sem o tom.

## 🌐 Comunidade

- [Discord do DeepSeek Harness](https://discord.gg/Ycq5dCaS4) · [discussões oficiais](https://github.com/deepseek-ai/deepseek-harness/discussions)
- Descubra mais plugins no [topic `dsh-plugin`](https://github.com/topics/dsh-plugin).

## 👥 Contribuidores

Obrigado a todos que ajudaram a moldar este plugin:

- [**PerryLink**](https://github.com/PerryLink) — criador e mantenedor: experiência de pin, persistência durável, ordenação de espaços de trabalho, cores por pin, documentação em cinco idiomas e engenharia comunitária (v0.1.0 → v0.3.0).

_Contribuições são bem-vindas — abra um [issue](https://github.com/PerryLink/dsh-session-pin/issues) ou inicie uma [discussão](https://github.com/PerryLink/dsh-session-pin/discussions) para participar._

## 📜 Licença

Apache License 2.0 — veja [LICENSE](LICENSE). Copyright © 2026 contribuidores do dsh-session-pin.
