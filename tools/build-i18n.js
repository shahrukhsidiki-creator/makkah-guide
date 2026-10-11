#!/usr/bin/env node
/* Regenerate assets/i18n/<lang>.js from the matching .json file.
 *
 * Edit the .json files — they are the readable source. Then run:
 *     node tools/build-i18n.js
 *
 * The browser loads the .js versions, because fetch() of a .json file is
 * blocked when the site is opened directly from disk (file://). A <script>
 * tag is not, so the generated .js is what makes language switching work
 * both on a web server and from a plain folder.
 *
 * Remember to bump CACHE_VERSION in sw.js afterwards.
 */
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'assets', 'i18n');
const LANGS = ['en', 'ur', 'ar', 'hi', 'id', 'bn'];

let reference = null;
let problems = 0;

for (const lang of LANGS) {
  const jsonPath = path.join(DIR, lang + '.json');
  if (!fs.existsSync(jsonPath)) { console.error(`missing ${lang}.json`); problems++; continue; }

  let data;
  try { data = JSON.parse(fs.readFileSync(jsonPath, 'utf8')); }
  catch (e) { console.error(`${lang}.json is not valid JSON: ${e.message}`); problems++; continue; }

  if (lang === 'en') reference = data;
  else if (reference) {
    const missing = Object.keys(reference).filter(k => !(k in data));
    const extra = Object.keys(data).filter(k => !(k in reference));
    if (missing.length) console.warn(`  ${lang}: ${missing.length} key(s) missing — these fall back to English`);
    if (extra.length) console.warn(`  ${lang}: ${extra.length} key(s) not in en.json — these are never used`);
  }

  const out =
    `/* Makkah Guide translations: ${lang}\n` +
    `   Generated from ${lang}.json by tools/build-i18n.js — do not edit by hand.\n` +
    `   Delivered as JS rather than JSON so the site also works when opened\n` +
    `   directly from disk (file://), where fetch() is blocked. */\n` +
    `window.MG_I18N = window.MG_I18N || {};\n` +
    `window.MG_I18N[${JSON.stringify(lang)}] = ${JSON.stringify(data, null, 1)};\n`;

  fs.writeFileSync(path.join(DIR, lang + '.js'), out);
  console.log(`${lang}: ${Object.keys(data).length} strings -> ${lang}.js`);
}

console.log(problems ? `\n${problems} problem(s)` : '\nDone. Bump CACHE_VERSION in sw.js so visitors get the update.');
