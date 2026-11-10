"use strict";
const CSEL = { on: !1, sel: 0, del: -1, raf: 0, t0: 0, st: [] };

function cselState(t) {
  try {
    const s = localStorage.getItem(slotKey(t));
    if (!s) return null;
    let n;
    try { n = unpack(s); } catch { n = null; }
    if (!n || !n.ok) {
      const a = localStorage.getItem(slotKey(t) + "_bak");
      try { n = a && unpack(a); } catch { n = null; }
    }
    const e = n && n.state;
    return e && e.fac ? e : null;
  } catch {
    return null;
  }
}

function cselRow(t, s, n) {
  const e = typeof JXL !== "undefined" && JXL.res ? JXL.res[t] : null;
  if (!e) return -1;
  if (s && s.set && JXL.set) {
    const i = s.set, o = JXL.set[i.kind], r = o && o[i.grp + "." + i.sid + "." + s.d + "." + s.k],
      d = r != null && ((JXL.tabs[n] || {})[JX_SET_PART[t]] || {})[r];
    if (d && Object.keys(d).length) return r;
  }
  const a = typeof jxItemP === "function" ? jxItemP(s) : 0, l = e[a >= 0 ? a + 2 : 1] ?? e[1];
  return l == null ? -1 : l - 2;
}

function cselLook(t) {
  if (typeof JXL === "undefined" || !JXL || !t) return null;
  try {
    const s = t.sex ? "f" : "m", n = t.eq || {}, e = n.weapon,
      a = {
        helm: cselRow("helm", n.helm, s),
        armor: cselRow("armor", n.armor, s),
        weapon: cselRow(e && e.d === 1 ? "range" : "melee", e, s),
        horse: -1
      };
    a.weapon < 0 && (a.weapon = 0);
    const l = (JXL.wnames[s] || [])[a.weapon] || "空手",
      i = JXL.assoc[s][l] || JXL.assoc[s].空手;
    return { sx: s, rows: a, asc: i ? i[0] : {}, ride: 0 };
  } catch {
    return null;
  }
}

