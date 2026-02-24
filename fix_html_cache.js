const fs = require('fs');
const path = 'c:/Users/Admin/Desktop/cbsler/WEB/elektrik-direk-haritasi/public/index.html';
let html = fs.readFileSync(path, 'utf8');

const version = new Date().getTime();
html = html.replace(/<link rel="stylesheet" href="\/css\/style\.css.*?">/, `<link rel="stylesheet" href="/css/style.css?v=${version}">`);
html = html.replace(/<script type="module" src="\/js\/app\.js.*?"><\/script>/, `<script type="module" src="/js/app.js?v=${version}"></script>`);

fs.writeFileSync(path, html);
console.log('Cache busters added with version ' + version);
