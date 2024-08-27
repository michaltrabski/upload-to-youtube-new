const textToImage = require("text-to-image");
const sizeOf = require("image-size");

import fs, {
  copyFileSync,
  ensureDirSync,
  existsSync,
  readJsonSync,
  readdirSync,
  removeSync,
  writeFileSync,
} from "fs-extra";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import { Job } from "./types";
import { createVideo, getVideoDuration, manipulateVideo, mergeVideos, putVideoOnVideo } from "./ffmpeg";
import {
  createVideo_v2,
  drawTextOnVideo,
  getVideoDimensions,
  manipulateVideo_v2,
  putVideoOnVideo_v2,
} from "./ffmpeg-v2";

export const p = path.resolve;
export const log = console.log;

export const f = (str: string) => {
  const ext = path.extname(str);
  const name = path.basename(str, ext);
  const nameWithExt = path.basename(str);
  const pathToFile = path.dirname(str);
  const isDir = existsSync(str);
  const isFile = !isDir;

  return { str, path: pathToFile, name, ext, isFile, isDir, nameWithExt };
};

export const recreateDirSync = (dirPath: string) => {
  if (existsSync(dirPath)) removeSync(dirPath);
  ensureDirSync(dirPath);
};

export function createHtmlPreview(title: string, obj: any) {
  const html = `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Document</title>
    </head>
    <body>
        <h3>${title}</h3>
        <pre>${JSON.stringify(obj, null, 2)}</pre>
    </body>
    </html>`;
  ensureDirSync("STATYSTYKI");
  writeFileSync(p("STATYSTYKI", title + ".html"), html);
}

export function getEnv(variableName: any) {
  if (variableName === undefined) {
    console.log(`ERROR: ENV VARIABLE: ${variableName} is not set in .env file`);
    throw new Error(`ERROR: ENV VARIABLE: ${variableName} is not set in .env file`);
  }

  if (process.env[variableName] === undefined) {
    console.log(`ERROR: ENV VARIABLE: ${variableName} is not set in .env file`);
    throw new Error(`ERROR: ENV VARIABLE: ${variableName} is not set in .env file`);
  }

  return process.env[variableName] ?? "";
}

export async function createScreenshot(
  videoPath: string,
  outputPath: string,
  timeForScreenshot: string = "00:00:05"
): Promise<string> {
  return new Promise((resolve, reject) => {
    const t = timeForScreenshot.replace(/:/g, "_");
    const pngFileName = f(videoPath).name + "_" + t + ".png";

    log("createScreenshot", { outputPath, t, pngFileName });

    const fullOutputPath = p(outputPath, pngFileName);

    if (existsSync(fullOutputPath)) {
      resolve(pngFileName);
      return;
    }

    ffmpeg(videoPath)
      .on("end", function () {
        resolve(pngFileName);
      })
      .on("error", function (err) {
        reject(err);
      })
      .screenshots({
        count: 1,
        folder: outputPath, // Correctly use outputPath here
        filename: pngFileName, // Output file name pattern with video file name
        size: "1280x720", // Set dimensions to full HD
        timemarks: [timeForScreenshot], // Take screenshot at specified time
      });
  });
}

