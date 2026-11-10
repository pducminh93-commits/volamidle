"use strict";

(() => {
  const originalSkillFx = skillFx;
  const originalStepFx = stepFx;
  const originalDrawFx = drawFx;
  const originalHeroHit = heroHit;
  const originalDraw = draw;
  const originalGroundShadow = drawGroundShadow;
  const originalAnimShadow = drawAnimShadow;
  const originalProjectedShadow = drawProjectedAnimShadow;

  function updateTrackedEndpoint(fx) {
    if (!fx.target) return;
    fx.x2 = fx.target.x + fx.targetDx;
    fx.y2 = fx.target.y - 14 + fx.targetDy;
  }

  skillFx = function (source, target, skill) {
    const firstNewFx = R.fx.length;
    originalSkillFx(source, target, skill);
    if (!target || !Number.isFinite(target.x) || !Number.isFinite(target.y)) return;

    const meta = skill && skill.id && JFX.f && JFX.f[skill.id];
    if (meta && meta.form === 3) return;
    let hasImpactFx = false;

    for (let i = firstNewFx; i < R.fx.length; i++) {
      const fx = R.fx[i];
      if (fx.k === "boom" && Math.hypot(fx.x - target.x, fx.y - (target.y - 14)) < Math.max(36, (target.r || 12) * 2)) {
        hasImpactFx = true;
      }
      if (fx.k !== "mis" || fx.target) continue;

      fx.target = target;
      fx.targetDx = fx.x2 - target.x;
      fx.targetDy = fx.y2 - (target.y - 14);
      hasImpactFx = true;

      const speed = fx.s && fx.s.spd;
      if (speed > 0) {
        const distance = Math.hypot(fx.x2 - fx.x1, (fx.y2 - fx.y1) * 2);
        const simSpeed = Math.max(0.01, SIM_SPEED);
        fx.life = Math.min(1.5, Math.max(0.08, distance / speed)) / simSpeed;
      }
    }

    if (hasImpactFx) {
      const distance = Math.hypot(target.x - H.x, (target.y - H.y) * 2);
      const fxData = meta && JFX.m && JFX.m[meta.c || JFX.s[skill.id]];
      const speed = fxData && fxData.fly && fxData.fly.spd;
      const impactDelay = speed > 0 ? clamp(distance / speed, 0.08, 1.5) : 0.24;
      target._skillContactUntil = (R.activeT || 0) + impactDelay + 0.3;
    }
  };

  stepFx = function (fx, dt) {
    updateTrackedEndpoint(fx);
    return originalStepFx(fx, dt);
  };

  drawFx = function (fx) {
    updateTrackedEndpoint(fx);
    return originalDrawFx(fx);
  };

  heroHit = function (attack, target) {
    const x = target.x;
    const y = target.y - Math.max(14, (target.r || 20) * 0.6);
    const damage = originalHeroHit(attack, target);
    if (damage > 0 && (R.activeT || 0) >= (target._skillContactUntil || 0) && !S.lowFx && R.fx.length <= FX_MAX - 3) {
      const color = "rgba(255,240,168,.72)";
      const life = 0.1;
      R.fx.push({ k: "hit", x, y, r: 15, color, life, max: life });
      for (let i = 0; i < 2; i++) {
        const angle = i * Math.PI / 2 + Math.PI / 4;
        const inner = 7;
        const outer = 11;
        R.fx.push({
          k: "line",
          x1: x + Math.cos(angle) * inner,
          y1: y + Math.sin(angle) * inner,
          x2: x + Math.cos(angle) * outer,
          y2: y + Math.sin(angle) * outer,
          color,
          life,
          max: life
        });
      }
    }
    return damage;
  };

  drawGroundShadow = function (ctx, x, y, rx, ry, alpha = 0.34) {
    originalGroundShadow(ctx, x, y, rx, ry, rx > 20 ? Math.min(1, alpha * 1.18) : alpha);
    if (rx <= 20) return;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,.22)";
    ctx.beginPath();
    ctx.ellipse(x, y, rx * 0.66, ry * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  drawAnimShadow = function (anim, action, dir, time, x, y, scale, alpha) {
    return originalAnimShadow(anim, action, dir, time, x, y, scale, Math.min(0.82, alpha * 1.18));
  };

  drawProjectedAnimShadow = function (anim, action, dir, time, x, y, scale, alpha) {
    return originalProjectedShadow(anim, action, dir, time, x, y, scale, Math.min(0.42, alpha * 1.35));
  };

  draw = function (dt) {
    originalDraw(dt);
    const target = R.tgt;
    if (!target || target.dead || target.hp <= 0) return;
    const x = target.x - CAM.x;
    const y = target.y - CAM.y;
    if (y < 0 || y > AR.h) return;

    CX.save();
    CX.lineCap = "round";
    CX.beginPath();
    const radius = target.r || 12;
    CX.ellipse(x, y, Math.max(15, radius * 1.3), Math.max(6, radius * 0.5), 0, 0, Math.PI * 2);
    CX.strokeStyle = "rgba(0,0,0,.82)";
    CX.lineWidth = 5;
    CX.stroke();
    CX.strokeStyle = "#ffe28a";
    CX.lineWidth = 2.5;
    CX.stroke();
    CX.restore();
  };
})();
