import path from "path";
import ffmpeg from "fluent-ffmpeg";
const sharp = require("sharp");

import fs, { copyFileSync, copySync, exists, existsSync, renameSync } from "fs-extra";
import { ManipulateVideoOptions, Job } from "./types";
import { f, p } from "./utils";

const PREVENT_OVERRIDE = true;
const LOG = false;

function log(...args: any[]) {
  if (LOG) console.log(...args);
}

export function createVideo(
  settings: Job,
  // fps: number,
  originalVideoPath: string,
  producedVideoPath: string,
  originalVideoTrimFrom: number,
  originalVideoTrimTo: number,
  format: "HORIZONTAL" | "VERTICAL"
) {
  return new Promise((resolve, reject) => {
    if (PREVENT_OVERRIDE) {
      if (existsSync(producedVideoPath)) {
        log(`\n makeVideoVertical() called - video already exists, returning path:\n`, producedVideoPath, "\n\n");
        resolve(producedVideoPath);
        return;
      }
    }

    const producedVideoPathTemp = p(f(producedVideoPath).path, `x__temp_${Math.random()}.mp4`);

    let percent = 0;

    const from = originalVideoTrimFrom;
    const to = originalVideoTrimTo;

    const { name, ext, path } = f(producedVideoPath);

    log(`\ncreateVideo() called - creating video: ${path}`);
    log(`   ${name}${ext}`);
    log(`   (Approx produced video duration is ${Math.floor(to - from)} seconds)`);

    let newFlip: any = [];

    if (settings.FLIP_CHUNK) {
      newFlip = ["vflip", "hflip"];
    }

    if (format === "HORIZONTAL") {
      ffmpeg()
        .input(originalVideoPath)
        .setStartTime(originalVideoTrimFrom)
        .setDuration(originalVideoTrimTo - originalVideoTrimFrom)
        .fps(29.97)
        .videoFilters(newFlip)
        .output(producedVideoPathTemp)
        .on("end", () => {
          renameSync(producedVideoPathTemp, producedVideoPath);
          resolve(producedVideoPath);
        })
        .on("progress", (progress: any) => {
          const newPercent = Math.floor(progress.percent);

          if (newPercent > percent || newPercent === 0) {
            log(`   progress: ${newPercent}%`);
          }
          percent = newPercent;
        })
        .on("error", (err: any) => reject(err))
        // .outputOptions("-c:v", "libx264") // Use H.264 codec for video
        // .videoCodec("libx264")
        // .videoBitrate(1000)
        // .noAudio()
        // .videoFilters("fade=in:0:30")
        // .videoFilters("fade=in:0:30", "pad=640:480:0:40:violet")
        // .size(`${50}x?`) // michal
        // .size(`${1920}x${1080}y`)
        .run();
    }

    if (format === "VERTICAL") {
      ffmpeg()
        .input(originalVideoPath)
        .setStartTime(originalVideoTrimFrom)
        .setDuration(originalVideoTrimTo - originalVideoTrimFrom)
        .videoFilters(newFlip)
        .output(producedVideoPathTemp)
        .on("end", () => {
          renameSync(producedVideoPathTemp, producedVideoPath);
          resolve(producedVideoPath);
        })
        .on("progress", (progress: any) => {
          const newPercent = Math.floor(progress.percent);

          if (newPercent > percent || newPercent === 0) {
            log(`   progress: ${newPercent}%`);
          }
          percent = newPercent;
        })
        .on("error", (err: any) => reject(err))
        .fps(29.97)
        // .outputOptions("-c:v", "libx264") // Use H.264 codec for video
        // .videoCodec("libx264")
        // .videoBitrate(1000)
        // .noAudio()
        // .videoFilters("fade=in:0:30")
        // .videoFilters("fade=in:0:30", "pad=640:480:0:40:violet")
        // .size(`${50}x?`) // michal
        .videoFilter("crop=ih*9/16:ih:(iw-ow)/2:(ih-oh)/2")
        .run();
    }
  });
}

