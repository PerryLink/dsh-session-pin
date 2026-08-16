# 📌 dsh-session-pin

<p align="center">
  <a href="README.md">English</a> ·
  <a href="README.zh-CN.md">中文</a> ·
  <a href="README.es.md">Español</a> ·
  <a href="README.pt.md">Português</a> ·
  <a href="README.hi.md">हिन्दी</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-Apache%202.0-blue.svg" alt="License: Apache-2.0">
  <img src="https://img.shields.io/npm/v/dsh-session-pin" alt="npm 版本">
  <img src="https://img.shields.io/npm/dm/dsh-session-pin" alt="npm 下载量">
  <img src="https://github.com/PerryLink/dsh-session-pin/actions/workflows/ci.yml/badge.svg" alt="CI">
  <a href="https://github.com/topics/dsh-plugin"><img src="https://img.shields.io/badge/topic-dsh--plugin-2ea44f.svg" alt="Topic: dsh-plugin"></a>
  <img src="https://img.shields.io/badge/DSH-0.1.0--rc.6-3884ff.svg" alt="DSH 基线: 0.1.0-rc.6">
  <img src="https://img.shields.io/github/stars/PerryLink/dsh-session-pin?style=flat" alt="GitHub stars">
</p>

> **置顶真正重要的会话——并给它们上色，让你一眼就能找到。** 面向 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的双面（Host + 浏览器）插件，支持两级置顶（工作区与会话）、图钉后的换色按钮（给行染上强调色），并保留四个置顶入口：行悬停 [图钉][换色] 控件、会话头置顶开关、侧栏底部入口加已置顶面板，以及跨重启保留的浏览器级持久化（置顶与颜色）。

## 为什么需要置顶？

会话列表按最近活跃排序：你整个星期都依赖的那个会话会慢慢沉底，每开一个新聊天就把它埋得更深。在 Manual 排序下拖拽行也能实现，但几乎没人发现它——而置顶会话仍会随活跃重新排序，正是其他编码助手用户抱怨的痛点。`dsh-session-pin` 提供了一键式体验，再加行颜色，让重要区域一眼可辨：

```
┌─ Workspaces ────────────────────────────┐
│ 🎨 Workbench            ███             │  ← 已置顶工作区，红色强调
│   📌 Implement login flow         3h    │  ← 已置顶会话，青色强调
│     Fix the auth bug              1h    │  ← 悬停显示灰色图钉 + 换色按钮
│   Refactor the DB layer           2d    │
└─────────────────────────────────────────┘
```

## ✨ 功能特性

- 🧷 **行控件** — 悬停会话行时，标题左侧淡入灰色图钉；已置顶会话保持琥珀色实心图钉。构建声明了上游行级槽位（`sessions.row.action`）时，[图钉][换色] 控件通过该槽位以权威会话 id 渲染，DOM 覆盖层完全跳过会话行——一行永远不可能出现两套图钉。没有该槽位的基线上，DOM 覆盖层按标题匹配降级渲染会话行。
- 📂 **工作区置顶** — 工作区标题行获得同样的 [图钉][换色] 控件（上游槽位不渲染在工作区行上，由覆盖层按 Host 强制唯一的工作区名匹配）。置顶工作区会通过公开的 `workspace.insertBefore` RPC 把该工作区移到工作区列表最前。
- 🎨 **行颜色** — 图钉后的换色按钮单击循环 8 色预设调色板（Shift+单击清除颜色）。着色的行获得左侧强调条加半透明底色——会话行与工作区行独立生效，一眼识别特定区域。颜色随置顶一起持久化，并随实体删除自动清理。
- 📌 **会话头开关** — 会话头操作行（`conversation.session.header.actions`）内提供同一个置顶控件，以框架解析的会话 id 为键：标题重复、空白会话在这里都能正确置顶。
- 🗂 **已置顶面板** — 侧栏底部入口打开浮动面板，按置顶时间倒序列出已置顶的工作区与会话，并显示各自的颜色圆点；点击即跳转。Esc 或点击面板外部关闭。
- 📐 **置顶排序** — 置顶会话通过公开的 `workspace.insertSessionBefore` RPC 移到其工作区账户最前，置顶工作区移到工作区列表最前；`reorderOnLoad` 在列表就绪后重申两级置顶前缀（幂等，不会与核心自身的重排对抗）。在核心的 **Manual** 排序下位置保持不变。
- 💾 **持久化** — Host 半注册持久化的 `session-pin` settings namespace（在支持的构建上通过 `settings.register({ expose: true })` 声明线上暴露），浏览器半通过标准 `settings.*` RPC 读取。在 Web 代理不提供插件 namespace 的构建上，浏览器半回退到带版本信封的 `localStorage` 文档（自动迁移 v1 旧格式），并通过 `storage` 事件跨标签页同步。
- 📡 **日志支撑的写通道** — 在挂载了内置 `dsh-session-pin` 服务的构建上，每次会话切换先经 `session.setPinned` RPC 提交（`session/pin` 事件日志是规范驻留），再把提交镜像写入 settings store，使有序列表、面板与工作区重排保持一致。RPC 失败或超时自动降级为 settings 直写；下一次连接代际重新启用。当 Host 提供 `pin` 投影时，会话头开关以其为准——跨设备的提交经由投影收敛。工作区置顶与颜色是本插件的本地状态，始终直写 store。
- 🔢 **可选上限** — `config.maxPins` 限制每个级别的置顶数量（默认 `0` = 不限）；超限时徽标上给出内联提示。
- 🧹 **状态自愈** — `pruneStale` 在列表就绪后清除已删除/已归档工作区与会话的置顶和颜色。
- 🌍 **界面本地化** — 徽标、换色按钮、会话头、侧栏入口与面板文案随 locale 服务提供中文与英文；无 locale 服务的组合保留英文回退。README：English · 中文 · Español · Português · हिन्दी。
- 🧩 **零核心改动** — 独立插件，适用于原版 DSH Web GUI；每个新界面在旧基线上都能优雅降级。

