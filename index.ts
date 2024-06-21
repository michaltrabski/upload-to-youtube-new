import {
  copyFileSync,
  ensureDir,
  ensureDirSync,
  existsSync,
  moveSync,
  promises,
  readFileSync,
  readJsonSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
  writeJSONSync,
} from "fs-extra";
import path from "path";

import { ChunkFromVideo, TranscriptionFormDeepgram, VideoChunk } from "./types";
import {
  createHtmlPreview,
  createScreenshot,
  f,
  getEnv,
  log,
  p,
  recreateDirSync,
  trimVideoFromFolder,
} from "./_utils/utils";
import { Job, Format, CreatedVideoData } from "./_utils/types";
import { createSmallVideoForTranscript, createVideo, mergeVideos, resizeVideo } from "./_utils/ffmpeg";
import { mergeTranscriptFromAllChunksFromAllVideos } from "./_utils/transcript";
import { videoInVideo } from "./_utils/videoInVideo";

import { ALL_JOBS } from "./_allJobs";
import { createTestyShorts } from "./_utils/testy-shorts/testyShorts";
import { createSingleVideoExam } from "./_utils/testy-shorts/testyLong";

require("dotenv").config();

const { Deepgram } = require("@deepgram/sdk");

const createdVideosData: { [key in Format]: CreatedVideoData[] } = {
  ["HORIZONTAL"]: [],
  ["VERTICAL"]: [],
};

(async function () {
  log("START");

  for (const job of ALL_JOBS) {
    const { EXECUTE, TYPE } = job;

    if (!EXECUTE) {
      continue;
    }

    if (TYPE === "MAKE_HORIZONTAL_VIDEO") {
      ensureDir(job.BASE_FOLDER);
      ensureDir(`${job.BASE_FOLDER}_PRODUCED`);
      moveMp4VideosToFoldersWithTheSameName(job.BASE_FOLDER);
      const allVideosHorizontal = await createAllVideosData(job);
      // const allVideosHorizontalSlim = createAllVideosDataSlim(allVideosHorizontal);
      // createHtmlPreview("allVideosHorizontal", allVideosHorizontal);
      // createHtmlPreview("allVideosHorizontalSlim", allVideosHorizontalSlim);

      await mergeTranscriptFromAllChunksFromAllVideos(job, allVideosHorizontal);

      if (job.MERGE_ALL_VERTICAL_CHUNKS_FROM_ALL_FOLDERS) {
        await mergeAllVerticalChunksFromAllVideos(job, allVideosHorizontal);
      }

      if (job.MERGE_ALL_CHUNKS_FROM_ALL_FOLDERS) {
        await mergeAllChunksFromAllVideos(job, allVideosHorizontal);
      }
    }

    if (TYPE === "TRIM_VIDEO_TESTY_YOUTUBE") {
      await trimVideoFromFolder(job, job.BASE_FOLDER, "video.mp4", 7.2);
    }

    if (TYPE === "MAKE_SHORTS_WITH_DRIVING_QUESTIONS") {
      await createTestyShorts(job);
    }

    if (TYPE === "MAKE_LONG_WITH_DRIVING_QUESTIONS") {
      await createSingleVideoExam(job);
    }
  }

  // await videoInVideo(SETTINGS_VIDEO_IN_VIDEO, [1], 1, "1.mp3", "intro");
  // await videoInVideo(SETTINGS_VIDEO_IN_VIDEO, [20, 70, 125, 200], 2, "2.mp3", "otter");

  // SETTINGS_HORIZONTAL_MERGE
  if (false) {
    // recreateDirSync(SETTINGS_HORIZONTAL_MERGE.PRODUCED_FOLDER);
    // await mergeVideosHorizontal(SETTINGS_HORIZONTAL_MERGE, 1920, true);
  }

  // SETTINGS_VERTICAL
  if (false) {
    // recreateDirSync(SETTINGS_VERTICAL.PRODUCED_FOLDER);
    // moveMp4VideosToFoldersWithTheSameName(SETTINGS_VERTICAL.BASE_FOLDER);
    // const allVideosVertical = await createAllVideosData(SETTINGS_VERTICAL);
    // copyAllChunks(SETTINGS_VERTICAL, allVideosVertical);
    // copyVideos_DEPRECATED(SETTINGS_VERTICAL, allVideosVertical);
  }

  log("END");
})();

