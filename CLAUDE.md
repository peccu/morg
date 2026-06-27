# morg — Claude Code 設定

## タスクと学習

@TASKS.md

---

## プロジェクト概要

Vue 3 PWA のメール整理アプリ（Gmail API連携）。
モノレポ構成: `apps/web`（フロントエンド）、`packages/functions`（Netlify Functions）。

## 技術スタック

- **フロント**: Vue 3 `<script setup>`, Pinia, `@tanstack/vue-query`, Tailwind CSS
- **ビルド**: Vite + Bun（`/home/casaos/.bun/bin/bun`）
- **テスト**: Vitest + `@vue/test-utils`
- **デプロイ**: Netlify（mainへのpushで自動デプロイ）

## 開発ルール

- テスト: `bun run --cwd apps/web test --run`
- 型チェック: `bun run --cwd apps/web typecheck`
- コミットはmainに直接。細かく・日本語不可（英語のコミットメッセージ）
- `git add -A` / `git add .` は禁止。変更ファイルを個別にステージング

## ファイル構成（主要）

```
apps/web/src/
  components/     # BulkActionBar, ThreadList, ThreadListItem
  composables/    # useBulkAction, useThread, useToast, useAppAPI
  plugins/        # builtin plugins (webhook, open-in-gmail, copy-subject)
  stores/         # auth, plugins (Pinia)
  views/          # InboxView, ThreadView, PluginsView, InfoView
```
