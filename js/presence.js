/**
 * Võ Lâm Idle (JX2) - Hệ Thống Realtime Multiplayer
 * Cho phép người chơi trên PC, Điện thoại nhìn thấy nhau, di chuyển và hiển thị trang bị theo thời gian thực.
 * Sử dụng Supabase Realtime WebSocket (Phoenix Channels Protocol) chuẩn quốc tế.
 */

"use strict";

const PRESENCE = {
  ws: null,
  connected: false,
  channel: "realtime:jx2_world",
  heartbeatTimer: null,
  sendTimer: null,
  reconnectTimer: null,
  lastSent: { x: 0, y: 0, act: "", dir: 0, time: 0 },
  ref: 1
};

// Đảm bảo R.otherPlayers luôn sẵn sàng
if (typeof R !== "undefined" && !R.otherPlayers) {
  R.otherPlayers = {};
}

/**
 * Lấy cấu hình kết nối Supabase
 */
function getPresenceConfig() {
  const url = (localStorage.getItem("jx2_supabase_url") || (window.CHAT_CFG && window.CHAT_CFG.supabaseUrl) || "").trim().replace(/\/+$/, "");
  const key = (localStorage.getItem("jx2_supabase_key") || (window.CHAT_CFG && window.CHAT_CFG.supabaseKey) || "").trim();
  return { url, key, enabled: !!(url && key) };
}

/**
 * Khởi động kết nối Realtime WebSocket tới Supabase
 */
function initRealtimePresence() {
  console.log('[Presence] Đang ở chế độ thuần Offline 100%.');
  return;
}

/**
 * Xử lý gói tin vị trí nhận được từ người chơi khác
 */
function handleRemotePlayerPosition(data) {
  if (!data || !data.id || !data.name) return;

  // Bỏ qua gói tin của chính mình
  const myId = (typeof NET !== "undefined" && NET.user && NET.user.id) || (typeof S !== "undefined" && S && S.name);
  if (data.id === myId || (data.name && typeof S !== "undefined" && S && data.name === S.name)) return;

  // Bỏ qua nếu khác khu vực (Thành thị vs Bản đồ train)
  const currentZone = (typeof R !== "undefined" && R && R.town) ? "town" : (typeof S !== "undefined" && S ? ("stage_" + Math.floor((S.stage - 1) / 10)) : "stage");
  if (data.zone && data.zone !== currentZone) {
    // Nếu người chơi này đã đổi map thì xóa khỏi danh sách map hiện tại
    if (R.otherPlayers && R.otherPlayers[data.id]) {
      delete R.otherPlayers[data.id];
      updateOnlineIndicator();
    }
    return;
  }

  if (typeof R === "undefined" || !R) return;
  if (!R.otherPlayers) R.otherPlayers = {};

  const existing = R.otherPlayers[data.id];
  const now = Date.now();

  if (existing) {
    // Cập nhật vị trí đích và trạng thái
    existing.targetX = data.x;
    existing.targetY = data.y;
    existing.dir = data.dir || 0;
    existing.act = data.act || "st";
    existing.lvl = data.lvl || existing.lvl;
    existing.reborn = data.reborn || existing.reborn;
    existing.hp = data.hp !== undefined ? data.hp : 1;
    existing.pkMode = data.pkMode !== undefined ? data.pkMode : (existing.pkMode || 0);
    existing.eq = data.eq || existing.eq;
    existing.mounted = !!data.mounted;
    existing.title = data.title || existing.title;
    existing.titleStr = data.titleStr !== undefined ? data.titleStr : existing.titleStr;
    existing.titleTier = data.titleTier !== undefined ? data.titleTier : existing.titleTier;
    existing.realmName = data.realmName || existing.realmName;
    existing.realmColor = data.realmColor || existing.realmColor;
    existing.realmIndex = data.realmIndex !== undefined ? data.realmIndex : existing.realmIndex;
    existing.guildTitle = data.guildTitle !== undefined ? data.guildTitle : existing.guildTitle;
    existing.isVip = data.isVip !== undefined ? !!data.isVip : !!existing.isVip;
    existing.lastSeen = now;
  } else {
    // Người chơi mới xuất hiện
    R.otherPlayers[data.id] = {
      id: data.id,
      name: data.name,
      fac: data.fac || "tangmen",
      sex: data.sex || 0,
      lvl: data.lvl || 1,
      reborn: data.reborn || 0,
      x: data.x,
      y: data.y,
      targetX: data.x,
      targetY: data.y,
      dir: data.dir || 0,
      act: data.act || "st",
      actT: 0,
      hp: data.hp !== undefined ? data.hp : 1,
      pkMode: data.pkMode !== undefined ? data.pkMode : 0,
      eq: data.eq || {},
      mounted: !!data.mounted,
      title: data.title || null,
      titleStr: data.titleStr || null,
      titleTier: data.titleTier !== undefined ? data.titleTier : null,
      realmName: data.realmName || null,
      realmColor: data.realmColor || null,
      realmIndex: data.realmIndex || 0,
      guildTitle: data.guildTitle || null,
      isVip: !!data.isVip,
      lastSeen: now
    };
    updateOnlineIndicator();
    if (typeof toast === "function") {
      toast(`👋 Đại hiệp [${data.name}] xuất hiện quanh bạn!`);
    }
  }
}

