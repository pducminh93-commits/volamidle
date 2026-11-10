"use strict";

const LOOK_RAR_A = [0, 0.24, 0.32, 0.4, 0.42, 0.42];
const TM_DUST = { ovan: "#5fb8ff", xtho: "#ff6a3a", tanh: "#f3d35b", dlo: "#6fd46a", cdsu: "#c8965a" };
const HORSE_FX = {
  "Ô Vân Đạp Tuyết": ["#5fb8ff", 3],
  "Xích Thố": ["#ff6a3a", 3],
  "Tuyệt Ảnh": ["#f3d35b", 3],
  "Tuyệt ảnh": ["#f3d35b", 3],
  "Đích Lô": ["#6fd46a", 3],
  "Chiếu Dạ Ngọc Sư Tử": ["#fff1a8", 3],
  "Phi Vân": ["#d8e6ff", 2],
  "Bôn Tiêu": ["#ff9ad0", 2],
  "Xích Long Câu": ["#ff5a3a", 2],
  "Du Huy": ["#c8f0ff", 2],
  "Tuyệt Địa": ["#b48cff", 2],
  "Đằng Vụ": ["#9fd8d0", 2],
  "Siêu Quang": ["#ffe36a", 2],
  "Phiên Vũ": ["#ffb8e8", 3],
  "Hãn Huyết Long Câu": ["#ff3048", 3],
  "Kim Tinh Bạch Hổ Vương": ["#f0f8ff", 3],
  "Phong Vân Thần Mã": ["#ffd24a", 3],
  "Kim Tinh Hổ Vương": ["#ffc84a", 2],
  "Hỏa Tinh Kim Hổ Vương": ["#ff7a2a", 2],
  "Long Tinh Hắc Hổ Vương": ["#9a7aff", 2],
  "Phong Vân Bạch Mã": ["#e8f2ff", 2],
  "Phong Vân Chiến Mã": ["#ffb04a", 2],
  "Sư tử": ["#f3c96a", 1],
  "Lạc đà": ["#d8b47a", 1],
  "Dương Đà": ["#c8a070", 1],
  "Hươu đốm": ["#c89a5a", 1],
  "Dương Sa": ["#e0c090", 1],
  "Ngự Phong": ["#a8e8ff", 1],
  "Truy điện": ["#e8f06a", 1],
  "Lưu Tinh": ["#bfe0ff", 1]
};

// Bảng màu phát quang ngũ hành chuẩn kiếm hiệp: Kim (Vàng kim), Mộc (Xanh lá lục), Thủy (Xanh lam băng), Hỏa (Đỏ cam), Thổ (Nâu hoàng thổ)
const SERIES_GLOW_CORE = ["#fffdf0", "#f0fff4", "#f0faff", "#fff2eb", "#fffbf0"];
const SERIES_GLOW_OUTER = ["#ffd700", "#39e75f", "#00d4ff", "#ff4500", "#e69a28"];
const SERIES_GLOW_AURA = [
  "rgba(255, 215, 0, 0.45)",
  "rgba(57, 231, 95, 0.45)",
  "rgba(0, 212, 255, 0.45)",
  "rgba(255, 69, 0, 0.45)",
  "rgba(230, 154, 40, 0.45)"
];

function horseFx(n) {
  if (!n) return null;
  const f = (n.n || "").replace(/\s+\d+$/, "");
  const o = HORSE_FX[f];
  return o || (n.thanma ? [TM_DUST[n.thanma] || "#ffd24a", 3] : null);
}

function partTint(n) {
  if (!n || !reqOk(n)) return null;
  if (n.set) return n.set.kind === "platina" ? { c: "#e6f4ff", a: 0.48 } : { c: "#ffc93c", a: 0.44 };
  const f = LOOK_RAR_A[n.r || 0];
  return f ? { c: n.s >= 0 && n.s < 5 ? SERIES_COL[n.s] : RAR_COL[n.r], a: f } : null;
}

