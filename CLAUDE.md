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

## Feature Pipeline

Features flow automatically: `INBOX.md` -> GitHub Issues -> nightly CI implementation -> PRs -> `review_features.py`.
See `docs/BULK_FEATURES_PROCEDURE.md` for the full diagram and manual steps.

To add features: edit `INBOX.md` with bullet points and push. Issues are created automatically.
To review: run `python review_features.py` from a real terminal (needs interactive stdin).
Fixes run on GitHub Actions automatically when you choose **F** in the review script.

### Common Pitfalls

- **PR body format**: Must include `## Description` section and `Closes #<number>` - the review script parses both.
- **PowerShell 5.1 heredocs**: Use `@'...'@` (single-quoted, `'@` at column 0) for multi-line git commit messages. The bash `$(cat <<'EOF'...)` syntax does not work in PowerShell.
- **Resolving merge conflicts**: After editing conflicted files, run `git add <file>` before `git commit`. Git won't auto-stage manually resolved files.
- **Cloning elements**: Always use `rehydrateElement(JSON.parse(JSON.stringify(el)))` to deep-copy an Element - never use a plain JSON clone, which loses prototype methods and breaks the app.

## Coding Conventions

- No comments unless the why is non-obvious
- No build tools - plain JS, no imports, everything is global
- Tailwind CSS classes for UI (loaded via CDN)
- All state lives in `config.js` as `let` globals
- Canvas coordinate system: world coords in mm, `worldToScreen`/`screenToWorld` for conversion
- `saveToHistory()` before any mutation that should be undoable
- `draw()` after any state change that affects visuals
- `updateUI()` after selection changes
