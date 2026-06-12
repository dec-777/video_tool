import { useEffect, useMemo, useState } from "react";
import { CheckSquare, FolderOpen, ListPlus, Search, Square } from "lucide-react";
import { getConfig } from "../api/configApi.js";
import { parsePlaylist, startDownload } from "../api/downloadApi.js";
import { selectFolder } from "../api/fileApi.js";
import { formatApiError } from "../utils/formatError.js";
import { formatDuration } from "../utils/formatTime.js";

function PlaylistPage() {
  const [url, setUrl] = useState("");
  const [playlistInfo, setPlaylistInfo] = useState(null);
  const [selectedUrls, setSelectedUrls] = useState([]);
  const [outputDir, setOutputDir] = useState("");
  const [outputTemplate, setOutputTemplate] = useState(
    "%(playlist_title)s/%(playlist_index)s - %(title)s.%(ext)s"
  );
  const [mode, setMode] = useState("video");
  const [audioFormat, setAudioFormat] = useState("mp3");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [configOptions, setConfigOptions] = useState({});
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const validEntries = useMemo(
    () =>
      (playlistInfo?.entries || []).filter((entry) => /^https?:\/\//i.test(entry.url || "")),
    [playlistInfo]
  );

  const selectedCount = selectedUrls.length;

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
      setConfigOptions(result.data);
    });
  }, []);

  async function handleParse() {
    setError("");
    setNotice("");
    setPlaylistInfo(null);
    setSelectedUrls([]);

    if (!url.trim()) {
      setError("请输入播放列表或频道链接");
      return;
    }

    setLoading(true);
    try {
      const result = await parsePlaylist(url.trim());
      if (!result.success) {
        setError(formatApiError(result.error));
        return;
      }

      setPlaylistInfo(result.data);
      const urls = (result.data.entries || [])
        .filter((entry) => /^https?:\/\//i.test(entry.url || ""))
        .map((entry) => entry.url);
      setSelectedUrls(urls);
      setNotice(`解析到 ${result.data.count || urls.length} 个条目，已默认选中可下载条目`);
    } catch (parseError) {
      setError(formatApiError(parseError));
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

  function toggleEntry(entryUrl) {
    setSelectedUrls((current) =>
      current.includes(entryUrl)
        ? current.filter((item) => item !== entryUrl)
        : [...current, entryUrl]
    );
  }

  function selectAll() {
    setSelectedUrls(validEntries.map((entry) => entry.url));
  }

  function clearSelection() {
    setSelectedUrls([]);
  }

  async function handleStartSelected() {
    await startWithUrls(selectedUrls, { playlistEnabled: false });
  }

  async function handleStartRange() {
    if (!url.trim()) {
      setError("请输入播放列表或频道链接");
      return;
    }

    await startWithUrls([url.trim()], {
      playlistEnabled: true,
      playlistStart: Number(rangeStart) || 0,
      playlistEnd: Number(rangeEnd) || 0
    });
  }

  async function startWithUrls(urls, playlistPatch) {
    setError("");
    setNotice("");

    if (urls.length === 0) {
      setError("请选择至少一个可下载条目");
      return;
    }

    if (!outputDir.trim()) {
      setError("请选择保存目录");
      return;
    }

    setStarting(true);
    try {
      const result = await startDownload(createDownloadOptions(urls, playlistPatch));
      if (!result.success) {
        setError(formatApiError(result.error));
        return;
      }

      setNotice(`已加入 ${result.data.length} 个任务`);
    } catch (startError) {
      setError(formatApiError(startError));
    } finally {
      setStarting(false);
    }
  }

  function createDownloadOptions(urls, playlistPatch) {
    return {
      urls,
      mode,
      quality: configOptions.quality || { preset: "best", container: "mp4" },
      audio: {
        format: audioFormat
      },
      subtitles: configOptions.subtitles || {},
      metadata: configOptions.metadata || {},
      auth: configOptions.auth || { cookiesMode: "none" },
      network: configOptions.network || { retries: 10 },
      file: {
        outputDir: outputDir.trim(),
        outputTemplate: outputTemplate.trim(),
        archiveEnabled: Boolean(configOptions.file?.archiveEnabled),
        archivePath: configOptions.file?.archivePath || "",
        keepIntermediateFiles: Boolean(configOptions.file?.keepIntermediateFiles)
      },
      playlist: {
        ...(configOptions.playlist || {}),
        enabled: Boolean(playlistPatch.playlistEnabled),
        start: playlistPatch.playlistStart || 0,
        end: playlistPatch.playlistEnd || 0
      }
    };
  }

  return (
    <section className="panel full-panel">
      <div className="section-heading">
        <p className="eyebrow">播放列表</p>
        <h3>解析播放列表或频道并选择条目</h3>
      </div>

      <label className="field">
        <span>播放列表 / 频道链接</span>
        <div className="input-action">
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com/playlist..."
          />
          <button
            type="button"
            className="icon-button"
            title="解析播放列表"
            onClick={handleParse}
            disabled={loading}
          >
            <Search size={18} />
          </button>
        </div>
      </label>

      <div className="option-grid">
        <label className="field">
          <span>下载模式</span>
          <select value={mode} onChange={(event) => setMode(event.target.value)}>
            <option value="video">视频</option>
            <option value="video-only">仅视频</option>
            <option value="audio">音频</option>
            <option value="subtitle-only">仅字幕</option>
          </select>
        </label>

        <label className="field">
          <span>音频格式</span>
          <select
            value={audioFormat}
            onChange={(event) => setAudioFormat(event.target.value)}
            disabled={mode !== "audio"}
          >
            <option value="mp3">MP3</option>
            <option value="m4a">M4A</option>
            <option value="opus">OPUS</option>
            <option value="wav">WAV</option>
            <option value="flac">FLAC</option>
          </select>
        </label>

        <label className="field">
          <span>文件名模板</span>
          <input
            value={outputTemplate}
            onChange={(event) => setOutputTemplate(event.target.value)}
          />
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

      <div className="option-block">
        <div className="section-heading compact-heading">
          <p className="eyebrow">范围下载</p>
          <h3>不展开条目时按播放列表范围加入</h3>
        </div>
        <div className="option-grid">
          <label className="field">
            <span>开始序号</span>
            <input
              type="number"
              min="1"
              value={rangeStart}
              onChange={(event) => setRangeStart(event.target.value)}
              placeholder="1"
            />
          </label>
          <label className="field">
            <span>结束序号</span>
            <input
              type="number"
              min="1"
              value={rangeEnd}
              onChange={(event) => setRangeEnd(event.target.value)}
              placeholder="10"
            />
          </label>
          <div className="field">
            <span>操作</span>
            <button
              type="button"
              className="secondary-button"
              onClick={handleStartRange}
              disabled={starting}
            >
              <ListPlus size={18} />
              按范围加入
            </button>
          </div>
        </div>
      </div>

      {error ? <p className="message error-message">{error}</p> : null}
      {notice ? <p className="message success-message">{notice}</p> : null}

      {playlistInfo ? (
        <div className="playlist-panel">
          <div className="row-heading">
            <div>
              <p className="eyebrow">解析结果</p>
              <h3>{playlistInfo.title}</h3>
              <p className="helper-text">
                共 {playlistInfo.count} 个条目，可下载 {validEntries.length} 个，已选 {selectedCount} 个
              </p>
            </div>
            <div className="button-row">
              <button type="button" className="secondary-button" onClick={selectAll}>
                <CheckSquare size={18} />
                全选
              </button>
              <button type="button" className="secondary-button" onClick={clearSelection}>
                <Square size={18} />
                清空
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={handleStartSelected}
                disabled={starting || selectedCount === 0}
              >
                <ListPlus size={18} />
                加入选中
              </button>
            </div>
          </div>

          <div className="playlist-list">
            {(playlistInfo.entries || []).map((entry) => {
              const downloadable = /^https?:\/\//i.test(entry.url || "");
              const selected = selectedUrls.includes(entry.url);

              return (
                <article className="playlist-row" key={`${entry.index}-${entry.id || entry.url}`}>
                  <label className="check-row playlist-check">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleEntry(entry.url)}
                      disabled={!downloadable}
                    />
                    <span>{entry.index}</span>
                  </label>
                  <div className="playlist-entry-main">
                    <h4>{entry.title}</h4>
                    <p>{entry.url || "该条目没有可直接下载链接"}</p>
                    <div className="task-meta">
                      <span>{entry.uploader || "-"}</span>
                      <span>{formatDuration(entry.duration)}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default PlaylistPage;
