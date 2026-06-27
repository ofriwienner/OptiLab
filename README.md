# OptiLab

A browser-based optical bench simulator for designing and visualizing laser setups. Place optical components on a virtual table, trace beams through the system, and track polarization states using Mueller matrix formalism.

![OptiLab screenshot](https://github.com/user-attachments/assets/optilab-screenshot)

## Getting Started

No build step required. Open `index.html` directly in a browser.

```bash
git clone https://github.com/ofriwienner/OptiLab.git
cd OptiLab
open index.html  # or double-click the file
```

## Features

### Optical Components

| Component | Description |
|-----------|-------------|
| **Laser** | Emits a collimated beam; configurable color and polarization |
| **Mirror** | Flat mirror (45° default); reflects beam at angle |
| **Dichroic Mirror** | Wavelength-selective mirror |
| **Beam Splitter** | 50/50 non-polarizing splitter |
| **PBS** | Polarizing beam splitter; separates S and P polarizations |
| **HWP** | Half-wave plate; rotates polarization axis |
| **QWP** | Quarter-wave plate; converts between linear and circular polarization |
| **AOM** | Acousto-optic modulator; togglable on/off |
| **Lens** | Thin lens with configurable focal length |
| **Iris** | Aperture stop |
| **Filter** | Wavelength/laser filter; selectively blocks beams |
| **Fiber Coupler** | Pair of couplers connected by a virtual fiber |
| **Amplifier** | Gain element connectable to fiber couplers |
| **Detector** | Beam terminator / power meter |
| **Blocker** | Beam dump |
| **Cell** | Generic two-port element; rotates beam from all directions |
| **Twinleaf** | MOT coil representation |
| **Measurement** | Ruler tool for measuring distances |
| **Custom** | Freeform labeled shape with configurable color and text |
| **Board** | Organizational container; groups components visually |

### Physics Engine

- **Ray tracing** with up to 100 bounces per ray
- **Mueller matrix** formalism for tracking full polarization state (Stokes vectors)
- Polarization visualization: horizontal lines for linear-H, dots for linear-V, angled lines for mixed/diagonal
- Beam intensity propagation through the optical path

### Canvas & Navigation

- **Pan**: middle-click drag, or hold Space + drag
- **Zoom**: mouse wheel
- Grid pitch: 25 mm (half-grid snap at 12.5 mm for fine placement)
- World coordinates in millimeters; default table size 2400 × 1800 mm

### File Operations

| Action | How |
|--------|-----|
| Save to browser | `Ctrl+S` |
| Export JSON | `Ctrl+Shift+S` |
| Import JSON | Sidebar → Import button |
| Load from browser | Sidebar → Load button |

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+A` | Select all |
| `Ctrl+C` / `Ctrl+V` | Copy / Paste |
| `Ctrl+Drag` | Duplicate and move |
| `Delete` / `Backspace` | Delete selected |
| `↑` `↓` `←` `→` | Nudge selection by half-grid (12.5 mm) |
| `Shift+↑↓←→` | Nudge selection by full grid (25 mm) |
| `Ctrl+↑↓←→` | Nudge selection by 1 mm |
| `R` | Rotate clockwise (90°) |
| `Shift+R` | Rotate counter-clockwise (90°) |
| `T` | Rotate clockwise (45°) |
| `X` | Flip horizontal |
| `Y` | Flip vertical |
| `M` | Enter movement mode |
| `Esc` | Deselect / cancel current mode |
| `H` | Set selected laser to horizontal polarization |
| `V` | Set selected laser to vertical polarization |
| `O` | Toggle selected AOM on/off |
| Right-click | Context menu (Duplicate, Copy, Paste, Rotate, Delete) |

## Project Structure

```
OptiLab/
├── index.html                  # Entry point (no build step)
├── styles/
│   └── main.css
└── js/
    ├── app.js                  # Initialization and main loop
    ├── config.js               # Global state and constants
    ├── element.js              # Element class and component definitions
    ├── input.js                # Mouse and keyboard event handlers
    ├── math.js                 # Geometry utilities
    ├── renderer.js             # Canvas drawing
    ├── state.js                # Save / load / undo / redo
    ├── ui/
    │   ├── controls.js         # Dynamic sidebar property panel
    │   ├── sidebar.js          # Sidebar shell
    │   └── calibration.js      # Image overlay calibration tool
    └── physics/
        ├── raytracing.js       # Ray casting and intersection
        ├── optics.js           # Optical element interactions
        └── mueller.js          # Mueller matrices and Stokes vectors
```

## Contributing

### Coding Conventions

- Plain JavaScript — no build tools, no imports, everything is global
- All state lives in `config.js` as `let` globals
- Call `saveToHistory()` before any mutation that should be undoable
- Call `draw()` after any state change that affects visuals
- Call `updateUI()` after selection changes
- Tailwind CSS classes for UI (loaded via CDN)
- Canvas uses world coordinates in mm; use `worldToScreen` / `screenToWorld` for conversion
- Deep-copy elements with `rehydrateElement(JSON.parse(JSON.stringify(el)))` — never plain JSON clone

## License

MIT
