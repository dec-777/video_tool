const TASK_STATUS = require("../constants/taskStatus");

function parseProgressLine(line) {
  if (!line || typeof line !== "string") {
    return null;
  }

  const trimmed = line.trim();

  const progressMatch = trimmed.match(
    /\[download\]\s+([\d.]+)%\s+of\s+([^\s]+).*?at\s+([^\s]+).*?ETA\s+([^\s]+)/i
  );

  if (progressMatch) {
    return {
      status: TASK_STATUS.DOWNLOADING,
      percent: Number(progressMatch[1]),
      totalSize: progressMatch[2],
      speed: progressMatch[3],
      eta: progressMatch[4]
    };
  }

  const destination = parseDestination(trimmed);
  if (destination) {
    return destination;
  }

  const subtitleDestination = parseSubtitleDestination(trimmed);
  if (subtitleDestination) {
    return subtitleDestination;
  }

  const infoDestination = parseInfoDestination(trimmed);
  if (infoDestination) {
    return infoDestination;
  }

  if (/\[Merger\]/i.test(trimmed)) {
    return {
      status: TASK_STATUS.MERGING,
      outputFile: parseQuotedPath(trimmed)
    };
  }

  if (/\[(ExtractAudio|Metadata|EmbedSubtitle|Fixup|MoveFiles)\]/i.test(trimmed)) {
    return {
      status: TASK_STATUS.POSTPROCESSING,
      outputFile: parseQuotedPath(trimmed)
    };
  }

  if (/ERROR:/i.test(trimmed)) {
    return {
      status: TASK_STATUS.FAILED,
      rawError: trimmed
    };
  }

  if (/has already been downloaded/i.test(trimmed)) {
    return {
      status: TASK_STATUS.COMPLETED,
      percent: 100,
      outputFile: parseQuotedPath(trimmed)
    };
  }

  return null;
}

function parseDestination(line) {
  const match = line.match(/\[(download|ExtractAudio)\]\s+Destination:\s+(.+)$/i);
  if (!match) {
    return null;
  }

  return {
    status: match[1].toLowerCase() === "download" ? TASK_STATUS.DOWNLOADING : TASK_STATUS.POSTPROCESSING,
    outputFile: stripQuotes(match[2].trim())
  };
}

function parseSubtitleDestination(line) {
  const match = line.match(/\[info\]\s+Writing .*subtitles to:\s+(.+)$/i);
  if (!match) {
    return null;
  }

  return {
    status: TASK_STATUS.DOWNLOADING,
    outputFile: stripQuotes(match[1].trim())
  };
}

function parseInfoDestination(line) {
  const match = line.match(/\[info\]\s+Writing video .* to:\s+(.+)$/i);
  if (!match) {
    return null;
  }

  return {
    status: TASK_STATUS.DOWNLOADING,
    outputFile: stripQuotes(match[1].trim())
  };
}

function parseQuotedPath(line) {
  const match = line.match(/"([^"]+)"/);
  return match ? match[1] : "";
}

function stripQuotes(value) {
  return value.replace(/^"|"$/g, "");
}

module.exports = {
  parseProgressLine
};
