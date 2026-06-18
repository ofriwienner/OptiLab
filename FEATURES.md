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

❓ When zooming out the GUI is very laggy  
❓ Measurement doesn't need to be a child of the board (see image)
- be more forgiving in the smart snapping. if the user intentionally rotated a component and it hit the same laser again it probably shouldn't smart snap
- remove the circle inside the twinleaf openings in the edges of the twinleaf. it should represent glare but looks weird.
---

## Active Features

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 7 | Verify physical behavior of all components - write a report | 📋 | Pending review (feat #44) |
| 12 | Give different colors to different lasers (preset list) | 📋 | Pending review (feat #39) |
| 16 | Short click on dial = toggle next value (22.5°). Double click = reset. Hold = drag | 📋 | Pending review (feat #38) |
| 17 | If two beams with different colors on same location - ... | ⏭️ | TBD |
| 18 | Smart move - auto-reposition overlapping labels | ⏭️ | Complex UX - deferred |
| 20 | Add combined λ/2 + λ/4 component | ⏭️ | Needs physics design |
| 21 | Change measurement length by dragging from the end | ⏭️ | Complex interaction, no clear spec |
| 22 | Change the size of the twinleaf | ⏭️ | Rejected |
| 42 | Stay in measurement mode until Esc (re-usable placement) | 📋 | Pending review (feat #37) |
| 43 | Beam renders as uniform width (no thin core / thick glow) | 📋 | Pending review (feat #40) |
| 44 | Bulk set future plan for multiple selected components | 📋 | Pending review (feat #41) |
| 45 | Fiber coupler: only accept beam from arrow direction, block others | 📋 | Pending review (feat #42) |
| 46 | Smart snap filter - change to 90° to beam | 📋 | Pending review (feat #43) |

---

## Clarification Questions

**Q7 - "Bug with filter pass/block" (#27)**
- Filter doesn't block beams when it should; blocking all beams still lets laser pass
- **answer: it is fixed, archived**
