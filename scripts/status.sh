#!/usr/bin/env bash
# デプロイ & CI ステータス一括確認スクリプト
# 使い方:
#   ./scripts/status.sh          CI + Netlify 両方の最新状況
#   ./scripts/status.sh log      最新の CI 失敗ログを表示

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CMD="${1:-list}"

if [[ "$CMD" == "log" ]]; then
  exec "$SCRIPT_DIR/ci-status.sh" log "${2:-}"
fi

# === GitHub Actions CI ===
echo "=== CI (GitHub Actions) ==="
gh run list --limit 3 \
  --json status,conclusion,displayTitle,headBranch,createdAt,databaseId \
  --jq '.[] | (
    if .conclusion == "success" then "✅"
    elif .conclusion == "failure" then "❌"
    elif .status == "in_progress" then "🔨"
    else "⏳"
    end
  ) + " " + (.conclusion // .status | ascii_downcase | .[0:10] | . + (" " * (10 - length))) +
  " " + .createdAt[:19] + "  " + .displayTitle[:55]'

echo ""

# === Netlify Deploy ===
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "=== Netlify Deploy ==="
  echo "(スキップ: .env が見つかりません)"
  exit 0
fi

while IFS='=' read -r key value; do
  [[ "$key" =~ ^# ]] && continue
  [[ -z "$key" ]] && continue
  key="${key%%[[:space:]]*}"
  value="${value%%[[:space:]]*}"
  declare "$key=$value"
done < <(grep -v '^#' "$ENV_FILE" | grep '=')

if [[ -z "${NETLIFY_TOKEN:-}" || -z "${NETLIFY_SITE_ID:-}" ]]; then
  echo "=== Netlify Deploy ==="
  echo "(スキップ: NETLIFY_TOKEN / NETLIFY_SITE_ID が未設定)"
  exit 0
fi

echo "=== Netlify Deploy ==="
curl -sf \
  -H "Authorization: Bearer ${NETLIFY_TOKEN}" \
  "https://api.netlify.com/api/v1/sites/${NETLIFY_SITE_ID}/deploys?per_page=3" \
| python3 -c "
import sys, json
deploys = json.load(sys.stdin)
icons = {'ready': '✅', 'error': '❌', 'building': '🔨', 'enqueued': '⏳', 'processing': '⚙️'}
for d in deploys:
    state = d.get('state', '?')
    icon  = icons.get(state, '❓')
    t     = d.get('created_at', '')[:19].replace('T', ' ')
    msg   = (d.get('title') or d.get('commit_message') or '')[:55]
    print(f'{icon} {state:<10} {t}  {msg}')
    if d.get('error_message'):
        print(f'   ERROR: {d[\"error_message\"]}')
"
