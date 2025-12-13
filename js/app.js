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
    const boardW = 325;
    const boardH = 475;
    // Snap board center so edges are between grid points (at multiples of GRID_PITCH_MM)
    // Grid points are at 12.5, 37.5, 62.5... so edges should be at 0, 25, 50, 75...
    const leftEdge = center.x - boardW / 2;
    const snappedLeft = Math.round(leftEdge / GRID_PITCH_MM) * GRID_PITCH_MM;
    const nx = snappedLeft + boardW / 2;
    
    const topEdge = center.y - boardH / 2;
    const snappedTop = Math.round(topEdge / GRID_PITCH_MM) * GRID_PITCH_MM;
    const ny = snappedTop + boardH / 2;
    
    const b = new Element('board', nx, ny, boardW, boardH, 'Main Board');
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
    window.undo = undo;
    window.redo = redo;
    window.saveToHistory = saveToHistory;
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


