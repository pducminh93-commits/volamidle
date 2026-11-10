"use strict";

const ROSTER = { units: new Map(), saves: new Map(), dirty: new Set(), vitals: new Map(), sharingXp: false, suppressCurrent: false, scene: null, charSlot: null, confirmDelete: null };
const ROSTER_PARTY_SIZE = 4, ROSTER_RESERVE_SIZE = 4, rosterStoreKey = key => `${key}_${typeof getAuthUid === "function" ? getAuthUid() || "local" : "local"}`;
const ROSTER_FORMATION = [{ side: -34, back: 38 }, { side: 34, back: 38 }, { side: 0, back: 78 }];
const ROSTER_FOLLOW_RADIUS = 350, ROSTER_RECALL_DISTANCE = 285, ROSTER_RECALL_SPEED = 1.65;
const ROSTER_SCENE_FIELDS = ["stage", "wave", "maxStage", "diff", "mode", "zalt"];

function rosterSexCode(value) {
  if (typeof value === "string") return /^(1|f|female|nu|nữ|woman|girl)$/i.test(value.trim()) ? 1 : 0;
  return value === true || +value === 1 ? 1 : 0;
}

function rosterNormalizeState(state) {
  const copy = migrate(JSON.parse(JSON.stringify(state)));
  copy.sex = rosterSexCode(copy.sex);
  return typeof sharedInventoryAttach === "function" ? sharedInventoryAttach(copy) : copy;
}

function rosterCaptureScene(state) {
  if (!state || !state.fac) return;
  ROSTER.scene = {};
  for (const field of ROSTER_SCENE_FIELDS) {
    ROSTER.scene[field] = field === "zalt" ? { ...(state.zalt || {}) } : state[field];
  }
  ROSTER.scene.x = H.x;
  ROSTER.scene.y = H.y;
}

function rosterApplyScene(state) {
  if (!state || !ROSTER.scene) return state;
  for (const field of ROSTER_SCENE_FIELDS) {
    const value = ROSTER.scene[field];
    if (value !== undefined) state[field] = field === "zalt" ? { ...value } : value;
  }
  state.maxStage = Math.max(1, state.maxStage | 0, ROSTER.scene.maxStage | 0, ROSTER.scene.stage | 0);
  if (Number.isFinite(ROSTER.scene.x) && Number.isFinite(ROSTER.scene.y)) {
    H.x = ROSTER.scene.x;
    H.y = ROSTER.scene.y;
    H.px = H.x;
    H.py = H.y;
  }
  return state;
}

function rosterFollowPoint(slot, leaderSlot = SLOT) {
  const members = rosterActiveSlots().filter(index => index !== leaderSlot);
  const offset = ROSTER_FORMATION[Math.max(0, members.indexOf(slot)) % ROSTER_FORMATION.length];
  const dx = H.x - (H.px ?? H.x), dy = H.y - (H.py ?? H.y), distance = Math.hypot(dx, dy);
  const fx = distance > 2 ? dx / distance : (H.face < 0 ? -1 : 1), fy = distance > 2 ? dy / distance : 0;
  const sx = -fy, sy = fx;
  const point = inWorld(H.x - fx * offset.back + sx * offset.side, H.y - fy * offset.back + sy * offset.side);
  return { x: point[0], y: point[1] };
}

function rosterReadSave(slot) {
  const cached = ROSTER.saves.get(slot);
  if (cached && Date.now() - cached.at < 1500) return cached.state;
  try {
    let value = localStorage.getItem(slotKey(slot));
    if (!value) { ROSTER.saves.set(slot, { state: null, at: Date.now() }); return null; }
    let result;
    try { result = unpack(value); } catch { result = null; }
    if (!result || !result.ok) {
      value = localStorage.getItem(slotKey(slot) + "_bak");
      try { result = value && unpack(value); } catch { result = null; }
    }
    const state = result && result.ok && result.state && FAC[result.state.fac] ? rosterNormalizeState(result.state) : null;
    ROSTER.saves.set(slot, { state, at: Date.now() });
    return state;
  } catch { ROSTER.saves.set(slot, { state: null, at: Date.now() }); return null; }
}

function rosterWriteSave(slot, state) {
  try {
    state.rosterDeployed = rosterActiveSlots();
    const key = slotKey(slot), old = localStorage.getItem(key);
    if (old) localStorage.setItem(key + "_bak", old);
    state.last = Date.now();
    localStorage.setItem(key, pack(state));
    typeof sharedInventorySave === "function" && sharedInventorySave();
    ROSTER.saves.set(slot, { state, at: Date.now() });
    ROSTER.dirty.add(slot);
    const unit = ROSTER.units.get(slot);
    if (unit) { unit.last = state.last; unit.lvl = state.lvl | 0 || 1; unit.name = state.name || FAC[state.fac].n; unit.state = state; }
    return true;
  } catch { return false; }
}

function rosterCalcSave(state, slot) {
  if (!state || !state.fac || !FAC[state.fac]) return null;
  const previousS = S, previousSlot = SLOT, previousP = R.P, previousAuraContext = AURA_ROSTER_CALC_CONTEXT;
  try {
    AURA_ROSTER_CALC_CONTEXT = { mainSlot: previousSlot, mainState: previousS };
    S = rosterNormalizeState(state);
    SLOT = slot;
    return calc();
  } catch (error) {
    console.warn("Không đọc được chỉ số nhân vật trong đội", error);
    return null;
  } finally {
    S = previousS;
    SLOT = previousSlot;
    R.P = previousP;
    AURA_ROSTER_CALC_CONTEXT = previousAuraContext;
  }
}

function rosterActiveSlots() {
  const available = Array.from({ length: SLOT_N }, (_, slot) => slot)
    .filter(slot => slot === SLOT ? !!(S && S.fac) : !!rosterReadSave(slot));
  let deployed = null;
  try { deployed = JSON.parse(localStorage.getItem(rosterStoreKey("jxidle_roster_deployed")) || "null"); } catch {}
  if (!Array.isArray(deployed) && S && Array.isArray(S.rosterDeployed)) deployed = S.rosterDeployed;
  if (!Array.isArray(deployed)) {
    deployed = available.slice(0, ROSTER_PARTY_SIZE);
    try { localStorage.setItem(rosterStoreKey("jxidle_roster_deployed"), JSON.stringify(deployed)); } catch {}
  }
  deployed = [...new Set(deployed.map(Number))].filter(slot => available.includes(slot)).slice(0, ROSTER_PARTY_SIZE);
  if (!ROSTER.suppressCurrent && available.includes(SLOT) && !deployed.includes(SLOT)) {
    if (deployed.length >= ROSTER_PARTY_SIZE) deployed[deployed.length - 1] = SLOT;
    else deployed.push(SLOT);
  }
  try { localStorage.setItem(rosterStoreKey("jxidle_roster_deployed"), JSON.stringify(deployed)); } catch {}
  if (S && S.fac) S.rosterDeployed = deployed.slice();
  return deployed;
}

function rosterTeamUnits() {
  return rosterActiveSlots().filter(slot => slot !== SLOT).slice(0, ROSTER_PARTY_SIZE - 1)
    .map(slot => rosterUnit(slot)).filter(Boolean);
}

function rosterSaveDeployed(slots) {
  const available = Array.from({ length: SLOT_N }, (_, slot) => slot)
    .filter(slot => slot === SLOT ? !!(S && S.fac) : !!rosterReadSave(slot));
  const next = [...new Set((slots || []).map(Number))]
    .filter(slot => available.includes(slot)).slice(0, ROSTER_PARTY_SIZE);
  if (S && S.fac && available.includes(SLOT) && !next.includes(SLOT)) next.unshift(SLOT);
  while (next.length > ROSTER_PARTY_SIZE) next.pop();
  try { localStorage.setItem(rosterStoreKey("jxidle_roster_deployed"), JSON.stringify(next)); } catch {}
  if (S && S.fac) { S.rosterDeployed = next.slice(); save(); }
  if (typeof ROSTER_SKILL_SLOT !== "undefined" && !next.includes(ROSTER_SKILL_SLOT)) ROSTER_SKILL_SLOT = SLOT;
  return next;
}

