function checkAccountBanned() {
  if (typeof localStorage === 'undefined') return false;
  if (localStorage.getItem('jx2_account_banned') === '1') {
    document.body.innerHTML = `
      <div style="position:fixed;inset:0;background:#090d0f;color:#e74c3c;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;padding:24px;text-align:center;z-index:999999;">
        <h1 style="font-size:28px;margin-bottom:12px;color:#e74c3c;">TÀI KHOẢN ĐÃ BỊ KHÓA VĨNH VIỄN</h1>
        <p style="font-size:15px;color:#cbd5e1;max-width:500px;line-height:1.6;margin-bottom:16px;">
          Tài khoản này đã bị đình chỉ do vi phạm quy tắc an ninh (Cố tình dò mã truy cập Quản Trị Viên trái phép).
        </p>
        <div style="font-size:12px;color:#64748b;">Mã vi phạm: SEC_AUTH_VIOLATION_GM</div>
      </div>
    `;
    return true;
  }
  return false;
}

function openGmAccessModal() {
  if (checkAccountBanned()) return;

  let failCount = parseInt(localStorage.getItem('jx2_gm_fail_count') || '0', 10);
  if (failCount >= 3) {
    localStorage.setItem('jx2_account_banned', '1');
    checkAccountBanned();
    return;
  }

  const remaining = 3 - failCount;
  modal(`
    <div style="padding:10px 4px;">
      <h3 style="color:#ffd76a;margin-bottom:8px;font-size:18px;">Xác Thực Quyền Quản Trị</h3>
      <p class="desc" style="margin-bottom:14px;color:#cbd5e1;">Vui lòng nhập mã bảo mật để mở Bảng Điều Khiển Quản Trị.</p>
      
      <div class="row" style="margin-bottom:12px;">
        <input type="password" id="gmSecretInput" placeholder="Nhập mã code..." style="width:100%;font-size:16px;padding:10px 14px;background:#0e1418;border:1px solid #c8a45a;color:#fff;border-radius:4px;outline:none;" autofocus>
      </div>

      <p style="color:#e74c3c;font-size:13px;line-height:1.5;margin-bottom:8px;background:rgba(231,76,60,0.12);padding:8px 12px;border-left:3px solid #e74c3c;border-radius:2px;">
        ⚠️ <b>Phần dành cho QTV, vui lòng không thử dưới mọi hình thức. Cố tình nhập sai sẽ bị khóa tài khoản.</b>
      </p>

      <div style="font-size:12px;color:#94a3b8;margin-bottom:16px;">
        Số lần thử còn lại: <b style="color:${remaining === 1 ? '#e74c3c' : '#ffd76a'};font-size:14px;">${remaining} / 3</b>
      </div>

      <div class="btnrow" style="display:flex;gap:10px;justify-content:flex-end;">
        <button class="btn" id="bGmSubmit" style="background:#c8a45a;color:#121618;font-weight:bold;padding:8px 20px;">Xác Nhận</button>
        <button class="btn" id="bGmCancel" style="background:#2c3940;color:#cbd5e1;padding:8px 16px;">Hủy</button>
      </div>
    </div>
  `, () => {
    const input = document.getElementById('gmSecretInput');
    const submitBtn = document.getElementById('bGmSubmit');
    const cancelBtn = document.getElementById('bGmCancel');

    cancelBtn && (cancelBtn.onclick = () => closeModal(!0));

    const verify = () => {
      const val = (input ? input.value : '').trim();
      const salt = '_jx2_qtv_salt_2026';
      if (val === '29061994') {
        localStorage.removeItem('jx2_gm_fail_count');
        localStorage.setItem('gm_token', 'gm_direct_' + Date.now());
        localStorage.setItem('gm_username', 'admin');
        closeModal(!0);
        window.open('/gm?token=45ee7406856f702ada59e06b44941c6a', '_blank');
      } else {
        failCount += 1;
        localStorage.setItem('jx2_gm_fail_count', String(failCount));
        if (failCount >= 3) {
          localStorage.setItem('jx2_account_banned', '1');
          closeModal(!0);
          checkAccountBanned();
        } else {
          toast(`Mã sai! Cảnh báo: Còn ${3 - failCount} lần thử trước khi khóa vĩnh viễn.`);
          openGmAccessModal();
        }
      }
    };

    submitBtn && (submitBtn.onclick = verify);
    input && (input.onkeydown = (e) => {
      if (e.key === 'Enter') verify();
    });
  });
}


"use strict";let curTab="log",invDirty=!0;const lootMsgMin=()=>0;function log(n){R.quiet||(R.logs.unshift(n),(R.logT||(R.logT=[])).unshift(Date.now()),R.logs.length>150&&R.logs.pop(),R.logT.length>150&&(R.logT.length=150),R.logDirty=!0)}let toastT;function toast(n){const e=$("#toast");e.textContent=n,e.classList.add("on"),clearTimeout(toastT),toastT=setTimeout(()=>e.classList.remove("on"),1800)}function modal(n,e,t){if(typeof checkAccountBanned==="function"&&checkAccountBanned())return;$("#mBody").innerHTML=n;const m=$("#modal");m.classList.remove("hidden","item-preview-modal");m.dataset.locked=t?"1":"";e&&e();try{$("#modal .mbox").focus({preventScroll:!0})}catch{}}function closeModal(n){const m=$("#modal");if(m.dataset.locked&&!n)return;m.classList.add("hidden");m.classList.remove("item-preview-modal");}const FUSE_KEEP=6;function isJunk(n){if(typeof dtNeed=="function"&&dtNeed(n)||S.lootF&&S.lootF.pickAll&&lootMatch(n)||(n.set&&!n.lock&&!n.plv&&setKept(n),n.set||n.vio||n.plv||n.lock||n.thanma||n.pack||n.ktc))return!1;if(!sexOk(n))return!0;const e=FAC[S.fac];if(DETAIL_SLOT[n.d]==="weapon"&&e&&!weaponFits(n))return!0;const t=S.eq[slotFor(n)];return!(!t||betterThanEquipped(n)||itemPower(n)>itemPower(t)*.85||FUSE_SLOTS.includes(n.d)&&S.inv.filter(s=>FUSE_SLOTS.includes(s.d)&&!s.set&&!s.vio).length<FUSE_KEEP)}function sweepJunk(){if(S.autoJunk===!1)return 0;let n=0;for(let e=0;e<INV_MAX;e++){const t=S.inv.filter(isJunk).sort((s,a)=>itemPower(s)-itemPower(a))[0];if(!t)break;S.inv.splice(S.inv.indexOf(t),1),S.gold+=itemValue(t),n++}return n&&(invDirty=!0),n}function addItem(n,e,t,s){if(typeof eqBanned=="function"&&eqBanned(n))return e||log(`<span class="dim">${esc(n.n)}: đồ đã xóa khỏi game</span>`),!1;if(typeof eqRemoved=="function"&&eqRemoved(n)){const l=itemValue(n);return S.gold+=l,e||log(`<span class="dim">${esc(n.n)} (đồ đã bỏ khỏi game) đổi thành ${fmtL(l)} lượng</span>`),!1}const a=l=>{t&&!R.quiet&&lootMsgMin()>=0&&(n.r||0)>=lootMsgMin()&&log(`Nhặt được <span style="color:${RAR_COL[n.r||0]}">${esc(n.n)}</span>${l?` <span class="dim">${l}</span>`:""}`)};return typeof epAutoStore=="function"&&epAutoStore(n)?(invDirty=!0,a("→ Rương ép"),!0):typeof stableAutoIn=="function"&&stableAutoIn(n,e)?(invDirty=!0,a("→ Mã Trường"),!0):!t&&!lootMatch(n)?(S.gold+=itemValue(n),!1):(S.inv.length>=INV_MAX&&(n.set||n.vio||n.plv)&&makeRoom(n,!0),S.inv.length>=INV_MAX?(S.gold+=itemValue(n),e||log('<span class="dim">Túi đầy, tự bán '+esc(n.n)+"</span>"),!1):!s&&S.autoJunk!==!1&&isJunk(n)?(S.gold+=itemValue(n),a(`(đồ thừa, tự bán +${fmtL(itemValue(n))} lượng)`),!1):(S.inv.unshift(n),invDirty=!0,recItem(n),typeof dtItemGot=="function"&&dtItemGot(n),t?a(""):!e&&lootMsgMin()>=0&&(n.r||0)>=lootMsgMin()&&log(`Nhặt được <span style="color:${RAR_COL[n.r]}">${esc(n.n)}</span>`),S.autoEquip&&betterThanEquipped(n)&&equip(n,!0),!0))}function equipGain(n){if(!reqOk(n))return-1;const e=Object.assign({},S.eq);return e[slotFor(n)]=n,power(calc(e))/Math.max(1,power(calc(S.eq)))-1}function upMark(n){if(n.pack||n.ktc||typeof isUpgrade!="function")return"";if(betterThanEquipped(n))return'<u class="up" title="Mạnh hơn đồ đang mặc: bấm Mặc đồ tốt">▲</u>';if(isUpgrade(n)){const e=reqOk(n)?["mạnh hơn rất ít (dưới 1%)"]:reqProblems(n);return`<u class="up soon" title="${esc("Chưa tự mặc: "+e.join("; "))}">▲</u>`}return isPotential(n)?`<u class="up pot" title="Cường hóa lên +${enhGain(n).enh} thì mạnh hơn đồ đang mặc">△</u>`:""}function betterThanEquipped(n){if(n.pack||n.ktc)return!1;const e=FAC[S.fac];return DETAIL_SLOT[n.d]==="weapon"&&e&&!weaponFits(n)?!1:equipGain(n)>.01}function equip(n,e){if(!reqOk(n)){e||toast("Chưa mặc được: "+reqProblems(n).join("; "));return}const t=slotFor(n),s=S.eq[t];S.inv=S.inv.filter(a=>a!==n),s&&S.inv.unshift(s),S.eq[t]=n,R.dirty=!0,invDirty=!0,e||uiSfx(n.d<=1?"equipWeapon":"equipCloth"),e||(closeModal(),refresh())}function unequip(n){const e=S.eq[n];if(e){if(S.inv.length>=INV_MAX){toast("Túi đầy");return}delete S.eq[n],S.inv.unshift(e),R.dirty=!0,invDirty=!0,closeModal(),refresh()}}const sellProtected=n=>!!(n.set&&setKept(n)||n.vio||n.plv||n.lock||n.thanma||n.pack||n.ktc||typeof dtNeed=="function"&&dtNeed(n));function sellUnmatched(){const n=S.inv.filter(t=>!lootMatch(t)&&!sellProtected(t));let e=0;for(const t of n)e+=itemValue(t);return S.gold+=e,S.inv=S.inv.filter(t=>!n.includes(t)),invDirty=!0,{n:n.length,gold:e,kept:S.inv.filter(t=>!lootMatch(t)).length}}function sell(n){if(!S.inv.includes(n)){closeModal();return}if(n.lock){toast("Món đã khóa: mở khóa trước khi bán");return}S.inv=S.inv.filter(e=>e!==n),S.gold+=itemValue(n),invDirty=!0,closeModal(),refresh()}function findItem(n){return n=+n,S.inv.find(e=>e.uid===n)||(S.stable||[]).find(e=>e.uid===n)||Object.values(S.eq).find(e=>e&&e.uid===n)||(R.ground.find(e=>e.it.uid===n)||{}).it}function itemCell(n){return n?`<button class="it r${n.r}${reqOk(n)?"":" bad"}" data-uid="${n.uid}"${reqOk(n)?"":` title="${esc("Chưa mặc được: "+reqProblems(n).join("; "))}"`}>${n.ic?`<img src="${esc(n.ic)}" alt="">`:""}<i>${n.ktc?n.ktc.c:n.pack?n.pack.c:n.lvl}</i>${S.inv.includes(n)?upMark(n):""}${n.s>=0&&n.s<5?`<b class="s5" style="background:${SERIES_COL[n.s]}"></b>`:""}${n.lock?'<u class="lk">🔒</u>':typeof dtNeed=="function"&&S.inv.includes(n)&&dtNeed(n)?'<u class="lk" title="Giữ để trả Dã Tẩu">📜</u>':""}${n.enh?`<u class="en">+${n.enh}</u>`:""}</button>`:""}
function itemQuality(it) {
  if (!it) return 0;
  if (it.set) return it.set.kind === 'gold' ? 4 : 5;
  if (it.vio || it.r === 3) return 3;
  return it.mag && it.mag[0] && it.mag[0].a > 0 ? 1 : 0;
}
function itemNativeName(it) {
  if (!it) return '';
  const horsePatch = it && it.d === 10 && !it.set && window.JX_ACCESSORY_PATCH && JX_ACCESSORY_PATCH.horses && JX_ACCESSORY_PATCH.horses.find(patch => patch.p === it.p && patch.n);
  if (horsePatch) return horsePatch.n;
  const fixes = window.JXN && JXN.names || [];
  const match = fixes.find(fix => fix.d === it.d && (fix.kind ? it.set && fix.kind === it.set.kind && fix.grp === it.set.grp && fix.sid === it.set.sid && fix.lvl === it.lvl && fix.old && fix.old.toLocaleLowerCase('vi') === String(it.n).toLocaleLowerCase('vi') : !it.set && fix.p === it.p));
  return match ? match.n : (it.n || '');
}
function itemTitle(it) { return String(itemNativeName(it)); }
const JX_COL = { black: '#000000', white: '#ffffff', red: '#ff0000', green: '#00ff00', blue: '#6464ff', yellow: '#ffff00', orange: '#fcab3a', pink: '#b500b5', violet: '#aa1eff', purple: '#aa1eff', cyan: '#00ffff', metal: '#f6ff75', wood: '#00ff78', water: '#4e7cff', fire: '#ff5a00', earth: '#fecfb3', dblue: '#787878', hblue: '#6464ff', gold: '#dee1a5', gray: '#bdbebd', grey: '#bdbebd' };
function jxColor(s) {
  let opened = false;
  const text = s.replace(/&lt;\/?color(?:=([^&]*))?&gt;/gi, (tag, token) => {
    const close = opened ? '</span>' : '';
    opened = false;
    if (!token) return close;
    let color = JX_COL[token.toLowerCase()];
    if (/^\d{1,3},\d{1,3},\d{1,3}$/.test(token) && token.split(',').every(v => Number(v) <= 255)) color = 'rgb(' + token + ')';
    if (!color) return close;
    opened = true;
    return close + '<span style="color:' + color + '">';
  });
  return (text + (opened ? '</span>' : '')).replace(/&lt;enter&gt;/gi, '<br>').replace(/\[MAX\]/g, '<span class="mx2">[MAX]</span>');
}

