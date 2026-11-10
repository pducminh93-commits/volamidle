"use strict";

/**
 * HỆ THỐNG TU TIÊN / CẢNH GIỚI & ĐỘT PHÁ - JX2
 * 8 Đại Kỳ - 72 Tiểu Cảnh Giới
 */

const REALM_MAJORS = [
  // --- 8 BẬC TIỂU THÀNH GIANG HỒ (72 Tầng: 8 bậc x 9 tầng) ---
  {
    id: "so-nhap",
    name: "Sơ Nhập Giang Hồ",
    desc: "Mới bước chân vào giang hồ, bắt đầu rèn luyện căn bản võ học.",
    color: "#9ee7ff",
    req: { lv: 10, reborn: 0, knb: 100, gold: 1000 }
  },
  {
    id: "so-khai",
    name: "Sơ Khai Kinh Mạch",
    desc: "Đả thông kinh mạch, nội lực sơ phát, thân thủ bắt đầu vững vàng.",
    color: "#75e6a6",
    req: { lv: 100, reborn: 0, knb: 200, gold: 5000 }
  },
  {
    id: "tieu-thanh",
    name: "Tiểu Thành Khí Tông",
    desc: "Nội công tụ tại đan điền, chiêu thức uyển chuyển, danh tiếng chớm nở.",
    color: "#e8d76d",
    req: { lv: 150, reborn: 1, knb: 100, gold: 10000 }
  },
  {
    id: "hanh-tau",
    name: "Hành Tẩu Giang Hồ",
    desc: "Bản lĩnh vững vàng, một thân một kiếm ngao du bốn bể hành hiệp trượng nghĩa.",
    color: "#f2a766",
    req: { lv: 150, reborn: 2, knb: 200, gold: 20000 }
  },
  {
    id: "danh-chan",
    name: "Danh Chấn Tứ Hải",
    desc: "Uy danh vang dội khắp đại giang nam bắc, môn phái kiêng nể.",
    color: "#d48cff",
    req: { lv: 150, reborn: 3, knb: 300, gold: 30000 }
  },
  {
    id: "ngu-hanh",
    name: "Ngũ Hành Hợp Nhất",
    desc: "Thấu hiểu ngũ hành tương sinh tương khắc, công thủ toàn diện.",
    color: "#8a9cff",
    req: { lv: 150, reborn: 4, knb: 400, gold: 40000 }
  },
  {
    id: "y-kiem",
    name: "Ý Kiếm Tương Thông",
    desc: "Khí kiếm hợp nhất, chiêu chưa xuất mà ý đã tới.",
    color: "#ff7ea8",
    req: { lv: 150, reborn: 5, knb: 500, gold: 50000 }
  },
  {
    id: "tong-su",
    name: "Nhất Đại Tông Sư",
    desc: "Khai tông lập phái, võ học đạt cảnh giới đại thành tôn làm tông sư.",
    color: "#ffd66e",
    req: { lv: 150, reborn: 6, knb: 600, gold: 60000 }
  },

  // --- 8 BẬC ĐẠI THÀNH THẦN THOẠI (Tuyệt Đỉnh -> Thần Thoại) ---
  {
    id: "tuyet-dinh",
    name: "Tuyệt Đỉnh Cao Thủ",
    desc: "Vượt qua thập đại khảo nghiệm, võ công cái thế trấn áp quần hùng.",
    color: "#ff6045",
    req: { lv: 150, reborn: 7, knb: 700, gold: 70000 }
  },
  {
    id: "vo-song",
    name: "Vô Song Hiệp Khách",
    desc: "Thân thủ phi phàm, trong giang hồ hiếm có đối thủ xứng tầm.",
    color: "#52e5ff",
    req: { lv: 150, reborn: 8, knb: 800, gold: 80000 }
  },
  {
    id: "de-nhat",
    name: "Thiên Hạ Đệ Nhất",
    desc: "Danh chấn võ lâm, độc bá lôi đài, vang danh toàn cõi trung nguyên.",
    color: "#6effb8",
    req: { lv: 150, reborn: 9, knb: 900, gold: 90000 }
  },
  {
    id: "cau-bai",
    name: "Độc Cô Cầu Bại",
    desc: "Cầm kiếm tung hoành giang hồ mà mong một lần bại không được.",
    color: "#fff176",
    req: { lv: 150, reborn: 10, knb: 1000, gold: 100000 }
  },
  {
    id: "vo-thanh",
    name: "Võ Thánh Chí Tôn",
    desc: "Võ công siêu phàm nhập thánh, khí kình xuất ra vỡ đá xẻ non.",
    color: "#ffb74d",
    req: { lv: 150, reborn: 11, knb: 1100, gold: 110000 }
  },
  {
    id: "huyen-thoai",
    name: "Huyền Thoại Võ Lâm",
    desc: "Tên tuổi đi vào sử sách giang hồ, muôn người kính ngưỡng.",
    color: "#e07bff",
    req: { lv: 150, reborn: 12, knb: 1200, gold: 120000 }
  },
  {
    id: "thien-ngoai",
    name: "Thiên Ngoại Hóa Cảnh",
    desc: "Siêu thoát phàm tục, vô chiêu thắng hữu chiêu.",
    color: "#ff5285",
    req: { lv: 150, reborn: 13, knb: 1300, gold: 130000 }
  },
  {
    id: "than-thoai",
    name: "Võ Lâm Thần Thoại",
    desc: "Cảnh giới chí tôn vô thượng, thần thoại ngàn năm lưu truyền của võ lâm.",
    color: "#ffe066",
    singleStage: true, // Tầng tối thượng và duy nhất
    req: { lv: 150, reborn: 15, knb: 1500, gold: 150000 }
  }
];

