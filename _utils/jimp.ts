const Jimp = require("jimp");

export async function createTransparentPng(width: number, height: number, outputPath: string) {
  try {
    const image = await new Jimp(width, height, 0x00000000); // Initialize image with transparency
    // const image = await new Jimp(width, height, 0xff00004d); // Initialize image with transparency

    // Set image background to transparent (optional, achieved through constructor)
    // await image.background(0x00000000); // Replace with desired transparent color code if needed
    // await image.background(0xff00004d); // 0xFF00004D is a semi-transparent red color code

    // Save the image as PNG
    await image.write(outputPath);
    console.log(`Transparent PNG created: ${outputPath}`);
  } catch (error) {
    console.error("Error creating PNG:", error);
  }
}

export async function overlayPng(
  foregroundPath: string,
  backgroundPath: string,
  outputPath: string,
  x: number,
  y: number
): Promise<void> {
  try {
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
    await backgroundImage.writeAsync(outputPath);
    console.log(`Overlay image created: ${outputPath}`);
  } catch (error) {
    console.error("Error overlaying images:", error);
  }
}

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
