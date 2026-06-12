# AGENTS.md — Codex 项目自动开发指导文档（V1）

> 项目名称：yt-dlp Windows 桌面下载管理器  
> 当前版本目标：V1 最小可用版本  
> 技术栈：Electron + React + Vite + Node.js + yt-dlp.exe + FFmpeg  
> 目标平台：Windows 10 / Windows 11  
> 本文件用途：放在项目根目录，作为 Codex / AI Coding Agent 自动开发本项目时必须遵守的项目级指导规则。

---

## 0. 使用说明

本文件是给 Codex 使用的项目自动开发说明文件。  
Codex 在处理本仓库任务时，应优先阅读并遵守本文件。

本项目的 V1 目标是先做出一个稳定、可运行、可打包的 Windows 桌面下载器，不追求一次性完成所有高级功能。

V1 的核心链路是：

```text
Electron 启动
→ React 页面显示
→ preload 安全桥接
→ IPC 调用主进程
→ 主进程调用 yt-dlp.exe
→ FFmpeg 合并 / 转码
→ 前端显示下载进度
→ 下载完成写入历史
→ Windows 打包可运行
```

---

## 1. Codex 总体行为规则

Codex 在本项目中必须遵守以下规则：

1. 不要一次性重写整个项目。
2. 不要擅自引入大型框架或复杂架构。
3. 不要把 V2 / V3 功能提前塞进 V1。
4. 每次修改应围绕明确的小任务进行。
5. 修改前先阅读相关文件。
6. 修改后说明改了哪些文件、为什么改、如何测试。
7. 代码必须结构清晰、职责单一。
8. 不允许把所有逻辑堆到一个大文件里。
9. 不允许在 React 前端直接调用 Node.js 系统 API。
10. 不允许暴露任意命令执行接口。
11. 调用 yt-dlp 必须使用 `child_process.spawn`。
12. 不允许使用 `exec` 拼接字符串执行下载命令。
13. 所有 Windows 路径必须兼容中文和空格。
14. 下载失败必须有用户可读错误提示。
15. 每个阶段完成后必须保持 V1 核心功能可用。

---

## 2. V1 项目目标

V1 只做基础可用版本。

V1 必须实现：

1. Electron + React + Vite 基础项目。
2. Windows 桌面窗口。
3. 安全的 preload.js。
4. IPC 通信。
5. 内置或可识别 `yt-dlp.exe`。
6. 内置或可识别 `ffmpeg.exe`、`ffprobe.exe`。
7. 单 URL 视频解析。
8. 单 URL 最佳 MP4 视频下载。
9. 单 URL MP3 / M4A 音频下载。
10. 多 URL 批量下载。
11. 选择保存目录。
12. 自定义文件名模板。
13. 下载进度显示。
14. 下载速度显示。
15. ETA 显示。
16. 下载任务队列。
17. 取消任务。
18. 失败重试。
19. 下载完成打开文件夹。
20. 下载历史记录。
21. 基础设置页。
22. 基础错误提示。
23. Windows 安装包打包。

---

## 3. V1 禁止开发范围

Codex 不要在 V1 中实现以下功能，除非用户明确要求升级到 V2：

1. 播放列表可视化选择。
2. 频道解析。
3. 合集 / 课程 / 番剧分 P 可视化。
4. 字幕下载。
5. 自动字幕。
6. 封面下载。
7. info.json 元数据下载。
8. 评论下载。
9. Cookie 文件。
10. 浏览器 Cookie。
11. 代理设置。
12. archive 跳过已下载。
13. 命令预览。
14. 下载预设系统。
15. 自动更新 yt-dlp。
16. SQLite 数据库。
17. 系统托盘。
18. 开机自启。
19. 浏览器插件。
20. 内置播放器。
21. 云同步。
22. 用户账号系统。
23. 付费系统。
24. DRM 破解。
25. 绕过付费或权限限制的功能。

这些功能应保留给 V2 / V3。

---

## 4. 推荐项目目录结构

Codex 应尽量保持以下目录结构。

