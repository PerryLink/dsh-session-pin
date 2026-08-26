<div align="center">

# 📌 dsh-session-pin

**把会话与工作区置顶到 DeepSeek Harness 侧边栏顶部，并为每个置顶配上行颜色。**

*双面（Host + 浏览器）插件：两级置顶、每个置顶的 8 色换色按钮，以及一个导航组织器——boards、标签、保存的视图、健康摘要与 `/goto`。*

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
- **构建**——esbuild 产出 Host ESM 半与包裹在 Web 引导工厂（`window.__ModuleLoader__.load({ id, factory })`）中的 client CJS 半；`react` 外置到外壳自身的 React，任何 `@deepseek-ai/*` 值导入渗入浏览器包都会使构建失败。

**使用的扩展点：** `settings`（Host）；`sessions`、`workspaces`、`settingsScope`、`connection`、`remote`、`slots`（client）；`locale`（client，可选）；`conversation.session.header.actions`、`sidebar.footer.action`、`shell.overlay`，以及上游声明时的 `sessions.row.action` 行槽位。**模型可见影响：无**——纯 UI 插件：不新增会话事件，不给任何模型请求增加 token。

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
- **会话日志**：无——本插件不新增会话事件，也不给任何模型请求增加 token。

## Security boundaries

- **纯 UI。** 无模型可见影响、无网络、无子进程；每个界面在旧基线上都能优雅降级。
- **持久且有界的状态。** 置顶与颜色随已删除实体自动清理（`pruneStale`）；`maxPins` 限制每个级别的置顶数量。
- **只读健康。** 健康摘要只从公开会话快照派生计数与方向，绝不回写。

## Known limitations

- **持久化范围** —— 在 Web 代理不提供 `session-pin` namespace 的构建上，置顶与颜色回退到浏览器本地的 `localStorage`；一旦上游暴露该 namespace，host 侧注册会自动成为持久层。
- **排序范围** —— 置顶位置仅在 **Manual** 排序下稳定；**Updated** 排序下核心的活动提升会重排活跃会话，`reorderOnLoad` 在加载时重申前缀。
- **远程浏览器** —— 基线上 settings RPC 仅限回环；远程浏览器回退到浏览器本地的 `localStorage`。
- **行徽标降级** —— 上游行槽位不可用时，会话行按标题文本匹配；标题重复时每个匹配行都显示徽标且只切换第一个匹配（外观性问题）。
- **行 DOM 依赖** —— 覆盖层依赖核心行的 `role="treeitem"` 结构，需跟随上游 UI 变更。

## Roadmap

- 右键 / 行菜单「置顶」入口（需要核心行级菜单槽位；行徽标槽位已在上游落地）。
- ~~规范驻留：日志支撑的 `session/pin` 事件 + `pin` 投影 + 写 RPC（上游）——届时 settings namespace 退役为持久层，插件改用 `useProjection('pin')`。~~ **已落地（P0）：** 插件现已内置 `session/pin` 事件 schema、纯投影折叠（`foldPinEvents`）、ignorable 门控追加缝（`PinLogAppender`）与 host 投影读取器（`enableLogBacking`），把实时 `session/pin` 事件折叠回 settings 缓存；settings/localStorage 仍为兼容与降级路径，启用后日志为权威来源。
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

本项目是 [PerryLink](https://github.com/PerryLink) 维护的 [DeepSeek Harness 插件](https://github.com/PerryLink)之一。如果你觉得这个插件有用，其余的很可能同样有用：

| 插件 | 一句话说明 |
|---|---|
| [dsh-mask](https://github.com/PerryLink/dsh-mask) | PII 脱敏中间件：模型边界匿名化、展示层还原 |
| [dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel) | 只读 MCP 运行时面板：/mcp 命令 + 设置页，状态/工具/错误一览 |
| [dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck) | 工程纪律守门：需求审讯、测试证据门、对抗评审 |
| [dsh-background-agents](https://github.com/PerryLink/dsh-background-agents) | 持久化后台子代理：Web 侧边栏进度、随时留言与打断 |
| [dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions) | 基于语言服务器的诊断/格式化/补全/代码动作/重命名 |
| [dsh-output-styles](https://github.com/PerryLink/dsh-output-styles) | 对标 Claude Code outputStyles 的运行时风格切换 |
| [dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind) | 对标 Claude Code /rewind：快照、会话 fork、一键回退 |
| [dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules) | Claude Code 风格声明式 allow/deny/ask 权限规则，带审计 |
| [dsh-auto-review](https://github.com/PerryLink/dsh-auto-review) | 审批链上的第二模型自动审查，默认 fail-closed |
| [dsh-memento](https://github.com/PerryLink/dsh-memento) | 带审批门的跨会话记忆：ctx.memory + SQLite + memory 工具 |
| [dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security) | 安全审计技能包：密钥扫描、依赖与供应链审查 |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | 在 Web 侧边栏置顶会话，持久排序 |
| [dsh-composer-history](https://github.com/PerryLink/dsh-composer-history) | Web 作曲器终端式输入历史：方向键、Ctrl+R 搜索 |
| [dsh-github](https://github.com/PerryLink/dsh-github) | DSH 的 GitHub PR/issue 集成，所有写操作经审批门 |
| [dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide) | 插件开发知识库，随 bundle 安装的按需 agent 技能 |
| [dsh-claude-move](https://github.com/PerryLink/dsh-claude-move) | 把 Claude Code 会话、记忆、技能和 CLAUDE.md 迁入 DSH |

## License

[Apache License 2.0](LICENSE) © 2026 dsh-session-pin contributors
