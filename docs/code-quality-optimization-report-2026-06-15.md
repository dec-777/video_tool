# video_tool 代码质量优化报告

日期：2026-06-15  
版本：0.1.1  
仓库：dec-777/video_tool

## 1. 本次优化概览

本次优化严格以“不改变现有功能、不破坏下载链路”为前提，围绕 Electron 安全边界、下载任务稳定性、进度解析、持久化可靠性、检查脚本稳定性、README 准确性和发布流程进行小步优化。

本次没有重写项目，没有更换技术栈，没有移除已有 V1/V2 功能。

## 2. 仓库现状判断

项目已经具备较完整的 Electron + React + Vite 桌面应用结构：

- `electron/`：主进程、preload、IPC、下载服务、配置/历史/日志服务。
- `src/`：React 页面、布局、API 封装、hooks、状态和样式。
- `scripts/`：开发启动、二进制准备、V1/V2 检查、打包检查。
- `docs/`：需求、技术方案、架构、阶段报告和项目总结。
- `build/`：图标资源。
- `bin/`、`dist/`、`release/`、`downloads/`、`output/` 等生成物均通过 `.gitignore` 控制，不作为源码提交。

主要质量风险集中在：

- 外部站点检查不稳定。
- Bilibili 请求头不足导致 HTTP 412。
- 历史写入异常可能影响任务流。
- 进度解析对部分输出格式覆盖不足。
- README 缺少检查、打包、合规等说明。

## 3. 修改文件清单

| 文件 | 修改类型 | 主要改动 | 风险级别 |
|---|---|---|---|
| `README.md` | 文档优化 | 补充功能、使用场景、开发命令、检查命令、打包与合规说明；移除本机绝对路径 | 低 |
| `package.json` | 版本更新 | 版本升级到 `0.1.1` | 低 |
| `package-lock.json` | 版本更新 | 同步版本号 | 低 |
| `electron/windowManager.js` | 安全优化 | 限制窗口外部导航和新窗口打开，非法开发 URL 自动回退 | 中 |
| `electron/services/taskQueue.js` | 稳定性优化 | 历史写入失败不再影响任务流，事件发送异常写日志 | 中 |
| `electron/services/ytdlpService.js` | 稳定性优化 | 下载进程超时、error、close 只结算一次 | 中 |
| `electron/utils/progressParser.js` | 解析优化 | 支持无 ETA 完成进度行，MoveFiles 取最终文件路径 | 低 |
| `electron/services/logService.js` | 安全优化 | 增强 Cookie、Token、Authorization、password 脱敏 | 低 |
| `electron/services/errorService.js` | 文案修正 | Cookie 相关错误提示与当前设置能力保持一致 | 低 |
| `electron/services/siteRequestArgs.js` | 站点兼容 | Bilibili 请求补充 Origin 头，修复 HTTP 412 | 中 |
| `src/pages/HomePage.jsx` | 格式清理 | 修正链式调用缩进 | 低 |
| `scripts/check-v1-services.cjs` | 测试增强 | 新增进度解析、MoveFiles、Bilibili Origin 检查 | 低 |
| `scripts/check-persistence.cjs` | 测试增强 | 新增损坏配置恢复和日志脱敏验证 | 低 |
| `scripts/check-v2-metadata-smoke.cjs` | 测试稳定性 | 默认改为本地 HTTP 媒体源，保留 `METADATA_TEST_URL` 外部测试入口 | 低 |

## 4. 主要优化内容

### 4.1 Electron 安全与主进程

- 保留 `nodeIntegration: false` 和 `contextIsolation: true`。
- 新增外部导航保护：
  - 应用内只允许加载本项目开发地址或生产本地文件。
  - 外部 http/https 链接交给系统浏览器打开。
  - 新窗口不在 Electron 内打开。
- `VITE_DEV_SERVER_URL` 非法时自动回退到默认开发地址，避免开发环境变量写错导致启动崩溃。

### 4.2 preload 与 IPC

