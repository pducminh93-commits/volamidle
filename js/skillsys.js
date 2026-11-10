"use strict";const FPS_JX=18,WXG_POISON=[1,1,1,1,2,2,2,2,2,3,3,3,3,3,4,4,4,4,4,5,5,5,5,5,6,6,6,6,6,7],AURA_DMG={69:{el:"poison",every:10/18,rad:180,tab:WXG_POISON,col:"#8fe34a"}},auraSkill=t=>{const e=AURA_DMG[t],s=SK[t]&&SK[t].attr&&SK[t].attr.poisondamage_v;return e.sk||(e.sk=Object.assign({},SK[t],{aura:0,attr:{poisondamage_v:s||e.tab.map(n=>[n,60,10])}}))},auraHit=(t,e)=>{const s=AURA_DMG[t],n=Math.min(e,(auraSkill(t).attr.poisondamage_v||s.tab).length);return R.P&&(activeInfo(R.P,auraSkill(t),n).parts||{})[s.el]||0},hasCost=t=>!!(t.attr&&t.attr.skill_cost_v);function skKind(t){return t?isAttack(t)?"atk":t.aura?Object.keys(t.attr||{}).length||AURA_DMG[t.id]?"aura":"none":hasCost(t)?t.enemy?"curse":"buff":"passive":"none"}const SK_KIND_VI={atk:"Tấn công",passive:"Bị động",buff:"Bùa lợi",aura:"Vòng sáng",curse:"Bùa hại",none:"—"};

/* Vòng sáng (aura) trong JX là BỊ ĐỘNG: aura=1 nghĩa là bậc cuối của dãy thuộc tính luôn
 * thường trực cho bản thân. Trước đây chỉ tính khi người chơi bấm Bật ở bảng Võ công
 * (auraList dựa vào S.auraOff), nên vòng sáng chưa bật thì coi như mất trắng.
 * Nay: mọi vòng sáng đã học đều cộng chỉ số; S.auraOff chỉ để tắt phụ (hiệu ứng độc).
 * Cùng một hàm dùng cho cả tính chỉ số và hiển thị trạng thái. */
function auraPassiveOn(t){return !!(t&&S&&S.sk&&S.sk[t.id]>0&&skKind(t)==="aura"&&!(S.auraOff||{})[t.id]&&S.lookFx!==!1)}
/* Hiệu ứng vòng sáng quanh nhân vật được vẽ bởi heroStates() (skillfx.js) qua bảng JXST,
 * nên chỉ cần aura đã học là có FX — không phụ thuộc việc bấm Bật như trước. */
