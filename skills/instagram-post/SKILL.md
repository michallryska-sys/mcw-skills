---
name: instagram-post
description: >-
  Publish a photo with a caption to an Instagram Business or Creator account
  through the Meta Graph API: self-hosted, no third-party service, zero
  dependencies (Node 18+). Always shows the image and exact caption and waits
  for confirmation before posting. Use when the user asks to post to Instagram,
  publish a photo or visual to IG, or share generated images on Instagram.
  Needs a one-time setup (Meta app + token). Not for stories, reels/video,
  reading feeds or analytics.
license: MIT
metadata:
  source: "https://github.com/michallryska-sys/mcw-skills"
  version: "1.0.0"
---

# Instagram post

Publishes a single image and caption to Instagram via the Meta Graph API. It runs
`scripts/ig.mjs` (Node 18+, no dependencies). Credentials live in `.env` in this skill's folder
(`${CLAUDE_SKILL_DIR}/.env`). A page access token derived from a long-lived user token does not expire.

Below, `IG` means `node "${CLAUDE_SKILL_DIR}/scripts/ig.mjs"`. If the variable looks unexpanded, use
the skill's base directory that Claude Code printed above.

## Hard rules

1. **Never publish without explicit confirmation.** Show the final image (URL or preview) AND the
   exact caption, then wait for the user's OK in this conversation. Publishing is public and
   cannot be undone from here.
2. The image must be a **public URL** (JPEG or PNG). A local file has to be uploaded somewhere public
   first (your own storage, a CDN). Ask the user where if unsure.
3. Write the caption in the account's language and voice. If the project has voice or hashtag rules
   (`README.md`, `PRODUCT.md`, `VOICE.md`), follow them. If not, ask for two past captions instead
   of guessing.
4. Never print, log or paste the contents of `.env`.

## Workflow

1. Get or generate the image (it must end up as a public URL).
2. Draft the caption and write it to a temporary UTF-8 file. Use `--caption-file`: shells
   (PowerShell especially) mangle newlines and emoji in inline arguments.
3. Show image + caption, get explicit confirmation.
4. Publish:
   ```bash
   IG post --image-url "<url>" --caption-file "<path>"
   ```
5. Give the user the permalink printed on stdout.

## Status check

```bash
IG status   # @username | followers | posts (also validates the token)
```

If it fails with an OAuth error, the token was revoked: redo setup steps 3 and 4.

## One-time setup (skip if `.env` exists)

Requirements: an Instagram **Business or Creator** account linked to a Facebook Page.

1. Create an app at developers.facebook.com (type: Business). Copy the App ID and App Secret
   (Settings → Basic).
2. In the Graph API Explorer (developers.facebook.com/tools/explorer) generate a short-lived user
   token with `pages_show_list`, `pages_read_engagement`, `instagram_basic`,
   `instagram_content_publish`. Select the Facebook Page linked to the IG account.
3. Exchange it for a long-lived token:
   ```bash
   IG exchange --app-id <ID> --app-secret <SECRET> --token <SHORT_TOKEN>
   ```
4. Find the IG account and save the page token to `.env`:
   ```bash
   IG discover --token <LONG_TOKEN> --save
   ```
5. Verify: `IG status`

The user should run steps 3 and 4 themselves, or paste tokens only into the command, never into
chat history that is shared.
