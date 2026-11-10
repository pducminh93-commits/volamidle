// Hệ thống Đồng Hành (Pet Companion) chuẩn SrcDev: 18 loài pet, 36 chiêu thức độc quyền, hiệu ứng và vai trò
"use strict";

const PET_SPECIES_LIST = [11, 12, 42, 43, 31, 5, 6, 34, 33, 36, 9, 27, 45, 21, 24, 13, 3, 2];
const PET_MAX_LV = 100;
let curPreviewPetId = null;

const PET_ROLES = {
  11: { tags: ["Khống chế", "Đánh lan"], fit: "Hợp khi bị nhiều quái áp sát: dậm đất đánh quanh mình và làm choáng." },
  12: { tags: ["Đánh lan", "Độc"], fit: "Hợp khi cần dọn nhóm quái: gai gây độc và chiêu cấp 30 bắn trúng nhiều mục tiêu." },
  42: { tags: ["Hồi phục", "Hỗ trợ"], fit: "Hợp khi muốn trụ lâu: thường xuyên hồi sinh lực, rồi hồi thêm nội lực ở cấp 30." },
  43: { tags: ["Dồn sát thương", "Hồi phục"], fit: "Hợp khi muốn vừa đánh mạnh một mục tiêu vừa có một lần hồi sinh lực." },
  31: { tags: ["Liên kích", "Đánh lan"], fit: "Hợp khi muốn dồn nhiều đòn nhanh và lướt đánh tiếp các mục tiêu gần." },
  5:  { tags: ["Kết liễu", "Choáng"], fit: "Hợp khi săn mục tiêu yếu máu: đòn cắn đau hơn lúc gần hết máu, chiêu sau có thể làm choáng." },
  6:  { tags: ["Độc", "Đánh lan"], fit: "Hợp khi đánh nhóm đông: đốt mục tiêu đơn lẻ rồi phóng hỏa khí gây sát thương lan." },
  34: { tags: ["Dồn sát thương", "Choáng"], fit: "Hợp khi cần áp sát một mục tiêu, gây cú bổ mạnh rồi khóa chân bằng choáng." },
  33: { tags: ["Đánh lan", "Choáng", "Hồi phục"], fit: "Hợp khi cần khống chế đám đông nhưng vẫn có thêm hồi phục cho chủ nhân." },
  36: { tags: ["Đánh nhiều mục tiêu", "Liên kích"], fit: "Hợp khi quái đứng thành nhóm: ném đá nhiều mục tiêu và đánh liên hoàn khi lên cấp 30." },
  9:  { tags: ["Đánh lan", "Khống chế"], fit: "Hợp khi dọn bầy quái: hồ hỏa đánh cả nhóm, chiêu sau làm choáng mục tiêu." },
  27: { tags: ["Hút máu", "Hồi nội lực"], fit: "Hợp khi cần tự hồi phục trong lúc đánh: hút sinh lực và nội lực từ địch." },
  45: { tags: ["Độc", "Làm chậm", "Đánh lan"], fit: "Hợp khi muốn ghìm nhóm quái: tơ độc đánh lan và làm chậm chúng." },
  21: { tags: ["Độc", "Tăng sát thương"], fit: "Hợp khi săn trùm hoặc mục tiêu trâu máu: nọc độc kéo dài và khiến địch nhận thêm sát thương." },
  24: { tags: ["Tấn công nhanh", "Đánh lan"], fit: "Hợp khi muốn đánh liên tục và chuyển đòn qua nhiều kẻ địch." },
  13: { tags: ["Chống chịu", "Khống chế"], fit: "Hợp khi cần thêm phòng thủ: húc choáng diện rộng và giảm sát thương chủ nhân phải chịu." },
  3:  { tags: ["Kết liễu", "Chảy máu"], fit: "Hợp khi tập trung hạ một mục tiêu: mạnh hơn lúc địch yếu và gây chảy máu." },
  2:  { tags: ["Kết liễu", "Tăng sát thương"], fit: "Hợp khi săn mục tiêu lớn: vồ kết liễu rồi tăng sát thương cho cả chủ nhân và pet." }
};

function petRoleInfo(tid) {
  return PET_ROLES[tid] || { tags: ["Tấn công"], fit: "Đồng hành hỗ trợ chủ nhân bằng các đòn đánh và kỹ năng riêng." };
}

