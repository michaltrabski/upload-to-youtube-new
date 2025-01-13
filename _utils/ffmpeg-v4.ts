import ffmpeg from "fluent-ffmpeg";
import md5 from "md5";

const sizeOf = require("image-size");
const textToImage = require("text-to-image");
const Jimp = require("jimp");

import fs, { copyFileSync, copySync, exists, existsSync, renameSync } from "fs-extra";
import { ManipulateVideoOptions, Job } from "./types";
import { f, log, p } from "./utils";
import { getVideoDurationInMiliseconds } from "./ffmpeg";

const PREVENT_OVERRIDE = true;
const LOG = true;

export async function manipulateVideo_v4(
  baseFolder: string,
  originalVideoPath: string,
  originalVideoTrimFrom: number,
  originalVideoTrimTo: number,
  options: ManipulateVideoOptions,
  prefix = ""
): Promise<string> {
  return new Promise((resolve, reject) => {
    const outputName =
      `${prefix}_` +
      md5(
        JSON.stringify({ baseFolder, originalVideoPath, originalVideoTrimFrom, originalVideoTrimTo, options, prefix })
      ).slice(0, 5);

    const producedVideoPath = p(baseFolder, `${outputName}.mp4`);

    log("", `manipulateVideo_v4 ${f(producedVideoPath).nameWithExt}`, "");

    if (PREVENT_OVERRIDE) {
      if (existsSync(producedVideoPath)) {
        resolve(producedVideoPath);
        return;
      }
    }

    const rnd = Math.floor(Math.random() * 999999) + 1;

    const producedVideoPathTemp = p(f(producedVideoPath).path, `x__temp_${rnd}.mp4`);

    const from = originalVideoTrimFrom;
    const to = originalVideoTrimTo;

    const { name, ext, path } = f(producedVideoPath);

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
            renameSync(producedVideoPathTemp, producedVideoPath);
            resolve(producedVideoPath);
          })
          // .on("progress", (p: any) => log(`    progress: ${Math.floor(p.percent)}%`))
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
            renameSync(producedVideoPathTemp, producedVideoPath);
            resolve(producedVideoPath);
          })
          // .on("progress", (p: any) => log(`    progress: ${Math.floor(p.percent)}%`))
          .on("error", (err: any) => reject(err))
          .run();
      });
    } else {
      command
        .output(producedVideoPathTemp)
        // .size(options.size)
        .fps(29.97)
        .on("end", () => {
          renameSync(producedVideoPathTemp, producedVideoPath);
          resolve(producedVideoPath);
        })
        // .on("progress", (p: any) => log(`    progress: ${Math.floor(p.percent)}%`))
        .on("error", (err: any) => reject(err))
        .run();
    }
  });
}
