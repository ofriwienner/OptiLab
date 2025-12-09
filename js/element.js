/**
 * OptiLab - Element Class Definition
 * Core element class for all optical components
 */

class Element {
    constructor(type, xMM, yMM, w, h, title) {
        this.id = Date.now() + Math.random();
        this.type = type;
        this.x = xMM;
        this.y = yMM;
        this.rotation = 0;
        this.title = title || '';
        this.width = w || 40;
        this.height = h || 40;
        this.isFlipped = false;
        this.locked = false;
        this.imgData = null;
        this.imgConfig = { visible: true, opacity: 0.5, x: 0, y: 0, w: 0, h: 0 };
        this.axisAngle = null;
        this.optics = null;
        if (type !== 'board') this.setupType(type);
    }

    /**
     * Configure element properties based on type
     * @param {string} type - Element type
     */
    setupType(type) {
        switch (type) {
            case 'laser':
                this.width = 50;
                this.height = 25;
                break;
            case 'mirror':
                this.width = 40;
                this.height = 5;
                this.rotation = toRad(-45);
                break;
            case 'mirror-d':
                this.width = 40;
                this.height = 5;
                this.rotation = toRad(-90);
                break;
            case 'splitter':
                this.width = 30;
                this.height = 30;
                this.rotation = 0;
                break;
            case 'pbs':
                this.width = 30;
                this.height = 30;
                this.rotation = 0;
                break;
            case 'aom':
                this.width = 40;
                this.height = 20;
                this.rotation = 0;
                break;
            case 'lens':
                this.width = 15;
                this.height = 40;
                this.rotation = 0;
                this.optics = { focalLength: GRID_PITCH_MM * 5 };
                break;
            case 'blocker':
                this.width = 25;
                this.height = 25;
                break;
            case 'detector':
                this.width = 30;
                this.height = 30;
                this.rotation = 0;
                break;
            case 'glass':
                this.width = 20;
                this.height = 50;
                break;
            case 'hwp':
            case 'qwp':
                this.width = 5;
                this.height = 30;
                this.axisAngle = clampWaveplateAngle(toRad(45));
                break;
            case 'fiber-coupler':
                this.width = 25;
                this.height = 25;
                this.pairedWith = null;
                this.fiberColor = null;
                break;
            case 'amplifier':
                this.width = 50;
                this.height = 30;
                this.pairedWith = null;  // ID of connected fiber coupler
                this.fiberColor = null;  // Color when connected
                this.gain = 2.0;         // Amplification factor
                break;
        }
    }

    /**
     * Get rotation handle position in local coordinates
     * @returns {Object} Handle position
     */
    getHandlePosition() {
        let dist = this.width / 2 + 15;
        if (this.type === 'mirror-d') dist = this.width + 15;
        return rotatePoint({ x: dist, y: 0 }, this.rotation);
    }

    /**
     * Get flip button position in local coordinates
     * @returns {Object} Button position
     */
    getFlipButtonPosition() {
        const dist = this.width / 2 + 15;
        return rotatePoint({ x: dist, y: 15 }, this.rotation);
    }

    /**
     * Get resize handle position (for boards)
     * @returns {Object} Handle position
     */
    getResizeHandlePosition() {
        return { x: this.width / 2, y: this.height / 2 };
    }

    /**
     * Get move handle position (for boards)
     * @returns {Object} Handle position
     */
    getMoveHandlePosition() {
        return { x: -this.width / 2, y: -this.height / 2 };
    }

    /**
     * Get snap button position
     * @returns {Object} Button position
     */
    getSnapButtonPosition() {
        const dist = this.width / 2 + 15;
        return rotatePoint({ x: dist, y: -15 }, this.rotation);
    }

    /**
     * Get waveplate axis knob position in world coordinates
     * @returns {Object} Knob position
     */
    getAxisKnobWorldPosition() {
        const local = { x: 0, y: -this.height / 2 - WAVEPLATE_KNOB_OFFSET_MM };
        const rotated = rotatePoint(local, this.rotation);
        return { x: this.x + rotated.x, y: this.y + rotated.y };
    }