// Tạo danh mục 136 bậc cảnh giới
const REALM_CATALOG = [];
let _curCatalogIdx = 0;
for (let mi = 0; mi < REALM_MAJORS.length; mi++) {
  const m = REALM_MAJORS[mi];
  const totalStages = m.singleStage ? 1 : 9;
  for (let stage = 1; stage <= totalStages; stage++) {
    const isSingle = m.singleStage;
    const stageName = isSingle ? m.name : `${m.name} ${stage}`;
    const stageTitle = isSingle ? m.name : `${m.name} Tầng ${stage}`;
    REALM_CATALOG.push({
      index: _curCatalogIdx++,
      majorIndex: mi,
      stage,
      totalStages,
      majorId: m.id,
      majorName: m.name,
      name: stageName,
      displayName: stageName,
      title: stageTitle,
      desc: m.desc,
      color: m.color,
      req: { ...m.req }
    });
  }
}

// Cấu hình vòng sáng tương ứng 16 Đại Kỳ (chuẩn frame assets từ JX69)
const REALM_RINGS = [
  // 1. Luyện Khí
  {
    id: "ID_017559d7",
    name: "Huyền Lam Tinh Hoàn",
    frameCount: 30,
    intervalMs: 80,
    width: 149,
    height: 175,
    pivotX: 72,
    pivotY: 120,
    scale: 0.85
  },
  // 2. Trúc Cơ
  {
    id: "ID_22d35131",
    name: "Mộc Linh Du Ảnh",
    frameCount: 30,
    intervalMs: 66,
    width: 128,
    height: 128,
    pivotX: 66,
    pivotY: 100,
    scale: 0.95
  },
  // 3. Kết Đan
  {
    id: "ID_09da0d8e",
    name: "Kim Liên Nhật Ấn",
    frameCount: 15,
    intervalMs: 60,
    width: 156,
    height: 135,
    pivotX: 78,
    pivotY: 89,
    scale: 0.9
  },
  // 4. Nguyên Anh
  {
    id: "ID_49ea4448",
    name: "Băng Lam U Giới",
    frameCount: 15,
    intervalMs: 35,
    width: 145,
    height: 128,
    pivotX: 72,
    pivotY: 80,
    scale: 0.9
  },
  // 5. Hóa Thần
  {
    id: "ID_72f95f99",
    name: "Tử Phong Huyền Hoàn",
    frameCount: 15,
    intervalMs: 45,
    width: 230,
    height: 210,
    pivotX: 110,
    pivotY: 130,
    scale: 0.72
  },
  // 6. Luyện Hư
  {
    id: "ID_123aebd7",
    name: "Lôi Lam Pháp Trận",
    frameCount: 20,
    intervalMs: 40,
    width: 128,
    height: 128,
    pivotX: 64,
    pivotY: 84,
    scale: 0.95
  },
  // 7. Hợp Thể
  {
    id: "ID_b9ff4c93",
    name: "Tử U Linh Toàn",
    frameCount: 10,
    intervalMs: 80,
    width: 168,
    height: 149,
    pivotX: 84,
    pivotY: 80,
    scale: 0.9
  },
  // 8. Đại Thừa
  {
    id: "ID_e0db7f50",
    name: "Kim Luân Càn Khôn",
    frameCount: 10,
    intervalMs: 120,
    width: 156,
    height: 149,
    pivotX: 76,
    pivotY: 115,
    scale: 0.95
  },
  // 9. Độ Kiếp
  {
    id: "ID_607cb7b5",
    name: "Hỏa Kim Long Hoàn",
    frameCount: 20,
    intervalMs: 80,
    width: 162,
    height: 190,
    pivotX: 79,
    pivotY: 114,
    scale: 0.95
  },
  // 10. Ngụy Tiên
  {
    id: "ID_4b14b677",
    name: "Thanh Lam Tinh Hoàn",
    frameCount: 30,
    intervalMs: 80,
    width: 155,
    height: 170,
    pivotX: 76,
    pivotY: 119,
    scale: 0.95
  },
  // 11. Tán Tiên
  {
    id: "ID_d7ef2375",
    name: "Hỏa Lam Tinh Hoàn",
    frameCount: 30,
    intervalMs: 80,
    width: 153,
    height: 173,
    pivotX: 74,
    pivotY: 121,
    scale: 0.95
  },
  // 12. Chân Tiên
  {
    id: "ID_2454acc2",
    name: "Hoàng Tinh Pháp Giới",
    frameCount: 15,
    intervalMs: 35,
    width: 128,
    height: 128,
    pivotX: 63,
    pivotY: 86,
    scale: 1.0
  },
  // 13. Kim Tiên
  {
    id: "ID_a2c39d72",
    name: "Kim Diễm Pháp Đài",
    frameCount: 15,
    intervalMs: 60,
    width: 150,
    height: 120,
    pivotX: 75,
    pivotY: 74,
    scale: 1.0
  },
  // 14. Thái Ất Ngọc Tiên
  {
    id: "ID_fb5d5651",
    name: "Tử Liên Huyền Tâm",
    frameCount: 15,
    intervalMs: 50,
    width: 280,
    height: 240,
    pivotX: 139,
    pivotY: 132,
    scale: 0.75
  },
  // 15. Đại La Kim Tiên
  {
    id: "ID_99f79396",
    name: "Huyền Không Pháp Trận",
    frameCount: 20,
    intervalMs: 40,
    width: 256,
    height: 256,
    pivotX: 131,
    pivotY: 159,
    scale: 0.8
  },
  // 16. Đạo Tổ
  {
    id: "ID_81f120b8",
    name: "Kim Môn Pháp Trận",
    frameCount: 10,
    intervalMs: 150,
    width: 640,
    height: 480,
    pivotX: 318,
    pivotY: 274,
    scale: 0.35
  }
];

