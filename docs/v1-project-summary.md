# YT-DLP Desktop V1 项目总结

> 生成时间：2026-06-06  
> 范围：严格按 `AGENTS.md` 的 V1 最小可用版本推进  
> 技术栈：Electron + React + Vite + Node.js + yt-dlp.exe + FFmpeg

## 1. 当前完成状态

本仓库已新增一个 V1 Windows 桌面下载管理器：

1. Electron 窗口与 React/Vite UI 已建立。
2. preload 使用 `contextBridge` 暴露白名单 API。
3. IPC 按 download/config/file/history/system 分模块注册。
4. yt-dlp、FFmpeg、FFprobe 已放入 `bin/` 并可检测。
5. 单 URL 解析已接入 `yt-dlp -J --no-playlist URL`。
6. V1 下载参数由 `commandBuilder` 统一生成，只支持视频 MP4、音频 MP3/M4A。
7. 下载任务队列、进度解析、取消、重试、历史记录已实现。
8. 配置与历史写入 `app.getPath("userData")`。
9. 批量 URL 过滤空行、去重并创建独立任务。
10. Windows NSIS 安装包已成功生成。

## 2. 阶段报告

### 阶段 0：文档与仓库盘点

已阅读：

1. `AGENTS.md`
2. `docs/需求文档.md`
3. `docs/技术方案文档.md`
4. `docs/项目架构文档.md`
5. `docs/开发任务拆分文档.md`

检查结果：

1. 初始仓库没有 Electron 桌面端工程文件。
2. Node `v24.15.0`、npm `11.12.1` 可用。
3. `.venv/Scripts/yt-dlp.exe` 可运行，但根目录没有 `bin/`。
4. 未发现项目内置 FFmpeg/FFprobe。

### 阶段 1：React + Vite UI 骨架

新增：

1. `package.json`
2. `vite.config.js`
3. `index.html`
4. `src/main.jsx`
5. `src/App.jsx`
6. `src/layouts/*`
7. `src/pages/*`
8. `src/styles/global.css`
9. `data/config.example.json`
10. `logs/.gitkeep`

失败与修复：

1. 首次 `npm install` 因 Electron 下载 GitHub 超时失败。
2. 使用 `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/` 后安装成功。

检查：

1. `npm run build:renderer` 通过。

### 阶段 2：Electron 主进程与安全 IPC

新增：

1. `electron/main.js`
2. `electron/windowManager.js`
3. `electron/preload.js`
4. `electron/constants/ipcChannels.js`
5. `electron/ipc/*`
6. `electron/utils/ipcResponse.js`
7. `scripts/check-desktop.cjs`

实现：

1. `nodeIntegration: false`
2. `contextIsolation: true`
3. preload 只暴露 V1 白名单 API。
4. IPC 统一返回 `{ success, data, error }`。

检查：

1. `npm run check:desktop` 通过。
2. `node --check electron/**/*.js` 通过。
3. `npm run build:renderer` 通过。

### 阶段 3：路径、二进制检测、错误与日志

新增：

1. `electron/utils/pathUtils.js`
2. `electron/services/binaryService.js`
3. `electron/services/errorService.js`
4. `electron/services/logService.js`
5. `electron/constants/defaultConfig.js`
6. `electron/constants/errorCodes.js`
7. `scripts/check-binaries.cjs`
8. `bin/yt-dlp.exe`
9. `bin/ffmpeg.exe`
10. `bin/ffprobe.exe`

失败与修复：

1. 首轮 `check:binaries` 显示三个 exe 缺失。
2. 从本机可用来源复制 `yt-dlp.exe`、`ffmpeg.exe`、`ffprobe.exe` 到项目 `bin/`。
3. 修正 Electron 检查脚本退出码，避免失败被吞掉。

检查：

1. `npm run check:binaries` 通过。
2. yt-dlp 版本：`2026.03.17`。
3. FFmpeg/FFprobe 版本：`7.1.1-full_build-www.gyan.dev`。

### 阶段 4：yt-dlp 解析与 V1 参数构建

新增：

1. `electron/services/ytdlpService.js`
2. `electron/services/commandBuilder.js`
3. `electron/utils/validationUtils.js`
4. `src/api/downloadApi.js`
5. `src/utils/formatTime.js`
6. `src/utils/formatError.js`
7. `scripts/check-v1-services.cjs`

实现：