function rosterDeploy(slot) {
  const state = slot === SLOT ? S : rosterReadSave(slot);
  if (!state || !state.fac) return;
  let deployed = rosterActiveSlots();
  if (deployed.includes(slot)) return;
  if (deployed.length < ROSTER_PARTY_SIZE) {
    rosterSaveDeployed([...deployed, slot]);
    ROSTER.units.delete(slot);
    if (curTab === "char") refresh();
    toast(`${state.name || FAC[state.fac].n} đã xuất chiến`);
    return;
  }
  const candidates = deployed.filter(active => active !== SLOT);
  if (!candidates.length) { toast("Không có nhân vật nào có thể đổi khỏi đội hình"); return; }
  const rows = candidates.map(active => {
    const member = active === SLOT ? S : rosterReadSave(active), fac = member && FAC[member.fac];
    return `<button class="btn" data-roster-swap="${active}">Đổi với ${esc(member && (member.name || fac && fac.n) || `Nhân vật ${active + 1}`)}</button>`;
  }).join("");
  modal(`<h3>Đưa vào đội hình</h3><p class="desc">Đội hình đã đủ ${ROSTER_PARTY_SIZE} người. Chọn một nhân vật đang xuất chiến để đổi với <b>${esc(state.name || FAC[state.fac].n)}</b>.</p><div class="btnrow">${rows}</div>`, () => {
    document.querySelectorAll("#mBody [data-roster-swap]").forEach(button => button.onclick = () => {
      const swapSlot = +button.dataset.rosterSwap;
      const next = rosterActiveSlots().filter(active => active !== swapSlot);
      next.push(slot);
      rosterSaveDeployed(next);
      ROSTER.units.delete(slot);
      ROSTER.units.delete(swapSlot);
      closeModal(!0);
      if (curTab === "char") refresh();
      toast(`${state.name || FAC[state.fac].n} xuất chiến, đổi với nhân vật dự bị`);
    });
  });
}

function rosterReserve(slot) {
  if (slot === SLOT) { toast("Nhân vật chính phải ở trong đội hình"); return; }
  const deployed = rosterActiveSlots();
  if (!deployed.includes(slot)) return;
  rosterSaveDeployed(deployed.filter(active => active !== slot));
  if (ROSTER.charSlot === slot) ROSTER.charSlot = SLOT;
  ROSTER.units.delete(slot);
  if (curTab === "char") refresh();
  toast("Đã chuyển nhân vật sang Dự bị");
}

async function rosterDelete(slot) {
  if (slot === SLOT) { toast("Không thể xóa nhân vật đang chơi. Hãy chuyển sang nhân vật khác trước."); return; }
  if (!rosterReadSave(slot) || typeof deleteSlot !== "function") return;
  const deployed = rosterActiveSlots();
  if (deployed.includes(slot)) rosterSaveDeployed(deployed.filter(active => active !== slot));
  if (ROSTER.charSlot === slot) ROSTER.charSlot = SLOT;
  ROSTER.saves.delete(slot);
  ROSTER.units.delete(slot);
  ROSTER.vitals.delete(slot);
  ROSTER.confirmDelete = null;
  await deleteSlot(slot);
}

function rosterCreatePrompt(slot) {
  if (rosterReadSave(slot)) { toast("Vị trí này đã có nhân vật"); return; }
  modal(`<h3>Tạo nhân vật ở Dự bị ${slot - ROSTER_PARTY_SIZE + 1}</h3>
    <p class="desc">Tạo ngay tại vị trí này. Chọn tên, giới tính và hệ; nhân vật mới bắt đầu ở trạng thái dự bị.</p>
    <div class="card"><label>Tên nhân vật <input id="rosterNewName" maxlength="14" minlength="2" placeholder="2–14 ký tự" autocomplete="off"></label>
      <div class="row"><label>Giới tính <select id="rosterNewSex"><option value="0">Nam</option><option value="1">Nữ</option></select></label>
      <label>Ngũ hành <select id="rosterNewSeries">${SERIES.map((name, index) => `<option value="${index}">${esc(name)}</option>`).join("")}</select></label></div>
    </div><div class="btnrow"><button class="btn on" id="rosterCreateNow">Tạo nhân vật</button></div>`, () => {
    const input = $("#rosterNewName"), button = $("#rosterCreateNow");
    button.onclick = () => {
      const name = (input.value || "").trim().replace(/\s+/g, " ");
      if (name.length < 2) { toast("Tên nhân vật cần ít nhất 2 ký tự"); input.focus(); return; }
      if (typeof netOn === "function" && netOn() && typeof NET !== "undefined" && !NET.user) {
        toast("Hãy đăng nhập tài khoản trước khi tạo nhân vật"); return;
      }
      save();
      const old = { state: S, slot: SLOT, stats: R.P, life: R.life, mana: R.mana, dirty: R.dirty, x: H.x, y: H.y, px: H.px, py: H.py };
      let created;
      try {
        S = newSave(); SLOT = slot;
        S.fac = `vo${+$("#rosterNewSeries").value}`;
        S.sex = +$("#rosterNewSex").value; S.sexSet = 1; S.name = name.slice(0, 14);
        if (typeof NET !== "undefined" && NET.user) S.netOwner = NET.user.id;
        starterGear(); R.dirty = !0; recalc(); R.life = R.P.life; R.mana = R.P.mana;
        created = S;
      } catch (error) {
        console.warn("Không tạo được nhân vật dự bị", error);
        toast("Không tạo được nhân vật. Hãy thử lại.");
        return;
      } finally {
        S = old.state; SLOT = old.slot; R.P = old.stats; R.life = old.life; R.mana = old.mana; R.dirty = old.dirty;
        H.x = old.x; H.y = old.y; H.px = old.px; H.py = old.py;
      }
      try {
        created.last = Date.now();
        created.rosterDeployed = rosterActiveSlots().slice();
        const key = slotKey(slot), previous = localStorage.getItem(key);
        if (previous) localStorage.setItem(`${key}_bak`, previous);
        localStorage.setItem(key, pack(created));
        ROSTER.saves.set(slot, { state: created, at: Date.now() });
        ROSTER.units.delete(slot);
        if (typeof netOn === "function" && netOn() && typeof netUploadSlot === "function") Promise.resolve(netUploadSlot(slot, created)).catch(() => {});
      } catch (error) { toast("Không lưu được nhân vật: " + (error.message || error)); return; }
      closeModal(!0);
      if (curTab === "char") refresh();
      toast(`${created.name} đã được tạo trong Dự bị`);
    };
    input.focus();
  });
}

function rosterUnit(slot) {
  let unit = ROSTER.units.get(slot);
  const state = rosterReadSave(slot);
  if (!state) { ROSTER.units.delete(slot); return null; }
  const changed = !unit || unit.cachedAt < Date.now() - 12000 || unit.last !== (state.last || 0);
  const lookKey = [rosterSexCode(state.sex), JSON.stringify(state.eq || {})].join("|");
  const lookChanged = !unit || unit.lookKey !== lookKey;
  if (changed || lookChanged) {
    const stats = rosterCalcSave(state, slot);
    if (!stats) return unit || null;
    const previous = unit;
    const sex = rosterSexCode(state.sex);
    const spawn = previous ? previous : rosterFollowPoint(slot);
    const vitals = ROSTER.vitals.get(slot);
    const max = Math.max(1, stats.life || 1), maxMana = Math.max(1, stats.mana || 1);
    unit = {
      slot, name: state.name || FAC[state.fac].n, fac: state.fac, sex,
      lvl: state.lvl | 0 || 1, last: state.last || 0, state, stats,
      look: typeof jxBuildLook === "function" ? jxBuildLook(sex, state.eq || {}, false) : null,
      lookKey: lookKey,
      max, hp: previous ? Math.min(previous.hp, max) : vitals ? clamp(vitals.hp, 0, 1) * max : max,
      maxMana, mana: previous ? Math.min(previous.mana, maxMana) : vitals ? clamp(vitals.mp, 0, 1) * maxMana : maxMana,
      x: previous ? previous.x : spawn.x, y: previous ? previous.y : spawn.y,
      _px: previous ? previous._px : spawn.x, _py: previous ? previous._py : spawn.y,
      pace: previous ? previous.pace : .94 + (slot % 4) * .035,
      rotI: previous ? previous.rotI || 0 : 0, skillCd: previous ? previous.skillCd || {} : {},
      moving: previous ? !!previous.moving : false,
      face: previous ? previous.face : 1, dir: previous ? previous.dir : 0,
      act: "st", actT: 0, atkCd: .1 + (slot % 3) * .12, down: previous ? previous.down : 0,
      cachedAt: Date.now()
    };
    ROSTER.units.set(slot, unit);
  }
  return unit;
}

