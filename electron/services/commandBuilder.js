const fs = require("fs");
const path = require("path");
const { getFfmpegDir } = require("../utils/pathUtils");
const { assertNonEmptyString, normalizeUrls } = require("../utils/validationUtils");
const { normalizeArchivePath } = require("./archiveService");
const { buildSiteRequestArgs } = require("./siteRequestArgs");

const MODES = new Set(["video", "audio", "video-only", "subtitle-only"]);
const QUALITY_PRESETS = new Set(["best", "worst", "resolution", "formatId"]);
const CONTAINERS = new Set(["mp4", "webm", "mkv", "original"]);
const AUDIO_FORMATS = new Set(["mp3", "m4a", "opus", "wav", "flac"]);
const SUBTITLE_FORMATS = new Set(["srt", "vtt", "ass", "lrc"]);
const COOKIE_MODES = new Set(["none", "file", "browser"]);
const COOKIE_BROWSERS = new Set(["chrome", "edge", "firefox", "brave", "opera"]);

function buildYtdlpArgs(options) {
  const normalized = normalizeDownloadOptions(options);
  const args = [];

  buildBaseArgs(args, normalized);
  buildNetworkArgs(args, normalized);
  args.push(...buildSiteRequestArgs(normalized.urls));
  buildFormatArgs(args, normalized);
  buildSubtitleArgs(args, normalized);
  buildMetadataArgs(args, normalized);
  buildAuthArgs(args, normalized);
  buildFileArgs(args, normalized);
  buildPlaylistArgs(args, normalized);
  args.push(...normalized.urls);

  return args;
}

function buildCommandPreview(options) {
  return ["yt-dlp.exe", ...buildYtdlpArgs(options)]
    .map(quotePreviewArg)
    .join(" ");
}

function buildBaseArgs(args) {
  args.push("--ignore-config", "--newline", "--no-color", "--ffmpeg-location", getFfmpegDir());
}

function buildNetworkArgs(args, options) {
  const retries = options.network.retries;
  args.push("--retries", String(retries), "--fragment-retries", String(retries));
  args.push("--retry-sleep", "http:linear=1::3", "--retry-sleep", "fragment:linear=1::3");

  if (options.network.proxyEnabled && options.network.proxy) {
    args.push("--proxy", options.network.proxy);
  }

  if (options.network.limitRate) {
    args.push("--limit-rate", options.network.limitRate);
  }
}

function buildFormatArgs(args, options) {
  if (options.mode === "subtitle-only") {
    args.push("--skip-download");
    return;
  }

  if (options.mode === "audio") {
    args.push("-x", "--audio-format", options.audio.format);
    return;
  }

  args.push("-f", buildFormatSelector(options));

  if (options.mode === "video" && options.quality.container !== "original") {
    args.push("--merge-output-format", options.quality.container);
  }
}

function buildFormatSelector(options) {
  if (options.mode === "video-only") {
    return "bv*";
  }

  if (options.quality.preset === "worst") {
    return "worst";
  }

  if (options.quality.preset === "resolution") {
    return `bv*[height<=${options.quality.resolution}]+ba/b[height<=${options.quality.resolution}]`;
  }

  if (options.quality.preset === "formatId") {
    return options.quality.formatId;
  }

  return "bv*+ba/b";
}

function buildSubtitleArgs(args, options) {
  const subtitles = options.subtitles;

  if (subtitles.writeSubs) {
    args.push("--write-subs");
  }

  if (subtitles.writeAutoSubs) {
    args.push("--write-auto-subs");
  }

  if (subtitles.languages.length > 0) {
    args.push("--sub-langs", subtitles.languages.join(","));
  }

  if ((subtitles.writeSubs || subtitles.writeAutoSubs) && subtitles.format) {
    args.push("--convert-subs", subtitles.format);
  }

  if (subtitles.embed && options.mode !== "subtitle-only") {
    args.push("--embed-subs");
  }
}

function buildMetadataArgs(args, options) {
  const metadata = options.metadata;

  if (metadata.thumbnail) args.push("--write-thumbnail");
  if (metadata.embedThumbnail) args.push("--embed-thumbnail");
  if (metadata.description) args.push("--write-description");
  if (metadata.infoJson) args.push("--write-info-json");
  if (metadata.comments) args.push("--write-comments");
  if (metadata.embedMetadata) args.push("--embed-metadata");
}

