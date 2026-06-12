# video_tool 品牌与图标阶段报告

日期：2026-06-13

## 阶段目标

将应用相关名称统一为 `video_tool`，并将用户提供的霓虹图标替换为应用图标。

## 修改内容

1. 应用名称统一：
   - `package.json`：`name`、`description`、`build.appId`、`build.productName`
   - `package-lock.json`：根包名
   - `index.html`：页面标题与项目识别标记
   - `electron/main.js`：Electron 应用名
   - `src/layouts/Sidebar.jsx`：侧边栏品牌名
   - `src/layouts/Topbar.jsx`：顶部标题
   - `scripts/dev.cjs`、`scripts/start-electron-dev.cjs`、`scripts/check-dev-start.cjs`：开发启动项目识别
   - `scripts/check-package.ps1`：安装包和可执行文件名检查

2. 图标替换：
   - 新增 `src/assets/video-tool-icon.png`
   - 更新 `build/icon.png`
   - 更新 `build/icon.ico`
   - `src/layouts/Sidebar.jsx` 改为显示新图标图片
   - `src/styles/global.css` 调整品牌图标容器
   - `electron/windowManager.js` 设置 BrowserWindow 图标
   - `package.json` 将 `build/icon.ico` 作为 `extraResources` 打包到 `resources/icon.ico`

3. 旧产物清理：
   - 删除旧的 `release/YT-DLP Desktop Setup 0.1.0.exe`
   - 删除旧的 `release/YT-DLP Desktop Setup 0.1.0.exe.blockmap`

## 失败与修复记录

第一次替换图标时，手工生成的 PNG-ICO 可以被 Electron Builder 接受，但 NSIS 静默安装检查失败：

```text
Installer failed with exit code -1073741819
```

修复方式：

1. 使用 Pillow 重新生成标准多尺寸 Windows ICO。
2. 包含 `16x16`、`24x24`、`32x32`、`48x48`、`64x64`、`128x128`、`256x256` 多尺寸图标。
3. 重新运行完整打包与安装检查。

## 检查结果

已通过：

```text
npm run check:desktop
npm run build:renderer
npm run check:dev-start
npm run build
npm run check:package
```

可视化检查：

```text
output/playwright/video-tool-sidebar.png
```

确认结果：

1. 页面标题为 `video_tool`。
2. 侧边栏品牌为 `video_tool`。
3. 顶部标题为 `稳定的 video_tool 工作台`。
4. 侧边栏显示用户提供的新图标。
5. 安装包名为 `video_tool Setup 0.1.0.exe`。
6. 解包可执行文件名为 `video_tool.exe`。
7. 安装后存在 `resources/icon.ico`。
8. 中文和空格路径启动检查通过。

## 当前产物

```text
release/video_tool Setup 0.1.0.exe
release/win-unpacked/video_tool.exe
build/icon.ico
src/assets/video-tool-icon.png
```

## 结论

本阶段完成。应用相关名称和图标已统一为 `video_tool`，并通过开发启动、前端构建、完整打包、安装后启动和可视化检查。
