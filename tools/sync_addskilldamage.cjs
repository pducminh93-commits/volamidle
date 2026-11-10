/* Đồng bộ riêng các khoá addskilldamageN từ bản web sang src_archive/data.js
 *
 *   node tools/sync_addskilldamage.cjs                → báo cáo (không ghi)
 *   node tools/sync_addskilldamage.cjs --apply        → ghi, có sao lưu data.js
 *   node tools/sync_addskilldamage.cjs --only=10,141  → chỉ vài kỹ năng
 *
 * Nguyên tắc an toàn:
 *  - CHỈ thêm khoá addskilldamageN mà local đang thiếu. Không sửa trường khác, không ghi đè
 *    khoá đã có (giá trị web và local có thể lệch do nguồn dữ liệu khác nhau).
 *  - Bỏ qua mục mà kỹ năng đích (x[0]) không tồn tại trong JX.skills của local
 *    (dữ liệu web có thể trỏ tới chiêu chỉ có ở một bên).
 *  - Mọi thay đổi đều in ra để rà lại trước khi build.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CACHE = path.join(ROOT, '.tmp_web', 'game.js');
const DATA = path.join(ROOT, 'src_archive', 'data.js');
const APPLY = process.argv.includes('--apply');
const onlyArg = process.argv.find(a => a.startsWith('--only='));
const ONLY = onlyArg ? onlyArg.slice(7).split(',').map(Number).filter(Boolean) : null;

if (!fs.existsSync(CACHE)) {
  console.error('Chưa có bundle web. Chạy trước: node tools/sync_skills_web.cjs');
  process.exit(1);
}

/* ---- định nghĩa kỹ năng của web: map `skills:{...}` trong bundle ---- */
const code = fs.readFileSync(CACHE, 'utf8');
/* Map kỹ năng của web có dạng `skills:{` (khoá không ngoặc kép). Tìm mọi vị trí rồi chọn cái mở ra object có entry `2:{id:2,`. */
const start = (() => { for (let p = code.indexOf('skills:{'); p >= 0; p = code.indexOf('skills:{', p + 1)) { if (code.slice(p, p + 40).includes('2:{id:2,')) return p; } return -1; })();
if (start < 0) { console.error('Không tìm thấy map skills trong bundle web'); process.exit(1); }
let i = code.indexOf('{', start), depth = 0, end = -1;
for (let j = i; j < code.length; j++) {
  const c = code[j];
  if (c === '{') depth++;
  else if (c === '}') { depth--; if (depth === 0) { end = j; break; } }
}
const web = (0, eval)('(' + code.slice(i, end + 1) + ')');

/* ---- định nghĩa kỹ năng của local ---- */
global.window = global;
require(DATA);
const SK = global.JX.skills;

/* ---- tính phần thiếu ---- */
const plan = [];   // { id, name, add: { key: value } }
const skipped = []; // { id, key, target }
for (const id of Object.keys(web)) {
  if (ONLY && !ONLY.includes(+id)) continue;
  const w = web[id], l = SK[id];
  if (!w || !l) continue;
  const wa = w.attr || {}, la = l.attr || {};
  const add = {};
  for (const k of Object.keys(wa)) {
    if (!/^addskilldamage\d$/.test(k)) continue;
    if (la[k] !== undefined) continue;
    const arr = wa[k];
    if (!Array.isArray(arr) || !arr.length) continue;
    const targets = [...new Set(arr.map(x => x && x[0]).filter(Boolean))];
    const unknown = targets.filter(t => !SK[t]);
    if (unknown.length) { skipped.push({ id: +id, key: k, target: unknown.join(',') }); continue; }
    add[k] = arr;
  }
  if (Object.keys(add).length) plan.push({ id: +id, name: w.n, add });
}

/* ---- báo cáo ---- */
console.log('Kỹ năng cần bổ sung addskilldamageN:', plan.length);
for (const p of plan) {
  const detail = Object.entries(p.add).map(([k, v]) => `${k}→${v[0][0]} (+${v[v.length - 1][2]}% ở cấp tối đa)`).join(', ');
  console.log(`  [${p.id}] ${p.name}: ${detail}`);
}
if (skipped.length) {
  console.log('\nBỏ qua (đích không có trong dự án):', skipped.length);
  for (const s of skipped) console.log(`  [${s.id}] ${s.key} → ${s.target}`);
}
const totalKeys = plan.reduce((n, p) => n + Object.keys(p.add).length, 0);
console.log(`\nTổng: ${totalKeys} khoá trên ${plan.length} kỹ năng.`);

if (!APPLY) {
  console.log('Chạy lại với --apply để ghi (có sao lưu). Sau đó: node build_obfuscate.js');
  process.exit(0);
}
if (!plan.length) { console.log('Không có gì để ghi.'); process.exit(0); }

/* ---- ghi: chèn khoá vào cuối object `attr` của từng kỹ năng ---- */
let src = fs.readFileSync(DATA, 'utf8');
const bak = DATA + '.bak_' + Date.now();
fs.copyFileSync(DATA, bak);

function findSkillSpan(text, id) {
  const re = new RegExp('"' + id + '"\\s*:\\s*\\{\\s*"id"\\s*:\\s*' + id + '\\b');
  const m = re.exec(text);
  if (!m) return null;
  const brace = text.indexOf('{', m.index);
  let d = 0, stop = -1;
  for (let j = brace; j < text.length; j++) {
    const ch = text[j];
    if (ch === '"') { j++; while (j < text.length && text[j] !== '"') { if (text[j] === '\\') j++; j++; } continue; }
    if (ch === '{') d++;
    else if (ch === '}') { d--; if (d === 0) { stop = j + 1; break; } }
  }
  return stop < 0 ? null : [brace, stop];
}
function attrClosePos(text, from, to) {
  const seg = text.slice(from, to);
  const m = /"attr"\s*:\s*\{/.exec(seg);
  if (!m) return -1;
  let d = 0, startBrace = from + m.index + m[0].length - 1;
  for (let j = startBrace; j < to; j++) {
    const ch = text[j];
    if (ch === '"') { j++; while (j < to && text[j] !== '"') { if (text[j] === '\\') j++; j++; } continue; }
    if (ch === '{') d++;
    else if (ch === '}') { d--; if (d === 0) return j; }
  }
  return -1;
}

let written = 0;
// chèn từ id lớn xuống để vị trí các kỹ năng phía trước không bị xê dịch
const ordered = [...plan].sort((a, b) => b.id - a.id);
for (const p of ordered) {
  const span = findSkillSpan(src, p.id);
  if (!span) { console.log(`  ✘ không tìm thấy [${p.id}] trong data.js`); continue; }
  const close = attrClosePos(src, span[0], span[1]);
  if (close < 0) { console.log(`  ✘ [${p.id}] không có attr`); continue; }
  const insert = Object.entries(p.add).map(([k, v]) => `"${k}":${JSON.stringify(v)}`).join(',');
  const before = src.slice(0, close).replace(/\s+$/, '');
  const needComma = !before.endsWith('{');
  src = before + (needComma ? ',' : '') + insert + src.slice(close);
  written++;
}
fs.writeFileSync(DATA, src);
console.log(`\n✔ Đã bổ sung ${written} kỹ năng vào src_archive/data.js · sao lưu: ${path.basename(bak)}`);
console.log('→ Chạy tiếp: node build_obfuscate.js && node check_fx.cjs');
