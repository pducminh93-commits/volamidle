/**
 * Võ Lâm Idle (JX2) - Hệ Thống Tài Khoản, Lưu Đám Mây & Bảng Xếp Hạng Bản Quyền
 * Tự phát triển 100%, độc lập hoàn toàn, không phụ thuộc máy chủ bên thứ ba.
 */

const NET_TOKEN_KEY = "jx2_auth_token";
const NET_USER_KEY = "jx2_auth_user";
const NET_ACCOUNTS_KEY = "jx2_local_accounts";
const NET_SAVES_KEY = "jx2_local_cloud_saves";
function netLocalOfflineMode() {
  return ["localhost", "127.0.0.1", "::1"].includes(location.hostname);
}
const netDeletedKey = () => "jx2_deleted_slots_" + (NET.user && NET.user.id || "local");
function netDeletedSlots() { try { return JSON.parse(localStorage.getItem(netDeletedKey()) || "[]").map(Number); } catch (e) { return []; } }
function netSlotDeleted(slot) { return netDeletedSlots().includes(+slot); }
function netMarkSlotDeleted(slot, deleted = true) {
  try { const slots = new Set(netDeletedSlots()); deleted ? slots.add(+slot) : slots.delete(+slot); localStorage.setItem(netDeletedKey(), JSON.stringify([...slots])); } catch (e) {}
}
async function netDeleteSlot(slot) {
  netMarkSlotDeleted(slot);
  if (NET.user) {
    try {
      const key = NET_SAVES_KEY + "_" + NET.user.id;
      const saves = JSON.parse(localStorage.getItem(key) || "[]");
      localStorage.setItem(key, JSON.stringify(saves.filter(s => +s.slot !== +slot)));
    } catch (e) {}
    try { await apiCall("/save/delete?slot=" + encodeURIComponent(slot), "DELETE"); }
    catch (e) { console.warn("Máy chủ chưa hỗ trợ xóa bản sao cloud; đã đánh dấu slot đã xóa trên thiết bị.", e); }
  }
}

const NET_RANKS_KEY = "jx2_local_ranks";

const NET = {
  user: null,
  token: null,
  tab: "acc",
  rank: "lvl",
  rfac: "",
  loggingOut: false,
  lastUp: 0,
  lastChar: 0
};

const RANKS = [
  ["lvl", "Cấp & Trùng sinh"],
  ["power", "Lực chiến"],
  ["tower", "Vượt tháp"],
  ["bosses", "Trùm đã diệt"]
];

const RANK_CS_MAX = 5;

// Mẫu bảng xếp hạng cao thủ mặc định
const DEFAULT_RANKS = [
  { name: "Pipika", fac: "tangmen", lvl: 174, reborn: 3, power: 61039, tower: 120, bosses: 201 },
  { name: "Raven", fac: "tangmen", lvl: 162, reborn: 2, power: 48584, tower: 105, bosses: 140 },
  { name: "Độc Cô Cầu Bại", fac: "wudang", lvl: 155, reborn: 2, power: 42100, tower: 98, bosses: 110 },
  { name: "Vô Danh", fac: "shaolin", lvl: 150, reborn: 2, power: 39500, tower: 90, bosses: 95 },
  { name: "Lệnh Hồ Xung", fac: "kunlun", lvl: 148, reborn: 1, power: 36000, tower: 85, bosses: 80 },
  { name: "Tiêu Phong", fac: "gaibang", lvl: 145, reborn: 1, power: 34500, tower: 80, bosses: 75 },
  { name: "Dương Quá", fac: "tianwang", lvl: 142, reborn: 1, power: 33000, tower: 78, bosses: 70 },
  { name: "Tiểu Long Nữ", fac: "cuiyan", lvl: 140, reborn: 1, power: 31500, tower: 75, bosses: 65 },
  { name: "Chu Chỉ Nhược", fac: "emei", lvl: 138, reborn: 1, power: 30000, tower: 70, bosses: 60 },
  { name: "Đông Phương Bất Bại", fac: "tianren", lvl: 135, reborn: 1, power: 28500, tower: 68, bosses: 55 },
  { name: "Nhậm Ngã Hành", fac: "wudu", lvl: 130, reborn: 1, power: 27000, tower: 65, bosses: 50 },
  { name: "Trương Vô Kỵ", fac: "wudang", lvl: 125, reborn: 0, power: 25000, tower: 60, bosses: 45 },
  { name: "Hư Trúc", fac: "shaolin", lvl: 120, reborn: 0, power: 23500, tower: 55, bosses: 40 },
  { name: "Đoàn Dự", fac: "kunlun", lvl: 115, reborn: 0, power: 21000, tower: 50, bosses: 35 },
  { name: "Hoàng Dược Sư", fac: "tangmen", lvl: 110, reborn: 0, power: 19500, tower: 45, bosses: 30 }
];

const netOn = () => true;

const netUname = () => (NET.user && (NET.user.username || NET.user.name)) || "";

// ====================================================================
// ⚡ KẾT NỐI MÁY CHỦ SUPABASE RIÊNG (REST API / POSTGREST)
// ====================================================================

function getSupabaseConfig() {
  return { url: '', key: '', enabled: false };
}

async function sbCall(path, options = {}) {
  return null;
}

// Gọi API máy chủ kèm timeout nhanh
async function apiCall(endpoint, method = "GET", data = null) {
  if (netLocalOfflineMode()) {
    throw new Error("API máy chủ không được bật ở chế độ local offline");
  }

  const headers = { "Content-Type": "application/json" };
  if (NET.token) headers["Authorization"] = "Bearer " + NET.token;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);

  try {
    const res = await fetch("/api" + endpoint, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      signal: controller.signal
    });
    clearTimeout(timer);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.msg || json.error || "Lỗi máy chủ (" + res.status + ")");
    return json;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// ====================================================================
// 🔑 HỆ THỐNG XÁC THỰC TÀI KHOẢN (ĐĂNG KÝ / ĐĂNG NHẬP / ĐĂNG XUẤT)
// ====================================================================

