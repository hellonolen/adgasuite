#!/usr/bin/env bash
set -euo pipefail

bucket="${1:-adga-assets}"
prefix="${2:-static}"
root=".open-next/assets"

if [ ! -d "$root" ]; then
  echo "Missing $root. Run npm run build:cf first." >&2
  exit 1
fi

while IFS= read -r -d '' file; do
  rel="${file#"$root"/}"
  key="$prefix/$rel"
  case "$file" in
    *.js) content_type="text/javascript; charset=utf-8" ;;
    *.css) content_type="text/css; charset=utf-8" ;;
    *.json) content_type="application/json; charset=utf-8" ;;
    *.html) content_type="text/html; charset=utf-8" ;;
    *.svg) content_type="image/svg+xml" ;;
    *.png) content_type="image/png" ;;
    *.jpg|*.jpeg) content_type="image/jpeg" ;;
    *.webp) content_type="image/webp" ;;
    *.ico) content_type="image/x-icon" ;;
    *.woff2) content_type="font/woff2" ;;
    *) content_type="application/octet-stream" ;;
  esac
  npx wrangler r2 object put "$bucket/$key" --file "$file" --content-type "$content_type" >/dev/null
done < <(find "$root" -type f -print0)
