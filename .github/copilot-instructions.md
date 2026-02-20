# Project Guidelines

## Overview
Browser-based raycasting FPS inspired by Halo: CE ("HALO: Switch 2 Edition"). No build step, no frameworks — runs by opening `index.html` directly. Entirely client-side vanilla JS with HTML5 Canvas 2D software rendering, procedural textures/audio via Web Audio API, and optional MediaPipe hand-gesture controls.

## Architecture

| File | Role |
|------|------|
| `index.html` | Entire game: raycaster, player, weapons, enemies, HUD, menus, audio, hand-tracking (~1200 lines inline JS/CSS) |
| `doors.js` | Standalone improved door system (not yet wired in — monkey-patches `getMap`/`playSound`) |
| `renderEnemy.js` | High-fidelity enemy sprite renderer with lighting model (not yet wired in via `<script>`) |

**Duplicate code warning:** Door logic and enemy rendering each exist in two versions — inline in `index.html` (active) and as standalone files (improved but not integrated). Edits to one do NOT affect the other.

## Code Style

- **Globals everywhere** — no modules, no `import`/`export`, no classes. All functions and state are global.
- **camelCase** for functions/variables, **UPPER_SNAKE** for constants, **underscore-prefix** for internal helpers (`_eH`, `_gruntShape`).
- Prefer `const`/`let` over `var` (match `index.html` style).
- Manual vector math — no external math library. Use `Math.sqrt`, `Math.sin`, etc. directly.
- Pixel buffer writes use `buf[(y * RENDER_W + x) << 2]` pattern for RGBA `Uint8ClampedArray`.

## Key Domain Concepts

- **Map**: 32×32 flat array `mapData[y * MAP_W + x]`. Tile types: 0=empty, 1=metal wall, 2=covenant wall, 3=door, 6=exit.
- **Door state machine**: closed → opening → open → closing (with block-close safety).
- **Raycaster**: DDA grid traversal with perpendicular distance for fisheye correction, per-column z-buffer.
- **Sprite rendering**: Normalized coordinates (-1 to 1), body-part ID hit testing, direct `buf[]` pixel writes respecting `zBuffer`.
- **Procedural textures**: 128×128 via `fbm()` fractal Brownian motion over `smoothNoise()`.
- **Procedural audio**: Web Audio oscillators with frequency ramps + noise buffers via `playSound()`.
- **Enemy AI**: State-based (idle/chase), line-of-sight checks, alert propagation to nearby enemies.
- **Shield system**: Halo-style regenerating shield absorbs damage first, delays regen on hit.

## Conventions

- When adding a new external `.js` file, it must load **after** globals are defined in `index.html` (`mapData`, `MAP_W`, `player`, `getMap`, `playSound`, `buf`, `zBuffer`, `RENDER_W`, `RENDER_H`, `gameTime`).
- Avoid variable names that shadow common loop variables: `dist`, `dx`, `dy`, `r`, `g`, `b`, `i`, `j`, `x`, `y` are used heavily in rendering hot paths.
- **Performance is critical** in per-pixel rendering loops (~500k iterations/frame). Avoid allocations, closures, or complex operations inside `renderEnemy`'s inner loop.
- Map coordinates are integer grid cells; entity positions are floating-point world coords; sprite rendering uses normalized -1 to 1 coords. Don't mix them.
- Sound effects are synthesized — add new sounds by creating oscillator/noise configs in `playSound()`, not by loading audio files.

## Build and Test

No build system, no package manager, no tests. Open `index.html` in a browser to run.
