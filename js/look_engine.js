"use strict";

const JX_PART_NAME = {
  0: "head",
  1: "hair",
  4: "shoulder",
  5: "body",
  6: "lhand",
  7: "rhand",
  8: "lweapon",
  9: "rweapon",
  12: "horsef",
  13: "horsem",
  14: "horseb"
};

const JX_FRAME_MS = 1000 / 18;
const JX_RUN_CYCLE_MS = 6 * 71; // Match the existing six-frame faction run clip.
function jxActionFrameInterval(meta, act) {
  if (!meta) return 1 / 18;
  if (act === "run") return (JX_RUN_CYCLE_MS / 1000) / Math.max(1, meta.n || 1);
  const ticks = Number(meta.i) || 3;
  return ticks > 40 ? ticks / 1000 : ticks * JX_FRAME_MS / 1000;
}
const JX_SPRITE_CACHE = new Map();
let JX_WEB_LOOK = null;
let JX_WEB_LOOK_LOADING = false;
let JX_WEB_LOOK_RETRY_AT = 0;
const JX_WEB_IMAGES = new Map();
const JX_WEB_PARTS = {
  0: "头部",
  1: "发型",
  4: "肩膀",
  5: "躯体",
  6: "左手",
  7: "右手",
  8: "左手武器",
  9: "右手武器",
  12: "马前",
  13: "马中",
  14: "马后"
};
const JX_WEB_ITEM_GROUPS = {
  helm: "helm",
  armor: "armor",
  weapon: "melee",
  horse: "horse"
};

function jxLoadWebLook() {
  if (JX_WEB_LOOK || JX_WEB_LOOK_LOADING || performance.now() < JX_WEB_LOOK_RETRY_AT) return;
  JX_WEB_LOOK_LOADING = true;
  fetch("img/look/web-jxlook.json")
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(data => {
      if (!data || !data.sheets || !data.tabs || !data.assoc || !data.sort) {
        throw new Error("Invalid web sprite manifest");
      }
      JX_WEB_LOOK = data;
    })
    .catch(error => {
      JX_WEB_LOOK_RETRY_AT = performance.now() + 15000;
      console.warn("[JX web sprites] Could not load sprite manifest:", error);
    })
    .finally(() => { JX_WEB_LOOK_LOADING = false; });
}

function jxWebItemRow(item, group) {
  const data = JX_WEB_LOOK;
  const category = group === "weapon" && item && item.d === 1 ? "range" : JX_WEB_ITEM_GROUPS[group];
  const table = data && data.res && data.res[category];
  if (!table) return 0;
  if (!item && group === "horse") return 0;
  let p = item && item.p;
  if (p == null && item) {
    const itemDef = J.items && J.items.find(x => x.detail === item.d);
    const itemList = itemDef && itemDef.list;
    const itemEntry = itemList && itemList.find(x => x.n === item.n);
    p = itemEntry ? itemEntry.p : -1;
  }
  // Equipped items must render their own sprite even when reqOk() is false for the
  // main character (e.g. follower gear of the opposite sex / different faction).
  const usable = !!item;
  let rowKey = usable && p >= 0 ? String(p + 2) : "1";
  let row = Number(table[rowKey]);
  if (!row && usable) {
    // Prefer the legacy atlas row (handles set items and high-level items better
    // than guessing from p), then map it to the nearest existing web tab row.
    const legacyRow = typeof jxGetItemRow === "function" ? jxGetItemRow(item, group) : 0;
    const tabNameByCat = { helm: "头部", armor: "躯体", melee: "左手武器", range: "左手武器", horse: "马中" };
    const tabName = tabNameByCat[category];
    const tabs = JX_WEB_LOOK && JX_WEB_LOOK.tabs && (JX_WEB_LOOK.tabs.f || JX_WEB_LOOK.tabs.m);
    const tab = tabs && tabName ? tabs[tabName] : null;
    const existingRows = tab ? Object.keys(tab).map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b) : null;

    if (legacyRow > 0 && existingRows && existingRows.length) {
      const tabRow = legacyRow - 1; // legacy row (1-based) -> web tab row (0-based)
      let chosen = existingRows[0];
      let bestDiff = Math.abs(existingRows[0] - tabRow);
      for (const r of existingRows) {
        const diff = Math.abs(r - tabRow);
        if (diff < bestDiff) { bestDiff = diff; chosen = r; }
      }
      row = chosen + 2; // back to web value
    } else if (p >= 0) {
      const keys = Object.keys(table).map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b);
      let nearest = null;
      for (const k of keys) { if (k <= p + 2) nearest = k; else break; }
      if (nearest != null) row = Number(table[String(nearest)]);
    }
  }
  if (!row) row = Number(table["1"]) || 0;
  return row - 2;
}