## 🚀 快速开始

1. **安装** — 从 npm 一条命令安装（包内声明 `dsh.bundle` 清单，插件行自动注册）：

```sh
dsh plugin --profile <你的-profile> add dsh-session-pin
```

   或手动把插件加进 profile 的 `cordis.yml`：

```yaml
plugins:
  'dsh-session-pin':
    path: /path/to/dsh-session-pin
    config:
      maxPins: 5        # 可选；0 = 每个级别不限（默认）
      reorderOnLoad: true   # 可选；加载后重申置顶顺序（默认）
      pruneStale: true      # 可选；清除已删除实体的置顶（默认）
```

> **Loader entry id。** loader 会在整个 root include 树里对 entry id 去重。
> 在 `dsh-base` bundle 挂载了内置 host 服务 `@deepseek-ai/dsh-session-pin`
> （entry id 为 `session-pin`，提供日志支撑的置顶状态与 `session.setPinned`
> RPC）的 harness 构建上，请给本插件一个不同的 entry id，例如在 profile
> patch 行里写 `id: session-pin-ui`。重复的 `session-pin` id 会导致整个
> 启动因 "duplicate loader entry id" 失败。插件内部的 cordis `name` 与
> settings namespace 仍是 `session-pin`——只有 profile entry id 必须不同。

2. **构建**（缺少 client 包时 Web 应用拒绝启动）：

```sh
pnpm install
pnpm run build      # lib/index.js + lib/client.js
```

3. **重启** `dsh web`，悬停侧栏中任意行——标题左侧出现图钉徽标与换色按钮。点击置顶；单击换色按钮循环颜色，Shift+单击清除颜色；也可以在会话头再次切换；侧栏底部可打开已置顶列表。

**卸载** — 从 `cordis.yml` 移除插件行并重启。`session-pin` 段同样可以从 `settings.yaml` 删除；插件不写任何其他内容。

## ⚙️ 配置

| 键 | 类型 | 默认值 | 含义 |
|---|---|---|---|
| `maxPins` | integer | `0` | 每个级别的置顶数上限（会话与工作区各有独立额度）；`0` = 不限。取消置顶始终可用。 |
| `reorderOnLoad` | boolean | `true` | 会话/工作区列表就绪后及工作区变化时重申置顶前缀（新置顶在前）。 |
| `pruneStale` | boolean | `true` | 清除已就绪列表中缺席（已删除/已归档）实体的置顶与颜色。 |

## 🧠 工作原理

- **Host 半**（`src/index.ts`）— 注册 `session-pin` settings namespace（`{ pinned, workspacePinned, colors, workspaceColors, maxPins, reorderOnLoad, pruneStale }`），策略随组合 base 层下发。无会话事件、无模型流量。
- **浏览器半**（`src/client.ts`）— 组装无框架依赖的 `PinStore`（settings 传输，降级为带版本信封的 `localStorage` 文档并跨标签页同步）、`PinController`（两级切换 / 换色 / 剪枝 / 重排状态机）与 UI：行覆盖层（工作区行始终覆盖；会话行仅在上游行槽位未声明时覆盖）、可选的行槽位注册、会话头开关、侧栏底部入口与覆盖层面板。排序走 `ctx.workspaces`；行着色是纯 CSS（以换色按钮的 `data-color` 类为键的 `:has()` 规则）。
- **构建** — esbuild 产出 Host ESM 半与包裹在 Web 引导工厂（`window.__ModuleLoader__.load({ id, factory })`）中的 client CJS 半；`react` 外置到模块表种子词，包内渲染使用外壳自身的 React。纯净门禁保证任何 `@deepseek-ai/*` 值导入都无法进入浏览器包。

