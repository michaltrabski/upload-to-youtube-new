import path from "path";
import ffmpeg from "fluent-ffmpeg";
const sharp = require("sharp");
import { exec } from "child_process";
const { getVideoDurationInSeconds } = require("get-video-duration");
import md5 from "md5";
const sizeOf = require("image-size");
const textToImage = require("text-to-image");
const Jimp = require("jimp");

import fs, { copyFileSync, copySync, exists, existsSync, renameSync } from "fs-extra";
import { ManipulateVideoOptions, Job } from "./types";
import { f, p } from "./utils";

const PREVENT_OVERRIDE = true;
const LOG = false;

function log(...args: any[]) {
  if (!LOG) return;

  console.log();
  console.log(...args);
}

export const textToPng_v3 = async (
  baseFolder: string,
  text: string,
  options: any,
  prefix = ""
): Promise<[string, number, number]> => {
  const outputName = `${prefix}_` + md5(JSON.stringify({ baseFolder, text, options, prefix })).slice(0, 11);

  const procucedFileLocation = p(baseFolder, `${outputName}.png`);

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

  fs.writeFileSync(procucedFileLocation, dataUriLogo.split(",")[1], "base64");

  const dimensions = sizeOf(procucedFileLocation);

  const width = dimensions.width;
  const height = dimensions.height;

  return [procucedFileLocation, width, height];
};

export const putPngOnPng_v3 = async (
  baseFolder: string,
  foregroundPath: string,
  backgroundPath: string,
  x: number,
  y: number,
  prefix = ""
): Promise<[string, number, number]> => {
  const outputName =
    `${prefix}_` + md5(JSON.stringify({ baseFolder, foregroundPath, backgroundPath, x, y, prefix })).slice(0, 11);

  const procucedFileLocation = p(baseFolder, `${md5(outputName)}.png`);

  const foregroundImage = await Jimp.read(foregroundPath);
  const backgroundImage = await Jimp.read(backgroundPath); // Fixed variable name

  // Check if foreground fits within background dimensions
  if (
    foregroundImage.getWidth() > backgroundImage.getWidth() ||
    foregroundImage.getHeight() > backgroundImage.getHeight()
  ) {
    throw new Error(
      `putPngOnPng_v3 Foreground image exceeds background dimensions. ${JSON.stringify({
        baseFolder,
        foregroundPath,
        backgroundPath,
        x,
        y,
        prefix,
      })}`
    );
  }

  // Composite foreground onto background with transparency preserved
  await backgroundImage.composite(foregroundImage, x, y, { mode: Jimp.BLEND_SOURCE_OVER });

  // Save the combined image as PNG
  await backgroundImage.writeAsync(procucedFileLocation);
  // console.log(`Overlay image created: ${procucedFileLocation}`);

  const dimensions = sizeOf(procucedFileLocation);

  const width = dimensions.width;
  const height = dimensions.height;

  return [procucedFileLocation, width, height];
};

export const putPngOnVideo_v3 = async (
  baseFolder: string,
  videoPath: string,
  pngPath: string,
  x = 0,
  y = 0,
  prefix = ""
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const outputName =
      `${prefix}_` + md5(JSON.stringify({ baseFolder, videoPath, pngPath, x, y, prefix })).slice(0, 11);

    const procucedFileLocation = p(baseFolder, `${outputName}.mp4`);

    if (prefix) {
      console.log({
        baseFolder,
        videoPath,
        pngPath,
        x,
        y,
        prefix,
        procucedFileLocation,
      });
    }

    if (procucedFileLocation.includes("aaaaaaaaa_final_short")) {
      throw new Error(`procucedFileLocation contains spaces: ${procucedFileLocation}`);
    }

    if (PREVENT_OVERRIDE) {
      if (existsSync(procucedFileLocation)) {
        log(`\n makeVideoVertical() called - video already exists, returning path:\n`, procucedFileLocation, "\n\n");
        resolve(procucedFileLocation);
        return;
      }
    }

    const producedVideoPathTemp = p(baseFolder, `x__temp_${Math.random()}.mp4`);

    ffmpeg()
      .input(videoPath)
      .input(pngPath)
      .fps(29.97)
      .complexFilter([
        {
          filter: "overlay",
          options: { x, y }, // Adjust these values to position the PNG
          inputs: ["0:v", "1:v"],
        },
      ])
      .output(producedVideoPathTemp)
      .on("progress", (p) => log(`    progress: ${Math.floor(p.percent)}%`))
      .on("end", () => {
        renameSync(producedVideoPathTemp, procucedFileLocation);
        resolve(procucedFileLocation);
      })
      .on("error", (err) => reject(err))
      .run();
  });
};