async function mergeAllChunksFromAllVideos(job: Job, videos: VideoChunk[]) {
  const { BASE_FOLDER } = job;
  const producedFolder = `${BASE_FOLDER}_PRODUCED`;
  const folderToCopy = p(producedFolder);

  const allChunksFromEveryVideo = videos.map((v) => v.selectedChunksFromVideoToProduceMergedVideo).flat();

  // const random = Math.floor(Math.random() * 1000000);
  // await mergeVideos(allChunksFromEveryVideo, p(folderToCopy, `merged_${random}.mp4`));

  const producedVideoPath = p(folderToCopy, `merged_horizontal.mp4`);
  await mergeVideos(allChunksFromEveryVideo, producedVideoPath);

  const pointsInTime = [
    "00:00:01",
    "00:00:03",
    "00:00:05",
    "00:00:07",
    "00:00:10",
    "00:00:15",
    "00:00:20",
    "00:00:30",
    "00:00:45",
  ];
  for (const pointInTime of pointsInTime) {
    await createScreenshot(producedVideoPath, f(producedVideoPath).path, pointInTime);
  }
}

async function mergeAllVerticalChunksFromAllVideos(job: Job, videosVertical: VideoChunk[]) {
  const { BASE_FOLDER } = job;
  const producedFolder = `${BASE_FOLDER}_PRODUCED`;
  const folderToCopy = p(producedFolder);

  const allChunksFromEveryVideo = videosVertical.map((v) => v.selectedChunksFromVideoToProduceMergedVideo).flat();
  const allChunksFromEveryVideoVertical = allChunksFromEveryVideo.map((v) => {
    const { path, nameWithExt } = f(v);
    return p(path, "V" + nameWithExt);
  });

  // const random = Math.floor(Math.random() * 1000000);
  // await mergeVideos(allChunksFromEveryVideoVertical, p(folderToCopy, `mergedVertical_${random}.mp4`));
  await mergeVideos(allChunksFromEveryVideoVertical, p(folderToCopy, `merged_vertical.mp4`));
}

function copyAllChunks(job: Job, videos: VideoChunk[]) {
  const { BASE_FOLDER } = job;
  const folderToCopy = p(`${BASE_FOLDER}_PRODUCED`);

  const allChunksFromEveryVideo = videos.map((v) => v.selectedChunksFromVideoToProduceMergedVideo).flat();

  let zapierText = ``;
  allChunksFromEveryVideo.forEach((videoChunkName, i) => {
    const { name, nameWithExt } = f(videoChunkName);

    const nameWithoutChunkPrefix = name.split(" ").splice(1).join(" ");
    copyFileSync(videoChunkName, p(folderToCopy, nameWithExt));

    // publish date example format "2024-05-15T08:56"
    const path = "https://hosting2396491.online.pro/usun/";
    zapierText += `${nameWithoutChunkPrefix}\topis ${i + 1}\t${path}${nameWithExt}\n`;
  });

  writeFileSync(p(folderToCopy, "zapier-text.txt"), zapierText);
}

// function copyVideos_DEPRECATED(job: Job, videos: VideoChunk[]) {
//   const videosToMerge: string[] = [];
//   log("Files to copy = ", videos.length, createdVideosData.VERTICAL.length);
//   createdVideosData[job.ORIENTATION].forEach((video, i) => {
//     const currentVideoData = videos.find((v) => v.path === video.videoPath);

//     const folder = p(job.PRODUCED_FOLDER);
//     const folderWIthNumber = p(job.PRODUCED_FOLDER, `${i + 1}`);

//     log({ folder, folderWIthNumber });

//     ensureDirSync(folderWIthNumber);

//     copyFileSync(video.videoPath, p(folder, video.videoName));
//     copyFileSync(video.videoPath, p(folderWIthNumber, video.videoName.split(" ").splice(1).join(" ")));

//     videosToMerge.push(p(folderWIthNumber, video.videoName.split(" ").splice(1).join(" ")));

//     if (existsSync(video.screenshotPath)) {
//       copyFileSync(video.screenshotPath, p(folderWIthNumber, video.screenshotName));
//     }
//     writeJSONSync(p(folderWIthNumber, "data.json"), { ...currentVideoData, ...video });

