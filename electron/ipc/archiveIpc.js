const { ipcMain } = require("electron");
const IPC_CHANNELS = require("../constants/ipcChannels");
const {
  clearArchiveFile,
  createArchiveFile,
  getArchiveInfo
} = require("../services/archiveService");
const { withIpcResult } = require("../utils/ipcResponse");

function registerArchiveIpc() {
  ipcMain.handle(IPC_CHANNELS.ARCHIVE.GET_INFO, (_event, archivePath) =>
    withIpcResult(async () => getArchiveInfo(archivePath))
  );

  ipcMain.handle(IPC_CHANNELS.ARCHIVE.CREATE, (_event, archivePath) =>
    withIpcResult(async () => createArchiveFile(archivePath))
  );

  ipcMain.handle(IPC_CHANNELS.ARCHIVE.CLEAR, (_event, archivePath) =>
    withIpcResult(async () => clearArchiveFile(archivePath))
  );
}

module.exports = {
  registerArchiveIpc
};
