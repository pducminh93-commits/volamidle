/**
 * ====================================================================
 * 🛡️ HỆ THỐNG TỔ ĐỘI (PARTY CORE & UI) - GIAI ĐOẠN 1
 * ====================================================================
 * - Quản lý Tổ Đội (ptModal): Mở bằng nút Tổ Đội hoặc phím P.
 * - Tạo Tổ Đội: Người tạo làm Đội Trưởng (Leader 👑).
 * - Tối đa: 4 thành viên (avatar, môn phái, cấp độ, máu/nội lực, vị trí map).
 * - Quyền Đội Trưởng: Mời theo tên, Bổ nhiệm Đội Trưởng, Trục xuất (Kick),
 *   Khóa/Mở đội (tự do/chỉ mời), Giải tán tổ đội.
 * - Mời xung quanh: Click người chơi khác hoặc trên Chat Thế Giới -> [Mời vào đội].
 * - Kênh Chat Tổ Đội (Kênh T.Đ): Trao đổi realtime và thông báo hệ thống đội.
 * - Đồng bộ: Tự động qua WebSocket Presence & Cloud Supabase (hàng system).
 */

"use strict";

const PARTY_STORAGE_KEY = "jx_parties_v1";
const PARTY_MAX = 4;
const PT_MAX = PARTY_MAX;
const PARTY_SYSTEM_RECORD_ID = "00000000-0000-0000-0000-000000000002"; // ID Supabase market_items lưu dữ liệu party toàn server

// Trạng thái local của Tổ Đội người chơi
const PT = {
  pid: null,
  leader: null,
  closed: false,
  mem: [],       // [{ name, fac, lvl, hp, maxHp, mp, maxMp, mapName, x, y, leader: boolean, isMe: boolean, joinedAt }]
  inv: [],       // [{ id, pid, pName, fromName, fromLvl, fromFac, ts }]
  unread: 0,
  busy: false,
  lastSync: 0
};

// ====================================================================
// 1. LƯU TRỮ VÀ ĐỒNG BỘ DỮ LIỆU TỔ ĐỘI
// ====================================================================

function getStoredParties() {
  try {
    const raw = localStorage.getItem(PARTY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return sanitizeParties(parsed);
    }
  } catch (e) {
    console.error("[Party] Load error:", e);
  }
  return [];
}

function sanitizeParties(parties) {
  if (!Array.isArray(parties)) return [];
  const now = Date.now();
  // Lọc bỏ các tổ đội không hoạt động quá 2 ngày
  return parties.filter(p => {
    if (!p || !p.id || !Array.isArray(p.mem) || !p.mem.length) return false;
    if (p.mem.length > PARTY_MAX) p.mem = p.mem.slice(0, PARTY_MAX);
    if (p.updatedAt && (now - p.updatedAt > 2 * 86400000)) return false;
    return true;
  });
}

function saveStoredParties(parties, shouldBroadcast = true) {
  try {
    localStorage.setItem(PARTY_STORAGE_KEY, JSON.stringify(parties));
  } catch (e) {
    console.error("[Party] Save error:", e);
  }

  // Đồng bộ lên Cloud Supabase (nếu có cấu hình)
  syncPartiesToCloud(parties);

  // Phát WebSocket broadcast tới các người chơi khác
  if (shouldBroadcast) {
    broadcastPartySync(parties);
  }
}

async function syncPartiesToCloud(parties) {
  if (typeof sbCall !== "function") return;
  try {
    const cfg = typeof getSupabaseConfig === "function" ? getSupabaseConfig() : null;
    if (!cfg || !cfg.enabled) return;

    await sbCall("/market_items", "POST", {
      headers: { "Prefer": "resolution=merge-duplicates,return=representation" },
      body: {
        id: PARTY_SYSTEM_RECORD_ID,
        seller_id: "__SYSTEM_PARTIES__",
        seller_name: "Hệ Thống Tổ Đội",
        item_data: { parties: parties, updated_at: Date.now() },
        item_name: "Dữ Liệu Tổ Đội Toàn Server",
        item_type: 98,
        item_level: 1,
        price_type: "gold",
        price: 0,
        status: "system"
      }
    });
  } catch (e) {
    // Im lặng bỏ qua lỗi mạng
  }
}

let _lastPartyCloudFetch = 0;
async function fetchPartiesFromCloud(force = false) {
  const now = Date.now();
  if (!force && now - _lastPartyCloudFetch < 4000) return getStoredParties();
  _lastPartyCloudFetch = now;

  if (typeof sbCall !== "function") return getStoredParties();
  try {
    const cfg = typeof getSupabaseConfig === "function" ? getSupabaseConfig() : null;
    if (!cfg || !cfg.enabled) return getStoredParties();

    const res = await sbCall(`/market_items?id=eq.${PARTY_SYSTEM_RECORD_ID}&select=*`);
    if (Array.isArray(res) && res.length > 0 && res[0].item_data && Array.isArray(res[0].item_data.parties)) {
      const clean = sanitizeParties(res[0].item_data.parties);
      localStorage.setItem(PARTY_STORAGE_KEY, JSON.stringify(clean));
      syncLocalPartyState();
      return clean;
    }
  } catch (e) {}
  return getStoredParties();
}

// Phát WebSocket broadcast dữ liệu tổ đội
function broadcastPartySync(parties) {
  if (typeof PRESENCE === "undefined" || !PRESENCE.ws || PRESENCE.ws.readyState !== WebSocket.OPEN) return;
  const msg = {
    topic: PRESENCE.channel,
    event: "broadcast",
    payload: {
      type: "broadcast",
      event: "party_sync",
      payload: {
        parties: parties,
        from: (typeof S !== "undefined" && S) ? S.name : "",
        ts: Date.now()
      }
    },
    ref: "pt_" + Date.now()
  };
  try {
    PRESENCE.ws.send(JSON.stringify(msg));
  } catch (e) {}
}

