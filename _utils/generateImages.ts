const puppeteer = require("puppeteer");
const fs = require("fs-extra");
const Downloader = require("nodejs-file-downloader");

import { f, textToSlug160 } from "./utils";
// generateImages("testPrompts.json");

interface Prompt {
  prompt: string;
  src?: string;
  newFileName: string;
}

export async function generateImages(headless: boolean, pathTofileNameWithPrompts: string) {
  const promptsFromJsonExamples = [
    {
      prompt: "Create an image of black man riding a bike.",
      // scr of generated image will be created
    },
  ];

  const promptsFromJson: Prompt[] = fs.readJSONSync(pathTofileNameWithPrompts);

  console.log({ promptsFromJson, pathTofileNameWithPrompts });

  const prompts = promptsFromJson
    .filter((promptFromJson) => !promptFromJson.src)
    .filter((promptFromJson) => !!promptFromJson.prompt);

  // Launch the browser and open a new blank page
  const browser = await puppeteer.launch({ headless });
  const page = await browser.newPage();

  // Navigate the page to a URL.
  await page.goto("https://app.stockdreams.ai/");

  // Set screen size.
  await page.setViewport({ width: 1380, height: 1100 });

  // login
  await page.locator('input[type="email"]').fill("michal.trabski@gmail.com");
  await page.locator('input[type="password"]').fill("JyjLGHCvcqJQYq6");
  await page.locator(".clickable-element.bubble-element.Button.baTaHaKb0").click();

  await wait(5000);

  await page.goto("https://app.stockdreams.ai/generator", { timeout: 0 });

  const createSingleImage = async (promtpIndex: number, prevUrl: string) => {
    const prompt = prompts[promtpIndex];
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator(".bubble-element.ionic-IonicToggle.clickable-element .ionic-toggle.toggle-balanced").click(); // save image
    await page.locator(".bubble-element.Text.baTaVyaI.bubble-r-vertical-center").click(); // choose orientatnion 16:9
    // await page.locator(".bubble-element.Text.baTaWaGm.bubble-r-vertical-center").click(); // choose orientatnion 9:16

    console.log({ prompt });
    await page.locator("textarea.bubble-element.MultiLineInput").fill(prompt.prompt);
    await wait(5 * 1000);
    await page.locator("button.clickable-element.bubble-element.Button").click();

    const getImageUrl = async () => {
      // Select the image and get the src attribute
      await page.waitForSelector(".bubble-element.Image.baTaSaQi img");
      const imageSrc = await page.evaluate(() => {
        const img = document.querySelector(".bubble-element.Image.baTaSaQi img") as HTMLImageElement;
        return img ? img.src : null;
      });

      console.log("Generated image src:", imageSrc);

      if (!imageSrc.includes("data:image") && imageSrc !== prevUrl) {
        prompt.src = imageSrc;

        const promptsFromJsonIndex = promptsFromJson.findIndex(
          (promptFromJson) => promptFromJson.prompt === prompt.prompt
        );
        promptsFromJson[promptsFromJsonIndex] = prompt;

        fs.writeJSONSync(pathTofileNameWithPrompts, promptsFromJson);

        await downloadFile(f(pathTofileNameWithPrompts).path, imageSrc, `${textToSlug160(prompt.prompt)}.png`);

        return;
      }

      await wait(10 * 1000);
      console.log("Waiting...", 10, "seconds");
    };

    for (let waitInterval of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]) {
      if (!prompt.src) {
        await getImageUrl();
      }
    }
  };

  for (let imageIndex of Array.from({ length: prompts.length }, (_, i) => i)) {
    await createSingleImage(imageIndex, prompts[imageIndex - 1]?.src || "");
  }

  for (const prompt of promptsFromJson.filter((prompt) => !!prompt.prompt)) {
    const newFileName = `${textToSlug160(prompt.prompt)}.png`;
    const src = prompt.src;

    if (src) {
      await downloadFile(f(pathTofileNameWithPrompts).path, src, newFileName);
      prompt.newFileName = newFileName;

      fs.writeJSONSync(pathTofileNameWithPrompts, promptsFromJson);
    }
  }

  // HELPER FUNCTIONS
  async function wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  async function downloadFile(dest: string, url: string, saveAsFileName: string) {
    if (fs.existsSync(`${saveAsFileName}`)) {
      // console.log(`File ${saveAsFileName} already exists`);
      return;
    }

    try {
      const downloader = new Downloader({
        url,
        directory: `${dest.replace(".json", "")}`,
        fileName: saveAsFileName,
      });

      await downloader.download();
    } catch (error) {
      console.log(error);
    }
  }

  // END HELPER FUNCTIONS
  await browser.close();
}
