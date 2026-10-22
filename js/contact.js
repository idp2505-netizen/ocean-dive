/* Форма зворотного зв'язку: валідація, збереження у localStorage, виведення «бази» відгуків */
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var KEY = "ocean_feedback";
  var byId = {}; CREATURES.forEach(function (c) { byId[c.id] = c; });

  /* ----- список улюблених істот та оцінка ----- */
  var fav = $("#fav");
  Object.keys(ZONES).forEach(function (zk) {
    var g = document.createElement("optgroup"); g.label = ZONES[zk].name;
    CREATURES.filter(function (c) { return c.zone === zk; }).forEach(function (c) {
      var o = document.createElement("option"); o.value = c.id; o.textContent = c.name; g.appendChild(o);
    });
    fav.appendChild(g);
  });
  var rating = $("#rating");
  for (var i = 1; i <= 5; i++) {
    rating.insertAdjacentHTML("beforeend",
      '<input type="radio" name="rating" id="r' + i + '" value="' + i + '"><label for="r' + i + '" aria-label="Оцінка ' + i + '">' + i + "</label>");
  }

  /* ----- параметри з посилання: contact.html?creature=id ----- */
  var pre = new URLSearchParams(location.search).get("creature");
  if (pre && byId[pre]) { fav.value = pre; $("#topic").value = "Пропозиція нової істоти"; }

  /* ----- сховище ----- */
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function save(a) { try { localStorage.setItem(KEY, JSON.stringify(a)); return true; } catch (e) { return false; } }
  function all() { return FEEDBACK_SEED.concat(load()); }

  /* ----- валідація ----- */
  var msg = $("#message"), cnt = $("#cnt");
  msg.addEventListener("input", function () { cnt.textContent = msg.value.length; });
  function setErr(name, text) {
    var f = document.querySelector('[data-f="' + name + '"]'), e = $("#err-" + name);
    if (!f || !e) return;
    f.classList.toggle("invalid", !!text); e.textContent = text || "";
  }
  function validate() {
    var ok = true, v = {
      name: $("#name").value.trim(), email: $("#email").value.trim(), topic: $("#topic").value, message: msg.value.trim()
    };
    var checks = [
      ["name", v.name.length < 2, "Вкажіть ім’я (мінімум 2 символи)."],
      ["email", !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email), "Введіть коректну електронну пошту."],
      ["topic", !v.topic, "Оберіть тему."],
      ["message", v.message.length < 10, "Напишіть щонайменше 10 символів."]
    ];
    checks.forEach(function (c) { setErr(c[0], c[1] ? c[2] : ""); if (c[1]) ok = false; });
    return ok;
  }
  ["name", "email", "topic", "message"].forEach(function (id) {
    $("#" + id).addEventListener("input", function () { setErr(id, ""); });
  });

  /* ----- відправка ----- */
  var thanks = $("#thanks");
  $("#form").addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validate()) { var bad = document.querySelector(".field.invalid input, .field.invalid select, .field.invalid textarea"); if (bad) bad.focus(); return; }
    var r = document.querySelector('input[name="rating"]:checked');
    var entry = {
      id: "u" + Date.now(), seed: false,
      name: $("#name").value.trim(), topic: $("#topic").value, fav: fav.value || "",
      rating: r ? +r.value : 0, message: msg.value.trim(),
      date: new Date().toISOString().slice(0, 10)
    };
    var list = load(); list.push(entry);
    var saved = save(list);
    $("#thText").textContent = saved ? "Ваше повідомлення збережено й з’явилось у списку відгуків нижче." : "Не вдалося зберегти у браузері, але відгук додано до списку на цій сторінці.";
    if (!saved) FEEDBACK_SEED.push(entry);
    thanks.classList.add("open");
    if (window.oceanBurst) window.oceanBurst();
    $("#form").reset(); cnt.textContent = "0";
    renderReviews();
  });
  function closeThanks() { thanks.classList.remove("open"); }
  $("#thClose").addEventListener("click", closeThanks);
  thanks.addEventListener("click", function (e) { if (e.target === thanks) closeThanks(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeThanks(); });

  $("#clear").addEventListener("click", function () {
    if (!load().length) return;
    if (confirm("Видалити всі ваші відгуки з цього браузера?")) { save([]); renderReviews(); }
  });

  /* ----- виведення даних ----- */
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function renderReviews() {
    var data = all().slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var rated = data.filter(function (d) { return d.rating > 0; });
    var avg = rated.length ? (rated.reduce(function (s, d) { return s + d.rating; }, 0) / rated.length).toFixed(1) : "—";
    var counts = {};
    data.forEach(function (d) { if (d.fav) counts[d.fav] = (counts[d.fav] || 0) + 1; });
    var top = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; })[0];
    $("#stats").innerHTML =
      '<div class="stat"><b>' + data.length + "</b><span>відгуків</span></div>" +
      '<div class="stat"><b>' + avg + "</b><span>середня оцінка</span></div>" +
      '<div class="stat"><b>' + (top ? byId[top].name.replace(/ \(.+\)/, "") : "—") + "</b><span>улюблена істота відвідувачів</span></div>";
    $("#reviews").innerHTML = data.map(function (d) {
      var stars = d.rating ? "★".repeat(d.rating) + "☆".repeat(5 - d.rating) : "";
      var f = d.fav && byId[d.fav] ? " · улюблена: " + byId[d.fav].name.replace(/ \(.+\)/, "") : "";
      return '<article class="review"><header><strong>' + esc(d.name) + (d.seed ? "" : '<span class="badge">ваш</span>') +
        '</strong><span class="stars" aria-label="Оцінка ' + d.rating + ' з 5">' + stars + "</span></header>" +
        '<div class="meta">' + esc(d.topic) + f + " · " + d.date + "</div><p>" + esc(d.message) + "</p></article>";
    }).join("");
    [].forEach.call(document.querySelectorAll(".review"), function (el, i) { el.style.animationDelay = Math.min(i, 10) * 60 + "ms"; });
    $("#clear").hidden = !load().length;
  }
  renderReviews();
})();