// Phát tin nhắn / thông báo mời tổ đội riêng
function sendPartyDirectEvent(toPlayerName, eventType, data = {}) {
  if (typeof PRESENCE === "undefined" || !PRESENCE.ws || PRESENCE.ws.readyState !== WebSocket.OPEN) return;
  const msg = {
    topic: PRESENCE.channel,
    event: "broadcast",
    payload: {
      type: "broadcast",
      event: "party_event",
      payload: {
        to: toPlayerName,
        from: (typeof S !== "undefined" && S) ? S.name : "",
        type: eventType,
        data: data,
        ts: Date.now()
      }
    },
    ref: "pte_" + Date.now()
  };
  try {
    PRESENCE.ws.send(JSON.stringify(msg));
  } catch (e) {}
}

// ====================================================================
// 2. ĐỒNG BỘ TRẠNG THÁI TỔ ĐỘI CỦA BẢN THÂN
// ====================================================================

function getMyParty() {
  if (typeof S === "undefined" || !S || !S.name) return null;
  const parties = getStoredParties();
  const myName = S.name.trim().toLowerCase();

  // 1. Kiểm tra theo S.partyId
  if (S.partyId) {
    const p = parties.find(x => x.id === S.partyId);
    if (p && Array.isArray(p.mem) && p.mem.some(m => m.name && m.name.toLowerCase() === myName)) {
      return p;
    }
    delete S.partyId;
    if (typeof save === "function") save();
  }

  // 2. Quét tất cả các party xem mình có trong đội nào không
  for (const p of parties) {
    if (Array.isArray(p.mem) && p.mem.some(m => m.name && m.name.toLowerCase() === myName)) {
      S.partyId = p.id;
      if (typeof save === "function") save();
      return p;
    }
  }

  return null;
}

function syncLocalPartyState() {
  const p = getMyParty();
  if (!p) {
    PT.pid = null;
    PT.leader = null;
    PT.closed = false;
    PT.mem = [];
    ptDot();
    ptRenderHud();
    return null;
  }

  PT.pid = p.id;
  PT.leader = p.leader;
  PT.closed = !!p.closed;
  const myName = S.name.trim().toLowerCase();

  // Cập nhật chỉ số của bản thân vào đội
  const myIdx = (p.mem || []).findIndex(m => m.name && m.name.toLowerCase() === myName);
  if (myIdx >= 0) {
    const curHp = typeof R !== "undefined" && R.P ? Math.max(0, Math.round(R.life)) : 100;
    const maxHp = typeof R !== "undefined" && R.P ? Math.round(R.P.life) : 100;
    const curMp = typeof R !== "undefined" && R.P ? Math.max(0, Math.round(R.mana)) : 100;
    const maxMp = typeof R !== "undefined" && R.P ? Math.round(R.P.mana) : 100;
    const mapName = (typeof R !== "undefined" && R && R.town) ? "Thành Thị" : (typeof getCurMapName === "function" ? getCurMapName() : `Vùng ${S.stage || 1}`);

    p.mem[myIdx].hp = curHp;
    p.mem[myIdx].maxHp = maxHp;
    p.mem[myIdx].mp = curMp;
    p.mem[myIdx].maxMp = maxMp;
    p.mem[myIdx].lvl = S.lvl || 1;
    p.mem[myIdx].fac = S.fac;
    p.mem[myIdx].mapName = mapName;
    p.mem[myIdx].x = typeof H !== "undefined" ? Math.round(H.x) : 0;
    p.mem[myIdx].y = typeof H !== "undefined" ? Math.round(H.y) : 0;
    p.mem[myIdx].leader = (p.leader && p.leader.toLowerCase() === myName);
  }

  PT.mem = p.mem;
  ptDot();
  ptRenderHud();
  return p;
}

// Cập nhật vị trí và thanh máu thời gian thực cho đồng đội từ Presence
function updatePartyMemberPresence(data) {
  if (!PT.pid || !data || !data.name) return;
  const member = PT.mem.find(m => m.name && m.name.toLowerCase() === data.name.toLowerCase());
  if (member) {
    if (data.hp !== undefined) member.hp = Math.round(data.hp);
    if (data.maxHp !== undefined) member.maxHp = Math.round(data.maxHp);
    if (data.mp !== undefined) member.mp = Math.round(data.mp);
    if (data.maxMp !== undefined) member.maxMp = Math.round(data.maxMp);
    if (data.zone) member.mapName = data.zone;
    if (data.x !== undefined) member.x = Math.round(data.x);
    if (data.y !== undefined) member.y = Math.round(data.y);
    ptRenderHud();
  }
}

// ====================================================================
// 3. XỬ LÝ SỰ KIỆN TỔ ĐỘI TỪ XA (REMOTE WEBSOCKET)
// ====================================================================

function handleRemotePartySync(data) {
  if (!data || !Array.isArray(data.parties)) return;
  const clean = sanitizeParties(data.parties);
  localStorage.setItem(PARTY_STORAGE_KEY, JSON.stringify(clean));
  syncLocalPartyState();

  // Nếu đang mở Modal Tổ đội thì cập nhật lại giao diện ngay
  const modalEl = document.getElementById("modal");
  if (modalEl && !modalEl.classList.contains("hidden") && document.querySelector(".party-modal-wrap")) {
    ptModal();
  }
}

function handleRemotePartyEvent(payload) {
  if (!payload || !payload.to) return;
  const myName = (typeof S !== "undefined" && S.name) ? S.name.trim().toLowerCase() : "";
  if (payload.to.trim().toLowerCase() !== myName) return;

  const type = payload.type;
  const data = payload.data || {};

  if (type === "invite") {
    // Nhận lời mời vào tổ đội
    const inviteObj = {
      id: "inv_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      pid: data.pid,
      pName: data.pName || "Tổ đội",
      fromName: payload.from || "Đại hiệp",
      fromLvl: data.fromLvl || 1,
      fromFac: data.fromFac || "",
      ts: Date.now()
    };
    PT.inv.push(inviteObj);
    ptInvShow();
    if (typeof toast === "function") {
      toast(`👥 [${inviteObj.fromName}] mời bạn gia nhập tổ đội!`);
    }
  } else if (type === "kicked") {
    toast(`⚠️ Bạn đã bị mời rời khỏi tổ đội [${data.pName || ""}]!`);
    delete S.partyId;
    if (typeof save === "function") save();
    syncLocalPartyState();
  } else if (type === "appointed") {
    toast(`👑 Bạn đã được bổ nhiệm làm Đội Trưởng tổ đội [${data.pName || ""}]!`);
    syncLocalPartyState();
  } else if (type === "disbanded") {
    toast(`👥 Tổ đội [${data.pName || ""}] đã giải tán.`);
    delete S.partyId;
    if (typeof save === "function") save();
    syncLocalPartyState();
  }
}

