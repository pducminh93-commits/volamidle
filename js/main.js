"use strict";let lastT=performance.now(),saveT=0,uiT=0,drawTog=!1;const UI_KEY="jxidle_ui",UI_FS=[.9,1,1.15,1.3],UI_FS_NAME=["Nhỏ","Vừa","Lớn","Rất lớn"];let UIP=null;function uiPrefs(){if(!UIP)try{UIP=JSON.parse(localStorage.getItem(UI_KEY)||"{}")||{}}catch{UIP={}}return UIP.fs=Number.isInteger(UIP.fs)&&UIP.fs>=0&&UIP.fs<UI_FS.length?UIP.fs:1,UIP.saver=!!UIP.saver,UIP.compact=!!UIP.compact,UIP}function vpFit(){const n=document.querySelector("meta[name=viewport]");if(!n)return;const e=navigator.maxTouchPoints>0||"ontouchstart"in window,o=Math.min(screen.width,screen.height),i=matchMedia("(orientation: portrait)").matches,t=e&&i&&o>=600?"width=480, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content":"width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content";n.content!==t&&(n.content=t)}vpFit(),window.addEventListener("orientationchange",()=>setTimeout(vpFit,50)),window.addEventListener("resize",vpFit);function applyUiPrefs(){const n=uiPrefs();document.documentElement.style.setProperty("--fs",UI_FS[n.fs]),document.body.classList.toggle("saver",n.saver),document.body.classList.toggle("compact",n.compact)}function setUiPref(n){Object.assign(uiPrefs(),n);try{localStorage.setItem(UI_KEY,JSON.stringify(UIP))}catch{}applyUiPrefs(),fitApp()}function onZoneChange(n){obsLoad(n.id),[H.x,H.y]=inWorld(H.x,H.y);for(const e of R.enemies)[e.x,e.y]=inWorld(e.x,e.y);for(const e of R.ground)[e.x,e.y]=inWorld(e.x,e.y);snapCamera(),R.bgImg=n.bg?img(n.bg):null,playMusic(n.id),preloadZoneSounds(n),curTab==="log"&&refresh()}function onStageChange(){curTab==="log"&&refresh()}function onLevelUp(){S.lvl===NEWBIE_LV&&!rebornN()&&log("🌱 Đạt cấp "+NEWBIE_LV+": hết <b>Hỗ Trợ Tân Thủ</b>."),typeof autoMapCheck=="function"&&autoMapCheck(),isNovice()&&S.lvl>=NOVICE_LV&&!R.quiet&&(toast("Đạt cấp "+NOVICE_LV+": gia nhập môn phái!"),$("#modal").classList.contains("hidden")&&joinModal()),S.autoPts===!0&&(autoSpendAttrs(),autoSpendSkills()),autoEquipAll(),R.quiet||(checkHints(),updateDots(),renderPad(),dotGift(),LV_MS.some(n=>n[0]===S.lvl)&&toast(`Đạt mốc cấp ${S.lvl}: nhận quà ở nút 🎁`))}const STEP=1/60,MAX_STEPS=6,LERP_MAX=120,SIM_SPEED=1.5;let simAcc=0;function movers(){return[H,R.petPos].concat(R.enemies).filter(Boolean)}function simulateFrame(n){simAcc+=n;let e=0;for(;simAcc>=STEP&&e<MAX_STEPS;){for(const o of movers())o._px=o.x,o._py=o.y;tick(STEP*SIM_SPEED),typeof vli120Tick==="function"&&vli120Tick(),simAcc-=STEP,e++}e===MAX_STEPS&&(simAcc=0)}function drawLerp(n){const e=simAcc/STEP,o=movers().filter(i=>i._px!==void 0&&Math.hypot(i.x-i._px,i.y-i._py)<LERP_MAX);for(const i of o)i._cx=i.x,i._cy=i.y,i.x=i._px+(i.x-i._px)*e,i.y=i._py+(i.y-i._py)*e;try{draw(n)}finally{for(const i of o)i.x=i._cx,i.y=i._cy}}let loopErr=0,loopLast="";function guard(n,e){try{e(),loopErr=Math.max(0,loopErr-.02)}catch(o){loopErr++;const i=n+": "+(o&&o.message);i!==loopLast&&(loopLast=i,console.error("[loi vong lap]",n,o)),loopErr>30&&(loopErr=0,R.fx=[],R.txt=[],R.enemies=[],R.spawnT=.5,R.deadT=0,simAcc=0,R.quiet=!1,closeModal(!0))}}function frame(n){const e=Math.min(.25,(n-lastT)/1e3);lastT=n,guard("tay cam",gamepadPoll),S.fac&&!document.hidden&&!window.NET_GATE&&(guard("mo phong",()=>simulateFrame(e)),(fpsOk(n)&&(!uiPrefs().saver||(drawTog=!drawTog)))&&guard("ve",()=>drawLerp(e))),uiT+=e,uiT>.1&&S.fac&&(uiT=0,guard("giao dien",()=>{updateTop(),updatePadCd(),R.logDirty&&curTab==="log"&&(R.logDirty=!1,renderLogOnly()),invDirty&&curTab==="inv"&&renderInv()})),saveT+=e,saveT>10&&S.fac&&guard("luu",()=>{saveT=0,loginCheck(),achCheck(),dotGift(),actDot();const o=R.activeT||0;o>30&&(S.kps=R.kills/o),save()}),requestAnimationFrame(frame)}function showOffline(n){if(!n)return;const e=Math.floor(n.secs/3600),o=Math.floor(n.secs%3600/60);modal(`<h3>Chào mừng trở lại!</h3><p class="desc">Vắng mặt ${e?e+" giờ ":""}${o} phút, nhân vật vẫn luyện công tại ${esc(zoneOf(Math.min(S.stage,STAGES)).n)}.</p>
    <div class="card stats"><span>Quái bị hạ</span><span>${fmt(n.kills)}</span><span>Kinh nghiệm</span><span>${fmt(n.xp)}</span>
    <span>Ngân lượng</span><span>${fmtL(n.gold)}</span><span>Cấp</span><span>${n.lv0} → ${n.lv1}</span><span>Vật phẩm</span><span>${n.got}${n.sold?` (+${n.sold} bán)`:""}</span>
    <span>Rương tu luyện</span><span>${n.chests||0} / 3 mốc (1 · 4 · 8 giờ)</span></div>
    ${n.chests?'<p class="desc">Quà các mốc đã vào túi — xem nhật ký Giang hồ.</p>':""}
    <div class="btnrow"><button class="btn" onclick="closeModal()">Nhận</button></div>`)}function fitApp(){document.body.classList.toggle("mob",isMobileUI());const n=window.visualViewport?window.visualViewport.height:window.innerHeight;n>0&&document.documentElement.style.setProperty("--app-h",Math.round(n)+"px"),CV&&resizeArena()}function setCompact(n){if(setUiPref({compact:n}),!n&&S.fac&&refresh(),typeof u20LogFit=="function")try{u20LogFit()}catch{}}function init(){if(typeof checkAccountBanned==="function"&&checkAccountBanned())return;CV=$("#arena");if(CV){CX=CV.getContext("2d");/* Pixel sắc như bản web: hiệu ứng phóng 1.4x (FX_SCALE) không bị làm mượt. */CX.imageSmoothingEnabled=!1}if(typeof window!=="undefined"){window.CV=CV;window.CX=CX;}let netHasUser=!1;try{netHasUser=!!localStorage.getItem("jx2_auth_user")}catch{}const n=pickSlot();SLOT=n.slot,n.menu&&(S=newSave());const e=n.menu?!1:load();typeof sharedInventoryInit==="function"&&sharedInventoryInit(S);$("#tabs").addEventListener("click",t=>{if(t.target.closest("#tabRide")){typeof ptModal=="function"&&ptModal();return}const a=t.target.closest("button[data-t]");if(a){if(a.dataset.t==="more"&&typeof u20MoreMode<"u"&&(u20MoreMode="sys"),document.body.classList.contains("u2m")&&a.dataset.t===curTab&&a.dataset.t!=="log"){showTab("log");return}showTab(a.dataset.t)}}),$("#mClose").onclick=()=>closeModal(),$("#giftBtn").onclick=()=>{S.fac&&(uiSfx("click"),giftModal(!0))},$("#actBtn").onclick=()=>{S.fac&&(uiSfx("click"),openQuest("act"))},$("#modal").onclick=t=>{t.target.id==="modal"&&closeModal()},window.addEventListener("resize",fitApp),window.addEventListener("orientationchange",fitApp),window.visualViewport&&window.visualViewport.addEventListener("resize",fitApp),$("#compactBtn").onclick=()=>setCompact(!document.body.classList.contains("compact")),applyUiPrefs(),fitApp(),bindControls();const o=()=>{typeof audInit==="function"&&audInit();const t=zoneOf(Math.min(S.stage,STAGES));typeof preloadZoneSounds==="function"&&preloadZoneSounds(t),AUD.music&&sndCfg().music&&AUD.music.paused?AUD.music.play().catch(()=>{}):!AUD.music&&S.fac&&playMusic(R.town?W.town.id:t.id)};if(document.addEventListener("pointerdown",o,!0),document.addEventListener("keydown",o,!0),resizeArena(),[H.x,H.y]=inWorld(WORLD.w/2,WORLD.h/2),snapCamera(),restoreGround(),!netHasUser){if(typeof netInit=="function")try{netInit()}catch{}else if(typeof netModal=="function")try{netModal("acc")}catch{}}else if(n.menu)slotMenu();else if(S.fac){try{sessionStorage.setItem("jxidle_in",String(SLOT))}catch{}if(delete S.jxLook,delete S.lookFx,recalc(),R.life=R.P.life,R.mana=R.P.mana,e&&setTimeout(()=>{recalc();const o=offlineGains();o&&(showOffline(o),save())},0),typeof XP_EVENT<"u"&&XP_EVENT>1&&log(`<b style="color:#ffd24a">🎉 Sự kiện toàn máy chủ: x${XP_EVENT} kinh nghiệm!</b>`),showTab("log"),log("Tiếp tục hành tẩu giang hồ…"),S.eqRebuildMsg){const[t,a]=S.eqRebuildMsg;log(`Đồ Hoàng Kim / Bạch Kim không còn trong game (theo bảng gốc VNG) — thu hồi <b>${t}</b> món, hoàn <b class="up">${fmtL(a)}</b> lượng`),toast(`Thu hồi ${t} món, hoàn ${fmtL(a)} lượng`),delete S.eqRebuildMsg,save()}if(S.banMsg&&(log(`Hoàng Kim biến thể ([Cực phẩm], [Hoàn Mỹ], [Tinh Xảo]…), Dương Thần và đồ sự kiện (Hắc Thần, Thương Khung, Long Tương…) đã xóa khỏi game: thu hồi <b>${S.banMsg}</b> món`),delete S.banMsg,save()),S.horseEnhBack&&(log(`Ngựa không còn cường hóa: ngựa đã cường hóa về +0, hoàn lại <b class="up">${fmtL(S.horseEnhBack)}</b> lượng`),toast(`Hoàn ${fmtL(S.horseEnhBack)} lượng cường hóa ngựa`),delete S.horseEnhBack,save()),window.__tampered&&(log('<span class="dim">Dữ liệu lưu không khớp chữ ký (đã chỉnh sửa ngoài game): dùng bản sao lưu gần nhất nếu có.</span>'),toast("Phát hiện chỉnh sửa file lưu")),loginCheck(),dotGift(),actDot(),typeof autoMapCheck=="function"&&(syncMaxStage(),S.mode!=="quest"&&S.autoMap!==!1&&autoMapCheck()),S.resumeTower){const t=S.resumeTower|0;delete S.resumeTower,setTimeout(()=>{typeof towerStart=="function"&&!R.dg&&!R.tower&&(towerStart(),R.tower&&t>0&&(R.tower.floor=t,R.banner={t:2,text:`${TOWER_MAP.n} · tầng ${t}`,sub:"Tiếp tục sau khi cập nhật"}),log(`🗼 Cập nhật xong: vào lại Tháp tầng ${t}.`))},1200)}{let t=0,a=0;for(const s of S.inv.concat(Object.values(S.eq||{}),S.epBox||[])){const c=vioDedup(s);c&&(t+=c,a++)}t&&(R.dirty=!0,log(`Sửa ${a} món Tím bị trùng dòng: gỡ ${t} dòng từ dòng trùng đầu tiên trở đi, trả lại đá thuộc tính để khảm lại.`))}if(window.HKMP_CONV&&window.HKMP_CONV.length&&(log(`Hoàng Kim Môn Phái chỉ còn các bộ theo cẩm nang JX1: đổi ${window.HKMP_CONV.length} món bộ đã bỏ (Thiên Quang, Kim Quang, HKMP cấp 120, đồ đôi / Vinh Diệu…) sang món cùng vị trí: ${window.HKMP_CONV.slice(0,6).map(esc).join(", ")}${window.HKMP_CONV.length>6?"…":""}`),window.HKMP_CONV=null,R.dirty=!0),window.GONE_CONV&&window.GONE_CONV.length){const t=window.GONE_CONV;log(`Đồ Hoàng Kim / Bạch Kim không theo bảng gốc VNG: đổi <b>${t.length}</b> món sang món cùng môn phái, cùng vị trí (giữ cường hóa / cấp Bạch Kim): ${esc([...new Set(t)].slice(0,6).join(", "))}${t.length>6?"…":""}`),toast(`Đổi ${t.length} món sang bảng mới`),window.GONE_CONV=[]}if(window.SET_PURGED){const t=window.SET_PURGED.reduce((a,s)=>a+s,0);window.SET_PURGED=null,log(`Đã xóa ${t} món thuộc bộ không còn trong game (Đằng Long, Tinh Sương…).`)}}else{try{sessionStorage.setItem("jxidle_in",String(SLOT))}catch{}pickFaction()}document.addEventListener("visibilitychange",()=>{document.hidden?S.fac&&save():S.fac&&!window.NET_GATE&&Date.now()-S.last>6e4&&(R.dirty=!0,recalc(),showOffline(offlineGains()),refresh()),lastT=performance.now()}),window.addEventListener("pagehide",()=>{S.fac&&save()}),window.addEventListener("keydown",t=>{t.key==="Escape"&&!$("#modal").classList.contains("hidden")&&closeModal()});const i=()=>{if(typeof chatInit=="function")try{chatInit()}catch{}if(typeof netInit=="function")try{netInit()}catch{}};i();requestAnimationFrame(frame)}init(),"serviceWorker"in navigator&&location.protocol.startsWith("http")&&navigator.serviceWorker.register("sw.js").catch(()=>{});    let fpsLastFrame=0,fpsDrawAcc=0;
