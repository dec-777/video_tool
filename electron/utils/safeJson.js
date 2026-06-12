const fs = require("fs");
const path = require("path");

function readJsonFile(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    const backupPath = `${filePath}.broken-${Date.now()}.bak`;
    try {
      fs.copyFileSync(filePath, backupPath);
    } catch {
      // Backup failures should not block recovery to defaults.
    }
    return fallback;
  }
}

function writeJsonFile(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp`;
  const json = JSON.stringify(removeUndefined(data), null, 2);
  fs.writeFileSync(tempPath, json, "utf8");
  fs.renameSync(tempPath, filePath);
}

function removeUndefined(value) {
  if (Array.isArray(value)) {
    return value.map(removeUndefined);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, removeUndefined(item)])
    );
  }

  return value;
}

module.exports = {
  readJsonFile,
  writeJsonFile
};
