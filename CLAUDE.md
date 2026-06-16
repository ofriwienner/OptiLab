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

When the user says **"bulk features"**, **"implement these features"**, **"do them in parallel"**, or provides a list of features to implement, follow the procedure in `BULK_FEATURES_PROCEDURE.md`. Summary:

1. **Filter** the list - skip unclear/TBD items, note already-implemented ones
2. **Read** the relevant source files before writing the plan
3. **Plan** - for each feature: exact files, line numbers, and diff description
4. **Create worktrees** - one branch + worktree per feature under `C:\Users\ofriw\PycharmProjects\OptiLab-worktrees\`
5. **Spawn agents in parallel** - one Agent tool call per feature in the same message
6. **Update `features_manifest.json`** with all features, worktree paths, and test descriptions
7. **Launch the review script** - tell the user to run `python review_features.py` from a real terminal (not via `!` - it needs interactive stdin)

Do NOT merge any feature without explicit user confirmation via the review script.

After every bulk feature batch, fix round, or merge operation: update both `FEATURES.md` and `features_manifest.json` to reflect the current status of all affected features. Keep them in sync - statuses, fix_notes, and merged/pending designations should match between the two files.

## Coding Conventions

- No comments unless the why is non-obvious
- No build tools - plain JS, no imports, everything is global
- Tailwind CSS classes for UI (loaded via CDN)
- All state lives in `config.js` as `let` globals
- Canvas coordinate system: world coords in mm, `worldToScreen`/`screenToWorld` for conversion
- `saveToHistory()` before any mutation that should be undoable
- `draw()` after any state change that affects visuals
- `updateUI()` after selection changes
