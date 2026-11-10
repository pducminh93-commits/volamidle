if (typeof SV === 'undefined') window.SV = { on: false };
/* ======================= TONG KIM (G5): chien truong 2 phe tren ban do that ======================= */
'use strict';
/* - Ban do: Chien truong Tong Kim (ban do 380 Xung phong cua SBQA, day du hai hau doanh, img/z/tk.jpg + JMO.tk).
   - Lich: moi 30 phut (dong ho that) mot tran, bao truoc 2 phut, mo bao danh 5 phut; hoac bam Bao danh bat cu luc nao.
   - Tran 8 phut (thoi gian game): nguoi choi + dong mon + bot giang ho cung tam cap (moi phe 16 nguoi) + linh NPC + chu tuong giu hau doanh.
     Ha nguoi phe dich +15 diem (+5 neu chan chuoi lien tram cua ho), ha linh +3, ha chu tuong +60; lien tram 3/5/10 thuong them.
     Chet: hoi sinh o hau doanh sau 5 giay.
   - Chi so: nguoi choi = duelFighter (do that, nhu Dau truong PK); bot = moc PK chuan theo cap (duelRef) x chat luong; mau x TK_HP_K cho nhip nhanh.
   - Quan ham theo diem (icon that cua SBQA spr\ui3\rank): Binh si -> Hieu uy -> Thong linh -> Pho tuong -> Dai tuong -> Dai soai.
   - Thuong: diem Tong Kim (tien te, cua hang), kinh nghiem, ngan luong, do theo hang. Luu: S.tk = { pts, next, auto, n, win, hist[] } */
const TK_DUR = 480, TK_EVERY = 1800, TK_WARN = 120, TK_OPEN = 300, TK_RESPAWN = 5, TK_SIDE_N = 16, TK_HP_K = 0.4;
const TK_SIDES = [
  { n: 'Tống', col: '#5fb4ff', base: [0.80, 0.86], sol: 'enemy029', solN: 'Tống binh', grd: 'enemy021', grdN: 'Tống Vệ binh', gen: 'enemy017', genN: 'Tống Chủ tướng', boss: 'enemy004', bossN: 'Tống Nguyên Soái', bossSc: 1.55 },
  { n: 'Kim', col: '#ff7a5a', base: [0.22, 0.10], sol: 'enemy028', solN: 'Kim binh', grd: 'enemy024', grdN: 'Kim Vệ binh', gen: 'enemy023', genN: 'Kim Chủ tướng', boss: 'enemy006', bossN: 'Kim Nguyên Soái', bossSc: 1.35 },
];
const TK_RANKS = [[0, 'binhsi', 'Binh sĩ'], [100, 'hieuuy', 'Hiệu úy'], [300, 'thonglinh', 'Thống lĩnh'], [600, 'photuong', 'Phó tướng'], [1000, 'daituong', 'Đại tướng'], [1500, 'daisoai', 'Đại soái']]   // do 05/10: nguoi dung dau tran 10 phut ~1500 diem;
const TK_STREAK = { 3: 10, 5: 25, 10: 60 };
const TK_POTS = 3, TK_DODGE = 0.15;            // moi lan hoi sinh mang 3 binh thuoc (hoi 35%); ti le ne don cua nguoi choi / bot
const TK_SK = {};
function tkSkills(fac, L) {            // 1-3 chieu tan cong manh nhat cua phai o cap L (bot ra chieu that cua phai)
  const k = fac + ':' + Math.floor(L / 10); if (TK_SK[k]) return TK_SK[k];
  const f = FAC[fac]; if (!f) return (TK_SK[k] = []);
  return (TK_SK[k] = f.skills.filter(id => { const s = SK[id]; return s && isAttack(s) && s.req <= L && !s.proc; }).sort((a, b) => SK[b].req - SK[a].req).slice(0, 3));
}
const tkInView = u => u.x > CAM.x - 80 && u.x < CAM.x + AR.w + 80 && u.y > CAM.y - 100 && u.y < CAM.y + AR.h + 140;
function tkCastFx(u, t, atk) { if (!atk || !atk.id || R.quiet || R.fx.length > FX_MAX - 12 || !(tkInView(u) || tkInView(t))) return; allyCastFx(u, t, atk); }
const tkIsP = u => u.kind === 'player' || u.kind === 'hero' || u.kind === 'ally' || u.kind === 'bot';
const tkLive = v => !(v.dead > 0) && !v.gone;
/* dem nguoi choi phe minh / phe dich trong ban kinh r quanh (x, y) */
function tkCount(K, side, x, y, r) {
  let f = 0, e = 0; const r2 = r * r;
  for (const v of K.u) if (tkIsP(v) && tkLive(v) && (v.x - x) ** 2 + (v.y - y) ** 2 < r2) { if (v.side === side) f++; else e++; }
  return [f, e];
}
/* moi giay: moi phe chon 1 muc tieu don hoa luc (nguoi phe dich it mau nhat dang bi >= 2 nguoi phe minh nhin thay) */
function tkTactics(K) {
  K.focus = [null, null];
  for (const s of K.activity ? [] : [0, 1]) {
    let best = null, bs = 2;
    for (const v of K.u) {
      if (v.side === s || !tkIsP(v) || !tkLive(v)) continue;
      const [f] = tkCount(K, s, v.x, v.y, 350); if (f < 2) continue;
      const r = v.hp / v.max; if (r < bs) { bs = r; best = v; }
    }
    K.focus[s] = best;
  }
}
const tkRank = p => { let r = TK_RANKS[0]; for (const x of TK_RANKS) if (p >= x[0]) r = x; return r; };
function tkData() { S.tk = S.tk || {}; const T = S.tk; T.pts = T.pts || 0; T.hist = T.hist || []; if (!T.next) T.next = Date.now() + TK_EVERY * 1000; return T; }
const tkPotTier = () => { let t = 1; for (const p of J.potions) if (S.lvl >= (POT_TIER_LV[p.tier] || 999)) t = Math.max(t, p.tier); return t; };

/* ---------- lich tran ---------- */
const TKS = { warned: 0, opened: 0, t: 0 };
function tkSchedule(dt) {
  if(window.SHARED_WORLD)return;
  if (!S.created || R.tk) return;
  if ((TKS.t += dt) < 1) return; TKS.t = 0;
  const T = tkData(), now = Date.now();
  if (now > T.next + TK_OPEN * 1000) { T.next += Math.ceil((now - T.next) / (TK_EVERY * 1000)) * TK_EVERY * 1000; TKS.warned = TKS.opened = 0; return; }
  if (now >= T.next - TK_WARN * 1000 && TKS.warned !== T.next) { TKS.warned = T.next; if (typeof notify === 'function') notify('Tống Kim sắp mở sau <b>2 phút</b>. Bấm để báo danh.', { news: true, icon: '⚔️', key: 'tk', t: 9000, click: tkJoinModal }); }
  if (now >= T.next && TKS.opened !== T.next) {
    TKS.opened = T.next;
    if (T.auto && !R.town && !R.tower && !R.duel && !(typeof SV !== 'undefined' && SV.on)) { tkStart(Math.random() < 0.5 ? 0 : 1, true); return; }
    if (typeof notify === 'function') notify('<b>Tống Kim đã mở!</b> Báo danh trong 5 phút. Bấm để vào trận.', { news: true, icon: '🚩', key: 'tk', t: 15000, click: tkJoinModal });
  }
}
function tkMinsToNext() { const s = Math.round((tkData().next - Date.now()) / 1000); return s; }
function tkCardHTML() {
  if(window.SHARED_WORLD)return `<div class="card tkcard"><b>⚔ Tống Kim · Người thật10v10</b><small class="dim">Tống ${RealTK.data?.counts?.[0]||0}/10 · Kim ${RealTK.data?.counts?.[1]||0}/10 ·8phút</small><div class="row"><button class="btn sm" id="tkJoin">Báo danh</button><button class="btn sm" id="tkShop">Đổi thưởng</button></div></div>`;
  const T = tkData(), s = tkMinsToNext(), open = s <= 0 && s > -TK_OPEN;
  return `<div class="card tkcard"><div><b>⚔ Tống Kim</b> <small class="dim">· điểm: <b class="tkp">${fmt(T.pts)}</b> · ${T.n || 0} trận, thắng ${T.win || 0}</small><br>
    <small class="dim">${open ? '<b style="color:#7fe07f">Đang mở báo danh!</b>' : `Trận sau: ${Math.floor(Math.max(0, s) / 60)} phút ${Math.max(0, s) % 60} giây`}</small></div>
    <div class="row"><button class="btn sm" id="tkJoin">Báo danh</button><button class="btn sm" id="tkShop">Cửa hàng</button><label class="stgauto"><input type="checkbox" id="tkAuto" ${T.auto ? 'checked' : ''}> Tự vào trận</label></div></div>`;
}
function tkBind() {
  const j = $('#tkJoin'), s = $('#tkShop'), a = $('#tkAuto');
  if (j) j.onclick = tkJoinModal; if (s) s.onclick = tkShopModal;
  if (a) a.onchange = e => { tkData().auto = e.target.checked; save(); };
}
const TkScroll={pending:null};
function tkScrollOpen(){
 if(!(S.ktc?.bag?.tkScroll>0))return false;
 if(R.tk||R.tower||R.duel||(typeof SV !== 'undefined' && SV.on)||R.deadT>0||(typeof stgRunActive==='function'&&stgRunActive())){toast('Hãy kết thúc hoạt động hoặc hồi sinh trước khi dùng Chiêu thư');return false;}
 if(typeof nsCanTravel==='function'&&!nsCanTravel())return false;
 modal(`<section class="town-service-panel"><h3>Tống Kim Chiêu thư</h3><p>Chọn phe để gia nhập chiến trường. Chỉ tiêu hao một thư khi gia nhập thành công.</p><div class="btnrow"><button class="btn" data-tk-scroll="0">Phe Tống</button><button class="btn" data-tk-scroll="1">Phe Kim</button><button class="btn" id="tkScrollCancel">Để sau</button></div></section>`,()=>{
  document.querySelectorAll('[data-tk-scroll]').forEach(b=>b.onclick=()=>{if(TkScroll.pending||RealTK.joining)return;TkScroll.pending={state:S,slot:typeof SLOT==='undefined'?null:SLOT};tkStart(+b.dataset.tkScroll);});
  $('#tkScrollCancel').onclick=()=>{if(RealTK.joining){toast('Đang chờ xác nhận báo danh');return;}TkScroll.pending=null;closeModal();};
 });return true;
}
function tkScrollAccepted(){
 const p=TkScroll.pending;TkScroll.pending=null;
 if(!p||p.state!==S||p.slot!==(typeof SLOT==='undefined'?null:SLOT)||!(S.ktc?.bag?.tkScroll>0))return;
 S.ktc.bag.tkScroll--;invDirty=true;saveNow();toast('Đã dùng 1 Tống Kim Chiêu thư · Gia nhập thành công');
}
function tkJoinModal() {
  TkScroll.pending=null;
  if(window.SHARED_WORLD)return realTkLobby();
  if (R.tk) return;
  if (R.tower || R.duel || (typeof SV !== 'undefined' && SV.on) || (typeof stgRunActive==='function'&&stgRunActive())) { toast('Hãy kết thúc hoạt động hiện tại trước khi báo danh Tống Kim'); return; }
  const aff = typeof getWeeklyAffixInfo === 'function' ? getWeeklyAffixInfo() : null;
  modal(`<h3>🚩 Báo danh Tống Kim</h3>
    <p class="desc">Hiện là trận riêng cùng bot, chưa ghép trận với người chơi online. Tham gia ít nhất 1 phút mới có thưởng khi rời sớm; hoàn tất 8 phút mới tính nhiệm vụ và thưởng Xu.</p>
    ${aff ? `<div style="background:#1e1a12;border:1px solid #7c6126;border-radius:4px;padding:6px 10px;margin:6px 0 10px 0;font-size:12px;line-height:1.4;">
      <span style="color:#ffd24a;font-weight:bold;">⚔ Biến thể tuần:</span> <b style="color:#ffb84a;">${esc(aff.n)}</b> — <span style="color:#ddd;">${esc(aff.desc)}</span>
    </div>` : ''}
    <p class="desc">Trận 8 phút trên chiến trường Tống Kim. Mỗi phe ${TK_SIDE_N} người (bạn, đồng môn và nhân sĩ giang hồ cùng tầm cấp) cùng lính và chủ tướng giữ hậu doanh.
    Hạ người phe địch +15 điểm, hạ lính +3, hạ chủ tướng +60, liên trảm 3/5/10 thêm điểm. Chết thì 5 giây sau hồi sinh ở hậu doanh. Điểm càng cao quân hàm càng lớn, thưởng càng nhiều; phe thắng thưởng thêm.</p>
    <div class="tkpick"><button class="btn" data-tks="0" style="color:${TK_SIDES[0].col}">🛡 Phe Tống</button><button class="btn" data-tks="1" style="color:${TK_SIDES[1].col}">🏹 Phe Kim</button><button class="btn" data-tks="r">🎲 Ngẫu nhiên</button></div>
    <div class="btnrow"><button class="btn" id="tkNo">Để sau</button></div>`, () => {
    document.querySelectorAll('[data-tks]').forEach(b => b.onclick = () => tkStart(b.dataset.tks === 'r' ? (Math.random() < 0.5 ? 0 : 1) : +b.dataset.tks));
    $('#tkNo').onclick = () => closeModal();
  });
}

