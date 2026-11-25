---
name: council
description: >-
  A council of AI models. Sends a question, plan, calculation or text to
  Gemini (Google), GPT (OpenAI) and Perplexity (web + sources) at once through
  OpenRouter, Claude answers independently too, then compares where they agree,
  where they disagree and what each one missed. Optional second round where they
  critique each other. Answers in the user's language. Use for /council, "ask
  the others too", "second opinion", "what would Gemini/GPT/Perplexity say",
  "have someone else check this", for scientific questions, methodology,
  calculations, experiment design, and anything where one model's mistake
  would be expensive.
argument-hint: "[--debate] [--fast] [--models gemini,gpt,perplexity,grok,deepseek] <question or what to review>"
license: MIT
metadata:
  source: "https://github.com/michallryska-sys/mcw-skills"
  version: "1.0.0"
---

# Council

Every model has blind spots, Claude included. The council is not a vote. Its job is to find **what
each member missed** and what still needs checking.

The request: `$ARGUMENTS`

If it is blank, take the question or work the user is discussing right now.

`COUNCIL` means `node "${CLAUDE_SKILL_DIR}/council.mjs"`. If the variable looks unexpanded, use the
skill's base directory that Claude Code printed above.

## Language

Talk to the user in the language they write in, and write the brief in that language too: the
members answer in the language of the brief.

## Before the first run

It needs Node 18+ and an OpenRouter key in `OPENROUTER_API_KEY`. If `COUNCIL credit` says the key is
missing, show the user the setup lines it printed and stop. Never ask the user to paste the key into
the chat, and never print it.

## Flags

| flag | meaning |
|---|---|
| (none) | Gemini + GPT + Perplexity, the strongest default models. Usually 5 to 15 US cents a round. |
| `--fast` | cheaper models from the same three companies, about a third of the price |
| `--debate` | after round one, a second round where each member reads the others and critiques them. About double the cost. |
| `--models a,b,c` | your own line-up from: `gemini`, `gpt`, `perplexity`, `grok`, `deepseek` |

## Step 1: the brief

The other models cannot see this conversation or any files. Write `brief.md` so it stands on its own:

- **The question** in one sentence at the top.
- **Context:** what is being built, the goal, constraints, what was already tried and rejected.
- **Data and material pasted in:** numbers, measurements, units, formulas, the relevant parts of code
  or text. The content itself, not a file path.
- **What exactly to review:** for example "find flaws in the method", "check the calculation", "what
  alternative explanations have we not considered".
- **Do not put your own opinion or the answer you lean towards into it.** A model given a ready
  answer tends to confirm it. The whole value of the council is independence.
- **Never include** passwords, API keys, tokens or other people's personal data. The brief goes to
  OpenRouter and to the companies that run the models. **The script enforces this:** before
  sending, it scans everything going out and exits with code 3, sending nothing, if it finds a
  key, token, password, database URL or private key (these can never be allowed), or an email,
  phone number or IBAN (allowed only with `--allow-personal`, and only when it is the user's own
  and truly needed). On exit 3, fix the brief and run again; never add the flag on your own.

Run folder: `.council/<YYYYMMDD-HHMM>-<short-name>/` in the current project. Save the brief there as
`brief.md` (UTF-8). The record stays, so you can always look up who claimed what.

## Step 2: your own answer, before you see the others

Write your answer to the brief into `claude.md` in the same folder: just as critical, with your
confidence on each claim, about 500 words at most. Write it **before** you read anyone else, so you
are an equal member of the council and not just its clerk.

## Step 3: the others

```bash
COUNCIL ask --brief "<folder>/brief.md" --out "<folder>" [--fast] [--models ...]
```

The calls run in parallel, usually within a minute, and print time and cost per member. If one
fails, carry on with the rest and say so. If all fail, show the error and stop.

With `--debate`, after round one:

```bash
COUNCIL debate --out "<folder>"
```

Round two also gets your `claude.md`, so the others critique you too.

## Step 4: the synthesis

Read every answer (and the `*-round2.md` files after a debate) and reply in this shape, in the user's
language:

```
## Council: <question>
Members: Claude, Gemini, GPT, Perplexity · cost $0.0x · record: .council/...

### Agreement
Points all or nearly all members agree on. For each: who.

### Disagreement
Where they differ. For each: who claims what, why, and what would settle it
(a measurement, a calculation, a source, an experiment).

### What each one missed
Important points only one member raised. This is the most valuable part: do not drop a
minority view just because it is in the minority. Include what Claude missed.

### Needs checking
Claims, numbers and citations nobody backed up, or that contradict each other. List Perplexity's
sources with links, and remind the user to open and check citations before relying on them.

### Bottom line
2 to 4 sentences: what this means for the next step.
```

Rules for the synthesis:

- Quote and attribute exactly. Never credit a model with something it did not write.
- Do not soften disagreement, and do not favour your own view because it is yours. If the others
  convinced you, say so plainly.
- Agreement between models is not proof: they can share the same mistake from their training data.
  For scientific claims, a source, a calculation or a measurement decides, not a head count.
- If there were disagreements and no debate yet, offer `--debate` in one line at the end.

## Upkeep

`COUNCIL models` shows the line-up with current prices; UNAVAILABLE means a model was retired, so
change its id at the top of `council.mjs` (current ids: https://openrouter.ai/models).
`COUNCIL credit` shows what the key has spent.
