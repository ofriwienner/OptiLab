# Bulk Features Procedure

This document describes the workflow for implementing multiple features in parallel with isolated worktrees and manual testing via the review script.

## Overview

1. User provides a feature list
2. Claude reads the codebase, filters unclear items, writes an implementation plan
3. Claude creates one git branch + worktree per feature
4. Claude spawns one agent per feature in parallel - all implement simultaneously
5. Claude updates `features_manifest.json` with all worktree paths and test descriptions
6. User runs `python review_features.py` to test each feature and approve/reject/fix

## Step-by-Step

### 1. Filter and collect work items

**New features** (from user request or FEATURES.md):
- Skip already-implemented items
- Skip items marked TBD or with missing specs
- Note skipped items and why

**Pending fixes** (from `features_manifest.json`):
- Read the manifest and collect all entries with `"status": "fix-requested"`
- Each has a `fix_notes` field describing what to fix and a `worktree_path` that already exists
- Include these alongside new features in the parallel work batch

### 2. Create implementation plan
- Read relevant source files before planning
- For each new feature: identify exact files and lines to change, describe the diff
- For each fix: read the existing worktree's code to understand the bug, describe how to fix it
- Flag dependencies between features (if feature B needs feature A, sequence them)

### 3. Create branches and worktrees (new features only)
```powershell
cd "C:\Users\ofriw\PycharmProjects\OptiLab"

git branch feat/<name>
git worktree add "..\OptiLab-worktrees\feat-<name>" feat/<name>
```
Worktrees live at `C:\Users\ofriw\PycharmProjects\OptiLab-worktrees\`.

**Fix-requested features already have worktrees** - do NOT create new ones, work in the existing `worktree_path` from the manifest.

### 4. Spawn agents in parallel
- One Agent tool call per item (new feature OR fix), all in the same message
- Each agent works ONLY in its own worktree directory
- Each agent commits its changes with a descriptive message
- For fixes: tell the agent the feature description, the fix_notes, and the worktree path; the agent reads the existing code, applies the fix, and commits

### 5. Update features_manifest.json
For **new features**, add an entry:
```json
{
  "id": N,
  "name": "Human-readable name",
  "description": "What to test and what correct behavior looks like",
  "branch": "feat/<name>",
  "worktree_path": "C:\\Users\\ofriw\\PycharmProjects\\OptiLab-worktrees\\feat-<name>",
  "status": "pending",
  "fix_notes": null,
  "reject_reason": null,
  "decided_at": null,
  "merged_at": null
}
```

For **fixed features**, update the existing entry: set `"status": "pending"` and `"fix_notes": null`.

### 6. Launch review script
```
python review_features.py
```
Run from a real terminal (PowerShell, CMD, Windows Terminal) - NOT via the `!` shortcut inside Claude Code, as that doesn't provide interactive stdin.

The script:
- Opens each worktree's `index.html` in your browser + VS Code
- Asks: [A]pprove / [R]eject / [F]ix needed / [S]kip
- Fix: describe the issue, optionally runs Claude automatically in that worktree
- Nothing merges until you explicitly confirm
- After merge: offers to archive (remove worktree + delete branch)

## Files

| File | Purpose |
|------|---------|
| `features_manifest.json` | Tracks all features, their branches, worktree paths, and review status |
| `review_features.py` | Interactive review/test/merge/archive script |
| `BULK_FEATURES_PROCEDURE.md` | This file |

## Status values in manifest

| Status | Meaning |
|--------|---------|
| `pending` | Not yet reviewed |
| `approved` | Tested and approved, queued for merge |
| `rejected` | Rejected (reason stored in `reject_reason`) |
| `fix-requested` | Needs a fix before re-review (description in `fix_notes`) |
| `merged` | Merged into main |

## Tips

- Worktrees are full independent checkouts - agents can't interfere with each other
- Each feature's `description` field in the manifest is the test instruction shown during review
- Approved features are NOT merged automatically - the script asks per-feature
- Fix round: features reappear at the top of the review queue on the next run
- After merging, always archive (remove worktree + delete branch) to keep the repo clean