function jxWebRows(look) {
  if (look.rows) return look.rows;
  const eq = look.eq || {};
  return {
    helm: jxWebItemRow(eq.helm, "helm"),
    armor: jxWebItemRow(eq.armor, "armor"),
    weapon: jxWebItemRow(eq.weapon, "weapon"),
    horse: jxWebItemRow(eq.horse, "horse")
  };
}

function jxWebAction(look, act, sex, rows, riding) {
  const data = JX_WEB_LOOK;
  const actionKey = ({ st: "st", run: "run", at: "at", mag: "mg", hurt: "hurt", die: "die" })[act] || "st";
  if (look.asc && look.asc[actionKey]) return look.asc[actionKey];
  const weaponName = (data.wnames && data.wnames[sex] && data.wnames[sex][rows.weapon]) || "空手";
  const associations = data.assoc && data.assoc[sex];
  const byWeapon = associations && (associations[weaponName] || associations["空手"]);
  const byRide = byWeapon && (byWeapon[riding ? "1" : "0"] || byWeapon[0] || byWeapon["0"]);
  return byRide && byRide[actionKey] || null;
}

function jxWebPartRows(look, rows, sex, action, riding) {
  const data = JX_WEB_LOOK;
  const sexTabs = data.tabs && data.tabs[sex];
  if (!sexTabs) return {};
  const result = {};
  const add = (part, group) => {
    if (group === "horse" && !riding) return;
    const row = rows[group];
    const tab = sexTabs[JX_WEB_PARTS[part]];
    const actions = tab && tab[String(row)];
    const key = actions && actions[action];
    if (key) result[part] = key;
  };
  add(0, "helm"); add(1, "helm");
  add(4, "armor"); add(5, "armor"); add(6, "armor"); add(7, "armor");
  add(8, "weapon"); add(9, "weapon");
  add(12, "horse"); add(13, "horse"); add(14, "horse");
  return result;
}

function jxWebSprite(key, sex) {
  const data = JX_WEB_LOOK;
  const resourceKey = key.includes("/") ? key : key.startsWith("m:")
    ? `m/${key.slice(2)}`
    : `${sex}/${key}`;
  const meta = data && data.sheets && data.sheets[resourceKey];
  if (!Array.isArray(meta) || meta.length < 6) return null;
  const path = `img/jx/${resourceKey}`;
  let img = JX_WEB_IMAGES.get(path);
  if (!img) {
    img = new Image();
    img.src = path + ".webp";
    JX_WEB_IMAGES.set(path, img);
  }
  return img.complete && img.naturalWidth ? { img, meta } : null;
}

