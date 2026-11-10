"use strict";
/* Bản đồ lớn: bấm minimap (hoặc Tab) để mở, bấm vào bản đồ để nhân vật tự chạy tới.
   Tham khảo hành vi bản web: minimap mở bản đồ lớn, cuộn/kéo để xem, bấm để đi tới. */
(function () {
  var WRAP = null, CV2 = null, BOX = null, TITLE = null;
  var OPEN = false, ZOOM = 1, FIT = 1, SCALE = 1, TICK = 0, DRAG = null;

  function gid(id) { return document.getElementById(id); }
  function mmRect() {
    var mm = (typeof MINI !== "undefined" && MINI) || { s: 92, m: 8, top: 62 };
    return { x: AR.w - mm.s - mm.m, y: mm.top, w: mm.s, h: mm.s };
  }
  function zoneTitle() {
    try {
      if (R.dg && R.dg.d) return R.dg.d.n;
      if (R.tower) return "Tháp · tầng " + R.tower.floor;
      if (R.town && W.town) return W.town.n;
      return zoneOf(Math.min(S.stage, STAGES)).n;
    } catch (e) { return "Bản đồ"; }
  }

  /* Cho control.js biết cú bấm có rơi vào minimap không. */
  window.bigMapHit = function (x, y) {
    if (!(typeof S === "object" && S && S.fac) || (typeof R === "object" && R && R.town)) return false;
    if (S.miniMap === false) return false;
    var r = mmRect();
    return x >= r.x - 4 && x <= r.x + r.w + 4 && y >= r.y - 4 && y <= r.y + r.h + 4;
  };

  function ensure() {
    if (WRAP) return;
    var st = document.createElement("style");
    st.id = "bmCss";
    st.textContent =
      "#bmWrap{position:fixed;inset:0;z-index:65;display:none;flex-direction:column;background:#000d;font-family:'IBM Plex Mono',monospace;color:#e8dcc8}" +
      "#bmWrap.on{display:flex}" +
      "#bmHead{display:flex;align-items:center;gap:6px;padding:8px 10px;background:#121a10;border-bottom:1px solid #c8a45a}" +
      "#bmHead b{color:#f3d88a;font-size:14px;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
      ".bmbtn{background:#1c2416;border:1px solid #6b5a33;color:#f3d88a;border-radius:5px;padding:5px 10px;font:12px 'IBM Plex Mono',monospace;cursor:pointer}" +
      ".bmbtn:active{background:#2a3520}" +
      "#bmScroll{flex:1;overflow:auto;display:flex;align-items:center;justify-content:center;padding:8px;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}" +
      "#bmCv{display:block;image-rendering:pixelated;touch-action:none;cursor:crosshair;background:#10170e;box-shadow:0 0 0 1px #c8a45a}" +
      "#bmFoot{padding:6px 10px;font-size:11px;color:#b9ac8b;text-align:center;background:#121a10;border-top:1px solid #2a3520}";
    document.head.appendChild(st);

    WRAP = document.createElement("div");
    WRAP.id = "bmWrap";
    WRAP.innerHTML =
      '<div id="bmHead"><b id="bmTitle">Bản đồ</b>' +
      '<button class="bmbtn" id="bmOut" aria-label="Thu nhỏ">−</button>' +
      '<button class="bmbtn" id="bmFit">Vừa khung</button>' +
      '<button class="bmbtn" id="bmIn" aria-label="Phóng to">+</button>' +
      '<button class="bmbtn" id="bmClose" aria-label="Đóng bản đồ">×</button></div>' +
      '<div id="bmScroll"><canvas id="bmCv"></canvas></div>' +
      '<div id="bmFoot">Bấm vào bản đồ để tự chạy tới · Cuộn để phóng to · Kéo để xem</div>';
    document.body.appendChild(WRAP);

    CV2 = gid("bmCv");
    BOX = gid("bmScroll");
    TITLE = gid("bmTitle");
    gid("bmClose").onclick = close;
    gid("bmOut").onclick = function () { setZoom(ZOOM / 1.5); };
    gid("bmIn").onclick = function () { setZoom(ZOOM * 1.5); };
    gid("bmFit").onclick = function () { setZoom(1); };
    WRAP.addEventListener("pointerdown", function (e) { if (e.target === WRAP) close(); });

    CV2.addEventListener("pointerdown", function (e) {
      if (e.button !== 0) return;
      DRAG = { id: e.pointerId, x: e.clientX, y: e.clientY, l: BOX.scrollLeft, t: BOX.scrollTop, m: 0 };
      try { CV2.setPointerCapture(e.pointerId); } catch (_) { }
    });
    CV2.addEventListener("pointermove", function (e) {
      if (!DRAG || DRAG.id !== e.pointerId) return;
      var dx = e.clientX - DRAG.x, dy = e.clientY - DRAG.y;
      if (Math.hypot(dx, dy) > 7) DRAG.m = 1;
      if (DRAG.m) { BOX.scrollLeft = DRAG.l - dx; BOX.scrollTop = DRAG.t - dy; }
    });
    CV2.addEventListener("pointerup", function (e) {
      var d = DRAG; DRAG = null;
      if (!d || d.id !== e.pointerId || d.m) return;
      travel(e);
    });
    CV2.addEventListener("pointercancel", function () { DRAG = null; });
    CV2.addEventListener("wheel", function (e) {
      e.preventDefault();
      setZoom(ZOOM * (e.deltaY < 0 ? 1.25 : 0.8));
    }, { passive: false });
  }

  function travel(e) {
    if (!CV2 || !CV2.width) return;
    var r = CV2.getBoundingClientRect();
    var gx = (e.clientX - r.left) / Math.max(1, r.width) * WORLD.w;
    var gy = (e.clientY - r.top) / Math.max(1, r.height) * WORLD.h;
    var p = inWorld(gx, gy);
    if (typeof manual === "function" && manual()) {
      INPUT.target = { x: p[0], y: p[1] };
      R.goTo = null;
    } else {
      R.goTo = { x: p[0], y: p[1] };
      R.moveTo = null;
      R.pickTarget = null;
    }
    if (typeof toast === "function") toast("Đang tự chạy tới điểm đã chọn");
    close();
  }

  function render() {
    if (!OPEN || !CV2) return;
    var W = WORLD.w, H = WORLD.h;
    var availW = Math.max(240, window.innerWidth - 24);
    var availH = Math.max(240, window.innerHeight - 140);
    FIT = Math.min(availW / W, availH / H);
    var s = FIT * ZOOM;
    SCALE = s;
    var cw = Math.max(1, Math.round(W * s)), ch = Math.max(1, Math.round(H * s));
    if (CV2.width !== cw || CV2.height !== ch) {
      CV2.width = cw; CV2.height = ch;
      CV2.style.width = cw + "px"; CV2.style.height = ch + "px";
    }
    var c = CV2.getContext("2d");
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, cw, ch);
    c.setTransform(s, 0, 0, s, 0, 0);
    c.fillStyle = "#10170e";
    c.fillRect(0, 0, W, H);
    var img = R.bgImg;
    if (img && img.complete && img.naturalWidth) {
      if (OBS.g) c.drawImage(img, 0, 0, W, H);
      else {
        var T = 1536, n = Math.max(1, Math.ceil(W / T));
        for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) {
          c.save();
          c.translate(i * T + (i & 1 ? T : 0), j * T + (j & 1 ? T : 0));
          c.scale(i & 1 ? -1 : 1, j & 1 ? -1 : 1);
          c.drawImage(img, 0, 0, T, T);
          c.restore();
        }
      }
    }
    /* khung nhìn hiện tại */
    c.lineWidth = 1.5 / s;
    c.strokeStyle = "rgba(255,255,255,.7)";
    c.strokeRect(CAM.x, CAM.y, AR.w, AR.h);
    /* đồ dưới đất */
    var lw = 1.2 / s;
    for (var gi = 0; gi < (R.ground || []).length; gi++) {
      var g = R.ground[gi];
      if (typeof lootMatch === "function" && !lootMatch(g.it)) continue;
      c.fillStyle = (typeof RAR_COL !== "undefined" && RAR_COL[g.it.r]) || "#ffd24a";
      c.fillRect(g.x - lw, g.y - lw, lw * 2, lw * 2);
    }
    /* quái */
    for (var ei = 0; ei < (R.enemies || []).length; ei++) {
      var en = R.enemies[ei];
      if (en.dead) continue;
      var rr = (en.cls === "boss" ? 4.5 : en.cls === "elite" ? 3.2 : 2.2) / s;
      c.fillStyle = en.goldBoss ? "#ffd24a" : en.cls === "boss" ? "#ff4a3a" : "#e05a4a";
      c.beginPath(); c.arc(en.x, en.y, rr, 0, 7); c.fill();
    }
    /* nhân vật */
    var f = Math.PI / 2 + (H.dir || 0) * Math.PI / 4, sz = 8 / s;
    c.fillStyle = "#ffe28a";
    c.strokeStyle = "#000";
    c.lineWidth = 2 / s;
    c.beginPath();
    c.moveTo(H.x + Math.cos(f) * sz, H.y + Math.sin(f) * sz);
    c.lineTo(H.x + Math.cos(f + 2.5) * sz * .8, H.y + Math.sin(f + 2.5) * sz * .8);
    c.lineTo(H.x + Math.cos(f - 2.5) * sz * .8, H.y + Math.sin(f - 2.5) * sz * .8);
    c.closePath(); c.fill(); c.stroke();
  }

  function setZoom(z) {
    if (!OPEN) return;
    var maxZ = Math.max(1, Math.min(6, 2400 / Math.max(1, WORLD.w * FIT)));
    var nz = Math.max(1, Math.min(maxZ, z));
    var old = SCALE || FIT;
    var cx = (BOX.scrollLeft + BOX.clientWidth / 2) / old;
    var cy = (BOX.scrollTop + BOX.clientHeight / 2) / old;
    ZOOM = nz;
    render();
    BOX.scrollLeft = Math.max(0, cx * SCALE - BOX.clientWidth / 2);
    BOX.scrollTop = Math.max(0, cy * SCALE - BOX.clientHeight / 2);
  }

  function open() {
    if (!(typeof S === "object" && S && S.fac) || OPEN) return;
    ensure();
    OPEN = true;
    WRAP.classList.add("on");
    ZOOM = 1;
    TITLE.textContent = zoneTitle();
    render();
    setTimeout(function () {
      BOX.scrollLeft = Math.max(0, H.x * SCALE - BOX.clientWidth / 2);
      BOX.scrollTop = Math.max(0, H.y * SCALE - BOX.clientHeight / 2);
    }, 0);
    clearInterval(TICK);
    TICK = setInterval(render, 600);
  }

  function close() {
    if (!WRAP) return;
    OPEN = false;
    WRAP.classList.remove("on");
    clearInterval(TICK);
  }

  window.bigMapOpen = open;
  window.bigMapClose = close;
  window.bigMapToggle = function () { OPEN ? close() : open(); };

  window.addEventListener("resize", function () { if (OPEN) render(); });
  window.addEventListener("keydown", function (e) {
    if (e.key !== "Tab" && e.key !== "Escape") return;
    if (/INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || "")) return;
    if (!(typeof S === "object" && S && S.fac)) return;
    if (e.key === "Escape") { if (OPEN) { e.preventDefault(); close(); } return; }
    e.preventDefault();
    OPEN ? close() : open();
  }, true);
})();
