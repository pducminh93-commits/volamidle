"use strict";

/**
 * MODULE CHỢ GIAO DỊCH P2P (market.js)
 * Tương tác trực tiếp với Supabase bảng market_items
 */

let MKT = {
  tab: "browse", // "browse" | "sell" | "my"
  typeFilter: -1, // -1 = tất cả, hoặc theo item.d (0=kiếm, 1=tiêu, 2=áo, 7=nón, 10=ngựa...)
  items: [],
  myItems: [],
  loading: false
};

const MKT_TYPES = [
  [-1, "Tất cả"],
  [0, "Vũ khí cận chiến"],
  [1, "Ám khí / Cung"],
  [2, "Y phục"],
  [7, "Nón"],
  [3, "Hộ uyển"],
  [5, "Đai lưng"],
  [8, "Giày"],
  [4, "Vũ khí phụ / Bội"],
  [6, "Nhẫn"],
  [9, "Hộ thân phù"],
  [10, "Thú cưỡi"]
];

async function marketOpen(tab = "browse") {
  if (!netOn()) {
    toast("Tính năng Chợ yêu cầu kết nối Giang hồ Online");
    return;
  }
  if (!NET.user) {
    toast("Vui lòng đăng nhập tài khoản trước khi vào Chợ!");
    netModal("acc");
    return;
  }

  MKT.tab = tab;
  await marketRenderModal();
}

async function marketFetchSelling() {
  try {
    let path = "/market_items?status=eq.selling&order=created_at.desc&limit=100";
    if (MKT.typeFilter >= 0) {
      path += "&item_type=eq." + MKT.typeFilter;
    }
    const res = await sbCall(path);
    MKT.items = Array.isArray(res) ? res : [];
  } catch (err) {
    console.error("Lỗi tải Chợ:", err);
    MKT.items = [];
  }
}

async function marketFetchMyItems() {
  if (!NET.user) return;
  try {
    const res = await sbCall("/market_items?seller_id=eq." + encodeURIComponent(NET.user.id) + "&order=created_at.desc&limit=50");
    MKT.myItems = Array.isArray(res) ? res : [];
  } catch (err) {
    console.error("Lỗi tải đồ cá nhân:", err);
    MKT.myItems = [];
  }
}

async function marketRenderModal() {
  const tabs = [
    ["browse", "🏪 Chợ Giang Hồ"],
    ["sell", "📦 Đăng Bán"],
    ["my", `📋 Gian Hàng (${MKT.myItems.filter(i => i.status === "selling" || i.status === "sold").length})`]
  ];

  const html = `
    <div class="mkt-wrap">
      <div class="dtabs" id="mktTabs" style="margin-bottom:10px">
        ${tabs.map(([k, label]) => `<button class="${k === MKT.tab ? "on" : ""}" data-mt="${k}">${label}</button>`).join("")}
      </div>
      <div id="mktBody"><p class="dim small">Đang nạp dữ liệu chợ…</p></div>
    </div>
  `;

  modal(`<h3>🏪 Chợ Giao Dịch P2P <small style="font-weight:normal;font-size:12px">Ngân lượng: ${fmtL(S.gold)} · KNB: ${fmt(S.knb || 0)}</small></h3>` + html, () => {
    document.querySelectorAll("#mktTabs [data-mt]").forEach(btn => {
      btn.onclick = () => {
        MKT.tab = btn.dataset.mt;
        marketRenderModal();
      };
    });
  });

  const body = $("#mktBody");
  if (!body) return;

  if (MKT.tab === "browse") {
    await marketRenderBrowse(body);
  } else if (MKT.tab === "sell") {
    marketRenderSell(body);
  } else if (MKT.tab === "my") {
    await marketRenderMy(body);
  }
}