function jxWebDollDraw(act, dir, actTime, x, y, scale, alpha, look) {
  if (!JX_WEB_LOOK) { jxLoadWebLook(); return 0; }
  const sex = look.sx || (look.sex === "f" || look.sex === 1 || look.sex === true ? "f" : "m");
  const riding = !!(look.riding || look.ride === 1);
  const rows = jxWebRows(look);
  const action = jxWebAction(look, act, sex, rows, riding);
  if (!action) return 0;
  const parts = jxWebPartRows(look, rows, sex, action, riding);
  const bodyPart = riding && parts[13] ? 13 : 5;
  if (!parts[bodyPart]) return 0;
  const actionSort = dataSortForWeb(JX_WEB_LOOK, sex, action);
  const sprites = new Map();
  for (const [part, key] of Object.entries(parts)) {
    const sprite = jxWebSprite(key, sex);
    if (sprite) sprites.set(+part, sprite);
  }
  if (!sprites.has(bodyPart)) return 0;

  const bodyMeta = sprites.get(bodyPart).meta;
  const frameCount = Math.max(1, Number(bodyMeta[4]) || 1);
  const durationTicks = JX_DOLL && JX_DOLL.dur && JX_DOLL.dur[sex]
    ? Number(JX_DOLL.dur[sex][act === "mag" ? "mag" : act]) || 18
    : 18;
  const duration = durationTicks / ((JX_DOLL && JX_DOLL.dur && JX_DOLL.dur.fps) || 18);
  const frameProgress = ["at", "mag", "hurt", "die"].includes(act)
    ? Math.min(Math.max(actTime, 0) / duration, .9999)
    : ((Math.max(actTime, 0) / duration) % 1 + 1) % 1;
  const frame = Math.min(frameCount - 1, Math.floor(frameProgress * frameCount));
  const directionCount = Math.max(1, Number(bodyMeta[5]) || 8);
  const frameDir = Math.floor((((dir | 0) % 8 + 8) % 8) * directionCount / 8 + .5) % directionCount;
  const frameKey = frameDir * frameCount + frame * (Number(bodyMeta[6]) || 1);
  const frameOrder = actionSort && Object.values(actionSort).find(order =>
    Array.isArray(order) && order[0] === frameKey
  );
  const fallbackSort = JX_WEB_LOOK.sort && JX_WEB_LOOK.sort[sex] && JX_WEB_LOOK.sort[sex].DEFAULT;
  const order = frameOrder || actionSort && actionSort[`Dir${frameDir + 1}`] ||
    fallbackSort && (fallbackSort[`Dir${frameDir + 1}`] || fallbackSort.Dir1);
  const drawOrder = Array.isArray(order) ? order.slice(1) : [0, 1, 4, 5, 6, 7, 12, 13, 14, 8, 9];
  const foot = JX_WEB_LOOK.foot || [160, 202];
  let minTop = Infinity, drawn = 0;
  CX.save();
  CX.globalAlpha = alpha;
  for (const part of drawOrder) {
    const sprite = sprites.get(part);
    if (!sprite) continue;
    const [frameW, frameH, offsetX, offsetY, , directions] = sprite.meta;
    const n = Math.max(1, Number(sprite.meta[4]) || frameCount);
    const d = Math.max(1, Number(directions) || 8);
    const partFrame = Math.min(n - 1, Math.floor(frame * n / frameCount));
    const partDir = Math.floor((((dir | 0) % 8 + 8) % 8) * d / 8 + .5) % d;
    const sx = partFrame * frameW;
    const sy = partDir * frameH;
    if (sx + frameW > sprite.img.naturalWidth || sy + frameH > sprite.img.naturalHeight) continue;
    const drawScale = scale * .6 / (Number(JX_WEB_LOOK.sc) || 1);
    const dx = x + (offsetX - foot[0]) * drawScale;
    const dy = y + (offsetY - foot[1]) * drawScale;
    gfxDrawFrame(CX, sprite.img, sx, sy, frameW, frameH, dx, dy, frameW * drawScale, frameH * drawScale);
    minTop = Math.min(minTop, dy);
    drawn++;
  }
  CX.restore();
  return drawn ? Math.max(50, y - minTop) : 0;
}

function dataSortForWeb(data, sex, action) {
  return data.sort && data.sort[sex] && data.sort[sex][action];
}

// The rebuilt doll sprites use per-part action sheets described by
// img/look/doll-manifest.json. Load this alongside the legacy atlas renderer
// so older or unavailable doll frames can still fall back cleanly.
let JX_DOLL = null;
let JX_DOLL_LOADING = false;
const JX_DOLL_IMAGES = new Map();
const JX_DOLL_ACTIONS = new Map();
const jxDollSexName = look => look && (look.sex === "f" || look.sex === 1 || look.sex === true) ? "lady" : "man";
function jxLoadDollData() {
  if (JX_DOLL || JX_DOLL_LOADING) return;
  JX_DOLL_LOADING = true;
  fetch("img/look/doll-manifest.json")
    .then(r => r.ok ? r.json() : null)
    .then(data => { if (data && data.sheets && data.man && data.lady) JX_DOLL = data; })
    .catch(() => {})
    .finally(() => { JX_DOLL_LOADING = false; });
}