function auraPassiveAttr(){const out=[];for(const i in S.sk||{}){const t=SK[i];t&&S.sk[i]&&skKind(t)==="aura"&&out.push(t)}return out}function skDur(t,e){let s=0;for(const n in t.attr){if(/^(skill_|missle_|addskill)/.test(n))continue;const o=skVal(t,n,e);o&&o[1]>s&&(s=o[1])}return s>0?s/18:0}const skCost=(t,e)=>(skVal(t,"skill_cost_v",e)||[0])[0]||0,SKS=()=>R.sks||(R.sks={buff:{},cd:{}}),clk=()=>R.clock||0,buffOn=t=>(SKS().buff[t]||0)>clk()&&!!S.sk[t],auraList=()=>Object.keys(S.sk||{}).filter(t=>S.sk[t]&&SK[t]&&skKind(SK[t])==="aura"&&!(S.auraOff||{})[t]).map(Number),auraOn=t=>auraList().includes(+t);function auraActive(){return auraList()[0]||0}const auraT={};function auraDmgTick(t){for(const e of auraList())AURA_DMG[e]&&auraDmg1(e,t)}function auraDmg1(t,e){const s=AURA_DMG[t];if(!s||!R.P||!R.P.main||R.town||R.deadT>0||(auraT[t]=(auraT[t]||0)-e)>0)return;auraT[t]=s.every;const n=Math.max(1,skLv(t)),o=auraHit(t,n);if(!(o>0))return;const i=R.enemies.filter(c=>!c.dead&&c.hp>0&&jxdE(H,c)<=s.rad);if(!i.length)return;const l=heroSeries();for(const c of i){const a=curseMod(c),p=a?Object.fromEntries(ELEM.map(f=>[f,c.res[f]+(a.res[f]||0)])):c.res;let r=applyPart(o*rnd(.9,1.1)*(a&&a.poison?1+a.poison/100:1),s.el,l,c.series,p,75,R.P.series5||0)*cheatK();if(s.el==="poison"&&!(c.poison>0)&&typeof stTxt=="function"&&stTxt(c,"Độc","#8fe34a"),s.el==="poison"){const f=c.poison>0?c.poisonDmg*c.poison:0;c.poisonDmg=(f+r)/POISON_TIME,c.poison=POISON_TIME}else c.hp-=r}}function skApplies(t){const e=skKind(t);return e==="passive"?!0:e==="aura"?auraOn(t.id):e==="buff"?buffOn(t.id)||!!R.buffAssume:!1}let skT=0;function skillSysTick(t){if(auraDmgTick(t),skT-=t,skT>0||(skT=.5,!S.fac||!R.P||R.deadT>0||R.town))return;const e=clk(),s=SKS();let n=!1;for(const i in s.buff)s.buff[i]<=e&&s.buff[i]>0&&(s.buff[i]=0,n=!0);const o=R.enemies.some(i=>!i.dead);for(const i in S.sk){const l=SK[i];if(!(S.sk[i]||0))continue;const a=skKind(l);if(a!=="buff"&&a!=="curse"||a==="buff"&&S.autoBuff===!1||a==="curse"&&S.autoCurse===!1)continue;const p=skLv(i),r=skCost(l,p),f=skDur(l,p),k=skCostLife(l),m=()=>{k?R.life=Math.max(1,R.life-r):R.mana-=r};if(!(k?R.life<r+R.P.life*.3:R.mana<r+R.P.mana*.15)){if(a==="buff"){if(buffOn(i))continue;if(f<5){if(!(o&&R.life<R.P.life*.6)||(s.cd[i]||0)>e)continue;const g=skVal(l,"lifereplenish_v",p);m(),heal((g?g[0]:0)*f*2,!1),s.cd[i]=e+8,addText(H.x,H.y-60,"✚ "+l.n,"#8f8",12);continue}m(),s.buff[i]=e+f,n=!0,typeof uiSfx=="function"&&uiSfx("use")}else if(o){const d=R.enemies.filter(u=>!u.dead&&!((u.curse||{})[i]>e)).sort((u,h)=>(h.cls==="boss")-(u.cls==="boss")||(h.cls==="elite")-(u.cls==="elite")||Math.hypot(u.x-H.x,u.y-H.y)-Math.hypot(h.x-H.x,h.y-H.y))[0];if(!d||jxdE(H,d)>420||d.cls==="normal"&&R.enemies.filter(u=>!u.dead).length<3)continue;m();const b=d.curse||(d.curse={});b[i]=e+Math.min(f,60),typeof castFx=="function"&&castFx({id:+i});for(const u of R.enemies)u!==d&&!u.dead&&jxdE(d,u)<120&&((u.curse||(u.curse={}))[i]=e+Math.min(f,60))}}}n&&(R.dirty=!0)}function curseMod(t){const e=t.curse;if(!e)return null;const s=clk(),n={res:{},def:0,ar:0,dmg:0,ret:0,slow:0,regen:0,poison:0,crit:0};let o=!1;for(const i in e){if(e[i]<=s)continue;const l=SK[i],c=Math.max(1,t.curseL&&t.curseL[i]||skLv(i));if(l){o=!0;for(const a in l.attr){if(/^(skill_|missle_|addskill)/.test(a))continue;const p=skVal(l,a,c);if(!p)continue;const r=p[0];if(a==="allres_p")for(const f of ELEM)n.res[f]=(n.res[f]||0)+r;else if(/res_p$/.test(a)){const f=a.startsWith("physics")?"phys":a.startsWith("lighting")?"light":a.replace("res_p","");n.res[f]=(n.res[f]||0)+r}else a==="adddefense_v"?n.def+=r:a==="attackratingenhance_p"?n.ar+=r:a==="addphysicsdamage_p"?n.dmg+=r:a==="meleedamagereturn_p"?n.ret+=-r:a==="fasthitrecover_v"?n.slow+=-r:a==="lifereplenish_v"?n.regen+=r:a==="poisontimereduce_p"?n.poison+=-r:a==="deadlystrikeenhance_p"&&(n.crit+=r)}}}return o?n:null}const isCursed=t=>!!curseMod(t);function skStateTag(t){const e=skKind(t),s=S.sk[t.id]||0;if(e==="buff"){const n=skDur(t,Math.max(1,s));return n<5?'<span class="tag buff">Hồi phục</span>':`<span class="tag buff">Bùa lợi ${Math.round(n)}s</span>${s&&buffOn(t.id)?` <small class="cp">đang có ${Math.ceil(SKS().buff[t.id]-clk())}s</small>`:""}`}return e==="aura"&&AURA_DMG[t.id]?`<span class="tag aura">Vòng sáng độc</span> <small class="dim">mỗi ${String(Math.round(AURA_DMG[t.id].every*100)/100).replace(".",",")}s phủ độc quái trong ${AURA_DMG[t.id].rad} · độc ${AURA_DMG[t.id].tab[Math.min(Math.max(1,s+(R.P&&R.P.plusSkill||0)),30)-1]} điểm/lần → ~${fmt(auraHit(t.id,Math.max(1,s+(R.P&&R.P.plusSkill||0))))}/nhịp</small>${s?' <small class="cp">● tự động</small>':""}`:e==="aura"?(()=>{const lv=Math.max(1,s),off=!!(S.auraOff||{})[t.id],on=s>0&&!off,rows=[];for(const k in t.attr||{}){if(SKIP_PASSIVE.test(k))continue;const v=skVal(t,k,lv);if(v)rows.push(esc(attrText(attrName(k),v)));}const btn=s?` <button class="btn sm" data-aura="${t.id}">${off?"Bật":"Tắt"}</button>`:"";const head=`<span class="tag aura">Vòng sáng</span>${on?' <small class="cp">● đang bật</small>':""}${btn}`;const note=s?`<div class="small dim">Yêu cầu cấp ${t.req||1} · tối đa cấp ${t.max||20} · cấp hiện tại <b>${s}</b></div>${rows.length?`<div class="small">${rows.join("<br>")}</div>`:""}`:"";return head+note;})():e==="curse"?`<span class="tag curse">Bùa hại ${Math.round(Math.min(60,skDur(t,Math.max(1,s))))}s</span>`:e==="passive"?'<span class="tag">Bị động</span>':""}function bindSkState(t){t.querySelectorAll("[data-aura]").forEach(e=>e.onclick=s=>{s.stopPropagation();const n=e.dataset.aura,o=S.auraOff||(S.auraOff={});o[n]?delete o[n]:o[n]=1,R.dirty=!0,recalc(),save(),toast(`${o[n]?"Tắt":"Bật"} hiệu ứng vòng sáng: ${SK[n].n} (chỉ số vẫn giữ nguyên)`),refresh()})}function skOptsHTML(){return`${typeof teamAuraHTML==="function"?teamAuraHTML():""}<label><input type="checkbox" id="cBuff" ${S.autoBuff===!1?"":"checked"}> Tự thi triển bùa lợi khi hết thời gian (tốn nội lực)</label>
    <label><input type="checkbox" id="cCurse" ${S.autoCurse===!1?"":"checked"}> Tự thi triển bùa hại lên trùm, tinh anh hoặc đám từ 3 quái</label>`}function bindSkOpts(){const t=$("#cBuff"),e=$("#cCurse");t&&(t.onchange=()=>{S.autoBuff=t.checked,save()}),e&&(e.onchange=()=>{S.autoCurse=e.checked,save()})}const BUF_ITEM_IC={tt:"img/ep/tt.png",luck:"img/ep/qht.png",xp:"img/ep/fd.png",drop:"img/ep/mys.png"},fmtLeft=t=>t<0?"N/A":t>=3600?Math.floor(t/3600)+"h":t>=60?Math.floor(t/60)+"m":Math.ceil(t)+"s";function stateIcons(){const t=[];newbieOn()&&t.push({ic:"img/ep/tanthu.png",t:-1,n:`Hỗ Trợ Tân Thủ: mỗi giây hồi ${NEWBIE_REGEN.life*100}% sinh lực, ${NEWBIE_REGEN.mana*100}% nội lực, +${NEWBIE_XP*100}% kinh nghiệm (đến cấp ${NEWBIE_LV})`});for(const n of auraList())t.push({ic:SK[n].ic,t:-1,n:"Vòng sáng: "+SK[n].n});const e=clk();for(const n in SKS().buff)SKS().buff[n]>e&&SK[n]&&S.sk[n]&&t.push({ic:SK[n].ic,t:SKS().buff[n]-e,n:SK[n].n});const s=Date.now();for(const n in S.buf||{}){const o=S.buf[n];o&&o.until>s&&BUFF_VI[n]&&t.push({ic:BUF_ITEM_IC[n]||"img/ep/fd.png",t:(o.until-s)/1e3,n:`${BUFF_VI[n]} +${n==="luck"?Math.round(o.p):Math.round(o.p*100)+"%"}`})}return t}

