# V2 阶段 4 报告：首页与批量页使用 V2 默认项

生成时间：2026-06-07

## 阶段目标

让设置页保存的 V2 默认项真正参与首页和批量下载任务，避免“配置保存了但下载不生效”。

## 本阶段修改

修改：

- `src/pages/HomePage.jsx`
- `src/pages/BatchPage.jsx`

## 实现内容

首页下载现在会携带：

1. 清晰度策略、分辨率、format_id、容器。
2. 手动字幕、自动字幕、字幕语言、字幕格式、嵌入字幕。
3. 设置页保存的封面与元数据选项。
4. 设置页保存的 Cookie 选项。
5. 设置页保存的代理、重试次数、限速。
6. 设置页保存的 archive、保留中间文件。
7. 设置页保存的 playlist 范围。

批量下载现在会携带：

1. 设置页保存的质量参数。
2. 设置页保存的字幕参数。
3. 设置页保存的封面元数据参数。
4. 设置页保存的 Cookie、代理、archive 和 playlist 参数。

兼容性修复：

- 首页和设置页兼容旧配置中字幕语言为字符串的情况。

## 检查与结果

已运行并通过：

```powershell
npm run build:renderer
npm run check:desktop
npm run check:v2-options
npm run check:persistence
npm run check:download-smoke
```

## 修复记录

发现风险：

- 字幕语言字段如果不是数组，页面 `.join()` 可能报错。

修复：

- 增加 `formatLanguageInput()` 兼容数组、字符串和空值。

复检：

- `npm run build:renderer` 通过。

## 下一阶段

继续补齐 V2：

1. 播放列表解析 UI。
2. 历史搜索与筛选。
3. archive 文件管理。
4. 真实字幕下载 smoke。
5. 最终打包回归。
