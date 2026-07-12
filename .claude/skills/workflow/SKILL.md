---
description: 依頼された作業を進める際の標準ワークフロー。テスト→コミット→push→CI確認。
invocation: always
---

# 標準作業ワークフロー

## 手順

1. **実装** — 変更を加える
2. **テストを書く** — 変更に対応するテストを追加・更新する
3. **ローカルテストを通す** — 存在するコマンドだけ実行し、ないものはスキップする
   ```bash
   bun run --cwd apps/web test --run
   bun run --cwd apps/web typecheck
   bun run --cwd packages/functions test --run
   bun run --cwd packages/functions typecheck
   ```
4. **細かい単位でコミット** — 1つの変更・目的ごとに commit する（まとめてしない）。英語メッセージ必須、変更ファイルを個別にステージ（`git add -A` / `git add .` 禁止）
5. **push する**
6. **CI/CD の完了を待つ** — push 後に以下で状態を確認し、完了（成功 or 失敗）まで待つ
   ```bash
   bash scripts/status.sh
   ```
   失敗していたらログを確認して fix し、再度 1 から繰り返す。
