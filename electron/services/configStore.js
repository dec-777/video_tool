const DEFAULT_CONFIG = require("../constants/defaultConfig");
const { getUserDataPath } = require("../utils/pathUtils");
const { readJsonFile, writeJsonFile } = require("../utils/safeJson");

function getConfigPath() {
  return getUserDataPath("config.json");
}

function getConfig() {
  const config = readJsonFile(getConfigPath(), null);
  if (!config) {
    saveConfig(DEFAULT_CONFIG);
    return { ...DEFAULT_CONFIG };
  }

  return normalizeConfig(config);
}

function saveConfig(config) {
  const normalized = normalizeConfig(config);
  writeJsonFile(getConfigPath(), normalized);
  return normalized;
}

function normalizeConfig(config) {
  return {
    ...DEFAULT_CONFIG,
    ...(config || {}),
    configVersion: 2,
    defaultMode: normalizeDefaultMode(config?.defaultMode),
    defaultAudioFormat: ["mp3", "m4a", "opus", "wav", "flac"].includes(config?.defaultAudioFormat)
      ? config.defaultAudioFormat
      : "mp3",
    defaultContainer: ["mp4", "webm", "mkv", "original"].includes(config?.defaultContainer)
      ? config.defaultContainer
      : "mp4",
    outputTemplate: config?.outputTemplate || DEFAULT_CONFIG.outputTemplate,
    concurrentDownloads: clampConcurrentDownloads(config?.concurrentDownloads),
    quality: normalizeObjectConfig(DEFAULT_CONFIG.quality, config?.quality),
    subtitles: normalizeObjectConfig(DEFAULT_CONFIG.subtitles, config?.subtitles),
    metadata: normalizeObjectConfig(DEFAULT_CONFIG.metadata, config?.metadata),
    auth: normalizeObjectConfig(DEFAULT_CONFIG.auth, config?.auth),
    network: normalizeObjectConfig(DEFAULT_CONFIG.network, config?.network),
    file: normalizeObjectConfig(DEFAULT_CONFIG.file, config?.file),
    playlist: normalizeObjectConfig(DEFAULT_CONFIG.playlist, config?.playlist),
    theme: ["light", "dark", "system"].includes(config?.theme) ? config.theme : "system"
  };
}

function clampConcurrentDownloads(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_CONFIG.concurrentDownloads;
  }

  return Math.min(Math.max(Math.floor(parsed), 1), 5);
}

function normalizeDefaultMode(value) {
  return ["video", "audio", "video-only", "subtitle-only"].includes(value) ? value : "video";
}

function normalizeObjectConfig(defaultValue, value) {
  if (!value || typeof value !== "object") {
    return { ...defaultValue };
  }

  return {
    ...defaultValue,
    ...value
  };
}

module.exports = {
  getConfig,
  getConfigPath,
  saveConfig
};
