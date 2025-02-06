const sharp = require("sharp");

import {
  copyFileSync,
  ensureDirSync,
  existsSync,
  readFileSync,
  readJsonSync,
  writeFileSync,
  writeJsonSync,
} from "fs-extra";

import { ArticleData } from "../../types";

import { getVideoDuration, getVideoDurationInMiliseconds, mergeVideos } from "../ffmpeg";
import { Job } from "../types";
import { convertSecondsToYtTimestamp, createScreenshot, f, log, p, safeFileName, textToSlug160 } from "../utils";
import { createTransparentPng } from "../jimp";
import { mergeVideos_v2 } from "../ffmpeg-v2";
import {
  addMp3ToVideo_v3,
  makeVideoVertical_v3,
  putPngOnPng_v3,
  putPngOnVideo_v3,
  putVideoOnVideo_v3,
  textToPng_v3,
} from "../ffmpeg-v3";

import { manipulateVideo_v4 } from "../ffmpeg-v4";
import { createSingleClip } from "./generateSingleClip";
import { t } from "../testy-na-prawo-jazdy/translations";
import { ExamData } from "../testy-na-prawo-jazdy/data/types";

type Lang = "pl" | "en" | "de";

export const generateAnyVideo = async (
  job: Job,
  lang: Lang,
  generatedVideoName: string,
  articleData: ArticleData[]
): Promise<void> => {
  const scale = 1;
  const WIDTH = 1920 / scale;
  const HEIGHT = 1080 / scale;
  const VIDEO_DURATION_LIMIT = 99999999;
  const GAP = 20;
  const PNG_BG_COLOR = "rgb(71 85 105)";
  const PNG_BG_COLOR_GREEN = "#15803d";

  const { BASE_DIR, BASE_FOLDER } = job;
  const pb = (path: string) => p(BASE_FOLDER, path);
  const CURRENT_EXAM_SUBFOLDER = pb(textToSlug160(generatedVideoName));
  const PRODUCED_FOLDER = `${BASE_FOLDER}_PRODUCED`;
  ensureDirSync(BASE_FOLDER);
  ensureDirSync(CURRENT_EXAM_SUBFOLDER);
  ensureDirSync(PRODUCED_FOLDER);
  ensureDirSync(`${PRODUCED_FOLDER}/_shorts`);

  const size = `${WIDTH}x${HEIGHT}`;

  let remoteFolderWithMp3 = "https://hosting2421517.online.pro/generate-any-video/";

  const mp3_1000 = p(BASE_DIR, "_silent_mp3", "1000.mp3");
  const mp4_1000 = p(BASE_DIR, "_silent_mp3", "1000.mp4");
  const blankPng = p(BASE_DIR, "_silent_mp3", "blank.png");

  const videos: string[] = [];
  const texts: string[] = [];
  const durations: number[] = [];

  for (const { tekst, imagePromptInEn, media } of articleData) {
    const myText = tekst;
    const _media = imagePromptInEn ? textToSlug160(imagePromptInEn) + ".png" : media || "blank.png";

    const { video, text, duration } = await createSingleClip(
      CURRENT_EXAM_SUBFOLDER,
      myText, // to przykładowy text
      _media,
      "https://hosting2421517.online.pro/generate-any-video/",
      blankPng,
      mp4_1000,
      WIDTH,
      HEIGHT,
      GAP,
      PNG_BG_COLOR,
      PNG_BG_COLOR_GREEN,
      scale,
      size,
      remoteFolderWithMp3,
      mp3_1000,
      VIDEO_DURATION_LIMIT,
      PRODUCED_FOLDER,
      lang
    );

    videos.push(video);
    texts.push(text);
    durations.push(duration);
  }

  const timestampsArr = texts.map((text, i) => ({
    text,
    duration: durations[i],
    timestamp: convertSecondsToYtTimestamp(durations.slice(0, i + 1).reduce((a, b) => a + b, -durations[i])),
  }));

  let timestampsText = `\n`;
  let ii = 0;
  for (const timestamp of timestampsArr) {
    ii++;
    timestampsText += `${timestamp.timestamp} ${ii}. ${timestamp.text}\n\n`;
  }

  const timestampFile = p(CURRENT_EXAM_SUBFOLDER, `${textToSlug160(generatedVideoName)}.txt`);
  writeFileSync(timestampFile, timestampsText);
  copyFileSync(timestampFile, p(PRODUCED_FOLDER, f(timestampFile).nameWithExt));

  const videosWithAdds = [...videos];

  const examVideo = await mergeVideos_v2(
    videosWithAdds,
    p(CURRENT_EXAM_SUBFOLDER, `${textToSlug160(generatedVideoName)}.mp4`)
  );

  const producedVideoPath = p(PRODUCED_FOLDER, f(examVideo).nameWithExt);
  copyFileSync(examVideo, producedVideoPath);

  if (false) {
    const pointsInTime = [...[...Array(3)].map((_, i) => `00:00:0${i * 3 + 4}`)];
    for (const pointInTime of pointsInTime) {
      await createScreenshot(producedVideoPath, f(producedVideoPath).path, pointInTime);
    }
  }

  // CREATE SHORT VIDEO
  if (true) {
    const bg = await manipulateVideo_v4(
      CURRENT_EXAM_SUBFOLDER,
      producedVideoPath,
      0,
      VIDEO_DURATION_LIMIT,
      {
        size,
        blur: 15,
        crop: 10,
      },
      "bg"
    );

    const inner = await manipulateVideo_v4(
      CURRENT_EXAM_SUBFOLDER,
      producedVideoPath,
      0,
      VIDEO_DURATION_LIMIT,
      {
        size: `${WIDTH / 2}x${HEIGHT / 2}`,
        blur: 0,
        crop: 0,
      },
      "inner"
    );

    const videoInVideo = await putVideoOnVideo_v3(CURRENT_EXAM_SUBFOLDER, bg, inner, "videoInVideo");

    const singleFinalVideoVertical = await makeVideoVertical_v3(
      CURRENT_EXAM_SUBFOLDER,
      videoInVideo,
      "videoInVideoVertical"
    );

    copyFileSync(singleFinalVideoVertical, p(PRODUCED_FOLDER, f(singleFinalVideoVertical).nameWithExt));
  }
};