function jxDollItemId(group, item) {
  const data = JX_DOLL;
  if (!data || !item) return null;
  const table = data.res && data.res[group];
  if (!table) return null;
  if ((group === "armor" && item.d !== 2) || (group === "helm" && item.d !== 7)) return null;
  const gold = data.gold && data.gold[item.n];
  if (gold && gold.length >= 2 && gold[0] === item.d) return gold[1];
  if (group === "weapon" && item.d !== 0 && item.d !== 1) return null;
  const key = `${item.d}:${item.k}:${item.lvl}`;
  return table[key] == null ? null : table[key];
}

function jxDollLook(sexCode, eq) {
  return { doll: true, sex: sexCode ? 1 : 0, eq: eq || {} };
}

function jxDollActionCandidates(action) {
  const prefix = ["MeleeW", "RangeW", "DoubleW", "Free"].find(p => action.startsWith(p)) || "";
  const tail = action.slice(prefix.length);
  return [action, ...(/Magic/.test(tail) ? [prefix + "Stand", prefix + "Attack", prefix + "Run"] :
    /Die/.test(tail) ? [prefix + "Wound", prefix + "Stand", prefix + "Run"] :
    /Wound/.test(tail) ? [prefix + "Stand", prefix + "Run"] :
    /Run|Walk/.test(tail) ? [prefix + "Stand", prefix + "Cut", prefix + "Attack", prefix + "Puncture"] :
    [prefix + "Stand", prefix + "Run", prefix + "Cut", prefix + "Attack", prefix + "Puncture"] )];
}

function jxDollHasAction(sexName, part, id, action) {
  const model = JX_DOLL && JX_DOLL[sexName] && JX_DOLL[sexName].parts && JX_DOLL[sexName].parts[part];
  const actions = model && (model[id] === undefined ? model[String(id)] : model[id]);
  return !!(actions && jxDollActionCandidates(action).some(name => actions[name]));
}

function jxDollParts(look) {
  const data = JX_DOLL;
  const eq = look && look.eq || {};
  const parts = {}, items = {};
  const add = (part, group, item) => {
    if (!item) return;
    const id = jxDollItemId(group, item);
    if (id == null || !jxDollHasAction(jxDollSexName(look), part, id, jxDollAction(look, "st"))) return;
    parts[part] = id;
    items[part] = item;
  };
  add(0, "helm", eq.helm); add(1, "helm", eq.helm);
  add(5, "armor", eq.armor); add(6, "armor", eq.armor); add(7, "armor", eq.armor);
  add(8, "weapon", eq.weapon); add(9, "weapon", eq.weapon);
  const res = data && data.res || {};
  const fallback = (part, group) => {
    if (parts[part] !== undefined || ([1, 8, 9].includes(part) && jxDollItemId(group, eq[group]) != null)) return;
    const id = res[group] && res[group].def;
    if (id != null && jxDollHasAction(jxDollSexName(look), part, id, jxDollAction(look, "st"))) parts[part] = id;
  };
  fallback(0, "helm"); fallback(1, "helm");
  fallback(5, "armor"); fallback(6, "armor"); fallback(7, "armor");
  fallback(8, "weapon"); fallback(9, "weapon");
  return { parts, items };
}

const JX_DOLL_PART_ORDER = [0, 1, 5, 6, 7, 8, 9];
function jxDollAction(look, act) {
  const weapon = look.eq && look.eq.weapon;
  const data = JX_DOLL[jxDollSexName(look)];
  let weaponId = weapon ? jxDollItemId("weapon", weapon) : null;
  if (data && data.nohorse) {
    if (weaponId != null && data.nohorse[weaponId]) {
      // Keep the configured weapon animation family.
    } else if (weaponId == null) {
      const fallback = JX_DOLL.res && JX_DOLL.res.weapon && JX_DOLL.res.weapon.def;
      if (fallback != null && data.nohorse[fallback]) weaponId = fallback;
      else if (data.nohorse[0]) weaponId = 0;
      else weaponId = Number(Object.keys(data.nohorse)[0] || 0);
    }
  }
  const weaponKind = data && data.nohorse && (data.nohorse[weaponId] || data.nohorse[String(weaponId)]);
  const fallback = act === "st" ? "FreeStand3" : `Free${act.charAt(0).toUpperCase()}${act.slice(1)}`;
  return weaponKind && weaponKind[act] || fallback;
}

