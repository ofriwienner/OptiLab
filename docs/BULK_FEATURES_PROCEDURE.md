# Feature Pipeline

## How it works

```
INBOX.md  ──push──►  inbox-to-issues.yml  ──►  GitHub Issues (label: pending)
                                                         │
                                               nightly-implement.yml (2 AM UTC)
                                                         │
                                               GitHub PRs (label: ready-for-review)
                                                         │
                                             python review_features.py  (local)
                                               /          |          \
                                          Approve      Fix (F)      Reject
                                             │            │
                                        merge_pr    fix-requested label
                                                         │
                                               fix-pr.yml (cloud, auto)
                                                         │
                                          **Fix applied:** comment + label removed
                                                         │
                                             python review_features.py  (re-review)
```

## Step-by-step

### 1. Add feature requests

Edit `INBOX.md`, add a bullet point per feature, push to main.
The `inbox-to-issues.yml` workflow fires automatically and creates GitHub Issues labeled `pending`.

### 2. Nightly implementation

The `nightly-implement.yml` workflow runs at 2 AM UTC. It:
- Lists unassigned `pending` issues (up to 5)
- Assigns `claimed` label to each before implementing (prevents double-work)
- Creates a `feat/<number>-<slug>` branch per issue
- Implements the feature
- Opens a PR labeled `ready-for-review` with `Closes #<number>` in the body

Trigger manually: GitHub > Actions > "Nightly Feature Implementation" > Run workflow.

### 3. Review

Run locally:
```
python review_features.py
```

For each PR it opens a browser side-by-side (feature vs. reference) and prompts:
- **A** - Approve (queues for merge)
- **F** - Fix needed (describe it; cloud workflow applies the fix automatically in ~5 min)
- **B** - Accept as-is + create follow-up issue for the fix
- **R** - Reject (closes PR and issue)
- **S** - Skip (decide later)

### 4. Fix loop

When you choose **F**, the script:
1. Posts a `**Fix requested:** <your description>` comment on the PR
2. Adds the `fix-requested` label

`fix-pr.yml` triggers immediately. Claude reads the fix comment, applies it, then:
- Posts `**Fix applied:** <summary>` on the PR
- Removes the `fix-requested` label

Run `review_features.py` again. The PR re-enters the queue; the "Previous fix applied" line appears at the top so you know it's a re-review.

If the cloud fix fails, it posts a comment with a link to the Actions run. You can re-trigger via the **T** option in the review script or by re-adding the label on GitHub.

### 5. Merge

At the end of each review session the script offers to merge all approved PRs.

## GitHub Labels

| Label | Applies to | Meaning |
|-------|-----------|---------|
| `pending` | Issue | Ready to be implemented, unassigned |
| `claimed` | Issue | Being implemented by the nightly worker |
| `ready-for-review` | PR | Implementation done, awaiting review |
| `fix-requested` | PR | Cloud fix workflow queued/running |
| `approved` | PR | Approved during review, queued for merge |

## PR Body Format

Required for the review script to parse correctly:

```
## Description

<what to test and what correct behavior looks like>

Closes #<issue_number>
```

## Workflows

| File | Trigger | Purpose |
|------|---------|---------|
| `inbox-to-issues.yml` | Push to main (INBOX.md changed) | Convert bullet points to GitHub Issues |
| `nightly-implement.yml` | 2 AM UTC / manual | Implement pending issues, open PRs |
| `fix-pr.yml` | `fix-requested` label added | Apply fix described in PR comment |
| `claude.yml` | `@claude` mention in issue/PR | Ad-hoc Claude invocation |

## Common Pitfalls

- **Cloning elements**: Always use `rehydrateElement(JSON.parse(JSON.stringify(el)))` - never plain JSON clone.
- **PowerShell heredocs**: Use `@'...'@` (single-quoted, `'@` at column 0) for multi-line git messages.
- **Resolving merge conflicts**: Run `git add <file>` before `git commit` after manual resolution.