function rosterCreate(slot) {
  try { localStorage.setItem(rosterStoreKey("jxidle_roster_create"), JSON.stringify({ slot, replace: SLOT, deployed: rosterActiveSlots() })); } catch {}
  SAVE_LOCK = !0;
  try { localStorage.setItem(SLOT_PTR, String(slot)); sessionStorage.setItem("jxidle_in", String(slot)); } catch {}
  location.reload();
}

function rosterFinishCreate() {
  let pending = null;
  try { pending = JSON.parse(localStorage.getItem(rosterStoreKey("jxidle_roster_create")) || "null"); } catch {}
  if (!pending || pending.slot !== SLOT || !S || !S.fac) return;
  if (Array.isArray(pending.deployed) && pending.deployed.length >= ROSTER_PARTY_SIZE && pending.replace !== SLOT && rosterReadSave(+pending.replace)) {
    ROSTER.suppressCurrent = true;
    try {
      localStorage.setItem(rosterStoreKey("jxidle_roster_deployed"), JSON.stringify(pending.deployed));
      S.rosterDeployed = pending.deployed.slice();
      rosterWriteSave(SLOT, S);
      localStorage.removeItem(rosterStoreKey("jxidle_roster_create"));
      rosterSwitch(+pending.replace);
    } finally { ROSTER.suppressCurrent = false; }
    return;
  }
  const deployed = rosterActiveSlots();
  try { localStorage.setItem(rosterStoreKey("jxidle_roster_deployed"), JSON.stringify(deployed)); localStorage.removeItem(rosterStoreKey("jxidle_roster_create")); } catch {}
  rosterWriteSave(SLOT, S);
}

if (typeof createCharacter === "function") {
  const rosterCreateCharacterBase = createCharacter;
  createCharacter = function(...args) {
    const result = rosterCreateCharacterBase(...args);
    rosterFinishCreate();
    return result;
  };
}

function rosterSwitch(slot) {
  if (slot === SLOT) return;
  const state = rosterReadSave(slot);
  if (!state) return rosterCreate(slot);
  const deployed = rosterActiveSlots();
  if (!deployed.includes(slot)) {
    const replaceIndex = deployed.indexOf(SLOT);
    if (replaceIndex >= 0) deployed[replaceIndex] = slot;
    else if (deployed.length < ROSTER_PARTY_SIZE) deployed.push(slot);
    try { localStorage.setItem(rosterStoreKey("jxidle_roster_deployed"), JSON.stringify(deployed)); } catch {}
  }
  rosterCaptureScene(S);
  let health = R.P && R.P.life ? R.life / R.P.life : 1;
  let mana = R.P && R.P.mana ? R.mana / R.P.mana : 1;
  if (S && S.fac) save();
  const oldSlot = SLOT;
  ROSTER.saves.delete(oldSlot);
  ROSTER.units.delete(oldSlot);
  const oldUnit = rosterUnit(oldSlot);
  if (oldUnit) {
    oldUnit.hp = clamp(health, 0, 1) * oldUnit.max;
    oldUnit.mana = clamp(mana, 0, 1) * oldUnit.maxMana;
    const follow = rosterFollowPoint(oldSlot, slot);
    oldUnit.x = follow.x;
    oldUnit.y = follow.y;
    oldUnit.act = "st";
    ROSTER.vitals.set(oldSlot, { hp: oldUnit.hp / Math.max(1, oldUnit.max), mp: mana });
  }
  const nextUnit = ROSTER.units.get(slot), storedVitals = ROSTER.vitals.get(slot);
  if (nextUnit) {
    health = nextUnit.down > 0 ? 1 : nextUnit.hp / Math.max(1, nextUnit.max);
    if (storedVitals) mana = storedVitals.mp;
    ROSTER.units.delete(slot);
  } else if (storedVitals) {
    health = storedVitals.hp;
    mana = storedVitals.mp;
  }
  S = rosterApplyScene(rosterNormalizeState(state));
  SLOT = slot;
  ROSTER.charSlot = slot;
  if (typeof jxLookCacheKey !== "undefined") { jxLookCacheKey = ""; jxCurrentLook = null; }
  ROSTER_SKILL_SLOT = slot;
  try { localStorage.setItem(SLOT_PTR, String(slot)); } catch {}
  R.atkT = 0;
  R.skCd = {};
  R.moveTo = null;
  R.manTgt = null;
  R.dirty = !0;
  recalc();
  R.life = clamp(health, 0, 1) * R.P.life;
  R.mana = clamp(mana, 0, 1) * R.P.mana;
  ROSTER.vitals.set(slot, { hp: health, mp: mana });
  showTab("char");
  updateTop();
  renderPad();
  save();
}

