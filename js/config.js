/**
 * OptiLab - Configuration and Global State
 * Contains constants and global variables used throughout the application
 */

// Canvas and context references (initialized in app.js)
let canvas, ctx, container;
let rotationSlider, rotationValueDisplay, debugInfo, mouseCoordsDisplay;
let calibrationMsg, imgUploadInput;

// Grid and measurement constants
const GRID_PITCH_MM = 25;
const HALF_GRID_MM = 12.5;
let PIXELS_PER_MM = 2.0;

// View state
const view = { 
    x: 50, 
    y: 50, 
    scale: 0.5, 
    isPanning: false, 
    startPanX: 0, 
    startPanY: 0 
};

// Table configuration
const tableConfig = { 
    widthMM: 2400, 
    heightMM: 1800 
};

// Physics constants
const MAX_BOUNCES = 30;
const SNAP_ROTATION = 45;

// Waveplate constants
const WAVEPLATE_KNOB_OFFSET_MM = 18;
const WAVEPLATE_KNOB_RADIUS_MM = 6;
const WAVEPLATE_FINE_STEP_DEG = 5;

// Application state
let elements = [];
let selection = new Set();

// Interaction state
let isDragging = false;
let isRotating = false;
let isResizing = false;
let isSelecting = false;
let isAdjustingAxis = false;
let axisAdjustTarget = null;
let selectionRect = null;
let dragOffsets = new Map();
let draggedChildren = new Map();
let lastMousePos = { x: 0, y: 0 };
let shiftPressed = false;
let ctrlPressed = false;
let lastHitOnSelected = null;
let invalidBoardPlacement = false;
let originalBoardState = null;
const keys = {};

// Clipboard for copy/paste
let clipboard = null;

// Fiber Coupler Connection State
let isFiberConnecting = false;
let fiberConnectSource = null;
let fiberConnectMousePos = null;

// Fiber color palette for different fiber pairs
const FIBER_COLORS = [
    '#ffa500', // Orange
    '#22d3ee', // Cyan
    '#a855f7', // Purple
    '#22c55e', // Green
    '#f43f5e', // Rose
    '#eab308', // Yellow
    '#3b82f6', // Blue
    '#ec4899', // Pink
    '#14b8a6', // Teal
    '#f97316', // Orange-red
];

// Alignment state
let alignPreference = 0;
let hasCycleOptions = false;

// Calibration state
let calibrationState = 0;
let calibData = { 
    board: null, 
    p1Img: null, 
    p1Board: null, 
    p2Img: null, 
    p2Board: null, 
    p3Img: null, 
    p3Board: null 
};

/**
 * Get the next available fiber color from the palette
 * @returns {string} Hex color string
 */
function getNextFiberColor() {
    const usedColors = new Set();
    elements.filter(el => el.type === 'fiber-coupler' && el.fiberColor).forEach(el => {
        usedColors.add(el.fiberColor);
    });
    for (const color of FIBER_COLORS) {
        if (!usedColors.has(color)) return color;
    }
    return FIBER_COLORS[0];
}


