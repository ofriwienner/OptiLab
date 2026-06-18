# OptiLab Physics Verification Report

**Scope:** All optical components  
**Files reviewed:** `js/physics/mueller.js`, `js/physics/raytracing.js`, `js/physics/optics.js`  
**Date:** 2026-06-17

---

## 1. Overview

OptiLab tracks polarization using the Mueller calculus: each optical element is represented by a 4x4 real Mueller matrix $M$, and the beam state is a 4-element Stokes vector $\mathbf{S} = [I, Q, U, V]^T$. After interacting with a component, the new state is $\mathbf{S}' = M \mathbf{S}$.

The workflow is:

1. **Source initialization** (`castRays` in `raytracing.js`): a Stokes vector is computed from the laser's polarization angle by applying a rotated horizontal polarizer to an unpolarized seed vector $[1,0,0,0]^T$.
2. **Propagation** (`traceRay`): a recursive ray tracer finds the nearest surface intersection, selects the appropriate Mueller matrix (from `mueller.js`) or physics function (from `optics.js`), applies it to the current Stokes vector, and spawns one or more child rays.
3. **Intensity flooring**: after every interaction, a guard clamps the intensity $I = S_0$ to zero if floating-point error drives it below zero.

The rotation sandwich $M(\theta) = R(-\theta)\, M_0\, R(\theta)$ is used throughout to apply the fast-axis or polarizer-axis offset from its base orientation, where $R(\theta)$ is the standard Stokes-frame rotation matrix.

---

## 2. Component-by-Component Analysis

### 2.1 Laser (source)

**Expected physics:** A linearly polarized laser at angle $\theta$ from horizontal should produce $\mathbf{S} = [1, \cos 2\theta, \sin 2\theta, 0]^T$.

**Implementation:** `castRays` applies a rotated horizontal polarizer to the unpolarized vector $[1,0,0,0]^T$:

```js
const sourceStokes = MuellerMath.interact(
    [1, 0, 0, 0],
    MuellerMath.rotateComponent(MuellerMath.MATRICES.POLARIZER_H, theta)
);
```

Starting from $[1,0,0,0]^T$ and applying the ideal linear polarizer rotated to angle $\theta$ gives $\mathbf{S} = \frac{1}{2}[1, \cos 2\theta, \sin 2\theta, 0]^T$. The factor of $\frac{1}{2}$ comes from the polarizer matrix itself (a 50% transmission device). The default `polAngle` is 90° (vertical), yielding $\mathbf{S} = \frac{1}{2}[1,-1,0,0]^T$ - vertically polarized at half intensity.

**Assessment:** The polarization state (degree and orientation) is correct. The factor-of-two intensity reduction is an approximation - a real laser emits already-polarized light and should give $I=1$, not $I=0.5$. For a simulator focused on polarization rather than absolute power, this is a minor but real discrepancy. A cleaner approach would be to construct the Stokes vector analytically: `[1, cos(2θ), sin(2θ), 0]`.

**Status: Approximation** - polarization orientation correct; initial intensity is half the declared value.

---

### 2.2 Mirror

**Expected physics:** At normal incidence, a mirror reflects intensity unchanged and flips the handedness of circular polarization (because the coordinate system inverts on reflection). In Stokes notation: $I, Q$ unchanged; $U \to -U$; $V \to -V$. The standard Mueller matrix is the identity with $(M_{33}, M_{44}) = -1$.

**Implementation (`mueller.js`, `MATRICES.MIRROR`):**

```
[[1, 0,  0,  0],
 [0, 1,  0,  0],
 [0, 0, -1,  0],
 [0, 0,  0, -1]]
```

This matches the expected matrix exactly. Applied in `raytracing.js` whenever `hitSegment.type === 'mirror-front'`.

**Assessment:** Correct for normal incidence. The matrix does not model angle-dependent reflectance or phase shifts (which matter at non-normal incidence for dielectric mirrors), but for a planar-optics simulator assuming near-normal incidence this is a standard and physically reasonable simplification.

**Status: Correct** (normal-incidence approximation, physically reasonable).

---

### 2.3 D-Mirror (non-reflective region)

**Expected physics:** The non-reflective portion of a D-mirror transmits the beam, ideally without perturbation. A small insertion loss is reasonable.

**Implementation:** The `mirror-d` / `blocker` segment passes the beam through with a 5% intensity loss applied uniformly to all Stokes components:

```js
const modStokes = ray.stokes.map(v => v * 0.95);
```

