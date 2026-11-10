/* ======================= CHIEU KICH HOAT (chieu 120 / 180 cua SBQA) =======================
   Du lieu SBQA: autoreplyskill (khi bi danh trung), autoattackskill (khi tan cong), autorescueskill (khi mau yeu),
   tham so [p1, -1, p3]: p1 = (chieu con << 8) | cap chieu con, p3 = (thoi gian nghi theo khung << 8) | ti le %. 18 khung = 1 giay.
   Dai Thua Nhu Lai Chu (709) co ti le 0 trong p3, ti le that nam o returnskill_p.
   Chieu con la don tan cong -> ra don that len quai; la hieu ung -> trang thai tam thoi (R.buffs), gia tri [v, thoi luong khung].
   Moc vao combat.js: heroHit (procDmgMul), heroAttack (procFire 'attack'), enemyHit (procDefend / procReduce / procAfterHurt), tick (procTick). */
'use strict';
const PROC_KIND = { autoreplyskill: 'hurt', autoattackskill: 'attack', autorescueskill: 'rescue' };
const skillLv = id => (typeof skLv === 'function' ? skLv(id) : ((S && S.sk && S.sk[id]) || 0));

function procList() {
  const sig = JSON.stringify([S.fac,S.lvl,S.books,S.sk || {},R.P?.plusSkill,R.P?.skAdd]);
  if (R.procSig === sig && R.procs) return R.procs;
  const old = R.procs || [], out = [];
  for (const id in S.sk || {}) {
    const L = skillLv(id), s = SK[id]; if (!L) continue;
    for (const k in PROC_KIND) {
      const v = skVal(s, k, L); if (!v || v[0] <= 255) continue;
      const cid = v[0] >> 8, child = SK[cid]; if (!child) continue;
      const rp = skVal(s, 'returnskill_p', L);
      const chance = clamp(rp ? rp[0] : (v[2] & 255) || 5, 0, 100), cd = (v[2] >> 8) / 18;
      out.push({ src: s, kind: PROC_KIND[k], child, clv: Math.max(1, (v[0] & 255) || L), chance, cd: cd || 3, ready: old.find(p=>p.src.id===s.id&&p.kind===PROC_KIND[k])?.ready || 0 });
    }
  }
  R.procSig = sig; R.procs = out; return out;
}

function procText(t, col = '#ffd27a') { if (!R.quiet && typeof addText === 'function') addText(H.x, H.y - 66, t, col, 13); }

/* Hieu ung cua chieu con -> trang thai tam thoi */
function procBuff(c, L) {
  const b = { n: c.n, t: 0, id: c.id };   // id: icon o khoi nhan vat (lucchien.js)
  for (const k in c.attr) {
    const x = skVal(c, k, L); if (!x) continue;
    const val = x[0], dur = (x[1] > 0 ? x[1] : 90) / 18;
    switch (k) {
      case 'meleedamagereturn_p': case 'rangedamagereturn_p': b.ret = Math.max(b.ret || 0, val); break;           // phan don %
      case 'block_rate': b.block = clamp(val / 10, 0, 60); break;                                                       // do don (200 -> 20%)
      case 'ignorenegativestate_p': b.reduce = Math.max(b.reduce || 0, 15); break;                                      // mien trang thai xau -> giam 15% sat thuong nhan
      case 'lifereplenish_v': b.hot = val * 2; break;                                                                   // hoi mau moi giay
      case 'hide': b.dodge = 50; break;                                                                                 // an than: quai danh hut 50%
      case 'damage2addmana_p': b.d2m = val; break;                                                                      // sat thuong nhan -> noi luc
      case 'fastwalkrun_p': b.speed = val; break;
      default:
        if (/^enhance_\d+_auto$/.test(k) || /^anti_\w+res_yan_p$/.test(k)) b.dmg = (b.dmg || 0) + val;                // tang sat thuong %
        else continue;
    }
    b.t = Math.max(b.t, dur);
  }
  return b.t ? b : null;
}

function procApply(p, target) {
  const c = p.child, L = p.clv;
  if (typeof isAttack === 'function' && isAttack(c)) {
    const list = typeof bqAttackList === 'function' ? bqAttackList() : alive(); const t = target && target.hp > 0 ? target : nearest(list); if (!t) return;
    const a = activeInfo(R.P, c, L);
    const center = a.around ? H : t, radius = a.around ? a.rad + 40 : 130;
    const tg = [t, ...list.filter(e => e !== t && Math.hypot(e.x - center.x, e.y - center.y) < radius).slice(0, Math.max(0, a.targets - 1))];
    const batch = R.heroHitBatchSeq = (R.heroHitBatchSeq || 0) + 1;
    for (const e of tg) { scheduleHeroHit(a, e, batch); if (typeof skillFx === 'function') skillFx(H, e, a, batch); }
    procText('✦ ' + c.n); return;
  }
  const b = procBuff(c, L); if (!b) return;
  R.buffs = (R.buffs || []).filter(x => x.n !== b.n); R.buffs.push(b);
  procText('✦ ' + c.n);
}

function procFire(kind, target) {
  if (!R.P) return;
  const now = R.procT || 0;
  for (const p of procList()) {
    if (p.kind !== kind || p.ready > now || Math.random() * 100 >= p.chance) continue;
    p.ready = now + p.cd; procApply(p, target);
  }
}

const procSum = k => (R.buffs || []).reduce((s, b) => s + (b[k] || 0), 0);
function procDmgMul() { return 1 + procSum('dmg') / 100; }
/* truoc khi nhan don: an than (ne) / do don -> bo qua don nay */
function procDefend(e) {
  const dodge = procSum('dodge'), block = procSum('block');
  if (dodge && Math.random() * 100 < dodge) { if (!R.quiet) addText(H.x, H.y - 30, 'Ẩn', '#cfe', 11); return true; }
  if (block && Math.random() * 100 < block) { if (!R.quiet) addText(H.x, H.y - 30, 'Đỡ', '#ffd27a', 11); return true; }
  return false;
}
function procReduce(d) { const r = Math.min(60, procSum('reduce')); return r ? d * (100 - r) / 100 : d; }
function procAfterHurt(e, d) {
  const ret = procSum('ret'); if (ret && e && e.hp > 0) e.hp -= Math.trunc(d * ret / 100);
  const m = procSum('d2m'); if (m && R.P) R.mana = Math.min(R.P.mana, R.mana + d * m / 100);
  procFire('hurt', e);
}
function procTick(dt) {
  R.procT = (R.procT || 0) + dt;
  if (R.buffs && R.buffs.length) {
    for (const b of R.buffs) { b.t -= dt; if (b.hot) heal(b.hot * dt, true); }
    R.buffs = R.buffs.filter(b => b.t > 0);
  }
  if (R.P && R.life > 0 && R.life < R.P.life * 0.3) procFire('rescue');
}
