/* ======================= DAU TAY DOI (PK): mo phong tran + can bang 10 phai + giai Vo Lam Minh Chu =======================
   Hai kieu dau:
     'std'  - CHUAN HOA: cung cap, cung bo do co ban (khong dong thuoc tinh), diem tiem nang / ky nang tu cong toi uu cho phai, cung luong thuoc.
              Dung de can bang 10 phai (he so PVP_NORM) va thi dau "cung dieu kien".
     'real' - DO THAT: dung nguyen cap, do, diem, ky nang cua nhan vat / bot. Do manh hon thi thang nhieu hon.
   Luat chung (khac voi luyen cong): sinh luc PK = sinh luc x he so K(cap) de moi ben chiu duoc ~DUEL_HITS don danh trung binh cua phai chuan;
   KHONG tu hoi mau / noi luc (chi so hoi chi de luyen cong); hut mau / hut noi luc toi da DUEL_LEECH_CAP%; chi hoi bang THUOC mua san trong
   hanh trang (so luong co han, het la chet); danh 1 muc tieu (khong tinh nhieu muc tieu). Sat thuong nhan he so PVP_NORM[phai][cap] (chi o PK). */
'use strict';
const DUEL_HITS = 20, DUEL_DT = 0.1, DUEL_MAX_T = 180, DUEL_LEECH_CAP = 3, DUEL_RESMAX = 75, DUEL_MANA_K = 4, DUEL_CASTS = 18;      // noi luc PK = max(noi luc x 4, 18 lan chieu chinh): phai build Suc manh cung ra duoc chieu suot tran, het thi uong thuoc noi luc
const DUEL_POT = { life: 4, mana: 2, lifePct: 0.2, manaPct: 0.5, cd: 4 };       // thuoc mang vao tran (mua truoc): moi binh mau hoi 20% mau toi da, binh noi 50%
const DUEL_BRACKETS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 135, 150], DUEL_TARGET_T = 42;      // tran chuan keo dai ~42 giay (30-60)
/* Hang so can bang (sinh ra boi duelCalibrate, dan vao day): norm[phai] = he so sat thuong PK theo moc cap; ref[moc] = { hit, life } cua phai chuan */
/* PK khong con he so bu rieng (norm = {}): can bang nam trong bang FAC_DMG_NORM (stats.js), sinh ra boi duelTuneTable (vong tron 10 phai chuan hoa, ti le thang 47-57%, tran ~30-85 giay). ref = sinh luc PK chuan theo moc cap. Chay lai duelTuneTable khi doi so lieu ky nang / chi so. */
const DUEL_CFG = { norm: {}, ref: {"10":{"hit":127,"life":291},"20":{"hit":613,"life":422},"30":{"hit":1471.3,"life":542},"40":{"hit":2010.7,"life":672},"50":{"hit":3472,"life":792},"60":{"hit":9819.5,"life":908},"70":{"hit":14589,"life":1023},"80":{"hit":26452.6,"life":1138},"90":{"hit":39634.4,"life":1253},"100":{"hit":40717.4,"life":1368},"110":{"hit":52508.2,"life":1483},"120":{"hit":66347.8,"life":1598},"135":{"hit":79260.6,"life":1770.5},"150":{"hit":73242.7,"life":1943}} };

/* ---------- noi suy theo cap ---------- */
function duelInterp(arr, L) {       // arr theo DUEL_BRACKETS, noi suy tuyen tinh theo log; ngoai khoang: giu gia tri bien
  if (!arr) return 1; const B = DUEL_BRACKETS;
  if (L <= B[0]) return arr[0]; if (L >= B[B.length - 1]) return arr[B.length - 1];
  for (let i = 1; i < B.length; i++) if (L <= B[i]) { const k = (L - B[i - 1]) / (B[i] - B[i - 1]); return Math.exp(Math.log(arr[i - 1]) * (1 - k) + Math.log(arr[i]) * k); }
  return 1;
}
const duelNorm = (fac, L) => (DUEL_CFG.norm[fac] ? duelInterp(DUEL_CFG.norm[fac], L) : 1);
function duelRef(L) {                // { hit, life } theo cap (noi suy); chua can bang thi tra null
  const B = DUEL_BRACKETS, h = B.map(b => DUEL_CFG.ref[b] && DUEL_CFG.ref[b].hit), l = B.map(b => DUEL_CFG.ref[b] && DUEL_CFG.ref[b].life);
  if (h.some(x => !x)) return null; return { hit: duelInterp(h, L), life: duelInterp(l, L) };
}

/* ---------- nhan vat chuan hoa ---------- */
const DUEL_STD = {};
function stdGear(s, L) {             // bo do co ban cung cap bac, khong dong ma thuat, bo yeu cau (chi do chuan, khong so voi nhau)
  const tier = clamp(Math.round(L / 12), 1, 10), f = FAC[s.fac], wc = f && f.wcode >= 0 ? f.wcode : 0, eq = {};
  withS(s, () => {
    const put = (slot, it) => { if (!it) return; it.req = []; it.mag = []; it.r = 0; it.s = f ? f.series : 0; eq[slot] = it; };
    put('weapon', wc === 7 ? makeItem(1, 0, tier, 0) : makeItem(0, wc === 9 ? 6 : wc, tier, 0));
    put('armor', makeItem(2, sexPart(2, 0), tier, 0)); put('helm', makeItem(7, sexPart(7, 0), tier, 0));
    put('belt', makeItem(6, 0, tier, 0)); put('boot', makeItem(5, 0, tier, 0)); put('cuff', makeItem(8, 0, tier, 0));
    put('amulet', makeItem(4, 0, tier, 0)); put('ring1', makeItem(3, 0, tier, 0)); put('ring2', makeItem(3, 0, tier, 0)); put('pendant', makeItem(9, 0, tier, 0));
  });
  return eq;
}
function stdState(fac, L) {          // phai fac o cap L: diem tu cong toi uu (tinh theo luc chien, khong xet vung quai), bo do chuan
  const key = fac + ':' + L; if (DUEL_STD[key]) return DUEL_STD[key];
  const f = FAC[fac], d = { id: 'std', fac, name: f.n, sex: (fac === 'emei' || fac === 'cuiyan') ? 1 : 0, lvl: 1, xp: 0 };
  window.NO_ZONE = true; window.NO_FAC_NORM = true;      // cong diem tu cong KHONG phu thuoc he so phai (de bo chuan hoa on dinh khi chinh bang he so)
  try {
    const s = botNew(d); s.stage = 1; s.skPts = 0; s.attrPts = 0; s.lvl = 1; s.eq = {}; s.inv = [];
    for (let l = 2; l <= L; l++) { s.lvl = l; s.skPts++; s.attrPts += PTS_PER_LEVEL; if (l % 5 === 0 || l === L) botSpend(s); }
    s.lvl = L; botSpend(s);
    if (L >= 90) for (const id of f.skills) { const k = SK[id]; if (k && !k.proc && k.req >= 60 && k.req <= L) { if(k.book) (s.books || (s.books = {}))[k.book] = 1; s.sk[id] = Math.min(20, k.max); } }          // tu cap 90: nhan vat chuan co du chieu 9x (cap 60-80: tan cong lan bua chu) o cap 20
    s.eq = stdGear(s, L); s.inv = [];
    return (DUEL_STD[key] = s);
  } finally { window.NO_ZONE = false; window.NO_FAC_NORM = false; }
}

