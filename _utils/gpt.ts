import OpenAI from "openai";

import { ChatCompletionMessageParam } from "openai/resources";

require("dotenv").config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const askChatGpt = async (question: string) => {
  await new Promise((resolve) => setTimeout(resolve, 1));

  return "answer from GPT is blocked for now, uncomment it in the code to use it";

  const message: ChatCompletionMessageParam = {
    role: "user",
    content: question,
  };

  const chatCompletion = await openai.chat.completions.create({
    messages: [message],
    model: "gpt-3.5-turbo",
    // model: "gpt-4",
    // model: "gpt-4-turbo-preview",
  });

  const answer = chatCompletion.choices[0].message.content || "";

  if (!answer) {
    throw new Error("GPT answer is empty");
  }

  return answer;
};