//     writeFileSync(
//       p(folderWIthNumber, "opis.txt"),
//       // "Przedstawiam 32 pytania z egzaminu teoretycznego na prawo jazdy kategorii B 2024!" +
//       // "\n\n" +
//       (
//         "Rozwiąż test na prawo jazdy na stronie https://www.poznaj-testy.pl/" +
//         // "Take a driving test on the website https://www.poznaj-testy.pl/" +
//         "\n\n" +
//         "Lista 100 najtrudniejszych pytań: https://www.poznaj-testy.pl/statystyki" +
//         "\n\n" +
//         currentVideoData?.description +
//         "\n\n"
//       ).slice(0, 4900)
//     );

//     writeFileSync(
//       p(folder, `${i + 1} opis.txt`),
//       // "Przedstawiam 32 pytania z egzaminu teoretycznego na prawo jazdy kategorii B 2024!" +
//       // "\n\n" +
//       (
//         "Rozwiąż test na prawo jazdy na stronie https://www.poznaj-testy.pl/" +
//         // "Take a driving test on the website https://www.poznaj-testy.pl/" +
//         "\n\n" +
//         "Lista 100 najtrudniejszych pytań: https://www.poznaj-testy.pl/statystyki" +
//         "\n\n" +
//         currentVideoData?.description +
//         "\n\n"
//       ).slice(0, 4900)
//     );
//   });

//   return { videosToMerge };
// }

function createAllVideosDataSlim(allVideos: VideoChunk[]) {
  const allVideosSlim = allVideos.map((v, i) => {
    const slimV = {
      nr: i + 1,
      description: `${v.description}`,
      duration: +v.duration.toFixed(1),
      path: v.path,
      originalTitle: v.title,
    };

    return slimV;
  });

  return allVideosSlim;
}

function getSubFoldersFullPathList(baseFolder: string) {
  return readdirSync(baseFolder)
    .filter((item) => statSync(p(baseFolder, item)).isDirectory())
    .map((v) => p(baseFolder, v));
}

async function mergeVideosHorizontal(settings: Job, videoOutputWidth: number, flip?: boolean) {
  recreateDirSync(settings.BASE_FOLDER);

  const subFolders = getSubFoldersFullPathList(settings.BASE_FOLDER);
  log("mergeVideosHorizontal() called:", { baseFolder: settings.BASE_FOLDER, subFolders });

  for (const singleSubFolder of subFolders) {
    const files = readdirSync(singleSubFolder);

    // check if there is video allready merged
    const isAllreadyMerged = files.some((file) => {
      const folderName = singleSubFolder.split("\\").pop();
      const fileName = file.toLowerCase().split(".mp4").shift();
      return fileName === folderName;
    });

    if (isAllreadyMerged) {
      log(`Video is allready merged: ${singleSubFolder.split("\\").pop()}`);
      continue;
    }

    const mp4OriginalFiles = files
      .filter((file) => file.toLowerCase().endsWith(".mp4"))
      .filter((file) => !file.includes("temp"))
      .filter((file) => !file.includes("scaled_"))
      .filter((file) => {
        // dont merge video with the folder name
        const folderName = singleSubFolder.split("\\").pop();
        const fileName = file.toLowerCase().split(".mp4").shift();
        return fileName !== folderName;
      });

    if (videoOutputWidth) {
      for (const file of mp4OriginalFiles) {
        const filePath = p(singleSubFolder, file);
        const scaledFilePath = p(singleSubFolder, "scaled_" + file);

        if (existsSync(scaledFilePath)) {
          continue;
        }

        await resizeVideo(filePath, scaledFilePath, videoOutputWidth, flip);
      }
    }

    if (mp4OriginalFiles.length > 1 && !videoOutputWidth) {
      const mergedVideoName = singleSubFolder.split("\\").pop() + ".mp4";
      const mergedVideoPath = p(singleSubFolder, mergedVideoName);
      const videosToMerge = mp4OriginalFiles.map((v) => p(singleSubFolder, v));

      try {
        await mergeVideos(videosToMerge, mergedVideoPath);
      } catch (error) {
        log("\n\n\nCheck if any of the videos to merge is not broken, not fully produced\n\n\n", { error });
      }
    }

    const mp4ScaledFiles = files
      .filter((file) => file.toLowerCase().endsWith(".mp4"))
      .filter((file) => !file.includes("temp"))
      .filter((file) => file.includes("scaled_"))
      .filter((file) => {
        // dont merge video with the folder name
        const folderName = singleSubFolder.split("\\").pop();
        const fileName = file.toLowerCase().split(".mp4").shift();
        return fileName !== folderName;
      });

    if (mp4ScaledFiles.length > 1) {
      const mergedVideoName = singleSubFolder.split("\\").pop() + ".mp4";
      const mergedVideoPath = p(singleSubFolder, mergedVideoName);
      const videosToMerge = mp4ScaledFiles.map((v) => p(singleSubFolder, v));

      log("merging videos", { mergedVideoPath, videosToMerge });

      try {
        await mergeVideos(videosToMerge, mergedVideoPath);
      } catch (error) {
        log("\n\n\nCheck if any of the videos to merge is not broken, not fully produced\n\n\n", { error });
      }
    }
  }
}

