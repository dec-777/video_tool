const fs = require("fs");
const http = require("http");
const path = require("path");
const { spawn } = require("child_process");
const { app } = require("electron");
const { useWorkspaceUserData } = require("./testUserData.cjs");
const {
  addTasks,
  configureTaskQueue,
  getTasks
} = require("../electron/services/taskQueue");
const { getFfmpegPath, getFfprobePath } = require("../electron/utils/pathUtils");

const sourceDir = path.join(__dirname, "..", "downloads", "embed subtitle source");
const outputDir = path.join(
  __dirname,
  "..",
  "downloads",
  "embed subtitle smoke",
  String(Date.now())
);
const sourceFile = path.join(sourceDir, "sample.mp4");
const subtitleFile = path.join(sourceDir, "sub.en.vtt");
const htmlFile = path.join(sourceDir, "index.html");
const timeoutMs = 240000;

useWorkspaceUserData(app, "check-v2-embed-subtitle");

app.whenReady()
  .then(async () => {
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.mkdirSync(outputDir, { recursive: true });
    await ensureSourceFiles();

    const server = await startStaticServer();
    const testUrl = `http://127.0.0.1:${server.port}/index.html`;

    configureTaskQueue({ getMainWindow: () => null, concurrentDownloads: 1 });

    const [task] = addTasks({
      urls: [testUrl],
      mode: "video",
      quality: {
        preset: "best",
        container: "mp4"
      },
      audio: {
        format: "mp3"
      },
      subtitles: {
        writeSubs: true,
        writeAutoSubs: false,
        languages: ["en"],
        format: "vtt",
        embed: true
      },
      file: {
        outputDir,
        outputTemplate: "embedded.%(ext)s"
      }
    });

    const startedAt = Date.now();
    const timer = setInterval(async () => {
      const current = getTasks().find((item) => item.id === task.id);

      if (!current) {
        finish(1, "embed subtitle smoke task disappeared");
        return;
      }

      if (current.status === "failed") {
        finish(1, `embed subtitle smoke failed: ${current.error || current.rawError}`);
        return;
      }

      if (current.status === "completed") {
        const mediaFile = findMediaFile(outputDir);
        if (!mediaFile) {
          finish(1, "embed subtitle smoke completed but no media file was found");
          return;
        }

        try {
          const hasSubtitle = await hasSubtitleStream(path.join(outputDir, mediaFile));
          if (!hasSubtitle) {
            finish(1, `embedded media has no subtitle stream: ${mediaFile}`);
            return;
          }
        } catch (error) {
          finish(1, error.message || error);
          return;
        }

        finish(0, `embed subtitle smoke passed: ${mediaFile}`);
        return;
      }

      if (Date.now() - startedAt > timeoutMs) {
        finish(1, "embed subtitle smoke timed out");
      }
    }, 1000);

    function finish(code, message) {
      clearInterval(timer);
      server.close();
      if (code === 0) {
        console.log(message);
      } else {
        console.error(message);
      }
      app.exit(code);
    }
  })
  .catch((error) => {
    console.error(error.rawMessage || error.message || error);
    app.exit(1);
  });

async function ensureSourceFiles() {
  await createSourceVideo();

  fs.writeFileSync(
    subtitleFile,
    "WEBVTT\n\n00:00:00.000 --> 00:00:01.500\nHello subtitle smoke.\n",
    "utf8"
  );

  fs.writeFileSync(
    htmlFile,
    [
      "<!doctype html>",
      "<html><head><title>Local subtitle smoke</title></head><body>",
      '<video controls src="sample.mp4">',
      '  <track kind="subtitles" src="sub.en.vtt" srclang="en" label="English" default>',
      "</video>",
      "</body></html>"
    ].join("\n"),
    "utf8"
  );
}

function createSourceVideo() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      getFfmpegPath(),
      [
        "-y",
        "-f",
        "lavfi",
        "-i",
        "testsrc=size=160x90:rate=1",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=880:duration=2",
        "-t",
        "2",
        "-pix_fmt",
        "yuv420p",
        "-c:v",
        "libx264",
        "-c:a",
        "aac",
        "-shortest",
        sourceFile
      ],
      { windowsHide: true }
    );

    let output = "";
    child.stdout.on("data", (data) => {
      output += data.toString("utf8");
    });
    child.stderr.on("data", (data) => {
      output += data.toString("utf8");
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(output || `ffmpeg exited with code ${code}`));
      }
    });
  });
}

function startStaticServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      const fileName = request.url === "/" ? "index.html" : decodeURIComponent(request.url.slice(1));
      const filePath = path.join(sourceDir, fileName);

      if (!filePath.startsWith(sourceDir) || !fs.existsSync(filePath)) {
        response.writeHead(404);
        response.end();
        return;
      }

      response.writeHead(200, {
        "Content-Type": getContentType(filePath),
        "Content-Length": fs.statSync(filePath).size
      });
      fs.createReadStream(filePath).pipe(response);
    });

    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        close: () => server.close(),
        port: address.port
      });
    });
  });
}

function getContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".html") return "text/html";
  if (extension === ".vtt") return "text/vtt";
  if (extension === ".mp4") return "video/mp4";
  return "application/octet-stream";
}

function findMediaFile(dir) {
  return fs
    .readdirSync(dir)
    .find((file) => /\.(mp4|mkv|webm)$/i.test(file) && fs.statSync(path.join(dir, file)).size > 0);
}

function hasSubtitleStream(filePath) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      getFfprobePath(),
      ["-v", "error", "-select_streams", "s", "-show_entries", "stream=codec_type", "-of", "json", filePath],
      { windowsHide: true }
    );

    let output = "";
    child.stdout.on("data", (data) => {
      output += data.toString("utf8");
    });
    child.stderr.on("data", (data) => {
      output += data.toString("utf8");
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(output || `ffprobe exited with code ${code}`));
        return;
      }

      try {
        const parsed = JSON.parse(output || "{}");
        resolve(Array.isArray(parsed.streams) && parsed.streams.length > 0);
      } catch (error) {
        reject(error);
      }
    });
  });
}
