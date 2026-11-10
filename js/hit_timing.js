"use strict";

function heroAnimationImpactDelay(attack) {
  const rate = Math.max(0.001, Number(attack && attack.rate) || 1);
  const period = 1 / rate;
  const key = H.animKey || (heroGfx() && heroGfx().anim);
  const look = typeof jxHeroSetup === "function" ? jxHeroSetup() : null;
  const body = look && look.parts && look.parts.body;
  const sprite = body && typeof jxLoadSprite === "function"
    ? jxLoadSprite(look.sex, "body", body)
    : null;
  const action = look && look.acts && look.acts[2];
  const meta = sprite && sprite.meta && sprite.meta.a && sprite.meta.a[action];
  const doll = typeof JX_DOLL !== "undefined" && JX_DOLL && JX_DOLL.dur
    ? JX_DOLL.dur[look && look.sex ? "lady" : "man"]
    : null;
  const frames = doll && doll.at
    ? doll.at / ((JX_DOLL.dur && JX_DOLL.dur.fps) || 18)
    : meta && typeof jxActionFrameInterval === "function"
      ? meta.n * jxActionFrameInterval(meta, "at")
      : key && typeof animLen === "function"
        ? animLen(key, "at")
        : 0;
  const duration = Math.min(period, Math.max(0.25, frames || period));

  return clamp(duration * 0.5, 0.08, 1.5);
}

heroImpactDelay = function (attack, target) {
  const attackId = attack && attack.id;
  const fx = typeof JFX !== "undefined" && JFX.f && JFX.f[attackId];
  const skillId = fx && (fx.c || JFX.s[attackId]);
  const skill = skillId && JFX.m && JFX.m[skillId];
  let group = JFX.g && JFX.g[attackId];
  let form = group ? group[0] : fx && fx.form !== undefined ? fx.form : 1;

  if (group && group[0] === 12) {
    const child = SK[attackId] && SK[attackId].child;
    const childGroup = child && JFX.g && JFX.g[child];
    const childFx = child && JFX.f && JFX.f[child];
    if (childGroup && childGroup[0] === 12 && childFx && childFx.c) {
      group = childGroup;
      form = group[0];
    }
  }

  let missileId = skillId;
  let missile = skill;
  const specialFire = attackId === 148;
  if (specialFire) {
    missileId = 82;
    missile = JFX.m[missileId];
    form = 1;
  }

  const key = missile && (typeof jmK === "function" ? jmK(missileId) : null);
  const kind = key ? key[0] : missile && missile.fly ? 1 : 0;
  const movingKind = [1, 2, 5, 7, 8, 100].includes(kind);
  const fromHero = form === 1 || form === 2 || form === 7
    || ((form === 0 || form === 8) && kind !== 0);
  const projectile = missile && movingKind && fromHero
    && !(attack && attack.melee && !(fx && fx.meleeFly));

  if (projectile) {
    const level = Math.max(1, Number(attack.L) || 1);
    const skillData = SK[attackId];
    const speedAttr = !window.NO_JMOV && skillData
      ? skVal(skillData, "missle_speed_v", level)
      : null;
    let speed = specialFire
      ? (speedAttr && speedAttr[0]) || 20
      : (speedAttr && speedAttr[0]) || (key && key[2]) || Math.round((missile.spd || 360) / 18);

    if (specialFire || [1, 2, 5, 7, 8, 100].includes(kind)) speed *= 1.2;

    const startY = form === 7 ? H.y : H.y - 20;
    const distance = Math.hypot(target.x - H.x, (target.y - 14 - startY) * 2);
    const collisionRadius = 10 + ((key && key[9]) || 1) * 14;
    const groupCount = Math.max(1, Number(attack.nMis) || (group && group[6]) || (fx && fx.num) || 1);
    const launchFrames = typeof jmGenTime === "function" && group
      ? Math.max(0, jmGenTime(group, 0, groupCount))
      : 0;
    const flightFrames = Math.ceil(Math.max(0, distance - collisionRadius) / Math.max(1, speed));
    const simulationSpeed = typeof SIM_SPEED === "number" && SIM_SPEED > 0 ? SIM_SPEED : 1;

    return (launchFrames + flightFrames) * simulationSpeed / 18;
  }

  return heroAnimationImpactDelay(attack);
};