1. `runYtdlp` 使用 `child_process.spawn`。
2. 同时监听 stdout 和 stderr。
3. 解析命令使用 `--ignore-config -J --no-playlist URL`。
4. 下载参数由 `commandBuilder` 生成数组。
5. V1 不加入字幕、Cookie、代理、archive、命令预览。

失败与修复：

1. 第一个 YouTube 测试视频不可用。
2. 更换公开视频 `https://www.youtube.com/watch?v=jNQXAC9IVRw` 后解析成功。

检查：

1. `npm run check:v1-services` 通过。
2. `npm run build:renderer` 通过。

### 阶段 5：任务队列、进度、取消与重试

新增：

1. `electron/services/taskQueue.js`
2. `electron/services/taskStore.js`
3. `electron/utils/progressParser.js`
4. `electron/utils/idUtils.js`
5. `electron/constants/taskStatus.js`
6. `src/store/taskStore.js`
7. `src/hooks/useIpcEvents.js`
8. `src/hooks/useTasks.js`
9. `src/api/fileApi.js`
10. `scripts/check-download-smoke.cjs`

实现：

1. 默认并发数为 1。
2. pending 自动开始下载。
3. 下载完成自动启动下一个任务。
4. 失败不阻塞队列。
5. 支持取消与失败重试。
6. 解析 percent、totalSize、speed、eta、merging、postprocessing、failed。
7. 任务页提供日志查看入口，可展开任务 ID、进程 ID、输出文件和原始错误摘要。

失败与修复：

1. 外部 YouTube 下载冒烟受 SSL/API 影响失败。
2. 改为本地 HTTP + FFmpeg 生成 1 秒 MP4 的稳定下载冒烟。
3. 本地 URL 曾被外部代理配置导致 502。
4. 在 yt-dlp 子进程环境中清空常见代理变量，并设置 `NO_PROXY/no_proxy` 覆盖 localhost。

检查：

1. `npm run check:download-smoke` 通过，覆盖本地 MP4、MP3、M4A 三种 V1 下载模式。
2. `npm run check:v1-services` 通过。
3. `npm run build:renderer` 通过。

### 阶段 6：配置、历史、批量下载

新增：

1. `electron/services/configStore.js`
2. `electron/services/historyStore.js`
3. `electron/utils/safeJson.js`
4. `src/api/configApi.js`
5. `src/api/historyApi.js`
6. `src/api/systemApi.js`
7. `src/store/historyStore.js`
8. `src/hooks/useHistory.js`
9. `scripts/check-persistence.cjs`

实现：

1. 配置写入 `app.getPath("userData")/config.json`。
2. 历史写入 `app.getPath("userData")/history.json`。
3. 配置损坏时备份并恢复默认配置。
4. 历史页支持显示、清空、打开文件夹、重新下载。
5. 设置页支持保存配置、恢复默认、检测二进制。
6. 批量页支持 URL 去重、空行过滤、批量加入队列。

修复：

1. 修复设置页重复按钮 JSX。
2. 默认配置读取从误用 `useState` 改为 `useEffect`。

检查：

1. `npm run check:persistence` 通过。
2. `npm run check:download-smoke` 通过。
3. `npm run build:renderer` 通过。

### 阶段 7：打包与发布检查

新增：

1. `build/icon.ico`
2. `scripts/check-package.ps1`
3. `docs/v1-project-summary.md`

打包失败与修复：

1. 首轮失败：`electron` 被放在 dependencies，electron-builder 要求它在 devDependencies。
2. 修复：移动 `electron` 和 `@vitejs/plugin-react` 到 devDependencies。
3. 二轮失败：winCodeSign 解压符号链接失败，当前 Windows 权限不允许创建符号链接。
4. 修复：V1 无签名证书，配置 `signAndEditExecutable: false` 和 `verifyUpdateCodeSignature: false`，跳过签名编辑路径。

检查：

1. `npm run build` 通过。
2. 生成 `release/YT-DLP Desktop Setup 0.1.0.exe`。
3. 生成 `release/win-unpacked/`。
4. `resources/bin` 包含 `yt-dlp.exe`、`ffmpeg.exe`、`ffprobe.exe`。
5. `npm run check:package` 通过。

### 阶段 8：Bilibili 412 下载失败修复与复测

问题：

