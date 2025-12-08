/**
 * OptiLab - Mueller Matrix Mathematics
 * Polarization physics using Mueller calculus
 */

const MuellerMath = {
    // Standard Stokes Vectors [I, Q, U, V]
    STOKES: {
        HORIZONTAL:    [1,  1,  0,  0],
        VERTICAL:      [1, -1,  0,  0],
        DIAGONAL:      [1,  0,  1,  0], // +45 degrees
        ANTI_DIAGONAL: [1,  0, -1,  0], // -45 degrees
        RIGHT_CIRC:    [1,  0,  0,  1],
        LEFT_CIRC:     [1,  0,  0, -1]
    },

    // Base Matrices for Ideal Components (Fast Axis Horizontal / 0 degrees)
    MATRICES: {
        // Linear Polarizer (Horizontal Transmission)
        POLARIZER_H: [
            [0.5, 0.5, 0, 0],
            [0.5, 0.5, 0, 0],
            [  0,   0, 0, 0],
            [  0,   0, 0, 0]
        ],
        // Half Wave Plate (Fast Axis Horizontal)
        // Retardation = PI. [1, 1, -1, -1] on diagonals
        HWP_H: [
            [1, 0,  0,  0],
            [0, 1,  0,  0],
            [0, 0, -1,  0],
            [0, 0,  0, -1]
        ],
        // Quarter Wave Plate (Fast Axis Horizontal)
        // Retardation = PI/2. Converts 45deg Linear to Circular
        QWP_H: [
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 0, 1],
            [0, 0,-1, 0]
        ],
        // Ideal Mirror (Normal Incidence)
        // Reflects intensity (1), Flips coordinate system (-1 on U and V)
        MIRROR: [
            [1, 0,  0,  0],
            [0, 1,  0,  0],
            [0, 0, -1,  0],
            [0, 0,  0, -1]
        ],
        // Identity (Air/Glass)
        IDENTITY: [
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 1]
        ]
    },

    /**
     * Creates a rotation matrix for the Stokes Frame
     * R(theta) = [1, 0, 0, 0; 0, cos2t, sin2t, 0; 0, -sin2t, cos2t, 0; 0, 0, 0, 1]
     * @param {number} thetaRad - Rotation angle in radians
     * @returns {Array} 4x4 rotation matrix
     */
    createRotationMatrix: (thetaRad) => {
        const c2 = Math.cos(2 * thetaRad);
        const s2 = Math.sin(2 * thetaRad);
        return [
            [1,   0,   0, 0],
            [0,  c2,  s2, 0],
            [0, -s2,  c2, 0],
            [0,   0,   0, 1]
        ];
    },

    /**
     * Matrix multiplication: C = A * B
     * @param {Array} A - 4x4 matrix
     * @param {Array} B - 4x4 matrix
     * @returns {Array} Result 4x4 matrix
     */
    multiplyMatrices: (A, B) => {
        const C = [[0,0,0,0], [0,0,0,0], [0,0,0,0], [0,0,0,0]];
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                let sum = 0;
                for (let k = 0; k < 4; k++) {
                    sum += A[r][k] * B[k][c];
                }
                C[r][c] = sum;
            }
        }
        return C;
    },

    /**
     * Vector interaction: S' = M * S
     * @param {Array} stokes - Stokes vector [I, Q, U, V]
     * @param {Array} matrix - Mueller matrix
     * @returns {Array} Resulting Stokes vector
     */
    interact: (stokes, matrix) => {
        const res = [0, 0, 0, 0];
        for (let r = 0; r < 4; r++) {
            let sum = 0;
            for (let c = 0; c < 4; c++) {
                sum += matrix[r][c] * stokes[c];
            }
            res[r] = sum;
        }
        // Ensure intensity doesn't go negative due to float errors
        if (res[0] < 0) res[0] = 0;
        return res;
    },

    /**
     * Rotates a component's Mueller matrix by theta
     * M_rot = R(-theta) * M_base * R(theta)
     * @param {Array} baseMatrix - Original Mueller matrix
     * @param {number} thetaRad - Rotation angle in radians
     * @returns {Array} Rotated Mueller matrix
     */
    rotateComponent: (baseMatrix, thetaRad) => {
        // Optimization: If close to 0, return base
        if (Math.abs(thetaRad) < 0.001) return baseMatrix;

        const R_in = MuellerMath.createRotationMatrix(thetaRad);
        const R_out = MuellerMath.createRotationMatrix(-thetaRad);
        
        const temp = MuellerMath.multiplyMatrices(baseMatrix, R_in);
        return MuellerMath.multiplyMatrices(R_out, temp);
    },

    /**
     * Returns color string based on polarization state for debugging/viz
     * @param {Array} S - Stokes vector
     * @returns {string} RGB color string
     */
    getPolarizationColor: (S) => {
        const I = S[0] || 1; // Avoid div by zero
        const Q = S[1] / I;
        const U = S[2] / I;
        const V = S[3] / I;

        // Linear Horizontal (Red) to Vertical (Blue)
        if (Math.abs(V) < 0.1) {
            const r = Math.floor(255 * (1 + Q) / 2);
            const b = Math.floor(255 * (1 - Q) / 2);
            return `rgb(${r}, 0, ${b})`;
        }
        // Circular (Green)
        else {
            const g = Math.floor(255 * Math.abs(V));
            return `rgb(0, ${g}, 0)`;
        }
    }
};