interface TrimData {
  trimFrom: number;
  trimTo: number;
  videoTitle: string;
  videoDescriptionArr: { time: number; text: string }[];
}
export async function trimVideoFromFolder(
  settings: Job,
  folderPath: string,
  videoToTrimName: string,
  firstTrimStartAt: number
) {
  log(`
    Triming videos with videos for poznaj testy for yt channel
    1) Provide video recorded with slideShow, exams...
    2) firstTrimStartAt param is a gap from the start of the video to the first recorded sentence (seconds)
    3) put wideo to trim with correct name like: video.mp4 (it is passed as param to function)
    4) add trim-data.json file with timestamps for each video - it is in localStorage proppable
`);

  const { BASE_FOLDER } = settings;
  const producedFolder = p(`${BASE_FOLDER}_PRODUCED`);
  ensureDirSync(BASE_FOLDER);
  ensureDirSync(producedFolder);

  log("trimVideo: ", { folderPath });

  const files = readdirSync(folderPath);
  const videoToTrim = files.find((fileName) => fileName === videoToTrimName);
  const trimData: TrimData[] = readJsonSync(p(folderPath, "trim-data.json"), { throws: false });

  if (!videoToTrim) {
    log(`There is no file with name "${videoToTrimName}" in the folder: ${folderPath}`);
    return;
  }

  if (!trimData) {
    log("There is no trim-data.json file in the folder: ", folderPath);
    return;
  }

  log("trim-data: ", trimData);

  // firstTrimStartAt is a time in seconds from video start and first trim.
  let trimFrom = 0;
  // let trimTo = 0;
  const trimDataMapped = trimData.map((el, i) => {
    // log(i, el);

    trimFrom = el.trimFrom;
    // trimTo = el.trimTo;

    log("trimFrom = ", trimFrom);

    const newEl = {
      ...el,
      trimFrom: el.trimFrom + firstTrimStartAt,
      trimTo: el.trimTo + firstTrimStartAt,
      videoDescriptionArr: el.videoDescriptionArr.map((el) => {
        // log(el.time, "there will be error for timestamps for more than 1 wideos");

        return { ...el, time: el.time - trimFrom };
      }),
    };

    return newEl;
  });

  const originalVideoPath = p(folderPath, videoToTrim);
  let counter = 0;
  for (let el of trimDataMapped) {
    counter++;
    const videoToProduceTitle = `${counter} ${el.videoTitle.replace(/[<>:"/\\|?*]/g, "")}.mp4`;

    const producedVideoPath = p(folderPath, videoToProduceTitle);
    const originalVideoTrimFrom = el.trimFrom;
    const originalVideoTrimTo = el.trimTo;
    const format = "HORIZONTAL";

    if (!fs.existsSync(p(folderPath, videoToProduceTitle))) {
      await createVideo(
        settings,
        originalVideoPath,
        producedVideoPath,
        originalVideoTrimFrom,
        originalVideoTrimTo,
        format
      );
    } else {
      log("Video already exists: ", videoToProduceTitle);
    }

    const screenshotFileName_5 = await createScreenshot(producedVideoPath, folderPath, "00:00:05");
    const screenshotFileName_7 = await createScreenshot(producedVideoPath, folderPath, "00:00:07");
    const screenshotFileName_10 = await createScreenshot(producedVideoPath, folderPath, "00:00:10");

    ensureDirSync(producedFolder);
    const destFolder = p(producedFolder, `${counter}`);
    ensureDirSync(destFolder);
    copyFileSync(producedVideoPath, p(destFolder, videoToProduceTitle));

    copyFileSync(p(folderPath, screenshotFileName_5), p(destFolder, screenshotFileName_5));
    copyFileSync(p(folderPath, screenshotFileName_7), p(destFolder, screenshotFileName_7));
    copyFileSync(p(folderPath, screenshotFileName_10), p(destFolder, screenshotFileName_10));

    const description = el.videoDescriptionArr
      .map((desc) => {
        const minutes = Math.floor(desc.time / 60);

        const seconds = Math.round(desc.time - minutes * 60);

        const youtubeTimestamp = `${minutes.toString().padStart(2, "0")}:${seconds
          .toString()
          .padStart(2, "0")}`.replace("-1:60", "00:00");

        return youtubeTimestamp + " " + desc.text;
      })
      .join("\n\n");

    writeFileSync(
      p(destFolder, "description.txt"),
      "Rozwiąż test na prawo jazdy na stronie https://www.poznaj-testy.pl/" +
        "\n\n" +
        "Lista 100 najtrudniejszych pytań: https://www.poznaj-testy.pl/statystyki" +
        "\n\n" +
        "Timestampy do pytań testowych:" +
        "\n" +
        description +
        "\n\n" +
        "Pamiętaj by uczyć się testów na prawo jazdy ze strony https://www.poznaj-testy.pl/" +
        "\n\n" +
        "Dziękuję za obejrzenie filmu. Zapraszam do subskrypcji kanału i zostawienia łapki w górę." +
        "\n\n" +
        "Lista 100 najtrudniejszych pytań: https://www.poznaj-testy.pl/statystyki"
    );
  }
}

