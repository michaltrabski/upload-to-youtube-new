import { copy, copyFileSync, writeFileSync } from "fs-extra";
import { f } from "./utils";

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

export const overlayPng = async (
  foregroundPath: string,
  backgroundPath: string,
  procucedFileLocation: string,
  x: number,
  y: number
): Promise<[string, number, number]> => {
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
  console.log(`Overlay image created: ${procucedFileLocation}`);

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
    const fontPath = textOptions.font || Jimp.FONT_SANS_32_BLACK; // Default font path
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
