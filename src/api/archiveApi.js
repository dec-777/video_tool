function getDesktopApi() {
  if (!window.api) {
    throw new Error("桌面 API 尚未就绪，请在 Electron 窗口中运行");
  }

  return window.api;
}

export async function getArchiveInfo(archivePath) {
  return getDesktopApi().getArchiveInfo(archivePath);
}

export async function createArchive(archivePath) {
  return getDesktopApi().createArchive(archivePath);
}

export async function clearArchive(archivePath) {
  return getDesktopApi().clearArchive(archivePath);
}
