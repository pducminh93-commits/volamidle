"use strict";

const bossPriorityOption = TGT_PRI.find(option => option[0] === "hk");
if (bossPriorityOption) bossPriorityOption[1] = "Boss trên bản đồ";

function bossPriorityMount() {
  if (typeof u20TtTab !== "undefined" && u20TtTab !== "basic") return;
  const select = typeof $ === "function" ? $("#tPri") : null;
  const body = typeof $ === "function" ? $("#u2ttBody") : null;
  if (!select || !body || $("#tBossMap")) return;
  const row = document.createElement("label");
  row.id = "tBossMapRow";
  row.innerHTML = `<input type="checkbox" id="tBossMap" ${S.bossFirst || tgtPri() === "hk" ? "checked" : ""}> Ưu tiên đánh boss trên toàn bản đồ`;
  row.title = "Khi boss xuất hiện, bỏ mục tiêu thường và tự chạy đến đúng vị trí boss để đánh";
  select.closest("label").insertAdjacentElement("afterend", row);
  const resetTarget = () => {
    R.tgt = null;
    R.moveTo = null;
    if (R.tgtBan && typeof R.tgtBan.clear === "function") R.tgtBan.clear();
  };
  $("#tBossMap").onchange = event => {
    const enabled = event.target.checked;
    S.bossFirst = enabled;
    S.tgtPri = enabled ? "hk" : "near";
    select.value = S.tgtPri;
    resetTarget();
    save();
    toast(enabled ? "Ưu tiên boss: sẽ tự chạy tới boss trên bản đồ" : "Đã trở lại ưu tiên mục tiêu gần nhất");
  };
  const selectChange = select.onchange;
  select.onchange = event => {
    if (typeof selectChange === "function") selectChange.call(select, event);
    $("#tBossMap").checked = tgtPri() === "hk";
    resetTarget();
  };
}

const bossPriorityRenderTtBase = renderTt;
renderTt = function(...args) {
  const result = bossPriorityRenderTtBase.apply(this, args);
  bossPriorityMount();
  return result;
};
