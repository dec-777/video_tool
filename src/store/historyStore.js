let records = [];
const listeners = new Set();

export function getHistorySnapshot() {
  return records;
}

export function setHistoryRecords(nextRecords) {
  records = Array.isArray(nextRecords) ? nextRecords : [];
  notify();
}

export function subscribeHistory(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  for (const listener of listeners) {
    listener(records);
  }
}