function itemHTML(it, inShop = false) {
  if (!it) return '';
  if (it.ktc) {
    const e = typeof KTC !== 'undefined' && KTC.find(t => t.k === it.ktc.k) || { d: '' };
    return `<div class="vp-card r${itemQuality(it)}"><div class="vp-name r${itemQuality(it)}">${esc(it.n)}</div><div class="vp-lines"><div class="vp-base">Vật phẩm Kỳ Trân Các · số lượng ${it.ktc.c}</div><div class="vp-intro">${esc(e.d || '')}</div></div></div>`;
  }
  const vpLines = itemLines(it), vpRank = itemQuality(it);
  const vpRow = (cls, text) => `<div class="${cls}">${jxColor(esc(String(text)))}</div>`;
  const vpMagic = m => {
    let text = attrText(attrName(m.a), m.p.map(v => v === -1 ? 0 : v));
    if (Array.isArray(m.min) && Array.isArray(m.max) && m.min[0] !== undefined && m.max[0] !== undefined) {
      text += Number(m.p[0]) === Number(m.max[0]) ? ' [MAX]' : ` [${m.min[0]}-${m.max[0]}]`;
    }
    return text;
  };
  const vpReq = vpLines.filter(([k]) => k === 'r' || k === 'r bad');
  const vpBase = vpLines.filter(([k]) => k === 'b');
  const vpFirstBody = vpLines.findIndex(([k]) => k === 'b' || k === 'm' || k === 'h' || k === 'r' || k === 'r bad');
  const vpExtras = vpLines.slice(0, vpFirstBody < 0 ? vpLines.length : vpFirstBody).filter(([k]) => k === 'h on');
  const vpAct = typeof hiddenActive === 'function' ? hiddenActive(it) : 0;
  let vpBody = it.s >= 0 && it.s < SERIES.length ? `<div class="vp-series" style="color:${SERIES_COL[it.s]}">Hệ ${esc(SERIES[it.s])}</div>` : '';
  const vpQualityLabel = vpRank === 4 && (it.req || []).some(req => req[0] === 39 && req[1] >= 0) ? 'Hoàng Kim môn phái' : ['Đồ trắng', 'Đồ xanh', 'Đồ vàng', 'Đồ tím', 'Hoàng Kim', 'Bạch Kim'][vpRank];
  vpBody += `<div class="vp-quality-label vp-name r${vpRank}">${vpQualityLabel}</div>`;
  if (it.desc) vpBody += vpRow('vp-intro', it.desc);
  if (typeof setItemWarning === 'function') { const warning = setItemWarning(it); if (warning) vpBody += vpRow('vp-req bad', warning); }
  if (typeof nxeVisualWarning === 'function') { const warning = nxeVisualWarning(it); if (warning) vpBody += vpRow('vp-intro', warning); }
  vpBody += vpRow('vp-gap', '');
  vpBody += vpBase.map(([k, t]) => vpRow(t === 'Không thể phá hủy' ? 'vp-indestructible' : 'vp-base', t)).join('');
  const vpDur = (it.base || []).find(v => attrName(v[0]) === 'durability_v');
  if (vpDur) vpBody += vpRow('vp-base', `Độ bền: ${it.dur == null ? vpDur[1] : it.dur} / ${vpDur[2]}`);
  if (it.indestructible && !vpBase.some(([k, t]) => t === 'Không thể phá hủy')) vpBody += vpRow('vp-indestructible', 'Không thể phá hủy');
  vpBody += vpExtras.map(([k, t]) => vpRow('vp-base', t)).join('');
  vpBody += vpReq.map(([k, t]) => vpRow(k === 'r bad' ? 'vp-req bad' : 'vp-req', t)).join('');
  (it.mag || []).slice(0, 6).forEach((m, i) => {
    const vpHidden = i % 2 === 1, vpOn = !vpHidden || Math.floor(i / 2) < vpAct;
    vpBody += vpRow((vpHidden ? (vpOn ? 'vp-magic on vp-hidden' : 'vp-magic off') : 'vp-magic on')+(attrName(m.a)==='allskill_v'&&vpOn?' skill-plus':''), vpMagic(m));
  });
  if (it.set) {
    const vpEx = typeof goldEnhance === 'function' ? goldEnhance(it, S.eq) : 0;
    if ((it.ext || []).length) vpBody += vpRow('vp-gap', '');
    (it.ext || []).forEach((m, i) => { vpBody += vpRow((i < vpEx ? 'vp-magic on' : 'vp-magic off')+(attrName(m.a)==='allskill_v'&&i<vpEx?' skill-plus':''), vpMagic(m)); });
  }
  if (it.expiresAt) vpBody += vpRow('vp-expiry', `Thời hạn: ${it.expiresAt}`);
  if (it.d < 10 && Object.values(S.eq).includes(it) && (it.mag || []).length && it.s >= 0 && typeof ACCRUE !== 'undefined') {
    const vpSourceSeries = Number(Object.keys(ACCRUE).find(series => ACCRUE[series] === it.s));
    const vpSourceSlots = { weapon: 'Dây chuyền và Y phục', armor: 'Nhẫn trái (dưới) và Thắt lưng', ring1: 'Vũ khí và Nón', ring2: 'Ngọc bội và Hộ uyển', amulet: 'Nhẫn trái (dưới) và Thắt lưng', boot: 'Nón và Vũ khí', belt: 'Ngọc bội và Hộ uyển', helm: 'Dây chuyền và Y phục', cuff: 'Nhẫn phải (trên) và Giày', pendant: 'Nhẫn phải (trên) và Giày' };
    const eqSlot = typeof slotOfEquipped === 'function' ? slotOfEquipped(it, S.eq) : null;
    if (eqSlot && vpSourceSlots[eqSlot]) {
      vpBody += vpRow('vp-hint', 'Cần hệ ' + SERIES[vpSourceSeries] + ' của ' + vpSourceSlots[eqSlot] + ' để kích hoạt thuộc tính âm');
    }
  }
  if (it.keep) vpBody += vpRow('vp-hint', 'Đã giữ: không tự bán hoặc tự mặc; bỏ giữ trong Lò rèn.');
  const nativeOpts = (it.mag || []).concat(it.ext || []).filter(m => ['fasthitrecover_v','freezetimereduce_p','visionradius_p'].includes(attrName(m.a)));
  if (nativeOpts.length) {
    const uses={fasthitrecover_v:'Rút ngắn tư thế trúng đòn',freezetimereduce_p:'Giảm thời gian làm chậm Băng trong Tống Kim và chiến斗斗 землIO',visionradius_p:'Tăng tầm tìm mục tiêu Auto'};
    vpBody += vpRow('vp-hint',[...new Set(nativeOpts.map(m=>uses[attrName(m.a)]))].join(' · ')+'. Dòng ẩn cần kích hoạt để có hiệu lực.');
  }
  if (it.set && typeof setMembers === 'function') {
    const vpWorn = new Set(Object.values(S.eq).filter(v => v && v.set && v.set.grp === it.set.grp).map(v => v.n));
    const vpBag = new Set(S.inv.filter(v => v.set && v.set.grp === it.set.grp).map(v => v.n));
    vpBody += vpRow('vp-gap', '');
    vpBody += [...new Set(setMembers(it).map(v => v.n))].map(n => vpRow(vpWorn.has(n) ? 'vp-member worn' : vpBag.has(n) ? 'vp-member bag' : 'vp-member missing', n)).join('');
  }
  return `<div class="vp-card r${vpRank}"><div class="vp-name r${vpRank}${it.dur === 0 ? ' broken' : ''}">${esc(itemTitle(it))}${it.set && it.set.kind === 'platina' ? ` +${it.lvl}` : it.lvl && it.d < 10 ? ` [cấp ${it.lvl}]` : ''}</div><div class="vp-lines">${inShop ? vpRow('vp-price', `Giá cả: ${fmt(it.price || itemValue(it))} lượng`) : ''}${it.bound ? vpRow('vp-bound', 'Vật phẩm đính kèm theo nhân vật') : ''}${vpBody}<div class="vp-price">Giá bán: <span>${fmt(itemValue(it))} lượng</span></div></div></div>`;
}
function fixReqPoints(n){const e=reqDeficit(n),t=Object.values(e).reduce((s,a)=>s+a,0);if(!t)return!1;if(S.attrPts<t)return toast(`Cần ${t} điểm tiềm năng, đang có ${S.attrPts}`),!1;for(const s in e)S.attr[s]+=e[s],S.attrPts-=e[s];return R.dirty=!0,recalc(),toast("Đã cộng điểm để đủ điều kiện"),!0}function cmpLines(n,e){if(e)return"";const t=reqOk(n),s=equipCompare(n,!t),a=p=>p>5e-4?"cp":p<-5e-4?"cn":"dim",l=(p,u,k)=>`<span class="${a(u)}">${p} ${k}</span>`,o=t?"So với đang mặc":"Nếu đủ điều kiện, so với đang mặc",h=t?[]:reqProblems(n),m=DETAIL_SLOT[n.d]==="weapon"&&FAC[S.fac]&&!weaponFits(n),b=Object.values(reqDeficit(n)).reduce((p,u)=>p+u,0),d=h.length>0&&h.length===Object.keys(reqDeficit(n)).length;return`<div class="cmp2"><small class="dim">${o}:</small><div class="cmpv">${l("Sức mạnh",s.gain,pctTxt(s.gain))} ${l("DPS",s.dps,pctTxt(s.dps))} ${l("Sinh lực",s.life,numTxt(s.life))} ${l("Né",s.def,numTxt(s.def))} ${l("Kháng TB",s.res,numTxt(s.res)+"%")}</div>
    ${h.length?`<div class="reqbad"><b>Chưa mặc được, thiếu:</b><br>${h.map(esc).join("<br>")}${d?`<br><small>Cần ${b} điểm tiềm năng${S.attrPts>=b?` (đang có ${S.attrPts}): bấm "Cộng điểm" để đủ điều kiện`:`, đang có ${S.attrPts}: lên cấp thêm`}.</small>`:""}</div>`:""}
    <div class="reqnote"><b>Vì sao:</b><br>${s.why.map(esc).join("<br>")}</div>
    ${m?'<div class="reqnote">Sai loại vũ khí của môn phái: tự mặc sẽ bỏ qua, bạn vẫn mặc tay được.</div>':""}</div>`}function autoEquipAll(){if(!S.autoEquip)return 0;let n=0;for(let e=0;e<14;e++){let t=null,s=.01;for(const l of S.inv.concat(typeof epBox=="function"?epBox().filter(o=>o.vio&&(o.mag||[]).length):[])){if(!reqOk(l))continue;const o=FAC[S.fac];if(DETAIL_SLOT[l.d]==="weapon"&&o&&!weaponFits(l))continue;const h=equipGain(l);h>s&&(s=h,t=l)}if(!t)break;S.inv.includes(t)||(itemRemove(t),S.inv.push(t));const a=S.eq[slotFor(t)];equip(t,!0),n++,a&&a.lock&&!R.quiet&&log(`<span class="dim">Tự mặc đồ tốt hơn: thay <b>${esc(a.n)}</b> bằng <b>${esc(t.n)}</b> (món cũ đã khóa 🔒, ở hành trang)</span>`),S.inv.length>INV_MAX&&typeof epBox=="function"&&epBox().push(S.inv.shift())}return n&&(invDirty=!0,R.dirty=!0),n}function vu(attr) {
  let t = String(attr || '').toLowerCase();
  let desc = (typeof J !== 'undefined' && J.attrDesc && J.attrDesc[t]) || '';
  let match = desc.match(/<color=(blue|orange)>/i);
  if (match) return match[1].toLowerCase() === 'blue' ? 'tone-blue' : 'tone-gold';
  if (/(lifemax|lifereplenish|manamax|manareplenish|stamina|maxres|res|armor|defense|block|shield|potion|heal|recovery|dodge|avoid|damagereduce)/.test(t)) {
    return 'tone-green';
  }
  if (/(damage|attack|skill|strike|hit|accuracy|enhance|ignoredefense)/.test(t)) {
    return 'tone-blue';
  }
  return 'tone-gold';
}

function itemTipJX(it) {
  if (!it) return '';
  const lines = [];
  const mul = typeof enhMul === 'function' ? enhMul(it) : 1;
  const lineMul = typeof enhLineMul === 'function' ? enhLineMul(it) : 1;

  // 1. Base Attributes (Thuộc tính cơ bản)
  const dmgMin = (it.base || []).find(b => b[0] === 28);
  const dmgMax = (it.base || []).find(b => b[0] === 29);
  if (dmgMin) {
    lines.push(['b', `Sát thương: ${Math.round(dmgMin[1] * mul)} - ${Math.round((dmgMax ? dmgMax[1] : dmgMin[1]) * mul)}`]);
  }
  for (const [id, v1, v2] of (it.base || [])) {
    const aName = attrName(id);
    if (id === 28 || id === 29 || aName === 'durability_v' || aName === 'item_purple') continue;
    let avg = (v1 + v2) / 2 * mul;
    let text = attrText(aName, [Math.round(avg), 0, Math.round(v2 * mul)]);
    let noEffect = (typeof ATTR_NOEFFECT !== 'undefined' && ATTR_NOEFFECT.has(aName)) ? ' — không tác dụng ở bản idle' : '';
    lines.push(['b', text + noEffect]);
  }

  // 2. Magic Attributes (Thuộc tính trang bị & Dòng ẩn)
  const actCount = typeof hiddenActive === 'function' ? hiddenActive(it) : 0;
  (it.mag || []).forEach((m, idx) => {
    const isHidden = idx % 2 === 1;
    const isAct = !isHidden || Math.floor(idx / 2) < actCount;
    const aName = attrName(m.a);
    const tone = vu(aName);
    const cls = isHidden ? (isAct ? `h on ${tone}` : 'h') : `m ${tone}`;
    let text = attrText(aName, m.p.map(v => v === -1 ? 0 : Math.round(v * lineMul)));
    if (isHidden && !isAct) text += ' (ẩn)';
    lines.push([cls, text]);
  });

  // 3. Set Bonus (Thuộc tính bộ Hoàng Kim / Bạch Kim)
  if (it.set) {
    const setAct = typeof goldEnhance === 'function' ? goldEnhance(it, S.eq) : 0;
    const setWorn = typeof setCounts === 'function' && setCounts(S.eq)[it.set.grp] || 0;
    (it.ext || []).forEach((m, idx) => {
      const aName = attrName(m.a);
      const tone = vu(aName);
      const isAct = idx < setAct;
      const cls = isAct ? `h on ${tone}` : 'h';
      let text = attrText(aName, m.p.map(v => v === -1 ? 0 : Math.round(v * lineMul)));
      text += isAct ? ' (bộ)' : ` (mặc ${Math.min((it.set.n1 || 2) * (idx + 1), it.set.n2 || 5)} món cùng bộ)`;
      lines.push([cls, text]);
    });

    lines.push(['r', `Bộ ${it.set.kind === 'gold' ? 'Hoàng Kim' : 'Bạch Kim'}: đang mặc ${setWorn} món · đủ ${it.set.n2 || 5} món mở hết dòng ẩn mọi trang bị`]);
    if (typeof setMembers === 'function') {
      const bName = typeof bareName === 'function' ? bareName : (s => String(s || '').replace(/^\[[^\]]*\]\s*/, ''));
      for (const m of setMembers(it)) {
        const isWorn = Object.values(S.eq).some(h => h && h.set && bName(h.n) === bName(m.n));
        lines.push([isWorn ? 'set-active' : 'r', `${isWorn ? '' : '· '}${m.n}`]);
      }
    }
  }

  // 4. Requirements (Yêu cầu trang bị)
  const reqLabels = {36: 'Cấp', 32: 'Sức mạnh', 33: 'Thân pháp', 34: 'Sinh khí', 35: 'Nội công', 37: 'Hệ', 38: 'Giới tính', 39: 'Môn phái'};
  for (const [rId, rVal] of (it.req || [])) {
    if (reqLabels[rId] && (rVal > 0 || rId === 39)) {
      let valText = rVal;
      if (rId === 37) valText = SERIES[rVal] || rVal;
      else if (rId === 38) valText = rVal ? 'Nữ' : 'Nam';
      else if (rId === 39) valText = (typeof J !== 'undefined' && J.factions && (J.factions.find(f => f.id === rVal) || {}).n) || rVal;
      lines.push(['r', `Yêu cầu ${reqLabels[rId]}: ${valText}`]);
    }
  }

  // 5. Forge / Khảm / Nâng cấp notes
  lines.push(['r', 'Khảm dòng 6/6: Món này không khảm được']);
  lines.push(['r', 'Rèn ngẫu nhiên ở Lò rèn: bậc đồ theo cấp nhân vật · mức Khá có 45% thành công (3–4 dòng), trả bằng vàng']);

  // Quality color
  const qCols = ['#c8c8c8', '#8fc6ff', '#e8dcc8', '#cf8aff', '#ffb070', '#ffd24a'];
  const nameCol = it.set ? (it.set.kind === 'platina' ? '#ffed35' : '#ffb070') : (qCols[it.r] || '#ffb070');
  const catName = typeof J !== 'undefined' && J.items && J.items[it.d] ? J.items[it.d].n : '';
  const reqLvl = (it.req || []).find(([k]) => k === 36);
  const lvlText = reqLvl && reqLvl[1] > 0 ? `yêu cầu cấp ${reqLvl[1]} · bậc đồ ${it.lvl || 1}` : `bậc đồ ${it.lvl || 1}`;
  const seriesText = it.s >= 0 && it.s < SERIES.length ? ` · <span style="color:${SERIES_COL[it.s]}">hệ ${SERIES[it.s]}</span>` : '';

  return `
    <div class="idet" data-item-uid="${Number(it.uid)}">
      <div class="pic r${it.r || 0}">
        ${it.ic ? `<img src="${esc(it.ic)}" alt="" draggable="false">` : ''}
      </div>
      <div>
        <h4 style="color:${nameCol};font-size:15px;font-weight:bold;margin:0 0 3px">${esc(it.n)}${it.enh ? ` <span class="enh">+${it.enh}</span>` : ''}</h4>
        <small class="dim">${esc(catName)} · ${lvlText}${seriesText}</small>
      </div>
    </div>
    <div class="sl">
      ${lines.map(([cls, txt]) => `<div class="${cls}">${esc(txt)}</div>`).join('')}
    </div>
  `;
}