1. 用户在 Bilibili 链接下载时遇到 `HTTP Error 412: Precondition Failed`。
2. 复现发现裸 `yt-dlp -J --no-playlist URL` 会被 Bilibili 拒绝。
3. 加入桌面浏览器 `User-Agent` 与 Bilibili `Referer` 后解析成功。

修复：

1. 新增 `electron/services/siteRequestArgs.js`。
2. `ytdlpService.getVideoInfo()` 解析 Bilibili/b23 链接时自动加入站点兼容请求头。
3. `commandBuilder.buildYtdlpArgs()` 下载 Bilibili/b23 链接时自动加入同一套请求头。
4. 前端不暴露任意 header，也没有加入 Cookie、代理、字幕等 V2 功能。
5. `errorService` 新增 `HTTP_412` 映射，UI 可显示更清晰的中文错误。

新增检查：

1. `npm run check:bilibili-parse`
2. `npm run check:bilibili-download`

复测结果：

1. `npm run check:v1-services` 通过，确认 Bilibili 下载参数包含 `--user-agent` 和 `--referer`。
2. `npm run check:bilibili-parse` 通过，真实解析 Bilibili 标题成功。
3. `npm run check:bilibili-download` 通过，真实任务队列下载生成 `bilibili-smoke.mp4`。
4. `npm run check:dev-start` 通过，确认 5173 被占用时自动换端口，且 preload 不再报 `module not found`。
5. `npm run build` 通过，安装包重新生成。
6. `npm run check:package` 通过，安装包静默安装、启动，以及中文加空格路径启动均通过。

### 阶段 9：任务卡片遮挡与中文乱码修复

问题：

1. 任务中心长 URL 会撑破任务卡片文本列，右侧图标按钮压到标题文字上。
2. Windows 下 yt-dlp 输出里的中文文件名按 UTF-8 硬解码时出现 `�` 替换符，导致任务页输出路径乱码。

修复：

1. `src/styles/global.css` 为 `.task-main` 增加 `min-width: 0`，并为任务标题和路径增加 `overflow-wrap: anywhere` 与 `word-break: break-word`。
2. 小屏宽度下任务卡片改为单列布局，按钮移动到下一行右侧，避免再次挤压文本。
3. 新增 `electron/utils/processOutputDecoder.js`，进程输出先按严格 UTF-8 解码，失败后按 GBK 解码。
4. `ytdlpService` 与 `binaryService` 统一使用该解码工具，不再用 `data.toString("utf8")` 硬解码。
5. 下载 smoke 检查新增输出路径不得包含 `�` 的断言。
6. Bilibili 下载 smoke 改为真实中文标题文件名，验证任务队列输出不乱码。

复测结果：

1. `npm run check:v1-services` 通过，覆盖 GBK 输出解码断言。
2. `npm run check:download-smoke` 通过，普通 MP4/MP3/M4A 输出路径无替换符。
3. `npm run check:bilibili-download` 通过，真实生成中文标题文件名。
4. Playwright 页面矩形检测通过：长 URL 标题与图标按钮 `overlap: false`，输出文本 `outputHasReplacement: false`。
5. `npm run check:desktop` 通过。
6. `npm run build:renderer` 通过。

### 阶段 10：Bilibili CDN 连接拒绝提示与重试优化

问题：

1. Bilibili 下载过程中出现 `ConnectionResetError(10054)` 与 `WinError 10061`。
2. 错误发生在媒体分片下载阶段，目标为 `mcdn.bilivideo.cn:8082` 一类 Bilibili CDN 地址。
3. 这类错误通常是目标 CDN 节点/端口临时拒绝连接或当前网络环境不可达，不是 Electron/preload/参数构建崩溃。

修复：

1. `errorService` 新增 `NETWORK_CONNECTION_REFUSED`，将 `WinError 10061`、`actively refused`、`目标计算机积极拒绝` 映射为中文 CDN 连接拒绝提示。
2. `errorService` 新增 `NETWORK_CONNECTION_RESET`，将 `WinError 10054`、`ConnectionResetError`、`Connection aborted` 映射为中文远程连接中断提示。
3. `commandBuilder` 为 V1 下载命令增加显式重试参数：
   - `--retries 10`
   - `--fragment-retries 10`
   - `--retry-sleep http:linear=1::3`
   - `--retry-sleep fragment:linear=1::3`
4. 未加入 Cookie、代理、字幕、archive 等 V2 功能，仍保持 V1 边界。

复测结果：

