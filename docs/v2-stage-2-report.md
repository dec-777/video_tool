# V2 阶段 2 报告：首页字幕与命令预览 UI

生成时间：2026-06-07

## 阶段目标

把阶段 1 已完成的 V2 参数能力接入首页 UI，让用户可以在单 URL 下载时配置字幕和查看命令预览。

## 本阶段修改

修改：

- `src/pages/HomePage.jsx`
- `src/styles/global.css`
- `src/layouts/Sidebar.jsx`
- `src/layouts/Topbar.jsx`
- `index.html`

新增验证产物：

- `output/playwright/v2-homepage-stage2.png`

## 实现内容

首页新增 V2 控件：

1. 清晰度选择：最佳、最低、指定分辨率。
2. 分辨率上限输入。
3. 视频容器：MP4、WEBM、MKV、原始。
4. 下载手动字幕。
5. 下载自动字幕。
6. 嵌入字幕。
7. 字幕语言输入。
8. 字幕格式：SRT、VTT、ASS、LRC。
9. 命令预览按钮。
10. 命令预览显示区域。

其他调整：

- 顶栏和侧边栏从 V1 文案更新为 V2。
- `index.html` 增加空 favicon，消除浏览器 404 控制台错误。
- 新增 V2 控件的响应式样式，避免图标和文字遮挡。

## 检查与结果

已运行并通过：

```powershell
npm run build:renderer
npm run check:desktop
npm run check:v2-options
```

浏览器验证：

- 使用 Playwright 打开 `http://127.0.0.1:5290/`。
- 快照确认首页出现 V2 字幕控件。
- 控制台错误数：0。
- 截图：`output/playwright/v2-homepage-stage2.png`。

## 修复记录

发现问题：

- 页面仍显示 V1 文案。
- 浏览器控制台出现 `favicon.ico` 404。

修复：

- `Sidebar.jsx` 改为 `V2 专业下载器`。
- `Topbar.jsx` 改为 `稳定的 yt-dlp V2 工作台`。
- `index.html` 增加 `<link rel="icon" href="data:," />`。

复检：

- `npm run build:renderer` 通过。
- Playwright 控制台错误数为 0。

## 下一阶段

阶段 3 建议继续接入：

1. 批量页字幕选项。
2. 封面与元数据 UI。
3. Cookie 文件选择 IPC。
4. 代理、archive 和命令预览完整设置页。