export function resizeVideo(
  originalVideoPath: string,
  producedVideoPath: string,
  widthSize: number,
  flip?: boolean
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (PREVENT_OVERRIDE) {
      if (existsSync(producedVideoPath)) {
        log(`\n makeVideoVertical() called - video already exists, returning path:\n`, producedVideoPath, "\n\n");
        resolve(producedVideoPath);
        return;
      }
    }

    const producedVideoPathTemp = p(f(producedVideoPath).path, `x__temp_${Math.random()}.mp4`); // producedVideoPath.split("\\").slice(0, -1).join("\\") + `\\temp_${rnd}.mp4`;

    let percent = 0;

    let newFlip: any = [];

    if (flip) {
      newFlip = ["vflip", "hflip"];
    }

    ffmpeg()
      .input(originalVideoPath)
      // .outputOptions("-c:v", "libx264") // Use H.264 codec for video
      .videoFilters(newFlip)
      .output(producedVideoPathTemp)
      .on("end", () => {
        renameSync(producedVideoPathTemp, producedVideoPath);
        resolve(producedVideoPath);
      })
      .on("error", (err: any) => reject(err))
      .on("progress", (progress: any) => {
        const newPercent = Math.floor(progress.percent);

        if (newPercent !== percent || newPercent === 0) {
          log(`    progress: ${newPercent}%`);
        }
        percent = newPercent;
      })
      .size(`${widthSize}x?`) // michal
      .run();
  });
}

export function createSmallVideoForTranscript(originalVideoPath: string, producedVideoPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (PREVENT_OVERRIDE) {
      if (existsSync(producedVideoPath)) {
        log(`\n makeVideoVertical() called - video already exists, returning path:\n`, producedVideoPath, "\n\n");
        resolve(producedVideoPath);
        return;
      }
    }

    const rnd = Math.floor(Math.random() * 999999) + 1;
    const producedVideoPathTemp = producedVideoPath.split("\\").slice(0, -1).join("\\") + `\\temp_${rnd}.mp4`;

    let percent = 0;

    ffmpeg()
      .input(originalVideoPath)
      .output(producedVideoPathTemp)
      .on("end", () => {
        renameSync(producedVideoPathTemp, producedVideoPath);
        resolve(producedVideoPath);
      })
      .on("error", (err: any) => reject(err))
      .on("progress", (progress: any) => {
        const newPercent = Math.floor(progress.percent);

        if (newPercent !== percent || newPercent === 0) {
          log(`    progress: ${newPercent}%`);
        }
        percent = newPercent;
      })
      .size(`${4}x?`)
      .run();
  });
}

export async function manipulateVideo(
  originalVideoPath: string,
  producedVideoPath: string,
  originalVideoTrimFrom: number,
  originalVideoTrimTo: number,
  options: ManipulateVideoOptions
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (PREVENT_OVERRIDE) {
      if (existsSync(producedVideoPath)) {
        log(`\n makeVideoVertical() called - video already exists, returning path:\n`, producedVideoPath, "\n\n");
        resolve(producedVideoPath);
        return;
      }
    }

    const rnd = Math.floor(Math.random() * 999999) + 1;

    const producedVideoPathTemp = p(f(producedVideoPath).path, `x__temp_${rnd}.mp4`);

    const from = originalVideoTrimFrom;
    const to = originalVideoTrimTo;

    const { name, ext, path } = f(producedVideoPath);

    log(`\n   createVideo() called - creating video: ${path}`);
    log(`   ${name}${ext}`);
    log(`   (Approx produced video duration is ${Math.floor(to - from)} seconds)`);

    const command = ffmpeg()
      .input(originalVideoPath)
      .setStartTime(originalVideoTrimFrom)
      .setDuration(originalVideoTrimTo - originalVideoTrimFrom);

    if (options.size) {
      command.size(options.size);
    }

    if (options.blur) {
      command.videoFilters(`boxblur=${options.blur}`);
    }

    if (options.scale) {
      command.size(`${options.scale}%`);
    }

    // if (options.volume === 0) {
    //   command.noAudio();
    // }

    // if (options.volume) {
    //   command.audioFilters(`volume=${options.volume}`);
    // }

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

        const cropWidth = (originalWidth || 0) * (1 - cropBy); // 60% of original width
        const cropHeight = (originalHeight || 0) * (1 - cropBy); //60% of original height
        const x = (originalWidth || 0) * (cropBy / 2); // 30% of original width
        const y = (originalHeight || 0) * (cropBy / 2); // 30% of original height

        command.videoFilters(`crop=${cropWidth}:${cropHeight}:${x}:${y}`);

        command
          .output(producedVideoPathTemp)
          // .size(options.size)
          .fps(29.97)
          .on("end", () => {
            renameSync(producedVideoPathTemp, producedVideoPath);
            resolve(producedVideoPath);
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
          renameSync(producedVideoPathTemp, producedVideoPath);
          resolve(producedVideoPath);
        })
        .on("progress", (p: any) => log(`    progress: ${Math.floor(p.percent)}%`))
        .on("error", (err: any) => reject(err))
        .run();
    }
  });
}

