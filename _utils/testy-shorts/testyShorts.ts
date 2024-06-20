import { copyFileSync, ensureDirSync, writeFileSync } from "fs-extra";
import {
  addMp3ToVideo,
  makeVideoVertical,
  manipulateVideo,
  mergeVideos,
  putPngOnVideo,
  putVideoOnVideo,
} from "../ffmpeg";
import { DrivingQuestion, Job } from "../types";
import { f, log, p, safeFileName, textToPng, textToSlug160 } from "../utils";
import { difficultQuestionsDB } from "./difficultQuestionsDB";

export const createTestyShorts = async (job: Job) => {
  const scale = 1;
  const WIDTH = 1920 / scale;
  const HEIGHT = 1080 / scale;
  const START = 7;
  const PRODUCED_SHORTS_LIMIT_SLICE_FROM = START;
  const PRODUCED_SHORTS_LIMIT_SLICE_TO = START + 1;
  const VIDEO_DURATION_LIMIT = 1;

  const { BASE_DIR, BASE_FOLDER } = job;
  const PRODUCED_FOLDER = `${BASE_FOLDER}_PRODUCED`;
  ensureDirSync(BASE_FOLDER);
  ensureDirSync(PRODUCED_FOLDER);
  const videoPath = p(BASE_DIR, "_ignore_files");
  const audioPath = p(BASE_DIR, "_ignore_files_mp3");

  const [logo] = await textToPng("poznaj-testy.pl", p(BASE_FOLDER, "logo.png"), {});

  const drivingQuestions: DrivingQuestion[] = difficultQuestionsDB
    .map((q) => ({
      id: q.question.id,
      text: q.question.text,
      media: q.question.media,
      r: q.question.r,
      a: q.question.a,
      b: q.question.b,
      c: q.question.c,
      categories: q.question.categories,
    }))
    .filter((q) => q.media.includes(".mp4"))
    .filter((q) => q.r === "t" || q.r === "n")
    .slice(PRODUCED_SHORTS_LIMIT_SLICE_FROM, PRODUCED_SHORTS_LIMIT_SLICE_TO);

  log("drivingQuestions", drivingQuestions.length, drivingQuestions[0]);

  let i = 0;

  for (const drivingQuestion of drivingQuestions) {
    i++;
    log("iteration", i, drivingQuestions.length);

    const { id, media, text, r } = drivingQuestion;

    const sourceVideo = p(videoPath, media);

    const bg = await manipulateVideo(sourceVideo, p(BASE_FOLDER, `_${i}_${id}_bg.mp4`), 0, VIDEO_DURATION_LIMIT, {
      size: `${WIDTH}x${HEIGHT}`,
      blur: 15,
      crop: 10,
    });

    const inner = await manipulateVideo(sourceVideo, p(BASE_FOLDER, `_${i}_${id}_inner.mp4`), 0, VIDEO_DURATION_LIMIT, {
      size: `${WIDTH / 2}x${HEIGHT / 2}`,
      blur: 0,
      crop: 5,
    });

    const videoInVideo = await putVideoOnVideo(bg, inner, p(BASE_FOLDER, `_${i}_${id}_video_in_video.mp4`));

    const videoInVideoVertical = await makeVideoVertical(
      videoInVideo,
      p(BASE_FOLDER, `_${i}_${id}_video_in_video_vertical.mp4`)
    );

    const videoInVideoVerticalWithLogo = await putPngOnVideo(
      videoInVideoVertical as string,
      logo,
      p(BASE_FOLDER, `_${i}_${id}_video_in_video_vertical_with_logo.mp4`),
      20,
      100
    );

    // const questionTextPng = await textToPng(text, p(BASE_FOLDER, `_${i}_${id}_question_text.png`), {
    //   maxWidth: 500,
    //   fontSize: 25,
    //   lineHeight: 30,
    //   margin: 10,
    //   bgColor: "#475569", // slate 600
    //   textColor: "white",
    // });

    // const videoInVideoVertical_logo_text = await putPngOnVideo(
    //   videoInVideoVerticalWithLogo as string,
    //   questionTextPng,
    //   p(BASE_FOLDER, `_${i}_${id}_video_in_video_vertical_logo_text.mp4`),
    //   20,
    //   700
    // );

    const videoInVideoVertical_logo_text_pytanie = await addMp3ToVideo(
      videoInVideoVerticalWithLogo as string,
      p(audioPath, textToSlug160(text) + ".mp3"),
      p(BASE_FOLDER, `_${i}_${id}_video_in_video_vertical_logo_text_pytanie.mp4`)
    );

    const videoInVideoVertical_logo_text_odpowiedz = await addMp3ToVideo(
      videoInVideoVerticalWithLogo as string,
      p(audioPath, textToSlug160(r === "t" ? "odpowiedź tak" : "odpowiedź nie") + ".mp3"),
      p(BASE_FOLDER, `_${i}_${id}_video_in_video_vertical_logo_text_odpowiedz.mp4`)
    );

    const finalShort = await mergeVideos(
      [videoInVideoVertical_logo_text_pytanie as string, videoInVideoVertical_logo_text_odpowiedz as string],
      p(BASE_FOLDER, `${i}_${id}_finalShort.mp4`)
    );

    const newName = text;
    copyFileSync(finalShort as string, p(PRODUCED_FOLDER, f(finalShort as string).nameWithExt));
    copyFileSync(finalShort as string, p(PRODUCED_FOLDER, `${i} ${safeFileName(newName)}.mp4`));
    copyFileSync(finalShort as string, p(PRODUCED_FOLDER, `${safeFileName(newName)}.mp4`));
  }

  drivingQuestions.forEach((q, i) => {
    log(i + 1, q.text);
  });
};
