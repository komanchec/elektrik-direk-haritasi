const fs = require('fs');
const path = 'c:/Users/Admin/Desktop/cbsler/WEB/elektrik-direk-haritasi/public/index.html';
let html = fs.readFileSync(path, 'utf8');

// 1. Remove toggleHeaderBtn from its current place
html = html.replace(/<button id="toggleHeaderBtn".*?<\/button>\s*/, '');

// 2. Add toggleHeaderBtn inside .autocad-header before its closing div
// Search for <div class="autocad-workspace"> to find the right spot
const workspaceIdx = html.indexOf('<div class="autocad-workspace">');

const beforeWorkspace = html.substring(0, workspaceIdx);
const afterWorkspace = html.substring(workspaceIdx);

// The closing div of autocad-header is the last </div> before autocad-workspace
const lastDivIdx = beforeWorkspace.lastIndexOf('</div>');
const fixedBefore = beforeWorkspace.substring(0, lastDivIdx) +
    '    <button id="toggleHeaderBtn" class="toggle-header-btn" title="Menüyü Gizle/Göster">▲</button>\n        </div>\n';

html = fixedBefore + afterWorkspace;

const version = new Date().getTime();
html = html.replace(/<link rel="stylesheet" href="\/css\/style\.css.*?">/, `<link rel="stylesheet" href="/css/style.css?v=${version}">`);
html = html.replace(/<script type="module" src="\/js\/app\.js.*?"><\/script>/, `<script type="module" src="/js/app.js?v=${version}"></script>`);

fs.writeFileSync(path, html);
console.log('HTML fix applied.');
