/**
 * OptiLab - Ray Tracing Engine
 * Core ray tracing and physics simulation
 */

/**
 * Trace a single ray through the optical system
 * @param {Object} ray - Ray object with x, y, dx, dy, intensity, stokes, color
 * @param {number} depth - Current bounce depth
 * @param {Array} results - Array to collect ray segments
 */
function traceRay(ray, depth, results) {
    if (depth > MAX_BOUNCES || ray.intensity < 0.01) return;

    let closestHit = null;
    let closestDist = Infinity;
    let hitObject = null;
    let hitSegment = null;

    // Find intersection with all elements
    elements.forEach(el => {
        if (el.type === 'laser' || el.type === 'board') return;
        el.getSegments().forEach(seg => {
            const hit = getIntersection(
                { x: ray.x, y: ray.y },
                { x: ray.dx, y: ray.dy },
                seg.p1,
                seg.p2
            );
            if (hit && hit.param < closestDist) {
                closestDist = hit.param;
                closestHit = hit;
                hitObject = el;
                hitSegment = seg;
            }
        });
    });

    if (closestHit) {
        results.push({
            x1: ray.x,
            y1: ray.y,
            x2: closestHit.x,
            y2: closestHit.y,
            color: ray.color + ray.intensity + ')',
            stokes: ray.stokes
        });

        const segVec = closestHit.segVector;
        let nx = -segVec.y;
        let ny = segVec.x;
        const nl = Math.sqrt(nx * nx + ny * ny);
        nx /= nl;
        ny /= nl;
        const inc = { x: ray.dx, y: ray.dy };
        const dp = dot(inc, { x: nx, y: ny });

        // Track first hit on selected element for smart alignment
        if (selection.has(hitObject) && !lastHitOnSelected &&
            (hitObject.type.includes('mirror') ||
             ['splitter', 'pbs', 'aom', 'glass', 'lens'].includes(hitObject.type))) {
            lastHitOnSelected = { el: hitObject, incoming: inc };
        }

        // Handle different element types
        if (hitSegment.type === 'mirror-front' && dp < 0) {
            // Mirror reflection
            const newStokes = MuellerMath.interact(ray.stokes, MuellerMath.MATRICES.MIRROR);
            const rx = inc.x - 2 * dp * nx;
            const ry = inc.y - 2 * dp * ny;
            traceRay({
                ...ray,
                x: closestHit.x,
                y: closestHit.y,
                dx: rx,
                dy: ry,
                intensity: newStokes[0],
                stokes: newStokes
            }, depth + 1, results);

        } else if (['splitter', 'pbs'].includes(hitSegment.type)) {
            // Beam splitter / PBS
            const rx = inc.x - 2 * dp * nx;
            const ry = inc.y - 2 * dp * ny;

            if (hitSegment.type === 'pbs') {
                const matTrans = MuellerMath.rotateComponent(
                    MuellerMath.MATRICES.POLARIZER_H,
                    hitObject.rotation
                );
                const stokesTrans = MuellerMath.interact(ray.stokes, matTrans);

                const matRefl = MuellerMath.rotateComponent(
                    MuellerMath.MATRICES.POLARIZER_H,
                    hitObject.rotation + Math.PI / 2
                );
                const stokesRefl = MuellerMath.interact(ray.stokes, matRefl);

                traceRay({
                    ...ray,
                    x: closestHit.x + inc.x * 0.1,
                    y: closestHit.y + inc.y * 0.1,
                    dx: inc.x,
                    dy: inc.y,
                    intensity: stokesTrans[0],
                    stokes: stokesTrans
                }, depth + 1, results);

                traceRay({
                    ...ray,
                    x: closestHit.x,
                    y: closestHit.y,
                    dx: rx,
                    dy: ry,
                    intensity: stokesRefl[0],
                    stokes: stokesRefl
                }, depth + 1, results);
            } else {
                const splitStokes = ray.stokes.map(val => val * 0.5);
                traceRay({
                    ...ray,
                    x: closestHit.x,
                    y: closestHit.y,
                    dx: rx,
                    dy: ry,
                    intensity: splitStokes[0],
                    stokes: splitStokes
                }, depth + 1, results);

                traceRay({
                    ...ray,
                    x: closestHit.x + inc.x * 0.1,
                    y: closestHit.y + inc.y * 0.1,
                    dx: inc.x,
                    dy: inc.y,
                    intensity: splitStokes[0],
                    stokes: splitStokes
                }, depth + 1, results);
            }

        } else if (['hwp', 'qwp'].includes(hitObject.type)) {
            // Waveplate physics
            const baseMatrix = hitObject.type === 'hwp'
                ? MuellerMath.MATRICES.HWP_H
                : MuellerMath.MATRICES.QWP_H;
            let theta = getSignedWaveplateAngle(hitObject);

            if (hitSegment.type === 'waveplate') {
                const normal = hitSegment.normal || normalize({ x: -segVec.y, y: segVec.x });
                const dir = dot(inc, normal);
                if (dir < 0) {
                    theta = -theta;
                }
            }

            const rotMatrix = MuellerMath.rotateComponent(baseMatrix, theta);
            const newStokes = MuellerMath.interact(ray.stokes, rotMatrix);

            traceRay({
                ...ray,
                x: closestHit.x + inc.x * 0.1,
                y: closestHit.y + inc.y * 0.1,
                dx: inc.x,
                dy: inc.y,
                intensity: newStokes[0],
                stokes: newStokes,
                color: ray.color
            }, depth + 1, results);

        } else if (hitObject.type === 'aom') {
            // AOM diffraction
            const incDir = normalize(inc);
            const mainDir = getAomDirectionVector(hitObject);
            const alignment = dot(incDir, mainDir);

            if (Math.abs(alignment) < 0.15) {
                return; // Block perpendicular beams
            }

            if (!isAomEnabled(hitObject)) {
                // AOM off - beam passes through
                const passStokes = ray.stokes.map(v => v * 0.95);
                traceRay({
                    x: closestHit.x + incDir.x * 0.1,
                    y: closestHit.y + incDir.y * 0.1,
                    dx: incDir.x,
                    dy: incDir.y,
                    intensity: passStokes[0],
                    stokes: passStokes,
                    color: ray.color
                }, depth + 1, results);
                return;
            }

            // AOM on - apply diffraction
            const shiftAngle = 0.035;
            const signedTheta = alignment > 0 ? -shiftAngle : shiftAngle;
            const straightDir = alignment > 0 ? mainDir : { x: -mainDir.x, y: -mainDir.y };
            const incAngle = Math.acos(Math.min(1, Math.abs(dot(incDir, straightDir))));
            const angleTolerance = 0.02;

            if (incAngle < angleTolerance) {
                // Beam enters straight → exits straight + deflected
                const straightStokes = ray.stokes.map(v => v * 0.3);
                const diffractedStokes = ray.stokes.map(v => v * 0.7);
                const deflectedDir = rotatePoint(straightDir, signedTheta);

                traceRay({
                    x: closestHit.x + straightDir.x * 0.1,
                    y: closestHit.y + straightDir.y * 0.1,
                    dx: straightDir.x,
                    dy: straightDir.y,
                    intensity: straightStokes[0],
                    stokes: straightStokes,
                    color: ray.color
                }, depth + 1, results);

                traceRay({
                    x: closestHit.x + deflectedDir.x * 0.1,
                    y: closestHit.y + deflectedDir.y * 0.1,
                    dx: deflectedDir.x,
                    dy: deflectedDir.y,
                    intensity: diffractedStokes[0],
                    stokes: diffractedStokes,
                    color: ray.color
                }, depth + 1, results);
            } else {
                // Beam enters at angle → exits straight
                const correctedStokes = ray.stokes.map(v => v * 0.7);
                traceRay({
                    x: closestHit.x + straightDir.x * 0.1,
                    y: closestHit.y + straightDir.y * 0.1,
                    dx: straightDir.x,
                    dy: straightDir.y,
                    intensity: correctedStokes[0],
                    stokes: correctedStokes,
                    color: ray.color
                }, depth + 1, results);
            }
            return;

        } else if (hitObject.type === 'lens' && hitSegment.type === 'lens') {
            // Thin lens refraction
            const outDir = computeLensRefraction(ray, hitObject, closestHit);
            const modStokes = ray.stokes.map(v => v * 0.98);
            traceRay({
                x: closestHit.x + outDir.x * 0.1,
                y: closestHit.y + outDir.y * 0.1,
                dx: outDir.x,
                dy: outDir.y,
                intensity: modStokes[0],
                stokes: modStokes,
                color: ray.color
            }, depth + 1, results);

        } else if (hitObject.type === 'fiber-coupler' && hitSegment.type === 'fiber-input') {
            // Fiber coupler - check what it's paired with
            if (hitObject.pairedWith) {
                const pairedElement = elements.find(el => el.id === hitObject.pairedWith);
                if (pairedElement) {
                    if (pairedElement.type === 'amplifier') {
                        // Paired with amplifier: amplify and output direct beam from amplifier
                        const gain = pairedElement.gain || 2.0;
                        const ampStokes = ray.stokes.map(v => v * gain * 0.9); // gain + fiber loss
                        const outX = pairedElement.x;
                        const outY = pairedElement.y;
                        // Output from amplifier's right side (direct beam output)
                        const outDir = rotatePoint({ x: 1, y: 0 }, pairedElement.rotation);
                        traceRay({
                            x: outX + outDir.x * (pairedElement.width / 2 + 0.1),
                            y: outY + outDir.y * (pairedElement.width / 2 + 0.1),
                            dx: outDir.x,
                            dy: outDir.y,
                            intensity: ampStokes[0],
                            stokes: ampStokes,
                            color: ray.color
                        }, depth + 1, results);
                    } else {
                        // Paired with another fiber coupler: teleport to it
                        const fiberStokes = ray.stokes.map(v => v * 0.9);
                        const outX = pairedElement.x;
                        const outY = pairedElement.y;
                        const outDir = rotatePoint({ x: 1, y: 0 }, pairedElement.rotation);
                        traceRay({
                            x: outX + outDir.x * (pairedElement.width / 2 + 0.1),
                            y: outY + outDir.y * (pairedElement.width / 2 + 0.1),
                            dx: outDir.x,
                            dy: outDir.y,
                            intensity: fiberStokes[0],
                            stokes: fiberStokes,
                            color: ray.color
                        }, depth + 1, results);
                    }
                }
            }

        } else if (hitObject.type === 'glass') {
            // Glass pass-through
            const modStokes = ray.stokes.map(v => v * 0.95);
            traceRay({
                x: closestHit.x + inc.x * 0.1,
                y: closestHit.y + inc.y * 0.1,
                dx: inc.x,
                dy: inc.y,
                intensity: modStokes[0],
                stokes: modStokes,
                color: ray.color
            }, depth + 1, results);
        }
    } else {
        // No hit - ray continues to infinity
        results.push({
            x1: ray.x,
            y1: ray.y,
            x2: ray.x + ray.dx * 2000,
            y2: ray.y + ray.dy * 2000,
            color: ray.color + ray.intensity + ')',
            stokes: ray.stokes
        });
    }
}

/**
 * Cast rays from all lasers in the scene
 * @returns {Array} Array of ray segments to draw
 */
function castRays() {
    lastHitOnSelected = null;
    let raysToDraw = [];
    const lasers = elements.filter(e => e.type === 'laser');

    lasers.forEach(laser => {
        const dir = rotatePoint({ x: 1, y: 0 }, laser.rotation);
        const start = rotatePoint({ x: laser.width / 2, y: 0 }, laser.rotation);

        // Calculate source Stokes from polarization angle
        const theta = toRad(laser.polAngle || 0);
        const sourceStokes = MuellerMath.interact(
            [1, 0, 0, 0],
            MuellerMath.rotateComponent(MuellerMath.MATRICES.POLARIZER_H, theta)
        );

        let ray = {
            x: laser.x + start.x,
            y: laser.y + start.y,
            dx: dir.x,
            dy: dir.y,
            intensity: sourceStokes[0],
            color: 'rgba(255, 50, 50, ',
            stokes: sourceStokes
        };

        traceRay(ray, 0, raysToDraw);
    });

    return raysToDraw;
}