/**
 * Gửi định kỳ tọa độ và hành động của nhân vật chính lên Realtime
 */
function broadcastMyPosition(force = false) {
  return;
}

/**
 * Cập nhật chuyển động nội suy (Lerp) mượt mà cho người chơi khác
 * Được gọi trong vòng lặp game
 */
function updateOtherPlayers(dt) {
  if (typeof R === "undefined" || !R || !R.otherPlayers) return;

  const now = Date.now();
  let count = 0;

  for (const id in R.otherPlayers) {
    const p = R.otherPlayers[id];

    // Xóa người chơi nếu mất kết nối quá 8 giây
    if (now - p.lastSeen > 8000) {
      delete R.otherPlayers[id];
      continue;
    }

    count++;

    // Nội suy mượt mà tọa độ (Lerp)
    const dx = p.targetX - p.x;
    const dy = p.targetY - p.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 350) {
      // Nhảy cóc nếu cự ly quá lớn (chuyển cảnh hoặc giật lag)
      p.x = p.targetX;
      p.y = p.targetY;
    } else if (dist > 1) {
      const spd = Math.min(1, dt * 10);
      p.x += dx * spd;
      p.y += dy * spd;
    }

    // Tăng thời gian chuyển động hoạt ảnh
    p.actT = (p.actT || 0) + dt;
  }
}

/**
 * Hiển thị huy hiệu số người chơi online trên giao diện
 */
function updateOnlineIndicator() {
  const badge = document.getElementById("multiplayerBadge");
  if (badge) badge.style.display = "none";
}

/**
 * Modal hiển thị danh sách đại hiệp đang đứng cạnh
 */
function showNearbyPlayersModal() {
  if (typeof modal !== "function") return;
  const players = R.otherPlayers ? Object.values(R.otherPlayers) : [];

  if (players.length === 0) {
    modal(`
      <h3>🌐 Đại Hiệp Xung Quanh</h3>
      <p class="dim small" style="text-align: center; padding: 20px 0;">
        Hiện chưa có đại hiệp nào khác ở khu vực này.<br>
        Hãy mở game trên máy tính hoặc điện thoại khác và di chuyển cùng bản đồ để nhìn thấy nhau!
      </p>
      <div class="btnrow"><button class="btn" id="nbClose">Đóng</button></div>
    `, () => {
      const b = document.getElementById("nbClose");
      if (b) b.onclick = () => closeModal();
    });
    return;
  }

  const itemsHtml = players.map(p => {
    const facName = (typeof FAC !== "undefined" && FAC[p.fac]) ? FAC[p.fac].n : p.fac;
    return `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(0,0,0,0.3); border-radius: 4px; margin-bottom: 6px;">
        <div>
          <b style="color: #5ac8fa;">${p.name}</b>
          <div style="font-size: 11px; color: var(--text-dim);">${facName} · Cấp ${p.lvl}${p.reborn ? ` CS${p.reborn}` : ''}</div>
        </div>
        <button class="btn btn-sm" onclick="closeModal(); if(typeof showPlayerActionMenu==='function')showPlayerActionMenu(R.otherPlayers['${p.id}'])">⚡ Tương tác</button>
      </div>
    `;
  }).join("");

  modal(`
    <h3>🌐 Đại Hiệp Cùng Bản Đồ (${players.length})</h3>
    <div style="max-height: 300px; overflow-y: auto; margin: 12px 0;">
      ${itemsHtml}
    </div>
    <div class="btnrow"><button class="btn" id="nbClose">Đóng</button></div>
  `, () => {
    const b = document.getElementById("nbClose");
    if (b) b.onclick = () => closeModal();
  });
}

/**
 * Tìm kiếm đại hiệp gần tọa độ bấm chuột/chạm tay
 */
function findNearbyPlayerAt(worldX, worldY) {
  if (!R.otherPlayers) return null;
  let closest = null;
  let minD = 65; // Tăng bán kính tìm kiếm để dễ dàng chạm/click trúng trên cả PC lẫn điện thoại
  for (const id in R.otherPlayers) {
    const p = R.otherPlayers[id];
    const d = Math.hypot(p.x - worldX, p.y - worldY);
    if (d < minD) {
      minD = d;
      closest = p;
    }
  }
  return closest;
}

/**
 * Lấy danh sách thực thể người chơi khác để đưa vào danh sách render (xếp lớp theo trục Y)
 */
function othEnts() {
  if (typeof R === "undefined" || !R || !R.otherPlayers) return [];
  const list = [];
  for (const id in R.otherPlayers) {
    const p = R.otherPlayers[id];
    list.push({ oth: p, y: p.y });
  }
  return list;
}

