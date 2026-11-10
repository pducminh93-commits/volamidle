"use strict";
/* ============================================================================
 * HỒ LÔ THẦN NÔNG — thay thuốc sinh lực / nội lực
 * ----------------------------------------------------------------------------
 * Tham khảo cơ chế VLIDLE v14:
 *   - Hồ Lô LV1 → LV10. Mỗi ngụm hồi 20% (LV1) → 70% (LV10) sinh lực VÀ nội lực
 *     tối đa; số ngụm tối đa = cấp (1 → 10 ngụm).
 *   - Uống xong chờ 5 giây; ngoài bãi tự hồi 1 ngụm mỗi 10 giây; về thành nạp đầy.
 *   - LV9+: mỗi ngụm kèm hồi 1% sinh lực + nội lực mỗi giây trong 10 giây.
 *   - Nâng cấp bằng nguyên liệu (không thất bại).
 *   - Ô 1 / 2 trên thanh phím giờ là Hồ Lô: bấm uống, chuột phải để nâng cấp.
 *
 * Dữ liệu nằm trong save: S.holo = { lv, gulps, cd, regen, regenT, regenLife, regenMana }
 * ========================================================================== */

const HOLO_MAX = 10;
const HOLO_COOLDOWN = 5;          // giây chờ giữa 2 ngụm
const HOLO_REFILL = 10;           // ngoài bãi tự hồi 1 ngụm mỗi 10 giây
const HOLO_LV9_REGEN = 10;        // LV9+: hồi thêm 10 giây

/* % sinh lực / nội lực hồi mỗi ngụm theo cấp */
function holoPct(lv) { return 0.2 + 0.05 * ((lv || 1) - 1); }   // LV1 20% → LV10 65%
function holoMaxGulps(lv) { return clamp(lv | 0, 1, HOLO_MAX); }

/* Trạng thái hồ lô của nhân vật đang chơi (hoặc của state truyền vào) */
function holoState(state) {
  const target = state || S;
  const h = target.holo || (target.holo = {});
  h.lv = clamp(h.lv | 0 || 1, 1, HOLO_MAX);
  h.gulps = clamp(Number.isFinite(h.gulps) ? h.gulps : holoMaxGulps(h.lv), 0, holoMaxGulps(h.lv));
  h.cd = Math.max(0, +h.cd || 0);
  h.regen = Math.max(0, +h.regen || 0);
  h.regenT = Math.max(0, +h.regenT || 0);
  return h;
}

/* Bảng giá nâng cấp: LV1→5 cần Huyền Tinh, LV5→9 cần Thần Bí Khoáng Thạch, LV9→10 cần Thủy Tinh Trắng */
function holoUpgradeCost(lv) {
  const table = { 1: [2, 1], 2: [3, 2], 3: [4, 3], 4: [5, 5], 5: [6, 8], 6: [7, 12], 7: [8, 18], 8: [9, 25], 9: [10, 10] };
  const row = table[lv];
  if (!row) return null;
  const [needHt, needOther] = row;
  return {
    lv: lv + 1,
    ht: needHt,                                  // Huyền Tinh cấp mấy
    misc: lv < 5 ? "mys" : lv < 9 ? "mys" : "wc", // nguyên liệu phụ
    miscN: needOther,
    text: lv < 9
      ? `${needHt} Huyền Tinh cấp ${needHt} + ${needOther} Thần Bí Khoáng Thạch`
      : `${needHt} Huyền Tinh cấp ${needHt} + ${needOther} Thủy Tinh Trắng`,
  };
}

function holoCanUpgrade(state) {
  const h = holoState(state);
  if (h.lv >= HOLO_MAX) return { ok: false, msg: "Hồ Lô đã đạt LV10" };
  const cost = holoUpgradeCost(h.lv);
  if (matHave("ht", cost.ht) < 1) return { ok: false, msg: `Thiếu ${cost.ht} Huyền Tinh cấp ${cost.ht}` };
  if (matHave("misc", cost.misc) < cost.miscN) return { ok: false, msg: `Thiếu ${cost.miscN} ${miscName(cost.misc)}` };
  return { ok: true, cost };
}

function holoUpgrade() {
  const h = holoState();
  const check = holoCanUpgrade();
  if (!check.ok) { toast(check.msg); return false; }
  const { cost } = check;
  matAdd("ht", cost.ht, -1);
  matAdd("misc", cost.misc, -cost.miscN);
  h.lv++;
  h.gulps = holoMaxGulps(h.lv);       // nâng cấp thì nạp đầy
  h.cd = 0;
  save();
  uiSfx("levelup");
  log(`🏺 Hồ Lô Thần Nông lên <b>LV${h.lv}</b>: mỗi ngụm hồi ${Math.round(holoPct(h.lv) * 100)}% sinh lực và nội lực, ${holoMaxGulps(h.lv)} ngụm.`);
  toast(`Hồ Lô LV${h.lv} · ${holoMaxGulps(h.lv)} ngụm · hồi ${Math.round(holoPct(h.lv) * 100)}%`);
  if (typeof refresh === "function") refresh();
  return true;
}

