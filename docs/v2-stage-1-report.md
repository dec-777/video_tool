# V2 阶段 1 报告：参数模型与命令预览

生成时间：2026-06-07

## 阶段目标

完成 V2 参数模型的后端基础能力，让字幕、封面元数据、Cookie、代理、archive、playlist 范围和命令预览都通过白名单结构化 options 生成，不允许前端拼接任意命令。

## 保留的 V1 能力

1. 下载仍由 `taskQueue` 调用 `startDownloadProcess`。
2. yt-dlp 仍使用 `spawn(ytdlpPath, args)`。
3. 路径仍通过 `path.join()`。
4. IPC 仍统一返回 `{ success, data/error }`。
5. 前端仍不直接调用 Node API。
6. V1 的 MP4 / MP3 / M4A 下载 smoke 继续通过。

## 本阶段修改

新增：

- `docs/v2-upgrade-analysis.md`
- `docs/v2-stage-1-report.md`
- `scripts/check-v2-options.cjs`

修改：

- `electron/services/commandBuilder.js`
- `electron/constants/defaultConfig.js`
- `electron/services/configStore.js`
- `electron/constants/ipcChannels.js`
- `electron/ipc/downloadIpc.js`
- `electron/preload.js`
- `src/api/downloadApi.js`
- `scripts/check-desktop.cjs`
- `package.json`

## 实现内容

`commandBuilder.js` 已拆分为：

1. `buildBaseArgs`
2. `buildFormatArgs`
3. `buildSubtitleArgs`
4. `buildMetadataArgs`
5. `buildAuthArgs`
6. `buildNetworkArgs`
7. `buildFileArgs`
8. `buildPlaylistArgs`
9. `buildCommandPreview`
10. `normalizeDownloadOptions`

支持的 V2 参数：

- 清晰度：best / worst / resolution / formatId
- 容器：mp4 / webm / mkv / original
- 音频：mp3 / m4a / opus / wav / flac
- 字幕：手动字幕、自动字幕、语言、格式转换、嵌入
- 元数据：封面、嵌入封面、简介、info.json、评论、嵌入元数据
- Cookie：cookies.txt、浏览器 Cookie
- 网络：代理、重试次数、限速
- 文件：archive、保留中间文件
- 播放列表：start、end、items
- 命令预览：仅展示，不执行

## 阶段检查

已运行并通过：

```powershell
npm run check:v2-options
npm run check:v1-services
npm run check:desktop
npm run check:persistence
npm run check:download-smoke
npm run build:renderer
```

## 修复记录

阶段检查第一次失败：

```text
cookiesFile is not defined
```

原因：`scripts/check-v2-options.cjs` 中 Cookie 文件字段用了错误的变量简写。

修复：改为 `cookiesFile: cookieFile`。

复检：`npm run check:v2-options` 通过。

## 下一阶段

阶段 2 将把字幕和命令预览接入 UI，让用户可以在首页选择：

1. 下载手动字幕。
2. 下载自动字幕。
3. 字幕语言。
4. 字幕格式。
5. 嵌入字幕。
6. 查看命令预览。
