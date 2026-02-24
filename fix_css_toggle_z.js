const fs = require('fs');
const path = 'c:/Users/Admin/Desktop/cbsler/WEB/elektrik-direk-haritasi/public/css/style.css';
let css = fs.readFileSync(path, 'utf8');

// Fix the overriden margin left issue
const panelReplace = `
/* Sola Kapama (Properties Panel) Butonu */
.toggle-panel-btn {
    background: transparent;
    border: 1px solid var(--border-subtle);
    color: var(--text-secondary);
    border-radius: 3px;
    padding: 2px 6px;
    cursor: pointer;
    font-size: 10px;
    transition: transform var(--transition);
}
.properties-panel.collapsed .toggle-panel-btn {
    position: absolute;
    right: -24px;
    top: 10px;
    background: var(--bg-sidebar-header);
    transform: rotate(180deg);
    z-index: 1000;
}
`;

css = css.replace(/\/\* Sola Kapama \(Properties Panel\) Butonu \*\/[\s\S]*?(?=$)/, panelReplace.trim());

// We need to change the autcad layout of the properties panel to allow absolute movement instead of margin if margin fails
// Wait, margin-left: -280px should work if transition: margin-left is specified
css = css.replace('transition: margin var(--transition-slow) !important;', 'transition: margin-left var(--transition-slow) cubic-bezier(0.4, 0, 0.2, 1) !important;');

fs.writeFileSync(path, css);
console.log('Toggle CSS güncellendi.');
