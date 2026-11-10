/* Manual controls for JXWEB level-120 utility skills in offline VLI.
 * Passive attributes are processed by the existing calc()/skApplies() pipeline.
 * These active behaviors are compatible interpretations, not a server clone.
 */
'use strict';
(function(){
  const SPECIAL={
    710:{name:'Mê Ảnh Tung',cooldown:11,desc:'Lướt nhanh đến điểm đã chọn hoặc về phía trước.'},
    713:{name:'Ngự Tuyết Ẩn',cooldown:25,desc:'Ẩn thân trước quân địch Tống Kim trong 8 giây.'},
    715:{name:'Ma Âm Phệ Phách',cooldown:16,desc:'Khống chế kẻ địch xung quanh, gây choáng.'},
    716:{name:'Xuất Ứ Bất Nhiễm',cooldown:22,desc:'Giải khống chế và phòng trạng thái xấu trong 7 giây.'}
  };
  const state={next:{},stealthUntil:0,immunityUntil:0};
  window.VLI120_ACTIVE=state;
  const clock=()=>performance.now()/1000;
  const here=()=>typeof S!=='undefined'&&S&&S.fac;
  function vli120Cast(id){
    id=Number(id);
    const spec=SPECIAL[id];
    if(!spec||!here()||typeof SK==='undefined'||!S.sk?.[id])return false;
    if(S.lvl<120||SK[id].f!==S.fac){toast('Chưa đủ điều kiện để dùng kỹ năng 120.');return false;}
    if(typeof TK!=='undefined'&&TK.on&&TK.respawnT>0){toast('Đang hồi sinh.');return false;}
    const now=clock(),remaining=Math.ceil((state.next[id]||0)-now);
    if(remaining>0){toast('Kỹ năng hồi sau '+remaining+' giây.');return false;}
    const lv=typeof skLv==='function'?Math.max(1,skLv(id)):Math.max(1,S.sk[id]);
    const cost=(typeof skCost==='function'?Math.max(0,skCost(SK[id],lv)):0)||40;
    if(R.mana<cost){toast('Không đủ nội lực.');return false;}
    if(id===710){
      const aim=typeof INPUT!=='undefined'&&INPUT&&INPUT.target&&Number.isFinite(INPUT.target.x)?INPUT.target:null;
      let vx=0,vy=0;
      if(aim){vx=aim.x-H.x;vy=aim.y-H.y;}
      else {const angle=((H.dir||0)%8)*Math.PI/4;vx=Math.cos(angle);vy=Math.sin(angle);}
      const len=Math.hypot(vx,vy)||1,reach=150+Math.min(70,lv*3);
      const dist=aim?Math.min(reach,len):reach;
      H.x=clamp(H.x+vx/len*dist,WORLD.pad+5,WORLD.w-WORLD.pad-5);
      H.y=clamp(H.y+vy/len*dist,WORLD.pad+5,WORLD.h-WORLD.pad-5);
      if(typeof snapCamera==='function')snapCamera();
      if(typeof INPUT!=='undefined')INPUT.target=null;
    } else if(id===713){
      state.stealthUntil=now+8+Math.min(4,lv*.15);
    } else if(id===715){
      const around=(typeof TK!=='undefined'&&TK.on)?TK.ents.filter(e=>e.side!==(TK.side)):R.enemies;
      let n=0;
      for(const e of around){if(e.dead||e.hp<=0||Math.hypot(e.x-H.x,e.y-H.y)>230)continue;
        e.stun=Math.max(e.stun||0,2.2+lv*.08);
        e.hurt=Math.max(e.hurt||0,.5);
        n++;
      }
      if(!n){toast('Không có mục tiêu trong phạm vi Ma Âm.');return false;}
    } else if(id===716){
      state.immunityUntil=now+7;
      vli120Tick();
    }
    R.mana-=cost;
    state.next[id]=now+spec.cooldown;
    if(typeof burst==='function')burst(H.x,H.y,({710:'#56aaff',713:'#c9eaff',715:'#e56cff',716:'#7cffae'}[id]||'#ffd277'));
    if(typeof addText==='function')addText(H.x,H.y-52,spec.name,'#9be8ff',12);
    if(typeof uiSfx==='function')uiSfx('learn');
    if(typeof toast==='function')toast('✦ '+spec.name);
    if(typeof renderPad==='function')renderPad();
    if(typeof save==='function')save();
    vli120Refresh();
    return true;
  }
  function vli120Tick(){
    if(!here()||!R)return;
    if(state.immunityUntil>clock()){
      for(const k of ['stunT','slowT','poisonT','burnT'])if(Number.isFinite(R[k]))R[k]=0;
      for(const k of ['stun','cold','poison','burn'])if(Number.isFinite(H[k]))H[k]=0;
    }
  }
  function vli120Refresh(){
    const root=document.getElementById('vli120Bar');
    if(!root)return;
    const owned=here()?Object.entries(SPECIAL).filter(([id])=>S.sk[id]>0&&SK[id].f===S.fac):[];
    if(!owned.length){root.hidden=true;root.replaceChildren();return;}
    root.hidden=false;
    const key=owned.map(([id])=>id).join(',');
    if(root.dataset.skills!==key){
      root.dataset.skills=key;
      root.replaceChildren();
      for(const [id,spec] of owned){
        const btn=document.createElement('button');btn.type='button';btn.className='vli120-cast';btn.title=spec.name+': '+spec.desc;
        btn.dataset.id=id;
        const img=document.createElement('img');img.src='img/s/'+id+'.png';img.alt='';
        // Icons for these source skills are numbered 710,713,715,716.
        btn.append(img);const cap=document.createElement('span');btn.append(cap);
        btn.addEventListener('click',()=>vli120Cast(id));root.append(btn);
      }
    }
    for(const btn of root.querySelectorAll('button')){
      const id=+btn.dataset.id,sec=Math.ceil(Math.max(0,(state.next[id]||0)-clock()));
      btn.disabled=sec>0;
      btn.querySelector('span').textContent=sec>0?String(sec)+'s':SPECIAL[id].name;
    }
  }
  window.vli120Cast=vli120Cast;
  window.vli120Refresh=vli120Refresh;
  window.vli120Tick=vli120Tick;
  document.addEventListener('DOMContentLoaded',()=>{vli120Refresh();setInterval(vli120Refresh,800);});
})();
