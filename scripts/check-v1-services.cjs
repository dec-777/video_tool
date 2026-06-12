const { app } = require("electron");
const { useWorkspaceUserData } = require("./testUserData.cjs");
const { buildYtdlpArgs } = require("../electron/services/commandBuilder");
const { checkBinaries } = require("../electron/services/binaryService");
const { normalizeError } = require("../electron/services/errorService");
const {
  BILIBILI_REFERER,
  BILIBILI_USER_AGENT
} = require("../electron/services/siteRequestArgs");
const { decodeProcessOutput } = require("../electron/utils/processOutputDecoder");
const { assertUrl } = require("../electron/utils/validationUtils");
const { parseProgressLine } = require("../electron/utils/progressParser");

useWorkspaceUserData(app, "check-v1-services");

app.whenReady()
  .then(async () => {
    const binaries = await checkBinaries();
    const missing = Object.values(binaries).filter((item) => !item.available);

    if (missing.length > 0) {
      console.error("Missing binaries:", JSON.stringify(missing, null, 2));
      app.exit(1);
      return;
    }

    const videoArgs = buildYtdlpArgs({
      urls: ["https://example.com/video"],
      mode: "video",
      quality: { preset: "best", container: "mp4" },
      audio: { format: "mp3" },
      file: {
        outputDir: "E:\\Downloads 测试",
        outputTemplate: "%(title)s.%(ext)s"
      }
    });

    const audioArgs = buildYtdlpArgs({
      urls: ["https://example.com/audio"],
      mode: "audio",
      quality: { preset: "best", container: "mp4" },
      audio: { format: "m4a" },
      file: {
        outputDir: "E:\\Downloads 测试",
        outputTemplate: "%(title)s.%(ext)s"
      }
    });

    const biliArgs = buildYtdlpArgs({
      urls: ["https://www.bilibili.com/video/BV1DPVw6sEhK/"],
      mode: "video",
      quality: { preset: "best", container: "mp4" },
      audio: { format: "mp3" },
      file: {
        outputDir: "E:\\Downloads 测试",
        outputTemplate: "%(title)s.%(ext)s"
      }
    });

    assertIncludes(videoArgs, ["--ignore-config", "--newline", "--no-color", "-f", "bv*+ba/b"]);
    assertIncludes(videoArgs, ["--merge-output-format", "mp4"]);
    assertIncludes(videoArgs, ["--retries", "10", "--fragment-retries", "10"]);
    assertIncludes(videoArgs, ["--retry-sleep", "http:linear=1::3", "fragment:linear=1::3"]);
    assertIncludes(audioArgs, ["-x", "--audio-format", "m4a"]);
    assertIncludes(biliArgs, ["--user-agent", BILIBILI_USER_AGENT, "--referer", BILIBILI_REFERER]);

    const progress = parseProgressLine(
      "[download]  35.2% of 50.00MiB at 2.30MiB/s ETA 00:15"
    );
    if (!progress || progress.percent !== 35.2 || progress.speed !== "2.30MiB/s") {
      throw new Error("progress parser did not parse download progress");
    }

    const http412 = normalizeError(new Error("HTTP Error 412: Precondition Failed"));
    if (http412.code !== "HTTP_412" || !http412.message.includes("请求头")) {
      throw new Error("HTTP 412 error mapping is missing or unclear");
    }

    const unsupported = normalizeError({
      code: "PROCESS_FAILED",
      message: "WARNING: [generic] Falling back on generic information extractor\nERROR: Unsupported URL: https://www.douyin.com/jingxuan?modal_id=7645607954313465140",
      rawMessage:
        "WARNING: [generic] Falling back on generic information extractor\nERROR: Unsupported URL: https://www.douyin.com/jingxuan?modal_id=7645607954313465140"
    });
    if (unsupported.code !== "UNSUPPORTED_URL" || unsupported.message.includes("WARNING")) {
      throw new Error("Unsupported URL raw yt-dlp output was not normalized");
    }

    const loginRequired = normalizeError({
      code: "PROCESS_FAILED",
      message: "ERROR: [Douyin] 7645607954313465140: Fresh cookies (not necessarily logged in) are needed",
      rawMessage: "ERROR: [Douyin] 7645607954313465140: Fresh cookies (not necessarily logged in) are needed"
    });
    if (loginRequired.code !== "LOGIN_REQUIRED" || !loginRequired.message.includes("Cookie")) {
      throw new Error("Douyin fresh cookies error was not normalized");
    }

    const refused = normalizeError(
      new Error("[WinError 10061] 由于目标计算机积极拒绝，无法连接。")
    );
    if (refused.code !== "NETWORK_CONNECTION_REFUSED" || !refused.message.includes("CDN")) {
      throw new Error("WinError 10061 mapping is missing or unclear");
    }

    const decodedChinese = decodeProcessOutput(
      Buffer.from([
        0xd6, 0xd0, 0xce, 0xc4, 0x20, 0xce, 0xc4, 0xbc, 0xfe, 0xc3, 0xfb,
        0x2e, 0x6d, 0x70, 0x34
      ])
    );
    if (decodedChinese !== "中文 文件名.mp4") {
      throw new Error(`GBK process output was not decoded correctly: ${decodedChinese}`);
    }

    const normalizedDouyin = assertUrl(
      "https://www.douyin.com/jingxuan?modal_id=7645607954313465140"
    );
    if (normalizedDouyin !== "https://www.douyin.com/video/7645607954313465140") {
      throw new Error(`Douyin modal URL was not normalized: ${normalizedDouyin}`);
    }

    console.log("v1 service checks passed");
    app.exit(0);
  })
  .catch((error) => {
    console.error(error);
    app.exit(1);
  });

function assertIncludes(args, expected) {
  for (const item of expected) {
    if (!args.includes(item)) {
      throw new Error(`Expected args to include ${item}. Actual: ${args.join(" ")}`);
    }
  }
}
