function getDesktopApi() {
  if (!window.api) {
    throw new Error("桌面 API 尚未就绪，请在 Electron 窗口中运行");
  }

  return window.api;
}

export async function parseUrl(url) {
  return getDesktopApi().parseUrl(url);
}

export async function parsePlaylist(url) {
  return getDesktopApi().parsePlaylist(url);
}

export async function startDownload(options) {
  return getDesktopApi().startDownload(options);
}

export async function buildCommandPreview(options) {
  return getDesktopApi().buildCommandPreview(options);
}

export async function getTasks() {
  return getDesktopApi().getTasks();
}

export async function cancelTask(taskId) {
  return getDesktopApi().cancelTask(taskId);
}

export async function retryTask(taskId) {
  return getDesktopApi().retryTask(taskId);
}
