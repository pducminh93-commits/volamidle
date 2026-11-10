"use strict";

// Như bản web: chỉ dùng nearest-neighbour khi scale vật lý rơi đúng pixel nguyên.
function gfxSampleBegin(ctx, scale) {
  if (!ctx) return true;
  const previous = ctx.imageSmoothingEnabled;
  const transform = typeof ctx.getTransform === "function" ? ctx.getTransform() : null;
  const axisScale = transform ? Math.hypot(transform.a, transform.b) : (typeof DPR === "number" ? DPR : 1);
  const effective = axisScale * (Number(scale) || 1);
  ctx.imageSmoothingEnabled = Math.abs(effective - Math.round(effective)) > 1e-6;
  return previous;
}

function gfxSampleEnd(ctx, previous) {
  if (ctx) ctx.imageSmoothingEnabled = previous;
}

function gfxSnap(value, scale) {
  return Math.abs((Number(scale) || 1) - 1) < 1e-6 ? Math.round(value) : value;
}

const GFX_FRAME_CACHE = new Map();
const GFX_FRAME_MAX_PIXELS = 2000000;
let GFX_FRAME_PIXELS = 0;

// Cache frame riêng với viền lặp 2 px để bilinear không hút màu từ frame kế bên atlas.
function gfxFrameCanvas(image, sx, sy, sw, sh) {
  if (!image || !image.complete || !image.naturalWidth || sw * sh > 160000) return null;
  const key = `${image.src}|${sx}|${sy}|${sw}|${sh}`;
  let cached = GFX_FRAME_CACHE.get(key);
  if (cached) {
    GFX_FRAME_CACHE.delete(key);
    GFX_FRAME_CACHE.set(key, cached);
    return cached.canvas;
  }
  const pad = 2;
  const canvas = document.createElement("canvas");
  canvas.width = sw + pad * 2;
  canvas.height = sh + pad * 2;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, sx, sy, sw, sh, pad, pad, sw, sh);
  ctx.drawImage(image, sx, sy, sw, 1, pad, 0, sw, pad);
  ctx.drawImage(image, sx, sy + sh - 1, sw, 1, pad, pad + sh, sw, pad);
  ctx.drawImage(image, sx, sy, 1, sh, 0, pad, pad, sh);
  ctx.drawImage(image, sx + sw - 1, sy, 1, sh, pad + sw, pad, pad, sh);
  ctx.drawImage(image, sx, sy, 1, 1, 0, 0, pad, pad);
  ctx.drawImage(image, sx + sw - 1, sy, 1, 1, pad + sw, 0, pad, pad);
  ctx.drawImage(image, sx, sy + sh - 1, 1, 1, 0, pad + sh, pad, pad);
  ctx.drawImage(image, sx + sw - 1, sy + sh - 1, 1, 1, pad + sw, pad + sh, pad, pad);
  const pixels = canvas.width * canvas.height;
  while (GFX_FRAME_CACHE.size && GFX_FRAME_PIXELS + pixels > GFX_FRAME_MAX_PIXELS) {
    const oldest = GFX_FRAME_CACHE.keys().next().value;
    GFX_FRAME_PIXELS -= GFX_FRAME_CACHE.get(oldest).pixels;
    GFX_FRAME_CACHE.delete(oldest);
  }
  GFX_FRAME_CACHE.set(key, { canvas, pixels });
  GFX_FRAME_PIXELS += pixels;
  return canvas;
}

function gfxDrawFrame(ctx, image, sx, sy, sw, sh, dx, dy, dw, dh) {
  const frame = gfxFrameCanvas(image, sx, sy, sw, sh);
  if (frame) ctx.drawImage(frame, 2, 2, sw, sh, dx, dy, dw, dh);
  else ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
}

const GFX_JX_SHADOW_CACHE = new Map();
const GFX_JX_SHADOW_MAX = 24;
let GFX_JX_SHADOW_PASS = false;

function gfxJxLookKey(look) {
  const eq = look && look.eq || {};
  return JSON.stringify([
    look && (look.sex || look.sx), look && look.riding, look && look.rows, look && look.parts,
    eq.helm && eq.helm.uid, eq.armor && eq.armor.uid, eq.weapon && eq.weapon.uid, eq.horse && eq.horse.uid
  ]);
}