/* ---------- don vi ---------- */
const tkRef = L => duelRef(L) || { hit: 6 + L * 4 };
const tkSt = () => ({ dmg: 0, taken: 0, dodge: 0, pot: 0, ult: 0, kc: 0, npc: 0, gen: 0, ast: 0, ptsP: 0, ptsN: 0, ptsS: 0, crit: 0, maxHit: 0 });   // thanh tich trong tran
function tkUnit(o) {
  return Object.assign({ st: tkSt(), hp: 1, max: 1, act: 'st', actT: 0, dir: 0, moving: false, tgt: null, cd: rnd(0, 1), dead: 0, kills: 0, deaths: 0, pts: 0, streak: 0, best: 0, quiet: 9, look: 0, kc: rnd(1, 6), z: 0, jump: null, pot: TK_POTS, potCd: 0, ult: rnd(2, 8), flee: false, backT: 0, backTo: null }, o);
}
function tkFighter(state, name) {     // nguoi choi / dong mon: chi so PK that
  try { const F = duelFighter(state, 'real', name, true), a = F.acts[0]; return { max: F.hpMax * TK_HP_K, hit: a ? duelAvgHit(F.P, a) : tkRef(state.lvl).hit }; }
  catch (e) { const r = tkRef(state.lvl); return { max: DUEL_HITS * r.hit * TK_HP_K, hit: r.hit }; }
}
function tkBase(side) { const b = TK_SIDES[side].base, p = window.JMO?.tk?.spawn?.[side] || [WORLD.w * b[0], WORLD.h * b[1]]; return OBS.g ? obsSnap(p[0], p[1]) : p.slice(); }
function tkAt(side, r) { const b = R.tk.base[side], a = rnd(0, Math.PI * 2), d = rnd(0, r); const p = inWorld(b[0] + Math.cos(a) * d, b[1] + Math.sin(a) * d * 0.8); return OBS.g ? obsSnap(p[0], p[1]) : p; }
function tkPlayers(side, hero) {
  if (window.SHARED_WORLD) { return []; }
  const L = S.lvl, out = [], used = new Set([S.name]);
  if (hero) {
    const f = tkFighter(S, S.name); out.push(tkUnit({ side, kind: 'hero', name: S.name || 'Bạn', fac: S.fac, sex: S.sex, eq: S.eq, L, max: f.max, hp: f.max, hit: f.hit, per: 0.9, range: ALLY_RANGED[S.fac] ? 170 : 60, spd: 150 * ((R.P && R.P.speed) || 1) }));
    for (const o of R.allies || []) {
      if (!o.bs || out.length >= TK_SIDE_N) break; if (typeof allyIsWb === 'function' && allyIsWb(o)) continue;   // 08/10: bot giang ho trong to doi khong theo vao Tong Kim
      const g = tkFighter(o.bs, o.d.name); used.add(o.d.name);
      out.push(tkUnit({ side, kind: 'ally', name: o.d.name, fac: o.d.fac, sex: o.d.sex, eq: o.bs.eq, L: o.bs.lvl, max: g.max, hp: g.max, hit: g.hit, per: rnd(0.95, 1.2), range: ALLY_RANGED[o.d.fac] ? 160 : 55, spd: 140 }));
    }
  }
  const pool = (S.wb ? S.wb.b : []).filter(r => !used.has(r[1]) && !R.tk.used.has(r[1])).sort((a, b) => Math.abs(a[4] - L) - Math.abs(b[4] - L));
  for (const r of pool) {
    if (out.length >= TK_SIDE_N) break; if (Math.abs(r[4] - L) > 12 && out.length >= 10) break;
    R.tk.used.add(r[1]); const lv = clamp(r[4], Math.max(1, L - 12), L + 12), ref = tkRef(lv), q = r[7] / 100;
    out.push(tkUnit({ side, kind: 'bot', name: r[1], fac: r[2], sex: r[3], eq: r.eq, L: lv, max: DUEL_HITS * ref.hit * q * TK_HP_K, hp: DUEL_HITS * ref.hit * q * TK_HP_K, hit: ref.hit * q, per: rnd(0.95, 1.25), range: ALLY_RANGED[r[2]] ? 160 : 55, spd: 140 }));
  }
  while (out.length < TK_SIDE_N) {                                    // thieu nhan si cung tam cap: tan binh tu do
    const fac = aPick(wbFacs()), sex = ALLY_FEMALE[fac] ? 1 : 0, n = wbMakeName(sex, R.tk.used); R.tk.used.add(n);
    const lv = Math.max(1, L + irnd(-8, 8)), ref = tkRef(lv), q = rnd(0.75, 1.15);
    out.push(tkUnit({ side, kind: 'bot', name: n, fac, sex, L: lv, max: DUEL_HITS * ref.hit * q * TK_HP_K, hp: DUEL_HITS * ref.hit * q * TK_HP_K, hit: ref.hit * q, per: rnd(0.95, 1.25), range: ALLY_RANGED[fac] ? 160 : 55, spd: 140 }));
  }
  return out;
}
/* Quan NPC (giong JX): khong tu tien quan nua ma dong giu vi tri (home), duoi dich trong tam canh gioi roi quay ve.
   npc = linh tram duong, guard = ve binh, gen = chu tuong (truoc hau doanh), boss = nguyen soai (trong hau doanh) */
const TK_NPC = {
  npc:   { hp: 0.45, hit: 0.35, per: 1.4, range: 50, spd: 85, aggro: 220, leash: 330, pts: 3,   sc: 0.85 },
  guard: { hp: 0.8,  hit: 0.5,  per: 1.3, range: 55, spd: 85, aggro: 200, leash: 260, pts: 5,   sc: 0.95 },
  gen:   { hp: 4,    hit: 1.1,  per: 1.2, range: 75, spd: 60, aggro: 240, leash: 200, pts: 60,  sc: 1.1, respawn: 60 },
  boss:  { hp: 7,    hit: 1.4,  per: 1.2, range: 80, spd: 50, aggro: 230, leash: 160, pts: 150, sc: 1.3, respawn: 90 },
};
const TK_POSTS = [0.16, 0.29, 0.42, 0.58, 0.71, 0.84], TK_POST_N = 3, TK_POST_RESP = 14;   // vi tri tram tren duong tu hau doanh Tong (0) toi Kim (1)
function tkNpc(side, kind, at, post) {
  const T = TK_SIDES[side], C = TK_NPC[kind], ref = tkRef(S.lvl), max = DUEL_HITS * ref.hit * TK_HP_K * C.hp;
  const name = kind === 'npc' ? T.solN : kind === 'guard' ? T.grdN : kind === 'gen' ? T.genN : T.bossN, anim = kind === 'gen' ? T.gen : kind === 'boss' ? T.boss : kind === 'guard' ? T.grd : T.sol;
  return tkUnit({ side, kind, name, anim, L: S.lvl, max, hp: max, hit: ref.hit * C.hit, per: C.per, range: C.range, spd: C.spd, aggro: C.aggro, leash: C.leash, sc: kind === 'boss' ? T.bossSc : C.sc, x: at[0], y: at[1], home: at.slice(), post: post || null });
}
const tkSnap = (x, y) => { const p = inWorld(x, y); return OBS.g ? obsSnap(p[0], p[1]) : p; };
function tkPathPt(f, off) {             // diem tren duong noi 2 hau doanh (f: 0 = Tong, 1 = Kim), lech ngang off
  const a = R.tk.base[0], b = R.tk.base[1], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
  return tkSnap(a[0] + dx * f - dy / L * off, a[1] + dy * f + dx / L * off);
}
function tkSetupNpc(K) {
  const out = [];
  for (const s of K.activity ? [] : [0, 1]) {
    const b = K.base[s];
    out.push(tkNpc(s, 'boss', b));
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.6; out.push(tkNpc(s, 'guard', tkSnap(b[0] + Math.cos(a) * 75, b[1] + Math.sin(a) * 55))); }
    const g = tkPathPt(s ? 0.92 : 0.08, 0); out.push(tkNpc(s, 'gen', g));
    for (const a of [-0.8, 0.8]) out.push(tkNpc(s, 'guard', tkSnap(g[0] + Math.cos(a) * 60, g[1] + Math.sin(a) * 45)));
  }
  K.posts = TK_POSTS.map((f, k) => ({ side: f < 0.5 ? 0 : 1, at: tkPathPt(f, (k % 2 ? 1 : -1) * rnd(20, 90)), t: 0 }));
  for (const P of K.posts) for (let i = 0; i < TK_POST_N; i++) out.push(tkNpc(P.side, 'npc', tkSnap(P.at[0] + rnd(-45, 45), P.at[1] + rnd(-30, 30)), P));
  return out;
}

