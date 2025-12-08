/**
 * OptiLab - Main Application
 * Initialization and main entry point
 */

/**
 * Initialize the application
 */
function init() {
    // Get DOM references
    canvas = document.getElementById('opticalBench');
    ctx = canvas.getContext('2d');
    container = document.getElementById('canvas-container');
    rotationSlider = document.getElementById('rotationSlider');
    rotationValueDisplay = document.getElementById('rotationValue');
    debugInfo = document.getElementById('debug-info');
    mouseCoordsDisplay = document.getElementById('mouse-coords');
    calibrationMsg = document.getElementById('calibration-msg');
    imgUploadInput = document.getElementById('imgUpload');

    // Set canvas size
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    // Initialize input handlers
    initInputHandlers();

    // Set up initial view
    updateTableSize();
    resetView();

    // Create default board
    const center = screenToWorld(canvas.width / 2, canvas.height / 2);
    const nx = Math.round((center.x - HALF_GRID_MM) / GRID_PITCH_MM) * GRID_PITCH_MM + HALF_GRID_MM;
    const ny = Math.round((center.y - HALF_GRID_MM) / GRID_PITCH_MM) * GRID_PITCH_MM + HALF_GRID_MM;
    const b = new Element('board', nx, ny, 330, 482.6, 'Main Board');
    elements.push(b);

    // Initial draw
    draw();
}

/**
 * Expose functions to window for HTML onclick handlers
 */
function exposeGlobalFunctions() {
    window.toggleBoardLock = toggleBoardLock;
    window.rotateBoard = rotateBoard;
    window.triggerImageUpload = triggerImageUpload;
    window.handleImageUpload = handleImageUpload;
    window.toggleImage = toggleImage;
    window.removeImage = removeImage;
    window.updateOpacity = updateOpacity;
    window.startCalibration = startCalibration;
    window.updateTableSize = updateTableSize;
    window.addBoard = addBoard;
    window.updateBoardInputs = updateBoardInputs;
    window.deleteSelected = deleteSelected;
    window.clearAll = clearAll;
    window.resetView = resetView;
    window.copySelected = copySelected;
    window.pasteElements = pasteElements;
    window.startSidebarDrag = startSidebarDrag;
    window.allowDrop = allowDrop;
    window.handleDrop = handleDrop;
    window.rehydrateElement = rehydrateElement;
    window.saveState = saveState;
    window.loadState = loadState;
    window.exportState = exportState;
    window.importState = importState;
    window.updateUI = updateUI;
    window.tryAutoAlign = tryAutoAlign;
    window.cycleSnapRotation = cycleSnapRotation;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    exposeGlobalFunctions();
    init();
});

// Also run immediately if DOM is already loaded (for script defer)
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    exposeGlobalFunctions();
    init();
}


