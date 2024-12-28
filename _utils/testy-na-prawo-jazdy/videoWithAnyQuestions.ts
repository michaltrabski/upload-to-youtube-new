import {
  copy,
  copyFileSync,
  ensureDirSync,
  existsSync,
  readFileSync,
  readJSON,
  readJSONSync,
  writeFileSync,
  writeJsonSync,
} from "fs-extra";
const sharp = require("sharp");
import {
  addMp3ToVideo,
  createPngFromVideoLastFrame,
  getVideoDuration,
  makeVideoVertical,
  manipulateVideo,
  mergeMp3Files,
  mergeVideos,
  pngToVideo,
  putPngOnVideo,
  putVideoOnVideo,
} from "../ffmpeg";
import { DrivingQuestion, Job } from "../types";
import {
  convertSecondsToYtTimestamp,
  createScreenshot,
  downloadVideo,
  f,
  log,
  p,
  safeFileName,
  textToPng,
  textToSlug160,
} from "../utils";
import axios from "axios";
import { difficultQuestionsDB } from "./difficultQuestionsDB";

import { examsB } from "./exams-b";
import { ExamData, ExamDataObj } from "./data/types";
import { createPngWithText, createTransparentPng, overlayPng } from "../jimp";
import { manipulateVideo_v2, mergeVideos_v2, putPngOnVideo_v2, textToPng_v2 } from "../ffmpeg-v2";
import { overlayPng_v2 } from "../jimp_v2";

interface Question {
  id: string; // Changed to string to allow any ID
  correct: number; // Changed to number to allow any count of correct answers
  wrong: number; // Changed to number to allow any count of wrong answers
  slug: string; // Changed to string to allow any slug
  isActive: boolean; // Changed to boolean to allow true/false
  text: string; // Changed to string to allow any question text
  a: string; // Changed to string to allow any answer text
  b: string; // Changed to string to allow any answer text
  c: string; // Changed to string to allow any answer text
  r: string; // Changed to string to allow any response
  media: string; // Changed to string to allow any media file
  categories: string[]; // Changed to string[] to allow any categories
  score: number; // Changed to number to allow any score
  answerBecause: string; // Changed to string to allow any explanation
}

export const createVideoWithAnyExamQuestions = async (
  job: Job,
  endpoint: string,
  limit: number,
  introVideoUrl: string
) => {
  const response = await axios.get(endpoint);

  const drivingQuestionsLimited = (response.data as Question[])
    .filter((q) => q.answerBecause)
    .slice(0, limit)
    .sort(() => Math.random() - 0.5);

  const { BASE_DIR, BASE_FOLDER } = job;
  const pb = (path: string) => p(BASE_FOLDER, path);
  const PRODUCED_FOLDER = `${BASE_FOLDER}_PRODUCED`;
  ensureDirSync(BASE_FOLDER);
  ensureDirSync(PRODUCED_FOLDER);

  const scale = 1;
  const WIDTH = 1920 / scale;
  const HEIGHT = 1080 / scale;
  const VIDEO_DURATION_LIMIT = 99999999;
  const GAP = 20;
  const PNG_BG_COLOR = "rgb(71 85 105)";
  const PNG_BG_COLOR_GREEN = "#15803d";

  const size = `${WIDTH}x${HEIGHT}`;

  const videoPath = p(BASE_DIR, "_ignore_files");
  const audioPath = "https://hosting2421517.online.pro/testy-na-prawo-jazdy/mp3/";
  const mp3_1000 = p(BASE_DIR, "_silent_mp3", "1000.mp3");
  const mp4_1000 = p(BASE_DIR, "_silent_mp3", "1000.mp4");
  const blankPng = p(BASE_DIR, "_silent_mp3", "blank.png");

  const downloadedIntroVideo = await downloadVideo(introVideoUrl, pb("introVideo.mp4"), mp4_1000);

  const introVideo = await manipulateVideo_v2(downloadedIntroVideo, 0, VIDEO_DURATION_LIMIT, {
    size,
    blur: 0,
    crop: 0,
    fps: 29.97,
  });

  let i = 0;
  const examVideosPaths: string[] = [];
  const videos: string[] = [];

  for (const drivingQuestion of drivingQuestionsLimited) {
    i++;

    const video = await createSingleQuestionVideo(
      job,
      drivingQuestion,
      i,
      videoPath,
      blankPng,
      mp4_1000,
      WIDTH,
      HEIGHT,
      GAP,
      PNG_BG_COLOR,
      PNG_BG_COLOR_GREEN,
      scale,
      size,
      audioPath,
      mp3_1000,
      examVideosPaths,
      VIDEO_DURATION_LIMIT,
      pb
    );

    videos.push(video);
    copyFileSync(video, p(PRODUCED_FOLDER, f(video).nameWithExt));
  }

  const videosWithAdds = [introVideo, ...videos];

  // const examVideo = await mergeVideos_v2(videosWithAdds, pb(`all_questions_merged_${Math.random()}.mp4`));
  const examVideo = await mergeVideos_v2(videosWithAdds, pb(`aaa.mp4`));
  const producedVideoPath = p(PRODUCED_FOLDER, f(examVideo).nameWithExt);
  copyFileSync(examVideo, producedVideoPath);

  const pointsInTime = [
    ...[...Array(10)].map((_, i) => `00:0${i}:00`), // 00:00:00 - 00:09:00
    ...[...Array(10)].map((_, i) => `00:${10 + i}:00`), // 00:10:00 - 00:19:00
  ];

  for (const pointInTime of pointsInTime) {
    await createScreenshot(producedVideoPath, f(producedVideoPath).path, pointInTime);
  }
};