export function putVideoOnVideo(
  originalVideo1Path: string,
  originalVideo2Path: string,
  producedVideoPath: string
): Promise<string> {
  return new Promise((resolve, reject) => {
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

export async function makeVideoVertical(originalVideoPath: string, producedVideoPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
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

export const addMp3ToVideo = async (videoPath: string, mp3: string, producedVideoPath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (PREVENT_OVERRIDE) {
      if (existsSync(producedVideoPath)) {
        log(`\n makeVideoVertical() called - video already exists, returning path:\n`, producedVideoPath, "\n\n");
        resolve(producedVideoPath);
        return;
      }
    }

    const producedVideoPathTemp = p(f(producedVideoPath).path, `x__temp_${Math.random()}.mp4`);

    // copyFileSync(mp3, f(producedVideoPath).path + "/" + f(mp3).nameWithExt);

    ffmpeg()
      .input(videoPath)
      .input(mp3)
      .output(producedVideoPathTemp)
      .on("progress", (p: any) => log(`    progress: ${Math.floor(p.percent)}%`))
      .on("end", () => {
        renameSync(producedVideoPathTemp, producedVideoPath);
        resolve(producedVideoPath);
      })
      .on("error", (err: any) => reject(err))
      .run();
  });
};

export const putPngOnVideo = async (
  videoPath: string,
  pngPath: string,
  producedVideoPath: string,
  x = 0,
  y = 0
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (PREVENT_OVERRIDE) {
      if (existsSync(producedVideoPath)) {
        log(`\n makeVideoVertical() called - video already exists, returning path:\n`, producedVideoPath, "\n\n");
        resolve(producedVideoPath);
        return;
      }
    }

    const producedVideoPathTemp = p(f(producedVideoPath).path, `x__temp_${Math.random()}.mp4`);

    ffmpeg()
      .input(videoPath)
      .input(pngPath)
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

export const createPngFromVideoLastFrame = async (videoPath: string, producedPngPath: string) => {
  return new Promise((resolve, reject) => {
    if (PREVENT_OVERRIDE) {
      if (existsSync(producedPngPath)) {
        log(`\n makeVideoVertical() called - video already exists, returning path:\n`, producedPngPath, "\n\n");
        resolve(producedPngPath);
        return;
      }
    }

    // if the input video is tooshort png will not be created
    ffmpeg(videoPath)
      .screenshots({
        timestamps: ["50%"],
        filename: f(producedPngPath).nameWithExt,
        folder: f(producedPngPath).path,
      })
      .on("end", () => {
        resolve(producedPngPath);
      });
  });
};

export const pngToVideo = async (pngPath: string, producedVideoPath: string) => {
  return new Promise((resolve, reject) => {
    if (PREVENT_OVERRIDE) {
      if (existsSync(producedVideoPath)) {
        log(`\n makeVideoVertical() called - video already exists, returning path:\n`, producedVideoPath, "\n\n");
        resolve(producedVideoPath);
        return;
      }
    }

    const producedVideoPathTemp = p(f(producedVideoPath).path, `x__temp_${Math.random()}.mp4`);

    ffmpeg()
      .input(pngPath)
      .output(producedVideoPathTemp)
      .duration(1)
      .on("end", () => {
        renameSync(producedVideoPathTemp, producedVideoPath);
        resolve(producedVideoPath);
      })
      .on("error", (err: any) => reject(err))
      .on("progress", (p: any) => log(`    progress: ${Math.floor(p.percent)}%`))

      .run();
  });
};

export const getVideoDuration = async (videoPath: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, function (err, metadata) {
      if (err) {
        console.error(err);
        reject(err);
        return;
      }

      const videoStream = metadata.streams.find((stream) => stream.codec_type === "video");
      const duration = +(videoStream?.duration || 0);

      resolve(duration);
    });
  });
};

