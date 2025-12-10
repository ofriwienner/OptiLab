/**
 * OptiLab - UI Controls
 * Dynamic UI panel, buttons, and sliders
 */

/**
 * Update the UI panel based on current selection
 */
function updateUI() {
    const p = Array.from(selection).pop();
    const btnContainer = document.getElementById('dynamic-buttons');
    btnContainer.innerHTML = '';

    if (p) {
        // Rotation Slider
        let deg = Math.round(toDeg(p.rotation) % 360);
        if (deg < 0) deg += 360;
        rotationSlider.value = deg;
        rotationValueDisplay.innerText = deg + '°';

        // Laser Controls
        if (p.type === 'laser') {
            const div = document.createElement('div');
            div.className = "mt-2 border-t border-gray-600 pt-2";
            const label = document.createElement('label');
            label.className = "text-[9px] text-gray-400 block mb-1";
            label.innerText = "Source Polarization";
            div.appendChild(label);

            const select = document.createElement('select');
            select.className = "w-full bg-gray-700 border border-gray-600 rounded px-1 py-1 text-[10px] text-white cursor-pointer";
            select.style.userSelect = 'auto';
            select.style.webkitUserSelect = 'auto';
            select.onmousedown = (e) => e.stopPropagation();

            select.onchange = (e) => {
                p.polAngle = parseInt(e.target.value);
                draw();
            };

            const optH = document.createElement('option');
            optH.value = "0";
            optH.innerText = "Horizontal (0°)";
            if (p.polAngle === 0) optH.selected = true;

            const optV = document.createElement('option');
            optV.value = "90";
            optV.innerText = "Vertical (90°)";
            if ((p.polAngle ?? 90) === 90) optV.selected = true;

            select.appendChild(optH);
            select.appendChild(optV);
            div.appendChild(select);
            btnContainer.appendChild(div);
        }

        // Waveplate Controls
        if (isWaveplateElement(p)) {
            const axisRow = document.createElement('div');
            axisRow.className = "flex items-center justify-between text-[10px] text-gray-300 mt-2";
            axisRow.innerHTML = `<span>Waveplate Axis</span><span class="font-mono">${formatAxisAngleDeg(getWaveplateAxisAngle(p))}°</span>`;
            btnContainer.appendChild(axisRow);

            const axisHint = document.createElement('p');
            axisHint.className = "text-[9px] text-gray-500";
            axisHint.innerText = "Use the knob above the plate to set axis.";
            btnContainer.appendChild(axisHint);

            const alignBtn = document.createElement('button');
            alignBtn.className = "w-full py-1 bg-gray-700 border border-gray-600 rounded text-[10px] text-gray-200 hover:bg-gray-600 transition cursor-pointer";
            alignBtn.innerText = "Match Axis to Body";
            alignBtn.onclick = () => {
                p.axisAngle = clampWaveplateAngle(p.rotation || 0);
                draw();
                updateUI();
            };
            btnContainer.appendChild(alignBtn);
        }

        // AOM Controls
        if (p.type === 'aom') {
            const aomBox = document.createElement('div');
            aomBox.className = "mt-2 border-t border-gray-600 pt-2 space-y-2";

            const title = document.createElement('div');
            title.className = "text-[10px] uppercase text-gray-400";
            title.innerText = "AOM Settings";
            aomBox.appendChild(title);

            const enabled = isAomEnabled(p);
            const toggleBtn = document.createElement('button');
            toggleBtn.className = `w-full py-1 text-[10px] rounded border transition cursor-pointer ${enabled ? 'bg-green-700/50 border-green-600 text-green-100 hover:bg-green-700' : 'bg-red-900/50 border-red-600 text-red-100 hover:bg-red-900'}`;
            toggleBtn.innerText = enabled ? 'AOM ON' : 'AOM OFF';
            toggleBtn.onclick = () => {
                p.aomEnabled = !isAomEnabled(p);
                draw();
                updateUI();
            };
            aomBox.appendChild(toggleBtn);

            const hint = document.createElement('p');
            hint.className = "text-[9px] text-gray-500";
            hint.innerText = enabled ? "Diffracts incoming beam" : "Beam passes through";
            aomBox.appendChild(hint);

            btnContainer.appendChild(aomBox);
        }

        // Lens Controls
        if (p.type === 'lens') {
            ensureLensOptics(p);
            const lensBox = document.createElement('div');
            lensBox.className = "mt-2 border-t border-gray-600 pt-2 space-y-2";

            const title = document.createElement('div');
            title.className = "text-[10px] uppercase text-gray-400";
            title.innerText = "Lens Settings";
            lensBox.appendChild(title);

            const focalRow = document.createElement('div');
            focalRow.className = "flex items-center justify-between text-[10px] text-gray-300";
            const focalLabel = document.createElement('span');
            focalLabel.innerText = "Focal Length";
            const focalValue = document.createElement('span');
            focalValue.className = "font-mono";
            focalValue.innerText = `${Math.round(p.optics.focalLength)} mm`;
            focalRow.appendChild(focalLabel);
            focalRow.appendChild(focalValue);
            lensBox.appendChild(focalRow);

            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = GRID_PITCH_MM;
            slider.max = GRID_PITCH_MM * 40;
            slider.step = GRID_PITCH_MM / 10;
            slider.value = p.optics.focalLength;
            slider.className = "w-full accent-amber-400 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer";
            slider.oninput = (e) => {
                let val = parseFloat(e.target.value);
                if (isNaN(val)) return;
                const snapped = snapLensFocalLength(val);
                p.optics.focalLength = snapped;
                focalValue.innerText = `${Math.round(snapped)} mm`;
                slider.value = snapped;
                draw();
            };
            lensBox.appendChild(slider);

            const hint = document.createElement('p');
            hint.className = "text-[9px] text-gray-500";
            hint.innerText = "Snap: 1×grid | Shift=0.5×grid | Ctrl=0.1×grid";
            lensBox.appendChild(hint);

            btnContainer.appendChild(lensBox);
        }

        // Fiber Coupler Controls
        if (p.type === 'fiber-coupler') {
            const fiberBox = document.createElement('div');
            fiberBox.className = "mt-2 border-t border-gray-600 pt-2 space-y-2";

            const title = document.createElement('div');
            title.className = "text-[10px] uppercase text-gray-400";
            title.innerText = "Fiber Coupler";
            fiberBox.appendChild(title);

            const statusRow = document.createElement('div');
            statusRow.className = "flex items-center justify-between text-[10px] text-gray-300";
            const statusLabel = document.createElement('span');
            statusLabel.innerText = "Status";
            const statusWrapper = document.createElement('div');
            statusWrapper.className = "flex items-center gap-2";

            if (p.pairedWith && p.fiberColor) {
                const colorDot = document.createElement('span');
                colorDot.style.width = '10px';
                colorDot.style.height = '10px';
                colorDot.style.borderRadius = '50%';
                colorDot.style.backgroundColor = p.fiberColor;
                colorDot.style.display = 'inline-block';
                statusWrapper.appendChild(colorDot);
            }

            const statusValue = document.createElement('span');
            statusValue.className = "font-mono";
            if (p.pairedWith) {
                const paired = elements.find(el => el.id === p.pairedWith);
                statusValue.innerText = paired ? (paired.title || 'Paired') : 'Paired';
                statusValue.style.color = p.fiberColor || '#4ade80';
            } else {
                statusValue.innerText = 'Not paired';
                statusValue.style.color = '#fca5a5';
            }
            statusWrapper.appendChild(statusValue);
            statusRow.appendChild(statusLabel);
            statusRow.appendChild(statusWrapper);
            fiberBox.appendChild(statusRow);

            if (p.pairedWith) {
                const disconnectBtn = document.createElement('button');
                disconnectBtn.className = "w-full py-1 bg-red-900/50 border border-red-600 rounded text-[10px] text-red-100 hover:bg-red-900 cursor-pointer";
                disconnectBtn.innerText = "Disconnect";
                disconnectBtn.onclick = () => {
                    const paired = elements.find(el => el.id === p.pairedWith);
                    if (paired) {
                        paired.pairedWith = null;
                        paired.fiberColor = null;
                    }
                    p.pairedWith = null;
                    p.fiberColor = null;
                    draw();
                    updateUI();
                };
                fiberBox.appendChild(disconnectBtn);
            } else {
                const connectHint = document.createElement('p');
                connectHint.className = "text-[9px] text-gray-500";
                connectHint.innerText = "Ctrl+Click or Right-Click to connect to another fiber coupler";
                fiberBox.appendChild(connectHint);
            }

            btnContainer.appendChild(fiberBox);
        }

        // Board Controls
        if (p.type === 'board') {
            const lockBtn = document.createElement('button');
            lockBtn.className = `w-full py-1 text-[10px] rounded border transition mb-1 cursor-pointer ${p.locked ? 'bg-red-900/50 border-red-600 text-red-100' : 'bg-green-900/50 border-green-600 text-green-100'}`;
            lockBtn.innerText = p.locked ? 'Unlock Board' : 'Lock Board';
            lockBtn.onclick = window.toggleBoardLock;
            btnContainer.appendChild(lockBtn);

            if (!p.locked) {
                const rotBtn = document.createElement('button');
                rotBtn.className = "w-full py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] rounded border border-indigo-500 transition mb-1 cursor-pointer";
                rotBtn.innerText = "Rotate 90°";
                rotBtn.onclick = () => rotateBoard(p);
                btnContainer.appendChild(rotBtn);
            }

            const imgLabel = document.createElement('label');
            imgLabel.htmlFor = 'imgUpload';
            imgLabel.className = "block w-full py-1 bg-blue-700/50 border border-blue-600 rounded text-[10px] text-blue-100 text-center cursor-pointer mb-1 hover:bg-blue-700 select-none";
            imgLabel.innerText = "Upload Reference";
            btnContainer.appendChild(imgLabel);

            if (p.imgData) {
                const calibBtn = document.createElement('button');
                calibBtn.className = "w-full py-1 bg-yellow-600/50 border border-yellow-500 rounded text-[10px] text-yellow-100 mb-1 hover:bg-yellow-600 cursor-pointer mt-1";
                calibBtn.innerText = "Calibrate Image";
                calibBtn.onclick = window.startCalibration;
                btnContainer.appendChild(calibBtn);

                const slideDiv = document.createElement('div');
                slideDiv.className = "mt-1";
                slideDiv.innerHTML = `<label class="text-[9px] text-gray-400 block">Opacity</label><input type="range" min="0" max="1" step="0.1" value="${p.imgConfig.opacity}" class="w-full accent-blue-500 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer" oninput="window.updateOpacity(this.value)">`;
                btnContainer.appendChild(slideDiv);

                const togBtn = document.createElement('button');
                togBtn.className = "w-full py-1 bg-gray-700 border border-gray-600 rounded text-[10px] text-gray-300 mb-1 hover:bg-gray-600 mt-1 cursor-pointer";
                togBtn.innerText = p.imgConfig.visible ? "Hide Image" : "Show Image";
                togBtn.onclick = window.toggleImage;
                btnContainer.appendChild(togBtn);

                const rmBtn = document.createElement('button');
                rmBtn.className = "w-full py-1 bg-red-900/30 border border-red-800 rounded text-[10px] text-red-300 mb-1 hover:bg-red-900 cursor-pointer";
                rmBtn.innerText = "Remove Image";
                rmBtn.onclick = window.removeImage;
                btnContainer.appendChild(rmBtn);
            }
        }
    }
}

