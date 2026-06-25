/**
 * OptiLab - Component List
 * Modal panel for viewing, grouping, and exporting all optical components
 */

const COMP_TYPE_LABELS = {
    'laser':        'Laser',
    'mirror':       'Mirror',
    'mirror-d':     'D-Mirror',
    'splitter':     'Beam Splitter',
    'pbs':          'PBS',
    'aom':          'AOM',
    'lens':         'Lens',
    'hwp':          'HWP (λ/2)',
    'qwp':          'QWP (λ/4)',
    'blocker':      'Beam Blocker',
    'detector':     'Detector',
    'fiber-coupler':'Fiber Coupler',
    'amplifier':    'Amplifier',
    'iris':         'Iris',
    'twinleaf':     'Twinleaf',
    'cell':         'Cell',
    'filter':       'Filter',
    'custom':       'Custom',
};

function getComponentDisplayName(el) {
    if (el.title) return el.title;
    const label = COMP_TYPE_LABELS[el.type] || el.type;
    const sameType = elements.filter(e => e.type === el.type);
    return label + ' ' + (sameType.indexOf(el) + 1);
}

function computeLaserHitMap() {
    laserHitTracker = new Map();
    castRays();
    const result = laserHitTracker;
    laserHitTracker = null;
    return result;
}

