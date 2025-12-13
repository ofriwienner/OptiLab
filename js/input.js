/**
 * OptiLab - Input Handlers
 * Mouse, keyboard, and wheel event handling
 */

/**
 * Initialize all input event listeners
 */
function initInputHandlers() {
    // Mouse down handler
    canvas.addEventListener('mousedown', handleMouseDown);

    // Mouse move handler
    canvas.addEventListener('mousemove', handleMouseMove);

    // Mouse up handler (window-level)
    window.addEventListener('mouseup', handleMouseUp);

    // Wheel handler
    canvas.addEventListener('wheel', handleWheel);

    // Context menu prevention
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Keyboard handlers
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Double-click handler
    canvas.addEventListener('dblclick', handleDoubleClick);

    // Image upload handler
    document.getElementById('imgUpload').addEventListener('change', (e) => handleImageUpload(e.target));

    // Rotation slider handler
    rotationSlider.addEventListener('input', (e) => {
        const p = Array.from(selection).pop();
        if (p) {
            p.rotation = toRad(parseInt(e.target.value));
            rotationValueDisplay.innerText = e.target.value + '°';
            draw();
        }
    });

    // UI Sidebar Shield
    const uiSidebar = document.getElementById('ui-sidebar');
    if (uiSidebar) {
        ['mousedown', 'mouseup', 'click'].forEach(evtType => {
            uiSidebar.addEventListener(evtType, (e) => {
                if (isDragging || isRotating || isResizing || view.isPanning || isAdjustingAxis) {
                    return;
                }
                e.stopPropagation();
            });
        });
    }
}

/**
 * Handle mouse down events
 * @param {MouseEvent} e - Mouse event
 */