```text
yt-dlp-desktop/
├── package.json
├── vite.config.js
├── index.html
├── README.md
├── AGENTS.md
│
├── docs/
│   ├── requirements.md
│   ├── technical-plan.md
│   ├── architecture.md
│   ├── v1-development-tasks.md
│   └── v1-testing-packaging.md
│
├── build/
│   └── icon.ico
│
├── bin/
│   ├── yt-dlp.exe
│   ├── ffmpeg.exe
│   └── ffprobe.exe
│
├── electron/
│   ├── main.js
│   ├── preload.js
│   ├── windowManager.js
│   │
│   ├── ipc/
│   │   ├── index.js
│   │   ├── downloadIpc.js
│   │   ├── configIpc.js
│   │   ├── fileIpc.js
│   │   ├── historyIpc.js
│   │   └── systemIpc.js
│   │
│   ├── services/
│   │   ├── ytdlpService.js
│   │   ├── commandBuilder.js
│   │   ├── taskQueue.js
│   │   ├── taskStore.js
│   │   ├── configStore.js
│   │   ├── historyStore.js
│   │   ├── fileService.js
│   │   ├── binaryService.js
│   │   ├── errorService.js
│   │   └── logService.js
│   │
│   ├── utils/
│   │   ├── pathUtils.js
│   │   ├── progressParser.js
│   │   ├── validationUtils.js
│   │   ├── safeJson.js
│   │   └── idUtils.js
│   │
│   └── constants/
│       ├── ipcChannels.js
│       ├── defaultConfig.js
│       ├── taskStatus.js
│       └── errorCodes.js
│
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   │
│   ├── layouts/
│   │   ├── MainLayout.jsx
│   │   ├── Sidebar.jsx
│   │   ├── Topbar.jsx
│   │   └── PageContainer.jsx
│   │
│   ├── pages/
│   │   ├── HomePage.jsx
│   │   ├── BatchPage.jsx
│   │   ├── TasksPage.jsx
│   │   ├── HistoryPage.jsx
│   │   └── SettingsPage.jsx
│   │
│   ├── components/
│   │   ├── common/
│   │   ├── download/
│   │   ├── task/
│   │   ├── file/
│   │   └── history/
│   │
│   ├── store/
│   │   ├── taskStore.js
│   │   ├── configStore.js
│   │   ├── historyStore.js
│   │   └── uiStore.js
│   │
│   ├── hooks/
│   │   ├── useTasks.js
│   │   ├── useConfig.js
│   │   ├── useIpcEvents.js
│   │   └── useDownloadActions.js
│   │
│   ├── api/
│   │   ├── downloadApi.js
│   │   ├── configApi.js
│   │   ├── fileApi.js
│   │   └── historyApi.js
│   │
│   ├── utils/
│   │   ├── formatTime.js
│   │   ├── formatFileSize.js
│   │   ├── validateUrl.js
│   │   └── formatError.js
│   │
│   └── styles/
│       ├── global.css
│       └── variables.css
│
├── data/
│   └── config.example.json
│
├── logs/
│   └── .gitkeep
│
└── release/
```

如果已有项目结构不同，Codex 不要盲目重构整个项目，应优先适配现有结构，并在必要时小步迁移。

---

## 5. 关键技术规则

---

## 5.1 Electron 安全规则

必须使用：

```js
nodeIntegration: false
contextIsolation: true
```

React 前端不得直接访问：

1. `fs`
2. `path`
3. `child_process`
4. `ipcRenderer`
5. `process`
6. 系统 shell
7. 任意本地命令执行能力

所有系统能力必须通过 preload 暴露的白名单 API 调用。

---

## 5.2 preload.js 规则

preload.js 只允许暴露明确业务 API。

允许：

```js
window.api.parseUrl(url)
window.api.startDownload(options)
window.api.cancelTask(taskId)
window.api.retryTask(taskId)
window.api.getTasks()
window.api.getHistory()
window.api.clearHistory()
window.api.getConfig()
window.api.saveConfig(config)
window.api.selectFolder()
window.api.openFolder(folderPath)
window.api.checkBinaries()
window.api.onTaskProgress(callback)
window.api.onTaskCompleted(callback)
window.api.onTaskFailed(callback)
window.api.onTaskCanceled(callback)
```

