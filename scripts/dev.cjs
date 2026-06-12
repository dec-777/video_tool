const http = require("http");
const net = require("net");
const { spawn } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");
const host = "127.0.0.1";
const startPort = 5273;
const projectId = "video_tool";
const viteCli = path.join(root, "node_modules", "vite", "bin", "vite.js");
let rendererProcess = null;
let electronProcess = null;
let shuttingDown = false;

main().catch((error) => {
  console.error(error);
  cleanup();
  process.exit(1);
});

async function main() {
  const port = await findAvailablePort(startPort);
  const devServerUrl = `http://${host}:${port}`;

  rendererProcess = spawn(
    process.execPath,
    [viteCli, "--host", host, "--port", String(port), "--strictPort"],
    {
      cwd: root,
      env: process.env,
      stdio: "inherit",
      windowsHide: false
    }
  );

  rendererProcess.on("error", (error) => {
    console.error(`Failed to start Vite: ${error.message}`);
    cleanup();
    process.exit(1);
  });

  rendererProcess.on("exit", (code) => {
    if (shuttingDown) {
      return;
    }

    if (code !== 0 && electronProcess) {
      console.error(`Vite exited with code ${code}`);
      cleanup();
      process.exit(code ?? 1);
    }

    if (code !== 0 && !electronProcess) {
      console.error(`Vite exited before Electron started, code ${code}`);
      cleanup();
      process.exit(code ?? 1);
    }
  });

  await waitForServer(devServerUrl);

  electronProcess = spawn(process.execPath, ["scripts/start-electron-dev.cjs"], {
    cwd: root,
    env: {
      ...process.env,
      VITE_DEV_SERVER_URL: devServerUrl
    },
    stdio: "inherit",
    windowsHide: false
  });

  electronProcess.on("error", (error) => {
    console.error(`Failed to start Electron: ${error.message}`);
    cleanup();
    process.exit(1);
  });

  electronProcess.on("exit", (code) => {
    if (shuttingDown) {
      return;
    }

    cleanup();
    process.exit(code ?? 0);
  });

  process.on("SIGINT", () => {
    cleanup();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    cleanup();
    process.exit(0);
  });
}

async function findAvailablePort(port) {
  const available = await isPortAvailable(port);
  if (available) {
    return port;
  }

  return findAvailablePort(port + 1);
}

async function isPortAvailable(port) {
  const canBind = await canBindPort(port);
  if (!canBind) {
    return false;
  }

  const hasHttpServer = await hasHttpResponse(port);
  return !hasHttpServer;
}

function canBindPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

function hasHttpResponse(port) {
  return new Promise((resolve) => {
    const request = http.get(`http://${host}:${port}`, (response) => {
      response.resume();
      resolve(true);
    });

    request.setTimeout(500, () => {
      request.destroy();
      resolve(false);
    });

    request.on("error", () => resolve(false));
  });
}

function waitForServer(url) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      const request = http.get(url, (response) => {
        let html = "";

        response.on("data", (chunk) => {
          html += chunk.toString("utf8");
        });

        response.on("end", () => {
          if (isExpectedRenderer(html)) {
            resolve();
            return;
          }

          reject(new Error(`Renderer at ${url} is not ${projectId}`));
        });
      });

      request.on("error", () => {
        if (Date.now() - startedAt > 30000) {
          reject(new Error(`Timed out waiting for ${url}`));
          return;
        }

        setTimeout(check, 300);
      });
    };

    check();
  });
}

function isExpectedRenderer(html) {
  return (
    html.includes(`<meta name="codex-project-id" content="${projectId}"`) &&
    html.includes("<title>video_tool</title>") &&
    html.includes("/src/main.jsx")
  );
}

function cleanup() {
  shuttingDown = true;
  killProcessTree(electronProcess);
  killProcessTree(rendererProcess);
}

function killProcessTree(childProcess) {
  if (!childProcess || childProcess.killed) {
    return;
  }

  if (process.platform === "win32") {
    spawn("taskkill.exe", ["/PID", String(childProcess.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true
    });
    return;
  }

  childProcess.kill();
}
