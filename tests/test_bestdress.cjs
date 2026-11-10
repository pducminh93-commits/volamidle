/* Test logic "Mặc đồ tốt" cho cả đội, chạy trên dữ liệu thật của game. */
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
global.window = global;

// --- dữ liệu tĩnh của game ---
require(path.join(root, 'src_archive/jmo.js'));
require(path.join(root, 'src_archive/jmo2.js'));
require(path.join(root, 'src_archive/world.js'));
require(path.join(root, 'src_archive/zones2.js'));
require(path.join(root, 'src_archive/data.js'));

const J = window.JX, W = window.JW;
const ZONES = W.zones, MON = W.mon, ZALT = W.zalt || {};
const DETAIL_SLOT = ["weapon","weapon","armor","ring","amulet","boot","belt","helm","cuff","pendant","horse"];
const SLOT_OF = {2:"armor",3:"ring",4:"amulet",5:"boot",6:"belt",7:"helm",8:"cuff",9:"pendant",10:"horse"};
const FAC = { shaolin:{id:0,n:"Thiếu Lâm",series:0,skills:[]}, emei:{id:1,n:"Nga My",series:1,skills:[]} };
const INV_MAX = 60;

// --- giả lập vài hàm engine mà module mặc đồ dùng ---
const ctx = {
  S: null, R: {dirty:false}, invDirty:false,
  reqOk: it => {
    const S = ctx.S;
    for (const [t,v] of it.req || []) {
      if (t === 36 && (S.lvl) < v) return false;
      if (t === 32 && (S.attr.str) < v) return false;
      if (t === 33 && (S.attr.dex) < v) return false;
      if (t === 34 && (S.attr.vit) < v) return false;
      if (t === 35 && (S.attr.eng) < v) return false;
      if (t === 37 && v >= 0) return false;          // khác hệ
      if (t === 39 && v >= 0 && FAC[S.fac].id !== v) return false; // khác môn phái
    }
    return true;
  },
  sexOk: it => !it.sex || it.sex === ctx.S.sex,
  weaponFits: () => true,
  eqLevel: () => ctx.S.lvl,
  heroSeries: () => FAC[ctx.S.fac].series,
  slotFor: it => { const s = DETAIL_SLOT[it.d]; return s === 'ring' ? (ctx.S.eq.ring1 ? 'ring2' : 'ring1') : s; },
  // "lực chiến" đơn giản: tổng chỉ số của món (đủ để so sánh tốt hơn / kém hơn)
  power: eq => Object.values(eq).filter(Boolean).reduce((a,it) => a + it.power, 0),
  calc: eq => eq,
  equipGain: it => {
    const S = ctx.S, slot = ctx.slotFor(it);
    const before = ctx.power(S.eq), after = ctx.power({...S.eq, [slot]: it});
    return after / Math.max(1, before) - 1;
  },
  itemRemove: it => { const i = ctx.S.inv.indexOf(it); if (i >= 0) { ctx.S.inv.splice(i,1); return true; } const b = ctx.EPBOX; const j = b.indexOf(it); if (j>=0) { b.splice(j,1); return true; } return false; },
  epBox: () => ctx.EPBOX,
  toast: msg => console.log('   [toast]', msg),
  log: msg => console.log('   [log]', msg.replace(/<[^>]+>/g,'')),
  uiSfx: () => {},
  refresh: () => {},
  save: () => {},
  stashWrite: () => {},
  sharedInventorySave: () => {},
  rosterActiveSlots: () => ctx.ACTIVE,
  rosterReadSave: slot => ctx.SAVES[slot] || null,
  rosterNormalizeState: s => s,
  rosterWriteSave: (slot, st) => { ctx.SAVES[slot] = st; },
  recalc: () => {},
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
};
Object.assign(global, ctx);
global.localStorage = ctx.localStorage;
global.FAC = FAC; global.DETAIL_SLOT = DETAIL_SLOT; global.INV_MAX = INV_MAX;
global.eqLevel = ctx.eqLevel; global.heroSeries = ctx.heroSeries; global.sexOk = ctx.sexOk;
global.reqOk = ctx.reqOk; global.weaponFits = ctx.weaponFits; global.slotFor = ctx.slotFor;
global.power = ctx.power; global.calc = ctx.calc; global.equipGain = ctx.equipGain;
global.itemRemove = ctx.itemRemove; global.epBox = ctx.epBox;
global.toast = ctx.toast; global.log = ctx.log; global.uiSfx = ctx.uiSfx; global.refresh = ctx.refresh;
global.save = ctx.save; global.stashWrite = ctx.stashWrite; global.sharedInventorySave = ctx.sharedInventorySave;
global.rosterActiveSlots = ctx.rosterActiveSlots; global.rosterReadSave = ctx.rosterReadSave;
global.rosterNormalizeState = ctx.rosterNormalizeState; global.rosterWriteSave = ctx.rosterWriteSave;
global.recalc = ctx.recalc;
global.ROSTER = { suppressCurrent: false };
global.SLOT = 0; global.SLOT_PTR = 'jxidle_slot';
global.stashRead = () => ({ st: ctx.STASH });
global.esc = s => String(s);
global.DOM = undefined;
Object.defineProperty(global, 'S', { get: () => ctx.S, set: v => { ctx.S = v; }, configurable: true });
Object.defineProperty(global, 'SLOT', { get: () => ctx.SLOTV || 0, set: v => { ctx.SLOTV = v; }, configurable: true });
Object.defineProperty(global, 'R', { get: () => ctx.R, configurable: true });
Object.defineProperty(global, 'invDirty', { get: () => ctx.invDirty, set: v => { ctx.invDirty = v; }, configurable: true });

