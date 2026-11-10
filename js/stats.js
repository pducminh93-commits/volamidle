"use strict";
const ATTR_ALIAS={lifemax_yan_v:"lifemax_v",lifemax_yan_p:"lifemax_p",manamax_yan_v:"manamax_v",allres_yan_p:"allres_p",physicsres_yan_p:"physicsres_p",poisonres_yan_p:"poisonres_p",coldres_yan_p:"coldres_p",fireres_yan_p:"fireres_p",lightingres_yan_p:"lightingres_p",attackspeed_yan_v:"attackspeed_v",castspeed_yan_v:"castspeed_v",sorbdamage_yan_p:"sorbdamage_p",fasthitrecover_yan_v:"fasthitrecover_v",anti_allres_yan_p:"anti_allres_p",anti_coldres_yan_p:"anti_coldres_p",anti_lightingres_yan_p:"anti_lightingres_p"},
NEWBIE_LV=30,NEWBIE_REGEN={life:.03,mana:.05},NEWBIE_XP=2,newbieXp=()=>newbieOn()?1+NEWBIE_XP:1,newbieOn=()=>typeof S<"u"&&S&&S.fac&&S.lvl<NEWBIE_LV&&!rebornN(),
POISON_LINE_TICKS=6,ATTR_NOEFFECT=new Set(["indestructible_b","staminareplenish_v","staminamax_v","pk_punish_weaken","durability_v","item_purple"]);

function addAttr(n,t,e,s=1){t=ATTR_ALIAS[t]||t;const o=n[t]||(n[t]=[0,0,0]);for(let r=0;r<3;r++)o[r]+=(e[r]||0)*s}
const av=(n,t,e=0)=>n[t]?n[t][e]:0,
ACCRUE={0:2,2:1,1:3,3:4,4:0},
accrues=(n,t)=>n>=0&&t>=0&&ACCRUE[n]===t,
ACTIVATED_BY={helm:["armor","amulet"],armor:["ring2","belt"],belt:["pendant","cuff"],weapon:["amulet","armor"],boot:["weapon","helm"],cuff:["boot","ring1"],amulet:["belt","ring2"],ring1:["weapon","helm"],ring2:["cuff","pendant"],pendant:["boot","ring1"]};

function slotOfEquipped(n,t){if(!t)return null;for(const e in t)if(t[e]===n)return e;return null}
// Cơ chế kích hoạt dòng ẩn (mặc đồ tím/violet đủ dòng): mỗi 2 dòng thuộc tính ma pháp tính 1 "mức" ẩn,
// đủ 3 mức (>=6 dòng) thì kích hoạt toàn bộ dòng ẩn trên trang bị.
function enoughToActive(t){if(!t)return 0;let cnt=0;for(const o of Object.values(t)){if(!o||o.set||o.d<0||o.d>9)continue;cnt+=(o.mag||[]).length}return Math.floor(cnt/2)}
function hiddenActive(n,t=S&&S.eq||{}){if(!n)return 0;if(n.leg||n.set&&n.d===10||enoughToActive(t)>=3)return 3;const e=slotOfEquipped(n,t);if(!e)return 0;if(e==="horse")return 3;let s=accrues(heroSeries(),n.s)?1:0;for(const o of ACTIVATED_BY[e]||[])t[o]&&accrues(t[o].s,n.s)&&s++;return Math.min(3,s)}

function heroStart(){const n=FAC&&FAC[S.fac];return n?(J.start[n.series*2+(S.sex||0)]||J.start[0]):(J.start[0]||{})}
function heroSeries(){return FAC&&FAC[S.fac]?FAC[S.fac].series:0}
function weaponCode(n){const t=n&&n.weapon;return t?t.d===1?7:t.k===6?9:t.k:9}
function skillBonusLv(n){const t=R&&R.P;return t?(t.plusSkill||0)+((t.skAdd||{})[n]||0):0}
const skCostLife=n=>!!n&&n.cos==="life";

function skLv(id){id=+id;const base=S&&S.sk&&S.sk[id]||0;if(!base)return 0;return base+skillBonusLv(id)}

