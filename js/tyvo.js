// === HỆ THỐNG TỶ VÕ TRƯỜNG (ARENA BOT COMBAT SYSTEM) ===
// Đồng bộ chuẩn từ SrcDev sang JX2

var GD = "Asia/Ho_Chi_Minh";
var KD = ["Đệ tử nhập môn", "Đệ tử nội môn", "Tinh anh bổn môn", "Hộ pháp · Đà chủ", "Cao thủ Bách Nhân Lôi Đài", "Đại đệ tử chân truyền"];
var qD = ["Đệ tử", "Đệ tử nội môn", "Tinh anh", "Hộ pháp", "Cao thủ", "Đại đệ tử chân truyền"];
var JD = ["Hàn Nhất Kiếm", "Lăng Thiên", "Mạc Thanh Phong", "Dương Hạo Nhiên", "Bạch Vân Phi", "Tần Tiểu Long", "Khúc Lăng", "Phương Trực", "Lục Thiếu Du", "Cổ Nhạn Hành", "Ngô Phi Ưng", "Đoàn Chính Hạo", "Thạch Phá Thiên", "Cung Bất Bại", "Viên Thừa Chí", "Liễu Tàn Dương", "Tô Cẩm Bằng", "Bùi Văn Khải", "Âu Dương Phong Lôi", "Triệu Huyền Cơ"];
var YD = ["Liễu Như Yên", "Tố Tâm", "Hạ Băng Nhi", "Mộ Dung Tuyết", "Lam Nguyệt", "Diệp Thanh Thanh", "Thu Ngưng", "Vân Tịch", "Đàm Nguyệt Hoa", "Tiểu Điệp", "Chu Tử Nhi", "Bạch Mai Hương", "Lục Y Y", "Phượng Linh", "Nhược Thủy", "Tử Vân Hi", "Kiều Diễm Ngọc", "Hồ Điệp Lan", "Tuyết Lăng Ba", "Trúc Thanh Âm"];
var XD = new Set(["emei", "cuiyan"]);
var ZD = new Set(["shaolin", "tianwang"]);
var $D = ["1 Huyền Tinh theo cấp", "1 Huyền Tinh + 1 Thủy Tinh Trắng", "1 Thần Bí Khoáng Thạch + 1 Tinh Hồng Bảo Thạch", "2 Huyền Tinh + 1 Thủy Tinh Trắng", "Vũ khí thường phù hợp môn phái, cấp dùng được", "Võ Lâm Mật Tịch + vũ khí phù hợp môn phái"];
var eO = [
  {cost: 8, name: "1 Huyền Tinh theo cấp", gift: {ht: 1}},
  {cost: 12, name: "1 Thủy Tinh Trắng", gift: {mats: {wc: 1}}},
  {cost: 20, name: "1 Thần Bí Khoáng Thạch + 1 Tinh Hồng Bảo Thạch", gift: {mats: {mys: 1, thbt: 1}}}
];
var tO = "school";
var nO = 0;
var rO = null;
var iO = null;
var aO = null;
var oO = "";

function cO() {
  let e = Math.floor((Date.now() + 252e5) / 864e5);
  return e !== aO && (oO = new Date(e * 864e5).toISOString().slice(0, 10), aO = e), oO;
}

function lO() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const vnTime = new Date(utc + (3600000 * 7));
  const midnight = new Date(vnTime);
  midnight.setHours(24, 0, 0, 0);
  const diffMs = midnight.getTime() - vnTime.getTime();
  const mins = Math.max(0, Math.ceil(diffMs / 60000));
  return `${Math.floor(mins / 60)} giờ ${mins % 60} phút`;
}

function uO() {
  let e = RW();
  e.vh = Math.max(0, Math.floor(+e.vh || 0));
  let t = cO(), n = e.tv ||= {day: t, wins: 0, best: 0, school: 0, claimed: {}, history: []};
  return n.day !== t && (n.day = t, n.wins = 0, n.best = 0),
  n.wins = Math.max(0, Math.floor(+n.wins || 0)),
  n.best = Math.max(0, Math.floor(+n.best || 0)),
  n.school = clamp(Math.floor(+n.school || 0), 0, KD.length),
  n.claimed = n.claimed && typeof n.claimed === "object" ? n.claimed : {},
  n.history = Array.isArray(n.history) ? n.history.slice(0, 8) : [],
  n;
}

