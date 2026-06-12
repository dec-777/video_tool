import { useEffect, useState } from "react";
import { Archive, FileText, FolderOpen, RotateCcw, Save, Trash2 } from "lucide-react";
import { clearArchive, createArchive, getArchiveInfo } from "../api/archiveApi.js";
import { getConfig, saveConfig } from "../api/configApi.js";
import { openFolder, selectFile, selectFolder } from "../api/fileApi.js";
import { checkBinaries } from "../api/systemApi.js";
import { formatApiError } from "../utils/formatError.js";

const defaultConfig = {
  configVersion: 2,
  defaultOutputDir: "",
  defaultMode: "video",
  defaultAudioFormat: "mp3",
  defaultContainer: "mp4",
  outputTemplate: "%(title)s.%(ext)s",
  concurrentDownloads: 1,
  quality: {
    preset: "best",
    resolution: 1080,
    formatId: "",
    container: "mp4"
  },
  subtitles: {
    writeSubs: false,
    writeAutoSubs: false,
    languages: ["zh-Hans", "en"],
    format: "srt",
    embed: false
  },
  metadata: {
    thumbnail: false,
    embedThumbnail: false,
    description: false,
    infoJson: false,
    comments: false,
    embedMetadata: false
  },
  auth: {
    cookiesMode: "none",
    cookiesFile: "",
    cookiesFromBrowser: ""
  },
  network: {
    proxyEnabled: false,
    proxy: "",
    retries: 10,
    limitRate: ""
  },
  file: {
    archiveEnabled: false,
    archivePath: "",
    keepIntermediateFiles: false
  },
  playlist: {
    enabled: false,
    start: 0,
    end: 0,
    items: ""
  },
  theme: "system"
};