function handleMouseDown(e) {
    const m = { x: e.clientX - canvas.getBoundingClientRect().left, y: e.clientY - canvas.getBoundingClientRect().top };
    lastMousePos = m;

    if (calibrationState > 0) {
        handleCalibrationClick(m);
        return;
    }

    // Pan Logic
    if (e.button === 1 || (e.button === 0 && keys[' '])) {
        view.isPanning = true;
        view.startPanX = m.x - view.x;
        view.startPanY = m.y - view.y;
        canvas.style.cursor = 'grabbing';
        return;
    }

    const w = screenToWorld(m.x, m.y);

    // Check if we're placing a pending board
    if (pendingBoard) {
        saveToHistory();
        const { width, height, title } = pendingBoard;
        
        // Snap board center so edges are between grid points
        const leftEdge = w.x - width / 2;
        const snappedLeft = Math.round(leftEdge / GRID_PITCH_MM) * GRID_PITCH_MM;
        const nx = snappedLeft + width / 2;
        
        const topEdge = w.y - height / 2;
        const snappedTop = Math.round(topEdge / GRID_PITCH_MM) * GRID_PITCH_MM;
        const ny = snappedTop + height / 2;
        
        const b = new Element('board', nx, ny, width, height, title);
        elements.push(b);
        
        // Start dragging the new board
        selection.clear();
        selection.add(b);
        isDragging = true;
        invalidBoardPlacement = false;
        dragOffsets.clear();
        dragOffsets.set(b, { dx: b.x - w.x, dy: b.y - w.y });
        
        pendingBoard = null;
        canvas.style.cursor = 'grabbing';
        updateUI();
        draw();
        return;
    }

    // Waveplate knob hit test
    const knobTarget = getWaveplateKnobHit(m);
    if (knobTarget) {
        saveToHistory();
        selection.clear();
        selection.add(knobTarget);
        axisAdjustTarget = knobTarget;
        isAdjustingAxis = true;
        canvas.style.cursor = 'grabbing';
        updateWaveplateAxisFromPoint(knobTarget, w);
        updateUI();
        draw();
        return;
    }

    // AOM toggle button hit test
    const aomToggleTarget = getAomToggleHit(m);
    if (aomToggleTarget) {
        saveToHistory();
        aomToggleTarget.aomEnabled = !isAomEnabled(aomToggleTarget);
        updateUI();
        draw();
        return;
    }

    // Fiber coupler connector pin hit test
    const fiberPinTarget = getFiberConnectorPinHit(m);
    
    // If already in connecting mode, check if clicking on another pin to complete connection
    if (isFiberConnecting && fiberConnectSource) {
        if (fiberPinTarget && fiberPinTarget !== fiberConnectSource) {
            // Complete connection to target pin
            completeFiberConnection(fiberPinTarget);
            e.preventDefault();
            return;
        } else {
            // Clicked elsewhere - cancel connection mode
            isFiberConnecting = false;
            fiberConnectSource = null;
            fiberConnectMousePos = null;
            updateUI();
            draw();
            // Don't return - allow normal click behavior
        }
    }
    
    // Start fiber connection mode when clicking on a pin
    if (fiberPinTarget && !isFiberConnecting) {
        isFiberConnecting = true;
        fiberConnectSource = fiberPinTarget;
        fiberConnectMousePos = m;
        selection.clear();
        selection.add(fiberPinTarget);
        updateUI();
        draw();
        e.preventDefault();
        return;
    }

    const primary = Array.from(selection).pop();

    if (primary) {
        // Component snap button
        if (primary.type !== 'board' && lastHitOnSelected && lastHitOnSelected.el === primary) {
            const snapLocal = primary.getSnapButtonPosition();
            const r = primary.rotation;
            const bx = primary.x + (snapLocal.x * Math.cos(r) - snapLocal.y * Math.sin(r));
            const by = primary.y + (snapLocal.x * Math.sin(r) + snapLocal.y * Math.cos(r));
            const bs = worldToScreen(bx, by);
            if ((m.x - bs.x) ** 2 + (m.y - bs.y) ** 2 < 100) {
                cycleSnapRotation(primary, lastHitOnSelected.incoming);
                draw();
                return;
            }
        }

        // Board handles
        if (primary.type === 'board' && !primary.locked) {
            const rh = primary.getResizeHandlePosition();
            const rhS = worldToScreen(primary.x + rh.x, primary.y + rh.y);

            // Resize handle
            if ((m.x - rhS.x) ** 2 + (m.y - rhS.y) ** 2 < 100) {
                saveToHistory();
                isResizing = true;
                originalBoardState = { w: primary.width, h: primary.height, x: primary.x, y: primary.y };
                let minX = primary.x - primary.width / 2;
                let minY = primary.y - primary.height / 2;
                let maxX = minX;
                let maxY = minY;
                elements.forEach(child => {
                    if (child !== primary && child.type !== 'board' && getParentBoard(child) === primary) {
                        const hw = child.width / 2 + 10;
                        const hh = child.height / 2 + 10;
                        if (child.x + hw > maxX) maxX = child.x + hw;
                        if (child.y + hh > maxY) maxY = child.y + hh;
                    }
                });
                originalBoardState.minW = Math.max(50, maxX - minX);
                originalBoardState.minH = Math.max(50, maxY - minY);
                return;
            }

            const mh = primary.getMoveHandlePosition();

            // Rotate handle
            const rotH_Screen = worldToScreen(primary.x + mh.x + 18 + 7.5, primary.y + mh.y + 7.5);
            if ((m.x - rotH_Screen.x) ** 2 + (m.y - rotH_Screen.y) ** 2 < 100) {
                rotateBoard(primary);
                return;
            }

            // Move handle
            const mhS = worldToScreen(primary.x + mh.x + 7.5, primary.y + mh.y + 7.5);
            if ((m.x - mhS.x) ** 2 + (m.y - mhS.y) ** 2 < 100) {
                saveToHistory();
                isDragging = true;
                originalBoardState = { x: primary.x, y: primary.y };
                draggedChildren.clear();
                elements.forEach(child => {
                    if (child !== primary && child.type !== 'board' && !selection.has(child) && getParentBoard(child) === primary) {
                        draggedChildren.set(child, { dx: child.x - primary.x, dy: child.y - primary.y });
                    }
                });
                dragOffsets.clear();
                dragOffsets.set(primary, { dx: primary.x - w.x, dy: primary.y - w.y });
                draw();
                return;
            }
        } else if (primary.type !== 'board') {
            // Component rotate handle
            const hl = primary.getHandlePosition();
            const hs = worldToScreen(primary.x + hl.x, primary.y + hl.y);
            if ((m.x - hs.x) ** 2 + (m.y - hs.y) ** 2 < 100) {
                saveToHistory();
                if (shiftPressed) {
                    primary.rotation -= Math.PI / 2;
                    updateUI();
                    draw();
                } else {
                    isRotating = true;
                }
                return;
            }

            // D-mirror flip button
            if (primary.type === 'mirror-d') {
                const fl = primary.getFlipButtonPosition();
                const fw = {
                    x: primary.x + (fl.x * Math.cos(primary.rotation) - fl.y * Math.sin(primary.rotation)),
                    y: primary.y + (fl.x * Math.sin(primary.rotation) + fl.y * Math.cos(primary.rotation))
                };
                const fS = worldToScreen(fw.x, fw.y);
                if ((m.x - fS.x) ** 2 + (m.y - fS.y) ** 2 < 100) {
                    saveToHistory();
                    primary.isFlipped = !primary.isFlipped;
                    updateUI();
                    draw();
                    return;
                }
            }
        }
    }

    // Selection Logic
    let clicked = null;
    const components = elements.filter(el => el.type !== 'board');
    clicked = components.reverse().find(el => {
        const dx = el.x - w.x;
        const dy = el.y - w.y;
        const r = Math.max(el.width, el.height) / 1.5;
        return (dx * dx + dy * dy) < r * r;
    });

    // Check boards if no component was clicked
    if (!clicked) {
        const boards = elements.filter(el => el.type === 'board');
        const clickedBoard = boards.reverse().find(el => {
            return w.x > el.x - el.width / 2 && w.x < el.x + el.width / 2 &&
                   w.y > el.y - el.height / 2 && w.y < el.y + el.height / 2;
        });
        
        if (clickedBoard) {
            // If board is already selected, allow dragging from anywhere on it
            if (selection.has(clickedBoard)) {
                clicked = clickedBoard;
            } else {
                // If board is not selected, don't set clicked - allow marquee selection
                // (unless shift/ctrl is pressed, then select it)
                if (shiftPressed || ctrlPressed) {
                    clicked = clickedBoard;
                }
            }
        }
    }

    if (clicked) {
        // If shift/ctrl is pressed on an unselected element, add it to selection
        // If shift/ctrl is pressed on an already-selected element with multiple items selected, deselect it
        // If shift/ctrl is pressed on an already-selected element with single selection, allow drag (for fine/free movement)
        if (shiftPressed || ctrlPressed) {
            if (!selection.has(clicked)) {
                // Add unselected element to selection
                selection.add(clicked);
            } else if (selection.size > 1) {
                // Deselect if multiple items are selected
                selection.delete(clicked);
                updateUI();
                draw();
                return;
            }
            // If already selected and only one item, allow fine movement drag to proceed
        } else {
            if (!selection.has(clicked)) {
                selection.clear();
                selection.add(clicked);
            }
        }
        
        if (clicked.type === 'board') {
            // If board is selected, allow dragging from anywhere on it
            if (selection.has(clicked)) {
                saveToHistory();
                isDragging = true;
                invalidBoardPlacement = false;
                dragOffsets.clear();
                originalBoardState = { x: clicked.x, y: clicked.y };
                draggedChildren.clear();
                
                // Collect all components on selected boards (even if they're also selected)
                // This ensures all board children move with the board
                const selectedBoards = Array.from(selection).filter(el => el.type === 'board');
                elements.forEach(child => {
                    if (child.type !== 'board') {
                        const parentBoard = getParentBoard(child);
                        if (parentBoard && selectedBoards.includes(parentBoard)) {
                            // Store relative position to the parent board
                            draggedChildren.set(child, { 
                                dx: child.x - parentBoard.x, 
                                dy: child.y - parentBoard.y,
                                parentBoard: parentBoard
                            });
                        }
                    }
                });
                
                // Set drag offsets for all selected elements
                selection.forEach(el => dragOffsets.set(el, { dx: el.x - w.x, dy: el.y - w.y }));
            } else {
                // Board not selected yet - just select it, don't drag
                isDragging = false;
            }
        } else {
            saveToHistory();
            isDragging = true;
            invalidBoardPlacement = false;
            dragOffsets.clear();
            
            // Check if any selected boards have children that need to move
            draggedChildren.clear();
            const selectedBoards = Array.from(selection).filter(el => el.type === 'board');
            if (selectedBoards.length > 0) {
                elements.forEach(child => {
                    if (child.type !== 'board' && !selection.has(child)) {
                        const parentBoard = getParentBoard(child);
                        if (parentBoard && selectedBoards.includes(parentBoard)) {
                            draggedChildren.set(child, { 
                                dx: child.x - parentBoard.x, 
                                dy: child.y - parentBoard.y,
                                parentBoard: parentBoard
                            });
                        }
                    }
                });
            }
            
            selection.forEach(el => dragOffsets.set(el, { dx: el.x - w.x, dy: el.y - w.y }));
        }
        updateUI();
    } else {
        // Clicked outside any element - deselect all
        if (!shiftPressed && !ctrlPressed) {
            selection.clear();
        }
        isSelecting = true;
        selectionRect = { x: m.x, y: m.y, w: 0, h: 0, startX: m.x, startY: m.y };
    }

    draw();
}

