const path = require("path");
const { app } = require("electron");

function getAppRoot() {
  return path.join(__dirname, "..", "..");
}

function getResourcePath(...paths) {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, ...paths);
  }

  return path.join(getAppRoot(), ...paths);
}

function getUserDataPath(...paths) {
  return path.join(app.getPath("userData"), ...paths);
}

function getBinDir() {
  return getResourcePath("bin");
}

function getYtdlpPath() {
  return path.join(getBinDir(), "yt-dlp.exe");
}

function getFfmpegDir() {
  return getBinDir();
}

function getFfmpegPath() {
  return path.join(getBinDir(), "ffmpeg.exe");
}

function getFfprobePath() {
  return path.join(getBinDir(), "ffprobe.exe");
}

function joinOutputTemplate(outputDir, outputTemplate) {
  return path.join(outputDir, outputTemplate);
}

module.exports = {
  getAppRoot,
  getBinDir,
  getFfmpegDir,
  getFfmpegPath,
  getFfprobePath,
  getResourcePath,
  getUserDataPath,
  getYtdlpPath,
  joinOutputTemplate
};