禁止暴露：

```js
window.api.runCommand()
window.api.exec()
window.api.executeShell()
window.api.eval()
window.ipcRenderer
window.require
```

---

## 5.3 IPC 规则

所有 IPC 名称必须放在：

```text
electron/constants/ipcChannels.js
```

所有 IPC 返回必须统一格式。

成功：

```js
{
  success: true,
  data: {}
}
```

失败：

```js
{
  success: false,
  error: {
    code: "ERROR_CODE",
    message: "用户可读错误",
    rawMessage: "原始错误"
  }
}
```

IPC 层只做：

1. 接收参数。
2. 基础校验。
3. 调用 service。
4. 返回统一结构。

IPC 层不要写复杂业务逻辑。

---

## 5.4 yt-dlp 调用规则

必须使用：

```js
const { spawn } = require("child_process");
spawn(ytdlpPath, args, { windowsHide: true });
```

禁止使用：

```js
exec(`yt-dlp.exe ${args}`)
execSync()
```

原因：

1. `spawn` 参数数组更安全。
2. 兼容中文路径和空格路径。
3. 避免命令注入。
4. 可以实时读取 stdout / stderr。
5. 适合长时间下载任务。

必须同时监听：

```js
child.stdout.on("data", ...)
child.stderr.on("data", ...)
```

因为 yt-dlp 的进度可能输出在 stdout，也可能输出在 stderr。

---

## 5.5 commandBuilder 规则

所有 yt-dlp 参数必须由：

```text
electron/services/commandBuilder.js
```

统一生成。

V1 只支持两类下载模式：

```text
video  最佳 MP4 视频
audio  MP3 / M4A 音频
```

V1 视频参数：

```bash
--newline
--no-color
--ffmpeg-location "bin目录"
-f "bv*+ba/b"
--merge-output-format mp4
-o "输出路径模板"
"URL"
```

V1 音频参数：

```bash
--newline
--no-color
--ffmpeg-location "bin目录"
-x
--audio-format mp3
-o "输出路径模板"
"URL"
```

不要在 V1 加入字幕、Cookie、代理、archive、命令预览参数。

---

## 5.6 Windows 路径规则

所有路径必须使用：

```js
path.join()
```

开发环境资源路径：

```text
项目根目录/bin
```

打包环境资源路径：

```text
process.resourcesPath/bin
```

用户配置、历史、日志必须写入：

```js
app.getPath("userData")
```

不要把用户配置写到安装目录，因为安装目录可能没有写权限。

---

## 6. V1 页面规则

V1 只需要以下页面：

1. `HomePage.jsx`
2. `BatchPage.jsx`
3. `TasksPage.jsx`
4. `HistoryPage.jsx`
5. `SettingsPage.jsx`

---

## 6.1 HomePage

必须包含：

1. URL 输入框。
2. 解析按钮。
3. 视频信息卡片。
4. 下载模式选择：
   - 视频 MP4
   - 音频 MP3
   - 音频 M4A
5. 保存目录选择。
6. 文件名模板输入。
7. 开始下载按钮。
8. 错误提示。

不要在 HomePage 中加入：

1. 字幕设置。
2. Cookie 设置。
3. 代理设置。
4. 播放列表选择。
5. 命令预览。

这些留给 V2。

---

## 6.2 BatchPage

必须包含：

1. 多行 URL 输入框。
2. 一行一个 URL。
3. 清空按钮。
4. 去重逻辑。
5. 批量加入任务。
6. 批量开始下载。

规则：

1. 空行必须过滤。
2. 重复 URL 必须去重。
3. 每个 URL 生成独立任务。
4. 单个任务失败不影响其他任务。

---

## 6.3 TasksPage

必须包含：

1. 任务列表。
2. 任务标题或 URL。
3. 任务状态。
4. 进度条。
5. 下载速度。
6. ETA。
7. 取消按钮。
8. 重试按钮。
9. 打开文件夹按钮。
10. 日志查看入口。

