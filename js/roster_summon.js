"use strict";

const ROSTER_SUMMON_STORE = "jxidle_roster_summon_slots";

function rosterSummonRead() {
  try {
    const value = JSON.parse(localStorage.getItem(rosterStoreKey(ROSTER_SUMMON_STORE)) || "[]");
    return Array.isArray(value) ? [...new Set(value.map(Number))].filter(Number.isInteger).slice(0, ROSTER_PARTY_SIZE - 1) : [];
  } catch { return []; }
}

function rosterSummonRemember(slots) {
  const helpers = [...new Set((slots || []).map(Number))]
    .filter(slot => slot !== SLOT && rosterReadSave(slot) && rosterReadSave(slot).fac)
    .slice(0, ROSTER_PARTY_SIZE - 1);
  if (!helpers.length) return [];
  try { localStorage.setItem(rosterStoreKey(ROSTER_SUMMON_STORE), JSON.stringify(helpers)); } catch {}
  return helpers;
}

function rosterSummonActive() {
  return rosterActiveSlots().filter(slot => slot !== SLOT);
}

function rosterSummonRefresh() {
  const button = typeof $ === "function" ? $("#summonBtn") : null;
  if (!button) return;
  const active = rosterSummonActive(), saved = rosterSummonRead();
  button.innerHTML = 'Đệ tử: <i class="ck"></i>';
  button.classList.toggle("on", active.length > 0);
  const slots = active.length ? active : saved;
  const names = slots.map(slot => {
    const state = rosterReadSave(slot);
    return state && (state.name || FAC[state.fac] && FAC[state.fac].n);
  }).filter(Boolean);
  button.title = active.length
    ? `Thu ${active.length} đệ tử về Dự bị · ${names.join(", ")}`
    : saved.length
      ? `Triệu hồi lại ${saved.length} đệ tử · ${names.join(", ")}`
      : "Chưa có đội hình đã nhớ · hãy cho nhân vật xuất chiến trong màn Nhân vật";
}

function rosterSummonToggle() {
  const active = rosterSummonActive();
  if (active.length) {
    rosterSummonRemember(active);
    for (const slot of active) ROSTER.units.delete(slot);
    rosterSaveDeployed([SLOT]);
    R.dirty = true;
    recalc();
    rosterSummonRefresh();
    toast(`Đã thu ${active.length} đệ tử về Dự bị`);
    return;
  }

  const saved = rosterSummonRead();
  const valid = saved.filter(slot => slot !== SLOT && rosterReadSave(slot) && rosterReadSave(slot).fac)
    .slice(0, ROSTER_PARTY_SIZE - 1);
  if (!valid.length) {
    rosterSummonRefresh();
    toast("Chưa có đội hình đệ tử đã nhớ. Hãy chọn Xuất chiến trong màn Nhân vật.");
    return;
  }
  for (const slot of valid) ROSTER.units.delete(slot);
  rosterSaveDeployed([SLOT, ...valid]);
  R.dirty = true;
  recalc();
  rosterSummonRefresh();
  toast(`Đã triệu hồi ${valid.length} đệ tử${valid.length < 3 ? " · không tự thay người còn thiếu" : ""}`);
}

const rosterSummonSaveDeployedBase = rosterSaveDeployed;
rosterSaveDeployed = function(slots) {
  const result = rosterSummonSaveDeployedBase(slots);
  if (result.some(slot => slot !== SLOT)) rosterSummonRemember(result);
  rosterSummonRefresh();
  return result;
};

const rosterSummonRenderPadBase = renderPad;
renderPad = function(...args) {
  const result = rosterSummonRenderPadBase.apply(this, args);
  rosterSummonRefresh();
  return result;
};

function rosterSummonInit() {
  const button = typeof $ === "function" ? $("#summonBtn") : null;
  if (!button || button.__rosterSummonBound) return;
  button.__rosterSummonBound = true;
  button.onclick = rosterSummonToggle;
  const active = rosterSummonActive();
  if (active.length) rosterSummonRemember(active);
  rosterSummonRefresh();
}

rosterSummonInit();
