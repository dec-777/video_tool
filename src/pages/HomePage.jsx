import { useEffect, useState } from "react";
import { FileText, FolderOpen, Play, Search } from "lucide-react";
import { buildCommandPreview, parseUrl, startDownload } from "../api/downloadApi.js";
import { getConfig } from "../api/configApi.js";
import { selectFolder } from "../api/fileApi.js";
import { formatApiError } from "../utils/formatError.js";
import { formatDuration } from "../utils/formatTime.js";

function HomePage() {
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState("video");
  const [audioFormat, setAudioFormat] = useState("mp3");
  const [qualityPreset, setQualityPreset] = useState("best");
  const [resolution, setResolution] = useState(1080);
  const [formatId, setFormatId] = useState("");
  const [container, setContainer] = useState("mp4");
  const [outputDir, setOutputDir] = useState("");
  const [outputTemplate, setOutputTemplate] = useState("%(title)s.%(ext)s");
  const [writeSubs, setWriteSubs] = useState(false);
  const [writeAutoSubs, setWriteAutoSubs] = useState(false);
  const [subtitleLanguages, setSubtitleLanguages] = useState("zh-Hans,en");
  const [subtitleFormat, setSubtitleFormat] = useState("srt");
  const [embedSubs, setEmbedSubs] = useState(false);
  const [metadataOptions, setMetadataOptions] = useState({});
  const [authOptions, setAuthOptions] = useState({ cookiesMode: "none" });
  const [networkOptions, setNetworkOptions] = useState({ retries: 10 });
  const [fileOptions, setFileOptions] = useState({});
  const [playlistOptions, setPlaylistOptions] = useState({ enabled: false });
  const [videoInfo, setVideoInfo] = useState(null);
  const [parsedUrl, setParsedUrl] = useState("");
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

      setOutputDir(result.data.defaultOutputDir || "");
      const defaultMode = result.data.defaultMode || "video";
      setMode(defaultMode);
      setAudioFormat(result.data.defaultAudioFormat || "mp3");
      setQualityPreset(result.data.quality?.preset || "best");
      setResolution(result.data.quality?.resolution || 1080);
      setFormatId(result.data.quality?.formatId || "");
      setContainer(result.data.quality?.container || result.data.defaultContainer || "mp4");
      setOutputTemplate(result.data.outputTemplate || "%(title)s.%(ext)s");
      setWriteSubs(Boolean(result.data.subtitles?.writeSubs || defaultMode === "subtitle-only"));
      setWriteAutoSubs(Boolean(result.data.subtitles?.writeAutoSubs));
      setSubtitleLanguages(formatLanguageInput(result.data.subtitles?.languages));
      setSubtitleFormat(result.data.subtitles?.format || "srt");
      setEmbedSubs(Boolean(result.data.subtitles?.embed));
      setMetadataOptions(result.data.metadata || {});
      setAuthOptions(result.data.auth || { cookiesMode: "none" });
      setNetworkOptions(result.data.network || { retries: 10 });
      setFileOptions(result.data.file || {});
      setPlaylistOptions(result.data.playlist || { enabled: false });
    });
  }, []);

  async function parseCurrentUrl({ showLoading = true } = {}) {
    setError("");
    setNotice("");

    const nextUrl = url.trim();
    if (!nextUrl) {
      setError("请输入视频链接");
      return null;
    }

    if (videoInfo && parsedUrl === nextUrl) {
      return videoInfo;
    }

    if (showLoading) {
      setLoading(true);
    }

    try {
      const result = await parseUrl(nextUrl);
      if (!result.success) {
        setError(formatApiError(result.error));
        setVideoInfo(null);
        setParsedUrl("");
        return null;
      }

      setVideoInfo(result.data);
      setParsedUrl(nextUrl);
      return result.data;
    } catch (parseError) {
      setError(formatApiError(parseError));
      setVideoInfo(null);
      setParsedUrl("");
      return null;
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  async function handleParse() {
    const parsed = await parseCurrentUrl({ showLoading: true });
    if (parsed) {
      setNotice("解析成功，已获取标题、站点和时长");
    }
  }

  async function handleSelectFolder() {
    setError("");
    try {
      const result = await selectFolder();
      if (!result.success) {
        setError(formatApiError(result.error));
        return;
      }

      if (!result.data.canceled && result.data.folderPath) {
        setOutputDir(result.data.folderPath);
      }
    } catch (selectError) {
      setError(formatApiError(selectError));
    }
  }

  async function handleStartDownload() {
    setError("");
    setNotice("");

    if (!url.trim()) {
      setError("请输入视频链接");
      return;
    }

    if (!outputDir.trim()) {
      setError("请选择保存目录");
      return;
    }

    if (!outputTemplate.trim()) {
      setError("请输入文件名模板");
      return;
    }

    setStarting(true);
    try {
      const parsed = await parseCurrentUrl({ showLoading: false });
      if (!parsed) {
        return;
      }

      const options = createDownloadOptions(parsed);

      const result = await startDownload(options);
      if (!result.success) {
        setError(formatApiError(result.error));
        return;
      }

      setNotice(`已解析「${parsed.title || "视频"}」并加入队列，可在任务中心查看进度`);
    } catch (startError) {
      setError(formatApiError(startError));
    } finally {
      setStarting(false);
    }
  }

  function handleModeChange(nextMode, nextAudioFormat = audioFormat) {
    setMode(nextMode);
    setAudioFormat(nextAudioFormat);
    if (nextMode === "subtitle-only") {
      setWriteSubs(true);
    }
  }

  async function handlePreview() {
    setError("");
    setNotice("");
    setCommandPreview("");

    if (!url.trim()) {
      setError("请输入视频链接");
      return;
    }

    if (!outputDir.trim()) {
      setError("请选择保存目录");
      return;
    }

    setPreviewing(true);
    try {
      const result = await buildCommandPreview(createDownloadOptions(videoInfo));
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

  function createDownloadOptions(parsed) {
    return {
      urls: [url.trim()],
      mode,
      quality: {
        preset: qualityPreset,
        resolution: Number(resolution) || 1080,
        formatId,
        container
      },
      audio: {
        format: audioFormat
      },
      subtitles: {
        writeSubs,
        writeAutoSubs,
        languages: subtitleLanguages
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        format: subtitleFormat,
        embed: mode !== "subtitle-only" && embedSubs
      },
      metadata: metadataOptions,
      auth: authOptions,
      network: networkOptions,
      file: {
        outputDir: outputDir.trim(),
        outputTemplate: outputTemplate.trim(),
        archiveEnabled: Boolean(fileOptions.archiveEnabled),
        archivePath: fileOptions.archivePath || "",
        keepIntermediateFiles: Boolean(fileOptions.keepIntermediateFiles)
      },
      playlist: playlistOptions,
      videoInfo: parsed || null
    };
  }

  return (
    <section className="page-grid">
      <div className="panel primary-panel">
        <div className="section-heading">
          <p className="eyebrow">单 URL 下载</p>
          <h3>解析链接并创建一个下载任务</h3>
        </div>

        <label className="field">
          <span>视频链接</span>
          <div className="input-action">
            <input
              value={url}
              onChange={(event) => {
                const nextUrl = event.target.value;
                setUrl(nextUrl);
                setNotice("");

                if (nextUrl.trim() !== parsedUrl) {
                  setVideoInfo(null);
                  setParsedUrl("");
                }
              }}
              placeholder="https://example.com/watch?v=..."
            />
            <button
              type="button"
              className="icon-button"
              title="解析链接"
              onClick={handleParse}
              disabled={loading}
            >
              <Search size={18} />
            </button>
          </div>
        </label>

        <div className="segmented-control" aria-label="下载模式">
          <button
            type="button"
            className={mode === "video" ? "is-selected" : ""}
            onClick={() => handleModeChange("video")}
          >
            视频 MP4
          </button>
          <button
            type="button"
            className={mode === "video-only" ? "is-selected" : ""}
            onClick={() => handleModeChange("video-only")}
          >
            仅视频
          </button>
          <button
            type="button"
            className={mode === "audio" && audioFormat === "mp3" ? "is-selected" : ""}
            onClick={() => handleModeChange("audio", "mp3")}
          >
            音频 MP3
          </button>
          <button
            type="button"
            className={mode === "audio" && audioFormat === "m4a" ? "is-selected" : ""}
            onClick={() => handleModeChange("audio", "m4a")}
          >
            音频 M4A
          </button>
          <button
            type="button"
            className={mode === "subtitle-only" ? "is-selected" : ""}
            onClick={() => handleModeChange("subtitle-only")}
          >
            仅字幕
          </button>
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

        <div className="option-block">
          <div className="section-heading compact-heading">
            <p className="eyebrow">V2 格式</p>
            <h3>清晰度、容器和字幕</h3>
          </div>

          <div className="option-grid">
            <label className="field">
              <span>清晰度</span>
              <select
                value={qualityPreset}
                onChange={(event) => setQualityPreset(event.target.value)}
                disabled={mode === "subtitle-only"}
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
                value={resolution}
                onChange={(event) => setResolution(event.target.value)}
                disabled={mode === "subtitle-only" || qualityPreset !== "resolution"}
              />
            </label>

            <label className="field">
              <span>视频容器</span>
              <select
                value={container}
                onChange={(event) => setContainer(event.target.value)}
                disabled={mode === "subtitle-only"}
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
              value={formatId}
              onChange={(event) => setFormatId(event.target.value)}
              placeholder="仅在指定 format_id 时使用"
              disabled={mode === "subtitle-only" || qualityPreset !== "formatId"}
            />
          </label>

          <div className="toggle-grid">
            <label className="check-row">
              <input
                type="checkbox"
                checked={writeSubs}
                disabled={mode === "subtitle-only"}
                onChange={(event) => setWriteSubs(event.target.checked)}
              />
              下载手动字幕
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={writeAutoSubs}
                onChange={(event) => setWriteAutoSubs(event.target.checked)}
              />
              下载自动字幕
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={mode !== "subtitle-only" && embedSubs}
                disabled={mode === "subtitle-only"}
                onChange={(event) => setEmbedSubs(event.target.checked)}
              />
              嵌入字幕
            </label>
          </div>

          <div className="option-grid two-columns">
            <label className="field">
              <span>字幕语言</span>
              <input
                value={subtitleLanguages}
                onChange={(event) => setSubtitleLanguages(event.target.value)}
                placeholder="zh-Hans,en"
              />
            </label>

            <label className="field">
              <span>字幕格式</span>
              <select
                value={subtitleFormat}
                onChange={(event) => setSubtitleFormat(event.target.value)}
              >
                <option value="srt">SRT</option>
                <option value="vtt">VTT</option>
                <option value="ass">ASS</option>
                <option value="lrc">LRC</option>
              </select>
            </label>
          </div>
        </div>

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
            {starting ? "解析并加入中" : "开始下载"}
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
        <h3>视频信息</h3>
        <dl className="detail-list">
          <div>
            <dt>标题</dt>
            <dd>{videoInfo?.title || "解析成功后显示"}</dd>
          </div>
          <div>
            <dt>站点</dt>
            <dd>{videoInfo?.extractor || "-"}</dd>
          </div>
          <div>
            <dt>时长</dt>
            <dd>{formatDuration(videoInfo?.duration)}</dd>
          </div>
          <div>
            <dt>作者</dt>
            <dd>{videoInfo?.uploader || "-"}</dd>
          </div>
        </dl>
      </aside>
    </section>
  );
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

export default HomePage;
