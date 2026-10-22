/* Головна v2: небо (сонце, хмари, птахи), підводне світло, медузи й планктон, дно океану */
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var smooth = function (a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  var hero = $("#top"), sky = $(".sky"), vw = innerWidth, vh = innerHeight;

  /* ---------- Небо ---------- */
  sky.querySelector(".sun").innerHTML = '<i class="sr"></i><i class="sr s2"></i>';
  [].forEach.call(sky.querySelectorAll(".cloud"), function (c) { c.remove(); });
  [[.07, 230, .95, 110, .05], [.2, 150, .75, 150, .09], [.32, 280, .6, 190, .13], [.12, 120, .8, 135, .08], [.26, 200, .9, 100, .06], [.4, 140, .5, 210, .15]]
    .forEach(function (c, i) {
      var el = document.createElement("div"); el.className = "cl";
      el.style.cssText = "top:" + c[0] * 100 + "%;width:" + c[1] + "px;--o:" + c[2] + ";--p:" + c[4] + ";animation-duration:" + c[3] + "s;animation-delay:-" + (i * 23 % c[3]) + "s";
      sky.appendChild(el);
    });
  for (var b = 0; b < 3; b++) {
    var bd = document.createElement("div"); bd.className = "bird";
    bd.style.cssText = "top:" + (18 + b * 9) + "%;animation-duration:" + (26 + b * 7) + "s;animation-delay:-" + (b * 11) + "s;width:" + (26 + b * 6) + "px";
    bd.innerHTML = '<svg viewBox="0 0 40 16"><path d="M2 12 Q10 0 20 10 Q30 0 38 12" fill="none" stroke="#2b4a66" stroke-width="2.2" stroke-linecap="round"/></svg>';
    sky.appendChild(bd);
  }
  var gl = document.createElement("div"); gl.className = "glitter"; hero.appendChild(gl);
  var sv = hero.querySelector(".waves");
  sv.insertAdjacentHTML("beforeend", '<path class="w3" d="M-60 62 Q 40 38 140 62 T 340 62 T 540 62 T 740 62 T 940 62 T 1140 62 T 1340 62" fill="none" stroke="#fff" stroke-width="1.5"/>');

  /* ---------- Промені та каустика ---------- */
  var rays2 = document.createElement("div"); rays2.id = "rays2";
  for (var r = 0; r < 7; r++) {
    var bm = document.createElement("i"); bm.className = "beam";
    bm.style.cssText = "left:" + (r * 15 - 4) + "%;width:" + rnd(50, 120) + "px;--r:" + rnd(-14, 6) + "deg;animation-duration:" + rnd(7, 13) + "s;animation-delay:-" + rnd(0, 9) + "s";
    rays2.appendChild(bm);
  }
  var caus = document.createElement("div"); caus.id = "caus";
  document.body.insertBefore(caus, $("#rays")); document.body.insertBefore(rays2, $("#rays"));

  /* ---------- Дно ---------- */
  var worms = "";
  [[760, 330], [790, 335], [815, 330], [885, 332], [915, 336], [945, 330], [120, 322], [150, 326], [180, 320], [330, 318], [360, 322]].forEach(function (w, i) {
    var h = rnd(34, 78), lean = rnd(-8, 8);
    worms += '<g class="tw" style="animation-delay:-' + (i * .7).toFixed(1) + 's"><path d="M' + w[0] + " " + w[1] + " q" + lean + " -" + h / 2 + " " + lean * 1.4 + " -" + h + '" stroke="#e8e0ee" stroke-width="4.5" stroke-linecap="round" fill="none"/>' +
      '<circle cx="' + (w[0] + lean * 1.4) + '" cy="' + (w[1] - h) + '" r="4.5" fill="#ff4a5e"/></g>';
  });
  var smk = "";
  for (var s = 0; s < 5; s++) smk += '<circle class="smoke" cx="' + (850 + rnd(-6, 6)) + '" cy="250" r="16" fill="#4a2a44" opacity=".5" style="animation-delay:-' + s + 's"/>';
  var orbs = "";
  for (var o = 0; o < 9; o++) orbs += '<circle class="orb2" cx="' + rnd(40, 1160) + '" cy="' + rnd(290, 380) + '" r="' + rnd(2, 4.5) + '" fill="#8ffff0" style="animation-delay:-' + (o * .6).toFixed(1) + 's"/>';
  var sb = document.createElement("div"); sb.className = "seabed"; sb.setAttribute("aria-hidden", "true");
  sb.innerHTML = '<svg viewBox="0 0 1200 400" preserveAspectRatio="xMidYMax slice"><defs>' +
    '<radialGradient id="vg"><stop offset="0" stop-color="#ff9a4d" stop-opacity=".85"/><stop offset="1" stop-color="#ff4d2d" stop-opacity="0"/></radialGradient>' +
    '<linearGradient id="fl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d0b1f"/><stop offset="1" stop-color="#050106"/></linearGradient></defs>' +
    '<path d="M0 250 C150 205 270 262 410 228 S660 190 810 240 S1060 215 1200 245 V400H0Z" fill="#0b0410"/>' +
    '<circle class="vglow" cx="850" cy="260" r="120" fill="url(#vg)"/>' +
    '<path d="M818 335 L832 255 Q850 245 868 255 L882 335Z" fill="#1d0b1c"/><ellipse cx="850" cy="254" rx="19" ry="5" fill="#ff8a4a" opacity=".9"/>' + smk +
    '<path d="M0 318 C200 288 300 330 500 308 S800 282 1000 316 S1150 300 1200 310 V400H0Z" fill="url(#fl)"/>' + worms + orbs + "</svg>";
  $("#bottom").appendChild(sb);

  /* ---------- Полотно: планктон, медузи, бульбашки від кліків ---------- */
  var cv = document.createElement("canvas"); cv.id = "glow"; document.body.appendChild(cv);
  var ctx = cv.getContext("2d"), dpr = 1, mx = -999, my = -999, bubs = [], plank = [], jelly = [];
  function size() {
    vw = innerWidth; vh = innerHeight; dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = vw * dpr; cv.height = vh * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  size(); addEventListener("resize", size);
  for (var i = 0; i < (vw < 700 ? 45 : 90); i++) plank.push({ x: rnd(0, vw), y: rnd(0, vh), r: rnd(.8, 2.6), ph: rnd(0, 6.28), sp: rnd(.2, .7) });
  for (var j = 0; j < (vw < 700 ? 3 : 5); j++) jelly.push({ x: rnd(.05, .95), y: rnd(0, 1), w: rnd(22, 46), ph: rnd(0, 6.28), v: rnd(.15, .4), h: rnd(170, 200) });
  addEventListener("mousemove", function (e) { mx = e.clientX; my = e.clientY; }, { passive: true });
  addEventListener("pointerdown", function (e) {
    for (var k = 0; k < 9; k++) bubs.push({ x: e.clientX + rnd(-10, 10), y: e.clientY + rnd(-6, 6), r: rnd(2, 7), v: rnd(.8, 2.2), w: rnd(0, 6), life: 1 });
  }, { passive: true });

  function jellyfish(J, now, a, hue) {
    var x = J.x * vw + Math.sin(now / 2400 + J.ph) * 26, y = J.y * (vh + 240) - 120;
    var pulse = Math.sin(now / 700 + J.ph), w = J.w * (1 + .1 * pulse), h = J.w * .78 * (1 - .14 * pulse);
    var g = ctx.createRadialGradient(x, y, 2, x, y, w * 1.2);
    g.addColorStop(0, "hsla(" + hue + ",95%,75%," + (.5 * a) + ")"); g.addColorStop(1, "hsla(" + hue + ",95%,60%,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, w, h, 0, Math.PI, 0); ctx.quadraticCurveTo(x, y + h * .35, x - w, y); ctx.fill();
    ctx.strokeStyle = "hsla(" + hue + ",95%,80%," + (.55 * a) + ")"; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.ellipse(x, y, w, h, 0, Math.PI, 0); ctx.stroke();
    ctx.strokeStyle = "hsla(" + hue + ",95%,75%," + (.35 * a) + ")";
    for (var t = 0; t < 6; t++) {
      var tx = x - w * .8 + t * (w * 1.6 / 5);
      ctx.beginPath(); ctx.moveTo(tx, y);
      ctx.bezierCurveTo(tx + Math.sin(now / 500 + t + J.ph) * 8, y + J.h * .3, tx - Math.sin(now / 600 + t) * 10, y + J.h * .6, tx + Math.sin(now / 700 + t * 2) * 12, y + J.h * (.8 + (t % 2) * .2));
      ctx.stroke();
    }
  }

  var prev = window.pageYOffset;
  function loop(now) {
    var sy = window.pageYOffset, dy = sy - prev; prev = sy;
    var max = Math.max(1, document.documentElement.scrollHeight - vh), p = sy / max;
    if (sy < vh * 1.4) hero.style.setProperty("--sy", sy);
    var shallow = clamp(1 - sy / (vh * 3.4), 0, 1);
    rays2.style.opacity = shallow.toFixed(3); caus.style.opacity = (shallow * .9).toFixed(3);

    ctx.clearRect(0, 0, vw, vh);
    var hue = 175 + smooth(.3, .85, p) * 130;                        // від бірюзового до рожевого
    var pa = smooth(.1, .32, p), ja = smooth(.1, .26, p) * (1 - smooth(.62, .84, p));
    if (!reduce) {
      if (pa > .01) plank.forEach(function (q) {
        q.y -= q.sp * .35 + dy * .35; q.x += Math.sin(now / 2000 + q.ph) * .3;
        if (q.y < -6) { q.y = vh + 6; q.x = rnd(0, vw); } if (q.y > vh + 6) q.y = -6;
        var d = Math.hypot(q.x - mx, q.y - my), boost = d < 170 ? 1 - d / 170 : 0;
        if (boost) { q.x += (mx - q.x) * .02 * boost; q.y += (my - q.y) * .02 * boost; }
        var a = pa * (.25 + .5 * Math.abs(Math.sin(now / 900 + q.ph)) + boost * .5);
        ctx.fillStyle = "hsla(" + hue + ",95%,72%," + clamp(a, 0, 1).toFixed(2) + ")";
        ctx.shadowColor = "hsla(" + hue + ",95%,65%,.9)"; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(q.x, q.y, q.r + boost * 1.5, 0, 6.2832); ctx.fill();
      });
      ctx.shadowBlur = 0;
      if (ja > .01) jelly.forEach(function (J) {
        J.y -= J.v / vh * .5 + dy * .0004; if (J.y < -.2) { J.y = 1.15; J.x = rnd(.05, .95); } if (J.y > 1.2) J.y = -.15;
        jellyfish(J, now, ja, hue - 15);
      });
    }
    for (var k = bubs.length - 1; k >= 0; k--) {
      var u = bubs[k]; u.y -= u.v; u.x += Math.sin(now / 200 + u.w) * .5; u.life -= .008;
      if (u.life <= 0) { bubs.splice(k, 1); continue; }
      ctx.globalAlpha = u.life; ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(u.x, u.y, u.r, 0, 6.2832); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
