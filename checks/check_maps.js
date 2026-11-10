/* KIỂM TRA ĐỘ ĐỒNG BỘ BẢN ĐỒ / QUÁI / ICON so với bản online (s1volam.esport9.com)
 *
 * Chạy: node checks/check_maps.js
 *
 * Vì dự án đã build bundle (assets/*.bundle.js) nên sửa file nguồn trong js/ và
 * src_archive/ KHÔNG có tác dụng cho tới khi chạy lại: node build_obfuscate.js
 *
 * Script này đọc dữ liệu thật đang chạy trong game (world.js + zones2.js + jmo*.js)
 * và đối chiếu với file ảnh có trên đĩa.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
global.window = global;

require(path.join(root, 'src_archive/jmo.js'));
require(path.join(root, 'src_archive/jmo2.js'));
require(path.join(root, 'src_archive/world.js'));
require(path.join(root, 'src_archive/zones2.js'));

const JMO = window.JMO || {};
const W = window.JW || {};
const zones = W.zones || [];
const zalt = W.zalt || {};
const mon = W.mon || {};
const town = W.town || {};

const exists = p => fs.existsSync(path.join(root, p));
const report = [];
const add = (lv, msg) => report.push({ lv, msg });

/* ---------- 1. Bãi luyện công: ảnh nền + va chạm (JMO) ---------- */
const allZones = zones.concat(...Object.values(zalt));
for (const z of allZones) {
  const id = String(z.id);
  const where = `Bãi ${id} (${z.n}${z.alt ? ' · nhánh' : ''})`;
  if (!JMO[id]) add('ERR', `${where}: thiếu dữ liệu va chạm JMO -> nhân vật đi xuyên tường/núi`);
  if (!z.bg || !exists(z.bg)) add('ERR', `${where}: thiếu ảnh nền ${z.bg || '(chưa khai báo bg)'}`);
}
if (!JMO[String(town.id)]) add('ERR', `Thành thị ${town.id} (${town.n}): thiếu JMO`);
if (!exists(town.bg)) add('ERR', `Thành thị ${town.id}: thiếu ảnh nền ${town.bg}`);

/* ---------- 2. Quái: ảnh + hoạt ảnh ---------- */
const anim = W.anim || {};
for (const [id, m] of Object.entries(mon)) {
  if (m.img && !exists(m.img)) add('ERR', `Quái ${id} (${m.n}): thiếu ảnh ${m.img}`);
  const a = anim[m.anim];
  if (m.anim && !a) add('ERR', `Quái ${id} (${m.n}): thiếu bộ hoạt ảnh "${m.anim}"`);
  if (!a) continue;
  for (const [st, f] of Object.entries(a)) {
    if (f && f.f && !exists('img/a/' + f.f)) add('ERR', `Quái ${id} (${m.n}): hoạt ảnh ${m.anim}.${st} thiếu img/a/${f.f}`);
  }
}
// Boss của từng bãi phải tồn tại trong danh sách quái
for (const z of allZones) {
  if (z.boss && !mon[z.boss]) add('ERR', `Bãi ${z.id} (${z.n}): boss ${z.boss} không có trong danh sách quái`);
  for (const m of z.m || []) if (!mon[m]) add('ERR', `Bãi ${z.id} (${z.n}): quái ${m} không có trong danh sách quái`);
}

/* ---------- 3. Icon vật phẩm / kỹ năng ---------- */
const dataSrc = fs.readFileSync(path.join(root, 'src_archive/data.js'), 'utf8');
const icons = new Set([...dataSrc.matchAll(/"ic":"(img\/[^"]+)"/g)].map(m => m[1]));
const missingIcons = [...icons].filter(ic => !exists(ic));
for (const ic of missingIcons) add('ERR', `Icon thiếu: ${ic} (ô sẽ hiện trống)`);

/* ---------- 4. Map có sẵn nhưng chưa dùng ---------- */
const usedBg = new Set(allZones.map(z => path.basename(z.bg || '')).concat([path.basename(town.bg || '')]));
const zFiles = fs.readdirSync(path.join(root, 'img/z')).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
const unusedMap = zFiles.filter(f => !usedBg.has(f));
if (unusedMap.length) add('WARN', `Ảnh map có nhưng chưa gắn bãi: ${unusedMap.join(', ')}`);

/* ---------- 5. JMO sẵn có nhưng chưa làm bãi ---------- */
const zoneIds = new Set(allZones.map(z => String(z.id)));
const extraJmo = Object.keys(JMO).filter(id => !zoneIds.has(id));
if (extraJmo.length) {
  const noImg = extraJmo.filter(id => !exists(`img/z/${id}.jpg`));
  add('INFO', `JMO sẵn có, chưa thành bãi: ${extraJmo.join(', ')}` +
    (noImg.length ? ` (thiếu ảnh nền: ${noImg.join(', ')})` : ''));
}

/* ---------- 6. Bundle đã cũ so với mã nguồn chưa? ---------- */
const playHtml = fs.readFileSync(path.join(root, 'play.html'), 'utf8');
const bundles = [...playHtml.matchAll(/assets\/([\w.\-]+\.bundle\.js)/g)].map(m => m[1]);
const bundleMtime = Math.max(...bundles.map(b => fs.statSync(path.join(root, 'assets', b)).mtimeMs));
const srcDirs = ['js', 'src_archive'];
let newestSrc = 0, newestFile = '';
for (const d of srcDirs) {
  for (const f of fs.readdirSync(path.join(root, d))) {
    if (!f.endsWith('.js')) continue;
    const t = fs.statSync(path.join(root, d, f)).mtimeMs;
    if (t > newestSrc) { newestSrc = t; newestFile = `${d}/${f}`; }
  }
}
if (newestSrc > bundleMtime + 1000) {
  add('WARN', `Mã nguồn mới hơn bundle: ${newestFile} — cần chạy "node build_obfuscate.js" rồi tải lại game`);
}

/* ---------- In kết quả ---------- */
const order = { ERR: 0, WARN: 1, INFO: 2 };
report.sort((a, b) => order[a.lv] - order[b.lv]);
const color = { ERR: '\x1b[31m', WARN: '\x1b[33m', INFO: '\x1b[36m' };
for (const r of report) console.log(`${color[r.lv]}[${r.lv}]\x1b[0m ${r.msg}`);
const errs = report.filter(r => r.lv === 'ERR').length;
const warns = report.filter(r => r.lv === 'WARN').length;
console.log(`\nTổng: ${allZones.length} bãi (${zones.length} chính + ${allZones.length - zones.length} nhánh) · ` +
  `${Object.keys(mon).length} quái · ${Object.keys(JMO).length} JMO · ${icons.size} icon · ` +
  `${errs} lỗi, ${warns} cảnh báo.`);
process.exitCode = errs ? 1 : 0;
