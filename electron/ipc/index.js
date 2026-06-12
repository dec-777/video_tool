const { registerDownloadIpc } = require("./downloadIpc");
const { registerArchiveIpc } = require("./archiveIpc");
const { registerConfigIpc } = require("./configIpc");
const { registerFileIpc } = require("./fileIpc");
const { registerHistoryIpc } = require("./historyIpc");
const { registerSystemIpc } = require("./systemIpc");

function registerIpcHandlers(context) {
  registerDownloadIpc(context);
  registerArchiveIpc(context);
  registerConfigIpc(context);
  registerFileIpc(context);
  registerHistoryIpc(context);
  registerSystemIpc(context);
}

module.exports = {
  registerIpcHandlers
};
