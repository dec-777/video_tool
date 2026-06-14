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
const { getFfmpegPath } = require("../electron/utils/pathUtils");

const externalTestUrl = process.env.METADATA_TEST_URL || "";
const sourceDir = path.join(__dirname, "..", "downloads", "metadata smoke source");
const outputDir = path.join(
  __dirname,
  "..",
  "downloads",
  "metadata smoke test",
  String(Date.now())
);
const sourceFile = path.join(sourceDir, "sample.mp4");
const thumbnailFile = path.join(sourceDir, "thumb.jpg");
const timeoutMs = 240000;

useWorkspaceUserData(app, "check-v2-metadata-smoke");

app.whenReady()
  .then(async () => {
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.mkdirSync(outputDir, { recursive: true });
    await ensureSourceFiles();
    const server = externalTestUrl ? null : await startStaticServer();
    const testUrl = externalTestUrl || `http://127.0.0.1:${server.port}/index.html`;

    configureTaskQueue({ getMainWindow: () => null, concurrentDownloads: 1 });

    const [task] = addTasks({
      urls: [testUrl],
      mode: "video",
      quality: {
        preset: "worst",
        container: "mp4"
      },
      audio: {
        format: "mp3"
      },
      metadata: {
        thumbnail: true,
        embedThumbnail: true,
        description: true,
        infoJson: true,
        comments: false,
        embedMetadata: true
      },
      file: {
        outputDir,
        outputTemplate: "metadata.%(ext)s"
      }
    });

    const startedAt = Date.now();
    const timer = setInterval(() => {
      const current = getTasks().find((item) => item.id === task.id);

      if (!current) {
        finish(1, "metadata smoke task disappeared");
        return;
      }

      if (current.status === "failed") {
        finish(1, `metadata smoke failed: ${current.error || current.rawError}`);
        return;
      }

      if (current.status === "completed") {
        const files = listFiles(outputDir);
        const infoJson = files.find((file) => /\.info\.json$/i.test(file));
        const description = files.find((file) => /\.description$/i.test(file));
        const thumbnail = files.find((file) => /\.(jpe?g|png|webp)$/i.test(file));
        const media = files.find((file) => /\.(mp4|webm|mkv|mov)$/i.test(file));

        if (!infoJson || !description || !thumbnail || !media) {
          finish(1, `metadata smoke missing files: ${files.join(", ")}`);
          return;
        }

        const emptyFile = [infoJson, description, thumbnail, media].find(
          (file) => fs.statSync(path.join(outputDir, file)).size === 0
        );
        if (emptyFile) {
          finish(1, `metadata smoke produced empty file: ${emptyFile}`);
          return;
        }

        finish(0, `metadata smoke passed: ${files.join(", ")}`);
        return;
      }

      if (Date.now() - startedAt > timeoutMs) {
        finish(1, "metadata smoke timed out");
      }
    }, 1000);

    function finish(code, message) {
      clearInterval(timer);
      if (server) {
        server.close();
      }
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

function listFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs.readdirSync(dir).filter((file) => fs.statSync(path.join(dir, file)).isFile());
}

async function ensureSourceFiles() {
  await createSourceVideo();
  await createThumbnail();
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
        "sine=frequency=660:duration=2",
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

    collectProcessResult(child, resolve, reject, "ffmpeg video");
  });
}

function createThumbnail() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      getFfmpegPath(),
      [
        "-y",
        "-f",
        "lavfi",
        "-i",
        "testsrc=size=160x90:rate=1",
        "-frames:v",
        "1",
        thumbnailFile
      ],
      { windowsHide: true }
    );

    collectProcessResult(child, resolve, reject, "ffmpeg thumbnail");
  });
}

function collectProcessResult(child, resolve, reject, label) {
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
      return;
    }

    reject(new Error(output || `${label} exited with code ${code}`));
  });
}

function startStaticServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      if (request.url === "/" || request.url === "/index.html") {
        const port = server.address().port;
        const body = buildMetadataHtml(port);
        response.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Length": Buffer.byteLength(body)
        });
        response.end(body);
        return;
      }

      const fileName = decodeURIComponent(request.url.slice(1));
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

function buildMetadataHtml(port) {
  const baseUrl = `http://127.0.0.1:${port}`;
  return [
    "<!doctype html>",
    "<html>",
    "<head>",
    "  <title>Local metadata smoke</title>",
    '  <meta name="description" content="Local metadata smoke description">',
    '  <meta property="og:title" content="Local metadata smoke">',
    '  <meta property="og:description" content="Local metadata smoke description">',
    `  <meta property="og:image" content="${baseUrl}/thumb.jpg">`,
    "</head>",
    "<body>",
    '  <video controls src="sample.mp4"></video>',
    "</body>",
    "</html>"
  ].join("\n");
}

function getContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".html") return "text/html; charset=utf-8";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".mp4") return "video/mp4";
  return "application/octet-stream";
}