function petRoleTagsHtml(tid) {
  return petRoleInfo(tid).tags.map(t => `<span class="pet-role-tag">${esc(t)}</span>`).join("");
}

function petSkillIcon(sid) {
  const sk = typeof SK !== "undefined" && SK[sid];
  if (sk && sk.ic) return sk.ic;
  return `img/s/${sid}.png`;
}

const PET_SKILLS = {
  11: [
    { key: "boarCharge", n: "Sơn Trư Xung Kích", d: "Húc mục tiêu gây sát thương mạnh.", ic: petSkillIcon(34), fx: 14, kind: "strike", mult: 1.8, cd: 8, col: "#ffd36a" },
    { key: "boarQuake", n: "Chấn Địa", d: "Dậm đất gây sát thương lan và choáng.", ic: petSkillIcon(41), fx: 41, kind: "stunArea", mult: 1.05, splash: 0.55, rad: 86, stun: 0.65, cd: 14, lv: 30, col: "#ffc45c" }
  ],
  12: [
    { key: "hedgehogSpines", n: "Cương Châm", d: "Phóng gai và khiến mục tiêu trúng độc.", ic: petSkillIcon(73), fx: 65, kind: "poison", mult: 0.8, dot: 1.15, cd: 8, col: "#9fe36a" },
    { key: "hedgehogVolley", n: "Vạn Châm", d: "Bắn gai trúng nhiều kẻ địch quanh mục tiêu.", ic: petSkillIcon(54), fx: 105, kind: "area", mult: 1.05, splash: 0.72, rad: 100, cd: 14, lv: 30, col: "#a9e875" }
  ],
  42: [
    { key: "deerRenewal", n: "Linh Lộc Hồi Xuân", d: "Gây sát thương nhẹ và hồi sinh lực cho chủ nhân.", ic: petSkillIcon(93), fx: 80, kind: "heal", mult: 0.6, heal: 0.055, cd: 9, col: "#8fe3ad" },
    { key: "deerCalm", n: "Thanh Tâm", d: "Gây sát thương và hồi sinh lực, nội lực.", ic: petSkillIcon(166), fx: 82, kind: "restore", mult: 0.8, heal: 0.035, mana: 0.04, cd: 15, lv: 30, col: "#9ee8c2" }
  ],
  43: [
    { key: "whiteBoarCharge", n: "Bạch Trư Húc", d: "Lao tới gây sát thương lớn lên một kẻ địch.", ic: petSkillIcon(14), fx: 14, kind: "strike", mult: 2.2, cd: 9, col: "#f2d8bd" },
    { key: "whiteBoarGuard", n: "Thiết Bì", d: "Hồi một phần sinh lực cho chủ nhân.", ic: petSkillIcon(92), fx: 91, kind: "heal", mult: 0.45, heal: 0.085, cd: 16, lv: 30, col: "#e6d6c4" }
  ],
  31: [
    { key: "goldCatClaws", n: "Kim Trảo Liên Kích", d: "Liên tiếp đánh mục tiêu hai lần.", ic: petSkillIcon(47), fx: 30, kind: "multi", hits: 2, mult: 0.85, cd: 8, col: "#ffd34f" },
    { key: "goldCatShadow", n: "Tốc Ảnh", d: "Lướt qua và đánh tối đa ba kẻ địch.", ic: petSkillIcon(336), fx: 336, kind: "chain", hits: 3, mult: 1.05, falloff: 0.72, rad: 150, cd: 14, lv: 30, col: "#ffe477" }
  ],
  5: [
    { key: "grayWolfFang", n: "Lang Nha", d: "Cắn mục tiêu, mạnh hơn khi mục tiêu còn ít máu.", ic: petSkillIcon(125), fx: 34, kind: "execute", mult: 1.5, at: 0.35, finisher: 1.35, cd: 8, col: "#b9d7f3" },
    { key: "grayWolfPursuit", n: "Truy Sát", d: "Tấn công dồn dập và có thể làm choáng.", ic: petSkillIcon(128), fx: 172, kind: "stun", mult: 1.25, stun: 0.8, cd: 14, lv: 30, col: "#9fc8ef" }
  ],
  6: [
    { key: "redWolfFlame", n: "Xích Diệm Trảo", d: "Cào xé và đốt mục tiêu theo thời gian.", ic: petSkillIcon(141), fx: 145, kind: "poison", mult: 1, dot: 1.3, cd: 8, col: "#ff8b5c" },
    { key: "redWolfBlaze", n: "Cuồng Hỏa", d: "Phóng hỏa khí gây sát thương lan.", ic: petSkillIcon(148), fx: 141, kind: "area", mult: 1.25, splash: 0.68, rad: 105, cd: 14, lv: 30, col: "#ff744d" }
  ],
  34: [
    { key: "lynxPounce", n: "Liệp Ảnh", d: "Bổ nhào gây sát thương chí mạng.", ic: petSkillIcon(249), fx: 249, kind: "strike", mult: 2.35, cd: 9, col: "#d7bdff" },
    { key: "lynxPhantom", n: "Ảo Bộ", d: "Đánh nhanh khiến mục tiêu choáng.", ic: petSkillIcon(113), fx: 172, kind: "stun", mult: 1.35, stun: 0.9, cd: 14, lv: 30, col: "#c9a8ff" }
  ],
  33: [
    { key: "bearPaw", n: "Hùng Chưởng", d: "Vỗ mạnh, gây sát thương lan và choáng.", ic: petSkillIcon(20), fx: 41, kind: "stunArea", mult: 1.25, splash: 0.62, rad: 92, stun: 0.7, cd: 9, col: "#d6ad83" },
    { key: "bearFury", n: "Cuồng Nộ", d: "Tấn công rồi hồi sinh lực cho chủ nhân.", ic: petSkillIcon(20), fx: 91, kind: "heal", mult: 1.1, heal: 0.055, cd: 15, lv: 30, col: "#e8b780" }
  ],
  36: [
    { key: "monkeyPebbles", n: "Phi Thạch", d: "Ném đá trúng tối đa ba kẻ địch.", ic: petSkillIcon(302), fx: 336, kind: "chain", hits: 3, mult: 1.05, falloff: 0.7, rad: 180, cd: 8, col: "#d8c39a" },
    { key: "monkeyCombo", n: "Khỉ Quyền", d: "Đánh liên hoàn ba lần vào mục tiêu.", ic: petSkillIcon(359), fx: 50, kind: "multi", hits: 3, mult: 0.65, cd: 14, lv: 30, col: "#ead4a6" }
  ],
  9: [
    { key: "foxFire", n: "Hồ Hỏa", d: "Gọi hồ hỏa tấn công cả nhóm địch.", ic: petSkillIcon(169), fx: 186, kind: "area", mult: 1.35, splash: 0.8, rad: 112, cd: 9, col: "#ff9cda" },
    { key: "foxConfusion", n: "Mê Tung", d: "Đánh lạc hướng và làm choáng mục tiêu.", ic: petSkillIcon(90), fx: 113, kind: "stun", mult: 1.15, stun: 1.05, cd: 15, lv: 30, col: "#f2a8ff" }
  ],
  27: [
    { key: "batBloodClaw", n: "Huyết Trảo", d: "Cắn hút máu, hồi sinh lực cho chủ nhân.", ic: petSkillIcon(65), fx: 65, kind: "leech", mult: 1.35, heal: 0.045, cd: 8, col: "#e38cff" },
    { key: "batSoulDrain", n: "Hút Hồn", d: "Hút sinh lực và nội lực từ mục tiêu.", ic: petSkillIcon(69), fx: 68, kind: "restore", mult: 1.05, heal: 0.04, mana: 0.06, cd: 14, lv: 30, col: "#c99bff" }
  ],
  45: [
    { key: "spiderBite", n: "Tơ Độc", d: "Cắn mục tiêu và gây độc theo thời gian.", ic: petSkillIcon(63), fx: 63, kind: "poison", mult: 0.9, dot: 1.1, cd: 8, col: "#9bd879" },
    { key: "spiderWeb", n: "Thiên La Địa Võng", d: "Rải tơ lên nhiều mục tiêu, gây sát thương và làm chậm.", ic: petSkillIcon(105), fx: 105, kind: "area", mult: 0.9, splash: 0.6, rad: 100, slow: 0.48, slowDur: 2.4, poison: 0.35, cd: 16, lv: 30, col: "#b3e38a" }
  ],
  21: [
    { key: "greenSnakeVenom", n: "Nọc Xanh", d: "Đưa nọc độc vào mục tiêu, sát thương kéo dài.", ic: petSkillIcon(63), fx: 63, kind: "poison", mult: 1, dot: 1.2, cd: 8, col: "#79dd76" },
    { key: "greenSnakeCorrode", n: "Nọc Ăn Mòn", d: "Làm mục tiêu suy yếu, nhận thêm sát thương trong chốc lát.", ic: petSkillIcon(20), fx: 385, kind: "expose", mult: 1.25, expose: 1.12, exposeDur: 3.5, cd: 15, lv: 30, col: "#a5ed8b" }
  ],
  24: [
    { key: "goldenEagleDive", n: "Ưng Kích", d: "Lao xuống đánh nhanh một mục tiêu.", ic: petSkillIcon(50), fx: 50, kind: "multi", hits: 2, mult: 0.75, cd: 8, col: "#ffe08a" },
    { key: "goldenEagleRain", n: "Thiên Vũ", d: "Bắn loạt đạn xuyên qua nhiều kẻ địch.", ic: petSkillIcon(336), fx: 336, kind: "chain", hits: 4, mult: 0.82, falloff: 0.78, rad: 180, cd: 14, lv: 30, col: "#fff0a8" }
  ],
  13: [
    { key: "elephantCharge", n: "Voi Xung Trận", d: "Húc mạnh, gây sát thương lan và choáng ngắn.", ic: petSkillIcon(138), fx: 138, kind: "stunArea", mult: 1.35, splash: 0.62, rad: 105, stun: 0.55, cd: 9, col: "#d9c59b" },
    { key: "elephantGuard", n: "Thiết Bì Hộ Chủ", d: "Tấn công rồi giảm sát thương chủ nhân phải chịu.", ic: petSkillIcon(91), fx: 91, kind: "guard", mult: 0.8, guard: 0.18, guardDur: 4.5, cd: 17, lv: 30, col: "#c4d4b0" }
  ],
  3: [
    { key: "leopardHunt", n: "Liệp Sát", d: "Đánh chí mạng, mạnh hơn khi mục tiêu gần hết máu.", ic: petSkillIcon(249), fx: 249, kind: "execute", mult: 1.45, at: 0.4, finisher: 1.45, cd: 9, col: "#f2c47e" },
    { key: "leopardBleed", n: "Huyết Trảo", d: "Xé rách mục tiêu, gây chảy máu theo thời gian.", ic: petSkillIcon(145), fx: 145, kind: "bleed", mult: 1.05, bleed: 1.25, bleedDur: 3.5, cd: 14, lv: 30, col: "#f28b72" }
  ],
  2: [
    { key: "whiteTigerClaw", n: "Bạch Hổ Trảo", d: "Vồ tới gây sát thương lớn lên một mục tiêu.", ic: petSkillIcon(20), fx: 317, kind: "execute", mult: 1.6, at: 0.35, finisher: 1.5, cd: 9, col: "#f6e4c2" },
    { key: "whiteTigerRoar", n: "Hổ Khiếu", d: "Gầm vang, tăng sát thương của chủ nhân và đồng hành.", ic: petSkillIcon(186), fx: 186, kind: "rage", mult: 0.9, rage: 1.1, rageDur: 5, cd: 19, lv: 30, col: "#ffe7aa" }
  ]
};

