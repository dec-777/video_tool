import { useEffect, useState } from "react";
import { Eraser, FolderOpen, Layers } from "lucide-react";
import { startDownload } from "../api/downloadApi.js";
import { getConfig } from "../api/configApi.js";
import { selectFolder } from "../api/fileApi.js";
import { formatApiError } from "../utils/formatError.js";

function BatchPage() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState("video");
  const [audioFormat, setAudioFormat] = useState("mp3");
  const [outputDir, setOutputDir] = useState("");
  const [outputTemplate, setOutputTemplate] = useState("%(title)s.%(ext)s");
  const [qualityOptions, setQualityOptions] = useState({ preset: "best", container: "mp4" });
  const [subtitleOptions, setSubtitleOptions] = useState({});
  const [metadataOptions, setMetadataOptions] = useState({});
  const [authOptions, setAuthOptions] = useState({ cookiesMode: "none" });
  const [networkOptions, setNetworkOptions] = useState({ retries: 10 });
  const [fileOptions, setFileOptions] = useState({});
  const [playlistOptions, setPlaylistOptions] = useState({ enabled: false });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const urls = parseUrls(text);

  useEffect(() => {
    if (!window.api) {
      return;
    }

    getConfig().then((result) => {
      if (!result.success) {
        return;
      }

      setOutputDir(result.data.defaultOutputDir || "");
      setMode(result.data.defaultMode || "video");
      setAudioFormat(result.data.defaultAudioFormat || "mp3");
      setOutputTemplate(result.data.outputTemplate || "%(title)s.%(ext)s");
      setQualityOptions(result.data.quality || { preset: "best", container: "mp4" });
      setSubtitleOptions(result.data.subtitles || {});
      setMetadataOptions(result.data.metadata || {});
      setAuthOptions(result.data.auth || { cookiesMode: "none" });
      setNetworkOptions(result.data.network || { retries: 10 });
      setFileOptions(result.data.file || {});
      setPlaylistOptions(result.data.playlist || { enabled: false });
    });
  }, []);

  async function handleSelectFolder() {
    const result = await selectFolder();
    if (result.success && !result.data.canceled) {
      setOutputDir(result.data.folderPath);
    }
  }

  async function handleStartBatch() {
    setError("");
    setNotice("");

    if (urls.length === 0) {
      setError("请输入至少一个有效 URL");
      return;
    }

    if (!outputDir.trim()) {
      setError("请选择保存目录");
      return;
    }

    const result = await startDownload({
      urls,
      mode,
      quality: qualityOptions,
      audio: {
        format: audioFormat
      },
      subtitles: subtitleOptions,
      metadata: metadataOptions,
      auth: authOptions,
      network: networkOptions,
      file: {
        outputDir,
        outputTemplate,
        archiveEnabled: Boolean(fileOptions.archiveEnabled),
        archivePath: fileOptions.archivePath || "",
        keepIntermediateFiles: Boolean(fileOptions.keepIntermediateFiles)
      },
      playlist: playlistOptions
    });

    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }

    setNotice(`已加入 ${result.data.length} 个任务`);
  }

  return (
    <section className="panel full-panel">
      <div className="section-heading">
        <p className="eyebrow">批量下载</p>
        <h3>一行一个 URL，过滤空行并去重后加入队列</h3>
      </div>

      <label className="field">
        <span>URL 列表</span>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={12}
          placeholder={"https://example.com/video-1\nhttps://example.com/video-2"}
        />
      </label>

      <div className="segmented-control" aria-label="批量下载模式">
        <button
          type="button"
          className={mode === "video" ? "is-selected" : ""}
          onClick={() => setMode("video")}
        >
          视频 MP4
        </button>
        <button
          type="button"
          className={mode === "video-only" ? "is-selected" : ""}
          onClick={() => setMode("video-only")}
        >
          仅视频
        </button>
        <button
          type="button"
          className={mode === "audio" && audioFormat === "mp3" ? "is-selected" : ""}
          onClick={() => {
            setMode("audio");
            setAudioFormat("mp3");
          }}
        >
          音频 MP3
        </button>
        <button
          type="button"
          className={mode === "audio" && audioFormat === "m4a" ? "is-selected" : ""}
          onClick={() => {
            setMode("audio");
            setAudioFormat("m4a");
          }}
        >
          音频 M4A
        </button>
        <button
          type="button"
          className={mode === "subtitle-only" ? "is-selected" : ""}
          onClick={() => setMode("subtitle-only")}
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

      <p className="helper-text">有效 URL：{urls.length} 个，重复和空行会自动过滤。</p>
      {error ? <p className="message error-message">{error}</p> : null}
      {notice ? <p className="message success-message">{notice}</p> : null}

      <div className="button-row">
        <button type="button" className="secondary-button" onClick={() => setText("")}>
          <Eraser size={18} />
          清空
        </button>
        <button type="button" className="primary-button" onClick={handleStartBatch}>
          <Layers size={18} />
          批量加入任务
        </button>
      </div>
    </section>
  );
}

function parseUrls(value) {
  const urls = value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter((item) => /^https?:\/\//i.test(item));

  return Array.from(new Set(urls));
}

export default BatchPage;
