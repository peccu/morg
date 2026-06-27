#!/usr/bin/env bash
# Netlify デプロイステータス確認スクリプト
# 使い方: ./scripts/netlify-status.sh [件数=5]

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: .env が見つかりません ($ENV_FILE)" >&2
  echo "  .env.example を参考に作成し、NETLIFY_TOKEN と NETLIFY_SITE_ID を設定してください" >&2
  exit 1
fi

# .env 読み込み（コメント・空行を除く）
while IFS='=' read -r key value; do
  [[ "$key" =~ ^# ]] && continue
  [[ -z "$key" ]] && continue
  key="${key%%[[:space:]]*}"
  value="${value%%[[:space:]]*}"
  declare "$key=$value"
done < <(grep -v '^#' "$ENV_FILE" | grep '=')

if [[ -z "${NETLIFY_TOKEN:-}" ]]; then
  echo "ERROR: NETLIFY_TOKEN が未設定です" >&2
  exit 1
fi
if [[ -z "${NETLIFY_SITE_ID:-}" ]]; then
  echo "ERROR: NETLIFY_SITE_ID が未設定です" >&2
  exit 1
fi

LIMIT="${1:-5}"
API="https://api.netlify.com/api/v1"

echo "=== Netlify デプロイ状況 (最新 ${LIMIT} 件) ==="
echo ""

curl -sf \
  -H "Authorization: Bearer ${NETLIFY_TOKEN}" \
  "${API}/sites/${NETLIFY_SITE_ID}/deploys?per_page=${LIMIT}" \
| python3 -c "
import sys, json
from datetime import datetime, timezone

deploys = json.load(sys.stdin)
icons = {'ready': '✅', 'error': '❌', 'building': '🔨', 'enqueued': '⏳', 'processing': '⚙️'}

for d in deploys:
    state = d.get('state', '?')
    icon  = icons.get(state, '❓')
    t     = d.get('created_at', '')[:19].replace('T', ' ')
    branch = d.get('branch', '-')
    msg   = (d.get('title') or d.get('commit_message') or '')[:60]
    print(f'{icon} {state:<12} {t}  [{branch}] {msg}')
    if d.get('error_message'):
        print(f'   ERROR: {d[\"error_message\"]}')
"
