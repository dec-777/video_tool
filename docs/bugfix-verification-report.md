# V1 Bugfix And Verification Report

生成时间：2026-06-07 14:43:26 +08:00

项目：yt-dlp Windows 桌面下载管理器 V1  
路径：`E:\du\AI\ai_coding\codex\video_project_codex`

本报告按 `AGENTS.md`、`docs/需求文档.md`、`docs/技术方案文档.md`、`docs/项目架构文档.md`、`docs/开发任务拆分文档.md` 的 V1 范围执行。V2 功能如 Cookie、代理、字幕、archive、命令预览、播放列表可视化未加入。

## 1. 本次修复结论

当前 V1 核心链路已验证通过：

```text
Electron 启动
-> React/Vite 页面加载
-> preload 白名单 API
-> IPC 统一返回
-> 主进程 spawn 调用 yt-dlp.exe
-> FFmpeg 合并/转码
-> 任务进度与状态更新
-> 配置/历史持久化
-> Windows 打包与安装包检查
```

最终状态：通过。

## 2. 阶段报告

### 阶段 1：二进制检测

初始失败：

- `bin/yt-dlp.exe` 只有 108KB，执行 `--version` 无输出并返回 1。
- `npm run check:binaries` 和 `npm run check:v1-services` 因 yt-dlp 不可用失败。

修复：

- 从 yt-dlp 官方 Release 下载独立 Windows 可执行文件：`2026.03.17`。
- 替换 `bin/yt-dlp.exe`，旧 108KB 文件备份到 `.tmp/yt-dlp.broken-108kb.exe`。

复检：

- `npm run check:binaries`：通过。
- yt-dlp：`2026.03.17`
- FFmpeg / FFprobe：`7.1.1-full_build-www.gyan.dev`

### 阶段 2：Electron 检查脚本稳定性

初始失败：

- Electron 检查脚本写入 `AppData\Roaming\Electron`，沙箱环境拒绝。
- 部分检查脚本启动 GPU 进程后崩溃。
- 日志目录创建失败时可能影响流程。

修复：

- 新增 `scripts/testUserData.cjs`，所有 Electron 检查使用项目 `.tmp/test-user-data`。
- `package.json` 中 Electron 检查脚本加入 `--in-process-gpu`。
- `logService` 在日志目录创建失败时跳过日志写入，不再拖垮下载任务。

复检：

- `npm run check:persistence`：通过。
- `npm run check:download-smoke`：通过。

### 阶段 3：开发启动与错误项目隔离

初始问题：

- 5173 被其他项目占用时，Vite 报端口占用。
- `start-electron-dev.cjs` 可能因旧 `VITE_DEV_SERVER_URL` 指向 5173 而拒绝启动。
- 用户担心 Electron 打开 `video_project_deepseek` 前端。

修复：

- `npm run dev` 使用 `scripts/dev.cjs`，从 5273 起寻找可用端口。
- `index.html` 增加项目标记：`codex-project-id=video_project_codex`。
- `start-electron-dev.cjs` 启动前验证页面标记、标题和入口脚本。
- 如果传入端口是其他项目，拒绝打开，并继续快速扫描本项目默认端口段。
- `electron/windowManager.js` 的开发默认端口由 5173 改为 5273。
- `check:dev-start` 覆盖假前端拒绝、5173 占用、动态端口启动、preload 不丢失、spawn 不再 EINVAL。

复检：

- `npm run check:dev-start`：通过。

### 阶段 4：下载服务、任务队列与状态机

发现问题：

- UI 禁用了部分按钮，但后端 `cancelTask` / `retryTask` 状态校验不够严格。
- 理论上可以通过 IPC 取消 completed 任务，或重试非 failed 任务。

修复：

- `cancelTask` 只允许 `pending` / `downloading`。
- `retryTask` 只允许 `failed`。
- 新增 `scripts/check-task-actions.cjs` 验证 pending 取消、completed 防取消、防重试、failed 可重试。
- `check-download-smoke` 增加 completed 任务不能取消/重试的回归检查。

复检：

- `npm run check:task-actions`：通过。
- `npm run check:download-smoke`：通过。

### 阶段 5：UI 遮挡与乱码风险

发现问题：

- 按钮图标与长文字在窄布局下可能挤压。
- 导航文字和长 URL 需要稳定换行/省略，避免遮挡。

修复：

- `src/styles/global.css` 中固定按钮图标 flex 尺寸。
- 为导航文字增加 ellipsis。
- 为按钮、分段控件、任务操作按钮增加稳态宽度与不换行规则。
- 长 URL / 文件路径继续使用 `overflow-wrap: anywhere`。
- 进程输出使用 `processOutputDecoder` 兼容 UTF-8 / GBK，降低中文路径乱码风险。

复检：

- `npm run build:renderer`：通过。
- `npm run check:desktop`：通过。

### 阶段 6：真实站点解析、下载与打包

初始失败：

- 沙箱禁止外网 socket，真实 Bilibili 检查报 `WinError 10013`。
- `npm run build` 初次因 Electron 缓存写入 `AppData\Local\electron\Cache` 被拒绝。
- NSIS 工具包下载中途 EOF。

修复：