async function createSingleQuestionVideo(
  job: Job,
  drivingQuestion: any,
  i: number,
  videoPath: string,
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
  examVideosPaths: string[],
  VIDEO_DURATION_LIMIT: number,
  pb: (path: string) => string
): Promise<string> {
  const { id, media, text, r, a, b, c } = drivingQuestion;
  const singleQuestionVideo = pb(`${id}.mp4`);

  if (existsSync(singleQuestionVideo)) {
    return singleQuestionVideo;
  }

  let questionText = text;
  if (r !== "t" && r !== "n") questionText = `${text} ${a} ${b} ${c}`;

  const questionTextMp3 = remoteFolderWithMp3 + textToSlug160(questionText) + ".mp3";

  let answerText = "";
  if (r === "t") answerText = "odpowiedź tak";
  if (r === "n") answerText = "odpowiedź nie";
  if (r === "a") answerText = `odpowiedź a ${a}`;
  if (r === "b") answerText = `odpowiedź b ${b}`;
  if (r === "c") answerText = `odpowiedź c ${c}`;

  const correctAnswerMp3 = remoteFolderWithMp3 + textToSlug160(drivingQuestion.answerBecause) + ".mp3";

  const isVideo = media.includes(".mp4");

  const sourceMedia = p(videoPath, media || blankPng);

  if (!existsSync(sourceMedia)) {
    log("sourceMedia not exist", sourceMedia);
    throw new Error("sourceMedia not exist");
  }

  const imageToSourceVideo = async (): Promise<string> => {
    const resizeSourceMedia = await sharp(readFileSync(sourceMedia)).resize(WIDTH, HEIGHT).png().toBuffer();
    const resizeSourceMediaPath = pb(`${id}_resizeSourceMedia.png`);
    writeFileSync(resizeSourceMediaPath, resizeSourceMedia);

    const mp4_1000Resized = await manipulateVideo_v2(mp4_1000, 0, VIDEO_DURATION_LIMIT, {
      size,
    });

    const sourceMediaPngConvertedToVideo = await putPngOnVideo_v2(mp4_1000Resized, resizeSourceMediaPath);

    return sourceMediaPngConvertedToVideo;
  };

  const baseVideo = await manipulateVideo_v2(
    isVideo ? sourceMedia : await imageToSourceVideo(),
    0,
    VIDEO_DURATION_LIMIT,
    {
      size,
      blur: 0,
      crop: 0,
    }
  );

  // PNGs
  const [logo, logoWidth, logoHeight] = await textToPng_v2(job, "poznaj-testy.pl", {
    maxWidth: 250,
    fontSize: 35 / scale,
    lineHeight: 40 / scale,
    margin: 10,
    bgColor: "transparent", // "#475569", // slate 600
    textColor: "black",
  });

  const questionTextPngPromise = textToPng(`${text}`, pb(`${i}___question_text.png`), {
    maxWidth: WIDTH - 2 * GAP,
    fontSize: 50 / scale,
    lineHeight: 60 / scale,
    margin: 10,
    bgColor: PNG_BG_COLOR,
    textColor: "white",
  });

  const answerYesPngPromise = textToPng("Tak", pb(`answer_yes.png`), {
    maxWidth: 100,
    fontSize: 50 / scale,
    lineHeight: 60 / scale,
    margin: 10,
    bgColor: PNG_BG_COLOR,
    textColor: "white",
  });

  const answerYesGreenPromise = textToPng("Tak", pb(`answer_yes_green.png`), {
    maxWidth: 100,
    fontSize: 50 / scale,
    lineHeight: 60 / scale,
    margin: 10,
    bgColor: PNG_BG_COLOR_GREEN,
    textColor: "white",
  });

  const answerNoPngPromise = textToPng("Nie", pb(`answer_no.png`), {
    maxWidth: 100,
    fontSize: 50 / scale,
    lineHeight: 60 / scale,
    margin: 10,
    bgColor: PNG_BG_COLOR,
    textColor: "white",
  });

  const answerNoGreenPngPromise = textToPng("Nie", pb(`answer_no_green.png`), {
    maxWidth: 100,
    fontSize: 50 / scale,
    lineHeight: 60 / scale,
    margin: 10,
    bgColor: PNG_BG_COLOR_GREEN,
    textColor: "white",
  });

  const answerAPngPromise = textToPng(`A) ${a}`, pb(`${id}_answer_a.png`), {
    maxWidth: WIDTH - 2 * GAP,
    fontSize: 50 / scale,
    lineHeight: 60 / scale,
    margin: 10,
    bgColor: PNG_BG_COLOR,
    textColor: "white",
  });

  const answerAPngGreenPromise = textToPng(`A) ${a}`, pb(`${id}_answer_a_green.png`), {
    maxWidth: WIDTH - 2 * GAP,
    fontSize: 50 / scale,
    lineHeight: 60 / scale,
    margin: 10,
    bgColor: PNG_BG_COLOR_GREEN,
    textColor: "white",
  });

  const answerBPngPromise = textToPng(`B) ${b}`, pb(`${id}_answer_b.png`), {
    maxWidth: WIDTH - 2 * GAP,
    fontSize: 50 / scale,
    lineHeight: 60 / scale,
    margin: 10,
    bgColor: PNG_BG_COLOR,
    textColor: "white",
  });

  const answerBPngGreenPromise = textToPng(`B) ${b}`, pb(`${id}_answer_b_green.png`), {
    maxWidth: WIDTH - 2 * GAP,
    fontSize: 50 / scale,
    lineHeight: 60 / scale,
    margin: 10,
    bgColor: PNG_BG_COLOR_GREEN,
    textColor: "white",
  });

  const answerCPngPromise = textToPng(`C) ${c}`, pb(`${id}_answer_c.png`), {
    maxWidth: WIDTH - 2 * GAP,
    fontSize: 50 / scale,
    lineHeight: 60 / scale,
    margin: 10,
    bgColor: PNG_BG_COLOR,
    textColor: "white",
  });

  const answerCPngGreenPromise = textToPng(`C) ${c}`, pb(`${id}_answer_c_green.png`), {
    maxWidth: WIDTH - 2 * GAP,
    fontSize: 50 / scale,
    lineHeight: 60 / scale,
    margin: 10,
    bgColor: PNG_BG_COLOR_GREEN,
    textColor: "white",
  });

  const transparentPngPromise = createTransparentPng(WIDTH, HEIGHT, pb("transparent.png"));

  const [
    [questionTextAsPng, widthQuestionTextPng, heightQuestionTextPng],
    [answerYes, widthYes, heightYes],
    [answerYesGreen, widthYesGreen, heightYesGreen],
    [answerNo, widthNo, heightNo],
    [answerNoGreen, widthNoGreen, heightNoGreen],
    [answerA, widthA, heightA],
    [answerAGreen, widthAGreen, heightAGreen],
    [answerB, widthB, heightB],
    [answerBGreen, widthBGreen, heightBGreen],
    [answerC, widthC, heightC],
    [answerCGreen, widthCGreen, heightCGreen],
    [transparentPng, w, h],
  ] = await Promise.all([
    questionTextPngPromise,
    answerYesPngPromise,
    answerYesGreenPromise,
    answerNoPngPromise,
    answerNoGreenPngPromise,
    answerAPngPromise,
    answerAPngGreenPromise,
    answerBPngPromise,
    answerBPngGreenPromise,
    answerCPngPromise,
    answerCPngGreenPromise,
    transparentPngPromise,
  ]);

  const answerA_X = (w - widthB) / 2;
  const answerA_Y = h - (heightA + heightB + heightC) - GAP;
  const [transparentPngAndAnswerA] = await overlayPng(
    answerA,
    transparentPng,
    pb(`${id}_transparent_png_with_answer_a.png`),
    answerA_X,
    answerA_Y
  );

  const answerB_X = (w - widthB) / 2;
  const answerB_Y = h - (heightB + heightC) - GAP;
  const [transparentPngAndAnswerB] = await overlayPng(
    answerB,
    transparentPngAndAnswerA,
    pb(`${id}_transparent_png_with_answer_b.png`),
    answerB_X,
    answerB_Y
  );

  const answerC_X = (w - widthC) / 2;
  const answerC_Y = h - heightC - GAP;
  const [transparentPngAndAnswerC] = await overlayPng(
    answerC,
    transparentPngAndAnswerB,
    pb(`${id}_transparent_png_with_answer_c.png`),
    answerC_X,
    answerC_Y
  );

  const [transparentPngAndAnswersABCandQuestionText] = await overlayPng(
    questionTextAsPng,
    transparentPngAndAnswerC,
    pb(`${i}__transparent_png_with_answers_abc_and_question_text.png`),
    (w - widthQuestionTextPng) / 2,
    h - (heightA + heightB + heightC + heightQuestionTextPng) - GAP
  );

  const [transparentPngAndAnswersABCandQuestionTextAndLogo] = await overlayPng(
    logo,
    transparentPngAndAnswersABCandQuestionText,
    pb(`${i}__transparent_png_with_answers_abc_and_question_text_and_logo.png`),
    (w - logoWidth) / 2,
    20
  );

  const answerYes_X = (w - widthYes - 150) / 2;
  const answerYes_Y = h - heightYes - GAP;
  const [transparentPngAndAnswersYes] = await overlayPng(
    answerYes,
    transparentPng,
    pb(`${id}_transparent_png_with_answer_yes.png`),
    answerYes_X,
    answerYes_Y
  );

  const answerNo_X = (w - widthYes + 150) / 2;
  const answerNo_Y = h - heightNo - GAP;
  const [transparentPngAndAnswersYesNo] = await overlayPng(
    answerNo,
    transparentPngAndAnswersYes,
    pb("transparent_png_with_answer_yes_no.png"),
    answerNo_X,
    answerNo_Y
  );

  const [transparentPngAndAnswersYesNoAndQuestionText] = await overlayPng(
    questionTextAsPng,
    transparentPngAndAnswersYesNo,
    pb(`${i}__transparent_png_with_answers_yes_no_and_question_text.png`),
    (w - widthQuestionTextPng) / 2,
    h - (heightYes + GAP + heightQuestionTextPng) - GAP
  );

  const [transparentPngAndAnswersYesNoAndQuestionTextAndLogo] = await overlayPng(
    logo,
    transparentPngAndAnswersYesNoAndQuestionText,
    pb(`${i}__transparent_png_with_answers_yes_no_and_question_text_and_logo.png`),
    (w - logoWidth) / 2,
    20
  );

  const [transparentPngAndAnswersYesNoAndQuestionTextAndLogo_CorrectAnswer] = await overlayPng_v2(
    job,
    "",
    r === "t" ? answerYesGreen : answerNoGreen,
    transparentPngAndAnswersYesNoAndQuestionTextAndLogo,
    r === "t" ? (w - widthYes - 150) / 2 : (w - widthNo + 150) / 2,
    r === "t" ? h - heightYes - GAP : h - heightNo - GAP
  );

  const baseVideoWithPngTextAndLogo = await putPngOnVideo(
    baseVideo,
    a ? transparentPngAndAnswersABCandQuestionTextAndLogo : transparentPngAndAnswersYesNoAndQuestionTextAndLogo,
    pb(`${i}__base_video_with_png_text_and_answers_and_logo.mp4`),
    0,
    0
  );

  const baseVideoWithPngTextAndLogoAndMp3 = await addMp3ToVideo(
    baseVideoWithPngTextAndLogo,
    questionTextMp3,
    pb(`_${i}___step1_base_video_with_png_text_and_answers_and_logo_and_mp3.mp4`)
  );

  const duration = await getVideoDuration(baseVideoWithPngTextAndLogoAndMp3);

  const lastFrameWidthTextAndAnswersAndLogo = await manipulateVideo(
    baseVideoWithPngTextAndLogo,
    pb(`${i}__last_frame_width_text_and_answers_and_logo.mp4`),
    duration - 0.05,
    duration,
    {
      size,
      blur: 0,
      crop: 0,
    }
  );

  const lastFrameWidthTextAndAnswersAndLogo_1s = await addMp3ToVideo(
    lastFrameWidthTextAndAnswersAndLogo,
    mp3_1000,
    pb(`_${i}___step2_last_frame_width_text_and_answers_and_logo_1s.mp4`)
  );

  const lastFrameWidthTextAndAnswersAndLogo_1s_CorrectAnswer = await putPngOnVideo(
    lastFrameWidthTextAndAnswersAndLogo_1s,
    r === "t"
      ? answerYesGreen
      : r === "n"
      ? answerNoGreen
      : r === "a"
      ? answerAGreen
      : r === "b"
      ? answerBGreen
      : answerCGreen,
    pb(`_${i}___step3_last_frame_width_text_and_answers_and_logo_1s_correct.mp4`),
    r === "t" ? answerYes_X : r === "n" ? answerNo_X : r === "a" ? answerA_X : r === "b" ? answerB_X : answerC_X,
    r === "t" ? answerYes_Y : r === "n" ? answerNo_Y : r === "a" ? answerA_Y : r === "b" ? answerB_Y : answerC_Y
  );

  const lastFrameWidthTextAndLogoAndAnswer = await addMp3ToVideo(
    lastFrameWidthTextAndAnswersAndLogo,
    correctAnswerMp3,
    pb(`_${i}___step4_last_frame_width_text_and_logo_and_answer.mp4`)
  );

  // michal
  const lastFrameWidthTextAndLogoAndAnswer_CorrectAnswer = await putPngOnVideo(
    lastFrameWidthTextAndLogoAndAnswer,
    r === "t"
      ? answerYesGreen
      : r === "n"
      ? answerNoGreen
      : r === "a"
      ? answerAGreen
      : r === "b"
      ? answerBGreen
      : answerCGreen,
    pb(`_${i}___step5_last_frame_width_text_and_logo_and_answer_correct.mp4`),
    r === "t" ? answerYes_X : r === "n" ? answerNo_X : r === "a" ? answerA_X : r === "b" ? answerB_X : answerC_X,
    r === "t" ? answerYes_Y : r === "n" ? answerNo_Y : r === "a" ? answerA_Y : r === "b" ? answerB_Y : answerC_Y
  );

  const videosToMergeForSingleQuestion = [
    baseVideoWithPngTextAndLogoAndMp3,
    lastFrameWidthTextAndAnswersAndLogo_1s,
    // lastFrameWidthTextAndAnswersAndLogo_1s,
    lastFrameWidthTextAndLogoAndAnswer_CorrectAnswer,
    lastFrameWidthTextAndAnswersAndLogo_1s_CorrectAnswer,
    // lastFrameWidthTextAndAnswersAndLogo_1s_CorrectAnswer,
  ];

  const singleQuestion = await mergeVideos_v2(videosToMergeForSingleQuestion, singleQuestionVideo);

  return singleQuestion;
}
