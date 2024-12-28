import path from "path";
import ffmpeg from "fluent-ffmpeg";
const sharp = require("sharp");
import { exec } from "child_process";
const { getVideoDurationInSeconds } = require("get-video-duration");

import fs, { copyFileSync, copySync, exists, existsSync, renameSync } from "fs-extra";
import { ManipulateVideoOptions, Job } from "./types";
import { f, p } from "./utils";
import md5 from "md5";

const PREVENT_OVERRIDE = true;
const LOG = true;

function log(...args: any[]) {
  if (LOG) console.log(...args);
}

export function createVideoForRowery_v1(
  job: Job,
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

    // const SIZE = `${500}x?`;
    log(
      "createVideoForRowery_v1\n",
      producedVideoPath,
      `\nproduced video duration will be ${Math.floor(to - from)} seconds`
    );

    let newFlip: any = [];

    if (job.FLIP_CHUNK) {
      newFlip = ["vflip", "hflip"];
    }

    if (format === "HORIZONTAL") {
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
        // .outputOptions("-c:v", "libx264") // Use H.264 codec for video
        // .videoCodec("libx264")
        // .videoBitrate(1000)
        // .noAudio()
        // .videoFilters("fade=in:0:30")
        // .videoFilters("fade=in:0:30", "pad=640:480:0:40:violet")
        // .size(SIZE) // michal
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
        // .fps(29.97)
        .videoFilter("crop=ih*9/16:ih:(iw-ow)/2:(ih-oh)/2")
        .run();
    }
  });
}

interface VideoClip {
  path: string;
  start: number; // Start time in seconds
  duration: number; // Duration in seconds
  x: number; // X-coordinate of top-left corner
  y: number; // Y-coordinate of top-left corner
  width: number; // Width of the clip
  height: number; // Height of the clip
}

export function overlayVideosForRovery_v1(inputVideoPath: string, outputVideoPath: string, videoClips: VideoClip[]) {
  const ffmpegProcess = ffmpeg(inputVideoPath);

  console.log("overlayVideosForRovery_v1");
  // videoClips.forEach((clip, i) => {
  //   console.log(i, clip);
  //   ffmpegProcess.input(clip.path).complexFilter([
  //     {
  //       filter: "overlay",
  //       inputs: ["0", "1"],
  //       options: {
  //         x: clip.x,
  //         y: clip.y,
  //         t: clip.start,
  //         duration: clip.duration,
  //         shortest: 1,
  //       },
  //     },
  //   ]);
  // });

  ffmpegProcess
    .output(outputVideoPath)
    .videoFilter(`overlay=x=${videoClips[0].x}:y=${videoClips[0].y}`)

    .on("start", () => {})
    .on("progress", (progress: any) => {
      log(`   progress: ${progress.percent}%`);
    })
    .on("end", () => {
      console.log("Processing finished!");
    })
    .on("error", (err) => {
      console.error("An error occurred:", err);

      throw new Error(err);
    })
    .videoCodec("libx264") // Add this line to specify the video codec
    .audioCodec("aac") // Add this line to specify the audio codec
    .run();
}

export function putVideoOnVideoForRovery_v1(
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
          // Apply overlay filter
          // .complexFilter([
          //   "[0:v] [1:v] overlay=x=0:y=0:enable='between(t,0,4)'[v]", // Overlay video2 on video1 for the first 4 seconds
          // ])
          // .complexFilter([
          //   "[0:v] [1:v] overlay=x=0:y=0:enable='between(t,5,9)'[v]", // Overlay video2 on video1 from 5 to 9 seconds
          // ])
          .complexFilter([
            "[0:v] [1:v] overlay=x=0:y=0:enable='between(t,5,inf)'[v]", // Overlay video2 on video1 from 5 seconds onwards
          ])
          .outputOptions([
            "-map [v]", // Map the output to the filtered video stream
            "-map 0:a", // Map the audio from the first video
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