    /**
     * Get collision/interaction segments for ray tracing
     * @returns {Array} Array of segments
     */
    getSegments() {
        if (this.type === 'board') return [];

        const cx = this.x;
        const cy = this.y;
        const w = this.width;
        const h = this.height;

        const worldCorners = [
            { x: -w / 2, y: -h / 2 },
            { x: w / 2, y: -h / 2 },
            { x: w / 2, y: h / 2 },
            { x: -w / 2, y: h / 2 }
        ].map(p => rotatePoint(p, this.rotation))
         .map(p => ({ x: p.x + cx, y: p.y + cy }));

        const segments = [];

        if (this.type === 'mirror') {
            const mw = this.width / 2;
            const r1 = rotatePoint({ x: mw, y: 0 }, this.rotation);
            const r2 = rotatePoint({ x: -mw, y: 0 }, this.rotation);
            segments.push({
                p1: { x: cx + r1.x, y: cy + r1.y },
                p2: { x: cx + r2.x, y: cy + r2.y },
                type: 'mirror-front'
            });
            segments.push({
                p1: worldCorners[2],
                p2: worldCorners[3],
                type: 'blocker'
            });
        } else if (this.type === 'mirror-d') {
            // Reflective length is 0.45 of width, starting from edge
            const edge = this.width / 2;
            const refLength = this.width * 0.45;
            const innerEdge = edge - refLength;
            let refStart, refEnd;
            if (!this.isFlipped) {
                refStart = { x: edge, y: 0 };
                refEnd = { x: innerEdge, y: 0 };
            } else {
                refStart = { x: -innerEdge, y: 0 };
                refEnd = { x: -edge, y: 0 };
            }
            const rRS = rotatePoint(refStart, this.rotation);
            const rRE = rotatePoint(refEnd, this.rotation);
            segments.push({
                p1: { x: cx + rRS.x, y: cy + rRS.y },
                p2: { x: cx + rRE.x, y: cy + rRE.y },
                type: 'mirror-front'
            });
            segments.push({
                p1: worldCorners[2],
                p2: worldCorners[3],
                type: 'blocker'
            });
        } else if (['splitter', 'pbs'].includes(this.type)) {
            const p1 = rotatePoint({ x: -this.width / 2, y: -this.height / 2 }, this.rotation);
            const p2 = rotatePoint({ x: this.width / 2, y: this.height / 2 }, this.rotation);
            segments.push({
                p1: { x: p1.x + cx, y: p1.y + cy },
                p2: { x: p2.x + cx, y: p2.y + cy },
                type: this.type === 'pbs' ? 'pbs' : 'splitter'
            });
        } else if (this.type === 'hwp' || this.type === 'qwp') {
            const start = rotatePoint({ x: 0, y: -this.height / 2 }, this.rotation);
            const end = rotatePoint({ x: 0, y: this.height / 2 }, this.rotation);
            const normal = normalize(rotatePoint({ x: 1, y: 0 }, this.rotation));
            segments.push({
                p1: { x: cx + start.x, y: cy + start.y },
                p2: { x: cx + end.x, y: cy + end.y },
                type: 'waveplate',
                normal
            });
        } else if (this.type === 'aom') {
            const start = rotatePoint({ x: -this.width / 2, y: 0 }, this.rotation);
            const end = rotatePoint({ x: this.width / 2, y: 0 }, this.rotation);
            const normal = normalize(rotatePoint({ x: 0, y: 1 }, this.rotation));
            segments.push({
                p1: { x: cx + start.x, y: cy + start.y },
                p2: { x: cx + end.x, y: cy + end.y },
                type: 'aom',
                normal
            });
        } else if (this.type === 'lens') {
            const start = rotatePoint({ x: 0, y: -this.height / 2 }, this.rotation);
            const end = rotatePoint({ x: 0, y: this.height / 2 }, this.rotation);
            const normal = normalize(rotatePoint({ x: 1, y: 0 }, this.rotation));
            segments.push({
                p1: { x: cx + start.x, y: cy + start.y },
                p2: { x: cx + end.x, y: cy + end.y },
                type: 'lens',
                normal
            });
        } else if (this.type === 'fiber-coupler') {
            const start = rotatePoint({ x: 0, y: -this.height / 2 }, this.rotation);
            const end = rotatePoint({ x: 0, y: this.height / 2 }, this.rotation);
            const normal = normalize(rotatePoint({ x: 1, y: 0 }, this.rotation));
            segments.push({
                p1: { x: cx + start.x, y: cy + start.y },
                p2: { x: cx + end.x, y: cy + end.y },
                type: 'fiber-input',
                normal
            });
        } else if (this.type === 'amplifier') {
            // Amplifier has fiber input (left) and direct laser output (right)
            // No ray interaction segments needed - light comes in via fiber connection
            // and outputs as a new ray from the output face
        } else {
            let intType = 'blocker';
            if (this.type === 'glass') intType = 'refractor';
            if (this.type === 'detector') intType = 'blocker';
            for (let i = 0; i < 4; i++) {
                segments.push({
                    p1: worldCorners[i],
                    p2: worldCorners[(i + 1) % 4],
                    type: intType
                });
            }
        }

        return segments;
    }
}