/* ============================================================================
 * VÒNG SÁNG CỦA NHÂN VẬT PHỤ (đội 4 nhân vật)
 * ----------------------------------------------------------------------------
 * Bản gốc chỉ tính aura của nhân vật đang điều khiển (S). Nay mọi nhân vật
 * trong đội đã học aura và ĐANG BẬT (không có trong auraOff của chính họ) đều
 * toả vòng sáng: cộng chỉ số cho cả đội, tính theo hệ số ảnh hưởng của thành
 * viên đó và xếp hạng đóng góp (cao nhất 100%, các nguồn phụ 50%).
 * Áp dụng cho: chỉ số trong calc(), hiệu ứng hình trên sân và dải buff đội.
 * ========================================================================== */

/* Như bản web: hiệu lực lấy theo CẤP CAO NHẤT trong đội (không cộng dồn khi
 * nhiều người bật cùng kỹ năng), nhưng vòng sáng của từng người vẫn hiện riêng. */
const AURA_ALLY_LEAD = 1, AURA_ALLY_MATE = 1;
let AURA_ROSTER_CALC_CONTEXT = null;

function auraStateForSlot(slot) {
  if (slot === SLOT) return S;
  if (AURA_ROSTER_CALC_CONTEXT && slot === AURA_ROSTER_CALC_CONTEXT.mainSlot) {
    return AURA_ROSTER_CALC_CONTEXT.mainState;
  }
  return typeof rosterReadSave === "function" ? rosterReadSave(slot) : null;
}

