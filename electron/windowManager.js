const path = require("path");
const { app, BrowserWindow } = require("electron");

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

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    console.error(`Renderer failed to load: ${errorCode} ${errorDescription}`);
  });

  mainWindow.on("closed", () => {
    console.log("Main window closed");
  });

  if (isDev()) {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || "http://127.0.0.1:5273";
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

function getWindowIconPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "icon.ico");
  }

  return path.join(__dirname, "..", "build", "icon.ico");
}

module.exports = {
  createMainWindow,
  isDev,
  getWindowIconPath
};
