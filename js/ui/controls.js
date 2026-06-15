/**
 * OptiLab - UI Controls
 * Dynamic UI panel, buttons, and sliders
 */

const COLOR_PRESETS = [
    '#ff3232', '#ff9900', '#fbbf24', '#22c55e', '#06b6d4',
    '#3b82f6', '#a855f7', '#ec4899', '#ffffff', '#6b7280',
];

/**
 * Create a labeled color picker row
 */
function makeColorRow(label, value, onChange) {
    const container = document.createElement('div');
    container.className = "mt-1";

    const row = document.createElement('div');
    row.className = "flex items-center justify-between";
    const lbl = document.createElement('label');
    lbl.className = "text-[9px] text-gray-400";
    lbl.innerText = label;
    const inp = document.createElement('input');
    inp.type = 'color';
    inp.value = value;
    inp.className = "w-8 h-5 rounded cursor-pointer border-0 bg-transparent";
    inp.style.padding = '0';
    inp.onmousedown = e => e.stopPropagation();
    inp.oninput = e => onChange(e.target.value);
    row.appendChild(lbl);
    row.appendChild(inp);
    container.appendChild(row);

    const swatches = document.createElement('div');
    swatches.className = "flex flex-wrap gap-0.5 mt-0.5";
    COLOR_PRESETS.forEach(color => {
        const swatch = document.createElement('div');
        swatch.style.cssText = `width:13px;height:13px;background:${color};border-radius:2px;cursor:pointer;border:1px solid rgba(255,255,255,0.15);flex-shrink:0`;
        swatch.title = color;
        swatch.onmousedown = e => e.stopPropagation();
        swatch.onclick = () => { inp.value = color; onChange(color); };
        swatches.appendChild(swatch);
    });
    container.appendChild(swatches);

    return container;
}

/**
 * Get a laser's display name: custom title or "Laser N" by order
 * @param {Object} laser - Laser element
 * @returns {string}
 */