// Bộ nhớ đệm nạp ảnh frame vòng sáng (lazy-loading an toàn)
const _REALM_RING_CACHE = new Map();

function _getRealmRingImg(src) {
  let im = _REALM_RING_CACHE.get(src);
  if (im) return im;
  im = new Image();
  im.decoding = "async";
  im.src = src;
  _REALM_RING_CACHE.set(src, im);
  return im;
}

/**
 * Vẽ vòng sáng cảnh giới hoạt ảnh dưới chân nhân vật
 * @param {CanvasRenderingContext2D} cx - Canvas 2D context
 * @param {number} x - Tọa độ X chân nhân vật
 * @param {number} y - Tọa độ Y chân nhân vật
 * @param {number|object} realmIdxOrActor - realmIndex (0-136) hoặc đối tượng người chơi
 * @param {number} customScale - Tỉ lệ phóng to/thu nhỏ
 */
function drawRealmRingAnim(cx, x, y, realmIdxOrActor, customScale = 1.0) {
  // Đã loại bỏ toàn bộ vòng sáng danh vị dưới chân theo yêu cầu
  return false;
}

// Lấy chỉ số cảnh giới hiện tại (tier index: 0 đến 72)
function getRealmIndex(s) {
  s = s || (typeof S !== "undefined" ? S : null);
  if (!s) return 0;
  if (typeof s.realmIndex === "number") return Math.max(0, Math.min(REALM_CATALOG.length, s.realmIndex | 0));
  if (s.realm && typeof s.realm.index === "number") return Math.max(0, Math.min(REALM_CATALOG.length, s.realm.index | 0));
  return 0;
}