const DEFAULT_PET_SKILLS = [
  { key: "companionStrike", n: "Cường Kích", d: "Tấn công mạnh hơn vào mục tiêu.", fx: 34, kind: "strike", mult: 1.5, cd: 9, col: "#9fe36a" },
  { key: "companionRenewal", n: "Hồi Xuân", d: "Tấn công và hồi sinh lực cho chủ nhân.", fx: 91, kind: "heal", mult: 0.75, heal: 0.04, cd: 15, lv: 30, col: "#9fe36a" }
];

function petSkillsOf(tid) {
  return PET_SKILLS[tid] || DEFAULT_PET_SKILLS;
}

function petSkillsHtml(tid, lvl = 1) {
  return petSkillsOf(tid).map(s => `
    <div class="petskill ${lvl >= (s.lv || 1) ? "" : "lock"}">
      <div class="petskill-head">
        ${s.ic ? `<img src="${esc(s.ic)}" alt="">` : ""}
        <b>${esc(s.n)}</b>
      </div>
      <small>${esc(s.d)}${s.lv ? ` · mở ở cấp ${s.lv}` : ""}</small>
    </div>
  `).join("");
}

// Lấy danh sách pet khả dụng theo các vùng đã đi qua
function petAvailableList() {
  const maxIdx = typeof zoneIdx === "function" ? zoneIdx(Math.min(S.maxStage || 1, STAGES)) : 0;
  const passedZones = ZONES.slice(0, maxIdx + 1);
  const mSet = new Set(passedZones.flatMap(z => z.m || []));
  if (passedZones.some(z => (z.m || []).includes(148))) mSet.add(3);
  return PET_SPECIES_LIST.filter(tid => mSet.has(tid) && MON[tid] && MON[tid].anim);
}

