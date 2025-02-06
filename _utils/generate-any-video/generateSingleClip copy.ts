import { copyFileSync, ensureDirSync, existsSync, readFileSync, writeFileSync, promises } from "fs-extra";
const sharp = require("sharp");
import { getVideoDuration, mergeVideos } from "../ffmpeg";
import { Job } from "../types";
import {
  convertSecondsToYtTimestamp,
  createScreenshot,
  downloadMp3,
  downloadVideoOrPng,
  f,
  log,
  p,
  safeFileName,
  textToSlug160,
} from "../utils";

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
import { t } from "../testy-na-prawo-jazdy/translations";
import { manipulateVideo_v4 } from "../ffmpeg-v4";

type Lang = "pl" | "en" | "de";

export async function createSingleClip(
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
  const MAIN_TEXT_FONT_SIZE = 50;

  const singleTextVideoFullPath = p(CURRENT_EXAM_SUBFOLDER, `${textToSlug160(media + "-" + text)}.mp4`);

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
    ? await downloadVideoOrPng(sourceMediaRemote, dest, silentMp4)
    : await downloadPng(sourceMediaRemote, dest);

  if (!existsSync(sourceMedia)) {
    log("sourceMedia not exist", sourceMedia);
    throw new Error("sourceMedia not exist");
  }

  const imageToSourceVideo = async (sourceVideoOrPng: string): Promise<string> => {
    const resizeSourceMedia = await sharp(readFileSync(sourceVideoOrPng)).resize(WIDTH, HEIGHT).png().toBuffer();
    const resizeSourceMediaPath = p(CURRENT_EXAM_SUBFOLDER, `${textToSlug160(media + "-" + text)}.png`);
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

  const [mainTextPng, widthMainTextPng, heightMainTextPng] = await textToPng_v3(CURRENT_EXAM_SUBFOLDER, `${text}`, {
    maxWidth: (WIDTH / 5) * 3,
    fontSize: MAIN_TEXT_FONT_SIZE / scale,
    lineHeight: (MAIN_TEXT_FONT_SIZE * 1.2) / scale,
    margin: MAIN_TEXT_FONT_SIZE * 0.15,
    bgColor: PNG_BG_COLOR,
    textColor: "white",
  });

  const [transparentPng] = await createTransparentPng(WIDTH, HEIGHT, p(CURRENT_EXAM_SUBFOLDER, "transparent.png"));

  const [finalPng] = await putPngOnPng_v3(
    CURRENT_EXAM_SUBFOLDER,
    mainTextPng,
    transparentPng,
    WIDTH / 5,
    (HEIGHT / 5) * 4 - heightMainTextPng,
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

  const singleFinalVideo = await mergeVideos(videosToMergeForSingleQuestion, singleTextVideoFullPath);

  const singleVideoDuration = await getVideoDuration(singleTextVideoFullPath);

  // CREATE SHORT VIDEO

  if (true) {
    // const bg = await manipulateVideo_v4(
    //   CURRENT_EXAM_SUBFOLDER,
    //   baseVideo,
    //   0,
    //   VIDEO_DURATION_LIMIT,
    //   {
    //     size,
    //     blur: 15,
    //     crop: 10,
    //   },
    //   "bg"
    // );
    // const inner = await manipulateVideo_v4(
    //   CURRENT_EXAM_SUBFOLDER,
    //   baseVideo,
    //   0,
    //   VIDEO_DURATION_LIMIT,
    //   {
    //     size: `${WIDTH / 2}x${HEIGHT / 2}`,
    //     blur: 0,
    //     crop: 0,
    //   },
    //   "inner"
    // );
    // const videoInVideo = await putVideoOnVideo_v3(CURRENT_EXAM_SUBFOLDER, bg, inner, "videoInVideo");
    // const singleFinalVideoVertical = await makeVideoVertical_v3(
    //   CURRENT_EXAM_SUBFOLDER,
    //   videoInVideo,
    //   "videoInVideoVertical"
    // );
    // const questionTextMp3Short = remoteFolderWithMp3 + textToSlug160(text) + ".mp3";
    // const videoInVideoVerticalMp3 = await addMp3ToVideo_v3(
    //   CURRENT_EXAM_SUBFOLDER,
    //   videoInVideoVertical,
    //   questionTextMp3Short,
    //   "__1 short_with_text_mp3"
    // );
    // // SHORT PNGs
    // const [transparentPngShort] = await createTransparentPng(
    //   608,
    //   HEIGHT,
    //   p(CURRENT_EXAM_SUBFOLDER, "__3 transparentShort.png")
    // );
    // const [odwiedzStrone, odwiedzStroneWidth, odwiedzStroneHeight] = await textToPng_v3(
    //   CURRENT_EXAM_SUBFOLDER,
    //   t.zobaczNaszaStrone[lang],
    //   { fontSize: 20, bgColor: "transparent" },
    //   "__0 odwiedzStrone"
    // );
    // const [poznajTesty, poznajTestyWidth, poznajTestyHeight] = await textToPng_v3(
    //   CURRENT_EXAM_SUBFOLDER,
    //   "poznaj-testy.pl",
    //   { fontSize: 30, bgColor: "yellow", lineHeight: 40 },
    //   "__4 poznajTesty"
    // );
    // const [questionTextPNGforShort, questionTextPNGforShortWidth, questionTextPNGforShortHeight] = await textToPng_v3(
    //   CURRENT_EXAM_SUBFOLDER,
    //   `${text}`,
    //   {
    //     maxWidth: 400,
    //     fontSize: 20,
    //     lineHeight: 30,
    //     margin: 10,
    //     bgColor: PNG_BG_COLOR,
    //     textColor: "white",
    //   }
    // );
    // const [png1] = await putPngOnPng_v3(CURRENT_EXAM_SUBFOLDER, odwiedzStrone, transparentPngShort, 50, 50);
    // const [png2] = await putPngOnPng_v3(
    //   CURRENT_EXAM_SUBFOLDER,
    //   poznajTesty,
    //   png1,
    //   50,
    //   50 + poznajTestyHeight,
    //   "__5 pngShort"
    // );
    // const [png3] = await putPngOnPng_v3(
    //   CURRENT_EXAM_SUBFOLDER,
    //   questionTextPNGforShort,
    //   png2,
    //   50,
    //   HEIGHT - questionTextPNGforShortHeight - 300
    // );
    // const shortWithQuestionAndLogo_variant2 = await putPngOnVideo_v3(
    //   CURRENT_EXAM_SUBFOLDER,
    //   videoInVideoVerticalMp3,
    //   png3,
    //   0,
    //   0,
    //   "__6 short_with_question_and_logo"
    // );
    // // const random0_1 = Math.floor(Math.random() * 2);
    // // const shortVideo_variant = random0_1 === 0 ? shortWithQuestionAndLogo_variant1 : shortWithQuestionAndLogo_variant2;
    // const shortVideo_variant = shortWithQuestionAndLogo_variant2; // this is short with text on video
    // const shortWithAnswerAndLogo = await putPngOnVideo_v3(
    //   CURRENT_EXAM_SUBFOLDER,
    //   shortVideo_variant,
    //   png2,
    //   0,
    //   0,
    //   "__7 short_with_answer_and_logo"
    // );
    // const safeFileNameWithId = safeFileName(`${text}`);
    // const shortWithQuestionAndAnswer = await mergeVideos_v2(
    //   [shortVideo_variant, shortWithAnswerAndLogo],
    //   p(CURRENT_EXAM_SUBFOLDER, `__8 ${safeFileNameWithId}.mp4`)
    // );
    // copyFileSync(shortWithQuestionAndAnswer, p(PRODUCED_FOLDER, "_shorts", `${safeFileNameWithId}.mp4`));
  }

  return { video: singleFinalVideo, text, duration: singleVideoDuration };
}
