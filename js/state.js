/**
 * OptiLab - State Management
 * Save, load, export, and import functions
 */

/**
 * Save current state to undo history
 * Call this before making changes that should be undoable
 * No-ops when the scene is identical to the last snapshot, so
 * focus/press events on controls never create empty undo steps.
 */
let lastSavePushed = false;

function saveToHistory() {
    if (isUndoRedoAction) return;

    const json = JSON.stringify(elements);
    if (undoHistory.length > 0 && undoHistory[undoHistory.length - 1] === json) {
        lastSavePushed = false;
        return;
    }
    lastSavePushed = true;

    undoHistory.push(json);

    // Limit history size
    if (undoHistory.length > MAX_HISTORY_SIZE) {
        undoHistory.shift();
    }

    // Clear redo history when new action is performed
    redoHistory = [];
}

/**
 * Undo the last action
 */
function undo() {
    if (undoHistory.length === 0) return;

    isUndoRedoAction = true;

    // Save current state to redo history
    redoHistory.push(JSON.stringify(elements));

    // Restore previous state
    const previousState = JSON.parse(undoHistory.pop());
    elements = previousState.map(d => rehydrateElement(d));

    // Clear selection (selected elements may no longer exist)
    selection.clear();

    isUndoRedoAction = false;
    updateUI();
    draw();
}

/**
 * Redo the last undone action
 */
function redo() {
    if (redoHistory.length === 0) return;

    isUndoRedoAction = true;

    // Save current state to undo history
    undoHistory.push(JSON.stringify(elements));

    // Restore redo state
    const nextState = JSON.parse(redoHistory.pop());
    elements = nextState.map(d => rehydrateElement(d));

    // Clear selection
    selection.clear();

    isUndoRedoAction = false;
    updateUI();
    draw();
}

/**
 * Rehydrate an element from saved data
 * @param {Object} data - Serialized element data
 * @returns {Element} Reconstructed element
 */
function rehydrateElement(data) {
    const el = new Element(data.type, data.x, data.y, data.width, data.height, data.title);
    el.id = data.id;
    el.rotation = data.rotation;
    el.width = data.width;
    el.height = data.height;
    el.isFlipped = data.isFlipped || false;
    el.locked = data.locked || false;
    if (typeof data.isFuturePlan === 'boolean') el.isFuturePlan = data.isFuturePlan;

    if (typeof data.axisAngle === 'number') {
        el.axisAngle = clampWaveplateAngle(data.axisAngle);
    } else if (isWaveplateElement(el)) {
        el.axisAngle = clampWaveplateAngle(el.rotation || toRad(45));
    }

    if (data.optics) {
        el.optics = data.optics;
    } else if (el.type === 'lens') {
        ensureLensOptics(el);
    }

    if (el.type === 'aom' && typeof data.aomEnabled === 'boolean') {
        el.aomEnabled = data.aomEnabled;
    }

    // Fiber coupler pairing and color
    if (el.type === 'fiber-coupler') {
        if (data.pairedWith) el.pairedWith = data.pairedWith;
        if (data.fiberColor) el.fiberColor = data.fiberColor;
    }

    // Amplifier pairing, color, and gain
    if (el.type === 'amplifier') {
        if (data.pairedWith) el.pairedWith = data.pairedWith;
        if (data.fiberColor) el.fiberColor = data.fiberColor;
        if (typeof data.gain === 'number') el.gain = data.gain;
    }

    // Filter blocked lasers
    if (el.type === 'filter' && Array.isArray(data.blockedLasers)) {
        el.blockedLasers = data.blockedLasers;
    }

    // Iris aperture
    if (el.type === 'iris' && typeof data.aperture === 'number') {
        el.aperture = data.aperture;
    }

    // Laser polarization, color, and thickness
    if (el.type === 'laser') {
        if (typeof data.polAngle === 'number') el.polAngle = data.polAngle;
        if (data.beamColor) el.beamColor = data.beamColor;
        if (typeof data.beamThickness === 'number') el.beamThickness = data.beamThickness;
    }

    if (data.imgConfig) {
        el.imgConfig = data.imgConfig;
    }

    // Cell polarization rotation angle
    if (el.type === 'cell' && typeof data.cellAngle === 'number') {
        el.cellAngle = data.cellAngle;
    }

    // Custom component properties
    if (el.type === 'custom') {
        if (data.customShape) el.customShape = data.customShape;
        if (data.customColor) el.customColor = data.customColor;
        if (data.customBorderColor) el.customBorderColor = data.customBorderColor;
        if (typeof data.customText === 'string') el.customText = data.customText;
        if (data.customTextColor) el.customTextColor = data.customTextColor;
        if (typeof data.customFontSize === 'number') el.customFontSize = data.customFontSize;
        if (typeof data.customFontBold === 'boolean') el.customFontBold = data.customFontBold;
        el.customNoBorder = data.customNoBorder || false;
        if (typeof data.customOpacity === 'number') el.customOpacity = data.customOpacity;
        if (typeof data.customBehavior === 'string') el.customBehavior = data.customBehavior;
        if (typeof data.customTransmission === 'number') el.customTransmission = data.customTransmission;
        if (typeof data.customPolAngle === 'number') el.customPolAngle = data.customPolAngle;
    }

    // Restore board reference image from its saved data URL
    if (typeof data.imgSrc === 'string' && data.imgSrc) {
        el.imgSrc = data.imgSrc;
        const img = new Image();
        img.onload = () => { el.imgData = img; draw(); };
        img.src = data.imgSrc;
    }

    return el;
}