// nạp module cần test (bỏ phần hook DOM)
const src = fs.readFileSync(path.join(root, 'js/bestdress.js'), 'utf8')
  .replace(/\/\* Bọc renderInv[\s\S]*$/, '');
const exposed = new Function(src + '\nreturn { bestDressAll, bdeDressCharacter, bdeUsable };')();
const bestDressAll = exposed.bestDressAll;

// --- dựng dữ liệu thử ---
let uid = 1;
const mkItem = (d, power, opt = {}) => ({ uid: uid++, d, n: 'Món ' + d + ' #' + uid, power, req: opt.req || [], sex: opt.sex, lock: opt.lock, base: [], mag: [] });

const chars = [0,1,2,3].map(i => ({
  fac: 'shaolin', sex: 0, lvl: 50, name: 'NV' + (i+1), eq: {}, inv: [],
  attr: { str: 0, dex: 0, vit: 0, eng: 0 }, stage: 1,
}));
ctx.SAVES = { 0: chars[0], 1: chars[1], 2: chars[2], 3: chars[3] };
ctx.ACTIVE = [0,1,2,3];
ctx.S = chars[0];
ctx.SLOTV = 0;
ctx.EPBOX = [];
ctx.STASH = { items: [] };

// mỗi nhân vật đang mặc đồ yếu
for (const c of chars) { c.eq = { armor: mkItem(2, 10), boot: mkItem(5, 8) }; }
// hành trang: đủ đồ mạnh cho từng người (12 món)
for (let i = 0; i < 12; i++) chars[0].inv.push(mkItem(i % 2 ? 2 : 5, 40 + i));
// kho rèn: 4 món mạnh
ctx.EPBOX = [mkItem(2, 60), mkItem(5, 55), mkItem(2, 58), mkItem(5, 52)];
// kho chung: 4 món mạnh nhất
ctx.STASH.items = [mkItem(2, 99), mkItem(5, 98), mkItem(2, 97), mkItem(5, 96)];
// 1 món bị khoá đang mặc -> phải giữ nguyên
chars[1].eq.armor = mkItem(2, 500, { lock: true });

console.log('TRƯỚC:');
for (const c of chars) console.log(' ', c.name, 'eq:', Object.entries(c.eq).map(([k,v]) => k + '=' + v.power).join(' '));
console.log('  hành trang:', chars[0].inv.length, '| kho rèn:', ctx.EPBOX.length, '| kho chung:', ctx.STASH.items.length);

const changed = bestDressAll();

console.log('\nSAU: tổng món thay =', changed);
for (const c of chars) console.log(' ', c.name, 'eq:', Object.entries(c.eq).map(([k,v]) => k + '=' + v.power).join(' '));
console.log('  hành trang:', chars[0].inv.length, '| kho rèn:', ctx.EPBOX.length, '| kho chung:', ctx.STASH.items.length);

// --- kiểm chứng ---
const all = [];
for (const c of chars) for (const it of Object.values(c.eq)) all.push(it);
const dup = all.length !== new Set(all).size;
const everyUpgraded = chars.every(c => Object.values(c.eq).every(it => it.power >= 40 || it.lock));
const lockKept = chars[1].eq.armor.power === 500 && chars[1].eq.armor.lock;
console.log('\nKhông món nào bị mặc trùng:', !dup);
console.log('Cả 4 nhân vật đều được nâng đồ:', everyUpgraded);
console.log('Tôn trọng đồ khoá 🔒:', lockKept);
process.exitCode = (!dup && everyUpgraded && lockKept) ? 0 : 1;
