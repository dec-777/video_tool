const { ipcMain } = require("electron");
const IPC_CHANNELS = require("../constants/ipcChannels");
const { getConfig, saveConfig } = require("../services/configStore");
const { configureTaskQueue } = require("../services/taskQueue");
const { withIpcResult } = require("../utils/ipcResponse");

function registerConfigIpc() {
  ipcMain.handle(IPC_CHANNELS.CONFIG.GET, () =>
    withIpcResult(async () => getConfig())
  );

  ipcMain.handle(IPC_CHANNELS.CONFIG.SAVE, (_event, config) =>
    withIpcResult(async () => {
      const saved = saveConfig(config);
      configureTaskQueue({ concurrentDownloads: saved.concurrentDownloads });
      return saved;
    })
  );
}

module.exports = {
  registerConfigIpc
};