const FPS_OPTS=[30,60,120];
function fpsVal(){const v=+uiPrefs().fps;return FPS_OPTS.includes(v)?v:60}
    function fpsOk(n){if(!fpsLastFrame){fpsLastFrame=n;return!0}fpsDrawAcc+=Math.min(100,Math.max(0,n-fpsLastFrame)),fpsLastFrame=n;const iv=1e3/fpsVal();if(fpsDrawAcc+.5<iv)return!1;fpsDrawAcc-=iv,fpsDrawAcc>=iv&&(fpsDrawAcc%=iv);return!0}
function fpsInject(){
  const s=document.getElementById("uSaver");
  if(!s||document.getElementById("uFps"))return;
  const lb=s.closest("label")||s;
  const d=document.createElement("div");
  d.className="row";d.style.margin="6px 0";
  const v=fpsVal(),idx=FPS_OPTS.indexOf(v);
  d.innerHTML=`<span>Tốc độ khung hình</span><input type="range" id="uFps" min="0" max="2" step="1" value="${idx>=0?idx:1}" style="flex:1;margin:0 8px"><b id="uFpsT" style="min-width:62px;color:var(--gold);text-align:right">${v} FPS</b>`;
  lb.insertAdjacentElement("afterend",d);
  const r=d.querySelector("#uFps");
  r.oninput=()=>{const f=FPS_OPTS[+r.value]||60;document.getElementById("uFpsT").textContent=f+" FPS";setUiPref({fps:f});typeof toast=="function"&&toast(`Tốc độ khung hình: ${f} FPS`)};
}
setInterval(fpsInject,800);
const STORED_V = +localStorage.getItem("jxidle_app_v") || 533;
const APP_V = Math.max(533, STORED_V);
let LATEST_VER = APP_V;
function checkUpdateVer(showToast){fetch("ver.json?t="+Date.now(),{cache:"no-store"}).then(n=>n.ok?n.json():null).then(n=>{
  if(!n)return;
  if(n.bt&&!window.MAINT){maintOn(n);return}
  if(+n.v>0){
    LATEST_VER=+n.v;
    const hasUp=LATEST_VER>APP_V;
    const b1=document.getElementById("verBtn"),b2=document.getElementById("u20ver");
    b1&&b1.classList.toggle("has-update",hasUp);
    b2&&b2.classList.toggle("has-update",hasUp);
    if(hasUp&&showToast){typeof toast=="function"&&toast(`Có bản cập nhật mới (v${LATEST_VER})!`)}
  }
}).catch(()=>{})}
async function forceAppUpdate(){
  try{save()}catch{}
  if(LATEST_VER>APP_V){
    try{localStorage.setItem("jxidle_app_v",String(LATEST_VER))}catch{}
  }
  typeof toast=="function"&&toast("Đang tải dữ liệu mới nhất…");
  try{
    if("caches"in window){
      const keys=await caches.keys();
      await Promise.all(keys.map(k=>caches.delete(k)));
    }
    if("serviceWorker"in navigator){
      const regs=await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r=>r.unregister()));
    }
  }catch{}
  setTimeout(()=>{
    const url=new URL(location.href);
    url.searchParams.set("v",Date.now());
    location.replace(url.toString());
  },600);
}
function openUpdateModal(){
  const hasUp=LATEST_VER>APP_V;
  modal(`<h3>🔄 Cập nhật phiên bản</h3>
    <p class="desc">${hasUp?`Đã có phiên bản mới: <b style="color:#ffd24a">v${LATEST_VER}</b> (bản hiện tại: <b>v${APP_V}</b>).`:`Hiện tại bạn đang ở phiên bản mới nhất: <b style="color:#7fe37a">v${APP_V}</b>.`}</p>
    <div class="card"><p class="dim small">${hasUp?'Bấm nút bên dưới để lưu dữ liệu và xóa bộ nhớ đệm, tải bản mới ngay.':'Không cần cập nhật. Nếu muốn xóa cache và tải lại tài nguyên, bấm nút bên dưới.'}</p></div>
    <div class="btnrow"><button class="btn on" id="bDoUpdate">${hasUp?'Tải cập nhật ngay':'Tải lại game'}</button><button class="btn" onclick="closeModal()">Đóng</button></div>`,
    ()=>{const b=document.getElementById("bDoUpdate");b&&(b.onclick=forceAppUpdate);});
}
function setupVerButtons(){
  const b1=document.getElementById("verBtn");
  if(b1&&!b1._bound){b1._bound=!0;b1.onclick=()=>{typeof uiSfx=="function"&&uiSfx("click");openUpdateModal();}}
  if(typeof u20On=="function"&&u20On()){
    let b=document.getElementById("u20ver");
    if(!b){
      const r=document.getElementById("u20r");
      if(r){
        const rows=r.querySelectorAll(".u20r-row");
        const targetParent=rows.length>=2?rows[1]:r;
        b=document.createElement("button");
        b.className="u20rb";b.id="u20ver";b.title="Cập nhật phiên bản";b.innerHTML="Cập<br>nhật";
        targetParent.appendChild(b);
      }
    }
    if(b&&!b._bound){
      b._bound=!0;
      b.onclick=()=>{typeof uiSfx=="function"&&uiSfx("click");openUpdateModal();};
    }
  }
  const hasUp=LATEST_VER>APP_V;
  const v1=document.getElementById("verBtn"),v2=document.getElementById("u20ver");
  v1&&v1.classList.toggle("has-update",hasUp);
  v2&&v2.classList.toggle("has-update",hasUp);
}
setTimeout(()=>{checkUpdateVer(!0);setupVerButtons();},1500);
setInterval(()=>{checkUpdateVer(!1);setupVerButtons();},60*1e3);
function appVerCheck(){checkUpdateVer(!1);setupVerButtons();}function maintOn(n){window.MAINT=!0,typeof NET<"u"&&(NET.holdUntil=9e15);let e=document.getElementById("maint");e||(e=document.createElement("div"),e.id="maint",document.body.appendChild(e)),e.style.cssText="position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse,#2a1d10f2,#0b0805fa);color:#efe1bd;text-align:center;padding:20px;font-family:inherit",e.innerHTML=`<div style="max-width:440px;border:1px solid #8a6a32;border-radius:10px;padding:22px 18px;background:#1a120acc;box-shadow:0 0 30px #000">
    <div style="font-size:42px">🛠</div><h2 style="color:#f3d27a;margin:8px 0">Máy chủ đang bảo trì</h2>
    <p style="font-size:14px;line-height:1.5">${typeof n.msg=="string"?esc(n.msg):"Đang dọn dẹp và nâng cấp máy chủ. Nhân vật của bạn vẫn an toàn (đã lưu trong máy)."}</p>
    <p style="font-size:12px;color:#b9a77d">Game tự vào lại khi bảo trì xong — không cần tải lại trang.</p></div>`,clearInterval(window.maintT),window.maintT=setInterval(()=>fetch("ver.json?t="+Date.now(),{cache:"no-store"}).then(o=>o.ok?o.json():null).then(o=>{o&&!o.bt&&location.reload()}).catch(()=>{}),6e4)}

// Worker mới phải nắm quyền ngay để sprite/bóng cùng URL không còn lấy từ cache phiên bản cũ.
function swRegisterFresh(){
  if (!("serviceWorker" in navigator) || !location.protocol.startsWith("http")) return;
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  });
  navigator.serviceWorker.register("sw.js", { updateViaCache: "none" })
    .then(registration => registration.update())
    .catch(() => {});
}
swRegisterFresh();
