# V2 完成度审计

生成时间：2026-06-07

## 审计结论

V2 已在 V1 稳定链路上完成主要升级：播放列表、格式/清晰度、字幕、封面元数据、Cookie、代理、archive、命令预览、历史筛选、真实 smoke 和打包回归均有当前证据。

V2 没有引入任意命令执行接口；前端仍不直接访问 Node API；yt-dlp 仍通过 `spawn(args[])` 执行。

## 需求对照

| V2 项 | 当前状态 | 证据 |
|---|---|---|
| V1 保留/重构分析 | 已完成 | `docs/v2-upgrade-analysis.md` |
| 安全 preload 白名单 | 已完成 | `npm run check:desktop` |
| spawn 参数数组调用 yt-dlp | 已完成 | `npm run check:desktop`、`taskQueue` / `ytdlpService` |
| V2 参数模型 | 已完成 | `npm run check:v2-options` |
| 命令预览 | 已完成 | 首页、字幕页、`DOWNLOAD.PREVIEW` |
| 视频/音频/仅视频/仅字幕模式 | 已完成 | 首页、批量页、播放列表页、设置页 |
| 指定清晰度 | 已完成 | `quality.preset=resolution`、`check:v2-options` |
| 指定 format_id | 已完成 | `quality.preset=formatId`、缺失时明确报错 |
| 字幕下载 | 已完成 | `npm run check:v2-subtitles`、`npm run check:v2-subtitle-download` |
| 自动字幕参数 | 已完成 | `npm run check:v2-options` |
| 嵌入字幕 | 已完成 | `npm run check:v2-embed-subtitles` |
| 字幕页 | 已完成 | `src/pages/SubtitlePage.jsx`、`v2-stage-7-report.md` |
| 播放列表/频道解析 UI | 已完成 | `src/pages/PlaylistPage.jsx`、`npm run check:v2-playlist` |
| 播放列表范围下载 | 已完成 | `--playlist-start` / `--playlist-end` / `--playlist-items` |
| 封面下载 | 已完成 | `npm run check:v2-metadata-smoke` |
| info.json / description | 已完成 | `npm run check:v2-metadata-smoke` |
| 嵌入封面/元数据 | 已完成 | `npm run check:v2-metadata-smoke` |
| 评论下载参数 | 已完成 | 设置页 + `--write-comments` 参数映射 |
| Cookie 文件 | 已完成 | 设置页选择 cookies.txt、路径存在性校验、`--cookies` |
| 浏览器 Cookie | 已完成 | 设置页浏览器来源、`--cookies-from-browser` |
| 代理 | 已完成 | 代理格式校验、`--proxy` 参数映射 |
| retries / fragment retries | 已完成 | `--retries`、`--fragment-retries`、retry sleep |
| 限速 | 已完成 | `--limit-rate` 校验和映射 |
| archive 跳过已下载 | 已完成 | `archiveService`、`npm run check:v2-archive-history` |
| archive 管理 UI | 已完成 | 设置页检查、创建、清空、打开目录 |
| 历史搜索/筛选 | 已完成 | 历史页 UI、`historyStore.getHistory(filters)` |
| 批量任务携带 V2 options | 已完成 | `BatchPage.jsx`、阶段 4 报告 |
| 配置持久化 | 已完成 | `npm run check:persistence` |
| 下载 smoke | 已完成 | `npm run check:download-smoke` |
| 任务取消/重试 | 已完成 | `npm run check:task-actions` |
| 开发启动与项目区分 | 已完成 | `npm run check:dev-start` |
| Windows 打包 | 已完成 | `npm run build` |
| 安装包检查 | 已完成 | `npm run check:package` |

## 当前最终检查

最终阶段已运行并通过：

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

## 视觉检查证据

已通过 Playwright 检查：

```text
output\playwright\v2-subtitle-home.png
output\playwright\v2-subtitle-page.png
output\playwright\v2-archive-settings.png
output\playwright\v2-history-filters.png
output\playwright\v2-playlist-page.png
```

视觉检查结论：

- 未打开其他项目。
- 页面标题为 `YT-DLP Desktop`。
- 无控制台错误。
- 未发现图标遮挡文字。
- 未发现中文乱码。

## 已知边界

1. 浏览器 Cookie 和代理已经实现参数、校验和 UI，但真实有效性取决于用户本机浏览器配置、代理服务和目标网站。
2. 评论下载已实现参数和 UI，真实下载取决于目标站点是否被 yt-dlp 支持。
3. SQLite、系统托盘、自动更新、浏览器插件、内置播放器、云同步和账号系统属于后续 V3 或更高版本范围。
4. electron-builder 仍提示 `author is missed` 和签名跳过；不影响当前开发和安装包检查，正式发布建议补 author 和代码签名。

## 审计结论

V2 目标已经达到当前文档定义的桌面专业版功能集，并保留 V1 安全、稳定、可打包核心链路。
