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

    clipboard = Array.from(selection).map(el => {
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
        if (el.type === 'laser' && typeof el.polAngle === 'number') {
            data.polAngle = el.polAngle;
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
        if (el.type === 'laser' && typeof data.polAngle === 'number') {
            el.polAngle = data.polAngle;
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