async function marketRenderBrowse(container) {
  container.innerHTML = `<p class="dim small">Đang tải vật phẩm trên Chợ…</p>`;
  await marketFetchSelling();

  const filterHtml = `
    <div style="display:flex;gap:6px;align-items:center;margin-bottom:8px;overflow-x:auto;padding-bottom:4px">
      <span class="dim small" style="white-space:nowrap">Loại:</span>
      <select id="mktTypeSel" style="background:#151614;color:#ffe9a8;border:1px solid #7d6a3c;padding:2px 6px;border-radius:3px">
        ${MKT_TYPES.map(([id, name]) => `<option value="${id}" ${id === MKT.typeFilter ? "selected" : ""}>${name}</option>`).join("")}
      </select>
      <button class="btn sm" id="mktRefresh">Làm mới</button>
    </div>
  `;

  if (!MKT.items.length) {
    container.innerHTML = filterHtml + `<div class="card" style="text-align:center;padding:25px"><p class="dim">Chợ hiện chưa có vật phẩm nào được rao bán ở mục này.<br>Hãy trở thành người đầu tiên đăng bán!</p></div>`;
  } else {
    const listHtml = MKT.items.map(row => {
      const it = row.item_data;
      const isMine = NET.user && row.seller_id === NET.user.id;
      const priceText = row.price_type === "knb" ? `<b style="color:#ffd24a">${fmt(row.price)} KNB</b>` : `<b style="color:#ffd24a">${fmtL(row.price * 10000)}</b>`;
      return `
        <div class="qrow" style="display:flex;align-items:center;gap:8px;padding:6px;border-bottom:1px solid #332d1e">
          <div style="flex:none">${itemCell(it)}</div>
          <div style="flex:1;min-width:0">
            <b style="color:${RAR_COL[it.r] || '#fff'};cursor:pointer" data-mshow="${row.id}">${esc(row.item_name)}</b>
            <div class="dim small">Người bán: <b style="color:#c8e0ff">${esc(row.seller_name)}</b> · Cấp ${row.item_level}</div>
          </div>
          <div style="text-align:right;flex:none">
            <div>${priceText}</div>
            ${isMine ? `<small class="dim">(Món của bạn)</small>` : `<button class="btn sm" style="margin-top:2px" data-mbuy="${row.id}">Mua</button>`}
          </div>
        </div>
      `;
    }).join("");

    container.innerHTML = filterHtml + `<div style="max-height:55vh;overflow-y:auto;padding-right:4px">${listHtml}</div>`;
  }

  const sel = $("#mktTypeSel");
  if (sel) {
    sel.onchange = e => {
      MKT.typeFilter = +e.target.value;
      marketRenderBrowse(container);
    };
  }
  const refBtn = $("#mktRefresh");
  if (refBtn) refBtn.onclick = () => marketRenderBrowse(container);

  container.querySelectorAll("[data-mshow]").forEach(el => {
    el.onclick = () => {
      const r = MKT.items.find(x => x.id === el.dataset.mshow);
      if (r) itemModal(r.item_data);
    };
  });

  container.querySelectorAll("[data-mbuy]").forEach(btn => {
    btn.onclick = () => marketBuy(btn.dataset.mbuy);
  });
}

async function marketBuy(listingId) {
  const row = MKT.items.find(x => x.id === listingId);
  if (!row) return;

  const cost = +row.price;
  const isKnb = row.price_type === "knb";
  const costStr = isKnb ? `${fmt(cost)} KNB` : `${fmtL(cost * 10000)}`;

  if (isKnb) {
    if ((S.knb || 0) < cost) {
      toast("Không đủ KNB để mua trang bị này!");
      return;
    }
  } else {
    if ((S.gold || 0) < cost * 10000) {
      toast("Không đủ Ngân lượng để mua trang bị này!");
      return;
    }
  }

  if (S.inv.length >= 60) {
    toast("Hành trang đã đầy (tối đa 60 ô). Hãy dọn dẹp trước khi mua!");
    return;
  }

  if (!confirm(`Bạn có chắc muốn mua ${row.item_name} với giá ${costStr}?`)) return;

  try {
    // Cập nhật trạng thái trên Supabase
    const payload = {
      status: "sold",
      buyer_id: NET.user.id,
      buyer_name: S.name || "Đại hiệp",
      updated_at: new Date().toISOString()
    };
    await sbCall(`/market_items?id=eq.${listingId}&status=eq.selling`, {
      method: "PATCH",
      body: payload
    });

    // Trừ tiền và nhận đồ
    if (isKnb) S.knb -= cost;
    else S.gold -= cost * 10000;

    const boughtItem = Object.assign({}, row.item_data, { uid: Date.now() + Math.floor(Math.random() * 1000) });
    S.inv.push(boughtItem);
    invDirty = true;
    R.dirty = true;
    save();
    refresh();

    toast(`Mua thành công ${row.item_name}!`);
    marketRenderModal();
  } catch (err) {
    toast("Mua thất bại: món đồ có thể đã được người khác mua trước.");
    console.error(err);
    marketRenderModal();
  }
}