- 保持 preload 白名单 API，不暴露 `ipcRenderer` 原始对象。
- IPC 返回格式继续使用统一的 `{ success, data, error }`。
- 本次未新增危险 IPC，也未暴露任意命令执行能力。

### 4.3 yt-dlp / FFmpeg 调用

- 保持 `spawn(args[])` 调用方式。
- 未引入 `exec` 或 shell 字符串拼接。
- 下载进程的 `timeout`、`error`、`close` 现在只会让 Promise 结算一次，避免重复 reject/resolve。
- Bilibili 请求参数集中在 `siteRequestArgs.js` 处理，新增 `Origin` 头后外部解析和下载检查通过。

### 4.4 任务队列与状态管理

- 任务完成或失败写入历史时，如果历史文件写入失败，只写任务日志，不阻断队列。
- 向前端发送任务事件时增加异常保护，窗口销毁或发送失败不会影响任务队列。
- 保持取消、重试、失败不阻塞后续任务的原有行为。

### 4.5 进度解析

- 增加对 `[download] 100% of ... in ...` 这类无 ETA 完成行的识别。
- `[MoveFiles] Moving file "temp" to "final"` 现在记录最终文件路径。
- 无法解析的输出仍返回 `null`，不会导致下载失败。

### 4.6 配置、历史、日志

- 新增检查覆盖：
  - `config.json` 损坏时自动备份并恢复默认配置。
  - 日志中不泄露 Cookie 文件路径、浏览器 Cookie 来源、Authorization、Token、password。
- 配置、历史和日志仍写入 Electron `userData`。
- 清空历史不删除用户下载文件。

### 4.7 React 前端页面和组件

- 前端构建通过。
- 使用 Playwright CLI 打开页面并切换首页、批量、任务、历史、设置。
- 截图检查显示主要页面无明显空白、遮挡或乱码。
- 前端仍只通过 `src/api/` 调用 `window.api`。

### 4.8 Windows 兼容性

- 路径继续通过 `path.join` / `path.resolve` 等 Node API 处理。
- 检查脚本覆盖中文路径和空格路径。
- 本地 smoke 下载、字幕、元数据、Bilibili 下载均已实际运行。
- 打包后 `bin` 仍作为 `extraResources` 放在资源目录。

### 4.9 文档与检查脚本

- README 补充：
  - 项目简介。
  - 功能列表。
  - 适合/暂不建议场景。
  - 本地运行步骤。
  - 运行组件准备说明。
  - 开发、检查、打包命令。
  - 项目结构。
  - 常见问题。
  - 安全与合规说明。
- `check-v2-metadata-smoke` 改为默认本地测试源，避免外部 Vimeo 网络问题导致假失败。

## 5. 修复的问题

1. 修复 README 中硬编码本机路径的问题。
2. 修复 Cookie 错误提示与当前功能不一致的问题。
3. 修复任务历史写入失败可能影响任务队列的问题。
4. 修复任务事件发送异常可能影响任务流的问题。
5. 修复下载进程超时后可能重复结算的问题。
6. 修复进度解析不能识别无 ETA 完成行的问题。
7. 修复 MoveFiles 阶段记录临时路径而不是最终路径的问题。
8. 修复日志脱敏覆盖不足的问题。
9. 修复 metadata smoke 依赖外部网站导致不稳定的问题。
10. 修复 Bilibili HTTP 412，新增 Origin 请求头后解析和下载检查通过。
11. 修复扩展 `check-persistence` 时遗漏 `fs/path` 引入的问题，并重跑通过。

## 6. 新增或修改的测试 / 检查脚本

- `scripts/check-v1-services.cjs`
  - 新增无 ETA 进度行检查。
  - 新增 MoveFiles 最终路径检查。
  - 新增 Bilibili Origin 参数检查。
- `scripts/check-persistence.cjs`
  - 新增损坏配置恢复检查。
  - 新增日志敏感信息脱敏检查。