/**
 * Toggle board lock state
 */
function toggleBoardLock() {
    const p = Array.from(selection).pop();
    if (p && p.type === 'board') {
        p.locked = !p.locked;
        updateUI();
        draw();
    }
}

/**
 * Toggle image visibility
 */
function toggleImage() {
    const p = Array.from(selection).pop();
    if (p && p.type === 'board') {
        p.imgConfig.visible = !p.imgConfig.visible;
        draw();
        updateUI();
    }
}

/**
 * Remove background image
 */
function removeImage() {
    const p = Array.from(selection).pop();
    if (p && p.type === 'board') {
        p.imgData = null;
        draw();
        updateUI();
    }
}

/**
 * Update image opacity
 * @param {number} val - Opacity value (0-1)
 */
function updateOpacity(val) {
    const p = Array.from(selection).pop();
    if (p && p.type === 'board') {
        p.imgConfig.opacity = parseFloat(val);
        draw();
    }
}

/**
 * Rotate board by 90 degrees
 * @param {Object} board - Board element
 */
function rotateBoard(board) {
    if (!board || board.type !== 'board' || board.locked) return;

    const newW = board.height;
    const newH = board.width;

    if (checkBoardOverlap(board, board.x, board.y, newW, newH)) {
        alert("Cannot rotate: Collision with another board.");
        return;
    }

    const children = elements.filter(el =>
        el !== board && el.type !== 'board' &&
        getParentBoard(el) === board
    );

    children.forEach(child => {
        const dx = child.x - board.x;
        const dy = child.y - board.y;
        const newDx = -dy;
        const newDy = dx;
        child.x = board.x + newDx;
        child.y = board.y + newDy;
        child.rotation += Math.PI / 2;
    });

    board.width = newW;
    board.height = newH;

    if (board.imgData) {
        const temp = board.imgConfig.w;
        board.imgConfig.w = board.imgConfig.h;
        board.imgConfig.h = temp;
        const ix = board.imgConfig.x;
        const iy = board.imgConfig.y;
        board.imgConfig.x = -iy;
        board.imgConfig.y = ix;
    }

    draw();
}

