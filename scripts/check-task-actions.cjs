const fs = require("fs");
const path = require("path");
const { app } = require("electron");
const { useWorkspaceUserData } = require("./testUserData.cjs");
const TASK_STATUS = require("../electron/constants/taskStatus");
const taskStore = require("../electron/services/taskStore");
const {
  cancelTask,
  configureTaskQueue,
  retryTask
} = require("../electron/services/taskQueue");

useWorkspaceUserData(app, "check-task-actions");

const root = path.join(__dirname, "..");
const outputDir = path.join(root, ".tmp", "task-actions-output");

app.whenReady()
  .then(async () => {
    fs.mkdirSync(outputDir, { recursive: true });
    configureTaskQueue({ getMainWindow: () => null, concurrentDownloads: 1 });

    addFakeTask({
      id: "check_pending_cancel",
      status: TASK_STATUS.PENDING
    });
    const canceled = cancelTask("check_pending_cancel");
    assert(canceled.status === TASK_STATUS.CANCELED, "pending task was not canceled");

    addFakeTask({
      id: "check_completed_guards",
      status: TASK_STATUS.COMPLETED
    });
    assertThrows(() => cancelTask("check_completed_guards"), "completed task accepted cancel");
    assertThrows(() => retryTask("check_completed_guards"), "completed task accepted retry");

    addFakeTask({
      id: "check_failed_retry",
      status: TASK_STATUS.FAILED,
      url: "http://127.0.0.1:9/not-found"
    });
    const retried = retryTask("check_failed_retry");
    assert(retried.status === TASK_STATUS.PENDING, "failed task was not requeued");

    await waitForStatus("check_failed_retry", TASK_STATUS.FAILED, 30000);

    console.log("task action checks passed");
    app.exit(0);
  })
  .catch((error) => {
    console.error(error.message || error);
    app.exit(1);
  });

function addFakeTask(overrides) {
  const now = Date.now();
  const url = overrides.url || "https://example.com/video";
  const task = {
    id: overrides.id,
    url,
    title: "状态机测试任务",
    thumbnail: "",
    site: "Test",
    status: overrides.status,
    percent: 0,
    speed: "",
    eta: "",
    totalSize: "",
    outputDir,
    outputTemplate: "%(title)s.%(ext)s",
    outputFile: "",
    options: {
      urls: [url],
      mode: "video",
      quality: { preset: "best", container: "mp4" },
      audio: { format: "mp3" },
      file: {
        outputDir,
        outputTemplate: "%(title)s.%(ext)s"
      }
    },
    createdAt: now,
    startedAt: 0,
    completedAt: overrides.status === TASK_STATUS.COMPLETED ? now : 0,
    error: "",
    rawError: "",
    processId: null
  };

  taskStore.addTask(task);
  return task;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertThrows(fn, message) {
  try {
    fn();
  } catch {
    return;
  }

  throw new Error(message);
}

function waitForStatus(taskId, status, timeoutMs) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      const task = taskStore.getTask(taskId);
      if (task?.status === status) {
        clearInterval(timer);
        resolve(task);
        return;
      }

      if (Date.now() - startedAt > timeoutMs) {
        clearInterval(timer);
        reject(new Error(`Timed out waiting for ${taskId} to become ${status}`));
      }
    }, 300);
  });
}
