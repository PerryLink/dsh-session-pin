<div align="center">

# 📌 dsh-session-pin
- **1024 商店渠道**：先 `npm i -g dsh1024`，再 `dsh1024 plugin --profile web add dsh-session-pin`（计入 [deepseek1024.com](https://deepseek1024.com) 安装排行）。

**把会话与工作区置顶到 DeepSeek Harness 侧边栏顶部，并为每个置顶配上行颜色。**

*双面（Host + 浏览器）插件：两级置顶、每个置顶的 8 色换色按钮，以及一个导航组织器——boards、标签、保存的视图、健康摘要与 `/goto`。*

> **官方仓库。** 本仓库是 dsh-session-pin 的唯一官方仓库，由 PerryLink 维护。其他账号下的同名仓库与本项目无关。

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Gitee](https://img.shields.io/badge/Gitee-mirror-c71d23?logo=gitee)](https://gitee.com/perrylink/dsh-session-pin)
[![DSH plugin](https://img.shields.io/badge/dsh--plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![dsh-doctor](https://raw.githubusercontent.com/PerryLink/dsh-plugin-doctor/main/badges/PerryLink__dsh-session-pin.svg)](https://github.com/PerryLink/dsh-plugin-doctor#verified-徽章)
[![DSH Market](https://raw.githubusercontent.com/2BingLing/dsh-market/master/assets/readme/badge-listed-zh.svg)](https://dsh.market/)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-brightgreen.svg)](#)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-session-pin/ci.yml?branch=main&label=CI)](https://github.com/PerryLink/dsh-session-pin/actions)
[![Version](https://img.shields.io/github/v/tag/PerryLink/dsh-session-pin?label=version)](https://github.com/PerryLink/dsh-session-pin/releases)
[![npm version](https://img.shields.io/npm/v/dsh-session-pin)](https://www.npmjs.com/package/dsh-session-pin)
[![npm downloads](https://img.shields.io/npm/dm/dsh-session-pin)](https://www.npmjs.com/package/dsh-session-pin)
[![dshfind](https://dshfind.com/api/badge/PerryLink/dsh-session-pin?metric=downloads&lang=zh)](https://dshfind.com/zh/plugins/PerryLink/dsh-session-pin?ref=badge)

[English](README.md) · [简体中文](README-zh.md) · [Español](README-es.md) · [Português](README-pt.md) · [हिन्दी](README-hi.md)

</div>

---

## Compatibility

| 维度 | 状态 |
|---|---|
| Harness | DeepSeek Harness `dsh-v0.1.7-rc.1`（GitHub tag，2026-09-22 已核验：双尺子 typecheck + 单元/组合测试套件 + 静态接缝检查；浏览器人工轮待维护者）。npm 依赖钉号 `0.1.7-rc.1`，peers `>=0.1.2-rc.1 <0.2.0 || >=0.1.5-alpha.1 <0.2.0 || >=0.1.6-0 <0.2.0 || >=0.1.7-0 <0.2.0`。 |
| Node | `>= 22`（开发环境下限） |
| 平台 | Web GUI（双面：Host + 浏览器） |
| 模型 | 任意（纯 UI——无模型流量、无会话事件） |
| `session/pin` 事件 | 前置预检门控：仅当宿主运行时事件词汇表认识该类型时才写入（alpha 线 append 已不能盖 `ignorable` 章，词汇表是唯一门控信号——2026-09-18 已适配）；否则投影降级到 settings 缓存，并在首次写入前发出一次告警。 |

## What you get

`dsh-session-pin` 把真正重要的会话留在侧边栏顶部，并给它们上色，让你一眼就能找到：

- **两级置顶** —— 可置顶整个工作区与单个会话；置顶的工作区移到工作区列表最前，置顶的会话移到其账户最前。
- **按置顶的行颜色** —— 每个图钉后的换色按钮循环 8 色预设调色板（Shift+单击清除）；着色的行获得左侧强调条加半透明底色。
- **四个置顶入口** —— 每行的悬停 `[图钉][换色]` 控件、会话头置顶开关、侧栏底部入口加已置顶面板，以及跨重启保留的浏览器级持久化。
- **点击即打开** —— 点击侧边栏或已置顶面板中的置顶行，会在当前窗口打开该会话（与 `/goto` 走同一条接缝）；两者都经宿主的会话 retain 通道导航。
- **零核心改动** —— 独立插件，适用于原版 DSH Web GUI；每个新界面在旧基线上都能优雅降级。

```text
┌─ Workspaces ────────────────────────────┐
│ 🎨 Workbench            ███             │  ← 已置顶工作区，红色强调
│   📌 Implement login flow         3h    │  ← 已置顶会话，青色强调
│     Fix the auth bug              1h    │  ← 悬停显示灰色图钉 + 换色按钮
│   Refactor the DB layer           2d    │
└─────────────────────────────────────────┘
```

## Navigation organizer

四个浏览器本地能力在置顶之上组织多会话工作。全部状态都走同一个 `session-pin` store（仅本浏览器；绝不上传），且每个能力都有对应的 Config 开关。

- **Boards** —— 置顶可归入命名分组；分组芯片行可创建、重命名、删除分组并拖拽重排（顺序按浏览器持久化），已置顶面板按可折叠的分组标题展示各组内的置顶项。
- **标签与视图** —— 实体最多携带 8 个标签（每个 ≤24 字符），可从面板行的「管理」按钮逐行设置（同时可把该置顶项归入分组）；过滤栏按文本与标签匹配，任意过滤状态可保存为命名视图（最多 20 个）一键切换。
- **健康摘要** —— 每个已置顶会话行追加一行只读、脱敏的健康信息（`N 条消息 · 你|ai · 相对时间`），源自公开会话快照——只显示计数与方向，绝不显示内容。
- **`/goto <关键词>`** —— 作曲器中以 `/goto` 开头的一行加回车跳转：唯一命中直接打开，多命中列出选择，无命中给出说明。命令行绝不发送给模型。

## How it works

- **Host 半**（`src/index.ts`）——把 `session-pin` 设置表单声明为插件自身的实时 Config：两组置顶 id 列表、两张颜色映射、组织器状态，以及 host 策略（`maxPins`/`reorderOnLoad`/`pruneStale` 加五个功能开关）全部是 `.volatile()` 字段。在 `0.1.7` 设置契约下，表单命名空间就是其 profile 条目的局部 id，因此 bundle patch 的 `id: session-pin` 行即表单名，Plugins 页面可编辑，被接受的编辑会热应用到运行中的插件；无会话事件、无模型流量。
- **浏览器半**（`src/client.ts`）——组装无框架依赖的 `PinStore`（经 `ctx.configForms.get(entryId)` 读取 host 半的实时 Config 表单，降级为带版本信封的 `localStorage` 文档并跨标签页同步）、`PinController`（两级切换 / 换色 / 剪枝 / 重排状态机）与 UI：行覆盖层、可选行槽位注册、会话头开关、侧栏底部入口与已置顶面板。排序走 `ctx.workspaces`。
- **日志支撑的写通道**——在挂载了内置 `dsh-session-pin` 服务的构建上，每次会话切换先经 `session.setPinned` RPC 提交（`session/pin` 事件日志是规范驻留），再把提交镜像写入 settings store；RPC 失败或超时自动降级为 settings 直写。
- **日志支撑的投影读取**——`enableLogBacking`（host Config，fail-closed 默认关）挂载投影读取器，把实时 `session/pin` 事件折叠回规范置顶集，并把折叠后的 `pinned`/`colors` 镜像进实时 Config。事件 schema、纯投影折叠（`foldPinEvents`）与前置预检门控追加缝（`PinLogAppender`）都在 `src/pin-log.ts`：宿主的**运行时事件词汇表**是唯一门控信号，在**首次追加之前**判定（alpha 线 append 已不能盖 `ignorable` 章，旧的标记探测已删除），因此无法安全承载该事件的宿主——读路径对未知类型 fail-closed——一次写入都收不到；实时 Config/localStorage store 仍是兼容与降级路径。
- **客户端 seam**——浏览器半从 `@deepseek-ai/dsh-client-connection` 读取 `SessionId`/`WorkspaceId` 品牌（被移除的 `dsh-client-runtime` 包在现行宿主上已不存在）；会话头槽位的标准套件席位以本地结构契约方式定型。在 `0.1.2-rc.1` 宿主上 `sessions.row.action` 行槽位不存在，会话行回落到 DOM overlay，行槽位注册保持挂起不抛错。
- **构建**——esbuild 产出 Host ESM 半与包裹在 Web 引导工厂（`window.__ModuleLoader__.load({ id, factory })`）中的 client CJS 半；`react` 外置到外壳自身的 React，任何 `@deepseek-ai/*` 值导入渗入浏览器包都会使构建失败。

**使用的扩展点：** `settings`（Host）；`sessions`、`workspaces`、`configForms`、`connection`、`slots`（client）；`locale`（client，可选）；`conversation.session.header.actions`、`sidebar.footer.action`、`shell.overlay`，以及上游声明时的 `sessions.row.action` 行槽位（`0.1.2-rc.1` 宿主不声明该槽位——会话行由 DOM overlay 覆盖）。**模型可见影响：无**——纯 UI 插件：不新增会话事件，不给任何模型请求增加 token。

## Quick start

```sh
# 1. 把 bundle 安装进 profile
dsh plugin --profile web add "github:PerryLink/dsh-session-pin#main"

# 或从 npm（发布版本）
dsh plugin --profile web add dsh-session-pin

# 2. 重启并校验该行
dsh --profile web --dump-config | grep -A3 'id: session-pin'
```

> **Loader entry id。** 在 `dsh-base` bundle 挂载了内置 host 服务 `@deepseek-ai/dsh-session-pin`（entry id 为 `session-pin`）的 harness 构建上，请在 profile patch 行里给本插件一个不同的 entry id，例如 `id: session-pin-ui`——重复的 `session-pin` id 会导致启动因 "duplicate loader entry id" 失败。

## Install & uninstall

- **git 通道**（最新 `main`）：`dsh plugin --profile web add "github:PerryLink/dsh-session-pin#main"` —— `pnpm run build` 产出 host 半（`lib/index.js`）与浏览器半（`lib/client.js`）。
- **npm 通道**（发布版本）：`dsh plugin --profile web add dsh-session-pin`。
- **tarball 通道**：在本仓库 `pnpm pack`，再 `dsh plugin --profile web add ./dsh-session-pin-<version>.tgz`。
- **卸载**：`dsh plugin --profile web remove dsh-session-pin`（或从 profile patch 删掉该行——该行就是设置表单的命名空间，删行同时移除已存的表单值）。

## Configuration

所有可调项都是 Schemastery `Config` 字段。下列字段全部带 `.volatile()`，因此既可从 `cordis.yml` 配置，也可在 profile 的 Plugins 页面实时编辑（被接受的编辑会就地提交进运行中的插件，无需重挂）；置顶列表、颜色映射与组织器状态是同类字段，这正是浏览器半存储得以持久化的原因。`enableLogBacking` 刻意**不**加 volatile：它从来不属于可编辑面，也没有任何浏览器半读取它。`cordis.patch.yml` 以下方默认值挂载 bundle。

| 键 | 默认值 | 含义 |
|---|---|---|
| `maxPins` | `0` | 每个级别的置顶实体上限（会话与工作区各有独立额度）；`0` = 不限 |
| `reorderOnLoad` | `true` | 列表就绪后重申置顶前缀（新置顶在前） |
| `pruneStale` | `true` | 清除已就绪列表中缺席（已删除/已归档）实体的置顶与颜色 |
| `enableBoards` | `true` | 在侧边栏面板启用置顶分组（boards） |
| `enableTags` | `true` | 启用会话/工作区标签与面板过滤栏 |
| `enableViews` | `true` | 启用保存的过滤视图 |
| `enableHealth` | `true` | 启用每个已置顶会话的健康摘要（只读、脱敏） |
| `enableGoto` | `true` | 启用 `/goto <关键词>` 作曲器命令 |
| `enableLogBacking` | `false` | 将 `session/pin` 事件折叠为日志支撑投影并镜像到 settings 缓存（fail-closed：启用后会话日志为权威来源） |

## Tools & surfaces

| 表面 | 类型 | 说明 |
|---|---|---|
| `[图钉][换色]` 行控件 | UI 槽位 / DOM 覆盖层 | 每个会话与工作区行上的悬停控件 |
| 会话头开关 | UI 槽位 | 会话头操作行里的同一置顶控件，以会话 id 为键 |
| 侧栏底部 + 已置顶面板 | UI 槽位 / 覆盖层 | 列出已置顶工作区与会话，按分组折叠展示，逐行可归组/设标签，并显示颜色圆点 |
| `/goto <关键词>` | command | 按标题/标签快速跳转；命令行绝不发送给模型 |
| `session-pin` 设置表单 | host 服务 | 插件自身的实时 Config，按 profile 持久：置顶、颜色与组织器状态 |

## Permissions & data

- **权限**：`dshWorkshop` manifest 声明 `browser:local-storage`、`settings:read` 与 `settings:write`。
- **数据**：置顶、颜色与组织器状态存于插件的 `session-pin` 设置表单（即 `pinned`/`workspacePinned`/`colors`/`workspaceColors`/`boards`/`tags`/`views` 这些 volatile Config 字段）；在 Web 代理不提供该条目的构建上，降级到带版本信封的 `localStorage` 文档（v1 文档自动迁移）。不上传任何内容。开启 `enableLogBacking` 后，实时 Config 成为日志支撑的 `session/pin` 投影的幂等缓存。
- **会话日志**：默认无——本插件不新增会话事件，也不给任何模型请求增加 token。开启 `enableLogBacking` 后，host 把仅日志的 `session/pin` 事件（由上游 `session.setPinned` RPC 写入）折叠进规范置顶投影；`PinLogAppender` 对自身写入做前置预检门控，无法承载该事件的宿主（`0.1.2-rc.1`）一次写入都收不到。模型可见影响仍为无。

## Security boundaries

- **纯 UI。** 无模型可见影响、无网络、无子进程；每个界面在旧基线上都能优雅降级。
- **持久且有界的状态。** 置顶与颜色随已删除实体自动清理（`pruneStale`）；`maxPins` 限制每个级别的置顶数量。
- **只读健康。** 健康摘要只从公开会话快照派生计数与方向，绝不回写。

## Known limitations

- **持久化范围** —— 日志支撑的规范驻留是可选开启（`enableLogBacking`，fail-closed 默认关），其实时读取回路需要会发出 `session/pin` 事件的构建（上游 `session.setPinned` RPC）；没有它的基线上，置顶与颜色回退到插件的 `session-pin` 设置表单，再回退到浏览器本地的 `localStorage`。在事件词汇表不认识该类型的宿主上，前置预检门控完全禁用日志追加（fail-closed 读路径会拒收此类日志），投影在该宿主降级到 settings 缓存。
- **排序范围** —— 置顶位置仅在 **Manual** 排序下稳定；**Updated** 排序下核心的活动提升会重排活跃会话，`reorderOnLoad` 在加载时重申前缀。
- **远程浏览器** —— 基线上 settings RPC 仅限回环；远程浏览器回退到浏览器本地的 `localStorage`。
- **行徽标降级** —— 上游行槽位不可用时，会话行按标题文本匹配；标题重复时每个匹配行都显示徽标且只切换第一个匹配（外观性问题）。
- **行 DOM 依赖** —— 覆盖层依赖核心行的 `role="treeitem"` 结构，需跟随上游 UI 变更。

## Roadmap

- 右键 / 行菜单「置顶」入口（需要核心行级菜单槽位；行徽标槽位已在上游落地）。
- ~~规范驻留：日志支撑的 `session/pin` 事件 + `pin` 投影 + 写 RPC（上游）——届时 settings namespace 退役为持久层，插件改用 `useProjection('pin')`。~~ **已落地（P0）：** 插件现已内置 `session/pin` 事件 schema、纯投影折叠（`foldPinEvents`）、前置预检门控追加缝（`PinLogAppender`）与 host 投影读取器（`enableLogBacking`），把实时 `session/pin` 事件折叠回实时 Config 缓存；实时 Config/localStorage 仍为兼容与降级路径，启用后日志为权威来源。
- 规范驻留落地后的完整取色器弹层（自定义颜色）；当前的循环换色按钮已覆盖预设调色板。

## Development

```sh
pnpm install                    # 安装依赖
pnpm run typecheck              # tsc --noEmit
pnpm test                       # vitest 单元测试
pnpm run build                  # 双半构建 + client 包纯净门禁
node scripts/verify-live.mjs    # 针对运行中的 `dsh web` 实测（DSH_CHECKOUT 环境变量）
```

## Topics

`deepseek-harness`, `dsh`, `dsh-plugin`, `session-pin`, `pin`, `workspace`

## Contributors

- [@PerryLink](https://github.com/PerryLink) —— 创建者与维护者：置顶交互、持久化、工作区排序、按置顶行颜色、导航组织器与五语文档。

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

[Apache License 2.0](LICENSE) © 2026 dsh-session-pin contributors

### 从 DSH Desktop 市场安装

所有 PerryLink 插件均可在 DSH Desktop 内置市场中浏览：**市场 → 来源 → 添加来源 → 粘贴** `https://perrylink-dsh-catalog.perrylink.workers.dev/catalog-source.json` **→ 选中**。安装仍需通过市场的 npm 身份校验与你的确认。
