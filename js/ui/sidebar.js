/**
 * OptiLab - Sidebar Interactions
 * Component drag-and-drop from sidebar
 */

/**
 * Start dragging a component from sidebar
 * @param {Event} e - Mouse event
 * @param {string} type - Component type
 */
function startSidebarDrag(e, type) {
    e.preventDefault();
    saveToHistory();
    const r = canvas.getBoundingClientRect();
    const p = screenToWorld(e.clientX - r.left, e.clientY - r.top);
    let nx = p.x;
    let ny = p.y;

    // Board-Relative Snapping
    if (!shiftPressed && !ctrlPressed) {
        const board = elements.find(el => el.type === 'board' &&
            nx >= el.x - el.width / 2 && nx <= el.x + el.width / 2 &&
            ny >= el.y - el.height / 2 && ny <= el.y + el.height / 2);
        if (board) {
            const snap = getClosestGridPoint({ x: nx, y: ny }, board);
            nx = snap.x;
            ny = snap.y;
        } else {
            // Global Fallback
            nx = Math.round((nx - 12.5) / GRID_PITCH_MM) * GRID_PITCH_MM + 12.5;
            ny = Math.round((ny - 12.5) / GRID_PITCH_MM) * GRID_PITCH_MM + 12.5;
        }
    }

    const el = new Element(type, nx, ny);
    elements.push(el);
    selection.clear();
    selection.add(el);
    isDragging = true;
    dragOffsets.clear();
    dragOffsets.set(el, { dx: 0, dy: 0 });
    updateUI();
    draw();
}

/**
 * Allow drop on canvas (drag-over handler)
 * @param {Event} e - Drag event
 */
function allowDrop(e) {
    e.preventDefault();
}

/**
 * Handle drop on canvas
 * @param {Event} e - Drop event
 */
function handleDrop(e) {
    e.preventDefault();
}

/**
 * Copy selected elements to clipboard
 */
function copySelected() {
    if (selection.size === 0) return;

    // Expand: if a board is selected, include all its children
    const expandedSet = new Set(selection);
    selection.forEach(el => {
        if (el.type === 'board') {
            elements.forEach(child => {
                if (child.type !== 'board' && getParentBoard(child) === el) {
                    expandedSet.add(child);
                }
            });
        }
    });

    clipboard = Array.from(expandedSet).map(el => {
        const data = {
            type: el.type,
            x: el.x,
            y: el.y,
            width: el.width,
            height: el.height,
            rotation: el.rotation,
            title: el.title || '',
            isFlipped: el.isFlipped || false,
            locked: el.locked || false,
            imgConfig: el.imgConfig || null
        };

        if (isWaveplateElement(el) && typeof el.axisAngle === 'number') {
            data.axisAngle = el.axisAngle;
        }
        if (el.type === 'aom' && typeof el.aomEnabled === 'boolean') {
            data.aomEnabled = el.aomEnabled;
        }
        if (el.type === 'lens' && el.optics) {
            data.optics = { focalLength: el.optics.focalLength };
        }
        if (el.type === 'laser') {
            if (typeof el.polAngle === 'number') data.polAngle = el.polAngle;
            if (el.beamColor) data.beamColor = el.beamColor;
            if (typeof el.beamThickness === 'number') data.beamThickness = el.beamThickness;
        }
        if (el.type === 'filter' && Array.isArray(el.blockedLasers)) {
            data.blockedLasers = el.blockedLasers;
        }
        if (el.type === 'cell' && typeof el.cellAngle === 'number') {
            data.cellAngle = el.cellAngle;
        }
        if (el.type === 'custom') {
            data.customShape = el.customShape;
            data.customColor = el.customColor;
            data.customBorderColor = el.customBorderColor;
            data.customText = el.customText;
            data.customTextColor = el.customTextColor;
            data.customFontSize = el.customFontSize;
            data.customFontBold = el.customFontBold;
            if (typeof el.customOpacity === 'number') data.customOpacity = el.customOpacity;
        }

        return data;
    });
}

/**
 * Paste elements from clipboard
 */
