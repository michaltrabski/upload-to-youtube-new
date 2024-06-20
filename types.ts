export interface Word {
  word: string;
  start: number;
  end: number;
  confidence: number;
  punctuated_word: string;
}

export interface Alternative {
  transcript: string;
  confidence: number;
  words: Word[];
}

export interface ChannelResult {
  alternatives: Alternative[];
}

export interface ModelInfo {
  [key: string]: {
    name: string;
    version: string;
    arch: string;
  };
}

export interface Metadata {
  transaction_key: string;
  request_id: string;
  sha256: string;
  created: string;
  duration: number;
  channels: number;
  models: string[];
  model_info: ModelInfo;
}

export interface TranscriptionFormDeepgram {
  metadata: Metadata;
  results: {
    channels: ChannelResult[];
  };
}

export interface chunkTranscript {
  text: string;
  duration: number;
}

export interface VideoChunk {
  selectedChunksFromVideoToProduceMergedVideo: string[];
  chunkTranscripts: chunkTranscript[];
  path: string;
  title: string;
  description: string;
  start: number;
  end: number;
  trimStart: number;
  trimEnd: number;
  duration: number;
  transcript: string;
  gap: number;
  words: Word[];
}

export interface ChunkFromVideo {
  path: string;
  title: string;
  titleForYt: string;
  titleInFolder: string;
  chunkTranscript: chunkTranscript;
  description: string;
  start: number;
  end: number;
  trimStart: number;
  trimEnd: number;
  duration: number;
  transcript: string;
  gap: number | null;
  words: any[];
  timestampsForYt: string[];
}
