"use strict";
/* ============================================================================
 * NGỰA — nâng cấp theo hướng VLIDLE v14 (không đụng Yên / Giáp / Cương)
 * ----------------------------------------------------------------------------
 * 1. BẢNG BẬC NGỰA: mỗi bậc có "cấp đeo" tối thiểu + mốc tốc chạy / sinh lực gốc.
 * 2. MÃ TRƯỜNG ƯU TIÊN: ngựa mới nhận luôn vào Mã Trường trước, chuồng đầy mới vào túi.
 * 3. TỰ RÃ: rã ngựa trùng loài + rã khi chuồng đầy (giữ con tốt nhất, luôn giữ ngựa
 *    đang cưỡi và ngựa khoá 🔒), quy ra lượng.
 * 4. CƯỜNG HOÁ NGỰA: +1 → +5, mỗi cấp +5% chỉ số, tốn Huyền Tinh + ngân lượng,
 *    thất bại mất nguyên liệu nhưng không tụt cấp.
 * 5. TẨY DÒNG NGỰA: tung lại dòng phụ (mag), khoá 1 dòng thì giá ×1.25.
 * 6. KÍCH DUYÊN: sổ loài đã gặp + mốc 4 / 8 / đủ theo hệ cộng chỉ số vĩnh viễn.
 *
 * Lưu ý: chỉ ngựa NHÂN VẬT CHÍNH đang đeo mới nhận EXP (giữ nguyên như game hiện tại).
 * ========================================================================== */

/* Cache Kích Duyên: PHẢI khai báo TRƯỚC mọi hàm có thể bị gọi sớm (horseAttr/ngFloorFix/ngKichDuyen).
 * Trước đây khối let nằm ở dưới, nên lần calc() đầu tiên (từ init / u20Init) ném lỗi TDZ. */
let NG_KD_CACHE = null, NG_KD_KEY = "";

const NG_BASE = typeof HORSE_BASE_LV !== "undefined" ? HORSE_BASE_LV : 27;
const NG_ENH_MAX = 5;
const NG_ENH_STEP = 0.05;          // +5% chỉ số mỗi cấp cường hoá
const NG_REROLL_KEEP = 0.25;       // khoá 1 dòng: giá ×1.25

/* ---------- 1. Bảng bậc ngựa ---------- */
/* deo: cấp tối thiểu để đeo · speed/hp/def: mốc chỉ số gốc bậc đó phải đạt */
const NG_TIERS = [
  { i: 0, n: "Thường",  col: "#b08a5a", deo: 1,   speed: 10,  hp: 5,    def: -20 },
  { i: 1, n: "Tốt",     col: "#5fd46a", deo: 20,  speed: 25,  hp: 20,   def: -100 },
  { i: 2, n: "Quý",     col: "#5fb8ff", deo: 50,  speed: 45,  hp: 100,  def: -260 },
  { i: 3, n: "Thần",    col: "#c77dff", deo: 80,  speed: 70,  hp: 300,  def: 300 },
  { i: 4, n: "Danh mã", col: "#ff9a3c", deo: 100, speed: 90,  hp: 400,  def: 300 },
  { i: 5, n: "Bảo mã",  col: "#ff5a5a", deo: 110, speed: 95,  hp: 400,  def: 500 },
  { i: 6, n: "Chí tôn", col: "#ffd24a", deo: 120, speed: 100, hp: 600,  def: 600 },
  { i: 7, n: "Thần Mã", col: "#ffffff", deo: 150, speed: 100, hp: 1000, def: 500 },
];

const ngTierOf = it => (typeof hcTier === "function" ? hcTier(it) : -1);
const ngTierRow = it => NG_TIERS[Math.max(0, ngTierOf(it))] || NG_TIERS[0];