// ====================================================================
// 4. CÁC HÀNH ĐỘNG QUẢN LÝ TỔ ĐỘI (PARTY ACTIONS)
// ====================================================================

// Tạo tổ đội mới
function handleCreateParty() {
  if (typeof S === "undefined" || !S || !S.name) return;
  if (PT.pid) {
    toast("Bạn hiện đã ở trong tổ đội!");
    return;
  }

  const parties = getStoredParties();
  const partyId = "pt_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
  const curHp = typeof R !== "undefined" && R.P ? Math.max(0, Math.round(R.life)) : 100;
  const maxHp = typeof R !== "undefined" && R.P ? Math.round(R.P.life) : 100;
  const curMp = typeof R !== "undefined" && R.P ? Math.max(0, Math.round(R.mana)) : 100;
  const maxMp = typeof R !== "undefined" && R.P ? Math.round(R.P.mana) : 100;
  const mapName = (typeof R !== "undefined" && R && R.town) ? "Thành Thị" : (typeof getCurMapName === "function" ? getCurMapName() : `Vùng ${S.stage || 1}`);

  const newParty = {
    id: partyId,
    name: `Đội của ${S.name}`,
    leader: S.name,
    closed: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    mem: [
      {
        name: S.name,
        fac: S.fac,
        lvl: S.lvl || 1,
        hp: curHp,
        maxHp: maxHp,
        mp: curMp,
        maxMp: maxMp,
        mapName: mapName,
        x: typeof H !== "undefined" ? Math.round(H.x) : 0,
        y: typeof H !== "undefined" ? Math.round(H.y) : 0,
        leader: true,
        joinedAt: Date.now()
      }
    ]
  };

  parties.push(newParty);
  saveStoredParties(parties);

  S.partyId = partyId;
  if (typeof save === "function") save();

  toast(`Đã thành lập tổ đội! Bạn là Đội Trưởng 👑`);
  log(`👥 <b style="color:#ffd24a">[Tổ Đội]</b> Bạn đã thành lập tổ đội mới.`);

  if (typeof pushPartySystemChat === "function") {
    pushPartySystemChat(`🎉 Tổ đội [${newParty.name}] được thành lập bởi Đội Trưởng [${S.name}]!`);
  }

  if (typeof uiSfx === "function") uiSfx("learn");
  syncLocalPartyState();
  ptModal();
}

// Mời người chơi vào tổ đội theo tên
async function handleInviteMember(targetName) {
  if (!targetName) {
    targetName = prompt("Nhập chính xác tên đại hiệp muốn mời vào tổ đội:");
  }
  if (!targetName) return;
  targetName = targetName.trim();

  if (targetName.toLowerCase() === (S.name || "").toLowerCase()) {
    toast("Không thể tự mời chính mình!");
    return;
  }

  const p = getMyParty();
  if (!p) {
    // Nếu chưa có đội, tự động tạo đội rồi mời
    handleCreateParty();
    setTimeout(() => handleInviteMember(targetName), 300);
    return;
  }

  const isLeader = p.leader && p.leader.toLowerCase() === (S.name || "").toLowerCase();
  if (!isLeader) {
    toast("Chỉ Đội Trưởng mới có quyền mời thành viên!");
    return;
  }

  if ((p.mem || []).length >= PARTY_MAX) {
    toast(`Tổ đội đã đủ tối đa ${PARTY_MAX} thành viên!`);
    return;
  }

  const exists = (p.mem || []).some(m => m.name && m.name.toLowerCase() === targetName.toLowerCase());
  if (exists) {
    toast(`[${targetName}] hiện đã ở trong tổ đội này rồi!`);
    return;
  }

  // Gửi gói tin mời thời gian thực
  sendPartyDirectEvent(targetName, "invite", {
    pid: p.id,
    pName: p.name,
    fromLvl: S.lvl || 1,
    fromFac: S.fac
  });

  toast(`Đã gửi lời mời gia nhập tổ đội tới [${targetName}]!`);
  log(`👥 <b style="color:#ffd24a">[Tổ Đội]</b> Đã gửi lời mời vào đội tới đại hiệp <b>${esc(targetName)}</b>.`);
}

// Đồng ý hoặc Từ chối lời mời vào đội
function handlePartyAnswer(inviteObj, isAccept) {
  PT.inv = PT.inv.filter(x => x.id !== inviteObj.id);
  ptInvShow();

  if (!isAccept) {
    toast(`Đã từ chối lời mời của [${inviteObj.fromName}]`);
    return;
  }

  if (PT.pid) {
    toast("Bạn hiện đã ở trong một tổ đội khác, vui lòng rời đội cũ trước!");
    return;
  }

  const parties = getStoredParties();
  const p = parties.find(x => x.id === inviteObj.pid);
  if (!p) {
    toast("Tổ đội không còn tồn tại hoặc đã giải tán!");
    return;
  }

  if (p.closed) {
    toast("Tổ đội này hiện đang ở trạng thái KHÓA, không nhận thêm người!");
    return;
  }

  if ((p.mem || []).length >= PARTY_MAX) {
    toast("Tổ đội này đã đầy người!");
    return;
  }

  const curHp = typeof R !== "undefined" && R.P ? Math.max(0, Math.round(R.life)) : 100;
  const maxHp = typeof R !== "undefined" && R.P ? Math.round(R.P.life) : 100;
  const curMp = typeof R !== "undefined" && R.P ? Math.max(0, Math.round(R.mana)) : 100;
  const maxMp = typeof R !== "undefined" && R.P ? Math.round(R.P.mana) : 100;
  const mapName = (typeof R !== "undefined" && R && R.town) ? "Thành Thị" : (typeof getCurMapName === "function" ? getCurMapName() : `Vùng ${S.stage || 1}`);

  p.mem.push({
    name: S.name,
    fac: S.fac,
    lvl: S.lvl || 1,
    hp: curHp,
    maxHp: maxHp,
    mp: curMp,
    maxMp: maxMp,
    mapName: mapName,
    x: typeof H !== "undefined" ? Math.round(H.x) : 0,
    y: typeof H !== "undefined" ? Math.round(H.y) : 0,
    leader: false,
    joinedAt: Date.now()
  });

  p.updatedAt = Date.now();
  saveStoredParties(parties);

  S.partyId = p.id;
  if (typeof save === "function") save();

  toast(`Bạn đã gia nhập tổ đội [${p.name}]!`);
  log(`👥 <b style="color:#ffd24a">[Tổ Đội]</b> Bạn đã gia nhập tổ đội cùng <b>${esc(inviteObj.fromName)}</b>.`);

  if (typeof pushPartySystemChat === "function") {
    pushPartySystemChat(`🎉 Đại hiệp [${S.name}] đã gia nhập tổ đội!`);
  }

  if (typeof uiSfx === "function") uiSfx("learn");
  syncLocalPartyState();
  ptModal();
}

