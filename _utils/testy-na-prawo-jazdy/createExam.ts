const sizeOf = require("image-size");
const sharp = require("sharp");

import {
  copyFileSync,
  ensureDirSync,
  existsSync,
  readFileSync,
  readJsonSync,
  writeFileSync,
  writeJsonSync,
  removeSync,
} from "fs-extra";

import { ExamData } from "./data/types";
import { TextAndMediaForExamVideo } from "../../types";
import { Job } from "../types";

import { getVideoDuration, getVideoDurationInMiliseconds, mergeVideos } from "../ffmpeg";
import {
  convertSecondsToYtTimestamp,
  createScreenshot,
  downloadVideoOrPng,
  f,
  log,
  p,
  safeFileName,
  textToSlug160,
} from "../utils";
import { createTransparentPng } from "../jimp";
import { getVideoDimensions, mergeVideos_v2 } from "../ffmpeg-v2";
import {
  addMp3ToVideo_v3,
  centerTrimPng,
  makeVideoVertical_v3,
  putPngOnPng_v3,
  putPngOnVideo_v3,
  putVideoOnVideo_v3,
  textToPng_v3,
} from "../ffmpeg-v3";
import { t } from "./translations";
import { createSingleTextVideo } from "./createSingleTextVideo";

import { manipulateVideo_v4 } from "../ffmpeg-v4";

type Lang = "pl" | "en" | "de";
export const REMOTE_MEDIA_FOLDER = "https://hosting2421517.online.pro/testy-na-prawo-jazdy/size-full/";
export const REMOTE_MP3_FOLDER = "https://hosting2421517.online.pro/testy-na-prawo-jazdy/mp3/";

const SLATE_400 = "#90a1b9";
const SLATE_600 = "#45556c";
const POZNAJ_TESTY_SHORTS_COLOR = SLATE_400;

