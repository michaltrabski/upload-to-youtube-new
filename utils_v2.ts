import fs from "fs";

export const getAllMp4InFolder = (folder: string): string[] => {
  return fs.readdirSync(folder).filter((file) => {
    const isNotDirectory = !fs.lstatSync(`${folder}/${file}`).isDirectory();
    const hasMp4Extension = file.endsWith(".mp4") || file.endsWith(".MP4");
    return isNotDirectory && hasMp4Extension;
  });
};

export const getAllMp3InFolder = (folder: string): string[] => {
  return fs.readdirSync(folder).filter((file) => {
    const isNotDirectory = !fs.lstatSync(`${folder}/${file}`).isDirectory();
    const hasMp3Extension = file.endsWith(".mp3") || file.endsWith(".MP3");
    return isNotDirectory && hasMp3Extension;
  });
};