/* ---------- chien binh trong tran ---------- */
function duelPotionsFor(s, mode, free) {   // thuoc mang vao tran. std: mien phi 4 + 2; real: mua bang vang cua chinh nhan vat (het tien thi it hon)
  const lv = s.lvl, tierOf = kind => { let t = 1; for (const p of J.potions) if (p.kind === kind && lv >= (POT_TIER_LV[p.tier] || 999)) t = Math.max(t, p.tier); return J.potions.find(p => p.kind === kind && p.tier === t); };
  const out = { life: 0, mana: 0, lifeP: tierOf('life'), manaP: tierOf('mana'), spent: 0 };
  const want = { life: DUEL_POT.life, mana: DUEL_POT.mana };
  for (const kind of ['life', 'mana']) {
    const p = out[kind + 'P'], price = withS(s, () => potPrice(p));
    if (mode === 'std' || free) { out[kind] = want[kind]; continue; }
    const n = Math.min(want[kind], Math.floor(Math.max(0, s.gold) / Math.max(1, price)));
    out[kind] = n; out.spent += n * price; s.gold -= n * price;
  }
  return out;
}
/* ---------- bua chu / hieu ung ho tro ----------
   Luat PK: tu buff, debuff len dich, hao quang giu NGUYEN thoi luong va noi luc cua du lieu goc, hoi chieu 60 giay (DUEL_BUFF_CD).
   Hieu ung duoc cong vao chi so qua calc() (S.extraAttr), ky nang tuong ung bi loai khoi calc trong luc PK (EXCL_SK) de khong tinh 2 lan.
   Hao quang (Nga My...) luon bat; hoi mau / noi luc cua hao quang dung binh thuong (nhan he so sinh luc PK). */
