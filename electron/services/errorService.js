const ERROR_CODES = require("../constants/errorCodes");

const ERROR_MAPPINGS = [
  {
    code: ERROR_CODES.UNSUPPORTED_URL,
    test: /Unsupported URL/i,
    message: "当前链接暂不支持或链接格式错误"
  },
  {
    code: ERROR_CODES.VIDEO_UNAVAILABLE,
    test: /Video unavailable/i,
    message: "视频不可用，可能已删除、私密或地区限制"
  },
  {
    code: ERROR_CODES.LOGIN_REQUIRED,
    test: /Fresh cookies|cookies.*needed|Sign in to confirm|login required|需要.*Cookie|需要.*登录/i,
    message: "该站点可能需要 Cookie 才能解析或下载，请在设置中配置 Cookie 后重试，或更换公开链接"
  },
  {
    code: ERROR_CODES.HTTP_403,
    test: /HTTP Error 403|403 Forbidden/i,
    message: "访问被拒绝，可能需要稍后重试或升级到支持 Cookie / 代理的版本"
  },
  {
    code: ERROR_CODES.HTTP_412,
    test: /HTTP Error 412|412 Precondition Failed/i,
    message: "站点拒绝了当前请求，已使用桌面浏览器请求头兼容；如仍失败，请稍后重试或确认链接可公开访问"
  },
  {
    code: ERROR_CODES.NETWORK_CONNECTION_REFUSED,
    test: /WinError 10061|ConnectionRefusedError|actively refused|目标计算机积极拒绝/i,
    message: "下载媒体分片时连接被目标 CDN 拒绝，请稍后重试或换一个网络环境"
  },
  {
    code: "NETWORK_CONNECTION_RESET",
    test: /WinError 10054|ConnectionResetError|Connection aborted|远程主机强迫关闭/i,
    message: "下载媒体分片时连接被远程主机中断，程序已自动重试；如仍失败，请稍后重试"
  },
  {
    code: "NETWORK_ERROR",
    test: /Unable to download (webpage|API page)|EOF occurred in violation of protocol|timeout/i,
    message: "无法访问网页，请检查网络后重试"
  },
  {
    code: ERROR_CODES.FFMPEG_NOT_FOUND,
    test: /ffmpeg.*not found|ffmpeg.*not installed/i,
    message: "未找到 FFmpeg，请检查程序文件"
  },
  {
    code: ERROR_CODES.FORMAT_NOT_AVAILABLE,
    test: /Requested format is not available/i,
    message: "当前格式不可用，请尝试重新下载"
  },
  {
    code: ERROR_CODES.FILE_NOT_FOUND,
    test: /ENOENT/i,
    message: "找不到必要文件或路径"
  },
  {
    code: ERROR_CODES.PERMISSION_DENIED,
    test: /EACCES|EPERM|permission denied/i,
    message: "没有权限访问该目录"
  }
];

function normalizeError(error) {
  const rawMessage = extractRawMessage(error);
  const mapping = ERROR_MAPPINGS.find((item) => item.test.test(rawMessage));

  if (mapping) {
    return {
      code: mapping.code,
      message: mapping.message,
      rawMessage
    };
  }

  if (error && error.code && error.message && error.rawMessage !== undefined) {
    return error;
  }

  return {
    code: ERROR_CODES.UNKNOWN_ERROR,
    message: "操作失败，请查看任务日志",
    rawMessage
  };
}

function extractRawMessage(error) {
  if (!error) {
    return "";
  }

  if (typeof error === "string") {
    return error;
  }

  if (error.rawMessage) {
    return error.rawMessage;
  }

  if (error.message) {
    return error.message;
  }

  return String(error);
}

module.exports = {
  normalizeError
};
