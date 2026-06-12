const { app } = require("electron");
const { useWorkspaceUserData } = require("./testUserData.cjs");
const { checkBinaries } = require("../electron/services/binaryService");

useWorkspaceUserData(app, "check-binaries");

app.whenReady()
  .then(async () => {
    const result = await checkBinaries();
    console.log(JSON.stringify(result, null, 2));

    const missing = Object.values(result).filter((item) => !item.available);
    app.exit(missing.length > 0 ? 1 : 0);
  })
  .catch((error) => {
    console.error(error);
    app.exit(1);
  });
