import { addMp3ToVideo, makeVideoVertical, manipulateVideo, mergeVideos, putVideoOnVideo } from "./ffmpeg";
import { f, log, p } from "./utils";

export const videoInVideo = async (
  settings: any,
  timePoints: number[],
  duration: number,
  mp3Name: string,
  prefix: string
) => {
  const video = p(settings.BASE_FOLDER, "8L8e644RCtA.mp4");
  log("videoInVideo", { video });

  let iterator = 0;

  for (const point of timePoints) {
    iterator++;

    await manipulateVideo(
      video,
      f(video).path + `/${prefix}_bg_${iterator}.mp4`,
      point - duration / 2,
      point + duration / 2,
      {
        size: "1920x1080",
        blur: 10,
        crop: 23, // percent of frame of the wideo to crop
      }
    );

    await manipulateVideo(
      video,
      f(video).path + `/${prefix}_inner_${iterator}.mp4`,
      point - duration / 2,
      point + duration / 2,
      {
        size: "860x540",
        crop: 23, // percent of frame of the wideo to crop
      }
    );
  }

  iterator = 0;
  for (const point of timePoints) {
    iterator++;
    const videoBg = p(settings.BASE_FOLDER, `${prefix}_bg_${iterator}.mp4`);
    const videoInner = p(settings.BASE_FOLDER, `${prefix}_inner_${iterator}.mp4`);

    await putVideoOnVideo(videoBg, videoInner, f(video).path + `/${prefix}_produced_${iterator}.mp4`);
  }

  iterator = 0;
  for (const point of timePoints) {
    iterator++;
    const producedVideo = p(settings.BASE_FOLDER, `${prefix}_produced_${iterator}.mp4`);
    const mp3 = p(settings.BASE_FOLDER, mp3Name);
    const videoWithAudio = p(settings.BASE_FOLDER, `${prefix}_video_with_audio_${iterator}.mp4`);

    await addMp3ToVideo(producedVideo, mp3, videoWithAudio);
  }

  iterator = 0;
  for (const point of timePoints) {
    iterator++;

    const producedVideo = p(settings.BASE_FOLDER, `${prefix}_video_with_audio_${iterator}.mp4`);
    const verticalVideo = p(settings.BASE_FOLDER, `${prefix}_vertical_${iterator}.mp4`);

    await makeVideoVertical(producedVideo, verticalVideo);
  }

  iterator = 0;
  for (const point of timePoints) {
    iterator++;

    const v1 = p(settings.BASE_FOLDER, `intro_vertical_${iterator}.mp4`);
    const v2 = p(settings.BASE_FOLDER, `otter_vertical_${iterator}.mp4`);

    await mergeVideos([v1, v2], f(v1).path + `/_final_${iterator}.mp4`);
  }
};