1. `npm run check:v1-services` 通过，覆盖新参数与 `10061` 错误映射。
2. `npm run check:download-smoke` 通过。
3. `npm run check:bilibili-download` 通过。
4. `npm run check:desktop` 通过。
5. `npm run build:renderer` 通过。
6. `npm run build` 通过。
7. `npm run check:package` 通过。

### 阶段 11：首页解析与下载任务联动修复

问题：

1. 首页解析按钮只更新右侧视频信息卡片。
2. 点击“开始下载”时没有自动解析，也没有把解析结果写入任务。
3. 用户会看到“任务已加入队列”，但右侧仍显示“等待解析”，任务中心也只能显示 URL。

修复：

1. `HomePage` 新增共享解析流程，手动点击解析和开始下载共用同一段逻辑。
2. 点击“开始下载”时，如果当前 URL 未解析，会先调用 `parseUrl`。
3. 解析失败时不创建下载任务。
4. 解析成功后，右侧视频信息立即显示标题、站点、时长、作者。
5. 下载任务创建时携带 `videoInfo`，主进程任务队列保存 `title`、`site`、`thumbnail`。
6. 任务元数据只用于 UI 和历史显示，不参与 yt-dlp 命令参数。
7. 允许解析返回的规范化 URL 和用户输入 URL 不完全一致，避免 Bilibili 追踪参数导致标题被丢弃。

复测结果：

1. `npm run check:download-smoke` 通过，覆盖解析元数据写入任务。
2. `npm run check:v1-services` 通过。
3. `npm run check:bilibili-download` 通过。
4. `npm run check:desktop` 通过。
5. `npm run build:renderer` 通过。
6. `npm run build` 通过。
7. `npm run check:package` 通过。

### 阶段 12：开发环境项目识别与端口隔离

问题：

1. 本机 `5173` 端口可能被 `video_project_deepseek` 等其他项目占用。
2. Electron 开发启动如果只按端口或页面标题判断，可能误加载其他项目的前端。

修复：

1. `index.html` 新增唯一标识：`<meta name="codex-project-id" content="video_project_codex" />`。
2. `scripts/start-electron-dev.cjs` 启动 Electron 前必须验证该唯一标识。
3. 如果目标 Vite 页面不是 `video_project_codex`，直接拒绝启动，不打开 Electron 窗口。
4. `npm run dev:renderer` 默认端口改为 `5273` 且启用 `--strictPort`，避免单独运行时碰撞 `video_project_deepseek` 的 `5173`。
5. `scripts/dev.cjs` 默认从 `5273` 开始寻找空闲端口，不再从 `5173` 起扫。
6. `npm run dev` 启动 Electron 前同样验证 `video_project_codex` 标识，并通过 `VITE_DEV_SERVER_URL` 精确传给 Electron。

复测结果：

1. `npm run check:dev-start` 通过，覆盖假前端拒绝、5173 被占用自动换端口、preload 正常加载。
2. `npm run check:desktop` 通过。
3. `npm run check:bilibili-download` 通过。
4. `npm run build:renderer` 通过，dist 中保留 `video_project_codex` 标识。
5. `npm run build` 通过。
6. `npm run check:package` 通过。

### 阶段 13：抖音 `jingxuan?modal_id` 链接与错误提示修复

问题：

1. `https://www.douyin.com/jingxuan?modal_id=...` 会被 yt-dlp generic 提取器识别，直接报 `Unsupported URL`。
2. 由于 `PROCESS_FAILED` 错误过早返回，UI 显示了 yt-dlp 原始 warning/error 文本。
3. 将该链接规范化为 `https://www.douyin.com/video/{modal_id}` 后，yt-dlp 能进入 Douyin 提取器，但当前返回 `Fresh cookies ... are needed`。

修复：

1. `validationUtils.assertUrl()` 自动将抖音 `jingxuan?modal_id=数字` 规范化为 `/video/数字`。
2. `errorService.normalizeError()` 改为优先检查 rawMessage 映射，再决定是否返回原错误对象。
3. 新增 `LOGIN_REQUIRED` 错误码，将 `Fresh cookies`、`Sign in` 等错误映射为中文 Cookie/登录提示。
4. V1 仍不加入 Cookie 功能，严格遵守 AGENTS.md 的 V1 边界。

复测结果：