// Nhóm pet theo từng bản đồ
function petGroupedByZone(availablePets) {
  const avSet = new Set(availablePets);
  const seen = new Set();
  const groups = [];
  for (const z of ZONES) {
    const list = (z.m || []).filter(tid => avSet.has(tid) && !seen.has(tid));
    if (list.length) {
      list.forEach(tid => seen.add(tid));
      groups.push({ zone: z, pets: list });
    }
  }
  return groups;
}

// Tính sát thương cơ bản của Pet
function petDmg(pet) {
  if (!pet) return 10;
  const lvl = Math.min(PET_MAX_LV, pet.lvl || 1);
  const rebBonus = typeof rebornBonus === "function" ? rebornBonus().dmg : 0;
  return (6 + lvl * 5) * (1 + lvl * 0.04) * (1 + rebBonus);
}

// Đồng hành nhận EXP khi diệt quái
function petGainXp(amount) {
  const pet = S.rw && S.rw.pet;
  if (!pet) return;
  if (pet.lvl >= PET_MAX_LV) {
    pet.lvl = PET_MAX_LV;
    pet.xp = 0;
    return;
  }
  pet.xp += amount;
  const needed = 20 + pet.lvl * 12;
  if (pet.xp >= needed) {
    pet.xp -= needed;
    pet.lvl++;
    log(`Đồng hành <b>${esc(MON[pet.tid] ? MON[pet.tid].n : "Pet")}</b> lên cấp <b>${pet.lvl}</b>!`);
  }
}