export const addMp3ToVideo_v3 = async (
  baseFolder: string,
  videoPath: string,
  mp3: string,
  prefix = ""
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const outputName = `${prefix}_` + md5(JSON.stringify({ baseFolder, videoPath, mp3, prefix })).slice(0, 6);

    const procucedFileLocation = p(baseFolder, `${outputName}.mp4`);

    if (PREVENT_OVERRIDE) {
      if (existsSync(procucedFileLocation)) {
        log(`\n makeVideoVertical() called - video already exists, returning path:\n`, procucedFileLocation, "\n\n");
        resolve(procucedFileLocation);
        return;
      }
    }

    const producedVideoPathTemp = p(f(procucedFileLocation).path, `x__temp_${Math.random()}.mp4`);

    ffmpeg()
      .input(videoPath)
      .input(mp3)
      .fps(29.97)
      .complexFilter([
        "[0:v]copy[v]", // Example of applying a scale filter instead of copy
        "[1:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a]", // Convert the audio stream to a compatible format
      ])
      .outputOptions([
        "-map [v]", // Map the video stream from the complex filter
        "-map [a]", // Map the audio stream from the complex filter
        "-c:v libx264", // Specify the video codec (re-encode with H.264)
        "-crf 23", // Specify the Constant Rate Factor (quality level) for H.264, where lower values mean better quality
        "-c:a aac", // Use AAC codec for audio
      ])
      .output(producedVideoPathTemp)
      .on("progress", (p: any) => log(`    progress: ${Math.floor(p.percent)}%`))
      .on("end", () => {
        renameSync(producedVideoPathTemp, procucedFileLocation);
        resolve(procucedFileLocation);
      })
      .on("error", (err: any) => reject(err))
      .run();
  });
};