// Lấy thông tin cảnh giới hiện tại
function getCurrentRealm(s) {
  const idx = getRealmIndex(s);
  if (idx <= 0) return null;
  return REALM_CATALOG[idx - 1] || REALM_CATALOG[0];
}

// Lấy thông tin cảnh giới kế tiếp để đột phá
function getNextRealm(s) {
  const idx = getRealmIndex(s);
  if (idx >= REALM_CATALOG.length) return null;
  return REALM_CATALOG[idx];
}

// Tính tổng chỉ số cộng thêm vĩnh viễn theo cảnh giới hiện tại
function getRealmStats(s) {
  const i = getRealmIndex(s);
  if (i <= 0) {
    return {
      atk: 0,
      def: 0,
      hp: 0,
      mp: 0,
      hit: 0,
      dodge: 0,
      crit: 0,
      allRes: 0
    };
  }
  return {
    atk: i * 2,
    def: Math.round(i * 2.4),
    hp: i * 28,
    mp: i * 14,
    hit: i * 3,
    dodge: i * 2,
    crit: Number((i * 0.05).toFixed(2)),
    allRes: Number((i * 0.08).toFixed(2))
  };
}

// Danh hiệu cảnh giới cao nhất của nhân vật
function getRealmTitle(s) {
  const cur = getCurrentRealm(s);
  if (!cur) return null;
  return {
    name: cur.name,
    color: cur.color,
    tier: cur.majorIndex + 1
  };
}

// Kiểm tra điều kiện đột phá
function checkRealmAdvance(s) {
  s = s || (typeof S !== "undefined" ? S : null);
  if (!s) return { ok: false, msg: "Không có dữ liệu nhân vật" };
  const next = getNextRealm(s);
  if (!next) return { ok: false, msg: "Đã đạt cảnh giới tối cao - Đạo Tổ (Bất Tử Chi Thân)!" };

  // Tự động khôi phục nếu ngân lượng hoặc KNB bị âm do lỗi giao dịch trước đó
  if (s.gold < 0) s.gold = 0;
  if (s.knb < 0) s.knb = 0;

  const req = next.req;
  const curLvl = s.lvl | 0;
  const curReborn = (typeof rebornN === "function") ? rebornN() : (s.rw && s.rw.stat ? (s.rw.stat.reborn | 0) : (s.reborn | 0));
  const curGold = Math.max(0, s.gold | 0);
  const curKnb = Math.max(0, s.knb | 0);

  const fails = [];
  if (curReborn < req.reborn) {
    fails.push(`Chuyển sinh ${req.reborn} (hiện CS ${curReborn})`);
  }
  if (curLvl < req.lv) {
    fails.push(`Cấp độ ${req.lv} (hiện cấp ${curLvl})`);
  }
  if (curKnb < req.knb) {
    fails.push(`${req.knb} KNB (hiện có ${curKnb} KNB)`);
  }
  if (curGold < req.gold) {
    fails.push(`${fmtL(req.gold)} lượng (hiện có ${fmtL(curGold)})`);
  }

  return {
    ok: fails.length === 0,
    fails,
    next,
    req
  };
}