// Chọn Đồng Hành dẫn theo
function petAdopt(tid) {
  const rw = typeof RW === "function" ? RW() : S.rw;
  const prev = rw.pet;
  rw.pet = { tid: tid, lvl: prev ? prev.lvl : 1, xp: prev ? prev.xp : 0 };
  curPreviewPetId = tid;
  R.petPos = null;
  toast(`Đồng hành: ${MON[tid] ? MON[tid].n : "Pet"}`);
  if (typeof save === "function") save();
  if (typeof actModal === "function") actModal();
}

// --- LOGIC CHIẾN ĐẤU CỦA ĐỒNG HÀNH ---
function petApplyDamage(target, dmg, col) {
  if (!target || target.hp <= 0 || !(dmg > 0)) return;
  const exposeMult = (target.petExposeT > 0 && target.petExposeMult) ? target.petExposeMult : 1;
  const rageMult = (R.petRageT > 0 && R.petRageMult) ? R.petRageMult : 1;
  const finalDmg = dmg * exposeMult * rageMult;
  target.hp -= finalDmg;
  target.hitT = 0.12;
  if (typeof addText === "function") {
    addText(target.x, target.y - (target.r || 16) - 8, fmt(finalDmg), col || "#9fe36a", 12);
  }
}

function petHealHero(amount, col) {
  if (!(amount > 0) || !R.P) return;
  const healVal = Math.min(amount, Math.max(0, R.P.life - R.life));
  if (healVal >= 1) {
    R.life += healVal;
    if (typeof addText === "function") addText(H.x, H.y - 42, `+${fmt(healVal)}`, col || "#8fe3ad", 11);
  }
}

