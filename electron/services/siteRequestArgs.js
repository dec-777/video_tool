const BILIBILI_REFERER = "https://www.bilibili.com/";
const BILIBILI_ORIGIN = "https://www.bilibili.com";
const BILIBILI_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

function buildSiteRequestArgs(urls) {
  const input = Array.isArray(urls) ? urls : [urls];

  if (input.some(isBilibiliUrl)) {
    return [
      "--user-agent",
      BILIBILI_USER_AGENT,
      "--referer",
      BILIBILI_REFERER,
      "--add-header",
      `Origin:${BILIBILI_ORIGIN}`
    ];
  }

  return [];
}

function isBilibiliUrl(url) {
  try {
    const { hostname } = new URL(url);
    const host = hostname.toLowerCase();
    return host === "b23.tv" || host.endsWith(".b23.tv") || host === "bilibili.com" || host.endsWith(".bilibili.com");
  } catch {
    return false;
  }
}

module.exports = {
  BILIBILI_ORIGIN,
  BILIBILI_REFERER,
  BILIBILI_USER_AGENT,
  buildSiteRequestArgs,
  isBilibiliUrl
};
