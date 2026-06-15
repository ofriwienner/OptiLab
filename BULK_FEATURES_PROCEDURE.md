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

### 1. Filter the feature list
- Skip already-implemented items
- Skip items marked ==TBD== or with missing specs
- Note skipped items and why

### 2. Create implementation plan
- Read relevant source files before planning
- For each feature: identify exact files and lines to change, describe the diff
- Flag dependencies between features (if feature B needs feature A, sequence them)

### 3. Create branches and worktrees
```powershell
cd "C:\Users\ofriw\PycharmProjects\OptiLab"

git branch feat/<name>
git worktree add "..\OptiLab-worktrees\feat-<name>" feat/<name>
```
Worktrees live at `C:\Users\ofriw\PycharmProjects\OptiLab-worktrees\`.

### 4. Spawn agents in parallel
- One Agent tool call per feature, all in the same message (parallel execution)
- Each agent works ONLY in its own worktree directory
- Each agent commits its changes with a descriptive message

### 5. Update features_manifest.json
After agents complete, write an entry per feature into `features_manifest.json`:
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