function rosterInjectTabs() {
  const target = document.getElementById("t-char");
  if (!target) return;
  if (!document.getElementById("rosterTabsCss")) {
    const style = document.createElement("style");
    style.id = "rosterTabsCss";
    style.textContent = `.rs-wrap{margin:0 0 10px;padding:8px;border:1px solid #534a35;background:linear-gradient(135deg,#171a17,#0c100e);border-radius:6px}.rs-head{display:flex;justify-content:space-between;align-items:center;color:#e4cb84;font-weight:bold;margin:0 0 6px}.rs-head small{font-size:10px;color:#aaa18c;font-weight:normal}.rs-tabs{display:flex;flex-wrap:wrap;gap:5px;width:100%;padding:2px;scrollbar-width:thin}.rs-entry{display:flex;flex-direction:column;gap:4px;flex:1 1 150px;min-width:130px;max-width:230px;padding:5px;border:1px solid #61543a;background:linear-gradient(#171a17,#0c100e);border-radius:4px}.rs-entry.current{border-color:#d6b259;background:linear-gradient(#383321,#171a17)}.rs-entry.selected{box-shadow:0 0 0 1px #d6b259}.rs-entry.empty{border-style:dashed;color:#a49b83}.rs-tab{width:100%;min-width:0;padding:4px 6px;border:0;background:transparent;color:#d4c9a9;text-align:left;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rs-tab:hover{color:#fff0c1}.rs-tab.on{color:#ffdf83}.rs-tab small{display:block;color:#a9a18d;font-size:10px;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rs-entry.current .rs-tab small{color:#dfd2a2}.rs-actions{display:flex;gap:4px;flex-wrap:wrap}.rs-actions button{flex:1 1 auto;padding:4px 6px;border:1px solid #675a3f;border-radius:3px;background:#25251e;color:#ded2b2;font-size:10px;cursor:pointer}.rs-actions button:hover{border-color:#d6b259;color:#ffe99e}.rs-actions button:disabled{opacity:.5;cursor:default}.rs-entry.empty .rs-actions button{width:100%}.rs-active-tabs{flex-wrap:nowrap;justify-content:flex-start;overflow-x:auto}.rs-active-tabs .rs-entry{box-sizing:border-box;flex:0 0 160px;min-width:0;max-width:160px}.rs-preview{display:flex;flex-wrap:wrap;gap:5px 12px;padding:5px;color:#bdb39b;font-size:11px}.rs-eq{flex-basis:100%;color:#a9a18d}.rs-eq b{color:#ded2b2}@media(max-width:650px){.rs-entry{flex-basis:calc(50% - 8px);min-width:120px;padding:4px}.rs-tab{font-size:12px}}`;
    document.head.appendChild(style);
  }
  let row = document.getElementById("rosterTabs");
  if (!row) {
    row = document.createElement("nav");
    row.id = "rosterTabs";
    row.className = "rs-tabs";
    row.setAttribute("aria-label", "Nhân vật trong đội hình");
    row.addEventListener("click", event => {
      const tab = event.target.closest("[data-roster-tab]");
      if (tab) {
        const slot = +tab.dataset.rosterTab;
        if (tab.dataset.rosterCreate === "1") rosterCreatePrompt(slot);
        else { ROSTER.charSlot = slot; refresh(); }
        return;
      }
      const action = event.target.closest("[data-roster-action]");
      if (!action || action.disabled) return;
      const slot = +action.dataset.rosterAction;
      if (action.dataset.command === "delete") { ROSTER.confirmDelete = slot; refresh(); }
      else if (action.dataset.command === "cancel-delete") { ROSTER.confirmDelete = null; refresh(); }
      else if (action.dataset.command === "confirm-delete") rosterDelete(slot);
      else if (action.dataset.command === "deploy") rosterDeploy(slot);
      else if (action.dataset.command === "reserve") rosterReserve(slot);
      else if (action.dataset.command === "lead") rosterSwitch(slot);
    });
  }
  const deployed = rosterActiveSlots();
  const selectedSlot = ROSTER.charSlot == null ? SLOT : ROSTER.charSlot;
  const entry = (slot, reserveIndex) => {
    const state = slot === SLOT && S && S.fac ? S : rosterReadSave(slot);
    const label = reserveIndex == null ? `${deployed.indexOf(slot) + 1}` : `D${reserveIndex + 1}`;
    if (!state) return `<div class="rs-entry empty"><button class="rs-tab" data-roster-tab="${slot}" data-roster-create="1">${label} · + Tạo nhân vật</button></div>`;
    const fac = FAC[state.fac];
    const name = esc(state.name || fac && fac.n || `Nhân vật ${slot + 1}`);
    const active = deployed.includes(slot);
    const confirmingDelete = ROSTER.confirmDelete === slot;
    return `<div class="rs-entry${slot === SLOT ? " current" : ""}${slot === selectedSlot ? " selected" : ""}"><button class="rs-tab${slot === SLOT ? " on" : ""}" data-roster-tab="${slot}" title="${name}">${label} · ${name}<small>${active ? "Xuất chiến" : "Dự bị"} · Lv${state.lvl | 0 || 1} · ${esc(fac && fac.n || "Nhân vật")}</small></button>${confirmingDelete
      ? `<div class="rs-delete-confirm"><span>Xóa vĩnh viễn?</span><button data-roster-action="${slot}" data-command="confirm-delete">Đồng ý</button><button data-roster-action="${slot}" data-command="cancel-delete">Hủy</button></div>`
      : `<div class="rs-actions">${active
      ? `<button data-roster-action="${slot}" data-command="lead" ${slot === SLOT ? "disabled" : ""}>${slot === SLOT ? "Đang làm chính" : "Lên làm chính"}</button>${slot === SLOT ? "" : `<button data-roster-action="${slot}" data-command="reserve">Cho dự bị</button>`}`
      : `<button data-roster-action="${slot}" data-command="deploy">Xuất chiến</button>`}${slot === SLOT
      ? `<button class="rs-delete" disabled title="Chuyển sang nhân vật khác trước khi xóa">Xóa</button>`
      : `<button class="rs-delete" data-roster-action="${slot}" data-command="delete">Xóa</button>`}</div>`}</div>`;
  };
  const activeRows = deployed.map(slot => entry(slot, null)).join("");
  const availableSlots = Array.from({ length: SLOT_N }, (_, slot) => slot)
    .filter(slot => slot === SLOT ? !!(S && S.fac) : !!rosterReadSave(slot));
  const reserveSlots = availableSlots.filter(slot => !deployed.includes(slot));
  const createSlots = Array.from({ length: Math.max(0, SLOT_N - ROSTER_PARTY_SIZE) }, (_, index) => ROSTER_PARTY_SIZE + index)
    .filter(slot => !availableSlots.includes(slot));
  const reserveRows = [...reserveSlots, ...createSlots].slice(0, ROSTER_RESERVE_SIZE)
    .map((slot, index) => entry(slot, index)).join("");
  row.innerHTML = `<section class="rs-wrap"><div class="rs-head">Xuất chiến <small>${deployed.length}/${ROSTER_PARTY_SIZE}</small></div><div class="rs-tabs rs-active-tabs">${activeRows}</div></section><section class="rs-wrap"><div class="rs-head">Dự bị <small>Tối đa ${ROSTER_RESERVE_SIZE} nhân vật</small></div><div class="rs-tabs rs-reserve-tabs">${reserveRows}</div></section>`;
  target.prepend(row);
}

function rosterSelectedSlot() {
  const selected = ROSTER.charSlot == null ? SLOT : ROSTER.charSlot;
  if (selected === SLOT || rosterReadSave(selected)) return selected;
  ROSTER.charSlot = SLOT;
  return SLOT;
}

function rosterBindSelectedControls(slot, root) {
  if (!root) return;
  root.querySelectorAll("button, .it[data-uid], [data-mi]").forEach(element => {
    const handler = element.__rosterBaseHandler || element.onclick;
    if (typeof handler !== "function" || element.__rosterBoundSlot === slot) return;
    element.__rosterBaseHandler = handler;
    element.__rosterBoundSlot = slot;
    element.onclick = event => rosterWithSkillSlot(slot, () => {
      const result = handler.call(element, event);
      rosterBindSelectedControls(slot, document.getElementById("mBody"));
      return result;
    }, true);
  });
}

if (typeof renderChar === "function") {
  const rosterRenderCharBase = renderChar;
  renderChar = (...args) => {
    const slot = rosterSelectedSlot();
    const result = slot === SLOT ? rosterRenderCharBase(...args) : rosterWithSkillSlot(slot, () => rosterRenderCharBase(...args));
    rosterInjectTabs();
    rosterBindSelectedControls(slot, document.getElementById("t-char"));
    return result;
  };
}

if (typeof renderInv === "function") {
  const rosterRenderInvBase = renderInv;
  renderInv = (...args) => {
    const slot = rosterSelectedSlot();
    const result = slot === SLOT ? rosterRenderInvBase(...args) : rosterWithSkillSlot(slot, () => rosterRenderInvBase(...args));
    rosterBindSelectedControls(slot, document.getElementById("t-inv"));
    return result;
  };
}

if (typeof itemModal === "function") {
  const rosterItemModalBase = itemModal;
  itemModal = (...args) => {
    const slot = rosterSelectedSlot();
    const result = slot === SLOT ? rosterItemModalBase(...args) : rosterWithSkillSlot(slot, () => rosterItemModalBase(...args));
    rosterBindSelectedControls(slot, document.getElementById("mBody"));
    return result;
  };
}

let ROSTER_SKILL_SLOT = null;

function rosterWithSkillSlot(slot, fn, persist = false) {
  const state = slot === SLOT ? S : rosterReadSave(slot);
  if (!state || slot === SLOT) return fn();
  const previous = { state: S, slot: SLOT, stats: R.P, dirty: R.dirty, ptr: localStorage.getItem(SLOT_PTR) };
  try {
    ROSTER.suppressCurrent = true;
    S = rosterNormalizeState(state);
    SLOT = slot;
    R.dirty = !0;
    recalc();
    const result = fn();
    if (persist) {
      save();
      rosterWriteSave(slot, S);
    }
    return result;
  } finally {
    ROSTER.suppressCurrent = false;
    S = previous.state;
    SLOT = previous.slot;
    R.P = previous.stats;
    R.dirty = previous.dirty;
    try { previous.ptr == null ? localStorage.removeItem(SLOT_PTR) : localStorage.setItem(SLOT_PTR, previous.ptr); } catch {}
  }
}

function rosterSkillTabs() {
  const target = document.getElementById("t-skill");
  if (!target) return;
  rosterInjectTabs();
  let row = document.getElementById("rosterSkillTabs");
  if (!row) {
    row = document.createElement("nav");
    row.id = "rosterSkillTabs";
    row.className = "rs-tabs";
    row.setAttribute("aria-label", "Chọn nhân vật để chỉnh kỹ năng");
    row.addEventListener("click", event => {
      const tab = event.target.closest("[data-skill-roster]");
      if (!tab) return;
      const slot = +tab.dataset.skillRoster;
      if (tab.dataset.create === "1") return rosterCreate(slot);
      ROSTER_SKILL_SLOT = slot;
      renderSkill();
    });
  }
  row.innerHTML = rosterActiveSlots().map(slot => {
    const state = slot === SLOT && S && S.fac ? S : rosterReadSave(slot);
    if (!state) return "";
    const fac = FAC[state.fac], name = esc(state.name || fac && fac.n || `Nhân vật ${slot + 1}`);
    return `<button class="rs-tab${slot === ROSTER_SKILL_SLOT ? " on" : ""}" data-skill-roster="${slot}" title="${name}">${slot + 1} · ${name}<small>Lv${state.lvl | 0 || 1} · ${esc(fac && fac.n || "Nhân vật")}</small></button>`;
  }).join("");
  target.prepend(row);
}

