# V2 阶段 3 报告：配置页与 Cookie 文件选择

生成时间：2026-06-07

## 阶段目标

让 V2 默认参数可以在设置页保存，并增加安全的 Cookie 文件选择能力。

## 本阶段修改

修改：

- `electron/constants/ipcChannels.js`
- `electron/ipc/fileIpc.js`
- `electron/preload.js`
- `src/api/fileApi.js`
- `src/pages/SettingsPage.jsx`
- `src/styles/global.css`
- `scripts/check-desktop.cjs`
- `scripts/check-persistence.cjs`

新增验证产物：

- `output/playwright/v2-settings-stage3.png`

## 实现内容

新增 `window.api.selectFile(options)`：

- 仅用于打开系统文件选择框。
- 只返回用户选择的文件路径。
- 不暴露任意文件读写能力。
- 文件过滤器会清洗扩展名。

设置页新增 V2 默认项：

1. 清晰度策略、分辨率、容器、format_id。
2. 手动字幕、自动字幕、字幕语言、字幕格式、嵌入字幕。
3. 下载封面、嵌入封面、下载简介、下载 info.json、下载评论、嵌入元数据。
4. Cookie 来源、cookies.txt 文件、浏览器 Cookie 来源。
5. 代理开关、代理地址、重试次数、限速。
6. archive 开关、archive 路径、保留中间文件。

持久化检查增强：

- `scripts/check-persistence.cjs` 已覆盖 V2 嵌套配置保存和读取。

## 检查与结果

已运行并通过：

```powershell
npm run build:renderer
npm run check:desktop
npm run check:persistence
npm run check:v2-options
npm run check:download-smoke
npm run check:task-actions
```

浏览器验证：

- 使用 Playwright 打开设置页。
- 快照确认 V2 设置控件完整出现。
- 控制台错误数：0。
- 截图：`output/playwright/v2-settings-stage3.png`。

## 修复记录

本阶段未发现阻断 bug。

## 下一阶段

阶段 4 建议继续做：

1. 批量页接入 V2 options。
2. 首页接入元数据、Cookie、代理、archive 默认项。
3. 命令预览覆盖更多 V2 UI 选项。
4. 增加真实字幕下载 smoke。
