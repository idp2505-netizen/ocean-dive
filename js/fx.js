/* Внутрішні сторінки: промені світла, бульбашки, святкове сплюхування після відправки форми */
(function () {
  "use strict";
  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var pb = document.createElement("div"); pb.id = "pbeams"; pb.setAttribute("aria-hidden", "true");
  for (var i = 0; i < 5; i++) {
    var b = document.createElement("i"); b.className = "beam";
    b.style.cssText = "left:" + (i * 22 - 4) + "%;width:" + rnd(60, 130) + "px;--r:" + rnd(-12, 6) + "deg;animation-duration:" + rnd(8, 14) + "s;animation-delay:-" + rnd(0, 9) + "s";
    pb.appendChild(b);
  }
  document.body.insertBefore(pb, document.body.firstChild);
  if (!reduce) {
    var cv = document.createElement("canvas"); cv.id = "pfx"; document.body.insertBefore(cv, document.body.firstChild);
    var ctx = cv.getContext("2d"), vw, vh, bubs = [];
    var size = function () { vw = innerWidth; vh = innerHeight; cv.width = vw; cv.height = vh; };
    size(); addEventListener("resize", size);
    for (var k = 0; k < 28; k++) bubs.push({ x: rnd(0, vw), y: rnd(0, vh), r: rnd(1.5, 6), v: rnd(.25, .8), w: rnd(0, 6) });
    (function loop(now) {
      ctx.clearRect(0, 0, vw, vh);
      bubs.forEach(function (u) {
        u.y -= u.v; u.x += Math.sin(now / 1200 + u.w) * .3;
        if (u.y < -10) { u.y = vh + 10; u.x = rnd(0, vw); }
        ctx.globalAlpha = .22 + u.r / 20; ctx.strokeStyle = "#bfeaff"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(u.x, u.y, u.r, 0, 6.2832); ctx.stroke();
      });
      requestAnimationFrame(loop);
    })(0);
  }
  window.oceanBurst = function () {
    if (reduce) return;
    for (var n = 0; n < 34; n++) {
      var s = document.createElement("span"), d = rnd(8, 34);
      s.className = "fxb"; s.style.cssText = "left:" + rnd(3, 97) + "vw;width:" + d + "px;height:" + d + "px;--dx:" + rnd(-60, 60) + "px;animation-duration:" + rnd(2.6, 5) + "s;animation-delay:" + rnd(0, 1.2) + "s";
      document.body.appendChild(s); setTimeout(function (e) { e.remove(); }, 7000, s);
    }
    var w = document.createElement("span"); w.className = "fxw"; w.textContent = "🐋"; w.setAttribute("aria-hidden", "true");
    document.body.appendChild(w); setTimeout(function () { w.remove(); }, 7200);
  };
})();