function gfxDrawJxShadow(baseDraw, args) {
  if (GFX_JX_SHADOW_PASS || typeof document === "undefined") return;
  if (typeof window !== "undefined" && window.CX && CX !== window.CX) return;
  const look = args[7] || (typeof jxHeroSetup === "function" ? jxHeroSetup() : null);
  if (!look || !look.doll) return;
  const [act, dir, actTime, x, y, scale] = args;
  const key = `${gfxJxLookKey(look)}|${act}|${dir}|${Math.floor((actTime || 0) * 18)}|${scale}`;
  let shadow = GFX_JX_SHADOW_CACHE.get(key);
  if (shadow) {
    GFX_JX_SHADOW_CACHE.delete(key);
    GFX_JX_SHADOW_CACHE.set(key, shadow);
  } else {
    const canvas = document.createElement("canvas");
    canvas.width = 360;
    canvas.height = 320;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    const main = CX;
    let height = 0;
    GFX_JX_SHADOW_PASS = true;
    CX = ctx;
    try { height = baseDraw(act, dir, actTime, 180, 280, scale, 1, look); }
    finally { CX = main; GFX_JX_SHADOW_PASS = false; }
    if (!height) return;
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "source-over";
    shadow = canvas;
    GFX_JX_SHADOW_CACHE.set(key, shadow);
    while (GFX_JX_SHADOW_CACHE.size > GFX_JX_SHADOW_MAX) {
      GFX_JX_SHADOW_CACHE.delete(GFX_JX_SHADOW_CACHE.keys().next().value);
    }
  }
  CX.save();
  CX.globalAlpha = .42;
  CX.translate(x, y);
  CX.transform(1, 0, -.62, .34, 0, 0);
  CX.drawImage(shadow, -180, -280);
  CX.restore();
}

function gfxWrapWorldSprites() {
  const baseDrawAnim = drawAnim;
  drawAnim = function(...args) {
    const scale = args[6] == null ? 1 : args[6];
    args[4] = gfxSnap(args[4], scale);
    args[5] = gfxSnap(args[5], scale);
    const previous = gfxSampleBegin(CX, scale);
    try { return baseDrawAnim.apply(this, args); }
    finally { gfxSampleEnd(CX, previous); }
  };

  const baseDrawSprite = drawSprite;
  drawSprite = function(...args) {
    const scale = args[4] == null ? 1 : args[4];
    args[2] = gfxSnap(args[2], scale);
    args[3] = gfxSnap(args[3], scale);
    const previous = gfxSampleBegin(CX, scale);
    try { return baseDrawSprite.apply(this, args); }
    finally { gfxSampleEnd(CX, previous); }
  };

  const baseDrawFxSprite = drawFxSprite;
  drawFxSprite = function(...args) {
    const meta = args[0] || {};
    const scale = Number.isFinite(meta.k) && meta.k > 0 ? meta.k : FX_SCALE;
    args[3] = gfxSnap(args[3], scale);
    args[4] = gfxSnap(args[4], scale);
    const previous = gfxSampleBegin(CX, scale);
    try { return baseDrawFxSprite.apply(this, args); }
    finally { gfxSampleEnd(CX, previous); }
  };

  const baseDrawHeroAnim = drawHeroAnim;
  drawHeroAnim = function(...args) {
    const scale = args[6] == null ? 1 : args[6];
    args[4] = gfxSnap(args[4], scale);
    args[5] = gfxSnap(args[5], scale);
    const previous = gfxSampleBegin(CX, scale);
    try { return baseDrawHeroAnim.apply(this, args); }
    finally { gfxSampleEnd(CX, previous); }
  };

  const baseDrawJxHero = drawJxHero;
  drawJxHero = function(...args) {
    const scale = args[5] == null ? 1 : args[5];
    args[3] = gfxSnap(args[3], scale);
    args[4] = gfxSnap(args[4], scale);
    const previous = gfxSampleBegin(CX, scale);
    try {
      gfxDrawJxShadow(baseDrawJxHero, args);
      return baseDrawJxHero.apply(this, args);
    }
    finally { gfxSampleEnd(CX, previous); }
  };
  drawJxHero.__gfxBase = baseDrawJxHero;
}

gfxWrapWorldSprites();