const DUEL_BUFF_CD = 60, DUEL_CAST_T = 0.7, SKIP_SUP = /^(skill_|missle_|addskilldamage)/;
function duelSupportOf(s) {
  const out = [];
  for (const id in s.sk) {
    const k = SK[id], lv = s.sk[id]; if (!learnedFactionSkill(s,id) || isAttack(k)) continue;
    const names = Object.keys(k.attr).filter(n => !SKIP_SUP.test(n)); if (!names.length) continue;
    const first = skVal(k, names[0], lv), attrs = names.map(n => [n, skVal(k, n, lv)]), timed = first && first[1] > 0, neg = attrs.some(([n, p]) => p[0] < 0);
    out.push({ id: +id, n: k.n, kind: k.aura ? 'aura' : timed ? (neg ? 'debuff' : 'buff') : 'passive', attrs, dur: timed ? first[1] / 18 : Infinity, cost: (skVal(k, 'skill_cost_v', lv) || [0])[0], cdUntil: 0 });
  }
  return out;
}
function duelCompute(s, effects, excl) {
  const list = []; for (const e of effects) for (const [n, p] of e.attrs) list.push([n, p]);
  let P; withS(s, () => { window.NO_ZONE = true; window.EXCL_SK = excl; S.extraAttr = list; try { P = calc(); } finally { window.NO_ZONE = false; window.EXCL_SK = null; S.extraAttr = null; } });
  return P;
}
const duelActs = P => (P.actives || []).concat([P.basic]).filter(a => a && a.parts).map(a => Object.assign({}, a)).sort((x, y) => duelAvgHit(P, y) * y.rate - duelAvgHit(P, x) * x.rate);
function duelRecalc(F) {              // tinh lai chi so khi co hieu ung moi / het han: giu ti le mau, doi sinh luc toi da theo sinh luc moi
  const P = duelCompute(F.state, F.effects, F.excl), frac = F.hp / F.hpMax;
  F.P = P; F.acts = duelActs(P); F.hpMax = F.hpBase * P.life / F.lifeRef; F.hp = Math.min(F.hpMax, frac * F.hpMax);
}
function duelFighter(s, mode, label, free) {
  const L = s.lvl, fac = s.fac, f = FAC[fac], sup = duelSupportOf(s), excl = new Set(sup.filter(x => x.kind !== 'passive').map(x => x.id));
  const effects = sup.filter(x => x.kind === 'aura').map(x => ({ id: x.id, attrs: x.attrs, until: Infinity }));
  const P = duelCompute(s, effects, excl), ref = duelRef(L), norm = duelNorm(fac, L);
  const hpMax = mode === 'std' ? (ref ? DUEL_HITS * ref.hit : P.life) : (ref ? P.life * DUEL_HITS * ref.hit / ref.life : P.life);
  const acts = duelActs(P), pots = duelPotionsFor(s, mode, free);
  const manaMax = Math.max(P.mana * DUEL_MANA_K, (acts[0] ? acts[0].cost : 0) * DUEL_CASTS);   // chieu manh nhat (acts da sap) x 18 lan
  return { name: label || s.name, fac, series: f ? f.series : 0, L, state: s, P, norm, hpMax, hpBase: hpMax, lifeRef: P.life, hp: hpMax, mana: manaMax, manaMax, manaScale: manaMax / Math.max(1, P.mana), acts, pots, potUsed: 0, manaPotUsed: 0,
    sup, excl, effects, buffsCast: 0, nextAtk: 0, stunUntil: 0, stunImm: 0, dots: [], hot: [], potCd: 0, dmgDone: 0, hits: 0, crits: 0, misses: 0, casts: 0, basics: 0 };
}
/* sat thuong trung binh 1 don len muc tieu "trung tinh" (khang 0, he khac) - dung de can bang va tinh he so K */
function duelAvgHit(P, a) {
  let tot = 0; for (const e in a.parts) tot += a.parts[e] * (e === 'poison' ? POISON_EFF : 1);
  tot += (a.parts.phys || 0) * a.crit / 100 * (CRIT_MULT - 1);
  return tot * (a.useAR ? 0.95 : 1);
}
function duelHit(att, a, def, rng) {                 // 1 don: tra ve { dmg, crit, miss, poisonDot, stun }
  if (a.useAR && rng() * 100 >= hitPercent(att.P.ar, def.P.def, a.ignore)) return { dmg: 0, miss: true };
  const crit = rng() * 100 < a.crit - av(def.P.A, 'fatallystrikeres_p'); let tot = 0, dot = 0;      // doi thu co khang chi mang (hao quang Nga My...) thi giam ti le chi mang
  for (const el in a.parts) {
    let d = a.parts[el] * (0.85 + rng() * 0.3) * att.norm;
    if (el === 'poison') { dot += applyPart(d, 'poison', a.series, def.series, def.P.res, DUEL_RESMAX, a.series5) * POISON_EFF; continue; }
    d = applyPart(d, el, a.series, def.series, def.P.res, DUEL_RESMAX, a.series5);
    if (crit && el === 'phys') d *= CRIT_MULT;
    tot += d;
  }
  if (counters(a.series, def.series)) tot += (att.P.series5 || 0) * att.norm;
  return { dmg: Math.max(1, tot), crit, dot, stun: a.stun && rng() * 100 < a.stun };
}
let DUEL_EVT = null;      // != null: moi don danh / uong thuoc duoc day vao day de phat lai
const duelDomEl = a => { let el = 'phys', v = -1; for (const e in a.parts) if (a.parts[e] > v) { v = a.parts[e]; el = e; } return el; };
function duelChoose(A) {               // chon chieu: chieu manh nhat du noi luc, tru noi luc; het noi luc thi danh thuong
  const a = A.acts.find(x => x.cost <= A.mana) || A.acts[A.acts.length - 1];
  if (a.cost > 0) { A.mana -= a.cost; A.casts++; } else A.basics++;
  return a;
}
function duelApply(A, B, a, r, t, log) {   // ap dung ket qua 1 don (da tinh hit / sat thuong): mau, doc, hut mau, choang, su kien, nhat ky
  if (DUEL_EVT) DUEL_EVT.push({ t, by: A, to: B, skill: a.n, id: a.id, el: duelDomEl(a), melee: !!a.melee, miss: !!r.miss, dodged: !!r.dodged, dmg: r.dmg || 0, crit: !!r.crit, stun: !!r.stun, dot: r.dot || 0 });
  if (r.miss) { A.misses++; if (log) log.push([t, A.name, a.n, 'trượt']); return; }
  A.hits++; if (r.crit) A.crits++;
  B.hp -= r.dmg; A.dmgDone += r.dmg;
  if (B.P.damageMana) B.mana = Math.min(B.manaMax, B.mana + r.dmg * B.P.damageMana / 100);
  if (r.dot) { const duration = POISON_TIME * (1 - clamp(av(B.P.A,'poisontimereduce_p'),0,90)/100); B.dots.push({ left: duration, per: r.dot / POISON_TIME, by: A }); A.dmgDone += r.dot * duration / POISON_TIME; }
  const leech = Math.min(DUEL_LEECH_CAP, A.P.leech || 0); if (leech > 0) A.hp = Math.min(A.hpMax, A.hp + r.dmg * leech / 100);
  const ml = Math.min(DUEL_LEECH_CAP, A.P.manaLeech || 0); if (ml > 0) A.mana = Math.min(A.manaMax, A.mana + r.dmg * ml / 100);
  if (r.stun && t >= B.stunImm) { const dur = 0.6 * (1 - clamp(av(B.P.A, 'stuntimereduce_p'), 0, 90) / 100); B.stunUntil = t + dur; B.stunImm = t + 3.5; B.nextAtk = Math.max(B.nextAtk, B.stunUntil); }
  if (log && (r.crit || log.length < 14 || r.stun)) log.push([t, A.name, a.n, Math.round(r.dmg) + (r.crit ? ' (chí mạng)' : '') + (r.stun ? ' · choáng' : '')]);
}
function duelAttack(A, B, t, rng, log) {
  const a = duelChoose(A), r = duelHit(A, a, B, rng);
  A.nextAtk = t + 1 / a.rate / (a.melee ? MELEE_UPTIME : 1);
  duelApply(A, B, a, r, t, log);
}
function duelDrink(F, t, log) {                        // AI thuoc: mau < 45% thi uong binh mau, noi luc thap thi uong binh noi luc (khong cong don, co thoi gian hoi)
  if (t < F.potCd || t < F.stunUntil) return;
  if (F.pots.life > 0 && F.hp < F.hpMax * 0.45 && F.hot.length === 0) {
    F.pots.life--; F.potUsed++; F.potCd = t + DUEL_POT.cd; const p = F.pots.lifeP, dur = Math.max(1, p.dur);
    F.hot.push({ left: dur, per: F.hpMax * DUEL_POT.lifePct / dur }); F.nextAtk = Math.max(F.nextAtk, t + 0.4);
    if (DUEL_EVT) DUEL_EVT.push({ t, by: F, potion: 'life' });
    if (log) log.push([t, F.name, 'uống thuốc máu', `còn ${F.pots.life}`]); return;
  }
  const need = Math.min(...F.acts.filter(a => a.cost > 0).map(a => a.cost), Infinity);
  if (F.pots.mana > 0 && isFinite(need) && F.mana < need * 1.5) {
    F.pots.mana--; F.manaPotUsed++; F.potCd = t + DUEL_POT.cd; F.mana = Math.min(F.manaMax, F.mana + F.manaMax * DUEL_POT.manaPct); F.nextAtk = Math.max(F.nextAtk, t + 0.4);
    if (DUEL_EVT) DUEL_EVT.push({ t, by: F, potion: 'mana' });
    if (log) log.push([t, F.name, 'uống thuốc nội lực', `còn ${F.pots.mana}`]);
  }
}
/* AI bua chu: tu buff len minh, debuff len dich (trong tam, het hoi chieu, du noi luc, hieu ung chua co); moi bua chu mat DUEL_CAST_T giay ra chieu */
function duelSupportAI(F, T, t, log, inRange = true) {
  if (t < F.nextAtk || t < F.stunUntil || !F.sup.length) return false;
  for (const s of F.sup) {
    if ((s.kind !== 'buff' && s.kind !== 'debuff') || t < s.cdUntil || F.mana < s.cost) continue;
    const target = s.kind === 'debuff' ? T : F;
    if (s.kind === 'debuff' && !inRange) continue;
    if (target.effects.some(e => e.id === s.id)) continue;
    F.mana -= s.cost; s.cdUntil = t + DUEL_BUFF_CD; F.nextAtk = t + DUEL_CAST_T; F.buffsCast++;
    target.effects.push({ id: s.id, attrs: s.attrs, until: t + s.dur }); duelRecalc(target);
    if (DUEL_EVT) DUEL_EVT.push({ t, by: F, to: target, support: s.n, kind: s.kind });
    if (log) log.push([t, F.name, s.n, s.kind === 'debuff' ? 'làm yếu ' + T.name : 'tự tăng sức']);
    return true;
  }
  return false;
}
function duelUpkeep(F, dt, t) {         // doc, hoi thuoc, het han hieu ung, hoi mau / noi luc cua hao quang
  for (let i = F.dots.length - 1; i >= 0; i--) { const d = F.dots[i]; F.hp -= d.per * dt; d.left -= dt; if (d.left <= 0) F.dots.splice(i, 1); }
  for (let i = F.hot.length - 1; i >= 0; i--) { const h = F.hot[i]; F.hp = Math.min(F.hpMax, F.hp + h.per * dt); h.left -= dt; if (h.left <= 0) F.hot.splice(i, 1); }
  let expired = false; for (let i = F.effects.length - 1; i >= 0; i--) if (F.effects[i].until < t) { F.effects.splice(i, 1); expired = true; }
  if (expired) duelRecalc(F);
  let rl = 0, rm = 0; for (const e of F.effects) for (const [n, p] of e.attrs) { if (n === 'lifereplenish_v') rl += p[0]; else if (n === 'manareplenish_v') rm += p[0]; }
  if (rl > 0) F.hp = Math.min(F.hpMax, F.hp + rl * (F.hpBase / F.lifeRef) * dt);                   // hoi mau cua chieu thuc (hao quang): theo he so sinh luc PK; giam hoi mau (debuff) chi triet tieu hoi mau, khong gay mat mau
  if (rm > 0) F.mana = Math.min(F.manaMax, F.mana + rm * F.manaScale * dt);
}
function duelTick(A, B, t, rng, log) {               // mot nhip DUEL_DT giay: sat thuong doc / hoi thuoc, bua chu, uong thuoc, ra don
  duelUpkeep(A, DUEL_DT, t); duelUpkeep(B, DUEL_DT, t);
  if (A.hp <= 0 || B.hp <= 0) return;
  for (const [X, Y] of rng() < 0.5 ? [[A, B], [B, A]] : [[B, A], [A, B]]) {
    if (X.hp <= 0 || Y.hp <= 0) break;
    duelDrink(X, t, log);
    if (duelSupportAI(X, Y, t, log)) continue;
    if (t >= X.nextAtk && t >= X.stunUntil) duelAttack(X, Y, t, rng, log);
  }
}
function duelFinish(A, B, t, log) {
  const winner = A.hp > 0 && B.hp <= 0 ? A : B.hp > 0 && A.hp <= 0 ? B : (A.hp / A.hpMax >= B.hp / B.hpMax ? A : B);
  return { winner, loser: winner === A ? B : A, time: t, timeout: t >= DUEL_MAX_T, log };
}
function duelSim(A, B, rng = Math.random, wantLog = false) {
  const log = wantLog ? [] : null; let t = 0;
  A.nextAtk = rng() * 0.4; B.nextAtk = rng() * 0.4;
  while (t < DUEL_MAX_T && A.hp > 0 && B.hp > 0) { duelTick(A, B, t, rng, log); t += DUEL_DT; }
  return duelFinish(A, B, t, log);
}
/* ---------- chuan bi 2 ben theo kieu dau ---------- */
function duelPrep(sA, sB, mode, level) {
  if (mode === 'std') {
    const L = level || Math.min(sA.lvl, sB.lvl);
    return [duelFighter(stdState(sA.fac, L), 'std', sA.name), duelFighter(stdState(sB.fac, L), 'std', sB.name)];
  }
  return [duelFighter(sA, 'real'), duelFighter(sB, 'real')];
}
function duelSummary(r) {
  const f = x => ({ name: x.name, hp: Math.max(0, Math.round(x.hp)), hpMax: Math.round(x.hpMax), pct: Math.max(0, x.hp / x.hpMax), dmg: Math.round(x.dmgDone), hits: x.hits, crits: x.crits, misses: x.misses, casts: x.casts, basics: x.basics, pots: x.potUsed, mpots: x.manaPotUsed });
  return { winner: r.winner.name, time: +r.time.toFixed(1), timeout: r.timeout, w: f(r.winner), l: f(r.loser) };
}

