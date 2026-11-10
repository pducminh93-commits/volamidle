// Hệ thống Chiến Trường Tống Kim 2 Phe - Map 336 (Phong Lăng Độ)
// Gameplay mới: Kéo dài 5 phút, đếm ngược giữa màn hình.
// Bảng tính điểm bên trái màn hình.
// Quái phân thành cụm rải rác trên toàn bản đồ theo 2 phe (6 Sĩ Binh, 2 Hiệu Úy / cụm).
// Tự động tấn công khi người chơi lại gần.
// Phút thứ 3 xuất hiện Phó Tướng, phút thứ 4 xuất hiện Đại Tướng tại các cụm quái.
// Sĩ Binh và Hiệu Úy hồi sinh, Phó Tướng và Đại Tướng không hồi sinh.
// Kết toán điểm: 50đ -> 5 lệnh, 100đ -> 10 lệnh, tăng dần tỉ lệ 10 điểm = 1 lệnh.
// Mỗi ngày đi được 3 lượt, yêu cầu cấp độ tối thiểu Lv 100.
'use strict';

const TK_MAP_ID = 336;
const TK_MAP_BG = 'img/z/336.jpg';
const TK_MATCH_DURATION = 300.0; // 5 phút = 300 giây
const TK_DAILY_LIMIT = 10;
const TK_REQ_LVL = 100;

// Các cụm quái rải rác trên toàn map 336
// Map 336 có kích thước 3584x3584
// Phe Tống bố trí ở nửa bên Tây / Tây Nam / Tây Bắc (x từ 400 đến 1650)
// Phe Kim bố trí ở nửa bên Đông / Đông Nam / Đông Bắc (x từ 1900 đến 3200)
const TK_TONG_CLUSTERS = [
  { id: 1, x: 750, y: 800 },
  { id: 2, x: 1250, y: 750 },
  { id: 3, x: 650, y: 1500 },
  { id: 4, x: 1200, y: 1450 },
  { id: 5, x: 700, y: 2300 },
  { id: 6, x: 1350, y: 2250 },
  { id: 7, x: 950, y: 2950 },
  { id: 8, x: 1550, y: 2900 }
];

const TK_KIM_CLUSTERS = [
  { id: 101, x: 2350, y: 750 },
  { id: 102, x: 2850, y: 800 },
  { id: 103, x: 2300, y: 1450 },
  { id: 104, x: 2900, y: 1500 },
  { id: 105, x: 2250, y: 2250 },
  { id: 106, x: 2850, y: 2300 },
  { id: 107, x: 2050, y: 2900 },
  { id: 108, x: 2650, y: 2950 }
];

// Căn cứ ban đầu khi mới xuất hiện của 2 phe
const TK_SPAWN_TONG = { x: 750, y: 1792 };
const TK_SPAWN_KIM = { x: 2830, y: 1792 };

// Shop Tống Kim Lệnh chuẩn
const TK_SHOP_DEV = [
  { cost: 20, n: '2 Huyền Tinh (theo cấp nhân vật)', gift: { ht: 2 } },
  { cost: 30, n: '3 Thủy Tinh Trắng + 3 Thần Bí Khoáng Thạch', gift: { wc: 3, mys: 3 } },
  { cost: 40, n: '30 Điểm Phúc Duyên', gift: { fd: 30 } },
  { cost: 50, n: '50 Điểm Tiềm Năng', gift: { pts: 50 } },
  { cost: 100, n: 'Đồ 6 dòng ngẫu nhiên', isSixLineEquip: true }
];

// Danh sách môn phái cho 9 Bot nhân vật (chia đều 2 phe), dùng bộ kỹ năng 9x đặc trưng
const TK_BOT_ROSTER = [
  { fac: 'shaolin', n: 'Thiếu Lâm', series: 0, wcode: 2, skillId: 319, ranged: false, sex: 0, name: 'Hàn Nhất Kiếm' }, // Hoành Tảo Thiên Quân (Côn 9x)
  { fac: 'tianwang', n: 'Thiên Vương', series: 0, wcode: 3, skillId: 323, ranged: false, sex: 0, name: 'Dương Hạo Nhiên' }, // Truy Tinh Trục Nguyệt (Thương 9x)
  { fac: 'tangmen', n: 'Đường Môn', series: 1, wcode: 7, skillId: 302, ranged: true, sex: 0, name: 'Đoàn Chính Hạo' }, // Bạo Vũ Lê Hoa (Ám khí 9x)
  { fac: 'wudu', n: 'Ngũ Độc', series: 1, wcode: 1, skillId: 353, ranged: true, sex: 1, name: 'Hạ Băng Nhi' }, // Âm Phong Thực Cốt (Đao 9x)
  { fac: 'emei', n: 'Nga My', series: 2, wcode: 0, skillId: 380, ranged: true, sex: 1, name: 'Tố Tâm' }, // Phong Sương Toái Ảnh (Kiếm/Chưởng 9x)
  { fac: 'cuiyan', n: 'Thúy Yên', series: 2, wcode: 5, skillId: 336, ranged: true, sex: 1, name: 'Liễu Như Yên' }, // Băng Tung Vô Ảnh (Đao 9x)
  { fac: 'gaibang', n: 'Cái Bang', series: 3, wcode: 9, skillId: 357, ranged: true, sex: 0, name: 'Thạch Phá Thiên' }, // Phi Long Tại Thiên (Chưởng Rồng 9x)
  { fac: 'tianren', n: 'Thiên Nhẫn', series: 3, wcode: 3, skillId: 361, ranged: false, sex: 0, name: 'Cung Bất Bại' }, // Vân Long Kích (Thương 9x)
  { fac: 'wudang', n: 'Võ Đang', series: 4, wcode: 0, skillId: 368, ranged: true, sex: 0, name: 'Mạc Thanh Phong' } // Nhân Kiếm Hợp Nhất (Kiếm 9x)
];