/**
 * Render người chơi khác trên bản đồ
 */
function othDraw(cx, p, dt) {
  if (!p || typeof cx === "undefined") return;

  // 1. Vòng tròn mục tiêu nếu đang được nhắm tới để PK
  if (R.pkTarget && R.pkTarget.id === p.id) {
    cx.save();
    cx.strokeStyle = "#ff3333";
    cx.lineWidth = 2.5;
    cx.beginPath();
    cx.ellipse(p.x, p.y, 22, 9, 0, 0, Math.PI * 2);
    cx.stroke();
    // Chấm tâm chỉ báo
    cx.fillStyle = "rgba(255, 50, 50, 0.3)";
    cx.fill();
    cx.restore();
  }

  // 2. Vòng sáng Cảnh Giới / Tu Tiên và Bóng chân nhân vật
  if (p.realmIndex && typeof drawRealmRingAnim === "function") {
    drawRealmRingAnim(cx, p.x, p.y, p.realmIndex);
  }
  cx.fillStyle = "#0007";
  cx.beginPath();
  cx.ellipse(p.x, p.y, 16, 6, 0, 0, Math.PI * 2);
  cx.fill();

  // 3. Hoạt ảnh nhân vật (Ngoại trang JX chuẩn theo trang bị & thú cưỡi của đối thủ)
  let drawn = false;
  let animHeight = 52;
  const heroScale = typeof HERO_SCALE !== "undefined" ? HERO_SCALE : 1.35;

  if (typeof jxBuildLook === "function" && typeof drawJxHero === "function") {
    // Tạo look riêng cho đối thủ theo giới tính, trang bị và trạng thái cưỡi ngựa
    const pLook = jxBuildLook(p.sex || 0, p.eq || {}, !!p.mounted);
    if (pLook) {
      const h = drawJxHero(p.act || "st", p.dir || 0, p.actT || 0, p.x, p.y, heroScale, 1, pLook);
      if (h) {
        drawn = true;
        animHeight = Math.max(52, h);
      }
    }
  }

  // Fallback nếu chưa tải xong sprite JXLook hoặc look lỗi
  if (!drawn) {
    const gfx = typeof heroGfx === "function" ? heroGfx(p.fac, p.sex) : null;
    if (gfx && gfx.anim && typeof drawHeroAnim === "function") {
      drawn = !!drawHeroAnim(gfx.anim, p.act || "st", p.dir || 0, p.actT || 0, p.x, p.y, heroScale);
    }
    if (!drawn && gfx && gfx.anim && typeof drawAnim === "function") {
      drawn = !!drawAnim(gfx.anim, p.act || "st", p.dir || 0, p.actT || 0, p.x, p.y, heroScale);
    }
    if (!drawn && gfx && gfx.img && typeof drawSprite === "function") {
      drawSprite(typeof img === "function" ? img(gfx.img) : gfx.img, gfx.sz, p.x, p.y, 0.9, (p.dir === 2 || p.dir === 3 || p.dir === 4));
      drawn = true;
    }
    if (!drawn) {
      // Fallback vòng tròn nếu đang tải
      cx.fillStyle = p.pkMode ? "#ff4a3a" : "#4a90e2";
      cx.beginPath();
      cx.arc(p.x, p.y - 20, 14, 0, Math.PI * 2);
      cx.fill();
    }
  }

  // 4. Tên, danh hiệu và thanh máu
  const isTarget = R.pkTarget && R.pkTarget.id === p.id;
  const isEnemyPk = !!p.pkMode;
  const nameColor = isEnemyPk ? "#ff3333" : (isTarget ? "#ffd24a" : "#7fd0ff");
  const hpBarColor = isEnemyPk ? "#ff4a3a" : "#4fd04f";
  const pkPrefix = isEnemyPk ? "⚔️ " : "";
  const titleText = `${pkPrefix}${p.name} · Lv${p.lvl}${p.reborn ? ` CS${p.reborn}` : ""}`;
  const labelY = p.y - animHeight - 8;

  let subTitle = "";
  let subCol = "";
  if (p.titleStr) {
    subTitle = `«${p.titleStr}»`;
    subCol = (typeof TIER !== "undefined" && p.titleTier !== null && p.titleTier !== undefined && TIER[p.titleTier]) ? TIER[p.titleTier].c : "#ffd24a";
  } else if (p.title && typeof titleName === "function" && typeof TIER !== "undefined") {
    subTitle = `«${titleName(p.title)}»`;
    subCol = TIER[p.title[3]] ? TIER[p.title[3]].c : "#ffd24a";
  }

  const isOtherChatting = p.localChat && Date.now() < p.localChat.until;
  if (typeof label === "function") {
    if (isOtherChatting) {
      label(
        p.x,
        labelY,
        p.localChat.text,
        "#ffffff",
        11,
        p.hp !== undefined ? p.hp : 1,
        hpBarColor,
        "",
        void 0,
        void 0,
        false,
        p.realmName || null,
        p.realmColor || null,
        p.guildTitle || null
      );
    } else {
      label(
        p.x,
        labelY,
        titleText,
        nameColor,
        11,
        p.hp !== undefined ? p.hp : 1,
        hpBarColor,
        subTitle,
        subCol,
        void 0,
        false,
        p.realmName || null,
        p.realmColor || null,
        p.guildTitle || null
      );
    }
  }
}