// Bổ nhiệm Đội Trưởng mới
function handlePartyAppoint(targetName) {
  const p = getMyParty();
  if (!p) return;
  const isLeader = p.leader && p.leader.toLowerCase() === (S.name || "").toLowerCase();
  if (!isLeader) {
    toast("Chỉ Đội Trưởng mới có quyền bổ nhiệm!");
    return;
  }

  const parties = getStoredParties();
  const curP = parties.find(x => x.id === p.id);
  if (!curP) return;

  const target = (curP.mem || []).find(m => m.name && m.name.toLowerCase() === targetName.toLowerCase());
  if (!target) {
    toast("Thành viên không còn trong tổ đội");
    return;
  }

  curP.leader = target.name;
  (curP.mem || []).forEach(m => {
    m.leader = (m.name.toLowerCase() === targetName.toLowerCase());
  });

  curP.updatedAt = Date.now();
  saveStoredParties(parties);

  sendPartyDirectEvent(target.name, "appointed", { pName: curP.name });

  toast(`Đã bổ nhiệm [${target.name}] làm Đội Trưởng mới! 👑`);
  log(`👥 <b style="color:#ffd24a">[Tổ Đội]</b> Bạn đã bổ nhiệm <b>${esc(target.name)}</b> làm Đội Trưởng.`);

  if (typeof pushPartySystemChat === "function") {
    pushPartySystemChat(`👑 [${target.name}] đã được bổ nhiệm làm Đội Trưởng mới của tổ đội!`);
  }

  if (typeof uiSfx === "function") uiSfx("levelup");
  syncLocalPartyState();
  ptModal();
}

// Trục xuất thành viên (Kick)
function handlePartyKick(targetName) {
  const p = getMyParty();
  if (!p) return;
  const isLeader = p.leader && p.leader.toLowerCase() === (S.name || "").toLowerCase();
  if (!isLeader) {
    toast("Chỉ Đội Trưởng mới có quyền trục xuất thành viên!");
    return;
  }

  if (!confirm(`Bạn có chắc muốn trục xuất đại hiệp [${targetName}] khỏi tổ đội?`)) return;

  const parties = getStoredParties();
  const curP = parties.find(x => x.id === p.id);
  if (!curP) return;

  curP.mem = (curP.mem || []).filter(m => m.name && m.name.toLowerCase() !== targetName.toLowerCase());
  curP.updatedAt = Date.now();
  saveStoredParties(parties);

  sendPartyDirectEvent(targetName, "kicked", { pName: curP.name });

  toast(`Đã mời [${targetName}] ra khỏi tổ đội`);
  log(`👥 <b style="color:#ffd24a">[Tổ Đội]</b> Đã trục xuất đại hiệp <b>${esc(targetName)}</b> khỏi đội.`);

  if (typeof pushPartySystemChat === "function") {
    pushPartySystemChat(`⚠️ Thành viên [${targetName}] đã bị trục xuất khỏi tổ đội.`);
  }

  syncLocalPartyState();
  ptModal();
}

// Khóa hoặc Mở tổ đội
function handlePartyToggleLock() {
  const p = getMyParty();
  if (!p) return;
  const isLeader = p.leader && p.leader.toLowerCase() === (S.name || "").toLowerCase();
  if (!isLeader) {
    toast("Chỉ Đội Trưởng mới có quyền khóa/mở đội!");
    return;
  }

  const parties = getStoredParties();
  const curP = parties.find(x => x.id === p.id);
  if (!curP) return;

  curP.closed = !curP.closed;
  curP.updatedAt = Date.now();
  saveStoredParties(parties);

  const statusStr = curP.closed ? "ĐÃ KHÓA (chỉ nhận qua lời mời)" : "ĐÃ MỞ (cho phép người khác xin vào)";
  toast(`Tổ đội ${statusStr}`);
  log(`👥 <b style="color:#ffd24a">[Tổ Đội]</b> Đội Trưởng đã chuyển trạng thái tổ đội thành: <b>${statusStr}</b>.`);

  syncLocalPartyState();
  ptModal();
}

// Rời tổ đội
function handlePartyLeave() {
  const p = getMyParty();
  if (!p) return;
  const myName = (S.name || "").toLowerCase();
  const isLeader = p.leader && p.leader.toLowerCase() === myName;

  if (!confirm(isLeader ? "Bạn là Đội Trưởng. Rời đội sẽ chuyển quyền Đội Trưởng cho thành viên khác (hoặc giải tán nếu chỉ còn 1 mình). Xác nhận?" : "Bạn có chắc muốn rời khỏi tổ đội?")) return;

  const parties = getStoredParties();
  const curP = parties.find(x => x.id === p.id);
  if (!curP) return;

  curP.mem = (curP.mem || []).filter(m => m.name && m.name.toLowerCase() !== myName);

  if (!curP.mem.length) {
    // Không còn ai -> Xóa đội
    const idx = parties.findIndex(x => x.id === curP.id);
    if (idx >= 0) parties.splice(idx, 1);
    saveStoredParties(parties);
  } else {
    if (isLeader) {
      curP.leader = curP.mem[0].name;
      curP.mem[0].leader = true;
      sendPartyDirectEvent(curP.leader, "appointed", { pName: curP.name });
    }
    curP.updatedAt = Date.now();
    saveStoredParties(parties);
  }

  delete S.partyId;
  if (typeof save === "function") save();

  toast("Đã rời tổ đội");
  log(`👥 <b style="color:#ffd24a">[Tổ Đội]</b> Bạn đã rời khỏi tổ đội.`);

  syncLocalPartyState();
  if (typeof closeModal === "function") closeModal(true);
}

