<div align="center">

# 📌 dsh-session-pin
- **1024 商店渠道**：先 `npm i -g dsh1024`，再 `dsh1024 plugin --profile web add dsh-session-pin`（计入 [deepseek1024.com](https://deepseek1024.com) 安装排行）。

**把会话与工作区置顶到 DeepSeek Harness 侧边栏顶部，并为每个置顶配上行颜色。**

*双面（Host + 浏览器）插件：两级置顶、每个置顶的 8 色换色按钮，以及一个导航组织器——boards、标签、保存的视图、健康摘要与 `/goto`。*

> **官方仓库。** 本仓库是 dsh-session-pin 的唯一官方仓库，由 PerryLink 维护。其他账号下的同名仓库与本项目无关。

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

| 维度 | 状态 |
|---|---|
| Harness | DeepSeek Harness `0.1.1-rc.2`（client 包 `0.1.1-rc.2`） |
| Node | `>= 22`（开发环境下限） |
| 平台 | Web GUI（双面：Host + 浏览器） |
| 模型 | 任意（纯 UI——无模型流量、无会话事件） |
| `session/pin` 事件 | 前置预检门控：在事件词汇表不认识该类型且 append 已丢弃 `ignorable` 标记的宿主（`0.1.2-alpha.3`）上绝不写入；投影降级到 settings 缓存 0.1.2-alpha.3（2026-09-01 已适配）：会话信封保留 ignorable 字段但仅用于存量日志读取兼容——Session.append 仍无法盖章，门控行为不变。 |

## What you get

`dsh-session-pin` 把真正重要的会话留在侧边栏顶部，并给它们上色，让你一眼就能找到：

- **两级置顶** —— 可置顶整个工作区与单个会话；置顶的工作区移到工作区列表最前，置顶的会话移到其账户最前。
- **按置顶的行颜色** —— 每个图钉后的换色按钮循环 8 色预设调色板（Shift+单击清除）；着色的行获得左侧强调条加半透明底色。
- **四个置顶入口** —— 每行的悬停 `[图钉][换色]` 控件、会话头置顶开关、侧栏底部入口加已置顶面板，以及跨重启保留的浏览器级持久化。
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

- **Host 半**（`src/index.ts`）——注册持久化的 `session-pin` settings namespace（两组置顶 id 列表、两张颜色映射与组织器状态，加上 host 策略 `maxPins`/`reorderOnLoad`/`pruneStale`）；无会话事件、无模型流量。
- **浏览器半**（`src/client.ts`）——组装无框架依赖的 `PinStore`（settings 传输，降级为带版本信封的 `localStorage` 文档并跨标签页同步）、`PinController`（两级切换 / 换色 / 剪枝 / 重排状态机）与 UI：行覆盖层、可选行槽位注册、会话头开关、侧栏底部入口与已置顶面板。排序走 `ctx.workspaces`。
- **日志支撑的写通道**——在挂载了内置 `dsh-session-pin` 服务的构建上，每次会话切换先经 `session.setPinned` RPC 提交（`session/pin` 事件日志是规范驻留），再把提交镜像写入 settings store；RPC 失败或超时自动降级为 settings 直写。
- **日志支撑的投影读取**——`enableLogBacking`（host Config，fail-closed 默认关）挂载投影读取器，把实时 `session/pin` 事件折叠回规范置顶集，并把折叠后的 `pinned`/`colors` 镜像进 settings namespace。事件 schema、纯投影折叠（`foldPinEvents`）与前置预检门控追加缝（`PinLogAppender`）都在 `src/pin-log.ts`：宿主的已知事件词汇表与 `ignorable` append 标记在**首次写入之前**探测（结果按进程缓存），因此无法安全承载该事件的宿主——`0.1.2-alpha.3` 读路径对未知类型 fail-closed——一次写入都收不到；settings/localStorage store 仍是兼容与降级路径。
- **客户端 seam**——浏览器半从 `@deepseek-ai/dsh-client-connection` 读取 `SessionId`/`WorkspaceId` 品牌（被移除的 `dsh-client-runtime` 包在现行宿主上已不存在）；会话头槽位的标准套件席位以本地结构契约方式定型。在 `0.1.2-alpha.3` 宿主上 `sessions.row.action` 行槽位不存在，会话行回落到 DOM overlay，行槽位注册保持挂起不抛错。
- **构建**——esbuild 产出 Host ESM 半与包裹在 Web 引导工厂（`window.__ModuleLoader__.load({ id, factory })`）中的 client CJS 半；`react` 外置到外壳自身的 React，任何 `@deepseek-ai/*` 值导入渗入浏览器包都会使构建失败。

**使用的扩展点：** `settings`（Host）；`sessions`、`workspaces`、`settingsScope`、`connection`、`remote`、`slots`（client）；`locale`（client，可选）；`conversation.session.header.actions`、`sidebar.footer.action`、`shell.overlay`，以及上游声明时的 `sessions.row.action` 行槽位（`0.1.2-alpha.3` 宿主不声明该槽位——会话行由 DOM overlay 覆盖）。**模型可见影响：无**——纯 UI 插件：不新增会话事件，不给任何模型请求增加 token。

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
- **卸载**：`dsh plugin --profile web remove dsh-session-pin`（或从 profile patch 删掉该行；`settings.yaml` 中的 `session-pin` 段也可一并删除）。

## Configuration

所有可调项都是 Schemastery `Config` 字段（可从 cordis.yml 覆盖）。`cordis.patch.yml` 以下方默认值挂载 bundle。

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
| `session-pin` settings namespace | host 服务 | 置顶、颜色与组织器状态的浏览器级持久存储 |

## Permissions & data

- **权限**：`dshWorkshop` manifest 声明 `browser:local-storage`、`settings:read` 与 `settings:write`。
- **数据**：置顶、颜色与组织器状态按浏览器存于 `session-pin` settings namespace；在 Web 代理不提供该 namespace 的构建上，降级到带版本信封的 `localStorage` 文档（v1 文档自动迁移）。不上传任何内容。
- **会话日志**：默认无——本插件不新增会话事件，也不给任何模型请求增加 token。开启 `enableLogBacking` 后，host 把仅日志的 `session/pin` 事件（由上游 `session.setPinned` RPC 写入）折叠进规范置顶投影；`PinLogAppender` 对自身写入做前置预检门控，无法承载该事件的宿主（`0.1.2-alpha.3`）一次写入都收不到。模型可见影响仍为无。

## Security boundaries

- **纯 UI。** 无模型可见影响、无网络、无子进程；每个界面在旧基线上都能优雅降级。
- **持久且有界的状态。** 置顶与颜色随已删除实体自动清理（`pruneStale`）；`maxPins` 限制每个级别的置顶数量。
- **只读健康。** 健康摘要只从公开会话快照派生计数与方向，绝不回写。

## Known limitations

- **持久化范围** —— 在 Web 代理不提供 `session-pin` namespace 的构建上，置顶与颜色回退到浏览器本地的 `localStorage`；一旦上游暴露该 namespace，host 侧注册会自动成为持久层。在 `0.1.2-alpha.3` 宿主上，前置预检门控完全禁用日志追加（fail-closed 事件词汇表会拒收此类日志），投影在该宿主降级到 settings 缓存。
- **排序范围** —— 置顶位置仅在 **Manual** 排序下稳定；**Updated** 排序下核心的活动提升会重排活跃会话，`reorderOnLoad` 在加载时重申前缀。
- **远程浏览器** —— 基线上 settings RPC 仅限回环；远程浏览器回退到浏览器本地的 `localStorage`。
- **行徽标降级** —— 上游行槽位不可用时，会话行按标题文本匹配；标题重复时每个匹配行都显示徽标且只切换第一个匹配（外观性问题）。
- **行 DOM 依赖** —— 覆盖层依赖核心行的 `role="treeitem"` 结构，需跟随上游 UI 变更。

## Roadmap

- 右键 / 行菜单「置顶」入口（需要核心行级菜单槽位；行徽标槽位已在上游落地）。
- ~~规范驻留：日志支撑的 `session/pin` 事件 + `pin` 投影 + 写 RPC（上游）——届时 settings namespace 退役为持久层，插件改用 `useProjection('pin')`。~~ **已落地（P0）：** 插件现已内置 `session/pin` 事件 schema、纯投影折叠（`foldPinEvents`）、前置预检门控追加缝（`PinLogAppender`）与 host 投影读取器（`enableLogBacking`），把实时 `session/pin` 事件折叠回 settings 缓存；settings/localStorage 仍为兼容与降级路径，启用后日志为权威来源。
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

这是 [PerryLink](https://github.com/PerryLink) 维护的 [33 个 DeepSeek Harness 插件](https://github.com/PerryLink) 之一。如果它能帮到你，其他的也会：

| Plugin | One-liner |
|---|---|
| **[dsh-dsh-auto-review](https://github.com/PerryLink/dsh-dsh-auto-review)** | 审批链上的第二模型自动审查，默认失败关闭 | |
| **[dsh-dsh-background-agents](https://github.com/PerryLink/dsh-dsh-background-agents)** | 带 Web UI 侧栏、消息与中断的持久后台子代理 | |
| **[dsh-dsh-budget](https://github.com/PerryLink/dsh-dsh-budget)** | DeepSeek Harness 的成本治理：预算、碳排与延迟一屏呈现。 | |
| **[dsh-dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-dsh-checkpoint-rewind)** | Claude Code /rewind 等价：快照、会话 fork、一次性恢复 | |
| **[dsh-dsh-claude-move](https://github.com/PerryLink/dsh-dsh-claude-move)** | 把 Claude Code 会话、记忆、技能与 CLAUDE.md 迁入 DSH | |
| **[dsh-dsh-click](https://github.com/PerryLink/dsh-dsh-click)** | 跨平台原生桌面控制（DeepSeek Harness），Windows 优先。 | |
| **[dsh-dsh-composer-history](https://github.com/PerryLink/dsh-dsh-composer-history)** | Web 输入框的终端式历史：方向键、Ctrl+R 搜索 | |
| **[dsh-dsh-data-quality](https://github.com/PerryLink/dsh-dsh-data-quality)** | 数据集质量检查与引文核查（本插件可选消费的数字核查桥） | |
| **[dsh-dsh-defend](https://github.com/PerryLink/dsh-dsh-defend)** | DeepSeek Harness 的提示注入、越狱与密钥泄露防护。 | |
| **[dsh-dsh-doublecheck](https://github.com/PerryLink/dsh-dsh-doublecheck)** | 工程纪律守卫：需求质询、测试门禁、对手评审 | |
| **[dsh-dsh-draw](https://github.com/PerryLink/dsh-dsh-draw)** | DeepSeek Harness 的统一静态图像生成路由。 | |
| **[dsh-dsh-fast](https://github.com/PerryLink/dsh-dsh-fast)** | DeepSeek Harness 只读性能诊断。 | |
| **[dsh-dsh-fund-research](https://github.com/PerryLink/dsh-dsh-fund-research)** | 面向中国公募基金的确定性研究报告 | |
| **[dsh-dsh-github](https://github.com/PerryLink/dsh-dsh-github)** | 面向 DSH 的 GitHub PR/issues 集成，每次写入经审批门控 | |
| **[dsh-dsh-industry-research](https://github.com/PerryLink/dsh-dsh-industry-research)** | 行业研究编排，经本插件的 `ctx.researchReport.assemble` 封存交付物 | |
| **[dsh-dsh-library](https://github.com/PerryLink/dsh-dsh-library)** | DeepSeek Harness 的本地文档知识库。 | |
| **[dsh-dsh-local-ai](https://github.com/PerryLink/dsh-dsh-local-ai)** | DeepSeek Harness 的本地模型（Ollama）接入。 | |
| **[dsh-dsh-lsp-actions](https://github.com/PerryLink/dsh-dsh-lsp-actions)** | 通过语言服务器的 LSP 诊断、格式化、补全、代码操作与重命名 | |
| **[dsh-dsh-mask](https://github.com/PerryLink/dsh-dsh-mask)** | PII 脱敏中间件：模型边界匿名化、展示层还原 | |
| **[dsh-dsh-mcp-panel](https://github.com/PerryLink/dsh-dsh-mcp-panel)** | 只读 MCP 运行时面板：/mcp 命令 + 带状态、工具与错误的 Settings 标签页 | |
| **[dsh-dsh-memento](https://github.com/PerryLink/dsh-dsh-memento)** | 审批门控的跨会话记忆：ctx.memory 接缝 + SQLite + 记忆工具 | |
| **[dsh-dsh-observe](https://github.com/PerryLink/dsh-dsh-observe)** | DeepSeek Harness 的 OpenTelemetry 与 Langfuse 可观测导出器。 | |
| **[dsh-dsh-output-styles](https://github.com/PerryLink/dsh-dsh-output-styles)** | Claude Code outputStyles 等价的运行时风格切换 | |
| **[dsh-dsh-permission-rules](https://github.com/PerryLink/dsh-dsh-permission-rules)** | Claude Code 风格声明式 allow/deny/ask 权限规则，带审计 | |
| **[dsh-dsh-plugin-guide](https://github.com/PerryLink/dsh-dsh-plugin-guide)** | 作为按需代理技能的插件开发知识库 | |
| **[dsh-dsh-research-report](https://github.com/PerryLink/dsh-dsh-research-report)** | 可验证研究报告引擎：内容寻址证据账本与封存版本 | |
| **[dsh-dsh-score](https://github.com/PerryLink/dsh-dsh-score)** | DeepSeek Harness 插件的多维质量评分。 | |
| **[dsh-dsh-session-sync](https://github.com/PerryLink/dsh-dsh-session-sync)** | DeepSeek Harness 的跨设备会话同步——会话存储的专用 git 镜像。 | |
| **[dsh-dsh-skill-pack-security](https://github.com/PerryLink/dsh-dsh-skill-pack-security)** | 安全审计技能包：密钥扫描、依赖与供应链审查 | |
| **[dsh-dsh-talk](https://github.com/PerryLink/dsh-dsh-talk)** | DeepSeek Harness 的语音优先会话闭环：对它说，听它答。 | |
| **[dsh-dsh-test-drive](https://github.com/PerryLink/dsh-dsh-test-drive)** | DeepSeek Harness 插件的隔离试装冒烟。 | |
| **[dsh-dsh-translate](https://github.com/PerryLink/dsh-dsh-translate)** | DeepSeek Harness 的厂商参数翻译与确定性 JSON 修复。 | |

## License

[Apache License 2.0](LICENSE) © 2026 dsh-session-pin contributors