/* ======================= CAN BANG: vong tron 10 phai (kieu chuan hoa), chinh he so PVP_NORM theo ti le thang ======================= */
function duelBalance(L, trials = 40, rng = Math.random) {
  const facs = FACTIONS.map(f => f.key), wins = {}, mat = {}, dur = {}; facs.forEach(a => { wins[a] = 0; mat[a] = {}; dur[a] = []; });
  for (let i = 0; i < facs.length; i++) for (let j = i + 1; j < facs.length; j++) {
    let w = 0, tsum = 0;
    for (let k = 0; k < trials; k++) {
      const A = duelFighter(stdState(facs[i], L), 'std'), B = duelFighter(stdState(facs[j], L), 'std'), r = duelSim(A, B, rng);
      if (r.winner === A) w++; tsum += r.time;
    }
    mat[facs[i]][facs[j]] = w / trials; mat[facs[j]][facs[i]] = 1 - w / trials; wins[facs[i]] += w / trials; wins[facs[j]] += 1 - w / trials; dur[facs[i]].push(tsum / trials); dur[facs[j]].push(tsum / trials);
  }
  return facs.map(a => ({ fac: a, name: FAC[a].n, wr: wins[a] / (facs.length - 1), mat: mat[a], time: dur[a].reduce((x, y) => x + y, 0) / dur[a].length }));
}

/* Can bang lan luot tung moc cap: (1) dua DPS 1 muc tieu cua 10 phai ve cung muc trung vi, (2) chinh lap theo ti le thang vong tron den ~50%.
   Tra ve { norm: {phai: [he so theo DUEL_BRACKETS]}, ref: {moc: {hit, life}}, report: {moc: [{ten, wr, time}]} } de dan vao DUEL_CFG. */
