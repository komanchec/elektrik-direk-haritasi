const fs = require('fs');
const path = 'c:/Users/Admin/Desktop/cbsler/WEB/elektrik-direk-haritasi/public/index.html';
let html = fs.readFileSync(path, 'utf8');

// The marker we want to find in the HTML:
// <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
//                       <h2>

if (!html.includes('id="togglePanelBtn"')) {
    html = html.replace(/<div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">\s*<h2>/g,
        `<div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
        <button id="togglePanelBtn" class="toggle-panel-btn" title="Paneli Gizle/Göster">◀</button>
        <h2>`
    );

    const version = new Date().getTime();
    html = html.replace(/<link rel="stylesheet" href="\/css\/style\.css.*?">/, `<link rel="stylesheet" href="/css/style.css?v=${version}">`);
    html = html.replace(/<script type="module" src="\/js\/app\.js.*?"><\/script>/, `<script type="module" src="/js/app.js?v=${version}"></script>`);

    fs.writeFileSync(path, html);
    console.log('togglePanelBtn enjekte edildi!');
} else {
    console.log('Btn zaten mevcut.');
}