/* Uống 1 ngụm. Trả về true nếu uống được. */
function holoDrink(silent) {
  if (!S || !S.fac || !R.P) return false;
  const h = holoState();
  if (h.cd > 0) { if (!silent) toast(`Hồ Lô còn chờ ${h.cd.toFixed(1)} giây`); return false; }
  if (h.gulps < 1) { if (!silent) toast("Hồ Lô đã cạn ngụm — về thành nạp lại"); return false; }
  const pct = holoPct(h.lv);
  const life = R.P.life * pct, mana = R.P.mana * pct;
  const beforeLife = R.life, beforeMana = R.mana;
  R.life = Math.min(R.P.life, R.life + life);
  R.mana = Math.min(R.P.mana, R.mana + mana);
  h.gulps--;
  h.cd = HOLO_COOLDOWN;
  if (h.lv >= 9) { h.regen = HOLO_LV9_REGEN; h.regenT = HOLO_LV9_REGEN; }
  if (!silent) {
    const gain = Math.round(R.life - beforeLife + R.mana - beforeMana);
    if (gain > 0 && typeof addText === "function") addText(H.x, H.y - 44, "+" + fmt(gain), "#9fe8ff", 11);
    toast(`🏺 Hồ Lô LV${h.lv}: +${Math.round(pct * 100)}% sinh lực & nội lực · còn ${h.gulps}/${holoMaxGulps(h.lv)} ngụm`);
    uiSfx("use");
  }
  R.dirty = !0;
  return true;
}

/* Gọi mỗi khung hình: hồi ngụm ngoài bãi, chạy hồi máu LV9+, tự uống theo ngưỡng. */
function holoTick(dt) {
  if (!S || !S.fac || !R.P) return;
  const h = holoState();
  if (h.cd > 0) { h.cd -= dt; if (h.cd < 0.05) h.cd = 0; }   // cắt sai số dấu phẩy động
  // LV9+: hồi 1% mỗi giây trong 10 giây sau mỗi ngụm
  if (h.regen > 0) {
    const step = Math.min(dt, h.regen);
    h.regen -= step;
    R.life = Math.min(R.P.life, R.life + R.P.life * 0.01 * step);
    R.mana = Math.min(R.P.mana, R.mana + R.P.mana * 0.01 * step);
    if (h.regen <= 0) h.regen = 0;
  }
  // ngoài bãi (không ở thành / phó bản / tháp) tự hồi ngụm
  if (!R.town && !R.dg && !R.tower && h.gulps < holoMaxGulps(h.lv)) {
    h.refillT = (h.refillT || 0) + dt;
    if (h.refillT >= HOLO_REFILL) {
      h.refillT -= HOLO_REFILL;
      h.gulps = Math.min(holoMaxGulps(h.lv), h.gulps + 1);
    }
  } else if (R.town) {
    h.gulps = holoMaxGulps(h.lv);
    h.refillT = 0;
  }
  // tự uống theo ngưỡng (thay cho tự dùng thuốc)
  if (holoOffFlag()) return;
  const hpPct = clamp((S.holoHp ?? 50) / 100, 0.05, 0.95);
  const mpPct = clamp((S.holoMp ?? 0) / 100, 0.05, 0.95);
  if (h.gulps < 1 || h.cd > 0) return;
  const needLife = R.life < R.P.life * hpPct;
  const needMana = mpPct > 0.05 && R.P.main && R.P.main.cost > 0 && R.mana < R.P.mana * mpPct;
  if (needLife || needMana) holoDrink(true);
}

/* Cờ tắt tự uống (dùng S.holoOff, tương thích cờ cũ S.potOff) */
function holoOffFlag() {
  if (!S) return true;
  return !!(S.holoOff || (S.potOff && S.holoOff === undefined));
}

/* Nạp đầy khi về thành */
function holoRefill() {
  if (!S || !S.fac) return;
  const h = holoState();
  h.gulps = holoMaxGulps(h.lv);
  h.refillT = 0;
}

/* ---------------- Giao diện: thanh hồ lô trên đầu sân đấu ---------------- */
function holoBarHTML() { return ""; }

function holoRefreshBar() {
  const bar = document.getElementById("holoBar");
  if (bar) bar.remove();
}

function holoInjectBar() {
  const bar = document.getElementById("holoBar");
  if (bar) bar.remove();
}