**使用的扩展点：** `settings`（Host）；`sessions`、`workspaces`、`settingsScope`、`connection`、`remote`、`slots`（client）；`locale`（client，可选）；`conversation.session.header.actions`、`sidebar.footer.action`、`shell.overlay`，以及上游声明时的 `sessions.row.action` 行槽位。**模型可见影响：无** — 这是纯 UI 插件：不新增会话事件，不给任何模型请求增加 token。

## 📦 兼容性

| 层 | 基线 |
|---|---|
| DeepSeek Harness | npm `@deepseek-ai/dsh@0.1.0-rc.6` 代（client 包 `0.1.0-rc.6`）；更新的构建自动启用行槽位、线上暴露 settings 与 `session/pin` 投影 |
| Cordis peer | `@deepseek-ai/cordis: ^4.0.1` |
| Node（开发） | ≥ 22 |
| 浏览器 | 现代 Chromium/Firefox/Safari；行着色需要 CSS `:has()`（Chrome 105+、Firefox 121+、Safari 15.4+）——旧浏览器仍显示换色圆点，只是没有行底色 |

## 🧪 开发

```sh
pnpm install
pnpm run typecheck  # tsc --noEmit
pnpm run test       # vitest 单测（pin-core、store、controller、overlay、host 注册）
pnpm run build      # 双半构建 + client 包纯净门禁
node scripts/verify-live.mjs   # 针对运行中的 `dsh web` 实测（DSH_CHECKOUT 环境变量）
```

## 🗺️ 路线图

- 右键 / 行菜单「置顶」入口（需要核心行级菜单槽位；行徽标槽位已在上游落地）。
- 规范驻留：日志支撑的 `session/pin` 事件 + `pin` 投影 + 写 RPC（上游）——届时 settings namespace 退役为持久层，插件改用 `useProjection('pin')`。
- 规范驻留落地后的完整取色器弹层（自定义颜色）；当前的循环换色按钮已覆盖预设调色板。

## ⚠️ 已知限制

- **持久化范围** — 在 Web 代理不提供插件 settings namespace 的构建上，浏览器半把置顶与颜色存进带版本信封的 `localStorage`（仅本浏览器），直到上游暴露该 namespace（更新构建上通过 `settings.register({ expose: true })` 声明）。Host 侧注册已就位，暴露后自动成为持久层。
- **排序范围** — 置顶位置仅在 **Manual** 排序下稳定；**Updated** 排序下核心的活动提升会重排活跃会话，`reorderOnLoad` 在加载与工作区变化时重申前缀。未分组与平铺视图没有 Host 侧账户，会话位置不持久化（徽标、颜色与置顶状态仍可用）。工作区顺序通过注册表显示顺序持久化。
- **远程浏览器** — 基线上 settings RPC 仅限回环；远程浏览器回退到浏览器本地的 `localStorage`。
- **行徽标降级** — 上游行槽位不可用时，会话行按标题文本匹配；标题重复时每个匹配行都显示徽标且只切换第一个匹配（外观性问题）。会话头开关始终按 id 工作，不受影响。有槽位的构建上，会话行只经槽位渲染——不存在降级路径造成的重复图钉。
- **工作区行匹配** — 工作区控件按名称匹配（Host 强制唯一）；重命名后自动跟随。未分组桶与搜索结果行有意不渲染控件。
- **行 DOM 依赖** — 覆盖层依赖核心行的 `role="treeitem"` / `aria-selected` / `aria-expanded` 结构，需跟随上游 UI 变更。

## 🌐 社区

- [DeepSeek Harness Discord](https://discord.gg/Ycq5dCaS4) · [官方讨论](https://github.com/deepseek-ai/deepseek-harness/discussions)
- 在 [`dsh-plugin` 主题](https://github.com/topics/dsh-plugin)发现更多插件。

## 👥 贡献者

感谢每一位参与塑造这个插件的人：

- [**PerryLink**](https://github.com/PerryLink) — 创建者与维护者：置顶交互、持久化、工作区排序、按置顶行颜色、五语言文档与社区工程（v0.1.0 → v0.3.0）。

_欢迎贡献——开一个 [issue](https://github.com/PerryLink/dsh-session-pin/issues) 或在 [discussions](https://github.com/PerryLink/dsh-session-pin/discussions) 发起讨论。_

## 📜 许可证

Apache License 2.0 — 见 [LICENSE](LICENSE)。Copyright © 2026 dsh-session-pin contributors.

## PerryLink DSH 插件家族

本项目是 [PerryLink](https://github.com/PerryLink) 维护的 [15 个 DeepSeek Harness 插件](https://github.com/PerryLink)之一。如果你觉得这个插件有用，其余的很可能同样有用：

| 插件 | 一句话说明 |
|---|---|
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
