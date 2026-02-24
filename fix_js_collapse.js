const fs = require('fs');
const path = 'c:/Users/Admin/Desktop/cbsler/WEB/elektrik-direk-haritasi/public/js/app.js';
let js = fs.readFileSync(path, 'utf8');


// Remove the entire initDraggablePanel function
js = js.replace(/function initDraggablePanel\(\) \{[\s\S]*?(?=\n\/\/ ====)/m, '');

// Append initCollapsiblePanels at the end before init
const newFn = `
// ============================================
// COLLAPSIBLE PANEL MANTIĞI (AutoCAD Edge Layout)
// ============================================
function initCollapsiblePanels() {
    const headerBtn = document.getElementById('toggleHeaderBtn');
    const headerEl = document.querySelector('.autocad-header');
    
    if (headerBtn && headerEl) {
        headerBtn.addEventListener('click', () => {
            headerEl.classList.toggle('collapsed');
            // Timeout to let css transition finish before resizing map
            setTimeout(() => { if (window.state && window.state.map) window.state.map.invalidateSize(); }, 350);
        });
    }

    const panelBtn = document.getElementById('togglePanelBtn');
    const panelEl = document.querySelector('.properties-panel');
    
    if (panelBtn && panelEl) {
        panelBtn.addEventListener('click', () => {
            panelEl.classList.toggle('collapsed');
            setTimeout(() => { if (window.state && window.state.map) window.state.map.invalidateSize(); }, 350);
        });
    }
}
`;

js = js.replace('function init() {', newFn + '\nfunction init() {');
js = js.replace('initDraggablePanel();', 'initCollapsiblePanels();');


fs.writeFileSync(path, js);
console.log('JS app updated for collapse logic');