async function netAuth(action, username, password) {
  username = String(username || "").trim().toLowerCase();
  if (!/^[a-z0-9_]{3,16}$/.test(username)) {
    throw new Error("Tên đăng nhập 3–16 ký tự: chữ không dấu, số, _");
  }
  if (String(password || "").length < 6) {
    throw new Error("Mật khẩu ít nhất 6 ký tự");
  }

  let authSuccess = false;

  // 1. Ưu tiên máy chủ Supabase riêng nếu đã cấu hình
  const sbCfg = getSupabaseConfig();
  if (sbCfg.enabled) {
    try {
      if (action === "up") {
        const existing = await sbCall("/users?username=eq." + encodeURIComponent(username) + "&select=id");
        if (existing && existing.length > 0) {
          throw new Error("Tên tài khoản này đã được đăng ký trên Supabase!");
        }
        const uid = "usr_" + username;
        await sbCall("/users", {
          method: "POST",
          headers: { "Prefer": "return=representation" },
          body: {
            id: uid,
            username,
            password,
            created_at: new Date().toISOString(),
            last_active: new Date().toISOString()
          }
        });
        NET.user = { id: uid, username };
        NET.token = "sb_tok_" + uid;
        authSuccess = true;
      } else {
        const users = await sbCall("/users?username=eq." + encodeURIComponent(username) + "&select=*");
        if (!users || users.length === 0) {
          throw new Error("Tài khoản chưa được đăng ký trên Supabase!");
        }
        if (users[0].password !== password) {
          throw new Error("Mật khẩu không chính xác!");
        }
        const uid = users[0].id || ("usr_" + username);
        sbCall("/users?id=eq." + encodeURIComponent(uid), {
          method: "PATCH",
          body: { last_active: new Date().toISOString() }
        }).catch(() => {});
        NET.user = { id: uid, username: users[0].username };
        NET.token = "sb_tok_" + uid;
        authSuccess = true;
      }
    } catch (err) {
      if (err.message && (err.message.includes("đã được đăng ký") || err.message.includes("không chính xác") || err.message.includes("chưa được đăng ký"))) {
        throw err;
      }
      console.warn("Supabase Auth lỗi kết nối, chuyển sang Native API:", err);
    }
  }

  // 2. Thử gọi API máy chủ Native
  if (!authSuccess) {
    try {
      const ep = action === "up" ? "/auth/register" : "/auth/login";
      const res = await apiCall(ep, "POST", { username, password });
      if (res && res.user) {
        NET.user = res.user;
        NET.token = res.token || ("tok_" + Date.now());
        authSuccess = true;
      }
    } catch (err) {
      if (err.message && err.message.includes("đã tồn tại")) throw err;
      if (err.message && err.message.includes("không chính xác")) throw err;
    }
  }

  // 2. Chế độ dự phòng cục bộ (khi server offline hoặc chạy không backend)
  if (!authSuccess) {
    let localAccounts = {};
    try { localAccounts = JSON.parse(localStorage.getItem(NET_ACCOUNTS_KEY) || "{}"); } catch (e) {}

    if (action === "up") {
      if (localAccounts[username]) {
        throw new Error("Tên tài khoản này đã được đăng ký!");
      }
      localAccounts[username] = {
        id: "usr_" + username,
        username,
        password,
        created: new Date().toISOString()
      };
      try { localStorage.setItem(NET_ACCOUNTS_KEY, JSON.stringify(localAccounts)); } catch (e) {}
      NET.user = { id: "usr_" + username, username };
      NET.token = "local_tok_" + username;
    } else {
      const acc = localAccounts[username];
      if (acc) {
        if (acc.password !== password) throw new Error("Mật khẩu không chính xác!");
        NET.user = { id: acc.id || ("usr_" + username), username };
        NET.token = "local_tok_" + username;
      } else {
        // Tự động tạo tài khoản nếu đăng nhập lần đầu
        localAccounts[username] = {
          id: "usr_" + username,
          username,
          password,
          created: new Date().toISOString()
        };
        try { localStorage.setItem(NET_ACCOUNTS_KEY, JSON.stringify(localAccounts)); } catch (e) {}
        NET.user = { id: "usr_" + username, username };
        NET.token = "local_tok_" + username;
      }
    }
  }

  // Lưu phiên đăng nhập
  try {
    localStorage.setItem(NET_USER_KEY, JSON.stringify(NET.user));
    localStorage.setItem(NET_TOKEN_KEY, NET.token);
  } catch (e) {}
}

async function netEnsureUser() {
  if (NET.user) return true;
  try {
    const savedUser = localStorage.getItem(NET_USER_KEY);
    const savedToken = localStorage.getItem(NET_TOKEN_KEY);
    if (savedUser && savedToken) {
      NET.user = JSON.parse(savedUser);
      NET.token = savedToken;
      return true;
    }
  } catch (e) {}
  return false;
}

function netLogout() {
  NET.loggingOut = true;
  try {
    localStorage.removeItem(NET_USER_KEY);
    localStorage.removeItem(NET_TOKEN_KEY);
    sessionStorage.removeItem("jxidle_in");
    localStorage.setItem(typeof SLOT_PTR !== "undefined" ? SLOT_PTR : "jxidle_slot", "menu");
  } catch (e) {}
  NET.user = null;
  NET.token = null;
  if (typeof S !== "undefined") {
    if (typeof newSave === "function") S = newSave();
    else S = null;
  }
  if (typeof R !== "undefined" && R) {
    R.enemies = [];
    R.bgImg = null;
  }
  if (typeof closeModal === "function") closeModal(true);
  NET.loggingOut = false;
  location.reload();
}

function slotState(i) {
  try {
    const k = typeof slotKey === "function" ? slotKey(i) : (i === 0 ? "jxidle" : "jxidle_" + (i + 1));
    const raw = localStorage.getItem(k) || localStorage.getItem(k + "_bak");
    if (!raw) return null;
    const u = typeof unpack === "function" ? unpack(raw) : null;
    return u && u.state ? u.state : null;
  } catch (e) {
    return null;
  }
}

const cloudPack = (statePack, stashRaw) => JSON.stringify({ v: 2, d: statePack, k: stashRaw || null });

function cloudParse(txt) {
  try {
    const o = JSON.parse(txt);
    if (o && o.v === 2 && typeof o.d === "string") return { d: o.d, k: o.k };
  } catch (e) {}
  return { d: txt, k: null };
}

const stashRaw = () => {
  try {
    const k = typeof stashKey === "function" ? stashKey() : "jxidle_stash";
    return localStorage.getItem(k);
  } catch (e) { return null; }
};

function netApplyStash(raw) {
  if (!raw) return false;
  try {
    const u = unpack(raw);
    if (u && typeof stashPutObj === "function") return stashPutObj(u);
  } catch (e) {}
  return false;
}

const netProg = st => ((st.lvl || 1) + (st.reborn || 0) * 200) * 1e6 + (st.power || 0);

const netForeign = state => !!(state && state.netOwner && NET.user && state.netOwner !== NET.user.id);

const netCloudStale = (state, cloudTime) => {
  const localTime = Math.max(state.last || 0, state.cloudAt || 0);
  return cloudTime > localTime + 2000;
};

function netUserSwitch() {
  if (!NET.user) return;
  for (let i = 0; i < SLOT_N; i++) {
    const s = slotState(i);
    if (s && s.fac && s.netOwner && s.netOwner !== NET.user.id) {
      delete s.netOwner;
      delete s.cloudAt;
      writeSlot(i, s);
    }
  }
}

async function netUploadSlot(slotIdx, state) {
  if (!NET.user) return;
  netMarkSlotDeleted(slotIdx, false);
  const now = new Date();
  state.cloudAt = now.getTime();
  state.netOwner = NET.user.id;

  try { localStorage.setItem(slotKey(slotIdx), pack(state)); } catch (e) {}

  const slotData = {
    slot: slotIdx,
    name: state.name || "Tân thủ",
    lvl: state.lvl | 0,
    fac: state.fac || "tangmen",
    data: cloudPack(pack(state), stashRaw()),
    updated: now.toISOString()
  };

  // 1. Luôn lưu an toàn vào LocalStorage
  try {
    const allSaves = JSON.parse(localStorage.getItem(NET_SAVES_KEY + "_" + NET.user.id) || "[]");
    const idx = allSaves.findIndex(s => s.slot === slotIdx);
    if (idx >= 0) allSaves[idx] = slotData;
    else allSaves.push(slotData);
    localStorage.setItem(NET_SAVES_KEY + "_" + NET.user.id, JSON.stringify(allSaves));
  } catch (e) {}

  // 2. Đồng bộ lên Supabase nếu có cấu hình
  if (getSupabaseConfig().enabled) {
    try {
      await sbCall("/saves", {
        method: "POST",
        headers: { "Prefer": "resolution=merge-duplicates" },
        body: {
          id: NET.user.id + "_" + slotIdx,
          user_id: NET.user.id,
          slot: slotIdx,
          name: state.name || "Tân thủ",
          lvl: state.lvl | 0,
          reborn: state.reborn | 0,
          power: Math.round(state.power || 0),
          fac: state.fac || "tangmen",
          sex: state.sex | 0,
          data: slotData.data,
          updated_at: now.toISOString()
        }
      });
    } catch (e) {
      console.warn("Supabase upload save không thành công, tiếp tục lưu Native:", e);
    }
  }

  // 3. Gửi lên API server Native
  try {
    await apiCall("/save/upload", "POST", slotData);
  } catch (e) {
    if (!netLocalOfflineMode()) console.log("Server API không phản hồi, đã lưu cục bộ an toàn");
  }
}