// Giải tán tổ đội
function handlePartyDisband() {
  const p = getMyParty();
  if (!p) return;
  const isLeader = p.leader && p.leader.toLowerCase() === (S.name || "").toLowerCase();
  if (!isLeader) {
    toast("Chỉ Đội Trưởng mới có quyền giải tán tổ đội!");
    return;
  }

  if (!confirm("Bạn có chắc chắn muốn giải tán toàn bộ tổ đội?")) return;

  const parties = getStoredParties();
  const idx = parties.findIndex(x => x.id === p.id);
  if (idx >= 0) parties.splice(idx, 1);
  saveStoredParties(parties);

  // Thông báo tới các thành viên
  (p.mem || []).forEach(m => {
    if (m.name.toLowerCase() !== (S.name || "").toLowerCase()) {
      sendPartyDirectEvent(m.name, "disbanded", { pName: p.name });
    }
  });

  delete S.partyId;
  if (typeof save === "function") save();

  toast("Đã giải tán tổ đội thành công!");
  log(`👥 <b style="color:#ffd24a">[Tổ Đội]</b> Bạn đã giải tán tổ đội.`);

  syncLocalPartyState();
  if (typeof closeModal === "function") closeModal(true);
}

// ====================================================================
// 5. GIAO DIỆN TỔ ĐỘI (ptModal)
// ====================================================================

function ptModal() {
  const p = syncLocalPartyState();
  const myName = (S.name || "").toLowerCase();
  const isLeader = p && p.leader && p.leader.toLowerCase() === myName;
  const curMem = (p && p.mem) ? p.mem.length : 0;

  let contentHtml = "";

  if (!p) {
    // Chưa vào đội -> Giao diện Chưa Có Đội
    contentHtml = `
      <div class="party-modal-wrap" style="text-align:center;padding:25px 10px;">
        <div style="font-size:48px;margin-bottom:12px;">👥</div>
        <h3 style="color:#f39c12;margin-bottom:8px;">Hành Tẩu Bằng Hữu - Kề Vai Sát Cánh</h3>
        <p class="dim small" style="max-width:420px;margin:0 auto 20px;line-height:1.6;">
          Thành lập tổ đội cùng tối đa <b>4 đại hiệp</b> để chia sẻ kinh nghiệm chiến đấu, buff võ học hỗ trợ, và cùng nhau khiêu chiến phụ bản, săn trùm giang hồ!
        </p>
        <div class="btnrow" style="justify-content:center;gap:12px;">
          <button class="btn gold" id="btnPtCreate" style="padding:10px 24px;font-size:15px;font-weight:bold;">🚩 Tạo Tổ Đội Ngay</button>
          <button class="btn" id="btnPtFind" style="padding:10px 18px;">🔍 Tìm Đồng Đội</button>
        </div>
      </div>
    `;
  } else {
    // Đã có đội -> Danh sách thành viên và các chức năng Đội Trưởng
    contentHtml = `
      <div class="party-modal-wrap" style="line-height:1.5;">
        <!-- Header thông tin tổ đội -->
        <div class="party-header-bar" style="display:flex;align-items:center;justify-content:space-between;background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.3);padding:10px 14px;border-radius:6px;margin-bottom:14px;">
          <div>
            <div style="font-size:16px;font-weight:bold;color:#ffd24a;display:flex;align-items:center;gap:6px;">
              <span>👑 ${esc(p.name)}</span>
              <span style="font-size:12px;background:#333;color:#bbb;padding:2px 8px;border-radius:10px;font-weight:normal;">${curMem}/${PARTY_MAX} Thành viên</span>
              <span style="font-size:12px;background:${p.closed ? '#c0392b' : '#27ae60'};color:#fff;padding:2px 8px;border-radius:10px;">${p.closed ? '🔒 Đã Khóa' : '🔓 Đang Mở'}</span>
            </div>
            <div class="small dim" style="margin-top:2px;">Đội Trưởng: <b style="color:#fff;">${esc(p.leader)}</b></div>
          </div>
          <div style="display:flex;gap:6px;">
            ${isLeader ? `
              <button class="btn sm ${p.closed ? 'gold' : ''}" id="btnPtToggleLock" title="Khóa/Mở đội">${p.closed ? '🔓 Mở Đội' : '🔒 Khóa Đội'}</button>
              <button class="btn sm gold" id="btnPtInviteName">+ Mời Bạn</button>
            ` : ''}
          </div>
        </div>

        <!-- Danh sách thành viên -->
        <div class="party-members-list" style="display:flex;flex-direction:column;gap:8px;max-height:55vh;overflow-y:auto;padding-right:4px;">
          ${(p.mem || []).map((m, idx) => {
            const isMe = m.name.toLowerCase() === myName;
            const isThisLeader = m.leader || (p.leader && p.leader.toLowerCase() === m.name.toLowerCase());
            const facObj = typeof FAC !== "undefined" ? FAC[m.fac] : null;
            const facName = facObj ? facObj.n : (m.fac || "Vô Môn");
            const seriesCol = (facObj && typeof SERIES_COL !== "undefined") ? SERIES_COL[facObj.series] : "#aaa";
            
            const hpPct = Math.max(0, Math.min(100, Math.round(((m.hp || 1) / Math.max(1, m.maxHp || 1)) * 100)));
            const mpPct = Math.max(0, Math.min(100, Math.round(((m.mp || 1) / Math.max(1, m.maxMp || 1)) * 100)));

            return `
              <div class="party-mem-card" style="display:flex;align-items:center;background:rgba(255,255,255,0.03);border:1px solid ${isMe ? 'rgba(46,204,113,0.4)' : 'rgba(255,255,255,0.08)'};border-radius:6px;padding:8px 12px;gap:12px;">
                <!-- Avatar & Chức vụ -->
                <div style="position:relative;width:42px;height:42px;background:#1a1a1a;border-radius:6px;display:flex;align-items:center;justify-content:center;border:1px solid #444;font-size:20px;flex-shrink:0;">
                  <span>${isThisLeader ? '👑' : '👤'}</span>
                  <div style="position:absolute;bottom:-4px;right:-4px;background:#222;border:1px solid #555;border-radius:4px;font-size:10px;padding:1px 3px;color:#ffd24a;font-weight:bold;">${m.lvl || 1}</div>
                </div>

                <!-- Thông tin & Cột Máu/Mana -->
                <div style="flex:1;min-width:0;">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
                    <div>
                      <b style="color:${isMe ? '#2ecc71' : (isThisLeader ? '#ffd24a' : '#fff')};font-size:14px;">${esc(m.name)} ${isMe ? '(Bạn)' : ''}</b>
                      <span class="small" style="color:${seriesCol};margin-left:6px;">[${esc(facName)}]</span>
                    </div>
                    <div class="small dim" style="font-size:11px;">📍 ${esc(m.mapName || 'Giang Hồ')}</div>
                  </div>

                  <!-- Thanh Máu -->
                  <div style="background:#333;height:8px;border-radius:4px;overflow:hidden;margin-bottom:2px;position:relative;">
                    <div style="background:linear-gradient(90deg,#e74c3c,#c0392b);height:100%;width:${hpPct}%;transition:width 0.3s;"></div>
                  </div>
                  <!-- Thanh Nội Lực -->
                  <div style="background:#333;height:5px;border-radius:3px;overflow:hidden;position:relative;">
                    <div style="background:linear-gradient(90deg,#3498db,#2980b9);height:100%;width:${mpPct}%;transition:width 0.3s;"></div>
                  </div>
                </div>

                <!-- Thao tác của Đội Trưởng -->
                <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
                  ${isLeader && !isMe ? `
                    <button class="btn sm gold" data-pt-appoint="${esc(m.name)}" title="Bổ nhiệm làm Đội Trưởng mới" style="padding:2px 8px;font-size:11px;">👑 Chuyển Trưởng</button>
                    <button class="btn sm red" data-pt-kick="${esc(m.name)}" title="Trục xuất khỏi tổ đội" style="padding:2px 8px;font-size:11px;">✕ Kick</button>
                  ` : ''}
                </div>
              </div>
            `;
          }).join("")}
        </div>

        <!-- Footer thao tác -->
        <div class="btnrow" style="margin-top:14px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.1);justify-content:space-between;">
          <div>
            ${isLeader ? `
              <button class="btn red sm" id="btnPtDisband" style="font-weight:bold;">⚠️ Giải Tán Đội</button>
            ` : `
              <button class="btn red sm" id="btnPtLeave">🚪 Rời Khỏi Đội</button>
            `}
          </div>
          <button class="btn" id="btnPtClose">Đóng</button>
        </div>
      </div>
    `;
  }

  modal(contentHtml, () => {
    // Sự kiện khi chưa có đội
    const bCreate = $("#btnPtCreate");
    if (bCreate) bCreate.onclick = handleCreateParty;

    const bFind = $("#btnPtFind");
    if (bFind) {
      bFind.onclick = () => {
        closeModal();
        if (typeof chatToggle === "function") {
          chatToggle(true);
          if (typeof chatChan === "function") chatChan("w");
        }
        toast("💡 Bạn có thể bấm vào tên đại hiệp trên Chat Thế Giới hoặc người lân cận để Mời vào đội!");
      };
    }

    // Sự kiện khi đã có đội
    const bLock = $("#btnPtToggleLock");
    if (bLock) bLock.onclick = handlePartyToggleLock;

    const bInv = $("#btnPtInviteName");
    if (bInv) bInv.onclick = () => handleInviteMember();

    const bDisband = $("#btnPtDisband");
    if (bDisband) bDisband.onclick = handlePartyDisband;

    const bLeave = $("#btnPtLeave");
    if (bLeave) bLeave.onclick = handlePartyLeave;

    const bClose = $("#btnPtClose");
    if (bClose) bClose.onclick = () => closeModal(true);

    // Bổ nhiệm đội trưởng
    document.querySelectorAll("[data-pt-appoint]").forEach(btn => {
      btn.onclick = () => handlePartyAppoint(btn.dataset.ptAppoint);
    });

    // Trục xuất
    document.querySelectorAll("[data-pt-kick]").forEach(btn => {
      btn.onclick = () => handlePartyKick(btn.dataset.ptKick);
    });
  });
}