function buildAuthArgs(args, options) {
  const auth = options.auth;

  if (auth.cookiesMode === "file") {
    args.push("--cookies", auth.cookiesFile);
  }

  if (auth.cookiesMode === "browser") {
    args.push("--cookies-from-browser", auth.cookiesFromBrowser);
  }
}

function buildFileArgs(args, options) {
  args.push("-o", buildOutputPath(options.file.outputDir, options.file.outputTemplate));

  if (options.file.archiveEnabled && options.file.archivePath) {
    args.push("--download-archive", options.file.archivePath);
  }

  if (options.file.keepIntermediateFiles) {
    args.push("--keep-video");
  }
}

function buildPlaylistArgs(args, options) {
  const playlist = options.playlist;

  if (!playlist.enabled) {
    args.push("--no-playlist");
    return;
  }

  if (playlist.start) {
    args.push("--playlist-start", String(playlist.start));
  }

  if (playlist.end) {
    args.push("--playlist-end", String(playlist.end));
  }

  if (playlist.items) {
    args.push("--playlist-items", playlist.items);
  }
}

function normalizeDownloadOptions(options) {
  if (!options || typeof options !== "object") {
    throw createError("INVALID_OPTIONS", "下载参数无效", "Download options must be an object");
  }

  const urls = normalizeUrls(options.urls || []);
  if (urls.length === 0) {
    throw createError("INVALID_URL", "请输入有效的视频链接", "At least one URL is required");
  }

  return {
    urls,
    mode: normalizeMode(options.mode),
    quality: normalizeQuality(options.quality),
    audio: normalizeAudio(options.audio),
    subtitles: normalizeSubtitles(options.subtitles, options.mode),
    metadata: normalizeMetadata(options.metadata),
    auth: normalizeAuth(options.auth),
    network: normalizeNetwork(options.network),
    file: normalizeFile(options.file),
    playlist: normalizePlaylist(options.playlist)
  };
}

function normalizeMode(value) {
  return MODES.has(value) ? value : "video";
}

function normalizeQuality(value = {}) {
  const preset = QUALITY_PRESETS.has(value.preset) ? value.preset : "best";
  const container = CONTAINERS.has(value.container) ? value.container : "mp4";
  const resolution = clampInteger(value.resolution, 144, 4320, 1080);
  const formatId = sanitizeToken(value.formatId || "");

  if (preset === "formatId" && !formatId) {
    throw createError("INVALID_OPTIONS", "请输入 format_id", "formatId preset requires formatId");
  }

  return {
    preset,
    resolution,
    formatId,
    container
  };
}

function normalizeAudio(value = {}) {
  const format = AUDIO_FORMATS.has(value.format) ? value.format : "mp3";
  return { format };
}

function normalizeSubtitles(value = {}, rawMode = "") {
  const mode = normalizeMode(rawMode);
  const writeSubs = Boolean(value.writeSubs || mode === "subtitle-only");
  const writeAutoSubs = Boolean(value.writeAutoSubs);
  const format = SUBTITLE_FORMATS.has(value.format) ? value.format : "srt";

  return {
    writeSubs,
    writeAutoSubs,
    languages: normalizeLanguages(value.languages),
    format,
    embed: Boolean(value.embed)
  };
}

function normalizeMetadata(value = {}) {
  return {
    thumbnail: Boolean(value.thumbnail),
    embedThumbnail: Boolean(value.embedThumbnail),
    description: Boolean(value.description),
    infoJson: Boolean(value.infoJson),
    comments: Boolean(value.comments),
    embedMetadata: Boolean(value.embedMetadata)
  };
}

function normalizeAuth(value = {}) {
  const cookiesMode = COOKIE_MODES.has(value.cookiesMode) ? value.cookiesMode : "none";

  if (cookiesMode === "file") {
    const cookiesFile = assertNonEmptyString(value.cookiesFile, {
      code: "INVALID_COOKIE_FILE",
      message: "请选择 cookies.txt 文件",
      rawMessage: "cookiesFile is required"
    });

    if (!fs.existsSync(cookiesFile)) {
      throw createError("INVALID_COOKIE_FILE", "Cookie 文件不存在，请重新选择", `Cookie file not found: ${cookiesFile}`);
    }

    return {
      cookiesMode,
      cookiesFile,
      cookiesFromBrowser: ""
    };
  }

  if (cookiesMode === "browser") {
    const browser = COOKIE_BROWSERS.has(value.cookiesFromBrowser) ? value.cookiesFromBrowser : "";
    if (!browser) {
      throw createError("INVALID_COOKIE_BROWSER", "请选择支持的浏览器 Cookie 来源", `Unsupported cookie browser: ${value.cookiesFromBrowser}`);
    }

    return {
      cookiesMode,
      cookiesFile: "",
      cookiesFromBrowser: browser
    };
  }

  return {
    cookiesMode: "none",
    cookiesFile: "",
    cookiesFromBrowser: ""
  };
}

