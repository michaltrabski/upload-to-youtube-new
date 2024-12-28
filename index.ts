import {
  copyFileSync,
  ensureDir,
  ensureDirSync,
  existsSync,
  moveSync,
  promises,
  readFileSync,
  readJSONSync,
  readJsonSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
  writeJSONSync,
  writeJsonSync,
} from "fs-extra";
import path from "path";
import { getSilentParts } from "@remotion/renderer";

import { ChunkFromVideo, TextAndMediaInExam, TranscriptionFormDeepgram, VideoChunk } from "./types";
import {
  createHtmlPreview,
  createScreenshot,
  createVerticalChunksWithDurationLimit,
  f,
  getEnv,
  getExtraContent,
  log,
  p,
  recreateDirSync,
  trimVideoFromFolder,
} from "./_utils/utils";
import { Job, Format } from "./_utils/types";
import {
  createSmallVideoForTranscript,
  createVideo,
  getVideoDuration,
  manipulateVideo,
  mergeVideos,
  mergeVideosWithBgMusic,
  putVideoOnVideo,
  resizeVideo,
  trimMp3,
} from "./_utils/ffmpeg";
import { mergeTranscriptFromAllChunksFromAllVideos } from "./_utils/transcript";
import { videoInVideo } from "./_utils/videoInVideo";

import { ALL_JOBS } from "./_allJobs";

import { createSingleVideoExam } from "./_utils/testy-na-prawo-jazdy/testyLong";
import {
  addMp3ToVideoWithBothAudioTracks,
  drawTextOnVideo,
  getVideoDimensions,
  mergeVideos_v2,
} from "./_utils/ffmpeg-v2";
import { createVideoWithAnyExamQuestions } from "./_utils/testy-na-prawo-jazdy/videoWithAnyQuestions";
import { getAllMp3InFolder, getAllMp4InFolder } from "./utils_v2";
import { createExam } from "./_utils/testy-na-prawo-jazdy/testyExam";
import { ExamDataObj } from "./_utils/testy-na-prawo-jazdy/data/types";
import { generateImages } from "./_utils/generateImages";
import { putTextOnPng } from "./_utils/jimp_v2";
import {
  createVideoForRowery_v1,
  overlayVideosForRovery_v1,
  putVideoOnVideoForRovery_v1,
} from "./_utils/ffmpeg-for-rowery-v1";
import { askChatGpt } from "./_utils/gpt";
import { manipulateVideo_v3, putVideoOnVideo_v3 } from "./_utils/ffmpeg-v3";
import { r, rozpocznijEgzaminMp4, rozpoczynamyEgzamin, t } from "./_utils/testy-na-prawo-jazdy/translations";

require("dotenv").config();

const { Deepgram } = require("@deepgram/sdk");

(async () => {
  try {
    await main();
  } catch (error) {
    console.log(`call main() again - ERROR: ${error}`);
    await main();
  }
})();