function jxDollResolveAction(data, action) {
  const cached = JX_DOLL_ACTIONS.get(action);
  if (cached !== undefined) return cached;
  const fallbacks = jxDollActionCandidates(action);
  JX_DOLL_ACTIONS.set(action, fallbacks);
  return fallbacks;
}

function jxDollSheet(look, part, id, action) {
  const sexName = jxDollSexName(look);
  const data = JX_DOLL && JX_DOLL[sexName];
  const partMap = data && data.parts && data.parts[part];
  const model = partMap && (partMap[id] === undefined ? partMap[String(id)] : partMap[id]);
  if (!model) return null;
  const candidates = jxDollResolveAction(data, action);
  let sheetId = null;
  for (const candidate of candidates) {
    if (model[candidate]) { sheetId = model[candidate]; break; }
  }
  if (!sheetId) return null;
  const meta = JX_DOLL.sheets && JX_DOLL.sheets[sheetId];
  if (!meta || !meta.f) return null;
  const path = "img/look/" + meta.f;
  let img = JX_DOLL_IMAGES.get(path);
  if (!img) { img = new Image(); img.src = path; JX_DOLL_IMAGES.set(path, img); }
  return img.complete && img.naturalWidth ? { img, meta } : null;
}

function jxDollDirection(dir, count) {
  if (count <= 1) return 0;
  const d = ((dir | 0) % 8 + 8) % 8;
  const mapped = Math.floor((d * 8 + Math.floor(32 / count)) / Math.floor(64 / count));
  return mapped >= count ? mapped - count : mapped;
}

function jxDollFrame(meta, look, act, actTime) {
  const n = Math.max(1, meta.n | 0);
  const duration = ((JX_DOLL.dur && JX_DOLL.dur[jxDollSexName(look)] && JX_DOLL.dur[jxDollSexName(look)][act]) || 0) /
    ((JX_DOLL.dur && JX_DOLL.dur.fps) || 18);
  if (duration > 0) {
    const time = ["at", "mag", "hurt", "die"].includes(act)
      ? Math.min(Math.max(actTime, 0) / duration, .9999)
      : ((Math.max(actTime, 0) / duration) % 1 + 1) % 1;
    return Math.min(n - 1, Math.floor(time * n));
  }
  return Math.floor(actTime * 1000 / Math.max(1, meta.ms || 100)) % n;
}

function jxDollOrder(sex, look, action, parts) {
  const actionSort = sex.sort && (sex.sort[action] || sex.sort.DEFAULT);
  const defaultSort = sex.sort && sex.sort.DEFAULT;
  let direction = 0;
  let frameKey = -1;
  for (const part of JX_DOLL_PART_ORDER) {
    if (parts[part] === undefined) continue;
    const sheet = jxDollSheet(look, part, parts[part], action);
    if (!sheet) continue;
    const count = sheet.meta.d > 0 ? sheet.meta.d : 8;
    const per = Math.max(1, sheet.meta.per || 1);
    direction = jxDollDirection(look._dir || 0, count);
    frameKey = direction * per + Math.min(per - 1, jxDollFrame(sheet.meta, look, look._act || "st", look._time || 0) * Math.max(1, sheet.meta.step || 1));
    break;
  }
  const byFrame = actionSort && actionSort.lines && actionSort.lines[String(frameKey)];
  if (Array.isArray(byFrame)) return byFrame;
  const byDirection = actionSort && actionSort.dirs && actionSort.dirs[String(direction)];
  if (Array.isArray(byDirection)) return byDirection;
  const fallback = defaultSort && defaultSort.dirs && defaultSort.dirs[String(direction)];
  return Array.isArray(fallback) ? fallback : JX_DOLL_PART_ORDER;
}

