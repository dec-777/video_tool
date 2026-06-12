# V2 阶段 10 报告：封面与元数据真实 smoke

生成时间：2026-06-07

## 阶段目标

验证 V2 的封面和元数据下载不只是参数映射正确，而且能通过任务队列在真实站点下载 sidecar 文件。

## 本阶段修改

修改文件：

- `electron/utils/progressParser.js`
- `package.json`

新增文件：

- `scripts/check-v2-metadata-smoke.cjs`
- `docs/v2-stage-10-report.md`

## 实现内容

1. 新增脚本 `check:v2-metadata-smoke`。
2. 默认使用公开 Vimeo 测试视频：

```text
https://vimeo.com/76979871
```

3. 通过任务队列创建真实视频下载任务，使用 `worst` 质量降低下载体积。
4. 开启 sidecar 元数据：
   - `--write-thumbnail`
   - `--write-description`
   - `--write-info-json`
5. 同时启用嵌入能力：
   - `--embed-thumbnail`
   - `--embed-metadata`
6. `progressParser` 新增识别：

```text
[info] Writing video description to: ...
[info] Writing video thumbnail ... to: ...
[info] Writing video metadata as JSON to: ...
```

## 检查与结果

已运行并通过：

```powershell
npm run check:v2-metadata-smoke
npm run check:v2-options
npm run check:v1-services
npm run check:desktop
npm run build:renderer
```

真实下载与嵌入结果：

```text
metadata smoke passed: metadata.description, metadata.info.json, metadata.jpg, metadata.mp4
```

## 探测记录

1. TED 页面可产出 description 和 info.json，但本次缩略图下载出现 SSL EOF，未作为封面 smoke 默认源。
2. Vimeo 公开视频可稳定产出封面 jpg 和 info.json，因此作为本阶段默认测试源。

## 是否影响 V1 核心功能

不破坏 V1 核心链路：

- 仍然通过 `spawn(args[])` 运行 yt-dlp。
- 前端没有新增危险 API。
- `progressParser` 只新增 sidecar 输出识别，不改变原有进度解析逻辑。
- V1 服务检查、V2 参数检查、桌面安全检查和渲染构建均通过。

## 备注

真实站点 smoke 依赖外部网络和站点可用性。如果 Vimeo 页面将来变更，可通过环境变量替换：

```powershell
$env:METADATA_TEST_URL="https://..."
npm run check:v2-metadata-smoke
```

## 下一阶段建议

继续收尾：

1. 播放列表页视觉报告补齐。
2. V2 完成度审计。
3. 最终 V2 项目总结文档。
