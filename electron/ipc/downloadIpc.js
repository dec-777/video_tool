const { ipcMain } = require("electron");
const IPC_CHANNELS = require("../constants/ipcChannels");
const {
  buildCommandPreview
} = require("../services/commandBuilder");
const {
  addTasks,
  cancelTask,
  configureTaskQueue,
  getTasks,
  retryTask
} = require("../services/taskQueue");
const { getPlaylistInfo, getVideoInfo } = require("../services/ytdlpService");
const { withIpcResult } = require("../utils/ipcResponse");

function registerDownloadIpc(context) {
  configureTaskQueue(context);

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD.PARSE_URL, (_event, url) =>
    withIpcResult(async () => getVideoInfo(url))
  );

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD.PARSE_PLAYLIST, (_event, url) =>
    withIpcResult(async () => getPlaylistInfo(url))
  );

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD.START, (_event, options) =>
    withIpcResult(async () => addTasks(options))
  );

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD.PREVIEW, (_event, options) =>
    withIpcResult(async () => buildCommandPreview(options))
  );

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD.CANCEL, (_event, taskId) =>
    withIpcResult(async () => cancelTask(taskId))
  );

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD.RETRY, (_event, taskId) =>
    withIpcResult(async () => retryTask(taskId))
  );

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD.GET_TASKS, () =>
    withIpcResult(async () => getTasks())
  );
}

module.exports = {
  registerDownloadIpc
};
