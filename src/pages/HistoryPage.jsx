import { useMemo, useState } from "react";
import { FolderOpen, RotateCcw, Search, Trash2 } from "lucide-react";
import { clearHistory as clearHistoryApi } from "../api/historyApi.js";
import { startDownload } from "../api/downloadApi.js";
import { openFolder } from "../api/fileApi.js";
import { useHistory } from "../hooks/useHistory.js";
import { setHistoryRecords } from "../store/historyStore.js";
import { formatApiError } from "../utils/formatError.js";

function HistoryPage() {
  const records = useHistory();
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [siteFilter, setSiteFilter] = useState("all");

  const filteredRecords = useMemo(
    () => filterRecords(records, { keyword, status: statusFilter, site: siteFilter }),
    [records, keyword, statusFilter, siteFilter]
  );
  const sites = useMemo(() => collectSites(records), [records]);

  async function handleClearHistory() {
    const result = await clearHistoryApi();
    if (result.success) {
      setHistoryRecords([]);
      return;
    }

    window.alert(formatApiError(result.error));
  }

  async function handleOpenFolder(record) {
    const folderPath = record.outputDir || "";
    const result = await openFolder(folderPath);
    if (!result.success) {
      window.alert(formatApiError(result.error));
    }
  }

  async function handleRedownload(record) {
    const options =
      record.options || {
        urls: [record.url],
        mode: record.mode || "video",
        quality: {
          preset: "best",
          container: "mp4"
        },
        audio: {
          format: "mp3"
        },
        file: {
          outputDir: record.outputDir,
          outputTemplate: record.outputTemplate || "%(title)s.%(ext)s"
        }
      };

    const result = await startDownload(options);
    if (!result.success) {
      window.alert(formatApiError(result.error));
    }
  }

  return (
    <section className="panel full-panel">
      <div className="section-heading row-heading">
        <div>
          <p className="eyebrow">下载历史</p>
          <h3>完成、失败和取消记录</h3>
        </div>
        <button type="button" className="secondary-button" onClick={handleClearHistory}>
          <Trash2 size={18} />
          清空历史
        </button>
      </div>

      <div className="history-filter-bar">
        <label className="field">
          <span>搜索历史</span>
          <div className="input-action">
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="标题、URL、站点或错误信息"
            />
            <button type="button" className="icon-button" title="搜索历史">
              <Search size={18} />
            </button>
          </div>
        </label>

        <label className="field">
          <span>状态筛选</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">全部状态</option>
            <option value="completed">已完成</option>
            <option value="failed">失败</option>
            <option value="canceled">已取消</option>
          </select>
        </label>

        <label className="field">
          <span>站点筛选</span>
          <select value={siteFilter} onChange={(event) => setSiteFilter(event.target.value)}>
            <option value="all">全部站点</option>
            {sites.map((site) => (
              <option value={site} key={site}>
                {site}
              </option>
            ))}
          </select>
        </label>
      </div>

      {records.length === 0 ? (
        <div className="empty-state">
          <h4>还没有历史记录</h4>
          <p>任务完成或失败后会写入本地历史文件。</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="empty-state">
          <h4>没有匹配记录</h4>
          <p>换一个关键词、状态或站点再看。</p>
        </div>
      ) : (
        <div className="history-list">
          {filteredRecords.map((record) => (
            <article className="history-row" key={record.id}>
              <div>
                <h4>{record.title || record.url}</h4>
                <p>{record.url}</p>
                <div className="task-meta">
                  <span>{record.mode}</span>
                  <span>{record.status}</span>
                  <span>{formatDate(record.completedAt)}</span>
                </div>
                {record.error ? <p className="task-error">{record.error}</p> : null}
              </div>
              <div className="task-actions">
                <button
                  type="button"
                  className="icon-button"
                  title="打开文件夹"
                  onClick={() => handleOpenFolder(record)}
                  disabled={!record.outputDir}
                >
                  <FolderOpen size={17} />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  title="重新下载"
                  onClick={() => handleRedownload(record)}
                  disabled={!record.url || !record.outputDir}
                >
                  <RotateCcw size={17} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function formatDate(timestamp) {
  if (!timestamp) {
    return "-";
  }

  return new Date(timestamp).toLocaleString();
}

function filterRecords(records, filters) {
  const keyword = normalizeText(filters.keyword).toLowerCase();
  const status = filters.status;
  const site = filters.site;

  return records.filter((record) => {
    if (status !== "all" && record.status !== status) {
      return false;
    }

    if (site !== "all" && record.site !== site) {
      return false;
    }

    if (!keyword) {
      return true;
    }

    return [
      record.title,
      record.url,
      record.site,
      record.mode,
      record.status,
      record.outputFile,
      record.error
    ]
      .map((value) => normalizeText(value).toLowerCase())
      .some((value) => value.includes(keyword));
  });
}

function collectSites(records) {
  return Array.from(
    new Set(records.map((record) => normalizeText(record.site)).filter(Boolean))
  ).sort((left, right) => left.localeCompare(right));
}

function normalizeText(value) {
  return String(value || "").replace(/[\r\n\t]/g, " ").trim();
}

export default HistoryPage;
