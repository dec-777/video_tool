# V2 阶段 5 报告：开发启动检查回归修复

生成时间：2026-06-07

## 阶段目标

修复 V2 回归中 `check:dev-start` 与开发启动 fallback 逻辑不一致的问题。

## 初始失败

命令：

```powershell
npm run check:dev-start
```

失败：

```text
timed out waiting for foreign renderer rejection
```

原因：

- `start-electron-dev.cjs` 已支持当传入端口不是本项目时继续扫描 5273 起始端口，找到正确的 `video_project_codex` 前端后启动 Electron。
- 检查脚本的假前端用例仍按旧逻辑要求进程必须直接退出。
- 当前机器上 5273 有本项目 Vite 服务，导致启动器找到正确项目并继续启动，测试等待退出超时。

## 修复

修改：

- `scripts/start-electron-dev.cjs`
- `scripts/check-dev-start.cjs`

实现：

- 增加仅测试使用的 `YTDLP_DESKTOP_DISABLE_FALLBACK=1`。
- 假前端拒绝用例设置该变量，强制验证“错误项目会被拒绝”。
- 正常 `npm run dev` 仍保留自动扫描本项目端口的能力。

## 检查与结果

已运行并通过：

```powershell
npm run check:dev-start
npm run check:desktop
npm run check:v2-options
npm run check:download-smoke
npm run build:renderer
```

## 结论

开发启动保护仍然有效：不会打开其他项目的前端；同时在普通开发模式下仍可自动找到本项目可用端口。
