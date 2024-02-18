import consola from "consola";
import fs from "fs/promises";
import { env } from "./env";
import { generate } from "./generate";
import { parseTweetData } from "./parse";

async function main() {
  const paths = await fs
    .readFile("tweet-data-paths.txt", "utf-8")
    .then((data) =>
      data
        .split("\n")
        .map((p) => p.replace("~", env.HOME))
        .filter(Boolean),
    );

  consola.info(
    `Found ${paths.length} tweet data files\n${paths
      .map((p) => `  - ${p}`)
      .join("\n")}`,
  );

  consola.start("Start parsing...");
  const tweets = await parseTweetData({
    paths,
    startDate: env.DATE_FROM,
  });

  const systemPrompt =
    "あなたは Twitter ユーザーのつまみさんです。ユーザの発言に対して、思ったことを自由にツイートしてください。";

  generate(tweets, systemPrompt);
}

main();
