const fs = require('fs');
const path = 'c:/Users/Admin/Desktop/cbsler/WEB/elektrik-direk-haritasi/public/index.html';
let html = fs.readFileSync(path, 'utf8');

// 1. Add toggle button for Header (Ribbon + Top Bar)
// Add to bottom of autocad-header
if (!html.includes('id="toggleHeaderBtn"')) {
    html = html.replace('<!-- AutoCAD Workspace (Panel + Map) -->',
        `<button id="toggleHeaderBtn" class="toggle-header-btn" title="Menüyü Gizle/Göster">▲</button>
        <!-- AutoCAD Workspace (Panel + Map) -->`);
}

// 2. Add toggle button for Properties Panel
if (!html.includes('id="togglePanelBtn"')) {
    const panelHeaderTarget = '<h2>\n                        <span>⚡</span>\n                        <span>Özellikler</span>\n                    </h2>';
    const panelHeaderReplace = `<div style="display:flex; align-items:center; gap: 8px;">
                        <button id="togglePanelBtn" class="toggle-panel-btn" title="Paneli Gizle/Göster">◀</button>
                        <h2>
                            <span>⚡</span>
                            <span>Özellikler</span>
                        </h2>
                    </div>`;
    html = html.replace(panelHeaderTarget, panelHeaderReplace);
}

fs.writeFileSync(path, html);
console.log('HTML collapse butonları eklendi');