function pasteElements() {
    if (!clipboard || clipboard.length === 0) return;

    saveToHistory();
    let centerX = 0, centerY = 0;
    clipboard.forEach(data => {
        centerX += data.x;
        centerY += data.y;
    });
    centerX /= clipboard.length;
    centerY /= clipboard.length;

    const mouseWorld = lastMousePos.x > 0 && lastMousePos.y > 0
        ? screenToWorld(lastMousePos.x, lastMousePos.y)
        : screenToWorld(canvas.width / 2, canvas.height / 2);

    const pasteX = mouseWorld.x;
    const pasteY = mouseWorld.y;

    selection.clear();
    const pastedElements = [];
    const relativeOffsets = [];

    clipboard.forEach(data => {
        const relX = data.x - centerX;
        const relY = data.y - centerY;
        relativeOffsets.push({ x: relX, y: relY });

        const el = new Element(data.type, pasteX + relX, pasteY + relY, data.width, data.height, data.title);
        el.id = Date.now() + Math.random();
        el.rotation = data.rotation;
        el.isFlipped = data.isFlipped || false;
        el.locked = data.locked || false;
        if (data.imgConfig) el.imgConfig = data.imgConfig;

        if (isWaveplateElement(el) && typeof data.axisAngle === 'number') {
            el.axisAngle = data.axisAngle;
        }
        if (el.type === 'aom' && typeof data.aomEnabled === 'boolean') {
            el.aomEnabled = data.aomEnabled;
        }
        if (el.type === 'lens' && data.optics) {
            el.optics = { focalLength: data.optics.focalLength };
        }
        if (el.type === 'laser') {
            if (typeof data.polAngle === 'number') el.polAngle = data.polAngle;
            if (data.beamColor) el.beamColor = data.beamColor;
            if (typeof data.beamThickness === 'number') el.beamThickness = data.beamThickness;
        }
        if (el.type === 'filter' && Array.isArray(data.blockedLasers)) {
            el.blockedLasers = data.blockedLasers;
        }
        if (el.type === 'cell' && typeof data.cellAngle === 'number') {
            el.cellAngle = data.cellAngle;
        }
        if (el.type === 'custom') {
            if (data.customShape) el.customShape = data.customShape;
            if (data.customColor) el.customColor = data.customColor;
            if (data.customBorderColor) el.customBorderColor = data.customBorderColor;
            el.customText = data.customText || '';
            if (data.customTextColor) el.customTextColor = data.customTextColor;
            if (typeof data.customFontSize === 'number') el.customFontSize = data.customFontSize;
            if (typeof data.customFontBold === 'boolean') el.customFontBold = data.customFontBold;
            if (typeof data.customOpacity === 'number') el.customOpacity = data.customOpacity;
            el.width = data.width;
            el.height = data.height;
        }

        elements.push(el);
        pastedElements.push(el);
    });

    pastedElements.forEach(el => selection.add(el));

    isDragging = true;
    dragOffsets.clear();

    pastedElements.forEach((el, idx) => {
        const rel = relativeOffsets[idx];
        dragOffsets.set(el, {
            dx: el.x - pasteX,
            dy: el.y - pasteY
        });
    });

    updateUI();
    draw();
}

// ── Custom Component Library UI ───────────────────────────────────────────────

/**
 * Draw a mini preview of a custom component template onto a canvas context
 */
function drawCustomPreview(pctx, template) {
    const cw = 32, ch = 32;
    const w = cw - 6;
    const h = ch - 6;
    const shape = template.customShape || 'rectangle';

    pctx.save();
    pctx.translate(cw / 2, ch / 2);
    pctx.fillStyle = template.customColor || '#3b82f6';
    pctx.strokeStyle = template.customBorderColor || '#93c5fd';
    pctx.lineWidth = 1.5;

    pctx.beginPath();
    if (shape === 'circle') {
        pctx.arc(0, 0, Math.min(w, h) / 2, 0, Math.PI * 2);
    } else if (shape === 'triangle') {
        pctx.moveTo(0, -h / 2);
        pctx.lineTo(w / 2, h / 2);
        pctx.lineTo(-w / 2, h / 2);
        pctx.closePath();
    } else if (shape === 'diamond') {
        pctx.moveTo(0, -h / 2);
        pctx.lineTo(w / 2, 0);
        pctx.lineTo(0, h / 2);
        pctx.lineTo(-w / 2, 0);
        pctx.closePath();
    } else {
        pctx.rect(-w / 2, -h / 2, w, h);
    }
    pctx.fill();
    pctx.stroke();

    const text = template.customText || '';
    if (text) {
        const bold = template.customFontBold ? 'bold ' : '';
        const fs = Math.min(template.customFontSize || 10, 9);
        pctx.fillStyle = template.customTextColor || '#ffffff';
        pctx.font = `${bold}${fs}px sans-serif`;
        pctx.textAlign = 'center';
        pctx.textBaseline = 'middle';
        pctx.fillText(text.substring(0, 5), 0, 0);
    }
    pctx.restore();
}