/**
 * Xử lý gói tin bị người chơi khác tấn công
 */
function handleRemotePkHit(data) {
  if (!data) return;
  const myId = (typeof NET !== "undefined" && NET.user && NET.user.id) || ("guest_" + (typeof S !== "undefined" ? S.name : ""));
  const myName = typeof S !== "undefined" ? S.name : "";
  const isForMe = (data.toId && (data.toId === myId || data.toId === myName || data.toId === ("guest_" + myName))) ||
                  (data.toName && myName && data.toName === myName);
  if (!isForMe) return;

  // Nếu đang ở thành thị an toàn thì không nhận sát thương
  if (typeof R !== "undefined" && R.town) return;

  const dmg = Math.max(1, data.dmg | 0);
  if (typeof R !== "undefined") {
    R.life = Math.max(0, (R.life || 0) - dmg);
    R.hurtT = 0.25;
    broadcastMyPosition(true);

    // Hiển thị số sát thương nhận phải
    if (typeof addText === "function" && typeof H !== "undefined") {
      addText(H.x, H.y - 36, "-" + (typeof fmt === "function" ? fmt(dmg) : dmg), "#ff4a3a", data.crit ? 16 : 12);
    }

    if (typeof log === "function") {
      log(`<span class="bad">⚔️ Bị [${data.fromName || "Đại hiệp"}] tấn công gây <b>${dmg.toLocaleString("vi-VN")}</b> sát thương!</span>`);
    }

    // Hiệu ứng kỹ năng và âm thanh trúng đòn
    if (data.skillId && typeof SK !== "undefined" && SK[data.skillId]) {
      const skillObj = SK[data.skillId];
      const attacker = (R.otherPlayers && R.otherPlayers[data.fromId]) || { x: data.x || H.x, y: data.y || H.y };
      if (typeof skillFx === "function") {
        skillFx(attacker, H, skillObj);
      }
      if (typeof skillSfx === "function") {
        skillSfx(data.skillId);
      }
    } else if (typeof uiSfx === "function") {
      uiSfx("hurt");
    }

    // Kiểm tra tử vong
    if (R.life <= 0) {
      broadcastPkDead(data.fromId, data.fromName);
      if (typeof heroDeath === "function") {
        heroDeath();
      }
      if (typeof toast === "function") {
        toast(`☠️ Bạn đã bị [${data.fromName || "Đại hiệp"}] hạ gục!`);
      }

      // Tự động chuyển về chế độ Hòa bình
      if (typeof S !== "undefined") {
        S.pkMode = 0;
        if (typeof refreshPkBtn === "function") refreshPkBtn();
        if (typeof save === "function") save();
      }
      R.pkTarget = null;

      // Hồi sinh và di chuyển về thành an toàn sau 1 giây
      setTimeout(() => {
        R.deadT = 0;
        if (typeof goTown === "function") {
          goTown(true);
        }
        if (R.P) {
          R.life = R.P.life;
          R.mana = R.P.mana;
        }
        if (typeof broadcastMyPosition === "function") {
          broadcastMyPosition(true);
        }
        if (typeof toast === "function") {
          toast("🏛️ Trọng thương trở về thành thị an dưỡng, kích hoạt chế độ [HÒA BÌNH]!");
        }
      }, 1000);
    }
  }
}

/**
 * Xử lý thông báo có người chơi bị hạ gục trong trận PK
 */
function handleRemotePkDead(data) {
  if (!data) return;
  const killMsg = `⚔️ Đại hiệp [${data.killerName || "Ẩn danh"}] đã hạ gục [${data.victimName || "Đại hiệp"}]!`;
  if (typeof log === "function") {
    log(`<span style="color:#ff4a3a; font-weight:bold;">${killMsg}</span>`);
  }
  if (typeof toast === "function") {
    toast(killMsg);
  }

  // Nếu người bị hạ gục là mục tiêu PK hiện tại của mình -> Hủy bỏ mục tiêu
  const myId = (typeof NET !== "undefined" && NET.user && NET.user.id) || ("guest_" + (typeof S !== "undefined" ? S.name : ""));
  if (R.pkTarget && (R.pkTarget.id === data.victimId || (data.victimName && R.pkTarget.name === data.victimName))) {
    R.pkTarget = null;
  }
  if (data.victimId && R.otherPlayers && R.otherPlayers[data.victimId]) {
    R.otherPlayers[data.victimId].hp = 0;
  }
}

/**
 * Xử lý gói tin thi triển kỹ năng nhận từ người chơi khác quanh mình
 */
