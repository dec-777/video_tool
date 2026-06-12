import { useEffect } from "react";
import { getTasks } from "../api/downloadApi.js";
import { getHistory } from "../api/historyApi.js";
import { setHistoryRecords } from "../store/historyStore.js";
import { setTasks, upsertTask } from "../store/taskStore.js";

export function useIpcEvents() {
  useEffect(() => {
    if (!window.api) {
      return undefined;
    }

    let active = true;
    getTasks().then((result) => {
      if (active && result.success) {
        setTasks(result.data);
      }
    });

    function refreshHistory(task) {
      upsertTask(task);
      getHistory().then((result) => {
        if (result.success) {
          setHistoryRecords(result.data);
        }
      });
    }

    const unsubscribers = [
      window.api.onTaskProgress(upsertTask),
      window.api.onTaskCompleted(refreshHistory),
      window.api.onTaskFailed(refreshHistory),
      window.api.onTaskCanceled(upsertTask)
    ];

    return () => {
      active = false;
      unsubscribers.forEach((unsubscribe) => unsubscribe?.());
    };
  }, []);
}
