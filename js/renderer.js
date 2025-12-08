/**
 * OptiLab - Renderer
 * All drawing and rendering functions
 */

/**
 * Draw the background grid
 */
function drawGrid() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const sc = view.scale * PIXELS_PER_MM;
    const gridStep = GRID_PITCH_MM;
    const gridOffset = 12.5;

    // Calculate visible world bounds
    const topLeft = screenToWorld(0, 0);
    const bottomRight = screenToWorld(canvas.width, canvas.height);

    // Find first grid point within view
    const startX = Math.floor((topLeft.x - gridOffset) / gridStep) * gridStep + gridOffset;
    const startY = Math.floor((topLeft.y - gridOffset) / gridStep) * gridStep + gridOffset;
    const endX = bottomRight.x + gridStep;
    const endY = bottomRight.y + gridStep;

    ctx.fillStyle = 'rgba(50, 50, 70, 0.6)';

    for (let wx = startX; wx < endX; wx += gridStep) {
        for (let wy = startY; wy < endY; wy += gridStep) {
            const sp = worldToScreen(wx, wy);
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, 1.2 * view.scale, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

/**
 * Create a drag preview image for components
 * @param {string} type - Component type
 * @returns {HTMLImageElement} Preview image
 */
function createDragImage(type) {
    const c = document.createElement('canvas');
    const cx = c.getContext('2d');
    c.width = 64;
    c.height = 64;
    cx.translate(32, 32);
    if (type === 'laser') {
        cx.fillStyle = '#333';
        cx.fillRect(-25, -12.5, 50, 25);
        cx.fillStyle = 'red';
        cx.fillRect(25 - 2, -1.5, 2, 3);
    } else {
        cx.fillStyle = '#444';
        cx.fillRect(-10, -10, 20, 20);
    }
    const img = new Image();
    img.src = c.toDataURL();
    return img;
}

/**
 * Draw a single element
 * @param {Object} el - Element to draw
 */
function drawElement(el) {
    const pos = worldToScreen(el.x, el.y);
    const sc = view.scale * PIXELS_PER_MM;
    const isSelected = selection.has(el);

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(el.rotation);
    ctx.scale(sc, sc);

    // Highlight Selection
    if (el.type === 'board' && invalidBoardPlacement && isSelected) {
        ctx.shadowColor = 'red';
        ctx.shadowBlur = 20;
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.lineWidth = 3;
        ctx.strokeRect(-el.width / 2, -el.height / 2, el.width, el.height);
        ctx.shadowBlur = 0;
    } else if (isSelected) {
        ctx.shadowColor = 'white';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 1;
        if (el.type === 'board') {
            ctx.strokeRect(-el.width / 2, -el.height / 2, el.width, el.height);
        } else if (el.type.includes('mirror')) {
            ctx.strokeRect(-el.width / 2 - 2, -2, el.width + 4, el.height + 4);
        } else {
            ctx.strokeRect(-el.width / 2 - 2, -el.height / 2 - 2, el.width + 4, el.height + 4);
        }
        ctx.shadowBlur = 0;
    }

    // Draw Component Graphics
    if (el.type === 'board') {
        drawBoard(el, sc);
    } else if (el.type === 'laser') {
        drawLaser(el);
    } else if (el.type === 'mirror') {
        drawMirror(el);
    } else if (el.type === 'mirror-d') {
        drawDMirror(el);
    } else if (['splitter', 'pbs'].includes(el.type)) {
        drawSplitterPBS(el);
    } else if (el.type === 'aom') {
        drawAOM(el, isSelected);
    } else if (el.type === 'lens') {
        drawLens(el);
    } else if (el.type === 'blocker') {
        drawBlocker(el);
    } else if (el.type === 'detector') {
        drawDetector(el);
    } else if (el.type === 'glass') {
        drawGlass(el);
    } else if (el.type === 'fiber-coupler') {
        drawFiberCoupler(el);
    } else if (el.type === 'amplifier') {
        drawAmplifier(el);
    } else if (el.type === 'hwp' || el.type === 'qwp') {
        drawWaveplate(el, isSelected);
    }

    // Draw Title Label
    if (el.title) {
        ctx.fillStyle = '#9ca3af';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'left';
        const textY = el.type === 'board' ? (-el.height / 2 - 5) : (-el.height / 2 - 8);
        const textX = el.type === 'board' ? (-el.width / 2 + 5) : (-el.width / 2);
        ctx.fillText(el.title, textX, textY);
    }

    const isPrimary = Array.from(selection).pop() === el;

    // Draw Handles
    if (isSelected && isPrimary && el.type !== 'board') {
        drawComponentHandles(el, sc);
    } else if (isSelected && el.type === 'board' && !el.locked) {
        drawBoardHandles(el, sc);
    }

    ctx.restore();
}

/**
 * Draw board element
 */
function drawBoard(el, sc) {
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(-el.width / 2, -el.height / 2, el.width, el.height);

    // Draw background image if present
    if (el.imgData && el.imgConfig.visible) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(-el.width / 2, -el.height / 2, el.width, el.height);
        ctx.clip();
        ctx.globalAlpha = el.imgConfig.opacity;
        ctx.translate(el.imgConfig.x, el.imgConfig.y);
        ctx.rotate(el.imgConfig.rotation || 0);
        ctx.drawImage(el.imgData, -el.imgConfig.w / 2, -el.imgConfig.h / 2, el.imgConfig.w, el.imgConfig.h);
        ctx.restore();
    }

    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2 / sc;
    ctx.strokeRect(-el.width / 2, -el.height / 2, el.width, el.height);

    if (el.locked) {
        ctx.font = '16px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillText('🔒', -8, 6);
    }

    // Draw board grid (counter-rotate to align with world)
    ctx.save();
    ctx.rotate(-el.rotation);

    const gx = GRID_PITCH_MM;
    const gridOffset = 12.5;

    const boardLeft = el.x - el.width / 2;
    const boardRight = el.x + el.width / 2;
    const boardTop = el.y - el.height / 2;
    const boardBottom = el.y + el.height / 2;

    const startWX = Math.ceil((boardLeft - gridOffset) / gx) * gx + gridOffset;
    const startWY = Math.ceil((boardTop - gridOffset) / gx) * gx + gridOffset;

    ctx.fillStyle = '#111';
    for (let wx = startWX; wx < boardRight; wx += gx) {
        for (let wy = startWY; wy < boardBottom; wy += gx) {
            const lx = wx - el.x;
            const ly = wy - el.y;
            ctx.beginPath();
            ctx.arc(lx, ly, 1.2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();
}

/**
 * Draw laser element
 */
function drawLaser(el) {
    ctx.fillStyle = '#333';
    ctx.fillRect(-el.width / 2, -el.height / 2, el.width, el.height);
    ctx.fillStyle = 'red';
    ctx.fillRect(el.width / 2 - 2, -1.5, 2, 3);
    ctx.fillStyle = '#999';
    ctx.font = '8px sans-serif';
    ctx.fillText("LASER", -15, 3);
}

/**
 * Draw mirror element
 */
function drawMirror(el) {
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(-el.width / 2, 0, el.width, el.height);
    ctx.fillStyle = 'cyan';
    ctx.fillRect(-el.width / 2, -0.5, el.width, 1);
}

/**
 * Draw D-mirror element
 */
function drawDMirror(el) {
    const w = el.width / 2;
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(-w, 0, el.width, el.height);
    if (!el.isFlipped) {
        ctx.fillStyle = 'cyan';
        ctx.fillRect(0, -0.5, w, 1);
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(-w, -0.5, w, 1);
    } else {
        ctx.fillStyle = 'cyan';
        ctx.fillRect(-w, -0.5, w, 1);
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(0, -0.5, w, 1);
    }
}

/**
 * Draw beam splitter or PBS
 */
function drawSplitterPBS(el) {
    const col = el.type === 'pbs' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 0, 0.1)';
    const borderCol = el.type === 'pbs' ? 'rgba(168, 85, 247, 0.6)' : 'rgba(255, 255, 0, 0.5)';
    ctx.fillStyle = col;
    ctx.strokeStyle = borderCol;
    ctx.lineWidth = 0.5;
    ctx.fillRect(-el.width / 2, -el.height / 2, el.width, el.height);
    ctx.strokeRect(-el.width / 2, -el.height / 2, el.width, el.height);
    ctx.strokeStyle = el.type === 'pbs' ? 'rgba(168, 85, 247, 0.9)' : 'rgba(255, 255, 0, 0.9)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-el.width / 2, -el.height / 2);
    ctx.lineTo(el.width / 2, el.height / 2);
    ctx.stroke();
    if (el.type === 'pbs') {
        ctx.beginPath();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 0.5;
        ctx.moveTo(0, -5);
        ctx.lineTo(0, 5);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(5, 0, 1, 0, Math.PI * 2);
        ctx.stroke();
    }
}

/**
 * Draw AOM element
 */
function drawAOM(el, isSelected) {
    const aomOn = isAomEnabled(el);
    const bgColor = aomOn ? 'rgba(239, 68, 68, 0.15)' : 'rgba(100, 100, 100, 0.15)';
    const borderColor = aomOn ? 'rgba(239, 68, 68, 0.5)' : 'rgba(100, 100, 100, 0.5)';
    const barColor = aomOn ? '#b91c1c' : '#555';
    const textColor = aomOn ? 'rgba(239, 68, 68, 0.8)' : 'rgba(150, 150, 150, 0.8)';

    ctx.fillStyle = bgColor;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 0.5;
    ctx.fillRect(-el.width / 2, -el.height / 2, el.width, el.height);
    ctx.strokeRect(-el.width / 2, -el.height / 2, el.width, el.height);
    ctx.fillStyle = barColor;
    ctx.fillRect(-el.width / 2 + 2, el.height / 2 - 2, el.width - 4, 3);
    ctx.fillStyle = textColor;
    ctx.font = '6px sans-serif';
    ctx.fillText(aomOn ? "AOM" : "OFF", -6, 2);

    // On-canvas toggle button (shown when selected)
    if (isSelected) {
        ctx.save();
        ctx.translate(0, -el.height / 2 - 12);
        ctx.rotate(-el.rotation);
        const btnW = 20, btnH = 10;
        ctx.fillStyle = aomOn ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(-btnW / 2, -btnH / 2, btnW, btnH, 2);
        else ctx.rect(-btnW / 2, -btnH / 2, btnW, btnH);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'white';
        ctx.font = '6px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(aomOn ? 'ON' : 'OFF', 0, 0);
        ctx.restore();
    }
}

/**
 * Draw lens element
 */
function drawLens(el) {
    ctx.fillStyle = 'rgba(147, 197, 253, 0.3)';
    ctx.strokeStyle = 'rgba(147, 197, 253, 0.8)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, el.width / 2, el.height / 2, 0, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
}

/**
 * Draw blocker element
 */
function drawBlocker(el) {
    ctx.fillStyle = '#111';
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.fillRect(-el.width / 2, -el.height / 2, el.width, el.height);
    ctx.strokeRect(-el.width / 2, -el.height / 2, el.width, el.height);
    ctx.strokeStyle = '#333';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.stroke();
}

/**
 * Draw detector element
 */
function drawDetector(el) {
    ctx.fillStyle = '#222';
    ctx.strokeStyle = '#fca5a5';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, el.width / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fee2e2';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
}

/**
 * Draw glass element
 */
function drawGlass(el) {
    ctx.fillStyle = 'rgba(100, 200, 255, 0.3)';
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.6)';
    ctx.lineWidth = 0.5;
    ctx.fillRect(-el.width / 2, -el.height / 2, el.width, el.height);
    ctx.strokeRect(-el.width / 2, -el.height / 2, el.width, el.height);
}

/**
 * Draw fiber coupler element
 */
function drawFiberCoupler(el) {
    // Use gray for unpaired fiber couplers, otherwise use the assigned fiber color
    const fiberColor = el.pairedWith ? (el.fiberColor || '#ffa500') : '#6b7280';
    const hexToRgba = (hex, alpha) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };
    const fillColor = hexToRgba(fiberColor, 0.3);

    ctx.fillStyle = fillColor;
    ctx.strokeStyle = fiberColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, el.width / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = fiberColor;
    ctx.fillRect(el.width / 2 - 2, -3, 6, 6);

    ctx.beginPath();
    ctx.moveTo(el.width / 2 + 5, -4);
    ctx.lineTo(el.width / 2 + 10, 0);
    ctx.lineTo(el.width / 2 + 5, 4);
    ctx.strokeStyle = fiberColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(0, 0, el.width / 4, 0, Math.PI * 2);
    ctx.fill();

    if (el.pairedWith) {
        ctx.strokeStyle = fiberColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 2]);
        ctx.beginPath();
        ctx.arc(0, 0, el.width / 2 + 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
    }
}

