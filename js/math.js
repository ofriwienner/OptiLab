/**
 * OptiLab - Math Helpers
 * Mathematical utilities for geometry, coordinate transforms, and calculations
 */

/**
 * Convert degrees to radians
 * @param {number} deg - Angle in degrees
 * @returns {number} Angle in radians
 */
function toRad(deg) { 
    return deg * Math.PI / 180; 
}

/**
 * Convert radians to degrees
 * @param {number} rad - Angle in radians
 * @returns {number} Angle in degrees
 */
function toDeg(rad) { 
    return rad * 180 / Math.PI; 
}

/**
 * Rotate a point around the origin
 * @param {Object} p - Point with x, y coordinates
 * @param {number} angle - Rotation angle in radians
 * @returns {Object} Rotated point
 */
function rotatePoint(p, angle) { 
    return { 
        x: p.x * Math.cos(angle) - p.y * Math.sin(angle), 
        y: p.x * Math.sin(angle) + p.y * Math.cos(angle) 
    }; 
}

/**
 * Normalize a vector to unit length
 * @param {Object} v - Vector with x, y components
 * @returns {Object} Normalized vector
 */
function normalize(v) { 
    const len = Math.sqrt(v.x * v.x + v.y * v.y); 
    return len === 0 ? { x: 0, y: 0 } : { x: v.x / len, y: v.y / len }; 
}

/**
 * Calculate dot product of two vectors
 * @param {Object} v1 - First vector
 * @param {Object} v2 - Second vector
 * @returns {number} Dot product
 */
function dot(v1, v2) { 
    return v1.x * v2.x + v1.y * v2.y; 
}

/**
 * Convert screen coordinates to world coordinates
 * @param {number} sx - Screen X coordinate
 * @param {number} sy - Screen Y coordinate
 * @returns {Object} World coordinates
 */
function screenToWorld(sx, sy) { 
    return { 
        x: (sx - view.x) / (PIXELS_PER_MM * view.scale), 
        y: (sy - view.y) / (PIXELS_PER_MM * view.scale) 
    }; 
}

/**
 * Convert world coordinates to screen coordinates
 * @param {number} wx - World X coordinate
 * @param {number} wy - World Y coordinate
 * @returns {Object} Screen coordinates
 */
function worldToScreen(wx, wy) { 
    return { 
        x: (wx * PIXELS_PER_MM * view.scale) + view.x, 
        y: (wy * PIXELS_PER_MM * view.scale) + view.y 
    }; 
}

/**
 * Calculate ray-segment intersection
 * @param {Object} rO - Ray origin
 * @param {Object} rD - Ray direction
 * @param {Object} s1 - Segment start point
 * @param {Object} s2 - Segment end point
 * @returns {Object|null} Intersection point or null
 */
function getIntersection(rO, rD, s1, s2) {
    const sdx = s2.x - s1.x; 
    const sdy = s2.y - s1.y; 
    const den = sdx * rD.y - sdy * rD.x;
    
    if (Math.abs(den) < 0.00001) return null;
    
    const dx = s1.x - rO.x; 
    const dy = s1.y - rO.y;
    const T1 = (dy * sdx - dx * sdy) / den; 
    const T2 = (rD.x * dy - rD.y * dx) / den;
    
    if (T2 >= 0 && T2 <= 1 && T1 > 0.001) {
        return { 
            x: rO.x + rD.x * T1, 
            y: rO.y + rD.y * T1, 
            param: T1, 
            segVector: { x: sdx, y: sdy } 
        };
    }
    return null;
}

/**
 * Get mouse position relative to canvas
 * @param {Event} evt - Mouse event
 * @returns {Object} Mouse position
 */
function getMousePos(evt) {
    const rect = canvas.getBoundingClientRect();
    return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
}

/**
 * Check if a board overlaps with other boards
 * @param {Object} board - Board to check
 * @param {number} testX - Test X position
 * @param {number} testY - Test Y position
 * @param {number} testW - Test width
 * @param {number} testH - Test height
 * @returns {boolean} True if overlapping
 */
function checkBoardOverlap(board, testX, testY, testW, testH) {
    const otherBoards = elements.filter(e => e.type === 'board' && e !== board);
    for (let ob of otherBoards) {
        if (Math.abs(testX - ob.x) < (testW + ob.width) / 2 && 
            Math.abs(testY - ob.y) < (testH + ob.height) / 2) {
            return true;
        }
    }
    return false;
}

/**
 * Get the parent board for a component
 * @param {Object} comp - Component element
 * @returns {Object|null} Parent board or null
 */
function getParentBoard(comp) {
    const boards = elements.filter(e => e.type === 'board').reverse();
    for (let b of boards) {
        if (comp.x >= b.x - b.width / 2 && 
            comp.x <= b.x + b.width / 2 && 
            comp.y >= b.y - b.height / 2 && 
            comp.y <= b.y + b.height / 2) {
            return b;
        }
    }
    return null;
}

/**
 * Normalize angle to [0, 2π)
 * @param {number} angle - Angle in radians
 * @returns {number} Normalized angle
 */
function normalizeAngleRad(angle) {
    if (!isFinite(angle)) return 0;
    const TWO_PI = Math.PI * 2;
    angle = angle % TWO_PI;
    if (angle < 0) angle += TWO_PI;
    return angle;
}

/**
 * Get closest grid point to a world coordinate on a board
 * @param {Object} w - World coordinate
 * @param {Object} b - Board element
 * @returns {Object} Snapped grid point
 */
function getClosestGridPoint(w, b) {
    const gx = GRID_PITCH_MM;
    const lx = w.x - b.x;
    const ly = w.y - b.y;
    const sx = -b.width / 2 + 12.5;
    const sy = -b.height / 2 + 12.5;
    const col = Math.round((lx - sx) / gx);
    const row = Math.round((ly - sy) / gx);
    return { x: b.x + sx + col * gx, y: b.y + sy + row * gx };
}


