/**
 * BANG HỘI - GUILD SYSTEM (GIAI ĐOẠN 1)
 * Võ Lâm Truyền Kỳ / Võ Lâm Idle
 * 
 * Quy tắc:
 * - Lập Bang: Đạt cấp 60 trở lên, sở hữu Nhạc Vương Kiếm (bán tại Kỳ Trân Các giá 100 Vạn).
 * - Gia nhập Bang: Đạt cấp 40 trở lên, chưa gia nhập bang khác.
 * - Quy mô Bang: Khởi đầu tối đa 30 thành viên, nâng cấp Bang tối đa lên 100 thành viên (mỗi cấp +10 thành viên).
 */

"use strict";

const GUILD_CFG = {
  MIN_LV_JOIN: 40,
  MIN_LV_CREATE: 60,
  ITEM_CREATE: "nvk",
  BASE_CAPACITY: 30,
  MAX_CAPACITY: 100,
  LEVEL_STEP_CAPACITY: 10,
  UPGRADE_COSTS: {
    2: { fund: 10000000, desc: "1000 Vạn" },
    3: { fund: 20000000, desc: "2000 Vạn" },
    4: { fund: 30000000, desc: "3000 Vạn" },
    5: { fund: 40000000, desc: "4000 Vạn" },
    6: { fund: 50000000, desc: "5000 Vạn" },
    7: { fund: 60000000, desc: "6000 Vạn" },
    8: { fund: 70000000, desc: "7000 Vạn" }
  },
  ROLES: {
    leader: { title: "Bang Chủ", icon: "⭐", max: 1 },
    vice: { title: "Phó Bang Chủ", icon: "🎖️", max: 2 },
    elder: { title: "Trưởng Lão", icon: "📜", max: 4 },
    hall: { title: "Đường Chủ", icon: "⚔️", max: 8 },
    elite: { title: "Tinh Anh", icon: "🛡️", max: 16 },
    member: { title: "Bang Chúng", icon: "👤", max: 999 }
  },
  // KỸ NĂNG BANG HỘI (BUFF CHỈ SỐ)
  SKILLS: {
    g_hp: {
      id: "g_hp",
      name: "Cường Thân Thuật",
      icon: "❤️",
      desc: "Gia tăng Sinh lực tối đa cho toàn thể bang chúng.",
      attr: "lifemax_p",
      unit: "%",
      perLevel: 2, // Mỗi cấp +2% Sinh lực
      maxLevel: 10,
      costPerLevel: 3000000 // 300 Vạn quỹ bang mỗi cấp
    },
    g_mp: {
      id: "g_mp",
      name: "Tĩnh Tâm Quyết",
      icon: "💙",
      desc: "Gia tăng Nội lực tối đa cho toàn thể bang chúng.",
      attr: "manamax_p",
      unit: "%",
      perLevel: 2, // Mỗi cấp +2% Nội lực
      maxLevel: 10,
      costPerLevel: 2000000 // 200 Vạn quỹ bang mỗi cấp
    },
    g_dmg: {
      id: "g_dmg",
      name: "Phá Quân Kích",
      icon: "⚔️",
      desc: "Gia tăng Sát thương vật lý ngoại công.",
      attr: "addphysicsdamage_p",
      unit: "%",
      perLevel: 3, // Mỗi cấp +3% Sát thương vật lý
      maxLevel: 10,
      costPerLevel: 5000000 // 500 Vạn quỹ bang mỗi cấp
    },
    g_def: {
      id: "g_def",
      name: "Kim Chung Tráo",
      icon: "🛡️",
      desc: "Gia tăng Hộ giáp và Khả năng phòng thủ.",
      attr: "armordefenseenhance_p",
      unit: "%",
      perLevel: 3, // Mỗi cấp +3% Phòng thủ
      maxLevel: 10,
      costPerLevel: 4000000 // 400 Vạn quỹ bang mỗi cấp
    },
    g_res: {
      id: "g_res",
      name: "Khí Hộ Thể",
      icon: "🌀",
      desc: "Gia tăng Kháng tất cả các hệ ngũ hành.",
      attr: "allres_p",
      unit: "%",
      perLevel: 1, // Mỗi cấp +1% Kháng tất cả
      maxLevel: 10,
      costPerLevel: 6000000 // 600 Vạn quỹ bang mỗi cấp
    },
    g_speed: {
      id: "g_speed",
      name: "Thần Hành Bách Biến",
      icon: "⚡",
      desc: "Gia tăng Tốc độ di chuyển khi hành tẩu giang hồ.",
      attr: "fastwalkrun_p",
      unit: "%",
      perLevel: 2, // Mỗi cấp +2% Tốc chạy
      maxLevel: 10,
      costPerLevel: 3500000 // 350 Vạn quỹ bang mỗi cấp
    }
  }
};

const GUILD_STORAGE_KEY = "jxidle_guilds_data";
const GUILD_SYSTEM_RECORD_ID = "a0000000-0000-0000-0000-000000000001";
let _lastGuildCloudFetch = 0;

function sanitizeGuilds(guilds) {
  if (!Array.isArray(guilds)) return [];
  guilds.forEach(g => {
    if (!g || !Array.isArray(g.members)) return;
    const map = new Map();
    g.members.forEach(m => {
      if (!m || !m.name) return;
      const key = String(m.name).trim().toLowerCase();
      // Nếu đã có, giữ lại bản ghi có cấp độ hoặc cống hiến cao hơn / mới hơn
      if (!map.has(key)) {
        map.set(key, m);
      } else {
        const exist = map.get(key);
        const bestLvl = Math.max(exist.lvl || 1, m.lvl || 1);
        const bestDonate = Math.max(exist.donate || 0, m.donate || 0);
        let bestRole = "member";
        if (exist.role === "leader" || m.role === "leader") {
          bestRole = "leader";
        } else if (exist.role && exist.role !== "member") {
          bestRole = exist.role;
        } else if (m.role && m.role !== "member") {
          bestRole = m.role;
        }
        map.set(key, Object.assign({}, exist, m, {
          lvl: bestLvl,
          donate: bestDonate,
          role: bestRole
        }));
      }
    });

    // Cập nhật lại cấp và phái của chính người chơi hiện tại nếu đang trong bang
    if (typeof S !== "undefined" && S && S.name) {
      const myKey = String(S.name).trim().toLowerCase();
      if (map.has(myKey)) {
        const myM = map.get(myKey);
        myM.lvl = S.lvl || myM.lvl || 1;
        if (S.fac) myM.fac = S.fac;
      }
    }

    g.members = Array.from(map.values());
    if (!g.skills || typeof g.skills !== "object") g.skills = {};
  });
  return guilds;
}

function getStoredGuilds() {
  try {
    const raw = localStorage.getItem(GUILD_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return sanitizeGuilds(parsed);
    }
  } catch (e) {
    console.error("Guild load error:", e);
  }
  // Mẫu ban đầu chuẩn server
  const initialGuilds = [
    {
      id: "g_hungba",
      name: "Hùng Bá",
      leader: "testbe",
      leaderFac: "tianwang",
      level: 2,
      notice: "Chào mừng các hào kiệt tề tựu tại Hùng Bá!",
      fund: 6500000,
      createdAt: Date.now() - 86400000,
      skills: { g_hp: 2, g_dmg: 1 },
      members: [
        { name: "testbe", fac: "tianwang", lvl: 105, role: "leader", joinedAt: Date.now() - 86400000, donate: 16500000 }
      ]
    }
  ];
  saveStoredGuilds(initialGuilds, false);
  return initialGuilds;
}

