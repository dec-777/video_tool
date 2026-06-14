const path = require("path");
const { app, BrowserWindow, shell } = require("electron");

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: "#eef2f5",
    autoHideMenuBar: true,
    icon: getWindowIconPath(),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  const devServerUrl = getDevServerUrl();
  const allowedNavigationOrigins = new Set([new URL(devServerUrl).origin]);

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openExternalHttpUrl(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (isAllowedNavigationUrl(url, allowedNavigationOrigins)) {
      return;
    }

    event.preventDefault();
    openExternalHttpUrl(url);
  });

  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    console.error(`Renderer failed to load: ${errorCode} ${errorDescription}`);
  });

  mainWindow.on("closed", () => {
    console.log("Main window closed");
  });

  if (isDev()) {
    console.log(`Loading renderer from ${devServerUrl}`);
    mainWindow.loadURL(devServerUrl);
  } else {
    console.log("Loading renderer from dist/index.html");
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  return mainWindow;
}

function isDev() {
  return !app.isPackaged && process.env.NODE_ENV === "development";
}

function getDevServerUrl() {
  const fallback = "http://127.0.0.1:5273";
  const configured = process.env.VITE_DEV_SERVER_URL || fallback;

  try {
    return new URL(configured).toString();
  } catch {
    return fallback;
  }
}

function getWindowIconPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "icon.ico");
  }

  return path.join(__dirname, "..", "build", "icon.ico");
}

function isAllowedNavigationUrl(rawUrl, allowedOrigins) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol === "file:") {
      return !isDev();
    }

    return allowedOrigins.has(parsed.origin);
  } catch {
    return false;
  }
}

function openExternalHttpUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      shell.openExternal(parsed.toString());
    }
  } catch {
    // Ignore invalid navigation targets.
  }
}

module.exports = {
  createMainWindow,
  getDevServerUrl,
  isDev,
  getWindowIconPath
};