function heroLook() {
  const n = S.eq;
  const f = Object.values(n).filter(s => s && s.d !== 10);
  const o = partTint(n.armor);
  const l = partTint(n.helm);
  let e = null;

  // Tính cấp cường hóa bình quân toàn bộ Set trang bị (Áo, Mão, Giày, Hộ uyển, Đai lưng...)
  let avgEnh = 0;
  if (f.length >= 5) {
    avgEnh = f.reduce((g, c) => g + (c.enh || 0), 0) / f.length;
  }

  if (typeof enoughToActive == "function" && enoughToActive(n)) {
    const s = f.filter(c => c.set && c.set.kind === "platina").length;
    const g = f.filter(c => c.set && c.set.kind === "gold").length;
    e = s >= g ? { c: "#bfe6ff", c2: "#ffffff", k: 1 } : { c: "#ffb52e", c2: "#fff1a8", k: 1 };
  } else if (avgEnh >= 7) {
    // Kích hoạt hào quang thân/chân theo màu hệ Ngũ Hành của nhân vật khi toàn set đạt trung bình +7, +8, +10
    const sIdx = typeof heroSeries == "function" ? heroSeries() : 0;
    const sCol = (SERIES_COL && SERIES_COL[sIdx]) || "#ffd24a";
    const tier = avgEnh >= 10 ? 3 : avgEnh >= 8 ? 2 : 1;
    e = {
      c: sCol,
      c2: tier === 3 ? "#ffffff" : sCol,
      k: tier === 3 ? 1.35 : tier === 2 ? 0.95 : 0.65,
      tier: tier,
      enh: avgEnh
    };
  }

  if (!e && typeof getCurrentRealm == "function") {
    const rCur = getCurrentRealm();
    if (rCur) {
      e = { c: rCur.color, c2: "#ffffff", k: Math.min(1.2, 0.6 + rCur.majorIndex * 0.08) };
    }
  }

  // Hiệu ứng phát quang vũ khí theo cấp cường hóa +5 đến +10 và hệ Ngũ Hành
  const wp = n.weapon;
  const enh = (wp && reqOk(wp) && wp.enh) || 0;
  let glow = null;
  if (enh >= 5) {
    const sIdx = wp && wp.s >= 0 && wp.s < 5 ? wp.s : (typeof heroSeries == "function" ? heroSeries() : 0);
    const col = SERIES_GLOW_OUTER[sIdx] || (SERIES_COL && SERIES_COL[sIdx]) || "#ffd700";
    const core = SERIES_GLOW_CORE[sIdx] || "#ffffff";
    let tier = 1;
    if (enh >= 10) tier = 3;
    else if (enh >= 8) tier = 2;
    else if (enh >= 7) tier = 1.5;
    glow = {
      c: col,
      core: core,
      s: sIdx,
      enh: enh,
      n: tier === 3 ? 3 : tier >= 2 ? 2 : 1,
      tier: tier
    };
  }

  const u = n.horse;
  const h = horseFx(u);
  const a = h ? h[0] : null;
  const d = h ? h[1] : 0;

  return {
    body: o,
    head: l,
    aura: e,
    glow: glow,
    dust: a,
    hlv: d,
    key: JSON.stringify([o, l, e, glow, a, d])
  };
}

const lookOn = () => S && S.lookFx !== !1;
const LOOK_CACHE = new Map();

