const path = require("path");
const { getUserDataPath } = require("../utils/pathUtils");
const { readJsonFile, writeJsonFile } = require("../utils/safeJson");

function getHistoryPath() {
  return getUserDataPath("history.json");
}

function getHistory(filters = {}) {
  const records = readJsonFile(getHistoryPath(), []);
  return filterHistoryRecords(Array.isArray(records) ? records : [], filters);
}

function addHistoryRecord(task) {
  const records = getHistory();
  const record = toHistoryRecord(task);
  const nextRecords = [record, ...records.filter((item) => item.id !== record.id)].slice(0, 500);
  writeJsonFile(getHistoryPath(), nextRecords);
  return record;
}

function clearHistory() {
  writeJsonFile(getHistoryPath(), []);
  return [];
}

function toHistoryRecord(task) {
  return {
    id: task.id,
    title: task.title || "",
    url: task.url,
    site: task.site || "",
    mode: task.options?.mode || "video",
    outputFile: task.outputFile || "",
    outputDir: task.outputDir || (task.outputFile ? path.dirname(task.outputFile) : ""),
    outputTemplate: task.outputTemplate || task.options?.file?.outputTemplate || "%(title)s.%(ext)s",
    status: task.status,
    startedAt: task.startedAt || 0,
    completedAt: task.completedAt || Date.now(),
    error: task.error || null,
    options: task.options || null
  };
}

function filterHistoryRecords(records, filters = {}) {
  const keyword = normalizeFilterText(filters.keyword).toLowerCase();
  const status = normalizeFilterText(filters.status);
  const site = normalizeFilterText(filters.site).toLowerCase();

  return records.filter((record) => {
    if (status && status !== "all" && record.status !== status) {
      return false;
    }

    if (site && site !== "all" && normalizeFilterText(record.site).toLowerCase() !== site) {
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
      .map((value) => normalizeFilterText(value).toLowerCase())
      .some((value) => value.includes(keyword));
  });
}

function normalizeFilterText(value) {
  return String(value || "").replace(/[\r\n\t]/g, " ").trim();
}

module.exports = {
  addHistoryRecord,
  clearHistory,
  filterHistoryRecords,
  getHistory,
  getHistoryPath
};
