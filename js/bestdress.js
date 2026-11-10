"use strict";
/* ============================================================================
 * MẶC ĐỒ TỐT CHO CẢ ĐỘI (4 nhân vật)
 * ----------------------------------------------------------------------------
 * Nút "Mặc đồ tốt" cũ chỉ xét nhân vật đang chơi và chỉ xét HÀNH TRANG.
 * Nay:
 *   1. Gom chung HÀNH TRANG + KHO RÈN (epBox) + KHO CHUNG (stash) làm một kho
 *      đồ duy nhất (kho chung vốn dùng chung cho mọi nhân vật).
 *   2. Duyệt từng nhân vật trong đội (4 slot đang xuất chiến): với mỗi ô trang
 *      bị, chọn món cho điểm lực chiến (power) cao nhất mà nhân vật đó mặc được,
 *      rồi lặp lại cho tới khi không còn món nào tốt hơn.
 *   3. Món thay ra tự động quay lại kho, món lấy từ kho rèn / kho chung thì bị
 *      rút khỏi đúng kho đó -> cả 4 nhân vật không bao giờ giành trùng một món.
 *   4. Khoá đồ (🔒) vẫn được tôn trọng: món đang mặc bị khoá thì không thay.
 *
 * Chạy sau roster.js, ui.js, stash.js trong bundle (xem build_obfuscate.js).
 * ========================================================================== */

const BDE_SKIP = ["pack", "ktc"];                       // đồ chưa mở / đồ ký gửi: không mặc được
let BDE_STASH = null;                                    // bản nháp kho chung trong lúc xét đồ
const bdeReasons = () => ({ lowLv: 0, wrongSex: 0, wrongSeries: 0, wrongFac: 0, wrongWeapon: 0 });

/* Đọc kho chung (không dùng stashTx để tránh ghi đè 4 lần). */
function bdeStashRead() {
  try {
    if (typeof stashRead === "function") {
      const res = stashRead();
      return res && res.st && Array.isArray(res.st.items) ? res.st : null;
    }
  } catch (error) { console.warn("[mặc đồ tốt] không đọc được kho chung", error); }
  return null;
}

/* Món này có mặc được cho nhân vật hiện tại (đang nằm trong biến S) không. */
function bdeUsable(item) {
  if (!item || !item.d || bdeSkip(item)) return false;
  if (!reqOk(item)) return false;
  if (DETAIL_SLOT[item.d] === "weapon") {
    const fac = FAC[S.fac];
    if (fac && !weaponFits(item)) return false;
  }
  return true;
}

function bdeSkip(item) { return BDE_SKIP.some(key => item[key]); }

/* Đếm lý do vì sao không mặc được, để báo cho người chơi biết. */
function bdeWhy(item, reasons) {
  if (!item || !item.d) return;
  if (bdeSkip(item)) return;
  const fac = FAC[S.fac];
  if (DETAIL_SLOT[item.d] === "weapon" && fac && !weaponFits(item)) { reasons.wrongWeapon++; return; }
  for (const [type, value] of item.req || []) {
    if (type === 36 && eqLevel() < value) { reasons.lowLv++; return; }
    if (type === 37 && value >= 0 && fac && heroSeries() !== value) { reasons.wrongSeries++; return; }
    if (type === 39 && value >= 0 && fac && fac.id !== value) { reasons.wrongFac++; return; }
  }
  if (!sexOk(item)) { reasons.wrongSex++; return; }
}

/* Thay món đang mặc bằng món tốt hơn; món cũ trả về đúng kho. */
function bdeSwap(item) {
  const slot = slotFor(item);
  const old = S.eq[slot];
  // rút món mới ra khỏi kho chứa nó
  if (S.inv.includes(item)) itemRemove(item);
  else if (typeof epBox === "function" && epBox().includes(item)) itemRemove(item);
  else if (BDE_STASH && BDE_STASH.items.includes(item)) BDE_STASH.items.splice(BDE_STASH.items.indexOf(item), 1);
  // trả món cũ về kho: hành trang còn chỗ thì để hành trang, không thì trả về đúng kho rèn / kho chung
  if (old) {
    if (S.inv.length < INV_MAX) S.inv.unshift(old);
    else if (old.__bdeFrom === "stash" && BDE_STASH) BDE_STASH.items.push(old);
    else if (typeof epBox === "function") epBox().push(old);
    else if (BDE_STASH) BDE_STASH.items.push(old);
    else S.inv.unshift(old);
  }
  S.eq[slot] = item;
  R.dirty = !0;
  invDirty = !0;
  return old;
}

/* Mặc đồ tốt nhất cho MỘT nhân vật (S đang trỏ vào nhân vật đó). */
function bdeDressCharacter(pool, reasons) {
  let count = 0;
  for (let guard = 0; guard < 14; guard++) {
    let best = null;
    let bestGain = 0.01;
    for (const item of pool) {
      if (!bdeUsable(item)) { bdeWhy(item, reasons); continue; }
      const current = S.eq[slotFor(item)];
      if (current && current.lock) continue;          // đồ đang mặc bị khoá: giữ nguyên
      const gain = equipGain(item);
      if (gain > bestGain) { bestGain = gain; best = item; }
    }
    if (!best) break;
    bdeSwap(best);
    pool.splice(pool.indexOf(best), 1);
    count++;
  }
  return count;
}