/* ---------- bien the tuan & vao / ra tran ---------- */
function tkApplyAffix(u, K) {
  if (!u || u.affixApplied || !K || !K.affix) return u;
  if (u.kind === 'hero' || u.kind === 'ally') return u;
  u.affixApplied = true;
  u.affix = K.affix;
  if (K.affix === 'cuongbao') {
    u.hit *= 1.30;
    u.max *= 0.80;
    u.hp = u.max;
  } else if (K.affix === 'hethinh') {
    if (K.weekSeries !== undefined) u.series = K.weekSeries;
  }
  return u;
}

function tkStart(side, auto) {
  if(typeof stgRunActive==='function'&&stgRunActive())return;
  if(window.SHARED_WORLD)return realTkJoin(side);
  if ((side !== 0 && side !== 1) || R.tk || R.tower || R.duel || (typeof SV !== 'undefined' && SV.on) || R.deadT > 0) return; closeModal(true);
  const T = tkData();
  const aff = typeof getWeeklyAffixInfo === 'function' ? getWeeklyAffixInfo() : { id: 'giapday', n: 'Giáp Dày', desc: '', series: 0 };
  R.tk = { side, t: 0, used: new Set(), u: [], feed: [], spawnT: 3, hudT: 0, keep: { town:!!R.town,x: H.x, y: H.y, ground: R.ground, en: R.enemies }, done: false, affix: aff.id, affixInfo: aff, weekSeries: aff.series };
  tkScrollAccepted();R.town=false;document.getElementById('townBar')?.classList.add('hidden');
  R.ground = []; R.enemies = []; R.corpses = []; R.pickTarget = null; R.moveTo = null;
  obsLoad('tk'); R.bgImg = img('img/z/tk.jpg');
  R.tk.base = [tkBase(0), tkBase(1)];
  const mine = tkPlayers(side, true), theirs = tkPlayers(1 - side, false);
  for (const u of mine.concat(theirs)) { const p = tkAt(u.side, 160); u.x = p[0]; u.y = p[1]; }
  R.tk.u = mine.concat(theirs, tkSetupNpc(R.tk));
  for (const u of R.tk.u) tkApplyAffix(u, R.tk);
  R.tk.hero = R.tk.u[0]; if (S.chal === 'nopot') R.tk.hero.pot = 0; [H.x, H.y] = [R.tk.hero.x, R.tk.hero.y]; snapCamera();
  R.life = R.P.life; R.deadT = 0; R.buffs = []; R.stamina=R.P.staminaMax; R.freezeT=0;
  document.body.classList.add('tking'); tkHud(); if (typeof refresh === 'function') refresh();
  if (typeof tkFocusSet === 'function') tkFocusSet(typeof touchControlLayout === 'function' && touchControlLayout());
  if (typeof phoneBattleLayout === 'function' && phoneBattleLayout()) { phoneChatSet(false); phonePanelSet(false); }
  document.querySelectorAll('.ntc[data-key="tk"]').forEach(n => n.remove());          // da vao tran: bo thong bao bao danh
  R.banner = { t: 3, text: '🚩 Chiến trường Tống Kim', sub: `Phe ${TK_SIDES[side].n} · Biến thể: ${aff.n}` };
  log(`🚩 ${auto ? 'Tự vào' : 'Vào'} chiến trường Tống Kim, phe <b style="color:${TK_SIDES[side].col}">${TK_SIDES[side].n}</b> (Biến thể: <b>${esc(aff.n)}</b>).`);
  if (T.next - Date.now() < TK_OPEN * 1000) TKS.opened = T.next;     // dang mo bao danh: khong bao lai
}
function tkLeave() {
  const K = R.tk.keep; R.tk = null; R.freezeT=0; R.stamina=R.P.staminaMax; document.body.classList.remove('tking');
  const h = document.getElementById('tkHud'); if (h) h.remove();
  document.body.classList.remove('tk-focus'); const focus = document.getElementById('tkFocusToggle'); if (focus) focus.remove();
  H.z = 0; R.ground = K.ground || []; R.enemies = []; R.deadT = 0; R.life = R.P.life;
  H.jump=null;H._pp=null;H._pk=null;H._pi=0;H._pr=0;INPUT.target=null;R.moveTo=null;R.pickTarget=null;
  if(K.ctrl)setCtrl(K.ctrl,true);
  const z = zoneOf(Math.min(S.stage, STAGES)); R.town=!!K.town;R.zoneShown=null;
  if(R.town){obsLoad('town');[H.x,H.y]=inWorld(K.x,K.y);R.bgImg=img(W.town.bg);document.getElementById('townBar')?.classList.remove('hidden');playMusic(W.town.id);snapCamera();}
  else{[H.x,H.y]=[K.x,K.y];onZoneChange(z);S.wave=1;R.spawnT=.5;}
  if (typeof refresh === 'function') refresh();
}
function tkSideScore(s, K = R.tk) { if(K.real)return K.scores[s]||0;return K.u.reduce((t, u) => t + (u.side === s ? u.pts : 0), 0); }
function tkEnd(quit) {
  if(R.tk?.real){realTkLeave();return;}
  const K = R.tk; if (!K || K.done) return; K.done = true;
  const T = tkData(), me = K.hero, sc = [tkSideScore(0), tkSideScore(1)], win = !quit && sc[K.side] > sc[1 - K.side];
  const players = K.u.filter(u => u.kind === 'hero' || u.kind === 'ally' || u.kind === 'bot').sort((a, b) => b.pts - a.pts), place = players.indexOf(me) + 1, rk = tkRank(me.pts);
  const elapsed = clamp(Number(K.t) || 0, 0, TK_DUR), eligible = elapsed >= 60, completed = elapsed >= TK_DUR && !quit;
  const half = eligible ? (quit ? 0.5 : completed ? 1 : 0) : 0, gain = Math.round((20 * elapsed / TK_DUR + me.pts * 0.35) * (win ? 1.5 : 1) * half);
  if (completed) T.n = (T.n || 0) + 1; if (win && completed) T.win = (T.win || 0) + 1;
  const idleKills = Math.min(400, Math.max(0, S.kps || 0.3) * elapsed * 0.6);
  const rewardXp=expFor(S.lvl) * (idleKills + me.pts * 0.3) * (win ? 1.3 : 1) * half;
  const g = { gold: Math.round((120 * elapsed / TK_DUR + me.pts * 2) * half),xp:rewardXp,tkPoints:gain };
  if (completed) { if (place === 1) g.set = 1; else if (place <= 3) g.item = 4; else if (place <= 10) g.item = 3; if (rk[1] === 'daisoai') g.fd = 10; }
  if (completed) questTick('tk');
  T.hist.push({ t: Date.now(), side: K.side, win, pts: me.pts, rank: rk[2], k: me.kills, d: me.deaths, a: me.st.ast, dmg: Math.round(me.st.dmg), best: me.best, place });
  T.best = Math.max(T.best || 0, me.pts); T.kills = (T.kills || 0) + me.kills; T.hist = T.hist.slice(-10);
  tkLeave();
  if(completed && typeof ktcAward==='function')ktcAward('Tống Kim',10,20);
  const got = grant(g, 'Tống Kim');
  tkResultModal(K, { quit, win, sc, place, players, rk, gain, got, xpK: Math.round((idleKills + me.pts * 0.3) * (win ? 1.3 : 1) * half) });
  save();
}