export const mergeMp3Files = async (mp3Files: string[], producedMp3Path: string) => {
  return new Promise((resolve, reject) => {
    if (PREVENT_OVERRIDE) {
      if (existsSync(producedMp3Path)) {
        log(`\n makeVideoVertical() called - video already exists, returning path:\n`, producedMp3Path, "\n\n");
        resolve(producedMp3Path);
        return;
      }
    }

    const producedMp3PathTemp = p(f(producedMp3Path).path, `x__temp_${Math.random()}.mp3`);

    const command = ffmpeg();

    mp3Files.forEach((mp3File) => {
      command.input(mp3File);
    });

    command
      .on("error", (err: any) => reject(err))
      .on("progress", (progress: any) => log(`    progress: ${Math.floor(progress.percent)}%`))
      .on("end", () => {
        renameSync(producedMp3PathTemp, producedMp3Path);
        resolve(producedMp3Path);
      })
      .mergeToFile(producedMp3PathTemp, f(producedMp3Path).path);
  });
};

export async function mergeVideos(videoPaths: string[], producedVideoPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (PREVENT_OVERRIDE) {
      if (existsSync(producedVideoPath)) {
        log(`\n makeVideoVertical() called - video already exists, returning path:\n`, producedVideoPath, "\n\n");
        resolve(producedVideoPath);
        return;
      }
    }

    const rnd = Math.floor(Math.random() * 999999) + 1;

    const producedVideoPathTemp = p(f(producedVideoPath).path, `x__temp_${rnd}.mp4`);
    let command = ffmpeg();

    videoPaths.forEach((videoPath, i) => {
      command = command.input(videoPath);
    });

    command
      // .inputOptions("-framerate 12")
      // .inputOptions("-t 2") // Set the video duration (2 seconds in this example)
      // .videoCodec("libx264") // Specify the video codec
      // .audioCodec("aac") // Specify the audio codec
      .on("error", (err: any) => reject(`2345234545: ${err}`))
      .on("progress", (progress: any) => log(`    progress: ${Math.floor(progress.percent)}%`))
      .on("end", () => {
        renameSync(producedVideoPathTemp, producedVideoPath);
        resolve(producedVideoPath);
      })
      .mergeToFile(producedVideoPathTemp, f(producedVideoPath).path);
  });
}

// export const convertPngToVideo = async (pngPath: string, mp3: string, producedVideoPath: string): Promise<string> => {
//   return new Promise((resolve, reject) => {

//     if (PREVENT_OVERRIDE) {
//       if (existsSync(producedVideoPath)) {
//         log(`\n makeVideoVertical() called - video already exists, returning path:\n`, producedVideoPath, "\n\n");
//         resolve(producedVideoPath);
//         return;
//       }
//     }

//     const producedVideoPathTemp = p(f(producedVideoPath).path, `x__temp_${Math.random()}.mp4`);

//     ffmpeg()
//       .input(pngPath)
//       .input(mp3)
//       .input(mp3)
//       .input(mp3)
//       .input(mp3)
//       .fps(29.97)
//       .output(producedVideoPathTemp)
//       .on("end", () => {
//         renameSync(producedVideoPathTemp, producedVideoPath);
//         resolve(producedVideoPath);
//       })
//       .on("error", (err: any) => reject(err))
//       .run();
//   });
// };

// export const convertPngsArrToVideo = async (pngPaths: string[], producedVideoPath: string) => {
//   return new Promise((resolve, reject) => {
//     const producedVideoPathTemp = p(f(producedVideoPath).path, `x__temp_${Math.random()}.mp4`);

//     const command = ffmpeg();

//     pngPaths.forEach((pngPath) => {
//       command.input(pngPath);
//     });

//     command
//       .output(producedVideoPathTemp)
//       .on("end", () => {
//         renameSync(producedVideoPathTemp, producedVideoPath);
//         resolve(producedVideoPath);
//       })
//       .on("error", (err: any) => reject(err))
//       .run();
//   });
// };
