import path from "path";
import ffmpeg from "fluent-ffmpeg";
const sharp = require("sharp");
import { exec } from "child_process";
const { getVideoDurationInSeconds } = require("get-video-duration");
import md5 from "md5";
const sizeOf = require("image-size");
const textToImage = require("text-to-image");

import fs, { copyFileSync, copySync, exists, existsSync, renameSync } from "fs-extra";
import { ManipulateVideoOptions, Job } from "./types";
import { f, p } from "./utils";

const PREVENT_OVERRIDE = true;
const LOG = false;

function log(...args: any[]) {
  if (LOG) {
    console.log();
    console.log(...args);
  }
  console.log();
}

export async function manipulateVideo_v2(
  originalVideoPath: string,
  originalVideoTrimFrom: number,
  originalVideoTrimTo: number,
  options: ManipulateVideoOptions
): Promise<string> {
  return new Promise((resolve, reject) => {
    const prefix = md5(
      JSON.stringify({ originalVideoPath, originalVideoTrimFrom, originalVideoTrimTo, options })
    ).slice(0, 10);
    const producedVideoPath = p(f(originalVideoPath).path, `${f(originalVideoPath).name}_${prefix}.mp4`);

    if (existsSync(producedVideoPath) && PREVENT_OVERRIDE) {
      log("video already exists:", producedVideoPath);
      resolve(producedVideoPath);
      return;
    }

    const rnd = Math.floor(Math.random() * 999999) + 1;

    const producedVideoPathTemp = p(f(producedVideoPath).path, `x__temp_${rnd}.mp4`);

    const from = originalVideoTrimFrom;
    const to = originalVideoTrimTo;

    log("manipulateVideo_v2", producedVideoPath, `produced video duration will be ${Math.floor(to - from)} seconds`);

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

    if (options.fps) {
      command.fps(options.fps);
    }

    // if (options.volume === 0) {
    //   command.noAudio();
    // }

    // if (options.volume) {
    //   command.audioFilters(`volume=${options.volume}`);
    // }

    // add codec
    // command.videoCodec("libx264");

    if (options.crop && options.crop > 0) {
      ffmpeg.ffprobe(originalVideoPath, function (err, metadata) {
        if (err) {
          console.error(err);
          return;
        }

        const cropBy = (options.crop || 1) / 100;
        log("cropBy===", cropBy, "is about", cropBy * 100 + "%");

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
          .on("progress", (p: any) => {
            if (Math.floor(p.percent) % 10 === 0) {
              log(`progress: ${Math.floor(p.percent)}%`);
            }
          })
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
        log("cropBy===", cropBy, "is about", cropBy * 100 + "%");

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
          .on("progress", (p: any) => {
            if (Math.floor(p.percent) % 10 === 0) {
              log(`progress: ${Math.floor(p.percent)}%`);
            }
          })
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
        .on("progress", (p: any) => {
          if (Math.floor(p.percent) % 10 === 0) {
            log(`progress: ${Math.floor(p.percent)}%`);
          }
        })
        .on("error", (err: any) => reject(err))
        .run();
    }
  });
}

export function putVideoOnVideo_v2(originalVideo1Path: string, originalVideo2Path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const prefix = md5(JSON.stringify({ originalVideo1Path, originalVideo2Path })).slice(0, 10);
    const producedVideoPath = p(f(originalVideo1Path).path, `${f(originalVideo1Path).name}_${prefix}.mp4`);

    if (existsSync(producedVideoPath) && PREVENT_OVERRIDE) {
      log("video already exists:", producedVideoPath);
      resolve(producedVideoPath);
      return;
    }

    log("putVideoOnVideo_v2", producedVideoPath);

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
            // `[0:v][1:v] overlay=(W-w)/2:(H-h)/3:enable='between(t,0,20)'`,
            `[0:v][1:v] overlay=(W-w)/2:(H-h)/3'`,
            // `[0:v][1:v] overlay=(W-w)/2:(H-h)/2:enable='between(t,0,20)'`,
            // "[0:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo", // this line produce error because of audio in videos
          ])
          .output(producedVideoPathTemp)
          .on("progress", (p: any) => {
            if (Math.floor(p.percent) % 10 === 0) {
              log(`progress: ${Math.floor(p.percent)}%`);
            }
          })
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

interface TextOptions {
  //   fontfile: string;
  fontsize: number;
  fontcolor: string;
  x: string; // "(main_w/2-text_w/2)"
  y: string; // in pixels from top
  shadowcolor: string;
  shadowx: number;
  shadowy: number;
  encoding?: string;
}

export function drawTextOnVideo(originalVideoPath: string, text: string, options: TextOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    const prefix = md5(JSON.stringify({ originalVideoPath, text, options })).slice(0, 10);
    const producedVideoPath = p(f(originalVideoPath).path, `${f(originalVideoPath).name}_${prefix}.mp4`);

    if (existsSync(producedVideoPath) && PREVENT_OVERRIDE) {
      log("video already exists:", producedVideoPath);
      resolve(producedVideoPath);
      return;
    }

    const rnd = Math.floor(Math.random() * 999999) + 1;
    const producedVideoPathTemp = p(f(producedVideoPath).path, `x__temp_${rnd}.mp4`);

    const { fontsize, fontcolor, x, y, shadowcolor, shadowx, shadowy, encoding } = options;
    const filterOptions = `drawtext=text='${text}':fontsize=${fontsize}:fontcolor=${fontcolor}:x=${x}:y=${y}:shadowcolor=${shadowcolor}:shadowx=${shadowx}:shadowy=${shadowy}${
      encoding ? `:encoding=${encoding}` : ""
    }`;

    log("drawTextOnVideo", producedVideoPath);

    ffmpeg()
      .input(originalVideoPath)
      .videoFilters(filterOptions)
      .output(producedVideoPathTemp)
      .on("progress", (p: any) => {
        if (Math.floor(p.percent) % 10 === 0) {
          log(`progress: ${Math.floor(p.percent)}%`);
        }
      })
      .on("error", (err: any) => reject(err))
      .on("end", () => {
        renameSync(producedVideoPathTemp, producedVideoPath);
        resolve(producedVideoPath);
      })
      .run();
  });
}

