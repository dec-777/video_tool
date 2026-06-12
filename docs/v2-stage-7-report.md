# V2 阶段 7 报告：字幕提取入口补齐

生成时间：2026-06-07

## 阶段目标

修复 V2 字幕能力“后端已支持、前端入口不清晰”的问题，让用户可以直接创建仅字幕下载任务，并确保 `subtitle-only` 参数、配置保存和页面入口都可验证。

## 本阶段修改

修改文件：

- `electron/services/commandBuilder.js`
- `electron/services/ytdlpService.js`
- `electron/services/configStore.js`
- `src/App.jsx`
- `src/layouts/Sidebar.jsx`
- `src/pages/HomePage.jsx`
- `src/pages/BatchPage.jsx`
- `src/pages/PlaylistPage.jsx`
- `src/pages/SettingsPage.jsx`
- `src/styles/global.css`
- `package.json`
- `scripts/check-v2-options.cjs`

新增文件：

- `src/pages/SubtitlePage.jsx`
- `scripts/check-v2-subtitles.cjs`
- `docs/v2-stage-7-report.md`

## 实现内容

1. 新增“字幕提取”导航页。
2. 字幕页支持：
   - 输入视频 URL。
   - 解析字幕语言。
   - 下载手动字幕。
   - 下载自动字幕。
   - 指定字幕语言。
   - 选择 SRT / VTT / ASS / LRC。
   - 生成命令预览。
   - 创建 `subtitle-only` 下载任务。
3. 首页下载模式新增：
   - 仅视频。
   - 仅字幕。
4. 批量页下载模式新增：
   - 仅视频。
   - 仅字幕。
5. 播放列表页下载模式新增：
   - 仅视频。
   - 仅字幕。
6. 设置页默认下载模式新增：
   - 仅视频。
   - 仅字幕。
7. `configStore` 允许 `defaultMode` 保存 `video-only` 和 `subtitle-only`。
8. `mapVideoInfo` 返回 `subtitles` 和 `automaticCaptions`，供字幕页展示可用语言。
9. `commandBuilder` 修复 `subtitle-only` 下不再传 `--embed-subs`，避免“跳过下载但嵌入字幕”的无效组合。

## 关键设计说明

- 前端仍只提交结构化 options，不传任意命令字符串。
- yt-dlp 参数仍统一由 `commandBuilder` 生成。
- `subtitle-only` 固定生成 `--skip-download`，只下载字幕文件。
- 字幕页不会启用 `embed`，因为仅字幕模式没有视频文件可嵌入。
- 解析字幕语言只读取 yt-dlp JSON 的 `subtitles` / `automatic_captions` 字段，不暴露 Node API。

## 检查与结果

已运行并通过：

```powershell
npm run check:v2-subtitles
npm run check:v2-options
npm run check:desktop
npm run build:renderer
npm run check:persistence
npm run check:v2-playlist
npm run check:dev-start
npm run check:download-smoke
npm run check:binaries
npm run check:v1-services
npm run check:task-actions
npm run build
npm run check:package
```

其中 `npm run check:binaries` 确认：

- yt-dlp：`2026.03.17`
- FFmpeg：`7.1.1-full_build-www.gyan.dev`
- FFprobe：`7.1.1-full_build-www.gyan.dev`

## 失败与修复记录

第一次检查时把 `npm run build` 和 `npm run check:package` 并行执行，`check:package` 在打包复制完成前检查目标 exe，失败信息为：

```text
Path check executable not found: release\路径 检查\YT-DLP Desktop.exe
```

处理方式：

1. 等 `npm run build` 完成。
2. 顺序重跑 `npm run check:package`。
3. 结果通过。

结论：这是检查命令并行执行造成的竞态，不是代码或安装包产物缺失。

## 浏览器视觉检查

使用当前项目的临时 Vite 服务：

```text
http://127.0.0.1:5295/
```

已确认：

- 页面标题为 `YT-DLP Desktop`，没有打开其他项目。
- 左侧导航出现 `字幕提取`。
- 首页下载模式出现 `仅字幕`。
- 设置页默认下载模式出现 `仅字幕`。
- 控制台错误数：0。
- 未发现图标遮挡文字。
- 未发现中文乱码。

截图：

```text
output\playwright\v2-subtitle-home.png
output\playwright\v2-subtitle-page.png
```

## 是否影响 V1 核心功能

不破坏 V1 核心链路：

- Electron preload 仍是白名单 API。
- 前端仍不直接访问 Node API。
- yt-dlp 仍通过 `spawn(args[])` 调用。
- 下载 smoke 通过。
- 打包检查通过。

## 下一阶段建议

继续按 V2 文档收尾：

1. archive 文件管理入口。
2. 历史搜索与筛选。
3. 播放列表页视觉报告补齐。
4. 真实站点字幕下载 smoke。
5. 最终 V2 项目总结文档。
