const IPC_CHANNELS = require("../constants/ipcChannels");
const TASK_STATUS = require("../constants/taskStatus");
const { buildYtdlpArgs, normalizeDownloadOptions } = require("./commandBuilder");
const { normalizeError } = require("./errorService");
const { createTaskId } = require("../utils/idUtils");
const { normalizeUrls } = require("../utils/validationUtils");
const { parseProgressLine } = require("../utils/progressParser");
const { startDownloadProcess } = require("./ytdlpService");
const { addHistoryRecord } = require("./historyStore");
const taskStore = require("./taskStore");
const { writeTaskLog } = require("./logService");

let getMainWindow = () => null;
let concurrentDownloads = 1;
const pendingQueue = [];
const runningTasks = new Map();

function configureTaskQueue(context = {}) {
  if (context.getMainWindow) {
    getMainWindow = context.getMainWindow;
  }

  if (Number.isInteger(context.concurrentDownloads) && context.concurrentDownloads > 0) {
    concurrentDownloads = context.concurrentDownloads;
  }
}

function addTasks(options) {
  const urls = normalizeUrls(options.urls || []);
  const createdTasks = urls.map((url) => createTaskForUrl(options, url));

  for (const task of createdTasks) {
    taskStore.addTask(task);
    pendingQueue.push(task.id);
    emitTaskEvent(IPC_CHANNELS.EVENTS.TASK_PROGRESS, task);
    writeTaskLog(task.id, "Task created", { url: task.url });
  }

  startNext();
  return createdTasks;
}

function createTaskForUrl(options, url) {
  const taskOptions = normalizeDownloadOptions({
    ...options,
    urls: [url]
  });
  const taskMetadata = normalizeTaskMetadata(options.videoInfo, url);

  const now = Date.now();

  return {
    id: createTaskId(),
    url,
    title: taskMetadata.title,
    thumbnail: taskMetadata.thumbnail,
    site: taskMetadata.site,
    status: TASK_STATUS.PENDING,
    percent: 0,
    speed: "",
    eta: "",
    totalSize: "",
    outputDir: taskOptions.file.outputDir,
    outputTemplate: taskOptions.file.outputTemplate,
    outputFile: "",
    options: taskOptions,
    createdAt: now,
    startedAt: 0,
    completedAt: 0,
    error: "",
    rawError: "",
    processId: null
  };
}

function normalizeTaskMetadata(videoInfo, url) {
  if (!videoInfo || typeof videoInfo !== "object") {
    return {
      title: "",
      thumbnail: "",
      site: ""
    };
  }

  return {
    title: toSafeString(videoInfo.title),
    thumbnail: toSafeString(videoInfo.thumbnail),
    site: toSafeString(videoInfo.extractor || videoInfo.site)
  };
}

function toSafeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function startNext() {
  while (runningTasks.size < concurrentDownloads && pendingQueue.length > 0) {
    const taskId = pendingQueue.shift();
    const task = taskStore.getTask(taskId);

    if (!task || task.status !== TASK_STATUS.PENDING) {
      continue;
    }

    startTask(task);
  }
}

function startTask(task) {
  let args;

  try {
    args = buildYtdlpArgs(task.options);
  } catch (error) {
    failTask(task.id, error);
    return;
  }

  const startedTask = updateTask(task.id, {
    status: TASK_STATUS.DOWNLOADING,
    startedAt: Date.now(),
    error: "",
    rawError: ""
  });

  const child = startDownloadProcess(startedTask, args, {
    onData: (text) => handleTaskOutput(task.id, text),
    onError: (error) => failTask(task.id, error),
    onClose: (code) => handleTaskClose(task.id, code)
  });

  runningTasks.set(task.id, child);
  updateTask(task.id, {
    processId: child.pid
  });
}

function handleTaskOutput(taskId, text) {
  const lines = text.split(/\r?\n/).filter(Boolean);

  for (const line of lines) {
    const parsed = parseProgressLine(line);
    if (!parsed) {
      continue;
    }

    if (parsed.status === TASK_STATUS.FAILED) {
      const task = taskStore.getTask(taskId);
      updateTask(taskId, {
        rawError: [task?.rawError, parsed.rawError].filter(Boolean).join("\n")
      });
      continue;
    }

    updateTask(taskId, filterEmptyPatch(parsed));
  }
}

function handleTaskClose(taskId, code) {
  const task = taskStore.getTask(taskId);
  runningTasks.delete(taskId);

  if (!task) {
    startNext();
    return;
  }

  if (task.status === TASK_STATUS.CANCELED) {
    startNext();
    return;
  }

  if (task.status === TASK_STATUS.FAILED) {
    startNext();
    return;
  }

  if (code === 0) {
    const completed = updateTask(taskId, {
      status: TASK_STATUS.COMPLETED,
      percent: 100,
      completedAt: Date.now(),
      processId: null
    });
    recordHistory(completed);
    emitTaskEvent(IPC_CHANNELS.EVENTS.TASK_COMPLETED, completed);
    startNext();
    return;
  }

  failTask(taskId, new Error(task.rawError || `yt-dlp exited with code ${code}`));
}