/* ---------- nhip tran ---------- */
function tkKill(k, v) {
  const K = R.tk, p0 = k.pts; v.deaths++;
  if (v.hitBy) { for (const [a, t] of v.hitBy) if (a !== k && a.side !== v.side && K.t - t < 8) a.st.ast++; v.hitBy.clear(); }   // ho tro ha: danh trung trong 8 giay truoc khi chet
  if (v.kind === 'npc' || v.kind === 'guard') { k.pts += TK_NPC[v.kind].pts; k.st.ptsN += TK_NPC[v.kind].pts; k.st.npc++; v.gone = true; }
  else if (v.kind === 'gen' || v.kind === 'boss') { const C = TK_NPC[v.kind]; k.pts += C.pts; k.st.ptsN += C.pts; k.st.gen++; v.dead = C.respawn; tkFeed(`<b style="color:${TK_SIDES[k.side].col}">${esc(k.name)}</b> hạ <b>${esc(v.name)}</b>! (+${C.pts})`); if (typeof notify === 'function') notify(`<b style="color:${TK_SIDES[k.side].col}">${esc(k.name)}</b> hạ <b>${esc(v.name)}</b>!`, { icon: v.kind === 'boss' ? '👑' : '⚔️', key: 'tkgen', t: 4000 }); }
  else {
    k.pts += 15 + (v.streak >= 3 ? 5 : 0); k.st.ptsP += 15 + (v.streak >= 3 ? 5 : 0); v.dead = TK_RESPAWN; v.streak = 0;
    if (tkIsP(k)) { k.kills++; k.streak++; k.best = Math.max(k.best, k.streak); const b = TK_STREAK[k.streak]; if (b) { k.pts += b; k.st.ptsS += b; tkFeed(`<b style="color:${TK_SIDES[k.side].col}">${esc(k.name)}</b> liên trảm ${k.streak}! (+${b})`); if (k === K.hero && typeof notify === 'function') notify(`Liên trảm <b>${k.streak}</b>! +${b} điểm`, { icon: '🔥', key: 'tkst', t: 2500 }); } }
    if (k === K.hero || v === K.hero) tkFeed(`<b style="color:${TK_SIDES[k.side].col}">${esc(k.name)}</b> ⚔ <b style="color:${TK_SIDES[v.side].col}">${esc(v.name)}</b>`);
  }
  if (v === K.hero) {
    if (typeof sysRewardFlush === 'function') sysRewardFlush();
    log(`<span class="bad">Bạn đã bị trọng thương bởi ${esc(k.name)}. Hồi sinh tại hậu doanh.</span>`);
    R.deadT = TK_RESPAWN; setAct(H, 'die');
    if (typeof tbShow === 'function') tbShow({ title: 'Bạn đã bị trọng thương!', tone: 'lose', sec: Math.ceil(TK_RESPAWN),   // 08/10: thong bao kieu JX1
      html: `<p>Bị <b style="color:${TK_SIDES[k.side].col}">${esc(k.name)}</b> đánh trọng thương.</p><p class="dim">Hồi sinh tại hậu doanh sau ${Math.ceil(TK_RESPAWN)} giây.</p>`, btns: [{ t: 'Đóng', main: true }] });
  }
  if (k.kind === 'hero' || k.kind === 'ally' || k.kind === 'bot') { const r = tkRank(k.pts); if (r !== tkRank(p0) && k === K.hero && typeof notify === 'function') notify(`Thăng quân hàm: <b>${r[2]}</b>`, { icon: '🎖️', key: 'tkrk', t: 3500 }); }
}
function tkFeed(h) { const F = R.tk.feed; F.push(h); while (F.length > 8) F.shift(); R.tk.hudSig = ''; }
function tkTick(dt) {
  if(R.tk?.real)return realTkTick(dt);
  const K = R.tk; if (K.done) return;
  if (R.quiet) return;                                                 // mo phong bu (tab an / cua so bi che): TAM DUNG tran, quay lai danh tiep (truoc day ket thuc tran)
  K.t += dt; if (K.t >= TK_DUR) { tkEnd(false); return; }
  for (const P of K.posts) {                                           // tram dong quan: thieu linh thi 14 giay bo sung 1
    if ((P.t -= dt) > 0) continue; P.t = TK_POST_RESP;
    if (K.u.filter(u => u.post === P && !u.gone).length < TK_POST_N) {
      const nu = tkNpc(P.side, 'npc', tkSnap(P.at[0] + rnd(-45, 45), P.at[1] + rnd(-30, 30)), P);
      tkApplyAffix(nu, K);
      K.u.push(nu);
    }
  }
  K.u = K.u.filter(u => !u.gone || u.actT < 1.6);
  const hero = K.hero; hero.x = H.x; hero.y = H.y;
  if ((K.tacT = (K.tacT || 0) - dt) <= 0) { K.tacT = 1; tkTactics(K); }   // chien thuat phe: muc tieu don hoa luc
  if (K.affix === 'hoihuyet') {
    for (const u of K.u) {
      if (u.kind !== 'hero' && u.kind !== 'ally' && u.hp > 0 && !(u.dead > 0) && !u.gone) {
        u.hp = Math.min(u.max, u.hp + u.max * 0.012 * dt);
      }
    }
  }
  for (const u of K.u) {
    if (u.gone) { u.actT += dt; continue; }
    if (u.dead > 0) {
      if ((u.dead -= dt) <= 0) {
        u.dead = 0; u.hp = u.max; u.pot = TK_POTS; u.flee = false; u.jump = null; u.z = 0;
        const p = u.home ? u.home : tkAt(u.side, 140); u.x = p[0]; u.y = p[1]; u.tgt = null;
        if (u === hero) { [H.x, H.y] = p; R.deadT = 0; setAct(H, 'st'); snapCamera(); }
      }
      continue;
    }
    u.quiet += dt; if (u.quiet > 4) u.hp = Math.min(u.max, u.hp + u.max * 0.03 * dt);
    kcTick(u, dt); if (u.potCd > 0) u.potCd -= dt; if (u.ult > 0) u.ult -= dt; if (u.cd > 0) u.cd -= dt;
    if (kcBusy(u, dt)) { if (u === hero) { H.x = u.x; H.y = u.y; } continue; }
    const man = u === hero && manual();
    if (man) { moveManual(dt); u.x = H.x; u.y = H.y; }
    if (tkIsP(u)) tkBrain(u, K, dt, man); else tkSimple(u, K, dt);
    if (u === hero) { H.x = u.x; H.y = u.y; }
  }
  if (!hero.dead) { hero.x = H.x; hero.y = H.y; }
  H.z = hero.z || 0;
  R.life = R.P.life * clamp(hero.hp / hero.max, 0, 1);
  if ((K.hudT -= dt) <= 0) { K.hudT = 0.25; tkHudUpdate(); }
}
/* chon muc tieu: linh / chu tuong lay con gan nhat; nguoi choi va bot cham diem: gan + it mau (dung don ket lieu) + uu tien nguoi phe dich, giu muc tieu cu */
function tkLook(u, K) {
  const smart = tkIsP(u), h = u.home, R2 = smart ? 430 ** 2 : u.aggro ** 2; let b = null, bs = Infinity;
  for (const v of K.u) {
    if (v.side === u.side || v.dead > 0 || v.gone) continue;
    const d2 = (v.x - u.x) ** 2 + (v.y - u.y) ** 2; if (d2 > (smart ? R2 : 520 ** 2)) continue;
    if (!smart && h && (v.x - h[0]) ** 2 + (v.y - h[1]) ** 2 > R2) continue;          // quan giu vi tri: chi danh dich vao vung canh gioi
    let s = Math.sqrt(d2);
    if (smart) {
      s += (v.hp / v.max) * 160; if (tkIsP(v)) s -= 90; else s += ({ npc: 0, guard: 40, gen: 120, boss: 200 })[v.kind] || 0;
      if (v === u.tgt) s -= 40;
      if (K.focus && v === K.focus[u.side]) s -= 70;                                         // don hoa luc theo phe
      if (v.tgt && v.tgt.side === u.side && tkIsP(v.tgt) && v.tgt !== u && v.tgt.hp < v.tgt.max * 0.4 && Math.hypot(v.tgt.x - u.x, v.tgt.y - u.y) < 240) s -= 80;   // cuu dong doi dang nguy
      if ((v.kind === 'gen' || v.kind === 'boss') && tkCount(K, u.side, v.x, v.y, 300)[0] < 3) s += 400;   // it nguoi thi chua danh tuong
    }
    if (s < bs) { bs = s; b = v; }
  }
  u.tgt = b;
}
/* mot don: nguoi choi / bot co the ne (nghieng nguoi tranh, khong mat mau) */
function tkStrike(u, t, K, mult) {
  if (t.dead > 0 || t.gone) return;
  if (tkIsP(t) && Math.random() < TK_DODGE * (t.range > 100 ? 1.3 : 1)) {
    if (tkInView(t)) addText(t.x, t.y - 62, 'Né', '#9fe0ff', 11);
    t.st.dodge++; t.quiet = 0; return;
  }
  const crit = Math.random() < 0.1;
  let dmg = u.hit * mult * rnd(0.8, 1.2) * (crit ? 1.8 : 1);
  if (K && K.affix === 'giapday') {
    if (t.kind !== 'hero' && t.kind !== 'ally') {
      dmg *= 0.75;
    }
  }
  if (K && K.affix === 'hethinh') {
    const uSeries = u.series !== undefined ? u.series : (u.fac && FAC[u.fac] ? FAC[u.fac].series : -1);
    const tSeries = t.series !== undefined ? t.series : (t.fac && FAC[t.fac] ? FAC[t.fac].series : -1);
    if (counters(uSeries, tSeries)) {
      dmg *= 1.25;
    }
  }
  t.hp -= dmg; t.quiet = 0;
  u.st.dmg += dmg; t.st.taken += dmg; if (crit) u.st.crit++; if (dmg > u.st.maxHit) u.st.maxHit = dmg;
  if (tkIsP(u) && tkIsP(t)) (t.hitBy || (t.hitBy = new Map())).set(u, K.t);   // ghi ai da danh -> tinh ho tro ha
  if (t === K.hero || u === K.hero) addText(t.x, t.y - 60, dmgNum(dmg), t === K.hero ? '#ff6a5a' : '#ffe08a', crit ? 14 : 11, t === K.hero ? 'hurt' : (crit ? 'crit' : 'dmg'));
  if (t.hp <= 0) { t.hp = 0; if (t.kind === 'npc') { t.act = 'die'; t.actT = 0; } tkKill(u, t); if (u.tgt === t) u.tgt = null; }
}
function tkAnim(u, t, K, sk) {         // dong tac danh + hieu ung chieu that
  if (u === K.hero) { setAct(H, 'at'); H.dir = u.dir; } else setAct(u, 'at');
  if (sk) tkCastFx(u, t, typeof sk === 'object' ? sk : { id: sk, melee: u.range <= 60 });
}
/* linh + chu tuong: tim gan nhat, danh thuong; chu tuong khong roi hau doanh */
function tkSimple(u, K, dt) {
  const h = u.home, dh = Math.hypot(u.x - h[0], u.y - h[1]);
  if (dh > u.leash) { u.tgt = null; u.ret = true; }                     // duoi qua xa: bo dich, quay ve, hoi mau dan
  if (u.ret) {
    if (dh > 10) { u.moving = true; u.dir = dirOf(h[0] - u.x, h[1] - u.y); obsSteer(u, h[0], h[1], Math.max(u.spd, 70) * dt * 1.2); u.hp = Math.min(u.max, u.hp + u.max * 0.08 * dt); return; }
    u.ret = false;
  }
  if ((u.look -= dt) <= 0 || !u.tgt || u.tgt.dead > 0 || u.tgt.gone) { u.look = 0.5; tkLook(u, K); }
  const t = u.tgt;
  if (!t) { if (dh > 10) { u.moving = true; u.dir = dirOf(h[0] - u.x, h[1] - u.y); obsSteer(u, h[0], h[1], Math.max(u.spd, 50) * dt); } else u.moving = false; return; }
  const d = Math.hypot(t.x - u.x, t.y - u.y); u.dir = dirOf(t.x - u.x, t.y - u.y);
  if (d > u.range) { u.moving = true; obsSteer(u, t.x, t.y, u.spd * dt); return; }
  u.moving = false; if (u.cd > 0) return;
  u.cd = u.per; tkAnim(u, t, K, 0); tkStrike(u, t, K, 1);
}
/* nguoi choi / dong mon / bot: uong thuoc, rut lui, ne vay bang khinh cong, tha dieu (danh xa giu khoang cach), chieu lon co hoi chieu danh lan */
function tkBrain(u, K, dt, man) {
  const hero = K.hero;
  /* 08/10: tam danh cua NHAN VAT theo CHIEU DANG CHON (phim 1-4 / nut chieu doi R.P.main), khong theo phai.
     Truoc: range = ALLY_RANGED[phai] ? 170 : 60 -> phai can chien (Cai Bang...) chon chieu xa van phai ap sat. */
  if (u === hero && R.P && R.P.main) u.range = clamp((R.P.main.rad || 60) * 0.9, 60, 420);
  const step = u.spd * dt, base = K.base[u.side], ranged = u.range > 100;
  if (u.hp < u.max * 0.4 && u.pot > 0 && u.potCd <= 0) {
    u.pot--; u.potCd = 6; u.st.pot++; u.hp = Math.min(u.max, u.hp + u.max * 0.35);
    if (tkInView(u)) addText(u.x, u.y - 66, 'Uống thuốc', '#7fe07f', 10);
  }
  if (!u.flee && u.hp < u.max * 0.25 && u.pot <= 0) { u.flee = true; if (tkInView(u)) addText(u.x, u.y - 66, 'Rút lui', '#ffb84a', 10); }
  if (u.flee && u.hp > u.max * 0.7) u.flee = false;
  if (u.flee && !man && u !== hero) {                                                // het thuoc, mau thap: rut ve hau doanh hoi suc
    const d = Math.hypot(base[0] - u.x, base[1] - u.y);
    if (d > 90) { u.moving = true; u.dir = dirOf(base[0] - u.x, base[1] - u.y); if (!kcToward(u, base[0], base[1], 60)) obsSteer(u, base[0], base[1], step * 1.05); } else u.moving = false;
    return;
  }
  if ((u.look -= dt) <= 0 || !u.tgt || u.tgt.dead > 0 || u.tgt.gone) { u.look = 0.5; tkLook(u, K); }
  const t = u.tgt;
  if (!t) {                                                            // khong thay dich: tien ve hau doanh dich
    if (man) { u.moving = false; return; }
    if (Math.hypot(base[0] - u.x, base[1] - u.y) > 400 && tkCount(K, u.side, u.x, u.y, 260)[0] < 3) {   // le loi giua duong: tap hop voi nhom dong doi gan nhat
      let g = null, bd = Infinity;
      for (const v of K.u) if (v !== u && v.side === u.side && tkIsP(v) && tkLive(v)) { const dd = Math.hypot(v.x - u.x, v.y - u.y); if (dd > 120 && dd < bd && tkCount(K, u.side, v.x, v.y, 200)[0] >= 2) { bd = dd; g = v; } }
      if (g && bd < 900) { u.moving = true; u.dir = dirOf(g.x - u.x, g.y - u.y); obsSteer(u, g.x, g.y, step); return; }
    }
    const e = K.base[1 - u.side], d = Math.hypot(e[0] - u.x, e[1] - u.y);
    if (d > 120) { u.moving = true; u.dir = dirOf(e[0] - u.x, e[1] - u.y); obsSteer(u, e[0] + (u.L % 7 - 3) * 25, e[1], step * 0.85); } else u.moving = false;
    return;
  }
  const d = Math.hypot(t.x - u.x, t.y - u.y); u.dir = dirOf(t.x - u.x, t.y - u.y);
  let kiting = false;
  if (!man) {                                                           // 08/10: ca nhan vat o che do TU DONG cung dung chien thuat (truoc chi bot)
    if (u.backT > 0) {                                                 // dang lui ve phia dong doi
      u.backT -= dt; const p = u.backTo; u.moving = true; u.dir = dirOf(p[0] - u.x, p[1] - u.y); obsSteer(u, p[0], p[1], step);
      if (d <= u.range && u.cd <= 0 && ranged) { u.cd = u.per; tkAnim(u, t, K, u === hero && R.P ? R.P.main : (tkSkills(u.fac, u.L)[0] || 0)); tkStrike(u, t, K, 0.8); }   // danh xa: vua lui vua ban
      return;
    }
    const [fr, en] = tkCount(K, u.side, u.x, u.y, 250);
    /* 08/10: VUA TRUNG DON (quiet < 1.5 s) ma dich keo toi dong hon (>= phe minh + 2): tranh dam dong, TU HOP voi nhom dong doi dong nhat
       (chon diem co nhieu dong doi, it dich, nam xa tam dam dich), xa thi KHINH CONG toi, gan thi chay; tu du roi moi danh tiep.
       Truoc: chi bot, chi khi mau < 70%, lui ve dong doi GAN NHAT (co the cung dang bi vay). */
    if (en >= fr + 2 && (u.quiet < 1.5 || u.hp < u.max * 0.7)) {
      let ex = 0, ey = 0, ne = 0;
      for (const v of K.u) if (v.side !== u.side && !(v.dead > 0) && !v.gone && Math.hypot(v.x - u.x, v.y - u.y) < 250) { ex += v.x; ey += v.y; ne++; }
      if (ne) { ex /= ne; ey /= ne; } else { ex = t.x; ey = t.y; }
      let p = base, bs = -Infinity;
      for (const v of K.u) {
        if (v === u || v.side !== u.side || !tkIsP(v) || !tkLive(v)) continue;
        const dd = Math.hypot(v.x - u.x, v.y - u.y); if (dd < 120 || dd > 750) continue;
        const [f2, e2] = tkCount(K, u.side, v.x, v.y, 200);
        const sc = f2 * 3 - e2 * 4 + Math.hypot(v.x - ex, v.y - ey) / 120 - dd / 300;   // dong doi dong, it dich, xa dam dich, khong qua xa
        if (sc > bs) { bs = sc; p = [v.x, v.y]; }
      }
      const tag = u === hero ? '#bfe8ff' : '#ffb84a';
      if (kcToward(u, p[0], p[1], 70)) { if (tkInView(u)) addText(u.x, u.y - 66, 'Khinh công · tụ họp', tag, 10); if (u === hero) { H.x = u.x; H.y = u.y; } return; }
      u.backT = 1.4; u.backTo = p; if (tkInView(u)) addText(u.x, u.y - 66, 'Tụ họp', tag, 10);
      return;
    }
    let n = 0, cx = 0, cy = 0;
    for (const v of K.u) if (v.side !== u.side && !(v.dead > 0) && !v.gone && Math.hypot(v.x - u.x, v.y - u.y) < 85) { n++; cx += v.x; cy += v.y; }
    if (n >= 2 && u.hp < u.max * 0.55 && kcAway(u, cx / n, cy / n)) return;                 // bi vay khi mau thap: khinh cong thoat
    if (ranged && d < 80 && t.range <= 60) {                                                // danh xa bi ap sat: nhay khinh cong ra (co dong tac nhay)
      if (kcAway(u, t.x, t.y)) return;
      /* 08/10: bo "vua lui vua danh" (obsSteer nguoc huong dich): nhin nhu bi DAY (do 133 khung / 20 s).
         Cung luat che do thuong 06/10: bot danh xa khong lui giu khoang cach, dung yen danh. */
    }
  }
  if (d > u.range) {
    if (!man) { u.moving = true; obsSteer(u, t.x, t.y, step); }
    return;
  }
  if (!kiting) u.moving = false;
  if (u.cd > 0) return;
  if (man && !manAtkOk()) return;   // 08/10: tu dieu khien: chi danh khi bam / giu phim chieu
  u.cd = u.per;
  const sk = u === hero ? [] : tkSkills(u.fac, u.L), heroSk = u === hero && R.P ? R.P.main : null;
  const around = K.u.filter(v => v !== t && v.side === t.side && !(v.dead > 0) && !v.gone && Math.hypot(v.x - t.x, v.y - t.y) < 110);
  const finish = t.hp <= u.hit * 1.6 && t.hp > u.hit * 1.05;            // don thuong khong chet, tuyet chieu thi chet: ket lieu
  if (u.ult <= 0 && (around.length >= 2 || finish || (tkIsP(t) && t.hp > t.max * 0.5))) {   // tuyet chieu: hoi 8-12 giay, x1.6 + lan 60% sang toi da 3 dich; dung khi dich dung cum, de ket lieu, hoac mo man voi nguoi
    u.ult = rnd(8, 12); u.st.ult++; const id = heroSk ? heroSk.id : sk[0];
    tkAnim(u, t, K, heroSk || id);
    if (tkInView(u) && id && SK[id]) addText(u.x, u.y - 80, SK[id].n, '#ffd24a', 11);
    const evade = v => tkIsP(v) && v !== hero && (v.kc || 0) <= 0 && Math.random() < 0.35 && kcAway(v, u.x, u.y);   // thay tuyet chieu: khinh cong ne
    if (!evade(t)) tkStrike(u, t, K, 1.6); else if (t === hero) { H.x = t.x; H.y = t.y; }
    for (const v of around.slice(0, 3)) if (!evade(v)) tkStrike(u, v, K, 0.6);
    return;
  }
  tkAnim(u, t, K, heroSk || (sk.length ? (Math.random() < 0.6 ? sk[sk.length > 1 ? 1 : 0] : aPick(sk)) : 0));
  tkStrike(u, t, K, 1);
}