/**
 * Handle mouse move events
 * @param {MouseEvent} e - Mouse event
 */
function handleMouseMove(e) {
    const m = { x: e.clientX - canvas.getBoundingClientRect().left, y: e.clientY - canvas.getBoundingClientRect().top };
    lastMousePos = m;
    const w = screenToWorld(m.x, m.y);
    mouseCoordsDisplay.innerText = `X: ${Math.round(w.x)}mm Y: ${Math.round(w.y)}mm`;

    if (calibrationState > 0) return;

    // Fiber connecting
    if (isFiberConnecting && fiberConnectSource) {
        fiberConnectMousePos = m;
        draw();
        return;
    }

    if (view.isPanning) {
        view.x = m.x - view.startPanX;
        view.y = m.y - view.startPanY;
        draw();
        return;
    }

    if (isAdjustingAxis && axisAdjustTarget) {
        const changed = updateWaveplateAxisFromPoint(axisAdjustTarget, w);
        if (changed) {
            draw();
            updateUI();
        }
        return;
    }

    if (isRotating) {
        const p = Array.from(selection).pop();
        if (p) {
            const dx = w.x - p.x;
            const dy = w.y - p.y;
            let angle = Math.atan2(dy, dx);
            if (!shiftPressed) {
                const step = toRad(SNAP_ROTATION);
                angle = Math.round(angle / step) * step;
            }
            p.rotation = angle;
            updateUI();
            draw();
        }
        return;
    }

    if (isResizing) {
        const p = Array.from(selection).pop();
        if (p && p.type === 'board') {
            const oldTLx = originalBoardState.x - originalBoardState.w / 2;
            const oldTLy = originalBoardState.y - originalBoardState.h / 2;
            let newW = Math.max(originalBoardState.minW, w.x - oldTLx);
            let newH = Math.max(originalBoardState.minH, w.y - oldTLy);
            if (!shiftPressed) {
                // Round width/height to grid, then ensure edges stay between grid points (at multiples of GRID_PITCH_MM)
                newW = Math.round(newW / GRID_PITCH_MM) * GRID_PITCH_MM;
                newH = Math.round(newH / GRID_PITCH_MM) * GRID_PITCH_MM;
                // Snap top-left corner to be between grid points (at multiples of GRID_PITCH_MM)
                const snappedLeft = Math.round(oldTLx / GRID_PITCH_MM) * GRID_PITCH_MM;
                const snappedTop = Math.round(oldTLy / GRID_PITCH_MM) * GRID_PITCH_MM;
                const newCx = snappedLeft + newW / 2;
                const newCy = snappedTop + newH / 2;
                invalidBoardPlacement = checkBoardOverlap(p, newCx, newCy, newW, newH);
                p.width = newW;
                p.height = newH;
                p.x = newCx;
                p.y = newCy;
            } else {
                // Free resize - keep current top-left, just update size
                const newCx = oldTLx + newW / 2;
                const newCy = oldTLy + newH / 2;
                invalidBoardPlacement = checkBoardOverlap(p, newCx, newCy, newW, newH);
                p.width = newW;
                p.height = newH;
                p.x = newCx;
                p.y = newCy;
            }
            draw();
        }
        return;
    }

    if (isDragging) {
        let hasBoard = false;
        const selectedBoards = Array.from(selection).filter(el => el.type === 'board');
        if (selectedBoards.length > 0) {
            hasBoard = true;
            invalidBoardPlacement = false;
        }

        // First, move all selected elements
        selection.forEach(el => {
            if (el.locked) return;
            const off = dragOffsets.get(el);
            if (off) {
                const rawX = w.x + off.dx;
                const rawY = w.y + off.dy;
                let newX = rawX;
                let newY = rawY;

                // Board-Relative Snapping
                // No modifier = full grid snap
                // Ctrl/Cmd = half grid snap (fine movement)
                // Shift = free movement (no snap)
                if (el.type === 'board') {
                    // For boards, snap edges to be between grid points
                    if (shiftPressed) {
                        // Free movement - no snapping
                        newX = rawX;
                        newY = rawY;
                    } else {
                        // Calculate left and top edges
                        const leftEdge = rawX - el.width / 2;
                        const topEdge = rawY - el.height / 2;
                        
                        if (ctrlPressed) {
                            // Half grid snap - snap edges to half-grid positions
                            const snappedLeft = Math.round(leftEdge / HALF_GRID_MM) * HALF_GRID_MM;
                            const snappedTop = Math.round(topEdge / HALF_GRID_MM) * HALF_GRID_MM;
                            newX = snappedLeft + el.width / 2;
                            newY = snappedTop + el.height / 2;
                        } else {
                            // Full grid snap - snap edges to be between grid points (at multiples of GRID_PITCH_MM)
                            const snappedLeft = Math.round(leftEdge / GRID_PITCH_MM) * GRID_PITCH_MM;
                            const snappedTop = Math.round(topEdge / GRID_PITCH_MM) * GRID_PITCH_MM;
                            newX = snappedLeft + el.width / 2;
                            newY = snappedTop + el.height / 2;
                        }
                    }
                } else {
                    // For components, use existing snapping logic
                    if (shiftPressed) {
                        // Free movement - no snapping
                        newX = rawX;
                        newY = rawY;
                    } else if (ctrlPressed) {
                        // Half grid snap
                        newX = Math.round(rawX / HALF_GRID_MM) * HALF_GRID_MM;
                        newY = Math.round(rawY / HALF_GRID_MM) * HALF_GRID_MM;
                    } else {
                        // Full grid snap
                        const board = elements.find(b => b.type === 'board' && b !== el &&
                            rawX >= b.x - b.width / 2 && rawX <= b.x + b.width / 2 &&
                            rawY >= b.y - b.height / 2 && rawY <= b.y + b.height / 2);

                        if (board) {
                            const snap = getClosestGridPoint({ x: rawX, y: rawY }, board);
                            newX = snap.x;
                            newY = snap.y;
                        } else {
                            newX = Math.round((rawX - 12.5) / GRID_PITCH_MM) * GRID_PITCH_MM + 12.5;
                            newY = Math.round((rawY - 12.5) / GRID_PITCH_MM) * GRID_PITCH_MM + 12.5;
                        }
                    }
                }

                if (el.type === 'board' && checkBoardOverlap(el, newX, newY, el.width, el.height)) {
                    invalidBoardPlacement = true;
                }
                el.x = newX;
                el.y = newY;

                if (el.type === 'board') {
                    // Move all children of this board
                    draggedChildren.forEach((rel, child) => {
                        if (rel.parentBoard === el) {
                            child.x = el.x + rel.dx;
                            child.y = el.y + rel.dy;
                        }
                    });
                }

                if (selection.size === 1 && el.type !== 'board') {
                    tryAutoAlign(el);
                }
            }
        });
        
        // Move all components on selected boards that aren't already selected
        // (selected components were already moved above)
        if (selectedBoards.length > 0) {
            draggedChildren.forEach((rel, child) => {
                if (!selection.has(child) && selectedBoards.includes(rel.parentBoard)) {
                    child.x = rel.parentBoard.x + rel.dx;
                    child.y = rel.parentBoard.y + rel.dy;
                }
            });
        }
        
        draw();
        return;
    }

    if (isSelecting && selectionRect) {
        selectionRect.w = Math.abs(m.x - selectionRect.startX);
        selectionRect.h = Math.abs(m.y - selectionRect.startY);
        selectionRect.x = Math.min(m.x, selectionRect.startX);
        selectionRect.y = Math.min(m.y, selectionRect.startY);
        draw();
        return;
    }

    // If pending board, redraw to update preview
    if (pendingBoard) {
        draw();
        return;
    }

    draw();
}

