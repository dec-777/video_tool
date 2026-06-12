import { useEffect, useState } from "react";
import { FileText, FolderOpen, Play, Search } from "lucide-react";
import { getConfig } from "../api/configApi.js";
import { buildCommandPreview, parseUrl, startDownload } from "../api/downloadApi.js";
import { selectFolder } from "../api/fileApi.js";
import { formatApiError } from "../utils/formatError.js";
import { formatDuration } from "../utils/formatTime.js";

function SubtitlePage() {
  const [url, setUrl] = useState("");
  const [videoInfo, setVideoInfo] = useState(null);
  const [outputDir, setOutputDir] = useState("");
  const [outputTemplate, setOutputTemplate] = useState("%(title)s.%(ext)s");
  const [writeSubs, setWriteSubs] = useState(true);
  const [writeAutoSubs, setWriteAutoSubs] = useState(false);
  const [languages, setLanguages] = useState("zh-Hans,en");
  const [format, setFormat] = useState("srt");
  const [configOptions, setConfigOptions] = useState({});
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [commandPreview, setCommandPreview] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!window.api) {
      return;
    }

    getConfig().then((result) => {
      if (!result.success) {
        return;
      }

      const subtitles = result.data.subtitles || {};
      setOutputDir(result.data.defaultOutputDir || "");
      setOutputTemplate(result.data.outputTemplate || "%(title)s.%(ext)s");
      setWriteSubs(Boolean(subtitles.writeSubs || !subtitles.writeAutoSubs));
      setWriteAutoSubs(Boolean(subtitles.writeAutoSubs));
      setLanguages(formatLanguageInput(subtitles.languages));
      setFormat(subtitles.format || "srt");
      setConfigOptions(result.data);
    });
  }, []);

  async function handleParse() {
    setError("");
    setNotice("");
    setVideoInfo(null);

    if (!url.trim()) {
      setError("请输入视频链接");
      return null;
    }

    setLoading(true);
    try {
      const result = await parseUrl(url.trim());
      if (!result.success) {
        setError(formatApiError(result.error));
        return null;
      }

      setVideoInfo(result.data);
      setNotice("解析成功");
      return result.data;
    } catch (parseError) {
      setError(formatApiError(parseError));
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectFolder() {
    setError("");
    const result = await selectFolder();
    if (result.success && !result.data.canceled) {
      setOutputDir(result.data.folderPath);
    }
  }

  async function handleStartDownload() {
    setError("");
    setNotice("");
    setCommandPreview("");

    const options = await prepareOptions();
    if (!options) {
      return;
    }

    setStarting(true);
    try {
      const result = await startDownload(options);
      if (!result.success) {
        setError(formatApiError(result.error));
        return;
      }

      setNotice(`已加入 ${result.data.length} 个字幕任务`);
    } catch (startError) {
      setError(formatApiError(startError));
    } finally {
      setStarting(false);
    }
  }

  async function handlePreview() {
    setError("");
    setNotice("");
    setCommandPreview("");

    const options = await prepareOptions({ parseIfNeeded: false });
    if (!options) {
      return;
    }

    setPreviewing(true);
    try {
      const result = await buildCommandPreview(options);
      if (!result.success) {
        setError(formatApiError(result.error));
        return;
      }

      setCommandPreview(result.data);
    } catch (previewError) {
      setError(formatApiError(previewError));
    } finally {
      setPreviewing(false);
    }
  }

  async function prepareOptions({ parseIfNeeded = true } = {}) {
    if (!url.trim()) {
      setError("请输入视频链接");
      return null;
    }

    if (!outputDir.trim()) {
      setError("请选择保存目录");
      return null;
    }

    if (!outputTemplate.trim()) {
      setError("请输入文件名模板");
      return null;
    }

    if (!writeSubs && !writeAutoSubs) {
      setError("请至少选择手动字幕或自动字幕");
      return null;
    }

    let parsed = videoInfo;
    if (parseIfNeeded && !parsed) {
      parsed = await handleParse();
      if (!parsed) {
        return null;
      }
    }

    return createDownloadOptions(parsed);
  }

  function createDownloadOptions(parsed) {
    return {
      urls: [url.trim()],
      mode: "subtitle-only",
      quality: configOptions.quality || { preset: "best", container: "mp4" },
      audio: {
        format: configOptions.defaultAudioFormat || "mp3"
      },
      subtitles: {
        writeSubs,
        writeAutoSubs,
        languages: parseCsv(languages),
        format,
        embed: false
      },
      metadata: {},
      auth: configOptions.auth || { cookiesMode: "none" },
      network: configOptions.network || { retries: 10 },
      file: {
        outputDir: outputDir.trim(),
        outputTemplate: outputTemplate.trim(),
        archiveEnabled: Boolean(configOptions.file?.archiveEnabled),
        archivePath: configOptions.file?.archivePath || "",
        keepIntermediateFiles: false
      },
      playlist: {
        enabled: false
      },
      videoInfo: parsed || null
    };
  }

  const manualLanguages = getLanguageKeys(videoInfo?.subtitles);
  const autoLanguages = getLanguageKeys(videoInfo?.automaticCaptions);

  return (
    <section className="page-grid">
      <div className="panel primary-panel">
        <div className="section-heading">
          <p className="eyebrow">字幕提取</p>
          <h3>下载手动字幕或自动字幕</h3>
        </div>

        <label className="field">
          <span>视频链接</span>
          <div className="input-action">
            <input
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                setVideoInfo(null);
                setNotice("");
                setCommandPreview("");
              }}
              placeholder="https://example.com/watch?v=..."
            />
            <button
              type="button"
              className="icon-button"
              title="解析字幕"
              onClick={handleParse}
              disabled={loading}
            >
              <Search size={18} />
            </button>
          </div>
        </label>

        <div className="toggle-grid">
          <label className="check-row">
            <input
              type="checkbox"
              checked={writeSubs}
              onChange={(event) => setWriteSubs(event.target.checked)}
            />
            手动字幕
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={writeAutoSubs}
              onChange={(event) => setWriteAutoSubs(event.target.checked)}
            />
            自动字幕
          </label>
        </div>

        <div className="option-grid two-columns">
          <label className="field">
            <span>字幕语言</span>
            <input
              value={languages}
              onChange={(event) => setLanguages(event.target.value)}
              placeholder="zh-Hans,en"
            />
          </label>

          <label className="field">
            <span>字幕格式</span>
            <select value={format} onChange={(event) => setFormat(event.target.value)}>
              <option value="srt">SRT</option>
              <option value="vtt">VTT</option>
              <option value="ass">ASS</option>
              <option value="lrc">LRC</option>
            </select>
          </label>
        </div>

        <label className="field">
          <span>保存目录</span>
          <div className="input-action">
            <input
              value={outputDir}
              onChange={(event) => setOutputDir(event.target.value)}
              placeholder="选择保存目录"
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

        <label className="field">
          <span>文件名模板</span>
          <input
            value={outputTemplate}
            onChange={(event) => setOutputTemplate(event.target.value)}
          />
        </label>

        {error ? <p className="message error-message">{error}</p> : null}
        {notice ? <p className="message success-message">{notice}</p> : null}

        <div className="button-row">
          <button
            type="button"
            className="primary-button"
            onClick={handleStartDownload}
            disabled={starting}
          >
            <Play size={18} />
            {starting ? "加入中" : "提取字幕"}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={handlePreview}
            disabled={previewing}
          >
            <FileText size={18} />
            {previewing ? "生成中" : "命令预览"}
          </button>
        </div>

        {commandPreview ? <pre className="command-preview">{commandPreview}</pre> : null}
      </div>

      <aside className="panel info-panel">
        {videoInfo?.thumbnail ? (
          <img className="video-thumbnail" src={videoInfo.thumbnail} alt="" />
        ) : (
          <div className="video-placeholder">
            <span>{loading ? "解析中" : "等待解析"}</span>
          </div>
        )}

        <h3>字幕信息</h3>
        <dl className="detail-list">
          <div>
            <dt>标题</dt>
            <dd>{videoInfo?.title || "解析后显示"}</dd>
          </div>
          <div>
            <dt>时长</dt>
            <dd>{formatDuration(videoInfo?.duration)}</dd>
          </div>
        </dl>

        <div className="subtitle-language-block">
          <p className="eyebrow">手动字幕</p>
          <LanguageList languages={manualLanguages} />
        </div>
        <div className="subtitle-language-block">
          <p className="eyebrow">自动字幕</p>
          <LanguageList languages={autoLanguages} />
        </div>
      </aside>
    </section>
  );
}

function LanguageList({ languages }) {
  if (languages.length === 0) {
    return <p className="helper-text">未检测到</p>;
  }

  return (
    <div className="language-list">
      {languages.map((language) => (
        <span className="language-chip" key={language}>
          {language}
        </span>
      ))}
    </div>
  );
}

function getLanguageKeys(value) {
  if (!value || typeof value !== "object") {
    return [];
  }

  return Object.keys(value).filter(Boolean).slice(0, 24);
}

function parseCsv(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatLanguageInput(value) {
  if (Array.isArray(value) && value.length > 0) {
    return value.join(",");
  }

  if (typeof value === "string" && value.trim()) {
    return value;
  }

  return "zh-Hans,en";
}

export default SubtitlePage;
