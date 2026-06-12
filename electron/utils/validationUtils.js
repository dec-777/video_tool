function assertUrl(url) {
  if (!url || typeof url !== "string") {
    throw {
      code: "INVALID_URL",
      message: "请输入有效的视频链接",
      rawMessage: "URL is required"
    };
  }

  let parsed;
  try {
    parsed = new URL(url.trim());
  } catch {
    throw {
      code: "INVALID_URL",
      message: "请输入有效的视频链接",
      rawMessage: `Invalid URL: ${url}`
    };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw {
      code: "INVALID_URL",
      message: "请输入 http 或 https 视频链接",
      rawMessage: `Unsupported protocol: ${parsed.protocol}`
    };
  }

  return normalizeSupportedSiteUrl(parsed).toString();
}

function normalizeSupportedSiteUrl(parsedUrl) {
  const host = parsedUrl.hostname.toLowerCase();

  if (host === "douyin.com" || host.endsWith(".douyin.com")) {
    return normalizeDouyinUrl(parsedUrl);
  }

  return parsedUrl;
}

function normalizeDouyinUrl(parsedUrl) {
  const modalId = parsedUrl.searchParams.get("modal_id");
  if (parsedUrl.pathname === "/jingxuan" && /^\d+$/.test(modalId || "")) {
    return new URL(`/video/${modalId}`, parsedUrl.origin);
  }

  return parsedUrl;
}

function normalizeUrls(urls) {
  const input = Array.isArray(urls) ? urls : [urls];
  const cleaned = input.map((url) => assertUrl(url));
  return Array.from(new Set(cleaned));
}

function assertNonEmptyString(value, error) {
  if (!value || typeof value !== "string" || !value.trim()) {
    throw error;
  }

  return value.trim();
}

module.exports = {
  assertNonEmptyString,
  assertUrl,
  normalizeUrls
};
