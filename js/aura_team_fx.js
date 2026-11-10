"use strict";

// Mọi thành viên nhận cùng danh sách aura đội. Giữ FX gốc của bản thân và chỉ thêm
// mỗi file/vị trí một lần để hai nguồn cùng kỹ năng không làm hiệu ứng dày lên.
const auraTeamHeroStatesBase = heroStates;
heroStates = function() {
  const base = auraTeamHeroStatesBase();
  if (S.lookFx === false || typeof teamAuras !== "function") return base;
  const out = base.slice();
  const seen = new Set(out.map(meta => `${meta.pos || "body"}|${meta.f}`));
  for (const aura of teamAuras()) {
    const meta = JXST[aura.id];
    if (!meta || !meta.f) continue;
    const key = `${meta.pos || "body"}|${meta.f}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(meta);
  }
  return out;
};