任务状态必须至少包含：

```text
pending
downloading
merging
postprocessing
completed
failed
canceled
```

---

## 6.4 HistoryPage

必须包含：

1. 下载历史列表。
2. 标题。
3. URL。
4. 下载模式。
5. 状态。
6. 完成时间。
7. 错误信息。
8. 打开文件夹。
9. 重新下载。
10. 清空历史。

历史记录不要等同于 archive。  
V1 不做 archive。

---

## 6.5 SettingsPage

必须包含：

1. 默认下载目录。
2. 默认下载模式。
3. 默认音频格式。
4. 默认文件名模板。
5. 并发下载数量。
6. yt-dlp 检测状态。
7. FFmpeg 检测状态。
8. 恢复默认设置。

不要加入 Cookie、代理、字幕等 V2 设置。

---

## 7. 数据结构规则

---

## 7.1 DownloadOptions V1

```js
{
  urls: [],

  mode: "video", // "video" | "audio"

  quality: {
    preset: "best",
    container: "mp4"
  },

  audio: {
    format: "mp3" // "mp3" | "m4a"
  },

  file: {
    outputDir: "",
    outputTemplate: "%(title)s.%(ext)s"
  }
}
```

---

## 7.2 DownloadTask V1

```js
{
  id: "task_xxx",
  url: "",
  title: "",
  thumbnail: "",
  site: "",

  status: "pending",

  percent: 0,
  speed: "",
  eta: "",
  totalSize: "",

  outputDir: "",
  outputTemplate: "",
  outputFile: "",

  options: {},

  createdAt: 0,
  startedAt: 0,
  completedAt: 0,

  error: "",
  rawError: "",
  processId: null
}
```

---

## 7.3 AppConfig V1

```js
{
  configVersion: 1,
  defaultOutputDir: "",
  defaultMode: "video",
  defaultAudioFormat: "mp3",
  defaultContainer: "mp4",
  outputTemplate: "%(title)s.%(ext)s",
  concurrentDownloads: 1,
  theme: "system"
}
```

---

## 7.4 HistoryRecord V1

```js
{
  id: "task_xxx",
  title: "",
  url: "",
  site: "",
  mode: "video",
  outputFile: "",
  status: "completed",
  startedAt: 0,
  completedAt: 0,
  error: null
}
```

---

## 8. 任务队列规则

V1 默认并发数为 1。

任务状态流：

```text
pending
→ downloading
→ merging / postprocessing
→ completed
```

失败流：

```text
pending / downloading / merging / postprocessing
→ failed
```

取消流：

```text
pending / downloading
→ canceled
```

规则：

1. 新任务进入 pending。
2. 当前没有运行任务时自动开始。
3. 默认同一时间只运行一个任务。
4. 任务完成后自动开始下一个。
5. 任务失败不阻塞队列。
6. 取消任务要终止子进程。
7. 失败任务可以重试。
8. 重试任务应保留原始 options。

---

## 9. 进度解析规则

yt-dlp 输出示例：

```text
[download]  35.2% of 50.00MiB at 2.30MiB/s ETA 00:15
[Merger] Merging formats into "xxx.mp4"
[ExtractAudio] Destination: xxx.mp3
```

progressParser 至少识别：

1. percent
2. totalSize
3. speed
4. eta
5. merging
6. postprocessing
7. failed

无法解析的行不要报错，应返回 null，并允许 logService 记录原始输出。

---

## 10. 错误处理规则

必须实现：

```text
electron/services/errorService.js
```

常见错误映射：

| 原始错误 | 用户提示 |
|---|---|
| Unsupported URL | 当前链接暂不支持或链接格式错误 |
| Video unavailable | 视频不可用，可能已删除、私密或地区限制 |
| HTTP Error 403 | 访问被拒绝，可能需要稍后重试或升级到支持 Cookie / 代理的版本 |
| ffmpeg not found | 未找到 FFmpeg，请检查程序文件 |
| Requested format is not available | 当前格式不可用，请尝试重新下载 |
| ENOENT | 找不到必要文件或路径 |
| EACCES | 没有权限访问该目录 |

