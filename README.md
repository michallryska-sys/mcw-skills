# mcw-skills

Small, practical skills for Claude Code. Instructions are in English; every skill answers in the
language you write in.

| Skill | What it does | Sub-agents |
|---|---|---|
| [`/trial`](skills/trial/SKILL.md) | Puts an idea on trial: a prosecutor and a defense argue, 3 jurors (5 with `--full`) vote on their own, a judge reads the verdict and what would flip it. For when Claude just agrees with you. | 5 (7) |
| [`/review-replies`](skills/review-replies/SKILL.md) | Drafts replies to Google / Facebook reviews in the owner's voice, under 60 words each, approved one at a time. Never publishes. | 0 |
| [`/instagram-post`](skills/instagram-post/SKILL.md) | Publishes an image + caption to Instagram through the Meta Graph API. Self-hosted, zero dependencies, always asks before posting. | 0 |

## Install

Copy the skills you want into your personal skills folder:

```bash
git clone https://github.com/OWNER/mcw-skills
cp -r mcw-skills/skills/trial ~/.claude/skills/
cp -r mcw-skills/skills/review-replies ~/.claude/skills/
cp -r mcw-skills/skills/instagram-post ~/.claude/skills/
```

Or paste this into Claude Code:

```
https://github.com/OWNER/mcw-skills
Install the skills from this repo into ~/.claude/skills, then confirm they show up.
```

`instagram-post` needs Node 18+ and a one-time Meta app setup, described in its `SKILL.md`. Its
credentials go into `skills/instagram-post/.env` (see `.env.example`), which git ignores.

## Use

```
/trial Quit my job and open a coffee truck. I have €12,000 saved and a spot at the Saturday market.
/trial --full Raise our website package price from €900 to €1,400.
/review-replies <paste the reviews>
/instagram-post Post this photo with a short caption about today's catch: <image URL>
```

## Po slovensky

Skilly odpovedajú v jazyku, v ktorom píšeš. Stačí `/trial` a zadanie po slovensky: celý súd,
porota aj verdikt budú po slovensky.

## Credits and licenses

- `trial` is inspired by [alexyc9381/court-skill](https://github.com/alexyc9381/court-skill) (MIT),
  rebuilt as a lighter version with no script and fewer sub-agents. MIT.
- `review-replies` is adapted from `review-reputation` in
  [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins)
  (Apache-2.0). It stays under Apache-2.0; see its `LICENSE`.
- Everything else: MIT, see [LICENSE](LICENSE).

Not made by Anthropic. `/trial` verdicts come from language models: treat them as a structured second
opinion, not legal, financial or professional advice.
