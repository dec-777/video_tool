const fs = require("fs");
const path = require("path");

function useWorkspaceUserData(app, name) {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch("disable-gpu");

  const safeName = String(name || "check").replace(/[^a-zA-Z0-9_-]/g, "_");
  const userDataPath = path.join(__dirname, "..", ".tmp", "test-user-data", safeName);
  fs.mkdirSync(userDataPath, { recursive: true });
  app.setPath("userData", userDataPath);
  return userDataPath;
}

module.exports = {
  useWorkspaceUserData
};
