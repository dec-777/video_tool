const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

const requiredFiles = [
  "package.json",
  "vite.config.js",
  "index.html",
  "electron/main.js",
  "electron/preload.js",
  "electron/windowManager.js",
  "electron/constants/ipcChannels.js",
  "electron/constants/defaultConfig.js",
  "electron/services/binaryService.js",
  "electron/services/archiveService.js",
  "electron/services/errorService.js",
  "electron/services/logService.js",
  "electron/utils/pathUtils.js",
  "electron/ipc/index.js",
  "src/main.jsx",
  "src/App.jsx"
];

const failures = [];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    failures.push(`Missing required file: ${file}`);
  }
}

const windowManager = read("electron/windowManager.js");
if (!windowManager.includes("nodeIntegration: false")) {
  failures.push("BrowserWindow must set nodeIntegration: false");
}
if (!windowManager.includes("contextIsolation: true")) {
  failures.push("BrowserWindow must set contextIsolation: true");
}
if (!windowManager.includes("app.isPackaged")) {
  failures.push("BrowserWindow environment detection must use app.isPackaged");
}
if (/return !process\.env\.NODE_ENV/.test(windowManager)) {
  failures.push("BrowserWindow must not treat missing NODE_ENV as development");
}

const preload = read("electron/preload.js");
const allowedApiNames = [
  "parseUrl",
  "parsePlaylist",
  "startDownload",
  "buildCommandPreview",
  "cancelTask",
  "retryTask",
  "getTasks",
  "getHistory",
  "clearHistory",
  "getConfig",
  "saveConfig",
  "selectFolder",
  "selectFile",
  "openFolder",
  "getArchiveInfo",
  "createArchive",
  "clearArchive",
  "checkBinaries",
  "onTaskProgress",
  "onTaskCompleted",
  "onTaskFailed",
  "onTaskCanceled"
];

for (const apiName of allowedApiNames) {
  if (!preload.includes(`${apiName}:`)) {
    failures.push(`preload is missing window.api.${apiName}`);
  }
}

const forbiddenPatterns = [
  /runCommand/,
  /executeShell/,
  /window\.ipcRenderer/,
  /exposeInMainWorld\("ipcRenderer"/,
  /require\("child_process"\)/,
  /execSync\(/,
  /\bexec\(/
];

for (const pattern of forbiddenPatterns) {
  if (pattern.test(preload)) {
    failures.push(`preload contains forbidden pattern: ${pattern}`);
  }
}

const srcFiles = listFiles(path.join(root, "src"), [".js", ".jsx"]);
for (const file of srcFiles) {
  const source = fs.readFileSync(file, "utf8");
  if (/require\(["'](fs|path|child_process|electron)["']\)/.test(source)) {
    failures.push(`Renderer imports a forbidden Node API: ${path.relative(root, file)}`);
  }
}

const electronFiles = listFiles(path.join(root, "electron"), [".js"]);
for (const file of electronFiles) {
  const source = fs.readFileSync(file, "utf8");
  if (/\bexecSync\(|\bexec\(/.test(source)) {
    failures.push(`Electron code uses forbidden exec API: ${path.relative(root, file)}`);
  }
  if (/child_process/.test(source) && !/\bspawn\b/.test(source)) {
    failures.push(`Electron child_process usage must use spawn: ${path.relative(root, file)}`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("desktop checks passed");

function read(file) {
  const fullPath = path.join(root, file);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, "utf8") : "";
}

function listFiles(dir, extensions) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(fullPath, extensions));
    } else if (extensions.includes(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}