export const getVideoDimensions = (
  videoPath: string
): Promise<{ width: number; height: number; w: number; h: number }> => {
  // 4k is 3840x2160
  // 2.7k is 2704x1520
  // 1080p is 1920x1080
  // 720p is 1280x720

  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, function (err: any, metadata: any) {
      if (err) {
        reject(err);
        return;
      }

      const videoStream = metadata.streams.find((stream: any) => stream.codec_type === "video");
      const width = videoStream?.width;
      const height = videoStream?.height;

      resolve({ width, height, w: width, h: height });
    });
  });
};

interface TextFilterOptions {
  fontfile?: string;
  text: string;
  fontsize: number;
  fontcolor: string;
  x: string;
  y: string;
  box: number;
  boxcolor: string;
  boxborderw: number;
  shadowcolor: string;
  shadowx: number;
  shadowy: number;
}

export interface TextFilter {
  filter: string;
  options: TextFilterOptions;
}

export function createVideo_v2(
  job: Job,
  originalVideoPath: string,
  originalVideoTrimFrom: number,
  originalVideoTrimTo: number,
  format: "HORIZONTAL" | "VERTICAL",
  textFilter?: TextFilter
): Promise<string> {
  return new Promise((resolve, reject) => {
    const prefix = md5(
      JSON.stringify({ job, originalVideoPath, originalVideoTrimFrom, originalVideoTrimTo, format })
    ).slice(0, 10);
    const producedVideoPath = p(f(originalVideoPath).path, `${f(originalVideoPath).name}_${prefix}.mp4`);

    if (existsSync(producedVideoPath) && PREVENT_OVERRIDE) {
      log("video already exists:", producedVideoPath);
      resolve(producedVideoPath);
      return;
    }

    const producedVideoPathTemp = p(f(producedVideoPath).path, `x__temp_${Math.random()}.mp4`);

    const from = originalVideoTrimFrom;
    const to = originalVideoTrimTo;

    log("createVideo_v2", producedVideoPath, `produced video duration will be ${Math.floor(to - from)} seconds`);

    let newFlip: any = [];

    if (job.FLIP_CHUNK) {
      newFlip = ["vflip", "hflip"];
    }

    if (format === "HORIZONTAL") {
      ffmpeg()
        .input(originalVideoPath)
        .setStartTime(originalVideoTrimFrom)
        .setDuration(originalVideoTrimTo - originalVideoTrimFrom)
        .videoFilters([...newFlip, textFilter])
        .output(producedVideoPathTemp)
        .on("end", () => {
          renameSync(producedVideoPathTemp, producedVideoPath);
          resolve(producedVideoPath);
        })
        .on("progress", (p: any) => {
          if (Math.floor(p.percent) % 10 === 0) {
            log(`progress: ${Math.floor(p.percent)}%`);
          }
        })
        .on("error", (err: any) => reject(err))
        .run();
    }

    if (format === "VERTICAL") {
      ffmpeg()
        .input(originalVideoPath)
        .setStartTime(originalVideoTrimFrom)
        .setDuration(originalVideoTrimTo - originalVideoTrimFrom)
        .videoFilters([...newFlip, textFilter, "crop=ih*9/16:ih:(iw-ow)/2:(ih-oh)/2"])
        .output(producedVideoPathTemp)
        .on("end", () => {
          renameSync(producedVideoPathTemp, producedVideoPath);
          resolve(producedVideoPath);
        })
        .on("progress", (p: any) => {
          if (Math.floor(p.percent) % 10 === 0) {
            log(`progress: ${Math.floor(p.percent)}%`);
          }
        })
        .on("error", (err: any) => reject(err))
        .run();
    }
  });
}

