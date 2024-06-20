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
import { createVideo } from "./ffmpeg";

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
    const pngFileName = `${path.basename(videoPath, path.extname(videoPath))}_${t}.png`;

    log(111111111111111111, timeForScreenshot, t, pngFileName);
    ffmpeg(videoPath)
      .on("end", function () {
        // console.log(`Screenshots taken: from ${videoPath}`);
        resolve(pngFileName);
      })
      .screenshots({
        count: 1,
        folder: outputPath,
        filename: pngFileName, // Output file name pattern with video file name
        size: "1280x720", // Set dimensions to full HD
        timemarks: [timeForScreenshot], // Take screenshot at 4 second
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
