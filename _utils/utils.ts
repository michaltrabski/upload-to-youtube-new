const textToImage = require("text-to-image");
const sizeOf = require("image-size");
const https = require("https");

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
import axios from "axios";
import { manipulateVideo_v3 } from "./ffmpeg-v3";

export const p = path.resolve;
// export const log = console.log;

export function log(...args: any[]) {
  // return;

  args.forEach((arg) => console.log(arg));
  // console.log();
}

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
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

export const createVerticalChunksWithDurationLimit = async (
  job: Job,
  originalVideoPath: string,
  producedChunkPathVertical: string,
  maxShortDuration: number,
  text: string
) => {
  const textFilter = {
    filter: "drawtext",
    options: {
      // fontfile: "/path/to/font.ttf", // Specify the path to the font file
      text, // Text to be drawn
      fontsize: 80, // Font size
      fontcolor: "red", // Font color
      x: "(main_w/2-text_w/2)", // X position (centered)
      y: "1250", // Y position from the top
      box: 0, // Enable box around text
      boxcolor: "black@0.5", // Box color with transparency
      boxborderw: 0, // Box border width
      shadowcolor: "black",
      shadowx: 2,
      shadowy: 2,
    },
  };

  const { w, h } = await getVideoDimensions(originalVideoPath);
  const ytRecomendedWidth = 1080;
  const relativeHeight = (ytRecomendedWidth * h) / w;

  const smallSize = { size: `${ytRecomendedWidth}x${relativeHeight}` };
  const bigSize = { size: `${Math.round(1920 * (16 / 9))}x1920` };

  const horizontalBaseChunk = originalVideoPath;
  const duration = await getVideoDuration(horizontalBaseChunk);
  console.log("createVerticalChunksShorterThan1Min() =>", { originalVideoPath, duration, w, h, smallSize });

  const shortsPerChunk = Math.floor(duration / maxShortDuration) || 1;

  for (let i = 0; i < shortsPerChunk; i++) {
    const maxDuration = shortsPerChunk === 1 ? duration : maxShortDuration;

    const _1a = await manipulateVideo_v2(horizontalBaseChunk, maxDuration * i, maxDuration * (i + 1), { ...smallSize });
    const _2a = await manipulateVideo_v2(horizontalBaseChunk, maxDuration * i, maxDuration * (i + 1), {
      ...bigSize,
      blur: 7,
    });
    const _3a = await putVideoOnVideo_v2(_2a, _1a);
    const _4a = await createVideo_v2(job, _3a, 0, 99999999, "VERTICAL", textFilter);
    const final_a = p(f(producedChunkPathVertical).path, f(producedChunkPathVertical).name + `_${i}.mp4`);

    await wait(3000);
    fs.copySync(_4a, final_a);
    await wait(3000);
    fs.copySync(final_a, p(`${job.BASE_FOLDER}_PRODUCED`, f(final_a).nameWithExt));
    await wait(3000);
    fs.copySync(final_a, p(`${job.BASE_FOLDER}_PRODUCED`, f(final_a).nameWithExt.split(" ").slice(1).join(" ")));
    await wait(3000);
  }
};

export const downloadVideo = async (url: string, outputPath: string, defaultMp4: string): Promise<string> => {
  console.log(`Downloading mp4 from ${url}`);

  if (existsSync(outputPath)) {
    return outputPath;
  }

  try {
    const response = await axios.get(url, { responseType: "arraybuffer" });

    if (response.status !== 200) {
      return defaultMp4;
    }

    writeFileSync(outputPath, response.data);

    return outputPath;
  } catch (error) {
    return defaultMp4;
  }
};

export const downloadMp3 = async (url: string, outputPath: string, defaultMp3: string): Promise<string> => {
  console.log(`Downloading mp3 from ${url}`);

  if (existsSync(outputPath)) {
    return outputPath;
  }

  try {
    const response = await axios.get(url, { responseType: "arraybuffer" });

    if (response.status !== 200) {
      return defaultMp3;
    }

    writeFileSync(outputPath, response.data);

    return outputPath;
  } catch (error) {
    return defaultMp3;
  }
};

export async function getExtraContent(job: Job) {
  const folder = job.BASE_FOLDER + "_EXTRA_CONTENT";

  ensureDirSync(folder);

  const files = readdirSync(folder)
    .filter((fileName) => fileName.includes("x__temp"))
    .map((fileName) => p(folder, fileName));

  const f1 = await manipulateVideo_v3(folder, files[0], 30, 34, { size: "400x?" });

  return files;

  // files.forEach((itemInVideoFolder) => {
  //   const isItemADirectory = statSync(p(folder, itemInVideoFolder)).isDirectory();

  //   if (isItemADirectory) {
  //     return;
  //   }

  //   if (!itemInVideoFolder.endsWith(".mp4") && !itemInVideoFolder.endsWith(".MP4")) {
  //     return;
  //   }

  // });
}