export async function mergeVideos_v2(videoPaths: string[], producedVideoPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (existsSync(producedVideoPath) && PREVENT_OVERRIDE) {
      log("video already exists:", producedVideoPath);
      resolve(producedVideoPath);
      return;
    }

    const rnd = Math.floor(Math.random() * 999999) + 1;

    const producedVideoPathTemp = p(f(producedVideoPath).path, `_______temp_${rnd}.mp4`);
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
        renameSync(producedVideoPathTemp, producedVideoPath);
        resolve(producedVideoPath);
      })
      .on("error", (err: any) => reject(err))
      .mergeToFile(producedVideoPathTemp, f(producedVideoPath).path);
  });
}

export const putPngOnVideo_v2 = async (videoPath: string, pngPath: string, x = 0, y = 0): Promise<string> => {
  return new Promise((resolve, reject) => {
    const prefix = md5(JSON.stringify({ videoPath, pngPath, x, y })).slice(0, 10);
    const producedVideoPath = p(f(videoPath).path, `${f(videoPath).name}_${prefix}.mp4`);

    if (existsSync(producedVideoPath) && PREVENT_OVERRIDE) {
      log("video already exists:", producedVideoPath);
      resolve(producedVideoPath);
      return;
    }

    const producedVideoPathTemp = p(f(producedVideoPath).path, `x__temp_${Math.random()}.mp4`);

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
        renameSync(producedVideoPathTemp, producedVideoPath);
        resolve(producedVideoPath);
      })
      .on("error", (err) => reject(err))
      .run();
  });
};

export const textToPng_v2 = async (job: Job, text: string, options: any): Promise<[string, number, number]> => {
  const prefix = md5(JSON.stringify({ text, options })).slice(0, 10);

  const procucedFileLocation = p(job.BASE_FOLDER, `${text}_${md5(prefix)}.png`);

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

export const addMp3ToVideoWithBothAudioTracks = async (originalVideoPath: string, mp3Path: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const producedVideoPath = p(f(originalVideoPath).path, `RESULT_${f(originalVideoPath).nameWithExt}`);
    const producedVideoPathTemp = p(f(producedVideoPath).path, `_TEMP_${Math.random()}.mp4`);

    if (existsSync(producedVideoPath) && PREVENT_OVERRIDE) {
      log("video already exists:", producedVideoPath);
      resolve(producedVideoPath);
      return;
    }

    ffmpeg(originalVideoPath)
      .input(mp3Path)
      .complexFilter([
        "[0:v]null[v]", // Keep the video stream unchanged
        "[0:a][1:a]amix=inputs=2[a]", // Mix the audio streams
      ])
      .map("[v]")
      .map("[a]")
      .outputOptions([
        // "-c:v libx264", // Re-encode the video stream using libx264 codec
        // "-crf 18", // Set the CRF value for high quality
        // "-preset veryslow", // Use a slower preset for better compression
        // "-c:a aac", // Encode the audio stream using AAC codec
        // "-b:a 128k", // Set audio bitrate
      ])
      .output(producedVideoPathTemp)
      .on("progress", (p: any) => {
        if (Math.floor(p.percent) % 10 === 0) {
          log(`progress: ${Math.floor(p.percent)}%`);
        }
      })
      .on("end", () => {
        renameSync(producedVideoPathTemp, producedVideoPath);
        resolve(producedVideoPath);
      })
      .on("error", (err: any) => reject(err))
      .run();
  });
};
