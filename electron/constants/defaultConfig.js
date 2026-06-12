const DEFAULT_CONFIG = {
  configVersion: 2,
  defaultOutputDir: "",
  defaultMode: "video",
  defaultAudioFormat: "mp3",
  defaultContainer: "mp4",
  outputTemplate: "%(title)s.%(ext)s",
  concurrentDownloads: 1,
  quality: {
    preset: "best",
    resolution: 1080,
    formatId: "",
    container: "mp4"
  },
  subtitles: {
    writeSubs: false,
    writeAutoSubs: false,
    languages: ["zh-Hans", "en"],
    format: "srt",
    embed: false
  },
  metadata: {
    thumbnail: false,
    embedThumbnail: false,
    description: false,
    infoJson: false,
    comments: false,
    embedMetadata: false
  },
  auth: {
    cookiesMode: "none",
    cookiesFile: "",
    cookiesFromBrowser: ""
  },
  network: {
    proxyEnabled: false,
    proxy: "",
    retries: 10,
    limitRate: ""
  },
  file: {
    archiveEnabled: false,
    archivePath: "",
    keepIntermediateFiles: false
  },
  playlist: {
    enabled: false,
    start: 0,
    end: 0,
    items: ""
  },
  theme: "system"
};

module.exports = DEFAULT_CONFIG;