/**
 * Trigger image upload dialog
 */
function triggerImageUpload() {
    imgUploadInput.click();
}

/**
 * Handle image upload
 * @param {HTMLInputElement} input - File input element
 */
function handleImageUpload(input) {
    const f = input.files[0];
    if (!f) return;
    const p = Array.from(selection).pop();
    if (!p || p.type !== 'board') return;

    const r = new FileReader();
    r.onload = (e) => {
        const i = new Image();
        i.onload = () => {
            p.imgData = i;
            const a = i.height / i.width;
            p.imgConfig.w = p.width;
            p.imgConfig.h = p.width * a;
            p.imgConfig.x = 0;
            p.imgConfig.y = 0;
            draw();
            updateUI();
        };
        i.src = e.target.result;
    };
    r.readAsDataURL(f);
    input.value = '';
}

/**
 * Try to auto-align element to nearest beam
 * @param {Object} element - Element to align
 */
function tryAutoAlign(element) {
    const idx = elements.indexOf(element);
    if (idx > -1) elements.splice(idx, 1);
    const rays = castRays();
    if (idx > -1) elements.splice(idx, 0, element);

    let candidates = [];
    let minDistance = 30;

    rays.forEach(ray => {
        const APx = element.x - ray.x1;
        const APy = element.y - ray.y1;
        const C = ray.x2 - ray.x1;
        const D = ray.y2 - ray.y1;
        const len_sq = C * C + D * D;
        let t = -1;
        if (len_sq !== 0) t = (APx * C + APy * D) / len_sq;

        let closestX, closestY;
        if (t < 0) { closestX = ray.x1; closestY = ray.y1; }
        else if (t > 1) { closestX = ray.x2; closestY = ray.y2; }
        else { closestX = ray.x1 + t * C; closestY = ray.y1 + t * D; }

        const dist = Math.sqrt((element.x - closestX) ** 2 + (element.y - closestY) ** 2);

        if (dist < minDistance) {
            candidates.push({ ray: ray, dist: dist });
        }
    });

    candidates.sort((a, b) => a.dist - b.dist);
    hasCycleOptions = candidates.length > 1;

    if (candidates.length > 0) {
        const selected = candidates[alignPreference % candidates.length].ray;
        const bestMatch = selected;

        const rdx = bestMatch.x2 - bestMatch.x1;
        const rdy = bestMatch.y2 - bestMatch.y1;
        const len = Math.sqrt(rdx * rdx + rdy * rdy);
        const inc = { x: rdx / len, y: rdy / len };

        if (['mirror', 'mirror-d'].includes(element.type)) {
            const cardinals = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
            let bestRot = element.rotation;
            let bestDiff = Infinity;

            cardinals.forEach(target => {
                let nx = target.x - inc.x;
                let ny = target.y - inc.y;
                const nl = Math.sqrt(nx * nx + ny * ny);

                if (nl > 0.001) {
                    nx /= nl;
                    ny /= nl;
                    if (dot({ x: nx, y: ny }, inc) < 0.05) {
                        let ang = Math.atan2(nx, -ny);
                        while (ang - element.rotation > Math.PI) ang -= 2 * Math.PI;
                        while (ang - element.rotation < -Math.PI) ang += 2 * Math.PI;
                        const diff = Math.abs(ang - element.rotation);
                        if (diff < bestDiff) { bestDiff = diff; bestRot = ang; }
                    }
                }
            });

            if (bestDiff < Math.PI / 4) {
                element.rotation = bestRot;
            }
        } else if (['splitter', 'pbs', 'aom', 'hwp', 'qwp', 'glass', 'detector', 'blocker'].includes(element.type)) {
            element.rotation = Math.round(element.rotation / (Math.PI / 2)) * (Math.PI / 2);
        }
    } else {
        hasCycleOptions = false;
    }
}

