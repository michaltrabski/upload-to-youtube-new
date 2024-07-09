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
  f,
  log,
  p,
  safeFileName,
  textToPng,
  textToSlug160,
} from "../utils";
import { difficultQuestionsDB } from "./difficultQuestionsDB";

import { examsB } from "./exams-b";
import { ExamData, ExamDataObj } from "./data/types";
import { createPngWithText, createTransparentPng, overlayPng } from "../jimp";

// Example video produced with this code!
// https://www.youtube.com/watch?v=hMVZgolg7JY

export const createSingleVideoExam = async (job: Job) => {
  const { BASE_DIR, BASE_FOLDER } = job;
  const pb = (path: string) => p(BASE_FOLDER, path);
  const PRODUCED_FOLDER = `${BASE_FOLDER}_PRODUCED`;
  ensureDirSync(BASE_FOLDER);
  ensureDirSync(PRODUCED_FOLDER);

  // const scale = 1;
  // const WIDTH = 1920 / scale;
  // const HEIGHT = 1080 / scale;
  // const VIDEO_DURATION_LIMIT = 999999999;
  // const PRODUCED_SHORTS_LIMIT_SLICE_FROM = 0;
  // const PRODUCED_SHORTS_LIMIT_SLICE_TO = 9999999;
  // const GAP = 20;

  const scale = 1;
  const WIDTH = 1920 / scale;
  const HEIGHT = 1080 / scale;
  const VIDEO_DURATION_LIMIT = 3;
  const PRODUCED_SHORTS_LIMIT_SLICE_FROM = 20 - 1;
  const PRODUCED_SHORTS_LIMIT_SLICE_TO = 20 + 2;
  const GAP = 20;

  const exams_b_random: ExamDataObj = readJSONSync(p(__dirname, "data", "exams-b-random.json"));
  const { exams } = exams_b_random;

  const firstExamFromFile = exams[0];
  const { examSlug } = firstExamFromFile;
  const firstQuestionText = firstExamFromFile.examQuestions32[0].text;
  const examNumber = examSlug.split("-")[2];

  log("exams", exams.length, firstExamFromFile.examQuestions32[0].text);

  const drivingQuestions = firstExamFromFile.examQuestions32.slice(
    PRODUCED_SHORTS_LIMIT_SLICE_FROM,
    PRODUCED_SHORTS_LIMIT_SLICE_TO
  );

  const size = `${WIDTH}x${HEIGHT}`;

  const videoPath = p(BASE_DIR, "_ignore_files");
  const audioPath = p(BASE_DIR, "_ignore_files_mp3");
  const mp3_1000 = p(BASE_DIR, "_silent_mp3", "1000.mp3");
  const mp4_1000 = p(BASE_DIR, "_silent_mp3", "1000.mp4");
  const blankPng = p(BASE_DIR, "_silent_mp3", "blank.png");

  const introAdd1 = p(BASE_DIR, "_silent_mp3", "add1 to jest egzamin na kategorie b.mp4");
  const introAdd2 = p(BASE_DIR, "_silent_mp3", "add2 to jest egzamin na kategorie b.mp4");
  const introAdd3 = p(BASE_DIR, "_silent_mp3", "add3 to jest egzamin na kategorie b.mp4");
  const introAdd4 = p(BASE_DIR, "_silent_mp3", "add4 to jest egzamin na kategorie b.mp4");
  const introAdd5 = p(BASE_DIR, "_silent_mp3", "add5 to jest egzamin na kategorie b.mp4");

  const introAdd1Formatted = await manipulateVideo(introAdd1, pb(`add1_formatted.mp4`), 0, 9999, { size });
  const introAdd2Formatted = await manipulateVideo(introAdd2, pb(`add2_formatted.mp4`), 0, 9999, { size });
  const introAdd3Formatted = await manipulateVideo(introAdd3, pb(`add3_formatted.mp4`), 0, 9999, { size });
  const introAdd4Formatted = await manipulateVideo(introAdd4, pb(`add4_formatted.mp4`), 0, 9999, { size });
  const introAdd5Formatted = await manipulateVideo(introAdd5, pb(`add5_formatted.mp4`), 0, 9999, { size });

  const randomIntroAdd = [
    introAdd1Formatted,
    introAdd2Formatted,
    introAdd3Formatted,
    introAdd4Formatted,
    introAdd5Formatted,
  ][Math.floor(Math.random() * 5)];

  const zasadyEgzaminu1 = p(BASE_DIR, "_silent_mp3", "zasady egzaminu 1.mp4");
  const zasadyEgzaminu2 = p(BASE_DIR, "_silent_mp3", "zasady egzaminu 2.mp4");

  const zasadyEgzaninuArr = [
    await manipulateVideo(zasadyEgzaminu1, pb(`zasady_egzaminu_1_formatted.mp4`), 0, 9999, { size }),
    // await manipulateVideo(zasadyEgzaminu2, pb(`zasady_egzaminu_2_formatted.mp4`), 0, 9999, { size }),
  ];

  const zasadyEgzaninuRandom = zasadyEgzaninuArr[Math.floor(Math.random() * zasadyEgzaninuArr.length)];

  const [logo, logoWidth, logoHeight] = await textToPng("poznaj-testy.pl", pb("poznaj-testy.png"), {
    maxWidth: 250,
    fontSize: 35,
    lineHeight: 40,
    margin: 10,
    bgColor: "transparent", // "#475569", // slate 600
    textColor: "black",
  });

  let i = PRODUCED_SHORTS_LIMIT_SLICE_FROM;
  const examVideosPaths: string[] = [];
  const vertical_examVideosPaths: string[] = [];

  let startTime = 0;
  const exam_horizontal_timestamps: { text: string; startTime: number }[] = [];

  let trimFrom = 0;
  const exam_vertical_trim_data: { text: string; trimFrom: number; trimTo: number; nameBasedOn: string }[] = [];

  for (const drivingQuestion of drivingQuestions) {
    i++;

    const { id, media, text, r, a, b, c } = drivingQuestion;
    const isVideo = media.includes(".mp4");

    const sourceMedia = p(videoPath, media || blankPng);

    if (!existsSync(sourceMedia)) {
      log("sourceMedia not exist", sourceMedia);
      continue;
    }

    const imageToSourceVideo = async (): Promise<string> => {
      const resizeSourceMedia = await sharp(readFileSync(sourceMedia)).resize(WIDTH, HEIGHT).png().toBuffer();
      const resizeSourceMediaPath = pb(`${id}_resizeSourceMedia.png`);
      writeFileSync(resizeSourceMediaPath, resizeSourceMedia);

      const mp4_1000Resized = await manipulateVideo(
        mp4_1000,
        pb(`${id}_mp4_1000Resized.mp4`),
        0,
        VIDEO_DURATION_LIMIT,
        { size }
      );

      const sourceMediaPngConvertedToVideo = await putPngOnVideo(
        mp4_1000Resized,
        resizeSourceMediaPath,
        pb(`${id}_source_video.mp4`)
      );

      return sourceMediaPngConvertedToVideo;
    };

    const baseVideo = await manipulateVideo(
      isVideo ? sourceMedia : await imageToSourceVideo(),
      pb(`${id}_base_video.mp4`),
      0,
      VIDEO_DURATION_LIMIT,
      {
        size,
        blur: 0,
        crop: 0,
      }
    );

    const [questionTextAsPng, widthQuestionTextPng, heightQuestionTextPng] = await textToPng(
      `${i}. ${text}`,
      pb(`${i}__${examNumber}_question_text.png`),
      {
        maxWidth: WIDTH - 2 * GAP,
        fontSize: 50,
        lineHeight: 60,
        margin: 10,
        bgColor: "#475569",
        textColor: "white",
        // textAlign: "center",
      }
    );

    const [answerYes, widthYes, heightYes] = await textToPng("Tak", pb(`answer_yes.png`), {
      maxWidth: 100,
      fontSize: 50,
      lineHeight: 60,
      margin: 10,
      bgColor: "#475569",
      textColor: "white",
    });

    const [answerYesGreen, widthYesGreen, heightYesGreen] = await textToPng("Tak", pb(`answer_yes_green.png`), {
      maxWidth: 100,
      fontSize: 50,
      lineHeight: 60,
      margin: 10,
      bgColor: "#4CAF50",
      textColor: "white",
    });

    const [answerNo, widthNo, heightNo] = await textToPng("Nie", pb(`answer_no.png`), {
      maxWidth: 100,
      fontSize: 50,
      lineHeight: 60,
      margin: 10,
      bgColor: "#475569",
      textColor: "white",
    });

    const [answerNoGreen, widthNoGreen, heightNoGreen] = await textToPng("Nie", pb(`answer_no_green.png`), {
      maxWidth: 100,
      fontSize: 50,
      lineHeight: 60,
      margin: 10,
      bgColor: "#4CAF50",
      textColor: "white",
    });

    const [answerA, widthA, heightA] = await textToPng(`A) ${a}`, pb(`${id}_answer_a.png`), {
      maxWidth: WIDTH - 2 * GAP,
      fontSize: 50,
      lineHeight: 60,
      margin: 10,
      bgColor: "#475569",
      textColor: "white",
    });

    const [answerAGreen, widthAGreen, heightAGreen] = await textToPng(`A) ${a}`, pb(`${id}_answer_a_green.png`), {
      maxWidth: WIDTH - 2 * GAP,
      fontSize: 50,
      lineHeight: 60,
      margin: 10,
      bgColor: "#4CAF50",
      textColor: "white",
    });

    const [answerB, widthB, heightB] = await textToPng(`B) ${b}`, pb(`${id}_answer_b.png`), {
      maxWidth: WIDTH - 2 * GAP,
      fontSize: 50,
      lineHeight: 60,
      margin: 10,
      bgColor: "#475569",
      textColor: "white",
    });

    const [answerBGreen, widthBGreen, heightBGreen] = await textToPng(`B) ${b}`, pb(`${id}_answer_b_green.png`), {
      maxWidth: WIDTH - 2 * GAP,
      fontSize: 50,
      lineHeight: 60,
      margin: 10,
      bgColor: "#4CAF50",
      textColor: "white",
    });

    const [answerC, widthC, heightC] = await textToPng(`C) ${c}`, pb(`${id}_answer_c.png`), {
      maxWidth: WIDTH - 2 * GAP,
      fontSize: 50,
      lineHeight: 60,
      margin: 10,
      bgColor: "#475569",
      textColor: "white",
    });

    const [answerCGreen, widthCGreen, heightCGreen] = await textToPng(`C) ${c}`, pb(`${id}_answer_c_green.png`), {
      maxWidth: WIDTH - 2 * GAP,
      fontSize: 50,
      lineHeight: 60,
      margin: 10,
      bgColor: "#4CAF50",
      textColor: "white",
    });

    const [transparentPng, w, h] = await createTransparentPng(1920, 1080, pb("transparent.png"));

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
      pb(`${i}_${examNumber}_transparent_png_with_answers_abc_and_question_text.png`),
      (w - widthQuestionTextPng) / 2,
      h - (heightA + heightB + heightC + heightQuestionTextPng) - GAP
    );

    const [transparentPngAndAnswersABCandQuestionTextAndLogo] = await overlayPng(
      logo,
      transparentPngAndAnswersABCandQuestionText,
      pb(`${i}_${examNumber}_transparent_png_with_answers_abc_and_question_text_and_logo.png`),
      (w - logoWidth) / 2,
      20
    );

    const [transparentPngAndAnswersABCandQuestionTextAndLogo_CorrectAnswer] = await overlayPng(
      r === "a" ? answerAGreen : r === "b" ? answerBGreen : answerCGreen,
      transparentPngAndAnswersABCandQuestionTextAndLogo,
      pb(`${i}_${examNumber}_transparent_png_with_answers_abc_and_question_text_and_logo_correct_answer.png`),
      r === "a" ? (w - widthA) / 2 : r === "b" ? (w - widthB) / 2 : (w - widthC) / 2,
      r === "a" ? h - heightA - GAP : r === "b" ? h - heightB - GAP : h - heightC - GAP
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
      pb(`${i}_${examNumber}_transparent_png_with_answers_yes_no_and_question_text.png`),
      (w - widthQuestionTextPng) / 2,
      h - (heightYes + GAP + heightQuestionTextPng) - GAP
    );

    const [transparentPngAndAnswersYesNoAndQuestionTextAndLogo] = await overlayPng(
      logo,
      transparentPngAndAnswersYesNoAndQuestionText,
      pb(`${i}_${examNumber}_transparent_png_with_answers_yes_no_and_question_text_and_logo.png`),
      (w - logoWidth) / 2,
      20
    );

    const [transparentPngAndAnswersYesNoAndQuestionTextAndLogo_CorrectAnswer] = await overlayPng(
      r === "t" ? answerYesGreen : answerNoGreen,
      transparentPngAndAnswersYesNoAndQuestionTextAndLogo,
      pb(`${i}_${examNumber}_transparent_png_with_answers_yes_no_and_question_text_and_logo_correct_answer.png`),
      r === "t" ? (w - widthYes - 150) / 2 : (w - widthNo + 150) / 2,
      r === "t" ? h - heightYes - GAP : h - heightNo - GAP
    );

    const baseVideoWithPngTextAndLogo = await putPngOnVideo(
      baseVideo,
      a ? transparentPngAndAnswersABCandQuestionTextAndLogo : transparentPngAndAnswersYesNoAndQuestionTextAndLogo,
      pb(`${i}_${examNumber}_base_video_with_png_text_and_answers_and_logo.mp4`),
      0,
      0
    );

    const textMp3 = p(audioPath, textToSlug160(text) + ".mp3");

    const baseVideoWithPngTextAndLogoAndMp3 = await addMp3ToVideo(
      baseVideoWithPngTextAndLogo,
      textMp3,
      pb(`_${i}_____${examNumber}_step1_base_video_with_png_text_and_answers_and_logo_and_mp3.mp4`)
    );

    const duration = await getVideoDuration(baseVideoWithPngTextAndLogoAndMp3);

    const lastFrameWidthTextAndAnswersAndLogo = await manipulateVideo(
      baseVideoWithPngTextAndLogo,
      pb(`${i}_${examNumber}_last_frame_width_text_and_answers_and_logo.mp4`),
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
      pb(`_${i}_____${examNumber}_step2_last_frame_width_text_and_answers_and_logo_1s.mp4`)
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
      pb(`_${i}_____${examNumber}_step3_last_frame_width_text_and_answers_and_logo_1s_correct.mp4`),
      r === "t" ? answerYes_X : r === "n" ? answerNo_X : r === "a" ? answerA_X : r === "b" ? answerB_X : answerC_X,
      r === "t" ? answerYes_Y : r === "n" ? answerNo_Y : r === "a" ? answerA_Y : r === "b" ? answerB_Y : answerC_Y
    );

    let answerText = "";
    if (r === "t") answerText = "odpowiedź tak";
    if (r === "n") answerText = "odpowiedź nie";
    if (r === "a") answerText = `odpowiedź a ${a}`;
    if (r === "b") answerText = `odpowiedź b ${b}`;
    if (r === "c") answerText = `odpowiedź c ${c}`;

    const correctAnswerMp3 = p(audioPath, textToSlug160(answerText) + ".mp3");

    const lastFrameWidthTextAndLogoAndAnswer = await addMp3ToVideo(
      lastFrameWidthTextAndAnswersAndLogo,
      correctAnswerMp3,
      pb(`_${i}_____${examNumber}_step4_last_frame_width_text_and_logo_and_answer.mp4`)
    );

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
      pb(`_${i}_____${examNumber}_step5_last_frame_width_text_and_logo_and_answer_correct.mp4`),
      r === "t" ? answerYes_X : r === "n" ? answerNo_X : r === "a" ? answerA_X : r === "b" ? answerB_X : answerC_X,
      r === "t" ? answerYes_Y : r === "n" ? answerNo_Y : r === "a" ? answerA_Y : r === "b" ? answerB_Y : answerC_Y
    );

    // const lastFrameWidthTextAndLogoAndAnswer_CorrectAnswer = await putPngOnVideo(
    //   lastFrameWidthTextAndAnswersAndLogo,
    //   r === "t"
    //     ? answerYesGreen
    //     : r === "n"
    //     ? answerNoGreen
    //     : r === "a"
    //     ? answerAGreen
    //     : r === "b"
    //     ? answerBGreen
    //     : answerCGreen,
    //   pb(`_${i}_____${examNumber}_step4_last_frame_width_text_and_logo_and_answer_correct.mp4`),
    //   r === "t" ? answerYes_X : r === "n" ? answerNo_X : r === "a" ? answerA_X : r === "b" ? answerB_X : answerC_X,
    //   r === "t" ? answerYes_Y : r === "n" ? answerNo_Y : r === "a" ? answerA_Y : r === "b" ? answerB_Y : answerC_Y
    // );

    // const lastFrameWidthTextAndLogoAndAnswer = await addMp3ToVideo(
    //   lastFrameWidthTextAndLogoAndAnswer_CorrectAnswer,
    //   correctAnswerMp3,
    //   pb(`_${i}_____${examNumber}_step5_last_frame_width_text_and_logo_and_answer.mp4`)
    // );

    const videosToMergeForSingleQuestion = [
      baseVideoWithPngTextAndLogoAndMp3,
      lastFrameWidthTextAndAnswersAndLogo_1s,
      lastFrameWidthTextAndAnswersAndLogo_1s,
      lastFrameWidthTextAndLogoAndAnswer_CorrectAnswer,
      lastFrameWidthTextAndAnswersAndLogo_1s_CorrectAnswer,
      lastFrameWidthTextAndAnswersAndLogo_1s_CorrectAnswer,
    ];

    // After first question add random intro add video
    if (i === PRODUCED_SHORTS_LIMIT_SLICE_FROM + 1) {
      videosToMergeForSingleQuestion.push(randomIntroAdd);
    }

    // Afret last question add random zasady egzaminu video
    if (i === drivingQuestions.length + PRODUCED_SHORTS_LIMIT_SLICE_FROM) {
      videosToMergeForSingleQuestion.push(zasadyEgzaninuRandom);
    }

    log(111111111, { i, length: drivingQuestions.length, PRODUCED_SHORTS_LIMIT_SLICE_FROM });

    const singleQuestion = await mergeVideos(
      videosToMergeForSingleQuestion,
      pb(`_${i}_____${examNumber}_step6_single_question.mp4`)
    );

    examVideosPaths.push(...videosToMergeForSingleQuestion);

    const singleQuestionDuration = await getVideoDuration(singleQuestion);

    exam_horizontal_timestamps.push({ text, startTime });
    startTime += singleQuestionDuration;

    if (false && media) {
      // create Yt short for each question with media
      const bg = await manipulateVideo(baseVideo, pb(`_${i}_____${examNumber}_${id}_bg.mp4`), 0, VIDEO_DURATION_LIMIT, {
        size,
        blur: 15,
        crop: 10,
      });

      const inner = await manipulateVideo(
        baseVideo,
        pb(`_${i}_____${examNumber}_${id}_inner.mp4`),
        0,
        VIDEO_DURATION_LIMIT,
        {
          size: `${WIDTH / 2}x${HEIGHT / 2}`,
          blur: 0,
          crop: 5,
        }
      );

      const videoInVideo = await putVideoOnVideo(bg, inner, pb(`_${i}_____${examNumber}_${id}_video_in_video.mp4`));

      const videoInVideoVertical = await makeVideoVertical(
        videoInVideo,
        pb(`_${i}_____${examNumber}_${id}_video_in_video_vertical.mp4`)
      );

      // const videoInVideoVerticalWithLogo = await putPngOnVideo(
      //   videoInVideoVertical  ,
      //   logo,
      //   pb( `_${i}_____${examNumber}_${id}_video_in_video_vertical_with_logo.mp4`),
      //   20,
      //   100
      // );

      const videoInVideoVerticalWithLogoAndMp3 = await addMp3ToVideo(
        videoInVideoVertical,
        p(audioPath, textToSlug160(text) + ".mp3"),
        pb(`_${i}_____${examNumber}_videoInVideoVerticalWithLogoAndMp3.mp4`)
      );

      const duration = await getVideoDuration(videoInVideoVertical);

      const lastFrameVideoInVideoVerticalWithLogo = await manipulateVideo(
        videoInVideoVertical,
        pb(`_${i}_____${examNumber}_last_frame_vertical.mp4`),
        duration - 0.05,
        duration,
        {}
      );

      const verticalAnswer = await addMp3ToVideo(
        lastFrameVideoInVideoVerticalWithLogo,
        correctAnswerMp3,
        pb(`_${i}_____${examNumber}_vertical_answer.mp4`)
      );

      const verticalLastFrameMp4_1s = await addMp3ToVideo(
        lastFrameVideoInVideoVerticalWithLogo,
        mp3_1000,
        pb(`_${i}_____${examNumber}_vertical_last_frame_1s.mp4`)
      );

      const verticalSingleQuestion = await mergeVideos(
        [videoInVideoVerticalWithLogoAndMp3, verticalLastFrameMp4_1s, verticalAnswer, verticalLastFrameMp4_1s],
        pb(`${i}__${examNumber}_single_question_vertical.mp4`)
      );

      copyFileSync(verticalSingleQuestion, p(PRODUCED_FOLDER, f(verticalSingleQuestion).nameWithExt));
      copyFileSync(verticalSingleQuestion, p(PRODUCED_FOLDER, `${i} ${safeFileName(text)}.mp4`));
      copyFileSync(verticalSingleQuestion, p(PRODUCED_FOLDER, `${safeFileName(text)}.mp4`));

      vertical_examVideosPaths.push(verticalSingleQuestion);

      const duration_vertical = await getVideoDuration(verticalSingleQuestion);
      const trimData = { text, trimFrom, trimTo: trimFrom + duration_vertical, nameBasedOn: verticalSingleQuestion };
      trimFrom += duration_vertical;
      exam_vertical_trim_data.push(trimData);
    }
  }

  drivingQuestions.forEach((q, i) => {
    log(i + 1, q.text);
  });

  // ADD CAPTIONS FROM CAPTIONS APP
  if (false) {
    const exam_vertical_CAPTIONS = pb(`exam_vertical_CAPTIONS.mp4`);
    const isExamVerticalWithCaptions = existsSync(exam_vertical_CAPTIONS);
    log({ isExamVerticalWithCaptions, exam_vertical_trim_data });

    if (isExamVerticalWithCaptions) {
      await mergeVideos(vertical_examVideosPaths, pb(`___exam_vertical.mp4`));
      const [logoOnCaptions] = await textToPng("poznaj-testy.pl", pb("logo_on_captions.png"), {
        maxWidth: 700,
        fontSize: 75,
        lineHeight: 90,
        margin: 15,
        bgColor: "yellow",
        textColor: "black",
      });

      for (const { text, trimFrom, trimTo, nameBasedOn } of exam_vertical_trim_data) {
        const exam_vertical_captions = await manipulateVideo(
          exam_vertical_CAPTIONS,
          pb(f(nameBasedOn).name + "_CAPTIONS.mp4"),
          trimFrom + 0.1,
          trimTo - 0.1,
          {}
        );

        const vertical_with_captions = await putPngOnVideo(
          exam_vertical_captions,
          pb(logoOnCaptions),
          pb(f(nameBasedOn).name + "_logo_CAPTIONS.mp4"),
          23,
          170
        );

        copyFileSync(vertical_with_captions, p(PRODUCED_FOLDER, `${safeFileName(text)}.mp4`));
      }
    }
  }

  log({ examVideosPaths });
  const producedSingleExamVideo = await mergeVideos(examVideosPaths, pb(`___exam_${examSlug}.mp4`));
  if (PRODUCED_SHORTS_LIMIT_SLICE_TO > 30) {
    // remove created exam from exams list
    writeJsonSync(p(__dirname, "data", "exams-b-random.json"), { exams: exams.slice(1) });
  }

  const videoDescriptionText = exam_horizontal_timestamps
    .map(({ text, startTime }, i) => `${convertSecondsToYtTimestamp(startTime)} ${i + 1}) ${text}`)
    .join("\n\n");

  const examDescriptionTxtFile = pb(`___exam_${examSlug} youtube description.txt`);
  writeFileSync(examDescriptionTxtFile, videoDescriptionText);

  const producedExamFolderToCopyTo = p(PRODUCED_FOLDER, `exam_${examNumber}`);
  ensureDirSync(producedExamFolderToCopyTo);

  const examVideoTitle = safeFileName(firstQuestionText);
  const examVieoCopiedDestination = p(producedExamFolderToCopyTo, `${safeFileName(examVideoTitle)}.mp4`);

  copyFileSync(producedSingleExamVideo, examVieoCopiedDestination);
  copyFileSync(examDescriptionTxtFile, p(producedExamFolderToCopyTo, `youtube description.txt`));

  const thumbnail1 = await createScreenshot(
    producedSingleExamVideo,
    p(producedExamFolderToCopyTo, `${safeFileName(examVideoTitle)}_1.png`),
    "00:00:05"
  );

  const thumbnail2 = await createScreenshot(
    producedSingleExamVideo,
    p(producedExamFolderToCopyTo, `${safeFileName(examVideoTitle)}_2.png`),
    "00:00:07"
  );

  const thumbnail3 = await createScreenshot(
    producedSingleExamVideo,
    p(producedExamFolderToCopyTo, `${safeFileName(examVideoTitle)}_3.png`),
    "00:00:10"
  );
};
