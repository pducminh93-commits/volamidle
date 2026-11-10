// Base definition of TK_SIDES for Tong Kim
if (typeof TK_SIDES === 'undefined') {
  window.TK_SIDES = [
    { n: 'Tống', col: '#5fb4ff', base: [0.80, 0.86], sol: 'enemy029', solN: 'Tống binh', grd: 'enemy021', grdN: 'Tống Vệ binh', gen: 'enemy017', genN: 'Tống Chủ tướng', boss: 'enemy004', bossN: 'Tống Nguyên Soái', bossSc: 1.55 },
    { n: 'Kim', col: '#ff7a5a', base: [0.22, 0.10], sol: 'enemy028', solN: 'Kim binh', grd: 'enemy024', grdN: 'Kim Vệ binh', gen: 'enemy023', genN: 'Kim Chủ tướng', boss: 'enemy006', bossN: 'Kim Nguyên Soái', bossSc: 1.35 }
  ];
}
if (typeof TkScroll === 'undefined') window.TkScroll = { pending: null };
if (typeof SV === 'undefined') window.SV = { on: false };
/* Tống Kim online: người thật, vị trí/HP/điểm/kết quả do server giữ. */
'use strict';
const RealTK={data:null,joining:false,joinTimer:null,leaving:false,claiming:false,queue:new Set(),claimed:new Set(),atk:0,lastMove:0,frameAt:0,error:'',owner:''};
function realOnlineMode(){return !!window.SHARED_WORLD;}
function realTkSend(m){
  if (typeof sharedWorldSend === 'function') {
    sharedWorldSend({type:'tk',...m});
  } else {
    // Fallback khi chạy server local / offline hoặc chưa tải shared_world
    if (m && m.op === 'view') {
      if (!RealTK.data) {
        RealTK.data = { counts: [3, 4], phase: 'waiting', now: Date.now(), start: Date.now() + 30000 };
      }
    }
  }
}
function tkCampNpc(){
 const K=R.tk;if(!K?.real||K.activity)return null;
 if(!K.medic){const base=K.base[K.side],pt=obsSnap(base[0]+100,base[1]+48);K.medic={x:pt[0],y:pt[1],anim:TK_SIDES[K.side].gen};}
 return K.medic;
}
function tkCampNpcAt(x,y){const n=tkCampNpc();return n&&Math.hypot(x-n.x,y-(n.y-28))<48?n:null;}
function tkCampGo(){const n=tkCampNpc();if(!n||R.deadT>0)return;R.tk.visitMedic=true;INPUT.target=null;H._pp=null;H._pk=null;}
function tkCampVisit(dt){
 const K=R.tk,n=tkCampNpc();if(!K?.visitMedic||!n)return false;
 if(Math.hypot(H.x-n.x,H.y-n.y)<=65){K.visitMedic=false;shopTab='med';shopModal();return true;}
 obsSteer(H,n.x,n.y,heroMoveSpeed()*dt);return true;
}
function tkCampDraw(c){const n=tkCampNpc();if(!n)return;drawAnim(n.anim,'st',4,performance.now()/1000,n.x,n.y,MON_SCALE);label(n.x,n.y-58,'Quân y · Mua thuốc','#a9ffc0',12);}
function realTkMessage(m){
 if(R.tk?.activity)return;
 if(m.type==='tk-snapshot'){
  if(RealTK.owner!==m.self){RealTK.owner=m.self;RealTK.claimed.clear();RealTK.queue.clear();}
  RealTK.data=m;RealTK.error='';if(m.joined){RealTK.joining=false;clearTimeout(RealTK.joinTimer);RealTK.joinTimer=null;}
  if(m.joined&&m.phase!=='done')realTkMount(m);
  else if(R.tk?.real&&m.phase==='done'){const match=R.tk.match;tkLeave();if(!m.cancelled)RealTK.queue.add(match);else toast('Trận hủy vì chưa có người ở cả hai phe. Không trừ phí.');}
  else if(R.tk?.real&&!m.joined){tkLeave();if(RealTK.leaving)toast('Đã rời chiến trường, không nhận thưởng trận này.');RealTK.leaving=false;}
  if(m.result&&!RealTK.claimed.has(m.result)&&!S.tk?.hist?.some(h=>h.match===m.result))RealTK.queue.add(m.result);
  if(modalVisible('[data-real-tk-lobby]')&&!m.joined)realTkLobbyRender();
  realTkClaim();return;
 }
 if(m.type==='tk-position'&&R.tk?.real&&m.id===RealTK.data?.self){[H.x,H.y]=[m.x,m.y];INPUT.target=null;}
 const K=R.tk;if(!K?.real)return;
 const p=K.u.find(u=>u.id===m.actor),e=K.u.find(u=>u.id===m.target);
 if(m.type==='tk-cast'&&p&&e){const k=SK[m.skill];if(k&&k.f!==p.fac)return;p.act='at';p.actT=0;if(p===K.hero){setAct(H,'at');H.dir=dirOf(e.x-H.x,e.y-H.y);}tkCastFx(p,e,{id:m.skill});}
 if(m.type==='tk-hit'&&e){e.hp=m.hp;addText(e.x,e.y-44,dmgNum(m.damage),m.crit?'#ffe14a':'#f0e6d0',m.crit?16:12,m.crit?'crit':'dmg');if(e===K.hero){R.hurtT=nativeHurtTime(R.P,.25);if(H.act!=='at'&&m.damage>0&&m.hp>0)setAct(H,'hurt');R.life=R.P.life*e.hp/e.max;}}
 if(m.type==='tk-death'&&p&&e){tkFeed(`<b>${esc(p.name)}</b> hạ <b>${esc(e.name)}</b>`);if(e===K.hero){R.deadT=5;H.jump=null;H.z=0;setAct(H,'die');log('<span class="bad">Trọng thương. Hồi sinh tại hậu doanh sau5giây.</span>');}}
}
function realTkMount(m){
 if(!R.P)recalc();
 const me=m.players.find(p=>p.id===m.self);if(!me)return;
 let K=R.tk;
 if(!K?.real||K.match!==m.match){
  if(R.tk)return;
  K=R.tk={real:true,match:m.match,side:me.side,t:0,u:[],feed:[],hudT:0,keep:{town:!!R.town,x:H.x,y:H.y,ground:R.ground,en:R.enemies,ctrl:S.ctrl},done:false};
  tkScrollAccepted();
  R.town=false;R.reviveTown=false;document.getElementById('townBar')?.classList.add('hidden');R.ground=[];R.enemies=[];R.corpses=[];R.allies=[];WB.vis=[];R.pickTarget=null;R.moveTo=null;INPUT.target=null;
  obsLoad('tk');R.bgImg=img('img/z/tk.jpg');K.base=[tkBase(0),tkBase(1)];document.body.classList.add('tking');closeModal(true);
 }
 const phaseChanged=K.phase!==m.phase;
 K.phase=m.phase;K.counts=m.counts;K.scores=m.scores;K.t=m.phase==='running'?Math.max(0,(m.now-m.start)/1000):0;K.start=m.start;K.clockAt=Date.now();K.now=m.now;
 const previous=new Map(K.u.map(p=>[p.id,p]));
 K.u=m.players.map(p=>{const old=previous.get(p.id),u=old||tkUnit({id:p.id,kind:'player'});const oldDead=u.dead,oldAct=u.act,oldX=u.x,oldY=u.y;Object.assign(u,p,{kind:'player',pts:p.points,st:{...tkSt(),ast:p.assists,dmg:p.damage,taken:p.taken,ptsP:p.points},tx:p.x,ty:p.y,pot:0});
  if(old&&p.id!==m.self){u.x=oldX;u.y=oldY;}if(oldAct!==p.act)u.actT=0;
  if(p.id===m.self){if(!K.hero||phaseChanged&&m.phase==='running'||oldDead>0&&p.dead<=0||Math.hypot(H.x-p.x,H.y-p.y)>300){[H.x,H.y]=[p.x,p.y];if(p.dead<=0)setAct(H,'st');snapCamera();}K.hero=u;R.deadT=p.dead;R.life=R.P.life*p.hp/p.max;R.mana=p.mana;R.stamina=p.stamina;R.freezeT=p.freeze||0;if(p.dead>0)setAct(H,'die');}
  return u;
 });
 if(!document.getElementById('tkHud')){tkHud();refresh();tkFocusSet(typeof touchControlLayout==='function'&&touchControlLayout());}
 tkHudUpdate();
}
function realTkTick(dt){
 const K=R.tk;if(K?.activity){realActivityTick();return;}if(!K?.real||!K.hero)return;
 const frameNow=performance.now();dt=RealTK.frameAt?Math.min(.05,Math.max(0,(frameNow-RealTK.frameAt)/1000)):.016;RealTK.frameAt=frameNow;
 const m=RealTK.data,me=K.hero;if(!sharedWorldReady())return;
 K.t=m.phase==='running'?Math.min(TK_DUR,(m.now-m.start+Date.now()-K.clockAt)/1000):0;
 for(const p of K.u)if(p!==me){p._x=p.x;p._y=p.y;p.x+=(p.tx-p.x)*Math.min(1,dt*8);p.y+=(p.ty-p.y)*Math.min(1,dt*8);p.moving=p.act==='run';}
 if(K.phase==='running'&&me.hp>0){
  kcTick(H,dt);const visiting=tkCampVisit(dt);if(!visiting){if(H.jump)kcBusy(H,dt);else if(manual())moveManual(dt);}
  const targets=K.u.filter(p=>p.side!==K.side&&p.hp>0&&p.connected&&(manual()||Math.hypot(p.x-H.x,p.y-H.y)<=1000*(R.P.vision||120)/120)),e=targets.reduce((a,b)=>!a||Math.hypot(b.x-H.x,b.y-H.y)<Math.hypot(a.x-H.x,a.y-H.y)?b:a,null);
  if(e&&!H.jump&&!visiting){const a=pickAttack(R.P,false),d=Math.hypot(e.x-H.x,e.y-H.y);if(!manual()&&d>a.rad+18)obsSteer(H,e.x,e.y,typeof heroMoveSpeed==='function'?heroMoveSpeed()*dt:150*R.P.speed*dt);
   RealTK.atk-=dt*(R.freezeT>0?.5:1);if(RealTK.atk<=0&&d<=a.rad+24&&(!manual()||manAtkOk())){realTkSend({op:'attack',skill:a.id,target:e.id});RealTK.atk=1/a.rate;}}
  if(Date.now()-RealTK.lastMove>=200){RealTK.lastMove=Date.now();realTkSend({op:'move',x:H.x,y:H.y,dir:H.dir||0,jump:!!H.jump});}
 }else if(K.phase==='waiting'){
  if(!tkCampVisit(dt))moveManual(dt);
  if(Date.now()-RealTK.lastMove>=200){RealTK.lastMove=Date.now();realTkSend({op:'move',x:H.x,y:H.y,dir:H.dir||0});}
 }
 me.x=H.x;me.y=H.y;H.z=H.jump?H.z:0;if((K.hudT-=dt)<=0){K.hudT=.25;tkHudUpdate();}
}
async function realTkJoin(side){
 if(RealTK.joining)return;if(R.tk||R.tower||R.duel||(typeof SV!=='undefined'&&SV.on)||R.deadT>0||(typeof stgRunActive==='function'&&stgRunActive())){RealTK.error='Hãy kết thúc hoạt động hiện tại hoặc hồi sinh trước khi báo danh Tống Kim.';if(modalVisible('[data-real-tk-lobby]'))realTkLobbyRender();toast(RealTK.error);return;}
 if(typeof sharedWorldConnect!=='function'||typeof sharedWorldReady!=='function'||!sharedWorldReady()){
  if(typeof tkStart==='function'){
   closeModal();
   const s = side === 'auto' ? (Math.random() < 0.5 ? 0 : 1) : side;
   tkStart(s);
   return;
  }
  toast('Chiến trường 10 vs 10 đang chuẩn bị mở cổng kết nối máy chủ...');
  return;
 }
 const actorState=S,actorSlot=SLOT;RealTK.joining=true;RealTK.error='';if(modalVisible('[data-real-tk-lobby]'))realTkLobbyRender();try{await sharedWorldConnect();const until=Date.now()+6000;while(!sharedWorldReady()&&Date.now()<until)await new Promise(r=>setTimeout(r,100));if(!sharedWorldReady())throw Error('Chưa kết nối được máy chủ Tống Kim, thử lại sau.');if(actorState!==S||actorSlot!==SLOT)throw Error('Nhân vật đã thay đổi. Hãy báo danh lại.');realTkSend({op:'join',side});RealTK.joinTimer=setTimeout(()=>{if(!RealTK.joining)return;RealTK.joining=false;TkScroll.pending=null;RealTK.error='Báo danh chưa được xác nhận. Hãy thử lại.';toast(RealTK.error);if(modalVisible('[data-real-tk-lobby]'))realTkLobbyRender();},10000);}catch(e){RealTK.joining=false;TkScroll.pending=null;RealTK.error=e.message;toast(e.message);}finally{if(modalVisible('[data-real-tk-lobby]'))realTkLobbyRender();}
}
function realTkLobbyRender(){
 const d=RealTK.data,n=d?.counts||[0,0],phase=d?.phase==='running'?'Trận đang diễn ra':d?.phase==='waiting'?'Đang chờ người chơi':'Sẵn sàng báo danh';
 modal(`<section data-real-tk-lobby class="rtk-lobby"><header class="rtk-heading"><span class="rtk-emblem" aria-hidden="true">⚔</span><div><small>CHIẾN TRƯỜNG · NGƯỜI CHƠI THẬT</small><h3>Tống Kim <span>10 vs 10</span></h3></div></header>
 <div class="rtk-status ${RealTK.error?'is-error':RealTK.joining?'is-pending':d?.phase==='running'?'is-running':'is-ready'}" role="status" aria-live="polite"><b>${RealTK.error?'Chưa thể báo danh':RealTK.joining?'Đang kết nối…':phase}</b><span>${esc(RealTK.error||(RealTK.joining?'Vui lòng chờ kết nối máy chủ.':'Chọn phe bên dưới để tham chiến.'))}</span></div>
 <div class="rtk-sides">${[0,1].map(s=>`<button class="btn rtk-side rtk-side-${s}" data-rtk-side="${s}" ${n[s]>=10||RealTK.joining?'disabled':''}><span class="rtk-seal">${s===0?'T':'K'}</span><span class="rtk-side-name">Phe ${TK_SIDES[s].n}<small>${n[s]>=10?'Đã đủ quân':'Bấm để báo danh'}</small></span><b class="rtk-count">${n[s]}<small>/ 10</small></b><span class="rtk-capacity"><i style="width:${Math.min(100,Math.max(0,n[s]*10))}%"></i></span></button>`).join('')}</div>
 <button class="btn rtk-auto" data-rtk-side="auto" ${n.every(v=>v>=10)||RealTK.joining?'disabled':''}>${n.every(v=>v>=10)?'Hai phe đã đủ quân':'Tự chọn phe ít người'}</button>
 <div class="rtk-rules"><div><b>30 giây</b><span>Đếm ngược khi hai phe có người</span></div><div><b>8 phút</b><span>Thời gian giao chiến</span></div><div><b>10 người / phe</b><span>Đủ quân sẽ ngừng nhận thêm</span></div></div>
 <section class="rtk-rewards"><h4>Điều kiện &amp; phần thưởng</h4><p>Tham gia ít nhất <b>2 phút</b> và gây sát thương thật. <strong>Rời sớm / AFK không nhận thưởng.</strong></p><p>Điểm Tống Kim, bạc, <span class="rtk-xp">kinh nghiệm</span> và <span class="rtk-gold">Xu</span> theo đóng góp.</p><div><b>Thắng +25%</b><span>Tối đa 3 trận thưởng / ngày UTC</span></div></section>
 <footer class="rtk-actions"><button class="btn" id="rtkRefresh">↻ Cập nhật quân số</button><button class="btn" id="rtkClose">Đóng</button></footer></section>`,()=>{for(const b of document.querySelectorAll('[data-rtk-side]'))b.onclick=()=>realTkJoin(b.dataset.rtkSide==='auto'?'auto':+b.dataset.rtkSide);$('#rtkRefresh').onclick=()=>realTkSend({op:'view'});$('#rtkClose').onclick=()=>closeModal();});
}
function realTkLobby(){if(!RealTK.joining)TkScroll.pending=null;if(typeof stgRunActive==='function'&&stgRunActive()){toast('Hãy rời vượt ải trước');return;}realTkSend({op:'view'});realTkLobbyRender();}
function realTkLeave(){if(R.tk?.activity){realActivityLeave();return;}if(!sharedWorldReady()){toast('Mất kết nối. Đang nối lại để xác nhận rời trận.');return;}RealTK.leaving=true;realTkSend({op:'leave'});}
async function realTkClaim(){
 if(RealTK.claiming||!RealTK.queue.size||R.tk||typeof Auth==='undefined'||!Auth?.user||(typeof Social!=='undefined'&&Social?.busy)||(typeof SharedField!=='undefined'&&SharedField?.saving))return;
 const match=RealTK.queue.values().next().value,actor=Auth.user?.id+':'+SLOT;RealTK.claiming=true;Social.busy=true;
 try{
  Social.saving=true;const synced=await Auth.syncCloudSave(true,true);Social.saving=false;if(!synced?.ok)throw Error('Chưa lưu được nhân vật để nhận thưởng.');
  const res=await Auth.api('/api/tk/claim',{method:'POST',body:JSON.stringify({slot:SLOT,match})});if(actor!==Auth.user?.id+':'+SLOT)return;
  if(!res.ok){const latest=await Auth.api('/api/save/load?slot='+SLOT);if(latest.ok&&latest.save){const u=unpack(latest.save);if(u.ok)socialApply(u.state);else throw Error('Lưu nhân vật không hợp lệ.');}else{SAVE_LOCK=true;Social.recovery=true;}throw Error(res.error||'Chưa nhận được thưởng.');}
  socialApply(res.state);RealTK.queue.delete(match);RealTK.claimed.add(match);const a=res.result,reward=res.awarded?a.reward:null;
  modal(`<h3>Tổng kết Tống Kim</h3><p class="${a.win?'gold':'dim'}">${a.win?'Phe của bạn chiến thắng':'Trận đã kết thúc'} · Tống ${a.scores[0]} — ${a.scores[1]} Kim</p><p>Điểm ${a.score} · Hạ ${a.kills} · Hỗ trợ ${a.assists} · Hoạt động ${a.active}giây</p>${reward?`<div class="tkrew"><b>+${reward.points}điểm Tống Kim</b><b class="silver-value">+${fmtSilver(reward.gold)}</b><b style="color:#d875f5">Kinh nghiệm tương đương ${reward.xpKills}quái</b><b>+${reward.xu}Xu</b></div>`:`<p class="dim">${esc(res.reason||a.reason||'Kết quả đã được lưu.')}</p>`}<p class="dim">Máy chủ đã lưu kết quả. Thưởng vào Hành trang trước; túi đầy mới gửi Thư, hạn 7 ngày. Nhận lại không nhận trùng.</p><button class="btn on" onclick="socialModal('mail')">Mở thư phần thưởng</button><button class="btn" id="rtkResultClose">Đóng</button>`,()=>{$('#rtkResultClose').onclick=()=>closeModal();});
 }catch(e){RealTK.error=e.message;toast(e.message);}finally{RealTK.claiming=false;Social.saving=false;Social.busy=false;}
}
const RealRank={rows:[],mine:[],total:0,powerMine:[],powerTotal:0,powerOwner:'',owner:'',at:0,busy:false,by:'lvl',cacheBusy:false};
function realRankData(by='lvl'){const rows=[...RealRank.rows,...RealRank.mine.filter(r=>!RealRank.rows.some(o=>o.id===r.id))];return rows.sort((a,b)=>by==='pw'?b.pw-a.pw: (by==='reborn'?b.rbTotal-a.rbTotal:0)||b.lvl-a.lvl||b.f-a.f);}
async function realRankModal(by='lvl'){
 if(typeof Auth==='undefined'||!Auth?.user){
  if(typeof netModal==='function')return netModal('rank');
  toast('Chức năng xếp hạng yêu cầu đăng nhập tài khoản.');
  return;
 }
 if(RealRank.busy)return;modal('<section data-rank-loading><h3>Xếp hạng người chơi</h3><p>Đang tải…</p></section>');const panel=$('#mBody').firstElementChild,actor=Auth.user.id;RealRank.busy=true;
 try{const r=await Auth.api('/api/ranks?by='+by);if(!r.ok)throw Error(r.error||'Chưa tải được xếp hạng.');if(actor!==Auth.user?.id||panel!==$('#mBody').firstElementChild||!modalVisible())return;Object.assign(RealRank,{rows:r.rows,mine:r.mine,total:r.total,owner:Auth.user.id,at:Date.now(),by});if(by==='pw')Object.assign(RealRank,{powerMine:r.mine,powerTotal:r.total,powerOwner:Auth.user.id});
  modal(`<h3>Xếp hạng người chơi</h3><p class="dim">${r.total}nhân vật thật · Chỉ số từ bản lưu máy chủ</p><div class="btnrow"><button class="btn" data-real-rank="pw">Lực chiến</button><button class="btn" data-real-rank="lvl">Cấp</button><button class="btn" data-real-rank="reborn">Chuyển sinh</button></div><div style="overflow:auto;max-height:65vh"><table class="rktbl"><thead><tr><th>#</th><th>Nhân vật</th><th>Phái</th><th>Cấp</th><th>Lực chiến</th><th>Chuyển sinh</th></tr></thead><tbody>${realRankData(by).map(p=>`<tr class="${p.you?'rkyou':''}"><td>${p.rk}</td><td style="color:${ALLY_COL[p.fac]||'#ffdc88'}">${esc(p.name)}${p.you?' · Bạn':''}</td><td>${esc(FAC[p.fac]?.n||'')}</td><td>${p.lvl}</td><td class="gold">${fmt(p.pw)}</td><td>${p.rbTotal}</td></tr>`).join('')}</tbody></table></div><button class="btn" id="realRankClose">Đóng</button>`,()=>{for(const b of document.querySelectorAll('[data-real-rank]'))b.onclick=()=>realRankModal(b.dataset.realRank);$('#realRankClose').onclick=()=>closeModal();});
 }catch(e){toast(e.message);}finally{RealRank.busy=false;}
}
setInterval(async()=>{
 if(!realOnlineMode()||typeof Auth==='undefined'||!Auth?.user||!S.created||document.hidden||RealRank.cacheBusy||Date.now()-RealRank.at<600000&&RealRank.powerOwner===Auth?.user?.id)return;   // 14/10: 60 s -> 10 phut (may chu cung chi tinh lai 5 phut/lan)
 const owner=Auth.user.id;RealRank.cacheBusy=true;try{const r=await Auth.api('/api/ranks?by=pw');if(r.ok&&Auth.user?.id===owner){Object.assign(RealRank,{powerMine:r.mine,powerTotal:r.total,powerOwner:owner,at:Date.now()});if(!RealRank.owner)Object.assign(RealRank,{rows:r.rows,mine:r.mine,total:r.total,owner,by:'pw'});}}finally{RealRank.cacheBusy=false;}
},5000);


