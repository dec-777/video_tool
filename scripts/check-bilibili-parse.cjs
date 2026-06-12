const { app } = require("electron");
const { useWorkspaceUserData } = require("./testUserData.cjs");
const { getVideoInfo } = require("../electron/services/ytdlpService");

const testUrl =
  process.env.BILIBILI_TEST_URL || "https://www.bilibili.com/video/BV1DPVw6sEhK/";

useWorkspaceUserData(app, "check-bilibili-parse");

app.whenReady()
  .then(async () => {
    const info = await getVideoInfo(testUrl);

    if (!info || !info.title || !/bilibili/i.test(info.extractor || "")) {
      console.error(JSON.stringify(info, null, 2));
      app.exit(1);
      return;
    }

    console.log(`bilibili parse check passed: ${info.title}`);
    app.exit(0);
  })
  .catch((error) => {
    console.error(error.rawMessage || error.message || error);
    app.exit(1);
  });