const SKIP_PASSIVE_STATS=/^(skill_|missle_|addskill)/;
function skReqOk(sk){if(!sk||!S)return false;const fac=FAC&&FAC[S.fac];if(!fac)return false;if(sk.req!=null&&S.lvl<(sk.req||1))return false;return true}
function canLearn(sk){if(!sk||!S)return false;if(!skReqOk(sk))return false;const cur=S.sk[sk.id]||0;if(cur>= (sk.max||20))return false;if(S.skPts<=0 && !(typeof sk9Free=="function"&&sk9Free(sk)))return false;return true}

// active skill info
function activeInfo(P,sk,lv){lv=Math.max(1,lv||1);const parts={};let baseMin=0,baseMax=0,arBonus=0,crit=0,range=(sk&&sk.range)||(sk&&sk.r)||80,cd=(sk&&sk.cd)||1.2,cost=sk?skCost(sk,lv):0,costLife=skCostLife(sk),hitCount=(sk&&sk.hits)||1,aoe=(sk&&sk.aoe)||0,ignore=0;
  if(!sk||!P) return {parts,dps:0,ar:P?P.ar:0,cost,cd,range,crit:0,ignore:0,hitCount:1,aoe:0,costLife};
  const dmgKeys={physicsdamage_v:"phys",physicsenhance_p:"phys",poisondamage_v:"poison",colddamage_v:"cold",firedamage_v:"fire",lightingdamage_v:"light"};
  for(const k in sk.attr){
    const v=skVal(sk,k,lv);if(!v)continue;
    if(dmgKeys[k]){const el=dmgKeys[k];if(k.endsWith("_p")){baseMin+=v[0]}else{parts[el]=(parts[el]||0)+v[0]}}
    if(k==="attackratingenhance_p"||k==="attackrating_v") arBonus+=v[0];
    if(k==="deadlystrikeenhance_p"||k==="deadlystrike_p") crit+=v[0];
  }
  const wep=P.basic||{dmin:0,dmax:0,parts:{phys:0}};
  let phys=(parts.phys||0);
  if(typeof isAttack==="function"?isAttack(sk):(sk.enemy&&!sk.aura)){
    const enh=baseMin||0;
    const pd=x=>x*(1+enh/100);
    phys += pd(((wep.dmin||0)+(wep.dmax||0))/2);
  }
  parts.phys=phys;
  const total=Object.values(parts).reduce((a,b)=>a+b,0);
  const spd=P.aspd||1;
  const dps=total*spd*hitCount/(cd>0?Math.max(0.3,cd):1);
  return {parts,dps,ar:(P.ar||0)*(1+arBonus/100),cost,cd,range:range||80,crit:(P.crit||0)+crit,ignore,hitCount,aoe,costLife,id:sk.id,useAR:!sk.noAR};
}

function heroAttr(k){if(!S)return 0;return (S.attr&&S.attr[k]||0) + (R&&R.P&&R.P[k+'BaseBonus']||0)}

function reqOk(it){if(!it||!it.req)return true;for(const [t,v] of it.req){if(typeof reqLineOk==="function"? !reqLineOk(t,v) : !reqLineOkLocal(t,v))return false}return true}
function reqLineOkLocal(t,v){if(t===36)return eqLevel()>=v; if(t===32)return heroAttr("str")>=v; if(t===33)return heroAttr("dex")>=v; if(t===34)return heroAttr("vit")>=v; if(t===35)return heroAttr("eng")>=v; if(t===37)return v<0||!FAC[S.fac]||heroSeries()===v; if(t===38)return v<0||(S.sex||0)===v; if(t===39)return v<0||!FAC[S.fac]||FAC[S.fac].id===v; if(t===46)return rebornN()>=v; return true}
function reqDeficit(it){const out={};if(!it||!it.req)return out;for(const [t,v] of it.req){const ok=typeof reqLineOk==="function"?reqLineOk(t,v):reqLineOkLocal(t,v); if(ok)continue; if(t===32)out.str=Math.max(out.str||0,v-heroAttr('str'));if(t===33)out.dex=Math.max(out.dex||0,v-heroAttr('dex'));if(t===34)out.vit=Math.max(out.vit||0,v-heroAttr('vit'));if(t===35)out.eng=Math.max(out.eng||0,v-heroAttr('eng'));}return out}
function reqProblems(it){if(!it||!it.req)return [];const p=[];for(const [t,v] of it.req){const ok=typeof reqLineOk==="function"?reqLineOk(t,v):reqLineOkLocal(t,v); if(!ok) p.push(typeof reqLineText==="function"?reqLineText(t,v):("Yêu cầu "+t+": "+v));}return p}
function reqOf(it,k){if(!it||!it.req)return 0;const r=it.req.find(x=>x[0]===k);return r?r[1]:0}
function sexReqOk(req){if(!req)return true;for(const [t,v] of req)if(t===38&&v>=0&&S&&(S.sex||0)!==v)return false;return true}
function sexOk(it){return sexReqOk(it&&it.req||[])}