function handleRemotePkSkill(data) {
  if (!data || !data.fromId || !data.skillId) return;
  const myId = (typeof NET !== "undefined" && NET.user && NET.user.id) || ("guest_" + (typeof S !== "undefined" ? S.name : ""));
  if (data.fromId === myId) return;

  // Lấy người chơi phát chiêu
  const caster = (R.otherPlayers && R.otherPlayers[data.fromId]) || {
    x: data.fromX || 0,
    y: data.fromY || 0,
    dir: data.dir || 0,
    act: "at",
    actT: 0
  };

  // Cập nhật hoạt ảnh ra đòn cho người chơi đó
  caster.act = "at";
  caster.actT = 0;
  if (data.dir !== undefined) caster.dir = data.dir;

  // Xác định mục tiêu của kỹ năng (có thể là nhân vật chính hoặc người/quái khác)
  let target = null;
  if (data.toId === myId || (data.toName && typeof S !== "undefined" && data.toName === S.name)) {
    target = (typeof H !== "undefined") ? H : null;
  } else if (data.toId && R.otherPlayers && R.otherPlayers[data.toId]) {
    target = R.otherPlayers[data.toId];
  } else if (data.toX !== undefined && data.toY !== undefined) {
    target = { x: data.toX, y: data.toY };
  } else {
    // Nếu không có target cụ thể, tính target theo hướng đánh (cách caster 120px)
    const angle = ((data.dir || 0) * Math.PI) / 4;
    target = { x: caster.x + Math.sin(angle) * 120, y: caster.y - Math.cos(angle) * 120 };
  }

  const skillObj = (typeof SK !== "undefined" && SK[data.skillId]) ? SK[data.skillId] : { id: data.skillId, n: "Võ công" };

  // Hiển thị hoạt ảnh kỹ năng bay tới mục tiêu
  if (typeof skillFx === "function" && target) {
    skillFx(caster, target, skillObj);
  }

  // Âm thanh kỹ năng
  if (data.skillId && typeof skillSfx === "function") {
    skillSfx(data.skillId);
  }
}

/**
 * Gửi thông báo thi triển kỹ năng lên hệ thống Multiplayer
 */
function broadcastPkSkill(skill, target) {
  if (!PRESENCE.connected || !PRESENCE.ws || PRESENCE.ws.readyState !== WebSocket.OPEN) return;
  if (!skill || !skill.id) return;
  const myId = (typeof NET !== "undefined" && NET.user && NET.user.id) || ("guest_" + (typeof S !== "undefined" ? S.name : ""));
  const now = Date.now();

  const toId = target ? (target.id || null) : null;
  const toName = target ? (target.name || target.n || null) : null;
  const toX = target ? Math.round(target.x) : Math.round(H.x);
  const toY = target ? Math.round(target.y) : Math.round(H.y);

  const payload = {
    fromId: myId,
    fromName: (typeof S !== "undefined" && S.name) || "Đại hiệp",
    fromX: Math.round(H.x),
    fromY: Math.round(H.y),
    dir: H.dir || 0,
    toId: toId,
    toName: toName,
    toX: toX,
    toY: toY,
    skillId: skill.id,
    ts: now
  };

  const msg = {
    topic: PRESENCE.channel,
    event: "broadcast",
    payload: {
      type: "broadcast",
      event: "pk_skill",
      payload: payload
    },
    ref: "sk_" + now
  };

  try {
    PRESENCE.ws.send(JSON.stringify(msg));
  } catch (e) {}
}

/**
 * Gửi thông báo tấn công người chơi khác
 */
function broadcastPkHit(targetId, targetName, dmg, crit, skillId) {
  if (!PRESENCE.connected || !PRESENCE.ws || PRESENCE.ws.readyState !== WebSocket.OPEN) return;
  const myId = (typeof NET !== "undefined" && NET.user && NET.user.id) || ("guest_" + S.name);
  const now = Date.now();

  const payload = {
    fromId: myId,
    fromName: (typeof S !== "undefined" && S.name) || "Đại hiệp",
    toId: targetId,
    toName: targetName,
    dmg: dmg,
    crit: !!crit,
    skillId: skillId || 0,
    x: Math.round(H.x),
    y: Math.round(H.y),
    ts: now
  };

  const msg = {
    topic: PRESENCE.channel,
    event: "broadcast",
    payload: {
      type: "broadcast",
      event: "pk_hit",
      payload: payload
    },
    ref: "hit_" + now
  };

  try {
    PRESENCE.ws.send(JSON.stringify(msg));
  } catch (e) {}
}

/**
 * Gửi thông báo tử vong do bị PK
 */
function broadcastPkDead(killerId, killerName) {
  if (!PRESENCE.connected || !PRESENCE.ws || PRESENCE.ws.readyState !== WebSocket.OPEN) return;
  const myId = (typeof NET !== "undefined" && NET.user && NET.user.id) || ("guest_" + S.name);
  const now = Date.now();

  const payload = {
    killerId: killerId,
    killerName: killerName,
    victimId: myId,
    victimName: (typeof S !== "undefined" && S.name) || "Đại hiệp",
    ts: now
  };

  const msg = {
    topic: PRESENCE.channel,
    event: "broadcast",
    payload: {
      type: "broadcast",
      event: "pk_dead",
      payload: payload
    },
    ref: "dead_" + now
  };

  try {
    PRESENCE.ws.send(JSON.stringify(msg));
  } catch (e) {}
}