// ====================================================================
// 6. KHUNG HIỂN THỊ TỔ ĐỘI BÊN GÓC MÀN HÌNH (HUD PARTY BOX)
// ====================================================================

function ptRenderHud() {
  let box = document.getElementById("ptBox");
  if (!PT.pid || !PT.mem || !PT.mem.length) {
    if (box) box.remove();
    return;
  }

  if (!box) {
    box = document.createElement("div");
    box.id = "ptBox";
    document.body.appendChild(box);
    box.onclick = (e) => {
      if (e.target.closest(".ptsh")) {
        S.ptHide = !S.ptHide;
        ptRenderHud();
        return;
      }
      ptModal();
    };
  }

  const isHidden = !!S.ptHide;
  const myName = (typeof S !== "undefined" && S.name) ? S.name.toLowerCase() : "";

  let html = `
    <div class="pth" style="cursor:pointer;" title="Bấm để mở Quản lý Tổ đội">
      <button class="ptsh ${isHidden ? 'off' : ''}" title="${isHidden ? 'Hiện' : 'Ẩn'} khung tổ đội"></button>
      <span>Tổ đội ${PT.mem.length}/${PARTY_MAX} ${PT.closed ? '🔒' : ''}</span>
    </div>
  `;

  if (!isHidden) {
    html += PT.mem.map(m => {
      const isMe = m.name.toLowerCase() === myName;
      const hpPct = Math.max(0, Math.min(100, Math.round(((m.hp || 1) / Math.max(1, m.maxHp || 1)) * 100)));
      const isThisLeader = m.leader || (PT.leader && PT.leader.toLowerCase() === m.name.toLowerCase());
      return `
        <div class="ptf ${isMe ? 'me' : ''}" data-ptn="${esc(m.name)}" title="${esc(m.name)} · Cấp ${m.lvl || 1}" style="cursor:pointer;">
          ${isThisLeader ? '<i class="fl" style="color:#ffd24a;">👑</i>' : '<i class="fi">👤</i>'}
          <span class="nm">${esc(m.name)}</span>
          <small class="lv">Lv.${m.lvl || 1}</small>
          <em class="lf"><u style="width:${hpPct}%"></u></em>
        </div>
      `;
    }).join("");
  }

  box.innerHTML = html;
}

