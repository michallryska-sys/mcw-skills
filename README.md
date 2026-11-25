# mcw-skills

Small, practical skills for Claude Code. Instructions are in English; every skill answers in the
language you write in.

| Skill | What it does | Sub-agents |
|---|---|---|
| [`/trial`](skills/trial/SKILL.md) | Puts an idea on trial: a prosecutor and a defense argue, 3 jurors (5 with `--full`) vote on their own, a judge reads the verdict and what would flip it. For when Claude just agrees with you. | 5 (7) |
| [`/council`](skills/council/SKILL.md) | A second (third, fourth) opinion: sends your question to Gemini, GPT and Perplexity at once through OpenRouter, Claude answers independently too, then shows where they agree, where they disagree and what each one missed. `--debate` adds a round where they critique each other. Needs an [OpenRouter](https://openrouter.ai) key; a round costs a few cents. | 0 |
| [`/review-replies`](skills/review-replies/SKILL.md) | Drafts replies to Google / Facebook reviews in the owner's voice, under 60 words each, approved one at a time. Never publishes. | 0 |
| [`/instagram-post`](skills/instagram-post/SKILL.md) | Publishes an image + caption to Instagram through the Meta Graph API. Self-hosted, zero dependencies, always asks before posting. | 0 |

## Install

**As a Claude Code plugin** (recommended, gets updates):

```
/plugin marketplace add michallryska-sys/mcw-skills
/plugin install mcw-skills@mcw-skills
```

Installed as a plugin, the skills show up as `/mcw-skills:trial`, `/mcw-skills:council`, `/mcw-skills:review-replies` and
`/mcw-skills:instagram-post`.

**One command**, copies the skills into `~/.claude/skills` (keeps an existing `.env`):

```powershell
# Windows (PowerShell)
irm https://raw.githubusercontent.com/michallryska-sys/mcw-skills/main/install.ps1 | iex
```

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/michallryska-sys/mcw-skills/main/install.sh | sh
```

Only some skills: `... | sh -s -- trial review-replies`, or on Windows
`& ([scriptblock]::Create((irm https://raw.githubusercontent.com/michallryska-sys/mcw-skills/main/install.ps1))) trial review-replies`.

**By hand:**

```bash
git clone https://github.com/michallryska-sys/mcw-skills
cp -r mcw-skills/skills/trial ~/.claude/skills/
```

`council` needs Node 18+ and an OpenRouter key in `OPENROUTER_API_KEY`
(Windows: `setx OPENROUTER_API_KEY "sk-or-..."`, macOS/Linux: `export` it in your shell profile).
You pay OpenRouter directly for what you use; the skill never sees or stores your key anywhere else.

`instagram-post` needs Node 18+ and a one-time Meta app setup, described in its `SKILL.md`. Its
credentials go into `skills/instagram-post/.env` (see `.env.example`), which git ignores.

## Use

```
/trial Quit my job and open a coffee truck. I have €12,000 saved and a spot at the Saturday market.
/trial --full Raise our website package price from €900 to €1,400.
/council Is this sample size enough to detect a 10% difference? <design, numbers>
/council --debate Review this experiment protocol for flaws: <protocol>
/review-replies <paste the reviews>
/instagram-post Post this photo with a short caption about today's catch: <image URL>
```

## Po slovensky

Skilly odpovedajú v jazyku, v ktorom píšeš. Stačí `/trial` a zadanie po slovensky: celý súd,
porota aj verdikt budú po slovensky.

## Contributing

Run `node scripts/check.mjs` before you push. It checks every `SKILL.md` and scans the repo for
tokens and `.env` files; GitHub runs the same check on every push.

## Credits and licenses

- `trial` is inspired by [alexyc9381/court-skill](https://github.com/alexyc9381/court-skill) (MIT),
  rebuilt as a lighter version with no script and fewer sub-agents. MIT.
- `review-replies` is adapted from `review-reputation` in
  [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins)
  (Apache-2.0). It stays under Apache-2.0; see its `LICENSE`.
- Everything else: MIT, see [LICENSE](LICENSE).

Not made by Anthropic. `/trial` verdicts come from language models: treat them as a structured second
opinion, not legal, financial or professional advice.
