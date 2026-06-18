# Bulk Features Procedure

This document describes the workflow for implementing multiple features in parallel using GitHub Issues + PRs, with isolated worktrees and manual testing via the review script.

## Overview

1. Read `INBOX.md` + check GitHub for pending/fix-requested work
2. Create GitHub Issues from inbox items
3. Claim issues atomically to prevent double-implementation
4. Read codebase, plan implementations
5. Create one branch + worktree per feature, spawn agents in parallel
6. Push branches, create PRs labeled `ready-for-review`
7. Tell the user to run `python review_features.py`

## Step-by-Step

### 1. Collect work items

**New features from `INBOX.md`**:
- Read all bullet points
- Skip unclear/TBD items (note why)
- Skip items that appear already implemented in the codebase

**Unassigned pending issues on GitHub**:
```
gh issue list --label pending --no-assignee --json number,title,body
```

**Fix-requested PRs**:
```
gh pr list --label fix-requested --state open --json number,title,headRefName,body,reviews
```
Get the fix description from the latest `CHANGES_REQUESTED` review comment.

### 2. Create GitHub Issues from inbox items

For each inbox item, create an issue:
```
gh issue create --title "<feature name>" --body "<description and test instructions>" --label pending
```

Then clear the processed items from `INBOX.md`, leaving just the header.

### 3. Claim issues atomically

Before starting implementation, assign each issue to yourself:
```
gh issue edit <number> --add-assignee @me
```

GitHub assignment is atomic - if two workers race, the second sees the issue already assigned and skips it. Always pull and re-check before claiming.

### 4. Create implementation plan

- Read relevant source files before planning
- For each new feature: identify exact files and lines, describe the diff
- For each fix: read the existing branch's code, describe how to fix it

### 5. Create branches and worktrees

**New features only** - fix-requested PRs already have a branch.

```powershell
git branch feat/<name>
git worktree add "..\OptiLab-worktrees\feat-<name>" feat/<name>
```

Worktrees live at `C:\Users\ofriw\PycharmProjects\OptiLab-worktrees\` locally.
On a remote server, use a suitable temp path.

**For fix-requested PRs**, fetch the existing branch into a worktree:
```powershell
git fetch origin <branch>
git worktree add "..\OptiLab-worktrees\<branch-slug>" origin/<branch>
```

### 6. Spawn agents in parallel

One Agent tool call per item (new feature OR fix), all in the same message.

- Each agent works ONLY in its assigned worktree
- Each agent commits with a descriptive message
- **Fix agents must also push**: `git push origin HEAD:<branch>`

### 7. Push branches and create PRs (new features only)

```
git push origin feat/<name>
```

Create a PR using this exact body format (the review script parses it):
```
gh pr create `
  --title "<feature name>" `
  --body "## Description`n`n<test instructions>`n`nCloses #<issue_number>" `
  --label "ready-for-review" `
  --head feat/<name>
```

**For fix-requested PRs**: after the agent pushes, remove the `fix-requested` label so the PR re-enters the review queue:
```
gh pr edit <pr_number> --remove-label fix-requested
```

### 8. Clear INBOX.md

Remove all processed bullet points from `INBOX.md`, leaving just the header and `---`.

### 9. Tell the user to review

```
python review_features.py
```

Run from a real terminal (PowerShell, CMD, Windows Terminal) - NOT via `!` inside Claude Code, as that needs interactive stdin.

## Files

| File | Purpose |
|------|---------|
| `INBOX.md` | Quick-capture for new feature requests |
| `review_features.py` | Interactive review/test/merge script |
| `BULK_FEATURES_PROCEDURE.md` | This file |
| `features_manifest.json` | Historical record only - not used for new features |

## GitHub Labels

| Label | Applies to | Meaning |
|-------|-----------|---------|
| `pending` | Issue | Ready to be implemented, unassigned |
| `claimed` | Issue | Being implemented by a worker |
| `ready-for-review` | PR | Implementation done, awaiting user review |
| `fix-requested` | PR | User requested changes; also has `ready-for-review` |
| `approved` | PR | Approved during review, queued for merge |

## PR Body Format

The review script parses the PR body. Always use this format:

```
## Description

<what to test and what correct behavior looks like>

Closes #<issue_number>
```

## Common Pitfalls

- **Claim before implementing**: Always assign the issue before creating the worktree. Pull first so you don't miss claims made by the other worker.
- **PR body format**: Must include `## Description` and `Closes #<number>` - the review script parses both.
- **Fix agents must push**: Unlike new-feature agents that only commit locally, fix agents must run `git push origin HEAD:<branch>` after committing.
- **PowerShell 5.1 heredocs**: Use `@'...'@` (single-quoted, `'@` at column 0) for multi-line git messages. The bash `$(cat <<'EOF'...)` syntax does not work.
- **Resolving merge conflicts**: Run `git add <file>` before `git commit` after manual resolution.
- **Cloning elements**: Always use `rehydrateElement(JSON.parse(JSON.stringify(el)))` - never plain JSON clone.
- **Agent prompts for worktree fixes**: Agents need `--dangerously-skip-permissions` and `cwd` set to the worktree path.