function jxDollDraw(act, dir, actTime, x, y, scale, alpha, look) {
  if (!JX_DOLL) { jxLoadDollData(); return 0; }
  const sexName = jxDollSexName(look);
  const sex = JX_DOLL[sexName];
  if (!sex || !sex.parts) return 0;
  const { parts } = jxDollParts(look);
  const action = jxDollAction(look, act);
  const order = jxDollOrder(sex, Object.assign({}, look, { _dir: dir, _act: act, _time: actTime }), action, parts);
  let minTop = Infinity, drawn = 0;
  CX.save();
  CX.globalAlpha = alpha;
  for (const part of order) {
    const id = parts[part];
    if (id == null) continue;
    const sprite = jxDollSheet(look, +part, id, action);
    if (!sprite) continue;
    const { img, meta } = sprite;
    const n = Math.max(1, meta.n | 0), d = meta.d > 0 ? meta.d : 8;
    const frame = jxDollFrame(meta, look, act, actTime);
    const frameDir = jxDollDirection(dir, d);
    const sx = frame * meta.w, sy = frameDir * meta.h;
    if (sx + meta.w > img.naturalWidth || sy + meta.h > img.naturalHeight) continue;
    const drawScale = scale * .6 / (JX_DOLL.src || .6);
    const dx = x - (meta.ax || 0) * drawScale, dy = y - (meta.ay || 0) * drawScale;
    gfxDrawFrame(CX, img, sx, sy, meta.w, meta.h, dx, dy, meta.w * drawScale, meta.h * drawScale);
    minTop = Math.min(minTop, dy); drawn++;
  }
  CX.restore();
  return drawn ? Math.max(50, y - minTop) : 0;
}

function jxLoadSprite(sex, partName, rowId) {
  const path = "img/look/" + sex + "/" + partName + "_" + rowId;
  let cached = JX_SPRITE_CACHE.get(path);
  if (!cached) {
    cached = {
      img: new Image(),
      meta: null,
      tries: 0,
      retryAt: 0,
      base: path
    };
    cached.img.src = path + ".webp";
    JX_SPRITE_CACHE.set(path, cached);
  }
  const now = performance.now();
  if (!cached.meta && !cached.loading && now >= cached.retryAt && cached.tries < 5) {
    cached.loading = true;
    cached.tries++;
    fetch(path + ".json")
      .then(r => r.ok ? r.json() : null)
      .then(data => { cached.meta = data; })
      .catch(() => {})
      .finally(() => {
        cached.loading = false;
        cached.retryAt = performance.now() + 2000;
      });
  }
  return (cached.meta && cached.img.complete && cached.img.naturalWidth) ? cached : null;
}

const JX_SET_MAP = new Map();
function jxMapSet(list, keyFn) {
  let m = JX_SET_MAP.get(list);
  if (!m) {
    m = new Map(list.map((it, idx) => [keyFn(it), idx]));
    JX_SET_MAP.set(list, m);
  }
  return m;
}

function jxGetItemRow(item, groupName) {
  const JXL = window.JXLOOK;
  if (!JXL || !item) return 0;
  if (item.set && J.sets && J.sets[item.set.kind]) {
    const list = J.sets[item.set.kind];
    const map = jxMapSet(list, it => it.d + "|" + it.n);
    const idx = map.get(item.d + "|" + item.n);
    const row = idx != null ? (JXL.sets[item.set.kind] || [])[idx] : 0;
    if (row) return row;
  }
  const resKey = groupName === "weapon" ? (item.d === 1 ? "range" : "melee") : groupName;
  let p = item.p;
  if (p == null) {
    const itDef = J.items && J.items.find(x => x.detail === item.d);
    const itList = itDef ? itDef.list : null;
    const map = itList ? jxMapSet(itList, x => x.n) : null;
    const idx = map ? map.get(item.n) : null;
    p = idx != null ? itList[idx].p : -1;
  }
  return (JXL.res[resKey] || [])[p] || 0;
}

const JX_HORSE_FALLBACK = { 15: 14, 17: 16 };
let jxLookCacheKey = "";
let jxCurrentLook = null;