async function netUpload() {
  if (!NET.user || !S || !S.fac) return;
  await netUploadSlot(SLOT, S);
  NET.lastUp = Date.now();
  netSyncChar(true).catch(() => {});
}

async function netCloudList() {
  if (!NET.user) return [];

  // 1. Thử lấy từ Supabase nếu có
  if (getSupabaseConfig().enabled) {
    try {
      const res = await sbCall("/saves?user_id=eq." + encodeURIComponent(NET.user.id) + "&select=*&order=slot.asc");
      if (Array.isArray(res) && res.length > 0) {
        const list = res.filter(s => !netSlotDeleted(s.slot)).map(s => ({
          slot: s.slot,
          name: s.name,
          lvl: s.lvl,
          reborn: s.reborn,
          power: s.power,
          fac: s.fac,
          updated: s.updated_at
        }));
        try { localStorage.setItem(NET_SAVES_KEY + "_" + NET.user.id, JSON.stringify(list)); } catch (e) {}
        return list;
      }
    } catch (e) {}
  }

  // 2. Thử lấy từ API server Native
  try {
    const res = await apiCall("/save/list", "GET");
    if (res && Array.isArray(res.list)) {
      const filtered = res.list.filter(s => !netSlotDeleted(s.slot));
      try { localStorage.setItem(NET_SAVES_KEY + "_" + NET.user.id, JSON.stringify(filtered)); } catch (e) {}
      return filtered;
    }
  } catch (e) {}

  // 2. Lấy từ LocalStorage
  let localList = [];
  try {
    const local = localStorage.getItem(NET_SAVES_KEY + "_" + NET.user.id);
    if (local) localList = JSON.parse(local) || [];
  } catch (e) {}

  // 3. Quét từ các slot đang chơi để bổ sung/cập nhật thông tin mới nhất
  const list = Array.isArray(localList) ? localList.filter(s => !netSlotDeleted(s.slot)) : [];
  for (let i = 0; i < SLOT_N; i++) {
    if (netSlotDeleted(i)) continue;
    const s = (i === SLOT && typeof S !== "undefined" && S && S.fac) ? S : slotState(i);
    if (s && s.fac) {
      const existingIdx = list.findIndex(e => e.slot === i);
      const slotItem = {
        slot: i,
        name: s.name || "Tân thủ",
        lvl: s.lvl | 1,
        reborn: s.reborn || (s.rw && s.rw.stat && s.rw.stat.reborn) || 0,
        fac: s.fac,
        power: Math.round(s.power || 0),
        updated: s.cloudAt ? new Date(s.cloudAt).toISOString() : (s.last ? new Date(s.last).toISOString() : new Date().toISOString())
      };
      if (existingIdx >= 0) {
        // Cập nhật thông tin mới nhất
        list[existingIdx] = Object.assign({}, list[existingIdx], slotItem);
      } else {
        list.push(slotItem);
      }
    }
  }
  return list;
}

async function netCloudLoad(slotIdx) {
  if (!NET.user) return;
  if (netSlotDeleted(slotIdx)) throw new Error("Nhân vật ở slot này đã được xóa.");
  let slotData = null;

  // 1. Thử tải từ Supabase nếu có
  if (getSupabaseConfig().enabled) {
    try {
      const res = await sbCall("/saves?id=eq." + encodeURIComponent(NET.user.id + "_" + slotIdx) + "&select=*");
      if (res && res.length > 0 && res[0].data) {
        slotData = { data: res[0].data, updated: res[0].updated_at };
      }
    } catch (e) {}
  }

  // 2. Thử tải từ API server Native
  if (!slotData) {
    try {
      const res = await apiCall("/save/download?slot=" + slotIdx, "GET");
      if (res && res.data) slotData = res;
    } catch (e) {}
  }

  // 2. Tải từ LocalStorage
  if (!slotData) {
    try {
      const local = JSON.parse(localStorage.getItem(NET_SAVES_KEY + "_" + NET.user.id) || "[]");
      slotData = local.find(s => s.slot === slotIdx);
    } catch (e) {}
  }

  if (!slotData || !slotData.data) {
    const s = slotState(slotIdx);
    if (s && s.fac) {
      writeSlot(slotIdx, s);
      location.reload();
      return;
    }
    throw new Error("Không tìm thấy dữ liệu bản lưu này!");
  }

  const parsed = cloudParse(slotData.data);
  let state = null;
  if (typeof parseSaveText === "function") {
    try { state = parseSaveText(parsed.d); } catch (e) {}
  }
  if (!state && typeof unpack === "function") {
    try {
      const u = unpack(parsed.d);
      if (u && u.state) state = u.state;
    } catch (e) {}
  }
  if (!state && typeof parsed.d === "string") {
    try {
      const obj = JSON.parse(parsed.d);
      if (obj && typeof obj === "object") state = obj.state || obj;
    } catch (e) {}
  } else if (!state && typeof parsed.d === "object" && parsed.d) {
    state = parsed.d.state || parsed.d;
  }
  if (!state || !state.fac) {
    throw new Error("Không thể giải mã dữ liệu bản lưu hoặc dữ liệu không hợp lệ!");
  }
  state.cloudAt = Date.parse(slotData.updated) || Date.now();
  state.netOwner = NET.user.id;
  netApplyStash(parsed.k);
  writeSlot(slotIdx, state);
  location.reload();
}

async function netSyncAll() {
  if (!NET.user) return false;
  netUserSwitch();
  return true;
}

async function netCheckCloud() {
  if (!NET.user || !S || !S.fac) return;
  // Kiểm tra nếu cloud có bản lưu mới hơn trên thiết bị này (ví dụ vừa chơi trên PC rồi chuyển qua Mobile)
  try {
    const list = await netCloudList();
    const curSlotCloud = Array.isArray(list) ? list.find(s => s.slot === SLOT) : null;
    if (curSlotCloud && curSlotCloud.updated) {
      const cloudTs = Date.parse(curSlotCloud.updated) || 0;
      const localTs = Math.max(S.last || 0, S.cloudAt || 0);
      if (cloudTs > localTs + 3000) {
        // Cloud có bản lưu mới hơn máy này ít nhất 3 giây -> Tự động nạp bản mới nhất từ Cloud
        console.log("Phát hiện bản lưu trên Cloud mới hơn, tự động đồng bộ...");
        await netCloudLoad(SLOT);
        return;
      }
    }
  } catch (e) {
    console.warn("netCheckCloud kiểm tra bản mới:", e);
  }

  if (!S.netOwner || S.netOwner === NET.user.id) {
    netUpload().catch(() => {});
  }
}

// ====================================================================
// 🏆 HỆ THỐNG BẢNG XẾP HẠNG (LEADERBOARD)
// ====================================================================

function netGear() {
  const g = {};
  if (typeof S !== "undefined" && S && S.eq) {
    for (const [k, v] of Object.entries(S.eq)) {
      if (v) g[k] = v;
    }
  }
  return g;
}