/**
 * Cycle through snap rotation options
 * @param {Object} el - Element to rotate
 * @param {Object} inc - Incoming ray direction
 */
function cycleSnapRotation(el, inc) {
    const len = Math.sqrt(inc.x * inc.x + inc.y * inc.y);
    const I = { x: inc.x / len, y: inc.y / len };
    const validAngles = [];

    if (['mirror', 'mirror-d', 'splitter', 'pbs'].includes(el.type)) {
        const cardinals = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
        cardinals.forEach(T => {
            const dotTI = dot(T, I);
            if (el.type.includes('mirror') && Math.abs(dotTI) > 0.99) return;
            let nx = T.x - I.x;
            let ny = T.y - I.y;
            const nlen = Math.sqrt(nx * nx + ny * ny);
            if (nlen > 0.001) {
                nx /= nlen;
                ny /= nlen;
                const angle = Math.atan2(nx, -ny);
                validAngles.push(angle);
                validAngles.push(angle + Math.PI);
            }
            if (!el.type.includes('mirror')) {
                const angI = Math.atan2(I.y, I.x);
                validAngles.push(angI + Math.PI / 2);
                validAngles.push(angI - Math.PI / 2);
                validAngles.push(angI + Math.PI / 4);
                validAngles.push(angI - Math.PI / 4);
            }
        });
    } else {
        const angI = Math.atan2(I.y, I.x);
        validAngles.push(angI + Math.PI / 2);
        validAngles.push(angI - Math.PI / 2);
    }

    const unique = [];
    validAngles.forEach(a => {
        let n = a % (2 * Math.PI);
        if (n < 0) n += 2 * Math.PI;
        if (!unique.some(u => Math.abs(u - n) < 0.01)) unique.push(n);
    });
    unique.sort((a, b) => a - b);

    if (unique.length === 0) return;

    let curr = el.rotation % (2 * Math.PI);
    if (curr < 0) curr += 2 * Math.PI;
    let next = unique.find(a => a > curr + 0.01);
    if (next === undefined) next = unique[0];

    el.rotation = next;
    updateUI();
}

