import { useState } from "react";
import { FileText, FolderOpen, RotateCcw, Square } from "lucide-react";
import { cancelTask, retryTask } from "../api/downloadApi.js";
import { openFolder } from "../api/fileApi.js";
import { useTasks } from "../hooks/useTasks.js";
import { formatApiError } from "../utils/formatError.js";

function TasksPage() {
  const tasks = useTasks();
  const [expandedLogTaskId, setExpandedLogTaskId] = useState("");

  async function handleCancel(taskId) {
    const result = await cancelTask(taskId);
    if (!result.success) {
      window.alert(formatApiError(result.error));
    }
  }

  async function handleRetry(taskId) {
    const result = await retryTask(taskId);
    if (!result.success) {
      window.alert(formatApiError(result.error));
    }
  }

  async function handleOpenFolder(task) {
    const folderPath = task.outputDir;
    const result = await openFolder(folderPath);
    if (!result.success) {
      window.alert(formatApiError(result.error));
    }
  }

  return (
    <section className="panel full-panel">
      <div className="section-heading">
        <p className="eyebrow">任务中心</p>
        <h3>下载队列、进度、速度和 ETA</h3>
      </div>

      {tasks.length === 0 ? (
        <div className="empty-state">
          <h4>暂无下载任务</h4>
          <p>从首页或批量页创建任务后会显示在这里。</p>
        </div>
      ) : (
        <div className="task-list">
          {tasks.map((task) => (
            <article className="task-card" key={task.id}>
              <div className="task-main">
                <h4>{task.title || task.url}</h4>
                <p>{task.outputFile || task.outputDir || task.url}</p>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${Math.min(task.percent || 0, 100)}%` }}
                  />
                </div>
                <div className="task-meta">
                  <span>{task.status}</span>
                  <span>{Math.round(task.percent || 0)}%</span>
                  <span>{task.speed || "0B/s"}</span>
                  <span>ETA {task.eta || "-"}</span>
                </div>
                {task.error ? <p className="task-error">{task.error}</p> : null}
                {expandedLogTaskId === task.id ? (
                  <div className="task-log-panel">
                    <p>任务 ID：{task.id}</p>
                    <p>进程 ID：{task.processId || "-"}</p>
                    <p>输出文件：{task.outputFile || "-"}</p>
                    <p>原始错误：{task.rawError || "-"}</p>
                  </div>
                ) : null}
              </div>
              <div className="task-actions">
                <button
                  type="button"
                  className="icon-button"
                  title="取消任务"
                  onClick={() => handleCancel(task.id)}
                  disabled={!["pending", "downloading"].includes(task.status)}
                >
                  <Square size={17} />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  title="重试任务"
                  onClick={() => handleRetry(task.id)}
                  disabled={task.status !== "failed"}
                >
                  <RotateCcw size={17} />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  title="打开文件夹"
                  onClick={() => handleOpenFolder(task)}
                  disabled={!task.outputDir}
                >
                  <FolderOpen size={17} />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  title="查看日志"
                  onClick={() =>
                    setExpandedLogTaskId((current) => (current === task.id ? "" : task.id))
                  }
                >
                  <FileText size={17} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default TasksPage;
