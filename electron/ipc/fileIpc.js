const { dialog, ipcMain, shell } = require("electron");
const IPC_CHANNELS = require("../constants/ipcChannels");
const { withIpcResult } = require("../utils/ipcResponse");

function registerFileIpc(context) {
  ipcMain.handle(IPC_CHANNELS.FILE.SELECT_FOLDER, () =>
    withIpcResult(async () => {
      const mainWindow = context.getMainWindow();
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ["openDirectory", "createDirectory"]
      });

      return {
        canceled: result.canceled,
        folderPath: result.filePaths[0] || ""
      };
    })
  );

  ipcMain.handle(IPC_CHANNELS.FILE.SELECT_FILE, (_event, options = {}) =>
    withIpcResult(async () => {
      const mainWindow = context.getMainWindow();
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ["openFile"],
        filters: normalizeFilters(options.filters)
      });

      return {
        canceled: result.canceled,
        filePath: result.filePaths[0] || ""
      };
    })
  );

  ipcMain.handle(IPC_CHANNELS.FILE.OPEN_FOLDER, (_event, folderPath) =>
    withIpcResult(async () => {
      if (!folderPath || typeof folderPath !== "string") {
        throw {
          code: "INVALID_PATH",
          message: "请选择有效的文件夹路径",
          rawMessage: "Folder path is required"
        };
      }

      const errorMessage = await shell.openPath(folderPath);
      if (errorMessage) {
        throw {
          code: "OPEN_FOLDER_FAILED",
          message: "无法打开文件夹，请检查路径是否存在",
          rawMessage: errorMessage
        };
      }

      return { folderPath };
    })
  );
}

function normalizeFilters(filters) {
  if (!Array.isArray(filters) || filters.length === 0) {
    return undefined;
  }

  return filters
    .filter((item) => item && typeof item.name === "string" && Array.isArray(item.extensions))
    .map((item) => ({
      name: item.name,
      extensions: item.extensions.map((extension) => String(extension).replace(/[^a-zA-Z0-9]/g, ""))
    }));
}

module.exports = {
  registerFileIpc
};