function getLaserName(laser) {
    if (laser.title) return laser.title;
    const lasers = elements.filter(e => e.type === 'laser');
    return 'Laser ' + (lasers.indexOf(laser) + 1);
}

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

            // Beam Color
            const colorRow = document.createElement('div');
            colorRow.className = "flex items-center justify-between mt-2";
            const colorLabel = document.createElement('label');
            colorLabel.className = "text-[9px] text-gray-400";
            colorLabel.innerText = "Beam Color";
            const colorInput = document.createElement('input');
            colorInput.type = "color";
            colorInput.value = p.beamColor || '#ff3232';
            colorInput.className = "w-8 h-5 rounded cursor-pointer border-0 bg-transparent";
            colorInput.style.padding = '0';
            colorInput.onmousedown = (e) => e.stopPropagation();
            colorInput.oninput = (e) => {
                p.beamColor = e.target.value;
                draw();
            };
            colorRow.appendChild(colorLabel);
            colorRow.appendChild(colorInput);
            div.appendChild(colorRow);

            // Beam Thickness
            const thickDiv = document.createElement('div');
            thickDiv.className = "mt-2";
            const thickHeader = document.createElement('div');
            thickHeader.className = "flex items-center justify-between text-[9px] text-gray-400 mb-1";
            const thickLabelSpan = document.createElement('span');
            thickLabelSpan.innerText = "Beam Thickness";
            const thickVal = document.createElement('span');
            thickVal.className = "font-mono";
            thickVal.innerText = (p.beamThickness ?? 1).toFixed(1) + '×';
            thickHeader.appendChild(thickLabelSpan);
            thickHeader.appendChild(thickVal);
            thickDiv.appendChild(thickHeader);
            const thickSlider = document.createElement('input');
            thickSlider.type = 'range';
            thickSlider.min = '0.5';
            thickSlider.max = '4';
            thickSlider.step = '0.5';
            thickSlider.value = p.beamThickness ?? 1;
            thickSlider.className = "w-full accent-red-400 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer";
            thickSlider.onmousedown = (e) => e.stopPropagation();
            thickSlider.oninput = (e) => {
                p.beamThickness = parseFloat(e.target.value);
                thickVal.innerText = p.beamThickness.toFixed(1) + '×';
                draw();
            };
            thickDiv.appendChild(thickSlider);
            div.appendChild(thickDiv);

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

        // Filter Controls
        if (p.type === 'filter') {
            const filterBox = document.createElement('div');
            filterBox.className = "mt-2 border-t border-gray-600 pt-2 space-y-1";

            const title = document.createElement('div');
            title.className = "text-[10px] uppercase text-gray-400 mb-1";
            title.innerText = "Laser Pass/Block";
            filterBox.appendChild(title);

            const lasers = elements.filter(e => e.type === 'laser');
            if (lasers.length === 0) {
                const empty = document.createElement('p');
                empty.className = "text-[9px] text-gray-500";
                empty.innerText = "No lasers in scene.";
                filterBox.appendChild(empty);
            } else {
                lasers.forEach(laser => {
                    const blocked = (p.blockedLasers || []).includes(laser.id);
                    const row = document.createElement('div');
                    row.className = "flex items-center justify-between";

                    const nameSpan = document.createElement('span');
                    nameSpan.className = "text-[10px] text-gray-300 truncate";
                    nameSpan.innerText = getLaserName(laser);

                    const btn = document.createElement('button');
                    btn.className = `text-[9px] px-2 py-0.5 rounded border cursor-pointer transition ${blocked ? 'bg-red-900/50 border-red-600 text-red-200 hover:bg-red-800' : 'bg-green-900/50 border-green-600 text-green-200 hover:bg-green-800'}`;
                    btn.innerText = blocked ? 'Blocked' : 'Pass';
                    btn.onclick = () => {
                        if (!p.blockedLasers) p.blockedLasers = [];
                        if (blocked) {
                            p.blockedLasers = p.blockedLasers.filter(id => id !== laser.id);
                        } else {
                            p.blockedLasers.push(laser.id);
                        }
                        draw();
                        updateUI();
                    };

                    row.appendChild(nameSpan);
                    row.appendChild(btn);
                    filterBox.appendChild(row);
                });
            }

            btnContainer.appendChild(filterBox);
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

        // Cell Polarization Rotation Controls
        if (p.type === 'cell') {
            const angleDeg = Math.round((p.cellAngle || 0) * 180 / Math.PI);
            const angleRow = document.createElement('div');
            angleRow.className = "flex items-center justify-between text-[10px] text-gray-300 mt-2";
            angleRow.innerHTML = `<span>Rotation Angle</span><span class="font-mono text-amber-300">${angleDeg}°</span>`;
            btnContainer.appendChild(angleRow);

            const hint = document.createElement('p');
            hint.className = "text-[9px] text-gray-500";
            hint.innerText = "Use the knob above the cell to set rotation.";
            btnContainer.appendChild(hint);

            const resetBtn = document.createElement('button');
            resetBtn.className = "w-full py-1 mt-1 bg-gray-700 border border-gray-600 rounded text-[10px] text-gray-200 hover:bg-gray-600 transition cursor-pointer";
            resetBtn.innerText = "Reset to 0°";
            resetBtn.onclick = () => { p.cellAngle = 0; draw(); updateUI(); };
            btnContainer.appendChild(resetBtn);
        }

        // Measurement Controls
        if (p.type === 'measure') {
            const measureBox = document.createElement('div');
            measureBox.className = "mt-2 border-t border-gray-600 pt-2 space-y-1";

            const mTitle = document.createElement('div');
            mTitle.className = "text-[10px] uppercase text-gray-400 mb-1";
            mTitle.innerText = "Measurement";
            measureBox.appendChild(mTitle);

            const dist = p.width;
            const label = dist >= 1000
                ? `${(dist / 1000).toFixed(3)} m`
                : dist >= 100
                    ? `${dist.toFixed(1)} mm`
                    : `${dist.toFixed(2)} mm`;

            const distRow = document.createElement('div');
            distRow.className = "flex items-center justify-between text-[10px]";
            distRow.innerHTML = `<span class="text-gray-400">Distance</span><span class="font-mono text-amber-300 text-[11px] font-bold">${label}</span>`;
            measureBox.appendChild(distRow);

            const hint = document.createElement('p');
            hint.className = "text-[9px] text-gray-500 mt-1";
            hint.innerText = "Move freely. Delete to remove.";
            measureBox.appendChild(hint);

            btnContainer.appendChild(measureBox);
        }

        // Custom Component Controls
        if (p.type === 'custom') {
            const customBox = document.createElement('div');
            customBox.className = "mt-2 border-t border-gray-600 pt-2 space-y-1";

            const sectionTitle = document.createElement('div');
            sectionTitle.className = "text-[10px] uppercase text-gray-400 mb-1";
            sectionTitle.innerText = "Custom Component";
            customBox.appendChild(sectionTitle);

            // Shape selector
            const shapeRow = document.createElement('div');
            shapeRow.className = "flex items-center justify-between";
            const shapeLabel = document.createElement('label');
            shapeLabel.className = "text-[9px] text-gray-400";
            shapeLabel.innerText = "Shape";
            const shapeSelect = document.createElement('select');
            shapeSelect.className = "bg-gray-700 border border-gray-600 rounded px-1 py-0.5 text-[10px] text-white cursor-pointer";
            shapeSelect.onmousedown = e => e.stopPropagation();
            ['rectangle', 'circle', 'triangle', 'diamond'].forEach(s => {
                const opt = document.createElement('option');
                opt.value = s;
                opt.innerText = s.charAt(0).toUpperCase() + s.slice(1);
                if ((p.customShape || 'rectangle') === s) opt.selected = true;
                shapeSelect.appendChild(opt);
            });
            shapeSelect.onchange = e => { p.customShape = e.target.value; draw(); };
            shapeRow.appendChild(shapeLabel);
            shapeRow.appendChild(shapeSelect);
            customBox.appendChild(shapeRow);

            // Size inputs
            const sizeRow = document.createElement('div');
            sizeRow.className = "flex items-center gap-1 mt-1";
            const wLabel = document.createElement('span');
            wLabel.className = "text-[9px] text-gray-400";
            wLabel.innerText = "W";
            const wInput = document.createElement('input');
            wInput.type = 'number';
            wInput.min = '5'; wInput.max = '200';
            wInput.value = Math.round(p.width);
            wInput.className = "w-14 bg-gray-700 border border-gray-600 rounded px-1 py-0.5 text-[10px] text-white";
            wInput.onmousedown = e => e.stopPropagation();
            wInput.oninput = e => { const v = parseInt(e.target.value); if (v > 0) { p.width = v; draw(); } };
            const hLabel = document.createElement('span');
            hLabel.className = "text-[9px] text-gray-400";
            hLabel.innerText = "H";
            const hInput = document.createElement('input');
            hInput.type = 'number';
            hInput.min = '5'; hInput.max = '200';
            hInput.value = Math.round(p.height);
            hInput.className = "w-14 bg-gray-700 border border-gray-600 rounded px-1 py-0.5 text-[10px] text-white";
            hInput.onmousedown = e => e.stopPropagation();
            hInput.oninput = e => { const v = parseInt(e.target.value); if (v > 0) { p.height = v; draw(); } };
            sizeRow.appendChild(wLabel); sizeRow.appendChild(wInput);
            sizeRow.appendChild(hLabel); sizeRow.appendChild(hInput);
            customBox.appendChild(sizeRow);

            const opacityRow = document.createElement('div');
            opacityRow.className = "flex items-center justify-between mt-1";
            const opacityLbl = document.createElement('span');
            opacityLbl.className = "text-[9px] text-gray-400";
            opacityLbl.innerText = "Opacity";
            const opacityInput = document.createElement('input');
            opacityInput.type = 'range';
            opacityInput.min = '0';
            opacityInput.max = '1';
            opacityInput.step = '0.05';
            opacityInput.value = p.customOpacity ?? 1;
            opacityInput.className = "w-20 accent-blue-400 cursor-pointer";
            opacityInput.onmousedown = e => e.stopPropagation();
            opacityInput.oninput = e => { p.customOpacity = parseFloat(e.target.value); draw(); };
            opacityRow.appendChild(opacityLbl);
            opacityRow.appendChild(opacityInput);
            customBox.appendChild(opacityRow);

            // Colors
            customBox.appendChild(makeColorRow('Fill', p.customColor || '#3b82f6', v => { p.customColor = v; draw(); }));
            customBox.appendChild(makeColorRow('Border', p.customBorderColor || '#93c5fd', v => { p.customBorderColor = v; draw(); }));

            // Text inside shape
            const textRow = document.createElement('div');
            textRow.className = "mt-1";
            const textLbl = document.createElement('label');
            textLbl.className = "text-[9px] text-gray-400 block mb-0.5";
            textLbl.innerText = "Shape Text";
            const textInp = document.createElement('input');
            textInp.type = 'text';
            textInp.value = p.customText || '';
            textInp.placeholder = 'Text inside shape';
            textInp.className = "w-full bg-gray-700 border border-gray-600 rounded px-1 py-0.5 text-[10px] text-white placeholder-gray-500";
            textInp.onmousedown = e => e.stopPropagation();
            textInp.oninput = e => { p.customText = e.target.value; draw(); };
            textRow.appendChild(textLbl);
            textRow.appendChild(textInp);
            customBox.appendChild(textRow);

            customBox.appendChild(makeColorRow('Text Color', p.customTextColor || '#ffffff', v => { p.customTextColor = v; draw(); }));

            // Font size + bold
            const fontRow = document.createElement('div');
            fontRow.className = "flex items-center justify-between mt-1";
            const fsLbl = document.createElement('span');
            fsLbl.className = "text-[9px] text-gray-400";
            fsLbl.innerText = "Font";
            const fsControls = document.createElement('div');
            fsControls.className = "flex items-center gap-1";
            const fsInput = document.createElement('input');
            fsInput.type = 'number';
            fsInput.min = '6'; fsInput.max = '24';
            fsInput.value = p.customFontSize || 10;
            fsInput.className = "w-12 bg-gray-700 border border-gray-600 rounded px-1 py-0.5 text-[10px] text-white";
            fsInput.onmousedown = e => e.stopPropagation();
            fsInput.oninput = e => { const v = parseInt(e.target.value); if (v > 0) { p.customFontSize = v; draw(); } };
            const boldChk = document.createElement('input');
            boldChk.type = 'checkbox';
            boldChk.checked = !!p.customFontBold;
            boldChk.title = 'Bold';
            boldChk.className = "accent-blue-400 cursor-pointer";
            boldChk.onmousedown = e => e.stopPropagation();
            boldChk.onchange = e => { p.customFontBold = e.target.checked; draw(); };
            const boldLbl = document.createElement('span');
            boldLbl.className = "text-[9px] text-gray-400 font-bold";
            boldLbl.innerText = "B";
            fsControls.appendChild(fsInput);
            fsControls.appendChild(boldChk);
            fsControls.appendChild(boldLbl);
            fontRow.appendChild(fsLbl);
            fontRow.appendChild(fsControls);
            customBox.appendChild(fontRow);

            // Save to Library button
            const saveLibBtn = document.createElement('button');
            saveLibBtn.className = "w-full py-1 mt-2 bg-indigo-700/50 border border-indigo-600 rounded text-[10px] text-indigo-100 hover:bg-indigo-700 cursor-pointer transition";
            saveLibBtn.innerText = "Save to Library";
            saveLibBtn.onclick = () => saveCustomComponentToLibrary(p);
            customBox.appendChild(saveLibBtn);

            btnContainer.appendChild(customBox);
        }

        // Future Plan Toggle
        if (p.type !== 'board') {
            const fpRow = document.createElement('div');
            fpRow.className = 'flex items-center gap-2 mb-1';
            const fpCb = document.createElement('input');
            fpCb.type = 'checkbox';
            fpCb.checked = !!p.isFuturePlan;
            fpCb.className = 'w-3.5 h-3.5 accent-purple-500 cursor-pointer';
            fpCb.onchange = () => {
                saveToHistory();
                p.isFuturePlan = fpCb.checked;
                updateUI();
                draw();
            };
            const fpLabel = document.createElement('label');
            fpLabel.textContent = 'Future Plan';
            fpLabel.className = 'text-[10px] text-gray-400 cursor-pointer select-none';
            fpLabel.onclick = () => { fpCb.checked = !fpCb.checked; fpCb.onchange(); };
            fpRow.appendChild(fpCb);
            fpRow.appendChild(fpLabel);
            btnContainer.appendChild(fpRow);
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
        saveToHistory();
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

    saveToHistory();
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

    // After rotation, snap edges to be between grid points (at multiples of GRID_PITCH_MM)
    const leftEdge = board.x - board.width / 2;
    const snappedLeft = Math.round(leftEdge / GRID_PITCH_MM) * GRID_PITCH_MM;
    board.x = snappedLeft + board.width / 2;
    
    const topEdge = board.y - board.height / 2;
    const snappedTop = Math.round(topEdge / GRID_PITCH_MM) * GRID_PITCH_MM;
    board.y = snappedTop + board.height / 2;

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
        } else if (['splitter', 'pbs', 'aom', 'hwp', 'qwp', 'detector', 'blocker'].includes(element.type)) {
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
 * Sets up pending board creation - board will be placed on next mouse click
 */
function addBoard() {
    let w = parseInt(document.getElementById('boardW').value) || 600;
    let h = parseInt(document.getElementById('boardH').value) || 450;
    const t = document.getElementById('boardTitle').value || 'Board';
    
    // Round width and height to nearest multiple of grid size
    w = Math.round(w / GRID_PITCH_MM) * GRID_PITCH_MM;
    h = Math.round(h / GRID_PITCH_MM) * GRID_PITCH_MM;
    
    // Store pending board parameters - will be created on next mouse click
    pendingBoard = { width: w, height: h, title: t };
    
    // Change cursor to indicate board placement mode
    canvas.style.cursor = 'crosshair';
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
        saveToHistory();
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
    saveToHistory();
    elements = [];
    selection.clear();
    draw();
}

/**
 * Create a new empty bench with just the main board
 */
function newBench() {
    if (confirm('Create a new empty bench? This will clear all current elements.')) {
        saveToHistory();
        elements = [];
        selection.clear();
        
        // Create default board
        const center = screenToWorld(canvas.width / 2, canvas.height / 2);
        const boardW = 325;
        const boardH = 475;
        // Snap board center so edges are between grid points (at multiples of GRID_PITCH_MM)
        const leftEdge = center.x - boardW / 2;
        const snappedLeft = Math.round(leftEdge / GRID_PITCH_MM) * GRID_PITCH_MM;
        const nx = snappedLeft + boardW / 2;
        
        const topEdge = center.y - boardH / 2;
        const snappedTop = Math.round(topEdge / GRID_PITCH_MM) * GRID_PITCH_MM;
        const ny = snappedTop + boardH / 2;
        
        const b = new Element('board', nx, ny, boardW, boardH, 'Main Board');
        elements.push(b);
        
        updateUI();
        draw();
    }
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

/**
 * Toggle intensity visualization
 * @param {boolean} checked - Whether checkbox is checked
 */
function toggleIntensity(checked) {
    showIntensity = checked;
    draw();
}