function SettingsPage() {
  const [config, setConfig] = useState(defaultConfig);
  const [binaries, setBinaries] = useState(null);
  const [archiveInfo, setArchiveInfo] = useState(null);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!window.api) {
      return;
    }

    getConfig().then((result) => {
      if (result.success) {
        const nextConfig = mergeConfig(result.data);
        setConfig(nextConfig);
        refreshArchiveInfo(nextConfig.file.archivePath);
      }
    });

    checkBinaries().then((result) => {
      if (result.success) {
        setBinaries(result.data);
      }
    });
  }, []);

  function updateConfig(key, value) {
    setConfig((current) => ({
      ...current,
      [key]: value
    }));
  }

  function updateNestedConfig(section, key, value) {
    setConfig((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [key]: value
      }
    }));
  }

  function updateFileConfig(patch) {
    setConfig((current) => ({
      ...current,
      file: {
        ...current.file,
        ...patch
      }
    }));
  }

  async function handleSelectFolder() {
    const result = await selectFolder();
    if (result.success && !result.data.canceled) {
      updateConfig("defaultOutputDir", result.data.folderPath);
    }
  }

  async function handleSelectCookieFile() {
    setError("");
    const result = await selectFile({
      filters: [{ name: "Cookie text", extensions: ["txt"] }]
    });

    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }

    if (!result.data.canceled && result.data.filePath) {
      updateNestedConfig("auth", "cookiesFile", result.data.filePath);
      updateNestedConfig("auth", "cookiesMode", "file");
    }
  }

  async function handleSelectArchiveFile() {
    setError("");
    const result = await selectFile({
      filters: [{ name: "Archive text", extensions: ["txt"] }]
    });

    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }

    if (!result.data.canceled && result.data.filePath) {
      updateFileConfig({
        archiveEnabled: true,
        archivePath: result.data.filePath
      });
      await refreshArchiveInfo(result.data.filePath);
    }
  }

  async function refreshArchiveInfo(archivePath = config.file.archivePath) {
    setError("");
    setArchiveBusy(true);
    try {
      const result = await getArchiveInfo(archivePath);
      if (!result.success) {
        setError(formatApiError(result.error));
        setArchiveInfo(null);
        return null;
      }

      setArchiveInfo(result.data);
      return result.data;
    } catch (archiveError) {
      setError(formatApiError(archiveError));
      setArchiveInfo(null);
      return null;
    } finally {
      setArchiveBusy(false);
    }
  }

  async function handleCreateArchive() {
    setError("");
    setNotice("");
    setArchiveBusy(true);
    try {
      const result = await createArchive(config.file.archivePath);
      if (!result.success) {
        setError(formatApiError(result.error));
        return;
      }

      setArchiveInfo(result.data);
      updateFileConfig({
        archiveEnabled: true,
        archivePath: result.data.archivePath
      });
      setNotice("archive 文件已创建并启用");
    } catch (archiveError) {
      setError(formatApiError(archiveError));
    } finally {
      setArchiveBusy(false);
    }
  }

  async function handleClearArchive() {
    setError("");
    setNotice("");

    if (!window.confirm("确定清空 archive 文件吗？清空后已下载记录会被 yt-dlp 重新识别为未下载。")) {
      return;
    }

    setArchiveBusy(true);
    try {
      const result = await clearArchive(config.file.archivePath);
      if (!result.success) {
        setError(formatApiError(result.error));
        return;
      }

      setArchiveInfo(result.data);
      updateFileConfig({
        archivePath: result.data.archivePath
      });
      setNotice("archive 文件已清空");
    } catch (archiveError) {
      setError(formatApiError(archiveError));
    } finally {
      setArchiveBusy(false);
    }
  }

  async function handleOpenArchiveFolder() {
    setError("");
    const info = archiveInfo || (await refreshArchiveInfo());
    if (!info?.folderPath) {
      setError("请先创建或检查 archive 文件");
      return;
    }

    const result = await openFolder(info.folderPath);
    if (!result.success) {
      setError(formatApiError(result.error));
    }
  }

  async function handleSave() {
    setError("");
    setNotice("");
    const result = await saveConfig(config);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setConfig(mergeConfig(result.data));
    refreshArchiveInfo(result.data.file?.archivePath);
    setNotice("设置已保存");
  }

  async function handleReset() {
    setError("");
    setNotice("");
    const result = await saveConfig(defaultConfig);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setConfig(mergeConfig(result.data));
    setArchiveInfo(null);
    setNotice("已恢复默认设置");
  }

  return (
    <section className="settings-grid">
      <div className="panel">
        <div className="section-heading">
          <p className="eyebrow">V2 设置</p>
          <h3>默认下载参数</h3>
        </div>

        <label className="field">
          <span>默认下载目录</span>
          <div className="input-action">
            <input
              value={config.defaultOutputDir}
              onChange={(event) => updateConfig("defaultOutputDir", event.target.value)}
              placeholder="选择默认下载目录"
            />
            <button
              type="button"
              className="icon-button"
              title="选择文件夹"
              onClick={handleSelectFolder}
            >
              <FolderOpen size={18} />
            </button>
          </div>
        </label>

        <div className="option-grid">
          <label className="field">
            <span>默认下载模式</span>
            <select
              value={config.defaultMode}
              onChange={(event) => updateConfig("defaultMode", event.target.value)}
            >
              <option value="video">视频</option>
              <option value="video-only">仅视频</option>
              <option value="audio">音频</option>
              <option value="subtitle-only">仅字幕</option>
            </select>
          </label>

          <label className="field">
            <span>默认音频格式</span>
            <select
              value={config.defaultAudioFormat}
              onChange={(event) => updateConfig("defaultAudioFormat", event.target.value)}
            >
              <option value="mp3">MP3</option>
              <option value="m4a">M4A</option>
              <option value="opus">OPUS</option>
              <option value="wav">WAV</option>
              <option value="flac">FLAC</option>
            </select>
          </label>

          <label className="field">
            <span>并发下载数量</span>
            <input
              type="number"
              min="1"
              max="5"
              value={config.concurrentDownloads}
              onChange={(event) =>
                updateConfig("concurrentDownloads", Number(event.target.value))
              }
            />
          </label>
        </div>

        <label className="field">
          <span>默认文件名模板</span>
          <input
            value={config.outputTemplate}
            onChange={(event) => updateConfig("outputTemplate", event.target.value)}
          />
        </label>

        <div className="option-block">
          <div className="section-heading compact-heading">
            <p className="eyebrow">格式</p>
            <h3>画质和容器</h3>
          </div>
          <div className="option-grid">
            <label className="field">
              <span>清晰度策略</span>
              <select
                value={config.quality.preset}
                onChange={(event) => updateNestedConfig("quality", "preset", event.target.value)}
              >
                <option value="best">最佳</option>
                <option value="worst">最低</option>
                <option value="resolution">指定分辨率</option>
                <option value="formatId">指定 format_id</option>
              </select>
            </label>

            <label className="field">
              <span>分辨率上限</span>
              <input
                type="number"
                min="144"
                max="4320"
                value={config.quality.resolution}
                onChange={(event) =>
                  updateNestedConfig("quality", "resolution", Number(event.target.value))
                }
              />
            </label>

            <label className="field">
              <span>容器</span>
              <select
                value={config.quality.container}
                onChange={(event) => updateNestedConfig("quality", "container", event.target.value)}
              >
                <option value="mp4">MP4</option>
                <option value="webm">WEBM</option>
                <option value="mkv">MKV</option>
                <option value="original">原始</option>
              </select>
            </label>
          </div>

          <label className="field">
            <span>format_id</span>
            <input
              value={config.quality.formatId}
              onChange={(event) => updateNestedConfig("quality", "formatId", event.target.value)}
              placeholder="仅在指定 format_id 时使用"
            />
          </label>
        </div>

        <div className="option-block">
          <div className="section-heading compact-heading">
            <p className="eyebrow">字幕</p>
            <h3>手动字幕、自动字幕和格式</h3>
          </div>
          <div className="toggle-grid">
            <label className="check-row">
              <input
                type="checkbox"
                checked={config.subtitles.writeSubs}
                onChange={(event) =>
                  updateNestedConfig("subtitles", "writeSubs", event.target.checked)
                }
              />
              下载手动字幕
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={config.subtitles.writeAutoSubs}
                onChange={(event) =>
                  updateNestedConfig("subtitles", "writeAutoSubs", event.target.checked)
                }
              />
              下载自动字幕
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={config.subtitles.embed}
                onChange={(event) =>
                  updateNestedConfig("subtitles", "embed", event.target.checked)
                }
              />
              嵌入字幕
            </label>
          </div>

          <div className="option-grid two-columns">
            <label className="field">
              <span>字幕语言</span>
              <input
                value={formatLanguageInput(config.subtitles.languages)}
                onChange={(event) =>
                  updateNestedConfig("subtitles", "languages", parseCsv(event.target.value))
                }
                placeholder="zh-Hans,en"
              />
            </label>

            <label className="field">
              <span>字幕格式</span>
              <select
                value={config.subtitles.format}
                onChange={(event) =>
                  updateNestedConfig("subtitles", "format", event.target.value)
                }
              >
                <option value="srt">SRT</option>
                <option value="vtt">VTT</option>
                <option value="ass">ASS</option>
                <option value="lrc">LRC</option>
              </select>
            </label>
          </div>
        </div>

        <div className="option-block">
          <div className="section-heading compact-heading">
            <p className="eyebrow">封面元数据</p>
            <h3>缩略图、简介和 JSON</h3>
          </div>
          <div className="toggle-grid">
            {[
              ["thumbnail", "下载封面"],
              ["embedThumbnail", "嵌入封面"],
              ["description", "下载简介"],
              ["infoJson", "下载 info.json"],
              ["comments", "下载评论"],
              ["embedMetadata", "嵌入元数据"]
            ].map(([key, label]) => (
              <label className="check-row" key={key}>
                <input
                  type="checkbox"
                  checked={config.metadata[key]}
                  onChange={(event) => updateNestedConfig("metadata", key, event.target.checked)}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="option-block">
          <div className="section-heading compact-heading">
            <p className="eyebrow">Cookie 与网络</p>
            <h3>本地 Cookie、代理和限速</h3>
          </div>

          <div className="option-grid">
            <label className="field">
              <span>Cookie 来源</span>
              <select
                value={config.auth.cookiesMode}
                onChange={(event) => updateNestedConfig("auth", "cookiesMode", event.target.value)}
              >
                <option value="none">不使用</option>
                <option value="file">cookies.txt</option>
                <option value="browser">浏览器</option>
              </select>
            </label>

            <label className="field">
              <span>浏览器 Cookie</span>
              <select
                value={config.auth.cookiesFromBrowser}
                onChange={(event) =>
                  updateNestedConfig("auth", "cookiesFromBrowser", event.target.value)
                }
                disabled={config.auth.cookiesMode !== "browser"}
              >
                <option value="">选择浏览器</option>
                <option value="chrome">Chrome</option>
                <option value="edge">Edge</option>
                <option value="firefox">Firefox</option>
                <option value="brave">Brave</option>
                <option value="opera">Opera</option>
              </select>
            </label>

            <label className="field">
              <span>重试次数</span>
              <input
                type="number"
                min="1"
                max="20"
                value={config.network.retries}
                onChange={(event) =>
                  updateNestedConfig("network", "retries", Number(event.target.value))
                }
              />
            </label>
          </div>

          <label className="field">
            <span>cookies.txt 文件</span>
            <div className="input-action">
              <input
                value={config.auth.cookiesFile}
                onChange={(event) => updateNestedConfig("auth", "cookiesFile", event.target.value)}
                placeholder="选择 cookies.txt"
                disabled={config.auth.cookiesMode !== "file"}
              />
              <button
                type="button"
                className="icon-button"
                title="选择 Cookie 文件"
                onClick={handleSelectCookieFile}
              >
                <FileText size={18} />
              </button>
            </div>
          </label>

          <div className="toggle-grid">
            <label className="check-row">
              <input
                type="checkbox"
                checked={config.network.proxyEnabled}
                onChange={(event) =>
                  updateNestedConfig("network", "proxyEnabled", event.target.checked)
                }
              />
              启用代理
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={config.file.archiveEnabled}
                onChange={(event) =>
                  updateNestedConfig("file", "archiveEnabled", event.target.checked)
                }
              />
              启用 archive
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={config.file.keepIntermediateFiles}
                onChange={(event) =>
                  updateNestedConfig("file", "keepIntermediateFiles", event.target.checked)
                }
              />
              保留中间文件
            </label>
          </div>

          <div className="option-grid two-columns">
            <label className="field">
              <span>代理地址</span>
              <input
                value={config.network.proxy}
                onChange={(event) => updateNestedConfig("network", "proxy", event.target.value)}
                placeholder="http://127.0.0.1:7890"
              />
            </label>

            <label className="field">
              <span>下载限速</span>
              <input
                value={config.network.limitRate}
                onChange={(event) => updateNestedConfig("network", "limitRate", event.target.value)}
                placeholder="2M"
              />
            </label>
          </div>

          <label className="field">
            <span>archive 文件路径</span>
            <div className="input-action">
              <input
                value={config.file.archivePath}
                onChange={(event) => {
                  updateNestedConfig("file", "archivePath", event.target.value);
                  setArchiveInfo(null);
                }}
                placeholder="留空则使用用户数据目录 archive.txt"
              />
              <button
                type="button"
                className="icon-button"
                title="选择 archive 文件"
                onClick={handleSelectArchiveFile}
              >
                <FileText size={18} />
              </button>
            </div>
          </label>

          <div className="archive-status">
            <dl className="detail-list">
              <div>
                <dt>archive 状态</dt>
                <dd>{formatArchiveStatus(archiveInfo, archiveBusy)}</dd>
              </div>
              <div>
                <dt>记录数量</dt>
                <dd>{archiveInfo ? `${archiveInfo.lineCount} 条` : "-"}</dd>
              </div>
              <div>
                <dt>文件大小</dt>
                <dd>{archiveInfo ? formatBytes(archiveInfo.size) : "-"}</dd>
              </div>
              <div>
                <dt>路径</dt>
                <dd>{archiveInfo?.archivePath || "尚未检查"}</dd>
              </div>
            </dl>
          </div>

          <div className="button-row">
            <button
              type="button"
              className="secondary-button"
              onClick={() => refreshArchiveInfo()}
              disabled={archiveBusy}
            >
              <Archive size={18} />
              检查 archive
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={handleCreateArchive}
              disabled={archiveBusy}
            >
              <Save size={18} />
              创建并启用
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={handleOpenArchiveFolder}
              disabled={archiveBusy}
            >
              <FolderOpen size={18} />
              打开目录
            </button>
            <button
              type="button"
              className="secondary-button danger-button"
              onClick={handleClearArchive}
              disabled={archiveBusy}
            >
              <Trash2 size={18} />
              清空 archive
            </button>
          </div>
        </div>

        {error ? <p className="message error-message">{error}</p> : null}
        {notice ? <p className="message success-message">{notice}</p> : null}

        <div className="button-row">
          <button type="button" className="primary-button" onClick={handleSave}>
            <Save size={18} />
            保存设置
          </button>
          <button type="button" className="secondary-button" onClick={handleReset}>
            <RotateCcw size={18} />
            恢复默认
          </button>
        </div>
      </div>

      <aside className="panel">
        <div className="section-heading">
          <p className="eyebrow">本地组件</p>
          <h3>yt-dlp 与 FFmpeg 检测</h3>
        </div>
        <dl className="detail-list">
          <div>
            <dt>yt-dlp</dt>
            <dd>{formatBinaryStatus(binaries?.ytdlp)}</dd>
          </div>
          <div>
            <dt>FFmpeg</dt>
            <dd>{formatBinaryStatus(binaries?.ffmpeg)}</dd>
          </div>
          <div>
            <dt>FFprobe</dt>
            <dd>{formatBinaryStatus(binaries?.ffprobe)}</dd>
          </div>
        </dl>
      </aside>
    </section>
  );
}

function mergeConfig(config) {
  return {
    ...defaultConfig,
    ...(config || {}),
    quality: { ...defaultConfig.quality, ...(config?.quality || {}) },
    subtitles: { ...defaultConfig.subtitles, ...(config?.subtitles || {}) },
    metadata: { ...defaultConfig.metadata, ...(config?.metadata || {}) },
    auth: { ...defaultConfig.auth, ...(config?.auth || {}) },
    network: { ...defaultConfig.network, ...(config?.network || {}) },
    file: { ...defaultConfig.file, ...(config?.file || {}) },
    playlist: { ...defaultConfig.playlist, ...(config?.playlist || {}) }
  };
}

function parseCsv(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatLanguageInput(value) {
  if (Array.isArray(value)) {
    return value.join(",");
  }

  if (typeof value === "string" && value.trim()) {
    return value;
  }

  return "zh-Hans,en";
}

function formatBinaryStatus(binary) {
  if (!binary) {
    return "等待检测";
  }

  if (!binary.available) {
    return binary.message || "不可用";
  }

  return `可用 ${binary.version}`;
}

function formatArchiveStatus(info, busy) {
  if (busy) {
    return "检查中";
  }

  if (!info) {
    return "尚未检查";
  }

  return info.exists ? `已存在，更新于 ${formatDate(info.updatedAt)}` : "文件不存在";
}

function formatDate(timestamp) {
  if (!timestamp) {
    return "-";
  }

  return new Date(timestamp).toLocaleString();
}

function formatBytes(value) {
  const size = Number(value) || 0;
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export default SettingsPage;
