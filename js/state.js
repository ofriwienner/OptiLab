/**
 * OptiLab - State Management
 * Save, load, export, and import functions
 */

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

    // Laser polarization
    if (el.type === 'laser' && typeof data.polAngle === 'number') {
        el.polAngle = data.polAngle;
    }

    if (data.imgConfig) {
        el.imgConfig = data.imgConfig;
    }

    return el;
}

/**
 * Save current state to localStorage
 */
function saveState() {
    const data = JSON.stringify(elements);
    localStorage.setItem('opticalBenchState', data);
    alert('Saved to local storage');
}

/**
 * Load state from localStorage
 */
function loadState() {
    const data = localStorage.getItem('opticalBenchState');
    if (data) {
        const parsed = JSON.parse(data);
        elements = parsed.map(d => rehydrateElement(d));
        draw();
    } else {
        alert('No saved state found');
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
            elements = data.map(d => rehydrateElement(d));
            draw();
        } catch (err) {
            alert('Error importing file');
        }
    };
    reader.readAsText(file);
}