function itemModal(n, e, viewMode = 'item') {
  if (n && n.pack && typeof packModal == "function") return packModal(n);
  if (n && n.ktc && typeof ktcItemModal == "function") return ktcItemModal(n);
  if (!n) return;

  const cur = !e && S.eq[slotFor(n)];
  const hasTabs = !!(cur && S.inv.includes(n));
  const isWorn = hasTabs && viewMode === 'worn';
  const it = isWorn ? cur : n;

  const reqWarning = (!isWorn && e && !reqOk(n)) ? `<div class="reqbad"><b>Đang mặc nhưng CHƯA ĐỦ ĐIỀU KIỆN nên món này KHÔNG có tác dụng gì:</b><br>${reqProblems(n).map(esc).join('<br>')}</div>` : '';

  const segmentHtml = hasTabs ? `<div class="item-segment" role="tablist" aria-label="Chọn món để xem">
    <button class="${isWorn ? '' : 'on'}" role="tab" aria-selected="${isWorn ? 'false' : 'true'}" data-item-view="item">Đang xem</button>
    <button class="${isWorn ? 'on' : ''}" role="tab" aria-selected="${isWorn ? 'true' : 'false'}" data-item-view="worn">Đang mặc</button>
  </div>` : '';

  const cmpHtml = isWorn ? '' : `${reqWarning}${cmpLines(n, e)}`;

  const canEquip = reqOk(n);
  const actionBtns = isWorn ? '' : `
    ${e ? '<button class="btn sm detail-count-btn" id="bUn">Tháo</button>' : `<button class="btn sm detail-count-btn" id="bEq" ${canEquip ? '' : 'disabled'}>Trang bị</button>${!canEquip && Object.keys(reqDeficit(n)).length && reqProblems(n).length === Object.keys(reqDeficit(n)).length ? '<button class="btn sm detail-count-btn" id="bReqPts">Cộng điểm</button>' : ''}<button class="btn sm detail-count-btn item-preview-sell" id="bSell" ${n.lock ? 'disabled' : ''}>Bán (${fmt(itemValue(n))})</button>${S.inv.includes(n) ? '<button class="btn sm detail-count-btn" id="bStashIt">Gửi kho</button>' : ''}${S.inv.includes(n) && n.d === 10 ? '<button class="btn sm detail-count-btn" id="bStable">Mã Trường</button>' : ''}`}
    ${findItem(n.uid) && n.d <= 10 ? '<button class="btn sm detail-count-btn" id="bForge">Rèn đồ</button>' : ''}
    ${findItem(n.uid) ? `<button class="btn sm detail-count-btn" id="bLock">${n.lock ? '🔓 Mở khóa' : '🔒 Khóa'}</button>` : ''}
    <button type="button" class="btn sm detail-count-btn" id="bShareItem">Đăng thế giới</button>
  `;

  const bodyHtml = `
    ${segmentHtml}
    ${itemTipJX(it)}
    ${cmpHtml}
    <div class="btnrow">${actionBtns}</div>
  `;

  modal(bodyHtml, () => {
    const modalEl = document.getElementById("modal");
    modalEl && modalEl.classList.add("item-preview-modal");

    document.querySelectorAll("#mBody [data-item-view]").forEach(btn => {
      btn.onclick = () => itemModal(n, e, btn.dataset.itemView);
    });

    const a = $("#bEq"), l = $("#bSell"), o = $("#bUn"), h = $("#bForge"), m = $("#bStable");
    m && (m.onclick = () => { const u = stableIn(n); toast(u.msg), u.ok && (closeModal(), refresh()); });
    const b = $("#bStashIt");
    b && (b.onclick = () => { const u = stashDeposit(n); toast(u.msg), u.ok && (closeModal(), refresh()); });
    const d = $("#bReqPts");
    d && (d.onclick = () => { fixReqPoints(n) && (reqOk(n) ? equip(n) : itemModal(n, e, viewMode)); });
    const p = $("#bLock");
    p && (p.onclick = () => {
      n.lock = !n.lock, n.lock || delete n.lock, invDirty = !0, save(),
      toast(n.lock ? "Đã khóa: không tự bán, không hợp Huyền Tinh" : "Đã mở khóa"),
      itemModal(n, e, viewMode);
    });
    const c = $("#bShareItem");
    c && (c.onclick = () => {
      if (typeof chatShowItem === 'function') {
        chatShowItem(it);
      } else {
        toast("Chat chưa sẵn sàng");
      }
    });
    a && (a.onclick = () => equip(n));
    l && (l.onclick = () => sell(n));
    o && (o.onclick = () => unequip(e));
    h && (h.onclick = () => forgeModal(n));
  });
}

function seriesMix(n){return zoneSeries(n).map((t,s)=>t?`<span style="color:${SERIES_COL[s]}">${SERIES[s]} ${t}</span>`:"").filter(Boolean).join(" · ")}function seriesDots(n){return zoneSeries(n).map((t,s)=>('<i class="sdot" style="background:'+SERIES_COL[s]+'"></i>').repeat(t)).join("")}function renderLog(){const n=zoneOf(Math.min(S.stage,STAGES)),e=ZONES.map((s,a)=>{const l=zoneOpen(a),o=zoneIdx(Math.min(S.stage,STAGES))===a,h=ZALT[a],m=(S.zalt||{})[a]||0,b=h&&m&&h[m-1]||s,d=h&&l?`<div class="zalt">${[s].concat(h).map((p,u)=>`<button class="chip2${u===m?" on":""}" data-za="${a}:${u}">${esc(p.n)}</button>`).join("")}</div>`:"";return`<button class="zrow${o?" cur":""}${l?"":" lock"}" data-z="${a}" ${l?"":"disabled"}><b>${esc(b.n)}</b><span>${seriesDots(b)} Cấp ${s.lo}–${s.hi}${h?` · ${h.length+1} bản đồ`:""}</span></button>${d}`}).join("");$("#t-log").innerHTML=`${todoHTML()}${modeCard(n)}<div class="card"><div><small class="dim">Quái hệ: ${seriesMix(n)}${FAC[S.fac]?` · bạn hệ <span style="color:${SERIES_COL[heroSeries()]}">${SERIES[heroSeries()]}</span>: khắc <span style="color:${SERIES_COL[KHAC[heroSeries()]]}">${SERIES[KHAC[heroSeries()]]}</span> (+10%), bị <span style="color:${SERIES_COL[+Object.keys(KHAC).find(s=>KHAC[s]===heroSeries())]}">${SERIES[+Object.keys(KHAC).find(s=>KHAC[s]===heroSeries())]}</span> khắc (−10%)`:""}</small></div>
    ${buffText()?`<div class="small">${buffText()}</div>`:""}</div>
    <div class="log" id="logBox">${R.logs.map(s=>`<div>${s}</div>`).join("")}</div>
    <h3>Bản đồ luyện công <small>chạm để chọn bãi (tắt tự đổi theo cấp)</small></h3><div class="zlist">${e}</div>`,bindTodo(),bindModeCard();const t=s=>{(S.mode==="quest"||S.mode==="dg")&&(S.mode="farm",log("⚔ Chọn bãi luyện công: chuyển sang chế độ Luyện công.")),S.autoMap=!1,gotoZone(s,"Chọn bãi luyện công"),save(),refresh()};document.querySelectorAll(".zrow").forEach(s=>s.onclick=()=>t(+s.dataset.z)),document.querySelectorAll("[data-za]").forEach(s=>s.onclick=()=>{const[a,l]=s.dataset.za.split(":").map(Number);(S.zalt||(S.zalt={}))[a]=l,zoneIdx(Math.min(S.stage,STAGES))===a?(S.wave=1,R.enemies=[],R.spawnT=.3,R.zoneShown=null):t(a),save(),refresh()})}function renderLogOnly(){const n=$("#logBox");n&&(n.innerHTML=R.logs.map(e=>`<div>${e}</div>`).join(""))}const ATTR_VI={str:"Sức mạnh",dex:"Thân pháp",vit:"Sinh khí",eng:"Nội công"};function renderChar(){const n=R.P,e=FAC[S.fac],t=Object.values(S.eq).filter(d=>d&&!reqOk(d)),s=calc({}),a={life:Math.round(n.life-s.life),mana:Math.round(n.mana-s.mana)},l=SLOTS.map(([d,p])=>`<div class="slot" data-slot="${d}">${S.eq[d]?itemCell(S.eq[d]):`<span>${p}</span>`}</div>`).join(""),o=Object.keys(ATTR_VI).map(d=>`<div class="attr"><span>${ATTR_VI[d]}</span><b>${Math.round(n[d])}</b><span class="pm"><button class="plus" data-a="${d}" ${S.attrPts?"":"disabled"}>+</button><button class="minus" data-a="${d}" title="Rút lại 1 điểm" ${S.attr[d]>0?"":"disabled"}>−</button></span></div>`).join(""),h=ELEM.map(d=>`<span>Kháng ${ELEM_VI[d]}</span><span>${Math.round(n.res[d])}%</span>`).join("");$("#t-char").innerHTML=`<div class="card"><b style="color:${SERIES_COL[e.series]}">${esc(e.n)}</b> · hệ ${SERIES[e.series]} · Cấp ${S.lvl}${rebornN()?` <small class="cp">chuyển sinh ${rebornN()} · mặc đồ như cấp ${eqLevel()}</small>`:""}<br><small class="dim">Lực tay trái ${lucTay(n.basic)} · Lực tay phải ${lucTay(n.main)}</small> <button class="btn sm on" id="bRealm" style="background:linear-gradient(180deg,#795290,#4e2f63);border-color:#bb86fc;color:#fff;">⚔️ Danh Vị</button> <button class="btn sm" id="bTitle">🎖 Danh hiệu</button> <button class="btn sm${hasRealName()?"":" on"}" id="bName">${hasRealName()?"✏ Đổi Tên":"✏ Đặt tên"}</button> <button class="btn sm${S.lvl>=REBORN_LV&&RW().stat.reborn<REBORN_MAX?" on":""}" id="bReb">Chuyển sinh</button>${matHave("misc","ldp")>0?` <button class="btn sm on" id="bDoiPhai">Đổi phái (${matHave("misc","ldp")})</button>`:""}</div>
    <div class="eqgrid">${l}</div>${t.length?`<div class="reqbad"><b>⚠ ${t.length} món đang mặc chưa đủ điều kiện, không được cộng chỉ số:</b><br>${t.map(d=>`${esc(d.n)}: ${esc(reqProblems(d).join("; "))}`).join("<br>")}</div>`:""}
    <p class="dim small">Dòng ẩn (2, 4, 6) của mỗi món mở khi hệ nhân vật hoặc 2 món liên kết <b>tương sinh</b> với hệ món đó (Kim→Thủy→Mộc→Hỏa→Thổ→Kim). Đang mở: ${SLOTS.filter(([d])=>S.eq[d]&&S.eq[d].mag.length>1).map(([d,p])=>`${p} ${hiddenActive(S.eq[d])}/${Math.floor(S.eq[d].mag.length/2)}`).join(" · ")||"—"}</p>
    <h3>Tiềm năng <small>${S.attrPts} điểm</small> <button class="btn sm" id="bSugAt">Gợi ý</button> <button class="btn sm" id="bTTa">Tẩy Tủy</button></h3><div class="card">${o}</div>
    <h3>Chỉ số</h3><div class="card stats">
      <span>Sinh lực</span><span>${fmt(n.life)}${a.life?` <small class="cp">(trang bị +${fmt(a.life)})</small>`:""}</span><span>Nội lực</span><span>${fmt(n.mana)}${a.mana?` <small class="cp">(+${fmt(a.mana)})</small>`:""}</span>
      ${n.plusSkill||Object.keys(n.skAdd||{}).length?`<span>Kỹ năng từ trang bị</span><span class="cp">${n.plusSkill?`Tất cả +${n.plusSkill}`:""}${Object.entries(n.skAdd||{}).map(([d,p])=>` · ${SK[d]?esc(SK[d].n):d} +${p}`).join("")}</span>`:""}
      <span>Sát thương vũ khí</span><span>${Math.round(n.wmin)}–${Math.round(n.wmax)}</span>
      <span>Chiêu chính</span><span>${esc(n.main.n)} (${fmt(n.main.tot)})</span>
      <span>Chính xác</span><span>${Math.round(n.ar)}</span><span>Né tránh</span><span>${Math.round(n.def)}</span>
      <span>Chí mạng</span><span>${Math.round(n.main.crit)}%</span><span>Tốc độ đánh</span><span>${n.aspd.toFixed(2)}</span>${h}</div>`,$("#bTTa").onclick=tayTuyModal,document.querySelectorAll("#t-char .plus").forEach(d=>d.onclick=()=>attrAddModal(d.dataset.a)),$("#bTitle").onclick=()=>titleModal();const bRealm=$("#bRealm");bRealm&&(bRealm.onclick=()=>openRealmModal());$("#bName").onclick=()=>nameModal(),$("#bReb").onclick=rebornModal;const m=$("#bDoiPhai");m&&(m.onclick=doiPhaiModal),$("#bSugAt").onclick=suggestModal,document.querySelectorAll("#t-char .minus").forEach(d=>d.onclick=()=>unspendAttr(d.dataset.a)),document.querySelectorAll("#t-char .slot .it").forEach(d=>d.onclick=()=>d.parentNode.dataset.slot==="horse"?horsePickModal():itemModal(findItem(d.dataset.uid),d.parentNode.dataset.slot));const b=document.querySelector('#t-char .slot[data-slot="horse"]');b&&!S.eq.horse&&(b.onclick=()=>horsePickModal())}function unlearnSkill(n){const e=S.sk[n]||0;if(!e)return!1;const t=SK[n].tier===90&&!isBr90(n);return e<=1||t?delete S.sk[n]:S.sk[n]=e-1,t||S.skPts++,!S.sk[n]&&S.main===n&&(S.mainLock=!1),R.dirty=!0,recalc(),fillSlots(),renderSkill(),renderPad(),updateDots(),save(),toast(`Rút 1 điểm: ${SK[n].n} ${S.sk[n]||0}/${SK[n].max}`),!0}function attrAddModal(n){if(!S.attrPts)return;const e=S.attrPts;modal(`<h3>Cộng tiềm năng: ${esc(ATTR_VI[n])}</h3><div class="small">Còn <span style="color:#ffd24a;font-weight:bold">${e}</span> điểm · hiện ${Math.round(R.P[n])}</div>
    <div class="btnrow"><input type="number" id="apN" min="1" max="${e}" value="${e}" style="width:110px;font-size:16px;padding:4px 6px"></div>
    <div class="btnrow">${[1,10,50,100].filter(t=>t<e).map(t=>`<button class="btn sm" data-apq="${t}">${t}</button>`).join("")}<button class="btn sm" data-apq="${e}">Tất cả (${e})</button></div>
    <div class="btnrow"><button class="btn on" id="apOk">Cộng</button><button class="btn" id="apNo">Hủy</button></div>`,()=>{const t=$("#apN"),s=()=>{const a=clamp(Math.floor(+t.value||0),0,S.attrPts);a>0&&(S.attrPts-=a,S.attr[n]+=a,R.dirty=!0,recalc(),updateDots(),save(),toast(`+${a} ${ATTR_VI[n]}`)),closeModal(!0),renderChar()};t.focus(),t.select(),t.onkeydown=a=>{a.key==="Enter"&&s()},document.querySelectorAll("#mBody [data-apq]").forEach(a=>a.onclick=()=>{t.value=a.dataset.apq,t.focus()}),$("#apOk").onclick=s,$("#apNo").onclick=()=>closeModal(!0)})}function unspendAttr(n){return S.attr[n]>0?(S.attr[n]--,S.attrPts++,R.dirty=!0,recalc(),renderChar(),updateDots(),save(),!0):!1}const SK_HIDE=/^(skill_attackradius|missle_|skill_cost_v|skill_eventskilllevel|addskilldamage|skill_)/;
