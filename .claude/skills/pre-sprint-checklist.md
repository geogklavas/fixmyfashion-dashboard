# Skill: Pre-Sprint Checklist

## Purpose
Run at the start of every sprint before writing any code.
Reads current project state, then generates the sprint plan
for Claude Code — separating what YOU must do from what CLAUDE CODE builds.

## Steps

### 1. Read project state
Read these files in full:
- ./CLAUDE.md — session notes, deferred items, known bugs
- ./SPEC.md — build order, tab specs, error handling rules
- C:\Users\George Gklavas\Desktop\FMF ADMIN\FixMyFashion_Tracker.xlsx
  Sheets: Master Task List, Security & GDPR, B2B Dashboard KPIs

### 2. Identify what is pending
From the tracker Master Task List, find all tasks that are:
- Not Started
- Blocked (but blocker may now be resolved)
- In Progress but not completed

Ignore tasks marked ✅ Done, Removed, Deferred, or Merged.

### 3. Split into two lists

**List A — YOUR ACTIONS (not Claude Code)**
Tasks that require Shopify Admin, Klaviyo, Supabase UI,
manual file changes, or any external system.
For each:
- Task ID
- What to do (exact steps)
- Why it matters (what it unblocks)
- Estimated time

If any List A items are critical blockers for dashboard code,
say: "⛔ Complete these before Claude Code starts."

**List B — CLAUDE CODE TASKS**
Tasks that are purely dashboard code:
- TypeScript / Next.js changes
- API route changes
- UI component changes
- File updates (CLAUDE.md, SPEC.md, skill files)
- Anything inside the fixmyfashion-dashboard repo

For each task:
- Task ID
- One line: what to build
- Priority: 🔴 Critical / 🟠 High / 🟡 Medium
- Dependency: blocked by any List A item? yes/no
- Estimated complexity: small / medium / large

Sort by: Critical first, then unblocked tasks before blocked ones.

### 4. Security & GDPR check
Read Security & GDPR sheet.
List Critical items still Not Started.
If any: "⚠️ Resolve before onboarding next external brand: [list]"

### 5. Generate sprint plan

Determine the next sprint number by reading CLAUDE.md session notes
(latest sprint is the highest "Sprint N" header). Next sprint = N + 1.

Write the plan to `./SPRINT_PLAN.md` (overwrite if it exists) using
this exact structure, then also print it to chat so the user sees it
without opening the file:

```
# Sprint [N+1] — [suggested title]

_Generated [YYYY-MM-DD] by pre-sprint-checklist skill._

## ⛔ Blockers
[List any List A items that block Claude Code work, or "None."]

## 👤 Your actions first
1. **[Task ID]** — [exact steps]
   - Why: [what it unblocks]
   - Time: [estimate]

## 🤖 Claude Code builds

### Must-do (🔴 Critical)
- **[S{N+1}-C1]** [one-line description] — complexity: [s/m/l] — depends on List A: [yes/no]
- **[S{N+1}-C2]** ...

### Should-do (🟠 High)
- **[S{N+1}-S1]** ...

### Could-do (🟡 Medium)
- **[S{N+1}-M1]** ...

## ⚠️ Security & GDPR
[Critical Not Started items, or "None outstanding."]

## Scope
- Estimated size: [small / medium / large]
- Total Claude Code tasks: [count]
- Blocked by List A: [count]

## Suggested kickoff prompt
> Sprint [N+1]: complete [Sx-Cy] through [Sx-Cz]. Read CLAUDE.md
> and SPEC.md first. Ship in grouped commits.
```

Sorting rule: inside each priority bucket, unblocked tasks above
blocked ones. Use the `S{N+1}-C#` / `-S#` / `-M#` ID pattern so the
sprint plan IDs match the convention already in CLAUDE.md.

After writing the file, end your message with one line:
`Plan written to SPRINT_PLAN.md — review, then say "go" to start the sprint.`

## Rules
- Read all files fresh — never rely on memory from previous sessions
- Only include tasks Claude Code can actually do in the repo
- Never include Shopify, Klaviyo, Supabase UI tasks in List B
- Be specific — exact task IDs, exact descriptions
- Keep output scannable — bullets not paragraphs
- Do not write any code as part of this skill
- Tracker may be open in Excel — read it anyway, note the lock file