export const createExam = async (
  job: Job,
  examIndex: number,
  exams: ExamData[],
  lang: Lang,
  textsAndMediaBeforeExam: TextAndMediaForExamVideo[],
  textsAndMediaAfterExam: TextAndMediaForExamVideo[]
): Promise<number> => {
  const scale = 1;
  const WIDTH = 1920 / scale;
  const HEIGHT = 1080 / scale;
  const VIDEO_DURATION_LIMIT = 99999999;
  const GAP = 20;
  const PNG_BG_COLOR = "rgb(71 85 105)";
  const PNG_BG_COLOR_GREEN = "#15803d";
  const START_NR = 1;
  const START_INDEX = START_NR - 1;
  const HOW_MANY_QUESTIONS_TO_CREATE = 9999999;
  const LIMIT = START_INDEX + HOW_MANY_QUESTIONS_TO_CREATE;

  // const scale = 1;
  // const WIDTH = 1920 / scale;
  // const HEIGHT = 1080 / scale;
  // const VIDEO_DURATION_LIMIT = 99999999;
  // const GAP = 20;
  // const PNG_BG_COLOR = "rgb(71 85 105)";
  // const PNG_BG_COLOR_GREEN = "#15803d";
  // const START_NR = 19;
  // const START_INDEX = START_NR - 1;
  // const HOW_MANY_QUESTIONS_TO_CREATE = 3;
  // const LIMIT = START_INDEX + HOW_MANY_QUESTIONS_TO_CREATE;

  const currentExam = exams[examIndex];
  const { examQuestions32, examSlug } = currentExam;

  const examQuestions32Limited = examQuestions32.slice(START_INDEX, LIMIT);

  const { BASE_DIR, BASE_FOLDER } = job;
  const pb = (path: string) => p(BASE_FOLDER, path);
  const CURRENT_EXAM_SUBFOLDER = pb(examSlug);
  const PRODUCED_FOLDER = `${BASE_FOLDER}_PRODUCED`;
  ensureDirSync(BASE_FOLDER);
  ensureDirSync(CURRENT_EXAM_SUBFOLDER);
  ensureDirSync(PRODUCED_FOLDER);
  ensureDirSync(`${PRODUCED_FOLDER}/_shorts`);

  console.log("examQuestions32Limited", { ...currentExam, examQuestions32: `${examQuestions32.length} pytania...` });

  const size = `${WIDTH}x${HEIGHT}`;

  // const videoPath = CURRENT_EXAM_SUBFOLDER;

  let mp3FolderRemote = REMOTE_MP3_FOLDER;
  if (lang === "en") mp3FolderRemote = mp3FolderRemote + "en/";
  if (lang === "de") mp3FolderRemote = mp3FolderRemote + "de/";

  const mp3_1000 = p(BASE_DIR, "_silent_mp3", "1000.mp3");
  const mp4_1000 = p(BASE_DIR, "_silent_mp3", "1000.mp4");
  const blankPng = p(BASE_DIR, "_silent_mp3", "blank.png");

  const videos: string[] = [];
  const texts: string[] = [];
  const durations: number[] = [];

  for (const { myText, media } of textsAndMediaBeforeExam) {
    const { video, text, duration } = await createSingleTextVideo(
      CURRENT_EXAM_SUBFOLDER,
      myText, // to przykładowy text
      media,
      // "https://hosting2421517.online.pro/testy-na-prawo-jazdy/size-full/",
      blankPng,
      mp4_1000,
      WIDTH,
      HEIGHT,
      GAP,
      PNG_BG_COLOR,
      PNG_BG_COLOR_GREEN,
      scale,
      size,
      // remoteFolderWithMp3,
      mp3_1000,
      VIDEO_DURATION_LIMIT,
      PRODUCED_FOLDER,
      lang
    );

    videos.push(video);
    texts.push(text);
    durations.push(duration);
  }

  let questionIndex = START_INDEX;
  for (const drivingQuestion of examQuestions32Limited) {
    questionIndex++;

    // michal this function download mp4 or png and default blank png if no media found or media === ""
    await downloadVideoOrPng(
      REMOTE_MEDIA_FOLDER + drivingQuestion.media,
      CURRENT_EXAM_SUBFOLDER + "/" + drivingQuestion.media,
      blankPng
    );

    const { video, text, duration } = await createSingleQuestionVideo(
      CURRENT_EXAM_SUBFOLDER,
      drivingQuestion,
      questionIndex,
      // videoPath,
      blankPng,
      mp4_1000,
      WIDTH,
      HEIGHT,
      GAP,
      PNG_BG_COLOR,
      PNG_BG_COLOR_GREEN,
      scale,
      size,
      // remoteFolderWithMp3,
      mp3_1000,
      VIDEO_DURATION_LIMIT,
      PRODUCED_FOLDER,
      lang
    );

    videos.push(video);
    texts.push(text);
    durations.push(duration);

    copyFileSync(video, p(PRODUCED_FOLDER, f(video).nameWithExt));
  }

  for (const { myText, media } of textsAndMediaAfterExam) {
    const { video, text, duration } = await createSingleTextVideo(
      CURRENT_EXAM_SUBFOLDER,
      myText, // to przykładowy text
      media,
      // "https://hosting2421517.online.pro/testy-na-prawo-jazdy/size-full/",
      blankPng,
      mp4_1000,
      WIDTH,
      HEIGHT,
      GAP,
      PNG_BG_COLOR,
      PNG_BG_COLOR_GREEN,
      scale,
      size,
      // remoteFolderWithMp3,
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

  const timestampFile = p(CURRENT_EXAM_SUBFOLDER, `${examSlug}.txt`);
  writeFileSync(timestampFile, timestampsText);
  copyFileSync(timestampFile, p(PRODUCED_FOLDER, f(timestampFile).nameWithExt));

  const videosWithAdds = [...videos];

  const examVideo = await mergeVideos_v2(videosWithAdds, p(CURRENT_EXAM_SUBFOLDER, `${examSlug}.mp4`));

  const producedVideoPath = p(PRODUCED_FOLDER, f(examVideo).nameWithExt);
  copyFileSync(examVideo, producedVideoPath);

  const pointsInTime = [...[...Array(3)].map((_, i) => `00:00:0${i * 3 + 4}`)];

  for (const pointInTime of pointsInTime) {
    await createScreenshot(producedVideoPath, f(producedVideoPath).path, pointInTime);
  }

  return examIndex;
};

async function createSingleQuestionVideo(
  CURRENT_EXAM_SUBFOLDER: string,
  drivingQuestion: any,
  i: number,
  // videoPath: string,
  blankPng: string,
  mp4_1000: string,
  WIDTH: number,
  HEIGHT: number,
  GAP: number,
  PNG_BG_COLOR: string,
  PNG_BG_COLOR_GREEN: string,
  scale: number,
  size: string,
  // remoteFolderWithMp3: string,
  mp3_1000: string,
  VIDEO_DURATION_LIMIT: number,
  PRODUCED_FOLDER: string,
  lang: Lang
): Promise<{ video: string; text: string; duration: number }> {
  const { id, media, text, r, a, b, c } = drivingQuestion;

  const singleQuestionVideo = p(CURRENT_EXAM_SUBFOLDER, `${id}_${i}.mp4`);

  log(`createSingleQuestionVideo() ${f(singleQuestionVideo).nameWithExt}`, "");

  // log("michal chwilowo nadpisuje wideo");
  if (existsSync(singleQuestionVideo)) {
    const singleVideoDurationMs = await getVideoDurationInMiliseconds(singleQuestionVideo);
    return { video: singleQuestionVideo, text, duration: singleVideoDurationMs / 1000 };
  }

  let questionText = text;
  if (r !== "t" && r !== "n") questionText = `${text} ${a} ${b} ${c}`;

  const questionTextMp3 = REMOTE_MP3_FOLDER + textToSlug160(questionText) + ".mp3";

  let answerText = "";
  if (r === "t") answerText = t.odpowiedzTak[lang];
  if (r === "n") answerText = t.odpowiedzNie[lang];
  if (r === "a") answerText = `${t.odpowiedzA[lang]} ${a}`;
  if (r === "b") answerText = `${t.odpowiedzB[lang]} ${b}`;
  if (r === "c") answerText = `${t.odpowiedzC[lang]} ${c}`;

  const correctAnswerMp3 = REMOTE_MP3_FOLDER + textToSlug160(answerText) + ".mp3";

  const isVideo = media.includes(".mp4");

  const sourceMedia = p(CURRENT_EXAM_SUBFOLDER, media || blankPng);

  if (!existsSync(sourceMedia)) {
    log(`sourceMedia not exist ${sourceMedia}`);
    throw new Error("sourceMedia not exist");
  }

  const imageToSourceVideo = async (sourcePng: string): Promise<string> => {
    // michal
    const source = readFileSync(sourcePng);
    const bluredBgPng = await sharp(source).resize(WIDTH, HEIGHT).blur(15).png().toBuffer();
    const bluredBgPngPath = p(CURRENT_EXAM_SUBFOLDER, `${id}_bluredSourceBgPng.png`);
    writeFileSync(bluredBgPngPath, bluredBgPng);
    const resizedSourcePng = await sharp(source)
      .resize(Math.floor((sizeOf(sourcePng).width * HEIGHT) / sizeOf(sourcePng).height), HEIGHT)
      .png()
      .toBuffer();
    const resizedSourcePngPath = p(CURRENT_EXAM_SUBFOLDER, `${id}_resizedSourcePng.png`);
    writeFileSync(resizedSourcePngPath, resizedSourcePng);

    await centerTrimPng(resizedSourcePngPath, WIDTH, HEIGHT);

    // throw new Error("stop");

    const [finalSourcePng] = await putPngOnPng_v3(
      CURRENT_EXAM_SUBFOLDER,
      resizedSourcePngPath,
      bluredBgPngPath,
      WIDTH / 2 - sizeOf(resizedSourcePngPath).width / 2,
      0,
      "finalSourcePng"
    );

    const mp4_1000Resized = await manipulateVideo_v4(
      CURRENT_EXAM_SUBFOLDER,
      mp4_1000,
      0,
      VIDEO_DURATION_LIMIT,
      {
        size,
      },
      "mp4_1000Resized"
    );

    const sourcePngConvertedToVideo = await putPngOnVideo_v3(CURRENT_EXAM_SUBFOLDER, mp4_1000Resized, finalSourcePng);

    return sourcePngConvertedToVideo;
  };

  const baseVideo = await manipulateVideo_v4(
    CURRENT_EXAM_SUBFOLDER,
    isVideo ? sourceMedia : await imageToSourceVideo(sourceMedia),
    0,
    VIDEO_DURATION_LIMIT,
    {
      size,
      blur: 0,
      crop: 0,
    },
    "baseVideo"
  );

  // throw new Error("STOP");

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

  const [logo] = await textToPng_v3(CURRENT_EXAM_SUBFOLDER, "poznaj-testy.pl", {
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

  const answerYesPngPromise = textToPng_v3(CURRENT_EXAM_SUBFOLDER, t.tak[lang], {
    maxWidth: 100,
    fontSize: 50 / scale,
    lineHeight: 60 / scale,
    margin: 10,
    bgColor: PNG_BG_COLOR,
    textColor: "white",
  });

  const answerYesGreenPromise = textToPng_v3(CURRENT_EXAM_SUBFOLDER, t.tak[lang], {
    maxWidth: 100,
    fontSize: 50 / scale,
    lineHeight: 60 / scale,
    margin: 10,
    bgColor: PNG_BG_COLOR_GREEN,
    textColor: "white",
  });

  const answerNoPngPromise = textToPng_v3(CURRENT_EXAM_SUBFOLDER, t.nie[lang], {
    maxWidth: 100,
    fontSize: 50 / scale,
    lineHeight: 60 / scale,
    margin: 10,
    bgColor: PNG_BG_COLOR,
    textColor: "white",
  });

  const answerNoGreenPngPromise = textToPng_v3(CURRENT_EXAM_SUBFOLDER, t.nie[lang], {
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
    [answerYesGreen],
    [answerNo, widthNo, heightNo],
    [answerNoGreen],
    [answerA, widthA, heightA],
    [answerAGreen],
    [answerB, widthB, heightB],
    [answerBGreen],
    [answerC, widthC, heightC],
    [answerCGreen],
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
    0,
    "baseVideoWithPngTextAndLogo"
  );

  const baseVideoWithPngTextAndLogoAndMp3 = await addMp3ToVideo_v3(
    CURRENT_EXAM_SUBFOLDER,
    baseVideoWithPngTextAndLogo,
    questionTextMp3,
    "baseVideoWithPngTextAndLogoAndMp3"
  );

  const duration = await getVideoDuration(baseVideoWithPngTextAndLogoAndMp3);

  const lastFrameWidthTextAndAnswersAndLogo = await manipulateVideo_v4(
    CURRENT_EXAM_SUBFOLDER,
    baseVideoWithPngTextAndLogo,
    duration - 0.05,
    duration,
    {
      size,
      blur: 0,
      crop: 0,
    },
    "lastFrameWidthTextAndAnswersAndLogo"
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
  const createdShortsIdsFile = p(__dirname, "createdShortsIds.json");
  const createdShortsIds = readJsonSync(createdShortsIdsFile);

  function classifyShape(width: number, height: number) {
    // Input validation: Ensure width and height are positive numbers.
    if (typeof width !== "number" || typeof height !== "number" || width <= 0 || height <= 0) {
      return "Invalid input: Width and height must be positive numbers.";
    }

    const aspectRatio = width / height;

    const tolerance = 0.1; // Adjust this value to change the definition of "similar"

    if (Math.abs(aspectRatio - 1) < tolerance) {
      return "square";
    } else if (aspectRatio > 1 + tolerance) {
      return "horizontal";
    } else if (aspectRatio < 1 - tolerance) {
      return "vertical";
    } else {
      return "horizontal"; // Handles edge cases or very specific shapes
    }
  }
  // && !createdShortsIds[lang].includes(id)
  if (true && media && !createdShortsIds[lang].includes(id)) {
    // michal

    let shape = "horizontal";

    if (!isVideo) {
      // classifyShape is not for video so assume all videos are horizontal for now
      shape = classifyShape(sizeOf(sourceMedia).width, sizeOf(sourceMedia).height); // "vertical", "square" , "horizontal"
    }

    log({ shape });

    const bg = await manipulateVideo_v4(
      CURRENT_EXAM_SUBFOLDER,
      baseVideo,
      0,
      VIDEO_DURATION_LIMIT,
      {
        size,
        blur: 15,
        crop: 10,
      },
      "bg"
    );

    const innerSize = shape === "square" ? `${WIDTH / 1.5}x${HEIGHT / 1.5}` : `${WIDTH / 2}x${HEIGHT / 2}`;
    const inner = await manipulateVideo_v4(
      CURRENT_EXAM_SUBFOLDER,
      baseVideo,
      0,
      VIDEO_DURATION_LIMIT,
      {
        size: innerSize,
        blur: 0,
        crop: 0,
      },
      "inner"
    );

    const videoInVideo = await putVideoOnVideo_v3(CURRENT_EXAM_SUBFOLDER, bg, inner, "videoInVideo");

    const videoInVideoVertical = await makeVideoVertical_v3(
      CURRENT_EXAM_SUBFOLDER,
      shape === "vertical" ? baseVideo : videoInVideo,
      "videoInVideoVertical"
    );

    const videoInVideoVerticalLastFrame = await manipulateVideo_v4(
      CURRENT_EXAM_SUBFOLDER,
      videoInVideoVertical,
      duration - 0.05,
      duration,
      {
        // size,
        // blur: 0,
        // crop: 0,
      },
      "videoInVideoVertical_lastFrame"
    );

    const questionTextMp3Short = REMOTE_MP3_FOLDER + textToSlug160(text) + ".mp3";

    const videoInVideoVerticalMp3 = await addMp3ToVideo_v3(
      CURRENT_EXAM_SUBFOLDER,
      videoInVideoVertical,
      questionTextMp3Short,
      "__1 short_with_text_mp3"
    );

    const shortWithAnswer = await addMp3ToVideo_v3(
      CURRENT_EXAM_SUBFOLDER,
      videoInVideoVerticalLastFrame, //videoInVideoVertical
      correctAnswerMp3,
      "__2 short_with_answer_mp3"
    );

    // SHORT PNGs
    const [transparentPngShort] = await createTransparentPng(
      608,
      HEIGHT,
      p(CURRENT_EXAM_SUBFOLDER, "__3 transparentShort.png")
    );

    const [odwiedzStrone] = await textToPng_v3(
      CURRENT_EXAM_SUBFOLDER,
      t.zobaczNaszaStrone[lang],
      { fontSize: 20, bgColor: "transparent" },
      "__0 odwiedzStrone"
    );

    const [poznajTesty, poznajTestyWidth, poznajTestyHeight] = await textToPng_v3(
      CURRENT_EXAM_SUBFOLDER,
      "poznaj-testy.pl",
      { fontSize: 30, bgColor: POZNAJ_TESTY_SHORTS_COLOR, lineHeight: 40 },
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

    const shortWithQuestionAndLogo_variant2 = await putPngOnVideo_v3(
      CURRENT_EXAM_SUBFOLDER,
      videoInVideoVerticalMp3,
      png3,
      0,
      0,
      "__6 short_with_question_and_logo"
    );

    const shortVideo_variant = shortWithQuestionAndLogo_variant2; // this is short with text on video

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

    // safe short's id to array to avoid duplicates
    writeJsonSync(
      createdShortsIdsFile,
      { ...createdShortsIds, [lang]: [...createdShortsIds[lang], id] },
      { spaces: 2 }
    );

    copyFileSync(shortWithQuestionAndAnswer, p(PRODUCED_FOLDER, "_shorts", `${safeFileNameWithId}.mp4`));
  }

  return { video: singleQuestion, text, duration: singleVideoDuration };
}
