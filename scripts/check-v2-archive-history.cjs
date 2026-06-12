const fs = require("fs");
const path = require("path");
const { app } = require("electron");
const { useWorkspaceUserData } = require("./testUserData.cjs");
const {
  clearArchiveFile,
  createArchiveFile,
  getArchiveInfo,
  getDefaultArchivePath,
  normalizeArchivePath
} = require("../electron/services/archiveService");
const { buildYtdlpArgs } = require("../electron/services/commandBuilder");
const {
  addHistoryRecord,
  clearHistory,
  getHistory
} = require("../electron/services/historyStore");

useWorkspaceUserData(app, "check-v2-archive-history");

const root = path.join(__dirname, "..");
const outputDir = path.join(root, "downloads", "archive 历史 检查");
const archivePath = path.join(root, ".tmp", "archive 管理 检查.txt");

app.whenReady()
  .then(() => {
    fs.mkdirSync(outputDir, { recursive: true });
    fs.mkdirSync(path.dirname(archivePath), { recursive: true });

    const defaultArchivePath = getDefaultArchivePath();
    const emptyInfo = getArchiveInfo("");
    if (emptyInfo.archivePath !== defaultArchivePath) {
      throw new Error("empty archive path did not resolve to userData archive.txt");
    }

    const createdInfo = createArchiveFile(archivePath);
    if (!createdInfo.exists || createdInfo.archivePath !== path.resolve(archivePath)) {
      throw new Error("archive file was not created");
    }

    fs.writeFileSync(archivePath, "youtube abc\nbilibili def\n\n", "utf8");
    const filledInfo = getArchiveInfo(archivePath);
    if (filledInfo.lineCount !== 2 || filledInfo.size === 0) {
      throw new Error("archive info did not count non-empty lines");
    }

    const clearedInfo = clearArchiveFile(archivePath);
    if (!clearedInfo.exists || clearedInfo.lineCount !== 0 || clearedInfo.size !== 0) {
      throw new Error("archive file was not cleared");
    }

    assertThrows(
      () => normalizeArchivePath(path.join(root, ".tmp", "archive.exe")),
      "invalid archive extension was accepted"
    );

    const args = buildYtdlpArgs({
      urls: ["https://example.com/archive"],
      mode: "video",
      file: {
        outputDir,
        outputTemplate: "%(title)s.%(ext)s",
        archiveEnabled: true,
        archivePath: ""
      }
    });
    assertIncludes(args, ["--download-archive", defaultArchivePath]);

    clearHistory();
    addHistoryRecord({
      id: "history_alpha",
      title: "Alpha 完成",
      url: "https://example.com/a",
      site: "example",
      status: "completed",
      outputDir,
      completedAt: 1
    });
    addHistoryRecord({
      id: "history_beta",
      title: "Beta 失败",
      url: "https://bilibili.com/video",
      site: "bilibili",
      status: "failed",
      outputDir,
      completedAt: 2,
      error: "网络错误"
    });
    addHistoryRecord({
      id: "history_gamma",
      title: "Gamma 取消",
      url: "https://youtube.com/watch?v=1",
      site: "youtube",
      status: "canceled",
      outputDir,
      completedAt: 3
    });

    assertHistoryCount({ keyword: "Alpha" }, 1);
    assertHistoryCount({ status: "failed" }, 1);
    assertHistoryCount({ site: "youtube" }, 1);
    assertHistoryCount({ keyword: "网络", status: "failed", site: "bilibili" }, 1);
    assertHistoryCount({ keyword: "网络", status: "completed" }, 0);

    assertRendererContains("src/pages/SettingsPage.jsx", "检查 archive");
    assertRendererContains("src/pages/SettingsPage.jsx", "清空 archive");
    assertRendererContains("src/pages/HistoryPage.jsx", "history-filter-bar");
    assertRendererContains("src/pages/HistoryPage.jsx", "站点筛选");

    clearHistory();
    console.log("v2 archive and history checks passed");
    app.exit(0);
  })
  .catch((error) => {
    console.error(error.message || error);
    app.exit(1);
  });

function assertIncludes(args, expected) {
  for (const item of expected) {
    if (!args.includes(item)) {
      throw new Error(`Expected args to include ${item}. Actual: ${args.join(" ")}`);
    }
  }
}

function assertHistoryCount(filters, expectedCount) {
  const records = getHistory(filters);
  if (records.length !== expectedCount) {
    throw new Error(`Expected ${expectedCount} history records for ${JSON.stringify(filters)}, got ${records.length}`);
  }
}

function assertRendererContains(file, text) {
  const fullPath = path.join(root, file);
  const source = fs.readFileSync(fullPath, "utf8");
  if (!source.includes(text)) {
    throw new Error(`${file} does not contain ${text}`);
  }
}

function assertThrows(fn, message) {
  try {
    fn();
  } catch {
    return;
  }

  throw new Error(message);
}
