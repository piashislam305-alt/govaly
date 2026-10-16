#!/usr/bin/env bash
# Mirror every CDN media asset listed in urls.txt into ./mirror, preserving the
# CDN path structure. Run from a machine with normal internet access.
#   bash cdn-audit/download.sh            # full resolution
#   WIDTH=800 bash cdn-audit/download.sh  # resized variants instead
set -euo pipefail
cd "$(dirname "$0")"
WIDTH="${WIDTH:-}"
mkdir -p mirror
while read -r url; do
  [ -z "$url" ] && continue
  target="$url"
  if [ -n "$WIDTH" ]; then
    # https://cdn.shopify.com/.../foo.jpg?v=1 -> https://vixenbrand.com/cdn/shop/.../foo_800x.jpg?v=1
    target=$(printf '%s' "$url" \
      | sed -E 's#https://cdn\.shopify\.com/s/files/1/0251/8217/5331/#https://vixenbrand.com/cdn/shop/#' \
      | sed -E "s#(\.[A-Za-z0-9]+)(\?|$)#_${WIDTH}x\1\2#")
  fi
  rel=$(printf '%s' "$target" | sed -E 's#^https?://[^/]+/##; s#\?.*$##')
  mkdir -p "mirror/$(dirname "$rel")"
  if [ -f "mirror/$rel" ]; then continue; fi
  curl -fsSL --retry 3 --retry-delay 2 -A 'govaly-cdn-audit/1.0' -o "mirror/$rel" "$target" \
    && echo "ok   $rel" || echo "FAIL $target"
  sleep 0.2
done < urls.txt
echo "done -> $(pwd)/mirror"