/**
 * Complete fiber connection between source and target
 * Supports: fiber-coupler ↔ fiber-coupler, amplifier ↔ fiber-coupler
 * @param {Object} target - Target element (fiber coupler or amplifier)
 */
function completeFiberConnection(target) {
    if (!fiberConnectSource || !target) return;
    
    // Validate connection: amplifiers can only connect to fiber couplers, not to other amplifiers
    const sourceIsAmp = fiberConnectSource.type === 'amplifier';
    const targetIsAmp = target.type === 'amplifier';
    if (sourceIsAmp && targetIsAmp) {
        // Can't connect two amplifiers
        isFiberConnecting = false;
        fiberConnectSource = null;
        fiberConnectMousePos = null;
        return;
    }
    
    saveToHistory();
    // Unpair existing connections
    if (fiberConnectSource.pairedWith) {
        const oldPaired = elements.find(el => el.id === fiberConnectSource.pairedWith);
        if (oldPaired) {
            oldPaired.pairedWith = null;
            oldPaired.fiberColor = null;
        }
    }
    if (target.pairedWith) {
        const oldPaired = elements.find(el => el.id === target.pairedWith);
        if (oldPaired) {
            oldPaired.pairedWith = null;
            oldPaired.fiberColor = null;
        }
    }

    fiberConnectSource.fiberColor = null;
    target.fiberColor = null;

    const fiberColor = getNextFiberColor();
    fiberConnectSource.pairedWith = target.id;
    fiberConnectSource.fiberColor = fiberColor;
    target.pairedWith = fiberConnectSource.id;
    target.fiberColor = fiberColor;
    
    selection.clear();
    selection.add(fiberConnectSource);
    selection.add(target);

    // Reset fiber connecting state
    isFiberConnecting = false;
    fiberConnectSource = null;
    fiberConnectMousePos = null;
    updateUI();
    draw();
}