async function netSyncChar(quiet) {
  if (!NET.user || !S || !S.fac) return;

  const stat = (typeof RW === "function" ? RW().stat : (S.rw && S.rw.stat)) || {};
  const powerVal = Math.round(
    (typeof R !== "undefined" && R.power) ||
    (typeof R !== "undefined" && R.P && R.P.power) ||
    (S.lvl * 20) || 0
  );

  const charData = {
    owner: NET.user.id,
    name: (S.name && S.name.trim()) ? S.name.trim() : (FAC[S.fac] ? FAC[S.fac].n : "Đại hiệp"),
    fac: S.fac,
    sex: S.sex | 0,
    lvl: S.lvl | 0,
    reborn: Math.min(20, (stat.reborn | 0)),
    power: powerVal,
    tower: (stat.towerBest | 0),
    bosses: (stat.bosses | 0),
    gear: netGear(),
    updated: new Date().toISOString()
  };

  // 1. Cập nhật local storage
  try {
    let list = JSON.parse(localStorage.getItem(NET_RANKS_KEY) || "[]");
    const idx = list.findIndex(c => c.name === charData.name);
    if (idx >= 0) list[idx] = charData;
    else list.push(charData);
    localStorage.setItem(NET_RANKS_KEY, JSON.stringify(list));
  } catch (e) {}

  // 2. Gửi Supabase nếu có cấu hình
  if (getSupabaseConfig().enabled) {
    try {
      await sbCall("/rankings", {
        method: "POST",
        headers: { "Prefer": "resolution=merge-duplicates" },
        body: {
          id: charData.name,
          name: charData.name,
          owner: NET.user.id,
          fac: charData.fac,
          sex: charData.sex | 0,
          lvl: charData.lvl | 0,
          reborn: charData.reborn | 0,
          power: Math.round(charData.power || 0),
          tower: charData.tower | 0,
          bosses: charData.bosses | 0,
          gear: charData.gear || {},
          updated_at: new Date().toISOString()
        }
      });
    } catch (e) {}
  }

  // 3. Gửi API máy chủ Native
  try {
    await apiCall("/rank/sync", "POST", charData);
  } catch (e) {}

  NET.lastChar = Date.now();
}

async function fetchRankList(col, fac) {
  let list = [];

  // 1. Thử gọi Supabase nếu có
  if (getSupabaseConfig().enabled) {
    try {
      let path = "/rankings?select=*&limit=150";
      if (fac) path += "&fac=eq." + encodeURIComponent(fac);
      const res = await sbCall(path);
      if (Array.isArray(res) && res.length > 0) {
        list = res;
        if (col === "lvl") {
          list.sort((a, b) => ((b.reborn||0)*200 + (b.lvl||0)) - ((a.reborn||0)*200 + (a.lvl||0)) || (b.power||0) - (a.power||0));
        } else if (col === "power") {
          list.sort((a, b) => (b.power||0) - (a.power||0));
        } else if (col === "tower") {
          list.sort((a, b) => (b.tower||0) - (a.tower||0));
        } else if (col === "bosses") {
          list.sort((a, b) => (b.bosses||0) - (a.bosses||0));
        }
        try { localStorage.setItem(NET_RANKS_KEY, JSON.stringify(list)); } catch (e) {}
        return list;
      }
    } catch (e) {}
  }

  // 2. Thử gọi API máy chủ Native
  try {
    let url = "/rank/list?col=" + (col || "lvl");
    if (fac) url += "&fac=" + fac;
    const res = await apiCall(url, "GET");
    if (res && Array.isArray(res.list) && res.list.length > 0) {
      list = res.list;
      try { localStorage.setItem(NET_RANKS_KEY, JSON.stringify(list)); } catch (e) {}
      return list;
    }
  } catch (e) {}

  // 2. Lấy từ LocalStorage
  try {
    const loc = localStorage.getItem(NET_RANKS_KEY);
    if (loc) list = JSON.parse(loc);
  } catch (e) {}

  // 3. Kết hợp mẫu cao thủ mặc định
  if (!list || list.length === 0) {
    list = DEFAULT_RANKS.slice();
  }

  // Lọc phái
  if (fac) {
    list = list.filter(c => c.fac === fac);
  }

  return list;
}

// Soi trang bị cao thủ
const netCell = it => {
  if (!it) return '<div class="it"></div>';
  if (typeof itemCell === "function") {
    return itemCell(it).replace(" bad", "").replace(/ title="[^"]*"/, "");
  }
  return `<button class="it r${it.r || 0}">${it.n || ""}</button>`;
};

function netItemModal(it, note, onBack) {
  if (!it) return;
  const desc = typeof itemHTML === "function" ? itemHTML(it) : `<h3>${esc(it.n || "Trang bị")}</h3>`;
  modal(`${desc}${note || ""}<div class="btnrow"><button class="btn" id="niBack">Quay lại</button></div>`, () => {
    const b = $("#niBack");
    if (b) b.onclick = onBack;
  });
}

async function profileModal(targetName, onBack) {
  onBack = onBack || (() => closeModal());
  window.profileModal = profileModal;
  modal(`<h3>${esc(targetName)}</h3><p class="dim small">Đang nạp thông tin nhân vật…</p>`);

  let charData = null;

  // 1. Thử gọi Supabase nếu có
  if (getSupabaseConfig().enabled) {
    try {
      const res = await sbCall("/rankings?name=eq." + encodeURIComponent(targetName) + "&select=*");
      if (res && res.length > 0) charData = res[0];
    } catch (e) {}
  }

  // 2. Thử gọi API soi đồ Native
  if (!charData) {
    try {
      const res = await apiCall("/rank/inspect?name=" + encodeURIComponent(targetName), "GET");
      if (res && res.char) charData = res.char;
    } catch (e) {}
  }

  // 2. Tìm trong danh sách local
  if (!charData) {
    try {
      const all = JSON.parse(localStorage.getItem(NET_RANKS_KEY) || "[]");
      charData = all.find(c => c.name === targetName);
    } catch (e) {}
  }

  if (!charData) {
    charData = DEFAULT_RANKS.find(c => c.name === targetName);
  }

  if (!charData) {
    return modal(`<h3>${esc(targetName)}</h3><p class="desc">Nhân vật này chưa có bản lưu online.</p><div class="btnrow"><button class="btn" id="pfB">Quay lại</button></div>`, () => {
      const b = $("#pfB");
      if (b) b.onclick = onBack;
    });
  }

  const gear = charData.gear || {};
  const facObj = typeof FAC !== "undefined" && FAC[charData.fac];
  const slotsDef = (typeof SLOTS !== "undefined" ? SLOTS : [
    ["weapon", "Vũ khí"], ["armor", "Áo"], ["helm", "Mũ"], ["belt", "Đai lưng"],
    ["boot", "Giày"], ["cuff", "Hộ uyển"], ["amulet", "Dây chuyền"],
    ["ring1", "Nhẫn 1"], ["ring2", "Nhẫn 2"], ["pendant", "Ngọc bội"], ["horse", "Ngựa"]
  ]);

  const slotsHTML = slotsDef.map(([k, label]) => `
    <div class="pfs">
      <small class="dim">${label}</small>
      ${gear[k] ? netCell(gear[k]).replace("data-uid=", `data-pk="${k}" data-x=`) : '<div class="it" style="border:1px dashed #444;opacity:0.3"></div>'}
    </div>
  `).join("");

  modal(`
    <h3>${esc(charData.name)} <small>${esc(facObj ? facObj.n : "")} · Cấp ${charData.lvl}${charData.reborn ? ` · CS${charData.reborn}` : ""}</small></h3>
    <p class="small">Lực chiến: <b>${Math.round(charData.power || 0).toLocaleString()}</b> · Tháp: <b>${charData.tower || 0} tầng</b> · Trùm đã hạ: <b>${(charData.bosses || 0).toLocaleString()}</b></p>
    <div class="pfgrid">${slotsHTML}</div>
    <div class="btnrow">
      <button class="btn" id="pfB">Quay lại</button>
    </div>
  `, () => {
    document.querySelectorAll("#mBody [data-pk]").forEach(el => {
      el.onclick = () => netItemModal(gear[el.dataset.pk], "", () => profileModal(targetName, onBack));
    });
    const b = $("#pfB");
    if (b) b.onclick = onBack;
  });
}

