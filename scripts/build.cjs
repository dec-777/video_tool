const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.join(__dirname, "..");
const cacheRoot = path.join(root, ".tmp", "electron-cache");
const builderCacheRoot = path.join(root, ".tmp", "electron-builder-cache");
const viteCli = path.join(root, "node_modules", "vite", "bin", "vite.js");
const builderCli = path.join(root, "node_modules", "electron-builder", "cli.js");

fs.mkdirSync(cacheRoot, { recursive: true });
fs.mkdirSync(builderCacheRoot, { recursive: true });

const env = {
  ...process.env,
  ELECTRON_CACHE: cacheRoot,
  ELECTRON_BUILDER_CACHE: builderCacheRoot
};

run(process.execPath, [viteCli, "build"]);
run(process.execPath, [builderCli]);

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    env,
    stdio: "inherit",
    windowsHide: false
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}