async function main() {
  log("START");

  for (const job of ALL_JOBS) {
    const { EXECUTE, TYPE } = job;

    if (!EXECUTE) {
      continue;
    }

    if (TYPE === "ROWER_PRZYSPIESZONE_WIDEO_Z_GADANIEM") {
      ensureDir(job.BASE_FOLDER);
      ensureDir(`${job.BASE_FOLDER}_PRODUCED`);
      await moveMp4VideosToFoldersWithTheSameName(job.BASE_FOLDER);
      const allVideosHorizontal = await createAllVideosData(job);

      // await mergeTranscriptFromAllChunksFromAllVideos(job, allVideosHorizontal);

      // if (job.MERGE_ALL_VERTICAL_CHUNKS_FROM_ALL_FOLDERS) {
      //   await mergeAllVerticalChunksFromAllVideos(job, allVideosHorizontal);
      // }

      // if (job.MERGE_ALL_CHUNKS_FROM_ALL_FOLDERS) {
      //   await mergeAllChunksFromAllVideos(job, allVideosHorizontal);
      // }
    }

    if (TYPE === "ROWER_JAZDA_Z_GARMINEM_I_GADANIEM") {
      ensureDir(job.BASE_FOLDER);
      ensureDir(`${job.BASE_FOLDER}_PRODUCED`);

      // const files = getExtraContent(job);

      await moveMp4VideosToFoldersWithTheSameName(job.BASE_FOLDER);
      const allVideosHorizontal = await createAllVideosData(job);

      await mergeTranscriptFromAllChunksFromAllVideos(job, allVideosHorizontal, "pl");

      if (job.MERGE_ALL_VERTICAL_CHUNKS_FROM_ALL_FOLDERS) {
        await mergeAllVerticalChunksFromAllVideos(job, allVideosHorizontal);
      }

      if (job.MERGE_ALL_CHUNKS_FROM_ALL_FOLDERS) {
        await mergeAllChunksFromAllVideos(job, allVideosHorizontal);
      }
    }

    if (TYPE === "ROWER_POKAZYWANIE_ROWERU_STOJACEGO") {
      ensureDir(job.BASE_FOLDER);
      ensureDir(`${job.BASE_FOLDER}_PRODUCED`);
      await moveMp4VideosToFoldersWithTheSameName(job.BASE_FOLDER);
      const allVideosHorizontal = await createAllVideosData(job);

      await mergeTranscriptFromAllChunksFromAllVideos(job, allVideosHorizontal, "pl");

      if (job.MERGE_ALL_VERTICAL_CHUNKS_FROM_ALL_FOLDERS) {
        await mergeAllVerticalChunksFromAllVideos(job, allVideosHorizontal);
      }

      if (job.MERGE_ALL_CHUNKS_FROM_ALL_FOLDERS) {
        await mergeAllChunksFromAllVideos(job, allVideosHorizontal);
      }

      // YT description created at the end
    }

    if (TYPE === "MAKE_HORIZONTAL_VIDEO") {
      ensureDir(job.BASE_FOLDER);
      ensureDir(`${job.BASE_FOLDER}_PRODUCED`);
      await moveMp4VideosToFoldersWithTheSameName(job.BASE_FOLDER);
      const allVideosHorizontal = await createAllVideosData(job);

      await mergeTranscriptFromAllChunksFromAllVideos(job, allVideosHorizontal, "pl");

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

    if (TYPE === "MERGE_VIDEOS") {
      const folder = job.BASE_FOLDER;

      ensureDirSync(folder);
      const files = readdirSync(folder);
      const mp4Files = files
        .filter((file) => file.toLowerCase().endsWith(".mp4") || file.toLowerCase().endsWith(".MP4"))
        .filter((video) => !video.includes("temp"));

      const videos = mp4Files.map((file) => p(folder, file));

      if (videos.length === 0) {
        log("No videos to merge");
        continue;
      }

      videos.forEach((video, i) => log(i + 1, "video= ", video));

      const mergedVideoPath = p(folder, "merged.mp4");
      await mergeVideos(videos, mergedVideoPath);

      const duration = await getVideoDuration(mergedVideoPath);
      log("duration", duration);

      const bgMp3 = p(__dirname, "_mp3", "music1.mp3");
      const bgMp3Trimmed = await trimMp3(bgMp3, p(folder, "bgMp3Trimmed.mp3"), 0, duration);
      const mergedVideoPathWithBgMusic = p(folder, "mergedWithBgMusic.mp4");

      await mergeVideosWithBgMusic([mergedVideoPath], mergedVideoPathWithBgMusic, bgMp3Trimmed);

      // GENERATE THUMBNAILS IMAGES
      if (true) {
        const pathTofileNameWithPrompts = p(folder, "_thumbnails-descriptions-prompts.json");

        if (!existsSync(pathTofileNameWithPrompts)) {
          await writeJSONSync(pathTofileNameWithPrompts, [{ prompt: "" }, { prompt: "" }, { prompt: "" }], {
            spaces: 2,
          });
        }

        await generateImages(true, p(folder, "_thumbnails-descriptions-prompts.json"));
      }

      // await putTextOnPng(p(folder, "1.png"), " Wrocław ", { x: 100, y: 100, bgColor: "transparent" });
    }

    if (TYPE === "MAKE_LONG_WITH_DRIVING_QUESTIONS") {
      await createSingleVideoExam(job);
    }

    if (TYPE === "CREATE_EXAM") {
      const COUNT = 5;
      const LANG = "pl";
      const FILE_WITH_DATA = "examDataObj30_difficultExams_b_1.json";

      const textsAndMediaBeforeExam: TextAndMediaInExam[] = [
        { myText: r(rozpoczynamyEgzamin), media: r(rozpocznijEgzaminMp4) },
      ];

      const textsAndMediaAfterExam: TextAndMediaInExam[] = [
        { myText: r(rozpoczynamyEgzamin), media: r(rozpocznijEgzaminMp4) },
      ];

      for (let counter of [...Array(COUNT).keys()]) {
        const exams_b_random: ExamDataObj = readJSONSync(
          p(__dirname, "_utils", "testy-na-prawo-jazdy", "data", FILE_WITH_DATA)
        );

        try {
          await createExam(
            job,
            0,
            exams_b_random.exams,
            LANG,
            [{ myText: r(rozpoczynamyEgzamin), media: r(rozpocznijEgzaminMp4) }],
            [{ myText: r(rozpoczynamyEgzamin), media: r(rozpocznijEgzaminMp4) }]
          );
        } catch (error) {
          console.log("createExam error", error);
        }

        const exams_b_random_after = exams_b_random.exams.filter((_, index) => ![0].includes(index));
        writeJsonSync(
          p(__dirname, "_utils", "testy-na-prawo-jazdy", "data", FILE_WITH_DATA),
          { exams: exams_b_random_after },
          { spaces: 2 }
        );
      }
    }

    if (TYPE === "CREATE_EXAM_EN") {
      const COUNT_EN = 1;
      const FILE_WITH_DATA_EN = "examDataObj30_difficultExams_b_en_1.json";

      for (let counter of [...Array(COUNT_EN).keys()]) {
        const exams_b_random: ExamDataObj = readJSONSync(
          p(__dirname, "_utils", "testy-na-prawo-jazdy", "data", FILE_WITH_DATA_EN)
        );

        try {
          await createExam(job, 0, exams_b_random.exams, "en", [], []);
        } catch (error) {
          console.log("createExam error", error);
        }

        const exams_b_random_after = exams_b_random.exams.filter((_, index) => ![0].includes(index));
        // writeJsonSync(
        //   p(__dirname, "_utils", "testy-na-prawo-jazdy", "data", FILE_WITH_DATA_EN),
        //   { exams: exams_b_random_after },
        //   { spaces: 2 }
        // );
      }
    }

    if (TYPE === "MAKE_VIDEO_WITH_ANY_DRIVING_QUESTIONS") {
      await createVideoWithAnyExamQuestions(
        job,
        "https://www.poznaj-testy.pl/api/video/difficult.json",
        50,
        "https://hosting2421517.online.pro/testy-na-prawo-jazdy/mp4/czesc-w-tym-wideo-zaprezentuje-wam-liste-piecdziesieciu-najtrudniejszych-pytan-testowych-kategorii-b.mp4"
      );
    }

    if (TYPE === "MAKE_EBIKE_ACCELERATION_SHORTS_VIDEO") {
      ensureDir(job.BASE_FOLDER);
      ensureDir(`${job.BASE_FOLDER}_PRODUCED`);
      const videos = getAllMp4InFolder(job.BASE_FOLDER).filter((v) => !v.includes("RESULT") && !v.includes("TEMP"));
      const mp3s = getAllMp3InFolder(job.BASE_FOLDER);
      console.log({ videos, mp3s });

      videos.forEach((video, i) => {
        setTimeout(() => {
          console.log(i);
          const randomMp3 = mp3s[Math.floor(Math.random() * mp3s.length)];
          addMp3ToVideoWithBothAudioTracks(p(job.BASE_FOLDER, video), p(job.BASE_FOLDER, randomMp3)).then((video) => {
            copyFileSync(video, p(job.BASE_FOLDER + "_PRODUCED", "RESULT_" + f(video).nameWithExt));
            copyFileSync(
              video,
              p(job.BASE_FOLDER + "_PRODUCED", `Test nr ${i + 1} przyspieszenia roweru elektrycznego.mp4`)
            );
            console.log("done");
          });
        }, 0);
      });
      // const res = await addMp3ToVideoWithBothAudioTracks(videos[0], mp3s[0]);
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
}

async function mergeAllChunksFromAllVideos(job: Job, videos: VideoChunk[]) {
  const { BASE_FOLDER } = job;
  const producedFolder = `${BASE_FOLDER}_PRODUCED`;
  const folderToCopy = p(producedFolder);

  const allChunksFromEveryVideo = videos.map((v) => v.selectedChunksFromVideoToProduceMergedVideo).flat();

  // const random = Math.floor(Math.random() * 1000000);
  // await mergeVideos(allChunksFromEveryVideo, p(folderToCopy, `merged_${random}.mp4`));

  const producedVideoPath = p(folderToCopy, `merged_horizontal.mp4`);
  await mergeVideos_v2(allChunksFromEveryVideo, producedVideoPath);

  const pointsInTime = [
    ...[...Array(10)].map((_, i) => `00:0${i}:00`), // 00:00:00 - 00:09:00
    ...[...Array(10)].map((_, i) => `00:${10 + i}:00`), // 00:10:00 - 00:19:00
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

    if (originalVideo.includes("thumbnail")) {
      const videoPath = p(folderPath, originalVideo);

      const pointsInTime = [
        ...[...Array(10)].map((_, i) => `00:00:0${i}`),
        ...[...Array(30)].map((_, i) => `00:00:${10 + i}`),
      ];

      for (const pointInTime of pointsInTime) {
        // await
        // createScreenshot(videoPath, f(videoPath).path, pointInTime);
      }
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

async function moveMp4VideosToFoldersWithTheSameName(folder: string) {
  const TEMP = "tempFolderName";

  ensureDirSync(folder);

  const files = readdirSync(folder);

  // const { silentParts, durationInSeconds, audibleParts } = await getSilentParts({
  //   src: p(folder, files[1]),
  //   noiseThresholdInDecibels: 0,
  //   minDurationInSeconds: 1,
  // });

  // console.log("działa itemInVideoFolder", files[0], { silentParts, durationInSeconds, audibleParts });

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
      if (
        job.TYPE === "ROWER_JAZDA_Z_GARMINEM_I_GADANIEM" ||
        job.TYPE === "ROWER_POKAZYWANIE_ROWERU_STOJACEGO" ||
        job.TYPE === "ROWER_PRZYSPIESZONE_WIDEO_Z_GADANIEM"
      ) {
        await createVideoForRowery_v1(
          job,
          originalVideoPath,
          producedChunkPath,
          chunkFromVideo.trimStart,
          chunkFromVideo.trimEnd,
          format
        );

        // const a = p(f(producedChunkPath).path, "a.MP4");
        // const small = await manipulateVideo_v3(f(producedChunkPath).path, a, 30, 34, { size: "400x?" });
        // const x = await putVideoOnVideoForRovery_v1(f(producedChunkPath).path, producedChunkPath, small, "vid on vid");
      } else {
        await createVideo(
          job,
          originalVideoPath,
          producedChunkPath,
          chunkFromVideo.trimStart,
          chunkFromVideo.trimEnd,
          format
        );
      }
    }

    // VERTICAL VIDEO
    const producedChunkPathVertical = p(f(producedChunkPath).path, "V" + f(producedChunkPath).nameWithExt);
    if (job.CREATE_VERTICAL_CHUNKS) {
      // you can await or go on
      await createVerticalChunksWithDurationLimit(job, producedChunkPath, producedChunkPathVertical, 58, ""); // await
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

      await mergeVideos_v2(video.selectedChunksFromVideoToProduceMergedVideo, video.path);
    }
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
