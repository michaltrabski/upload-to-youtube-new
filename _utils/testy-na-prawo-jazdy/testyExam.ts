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
import {
  addMp3ToVideo_v3,
  makeVideoVertical_v3,
  manipulateVideo_v3,
  putPngOnPng_v3,
  putPngOnVideo_v3,
  putVideoOnVideo_v3,
  textToPng_v3,
} from "../ffmpeg-v3";

export const createExam = async (job: Job, examIndex: number, exams: ExamData[]): Promise<number> => {
  const scale = 1;
  const WIDTH = 1920 / scale;
  const HEIGHT = 1080 / scale;
  const VIDEO_DURATION_LIMIT = 99999999;
  const GAP = 20;
  const PNG_BG_COLOR = "rgb(71 85 105)";
  const PNG_BG_COLOR_GREEN = "#15803d";
  const LIMIT = 99999999;

  // const scale = 1;
  // const WIDTH = 1920 / scale;
  // const HEIGHT = 1080 / scale;
  // const VIDEO_DURATION_LIMIT = 1;
  // const GAP = 20;
  // const PNG_BG_COLOR = "rgb(71 85 105)";
  // const PNG_BG_COLOR_GREEN = "#15803d";
  // const LIMIT = 14;

  const currentExam = exams[examIndex];
  const { examQuestions32, examSlug } = currentExam;

  const examQuestions32Limited = examQuestions32.slice(0, LIMIT); // .slice(18, 25);

  const { BASE_DIR, BASE_FOLDER } = job;
  const pb = (path: string) => p(BASE_FOLDER, path);
  const CURRENT_EXAM_SUBFOLDER = pb(examSlug);
  const PRODUCED_FOLDER = `${BASE_FOLDER}_PRODUCED`;
  ensureDirSync(BASE_FOLDER);
  ensureDirSync(CURRENT_EXAM_SUBFOLDER);
  ensureDirSync(PRODUCED_FOLDER);
  ensureDirSync(`${PRODUCED_FOLDER}/_shorts`);

  console.log("examQuestions32Limited", { ...currentExam, examQuestions32: [] });

  const size = `${WIDTH}x${HEIGHT}`;

  const videoPath = p(BASE_DIR, "_ignore_files");
  const audioPath = "https://hosting2421517.online.pro/testy-na-prawo-jazdy/mp3/";
  const mp3_1000 = p(BASE_DIR, "_silent_mp3", "1000.mp3");
  const mp4_1000 = p(BASE_DIR, "_silent_mp3", "1000.mp4");
  const blankPng = p(BASE_DIR, "_silent_mp3", "blank.png");

  // const downloadedIntroVideo = await downloadVideo(introVideoUrl, pb("introVideo.mp4"));

  // const introVideo = await manipulateVideo_v2(downloadedIntroVideo, 0, VIDEO_DURATION_LIMIT, {
  //   size,
  //   blur: 0,
  //   crop: 0,
  //   fps: 29.97,
  // });

  let i = 0;
  const examVideosPaths: string[] = [];
  const videos: string[] = [];
  const texts: string[] = [];
  const durations: number[] = [];

  for (const drivingQuestion of examQuestions32Limited) {
    i++;

    const { video, text, duration } = await createSingleQuestionVideo(
      job,
      CURRENT_EXAM_SUBFOLDER,
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
      pb,
      PRODUCED_FOLDER,
      BASE_DIR
    );

    videos.push(video);
    texts.push(text);
    durations.push(duration);

    copyFileSync(video, p(PRODUCED_FOLDER, f(video).nameWithExt));
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

  const timestampFile = p(CURRENT_EXAM_SUBFOLDER, `${examSlug}.txt`);
  writeFileSync(timestampFile, timestampsText);
  copyFileSync(timestampFile, p(PRODUCED_FOLDER, f(timestampFile).nameWithExt));

  const videosWithAdds = [...videos];

  // const examVideo = await mergeVideos_v2(videosWithAdds, pb(`all_questions_merged_${Math.random()}.mp4`));
  const examVideo = await mergeVideos_v2(videosWithAdds, p(CURRENT_EXAM_SUBFOLDER, `${examSlug}.mp4`));

  const producedVideoPath = p(PRODUCED_FOLDER, f(examVideo).nameWithExt);
  copyFileSync(examVideo, producedVideoPath);

  const pointsInTime = [
    ...[...Array(3)].map((_, i) => `00:00:0${i * 3 + 4}`),
    // ...[...Array(10)].map((_, i) => `00:0${i}:00`), // 00:00:00 - 00:09:00
    // ...[...Array(10)].map((_, i) => `00:${10 + i}:00`), // 00:10:00 - 00:19:00
  ];

  for (const pointInTime of pointsInTime) {
    await createScreenshot(producedVideoPath, f(producedVideoPath).path, pointInTime);
  }

  return examIndex;
};

async function createSingleQuestionVideo(
  job: Job,
  CURRENT_EXAM_SUBFOLDER: string,
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
  pb: (path: string) => string,
  PRODUCED_FOLDER: string,
  BASE_DIR: string
): Promise<{ video: string; text: string; duration: number }> {
  const { id, media, text, r, a, b, c } = drivingQuestion;
  const singleQuestionVideo = p(CURRENT_EXAM_SUBFOLDER, `${id}_${i}.mp4`);

  if (existsSync(singleQuestionVideo)) {
    const singleVideoDuration = await getVideoDuration(singleQuestionVideo);
    return { video: singleQuestionVideo, text, duration: singleVideoDuration };
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

  const correctAnswerMp3 = remoteFolderWithMp3 + textToSlug160(answerText) + ".mp3";

  const isVideo = media.includes(".mp4");

  const sourceMedia = p(videoPath, media || blankPng);

  if (!existsSync(sourceMedia)) {
    log("sourceMedia not exist", sourceMedia);
    throw new Error("sourceMedia not exist");
  }

  const imageToSourceVideo = async (sourceVideoOrPng: string): Promise<string> => {
    const resizeSourceMedia = await sharp(readFileSync(sourceVideoOrPng)).resize(WIDTH, HEIGHT).png().toBuffer();
    const resizeSourceMediaPath = p(CURRENT_EXAM_SUBFOLDER, `${id}_resize_source_media.png`);
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

  // const ad1 = p(BASE_DIR, "_testy-egzamin-ads", "1.png");
  // const ad1Video = await imageToSourceVideo(ad1);

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
    "Zobacz naszą stronę!",
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

  const questionTextPngPromise = textToPng_v3(CURRENT_EXAM_SUBFOLDER, `${i}. ${text}`, {
    maxWidth: WIDTH - 2 * GAP,
    fontSize: 50 / scale,
    lineHeight: 60 / scale,
    margin: 10,
    bgColor: PNG_BG_COLOR,
    textColor: "white",
  });

  const answerYesPngPromise = textToPng_v3(CURRENT_EXAM_SUBFOLDER, "Tak", {
    maxWidth: 100,
    fontSize: 50 / scale,
    lineHeight: 60 / scale,
    margin: 10,
    bgColor: PNG_BG_COLOR,
    textColor: "white",
  });

  const answerYesGreenPromise = textToPng_v3(CURRENT_EXAM_SUBFOLDER, "Tak", {
    maxWidth: 100,
    fontSize: 50 / scale,
    lineHeight: 60 / scale,
    margin: 10,
    bgColor: PNG_BG_COLOR_GREEN,
    textColor: "white",
  });

  const answerNoPngPromise = textToPng_v3(CURRENT_EXAM_SUBFOLDER, "Nie", {
    maxWidth: 100,
    fontSize: 50 / scale,
    lineHeight: 60 / scale,
    margin: 10,
    bgColor: PNG_BG_COLOR,
    textColor: "white",
  });

  const answerNoGreenPngPromise = textToPng_v3(CURRENT_EXAM_SUBFOLDER, "Nie", {
    maxWidth: 100,
    fontSize: 50 / scale,
    lineHeight: 60 / scale,
    margin: 10,
    bgColor: PNG_BG_COLOR_GREEN,
    textColor: "white",
  });

  const answerAPngPromise = textToPng_v3(CURRENT_EXAM_SUBFOLDER, `A) ${a}`, {
    maxWidth: WIDTH - 2 * GAP,
    fontSize: 50 / scale,
    lineHeight: 60 / scale,
    margin: 10,
    bgColor: PNG_BG_COLOR,
    textColor: "white",
  });

  const answerAPngGreenPromise = textToPng_v3(CURRENT_EXAM_SUBFOLDER, `A) ${a}`, {
    maxWidth: WIDTH - 2 * GAP,
    fontSize: 50 / scale,
    lineHeight: 60 / scale,
    margin: 10,
    bgColor: PNG_BG_COLOR_GREEN,
    textColor: "white",
  });

  const answerBPngPromise = textToPng_v3(CURRENT_EXAM_SUBFOLDER, `B) ${b}`, {
    maxWidth: WIDTH - 2 * GAP,
    fontSize: 50 / scale,
    lineHeight: 60 / scale,
    margin: 10,
    bgColor: PNG_BG_COLOR,
    textColor: "white",
  });

  const answerBPngGreenPromise = textToPng_v3(CURRENT_EXAM_SUBFOLDER, `B) ${b}`, {
    maxWidth: WIDTH - 2 * GAP,
    fontSize: 50 / scale,
    lineHeight: 60 / scale,
    margin: 10,
    bgColor: PNG_BG_COLOR_GREEN,
    textColor: "white",
  });

  const answerCPngPromise = textToPng_v3(CURRENT_EXAM_SUBFOLDER, `C) ${c}`, {
    maxWidth: WIDTH - 2 * GAP,
    fontSize: 50 / scale,
    lineHeight: 60 / scale,
    margin: 10,
    bgColor: PNG_BG_COLOR,
    textColor: "white",
  });

  const answerCPngGreenPromise = textToPng_v3(CURRENT_EXAM_SUBFOLDER, `C) ${c}`, {
    maxWidth: WIDTH - 2 * GAP,
    fontSize: 50 / scale,
    lineHeight: 60 / scale,
    margin: 10,
    bgColor: PNG_BG_COLOR_GREEN,
    textColor: "white",
  });

  const transparentPngPromise = createTransparentPng(WIDTH, HEIGHT, p(CURRENT_EXAM_SUBFOLDER, "transparent.png"));

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
  const [transparentPngAndAnswerA] = await putPngOnPng_v3(
    CURRENT_EXAM_SUBFOLDER,
    answerA,
    transparentPng,
    answerA_X,
    answerA_Y
  );

  const answerB_X = (w - widthB) / 2;
  const answerB_Y = h - (heightB + heightC) - GAP;
  const [transparentPngAndAnswerB] = await putPngOnPng_v3(
    CURRENT_EXAM_SUBFOLDER,
    answerB,
    transparentPngAndAnswerA,
    answerB_X,
    answerB_Y
  );

  const answerC_X = (w - widthC) / 2;
  const answerC_Y = h - heightC - GAP;
  const [transparentPngAndAnswerC] = await putPngOnPng_v3(
    CURRENT_EXAM_SUBFOLDER,
    answerC,
    transparentPngAndAnswerB,
    answerC_X,
    answerC_Y
  );

  const [transparentPngAndAnswersABCandQuestionText] = await putPngOnPng_v3(
    CURRENT_EXAM_SUBFOLDER,
    questionTextAsPng,
    transparentPngAndAnswerC,
    (w - widthQuestionTextPng) / 2,
    h - (heightA + heightB + heightC + heightQuestionTextPng) - GAP
  );

  const [transparentPngAndAnswersABCandQuestionTextAndLogo] = await putPngOnPng_v3(
    CURRENT_EXAM_SUBFOLDER,
    logo,
    transparentPngAndAnswersABCandQuestionText,
    0,
    0
  );

  const [bgForAbcQuestions] = await putPngOnPng_v3(
    CURRENT_EXAM_SUBFOLDER,
    zobaczNaszaStrone,
    transparentPngAndAnswersABCandQuestionTextAndLogo,
    w - zobaczNaszaStroneWidth,
    0
  );

  const answerYes_X = (w - widthYes - 150) / 2;
  const answerYes_Y = h - heightYes - GAP;
  const [transparentPngAndAnswersYes] = await putPngOnPng_v3(
    CURRENT_EXAM_SUBFOLDER,
    answerYes,
    transparentPng,
    answerYes_X,
    answerYes_Y
  );

  const answerNo_X = (w - widthYes + 150) / 2;
  const answerNo_Y = h - heightNo - GAP;
  const [transparentPngAndAnswersYesNo] = await putPngOnPng_v3(
    CURRENT_EXAM_SUBFOLDER,
    answerNo,
    transparentPngAndAnswersYes,
    answerNo_X,
    answerNo_Y
  );

  const [transparentPngAndAnswersYesNoAndQuestionText] = await putPngOnPng_v3(
    CURRENT_EXAM_SUBFOLDER,
    questionTextAsPng,
    transparentPngAndAnswersYesNo,
    (w - widthQuestionTextPng) / 2,
    h - (heightYes + GAP + heightQuestionTextPng) - GAP
  );

  const [transparentPngAndAnswersYesNoAndQuestionTextAndLogo] = await putPngOnPng_v3(
    CURRENT_EXAM_SUBFOLDER,
    logo,
    transparentPngAndAnswersYesNoAndQuestionText,
    0,
    0
  );

  const [bgForYesNoQuestions] = await putPngOnPng_v3(
    CURRENT_EXAM_SUBFOLDER,
    zobaczNaszaStrone,
    transparentPngAndAnswersYesNoAndQuestionTextAndLogo,
    w - zobaczNaszaStroneWidth,
    0
  );

  const baseVideoWithPngTextAndLogo = await putPngOnVideo_v3(
    CURRENT_EXAM_SUBFOLDER,
    baseVideo,
    a ? bgForAbcQuestions : bgForYesNoQuestions,
    0,
    0
  );

  const baseVideoWithPngTextAndLogoAndMp3 = await addMp3ToVideo_v3(
    CURRENT_EXAM_SUBFOLDER,
    baseVideoWithPngTextAndLogo,
    questionTextMp3
  );

  const duration = await getVideoDuration(baseVideoWithPngTextAndLogoAndMp3);

  const lastFrameWidthTextAndAnswersAndLogo = await manipulateVideo_v3(
    CURRENT_EXAM_SUBFOLDER,
    baseVideoWithPngTextAndLogo,
    duration - 0.05,
    duration,
    {
      size,
      blur: 0,
      crop: 0,
    }
  );

  const lastFrameWidthTextAndAnswersAndLogo_1s = await addMp3ToVideo_v3(
    CURRENT_EXAM_SUBFOLDER,
    lastFrameWidthTextAndAnswersAndLogo,
    mp3_1000
  );

  const lastFrameWidthTextAndAnswersAndLogo_1s_CorrectAnswer = await putPngOnVideo_v3(
    CURRENT_EXAM_SUBFOLDER,
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
    r === "t" ? answerYes_X : r === "n" ? answerNo_X : r === "a" ? answerA_X : r === "b" ? answerB_X : answerC_X,
    r === "t" ? answerYes_Y : r === "n" ? answerNo_Y : r === "a" ? answerA_Y : r === "b" ? answerB_Y : answerC_Y
  );

  const lastFrameWidthTextAndLogoAndAnswer = await addMp3ToVideo_v3(
    CURRENT_EXAM_SUBFOLDER,
    lastFrameWidthTextAndAnswersAndLogo,
    correctAnswerMp3
  );

  const lastFrameWidthTextAndLogoAndAnswer_CorrectAnswer = await putPngOnVideo_v3(
    CURRENT_EXAM_SUBFOLDER,
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
    r === "t" ? answerYes_X : r === "n" ? answerNo_X : r === "a" ? answerA_X : r === "b" ? answerB_X : answerC_X,
    r === "t" ? answerYes_Y : r === "n" ? answerNo_Y : r === "a" ? answerA_Y : r === "b" ? answerB_Y : answerC_Y
  );

  const videosToMergeForSingleQuestion = [
    baseVideoWithPngTextAndLogoAndMp3,
    // lastFrameWidthTextAndAnswersAndLogo_1s,
    lastFrameWidthTextAndAnswersAndLogo_1s,
    lastFrameWidthTextAndLogoAndAnswer_CorrectAnswer,
    lastFrameWidthTextAndAnswersAndLogo_1s_CorrectAnswer,
    // lastFrameWidthTextAndAnswersAndLogo_1s_CorrectAnswer,
  ];

  const singleQuestion = await mergeVideos(videosToMergeForSingleQuestion, singleQuestionVideo);

  const singleVideoDuration = await getVideoDuration(singleQuestionVideo);

  // CREATE SHORT VIDEO
if (media) {  const bgShortVideoPromise = manipulateVideo_v3(CURRENT_EXAM_SUBFOLDER, baseVideo, 0, VIDEO_DURATION_LIMIT, {
    size,
    blur: 15,
    crop: 10,
  });

  const innerShortVideoPromise = manipulateVideo_v3(CURRENT_EXAM_SUBFOLDER, baseVideo, 0, VIDEO_DURATION_LIMIT, {
    size: `${WIDTH / 2}x${HEIGHT / 2}`,
    blur: 0,
    crop: 0,
  });

  const [bg, inner] = await Promise.all([bgShortVideoPromise, innerShortVideoPromise]);

  const videoInVideo = await putVideoOnVideo_v3(CURRENT_EXAM_SUBFOLDER, bg, inner, "videoInVideo");

  const videoInVideoVertical = await makeVideoVertical_v3(CURRENT_EXAM_SUBFOLDER, videoInVideo, "videoInVideoVertical");

  const questionTextMp3Short = remoteFolderWithMp3 + textToSlug160(text) + ".mp3";

  const videoInVideoVerticalMp3 = await addMp3ToVideo_v3(
    CURRENT_EXAM_SUBFOLDER,
    videoInVideoVertical,
    questionTextMp3Short,
    "__1 short_with_text_mp3"
  );

  const shortWithAnswer = await addMp3ToVideo_v3(
    CURRENT_EXAM_SUBFOLDER,
    videoInVideoVertical,
    correctAnswerMp3,
    "__2 short_with_answer_mp3"
  );

  // SHORT PNGs
  const [transparentPngShort] = await createTransparentPng(
    608,
    HEIGHT,
    p(CURRENT_EXAM_SUBFOLDER, "__3 transparentShort.png")
  );

  const [odwiedzStrone, odwiedzStroneWidth, odwiedzStroneHeight] = await textToPng_v3(
    CURRENT_EXAM_SUBFOLDER,
    "Odwiedź naszą stronę:",
    { fontSize: 20, bgColor: "transparent" },
    "__0 odwiedzStrone"
  );
  const [poznajTesty, poznajTestyWidth, poznajTestyHeight] = await textToPng_v3(
    CURRENT_EXAM_SUBFOLDER,
    "poznaj-testy.pl",
    { fontSize: 30, bgColor: "yellow", lineHeight: 40 },
    "__4 poznajTesty"
  );

  const [questionTextPNGforShort, questionTextPNGforShortWidth, questionTextPNGforShortHeight] = await textToPng_v3(
    CURRENT_EXAM_SUBFOLDER,
    `${text}`,
    {
      maxWidth: 400,
      fontSize: 20,
      lineHeight: 30,
      margin: 10,
      bgColor: PNG_BG_COLOR,
      textColor: "white",
    }
  );

  const [png1] = await putPngOnPng_v3(CURRENT_EXAM_SUBFOLDER, odwiedzStrone, transparentPngShort, 50, 50);
  const [png2] = await putPngOnPng_v3(
    CURRENT_EXAM_SUBFOLDER,
    poznajTesty,
    png1,
    50,
    50 + poznajTestyHeight,
    "__5 pngShort"
  );
  const [png3] = await putPngOnPng_v3(
    CURRENT_EXAM_SUBFOLDER,
    questionTextPNGforShort,
    png2,
    50,
    HEIGHT - questionTextPNGforShortHeight - 300
  );

  const shortWithQuestionAndLogo_variant1 = await putPngOnVideo_v3(
    CURRENT_EXAM_SUBFOLDER,
    videoInVideoVerticalMp3,
    png2,
    0,
    0,
    "__6 short_with_question_and_logo"
  );

  const shortWithQuestionAndLogo_variant2 = await putPngOnVideo_v3(
    CURRENT_EXAM_SUBFOLDER,
    videoInVideoVerticalMp3,
    png3,
    0,
    0,
    "__6 short_with_question_and_logo"
  );

  const random0_1 = Math.floor(Math.random() * 2);
  const shortVideo_variant = random0_1 === 0 ? shortWithQuestionAndLogo_variant1 : shortWithQuestionAndLogo_variant2;

  const shortWithAnswerAndLogo = await putPngOnVideo_v3(
    CURRENT_EXAM_SUBFOLDER,
    shortWithAnswer,
    png2,
    0,
    0,
    "__7 short_with_answer_and_logo"
  );

  const safeFileNameWithId = safeFileName(`${text} ${id}`);
  const shortWithQuestionAndAnswer = await mergeVideos_v2(
    [shortVideo_variant, shortWithAnswerAndLogo],
    p(CURRENT_EXAM_SUBFOLDER, `__8 ${safeFileNameWithId}.mp4`)
  );

  copyFileSync(shortWithQuestionAndAnswer, p(PRODUCED_FOLDER, "_shorts", `${safeFileNameWithId}.mp4`));
}
  return { video: singleQuestion, text, duration: singleVideoDuration };
}
