#!/usr/bin/env node
/* Generate sitemap.xml for the live site.
 *
 *   node tools/build-sitemap.js https://your-site.netlify.app
 *
 * Run it once after your first deploy, and again whenever you add a page.
 * It also writes the matching Sitemap line into robots.txt.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let base = process.argv[2];

if (!base) {
  console.error('Usage: node tools/build-sitemap.js https://your-site.netlify.app');
  process.exit(1);
}
base = base.replace(/\/+$/, '');

// Pages people should land on from search. Utility pages are left out.
const EXCLUDE = new Set(['offline.html', '404.html']);

// Rough priority: the pages with real search demand rank highest.
const PRIORITY = {
  'index.html': '1.0',
  'umrah-guide.html': '0.9',
  'hateem.html': '0.9',
  'zikr.html': '0.8',
  'ziyarat.html': '0.8',
  'hotels.html': '0.8',
  'taxi.html': '0.8',
  'shopping.html': '0.8',
  'transport.html': '0.7',
  'makkah-madinah.html': '0.7',
  'flights.html': '0.7',
  'food.html': '0.7',
  'essentials.html': '0.7',
  'tools.html': '0.6',
  'tawaf-counter.html': '0.6'
};

const today = new Date().toISOString().slice(0, 10);

const pages = fs.readdirSync(ROOT)
  .filter(f => f.endsWith('.html') && !EXCLUDE.has(f))
  .sort((a, b) => (PRIORITY[b] || '0.5') - (PRIORITY[a] || '0.5') || a.localeCompare(b));

const urls = pages.map(f => {
  const loc = (f === 'index.html') ? base + '/' : base + '/' + f;
  return '  <url>\n' +
         '    <loc>' + loc + '</loc>\n' +
         '    <lastmod>' + today + '</lastmod>\n' +
         '    <changefreq>monthly</changefreq>\n' +
         '    <priority>' + (PRIORITY[f] || '0.5') + '</priority>\n' +
         '  </url>';
}).join('\n');

fs.writeFileSync(path.join(ROOT, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + '\n</urlset>\n');

fs.writeFileSync(path.join(ROOT, 'robots.txt'),
  '# Robots — Makkah Guide\n\nUser-agent: *\nAllow: /\n\nSitemap: ' + base + '/sitemap.xml\n');

console.log('sitemap.xml written with ' + pages.length + ' pages');
console.log('robots.txt points at ' + base + '/sitemap.xml');
console.log('\nSubmit ' + base + '/sitemap.xml in Google Search Console.');