// ====================================================================
// 7. LỜI MỜI GIA NHẬP TỔ ĐỘI NỔI TRÊN MÀN HÌNH (POPUP INVITE)
// ====================================================================

function ptInvShow() {
  ptDot();
  let box = document.getElementById("ptInv");
  const now = Date.now();
  PT.inv = (PT.inv || []).filter(i => now - (i.ts || 0) < 60000); // 60s hết hạn

  const curInv = PT.inv[0];
  if (!curInv) {
    if (box) box.remove();
    return;
  }

  if (!box) {
    box = document.createElement("div");
    box.id = "ptInv";
    document.body.appendChild(box);
  }

  box.innerHTML = `
    <div style="margin-bottom:6px;">
      👥 <b>${esc(curInv.fromName)}</b> (Lv.${curInv.fromLvl}) mời bạn vào tổ đội <b>[${esc(curInv.pName)}]</b>!
    </div>
    <div class="btnrow" style="gap:8px;">
      <button class="btn sm gold" id="btnPtAcceptInv">✓ Đồng ý</button>
      <button class="btn sm red" id="btnPtRejectInv">✕ Từ chối</button>
    </div>
  `;

  const bY = document.getElementById("btnPtAcceptInv");
  if (bY) bY.onclick = () => handlePartyAnswer(curInv, true);

  const bN = document.getElementById("btnPtRejectInv");
  if (bN) bN.onclick = () => handlePartyAnswer(curInv, false);

  if (typeof uiSfx === "function") {
    try { uiSfx("learn"); } catch (e) {}
  }
}

// Cập nhật chấm đỏ thông báo trên nút Tổ đội
function ptDot() {
  const invCount = (PT.inv || []).length;
  const ptBtn = document.getElementById("ptBtn");
  if (ptBtn) {
    ptBtn.classList.toggle("on", invCount > 0);
    ptBtn.classList.toggle("in", !!PT.pid);
  }

  const menuTeam = document.querySelector('#u20menu [data-u="team"]');
  if (menuTeam) {
    const dot = menuTeam.querySelector(".dot");
    if (dot) dot.classList.toggle("on", invCount > 0);
    menuTeam.classList.toggle("pt", !!PT.pid);
    menuTeam.title = PT.pid ? `Tổ đội (${PT.mem.length}/${PARTY_MAX})` : "Tổ đội";
  }
}

function ptBtnInit() {
  const giftBtn = document.getElementById("giftBtn");
  if (!giftBtn || document.getElementById("ptBtn")) return;
  const btn = document.createElement("button");
  btn.id = "ptBtn";
  btn.title = "Tổ đội (P)";
  btn.textContent = "👥";
  giftBtn.parentNode.insertBefore(btn, giftBtn);
  btn.onclick = () => {
    if (typeof uiSfx === "function") uiSfx("click");
    ptModal();
  };
  ptDot();
}

// ====================================================================
// 8. CHAT TỔ ĐỘI (KÊNH T.Đ REALTIME)
// ====================================================================

const PARTY_CHAT_STORAGE_KEY = "jx_party_chat_msgs";

function getStoredPartyChat() {
  try {
    const raw = localStorage.getItem(PARTY_CHAT_STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr;
    }
  } catch (e) {}
  return [];
}

function saveStoredPartyChat(msgs) {
  try {
    localStorage.setItem(PARTY_CHAT_STORAGE_KEY, JSON.stringify((msgs || []).slice(-80)));
  } catch (e) {}
}

const PTC = {
  msgs: getStoredPartyChat(),
  unread: 0
};

// Định dạng tin nhắn tổ đội tương thích với chatLine và khung chat
function ptcView(m) {
  if (!m) return { sys: true, msg: "" };
  if (m.sys) return m;
  const myName = (typeof S !== "undefined" && S.name) ? S.name.trim().toLowerCase() : "";
  const isMe = (m.name && m.name.trim().toLowerCase() === myName);
  return {
    id: m.id || ("ptc_" + Date.now()),
    cid: isMe ? (typeof chatCid === "function" ? chatCid() : "me") : ("pt_" + (m.name || "")),
    name: m.name || "Đồng đội",
    fac: m.fac || "",
    lvl: m.lvl || 1,
    msg: m.msg || "",
    item: m.item || null,
    ts: m.ts || Date.now(),
    sys: !!m.sys
  };
}

function pushPartySystemChat(text) {
  if (!text) return;
  const msgObj = {
    id: "sys_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    sys: true,
    msg: text,
    ts: Date.now()
  };
  PTC.msgs.push(msgObj);
  if (PTC.msgs.length > 80) PTC.msgs.shift();
  saveStoredPartyChat(PTC.msgs);
  if (typeof chatRender === "function") chatRender();
  if (typeof u20LogDraw === "function") u20LogDraw();
}

function sendPartyChat(text) {
  if (!PT.pid) {
    if (typeof toast === "function") toast("Bạn chưa có tổ đội! Hãy tạo đội hoặc gia nhập trước.");
    return false;
  }
  if (!text || !text.trim()) return false;
  text = text.trim();

  const now = Date.now();
  const myName = (typeof S !== "undefined" && S.name) ? S.name : "Đại hiệp";
  const myFac = (typeof S !== "undefined" && S.fac && typeof FAC !== "undefined" && FAC[S.fac]) ? FAC[S.fac].n : "";
  const myLvl = (typeof S !== "undefined" && S.lvl) ? S.lvl : 1;

  // Hiển thị bóng chat trên đầu nhân vật chính
  if (typeof H !== "undefined" && H) {
    H.localChat = { text: text, until: now + 5000 };
  }

  const msgObj = {
    id: "ptc_" + now + "_" + Math.floor(Math.random() * 1000),
    pid: PT.pid,
    name: myName,
    fac: myFac,
    lvl: myLvl,
    msg: text,
    ts: now
  };

  PTC.msgs.push(msgObj);
  if (PTC.msgs.length > 80) PTC.msgs.shift();
  saveStoredPartyChat(PTC.msgs);

  if (typeof chatRender === "function") chatRender();
  if (typeof u20LogDraw === "function") u20LogDraw();

  // Phát gói tin chat tổ đội qua WebSocket Realtime
  if (typeof PRESENCE !== "undefined" && PRESENCE.ws && PRESENCE.ws.readyState === WebSocket.OPEN) {
    const msg = {
      topic: PRESENCE.channel,
      event: "broadcast",
      payload: {
        type: "broadcast",
        event: "party_chat",
        payload: msgObj
      },
      ref: "ptc_" + now
    };
    try {
      PRESENCE.ws.send(JSON.stringify(msg));
    } catch (e) {
      console.warn("[PartyChat] Lỗi gửi websocket:", e);
    }
  }

  return true;
}