function duelCalibrate(brackets = DUEL_BRACKETS, iters = 10, trials = 50) {
  const facs = FACTIONS.map(f => f.key), res = { norm: {}, ref: {}, report: {} }; facs.forEach(f => res.norm[f] = []);
  const med = a => { const s = a.slice().sort((x, y) => x - y); return (s[(s.length - 1) >> 1] + s[s.length >> 1]) / 2; };
  brackets.forEach((L, bi) => {
    const fs = facs.map(k => duelFighter(stdState(k, L), 'std')), dps = fs.map(F => duelAvgHit(F.P, F.acts[0]) * F.acts[0].rate / (F.acts[0].melee ? 1 / MELEE_UPTIME : 1) * 1);
    const target = med(dps), norm = {}; fs.forEach((F, i) => { norm[F.fac] = target / Math.max(1e-9, dps[i]); });
    const hits = fs.map(F => duelAvgHit(F.P, F.acts[0]) * norm[F.fac]), ref = { hit: med(hits), life: med(fs.map(F => F.P.life)) };
    const apply = () => { for (const k of facs) { DUEL_CFG.norm[k] = DUEL_BRACKETS.map(() => norm[k]); } DUEL_BRACKETS.forEach(b => { DUEL_CFG.ref[b] = ref; }); };
    let rep = null;
    for (let it = 0; it < iters; it++) {
      apply(); rep = duelBalance(L, trials);
      if (it === iters - 1) break;
      const al = 0.45 / (1 + it / 5);                                                             // buoc chinh giam dan de hoi tu
      for (const r of rep) norm[r.fac] *= clamp(Math.pow(0.5 / clamp(r.wr, 0.03, 0.97), al), 0.75, 1.35);
      const mt = med(rep.map(r => r.time)); ref.hit *= clamp(Math.pow(DUEL_TARGET_T / Math.max(1, mt), 0.7), 0.8, 1.25);   // do dai tran trung vi ~DUEL_TARGET_T giay: chinh sinh luc PK (ref.hit)
    }
    res.ref[L] = { hit: +ref.hit.toFixed(2), life: +ref.life.toFixed(1) };
    for (const k of facs) res.norm[k][bi] = +norm[k].toFixed(4);
    res.report[L] = rep.map(r => ({ n: r.name, wr: +r.wr.toFixed(3), t: +r.time.toFixed(1) }));
  });
  return res;
}
function duelApplyCfg(cfg) { DUEL_CFG.norm = cfg.norm; DUEL_CFG.ref = cfg.ref; }
/* ======================= GIAO DIEN: DAU TRUONG + GIAI VO LAM MINH CHU ======================= */
const DUEL_UI = { mode: 'std', a: 'you', b: null, level: 0 };
function duelParticipants() {
  if (window.SHARED_WORLD) { return []; }
  const list = [{ id: 'you', name: (S.name || 'Bạn') + ' (bạn)', fac: S.fac, lvl: S.lvl, state: S, you: true }];
  for (const o of R.allies || []) if (o.bs && !(typeof allyIsWb === 'function' && allyIsWb(o))) list.push({ id: o.d.id, name: o.d.name, fac: o.d.fac, lvl: o.bs.lvl, state: o.bs });   // 08/10: bot giang ho trong to doi khong vao Dau truong (thach dau rieng qua the bot)
  if (R.wbDuel) list.push(R.wbDuel);                                    // bot giang ho dang bi thach dau (wbots.js)
  return list.filter(p => p.fac && FAC[p.fac]);
}
const duelBar = (p, c) => `<div style="height:8px;background:#2a1010;border-radius:4px;overflow:hidden"><i style="display:block;height:100%;width:${Math.round(p * 100)}%;background:${c}"></i></div>`;
function duelOptions(sel) { return duelParticipants().map(p => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${esc(p.name)} · ${esc(FAC[p.fac].n)} · cấp ${p.lvl}</option>`).join(''); }
function duelModal(res) {
  if(window.SHARED_WORLD){realActivityLobby();return;}
  const ps = duelParticipants(); if (!DUEL_UI.b || !ps.some(p => p.id === DUEL_UI.b) || DUEL_UI.b === DUEL_UI.a) DUEL_UI.b = (ps.find(p => p.id !== DUEL_UI.a) || {}).id;
  const lvAuto = Math.max(1, Math.min(...ps.map(p => p.lvl)));
  const hall = (S.duelHall || []).slice(-5).reverse().map(h => `<div class="qrow"><span>🏆 <b>${esc(h.champ)}</b><small>${esc(h.mode === 'std' ? 'chuẩn hóa cấp ' + h.level : 'đồ thật')} · ${h.n} người · ${h.wins} thắng</small></span><small></small><small>${new Date(h.t).toLocaleDateString('vi-VN')}</small></div>`).join('');
  modal(`<h3>⚔ Đấu trường <small>PK tay đôi</small></h3>
    <p class="desc">Đây là đấu mô phỏng với bot để thử võ công và trang bị; chưa phải liên đấu giữa người chơi online.</p>
    <p class="desc">Tay đôi tới khi một bên hết máu. <b>Chuẩn hóa</b>: cùng cấp, cùng bộ đồ cơ bản, điểm tự cộng tối ưu — để cân bằng 13 phái. <b>Đồ thật</b>: dùng đúng cấp, đồ, kỹ năng hiện có (đồ mạnh thì thắng nhiều hơn). Khi PK không tự hồi máu / nội lực (chỉ số hồi chỉ để luyện cấp), chỉ hồi bằng thuốc mang theo (${DUEL_POT.life} bình máu, ${DUEL_POT.mana} bình nội lực; đồ thật thì mua bằng vàng), hút máu tối đa ${DUEL_LEECH_CAP}%, hết thuốc là chết.</p>
    <div class="row"><label><input type="radio" name="dlMode" value="std" ${DUEL_UI.mode === 'std' ? 'checked' : ''}> Chuẩn hóa</label> · <label><input type="radio" name="dlMode" value="real" ${DUEL_UI.mode === 'real' ? 'checked' : ''}> Đồ thật</label> · cấp chuẩn hóa <input type="number" id="dlLv" min="1" max="${MAX_LEVEL}" value="${DUEL_UI.level || lvAuto}" style="width:60px"></div>
    <div class="row"><select id="dlA">${duelOptions(DUEL_UI.a)}</select> ⚔ <select id="dlB">${duelOptions(DUEL_UI.b)}</select></div>
    <div class="btnrow"><button class="btn" id="dlGo">Đấu 1 trận</button><button class="btn" id="dlWatch">▶ Xem trực tiếp</button><button class="btn" id="dlBots">🎬 2 bot đánh nhau</button><button class="btn" id="dlTour">Giải Võ Lâm Minh Chủ</button><button class="btn" id="dlBal">Báo cáo cân bằng 13 phái</button></div>
    <div id="dlRes">${res || ''}</div>
    ${hall ? `<h3>Minh chủ các kỳ</h3>${hall}` : ''}
    <div class="btnrow"><button class="btn" id="dlClose">Đóng</button></div>`, () => {
    const q = id => document.getElementById(id);
    document.querySelectorAll('input[name=dlMode]').forEach(r => r.onchange = () => { DUEL_UI.mode = r.value; });
    q('dlA').onchange = e => { DUEL_UI.a = e.target.value; }; q('dlB').onchange = e => { DUEL_UI.b = e.target.value; };
    q('dlLv').onchange = e => { DUEL_UI.level = clamp(Math.floor(+e.target.value) || 0, 0, MAX_LEVEL); };
    q('dlGo').onclick = duelUiOne; q('dlWatch').onclick = () => duelWatch(DUEL_UI.a, DUEL_UI.b); q('dlBots').onclick = duelWatchBots; q('dlTour').onclick = duelUiTour; q('dlBal').onclick = duelUiBalance; q('dlClose').onclick = () => closeModal();
  });
}
function duelUiOne() {
  const ps = duelParticipants(), a = ps.find(p => p.id === DUEL_UI.a), b = ps.find(p => p.id === DUEL_UI.b);
  if (!a || !b || a === b) { toast('Chọn hai người khác nhau'); return; }
  const lv = DUEL_UI.level || Math.min(a.lvl, b.lvl), gold0 = [a.state.gold, b.state.gold];
  const [FA, FB] = duelPrep(a.state, b.state, DUEL_UI.mode, DUEL_UI.mode === 'std' ? lv : 0), r = duelSim(FA, FB, Math.random, true), s = duelSummary(r);
  const paid = DUEL_UI.mode === 'real' ? `Tiền thuốc: ${esc(a.name)} ${fmt(gold0[0] - a.state.gold)} · ${esc(b.name)} ${fmtSilver(gold0[1] - b.state.gold)}. ` : '';
  const side = (F, c) => `<div style="flex:1;min-width:140px"><b style="color:${ALLY_COL[F.fac] || '#fff'}">${esc(F.name)}</b><div class="dim small">${esc(FAC[F.fac].n)} · cấp ${F.L}</div>${duelBar(Math.max(0, F.hp / F.hpMax), c)}<div class="small">${Math.max(0, Math.round(F.hp))}/${Math.round(F.hpMax)} máu · gây ${fmt(F.dmgDone)} (${F.hits} trúng, ${F.crits} chí mạng, ${F.misses} trượt) · ${F.casts} chiêu / ${F.basics} thường · thuốc ${F.potUsed}+${F.manaPotUsed}</div></div>`;
  const log = (r.log || []).slice(0, 18).map(l => `<div class="small dim">${l[0].toFixed(1)}s · ${esc(l[1])}: ${esc(l[2])} ${esc(String(l[3]))}</div>`).join('');
  duelModal(`<div class="card"><h3>${r.timeout ? '⏱ Hết giờ' : '🏁'} Thắng: <span style="color:${ALLY_COL[r.winner.fac] || '#fff'}">${esc(s.winner)}</span> <small>sau ${s.time}s</small></h3>
    <div style="display:flex;gap:10px;flex-wrap:wrap">${side(FA, '#4fd04f')}${side(FB, '#6aa8ff')}</div><p class="dim small">${paid}${DUEL_UI.mode === 'std' ? 'Chuẩn hóa cấp ' + lv + ', cùng bộ đồ cơ bản.' : 'Đồ thật.'}</p>${log}</div>`);
}
function duelUiTour() {
  const ps = duelParticipants(); if (ps.length < 2) { toast('Cần ít nhất 2 người'); return; }
  const lv = DUEL_UI.level || Math.max(1, Math.min(...ps.map(p => p.lvl))), rows = ps.map(p => ({ p, w: 0, l: 0, hp: 0, n: 0, dmg: 0 }));
  const std = DUEL_UI.mode === 'std';
  for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
    const FA = std ? duelFighter(stdState(ps[i].fac, lv), 'std', ps[i].name) : duelFighter(ps[i].state, 'real', ps[i].name, true);
    const FB = std ? duelFighter(stdState(ps[j].fac, lv), 'std', ps[j].name) : duelFighter(ps[j].state, 'real', ps[j].name, true);
    const r = duelSim(FA, FB), wi = r.winner === FA ? i : j, li = wi === i ? j : i;
    rows[wi].w++; rows[li].l++; rows[wi].hp += Math.max(0, r.winner.hp / r.winner.hpMax); rows[wi].n++; rows[wi].dmg += r.winner.dmgDone; rows[li].dmg += r.loser.dmgDone;
  }
  rows.sort((a, b) => b.w - a.w || b.hp - a.hp);
  const champ = rows[0];
  (S.duelHall = S.duelHall || []).push({ t: Date.now(), champ: champ.p.name, mode: DUEL_UI.mode, level: lv, n: ps.length, wins: champ.w }); if (S.duelHall.length > 20) S.duelHall.shift(); save();
  const tr = rows.map((r, i) => `<tr class="${r.p.you ? 'rkyou' : ''}"><td>${i === 0 ? '🏆' : i + 1}</td><td style="color:${ALLY_COL[r.p.fac] || '#fff'}">${esc(r.p.name)}</td><td>${esc(FAC[r.p.fac].n)}</td><td>${std ? lv : r.p.lvl}</td><td><b>${r.w}</b>/${r.w + r.l}</td><td>${r.n ? Math.round(r.hp / r.n * 100) + '%' : '—'}</td></tr>`).join('');
  duelModal(`<div class="card"><h3>🏆 Võ Lâm Minh Chủ: <span style="color:${ALLY_COL[champ.p.fac] || '#fff'}">${esc(champ.p.name)}</span> <small>${esc(FAC[champ.p.fac].n)}</small></h3>
    <div style="overflow:auto"><table class="rktbl"><thead><tr><th>#</th><th>Tên</th><th>Phái</th><th>Cấp</th><th>Thắng</th><th>Máu còn TB</th></tr></thead><tbody>${tr}</tbody></table></div>
    <p class="dim small">Vòng tròn: mỗi cặp đấu một trận. Kiểu ${std ? 'chuẩn hóa cấp ' + lv : 'đồ thật (thuốc miễn phí trong giải)'}.</p></div>`);
}
function duelUiBalance() {
  const L = DUEL_UI.level || Math.max(1, Math.min(...duelParticipants().map(p => p.lvl))), rep = duelBalance(L, 60).sort((a, b) => b.wr - a.wr);
  const tr = rep.map(r => `<tr><td style="color:${ALLY_COL[r.fac] || '#fff'}">${esc(r.name)}</td><td><b>${(r.wr * 100).toFixed(0)}%</b></td><td>${duelBar(r.wr, r.wr > 0.55 ? '#e0a040' : r.wr < 0.45 ? '#e05040' : '#4fd04f')}</td><td>${r.time.toFixed(0)}s</td></tr>`).join('');
  duelModal(`<div class="card"><h3>Cân bằng 13 phái <small>chuẩn hóa cấp ${L}</small></h3><table class="rktbl"><thead><tr><th>Phái</th><th>Thắng</th><th></th><th>Trận TB</th></tr></thead><tbody>${tr}</tbody></table>
    <p class="dim small">Vòng tròn 13 phái, mỗi cặp 60 trận. Gần 50% là cân bằng. Cân bằng nằm ngay trong hệ số phái (chung cho luyện công và PK), không còn hệ số bù riêng cho PK.</p></div>`);
}
/* Chinh THANG bang he so phai FAC_DMG_NORM (dung chung cho luyen cong + PK) theo ti le thang vong tron chuan hoa: PK khong con he so bu rieng.
   Moi vong: phai thang nhieu -> giam he so, thua nhieu -> tang; giu nguyen trung vi cua bang (nhip luyen cap khong doi); chinh sinh luc PK (ref.hit) de tran ~DUEL_TARGET_T giay.
   Tra ve { norm: {phai: [14 he so]}, ref: {moc: {hit, life}} } de dan vao stats.js / DUEL_CFG.ref. */
function duelTuneTable(iters = 30, trials = 40) {
  const facs = FACTIONS.map(f => f.key), med = a => { const s = a.slice().sort((x, y) => x - y); return (s[(s.length - 1) >> 1] + s[s.length >> 1]) / 2; };
  duelApplyCfg({ norm: {}, ref: {} });
  const ref = {}, med0 = DUEL_BRACKETS.map((L, bi) => med(facs.map(k => FAC_DMG_NORM[k][bi])));
  DUEL_BRACKETS.forEach(L => { const fs = facs.map(k => duelFighter(stdState(k, L), 'std')); ref[L] = { hit: med(fs.map(F => duelAvgHit(F.P, F.acts[0]))), life: med(fs.map(F => F.P.life)) }; DUEL_CFG.ref[L] = ref[L]; });
  const hist = [], best = DUEL_BRACKETS.map(() => ({ dev: Infinity }));
  for (let it = 0; it < iters; it++) {
    const al = 0.4 / (1 + it / 4); let worst = 0;
    DUEL_BRACKETS.forEach((L, bi) => {
      const rep = duelBalance(L, trials);
      const dev = Math.sqrt(rep.reduce((s, r) => s + (r.wr - 0.5) ** 2, 0) / rep.length);       // luu cot he so tot nhat (do lech RMS nho nhat) cua moc nay
      if (dev < best[bi].dev) best[bi] = { dev, col: facs.map(f => FAC_DMG_NORM[f][bi]), hit: ref[L].hit };
      for (const r of rep) { FAC_DMG_NORM[r.fac][bi] *= clamp(Math.pow(0.5 / clamp(r.wr, 0.03, 0.97), al), 0.8, 1.25); worst = Math.max(worst, Math.abs(r.wr - 0.5)); }
      const k = med0[bi] / med(facs.map(f => FAC_DMG_NORM[f][bi])); facs.forEach(f => { FAC_DMG_NORM[f][bi] *= k; });      // giu trung vi
      const mt = med(rep.map(r => r.time)); ref[L].hit *= clamp(Math.pow(DUEL_TARGET_T / Math.max(1, mt), 0.7), 0.85, 1.18);
    });
    hist.push(+worst.toFixed(3));
  }
  DUEL_BRACKETS.forEach((L, bi) => { if (best[bi].col) { facs.forEach((f, i) => { FAC_DMG_NORM[f][bi] = best[bi].col[i]; }); ref[L].hit = best[bi].hit; } });
  hist.push('best-rms: ' + best.map(b => b.dev.toFixed(3)).join(' '));
  return { norm: Object.fromEntries(facs.map(f => [f, FAC_DMG_NORM[f].map(v => +v.toFixed(3))])), ref: Object.fromEntries(DUEL_BRACKETS.map(L => [L, { hit: +ref[L].hit.toFixed(1), life: +ref[L].life.toFixed(1) }])), worst: hist };
}
/* ======================= PK TRUC TIEP TREN BAN DO (khong quai) =======================
   Hai nhan vat duoc dua vao ban do dang dung, quai tam ngung (R.duel). Ho tu chay, tien toi / lui ra giu khoang cach theo tam chieu, di ngang lieu,
   ne dan bay (dan toi dich neu muc tieu da di xa diem ngam > 34px thi truot), ra chieu bang hieu ung that cua game nhu luc danh quai.
   Cung bo sat thuong / thuoc / bua chu cua mo phong PK; luc xem con co hanh vi di chuyen nen ket qua co the lech chut so voi tran mo phong nhanh. */
function duelWatchBots() {
  if (window.SHARED_WORLD) { return; }
  const bots = duelParticipants().filter(p => !p.you); if (bots.length < 2) { toast('Cần ít nhất 2 bot (mời ở 🎁 → Tổ đội)'); return; }
  const a = aPick(bots); let b; do { b = aPick(bots); } while (b === a); DUEL_UI.a = a.id; DUEL_UI.b = b.id; duelWatch(a.id, b.id);
}
const duelWatch = (idA, idB) => duelLiveStart(idA, idB);
const DUEL_ARENA_R = 440;
function duelPlace(D) {                 // tim 2 diem di duoc cach nhau ~300 quanh nhan vat chinh
  const cx = H.x, cy = H.y, walk = (x, y) => !(OBS && OBS.g) || obsWalk(x, y);
  for (let i = 0; i < 24; i++) {
    const ang = i * 0.5236, r = 150 - (i > 11 ? 40 : 0), ax = cx + Math.cos(ang) * r, ay = cy + Math.sin(ang) * r * 0.8, bx = cx - Math.cos(ang) * r, by = cy - Math.sin(ang) * r * 0.8;
    if (walk(ax, ay) && walk(bx, by)) return [[ax, ay], [bx, by]];
  }
  const a = inWorld(cx - 150, cy), b = inWorld(cx + 150, cy); return [a, b];
}
function duelLiveStart(idA, idB) {
  if(typeof stgRunActive==='function'&&stgRunActive()){toast('Hãy rời vượt ải trước');return;}
  if(window.SHARED_WORLD){toast('Đấu trường bot đã tắt online. PvP người thật hiện có tại Tống Kim.');return;}
  const ps = duelParticipants(), a = ps.find(p => p.id === idA), b = ps.find(p => p.id === idB);
  if (!a || !b || a === b) { toast('Chọn hai người khác nhau'); return; }
  if (SV.on || R.town || R.tower || R.tk || R.duel || R.deadT > 0) { toast('Hãy kết thúc hoạt động hiện tại trước khi xem PK'); return; }
  const mode = DUEL_UI.mode, lv = DUEL_UI.level || Math.min(a.lvl, b.lvl);
  closeModal(true);
  const D = R.duel = { a, b, mode, lv, paused: false, hudSig: '' }; document.body.classList.add('dueling');
  duelLiveSetup(D); duelHud(D); R.banner = { t: 2.6, text: '⚔ Đấu Trường', sub: `${a.name} ⚔ ${b.name}` };
}
function duelLiveSetup(D) {
  const prep = p => D.mode === 'std' ? duelFighter(stdState(p.fac, D.lv), 'std', p.name) : duelFighter(p.state, 'real', p.name, true);
  D.A = prep(D.a); D.B = prep(D.b); D.t = 0; D.done = false; D.res = null; D.pending = []; D.evt = []; D.feed = []; D.stat = 0;
  if (D.rbTrial && typeof rbTrialScale === 'function') rbTrialScale(D);
  const [pa, pb] = duelPlace(D); D.ox = (pa[0] + pb[0]) / 2; D.oy = (pa[1] + pb[1]) / 2; D.R = DUEL_ARENA_R;
  [[D.A, pa, pb], [D.B, pb, pa]].forEach(([F, p, q]) => {
    Object.assign(F, { x: p[0], y: p[1], dir: dirOf(q[0] - p[0], q[1] - p[1]), act: 'st', actT: 0, moving: false, sp: 150 * Math.max(0.8, F.P.speed || 1), animKey: (W.hero[F.fac] || {}).anim,
      strafeDir: Math.random() < 0.5 ? -1 : 1, strafeT: rnd(0.3, 1), dodgeUntil: 0, dodgeDir: 1, dodgeSkill: rnd(0.45, 0.8), lock: 0, postCast: 0 });
    F.nextAtk = rnd(0.3, 1.0);
  });
  D.cx = D.ox; D.cy = D.oy; R.enemies = []; R.corpses = []; R.fx = []; R.txt = []; DUEL_EVT = D.evt; snapCamera();
}
function duelMove(D, F, dx, dy) {
  let nx = F.x + dx, ny = F.y + dy; const rx = nx - D.ox, ry = ny - D.oy, rr = Math.hypot(rx, ry);
  if (rr > D.R) { nx = D.ox + rx / rr * D.R; ny = D.oy + ry / rr * D.R; }
  if (OBS && OBS.g) { if (!obsMove(F, nx, ny) && !obsMove(F, nx, F.y)) obsMove(F, F.x, ny); } else { F.x = nx; F.y = ny; }
}
function duelLiveCast(D, F, T, t) {
  const a = duelChoose(F), dist = Math.hypot(T.x - F.x, T.y - F.y);
  F.nextAtk = t + 1 / a.rate; F.act = 'at'; F.actT = 0; F.dir = dirOf(T.x - F.x, T.y - F.y); F.lock = t + Math.min(0.32, 0.45 / a.rate); F.postCast = t + 0.5;
  allyCastFx(F, T, a);                                           // hieu ung chieu that cua game (dan bay / no / vong cast) tai vi tri F
  if (!a.id) burst(T.x, T.y - 12, '#ddd');                                // danh thuong: vong nho tai muc tieu
  if (typeof skillSfx === 'function' && a.id) { try { skillSfx(a.id); } catch (e) { /* khong co am thanh */ } }
  D.pending.push({ t: t + (a.melee ? 0.2 : clamp(dist / 650, 0.12, 0.9)), F, T, a, ax: T.x, ay: T.y, melee: !!a.melee });
}
function duelLiveImpact(D, p, t) {
  const { F, T, a } = p; if (F.hp <= 0 || T.hp <= 0) return;
  const away = p.melee ? Math.hypot(T.x - F.x, T.y - F.y) > 130 : Math.hypot(T.x - p.ax, T.y - p.ay) > 34;       // muc tieu da chay khoi vung dan / tam can chien -> ne
  duelApply(F, T, a, away ? { miss: true, dodged: true } : duelHit(F, a, T, Math.random), t, null);
}
function duelLiveAI(D, F, T, dt, t) {
  if (F.hp <= 0) { F.moving = false; return; }
  const dx = T.x - F.x, dy = T.y - F.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, px = -uy, py = ux;
  if (t < F.stunUntil) { F.moving = false; if (F.act !== 'hurt') { F.act = 'hurt'; F.actT = 0; } return; }
  duelDrink(F, t, null);
  if (duelSupportAI(F, T, t, null, d < 420)) { F.act = 'at'; F.actT = 0; F.lock = t + DUEL_CAST_T; return; }
  const a = F.acts.find(x => x.cost <= F.mana) || F.acts[F.acts.length - 1], reach = a.melee ? 84 : clamp((a.rad || 300) * 0.8, 150, 380);
  const inc = D.pending.find(p => p.T === F && !p.melee && !p.reacted && p.t - t > 0.14);        // co dan bay toi: co the phan ung ne
  if (inc) { inc.reacted = true; if (Math.random() < F.dodgeSkill) { F.dodgeUntil = inc.t - 0.02; F.dodgeDir = Math.random() < 0.5 ? -1 : 1; } }
  let mx = 0, my = 0, k = 1;
  if (t < F.lock) { F.moving = false; }
  else {
    if (t < F.dodgeUntil) { mx = px * F.dodgeDir; my = py * F.dodgeDir; }
    else if (d > reach + 6) { mx = ux; my = uy; }                                                // tien toi tam danh
    else if (!a.melee && d < reach * 0.45) { mx = -ux; my = -uy; k = 0.9; }                        // danh xa: lui ra giu khoang cach
    else {                                                                                       // trong tam: di ngang lieu
      F.strafeT -= dt; if (F.strafeT <= 0) { F.strafeDir = -F.strafeDir; F.strafeT = rnd(0.5, 1.3); }
      if (!a.melee || t < F.postCast) { mx = px * F.strafeDir * 0.6; my = py * F.strafeDir * 0.6; k = 0.7; }
    }
    F.moving = Math.hypot(mx, my) > 0.05;
    if (F.moving) { duelMove(D, F, mx * F.sp * k * dt, my * F.sp * k * dt); if (F.act !== 'at' && F.act !== 'hurt') F.dir = dirOf(mx, my); }
    if (t >= F.nextAtk && d <= reach + 10) duelLiveCast(D, F, T, t);
  }
}
function duelLiveEvents(D) {
  const colOf = F => ALLY_COL[F.fac] || '#fff', feed = h => { D.feed.unshift(h); if (D.feed.length > 5) D.feed.pop(); D.hudSig = ''; };
  while (D.evt.length) {
    const ev = D.evt.shift(), F = ev.by, T = ev.to;
    if (ev.potion) { addText(F.x, F.y - 70, ev.potion === 'life' ? '+ thuốc máu' : '+ thuốc nội lực', ev.potion === 'life' ? '#7fe07f' : '#7fb8ff', 12); feed(`${esc(F.name)} uống thuốc ${ev.potion === 'life' ? 'máu' : 'nội lực'}`); continue; }
    if (ev.support) { addText(F.x, F.y - 84, ev.support, '#ffd24a', 13); burst(T.x, T.y, ev.kind === 'debuff' ? '#c77bff' : '#ffd24a'); feed(`<b style="color:${colOf(F)}">${esc(F.name)}</b> ${esc(ev.support)}${ev.kind === 'debuff' ? ' → ' + esc(T.name) : ''}`); continue; }
    if (ev.miss) { addText(T.x, T.y - 60, ev.dodged ? 'Né!' : 'Trượt', '#9cf', 12); continue; }
    addText(T.x, T.y - 58, dmgNum(ev.dmg), ev.crit ? '#ffe14a' : (ELEM_COL[ev.el] || '#ffb070'), ev.crit ? 17 : 13, ev.crit ? 'crit' : 'dmg');
    F.dOut = (F.dOut || 0) + (ev.dmg || 0); if (ev.crit) F.nCrit = (F.nCrit || 0) + 1;
    if (ev.dot) addText(T.x + 16, T.y - 40, 'độc ' + fmt(ev.dot), '#8fe34a', 10);
    if (T.act !== 'at' && T.hp > 0) { T.act = 'hurt'; T.actT = 0; }
    if (ev.stun) { addText(T.x, T.y - 78, 'Choáng!', '#ffd24a', 13); feed(`${esc(F.name)} ${esc(ev.skill)} làm ${esc(T.name)} choáng`); }
    else if (ev.crit) feed(`${esc(F.name)} ${esc(ev.skill)} chí mạng <b>${fmt(ev.dmg)}</b>`);
  }
}
function duelLiveTick(dt) {
  const D = R.duel; if (!D) return;
  obsFrame();
  if (D.paused || D.done) return;
  D.t += dt; const t = D.t;
  duelUpkeep(D.A, dt, t); duelUpkeep(D.B, dt, t);
  if (D.A.hp > 0 && D.B.hp > 0) { duelLiveAI(D, D.A, D.B, dt, t); duelLiveAI(D, D.B, D.A, dt, t); }
  for (let i = D.pending.length - 1; i >= 0; i--) if (t >= D.pending[i].t) { const p = D.pending[i]; D.pending.splice(i, 1); duelLiveImpact(D, p, t); }
  duelLiveEvents(D);
  D.cx = (D.A.x + D.B.x) / 2; D.cy = (D.A.y + D.B.y) / 2;
  if (D.A.hp <= 0 || D.B.hp <= 0 || t >= DUEL_MAX_T) {
    D.done = true; D.res = duelFinish(D.A, D.B, t, null); const w = D.res.winner;
    if (typeof wbDuelDone === 'function') wbDuelDone(D);                 // thang PK bot giang ho (rewards_ext.js)
    D.hudSig = ''; duelResultNotice(D, t);
  }
}
function duelLiveDraw(c, dt) {
  const D = R.duel; if (!D) return;
  const list = [D.A, D.B].sort((a, b) => a.y - b.y);
  for (const F of list) {
    const hw = typeof nhBotFaction === 'function' ? nhBotFaction(F.fac, F.state && F.state.sex) : W.hero[F.fac] || {}; F.animKey = hw.anim;
    stepAct(F, dt, F.moving ? 'run' : 'st');
    if (F.hp <= 0) setAct(F, 'die'); else if (F.act !== 'at' && F.act !== 'hurt') setAct(F, F.moving ? 'run' : 'st');
    c.fillStyle = '#0007'; c.beginPath(); c.ellipse(F.x, F.y, 16, 6, 0, 0, 7); c.fill();
    if (F.effects.some(e => Number.isFinite(e.until) || true)) {            // vong chan: vang = dang co buff, tim = bi lam yeu
      const buff = F.effects.some(e => F.sup.some(s => s.id === e.id && s.kind === 'buff')), deb = F.effects.some(e => !F.sup.some(s => s.id === e.id));
      if (buff || deb) { c.strokeStyle = deb ? '#c77bff' : '#ffd24a'; c.lineWidth = 1.6; c.globalAlpha = 0.7; c.beginPath(); c.ellipse(F.x, F.y, 22, 8, 0, 0, 7); c.stroke(); c.globalAlpha = 1; }
    }
    const you = F.state === S, composed = F.state && typeof nhBotAllowed === 'function' && nhBotAllowed(you) && nhDrawFor(nhLookFor(F.state.eq, F.state.sex, F.state.ride), F.act || 'st', F.dir || 0, F.actT || 0, F.x, F.y, HERO_SCALE);
    const drawn = composed || (hw.anim && drawAnim(hw.anim, F.act || 'st', F.dir || 0, F.actT || 0, F.x, F.y, HERO_SCALE));
    if (!you && typeof nhBotRecord === 'function') nhBotRecord(!!composed);
    label(F.x, F.y - (drawn ? Math.min(drawn, 90) * 0.9 : 52) - 6, `${F.name} · Lv${F.L}`, ALLY_COL[F.fac] || '#fff', 12, Math.max(0, F.hp) / Math.max(1, F.hpMax), F === D.A ? '#4fd04f' : '#6aa8ff');
  }
  duelHudUpdate(D);
}
/* HUD tren man hinh: thanh mau / noi luc 2 ben, dong ho, nhat ky, nut tam dung / dau lai / thoat */
function duelHud(D) {
  const b = document.getElementById('battle'); let h = document.getElementById('duelHud');
  if (!h) { h = document.createElement('div'); h.id = 'duelHud'; b.appendChild(h); }
  h.onclick = ev => {
    const t = ev.target.closest('[data-dh]'); if (!t || !R.duel) return;
    if (t.dataset.dh === 'pause') { R.duel.paused = !R.duel.paused; R.duel.hudSig = ''; }
    else if (t.dataset.dh === 'again') { if (R.duel.rbTrial) return; if (typeof tbClose === 'function') tbClose(); duelLiveSetup(R.duel); R.banner = { t: 1.5, text: '⚔ Đấu lại', sub: '' }; R.duel.hudSig = ''; }
    else if (t.dataset.dh === 'exit') duelLiveStop(true);
  };
  D.hudSig = '';
}
function duelHudUpdate(D) {
  const h = document.getElementById('duelHud'); if (!h) return;
  /* 08/10: lam lai giao dien: khung JX1 giua tren, 2 ben doi xung (ten, phai, cap, mau co so, noi luc), giua: VS + dong ho + nut ngang */
  const side = (F, k) => `<div class="dhs ${k ? 'r' : 'l'}"><div class="dhn"><b style="color:${ALLY_COL[F.fac] || '#fff'}">${esc(F.name)}</b><small>${esc(FAC[F.fac].n)} · Lv${F.L}</small></div><div class="dhb"><i class="dhh" data-f="${k}"></i><em class="dhv" data-f="${k}"></em></div><div class="dhb m"><i class="dhm" data-f="${k}"></i></div></div>`;
  if (D.hudSig !== 'ok') {
    h.innerHTML = `<div class="dhrow">${side(D.A, 0)}<div class="dhmid"><div class="dhvs">VS</div><span id="dhT">0s</span><div class="dhbt"><button data-dh="pause" class="dhbtn" title="${D.paused ? 'Tiếp tục' : 'Tạm dừng'}">${D.paused ? '▶' : '⏸'}</button><button data-dh="again" class="dhbtn" title="Đấu lại">↻</button><button data-dh="exit" class="dhbtn" title="Rời đấu trường">✖</button></div></div>${side(D.B, 1)}</div>${D.feed.length ? `<div class="dhfeed">${D.feed.slice(0, 3).join('<br>')}</div>` : ''}`;
    D.hudSig = 'ok';
  }
  h.querySelectorAll('.dhh').forEach(e => { const F = +e.dataset.f ? D.B : D.A; e.style.width = Math.round(clamp(F.hp / F.hpMax, 0, 1) * 100) + '%'; });
  h.querySelectorAll('.dhv').forEach(e => { const F = +e.dataset.f ? D.B : D.A; e.textContent = `${fmt(Math.max(0, Math.round(F.hp)))} / ${fmt(Math.round(F.hpMax))}`; });
  h.querySelectorAll('.dhm').forEach(e => { const F = +e.dataset.f ? D.B : D.A; e.style.width = Math.round(clamp(F.mana / F.manaMax, 0, 1) * 100) + '%'; });
  const t = document.getElementById('dhT'); if (t) t.textContent = D.t.toFixed(1) + 's' + (D.done ? ' · xong' : '');
}
/* 08/10: bang ket qua thach dau kieu JX1, 10 giay tu roi dau truong */
const DUEL_AUTO_EXIT = 10;
function duelResultNotice(D, t) {
  if (D.rbTrial && typeof rbTrialFinish === 'function') { rbTrialFinish(D); return; }
  const w = D.res.winner, l = D.res.loser, you = D.a.you ? D.A : D.b.you ? D.B : null;   // kieu dau chuan: state la bo chuan, khong phai S -> nhan theo nguoi tham gia
  const title = you ? (w === you ? (D.res.timeout ? '⏱ Hết giờ · Bạn thắng' : '🏆 Chiến thắng!') : (D.res.timeout ? '⏱ Hết giờ · Bạn thua' : '☠ Thất bại')) : `🏆 ${esc(w.name)} thắng`;
  const row = F => `<tr><td style="color:${ALLY_COL[F.fac] || '#fff'}">${esc(F.name)}</td><td>${Math.max(0, Math.round(F.hp / F.hpMax * 100))}%</td><td>${fmt(Math.round(F.dOut || 0))}</td><td>${F.nCrit || 0}</td></tr>`;
  tbShow({
    title, tone: you ? (w === you ? 'win' : 'lose') : 'info', sec: DUEL_AUTO_EXIT,
    html: `<p>${esc(w.name)} hạ ${esc(l.name)} sau <b>${t.toFixed(1)} giây</b>${D.res.timeout ? ' (hết giờ, xét máu còn lại)' : ''}.</p>
      <table class="jxtb-tb"><tr><th></th><th>Máu còn</th><th>Sát thương</th><th>Chí mạng</th></tr>${row(D.A)}${row(D.B)}</table>`,
    btns: [{ t: 'Đấu lại', fn: () => { if (R.duel) { duelLiveSetup(R.duel); R.banner = { t: 1.5, text: '⚔ Đấu lại', sub: '' }; R.duel.hudSig = ''; } } },
      { t: 'Rời đấu trường', main: true, fn: () => duelLiveStop(false) }]
  });
}
function duelLiveStop(reopen) {
  if (!R.duel) return;
  if (R.duel.rbTrial && typeof rbTrialLoss === 'function') { rbTrialLoss(R.duel); reopen = false; }
  if (typeof tbClose === 'function') tbClose();
  R.duel = null; DUEL_EVT = null; document.body.classList.remove('dueling');
  const h = document.getElementById('duelHud'); if (h) h.remove();
  R.enemies = []; R.corpses = []; R.fx = []; R.txt = []; R.spawnT = 0.6; R.banner = null; snapCamera();
  if (reopen) duelModal();
}