/**
 * Draw amplifier element
 * Fiber input on left, direct laser output on right
 */
function drawAmplifier(el) {
    // Use gray for unconnected amplifier, otherwise use the assigned fiber color
    const fiberColor = el.pairedWith ? (el.fiberColor || '#ffa500') : '#6b7280';
    const hexToRgba = (hex, alpha) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };
    
    // Main body - dark rectangle
    ctx.fillStyle = '#1a1a2e';
    ctx.strokeStyle = '#4a4a6a';
    ctx.lineWidth = 2;
    ctx.fillRect(-el.width / 2, -el.height / 2, el.width, el.height);
    ctx.strokeRect(-el.width / 2, -el.height / 2, el.width, el.height);
    
    // Fiber input connector on left
    ctx.fillStyle = hexToRgba(fiberColor, 0.3);
    ctx.strokeStyle = fiberColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-el.width / 2, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Input pin (pointing left)
    ctx.fillStyle = fiberColor;
    ctx.fillRect(-el.width / 2 - 10, -3, 6, 6);
    
    // Input arrow (pointing into amplifier)
    ctx.beginPath();
    ctx.moveTo(-el.width / 2 - 11, -4);
    ctx.lineTo(-el.width / 2 - 16, 0);
    ctx.lineTo(-el.width / 2 - 11, 4);
    ctx.strokeStyle = fiberColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Connection indicator ring when paired
    if (el.pairedWith) {
        ctx.strokeStyle = fiberColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 2]);
        ctx.beginPath();
        ctx.arc(-el.width / 2, 0, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    
    // Gain medium indicator (glowing center)
    const gradient = ctx.createLinearGradient(-el.width / 4, 0, el.width / 4, 0);
    gradient.addColorStop(0, 'rgba(239, 68, 68, 0.1)');
    gradient.addColorStop(0.5, 'rgba(239, 68, 68, 0.4)');
    gradient.addColorStop(1, 'rgba(239, 68, 68, 0.1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(-el.width / 4, -el.height / 3, el.width / 2, el.height * 2 / 3);
    
    // "AMP" label
    ctx.fillStyle = '#9ca3af';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('AMP', 0, 3);
    
    // Direct laser output on right (red aperture)
    ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.fillRect(el.width / 2 - 4, -el.height / 4, 4, el.height / 2);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1;
    ctx.strokeRect(el.width / 2 - 4, -el.height / 4, 4, el.height / 2);
}

/**
 * Draw waveplate (HWP or QWP)
 */
function drawWaveplate(el, isSelected) {
    const color = el.type === 'hwp' ? 'rgba(74, 222, 128, 0.4)' : 'rgba(251, 146, 60, 0.4)';
    const border = el.type === 'hwp' ? '#4ade80' : '#fb923c';

    ctx.fillStyle = color;
    ctx.strokeStyle = border;
    ctx.lineWidth = 0.5;
    ctx.fillRect(-el.width / 2, -el.height / 2, el.width, el.height);
    ctx.strokeRect(-el.width / 2, -el.height / 2, el.width, el.height);

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.moveTo(0, -el.height / 2 + 2);
    ctx.lineTo(0, el.height / 2 - 2);
    ctx.stroke();

    ctx.save();
    ctx.translate(el.width + 2, 0);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = border;
    ctx.font = '10px sans-serif';
    const label = el.type === 'hwp' ? '\u03BB/2' : '\u03BB/4';
    ctx.fillText(label, -el.height / 2, 4);
    ctx.restore();

    // Direction indicator
    ctx.save();
    ctx.translate(el.width / 2 + 2, 0);
    ctx.fillStyle = 'rgba(250, 204, 21, 0.25)';
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(-3, -4);
    ctx.lineTo(3, 0);
    ctx.lineTo(-3, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fde68a';
    ctx.font = '6px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('IN', -3, 0);
    ctx.restore();

    // Waveplate axis knob
    ctx.save();
    ctx.translate(0, -el.height / 2 - WAVEPLATE_KNOB_OFFSET_MM);
    ctx.rotate(-el.rotation);
    const knobRadius = WAVEPLATE_KNOB_RADIUS_MM;
    ctx.beginPath();
    ctx.arc(0, 0, knobRadius, 0, Math.PI * 2);
    ctx.fillStyle = isAdjustingAxis && axisAdjustTarget === el ? '#1d4ed8' : '#111827';
    ctx.strokeStyle = isSelected ? '#bfdbfe' : '#475569';
    ctx.lineWidth = 0.6;
    ctx.fill();
    ctx.stroke();

    const axisAngle = getWaveplateAxisAngle(el);
    ctx.save();
    ctx.rotate(axisAngle);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(-knobRadius * 0.8, 0);
    ctx.lineTo(knobRadius * 0.8, 0);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#cbd5f5';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${formatAxisAngleDeg(axisAngle)}°`, 0, -knobRadius - 2);
    ctx.restore();
}

/**
 * Draw component interaction handles
 */
function drawComponentHandles(el, sc) {
    let handleDist = el.width / 2 + 15;
    if (el.type === 'mirror-d') handleDist = el.width + 15;
    let cx = 0;

    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(handleDist, 0);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1 / sc;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(handleDist, 0, 4 / sc, 0, Math.PI * 2);
    ctx.fillStyle = isRotating ? '#3b82f6' : 'white';
    ctx.fill();
    ctx.stroke();

    if (el.type === 'mirror-d') {
        const flipLocal = el.getFlipButtonPosition();
        ctx.beginPath();
        ctx.arc(flipLocal.x, flipLocal.y, 5 / sc, 0, Math.PI * 2);
        ctx.fillStyle = '#7e22ce';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1 / sc;
        ctx.stroke();
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${8 / sc}px sans-serif`;
        ctx.fillText('⇄', flipLocal.x, flipLocal.y);
    }

    if (lastHitOnSelected && lastHitOnSelected.el === el) {
        const snapLocal = el.getSnapButtonPosition();
        ctx.beginPath();
        ctx.arc(snapLocal.x, snapLocal.y, 5 / sc, 0, Math.PI * 2);
        ctx.fillStyle = '#3b82f6';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1 / sc;
        ctx.stroke();
        ctx.fillStyle = 'white';
        ctx.font = `${8 / sc}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('↻', snapLocal.x, snapLocal.y);
    }
}

/**
 * Draw board interaction handles
 */
function drawBoardHandles(el, sc) {
    const mh = el.getMoveHandlePosition();

    // Move Handle
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(mh.x, mh.y, 15, 15);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(mh.x + 7.5, mh.y + 3);
    ctx.lineTo(mh.x + 7.5, mh.y + 12);
    ctx.moveTo(mh.x + 3, mh.y + 7.5);
    ctx.lineTo(mh.x + 12, mh.y + 7.5);
    ctx.stroke();

    // Rotate Handle
    ctx.fillStyle = '#9333ea';
    ctx.fillRect(mh.x + 18, mh.y, 15, 15);
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '10px sans-serif';
    ctx.fillText('↻', mh.x + 18 + 7.5, mh.y + 7.5);

    // Resize Handle
    const rh = el.getResizeHandlePosition();
    ctx.beginPath();
    ctx.rect(rh.x - 5, rh.y - 5, 10, 10);
    ctx.fillStyle = isResizing ? '#f87171' : '#9ca3af';
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1 / sc;
    ctx.stroke();
}

/**
 * Calculate polarization ellipse orientation angle
 * @param {Array} stokes - Stokes vector
 * @returns {number} Angle in radians
 */
function getStokesAngle(stokes) {
    if (!stokes) return 0;
    return 0.5 * Math.atan2(stokes[2], stokes[1]);
}

/**
 * Draw light rays with polarization visualization
 * @param {Array} rays - Ray segments to draw
 */
function drawRays(rays) {
    ctx.lineCap = 'round';

    rays.forEach(seg => {
        const p1 = worldToScreen(seg.x1, seg.y1);
        const p2 = worldToScreen(seg.x2, seg.y2);

        // Draw main beam
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = seg.color.replace(')', ', 0.3)').replace('rgb', 'rgba');
        ctx.lineWidth = 3 * view.scale;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = seg.color;
        ctx.lineWidth = 1 * view.scale;
        ctx.stroke();

        // Draw Polarization Glyphs
        if (!seg.stokes) return;

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        const rayNormalAngle = angle - Math.PI / 2;

        const stokesAngle = getStokesAngle(seg.stokes);
        const isCircular = Math.abs(seg.stokes[3]) > (seg.stokes[0] * 0.1);

        const step = 40 * view.scale;
        for (let d = step; d < dist - step / 2; d += step) {
            const t = d / dist;
            const px = p1.x + dx * t;
            const py = p1.y + dy * t;

            ctx.save();
            ctx.translate(px, py);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.lineWidth = 1.5 * view.scale;

            if (isCircular) {
                const radius = 4 * view.scale;
                const arrowSize = 2.5 * view.scale;
                const isRightHanded = seg.stokes[3] > 0;

                ctx.beginPath();
                ctx.arc(0, 0, radius, -Math.PI / 2 + 0.4, -Math.PI / 2 - 0.4, false);
                ctx.stroke();

                ctx.beginPath();
                const ax = 0, ay = -radius;
                ctx.moveTo(ax, ay);
                if (isRightHanded) {
                    ctx.lineTo(ax - arrowSize, ay - arrowSize / 2);
                    ctx.moveTo(ax, ay);
                    ctx.lineTo(ax - arrowSize, ay + arrowSize / 2);
                } else {
                    ctx.lineTo(ax + arrowSize, ay - arrowSize / 2);
                    ctx.moveTo(ax, ay);
                    ctx.lineTo(ax + arrowSize, ay + arrowSize / 2);
                }
                ctx.stroke();
            } else {
                ctx.rotate(rayNormalAngle + stokesAngle);
                ctx.beginPath();
                const len = 5 * view.scale;
                ctx.moveTo(-len, 0);
                ctx.lineTo(len, 0);
                ctx.stroke();
            }

            ctx.restore();
        }
    });
}

/**
 * Draw lens focal point indicators
 */
function drawLensFocusDots() {
    const selectedLenses = elements.filter(el => el.type === 'lens' && selection.has(el));
    if (!selectedLenses.length) return;

    ctx.save();
    ctx.fillStyle = '#fbbf24';
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 1;

    selectedLenses.forEach(lens => {
        ensureLensOptics(lens);
        const axis = getLensAxisVector(lens);
        const focal = Math.max(GRID_PITCH_MM * 0.1, lens.optics.focalLength || GRID_PITCH_MM);
        const points = [
            { x: lens.x + axis.x * focal, y: lens.y + axis.y * focal },
            { x: lens.x - axis.x * focal, y: lens.y - axis.y * focal }
        ];
        points.forEach(pt => {
            const s = worldToScreen(pt.x, pt.y);
            ctx.beginPath();
            ctx.arc(s.x, s.y, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        });
    });

    ctx.restore();
}

/**
 * Draw selection marquee rectangle
 */
function drawMarquee() {
    if (!isSelecting || !selectionRect) return;

    ctx.save();
    ctx.strokeStyle = '#3b82f6';
    ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
    ctx.lineWidth = 1;
    ctx.fillRect(selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h);
    ctx.strokeRect(selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h);
    ctx.restore();
}

/**
 * Draw UI hints for selected element
 */
function drawHints() {
    if (selection.size !== 1) return;

    const el = Array.from(selection)[0];
    if (el.type === 'board' || el.locked) return;

    const hints = [];
    hints.push("R/T: Rotation | S: Smart");

    if (hasCycleOptions && ['mirror', 'mirror-d'].includes(el.type)) {
        hints.push("Q: Cycle Target");
    }

    if (hints.length === 0) return;

    const pos = worldToScreen(el.x, el.y - el.height / 2 - 10);

    ctx.save();
    ctx.translate(pos.x, pos.y);

    ctx.font = "10px sans-serif";
    let maxW = 0;
    hints.forEach(hint => {
        const metrics = ctx.measureText(hint);
        maxW = Math.max(maxW, metrics.width);
    });

    const w = maxW + 12;
    const h = hints.length * 16 + 4;
    const startY = -h / 2 + 8;

    ctx.fillStyle = "rgba(31, 41, 55, 0.9)";
    ctx.strokeStyle = "rgba(75, 85, 99, 1)";
    ctx.lineWidth = 1;

    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(-w / 2, -h / 2, w, h, 4);
    } else {
        ctx.rect(-w / 2, -h / 2, w, h);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#fbbf24";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    hints.forEach((hint, idx) => {
        ctx.fillText(hint, 0, startY + idx * 16);
    });

    ctx.restore();
}

/**
 * Draw fiber cables between paired couplers
 */
function drawFiberCables() {
    // Include both fiber couplers and amplifiers with fiber connections
    const fiberElements = elements.filter(el => 
        (el.type === 'fiber-coupler' || el.type === 'amplifier') && el.pairedWith
    );
    const drawnPairs = new Set();

    fiberElements.forEach(coupler => {
        if (!coupler.pairedWith) return;
        const pairKey = [coupler.id, coupler.pairedWith].sort().join('-');
        if (drawnPairs.has(pairKey)) return;
        drawnPairs.add(pairKey);

        const paired = elements.find(el => el.id === coupler.pairedWith);
        if (!paired) return;

        const fiberColor = coupler.fiberColor || '#ffa500';
        const p1 = worldToScreen(coupler.x, coupler.y);
        const p2 = worldToScreen(paired.x, paired.y);

        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const curveOffset = Math.min(dist * 0.3, 100);
        const perpX = -dy / dist;
        const perpY = dx / dist;
        const cpX = midX + perpX * curveOffset;
        const cpY = midY + perpY * curveOffset;

        ctx.save();
        ctx.strokeStyle = fiberColor;
        ctx.lineWidth = 4 * view.scale;
        ctx.setLineDash([8 * view.scale, 4 * view.scale]);
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.quadraticCurveTo(cpX, cpY, p2.x, p2.y);
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.strokeStyle = fiberColor;
        ctx.lineWidth = 2.5 * view.scale;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.quadraticCurveTo(cpX, cpY, p2.x, p2.y);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1 * view.scale;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.quadraticCurveTo(cpX, cpY, p2.x, p2.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    });
}

/**
 * Draw fiber connection preview line
 */
// Animation frame ID for fiber connecting mode
let fiberConnectAnimationId = null;

function drawFiberConnectingLine() {
    if (!isFiberConnecting || !fiberConnectSource) {
        // Stop animation if not in connecting mode
        if (fiberConnectAnimationId) {
            cancelAnimationFrame(fiberConnectAnimationId);
            fiberConnectAnimationId = null;
        }
        return;
    }

    const sourceIsAmplifier = fiberConnectSource.type === 'amplifier';
    
    // Helper to draw pin highlight
    const drawPinHighlight = (pinScreen) => {
        ctx.save();
        const pulseScale = 1 + 0.15 * Math.sin(Date.now() / 150);
        const radius = 12 * view.scale * PIXELS_PER_MM * pulseScale;
        
        // Outer glow
        ctx.beginPath();
        ctx.arc(pinScreen.x, pinScreen.y, radius + 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(34, 211, 238, 0.2)';
        ctx.fill();
        
        // Inner highlight ring
        ctx.beginPath();
        ctx.arc(pinScreen.x, pinScreen.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    };

    // Highlight fiber coupler pins (always available)
    const otherCouplers = elements.filter(el => el.type === 'fiber-coupler' && el !== fiberConnectSource);
    otherCouplers.forEach(fc => {
        const localPos = { x: fc.width / 2 + 4, y: 0 };
        const rotated = rotatePoint(localPos, fc.rotation);
        const pinWorld = { x: fc.x + rotated.x, y: fc.y + rotated.y };
        const pinScreen = worldToScreen(pinWorld.x, pinWorld.y);
        drawPinHighlight(pinScreen);
    });
    
    // Highlight amplifier input pins (only if source is a fiber coupler, not another amplifier)
    if (!sourceIsAmplifier) {
        const amplifiers = elements.filter(el => el.type === 'amplifier' && el !== fiberConnectSource);
        amplifiers.forEach(amp => {
            // Input pin is on the left side
            const localPos = { x: -amp.width / 2 - 7, y: 0 };
            const rotated = rotatePoint(localPos, amp.rotation);
            const pinWorld = { x: amp.x + rotated.x, y: amp.y + rotated.y };
            const pinScreen = worldToScreen(pinWorld.x, pinWorld.y);
            drawPinHighlight(pinScreen);
        });
    }

    // Draw connecting line if mouse position is available
    if (fiberConnectMousePos) {
        const p1 = worldToScreen(fiberConnectSource.x, fiberConnectSource.y);
        const p2 = fiberConnectMousePos;

        ctx.save();
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    // Show instruction text near source
    const sourceScreen = worldToScreen(fiberConnectSource.x, fiberConnectSource.y);
    ctx.save();
    ctx.fillStyle = 'rgba(34, 211, 238, 0.9)';
    ctx.font = '12px sans-serif';
    ctx.fillText('Click another pin to connect', sourceScreen.x + 20, sourceScreen.y - 20);
    ctx.restore();
    
    // Continue animation while in connecting mode
    fiberConnectAnimationId = requestAnimationFrame(() => draw());
}

/**
 * Main draw function - renders the entire scene
 */
function draw() {
    drawGrid();
    drawFiberCables();
    elements.forEach(el => { if (el.type === 'board') drawElement(el); });
    elements.forEach(el => { if (el.type !== 'board' && !selection.has(el)) drawElement(el); });
    elements.forEach(el => { if (el.type !== 'board' && selection.has(el)) drawElement(el); });
    const rays = castRays();
    drawRays(rays);
    drawLensFocusDots();
    drawMarquee();
    drawFiberConnectingLine();
    drawHints();
}


