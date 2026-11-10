"use strict";

(() => {
  const originalHeroAttack = heroAttack;
  const originalScheduleHeroHit = scheduleHeroHit;
  const originalResolveHeroHits = resolveHeroHits;
  const originalSkillFx = skillFx;
  const originalJmStep = jmStep;

  function nextBatch() {
    R.heroHitBatchSeq = (R.heroHitBatchSeq || 0) + 1;
    return R.heroHitBatchSeq;
  }

  function resolveProjectileHits(missile) {
    const hits = missile.damageHits || [];
    missile.damageHits = [];
    for (const hit of hits) {
      const index = R.pendingHits.indexOf(hit);
      if (index >= 0) R.pendingHits.splice(index, 1);
      const target = hit.target;
      if (target && R.enemies.includes(target) && !target.dead && target.hp > 0) {
        recHit(heroHit(hit.attack, target), hit.attack);
      }
    }
  }

  function cancelProjectileHits(missile) {
    for (const hit of missile.damageHits || []) {
      const index = R.pendingHits.indexOf(hit);
      if (index >= 0) R.pendingHits.splice(index, 1);
    }
    missile.damageHits = [];
  }

  function segmentDistance(x1, y1, x2, y2, x, y) {
    const dx = x2 - x1;
    const dy = (y2 - y1) * 2;
    const lengthSq = dx * dx + dy * dy;
    const t = lengthSq
      ? clamp(((x - x1) * dx + ((y - y1) * 2) * dy) / lengthSq, 0, 1)
      : 1;
    return Math.hypot(x1 + dx * t - x, (y1 + (y2 - y1) * t - y) * 2);
  }

  heroAttack = function () {
    const previousBatch = R.heroHitBatch;
    R.heroHitBatch = nextBatch();
    try {
      return originalHeroAttack.apply(this, arguments);
    } finally {
      R.heroHitBatch = previousBatch;
    }
  };

  scheduleHeroHit = function (attack, target, batch) {
    const first = R.pendingHits.length;
    originalScheduleHeroHit.apply(this, arguments);
    const id = batch || R.heroHitBatch || nextBatch();
    for (let i = first; i < R.pendingHits.length; i++) {
      R.pendingHits[i].batch = id;
    }
  };

  skillFx = function (source, target, skill, batch) {
    const firstFx = R.fx.length;
    const result = originalSkillFx.apply(this, arguments);
    const hitBatch = batch || R.heroHitBatch;
    if (!hitBatch || !skill) return result;

    const pending = R.pendingHits.filter(hit =>
      hit.batch === hitBatch && hit.attack === skill && !hit.projectile
    );
    if (!pending.length) return result;

    const missiles = R.fx.slice(firstFx).filter(fx =>
      fx.k === "jm" && fx.kind && fx.tgt && fx.tgt === target
    );
    const missile = missiles[0];
    if (!missile) return result;

    missile.damageHits = (missile.damageHits || []).concat(pending);
    for (const hit of pending) hit.projectile = true;
    return result;
  };

  resolveHeroHits = function (dt) {
    const waiting = R.pendingHits.filter(hit => hit.projectile);
    if (!waiting.length) return originalResolveHeroHits(dt);
    R.pendingHits = R.pendingHits.filter(hit => !hit.projectile);
    try {
      originalResolveHeroHits(dt);
    } finally {
      R.pendingHits.push(...waiting.filter(hit => hit.projectile));
    }
  };

  jmStep = function (missile, dt) {
    const wasHit = missile.hit;
    const startX = missile._dx ?? missile.x;
    const startY = missile._dy ?? missile.y;
    const alive = originalJmStep(missile, dt);

    if (missile.damageHits && missile.damageHits.length) {
      const target = missile.tgt;
      if (!wasHit && !missile.hit && target && missile.kind
        && !(missile.za && missile.z > 20)
        && segmentDistance(startX, startY, missile._dx ?? missile.x, missile._dy ?? missile.y, target.x, target.y - 14) < missile.cr) {
        missile.hit = true;
        jmBoom(missile, target.x, target.y - 14);
      }

      if (!wasHit && missile.hit) resolveProjectileHits(missile);
      else if (!alive && !missile.hit) cancelProjectileHits(missile);
    }

    return alive && !(missile.cv && missile.hit);
  };
})();
