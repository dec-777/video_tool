const { spawn } = require("child_process");
const http = require("http");
const path = require("path");

const electronBinary = require("electron");
const root = path.join(__dirname, "..");
const PROJECT_ID = "video_tool";
const DEFAULT_DEV_SERVER_URL = "http://127.0.0.1:5273";
const FALLBACK_HOST = "127.0.0.1";
const FALLBACK_START_PORT = 5273;
const FALLBACK_PORT_COUNT = 10;
const QUICK_PROBE_TIMEOUT_MS = 200;
const WAIT_FOR_DEFAULT_TIMEOUT_MS = 30000;

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

async function main() {
  const devServerUrl = await resolveDevServerUrl();

  const electronArgs = [];
  if (process.env.VIDEO_TOOL_IN_PROCESS_GPU === "1") {
    electronArgs.push("--in-process-gpu");
  }
  electronArgs.push(".");

  const child = spawn(electronBinary, electronArgs, {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: "development",
      ELECTRON_ENABLE_LOGGING: "1",
      VITE_DEV_SERVER_URL: devServerUrl
    },
    stdio: "inherit",
    windowsHide: false
  });

  child.on("error", (error) => {
    console.error(`Failed to launch Electron binary: ${error.message}`);
    process.exit(1);
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
}

async function resolveDevServerUrl() {
  const explicitUrl = process.env.VITE_DEV_SERVER_URL;
  const diagnostics = [];

  if (explicitUrl) {
    const explicitResult = await probeRenderer(explicitUrl, WAIT_FOR_DEFAULT_TIMEOUT_MS);
    if (explicitResult.ok) {
      return explicitUrl;
    }
    diagnostics.push(explicitResult);

    if (process.env.VIDEO_TOOL_DISABLE_FALLBACK === "1") {
      throw new Error(formatRendererError(diagnostics));
    }

    const fallbackUrl = await scanFallbackUrls(diagnostics);
    if (fallbackUrl) {
      return fallbackUrl;
    }

    throw new Error(formatRendererError(diagnostics));
  }

  const defaultResult = await probeRenderer(DEFAULT_DEV_SERVER_URL, WAIT_FOR_DEFAULT_TIMEOUT_MS);
  if (defaultResult.ok) {
    return DEFAULT_DEV_SERVER_URL;
  }
  diagnostics.push(defaultResult);

  const fallbackUrl = await scanFallbackUrls(diagnostics, DEFAULT_DEV_SERVER_URL);
  if (fallbackUrl) {
    return fallbackUrl;
  }

  throw new Error(formatRendererError(diagnostics));
}

async function scanFallbackUrls(diagnostics, skipUrl = "") {
  for (let offset = 0; offset < FALLBACK_PORT_COUNT; offset += 1) {
    const url = `http://${FALLBACK_HOST}:${FALLBACK_START_PORT + offset}`;
    if (url === skipUrl) {
      continue;
    }

    const result = await probeRenderer(url, QUICK_PROBE_TIMEOUT_MS);
    if (result.ok) {
      return url;
    }
    if (result.status !== "unavailable") {
      diagnostics.push(result);
    }
  }

  return "";
}

function probeRenderer(url, timeoutMs) {
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
            resolve({ ok: true, status: "matched", url });
            return;
          }

          resolve({ ok: false, status: "wrong-project", url });
        });
      });

      request.on("error", () => {
        if (Date.now() - startedAt > timeoutMs) {
          resolve({ ok: false, status: "unavailable", url });
          return;
        }

        setTimeout(check, 300);
      });

      request.setTimeout(1000, () => {
        request.destroy();
      });
    };

    check();
  });
}

function formatRendererError(diagnostics) {
  const wrong = diagnostics.find((item) => item.status === "wrong-project");
  if (wrong) {
    return `Renderer at ${wrong.url} is not ${PROJECT_ID}. Refused to open another project's Vite page. Run npm run dev from ${root}, or clear stale VITE_DEV_SERVER_URL.`;
  }

  const checked = diagnostics.map((item) => item.url).join(", ") || DEFAULT_DEV_SERVER_URL;
  return `Timed out waiting for ${PROJECT_ID} renderer. Checked: ${checked}. Run npm run dev from ${root}.`;
}

function isExpectedRenderer(html) {
  return (
    html.includes(`<meta name="codex-project-id" content="${PROJECT_ID}"`) &&
    html.includes("<title>video_tool</title>") &&
    html.includes("/src/main.jsx")
  );
}
