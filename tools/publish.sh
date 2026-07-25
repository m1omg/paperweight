#!/usr/bin/env bash
# PAPERWEIGHT — create the GitHub repo, push, and switch on GitHub Pages.
#
# Needs a classic personal access token with the `repo` scope, in a file:
#
#     tools/publish.sh ~/.paperweight-token [owner] [repo]
#
# The token is never echoed, never passed on a command line, and never written
# into .git/config — it goes into a 0600 credential file git reads on demand.
set -euo pipefail

TOKEN_FILE="${1:-$HOME/.paperweight-token}"
OWNER="${2:-m1omg}"
REPO="${3:-paperweight}"
CREDS="$HOME/.paperweight-git-creds"

here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$here"

[ -r "$TOKEN_FILE" ] || { echo "no token file at $TOKEN_FILE"; exit 1; }
TOKEN="$(tr -d ' \t\r\n' < "$TOKEN_FILE")"
[ -n "$TOKEN" ] || { echo "token file is empty"; exit 1; }

api() {                      # api METHOD PATH [json]
  local method="$1" path="$2" body="${3:-}"
  local args=(-sS -w '\n%{http_code}' -X "$method"
              -H "Authorization: Bearer $TOKEN"
              -H "Accept: application/vnd.github+json"
              -H "X-GitHub-Api-Version: 2022-11-28"
              "https://api.github.com$path")
  [ -n "$body" ] && args+=(-H "Content-Type: application/json" -d "$body")
  curl "${args[@]}"
}

split() {                    # last line of api output is the status code
  STATUS="$(printf '%s' "$1" | tail -n1)"
  BODY="$(printf '%s' "$1" | sed '$d')"
}

jget() { printf '%s' "$1" | grep -o "\"$2\": *\"[^\"]*\"" | head -1 | sed 's/.*: *"//;s/"$//'; }

# ---------------------------------------------------------------- whoami ----
split "$(api GET /user)"
[ "$STATUS" = "200" ] || { echo "token rejected (HTTP $STATUS): $(jget "$BODY" message)"; exit 1; }
LOGIN="$(jget "$BODY" login)"
echo "authenticated as $LOGIN"
if [ "$LOGIN" != "$OWNER" ]; then
  echo "warning: token belongs to '$LOGIN', not '$OWNER' — pushing to $OWNER anyway"
fi

# ------------------------------------------------------------------ repo ----
split "$(api GET "/repos/$OWNER/$REPO")"
if [ "$STATUS" = "200" ]; then
  echo "repo $OWNER/$REPO already exists — reusing it"
else
  split "$(api POST /user/repos "$(cat <<JSON
{"name":"$REPO",
 "description":"A hand-drawn JRPG about the things we hold onto. No build step, no dependencies — synthesised music, generated art, three endings.",
 "homepage":"https://$OWNER.github.io/$REPO/",
 "private":false,
 "has_issues":true,
 "has_wiki":false,
 "has_projects":false}
JSON
)")"
  case "$STATUS" in
    201) echo "created $OWNER/$REPO" ;;
    *)   echo "could not create repo (HTTP $STATUS): $(jget "$BODY" message)"; exit 1 ;;
  esac
fi

# ------------------------------------------------------------------ push ----
umask 077
printf 'https://%s:%s@github.com\n' "$OWNER" "$TOKEN" > "$CREDS"
chmod 600 "$CREDS"
git config credential.helper "store --file=$CREDS"

git remote remove origin 2>/dev/null || true
git remote add origin "https://github.com/$OWNER/$REPO.git"
git push -u origin main
echo "pushed"

# ----------------------------------------------------------------- pages ----
split "$(api POST "/repos/$OWNER/$REPO/pages" \
  '{"source":{"branch":"main","path":"/"},"build_type":"legacy"}')"
case "$STATUS" in
  201) echo "GitHub Pages enabled" ;;
  409) echo "GitHub Pages was already enabled" ;;
  *)
    # Already configured, or needs the source updating instead of creating.
    split "$(api PUT "/repos/$OWNER/$REPO/pages" \
      '{"source":{"branch":"main","path":"/"},"build_type":"legacy"}')"
    if [ "$STATUS" = "204" ] || [ "$STATUS" = "200" ]; then
      echo "GitHub Pages source set to main /"
    else
      echo "could not enable Pages (HTTP $STATUS): $(jget "$BODY" message)"
      echo "turn it on by hand: Settings -> Pages -> Deploy from a branch -> main / (root)"
    fi
    ;;
esac

# Nudge a build and report where it will land.
api POST "/repos/$OWNER/$REPO/pages/builds" >/dev/null 2>&1 || true
echo
echo "repo:  https://github.com/$OWNER/$REPO"
echo "pages: https://$OWNER.github.io/$REPO/   (first build takes a minute or two)"