var Ls = {0: "Kiếm", 1: "Đao", 2: "Côn", 3: "Thương", 4: "Chùy", 5: "Song đao", 7: "Ám khí", 9: "Tay không"};

function dO(e, t) {
  let n = e && e.key, r = Number.isFinite(+t) && +t >= 0 ? +t : e && e.wcode >= 0 ? e.wcode : 9;
  return {
    key: n,
    name: e && e.n || "Võ sĩ giang hồ",
    series: e && Number.isFinite(+e.series) ? +e.series : (heroSeries ? heroSeries() : 0),
    weaponCode: r,
    weaponName: Ls[r] || "Vũ khí môn phái",
    ranged: ["tangmen", "wudu", "tianren", "gaibang", "kunlun", "cuiyan"].includes(n)
  };
}

function fO(e, t = null) {
  let n = XD.has(e) ? 1 : ZD.has(e) ? 0 : +(Math.random() < 0.5),
      r = n ? YD : JD,
      i = r.filter(x => x !== t);
  return {sex: n, name: pick(i.length ? i : r)};
}

function pO(e, t = null, n = null) {
  let r = FACTIONS.filter(x => !x.novice),
      i = e === "school" ? FAC[S.fac] : pick(r.filter(x => !t || x.key !== t) || r),
      a = (i && i.wcode) !== undefined ? i.wcode : 9,
      o = dO(i, a),
      s = fO(i.key, n),
      c = uO();
  if (e === "school") {
    let e = c.school, t = KD[e] || KD[KD.length - 1];
    return {
      mode: "school",
      step: e,
      factionKey: i.key,
      factionName: i.n,
      series: o.series,
      weaponCode: o.weaponCode,
      weaponName: o.weaponName,
      ranged: o.ranged,
      sex: s.sex,
      personName: s.name,
      name: `${t} · ${s.name}`,
      title: `${t} · ${i.n}`,
      difficulty: 0
    };
  }
  let l = [1, 2, 3][nO] || 1;
  return {
    mode: "jianghu",
    step: -1,
    factionKey: i.key,
    factionName: i.n,
    series: o.series,
    weaponCode: o.weaponCode,
    weaponName: o.weaponName,
    ranged: o.ranged,
    sex: s.sex,
    personName: s.name,
    name: `${s.name}`,
    title: `${i.n} · ${s.name}`,
    difficulty: nO,
    reward: l
  };
}

function mO(e = tO) {
  return rO && rO.mode === e ? rO : rO = pO(e);
}

function hO(e) {
  return KD[e.school] || "Đã xong";
}

function gO(e, t) {
  e.history = [t, ...e.history.filter(x => x.name !== t.name || x.mode !== t.mode)].slice(0, 8);
}

// Giảm sát thương nhận vào trong Tỷ Võ để trận đánh dài và kịch tính hơn
function _O(dmg) {
  return dmg * 0.45;
}

function AO() {
  const e = OBS.g, t = [];
  if (e) {
    let n = Math.floor(H.x / e.cw), r = Math.floor(H.y / e.ch),
        i = Math.ceil(360 / e.cw), a = Math.ceil(360 / e.ch);
    for (let o = Math.max(0, r - a); o <= Math.min(e.gh - 1, r + a); o++) {
      for (let s = Math.max(0, n - i); s <= Math.min(e.gw - 1, n + i); s++) {
        let cx = (s + 0.5) * e.cw, cy = (o + 0.5) * e.ch,
            dist = Math.hypot(cx - H.x, cy - H.y);
        if (dist >= 72 && dist <= 360 && obsWalk(cx, cy) && obsSee(H.x, H.y, cx, cy)) {
          t.push({x: cx, y: cy, score: Math.abs(dist - 165) + Math.random() * 24});
        }
      }
    }
  } else {
    for (let e = 0; e < 24; e++) {
      let n = Math.PI * 2 * e / 24 + rnd(-0.08, 0.08),
          r = rnd(145, 200),
          [ix, iy] = inWorld(H.x + Math.cos(n) * r, H.y + Math.sin(n) * r);
      if (Math.hypot(ix - H.x, iy - H.y) >= 72) {
        t.push({x: ix, y: iy, score: Math.abs(Math.hypot(ix - H.x, iy - H.y) - 165) + Math.random() * 24});
      }
    }
  }
  if (t.length) {
    t.sort((a, b) => a.score - b.score);
    let chosen = pick(t.slice(0, Math.min(8, t.length)));
    return [chosen.x, chosen.y];
  }
  return [H.x + 120, H.y];
}