function tintedFrame(n, f, o, l, e) {
  const i = `${f.f}|${o}|${l}|${e.key}`;
  let t = LOOK_CACHE.get(i);
  if (t) return t;
  t = document.createElement("canvas");
  t.width = f.w;
  t.height = f.h;
  const r = t.getContext("2d");
  r.drawImage(n, o * f.w, l * f.h, f.w, f.h, 0, 0, f.w, f.h);
  r.globalCompositeOperation = "source-atop";
  const u = Math.max(0, f.ay - f.h * 0.8);
  const h = u + (f.ay - u) * 0.28;
  if (e.body) {
    const a = r.createLinearGradient(0, h - 4, 0, h + 6);
    a.addColorStop(0, "rgba(0,0,0,0)");
    a.addColorStop(1, e.body.c);
    r.globalAlpha = e.body.a;
    r.fillStyle = a;
    r.fillRect(0, h - 4, f.w, f.h);
  }
  if (e.head) {
    r.globalAlpha = e.head.a;
    r.fillStyle = e.head.c;
    r.fillRect(0, 0, f.w, h);
  }
  if (LOOK_CACHE.size > 600) LOOK_CACHE.clear();
  LOOK_CACHE.set(i, t);
  return t;
}

function drawHeroAnim(n, f, o, l, e, i, t, r = 1) {
  if (typeof drawJxHero == "function") {
    const c = drawJxHero(f, o, l, e, i, t, r);
    if (c) return c;
  }
  const u = R.look;
  if (!lookOn() || !u || (!u.body && !u.head)) return drawAnim(n, f, o, l, e, i, t, r);
  const h = W.anim && W.anim[n];
  if (!h) return !1;
  const a = h[f] || h.st;
  if (!a) return !1;
  const d = img("img/a/" + a.f);
  if (!d.complete || !d.naturalWidth) return !1;
  let s = Math.floor((l * 1000) / a.ms);
  s = ONCE[f] ? Math.min(s, a.n - 1) : s % a.n;
  const g = a.d >= 8 ? o : Math.floor((o * a.d) / 8);
  CX.globalAlpha = r;
  CX.drawImage(tintedFrame(d, a, s, g, u), e - a.ax * t, i - a.ay * t, a.w * t, a.h * t);
  CX.globalAlpha = 1;
  return a.h * t;
}

// Vòng hào quang thân / hào quang chân đa tầng theo cấp trung bình +7, +8, +10
function drawAura(n) {
  const f = R.look;
  if (!lookOn() || !f || !f.aura) return;
  const o = R.clock || 0;
  const l = 0.5 + 0.5 * Math.sin(o * 3.2);
  const e = f.aura;
  const tier = e.tier || 1;

  n.save();
  // 1. Vòng hào quang chân xoay tròn
  n.globalAlpha = (0.35 + 0.25 * l) * e.k;
  n.strokeStyle = e.c;
  n.lineWidth = tier >= 3 ? 3.2 : tier === 2 ? 2.4 : 1.8;
  n.beginPath();
  n.ellipse(H.x, H.y, 24 + l * 4, 9 + l * 1.5, 0, 0, Math.PI * 2);
  n.stroke();

  // Vòng sáng phụ bên trong cho cấp cao (+8, +10)
  if (tier >= 2) {
    const l2 = 0.5 + 0.5 * Math.cos(o * 4);
    n.globalAlpha = (0.2 + 0.2 * l2) * e.k;
    n.lineWidth = 1.4;
    n.beginPath();
    n.ellipse(H.x, H.y, 16 + l2 * 3, 6 + l2 * 1.2, 0, 0, Math.PI * 2);
    n.stroke();
  }

  // Đĩa phát sáng dưới chân
  n.globalAlpha = (tier >= 3 ? 0.24 : 0.16) * e.k;
  n.fillStyle = e.c;
  n.beginPath();
  n.ellipse(H.x, H.y, 22, 8, 0, 0, Math.PI * 2);
  n.fill();

  // 2. Vầng hào quang bảo vệ quanh thân khi Set đạt +8 hoặc +10
  if (tier >= 2) {
    const pulseBody = 0.5 + 0.5 * Math.sin(o * 2.5);
    n.globalAlpha = (tier === 3 ? 0.16 : 0.09) * pulseBody * e.k;
    n.fillStyle = e.c;
    n.beginPath();
    n.ellipse(H.x, H.y - 32, 22 + pulseBody * 4, 38 + pulseBody * 6, 0, 0, Math.PI * 2);
    n.fill();

    if (tier === 3) {
      n.lineWidth = 1.2;
      n.strokeStyle = e.c2 || "#ffffff";
      n.globalAlpha = 0.28 * pulseBody * e.k;
      n.beginPath();
      n.ellipse(H.x, H.y - 32, 24 + pulseBody * 5, 40 + pulseBody * 7, 0, 0, Math.PI * 2);
      n.stroke();
    }
  }

  n.restore();

  if (S.lowFx) return;

  // Luồng hạt khí ngũ hành thăng hoa bay lên quanh thân
  const i = R.lookP || (R.lookP = []);
  const spawnRate = tier === 3 ? 0.55 : tier === 2 ? 0.38 : 0.25;
  if (Math.random() < spawnRate * e.k) {
    i.push({
      x: H.x + rnd(-20, 20),
      y: H.y + rnd(-4, 4),
      vy: -rnd(20, 42),
      vx: rnd(-4, 4),
      life: 1.1,
      c: Math.random() < 0.4 ? (e.c2 || "#ffffff") : e.c,
      s: rnd(1.2, 2.2)
    });
  }
}