/* ---------- ve ---------- */
function drawTK(c, dt) {
  const K = R.tk; if (!K) return;
  if(typeof tkCampDraw==='function')tkCampDraw(c);
  for (const s of K.activity ? [] : [0, 1]) {                                            // hau doanh
    const b = K.base[s]; c.strokeStyle = TK_SIDES[s].col; c.lineWidth = 2; c.globalAlpha = 0.6;
    c.beginPath(); c.ellipse(b[0], b[1], 120, 46, 0, 0, 7); c.stroke(); c.globalAlpha = 1;
    label(b[0], b[1] + 58, `Hậu doanh ${TK_SIDES[s].n}`, TK_SIDES[s].col, 11);
  }
  const vx0 = CAM.x - 120, vx1 = CAM.x + AR.w + 120, vy0 = CAM.y - 160, vy1 = CAM.y + AR.h + 160;
  for (const u of K.u.slice().sort((a, b) => a.y - b.y)) {
    if (u === K.hero) continue;                                       // nhan vat chinh: ve o render.js (quan ham gan vao nhan ten)
    if (u.dead > 0 || u.x < vx0 || u.x > vx1 || u.y < vy0 || u.y > vy1) continue;
    const col = TK_SIDES[u.side].col;
    if (!tkIsP(u)) {
      if (!u.gone) stepAct(u, dt, u.moving ? 'run' : 'st'); else u.act = 'die';
      if (!u.gone && u.act !== 'at') setAct(u, u.moving ? 'run' : 'st');
      drawGroundShadow(c, u.x, u.y, 16, 6, .34);
      if (u.kind === 'boss') { c.strokeStyle = '#ffd24a'; c.lineWidth = 2; c.beginPath(); c.ellipse(u.x, u.y, 30, 11, 0, 0, 7); c.stroke(); }
      const big = u.kind === 'gen' || u.kind === 'boss', ah = drawAnim(u.anim, u.act || 'st', u.dir || 0, u.actT || 0, u.x, u.y, (u.sc || 0.85) * MON_SCALE, u.gone ? clamp(1.6 - u.actT, 0, 1) : 1);
      if (!u.gone) label(u.x, u.y - standH(u.anim, (u.sc || 0.85) * MON_SCALE, 40) - 6, u.name, u.kind === 'boss' ? NAME_COL.gold : col, big ? 12 : 9, u.hp / u.max, col);
      continue;
    }
    const hw = typeof nhBotFaction === 'function' ? nhBotFaction(u.fac, u.sex) : W.hero[u.fac]; stepAct(u, dt, u.moving ? 'run' : 'st'); if (u.act !== 'at') setAct(u, u.moving ? 'run' : 'st');
    drawGroundShadow(c, u.x, u.y, 14, 5, .3);
    c.strokeStyle = col; c.lineWidth = 1.5; c.beginPath(); c.ellipse(u.x, u.y, 14, 5, 0, 0, 7); c.stroke();
    if (u.jump && hw && hw.anim) for (const g of [0.3, 0.16]) {          // khinh cong: 2 bong mo phia sau
      const j = u.jump, p = Math.max(0, Math.min(1, j.t / j.dur) - g);
      drawAnim(hw.anim, 'run', u.dir || 0, u.actT || 0, j.x0 + (j.x1 - j.x0) * p, j.y0 + (j.y1 - j.y0) * p - Math.sin(Math.PI * p) * 38, HERO_SCALE * 0.95, 0.25);
    }
    const zz = u.z || 0, act = u.jump ? 'run' : u.act || 'st';
    const sts = u !== K.hero && typeof stForUnit === 'function' && !stLowFx() ? stForUnit(u.fac, u.L, null) : u === K.hero && typeof stHero === 'function' ? stHero() : null;   // 08/10: hao quang / buff tren nguoi
    if (sts) stDraw(sts, u.x, u.y - zz, u.x * 0.013, 'duoi');
    const composed = u.eq && typeof nhBotAllowed === 'function' && nhBotAllowed() && nhDrawFor(nhLookFor(u.eq, u.sex, false), act, u.dir || 0, u.actT || 0, u.x, u.y - zz, HERO_SCALE * 0.95);
    const drawn = composed || (hw && hw.anim && drawAnim(hw.anim, act, u.dir || 0, u.actT || 0, u.x, u.y - zz, HERO_SCALE * 0.95));
    if (sts) stDraw(sts, u.x, u.y - zz, u.x * 0.013, 'tren');
    if (!K.real&&typeof nhBotRecord === 'function') nhBotRecord(!!composed);
    const top = playerTop(u.y - zz, HERO_SCALE * 0.95);
    playerNameLabel(u.x, top, u.name, u.fac, u.L, u.hp / u.max, col, K.activity ? null : `img/tk/${tkRank(u.pts)[1]}.png`, u === K.hero ? 3 : 2);
  }
}
function tkFocusSet(hidden) {
  document.body.classList.toggle('tk-focus', !!hidden);
  const button = document.getElementById('tkFocusToggle');
  if (button) { button.textContent = hidden ? 'Hiện UI' : 'Ẩn UI'; button.setAttribute('aria-pressed', String(!!hidden)); }
  if (hidden && typeof touchControlLayout === 'function' && touchControlLayout()) { phoneChatSet(false); phonePanelSet(false); }
  requestAnimationFrame(() => { if (typeof resizeArena === 'function') resizeArena(); });
}
function tkHud() {
  const b = $('#battle'); if (!b || document.getElementById('tkHud')) return;
  const h = document.createElement('div'); h.id = 'tkHud'; h.ariaLabel = 'Tình trạng trận Tống Kim'; h.title = 'Tình trạng trận Tống Kim';
  h.onclick = ev => { const t = ev.target.closest('[data-tk]'); if (!t) return;
    if (t.dataset.tk === 'details') { h.classList.toggle('tk-expanded'); t.setAttribute('aria-expanded', String(h.classList.contains('tk-expanded'))); t.textContent = h.classList.contains('tk-expanded') ? '⌃' : '⌄'; }
    if(t.dataset.tk==='medic')tkCampGo();
    if (t.dataset.tk === 'board') tkBoardModal(); if (t.dataset.tk === 'quit') tkQuitModal(); };
  b.appendChild(h); R.tk.hudSig = ''; tkHudUpdate();
  const button = document.createElement('button'); button.id = 'tkFocusToggle'; button.type = 'button'; button.setAttribute('aria-label', 'Ẩn hoặc hiện giao diện chiến trường'); button.onclick = () => tkFocusSet(!document.body.classList.contains('tk-focus')); b.appendChild(button);
}
function tkHudUpdate() {
  if(R.tk?.activity){realActivityHud();return;}
  const K = R.tk, h = document.getElementById('tkHud'); if (!K || !h) return;
  const sc = [tkSideScore(0), tkSideScore(1)], left = Math.max(0, TK_DUR - K.t), me = K.hero, rk = tkRank(me.pts);
  const sig = sc.join(',') + Math.floor(left) + me.pts + K.feed.length + (K.feed[K.feed.length - 1] || '') + (me.dead > 0 ? Math.ceil(me.dead) : '');
  if (sig === K.hudSig) return; K.hudSig = sig;
  const tot = Math.max(1, sc[0] + sc[1]);
  const affBadge = K.affixInfo ? `<div class="tkaff" style="font-size:11px;color:#ffd24a;text-align:center;padding:1px 0;line-height:1.2;background:#0004;" title="${esc(K.affixInfo.desc)}">⚔ Biến thể: <b>${esc(K.affixInfo.n)}</b> <small style="color:#bbb;">(${esc(K.affixInfo.desc)})</small></div>` : '';
  const expanded = h.classList.contains('tk-expanded');
  h.innerHTML = `${K.real&&K.phase==='waiting'?`<div class="dim" style="text-align:center">Chờ ${K.counts[0]}/10 Tống · ${K.counts[1]}/10 Kim · ${K.start?'Bắt đầu sau '+Math.max(0,Math.ceil((K.start-K.now-(Date.now()-K.clockAt))/1000))+'giây':'Chờ đối thủ · Đi lại / mua thuốc'}</div>`:''}<div class="tk-hud-head"><div class="tkbar"><b style="color:${TK_SIDES[0].col}">Tống ${fmt(sc[0])}</b><span class="tk-clock">${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}</span><b style="color:${TK_SIDES[1].col}">${fmt(sc[1])} Kim</b></div><button type="button" class="tk-hud-toggle" data-tk="details" aria-label="Ẩn hoặc hiện chi tiết Tống Kim" aria-controls="tkHudDetails" aria-expanded="${expanded}">${expanded ? '⌃' : '⌄'}</button></div>
    <div id="tkHudDetails">
    ${affBadge}
    <div class="tkmeter"><i style="width:${(sc[0] / tot * 100).toFixed(1)}%;background:${TK_SIDES[0].col}"></i><i style="width:${(sc[1] / tot * 100).toFixed(1)}%;background:${TK_SIDES[1].col}"></i></div>
    <div class="tkme"><img src="img/tk/${rk[1]}.png" alt="${rk[2]}"> ${me.pts} điểm · ${tkKDA(me)}${me.streak >= 2 ? ` · 🔥 ${me.streak}` : ''}${me.dead > 0 ? ` · <b class="bad">hồi sinh ${Math.ceil(me.dead)}s</b>` : ''}<span class="tkbtn">${K.real&&!K.activity?'<button class="btn sm" data-tk="medic" title="Chạy tới quân y mua thuốc">Thuốc</button>':''}<button class="btn sm" data-tk="board" title="Bảng điểm">📋</button><button class="btn sm red" data-tk="quit" title="Rời trận">✕</button></span></div></div>`;
  if (typeof curTab !== 'undefined' && curTab === 'log') { const p = document.getElementById('tkPanel'); if (p) { const body = tkPanelBody(); if (p._sig !== body) { p._sig = body; p.innerHTML = body; } } }
}
/* Bang ben phai khi o chien truong: thay cho viec can lam / vuot ai / ban do luyen cong (khong lien quan khi dang o pho ban) */
function tkPanelHTML() { return `<div id="tkPanel">${tkPanelBody()}</div>`; }
function tkPanelBody() {
  if(R.tk?.activity)return realActivityPanel();
  const K = R.tk; if (!K) return '';
  const sc = [tkSideScore(0), tkSideScore(1)], tot = Math.max(1, sc[0] + sc[1]), left = Math.max(0, TK_DUR - K.t), me = K.hero, rk = tkRank(me.pts);
  const ri = TK_RANKS.indexOf(rk), nx = TK_RANKS[ri + 1], prog = nx ? (me.pts - rk[0]) / (nx[0] - rk[0]) : 1, my = TK_SIDES[K.side];
  const top = s => K.u.filter(u => u.side === s && tkIsP(u)).sort((a, b) => b.pts - a.pts).slice(0, 5)
    .map((u, i) => `<div class="tkp-row${u === me ? ' me' : ''}"><span>${['🥇', '🥈', '🥉', '4', '5'][i]}</span><img src="img/tk/${tkRank(u.pts)[1]}.png" alt=""><b style="color:${ALLY_COL[u.fac] || '#ddd'}">${esc(u.name)}</b><em>${fmt(u.pts)}</em></div>`).join('');
  const gens = s => ['gen', 'boss'].map(k => { const g = K.u.find(u => u.side === s && u.kind === k); return g ? `<span class="${g.dead > 0 ? 'down' : ''}">${k === 'boss' ? '👑' : '⚔'} ${g.dead > 0 ? 'đã ngã · ' + Math.ceil(g.dead) + 's' : Math.round(g.hp / g.max * 100) + '%'}</span>` : ''; }).join('');
  const affBar = K.affixInfo ? `<div style="font-size:11px;color:#ffd24a;padding:3px 8px;background:#1a1508;border-bottom:1px solid #332a10;">⚔ Biến thể: <b>${esc(K.affixInfo.n)}</b> <span style="color:#aaa;">— ${esc(K.affixInfo.desc)}</span></div>` : '';
  return `<div class="tkp-ban"><div class="tkp-ban-in"><div class="tkp-title">Chiến trường Tống Kim</div><div class="tkp-time">${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}</div></div></div>
    ${affBar}
    <div class="tkfr tkp-sc"><div class="tkp-score"><b class="s0">TỐNG<em>${fmt(sc[0])}</em></b><span>⚔</span><b class="s1"><em>${fmt(sc[1])}</em>KIM</b></div>
      <div class="tkmeter2"><i class="m0" style="width:${(sc[0] / tot * 100).toFixed(1)}%"></i><i class="m1" style="width:${(sc[1] / tot * 100).toFixed(1)}%"></i></div>
      <div class="tkp-gens"><span style="color:${TK_SIDES[0].col}">Tống</span>${gens(0)}<span style="color:${TK_SIDES[1].col}">Kim</span>${gens(1)}</div></div>
    <div class="tkfr tkp-me"><div class="tkp-h">Thành tích bản thân</div>
      <div class="tkp-rk"><img src="img/tk/${rk[1]}.png" alt="${rk[2]}"><div><b>${fmt(me.pts)} <small>điểm</small></b><small>${esc(S.name || '')} · phe <span style="color:${my.col}">${my.n}</span>${me.dead > 0 ? ` · <span class="bad">hồi sinh sau ${Math.ceil(me.dead)}s</span>` : ''}</small></div></div>
      <div class="tkp-prog"><i style="width:${(clamp(prog, 0, 1) * 100).toFixed(1)}%"></i></div><small class="dim">${nx ? `Còn ${fmt(nx[0] - me.pts)} điểm lên <b>${nx[2]}</b>` : 'Quân hàm cao nhất'}</small>
      <div class="tkp-stats"><span><i>⚔</i>Hạ địch<b>${me.kills}</b></span><span><i>☠</i>Bị hạ<b>${me.deaths}</b></span><span><i>🤝</i>Hỗ trợ<b>${me.st.ast}</b></span><span><i>🔥</i>Liên trảm<b>${me.streak}</b><small>cao nhất ${me.best}</small></span><span><i>🧪</i>Thuốc<b>${me.pot}</b></span><span><i>💥</i>Sát thương<b>${fmt(Math.round(me.st.dmg))}</b></span></div></div>
    <div class="tkfr tkp-feed"><div class="tkp-h">Tin chiến trường</div>${K.feed.length ? K.feed.slice().reverse().map(f => `<div>${f}</div>`).join('') : '<div class="dim">Chưa có giao tranh…</div>'}</div>
    <div class="tkfr"><div class="tkp-h">Xếp hạng hai phe</div><div class="tkp-top"><div><b style="color:${TK_SIDES[0].col}">Phe Tống</b>${top(0)}</div><div><b style="color:${TK_SIDES[1].col}">Phe Kim</b>${top(1)}</div></div></div>
    <div class="btnrow"><button class="btn" id="tkpBoard">📋 Bảng điểm đầy đủ</button><button class="btn red" id="tkpQuit">Rời trận</button></div>`;
}
function tkQuitModal() {
 const K=R.tk;if(!K)return;
 const waiting=K.real&&!K.activity&&K.phase==='waiting';
 const message=waiting?'Bạn đang chờ trận, chưa có phần thưởng để nhận.':K.activity?'Rời hoạt động sẽ không nhận thưởng lượt này.':K.real?'Rời sớm sẽ không nhận thưởng trận này.':'Rời trước 60 giây không nhận thưởng; sau đó thưởng giảm theo thời gian tham gia.';
  modal(`<section class="forge-panel" data-tk-exit><h3>${K.activity?'Rời hoạt động':'Rời chiến trường Tống Kim'}?</h3><p class="${waiting?'dim':'bad'}">${message}</p><p class="dim">Bạn sẽ trở lại ${K.keep?.town?'Biện Kinh':'bãi luyện công'} tại vị trí trước khi báo danh.</p><div class="btnrow"><button class="btn" id="tkExitCancel">Ở lại</button><button class="btn red" id="tkExitConfirm">Rời trận</button></div></section>`,()=>{
  $('#tkExitCancel').onclick=()=>closeModal();
  $('#tkExitConfirm').onclick=()=>{if(R.tk!==K){closeModal();return;}closeModal();tkEnd(true);};
 });
}
function tkPanelBind() {
  const p = document.getElementById('tkPanel'); if (!p) return;
  p.onclick = e => { if (e.target.closest('#tkpBoard')) tkBoardModal(); if (e.target.closest('#tkpQuit')) tkQuitModal(); };
}
const TK_BADGES = [   // huy hieu ca nhan trong tran: [ma, ten, bieu tuong, dieu kien, mo ta]
  ['mvp', 'MVP chiến trường', '🏆', (u, x) => x.place === 1, 'Điểm cao nhất cả trận'],
  ['streak', 'Liên trảm vương', '🔥', u => u.best >= 5, 'Liên trảm từ 5 người'],
  ['butcher', 'Đồ tể sa trường', '⚔️', u => u.kills >= 10, 'Hạ từ 10 người'],
  ['guard', 'Thần hộ vệ', '🤝', u => u.st.ast >= 10, 'Hỗ trợ hạ từ 10 lần'],
  ['general', 'Phá trận trảm tướng', '👑', u => u.st.gen >= 1, 'Hạ Chủ tướng hoặc Nguyên soái'],
  ['ghost', 'Bóng ma', '💨', u => u.st.dodge >= 20, 'Né từ 20 đòn'],
  ['iron', 'Bất tử', '🛡️', (u, x) => u.deaths === 0 && !x.quit, 'Không chết lần nào'],
  ['soldier', 'Quét sạch quân địch', '🏹', u => u.st.npc >= 15, 'Hạ từ 15 lính / vệ binh'],
];
const tkKDA = u => `${u.kills}/${u.deaths}/${u.st ? u.st.ast : 0}`;
function tkBoardHTML(K) {
  const side = s => {
    const list = K.u.filter(u => u.side === s && tkIsP(u)).sort((a, b) => b.pts - a.pts).slice(0, 10);
    return `<div class="tkside s${s}"><div class="tkside-h"><b>Phe ${TK_SIDES[s].n}</b><em>${fmt(tkSideScore(s, K))}</em></div>
      <table class="tktbl"><thead><tr><th>#</th><th>Quân hàm</th><th>Tên</th><th>Cấp</th><th title="Hạ / Chết / Hỗ trợ">H/C/HT</th><th>Điểm</th></tr></thead><tbody>
      ${list.map((u, i) => `<tr class="${u === K.hero ? 'me' : ''}${i < 3 ? ' top' + (i + 1) : ''}"><td>${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</td><td><img class="tkri" src="img/tk/${tkRank(u.pts)[1]}.png" alt="${tkRank(u.pts)[2]}"></td><td style="color:${ALLY_COL[u.fac] || '#ddd'}">${u === K.hero ? '👤 ' : ''}${esc(u.name)}</td><td>${u.L}</td><td>${tkKDA(u)}</td><td><b>${fmt(u.pts)}</b></td></tr>`).join('')}
      </tbody></table></div>`;
  };
  return `<div class="tkboard2">${side(0)}${side(1)}</div>`;
}
function tkResultModal(K, x) {
  const me = K.hero, s = me.st, sc = x.sc, tot = Math.max(1, sc[0] + sc[1]), my = TK_SIDES[K.side], f = FAC[S.fac] || {};
  const sidePlace = K.u.filter(u => u.side === K.side && tkIsP(u)).sort((a, b) => b.pts - a.pts).indexOf(me) + 1;
  const kd = (me.kills / Math.max(1, me.deaths)).toFixed(2);
  const tile = (ic, n, v, hi) => `<div class="tkt${hi ? ' hi' : ''}"><i>${ic}</i><b>${v}</b><small>${n}</small></div>`;
  const ptsTot = Math.max(1, s.ptsP + s.ptsN + s.ptsS);
  const bar = (n, v, c) => `<div class="tkpb"><span>${n}</span><div><i style="width:${(v / ptsTot * 100).toFixed(1)}%;background:${c}"></i></div><b>${fmt(v)}</b></div>`;
  const badges = TK_BADGES.map(([id, n, ic, ok, d]) => { const on = ok(me, x); return `<div class="tkbadge${on ? ' on' : ''}" title="${esc(d)}"><i>${ic}</i><span>${n}</span></div>`; }).join('');
  const mvp = s2 => { const u = K.u.filter(v => v.side === s2 && tkIsP(v)).sort((a, b) => b.pts - a.pts)[0]; if (!u) return ''; const hw = W.hero[u.fac] || {};
    return `<div class="tkmvp s${s2}"><div class="tkmvp-t">MVP phe ${TK_SIDES[s2].n}</div><img class="por" src="${esc(hw.img || '')}" alt=""><div><img class="tkri" src="img/tk/${tkRank(u.pts)[1]}.png" alt=""><b style="color:${ALLY_COL[u.fac] || '#fff'}">${u === me ? '👤 ' : ''}${esc(u.name)}</b><small>${esc((FAC[u.fac] || {}).n || '')} · cấp ${u.L}</small><small>${fmt(u.pts)} điểm · ${tkKDA(u)}</small></div></div>`; };
  const title = x.quit ? 'RỜI TRẬN' : x.win ? 'CHIẾN THẮNG' : 'THẤT BẠI';
  modal(`<div class="tkres ${x.quit ? 'quit' : x.win ? 'win' : 'lose'}">
    <div class="tkban"><div class="tkban-t">${title}</div><div class="tkban-s">Chiến trường Tống Kim · bạn thuộc phe <b style="color:${my.col}">${my.n}</b>${x.quit ? ' · rời trận sớm (nửa thưởng)' : ''}</div></div>
    <div class="tkscore"><div class="sd s0"><b>TỐNG</b><em>${fmt(sc[0])}</em></div><div class="vs">⚔</div><div class="sd s1"><em>${fmt(sc[1])}</em><b>KIM</b></div></div>
    <div class="tkmeter2"><i class="m0" style="width:${(sc[0] / tot * 100).toFixed(1)}%"></i><i class="m1" style="width:${(sc[1] / tot * 100).toFixed(1)}%"></i></div>
    <div class="tkmain">
      <div class="tkme2">
        <div class="tkme-top"><img class="por" src="${esc((W.hero[S.fac] || {}).img || '')}" alt=""><div>
          <img class="tkrbig" src="img/tk/${x.rk[1]}.png" alt="${x.rk[2]}">
          <b class="nm">${esc(S.name || '')}</b><small>${esc(f.n || '')} · cấp ${S.lvl}</small>
          <div class="pts"><em>${fmt(me.pts)}</em> điểm</div>
          <small>Hạng <b>${x.place}</b>/${x.players.length} toàn trận · hạng <b>${sidePlace}</b> phe ${my.n}</small></div></div>
        <div class="tkpbs">${bar('Hạ người', s.ptsP, my.col)}${bar('Lính & tướng', s.ptsN, '#c9a24a')}${bar('Liên trảm', s.ptsS, '#ff7a3a')}</div>
      </div>
      <div class="tktiles">
        ${tile('⚔️', 'Hạ địch', me.kills, me.kills >= 5)}${tile('☠️', 'Bị hạ', me.deaths)}${tile('🤝', 'Hỗ trợ', s.ast, s.ast >= 5)}${tile('📊', 'Tỉ lệ H/C', kd, +kd >= 2)}
        ${tile('🔥', 'Liên trảm cao nhất', me.best, me.best >= 3)}${tile('💥', 'Sát thương gây', fmt(Math.round(s.dmg)))}${tile('🛡️', 'Sát thương nhận', fmt(Math.round(s.taken)))}${tile('⚡', 'Đòn mạnh nhất', fmt(Math.round(s.maxHit)))}
        ${tile('🎯', 'Chí mạng', s.crit)}${tile('💨', 'Né đòn', s.dodge, s.dodge >= 10)}${tile('🪽', 'Khinh công', s.kc || 0)}${tile('✨', 'Tuyệt chiêu', s.ult)}
        ${tile('🧪', 'Thuốc đã dùng', s.pot)}${tile('🏹', 'Lính đã hạ', s.npc)}${tile('👑', 'Tướng đã hạ', s.gen, s.gen > 0)}${tile('🎖️', 'Quân hàm', x.rk[2])}
      </div>
    </div>
    <div class="tksec">Huy hiệu</div><div class="tkbadges">${badges}</div>
    <div class="tksec">Phần thưởng</div>
    <div class="tkrew"><span class="chip3 g">⚔ +${x.gain} điểm Tống Kim</span><span class="chip3">📈 kinh nghiệm ×${fmt(x.xpK)} quái</span>${x.got.map(h => `<span class="chip3">${h}</span>`).join('')}</div>
    <div class="tkmvps">${mvp(0)}${mvp(1)}</div>
    ${tkBoardHTML(K)}
    <div class="btnrow"><button class="btn" id="tkShop2">🏪 Cửa hàng Tống Kim</button><button class="btn on" id="tkOk">Đóng</button></div></div>`, () => {
    $('#tkOk').onclick = () => closeModal(); $('#tkShop2').onclick = tkShopModal;
    if (typeof modalAutoBtn === 'function') modalAutoBtn('#tkOk', 20);   // 08/10: 20 giay tu dong
    const b = document.querySelector('#modal .mbox'); if (b) b.classList.add('tkwide');
  });
}
function tkBoardModal() { if(R.tk?.activity){realActivityBoard();return;} if (!R.tk) return; modal(`<h3>📋 Bảng điểm Tống Kim</h3>${tkBoardHTML(R.tk)}<div class="btnrow"><button class="btn" id="tkBc">Đóng</button></div>`, () => { $('#tkBc').onclick = () => closeModal(); const b = document.querySelector('#modal .mbox'); if (b) b.classList.add('tkwide'); }); }

/* ---------- cua hang Tong Kim ---------- */
/* Hang ban: bieu tuong that cua JX (img/i/tk_*.png xuat tu SBQA: tk_shop_icons.py; thuoc dung icon thuoc co san).
   rand: mon ngau nhien -> o ngau nhien rieng (tim / hoang kim). Ngua: xem truoc DUNG con ngua se nhan (4 dong that). */
const tkPotOf = kind => J.potions.find(p => p.kind === kind && p.tier === tkPotTier()) || J.potions.find(p => p.kind === kind);
const tkBookSkills = tier => { const f = FAC[S.fac]; return f ? f.skills.filter(id => SK[id] && SK[id].book === tier).map(id => SK[id].n) : []; };
const TK_SHOP = [
  { n: () => `${tkPotOf('life').n} ×20`, c: 30, ic: () => tkPotOf('life').ic, g: () => ({ pot: { kind: 'life', tier: tkPotTier(), n: 20 } }),
    sub: () => 'Bậc thuốc theo cấp nhân vật', info: () => { const p = tkPotOf('life'); return [`Hồi ${fmt(p.total)} sinh lực trong ${p.dur} giây mỗi bình`, '20 bình, vào kho thuốc dùng chung', 'Bậc thuốc tăng theo cấp nhân vật']; } },
  { n: () => `${tkPotOf('mana').n} ×20`, c: 30, ic: () => tkPotOf('mana').ic, g: () => ({ pot: { kind: 'mana', tier: tkPotTier(), n: 20 } }),
    sub: () => 'Bậc thuốc theo cấp nhân vật', info: () => { const p = tkPotOf('mana'); return [`Hồi ${fmt(p.total)} nội lực trong ${p.dur} giây mỗi bình`, '20 bình, vào kho thuốc dùng chung', 'Bậc thuốc tăng theo cấp nhân vật']; } },
  { n: () => 'Phúc Duyên Lộ', c: 60, ic: () => 'img/i/tk_phucduyen.png', g: () => ({ fd: 10 }), sub: () => '+10 điểm Phúc Duyên',
    info: () => ['Uống vào nhận ngay 10 điểm Phúc Duyên', `Mở rương Phúc Duyên ở bảng Phần thưởng (${FD_COST} điểm / lần)`] },
  { n: () => 'Ngân Bảo Rương · Trang bị Tím', c: 80, ic: () => 'img/i/tk_ruongtim.png', rand: 'tim', g: () => ({ item: 4 }), sub: () => 'Ngẫu nhiên 1 món đồ Tím 4 dòng',
    info: () => ['Mở ra 1 món trang bị phẩm chất <b style="color:#c77bff">Tím</b> (4 dòng thuộc tính) ngẫu nhiên', 'Loại đồ ngẫu nhiên: vũ khí, áo, nón, giày, đai, bao tay, nhẫn, dây chuyền, ngọc bội', `Cấp đồ theo cấp nhân vật (hiện cấp ${S.lvl})`] },
  { n: () => 'Chiến mã Tống Kim', c: 250, horse: 1, ic: () => (tkHorseSample() || {}).ic || '', sub: () => { const h = tkHorseSample(); return h ? `${h.n} · ngựa theo bậc cấp · xem trước đúng con sẽ nhận` : "Ngựa theo bậc cấp"; } },
  { n: () => 'Quả Huy Hoàng', c: 150, ic: () => 'img/i/tk_tiemnang.png', g: () => ({ pts: 2 }), sub: () => '+2 điểm tiềm năng', info: () => ['Ăn vào nhận ngay 2 điểm tiềm năng', 'Cộng ở tab Nhân vật'] },
  { n: () => 'Hoàng Kim Bảo Hạp', c: 400, ic: () => 'img/i/tk_hophk.png', rand: 'hk', g: () => ({ set: 1 }), sub: () => 'Ngẫu nhiên 1 món Hoàng Kim môn phái',
    info: () => [`Mở ra 1 món ngẫu nhiên trong bộ <b style="color:#ffb52e">Hoàng Kim môn phái</b> của ${esc((FAC[S.fac] || {}).n || 'môn phái')}`, 'Ưu tiên món có cấp yêu cầu gần cấp nhân vật', 'Gom đủ món để kích hoạt thuộc tính bộ'] },
  { n: () => 'Võ Lâm Mật Tịch · Bí kíp 120', c: 600, lv: 120, ic: () => 'img/i/tk_bikip120.png', g: () => ({ book: 120 }), sub: () => 'Mở khóa võ công cấp 120',
    info: () => ['Lĩnh ngộ Bí kíp 120: học được võ công cấp 120 của môn phái', ...tkBookSkills(120).map(n => '· ' + n), 'Cần cấp 120'] },
  { n: () => 'Võ Lâm Mật Tịch · Bí kíp 150', c: 900, lv: 150, ic: () => 'img/i/tk_bikip150.png', g: () => ({ book: 150 }), sub: () => 'Mở khóa võ công cấp 150',
    info: () => ['Lĩnh ngộ Bí kíp 150: học được võ công cấp 150 của môn phái', ...tkBookSkills(150).map(n => '· ' + n), 'Cần cấp 150'] },
  { n: () => 'Bí kíp gia truyền · Bí kíp 180', c: 1300, lv: 180, ic: () => 'img/i/tk_bikip180.png', g: () => ({ book: 180 }), sub: () => 'Mở khóa võ công trấn phái 180',
    info: () => ['Lĩnh ngộ Bí kíp 180: học được võ công trấn phái cấp 180', ...tkBookSkills(180).map(n => '· ' + n), 'Cần cấp 180'] },
];
let TK_HORSE = null;
function tkHorseSample() {                 // ngua xem truoc theo bac cap hien tai; mua thi nhan dung con nay
  const tier = clamp(Math.round(S.lvl / 12) + 1, 1, 10);
  if (!TK_HORSE || TK_HORSE._tier !== tier) { const u = S.uid; TK_HORSE = makeItem(10, 0, tier, 4); S.uid = u; if (TK_HORSE) { TK_HORSE._tier = tier; TK_HORSE.uid = -2; } }
  return TK_HORSE;
}
const tkShopLock = x => (x.lv && S.lvl < x.lv) ? `cần cấp ${x.lv}` : (x.lv && S.books && S.books[x.lv]) ? 'đã có' : '';
/* thong tin khi re chuot (tooltip.js) - cung kieu bang thong tin vat pham */
function tkShopTip(i) {
  const x = TK_SHOP[i]; if (!x) return null;
  if (x.horse) { const h = tkHorseSample(); return h ? itemHTML(h) + `<div class="tipnote">Chiến mã Tống Kim · ${x.c} điểm · nhận đúng con ngựa này</div>` : null; }
  const rr = x.rand === 'tim' ? 3 : x.rand === 'hk' ? 4 : 0, col = x.rand === 'tim' ? RAR_COL[3] : x.rand === 'hk' ? RAR_COL[4] : '#f3d88a', lock = tkShopLock(x);
  return `<div class="idet"><div class="pic r${rr}${x.rand ? ' tkrand ' + x.rand : ''}"><img src="${esc(x.ic())}" alt="">${x.rand ? '<b>?</b>' : ''}</div><div><h4 style="color:${col}">${esc(x.n())}</h4>
    <div class="ikind" style="color:#d8b968">${x.rand ? 'Vật phẩm ngẫu nhiên' : x.lv ? 'Bí kíp võ công' : 'Vật phẩm Tống Kim'}</div><small class="dim">Giá: ${x.c} điểm Tống Kim${lock ? ' · <span class="bad">' + lock + '</span>' : ''}</small></div></div>
    <div class="sl">${x.info().map(l => `<div>${l}</div>`).join('')}</div>`;
}
function tkShopRows(attr) {
  const T = tkData();
  return TK_SHOP.map((x, i) => { const lock = tkShopLock(x), ok = !lock && T.pts >= x.c;
    return `<div class="tksrow${ok ? '' : ' off'}" data-tkt="${i}"><div class="tkico${x.rand ? ' tkrand ' + x.rand : ''}"><img src="${esc(x.ic())}" alt="">${x.rand ? '<b>?</b>' : ''}</div>
      <span><b>${esc(x.n())}</b><small>${esc(x.sub())}${lock ? ` · <em class="bad">${lock}</em>` : ''}</small></span>
      <button class="btn sm tkcost" ${attr}="${i}" ${ok ? '' : 'disabled'}><img src="img/i/tk_huancong.png" alt="">${fmt(x.c)}</button></div>`; }).join('');
}
function tkShopModal() {
  const T = tkData();
  modal(`<h3>🏪 Cửa hàng Tống Kim <small class="tkptsh"><img src="img/i/tk_huancong.png" alt="">điểm: <b class="tkp">${fmt(T.pts)}</b></small></h3>
    <div class="tkshop2">${tkShopRows('data-tkb')}</div>
    <p class="dim small">Rê chuột vào món hàng để xem chi tiết. Điểm Tống Kim nhận khi kết thúc trận: theo điểm cá nhân, phe thắng ×1,5.</p>
    <div class="btnrow"><button class="btn" id="tkSc">Đóng</button></div>`, () => {
    document.querySelectorAll('[data-tkb]').forEach(b => b.onclick = () => tkBuy(TK_SHOP[+b.dataset.tkb]));
    $('#tkSc').onclick = () => closeModal();
  });
}
function tkBuy(x, back) {
  const T = tkData(); if (T.pts < x.c || tkShopLock(x)) return;
  if (x.horse) {
    if (bagUsed() >= INV_MAX) { toast('Hành trang đầy'); return; }
    const it = tkHorseSample(); if (!it) return;
    TK_HORSE = null; delete it._tier; it.uid = S.uid++;
    T.pts -= x.c; addItem(it, true, true, true); log(`🏪 Đổi điểm Tống Kim: <b style="color:${RAR_COL[it.r]}">${esc(it.n)}</b>`); save();
  } else { T.pts -= x.c; grant(x.g(), 'Cửa hàng Tống Kim'); }
  if (typeof tipHide === 'function') tipHide();
  uiSfx('use'); (back || tkShopModal)(); if (curTab === 'log') refresh();
}