function saveStoredGuilds(guilds, shouldBroadcast = true) {
  try {
    localStorage.setItem(GUILD_STORAGE_KEY, JSON.stringify(guilds));
  } catch (e) {
    console.error("Guild save error:", e);
  }

  // 1. Đồng bộ lên Cloud Supabase (hàng system chuyên dụng)
  syncGuildsToCloud(guilds);

  // 2. Phát broadcast WebSocket tới tất cả người chơi khác đang online
  if (shouldBroadcast && typeof broadcastGuildUpdate === "function") {
    broadcastGuildUpdate(guilds);
  }
}

// Đồng bộ danh sách Bang Hội lên Supabase
async function syncGuildsToCloud(guilds) {
  if (typeof sbCall !== "function") return;
  try {
    const cfg = typeof getSupabaseConfig === "function" ? getSupabaseConfig() : null;
    if (!cfg || !cfg.enabled) return;

    await sbCall("/market_items", {
      method: "POST",
      headers: {
        "Prefer": "resolution=merge-duplicates,return=representation"
      },
      body: {
        id: GUILD_SYSTEM_RECORD_ID,
        seller_id: "__SYSTEM_GUILDS__",
        seller_name: "Hệ Thống Bang Hội",
        item_data: { guilds: guilds, updated_at: Date.now() },
        item_name: "Dữ Liệu Bang Hội Toàn Server",
        item_type: 99,
        item_level: 1,
        price_type: "gold",
        price: 0,
        status: "system"
      }
    });
  } catch (e) {
    console.warn("[Guild] Lỗi đồng bộ Cloud:", e);
  }
}

// Kéo danh sách Bang Hội mới nhất từ Cloud Supabase về
async function fetchGuildsFromCloud(force = false) {
  const now = Date.now();
  if (!force && now - _lastGuildCloudFetch < 4000) return getStoredGuilds();
  _lastGuildCloudFetch = now;

  if (typeof sbCall !== "function") return getStoredGuilds();
  try {
    const cfg = typeof getSupabaseConfig === "function" ? getSupabaseConfig() : null;
    if (!cfg || !cfg.enabled) return getStoredGuilds();

    const res = await sbCall(`/market_items?id=eq.${GUILD_SYSTEM_RECORD_ID}&select=*`);
    if (Array.isArray(res) && res.length > 0 && res[0].item_data && Array.isArray(res[0].item_data.guilds)) {
      const cloudGuilds = res[0].item_data.guilds;
      if (cloudGuilds.length > 0) {
        const cleanCloudGuilds = sanitizeGuilds(cloudGuilds);
        localStorage.setItem(GUILD_STORAGE_KEY, JSON.stringify(cleanCloudGuilds));
        return cleanCloudGuilds;
      }
    }
  } catch (e) {
    console.warn("[Guild] Lỗi fetch Cloud:", e);
  }
  return getStoredGuilds();
}

// Phát WebSocket broadcast tới các máy khác
function broadcastGuildUpdate(guilds) {
  if (typeof PRESENCE === "undefined" || !PRESENCE.ws || PRESENCE.ws.readyState !== WebSocket.OPEN) return;
  const msg = {
    topic: PRESENCE.channel,
    event: "broadcast",
    payload: {
      type: "broadcast",
      event: "guild_sync",
      payload: {
        guilds: guilds,
        from: (typeof S !== "undefined" && S) ? S.name : "",
        ts: Date.now()
      }
    },
    ref: "g_" + Date.now()
  };
  try {
    PRESENCE.ws.send(JSON.stringify(msg));
  } catch (e) {}
}

// Nhận broadcast từ người chơi khác
function handleRemoteGuildSync(data) {
  if (!data || !Array.isArray(data.guilds)) return;
  console.log("[Guild] Nhận cập nhật Bang Hội thời gian thực từ:", data.from);
  const cleanGuilds = sanitizeGuilds(data.guilds);
  localStorage.setItem(GUILD_STORAGE_KEY, JSON.stringify(cleanGuilds));
  
  // Tính toán lại chỉ số nhân vật (nếu kỹ năng bang hội vừa được thăng cấp)
  if (typeof R !== "undefined" && R) R.dirty = true;
  if (typeof recalc === "function") recalc();
  if (typeof refresh === "function") refresh();

  // Nếu đang mở Modal Bang Hội thì cập nhật lại giao diện ngay
  const myG = getMyGuild();
  const modalEl = document.getElementById("modal");
  if (modalEl && !modalEl.classList.contains("hidden") && document.querySelector(".guild-modal-wrap")) {
    const curActiveTab = document.querySelector(".guild-tab-btn.active");
    const activeTabKey = curActiveTab && curActiveTab.id === "gtabMSkills" ? "skills" : curActiveTab && curActiveTab.id === "gtabMManage" ? "manage" : "main";
    if (myG) {
      renderMyGuildModal(myG, activeTabKey);
    } else {
      renderGuildHallModal("list");
    }
  }
}

function getMyGuild() {
  if (!S || !S.guildId) return null;
  const guilds = getStoredGuilds();
  let g = guilds.find(x => x.id === S.guildId);
  if (!g) {
    // Tìm thử theo tên nếu ID bị lệch
    if (S.guildName) {
      g = guilds.find(x => x.name === S.guildName);
      if (g) {
        S.guildId = g.id;
        save();
        return g;
      }
    }
    // Có thể bang đã bị giải tán
    delete S.guildId;
    delete S.guildName;
    delete S.guildRole;
    save();
    return null;
  }
  // Đồng bộ lại tên bang và chức vụ trong S
  if (g.name && S.guildName !== g.name) S.guildName = g.name;
  const myMem = (g.members || []).find(m => m.name === S.name);
  if (myMem) {
    S.guildRole = myMem.role;
  } else if (g.leader === S.name) {
    S.guildRole = "leader";
  }
  return g;
}

function getGuildMaxMembers(level) {
  const cap = GUILD_CFG.BASE_CAPACITY + ((level || 1) - 1) * GUILD_CFG.LEVEL_STEP_CAPACITY;
  return Math.min(cap, GUILD_CFG.MAX_CAPACITY);
}

/**
 * Hiển thị Modal Bang Hội
 */
function openGuildModal(tab = "main") {
  if (!S || !S.fac) {
    toast("Hãy tạo nhân vật và gia nhập môn phái trước");
    return;
  }

  // Tải ngầm phiên bản mới nhất từ Cloud nếu có kết nối
  if (typeof fetchGuildsFromCloud === "function") {
    fetchGuildsFromCloud().then(latestGuilds => {
      const modalEl = document.getElementById("modal");
      if (modalEl && !modalEl.classList.contains("hidden") && document.querySelector(".guild-modal-wrap")) {
        const curMyG = getMyGuild();
        if (curMyG) renderMyGuildModal(curMyG, tab);
        else renderGuildHallModal(tab);
      }
    });
  }

  const myGuild = getMyGuild();

  if (myGuild) {
    renderMyGuildModal(myGuild, tab);
  } else {
    renderGuildHallModal(tab);
  }
}

/**
 * UI Khi chưa vào Bang (Danh sách Bang & Lập Bang)
 */