// Thực hiện đột phá
function advanceRealm() {
  if (typeof S === "undefined" || !S || !S.fac) return false;
  const chk = checkRealmAdvance(S);
  if (!chk.ok) {
    if (chk.fails && chk.fails.length) {
      toast("Chưa đủ điều kiện: " + chk.fails.join(" · "));
    } else {
      toast(chk.msg || "Không thể đột phá");
    }
    return false;
  }

  const next = chk.next;
  const req = chk.req;

  // Trừ tài nguyên
  S.gold = Math.max(0, (S.gold | 0) - req.gold);
  S.knb = Math.max(0, (S.knb | 0) - req.knb);
  const newIndex = next.index + 1;
  S.realmIndex = newIndex;
  S.realm = {
    index: newIndex,
    lastAdvance: Date.now()
  };

  // 1. Âm thanh và hiệu ứng
  if (typeof uiSfx === "function") uiSfx("levelup");
  if (typeof toast === "function") toast(`✨ Đột phá thành công [${next.displayName}]!`);

  // 2. Thông báo Chat Giang Hồ / Server Feed
  const feedMsg = `Đột Phá [${next.displayName}] Thành Công`;
  if (typeof log === "function") {
    log(`<b style="color:${next.color}; font-size:13px;">🌟 [Võ Lâm] Chúc mừng <span style="color:#ffd24a">${esc(S.name || "Đại hiệp")}</span> đã vang danh [${next.displayName}]!</b>`);
  }
  if (typeof sendWorldBroadcast === "function") {
    sendWorldBroadcast(`🌟 Chúc mừng [${S.name || "Đại hiệp"}] vừa vang danh [${next.displayName}]!`);
  }

  // 3. Recalc chỉ số và cập nhật look
  if (typeof R !== "undefined") {
    R.dirty = true;
  }
  if (typeof recalc === "function") recalc();
  if (typeof save === "function") save();
  if (typeof refresh === "function") refresh();

  // Mở lại modal để xem cập nhật
  openRealmModal();
  return true;
}