async function createAllVideosData(settings: Job) {
  const { BASE_FOLDER, ORIENTATION } = settings;

  const allVideos: any[] = [];

  const folderNames = await promises.readdir(BASE_FOLDER);

  log("createAllVideosData() - called", { BASE_FOLDER, ORIENTATION, folderNames }, "\n\n");

  for (const folderName of folderNames) {
    const folderPath = path.join(BASE_FOLDER, folderName);

    const stats = await promises.stat(folderPath);
    if (!stats.isDirectory()) {
      continue;
    }

    const files = await promises.readdir(folderPath);
    const originalVideo = files.find((fileName) => fileName === folderName);

    if (!originalVideo) {
      continue;
    }

    const originalVideoPath = path.join(folderPath, originalVideo);

    const transcriptionFormDeepgram = await getVideoTranscription(settings, folderPath, originalVideoPath);
    const videos = await getInfoFromTranscription(
      settings,
      folderName,
      originalVideoPath,
      transcriptionFormDeepgram,
      ORIENTATION
    );

    allVideos.push(videos);
  }

  return allVideos.flat() as VideoChunk[];
}

function getVideoTranscription(
  settings: Job,
  folder: string,
  fullPathToVideo: string
): Promise<TranscriptionFormDeepgram> {
  return new Promise(async (resolve, reject) => {
    const { BASE_FOLDER } = settings;

    const transcriptFromDeepgram = readJsonSync(p(BASE_FOLDER, folder, "transcriptFromDeepgram.json"), {
      throws: false,
    }) as TranscriptionFormDeepgram | null;

    if (transcriptFromDeepgram) {
      resolve(transcriptFromDeepgram);
      return;
    }

    log("transcriptFromDeepgram does not exists", { transcriptFromDeepgram });

    // The API key we created in step 3
    const deepgramApiKey = getEnv("DEEPGRAM_API_KEY");

    // Replace with your audio mimetype
    const mimetype = "audio/mp4";

    // Initializes the Deepgram SDK
    const deepgram = new Deepgram(deepgramApiKey);

    // create small video version for fast upload
    log("Creating small video for transcript");
    const smallVideoPath = p(f(fullPathToVideo).path, f(fullPathToVideo).name + "_FOR_TRANSCRIPT.mp4");

    if (!existsSync(smallVideoPath)) {
      await createSmallVideoForTranscript(fullPathToVideo, smallVideoPath);
    }

    log(`Requesting transcript for:`, fullPathToVideo);

    deepgram.transcription
      .preRecorded(
        { buffer: readFileSync(smallVideoPath), mimetype },
        {
          punctuate: true,
          model: "general", // "general",  "nova-general"
          language: settings.DEEPGRAM_LANG,
          tier: "enhanced",
          detect_topics: false, // not needed for now - maybe try it later
          summarize: false, // not needed for now - maybe try it later
        }
      )
      .then((transcriptFromDeepgram: TranscriptionFormDeepgram) => {
        resolve(transcriptFromDeepgram);
        log(`\n  Transcript created for: \n  ${fullPathToVideo}\n\n`);
        writeJSONSync(p(BASE_FOLDER, folder, "transcriptFromDeepgram.json"), transcriptFromDeepgram);
      })
      .catch((err: any) => {
        log(`\n  Transcript error for: \n  ${fullPathToVideo}\n\n`);
        reject(err);
        return;
      });
  });
}