function auraTeamSlots() {
  return typeof rosterActiveSlots === "function" ? rosterActiveSlots() : [SLOT];
}

/* Cấp aura của một nhân vật (đã tính allskill/cộng điểm), chỉ khi có bật */
function auraLvOf(state, id) {
  if (!state || !state.sk || !(state.sk[id] > 0)) return 0;
  if ((state.auraOff || {})[id]) return 0;
  const l = SK[id];
  if (!l || !l.aura) return 0;
  const plus = (state.skAdd || {})[id] || 0;
  return state.sk[id] + plus;
}

/* Bản ghi aura đang bật của một thành viên trong đội. */
function allyAuraEntries(state, slot) {
  const out = [];
  if (!state || !state.sk) return out;
  for (const id in state.sk) {
    const lv = auraLvOf(state, +id);
    if (lv > 0) out.push({ slot, id: +id, lv, skill: SK[id] });
  }
  return out;
}

/* Tổng hợp aura của cả đội (kể cả nhân vật chính) + người đóng góp */
let AURA_ALL = { key: "", list: [] };
function teamAuras() {
  const key = rosterAuraKey();
  if (AURA_ALL.key === key) return AURA_ALL.list;
  const pick = new Map();   // id -> { id, lv, slots: [...] }
  const push = (id, lv, slot) => {
    const cur = pick.get(id);
    if (!cur) pick.set(id, { id, lv, slots: [slot], skill: SK[id] });
    else { cur.slots.push(slot); cur.lv = Math.max(cur.lv, lv); }
  };
  for (const slot of auraTeamSlots()) {
    const st = auraStateForSlot(slot);
    for (const entry of allyAuraEntries(st, slot)) push(entry.id, entry.lv, slot);
  }
  AURA_ALL = { key, list: [...pick.values()] };
  return AURA_ALL.list;
}

