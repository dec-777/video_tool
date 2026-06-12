function getDesktopApi() {
  if (!window.api) {
    throw new Error("桌面 API 尚未就绪，请在 Electron 窗口中运行");
  }

  return window.api;
}

export async function selectFolder() {
  return getDesktopApi().selectFolder();
}

export async function selectFile(options) {
  return getDesktopApi().selectFile(options);
}

export async function openFolder(folderPath) {
  return getDesktopApi().openFolder(folderPath);
}
