const fs = require("fs");
const { spawn } = require("child_process");
const {
  getFfmpegPath,
  getFfprobePath,
  getYtdlpPath
} = require("../utils/pathUtils");
const { decodeProcessOutput } = require("../utils/processOutputDecoder");
const { writeAppLog } = require("./logService");

async function checkBinaries() {
  const [ytdlp, ffmpeg, ffprobe] = await Promise.all([
    checkExecutable("yt-dlp", getYtdlpPath(), ["--version"], parseFirstLine),
    checkExecutable("ffmpeg", getFfmpegPath(), ["-version"], parseFfmpegVersion),
    checkExecutable("ffprobe", getFfprobePath(), ["-version"], parseFfmpegVersion)
  ]);

  const result = { ytdlp, ffmpeg, ffprobe };
  writeAppLog("Binary check completed", result);

  return result;
}

async function checkExecutable(name, filePath, args, parseVersion) {
  const exists = fs.existsSync(filePath);

  if (!exists) {
    return {
      name,
      path: filePath,
      exists: false,
      available: false,
      version: "",
      message: "文件不存在"
    };
  }

  try {
    const output = await runVersionCommand(filePath, args);
    return {
      name,
      path: filePath,
      exists: true,
      available: true,
      version: parseVersion(output),
      message: ""
    };
  } catch (error) {
    return {
      name,
      path: filePath,
      exists: true,
      available: false,
      version: "",
      message: error.message || String(error)
    };
  }
}

function runVersionCommand(filePath, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(filePath, args, {
      windowsHide: true
    });

    let output = "";

    child.stdout.on("data", (data) => {
      output += decodeProcessOutput(data);
    });

    child.stderr.on("data", (data) => {
      output += decodeProcessOutput(data);
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(output || `${filePath} exited with code ${code}`));
      }
    });
  });
}

function parseFirstLine(output) {
  return String(output).split(/\r?\n/).find(Boolean) || "";
}

function parseFfmpegVersion(output) {
  const firstLine = parseFirstLine(output);
  const match = firstLine.match(/version\s+([^\s]+)/i);
  return match ? match[1] : firstLine;
}

module.exports = {
  checkBinaries,
  checkExecutable
};