// Build player stats
function calc(eq){eq=eq||(S&&S.eq)||{};const fac=FAC&&FAC[S.fac];const series=fac?fac.series:0;const lvl=S?S.lvl:1;const st=heroStart();
  const A={};
  const add=(k,v,s)=>addAttr(A,k,v,s);
  let str=20+(S&&S.attr&&S.attr.str||0),dex=20+(S&&S.attr&&S.attr.dex||0),vit=20+(S&&S.attr&&S.attr.vit||0),eng=20+(S&&S.attr&&S.attr.eng||0);
  if(st){str+=st.str||0;dex+=st.dex||0;vit+=st.vit||0;eng+=st.eng||0}
  let wmin=0,wmax=0; let wType=-1;
  for(const it of Object.values(eq)){if(!it)continue;
    for(const b of (it.base||[])){const id=b[0],mn=b[1],mx=b[2];const name=attrName(id); if(name==="durability_v"||name==="item_purple"||name==="staminamax_v") continue;
      if(id===28||id===29||id===30){const val=((mn+mx)/2)*enhMul(it); if(id===28)wmin+=val; if(id===29)wmax+=val;}
      else {add(name,[Math.round(((mn+mx)/2)*enhMul(it)),0,0]);}
    }
    if(it.d===1||it.d===0){wType=it.k}
  }
  const applyMag=(it,m)=>{
    const name=attrName(m.a); if(ATTR_NOEFFECT.has(name)) return;
    let p=(m.p||[0,0,0]).map(x=>x);
    const mul = (name==="allskill_v")?1:enhLineMul(it);
    if(mul!==1) p=p.map((x,i)=> (i<2&&x!==-1)?Math.round(x*mul):x);
    add(name,p);
  };
  for(const it of Object.values(eq)){if(!it)continue;
    const ha = (it.vio||it.set||it.d===10) ? 3 : hiddenActive(it,eq);
    (it.mag||[]).forEach((m,i)=>{ const hidden=i%2===1; if(!hidden||Math.floor(i/2)<ha) applyMag(it,m); });
    if(it.set){
      if(typeof goldEnhance=="function"){const ex=goldEnhance(it,eq); (it.ext||[]).forEach((m,i)=>{if(i<ex)applyMag(it,m)});} else {(it.ext||[]).forEach(m=>applyMag(it,m))}
    }
  }
  // passive skills (simplified): add skill attrs where applicable
  if(S&&S.sk){for(const id in S.sk){const lv=S.sk[id]; if(!lv) continue; const sk=SK&&SK[id]; if(!sk||!sk.attr) continue; if(typeof isAttack==="function"&&isAttack(sk)) continue; if(skKindSafe(sk)==="aura" && !skAppliesSafe(sk)) continue; if(skKindSafe(sk)==="buff" && !skAppliesSafe(sk)) continue; for(const k in sk.attr){if(SKIP_PASSIVE_STATS.test(k)) continue; const v=skVal(sk,k,Math.max(1,lv+skillBonusLv(id))); if(v) add(k,v);} }}

  let lifeBase=100+lvl*5+vit*5; let manaBase=50+lvl*3+eng*5;
  let life=lifeBase+av(A,"lifemax_v")+Math.round((av(A,"lifemax_p")||0)*lifeBase/100);
  let mana=manaBase+av(A,"manamax_v")+Math.round((av(A,"manamax_p")||0)*manaBase/100);
  const aspd=1.0*(1+(av(A,"attackspeed_v")||0)/100);
  const walk=(av(A,"fastwalkrun_p")||0);
  const castsp=(av(A,"castspeed_v")||0);
  const res={}; for(const e of ELEM) res[e]=clamp((av(A,ELEM_RES[e])||0)+(av(A,"allres_p")||0), -PLAYER_RES_MAX, MAX_RESIST);
  const res5=av(A,"allres_p5")||0; const resMax={}; for(const e of ELEM) resMax[e]=MAX_RESIST;
  const def=(av(A,"adddefense_v")||0)+dex*2;
  const ar=(av(A,"attackrating_v")||0)+(av(A,"attackratingenhance_v")||0)+dex*5+lvl*5;
  let dmgPhysMin=wmin, dmgPhysMax=wmax;
  dmgPhysMin += av(A,"addphysicsdamage_v")||0; dmgPhysMax += av(A,"addphysicsdamage_v")||0;
  const dmgEnh=(av(A,"addphysicsdamage_p")||0);
  dmgPhysMin=Math.round(dmgPhysMin*(1+dmgEnh/100)); dmgPhysMax=Math.round(dmgPhysMax*(1+dmgEnh/100));
  if(dmgPhysMax<dmgPhysMin)dmgPhysMax=dmgPhysMin;
  if(dmgPhysMax<=0){dmgPhysMin=1+Math.floor(str/5); dmgPhysMax=3+Math.floor(str/5)}
  const basic={id:"basic",n:"Đánh thường",dmin:dmgPhysMin,dmax:dmgPhysMax,parts:{phys:(dmgPhysMin+dmgPhysMax)/2},crit:av(A,"deadlystrikeenhance_p")||0,cd:1/Math.max(0.2,aspd),range:(wType>=100?200:70),cost:0,costLife:false,useAR:true,aspd:aspd,dps:0,wpn:true,hitCount:1};
  basic.dps = basic.parts.phys*aspd;
  let main=basic; let wantId=S&&S.main; if(wantId==="basic"||!wantId){wantId=null}
  if(wantId && SK&&SK[wantId] && (S.sk[wantId]||0)>0){
    const inf=activeInfo({ar,aspd,basic,crit:av(A,"deadlystrikeenhance_p")||0,plusSkill:av(A,"allskill_v")||0}, SK[wantId], skLv(wantId));
    main=Object.assign({n:SK[wantId].n,id:+wantId,wpn:(typeof isAttack==="function"?isAttack(SK[wantId]):true)},inf);
    if(!main.parts) main.parts={phys:basic.parts.phys};
  }
  const plusSkill=av(A,"allskill_v")||0;
  const P={
    lvl,series,str,dex,vit,eng,life:Math.max(1,Math.round(life)),mana:Math.max(1,Math.round(mana)),
    ar:Math.round(ar),def:Math.round(def),res,res5,resMax,
    aspd,walk,castsp,
    lifeRegen:(av(A,"lifereplenish_v")||0)+(newbieOn()?Math.round(life*NEWBIE_REGEN.life):0),
    manaRegen:(av(A,"manareplenish_v")||0)+(newbieOn()?Math.round(mana*NEWBIE_REGEN.mana):0),
    regen:(av(A,"lifereplenish_v")||0),
    crit:av(A,"deadlystrikeenhance_p")||0, heavy:av(A,"fatallystrikeenhance_p")||0, fatal:av(A,"fatallystrikeenhance_p")||0,
    ignore:av(A,"ignoredefenseenhance_v")||0,
    leech:av(A,"steallife_p")||av(A,"steallifeenhance_p")||0, manaLeech:av(A,"stealmana_p")||av(A,"stealmanaenhance_p")||0,
    skLeech:av(A,"skillsteallife_p")||0, skMLeech:av(A,"skillstealmana_p")||0,
    sorb:av(A,"sorbdamage_p")||0, block:av(A,"blockrate_p")||0,
    dmgShield:av(A,"meleedamagereturn_p")||0, dmg2mana:av(A,"damage2addmana_p")||0, manaShield:av(A,"manashield_p")||0,
    hitRec:av(A,"fasthitrecover_v")||0, retMelee:av(A,"meleedamagereturn_v")||0, retMeleeP:av(A,"meleedamagereturn_p")||0, retRangeP:av(A,"rangedamagereturn_p")||0,
    breakRes:av(A,"ignoreres_p")||0, knock:av(A,"knockback_p")||0, stunAdd:av(A,"stun_p")||0, stunLong:av(A,"stunenhance_p")||0,
    poisonRed:av(A,"poisontimereduce_p")||0, freezeRed:av(A,"freezetimereduce_p")||0, stunRed:av(A,"stuntimereduce_p")||0,
    antiStun:av(A,"anti_stun_p")||av(A,"stuntimereduce_p")||0, antiBlock:av(A,"anti_block_p")||0, antiSorb:av(A,"anti_sorb_p")||0,
    coldEnh:av(A,"coldenhance_p")||0, expPct:av(A,"expenhance_p")||0, lucky:av(A,"lucky_v")||0,
    plusSkill, skAdd:(S&&S.skAdd)||{},
    basic, main, actives:collectActives(), parts:{}, series5:0, anti:{}, antiRes:0, antiMax:0, wmin:dmgPhysMin,wmax:dmgPhysMax,ranged:wType>=100,
    wantId: (S&&S.main&&S.main!=="basic")?S.main:null, _raw:A
  };
  for(const e of ELEM){P.anti[e]=(av(A,"anti_"+ELEM_RES[e])||0); if(P.anti[e]>P.antiMax)P.antiMax=P.anti[e];}
  P.antiRes=P.antiMax;
  if(typeof buffP=="function") P.expPct += buffP("xp")*100;
  if(typeof allyAuraAttr=="function") try{allyAuraAttr(A)}catch(e){}
  return P;
}