/* Cấp tối thiểu để đeo ngựa: cấp gốc của món + chênh lệch bậc */
function ngReqLv(it) {
  if (!it || !isHorse(it)) return 0;
  const own = (it.req || []).find(r => r[0] === 36);
  if (own && own[1] > 0) return own[1];       // dữ liệu gốc đã có cấp yêu cầu riêng
  const tier = ngTierOf(it);
  return Math.max(1, NG_TIERS[tier] ? NG_TIERS[tier].deo : 1);
}

function ngReqOk(it) {
  if (!it || !isHorse(it)) return true;
  const need = ngReqLv(it);
  return (typeof eqLevel === "function" ? eqLevel() : S.lvl) >= need;
}

/* Bảng tra chỉ số gốc (trung bình 2 đầu) của món */
function ngBase(it) {
  const out = {};
  for (const [id, a, b] of it.base || []) out[id] = (a + b) / 2;
  return out;
}

/* Mốc tối thiểu + bù phần thiếu để bậc nào cũng đạt sàn chỉ số */
function ngFloorFix(it) {
  if (!isHorse(it) || !it.base) return it;
  const tier = NG_TIERS[Math.max(0, ngTierOf(it))];
  const want = [[111, tier.speed], [85, tier.hp], [150, tier.def]];
  for (const [id, min] of want) {
    const row = it.base.find(b => b[0] === id);
    if (!row) { if (min > 0) it.base.push([id, min, min]); continue; }
    const near = (row[1] + row[2]) / 2;
    if (id === 150 && near <= 0 && min > 0) continue;   // ngựa thường có phòng thủ âm: bỏ qua
    if (id === 150 || id === 85) {
      // phòng thủ / sinh lực: kéo lên sàn nếu thấp hơn
      if (row[1] < min) row[1] = min;
      if (row[2] < min) row[2] = min;
    } else if (row[1] < min) {
      row[1] = min;
      if (row[2] < min) row[2] = min;
    }
  }
  return it;
}

/* ---------- 2. Mã Trường ưu tiên ---------- */
/* Ngựa mới nhận: luôn vào Mã Trường trước; đầy thì mới vào túi. */
function ngReceiveHorse(item) {
  if (!isHorse(item)) return false;
  ngFloorFix(item);
  if (stable().length < STABLE_MAX) {
    S.stable = (S.stable || []).concat([item]);
    invDirty = !0;
    R.dirty = !0;
    if (!R.quiet && typeof log === "function") log(`🐎 <b style="color:${RAR_COL[item.r] || "#ffd24a"}">${esc(item.n)}</b> → Mã Trường (${stable().length}/${STABLE_MAX})`);
    return true;
  }
  const freed = ngFreeSlot();
  if (freed) {
    S.stable = (S.stable || []).concat([item]);
    invDirty = !0;
    R.dirty = !0;
    if (!R.quiet && typeof log === "function") log(`🐎 <b>${esc(item.n)}</b> → Mã Trường (đã rã ${esc(freed.n)} trùng loài)`);
    return true;
  }
  if (!R.quiet && typeof log === "function") log(`<span class="dim">Mã Trường đầy ${STABLE_MAX} → ${esc(item.n)} vào hành trang</span>`);
  return false;
}

/* ---------- 3. Tự rã ngựa trùng loài ---------- */
const ngScore = it => (isHorse(S.eq.horse) && S.eq.horse === it ? 1e9 : 0) + horseLv(it) * 1e3 + (it.lvl || 0) + ((it.enh | 0) * 100);

/* con tốt nhất của từng loài phải giữ */
function ngKeepSet() {
  const all = stable().concat(S.inv.filter(isHorse));
  if (isHorse(S.eq.horse)) all.push(S.eq.horse);
  const best = new Map();
  for (const h of all) {
    const key = hcKey(h);
    const cur = best.get(key);
    if (!cur || ngScore(h) > ngScore(cur)) best.set(key, h);
  }
  return new Set(best.values());
}

