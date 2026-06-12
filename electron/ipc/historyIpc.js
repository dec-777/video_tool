const { ipcMain } = require("electron");
const IPC_CHANNELS = require("../constants/ipcChannels");
const { clearHistory, getHistory } = require("../services/historyStore");
const { withIpcResult } = require("../utils/ipcResponse");

function registerHistoryIpc() {
  ipcMain.handle(IPC_CHANNELS.HISTORY.GET, (_event, filters = {}) =>
    withIpcResult(async () => getHistory(filters))
  );

  ipcMain.handle(IPC_CHANNELS.HISTORY.CLEAR, () =>
    withIpcResult(async () => clearHistory())
  );
}

module.exports = {
  registerHistoryIpc
};
