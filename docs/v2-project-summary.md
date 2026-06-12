# V2 项目总结

生成时间：2026-06-07

## 项目定位

本项目是基于 Electron + React + Vite + yt-dlp.exe + FFmpeg 的 Windows 桌面下载管理器。V2 在 V1 稳定链路上扩展专业功能，同时继续保持安全边界：

- 前端不直接访问 Node API。
- preload 只暴露业务白名单 API。
- yt-dlp 只通过 `spawn(args[])` 执行。
- 所有下载参数由 `commandBuilder` 统一生成。
- 配置、历史、日志和 archive 写入 `app.getPath("userData")`。

## V1 保留内容

V2 保留了 V1 的核心链路：

1. Electron + React + Vite 启动。
2. 安全 BrowserWindow 配置。
3. preload 白名单 API。
4. IPC 统一返回格式。
5. yt-dlp / FFmpeg / FFprobe 二进制检测。
6. URL 解析、下载任务队列、进度显示。
7. 取消、重试、历史、配置、日志。
8. 中文路径、空格路径和打包路径兼容。
9. NSIS Windows 安装包。

## V2 新增能力

V2 已实现：

1. 播放列表 / 频道解析页。
2. 播放列表选中项下载和范围下载。
3. 视频、音频、仅视频、仅字幕模式。
4. 清晰度策略、分辨率上限、format_id。
5. 字幕提取页。
6. 手动字幕、自动字幕、字幕语言、字幕格式转换。
7. 嵌入字幕真实 smoke。
8. 封面、description、info.json、嵌入封面、嵌入元数据。
9. Cookie 文件和浏览器 Cookie 参数。
10. 代理、重试、限速。
11. archive 创建、检查、清空、打开目录和默认路径。
12. 命令预览。
13. 历史关键字搜索、状态筛选、站点筛选。
14. 真实字幕下载 smoke。
15. 真实封面/元数据 smoke。
16. 完整打包回归。

## 关键文件

后端：

- `electron/services/commandBuilder.js`
- `electron/services/ytdlpService.js`
- `electron/services/taskQueue.js`
- `electron/services/configStore.js`
- `electron/services/historyStore.js`
- `electron/services/archiveService.js`
- `electron/ipc/downloadIpc.js`
- `electron/ipc/archiveIpc.js`
- `electron/preload.js`

前端：

- `src/pages/HomePage.jsx`
- `src/pages/BatchPage.jsx`
- `src/pages/PlaylistPage.jsx`
- `src/pages/SubtitlePage.jsx`
- `src/pages/TasksPage.jsx`
- `src/pages/HistoryPage.jsx`
- `src/pages/SettingsPage.jsx`

验证：

- `scripts/check-v2-options.cjs`
- `scripts/check-v2-subtitles.cjs`
- `scripts/check-v2-subtitle-download-smoke.cjs`
- `scripts/check-v2-embed-subtitle-smoke.cjs`
- `scripts/check-v2-metadata-smoke.cjs`
- `scripts/check-v2-archive-history.cjs`
- `scripts/check-v2-playlist.cjs`

## 如何运行

开发启动：

```powershell
cd E:\du\AI\ai_coding\codex\video_project_codex
npm run dev
```

如果直接运行 npm 命令，必须先进入项目目录：

```powershell
cd E:\du\AI\ai_coding\codex\video_project_codex
```

不要在上一级 `E:\du\AI\ai_coding\codex` 运行，否则没有 `package.json`。

## 如何测试

推荐完整检查：

```powershell
npm run check:desktop
npm run check:binaries
npm run check:v1-services
npm run check:v2-options
npm run check:v2-subtitles
npm run check:v2-archive-history
npm run check:v2-playlist
npm run check:persistence
npm run check:v2-subtitle-download
npm run check:v2-embed-subtitles
npm run check:v2-metadata-smoke
npm run check:download-smoke
npm run check:task-actions
npm run check:dev-start
npm run build
npm run check:package
```

## 打包产物

最新安装包：

```text
release\YT-DLP Desktop Setup 0.1.0.exe
```

## 阶段报告

V2 过程报告：

- `docs/v2-upgrade-analysis.md`
- `docs/v2-stage-1-report.md`
- `docs/v2-stage-2-report.md`
- `docs/v2-stage-3-report.md`
- `docs/v2-stage-4-report.md`
- `docs/v2-stage-5-report.md`
- `docs/v2-stage-6-report.md`
- `docs/v2-stage-7-report.md`
- `docs/v2-stage-8-report.md`
- `docs/v2-stage-9-report.md`
- `docs/v2-stage-10-report.md`
- `docs/v2-stage-11-report.md`
- `docs/v2-stage-12-report.md`
- `docs/v2-completion-audit.md`

## 发布备注

1. electron-builder 仍提示缺少 `author`。
2. 当前未配置代码签名，正式发布建议补签名。
3. 浏览器 Cookie、代理、评论下载依赖用户环境和目标站点能力。
4. V3 可继续扩展系统托盘、自动更新、浏览器插件、SQLite、内置播放器等。