/**
 * Tìm đại hiệp đối thủ bật chế độ PK ở gần nhất (đang bật Đồ sát hoặc là mục tiêu PK)
 */
function findNearestPkEnemy(maxRange = 600) {
  if (!R.otherPlayers || typeof H === "undefined" || R.town) return null;
  let nearest = null;
  let minD = maxRange;
  for (const id in R.otherPlayers) {
    const p = R.otherPlayers[id];
    // Chỉ nhắm người chơi bật PK (pkMode === 1) hoặc đang là mục tiêu PK hiện tại, và máu > 0
    if ((p.pkMode || (R.pkTarget && R.pkTarget.id === p.id)) && (p.hp === undefined || p.hp > 0)) {
      const d = Math.hypot(p.x - H.x, p.y - H.y);
      if (d < minD) {
        minD = d;
        nearest = p;
      }
    }
  }
  return nearest;
}

/**
 * Vòng lặp tick mỗi frame cho Multiplayer & PK
 */
function othTick(dt) {
  updateOtherPlayers(dt);

  // 1. Khi ở chế độ TỰ ĐỘNG (Auto đánh - phím F active, tức !manualCtrl()):
  // Nếu xung quanh có người chơi bật PK (Đồ sát) -> TỰ ĐỘNG ƯU TIÊN ĐÁNH NGƯỜI BẬT PK TRƯỚC, ĐÁNH QUÁI SAU!
  const isAutoActive = typeof manualCtrl === "function" ? !manualCtrl() : (typeof S !== "undefined" && S.ctrl !== "manual");
  if (isAutoActive && !R.town && typeof H !== "undefined") {
    // Nếu chưa có mục tiêu PK hoặc mục tiêu cũ đã xa/chết/offline -> Quét tìm đối thủ PK gần nhất
    if (!R.pkTarget || !R.otherPlayers[R.pkTarget.id] || (R.pkTarget.hp !== undefined && R.pkTarget.hp <= 0)) {
      const pkEnemy = findNearestPkEnemy(650);
      if (pkEnemy) {
        R.pkTarget = pkEnemy;
        // Tự bật PK nếu đang hòa bình để trả đòn/tấn công
        if (typeof S !== "undefined" && !S.pkMode) {
          S.pkMode = 1;
          refreshPkBtn();
          broadcastMyPosition(true);
          if (typeof save === "function") save();
          if (typeof toast === "function") {
            toast(`⚔️ Phát hiện [${pkEnemy.name}] bật Đồ sát! Auto chuyển mục tiêu sang PK!`);
          }
        }
      }
    }
  }

  // 2. Kiểm tra tính hợp lệ của mục tiêu PK hiện tại
  if (R.pkTarget) {
    // Nếu mục tiêu không còn trong map hoặc đã offline hoặc máu đã hết
    if (!R.otherPlayers || !R.otherPlayers[R.pkTarget.id] || (R.pkTarget.hp !== undefined && R.pkTarget.hp <= 0)) {
      R.pkTarget = null;
    }
  }

  // 3. Tự động đuổi theo và đánh mục tiêu PK nếu hợp lệ và không ở trong thành
  if (R.pkTarget && !R.town && typeof H !== "undefined") {
    // Nếu đang có mục tiêu PK, huỷ mục tiêu quái để không bị phân tâm
    if (R.manTgt) R.manTgt = null;
    if (R.moveTo && !R.moveTo.id) R.moveTo = null;

    const tgt = R.pkTarget;
    const dist = Math.hypot(tgt.x - H.x, tgt.y - H.y);

    // Lấy tầm đánh của kỹ năng hiện tại
    const skill = (R.P && (R.P.main || R.P.basic)) || { rad: 120, rate: 1.2 };
    const attackRange = Math.max(90, (skill.rad || 110));

    // Nếu ở ngoài tầm đánh: Tự động chạy tiếp cận mục tiêu
    if (dist > attackRange) {
      if (!(R.stunT > 0) && typeof obsSteer === "function" && typeof curSpeed === "function") {
        const speed = 150 * curSpeed() * (R.slowT > 0 ? 0.5 : 1) * dt;
        obsSteer(H, tgt.x, tgt.y, speed);
      }
    } else {
      // Trong tầm đánh: Dừng di chuyển và tung chiêu
      if (typeof dirOf === "function") {
        H.dir = dirOf(tgt.x - H.x, tgt.y - H.y);
      }
      H.face = tgt.x >= H.x ? 1 : -1;
      
      R.pkCd = (R.pkCd || 0) - dt;
      if (R.pkCd <= 0 && !(R.stunT > 0)) {
        pkExecuteAttack(tgt);
      }
    }
  }
}

