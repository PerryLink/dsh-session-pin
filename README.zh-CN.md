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
  <a href="https://github.com/topics/dsh-plugin"><img src="https://img.shields.io/badge/topic-dsh--plugin-2ea44f.svg" alt="Topic: dsh-plugin"></a>
  <img src="https://img.shields.io/badge/DSH-0.1.0--rc.6-3884ff.svg" alt="DSH 基线: 0.1.0-rc.6">
  <img src="https://img.shields.io/github/stars/PerryLink/dsh-session-pin?style=flat" alt="GitHub stars">
</p>

> **把重要的会话钉在顶部。** 面向 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的双面插件（宿主 + 浏览器）：每条会话行都有单击即用的图钉徽标——悬停时灰色、钉住后琥珀色常显——钉住的会话自动移到其工作区分组最前，且钉住状态跨重启、跨浏览器持久保存。

## 为什么需要钉住？

会话列表按最近活动排序：你天天依赖的那场对话会慢慢沉底，每开一个新会话就把它再埋深一层。手动排序 + 拖拽虽然存在，但几乎没人发现；而"钉住的聊天还会随活动重排"正是其他编程 Agent 用户抱怨最多的问题。`dsh-session-pin` 给你一步到位的体验：

```
┌─ 会话 ─────────────────────────────────┐
│ 📌 实现登录流程              3小时      │  ← 已钉住：琥珀色图钉常显
│   修复鉴权 bug              1小时      │  ← 悬停浮现灰色图钉，点击切换
│   重构数据库层              2天        │
└─────────────────────────────────────────┘
```

## ✨ 功能特性

- 🧷 **悬停图钉徽标** — 悬停会话行时，标题左侧浮现灰色图钉；已钉住的会话常显琥珀色图钉。单击切换，且不会误触打开会话。
- 📌 **置顶排序** — 钉住时通过公开 RPC `workspace.insertSessionBefore` 把会话移到其工作区账户首位；核心的「手动（Manual）排序」模式下位置固定，不随活动重排。
- 💾 **持久钉住** — 宿主半注册持久的 `session-pin` settings 命名空间，浏览器半经标准 `settings.*` RPC 写入。当前 DSH 构建的 Web 代理只服务其白名单命名空间，因此在白名单决策上移到 `settings.register()`（上游已计划）之前，浏览器半自动回退到 `localStorage`——无论如何，钉住状态在同一浏览器内刷新后依然保留。
- 🔢 **可选上限** — `config.maxPins` 限制最大钉住数（默认 `0` = 不限），超限时拒绝并记日志。
- 🧩 **零核心改动** — 针对官方 DSH Web GUI 的独立插件，无需打补丁的 harness。
- 🌍 **五语文档** — English · 中文 · Español · Português · हिन्दी。

## 🚀 快速开始

1. **安装** — 在 profile 的 `cordis.yml` 中加入插件：

```yaml
plugins:
  '@dsh-external/dsh-session-pin':
    path: /path/to/dsh-session-pin
    config:
      maxPins: 5      # 可选；0 = 不限（默认）
```

2. **构建**（缺少浏览器端构建产物时 `dsh web` 会拒绝启动）：

```sh
pnpm install
pnpm run build      # lib/index.js + lib/client.js
```

3. **重启** `dsh web`，悬停侧边栏任意会话行——标题左侧出现图钉徽标，点击即钉住。

**卸载** — 从 `cordis.yml` 删除插件行并重启；如需清理，可同时删除 `settings.yaml` 中的 `session-pin` 段落，除此之外不写入任何其他位置。

## ⚙️ 配置项

| 键 | 类型 | 默认 | 含义 |
|---|---|---|---|
| `maxPins` | 整数 | `0` | 最大钉住数；`0` = 不限。取消钉住永远不受限。 |

## 🧠 实现原理

- **宿主半**（`src/index.ts`）— 注册 `session-pin` settings 命名空间（`{ pinned: string[], maxPins }`）。不产生会话事件、不产生模型流量。
- **浏览器半**（`src/client.ts`）— 通过 `ctx.settingsScope` 绑定命名空间，覆层渲染图钉徽标，通过 `ctx.workspaces` 排序；`MutationObserver` 在 React 重渲染后幂等重挂徽标（会话行暂无第三方行内扩展槽位，按 `[role="treeitem"][aria-selected]` + 标题文本定位）。
- **构建** — esbuild 输出宿主 ESM 半与包裹成 web boot 工厂格式（`window.__ModuleLoader__.load({ id, factory })`）的客户端 CJS 半，并带纯度门：任何 `@deepseek-ai/*` 值导入漏进浏览器包即构建失败。

**使用的扩展点**：`settings`（宿主）；`sessions` / `workspaces` / `settingsScope` / `connection` / `remote`（客户端）。**模型可见效果：无** — 纯 UI 插件：不新增会话事件，不给任何模型请求增加 token。

## 📦 兼容性

| 层 | 基线 |
|---|---|
| DeepSeek Harness | snapshot 0812 / npm `@deepseek-ai/dsh@0.1.0-rc.6` 世代（客户端包 `0.1.0-rc.6`） |
| Cordis peer | `@deepseek-ai/cordis: ^4.0.1` |
| Node（开发） | ≥ 22 |

## 🧪 开发

```sh
pnpm install
pnpm run typecheck  # tsc --noEmit
pnpm run test       # vitest 单测
pnpm run build      # 双半构建 + 客户端包纯度检查
```

## 🗺️ 路线图

- 右键 / 行菜单「钉住」入口（需要核心行内槽位或菜单覆层）。
- 侧边栏顶部的独立 **Pinned 分区**（Slack Starred 式）——Cursor、Claude、Slack、Notion、Telegram 最终都收敛到"独立钉住区块"这一形态。
- 规范化居所：日志级 `session/pin` 事件（`session/title` 模式），待插件可读的投影通道可用后迁移。

## ⚠️ 已知限制

- **持久化范围** — 当前 DSH 基线中 `session-pin` 命名空间不在 Web 代理的服务白名单里，浏览器半将钉住集合存于 `localStorage`（浏览器本地），待上游开放插件命名空间后自动升级为宿主持久。宿主侧命名空间注册已就位。
- **排序范围** — 钉住位置仅在「手动（Manual）排序」下稳定；「最近更新（Updated）」模式下核心的活动晋升会重排。Ungrouped 与扁平列表视图没有宿主账户，位置不持久（徽标与钉住状态本身仍生效）。
- **远程浏览器** — settings RPC 仅限 loopback，远程浏览器回退到浏览器本地 `localStorage`。
- **同标题会话** — 按标题文本匹配，标题重复时徽标出现在所有同名行，切换作用于第一个匹配（外观级限制）。
- **行 DOM 依赖** — 覆层依赖核心会话行的 `role="treeitem"` / `aria-selected` 结构，需随上游 UI 改版跟进。

## 🌐 社区

- [DeepSeek Harness Discord](https://discord.gg/Ycq5dCaS4) · [官方讨论区](https://github.com/deepseek-ai/deepseek-harness/discussions)
- 在 [`dsh-plugin` 话题页](https://github.com/topics/dsh-plugin)发现更多插件。

## 📜 许可证

Apache License 2.0 — 详见 [LICENSE](LICENSE)。Copyright © 2026 dsh-session-pin contributors。
