# V2 升级分析与阶段计划

生成时间：2026-06-07

## 1. V1 必须保留的部分

V1 已验证稳定的核心链路继续保留：

1. Electron + React + Vite 启动方式。
2. `preload.js` 白名单 API 与 `contextIsolation: true`。
3. IPC 统一返回 `{ success, data/error }`。
4. `child_process.spawn` 参数数组调用 yt-dlp，禁止 `exec`。
5. `pathUtils` 的开发路径、打包路径、`userData` 路径。
6. `binaryService` 对 yt-dlp / FFmpeg / FFprobe 的检测。
7. `taskQueue` 的队列、取消、重试、状态推送。
8. `progressParser` 对下载、合并、后处理状态的解析。
9. `configStore`、`historyStore`、`logService` 的本地持久化。
10. `scripts/dev.cjs` 的动态端口和项目标记校验。
11. `scripts/build.cjs` 的项目内 Electron 缓存与打包流程。

这些部分是 V2 的基础，不应重写。

## 2. V1 需要小步重构的部分

V2 功能都集中依赖命令参数和配置结构，因此优先小步重构：

1. `commandBuilder.js`
   - 从 V1 的 video/audio 两类参数扩展为 V2 白名单参数生成器。
   - 拆分 base、format、subtitle、metadata、auth、network、file、playlist 参数。
   - 增加 `buildCommandPreview()`，只展示参数，不执行命令。

2. `defaultConfig.js` / `configStore.js`
   - 增加 V2 默认配置字段。
   - 保持旧配置可自动补全，避免破坏用户已有配置。

3. IPC / preload
   - 增加命令预览、文件选择等白名单 API。
   - 继续禁止任意命令执行接口。

4. UI 页面
   - 保留首页快速下载。
   - 增加 V2 页面或设置分区：格式、字幕、封面元数据、Cookie、代理、文件管理、命令预览。
   - 页面只提交结构化 options，不传原始命令。

## 3. V2 阶段顺序

### 阶段 1：V2 参数模型和命令预览

目标：

- 扩展 `DownloadOptions`。
- 支持字幕、封面元数据、Cookie、代理、archive、playlist 范围参数。
- 增加命令预览生成。
- 测试所有参数映射和敏感信息不泄露。

### 阶段 2：配置与 IPC

目标：

- 配置保存 V2 字段。
- 增加选择 Cookie 文件、命令预览 IPC。
- Cookie 文件不存在时返回明确错误。

### 阶段 3：字幕与元数据 UI

目标：

- 在 UI 中加入字幕、封面、元数据设置。
- 首页/批量页能带上 V2 options。
- 下载字幕、自动字幕、字幕格式转换可用。

### 阶段 4：Cookie、代理、archive UI

目标：

- Cookie 文件 / 浏览器 Cookie 设置。
- 代理地址、重试、限速。
- archive 启用、路径显示与清空。

### 阶段 5：真实下载与打包回归

目标：

- 跑 V1 回归。
- 跑 V2 参数检查。
- 跑真实解析/下载 smoke。
- 跑 `npm run build` 和安装包检查。

## 4. 当前第一阶段实施范围

本阶段只动后端参数模型、默认配置和测试脚本，不改下载执行方式，不引入大型依赖，不暴露任意命令执行能力。
