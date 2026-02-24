const fs = require('fs');

const path = 'c:/Users/Admin/Desktop/cbsler/WEB/elektrik-direk-haritasi/public/index.html';
let html = fs.readFileSync(path, 'utf8');

// Container part 1
const topBarStart = html.indexOf('<!-- Üst Bar — Dropdown Grupları -->');
const topRibbonEnd = html.indexOf('<!-- Mesafe Sonucu -->');

const topBarsHtml = html.substring(topBarStart, topRibbonEnd).trim();

// Remove from html
html = html.substring(0, topBarStart) + html.substring(topRibbonEnd);

// Replace container start
html = html.replace('<div id="container">',
    `<div id="container" class="autocad-layout">
        <!-- AutoCAD Header (Top Bar + Ribbon) -->
        <div class="autocad-header">
            ${topBarsHtml}
        </div>
        
        <!-- AutoCAD Workspace (Panel + Map) -->
        <div class="autocad-workspace">`
);

// Close workspace after map
html = html.replace('<div id="map"></div>', '<div id="map"></div>\n        </div> <!-- /autocad-workspace -->\n');

fs.writeFileSync(path, html);
console.log('HTML başarıyla güncellendi.');