function rosterBindSkillControls(slot, root = document.getElementById("t-skill")) {
  if (!root) return;
  root.querySelectorAll("button, .skl[data-id]").forEach(element => {
    if (typeof element.onclick !== "function" || element.__rosterSkillSlot === slot) return;
    const handler = element.onclick;
    element.__rosterSkillSlot = slot;
    element.onclick = event => rosterWithSkillSlot(slot, () => {
      const result = handler.call(element, event);
      rosterBindSkillControls(slot, document.getElementById("mBody"));
      return result;
    }, true);
  });
}

if (typeof renderSkill === "function") {
  const rosterRenderSkillBase = renderSkill;
  renderSkill = (...args) => {
    if (ROSTER_SKILL_SLOT == null) ROSTER_SKILL_SLOT = SLOT;
    const slot = ROSTER_SKILL_SLOT;
    const result = slot === SLOT ? rosterRenderSkillBase(...args) : rosterWithSkillSlot(slot, () => rosterRenderSkillBase(...args));
    rosterSkillTabs();
    rosterBindSkillControls(slot);
    return result;
  };
}

if (typeof skillModal === "function") {
  const rosterSkillModalBase = skillModal;
  skillModal = skillId => {
    const slot = ROSTER_SKILL_SLOT == null ? SLOT : ROSTER_SKILL_SLOT;
    const result = slot === SLOT ? rosterSkillModalBase(skillId) : rosterWithSkillSlot(slot, () => rosterSkillModalBase(skillId));
    rosterBindSkillControls(slot, document.getElementById("mBody"));
    return result;
  };
}

if (typeof onZoneChange === "function") {
  const rosterZoneChangeBase = onZoneChange;
  onZoneChange = function(...args) {
    const result = rosterZoneChangeBase(...args);
    for (const unit of rosterTeamUnits()) {
      const point = rosterFollowPoint(unit.slot);
      unit.x = point.x;
      unit.y = point.y;
      unit._px = point.x;
      unit._py = point.y;
      unit._pp = null;
      unit._pk = null;
      unit._pi = 0;
      unit._pr = -1;
      unit._recoverTarget = null;
      unit.stuckT = 0;
      unit.moving = false;
      if (unit.down <= 0) { unit.act = "st"; unit.actT = 0; unit.castLock = 0; }
    }
    return result;
  };
}

function rosterCanPay(unit, attack) {
  if (!attack) return false;
  return attack.costLife ? unit.hp > Math.max(1, attack.cost || 0) : unit.mana >= (attack.cost || 0);
}

function rosterAttackReady(unit, attack) {
  return !!attack && (unit.skillCd[attack.id] || 0) <= 0 && rosterCanPay(unit, attack);
}

function rosterChooseAttack(unit) {
  const stats = unit.stats || {}, attacks = stats.actives || [], state = unit.state || {};
  const slots = (state.slots || []).filter(id => id > 0).map(id => attacks.find(attack => attack.id === id)).filter(Boolean);
  if (state.rot !== false && slots.length > 1) {
    for (let step = 0; step < slots.length; step++) {
      const index = (unit.rotI + step) % slots.length, attack = slots[index];
      if (!rosterAttackReady(unit, attack)) continue;
      unit.rotI = (index + 1) % slots.length;
      return attack;
    }
  }
  const preferred = state.mainLock
    ? (state.main === "basic" ? stats.basic : attacks.find(attack => attack.id === +state.main))
    : stats.bestAuto || stats.main;
  if (rosterAttackReady(unit, preferred)) return preferred;
  return attacks.filter(attack => rosterAttackReady(unit, attack)).sort((a, b) => b.dps - a.dps)[0] || stats.basic || null;
}

function rosterAttackDuration(unit, attack) {
  let clip = .38;
  try {
    const act = unit.look && unit.look.acts && unit.look.acts[2];
    const body = unit.look && unit.look.parts && unit.look.parts.body;
    const sprite = act && body && jxLoadSprite(unit.look.sex, "body", body);
    const frames = sprite && sprite.meta && sprite.meta.a && sprite.meta.a[act];
    if (frames && frames.n && frames.i && typeof JX_FRAME_MS === "number") {
      clip = clamp(frames.n * jxActionFrameInterval(frames, "at"), .28, .72);
    }
  } catch {}
  const rate = Math.max(.001, Number(attack && attack.rate) || Number(unit.stats && unit.stats.aspd) || 1);
  const duration = Math.min(1 / rate, clip);
  unit.attackAnimScale = clip / duration;
  return duration;
}

function rosterRecoverPath(unit, goal) {
  unit._pp = null;
  unit._pk = null;
  unit._pi = 0;
  unit._pr = -1;
  if (typeof obsWalk !== "function" || !OBS.g) return false;
  const dx = goal.x - unit.x, dy = goal.y - unit.y, base = Math.atan2(dy, dx);
  let best = null, bestScore = Infinity;
  for (const radius of [24, 38, 54]) {
    for (let i = 0; i < 8; i++) {
      const angle = base + i * Math.PI / 4;
      const x = unit.x + Math.cos(angle) * radius, y = unit.y + Math.sin(angle) * radius;
      if (!obsWalk(x, y)) continue;
      const progress = Math.hypot(goal.x - x, goal.y - y);
      const sideStep = Math.abs(Math.sin(angle - base));
      const score = progress - sideStep * 22 + Math.random() * 2;
      if (score < bestScore) { bestScore = score; best = { x, y }; }
    }
    if (best) break;
  }
  if (!best) return false;
  unit._recoverTarget = best;
  return true;
}

function rosterPotionPick(unit, kind) {
  const state = unit.state || {}, config = S || state, stock = state.potStock || (state.potStock = { life: {}, mana: {} });
  const slot = (config.potSlot || [])[kind === "life" ? 0 : 1];
  let potion = slot && slot !== "auto" && typeof potByKey === "function" ? potByKey(slot) : null;
  if (!potion || (potion.kind !== kind && potion.kind !== "both") || unit.lvl < (POT_TIER_LV[potion.tier] || 999)) potion = null;
  if (!potion || !(stock[potion.kind] && stock[potion.kind][potion.tier] > 0)) {
    potion = J.potions.filter(item => (item.kind === kind || item.kind === "both") && unit.lvl >= (POT_TIER_LV[item.tier] || 999) && stock[item.kind] && stock[item.kind][item.tier] > 0).sort((a, b) => b.tier - a.tier)[0] || null;
  }
  if (potion) return { potion, free: true };
  return null;   // bỏ thuốc mua bằng ngân lượng: đồng hành không tự mua thuốc
  const preferred = slot && slot !== "auto" && typeof potByKey === "function" ? potByKey(slot) : null;
  const candidates = preferred && (preferred.kind === kind || preferred.kind === "both") && unit.lvl >= (POT_TIER_LV[preferred.tier] || 999)
    ? [preferred, ...J.potions.filter(item => item !== preferred && (item.kind === kind || item.kind === "both") && unit.lvl >= (POT_TIER_LV[item.tier] || 999)).sort((a, b) => b.tier - a.tier)]
    : J.potions.filter(item => (item.kind === kind || item.kind === "both") && unit.lvl >= (POT_TIER_LV[item.tier] || 999)).sort((a, b) => b.tier - a.tier);
  const buy = candidates.find(item => Math.round(item.price * (1 + unit.lvl / 25)) * 10 <= (state.gold || 0) * .2);
  if (!buy) return null;
  state.gold -= Math.round(buy.price * (1 + unit.lvl / 25)) * 10;
  stock[buy.kind] = stock[buy.kind] || {};
  stock[buy.kind][buy.tier] = (stock[buy.kind][buy.tier] || 0) + 10;
  return { potion: buy, free: true };
}

