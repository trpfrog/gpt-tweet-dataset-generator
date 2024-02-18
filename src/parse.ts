import path from "path";
import fs from "fs/promises";
import { z } from "zod";

const TweetSchema = z.object({
  tweet: z.object({
    id: z.string(),
    created_at: z.coerce.date(),
    full_text: z.string(),
    entities: z.object({
      user_mentions: z
        .object({
          name: z.string(),
          screen_name: z.string(),
          id: z.string(),
        })
        .array(),
      urls: z
        .object({
          url: z.string(),
        })
        .array(),
    }),
  }),
});

export type Tweet = z.infer<typeof TweetSchema>["tweet"];

/**
 * Twitter のアーカイブに含まれる tweets.js からツイートデータを抽出する
 * @param options
 * @returns
 */
export async function parseTweetData(options: {
  paths: string[];
  startDate: Date;
}): Promise<Tweet[]> {
  const record: Record<string, Tweet> = {};

  for (const tweetPath of options.paths) {
    const content = await fs.readFile(tweetPath, "utf-8");
    const rawData =
      path.extname(tweetPath) === ".js"
        ? Function(content.replace(/^.+ = \[/, "return ["))()
        : JSON.parse(content);
    const data = TweetSchema.array().parse(rawData);

    for (const { tweet } of data) {
      if (tweet.created_at < options.startDate) {
        continue;
      }
      record[tweet.id] = tweet;
    }
  }

  const uniqueTweets: Tweet[] = Object.values(record).filter(Boolean);
  return uniqueTweets.toSorted((a, b) => {
    return a.created_at.getTime() - b.created_at.getTime();
  });
}
