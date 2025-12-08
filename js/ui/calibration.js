/**
 * OptiLab - Image Calibration
 * 3-point calibration logic for reference images
 */

/**
 * Start calibration process
 */
function startCalibration() {
    const p = Array.from(selection).pop();
    if (p && p.type === 'board' && p.imgData) {
        calibrationState = 1;
        calibData.board = p;
        calibrationMsg.innerText = "Step 1/6: Click Top-Left on Image";
        calibrationMsg.style.display = 'block';
        document.body.style.cursor = 'crosshair';
    }
}

/**
 * Handle calibration click
 * @param {Object} m - Mouse position
 */
function handleCalibrationClick(m) {
    const w = screenToWorld(m.x, m.y);
    const b = calibData.board;

    if (calibrationState === 1) {
        calibData.p1Img = { x: w.x, y: w.y };
        calibrationState = 2;
        calibrationMsg.innerText = "Step 2/6: Click Grid Hole for Top-Left";
    } else if (calibrationState === 2) {
        const snap = getClosestGridPoint(w, b);
        calibData.p1Board = snap;
        calibrationState = 3;
        calibrationMsg.innerText = "Step 3/6: Click Top-Right on Image";
    } else if (calibrationState === 3) {
        calibData.p2Img = { x: w.x, y: w.y };
        calibrationState = 4;
        calibrationMsg.innerText = "Step 4/6: Click Grid Hole for Top-Right";
    } else if (calibrationState === 4) {
        const snap = getClosestGridPoint(w, b);
        calibData.p2Board = snap;
        calibrationState = 5;
        calibrationMsg.innerText = "Step 5/6: Click Bottom-Right on Image";
    } else if (calibrationState === 5) {
        calibData.p3Img = { x: w.x, y: w.y };
        calibrationState = 6;
        calibrationMsg.innerText = "Step 6/6: Click Grid Hole for Bottom-Right";
    } else if (calibrationState === 6) {
        const snap = getClosestGridPoint(w, b);
        calibData.p3Board = snap;
        applyCalibration();
        calibrationState = 0;
        calibrationMsg.style.display = 'none';
        document.body.style.cursor = 'default';
    }
}

/**
 * Apply the 3-point calibration transform
 */
function applyCalibration() {
    const b = calibData.board;

    const p1i = calibData.p1Img;
    const p1b = calibData.p1Board;
    const p3i = calibData.p3Img;
    const p3b = calibData.p3Board;

    // Vector in Image Space (P1 -> P3)
    const vImg = { x: p3i.x - p1i.x, y: p3i.y - p1i.y };
    // Vector in World Space (P1 -> P3)
    const vWorld = { x: p3b.x - p1b.x, y: p3b.y - p1b.y };

    const lenImg = Math.sqrt(vImg.x ** 2 + vImg.y ** 2);
    const lenWorld = Math.sqrt(vWorld.x ** 2 + vWorld.y ** 2);

    if (lenImg < 1) return;

    // Calculate Scale
    const scale = lenWorld / lenImg;

    // Calculate Rotation Angle
    const angImg = Math.atan2(vImg.y, vImg.x);
    const angWorld = Math.atan2(vWorld.y, vWorld.x);
    const rotationDelta = angWorld - angImg;

    // Apply to Image Config
    b.imgConfig.w *= scale;
    b.imgConfig.h *= scale;
    b.imgConfig.rotation = (b.imgConfig.rotation || 0) + rotationDelta;

    // Calculate Offset
    const cx = b.imgConfig.x;
    const cy = b.imgConfig.y;

    const dx = (p1i.x - (b.x + cx));
    const dy = (p1i.y - (b.y + cy));

    const sdx = dx * scale;
    const sdy = dy * scale;

    const rdx = sdx * Math.cos(rotationDelta) - sdy * Math.sin(rotationDelta);
    const rdy = sdx * Math.sin(rotationDelta) + sdy * Math.cos(rotationDelta);

    b.imgConfig.x = p1b.x - b.x - rdx;
    b.imgConfig.y = p1b.y - b.y - rdy;

    draw();
}


