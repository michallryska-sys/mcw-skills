#!/usr/bin/env sh
# Install mcw-skills into ~/.claude/skills
#   curl -fsSL https://raw.githubusercontent.com/michallryska-sys/mcw-skills/main/install.sh | sh
#   curl -fsSL .../install.sh | sh -s -- trial review-replies     (only some skills)
set -eu
REPO="https://github.com/michallryska-sys/mcw-skills"
DEST="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
ALL="trial council review-replies instagram-post"
WANT="${*:-$ALL}"

command -v git >/dev/null 2>&1 || { echo "mcw-skills: git is required" >&2; exit 1; }
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
git clone --quiet --depth 1 "$REPO" "$TMP/repo"
mkdir -p "$DEST"

for s in $WANT; do
  case " $ALL " in *" $s "*) ;; *) echo "mcw-skills: unknown skill '$s' (available: $ALL)" >&2; exit 1;; esac
  if [ -f "$DEST/$s/.env" ]; then cp "$DEST/$s/.env" "$TMP/$s.env"; fi
  rm -rf "${DEST:?}/$s"
  cp -R "$TMP/repo/skills/$s" "$DEST/$s"
  if [ -f "$TMP/$s.env" ]; then cp "$TMP/$s.env" "$DEST/$s/.env"; fi
  echo "installed /$s -> $DEST/$s"
done
echo "Done. Restart Claude Code (or open a new session) and type / to see the skills."