const cselCss = `
#csel {
  position: fixed; inset: 0; z-index: 55;
  display: flex; flex-direction: column; align-items: center; justify-content: space-between;
  color: #f5ebd2;
  background: radial-gradient(ellipse at 50% 60%, rgba(4,18,14,0.3) 0%, rgba(2,10,8,0.92) 100%),
              url('ui/chon_nv/nen_van_ngoc.webp') center/cover no-repeat #071412;
  font-family: inherit; overflow-x: hidden; overflow-y: auto;
  padding: 16px 12px 18px;
}
#csel h1 {
  margin: 2px 0 0; font-size: clamp(24px, 4vw, 36px); letter-spacing: 4px;
  color: #ffe090; text-shadow: 0 0 15px #c8902a, 0 2px 4px #000;
  font-weight: bold; text-transform: uppercase;
}
#csel .cs-sub {
  font-size: 13px; color: #dac48c; letter-spacing: 1.5px; margin-top: 2px;
}
#csel .cs-row {
  display: flex; gap: clamp(16px, 4vw, 56px); justify-content: center; align-items: flex-end;
  width: 100%; max-width: 960px; flex: 1; min-height: 0; padding-top: 10px;
}
#csel .cs-slot {
  flex: 0 1 360px; width: min(100%, 360px); max-width: 360px; display: flex; flex-direction: column; align-items: center;
  cursor: pointer; position: relative; transition: filter .25s, transform .25s;
  padding: 0 4px 10px;
  filter: brightness(0.68) saturate(0.75);
}
#csel .cs-slot:hover {
  filter: brightness(0.92) saturate(0.95);
  transform: translateY(-4px);
}
#csel .cs-slot.on {
  filter: brightness(1.1) drop-shadow(0 0 22px rgba(255, 210, 80, 0.7));
  transform: translateY(-8px) scale(1.03);
}
#csel .cs-slot-head {
  display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
  min-height: 52px; width: 100%; text-align: center; margin-bottom: 6px;
  z-index: 2; pointer-events: none;
}
#csel .cs-slot .nm {
  font-weight: bold; font-size: clamp(14px, 3.2vw, 18px);
  text-shadow: 0 2px 5px #000, 0 0 8px rgba(0,0,0,0.8);
  letter-spacing: 0.5px; line-height: 1.25;
}
#csel .cs-slot .lv {
  font-size: clamp(11.5px, 2.6vw, 13px); color: #ded2b2;
  text-shadow: 0 1px 3px #000; line-height: 1.25; margin-top: 3px;
}
#csel .cs-slot-body {
  position: relative; width: 100%; display: flex; flex-direction: column; align-items: center;
}
@keyframes animCselWalk {
  from { transform: translateX(0); }
  to { transform: translateX(-100%); }
}
#csel .cs-char-wrap {
  width: clamp(160px, 24vw, 260px);
  aspect-ratio: 1 / 1;
  max-height: 48vh;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
#csel .cs-char-viewport {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}
#csel .cs-char-sprite {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background-repeat: no-repeat;
  background-size: 100% 100%;
}
#csel .cs-slot.empty .cs-char-wrap {
  display: none;
}
#csel .cs-slot canvas {
  width: 100%; max-height: 50vh; aspect-ratio: 30/38; display: block;
}
#csel .cs-slot .ped {
  width: 82%; height: 32px; margin-top: -20px; border-radius: 50%;
  background: radial-gradient(ellipse at 50% 50%, rgba(245,190,75,0.75) 0%, rgba(160,105,30,0.45) 45%, rgba(0,0,0,0) 72%);
  box-shadow: 0 0 18px rgba(230,160,50,0.4);
}
#csel .cs-slot.on .ped {
  background: radial-gradient(ellipse at 50% 50%, rgba(255,235,150,0.95) 0%, rgba(230,155,45,0.7) 45%, rgba(0,0,0,0) 74%);
  box-shadow: 0 0 30px rgba(255,195,75,0.85), inset 0 0 12px rgba(255,235,160,0.6);
}
#csel .cs-slot.empty canvas { opacity: 0; }
#csel .cs-slot .plus {
  width: 68px; height: 68px; border-radius: 50%; margin: 60px 0 30px;
  display: flex; align-items: center; justify-content: center;
  font-size: 42px; font-weight: 300; line-height: 1;
  color: #eed58a; background: radial-gradient(#251b11cc, #0e0a06ee);
  border: 1.5px solid #a88544; box-shadow: 0 0 18px rgba(0,0,0,0.8), 0 0 12px rgba(238,213,138,0.25);
  transition: transform .2s, color .2s, border-color .2s;
}
#csel .cs-slot:hover .plus {
  transform: scale(1.12);
  color: #fff4d0; border-color: #ffd875;
  box-shadow: 0 0 22px rgba(255,216,117,0.5);
}
#csel .cs-panel {
  width: 100%; max-width: 600px;
  background: linear-gradient(135deg, rgba(28,20,12,0.95), rgba(12,16,14,0.95));
  border: 2px solid #b58c48; border-radius: 8px;
  box-shadow: 0 0 0 2px #0a0805, 0 8px 30px rgba(0,0,0,0.85);
  padding: 12px 16px; margin-top: 10px;
}
#csel .cs-info {
  display: grid; grid-template-columns: auto 1fr auto 1fr; gap: 4px 14px; font-size: 13.5px;
}
#csel .cs-info span:nth-child(odd) { color: #caa868; }
#csel .cs-btns {
  display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 12px;
}
#csel .cs-btns button {
  min-width: 120px; padding: 9px 16px; font-weight: bold; border-radius: 5px;
  border: 1px solid #a07a34; background: linear-gradient(#5a3f1c, #2e1f0d);
  color: #f3dfae; cursor: pointer; font-size: 14px;
  transition: filter .15s, transform .15s;
}
#csel .cs-btns button:hover {
  filter: brightness(1.18);
  transform: translateY(-1px);
}
#csel .cs-btns button.go {
  background: linear-gradient(#c28e30, #6d4712); color: #fff8e2;
  border-color: #ffd875; min-width: 160px; font-size: 15px;
  box-shadow: 0 0 12px rgba(255,216,117,0.35);
}
#csel .cs-btns button.red {
  background: linear-gradient(#78251a, #38110c); border-color: #b84c3d;
}
#csel .cs-btns button:disabled { opacity: .45; cursor: default; }
#csel .cs-small {
  display: flex; gap: 8px; justify-content: center; margin-top: 10px; flex-wrap: wrap;
}
#csel .cs-small button {
  background: rgba(0,0,0,0.6); border: 1px solid #786038; color: #dac79a;
  border-radius: 4px; padding: 5px 12px; font-size: 12px; cursor: pointer;
}
#csel .cs-warn { color: #ff9a7a; text-align: center; font-size: 13px; margin-top: 8px; }
@media (max-width: 540px) {
  #csel { padding: 10px 6px 14px; }
  #csel .cs-row { gap: 6px; }
  #csel .cs-slot { padding: 0 2px 8px; }
  #csel .cs-slot-head { min-height: 44px; margin-bottom: 2px; }
  #csel .cs-info { grid-template-columns: auto 1fr; gap: 2px 8px; font-size: 12px; }
  #csel .cs-btns button { min-width: 0; flex: 1; font-size: 13px; padding: 8px 6px; }
}
`;

