/**
 * OptiLab - Optics Physics Helpers
 * Lens, waveplate, and AOM physics calculations
 */

/**
 * Check if an element is a waveplate (HWP or QWP)
 * @param {Object} el - Element to check
 * @returns {boolean} True if waveplate
 */
function isWaveplateElement(el) {
    return !!el && (el.type === 'hwp' || el.type === 'qwp');
}

/**
 * Clamp waveplate angle to valid range [0, π)
 * @param {number} angleRad - Angle in radians
 * @returns {number} Clamped angle
 */
function clampWaveplateAngle(angleRad) {
    let normalized = normalizeAngleRad(angleRad);
    if (normalized > Math.PI) normalized -= Math.PI;
    if (normalized >= Math.PI - 1e-6) normalized = 0;
    return normalized;
}

/**
 * Snap waveplate angle to step increments
 * @param {number} angleRad - Angle in radians
 * @param {number} stepRad - Step size in radians
 * @returns {number} Snapped angle
 */
function snapWaveplateAngle(angleRad, stepRad) {
    const step = stepRad || (Math.PI / 4);
    if (step <= 0) return clampWaveplateAngle(angleRad);
    return clampWaveplateAngle(Math.round(angleRad / step) * step);
}

/**
 * Get the axis angle of a waveplate
 * @param {Object} el - Waveplate element
 * @returns {number} Axis angle in radians
 */
function getWaveplateAxisAngle(el) {
    if (!isWaveplateElement(el)) return 0;
    if (typeof el.axisAngle !== 'number') {
        return clampWaveplateAngle(el.rotation || toRad(45));
    }
    return clampWaveplateAngle(el.axisAngle);
}

/**
 * Get signed waveplate angle (for bidirectional operation)
 * @param {Object} el - Waveplate element
 * @returns {number} Signed angle in radians
 */
function getSignedWaveplateAngle(el) {
    const axis = getWaveplateAxisAngle(el);
    return axis > Math.PI / 2 ? axis - Math.PI : axis;
}

/**
 * Format axis angle for display in degrees
 * @param {number} angleRad - Angle in radians
 * @returns {number} Formatted angle in degrees
 */
function formatAxisAngleDeg(angleRad) {
    let deg = Math.round(toDeg(clampWaveplateAngle(angleRad)));
    if (deg < 0) deg += 180;
    if (deg > 180) deg -= 180;
    return deg;
}

/**
 * Update waveplate axis angle from mouse position
 * @param {Object} el - Waveplate element
 * @param {Object} worldPoint - World coordinates of mouse
 * @returns {boolean} True if angle was changed
 */
function updateWaveplateAxisFromPoint(el, worldPoint) {
    if (!isWaveplateElement(el)) return false;
    const knobWorld = el.getAxisKnobWorldPosition();
    const angle = Math.atan2(worldPoint.y - knobWorld.y, worldPoint.x - knobWorld.x);
    let normalized = clampWaveplateAngle(angle);
    let stepRad = Math.PI / 4; // 45°
    if (ctrlPressed) stepRad = toRad(WAVEPLATE_FINE_STEP_DEG); // 5°
    else if (shiftPressed) stepRad = Math.PI / 8; // 22.5°
    normalized = snapWaveplateAngle(normalized, stepRad);
    if (typeof el.axisAngle !== 'number' || Math.abs(el.axisAngle - normalized) > 0.0005) {
        el.axisAngle = normalized;
        return true;
    }
    return false;
}

/**
 * Get waveplate knob hit test
 * @param {Object} mousePoint - Screen coordinates
 * @returns {Object|null} Hit waveplate or null
 */
function getWaveplateKnobHit(mousePoint) {
    const waveplates = elements.filter(isWaveplateElement).reverse();
    for (let el of waveplates) {
        const knobWorld = el.getAxisKnobWorldPosition();
        const knobScreen = worldToScreen(knobWorld.x, knobWorld.y);
        const radiusPx = Math.max(8, WAVEPLATE_KNOB_RADIUS_MM * view.scale * PIXELS_PER_MM);
        const dx = mousePoint.x - knobScreen.x;
        const dy = mousePoint.y - knobScreen.y;
        if (dx * dx + dy * dy <= radiusPx * radiusPx) return el;
    }
    return null;
}

/**
 * Get AOM direction vector
 * @param {Object} el - AOM element
 * @returns {Object} Normalized direction vector
 */
function getAomDirectionVector(el) {
    if (!el || el.type !== 'aom') return { x: 0, y: 1 };
    return normalize(rotatePoint({ x: 0, y: 1 }, el.rotation));
}

/**
 * Check if AOM is enabled
 * @param {Object} el - AOM element
 * @returns {boolean} True if enabled
 */
function isAomEnabled(el) {
    if (!el || el.type !== 'aom') return false;
    return el.aomEnabled !== false; // Default to true
}

/**
 * Get AOM toggle button hit test
 * @param {Object} mousePoint - Screen coordinates
 * @returns {Object|null} Hit AOM or null
 */