/* danh sách ngựa có thể rã (không khoá, không phải con tốt nhất) */
function ngTrashList(scope) {
  const keep = ngKeepSet();
  const pool = (scope === "stable" ? stable() : scope === "inv" ? S.inv.filter(isHorse) : stable().concat(S.inv.filter(isHorse)));
  return pool.filter(h => isHorse(h) && !keep.has(h) && !h.lock && h !== S.eq.horse);
}

/* Rã 1 con ngựa trùng để lấy chỗ trong Mã Trường. Trả về món đã rã. */
function ngFreeSlot() {
  const trash = ngTrashList("stable").sort((a, b) => ngScore(a) - ngScore(b))[0];
  if (!trash) return null;
  S.stable = stable().filter(h => h !== trash);
  S.gold += itemValue(trash);
  invDirty = !0;
  R.dirty = !0;
  return trash;
}

/* Rã hàng loạt ngựa trùng loài (dùng cho nút và chế độ tự động). */
function ngAutoMelt(silent) {
  const trash = ngTrashList();
  if (!trash.length) return { ok: !1, n: 0, gold: 0, msg: "Không có ngựa trùng loài để rã" };
  let gold = 0;
  for (const h of trash) {
    gold += itemValue(h);
    S.stable = stable().filter(x => x !== h);
    S.inv = S.inv.filter(x => x !== h);
  }
  S.gold += gold;
  invDirty = !0;
  R.dirty = !0;
  save();
  if (!silent) {
    toast(`Đã rã ${trash.length} ngựa trùng loài: +${fmtL(gold)} lượng`);
    if (typeof log === "function") log(`🐎 Rã ${trash.length} ngựa trùng loài (giữ con tốt nhất mỗi loài, giữ ngựa khoá 🔒): +${fmtL(gold)} lượng`);
    uiSfx("learn");
  }
  return { ok: !0, n: trash.length, gold, msg: `Đã rã ${trash.length} ngựa trùng loài` };
}

/* ---------- 4. Cường hoá ngựa ---------- */
function ngEnhCost(it) {
  const lv = it.enh | 0;
  return {
    next: lv + 1,
    ht: Math.min(HT_MAX, 1 + lv),                 // Huyền Tinh cấp
    htN: 1 + lv,                                   // số viên
    gold: Math.round(2000 * Math.pow(2.2, lv) * (1 + (it.lvl || 1) / 40)),
    chance: [1, 0.95, 0.8, 0.65, 0.5, 0.35][Math.min(5, lv + 1)] ?? 0.35,
  };
}

function ngEnhance(it) {
  if (!isHorse(it)) return { ok: !1, msg: "Không phải ngựa" };
  if ((it.enh | 0) >= NG_ENH_MAX) return { ok: !1, msg: `Ngựa đã cường hoá tối đa +${NG_ENH_MAX}` };
  const c = ngEnhCost(it);
  if (matHave("ht", c.ht) < c.htN) return { ok: !1, msg: `Thiếu ${c.htN} Huyền Tinh cấp ${c.ht}` };
  if (S.gold < c.gold) return { ok: !1, msg: `Thiếu ${fmtL(c.gold)} lượng` };
  matAdd("ht", c.ht, -c.htN);
  S.gold -= c.gold;
  const success = Math.random() < c.chance;
  if (success) {
    it.enh = (it.enh | 0) + 1;
    if (it.enh >= NG_ENH_MAX && !it.lock) it.lock = 1;   // tối đa thì tự khoá cho khỏi bán nhầm
  }
  R.dirty = !0;
  invDirty = !0;
  save();
  return {
    ok: success,
    msg: success
      ? `Cường hoá thành công: ${it.n} +${it.enh} (+${Math.round((it.enh) * NG_ENH_STEP * 100)}% chỉ số)`
      : `Cường hoá thất bại (${Math.round(c.chance * 100)}%) — mất nguyên liệu, không tụt cấp`,
  };
}