function cselClose() {
  CSEL.on = !1;
  cancelAnimationFrame(CSEL.raf);
  const t = $("#csel");
  t && t.remove();
  document.removeEventListener("keydown", cselKey);
}

function cselKey(t) {
  if (!CSEL.on || !$("#modal").classList.contains("hidden")) return;
  if (t.key === "ArrowLeft") {
    if ((CSEL.visibleSlots || []).length < 2) return;
    CSEL.sel = (CSEL.sel + SLOT_N - 1) % SLOT_N;
    CSEL.del = -1;
    cselPanel();
  } else if (t.key === "ArrowRight") {
    if ((CSEL.visibleSlots || []).length < 2) return;
    CSEL.sel = (CSEL.sel + 1) % SLOT_N;
    CSEL.del = -1;
    cselPanel();
  } else if (t.key === "Enter") {
    cselEnter();
  }
}

function cselEnter() {
  const t = CSEL.sel;
  const curSt = CSEL.st[t];
  if (!curSt || !curSt.fac) {
    // Slot trống -> mở tạo nhân vật
    cselClose();
    SLOT = t;
    if (typeof newSave === "function") {
      S = newSave();
    }
    try { localStorage.setItem(SLOT_PTR, String(t)); } catch(e) {}
    if (typeof pickFaction === "function") {
      pickFaction();
    }
    return;
  }
  try {
    localStorage.setItem(SLOT_PTR, String(t));
    sessionStorage.setItem("jxidle_in", String(t));
  } catch(e) {}
  SLOT = t;
  SAVE_LOCK = !1;
  location.reload();
}

