'use strict';
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

global.window = global;
require(path.join(root, 'src_archive', 'jmo.js'));
require(path.join(root, 'src_archive', 'jmo2.js'));
require(path.join(root, 'src_archive', 'world.js'));
require(path.join(root, 'src_archive', 'zones2.js'));
require(path.join(root, 'src_archive', 'data.js'));

const J = global.JX || global.window.JX;
if (!J || !Array.isArray(J.items)) {
  console.error('Khong load duoc J.items');
  process.exit(1);
}

const web = JSON.parse(fs.readFileSync(path.join(root, 'img', 'look', 'web-jxlook.json'), 'utf8'));

let legacy = null;
try {
  const src = fs.readFileSync(path.join(root, 'js', 'jxparts.js'), 'utf8');
  const m = src.match(/window\.JXLOOK=(\{.*\});?/s);
  if (m) legacy = JSON.parse(m[1]);
} catch (e) { /* ignore */ }

function webCat(detail) {
  if (detail === 1) return 'range';
  if (detail === 0) return 'melee';
  if (detail === 2) return 'armor';
  if (detail === 7) return 'helm';
  if (detail === 10) return 'horse';
  return null;
}

console.log('=== KIEM TRA MAPPING ITEM (J.items -> web-jxlook) ===');
let totalAll = 0, mappedAll = 0, unmappedAll = 0;

for (const detail of [0, 1, 2, 7, 10]) {
  const cat = webCat(detail);
  const table = (web.res || {})[cat] || {};
  const keys = Object.keys(table).map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b);
  const list = (J.items[detail] && J.items[detail].list) || [];
  let mapped = 0, unmapped = 0;
  const sampleUnmapped = [];
  for (const it of list) {
    totalAll++;
    const key = it.p + 2;
    if (table[String(key)] != null) { mapped++; mappedAll++; }
    else { unmapped++; unmappedAll++; if (sampleUnmapped.length < 8) sampleUnmapped.push({ p: it.p, n: it.n }); }
  }
  const ranges = [];
  let rs = null;
  for (const it of list) {
    const key = it.p + 2;
    const isUn = table[String(key)] == null;
    if (isUn) { if (rs == null) rs = it.p; }
    else { if (rs != null) { ranges.push([rs, it.p - 1]); rs = null; } }
  }
  if (rs != null) ranges.push([rs, list[list.length - 1].p]);

  console.log(`\n[${J.items[detail].n}] detail=${detail} category=${cat}`);
  console.log(`  tong item: ${list.length} | mapped truc tiep: ${mapped} | unmapped: ${unmapped}`);
  console.log(`  web table keys: ${keys.length} (p+2 tu ${keys[0]} den ${keys[keys.length - 1]})`);
  if (ranges.length) {
    console.log(`  p chua map (ranges): ${ranges.map(r => r[0] === r[1] ? r[0] : `${r[0]}-${r[1]}`).join(', ')}`);
  }
  if (sampleUnmapped.length) {
    console.log(`  vi du unmapped: ${sampleUnmapped.map(x => `${x.n}(p=${x.p})`).join('; ')}`);
  }
  if (unmapped > 0 && keys.length) {
    const firstUn = list.find(it => table[String(it.p + 2)] == null);
    let nearest = null;
    for (const k of keys) { if (k <= firstUn.p + 2) nearest = k; else break; }
    const fbRow = nearest != null ? Number(table[String(nearest)]) - 2 : null;
    console.log(`  fallback nearest-key cho p=${firstUn.p}: key=${nearest} -> web row ${fbRow}`);
  }
  if (legacy && legacy.res) {
    const legKey = cat === 'range' ? 'range' : (cat === 'melee' ? 'melee' : cat);
    const legArr = legacy.res[legKey];
    if (Array.isArray(legArr)) {
      const legMissing = list.filter(it => it.p >= legArr.length || !legArr[it.p]).length;
      console.log(`  legacy mapping length=${legArr.length} | legacy-missing=${legMissing}`);
    }
  }
}

console.log('\n=== TONG ===');
console.log(`Tong item (5 nhom co web look): ${totalAll}`);
console.log(`Mapped truc tiep: ${mappedAll}`);
console.log(`Unmapped (dung fallback): ${unmappedAll}`);
console.log('\nGhi chu: fallback hien tai = nearest lower key trong web table.');
console.log('Cac p unmapped chu yeu la item cap cao (high-level) vuot pham vi sprite web.');
process.exit(0);