function escH(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function openComponentListModal() {
    const existing = document.getElementById('comp-list-modal');
    if (existing) { existing.remove(); return; }

    const hitMap = computeLaserHitMap();
    const lasers = elements.filter(e => e.type === 'laser');
    const boards = elements.filter(e => e.type === 'board');
    let currentGroups = [];

    const overlay = document.createElement('div');
    overlay.id = 'comp-list-modal';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.72);display:flex;align-items:center;justify-content:center;z-index:1000;';
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };

    const modal = document.createElement('div');
    modal.className = 'bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col';
    modal.style.cssText = 'width:min(720px,95vw);max-height:82vh;';
    modal.onclick = e => e.stopPropagation();

    // Header
    const header = document.createElement('div');
    header.className = 'flex items-center justify-between px-4 py-3 border-b border-gray-700 flex-shrink-0';
    const titleEl = document.createElement('h2');
    titleEl.className = 'text-sm font-bold text-white flex items-center gap-2';
    titleEl.innerHTML = '<svg class="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>Component List';
    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = 'color:#9ca3af;font-size:1.25rem;line-height:1;cursor:pointer;width:1.5rem;height:1.5rem;display:flex;align-items:center;justify-content:center;background:none;border:none;';
    closeBtn.textContent = '×';
    closeBtn.onmousedown = e => e.stopPropagation();
    closeBtn.onclick = () => overlay.remove();
    header.appendChild(titleEl);
    header.appendChild(closeBtn);
    modal.appendChild(header);

    // Controls bar
    const controls = document.createElement('div');
    controls.className = 'flex items-center gap-2 px-4 py-2 border-b border-gray-700 bg-gray-800/50 flex-shrink-0 flex-wrap';

    function mkLabel(text) {
        const s = document.createElement('span');
        s.className = 'text-[11px] text-gray-400 whitespace-nowrap';
        s.textContent = text;
        return s;
    }
    function mkSelect(opts) {
        const sel = document.createElement('select');
        sel.className = 'bg-gray-700 border border-gray-600 rounded px-2 py-1 text-[11px] text-white cursor-pointer';
        sel.onmousedown = e => e.stopPropagation();
        opts.forEach(([v, t]) => {
            const o = document.createElement('option');
            o.value = v; o.textContent = t;
            sel.appendChild(o);
        });
        return sel;
    }

    const scopeSel = mkSelect([
        ['all', 'All Components'],
        ...boards.map(b => [String(b.id), b.title || 'Board'])
    ]);
    const groupSel = mkSelect([['board','Board'],['type','Type'],['none','None']]);

    const spacer = document.createElement('div');
    spacer.className = 'flex-1';

    const csvBtn = document.createElement('button');
    csvBtn.className = 'px-2 py-1 bg-green-800/50 border border-green-700 rounded text-[11px] text-green-200 hover:bg-green-700 cursor-pointer transition whitespace-nowrap';
    csvBtn.textContent = 'Export CSV';
    csvBtn.onmousedown = e => e.stopPropagation();

    const txtBtn = document.createElement('button');
    txtBtn.className = 'px-2 py-1 bg-blue-800/50 border border-blue-700 rounded text-[11px] text-blue-200 hover:bg-blue-700 cursor-pointer transition whitespace-nowrap';
    txtBtn.textContent = 'Export Text';
    txtBtn.onmousedown = e => e.stopPropagation();

    controls.appendChild(mkLabel('Scope:'));
    controls.appendChild(scopeSel);
    controls.appendChild(mkLabel('Group by:'));
    controls.appendChild(groupSel);
    controls.appendChild(spacer);
    controls.appendChild(csvBtn);
    controls.appendChild(txtBtn);
    modal.appendChild(controls);

    // Content
    const content = document.createElement('div');
    content.className = 'flex-1 overflow-y-auto px-4 py-2';
    modal.appendChild(content);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'px-4 py-1.5 border-t border-gray-700 text-[10px] text-gray-500 flex-shrink-0';
    modal.appendChild(footer);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    function getFilteredComps() {
        let comps = elements.filter(e => e.type !== 'board' && e.type !== 'measure');
        if (scopeSel.value !== 'all') {
            const tb = elements.find(e => String(e.id) === scopeSel.value);
            if (tb) comps = comps.filter(e => getParentBoard(e) === tb);
        }
        return comps;
    }

    function buildGroups(comps, groupBy) {
        if (groupBy === 'board') {
            const map = new Map();
            map.set(null, { label: 'No Board', items: [] });
            boards.forEach(b => map.set(b, { label: b.title || 'Board', items: [] }));
            comps.forEach(c => {
                const pb = getParentBoard(c);
                const key = (pb && boards.includes(pb)) ? pb : null;
                map.get(key).items.push(c);
            });
            return Array.from(map.values()).filter(g => g.items.length > 0);
        }
        if (groupBy === 'type') {
            const map = new Map();
            comps.forEach(c => {
                const lbl = COMP_TYPE_LABELS[c.type] || c.type;
                if (!map.has(lbl)) map.set(lbl, { label: lbl, items: [] });
                map.get(lbl).items.push(c);
            });
            return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
        }
        return [{ label: null, items: comps }];
    }

    function makeLaserCell(el) {
        const td = document.createElement('td');
        td.className = 'py-1.5';
        if (el.type === 'laser') {
            const color = el.beamColor || '#ff4444';
            td.innerHTML = '<span style="display:inline-block;width:9px;height:9px;background:' + escH(color) + ';border-radius:2px;vertical-align:middle;margin-right:4px"></span><span style="font-size:10px;color:#6b7280">Source</span>';
            return td;
        }
        const hits = hitMap.get(el.id);
        if (!hits || hits.size === 0) {
            td.innerHTML = '<span style="font-size:10px;color:#4b5563">—</span>';
            return td;
        }
        const parts = Array.from(hits).map(lid => {
            const laser = lasers.find(l => l.id === lid);
            if (!laser) return null;
            const c = escH(laser.beamColor || '#ff4444');
            const n = escH(getLaserName(laser));
            return '<span style="display:inline-flex;align-items:center;gap:3px;margin-right:6px">' +
                   '<span style="display:inline-block;width:8px;height:8px;background:' + c + ';border-radius:2px;flex-shrink:0"></span>' +
                   n + '</span>';
        }).filter(Boolean);
        td.innerHTML = parts.join('');
        return td;
    }

    function renderList() {
        const groupBy = groupSel.value;
        const comps = getFilteredComps();
        currentGroups = buildGroups(comps, groupBy);
        content.innerHTML = '';
        footer.textContent = comps.length + ' component' + (comps.length !== 1 ? 's' : '');

        if (comps.length === 0) {
            const p = document.createElement('p');
            p.className = 'text-[11px] text-gray-500 text-center py-8';
            p.textContent = 'No components found.';
            content.appendChild(p);
            return;
        }

        const showBoardCol = groupBy !== 'board';
        let first = true;

        currentGroups.forEach(group => {
            if (group.label) {
                const gh = document.createElement('div');
                gh.className = 'text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-700 pb-1' + (first ? ' mt-1' : ' mt-4');
                gh.textContent = group.label;
                content.appendChild(gh);
                first = false;
            }

            const table = document.createElement('table');
            table.className = 'w-full text-[11px] text-gray-300 mb-1';
            table.style.borderCollapse = 'collapse';

            const thead = document.createElement('thead');
            const hr = document.createElement('tr');
            const cols = ['Name', 'Type'];
            if (showBoardCol) cols.push('Board');
            cols.push('Lasers Through');
            cols.forEach(t => {
                const th = document.createElement('th');
                th.className = 'text-left py-1 pr-3 font-medium text-[10px] text-gray-500';
                th.textContent = t;
                hr.appendChild(th);
            });
            thead.appendChild(hr);
            table.appendChild(thead);

            const tbody = document.createElement('tbody');
            group.items.forEach(el => {
                const tr = document.createElement('tr');
                tr.className = 'border-t border-gray-800/40 hover:bg-gray-800/30 cursor-pointer';
                tr.title = 'Click to select on canvas';
                tr.onclick = () => {
                    selection.clear();
                    selection.add(el);
                    updateUI();
                    draw();
                    overlay.remove();
                };

                const tdName = document.createElement('td');
                tdName.className = 'py-1.5 pr-3 font-medium text-white';
                tdName.textContent = getComponentDisplayName(el);
                if (el.isFuturePlan) {
                    const badge = document.createElement('span');
                    badge.style.cssText = 'margin-left:4px;font-size:9px;color:#c084fc';
                    badge.textContent = '(future)';
                    tdName.appendChild(badge);
                }

                const tdType = document.createElement('td');
                tdType.className = 'py-1.5 pr-3 text-gray-400';
                tdType.textContent = COMP_TYPE_LABELS[el.type] || el.type;

                tr.appendChild(tdName);
                tr.appendChild(tdType);

                if (showBoardCol) {
                    const tdBoard = document.createElement('td');
                    tdBoard.className = 'py-1.5 pr-3 text-gray-400';
                    const pb = getParentBoard(el);
                    tdBoard.textContent = pb ? (pb.title || 'Board') : '—';
                    tr.appendChild(tdBoard);
                }

                tr.appendChild(makeLaserCell(el));
                tbody.appendChild(tr);
            });

            table.appendChild(tbody);
            content.appendChild(table);
        });
    }

    scopeSel.onchange = renderList;
    groupSel.onchange = renderList;

    csvBtn.onclick = () => {
        const rows = [['Name', 'Type', 'Board', 'Lasers Through']];
        currentGroups.forEach(g => g.items.forEach(el => {
            const pb = getParentBoard(el);
            const board = pb ? (pb.title || 'Board') : '';
            let lasersStr = '';
            if (el.type === 'laser') {
                lasersStr = 'Source';
            } else {
                const hits = hitMap.get(el.id);
                if (hits && hits.size > 0) {
                    lasersStr = Array.from(hits).map(lid => {
                        const l = lasers.find(x => x.id === lid);
                        return l ? getLaserName(l) : '';
                    }).filter(Boolean).join('; ');
                }
            }
            rows.push([getComponentDisplayName(el), COMP_TYPE_LABELS[el.type] || el.type, board, lasersStr]);
        }));
        const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\r\n');
        dlCompFile('component-list.csv', csv, 'text/csv');
    };

    txtBtn.onclick = () => {
        const comps = getFilteredComps().filter(el => el.type !== 'laser');
        const groupMap = new Map();
        comps.forEach(el => {
            const typeLabel = COMP_TYPE_LABELS[el.type] || el.type;
            const hits = hitMap.get(el.id);
            const laserNames = hits && hits.size > 0
                ? Array.from(hits).map(lid => { const l = lasers.find(x => x.id === lid); return l ? getLaserName(l) : null; }).filter(Boolean).sort()
                : [];
            const key = typeLabel + '\0' + laserNames.join(',');
            if (!groupMap.has(key)) groupMap.set(key, { typeLabel, laserNames, count: 0 });
            groupMap.get(key).count++;
        });
        const lines = Array.from(groupMap.values()).map(({ typeLabel, laserNames, count }) => {
            const prefix = count > 1 ? count + ' x ' : '';
            const laserPart = laserNames.length > 0 ? ' [' + laserNames.join(', ') + ']' : '';
            return prefix + typeLabel + laserPart;
        });
        const text = lines.join('\n');
        navigator.clipboard.writeText(text).then(() => {
            const orig = txtBtn.textContent;
            txtBtn.textContent = 'Copied!';
            setTimeout(() => { txtBtn.textContent = orig; }, 1500);
        }).catch(() => dlCompFile('component-list.txt', text, 'text/plain'));
    };

    renderList();
}

function dlCompFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
