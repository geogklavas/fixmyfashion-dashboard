# Skill: Sync Project Files After Sprint

## Purpose
Run at the end of every session after writing session notes to CLAUDE.md.
Keeps FixMyFashion_Tracker.xlsx and SPEC.md in sync with what shipped.

## File locations
- CLAUDE.md → ./CLAUDE.md (this repo)
- SPEC.md → ./SPEC.md (this repo)
- Tracker → C:\Users\George Gklavas\Desktop\FMF ADMIN\FixMyFashion_Tracker.xlsx

## Steps

### 1. Read session notes
Read the latest "## Session Notes — [date]" block at the bottom of CLAUDE.md.
This is the sprint just shipped.

### 2. Update SPEC.md
- Build order block: mark the sprint DONE with today's date
- Testing checklist: fix any counter/column/state drift vs spec body sections
- Replace any hello@fixmyfashion.gr → support@fixmyfashion.gr
- Preserve all existing structure and tone

### 3. Update FixMyFashion_Tracker.xlsx
Master Task List sheet:
- Add green section header: "🟢 SPRINT N — [title] (DONE DD/MM/YYYY)"
- Add one row per shipped change group. Columns: # | Task | Area | Priority | Status | Notes
- Mark Status as ✅ Done
- Update any existing task rows whose status changed this sprint

Decisions Log sheet:
- Append one row per decision formalised this sprint
- Columns: Date | Decision | Details | Alternatives rejected

B2B Dashboard KPIs sheet:
- Update status of any KPI whose data source shipped this sprint

Save workbook. Confirm 0 formula errors.

### 4. Report back
- What changed in SPEC.md (bullet list)
- What changed in tracker (tasks done, decisions logged)
- Any drift between CLAUDE.md and SPEC.md flagged for user confirmation
- Do NOT edit CLAUDE.md — flag issues only

## Rules
- Never touch Shopify, Klaviyo, or any external system
- Never ask user to upload or download files
- support@fixmyfashion.gr always — never hello@
- Keep tracker notes short and factual
- Do not break existing formulas or merged cells
4. Run skill: sync-project-files — syncs tracker and SPEC.md automatically