// Giao diện Tu Tiên Modal
function openRealmModal() {
  if (typeof S === "undefined" || !S || !S.fac) return;
  const cur = getCurrentRealm(S);
  const next = getNextRealm(S);
  const curIdx = getRealmIndex(S);
  const st = getRealmStats(S);
  const chk = checkRealmAdvance(S);

  if (S.gold < 0) S.gold = 0;
  if (S.knb < 0) S.knb = 0;
  const curReborn = (typeof rebornN === "function") ? rebornN() : (S.rw && S.rw.stat ? (S.rw.stat.reborn | 0) : 0);
  const curLvl = S.lvl | 0;
  const curKnb = Math.max(0, S.knb | 0);
  const curGold = Math.max(0, S.gold | 0);

  // Render lưới 16 Đại Kỳ (Chia 2 tab hoặc nhóm: Phàm Giới & Tiên Giới)
  const isImmortalSection = cur ? cur.majorIndex >= 8 : false;

  const renderGridSection = (startIdx, endIdx, title) => {
    const boxes = REALM_MAJORS.slice(startIdx, endIdx).map((m, relativeIdx) => {
      const realMajorIdx = startIdx + relativeIdx;
      const isCurrent = cur && cur.majorIndex === realMajorIdx;
      const isPassed = cur && cur.majorIndex > realMajorIdx;
      const cls = isCurrent ? "on" : (isPassed ? "done" : "");
      const totalS = m.singleStage ? 1 : 9;
      const statusTxt = isPassed ? "✓ Viên mãn" : (isCurrent ? (m.singleStage ? "Đạt Đạo Tổ" : `Tầng ${cur.stage}/${totalS}`) : "Chưa đạt");
      return `<div class="realm-m-box ${cls}" style="border: 1px solid ${m.color}55; padding: 5px 6px; border-radius: 4px; text-align: center; background: ${isCurrent ? m.color + '22' : '#14181a'};">
        <b style="color:${m.color}; display:block; font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${m.name}</b>
        <small style="color:#aaa; font-size:10px;">${statusTxt}</small>
      </div>`;
    }).join("");

    return `
      <div style="margin-bottom:6px;">
        <span style="font-size:11px; color:#88c; font-weight:bold; display:block; margin-bottom:4px;">${title}</span>
        <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:5px;">
          ${boxes}
        </div>
      </div>
    `;
  };

  const mortalGridHtml = renderGridSection(0, 8, "⚔️ Bát Đại Giang Hồ (Sơ Nhập ➔ Nhất Đại Tông Sư)");
  const immortalGridHtml = renderGridSection(8, 16, "🌟 Thần Thoại Võ Lâm (Tuyệt Đỉnh ➔ Võ Lâm Thần Thoại)");

  // Điều kiện đột phá tiếp theo
  let reqHtml = "";
  if (next) {
    const r = next.req;
    const rbOk = curReborn >= r.reborn;
    const lvOk = curLvl >= r.lv;
    const knbOk = curKnb >= r.knb;
    const goldOk = curGold >= r.gold;

    reqHtml = `
      <div style="background:#13181b; border:1px solid #334; border-radius:6px; padding:10px; margin-top:8px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <b style="color:#e0d8b0; font-size:13px;">Cảnh giới kế tiếp: <span style="color:${next.color}">✦ ${next.displayName} ✦</span></b>
          <span style="font-size:11px; color:#888;">(Bậc ${next.index + 1}/${REALM_CATALOG.length})</span>
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px; font-size:12px;">
          <span style="color:${rbOk ? '#6fd46a' : '#ff5a3c'}">
            ${rbOk ? '✓' : '✗'} Chuyển sinh: <b>${r.reborn > 0 ? `CS ${r.reborn}` : 'Không yêu cầu'}</b> ${r.reborn > 0 ? `(hiện CS ${curReborn})` : ''}
          </span>
          <span style="color:${lvOk ? '#6fd46a' : '#ff5a3c'}">
            ${lvOk ? '✓' : '✗'} Cấp độ: <b>Lv ${r.lv}</b> (hiện Lv ${curLvl})
          </span>
          <span style="color:${knbOk ? '#6fd46a' : '#ff5a3c'}">
            ${knbOk ? '✓' : '✗'} KNB: <b>${r.knb}</b> (có ${curKnb})
          </span>
          <span style="color:${goldOk ? '#6fd46a' : '#ff5a3c'}">
            ${goldOk ? '✓' : '✗'} Ngân lượng: <b>${fmtL(r.gold)}</b> (có ${fmtL(curGold)})
          </span>
        </div>
        <p style="margin:8px 0 0 0; font-size:11px; color:#aaa; font-style:italic;">"${next.desc}"</p>
      </div>
    `;
  } else {
    reqHtml = `
      <div style="background:#13181b; border:1px solid #ffd24a; border-radius:6px; padding:12px; margin-top:8px; text-align:center;">
        <b style="color:#ffd24a; font-size:14px;">👑 ĐÃ ĐẠT CẢNH GIỚI CHÍ TÔN - VÕ LÂM THẦN THOẠI</b>
        <p style="margin:4px 0 0 0; font-size:12px; color:#aaa;">Cảnh giới chí tôn vô thượng · Danh xưng lưu truyền thiên cổ!</p>
      </div>
    `;
  }

  // Danh sách chỉ số đã được cộng thêm
  const statListHtml = `
    <div style="background:#121618; border:1px solid #2a3338; border-radius:6px; padding:10px; margin-top:8px;">
      <b style="color:#ffd24a; font-size:12px; display:block; margin-bottom:6px;">⚡ TỔNG THUỘC TÍNH VÕ HỌC TÍCH LŨY (${curIdx}/${REALM_CATALOG.length} Bậc)</b>
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:4px; font-size:12px;">
        <span>Công kích: <b style="color:#7fd0ff">+${st.atk}</b></span>
        <span>Phòng thủ: <b style="color:#7fd0ff">+${st.def}</b></span>
        <span>Sinh lực tối đa: <b style="color:#6fd46a">+${st.hp}</b></span>
        <span>Nội lực tối đa: <b style="color:#5fb8ff">+${st.mp}</b></span>
        <span>Chính xác: <b style="color:#ffd24a">+${st.hit}</b></span>
        <span>Né tránh: <b style="color:#ffd24a">+${st.dodge}</b></span>
        <span>Chí mạng: <b style="color:#ff7a2a">+${st.crit}%</b></span>
        <span>Kháng tất cả: <b style="color:#c77bff">+${st.allRes}%</b></span>
      </div>
    </div>
  `;

  const html = `
    <div class="realm-modal-root" style="max-width:560px; margin:0 auto; font-family:sans-serif;">
      <div style="text-align:center; padding:8px 0; border-bottom:1px solid #333;">
        <h3 style="margin:0; color:#ffd24a; font-size:18px; letter-spacing:1px;">⚔️ DANH VỊ GIANG HỒ ⚔️</h3>
        <p style="margin:4px 0 0 0; font-size:12px; color:#bbb;">Luyện khí dưỡng thần · Đả thông kinh mạch · Danh chấn võ lâm</p>
      </div>

      <div style="margin:10px 0; background:linear-gradient(180deg, #182226 0%, #111618 100%); border:1px solid ${cur ? cur.color : '#555'}; border-radius:8px; padding:12px; text-align:center;">
        <span style="font-size:11px; text-transform:uppercase; color:#888; letter-spacing:1px;">DANH VỊ HIỆN TẠI</span>
        <h2 style="margin:4px 0; font-size:22px; color:${cur ? cur.color : '#eee'}; text-shadow:0 0 10px ${cur ? cur.color + '66' : '#000'};">
          ${cur ? cur.name : 'Vô Danh Tiểu Tốt'}
        </h2>
        <span style="display:inline-block; font-size:11px; color:#ffd24a; background:#0008; padding:2px 10px; border-radius:12px; border:1px solid #ffd24a44;">
          Danh Hiệu: ${cur ? `«${cur.name}»` : 'Chưa kích hoạt'}
        </span>
      </div>

      <div style="max-height:240px; overflow-y:auto; padding-right:4px;">
        ${mortalGridHtml}
        ${immortalGridHtml}
      </div>

      ${reqHtml}
      ${statListHtml}

      <div class="btnrow" style="margin-top:12px; display:flex; justify-content:center; gap:10px;">
        ${next ? `
          <button class="btn on" id="bRealmBreak" ${chk.ok ? '' : 'disabled'} style="font-weight:bold; padding:8px 24px; font-size:14px; background:${chk.ok ? 'linear-gradient(180deg, #e6a100, #b87800)' : '#444'};">
            ⚡ ĐỘT PHÁ DANH VỊ
          </button>
        ` : ''}
        <button class="btn" id="bRealmClose" style="padding:8px 16px;">Đóng</button>
      </div>
    </div>
  `;

  modal(html, () => {
    const btnBreak = $("#bRealmBreak");
    if (btnBreak) {
      btnBreak.onclick = () => {
        advanceRealm();
      };
    }
    const btnClose = $("#bRealmClose");
    if (btnClose) {
      btnClose.onclick = () => closeModal(true);
    }
  });
}