/**
 * Handle mouse up events
 */
function handleMouseUp() {
    // Fiber connecting mode stays active until user clicks on another pin or elsewhere
    // (handled in mousedown), so we just need to clear the mouse position tracking
    if (isFiberConnecting) {
        // Keep connecting mode active, but stop tracking mouse for line drawing
        // Connection is completed via click in handleMouseDown
        return;
    }

    // Revert invalid board placement
    if ((isResizing || isDragging) && invalidBoardPlacement) {
        const p = Array.from(selection).pop();
        if (p && originalBoardState) {
            if (isResizing) {
                p.width = originalBoardState.w;
                p.height = originalBoardState.h;
                p.x = originalBoardState.x;
                p.y = originalBoardState.y;
            } else {
                const dx = originalBoardState.x - p.x;
                const dy = originalBoardState.y - p.y;
                p.x = originalBoardState.x;
                p.y = originalBoardState.y;
                draggedChildren.forEach((rel, child) => {
                    child.x += dx;
                    child.y += dy;
                });
            }
        }
        invalidBoardPlacement = false;
    }

    draggedChildren.clear();

    // Complete marquee selection (exclude boards)
    if (isSelecting && selectionRect) {
        const isClick = selectionRect.w < 5 && selectionRect.h < 5;
        
        if (isClick) {
            // Small drag = click - check if clicking on a board to select it
            const clickWorld = screenToWorld(selectionRect.startX, selectionRect.startY);
            const boards = elements.filter(el => el.type === 'board');
            const clickedBoard = boards.reverse().find(el => {
                return clickWorld.x > el.x - el.width / 2 && clickWorld.x < el.x + el.width / 2 &&
                       clickWorld.y > el.y - el.height / 2 && clickWorld.y < el.y + el.height / 2;
            });
            if (clickedBoard) {
                if (!shiftPressed && !ctrlPressed) selection.clear();
                selection.add(clickedBoard);
            }
        } else {
            // Actual marquee drag - select components within
            // Convert selection rectangle to world coordinates
            const rectTopLeft = screenToWorld(selectionRect.x, selectionRect.y);
            const rectBottomRight = screenToWorld(selectionRect.x + selectionRect.w, selectionRect.y + selectionRect.h);
            const rectLeft = Math.min(rectTopLeft.x, rectBottomRight.x);
            const rectRight = Math.max(rectTopLeft.x, rectBottomRight.x);
            const rectTop = Math.min(rectTopLeft.y, rectBottomRight.y);
            const rectBottom = Math.max(rectTopLeft.y, rectBottomRight.y);
            
            elements.forEach(el => {
                if (el.type === 'board') {
                    // For boards, check if selection covers >= 90% of the board
                    const boardLeft = el.x - el.width / 2;
                    const boardRight = el.x + el.width / 2;
                    const boardTop = el.y - el.height / 2;
                    const boardBottom = el.y + el.height / 2;
                    
                    // Calculate intersection area
                    const intersectLeft = Math.max(rectLeft, boardLeft);
                    const intersectRight = Math.min(rectRight, boardRight);
                    const intersectTop = Math.max(rectTop, boardTop);
                    const intersectBottom = Math.min(rectBottom, boardBottom);
                    
                    if (intersectLeft < intersectRight && intersectTop < intersectBottom) {
                        const intersectArea = (intersectRight - intersectLeft) * (intersectBottom - intersectTop);
                        const boardArea = el.width * el.height;
                        const coverage = intersectArea / boardArea;
                        
                        // Select if >= 90% covered
                        if (coverage >= 0.9) {
                            selection.add(el);
                        }
                    }
                } else {
                    // For components, check if center point is within selection
                    const p = worldToScreen(el.x, el.y);
                    if (p.x >= selectionRect.x && p.x <= selectionRect.x + selectionRect.w &&
                        p.y >= selectionRect.y && p.y <= selectionRect.y + selectionRect.h) {
                        selection.add(el);
                    }
                }
            });
        }
        selectionRect = null;
    }

    isDragging = false;
    isRotating = false;
    isSelecting = false;
    isResizing = false;
    isAdjustingAxis = false;
    axisAdjustTarget = null;
    isFiberConnecting = false;
    fiberConnectSource = null;
    fiberConnectMousePos = null;
    view.isPanning = false;
    canvas.style.cursor = 'crosshair';
    updateUI();
    draw();
}

