const IPC_CHANNELS = {
  DOWNLOAD: {
    PARSE_URL: "download:parse-url",
    PARSE_PLAYLIST: "download:parse-playlist",
    START: "download:start",
    PREVIEW: "download:preview",
    CANCEL: "download:cancel",
    RETRY: "download:retry",
    GET_TASKS: "download:get-tasks"
  },
  CONFIG: {
    GET: "config:get",
    SAVE: "config:save"
  },
  FILE: {
    SELECT_FOLDER: "file:select-folder",
    SELECT_FILE: "file:select-file",
    OPEN_FOLDER: "file:open-folder"
  },
  ARCHIVE: {
    GET_INFO: "archive:get-info",
    CREATE: "archive:create",
    CLEAR: "archive:clear"
  },
  HISTORY: {
    GET: "history:get",
    CLEAR: "history:clear"
  },
  SYSTEM: {
    CHECK_BINARIES: "system:check-binaries"
  },
  EVENTS: {
    TASK_PROGRESS: "task-progress",
    TASK_COMPLETED: "task-completed",
    TASK_FAILED: "task-failed",
    TASK_CANCELED: "task-canceled"
  }
};

module.exports = IPC_CHANNELS;
