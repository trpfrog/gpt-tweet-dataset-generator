import consola from "consola";
import fs from "fs/promises";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import PQueue from "p-queue";
import { z } from "zod";
import { env } from "./env";
import type { Tweet } from "./parse";

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

type FineTuningFormat = {
  messages: {
    role: "user" | "assistant" | "system";
    content: string;
  }[];
};

type OpenAICompletionModel = Parameters<
  OpenAI["chat"]["completions"]["create"]
>[0]["model"];

/**
 * ツイートの内容を元にプロンプトを生成する
 * @param text ツイートの内容
 * @param model テキスト生成に使うモデル
 * @returns 生成されたプロンプト
 */
export async function generatePrompt(
  text: string,
  model: OpenAICompletionModel,
): Promise<string> {
  const messages: ChatCompletionMessageParam[] = [
    {
      role: "user",
      content:
        // biome-ignore lint/style/useTemplate: <explanation>
        "**Conversation Gap Filling Task**\n\n" +
        "**Task Instructions**:\n" +
        "You are given a fragment of a conversation between two individuals," +
        "where a part of the dialogue is missing and marked with '%%%???%%%'. " +
        "Your task is to infer and generate the missing piece of dialogue that logically " +
        "and conversationally fits into the marked position.\n\n" +
        "**Input Conversation**:\n" +
        "- Speaker 1: \n%%%???%%%\n" +
        `- Speaker 2: \n${text}\n\n` +
        "**Output Requirements**:\n" +
        "- Fill in the '%%%???%%%' with dialogue that would naturally lead to Speaker 2's response.\n" +
        "- The filled dialogue should be coherent, contextually appropriate, and maintain the flow of conversation.\n" +
        "- Consider any implied or explicit situational, emotional, " +
        "or environmental cues that could influence the missing dialogue.\n\n" +
        "Ensure your completion maintains relevance to the context, is realistic for a casual conversation, " +
        "and abides by general language usage norms.\n\n" +
        "In addition, please output the JSON format of the following example.\n\n" +
        "```json\n" +
        "{\n" +
        '  "message": "Your response here"\n' +
        "}\n" +
        "```\n",
    },
  ];

  const completion = await openai.chat.completions.create({
    messages,
    model,
    max_tokens: 300,
    temperature: 0.5,
    response_format: { type: "json_object" },
  });

  const response = JSON.parse(completion.choices[0].message.content ?? "{}");
  return z
    .object({
      message: z.string(),
    })
    .parse(response).message;
}

/**
 * ツイートが RT かどうかを判定する
 * @param tweet
 * @returns
 */
function isRT(tweet: Tweet) {
  return tweet.full_text.startsWith("RT @");
}

/**
 * ツイートの内容を元にプロンプトを生成し、ファイルに保存する
 * @param tweets ツイートのリスト
 * @param systemPrompt 生成結果に含めるシステムプロンプト
 */
export async function generate(tweets: Tweet[], systemPrompt: string) {
  if ((await fs.readdir("out").catch(() => null)) === null) {
    await fs.mkdir("out");
  }
  const outputFile = await fs.open(`out/output_${Date.now()}.jsonl`, "w");

  // OpenAI API の Rate limit を考慮してキューを使う
  const queue = new PQueue({
    interval: 1000 * 2,
    intervalCap: 10, // 300 Requests per minute
  });

  try {
    for (let i = 0; i < tweets.length; i++) {
      const tweet = tweets[i];
      if (isRT(tweet)) {
        continue;
      }
      const previousTweet = i > 0 ? tweets[i - 1] : null;
      const prvCreatedAt = previousTweet?.created_at.getTime() || 0;

      // RT 直後のツイートは、その RT の内容を元にプロンプトを生成する
      if (
        previousTweet &&
        isRT(previousTweet) &&
        prvCreatedAt - tweet.created_at.getTime() < 1000 * 60 * 1.5
      ) {
        const prompt: FineTuningFormat = {
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: previousTweet.full_text.replace(/^RT @.+?: /, ""),
            },
            {
              role: "assistant",
              content: tweet.full_text,
            },
          ],
        };
        outputFile.write(`${JSON.stringify(prompt)}\n`);
        continue;
      }

      // OpenAI API を使ってプロンプトを生成する
      // (Rate limit を考慮してキューを使う)
      queue.add(async () => {
        const prompt: FineTuningFormat = {
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: await generatePrompt(
                tweet.full_text,
                env.TEXT_COMPLETION_MODEL,
              ),
            },
            {
              role: "assistant",
              content: tweet.full_text,
            },
          ],
        };
        outputFile.write(`${JSON.stringify(prompt)}\n`);
      });
    }
  } finally {
    await queue.onIdle();
    outputFile.close();
    consola.success("Saved to output.jsonl");
  }
}
