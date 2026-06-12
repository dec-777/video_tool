const { ipcMain } = require("electron");
const IPC_CHANNELS = require("../constants/ipcChannels");
const { checkBinaries } = require("../services/binaryService");
const { withIpcResult } = require("../utils/ipcResponse");

function registerSystemIpc() {
  ipcMain.handle(IPC_CHANNELS.SYSTEM.CHECK_BINARIES, () =>
    withIpcResult(async () => checkBinaries())
  );
}

module.exports = {
  registerSystemIpc
};
