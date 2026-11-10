"use strict";const dayKey=t=>`${t.getFullYear()}-${t.getMonth()+1}-${t.getDate()}`,today=()=>dayKey(new Date),GB_EVERY=1800,GB_RETRY=300,REBORN_LV=200,REBORN_MAX=10,FD_COST=10;function RW(){const t=S.rw||(S.rw={});return t.stat=Object.assign({kills:0,bosses:0,goldBoss:0,picked:0,towerBest:0,reborn:0,chests:0,tokens:0},t.stat||{}),t.login=Object.assign({last:"",streak:0,total:0,got:{},claimed:!0},t.login||{}),t.towerRst!==1&&(t.stat.towerBest=0,t.towerRst=1,delete S.resumeTower),t.ach=t.ach||{},t.title=t.title||"",t.fd=t.fd||0,t.gbT==null&&(t.gbT=1800),t.pet=t.pet||null,t}const potTierNow=t=>{let n=t||1;for(let o=1;o<POT_TIER_LV.length;o++)S.lvl>=POT_TIER_LV[o]&&(n=Math.max(n,o));return n},buffTxt=(t,n,o)=>t==="luck"?`Quế Hoa Tửu +${n} may mắn trong ${o} phút`:`${BUFF_VI[t]} +${Math.round(n*100)}% trong ${o} phút`;function htRandLv(){return irnd(1,HT_MAX)}function htRandGive(t){const n={};for(let o=0;o<t;o++){const s=htRandLv();n[s]=(n[s]||0)+1,matAdd("ht",s,1)}return Object.keys(n).sort((o,s)=>s-o).map(o=>`${n[o]} Huyền Tinh cấp ${o}`).join(", ")}function grant(t,n){const o=[];if(t.gold){const s=Math.round(t.gold*(1+S.lvl/10));S.gold+=s,o.push(`${fmtL(s)} lượng`)}if(t.pot){const s=potTierNow(t.pot.tier),e=potStock(t.pot.kind),i=J.potions.find(c=>c.kind===t.pot.kind&&c.tier===s);e[s]=(e[s]||0)+t.pot.n,o.push(`${t.pot.n} ${i?i.n:"bình thuốc"}`)}if(t.ht&&t.htr)o.push(htRandGive(t.ht));else if(t.ht){const s=clamp(Math.floor(S.lvl/15)+1,1,HT_MAX);matAdd("ht",s,t.ht),o.push(`${t.ht} Huyền Tinh cấp ${s}`)}if(t.fd&&(RW().fd+=t.fd,o.push(`${t.fd} Phúc Duyên`)),t.knb){const s=t.knb*KNB_K;S.knb=(S.knb||0)+s,o.push(`${s} Kim Nguyên Bảo`)}if(t.item){const s=(()=>{const e=irnd(0,9);return makeItem(e,sexPart(e,0),clamp(Math.round(S.lvl/12)+1,1,10),t.item)})();s&&(addItem(s,!0,!0,!0),o.push(esc(s.n)))}if(t.set&&!t.common&&goldMul("grant")<1&&Math.random()>=goldMul("grant")*HK_GRANT_K){const s=clamp(Math.floor(S.lvl/15)+1,1,HT_MAX);matAdd("ht",s,2),o.push(`2 Huyền Tinh cấp ${s}`)}else if(t.set){const s=forceSetItem(t.common);s&&(addItem(s,!0,!0,!0),o.push(`<b style="color:${RAR_COL[s.r]}">${esc(s.n)}</b>`))}if(t.pts&&(S.attrPts+=t.pts,o.push(`${t.pts} điểm tiềm năng`)),t.buff)for(const s in t.buff){const[e,i]=t.buff[s];addBuff(s,e,i),o.push(buffTxt(s,e,i))}if(t.skp&&(S.skPts=(S.skPts||0)+t.skp,o.push(`${t.skp} điểm kỹ năng`)),t.xp&&S.lvl<levelCap()){const s=S.lvl;gainXp(J.exp[S.lvl-1]*t.xp/XP_EVENT),o.push(S.lvl>s?`kinh nghiệm (lên cấp ${S.lvl})`:`${Math.round(t.xp*1e3)/10}% kinh nghiệm`)}if(t.misc)for(const s in t.misc)t.misc[s]>0&&(matAdd("misc",s,t.misc[s]),o.push(`<b style="color:#ffd24a">${t.misc[s]} ${miscName(s)}</b>`));return o.length&&!R.batch&&(log(`🎁 ${esc(n)}: ${o.join(", ")}`),R.quiet||uiSfx("learn"),save()),o}const EVENT_GOLD=/^(An Bang|Định Quốc|Hiệp Cốt|Nhu Tình|Kim Phong|Thiên Hoàng|Động Sát)/i;function forceSetItem(t,n){const o=FAC[S.fac]?FAC[S.fac].id:-1,s=S.lvl+15,e=(l,r)=>(l.req.find(h=>h[0]===r)||[0,-1])[1],i=J.sets.gold.filter(l=>sexReqOk(l.req)&&setRowOk(l)&&setVerOk(l,S.lvl));if(t){const l=J.sets.gold.filter(a=>sexReqOk(a.req)&&setRowOk(a)&&e(a,39)<0&&EVENT_GOLD.test(a.n)),r=l.filter(a=>e(a,36)<=s&&setVerOk(a,S.lvl)),h=l.filter(a=>e(a,36)<=s),f=r.length?r:h.length?h:l;return f.length?makeSetItem("gold",pick(f),5):null}if(!n&&Math.random()>=HKMP_GRANT){const l=i.filter(r=>e(r,39)<0&&e(r,36)<=s);if(l.length)return makeSetItem("gold",pick(l),5)}let c=i.filter(l=>e(l,39)===o&&e(l,36)<=s);return c.length||(c=i.filter(l=>e(l,36)<=s)),c.length||(c=i.filter(l=>e(l,39)===o)),c.length?makeSetItem("gold",pick(c),5):null}const LOGIN7=[{ht:2,knb:1,buff:{xp:[.3,30]}},{fd:5,ht:2},{fd:10,knb:1,misc:{ldt:1}},{ht:3,knb:1},{item:5,ht:2,buff:{luck:[20,30]}},{fd:15,knb:2,buff:{tt:[.5,30]}},{set:1,fd:30,knb:5,misc:{rngua:1}}],LOGIN30={10:{ht:5,pts:10,knb:10,misc:{lb:1}},20:{set:1,pts:20,knb:15,misc:{rngua:1}},30:{set:1,fd:80,pts:30,knb:25,misc:{dtbk:1}}},login30Of=t=>{const n=(t-1)%30+1,o=LOGIN30[n];if(!o)return null;if(t<=30)return o;const s=Object.assign({},o);return s.pts&&(s.fd=(s.fd||0)+s.pts*2,delete s.pts),s};function loginCheck(){if(!S||!S.fac)return;const t=RW().login,n=today();if(t.last===n)return;const o=new Date;o.setDate(o.getDate()-1),t.streak=t.last===dayKey(o)?t.streak+1:1,t.last=n,t.total++,t.claimed=!1,RW().dq&&delete RW().dq,dotGift()}function claimLogin(){const t=RW().login;if(t.claimed)return;t.claimed=!0,grant(LOGIN7[(t.streak-1)%7],`Điểm danh ngày ${t.streak}`);const n=login30Of(t.total);n&&!t.got[t.total]&&(t.got[t.total]=1,grant(n,`Điểm danh ${t.total} ngày`)),achCheck()}const LV_MS=[[10,{ht:2,pot:{kind:"life",tier:1,n:20},knb:2},"Mở khóa: tháp thử thách"],[20,{buff:{xp:[.3,30]},pot:{kind:"mana",tier:1,n:20},fd:10,knb:2,misc:{ldt:1}},"Mở khóa: đồng hành"],[30,{item:5,fd:10,ht:2,knb:3},""],[40,{buff:{luck:[20,30]},pot:{kind:"life",tier:1,n:20},pts:3,ht:2,knb:3},""],[50,{item:6,fd:15,ht:3,knb:5},"Danh hiệu «Thiếu hiệp»"],[60,{buff:{xp:[.3,30]},pot:{kind:"mana",tier:1,n:20},pts:3,ht:3,knb:5,misc:{lb:1}},""],[70,{set:1,fd:20,ht:3,knb:5},""],[80,{misc:{rngua:1},pot:{kind:"life",tier:1,n:20},pts:4,ht:4,knb:6},""],[90,{item:6,fd:20,ht:4,knb:10,buff:{xp:[.3,30]}},""],[95,{set:1,fd:25,pts:5,ht:4,knb:6},"Danh hiệu «Đại hiệp»"],[97,{buff:{tt:[.5,30]},pot:{kind:"both",tier:1,n:20},fd:20,knb:6},""],[99,{set:1,fd:30,pts:5,ht:5,knb:8},"Danh hiệu «Tông sư»"],[110,{fd:30,ht:5,knb:8,buff:{xp:[.5,30]}},""],[120,{set:1,fd:30,pts:5,ht:5,knb:8,buff:{drop:[.5,30]}},""],[135,{item:6,fd:40,ht:6,knb:10,buff:{xp:[.5,45]}},""],[150,{set:1,fd:50,pts:8,ht:6,knb:12,buff:{xp:[1,30]}},""],[165,{fd:50,ht:6,knb:10,buff:{drop:[1,30]}},""],[180,{set:1,fd:60,pts:10,ht:8,knb:12,buff:{xp:[1,45]}},""],[190,{set:1,fd:60,ht:8,knb:12,buff:{drop:[1,45]}},""],[200,{set:1,fd:100,pts:15,ht:10,knb:25,buff:{xp:[1,60],drop:[1,60]}},"Cấp tối đa · mở khóa chuyển sinh"]],LV_MS_RB=[[10,{fd:15,knb:3,buff:{xp:[.5,30]}},""],[30,{item:6,fd:15,ht:3,knb:4,buff:{drop:[.5,30]}},""],[50,{set:1,fd:20,ht:4,knb:6,buff:{xp:[.5,45]}},""],[80,{fd:25,ht:5,knb:6,buff:{xp:[1,30]}},""],[100,{set:1,pts:5,ht:6,knb:8,buff:{drop:[1,30]}},""],[130,{set:1,fd:40,ht:6,knb:8,buff:{xp:[1,45]}},""],[160,{set:1,fd:50,pts:8,ht:8,knb:10,buff:{xp:[1,45],drop:[1,45]}},""],[200,{set:1,fd:100,pts:15,ht:10,knb:20,buff:{xp:[1.5,60],drop:[1,60]}},"Mở khóa chuyển sinh lần sau"]],lvMsList=()=>rebornN()?LV_MS_RB:LV_MS,lvKey=t=>rebornN()?rebornN()+":"+t:t,TOWER_LV=10,PET_LV=20,unlocked=t=>S.lvl>=t||RW().stat.reborn>0;function lvMsReady(){const t=RW().lvGot||{};return lvMsList().filter(([n])=>S.lvl>=n&&!t[lvKey(n)])}function claimLvMs(t){const n=RW(),o=lvMsList().find(s=>s[0]===t);n.lvGot=n.lvGot||{},!(!o||S.lvl<t||n.lvGot[lvKey(t)])&&(n.lvGot[lvKey(t)]=1,grant(o[1],`Mốc cấp ${t}${rebornN()?` (chuyển sinh ${rebornN()})`:""}`),achCheck(),refreshGift())}const BUFF_VI={xp:"Kinh nghiệm",drop:"Tỉ lệ rơi đồ",tt:"Tiên Thảo Lộ",luck:"May mắn"},BUFF_IC={xp:"⏫",drop:"🎲",tt:"🌿",luck:"🍶"},BUF=()=>S.buf||(S.buf={});function buffP(t){const n=S&&S.buf&&S.buf[t];return n&&n.until>Date.now()?n.p:0}function addBuff(t,n,o){const s=BUF(),e=Date.now(),i=s[t];i&&i.until>e?s[t]=n>=i.p?{p:n,until:i.until+o*6e4}:{p:i.p,until:i.until+o*6e4*n/i.p}:s[t]={p:n,until:e+o*6e4}}function buffText(){const t=Date.now(),n=[];for(const o in BUFF_VI){const s=S.buf&&S.buf[o];if(!s||s.until<=t)continue;const e=Math.round((s.until-t)/1e3);n.push(`${BUFF_IC[o]} ${BUFF_VI[o]} +${o==="luck"?Math.round(s.p):Math.round(s.p*100)+"%"} <small class="dim">${Math.floor(e/60)}:${String(e%60).padStart(2,"0")}</small>`)}return n.join(" · ")}function questTick(t,n=1){S&&S.fac&&t==="picked"&&(RW().stat.picked+=n)}const ACH=[["lv30","Xuất sơn",()=>S.lvl>=30||RW().stat.reborn>0,{ht:2,knb:2},["lifemax_p",3]],["lv50","Thiếu hiệp",()=>(RW().lvGot||{})[50],{fd:10,knb:3},["lifemax_p",4]],["lv80","Danh chấn giang hồ",()=>S.lvl>=80||RW().stat.reborn>0,{fd:10,pts:10,knb:5},["attackspeed_v",3]],["lv100","Đại hiệp",()=>(RW().lvGot||{})[95]||(RW().lvGot||{})[100],{fd:20,knb:5},["allres_p",4]],["lv150","Tông sư",()=>(RW().lvGot||{})[99]||(RW().lvGot||{})[150],{fd:30,knb:8},["allres_p",6]],["k1000","Sát thủ",()=>RW().stat.kills>=1e3,{fd:10,knb:2},["manamax_p",4]],["k10000","Vạn nhân địch",()=>RW().stat.kills>=1e4,{set:1,knb:5},["attackspeed_v",5]],["b50","Diệt trùm",()=>RW().stat.bosses>=50,{fd:20,ht:3,knb:3},["allres_p",3]],["zone8","Nửa giang sơn",()=>S.maxStage>=STAGES/2,{fd:15,ht:3,knb:3},["fastwalkrun_p",5]],["zone16","Trường Bạch sơn chủ",()=>S.maxStage>STAGES,{set:1,pts:20,knb:10},["lifemax_p",6]],["setfull","Hoàng Kim đủ bộ",()=>enoughToActive(S.eq),{fd:30,knb:10},["allres_p",5]],["tower20","Leo tháp tầng 20",()=>RW().stat.towerBest>=20,{set:1,knb:5},["attackspeed_v",6]],["reborn1","Chuyển sinh",()=>RW().stat.reborn>=1,{fd:50,knb:20},["lifemax_p",8]],["gold5","Săn trùm Hoàng Kim",()=>RW().stat.goldBoss>=5,{fd:20,ht:4,knb:8},["lucky_v",10]],["login30","Giang hồ lão luyện",()=>RW().login.total>=30,{set:1,knb:10},["manamax_p",6]]];function achCheck(){if(!S||!S.fac)return;const t=RW();for(const[n,o,s,e]of ACH)!t.ach[n]&&s()&&(t.ach[n]=1,grant(e,`Thành tựu «${o}»`),R.quiet||toast(`Thành tựu: ${o}`),dotGift());typeof titleCheck=="function"&&titleCheck()}function goldBossTick(t){S.fac&&!R.town&&!R.tower&&!R.dg&&(RW().gbT-=t)}function goldBossDue(){return!R.tower&&!R.dg&&RW().gbT<=0}function spawnGoldBoss(){const t=zoneOf(Math.min(S.stage,STAGES)),n=Math.min(stageLevel(S.stage),S.lvl)+2,[o,s]=inWorld(H.x+240,H.y-120),e=makeEnemy(t.boss,n,"boss",o,s);e.hp=e.max=e.max*2,e.dmg*=1.15,e.goldBoss=!0,e.n="Trùm Hoàng Kim · "+bossName(t.boss,t.n),R.enemies.push(e),RW().gbT=1800,R.banner={t:2.5,text:"Trùm Hoàng Kim xuất hiện!",sub:"Hạ để nhận đồ Hoàng Kim"},log('<b style="color:#ffb52e">Trùm Hoàng Kim xuất hiện!</b>')}function offlineChests(t){let n=0;return t>=3600&&(grant({ht:2,pot:{kind:"life",tier:2,n:5}},"Tu luyện 1 giờ"),n++),t>=4*3600&&(grant({fd:10,buff:{xp:[.3,30]}},"Tu luyện 4 giờ"),n++),t>=8*3600-60&&(grant({set:1,fd:20},"Tu luyện 8 giờ"),n++),n}function towerStart(){if(R.dg){toast("Đang ở phó bản");return}if(R.town&&backFromTown(),R.deadT>0){toast("Đang trọng thương, chờ hồi phục");return}typeof leaveZoneReset=="function"&&leaveZoneReset(),R.tower={floor:Math.max(1,RW().stat.towerBest-4)},R.enemies=[],R.corpses=[],R.spawnT=1.2,R.stall=0,R.life=R.P.life,R.mana=R.P.mana,towerMap(),R.banner={t:2,text:`${TOWER_MAP.n} · tầng ${R.tower.floor}`,sub:"Qua tầng không hồi sinh lực · gục ngã là rời tháp"},closeModal(!0),log(`🗼 Dịch chuyển vào <b>${TOWER_MAP.n}</b>, tầng ${R.tower.floor}.`)}const TOWER_MAP={id:397,mus:50,n:"Thông Thiên Tháp"};function towerMap(){!window.JMO||!window.JMO[String(TOWER_MAP.id)]||(R.zoneShown="tower",obsLoad(TOWER_MAP.id),[H.x,H.y]=inWorld(WORLD.w/2,WORLD.h/2),snapCamera(),R.bgImg=img(`img/z/${TOWER_MAP.id}.jpg`),playMusic(TOWER_MAP.mus||TOWER_MAP.id))}function towerPilot(t){if(!(S.mode!=="tower"||!S.fac||R.tower||R.dg||R.deadT>0||R.sat)&&(R.towerPilotT=(R.towerPilotT||0)-t,!(R.towerPilotT>0))){if(R.towerPilotT=4,!unlocked(TOWER_LV)){S.mode="farm",toast(`Leo Tháp cần cấp ${TOWER_LV}`);return}R.town&&backFromTown(),towerStart()}}const towerLevel=t=>Math.min(levelCap(),10+t*4),towerOver=t=>Math.max(0,t-Math.ceil((levelCap()-10)/4)),TOWER_OVER_K=5e-4,TOWER_OVER_STEP=5,towerPct=t=>Math.floor(towerOver(t)/TOWER_OVER_STEP)*TOWER_OVER_K,towerMul=t=>{const n=towerPct(t);return{hp:1+n,dmg:1+n}};function towerSpawn(){const t=R.tower.floor,n=towerLevel(t),o=ZONES[Math.min(ZONES.length-1,Math.floor(t/3))],s=t%5===0;R.enemies=[],R.stall=0,R.stallHp=null;const e=s?1:3+t%3,i=towerMul(t);for(let c=0;c<e;c++){const[l,r]=inWorld(H.x+rnd(-260,260),H.y+rnd(-220,220)),h=makeEnemy(s?o.boss:pick(o.m),n,s?"boss":"elite",l,r);h.hp=h.max=Math.round(h.max*i.hp),h.dmg*=i.dmg,R.enemies.push(h)}}function towerCleared(){const t=RW(),n=R.tower.floor;if(n>t.stat.towerBest)if(t.stat.towerBest=n,n%5===0){const o=R.batch;R.batch=!0;const s=grant({fd:10},"")||[],e=towerMpShard();R.batch=o,e&&s.push(`<b style="color:#ffd24a">${e}</b>`);const i=forceSetItem(!1);i&&(addItem(i,!0,!0,!0),s.push(`<b style="color:${RAR_COL[i.r]}">${esc(i.n)}</b>`)),s.push(`<b style="color:#9fe8ff">${mysChest()} Thần Bí Khoáng Thạch</b>`),log(`🎁 Tháp tầng ${n}: ${s.join(", ")}`),save()}else grant({ht:1,htr:1,fd:2},`Tháp tầng ${n}`);else n%5===0&&log(`🎁 Tháp tầng ${n}: <b style="color:#9fe8ff">${mysChest()} Thần Bí Khoáng Thạch</b>`);questTick("tower"),achCheck(),R.tower.floor++,R.spawnT=1.5,R.banner={t:1.5,text:`Tầng ${R.tower.floor}`,sub:`Quái cấp ${towerLevel(R.tower.floor)}${towerPct(R.tower.floor)?` · quái mạnh thêm ${+(towerPct(R.tower.floor)*100).toFixed(2)}%`:""}`}}function towerMpShard(){const t=[...shardRows.values()].filter(o=>reqOfRow(o,39)>=0&&setRowOk(o));if(!t.length)return null;const n=pick(t);return matAdd("shard",n.n),`Mảnh ${n.n} (${matHave("shard",n.n)}/${SHARDS[n.n]})`}function towerExit(t){if(R.tower){if(log(`${t?"Gục ở":"Rời"} tháp thử thách tầng ${R.tower.floor}. Kỷ lục: ${RW().stat.towerBest}`),t&&S.mode==="tower"&&(S.mode="farm",R.dgPilotT=0,log("⚔ Gục ngã trong Tháp: chuyển sang chế độ <b>Luyện Công</b>."),toast("Gục ở Tháp — chuyển sang Luyện Công"),R.afterTowerMap=!0),R.tower=null,R.enemies=[],R.corpses=[],S.wave=1,R.spawnT=.5,R.zoneShown=null,R.field=null,typeof onZoneChange=="function"){const n=zoneOf(Math.min(S.stage,STAGES));R.zoneShown=n.id,onZoneChange(n)}R.afterTowerMap&&(R.afterTowerMap=!1,typeof autoMapCheck=="function"&&S.autoMap!==!1&&autoMapCheck())}}const REB_HP=.25,REB_DMG=.15,REB_ATTR=5,REB_SK=1;function rebornHard(){const t=S&&S.rw&&S.rw.stat&&S.rw.stat.reborn||0;return{hp:1+REB_HP*t,dmg:1+REB_DMG*t}}function rebornBonus(){const t=S.rw&&S.rw.stat&&S.rw.stat.reborn||0;return{xp:-.1*Math.min(5,t),dmg:.1*t}}function doReborn(){const t=RW();if(S.lvl<200||t.stat.reborn>=20||!confirm("Chuyển sinh: về cấp 1, giữ trang bị. Toàn bộ điểm tiềm năng và kỹ năng cũ bị tẩy (giữ nguyên võ công 90 đã luyện), nhận điểm thưởng chuyển sinh. Quái mạnh hơn. Tiếp tục?"))return;t.stat.reborn++,delete S.tanthuXp;const n=t.stat.reborn,o=FAC[S.fac].starter,s=S.bkOk||(S.bkOk={});for(const i in S.sk)SK[i]&&SK[i].book&&(s[i]=1);S.lvl=1,S.xp=0,S.attr={str:0,dex:0,vit:0,eng:0},S.attrPts=REB_ATTR+(S.bonusAtp||0);const e={};for(const i in S.sk)SK[i]&&SK[i].tier===90&&S.sk[i]>0&&!(typeof isBr90=="function"&&isBr90(i))&&(e[i]=S.sk[i]);S.sk=Object.assign({},e),S.skPts=REB_SK+(S.bonusSkp||0),o&&(S.sk[o]=1,S.main=o),S.mainLock=!1,S.slots=[0,0,0,0],S.stage=1,S.wave=1,R.tower=null,R.enemies=[],R.dirty=!0,R.zoneShown=null,log(`<b class="up">Chuyển sinh lần ${n}!</b> Tẩy toàn bộ điểm cũ (giữ võ công 90${Object.keys(e).length?": "+Object.keys(e).map(i=>SK[i].n+" "+e[i]).join(", "):""}), nhận ${REB_ATTR} tiềm năng + ${REB_SK} điểm kỹ năng · −${n*10}% kinh nghiệm, +${n*10}% sát thương · quái +${Math.round(REB_HP*n*100)}% máu, +${Math.round(REB_DMG*n*100)}% sát thương`),S.autoPts===!0?(autoSpendAttrs(),autoSpendSkills()):gearReqPlan().total&&toast("Bấm Gợi ý ở thẻ Nhân vật: cộng đủ điểm cho bộ đồ đang mặc"),typeof fillSlots=="function"&&(fillSlots(),renderPad()),achCheck(),closeModal(!0),refresh(),save()}// Hệ thống Đồng Hành (Pet Companion) chuẩn SrcDev: 18 loài pet, 36 chiêu thức độc quyền, hiệu ứng và vai trò
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
function eventNow(){const t=new Date().getMonth()+1;return t===1||t===2?{n:"Tết Nguyên Đán",token:"Bánh Chưng",col:"#ff5a4a"}:t===9||t===10?{n:"Tết Trung Thu",token:"Bánh Trung Thu",col:"#ffd24a"}:t===12?{n:"Giáng Sinh",token:"Chuông Bạc",col:"#9fe3ff"}:{n:"Hội Võ Lâm",token:"Lệnh Bài Võ Lâm",col:"#c8a2ff"}}const EVENT_SHOP=[[10,{buff:{xp:[.3,30]}}],[15,{knb:2}],[25,{ht:3}],[30,{item:6}],[35,{misc:{ldt:1}}],[40,{fd:30}],[50,{knb:8}],[60,{set:1,common:1}],[80,{misc:{rngua:1}}]];function eventBuy(t){const[n,o]=EVENT_SHOP[t],s=RW().stat;if(s.tokens<n){toast(`Cần ${n} ${eventNow().token}`);return}s.tokens-=n,grant(o,eventNow().n),refreshGift()}const FD_TABLE=[[32,{knb:1}],[16,{buff:{tt:[.5,30]}}],[16,{buff:{luck:[20,30]}}],[12,{misc:{ldt:1}}],[9,{misc:{vlmt:1}}],[9,{misc:{ttk:1}}],[3,{misc:{rngua:1}}],[3,{set:1,common:1}]],fdTable=()=>FD_TABLE.filter(([,t])=>!(t.misc&&(t.misc.vlmt&&!bookRoom("vlmt")||t.misc.ttk&&!bookRoom("ttk")))),HK_GRANT_K=.35;function openChestMany(t){const n=RW();if(t=Math.min(t,Math.floor(n.fd/10)),t<1){toast("Cần 10 điểm Phúc Duyên");return}if(t===1){openChest();return}const o=S.gold,s={},e=[],i=S.inv.length;R.batch=!0;try{for(let f=0;f<t;f++){n.fd-=10,n.stat.chests++;for(const a of grant(wpick(fdTable(),u=>u[0])[1],"Rương Phúc Duyên")){if(/lượng$/.test(a))continue;const u=a.match(/^(.+?) \+\S+(?: may mắn)? trong (\d+) phút$/);if(u){const p=u[1]+" (phút)";s[p]=(s[p]||0)+ +u[2];continue}if(/^<b|^[^\d]/.test(a)&&!/^\d+ (Kim Sáng|Ngưng Thần|Phúc Duyên|điểm)/.test(a)){e.push(a);continue}const d=a.match(/^(\d+) (.+)$/);d?s[d[2]]=(s[d[2]]||0)+ +d[1]:s[a]=(s[a]||0)+1}}}finally{R.batch=!1}const c=S.gold-o,l=e.filter(f=>f.startsWith("<b")),r=[c>0?`${fmtL(c)} lượng`:""].concat(Object.entries(s).map(([f,a])=>`${a} ${f}`)).filter(Boolean);e.length&&r.push(`${e.length} món đồ${l.length?` (${l.length} Hoàng Kim)`:""}`),log(`🎁 Mở ${t} rương Phúc Duyên: ${r.join(", ")}${l.length?" · "+l.join(", "):""}`),uiSfx("learn"),achCheck(),save(),refreshGift();const h=e.length-(S.inv.length-i);modal(`<h3>Mở ${t} rương Phúc Duyên</h3><div class="card stats">${c>0?`<span>Ngân lượng</span><span>+${fmtL(c)}</span>`:""}${Object.entries(s).map(([f,a])=>`<span>${esc(f)}</span><span>+${a}</span>`).join("")}<span>Trang bị</span><span>${e.length}${l.length?` (${l.length} Hoàng Kim)`:""}</span></div>
    ${e.length?`<div class="sl">${e.map(f=>`<div>${f}</div>`).join("")}</div>`:""}${h>0?`<p class="dim small">${h} món không vào được hành trang (đầy hoặc đồ thừa) đã được bán.</p>`:""}
    <p class="desc">Còn ${n.fd} Phúc Duyên.</p><div class="btnrow"><button class="btn" id="cBack">Quay lại</button></div>`,()=>{$("#cBack").onclick=()=>{giftTab="chest",giftModal()}})}function openChest(){const t=RW();if(t.fd<10){toast("Cần 10 điểm Phúc Duyên");return}t.fd-=10,t.stat.chests++;const n=grant(wpick(fdTable(),o=>o[0])[1],"Rương Phúc Duyên");toast("Rương Phúc Duyên: "+n.join(", ").replace(/<[^>]+>/g,"")),refreshGift()}function rwOnKill(t){if(!S.fac)return;const n=RW();if(n.stat.kills++,questTick("kills"),t.cls==="boss"&&(n.stat.bosses++,questTick("bosses")),t.goldBoss&&(n.stat.goldBoss++,grant({set:1,fd:10},"Hạ Trùm Hoàng Kim")),Math.random()<.05){n.stat.tokens++;const o=eventNow();S.matMsg!==!1&&log(`Nhặt được <b style="color:${o.col}">${esc(o.token)}</b>`)}petGainXp(t.cls==="boss"?10:t.cls==="elite"?3:1),(n.stat.kills%25===0||t.cls==="boss")&&achCheck()}function giftCounts(){const t=RW(),n=t.stat.tokens||0;return{login:t.login.claimed?0:1,lvms:lvMsReady().length,chest:Math.floor(t.fd/10),event:EVENT_SHOP.filter(([o])=>n>=o).length}}function giftPending(){if(!S||!S.fac)return!1;const t=RW();return Object.values(giftCounts()).some(n=>n>0)}function dotGift(){const t=$("#giftBtn");t&&t.classList.toggle("on",giftPending())}let giftTab="login";function refreshGift(){!$("#modal").classList.contains("hidden")&&$("#giftTabs")&&giftModal(),dotGift()}function setGiftTxt(){const t=goldMul("grant")<1?goldMul("grant")*HK_GRANT_K:1,n=clamp(Math.floor(S.lvl/15)+1,1,HT_MAX);return t>=1?"1 đồ Hoàng Kim":`2 Huyền Tinh cấp ${n} (${Math.round(t*1e3)/10}% thay bằng 1 đồ Hoàng Kim)`}function giftText(t){const n=[];if(t.gold&&n.push(`${fmtL(t.gold*(1+S.lvl/10))} lượng`),t.pot){const o=J.potions.find(s=>s.kind===t.pot.kind&&s.tier===potTierNow(t.pot.tier));n.push(`${t.pot.n} ${o?o.n:"bình thuốc"}`)}if(t.ht&&n.push(`${t.ht} Huyền Tinh cấp ${clamp(Math.floor(S.lvl/15)+1,1,HT_MAX)}`),t.fd&&n.push(`${t.fd} Phúc Duyên`),t.knb&&n.push(`<img src="img/ep/knb.png" alt="" style="height:13px;vertical-align:middle;image-rendering:pixelated"> ${t.knb*KNB_K} Kim Nguyên Bảo`),t.item&&n.push(`đồ ${t.item} dòng`),t.set&&n.push(t.common?"1 đồ Hoàng Kim dùng chung (Kim Phong, An Bang, Định Quốc…)":setGiftTxt()),t.pts&&n.push(`${t.pts} tiềm năng`),t.buff)for(const o in t.buff)n.push(buffTxt(o,t.buff[o][0],t.buff[o][1]).replace(" trong "," "));if(t.skp&&n.push(`${t.skp} điểm kỹ năng`),t.misc)for(const o in t.misc)n.push(`${t.misc[o]} ${miscName(o)}`);return n.join(", ")}function giftBody(t){if(giftTab==="login"){const n=t.login,o=((n.streak-1)%7+7)%7;return`<p class="desc">Chuỗi ${n.streak} ngày · tổng ${n.total} ngày. Mốc 10 / 20 / 30 ngày có quà lớn (lặp lại mỗi 30 ngày).</p>
      <div class="days">${LOGIN7.map((s,e)=>`<div class="day${e<o||e===o&&n.claimed?" got":""}${e===o?" cur":""}"><b>Ngày ${e+1}</b><small>${giftText(s)}</small></div>`).join("")}</div>
      <div class="btnrow"><button class="btn" id="gLogin" ${n.claimed?"disabled":""}>${n.claimed?"Đã nhận hôm nay":"Nhận quà hôm nay"}</button></div>`}if(giftTab==="lvms"){const n=t.lvGot||{},o=rebornN();return`<p class="desc">${o?`Mốc cấp vòng chuyển sinh ${o}: nhận lại mỗi lần chuyển sinh, chủ yếu hiệu ứng tăng kinh nghiệm / rơi đồ để lên lại cấp 200 nhanh hơn.`:"Quà mốc cấp: nhận một lần. Từ cấp 90 có thêm hiệu ứng tăng kinh nghiệm / tỉ lệ rơi đồ trong một số phút."} Hiệu ứng nhận thêm khi đang còn sẽ cộng dồn thời gian.</p>${lvMsReady().length>1?`<div class="btnrow"><button class="btn on" id="gLvAll">Nhận tất cả (${lvMsReady().length})</button></div>`:""}${buffText()?`<div class="card">${buffText()}</div>`:""}${lvMsList().map(([s,e,i])=>`<div class="qrow${S.lvl>=s?"":" lock"}"><span><b>Cấp ${s}</b><small>${giftText(e)}${i?" · "+i:""}</small></span><small></small><button class="btn sm" data-lv="${s}" ${S.lvl>=s&&!n[lvKey(s)]?"":"disabled"}>${n[lvKey(s)]?"Đã nhận":"Nhận"}</button></div>`).join("")}`}if(giftTab==="ach")return`<p class="desc">Đạt <b>${ACH.filter(n=>t.ach[n[0]]).length}/${ACH.length}</b> · thưởng tự nhận khi hoàn thành. Danh hiệu: thẻ Nhân vật → 🎖 Danh hiệu.</p>${[...ACH].sort((n,o)=>!!t.ach[o[0]]-!!t.ach[n[0]]).map(([n,o,,s,e])=>`<div class="qrow${t.ach[n]?"":" lock"}"><span><b>${o}</b><small>${giftText(s)}</small></span><small>${t.ach[n]?"✓":""}</small></div>`).join("")}`;if(giftTab==="chest")return`<p class="desc">Điểm Phúc Duyên: <b>${t.fd}</b> (điểm danh, nhiệm vụ, thành tựu, trùm). Mỗi lần mở: 10 điểm.</p>
      <div class="chips">${(()=>{const n=fdTable(),o=n.reduce((s,e)=>s+e[0],0)||1;return n.map(([s,e])=>`<span class="chip2">${giftText(e)} · ${Math.round(s/o*1e3)/10}%</span>`).join("")})()}</div>${fdTable().length<FD_TABLE.length?'<p class="dim small">Đã đủ giới hạn Võ Lâm Mật Tịch / Tẩy Tủy Kinh nên rương không ra hai món này (tỉ lệ đã tính lại).</p>':""}
      <div class="btnrow"><button class="btn" id="gChest" ${t.fd>=10?"":"disabled"}>Mở ×1</button><button class="btn" data-ch="10" ${t.fd>=100?"":"disabled"}>Mở ×10</button><button class="btn" data-ch="100" ${t.fd>=1e3?"":"disabled"}>Mở ×100</button><button class="btn" data-ch="999999" ${t.fd>=20?"":"disabled"}>Mở hết (${Math.floor(t.fd/10)})</button></div>`;if(giftTab==="event"){const n=eventNow();return`<p class="desc">Sự kiện: <b style="color:${n.col}">${n.n}</b>. Quái rơi ${n.token} (5%). Đang có: <b>${t.stat.tokens}</b>.</p>${EVENT_SHOP.map(([o,s],e)=>`<div class="qrow"><span>${giftText(s)}</span><small>${o} ${n.token}</small><button class="btn sm" data-e="${e}" ${t.stat.tokens>=o?"":"disabled"}>Đổi</button></div>`).join("")}`}return""}function towerBody(t=RW()){return`<p class="desc">Mỗi tầng một đợt tinh anh; lần đầu qua: tầng thường 1 Huyền Tinh + 2 Phúc Duyên; tầng chia hết cho 5 là trùm: 1 Mảnh HK Môn Phái + 1 món Hoàng Kim + 10 Phúc Duyên + 1 / 2 / 5 Thần Bí Khoáng Thạch (qua lại tầng trùm vẫn nhận). Quái cấp 10 + 4 × tầng (tối đa 200); từ tầng 49 mỗi tầng quái thêm 0,05% máu và sát thương. Gục ngã ở chế độ Leo Tháp: tự chuyển về Luyện Công. Gục ngã là rời tháp.</p>
      <p>Kỷ lục: <b>tầng ${t.stat.towerBest}</b>${R.tower?` · đang ở tầng ${R.tower.floor}`:""}</p>
      <div class="btnrow">${R.tower?'<button class="btn red" id="gTowerOut">Rời tháp</button>':unlocked(TOWER_LV)?`<button class="btn" id="gTower">Vào tháp (từ tầng ${Math.max(1,t.stat.towerBest-4)})</button>`:`<button class="btn" disabled>Cần cấp ${TOWER_LV}</button>`}</div>`}// petBody provided by pet_system_dev
