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

const COMPONENT_TYPE_BADGE_CLASSES = {
    'laser':        'bg-red-900/50 border border-red-700/50 text-red-300',
    'mirror':       'bg-cyan-900/50 border border-cyan-700/50 text-cyan-300',
    'mirror-d':     'bg-cyan-900/50 border border-cyan-700/50 text-cyan-300',
    'splitter':     'bg-yellow-900/50 border border-yellow-700/50 text-yellow-300',
    'pbs':          'bg-purple-900/50 border border-purple-700/50 text-purple-300',
    'hwp':          'bg-green-900/50 border border-green-700/50 text-green-300',
    'qwp':          'bg-orange-900/50 border border-orange-700/50 text-orange-300',
    'lens':         'bg-blue-900/50 border border-blue-700/50 text-blue-300',
    'aom':          'bg-red-900/50 border border-red-700/50 text-red-300',
    'detector':     'bg-pink-900/50 border border-pink-700/50 text-pink-300',
    'fiber-coupler':'bg-orange-900/50 border border-orange-700/50 text-orange-300',
    'amplifier':    'bg-red-900/50 border border-red-700/50 text-red-300',
    'iris':         'bg-purple-900/50 border border-purple-700/50 text-purple-300',
};

function getTypeBadgeClasses(type) {
    return COMPONENT_TYPE_BADGE_CLASSES[type] || 'bg-gray-700/50 border border-gray-600/50 text-gray-300';
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
        row.className = 'flex items-center justify-between py-2.5 border-b border-gray-800/60 gap-3';

        const left = document.createElement('div');
        left.className = 'flex items-center gap-2 min-w-0';

        const badge = document.createElement('span');
        badge.className = 'text-[10px] font-semibold px-2 py-0.5 rounded shrink-0 ' + getTypeBadgeClasses(el.type);
        badge.textContent = getComponentTypeLabel(el.type);

        const name = document.createElement('span');
        name.className = 'text-sm text-gray-100 font-medium truncate';
        name.textContent = el.title || getComponentTypeLabel(el.type);

        left.appendChild(badge);
        left.appendChild(name);

        const tags = document.createElement('div');
        tags.className = 'flex gap-1 flex-wrap justify-end shrink-0';

        if (hitLaserNames.length === 0) {
            const tag = document.createElement('span');
            tag.className = 'text-[10px] text-gray-500 px-2 py-0.5 rounded bg-gray-800';
            tag.textContent = 'no beam';
            tags.appendChild(tag);
        } else {
            hitLaserNames.forEach(laserName => {
                const tag = document.createElement('span');
                tag.className = 'text-[10px] text-blue-300 px-2 py-0.5 rounded bg-blue-900/40 border border-blue-800/50';
                tag.textContent = laserName;
                tags.appendChild(tag);
            });
        }

        row.appendChild(left);
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
