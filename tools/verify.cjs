"use strict";

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const steps = [
  ["Kiểm tra đầu vào build", "tools/check_build_inputs.cjs"],
  ["Đóng gói game", "build_obfuscate.js"],
  ["Kiểm tra atlas animation", "checks/check_anim.cjs"],
  ["Kiểm tra thứ tự khởi tạo", "checks/check_tdz.cjs"],
  ["Kiểm tra hiệu ứng", "checks/check_fx.cjs"],
  ["Kiểm tra bản đồ", "checks/check_maps.js"],
  ["Test vòng sáng", "test_aura_all.cjs"],
  ["Test runtime aura đội", "test_aura_team_runtime.cjs"],
  ["Test mặc đồ tốt", "tests/test_bestdress.cjs"],
  ["Test ưu tiên boss", "test_boss_priority.cjs"],
  ["Test Hồ Lô", "test_holo.cjs"],
  ["Test chất lượng đồ họa", "test_graphics_quality.cjs"],
  ["Test ngựa", "test_ngua.cjs"],
  ["Test triệu hồi đệ tử", "test_roster_summon.cjs"],
  ["Test combat/stats", "tests/test_combat_stats.cjs"],
  ["Test EXP", "test_xp.cjs"]
];

for (const [label, script] of steps) {
  const scriptPath = path.join(root, script);
  if (!fs.existsSync(scriptPath)) {
    console.warn(`\n[BO QUA] ${label}: không tìm thấy ${script}`);
    continue;
  }
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(process.execPath, [script], { cwd: root, stdio: "inherit" });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status || 1);
}

console.log("\n=== TẤT CẢ KIỂM TRA ĐÃ ĐẠT ===");
