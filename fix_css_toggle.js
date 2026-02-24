const fs = require('fs');
const path = 'c:/Users/Admin/Desktop/cbsler/WEB/elektrik-direk-haritasi/public/css/style.css';
let css = fs.readFileSync(path, 'utf8');

const tglbtnCSS = `
/* Yukarı Kapama Butonu (Ribbon) */
.toggle-header-btn {
    position: absolute;
    bottom: -16px;
    left: 50%;
    transform: translateX(-50%);
    width: 40px;
    height: 16px;
    background: var(--bg-sidebar-header);
    border: 1px solid var(--border-subtle);
    border-top: none;
    border-radius: 0 0 6px 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    font-size: 10px;
    z-index: 999;
}
.autocad-header.collapsed .toggle-header-btn {
    bottom: -16px;
    transform: translateX(-50%) rotate(180deg);
    border: 1px solid var(--border-subtle);
    border-bottom: none;
    border-radius: 6px 6px 0 0;
}

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
}
`;

css += tglbtnCSS;

// Let's also make sure position is relative for header
css = css.replace('.autocad-header {\n    flex-shrink: 0;', '.autocad-header {\n    flex-shrink: 0;\n    position: relative;');

fs.writeFileSync(path, css);
console.log('CSS toggle buton stilleri eklendi');