/* Khoá cache: đổi khi đội đổi, aura bật/tắt, cấp đổi */
function rosterAuraKey() {
  const parts = [];
  const add = (st, tag) => {
    if (!st || !st.sk) return;
    const on = Object.keys(st.sk).filter(id => auraLvOf(st, +id) > 0).sort();
    if (on.length) parts.push(tag + ":" + on.map(id => id + "." + auraLvOf(st, +id)).join(","));
  };
  for (const slot of auraTeamSlots()) add(auraStateForSlot(slot), "s" + slot);
  return parts.join("|");
}

/* Cộng chỉ số aura của nhân vật phụ vào bảng thuộc tính (gọi trong calc) */
function allyAuraAttr(attr) {
  if (!S || !S.fac) return;
  try {
    let n = 0;
    /* Như bản web (K$ + X$ + j6): mỗi nhân vật nhận aura của đồng đội theo TỪNG KỸ NĂNG,
     * và chỉ nhận cấp CAO NHẤT trong đội — 2 người cùng bật Mộng Điệp thì vẫn là cấp
     * cao nhất (KHÔNG cộng dồn), nhưng vòng sáng của cả 2 vẫn hiện trên sân. */
    if (typeof rosterActiveSlots !== "function") return 0;
    for (const aura of teamAuras()) {
      const id = aura.id, lv = aura.lv;
      const l = SK[id];
      if (!l || (typeof isAttack === "function" && isAttack(l))) continue;
      // calc() đã cộng aura của chính nhân vật. Chỉ bù phần chênh lệch tới cấp cao nhất đội.
      const own = auraLvOf(S, id);
      if (own >= lv) continue;
      for (const m in l.attr || {}) {
        if (SKIP_PASSIVE.test(m)) continue;
        const bestValue = skVal(l, m, Math.max(1, lv));
        if (!bestValue) continue;
        const ownValue = own > 0 ? skVal(l, m, own) : null;
        const delta = [
          (bestValue[0] || 0) - (ownValue && ownValue[0] || 0),
          0,
          (bestValue[2] || 0) - (ownValue && ownValue[2] || 0)
        ];
        if (!delta[0] && !delta[2]) continue;
        addAttr(attr, m, delta);
        n++;
      }
    }
    return n;
  } catch (error) { console.warn("[aura đội]", error); }
}

/* Dải thông tin: ai đang toả aura gì cho đội */
function teamAuraHTML() {
  const list = teamAuras().filter(a => a.slots.some(slot => slot !== SLOT));
  if (!list.length) return "";
  return `<div class="small" style="margin:2px 0 6px">Vòng sáng đồng đội: ${list.map(a => {
    const mates = a.slots.filter(slot => slot !== SLOT).length;
    return `<span class="tag aura" title="cấp cao nhất ${a.lv}${mates > 1 ? ` · ${mates} người bật (không cộng dồn)` : ""}">${esc(a.skill.n)}${mates > 1 ? ` ×${mates}` : ""}</span>`;
  }).join(" ")}</div>`;
}

/* ---- Hiệu ứng vòng sáng cho NHÂN VẬT PHỤ trên sân (drawAllyAura) ----
 * Mỗi người nhận danh sách aura đã gộp của đội; trùng skill/file chỉ vẽ một lần. */
const ALLY_AURA_T = {};
function drawAllyAura(ctx, unit, dt) {
  if (!unit || !unit.state || S.lookFx === false || typeof JXST === "undefined" || typeof drawState !== "function") return;
  const clock = (R.clock || 0) + (unit.slot || 0) * 1.7;   // lệch nhịp cho khỏi trùng nhau
  const scale = (typeof HERO_SCALE !== "undefined" ? HERO_SCALE : 1.8);
  const seen = new Set();
  for (const aura of teamAuras()) {
    const id = aura.id, meta = JXST[id];
    if (!meta || !meta.f) continue;
    const key = `${meta.pos || "body"}|${meta.f}`;
    if (seen.has(key)) continue;
    seen.add(key);
    ALLY_AURA_T[unit.slot] = ALLY_AURA_T[unit.slot] || new Set();
    if (ALLY_AURA_T[unit.slot].size > 6) ALLY_AURA_T[unit.slot].clear();
    ALLY_AURA_T[unit.slot].add(id);
    try {
      drawState(ctx, meta, unit.x, unit.y, unit.dir || 0, clock, scale, meta.pos === "foot" ? .85 : .9);
    } catch (error) { /* bỏ qua lỗi vẽ */ }
  }
}
