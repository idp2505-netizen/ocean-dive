/* Галерея: пошук, фільтр за зоною, модальне вікно з деталями, улюблені (localStorage) */
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };

  var state = { zone: "all", q: "" };
  var visible = [];       // поточний відфільтрований список
  var current = -1;       // індекс у visible для модального вікна
  var lastFocus = null;

  /* ----- улюблені ----- */
  var FAV_KEY = "ocean_favs";
  function getFavs() { try { return JSON.parse(localStorage.getItem(FAV_KEY)) || []; } catch (e) { return []; } }
  function setFavs(a) { try { localStorage.setItem(FAV_KEY, JSON.stringify(a)); } catch (e) {} }

  /* ----- заглушка для істот без фото ----- */
  var PLACEHOLDER = '<svg class="ph" viewBox="0 0 120 80" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
    '<path d="M10 40c18-26 52-30 78-8l22-14v44l-22-14c-26 22-60 18-78-8z" opacity=".8"/><circle cx="38" cy="36" r="4" fill="#fff"/></svg>';

  function mediaHTML(c, cls) {
    var f = 0.5 + 0.5 * sizeScale(c, 0.5);   // пропорційно реальному розміру істоти
    return c.image
      ? '<img src="' + c.image + '" alt="' + c.name + '" loading="lazy"' + (cls === "card" ? ' style="max-width:' + (88 * f).toFixed(0) + '%;max-height:' + (84 * f).toFixed(0) + '%"' : "") + ">"
      : PLACEHOLDER + (cls === "card" ? '<span class="ph-note">фото буде додано</span>' : "");
  }

  /* ----- фільтри ----- */
  var chipsBox = $("#chips");
  function buildChips() {
    var items = [["all", "Усі"]].concat(Object.keys(ZONES).map(function (k) { return [k, ZONES[k].name]; })).concat([["fav", "♥ Улюблені"]]);
    items.forEach(function (it) {
      var b = document.createElement("button");
      b.className = "chip"; b.type = "button"; b.dataset.zone = it[0]; b.textContent = it[1];
      b.setAttribute("aria-pressed", it[0] === "all" ? "true" : "false");
      b.addEventListener("click", function () { state.zone = it[0]; syncChips(); render(); });
      chipsBox.appendChild(b);
    });
  }
  function syncChips() {
    [].forEach.call(chipsBox.children, function (b) { b.setAttribute("aria-pressed", b.dataset.zone === state.zone ? "true" : "false"); });
  }

  /* ----- відмальовування карток ----- */
  var grid = $("#grid");
  function render() {
    var q = state.q.trim().toLowerCase();
    var favs = getFavs();
    visible = CREATURES.filter(function (c) {
      return (state.zone === "all" || (state.zone === "fav" ? favs.indexOf(c.id) > -1 : c.zone === state.zone)) &&
        (!q || c.name.toLowerCase().indexOf(q) > -1 || c.latin.toLowerCase().indexOf(q) > -1);
    });
    grid.innerHTML = "";
    visible.forEach(function (c, i) {
      var z = ZONES[c.zone];
      var btn = document.createElement("button");
      btn.type = "button"; btn.className = "card"; btn.style.animationDelay = Math.min(i, 12) * 35 + "ms";
      btn.setAttribute("aria-label", c.name + ", " + z.name);
      btn.innerHTML =
        '<div class="card-img z-' + c.zone + '">' + mediaHTML(c, "card") + (favs.indexOf(c.id) > -1 ? '<span class="card-fav" title="Улюблена">♥</span>' : "") + "</div>" +
        '<div class="card-body"><h3>' + c.name + "</h3><p>" + z.name + " · " + z.from.toLocaleString("uk-UA") + "–" + z.to.toLocaleString("uk-UA") + " м</p></div>";
      btn.addEventListener("click", function () { openModal(i); });
      grid.appendChild(btn);
    });
    $("#count").textContent = "Істот у колекції: " + visible.length + " з " + CREATURES.length + ". Натисніть на картку, щоб дізнатися більше.";
    $("#empty").hidden = visible.length > 0;
  }

  $("#search").addEventListener("input", function (e) { state.q = e.target.value; render(); });

  /* ----- модальне вікно ----- */
  var modal = $("#modal");
  function fillModal(c) {
    var z = ZONES[c.zone];
    $("#mMedia").className = "modal-media z-" + c.zone;
    $("#mMedia").innerHTML = mediaHTML(c, "modal");
    $("#mTag").textContent = z.name + " · " + z.from.toLocaleString("uk-UA") + "–" + z.to.toLocaleString("uk-UA") + " м";
    $("#mTitle").textContent = c.name;
    $("#mLatin").textContent = c.latin;
    $("#mDesc").innerHTML = c.desc.split("\n\n").map(function (p) { return "<p>" + p + "</p>"; }).join("") +
      (c.credit ? '<p class="credit">' + c.credit + "</p>" : "");
    $("#mFacts").innerHTML = c.facts.map(function (f) { return '<div class="fact"><b>' + f[0] + "</b><span>" + f[1] + "</span></div>"; }).join("");
    $("#mFun").innerHTML = "<strong>Цікаво:</strong> " + c.fun;
    $("#mWrite").href = "contact.html?creature=" + encodeURIComponent(c.id);
    var sq = function (v) { return Math.sqrt(v / 11000) * 100; }, fill = $("#mDepth .dbar-fill");
    fill.style.width = "0"; fill.style.left = sq(z.from) + "%";
    requestAnimationFrame(function () { requestAnimationFrame(function () { fill.style.width = Math.max(3, sq(z.to) - sq(z.from)) + "%"; }); });
    syncFav(c);
    $("#modal .modal").scrollTop = 0;
  }
  function syncFav(c) {
    var on = getFavs().indexOf(c.id) > -1, b = $("#mFav");
    b.setAttribute("aria-pressed", on ? "true" : "false");
    b.textContent = on ? "♥ В улюблених" : "♡ Додати в улюблені";
  }
  function openModal(i) {
    if (i < 0 || i >= visible.length) return;
    current = i;
    if (!modal.classList.contains("open")) { lastFocus = document.activeElement; modal.classList.add("open"); document.body.style.overflow = "hidden"; }
    fillModal(visible[i]);
    $("#mClose").focus();
    history.replaceState(null, "", "?open=" + visible[i].id);
  }
  function closeModal() {
    modal.classList.remove("open"); document.body.style.overflow = "";
    history.replaceState(null, "", "gallery.html");
    if (lastFocus) lastFocus.focus();
    render();
  }
  function step(d) { if (visible.length) openModal((current + d + visible.length) % visible.length); }

  $("#mClose").addEventListener("click", closeModal);
  $("#mPrev").addEventListener("click", function () { step(-1); });
  $("#mNext").addEventListener("click", function () { step(1); });
  modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });
  $("#mFav").addEventListener("click", function () {
    var c = visible[current], favs = getFavs(), k = favs.indexOf(c.id);
    if (k > -1) favs.splice(k, 1); else favs.push(c.id);
    setFavs(favs); syncFav(c);
  });
  document.addEventListener("keydown", function (e) {
    if (!modal.classList.contains("open")) return;
    if (e.key === "Escape") closeModal();
    else if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "ArrowRight") step(1);
    else if (e.key === "Tab") { // проста «пастка» фокуса
      var f = modal.querySelectorAll("button, a[href]"), first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ----- 3D-нахил карток і блиск ----- */
  grid.addEventListener("pointermove", function (e) {
    var c = e.target.closest(".card"); if (!c || e.pointerType === "touch") return;
    var r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height, S = c.style;
    S.setProperty("--ry", ((x - .5) * 12).toFixed(1) + "deg"); S.setProperty("--rx", ((.5 - y) * 10).toFixed(1) + "deg");
    S.setProperty("--mx", (x * 100).toFixed(0) + "%"); S.setProperty("--my", (y * 100).toFixed(0) + "%");
    S.setProperty("--ix", ((x - .5) * -14).toFixed(1) + "px"); S.setProperty("--iy", ((y - .5) * -10).toFixed(1) + "px");
  });
  grid.addEventListener("pointerout", function (e) {
    var c = e.target.closest(".card"); if (!c || c.contains(e.relatedTarget)) return;
    ["--rx", "--ry", "--ix", "--iy"].forEach(function (k) { c.style.removeProperty(k); });
  });
  $("#rand").addEventListener("click", function () { if (visible.length) openModal(Math.floor(Math.random() * visible.length)); });

  /* ----- старт ----- */
  buildChips();
  render();
  var want = new URLSearchParams(location.search).get("open");
  if (want) {
    var idx = visible.findIndex(function (c) { return c.id === want; });
    if (idx > -1) openModal(idx);
  }
})();