function rebornBody(t=RW()){const n=rebornBonus(),o=t.stat.reborn>=20;return`<p class="desc">Đạt cấp 200: về cấp 1, giữ trang bị; <b>mỗi lần chuyển sinh +${REB_EQ_LV} cấp khi xét yêu cầu trang bị</b> (vd cấp 10 chuyển sinh 1 = cấp ${10+REB_EQ_LV}: mặc được mọi trang bị); võ công 90 học không cần Bí Kíp 90; mỗi lần +10% tỉ lệ rơi đồ; mốc cấp nhận lại mỗi vòng; tẩy toàn bộ điểm tiềm năng và kỹ năng cũ, nhận cố định <b>${REB_ATTR} điểm tiềm năng + ${REB_SK} điểm kỹ năng</b>; mỗi lần quái mạnh thêm (+25% máu, +15% sát thương), +10% sát thương nhưng <b>kinh nghiệm nhận được −10%</b> mỗi lần (tối đa 20 lần).</p>
      <p>Đã chuyển sinh: <b>${t.stat.reborn}</b> lần · hiện ${Math.round(n.xp*100)}% kinh nghiệm, +${Math.round(n.dmg*100)}% sát thương, kháng tất cả +${REBORN_ALLRES*t.stat.reborn}%, kháng tối đa ${PLAYER_RES_MAX+REBORN_RES*t.stat.reborn}% (mỗi lần +${REBORN_ALLRES}% kháng tất cả, +${REBORN_RES}% kháng tối đa) · độ khó: quái ×${rebornHard().hp.toFixed(2)} máu, ×${rebornHard().dmg.toFixed(2)} sát thương.</p>
      <div class="btnrow"><button class="btn red" id="gReborn" ${S.lvl>=200&&!o?"":"disabled"}>${o?"Đã chuyển sinh tối đa":S.lvl>=200?"Chuyển sinh":"Cần cấp 200"}</button></div>`}const GIFT_TABS=[["login","Điểm danh"],["lvms","Mốc cấp"],["chest","Phúc Duyên"],["event","Sự kiện"],["ach","Thành tựu"]];function giftModal(t){if(!S.fac)return;const n=RW(),o=giftCounts();if(GIFT_TABS.some(([s])=>s===giftTab)||(giftTab="login"),t&&!o[giftTab]){const s=GIFT_TABS.find(([e])=>o[e]>0);s&&(giftTab=s[0])}modal(`<h3>🎁 Phần thưởng <small>Phúc Duyên ${n.fd}${n.stat.tokens?` · ${eventNow().token} ${n.stat.tokens}`:""}</small></h3><div class="dtabs" id="giftTabs">${GIFT_TABS.map(([s,e])=>`<button data-g="${s}" class="${s===giftTab?"on":""}">${e}${o[s]?` <b class="gdot">${o[s]>99?"99+":o[s]}</b>`:""}</button>`).join("")}</div>${giftBody(n)}`,()=>{document.querySelectorAll("#mBody #giftTabs button").forEach(e=>e.onclick=()=>{giftTab=e.dataset.g,giftModal()});const s=(e,i)=>{const c=$(e);c&&(c.onclick=i)};s("#gLogin",()=>{claimLogin(),refreshGift()}),s("#gChest",openChest),document.querySelectorAll("#mBody [data-ch]").forEach(e=>e.onclick=()=>openChestMany(+e.dataset.ch)),document.querySelectorAll("#mBody [data-lv]").forEach(e=>e.onclick=()=>claimLvMs(+e.dataset.lv)),s("#gLvAll",()=>{for(const[e]of lvMsReady())claimLvMs(e);save()}),document.querySelectorAll("#mBody [data-t]").forEach(e=>e.onclick=()=>{n.title=n.title===e.dataset.t?"":e.dataset.t,R.dirty=!0,save(),refreshGift()}),document.querySelectorAll("#mBody [data-e]").forEach(e=>e.onclick=()=>eventBuy(+e.dataset.e))})}function rebornModal(){S.fac&&modal(`<h3>Chuyển sinh <small>${RW().stat.reborn}/20 lần</small></h3>${rebornBody()}`,()=>{const t=$("#gReborn");t&&(t.onclick=doReborn)})}


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