/* ---------- 5. Tẩy dòng ngựa ---------- */
const NG_RR = { uid: 0, keep: new Set(), cand: null };

function ngRrState(it) {
  if (NG_RR.uid !== it.uid) { NG_RR.uid = it.uid; NG_RR.keep = new Set(); NG_RR.cand = null; }
  return NG_RR;
}

function ngRerollCost(it, keepN) {
  const lv = it.lvl || 1;
  return Math.round((800 + lv * 260) * (1 + ((it.mag || []).length) * 0.5) * (1 + S.lvl / 20) * (1 + (keepN | 0) * NG_REROLL_KEEP));
}

function ngCanReroll(it) {
  return isHorse(it) && !it.thanma && (it.mag || []).length > 0 && (it.rerollN | 0) < 10;
}

function ngReroll(it) {
  if (!ngCanReroll(it)) return { ok: !1, msg: (it.rerollN | 0) >= 10 ? "Ngựa này đã tẩy 10 lần" : "Ngựa không có dòng để tẩy" };
  const st = ngRrState(it);
  if (st.keep.size >= it.mag.length) return { ok: !1, msg: "Phải để ít nhất 1 dòng tẩy lại" };
  const cost = ngRerollCost(it, st.keep.size);
  if (S.gold < cost) return { ok: !1, msg: `Thiếu ${fmtL(cost)} lượng` };
  S.gold -= cost;
  it.rerollN = (it.rerollN | 0) + 1;
  st.cand = typeof rollKeep === "function" ? rollKeep(it, st.keep) : it.mag;
  R.dirty = !0;
  save();
  return { ok: !0, msg: `Đã tung dòng mới (−${fmtL(cost)} lượng) · lần ${it.rerollN}/10` };
}

function ngRerollAccept(it) {
  const st = ngRrState(it);
  if (!st.cand) return { ok: !1, msg: "Chưa tung dòng nào" };
  it.mag = st.cand;
  st.cand = null;
  R.dirty = !0;
  invDirty = !0;
  save();
  return { ok: !0, msg: "Đã nhận dòng mới" };
}

/* ---------- 6. Kích Duyên ---------- */
/* Nạp cấp của ngựa: 5 dòng rmax = [kim, mộc, thủy, hỏa, thổ] nhưng chỉ giữ hệ mạnh nhất.
 * Dùng hàm monSeries sẵn có cho quái; với ngựa ta tự suy từ tên loài + bậc cho ổn định. */
const NG_SERIES_NAME = ["Kim", "Mộc", "Thủy", "Hỏa", "Thổ"];

function ngSeriesOf(it, fallback) {
  if (it.s >= 0 && it.s <= 4) return it.s;
  const k = hcKey(it);
  let h = 0;
  for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) & 0x7fffffff;
  return h % 5;
}

/* Sổ loài: mỗi loài đã từng sở hữu -> hệ + bậc (không mất khi bán/rã) */
function ngCodex() {
  const book = horseBook();
  const out = new Map();
  for (const key in book) {
    const v = book[key];
    if (typeof v !== "string") continue;
    out.set(v, key);
  }
  // bổ sung từ chuồng + túi hiện tại
  for (const h of stable().concat(S.inv.filter(isHorse)).concat(isHorse(S.eq.horse) ? [S.eq.horse] : [])) {
    if (ngTierOf(h) >= 0) out.set(hcKey(h), h.n);
  }
  return out;
}

function ngCodexRows() {
  const all = hcAll();
  const owned = new Set(ngCodex().keys());
  const rows = [];
  for (const [key, [name, tier]] of all) {
    rows.push({ key, name, tier, owned: owned.has(key) });
  }
  return rows;
}