/**
 * Thực hiện đòn tấn công vào đối thủ PK
 */
function pkExecuteAttack(tgt) {
  if (!tgt || R.town) return;
  if (typeof R.P === "undefined") return;

  const skill = R.P.main || R.P.basic || { id: 0, n: "Đánh thường", rad: 60, rate: 1.2 };
  
  // Xoay mặt và hoạt ảnh tấn công
  H.face = tgt.x >= H.x ? 1 : -1;
  if (typeof dirOf === "function") {
    H.dir = dirOf(tgt.x - H.x, tgt.y - H.y);
  }
  H.act = "at";
  H.actT = 0;

  // Tính sát thương dựa trên lực tấn công của nhân vật
  const baseDmg = (R.P.atk && R.P.atk.max) ? (R.P.atk.min + Math.random() * (R.P.atk.max - R.P.atk.min)) : (S.lvl * 35 + 50);
  const isCrit = Math.random() < ((R.P.crit || 10) / 100);
  const dmg = Math.round(baseDmg * (isCrit ? 1.5 : 1.0));

  // Cập nhật máu đối thủ phía client hiển thị
  tgt.hp = Math.max(0, (tgt.hp !== undefined ? tgt.hp : 1) - (dmg / Math.max(100, S.lvl * 200)));

  // Hiển thị hiệu ứng và số sát thương
  if (typeof addText === "function") {
    addText(tgt.x, tgt.y - 36, "-" + (typeof fmt === "function" ? fmt(dmg) : dmg), isCrit ? "#ff3333" : "#ffcc00", isCrit ? 16 : 13);
  }
  if (typeof skillFx === "function") {
    skillFx(H, tgt, skill);
  }
  if (skill.id && typeof skillSfx === "function") {
    skillSfx(skill.id);
  } else if (typeof npcSfx === "function") {
    const gfx = typeof heroGfx === "function" ? heroGfx() : null;
    npcSfx(gfx && gfx.anim, "at", 0.4);
  }

  // Phát gói tin sát thương lên server và phát ngay trạng thái act: 'at'
  broadcastPkHit(tgt.id, tgt.name, dmg, isCrit, skill.id);
  broadcastMyPosition(true);

  // Đặt thời gian hồi đòn độc lập
  const cd = 1 / (skill.rate || 1.2);
  R.pkCd = cd;
  R.atkT = cd;
  return cd;
}

/**
 * Chuyển đổi trạng thái PK (Hòa bình / Đồ sát)
 */
function togglePkMode() {
  if (typeof S === "undefined") return;
  S.pkMode = S.pkMode ? 0 : 1;
  refreshPkBtn();
  broadcastMyPosition(true);
  if (typeof save === "function") save();
  
  if (S.pkMode) {
    if (typeof toast === "function") toast("⚔️ Chế độ PK: [ĐỒ SÁT] kích hoạt! Có thể tấn công đại hiệp khác.");
  } else {
    if (typeof toast === "function") toast("🕊️ Chế độ PK: [HÒA BÌNH] kích hoạt!");
    R.pkTarget = null;
  }
}

/**
 * Cập nhật giao diện nút PK trên Top Control
 */
function refreshPkBtn() {
  const btn = document.getElementById("pkBtn");
  if (!btn) return;
  const isPk = typeof S !== "undefined" && !!S.pkMode;
  btn.textContent = isPk ? "⚔️ Đồ sát" : "🕊️ Hòa bình";
  btn.classList.toggle("on", isPk);
  btn.style.color = isPk ? "#ff4a3a" : "#7fd0ff";
  btn.style.borderColor = isPk ? "#ff4a3a" : "";
}

// Bắt sự kiện click chuột / chạm vào đại hiệp khác trên canvas để chọn mục tiêu PK
function initPlayerTargeting() {
  const cv = document.getElementById("arena");
  if (!cv) return;
  cv.addEventListener("pointerdown", (e) => {
    if (typeof CAM === "undefined" || typeof uiScale !== "function") return;
    const rect = cv.getBoundingClientRect();
    const s = uiScale();
    const clickX = (e.clientX - rect.left) / s + CAM.x;
    const clickY = (e.clientY - rect.top) / s + CAM.y;

    const targetPlayer = findNearbyPlayerAt(clickX, clickY);
    if (targetPlayer) {
      // Tự động bật chế độ Đồ sát nếu người chơi đang ở chế độ Hòa bình
      if (typeof S !== "undefined" && !S.pkMode) {
        S.pkMode = 1;
        refreshPkBtn();
        broadcastMyPosition(true);
        if (typeof save === "function") save();
        if (typeof toast === "function") {
          toast(`⚔️ Tự động chuyển sang [ĐỒ SÁT] để PK [${targetPlayer.name}]!`);
        }
      } else {
        if (typeof toast === "function") {
          toast(`🎯 Đã chọn mục tiêu PK: [${targetPlayer.name}]`);
        }
      }

      R.pkTarget = targetPlayer;
      // Dừng mục tiêu nhặt đồ / di chuyển tự do cũ
      R.moveTo = null;
    }
  }, true); // useCapture để ưu tiên bắt chọn target trước khi di chuyển
}