function rosterAutoPotion(unit, dt) {
  const state = unit.state || (unit.state = {}), hot = unit.hot || (unit.hot = { life: 0, mana: 0, lifeT: 0, manaT: 0 });
  // Hồ Lô dùng chung cho cả đội: mỗi nhân vật có bình riêng, cùng cấp với nhân vật chính
  if (typeof holoState === "function") {
    const holo = holoState(state), lead = typeof S !== "undefined" && S ? holoState(S) : null;
    if (lead && holo.lv < lead.lv) { holo.lv = lead.lv; holo.gulps = holoMaxGulps(holo.lv); }
    for (const kind of ["life", "mana"]) {
      const time = Math.min(dt, hot[kind + "T"] || 0);
      if (time > 0) { hot[kind + "T"] -= time; unit[kind === "life" ? "hp" : "mana"] += hot[kind] * time; }
    }
    unit.hp = Math.min(unit.max, unit.hp);
    unit.mana = Math.min(unit.maxMana, unit.mana);
    holo.cd = Math.max(0, (holo.cd || 0) - dt);
    if (!R.town && !R.dg && !R.tower && holo.gulps < holoMaxGulps(holo.lv)) {
      holo.refillT = (holo.refillT || 0) + dt;
      if (holo.refillT >= HOLO_REFILL) { holo.refillT -= HOLO_REFILL; holo.gulps = Math.min(holoMaxGulps(holo.lv), holo.gulps + 1); }
    }
    const config = S || state;
    if (config.holoOff || holo.cd > 0 || holo.gulps < 1) return false;
    const hpPct = (config.holoHp ?? 50) / 100, mpPct = (config.holoMp ?? 0) / 100;
    const lowLife = unit.hp < unit.max * hpPct;
    const lowMana = mpPct > 0.05 && unit.stats && unit.stats.main && unit.stats.main.cost > 0 && unit.mana < unit.maxMana * mpPct;
    if (!lowLife && !lowMana) return false;
    const pct = holoPct(holo.lv);
    unit.hp = Math.min(unit.max, unit.hp + unit.max * pct);
    unit.mana = Math.min(unit.maxMana, unit.mana + unit.maxMana * pct);
    holo.gulps--;
    holo.cd = HOLO_COOLDOWN;
    if (holo.lv >= 9) { holo.regen = HOLO_LV9_REGEN; holo.regenT = HOLO_LV9_REGEN; }
    rosterWriteSave(unit.slot, state);
    return true;
  }
  for (const kind of ["life", "mana"]) {
    const time = Math.min(dt, hot[kind + "T"] || 0);
    if (time > 0) { hot[kind + "T"] -= time; unit[kind === "life" ? "hp" : "mana"] += hot[kind] * time; }
  }
  unit.hp = Math.min(unit.max, unit.hp);
  unit.mana = Math.min(unit.maxMana, unit.mana);
  const config = S || state;
  if (config.potOff) return false;
  unit.potCd = Math.max(0, (unit.potCd || 0) - dt);
  if (unit.potCd > 0) return false;
  const hpPct = (config.potHp ?? 50) / 100, mpPct = (config.potMp ?? 50) / 100, urgent = (config.potUrg ?? 30) / 100;
  const needLife = unit.hp < unit.max * hpPct, needMana = unit.mana < unit.maxMana * mpPct && (unit.stats.main && unit.stats.main.cost > 0);
  const kind = unit.hp < unit.max * urgent ? "life" : needLife ? "life" : needMana ? "mana" : null;
  if (!kind) return false;
  const picked = rosterPotionPick(unit, kind);
  if (!picked) return false;
  const { potion } = picked, stock = state.potStock;
  if (stock[potion.kind] && stock[potion.kind][potion.tier] > 0) stock[potion.kind][potion.tier]--;
  else {
    const cost = Math.round(potion.price * (1 + unit.lvl / 25));
    if ((state.gold || 0) < cost) return false;
    state.gold -= cost;
  }
  const addHot = (target, amount, duration) => {
    if (!(duration > 0)) return;
    const existing = hot[target + "T"] > 0 ? hot[target] * hot[target + "T"] : 0;
    hot[target + "T"] = duration;
    hot[target] = (existing + amount) / duration;
  };
  if (potion.kind === "both") { addHot("life", potion.total, potion.dur); addHot("mana", potion.mtotal, potion.mdur); }
  else addHot(kind, potion.total, potion.dur);
  state.potUsed = (state.potUsed || 0) + 1;
  unit.potCd = POT_CD;
  rosterWriteSave(unit.slot, state);
  return true;
}

function rosterManualMovementActive() {
  const pointerMove = INPUT && INPUT.active && INPUT.moved;
  const clickMove = INPUT && INPUT.target;
  const keyMove = INPUT && INPUT.keys && Object.values(INPUT.keys).some(Boolean);
  const padMove = typeof GP !== "undefined" && GP.v && Math.hypot(GP.v[0] || 0, GP.v[1] || 0) > .15;
  return !!(pointerMove || clickMove || keyMove || padMove);
}

/* heroAttack được khai báo bằng `function` trong combat.js (nạp ở bundle 3) nên ĐÃ tồn tại khi
 * file này chạy. Bản cũ bọc ngay tại đây, nhưng khai báo `const`/`let` phía dưới file chưa chạy
 * xong lúc init() gọi calc() → TDZ "Cannot access ... before initialization".
 * Nay chỉ ghi nhận hàm gốc; phần bọc được lắp SAU KHI file nạp xong (xem cuối file). */
let rosterHeroAttackBase = null;

function rosterDamage(unit, enemy, attack) {
  if (!enemy || enemy.dead || enemy.hp <= 0 || !attack) return 0;
  enemy.aggro = true;
  if (attack.useAR && Math.random() * 100 >= hitPercent(attack.ar || unit.stats.ar, Math.max(0, enemy.def || 0), attack.ignore)) {
    addText(enemy.x, enemy.y - (enemy.r || 16) - 8, "Trượt", "#aaa", 11);
    return 0;
  }
  const series = attack.series == null ? (unit.stats.series || 0) : attack.series;
  const resist = enemy.res || { phys: 0, poison: 0, cold: 0, fire: 0, light: 0 };
  const critical = Math.random() * 100 < (attack.crit || 0);
  let damage = 0, bestElement = "phys", bestPart = 0;
  for (const element of ELEM) {
    const base = attack.parts && attack.parts[element];
    if (!(base > 0)) continue;
    const raw = base * rnd(.85, 1.15);
    if (element === "poison") {
      const duration = attack.poisonT || POISON_TIME;
      const prior = enemy.poison > 0 ? enemy.poisonDmg * enemy.poison : 0;
      const next = applyPart(raw, element, series, enemy.series, resist, 75, attack.series5) * cheatK();
      enemy.poisonDmg = (prior + next) / Math.max(duration, enemy.poison > 0 ? enemy.poison : 0);
      enemy.poison = Math.max(duration, enemy.poison || 0);
      continue;
    }
    let part = applyPart(raw, element, series, enemy.series, resist, 75, attack.series5);
    if (element === "phys" && critical) part *= CRIT_MULT;
    damage += part;
    if (part > bestPart) { bestPart = part; bestElement = element; }
  }
  if (counters(series, enemy.series)) damage += attack.series5 || 0;
  damage = Math.max(0, damage * cheatK());
  if (attack.parts && attack.parts.cold && !(enemy.slowT > 0)) enemy.slowT = attack.coldT || ELEM_SLOW_T;
  if (attack.parts && attack.parts.light && Math.random() < ELEM_STUN_P) enemy.stun = Math.max(enemy.stun || 0, ELEM_STUN_T);
  if (damage > 0) {
    enemy.hp -= damage;
    enemy.hitT = .12;
    if (enemy.act !== "at") { enemy.act = "hurt"; enemy.actT = 0; }
    const suffix = counters(series, enemy.series) ? " ⚡" : counters(enemy.series, series) ? " 🛡" : "";
    addText(enemy.x, enemy.y - (enemy.r || 16) - 6, `${fmt(damage)}${suffix}${critical ? "!" : ""}`, critical ? "#ffe14a" : ELEM_COL[bestElement], critical ? 15 : 11);
  }
  typeof stateOnHit === "function" && stateOnHit(attack, enemy);
  return damage;
}