/**
 * Render the custom component library grid in the sidebar
 */
function renderCustomLibrary() {
    const container = document.getElementById('custom-components-list');
    if (!container) return;
    container.innerHTML = '';

    if (customComponentLibrary.length === 0) {
        const empty = document.createElement('p');
        empty.className = "text-[9px] text-gray-500 text-center py-2";
        empty.innerText = "No saved components yet. Create a Custom component and click 'Save to Library'.";
        container.appendChild(empty);
        return;
    }

    const grid = document.createElement('div');
    grid.className = "grid grid-cols-3 gap-1.5";

    customComponentLibrary.forEach(template => {
        const item = document.createElement('div');
        item.className = "tool-item flex flex-col items-center p-1.5 bg-gray-800/50 rounded-lg border border-gray-700/50 text-[9px] hover:border-blue-500/50 cursor-grab";
        item.style.position = 'relative';

        const previewCanvas = document.createElement('canvas');
        previewCanvas.width = 32;
        previewCanvas.height = 32;
        drawCustomPreview(previewCanvas.getContext('2d'), template);
        item.appendChild(previewCanvas);

        const nameSpan = document.createElement('span');
        nameSpan.className = "mt-0.5 text-gray-300 w-full text-center";
        nameSpan.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:58px;';
        nameSpan.innerText = template.name || 'Custom';
        item.appendChild(nameSpan);

        const delBtn = document.createElement('button');
        delBtn.innerText = '×';
        delBtn.title = 'Delete from library';
        delBtn.style.cssText = 'position:absolute;top:2px;right:2px;width:14px;height:14px;background:rgba(185,28,28,0.85);border-radius:3px;font-size:13px;line-height:1;color:white;display:flex;align-items:center;justify-content:center;cursor:pointer;opacity:0;transition:opacity 0.15s;border:none;padding:0;';
        delBtn.onmousedown = e => { e.stopPropagation(); deleteCustomComponent(template.id); };
        item.appendChild(delBtn);

        item.addEventListener('mouseenter', () => { delBtn.style.opacity = '1'; });
        item.addEventListener('mouseleave', () => { delBtn.style.opacity = '0'; });
        item.onmousedown = e => { if (e.target !== delBtn) startCustomComponentDrag(e, template); };

        grid.appendChild(item);
    });

    container.appendChild(grid);
}

/**
 * Drag a saved custom component template onto the canvas
 */
function startCustomComponentDrag(e, template) {
    e.preventDefault();
    saveToHistory();
    const r = canvas.getBoundingClientRect();
    const p = screenToWorld(e.clientX - r.left, e.clientY - r.top);
    let nx = p.x;
    let ny = p.y;

    if (!shiftPressed && !ctrlPressed) {
        const board = elements.find(el => el.type === 'board' &&
            nx >= el.x - el.width / 2 && nx <= el.x + el.width / 2 &&
            ny >= el.y - el.height / 2 && ny <= el.y + el.height / 2);
        if (board) {
            const snap = getClosestGridPoint({ x: nx, y: ny }, board);
            nx = snap.x;
            ny = snap.y;
        } else {
            nx = Math.round((nx - 12.5) / GRID_PITCH_MM) * GRID_PITCH_MM + 12.5;
            ny = Math.round((ny - 12.5) / GRID_PITCH_MM) * GRID_PITCH_MM + 12.5;
        }
    }

    const el = new Element('custom', nx, ny, template.width || 30, template.height || 30, template.name || '');
    el.width = template.width || 30;
    el.height = template.height || 30;
    el.customShape = template.customShape || 'rectangle';
    el.customColor = template.customColor || '#3b82f6';
    el.customBorderColor = template.customBorderColor || '#93c5fd';
    el.customText = template.customText || '';
    el.customTextColor = template.customTextColor || '#ffffff';
    el.customFontSize = template.customFontSize || 10;
    el.customFontBold = !!template.customFontBold;
    el.customOpacity = template.customOpacity ?? 1;

    elements.push(el);
    selection.clear();
    selection.add(el);
    isDragging = true;
    dragOffsets.clear();
    dragOffsets.set(el, { dx: 0, dy: 0 });
    updateUI();
    draw();
}