function marketRenderSell(container) {
  const validItems = S.inv.filter(it => it && !it.lock && !it.bind);
  if (!validItems.length) {
    container.innerHTML = `<div class="card" style="text-align:center;padding:25px"><p class="dim">Không có vật phẩm nào trong hành trang có thể giao dịch (vật phẩm khóa hoặc đang mặc không thể bán).</p></div>`;
    return;
  }

  container.innerHTML = `
    <p class="dim small" style="margin-bottom:8px">Chọn một vật phẩm từ hành trang để rao bán lên Chợ Giang Hồ:</p>
    <div class="invgrid" style="max-height:35vh;overflow-y:auto;margin-bottom:12px">
      ${validItems.map(itemCell).join("")}
    </div>
    <div id="mktSellForm" class="card" style="display:none">
      <div id="mktSellPreview" style="display:flex;gap:10px;align-items:center;margin-bottom:8px"></div>
      <div style="display:flex;gap:10px;align-items:center;margin-bottom:8px">
        <label class="dim small">Loại tiền:</label>
        <select id="mktSellCurr" style="background:#151614;color:#ffe9a8;border:1px solid #7d6a3c;padding:2px 6px">
          <option value="gold">Vạn lượng</option>
          <option value="knb">KNB</option>
        </select>
        <label class="dim small">Giá bán:</label>
        <input type="number" id="mktSellPrice" min="1" max="99999999" placeholder="Nhập giá" style="flex:1;background:#151614;color:#ffe9a8;border:1px solid #7d6a3c;padding:3px 6px">
      </div>
      <div class="btnrow"><button class="btn" id="mktDoSell">Xác nhận đăng bán</button></div>
    </div>
  `;

  let selectedItem = null;
  container.querySelectorAll(".invgrid .it").forEach(cell => {
    cell.onclick = () => {
      container.querySelectorAll(".invgrid .it").forEach(c => c.classList.remove("on"));
      cell.classList.add("on");
      const uid = +cell.dataset.uid;
      selectedItem = validItems.find(x => x.uid === uid);
      if (!selectedItem) return;

      const form = $("#mktSellForm");
      form.style.display = "block";
      $("#mktSellPreview").innerHTML = `
        <div>${itemCell(selectedItem)}</div>
        <div><b style="color:${RAR_COL[selectedItem.r] || '#fff'}">${esc(selectedItem.n)}</b><div class="dim small">Cấp yêu cầu: ${selectedItem.lvl || 1}</div></div>
      `;
    };
  });

  const doSellBtn = $("#mktDoSell");
  if (doSellBtn) {
    doSellBtn.onclick = async () => {
      if (!selectedItem) return;
      const priceVal = Math.floor(+$("#mktSellPrice").value);
      if (!priceVal || priceVal <= 0) {
        toast("Vui lòng nhập giá bán hợp lệ (> 0)");
        return;
      }
      const priceType = $("#mktSellCurr").value;
      const costStr = priceType === "knb" ? `${fmt(priceVal)} KNB` : `${fmt(priceVal)} vạn lượng`;

      if (!confirm(`Bạn có chắc muốn đăng bán ${selectedItem.n} với giá ${costStr}?`)) return;

      try {
        doSellBtn.disabled = true;
        const payload = {
          seller_id: NET.user.id,
          seller_name: S.name || "Đại hiệp",
          item_data: selectedItem,
          item_name: selectedItem.n,
          item_type: selectedItem.d,
          item_level: selectedItem.lvl || 1,
          price_type: priceType,
          price: priceVal,
          status: "selling",
          created_at: new Date().toISOString()
        };

        await sbCall("/market_items", {
          method: "POST",
          body: payload
        });

        // Xóa item khỏi hành trang
        S.inv = S.inv.filter(it => it.uid !== selectedItem.uid);
        invDirty = true;
        R.dirty = true;
        save();
        refresh();

        toast(`Đã đăng bán ${selectedItem.n} lên Chợ!`);
        MKT.tab = "my";
        marketRenderModal();
      } catch (err) {
        toast("Lỗi đăng bán: " + (err.message || err));
        doSellBtn.disabled = false;
      }
    };
  }
}

