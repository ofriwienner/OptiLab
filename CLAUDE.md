# OptiLab - Claude Instructions

## Project Overview

OptiLab is a static HTML/JS optical bench simulator. No build step - open `index.html` directly in a browser. All source is in `js/` and `styles/`.

Key files:
- `js/config.js` - all global state variables and constants
- `js/element.js` - Element class, component types, ray-tracing segments
- `js/input.js` - all mouse/keyboard event handlers
- `js/renderer.js` - all canvas drawing functions
- `js/state.js` - save/load/undo/redo
- `js/ui/controls.js` - dynamic sidebar UI panel
- `js/physics/raytracing.js` - ray casting and beam physics
- `js/physics/optics.js` - Mueller matrix optics

## Bulk Features Workflow

When the user says **"bulk features"**, **"implement these features"**, **"do them in parallel"**, or provides a list of features to implement, follow the procedure in `docs/BULK_FEATURES_PROCEDURE.md`. Summary:

1. **Collect** - read `INBOX.md` for new requests + `gh issue list --label pending --no-assignee` + `gh pr list --label fix-requested`
2. **Create issues** - `gh issue create` for each inbox item, then clear `INBOX.md`
3. **Claim** - `gh issue edit <number> --add-assignee @me` before starting (atomic, prevents double-work)
4. **Read** the relevant source files before writing the plan
5. **Plan** - for each feature: exact files, line numbers, and diff description
6. **Create worktrees** - one branch + worktree per feature under `C:\Users\ofriw\PycharmProjects\OptiLab-worktrees\`
7. **Spawn agents in parallel** - one Agent tool call per feature in the same message
8. **Push + create PRs** - `gh pr create --label ready-for-review` with the required body format (see procedure)
9. **Launch the review script** - tell the user to run `python review_features.py` from a real terminal (not via `!` - it needs interactive stdin)

Do NOT merge any feature without explicit user confirmation via the review script.

### Common Pitfalls

- **PR body format**: Must include `## Description` section and `Closes #<number>` - the review script parses both.
- **Fix agents must push**: Unlike new-feature agents, fix agents must run `git push origin HEAD:<branch>` after committing.
- **PowerShell 5.1 heredocs**: Use `@'...'@` (single-quoted, `'@` at column 0) for multi-line git commit messages. The bash `$(cat <<'EOF'...)` syntax does not work in PowerShell.
- **Resolving merge conflicts**: After editing conflicted files, run `git add <file>` before `git commit`. Git won't auto-stage manually resolved files.
- **Cloning elements**: Always use `rehydrateElement(JSON.parse(JSON.stringify(el)))` to deep-copy an Element - never use a plain JSON clone, which loses prototype methods and breaks the app.
- **Agent prompts for worktree fixes**: Agents spawned to fix bugs in worktrees need the `--dangerously-skip-permissions` flag and the `cwd` set to the worktree path.

## Coding Conventions

- No comments unless the why is non-obvious
- No build tools - plain JS, no imports, everything is global
- Tailwind CSS classes for UI (loaded via CDN)
- All state lives in `config.js` as `let` globals
- Canvas coordinate system: world coords in mm, `worldToScreen`/`screenToWorld` for conversion
- `saveToHistory()` before any mutation that should be undoable
- `draw()` after any state change that affects visuals
- `updateUI()` after selection changes
