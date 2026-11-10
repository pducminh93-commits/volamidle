/* Unit test combat/stats: nạp bundle thật trong VM rồi kiểm tra các hàm thuần.
 * Chạy sau `node build_obfuscate.js` (bundle trong assets/ phải mới).
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const assetsDir = path.join(root, "assets");

function findBundle(prefix) {
  const files = fs.readdirSync(assetsDir).filter((f) => f.startsWith(prefix) && f.endsWith(".bundle.js"));
  if (files.length !== 1) throw new Error(`Expected one bundle for ${prefix}, found: ${files.join(", ")}`);
  return path.join(assetsDir, files[0]);
}

const sandbox = {
  console,
  setTimeout: null,
  clearTimeout: (id) => { try { clearTimeout(id); } catch (e) {} },
  setInterval: () => 0,
  clearInterval: () => {},
  requestAnimationFrame: (fn) => { try { fn(Date.now()); } catch (e) {} },
  cancelAnimationFrame: () => {},
  performance: { now: () => Date.now() },
  Image: function () { return { complete: true, naturalWidth: 1, naturalHeight: 1, decode: () => Promise.resolve() }; },
  Audio: function () { return {}; },
  MutationObserver: function () { return { observe() {}, disconnect() {}, takeRecords() { return []; } }; },
  localStorage: (function () {
    const store = {};
    return {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
      clear: () => { for (const k in store) delete store[k]; },
    };
  })(),
  sessionStorage: (function () {
    const store = {};
    return { getItem: (k) => store[k] || null, setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
  })(),
  document: {
    createElement: () => ({ getContext: () => ({}) }),
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    body: { classList: { toggle: () => {}, add: () => {}, remove: () => {} } },
    documentElement: { style: { setProperty: () => {} } },
  },
  window: null,
  navigator: { maxTouchPoints: 0, userAgent: "node" },
  location: { href: "http://localhost/play.html", origin: "http://localhost" },
  fetch: () => Promise.resolve({ ok: true, json: async () => ({}) }),
};
sandbox.window = sandbox;
sandbox.global = sandbox;
sandbox.self = sandbox;
sandbox.addEventListener = () => {};
sandbox.removeEventListener = () => {};
const timers = [];
sandbox.setTimeout = (fn) => { timers.push(fn); return timers.length; };

const context = vm.createContext(sandbox);
const get = (expr) => vm.runInContext(expr, context);

for (const prefix of ["1.data.", "2.skills_data.", "3.engine.", "4.features."]) {
  const code = fs.readFileSync(findBundle(prefix), "utf8");
  try {
    vm.runInContext(code, context, { filename: prefix + "bundle.js" });
  } catch (err) {
    // Bundle khởi tạo DOM hook có thể lỗi trong VM; phần khai báo hàm đã chạy xong trước đó.
    console.warn(`[CẢNH BÁO] ${prefix}bundle: ${err.message}`);
  }
}
for (const fn of timers.splice(0)) { try { fn(); } catch (e) {} }

let pass = 0, fail = 0;
function ok(name, actual, expected) {
  const good = JSON.stringify(actual) === JSON.stringify(expected);
  if (good) pass++; else { fail++; console.error(`  FAIL ${name}: nhận ${JSON.stringify(actual)}, cần ${JSON.stringify(expected)}`); }
}
function truthy(name, actual) {
  if (actual) pass++; else { fail++; console.error(`  FAIL ${name}: nhận ${JSON.stringify(actual)}`); }
}

const counters = get("counters");
const applyPart = get("applyPart");
const addAttr = get("addAttr");
const lerpK = get("lerpK");
const MAX_RESIST = get("MAX_RESIST");

console.log("== Ngũ hành tương khắc ==");
ok("Kim(0) khắc Mộc(1)", counters(0, 1), true);
ok("Mộc(1) khắc Thổ(4)", counters(1, 4), true);
ok("Thổ(4) khắc Thủy(2)", counters(4, 2), true);
ok("Thủy(2) khắc Hỏa(3)", counters(2, 3), true);
ok("Hỏa(3) khắc Kim(0)", counters(3, 0), true);
ok("không tự khắc", counters(0, 0), false);
ok("ngược không khắc", counters(1, 0), false);
ok("series âm không khắc", counters(-1, 0), false);

console.log("== applyPart: sát thương sau kháng ==");
ok("kháng 0", applyPart(100, "phys", 0, -1, { phys: 0 }, 75), 100);
ok("kháng 50", applyPart(100, "phys", 0, -1, { phys: 50 }, 75), 50);
ok("kháng âm clamp -75", applyPart(100, "phys", 0, -1, { phys: -100 }, 75), 175);
ok("kháng vượt trần MAX_RESIST", applyPart(100, "phys", 0, -1, { phys: 200 }, 75), 25);
ok("kháng 95 với resMax 200", applyPart(100, "phys", 0, -1, { phys: 95 }, 200), 5);
ok("tương khắc -15 kháng", applyPart(100, "phys", 0, 1, { phys: 0 }, 75), 115);
ok("bị khắc +15 kháng", applyPart(100, "phys", 1, 0, { phys: 0 }, 75), 85);
ok("diff tuỳ chỉnh = 30", applyPart(100, "phys", 0, 1, { phys: 0 }, 75, 30), 130);
ok("MAX_RESIST = 95", MAX_RESIST, 95);

console.log("== addAttr: gộp thuộc tính và alias ==");
{
  const a = {};
  addAttr(a, "lifemax_yan_v", [10, 20, 30]);
  ok("alias lifemax_yan_v -> lifemax_v", a.lifemax_v, [10, 20, 30]);
  addAttr(a, "lifemax_v", [1, 2, 3]);
  ok("cộng dồn", a.lifemax_v, [11, 22, 33]);
  addAttr(a, "foo", [1, 2, 3], 2);
  ok("nhân hệ số", a.foo, [2, 4, 6]);
  addAttr(a, "bar", [5]);
  ok("thiếu phần tử -> 0", a.bar, [5, 0, 0]);
}

console.log("== lerpK: nội suy bảng cân bằng ==");
{
  const t = [[1, 1], [10, 1.1], [20, 2]];
  ok("đầu bảng", lerpK(t, 1), 1);
  ok("cuối bảng", lerpK(t, 20), 2);
  ok("giữa bảng", Math.round(lerpK(t, 5.5) * 1e6) / 1e6, 1.05);
  ok("vượt bảng lấy giá trị cuối", lerpK(t, 99), 2);
}

console.log(`\nKết quả: ${pass} đạt, ${fail} lỗi.`);
process.exit(fail ? 1 : 0);