function moveMp4VideosToFoldersWithTheSameName(folder: string) {
  const TEMP = "tempFolderName";

  ensureDirSync(folder);

  const files = readdirSync(folder);

  // log("files", files);

  files.forEach((itemInVideoFolder) => {
    const isItemADirectory = statSync(p(folder, itemInVideoFolder)).isDirectory();

    if (isItemADirectory) {
      return;
    }

    if (!itemInVideoFolder.endsWith(".mp4") && !itemInVideoFolder.endsWith(".MP4")) {
      return;
    }

    ensureDirSync(p(folder, TEMP));
    moveSync(path.resolve(folder, itemInVideoFolder), path.resolve(folder, TEMP, itemInVideoFolder));
    renameSync(path.resolve(folder, TEMP), path.resolve(folder, itemInVideoFolder));
  });
}

function trimTitle(title: string) {
  return title
    .replace(/[?!,;:]/g, " ")
    .replace("    ", " ")
    .replace("   ", " ")
    .replace("  ", " ")
    .replace("  ", " ")
    .trim()
    .split(" ")
    .slice(0, 10)
    .join(" ")
    .trim();
}

function replaceAll(str: string, find: string, replace: string) {
  return str.replace(new RegExp(find, "g"), replace);
}

async function getInfoFromTranscription(
  job: Job,
  folderName: string,
  originalVideoPath: string,
  transcriptFromDeepgram: TranscriptionFormDeepgram,
  format: "HORIZONTAL" | "VERTICAL"
) {
  const { BASE_FOLDER } = job;
  const producedFolder = `${BASE_FOLDER}_PRODUCED`;

  const rootVideoDuration = transcriptFromDeepgram?.metadata?.duration;
  const transcript = transcriptFromDeepgram?.results?.channels[0]?.alternatives[0]?.transcript;
  const words = transcriptFromDeepgram?.results?.channels[0]?.alternatives[0]?.words;

  if (!rootVideoDuration || !transcript || words.length === 0) {
    return [];
  }

  const chunksFromVideo: ChunkFromVideo[] = [];
  const timestampsForYt: string[] = [];

  let text = "";
  let i = 0;
  let counter = 0;
  let countVideos = 0;

  for (i; i < words.length; i++) {
    counter++;
    const gapBeetweenWords = words[i + 1] ? words[i + 1].start - words[i].end : null;

    text = `${text} ${words[i].punctuated_word}`;

    const gap = gapBeetweenWords === null ? null : +gapBeetweenWords.toFixed(1);

    if (gap === null || gap > job.MIN_GAP_BEEWEEN_WORDS_TO_SPLICE_VIDEO) {
      countVideos++;
      const titleForYt = trimTitle(text);
      const title = titleForYt;

      timestampsForYt.push(text.split(" ").slice(0, 10).join(" ")); // maybe remove

      const titleInFolder = `______chunk_${countVideos} ${titleForYt}`.replace(/[\/\\\?\%\*\:\|\"\<\>]/g, "X");

      const start = words[i === 0 ? 0 : i - counter + 1].start;
      const end = words[i].end;

      const trimStart = start > job.TRIM_EALIER ? start - job.TRIM_EALIER : 0;
      const trimEnd = end + job.TRIM_LATER > rootVideoDuration ? rootVideoDuration : end + job.TRIM_LATER;

      const duration = trimEnd - trimStart;

      const chunkTranscript = { text, duration };

      const chunkFromVideo = {
        path: p(__dirname, BASE_FOLDER, folderName, titleInFolder + ".mp4"),
        title,
        titleForYt,
        titleInFolder,
        chunkTranscript,
        description: createDescription(text),
        start,
        end,
        trimStart,
        trimEnd,
        duration,
        transcript,
        gap,
        words: words.slice(i === 0 ? 0 : i - counter + 1, i + 1),
        timestampsForYt,
      };

      chunksFromVideo.push(chunkFromVideo);

      text = "";
      counter = 0;
    }
  }

  for (const chunkFromVideo of chunksFromVideo) {
    const producedChunkPath = chunkFromVideo.path;

    if (!existsSync(producedChunkPath)) {
      await createVideo(
        job,
        originalVideoPath,
        producedChunkPath,
        chunkFromVideo.trimStart,
        chunkFromVideo.trimEnd,
        format
      );
    }

    // VERTICAL VIDEO
    const { path, nameWithExt } = f(producedChunkPath);
    const producedChunkPathVertical = p(path, "V" + nameWithExt);
    if (!existsSync(producedChunkPathVertical) && job.CREATE_VERTICAL_CHUNKS) {
      await createVideo(
        job,
        originalVideoPath,
        producedChunkPathVertical,
        chunkFromVideo.trimStart,
        chunkFromVideo.trimEnd,
        "VERTICAL"
      );
    }

    if (existsSync(producedChunkPathVertical)) {
      const { nameWithExt } = f(producedChunkPathVertical);
      ensureDirSync(p(producedFolder));
      const name = nameWithExt.split(" ").splice(1).join(" ");
      copyFileSync(producedChunkPathVertical, p(producedFolder, name));
    }
  }

  const videosToUpload: VideoChunk[] = [];
  const tempChunksFromVideo: ChunkFromVideo[] = [];

  let nr = 0;
  chunksFromVideo.forEach((video, index) => {
    tempChunksFromVideo.push(video);

    const isLast = index === chunksFromVideo.length - 1;

    if ((video.gap !== null && video.gap > job.GAP_TO_DETERMIN_WHEN_NEXT_VIDEO_START) || isLast) {
      nr++;
      videosToUpload.push(mergeVideoChunk(nr, tempChunksFromVideo, folderName, BASE_FOLDER));
      tempChunksFromVideo.length = 0;
    }
  });

  for (const video of videosToUpload) {
    if (!existsSync(video.path) && job.MERGE_CHUNKS_IN_EVERY_SINGLE_FOLDER) {
      log("merging chunks:");
      log(video.selectedChunksFromVideoToProduceMergedVideo);

      await mergeVideos(video.selectedChunksFromVideoToProduceMergedVideo, video.path);
    }

    // michal
    // const screenshotPath = await createScreenshot(video.path, p(__dirname, BASE_FOLDER, folderName));
    // createdVideosData[format].push({
    //   videoPath: video.path,
    //   videoName: video.path.split("\\").pop() as string,
    //   screenshotPath: screenshotPath as string,
    //   screenshotName: (screenshotPath as string).split("\\").pop() as string,
    // });
  }

  return videosToUpload;
}

function mergeVideoChunk(
  nr: number,
  chunksFromVideo: ChunkFromVideo[],
  folderName: string,
  baseFolder: string
): VideoChunk {
  const mergedChunk: VideoChunk = {
    selectedChunksFromVideoToProduceMergedVideo: [],
    chunkTranscripts: [],
    path: "",
    title: "",
    description: "",
    start: -1,
    end: -1,
    trimStart: -1,
    trimEnd: -1,
    duration: -1,
    transcript: "",
    gap: -1,
    words: [],
  };

  chunksFromVideo.forEach((chunkFromVideo, index) => {
    mergedChunk.path += chunkFromVideo.path + "|";

    const isFirst = index === 0;
    const isLast = index === chunksFromVideo.length - 1;

    mergedChunk.start = isFirst ? chunkFromVideo.start : mergedChunk.start;
    mergedChunk.end = isLast ? chunkFromVideo.end : mergedChunk.end;
    mergedChunk.trimStart = isFirst ? chunkFromVideo.trimStart : mergedChunk.trimStart;
    mergedChunk.trimEnd = isLast ? chunkFromVideo.trimEnd : mergedChunk.trimEnd;
    mergedChunk.duration += chunkFromVideo.duration;

    mergedChunk.transcript = chunkFromVideo.transcript;
    mergedChunk.gap += chunkFromVideo.gap || 0; // michal maybe gap can be 0 instead of null ????
    mergedChunk.words = mergedChunk.words.concat(chunkFromVideo.words);
    mergedChunk.chunkTranscripts.push(chunkFromVideo.chunkTranscript);

    if (isLast) {
      mergedChunk.selectedChunksFromVideoToProduceMergedVideo = mergedChunk.path.split("|").filter((v) => v);

      const title = trimTitle(mergedChunk.words.map((v) => v.punctuated_word).join(" "));
      const titleInFolder = nr + " " + title;

      mergedChunk.path = p(__dirname, baseFolder, folderName, titleInFolder + ".mp4");
      mergedChunk.title = title;
      mergedChunk.description = createDescription(mergedChunk.words.map((v) => v.punctuated_word).join(" "));
    }
  });

  return mergedChunk;
}

function createDescription(description: string) {
  // DONT REORDER THIS ARRAY !!!
  const replacerArray = [["Poznaj testy. Pl", "https://www.poznaj-testy.pl/"]];

  replacerArray.forEach((element) => {
    description = replaceAll(description, element[0], element[1]);
  });

  return description.trim();
}