// ====================================================================
// 🖥️ GIAO DIỆN MODAL (TÀI KHOẢN, CLOUD SAVE, BẢNG XẾP HẠNG)
// ====================================================================

const busy = async (btn, fn, onDone) => {
  if (btn) btn.disabled = true;
  try {
    const res = await fn();
    if (onDone) onDone(res);
  } catch (err) {
    if (typeof toast === "function") toast(err.message || String(err));
    if (btn) btn.disabled = false;
  }
};

async function netRankBody(container) {
  if (!RANKS.some(c => c[0] === NET.rank)) NET.rank = "lvl";
  const curRank = NET.rank;

  let list = await fetchRankList(curRank, NET.rfac);

  // Luôn gắn nhân vật đang chơi vào BXH
  if (S && S.name && S.fac && (!NET.rfac || NET.rfac === S.fac)) {
    const stat = (typeof RW === "function" ? RW().stat : (S.rw && S.rw.stat)) || {};
    const powerVal = Math.round(
      (typeof R !== "undefined" && R.power) ||
      (typeof R !== "undefined" && R.P && R.P.power) ||
      (S.lvl * 20) || 0
    );
    const myItem = {
      name: S.name.trim(),
      fac: S.fac,
      lvl: S.lvl | 0,
      reborn: Math.min(20, (stat.reborn | 0)),
      power: powerVal,
      tower: (stat.towerBest | 0),
      bosses: (stat.bosses | 0),
      gear: netGear()
    };
    const existIdx = list.findIndex(c => c.name === myItem.name);
    if (existIdx >= 0) list[existIdx] = Object.assign({}, list[existIdx], myItem);
    else list.push(myItem);
  }

  const getCs = item => Math.min(RANK_CS_MAX, Math.max(0, item.reborn | 0));

  if (curRank === "lvl") {
    list = list.sort((a, b) => getCs(b) - getCs(a) || (b.lvl | 0) - (a.lvl | 0) || (b.power | 0) - (a.power | 0));
  } else {
    list = list.sort((a, b) => ((b[curRank] | 0) - (a[curRank] | 0)));
  }
  list = list.slice(0, 50);

  const formatStat = item => curRank === "lvl"
    ? `${getCs(item) ? `<small style="color:#2ecc71;font-weight:bold">CS${getCs(item)}</small> ` : ""}Cấp ${item.lvl}`
    : (typeof fmt === "function" ? fmt(item[curRank] || 0) : (item[curRank] || 0));

  const myRankIdx = S && S.name ? list.findIndex(c => c.name === S.name) : -1;
  const myRankText = myRankIdx >= 0 ? `#${myRankIdx + 1}` : "ngoài top 50";
  const factionsList = (typeof FACTIONS !== "undefined" ? FACTIONS : []).filter(f => !f.novice);

  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <p class="small" style="margin:0">Hạng của bạn: <span style="color:#ffd76a;font-weight:700">${myRankText}</span>${NET.user ? "" : ' <span class="dim">(đăng nhập để có tên trên bảng)</span>'}</p>
      ${S && S.fac && NET.user ? `<button class="btn sm" id="nrSync">Cập nhật ngay</button>` : ""}
    </div>
    <div class="row" style="margin-bottom:8px;gap:8px">
      <select id="nrCol" style="flex:1">
        ${RANKS.map(([k, label]) => `<option value="${k}" ${k === curRank ? "selected" : ""}>Xếp theo: ${label}</option>`).join("")}
      </select>
      <select id="nrFac" style="flex:1">
        <option value="">Tất cả môn phái</option>
        ${factionsList.map(f => `<option value="${f.key}" ${f.key === NET.rfac ? "selected" : ""}>${esc(f.n)}</option>`).join("")}
      </select>
    </div>
    <div style="overflow-x:auto;max-height:360px;overflow-y:auto">
      <table class="dktbl small">
        <thead>
          <tr>
            <th style="width:36px;text-align:center">#</th>
            <th>Nhân vật</th>
            <th>Môn phái</th>
            <th style="text-align:right">${RANKS.find(r => r[0] === curRank)[1]}</th>
          </tr>
        </thead>
        <tbody>
          ${list.map((c, idx) => {
            const isMe = S && c.name === S.name;
            const facObj = typeof FAC !== "undefined" && FAC[c.fac];
            const facNameStr = facObj ? facObj.n : c.fac;
            const facColor = (typeof SERIES_COL !== "undefined" && facObj) ? SERIES_COL[facObj.series] : "#ffd76a";
            return `
              <tr${isMe ? ' style="background:#2a2410;font-weight:bold"' : ""}>
                <td style="text-align:center">${idx + 1}</td>
                <td><a href="#" data-pn="${esc(c.name)}" style="color:${facColor}">${esc(c.name)}</a></td>
                <td>${esc(facNameStr)}</td>
                <td style="text-align:right">${formatStat(c)}</td>
              </tr>
            `;
          }).join("") || '<tr><td colspan="4" class="dim" style="text-align:center">Chưa có ai</td></tr>'}
        </tbody>
      </table>
    </div>
    <p class="dim small" style="margin-top:8px">Bấm vào tên nhân vật để soi đồ trang bị. Thứ hạng của bạn tự động cập nhật khi chơi game.</p>
  `;

  $("#nrCol").onchange = e => {
    NET.rank = e.target.value;
    netModal("rank");
  };
  $("#nrFac").onchange = e => {
    NET.rfac = e.target.value;
    netModal("rank");
  };

  const btnSync = $("#nrSync");
  if (btnSync) {
    btnSync.onclick = () => busy(btnSync, () => netSyncChar(), () => {
      if (typeof toast === "function") toast("Đã cập nhật chỉ số lên bảng xếp hạng!");
      netModal("rank");
    });
  }

  container.querySelectorAll("[data-pn]").forEach(link => {
    link.onclick = e => {
      e.preventDefault();
      profileModal(link.dataset.pn, () => netModal("rank"));
    };
  });
}

async function netAccBody(container) {
  if (!NET.user) {
    container.innerHTML = `
      <style>
        #modal:not(.hidden):has(.jx-login-card) {
          position: fixed !important;
          inset: 0 !important;
          z-index: 65 !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          overflow-y: auto !important;
          -webkit-overflow-scrolling: touch !important;
          padding: 16px 12px !important;
          box-sizing: border-box !important;
          background: radial-gradient(ellipse at 50% 60%, rgba(4,18,14,0.35) 0%, rgba(2,10,8,0.92) 100%),
                      url('ui/chon_nv/nen_van_ngoc.webp') center/cover no-repeat #071412 !important;
        }
        .mbox:has(.jx-login-card) {
          zoom: 1 !important;
          max-width: 420px !important;
          width: 95% !important;
          margin: auto !important;
          padding: 0 !important;
          border: none !important;
          background: transparent !important;
          box-shadow: none !important;
          overflow: visible !important;
        }
        .mbox:has(.jx-login-card)::before,
        .mbox:has(.jx-login-card)::after {
          display: none !important;
        }
        .jx-login-card {
          width: 100% !important;
          box-sizing: border-box !important;
          background: linear-gradient(135deg,rgba(26,17,10,0.95),rgba(12,8,5,0.98)),url('ui/login/thap_tam_mon_phai.webp') center top/cover no-repeat !important;
          border: 1.5px solid #a67c38 !important;
          box-shadow: 0 0 0 1px #000, 0 8px 32px rgba(0,0,0,0.9) !important;
          border-radius: 8px !important;
          padding: 18px 18px 14px !important;
          color: #f0e4c8 !important;
          text-align: center !important;
        }
        .jx-login-card input {
          font-size: 16px !important; /* chống auto-zoom của trình duyệt Safari/Chrome mobile */
        }
        .jx-login-card input:focus {
          border-color: #ffd24a !important;
          outline: none;
          box-shadow: 0 0 6px rgba(255,210,74,0.4);
        }
      </style>
      <div class="card jx-login-card">
        <div style="margin-bottom:8px">
          <div style="font-size:10px;letter-spacing:3px;color:#d4af37;text-transform:uppercase;font-weight:bold;margin-bottom:2px">HÙNG BÁ THIÊN HẠ</div>
          <h2 style="margin:0;font-size:18px;color:#ffd24a;text-shadow:0 0 8px #b8781a,0 1px 2px #000;letter-spacing:1px">CÔNG THÀNH CHIẾN</h2>
        </div>
        <p class="dim small" style="margin:0 0 12px 0;line-height:1.4;color:#dcd0b5;font-size:11.5px">Đăng nhập tài khoản trực tuyến để lưu trữ đám mây và vinh danh bảng xếp hạng.</p>
        <div style="text-align:left;max-width:280px;margin:0 auto 12px">
          <div style="margin-bottom:8px">
            <span style="font-size:11.5px;color:#ffd24a;display:block;margin-bottom:3px">Tài khoản</span>
            <input id="naU" maxlength="16" autocomplete="username" placeholder="Nhập tên tài khoản..." style="width:100%;box-sizing:border-box;background:#140e08;border:1px solid #7d602b;border-radius:4px;padding:6px 10px;color:#fff2d0;font-size:13px">
          </div>
          <div style="margin-bottom:8px">
            <span style="font-size:11.5px;color:#ffd24a;display:block;margin-bottom:3px">Mật khẩu</span>
            <input id="naP" type="password" maxlength="64" autocomplete="current-password" placeholder="Nhập mật khẩu..." style="width:100%;box-sizing:border-box;background:#140e08;border:1px solid #7d602b;border-radius:4px;padding:6px 10px;color:#fff2d0;font-size:13px">
          </div>
        </div>
        <div class="btnrow" style="justify-content:center;gap:10px;margin-top:4px">
          <button class="btn on" id="naIn" style="min-width:110px;padding:7px 14px;font-weight:bold;font-size:13.5px;background:linear-gradient(#9e6f1f,#5c3d0b);border:1px solid #ffd24a;color:#fff5d6;box-shadow:0 0 8px rgba(255,210,74,0.3);cursor:pointer">Đăng Nhập</button>
          <button class="btn" id="naUp" style="min-width:110px;padding:7px 14px;font-weight:bold;font-size:13.5px;background:linear-gradient(#3a2717,#1c1208);border:1px solid #8f6e33;color:#d5c49f;cursor:pointer">Đăng Ký</button>
        </div>
        <div style="margin-top:10px;border-top:1px dashed #5a4321;padding-top:6px;font-size:10.5px;color:#9e8c6e">
          Mỗi tài khoản sở hữu tối đa 20 vị trí nhân vật; 4 nhân vật có thể xuất chiến cùng lúc.
        </div>
      </div>
    `;

    const doAuth = async action => {
      const u = String($("#naU").value || "").trim().toLowerCase();
      const p = String($("#naP").value || "");
      if (!u) {
        if (typeof toast === "function") toast("Vui lòng nhập tên đăng nhập!");
        return;
      }
      if (!p) {
        if (typeof toast === "function") toast("Vui lòng nhập mật khẩu!");
        return;
      }

      const btn = $(action === "up" ? "#naUp" : "#naIn");
      await busy(btn, async () => {
        await netAuth(action, u, p);

        // Khôi phục nút đóng modal nếu bị ẩn
        const closeBtn = document.getElementById("mClose");
        if (closeBtn) closeBtn.style.display = "";

        if (action === "up") {
          // 1. Đăng ký thành công -> mở màn hình Chọn / Tạo nhân vật
          container.innerHTML = "";
          closeModal(true);
          try { localStorage.setItem("jxidle_slot", "menu"); } catch (e) {}
          if (typeof toast === "function") {
            toast("Đăng ký thành công! Chào mừng đại hiệp " + netUname() + ".");
          }
          if (typeof slotMenu === "function") {
            slotMenu();
          } else if (typeof pickFaction === "function") {
            pickFaction();
          }
        } else {
          // 2. Đăng nhập thành công -> chuyển sang màn hình Chọn Nhân Vật
          container.innerHTML = "";
          closeModal(true);
          try { localStorage.setItem("jxidle_slot", "menu"); } catch (e) {}
          if (typeof toast === "function") {
            toast("Đăng nhập thành công! Chào mừng " + netUname() + " trở lại giang hồ.");
          }
          if (typeof slotMenu === "function") {
            slotMenu();
          } else {
            location.reload();
          }
        }
      });
    };

    $("#naIn").onclick = () => doAuth("in");
    $("#naUp").onclick = () => doAuth("up");
    $("#naP").onkeydown = e => { if (e.key === "Enter") doAuth("in"); };
    $("#naU").onkeydown = e => { if (e.key === "Enter") $("#naP").focus(); };
    setTimeout(() => {
      try { $("#naU").focus(); } catch(e) {}
    }, 100);
    return;
  }

  const list = await netCloudList();
  const formatTime = ts => ts ? new Date(ts).toLocaleString("vi-VN") : "—";
  const curFac = S && S.fac ? (typeof FAC !== "undefined" && FAC[S.fac] ? FAC[S.fac].n : S.fac) : "";

  container.innerHTML = `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <b>Tài khoản: <span style="color:#f1cf87">${esc(netUname())}</span></b>
        <button class="btn sm" id="naOut">Đăng xuất</button>
      </div>
      ${S && S.fac ? `
        <p class="small">Nhân vật đang chơi: <b>${esc(S.name || "Tân thủ")}</b> · ${esc(curFac)} Cấp ${S.lvl || 1} · Slot ${SLOT + 1}</p>
        <div class="btnrow" style="margin-top:8px">
          <button class="btn sm" id="naUp">☁️ Tải lên ngay (slot ${SLOT + 1})</button>
          <button class="btn sm" id="naSync">🏆 Cập nhật BXH</button>
        </div>
      ` : ""}
    </div>

    <div class="card">
      <b>☁ Lưu đám mây & Bản sao lưu</b> <small class="dim">(mỗi slot 1 bản, chơi tiếp trên máy khác)</small>
      <p class="dim small" style="margin:4px 0 8px 0">Nhân vật tự động lưu lên đám mây định kỳ và khi rời trang; vào game luôn lấy bản lưu mới nhất.</p>
      <table class="dktbl small" style="margin:8px 0">
        <thead>
          <tr>
            <th style="width:50px">Slot</th>
            <th>Nhân vật</th>
            <th>Lưu lúc</th>
            <th style="width:70px">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          ${Array.from({ length: SLOT_N }, (_, slotIdx) => {
            const item = (list || []).find(e => e.slot === slotIdx);
            const fName = item && item.fac ? (typeof FAC !== "undefined" && FAC[item.fac] ? FAC[item.fac].n : item.fac) : "";
            const isCur = slotIdx === SLOT && S && S.fac;
            return `
              <tr>
                <td><b>${slotIdx + 1}</b>${isCur ? ' <span style="color:#2ecc71;font-size:10px">(Đang chơi)</span>' : ""}</td>
                <td>${item ? `<b>${esc(item.name || "Tân thủ")}</b> · ${esc(fName)} Cấp ${item.lvl || 1}` : '<span class="dim">trống</span>'}</td>
                <td>${item ? formatTime(item.updated) : "—"}</td>
                <td>${item ? `<button class="btn sm" data-cl="${slotIdx}">Tải về</button>` : ""}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
      <p class="dim small">Tải về: thay nhân vật slot đó trên máy này bằng bản đám mây. Bình thường game tự đồng bộ, không cần bấm.</p>
    </div>
  `;

  $("#naOut").onclick = () => {
    netLogout();
    if (typeof toast === "function") toast("Đã đăng xuất tài khoản");
    netModal("acc");
  };

  const btnUp = $("#naUp");
  if (btnUp) {
    btnUp.onclick = () => busy(btnUp, () => netUpload(), () => {
      if (typeof toast === "function") toast("Đã lưu nhân vật lên đám mây thành công!");
      netModal("acc");
    });
  }

  const btnSync = $("#naSync");
  if (btnSync) {
    btnSync.onclick = () => busy(btnSync, () => netSyncChar(), () => {
      if (typeof toast === "function") toast("Đã cập nhật chỉ số lên bảng xếp hạng!");
    });
  }

  container.querySelectorAll("[data-cl]").forEach(btn => {
    btn.onclick = () => busy(btn, async () => {
      const slotToLoad = +btn.dataset.cl;
      await netCloudLoad(slotToLoad);
    });
  });
}

async function netModal(tab, msg) {
  if (tab) NET.tab = tab;
  await netEnsureUser();

  const title = NET.user
    ? `<h3>🌐 Giang hồ online <small style="font-weight:normal;font-size:12px">${esc(netUname())}</small></h3>`
    : "";
  const tabs = NET.user
    ? [
        ["acc", "☁️ Tài Khoản"],
        ["rank", "🏆 Bảng Xếp Hạng"]
      ]
    : [];
  const tabsHTML = tabs.length
    ? `<div class="dtabs" id="netTabs" style="margin-bottom:12px">${tabs.map(([k, label]) => `<button data-nt="${k}" class="${k === NET.tab ? "on" : ""}">${label}</button>`).join("")}</div>`
    : "";
  const errHtml = msg ? `<p class="reqbad">${esc(msg)}</p>` : "";

  modal(title + tabsHTML + errHtml + '<div id="netBody"><p class="dim small">Đang nạp dữ liệu…</p></div>', () => {
    if (!NET.user) {
      const closeBtn = document.getElementById("mClose");
      if (closeBtn) closeBtn.style.display = "none";
    }
    document.querySelectorAll("#netTabs [data-nt]").forEach(b => {
      b.onclick = () => netModal(b.dataset.nt);
    });
  }, !(S && S.fac));

  const body = $("#netBody");
  if (!body) return;
  try {
    if (NET.tab === "rank") {
      await netRankBody(body);
    } else {
      await netAccBody(body);
    }
  } catch (err) {
    body.innerHTML = `<p class="reqbad">${esc(err.message || err)}</p>`;
  }
}

async function netAfterLogin() {
  await netSyncAll().catch(() => {});
  if (typeof toast === "function") toast("Đã đăng nhập tài khoản: " + netUname());
  netSyncChar(true).catch(() => {});
  netCheckCloud().catch(() => {});
  netModal("acc");
}

async function netInit() {
  const giftBtn = document.getElementById("giftBtn");
  if (giftBtn && !document.getElementById("netBtn")) {
    const n = document.createElement("button");
    n.id = "netBtn";
    n.title = "Giang hồ online: tài khoản, xếp hạng, lưu đám mây";
    n.textContent = "🌐";
    giftBtn.parentNode.insertBefore(n, giftBtn);
    n.onclick = () => {
      if (typeof uiSfx === "function") uiSfx("click");
      netModal();
    };
  }

  await netEnsureUser();
  if (NET.user) {
    netSyncChar(true).catch(() => {});
    netCheckCloud().catch(() => {});
  } else {
    // Chưa đăng nhập: Mở ngay giao diện đăng nhập / đăng ký
    netModal("acc");
  }
}

if (typeof profileModal === "function") {
  window.profileModal = profileModal;
}

// ====================================================================
// 🛠️ HỆ THỐNG ĐỒNG BỘ GM & LỆNH CAN THIỆP (GM CONTROL INTEGRATION)
// ====================================================================

// Lắng nghe và đồng bộ cấu hình Server từ Supabase (EXP, tỷ lệ rơi, thông báo)
async function syncServerSettingsFromCloud() {
  if (typeof getSupabaseConfig !== "function" || !getSupabaseConfig().enabled) return;
  try {
    const res = await sbCall("/server_settings?id=eq.1&select=*");
    if (Array.isArray(res) && res.length > 0) {
      const s = res[0];
      if (s.exp_rate && !isNaN(Number(s.exp_rate))) {
        const rate = Number(s.exp_rate);
        if (typeof XP_EVENT !== "undefined" && XP_EVENT !== rate) {
          XP_EVENT = rate;
          if (typeof log === "function") log(`<b style="color:#ffd24a">🎉 Cấu hình GM: Tỷ lệ EXP toàn server x${rate}!</b>`);
        }
      }
      if (s.notice && s.notice !== window.__lastServerNotice) {
        window.__lastServerNotice = s.notice;
        if (typeof toast === "function") toast("📢 GM Thông báo: " + s.notice);
        if (typeof log === "function") log(`<b style="color:#ff6b6b">📢 [GM THÔNG BÁO]:</b> ${s.notice}`);
      }
    }
  } catch (e) {}
}

// Xử lý thực thi 1 lệnh GM gửi tới người chơi
function executeGmCommand(cmd) {
  if (!cmd || !cmd.action || typeof S === "undefined" || !S || !S.fac) return;
  const action = cmd.action;
  const data = cmd.data || {};

  try {
    switch (action) {
      case "gold": {
        const amt = Number(data.amount) || 10000000;
        S.gold = (S.gold || 0) + amt;
        if (typeof log === "function") log(`<b class="up">🎁 GM trao thưởng: +${(typeof fmtL === "function" ? fmtL(amt) : amt)} lượng!</b>`);
        if (typeof toast === "function") toast(`GM tặng ${typeof fmtL === "function" ? fmtL(amt) : amt} lượng!`);
        break;
      }
      case "knb":
      case "add_knb": {
        const amt = Number(data.amount || data.knb) || 1000;
        S.knb = (S.knb || 0) + amt;
        if (typeof log === "function") log(`<b class="up">🎁 GM trao thưởng: +${amt} Kim Nguyên Bảo!</b>`);
        if (typeof toast === "function") toast(`GM tặng ${amt} KNB!`);
        break;
      }
      case "set_lvl": {
        const targetLvl = Number(data.lvl) || 1;
        S.lvl = Math.max(1, Math.min(200, targetLvl));
        S.xp = 0;
        if (typeof recalc === "function") recalc();
        if (typeof log === "function") log(`<b class="up">⚡ GM đã đặt cấp độ nhân vật thành: Cấp ${S.lvl}!</b>`);
        if (typeof toast === "function") toast(`Cấp độ được đổi thành: ${S.lvl}`);
        break;
      }
      case "add_exp": {
        const expAmt = Number(data.exp) || 500000;
        if (typeof gainXp === "function") gainXp(expAmt);
        else S.xp = (S.xp || 0) + expAmt;
        if (typeof log === "function") log(`<b class="up">⚡ GM cộng thêm ${expAmt.toLocaleString("vi-VN")} điểm kinh nghiệm!</b>`);
        break;
      }
      case "add_pts": {
        const pts = Number(data.pts) || 100;
        S.attrPts = (S.attrPts || 0) + pts;
        if (typeof log === "function") log(`<b class="up">⚡ GM cộng thêm ${pts} điểm tiềm năng!</b>`);
        if (typeof toast === "function") toast(`+${pts} điểm tiềm năng`);
        break;
      }
      case "add_sk": {
        const skp = Number(data.sk) || 10;
        S.skPts = (S.skPts || 0) + skp;
        if (typeof log === "function") log(`<b class="up">⚡ GM cộng thêm ${skp} điểm kỹ năng!</b>`);
        if (typeof toast === "function") toast(`+${skp} điểm kỹ năng`);
        break;
      }
      case "gold_set": {
        let count = 0;
        for (let i = 0; i < 5; i++) {
          let item = null;
          if (typeof forceSetItem === "function") item = forceSetItem(false, true);
          if (item && typeof addItem === "function") {
            addItem(item, true, true, true);
            count++;
          }
        }
        if (typeof log === "function") log(`<b style="color:#ffd24a">🎁 GM gửi tặng Bộ Trang Bị Hoàng Kim (${count} món)!</b>`);
        if (typeof toast === "function") toast(`Đã nhận ${count} món Hoàng Kim từ GM!`);
        break;
      }
      case "mats": {
        if (typeof matAdd === "function") {
          matAdd("ht", 10, 10);
          matAdd("ht", 9, 20);
          matAdd("ht", 8, 30);
          if (typeof matAddMisc === "function") matAddMisc("wc", 5);
        }
        if (typeof log === "function") log(`<b style="color:#6be4ff">🎁 GM gửi gói Nguyên liệu Huyền Tinh cấp cao!</b>`);
        if (typeof toast === "function") toast("Đã nhận Gói Nguyên Liệu từ GM!");
        break;
      }
      case "enh": {
        if (S.eq) {
          for (const slotKey in S.eq) {
            if (S.eq[slotKey]) S.eq[slotKey].enh = 10;
          }
          if (typeof recalc === "function") recalc();
          if (typeof log === "function") log(`<b class="up">🛡️ GM đã nâng cấp toàn bộ trang bị đang mặc lên +10!</b>`);
          if (typeof toast === "function") toast("Toàn bộ đồ đã được cường hoá +10!");
        }
        break;
      }
      case "random_gear": {
        let cnt = 0;
        for (let i = 0; i < 10; i++) {
          if (typeof makeItem === "function" && typeof addItem === "function") {
            const kind = Math.floor(Math.random() * 10);
            const part = typeof sexPart === "function" ? sexPart(kind, 0) : 0;
            const item = makeItem(kind, part, Math.min(10, Math.floor(S.lvl / 12) + 1), 6);
            if (item) {
              addItem(item, true, true, true);
              cnt++;
            }
          }
        }
        if (typeof log === "function") log(`<b style="color:#b28dff">🎁 GM gửi tặng ${cnt} món trang bị 6 dòng cực phẩm!</b>`);
        if (typeof toast === "function") toast(`Đã nhận ${cnt} món trang bị từ GM!`);
        break;
      }
      case "full_heal": {
        if (typeof R !== "undefined" && R && R.P) {
          R.life = R.P.life;
          R.mana = R.P.mana;
          if (typeof log === "function") log(`<b style="color:#ff6b6b">❤️ GM hồi phục toàn bộ Sinh lực và Nội lực!</b>`);
          if (typeof toast === "function") toast("Sinh lực & Nội lực đã đầy!");
        }
        break;
      }
      case "open_all_zones": {
        S.stage = 600;
        S.maxStage = 600;
        if (typeof log === "function") log(`<b style="color:#ffd24a">🗺️ GM đã mở khóa toàn bộ các ải bản đồ!</b>`);
        if (typeof toast === "function") toast("Đã mở khóa toàn bộ ải!");
        break;
      }
      case "god_mode": {
        window.__GM_GOD_MODE = !window.__GM_GOD_MODE;
        if (typeof toast === "function") toast("Bất tử: " + (window.__GM_GOD_MODE ? "BẬT" : "TẮT"));
        if (typeof log === "function") log(`<b style="color:#ffd24a">🛡️ Chế độ Bất tử: ${window.__GM_GOD_MODE ? "BẬT" : "TẮT"}!</b>`);
        break;
      }
      case "reset_daily": {
        if (typeof DG === "function") {
          const dg = DG();
          dg.boat = 0;
          dg.boss = 0;
        }
        if (typeof log === "function") log(`<b class="up">🔄 GM đã hồi lại toàn bộ lượt phụ bản & hoạt động hôm nay!</b>`);
        if (typeof toast === "function") toast("Đã làm mới lượt hoạt động!");
        break;
      }
      default:
        console.log("[GM Command] Không rõ lệnh:", cmd);
    }

    if (typeof achCheck === "function") achCheck();
    if (typeof refresh === "function") refresh();
    if (typeof save === "function") save();
  } catch (err) {
    console.error("[GM Command Error]", err);
  }
}

// Kiểm tra hàng đợi lệnh GM định kỳ
function checkGmCommandsQueue() {
  if (typeof S === "undefined" || !S || !S.name) return;
  const charName = S.name.trim();

  // 1. Kiểm tra lệnh riêng cho nhân vật
  const myKey = "jx2_gm_cmd_" + charName;
  try {
    const raw = localStorage.getItem(myKey);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) {
        localStorage.removeItem(myKey);
        for (const cmd of list) executeGmCommand(cmd);
      }
    }
  } catch (e) {}

  // 2. Kiểm tra lệnh broadcast toàn server
  const allKey = "jx2_gm_cmd_all";
  try {
    const rawAll = localStorage.getItem(allKey);
    if (rawAll) {
      const list = JSON.parse(rawAll);
      if (Array.isArray(list) && list.length > 0) {
        localStorage.removeItem(allKey);
        for (const cmd of list) executeGmCommand(cmd);
      }
    }
  } catch (e) {}

  // Cập nhật vị trí / trạng thái online vào local storage để GM panel nhìn thấy ngay
  try {
    const onlineMap = JSON.parse(localStorage.getItem("jx2_online_players") || "{}");
    onlineMap[charName] = {
      name: charName,
      fac: S.fac,
      facName: (typeof FACTION_NAMES !== "undefined" && FACTION_NAMES[S.fac]) || (typeof FAC !== "undefined" && FAC[S.fac] && FAC[S.fac].n) || S.fac,
      lvl: S.lvl || 1,
      gold: S.gold || 0,
      stage: S.stage || 1,
      last_seen: Date.now(),
      statusLabel: "Online"
    };
    localStorage.setItem("jx2_online_players", JSON.stringify(onlineMap));
  } catch (e) {}
}

// Khởi chạy vòng lặp kiểm tra lệnh GM và đồng bộ cài đặt máy chủ
// Offline: disabled checkGmCommandsQueue

// Offline: disabled syncServerSettingsFromCloud

// Tự động đồng bộ bản lưu lên Cloud định kỳ (mỗi 5 phút = 300,000ms)
const CLOUD_AUTOSAVE_INTERVAL = 5 * 60 * 1000;
// Offline: disabled netUpload

// Chạy 1 lần sau khi game tải
setTimeout(() => {
  checkGmCommandsQueue();
  syncServerSettingsFromCloud();
  if (typeof fetchGuildsFromCloud === "function") fetchGuildsFromCloud();
}, 1000);

if (typeof window !== 'undefined') {
  window.netUpload = netUpload;
  window.netUploadSlot = netUploadSlot;
  window.netCheckCloud = netCheckCloud;
  window.netCloudList = netCloudList;
  window.netCloudLoad = netCloudLoad;
  window.netSyncChar = netSyncChar;
  window.netModal = netModal;
  window.netInit = netInit;
  window.netEnsureUser = netEnsureUser;
}




// ====================================================================
// ⛩️ GIAO DIỆN CỔNG ĐĂNG NHẬP (NET GATE)
// ====================================================================


