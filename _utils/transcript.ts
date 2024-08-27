import { exists, existsSync, writeFileSync } from "fs-extra";
import { VideoChunk } from "../types";
import { Job } from "./types";
import { convertSecondsToYtTimestamp, log, p } from "./utils";
import { askChatGpt } from "./gpt";

export async function mergeTranscriptFromAllChunksFromAllVideos(job: Job, videos: VideoChunk[]) {
  const { BASE_FOLDER } = job;
  const producedFolder = p(`${BASE_FOLDER}_PRODUCED`);
  const folderToCopy = p(producedFolder);
  const fileWithDescription = p(folderToCopy, `opis_na_youtube.txt`);
  if (existsSync(fileWithDescription)) {
    return;
  }

  if (videos.length === 0) {
    return [];
  }

  const timestamps: { time: number; text: string }[] = [];
  let time = 0;

  videos.forEach((video, i) => {
    video.chunkTranscripts.forEach((chunkTranscript, j) => {
      timestamps.push({ time, text: chunkTranscript.text });

      time += chunkTranscript.duration;
    });
  });

  const timestampsAsText = `${timestamps.map((t) => `${convertSecondsToYtTimestamp(t.time)} ${t.text}`).join("\n\n")}`;
  const trimmedTimestampsAsText = `${timestamps
    .map((t) => {
      if (t.text.length < 50) return null;

      return `${convertSecondsToYtTimestamp(t.time)} ${t.text.slice(0, 80)}`;
    })
    .filter((t) => t !== null)
    .join("\n\n")}`;

  const oCzymMowieWFilmie = `
      Napisz o czym mówię w filmie na podstawie tekstu.
      Wypowiedź zacznij od: "Cześć. W tym filmie wideo"
      ${timestampsAsText}
      `;

  const oCzymMowieWFilmieAnswer = await askChatGpt(oCzymMowieWFilmie);

  const pytanieOpodsumowanieFilmu = `
      Napisz podsumowanie filmu, które będzie umieszczone na YouTube na podstawie tekstu:
      ${timestampsAsText}
      `;


  const podsumowanieFilmu = await askChatGpt(pytanieOpodsumowanieFilmu);

  const opisFilmuNaYouTube = `To jest fragment filmu, który jest dostępny na moim kanale tutaj:
https://www.youtube.com/watch?v=_Uc4V6Kq02Q

${oCzymMowieWFilmieAnswer}

Timestampy:
${trimmedTimestampsAsText}

${podsumowanieFilmu}
`;

  log("opisFilmuNaYouTube.length =", opisFilmuNaYouTube.length);

  writeFileSync(p(folderToCopy, `opis_na_youtube.txt`), opisFilmuNaYouTube);
}
