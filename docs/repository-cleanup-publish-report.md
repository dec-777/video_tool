# 仓库精简与发布报告

日期：2026-06-13

## 目标

精简 `video_tool` 项目仓库，删除无意义的依赖、构建产物和 yt-dlp 上游源码残留，并准备发布到：

```text
https://github.com/dec-777/video_tool.git
```

## 精简结论

前端源码不是两百多万行。清理前的巨大变化主要来自：

1. `release/` 打包产物，约 2.1GB。
2. `node_modules/` 依赖目录，约 678MB。
3. `.tmp/` 构建缓存，约 179MB。
4. `downloads/` 本地下载文件，约 169MB。
5. `.venv/` Python 虚拟环境。
6. `yt_dlp/`、`test/`、`devscripts/`、`bundle/` 等 yt-dlp 上游源码。

当前业务源码统计：

```text
src/       28 files, 4045 lines
electron/ 32 files, 2082 lines
scripts/  22 files, 2383 lines
data/      1 file,  10 lines
```

前端模块引用检查未发现可以安全删除且完全未引用的组件或工具文件，因此没有为了减少行数硬删业务功能代码。

## 已删除内容

已从项目工作区删除：

1. yt-dlp 上游源码和测试目录：`yt_dlp/`、`test/`、`devscripts/`、`bundle/`
2. Python/上游项目文件：`pyproject.toml`、`uv.lock`、`Makefile`、`supportedsites.md` 等
3. 本地生成物：`node_modules/`、`dist/`、`release/`、`.tmp/`、`downloads/`
4. 旧命令脚本：`yt-dlp.cmd`、`yt-dlp.sh`、`启动-yt-dlp.cmd`、`更新-yt-dlp.cmd`

## 新增部署能力

新增：

```text
scripts/setup-binaries.ps1
```

该脚本会下载本地运行需要的二进制工具：

1. `bin/yt-dlp.exe`
2. `bin/ffmpeg.exe`
3. `bin/ffprobe.exe`

原因：`ffmpeg.exe` 和 `ffprobe.exe` 单文件超过 GitHub 普通文件大小限制，不适合提交到仓库。

## 更新内容

1. `.gitignore` 改为 Electron 项目专用规则。
2. `README.md` 改为 `video_tool` 部署说明。
3. `package.json` 新增：

```text
npm run setup:binaries
predev
prebuild
```

## 检查记录

通过：

```text
npm install
npm run setup:binaries
npm run check:desktop
npm run build:renderer
npm run check:dev-start
npm run build
npm run check:package
```

其中：

1. `npm install` 初次因 Electron 下载 `ECONNRESET` 失败。
2. 增加 `.npmrc` 国内镜像配置后重新安装成功。
3. `npm run build` 初次因 NSIS 下载 `EOF` 失败。
4. 重新运行后下载成功并打包通过。

## 发布策略

当前目录原本是 `yt-dlp/yt-dlp` 仓库历史。为避免污染 `dec-777/video_tool.git`，已创建无父提交的干净 `main` 分支，只提交 `video_tool` 项目源码、脚本、文档和必要资源。

不提交：

```text
node_modules/
dist/
release/
bin/*.exe
.tmp/
downloads/
```

## 结论

本阶段完成。项目已精简为可部署的 Electron 桌面应用源码结构，其他人 clone 后可以按 README 执行：

```powershell
npm install
npm run setup:binaries
npm run dev
```