// Lấy ngày hiện tại YYYY-MM-DD
function getTkDayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Lấy tuần hiện tại
function getTkWeekStr() {
  const d = new Date();
  d.setDate(d.getDate() - (d.getDay() + 6) % 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Dữ liệu Tống Kim của nhân vật
function getTkState() {
  const dayStr = getTkDayStr();
  const weekStr = getTkWeekStr();
  if (!S.tkDev) {
    S.tkDev = { day: dayStr, week: weekStr, dayRuns: 0, tokens: 0 };
  }
  if (S.tkDev.day !== dayStr) {
    S.tkDev.day = dayStr;
    S.tkDev.dayRuns = 0;
  }
  if (S.tkDev.week !== weekStr) {
    S.tkDev.week = weekStr;
  }
  if (typeof S.tkDev.tokens !== 'number') {
    S.tkDev.tokens = 0;
  }
  return S.tkDev;
}

// Bắt đầu trận chiến trường Tống Kim (người chơi bấm Tham Gia)
function tkBattleStart() {
  if (R.dg || R.tower || R.tkBattle) {
    toast('Hãy rời hoạt động hiện tại trước');
    return;
  }
  if (!S.fac) {
    toast('Chưa gia nhập môn phái');
    return;
  }
  if (S.lvl < TK_REQ_LVL) {
    toast(`Chiến trường Tống Kim yêu cầu đẳng cấp tối thiểu Lv ${TK_REQ_LVL}`);
    return;
  }

  const tkSt = getTkState();
  if ((tkSt.dayRuns || 0) >= TK_DAILY_LIMIT) {
    toast(`Hôm nay bạn đã tham gia đủ ${TK_DAILY_LIMIT}/${TK_DAILY_LIMIT} lượt Tống Kim!`);
    return;
  }

  // Tăng số lượt đã đi trong ngày
  tkSt.dayRuns = (tkSt.dayRuns || 0) + 1;
  save();
  if (typeof netOn === 'function' && netOn() && typeof netUpload === 'function') {
    netUpload().catch(() => {});
  }

  // Chọn phe ngẫu nhiên: 0 = Tống, 1 = Kim
  const playerSide = Math.random() < 0.5 ? 0 : 1;
  const playerSideName = playerSide === 0 ? 'TỐNG' : 'KIM';
  const enemySideName = playerSide === 0 ? 'KIM' : 'TỐNG';

  // Rời khỏi thành thị nếu có
  const wasTown = !!R.town;
  const oldX = H.x;
  const oldY = H.y;
  if (wasTown) {
    R.town = false;
    const tb = document.getElementById('townBar');
    if (tb) tb.classList.add('hidden');
  }

  // Khởi tạo trạng thái chiến trường
  R.tkBattle = {
    playerSide: playerSide,
    timeLeft: TK_MATCH_DURATION,
    duration: TK_MATCH_DURATION,
    oldBgImg: R.bgImg,
    oldX: oldX,
    oldY: oldY,
    oldTown: wasTown,
    score: 0,
    kills: {
      sibinh: 0,
      hieuuy: 0,
      photuong: 0,
      daituong: 0,
      bot: 0
    },
    spawnedPhoTuong: false,
    spawnedDaiTuong: false,
    clusters: [],
    allies: [],
    bots: []
  };

  // Nền bản đồ 336
  R.bgImg = img(TK_MAP_BG);
  obsLoad(TK_MAP_ID);

  // Đặt nhân vật xuất hiện ở căn cứ phe của mình
  const myBase = playerSide === 0 ? TK_SPAWN_TONG : TK_SPAWN_KIM;
  H.x = myBase.x;
  H.y = myBase.y;
  snapCamera();

  // Dọn dẹp quái và xác cũ
  R.enemies = [];
  R.corpses = [];
  R.ground = [];
  R.pickTarget = null;
  R.moveTo = null;
  R.spawnT = 0;

  // Sinh các cụm quái theo 2 phe rải rác trên toàn map
  tkBattleInitClusters(playerSide);

  // Sinh 9 Bot nhân vật theo môn phái: 4 bot đồng minh, 5 bot đối địch
  tkInitBots(playerSide);

  R.banner = {
    t: 4.0,
    text: `Gia nhập quân ${playerSideName}!`,
    sub: `Chiến trường kéo dài 5 phút · Tiêu diệt quân ${enemySideName} và hiệp khách để tích lũy điểm!`
  };
  log(`<b style="color:${playerSide === 0 ? '#5fb4ff' : '#ff7a5a'}">🚩 Gia nhập quân [${playerSideName}]! Chiến trường 5 phút chính thức bắt đầu!</b>`);
  closeModal(true);
}

// Khởi tạo cụm quái 2 phe trên toàn bản đồ
function tkBattleInitClusters(playerSide) {
  if (!R.tkBattle) return;
  const b = R.tkBattle;
  b.clusters = [];
  R.enemies = [];
  b.allies = [];

  // Tạo cụm cho phe Tống (side = 0)
  for (const c of TK_TONG_CLUSTERS) {
    b.clusters.push({
      id: c.id,
      side: 0,
      x: c.x,
      y: c.y,
      isEnemy: (playerSide !== 0)
    });
  }

  // Tạo cụm cho phe Kim (side = 1)
  for (const c of TK_KIM_CLUSTERS) {
    b.clusters.push({
      id: c.id,
      side: 1,
      x: c.x,
      y: c.y,
      isEnemy: (playerSide !== 1)
    });
  }

  // Sinh 6 Sĩ Binh + 2 Hiệu Úy cho mỗi cụm
  for (const cluster of b.clusters) {
    tkSpawnClusterUnits(cluster);
  }
}

// Khởi tạo 9 Bot nhân vật (4 bot phe người chơi, 5 bot phe đối địch)
function tkInitBots(playerSide) {
  if (!R.tkBattle) return;
  const b = R.tkBattle;
  b.bots = [];

  // Xáo trộn danh sách 9 môn phái để mỗi trận khác nhau
  const shuffledRoster = TK_BOT_ROSTER.slice().sort(() => Math.random() - 0.5);

  // 4 bot cùng phe người chơi, 5 bot phe đối địch
  const allySide = playerSide;
  const enemySide = (playerSide === 0) ? 1 : 0;

  for (let i = 0; i < 9; i++) {
    const rInfo = shuffledRoster[i];
    const isAlly = (i < 4);
    const botSide = isAlly ? allySide : enemySide;
    const isEnemy = !isAlly;
    const spawnBase = botSide === 0 ? TK_SPAWN_TONG : TK_SPAWN_KIM;
    const sx = spawnBase.x + rnd(-80, 80);
    const sy = spawnBase.y + rnd(-80, 80);

    const bot = tkCreateBot(rInfo, botSide, isEnemy, sx, sy);
    b.bots.push(bot);
    if (isEnemy) {
      R.enemies.push(bot);
    } else {
      b.allies.push(bot);
    }
  }
}

// Tạo đơn vị Bot nhân vật có môn phái, cấp độ và kĩ năng scale theo nhân vật
function tkCreateBot(rosterInfo, side, isEnemy, spawnX, spawnY) {
  const lvl = Math.max(100, S.lvl);
  const baseHp = Math.max(1000, R.P ? R.P.life : 1000);
  const baseDps = Math.max(50, R.P && R.P.main ? R.P.main.dps || R.P.main.tot || 100 : 100);

  const sidePrefix = side === 0 ? 'Tống' : 'Kim';
  const roleName = `${sidePrefix} · ${rosterInfo.name}`;
  const factionTitle = `«${rosterInfo.n} Cao Thủ»`;

  // Trang bị đầy đủ vũ khí môn phái, áo giáp, nón để hiển thị ngoại trang JX Look hoàn chỉnh
  const botEq = {
    weapon: { wcode: rosterInfo.wcode, enh: 10, uid: 'bot_wp_' + Math.random() },
    armor: { enh: 10, uid: 'bot_ar_' + Math.random() },
    helm: { enh: 10, uid: 'bot_he_' + Math.random() }
  };

  // Ngoại hình JX Look chuẩn môn phái và trang bị
  const pLook = (typeof jxBuildLook === 'function')
    ? jxBuildLook(rosterInfo.sex, botEq, false)
    : null;

  // Lấy animation cơ bản theo môn phái nếu không có look engine
  const gfx = (typeof heroGfx === 'function') ? heroGfx(rosterInfo.fac, rosterInfo.sex) : null;
  const animKey = (gfx && gfx.anim) ? gfx.anim : (rosterInfo.sex === 1 ? 'girl' : 'hero');

  // Máu bot được tăng lên nhiều (80x baseHp) để trâu bò, tạo cảm giác combat cao thủ giang hồ
  const maxHp = Math.round(baseHp * 80);
  const dmg = Math.max(25, Math.round(baseHp * 0.035)); // ~3.5% máu người chơi mỗi đòn

  const bot = {
    id: Math.random(),
    isBot: true,
    side: side,
    isEnemy: isEnemy,
    role: 'bot',
    pointVal: 10, // 1 bot = 10 điểm
    n: roleName,
    botName: rosterInfo.name,
    factionName: rosterInfo.n,
    factionKey: rosterInfo.fac,
    skillId: rosterInfo.skillId, // Bộ kỹ năng 9x đặc trưng của môn phái
    title: factionTitle,
    tvTitle: factionTitle,
    series: rosterInfo.series,
    sex: rosterInfo.sex,
    wcode: rosterInfo.wcode,
    ranged: rosterInfo.ranged,
    look: pLook,
    animKey: animKey,
    L: lvl,
    cls: 'boss', // Cho vòng sáng và icon cao thủ
    hp: maxHp,
    max: maxHp,
    dmg: dmg,
    def: Math.round((R.P ? R.P.def : 200) * 0.9),
    ar: Math.round((R.P ? R.P.ar : 500) * 1.1),
    spd: 130, // Tốc độ di chuyển lẹ làng khắp map
    range: rosterInfo.ranged ? 220 : 80,
    reach: rosterInfo.ranged ? 220 : 80,
    cd: 1.2,
    atkCd: rnd(0.2, 0.5),
    x: spawnX,
    y: spawnY,
    spawnX: spawnX,
    spawnY: spawnY,
    homeX: spawnX,
    homeY: spawnY,
    patrolTgt: null,
    moving: false,
    act: 'st',
    actT: 0,
    dir: side === 0 ? 0 : 4,
    face: side === 0 ? 1 : -1,
    hitT: 0,
    dead: false,
    aggro: false,
    vis: 520, // Tầm nhìn rộng tìm đối thủ
    canRespawn: true,
    respawnTimer: 0
  };

  if (isEnemy) {
    bot.tid = 147;
    bot.res = { phys: 45, poison: 45, cold: 45, fire: 45, light: 45 };
  }

  return bot;
}

// Tạo đơn vị chiến đấu chuẩn hóa theo cấp độ người chơi
function tkCreateUnit(role, side, isEnemy, spawnX, spawnY, clusterId) {
  const lvl = Math.max(100, S.lvl);
  const baseHp = Math.max(1000, R.P ? R.P.life : 1000);
  const baseDmg = Math.max(50, R.P && R.P.main ? R.P.main.dps || R.P.main.tot || 100 : 100);

  const sidePrefix = side === 0 ? 'Tống' : 'Kim';
  let specName = 'Sĩ Binh';
  let cls = 'normal';
  let scaleHp = 1.0;
  let scaleDmg = 1.0;
  let animKey = side === 0 ? 'enemy029' : 'enemy028';
  let speed = 75;
  let range = 65;
  let cd = 1.2;
  let pointVal = 1;

  if (role === 'hieuuy') {
    specName = 'Hiệu Úy';
    cls = 'elite';
    scaleHp = 6.0;
    scaleDmg = 0.5;
    animKey = side === 0 ? 'enemy021' : 'enemy024';
    speed = 75;
    range = 80;
    cd = 1.6;
    pointVal = 3;
  } else if (role === 'photuong') {
    specName = 'Phó Tướng';
    cls = 'boss';
    scaleHp = 25.0;
    scaleDmg = 1.0;
    animKey = side === 0 ? 'enemy076' : 'enemy086';
    speed = 70;
    range = 100;
    cd = 1.8;
    pointVal = 5;
  } else if (role === 'daituong') {
    specName = 'Đại Tướng';
    cls = 'boss';
    scaleHp = 60.0;
    scaleDmg = 1.5;
    animKey = side === 0 ? 'boss002' : 'boss005';
    speed = 65;
    range = 120;
    cd = 1.8;
    pointVal = 10;
  } else {
    // Sĩ Binh
    scaleHp = 2.5;
    scaleDmg = 0.35;
    cd = 1.6;
  }

  // Tăng cường máu và sát thương quái/boss: Dame siêu nhỏ vừa vặn tránh dồn chết, Máu trâu bò
  const finalHp = Math.round(baseHp * scaleHp * 2.5);
  // Dame mỗi hit chỉ gây khoảng 1% - 3% máu người chơi, không bị sốc chết
  const finalDmg = Math.max(10, Math.round(baseHp * scaleDmg * 0.015));

  const unit = {
    id: Math.random(),
    side: side,
    isEnemy: isEnemy,
    role: role,
    pointVal: pointVal,
    clusterId: clusterId,
    homeX: spawnX,
    homeY: spawnY,
    respawnTimer: 0,
    canRespawn: (role === 'sibinh' || role === 'hieuuy'),
    n: `${sidePrefix} · ${specName}`,
    animKey: animKey,
    sz: [48, 76, 24, 76],
    L: lvl,
    cls: cls,
    series: side === 0 ? 0 : 3, // Tống hệ Kim, Kim hệ Hỏa
    x: spawnX,
    y: spawnY,
    r: cls === 'boss' ? 28 : 20,
    hp: finalHp,
    max: finalHp,
    dmg: finalDmg,
    def: Math.round((R.P ? R.P.def : 200) * 0.8),
    ar: Math.round((R.P ? R.P.ar : 500) * 0.9),
    spd: speed,
    range: range,
    cd: cd,
    atkCd: rnd(0.2, 0.8),
    moving: false,
    act: 'st',
    actT: 0,
    dir: side === 0 ? 0 : 4,
    face: side === 0 ? 1 : -1,
    hitT: 0,
    dead: false,
    aggro: false,
    vis: 360,
    reach: range
  };

  if (isEnemy) {
    unit.tid = 147;
    unit.res = { phys: 40, poison: 40, cold: 40, fire: 40, light: 40 };
    if (role === 'daituong') {
      unit.goldBoss = true;
    }
  }

  return unit;
}

// Sinh 6 Sĩ Binh và 2 Hiệu Úy cho 1 cụm (tản đều vị trí trong bán kính 160px để không xếp chồng lên nhau)
function tkSpawnClusterUnits(cluster) {
  // 6 Sĩ Binh xếp thành vòng tròn bao quanh
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + rnd(-0.2, 0.2);
    const dist = rnd(80, 140);
    const ox = Math.cos(angle) * dist;
    const oy = Math.sin(angle) * dist * 0.75;
    const u = tkCreateUnit('sibinh', cluster.side, cluster.isEnemy, cluster.x + ox, cluster.y + oy, cluster.id);
    if (cluster.isEnemy) {
      R.enemies.push(u);
    } else {
      R.tkBattle.allies.push(u);
    }
  }
  // 2 Hiệu Úy đứng phía trong nhưng tách rời nhau
  for (let i = 0; i < 2; i++) {
    const angle = (i * Math.PI) + rnd(-0.3, 0.3);
    const dist = rnd(35, 60);
    const ox = Math.cos(angle) * dist;
    const oy = Math.sin(angle) * dist * 0.75;
    const u = tkCreateUnit('hieuuy', cluster.side, cluster.isEnemy, cluster.x + ox, cluster.y + oy, cluster.id);
    if (cluster.isEnemy) {
      R.enemies.push(u);
    } else {
      R.tkBattle.allies.push(u);
    }
  }
}

// Cập nhật từng frame của Chiến Trường Tống Kim
function tkBattleTick(dt) {
  if (!R.tkBattle) return;
  const b = R.tkBattle;

  // Giảm thời gian trận đấu (5 phút)
  b.timeLeft -= dt;
  const elapsedTime = b.duration - b.timeLeft;

  // 1. Phút thứ 3 (đã trôi qua 180s): Xuất hiện Phó Tướng tại các cụm quái ngẫu nhiên
  if (elapsedTime >= 180 && !b.spawnedPhoTuong) {
    b.spawnedPhoTuong = true;
    tkSpawnOfficers('photuong');
    R.banner = {
      t: 3.5,
      text: '⚔️ PHÓ TƯỚNG XUẤT HIỆN!',
      sub: 'Phó Tướng hai bên đã xuất hiện tại các cứ điểm! Mau chóng tiêu diệt (+5 điểm)!'
    };
    log('<b style="color:#ffd24a">⚡ [CHIẾN TRƯỜNG TỐNG KIM] Phút thứ 3: PHÓ TƯỚNG hai bên đã xuất hiện tại các cụm cứ điểm!</b>');
    if (typeof uiSfx === 'function') uiSfx('levelup');
  }

  // 2. Phút thứ 4 (đã trôi qua 240s): Xuất hiện Đại Tướng tại các cụm quái ngẫu nhiên
  if (elapsedTime >= 240 && !b.spawnedDaiTuong) {
    b.spawnedDaiTuong = true;
    tkSpawnOfficers('daituong');
    R.banner = {
      t: 3.5,
      text: '👑 ĐẠI TƯỚNG XUẤT TRẬN!',
      sub: 'Đại Tướng tối cao hai phe đã giáng lâm! Tiêu diệt để nhận (+10 điểm)!'
    };
    log('<b style="color:#ff3333">🔥 [CHIẾN TRƯỜNG TỐNG KIM] Phút thứ 4: ĐẠI TƯỚNG tối cao hai bên đã thân chinh xuất chiến!</b>');
    if (typeof uiSfx === 'function') uiSfx('levelup');
  }

  // 3. AI Tự động tấn công & Di chuyển chiến trường
  // A. Xử lý phe Địch (R.enemies): Gồm quái vật, boss và Bot phe địch
  for (const enemy of R.enemies) {
    // Cập nhật hoạt ảnh và trạng thái của địch/quái
    if (typeof stepAct === 'function') {
      stepAct(enemy, enemy.stun > 0 ? 0 : enemy.slowT > 0 ? dt * ELEM_SLOW : dt, enemy.moving ? 'run' : 'st');
    } else {
      enemy.actT = (enemy.actT || 0) + dt;
    }
    if (enemy.act === 'at' && (enemy.actT || 0) >= 0.45) {
      enemy.act = enemy.moving ? 'run' : 'st';
    }

    // Nếu là Bot nhân vật phe địch: Tự do di chuyển khắp map, tìm người chơi, bot đồng minh hoặc lính đồng minh để PK
    if (enemy.isBot) {
      let target = null;
      let targetDist = 999999;

      // Ưu tiên 1: Người chơi nếu lại gần trong phạm vi 600px
      const distToHero = Math.hypot(H.x - enemy.x, H.y - enemy.y);
      if (R.life > 0 && distToHero <= (enemy.vis || 600)) {
        target = { x: H.x, y: H.y, isHero: true, hp: R.life };
        targetDist = distToHero;
      }

      // Ưu tiên 2: Tìm bot đồng minh hoặc lính đồng minh phe người chơi gần nhất
      for (const ally of b.allies) {
        if (ally.dead || ally.hp <= 0) continue;
        const d = Math.hypot(ally.x - enemy.x, ally.y - enemy.y);
        // Ưu tiên cao hơn nếu là Bot đồng minh
        const effectiveVis = ally.isBot ? 800 : (enemy.vis || 600);
        if (d <= effectiveVis && d < targetDist) {
          target = ally;
          targetDist = d;
        }
      }

      // Ưu tiên 3: Nếu vẫn chưa thấy mục tiêu trong tầm gần, tìm bất kỳ mục tiêu đồng minh nào trên toàn bản đồ
      if (!target) {
        for (const ally of b.allies) {
          if (ally.dead || ally.hp <= 0) continue;
          const d = Math.hypot(ally.x - enemy.x, ally.y - enemy.y);
          if (d < targetDist) {
            target = ally;
            targetDist = d;
          }
        }
        if (R.life > 0 && distToHero < targetDist) {
          target = { x: H.x, y: H.y, isHero: true, hp: R.life };
          targetDist = distToHero;
        }
      }

      if (target) {
        // Tiếp cận và tấn công mục tiêu
        const dx = target.x - enemy.x;
        const dy = target.y - enemy.y;
        enemy.face = dx >= 0 ? 1 : -1;
        enemy.dir = typeof dirOf === 'function' ? dirOf(dx, dy) : 0;

        if (targetDist > (enemy.reach || enemy.range || 75)) {
          enemy.moving = true;
          if (enemy.act !== 'at') enemy.act = 'run';
          const step = enemy.spd * dt;
          enemy.x += (dx / targetDist) * step;
          enemy.y += (dy / targetDist) * step;
        } else {
          // Ra chiêu tấn công
          enemy.moving = false;
          enemy.atkCd = (enemy.atkCd || 0) - dt;
          if (enemy.atkCd <= 0) {
            enemy.atkCd = enemy.cd || 1.1;
            enemy.act = 'at';
            enemy.actT = 0;

            // Kỹ năng 9x môn phái: tung chiêu và hiệu ứng hoạt ảnh fx + âm thanh sfx
            const botSk = (enemy.skillId && typeof SK !== 'undefined') ? SK[enemy.skillId] : null;
            if (botSk && typeof skillFx === 'function') {
              try {
                skillFx(enemy, target, botSk);
              } catch (e) {}
            }
            if (enemy.skillId && typeof skillSfx === 'function') {
              try {
                skillSfx(enemy.skillId);
              } catch (e) {}
            } else if (typeof npcSfx === 'function') {
              npcSfx(enemy.animKey, 'at', 0.35);
            }

            if (target.isHero) {
              if (typeof enemyHit === 'function') enemyHit(enemy);
            } else {
              const dmgDealt = Math.round((enemy.dmg || 60) * rnd(0.85, 1.15));
              target.hp -= dmgDealt;
              target.hitT = 0.12;
              if (typeof addText === 'function') {
                addText(target.x + rnd(-10, 10), target.y - 40, `-${dmgDealt}`, '#ff5a5a', 11);
              }
            }
          }
        }
      } else {
        // Tự do tuần tra di chuyển khắp bản đồ Tống Kim
        enemy.patrolTimer = (enemy.patrolTimer || 0) - dt;
        if (!enemy.patrolTgt || enemy.patrolTimer <= 0) {
          enemy.patrolTimer = rnd(6, 12);
          const randCluster = pick(b.clusters);
          enemy.patrolTgt = {
            x: randCluster ? randCluster.x + rnd(-120, 120) : rnd(600, 3000),
            y: randCluster ? randCluster.y + rnd(-120, 120) : rnd(600, 3000)
          };
        }

        const pdx = enemy.patrolTgt.x - enemy.x;
        const pdy = enemy.patrolTgt.y - enemy.y;
        const pDist = Math.hypot(pdx, pdy);
        if (pDist > 45) {
          enemy.moving = true;
          if (enemy.act !== 'at') enemy.act = 'run';
          enemy.face = pdx >= 0 ? 1 : -1;
          enemy.dir = typeof dirOf === 'function' ? dirOf(pdx, pdy) : 0;
          const step = (enemy.spd * 0.85) * dt;
          enemy.x += (pdx / pDist) * step;
          enemy.y += (pdy / pDist) * step;
        } else {
          // Đã tới điểm tuần tra -> đổi ngay điểm tiếp theo để không đứng im
          enemy.moving = false;
          enemy.patrolTimer = 0;
          enemy.patrolTgt = null;
        }
      }
    } else {
      // Quái vật thường / Boss cụm
      const distToPlayer = Math.hypot(H.x - enemy.x, H.y - enemy.y);
      if (distToPlayer <= (enemy.vis || 380) && R.life > 0) {
        enemy.aggro = true;
      } else if (distToPlayer > 600) {
        enemy.aggro = false;
      }

      if (enemy.aggro && R.life > 0) {
        const dx = H.x - enemy.x;
        const dy = H.y - enemy.y;
        enemy.face = dx >= 0 ? 1 : -1;
        enemy.dir = typeof dirOf === 'function' ? dirOf(dx, dy) : 0;

        const stopDist = (enemy.reach || enemy.range || 65) + ((Math.abs(Math.sin((enemy.id || 1) * 999)) * 50));
        if (distToPlayer > stopDist) {
          enemy.moving = true;
          if (enemy.act !== 'at') enemy.act = 'run';
          const step = enemy.spd * dt;
          enemy.x += (dx / distToPlayer) * step;
          enemy.y += (dy / distToPlayer) * step;
        } else {
          enemy.moving = false;
          enemy.atkCd = (enemy.atkCd || 0) - dt;
          if (enemy.atkCd <= 0) {
            enemy.atkCd = enemy.cd || 1.6;
            enemy.act = 'at';
            enemy.actT = 0;
            if (typeof npcSfx === 'function') npcSfx(enemy.animKey, 'at', 0.35);
            if (typeof enemyHit === 'function') enemyHit(enemy);
          }
        }
      } else {
        enemy.moving = false;
        const distToHome = Math.hypot(enemy.homeX - enemy.x, enemy.homeY - enemy.y);
        if (distToHome > 40) {
          const dx = enemy.homeX - enemy.x;
          const dy = enemy.homeY - enemy.y;
          enemy.x += (dx / distToHome) * enemy.spd * 0.5 * dt;
          enemy.y += (dy / distToHome) * enemy.spd * 0.5 * dt;
          enemy.moving = true;
        }
      }
    }
  }

  // B. AI Đồng Minh (Allies): Gồm lính đồng minh và 4 Bot nhân vật phe mình
  for (const ally of b.allies) {
    if (ally.dead || ally.hp <= 0) continue;

    // Cập nhật hoạt ảnh và trạng thái của đồng minh
    if (typeof stepAct === 'function') {
      stepAct(ally, dt, ally.moving ? 'run' : 'st');
    } else {
      ally.actT = (ally.actT || 0) + dt;
    }
    if (ally.act === 'at' && (ally.actT || 0) >= 0.45) {
      ally.act = ally.moving ? 'run' : 'st';
    }

    // Tìm địch gần nhất trong tầm nhìn
    let nearestEnemy = null;
    let minD = ally.isBot ? 800 : 280;
    for (const enemy of R.enemies) {
      if (enemy.dead || enemy.hp <= 0) continue;
      const d = Math.hypot(enemy.x - ally.x, enemy.y - ally.y);
      // Ưu tiên bot địch
      const effectiveVis = (ally.isBot && enemy.isBot) ? 1000 : minD;
      if (d < effectiveVis && d < minD) {
        minD = d;
        nearestEnemy = enemy;
      }
    }

    // Nếu là Bot đồng minh mà chưa thấy địch trong tầm gần, tìm bất kỳ địch nào trên toàn map
    if (!nearestEnemy && ally.isBot) {
      for (const enemy of R.enemies) {
        if (enemy.dead || enemy.hp <= 0) continue;
        const d = Math.hypot(enemy.x - ally.x, enemy.y - ally.y);
        if (d < minD) {
          minD = d;
          nearestEnemy = enemy;
        }
      }
    }

    if (nearestEnemy) {
      const dx = nearestEnemy.x - ally.x;
      const dy = nearestEnemy.y - ally.y;
      ally.face = dx >= 0 ? 1 : -1;
      ally.dir = typeof dirOf === 'function' ? dirOf(dx, dy) : 0;
      if (minD > (ally.reach || ally.range || 65)) {
        ally.moving = true;
        if (ally.act !== 'at') ally.act = 'run';
        const step = ally.spd * dt;
        ally.x += (dx / minD) * step;
        ally.y += (dy / minD) * step;
      } else {
        ally.moving = false;
        ally.atkCd = (ally.atkCd || 0) - dt;
        if (ally.atkCd <= 0) {
          ally.atkCd = ally.cd || 1.1;
          ally.act = 'at';
          ally.actT = 0;

          // Kỹ năng 9x môn phái: tung chiêu và hiệu ứng hoạt ảnh fx + âm thanh sfx
          const botSk = (ally.skillId && typeof SK !== 'undefined') ? SK[ally.skillId] : null;
          if (botSk && typeof skillFx === 'function') {
            try {
              skillFx(ally, nearestEnemy, botSk);
            } catch (e) {}
          }
          if (ally.skillId && typeof skillSfx === 'function') {
            try {
              skillSfx(ally.skillId);
            } catch (e) {}
          } else if (typeof npcSfx === 'function') {
            npcSfx(ally.animKey, 'at', 0.35);
          }

          const dmgDealt = Math.round((ally.dmg || 80) * rnd(0.85, 1.15));
          nearestEnemy.hp -= dmgDealt;
          nearestEnemy.hitT = 0.12;
          nearestEnemy.aggro = true;
          if (typeof addText === 'function') {
            addText(nearestEnemy.x + rnd(-10, 10), nearestEnemy.y - 40, `-${dmgDealt}`, '#ffdd66', 11);
          }
        }
      }
    } else {
      if (ally.isBot) {
        // Bot đồng minh tự động tuần tra di chuyển khắp map tìm địch
        ally.patrolTimer = (ally.patrolTimer || 0) - dt;
        if (!ally.patrolTgt || ally.patrolTimer <= 0) {
          ally.patrolTimer = rnd(6, 12);
          const randCluster = pick(b.clusters);
          ally.patrolTgt = {
            x: randCluster ? randCluster.x + rnd(-120, 120) : rnd(600, 3000),
            y: randCluster ? randCluster.y + rnd(-120, 120) : rnd(600, 3000)
          };
        }

        const pdx = ally.patrolTgt.x - ally.x;
        const pdy = ally.patrolTgt.y - ally.y;
        const pDist = Math.hypot(pdx, pdy);
        if (pDist > 45) {
          ally.moving = true;
          if (ally.act !== 'at') ally.act = 'run';
          ally.face = pdx >= 0 ? 1 : -1;
          ally.dir = typeof dirOf === 'function' ? dirOf(pdx, pdy) : 0;
          const step = (ally.spd * 0.85) * dt;
          ally.x += (pdx / pDist) * step;
          ally.y += (pdy / pDist) * step;
        } else {
          // Đã tới điểm tuần tra -> chuyển ngay sang điểm mới để tiếp tục di chuyển
          ally.moving = false;
          ally.patrolTimer = 0;
          ally.patrolTgt = null;
        }
      } else {
        ally.moving = false;
      }
    }
  }

  // 4. Cơ chế tính điểm và hồi sinh:
  // - Sĩ Binh: 1đ (hồi sinh sau 8s tại cụm)
  // - Hiệu Úy: 3đ (hồi sinh sau 8s tại cụm)
  // - Phó Tướng: 5đ (không hồi sinh)
  // - Đại Tướng: 10đ (không hồi sinh)
  // - Bot Nhân Vật: 10đ (tự động hồi sinh tại điểm xuất phát ban đầu sau 8s và tiếp tục PK)
  for (const enemy of R.enemies) {
    if (enemy.dead && !enemy._counted) {
      enemy._counted = true;
      const pts = enemy.isBot ? 10 : (enemy.pointVal || 1);
      b.score += pts;
      if (enemy.isBot) b.kills.bot++;
      else if (enemy.role === 'sibinh') b.kills.sibinh++;
      else if (enemy.role === 'hieuuy') b.kills.hieuuy++;
      else if (enemy.role === 'photuong') b.kills.photuong++;
      else if (enemy.role === 'daituong') b.kills.daituong++;

      if (typeof addText === 'function') {
        addText(enemy.x, enemy.y - 60, `+${pts} ĐIỂM!`, '#55ff55', 13);
      }
      if (enemy.isBot) {
        log(`<b style="color:#ffd24a">⚔️ Đã hạ hiệp khách [${esc(enemy.n)}]! Nhận (+10 điểm)</b>`);
      }
    }
  }

  // Xử lý hồi sinh kẻ địch (Sĩ Binh, Hiệu Úy, và Bot phe địch)
  for (let i = R.enemies.length - 1; i >= 0; i--) {
    const e = R.enemies[i];
    if (e.dead) {
      if (e.canRespawn) {
        e.respawnTimer = (e.respawnTimer || 0) + dt;
        const maxRespawnTime = e.isBot ? 3.0 : 8.0;
        if (e.respawnTimer >= maxRespawnTime) {
          // Hồi sinh lại tại căn cứ hoặc cụm cũ
          e.dead = false;
          e._counted = false;
          e.hp = e.max;
          const rx = e.spawnX || e.homeX;
          const ry = e.spawnY || e.homeY;
          e.x = rx + rnd(-40, 40);
          e.y = ry + rnd(-40, 40);
          e.respawnTimer = 0;
          e.aggro = false;
          e.patrolTgt = null;
        }
      }
    }
  }

  // Xử lý hồi sinh Bot phe đồng minh (giảm xuống 3 giây)
  for (const a of b.allies) {
    if (a.dead && a.isBot) {
      a.respawnTimer = (a.respawnTimer || 0) + dt;
      if (a.respawnTimer >= 3.0) {
        a.dead = false;
        a.hp = a.max;
        const rx = a.spawnX || a.homeX;
        const ry = a.spawnY || a.homeY;
        a.x = rx + rnd(-40, 40);
        a.y = ry + rnd(-40, 40);
        a.respawnTimer = 0;
        a.patrolTgt = null;
      }
    }
  }

  // 5. Kiểm tra hết giờ 5 phút -> Kết toán
  if (b.timeLeft <= 0) {
    b.timeLeft = 0;
    tkBattleFinish(false, true);
  }
}

// Xuất hiện Phó Tướng hoặc Đại Tướng tại các cụm quái
function tkSpawnOfficers(role) {
  if (!R.tkBattle) return;
  const b = R.tkBattle;
  const countPerSide = role === 'photuong' ? 4 : 2;

  // Lọc cụm theo từng phe
  const tongClusters = b.clusters.filter(c => c.side === 0);
  const kimClusters = b.clusters.filter(c => c.side === 1);

  // Chọn ngẫu nhiên các cụm quái để đặt Boss
  const shuffledTong = tongClusters.slice().sort(() => Math.random() - 0.5);
  const shuffledKim = kimClusters.slice().sort(() => Math.random() - 0.5);

  for (let i = 0; i < countPerSide; i++) {
    // Phe Tống
    if (shuffledTong[i]) {
      const c = shuffledTong[i];
      const u = tkCreateUnit(role, 0, (b.playerSide !== 0), c.x + rnd(-30, 30), c.y + rnd(-30, 30), c.id);
      if (b.playerSide !== 0) {
        R.enemies.push(u);
      } else {
        b.allies.push(u);
      }
    }
    // Phe Kim
    if (shuffledKim[i]) {
      const c = shuffledKim[i];
      const u = tkCreateUnit(role, 1, (b.playerSide !== 1), c.x + rnd(-30, 30), c.y + rnd(-30, 30), c.id);
      if (b.playerSide !== 1) {
        R.enemies.push(u);
      } else {
        b.allies.push(u);
      }
    }
  }
}

// Vẽ giao diện thanh trạng thái HUD và bảng điểm Tống Kim
function drawTkBattleHud(cx) {
  if (!R.tkBattle) return;
  const b = R.tkBattle;
  const pSideName = b.playerSide === 0 ? 'TỐNG' : 'KIM';
  const pSideColor = b.playerSide === 0 ? '#5fb4ff' : '#ff7a5a';

  cx.save();

  // 1. Đồng hồ đếm ngược giữa màn hình (5 phút đếm lùi)
  const secLeft = Math.max(0, Math.ceil(b.timeLeft));
  const mins = Math.floor(secLeft / 60);
  const secs = String(secLeft % 60).padStart(2, '0');
  const timerText = `⏱️ TỐNG KIM [PHE ${pSideName}] · ${mins}:${secs}`;

  cx.font = 'bold 13px "IBM Plex Mono", Nunito, sans-serif';
  cx.textAlign = 'center';
  const timerWidth = cx.measureText(timerText).width + 28;
  const timerX = AR.w / 2 - timerWidth / 2;
  const timerY = 62; // Vị trí không bị đè lên thanh boss topbar

  cx.fillStyle = 'rgba(10, 15, 12, 0.88)';
  cx.fillRect(timerX, timerY, timerWidth, 26);
  cx.strokeStyle = pSideColor;
  cx.lineWidth = 1.5;
  cx.strokeRect(timerX, timerY, timerWidth, 26);

  cx.fillStyle = secLeft < 30 ? '#ff5a5a' : '#ffd24a';
  cx.fillText(timerText, AR.w / 2, timerY + 18);

  // 2. Bảng tính điểm nhỏ bên trái màn hình
  // Vị trí: x = 12, y = 140
  const boardX = 12;
  const boardY = 135;
  const boardW = 168;
  const boardH = 146;

  cx.fillStyle = 'rgba(12, 18, 14, 0.86)';
  cx.fillRect(boardX, boardY, boardW, boardH);
  cx.strokeStyle = '#c8a45a';
  cx.lineWidth = 1.2;
  cx.strokeRect(boardX, boardY, boardW, boardH);

  cx.textAlign = 'left';
  cx.font = 'bold 11px "IBM Plex Mono", Nunito, sans-serif';
  cx.fillStyle = '#ffd24a';
  cx.fillText('🏆 BẢNG ĐIỂM TỐNG KIM', boardX + 8, boardY + 18);

  cx.strokeStyle = '#443c26';
  cx.beginPath();
  cx.moveTo(boardX + 6, boardY + 24);
  cx.lineTo(boardX + boardW - 6, boardY + 24);
  cx.stroke();

  cx.font = '11px "IBM Plex Mono", Nunito, sans-serif';
  cx.fillStyle = '#ffffff';
  cx.fillText(`Điểm tích lũy:`, boardX + 8, boardY + 42);
  cx.fillStyle = '#55ff55';
  cx.font = 'bold 13px "IBM Plex Mono", Nunito, sans-serif';
  cx.fillText(`${b.score} đ`, boardX + 105, boardY + 42);

  cx.font = '10.5px "IBM Plex Mono", Nunito, sans-serif';
  cx.fillStyle = '#cfc6b0';
  cx.fillText(`• Sĩ binh (+1đ):  ${b.kills.sibinh}`, boardX + 8, boardY + 60);
  cx.fillText(`• Hiệu úy (+3đ):  ${b.kills.hieuuy}`, boardX + 8, boardY + 76);
  cx.fillText(`• Phó tướng (+5đ): ${b.kills.photuong}`, boardX + 8, boardY + 92);
  cx.fillText(`• Đại tướng (+10đ): ${b.kills.daituong}`, boardX + 8, boardY + 108);
  cx.fillStyle = '#ffd24a';
  cx.fillText(`• Hiệp khách (+10đ): ${b.kills.bot || 0}`, boardX + 8, boardY + 124);

  cx.restore();
}

// Cung cấp danh sách đồng minh cho render.js hiển thị
function tkAllyEnts() {
  if (!R.tkBattle || !R.tkBattle.allies) return [];
  const list = [];
  for (const a of R.tkBattle.allies) {
    if (!a.dead && a.hp > 0) {
      list.push({ tkAlly: a, y: a.y });
    }
  }
  return list;
}

// Vẽ đồng minh phe mình trên chiến trường
function tkAllyDraw(cx, a, dt) {
  if (!a || a.dead) return;
  cx.save();

  // Đổ bóng chân
  cx.fillStyle = '#0007';
  cx.beginPath();
  cx.ellipse(a.x, a.y, a.r || 16, (a.r || 16) * 0.38, 0, 0, Math.PI * 2);
  cx.fill();

  // Vòng tròn màu phe dưới chân (Tống: Xanh Dương, Kim: Cam Đỏ)
  cx.strokeStyle = a.side === 0 ? '#5fb4ff' : '#ff7a5a';
  cx.lineWidth = (a.cls === 'boss' || a.isBot) ? 2.5 : 1.5;
  cx.beginPath();
  cx.ellipse(a.x, a.y, (a.r || 16) + 4, ((a.r || 16) + 4) * 0.38, 0, 0, Math.PI * 2);
  cx.stroke();

  // Vẽ hình động animation: Ưu tiên JX Hero Look nếu là Bot môn phái
  let drawnH = 52;
  let drawn = false;
  const heroScale = typeof HERO_SCALE !== 'undefined' ? HERO_SCALE : 1.35;

  if (a.isBot && typeof drawJxHero === 'function') {
    const pLook = a.look || ((typeof jxBuildLook === 'function') ? jxBuildLook(a.sex || 0, { weapon: { wcode: a.wcode || 0, enh: 10 }, armor: { enh: 10 }, helm: { enh: 10 } }, false) : null);
    if (pLook) {
      const h = drawJxHero(a.act || 'st', a.dir || 0, a.actT || 0, a.x, a.y, heroScale, 1, pLook);
      if (h) {
        drawn = true;
        drawnH = Math.max(52, h);
      }
    }
  }

  if (!drawn && typeof drawAnim === 'function' && a.animKey) {
    const scale = a.role === 'daituong' ? 1.6 : a.role === 'photuong' ? 1.4 : a.role === 'hieuuy' ? 1.25 : 1.1;
    drawnH = drawAnim(a.animKey, a.act || 'st', a.dir || 0, a.actT || 0, a.x, a.y, scale * MON_SCALE);
  }

  // Vẽ thanh máu và tên trên đầu
  const labelY = a.y - (drawnH ? Math.min(drawnH, 100) * 0.85 : 55) - 6;
  const sideColor = a.side === 0 ? '#5fb4ff' : '#ff7a5a';

  label(
    a.x,
    labelY,
    `${a.n} · Lv${a.L}`,
    sideColor,
    (a.cls === 'boss' || a.isBot) ? 12 : 11,
    a.hp / Math.max(1, a.max),
    '#5fd35a',
    a.title || void 0,
    a.title ? '#ffd24a' : void 0,
    sideColor
  );

  cx.restore();
}

// Kết thúc và kết toán trận đấu Tống Kim
function tkBattleFinish(isDead, isWin) {
  if (!R.tkBattle) return;
  const b = R.tkBattle;
  const tkSt = getTkState();

  // Quy tắc tính thưởng kết toán theo số điểm (Cập nhật theo yêu cầu):
  // - 100 điểm : 5 tống kim lệnh
  // - 500 điểm : 20 tống kim lệnh
  // - 1000 điểm : 50 tống kim lệnh
  // - 2000 điểm : 100 tống kim lệnh
  // - Trên 2000 điểm : Đồng 150 tống kim lệnh
  let tokensEarned = 0;
  const score = b.score || 0;
  if (score > 2000) {
    tokensEarned = 150;
  } else if (score >= 2000) {
    tokensEarned = 100;
  } else if (score >= 1000) {
    tokensEarned = 50;
  } else if (score >= 500) {
    tokensEarned = 20;
  } else if (score >= 100) {
    tokensEarned = 5;
  } else {
    // Dưới 100 điểm tính theo tỷ lệ an ủi
    tokensEarned = Math.floor(score / 20);
  }

  tkSt.tokens = (tkSt.tokens || 0) + tokensEarned;

  const RW_STAT = RW().stat;
  if (isWin) {
    RW_STAT.tkWins = (RW_STAT.tkWins || 0) + 1;
  }

  const pSideName = b.playerSide === 0 ? 'TỐNG' : 'KIM';
  const msg = isDead
    ? `<b style="color:#ff5a3c">Gục ngã tại chiến trường Tống Kim!</b> Đạt <b style="color:#55ff55">${b.score} điểm</b> · Nhận <b style="color:#ffb52e">${tokensEarned} Tống Kim Lệnh</b>`
    : `<b style="color:#ffd24a">🎉 Kết thúc 5 phút Tống Kim (Phe ${pSideName})!</b> Đạt <b style="color:#55ff55">${b.score} điểm</b> · Nhận <b style="color:#ffb52e">${tokensEarned} Tống Kim Lệnh</b>`;

  log(msg);
  toast(msg);

  // Dọn dẹp chiến trường
  R.tkBattle = null;
  R.enemies = [];
  R.corpses = [];
  R.allies = [];
  R.spawnT = 0.5;

  // Luôn dịch chuyển về Biện Kinh sau khi kết thúc tống kim
  if (typeof goTown === 'function') {
    goTown(true);
  }
  if (typeof u20ZoneName === 'function') u20ZoneName();

  save();
  if (typeof netOn === 'function' && netOn() && typeof netUpload === 'function') {
    netUpload().catch(() => {});
  }

  // Hiển thị Popup bảng điểm tích lũy và số lượng Tống Kim Lệnh đạt được
  if (typeof modal === 'function') {
    const modalHtml = `
      <div style="text-align:center;padding:6px 0;">
        <h3 style="color:#ffd24a;margin:0 0 10px 0;font-size:17px;letter-spacing:1px;text-shadow:0 0 8px rgba(255,210,74,0.4);">
          ⚔️ KẾT TOÁN CHIẾN TRƯỜNG TỐNG KIM ⚔️
        </h3>
        <p style="color:#cfc6b0;margin:0 0 14px 0;font-size:13px;">
          Tham chiến: <b style="color:${b.playerSide === 0 ? '#5fb4ff' : '#ff7a5a'};font-size:14px;">Quân ${pSideName}</b>
          ${isDead ? ' · <span style="color:#ff5a5a;font-weight:bold;">(Tử trận)</span>' : ' · <span style="color:#55ff55;font-weight:bold;">(Hoàn thành 5 phút)</span>'}
        </p>

        <div style="background:#141a16;border:1px solid #7d6a3c;border-radius:6px;padding:12px;margin:0 auto 14px auto;max-width:320px;text-align:left;">
          <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #2e3b33;">
            <span style="color:#a89f91;">Sĩ Binh (+1đ):</span>
            <b style="color:#ffffff;">${b.kills.sibinh || 0}</b>
          </div>
          <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #2e3b33;">
            <span style="color:#a89f91;">Hiệu Úy (+3đ):</span>
            <b style="color:#ffffff;">${b.kills.hieuuy || 0}</b>
          </div>
          <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #2e3b33;">
            <span style="color:#a89f91;">Phó Tướng (+5đ):</span>
            <b style="color:#ffffff;">${b.kills.photuong || 0}</b>
          </div>
          <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #2e3b33;">
            <span style="color:#a89f91;">Đại Tướng (+10đ):</span>
            <b style="color:#ffffff;">${b.kills.daituong || 0}</b>
          </div>
          <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #2e3b33;">
            <span style="color:#ffd24a;">Hiệp Khách (+10đ):</span>
            <b style="color:#ffd24a;">${b.kills.bot || 0}</b>
          </div>
          <div style="display:flex;justify-content:space-between;padding:8px 0 2px 0;margin-top:4px;font-size:14px;">
            <b style="color:#e0d8c3;">Tổng Điểm Tích Lũy:</b>
            <b style="color:#55ff55;font-size:16px;">${b.score || 0} điểm</b>
          </div>
        </div>

        <div style="background:#22180a;border:1px solid #d49e35;border-radius:6px;padding:10px 14px;margin:0 auto 16px auto;max-width:320px;">
          <span style="color:#e0d8c3;font-size:13px;">Phần Thưởng Nhận Được:</span><br>
          <div style="font-size:18px;font-weight:bold;color:#ffb52e;margin-top:4px;">
            🎖️ +${tokensEarned} Tống Kim Lệnh
          </div>
          <div style="font-size:11.5px;color:#a89f91;margin-top:2px;">(Hiện có: ${tkSt.tokens || 0} Tống Kim Lệnh)</div>
        </div>

        <div style="color:#8fbc8f;font-size:12px;margin-bottom:12px;">
          📍 Đã tự động dịch chuyển nhân vật về thành Biện Kinh.
        </div>
      </div>
    `;
    modal(modalHtml, 'ĐÓNG');
  }
}

// Đổi quà từ Shop Tống Kim
function tkBuyReward(idx) {
  const item = TK_SHOP_DEV[idx];
  if (!item) return;
  const tkSt = getTkState();
  if ((tkSt.tokens || 0) < item.cost) {
    toast(`Cần ${item.cost} Tống Kim Lệnh để đổi món này`);
    return;
  }

  // Trường hợp đổi Đồ 6 dòng ngẫu nhiên
  if (item.isSixLineEquip) {
    if (typeof makeItem === 'function' && typeof addItem === 'function') {
      const eqSlots = [0, 2, 3, 4, 5, 6, 7, 8, 9];
      const d = (typeof pick === 'function') ? pick(eqSlots) : 0;
      let k = 0;
      if (d === 0) {
        if (typeof FAC !== 'undefined' && FAC[S.fac] && FAC[S.fac].wcode >= 0 && FAC[S.fac].wcode !== 9) {
          k = FAC[S.fac].wcode;
        } else {
          k = 0;
        }
      } else if (typeof sexPart === 'function') {
        k = sexPart(d, S.sex || 0);
      }
      const tier = (typeof clamp === 'function') ? clamp(Math.floor((S.lvl || 10) / 10), 1, 10) : 5;
      const newGear = makeItem(d, k, tier, 6);
      if (newGear) {
        tkSt.tokens -= item.cost;
        addItem(newGear, false, true, true);
        toast(`Đã đổi thành công: [${newGear.n || 'Trang Bị 6 Dòng'}]!`);
        log(`<b style="color:#e09828">🎁 Tiệm Tống Kim: Đổi thành công trang bị 6 dòng [${esc(newGear.n)}]!</b>`);
        save();
        if (typeof netOn === 'function' && netOn() && typeof netUpload === 'function') {
          netUpload().catch(() => {});
        }
        return;
      }
    }
  }

  tkSt.tokens -= item.cost;
  grant(item.gift, `Tống Kim: ${item.n}`);
  toast(`Đã đổi thành công: ${item.n}`);
  save();
  if (typeof netOn === 'function' && netOn() && typeof netUpload === 'function') {
    netUpload().catch(() => {});
  }
}

// Giao diện Tab Tống Kim trong bảng Hoạt động
function tkBattleBody() {
  const tkSt = getTkState();
  const curTokens = tkSt.tokens || 0;
  const dayRuns = tkSt.dayRuns || 0;
  const isPlaying = !!R.tkBattle;
  const canJoin = S.lvl >= TK_REQ_LVL && dayRuns < TK_DAILY_LIMIT;

  return `<section class="tk-panel" style="margin-top:6px;">
    <div class="card" style="background:#19201b;border:1px solid #7d6a3c;padding:10px;border-radius:4px;">
      <h4 style="color:#ffd24a;margin:0 0 6px 0;">⚔ CHIẾN TRƯỜNG TỐNG KIM (BẢN ĐỒ PHONG LĂNG ĐỘ)</h4>
      <p class="dim small" style="margin:0 0 8px 0;line-height:1.5;">
        • <b>Thời gian:</b> Mỗi trận kéo dài <b>5 phút</b>, đồng hồ đếm ngược hiển thị giữa màn hình.<br>
        • <b>Phân bố:</b> Quân lính phân thành các <b>cụm rải rác</b> trên bản đồ (mỗi cụm gồm <b>6 Sĩ Binh, 2 Hiệu Úy</b>). Sẽ tự động tấn công khi người chơi đến gần.<br>
        • <b>Tướng lĩnh:</b> Phút thứ 3 xuất hiện <b>Phó Tướng</b>, phút thứ 4 xuất hiện <b>Đại Tướng</b> ngẫu nhiên tại các cứ điểm (có thông báo trên màn hình).<br>
        • <b>Hiệp khách (Bot):</b> 9 Bot nhân vật các môn phái tự động tuần tra di chuyển khắp map PK (4 bot cùng phe, 5 bot đối địch). Khi bị hạ sẽ tự hồi sinh tại điểm xuất phát.<br>
        • <b>Hồi sinh:</b> Sĩ Binh, Hiệu Úy và Bot Hiệp khách sẽ <b>tự hồi sinh</b>. Phó Tướng và Đại Tướng <b>không hồi sinh</b>.<br>
        • <b>Tính điểm:</b> Sĩ Binh: <b>1đ</b> | Hiệu Úy: <b>3đ</b> | Phó Tướng: <b>5đ</b> | Đại Tướng: <b>10đ</b> | Hiệp Khách: <b>10đ</b>.<br>
        • <b>Kết toán:</b> 50 điểm = 5 Lệnh, 100 điểm = 10 Lệnh (tăng dần theo điểm số).<br>
        • <b>Giới hạn:</b> Yêu cầu cấp độ <b>Lv 100+</b>, mỗi ngày được tham gia <b>10 lượt</b>.
      </p>
      <div style="display:flex;justify-content:space-between;align-items:center;background:#0d1410;padding:6px 10px;border-radius:3px;border:1px solid #2f4035;">
        <span>Tống Kim Lệnh: <b style="color:#ffb52e;font-size:14px;">${curTokens}</b></span>
        <span>Lượt hôm nay: <b style="color:${dayRuns < TK_DAILY_LIMIT ? '#7fe3a5' : '#ff7a5a'}">${dayRuns}/${TK_DAILY_LIMIT}</b></span>
      </div>
    </div>

    <div class="btnrow" style="margin:10px 0;display:flex;gap:10px;">
      ${isPlaying
        ? `<button class="btn red" id="btnTkBattleQuit" style="flex:1;padding:10px;font-weight:bold;">🏳️ Rời Trận Tống Kim</button>`
        : `<button class="btn on" id="btnTkBattleEnter" style="flex:1;padding:10px;font-weight:bold;background:#b32d16;color:#ffd76a;border-color:#e09828;" ${!canJoin ? 'disabled' : ''}>
            ${S.lvl < TK_REQ_LVL ? `Yêu cầu cấp độ ${TK_REQ_LVL}+` : dayRuns >= TK_DAILY_LIMIT ? `Đã hết ${TK_DAILY_LIMIT} lượt hôm nay` : '⚔ Tham Gia Tống Kim (Chọn Phe Ngẫu Nhiên)'}
           </button>`
      }
    </div>

    <div class="card" style="background:#131815;border:1px solid #443c26;padding:8px;border-radius:4px;">
      <b style="color:#e8dcb0;">🏪 TIỆM TỐNG KIM LỆNH</b>
      <div style="display:grid;gap:6px;margin-top:6px;">
        ${TK_SHOP_DEV.map((it, idx) => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;background:#1a211d;border:1px solid #2e3b33;border-radius:3px;">
            <span style="color:#e0d8c3;font-size:12.5px;">${esc(it.n)}</span>
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="color:#ffd24a;font-weight:bold;font-size:12px;">${it.cost} Lệnh</span>
              <button class="btn sm ${curTokens >= it.cost ? 'on' : ''}" data-tk-buy="${idx}" ${curTokens >= it.cost ? '' : 'disabled'}>Đổi</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  </section>`;
}

// Bắt sự kiện click trong tab Tống Kim
function bindTkBattleTab(onRefresh) {
  const enterBtn = document.getElementById('btnTkBattleEnter');
  if (enterBtn) {
    enterBtn.onclick = () => {
      tkBattleStart();
      if (typeof onRefresh === 'function') onRefresh();
    };
  }
  const quitBtn = document.getElementById('btnTkBattleQuit');
  if (quitBtn) {
    quitBtn.onclick = () => {
      tkBattleFinish(false, false);
      if (typeof onRefresh === 'function') onRefresh();
    };
  }
  document.querySelectorAll('[data-tk-buy]').forEach(b => {
    b.onclick = () => {
      tkBuyReward(+b.dataset.tkBuy);
      if (typeof onRefresh === 'function') onRefresh();
    };
  });
}

// Tick Tống Kim được gọi mỗi khung hình trong combat loop
if (typeof window !== 'undefined') {
  window.tkBattleStart = tkBattleStart;
  window.tkBattleFinish = tkBattleFinish;
  window.tkBattleBody = tkBattleBody;
  window.bindTkBattleTab = bindTkBattleTab;
  window.tkBattleTick = tkBattleTick;
  window.drawTkBattleHud = drawTkBattleHud;
  window.tkAllyEnts = tkAllyEnts;
  window.tkAllyDraw = tkAllyDraw;
}
