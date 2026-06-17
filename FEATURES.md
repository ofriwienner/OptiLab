# OptiLab Feature Tracker

## Legend
- 📋 Pending review (worktree exists)
- 🔧 Fix applied, pending re-review
- 🚫 Fix requested (worktree needs fix)
- ❓ Needs clarification / investigation
- ⏭️ Deferred / out of scope

Merged features are in [FEATURES_ARCHIVE.md](FEATURES_ARCHIVE.md).

---

## Inbox

| # | Description | Status |
|---|-------------|--------|
| 1 | When zooming out the GUI is very laggy | ❓ Needs investigation |
| 2 | Measurement doesn't need to be a child of the board (see image) | ❓ Needs clarification |
| 3 | When two beams mixed, plot both | ⏭️ TBD/complex |
| 4 | Opacity not saved to library | 📋 Pending review (feat #29) |
| 5 | No keyboard hint for measurement tool | 🔧 Fix applied, pending re-review (feat #32) |

---

## Active Features

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 7 | Verify physical behavior of all components - write a report | ❓ | See Q1 |
| 10 | Input fiber automatically snaps to laser direction | 📋 | Pending review (feat #34) |
| 11 | Smart snap mirror - only reflect direction | 📋 | Pending review (feat #34) |
| 12 | Give different colors to different lasers (preset list) | 🚫 | Fix requested (feat #8) |
| 14 | Bug - beam thickness doesn't work | 📋 | Pending review (feat #35) |
| 16 | Short click on dial = toggle next value (22.5°). Double click = reset. Hold = drag | ❓ | Not yet started |
| 17 | If two beams with different colors on same location - ... | ⏭️ | TBD |
| 18 | Smart move (overlap text) | ⏭️ | Complex UX - deferred |
| 20 | Add combined λ/2 + λ/4 component | ⏭️ | Needs physics design |
| 21 | Change measurement length by dragging from the end | ⏭️ | Complex interaction, no clear spec |
| 22 | Change the size of the twinleaf | ⏭️ | Rejected |
| 27 | Bug with filter pass/block | 📋 | Pending review (feat #35) |
| 31 | ctrl+drag to duplicate and move | 🔧 | Fix applied, pending re-review (feat #20) |
| 36 | Custom component border auto-darken | 📋 | Pending review (feat #24) |
| 37 | Bug - shift/ctrl stuck in multi-select mode | 📋 | Pending review (feat #25) |

---

## Clarification Questions

**Q1 - "Verify physical behavior and write a report" (#7)**
- Format: Markdown file in repo
- Verify: trace Mueller matrix math, compare expected vs actual output
- Scope: all components

**Q2 - "Input fiber automatically snaps to direction of laser" (#10)**
- When you place a fiber coupler near a beam, it auto-rotates to align with the beam arrow
- Just rotate - no auto-move to beam

**Q3 - "Smart snap mirror always snaps to reflect direction" (#11)**
- Fix: remove back-facing option from the S-key cycle (don't cycle through it)

**Q4 - "Bug - beam thickness doesn't work" (#14)**
- Slider writes to `beamThickness` but the visual difference is not visible at normal zoom

**Q5 - "Smart move" (#18)**
- Labels of multiple close components overlap and are impossible to read
- Feature: auto-reposition labels so they don't overlap

**Q6 - "How to set laser name?" (#26 - merged)**
- Laser name prompt also names the beam; filter UI shows those names instead of "Laser 1" etc.

**Q7 - "Bug with filter pass/block" (#27)**
- Filter doesn't block beams when it should; blocking all beams still lets laser pass