function handleRemotePartyChat(data) {
  if (!data || !data.pid || !data.msg) return;
  // Chỉ nhận tin nếu cùng tổ đội
  if (!PT.pid || data.pid !== PT.pid) return;

  const myName = (typeof S !== "undefined" && S.name) ? S.name.trim().toLowerCase() : "";
  if (data.name && data.name.trim().toLowerCase() === myName) return; // Bỏ qua tin chính mình đã thêm local

  // Nếu đồng đội đang ở cùng màn hình, hiển thị bóng chat trên đầu nhân vật đó
  if (typeof R !== "undefined" && R.otherPlayers) {
    const sender = Object.values(R.otherPlayers).find(p => p.name && p.name.trim().toLowerCase() === data.name.trim().toLowerCase());
    if (sender) {
      sender.localChat = { text: data.msg, until: Date.now() + 5000 };
    }
  }

  PTC.msgs.push(data);
  if (PTC.msgs.length > 80) PTC.msgs.shift();
  saveStoredPartyChat(PTC.msgs);

  if (typeof CHAT !== "undefined" && CHAT.chan !== "p") {
    PTC.unread = (PTC.unread || 0) + 1;
  }

  if (typeof chatRender === "function") chatRender();
  if (typeof u20LogDraw === "function") u20LogDraw();
  ptDot();
}

// ====================================================================
// 9. PHÚC LỢI & HÀO QUANG ĐỒNG ĐỘI (GIAI ĐOẠN 2)
// ====================================================================

// Bonus EXP theo số thành viên cùng bãi luyện công: 2 người +20%, 3 người +40%, 4 người +50%
const PARTY_EXP_BONUS = [0, 0, 0.2, 0.4, 0.5];

// Hào quang môn phái chia sẻ cho cả đội (mỗi môn phái chỉ tính 1 lần, không cộng dồn)
const PARTY_AURAS = {
  shaolin: { name: "La Hán Trận · Kim Cang Bất Hoại", attrs: { meleedamagereturn_p: 6, adddefense_v: 30 } },
  emei: { name: "Lưu Thủy · Phật Quang Phổ Chiếu · Mộng Điệp", attrs: { lifereplenish_v: 8, manareplenish_v: 4 } },
  wudang: { name: "Tọa Vọng Vô Vi · Thái Cực Thần Công", attrs: { manashield_p: 10, lifemax_p: 5 } },
  kunlun: { name: "Sương Ngạo Côn Lôn", attrs: { fastwalkrun_p: 10, defense_v: 40 } },
  cuiyan: { name: "Băng Tâm Trái Ảnh", attrs: { coldres_p: 15 } }
};

// Đồng đội đang cùng bãi luyện công (cùng bản đồ, không tính ở thành thị)
function partyMates() {
  if (typeof PT === "undefined" || !PT.pid || !Array.isArray(PT.mem) || typeof S === "undefined" || !S || !S.name) return [];
  if (typeof R !== "undefined" && R && R.town) return [];
  const myName = S.name.trim().toLowerCase();
  const me = PT.mem.find(m => m.name && m.name.trim().toLowerCase() === myName);
  const myMap = me ? me.mapName : null;
  if (!myMap) return [];
  return PT.mem.filter(m => m.name && m.name.trim().toLowerCase() !== myName && m.mapName === myMap);
}

function partyExpBonus() {
  const n = Math.min(PARTY_MAX, partyMates().length + 1);
  return PARTY_EXP_BONUS[n] || 0;
}

// Cộng thuộc tính hào quang đồng đội vào calc() (được gọi từ stats.js)
function partyAuraAttr(t) {
  const seen = {};
  for (const m of partyMates()) {
    const a = PARTY_AURAS[m.fac];
    if (!a || seen[m.fac]) continue;
    seen[m.fac] = true;
    const k = Math.max(0.3, Math.min(1.5, (m.lvl || 1) / 80));
    for (const key in a.attrs) addAttr(t, key, [a.attrs[key] * k, 0, 0]);
  }
}

function partyAuraKey() {
  return partyMates().map(m => m.name + ":" + m.fac + ":" + Math.floor((m.lvl || 1) / 10)).sort().join("|");
}

// Khi thành phần đội đổi (vào/ra/đổi map) thì tính lại chỉ số
let _partyAuraKeyLast = "";
function partyAuraRefresh() {
  const key = partyAuraKey();
  if (key === _partyAuraKeyLast) return;
  _partyAuraKeyLast = key;
  if (typeof R !== "undefined" && R) R.dirty = true;
  if (key && typeof pushPartySystemChat === "function") {
    const facs = [...new Set(partyMates().map(m => m.fac).filter(f => PARTY_AURAS[f]))];
    if (facs.length) pushPartySystemChat("✨ Hào quang đồng đội: " + facs.map(f => PARTY_AURAS[f].name).join(" | "));
  }
}

// Khởi tạo vòng lặp kiểm tra và đồng bộ
setInterval(() => {
  ptBtnInit();
  ptDot();
  if (PT.pid) {
    syncLocalPartyState();
  }
  partyAuraRefresh();
}, 3000);

// Đồng bộ Cloud mỗi 30 giây
setInterval(() => {
  if (typeof fetchPartiesFromCloud === "function") {
    fetchPartiesFromCloud();
  }
}, 30000);
