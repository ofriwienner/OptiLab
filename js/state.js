/**
 * OptiLab - State Management
 * Save, load, export, and import functions
 */

/**
 * Deep clone elements array for history
 * @returns {Array} Deep cloned elements array
 */
function cloneElements() {
    return JSON.parse(JSON.stringify(elements));
}

/**
 * Save current state to undo history
 * Call this before making changes that should be undoable
 */
function saveToHistory() {
    if (isUndoRedoAction) return;
    
    const snapshot = cloneElements();
    undoHistory.push(snapshot);
    
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
    redoHistory.push(cloneElements());
    
    // Restore previous state
    const previousState = undoHistory.pop();
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
    undoHistory.push(cloneElements());
    
    // Restore redo state
    const nextState = redoHistory.pop();
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

/**
 * Capture full table image (zoomed out to fit entire table) at high resolution
 * @returns {Promise<string>} Base64 PNG data URL
 */
async function captureFullTableImage() {
    // Save current view state
    const savedView = {
        x: view.x,
        y: view.y,
        scale: view.scale
    };

    // Calculate target resolution based on table size
    // Aim for high resolution: at least 2 pixels per mm for good quality
    const targetPixelsPerMM = 2.0;
    const tableWidthPx = tableConfig.widthMM * targetPixelsPerMM;
    const tableHeightPx = tableConfig.heightMM * targetPixelsPerMM;
    
    // Add padding (5% on each side)
    const padding = 0.05;
    const captureWidth = Math.ceil(tableWidthPx * (1 + 2 * padding));
    const captureHeight = Math.ceil(tableHeightPx * (1 + 2 * padding));
    
    // Create high-resolution offscreen canvas
    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = captureWidth;
    captureCanvas.height = captureHeight;
    const captureCtx = captureCanvas.getContext('2d');

    // Calculate the scale needed to render at target resolution
    // view.scale is relative to PIXELS_PER_MM, so we need to adjust
    const targetScale = targetPixelsPerMM / PIXELS_PER_MM;

    // Temporarily swap canvas and context for high-res rendering
    const originalCanvas = canvas;
    const originalCtx = ctx;
    canvas = captureCanvas;
    ctx = captureCtx;

    // Enable export mode for stronger beams
    isCapturingForExport = true;

    // Set view to fit table at high resolution
    view.scale = targetScale;
    view.x = captureWidth / 2;
    view.y = captureHeight / 2;

    // Draw at high resolution
    draw();
    await new Promise(resolve => setTimeout(resolve, 100)); // Longer delay for complex renders
    const dataURL = canvas.toDataURL('image/png', 1.0); // Maximum quality

    // Restore original canvas and view
    canvas = originalCanvas;
    ctx = originalCtx;
    isCapturingForExport = false;
    focusedBoardForCapture = null;
    view.x = savedView.x;
    view.y = savedView.y;
    view.scale = savedView.scale;
    draw();

    return dataURL;
}

/**
 * Capture individual board image (zoomed in to fit board with padding) at high resolution
 * @param {Element} board - Board element to capture
 * @returns {Promise<string>} Base64 PNG data URL
 */
async function captureBoardImage(board) {
    // Save current view state
    const savedView = {
        x: view.x,
        y: view.y,
        scale: view.scale
    };

    // Calculate board bounds including all components on it
    let minX = board.x - board.width / 2;
    let maxX = board.x + board.width / 2;
    let minY = board.y - board.height / 2;
    let maxY = board.y + board.height / 2;

    // Find all components on this board
    const componentsOnBoard = elements.filter(el => {
        if (el.type === 'board' || el === board) return false;
        return el.x >= board.x - board.width / 2 &&
               el.x <= board.x + board.width / 2 &&
               el.y >= board.y - board.height / 2 &&
               el.y <= board.y + board.height / 2;
    });

    // Expand bounds to include all components
    componentsOnBoard.forEach(comp => {
        const compHalfW = comp.width / 2;
        const compHalfH = comp.height / 2;
        minX = Math.min(minX, comp.x - compHalfW);
        maxX = Math.max(maxX, comp.x + compHalfW);
        minY = Math.min(minY, comp.y - compHalfH);
        maxY = Math.max(maxY, comp.y + compHalfH);
    });

    // Add padding (50mm as specified)
    const padding = 50;
    minX -= padding;
    maxX += padding;
    minY -= padding;
    maxY += padding;

    // Calculate dimensions
    const boardWidth = maxX - minX;
    const boardHeight = maxY - minY;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Create high-resolution offscreen canvas (8x resolution for better quality)
    const scaleFactor = 8;
    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = canvas.width * scaleFactor;
    captureCanvas.height = canvas.height * scaleFactor;
    const captureCtx = captureCanvas.getContext('2d');

    // Calculate scale to fit board in canvas
    const boardWidthPx = boardWidth * PIXELS_PER_MM;
    const boardHeightPx = boardHeight * PIXELS_PER_MM;
    const scaleX = canvas.width / boardWidthPx;
    const scaleY = canvas.height / boardHeightPx;
    const fitScale = Math.min(scaleX, scaleY) * 0.95; // 95% to add some padding

    // Set focused board for graying out other boards
    focusedBoardForCapture = board;
    
    // Temporarily swap canvas and context for high-res rendering
    const originalCanvas = canvas;
    const originalCtx = ctx;
    canvas = captureCanvas;
    ctx = captureCtx;

    // Enable export mode for stronger beams
    isCapturingForExport = true;

    // Set view to fit board at high resolution (center the board in the canvas)
    view.scale = fitScale * scaleFactor;
    view.x = canvas.width / 2 - (centerX * PIXELS_PER_MM * view.scale);
    view.y = canvas.height / 2 - (centerY * PIXELS_PER_MM * view.scale);

    // Draw at high resolution
    draw();
    await new Promise(resolve => setTimeout(resolve, 50)); // Small delay to ensure rendering
    const dataURL = canvas.toDataURL('image/png', 1.0); // Maximum quality

    // Restore original canvas and view
    canvas = originalCanvas;
    ctx = originalCtx;
    isCapturingForExport = false;
    focusedBoardForCapture = null;
    view.x = savedView.x;
    view.y = savedView.y;
    view.scale = savedView.scale;
    draw();

    return dataURL;
}

/**
 * Generate PPTX presentation with all images
 * @param {string} fullTableImage - Base64 PNG data URL of full table
 * @param {Array<{board: Element, image: string, filename: string}>} boardImages - Array of board images with metadata
 * @returns {Promise<Uint8Array>} PPTX file as Uint8Array
 */
async function generatePPTX(fullTableImage, boardImages) {
    // Check if library is loaded (try both possible global names)
    let PptxGenConstructor = window.PptxGenJS || window.pptxgen;
    if (typeof PptxGenConstructor === 'undefined') {
        throw new Error('PptxGenJS library is not loaded. Please refresh the page and try again.');
    }
    const pptx = new PptxGenConstructor();
    
    // Set presentation properties
    pptx.layout = 'LAYOUT_WIDE'; // 16:9 aspect ratio
    pptx.author = 'OptiLab';
    pptx.company = 'PhotonLab';
    pptx.title = 'Optical Bench Configuration';
    
    console.log('Generating PPTX with', boardImages.length, 'board images');

    // Title slide
    const titleSlide = pptx.addSlide();
    titleSlide.addText('Optical Bench Configuration', {
        x: 0.5,
        y: 1.5,
        w: 9,
        h: 1,
        fontSize: 44,
        bold: true,
        color: '363636',
        align: 'center'
    });
    titleSlide.addText(`Generated on ${new Date().toLocaleDateString()}`, {
        x: 0.5,
        y: 3,
        w: 9,
        h: 0.5,
        fontSize: 18,
        color: '666666',
        align: 'center'
    });

    // Full table overview slide
    const fullTableSlide = pptx.addSlide();
    fullTableSlide.addText('Full Table Overview', {
        x: 0.5,
        y: 0.2,
        w: 9,
        h: 0.5,
        fontSize: 32,
        bold: true,
        color: '363636',
        align: 'center'
    });
    
    // Convert base64 to image data for pptxgenjs
    // Extract base64 string from data URL (remove data:image/png;base64, prefix)
    const fullTableBase64 = fullTableImage.includes(',') ? fullTableImage.split(',')[1] : fullTableImage;
    console.log('Adding full table image, base64 length:', fullTableBase64.length);
    try {
        fullTableSlide.addImage({
            data: fullTableBase64,
            x: 0.5,
            y: 1,
            w: 9,
            h: 5.5
        });
        console.log('Full table image added successfully');
    } catch (error) {
        console.error('Error adding full table image:', error);
        throw error;
    }

    // Add slide for each board
    boardImages.forEach(({ board, image, filename }) => {
        const boardSlide = pptx.addSlide();
        const boardTitle = board.title || 'Untitled Board';
        
        boardSlide.addText(boardTitle, {
            x: 0.5,
            y: 0.2,
            w: 9,
            h: 0.5,
            fontSize: 32,
            bold: true,
            color: '363636',
            align: 'center'
        });
        
        // Convert base64 to image data - extract base64 string from data URL
        const boardBase64 = image.includes(',') ? image.split(',')[1] : image;
        console.log('Adding board image for', boardTitle, 'base64 length:', boardBase64.length);
        try {
            boardSlide.addImage({
                data: boardBase64,
                x: 0.5,
                y: 1,
                w: 9,
                h: 5.5
            });
            console.log('Board image added successfully for', boardTitle);
        } catch (error) {
            console.error('Error adding board image for', boardTitle, ':', error);
            // Continue with other boards even if one fails
        }
    });

    // Generate and return as Uint8Array
    try {
        const result = pptx.write({ outputType: 'array' });
        // Handle both promise and direct return
        const arrayBuffer = result instanceof Promise ? await result : result;
        return new Uint8Array(arrayBuffer);
    } catch (error) {
        console.error('Error writing PPTX:', error);
        throw new Error('Failed to generate PPTX file: ' + error.message);
    }
}

/**
 * Share table - creates a zip file with JSON, images, and PPTX
 */
async function shareTable() {
    try {
        // Check if required libraries are loaded
        if (typeof JSZip === 'undefined') {
            alert('JSZip library is not loaded. Please refresh the page and try again.');
            return;
        }
        if (typeof PptxGenJS === 'undefined' && typeof pptxgen === 'undefined') {
            alert('PptxGenJS library is not loaded. Please refresh the page and try again.');
            return;
        }
        
        // Show loading message
        const originalCursor = document.body.style.cursor;
        document.body.style.cursor = 'wait';
        
        // Get all boards
        const boards = elements.filter(el => el.type === 'board');
        
        if (boards.length === 0) {
            alert('No boards found. Please add at least one board before sharing.');
            document.body.style.cursor = originalCursor;
            return;
        }

        // Create zip file
        const zip = new JSZip();
        const folder = zip.folder('optical-bench-share');

        // 1. Export JSON state
        const jsonData = JSON.stringify(elements, null, 2);
        folder.file('table-state.json', jsonData);

        // 2. Capture full table image
        const fullTableImage = await captureFullTableImage();
        const fullTableBase64 = fullTableImage.split(',')[1];
        folder.file('full-table.png', fullTableBase64, { base64: true });

        // 3. Capture individual board images
        const boardImages = [];
        for (let i = 0; i < boards.length; i++) {
            const board = boards[i];
            const boardImage = await captureBoardImage(board);
            const boardBase64 = boardImage.split(',')[1];
            
            // Create filename from board title
            const boardTitle = board.title || 'untitled-board';
            const sanitizedTitle = boardTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase();
            const filename = `board-${i + 1}-${sanitizedTitle}.png`;
            
            folder.file(filename, boardBase64, { base64: true });
            boardImages.push({ board, image: boardImage, filename });
        }

        // 4. Generate PPTX
        const pptxData = await generatePPTX(fullTableImage, boardImages);
        folder.file('presentation.pptx', pptxData);

        // 5. Generate zip and trigger download
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `optical-bench-share-${new Date().toISOString().split('T')[0]}.zip`;
        a.click();
        URL.revokeObjectURL(url);

        document.body.style.cursor = originalCursor;
    } catch (error) {
        console.error('Error sharing table:', error);
        alert('Error creating share package: ' + error.message);
        document.body.style.cursor = originalCursor;
    }
}