// Tạo bot đối thủ tỷ võ
function kO(opp, powerScale = 1) {
  const lv = Math.max(1, S.lvl);
  const [spawnX, spawnY] = AO();
  const zone = zoneOf(Math.min(S.stage, STAGES));
  const tid = zone && zone.m && zone.m.length ? zone.m[0] : 1;
  const bot = makeEnemy(tid, lv, "boss", spawnX, spawnY);

  bot.n = opp.name;
  bot.series = opp.series;
  bot.ranged = opp.ranged;
  bot.tvFighter = true;
  bot.tvTitle = opp.title;
  bot.tvPersonName = opp.personName;
  bot.factionKey = opp.factionKey;

  // Cân bằng chỉ số theo đối thủ
  const userLife = Math.max(1, R.P ? R.P.life : 1000);
  const userDps = Math.max(50, R.P && R.P.main ? R.P.main.dps || R.P.main.tot || 100 : 100);

  bot.max = bot.hp = Math.round(userDps * (18 + opp.difficulty * 4) * powerScale);
  bot.def = Math.round((R.P ? R.P.def : 200) * 0.85);
  bot.ar = Math.round((R.P ? R.P.ar : 500) * 0.95);
  bot.dmg = Math.round(userLife * 0.15 * Math.min(powerScale, 2.0));
  bot.spd = 160 * (opp.ranged ? 1.05 : 1.15);
  bot.cd = 0.9;
  bot.atkCd = rnd(0.2, 0.4);
  bot.reach = opp.ranged ? 220 : 65;

  return bot;
}