function jxHeroSetup() {
  const JXL = window.JXLOOK;
  if (!JXL || !S || !S.fac) return null;
  const isRiding = !!(R.mounted && S.eq && S.eq.horse && reqOk(S.eq.horse));
  const itemKey = it => it ? (it.uid || it.n || it.d || 0) : 0;
  const key = [
    typeof SLOT !== "undefined" ? SLOT : 0,
    S.sex || 0,
    isRiding,
    itemKey(S.eq && S.eq.weapon),
    itemKey(S.eq && S.eq.armor),
    itemKey(S.eq && S.eq.helm),
    itemKey(S.eq && S.eq.horse)
  ].join("|");

  // Cache disabled to avoid stale look when switching characters/gender.
  jxLookCacheKey = key;

  const sex = S.sex ? "f" : "m";
  const sexLook = JXL[sex] || JXL.m;
  const rows = {
    helm: jxGetItemRow(S.eq.helm, "helm") || JXL.none.helm || 1,
    armor: jxGetItemRow(S.eq.armor, "armor") || JXL.none.armor || 1,
    weapon: jxGetItemRow(S.eq.weapon, "weapon") || 1,
    horse: isRiding ? (jxGetItemRow(S.eq.horse, "horse") || 1) : 0
  };

  if (rows.horse && !(JXL.m.have.horsem || []).includes(rows.horse) && JX_HORSE_FALLBACK[rows.horse]) {
    rows.horse = JX_HORSE_FALLBACK[rows.horse];
  }

  if (
    !(sexLook.have.rweapon || []).includes(rows.weapon) &&
    !(sexLook.have.lweapon || []).includes(rows.weapon)
  ) {
    rows.weapon = 1;
  }

  const wKind = sexLook.wkind[rows.weapon - 1] || "free";
  const parts = {};
  for (const [grp, partList] of Object.entries(JXL.groups)) {
    for (const part of partList) {
      const val = rows[grp];
      if (val && ((grp === "horse" ? JXL.m : sexLook).have[part] || []).includes(val)) {
        parts[part] = val;
      }
    }
  }

  const acts = isRiding && parts.horsem ? JXL.ride : JXL.kinds[wKind];
  jxCurrentLook = {
    sex: sex,
    parts: parts,
    acts: acts,
    riding: isRiding && !!parts.horsem,
    doll: true,
    eq: S.eq || {}
  };
  return jxCurrentLook;
}

function jxBuildLook(sexCode, eq, isRiding) {
  const JXL = window.JXLOOK;
  if (!JXL) return null;
  const sex = sexCode ? "f" : "m";
  const sexLook = JXL[sex] || JXL.m;
  eq = eq || {};
  const rows = {
    helm: jxGetItemRow(eq.helm, "helm") || JXL.none.helm || 1,
    armor: jxGetItemRow(eq.armor, "armor") || JXL.none.armor || 1,
    weapon: jxGetItemRow(eq.weapon, "weapon") || 1,
    horse: isRiding ? (jxGetItemRow(eq.horse, "horse") || 1) : 0
  };

  if (rows.horse && !(JXL.m.have.horsem || []).includes(rows.horse) && JX_HORSE_FALLBACK[rows.horse]) {
    rows.horse = JX_HORSE_FALLBACK[rows.horse];
  }

  if (
    !(sexLook.have.rweapon || []).includes(rows.weapon) &&
    !(sexLook.have.lweapon || []).includes(rows.weapon)
  ) {
    rows.weapon = 1;
  }

  const wKind = sexLook.wkind[rows.weapon - 1] || "free";
  const parts = {};
  for (const [grp, partList] of Object.entries(JXL.groups)) {
    for (const part of partList) {
      const val = rows[grp];
      if (val && ((grp === "horse" ? JXL.m : sexLook).have[part] || []).includes(val)) {
        parts[part] = val;
      }
    }
  }

  const acts = isRiding && parts.horsem ? JXL.ride : JXL.kinds[wKind];
  return {
    sex: sex,
    parts: parts,
    acts: acts,
    riding: isRiding && !!parts.horsem,
    doll: true,
    eq: eq
  };
}