/**
 * Save current state to localStorage
 */
function saveState() {
    let message = 'Saved';
    let isError = false;
    try {
        localStorage.setItem('opticalBenchState', JSON.stringify(elements));
    } catch (e) {
        message = 'Save failed (storage full?)';
        isError = true;
    }
    showToast(message, isError);
}

/**
 * Show a brief toast notification at the bottom of the screen
 * @param {string} message - Text to display
 * @param {boolean} isError - Use error styling
 */
function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.textContent = message;
    const color = isError ? '#fca5a5' : '#94a3b8';
    const border = isError ? '#7f1d1d' : '#334155';
    toast.style.cssText = `position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#1e293b;color:${color};border:1px solid ${border};padding:6px 16px;border-radius:6px;font-size:12px;z-index:9999;pointer-events:none;transition:opacity 0.5s`;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 500); }, 1400);
}

/**
 * Load state from localStorage
 */
function loadState() {
    const data = localStorage.getItem('opticalBenchState');
    if (data) {
        try {
            const parsed = JSON.parse(data);
            if (!Array.isArray(parsed)) throw new Error('bad state');
            saveToHistory();
            elements = parsed.map(d => rehydrateElement(d));
            selection.clear();
            updateUI();
            draw();
        } catch (e) {
            showToast('Saved state is corrupted', true);
        }
    } else {
        showToast('No saved state found', true);
    }
}

/**
 * Export state to JSON file
 */
function exportState() {
    const data = JSON.stringify(elements);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'optical-bench-state.json';
    a.click();
}

/**
 * Import state from JSON file
 * @param {HTMLInputElement} input - File input element
 */
function importState(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!Array.isArray(data)) throw new Error('bad file');
            saveToHistory();
            elements = data.map(d => rehydrateElement(d));
            selection.clear();
            updateUI();
            draw();
        } catch (err) {
            showToast('Error importing file', true);
        }
    };
    reader.readAsText(file);
    input.value = '';
}

// ── Custom Component Library ──────────────────────────────────────────────────

function loadCustomLibrary() {
    try {
        const data = localStorage.getItem('customComponentLibrary');
        if (data) customComponentLibrary = JSON.parse(data);
    } catch (e) {
        customComponentLibrary = [];
    }
}

function saveCustomLibrary() {
    localStorage.setItem('customComponentLibrary', JSON.stringify(customComponentLibrary));
}

function saveCustomComponentToLibrary(el) {
    const template = {
        id: Date.now() + Math.random(),
        name: el.title || 'Custom',
        width: el.width,
        height: el.height,
        customShape: el.customShape || 'rectangle',
        customColor: el.customColor || '#3b82f6',
        customBorderColor: el.customBorderColor || '#93c5fd',
        customText: el.customText || '',
        customTextColor: el.customTextColor || '#ffffff',
        customFontSize: el.customFontSize || 10,
        customFontBold: !!el.customFontBold,
        customNoBorder: !!el.customNoBorder,
        customOpacity: el.customOpacity ?? 1,
        customBehavior: el.customBehavior || 'none',
        customTransmission: el.customTransmission ?? 0.5,
        customPolAngle: el.customPolAngle ?? 0
    };
    customComponentLibrary.push(template);
    saveCustomLibrary();
    renderCustomLibrary();
    showToast(`"${template.name}" saved to library`);
}

function deleteCustomComponent(id) {
    customComponentLibrary = customComponentLibrary.filter(c => c.id !== id);
    saveCustomLibrary();
    renderCustomLibrary();
}

function downloadCustomLibrary() {
    const data = JSON.stringify(customComponentLibrary, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'custom-components.json';
    a.click();
    URL.revokeObjectURL(url);
}

function uploadCustomLibrary(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const data = JSON.parse(e.target.result);
            if (Array.isArray(data)) {
                customComponentLibrary = data.filter(t => t && typeof t === 'object');
                saveCustomLibrary();
                renderCustomLibrary();
                showToast('Custom component library imported');
            } else {
                showToast('Invalid custom components file', true);
            }
        } catch (err) {
            showToast('Error reading custom components file', true);
        }
    };
    reader.readAsText(file);
    input.value = '';
}


