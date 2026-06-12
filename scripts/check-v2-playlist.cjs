const { app } = require("electron");
const { useWorkspaceUserData } = require("./testUserData.cjs");
const { mapPlaylistInfo } = require("../electron/services/ytdlpService");
const { buildYtdlpArgs } = require("../electron/services/commandBuilder");

useWorkspaceUserData(app, "check-v2-playlist");

app.whenReady()
  .then(() => {
    const playlist = mapPlaylistInfo(
      {
        id: "pl_test",
        title: "V2 播放列表检查",
        uploader: "Tester",
        webpage_url: "https://example.com/playlist",
        extractor: "generic",
        entries: [
          {
            id: "a",
            playlist_index: 1,
            title: "完整 URL 条目",
            webpage_url: "https://example.com/video/a",
            duration: 61,
            uploader: "Tester"
          },
          {
            id: "YOUTUBE_ID",
            playlist_index: 2,
            title: "YouTube 扁平条目",
            ie_key: "Youtube",
            duration: 120
          }
        ]
      },
      "https://example.com/playlist"
    );

    if (playlist.count !== 2 || playlist.entries.length !== 2) {
      throw new Error("playlist entry count was not mapped");
    }

    if (playlist.entries[0].url !== "https://example.com/video/a") {
      throw new Error(`direct playlist entry URL was not preserved: ${playlist.entries[0].url}`);
    }

    if (playlist.entries[1].url !== "https://www.youtube.com/watch?v=YOUTUBE_ID") {
      throw new Error(`YouTube flat playlist URL was not resolved: ${playlist.entries[1].url}`);
    }

    const rangeArgs = buildYtdlpArgs({
      urls: ["https://example.com/playlist"],
      mode: "video",
      quality: {
        preset: "best",
        container: "mp4"
      },
      file: {
        outputDir: "E:\\下载 测试",
        outputTemplate: "%(playlist_title)s/%(playlist_index)s - %(title)s.%(ext)s"
      },
      playlist: {
        enabled: true,
        start: 2,
        end: 4,
        items: "2-4"
      }
    });

    assertIncludes(rangeArgs, ["--playlist-start", "2"]);
    assertIncludes(rangeArgs, ["--playlist-end", "4"]);
    assertIncludes(rangeArgs, ["--playlist-items", "2-4"]);
    assertNotIncludes(rangeArgs, ["--no-playlist"]);

    console.log("v2 playlist checks passed");
    app.exit(0);
  })
  .catch((error) => {
    console.error(error.message || error);
    app.exit(1);
  });

function assertIncludes(args, expected) {
  for (const item of expected) {
    if (!args.includes(item)) {
      throw new Error(`Expected playlist args to include ${item}. Actual: ${args.join(" ")}`);
    }
  }
}

function assertNotIncludes(args, forbidden) {
  for (const item of forbidden) {
    if (args.includes(item)) {
      throw new Error(`Expected playlist args not to include ${item}. Actual: ${args.join(" ")}`);
    }
  }
}
