const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const assetsDir = path.join(root, 'assets');

function findBundle(prefix) {
  const files = fs.readdirSync(assetsDir).filter(f => f.startsWith(prefix) && f.endsWith('.bundle.js'));
  if (files.length !== 1) throw new Error(`Expected one bundle for ${prefix}, found: ${files.join(', ')}`);
  return path.join(assetsDir, files[0]);
}

const bundles = [
  findBundle('1.data.'),
  findBundle('2.skills_data.'),
  findBundle('3.engine.'),
  findBundle('4.features.'),
];

const sandbox = {
  console,
  setTimeout: null,
  clearTimeout: (id) => { try { clearTimeout(id); } catch (e) {} },
  setInterval: () => 0,
  clearInterval: () => {},
  requestAnimationFrame: (fn) => { try { fn(Date.now()); } catch (e) { /* ignore */ } },
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
  navigator: { maxTouchPoints: 0, userAgent: 'node' },
  location: { href: 'http://localhost/play.html', origin: 'http://localhost' },
  fetch: () => Promise.resolve({ ok: true, json: async () => ({}) }),
};

sandbox.window = sandbox;
sandbox.global = sandbox;
sandbox.self = sandbox;
sandbox.__tdz = [];
sandbox.__timers = [];
let __timerId = 1;

function isTdzError(err) {
  const msg = String(err && err.message ? err.message : err);
  return /Cannot access .* before initialization/i.test(msg);
}

sandbox.setTimeout = (fn, delay) => {
  const id = __timerId++;
  sandbox.__timers.push({ id, fn, delay: typeof delay === 'number' ? delay : 0 });
  return id;
};
sandbox.__flushTimers = () => {
  const timers = sandbox.__timers.slice();
  sandbox.__timers = [];
  for (const t of timers) {
    try { t.fn(); } catch (e) {
      if (isTdzError(e)) sandbox.__tdz.push(String(e.message));
    }
  }
};

const context = vm.createContext(sandbox);

(async function run() {
  const errors = [];
  for (const bundle of bundles) {
    try {
      const code = fs.readFileSync(bundle, 'utf8');
      vm.runInContext(code, context, { filename: path.basename(bundle) });
    } catch (err) {
      if (isTdzError(err)) errors.push({ bundle: path.basename(bundle), stage: 'load', message: err.message });
      else console.warn(`[WARN] ${path.basename(bundle)}: ${err.message}`);
    }
  }

  // Flush delayed timers after initialization
  if (typeof sandbox.__flushTimers === 'function') sandbox.__flushTimers();
  for (const m of sandbox.__tdz) errors.push({ bundle: '(timer)', stage: 'setTimeout', message: m });
  sandbox.__tdz = [];

  const initFirst = ['init'];
  for (const name of initFirst) {
    const fn = context[name];
    if (typeof fn !== 'function') continue;
    try { fn(); } catch (err) { if (isTdzError(err)) errors.push({ bundle: '(runtime)', stage: name, message: err.message }); }
  }

  const calls = ['calc', 'horseAttr', 'horseFixReq', 'ngFloorFix', 'ngKichDuyen', 'ngKichDuyenAttr', 'save', 'tick', 'rosterTick', 'refresh'];
  for (const name of calls) {
    const fn = context[name];
    if (typeof fn !== 'function') continue;
    try { fn(); } catch (err) { if (isTdzError(err)) errors.push({ bundle: '(runtime)', stage: name, message: err.message }); }
  }

  const renderCalls = ['renderSkill', 'renderChar', 'renderInv'];
  for (const name of renderCalls) {
    const fn = context[name];
    if (typeof fn !== 'function') continue;
    try { fn(); } catch (err) { if (isTdzError(err)) errors.push({ bundle: '(runtime)', stage: name, message: err.message }); }
  }

  if (typeof sandbox.__flushTimers === 'function') sandbox.__flushTimers();
  for (const m of sandbox.__tdz) errors.push({ bundle: '(timer)', stage: 'setTimeout', message: m });

  if (errors.length) {
    console.error('TDZ ERRORS:');
    for (const e of errors) console.error(`- [${e.stage}] ${e.message}`);
    process.exit(1);
  }
  console.log('OK: không phát hiện lỗi TDZ khi nạp bundle và gọi hàm cốt lõi.');
  process.exit(0);
})();