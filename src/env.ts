import "dotenv/config";
import { z } from "zod";

export const env = z
  .object({
    /**
     * OpenAI API Key
     */
    OPENAI_API_KEY: z.string(),
    /**
     * OpenAI の chat モデル (e.g. `gpt-3.5-turbo`)
     */
    TEXT_COMPLETION_MODEL: z.string().default("gpt-3.5-turbo"),
    /**
     * プロンプトの生成に使うツイートの日付の下限
     */
    DATE_FROM: z.coerce.date().default(new Date(0)),
    /**
     * 出力に含めるシステムプロンプト
     */
    SYSTEM_PROMPT: z
      .string()
      .default(
        "あなたは Twitter ユーザーのつまみさんです。ユーザの発言に対して、思ったことを自由にツイートしてください。",
      ),

    // ここから下は OS に依存する環境変数
    HOME: z.string(),
  })
  .parse(process.env);