/**
 * Handle wheel events
 * @param {WheelEvent} e - Wheel event
 */
function handleWheel(e) {
    e.preventDefault();
    const zoom = 0.1;
    const m = getMousePos(e);
    const wB = screenToWorld(m.x, m.y);
    view.scale *= (e.deltaY < 0) ? (1 + zoom) : (1 - zoom);
    view.scale = Math.max(0.1, Math.min(view.scale, 5));
    const wA = screenToWorld(m.x, m.y);
    view.x += (wA.x - wB.x) * PIXELS_PER_MM * view.scale;
    view.y += (wA.y - wB.y) * PIXELS_PER_MM * view.scale;
    debugInfo.innerText = `Scale: ${Math.round(view.scale * 100)}%`;
    draw();
}

/**
 * Handle key down events
 * @param {KeyboardEvent} e - Keyboard event
 */
function handleKeyDown(e) {
    keys[e.key] = true;
    if (e.key === 'Shift') shiftPressed = true;
    if (e.key === 'Control' || e.key === 'Meta') ctrlPressed = true;

    // Escape - cancel fiber connection, pending board, or deselect all
    if (e.key === 'Escape') {
        if (isFiberConnecting) {
            isFiberConnecting = false;
            fiberConnectSource = null;
            fiberConnectMousePos = null;
        }
        if (pendingBoard) {
            pendingBoard = null;
            canvas.style.cursor = 'crosshair';
        }
        selection.clear();
        updateUI();
        draw();
        return;
    }

    // Select All (Ctrl/Cmd + A) - select all components (not boards)
    const isSelectAll = (e.key === 'a' || e.key === 'A') && (e.metaKey || e.ctrlKey);
    if (isSelectAll) {
        e.preventDefault();
        selection.clear();
        elements.forEach(el => {
            if (el.type !== 'board') {
                selection.add(el);
            }
        });
        updateUI();
        draw();
        return;
    }

    // Undo/Redo
    const isUndo = (e.key === 'z' || e.key === 'Z') && (e.metaKey || e.ctrlKey) && !e.shiftKey;
    const isRedo = (e.key === 'z' || e.key === 'Z') && (e.metaKey || e.ctrlKey) && e.shiftKey;

    if (isUndo) {
        e.preventDefault();
        undo();
        return;
    }

    if (isRedo) {
        e.preventDefault();
        redo();
        return;
    }

    // Copy/Paste
    const isCopy = (e.key === 'c' || e.key === 'C') && (e.metaKey || e.ctrlKey);
    const isPaste = (e.key === 'v' || e.key === 'V') && (e.metaKey || e.ctrlKey);

    if (isCopy && selection.size > 0) {
        e.preventDefault();
        copySelected();
        return;
    }

    if (isPaste) {
        e.preventDefault();
        pasteElements();
        return;
    }

    // Cycle Alignment Target
    if (e.key === 'q' || e.key === 'Q') {
        alignPreference++;
        const p = Array.from(selection).pop();
        if (p && ['mirror', 'mirror-d'].includes(p.type)) {
            tryAutoAlign(p);
            draw();
        }
    }

    // Rotation shortcuts
    if (selection.size > 0) {
        const p = Array.from(selection).pop();
        if (p && p.type !== 'board' && !p.locked) {
            const isCCW = shiftPressed;
            const sign = isCCW ? -1 : 1;

            if (e.key === 'r' || e.key === 'R') {
                saveToHistory();
                p.rotation += sign * Math.PI / 2;
                updateUI();
                draw();
            } else if (e.key === 't' || e.key === 'T') {
                saveToHistory();
                p.rotation += sign * Math.PI / 4;
                updateUI();
                draw();
            } else if (e.key === 's' || e.key === 'S') {
                saveToHistory();
                if (lastHitOnSelected && lastHitOnSelected.el === p) {
                    cycleSnapRotation(p, lastHitOnSelected.incoming);
                } else {
                    const idx = elements.indexOf(p);
                    if (idx > -1) elements.splice(idx, 1);
                    const rays = castRays();
                    if (idx > -1) elements.splice(idx, 0, p);

                    let bestRay = null;
                    let minDist = 50;
                    rays.forEach(ray => {
                        const APx = p.x - ray.x1;
                        const APy = p.y - ray.y1;
                        const C = ray.x2 - ray.x1;
                        const D = ray.y2 - ray.y1;
                        const len_sq = C * C + D * D;
                        if (len_sq < 0.001) return;
                        let t = (APx * C + APy * D) / len_sq;
                        let closestX, closestY;
                        if (t < 0) { closestX = ray.x1; closestY = ray.y1; }
                        else if (t > 1) { closestX = ray.x2; closestY = ray.y2; }
                        else { closestX = ray.x1 + t * C; closestY = ray.y1 + t * D; }
                        const dist = Math.sqrt((p.x - closestX) ** 2 + (p.y - closestY) ** 2);
                        if (dist < minDist) { minDist = dist; bestRay = ray; }
                    });

                    if (bestRay) {
                        const rdx = bestRay.x2 - bestRay.x1;
                        const rdy = bestRay.y2 - bestRay.y1;
                        const len = Math.sqrt(rdx * rdx + rdy * rdy);
                        if (len > 0.001) {
                            const inc = { x: rdx / len, y: rdy / len };
                            cycleSnapRotation(p, inc);
                        }
                    } else if (['mirror', 'mirror-d'].includes(p.type)) {
                        tryAutoAlign(p);
                    }
                }
                updateUI();
                draw();
            }
        }
    }

    if (selection.size > 0 && (e.key === 'Delete' || e.key === 'Backspace')) {
        deleteSelected();
    }
}

