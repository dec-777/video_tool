function getDesktopApi() {
  if (!window.api) {
    throw new Error("桌面 API 尚未就绪，请在 Electron 窗口中运行");
  }

  return window.api;
}

export async function checkBinaries() {
  return getDesktopApi().checkBinaries();
}