function rosterResolveAttack(unit, enemy, attack) {
  const castRange = Math.max(0, attack.rad || 0);
  const targetDistance = target => Math.max(0, jxdE(unit, target) - (target.r || 0) / JX_K);
  if (targetDistance(enemy) > castRange || !obsSee(unit.x, unit.y, enemy.x, enemy.y)) return;
  const targets = [enemy], limit = attack.around ? 8 : Math.min(8, Math.max(1, attack.targets || 1));
  if (limit > 1 || attack.around) {
    const center = attack.around ? unit : enemy;
    const radius = attack.around ? castRange + 40 : 110;
    for (const candidate of (R.enemies || []).filter(target => target !== enemy && !target.dead && target.hp > 0)
      .sort((a, b) => jxdE(center, a) - jxdE(center, b))) {
      if (targets.length >= limit || targetDistance(candidate) > castRange || jxdE(center, candidate) > radius || !obsSee(unit.x, unit.y, candidate.x, candidate.y)) continue;
      targets.push(candidate);
    }
  }
  for (const target of targets) rosterDamage(unit, target, attack);
  if (!R.quiet && typeof skillFx === "function") {
    const heroX = H.x, heroY = H.y;
    H.x = unit.x;
    H.y = unit.y;
    try { skillFx(unit, enemy, attack); }
    finally { H.x = heroX; H.y = heroY; }
  }
}

function rosterTick(dt) {
  if (!S || !S.fac || R.deadT > 0) return;
  R.P && ROSTER.vitals.set(SLOT, { hp: R.life / Math.max(1, R.P.life), mp: R.mana / Math.max(1, R.P.mana) });
  const units = rosterTeamUnits();
  let attacked = false;
  units.forEach(unit => {
    if (unit.down > 0) {
      unit.down = Math.max(0, unit.down - dt);
      if (!unit.down) { unit.hp = unit.max; unit.mana = unit.maxMana; ROSTER.vitals.set(unit.slot, { hp: 1, mp: 1 }); }
      return;
    }
    rosterAutoPotion(unit, dt);
    if (unit.act === "at") {
      unit.actT += dt;
      if (unit.actT < (unit.castLock || .38)) {
        unit.moving = false;
        unit.atkCd = Math.max(0, unit.atkCd - dt);
        for (const id in unit.skillCd) unit.skillCd[id] = Math.max(0, unit.skillCd[id] - dt);
        unit.mana = Math.min(unit.maxMana, unit.mana + (unit.stats.manaRegen || 0) * dt);
        ROSTER.vitals.set(unit.slot, { hp: clamp(unit.hp / Math.max(1, unit.max), 0, 1), mp: clamp(unit.mana / Math.max(1, unit.maxMana), 0, 1) });
        return;
      }
      unit.act = "st";
      unit.actT = 0;
      unit.castLock = 0;
    }
    unit.atkCd = Math.max(0, unit.atkCd - dt);
    for (const id in unit.skillCd) unit.skillCd[id] = Math.max(0, unit.skillCd[id] - dt);
    unit.mana = Math.min(unit.maxMana, unit.mana + (unit.stats.manaRegen || 0) * dt);

    const manualMode = manual();
    const attack = manualMode ? null : rosterChooseAttack(unit);
    const alive = (R.enemies || []).filter(target => !target.dead && target.hp > 0);
    const enemy = manualMode ? null : (!R.town && !R.pkTarget && (alive.find(target => target.cls === "boss" || target.goldBoss) || alive.sort((a, b) => jxdE(unit, a) - jxdE(unit, b))[0]));
    const leaderDistance = jxdE(unit, H), recalling = leaderDistance > ROSTER_RECALL_DISTANCE;
    let goal = rosterFollowPoint(unit.slot), inRange = false;
    if (recalling) unit._recoverTarget = null;
    if (unit._recoverTarget) {
      if (Math.hypot(unit._recoverTarget.x - unit.x, unit._recoverTarget.y - unit.y) < 12) unit._recoverTarget = null;
      else goal = unit._recoverTarget;
    }
    if (!recalling && enemy && attack) {
      const distance = jxdE(unit, enemy) - (enemy.r || 16) / JX_K;
      const reach = Math.max(36, attack.rad || 60);
      const lineOfSight = obsSee(unit.x, unit.y, enemy.x, enemy.y);
      inRange = distance <= reach && lineOfSight;
      const separatedFromLeader = leaderDistance > ROSTER_FOLLOW_RADIUS;
      if (inRange) {
        unit._recoverTarget = null;
        goal = { x: unit.x, y: unit.y };
        unit.moving = false;
        if (unit.act === "run") { unit.act = "st"; unit.actT = 0; }
        unit.face = enemy.x >= unit.x ? 1 : -1;
        unit.dir = dirOf(enemy.x - unit.x, enemy.y - unit.y);
        if (unit.atkCd <= 0 && rosterAttackReady(unit, attack)) {
          if (attack.costLife) unit.hp = Math.max(1, unit.hp - (attack.cost || 0));
          else unit.mana = Math.max(0, unit.mana - (attack.cost || 0));
          unit.act = "at";
          unit.actT = 0;
          unit.castLock = rosterAttackDuration(unit, attack);
          unit.atkCd = 1 / Math.max(.3, attack.rate || unit.stats.aspd || 1);
          if (attack.id && attack.cd) unit.skillCd[attack.id] = attack.cd;
          rosterResolveAttack(unit, enemy, attack);
          attacked = true;
        }
      } else if (!separatedFromLeader && jxdE(enemy, H) < 330) {
        goal = { x: enemy.x, y: enemy.y };
      }
    }

    const dx = goal.x - unit.x, dy = goal.y - unit.y, distance = Math.hypot(dx, dy);
    if (!inRange && distance > 9 && unit.act !== "at") {
      const speed = 150 * unit.pace * clamp(unit.stats.speedFoot || 1, .78, 1.3) * (recalling ? ROSTER_RECALL_SPEED : 1);
      const eased = distance < 54 ? speed * (.42 + .58 * distance / 54) : speed;
      const oldX = unit.x, oldY = unit.y;
      if (typeof obsSteer === "function") obsSteer(unit, goal.x, goal.y, eased * dt);
      else {
        const step = Math.min(distance, eased * dt);
        unit.x += dx / distance * step;
        unit.y += dy / distance * step;
      }
      const movedX = unit.x - oldX, movedY = unit.y - oldY;
      unit.moving = Math.hypot(movedX, movedY) > .1;
      if (distance > 18 && Math.hypot(movedX, movedY) < .08) {
        unit.stuckT = (unit.stuckT || 0) + dt;
        if (unit.stuckT > .55) {
          unit.stuckT = 0;
          rosterRecoverPath(unit, goal);
        }
      } else unit.stuckT = 0;
      if (unit.moving) {
        unit.face = movedX >= 0 ? 1 : -1;
        unit.dir = dirOf(movedX, movedY);
        if (unit.act !== "at") {
          if (unit.act !== "run") unit.actT = 0;
          unit.act = "run";
          unit.actT += dt;
        }
      } else if (unit.act !== "at") { unit.act = "st"; unit.actT = 0; }
    } else {
      unit.moving = false;
      if (unit.act !== "at") { unit.act = "st"; unit.actT = 0; }
    }
    ROSTER.vitals.set(unit.slot, {
      hp: clamp(unit.hp / Math.max(1, unit.max), 0, 1),
      mp: clamp(unit.mana / Math.max(1, unit.maxMana), 0, 1)
    });
  });
  if (attacked) killCheck();
}

function allyEnts() {
  return rosterTeamUnits().map(unit => ({ ally: unit, y: unit.y }));
}