function petExecuteSkill(skill, pet, target) {
  if (!skill) return;
  if (typeof addText === "function") {
    addText(R.petPos.x, R.petPos.y - 34, `${skill.n}!`, skill.col, 10);
  }
  if (skill.fx && typeof fxLine === "function") {
    fxLine(R.petPos, target || H, { parts: { phys: 1 } });
  }

  const baseDmg = petDmg(pet);

  if (skill.heal && typeof burst === "function") burst(H.x, H.y - 18, skill.col);
  if ((skill.kind === "heal" || skill.kind === "restore") && R.P) {
    petHealHero(R.P.life * skill.heal, skill.col);
  }
  if (skill.kind === "restore" && skill.mana && R.P) {
    const manaGain = Math.min(R.P.mana * skill.mana, Math.max(0, R.P.mana - R.mana));
    if (manaGain >= 1) {
      R.mana += manaGain;
      if (typeof addText === "function") addText(H.x, H.y - 56, `+${fmt(manaGain)} NL`, "#83d7ff", 10);
    }
  }

  if (skill.kind === "heal" || skill.kind === "restore") {
    if (target && target.hp > 0 && skill.mult) {
      petApplyDamage(target, baseDmg * skill.mult, skill.col);
    }
    return;
  }

  if (!target || target.hp <= 0) return;

  let mult = skill.mult || 1;
  let targets = [target];

  if (skill.kind === "execute" && target.hp <= target.max * (skill.at || 0.4)) {
    mult *= (skill.finisher || 1.35);
  }

  if (skill.kind === "multi") {
    for (let h = 0; h < (skill.hits || 2) && target.hp > 0; h++) {
      petApplyDamage(target, baseDmg * mult, skill.col);
    }
  } else if (skill.kind === "area" || skill.kind === "stunArea") {
    const splashTargets = alive().filter(e => e !== target && Math.hypot(e.x - target.x, e.y - target.y) <= (skill.rad || 100));
    targets = [target, ...splashTargets];
    petApplyDamage(target, baseDmg * mult, skill.col);
    for (const st of splashTargets) {
      petApplyDamage(st, baseDmg * mult * (skill.splash || 0.6), skill.col);
    }
  } else if (skill.kind === "chain") {
    const chainTargets = alive()
      .filter(e => e !== target && Math.hypot(e.x - target.x, e.y - target.y) <= (skill.rad || 150))
      .sort((a, b) => Math.hypot(a.x - target.x, a.y - target.y) - Math.hypot(b.x - target.x, b.y - target.y))
      .slice(0, (skill.hits || 3) - 1);
    targets = [target, ...chainTargets];
    targets.forEach((ct, idx) => {
      petApplyDamage(ct, baseDmg * mult * (idx ? (skill.falloff || 0.72) : 1), skill.col);
    });
  } else {
    petApplyDamage(target, baseDmg * mult, skill.col);
  }

  // Áp dụng hiệu ứng phụ (Status effects)
  for (const t of targets) {
    if (skill.kind === "poison" || skill.poison) {
      const pDmg = baseDmg * (skill.dot || skill.poison || 1);
      t.poison = 3;
      t.poisonDmg = pDmg / 3;
    }
    if (skill.slow) {
      t.slowT = Math.max(t.slowT || 0, skill.slowDur || 2);
    }
    if (skill.expose) {
      t.petExposeT = Math.max(t.petExposeT || 0, skill.exposeDur || 3.5);
      t.petExposeMult = Math.max(t.petExposeMult || 1, skill.expose || 1.12);
    }
    if (skill.bleed) {
      t.petBleedT = Math.max(t.petBleedT || 0, skill.bleedDur || 3.5);
      t.petBleedDmg = (baseDmg * skill.bleed) / (skill.bleedDur || 3.5);
    }
    if (skill.stun) {
      const stunDur = t.cls === "boss" ? Math.min(skill.stun, 0.5) : skill.stun;
      t.stun = Math.max(t.stun || 0, stunDur);
    }
  }

  // Buff cho chủ nhân
  if (skill.guard) {
    R.petGuardT = Math.max(R.petGuardT || 0, skill.guardDur || 4.5);
    R.petGuardMult = Math.min(R.petGuardMult || 1, 1 - (skill.guard || 0.18));
    if (typeof burst === "function") burst(H.x, H.y - 18, "#b9d8b0");
    if (typeof addText === "function") addText(H.x, H.y - 52, "Hộ Chủ", "#c9e9bd", 10);
  }
  if (skill.rage) {
    R.petRageT = Math.max(R.petRageT || 0, skill.rageDur || 5);
    R.petRageMult = Math.max(R.petRageMult || 1, skill.rage || 1.1);
    if (typeof burst === "function") burst(H.x, H.y - 18, skill.col || "#ffe7aa");
  }
}

