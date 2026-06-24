const COMPONENT_TYPE_LABELS = {
    'mirror': 'Mirror',
    'mirror-d': 'D-Mirror',
    'splitter': 'Splitter',
    'pbs': 'PBS',
    'aom': 'AOM',
    'lens': 'Lens',
    'hwp': 'HWP',
    'qwp': 'QWP',
    'blocker': 'Blocker',
    'detector': 'Detector',
    'fiber-coupler': 'Fiber',
    'amplifier': 'Amplifier',
    'iris': 'Iris',
    'twinleaf': 'Twinleaf',
    'cell': 'Cell',
    'filter': 'Filter',
    'custom': 'Custom',
};

function getComponentTypeLabel(type) {
    return COMPONENT_TYPE_LABELS[type] || type;
}

function openComponentListModal() {
    castRays();
    document.getElementById('component-list-modal').classList.remove('hidden');
    renderComponentList();
}

function closeComponentListModal() {
    document.getElementById('component-list-modal').classList.add('hidden');
}

function renderComponentList() {
    const lasers = elements.filter(e => e.type === 'laser');
    const body = document.getElementById('component-list-body');
    body.innerHTML = '';

    const listed = elements.filter(e =>
        e.type !== 'laser' && e.type !== 'board' && e.type !== 'measure'
    );

    if (listed.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'text-gray-400 text-[11px] text-center py-4';
        empty.textContent = 'No components on the bench';
        body.appendChild(empty);
        return;
    }

    listed.forEach(el => {
        const hitLaserIds = laserHitMap.get(el.id) || new Set();
        const hitLaserNames = lasers
            .filter(l => hitLaserIds.has(l.id))
            .map(l => getLaserName(l));

        const row = document.createElement('div');
        row.className = 'flex items-center justify-between py-1.5 border-b border-gray-800/60 gap-2';

        const name = document.createElement('span');
        name.className = 'text-[11px] text-gray-200 shrink-0';
        name.textContent = el.title || getComponentTypeLabel(el.type);

        const tags = document.createElement('div');
        tags.className = 'flex gap-1 flex-wrap justify-end';

        if (hitLaserNames.length === 0) {
            const tag = document.createElement('span');
            tag.className = 'text-[9px] text-gray-500 px-1.5 py-0.5 rounded bg-gray-800';
            tag.textContent = 'no beam';
            tags.appendChild(tag);
        } else {
            hitLaserNames.forEach(laserName => {
                const tag = document.createElement('span');
                tag.className = 'text-[9px] text-blue-300 px-1.5 py-0.5 rounded bg-blue-900/40 border border-blue-800/50';
                tag.textContent = laserName;
                tags.appendChild(tag);
            });
        }

        row.appendChild(name);
        row.appendChild(tags);
        body.appendChild(row);
    });
}

function exportComponentList() {
    const lasers = elements.filter(e => e.type === 'laser');
    const listed = elements.filter(e =>
        e.type !== 'laser' && e.type !== 'board' && e.type !== 'measure'
    );

    // Group by (typeLabel, sortedLaserNames) -> count
    const counts = new Map();
    listed.forEach(el => {
        const hitLaserIds = laserHitMap.get(el.id) || new Set();
        const hitLaserNames = lasers
            .filter(l => hitLaserIds.has(l.id))
            .map(l => getLaserName(l))
            .sort();
        const typeLabel = getComponentTypeLabel(el.type);
        const key = typeLabel + '|' + hitLaserNames.join('\0');
        counts.set(key, { count: (counts.get(key)?.count || 0) + 1, typeLabel, laserNames: hitLaserNames });
    });

    const lines = [];
    counts.forEach(({ count, typeLabel, laserNames }) => {
        const prefix = count > 1 ? `${count} x ` : '';
        const suffix = laserNames.length > 0 ? ` [${laserNames.join(', ')}]` : '';
        lines.push(prefix + typeLabel + suffix);
    });

    const text = lines.join('\n');

    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('export-component-list-btn');
        const orig = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = orig; }, 1500);
    }).catch(() => {
        prompt('Copy the component list:', text);
    });
}
