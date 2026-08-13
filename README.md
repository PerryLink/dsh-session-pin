# dsh-session-pin

**简体中文** | [English](./README.en.md)

为 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）Web GUI 增加「钉住会话」能力的双面插件（宿主 + 浏览器）：把鼠标移到侧边栏会话行上，标题最左侧浮现灰色图钉；点击后图钉变为黄色（琥珀色），该会话被钉住——记录到宿主端设置（跨重启、跨浏览器），并在其工作区分组中移动到最前。再次点击取消钉住。

## 功能

- **图钉徽标**：悬停会话行时标题左侧浮现灰色图钉，已钉住的会话常显黄色图钉，点击切换钉住/取消（行内点击不会误触打开会话）。
- **置顶排序**：钉住时通过公开 RPC `workspace.insertSessionBefore` 把会话移到其工作区账户首位；核心的「手动（Manual）排序」模式下位置不会被活动打乱。
- **钉住上限（可选）**：`config.maxPins` 限制最大钉住数（默认 0 = 不限），超限时浏览器端拒绝并记日志。
- **持久化**：钉住集合存放在宿主端 `session-pin` settings 命名空间（文件持久、热重载），由浏览器半通过标准 `settings.*` RPC 读写。

## 安装

在 DSH 的 `cordis.yml` 中注册插件：

```yaml
plugins:
  '@dsh-external/dsh-session-pin':
    path: /path/to/dsh-session-pin
    config:
      maxPins: 5      # 可选；0 = 不限（默认）
```

先构建再启动（缺少构建产物会导致 `dsh web` 拒绝启动）：

```sh
pnpm install
pnpm run build      # lib/index.js + lib/client.js
```

重启 `dsh web` 后，浏览器端插件随页面加载（`/plugins/@dsh-external/dsh-session-pin/client.js`），`window.__DSH_BOOT__` 清单包含本插件。

## 构建 / 测试

```sh
pnpm run build      # esbuild 双半构建 + 客户端包纯度检查
pnpm run test       # pin-core 纯逻辑单测（vitest）
pnpm run typecheck  # tsc --noEmit
```

## 设计说明

- 双面插件：宿主半只注册 `session-pin` settings 命名空间（schema：`{ pinned: string[] }`）；浏览器半通过 `ctx.settingsScope.bind()` 读写，通过 `ctx.sessions`/`ctx.workspaces` 渲染与排序。
- 会话行没有第三方行内扩展槽位，徽标通过 DOM 覆层注入：以 `[role="treeitem"][aria-selected]` 识别会话行，按标题文本与会话列表关联，`MutationObserver` 在 React 重渲染后幂等重挂。
- 客户端包为 web boot 工厂格式（`window.__ModuleLoader__.load({ id, factory })`），仅类型导入 `@deepseek-ai/*`；构建脚本的纯度检查会拒绝任何漏进客户端包的 `@deepseek-ai` 值导入。

## 版本兼容

针对 DSH snapshot0812 基线（npm `@deepseek-ai/dsh@0.1.0-rc.6` 世代，客户端包 `@deepseek-ai/dsh-client-runtime@0.0.1-rc.1` 等）开发；cordis peer 为 `@deepseek-ai/cordis: ^4.0.1`。

## 已知限制与后续工作

- **排序范围**：钉住置顶只在「手动（Manual）排序」下稳定；「最近更新（Updated）」模式下核心的活动晋升逻辑会覆盖插件排序。Ungrouped 会话与扁平「一个列表」视图没有宿主端账户，位置不持久（徽标与钉住状态本身仍然生效）。
- **远程浏览器**：settings RPC 仅限 loopback，远程浏览器自动回退到浏览器本地 localStorage。
- **同标题会话**：行按标题文本匹配，标题重复时徽标会同时出现在所有同名行上，切换作用于第一个匹配（外观级限制）。
- **行 DOM 依赖**：覆层依赖核心会话行的 `role="treeitem"`/`aria-selected` 结构，上游 UI 改版后需要跟进。
- TODO(plugin)：钉住状态的规范化居所是日志级 `session/pin` 事件（如 `session/title` 模式）；待插件可读的投影通道可用后迁移，settings 命名空间先承担持久存储。