// Cập nhật nhịp điệu hành động của Đồng Hành
function petTick(dt) {
  if (R.petGuardT > 0) {
    R.petGuardT = Math.max(0, R.petGuardT - dt);
    if (!R.petGuardT) R.petGuardMult = 1;
  }
  if (R.petRageT > 0) {
    R.petRageT = Math.max(0, R.petRageT - dt);
    if (!R.petRageT) R.petRageMult = 1;
  }

  const pet = S.rw && S.rw.pet;
  if (!pet || R.town || !MON[pet.tid]) {
    R.petPos = null;
    return;
  }

  const pos = R.petPos || (R.petPos = { x: H.x - 30, y: H.y + 10, t: 0, act: "st", actT: 0, dir: 0 });
  pos.skillCd = pos.skillCd || {};
  for (const k in pos.skillCd) {
    pos.skillCd[k] = Math.max(0, pos.skillCd[k] - dt);
  }

  const nearestEnemy = alive().sort((a, b) => Math.hypot(a.x - pos.x, a.y - pos.y) - Math.hypot(b.x - pos.x, b.y - pos.y))[0];
  const targetPt = nearestEnemy || { x: H.x - 36, y: H.y + 12 };
  const dist = Math.hypot(targetPt.x - pos.x, targetPt.y - pos.y);
  const stopDist = nearestEnemy ? (nearestEnemy.r || 16) + 14 : 10;

  pos.moving = dist > stopDist;
  if (pos.moving) {
    const spd = Math.min(1, (170 * dt) / dist);
    pos.dir = dirOf(targetPt.x - pos.x, targetPt.y - pos.y);
    pos.x += (targetPt.x - pos.x) * spd;
    pos.y += (targetPt.y - pos.y) * spd;
  }

  if (Math.hypot(H.x - pos.x, H.y - pos.y) > 500) {
    pos.x = H.x - 30;
    pos.y = H.y + 10;
  }

  pos.t -= dt;
  if (nearestEnemy && !pos.moving && pos.t <= 0) {
    pos.t = 1.2;
    const skills = petSkillsOf(pet.tid);
    const usableSkill = skills.find(s => (pet.lvl || 1) >= (s.lv || 1) && (pos.skillCd[s.key] || 0) <= 0);
    if (usableSkill) {
      pos.skillCd[usableSkill.key] = usableSkill.cd;
      petExecuteSkill(usableSkill, pet, nearestEnemy);
    } else {
      petApplyDamage(nearestEnemy, petDmg(pet), "#9fe36a");
    }
    pos.act = "at";
    pos.actT = 0;
    pos.dir = dirOf(nearestEnemy.x - pos.x, nearestEnemy.y - pos.y);
  }
}

