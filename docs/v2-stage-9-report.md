# V2 阶段 9 报告：真实字幕下载 smoke

生成时间：2026-06-07

## 阶段目标

在 V2 字幕 UI 和参数能力完成后，增加真实站点字幕下载 smoke，验证 `subtitle-only` 不只是命令参数正确，而且能通过任务队列实际下载字幕文件。

## 本阶段修改

修改文件：

- `electron/utils/progressParser.js`
- `package.json`

新增文件：

- `scripts/check-v2-subtitle-download-smoke.cjs`
- `docs/v2-stage-9-report.md`

## 实现内容

1. 新增脚本 `check:v2-subtitle-download`。
2. 默认使用公开 TED 页面：

```text
https://www.ted.com/talks/ken_robinson_says_schools_kill_creativity
```

3. 默认下载英文字幕：

```text
subtitle.en.vtt
```

4. 脚本可通过环境变量改测试源：

```powershell
$env:SUBTITLE_TEST_URL="https://..."
$env:SUBTITLE_TEST_LANG="en"
npm run check:v2-subtitle-download
```

5. `progressParser` 新增识别：

```text
[info] Writing video subtitles to: ...
```

这样仅字幕任务也能尽量记录输出文件路径。

## 检查与结果

已运行并通过：

```powershell
npm run check:v2-subtitle-download
npm run check:v1-services
npm run check:v2-subtitles
npm run build:renderer
npm run check:desktop
```

真实下载结果：

```text
subtitle download smoke passed: subtitle.en.vtt
```

## 失败与修复记录

验证前先探测了几个公开源：

1. YouTube yt-dlp 测试视频当前返回 `Video unavailable`。
2. archive.org 的 Elephants Dream / Sintel 可解析，但没有字幕。
3. TED 页面可列出多语言 vtt 字幕，并通过真实下载 smoke。

因此本阶段最终选择 TED 页面作为默认真实字幕 smoke 源。

## 是否影响 V1 核心功能

不破坏 V1 核心链路：

- `progressParser` 只是新增字幕输出识别，不改变原有下载进度解析。
- `check:v1-services` 通过。
- `check:desktop` 通过。
- `build:renderer` 通过。

## 备注

真实站点 smoke 依赖外部网络和站点可用性。如果 TED 页面将来变更，可通过 `SUBTITLE_TEST_URL` / `SUBTITLE_TEST_LANG` 临时替换测试源。

## 下一阶段建议

继续按 V2 文档收尾：

1. 封面/元数据真实 smoke。
2. 播放列表页视觉报告补齐。
3. V2 完成度审计。
4. 最终 V2 项目总结文档。