- `scripts/check-v2-metadata-smoke.cjs`
  - 默认使用本地 HTTP 测试页、本地视频和本地缩略图。
  - 保留 `METADATA_TEST_URL` 用于手动外部站点验证。

## 7. 实际运行的命令

| 命令 | 结果 | 说明 |
|---|---|---|
| `npm install` | 通过 | 依赖已是最新 |
| `npm run setup:binaries` | 通过 | 本地运行组件已存在 |
| `npm run build:renderer` | 通过 | 前端生产构建成功 |
| `npm run check:desktop` | 通过 | Electron 安全、preload、禁用危险 API 检查 |
| `npm run check:binaries` | 通过 | 本地组件检测通过 |
| `npm run check:v1-services` | 通过 | commandBuilder、进度解析、错误映射、Bilibili 参数检查 |
| `npm run check:task-actions` | 通过 | 取消、重试、状态守卫检查 |
| `npm run check:download-smoke` | 通过 | 本地视频 MP4、MP3、M4A 下载 smoke |
| `npm run check:v2-options` | 通过 | V2 参数构造检查 |
| `npm run check:v2-subtitles` | 通过 | 字幕参数检查 |
| `npm run check:v2-subtitle-download` | 通过 | 字幕下载 smoke |
| `npm run check:v2-embed-subtitles` | 通过 | 字幕嵌入 smoke |
| `npm run check:v2-metadata-smoke` | 通过 | 本地元数据 smoke |
| `npm run check:v2-archive-history` | 通过 | archive 和历史检查 |
| `npm run check:v2-playlist` | 通过 | 播放列表参数/任务检查 |
| `npm run check:persistence` | 通过 | 配置、历史、损坏恢复、日志脱敏检查 |
| `npm run check:dev-start` | 通过 | 开发启动、端口避让、项目标识检查 |
| `npm run check:bilibili-parse` | 通过 | 外部 Bilibili 解析通过 |
| `npm run check:bilibili-download` | 通过 | 外部 Bilibili 下载 smoke 通过 |
| `npm run check:package` | 通过 | 打包产物检查 |
| `npm run build` | 通过 | 生成 Windows NSIS 安装包 |
| Playwright 页面巡检 | 通过 | 首页、批量、任务、历史、设置页面截图检查 |

## 8. 未能运行或未通过的检查

最终没有未通过检查。

过程中出现过三次失败并已修复：

1. `check:v2-metadata-smoke` 初次失败：默认访问 Vimeo 外网，改为本地测试源后通过。
2. `check:persistence` 扩展后初次失败：检查脚本漏引入 `fs/path`，补齐后通过。
3. Bilibili 外部检查初次失败：HTTP 412，新增 Origin 头后解析和下载均通过。

## 9. 仍需人工确认的问题

- 安装包已生成并通过静态打包检查，但没有在真实 Windows 安装向导中手动点完安装流程。
- 安装包未做代码签名，Windows 可能出现未知发布者提示。
- 外部网站规则随时可能变化，Bilibili、字幕外部链接等 smoke 结果以本次运行时网络环境为准。

## 10. 后续建议

1. 后续可增加安装后自动 smoke，但需要专门的临时安装目录和卸载清理流程。
2. 可以把 Playwright 页面巡检整理成脚本，避免人工操作 CLI。
3. 如果继续扩展 Cookie 能力，建议在 UI 明确显示敏感凭证提示。
4. 可以给 `package.json` 补充 author 字段，减少 electron-builder 警告。
5. 后续发布正式版本前可以考虑代码签名。

## 11. 给用户的下一步操作

使用源码：

```powershell
git clone https://github.com/dec-777/video_tool.git
cd video_tool
npm install
npm run setup:binaries
npm run dev
```

使用安装包：

前往 Release 页面下载 `video_tool.Setup.0.1.1.exe` 并安装。

发布地址：

- https://github.com/dec-777/video_tool/releases/tag/v0.1.1
- https://github.com/dec-777/video_tool/releases/download/v0.1.1/video_tool.Setup.0.1.1.exe
