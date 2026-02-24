const fs = require('fs');

const path = 'c:/Users/Admin/Desktop/cbsler/WEB/elektrik-direk-haritasi/public/css/style.css';
let css = fs.readFileSync(path, 'utf8');


// 1. Remove properties-panel inline hardcoded colors
css = css.replace(/\.properties-panel\s*{(.*?)}/s, (match) => {
    return `.properties-panel {
    width: 280px !important;
    background: var(--bg-sidebar) !important;
    color: var(--text-primary);
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--border-subtle) !important;
    z-index: var(--z-sidebar);
    font-family: var(--font-primary) !important;
}`;
});


// 2. Fix accordion theme
css = css.replace(/\.accordion-header\s*{(.*?)}/s, (match) => {
    return `.accordion-header {
    background: var(--bg-sidebar-header);
    color: var(--text-primary);
    font-size: 11px;
    font-weight: bold;
    padding: 6px 10px;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid var(--border-subtle);
    border-bottom: 1px solid var(--border-subtle);
    user-select: none;
    transition: background var(--transition);
}
.accordion-header:hover {
    background: var(--bg-hover);
}`;
});

// 3. Fix property row
css = css.replace(/\.property-row\s*{(.*?)}/s, () => {
    return `.property-row {
    display: flex;
    border-bottom: 1px solid var(--border-subtle);
    min-height: 24px;
}`;
});

// 4. Fix labels inside property row
css = css.replace(/\.property-row label\s*{(.*?)}/s, () => {
    return `.property-row label {
    flex: 0 0 40%;
    padding: 4px 8px;
    font-size: 11px;
    color: var(--text-secondary);
    border-right: 1px solid var(--border-subtle);
    background: var(--bg-surface);
    display: flex;
    align-items: center;
}`;
});

// 5. Fix inputs inside property row
css = css.replace(/\.property-row input,\s*\.property-row select\s*{(.*?)}/s, () => {
    return `.property-row input, 
.property-row select {
    flex: 1;
    width: 60%;
    background: transparent !important;
    border: none !important;
    color: var(--text-primary) !important;
    font-size: 11px;
    padding: 4px 6px;
    outline: none;
    font-family: var(--font-primary) !important;
}

.property-row input:focus, 
.property-row select:focus {
    background: var(--bg-hover) !important;
}`;
});

// 6. Fix full row
css = css.replace(/\.property-full-row\s*{(.*?)}/s, () => {
    return `.property-full-row {
    padding: 6px 8px;
}`;
});

css = css.replace(/\.property-full-row textarea\s*{(.*?)}/s, () => {
    return `.property-full-row textarea {
    width: 100%;
    background: var(--bg-input) !important;
    border: 1px solid var(--border-input) !important;
    color: var(--text-primary) !important;
    font-size: 11px !important;
    padding: 4px !important;
    resize: vertical;
    border-radius: 2px;
}`;
});


// 7. Autocad Edge-to-Edge Variables overrides
css = css.replace(/\.autocad-layout\s*{(.*?)}/s, () => {
    return `.autocad-layout {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
    background: var(--bg-app);
}`;
});

css = css.replace(/\.autocad-header\s*{(.*?)}/s, () => {
    return `.autocad-header {
    flex-shrink: 0;
    width: 100%;
    z-index: var(--z-topbar);
    background: var(--bg-sidebar-header);
    border-bottom: 1px solid var(--border-subtle);
    display: flex;
    flex-direction: column;
    transition: margin var(--transition-slow);
}
.autocad-header.collapsed {
    margin-top: -110px; /* Yaklaşık header yüksekliği. Menü gizlenince. */
}
`;
});


css = css.replace(/\.autocad-header \.top-ribbon\s*{(.*?)}/s, () => {
    return `.autocad-header .top-ribbon {
    position: static;
    top: auto; left: auto; right: auto; transform: none;
    width: 100%;
    padding: 8px 12px;
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border-subtle);
    border-radius: 0;
    box-shadow: none;
    justify-content: flex-start;
    flex-wrap: wrap;
}`;
});

css = css.replace(/\.autocad-workspace \.properties-panel\s*{(.*?)}/s, () => {
    return `.autocad-workspace .properties-panel {
    position: relative !important;
    top: 0 !important;
    left: 0 !important;
    height: 100% !important;
    max-height: 100% !important;
    border-radius: 0 !important;
    border: none !important;
    border-right: 1px solid var(--border-subtle) !important;
    box-shadow: var(--shadow-md) !important;
    transition: margin var(--transition-slow) !important;
}
.autocad-workspace .properties-panel.collapsed {
    margin-left: -280px !important; /* Panel genişliği kadar sola kayacak */
}
`;
});


fs.writeFileSync(path, css);
console.log('CSS başarıyla tema uyumlu hale getirildi!');
