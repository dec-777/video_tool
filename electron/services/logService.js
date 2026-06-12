const fs = require("fs");
const path = require("path");
const { getUserDataPath } = require("../utils/pathUtils");

function ensureLogDir() {
  try {
    const logDir = getUserDataPath("logs");
    fs.mkdirSync(logDir, { recursive: true });
    return logDir;
  } catch {
    return "";
  }
}

function writeAppLog(message, details) {
  const logDir = ensureLogDir();
  if (!logDir) {
    return;
  }

  writeLogFile(path.join(logDir, "app.log"), formatLine(message, details));
}

function writeTaskLog(taskId, message, details) {
  if (!taskId) {
    return;
  }

  const safeTaskId = String(taskId).replace(/[^a-zA-Z0-9_-]/g, "_");
  const logDir = ensureLogDir();
  if (!logDir) {
    return;
  }

  writeLogFile(path.join(logDir, `task-${safeTaskId}.log`), formatLine(message, details));
}

function writeLogFile(filePath, line) {
  try {
    fs.appendFileSync(filePath, `${line}\n`, "utf8");
  } catch {
    // Log writes must never break the download flow.
  }
}

function formatLine(message, details) {
  const timestamp = new Date().toISOString();
  const suffix = details ? ` ${sanitizeLogText(JSON.stringify(details))}` : "";
  return `[${timestamp}] ${sanitizeLogText(message)}${suffix}`;
}

function sanitizeLogText(value) {
  return String(value)
    .replace(/cookies?=[^&\s"]+/gi, "cookie=***")
    .replace(/("cookies?File"\s*:\s*")[^"]+/gi, "$1***")
    .replace(/("cookiesFromBrowser"\s*:\s*")[^"]+/gi, "$1***");
}

module.exports = {
  writeAppLog,
  writeTaskLog
};
