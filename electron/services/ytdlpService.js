const { spawn } = require("child_process");
const { getYtdlpPath } = require("../utils/pathUtils");
const { decodeProcessOutput } = require("../utils/processOutputDecoder");
const { assertUrl } = require("../utils/validationUtils");
const { writeAppLog, writeTaskLog } = require("./logService");
const { buildSiteRequestArgs } = require("./siteRequestArgs");

function runYtdlp(args, options = {}) {
  return new Promise((resolve, reject) => {
    const ytdlpPath = options.ytdlpPath || getYtdlpPath();
    const child = spawn(ytdlpPath, args, {
      env: buildYtdlpEnv(),
      windowsHide: true
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    const timeoutMs = options.timeoutMs || 0;
    const timer =
      timeoutMs > 0
        ? setTimeout(() => {
            if (!settled) {
              settled = true;
              child.kill();
              reject(new Error(`yt-dlp timed out after ${timeoutMs}ms`));
            }
          }, timeoutMs)
        : null;

    child.stdout.on("data", (data) => {
      const text = decodeProcessOutput(data);
      stdout += text;
      options.onData?.(text, "stdout");
    });

    child.stderr.on("data", (data) => {
      const text = decodeProcessOutput(data);
      stderr += text;
      options.onData?.(text, "stderr");
    });

    child.on("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      if (timer) clearTimeout(timer);
      reject(error);
    });

    child.on("close", (code) => {
      if (settled) {
        return;
      }
      settled = true;
      if (timer) clearTimeout(timer);

      if (code === 0) {
        resolve({ stdout, stderr, code });
      } else {
        const error = new Error(stderr || stdout || `yt-dlp exited with code ${code}`);
        error.code = "PROCESS_FAILED";
        error.rawMessage = stderr || stdout || error.message;
        reject(error);
      }
    });
  });
}

async function runYtdlpJson(args, options = {}) {
  const { stdout } = await runYtdlp(args, options);
  try {
    return JSON.parse(stdout);
  } catch (error) {
    error.rawMessage = stdout || error.message;
    throw error;
  }
}

async function getVideoInfo(url) {
  const safeUrl = assertUrl(url);
  writeAppLog("Parsing video URL", { url: safeUrl });

  const info = await runYtdlpJson(
    ["--ignore-config", ...buildSiteRequestArgs([safeUrl]), "-J", "--no-playlist", safeUrl],
    {
      timeoutMs: 120000
    }
  );

  return mapVideoInfo(info, safeUrl);
}

async function getPlaylistInfo(url) {
  const safeUrl = assertUrl(url);
  writeAppLog("Parsing playlist URL", { url: safeUrl });

  const info = await runYtdlpJson(
    [
      "--ignore-config",
      ...buildSiteRequestArgs([safeUrl]),
      "--flat-playlist",
      "-J",
      safeUrl
    ],
    {
      timeoutMs: 180000
    }
  );

  return mapPlaylistInfo(info, safeUrl);
}

function startDownloadProcess(task, args, callbacks = {}) {
  const ytdlpPath = getYtdlpPath();
  const child = spawn(ytdlpPath, args, {
    env: buildYtdlpEnv(),
    windowsHide: true
  });

  writeTaskLog(task.id, "yt-dlp process started", {
    processId: child.pid
  });

  child.stdout.on("data", (data) => {
    handleDownloadOutput(task.id, data, "stdout", callbacks);
  });

  child.stderr.on("data", (data) => {
    handleDownloadOutput(task.id, data, "stderr", callbacks);
  });

  child.on("error", (error) => {
    callbacks.onError?.(error);
  });

  child.on("close", (code) => {
    callbacks.onClose?.(code);
  });

  return child;
}

function handleDownloadOutput(taskId, data, streamName, callbacks) {
  const text = decodeProcessOutput(data);
  writeTaskLog(taskId, "yt-dlp output", { streamName, text });
  callbacks.onData?.(text, streamName);
}

function mapVideoInfo(info, fallbackUrl) {
  return {
    id: info.id || "",
    title: info.title || "未命名视频",
    uploader: info.uploader || info.channel || "",
    duration: info.duration || 0,
    thumbnail: info.thumbnail || "",
    webpageUrl: info.webpage_url || fallbackUrl,
    extractor: info.extractor || info.extractor_key || "",
    formats: Array.isArray(info.formats) ? info.formats : [],
    subtitles: info.subtitles || {},
    automaticCaptions: info.automatic_captions || {}
  };
}

function mapPlaylistInfo(info, fallbackUrl) {
  const entries = Array.isArray(info.entries) ? info.entries : [];

  return {
    id: info.id || "",
    title: info.title || "未命名播放列表",
    uploader: info.uploader || info.channel || "",
    webpageUrl: info.webpage_url || fallbackUrl,
    extractor: info.extractor || info.extractor_key || "",
    count: entries.length,
    entries: entries.map((entry, index) => mapPlaylistEntry(entry, index, fallbackUrl))
  };
}

function mapPlaylistEntry(entry, index, fallbackUrl) {
  return {
    id: entry?.id || "",
    index: Number(entry?.playlist_index) || index + 1,
    title: entry?.title || `条目 ${index + 1}`,
    duration: entry?.duration || 0,
    thumbnail: entry?.thumbnail || "",
    uploader: entry?.uploader || entry?.channel || "",
    url: resolveEntryUrl(entry, fallbackUrl)
  };
}

function resolveEntryUrl(entry, fallbackUrl) {
  const directUrl = entry?.webpage_url || entry?.original_url || entry?.url || "";
  if (/^https?:\/\//i.test(directUrl)) {
    return directUrl;
  }

  const webpageUrlBasename = entry?.webpage_url_basename || "";
  if (/^https?:\/\//i.test(webpageUrlBasename)) {
    return webpageUrlBasename;
  }

  if (entry?.id && /youtube/i.test(String(entry?.ie_key || entry?.extractor || ""))) {
    return `https://www.youtube.com/watch?v=${entry.id}`;
  }

  return directUrl || fallbackUrl;
}

function buildYtdlpEnv() {
  return {
    ...process.env,
    ALL_PROXY: "",
    all_proxy: "",
    HTTP_PROXY: "",
    http_proxy: "",
    HTTPS_PROXY: "",
    https_proxy: "",
    NO_PROXY: appendNoProxy(process.env.NO_PROXY),
    no_proxy: appendNoProxy(process.env.no_proxy)
  };
}

function appendNoProxy(value) {
  const entries = new Set(
    String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  );

  for (const entry of ["127.0.0.1", "localhost", "::1"]) {
    entries.add(entry);
  }

  return Array.from(entries).join(",");
}

module.exports = {
  buildYtdlpEnv,
  getPlaylistInfo,
  getVideoInfo,
  mapVideoInfo,
  mapPlaylistInfo,
  runYtdlp,
  runYtdlpJson,
  startDownloadProcess
};