/* Giao diện tab Tống Kim trong bảng Hoạt động */
function realTkBody() {
  const d = RealTK.data, n = d?.counts || [0, 0];
  const phase = d?.phase === 'running' ? 'Trận đang diễn ra' : d?.phase === 'waiting' ? 'Đang chờ người chơi' : 'Sẵn sàng báo danh';
  return `<section data-real-tk-lobby class="rtk-lobby" style="margin-top:6px;">
    <div class="rtk-status ${RealTK.error ? 'is-error' : RealTK.joining ? 'is-pending' : d?.phase === 'running' ? 'is-running' : 'is-ready'}" role="status" aria-live="polite">
      <b>${RealTK.error ? 'Chưa thể báo danh' : RealTK.joining ? 'Đang kết nối…' : phase}</b>
      <span>${esc(RealTK.error || (RealTK.joining ? 'Vui lòng chờ kết nối máy chủ.' : 'Chiến trường Tống Kim liên server 10 vs 10. Chọn phe để tham chiến.'))}</span>
    </div>
    <div class="rtk-sides">
      ${[0, 1].map(s => `<button class="btn rtk-side rtk-side-${s}" data-rtk-side="${s}" ${n[s] >= 10 || RealTK.joining ? 'disabled' : ''}>
        <span class="rtk-seal">${s === 0 ? 'T' : 'K'}</span>
        <span class="rtk-side-name">Phe ${TK_SIDES[s].n}<small>${n[s] >= 10 ? 'Đã đủ quân' : 'Bấm để báo danh'}</small></span>
        <b class="rtk-count">${n[s]}<small>/ 10</small></b>
        <span class="rtk-capacity"><i style="width:${Math.min(100, Math.max(0, n[s] * 10))}%"></i></span>
      </button>`).join('')}
    </div>
    <button class="btn rtk-auto" data-rtk-side="auto" ${n.every(v => v >= 10) || RealTK.joining ? 'disabled' : ''}>${n.every(v => v >= 10) ? 'Hai phe đã đủ quân' : 'Tự chọn phe ít người'}</button>
    <div class="rtk-rules">
      <div><b>30 giây</b><span>Đếm ngược khi hai phe có người</span></div>
      <div><b>8 phút</b><span>Thời gian giao chiến</span></div>
      <div><b>10 người / phe</b><span>Đủ quân sẽ ngừng nhận thêm</span></div>
    </div>
    <section class="rtk-rewards">
      <h4>Điều kiện &amp; phần thưởng</h4>
      <p>Tham gia ít nhất <b>2 phút</b> và gây sát thương thật. <strong>Rời sớm / AFK không nhận thưởng.</strong></p>
      <p>Điểm Tống Kim, bạc, <span class="rtk-xp">kinh nghiệm</span> và <span class="rtk-gold">Xu</span> theo đóng góp.</p>
      <div><b>Thắng +25%</b><span>Tối đa 3 trận thưởng / ngày UTC</span></div>
    </section>
    <div class="btnrow" style="margin-top:12px;display:flex;gap:10px;">
      <button class="btn" id="rtkRefreshTab" style="flex:1;">↻ Cập nhật quân số</button>
      <button class="btn" id="rtkRankBtn" style="flex:1;">🏆 Bảng Xếp Hạng</button>
      <button class="btn on" id="rtkShopBtn" style="flex:1;">🏪 Cửa Hàng Tống Kim</button>
    </div>
  </section>`;
}

function bindRealTk(container, onUpdate) {
  const el = container || document;
  el.querySelectorAll('[data-rtk-side]').forEach(b => {
    b.onclick = () => {
      realTkJoin(b.dataset.rtkSide === 'auto' ? 'auto' : +b.dataset.rtkSide);
      if (typeof onUpdate === 'function') setTimeout(onUpdate, 500);
    };
  });
  const ref = el.querySelector('#rtkRefreshTab');
  if (ref) ref.onclick = () => {
    if (typeof realTkSend === 'function') realTkSend({ op: 'view' });
    if (typeof onUpdate === 'function') setTimeout(onUpdate, 300);
  };
  const rk = el.querySelector('#rtkRankBtn');
  if (rk) rk.onclick = () => realRankModal('pw');
  const shp = el.querySelector('#rtkShopBtn');
  if (shp) shp.onclick = () => { if (typeof tkShopModal === 'function') tkShopModal(); };
}