// Luồng hạt phát quang và hiệu ứng lân tinh quanh trang bị / vũ khí
function drawLookFx(n, f) {
  const o = R.look;
  if (!lookOn() || !o || S.lowFx) {
    R.lookP = null;
    return;
  }
  const l = R.lookP || (R.lookP = []);

  // Xử lý hạt phát quang vũ khí theo cấp cường hóa +5 đến +10
  if (o.glow) {
    const tier = o.glow.tier || 1;
    const enh = o.glow.enh || 5;
    // Tần suất hạt tăng dần theo cấp cường hóa
    const spawnChance = enh >= 10 ? 0.65 : enh >= 8 ? 0.4 : enh >= 7 ? 0.26 : 0.16;
    if (Math.random() < spawnChance) {
      const angle = rnd(0, Math.PI * 2);
      const radX = rnd(8, 24);
      const radY = rnd(6, 20);
      const isCore = enh >= 9 && Math.random() < 0.35;
      l.push({
        x: H.x + Math.cos(angle) * radX,
        y: H.y - 28 + Math.sin(angle) * radY,
        vy: -rnd(8, enh >= 10 ? 28 : 18),
        vx: rnd(-6, 6),
        life: rnd(0.5, 0.9),
        c: isCore ? (o.glow.core || "#ffffff") : o.glow.c,
        s: rnd(1.2, enh >= 10 ? 3.0 : enh >= 8 ? 2.4 : 1.8)
      });
    }

    // Hiệu ứng tia sét / tia chớp nhỏ chạy xẹt qua thần binh khi đạt max +10
    if (enh >= 10 && Math.random() < 0.22) {
      const sx = H.x + rnd(-16, 16);
      const sy = H.y - rnd(16, 42);
      n.save();
      n.strokeStyle = Math.random() < 0.5 ? "#ffffff" : o.glow.c;
      n.lineWidth = rnd(1, 1.8);
      n.globalAlpha = rnd(0.6, 0.95);
      n.beginPath();
      n.moveTo(sx, sy);
      n.lineTo(sx + rnd(-6, 6), sy + rnd(-6, 6));
      n.lineTo(sx + rnd(-10, 10), sy + rnd(-10, 10));
      n.stroke();
      n.restore();
    }
  }

  // Vẽ các hạt phát sáng
  n.save();
  for (const e of l) {
    e.life -= f;
    e.y += e.vy * f;
    if (e.vx) e.x += e.vx * f;
    const alpha = clamp(e.life, 0, 1) * 0.88;
    n.globalAlpha = alpha;
    n.fillStyle = e.c;
    n.beginPath();
    n.arc(e.x, e.y, e.s || 1.4, 0, Math.PI * 2);
    n.fill();
  }
  n.restore();

  R.lookP = l.filter(e => e.life > 0).slice(-90);
}