// Khởi chạy khi tài nguyên game đã sẵn sàng
window.addEventListener("load", () => {
  setTimeout(() => {
    initRealtimePresence();
    initPlayerTargeting();
    refreshPkBtn();
    const pkBtn = document.getElementById("pkBtn");
    if (pkBtn) {
      pkBtn.onclick = togglePkMode;
    }
    // Vòng lặp phát tọa độ mỗi 250ms
    setInterval(() => {
      broadcastMyPosition();
    }, 250);
  }, 1000);
});

/**
 * Phát tin nhắn Chat Lân cận cho người chơi xung quanh và hiển thị trên đầu
 */
function sendLocalChat(text) {
  if (!text) return;
  text = String(text).trim().slice(0, 150);
  if (!text) return;

  const myId = (typeof NET !== "undefined" && NET.user && NET.user.id) || ("guest_" + (typeof S !== "undefined" ? S.name : ""));
  const myName = (typeof S !== "undefined" && S.name) || "Đại hiệp";
  const myFac = (typeof S !== "undefined" && typeof FAC !== "undefined" && FAC[S.fac]) ? FAC[S.fac].n : "";
  const myLvl = (typeof S !== "undefined" && S.lvl) | 0;
  const now = Date.now();
  const currentZone = (typeof R !== "undefined" && R && R.town) ? "town" : ("stage_" + Math.floor(((typeof S !== "undefined" ? S.stage : 1) - 1) / 10));

  // 1. Hiển thị trên đầu nhân vật chính trong 5 giây
  if (typeof H !== "undefined" && H) {
    H.localChat = { text: text, until: now + 5000 };
  }

  // 2. Lưu vào danh sách tin lân cận của CHAT
  if (typeof CHAT !== "undefined" && CHAT) {
    if (!CHAT.nearMsgs) CHAT.nearMsgs = [];
    CHAT.nearMsgs.push({
      cid: typeof chatCid === "function" ? chatCid() : myId,
      name: myName,
      fac: myFac,
      lvl: myLvl,
      msg: text,
      ts: now
    });
    if (CHAT.nearMsgs.length > 50) CHAT.nearMsgs.shift();
    if (typeof chatRender === "function") chatRender();
  }
  if (typeof u20LogDraw === "function") u20LogDraw();

  // 3. Phát sóng qua WebSocket Realtime
  if (PRESENCE.connected && PRESENCE.ws && PRESENCE.ws.readyState === WebSocket.OPEN) {
    const payload = {
      fromId: myId,
      fromName: myName,
      fac: myFac,
      lvl: myLvl,
      x: typeof H !== "undefined" ? Math.round(H.x) : 0,
      y: typeof H !== "undefined" ? Math.round(H.y) : 0,
      zone: currentZone,
      text: text,
      ts: now
    };

    const msg = {
      topic: PRESENCE.channel,
      event: "broadcast",
      payload: {
        type: "broadcast",
        event: "chat_local",
        payload: payload
      },
      ref: "lc_" + now
    };

    try {
      PRESENCE.ws.send(JSON.stringify(msg));
    } catch (e) {}
  }
}

/**
 * Xử lý tin nhắn Chat Lân cận từ người chơi khác
 */
function handleRemoteLocalChat(data) {
  if (!data || !data.text) return;

  const myId = (typeof NET !== "undefined" && NET.user && NET.user.id) || ("guest_" + (typeof S !== "undefined" ? S.name : ""));
  if (data.fromId === myId) return;

  const currentZone = (typeof R !== "undefined" && R && R.town) ? "town" : ("stage_" + Math.floor(((typeof S !== "undefined" ? S.stage : 1) - 1) / 10));
  if (data.zone && data.zone !== currentZone) return;

  const now = Date.now();

  // 1. Gán nội dung chat trên đầu nhân vật đối thủ trong 5 giây
  if (typeof R !== "undefined" && R.otherPlayers && R.otherPlayers[data.fromId]) {
    R.otherPlayers[data.fromId].localChat = { text: data.text, until: now + 5000 };
  }

  // 2. Thêm vào danh sách tin nhắn lân cận
  if (typeof CHAT !== "undefined" && CHAT) {
    if (!CHAT.nearMsgs) CHAT.nearMsgs = [];
    CHAT.nearMsgs.push({
      cid: data.fromId,
      name: data.fromName || "Đại hiệp",
      fac: data.fac || "",
      lvl: data.lvl || 1,
      msg: data.text,
      ts: data.ts || now
    });
    if (CHAT.nearMsgs.length > 50) CHAT.nearMsgs.shift();

    if (CHAT.chan !== "near") {
      CHAT.nearUnread = (CHAT.nearUnread || 0) + 1;
    }
    if (typeof chatRender === "function") chatRender();
  }
  if (typeof u20LogDraw === "function") u20LogDraw();
}