function drawJxHero(act, dir, actTime, x, y, scale = 1, alpha = 1, customLook = null) {
  const look = customLook || jxHeroSetup();
  if (!look) return false;

  if (look.doll) {
    const webHeight = jxWebDollDraw(act, dir, actTime, x, y, scale, alpha, look);
    if (webHeight) return webHeight;
  }

  if (look.doll && !look.riding) {
    const dollHeight = jxDollDraw(act, dir, actTime, x, y, scale, alpha, look);
    if (dollHeight) return dollHeight;
  }

  const JXL = window.JXLOOK;
  const sexLook = JXL[look.sex] || JXL.m;
  const loadedSprites = {};
  for (const pName in look.parts) {
    const s = pName.startsWith("horse") ? "m" : look.sex;
    loadedSprites[pName] = jxLoadSprite(s, pName, look.parts[pName]);
  }

  if (!loadedSprites.body && !loadedSprites.horsem) return false;

  const actIdx = act === "run" ? 1 : act === "at" ? 2 : 0;
  const targetAct = look.acts[actIdx] || look.acts[0];
  const refSprite = loadedSprites.horsem || loadedSprites.body;
  if (!refSprite || !refSprite.meta) return false;

  const actData = refSprite.meta.a[targetAct] || refSprite.meta.a[look.acts[0]];
  if (!actData) return false;

  const frameInterval = jxActionFrameInterval(actData, act);
  let frameIdx = Math.floor(actTime / frameInterval);
  if (act === "at" || act === "die") {
    frameIdx = Math.min(frameIdx, actData.n - 1);
  } else {
    frameIdx = frameIdx % actData.n;
  }

  const dirCount = actData.d >= 8 ? dir : Math.floor((dir * actData.d) / 8);
  const dirKey = String(2 * dirCount + 1);
  const order = (sexLook.order[targetAct] && sexLook.order[targetAct][dirKey]) ||
                sexLook.order.DEFAULT[dirKey] || [5];

  let minBottom = 0;
  CX.globalAlpha = alpha;

  const drawScale = scale * 0.95;

  for (const partCode of order) {
    const partName = JX_PART_NAME[partCode];
    const sprite = partName && loadedSprites[partName];
    if (!sprite || !sprite.meta) continue;

    const pAct = sprite.meta.a[targetAct] || sprite.meta.a[look.acts[0]];
    if (!pAct) continue;

    const frameList = pAct.f;
    const partInterval = jxActionFrameInterval(pAct, act);
    let partFrame = Math.floor(actTime / partInterval);
    if (act === "at" || act === "die") partFrame = Math.min(partFrame, pAct.n - 1);
    else partFrame %= pAct.n;
    const partDir = pAct.d >= 8 ? dir : Math.floor((dir * pAct.d) / 8);
    const fIdx = partDir * pAct.n + partFrame;
    const f = frameList[fIdx];
    if (f) {
      const isWeapon = partName === "rweapon" || partName === "lweapon";
      const glow = isWeapon && (look.glow || (R.look && R.look.glow));

      if (glow && glow.enh >= 5) {
        CX.save();
        const pulse = 0.5 + 0.5 * Math.sin((R.clock || 0) * 4);
        const enh = glow.enh;
        // Cấp phát sáng: +5..+6 nhẹ, +7..+8 vừa, +9..+10 rực rỡ
        const blurRadius = enh >= 10 ? (12 + pulse * 6) : enh >= 8 ? (8 + pulse * 4) : enh >= 7 ? 6 : 4;
        CX.shadowColor = glow.c;
        CX.shadowBlur = blurRadius;

        // Vẽ lớp phát sáng viền hào quang ngũ hành
        gfxDrawFrame(
          CX, sprite.img,
          f[0], f[1], f[2], f[3],
          x + f[4] * drawScale,
          y + f[5] * drawScale,
          f[2] * drawScale,
          f[3] * drawScale
        );

        // Với +9 và +10, thêm lớp ánh sáng lõi bloom rực rỡ
        if (enh >= 9) {
          CX.shadowColor = glow.core || "#ffffff";
          CX.shadowBlur = 6 + pulse * 4;
          CX.globalAlpha = alpha * (enh >= 10 ? 0.8 : 0.5);
          gfxDrawFrame(
            CX, sprite.img,
            f[0], f[1], f[2], f[3],
            x + f[4] * drawScale,
            y + f[5] * drawScale,
            f[2] * drawScale,
            f[3] * drawScale
          );
        }
        CX.restore();
      }

      gfxDrawFrame(
        CX, sprite.img,
        f[0], f[1], f[2], f[3],
        x + f[4] * drawScale,
        y + f[5] * drawScale,
        f[2] * drawScale,
        f[3] * drawScale
      );
      if (partName === "body" || partName === "head" || partName === "horsem") {
        minBottom = Math.min(minBottom, f[5] * drawScale);
      }
    }
  }

  CX.globalAlpha = 1;
  return -minBottom || 50;
}