- 联网检查使用授权后重跑。
- 新增 `scripts/build.cjs`，将 `ELECTRON_CACHE` 和 `ELECTRON_BUILDER_CACHE` 固定到项目 `.tmp`。
- `package.json` 的 `build` 改为 `node scripts/build.cjs`。
- NSIS EOF 后重新打包，缓存续用并成功。

复检：

- `npm run check:bilibili-parse`：通过。
- `npm run check:bilibili-download`：通过。
- `npm run build`：通过。
- `npm run check:package`：通过。

## 3. 修改文件清单

关键修改：

- `bin/yt-dlp.exe`
- `electron/main.js`
- `electron/windowManager.js`
- `electron/services/logService.js`
- `electron/services/taskQueue.js`
- `package.json`
- `scripts/build.cjs`
- `scripts/start-electron-dev.cjs`
- `scripts/dev.cjs`
- `scripts/testUserData.cjs`
- `scripts/check-binaries.cjs`
- `scripts/check-v1-services.cjs`
- `scripts/check-persistence.cjs`
- `scripts/check-download-smoke.cjs`
- `scripts/check-task-actions.cjs`
- `scripts/check-bilibili-parse.cjs`
- `scripts/check-bilibili-download-smoke.cjs`
- `scripts/check-dev-start.cjs`
- `src/styles/global.css`
- `index.html`

## 4. 最终验证命令

| 命令 | 结果 | 覆盖内容 |
|---|---:|---|
| `npm run check:binaries` | 通过 | yt-dlp / FFmpeg / FFprobe |
| `npm run check:v1-services` | 通过 | commandBuilder、错误映射、进度解析、URL 规范化、GBK 解码 |
| `npm run check:persistence` | 通过 | config/history 读写、损坏恢复、userData |
| `npm run check:desktop` | 通过 | preload 白名单、前端无 Node API、基础结构 |
| `npm run check:dev-start` | 通过 | 5273 动态端口、拒绝其他项目前端、preload 不丢 |
| `npm run check:task-actions` | 通过 | 取消/重试状态机 |
| `npm run check:download-smoke` | 通过 | 本地 MP4、MP3、M4A 下载、中文路径、状态回归 |
| `npm run check:bilibili-parse` | 通过 | 真实 Bilibili URL 解析 |
| `npm run check:bilibili-download` | 通过 | 真实 Bilibili 下载与 FFmpeg 合并 |
| `npm run build:renderer` | 通过 | React/Vite 前端构建 |
| `npm run build` | 通过 | Windows NSIS 安装包打包 |
| `npm run check:package` | 通过 | 安装包启动、中文/空格路径、extraResources/bin |

## 5. V1 功能矩阵

| V1 功能 | 验证状态 |
|---|---|
| Electron 窗口启动 | 通过 |
| React 页面构建 | 通过 |
| preload 安全 API | 通过 |
| IPC 统一返回 | 通过 |
| yt-dlp 检测 | 通过 |
| FFmpeg / FFprobe 检测 | 通过 |
| 单 URL 解析 | 通过 |
| MP4 下载 | 通过 |
| MP3 下载 | 通过 |
| M4A 下载 | 通过 |
| 多 URL 队列下载 | 通过 |
| 保存目录与文件名模板 | 通过 |
| 进度、速度、ETA 解析 | 通过 |
| 任务取消 | 通过 |
| 失败任务重试 | 通过 |
| 历史记录 | 通过 |
| 设置保存与恢复 | 通过 |
| 中文路径 | 通过 |
| 空格路径 | 通过 |
| Windows 打包 | 通过 |
| 安装包运行 | 通过 |
| 不暴露危险 API | 通过 |
| 不使用 exec 拼命令 | 通过 |

## 6. 如何运行

必须进入项目目录：

```powershell
cd /d E:\du\AI\ai_coding\codex\video_project_codex
npm install
npm run dev
```

如果使用 PowerShell：

```powershell
Set-Location E:\du\AI\ai_coding\codex\video_project_codex
npm run dev
```

不要在 `E:\du\AI\ai_coding\codex` 父目录运行 `npm run dev`，那里没有 `package.json`。

当前 `npm run dev` 会从 `http://127.0.0.1:5273` 起找可用端口，并且 Electron 启动前会验证页面属于 `video_project_codex`，不会打开 `video_project_deepseek` 的前端。

## 7. 打包产物

最新安装包：

```text
release\YT-DLP Desktop Setup 0.1.0.exe
```

解包运行目录：

```text
release\win-unpacked
```

`bin` 已作为 `extraResources` 打入安装包资源目录，不在 asar 内执行。

## 8. 已知边界

- V1 不支持 Cookie、浏览器 Cookie、代理、字幕、封面、archive、播放列表可视化。
- 抖音等站点如果 yt-dlp 返回需要 Fresh cookies，程序会显示中文 `LOGIN_REQUIRED` 提示；这不是 V1 bug，而是 AGENTS.md 明确禁止在 V1 加 Cookie 功能。
- electron-builder 提示 `author is missed` 和签名跳过，不影响当前 V1 运行；正式发布建议后续补 `author` 和代码签名。

## 9. 项目总结

本轮修复后，项目已经达到 V1 最小可用目标：开发模式可启动，错误项目前端会被拒绝，二进制完整可用，真实解析和下载链路通过，中文/空格路径与安装包检查通过。后续建议只在 V1 稳定后再按 V2 文档扩展 Cookie、代理、字幕和播放列表等高级功能。