/* Cache đã khai báo ở đầu file (dòng 20) để tránh lỗi TDZ. */
function ngKichDuyen() {
  const key = (stable().length | 0) + "|" + (S.inv ? S.inv.length : 0) + "|" + Object.keys(horseBook() || {}).length + "|" + S.lvl;
  if (NG_KD_CACHE && NG_KD_KEY === key) return NG_KD_CACHE;
  const out = ngKichDuyenCalc();
  NG_KD_CACHE = out; NG_KD_KEY = key;
  return out;
}

function ngKichDuyenCalc() {
  const per = [0, 0, 0, 0, 0];
  let total = 0;
  for (const { key, tier, owned } of ngCodexRows()) {
    if (!owned || tier < 0) continue;
    total++;
    // hệ suy ra từ tên loài cho ổn định giữa các lần chơi
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) & 0x7fffffff;
    per[h % 5]++;
  }
  const out = { per, total, bonus: {} };
  const add = (k, v) => { out.bonus[k] = (out.bonus[k] || 0) + v; };

  // Theo hệ: mỗi hệ đạt mốc 4/8/đủ thì cộng chỉ số riêng
  const SERIES_BONUS = [
    { def: 30, life: 200 },         // Kim
    { life: 300, regen: 0.2 },      // Mộc
    { mana: 300, manaRegen: 0.2 },  // Thủy
    { dmgPct: 0.5, speed: 2 },      // Hỏa
    { res: 2, life: 200 },          // Thổ
  ];
  per.forEach((n, s) => {
    const level = n >= 8 ? 2 : n >= 4 ? 1 : 0;
    if (!level) return;
    const row = SERIES_BONUS[s], mul = level === 1 ? 0.5 : 1;
    if (row.def) add("def", row.def * mul);
    if (row.life) add("lifemax_p", row.life * mul);
    if (row.mana) add("manamax_v", row.mana * mul);
    if (row.regen) add("lifereplenish_v", row.regen * mul);
    if (row.manaRegen) add("manareplenish_v", row.manaRegen * mul);
    if (row.dmgPct) add("physicsenhance_p", row.dmgPct * mul);
    if (row.speed) add("fastwalkrun_p", row.speed * mul);
    if (row.res) add("allres_p", row.res * mul);
  });

  // Theo tổng số loài: 4 / 8 / 16 / đủ
  const TOTAL_MS = [[4, 0.2], [8, 0.5], [16, 1], [40, 2]];
  let totalMul = 0;
  for (const [need, mul] of TOTAL_MS) if (total >= need) totalMul = mul;
  if (totalMul) {
    add("lifemax_p", 2 * totalMul);
    add("manamax_p", 2 * totalMul);
    add("physicsenhance_p", totalMul);
  }
  out.totalMul = totalMul;
  return out;
}

/* Áp Kích Duyên vào bảng chỉ số nhân vật (gọi trong calc) */
function ngKichDuyenAttr(attr) {
  if (!S || !S.fac || typeof addAttr !== "function") return;
  try {
    const kd = ngKichDuyen();
    for (const key in kd.bonus) {
      const v = kd.bonus[key];
      if (!v) continue;
      addAttr(attr, key, [Math.round(v * 100) / 100, 0, 0]);
    }
  } catch (error) { console.warn("[kích duyên]", error); }
}

/* ============================================================================
 * GIAO DIỆN
 * ========================================================================== */