function skKindSafe(sk){try{return typeof skKind==="function"?skKind(sk):(sk&&sk.aura?"aura":"passive")}catch(e){return "passive"}}
function skAppliesSafe(sk){try{return typeof skApplies==="function"?skApplies(sk):true}catch(e){return true}}

function collectActives(){const a=[]; if(!S||!S.sk)return a; for(const id in S.sk){const sk=SK&&SK[id]; if(sk && (typeof isAttack==="function"?isAttack(sk):sk.enemy) && S.sk[id]>0) a.push({id:+id,lv:skLv(id),sk})} return a}

function power(P){if(!P)return 0; const dps=(P.main&&P.main.dps||P.basic&&P.basic.dps||1); const ehp=(P.life||1)*(1+(P.def||0)/500)*(1+Object.values(P.res||{}).reduce((a,b)=>a+(b||0),0)/500);
  return Math.round(dps*20 + ehp/5 + (P.ar||0)/2 + (P.crit||0)*5 + (P.plusSkill||0)*50)}
function powerShown(p){return Math.round(p||0)}

function equipCompare(it){const eq=S&&S.eq||{}; const slot=typeof slotFor==="function"?slotFor(it):"weapon"; let baseP; try{baseP=R&&R.P||calc(eq)}catch(e){baseP=calc(eq)}
  const basePow=power(baseP); const baseDps=(baseP.main&&baseP.main.dps||0);
  const eq2=Object.assign({},eq); eq2[slot]=it; let newP; try{newP=calc(eq2)}catch(e){newP=baseP}
  const newPow=power(newP); const newDps=(newP.main&&newP.main.dps||0);
  const avgR=p=>ELEM.reduce((a,e)=>a+(p.res&&p.res[e]||0),0)/5;
  const gain=basePow? (newPow/basePow-1):0; const dpsg=baseDps?(newDps/baseDps-1):0; const life=newP.life-baseP.life; const def=newP.def-baseP.def; const res=avgR(newP)-avgR(baseP);
  const why=[]; if(dpsg>0.001) why.push(`DPS tăng ${pctTxt(dpsg)}`); else if(dpsg<-0.001) why.push(`DPS giảm ${pctTxt(dpsg)}`); if(life) why.push(`Sinh lực ${life>0?"+":""}${Math.round(life)}`); if(def) why.push(`Né tránh ${def>0?"+":""}${Math.round(def)}`); if(Math.abs(res)>0.05) why.push(`Kháng TB ${res>0?"+":""}${res.toFixed(1)}%`); if(!why.length) why.push("Thay đổi nhỏ hoặc ngang nhau");
  return {gain,dps:dpsg,life,def,res,why,power:newPow}}