/**
 * Handle key up events
 * @param {KeyboardEvent} e - Keyboard event
 */
function handleKeyUp(e) {
    keys[e.key] = false;
    if (e.key === 'Shift') shiftPressed = false;
    if (e.key === 'Control' || e.key === 'Meta') ctrlPressed = false;
}

/**
 * Handle double-click events
 * @param {MouseEvent} e - Mouse event
 */
function handleDoubleClick(e) {
    const m = getMousePos(e);
    const w = screenToWorld(m.x, m.y);

    let hit = elements.slice().reverse().find(el => {
        if (el.type === 'board') {
            return w.x > el.x - el.width / 2 && w.x < el.x + el.width / 2 &&
                   w.y > el.y - el.height / 2 && w.y < el.y + el.height / 2;
        } else {
            const dx = el.x - w.x;
            const dy = el.y - w.y;
            const r = Math.max(el.width, el.height) / 1.5;
            return (dx * dx + dy * dy) < r * r;
        }
    });

    let isTitle = false;
    if (hit) {
        if (hit.type === 'board') {
            const titleY = hit.y - hit.height / 2;
            const titleX = hit.x - hit.width / 2;
            if (w.y < titleY && w.y > titleY - 20 && w.x > titleX && w.x < titleX + 200) {
                isTitle = true;
            }
        } else {
            isTitle = true;
        }
    }

    if (hit && isTitle) {
        const label = hit.type === 'board' ? "Enter Board Title:" : "Enter Component Label:";
        const newTitle = prompt(label, hit.title);
        if (newTitle !== null) {
            saveToHistory();
            hit.title = newTitle;
            draw();
        }
    } else {
        if (selection.size > 0) {
            saveToHistory();
        }
        selection.forEach(el => {
            el.rotation = 0;
            if (el.type === 'mirror' || el.type === 'mirror-d') el.rotation = toRad(-45);
            if (['splitter', 'pbs'].includes(el.type)) el.rotation = 0;
        });
        updateUI();
        draw();
    }
}