function renderGuildHallModal(activeTab) {
  const guilds = getStoredGuilds();
  const nvkCount = typeof matHave === "function" ? matHave("misc", "nvk") : 0;
  const canCreate = (S.lvl || 1) >= GUILD_CFG.MIN_LV_CREATE && nvkCount > 0;
  const canJoin = (S.lvl || 1) >= GUILD_CFG.MIN_LV_JOIN;

  const html = `
    <div class="guild-modal-wrap">
      <div class="guild-header">
        <h3>🏰 Bang Hội Võ Lâm</h3>
        <p class="guild-sub">Kết giao bằng hữu, định quốc an bang, tranh đoạt thiên hạ!</p>
      </div>

      <div class="guild-tabs">
        <button class="guild-tab-btn ${activeTab === 'list' || !activeTab || activeTab === 'main' ? 'active' : ''}" id="gtabList">📜 Danh Sách Bang</button>
        <button class="guild-tab-btn ${activeTab === 'create' ? 'active' : ''}" id="gtabCreate">🚩 Sáng Lập Bang</button>
      </div>

      <div class="guild-content">
        ${activeTab === 'create' ? renderCreateGuildTab(nvkCount, canCreate) : renderGuildListTab(guilds, canJoin)}
      </div>
    </div>
  `;

  modal(html, () => {
    const bList = $("#gtabList");
    const bCreate = $("#gtabCreate");
    if (bList) bList.onclick = () => renderGuildHallModal("list");
    if (bCreate) bCreate.onclick = () => renderGuildHallModal("create");

    // Xử lý tạo bang
    const btnDoCreate = $("#btnDoCreateGuild");
    if (btnDoCreate) {
      btnDoCreate.onclick = handleCreateGuild;
    }

    // Xử lý xin vào bang
    document.querySelectorAll("[data-join-guild]").forEach(btn => {
      btn.onclick = () => handleJoinGuild(btn.dataset.joinGuild);
    });
  });
}

