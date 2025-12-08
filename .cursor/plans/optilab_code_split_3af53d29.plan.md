---
name: OptiLab Code Split
overview: Split the monolithic 3,022-line OptiLab.html into a modular file structure with separate CSS, JavaScript modules, and a clean HTML file for better maintainability and collaboration.
todos:
  - id: create-structure
    content: Create folder structure (js/, js/physics/, js/ui/, styles/)
    status: completed
  - id: extract-css
    content: Extract CSS to styles/main.css
    status: completed
  - id: extract-config
    content: Extract constants and globals to js/config.js
    status: completed
  - id: extract-math
    content: Extract math helpers to js/math.js
    status: in_progress
  - id: extract-element
    content: Extract Element class to js/element.js
    status: pending
  - id: extract-mueller
    content: Extract MuellerMath to js/physics/mueller.js
    status: pending
  - id: extract-raytracing
    content: Extract ray tracing to js/physics/raytracing.js
    status: pending
  - id: extract-optics
    content: Extract optics helpers to js/physics/optics.js
    status: pending
  - id: extract-renderer
    content: Extract drawing functions to js/renderer.js
    status: pending
  - id: extract-controls
    content: Extract UI controls to js/ui/controls.js
    status: pending
  - id: extract-calibration
    content: Extract calibration to js/ui/calibration.js
    status: pending
  - id: extract-state
    content: Extract state management to js/state.js
    status: pending
  - id: extract-input
    content: Extract event listeners to js/input.js
    status: pending
  - id: create-app
    content: Create js/app.js as main entry point
    status: pending
  - id: create-html
    content: Create clean index.html with script imports
    status: pending
  - id: create-summary
    content: Create CODE_STRUCTURE.md summary file
    status: pending
---

# OptiLab Code Split Plan

## Current State

- Single `OptiLab.html` file with 3,022 lines
- Mixed HTML, CSS, and JavaScript
- Difficult to maintain, test, and extend

## Proposed File Structure

```
OptiLab/
├── index.html                    # Clean HTML structure (~150 lines)
├── styles/
│   └── main.css                  # All CSS styles (~50 lines)
└── js/
    ├── config.js                 # Constants, globals (~80 lines)
    ├── math.js                   # Math helpers, geometry (~160 lines)
    ├── element.js                # Element class definition (~130 lines)
    ├── physics/
    │   ├── mueller.js            # Polarization physics (~150 lines)
    │   ├── raytracing.js         # Ray tracing core (~200 lines)
    │   └── optics.js             # Lens/waveplate/AOM helpers (~100 lines)
    ├── renderer.js               # All drawing functions (~660 lines)
    ├── ui/
    │   ├── controls.js           # UI panel, buttons, sliders (~300 lines)
    │   ├── calibration.js        # Image calibration logic (~100 lines)
    │   └── sidebar.js            # Sidebar component interactions (~70 lines)
    ├── state.js                  # Save/load/export/import (~100 lines)
    ├── input.js                  # Mouse, keyboard, wheel handlers (~530 lines)
    └── app.js                    # Main app initialization (~50 lines)
```

## Key Files to Create

1. **[index.html](index.html)** - HTML structure only with script tags
2. **[styles/main.css](styles/main.css)** - Extracted CSS
3. **[js/config.js](js/config.js)** - Global constants and state
4. **[js/math.js](js/math.js)** - Coordinate transforms, geometry helpers
5. **[js/element.js](js/element.js)** - Element class with setupType and getSegments
6. **[js/physics/mueller.js](js/physics/mueller.js)** - MuellerMath object
7. **[js/physics/raytracing.js](js/physics/raytracing.js)** - traceRay, castRays
8. **[js/physics/optics.js](js/physics/optics.js)** - Lens, waveplate, AOM physics
9. **[js/renderer.js](js/renderer.js)** - All draw* functions
10. **[js/ui/controls.js](js/ui/controls.js)** - updateUI, dynamic buttons
11. **[js/ui/calibration.js](js/ui/calibration.js)** - Calibration state machine
12. **[js/state.js](js/state.js)** - Save/load/export/import functions
13. **[js/input.js](js/input.js)** - Event listeners
14. **[js/app.js](js/app.js)** - Canvas init, main draw loop

## Benefits

| Aspect | Before | After |

|--------|--------|-------|

| File Size | 3,022 lines | 50-660 lines per file |

| Maintainability | Difficult | Easy (focused modules) |

| Collaboration | Merge conflicts | Independent work areas |

| Testing | Hard to isolate | Unit testable modules |

| Code Navigation | Scroll-heavy | IDE-friendly |

| Loading | One large parse | Async module loading |

## Module Dependencies

```
app.js
  ├── config.js (globals)
  ├── math.js
  ├── element.js
  ├── physics/ (mueller, raytracing, optics)
  ├── renderer.js
  ├── ui/ (controls, calibration, sidebar)
  ├── state.js
  └── input.js
```

## Implementation Notes

- Use ES6 modules (`export`/`import`) or global namespace pattern
- Maintain backward compatibility with existing save files
- Keep all visual and functional behavior identical
- Create summary MD file documenting the new structure