function getAomToggleHit(mousePoint) {
    const selectedAoms = elements.filter(el => el.type === 'aom' && selection.has(el));
    for (let el of selectedAoms) {
        const localPos = { x: 0, y: -el.height / 2 - 12 };
        const rotated = rotatePoint(localPos, el.rotation);
        const btnWorld = { x: el.x + rotated.x, y: el.y + rotated.y };
        const btnScreen = worldToScreen(btnWorld.x, btnWorld.y);
        
        const sc = view.scale * PIXELS_PER_MM;
        const btnW = 20 * sc / 2;
        const btnH = 10 * sc / 2;
        
        if (Math.abs(mousePoint.x - btnScreen.x) < btnW && 
            Math.abs(mousePoint.y - btnScreen.y) < btnH) {
            return el;
        }
    }
    return null;
}

/**
 * Get fiber coupler connector pin hit test
 * The connector pin is the small rectangle with arrow on the side of the fiber coupler
 * @param {Object} mousePoint - Screen coordinates
 * @returns {Object|null} Hit fiber coupler or null
 */
function getFiberConnectorPinHit(mousePoint) {
    const fiberCouplers = elements.filter(el => el.type === 'fiber-coupler').reverse();
    for (let el of fiberCouplers) {
        // Connector pin is at (el.width/2 + 4, 0) in local coords, extends to +10
        // Local position of pin center
        const localPos = { x: el.width / 2 + 4, y: 0 };
        const rotated = rotatePoint(localPos, el.rotation);
        const pinWorld = { x: el.x + rotated.x, y: el.y + rotated.y };
        const pinScreen = worldToScreen(pinWorld.x, pinWorld.y);
        
        // Hit area size (scaled to screen)
        const sc = view.scale * PIXELS_PER_MM;
        const hitW = 12 * sc / 2; // Width of clickable area
        const hitH = 8 * sc / 2;  // Height of clickable area
        
        if (Math.abs(mousePoint.x - pinScreen.x) < hitW && 
            Math.abs(mousePoint.y - pinScreen.y) < hitH) {
            return el;
        }
    }
    return null;
}

/**
 * Ensure lens has valid optics configuration
 * @param {Object} lens - Lens element
 */
function ensureLensOptics(lens) {
    if (!lens || lens.type !== 'lens') return;
    if (!lens.optics) lens.optics = { focalLength: GRID_PITCH_MM * 5 };
    if (typeof lens.optics.focalLength !== 'number' || !isFinite(lens.optics.focalLength)) {
        lens.optics.focalLength = GRID_PITCH_MM * 5;
    }
    lens.optics.focalLength = snapLensFocalLength(lens.optics.focalLength);
}

/**
 * Get lens optical axis vector
 * @param {Object} lens - Lens element
 * @returns {Object} Normalized axis vector
 */
function getLensAxisVector(lens) {
    return normalize(rotatePoint({ x: 1, y: 0 }, lens.rotation || 0));
}

/**
 * Snap lens focal length to grid increments
 * @param {number} value - Focal length value
 * @returns {number} Snapped focal length
 */
function snapLensFocalLength(value) {
    let step = GRID_PITCH_MM;
    if (ctrlPressed) step = GRID_PITCH_MM * 0.1;
    else if (shiftPressed) step = GRID_PITCH_MM * 0.5;
    if (step <= 0) step = GRID_PITCH_MM;
    const snapped = Math.max(step, Math.round(value / step) * step);
    return snapped;
}

/**
 * Compute exit ray direction after passing through a thin lens
 * Uses the thin lens equation: 1/f = 1/s + 1/s'
 * @param {Object} ray - Incoming ray with x, y, dx, dy
 * @param {Object} lens - The lens element
 * @param {Object} hit - Hit point on the lens
 * @returns {Object} Normalized exit direction {x, y}
 */
function computeLensRefraction(ray, lens, hit) {
    ensureLensOptics(lens);
    const f = lens.optics.focalLength;
    
    // Get lens coordinate system
    const axisDir = getLensAxisVector(lens);
    const tangentDir = { x: -axisDir.y, y: axisDir.x };
    
    // Incoming ray direction (normalized)
    const incDir = normalize({ x: ray.dx, y: ray.dy });
    
    // Check if ray is traveling along +axis or -axis direction
    const axialComponent = dot(incDir, axisDir);
    
    // If ray is nearly perpendicular to axis, just pass through
    if (Math.abs(axialComponent) < 0.01) {
        return incDir;
    }
    
    // Compute hit point offset from lens center along tangent
    const relHit = { x: hit.x - lens.x, y: hit.y - lens.y };
    const yOffset = dot(relHit, tangentDir);
    
    // If ray passes through center, it goes straight through
    if (Math.abs(yOffset) < 0.1) {
        return incDir;
    }
    
    // Compute the angle of incidence relative to axis
    const tangentComponent = dot(incDir, tangentDir);
    
    // Thin lens deflection: delta_theta = -y / f
    const thetaIn = Math.atan2(tangentComponent, Math.abs(axialComponent));
    const deflection = -yOffset / f;
    const thetaOut = thetaIn + deflection;
    
    // Reconstruct exit direction
    const signAx = axialComponent > 0 ? 1 : -1;
    const newAxial = Math.cos(thetaOut) * signAx;
    const newTangent = Math.sin(thetaOut);
    
    const outDir = {
        x: axisDir.x * newAxial + tangentDir.x * newTangent,
        y: axisDir.y * newAxial + tangentDir.y * newTangent
    };
    
    const result = normalize(outDir);
    
    // Sanity check - if result is invalid, just pass through
    if (!isFinite(result.x) || !isFinite(result.y)) {
        return incDir;
    }
    
    return result;
}


