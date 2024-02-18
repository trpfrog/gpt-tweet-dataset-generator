# gpt-tweet-dataset-generator

Twitter から取得できる全ツイート履歴から GPT-* の fine-tuning 用データセットを生成するツール

> [!WARNING]
> プロンプト生成部分が未完成です。generatePrompt がうまく動かない (プロンプトエンジニアリングをする必要がある)

## 何をするやつ？

- 全ツイート履歴から対話形式のデータセットを生成する
  - RT 直後のツイートは 「RT の内容」「直後のツイート」という会話形式のデータとする
  - そうでないツイートは「？？？」「ツイート」の「？？？」の部分を GPT-3.5 API で生成する (ここが現状うまくいってない)
- 生成したデータセットは `out` ディレクトリに保存される

## 使い方

1. Twitter から全ツイート履歴を取得する
2. `bun install`
3. 環境変数に適切な値を設定 (必要な環境変数は `src/env.ts` を参照)
    - `.env` を使用できます。
4. Twitter から取得しているツイート履歴に含まれる `tweets.js` や `tweets-part-*.js` などのファイル名を `tweet-data-paths.txτ` に追加
    - 例: `tweet-data-paths.txt`
      ```
      tweets.js
      tweets-part-1.js
      tweets-part-2.js
      ```
5. `bun start` で実行
    - OpenAI API を叩くことに注意してください
    - 1Password を使用する場合は `bun run start-with-op` で実行できます

## 動作環境

Bun 1.0.26 (Bun 固有の機能を使用していないので、TypeScript 入れて適切にコンパイルすれば他のランタイムでも動くはず)

## License

MIT
