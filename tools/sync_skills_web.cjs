/* ============================================================================
 * LẤY BỘ KỸ NĂNG TỪ WEB s1volam.esport9.com
 * ----------------------------------------------------------------------------
 * Bundle `dist/game.*.js` là file CÔNG KHAI (không cần đăng nhập) và chứa toàn
 * bộ định nghĩa kỹ năng. Script này tải về, trích mọi object kỹ năng rồi so
 * TỪNG TRƯỜNG với src_archive/data.js.
 *
 *   node sync_skills_web.cjs                 → chỉ báo cáo (không sửa gì)
 *   node sync_skills_web.cjs --apply         → ghi đè data.js bằng bản web (có sao lưu)
 *   node sync_skills_web.cjs --apply --only=16,89,92   → chỉ áp cho vài kỹ năng
 *   node sync_skills_web.cjs --force         → tải lại bundle mới nhất (bỏ cache)
 *
 * Lưu ý: chỉ nên --apply cho từng nhóm kỹ năng nhỏ và build lại để thử, vì một
 * số trường (skill_skillexp_v, addskilldamage*) do engine hai bản hiểu khác nhau.
 * ========================================================================== */
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const CACHE = path.join(ROOT, '.tmp_web', 'game.js');
const DATA = path.join(ROOT, 'src_archive', 'data.js');
const APPLY = process.argv.includes('--apply');
const FORCE = process.argv.includes('--force');
const onlyArg = process.argv.find(a => a.startsWith('--only='));
const ONLY = onlyArg ? onlyArg.slice(7).split(',').map(Number).filter(Boolean) : null;

const get = url => new Promise((resolve, reject) => {
  https.get(url, res => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) return get(res.headers.location).then(resolve, reject);
    if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode + ' — ' + url));
    const b = []; res.on('data', c => b.push(c)); res.on('end', () => resolve(Buffer.concat(b).toString('utf8')));
  }).on('error', reject);
});

async function bundle() {
  if (!FORCE && fs.existsSync(CACHE) && fs.statSync(CACHE).size > 1e6) return fs.readFileSync(CACHE, 'utf8');
  const html = await get('https://s1volam.esport9.com/');
  const m = html.match(/src="(dist\/game\.[a-f0-9]+\.js[^"]*)"/);
  if (!m) throw new Error('Không thấy bundle game trên trang chủ');
  const code = await get('https://s1volam.esport9.com/' + m[1]);
  fs.mkdirSync(path.dirname(CACHE), { recursive: true });
  fs.writeFileSync(CACHE, code);
  console.log('Đã tải', m[1], (code.length / 1048576).toFixed(1) + ' MB');
  return code;
}

/* tách object kỹ năng, bỏ qua chuỗi khi đếm ngoặc */
function extract(code) {
  const out = {};
  const re = /\{id:(\d+),n:"[^"]*",d:"/g;
  let m;
  while ((m = re.exec(code))) {
    const start = m.index, id = +m[1];
    let depth = 0, end = start;
    for (let j = start; j < code.length; j++) {
      const ch = code[j];
      if (ch === '"' || ch === "'") { const q = ch; j++; while (j < code.length && code[j] !== q) { if (code[j] === '\\') j++; j++; } continue; }
      if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (depth === 0) { end = j + 1; break; } }
    }
    try { out[id] = (0, eval)('(' + code.slice(start, end) + ')'); } catch {}
  }
  return out;
}

function mine() {
  global.window = global;
  require(path.join(ROOT, 'src_archive', 'data.js'));
  return global.JX.skills;
}

function diff(a, b, p, out) {
  if (JSON.stringify(a) === JSON.stringify(b)) return out;
  const obj = v => v && typeof v === 'object';
  if (!obj(a) || !obj(b)) { out.push({ f: p, web: a, mine: b }); return out; }
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diff(a[k], b[k], p ? p + '.' + k : k, out);
  return out;
}

/* ghi đè 1 object skill trong data.js (data.js lưu dạng "id":{id:...} có ngoặc kép) */
function replaceSkill(src, id, obj) {
  // tìm "id":{id  (có thể có hoặc không ngoặc kép, có thể đứng sau { hoặc ,)
  const re = new RegExp('["\']?' + id + '["\']?\\s*:\\s*\\{\\s*["\']?id["\']?\\s*:\\s*' + id + '\\b');
  const m = re.exec(src);
  if (!m) return null;
  const brace = src.indexOf('{', m.index);
  let depth = 0, end = brace;
  for (let j = brace; j < src.length; j++) {
    const ch = src[j];
    if (ch === '"' || ch === "'") { const q = ch; j++; while (j < src.length && src[j] !== q) { if (src[j] === '\\') j++; j++; } continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) { end = j + 1; break; } }
  }
  // giữ nguyên dạng JSON có ngoặc kép như data.js
  const json = JSON.stringify(obj).replace(/"(\\w+)":/g, '"$1":');
  return src.slice(0, brace) + json + src.slice(end);
}

(async () => {
  const code = await bundle();
  const web = extract(code);
  const my = mine();
  console.log('Kỹ năng trong web:', Object.keys(web).length, '| trong dự án:', Object.keys(my).length);

  const missing = Object.keys(web).filter(id => !my[id]).map(Number);
  const extra = Object.keys(my).filter(id => !web[id]).map(Number);
  if (missing.length) console.log('⚠ Thiếu so với web:', missing.join(', '));
  if (extra.length) console.log('ℹ Chỉ có ở dự án (web không có):', extra.join(', '));

  const reports = [];
  for (const id of Object.keys(web)) {
    if (!my[id]) continue;
    if (ONLY && !ONLY.includes(+id)) continue;
    const d = diff(web[id], my[id], '', []);
    if (d.length) reports.push({ id: +id, name: web[id].n, d });
  }

  const counter = {};
  for (const r of reports) for (const x of r.d) counter[x.f] = (counter[x.f] || 0) + 1;
  console.log('\n' + reports.length + ' kỹ năng khác web.');
  console.log('Trường lệch nhiều nhất:', Object.entries(counter).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => `${k} (${v})`).join(', '));

  for (const r of reports) {
    console.log(`\n[${r.id}] ${r.name} — ${r.d.length} trường`);
    for (const x of r.d.slice(0, 8)) {
      const s = v => String(JSON.stringify(v)).slice(0, 64);
      console.log('   ' + x.f.padEnd(22) + 'web ' + s(x.web) + '\n   ' + ' '.repeat(22) + 'bạn ' + s(x.mine));
    }
    if (r.d.length > 8) console.log('   … còn ' + (r.d.length - 8) + ' trường');
  }

  if (APPLY && reports.length) {
    const bak = DATA + '.bak_' + Date.now();
    fs.copyFileSync(DATA, bak);
    let src = fs.readFileSync(DATA, 'utf8');
    let n = 0;
    for (const r of reports) { const next = replaceSkill(src, r.id, web[r.id]); if (next) { src = next; n++; } }
    fs.writeFileSync(DATA, src);
    console.log(`\n✔ Đã ghi ${n} kỹ năng vào src_archive/data.js · sao lưu: ${path.basename(bak)}`);
    console.log('→ Nhớ chạy: node build_obfuscate.js');
  } else if (reports.length) {
    console.log('\nChạy lại với --apply để ghi đè (nên dùng kèm --only=... để thử từng nhóm).');
  }
})();
