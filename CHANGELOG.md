# Changelog

## v1.1.0 (unreleased)

### Custom component optical behaviors
Custom components are no longer purely visual — each can now act as a
Beam Blocker, two-sided Mirror, 50/50 Splitter, Polarizer (with an
on-canvas axis knob), or Attenuator, all persisted through save/load,
undo/redo, and the component library.

### Interaction & UX
- Selection mini-toolbar (duplicate / rotate / delete) and Ctrl/Cmd+D duplicate
- Context-aware cursors, hover highlighting, and a right-click context menu
- Keyboard shortcut cheatsheet (`?`)
- Arrow-key nudging now snaps to the same grid used by drag/placement, and moves board children with the board
- Cancelable image calibration (Escape) and window-resize handling
- Touch support and a tool filter for boards

### Measurement & inspection
- Detector readout: live per-laser incident power and polarization state
- Component List modal with laser-hit tracking, plus a minimal "Export Text" component list
- Measurement tool stays active until Escape, with half-grid snapping
- Smart snap now filters to perpendicular of the beam direction

### Physics & rendering fixes
- Fixed stale beam cache (waveplate axis, focal length, beam color/thickness, gain, and filter list changes now correctly re-trace)
- Iris aperture is now functional and adjustable, and persists correctly
- Fixed fiber coupler directional blocking, board-image distortion on rotate, and group/board drag as rigid bodies
- Rendering performance improved for large, zoomed-out scenes

### Other
- In-app feedback button that files GitHub issues directly
- Nightly automated feature pipeline (`INBOX.md` -> issues -> PRs -> review)

## v1.0.0

- Initial public release: full optical bench simulator with ray tracing,
  Mueller matrix polarization, measurement tools, custom components,
  and an alignment tool.
