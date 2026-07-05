# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## タスクと学習

@TASKS.md

---

## 開発ルール

- コミットは `main` に直接。英語のコミットメッセージ（日本語不可）
- `git add -A` / `git add .` 禁止。変更ファイルを個別にステージング
- **push前に必ず両方を実行して通過を確認してからpushする**:
  ```bash
  bun run --cwd apps/web test --run && bun run --cwd apps/web typecheck
  ```

---

## コマンド

```bash
# 開発サーバー
bun run --cwd apps/web dev

# テスト（全件）
bun run --cwd apps/web test --run
bun run --cwd packages/functions test --run

# テスト（特定ファイル）
bun run --cwd apps/web test ThreadList        # ファイル名でフィルタ

# 型チェック
bun run --cwd apps/web typecheck
bun run --cwd packages/functions typecheck

# ビルド
bun run build:all
```

Bun のパスは `/home/casaos/.bun/bin/bun`（PATH未登録の場合）。

---

## プロジェクト概要

**morg** — Gmail をモバイルで快適に整理するための Vue 3 PWA。  
モノレポ構成（Bun workspaces）:

| パッケージ | 役割 |
|---|---|
| `apps/web` | Vue 3 SPA（フロントエンド） |
| `packages/functions` | Netlify Functions（Gmail API プロキシ） |
| `packages/shared` | フロント／バック共通の型定義 |

**技術スタック**: Vue 3 `<script setup>` + Pinia + TanStack Vue Query + Tailwind CSS v4 + Vite + Vitest  
**デプロイ**: Netlify（`main` push → 自動デプロイ）

---

## アーキテクチャ

### API フロー

```
apiFetch()  ←→  /.netlify/functions/{name}  ←→  Gmail API
```

`apps/web/src/lib/api-fetch.ts` はすべての API 呼び出しの入口。  
- デモモード中は `demoFetch()` にリダイレクトしてモックデータを返す  
- 401 を受け取ると `useAuthStore().logout()` → ログイン画面へ  

Netlify Functions は**ステートレス**。認証状態は AES-256-GCM で暗号化した HttpOnly Cookie（セッション）で管理し、`getSession()` / `getValidToken()` でアクセストークンを透過的にリフレッシュする。

### Netlify Functions（`packages/functions/src/`）

| ファイル | 機能 |
|---|---|
| `auth-google.ts` | OAuth2 認可 URL を生成し state をクッキーに格納 |
| `auth-callback.ts` | 認可コードをトークンに交換し暗号化セッションを発行 |
| `auth-status.ts` | セッション確認、`{ authenticated, email }` を返す |
| `auth-logout.ts` | セッションクッキーを削除 |
| `gmail-threads.ts` | スレッド一覧（`q`, `pageToken`, `maxResults`） |
| `gmail-thread.ts` | スレッド詳細（`id`）、全メッセージボディ付き |
| `gmail-batch.ts` | スレッド一括操作（archive / trash / markRead / addLabel / removeLabel） |
| `gmail-message-batch.ts` | 個別メッセージへの同操作 |
| `gmail-labels.ts` | ラベル一覧 |

`packages/functions/src/lib/` の主要モジュール：
- **cookie.ts** — セッション暗号化・複合化
- **google-auth.ts** — OAuth2 ヘルパー（`InvalidGrantError` を throw して 401 に変換）
- **token.ts** — `getValidToken()`: 期限 60 秒前に自動リフレッシュ
- **gmail.ts** — Gmail API ラッパー、`toThreadListItem()` で UI 型に変換

### フロントエンド主要ファイル（`apps/web/src/`）

**ストア（Pinia）**:
- `stores/auth.ts` — 認証状態、`checkAuth()` / `login()` / `logout()`
- `stores/demo.ts` — デモモード on/off（`enter()` / `exit()`）
- `stores/plugins.ts` — プラグイン有効状態・設定（localStorage 永続化）
- `stores/taskQueue.ts` — 一括操作キュー。20件チャンク、並列実行、ETA 計算。  
  操作完了後に Vue Query キャッシュを更新（`lib/thread-cache.ts`）。  
  `bannerCollapsed` / `toggleBanner()` でバナー折りたたみ管理。  
  `processingThreadIds` computed で処理中スレッド ID セットを公開。

**コンポーザブル**:
- `useThreads.ts` — 無限スクロール対応スレッド一覧（TanStack Query, staleTime=1分）
- `useThread.ts` — スレッド詳細（staleTime=0, 常に新鮮）
- `useBulkAction.ts` — 一括操作実行（isProcessing, progress, eta）
- `useAppAPI.ts` — プラグイン向け API（notify / back / openUrl / gmail.*）
- `useSenders.ts` — スレッド一覧からアドレス正規化済み送信者サマリを集計
- `useWindowSafeArea.ts` — iPadOS Stage Manager 対応の CSS 変数（`--wsa-left`, `--wsa-top`）を JS で設定

**プラグインシステム（`plugins/`）**:
- `plugins/types.ts` — `Plugin`, `ThreadAction`, `AppAPI` の型
- `plugins/index.ts` — `registeredPlugins` 配列（ここに追加）
- `plugins/builtin/` — open-in-gmail, copy-subject, copy-html, webhook  
  プラグインの `name` / `description` / action の `label` は `i18n.global.t(...)` を呼ぶ getter で定義し、ロケール変更に追従させる

**その他**:
- `lib/demo-api.ts` + `lib/demo-data.ts` — デモモード用モック API
- `lib/thread-cache.ts` — 一括操作後の Vue Query キャッシュ手動更新
- `assets/main.css` — `.safe-top` / `.safe-left` / `.app-titlebar` カスタムクラス定義

### キャッシュ戦略

TanStack Query でスレッド一覧・詳細・ラベルをキャッシュ。  
一括操作後は API を再フェッチせず `applyThreadCacheUpdate()` でキャッシュを直接書き換えてパフォーマンスを確保する。

### i18n

`apps/web/src/i18n/` に `ja.ts` / `en.ts`。ブラウザ言語を自動検出し localStorage に保存。  
プラグインの文字列は Vue テンプレート外のため `i18n.global.t()` を使用。

---

## テストの注意点

- `ThreadList.vue` などでストアを追加したら、対応するテストファイルで `setActivePinia(createPinia())` と `vi.mock('@/stores/taskQueue', ...)` を追加する
- `useTaskQueueStore` は `useQueryClient()` を内部で呼ぶため、テストでは必ずモックする（[L007参照](.claude/rules/lessons.md)）
- モック対象モジュールに新エクスポートを追加したら `grep -rn "mock.*<module>"` で全テストファイルを洗い出して更新する
