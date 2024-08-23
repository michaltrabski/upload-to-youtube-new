import path from "path";
import ffmpeg from "fluent-ffmpeg";
const sharp = require("sharp");
import { exec } from "child_process";
const { getVideoDurationInSeconds } = require("get-video-duration");

import fs, { copyFileSync, copySync, exists, existsSync, renameSync } from "fs-extra";
import { ManipulateVideoOptions, Job } from "./types";
import { f, p } from "./utils";

const PREVENT_OVERRIDE = true;
const LOG = true;

function log(...args: any[]) {
  if (LOG) console.log(...args);
}

export function createVideo(
  job: Job,
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
        log(`makeVideoVertical() called - video already exists, returning path:\n`, producedVideoPath, "\n\n");
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

    if (job.FLIP_CHUNK) {
      newFlip = ["vflip", "hflip"];
    }

    if (format === "HORIZONTAL") {
      ffmpeg()
        .input(originalVideoPath)
        .setStartTime(originalVideoTrimFrom)
        .setDuration(originalVideoTrimTo - originalVideoTrimFrom)
        // .fps(29.97)
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
        // .size(`${400}x?`) // michal
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
      .fps(29.97)
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
      .fps(29.97)
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

    // add codec
    // command.videoCodec("libx264");

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
          // .fps(29.97)
          .on("end", () => {
            renameSync(producedVideoPathTemp, producedVideoPath);
            resolve(producedVideoPath);
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
          // .fps(29.97)
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
        // .fps(29.97)
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
      .fps(29.97)
      .run();
  });
};

export const getVideoDuration = async (videoPath: string): Promise<number> => {
  const stream = fs.createReadStream(videoPath);

  const duration = await getVideoDurationInSeconds(stream);

  return duration;
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
      .fps(29.97)
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

    const producedVideoPathTemp = p(f(producedVideoPath).path, `_______temp_${rnd}.mp4`);
    let command = ffmpeg();

    videoPaths.forEach((videoPath, i) => {
      command = command.input(videoPath);
    });

    command
      .on("error", (err: any) => reject(`2345234545: ${err}`))
      .on("progress", (progress: any) => log(`    progress: ${Math.floor(progress.percent)}%`))
      .on("end", () => {
        renameSync(producedVideoPathTemp, producedVideoPath);
        resolve(producedVideoPath);
      })
      // .fps(29.97)
      .mergeToFile(producedVideoPathTemp, f(producedVideoPath).path);
  });
}

export async function mergeVideosWithBgMusic(
  videoPaths: string[],
  producedVideoPath: string,
  mp3Path: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (PREVENT_OVERRIDE) {
      if (existsSync(producedVideoPath)) {
        log(`\n mergeVideosWithBgMusic() called - video already exists, returning path:\n`, producedVideoPath, "\n\n");
        resolve(producedVideoPath);
        return;
      }
    }

    const rnd = Math.floor(Math.random() * 999999) + 1;
    const producedVideoPathTemp = p(f(producedVideoPath).path, `_______temp_${rnd}.mp4`);

    let command = ffmpeg();

    // Add each video as an input
    videoPaths.forEach((videoPath) => {
      command = command.input(videoPath);
    });

    // Add the MP3 as an input for the background music
    command = command.input(mp3Path);

    // Apply a complex filter to mix the video audio with the MP3 audio
    // Assuming all videos have the same audio configuration
    command
      .complexFilter([
        // Mix the audio from the videos and the MP3 file
        // Adjust the inputs ([0:a][1:a]) based on the number of videos and their order
        // This example assumes one video and one MP3 file
        `[0:a][1:a]amix=inputs=${videoPaths.length + 1}:duration=longest[a]`,
      ])
      .outputOptions([
        "-map 0:v", // Map the video stream from the first video input
        "-map [a]", // Map the mixed audio stream
      ])
      .audioCodec("aac") // Set audio codec
      .videoCodec("copy") // Copy the video stream without re-encoding
      .on("error", (err: any) => reject(`Error: ${err}`))
      .on("progress", (progress: any) => log(`    progress: ${Math.floor(progress.percent)}%`))
      .on("end", () => {
        renameSync(producedVideoPathTemp, producedVideoPath);
        resolve(producedVideoPath);
      })
      .fps(29.97)
      .save(producedVideoPathTemp);
  });
}

export const trimMp3 = async (mp3Path: string, producedMp3Path: string, from: number, to: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (PREVENT_OVERRIDE) {
      if (existsSync(producedMp3Path)) {
        log(`\n makeVideoVertical() called - video already exists, returning path:\n`, producedMp3Path, "\n\n");
        resolve(producedMp3Path);
        return;
      }
    }

    const producedMp3PathTemp = p(f(producedMp3Path).path, `x__temp_${Math.random()}.mp3`);

    ffmpeg()
      .input(mp3Path)
      .setStartTime(from)
      .setDuration(to - from)
      .output(producedMp3PathTemp)
      .on("end", () => {
        renameSync(producedMp3PathTemp, producedMp3Path);
        resolve(producedMp3Path);
      })
      .on("error", (err: any) => reject(err))
      .run();
  });
};
