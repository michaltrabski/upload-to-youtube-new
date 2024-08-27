import { Job } from "./_utils/types";
import { p } from "./_utils/utils";

const makeHorizontalVideos: Job = {
  TYPE: "MAKE_HORIZONTAL_VIDEO",
  ORIENTATION: "HORIZONTAL",
  DEEPGRAM_LANG: "pl", // "en" | "pl"
  TRIM_EALIER: 1, // 0.3
  TRIM_LATER: 1, // 0.5
  MIN_GAP_BEEWEEN_WORDS_TO_SPLICE_VIDEO: 2, // 0.9
  GAP_TO_DETERMIN_WHEN_NEXT_VIDEO_START: 999999,
  BASE_DIR: p(__dirname),
  BASE_FOLDER: p(__dirname, "videos-horizontal"),
  PRODUCED_FOLDER: p(__dirname, "PRODUCED_HORIZONTAL"),
  FLIP_CHUNK: false,
  MERGE_CHUNKS_IN_EVERY_SINGLE_FOLDER: false,
  CREATE_VERTICAL_CHUNKS: false,
  MERGE_ALL_CHUNKS_FROM_ALL_FOLDERS: false,
};

const SETTINGS_VIDEO_IN_VIDEO: any = {
  ORIENTATION: "HORIZONTAL-VERTICAL",
  DEEPGRAM_LANG: "pl", // "en" | "pl"
  TRIM_EALIER: 0.5, // 0.3
  TRIM_LATER: 1, // 0.5
  MIN_GAP_BEEWEEN_WORDS_TO_SPLICE_VIDEO: 2, // 0.9
  GAP_TO_DETERMIN_WHEN_NEXT_VIDEO_START: 999999,
  BASE_FOLDER: p(__dirname, "video-in-video"),
  PRODUCED_FOLDER: p(__dirname, "video-in-video-PRODUCED"),
  FLIP_CHUNK: false,
  MERGE_CHUNKS_IN_EVERY_SINGLE_FOLDER: false,
  CREATE_VERTICAL_CHUNKS: false,
  MERGE_ALL_CHUNKS_FROM_ALL_FOLDERS: false,
};

const SETTINGS_HORIZONTAL_MERGE: Job = {
  ORIENTATION: "HORIZONTAL",
  DEEPGRAM_LANG: "pl", // "en" | "pl"
  TRIM_EALIER: 0,
  TRIM_LATER: 0,
  MIN_GAP_BEEWEEN_WORDS_TO_SPLICE_VIDEO: 0,
  GAP_TO_DETERMIN_WHEN_NEXT_VIDEO_START: 0,
  BASE_DIR: p(__dirname),
  BASE_FOLDER: p(__dirname, "videos-horizontal-merge"),
  PRODUCED_FOLDER: p(__dirname, "PRODUCED_HORIZONTAL_MERGE"),
};

// const SETTINGS_VERTICAL: Settings = {
//   ORIENTATION: "VERTICAL",
//   DEEPGRAM_LANG: "pl", // "en" | "pl"
//   TRIM_EALIER: 0.3,
//   TRIM_LATER: 2,
//   MIN_GAP_BEEWEEN_WORDS_TO_SPLICE_VIDEO: 11.6, // 11.6 is great for videos recorded on poznaj-testy;
//   GAP_TO_DETERMIN_WHEN_NEXT_VIDEO_START: 11.6,
//   BASE_FOLDER: p(__dirname, "videos-vertical"),
//   PRODUCED_FOLDER: p(__dirname, "PRODUCED_VERTICAL"),
// };

const SETTINGS_VERTICAL: Job = {
  EXECUTE: false,
  ORIENTATION: "VERTICAL",
  DEEPGRAM_LANG: "pl", // "en" | "pl"
  TRIM_EALIER: 0.3,
  TRIM_LATER: 8,
  MIN_GAP_BEEWEEN_WORDS_TO_SPLICE_VIDEO: 10,
  GAP_TO_DETERMIN_WHEN_NEXT_VIDEO_START: 10,
  BASE_DIR: p(__dirname),
  BASE_FOLDER: p(__dirname, "videos-vertical"),
  PRODUCED_FOLDER: p(__dirname, "PRODUCED_VERTICAL"),
};

const createLongVideosWithDrivingQuestions: Job = {
  TYPE: "MAKE_LONG_WITH_DRIVING_QUESTIONS",
  ORIENTATION: "VERTICAL",
  DEEPGRAM_LANG: "pl", // "en" | "pl"
  TRIM_EALIER: 0.5, // 0.3
  TRIM_LATER: 1, // 0.5
  MIN_GAP_BEEWEEN_WORDS_TO_SPLICE_VIDEO: 2, // 0.9
  GAP_TO_DETERMIN_WHEN_NEXT_VIDEO_START: 999999,
  BASE_DIR: p(__dirname),
  BASE_FOLDER: p(__dirname, "video_testy"),
  FLIP_CHUNK: false,
  MERGE_CHUNKS_IN_EVERY_SINGLE_FOLDER: false,
  CREATE_VERTICAL_CHUNKS: false,
  MERGE_ALL_CHUNKS_FROM_ALL_FOLDERS: false,
};

