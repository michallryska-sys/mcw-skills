---
name: trial
description: >-
  A lightweight trial for an idea. A prosecutor and a defense (2 sub-agents)
  build the strongest honest case against and for it, then 3 jurors with
  different lenses (5 with --full) vote GUILTY / NOT GUILTY on their own, and
  you, as judge, read the verdict and the conditions for acquittal. Answers in
  the user's language. Use when the user types /trial, wants honest pushback
  instead of agreement, asks "is this a good idea?", wants a plan, offer, price
  or claim stress-tested, or says "put it on trial".
argument-hint: "[--full] <the idea, plan or claim>"
license: MIT
metadata:
  source: "https://github.com/michallryska-sys/mcw-skills"
  inspired-by: "https://github.com/alexyc9381/court-skill (MIT)"
  version: "1.0.0"
---

# Trial (lite)

When Claude agrees with everything, put the idea on trial instead.

The user's request: `$ARGUMENTS`

If it is blank, take the idea, plan or claim the user most recently wanted an opinion on. If this
skill fired on its own (the user never asked for a trial), ask once before starting.

## Language

Run the whole trial in the language the user writes in: the case file, every sub-agent prompt, every
answer and the verdict. Translate the fixed words too (GUILTY / NOT GUILTY, the section headings and
the four juror line labels), and use the same translation everywhere in one trial.

## Size

| mode | sub-agents |
| --- | --- |
| default | prosecutor + defense + 3 jurors = **5** |
| `--full` | prosecutor + defense + 5 jurors = **7** |

Tell the user the size in one line, then start.

## Step 1: the case file

Sub-agents cannot see this conversation. Write a **case file** that stands on its own:

- First line: the case in one sentence, in the user's own words where you can.
- Then everything the user told you that matters: numbers, audience, budget, timeline, what they have
  already tried, constraints.
- Do not add facts the user never gave, and do not write your own opinion into it. A case file that
  leans one way decides the trial before it starts.

Keep the case file in memory and paste it into the prompts. Write nothing to disk.

The charge is always: **"The case fails as stated: it should not go ahead the way it is described."**

## Step 2: prosecutor and defense (one wave, 2 parallel calls)

In a single message, make 2 Agent tool calls (`subagent_type: general-purpose`, `description:
trial prosecutor` / `trial defense`). Each prompt contains the case file, the charge and:

Common opening:
> You are part of a trial of an idea. You know only what is in the case file. Never invent facts,
> numbers or sources. Where the case file is silent, say what is missing and why it matters. Answer
> in <language>, directly in your reply. Do not write any files.

Prosecutor:
> You are the PROSECUTOR. Build the strongest honest case that the charge holds. 3 to 4 numbered
> points. Each names one concrete way the case fails, the evidence for it from the case file (quote
> it) and what it costs if you are right. Attack the case as written, never a weaker version of it.
> No insults, no praise. 250 words at most.

Defense:
> You are the DEFENSE. Build the strongest honest case that the charge does not hold and the case
> should go ahead. 3 to 4 numbered points. Each names one concrete strength, the evidence for it from
> the case file (quote it) and why it outweighs the obvious objection. If a part cannot be defended,
> concede it in one sentence instead of spinning it. 250 words at most.

Wait for both. The lite version has no rebuttal round.

## Step 3: the jury (one wave, 3 or 5 parallel calls)

The jurors (the default jury is the first three, `--full` seats all five):

1. **Accountant**: money, cash flow, payback, and the month the savings run out.
2. **First-time paying customer**: would I buy this, for how much, and why from you.
3. **Doer**: the person who has to actually do it. Time, capacity, what breaks on Monday morning.
4. **Competitor**: how I would beat you, copy you or undercut you.
5. **Sceptical investor**: risk, scale, and what happens when it does not work.

In a single message, make one Agent call per juror (`description: trial juror N`). Each prompt
contains the common opening, the case file, the charge, the full prosecutor and defense statements
and:

> You are JUROR N: <name>. <lens>. You decide alone and will never see the other jurors. You owe the
> case nothing. Voting for it to be kind, or against it to look tough, is contempt of court. Reply
> with exactly these four lines and nothing else:
>
> VOTE: GUILTY or NOT GUILTY
> REASON: one sentence, in your own voice
> DECIDING FACT: the one fact from the case file or the statements that decided it
> WOULD FLIP IF: the one concrete change to the case that would make you vote the other way

If a juror replies in the wrong format, run it once more. If it fails again, record NO VOTE. Never
vote on a juror's behalf.

## Step 4: the verdict (you, as judge)

Count the votes. A GUILTY majority is **GUILTY**, a NOT GUILTY majority is **NOT GUILTY**, a tie is
a **HUNG JURY**. Never recount, soften or change the votes.

Print exactly this shape, translated into the user's language:

```
# Verdict: GUILTY, 2 to 1

**The case:** <first line of the case file>

| Juror | Vote | Why |
|---|---|---|
| Accountant | GUILTY | ... |

## Charges that stuck
The 2 to 3 objections the jurors leaned on most, one sentence each (how many jurors cited it).

## What the defense got right
The 2 strongest points in the case's favour.

## Conditions for acquittal
3 specific changes built from the WOULD FLIP IF lines. Each one is something the user can do this week.

## The sentence
One short paragraph in a judge's voice: what the user should do next.
```

Rules for you as judge:

- Build every section only from what the sides and jurors said. Add no arguments of your own and no
  praise the jury did not give.
- A guilty verdict is useful information, not bad news to cushion.
- If the user disagrees, offer a retrial with a case file rewritten from the "Conditions for
  acquittal". Do not argue for either side yourself.
- Save nothing unless the user asks. If they do, write the verdict and both statements to
  `.trial/<YYYYMMDD-HHMM>-verdict.md` in the current folder.