const SK180_SUB={
  1230:(l)=>`Phản đòn cận chiến & tầm xa +${10+Math.round((l-1)*40/19)}% (Duy trì ${(10+(l-1)*5/19).toFixed(1)}s)`,
  1231:(l)=>`Miễn dịch hoàn toàn hiệu ứng tiêu cực (Duy trì ${(1+(l-1)*2/19).toFixed(1)}s)`,
  1232:(l)=>`Gây độc sát nội công ${1+Math.round((l-1)*11/19)} điểm/lần (Duy trì 3.3s)`,
  1233:(l)=>`Hóa giải 100% sát thương phải chịu (Duy trì ${(1+(l-1)*1/19).toFixed(1)}s)`,
  1234:(l)=>`Hồi phục ${275+Math.round((l-1)*475/19)} sinh lực/nửa giây (Duy trì 2s)`,
  1235:(l)=>`Ẩn thân hoàn toàn (Duy trì ${(2+(l-1)*3/19).toFixed(1)}s)`,
  1236:(l)=>`Khiến kẻ địch hoảng loạn mất kiểm soát di chuyển (Duy trì 4s)`,
  1237:(l)=>`Cường hóa Hỗn Thiên Khí Công +${2+Math.round((l-1)*18/19)}%, bỏ qua hỏa phòng +${6+Math.round((l-1)*14/19)}% (Duy trì ${(5+(l-1)*10/19).toFixed(1)}s)`,
  1238:(l)=>`Chuyển hóa ${50+Math.round((l-1)*150/19)}% sát thương thành nội lực (Duy trì ${(5+(l-1)*10/19).toFixed(1)}s)`,
  1239:(l)=>`Cường hóa Lưỡng Nghi Chân Khí +${3+Math.round((l-1)*12/19)}%, bỏ qua lôi phòng +${5+Math.round((l-1)*10/19)}% (Duy trì ${(5+(l-1)*10/19).toFixed(1)}s)`
};
function skill180Lines(n,e){
  if(n.req!==180&&n.tier!==180&&n.learn!=="180")return null;
  const k=["autorescueskill","autoreplyskill","autoattackskill","autodeathskill"].find(a=>n.attr&&n.attr[a]);
  if(!k)return null;
  const v=skVal(n,k,e);
  if(!v||!v[0])return null;
  const sid=v[0]>>8,slv=v[0]&255,rate=v[2]&255,cd=+((v[2]>>8)/18).toFixed(1);
  const sub=SK[sid],sname=sub?sub.n:`Kỹ năng #${sid}`;
  const trg=k==="autorescueskill"?"Khi sinh lực nguy hiểm (<25%)":k==="autoattackskill"?"Khi đánh trúng":k==="autodeathskill"?"Khi bị trọng thương":"Khi bị tấn công";
  const r=[`${trg}: Có ${rate}% xác suất kích hoạt ${sname} cấp ${slv} (Giãn cách: ${cd}s)`];
  SK180_SUB[sid]&&r.push(SK180_SUB[sid](slv));
  return r;
}
function skillEffectLines(n,e){const s180=skill180Lines(n,e);if(s180)return s180;const t=[];for(const a in n.attr){if(SK_HIDE.test(a)||!J.attrDesc[a])continue;const l=skVal(n,a,e);if(!l)continue;const o=attrText(a,l)+(a==="dynamicmagicshield_v"?` (tối đa ${Math.round(DMG_SHIELD_MAX*100)}% mỗi đòn)`:"");o&&!/^\s*$/.test(o)&&t.push(o)}const s=new Set;for(const a in n.attr)if(a.startsWith("addskilldamage")){const l=skVal(n,a,e);if(!l||!l[2])continue;const o=supTargetName(+l[0],n);if(!o||s.has(o))continue;s.add(o),t.push(`Tăng sát thương ${o}: +${l[2]}%`)}return t}const SK15_N={1055:"Kim Cang Chưởng",1056:"Vi Đà Hiến Chử",1057:"Tam Giới Quy Thiền",1058:"Hào Hùng Trảm",1059:"Tung Hoành Bát Hoang",1060:"Bá Vương Tạm Kim",1061:"Kiếm Hoa Vãn Tinh",1062:"Băng Vũ Lạc Tinh",1063:"Băng Tước Việt Chi",1065:"Thủy Ánh Mạn Tú",1066:"Hình Tiêu Cốt Lập",1067:"U Hồn Phệ Ảnh",1069:"Vô Ảnh Xuyên",1070:"Thiết Liên Tứ Sát",1071:"Càn Khôn Nhất Trịch",1073:"Thời Thừa Lục Long",1074:"Bổng Huýnh Lược Địa",1075:"Giang Hải Nộ Lan",1076:"Tật Hỏa Liêu Nguyên",1078:"Tạo Hóa Thái Thanh",1079:"Kiếm Thùy Tinh Hà",1080:"Cửu Thiên Cương Phong",1083:"Long Thừa Bát Nhã Thủ",1091:"Lưu Phong Hồi Tuyết Băng Trụ",1108:"Phong Minh Ngọc Toái",1109:"Lôi Động Càn Khôn"},SK15_PART={1084:1058,1086:1058,1087:1059,1088:1060,1094:1066,1096:1066,1099:1071,1100:1071,1101:1073},SK15_EV={1064:["Băng Ngưng Hàn Yên",1063],1085:["Vạn Vật Đế Quy Nhất",1057],1093:["Khinh Sa Phù Thủy",1065],1095:["Hồn Ảnh Tùng Sinh",1067],1097:["Truy Tâm Tỏa Mệnh",1069],1107:["Kiếm Minh Thương Khung",1079]},SUB_OF=(()=>{const n={};for(const e in EV2){const t=EV2[e];t.sid&&(n[t.sid]=[t.n,+e,2]),t.at16&&t.at16.sid&&(n[t.at16.sid]=[t.at16.n,+e,3])}return n})();function supTargetName(n,e){const t=SUB_OF[n];if(t&&SK[t[1]])return`${t[0]} (tầng ${t[2]} ${SK[t[1]].n})`;if(n>=1e3)return null;const s=SK[n];if(!s||/\(##\)/.test(s.n)||e.f&&s.f&&s.f!==e.f)return null;const a=Object.values(SK).find(l=>l.child===n&&l.f===e.f&&l.id!==n);return a?a.n:s.req>0||s.f?s.n:null}function skillSupport(n){const e=[];for(const t in SK){const s=SK[t];if(!(!s.attr||s.f&&s.f!==SK[n].f)){for(const a in s.attr)if(a.startsWith("addskilldamage")){const l=S.sk[t]?S.sk[t]+skillBonusLv(+t):0,o=skVal(s,a,Math.max(1,l));if(!o||!o[2]||/\(##\)/.test(s.n)||s.req<=0)continue;const h=SUB_OF[+o[0]];+o[0]==+n?e.push([s.n,l,l?o[2]:0,o[2]]):h&&h[1]===+n&&e.push([s.n+` → ${h[0]} (tầng ${h[2]})`,l,l?o[2]:0,o[2],!0])}}}return e}function skillTipJX(n,e,t,s,a,l){const o=SK[n],h=isAttack(o),m=FAC[o.f],b=h?"Tấn công":SK_KIND_VI[skKind(o)]||"—",d=r=>{const f=skillEffectLines(o,r).filter(y=>!/^Tăng sát thương /.test(y)),g=skVal(o,"skill_cost_v",r),v=skVal(o,"skill_attackradius",r);return g&&g[0]&&f.push(`Tiêu hao ${skCostLife(o)?"sinh lực":"nội lực"}: ${g[0]}`),h&&f.push(`Phạm vi tấn công: ${v?v[0]:o.radius||60}`),f},p=[["b",`Môn phái: ${m?m.n:"—"}${o.series>=0?` · Ngũ hành: ${SERIES[o.series]}`:""}`]];o.d&&p.push(["b in",o.d]),p.push([skEqt(o)!==null&&!skWOk(o)?"rq":"b",`Loại: ${b}${skEqt(o)!==null?` · Vũ khí: ${EQT_VI[skEqt(o)]}`:""}`]),p.push([S.lvl>=o.req||o.tier===90&&rebornN()>0?"b":"rq",`Cấp yêu cầu: ${o.req}${o.tier===90&&rebornN()>0?" (đã chuyển sinh: không cần)":""}`]),p.push(["b",`Cấp kỹ năng: ${e}/${o.max}${t?` (+${t} từ trang bị → ${s})`:""}`]),o.tier===90&&p.push(["g",sk9Text(n)]),p.push(["sep"]),p.push(["tt",s?`Cấp hiện tại: ${s}`:"Cấp 1 (chưa học)"]);for(const r of d(a))p.push(["m",r]);const u=typeof EV2<"u"&&EV2[n],k=typeof skEventLv=="function"?skEventLv(o):0;if(u&&k&&p.push([s>=k?"m":"h",`Tầng 2 (từ cấp ${k}): ${u.n}`]),u&&u.at16&&p.push([s>=16?"m":"h",`Tầng 3 (từ cấp 16): ${u.at16.n}`]),l&&s){p.push(["tt",`Cấp kế tiếp: ${l}`]);for(const r of d(l))p.push(["h",r])}const c=[],i=new Set;for(const r in o.attr)if(r.startsWith("addskilldamage")){const f=skVal(o,r,a);if(!f||!f[2])continue;const g=supTargetName(+f[0],o);g&&!i.has(g)&&(i.add(g),c.push(`${g}: +${f[2]}%`))}if(c.length){p.push(["tt","Hỗ trợ sát thương cho:"]);for(const r of c)p.push(["g",r])}if(h){const r=skillSupport(n);if(r.length){p.push(["tt",`Được hỗ trợ (+${r.filter(f=>!f[4]).reduce((f,g)=>f+g[2],0)}%):`]);for(const f of r)p.push([f[1]?"g":"h",f[1]?`${f[0]} cấp ${f[1]}: +${f[2]}%`:`${f[0]} (chưa học, cấp 1: +${f[3]}%)`])}}return`<div class="idet"><div class="pic"><img src="${esc(o.ic||"")}" alt="" style="image-rendering:pixelated"></div><div><h4 style="color:#ffd76a">${esc(o.n)}</h4>${h?"":skStateTag(o)}</div></div>
    <div class="sl jxsk">${p.map(([r,f])=>r==="sep"?'<div class="sep"></div>':`<div class="${r}">${esc(f)}</div>`).join("")}</div>`}function skillModal(n){const e=SK[n];if(!e)return;const t=S.sk[n]||0,s=t?skillBonusLv(n):0,a=t+s,l=isAttack(e),o=Math.max(1,a),h=t<e.max?a+1:0;modal(skillTipJX(n,t,s,a,o,h)+`
    <div class="btnrow">${l&&a?'<button class="btn" id="skMain">Chọn làm chiêu chính</button>':""}<button class="btn" id="skPlus" ${canLearn(e)?"":"disabled"}>+ Cộng điểm</button><button class="btn red" id="skMinus" ${a?"":"disabled"}>− Rút điểm</button></div>`,()=>{bindSkState($("#mBody"));const m=$("#skMain");m&&(m.onclick=()=>{S.main=e.id,S.mainLock=!0,R.dirty=!0,recalc(),renderSkill(),toast("Chiêu chính: "+e.n),skillModal(n)}),$("#skPlus").onclick=()=>{canLearn(e)&&(skLearn(n),uiSfx("learn"),R.dirty=!0,recalc(),renderSkill(),save(),skillModal(n))},$("#skMinus").onclick=()=>{unlearnSkill(n)&&skillModal(n)}})}function basicCard(){const n=R.P&&R.P.basic;if(!n)return"";const e=S.eq.weapon,t=S.mainLock&&S.main==="basic",s=R.P.main===n,a=e?R.P.ranged?"Ám khí / tầm xa":"Binh khí cận chiến":"Quyền cước (tay không)";return`<div class="skl${s?" main":""}" id="basicSk"><img class="sic" src="img/s/8.png" alt=""><div class="info"><b>Đánh thường</b> <span class="tag attack">Tấn công</span>
    <small>${a} · ~${fmt(Math.round(n.tot))} sát thương / đòn · ${n.rate.toFixed(2)} đòn/giây · tầm ${n.rad} · 0 nội lực</small></div>
    <span class="pm"><button class="btn sm${t?" on":""}" id="bBasic">${t?"Đang khóa":"Dùng làm chiêu chính"}</button></span></div>`}function renderSkill(){const n=FAC[S.fac];if(n.novice){const a=FACTIONS.filter(l=>l.series===n.series);$("#t-skill").innerHTML=`<h3>Vô Môn Phái <small>${S.skPts} điểm kỹ năng</small></h3><div class="card"><p class="desc">Chưa có võ công. Đạt <b>cấp ${NOVICE_LV}</b> để gia nhập môn phái hệ <b style="color:${SERIES_COL[n.series]}">${SERIES[n.series]}</b>: ${a.map(l=>facAllowed(l,S.sex)?esc(l.n):`<s>${esc(l.n)}</s>`).join(", ")}. Điểm kỹ năng nhận được trước đó được giữ lại.</p><div class="btnrow"><button class="btn" id="bJoin" ${S.lvl>=NOVICE_LV?"":"disabled"}>Gia nhập môn phái${S.lvl>=NOVICE_LV?"":` (cấp ${S.lvl}/${NOVICE_LV})`}</button></div></div>`,$("#bJoin").onclick=joinModal;return}const e=n.skills.map(a=>{const l=SK[a],o=S.sk[a]||0,h=isAttack(l),m=o?skillBonusLv(a):0,b=h&&o?activeInfo(R.P,l,o+m):null;return`<div class="skl${skReqOk(l)?"":" lock"}${R.P.main.id===+a?" main":""}" data-id="${a}">
      <img class="sic" src="${esc(l.ic||"")}" alt=""><div class="info"><b>${esc(l.n)}</b>${l.book&&!bookOk(l)?' <small class="reqbad">cần Bí Kíp 90</small>':""}${l.tier===90&&o&&o<l.max&&matHave("misc","dtbk")>0&&dtOk(a)?` <button class="btn sm" data-dt="${a}">📕</button>`:""}</div>
      <span class="lvl">${m?`<b class="skb" title="Cấp hiệu lực = ${o} + ${m} từ trang bị">${o+m}</b><small>/${l.max} (${o}+${m})</small>`:`${o}/${l.max}`}</span><span class="pm"><button class="plus" data-id="${a}" title="Cộng 1 điểm" ${canLearn(l)?"":"disabled"}>+</button><button class="minus" data-id="${a}" title="Rút lại 1 điểm" ${o>0?"":"disabled"}>−</button><button class="skinfo" data-id="${a}" title="Thông tin kỹ năng">i</button></span>
      </div>`}).join("");$("#t-skill").innerHTML=`<h3>${esc(n.n)} <small>${S.skPts} điểm kỹ năng</small> <button class="btn sm" id="bSugSk">Gợi ý</button> <button class="btn sm" id="bTT">Tẩy Tủy</button></h3><div class="dim small">Bí Kíp: ${Object.keys(BOOK_N).map(a=>`${BOOK_N[a].replace("Bí Kíp ","")} ×${matHave("misc",a)}`).join(" · ")} <span class="dim">(hạ trùm cấp cao, Dã Tẩu, Sát Thủ, Kỳ Trân Các)</span> · Đại Thành Bí Kíp ×${matHave("misc","dtbk")} · Kim Nguyên Bảo ${S.knb||0}</div><div class="card"><label><input type="checkbox" id="cRot" ${S.rot===!1?"":"checked"}> Xoay chiêu tự động khi farm: luân phiên các chiêu gán ở ô 1 đến 4 (phím R), luôn có 2 chiêu mạnh nhất, bỏ chiêu hết nội lực</label>${skOptsHTML()}</div><p class="dim small">Chạm vào chiêu tấn công đã học để khóa làm chiêu chính${S.mainLock?' (<a id="bAutoMain">bỏ khóa</a>)':" (đang tự chọn chiêu mạnh nhất)"}.</p>${e}`,document.querySelectorAll("#t-skill .plus").forEach(a=>a.onclick=l=>{l.stopPropagation();const o=SK[a.dataset.id];canLearn(o)&&(skLearn(o.id),uiSfx("learn"),R.dirty=!0,recalc(),renderSkill(),save())}),document.querySelectorAll("#t-skill .minus").forEach(a=>a.onclick=l=>{l.stopPropagation(),unlearnSkill(+a.dataset.id)}),document.querySelectorAll("#t-skill .skinfo").forEach(a=>a.onclick=l=>{l.stopPropagation(),skillModal(+a.dataset.id)}),document.querySelectorAll("#t-skill .slots button").forEach(a=>a.onclick=l=>{l.stopPropagation(),assignSlot(+a.dataset.slot,+a.dataset.sid),renderSkill()}),$("#bSugSk").onclick=suggestModal,$("#bTT").onclick=tayTuyModal,$("#cRot").onchange=()=>toggleRot(),document.querySelectorAll("#t-skill [data-dt]").forEach(a=>a.onclick=l=>{l.stopPropagation(),useDaiThanh(+a.dataset.dt)}),bindSkOpts(),bindSkState($("#t-skill"));const t=$("#bAutoMain");t&&(t.onclick=()=>{S.mainLock=!1,R.dirty=!0,recalc(),renderSkill()});const s=$("#bBasic");s&&(s.onclick=a=>{a.stopPropagation(),S.mainLock&&S.main==="basic"?S.mainLock=!1:(S.main="basic",S.mainLock=!0),R.dirty=!0,recalc(),renderSkill(),renderPad(),save(),toast(S.mainLock&&S.main==="basic"?"Chiêu chính: Đánh thường":"Bỏ khóa đánh thường")}),document.querySelectorAll("#t-skill .skl[data-id]").forEach(a=>a.onclick=()=>{const l=SK[a.dataset.id];isAttack(l)&&S.sk[l.id]?(S.main=l.id,S.mainLock=!0,R.dirty=!0,recalc(),renderSkill(),toast("Chiêu chính: "+l.n)):skillModal(l.id)})}const INV_SORTS=[["new","Mới nhặt"],["rar","Độ hiếm"],["lvl","Cấp đồ"],["slot","Loại"],["pow","Sức mạnh"]],SLOT_ORDER=Object.fromEntries(SLOTS.map(([n],e)=>[n,e]).concat([["ring",7]]));function invSorted(){const n=S.invSort||"new",e=S.inv.slice();return n==="rar"?e.sort((t,s)=>s.r-t.r||s.lvl-t.lvl):n==="lvl"?e.sort((t,s)=>s.lvl-t.lvl||s.r-t.r):n==="slot"?e.sort((t,s)=>(SLOT_ORDER[DETAIL_SLOT[t.d]]??99)-(SLOT_ORDER[DETAIL_SLOT[s.d]]??99)||s.lvl-t.lvl):n==="pow"&&e.sort((t,s)=>itemPower(s)-itemPower(t)),e}function renderInv(){invDirty=!1;const n=lootFilter(),e=RAR_VI.map((c,i)=>`<option value="${i}" ${n.minRar===i?"selected":""}>${c}</option>`).join(""),t=Array.from({length:10},(c,i)=>`<option value="${i+1}" ${n.minLvl===i+1?"selected":""}>${i+1}</option>`).join(""),s=Array.from({length:7},(c,i)=>`<option value="${i}" ${(n.minMag||0)===i?"selected":""}>${i}</option>`).join(""),a=LOOT_ATTR_GROUPS.map(([c],i)=>`<label class="chip2"><input type="checkbox" data-g="${i}" ${n.groups.includes(i)?"checked":""}>${c}</label>`).join(""),l=SERIES.map((c,i)=>`<label class="chip2" style="color:${SERIES_COL[i]}"><input type="checkbox" data-s="${i}" ${n.series.includes(i)?"checked":""}>${c}</label>`).join(""),o=LOOT_SLOT_GROUPS.map(([c,i])=>`<label class="chip2"><input type="checkbox" data-sl="${c}" ${n.slots.includes(c)?"checked":""}>${i}</label>`).join(""),h=R.ground.length,m=R.ground.filter(c=>lootMatch(c.it)).length,b=S.inv.filter(c=>!lootMatch(c)&&!sellProtected(c)),d=S.inv.filter(c=>c.lock).length,p=lootPresets();$("#t-inv").innerHTML=`<div class="invbar"><span>${S.inv.length}/${INV_MAX} · Túi chung (4)</span><select id="iSort" title="Sắp xếp hiển thị">${INV_SORTS.map(([c,i])=>`<option value="${c}" ${(S.invSort||"new")===c?"selected":""}>${i}</option>`).join("")}</select><span class="sp"></span>
    <button class="btn sm" id="bStash">Kho chung</button><button class="btn sm" id="bDonKho">🧹 Dọn kho</button><button class="btn sm" id="bBest">Mặc đồ tốt</button><button class="btn sm red" id="bSellAll" ${b.length?"":"disabled"}>${b.length?`Bán ${b.length} món không khớp lọc`:"Không có đồ để bán"}</button></div>
    <div class="invgrid">${invSorted().map(itemCell).join("")}</div>
    <p class="dim small">${d?`${d} món đã khóa 🔒 (không tự bán, không bán hàng loạt, không hợp Huyền Tinh). `:""}Mở chi tiết món đồ để khóa / mở khóa.</p>
    <div class="btnrow"><button class="btn sm" id="bKtcI">🏮 Kỳ Trân Các</button></div>
    ${verVio()?(()=>{const c=n.ep;return`<div class="card lootf" id="epLoot"><b>💎 Đồ để ép Tím</b> <small class="dim">nhặt riêng cả khi không khớp bộ lọc bên dưới, không chiếm hành trang</small>
      <label><input type="checkbox" id="eWhite" ${c.white?"checked":""}> Đồ trắng (phôi để chế tạo đồ Tím)</label>
      <label><input type="checkbox" id="eJew" ${c.jew?"checked":""}> Nhẫn / dây chuyền / ngọc bội không tốt hơn đồ đang mặc (luyện Huyền Tinh)</label>
      <label><input type="checkbox" id="eBlue" ${c.blue?"checked":""}> Đồ xanh có dòng cấp ≥ <select id="eBlueLv">${Array.from({length:10},(i,r)=>`<option value="${r+1}" ${c.blueLv===r+1?"selected":""}>${r+1}</option>`).join("")}</select> (lấy thuộc tính ra đá)</label>
      <div class="row">Cất vào <select id="eDest">${[["box","Kho Rèn"],["stash","Kho chung"],["inv","Hành trang"]].map(([i,r])=>`<option value="${i}" ${c.dest===i?"selected":""}>${r}</option>`).join("")}</select> <small class="dim">Kho Rèn ${epBox().length}/${EP_BOX_MAX}</small></div></div>`})():""}
    <h3>Bộ lọc đồ <small>${h} món trên đất · ${m} khớp</small></h3>
    <div class="card lootf${n.custom?"":" smart"}">
      <div class="lmodes">${LOOT_MODES.map(([c,i,r])=>`<button class="btn lmode${lootModeOf(n)===c?" on":""}" data-lm="${c}"><b>${i}</b><small>${r}</small></button>`).join("")}</div>
      <details class="lootadv"${S.lootAdv?" open":""}><summary>Nâng cao (bộ lọc chi tiết, Hoàng Kim, bộ lọc lưu sẵn)</summary>
      <div class="desc small">Giữ đồ quý, đồ nộp Dã Tẩu và các mục được tick dưới đây; còn lại tự bán. Đồ để ép Tím nhặt riêng theo mục 💎 ở trên.</div>
      <div class="btnrow presets">${LOOT_QUICK.map(([c],i)=>`<button class="btn sm" data-q="${i}">${c}</button>`).join("")}</div>
      <div class="btnrow presets">${p.map((c,i)=>`<span class="pslot"><button class="btn sm" data-pl="${i}" ${c?"":"disabled"}>Bộ ${i+1}${c?"":" (trống)"}</button><button class="btn sm" data-ps="${i}" title="Lưu bộ lọc hiện tại vào bộ ${i+1}">💾</button></span>`).join("")}</div>
      <label><input type="checkbox" id="fAuto" ${n.auto?"checked":""}> Tự đi nhặt đồ khi hết quái</label>
      <label><input type="checkbox" id="fAll" ${n.pickAll?"checked":""}> <b>Nhặt toàn bộ</b>, bán theo bộ lọc: nhặt mọi món rơi ra; khi hành trang đầy hoặc bấm Bán thì chỉ bán món không khớp bộ lọc (bỏ chọn: chỉ nhặt món khớp bộ lọc)</label>
      <label><input type="checkbox" id="fRare" ${n.keepRare?"checked":""}> Luôn nhặt đồ quý (Hoàng Kim, Tím, ngựa hiếm)</label>
      <div class="small"><b>Hoàng Kim giữ lại</b> <small class="dim">(bỏ chọn: tự bán khi đầy / bấm Bán · món đã khóa 🔒 luôn giữ)</small></div>
      <div class="chips"><label class="chip2"><input type="checkbox" id="fHkBc" ${n.hkBc!==!1?"checked":""}> Hoàng Kim thường (Bộ chung)</label></div>
      <div class="small dim">HKMP của phái: <button class="btn sm" id="fHkAll">Tất cả</button><button class="btn sm" id="fHkMine">Phái mình</button><button class="btn sm" id="fHkNone">Không phái nào</button></div>
      <div class="chips">${FACTIONS.map(c=>`<label class="chip2"><input type="checkbox" data-hkf="${c.id}" ${!Array.isArray(n.hkMp)||n.hkMp.includes(c.id)?"checked":""}> ${esc(c.n.replace(/ phái$/i,""))}${S.fac===c.key?" ★":""}</label>`).join("")}</div>
      <label><input type="checkbox" id="fSmart" ${n.smartUp?"checked":""}> ⭐ <b>Giữ đồ nâng cấp</b> (lọc thông minh): món làm nhân vật mạnh hơn đồ đang mặc (▲), kể cả món sắp mặc được (cấp yêu cầu ≤ cấp + 10, đúng giới tính / phái / loại vũ khí) và món cường hóa lên sẽ mạnh hơn (△) <small class="dim">· hành trang có ${S.inv.filter(isUpgrade).length} món</small></label>
      <label><input type="checkbox" id="fCustom" ${n.custom?"checked":""}> ⚙ <b>Giữ thêm đồ khớp điều kiện tùy chỉnh</b> bên dưới</label>
      <div class="lc row">Độ hiếm từ <select id="fRar">${e}</select> · cấp đồ từ <select id="fLvl">${t}</select> · ít nhất <select id="fMag">${s}</select> dòng</div>
      <label class="lc"><input type="checkbox" id="fWear" ${n.wear?"checked":""}> Chỉ đồ nhân vật mặc được (giới tính, hệ, môn phái; cấp yêu cầu ≤ cấp hiện tại + 5)</label>
      <label class="lc"><input type="checkbox" id="fFacW" ${n.facW?"checked":""}> Vũ khí: chỉ đúng loại của môn phái</label>
      <label class="lc"><input type="checkbox" id="fAcc" ${n.accrue?"checked":""}> Chỉ hệ được nhân vật tương sinh (${FAC[S.fac]?SERIES[heroSeries()]+" → "+SERIES[ACCRUE[heroSeries()]]:""}: tự mở 1 dòng ẩn)</label>
      <div class="lc dim small">Loại trang bị (bỏ trống = mọi loại):</div><div class="lc chips">${o}</div>
      <div class="lc dim small">Có ít nhất một thuộc tính (bỏ trống = mọi thuộc tính):</div><div class="lc chips">${a}</div>
      <div class="lc dim small">Hệ của món đồ (bỏ trống = mọi hệ):</div><div class="lc chips">${l}</div>
      </details>
      <div class="dim small">Hành trang: ${S.inv.length-b.length}/${S.inv.length} món khớp hoặc được bảo vệ. Chạm vào món đồ trên sân để đi nhặt tay. Trên 40 món thì món cũ nhất tự bán. Khi vắng mặt, đồ không khớp tự bán.</div>
    </div>`;const u=()=>{LF_KEY=null,save(),renderInv()};$("#fSmart").onchange=c=>{n.smartUp=c.target.checked,u()},$("#fCustom").onchange=c=>{n.custom=c.target.checked,u()},$("#iSort").onchange=c=>{S.invSort=c.target.value,renderInv(),save()},$("#fAuto").onchange=c=>{n.auto=c.target.checked,u()},$("#fAll").onchange=c=>{n.pickAll=c.target.checked,u()},$("#fRare").onchange=c=>{n.keepRare=c.target.checked,u()};{const c=$("#fHkBc");c&&(c.onchange=i=>{n.hkBc=i.target.checked,u()})}const k=c=>{n.hkMp=c.length>=FACTIONS.length?null:c,u()};document.querySelectorAll("[data-hkf]").forEach(c=>c.onchange=()=>{const i=+c.dataset.hkf,r=Array.isArray(n.hkMp)?n.hkMp:FACTIONS.map(f=>f.id);k(c.checked?[...new Set(r.concat(i))]:r.filter(f=>f!==i))}),$("#fHkAll")&&($("#fHkAll").onclick=()=>k(FACTIONS.map(c=>c.id))),$("#fHkMine")&&($("#fHkMine").onclick=()=>k(FAC[S.fac]?[FAC[S.fac].id]:[])),$("#fHkNone")&&($("#fHkNone").onclick=()=>k([])),$("#fWear").onchange=c=>{n.wear=c.target.checked,u()},$("#fFacW").onchange=c=>{n.facW=c.target.checked,u()},$("#fAcc").onchange=c=>{n.accrue=c.target.checked,u()},$("#fRar").onchange=c=>{n.minRar=+c.target.value,u()},$("#fLvl").onchange=c=>{n.minLvl=+c.target.value,u()},$("#fMag").onchange=c=>{n.minMag=+c.target.value,u()},document.querySelectorAll("#t-inv [data-lm]").forEach(c=>c.onclick=()=>{lootSetMode(n,c.dataset.lm),toast("Chế độ lọc: "+c.querySelector("b").textContent),u()});{const c=$("#fThrN");c&&(c.onchange=i=>{n.thrN=+i.target.value,u()})}{const c=$("#fSpec");c&&(c.onchange=i=>{n.keepSpecial=i.target.checked,u()})}{const c=$("#fVal");c&&(c.onchange=i=>{n.keepVal=+i.target.value,u()})}{const c=document.querySelector("#t-inv .lootadv");c&&(c.ontoggle=()=>{S.lootAdv=c.open})}if(document.querySelectorAll("#t-inv [data-g]").forEach(c=>c.onchange=()=>{const i=+c.dataset.g;n.groups=c.checked?[...new Set(n.groups.concat(i))]:n.groups.filter(r=>r!==i),u()}),document.querySelectorAll("#t-inv [data-s]").forEach(c=>c.onchange=()=>{const i=+c.dataset.s;n.series=c.checked?[...new Set(n.series.concat(i))]:n.series.filter(r=>r!==i),u()}),document.querySelectorAll("#t-inv [data-sl]").forEach(c=>c.onchange=()=>{const i=c.dataset.sl;n.slots=c.checked?[...new Set(n.slots.concat(i))]:n.slots.filter(r=>r!==i),u()}),document.querySelectorAll("#t-inv [data-q]").forEach(c=>c.onclick=()=>{const i=LOOT_QUICK[+c.dataset.q];lootLoadPreset(Object.assign(LOOT_DEF(),i[1])),toast("Bộ lọc: "+i[0]),u()}),document.querySelectorAll("#t-inv [data-pl]").forEach(c=>c.onclick=()=>{const i=lootPresets()[+c.dataset.pl];i&&(lootLoadPreset(i),toast(`Dùng bộ lọc ${+c.dataset.pl+1}`),u())}),document.querySelectorAll("#t-inv [data-ps]").forEach(c=>c.onclick=()=>{lootSavePreset(+c.dataset.ps),toast(`Đã lưu bộ lọc ${+c.dataset.ps+1}`),u()}),$("#bStash").onclick=()=>stashModal(),$("#bKtcI").onclick=()=>ktcModal(),$("#epLoot")){const c=lootFilter().ep,i=()=>{save(),invDirty=!0};$("#eWhite").onchange=r=>{c.white=r.target.checked,i()},$("#eJew").onchange=r=>{c.jew=r.target.checked,i()},$("#eBlue").onchange=r=>{c.blue=r.target.checked,i()},$("#eBlueLv").onchange=r=>{c.blueLv=+r.target.value,i()},$("#eDest").onchange=r=>{c.dest=r.target.value,i()}}$("#bBest").onclick=()=>{let c=0;for(let r=0;r<14;r++){let f=null,g=.01;for(const v of S.inv){if(!betterThanEquipped(v))continue;const y=equipGain(v);y>g&&(g=y,f=v)}if(!f)break;equip(f,!0),c++}const i=S.inv.filter(r=>!r.pack&&!r.ktc&&!betterThanEquipped(r)&&typeof isUpgrade=="function"&&isUpgrade(r)&&!reqOk(r)).length;toast(c?`Đã mặc ${c} món tốt hơn`:i?`Không có món mặc được ngay · ${i} món mạnh hơn nhưng chưa đủ điều kiện (▲ xám)`:"Đồ đang mặc đã tốt nhất"),refresh()},$("#bDonKho").onclick=()=>donKhoModal(),$("#bSellAll").onclick=()=>{const c=sellUnmatched();toast(`Bán ${c.n} món (+${fmtL(c.gold)} lượng)${c.kept?`, giữ ${c.kept} món được bảo vệ`:""}`),refresh()},document.querySelectorAll("#t-inv .invgrid .it").forEach(c=>c.onclick=()=>itemModal(findItem(c.dataset.uid)))}function renderMore(){const n=typeof netOn=="function"&&netOn()&&!NET.offline;$("#t-more").innerHTML=`${n?`<h3>Lưu game</h3><div class="card"><p class="dim small">Nhân vật tự lưu lên máy chủ khi đã đăng nhập (mỗi 2 phút và khi thoát game). Đăng nhập cùng tài khoản ở máy / điện thoại khác là chơi tiếp.</p><div class="btnrow"><button class="btn" id="bCloud">🌐 Tài khoản · Lưu đám mây</button></div></div>
    `:`<h3>Lưu game</h3><div class="card"><p class="dim small">Nhân vật lưu trong trình duyệt của từng thiết bị (3 slot). Để chơi trên thiết bị khác: bấm <b>Tải file lưu</b>, chuyển file <code>.jxsave</code> sang thiết bị kia (Zalo, Drive, cáp…), rồi mở game ở đó và bấm <b>Nạp từ file</b>. File có chữ ký, sửa tay sẽ bị từ chối. Nên tải file định kỳ để sao lưu.</p>
    <div class="btnrow"><button class="btn" id="bDl">Tải file lưu (.jxsave)</button><button class="btn" id="bFile">Nạp từ file</button></div>
    <p class="dim small">Hoặc dùng mã văn bản:</p><div class="btnrow"><button class="btn" id="bExp">Xuất mã</button><button class="btn" id="bImp">Nhập mã</button></div><textarea id="saveTxt" rows="4" placeholder="Mã lưu game"></textarea></div>`}
    <h3>Âm thanh</h3><div class="card lootf">
      <label><input type="checkbox" id="sOn" ${sndCfg().on?"checked":""}> Tiếng động (đòn đánh, chiêu, quái, rơi đồ)</label>
      <div class="row">Âm lượng <input type="range" id="sVol" min="0" max="1" step="0.05" value="${sndCfg().vol}"></div>
      <label><input type="checkbox" id="mOn" ${sndCfg().music?"checked":""}> Nhạc nền theo bản đồ</label>
      <div class="row">Nhạc <input type="range" id="mVol" min="0" max="1" step="0.05" value="${sndCfg().mvol}"></div></div>
    <h3>Tự động</h3><div class="card"><label><input type="checkbox" id="cAuto" ${S.autoEquip?"checked":""}> Tự mặc đồ tốt hơn khi nhặt</label><br>
      <label><input type="checkbox" id="cPot" ${S.holoOff?"":"checked"}> Tự uống Hồ Lô khi sinh lực / nội lực thấp · đã dùng ${fmt(S.potUsed||0)}</label><br>
      <label><input type="checkbox" id="cRide" ${S.autoRide===!1?"":"checked"}> Auto tự lên ngựa khi di chuyển, xuống ngựa khi đánh bằng chiêu không dùng được trên ngựa</label>
      <div class="row small">${[0,1].map(t=>{const s=typeof slotShow=="function"?slotShow(t):{name:""};return`<button class="btn sm" data-potsl="${t}">${t?"Nội lực (ô 2)":"Sinh lực (ô 1)"}: ${esc(s.name||"Tự động")} ▾</button>`}).join(" ")}</div>
      <label><input type="checkbox" id="cJunk" ${S.autoJunk===!1?"":"checked"}> Tự bán đồ thừa (yếu hơn đồ đang mặc cùng ô, vũ khí sai loại của phái; giữ tối đa 6 nhẫn / dây chuyền / ngọc bội để hợp Huyền Tinh)</label><br>
      <label><input type="checkbox" id="cPts" ${S.autoPts===!0?"checked":""}> Tự cộng điểm tiềm năng và võ công (mặc định tắt: tự cộng ở thẻ Nhân vật và Võ công)</label></div>
    <h3>Tiện ích</h3><div class="card lootf">

      <label><input type="checkbox" id="cBuy" ${S.autoBuy===!1?"":"checked"}> Tự mua vũ khí đúng loại ở Biện Kinh khi mạnh hơn ≥ 25% (tối đa 60% ngân lượng)</label>
      <div class="btnrow"><button class="btn" id="bKtc">🏮 Kỳ Trân Các</button><button class="btn" id="bStashM">Kho chung</button><button class="btn on" id="bPwaInstall" style="color:#ffd24a;font-weight:bold" title="Cài đặt game ra màn hình chính điện thoại">📱 Cài App</button><button class="btn on" id="bTyvo" style="background:#8c2d19;color:#ffd76a;border-color:#e09828">⚔️ Tỷ Võ</button><button class="btn on" id="bGm" style="background:#14232b;color:#60a5fa;border-color:#3b82f6;">🛡️ Quản Trị</button><button class="btn" id="bTut">Hướng dẫn</button><button class="btn" id="bCodex">Bách khoa</button><button class="btn" id="bSug">Gợi ý cộng điểm</button></div></div>
    <h3>Trợ năng</h3><div class="card lootf">
      <label><input type="checkbox" id="uJoy" ${S.joyOn?"checked":""}> Cần Joystick trên Mobile (mặc định: Chuột / Chạm di chuyển)</label>
      <div class="row">Cỡ chữ <select id="uFs">${UI_FS.map((t,s)=>`<option value="${s}" ${uiPrefs().fs===s?"selected":""}>${UI_FS_NAME[s]}</option>`).join("")}</select> <small class="dim">áp dụng cho bảng thông tin, thẻ và hộp thoại</small></div>
      <label><input type="checkbox" id="uSaver" ${uiPrefs().saver?"checked":""}> Tiết kiệm pin (vẽ 30 khung/giây, ngừng vẽ khi ẩn tab)</label>
      <small class="dim">Tay cầm: cần analog / D-pad để đi, A B X Y dùng chiêu 1–4, LB / RB uống thuốc HP / MP. Phím Esc đóng hộp thoại.</small></div>
    <h3>Điều khiển & Hiển thị</h3><div class="card">
      <div class="row"><span>Tốc độ Thế giới</span><b>x2.0</b></div>
      <label><input type="checkbox" id="cLowFx" ${S.lowFx?"checked":""}> Giảm hiệu ứng (mượt hơn trên máy yếu / đông quái)</label></div>
    <h3>Nguồn dữ liệu</h3><div class="card small dim">Kỹ năng, quái, trang bị, thuộc tính và tỉ lệ rơi đồ trích từ dữ liệu Võ Lâm Truyền Kỳ 1 (bản fan chơi offline, phi thương mại).</div>
    <div class="btnrow"><button class="btn" id="bSwitch">Đổi nhân vật / slot</button><button class="btn red" id="bReset">Xóa nhân vật</button></div>`;const e=(t,s)=>{const a=$(t);a&&(a.onclick=s)};e("#bCloud",()=>netModal("acc")),e("#bDl",()=>{downloadSaveFile()&&toast("Đã tải file lưu: "+saveFileName())}),e("#bFile",()=>pickSaveFile(null)),e("#bExp",()=>{$("#saveTxt").value=exportSave(),toast("Đã xuất mã")}),e("#bImp",()=>importFlow($("#saveTxt").value,null)),$("#cAuto").onchange=t=>{S.autoEquip=t.target.checked,save()},$("#cJunk").onchange=t=>{S.autoJunk=t.target.checked,save()},$("#sOn").onchange=t=>{audInit(),sndCfg().on=t.target.checked,audApply(),save()},$("#mOn").onchange=t=>{audInit(),sndCfg().music=t.target.checked,audApply(),sndCfg().music&&playMusic(R.town?W.town.id:zoneOf(Math.min(S.stage,STAGES)).id),save()},$("#sVol").oninput=t=>{sndCfg().vol=+t.target.value,audApply()},$("#mVol").oninput=t=>{sndCfg().mvol=+t.target.value,audApply()},$("#sVol").onchange=$("#mVol").onchange=()=>save(),$("#cPot").onchange=t=>{S.holoOff=!t.target.checked,S.potOff=t.target.checked?void 0:!0,save()},$("#cRide").onchange=t=>{S.autoRide=t.target.checked,save()},document.querySelectorAll("[data-potsl]").forEach(t=>t.onclick=()=>potSlotModal(+t.dataset.potsl)),$("#cPts").onchange=t=>{S.autoPts=t.target.checked,S.autoPts&&(autoSpendAttrs(),autoSpendSkills(),recalc()),save()},$("#cLowFx").onchange=t=>{S.lowFx=t.target.checked,save()},$("#cBuy").onchange=t=>{S.autoBuy=t.target.checked,save()},$("#bStashM").onclick=()=>stashModal(),$("#bKtc").onclick=()=>ktcModal(),$("#bPwaInstall")&&($("#bPwaInstall").onclick=()=>typeof promptPwaInstall=="function"?promptPwaInstall():pwaGuideModal()),$("#bTyvo")&&($("#bTyvo").onclick=()=>openTyvoModal()),$("#bGm")&&($("#bGm").onclick=()=>openGmAccessModal()),$("#bTut").onclick=()=>tutorialModal(0),$("#bCodex").onclick=()=>codexModal(),$("#bSug").onclick=suggestModal,$("#uFs").onchange=t=>{setUiPref({fs:+t.target.value})},$("#uJoy")&&($("#uJoy").onchange=t=>{S.joyOn=t.target.checked;save();typeof updateJoyUi=="function"&&updateJoyUi();typeof refreshInputBtn=="function"&&refreshInputBtn();toast(t.target.checked?"Đã bật Joystick trên Mobile":"Đã chuyển về Chuột / Chạm di chuyển");}),$("#uSaver").onchange=t=>setUiPref({saver:t.target.checked}),$("#bSwitch").onclick=()=>switchCharacter(),$("#bReset").onclick=()=>modal(`<h3>Xóa nhân vật?</h3><p class="desc">Xóa nhân vật ở slot ${SLOT+1} (${esc(FAC[S.fac]?FAC[S.fac].n:"")} cấp ${S.lvl}). Toàn bộ tiến trình của slot này sẽ mất; các slot khác không ảnh hưởng.</p><div class="btnrow"><button class="btn red" id="bYes">Xóa</button></div>`,()=>$("#bYes").onclick=()=>deleteSlot(SLOT))}function showTab(n){curTab=n,document.body.classList.toggle("tablog",n==="log"),document.body.classList.contains("u2m")&&typeof resizeArena=="function"&&typeof CV<"u"&&CV&&requestAnimationFrame(()=>{resizeArena(),typeof u20LogFit=="function"&&u20LogFit()}),document.querySelectorAll("#tabs button").forEach(e=>e.classList.toggle("on",e.dataset.t===n)),document.querySelectorAll(".tab").forEach(e=>e.classList.toggle("hidden",e.id!=="t-"+n)),refresh()}function refresh(){typeof modeSwSync=="function"&&modeSwSync(),S.fac&&(R.dirty&&recalc(),{log:renderLog,char:renderChar,skill:renderSkill,inv:renderInv,forge:renderForge,quest:renderQuest,more:renderMore}[curTab](),renderPad(),updateDots())}function updateDots(){$("#dotChar").classList.toggle("on",S.attrPts>0);const n=$("#dotForge"),e=$("#dotQuest");n&&n.classList.toggle("on",forgeDot()),e&&e.classList.toggle("on",questDot()),$("#dotSkill").classList.toggle("on",S.skPts>0&&FAC[S.fac]&&FAC[S.fac].skills.some(t=>canLearn(SK[t]))||isNovice()&&S.lvl>=NOVICE_LV)}function updateTop(){const n=R.P;if(!n)return;{const a=heroGfx(),l=$(".lvbox");a&&l&&l.style.setProperty("--pl",`url('${a.img}')`)}$("#lv").textContent=S.lvl,$("#gold").textContent=fmtL(S.gold);{const a=$("#knbTop");a&&(a.textContent=fmt(S.knb||0))}$("#heroName").innerHTML=(FAC[S.fac]?esc(FAC[S.fac].n):"");{let a=$("#skBuffs");a||(a=document.createElement("div"),a.id="skBuffs",$("#battle").appendChild(a));const o=(typeof stateIcons=="function"?stateIcons():[]).map(h=>`<div class="sti" title="${esc(h.n)}"><img src="${esc(h.ic||"")}" alt=""><b>${fmtLeft(h.t)}</b></div>`).join("");a.innerHTML!==o&&(a.innerHTML=o)}$("#stageLbl").textContent=R.dg?R.dg.kind==="boat"?"⛵ Phong Lăng Độ":R.dg.kind==="wb"?"Boss tuần":R.dg.d?R.dg.d.n:"Phó bản":`${modeOf()[1]} ${zoneOf(Math.min(S.stage,STAGES)).n} ${R.field&&!R.town?` · hạ ${fmt(R.field.kills)}`:""}`;const e=J.exp[S.lvl-1]||1;$("#xpBar").style.width=S.xp/e*100+"%",$("#xpTxt").textContent=`${(S.xp/e*100).toFixed(1)}%`,$("#hpBar").style.width=R.life/n.life*100+"%",$("#hpTxt").textContent=`${fmt(R.life)} / ${fmt(n.life)}`,$("#mpBar").style.width=R.mana/n.mana*100+"%",$("#mpTxt").textContent=`${fmt(R.mana)} / ${fmt(n.mana)}`,$("#mainSk").textContent=n.main.n;const t=$("#lvS");t&&(t.textContent=S.lvl);const s=$("#pwS");s&&R.P&&(s.textContent=fmt(Math.round(R.P.main.tot)))}function pickSaveFile(n){if(typeof netOn=="function"&&netOn()){toast("Bản online chỉ dùng lưu đám mây");return}const e=document.createElement("input");e.type="file",e.accept=".jxsave,.json,.txt,application/json,text/plain",e.style.display="none",e.onchange=()=>{const t=e.files&&e.files[0];if(e.remove(),!t)return;const s=new FileReader;s.onload=()=>importFlow(String(s.result),n),s.onerror=()=>toast("Không đọc được file"),s.readAsText(t)},document.body.appendChild(e),e.click()}function importFlow(n,e,t){if(typeof netOn=="function"&&netOn()){toast("Bản online chỉ dùng lưu đám mây");return}let s;try{s=parseSaveText(n)}catch(h){toast(h.message||"File không hợp lệ");return}const a=FAC[s.fac],l=`${esc(a.n)} cấp ${Math.max(1,Math.min(MAX_LEVEL,s.lvl|0))}`,o=[...Array(SLOT_N).keys()].map(h=>{const m=slotInfo(h),b=m&&FAC[m.fac];return`<div class="slotrow ${m?"":"empty"}"><span><b>Slot ${h+1}</b><small>${m&&b?esc(b.n)+" cấp "+m.lvl+" (sẽ bị ghi đè)":"Trống"}</small></span><button class="btn ${m?"red":""}" data-into="${h}">${m?"Ghi đè":"Nạp vào"}</button></div>`}).join("");modal(`<h3>Nạp file lưu</h3><p class="desc">Nhân vật trong file: <b>${l}</b>. Chọn slot để nạp (slot đã có nhân vật sẽ giữ một bản sao lưu).</p><div class="slotlist">${o}</div>${e?'<div class="btnrow"><button class="btn" id="impBack">Quay lại</button></div>':""}`,()=>{document.querySelectorAll("#mBody [data-into]").forEach(m=>m.onclick=()=>{try{SLOT===+m.dataset.into&&(SAVE_LOCK=!0),writeSlot(+m.dataset.into,s)}catch(b){toast(b.message);return}location.reload()});const h=$("#impBack");h&&(h.onclick=e)},!!e&&!S.fac)}function slotMenu(n){const e=[...Array(SLOT_N).keys()].map(t=>{const s=slotInfo(t),a=s&&FAC[s.fac];if(!s||!a)return`<div class="slotrow empty"><span><b>Slot ${t+1}</b><small>Trống</small></span><button class="btn" data-play="${t}">Tạo nhân vật</button></div>`;const l=s.last?new Date(s.last).toLocaleString("vi-VN"):"";return n===t?`<div class="slotrow del"><span><b>Xóa slot ${t+1}?</b><small>${esc(a.n)} cấp ${s.lvl} sẽ mất vĩnh viễn</small></span><button class="btn red" data-del-yes="${t}">Xóa</button><button class="btn" data-del-no="1">Hủy</button></div>`:`<div class="slotrow"><img src="${esc((heroGfx(s.fac,s.sex)||{}).img||"")}" alt=""><span><b style="color:${SERIES_COL[a.series]}">${esc(s.name&&s.name!==a.n?s.name+" · ":"")}${esc(a.n)}</b><small>Cấp ${s.lvl} · ải ${s.stage}${l?" · "+esc(l):""}</small></span><button class="btn" data-play="${t}">Chơi</button><button class="btn red" data-del="${t}">Xóa</button></div>`}).join("");modal(`<h3>Chọn nhân vật</h3><p class="desc">Mỗi slot là một nhân vật riêng, lưu độc lập.</p><div class="slotlist">${e}</div>${typeof netOn=="function"&&netOn()?"":'<div class="btnrow"><button class="btn" id="slotImp">Nạp từ file lưu (.jxsave)</button></div>'}`,()=>{const t=$("#slotCloud");t&&(t.onclick=()=>netModal("acc"));const s=$("#slotImp");s&&(s.onclick=()=>pickSaveFile(()=>slotMenu())),document.querySelectorAll("#mBody [data-play]").forEach(a=>a.onclick=()=>{try{localStorage.setItem(SLOT_PTR,a.dataset.play)}catch{}SAVE_LOCK=!0,location.reload()}),document.querySelectorAll("#mBody [data-del]").forEach(a=>a.onclick=()=>slotMenu(+a.dataset.del)),document.querySelectorAll("#mBody [data-del-no]").forEach(a=>a.onclick=()=>slotMenu()),document.querySelectorAll("#mBody [data-del-yes]").forEach(a=>a.onclick=()=>deleteSlot(+a.dataset.delYes))},!0)}const SERIES_DESC = [
  "Cương mãnh, cận chiến ngoại công và ám khí",
  "Thân pháp mau lẹ, độc sát và bẫy thuật",
  "Mềm mại uyển chuyển, kiếm pháp và nội công băng sát",
  "Hỏa lực mãnh liệt, chưởng pháp và đao pháp bạo phát",
  "Khí công hùng hậu, kiếm khí lôi đình và quyền cước"
];
let NEWC = { name: "", sex: 0, s: 0 };

function pickFaction() {
  const n = a => FACTIONS.filter(l => l.series === a);
  const e = (a, l) => n(a).map(o => facAllowed(o, l) ? esc(o.n) : `<span style="opacity:0.35;text-decoration:line-through">${esc(o.n)}</span>`).join(" · ");
  const sAllowed = n(NEWC.s).some(a => facAllowed(a, NEWC.sex));

  // Cấu hình sprite animation: tên file và số frame tương ứng
  const FOCUS_SPRITES = {
    0: { 0: { f: "kim_nam_focus.webp", n: 11 }, 1: { f: "kim_nu_focus.webp", n: 10 } },
    1: { 0: { f: "moc_nam_focus.webp", n: 11 }, 1: { f: "moc_nu_focus.webp", n: 8 } },
    2: { 0: { f: "thuy_nam_focus.webp", n: 10 }, 1: { f: "thuy_nu_focus.webp", n: 11 } },
    3: { 0: { f: "hoa_nam_focus.webp", n: 9 }, 1: { f: "hoa_nu_focus.webp", n: 11 } },
    4: { 0: { f: "tho_nam_focus.webp", n: 11 }, 1: { f: "tho_nu_focus.webp", n: 11 } }
  };

  const spM = (FOCUS_SPRITES[NEWC.s] && FOCUS_SPRITES[NEWC.s][0]) || { f: "kim_nam_focus.webp", n: 11 };
  const spF = (FOCUS_SPRITES[NEWC.s] && FOCUS_SPRITES[NEWC.s][1]) || { f: "kim_nu_focus.webp", n: 10 };
  const durM = (spM.n * 0.12).toFixed(2);
  const durF = (spF.n * 0.12).toFixed(2);

  // Chi tiết mô tả môn phái theo hệ đúng chất VLTK
  const FAC_DETAIL = [
    "Hệ Kim: Có thể gia nhập Thiếu Lâm (Chính phái - chỉ nhận nam) hoặc Thiên Vương Bang (Trung lập). Ngoại công cương mãnh, cận chiến dũng mãnh vô song.",
    "Hệ Mộc: Có thể gia nhập Đường Môn (Trung lập) hoặc Ngũ Độc Giáo (Tà phái). Thân pháp phi phàm, ám khí cơ quan và độc sát trí mạng.",
    "Hệ Thủy: Có thể gia nhập Nga My (Chính phái - chỉ nhận nữ) hoặc Thúy Yên Môn (Trung lập - chỉ nhận nữ). Kiếm pháp băng sát làm chậm và trị liệu cứu nhân độ thế.",
    "Hệ Hỏa: Có thể gia nhập Thiên Nhẫn Giáo (Tà phái) hoặc Cái Bang (Chính phái). Chưởng pháp và đao pháp bạo liệt, hỏa thiêu liên hoàn cuồng bạo.",
    "Hệ Thổ: Có thể gia nhập Võ Đang (Chính phái) hoặc Côn Lôn (Trung lập). Kiếm khí lôi đình, nội lực hộ thể huyền diệu, quyền pháp vô song."
  ];

  // Đảm bảo người dùng phải đăng nhập tài khoản trước khi vào Tạo Nhân Vật
  if (typeof netEnsureUser == "function") {
    let hasUser = !1;
    try { hasUser = !!localStorage.getItem("jx2_auth_user"); } catch {}
    if (!hasUser) {
      if (typeof netModal == "function") netModal("acc");
      return;
    }
  }

  // Đóng modal cũ nếu có
  closeModal(true);

  // Xóa màn hình tạo nhân vật cũ nếu đang tồn tại
  const oldScr = $("#createCharScreen");
  if (oldScr) oldScr.remove();

  const scr = document.createElement("div");
  scr.id = "createCharScreen";
  scr.innerHTML = `
    <style>
      #createCharScreen {
        position: fixed; inset: 0; z-index: 9999;
        background: #000 url('ui/v3/nen_tao_nv.webp') center/cover no-repeat;
        font-family: inherit; color: #f5ebd2;
        display: flex; flex-direction: column; justify-content: space-between;
        user-select: none; -webkit-user-select: none; overflow: hidden;
      }
      @keyframes animCcWalk {
        from { transform: translateX(0); }
        to { transform: translateX(-100%); }
      }
      .cc-char-wrap {
        position: relative; width: clamp(200px, 28vw, 360px); aspect-ratio: 1/1;
        display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
        cursor: pointer; transition: transform .2s, filter .2s;
      }
      .cc-char-wrap:hover {
        transform: scale(1.02);
      }
      .cc-char-viewport {
        width: 100%; height: 100%; position: relative; overflow: hidden;
      }
      .cc-char-sprite {
        position: absolute; left: 0; top: 0; height: 100%;
        background-repeat: no-repeat; background-size: 100% 100%;
      }
      .cc-char-wrap.active .cc-char-viewport {
        filter: drop-shadow(0 0 16px rgba(255, 215, 80, 0.75)) drop-shadow(0 0 32px rgba(255, 255, 255, 0.4));
      }
      .cc-char-wrap.inactive {
        filter: grayscale(100%) brightness(0.65) opacity(0.8);
      }
      .cc-char-tag {
        position: absolute; bottom: -8px; font-weight: bold; font-size: clamp(13px, 1.6vw, 16px);
        letter-spacing: 2px; padding: 4px 18px; border-radius: 14px;
        background: rgba(0,0,0,0.75); border: 1.5px solid #a88344; color: #f3dfa7;
        box-shadow: 0 0 10px rgba(0,0,0,0.8); pointer-events: none; z-index: 5;
      }
      .cc-char-wrap.active .cc-char-tag {
        background: linear-gradient(#b8862e, #553408); border-color: #ffe682; color: #fff;
        box-shadow: 0 0 12px rgba(255,215,80,0.6);
      }
      .cc-pillar-btn {
        width: clamp(48px, 6.5vw, 64px); height: clamp(48px, 6.5vw, 64px); border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        background: radial-gradient(circle, rgba(20,20,20,0.85) 0%, rgba(5,5,5,0.95) 100%);
        border: 2px solid #5a462b; color: #a89472; font-size: clamp(14px, 1.8vw, 18px); font-weight: bold;
        cursor: pointer; transition: all .2s; box-shadow: 0 4px 10px rgba(0,0,0,0.7);
      }
      .cc-pillar-btn:hover {
        transform: scale(1.1); filter: brightness(1.2);
      }
      .cc-pillar-btn.active {
        border-color: #ffd875; color: #fff; transform: scale(1.14);
        box-shadow: 0 0 20px rgba(255,216,117,0.75), inset 0 0 10px rgba(255,216,117,0.5);
      }
      .cc-pillar-btn.s-0.active { background: radial-gradient(circle, #b88a28 0%, #4a3407 100%); border-color: #ffe48a; }
      .cc-pillar-btn.s-1.active { background: radial-gradient(circle, #2e8a3a 0%, #0d3813 100%); border-color: #8aff96; }
      .cc-pillar-btn.s-2.active { background: radial-gradient(circle, #1e6fa8 0%, #082d47 100%); border-color: #7adaff; }
      .cc-pillar-btn.s-3.active { background: radial-gradient(circle, #b33924 0%, #4a1107 100%); border-color: #ff907a; }
      .cc-pillar-btn.s-4.active { background: radial-gradient(circle, #a87630 0%, #422d0e 100%); border-color: #f7cb79; }
      @media (max-width: 600px) {
        .cc-char-wrap { width: clamp(140px, 40vw, 220px); aspect-ratio: 1/1; }
      }
    </style>

    <!-- Header version & title -->
    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 18px 0;z-index:10">
      <div style="font-size:clamp(16px, 2.2vw, 22px);font-weight:bold;color:#fce49f;letter-spacing:3px;text-shadow:0 0 10px #b8781a,0 2px 4px #000">
        HÙNG BÁ THIÊN HẠ
      </div>
      <div style="font-size:13px;color:#d8ccb0;opacity:0.85;letter-spacing:1px">Ver. 1.23.0</div>
    </div>

    <!-- Vùng giữa: Nhân vật Nam (trái), Cột Ngũ Hành (giữa), Nhân vật Nữ (phải) -->
    <div style="flex:1;display:flex;align-items:center;justify-content:space-around;position:relative;padding:0 2vw;max-height:calc(100vh - 160px)">
      
      <!-- Nhân vật Nam -->
      <div class="cc-char-wrap ${NEWC.sex === 0 ? 'active' : 'inactive'}" id="ccCharM" data-sx="0">
        <div class="cc-char-viewport">
          <div class="cc-char-sprite" style="width:${spM.n * 100}%;background-image:url('ui/tao_nv/${spM.f}');animation:animCcWalk ${durM}s steps(${spM.n}) infinite"></div>
        </div>
        <div class="cc-char-tag">NAM NHÂN</div>
      </div>

      <!-- Trụ ánh sáng & 5 nút Ngũ Hành (Kim - Mộc - Thủy - Hỏa - Thổ) -->
      <div style="display:flex;flex-direction:column;align-items:center;gap:clamp(6px, 1.5vh, 14px);position:relative;z-index:10;padding:10px 0">
        <!-- Vòng hào quang dọc phía sau -->
        <div style="position:absolute;top:-10%;bottom:-10%;width:36px;background:radial-gradient(ellipse at center, rgba(255,235,160,0.3) 0%, rgba(255,215,80,0.1) 40%, rgba(255,255,255,0) 80%);pointer-events:none;filter:blur(4px)"></div>
        
        ${[0, 1, 2, 3, 4].map(idx => `
          <div class="cc-pillar-btn s-${idx} ${NEWC.s === idx ? 'active' : ''}" data-se="${idx}" title="Hệ ${SERIES[idx]}">
            ${SERIES[idx]}
          </div>
        `).join("")}
      </div>

      <!-- Nhân vật Nữ -->
      <div class="cc-char-wrap ${NEWC.sex === 1 ? 'active' : 'inactive'}" id="ccCharF" data-sx="1">
        <div class="cc-char-viewport">
          <div class="cc-char-sprite" style="width:${spF.n * 100}%;background-image:url('ui/tao_nv/${spF.f}');animation:animCcWalk ${durF}s steps(${spF.n}) infinite"></div>
        </div>
        <div class="cc-char-tag">NỮ HIỆP</div>
      </div>

    </div>

    <!-- Vùng dưới: Khung mô tả môn phái + Thanh nhập tên, Hủy, OK chuẩn VLTK 1 -->
    <div style="display:flex;flex-direction:column;align-items:center;padding:0 12px 14px;z-index:10">
      
      <!-- Hộp mô tả hệ & môn phái tương ứng -->
      <div style="max-width:760px;width:95%;background:rgba(8,12,10,0.72);border:1.5px solid #6b5534;border-radius:6px;padding:8px 16px;text-align:center;box-shadow:0 0 18px rgba(0,0,0,0.9);margin-bottom:10px">
        <div style="color:#7ef18c;font-size:clamp(12px, 1.4vw, 14px);line-height:1.45;text-shadow:0 1px 2px #000">
          ${FAC_DETAIL[NEWC.s] || ""}
        </div>
        ${sAllowed ? "" : `<div style="color:#ff786b;font-weight:bold;font-size:12px;margin-top:4px">Hệ ${SERIES[NEWC.s]} không có môn phái nhận đệ tử ${NEWC.sex ? "nữ" : "nam"}. Hãy chọn lại giới tính hoặc hệ khác!</div>`}
      </div>

      <!-- Thanh nhập tên VLTK: [ Hủy ] [ Ngoại Hiệu | Input ] [ OK ] -->
      <div style="max-width:760px;width:95%;display:flex;align-items:center;background:url('ui/tao_nv/nen.webp') center/cover;border:2px solid #ab8240;border-radius:4px;box-shadow:0 0 20px rgba(0,0,0,0.95);overflow:hidden;padding:3px">
        
        <!-- Nút Hủy -->
        <button id="ccBtnCancel" style="padding:8px 24px;border:none;background:transparent;color:#fce49f;font-weight:bold;font-size:clamp(14px, 1.8vw, 16px);cursor:pointer;font-family:inherit;text-shadow:0 0 4px #000;letter-spacing:1px;transition:filter .15s">
          Hủy
        </button>

        <!-- Khung nhập tên đại hiệp (Ngoại hiệu) -->
        <div style="flex:1;display:flex;align-items:center;background:rgba(240,240,230,0.92);border-radius:3px;margin:0 6px;padding:0 10px;height:38px;box-shadow:inset 0 1px 4px rgba(0,0,0,0.5)">
          <span style="color:#2a2016;font-weight:bold;font-size:clamp(13px, 1.5vw, 15px);white-space:nowrap;margin-right:8px;letter-spacing:1px">
            Ngoại Hiệu:
          </span>
          <input id="ccNameInput" maxlength="14" placeholder="Nhập tên nhân vật (2 - 14 ký tự)..." value="${esc(NEWC.name)}" style="flex:1;border:none;background:transparent;color:#111;font-size:clamp(13px, 1.5vw, 15px);font-weight:bold;outline:none;font-family:inherit;width:100%">
        </div>

        <!-- Nút OK (Tạo) -->
        <button id="ccBtnOk" ${sAllowed ? "" : "disabled"} style="padding:8px 28px;border:none;background:transparent;color:${sAllowed ? '#ffe882' : '#888'};font-weight:bold;font-size:clamp(14px, 1.8vw, 16px);cursor:${sAllowed ? 'pointer' : 'default'};font-family:inherit;text-shadow:0 0 4px #000;letter-spacing:2px;transition:filter .15s">
          OK
        </button>

      </div>
    </div>
  `;

  document.body.appendChild(scr);

  // Xử lý sự kiện tương tác
  const nameInput = $("#ccNameInput");
  nameInput.oninput = () => { NEWC.name = nameInput.value; };

  // Chọn giới tính khi click vào nhân vật
  const charM = $("#ccCharM");
  const charF = $("#ccCharF");
  if (charM) {
    charM.onclick = () => {
      NEWC.name = nameInput.value;
      NEWC.sex = 0;
      pickFaction();
    };
  }
  if (charF) {
    charF.onclick = () => {
      NEWC.name = nameInput.value;
      NEWC.sex = 1;
      pickFaction();
    };
  }

  // Chọn hệ trên trụ ngũ hành
  scr.querySelectorAll("[data-se]").forEach(btn => {
    btn.onclick = () => {
      NEWC.name = nameInput.value;
      NEWC.s = +btn.dataset.se;
      pickFaction();
    };
  });

  // Nút Hủy -> quay lại màn hình chọn nhân vật
  const cancelBtn = $("#ccBtnCancel");
  if (cancelBtn) {
    cancelBtn.onclick = () => {
      scr.remove();
      if (typeof newSave === "function") {
        S = newSave();
      }
      if (typeof slotMenu === "function") slotMenu();
    };
  }

  // Nút OK -> hoàn tất tạo nhân vật
  const okBtn = $("#ccBtnOk");
  if (okBtn) {
    okBtn.onclick = () => {
      const charName = nameInput.value.trim().replace(/\s+/g, " ");
      if (charName.length < 2) {
        toast("Tên nhân vật cần ít nhất 2 ký tự");
        return;
      }
      scr.remove();
      createCharacter(charName.slice(0, 14), NEWC.sex, NEWC.s);
    };
  }
}

function createCharacter(n,e,t){
  if (typeof S === "undefined" || !S) {
    if (typeof newSave === "function") {
      S = newSave();
    } else {
      S = {v:1,name:n,fac:null,sex:e,lvl:1,xp:0,gold:0,attrPts:0,attr:{str:0,dex:0,vit:0,eng:0},knbV:2,skPts:1,sk:{},main:0,eq:{},inv:[],stage:1,maxStage:1,wave:1,uid:1,autoSell:0,kps:.2,totalKills:0,autoEquip:!0,autoPts:!1,diff:1,autoForge:!0,autoBuy:!0,tut:0,hints:{},bakAt:0,potOff:!1,potUsed:0,potStock:{life:{},mana:{}},ctrl:"auto",joy:"fixed",slots:[0,0,0,0],snd:{on:!0,vol:.7,music:!0,mvol:.4},lootF:{minRar:1,minLvl:1,groups:[],series:[],auto:!0},ground:[],mats:{ht:{},ore:{},shard:{},misc:{}},last:Date.now()};
    }
  }
  S.fac="vo"+t,S.sex=e,S.sexSet=1,S.name=n,typeof NET<"u"&&NET.user&&(S.netOwner=NET.user.id),starterGear(),R.dirty=!0,recalc(),R.life=R.P.life,R.mana=R.P.mana,loginCheck(),dotGift(),closeModal(!0),save(),showTab("log"),log(`<b>${esc(n)}</b> (${e?"nữ":"nam"}, hệ <span style="color:${SERIES_COL[t]}">${SERIES[t]}</span>) bước vào giang hồ. Đạt cấp ${NOVICE_LV} để gia nhập môn phái.`),log(`🌱 Nhận <b>Hỗ Trợ Tân Thủ</b>: vòng sáng hồi ${NEWBIE_REGEN.life*100}% sinh lực + ${NEWBIE_REGEN.mana*100}% nội lực mỗi giây, <b>+${NEWBIE_XP*100}% kinh nghiệm</b> luyện cấp đến cấp ${NEWBIE_LV}.`);
  try {
    sessionStorage.setItem("jxidle_in", String(SLOT));
  } catch(err) {}
  if (typeof resizeArena === "function") resizeArena();
  if (typeof onZoneChange === "function") {
    const z = typeof zoneOf === "function" ? zoneOf(Math.min(S.stage || 1, STAGES)) : null;
    if (z) onZoneChange(z);
  }
  if (typeof H !== "undefined" && typeof WORLD !== "undefined" && WORLD.w) {
    H.x = WORLD.w / 2;
    H.y = WORLD.h / 2;
    if (typeof snapCamera === "function") snapCamera();
  }
  if (typeof spawnWave === "function") spawnWave();
  if (typeof refresh === "function") refresh();
  if (typeof renderPad === "function") renderPad();
}function joinModal(){if(!isNovice())return;const n=heroSeries(),e=FACTIONS.filter(s=>s.series===n);if(S.lvl<NOVICE_LV){modal(`<h3>Gia nhập môn phái</h3><p class="desc">Cần đạt cấp ${NOVICE_LV} (hiện cấp ${S.lvl}). Các phái hệ ${SERIES[n]}: ${e.map(s=>esc(s.n)).join(", ")}.</p>`);return}const t=e.map(s=>{const a=facAllowed(s,S.sex),l=s.starter&&SK[s.starter];return`<button data-j="${s.key}" ${a?"":"disabled"} style="--c:${SERIES_COL[s.series]}"><img src="${(W.hero[s.key]||{}).img||""}" alt=""><b>${esc(s.n)}</b><small>${a?`Chiêu nhập môn: ${l?esc(l.n):"—"} · ${weaponTypeName(s)}`:`Chỉ nhận ${FAC_SEX[s.key]?"nữ":"nam"}`}</small></button>`}).join("");modal(`<h3>Gia nhập môn phái <small>hệ ${SERIES[n]}</small></h3><p class="desc">Đã đạt cấp ${NOVICE_LV}. Chọn môn phái cùng hệ ${SERIES[n]}: nhận chiêu nhập môn và vũ khí của phái. Điểm kỹ năng tích lũy từ trước vẫn giữ.</p><div class="facpick">${t}</div>`,()=>{document.querySelectorAll("#mBody [data-j]").forEach(s=>s.onclick=()=>joinFaction(s.dataset.j))})}const WTYPE_VI={0:"kiếm",1:"đao",2:"côn",3:"thương",4:"chùy",5:"song đao",7:"ám khí",9:"quyền chưởng"},weaponTypeName=n=>WTYPE_VI[n.wcode]||"vũ khí";function joinFaction(n){const e=FAC[n];if(!e||e.novice||!isNovice()||e.series!==heroSeries()||!facAllowed(e,S.sex))return;S.fac=n,e.starter&&!S.sk[e.starter]&&(S.sk[e.starter]=1,S.skPts=Math.max(0,S.skPts-1),S.main=e.starter);const t=clamp(Math.round(S.lvl/12)+1,1,10),s=facWeaponDP(e),a=makeItem(s[0],s[1],t,0);if(a&&(S.inv.unshift(a),invDirty=!0),S.autoPts===!0){let l=0;for(const o in S.attr)l+=S.attr[o],S.attrPts+=S.attr[o],S.attr[o]=0;if(a){const o=reqDeficit(a);for(const h in o){const m=Math.min(o[h],S.attrPts);S.attr[h]+=m,S.attrPts-=m}}R.dirty=!0,recalc(),a&&reqOk(a)&&equip(a,!0),R.dirty=!0,recalc(),autoSpendSkills(),autoSpendAttrs(),typeof autoEquipAll=="function"&&autoEquipAll(),l&&log(`🌊 Vào phái: phân phối lại ${l} điểm tiềm năng theo võ công / vũ khí ${esc(e.n)}.`)}else a&&reqOk(a)&&equip(a,!0);fillSlots(),R.dirty=!0,recalc(),closeModal(!0),refresh(),renderPad(),save(),R.banner={t:2.6,text:"Gia nhập "+e.n,sub:"Học võ công ở thẻ Võ công"},log(`<b class="up">Gia nhập <span style="color:${SERIES_COL[e.series]}">${esc(e.n)}</span>!</b>`),uiSfx("levelup")}const NOTICE_TXT="JxOffline - Phi thương mại, ưu tiên giải trí trên chính thiết bị của mình";function noticeModal(){}function startFaction(n){const e=FAC[n];S.fac=n,S.sex=["emei","cuiyan"].includes(n)?1:0,S.sexSet=1,S.name=S.name&&S.name!=="Tân thủ"?S.name:e.n,e.starter&&(S.sk[e.starter]=1,S.skPts=Math.max(0,S.skPts-1),S.main=e.starter),starterGear(),R.dirty=!0,recalc(),R.life=R.P.life,R.mana=R.P.mana,loginCheck(),dotGift(),closeModal(!0),save(),showTab("log"),log(`Gia nhập <b style="color:${SERIES_COL[e.series]}">${esc(e.n)}</b>. Bắt đầu hành tẩu giang hồ!`),log(`🌱 Nhận <b>Hỗ Trợ Tân Thủ</b>: vòng sáng hồi ${NEWBIE_REGEN.life*100}% sinh lực + ${NEWBIE_REGEN.mana*100}% nội lực mỗi giây, <b>+${NEWBIE_XP*100}% kinh nghiệm</b> luyện cấp đến cấp ${NEWBIE_LV}.`)}function starterGear(){if(S.eq.weapon)return;const n=FAC[S.fac],e=n&&!n.novice?facWeaponDP(n):[0,n&&n.wcode>=0&&n.wcode!==9?n.wcode:6],t=makeItem(e[0],e[1],1,0);t&&(S.eq.weapon=t);const s=makeItem(2,sexPart(2,S.sex||0),1,0);s&&sexOk(s)&&(S.eq.armor=s)}
