// Genera public/index.html dal template: inserisce parser, esempio e l'involucro HTML completo.
const fs = require('fs');
const d = __dirname;
const parser = fs.readFileSync(d + '/parser.js', 'utf8');
const sample = fs.readFileSync(d + '/sample.txt', 'utf8').trimEnd();
let html = fs.readFileSync(d + '/app.template.html', 'utf8');

html = html.replace('/*__PARSER__*/', () => parser.replace(/<\/script/gi, '<\\/script'));
html = html.replace("/*__SAMPLE__*/''", () => JSON.stringify(sample).replace(/</g, '\\u003c'));

const headExtra = [
  '<meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
  '<meta name="theme-color" content="#0B6E66">',
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-title" content="Checklist">',
  '<link rel="manifest" href="/manifest.webmanifest">',
  '<link rel="icon" href="/icon.svg" type="image/svg+xml">',
  '<link rel="apple-touch-icon" href="/apple-touch-icon.png">'
].join('\n');

html = html.replace('<meta name="claude:viewport-fit-sides" content="cover">', () => headExtra);
html = '<!doctype html>\n<html lang="it">\n<head>\n' + html;
html = html.replace('<div class="wrap">', () => '</head>\n<body>\n<div class="wrap">');
html = html.trimEnd() + '\n</body>\n</html>\n';

fs.mkdirSync(d + '/public', { recursive: true });
fs.writeFileSync(d + '/public/index.html', html);
console.log('public/index.html', html.length, 'bytes');
