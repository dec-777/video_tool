import { useEffect, useState } from "react";
import { getHistory as fetchHistory } from "../api/historyApi.js";
import {
  getHistorySnapshot,
  setHistoryRecords,
  subscribeHistory
} from "../store/historyStore.js";

export function useHistory() {
  const [records, setRecords] = useState(getHistorySnapshot);

  useEffect(() => {
    const unsubscribe = subscribeHistory(setRecords);

    if (window.api) {
      fetchHistory().then((result) => {
        if (result.success) {
          setHistoryRecords(result.data);
        }
      });
    }

    return unsubscribe;
  }, []);

  return records;
}
