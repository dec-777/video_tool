const { contextBridge, ipcRenderer } = require("electron");
const IPC_CHANNELS = require("./constants/ipcChannels");

function invoke(channel, payload) {
  return ipcRenderer.invoke(channel, payload);
}

function subscribe(channel, callback) {
  if (typeof callback !== "function") {
    return () => {};
  }

  const listener = (_event, data) => callback(data);
  ipcRenderer.on(channel, listener);

  return () => {
    ipcRenderer.removeListener(channel, listener);
  };
}

contextBridge.exposeInMainWorld("api", {
  parseUrl: (url) => invoke(IPC_CHANNELS.DOWNLOAD.PARSE_URL, url),
  parsePlaylist: (url) => invoke(IPC_CHANNELS.DOWNLOAD.PARSE_PLAYLIST, url),
  startDownload: (options) => invoke(IPC_CHANNELS.DOWNLOAD.START, options),
  buildCommandPreview: (options) => invoke(IPC_CHANNELS.DOWNLOAD.PREVIEW, options),
  cancelTask: (taskId) => invoke(IPC_CHANNELS.DOWNLOAD.CANCEL, taskId),
  retryTask: (taskId) => invoke(IPC_CHANNELS.DOWNLOAD.RETRY, taskId),
  getTasks: () => invoke(IPC_CHANNELS.DOWNLOAD.GET_TASKS),

  getHistory: (filters) => invoke(IPC_CHANNELS.HISTORY.GET, filters),
  clearHistory: () => invoke(IPC_CHANNELS.HISTORY.CLEAR),

  getConfig: () => invoke(IPC_CHANNELS.CONFIG.GET),
  saveConfig: (config) => invoke(IPC_CHANNELS.CONFIG.SAVE, config),

  selectFolder: () => invoke(IPC_CHANNELS.FILE.SELECT_FOLDER),
  selectFile: (options) => invoke(IPC_CHANNELS.FILE.SELECT_FILE, options),
  openFolder: (folderPath) => invoke(IPC_CHANNELS.FILE.OPEN_FOLDER, folderPath),

  getArchiveInfo: (archivePath) => invoke(IPC_CHANNELS.ARCHIVE.GET_INFO, archivePath),
  createArchive: (archivePath) => invoke(IPC_CHANNELS.ARCHIVE.CREATE, archivePath),
  clearArchive: (archivePath) => invoke(IPC_CHANNELS.ARCHIVE.CLEAR, archivePath),

  checkBinaries: () => invoke(IPC_CHANNELS.SYSTEM.CHECK_BINARIES),

  onTaskProgress: (callback) =>
    subscribe(IPC_CHANNELS.EVENTS.TASK_PROGRESS, callback),
  onTaskCompleted: (callback) =>
    subscribe(IPC_CHANNELS.EVENTS.TASK_COMPLETED, callback),
  onTaskFailed: (callback) => subscribe(IPC_CHANNELS.EVENTS.TASK_FAILED, callback),
  onTaskCanceled: (callback) =>
    subscribe(IPC_CHANNELS.EVENTS.TASK_CANCELED, callback)
});