**Assessment:** The 5% uniform scaling preserves the polarization state (the ratio $Q/I$, $U/I$, $V/I$ is unchanged), which is physically correct - a neutral-density transmission does not alter polarization. The 5% loss value is hardcoded with no physical justification given; it is a reasonable placeholder for glass substrate losses.

**Status: Approximation** - polarization behavior correct; loss value is an undocumented constant.

---

### 2.4 Beam Splitter (non-polarizing)

**Expected physics:** A 50:50 non-polarizing beam splitter divides intensity equally between the transmitted and reflected paths while preserving the polarization state of both beams (modulo a possible phase flip on the reflected beam, which affects $V$ for circularly polarized light).

**Implementation:**

```js
const splitStokes = ray.stokes.map(val => val * 0.5);
// Both transmitted and reflected get splitStokes
```

**Assessment:** Scaling all four Stokes components by 0.5 correctly preserves the polarization state while halving the intensity. The reflection arm does not apply the handedness flip that a real beam splitter introduces on the reflected path (analogous to the mirror's $U \to -U$, $V \to -V$). For typical unpolarized or linearly polarized beams, the $U$ and $V$ flip is invisible in intensity-only displays. However, for circularly polarized inputs the reflected beam handedness would be wrong. The transmitted beam receives no phase perturbation, which is correct.

**Status: Approximation** - intensity splitting correct; reflected-beam polarization handedness not modeled.

---

### 2.5 Polarizing Beam Splitter (PBS)

**Expected physics:** A PBS transmits the horizontal ($H$) polarization component and reflects the vertical ($V$) component. Ideally, the transmitted beam is a pure $H$ polarizer output and the reflected beam is a pure $V$ polarizer output.

**Implementation:**

```js
const matTrans = MuellerMath.rotateComponent(
    MuellerMath.MATRICES.POLARIZER_H, hitObject.rotation
);
const stokesTrans = MuellerMath.interact(ray.stokes, matTrans);

const matRefl = MuellerMath.rotateComponent(
    MuellerMath.MATRICES.POLARIZER_H,
    hitObject.rotation + Math.PI / 2
);
const stokesRefl = MuellerMath.interact(ray.stokes, matRefl);
```

The transmitted arm uses a horizontal polarizer rotated to the PBS's own orientation angle; the reflected arm uses the same polarizer rotated an additional 90°. This correctly models a PBS whose transmitted axis aligns with the PBS body angle.

The `POLARIZER_H` matrix is:

```
[[0.5, 0.5, 0, 0],
 [0.5, 0.5, 0, 0],
 [  0,   0, 0, 0],
 [  0,   0, 0, 0]]
```

This is the standard Mueller matrix for a linear horizontal polarizer (a factor of ½ times the outer product of $[1,1,0,0]$), which is correct.

One concern: a perfect PBS transmits the full intensity of the $H$ component, not half of it. For a purely $H$ polarized input ($\mathbf{S} = [1,1,0,0]$), the ideal transmitted output is $[1,1,0,0]$ (no loss). Applying `POLARIZER_H` gives $[1,1,0,0]^T$ after multiplication - the matrix's row-0 gives $0.5(1)+0.5(1)=1$, row-1 gives the same, so actually for pure $H$ input the output intensity is 1. The factor-of-½ in the matrix only attenuates partially-polarized inputs, because the matrix naturally projects out the unwanted component. This is the standard convention and is correct.

Applying the rotated $V$-axis polarizer to the reflected path yields a $V$-polarized output: also correct.

**Status: Correct.**

---

### 2.6 Half-Wave Plate (HWP)

**Expected physics:** A HWP with fast axis at angle $\theta$ to horizontal has Mueller matrix:

$$M_{HWP}(\theta) = \begin{bmatrix} 1 & 0 & 0 & 0 \\ 0 & \cos 4\theta & \sin 4\theta & 0 \\ 0 & \sin 4\theta & -\cos 4\theta & 0 \\ 0 & 0 & 0 & -1 \end{bmatrix}$$

**Base matrix (`mueller.js`, `HWP_H`)** (fast axis horizontal, $\theta=0$):

```
[[1, 0,  0,  0],
 [0, 1,  0,  0],
 [0, 0, -1,  0],
 [0, 0,  0, -1]]
```

At $\theta=0$: $\cos 0 = 1$, $\sin 0 = 0$, giving diagonal $[1, 1, -1, -1]$. This matches the expected matrix. Correct.

**Rotation:** `MuellerMath.rotateComponent(baseMatrix, theta)` computes $R(-\theta)\, M_0\, R(\theta)$. This is the standard rotation sandwich for Mueller matrices. The resulting matrix at angle $\theta$ expands to exactly the $\cos 4\theta / \sin 4\theta$ form above.

**Direction-dependent sign flip (`raytracing.js`):**

```js
if (dir < 0) { theta = -theta; }
```

When the ray enters from the back face (anti-parallel to the stored normal), the angle is negated. For a HWP, $M(-\theta) \ne M(\theta)$ in general (the $\sin 4\theta$ terms flip sign). This is physically reasonable to model bidirectional operation consistently, though the sign convention depends on how the fast-axis angle is defined relative to the surface normal direction.

**Status: Correct.**

---

### 2.7 Quarter-Wave Plate (QWP)

**Expected physics:** A QWP with fast axis at angle $\theta$ to horizontal has Mueller matrix:

$$M_{QWP}(\theta) = \begin{bmatrix} 1 & 0 & 0 & 0 \\ 0 & \cos^2 2\theta & \tfrac{1}{2}\sin 4\theta & -\sin 2\theta \\ 0 & \tfrac{1}{2}\sin 4\theta & \sin^2 2\theta & \cos 2\theta \\ 0 & \sin 2\theta & -\cos 2\theta & 0 \end{bmatrix}$$

**Base matrix (`mueller.js`, `QWP_H`)** (fast axis horizontal, $\theta=0$):

```
[[1, 0, 0,  0],
 [0, 1, 0,  0],
 [0, 0, 0,  1],
 [0, 0,-1,  0]]
```

At $\theta=0$: $\cos^2 0 = 1$, $\sin^2 0 = 0$, $\sin 0 = 0$, $\cos 0 = 1$. Expected matrix:

```
[[1, 0, 0,  0],
 [0, 1, 0,  0],
 [0, 0, 0,  1],
 [0, 0,-1,  0]]
```

This matches `QWP_H` exactly.

**Sign convention note:** The $(3,4)$ entry is $-\sin 2\theta$ and the $(4,3)$ entry is $+\cos 2\theta$ at $\theta=0$ in the reference formula, but the sign of $V$ coupling to $U$ depends on the retardation sign convention (whether the fast axis introduces a phase lead or lag). The base matrix shown here uses $M_{32}=0, M_{33}=0, M_{34}=1, M_{42}=0, M_{43}=-1, M_{44}=0$ which is consistent with a $+\pi/2$ retardation convention. As long as HWP and QWP use a consistent convention (both $+$), the combined effect of a QWP+HWP pair will be correct.

**Rotation:** Same `rotateComponent` sandwich as HWP. This will generate the full angle-dependent form correctly.

**Status: Correct** (with the standard caveat that the retardation sign convention must be consistently applied throughout the system, which it appears to be).

---

### 2.8 AOM (Acousto-Optic Modulator)

**Expected physics:** An AOM diffracts a fraction of the input beam into the first diffraction order at the Bragg angle, shifting its frequency by the RF drive frequency. Typical first-order efficiency is 70-90%. The zeroth order passes through with the remaining intensity. Polarization state is not significantly altered in most standard AOM configurations (the acoustic wave couples to intensity, not polarization). When off, the AOM acts as a window with minor insertion loss.

**Implementation:**

The code models two operating modes:

- **AOM off:** 5% uniform loss, beam passes straight through. Polarization unchanged.
- **AOM on, beam arriving straight (within `angleTolerance = 0.02 rad`):** spawns two rays - zeroth order (30% of input intensity, straight) and first order (70%, deflected by `shiftAngle = 0.035 rad`). Polarization state of both child rays is the parent Stokes vector scaled by 0.3 or 0.7.
- **AOM on, beam arriving at angle (pre-deflected for Bragg injection):** collapses to a single 70%-intensity ray directed straight out.

No Mueller matrix is applied. All four Stokes components scale identically, which is correct for an AOM (no polarization conversion).

**Issues:**

1. The fixed `shiftAngle = 0.035 rad` (~2°) is a hardcoded constant with no dependence on the acoustic frequency, wavelength, or medium. This is acceptable for a visual simulator but is not physical.
2. The `angleTolerance = 0.02 rad` and `alignment < 0.15` guards are geometric heuristics that do not reflect Bragg condition physics.
3. The 70/30 split is hardcoded. Real AOMs have efficiency that depends on RF power and beam alignment.
4. No frequency shift is tracked. The simulator has no concept of optical frequency, so this is a known limitation of the overall architecture rather than a bug in the AOM module.

**Status: Approximation** - intensity splitting and polarization behavior are reasonable; geometry is schematic rather than physical.

---

### 2.9 Fiber Coupler

**Expected physics:** A fiber coupler collects a beam into a single-mode fiber. The coupling efficiency depends on beam diameter, position, and NA matching. A typical single-mode fiber coupler has 80-95% transmission (including Fresnel and mode-mismatch losses). In single-mode fiber, polarization state can drift unless a polarization-maintaining fiber is used.

**Implementation:**

```js
const fiberStokes = ray.stokes.map(v => v * 0.9);
```

A fixed 10% loss is applied to all Stokes components. Polarization state is preserved (the same relative $Q/I$, $U/I$, $V/I$). The code then "teleports" the beam to the output of the paired element (another fiber coupler or an amplifier), orienting it along that element's local x-axis.

**Issues:**

1. The 10% loss is a hardcoded estimate. Real coupling efficiency is not modeled.
2. Single-mode fiber scrambles polarization (unless PM fiber). The code preserves the polarization state through the fiber, which would only be correct for PM fiber. This is not flagged anywhere.
3. There is no treatment of the fiber output mode (Gaussian profile, NA).

**Status: Approximation** - loss is a reasonable placeholder; fiber polarization scrambling is not modeled (appropriate for PM fiber, incorrect for standard SMF).

---

### 2.10 Filter

**Expected physics:** An optical filter blocks specific wavelengths or laser sources and passes others without perturbing polarization.

**Implementation:**

```js
const isBlocked = (hitObject.blockedLasers || []).includes(ray.laserId);
if (!isBlocked) {
    traceRay({ ...ray, x: ..., y: ..., dx: inc.x, dy: inc.y }, depth + 1, results);
}
```

If the ray's `laserId` is in the filter's block list, the ray is absorbed. Otherwise it passes through with no change to Stokes vector or intensity.

**Assessment:** Binary pass/block with no polarization perturbation is correct for an ideal bandpass filter. No insertion loss is applied to the transmitted beam, which slightly overestimates transmission but is a common idealization.

**Status: Correct** (ideal filter approximation, no insertion loss modeled for the pass band).

---

### 2.11 Blocker

A dedicated `blocker` type is not explicitly handled in `traceRay`. Rays hitting an unhandled segment type fall through all the conditional branches and are implicitly absorbed (no child ray is spawned). The D-mirror's non-reflective `blocker` segment is handled separately (see 2.3).

**Status: Implicitly correct** - unrecognized segment types absorb the beam by omission. An explicit match with a comment would improve clarity.

---

### 2.12 Detector

No explicit detector handler appears in `traceRay`. A ray that hits a detector element would fall through to implicit absorption (no child spawned), which is the correct physical behavior - the detector terminates the beam.

**Assessment:** Correct by omission, but no intensity reading or signal accumulation is performed in the ray-tracing pass. Detection is presumably handled elsewhere in the application.

**Status: Correct** (beam termination); signal accumulation not visible in these files.

---

### 2.13 Cell (Faraday Rotator)

**Expected physics:** A Faraday rotator rotates the plane of linear polarization by a fixed angle $\phi = VBL$ (Verdet constant × field × length). Crucially, the Faraday effect is non-reciprocal: the rotation direction is the same regardless of the propagation direction. In Stokes terms, a pure polarization rotation by $\phi$ is described by the rotation matrix $R(\phi)$.

**Implementation:**

```js
const phi = hitObject.cellAngle || 0;
const rotMatrix = MuellerMath.createRotationMatrix(-phi);
const newStokes = MuellerMath.interact(ray.stokes, rotMatrix);
```

`createRotationMatrix(-phi)` produces:

```
[[1,       0,        0, 0],
 [0,  cos 2φ, -sin 2φ, 0],
 [0,  sin 2φ,  cos 2φ, 0],
 [0,       0,        0, 1]]
```

This is correct for a polarization rotation by angle $\phi$ in the Stokes frame (the factor of 2 arises because Stokes angles are twice the polarization angles).

**Issue - non-reciprocity not modeled:** The code applies the same rotation regardless of the ray's propagation direction. A Faraday rotator rotates by $+\phi$ for a forward-traveling beam and by $+\phi$ again (same sign, not reversed) for a backward-traveling beam - making it non-reciprocal. A standard waveplate, by contrast, applies the same magnitude of rotation but with opposite sign for backward propagation.

The implementation always applies $R(-\phi)$ (a rotation by $-\phi$ in the Stokes frame). If a backward-propagating ray is ever relevant in the simulation, both directions would apply the same total rotation, which is correct for Faraday but only if the code has correctly identified the sign convention. Given that the waveplate code explicitly flips the sign for the backward direction, and the cell code does not, the cell appears to intentionally treat the rotation as propagation-direction-independent - which is the correct physics for a Faraday rotator.

**Assessment:** The Stokes-frame rotation matrix is correctly applied. The non-reciprocal nature is implicitly correct (no sign flip on back-propagation). The one-way rotation angle $\phi$ should ideally span $[0, 2\pi)$, but the code uses `cellAngle` which can be any float (the UI constrains it via `updateCellAngleFromPoint`).

**Status: Correct.**

---

### 2.14 Lens

**Expected physics:** A thin lens deflects a ray by an angle $\Delta\theta = -y/f$, where $y$ is the height at which the ray crosses the lens plane and $f$ is the focal length. This is the paraxial thin-lens law. The lens does not alter polarization.

**Implementation (`optics.js`, `computeLensRefraction`):**

1. Decomposes the incoming ray into components along the optical axis and the tangent.
2. Computes the transverse offset $y$ of the hit point from the lens center (in the tangent direction).
3. Applies $\Delta\theta = -y/f$ as an additive angle change: `thetaOut = thetaIn + deflection`.
4. Reconstructs the exit direction.

The Stokes vector is scaled by 0.98 (2% loss), with all four components multiplied equally, so polarization state is preserved.

**Assessment:** The paraxial thin-lens formula $\Delta\theta = -y/f$ is standard and correct. The additive-angle implementation is valid in the paraxial regime. No polarization perturbation from the lens itself is correct for an ideal thin lens.

One subtlety: `thetaIn` is computed as `Math.atan2(tangentComponent, Math.abs(axialComponent))`, using the absolute value of the axial component. This means a ray traveling in the $-x$ direction through a lens oriented along $+x$ is treated as having the same axial component magnitude as one traveling in $+x$. The sign is restored via `signAx = axialComponent > 0 ? 1 : -1`. This is correct: a thin lens focuses regardless of which direction the beam traverses it (a converging lens is converging from both sides).

**Status: Correct** (paraxial approximation, standard for a thin-lens simulator).

---

### 2.15 Iris

**Expected physics:** An iris (aperture stop) passes rays within the aperture and blocks rays outside it. Rays passing through the center of an open iris are unaffected.

**Implementation:**

```js
// Iris pass-through (visual only for now)
traceRay({ ...ray, x: ..., y: ..., dx: inc.x, dy: inc.y }, depth + 1, results);
```

The iris is entirely pass-through with no effect - a comment explicitly marks it "visual only for now." No aperture truncation, no diffraction.

**Status: Not implemented** - the iris has no physical effect on the beam. This is a placeholder.

---

### 2.16 Amplifier

**Expected physics:** An optical amplifier (e.g., EDFA or fiber amplifier) increases beam intensity by a gain factor $G$, ideally preserving polarization.

**Implementation:** The amplifier is not hit directly by rays in `traceRay`. It is reached only when paired with a fiber coupler. When that path is taken:

```js
const gain = pairedElement.gain || 2.0;
const ampStokes = ray.stokes.map(v => v * gain * 0.9);
```

All Stokes components are scaled by $G \times 0.9$ (gain minus 10% fiber loss). Polarization state is preserved.

**Assessment:** Proportional gain on all Stokes components is correct - amplification does not rotate the polarization. Gain-dependent noise (ASE) is not modeled, which is expected for a geometric optics simulator.

**Status: Correct** (ideal gain model; no ASE noise, polarization-dependent gain, or saturation modeled).

---

## 3. Summary Table

| Component | Status | Notes |
|---|---|---|
| Laser | Approximation | Correct polarization; initial intensity is 0.5 instead of 1.0 |
| Mirror | Correct | Normal-incidence approximation |
| D-Mirror (transmit) | Approximation | 5% loss is a hardcoded placeholder |
| Beam splitter | Approximation | Correct 50/50 split; reflected-beam handedness not flipped |
| PBS | Correct | Rotated-polarizer model is standard and correct |
| HWP | Correct | Base matrix and rotation sandwich are exact |
| QWP | Correct | Base matrix and rotation sandwich are exact |
| AOM | Approximation | Schematic geometry; fixed 70/30 split; no frequency tracking |
| Fiber coupler | Approximation | Fixed 10% loss; PM fiber assumed (polarization not scrambled) |
| Filter | Correct | Ideal binary pass/block; no insertion loss on pass band |
| Blocker | Correct (implicit) | Absorbed by omission; no explicit handler |
| Detector | Correct (implicit) | Terminates beam; no signal accumulation in this module |
| Cell (Faraday) | Correct | Non-reciprocal rotation correctly not sign-flipped |
| Lens | Correct | Paraxial thin-lens formula; polarization preserved |
| Iris | Not implemented | Pass-through placeholder; no aperture effect |
| Amplifier | Correct | Proportional gain; no saturation or ASE |

---

## 4. Issues Found

### Issue 1 - Laser initial intensity (minor)

**File:** `raytracing.js`, `castRays`  
**Problem:** The Stokes vector is generated by applying `POLARIZER_H` (a 50% efficiency device) to $[1,0,0,0]^T$. This produces $I = 0.5$ instead of 1.0 for a linearly polarized source. Every downstream intensity reading is therefore half the expected value.  
**Fix:** Replace the polarizer-based initialization with a direct Stokes vector construction:

```js
const sourceStokes = [1, Math.cos(2 * theta), Math.sin(2 * theta), 0];
```

This gives $I=1$ and the correct polarization angle without the polarizer's 50% transmission factor.

---

### Issue 2 - Beam splitter reflected beam handedness (minor)

**File:** `raytracing.js`, lines 118-137  
**Problem:** The non-polarizing beam splitter scales `ray.stokes` by 0.5 for both arms but does not apply the mirror-like flip ($U \to -U$, $V \to -V$) to the reflected arm. For linearly polarized beams ($V = 0$) this is invisible; for circularly or elliptically polarized beams the reflected handedness is wrong.  
**Fix:** Apply `MuellerMath.MATRICES.MIRROR` to the reflected-arm Stokes vector, then scale by 0.5:

```js
const reflected = MuellerMath.interact(ray.stokes, MuellerMath.MATRICES.MIRROR);
const reflStokes = reflected.map(v => v * 0.5);
```

---

### Issue 3 - Iris has no physical effect

**File:** `raytracing.js`, lines 325-333  
**Problem:** The iris is a complete pass-through. Rays that would be blocked by a real aperture are not stopped.  
**Recommendation:** Add a transverse offset check at the hit point against `iris.apertureRadius`. Rays whose transverse offset from the iris center exceeds the aperture should be absorbed (no child ray spawned).

---

### Issue 4 - Mirror rotation matrix sign convention

**File:** `mueller.js`, `MATRICES.MIRROR`  
**Observation:** The current mirror matrix flips both $U$ and $V$:

```
M_{33} = -1, M_{44} = -1
```

The standard reflection matrix for a mirror in the plane of incidence flips the $U$ component (the Stokes parameter sensitive to the $\pm 45°$ orientation of linear polarization) and the $V$ component (circular handedness). Flipping both simultaneously is correct for a reflection that reverses the propagation direction while keeping the transverse frame consistent. This is not a bug, but the comment in the source says "Reflects intensity (1), Flips coordinate system (-1 on U and V)" which is accurate and matches the physics.

**Status:** No issue; observation for documentation.

---

### Issue 5 - AOM Bragg condition not enforced

**File:** `raytracing.js`, lines 186-254  
**Problem:** The `alignment < 0.15` cut blocks nearly-perpendicular beams but is not a true Bragg condition. The actual Bragg angle depends on wavelength and acoustic frequency, neither of which is tracked. The `angleTolerance = 0.02 rad` (~1.1°) for "arriving straight" is similarly a heuristic.  
**Assessment:** Acceptable for a schematic simulator where the user controls beam alignment visually, but should be noted in user documentation as an approximation.

---

### Issue 6 - `rotateComponent` skips the identity optimization for small angles

**File:** `mueller.js`, `rotateComponent`, line 125  
```js
if (Math.abs(thetaRad) < 0.001) return baseMatrix;
```

This short-circuits the rotation for angles smaller than ~0.057°. For waveplates and the PBS, this is fine in practice (a sub-milli-radian axis error is negligible). However, the function returns a direct reference to `baseMatrix` rather than a copy. If the caller modifies the returned matrix, it would mutate the shared `MATRICES` object. No mutation appears to happen in the current codebase, but this is a latent aliasing risk.

**Status:** Not a physics bug; a defensive-programming note.
