/* ======================= BANG THONG TIN KHI RE CHUOT (may tinh, giong JX1) =======================
   Re chuot vao vat pham (tui, o trang bi, kho chung, cua hang) hoac chieu (the Vo cong, o chieu tren san) -> hien bang thong tin
   canh con tro. Do trong tui: kem mon dang mac cung o de so sanh. Bam van mo hop thoai co nut nhu cu.
   Chi bat khi co chuot that (hover + pointer fine); dien thoai / may tinh bang cam ung khong doi. */
'use strict';
const TIP = { el: null, key: '', x: 0, y: 0 };
const tipEnabled = () => !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);

function tipContent(target) {
  const chest=target.closest('[data-pc-key]');
  if(chest&&typeof personalChestRows==='function'){
    const row=(personalChestSide==='out'?personalChestRows():personalChestBag()).find(e=>e?.key===chest.dataset.pcKey);
    if(row)return ['pc:'+JSON.stringify(row),personalChestInfo(row)];
  }
  const cached=typeof itemInfoRead==='function'?itemInfoRead(target):null;
  if(cached)return ['u-info:'+JSON.stringify(cached),itemInfoHtml(cached)];
  const stack = target.closest('[data-bag-stack]');
  if (stack && typeof unifiedBagStacks === 'function') {
    const row = unifiedBagStacks().find(m => m.type+'|'+m.id === stack.dataset.bagStack);
    if (!row) return null;
    return ['ub:'+stack.dataset.bagStack+':'+row.qty, unifiedBagInfoHtml(row)];
  }
  // vat pham trong tui / dang mac; do tren dat chi bam nhat
  const iu = target.closest('.it[data-uid]');
  if (iu) {
    const it = findItem(iu.dataset.uid); if (!it) return null;
    let h = `<div class="tip-item-pane"><div class="tiplbl">${S.inv.includes(it)?'Đang xem':'Đang mặc'}</div>${itemHTML(it)}</div>`;
    if (S.inv.includes(it)) {
      const cur = S.eq[slotFor(it)];
      if (cur && cur !== it) h += `<div class="tipcmp tip-item-pane"><div class="tiplbl">Đang mặc</div>${itemHTML(cur)}</div>`;
    }
    return ['u' + it.uid, h];
  }
  // kho chung
  const si = target.closest('#stBox .it[data-si]');
  if (si && typeof stashRead === 'function') {
    const it = (stashRead().st.items || [])[+si.dataset.si]; if (!it) return null;
    return ['s' + si.dataset.si, itemHTML(it)];
  }
  // cua hang: hang ban (bo qua thuoc)
  const sr = target.closest('.shoprow[data-i]');
  if (sr && R.shopList) {
    const g=R.shopList[+sr.dataset.i];
    if(g?.g===1){const p=potionOf(g);return p?['pot:'+sr.dataset.i,`<h3>${esc(p.n)}</h3><p>Hồi ${fmt(p.total)} ${p.kind==='life'?'sinh lực':'nội lực'} trong ${p.dur}s.</p><p>Còn ${potStock(p.kind)[p.tier]||0} bình · mua ${POT_STACK} bình/chồng</p><p class="gold">${fmtSilver(shopPrice(g)*POT_STACK)}</p>`]:null;}
    try { const it = goodsItem(R.shopList[+sr.dataset.i]); if (it) return ['g' + sr.dataset.i, itemHTML(it, true)]; } catch (e) {}
    return null;
  }
  // cua hang Tong Kim (tongkim.js) - ca the Doi thuong
  const tkr = target.closest('[data-tkt]');
  if (tkr && typeof tkShopTip === 'function') { const h = tkShopTip(+tkr.dataset.tkt); return h ? ['t' + tkr.dataset.tkt + ':' + tkData().pts, h] : null; }
  // chieu: the Vo cong va o chieu tren san
  const sk = target.closest('.skl[data-id]');
  if (sk && SK[sk.dataset.id]) return ['k' + sk.dataset.id, skillInfoHtml(+sk.dataset.id)];
  const pb = target.closest('#pad .pbtn.sk[data-i]');
  if (pb) { const id = (S.slots || [])[+pb.dataset.i]; if (id && SK[id]) return ['k' + id, skillInfoHtml(id)]; }
  return null;
}

function tipPlace() {
  const el = TIP.el; if (!el || el.hidden) return;
  const pad = 16, vw = window.innerWidth, vh = window.innerHeight;
  const cards = el.querySelectorAll('.vp-card');
  if (el.classList.contains('vp-item-tip') && cards.length > 1) {
    const side = Math.max(TIP.x - pad - 6, vw - TIP.x - pad - 6);
    el.classList.toggle('vp-stack', side < cards[0].offsetWidth + cards[1].offsetWidth + 32);
  } else el.classList.remove('vp-stack');
  const w = el.offsetWidth, h = el.offsetHeight;
  let x = TIP.x + pad, y = TIP.y + pad;
  if (x + w > vw - 6) x = TIP.x - w - pad;
  if (x < 6) x = 6;
  if (y + h > vh - 6) y = Math.max(6, vh - h - 6);
  el.style.left = x + 'px'; el.style.top = y + 'px';
}
function tipHide() { if (TIP.el) TIP.el.hidden = true; TIP.key = ''; }

function tipInit() {
  const el = document.createElement('div'); el.id = 'tip'; el.hidden = true; document.body.appendChild(el); TIP.el = el;
  document.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' || !tipEnabled()) return;
    TIP.x = e.clientX; TIP.y = e.clientY;
    let c = e.target && e.target.closest ? tipContent(e.target) : null;
    if (!c) { tipHide(); return; }
    if (c[0] !== TIP.key) { TIP.key = c[0]; el.classList.toggle('vp-item-tip', /^[usg]/.test(c[0])); el.innerHTML = c[1]; el.hidden = false; }
    tipPlace();
  }, { passive: true });
  // bam / cuon / roi cua so: an bang de khong che hop thoai
  ['pointerdown', 'wheel', 'blur'].forEach(ev => window.addEventListener(ev, tipHide, { passive: true }));
  document.addEventListener('pointerleave', tipHide);
}
document.addEventListener('click',e=>{
 const target=e.target?.closest?.('[data-item-info],[data-ktc-info]');if(!target)return;
 const it=itemInfoRead(target);if(!it)return;
 // Existing shop/forge/inspect buttons already open detail/action windows.
 if(target.closest('#htPool button,#pkPool button')){queueMicrotask(()=>itemInfoPopup(it));return;}
 if(target.closest('button,.shoprow,[data-inspect-item],[data-uid]'))return;
 e.preventDefault();e.stopPropagation();itemInfoPopup(it);
},true);
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target?.matches?.('[data-item-info],[data-ktc-info]')){e.preventDefault();e.stopPropagation();const it=itemInfoRead(e.target);if(it)itemInfoPopup(it);}},true);
tipInit();