/* ---------------- Giao diện: bảng nâng cấp hồ lô ---------------- */
function holoModal() {
  const h = holoState();
  const max = holoMaxGulps(h.lv);
  const pct = Math.round(holoPct(h.lv) * 100);
  const nextPct = h.lv < HOLO_MAX ? Math.round(holoPct(h.lv + 1) * 100) : null;
  const check = holoCanUpgrade();
  const rows = [];
  for (let lv = 1; lv <= HOLO_MAX; lv++) {
    const active = lv === h.lv;
    rows.push(`<div class="holo-row${active ? " on" : ""}">
      <b>LV${lv}</b>
      <span>${Math.round(holoPct(lv) * 100)}% sinh lực &amp; nội lực · ${lv} ngụm${lv >= 9 ? " · hồi thêm 1%/giây trong 10 giây" : ""}</span>
      ${active ? '<em>đang dùng</em>' : ""}
    </div>`);
  }
  modal(`<h3>🏺 Hồ Lô Thần Nông</h3>
    <p class="desc">Hồ Lô thay cho thuốc sinh lực / nội lực: mỗi ngụm hồi ${pct}% <b>cả hai</b> thanh máu và nội lực.
      Uống xong chờ ${HOLO_COOLDOWN} giây · ngoài bãi tự hồi 1 ngụm mỗi ${HOLO_REFILL} giây · về thành nạp đầy.
      Ô <b>1</b> và <b>2</b> trên thanh phím giờ là Hồ Lô (bấm để uống, giữ chuột phải để mở bảng này).</p>
    <div class="card">
      <div class="stats"><span>Đang dùng</span><span>LV${h.lv} · ${max} ngụm · hồi ${pct}%</span>
        <span>Còn lại</span><span>${h.gulps}/${max} ngụm</span>
        <span>Nguyên liệu</span><span>${matHave("ht", holoUpgradeCost(h.lv) ? holoUpgradeCost(h.lv).ht : 10)} Huyền Tinh · ${matHave("misc", "mys")} Thần Bí Khoáng Thạch · ${matHave("misc", "wc")} Thủy Tinh Trắng</span></div>
      ${nextPct ? `<div class="small">Lên LV${h.lv + 1}: hồi ${nextPct}% · ${h.lv + 1} ngụm — cần ${check.ok ? `<b>${check.cost.text}</b>` : `<span class="bad">${check.msg}</span>`}</div>` : '<div class="small"><b>Đã đạt cấp tối đa LV10</b></div>'}
      <div class="btnrow">
        <button class="btn" id="holoUp" ${check.ok ? "" : "disabled"}>Nâng lên LV${Math.min(HOLO_MAX, h.lv + 1)}</button>
        <button class="btn" id="holoDrink" ${h.gulps > 0 && h.cd <= 0 ? "" : "disabled"}>Uống 1 ngụm</button>
        <button class="btn" id="holoFull">Nạp đầy</button>
      </div>
    </div>
    <div class="card">
      <label><input type="checkbox" id="holoOff" ${S.holoOff ? "" : "checked"}> Tự uống Hồ Lô khi sinh lực / nội lực thấp</label><br>
      <label class="small">Tự uống khi sinh lực dưới <input type="number" id="holoHp" min="10" max="95" step="5" value="${S.holoHp ?? 50}" style="width:64px"> %</label><br>
      <label class="small">Tự uống khi nội lực dưới <input type="number" id="holoMp" min="0" max="95" step="5" value="${S.holoMp ?? 0}" style="width:64px"> % (0 = tắt)</label>
    </div>
    <h3>Các cấp</h3><div class="holo-table">${rows.join("")}</div>`, () => {
    const up = $("#holoUp");
    if (up) up.onclick = () => { if (holoUpgrade()) holoModal(); };
    const drink = $("#holoDrink");
    if (drink) drink.onclick = () => { holoDrink(); holoModal(); holoRefreshBar(); };
    const full = $("#holoFull");
    if (full) full.onclick = () => { holoRefill(); holoModal(); holoRefreshBar(); };
    const off = $("#holoOff");
    if (off) off.onchange = () => { S.holoOff = !off.checked; save(); };
    const hp = $("#holoHp");
    if (hp) hp.onchange = () => { S.holoHp = clamp(+hp.value || 50, 10, 95); save(); };
    const mp = $("#holoMp");
    if (mp) mp.onchange = () => { S.holoMp = clamp(+mp.value || 0, 0, 95); save(); };
  });
}

/* ---------------- Gắn vào game ---------------- */
(function holoHook() {
  if (typeof window === "undefined") return;

  // combat.js đã gọi holoTick(dt) trong tick() nên không bọc lại vòng lặp ở đây.
  const attachTick = () => typeof window.tick === "function";

  const attachRefill = () => {
    if (typeof window.goTown !== "function" || window.goTown.__holoWrapped) return;
    const base = window.goTown;
    const wrapped = function () {
      const result = base.apply(this, arguments);
      try { holoRefill(); holoRefreshBar(); } catch {}
      return result;
    };
    wrapped.__holoWrapped = true;
    window.goTown = wrapped;
  };

  const boot = () => {
    attachTick();
    attachRefill();
    holoInjectBar();
    holoLoop();
  };

  // vẽ lại thanh hồ lô ~4 lần/giây, dừng khi tab bị ẩn
  let last = 0;
  function holoLoop(now) {
    if (now === undefined) now = performance.now();
    if (!document.hidden && now - last > 250) {
      last = now;
      try { holoRefreshBar(); } catch (error) { console.warn("[hồ lô]", error); }
    }
    requestAnimationFrame(holoLoop);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  setTimeout(boot, 500);
})();
