import { copyFileSync, ensureDirSync, existsSync, readFileSync, readJSON, readJSONSync, writeFileSync } from "fs-extra";
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
import { convertSecondsToYtTimestamp, f, log, p, safeFileName, textToPng, textToSlug160 } from "../utils";
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

  // Example usage

  const transp = pb("_____transparent.png");
  await createTransparentPng(1800, 1080, transp);

  // Example usage

  const texttt = pb("_____text.png");
  await createPngWithText(900, 100, "red", "lorem ipsum dolor", {}, texttt);

  const mergeddd = pb("_____merged.png");
  await overlayPng(texttt, transp, mergeddd, 100, 200);

  const scale = 1;
  const WIDTH = 1920 / scale;
  const HEIGHT = 1080 / scale;
  const PRODUCED_SHORTS_LIMIT_SLICE_FROM = 0;
  const PRODUCED_SHORTS_LIMIT_SLICE_TO = 9999999;
  const VIDEO_DURATION_LIMIT = 999999999;

  // const scale = 4;
  // const WIDTH = 1920 / scale;
  // const HEIGHT = 1080 / scale;
  // const PRODUCED_SHORTS_LIMIT_SLICE_FROM = 0;
  // const PRODUCED_SHORTS_LIMIT_SLICE_TO = 1;
  // const VIDEO_DURATION_LIMIT = 0.5;

  const exams_b_random: ExamDataObj = readJSONSync(p(__dirname, "data", "exams-b-random.json"));
  const { exams } = exams_b_random;

  // const randomExam = exams[Math.floor(Math.random() * exams.length)];
  const randomExam = exams[0];
  const { examSlug } = randomExam;
  const examNumber = examSlug.split("-")[2];

  const drivingQuestions = randomExam.examQuestions32.slice(
    PRODUCED_SHORTS_LIMIT_SLICE_FROM,
    PRODUCED_SHORTS_LIMIT_SLICE_TO
  );

  const videoPath = p(BASE_DIR, "_ignore_files");
  const audioPath = p(BASE_DIR, "_ignore_files_mp3");
  const mp3_1000 = p(BASE_DIR, "_silent_mp3", "1000.mp3");
  const mp4_1000 = p(BASE_DIR, "_silent_mp3", "1000.mp4");
  const blankPng = p(BASE_DIR, "_silent_mp3", "blank.png");

  const [logo, logoWidth, logoHeight] = await textToPng("poznaj-testy.pl", pb("x__logo.png"), {
    maxWidth: 250,
    fontSize: 35,
    lineHeight: 40,
    margin: 10,
    bgColor: "transparent", // "#475569", // slate 600
    textColor: "black",
  });

  let i = 0;
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

    const fn = async (): Promise<string> => {
      const resizeSourceMedia = await sharp(readFileSync(sourceMedia)).resize(WIDTH, HEIGHT).png().toBuffer();
      writeFileSync(pb(`x__${i}_${examNumber}_resizeSourceMedia.png`), resizeSourceMedia);

      const mp4_1000Resized = await manipulateVideo(
        mp4_1000,
        pb(`_${i}_${examNumber}_mp4_1000Resized.mp4`),
        0,
        VIDEO_DURATION_LIMIT,
        { size: `${WIDTH}x${HEIGHT}` }
      );

      const sourceMediaPngConvertedToVideo = await putPngOnVideo(
        mp4_1000Resized,
        pb(`x__${i}_${examNumber}_resizeSourceMedia.png`),
        pb(`_${i}_${examNumber}_source_video.mp4`)
      );

      return sourceMediaPngConvertedToVideo;
    };

    const baseVideo = await manipulateVideo(
      isVideo ? sourceMedia : await fn(),
      pb(`_${i}_${examNumber}_1_base_video.mp4`),
      0,
      VIDEO_DURATION_LIMIT,
      {
        size: `${WIDTH}x${HEIGHT}`, // `1920x1080
        blur: 0,
        crop: 0,
      }
    );

    const xxx = await putPngOnVideo(baseVideo, mergeddd, pb(`_____xxxx.mp4`), 0, 0);

    return;

    const [questionTextAsPng, qw, qh] = await textToPng(
      `${i}. ${text}`,
      pb(`x__${i}_${examNumber}_2_question_text.png`),
      {
        maxWidth: WIDTH - 2 * 100,
        fontSize: 50,
        lineHeight: 60,
        margin: 10,
        bgColor: "#475569", // "transparent", // slate 600
        textColor: "white",
        // textAlign: "center",
      }
    );

    const [answerA, wa, ha] = await textToPng(`A) ${a}`, pb(`x__${i}_${examNumber}_2_answer_a.png`), {
      maxWidth: WIDTH - 2 * 100,
      fontSize: 50,
      lineHeight: 60,
      margin: 10,
      bgColor: "#475569", // "transparent", // slate 600
      textColor: "white",
    });

    const [answerB, wb, hb] = await textToPng(`B) ${b}`, pb(`x__${i}_${examNumber}_2_answer_b.png`), {
      maxWidth: WIDTH - 2 * 100,
      fontSize: 50,
      lineHeight: 60,
      margin: 10,
      bgColor: "#475569", // "transparent", // slate 600
      textColor: "white",
    });

    const [answerC, wc, hc] = await textToPng(`C) ${c}`, pb(`x__${i}_${examNumber}_2_answer_c.png`), {
      maxWidth: WIDTH - 2 * 100,
      fontSize: 50,
      lineHeight: 60,
      margin: 10,
      bgColor: "#475569", // "transparent", // slate 600
      textColor: "white",
    });

    const baseVideoWithPngText = await putPngOnVideo(
      baseVideo,
      questionTextAsPng,
      pb(`_${i}_${examNumber}_3_base_video_with_pngText.mp4`),
      100,
      HEIGHT - (a ? hc + hb + ha + qh : qh + 100)
    );

    const baseVideoWithPngTextA = await putPngOnVideo(
      baseVideoWithPngText,
      answerA,
      pb(`_${i}_${examNumber}_3_base_video_with_pngText_a.mp4`),
      100,
      HEIGHT - (hc + hb + ha)
    );

    const baseVideoWithPngTextB = await putPngOnVideo(
      baseVideoWithPngTextA,
      answerB,
      pb(`_${i}_${examNumber}_3_base_video_with_pngText_b.mp4`),
      100,
      HEIGHT - (hc + hb)
    );

    const baseVideoWithPngTextC = await putPngOnVideo(
      baseVideoWithPngTextB,
      answerC,
      pb(`_${i}_${examNumber}_3_base_video_with_pngText_c.mp4`),
      100,
      HEIGHT - hc
    );

    const baseVideoWithPngTextAndLogo = await putPngOnVideo(
      a ? baseVideoWithPngTextC : baseVideoWithPngText,
      logo,
      pb(`_${i}_${examNumber}_4_base_video_with_pngText_and_answers_and_logo.mp4`),
      WIDTH / 2 - 120,
      20
    );

    const textMp3 = p(audioPath, textToSlug160(text) + ".mp3");

    const baseVideoWithPngTextAndLogoAndMp3 = await addMp3ToVideo(
      baseVideoWithPngTextAndLogo,
      textMp3,
      pb(`_${i}_${examNumber}_5_base_video_with_pngText_and_answers_and_logo_and_mp3.mp4`)
    );

    const duration = await getVideoDuration(baseVideoWithPngTextAndLogoAndMp3);

    const lastFrameWidthTextAndLogo = await manipulateVideo(
      baseVideoWithPngTextAndLogo,
      pb(`_${i}_${examNumber}_6_last_frame_width_text_and_logo.mp4`),
      duration - 0.05,
      duration,
      {
        size: `${WIDTH}x${HEIGHT}`,
        blur: 0,
        crop: 0,
      }
    );

    const lastFrameWidthTextAndLogo_1s = await addMp3ToVideo(
      lastFrameWidthTextAndLogo,
      mp3_1000,
      pb(`_${i}_${examNumber}_6_last_frame_width_text_and_logo_1s.mp4`)
    );

    let answerText = "";
    if (r === "t") answerText = "odpowiedź tak";
    if (r === "n") answerText = "odpowiedź nie";
    if (r === "a") answerText = `odpowiedź a ${a}`;
    if (r === "b") answerText = `odpowiedź b ${b}`;
    if (r === "c") answerText = `odpowiedź c ${c}`;

    const correctAnswerMp3 = p(audioPath, textToSlug160(answerText) + ".mp3");

    const lastFrameWidthTextAndLogoAndAnswer = await addMp3ToVideo(
      lastFrameWidthTextAndLogo,
      correctAnswerMp3,
      pb(`_${i}_${examNumber}_7_last_frame_width_text_and_logo_and_answer.mp4`)
    );

    const lastFrameWithQuestionText = await putPngOnVideo(
      lastFrameWidthTextAndLogo,
      questionTextAsPng,
      pb(`_${i}_${examNumber}_7_last_frame_with_question_text.mp4`),
      100,
      HEIGHT - 200
    );

    const lastFrameWithAnswerA = await putPngOnVideo(
      lastFrameWidthTextAndLogo,
      questionTextAsPng,
      pb(`_${i}_${examNumber}_last_frame_with_answer_a.mp4`),
      100,
      HEIGHT - 200
    );

    const lastFrameWithQuestionTextAndLogo = await putPngOnVideo(
      lastFrameWithQuestionText,
      logo,
      pb(`_${i}_${examNumber}_lastFrameWithQuestionTextAndLogo.mp4`),
      WIDTH / 2 - 120,
      20
    );

    const lastFrameMp4_1s = await addMp3ToVideo(
      lastFrameWithQuestionTextAndLogo,
      mp3_1000,
      pb(`_${i}_${examNumber}_lastFrame_1s.mp4`)
    );

    const videoWithAnswer = await addMp3ToVideo(
      lastFrameWithQuestionTextAndLogo,
      correctAnswerMp3,
      pb(`_${i}_${examNumber}_videoWithAnswer.mp4`)
    );

    const singleQuestion = await mergeVideos(
      [
        baseVideoWithPngTextAndLogoAndMp3,
        lastFrameWidthTextAndLogo_1s,
        lastFrameWidthTextAndLogo_1s,
        lastFrameWidthTextAndLogoAndAnswer,
        lastFrameWidthTextAndLogo_1s,
        lastFrameWidthTextAndLogo_1s,
      ],
      pb(`_${i}_${examNumber}_8_single_question.mp4`)
    );

    copyFileSync(singleQuestion, pb(`__${i}_${examNumber}_8_single_question.mp4`));

    examVideosPaths.push(singleQuestion);

    const singleQuestionDuration = await getVideoDuration(singleQuestion);
    exam_horizontal_timestamps.push({ text, startTime });
    startTime += singleQuestionDuration;

    if (media) {
      // create Yt short for each question with media
      const bg = await manipulateVideo(baseVideo, pb(`_${i}_${examNumber}_${id}_bg.mp4`), 0, VIDEO_DURATION_LIMIT, {
        size: `${WIDTH}x${HEIGHT}`,
        blur: 15,
        crop: 10,
      });

      const inner = await manipulateVideo(
        baseVideo,
        pb(`_${i}_${examNumber}_${id}_inner.mp4`),
        0,
        VIDEO_DURATION_LIMIT,
        {
          size: `${WIDTH / 2}x${HEIGHT / 2}`,
          blur: 0,
          crop: 5,
        }
      );

      const videoInVideo = await putVideoOnVideo(bg, inner, pb(`_${i}_${examNumber}_${id}_video_in_video.mp4`));

      const videoInVideoVertical = await makeVideoVertical(
        videoInVideo,
        pb(`_${i}_${examNumber}_${id}_video_in_video_vertical.mp4`)
      );

      // const videoInVideoVerticalWithLogo = await putPngOnVideo(
      //   videoInVideoVertical  ,
      //   logo,
      //   pb( `_${i}_${examNumber}_${id}_video_in_video_vertical_with_logo.mp4`),
      //   20,
      //   100
      // );

      const videoInVideoVerticalWithLogoAndMp3 = await addMp3ToVideo(
        videoInVideoVertical,
        p(audioPath, textToSlug160(text) + ".mp3"),
        pb(`_${i}_${examNumber}_videoInVideoVerticalWithLogoAndMp3.mp4`)
      );

      const duration = await getVideoDuration(videoInVideoVertical);

      const lastFrameVideoInVideoVerticalWithLogo = await manipulateVideo(
        videoInVideoVertical,
        pb(`_${i}_${examNumber}_last_frame_vertical.mp4`),
        duration - 0.05,
        duration,
        {}
      );

      const verticalAnswer = await addMp3ToVideo(
        lastFrameVideoInVideoVerticalWithLogo,
        correctAnswerMp3,
        pb(`_${i}_${examNumber}_vertical_answer.mp4`)
      );

      const verticalLastFrameMp4_1s = await addMp3ToVideo(
        lastFrameVideoInVideoVerticalWithLogo,
        mp3_1000,
        pb(`_${i}_${examNumber}_vertical_last_frame_1s.mp4`)
      );

      const verticalSingleQuestion = await mergeVideos(
        [videoInVideoVerticalWithLogoAndMp3, verticalLastFrameMp4_1s, verticalAnswer, verticalLastFrameMp4_1s],
        pb(`${i}_${examNumber}_single_question_vertical.mp4`)
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

  await mergeVideos(examVideosPaths, pb(`___exam_${examSlug}.mp4`));

  const videoDescriptionText = exam_horizontal_timestamps
    .map(({ text, startTime }, i) => `${convertSecondsToYtTimestamp(startTime)} ${i + 1}) ${text}`)
    .join("\n\n");
  writeFileSync(pb("___opis na youtube.txt"), videoDescriptionText);

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
};
