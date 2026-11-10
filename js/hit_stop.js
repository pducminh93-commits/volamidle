"use strict";

/* HIT-STOP
 * Đóng băng mô phỏng vài chục ms ngay khi đòn đánh gây sát thương để tăng cảm giác va chạm.
 *
 * Tham số:
 *   S.hitStopMs  — số ms đóng băng (0 = tắt). Không đặt thì dùng HIT_STOP_DEFAULT_MS.
 *   HIT_STOP_GAP — khoảng nghỉ tối thiểu giữa hai lần kích hoạt (giây) để bãi đông
 *                  không bị bóp nghẹt DPS.
 *
 * Mốc freeze dùng thời gian thực (performance.now) thay vì dt mô phỏng: nếu trừ theo dt
 * thì nhiều tick trong cùng một frame sẽ "ăn" hết hit-stop và người chơi không cảm nhận được.
 *
 * Được nạp cuối tier3 nên bọc được heroHit/tick đã qua các lớp fx_tracking, hit_collision.
 */
const HIT_STOP_DEFAULT_MS = 30;
const HIT_STOP_MAX_MS = 60;
const HIT_STOP_GAP = 0.2;

function hitStopNow() {
  return typeof performance !== "undefined" && performance && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

function hitStopMs() {
  const value = typeof S !== "undefined" && S ? S.hitStopMs : undefined;
  if (value === 0 || value === "0" || value === false) return 0;
  const ms = Number(value);
  return Number.isFinite(ms) && ms > 0 ? Math.min(HIT_STOP_MAX_MS, ms) : HIT_STOP_DEFAULT_MS;
}

function hitStopTrigger() {
  const ms = hitStopMs();
  if (!(ms > 0)) return;
  const now = hitStopNow();
  if (now < (R.hitStopCdUntil || 0)) return;
  R.hitStopCdUntil = now + HIT_STOP_GAP * 1000;
  R.hitStopUntil = Math.max(R.hitStopUntil || 0, now + ms);
}

(() => {
  const baseHeroHit = heroHit;
  heroHit = function () {
    const damage = baseHeroHit.apply(this, arguments);
    if (damage > 0) hitStopTrigger();
    return damage;
  };

  const baseTick = tick;
  tick = function (dt) {
    if (hitStopNow() < (R.hitStopUntil || 0)) return;
    return baseTick.apply(this, arguments);
  };
})();
