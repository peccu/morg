#!/usr/bin/env bash
# GitHub Actions CI ステータス確認スクリプト
# 使い方:
#   ./scripts/ci-status.sh          最新5件の一覧
#   ./scripts/ci-status.sh log      最新失敗ランのログを表示
#   ./scripts/ci-status.sh log <ID> 指定ランのログを表示

set -euo pipefail

CMD="${1:-list}"
RUN_ID="${2:-}"

case "$CMD" in
  list)
    echo "=== CI ステータス (最新 5 件) ==="
    echo ""
    gh run list --limit 5 \
      --json status,conclusion,displayTitle,headBranch,createdAt,databaseId \
      --jq '.[] | (
        if .conclusion == "success" then "✅"
        elif .conclusion == "failure" then "❌"
        elif .status == "in_progress" then "🔨"
        else "⏳"
        end
      ) + " " + (.conclusion // .status | ascii_downcase | .[0:12] | . + (" " * (12 - length))) +
      " " + .createdAt[:19] + "  [" + .headBranch + "] " + .displayTitle[:60] +
      "  #" + (.databaseId | tostring)'
    ;;
  log)
    if [[ -n "$RUN_ID" ]]; then
      TARGET_ID="$RUN_ID"
    else
      # 最新の失敗ランを自動取得
      TARGET_ID=$(gh run list --limit 10 \
        --json conclusion,databaseId \
        --jq 'first(.[] | select(.conclusion == "failure")) | .databaseId | tostring')
      if [[ -z "$TARGET_ID" ]]; then
        echo "失敗したランが見つかりません"
        exit 0
      fi
      echo "=== 最新の失敗ラン #${TARGET_ID} のログ ==="
      echo ""
    fi
    gh run view "$TARGET_ID" --log-failed 2>&1 | sed 's/\x1b\[[0-9;]*m//g'
    ;;
  *)
    echo "使い方: $0 [list|log [RUN_ID]]"
    exit 1
    ;;
esac