function cancelTask(taskId) {
  const task = taskStore.getTask(taskId);
  if (!task) {
    throw {
      code: "TASK_NOT_FOUND",
      message: "任务不存在",
      rawMessage: `Task not found: ${taskId}`
    };
  }

  if (task.status === TASK_STATUS.PENDING) {
    removeFromPending(taskId);
    const canceled = updateTask(taskId, {
      status: TASK_STATUS.CANCELED,
      completedAt: Date.now()
    });
    emitTaskEvent(IPC_CHANNELS.EVENTS.TASK_CANCELED, canceled);
    return canceled;
  }

  if (task.status !== TASK_STATUS.DOWNLOADING) {
    throw {
      code: "INVALID_TASK_STATE",
      message: "当前任务状态不能取消",
      rawMessage: `Cannot cancel task ${taskId} with status ${task.status}`
    };
  }

  const child = runningTasks.get(taskId);
  if (child) {
    updateTask(taskId, {
      status: TASK_STATUS.CANCELED,
      completedAt: Date.now()
    });
    child.kill();
    runningTasks.delete(taskId);
  }

  const canceled = updateTask(taskId, {
    status: TASK_STATUS.CANCELED,
    processId: null
  });
  emitTaskEvent(IPC_CHANNELS.EVENTS.TASK_CANCELED, canceled);
  startNext();
  return canceled;
}

function retryTask(taskId) {
  const task = taskStore.getTask(taskId);
  if (!task) {
    throw {
      code: "TASK_NOT_FOUND",
      message: "任务不存在",
      rawMessage: `Task not found: ${taskId}`
    };
  }

  if (task.status !== TASK_STATUS.FAILED) {
    throw {
      code: "INVALID_TASK_STATE",
      message: "只有失败任务可以重试",
      rawMessage: `Cannot retry task ${taskId} with status ${task.status}`
    };
  }

  const retried = updateTask(taskId, {
    status: TASK_STATUS.PENDING,
    percent: 0,
    speed: "",
    eta: "",
    totalSize: "",
    error: "",
    rawError: "",
    processId: null,
    startedAt: 0,
    completedAt: 0
  });

  removeFromPending(taskId);
  pendingQueue.push(taskId);
  emitTaskEvent(IPC_CHANNELS.EVENTS.TASK_PROGRESS, retried);
  startNext();
  return retried;
}

function failTask(taskId, error) {
  const current = taskStore.getTask(taskId);
  if (!current || current.status === TASK_STATUS.CANCELED || current.status === TASK_STATUS.COMPLETED) {
    return current;
  }

  const normalized = normalizeError(error);
  runningTasks.delete(taskId);

  const failed = updateTask(taskId, {
    status: TASK_STATUS.FAILED,
    completedAt: Date.now(),
    error: normalized.message,
    rawError: normalized.rawMessage,
    processId: null
  });

  writeTaskLog(taskId, "Task failed", normalized);
  if (failed) {
    recordHistory(failed);
  }
  emitTaskEvent(IPC_CHANNELS.EVENTS.TASK_FAILED, failed);
  startNext();
  return failed;
}

function getTasks() {
  return taskStore.getTasks();
}

function updateTask(taskId, patch) {
  const updated = taskStore.updateTask(taskId, patch);
  if (updated) {
    emitTaskEvent(IPC_CHANNELS.EVENTS.TASK_PROGRESS, updated);
  }
  return updated;
}

function emitTaskEvent(channel, task) {
  const mainWindow = getMainWindow();
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  try {
    mainWindow.webContents.send(channel, task);
  } catch (error) {
    writeTaskLog(task?.id, "Task event send failed", {
      channel,
      error: error.message || String(error)
    });
  }
}

function recordHistory(task) {
  if (!task) {
    return;
  }

  try {
    addHistoryRecord(task);
  } catch (error) {
    writeTaskLog(task.id, "History write failed", {
      error: error.message || String(error)
    });
  }
}

function removeFromPending(taskId) {
  const index = pendingQueue.indexOf(taskId);
  if (index >= 0) {
    pendingQueue.splice(index, 1);
  }
}

function filterEmptyPatch(patch) {
  return Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== "" && value !== null && value !== undefined)
  );
}

module.exports = {
  addTasks,
  cancelTask,
  configureTaskQueue,
  getTasks,
  retryTask
};