错误处理要求：

1. UI 显示用户可读 message。
2. 日志保存 rawMessage。
3. 不要直接把堆栈大段显示给用户。
4. 不要吞掉错误。
5. 任务失败必须变成 failed 状态。

---

## 11. 日志规则

必须实现：

```text
electron/services/logService.js
```

日志写入：

```text
app.getPath("userData")/logs/app.log
app.getPath("userData")/logs/task-{taskId}.log
```

日志至少记录：

1. 应用启动。
2. 二进制检测结果。
3. 任务创建。
4. 任务开始。
5. yt-dlp 原始输出。
6. 任务完成。
7. 任务失败。
8. 错误摘要。

日志写入失败不能导致下载任务崩溃。

---

## 12. 配置与历史规则

---

## 12.1 configStore

配置文件路径：

```text
app.getPath("userData")/config.json
```

规则：

1. 配置不存在时创建默认配置。
2. 配置损坏时备份并恢复默认配置。
3. 保存配置时不要写入 undefined。
4. 配置保存后重启仍然生效。

---

## 12.2 historyStore

历史文件路径：

```text
app.getPath("userData")/history.json
```

规则：

1. completed 任务写入历史。
2. failed 任务写入历史。
3. canceled 任务可选写入历史。
4. 清空历史不删除用户下载文件。
5. 历史记录不要影响任务队列。

---

## 13. 打包规则

使用：

```text
electron-builder
```

package.json build 建议：

```json
{
  "build": {
    "appId": "com.example.ytdlpdesktop",
    "productName": "YT-DLP Desktop",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "electron/**/*",
      "package.json"
    ],
    "extraResources": [
      {
        "from": "bin",
        "to": "bin"
      }
    ],
    "win": {
      "target": "nsis",
      "icon": "build/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    }
  }
}
```

规则：

1. `bin` 必须作为 `extraResources`。
2. 不要把 yt-dlp.exe / ffmpeg.exe 放进 asar 内执行。
3. 打包后通过 `process.resourcesPath/bin` 找到二进制。
4. 配置、历史、日志写入 `userData`。
5. 安装目录可能有空格或中文，必须兼容。

---

## 14. 开发命令

Codex 可以使用以下命令。

安装依赖：

```bash
npm install
```

启动前端：

```bash
npm run dev:renderer
```

启动 Electron：

```bash
npm run dev:electron
```

一键开发启动：

```bash
npm run dev
```

构建前端：

```bash
npm run build:renderer
```

打包 Windows：

```bash
npm run build
```

检查 yt-dlp：

```bash
.\bin\yt-dlp.exe --version
```

检查 FFmpeg：

```bash
.\bin\ffmpeg.exe -version
```

---

## 15. 测试规则

每次完成一个关键模块后，Codex 应说明如何测试。

V1 最小回归测试：

1. 程序能启动。
2. 首页能解析 URL。
3. MP4 下载成功。
4. MP3 下载成功。
5. 下载进度显示。
6. 取消任务可用。
7. 失败任务可重试。
8. 历史记录写入。
9. 设置保存后重启仍存在。
10. 中文路径可下载。
11. 空格路径可下载。
12. 打包后能运行。

如果任务涉及主进程、下载、路径、打包，必须说明是否需要人工测试。

---

## 16. 代码风格规则

1. 使用有意义的变量名。
2. 使用有意义的函数名。
3. 每个函数只做一件事。
4. 不写巨型函数。
5. 不重复代码。
6. 复杂逻辑需要注释。
7. 错误必须处理。
8. Promise 必须 catch 或向上抛出。
9. 文件职责必须清晰。
10. 前端组件不要混入主进程逻辑。
11. 主进程 service 不要混入 UI 逻辑。
12. IPC 不要混入复杂业务逻辑。

---

## 17. Codex 修改文件前的检查清单

修改前先确认：

1. 当前任务属于 V1 吗？
2. 是否会引入 V2 功能？
3. 是否需要修改 Electron 主进程？
4. 是否需要修改 preload？
5. 是否需要新增 IPC？
6. 是否会影响 commandBuilder？
7. 是否会影响 taskQueue？
8. 是否会影响路径处理？
9. 是否会影响打包路径？
10. 是否会影响 V1 回归测试？

