import { copyFileSync, ensureDirSync, existsSync, readFileSync, writeFileSync, promises } from "fs-extra";
const sharp = require("sharp");
import { getVideoDuration, mergeVideos } from "../ffmpeg";
import { Job } from "../types";
import {
  convertSecondsToYtTimestamp,
  createScreenshot,
  downloadMp3,
  downloadVideo,
  f,
  log,
  p,
  safeFileName,
  textToSlug160,
} from "../utils";

import { ExamData } from "./data/types";
import { createTransparentPng } from "../jimp";
import { manipulateVideo_v2, mergeVideos_v2 } from "../ffmpeg-v2";

import {
  addMp3ToVideo_v3,
  makeVideoVertical_v3,
  manipulateVideo_v3,
  putPngOnPng_v3,
  putPngOnVideo_v3,
  putVideoOnVideo_v3,
  textToPng_v3,
  trimVideo_v3,
} from "../ffmpeg-v3";
import { t } from "./translations";

type Lang = "pl" | "en" | "de";

export async function createSingleTextVideo(
  CURRENT_EXAM_SUBFOLDER: string,
  text: string,
  media: string,
  remoteFolderWithMp4: string,
  blankPng: string,
  mp4_1000: string,
  WIDTH: number,
  HEIGHT: number,
  GAP: number,
  PNG_BG_COLOR: string,
  PNG_BG_COLOR_GREEN: string,
  scale: number,
  size: string,
  remoteFolderWithMp3: string,
  mp3_1000: string,
  VIDEO_DURATION_LIMIT: number,
  PRODUCED_FOLDER: string,
  lang: Lang
): Promise<{ video: string; text: string; duration: number }> {
  const singleTextVideoFullPath = p(CURRENT_EXAM_SUBFOLDER, `${safeFileName(media + text)}.mp4`);

  if (existsSync(singleTextVideoFullPath)) {
    const singleTextVideoDuration = await getVideoDuration(singleTextVideoFullPath);
    return { video: singleTextVideoFullPath, text, duration: singleTextVideoDuration };
  }

  const silentMp3 = p(__dirname, "../", "../", "_silent_mp3", "1000.mp3");
  const singleTextMp3FileName = textToSlug160(text) + ".mp3";
  const singleTextMp3 = await downloadMp3(
    remoteFolderWithMp3 + singleTextMp3FileName,
    p(CURRENT_EXAM_SUBFOLDER, singleTextMp3FileName),
    silentMp3
  );

  const downloadPng = async (sourceMediaRemote: string, dest: string) => {
    const response = await fetch(sourceMediaRemote);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    await promises.writeFile(dest, Buffer.from(buffer));
    return dest;
  };

  const isVideo = media.includes(".mp4");
  const sourceMediaRemote = remoteFolderWithMp4 + media;
  const silentMp4 = p(__dirname, "../", "../", "_silent_mp3", "1000.mp4");
  const dest = p(CURRENT_EXAM_SUBFOLDER, media);

  const sourceMedia = isVideo
    ? await downloadVideo(sourceMediaRemote, dest, silentMp4)
    : await downloadPng(sourceMediaRemote, dest);

  if (!existsSync(sourceMedia)) {
    log("sourceMedia not exist", sourceMedia);
    throw new Error("sourceMedia not exist");
  }

  const imageToSourceVideo = async (sourceVideoOrPng: string): Promise<string> => {
    const resizeSourceMedia = await sharp(readFileSync(sourceVideoOrPng)).resize(WIDTH, HEIGHT).png().toBuffer();
    const resizeSourceMediaPath = p(CURRENT_EXAM_SUBFOLDER, `${safeFileName(media + text)}.png`);
    writeFileSync(resizeSourceMediaPath, resizeSourceMedia);

    const mp4_1000Resized = await manipulateVideo_v2(mp4_1000, 0, VIDEO_DURATION_LIMIT, {
      size,
    });

    const sourceMediaPngConvertedToVideo = await putPngOnVideo_v3(
      CURRENT_EXAM_SUBFOLDER,
      mp4_1000Resized,
      resizeSourceMediaPath
    );

    return sourceMediaPngConvertedToVideo;
  };

  const baseVideo = await manipulateVideo_v2(
    isVideo ? sourceMedia : await imageToSourceVideo(sourceMedia),
    0,
    VIDEO_DURATION_LIMIT,
    {
      size,
      blur: 0,
      crop: 0,
    }
  );

  // PNGs
  const [zobaczNaszaStrone, zobaczNaszaStroneWidth] = await textToPng_v3(
    CURRENT_EXAM_SUBFOLDER,
    t.zobaczNaszaStrone[lang],
    {
      maxWidth: 460,
      fontSize: 45 / scale,
      lineHeight: 50 / scale,
      margin: 10,
      bgColor: "#0000007d", // "#475569", // slate 600
      textColor: "orange",
    }
  );

  const [logo, logoWidth, logoHeight] = await textToPng_v3(CURRENT_EXAM_SUBFOLDER, "poznaj-testy.pl", {
    maxWidth: 320,
    fontSize: 45 / scale,
    lineHeight: 50 / scale,
    margin: 10,
    bgColor: "#ffffffcf", // "#475569", // slate 600
    textColor: "black",
  });

  const [questionTextAsPng, widthQuestionTextPng, heightQuestionTextPng] = await textToPng_v3(
    CURRENT_EXAM_SUBFOLDER,
    `${text}`,
    {
      maxWidth: (WIDTH / 5) * 3,
      fontSize: 50 / scale,
      lineHeight: 60 / scale,
      margin: 10,
      bgColor: PNG_BG_COLOR,
      textColor: "white",
    }
  );

  const [transparentPng, widthTransparentPng, heightTransparentPng] = await createTransparentPng(
    WIDTH,
    HEIGHT,
    p(CURRENT_EXAM_SUBFOLDER, "transparent.png")
  );

  const [finalPng] = await putPngOnPng_v3(
    CURRENT_EXAM_SUBFOLDER,
    questionTextAsPng,
    transparentPng,
    WIDTH / 5,
    (HEIGHT / 5) * 4 - heightQuestionTextPng,
    "finalPng"
  );

  const baseVideoWithPngTextAndLogo = await putPngOnVideo_v3(CURRENT_EXAM_SUBFOLDER, baseVideo, finalPng, 0, 0);

  const baseVideoWithPngTextAndLogoAndMp3 = await addMp3ToVideo_v3(
    CURRENT_EXAM_SUBFOLDER,
    baseVideoWithPngTextAndLogo,
    singleTextMp3,
    "baseVideoWithPngTextAndLogoAndMp3"
  );

  const baseVideoWithPngTextAndLogoAndMp3Trimmed = await trimVideo_v3(
    CURRENT_EXAM_SUBFOLDER,
    baseVideoWithPngTextAndLogoAndMp3,
    0,
    0.5,
    "baseVideoWithPngTextAndLogoAndMp3_trimmed"
  );

  const videosToMergeForSingleQuestion = [
    baseVideoWithPngTextAndLogoAndMp3Trimmed,
    // lastFrameWidthTextAndAnswersAndLogo_1s,
    // lastFrameWidthTextAndAnswersAndLogo_1s,
    // lastFrameWidthTextAndLogoAndAnswer_CorrectAnswer,
    // lastFrameWidthTextAndAnswersAndLogo_1s_CorrectAnswer,
    // lastFrameWidthTextAndAnswersAndLogo_1s_CorrectAnswer,
  ];

  const singleQuestion = await mergeVideos(videosToMergeForSingleQuestion, singleTextVideoFullPath);

  const singleVideoDuration = await getVideoDuration(singleTextVideoFullPath);

  return { video: singleQuestion, text, duration: singleVideoDuration };
}