export async function manipulateVideo_v3(
  baseFolder: string,
  originalVideoPath: string,
  // producedVideoPath: string,
  originalVideoTrimFrom: number,
  originalVideoTrimTo: number,
  options: ManipulateVideoOptions
): Promise<string> {
  return new Promise((resolve, reject) => {
    const prefix = md5(
      JSON.stringify({ originalVideoPath, originalVideoTrimFrom, originalVideoTrimTo, options })
    ).slice(0, 10);

    const procucedFileLocation = p(baseFolder, `${md5(prefix)}.mp4`);

    if (PREVENT_OVERRIDE) {
      if (existsSync(procucedFileLocation)) {
        log(`\n makeVideoVertical() called - video already exists, returning path:\n`, procucedFileLocation, "\n\n");
        resolve(procucedFileLocation);
        return;
      }
    }

    const rnd = Math.floor(Math.random() * 999999) + 1;

    const producedVideoPathTemp = p(f(procucedFileLocation).path, `x__temp_${rnd}.mp4`);

    const from = originalVideoTrimFrom;
    const to = originalVideoTrimTo;

    const { name, ext, path } = f(procucedFileLocation);

    log(`\n   createVideo() called - creating video: ${path}`);
    log(`   ${name}${ext}`);
    log(`   (Approx produced video duration is ${Math.floor(to - from)} seconds)`);

    const command = ffmpeg()
      .input(originalVideoPath)
      .setStartTime(originalVideoTrimFrom)
      .setDuration(originalVideoTrimTo - originalVideoTrimFrom);

    if (options.size) {
      command.size(options.size); // "1920x1080"
    }

    if (options.blur) {
      command.videoFilters(`boxblur=${options.blur}`);
    }

    if (options.scale) {
      command.size(`${options.scale}%`);
    }

    if (options.crop && options.crop > 0) {
      ffmpeg.ffprobe(originalVideoPath, function (err, metadata) {
        if (err) {
          console.error(err);
          return;
        }

        const cropBy = (options.crop || 1) / 100;
        console.log("cropBy===", cropBy, "is about", cropBy * 100 + "%");

        const videoStream = metadata.streams.find((stream) => stream.codec_type === "video");
        const originalWidth = videoStream?.width;
        const originalHeight = videoStream?.height;

        const cropWidth = (originalWidth || 0) * (1 - cropBy);
        const cropHeight = (originalHeight || 0) * (1 - cropBy);
        const x = (originalWidth || 0) * (cropBy / 2);
        const y = (originalHeight || 0) * (cropBy / 2);

        command.videoFilters(`crop=${cropWidth}:${cropHeight}:${x}:${y}`);

        command
          .output(producedVideoPathTemp)
          // .size(options.size)
          .fps(29.97)
          .on("end", () => {
            renameSync(producedVideoPathTemp, procucedFileLocation);
            resolve(procucedFileLocation);
          })
          .on("progress", (p: any) => log(`    progress: ${Math.floor(p.percent)}%`))
          .on("error", (err: any) => reject(err))
          .run();
      });
    } else if (options.cropTopRight && options.cropTopRight > 0) {
      ffmpeg.ffprobe(originalVideoPath, function (err, metadata) {
        if (err) {
          console.error(err);
          return;
        }

        const cropBy = (options.cropTopRight || 1) / 100;
        console.log("cropBy===", cropBy, "is about", cropBy * 100 + "%");

        const videoStream = metadata.streams.find((stream) => stream.codec_type === "video");
        const originalWidth = videoStream?.width;
        const originalHeight = videoStream?.height;

        const cropWidth = (originalWidth || 0) * (1 - cropBy);
        const cropHeight = (originalHeight || 0) * (1 - cropBy);
        const x = (originalWidth || 0) * cropBy; // Crop from the right
        const y = 0; // Crop from the top

        command.videoFilters(`crop=${cropWidth}:${cropHeight}:${x}:${y}`);

        command
          .output(producedVideoPathTemp)
          // .size(options.size)
          .fps(29.97)
          .on("end", () => {
            renameSync(producedVideoPathTemp, procucedFileLocation);
            resolve(procucedFileLocation);
          })
          .on("progress", (p: any) => log(`    progress: ${Math.floor(p.percent)}%`))
          .on("error", (err: any) => reject(err))
          .run();
      });
    } else {
      command
        .output(producedVideoPathTemp)
        // .size(options.size)
        .fps(29.97)
        .on("end", () => {
          renameSync(producedVideoPathTemp, procucedFileLocation);
          resolve(procucedFileLocation);
        })
        .on("progress", (p: any) => log(`    progress: ${Math.floor(p.percent)}%`))
        .on("error", (err: any) => reject(err))
        .run();
    }
  });
}

export async function mergeVideos_v3(baseFolder: string, videoPaths: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const prefix = md5(JSON.stringify({ baseFolder, videoPaths })).slice(0, 10);

    const procucedFileLocation = p(baseFolder, `${md5(prefix)}.mp4`);

    if (existsSync(procucedFileLocation) && PREVENT_OVERRIDE) {
      log("video already exists:", procucedFileLocation);
      resolve(procucedFileLocation);
      return;
    }

    const rnd = Math.floor(Math.random() * 999999) + 1;

    const producedVideoPathTemp = p(f(procucedFileLocation).path, `____XX___temp_${rnd}.mp4`);
    const ffmpeg = require("fluent-ffmpeg");

    let command = ffmpeg();

    videoPaths.forEach((videoPath) => {
      command = command.input(videoPath);
    });

    command
      .on("error", (err: any) => {
        console.error(`Error: ${err}`);
      })
      .on("progress", (p: any) => {
        if (Math.floor(p.percent) % 10 === 0) {
          log(`progress: ${Math.floor(p.percent)}%`);
        }
      })
      .on("end", () => {
        renameSync(producedVideoPathTemp, procucedFileLocation);
        resolve(procucedFileLocation);
      })
      .on("error", (err: any) => reject(err))
      .mergeToFile(producedVideoPathTemp, f(procucedFileLocation).path);
  });
}