async function marketRenderMy(container) {
  container.innerHTML = `<p class="dim small">Đang nạp danh sách gian hàng...</p>`;
  await marketFetchMyItems();

  if (!MKT.myItems.length) {
    container.innerHTML = `<div class="card" style="text-align:center;padding:25px"><p class="dim">Bạn chưa đăng bán vật phẩm nào trên Chợ.</p></div>`;
    return;
  }

  const listHtml = MKT.myItems.map(row => {
    const it = row.item_data;
    const priceText = row.price_type === "knb" ? `<b style="color:#ffd24a">${fmt(row.price)} KNB</b>` : `<b style="color:#ffd24a">${fmtL(row.price * 10000)}</b>`;
    let statusLabel = "";
    let actionBtn = "";

    if (row.status === "selling") {
      statusLabel = `<span style="color:#8fc6ff">Đang rao bán</span>`;
      actionBtn = `<button class="btn sm red" data-mcancel="${row.id}">Hủy bán</button>`;
    } else if (row.status === "sold") {
      statusLabel = `<span style="color:#6fd46a">Đã bán thành công cho ${esc(row.buyer_name || 'người chơi')}</span>`;
      actionBtn = `<button class="btn sm on" data-mclaim="${row.id}">Nhận tiền</button>`;
    } else if (row.status === "claimed") {
      statusLabel = `<span class="dim">Đã nhận tiền</span>`;
    } else if (row.status === "cancelled") {
      statusLabel = `<span class="dim">Đã hủy</span>`;
    }

    return `
      <div class="qrow" style="display:flex;align-items:center;gap:8px;padding:6px;border-bottom:1px solid #332d1e">
        <div style="flex:none">${itemCell(it)}</div>
        <div style="flex:1;min-width:0">
          <b style="color:${RAR_COL[it.r] || '#fff'}">${esc(row.item_name)}</b>
          <div>${statusLabel} · ${priceText}</div>
        </div>
        <div style="flex:none">${actionBtn}</div>
      </div>
    `;
  }).join("");

  container.innerHTML = `<div style="max-height:55vh;overflow-y:auto;padding-right:4px">${listHtml}</div>`;

  container.querySelectorAll("[data-mcancel]").forEach(btn => {
    btn.onclick = () => marketCancel(btn.dataset.mcancel);
  });

  container.querySelectorAll("[data-mclaim]").forEach(btn => {
    btn.onclick = () => marketClaim(btn.dataset.mclaim);
  });
}

async function marketCancel(listingId) {
  const row = MKT.myItems.find(x => x.id === listingId);
  if (!row || row.status !== "selling") return;

  if (S.inv.length >= 60) {
    toast("Hành trang đã đầy, không thể lấy lại đồ!");
    return;
  }

  if (!confirm(`Hủy bán món ${row.item_name} và lấy lại vào hành trang?`)) return;

  try {
    await sbCall(`/market_items?id=eq.${listingId}&status=eq.selling`, {
      method: "PATCH",
      body: { status: "cancelled", updated_at: new Date().toISOString() }
    });

    const returnedItem = Object.assign({}, row.item_data, { uid: Date.now() + Math.floor(Math.random() * 1000) });
    S.inv.push(returnedItem);
    invDirty = true;
    R.dirty = true;
    save();
    refresh();

    toast(`Đã rút ${row.item_name} về hành trang!`);
    marketRenderModal();
  } catch (err) {
    toast("Lỗi hủy bán: " + err.message);
  }
}

async function marketClaim(listingId) {
  const row = MKT.myItems.find(x => x.id === listingId);
  if (!row || row.status !== "sold") return;

  try {
    await sbCall(`/market_items?id=eq.${listingId}&status=eq.sold`, {
      method: "PATCH",
      body: { status: "claimed", updated_at: new Date().toISOString() }
    });

    const isKnb = row.price_type === "knb";
    const amt = +row.price;
    if (isKnb) {
      S.knb = (S.knb || 0) + amt;
      toast(`Nhận thành công +${fmt(amt)} KNB từ việc bán ${row.item_name}!`);
    } else {
      S.gold = (S.gold || 0) + amt * 10000;
      toast(`Nhận thành công +${fmtL(amt * 10000)} từ việc bán ${row.item_name}!`);
    }

    save();
    refresh();
    marketRenderModal();
  } catch (err) {
    toast("Lỗi nhận tiền: " + err.message);
  }
}
