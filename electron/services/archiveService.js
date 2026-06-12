const fs = require("fs");
const path = require("path");
const { getUserDataPath } = require("../utils/pathUtils");

function getDefaultArchivePath() {
  return getUserDataPath("archive.txt");
}

function getArchiveInfo(archivePath = "") {
  const targetPath = normalizeArchivePath(archivePath);
  const exists = fs.existsSync(targetPath);
  const stats = exists ? fs.statSync(targetPath) : null;

  return {
    archivePath: targetPath,
    folderPath: path.dirname(targetPath),
    exists,
    size: stats ? stats.size : 0,
    lineCount: exists ? countArchiveLines(targetPath) : 0,
    updatedAt: stats ? stats.mtimeMs : 0
  };
}

function createArchiveFile(archivePath = "") {
  const targetPath = normalizeArchivePath(archivePath);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });

  if (!fs.existsSync(targetPath)) {
    fs.writeFileSync(targetPath, "", "utf8");
  }

  return getArchiveInfo(targetPath);
}

function clearArchiveFile(archivePath = "") {
  const targetPath = normalizeArchivePath(archivePath);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, "", "utf8");
  return getArchiveInfo(targetPath);
}

function normalizeArchivePath(value) {
  const archivePath = String(value || "").trim() || getDefaultArchivePath();

  if (archivePath.includes("\0")) {
    throw {
      code: "INVALID_ARCHIVE_PATH",
      message: "archive 路径无效",
      rawMessage: "archive path contains null byte"
    };
  }

  if (path.extname(archivePath).toLowerCase() !== ".txt") {
    throw {
      code: "INVALID_ARCHIVE_PATH",
      message: "archive 文件必须是 .txt",
      rawMessage: `Invalid archive extension: ${archivePath}`
    };
  }

  return path.resolve(archivePath);
}

function countArchiveLines(archivePath) {
  try {
    return fs
      .readFileSync(archivePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean).length;
  } catch {
    return 0;
  }
}

module.exports = {
  clearArchiveFile,
  createArchiveFile,
  getArchiveInfo,
  getDefaultArchivePath,
  normalizeArchivePath
};