function cselPanel() {
  document.querySelectorAll("#csel .cs-slot").forEach(r => r.classList.toggle("on", +r.dataset.i === CSEL.sel));
  const t = CSEL.st[CSEL.sel];
  const s = t && FAC[t.fac];
  const n = $("#csel .cs-panel");
  if (!n) return;
  const e = t && t.rw && t.rw.stat ? (t.rw.stat.reborn | 0) : 0;
  const a = typeof netOn == "function" && netOn();
  const l = t && s
    ? `<div class="cs-info">
        <span>Nhân vật</span><b style="color:${SERIES_COL[s.series]}">${esc(t.name || s.n)}</b>
        <span>Môn phái</span><span>${esc(s.n)}</span>
        <span>Đẳng cấp</span><span>${t.lvl | 0 || 1}${e ? ` · Chuyển sinh ${e}` : ""}</span>
        <span>Ngũ hành</span><span style="color:${SERIES_COL[s.series]}">${SERIES[s.series]}</span>
        <span>Ngân lượng</span><span>${fmtL(t.gold || 0)}</span>
        <span>Lần chơi cuối</span><span>${t.last ? new Date(t.last).toLocaleString("vi-VN", {dateStyle:"short",timeStyle:"short"}) : "-"}</span>
      </div>`
    : `<div class="cs-info" style="display:block;text-align:center;color:#d5c5a0">Vị trí ${CSEL.sel + 1} đang trống. Hãy tạo nhân vật để bước vào giang hồ.</div>`;

  const i = CSEL.del === CSEL.sel;
  n.innerHTML = `
    ${l}
    ${i ? `<div class="cs-warn">Xác nhận xóa vĩnh viễn <b>${esc(t.name || s.n)}</b> (cấp ${t.lvl})? Không thể khôi phục!</div>` : ""}
    <div class="cs-btns">
      ${t && s
        ? i
          ? '<button class="red" id="csDelY">Đồng ý Xóa</button><button id="csDelN">Hủy Bỏ</button>'
          : '<button class="go" id="csGo">Vào Trò Chơi</button><button class="red" id="csDel">Xóa Nhân Vật</button>'
        : '<button class="go" id="csNew">Tạo Nhân Vật</button>'
      }
      ${S && S.fac ? '<button id="csBack">Quay Lại Game</button>' : ""}
    </div>
    <div class="cs-small">
      ${a ? '<button id="csAcc">🌐 Quản Lý Tài Khoản</button>' : '<button id="csImp">📂 Nạp File Lưu</button>'}
    </div>
  `;

  const o = (r, d) => { const c = $(r); c && (c.onclick = d); };
  o("#csGo", cselEnter);
  o("#csNew", () => {
    cselClose();
    SLOT = CSEL.sel;
    if (typeof newSave === "function") {
      S = newSave();
    }
    try { localStorage.setItem(SLOT_PTR, String(CSEL.sel)); } catch(e) {}
    if (typeof pickFaction === "function") pickFaction();
  });
  o("#csDel", () => { CSEL.del = CSEL.sel; cselPanel(); });
  o("#csDelN", () => { CSEL.del = -1; cselPanel(); });
  o("#csDelY", () => { cselClose(); deleteSlot(CSEL.sel); });
  o("#csBack", () => cselClose());
  o("#csAcc", () => netModal("acc"));
  o("#csImp", () => pickSaveFile(() => { cselClose(); slotMenu(); }));
}

function cselDraw(t) {
  if (!CSEL.on) return;
  CSEL.raf = requestAnimationFrame(cselDraw);
  const s = (t - CSEL.t0) / 1e3;
  document.querySelectorAll("#csel .cs-slot canvas").forEach(n => {
    const e = +n.dataset.i, a = CSEL.st[e], l = n.getContext("2d");
    if (l.clearRect(0, 0, n.width, n.height), !a) return;
    !CSEL.look[e] && typeof JXL < "u" && JXL && (CSEL.look[e] = cselLook(a));
    const i = CSEL.look[e], o = CX;
    let r = !1;
    if (i && typeof drawJxHero == "function") {
      CX = l;
      try {
        r = drawJxHero("st", 0, e === CSEL.sel ? s : 0, n.width / 2, n.height - 20, 4.6, 1, null, i);
      } catch {
        r = !1;
      } finally {
        CX = o;
      }
    }
    if (!r) {
      const d = heroGfx(a.fac, a.sex), c = d && d.img ? img(d.img) : null;
      if (c && c.complete && c.naturalWidth) {
        const p = Math.min(n.width * 0.8 / c.naturalWidth, n.height * 0.85 / c.naturalHeight);
        l.drawImage(c, (n.width - c.naturalWidth * p) / 2, n.height - 18 - c.naturalHeight * p, c.naturalWidth * p, c.naturalHeight * p);
      }
    }
  });
}

