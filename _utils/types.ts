export type Format = "HORIZONTAL" | "VERTICAL";
// const createdVideos: CreatedVideoData[] = [];

type VideoType =
  | "MAKE_HORIZONTAL_VIDEO"
  | "TRIM_VIDEO_TESTY_YOUTUBE"
  | "MAKE_LONG_WITH_DRIVING_QUESTIONS"
  | "MERGE_VIDEOS"
  | "MAKE_VIDEO_WITH_ANY_DRIVING_QUESTIONS"
  | "MAKE_EBIKE_ACCELERATION_SHORTS_VIDEO"
  | "CREATE_EXAM"
  | "ROWER_PRZYSPIESZONE_WIDEO_Z_GADANIEM"
  | "ROWER_JAZDA_Z_GARMINEM_I_GADANIEM";
export interface Job {
  EXECUTE?: boolean;
  TYPE?: VideoType;
  ORIENTATION: "HORIZONTAL" | "VERTICAL";
  DEEPGRAM_LANG: "en" | "pl";
  TRIM_EALIER: number;
  TRIM_LATER: number;
  MIN_GAP_BEEWEEN_WORDS_TO_SPLICE_VIDEO: number;
  GAP_TO_DETERMIN_WHEN_NEXT_VIDEO_START: number;
  BASE_DIR: string;
  BASE_FOLDER: string;
  PRODUCED_FOLDER?: string; // remove this
  FLIP_CHUNK?: boolean;
  ZOOM_IN_INSIDE_CHUNK?: boolean;
  MERGE_CHUNKS_IN_EVERY_SINGLE_FOLDER?: boolean;
  CREATE_VERTICAL_CHUNKS?: boolean;
  MERGE_ALL_CHUNKS_FROM_ALL_FOLDERS?: boolean;
  MERGE_ALL_VERTICAL_CHUNKS_FROM_ALL_FOLDERS?: boolean;
}

// export interface CreatedVideoData {
//   videoPath: string;
//   videoName: string;
//   screenshotPath: string;
//   screenshotName: string;
// }

export interface ManipulateVideoOptions {
  size?: string; // "1920x1080"
  blur?: number; // 10
  scale?: number;
  crop?: number;
  cropTopRight?: number;
  volume?: number;
  fps?: number;
}

export interface DrivingQuestion {
  id: string;
  media: string;
  text: string;
  r: string;
  a: string;
  b: string;
  c: string;
  categories: string[];
}
