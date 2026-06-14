# video_tool

`video_tool` 是一个面向 Windows 的桌面视频下载工具，底层使用 `yt-dlp` 和 FFmpeg，界面使用 Electron + React + Vite 构建。

## 直接下载安装

前往 Releases 页面下载最新版安装程序：

[Download video_tool](https://github.com/dec-777/video_tool/releases/latest)

下载 `video_tool Setup 0.1.0.exe` 后双击安装即可使用。

## 功能介绍

### 单链接下载

- 输入一个视频链接并解析视频信息。
- 支持下载视频 MP4。
- 支持提取音频 MP3 / M4A。
- 支持仅下载视频流。
- 支持自定义保存目录和文件名模板。

### 批量下载

- 支持一次粘贴多个链接。
- 一行一个 URL。
- 自动过滤空行。
- 自动去重。
- 每个链接会生成独立任务，单个失败不会阻塞其他任务。

### 播放列表

- 支持解析播放列表。
- 可查看播放列表条目。
- 可选择需要下载的条目。
- 支持将播放列表任务加入本地下载队列。

### 字幕提取

- 支持下载手动字幕。
- 支持下载自动字幕。
- 支持选择字幕语言。
- 支持 SRT / VTT / ASS / LRC 格式。
- 支持字幕独立下载或随视频嵌入。

### 下载任务管理

- 本地任务队列。
- 下载进度显示。
- 下载速度显示。
- ETA 显示。
- 支持取消任务。
- 支持失败后重试。
- 支持下载完成后打开文件夹。
- 支持查看任务日志信息。

### 历史记录

- 自动记录完成、失败等下载历史。
- 支持按关键字、状态、站点筛选历史。
- 支持重新下载历史任务。
- 支持清空历史记录。

### 高级选项

- 支持清晰度选择。
- 支持指定分辨率上限。
- 支持指定 `format_id`。
- 支持选择视频容器。
- 支持保存封面、描述、info.json 等元数据。
- 支持 Cookie 文件。
- 支持代理设置。
- 支持 archive 跳过已下载记录。
- 支持命令预览。

### 设置

- 默认保存目录。
- 默认下载模式。
- 默认音频格式。
- 默认文件名模板。
- 并发下载数量。
- yt-dlp / FFmpeg 检测状态。
- 恢复默认设置。

## 本地运行源码

需要：

- Windows 10 / Windows 11
- Node.js 20+
- npm
- PowerShell 5+

```powershell
git clone https://github.com/dec-777/video_tool.git
cd video_tool
npm install
npm run setup:binaries
npm run dev
```

`npm run setup:binaries` 会自动下载本地运行需要的：

- `bin/yt-dlp.exe`
- `bin/ffmpeg.exe`
- `bin/ffprobe.exe`

仓库不会提交这些 `.exe` 文件。

## 项目结构

```text
electron/   Electron 主进程、preload、IPC 和下载服务
src/        React 前端界面
scripts/    开发、打包、检查和二进制下载脚本
docs/       项目文档与阶段报告
build/      应用图标资源
bin/        本地下载的二进制工具，Git 默认忽略
data/       示例配置
```

## 安全说明

- 前端页面不直接访问 Node.js 系统 API。
- 所有系统能力通过 preload 白名单 API 暴露。
- `yt-dlp` 只通过 `child_process.spawn(args[])` 调用。
- 不暴露任意命令执行接口。
- 配置、历史和日志写入 Electron `userData` 目录。
