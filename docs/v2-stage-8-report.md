# V2 阶段 8 报告：archive 管理与历史筛选

生成时间：2026-06-07

## 阶段目标

补齐 V2 文档要求的 archive 文件管理入口，并让历史记录支持关键字、状态和站点筛选。继续保持 Electron 安全边界：前端不直接访问文件系统，所有本地文件动作走 preload 白名单 IPC。

## 本阶段修改

修改文件：

- `electron/constants/ipcChannels.js`
- `electron/ipc/index.js`
- `electron/ipc/historyIpc.js`
- `electron/preload.js`
- `electron/services/commandBuilder.js`
- `electron/services/historyStore.js`
- `src/api/historyApi.js`
- `src/pages/HistoryPage.jsx`
- `src/pages/SettingsPage.jsx`
- `src/styles/global.css`
- `package.json`
- `scripts/check-desktop.cjs`

新增文件：

- `electron/services/archiveService.js`
- `electron/ipc/archiveIpc.js`
- `src/api/archiveApi.js`
- `scripts/check-v2-archive-history.cjs`
- `docs/v2-stage-8-report.md`

## 实现内容

archive 管理：

1. 新增 `archiveService`。
2. 支持获取默认 archive 路径：`app.getPath("userData")/archive.txt`。
3. 支持创建 archive 文件。
4. 支持清空 archive 文件。
5. 支持检查是否存在、文件大小、记录行数、更新时间。
6. archive 文件路径限制为 `.txt`，避免误清空非 archive 文件。
7. 设置页新增：
   - 选择 archive 文件。
   - 检查 archive。
   - 创建并启用。
   - 打开目录。
   - 清空 archive。
   - 状态、记录数量、文件大小和路径展示。

命令构建：

1. `archiveEnabled: true` 且路径为空时，自动使用用户数据目录下的默认 `archive.txt`。
2. `--download-archive` 仍由 `commandBuilder` 统一生成。
3. 前端仍然只传结构化 options，不传命令字符串。

历史筛选：

1. 历史页新增关键字搜索。
2. 历史页新增状态筛选：全部、已完成、失败、已取消。
3. 历史页新增站点筛选。
4. `historyStore.getHistory(filters)` 支持同样的过滤逻辑，便于 IPC 和脚本验证。

## 检查与结果

已运行并通过：

```powershell
npm run check:v2-archive-history
npm run check:v2-options
npm run check:desktop
npm run build:renderer
npm run check:persistence
npm run check:v2-subtitles
npm run check:download-smoke
npm run check:task-actions
npm run check:dev-start
npm run check:v2-playlist
npm run build
npm run check:package
```

结果：

- archive 创建、清空、路径校验通过。
- archive 默认路径参数映射通过。
- 历史关键字、状态、站点筛选通过。
- preload 白名单安全检查通过。
- 渲染构建通过。
- 下载 smoke、任务操作、播放列表回归通过。
- 开发启动检查通过。
- Windows 打包和安装包检查通过。

## 浏览器视觉检查

使用当前项目临时 Vite 服务：

```text
http://127.0.0.1:5296/
```

已确认：

- 页面标题为 `YT-DLP Desktop`，没有打开其他项目。
- 设置页 archive 管理区可见。
- 历史页搜索、状态筛选、站点筛选可见。
- 控制台错误数：0。
- 未发现图标遮挡文字。
- 未发现中文乱码。

截图：

```text
output\playwright\v2-archive-settings.png
output\playwright\v2-history-filters.png
```

## 是否影响 V1 核心功能

不破坏 V1 核心链路：

- 前端仍不暴露 Node API。
- preload 仍是白名单业务 API。
- yt-dlp 仍通过 `spawn(args[])` 调用。
- 历史清空仍只清空历史，不影响 archive 文件。
- 下载 smoke 和任务操作回归均通过。

## 备注

`npm run build` 仍有 electron-builder 的 `author is missed` 和签名跳过提示。这不影响当前 V2 功能验证，正式发布前建议补 `author` 和代码签名。

## 下一阶段建议

继续按 V2 文档收尾：

1. 真实站点字幕下载 smoke。
2. 播放列表页视觉报告补齐。
3. 封面/元数据真实 smoke。
4. V2 完成度审计。
5. 最终 V2 项目总结文档。
