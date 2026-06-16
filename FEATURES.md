# OptiLab Feature Tracker

## Legend
- ✅ Done (merged to main)
- 🔧 Fix in progress (worktree exists, fix being applied)
- 📋 Planned - this batch
- ❓ Needs clarification (questions below)
- ⏭️ Skipped (TBD / out of scope)

---

## Inbox
1. When zooming out the gui is very laggy - ❓ Needs investigation (root cause unclear)
2. in this case, the measurement doesnt need to be a child of the board ![img.png](img.png) - ❓ Needs clarification (image not parseable)
3. ✅ Board drag when selected - Merged (feat #22)
4. When two beams mixed, plot both - ⏭️ TBD/complex
5. ✅ Bug - board resize jump - Merged (feat #28)
6. ✅ Resize from all corners - Merged (feat #28)
7. ✅ Opacity not saved to library - Fix applied, pending review (feat #29)
8. ✅ Preset colors more theme-appropriate - Merged (feat #30)
9. ✅ Custom components - half grid - Merged (feat #31)
10. ✅ No keyboard hint for measurement - Pending review (feat #32)
11. ✅ Angled line for mixed V+H polarization - Merged (feat #33)

---

## Feature List

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | Don't move boards by dragging - only drag symbol | ✅ | Merged (feat #1) |
| 2 | Cell will rotate beams from all directions | ✅ | Merged (feat #3) |
| 3 | Allow transparent in custom component | ✅ | Merged (feat #4) |
| 4 | Set text size in custom component | ✅ | Was already implemented |
| 5 | ctrl+s to save | ✅ | Merged - ctrl+s = localStorage, ctrl+shift+s = export JSON (feat #19) |
| 6 | Rotate group when dragging multiple items | ✅ | Merged (feat #5) |
| 7 | Verify physical behavior of all components - write a report | ❓ | See question #1 |
| 8 | Color picker with preexisting colors | ✅ | Merged (feat #6) |
| 9 | x / y to flip | ✅ | Merged (feat #7) |
| 10 | Input fiber automatically snaps to laser direction | 📋 | Pending review (feat #34) |
| 11 | Smart snap mirror - only reflect direction | 📋 | Pending review (feat #34) |
| 12 | Give different colors to different lasers (preset list) | 📋 | Fix applied, pending review (feat #8) |
| 13 | Bug - colored laser beam is mix of color and red | ✅ | Merged (feat #9) |
| 14 | Bug - beam thickness doesn't work | 📋 | Pending review (feat #35) |
| 15 | Show vertical polarization as dots (horizontal stays as lines) | ✅ | Merged (feat #10) |
| 16 | Short click on dial = toggle next value (22.5°). Double click = reset. Hold = drag | 📋 | Not yet started |
| 17 | If two beams with different colors on same location - ... | ⏭️ | TBD |
| 18 | Smart move (overlap text) | ⏭️ | Complex UX - deferred |
| 19 | Keyboard shortcuts work in Hebrew keyboard mode | ✅ | Merged (feat #11) |
| 20 | Add combined λ/2 + λ/4 component | ⏭️ | Deferred - needs physics design |
| 21 | Change measurement length by dragging from the end | ⏭️ | Deferred - complex interaction, no clear spec |
| 22 | Change the size of the twinleaf | ⏭️ | Rejected - unwanted feature |
| 23 | Move to back (always in front of board) | ✅ | Merged (feat #13) |
| 24 | Copy/paste custom component keeps original size | ✅ | Merged (feat #14) |
| 25 | Middle click to pan while dragging a component | ✅ | Merged (feat #15) |
| 26 | How to set laser name? | ✅ | Merged (feat #36) |
| 27 | Bug with filter pass/block | 📋 | Pending review (feat #35) |
| 28 | Measurement tool - half grid resolution when moving | ✅ | Merged (feat #16) |
| 29 | Copy a board copies all components on it | ✅ | Merged (feat #17) |
| 30 | Flag component as future plan (faded / hidden / per-component toggle) | ✅ | Merged (feat #18) |
| 31 | ctrl+drag to duplicate and move | 📋 | Fix applied, pending review (feat #20) |
| 32 | Measurement text always faces up or left | ✅ | Merged (feat #21) |
| 33 | Drag board from body when already selected | ✅ | Merged (feat #22) |
| 34 | Twinleaf edge dots (optical openings) | ✅ | Merged (feat #23) |
| 35 | Move board with group drag | ✅ | Merged (feat #22) |
| 36 | Custom component border auto-darken | 📋 | Pending review (feat #24) |
| 37 | Bug - shift/ctrl stuck in multi-select mode | 📋 | Pending review (feat #25) |
| 38 | Double click board body to rename | ✅ | Merged (feat #26) |
| 39 | Bug - bounding box too large for big elements | ✅ | Merged (feat #27) |

---

## Clarification Questions

**Q1 - "Verify physical behavior and write a report" (#7)**
- What format should the report be? A Markdown file in the repo? Inline comments? **md**
- What does "verify" mean - trace through the Mueller matrix math and document expected vs actual output? Or just describe each component's behavior? **expected vs actual**
- Which components need verification? All of them? **yes**

**Q2 - "Input fiber automatically snaps to direction of laser" (#10)**
- Does this mean: when you place a fiber coupler near a beam, it auto-rotates to align with the beam? **yes. rotate the arrow in the direction of the beam**
- Or: when dragging, it snaps its orientation to the nearest beam it's close to? **no**
- Does it also auto-move to the beam, or just rotate? **just rotate**

**Q3 - "Smart snap mirror always snaps to reflect direction" (#11)**
- The current S-key snap cycles through all rotation options. The issue is one of those options points the reflective back face toward the beam. **yes**
- Should the fix: (a) remove the back-facing option from the cycle, or (b) always auto-pick the best option without cycling? **a**

**Q4 - "Bug - beam thickness doesn't work" (#14)**
- The slider exists in the laser properties panel and writes to `beamThickness`. The rendering multiplies `lineWidth` by this value.
- At what zoom level or scenario is the thickness not visible? Is the slider having no effect at all, or is the visual difference just hard to see? **i think there wasnt any change, it was in appropriate zoom level**

**Q5 - "Smart move" (#18)**
- The Hebrew text and attached image couldn't be parsed. Can you rephrase this in English? **text of multiple and close components get overlap and it makes it impossible to read** 
- The image looks like a zoomed-in view of a component with overlapping labels - is the feature about auto-repositioning labels so they don't overlap? **yes**

**Q6 - "How to set laser name?" (#26)**
- Double-clicking any element (including lasers) already opens a rename prompt.
- Is the request to: (a) add a dedicated name/title input in the laser properties sidebar panel, or (b) something else? **I want this prompt to rename the laser beam, so when im inside a filter ill see those names instead of laser 1 etc**

**Q7 - "Bug with filter pass/block" (#27)**
- What specific behavior is wrong? The filter blocks/passes based on `blockedLasers` (array of laser IDs).
- Does the filter not block when it should, not pass when it should, or does the UI not reflect the current state? **it doesnt block when it should. i tried blocking all beams and still the laser passed**

---

## Implementation Plan - This Batch

### 1. Laser auto-color + preset palette (`feat/laser-auto-color`)
- `js/config.js`: Add `LASER_COLOR_PRESETS` array and `getNextLaserColor()` function
- `js/element.js`: In `setupType()` for `'laser'`, set `this.beamColor = getNextLaserColor()`

### 2. Beam glow rendering fix (`feat/beam-glow-fix`)
- `js/renderer.js`, `drawRays()`: The glow line `beamColor.replace(')', ', 0.3)').replace('rgb', 'rgba')` is broken for rgba strings. Replace with regex: `beamColor.replace(/,\s*[\d.]+\s*\)$/, ', 0.3)')`

### 3. Vertical polarization as dots (`feat/polarization-dots`)
- `js/renderer.js`, `drawRays()`: Add `isVertical = seg.stokes[1] < -0.1 * seg.stokes[0]` check. In the linear-pol else branch, draw `ctx.arc(dot)` instead of the line when vertical.

### 4. Hebrew keyboard mode (`feat/hebrew-shortcuts`)
- `js/input.js`, `handleKeyDown()`: Derive `const codeKey = e.code?.startsWith('Key') ? e.code.slice(3).toLowerCase() : null` at the top, then add `|| codeKey === 'x'` etc. to every single-letter shortcut check.

### 5. Twinleaf size controls (`feat/twinleaf-size`)
- `js/ui/controls.js`, `updateUI()`: Add a twinleaf block (after checking `p.type === 'twinleaf'`) with W/H number inputs, same style as the custom component size row.

### 6. Move to back (`feat/move-to-back`)
- `js/ui/sidebar.js`: Add `function moveToBack(el)` - removes element from array, re-inserts just after the last board element.
- `js/ui/controls.js`: Add "Move to Back" button for non-board selected elements.
- `js/app.js`: Expose `moveToBack` on `window`.

### 7. Paste custom component preserves size (`feat/paste-custom-size`)
- `js/ui/sidebar.js`, `pasteElements()`: In the `custom` type block, add `el.width = data.width; el.height = data.height;` (currently `setupType()` overrides these with defaults).

### 8. Middle click pan while dragging (`feat/middle-click-drag`)
- `js/input.js`, `handleMouseUp(e)`: Check `if (e?.button === 1) { view.isPanning = false; return; }` at the top so middle-button release only clears panning, not the drag.
- `js/input.js`, `handleMouseDown`: When middle click and `isDragging`, skip the cursor change.

### 9. Measurement - half grid when moving (`feat/measure-half-grid`)
- `js/input.js`, `handleMouseMove()` drag section: Before the `if (shiftPressed)` chain, add a check for `el.type === 'measure'` and snap to `HALF_GRID_MM` unconditionally.

### 10. Copy board includes components (`feat/copy-board-components`)
- `js/ui/sidebar.js`, `copySelected()`: After building the base selection set, expand it: for any board in selection, find all children via `getParentBoard()` and include them.

### 11. Future plan flag (`feat/future-plan-flag`)
- `js/element.js`: Add `this.isFuturePlan = false` in constructor (before `setupType`).
- `js/config.js`: Add `let showFuturePlans = true`.
- `js/renderer.js`, `drawElement()`: If `el.isFuturePlan && !showFuturePlans` → return early. If `el.isFuturePlan && showFuturePlans` → set `ctx.globalAlpha = 0.3` before drawing.
- `js/ui/controls.js`: Add "Future Plan" toggle button per element.
- `index.html`: Add global "Show Future Plans" toggle button near the polarization/intensity toggles.
- `js/state.js`, `rehydrateElement()`: Restore `isFuturePlan` from saved data.

### 12. ctrl+s behavior change (`feat/ctrl-s-behavior`)
- `js/input.js`, `handleKeyDown()`: Change `isSave` handler to call `saveState()` (localStorage, silent). Add `isExport = ctrl+shift+s` handler calling `exportState()`.
- `js/state.js`: Ensure `saveState()` has no alert (already done in prev branch).

### 13. Fix: custom transparency - fill only (`feat/custom-transparency` worktree)
- `js/renderer.js`, `drawCustom()`: Remove `ctx.globalAlpha` from top. Instead wrap only `ctx.fill()` with `ctx.globalAlpha = opacity` / `ctx.globalAlpha = 1`.

### 13b. ctrl+drag to duplicate (`feat/ctrl-drag-duplicate`)
- `js/input.js`, `handleMouseDown()`: In the non-board drag-start section, if `ctrlPressed` and `selection.size === 1` and element is not a board: deep-clone the element (`JSON.parse(JSON.stringify(el))`), give it a new `id`, push to `elements`, set `selection` to the clone, and proceed with dragging the clone. The original stays in place.

### 14. Fix: group rotation - border + handle on border + 45° (`feat/group-rotation` worktree)
- `js/renderer.js`: Add `drawGroupSelectionBox()` - computes screen AABB of all selected non-board elements, draws dashed rect + rotation handle circle at top-right corner. Called from `draw()`.
- `js/input.js`, `handleMouseDown()`: Check group handle hit BEFORE per-element handle checks. Start `isRotating` + `groupRotateState` on hit.
- `js/input.js`, `handleMouseMove()`: Group rotation snaps to 45° (`toRad(45)`) instead of `SNAP_ROTATION`.
