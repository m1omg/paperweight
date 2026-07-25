#!/usr/bin/env bash
# PAPERWEIGHT — open the game in a browser.
# There is nothing to build; this just picks a browser and points it at the file.
set -e
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
page="file://$here/index.html"

for b in "$BROWSER" xdg-open google-chrome-stable chromium firefox open; do
  [ -n "$b" ] && command -v "$b" >/dev/null 2>&1 && exec "$b" "$page"
done

echo "No browser found. Open this yourself:"
echo "  $page"