function allyDraw(ctx, unit, dt) {
  const previous = CX;
  const dx = unit.x - (unit._animX == null ? unit.x : unit._animX), dy = unit.y - (unit._animY == null ? unit.y : unit._animY);
  const moved = Math.hypot(dx, dy);
  unit._animX = unit.x; unit._animY = unit.y;
  if (moved > 200) unit.runT = 0;
  else if (unit.moving) unit.runT = (unit.runT || 0) + moved / 150;
  CX = ctx;
  try {
    // vòng sáng của nhân vật phụ: aura họ đã học & đang bật
    if (typeof drawAllyAura === "function") { try { drawAllyAura(ctx, unit, dt); } catch (e) { console.warn("[aura đồng đội]", e); } }
    drawGroundShadow(ctx, unit.x, unit.y, 15, 5.7, .32);
    let drawn = false;
    if (unit.look && typeof drawJxHero === "function") {
      const actTime = unit.act === "run" ? (unit.runT || 0) : unit.act === "at" ? (unit.actT || 0) * (unit.attackAnimScale || 1) : unit.actT || 0;
      drawn = !!drawJxHero(unit.down > 0 ? "st" : unit.act === "run" ? "run" : unit.act, unit.dir || 0, actTime, unit.x, unit.y, HERO_SCALE, unit.down > 0 ? .48 : 1, unit.look);
    }
    if (!drawn) {
      const gfx = heroGfx(unit.fac, rosterSexCode(unit.sex)), sprite = gfx && gfx.img ? img(gfx.img) : null;
      if (sprite && sprite.complete && sprite.naturalWidth) {
        const scale = Math.min(34 / sprite.naturalWidth, 44 / sprite.naturalHeight);
        ctx.drawImage(sprite, unit.x - sprite.naturalWidth * scale / 2, unit.y - sprite.naturalHeight * scale, sprite.naturalWidth * scale, sprite.naturalHeight * scale);
      }
    }
    label(unit.x, unit.y - 52, `${unit.name} · Lv${unit.lvl}`, typeof nameCol === "function" ? nameCol(unit.name, unit.fac) : "#73d8ff", 10,
      unit.max ? unit.hp / unit.max : 1, "#50d870", "", void 0, void 0, false);
    if (unit.down > 0) label(unit.x, unit.y - 65, "Hồi sức", "#bfc4cb", 9, -1, "#aaa", "", void 0, void 0, false);
  } finally { CX = previous; }
}

function allyTgt(enemy) {
  const unit = rosterTeamUnits().filter(member => member.hp > 0 && !member.down)
    .sort((a, b) => Math.hypot(a.x - enemy.x, a.y - enemy.y) - Math.hypot(b.x - enemy.x, b.y - enemy.y))[0];
  return unit && Math.hypot(unit.x - enemy.x, unit.y - enemy.y) < 300 ? unit : null;
}

function allyHurt(unit, enemy) {
  if (!unit || unit.slot == null || unit.down > 0) return;
  const element = SERIES_ELEM[enemy.series] || "phys";
  const resist = unit.stats && unit.stats.res ? unit.stats.res[element] || 0 : 0;
  const defense = unit.stats && unit.stats.def || 0;
  const damage = Math.max(1, enemy.dmg * (.8 + Math.random() * .4) * (1 - clamp(resist, -50, 85) / 100) * 100 / (100 + Math.max(0, defense)));
  unit.hp -= damage;
  ROSTER.vitals.set(unit.slot, {
    hp: clamp(unit.hp / Math.max(1, unit.max), 0, 1),
    mp: clamp(unit.mana / Math.max(1, unit.maxMana), 0, 1)
  });
  if (unit.hp <= 0) { unit.hp = 0; unit.down = 8; unit.act = "die"; }
}

let rosterGainXpBase = null;

function rosterFlushCloud() {
  if (!ROSTER.dirty.size || typeof netOn !== "function" || !netOn() || !NET.user || typeof netUploadSlot !== "function") return;
  const dirty = [...ROSTER.dirty];
  ROSTER.dirty.clear();
  for (const slot of dirty) {
    const state = rosterReadSave(slot);
    if (!state) continue;
    try { Promise.resolve(netUploadSlot(slot, state)).catch(error => console.warn("Không đồng bộ được thành viên đội hình", error)); }
    catch (error) { console.warn("Không đồng bộ được thành viên đội hình", error); }
  }
}




/* ----------------------------------------------------------------------------
 * Lắp bọc heroAttack — chạy khi TOÀN BỘ file đã nạp xong.
 * Nhờ vậy init() (được main.js gọi ngay sau khi nạp file này) luôn thấy bản đã bọc,
 * và không còn truy cập biến `const` nào đang trong TDZ.
 * -------------------------------------------------------------------------- */
rosterHeroAttackBase = heroAttack;
heroAttack = function (...args) {
  if (manual() && rosterManualMovementActive()) return .05;
  return rosterHeroAttackBase(...args);
};

/* Lắp bọc gainXp sau khi toàn bộ file đã nạp xong (tránh TDZ khi init() → calc() chạy sớm). */
rosterGainXpBase = gainXp;
gainXp = function(amount) {
  if (ROSTER.sharingXp || !(amount > 0)) return rosterGainXpBase(amount);
  const slots = rosterActiveSlots().filter(slot => {
    const state = slot === SLOT ? S : rosterReadSave(slot);
    return state && (state.lvl | 0) < levelCap();
  });
  if (slots.length < 2) return rosterGainXpBase(amount);
  const share = amount / slots.length;
  ROSTER.sharingXp = true;
  try {
    const gained = rosterGainXpBase(slots.includes(SLOT) ? share : 0);
    for (const slot of slots) {
      if (slot === SLOT) continue;
      const state = rosterReadSave(slot);
      if (!state) continue;
      const oldLevel = state.lvl | 0;
      state.xp = (state.xp || 0) + gained;
      while ((state.lvl | 0) < levelCap() && state.xp >= (J.exp[(state.lvl | 0) - 1] || Infinity)) {
        state.xp -= J.exp[(state.lvl | 0) - 1];
        state.lvl++;
        state.attrPts = (state.attrPts || 0) + PTS_PER_LEVEL;
        state.skPts = (state.skPts || 0) + SKILL_PTS_PER_LEVEL;
      }
      rosterWriteSave(slot, state);
      if ((state.lvl | 0) !== oldLevel) ROSTER.units.delete(slot);
    }
    return gained;
  } finally { ROSTER.sharingXp = false; }
};

/* ==== Bọc hàm — lắp SAU KHI file nạp xong (tránh TDZ khi init() chạy sớm) ==== */
const rosterSaveBase = save;
save = function(...args) {
  const savedSlot = SLOT;
  rosterCaptureScene(S);
  if (S && S.fac) S.rosterDeployed = rosterActiveSlots();
  const result = rosterSaveBase(...args);
  ROSTER.saves.delete(savedSlot);
  rosterFlushCloud();
  return result;
};

const rosterTickBase = tick;
tick = function(dt) {
  rosterTick(dt);
  rosterTickBase(dt);
};

if (typeof movers === "function") {
  const rosterMoversBase = movers;
  movers = function(...args) {
    return rosterMoversBase(...args).concat(rosterTeamUnits());
  };
}

function rosterSyncAssistantSettings() {
  if (!S || !S.fac) { if (typeof toast === "function") toast("Chưa có nhân vật chính"); return; }
  const keys = ['ctrl','rot','closeAtk','bossFirst','tgtPri','autoRide','autoMap','holoOff','potOff','potHp','potMp','potUrg','potSlot','autoEquip','autoBuy','autoJunk','autoPts','autoLdt','autoFuse','goldMsg','matMsg','lootMsg','lootF','joyOn','autoSell','autoForge'];
  const slots = Array.from({ length: SLOT_N }, (_, slot) => slot).filter(slot => slot !== SLOT);
  let count = 0;
  for (const slot of slots) {
    const state = rosterReadSave(slot);
    if (!state || !state.fac) continue;
    for (const key of keys) {
      if (S[key] === undefined) continue;
      try { state[key] = (typeof S[key] === 'object' && S[key] !== null) ? JSON.parse(JSON.stringify(S[key])) : S[key]; } catch {}
    }
    if (S.dt) { try { state.dt = JSON.parse(JSON.stringify(S.dt)); } catch {} }
    if (rosterWriteSave(slot, state)) count++;
  }
  if (typeof toast === "function") toast("Đã đồng bộ Trợ Thủ cho " + count + " nhân vật");
  if (typeof save === "function") save();
}