/* Thẻ cường hoá trong bảng ngựa đang cưỡi */
function ngEnhCard(it) {
  const lv = it.enh | 0;
  if (lv >= NG_ENH_MAX) {
    return `<div class="card" style="margin-top:6px"><b>Cường hoá <span style="color:#ffd24a">+${lv}/${NG_ENH_MAX}</span></b>
      <div class="small">Đã tối đa · chỉ số +${Math.round(lv * NG_ENH_STEP * 100)}%</div></div>`;
  }
  const c = ngEnhCost(it);
  const can = matHave("ht", c.ht) >= c.htN && S.gold >= c.gold;
  return `<div class="card" style="margin-top:6px"><b>Cường hoá <span style="color:#ffd24a">+${lv}/${NG_ENH_MAX}</span></b>
    <div class="small">Lên +${c.next}: <b>${c.htN}× Huyền Tinh cấp ${c.ht}</b> + <b>${fmtL(c.gold)} lượng</b> · tỉ lệ ${Math.round(c.chance * 100)}% · chỉ số +${Math.round((lv + 1) * NG_ENH_STEP * 100)}%</div>
    <div class="small dim">Có ${matHave("ht", c.ht)} Huyền Tinh cấp ${c.ht} · thất bại mất nguyên liệu, không tụt cấp</div>
    <div class="btnrow"><button class="btn" id="hEnh" ${can ? "" : "disabled"}>Cường hoá +${c.next}</button></div></div>`;
}

/* Thẻ tẩy dòng (khoá 1 dòng ×1.25) */
function ngRerollCard(it) {
  const st = ngRrState(it);
  const mag = it.mag || [];
  if (!mag.length) return "";
  const left = 10 - (it.rerollN | 0);
  const cost = ngRerollCost(it, st.keep.size);
  const lines = mag.map((m, i) => {
    const kept = st.keep.has(i);
    const cand = st.cand && st.cand[i] ? attrText(attrName(st.cand[i].a), st.cand[i].p) : null;
    const now = attrText(attrName(m.a), m.p);
    return `<div class="qrow"><span>${kept ? "🔒 " : ""}${esc(now)}${cand && cand !== now ? `<small class="dim"> → <b style="color:#7fd7a0">${esc(cand)}</b></small>` : ""}</span>
      <span class="btnrow"><button class="btn sm${kept ? " on" : ""}" data-hrkeep="${i}">${kept ? "Bỏ khoá" : "Khoá"}</button></span></div>`;
  }).join("");
  return `<div class="card" style="margin-top:6px"><b>Tẩy dòng</b>
    <div class="small">Còn <b>${left}</b>/10 lần · khoá dòng giá ×1.25 · lần này <b>${fmtL(cost)}</b> lượng</div>
    ${lines}
    <div class="btnrow"><button class="btn" id="hRr" ${left > 0 && st.keep.size < mag.length && S.gold >= cost ? "" : "disabled"}>Tung dòng mới</button>
      <button class="btn" id="hRrOk" ${st.cand ? "" : "disabled"}>Nhận dòng mới</button></div></div>`;
}

/* Thanh Kích Duyên trong bảng Mã Trường */
function ngKichDuyenCard() {
  const rows = ngCodexRows();
  const kd = ngKichDuyen();
  const owned = rows.filter(r => r.owned).length;
  const series = NG_SERIES_NAME.map((name, s) => {
    const n = kd.per[s];
    const lvl = n >= 8 ? 2 : n >= 4 ? 1 : 0;
    return `<span class="chip2${lvl ? " hc-on" : ""}" title="${n} loài hệ ${name}">${name} ${n}${lvl ? (lvl === 2 ? " ★★" : " ★") : ""}</span>`;
  }).join("");
  const ms = [[4, "mốc 1"], [8, "mốc 2"], [16, "mốc 3"], [40, "mốc 4"]]
    .map(([need, label]) => `${label} ${need}: <b class="${kd.total >= need ? "gold" : "dim"}">${kd.total >= need ? "✓" : kd.total + "/" + need}</b>`)
    .join(" · ");
  return `<h4 class="rech">Kích Duyên <small class="dim">${owned}/${rows.length} loài đã gặp</small></h4>
    <p class="dim small">Sổ loài không mất khi bán/rã ngựa. Đủ <b>4</b> loài cùng hệ → mốc 1, đủ <b>8</b> → mốc 2 (mỗi hệ cộng chỉ số riêng).</p>
    <div class="chips" style="margin:4px 0">${series}</div>
    <p class="dim small">${ms}</p>`;
}