export const convertSecondsToYtTimestamp = (_seconds: number) => {
  const seconds = Math.round(_seconds);
  const minutes = Math.floor(seconds / 60);
  const sec = seconds - minutes * 60;
  return `${minutes.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
};

export function textToSlug160(text: string) {
  text = text.toLowerCase().trim();

  const from = ["ę", "ó", "ą", "ś", "ł", "ż", "ź", "ć", "ń"];
  const to__ = ["e", "o", "a", "s", "l", "z", "z", "c", "n"];

  for (let i = 0; i < from.length; i++) {
    text = text.replace(new RegExp(from[i], "g"), to__[i]);
  }

  text = text
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  return text.slice(0, 160);
}

export const safeFileName = (text: string) => {
  return text.replace(/[<>:"/\\|?*]/g, "");
};

export const textToPng = async (
  text: string,
  procucedFileLocation: string,
  options: any
): Promise<[string, number, number]> => {
  if (existsSync(procucedFileLocation)) {
    const dimensions = sizeOf(procucedFileLocation);

    const width = dimensions.width;
    const height = dimensions.height;

    return [procucedFileLocation, width, height];
  }

  const dataUriLogo = await textToImage.generate(text, {
    fontFamily: "Arial",
    // maxWidth: 250,
    // fontSize: 35,
    // lineHeight: 40,
    // margin: 10,
    // bgColor: "yellow", // "#475569", // slate 600
    // textColor: "black",

    ...options,
  });

  writeFileSync(procucedFileLocation, dataUriLogo.split(",")[1], "base64");

  const dimensions = sizeOf(procucedFileLocation);

  const width = dimensions.width;
  const height = dimensions.height;

  return [procucedFileLocation, width, height];
};

export const createVerticalChunksShorterThan1Min = async (
  job: Job,
  originalVideoPath: string,
  producedChunkPathVertical: string,
  trimStart: number,
  trimEnd: number
) => {
  const textOptions = {
    // fontfile: "path/to/font.ttf",
    fontsize: 80,
    fontcolor: "red",
    x: "(main_w/2-text_w/2)",
    y: "1000",
    shadowcolor: "black",
    shadowx: 2,
    shadowy: 2,
    // encoding: "utf8",
  };

  const { w, h } = await getVideoDimensions(originalVideoPath);
  const smallSize = { size: `${Math.floor(w / 3.1)}x${Math.floor(h / 3.1)}` };
  log("getVideoDimensions", { w, h, smallSize });

  const horizontalBaseChunk = originalVideoPath;
  const duration = await getVideoDuration(horizontalBaseChunk);
  console.log("createVerticalChunksShorterThan1Min() =>", { duration });

  const DURATION_LIMIT = 60;
  const MAX = 60 * 60;

  if (duration < DURATION_LIMIT || !duration) {
    log(111111111, "Duration is less than 1 min", { duration });
    const _1a = await manipulateVideo_v2(horizontalBaseChunk, 0, MAX, { blur: 7 });
    const _2a = await manipulateVideo_v2(horizontalBaseChunk, 0, MAX, { ...smallSize });
    const _3a = await putVideoOnVideo_v2(_1a, _2a);
    const _4a = await createVideo_v2(job, _3a, 0, MAX, "VERTICAL");
    const _5a = await drawTextOnVideo(_4a, "Strefa egzaminacyjna", textOptions);
    const final_a = p(f(producedChunkPathVertical).path, f(producedChunkPathVertical).name + "_a.mp4");
    fs.copySync(_5a, final_a);
    fs.copySync(final_a, p(`${job.BASE_FOLDER}_PRODUCED`, f(final_a).nameWithExt));
  }

  if (duration >= DURATION_LIMIT && duration < DURATION_LIMIT * 2) {
    log(222222222, "Duration is more than 1 min and less than 2 min", { duration });
    const dur = Math.floor(duration / 2);
    const _1a = await manipulateVideo_v2(horizontalBaseChunk, 0, dur, { blur: 7 });
    const _2a = await manipulateVideo_v2(horizontalBaseChunk, 0, dur, { ...smallSize });
    const _3a = await putVideoOnVideo_v2(_1a, _2a);
    const _4a = await createVideo_v2(job, _3a, 0, MAX, "VERTICAL");
    const _5a = await drawTextOnVideo(_4a, "Strefa egzaminacyjna", textOptions);
    const final_a = p(f(producedChunkPathVertical).path, f(producedChunkPathVertical).name + "_a.mp4");
    fs.copySync(_5a, final_a);
    fs.copySync(final_a, p(`${job.BASE_FOLDER}_PRODUCED`, f(final_a).nameWithExt));

    const _1b = await manipulateVideo_v2(horizontalBaseChunk, dur, MAX, { blur: 7 });
    const _2b = await manipulateVideo_v2(horizontalBaseChunk, dur, MAX, { ...smallSize });
    const _3b = await putVideoOnVideo_v2(_1b, _2b);
    const _4b = await createVideo_v2(job, _3b, 0, MAX, "VERTICAL");
    const _5b = await drawTextOnVideo(_4b, "Strefa egzaminacyjna", textOptions);
    const final_b = p(f(producedChunkPathVertical).path, f(producedChunkPathVertical).name + "_b.mp4");
    fs.copySync(_5b, final_b);
    fs.copySync(final_b, p(`${job.BASE_FOLDER}_PRODUCED`, f(final_b).nameWithExt));
  }

  if (duration >= 2 * DURATION_LIMIT && duration < DURATION_LIMIT * 3) {
    log(333333333, "Duration is more than 2 min and less than 3 min", { duration });
    const dur = Math.floor(duration / 3);
    const _1a = await manipulateVideo_v2(horizontalBaseChunk, 0, dur, { blur: 7 });
    const _2a = await manipulateVideo_v2(horizontalBaseChunk, 0, dur, { ...smallSize });
    const _3a = await putVideoOnVideo_v2(_1a, _2a);
    const _4a = await createVideo_v2(job, _3a, 0, MAX, "VERTICAL");
    const _5a = await drawTextOnVideo(_4a, "Strefa egzaminacyjna", textOptions);
    const final_a = p(f(producedChunkPathVertical).path, f(producedChunkPathVertical).name + "_a.mp4");
    fs.copySync(_5a, final_a);
    fs.copySync(final_a, p(`${job.BASE_FOLDER}_PRODUCED`, f(final_a).nameWithExt));

    const _1b = await manipulateVideo_v2(horizontalBaseChunk, dur, dur * 2, { blur: 7 });
    const _2b = await manipulateVideo_v2(horizontalBaseChunk, dur, dur * 2, { ...smallSize });
    const _3b = await putVideoOnVideo_v2(_1b, _2b);
    const _4b = await createVideo_v2(job, _3b, 0, MAX, "VERTICAL");
    const _5b = await drawTextOnVideo(_4b, "Strefa egzaminacyjna", textOptions);
    const final_b = p(f(producedChunkPathVertical).path, f(producedChunkPathVertical).name + "_b.mp4");
    fs.copySync(_5b, final_b);
    fs.copySync(final_b, p(`${job.BASE_FOLDER}_PRODUCED`, f(final_b).nameWithExt));

    const _1c = await manipulateVideo_v2(horizontalBaseChunk, dur * 2, MAX, { blur: 7 });
    const _2c = await manipulateVideo_v2(horizontalBaseChunk, dur * 2, MAX, { ...smallSize });
    const _3c = await putVideoOnVideo_v2(_1c, _2c);
    const _4c = await createVideo_v2(job, _3c, 0, MAX, "VERTICAL");
    const _5c = await drawTextOnVideo(_4c, "Strefa egzaminacyjna", textOptions);
    const final_c = p(f(producedChunkPathVertical).path, f(producedChunkPathVertical).name + "_c.mp4");
    fs.copySync(_5c, final_c);
    fs.copySync(final_c, p(`${job.BASE_FOLDER}_PRODUCED`, f(final_c).nameWithExt));
  }

  if (duration >= 3 * DURATION_LIMIT && duration < DURATION_LIMIT * 4) {
    log(444444444, "Duration is more than 3 min and less than 4 min", { duration });
    const dur = Math.floor(duration / 4);
    const _1a = await manipulateVideo_v2(horizontalBaseChunk, 0, dur, { blur: 7 });
    const _2a = await manipulateVideo_v2(horizontalBaseChunk, 0, dur, { ...smallSize });
    const _3a = await putVideoOnVideo_v2(_1a, _2a);
    const _4a = await createVideo_v2(job, _3a, 0, MAX, "VERTICAL");
    const _5a = await drawTextOnVideo(_4a, "Strefa egzaminacyjna", textOptions);
    const final_a = p(f(producedChunkPathVertical).path, f(producedChunkPathVertical).name + "_a.mp4");
    fs.copySync(_5a, final_a);
    fs.copySync(final_a, p(`${job.BASE_FOLDER}_PRODUCED`, f(final_a).nameWithExt));

    const _1b = await manipulateVideo_v2(horizontalBaseChunk, dur, dur * 2, { blur: 7 });
    const _2b = await manipulateVideo_v2(horizontalBaseChunk, dur, dur * 2, { ...smallSize });
    const _3b = await putVideoOnVideo_v2(_1b, _2b);
    const _4b = await createVideo_v2(job, _3b, 0, MAX, "VERTICAL");
    const _5b = await drawTextOnVideo(_4b, "Strefa egzaminacyjna", textOptions);
    const final_b = p(f(producedChunkPathVertical).path, f(producedChunkPathVertical).name + "_b.mp4");
    fs.copySync(_5b, final_b);
    fs.copySync(final_b, p(`${job.BASE_FOLDER}_PRODUCED`, f(final_b).nameWithExt));

    const _1c = await manipulateVideo_v2(horizontalBaseChunk, dur * 2, dur * 3, { blur: 7 });
    const _2c = await manipulateVideo_v2(horizontalBaseChunk, dur * 2, dur * 3, { ...smallSize });
    const _3c = await putVideoOnVideo_v2(_1c, _2c);
    const _4c = await createVideo_v2(job, _3c, 0, MAX, "VERTICAL");
    const _5c = await drawTextOnVideo(_4c, "Strefa egzaminacyjna", textOptions);
    const final_c = p(f(producedChunkPathVertical).path, f(producedChunkPathVertical).name + "_c.mp4");
    fs.copySync(_5c, final_c);
    fs.copySync(final_c, p(`${job.BASE_FOLDER}_PRODUCED`, f(final_c).nameWithExt));

    const _1d = await manipulateVideo_v2(horizontalBaseChunk, dur * 3, MAX, { blur: 7 });
    const _2d = await manipulateVideo_v2(horizontalBaseChunk, dur * 3, MAX, { ...smallSize });
    const _3d = await putVideoOnVideo_v2(_1d, _2d);
    const _4d = await createVideo_v2(job, _3d, 0, MAX, "VERTICAL");
    const _5d = await drawTextOnVideo(_4d, "Strefa egzaminacyjna", textOptions);
    const final_d = p(f(producedChunkPathVertical).path, f(producedChunkPathVertical).name + "_d.mp4");
    fs.copySync(_5d,  final_d);
    fs.copySync(final_d, p(`${job.BASE_FOLDER}_PRODUCED`, f(final_d).nameWithExt));
  }
};