const eBikeHorizontalVideo: Job = {
  TYPE: "MAKE_HORIZONTAL_VIDEO",
  ORIENTATION: "HORIZONTAL",
  DEEPGRAM_LANG: "pl", // "en" | "pl"
  TRIM_EALIER: 0.8,
  TRIM_LATER: 1.5,
  MIN_GAP_BEEWEEN_WORDS_TO_SPLICE_VIDEO: 3,
  GAP_TO_DETERMIN_WHEN_NEXT_VIDEO_START: 999999,
  BASE_DIR: p(__dirname),
  BASE_FOLDER: p(__dirname, "ebike-horizontal"),
  FLIP_CHUNK: false, // garmin records videos upside down on chesty mount
  MERGE_CHUNKS_IN_EVERY_SINGLE_FOLDER: false,
  CREATE_VERTICAL_CHUNKS: false,
  MERGE_ALL_CHUNKS_FROM_ALL_FOLDERS: true,
  MERGE_ALL_VERTICAL_CHUNKS_FROM_ALL_FOLDERS: false,
};

const createChunksHorizontalVideo: Job = {
  TYPE: "MAKE_HORIZONTAL_VIDEO",
  ORIENTATION: "HORIZONTAL",
  DEEPGRAM_LANG: "pl", // "en" | "pl"
  TRIM_EALIER: 0.2,
  TRIM_LATER: 0.2,
  MIN_GAP_BEEWEEN_WORDS_TO_SPLICE_VIDEO: 0.5,
  GAP_TO_DETERMIN_WHEN_NEXT_VIDEO_START: 3,
  BASE_DIR: p(__dirname),
  BASE_FOLDER: p(__dirname, "create-chunks-horizontal"),
  FLIP_CHUNK: false, // garmin records videos upside down on chesty mount
  MERGE_CHUNKS_IN_EVERY_SINGLE_FOLDER: true,
  CREATE_VERTICAL_CHUNKS: false,
  MERGE_ALL_CHUNKS_FROM_ALL_FOLDERS: false,
  MERGE_ALL_VERTICAL_CHUNKS_FROM_ALL_FOLDERS: false,
};

const eBikeHorizontalVideoGarmin: Job = {
  TYPE: "MAKE_HORIZONTAL_VIDEO",
  ORIENTATION: "HORIZONTAL",
  DEEPGRAM_LANG: "pl", // "en" | "pl"
  TRIM_EALIER: 0.8,
  TRIM_LATER: 1.5,
  MIN_GAP_BEEWEEN_WORDS_TO_SPLICE_VIDEO: 3,
  GAP_TO_DETERMIN_WHEN_NEXT_VIDEO_START: 999999,
  BASE_DIR: p(__dirname),
  BASE_FOLDER: p(__dirname, "ebike-horizontal-video-garmin"),
  FLIP_CHUNK: true, // garmin records videos upside down on chesty mount
  MERGE_CHUNKS_IN_EVERY_SINGLE_FOLDER: false,
  CREATE_VERTICAL_CHUNKS: false,
  MERGE_ALL_CHUNKS_FROM_ALL_FOLDERS: false,
  MERGE_ALL_VERTICAL_CHUNKS_FROM_ALL_FOLDERS: false,
};

const eBikeVerticalVideo: Job = {
  TYPE: "MAKE_HORIZONTAL_VIDEO",
  ORIENTATION: "VERTICAL",
  DEEPGRAM_LANG: "pl", // "en" | "pl"
  TRIM_EALIER: 0.8,
  TRIM_LATER: 1.5,
  MIN_GAP_BEEWEEN_WORDS_TO_SPLICE_VIDEO: 3,
  GAP_TO_DETERMIN_WHEN_NEXT_VIDEO_START: 999999,
  BASE_DIR: p(__dirname),
  BASE_FOLDER: p(__dirname, "ebike-vertical"),
  FLIP_CHUNK: false, // garmin records videos upside down on chesty mount
  MERGE_CHUNKS_IN_EVERY_SINGLE_FOLDER: true,
  CREATE_VERTICAL_CHUNKS: false,
  MERGE_ALL_CHUNKS_FROM_ALL_FOLDERS: false,
  MERGE_ALL_VERTICAL_CHUNKS_FROM_ALL_FOLDERS: false,
};

