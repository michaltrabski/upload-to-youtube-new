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
  const exams_b_random: ExamDataObj = readJSONSync(p(__dirname, "data", "exams-b-random.json"));
  const { exams } = exams_b_random;

  try {
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
    // const PNG_BG_COLOR = "rgb(71 85 105)";
    // const PNG_BG_COLOR_GREEN = "#15803d";
    // const DISABLE_ADDS = false;

    const scale = 2;
    const WIDTH = 1920 / scale;
    const HEIGHT = 1080 / scale;
    const VIDEO_DURATION_LIMIT = 2;
    const PRODUCED_SHORTS_LIMIT_SLICE_FROM = 20;
    const PRODUCED_SHORTS_LIMIT_SLICE_TO = 20 + 1;
    const GAP = 20;
    const PNG_BG_COLOR = "rgb(71 85 105)";
    const PNG_BG_COLOR_GREEN = "#15803d";
    const DISABLE_ADDS = false;

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

    // // EXAM INTRO VIDEOS
    // const examIntro1 = p(BASE_DIR, "_helper_videos", "testy-na-prawo-jazdy", "egzamin-b-intro-1.mp4");
    // const examIntro2 = p(BASE_DIR, "_helper_videos", "testy-na-prawo-jazdy", "egzamin-b-intro-2.mp4");
    // const examIntro3 = p(BASE_DIR, "_helper_videos", "testy-na-prawo-jazdy", "egzamin-b-intro-3.mp4");
    // const examIntro4 = p(BASE_DIR, "_helper_videos", "testy-na-prawo-jazdy", "egzamin-b-intro-4.mp4");
    // const examIntro1Formatted = await manipulateVideo(examIntro1, pb(`_examIntro1_formatted.mp4`), 0, 9999, { size });
    // const examIntro2Formatted = await manipulateVideo(examIntro2, pb(`_examIntro2_formatted.mp4`), 0, 9999, { size });
    // const examIntro3Formatted = await manipulateVideo(examIntro3, pb(`_examIntro3_formatted.mp4`), 0, 9999, { size });
    // const examIntro4Formatted = await manipulateVideo(examIntro4, pb(`_examIntro4_formatted.mp4`), 0, 9999, { size });
    // const examIntros = [examIntro1Formatted, examIntro2Formatted, examIntro3Formatted, examIntro4Formatted];
    // const randomExamIntro = examIntros[Math.floor(Math.random() * examIntros.length)];

    // // THIS IS EXAM VIDEOS
    // const thisIsExam1 = p(BASE_DIR, "_helper_videos", "testy-na-prawo-jazdy", "to-jest-egzamin-b-1.mp4");
    // const thisIsExam2 = p(BASE_DIR, "_helper_videos", "testy-na-prawo-jazdy", "to-jest-egzamin-b-2.mp4");
    // const thisIsExam3 = p(BASE_DIR, "_helper_videos", "testy-na-prawo-jazdy", "to-jest-egzamin-b-3.mp4");
    // const thisIsExam4 = p(BASE_DIR, "_helper_videos", "testy-na-prawo-jazdy", "to-jest-egzamin-b-4.mp4");
    // const thisIsExam5 = p(BASE_DIR, "_helper_videos", "testy-na-prawo-jazdy", "to-jest-egzamin-b-5.mp4");
    // const thisIsExam1Formatted = await manipulateVideo(thisIsExam1, pb(`_thisIsExam1_formatted.mp4`), 0, 9999, {
    //   size,
    // });
    // const thisIsExam2Formatted = await manipulateVideo(thisIsExam2, pb(`_thisIsExam2_formatted.mp4`), 0, 9999, {
    //   size,
    // });
    // const thisIsExam3Formatted = await manipulateVideo(thisIsExam3, pb(`_thisIsExam3_formatted.mp4`), 0, 9999, {
    //   size,
    // });
    // const thisIsExam4Formatted = await manipulateVideo(thisIsExam4, pb(`_thisIsExam4_formatted.mp4`), 0, 9999, {
    //   size,
    // });
    // const thisIsExam5Formatted = await manipulateVideo(thisIsExam5, pb(`_thisIsExam5_formatted.mp4`), 0, 9999, {
    //   size,
    // });
    // const thisIsExams = [
    //   thisIsExam1Formatted,
    //   thisIsExam2Formatted,
    //   thisIsExam3Formatted,
    //   thisIsExam4Formatted,
    //   thisIsExam5Formatted,
    // ];
    // const randomThisIsExam = thisIsExams[Math.floor(Math.random() * thisIsExams.length)];

    // const zasadyEgzaminu1 = p(BASE_DIR, "_silent_mp3", "zasady egzaminu 1.mp4");
    // const zasadyEgzaminu2 = p(BASE_DIR, "_silent_mp3", "zasady egzaminu 2.mp4");
    // const zasadyEgzaminu1Formatted = await manipulateVideo(
    //   zasadyEgzaminu1,
    //   pb(`_zasady_egzaminu_1_formatted.mp4`),
    //   0,
    //   9999,
    //   { size }
    // );
    // const zasadyEgzaninuArr = [zasadyEgzaminu1Formatted];
    // const zasadyEgzaninuRandom = zasadyEgzaninuArr[Math.floor(Math.random() * zasadyEgzaninuArr.length)];

    const [logo, logoWidth, logoHeight] = await textToPng("poznaj-testy.pl", pb("poznaj-testy.png"), {
      maxWidth: 250,
      fontSize: 35 / scale,
      lineHeight: 40 / scale,
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

      // PNGs
      const questionTextPngPromise = textToPng(`${i}. ${text}`, pb(`${i}__${examNumber}_question_text.png`), {
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

      const videosToMergeForSingleQuestion = [
        baseVideoWithPngTextAndLogoAndMp3,
        lastFrameWidthTextAndAnswersAndLogo_1s,
        lastFrameWidthTextAndAnswersAndLogo_1s,
        lastFrameWidthTextAndLogoAndAnswer_CorrectAnswer,
        lastFrameWidthTextAndAnswersAndLogo_1s_CorrectAnswer,
        lastFrameWidthTextAndAnswersAndLogo_1s_CorrectAnswer,
      ];

      // Before 1 question add random intro add video
      if (i === PRODUCED_SHORTS_LIMIT_SLICE_FROM + 1 && !DISABLE_ADDS) {
        // videosToMergeForSingleQuestion.unshift(randomExamIntro);
      }

      // After 3 question add random intro add video
      if (i === PRODUCED_SHORTS_LIMIT_SLICE_FROM + 3 && !DISABLE_ADDS) {
        // videosToMergeForSingleQuestion.push(randomThisIsExam);
      }

      // Afret last question add random zasady egzaminu video
      // if (i === drivingQuestions.length + PRODUCED_SHORTS_LIMIT_SLICE_FROM && !DISABLE_ADDS) {
      //   videosToMergeForSingleQuestion.push(zasadyEgzaninuRandom);
      // }

      console.log({ i, length: drivingQuestions.length, PRODUCED_SHORTS_LIMIT_SLICE_FROM });

      const singleQuestion = await mergeVideos(
        videosToMergeForSingleQuestion,
        pb(`_${i}_____${examNumber}_step6_single_question.mp4`)
      );

      examVideosPaths.push(...videosToMergeForSingleQuestion);

      const singleQuestionDuration = await getVideoDuration(singleQuestion);

      exam_horizontal_timestamps.push({ text, startTime });
      startTime += singleQuestionDuration;

      if (true && media) {
        // create Yt short for each question with media
        const bgPromise = manipulateVideo(
          baseVideo,
          pb(`_${i}_____${examNumber}_${id}_bg.mp4`),
          0,
          VIDEO_DURATION_LIMIT,
          {
            size,
            blur: 15,
            crop: 10,
          }
        );

        const innerPromise = manipulateVideo(
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

        const [bg, inner] = await Promise.all([bgPromise, innerPromise]);

        const videoInVideo = await putVideoOnVideo(bg, inner, pb(`_${i}_____${examNumber}_${id}_video_in_video.mp4`));

        const videoInVideoVertical = await makeVideoVertical(
          videoInVideo,
          pb(`_${i}_____${examNumber}_${id}_video_in_video_vertical.mp4`)
        );

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

        const verticalAnswerPromise = addMp3ToVideo(
          lastFrameVideoInVideoVerticalWithLogo,
          correctAnswerMp3,
          pb(`_${i}_____${examNumber}_vertical_answer.mp4`)
        );

        const verticalLastFrameMp4_1sPromise = addMp3ToVideo(
          lastFrameVideoInVideoVerticalWithLogo,
          mp3_1000,
          pb(`_${i}_____${examNumber}_vertical_last_frame_1s.mp4`)
        );

        const [verticalAnswer, verticalLastFrameMp4_1s] = await Promise.all([
          verticalAnswerPromise,
          verticalLastFrameMp4_1sPromise,
        ]);

        const verticalSingleQuestion = await mergeVideos(
          [videoInVideoVerticalWithLogoAndMp3, verticalLastFrameMp4_1s, verticalAnswer, verticalLastFrameMp4_1s],
          pb(`${i}__${examNumber}_single_question_vertical.mp4`)
        );

        const videoInVideoVerticalWithLogo = await putPngOnVideo(
          videoInVideoVertical,
          logo,
          pb(`_${i}_____${examNumber}_${id}_video_in_video_vertical_with_logo.mp4`),
          20,
          100
        );

        const [questionTextAsPngForShort, widthQuestionTextPngForShort, heightQuestionTextPngForShort] =
          await textToPng(`${text}`, pb(`${examNumber}_question_text_vertical.png`), {
            maxWidth: WIDTH / 3 - 2 * GAP,
            fontSize: 30 / scale,
            lineHeight: 40 / scale,
            margin: 10,
            // bgColor: "#475569", // slate600
            // bgColor: "#020617", // slate950
            bgColor: "rgba(2, 6, 23, 0.7)", // 0.7 is the opacity level (70% opacity)
            // bgColor: "rgba(71, 85, 105, 0.8)", // 0.8 is the opacity level (80% opacity)
            textColor: "white",
            // textAlign: "center",
          });

        const verticalSingleQuestionWithText = await putPngOnVideo(
          verticalSingleQuestion,
          questionTextAsPngForShort,
          pb(`${i}__${examNumber}_single_question_vertical_with_text.mp4`),
          20,
          (HEIGHT * 2) / 3 - heightQuestionTextPngForShort
        );

        const verticalSingleQuestionWithTextAndLogo = await putPngOnVideo(
          verticalSingleQuestionWithText,
          logo,
          pb(`${i}__${examNumber}_single_question_vertical_with_text_and_logo.mp4`),
          20,
          (HEIGHT * 2) / 3 - heightQuestionTextPngForShort
        );

        const videoToCopy = verticalSingleQuestion;

        // copyFileSync(videoToCopy, p(PRODUCED_FOLDER, f(videoToCopy).nameWithExt));
        // copyFileSync(videoToCopy, p(PRODUCED_FOLDER, `${i} ${safeFileName(text)}.mp4`));
        copyFileSync(videoToCopy, p(PRODUCED_FOLDER, `${safeFileName(text)}.mp4`));

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
          fontSize: 75 / scale,
          lineHeight: 90 / scale,
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

    const safeExamVideoTitle = safeFileName(firstQuestionText);
    const examVieoCopiedDestination = p(producedExamFolderToCopyTo, `${safeExamVideoTitle}.mp4`);

    copyFileSync(producedSingleExamVideo, examVieoCopiedDestination);
    copyFileSync(examDescriptionTxtFile, p(producedExamFolderToCopyTo, `youtube description.txt`));

    const from = producedSingleExamVideo;
    const to = producedExamFolderToCopyTo;
    await createScreenshot(from, p(to, `thumbnail_1.png`), "00:00:10");
    await createScreenshot(from, p(to, `thumbnail_2.png`), "00:00:13");
    await createScreenshot(from, p(to, `thumbnail_3.png`), "00:00:15");
    await createScreenshot(from, p(to, `thumbnail_4.png`), "00:00:18");
    await createScreenshot(from, p(to, `thumbnail_5.png`), "00:00:22");
  } catch (error) {
    console.error("There is an error in one of media from questions. I will remove all exam from exams-b-random.json");
    writeJsonSync(p(__dirname, "data", "exams-b-random.json"), { exams: exams.slice(1) });
  }
};