function jO() {
  let e = document.getElementById("tyVoHud");
  if (!e) {
    e = document.createElement("section");
    e.id = "tyVoHud";
    e.className = "tyvo-hud";
    const battle = document.getElementById("battle") || document.body;
    battle.appendChild(e);
  }
  let t = R.tyvo;
  if (!t) {
    e.remove();
    return;
  }
  let n = Math.max(0, Math.ceil(t.roundLeft || 0)),
      r = `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

  if (e.__tvOpponent !== t.opponent || e.__tvMode !== t.mode || e.__tvRound !== t.streak) {
    e.innerHTML = `
      <div class="tyvo-hud-kicker">TỶ VÕ TRƯỜNG · ${t.mode === "school" ? "TỶ KHÍ ĐỒNG MÔN" : "GIANG HỒ TỶ VÕ"}</div>
      <b>${esc(t.opponent.title || t.opponent.name)}</b>
      <b>${esc(t.opponent.personName || "")}</b>
      <div class="tyvo-hud-meta">Trận ${t.streak + 1}</div>
      <div class="tyvo-round-clock">Thời gian trận <b>${r}</b></div>
      <button class="tyvo-hud-stop" type="button">Dừng chuỗi</button>
    `;
    e.__tvOpponent = t.opponent;
    e.__tvMode = t.mode;
    e.__tvRound = t.streak;
    const stopBtn = e.querySelector("button");
    if (stopBtn) stopBtn.onclick = () => FO(false, "quit");
  }
  let clockEl = e.querySelector(".tyvo-round-clock b");
  if (clockEl) clockEl.textContent = r;
}

function MO() {
  let e = R.tyvo;
  if (!e) return;
  let opp = e.firstOpponent || pO(e.mode, e.mode === "jianghu" && e.opponent ? e.opponent.factionKey : null, e.opponent && e.opponent.personName);
  let scale = e.powerScale;
  e.firstOpponent = null;
  e.resolved = false;
  e.roundActive = false;
  e.roundDeadline = 0;
  e.roundLeft = 300;
  e.opponent = opp;

  try {
    const fighter = kO(opp, scale);
    R.enemies = [fighter];
  } catch (err) {
    console.error(err);
    FO(false, "avatar");
    return;
  }

  e.roundActive = true;
  e.roundDeadline = Date.now() + 3e5;
  e.roundLeft = 300;
  R.stall = 0;
  R.spawnT = 0;
  R.banner = null;
  jO();
  if (typeof refresh === "function") refresh();
}

function NO(dt = 1/60) {
  if (!R.tyvo) return false;
  let t = cO();
  R.tyvo.day !== t && (R.tyvo.day = t, R.tyvo.resetPending = true);
  let n = R.tyvo;
  if (n.roundActive) {
    n.roundLeft = Math.max(0, ((n.roundDeadline || Date.now()) - Date.now()) / 1000);
    jO();
    if (n.roundLeft <= 0) return FO(false, "timeout"), true;
  }
  return false;
}

function startTyvo(mode = "school") {
  if (!S.fac || S.lvl < 30) {
    toast("Tỷ Võ Trường mở từ cấp 30");
    return;
  }
  if (R.dg || R.tyvo || R.tower || R.tkBattle || R.deadT > 0) {
    toast("Hãy kết thúc hoạt động hiện tại và hồi phục trước");
    return;
  }
  let opp = mO(mode);
  let backup = {
    x: H.x, y: H.y,
    life: R.life, mana: R.mana,
    field: R.field, enemies: R.enemies, corpses: R.corpses, ground: R.ground,
    spawnT: R.spawnT, zoneShown: R.zoneShown
  };

  R.tyvo = {
    mode: mode,
    difficulty: mode === "school" ? 0 : nO,
    streak: 0,
    powerScale: 1,
    day: cO(),
    resetPending: false,
    roundActive: false,
    roundDeadline: 0,
    roundLeft: 300,
    firstOpponent: opp,
    opponent: opp,
    before: backup
  };

  R.field = null;
  R.enemies = [];
  R.corpses = [];
  R.ground = [];
  R.spawnT = 0.35;
  R.atkT = 0;
  R.life = R.P ? R.P.life : 1000;
  R.mana = R.P ? R.P.mana : 500;
  document.body.classList.add("tyvo-active");
  jO();

  R.banner = {
    t: 2.4,
    text: "Tỷ Võ Trường",
    sub: mode === "school" ? "Tỷ Khí Đồng Môn · Đấu với đệ tử bổn môn" : "Giang Hồ Tỷ Võ · Đối đầu thập đại môn phái"
  };
  save();
  closeModal(true);
  MO();
}

function FO(isWin = false, reason = "quit") {
  if (!R.tyvo) return;
  let n = R.tyvo, r = n.resetPending || n.day !== cO(), i = uO(), a = n.opponent;
  if (!n.resolved) {
    gO(i, {
      mode: n.mode,
      name: a ? a.personName || a.name : "Tỷ Võ Trường",
      faction: a ? a.factionName : "",
      result: isWin ? "Thắng" : reason === "loss" ? "Thua" : reason === "timeout" ? "Hết giờ" : "Dừng",
      streak: n.streak
    });
  }
  if (!r) i.best = Math.max(i.best, n.streak);

  let b = n.before;
  R.tyvo = null;
  R.enemies = b ? b.enemies : [];
  R.corpses = b ? b.corpses : [];
  R.ground = b ? b.ground : [];
  R.field = b ? b.field : null;
  R.spawnT = b ? b.spawnT : 0.5;
  R.zoneShown = b ? b.zoneShown : null;
  if (b) {
    H.x = b.x; H.y = b.y;
    R.life = Math.min(R.P.life, b.life || R.P.life);
    R.mana = Math.min(R.P.mana, b.mana || R.P.mana);
  }
  document.body.classList.remove("tyvo-active");
  const hud = document.getElementById("tyVoHud");
  if (hud) hud.remove();

  let msg = isWin ? "Đã dừng chuỗi Tỷ Võ." : reason === "loss" ? "Bạn đã bại trận trong Tỷ Võ." : reason === "timeout" ? "Hết 5 phút thi đấu." : "Đã dừng chuỗi Tỷ Võ.";
  toast(msg);
  log(`<span class="dim">${msg}</span>`);
  save();
  if (typeof refresh === "function") refresh();
}

function LO() {
  let e = R.tyvo;
  if (!e || e.resolved) return;
  e.resolved = true;
  e.roundActive = false;
  let t = e.resetPending || e.day !== cO(), n = uO(), r = [1, 2, 3][e.difficulty] || 1;

  if (e.mode === "school" && n.school < KD.length) {
    n.school = Math.min(KD.length, n.school + 1);
    rO = null;
  }

  // Thưởng Võ Huân
  let user = RW();
  user.vh = (user.vh || 0) + r;
  n.wins++;
  if (t) {
    e.streak = 0; e.powerScale = 1; e.resetPending = false; e.day = cO();
  } else {
    e.streak++; e.powerScale *= 1.05;
  }
  n.best = Math.max(n.best, e.streak);
  gO(n, {
    mode: e.mode,
    name: e.opponent.personName || e.opponent.name,
    faction: e.opponent.factionName,
    result: "Thắng",
    reward: r,
    streak: e.streak
  });

  R.life = Math.min(R.P.life, R.life + R.P.life * 0.25);
  R.mana = Math.min(R.P.mana, R.mana + R.P.mana * 0.25);

  R.enemies = [];
  R.corpses = [];
  R.spawnT = 1.2;
  R.banner = {t: 2.1, text: "Chiến thắng", sub: `+${r} Võ Huân · Chuỗi thắng: ${e.streak}`};
  log(`<span class="good">⚔ Thắng trận Tỷ Võ · Nhận <b>+${r} Võ Huân</b> (Chuỗi: ${e.streak})</span>`);
  save();
  jO();

  // Tiếp tục vòng tiếp theo sau 1.5s
  setTimeout(() => {
    if (R.tyvo) MO();
  }, 1500);
}

function RO(idx) {
  let item = eO[idx];
  let user = RW();
  if (!item) return;
  if ((user.vh || 0) < item.cost) {
    toast(`Cần ${item.cost} Võ Huân`);
    return;
  }
  user.vh -= item.cost;
  grantGift(item.gift, `Cửa hàng Tỷ Võ · ${item.name}`);
  toast(`Đã đổi: ${item.name}`);
  save();
  openTyvoModal();
}

function openTyvoModal(tabMode = tO) {
  tO = tabMode;
  let tvData = uO(),
      curTyvo = R.tyvo,
      mode = curTyvo ? curTyvo.mode : tO,
      opp = curTyvo ? curTyvo.opponent : mO(mode),
      isSchoolDone = tvData.school >= KD.length,
      nextRank = isSchoolDone ? "Đã hoàn thành toàn bộ mốc" : hO(tvData),
      diffNames = ["Ngang sức", "Cao thủ", "Tông sư"],
      histHtml = tvData.history.slice(0, 5).map(h => `
        <div class="tyvo-history-row">
          <span class="tyvo-history-result ${h.result === "Thắng" ? "up" : "dim"}">${esc(h.result)}</span>
          <b>${esc(h.name)}</b>
          <small>${esc(h.faction || "")}${h.reward ? ` · +${h.reward} Võ Huân` : ""}</small>
        </div>
      `).join("");

  const shopHtml = eO.map((item, idx) => `
    <div class="tyvo-shop-card">
      <div><b>${item.name}</b><small>Giá: ${item.cost} Võ Huân</small></div>
      <button class="btn sm" data-tv-shop="${idx}" ${(RW().vh || 0) >= item.cost ? "" : "disabled"}>Đổi</button>
    </div>
  `).join("");

  const html = `
    <section class="tyvo-panel">
      <header class="tyvo-heading">
        <div>
          <span class="tyvo-eyebrow">ĐẤU TRƯỜNG MÔ PHỎNG</span>
          <h3>Tỷ Võ Trường</h3>
          <p>Thắng để nhận Võ Huân và đối đầu các cao thủ võ lâm.</p>
        </div>
        <div class="tyvo-currency"><small>VÕ HUÂN</small><b>${fmtL(RW().vh || 0)}</b></div>
      </header>

      <div class="tyvo-reset-line">
        <span>Chuỗi tỷ võ reset lúc <b>00:00</b></span>
        <small>còn ${lO()} · hôm nay ${tvData.wins} trận · kỷ lục ${tvData.best}</small>
      </div>

      ${curTyvo ? `
        <div class="tyvo-active-card">
          <span class="tyvo-live-dot"></span>
          <div>
            <small>ĐANG TRÊN ĐÀI · ${curTyvo.mode === "school" ? "TỶ KHÍ ĐỒNG MÔN" : "GIANG HỒ TỶ VÕ"}</small>
            <b>${esc(curTyvo.opponent.title || curTyvo.opponent.name)}</b>
            <span>Thắng liên tiếp ${curTyvo.streak} trận</span>
          </div>
          <button class="btn red sm" id="tvStop">Dừng chuỗi</button>
        </div>
      ` : `
        <div class="tyvo-mode-switch" role="tablist">
          <button type="button" data-tv-mode="school" class="${mode === "school" ? "on" : ""}">Tỷ Khí Đồng Môn</button>
          <button type="button" data-tv-mode="jianghu" class="${mode === "jianghu" ? "on" : ""}">Giang Hồ Tỷ Võ</button>
        </div>

        <div class="tyvo-opponent-card">
          <div class="tyvo-opponent-medal">⚔</div>
          <div class="tyvo-opponent-copy">
            <small>${mode === "school" ? "MÔN PHÁI CỦA BẠN" : "ĐỐI THỦ NGẪU NHIÊN"}</small>
            <b>${esc(opp.title || opp.name)}</b>
            <span>Cấp ${S.lvl} · ${esc(opp.weaponName)}</span>
          </div>
          ${mode === "jianghu" ? `<button class="tyvo-reroll" id="tvReroll" type="button" title="Đổi đối thủ">↻</button>` : ""}
        </div>

        ${mode === "school" ? `
          <div class="tyvo-progress">
            <div><span>Mốc kế tiếp:</span> <b>${esc(nextRank)}</b></div>
            <div class="tyvo-progress-track"><i style="width:${Math.min(100, tvData.school / KD.length * 100)}%"></i></div>
            <small>${tvData.school}/${KD.length} mốc môn phái</small>
          </div>
        ` : `
          <div class="tyvo-diff-row">
            <span>Độ khó:</span>
            ${diffNames.map((dName, dIdx) => `
              <button class="btn sm ${nO === dIdx ? "on" : ""}" data-tv-diff="${dIdx}">${dName} (+${dIdx + 1} VH)</button>
            `).join(" ")}
          </div>
        `}

        <div class="btnrow" style="margin: 8px 0;">
          <button class="btn on" id="tvStart" style="flex: 1; padding: 10px; font-weight: bold; background: #e09828; color: #1a1208;">VÀO TỶ VÕ NGAY</button>
        </div>
      `}

      <div class="card" style="margin-top: 6px;">
        <b>Cửa Hàng Võ Huân</b>
        <div style="display: grid; gap: 6px; margin-top: 6px;">
          ${shopHtml}
        </div>
      </div>

      ${histHtml ? `
        <div class="card" style="margin-top: 6px;">
          <b>Lịch sử gần đây</b>
          <div class="tyvo-history">${histHtml}</div>
        </div>
      ` : ""}
    </section>
  `;

  modal(html, () => {
    const startBtn = document.getElementById("tvStart");
    if (startBtn) startBtn.onclick = () => startTyvo(mode);

    const stopBtn = document.getElementById("tvStop");
    if (stopBtn) stopBtn.onclick = () => FO(false, "quit");

    const rerollBtn = document.getElementById("tvReroll");
    if (rerollBtn) rerollBtn.onclick = () => {
      rO = pO("jianghu", opp.factionKey, opp.personName);
      openTyvoModal("jianghu");
    };

    document.querySelectorAll("[data-tv-mode]").forEach(btn => {
      btn.onclick = () => {
        tO = btn.dataset.tvMode;
        rO = null;
        openTyvoModal(tO);
      };
    });

    document.querySelectorAll("[data-tv-diff]").forEach(btn => {
      btn.onclick = () => {
        nO = +btn.dataset.tvDiff;
        rO = null;
        openTyvoModal("jianghu");
      };
    });

    document.querySelectorAll("[data-tv-shop]").forEach(btn => {
      btn.onclick = () => RO(+btn.dataset.tvShop);
    });
  });
}