function lucTay(atk){if(!atk)return 0; if(atk.dps) return Math.round(atk.dps); const avg=((atk.dmin||0)+(atk.dmax||0))/2 || (atk.parts?Object.values(atk.parts).reduce((a,b)=>a+b,0):0); return Math.round(avg*(atk.aspd||1))}

function pctTxt(v){return (v>0?"+":"")+ (v*100).toFixed(1)+"%"}
function numTxt(v){return (v>0?"+":"")+Math.round(v)}

function setCounts(eq){eq=eq||(S&&S.eq)||{};const c={};for(const it of Object.values(eq)){if(it&&it.set) c[it.set.grp]=(c[it.set.grp]||0)+1}return c}
function setMembers(it){if(!it||!it.set) return []; const kind=it.set.kind; const rows=(J.sets&&J.sets[kind])||[]; return rows.filter(r=>r.grp===it.set.grp)}
function goldEnhance(it,eq){eq=eq||(S&&S.eq)||{}; if(!it||!it.set) return 0; const c=setCounts(eq)[it.set.grp]||0; const n1=it.set.n1||2,n2=it.set.n2||6; if(c>=n2) return (it.ext||[]).length; return Math.floor(c/n1)}
function autoSpendAttrs(){if(!S||S.autoPts!==true) return 0; let n=0; const fac=FAC&&FAC[S.fac]; const pref=(fac&&fac.attrPref)||["str","dex","vit","eng"]; while(S.attrPts>0){const k=pref[n%pref.length]||"str"; S.attr[k]=(S.attr[k]||0)+1; S.attrPts--; n++;} if(n){R.dirty=true;} return n}
function autoSpendSkills(){if(!S||S.autoPts!==true) return 0; let n=0; const fac=FAC&&FAC[S.fac]; if(!fac) return 0; const skills=fac.skills||[]; while(S.skPts>0){let learned=false; for(const id of skills){const sk=SK&&SK[id]; if(sk&&canLearn(sk)){if(typeof skLearn==="function")skLearn(id); else {S.skPts--; S.sk[id]=(S.sk[id]||0)+1;} n++; learned=true; break;}} if(!learned) break;} if(n){R.dirty=true;} return n}
function suggestModal(){const plan=gearReqPlan(); let html=`<h3>Gợi ý cộng điểm</h3>`; if(plan.total<=0){html+=`<p class="dim">Không cần cộng thêm để mặc trang bị hiện tại.</p>`} else {html+=`<p>Cần <b>${plan.total}</b> điểm tiềm năng${S.attrPts>=plan.total?` (đang có ${S.attrPts})`:`, đang có ${S.attrPts}`}.</p>`; html+=`<div class="btnrow">${S.attrPts>=plan.total?'<button class="btn" id="bFixReq">Cộng điểm đủ điều kiện</button>':''}<button class="btn" id="bAutoA">Tự cộng theo môn phái</button></div>`}
  modal(html,()=>{const b=$("#bFixReq"); if(b)b.onclick=()=>{gearReqApply();closeModal(true);typeof refresh==="function"&&refresh()}; const ba=$("#bAutoA"); if(ba)ba.onclick=()=>{S.autoPts=true;autoSpendAttrs();closeModal(true);typeof refresh==="function"&&refresh();save();};});}
function gearReqPlan(){const need={str:0,dex:0,vit:0,eng:0}; for(const it of Object.values((S&&S.eq)||{})){if(!it)continue; const d=reqDeficit(it); for(const k in d) need[k]=Math.max(need[k],d[k])} return {need,total:Object.values(need).reduce((a,b)=>a+b,0)}}
function gearReqApply(){const plan=gearReqPlan(); if(plan.total<=0) return 0; if(S.attrPts<plan.total) return 0; for(const k in plan.need){S.attr[k]=(S.attr[k]||0)+plan.need[k]; S.attrPts-=plan.need[k]} R.dirty=true; recalc(); return plan.total}
function unspendAttr(k){if(!S||!(S.attr[k]>0))return false; S.attr[k]--; S.attrPts++; R.dirty=true; recalc(); typeof refresh==="function"&&refresh(); save(); return true}
function lucTayOf(P,side){if(!P)return 0; return lucTay(side==="left"?P.basic:P.main)}