function normalizeNetwork(value = {}) {
  const proxyEnabled = Boolean(value.proxyEnabled);
  const proxy = proxyEnabled ? normalizeProxy(value.proxy) : "";

  return {
    proxyEnabled,
    proxy,
    retries: clampInteger(value.retries, 1, 20, 10),
    limitRate: normalizeLimitRate(value.limitRate)
  };
}

function normalizeFile(value = {}) {
  const outputDir = assertNonEmptyString(value.outputDir, {
    code: "INVALID_PATH",
    message: "请选择保存目录",
    rawMessage: "outputDir is required"
  });

  const outputTemplate = assertNonEmptyString(value.outputTemplate || "%(title)s.%(ext)s", {
    code: "INVALID_OPTIONS",
    message: "请输入文件名模板",
    rawMessage: "outputTemplate is required"
  });

  const archiveEnabled = Boolean(value.archiveEnabled);

  return {
    outputDir,
    outputTemplate,
    archiveEnabled,
    archivePath: archiveEnabled ? normalizeArchivePath(value.archivePath) : "",
    keepIntermediateFiles: Boolean(value.keepIntermediateFiles)
  };
}

function normalizePlaylist(value = {}) {
  return {
    enabled: Boolean(value.enabled),
    start: optionalInteger(value.start, 1, 999999),
    end: optionalInteger(value.end, 1, 999999),
    items: normalizePlaylistItems(value.items)
  };
}

function normalizeLanguages(value) {
  const input = Array.isArray(value) ? value : String(value || "").split(",");
  return input
    .map((item) => sanitizeToken(item.trim()))
    .filter(Boolean)
    .slice(0, 20);
}

function normalizeProxy(value) {
  const proxy = assertNonEmptyString(value, {
    code: "INVALID_PROXY",
    message: "请输入代理地址",
    rawMessage: "proxy is required when proxy is enabled"
  });

  let parsed;
  try {
    parsed = new URL(proxy);
  } catch {
    throw createError("INVALID_PROXY", "代理地址格式无效", `Invalid proxy URL: ${proxy}`);
  }

  if (!["http:", "https:", "socks4:", "socks5:"].includes(parsed.protocol)) {
    throw createError("INVALID_PROXY", "代理仅支持 HTTP、HTTPS、SOCKS4 或 SOCKS5", `Unsupported proxy protocol: ${parsed.protocol}`);
  }

  return proxy;
}

function normalizeLimitRate(value) {
  const limitRate = String(value || "").trim();
  if (!limitRate) {
    return "";
  }

  if (!/^\d+(?:\.\d+)?[KMG]?$/i.test(limitRate)) {
    throw createError("INVALID_OPTIONS", "限速格式无效，请使用 500K、2M 或 1G 这类格式", `Invalid limit rate: ${limitRate}`);
  }

  return limitRate;
}

function normalizePlaylistItems(value) {
  const items = String(value || "").trim();
  if (!items) {
    return "";
  }

  if (!/^[0-9,\-:]+$/.test(items)) {
    throw createError("INVALID_OPTIONS", "播放列表范围格式无效", `Invalid playlist items: ${items}`);
  }

  return items;
}

function sanitizeToken(value) {
  return String(value || "").replace(/[\r\n\t]/g, "").trim();
}

function clampInteger(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(Math.floor(parsed), min), max);
}

function optionalInteger(value, min, max) {
  if (value === undefined || value === null || value === "") {
    return 0;
  }

  return clampInteger(value, min, max, 0);
}

function buildOutputPath(outputDir, outputTemplate) {
  return path.join(outputDir, outputTemplate);
}

function quotePreviewArg(value) {
  const text = String(value);
  if (!text || /[\s"&|<>^]/.test(text)) {
    return `"${text.replace(/"/g, '\\"')}"`;
  }

  return text;
}

function createError(code, message, rawMessage) {
  return { code, message, rawMessage };
}

module.exports = {
  buildCommandPreview,
  buildOutputPath,
  buildYtdlpArgs,
  normalizeDownloadOptions
};
