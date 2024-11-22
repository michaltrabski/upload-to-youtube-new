import { copy, copyFileSync, writeFileSync } from "fs-extra";
import { f } from "./utils";
import { Job } from "./types";
import path from "path";
import md5 from "md5";

const Jimp = require("jimp");

const sizeOf = require("image-size");

export const createTransparentPng = async (
  width: number,
  height: number,
  procucedFileLocation: string
): Promise<[string, number, number]> => {
  const image = await new Jimp(width, height, 0x00000000); // Initialize image with transparency
  // const image = await new Jimp(width, height, 0xff00004d); // Initialize image with transparency

  // Set image background to transparent (optional, achieved through constructor)
  // await image.background(0x00000000); // Replace with desired transparent color code if needed
  // await image.background(0xff00004d); // 0xFF00004D is a semi-transparent red color code

  // Save the image as PNG
  await image.writeAsync(procucedFileLocation);

  const dimensions = sizeOf(procucedFileLocation);

  return [procucedFileLocation, dimensions.width, dimensions.height];
};

export const overlayPng_v2 = async (
  job: Job,
  prefixText: string,
  foregroundPath: string,
  backgroundPath: string,
  // procucedFileLocation: string,
  x: number,
  y: number
): Promise<[string, number, number]> => {
  const prefix = md5(JSON.stringify({ job, foregroundPath, backgroundPath, x, y })).slice(0, 5);
  const procucedFileLocation = path.resolve(job.BASE_FOLDER, `${prefixText}_${prefix}.png`);

  const foregroundImage = await Jimp.read(foregroundPath);
  const backgroundImage = await Jimp.read(backgroundPath); // Fixed variable name

  // Check if foreground fits within background dimensions
  if (
    foregroundImage.getWidth() > backgroundImage.getWidth() ||
    foregroundImage.getHeight() > backgroundImage.getHeight()
  ) {
    throw new Error("Foreground image exceeds background dimensions.");
  }

  // Composite foreground onto background with transparency preserved
  await backgroundImage.composite(foregroundImage, x, y, { mode: Jimp.BLEND_SOURCE_OVER });

  // Save the combined image as PNG
  await backgroundImage.writeAsync(procucedFileLocation);
  // console.log(`Overlay image created: ${procucedFileLocation}`);

  const dimensions = sizeOf(procucedFileLocation);

  const width = dimensions.width;
  const height = dimensions.height;

  return [procucedFileLocation, width, height];
};

export async function createPngWithText(
  width: number,
  height: number,
  bgColor: string,
  text: string,
  textOptions: { font?: string; x?: number; y?: number },
  outputPath: string
): Promise<void> {
  try {
    const image = await new Jimp(width, height, bgColor);

    // Load font - assuming Jimp.loadFont is available and font path is correct
    const fontPath = textOptions.font || Jimp.FONT_SANS_128_WHITE; // Default font path
    const font = await Jimp.loadFont(fontPath);

    // Text positioning options (optional)
    const textX = textOptions.x || (width - Jimp.measureText(font, text)) / 2; // Centered by default
    const textY = textOptions.y || (height - Jimp.measureTextHeight(font, text, width)) / 2; // Middle by default

    // Add text to the image
    await image.print(font, textX, textY, text);

    // Save the image as PNG
    await image.writeAsync(outputPath);
    console.log(`PNG with text created: ${outputPath}`);
  } catch (error) {
    console.error("Error creating PNG:", error);
  }
}

export async function putTextOnPng(
  foregroundPath: string,
  text: string,
  options: { x: number; y: number; bgColor: string }
) {
  const { x, y, bgColor: textColor } = options;
  const foregroundImage = await Jimp.read(foregroundPath);
  const font = await Jimp.loadFont(Jimp.FONT_SANS_128_WHITE);

  const textWidth = Jimp.measureText(font, text);
  const textHeight = Jimp.measureTextHeight(font, text, foregroundImage.getWidth());
  const textX = x - textWidth / 2;
  const textY = y - textHeight / 2;

  const textImage = await Jimp.create(textWidth, textHeight, textColor);
  textImage.print(font, 0, 0, text);

  foregroundImage.composite(textImage, textX, textY);

  await foregroundImage.writeAsync(foregroundPath);
}