export function putVideoOnVideo_v3(
  baseFolder: string,
  originalVideo1Path: string,
  originalVideo2Path: string,
  prefix = ""
): Promise<string> {
  return new Promise((resolve, reject) => {
    const outputName =
      `${prefix}_` + md5(JSON.stringify({ baseFolder, originalVideo1Path, originalVideo2Path, prefix })).slice(0, 11);

    const producedVideoPath = p(baseFolder, `${outputName}.mp4`);

    if (PREVENT_OVERRIDE) {
      if (existsSync(producedVideoPath)) {
        log(`\n makeVideoVertical() called - video already exists, returning path:\n`, producedVideoPath, "\n\n");
        resolve(producedVideoPath);
        return;
      }
    }

    ffmpeg.ffprobe(originalVideo1Path, function (err, metadata1) {
      if (err) {
        console.error(err);
        return;
      }

      const videoStream1 = metadata1.streams.find((stream) => stream.codec_type === "video");
      const W = videoStream1?.width;
      const H = videoStream1?.height;

      ffmpeg.ffprobe(originalVideo2Path, function (err, metadata2) {
        if (err) {
          console.error(err);
          return;
        }

        const videoStream2 = metadata2.streams.find((stream) => stream.codec_type === "video");
        const w = videoStream2?.width;
        const h = videoStream2?.height;

        const rnd = Math.floor(Math.random() * 999999) + 1;
        const producedVideoPathTemp = p(f(producedVideoPath).path, `x__temp_${rnd}.mp4`);

        ffmpeg()
          .input(originalVideo1Path)
          .input(originalVideo2Path)
          .fps(29.97)
          .complexFilter([
            `[0:v][1:v] overlay=(W-w)/2:(H-h)/3:enable='between(t,0,20)'`,
            // `[0:v][1:v] overlay=(W-w)/2:(H-h)/2:enable='between(t,0,20)'`,
            // "[0:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo", // this line produce error because of audio in videos
          ])
          .output(producedVideoPathTemp)
          .on("progress", (p: any) => log(`    progress: ${Math.floor(p.percent)}%`))
          .on("error", (err: any) => reject(err))
          .on("end", () => {
            renameSync(producedVideoPathTemp, producedVideoPath);
            resolve(producedVideoPath);
          })
          .run();
      });
    });
  });
}

export async function makeVideoVertical_v3(
  baseFolder: string,
  originalVideoPath: string,
  prefix = ""
): Promise<string> {
  return new Promise((resolve, reject) => {
    const outputName = `${prefix}_` + md5(JSON.stringify({ baseFolder, originalVideoPath, prefix })).slice(0, 11);

    const producedVideoPath = p(baseFolder, `${outputName}.mp4`);

    if (PREVENT_OVERRIDE) {
      if (existsSync(producedVideoPath)) {
        log(`\n makeVideoVertical() called - video already exists, returning path:\n`, producedVideoPath, "\n\n");
        resolve(producedVideoPath);
        return;
      }
    }

    const producedVideoPathTemp = p(f(producedVideoPath).path, `x__temp_${Math.random()}.mp4`);

    ffmpeg()
      .input(originalVideoPath)
      .output(producedVideoPathTemp)
      .fps(29.97)
      .on("end", () => {
        renameSync(producedVideoPathTemp, producedVideoPath);
        resolve(producedVideoPath);
      })
      .on("error", (err: any) => reject(err))
      .on("progress", (p: any) => log(`    progress: ${Math.floor(p.percent)}%`))
      .videoFilter("crop=ih*9/16:ih:(iw-ow)/2:(ih-oh)/2")
      // .videoCodec("libx265") // specify the H.265 codec here
      .run();
  });
}