function slotMenu() {
  if (!$("#cselCss")) {
    const e = document.createElement("style");
    e.id = "cselCss";
    e.textContent = cselCss;
    document.head.appendChild(e);
  }
  cselClose();
  if (typeof NET !== "undefined" && NET.user) {
    closeModal(!0);
  }
  CSEL.st = [...Array(SLOT_N).keys()].map(cselState);
  CSEL.look = [];
  CSEL.del = -1;
  const t = CSEL.st.map((e, a) => e ? a : -1).filter(e => e >= 0);
  let s = -1;
  try { s = +localStorage.getItem(SLOT_PTR); } catch {}
  CSEL.sel = Number.isInteger(s) && s >= 0 && s < SLOT_N && CSEL.st[s]
    ? s : (S && S.fac ? SLOT : (t[0] ?? 0));
  // One original character is selected here; companions are managed in the party UI.
  CSEL.visibleSlots = [CSEL.sel];

  const n = document.createElement("div");
  n.id = "csel";
  n.innerHTML = `
    <div style="text-align:center">
      <h1>Chọn Nhân Vật</h1>
      <div class="cs-sub">Hùng Bá Thiên Hạ · Sơn Hà Xã Tắc</div>
    </div>
    <div class="cs-row">
      ${CSEL.visibleSlots.map(a => {
        const e = CSEL.st[a];
        const l = e && FAC[e.fac];
        const s = l ? l.series : (e && typeof e.s === "number" ? e.s : 0);
        const sex = e && (e.sex === 1 || e.sex === "f") ? 1 : 0;
        const spMap = {
          0: { 0: { f: "kim_nam_focus.webp", n: 11 }, 1: { f: "kim_nu_focus.webp", n: 10 } },
          1: { 0: { f: "moc_nam_focus.webp", n: 11 }, 1: { f: "moc_nu_focus.webp", n: 8 } },
          2: { 0: { f: "thuy_nam_focus.webp", n: 10 }, 1: { f: "thuy_nu_focus.webp", n: 11 } },
          3: { 0: { f: "hoa_nam_focus.webp", n: 9 }, 1: { f: "hoa_nu_focus.webp", n: 11 } },
          4: { 0: { f: "tho_nam_focus.webp", n: 11 }, 1: { f: "tho_nu_focus.webp", n: 11 } }
        };
        const sp = (spMap[s] && spMap[s][sex]) || { f: "kim_nam_focus.webp", n: 11 };
        const dur = (sp.n * 0.12).toFixed(2);
        return `
          <div class="cs-slot${e ? "" : " empty"}" data-i="${a}">
            <div class="cs-slot-head">
              <div class="nm" style="${l ? `color:${SERIES_COL[l.series]}` : "color:#c5b89a"}">${e && l ? esc(e.name || l.n) : "Vị Trí Trống"}</div>
              <div class="lv">${e && l ? `Cấp ${e.lvl | 0 || 1} · ${esc(l.n)}` : "Tạo nhân vật mới"}</div>
            </div>
            <div class="cs-slot-body">
              ${e ? `
                <div class="cs-char-wrap">
                  <div class="cs-char-viewport">
                    <div class="cs-char-sprite" style="width:${sp.n * 100}%;background-image:url('ui/tao_nv/${sp.f}');animation:animCselWalk ${dur}s steps(${sp.n}) infinite"></div>
                  </div>
                </div>
              ` : `
                <div class="plus">+</div>
              `}
              <div class="ped"></div>
            </div>
          </div>
        `;
      }).join("")}
    </div>
    <div class="cs-panel"></div>
  `;

  document.body.appendChild(n);
  n.querySelectorAll(".cs-slot").forEach(e => {
    e.onclick = () => {
      if (CSEL.sel !== +e.dataset.i || CSEL.del >= 0) {
        CSEL.sel = +e.dataset.i;
        CSEL.del = -1;
        cselPanel();
      }
    };
    e.ondblclick = () => {
      CSEL.sel = +e.dataset.i;
      cselEnter();
    };
  });
  CSEL.on = !0;
  CSEL.t0 = performance.now();
  cselPanel();
  document.addEventListener("keydown", cselKey);
}