/* Nút "Mặc đồ tốt": duyệt cả đội. */
function bestDressAll() {
  if (!S || !S.fac) return 0;
  BDE_STASH = bdeStashRead();
  const pool = [];
  const seen = new Set();
  const push = (item, from) => {
    if (!item || seen.has(item)) return;
    seen.add(item);
    item.__bdeFrom = from;
    pool.push(item);
  };
  S.inv.forEach(item => push(item, "inv"));
  if (typeof epBox === "function") epBox().forEach(item => push(item, "box"));
  if (BDE_STASH) BDE_STASH.items.forEach(item => push(item, "stash"));

  const slots = (typeof rosterActiveSlots === "function" ? rosterActiveSlots() : [SLOT])
    .filter(slot => slot === SLOT ? !!(S && S.fac) : !!rosterReadSave(slot));
  if (!slots.includes(SLOT) && S.fac) slots.unshift(SLOT);

  const total = { n: 0, chars: 0, reasons: bdeReasons(), perChar: [] };
  for (const slot of slots) {
    const state = slot === SLOT ? S : rosterReadSave(slot);
    if (!state || !state.fac) continue;
    const reasons = bdeReasons();
    let changed = 0;
    if (slot === SLOT) {
      changed = bdeDressCharacter(pool, reasons);
    } else {
      // tạm chuyển sang nhân vật khác để dùng đúng logic chỉ số / yêu cầu đồ
      const previous = { state: S, slot: SLOT, stats: R.P, dirty: R.dirty, ptr: localStorage.getItem(SLOT_PTR) };
      try {
        ROSTER.suppressCurrent = true;
        S = rosterNormalizeState(state);
        SLOT = slot;
        R.dirty = !0;
        recalc();
        changed = bdeDressCharacter(pool, reasons);
        if (changed) {
          save();
          rosterWriteSave(slot, S);
        }
      } catch (error) {
        console.warn("[mặc đồ tốt] lỗi khi xét nhân vật " + (slot + 1), error);
      } finally {
        ROSTER.suppressCurrent = false;
        S = previous.state;
        SLOT = previous.slot;
        R.P = previous.stats;
        R.dirty = previous.dirty;
        try { previous.ptr == null ? localStorage.removeItem(SLOT_PTR) : localStorage.setItem(SLOT_PTR, previous.ptr); } catch {}
      }
    }
    if (changed) {
      total.n += changed;
      total.chars++;
      total.perChar.push({ slot, name: (slot === SLOT ? S : state).name || FAC[state.fac].n, n: changed });
    }
    for (const key in reasons) total.reasons[key] += reasons[key];
  }

  // ghi lại kho chung nếu có món bị rút/trả
  if (BDE_STASH && typeof stashWrite === "function") {
    try { stashWrite(BDE_STASH); } catch (error) { console.warn("[mặc đồ tốt] không ghi được kho chung", error); }
  }
  if (typeof sharedInventorySave === "function") sharedInventorySave();
  invDirty = !0;
  R.dirty = !0;
  save();

  // thông báo
  const r = total.reasons;
  const notes = [];
  if (r.lowLv) notes.push(`${r.lowLv} món chưa đủ cấp`);
  if (r.wrongWeapon) notes.push(`${r.wrongWeapon} món sai loại vũ khí`);
  if (r.wrongSeries) notes.push(`${r.wrongSeries} món khác hệ`);
  if (r.wrongFac) notes.push(`${r.wrongFac} món khác môn phái`);
  if (r.wrongSex) notes.push(`${r.wrongSex} món sai giới tính`);
  const more = notes.length ? ` · ${notes.join(", ")}` : "";
  if (total.n) {
    const who = total.perChar.length > 1
      ? total.perChar.map(x => `${x.name} ${x.n}`).join(", ")
      : "";
    toast(`Đã mặc ${total.n} món tốt hơn cho ${total.chars} nhân vật${who ? ` (${who})` : ""}${more}`);
    if (total.perChar.length) log(`⚔ Mặc đồ tốt: ${total.perChar.map(x => `<b>${esc(x.name)}</b> ${x.n} món`).join(" · ")}`);
    uiSfx("equipCloth");
  } else {
    toast(notes.length ? `Không có món mặc được ngay · ${notes.join(", ")}` : "Cả đội đã mặc đồ tốt nhất có thể");
  }
  if (typeof refresh === "function") refresh();
  return total.n;
}

/* Ghi đè nút "Mặc đồ tốt" (bản cũ chỉ xét nhân vật đang chơi). */
function bindBestDressAll(root) {
  const button = (root && root.querySelector ? root : document).querySelector("#bBest");
  if (!button || button.__bdeBound) return;
  button.__bdeBound = true;
  button.onclick = event => {
    event.preventDefault();
    event.stopPropagation();
    bestDressAll();
  };
  button.title = "Xét cả 4 nhân vật trong đội: tự mặc món tốt hơn trong hành trang, kho rèn và kho chung";
}

/* Bọc renderInv để nút luôn được gắn lại sau mỗi lần vẽ lại hành trang. */
(function bdeHook() {
  if (typeof window === "undefined") return;
  const hook = () => {
    if (typeof window.renderInv !== "function" || window.renderInv.__bdeWrapped) return;
    const base = window.renderInv;
    const wrapped = function (...args) {
      const result = base.apply(this, args);
      try { bindBestDressAll(); } catch {}
      return result;
    };
    wrapped.__bdeWrapped = true;
    wrapped.__bdeBase = base;
    window.renderInv = wrapped;
  };
  hook();
  setTimeout(hook, 0);
  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", hook);
    const observer = new MutationObserver(() => { hook(); try { bindBestDressAll(); } catch {} });
    const start = () => observer.observe(document.body, { childList: true, subtree: true });
    if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
  }
})();
