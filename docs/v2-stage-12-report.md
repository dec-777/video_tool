# V2 阶段 12 报告：嵌入字幕真实 smoke

生成时间：2026-06-07

## 阶段目标

补齐“嵌入字幕”真实验证，避免只用参数检查证明 `--embed-subs`。本阶段使用本地 HTML + video + track 字幕，让 yt-dlp 通过 generic extractor 解析字幕，再经过任务队列下载并嵌入到视频文件。

## 本阶段修改

修改文件：

- `package.json`

新增文件：

- `scripts/check-v2-embed-subtitle-smoke.cjs`
- `docs/v2-stage-12-report.md`

## 实现内容

脚本 `check:v2-embed-subtitles` 会自动：

1. 使用 FFmpeg 生成 2 秒本地 MP4。
2. 生成本地 `sub.en.vtt` 字幕。
3. 生成包含 `<video>` 和 `<track>` 的本地 HTML。
4. 启动本地 HTTP 服务。
5. 通过任务队列创建 V2 视频任务：
   - `writeSubs: true`
   - `languages: ["en"]`
   - `format: "vtt"`
   - `embed: true`
6. 下载完成后用 FFprobe 检查输出视频是否存在字幕流。

## 检查与结果

已运行并通过：

```powershell
npm run check:v2-embed-subtitles
npm run check:v2-subtitles
npm run check:v1-services
npm run build:renderer
```

真实结果：

```text
embed subtitle smoke passed: embedded.mp4
```

## 关键说明

- 该 smoke 不依赖外部网站，稳定性比公开视频更高。
- 仍然通过任务队列和 `commandBuilder` 生成 yt-dlp 参数。
- 仍然通过 `spawn(args[])` 调用 yt-dlp。
- FFprobe 用于验证输出媒体文件中确实有字幕流。

## 是否影响 V1 核心功能

不影响 V1 核心功能。本阶段只新增测试脚本和 npm script，渲染构建、V1 服务检查和 V2 字幕检查均通过。

## 下一阶段建议

执行最终 V2 完成度审计，并输出 V2 项目总结文档。