如果会影响核心链路，修改要小步进行。

---

## 18. Codex 每次输出结果时应包含

每次完成开发任务后，Codex 应输出：

1. 修改了哪些文件。
2. 新增了哪些文件。
3. 实现了什么功能。
4. 关键设计说明。
5. 如何运行。
6. 如何测试。
7. 是否存在未完成事项。
8. 是否影响 V1 核心功能。
9. 下一步建议。

不要只输出代码，不解释如何验证。

---

## 19. 推荐开发顺序

Codex 应按以下顺序推进 V1：

```text
1. 初始化 Electron + React + Vite
2. 实现 MainLayout / HomePage / TasksPage / HistoryPage / SettingsPage
3. 实现 main.js 和 preload.js
4. 实现 IPC 常量与 IPC 注册
5. 实现 pathUtils
6. 实现 binaryService
7. 实现 ytdlpService.runYtdlp
8. 实现 getVideoInfo
9. 实现 HomePage URL 解析
10. 实现 commandBuilder V1
11. 实现 startDownload
12. 实现 progressParser
13. 实现 taskQueue
14. 实现 TasksPage 实时进度
15. 实现 cancelTask / retryTask
16. 实现 configStore / SettingsPage
17. 实现 historyStore / HistoryPage
18. 实现 BatchPage
19. 实现 errorService
20. 实现 logService
21. 配置 electron-builder
22. 执行 V1 测试
23. 打包发布
```

不要跳过第 3 - 13 步直接做高级页面。

---

## 20. 常见禁止行为

Codex 不允许：

1. 在 React 组件中写 `require("child_process")`。
2. 在 React 组件中调用 `fs`。
3. 使用 `exec("yt-dlp ...")`。
4. 把用户 URL 拼接进 shell 字符串。
5. 暴露 `runCommand` 给前端。
6. 把所有 IPC 写在 main.js 里。
7. 把所有下载逻辑写在 HomePage.jsx。
8. 把所有任务逻辑写在 ytdlpService。
9. 把配置写到安装目录。
10. 默认启用任何 V2 高级功能。
11. 修改大量无关文件。
12. 删除用户已有配置或历史。
13. 随意更改 package.json 脚本名称。
14. 引入不必要的大型依赖。
15. 生成无法打包的路径逻辑。

---

## 21. V1 完成定义

V1 被认为完成，必须满足：

1. `npm run dev` 可以启动。
2. Electron 窗口正常显示。
3. React 页面可用。
4. preload 安全 API 可用。
5. yt-dlp 检测正常。
6. FFmpeg 检测正常。
7. URL 解析正常。
8. MP4 下载正常。
9. MP3 下载正常。
10. M4A 下载正常。
11. 下载进度显示正常。
12. 下载速度显示正常。
13. ETA 显示正常。
14. 任务取消正常。
15. 失败重试正常。
16. 批量下载正常。
17. 历史记录正常。
18. 设置保存正常。
19. 中文路径正常。
20. 空格路径正常。
21. `npm run build` 可以打包。
22. 安装包可以安装。
23. 安装后可以下载。
24. 前端不暴露危险 API。
25. 不存在明显命令注入风险。

---

## 22. 给 Codex 的最终提醒

本项目 V1 的核心不是“功能多”，而是“链路稳”。

优先级如下：

```text
安全 > 稳定 > 可打包 > 可维护 > UI 美观 > 高级功能
```

如果遇到选择：

1. 宁愿少做功能，也不要破坏下载链路。
2. 宁愿代码多拆几个小文件，也不要写巨型函数。
3. 宁愿先手动测试，也不要盲目自动化复杂测试。
4. 宁愿保守处理路径，也不要拼接命令字符串。
5. 宁愿把高级功能留给 V2，也不要让 V1 失控。

V1 完成后，再根据 V2 文档扩展播放列表、字幕、封面、Cookie、代理、archive、命令预览和预设系统。