1. `npm run check:v1-services` 通过，覆盖抖音 URL 规范化、Unsupported URL 归一化、Fresh cookies 归一化。
2. 本地 yt-dlp 验证 `/video/7645607954313465140` 已进入 Douyin 提取器，并返回 Cookie 需求提示。
3. `npm run check:desktop` 通过。
4. `npm run check:download-smoke` 通过。
5. `npm run build:renderer` 通过。
6. `npm run build` 通过。
7. `npm run check:package` 通过。

## 3. 关键设计说明

### 安全边界

1. React 前端不直接调用 `fs`、`path`、`child_process`、`ipcRenderer`。
2. preload 不暴露 `ipcRenderer` 原始对象。
3. 不暴露 `runCommand`、`exec`、`executeShell`、`eval`。
4. yt-dlp 调用只使用 `spawn(filePath, args, { windowsHide: true })`。
5. 参数全部通过 `commandBuilder` 白名单生成。

### 路径策略

1. 开发环境资源：`项目根目录/bin`。
2. 打包环境资源：`process.resourcesPath/bin`。
3. 配置、历史、日志：`app.getPath("userData")`。
4. 输出模板使用 `path.join(outputDir, outputTemplate)`，兼容中文和空格路径。

### V1 功能边界

已刻意不加入：

1. 字幕下载。
2. Cookie 文件或浏览器 Cookie。
3. 代理设置。
4. archive。
5. 命令预览。
6. 自动更新。
7. SQLite。
8. 系统托盘。

## 4. 运行方式

安装依赖：

```bash
npm install
```

开发启动：

```bash
npm run dev
```

构建渲染端：

```bash
npm run build:renderer
```

打包 Windows 安装包：

```bash
npm run build
```

## 5. 检查命令

```bash
npm run check:desktop
npm run check:dev-start
npm run check:binaries
npm run check:v1-services
npm run check:persistence
npm run check:download-smoke
npm run check:bilibili-parse
npm run check:bilibili-download
npm run check:package
npm run build
```

## 5.1 开发启动稳定性修复

后续复测中发现并修复了三类开发启动问题：

1. `Port 5173 is already in use`：`npm run dev` 已改为 `scripts/dev.cjs`，自动寻找空闲端口，并把真实 Vite 地址通过 `VITE_DEV_SERVER_URL` 传给 Electron。
2. `Unable to load preload script`：Electron 窗口保持 `nodeIntegration: false`、`contextIsolation: true`，并设置 `sandbox: false`，允许 preload 加载项目内白名单 IPC 常量模块。
3. `spawn EINVAL`：开发启动脚本不再通过 `npm.cmd` 启动 Vite，改为用当前 Node 直接启动 `node_modules/vite/bin/vite.js`。
4. `npm run dev:electron` 不再固定 `wait-on 5173` 后直接启动；`scripts/start-electron-dev.cjs` 会先验证目标 Vite 页面确实是本项目，否则给出明确错误，避免 5173 被别的项目占用时加载错页面。

新增专项检查：

```bash
npm run check:dev-start
```

该检查会故意占用 `5173`，再启动开发链路，确认自动换端口、Electron 连接真实端口、preload 不报错，并在结束后清理进程树。

## 6. 当前发布产物

```text
release/
├── YT-DLP Desktop Setup 0.1.0.exe
├── YT-DLP Desktop Setup 0.1.0.exe.blockmap
├── latest.yml
└── win-unpacked/
```

## 7. 已知人工测试项

自动检查已覆盖框架、安全、二进制、参数构建、配置历史、任务队列、本地 MP4/MP3/M4A 下载冒烟、Bilibili 真实解析、Bilibili 真实下载和打包产物。

仍建议人工检查：

1. 真实公网 URL 的 MP3 下载。
2. 真实公网 URL 的 M4A 下载。
3. 手动点击安装包安装到带空格或中文的目录。
4. 手动选择中文路径和带空格路径作为下载目录。
5. 下载完成后打开文件夹按钮。
6. 取消长时间下载任务。
7. 失败任务重试。

这些项目依赖真实网站、人工窗口操作或长耗时下载，不适合完全自动化为稳定 CI 检查。

## 8. 下一步建议

1. 做一次真实 URL 手动回归，覆盖 MP4、MP3、M4A。
2. 给 UI 增加更明确的日志查看入口。
3. 为 `commandBuilder`、`progressParser`、`errorService` 增加正式测试框架。
4. V1 稳定后再进入 V2：播放列表、字幕、Cookie、代理、archive、命令预览。