const dieselHeaterVerticalVideo: Job = {
  TYPE: "MAKE_HORIZONTAL_VIDEO",
  ORIENTATION: "VERTICAL",
  DEEPGRAM_LANG: "pl", // "en" | "pl"
  TRIM_EALIER: 0.8,
  TRIM_LATER: 1.5,
  MIN_GAP_BEEWEEN_WORDS_TO_SPLICE_VIDEO: 3,
  GAP_TO_DETERMIN_WHEN_NEXT_VIDEO_START: 999999,
  BASE_DIR: p(__dirname),
  BASE_FOLDER: p(__dirname, "diesel-heater-vertical"),
  FLIP_CHUNK: false, // garmin records videos upside down on chesty mount
  MERGE_CHUNKS_IN_EVERY_SINGLE_FOLDER: true,
  CREATE_VERTICAL_CHUNKS: false,
  MERGE_ALL_CHUNKS_FROM_ALL_FOLDERS: false,
  MERGE_ALL_VERTICAL_CHUNKS_FROM_ALL_FOLDERS: false,
};

const mergeVideos: Job = {
  TYPE: "MERGE_VIDEOS",
  ORIENTATION: "HORIZONTAL",
  DEEPGRAM_LANG: "pl", // "en" | "pl"
  TRIM_EALIER: 1, // 0.3
  TRIM_LATER: 1, // 0.5
  MIN_GAP_BEEWEEN_WORDS_TO_SPLICE_VIDEO: 2, // 0.9
  GAP_TO_DETERMIN_WHEN_NEXT_VIDEO_START: 999999,
  BASE_DIR: p(__dirname),
  BASE_FOLDER: p(__dirname, "merge-videos"),
  FLIP_CHUNK: false,
  MERGE_CHUNKS_IN_EVERY_SINGLE_FOLDER: false,
  CREATE_VERTICAL_CHUNKS: false,
  MERGE_ALL_CHUNKS_FROM_ALL_FOLDERS: false,
};

const parkAcarHorizontalVideo: Job = {
  TYPE: "MAKE_HORIZONTAL_VIDEO",
  ORIENTATION: "HORIZONTAL",
  DEEPGRAM_LANG: "pl", // "en" | "pl"
  TRIM_EALIER: 3,
  TRIM_LATER: 5,
  MIN_GAP_BEEWEEN_WORDS_TO_SPLICE_VIDEO: 10,
  GAP_TO_DETERMIN_WHEN_NEXT_VIDEO_START: 999999,
  BASE_DIR: p(__dirname),
  BASE_FOLDER: p(__dirname, "parkowanie-samochodu"),
  FLIP_CHUNK: false, // garmin records videos upside down on chesty mount
  MERGE_CHUNKS_IN_EVERY_SINGLE_FOLDER: false,
  CREATE_VERTICAL_CHUNKS: false,
  MERGE_ALL_CHUNKS_FROM_ALL_FOLDERS: true,
  MERGE_ALL_VERTICAL_CHUNKS_FROM_ALL_FOLDERS: false,
};

const jazdaPoStrefieEgzaminacyjnejHorizontalVideo: Job = {
  TYPE: "MAKE_HORIZONTAL_VIDEO",
  ORIENTATION: "HORIZONTAL",
  DEEPGRAM_LANG: "pl", // "en" | "pl"
  TRIM_EALIER: 1,
  TRIM_LATER: 2,
  MIN_GAP_BEEWEEN_WORDS_TO_SPLICE_VIDEO: 4,
  GAP_TO_DETERMIN_WHEN_NEXT_VIDEO_START: 999999,
  BASE_DIR: p(__dirname),
  BASE_FOLDER: p(__dirname, "strefa-egzaminacyjna"),
  FLIP_CHUNK: false, // garmin records videos upside down on chesty mount
  ZOOM_IN_INSIDE_CHUNK: false,
  MERGE_CHUNKS_IN_EVERY_SINGLE_FOLDER: false,
  CREATE_VERTICAL_CHUNKS: true,
  MERGE_ALL_CHUNKS_FROM_ALL_FOLDERS: false,
  MERGE_ALL_VERTICAL_CHUNKS_FROM_ALL_FOLDERS: false,
};

export const ALL_JOBS: Job[] = [
  // HORIZONTAL
  { ...createChunksHorizontalVideo, EXECUTE: false },

  { ...parkAcarHorizontalVideo, EXECUTE: false },
  { ...jazdaPoStrefieEgzaminacyjnejHorizontalVideo, EXECUTE: true },

  { ...eBikeHorizontalVideo, EXECUTE: false },
  { ...eBikeHorizontalVideoGarmin, EXECUTE: false },

  { ...mergeVideos, EXECUTE: false },

  { ...createLongVideosWithDrivingQuestions, EXECUTE: false },

  // VERTICAL
  { ...eBikeVerticalVideo, EXECUTE: false },
  { ...dieselHeaterVerticalVideo, EXECUTE: false },
];
