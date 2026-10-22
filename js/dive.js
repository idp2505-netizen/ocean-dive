/* ============================================================
   Головна сторінка: імерсивне занурення
   — колір води, віньєтка та глибина залежать від прокрутки
   — риби пливуть із паралаксом (дрібні — «далі», тому повільніші)
   — на ПК: курсор = світло-приманка; лякає мілководних, притягує глибоководних
   — на телефоні: палець = світло, прокрутка тягне риб за собою
   ============================================================ */
(function () {
  "use strict";

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var smooth = function (a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasMouse = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  var bg = $("#bg"), rays = $("#rays"), lure = $("#lure"), vignette = $("#vignette");
  var zoneEls = {};
  $$(".zone").forEach(function (z) { zoneEls[z.dataset.zone] = z; });
  var order = ["epi", "meso", "bathy", "abyss", "hadal"];
  var hero = $("#top"), bottom = $("#bottom");

  var vw = innerWidth, vh = innerHeight;
  var small = vw < 700;
  var pointer = { x: vw / 2, y: vh / 2, tx: vw / 2, ty: vh / 2, a: 0, pa: 0, moved: false, to: 0 };
  var scrollY = 0, smoothY = 0;

  /* ---------- Кольори води за глибиною ---------- */
  function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
  function mix(a, b, t) { return "rgb(" + [0, 1, 2].map(function (i) { return Math.round(lerp(a[i], b[i], t)); }).join(",") + ")"; }
  var stops = [], zTop = {}, zH = {};
  function absTop(el) { return el.getBoundingClientRect().top + window.pageYOffset; }
  function buildStops() {
    var e = zoneEls.epi, m = zoneEls.meso, b = zoneEls.bathy, a = zoneEls.abyss, h = zoneEls.hadal;
    var eT = zTop.epi, mT = zTop.meso, bT = zTop.bathy, aT = zTop.abyss, hT = zTop.hadal;
    var H = zH.epi, MH = zH.meso, BH = zH.bathy;
    stops = [
      [0, "#27b3dd"], [eT + H * 0.55, "#1e93c6"], [mT, "#1a72ad"], [mT + MH * 0.95, "#0a3a6b"],
      [bT + BH * 0.15, "#05142e"], [bT + BH, "#020a18"], [aT + zH.abyss * 0.6, "#0b0818"],
      [hT + zH.hadal * 0.3, "#160818"], [absTop(bottom) + bottom.offsetHeight, "#050106"]
    ].map(function (s) { return [s[0], hex(s[1])]; });
  }
  function colorAt(y) {
    if (y <= stops[0][0]) return mix(stops[0][1], stops[0][1], 0);
    for (var i = 1; i < stops.length; i++) {
      if (y <= stops[i][0]) {
        var t = (y - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]);
        return mix(stops[i - 1][1], stops[i][1], t);
      }
    }
    var l = stops[stops.length - 1][1]; return mix(l, l, 0);
  }

  /* ---------- Глибина ---------- */
  function depthAt(y) {
    var d = 0;
    for (var i = 0; i < order.length; i++) {
      var z = ZONES[order[i]], top = zTop[order[i]], h = zH[order[i]];
      if (y >= top && y < top + h) return lerp(z.from, z.to, (y - top) / h);
      if (y >= top + h) d = z.to;
    }
    return d;
  }
  function zoneNameFor(d) {
    if (d < 5) return "Поверхня";
    for (var i = 0; i < order.length; i++) if (d <= ZONES[order[i]].to) return ZONES[order[i]].name;
    return ZONES.hadal.name;
  }
  var depthNum = $("#depthNum"), depthZone = $("#depthZone"), pressNum = $("#pressNum"),
      hudFill = $("#hudFill"), hudDot = $("#hudDot"), hudBar = $("#hudBar"),
      pillNum = $("#pillNum"), pillZone = $("#pillZone");
  function buildTicks() {
    $$(".hud-tick").forEach(function (t) { t.remove(); });
    var max = document.documentElement.scrollHeight - vh;
    order.forEach(function (k) {
      var t = document.createElement("span"); t.className = "hud-tick";
      t.style.top = clamp(zTop[k] / max, 0, 1) * 100 + "%"; hudBar.appendChild(t);
    });
  }

  /* ---------- Створення істот ---------- */
  var byId = {}; CREATURES.forEach(function (c) { byId[c.id] = c; });
  var swimmers = [];
  /* Розмір = реальна довжина (REAL_LEN у data.js), стиснута степенем.
     dir — напрямок дрейфу при прокрутці вниз (1: ліворуч, -1: праворуч) — підібраний
     так, щоб риба пливла «носом уперед». dark — «проявляється» біля світла. */
  var swimConf = [
    { id: "whale-shark", zone: "epi", top: 0.17, mode: "cross", flip: true, py: -0.12 },
    { id: "manta", zone: "epi", top: 0.47, mode: "follow", left: 0.4, py: 0.05 },
    { id: "mola", zone: "epi", top: 0.7, mode: "drift", left: 0.1, py: 0.12 },
    { id: "blue-marlin", zone: "epi", top: 0.88, mode: "cross", dir: -1, py: -0.08 },

    { id: "macropinna", zone: "meso", top: 0.28, mode: "drift", dir: -1, left: 0.05, py: 0.1 },
    { id: "vampire-squid", zone: "meso", top: 0.31, mode: "drift", left: 0.66, py: 0.1 },
    { id: "oarfish", zone: "meso", top: 0.47, mode: "drift", left: 0.28, py: -0.05 },
    { id: "pelican-eel", zone: "meso", top: 0.62, mode: "drift", left: 0.05, py: 0.08 },
    { id: "viperfish", zone: "meso", top: 0.72, mode: "drift", left: 0.52, py: 0.1 },
    { id: "hatchetfish", zone: "meso", top: 0.85, mode: "drift", left: 0.28, py: 0.12 },

    { id: "anglerfish", zone: "bathy", top: 0.24, mode: "drift", left: 0.55, py: 0.1, dark: true },
    { id: "dumbo-octopus", zone: "bathy", top: 0.31, mode: "drift", left: 0.06, py: 0.12, dark: true },
    { id: "goblin-shark", zone: "bathy", top: 0.38, mode: "drift", dir: -1, left: 0.42, py: 0.08, dark: true },
    { id: "piglet-squid", zone: "bathy", top: 0.46, mode: "drift", dir: -1, left: 0.72, py: 0.1, dark: true },
    { id: "blobfish", zone: "bathy", top: 0.53, mode: "drift", left: 0.08, py: 0.1, dark: true },
    { id: "black-swallower", zone: "bathy", top: 0.61, mode: "drift", dir: -1, left: 0.40, py: 0.1, dark: true },
    { id: "harp-sponge", zone: "bathy", top: 0.69, mode: "drift", left: 0.12, py: 0.06, dark: true },
    { id: "bigfin-squid", zone: "bathy", top: 0.72, mode: "drift", left: 0.68, py: 0.06, dark: true },
    { id: "sea-spider", zone: "bathy", top: 0.88, mode: "drift", left: 0.34, py: 0.1, dark: true },

    { id: "sea-pig", zone: "abyss", top: 0.30, mode: "drift", left: 0.12, py: 0.1, dark: true },
    { id: "tripod-fish", zone: "abyss", top: 0.42, mode: "drift", left: 0.56, py: 0.1, dark: true },
    { id: "faceless-cusk", zone: "abyss", top: 0.55, mode: "drift", left: 0.14, py: 0.08, dark: true },
    { id: "bloody-belly", zone: "abyss", top: 0.68, mode: "drift", left: 0.60, py: 0.1, dark: true },
    { id: "zombie-worm", zone: "abyss", top: 0.82, mode: "drift", left: 0.32, py: 0.1, dark: true },

    { id: "mariana-snailfish", zone: "hadal", top: 0.30, mode: "drift", dir: -1, left: 0.12, py: 0.1, dark: true },
    { id: "giant-amphipod", zone: "hadal", top: 0.45, mode: "drift", left: 0.60, py: 0.1, dark: true },
    { id: "macellicephaloides", zone: "hadal", top: 0.62, mode: "drift", left: 0.34, py: 0.08, dark: true }
  ];
  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return (h % 1000) / 1000; }

  swimConf.forEach(function (cf) {
    var c = byId[cf.id]; if (!c || !c.image) return;
    var a = document.createElement("a");
    a.className = "swimmer"; a.href = "gallery.html?open=" + c.id; a.setAttribute("aria-label", c.name + " — детальніше");
    var h1 = hash(c.id), h2 = hash(c.id + "w");
    a.innerHTML =
      '<span class="bob" style="animation-duration:' + (4.2 + h1 * 3.4).toFixed(2) + "s;animation-delay:-" + (h2 * 6).toFixed(2) + 's">' +
      '<img src="' + c.image + '" alt="' + c.name + '" style="--fx:' + (cf.flip ? -1 : 1) + ";--wag:" + (2.6 + h2 * 2.2).toFixed(2) + "s;animation-delay:-" + (h1 * 4).toFixed(2) + 's"></span>' +
      '<span class="tip">' + c.name + "</span>";
    a.style.top = cf.top * 100 + "%";
    zoneEls[cf.zone].appendChild(a);
    swimmers.push({ el: a, cf: cf, c: c, ss: sizeScale(c, 0.42), ox: 0, oy: 0, hid: false });
  });

  /* Мітки для істот без фото (на майбутнє: нова істота без image з'явиться світною міткою) */
  var bioColors = { epi: "#ffffff", meso: "#7fd8ff", bathy: "#5ff5d0", abyss: "#c79bff", hadal: "#ff8bd6" };
  var baseLit = { epi: 0.9, meso: 0.62, bathy: 0.16, abyss: 0.13, hadal: 0.13 };
  var labels = [];
  order.forEach(function (zk) {
    var list = CREATURES.filter(function (c) { return c.zone === zk && !c.image; });
    var n = list.length;
    list.forEach(function (c, i) {
      var a = document.createElement("a");
      a.className = "biolabel"; a.href = "gallery.html?open=" + c.id;
      a.style.setProperty("--bio", bioColors[zk]);
      a.style.top = (0.3 + 0.6 * (i / Math.max(n, 1)) + hash(c.id) * 0.02) * 100 + "%";
      a.style.left = (i % 2 === 0 ? 5 + hash(c.id + "x") * 14 : 46 + hash(c.id + "y") * 16) + "%";
      a.innerHTML = '<span class="orb"></span><span><b>' + c.name.replace(/ \(.+\)/, "") + "</b><i>" + c.latin + "</i></span>";
      zoneEls[zk].appendChild(a);
      labels.push({ el: a, zone: zk, cx: 0, cy: 0 });
    });
  });

  /* ---------- Летючі риби над водою ---------- */
  var fly = byId["flying-fish"];
  var jumpers = [];
  if (fly && fly.image && !reduce) {
    for (var j = 0; j < 2; j++) {
      var jl = document.createElement("a");
      jl.className = "jumper"; jl.href = "gallery.html?open=flying-fish"; jl.setAttribute("aria-label", "Летюча риба");
      jl.style.opacity = 0;
      jl.innerHTML = '<img src="' + fly.image + '" alt="Летюча риба">';
      hero.appendChild(jl);
      jumpers.push({ el: jl, t0: 0, dur: 2400, x0: 0, L: 0, H: 0, active: false, next: performance.now() + 1200 + j * 1100 });
    }
  }
  function splash(x) {
    var s = document.createElement("span");
    s.className = "splash"; s.style.left = x + "px"; s.style.top = hero.offsetHeight * 0.5 + 4 + "px";
    hero.appendChild(s); setTimeout(function () { s.remove(); }, 1100);
  }
  function launch(J, now) {
    var hh = hero.offsetHeight, surface = hh * 0.5 - 10;
    J.active = true; J.t0 = now; J.dur = 1900 + Math.random() * 900;
    J.x0 = vw * (0.04 + Math.random() * 0.5); J.L = vw * (small ? 0.4 : 0.28) * (1 + Math.random() * 0.5);
    J.H = vh * (0.14 + Math.random() * 0.1); J.y0 = surface;
    J.w = J.el.offsetWidth || 100; J.landed = false;
    splash(J.x0);
  }
  function stepJumpers(now) {
    jumpers.forEach(function (J) {
      if (scrollY > hero.offsetHeight) { J.el.style.opacity = 0; return; }
      if (!J.active) { if (now >= J.next) launch(J, now); return; }
      var u = (now - J.t0) / J.dur;
      if (u >= 1) { J.active = false; J.el.style.opacity = 0; J.next = now + 3000 + Math.random() * 3500; splash(J.x0 + J.L); return; }
      var x = J.x0 + J.L * u, y = J.y0 - 4 * J.H * u * (1 - u);
      var ang = Math.atan2(-4 * J.H * (1 - 2 * u), J.L) * 180 / Math.PI;
      J.el.style.opacity = u < 0.04 || u > 0.96 ? 0 : 1;
      J.el.style.transform = "translate3d(" + x.toFixed(1) + "px," + (y - J.w * 0.3).toFixed(1) + "px,0) rotate(" + ang.toFixed(1) + "deg)";
    });
  }

  /* ---------- Морський сніг та бульбашки ---------- */
  var cv = $("#snow"), ctx = cv.getContext("2d"), parts = [], bubs = [], dpr = 1;
  function sizeCanvas() {
    dpr = Math.min(devicePixelRatio || 1, small ? 1.5 : 2);
    cv.width = vw * dpr; cv.height = vh * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function newBub(rand) {
    return { x: Math.random() * vw, y: rand ? Math.random() * vh : vh + 20, r: 2 + Math.random() * 6, v: 0.4 + Math.random() * 0.9, w: Math.random() * 6.28, ws: 0.6 + Math.random() };
  }
  function initParts() {
    parts = []; var n = Math.round(clamp(vw * vh / (small ? 11000 : 14000), 36, 100));
    for (var i = 0; i < n; i++) parts.push({ x: Math.random() * vw, y: Math.random() * vh, r: 0.5 + Math.random() * 2.2, v: 0.1 + Math.random() * 0.3, d: Math.random() * Math.PI * 2 });
    bubs = []; for (var k = 0; k < (small ? 12 : 24); k++) bubs.push(newBub(true));
  }
  function drawScene(dy, depth, now) {
    ctx.clearRect(0, 0, vw, vh);
    var alpha = depth < 200 ? 0.4 : depth < 1000 ? 0.5 : 0.42;
    ctx.fillStyle = "#fff";
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      p.y += p.v - dy * (0.25 + p.r * 0.22);
      p.x += Math.sin(now / 1800 + p.d) * 0.22;
      if (p.y < -5) { p.y = vh + 5; p.x = Math.random() * vw; }
      if (p.y > vh + 5) { p.y = -5; p.x = Math.random() * vw; }
      if (p.x < -5) p.x = vw + 5; if (p.x > vw + 5) p.x = -5;
      ctx.globalAlpha = alpha * (0.35 + p.r / 3);
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
    }
    /* бульбашки — лише біля поверхні */
    var ba = clamp(1 - depth / 700, 0, 1) * 0.6;
    if (ba > 0.02) {
      ctx.lineWidth = 1;
      for (var b = 0; b < bubs.length; b++) {
        var u = bubs[b];
        u.y -= u.v + dy * (0.3 + u.r * 0.05);
        u.x += Math.sin(now / 900 * u.ws + u.w) * 0.35;
        if (u.y < -20) { var nb = newBub(false); u.x = nb.x; u.y = nb.y; }
        if (u.y > vh + 30) u.y = -20;
        ctx.globalAlpha = ba * (0.5 + u.r / 14);
        ctx.strokeStyle = "#fff"; ctx.beginPath(); ctx.arc(u.x, u.y, u.r, 0, 6.2832); ctx.stroke();
        ctx.globalAlpha = ba * 0.14; ctx.fillStyle = "#fff"; ctx.fill();
        ctx.globalAlpha = ba * 0.7; ctx.beginPath(); ctx.arc(u.x - u.r * 0.35, u.y - u.r * 0.35, u.r * 0.22, 0, 6.2832); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- Курсор / дотик ---------- */
  addEventListener("mousemove", function (e) {
    pointer.tx = e.clientX; pointer.ty = e.clientY;
    if (!pointer.moved) { pointer.x = pointer.tx; pointer.y = pointer.ty; }
    pointer.moved = true; pointer.pa = 1;
  }, { passive: true });
  document.addEventListener("mouseleave", function () { pointer.pa = 0; });
  function touchPoint(e) {
    var t = e.touches && e.touches[0]; if (!t) return;
    pointer.tx = t.clientX; pointer.ty = t.clientY;
    if (!pointer.moved || pointer.a < 0.05) { pointer.x = pointer.tx; pointer.y = pointer.ty; }
    pointer.moved = true; pointer.pa = 1; clearTimeout(pointer.to);
  }
  addEventListener("touchstart", touchPoint, { passive: true });
  addEventListener("touchmove", touchPoint, { passive: true });
  addEventListener("touchend", function () { clearTimeout(pointer.to); pointer.to = setTimeout(function () { pointer.pa = 0; }, 800); }, { passive: true });

  /* ---------- Розкладка ---------- */
  function layout() {
    vw = innerWidth; vh = innerHeight; scrollY = window.pageYOffset; small = vw < 700;
    order.forEach(function (k) { zTop[k] = absTop(zoneEls[k]); zH[k] = zoneEls[k].offsetHeight; });
    sizeCanvas(); initParts(); buildStops(); buildTicks();
    var base = small ? vw * 0.78 : Math.min(vw * 0.6, 720), floor = small ? 62 : 80, pw = small ? 0.36 : 0.42;
    swimmers.forEach(function (s) {
      var im = s.el.querySelector("img"), ar = (im.naturalHeight / im.naturalWidth) || 0.5;
      var L = Math.max(floor, base * sizeScale(s.c, pw));
      s.w = ar > 1 ? L / ar : L; s.el.style.width = s.w + "px";
      s.left = s.cf.mode === "cross" ? 0 : clamp((s.cf.left || 0) * vw, 8, Math.max(8, vw - s.w - 26));
      s.el.style.left = s.left + "px";
      s.h = s.el.offsetHeight;
      s.anchor = zTop[s.cf.zone] + zH[s.cf.zone] * s.cf.top + s.h / 2;
      s.k = 0.1 + 0.35 * (1 - s.ss);
      s.ox = s.oy = 0;
    });
    labels.forEach(function (l) {
      var r = l.el.getBoundingClientRect();
      l.cx = r.left + 12; l.cy = r.top + r.height / 2 + scrollY;
    });
  }
  var rt;
  addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () { if (Math.abs(innerWidth - vw) > 2 || Math.abs(innerHeight - vh) > 140) layout(); }, 150);
  });
  addEventListener("load", layout);

  /* Заголовки зон з'являються при наближенні */
  var intros = $$(".zone-intro");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.2 });
    intros.forEach(function (el) { el.classList.add("rv"); io.observe(el); });
  }

  /* ---------- Головний цикл ---------- */
  var last = { depth: -1, col: "", zone: "" };
  function frame(now) {
    scrollY = window.pageYOffset;
    var dy = scrollY - (frame.prev === undefined ? scrollY : frame.prev); frame.prev = scrollY;
    smoothY = reduce ? scrollY : lerp(smoothY, scrollY, 0.1);
    var lagBase = scrollY - smoothY;

    pointer.a = lerp(pointer.a, pointer.pa, 0.1);
    var pk = hasMouse ? 0.14 : 0.3;
    pointer.x = lerp(pointer.x, pointer.tx, pk); pointer.y = lerp(pointer.y, pointer.ty, pk);

    var mid = scrollY + vh / 2;
    var depth = depthAt(mid);
    var col = colorAt(mid);
    if (col !== last.col) { last.col = col; bg.style.background = col; document.body.style.background = col; }
    rays.style.opacity = clamp(1 - depth / 380, 0, 1).toFixed(3);
    vignette.style.opacity = clamp((depth - 300) / 2400, 0, 0.85).toFixed(3);

    /* HUD */
    var dr = Math.round(depth);
    if (dr !== last.depth) {
      last.depth = dr;
      var ds = dr.toLocaleString("uk-UA");
      depthNum.textContent = ds; pillNum.textContent = ds;
      pressNum.textContent = Math.round(depth / 10 + 1).toLocaleString("uk-UA");
      var zn = zoneNameFor(depth);
      if (zn !== last.zone) { last.zone = zn; depthZone.textContent = zn; pillZone.textContent = zn; }
    }
    var max = document.documentElement.scrollHeight - vh, pr = max > 0 ? clamp(scrollY / max, 0, 1) : 0;
    hudFill.style.height = pr * 100 + "%"; hudDot.style.top = pr * 100 + "%";

    /* Риби */
    var px = pointer.x, py = pointer.y, pa = pointer.a;
    for (var i = 0; i < swimmers.length; i++) {
      var s = swimmers[i], cf = s.cf, el = s.el;
      var cy0 = s.anchor - scrollY;                           // центр на екрані без зсувів
      if (Math.abs(cy0 - vh / 2) > vh * 1.15 + s.h / 2 + 200) {  // далеко за екраном
        if (!s.hid) { el.style.visibility = "hidden"; s.hid = true; }
        continue;
      }
      if (s.hid) { el.style.visibility = ""; s.hid = false; }

      var t = (mid - s.anchor) / vh, x = 0, rot = 0, extraY = 0;
      if (cf.mode === "cross") {
        var pc = clamp((t + 1.15) / 2.3, 0, 1);
        x = cf.dir === -1 ? vw - (vw + s.w * 1.3) * pc : -s.w + (vw + s.w * 1.3) * pc;
        rot = Math.sin(now / 2400) * 1.2;
      } else if (cf.mode === "follow") {
        if (hasMouse) {
          var fdx = px - vw / 2, fdy = py - vh / 2, fa = pa;
          x = fdx * 0.16 * fa + t * vw * 0.05; extraY = fdy * 0.1 * fa;
          rot = clamp(fdx / vw * 14, -9, 9) * fa - clamp(fdy / vh * 8, -5, 5) * fa;
        } else {                                                   // без курсора — плаває сама
          x = Math.sin(now / 2600) * vw * 0.06 + t * vw * 0.05;
          extraY = Math.cos(now / 3100) * vh * 0.025; rot = Math.cos(now / 2600) * 5;
        }
      } else {
        x = -t * vw * 0.09 * (cf.dir || 1); rot = Math.sin(now / 2000 + s.anchor) * 3;
      }
      var y = t * vh * cf.py + extraY + (reduce ? 0 : clamp(lagBase * s.k, -160, 160));

      /* Взаємодія зі світлом / курсором: мілководні тікають, глибоководні пливуть до світла */
      var cx = s.left + x + s.w / 2, cy = cy0 + y;
      var tx = 0, ty = 0, dd = 0;
      if (pa > 0.03 && cf.mode === "drift") {
        var ddx = cx - px, ddy = cy - py; dd = Math.hypot(ddx, ddy) || 1;
        var f = clamp(1 - dd / (small ? 190 : 240), 0, 1); f *= f;
        var sgn = cf.dark ? -1 : 1, amp = (cf.dark ? 26 : 58) * pa;
        tx = ddx / dd * f * sgn * amp; ty = ddy / dd * f * sgn * amp;
      }
      s.ox = lerp(s.ox, tx, 0.07); s.oy = lerp(s.oy, ty, 0.07);

      /* поява при наближенні до екрану */
      var e = 1 - smooth(0.52, 0.95, Math.abs(cy0 - vh / 2) / vh);
      var sc = 0.9 + 0.1 * e;
      el.style.transform = "translate3d(" + (x + s.ox).toFixed(1) + "px," + (y + s.oy).toFixed(1) + "px,0) rotate(" + rot.toFixed(2) + "deg) scale(" + sc.toFixed(3) + ")";

      var op = e;
      if (cf.dark) {
        var base = hasMouse ? 0.1 : 0.5;
        var dist = Math.hypot(cx - px, cy - py);
        var kk = pa * clamp(1 - Math.max(0, dist - s.w * 0.3) / (small ? 260 : 330), 0, 1);
        op = (base + (1 - base) * kk) * e;
      }
      el.style.opacity = op.toFixed(3);
    }

    /* Світло-приманка */
    lure.style.opacity = (clamp((depth - 650) / 600, 0, 1) * pa).toFixed(3);
    lure.style.transform = "translate3d(" + px.toFixed(1) + "px," + py.toFixed(1) + "px,0)";

    /* Мітки (якщо є істоти без фото) */
    for (var m = 0; m < labels.length; m++) {
      var l = labels[m], lcy = l.cy - scrollY;
      if (lcy < -120 || lcy > vh + 120) continue;
      var lb = hasMouse ? baseLit[l.zone] : Math.max(baseLit[l.zone], 0.6);
      var lk = clamp(1 - Math.hypot(l.cx - px, lcy - py) / 250, 0, 1) * pa;
      l.el.style.setProperty("--lit", (lb + (1 - lb) * lk).toFixed(3));
    }

    stepJumpers(now);
    drawScene(reduce ? 0 : dy, depth, now);
    requestAnimationFrame(frame);
  }

  layout();
  smoothY = scrollY;
  requestAnimationFrame(frame);
})();