/**
 * Add a new board to the scene
 */
function addBoard() {
    const w = parseInt(document.getElementById('boardW').value) || 600;
    const h = parseInt(document.getElementById('boardH').value) || 450;
    const t = document.getElementById('boardTitle').value || 'Board';
    const c = screenToWorld(canvas.width / 2, canvas.height / 2);
    const nx = Math.round(c.x / GRID_PITCH_MM) * GRID_PITCH_MM;
    const ny = Math.round(c.y / GRID_PITCH_MM) * GRID_PITCH_MM;
    const b = new Element('board', nx, ny, w, h, t);

    let tries = 0;
    while (checkBoardOverlap(b, b.x, b.y, b.width, b.height) && tries < 50) {
        b.x += 50;
        b.y += 50;
        tries++;
    }

    elements.push(b);
    draw();
}

/**
 * Update board size inputs from select
 */
function updateBoardInputs() {
    const s = document.getElementById('boardSizeSelect');
    if (s.value !== 'custom') {
        const [w, h] = s.value.split('x');
        document.getElementById('boardW').value = w;
        document.getElementById('boardH').value = h;
    }
}

/**
 * Delete selected elements
 */
function deleteSelected() {
    if (selection.size > 0) {
        // Before deleting, disconnect any paired fiber connections
        selection.forEach(el => {
            if ((el.type === 'fiber-coupler' || el.type === 'amplifier') && el.pairedWith) {
                const paired = elements.find(p => p.id === el.pairedWith);
                if (paired) {
                    paired.pairedWith = null;
                    paired.fiberColor = null;
                }
            }
        });
        
        elements = elements.filter(e => !selection.has(e));
        selection.clear();
        draw();
    }
}

/**
 * Clear all elements
 */
function clearAll() {
    elements = [];
    selection.clear();
    draw();
}

/**
 * Reset view to fit table
 */
function resetView() {
    view.scale = 0.5;
    view.x = (canvas.width - tableConfig.widthMM * PIXELS_PER_MM * view.scale) / 2;
    view.y = (canvas.height - tableConfig.heightMM * PIXELS_PER_MM * view.scale) / 2;
    draw();
}

/**
 * Update table size (placeholder)
 */
function updateTableSize() {
    draw();
}

/**
 * Toggle polarization visualization
 * @param {boolean} checked - Whether checkbox is checked
 */
function togglePolarization(checked) {
    showPolarization = checked;
    draw();
}