// Giao diện tab Đồng Hành nâng cao chuẩn SrcDev
function petBody(rw = typeof RW === "function" ? RW() : S.rw) {
  const curPet = rw.pet;
  const isUnlocked = typeof unlocked === "function" ? unlocked(PET_LV) : (S.lvl >= PET_LV);
  if (!isUnlocked) {
    return `<p class="desc">Đồng hành mở khóa ở cấp ${PET_LV}.</p>`;
  }

  const availablePets = petAvailableList();
  if (curPreviewPetId == null || !availablePets.includes(curPreviewPetId)) {
    curPreviewPetId = curPet && availablePets.includes(curPet.tid) ? curPet.tid : (availablePets[0] || null);
  }

  const previewMon = curPreviewPetId != null ? MON[curPreviewPetId] : null;
  const previewLvl = curPet ? curPet.lvl : 1;
  const grouped = petGroupedByZone(availablePets);

  return `
    <p class="desc">Đồng hành đi theo và cùng đánh quái, lên cấp theo số quái hạ. Mỗi loài có vai trò và kỹ năng riêng; chọn pet để xem nhãn vai trò, gợi ý cách dùng và chiêu thức mở ở cấp 30. Đã mở khóa: <b>${availablePets.length}</b>/${PET_SPECIES_LIST.length} loài.</p>
    ${curPet && MON[curPet.tid] ? `<p>Đang dẫn: <b>${esc(MON[curPet.tid].n)}</b> · cấp ${curPet.lvl} · sát thương ${fmt(petDmg(curPet))}/đòn</p>` : `<p class="dim small">Chưa có đồng hành được chọn.</p>`}
    
    ${previewMon ? `
      <section class="pet-preview">
        <div class="pet-preview-head">
          ${previewMon.img ? `<img src="${esc(previewMon.img)}" alt="">` : ""}
          <span>
            <small>ĐANG XEM ĐỒNG HÀNH</small>
            <b>${esc(previewMon.n)} · cấp ${previewLvl}</b>
          </span>
          <button class="btn sm" data-p-adopt="${curPreviewPetId}" ${curPet && curPet.tid === curPreviewPetId ? "disabled" : ""}>
            ${curPet && curPet.tid === curPreviewPetId ? "Đang dẫn" : "Dẫn theo"}
          </button>
        </div>
        <div class="pet-role-block">
          <b>VAI TRÒ</b>
          <div class="pet-role-tags">${petRoleTagsHtml(curPreviewPetId)}</div>
          <p><b>Hợp khi:</b> ${esc(petRoleInfo(curPreviewPetId).fit)}</p>
        </div>
        <div class="petskills">${petSkillsHtml(curPreviewPetId, previewLvl)}</div>
      </section>
    ` : ""}

    <div class="petpick">
      ${grouped.map(({ zone, pets }) => `
        <section class="petgroup">
          <h4>${esc(zone.n)} <small>Quái cấp ${zone.lo}–${zone.hi}</small></h4>
          <div class="petgroup-grid">
            ${pets.map(tid => `
              <button data-p-preview="${tid}" class="${curPreviewPetId === tid ? "on" : ""}${curPet && curPet.tid === tid ? " active" : ""}">
                ${MON[tid] && MON[tid].img ? `<img src="${esc(MON[tid].img)}" alt="">` : ""}
                <b>${esc(MON[tid] ? MON[tid].n : "Pet")}</b>
                <span class="pet-card-tags">${petRoleTagsHtml(tid)}</span>
                <small class="pet-active-hint">${curPet && curPet.tid === tid ? "Đang dẫn" : ""}</small>
                <small class="pet-skill-hint">${petSkillsOf(tid).map((s, idx) => `${idx ? "· " : ""}${esc(s.n)}${s.lv ? ` (Lv${s.lv})` : ""}`).join(" ")}</small>
              </button>
            `).join("")}
          </div>
        </section>
      `).join("")}
    </div>
  `;
}

// Bắt sự kiện click trong tab Đồng Hành
function bindPetTab(onRefresh) {
  document.querySelectorAll("#mBody [data-p-preview]").forEach(btn => {
    btn.onclick = () => {
      curPreviewPetId = +btn.dataset.pPreview;
      if (typeof onRefresh === "function") onRefresh();
    };
  });
  document.querySelectorAll("#mBody [data-p-adopt]").forEach(btn => {
    btn.onclick = () => {
      petAdopt(+btn.dataset.pAdopt);
      if (typeof onRefresh === "function") onRefresh();
    };
  });
}

// Vẽ Đồng Hành trên Canvas
function drawPet(ctx, dt) {
  const pet = S.rw && S.rw.pet;
  const pos = R.petPos;
  if (!pet || !pos || !MON[pet.tid]) return;

  pos.animKey = MON[pet.tid].anim;
  if (typeof stepAct === 'function') stepAct(pos, dt, pos.moving ? 'run' : 'st');
  if (pos.act !== 'at' && typeof setAct === 'function') setAct(pos, pos.moving ? 'run' : 'st');

  ctx.fillStyle = '#0007';
  ctx.beginPath();
  ctx.ellipse(pos.x, pos.y, 10, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  const scale = (typeof MON_SCALE !== 'undefined' ? MON_SCALE : 1.35) * 0.75;
  if (typeof drawAnim === 'function') {
    drawAnim(pos.animKey, pos.act || 'st', pos.dir || 0, pos.actT || 0, pos.x, pos.y, scale);
  }

  const nameCol = (typeof NAME_COL !== 'undefined' && NAME_COL.pet) ? NAME_COL.pet : '#9fe36a';
  if (typeof label === 'function') {
    label(pos.x, pos.y - 42, `${MON[pet.tid].n} · Lv${pet.lvl}`, nameCol, 10, -1);
  }
}
