const { app, Menu } = require("electron");
const path = require("path");
const { createMainWindow } = require("./windowManager");
const { registerIpcHandlers } = require("./ipc");
const { writeAppLog } = require("./services/logService");

let mainWindow = null;
app.setName("video_tool");

if (process.env.VIDEO_TOOL_USER_DATA_DIR) {
  app.setPath("userData", path.resolve(process.env.VIDEO_TOOL_USER_DATA_DIR));
}

async function bootstrap() {
  await app.whenReady();
  Menu.setApplicationMenu(null);
  writeAppLog("Application starting");

  mainWindow = createMainWindow();
  registerIpcHandlers({
    getMainWindow: () => mainWindow
  });

  app.on("activate", () => {
    if (mainWindow === null) {
      mainWindow = createMainWindow();
    }
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

bootstrap().catch((error) => {
  console.error("Failed to start application", error);
  app.quit();
});
