const http = require("http");
const { spawn, spawnSync } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");
let devProcess = null;

main().catch((error) => {
  console.error(error.message || error);
  cleanup();
  process.exit(1);
});

async function main() {
  await assertForeignRendererRejected();

  const blocker = await occupyPort5173();
  let output = "";
  let sawDynamicPort = false;
  let sawElectronLoad = false;
  let failed = false;

  devProcess = spawn(process.execPath, ["scripts/dev.cjs"], {
    cwd: root,
    env: {
      ...process.env,
      ELECTRON_ENABLE_LOGGING: "1",
      VIDEO_TOOL_IN_PROCESS_GPU: "1",
      VIDEO_TOOL_USER_DATA_DIR: path.join(
        root,
        ".tmp",
        "test-user-data",
        "check-dev-start-app"
      )
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: false
  });

  devProcess.stdout.on("data", onData);
  devProcess.stderr.on("data", onData);

  devProcess.on("error", (error) => {
    failed = true;
    output += `\nPROCESS_ERROR: ${error.message}\n`;
  });

  devProcess.on("exit", (code) => {
    if (!failed && code !== null && code !== 0) {
      failed = true;
      output += `\nPROCESS_EXIT: ${code}\n`;
    }
  });

  await delay(12000);
  blocker?.close();

  const forbidden = [
    "Port 5173 is already in use",
    "Unable to load preload script",
    "module not found",
    "spawn EINVAL"
  ];

  for (const pattern of forbidden) {
    if (output.includes(pattern)) {
      failed = true;
      output += `\nFORBIDDEN_OUTPUT: ${pattern}\n`;
    }
  }

  cleanup();

  if (failed || !sawDynamicPort || !sawElectronLoad) {
    console.error(output);
    throw new Error("dev startup check failed");
  }

  console.log("dev startup check passed");
  process.exit(0);

  function onData(data) {
    const text = data.toString("utf8");
    output += text;
    if (/http:\/\/127\.0\.0\.1:(?!5173)\d+/.test(text)) {
      sawDynamicPort = true;
    }
    if (/Loading renderer from http:\/\/127\.0\.0\.1:(?!5173)\d+/.test(text)) {
      sawElectronLoad = true;
    }
  }
}

async function assertForeignRendererRejected() {
  const fakeRenderer = await startFakeRenderer();
  let output = "";

  const child = spawn(process.execPath, ["scripts/start-electron-dev.cjs"], {
    cwd: root,
    env: {
      ...process.env,
      VIDEO_TOOL_DISABLE_FALLBACK: "1",
      VITE_DEV_SERVER_URL: `http://127.0.0.1:${fakeRenderer.port}`
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });

  child.stdout.on("data", (data) => {
    output += data.toString("utf8");
  });
  child.stderr.on("data", (data) => {
    output += data.toString("utf8");
  });

  const code = await waitForExit(child, 10000);
  fakeRenderer.close();

  if (code === 0 || !output.includes("is not video_tool")) {
    throw new Error(`foreign renderer was not rejected. exit=${code}\n${output}`);
  }
}

function startFakeRenderer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((_request, response) => {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(`<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>video_tool</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`);
    });

    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        close: () => server.close(),
        port: address.port
      });
    });
  });
}

function waitForExit(child, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanupProcess(child);
      reject(new Error("timed out waiting for foreign renderer rejection"));
    }, timeoutMs);

    child.on("exit", (code) => {
      clearTimeout(timer);
      resolve(code);
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

function occupyPort5173() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((_request, response) => {
      response.writeHead(200);
      response.end("occupied");
    });

    server.once("error", (error) => {
      if (error.code === "EADDRINUSE" || error.code === "EACCES") {
        resolve(null);
        return;
      }

      reject(error);
    });
    server.listen(5173, "127.0.0.1", () => resolve(server));
  });
}

function cleanup() {
  if (!devProcess || devProcess.killed) {
    return;
  }

  cleanupProcess(devProcess);
}

function cleanupProcess(childProcess) {
  if (!childProcess || childProcess.killed) {
    return;
  }

  if (process.platform === "win32") {
    spawnSync("taskkill.exe", ["/PID", String(childProcess.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true
    });
  } else {
    childProcess.kill();
  }

  childProcess.stdout?.destroy();
  childProcess.stderr?.destroy();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