function renderGuildListTab(guilds, canJoin) {
  if (!guilds || !guilds.length) {
    return `
      <div class="guild-empty">
        <p>Hiện chưa có Bang Hội nào trên giang hồ.</p>
        <p class="dim small">Hãy là người đầu tiên sáng lập Bang Hội bằng <b>Nhạc Vương Kiếm</b>!</p>
      </div>
    `;
  }

  return `
    <div class="guild-rule-tip">
      <span>💡 <b>Quy tắc:</b> Yêu cầu nhân vật <b>Cấp ${GUILD_CFG.MIN_LV_JOIN}+</b> để gia nhập Bang Hội.</span>
      <span class="my-lv">Cấp hiện tại: <b>${S.lvl || 1}</b></span>
    </div>

    <div class="guild-table-wrap">
      <table class="guild-table">
        <thead>
          <tr>
            <th>Tên Bang Hội</th>
            <th>Bang Chủ</th>
            <th>Cấp Bang</th>
            <th>Thành Viên</th>
            <th>Thao Tác</th>
          </tr>
        </thead>
        <tbody>
          ${guilds.map(g => {
            const maxMem = getGuildMaxMembers(g.level);
            const curMem = (g.members || []).length;
            const isFull = curMem >= maxMem;
            return `
              <tr>
                <td><b class="g-name">⚔️ ${esc(g.name)}</b></td>
                <td><span class="g-leader">${esc(g.leader)}</span></td>
                <td><span class="g-lvl">Cấp ${g.level || 1}</span></td>
                <td><span class="g-mem ${isFull ? 'full' : ''}">${curMem}/${maxMem}</span></td>
                <td>
                  <button class="btn sm g-btn-join" data-join-guild="${g.id}" ${canJoin && !isFull ? '' : 'disabled'}>
                    ${isFull ? 'Đã đầy' : 'Xin vào'}
                  </button>
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderCreateGuildTab(nvkCount, canCreate) {
  const lvOk = (S.lvl || 1) >= GUILD_CFG.MIN_LV_CREATE;
  const itemOk = nvkCount > 0;

  return `
    <div class="guild-create-box">
      <h4>🚩 Điều Kiện Khai Sáng Bang Hội</h4>
      
      <div class="create-req-list">
        <div class="create-req-item ${lvOk ? 'ok' : 'bad'}">
          <span class="icon">${lvOk ? '✓' : '✗'}</span>
          <span>Đẳng cấp đạt <b>Cấp ${GUILD_CFG.MIN_LV_CREATE}</b> trở lên (Hiện tại: <b>${S.lvl || 1}</b>)</span>
        </div>
        <div class="create-req-item ${itemOk ? 'ok' : 'bad'}">
          <span class="icon">${itemOk ? '✓' : '✗'}</span>
          <span>Sở hữu tín vật <b>Nhạc Vương Kiếm</b> (Hiện có: <b>${nvkCount}</b>)</span>
          ${!itemOk ? '<a href="javascript:void(0)" onclick="closeModal(true);ktcModal();" class="ktc-link">Mua tại Kỳ Trân Các</a>' : ''}
        </div>
        <div class="create-req-item ok">
          <span class="icon">✓</span>
          <span>Quy mô khởi đầu: <b>${GUILD_CFG.BASE_CAPACITY}</b> thành viên (Có thể nâng cấp lên tối đa ${GUILD_CFG.MAX_CAPACITY})</span>
        </div>
      </div>

      <div class="create-form">
        <label>Tên Bang Hội muốn đặt:</label>
        <div class="form-row">
          <input type="text" id="guildNameInput" maxlength="16" placeholder="Nhập tên Bang Hội (3-16 ký tự)..." value="">
          <button class="btn gold" id="btnDoCreateGuild" ${canCreate ? '' : 'disabled'}>Sáng Lập Bang</button>
        </div>
        <p class="small dim">Tên bang hội cần đoan chính, không vi phạm quy chuẩn giang hồ.</p>
      </div>
    </div>
  `;
}

/**
 * Xử lý Tạo Bang
 */
async function handleCreateGuild() {
  const nameInput = $("#guildNameInput");
  const rawName = nameInput ? nameInput.value.trim() : "";

  if (!rawName || rawName.length < 3 || rawName.length > 16) {
    toast("Tên Bang Hội phải từ 3 đến 16 ký tự");
    return;
  }

  if (/[<>{}\[\]\/\\|`~!@#$%^&*()+=]/.test(rawName)) {
    toast("Tên Bang Hội chứa ký tự không hợp lệ");
    return;
  }

  if ((S.lvl || 1) < GUILD_CFG.MIN_LV_CREATE) {
    toast(`Cần đạt đẳng cấp ${GUILD_CFG.MIN_LV_CREATE} trở lên mới có thể lập Bang`);
    return;
  }

  if (matHave("misc", "nvk") < 1) {
    toast("Cần có 1 Nhạc Vương Kiếm để lập Bang");
    return;
  }

  // Luôn lấy dữ liệu mới nhất từ Cloud
  if (typeof fetchGuildsFromCloud === "function") {
    await fetchGuildsFromCloud(true);
  }

  const guilds = getStoredGuilds();
  if (guilds.some(g => g.name.toLowerCase() === rawName.toLowerCase())) {
    toast("Tên Bang Hội này đã có người sử dụng");
    return;
  }

  // Trừ 1 Nhạc Vương Kiếm
  matAdd("misc", "nvk", -1);

  const newGuild = {
    id: "g_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: rawName,
    leader: S.name || "Đại Hiệp",
    leaderFac: S.fac,
    level: 1,
    notice: "Chào mừng các hào kiệt tề tựu tại " + rawName + "!",
    fund: 0,
    createdAt: Date.now(),
    members: [
      {
        name: S.name || "Đại Hiệp",
        fac: S.fac,
        lvl: S.lvl || 1,
        role: "leader",
        joinedAt: Date.now(),
        donate: 0
      }
    ]
  };

  guilds.push(newGuild);
  saveStoredGuilds(guilds);

  S.guildId = newGuild.id;
  S.guildName = newGuild.name;
  S.guildRole = "leader";
  save();

  toast(`Chúc mừng bạn đã sáng lập Bang Hội [${rawName}] thành công!`);
  log(`🏰 <b style="color:#ffd24a">[Bang Hội]</b> Bạn đã khai tông lập phái, sáng lập Bang Hội <b style="color:#ff9900">${esc(rawName)}</b> vang danh thiên hạ!`);
  
  if (typeof uiSfx === "function") uiSfx("levelup");

  renderMyGuildModal(newGuild, "main");
}

/**
 * Xử lý Xin vào Bang
 */
async function handleJoinGuild(guildId) {
  if ((S.lvl || 1) < GUILD_CFG.MIN_LV_JOIN) {
    toast(`Cần đạt đẳng cấp ${GUILD_CFG.MIN_LV_JOIN} trở lên mới có thể gia nhập Bang Hội`);
    return;
  }

  // Luôn lấy dữ liệu mới nhất từ Cloud trước khi gia nhập
  if (typeof fetchGuildsFromCloud === "function") {
    await fetchGuildsFromCloud(true);
  }

  const guilds = getStoredGuilds();
  const g = guilds.find(x => x.id === guildId);
  if (!g) {
    toast("Bang Hội không tồn tại hoặc đã giải tán");
    return;
  }

  const maxMem = getGuildMaxMembers(g.level);
  if ((g.members || []).length >= maxMem) {
    toast("Bang Hội này đã đủ thành viên");
    return;
  }

  // Thêm thành viên (kiểm tra trùng lặp)
  if (!Array.isArray(g.members)) g.members = [];
  const existingIdx = g.members.findIndex(m => m.name && m.name.toLowerCase() === (S.name || "").toLowerCase());
  if (existingIdx >= 0) {
    g.members[existingIdx].lvl = S.lvl || 1;
    g.members[existingIdx].fac = S.fac;
  } else {
    g.members.push({
      name: S.name || "Đại Hiệp",
      fac: S.fac,
      lvl: S.lvl || 1,
      role: "member",
      joinedAt: Date.now(),
      donate: 0
    });
  }

  saveStoredGuilds(guilds);

  S.guildId = g.id;
  S.guildName = g.name;
  S.guildRole = "member";
  save();

  toast(`Bạn đã gia nhập Bang Hội [${g.name}]!`);
  log(`🏰 <b style="color:#ffd24a">[Bang Hội]</b> Bạn đã gia nhập Bang Hội <b style="color:#ff9900">${esc(g.name)}</b>.`);
  
  if (typeof uiSfx === "function") uiSfx("learn");
  if (typeof R !== "undefined" && R) R.dirty = true;
  if (typeof recalc === "function") recalc();
  if (typeof refresh === "function") refresh();

  renderMyGuildModal(g, "main");
}

/**
 * UI Khi đã có Bang
 */
function renderMyGuildModal(guild, tab = "main") {
  if (guild) sanitizeGuilds([guild]);
  const isLeader = S.guildRole === "leader" || (guild.leader && guild.leader === S.name);
  const maxMem = getGuildMaxMembers(guild.level);
  const curMem = (guild.members || []).length;
  const nextLvlCost = GUILD_CFG.UPGRADE_COSTS[guild.level + 1];

  const html = `
    <div class="guild-modal-wrap">
      <div class="my-guild-header">
        <div class="my-guild-title">
          <h3>🏰 ${esc(guild.name)}</h3>
          <span class="guild-badge">Cấp ${guild.level || 1}</span>
          <span class="guild-role-badge ${isLeader ? 'leader' : ''}">${isLeader ? '⭐ Bang Chủ' : '🛡️ Thành Viên'}</span>
        </div>
        <div class="my-guild-stats">
          <span>Bang Chủ: <b class="gold">${esc(guild.leader)}</b></span>
          <span>Thành viên: <b>${curMem}/${maxMem}</b></span>
          <span>Quỹ Bang: <b class="gold">${fmtL(guild.fund || 0)}</b> lượng</span>
        </div>
      </div>

      <div class="guild-notice-bar">
        <div class="notice-label">📢 Thông Báo:</div>
        <div class="notice-txt" id="gNoticeTxt">${esc(guild.notice || "Chưa có thông báo mới.")}</div>
        ${isLeader ? '<button class="btn sm" id="btnEditNotice" title="Đổi thông báo bang">Sửa</button>' : ''}
      </div>

      <div class="guild-tabs">
        <button class="guild-tab-btn ${tab === 'main' ? 'active' : ''}" id="gtabMMain">👥 Thành Viên (${curMem})</button>
        <button class="guild-tab-btn ${tab === 'skills' ? 'active' : ''}" id="gtabMSkills">✨ Kỹ Năng Bang</button>
        <button class="guild-tab-btn ${tab === 'manage' ? 'active' : ''}" id="gtabMManage">⚙️ Quản Lý & Nâng Cấp</button>
      </div>

      <div class="guild-content">
        ${tab === 'skills' ? renderGuildSkillsTab(guild, isLeader) : tab === 'manage' ? renderGuildManageTab(guild, isLeader, nextLvlCost, maxMem) : renderGuildMembersTab(guild, isLeader)}
      </div>
    </div>
  `;

  modal(html, () => {
    const bMain = $("#gtabMMain");
    const bSkills = $("#gtabMSkills");
    const bManage = $("#gtabMManage");
    if (bMain) bMain.onclick = () => renderMyGuildModal(guild, "main");
    if (bSkills) bSkills.onclick = () => renderMyGuildModal(guild, "skills");
    if (bManage) bManage.onclick = () => renderMyGuildModal(guild, "manage");

    // Nâng cấp kỹ năng bang
    document.querySelectorAll("[data-upgrade-gskill]").forEach(btn => {
      btn.onclick = () => handleUpgradeGuildSkill(guild, btn.dataset.upgradeGskill);
    });

    // Sửa thông báo
    const btnEditNotice = $("#btnEditNotice");
    if (btnEditNotice) {
      btnEditNotice.onclick = () => handleEditNotice(guild);
    }

    // Đóng góp ngân lượng
    const btnDonate = $("#btnGuildDonate");
    if (btnDonate) {
      btnDonate.onclick = () => handleDonateGuild(guild);
    }

    // Nâng cấp bang
    const btnUpgrade = $("#btnGuildUpgrade");
    if (btnUpgrade) {
      btnUpgrade.onclick = () => handleUpgradeGuild(guild, nextLvlCost);
    }

    // Rời bang
    const btnLeave = $("#btnGuildLeave");
    if (btnLeave) {
      btnLeave.onclick = () => handleLeaveGuild(guild, isLeader);
    }

    // Trục xuất thành viên
    document.querySelectorAll("[data-kick-member]").forEach(btn => {
      btn.onclick = () => handleKickMember(guild, btn.dataset.kickMember);
    });

    // Bổ nhiệm chức vụ
    document.querySelectorAll("[data-promote-member]").forEach(btn => {
      btn.onclick = () => handlePromoteMember(guild, btn.dataset.promoteMember);
    });
  });
}

function renderGuildMembersTab(guild, isLeader) {
  let members = guild.members || [];
  // Đảm bảo không bao giờ trùng lặp tên thành viên trong danh sách hiển thị
  const seen = new Map();
  members.forEach(m => {
    if (!m || !m.name) return;
    const k = String(m.name).trim().toLowerCase();
    if (!seen.has(k) || (m.lvl || 1) > (seen.get(k).lvl || 1)) {
      seen.set(k, m);
    }
  });
  members = Array.from(seen.values());

  return `
    <div class="guild-table-wrap">
      <table class="guild-table">
        <thead>
          <tr>
            <th>Thành Viên</th>
            <th>Môn Phái</th>
            <th>Cấp Độ</th>
            <th>Chức Vụ</th>
            <th>Cống Hiến</th>
            ${isLeader ? '<th>Thao Tác</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${members.map(m => {
            const facObj = typeof FAC !== "undefined" ? FAC[m.fac] : null;
            const facName = facObj ? facObj.n : (m.fac || "Vô Môn");
            const isMe = m.name === S.name;
            const roleKey = m.role || "member";
            const roleCfg = GUILD_CFG.ROLES && GUILD_CFG.ROLES[roleKey];
            const roleTitle = roleCfg ? `${roleCfg.icon} ${roleCfg.title}` : (roleKey === "leader" ? "⭐ Bang Chủ" : "👤 Bang Chúng");
            const isMemberLeader = roleKey === "leader" || m.name === guild.leader;

            return `
              <tr class="${isMe ? 'is-me' : ''}">
                <td><b class="${isMemberLeader ? 'gold' : ''}">${esc(m.name)} ${isMe ? '(Bạn)' : ''}</b></td>
                <td><span>${esc(facName)}</span></td>
                <td><span>Lv.${m.lvl || 1}</span></td>
                <td><span class="role-tag ${roleKey}">${roleTitle}</span></td>
                <td><span class="gold">${fmtL(m.donate || 0)}</span></td>
                ${isLeader ? `
                  <td class="guild-action-cell">
                    ${!isMemberLeader ? `
                      <button class="btn sm gold" data-promote-member="${esc(m.name)}" title="Bổ nhiệm chức vụ">Bổ nhiệm</button>
                      <button class="btn sm red" data-kick-member="${esc(m.name)}" title="Trục xuất khỏi bang">Trục xuất</button>
                    ` : '<span class="dim small">Bang chủ</span>'}
                  </td>
                ` : ''}
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Tab Kỹ Năng Bang Hội (Buff chỉ số toàn bang)
 */
function renderGuildSkillsTab(guild, isLeader) {
  const gSkills = guild.skills || {};
  const skillsCfg = GUILD_CFG.SKILLS || {};
  const fund = guild.fund || 0;

  return `
    <div class="guild-skills-wrap">
      <div class="guild-skills-header">
        <div class="skills-banner">
          <div><b>Kỹ Năng Bang Hội:</b> Toàn bộ thành viên trong Bang đều được hưởng hiệu ứng cộng thêm chỉ số vĩnh viễn khi ở trong bang.</div>
          <div class="gold" style="margin-top:4px;">Ngân quỹ Bang khả dụng: <b>${fmtL(fund)}</b> lượng</div>
        </div>
      </div>

      <div class="guild-skills-grid">
        ${Object.values(skillsCfg).map(sk => {
          const curLv = gSkills[sk.id] || 0;
          const isMax = curLv >= sk.maxLevel;
          const nextLv = curLv + 1;
          const cost = sk.costPerLevel * nextLv;
          const curBonus = curLv * sk.perLevel;
          const nextBonus = nextLv * sk.perLevel;
          const canAfford = isLeader && !isMax && fund >= cost;

          return `
            <div class="guild-skill-card ${isMax ? 'maxed' : ''}">
              <div class="gskill-icon">${sk.icon}</div>
              <div class="gskill-body">
                <div class="gskill-title-row">
                  <span class="gskill-name">${sk.name}</span>
                  <span class="gskill-level ${isMax ? 'gold' : ''}">Cấp ${curLv}/${sk.maxLevel}</span>
                </div>
                <div class="gskill-desc">${sk.desc}</div>
                <div class="gskill-stat-row">
                  <span class="gskill-bonus">Hiệu quả: <b class="gold">+${curBonus}${sk.unit}</b></span>
                  ${!isMax ? `<span class="gskill-next dim">→ Tiếp theo: <b>+${nextBonus}${sk.unit}</b></span>` : '<span class="gskill-maxed gold">Đã đạt tối đa</span>'}
                </div>
                ${!isMax ? `
                  <div class="gskill-cost-row">
                    <span>Phí quỹ bang: <b class="${fund >= cost ? 'gold' : 'bad'}">${fmtL(cost)}</b> lượng</span>
                  </div>
                ` : ''}
              </div>
              <div class="gskill-act">
                ${!isMax ? `
                  <button class="btn sm gold" data-upgrade-gskill="${sk.id}" ${canAfford ? '' : 'disabled'} title="${!isLeader ? 'Chỉ Bang Chủ mới có quyền thăng cấp' : (fund < cost ? 'Ngân quỹ bang không đủ' : 'Thăng cấp kỹ năng')}">
                    ${isLeader ? 'Thăng Cấp' : 'Bang Chủ'}
                  </button>
                ` : `
                  <button class="btn sm" disabled>Tối đa</button>
                `}
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function handleUpgradeGuildSkill(guild, skillId) {
  const sk = GUILD_CFG.SKILLS && GUILD_CFG.SKILLS[skillId];
  if (!sk) return;

  const guilds = getStoredGuilds();
  const g = guilds.find(x => x.id === guild.id);
  if (!g) return;

  if (!g.skills) g.skills = {};
  const curLv = g.skills[skillId] || 0;
  if (curLv >= sk.maxLevel) {
    toast(`Kỹ năng [${sk.name}] đã đạt cấp tối đa!`);
    return;
  }

  const nextLv = curLv + 1;
  const cost = sk.costPerLevel * nextLv;
  if ((g.fund || 0) < cost) {
    toast(`Ngân quỹ bang không đủ (cần ${fmtL(cost)} lượng)!`);
    return;
  }

  // Khấu trừ ngân quỹ và tăng cấp kỹ năng
  g.fund -= cost;
  g.skills[skillId] = nextLv;
  saveStoredGuilds(guilds);

  const bonusVal = nextLv * sk.perLevel;
  toast(`Thăng cấp thành công [${sk.name}] lên Cấp ${nextLv}! (+${bonusVal}${sk.unit})`);
  log(`🏰 <b style="color:#ffd24a">[Kỹ Năng Bang]</b> Bang Chủ đã thăng cấp <b class="gold">${sk.icon} ${sk.name}</b> lên <b class="gold">Cấp ${nextLv}</b> (+${bonusVal}${sk.unit})!`);

  // Gửi thông báo hệ thống vào chat Bang Hội và đồng bộ realtime
  if (typeof pushGuildSystemChat === "function") {
    pushGuildSystemChat(g, `✨ Kỹ năng Bang [${sk.name}] đã được thăng cấp lên Cấp ${nextLv} (+${bonusVal}${sk.unit})!`);
  }

  if (typeof uiSfx === "function") uiSfx("levelup");
  if (typeof R !== "undefined" && R) R.dirty = true;
  if (typeof recalc === "function") recalc();
  if (typeof refresh === "function") refresh();
  if (typeof updateTop === "function") updateTop();

  renderMyGuildModal(g, "skills");
}

function renderGuildManageTab(guild, isLeader, nextLvlCost, curCapacity) {
  const nextCapacity = Math.min(curCapacity + GUILD_CFG.LEVEL_STEP_CAPACITY, GUILD_CFG.MAX_CAPACITY);
  const isMaxLvl = curCapacity >= GUILD_CFG.MAX_CAPACITY || !nextLvlCost;
  const canAffordUpgrade = isLeader && !isMaxLvl && (guild.fund || 0) >= (nextLvlCost ? nextLvlCost.fund : Infinity);

  return `
    <div class="guild-manage-grid">
      <!-- Cống hiến quỹ bang -->
      <div class="guild-card">
        <h4>🪙 Đóng Góp Quỹ Bang</h4>
        <p class="small dim">Đóng góp ngân lượng vào ngân quỹ để nâng cấp quy mô Bang Hội và phát triển bang.</p>
        <div class="donate-box">
          <input type="number" id="donateGoldAmount" min="10000" step="10000" placeholder="Số lượng (tối thiểu 1 Vạn)..." value="100000">
          <button class="btn gold" id="btnGuildDonate">Quyên Góp</button>
        </div>
        <p class="small dim">Ngân lượng của bạn: <b class="gold">${fmtL(S.gold || 0)}</b> lượng</p>
      </div>

      <!-- Nâng cấp quy mô bang -->
      <div class="guild-card">
        <h4>🏰 Nâng Cấp Quy Mô Bang</h4>
        <div class="upgrade-info">
          <div>Cấp hiện tại: <b>Cấp ${guild.level || 1}</b> (Tối đa ${curCapacity} thành viên)</div>
          ${!isMaxLvl ? `
            <div>Cấp kế tiếp: <b>Cấp ${(guild.level || 1) + 1}</b> (Tối đa <b class="gold">${nextCapacity}</b> thành viên)</div>
            <div>Chi phí: <b class="gold">${nextLvlCost.desc} lượng</b> (Dùng ngân quỹ Bang)</div>
            <div>Ngân quỹ hiện có: <b class="${(guild.fund || 0) >= nextLvlCost.fund ? 'gold' : 'bad'}">${fmtL(guild.fund || 0)}</b> lượng</div>
          ` : `
            <div class="gold"><b>Bang Hội đã đạt quy mô tối đa (100 thành viên)!</b></div>
          `}
        </div>
        <div class="btnrow" style="margin-top:12px;">
          ${!isMaxLvl ? `
            <button class="btn gold" id="btnGuildUpgrade" ${canAffordUpgrade ? '' : 'disabled'}>
              ${isLeader ? 'Nâng Cấp Bang Hội' : 'Chỉ Bang Chủ mới nâng cấp được'}
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Thoát bang / Giải tán bang -->
      <div class="guild-card danger">
        <h4>⚠️ Rời Bang Hội</h4>
        <p class="small dim">${isLeader ? 'Nếu Bang Chủ rời bang khi còn thành viên, quyền Bang Chủ sẽ chuyển cho người khác. Nếu chỉ còn 1 mình, Bang Hội sẽ giải tán.' : 'Rời bang hội hiện tại để tự do hoặc gia nhập bang khác.'}</p>
        <button class="btn red" id="btnGuildLeave">${isLeader ? 'Rời Bang / Giải Tán' : 'Rời Khỏi Bang Hội'}</button>
      </div>
    </div>
  `;
}

/**
 * Các thao tác Bang Hội
 */
function handleEditNotice(guild) {
  const newNotice = prompt("Nhập thông báo mới cho Bang Hội (tối đa 100 ký tự):", guild.notice || "");
  if (newNotice === null) return;
  const clean = newNotice.trim().slice(0, 100);
  if (!clean) return;

  const guilds = getStoredGuilds();
  const g = guilds.find(x => x.id === guild.id);
  if (g) {
    g.notice = clean;
    saveStoredGuilds(guilds);
    toast("Đã cập nhật thông báo Bang Hội!");
    renderMyGuildModal(g, "main");
  }
}

function handleDonateGuild(guild) {
  const inp = $("#donateGoldAmount");
  const amount = inp ? Math.floor(+inp.value) : 0;

  if (isNaN(amount) || amount < 10000) {
    toast("Số lượng quyên góp tối thiểu là 10.000 lượng");
    return;
  }

  if ((S.gold || 0) < amount) {
    toast("Bạn không có đủ ngân lượng");
    return;
  }

  S.gold -= amount;

  const guilds = getStoredGuilds();
  const g = guilds.find(x => x.id === guild.id);
  if (g) {
    g.fund = (g.fund || 0) + amount;
    const me = (g.members || []).find(m => m.name === S.name);
    if (me) me.donate = (me.donate || 0) + amount;

    saveStoredGuilds(guilds);
    save();

    toast(`Đã đóng góp ${fmtL(amount)} lượng vào ngân quỹ Bang!`);
    log(`🏰 <b style="color:#ffd24a">[Bang Hội]</b> Bạn đã đóng góp <b class="gold">${fmtL(amount)}</b> lượng vào ngân quỹ Bang Hội.`);
    
    if (typeof uiSfx === "function") uiSfx("learn");
    renderMyGuildModal(g, "manage");
  }
}

function handleUpgradeGuild(guild, nextCost) {
  if (!nextCost) return;
  if ((guild.fund || 0) < nextCost.fund) {
    toast("Ngân quỹ bang không đủ để nâng cấp");
    return;
  }

  const guilds = getStoredGuilds();
  const g = guilds.find(x => x.id === guild.id);
  if (g) {
    g.fund -= nextCost.fund;
    g.level = (g.level || 1) + 1;
    const newCap = getGuildMaxMembers(g.level);

    saveStoredGuilds(guilds);
    toast(`Chúc mừng Bang Hội đã thăng lên Cấp ${g.level}! Sức chứa tăng lên ${newCap} thành viên.`);
    log(`🏰 <b style="color:#ffd24a">[Bang Hội]</b> Bang Hội <b style="color:#ff9900">${esc(g.name)}</b> đã thăng lên <b class="gold">Cấp ${g.level}</b> (Quy mô: ${newCap} thành viên)!`);

    if (typeof uiSfx === "function") uiSfx("levelup");
    renderMyGuildModal(g, "manage");
  }
}

function handleKickMember(guild, memberName) {
  if (!confirm(`Bạn có chắc muốn trục xuất [${memberName}] khỏi Bang Hội?`)) return;

  const guilds = getStoredGuilds();
  const g = guilds.find(x => x.id === guild.id);
  if (g) {
    g.members = (g.members || []).filter(m => m.name !== memberName);
    saveStoredGuilds(guilds);
    toast(`Đã trục xuất ${memberName} khỏi Bang`);
    log(`🏰 <b style="color:#ffd24a">[Bang Hội]</b> ${esc(memberName)} đã bị trục xuất khỏi Bang Hội.`);
    renderMyGuildModal(g, "main");
  }
}

/**
 * Xử lý Bổ nhiệm / Bãi nhiệm chức vụ thành viên
 */
function handlePromoteMember(guild, memberName) {
  const guilds = getStoredGuilds();
  const g = guilds.find(x => x.id === guild.id);
  if (!g) return;

  const targetMem = (g.members || []).find(m => m.name === memberName);
  if (!targetMem) {
    toast("Thành viên không còn trong Bang Hội");
    return;
  }

  const curRole = targetMem.role || "member";

  // Danh sách các chức vụ có thể bổ nhiệm (ngoại trừ Bang Chủ)
  const assignableRoles = [
    { key: "vice", name: "Phó Bang Chủ", icon: "🎖️", desc: "Trợ lý Bang Chủ, quản lý nhân sự", max: 2 },
    { key: "elder", name: "Trưởng Lão", icon: "📜", desc: "Cố vấn cấp cao bang hội", max: 4 },
    { key: "hall", name: "Đường Chủ", icon: "⚔️", desc: "Chỉ huy chiến đội, tiên phong", max: 8 },
    { key: "elite", name: "Tinh Anh", icon: "🛡️", desc: "Lực lượng cốt cán bang hội", max: 16 },
    { key: "member", name: "Bang Chúng", icon: "👤", desc: "Thành viên bình thường", max: 999 }
  ];

  // Đếm số lượng hiện có của từng chức vụ
  const counts = {};
  (g.members || []).forEach(m => {
    const r = m.role || "member";
    counts[r] = (counts[r] || 0) + 1;
  });

  const modalHtml = `
    <div class="guild-promote-modal">
      <div class="promote-header">
        <h3>🎖️ Bổ Nhiệm Chức Vụ: <span class="gold">${esc(memberName)}</span></h3>
        <p class="small dim" style="margin-top:4px;">Chức vụ hiện tại: <b class="role-tag ${curRole}">${GUILD_CFG.ROLES[curRole] ? GUILD_CFG.ROLES[curRole].icon + " " + GUILD_CFG.ROLES[curRole].title : curRole}</b></p>
      </div>
      <div class="promote-role-list">
        ${assignableRoles.map(r => {
          const isCurrent = curRole === r.key;
          const holdingCount = counts[r.key] || 0;
          const currentOccupied = isCurrent ? Math.max(0, holdingCount - 1) : holdingCount;
          const isFull = r.max < 999 && currentOccupied >= r.max;

          return `
            <div class="promote-role-item ${isCurrent ? 'selected' : ''} ${isFull ? 'disabled' : ''}">
              <div class="role-icon">${r.icon}</div>
              <div class="role-info">
                <div class="role-name-wrap">
                  <span class="role-name">${r.name}</span>
                  ${r.max < 999 ? `<span class="role-count ${isFull ? 'full' : ''}">(${holdingCount}/${r.max})</span>` : ''}
                  ${isCurrent ? '<span class="role-current-tag">Hiện tại</span>' : ''}
                </div>
                <div class="role-desc">${r.desc}</div>
              </div>
              <div class="role-act">
                <button class="btn sm ${isCurrent ? 'gold' : ''}" data-select-role="${r.key}" ${isFull && !isCurrent ? 'disabled' : ''}>
                  ${isCurrent ? 'Đang giữ' : (isFull ? 'Đã đủ' : 'Bổ nhiệm')}
                </button>
              </div>
            </div>
          `;
        }).join("")}
      </div>
      <div class="promote-footer">
        <button class="btn" id="btnClosePromote">Đóng</button>
      </div>
    </div>
  `;

  modal(modalHtml, () => {
    const btnClose = $("#btnClosePromote");
    if (btnClose) {
      btnClose.onclick = () => {
        closeModal();
        renderMyGuildModal(g, "main");
      };
    }

    document.querySelectorAll("[data-select-role]").forEach(btn => {
      btn.onclick = () => {
        const newRole = btn.dataset.selectRole;
        if (newRole === curRole) {
          toast(`Thành viên hiện đã là ${GUILD_CFG.ROLES[newRole]?.title || newRole}`);
          return;
        }

        // Kiểm tra giới hạn số lượng
        const roleCfg = GUILD_CFG.ROLES[newRole];
        if (roleCfg && roleCfg.max < 999) {
          const curCount = (g.members || []).filter(m => m.role === newRole && m.name !== memberName).length;
          if (curCount >= roleCfg.max) {
            toast(`Chức vụ [${roleCfg.title}] đã đủ giới hạn tối đa (${roleCfg.max} người)!`);
            return;
          }
        }

        // Cập nhật chức vụ cho thành viên
        targetMem.role = newRole;

        // Nếu người được bổ nhiệm là chính mình
        if (memberName === S.name) {
          S.guildRole = newRole;
          save();
        }

        saveStoredGuilds(guilds);

        const newRoleTitle = roleCfg ? `${roleCfg.icon} ${roleCfg.title}` : newRole;
        toast(`Đã bổ nhiệm ${memberName} thành ${newRoleTitle}!`);
        log(`🏰 <b style="color:#ffd24a">[Bang Hội]</b> Bang Chủ đã bổ nhiệm <b class="gold">${esc(memberName)}</b> thành <b class="role-tag ${newRole}">${newRoleTitle}</b>.`);

        // Gửi thông báo hệ thống vào kênh Chat Bang Hội (đồng bộ realtime đến tất cả thành viên)
        if (typeof pushGuildSystemChat === "function") {
          pushGuildSystemChat(g, `🎉 Chúc mừng [${memberName}] đã được bổ nhiệm làm [${newRoleTitle}]!`);
        }

        if (typeof uiSfx === "function") uiSfx("levelup");

        closeModal();
        renderMyGuildModal(g, "main");
      };
    });
  });
}

function handleLeaveGuild(guild, isLeader) {
  if (!confirm(isLeader ? "Bạn là Bang Chủ. Rời bang sẽ chuyển quyền Bang Chủ cho thành viên khác (hoặc giải tán bang nếu chỉ còn 1 mình). Xác nhận?" : "Bạn có chắc muốn rời khỏi Bang Hội?")) return;

  const guilds = getStoredGuilds();
  const g = guilds.find(x => x.id === guild.id);
  if (!g) return;

  // Lọc bỏ mình
  g.members = (g.members || []).filter(m => m.name !== S.name);

  if (!g.members.length) {
    // Không còn ai -> Xóa bang
    const idx = guilds.findIndex(x => x.id === g.id);
    if (idx >= 0) guilds.splice(idx, 1);
    saveStoredGuilds(guilds);
    log(`🏰 <b style="color:#ffd24a">[Bang Hội]</b> Bang Hội <b style="color:#ff9900">${esc(g.name)}</b> đã chính thức giải tán.`);
  } else {
    if (isLeader) {
      // Chuyển quyền cho thành viên đầu tiên
      g.members[0].role = "leader";
      g.leader = g.members[0].name;
      g.leaderFac = g.members[0].fac;
      log(`🏰 <b style="color:#ffd24a">[Bang Hội]</b> Bang Chủ đã nhường lại cho <b>${esc(g.leader)}</b>.`);
    }
    saveStoredGuilds(guilds);
  }

  delete S.guildId;
  delete S.guildName;
  delete S.guildRole;
  save();

  if (typeof R !== "undefined" && R) R.dirty = true;
  if (typeof recalc === "function") recalc();
  if (typeof refresh === "function") refresh();

  toast("Đã rời Bang Hội thành công");
  closeModal(true);
}

/**
 * Lấy danh xưng Bang Hội hiển thị trên đầu nhân vật
 * Dạng: "🏰 Tên Bang Hội - Chức Vụ"
 */
function getMyGuildTitle() {
  if (typeof S === "undefined" || !S || !S.guildId) return null;
  const g = typeof getMyGuild === "function" ? getMyGuild() : null;
  if (!g) return null;
  const gName = g.name || S.guildName;
  if (!gName) return null;

  // Lấy role từ thông tin thành viên trong bang hoặc S.guildRole
  let roleKey = S.guildRole;
  if (g.leader && g.leader === S.name) {
    roleKey = "leader";
  } else if (Array.isArray(g.members)) {
    const me = g.members.find(m => m.name === S.name);
    if (me && me.role) roleKey = me.role;
  }
  if (!roleKey) roleKey = "member";

  const roleCfg = GUILD_CFG.ROLES && GUILD_CFG.ROLES[roleKey];
  const roleName = roleCfg ? roleCfg.title : (roleKey === "leader" ? "Bang Chủ" : "Bang Chúng");
  return `🏰 ${gName} - ${roleName}`;
}

/**
 * ====================================================================
 * HỆ THỐNG CHAT BANG HỘI THỜI GIAN THỰC (GUILD CHAT)
 * ====================================================================
 */
const GUILD_CHAT_KEY = "jxidle_guild_chat_msgs";
let guildChatMsgs = [];

function getGuildChatList() {
  if (guildChatMsgs.length > 0) return guildChatMsgs;
  try {
    const raw = localStorage.getItem(GUILD_CHAT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        guildChatMsgs = parsed;
        return guildChatMsgs;
      }
    }
  } catch (e) {}
  return guildChatMsgs;
}

function saveGuildChatList() {
  try {
    if (guildChatMsgs.length > 80) guildChatMsgs = guildChatMsgs.slice(-80);
    localStorage.setItem(GUILD_CHAT_KEY, JSON.stringify(guildChatMsgs));
  } catch (e) {}
}

function sendGuildChat(text) {
  if (!text) return false;
  text = String(text).trim().slice(0, 150);
  if (!text) return false;

  const myG = typeof getMyGuild === "function" ? getMyGuild() : null;
  if (!myG) {
    if (typeof toast === "function") toast("Bạn chưa gia nhập Bang Hội");
    return false;
  }

  const myName = (typeof S !== "undefined" && S.name) || "Đại hiệp";
  const myFac = (typeof S !== "undefined" && typeof FAC !== "undefined" && FAC[S.fac]) ? FAC[S.fac].n : "";
  const myLvl = (typeof S !== "undefined" && S.lvl) | 0;

  let roleKey = S.guildRole;
  if (myG.leader && myG.leader === S.name) {
    roleKey = "leader";
  } else if (Array.isArray(myG.members)) {
    const me = myG.members.find(m => m.name === S.name);
    if (me && me.role) roleKey = me.role;
  }
  if (!roleKey) roleKey = "member";

  const roleCfg = GUILD_CFG.ROLES && GUILD_CFG.ROLES[roleKey];
  const roleName = roleCfg ? roleCfg.title : (roleKey === "leader" ? "Bang Chủ" : "Bang Chúng");
  const now = Date.now();

  const msgObj = {
    id: "gc_" + now + "_" + Math.random().toString(36).slice(2, 6),
    guildId: myG.id,
    guildName: myG.name,
    name: myName,
    role: roleName,
    roleKey: roleKey,
    fac: myFac,
    lvl: myLvl,
    msg: text,
    ts: now
  };

  getGuildChatList().push(msgObj);
  saveGuildChatList();

  if (typeof u20LogDraw === "function") u20LogDraw();
  if (typeof chatRender === "function") chatRender();

  // Phát sóng qua WebSocket Realtime tới toàn bộ thành viên bang
  if (typeof PRESENCE !== "undefined" && PRESENCE.connected && PRESENCE.ws && PRESENCE.ws.readyState === WebSocket.OPEN) {
    const wsMsg = {
      topic: PRESENCE.channel,
      event: "broadcast",
      payload: {
        type: "broadcast",
        event: "guild_chat",
        payload: msgObj
      },
      ref: "gc_" + now
    };
    try {
      PRESENCE.ws.send(JSON.stringify(wsMsg));
    } catch (e) {
      console.warn("[GuildChat] Lỗi gửi tin websocket:", e);
    }
  }

  return true;
}

/**
 * Gửi thông báo hệ thống trực tiếp vào kênh chat Bang Hội
 */
function pushGuildSystemChat(guild, text) {
  if (!guild || !text) return;
  const now = Date.now();
  const msgObj = {
    id: "gc_sys_" + now + "_" + Math.random().toString(36).slice(2, 6),
    guildId: guild.id,
    guildName: guild.name,
    name: "Hệ Thống",
    role: "Bang Hội",
    roleKey: "sys",
    fac: "",
    lvl: 0,
    msg: text,
    sys: true,
    ts: now
  };

  getGuildChatList().push(msgObj);
  saveGuildChatList();

  if (typeof u20LogDraw === "function") u20LogDraw();
  if (typeof chatRender === "function") chatRender();

  // Đồng bộ qua WebSocket đến tất cả thành viên trong Bang
  if (typeof PRESENCE !== "undefined" && PRESENCE.connected && PRESENCE.ws && PRESENCE.ws.readyState === WebSocket.OPEN) {
    const wsMsg = {
      topic: PRESENCE.channel,
      event: "broadcast",
      payload: {
        type: "broadcast",
        event: "guild_chat",
        payload: msgObj
      },
      ref: "gc_sys_" + now
    };
    try {
      PRESENCE.ws.send(JSON.stringify(wsMsg));
    } catch (e) {
      console.warn("[GuildChat] Lỗi gửi tin hệ thống websocket:", e);
    }
  }
}

function handleRemoteGuildChat(msgObj) {
  if (!msgObj || !msgObj.guildId || !msgObj.msg) return;
  const myG = typeof getMyGuild === "function" ? getMyGuild() : null;
  if (!myG || myG.id !== msgObj.guildId) return; // Chỉ nhận tin của bang mình

  const list = getGuildChatList();
  if (list.some(m => m.id === msgObj.id)) return; // Đã có

  list.push(msgObj);
  saveGuildChatList();

  if (typeof u20LogDraw === "function") u20LogDraw();
  if (typeof chatRender === "function") chatRender();
}

/**
 * Lấy danh sách chỉ số buff từ kỹ năng Bang Hội
 * Trả về object: { lifemax_p: 10, addphysicsdamage_p: 15, ... }
 */
function getMyGuildSkillBonuses() {
  const g = typeof getMyGuild === "function" ? getMyGuild() : null;
  if (!g || !g.skills) return {};
  const res = {};
  const cfg = GUILD_CFG.SKILLS || {};
  for (const skId in g.skills) {
    const lv = g.skills[skId] || 0;
    if (lv > 0 && cfg[skId]) {
      const attrKey = cfg[skId].attr;
      const val = lv * cfg[skId].perLevel;
      res[attrKey] = (res[attrKey] || 0) + val;
    }
  }
  return res;
}

// Export cho hệ thống nếu có module loader
if (typeof window !== "undefined") {
  window.openGuildModal = openGuildModal;
  window.getMyGuild = getMyGuild;
  window.getStoredGuilds = getStoredGuilds;
  window.getMyGuildTitle = getMyGuildTitle;
  window.getMyGuildSkillBonuses = getMyGuildSkillBonuses;
  window.fetchGuildsFromCloud = fetchGuildsFromCloud;
  window.syncGuildsToCloud = syncGuildsToCloud;
  window.handleRemoteGuildSync = handleRemoteGuildSync;
  window.sendGuildChat = sendGuildChat;
  window.pushGuildSystemChat = pushGuildSystemChat;
  window.handleRemoteGuildChat = handleRemoteGuildChat;
  window.getGuildChatList = getGuildChatList;
}

