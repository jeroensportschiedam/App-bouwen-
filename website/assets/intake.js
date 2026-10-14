/* Intake aanvragen (CLAUDE.md §10)
   Stap 1: voornaam, achternaam, telefoon en optioneel een doel. Daarmee
           ontstaat altijd een lead, ook als de bezoeker daarna WhatsApp kiest.
   Stap 2: een vrij moment kiezen (di t/m do, 15:00–17:20, blokken van 20 min),
           of WhatsApp met Jeroen of Marcel.
   Stap 3: bevestiging. Een intake heeft nooit een betaalstap.
   Zonder backend (apiBase = null) draait alles in demomodus. */
(function () {
  var C = window.CLUBHOUSE || {};
  var live = typeof C.apiBase === "string";
  var DAYS = C.intakeDays || 14;
  var DN = ["zo", "ma", "di", "wo", "do", "vr", "za"];
  var DAY = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
  var MON = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
  var MN = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
  var GENERIC = "Er ging iets mis bij het versturen. Probeer het over een paar minuten opnieuw.";
  var PHONE = /^(?:(?:\+31|0031|0)6\d{8}|(?:\+|00|0)\d{9,13})$/;

  var $ = function (id) { return document.getElementById(id); };
  var form = $("step1");
  if (!form) return;

  var state = { lead: null, token: null, days: [], dayIdx: 0, chosen: null, busy: false };

  // ---------- backend ----------
  function api(method, path, body) {
    return fetch(C.apiBase + path, {
      method: method,
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) {
          var err = new Error(typeof data.detail === "string" ? data.detail : GENERIC);
          err.status = res.status;
          throw err;
        }
        return data;
      });
    }, function () { throw new Error(GENERIC); });
  }

  function pad(n) { return String(n).padStart(2, "0"); }
  function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":00"; }

  // Demomodus: dezelfde regels als de backend, met een paar momenten als bezet.
  function demoSlots() {
    var out = [], now = new Date();
    for (var i = 0; i < DAYS; i++) {
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      if (d.getDay() < 2 || d.getDay() > 4) continue;
      for (var m = 15 * 60; m <= 17 * 60; m += 20) {
        var s = new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(m / 60), m % 60);
        if (s <= now) continue;
        out.push({ starts_at: iso(s), available: (d.getDate() * 7 + (m / 20) * 3) % 5 !== 0 });
      }
    }
    return Promise.resolve(out);
  }

  function loadSlots() {
    return live ? api("GET", "/intake-slots?days=" + DAYS).then(function (r) { return r.slots; }) : demoSlots();
  }

  // ---------- stappen ----------
  function step(n) {
    ["step1", "step2", "step3"].forEach(function (id, i) { $(id).hidden = i !== n - 1; });
    document.querySelectorAll(".progress span").forEach(function (el, i) { el.classList.toggle("done", i < n); });
    var h = $("step" + n).querySelector("h2");
    if (h) h.focus();
  }

  function showErr(id, msg) { var el = $(id); el.textContent = msg || ""; el.hidden = !msg; }

  function busy(btn, on, label) {
    state.busy = on;
    btn.disabled = on;
    if (on) { btn.dataset.label = btn.textContent; btn.textContent = label || "Even geduld…"; }
    else if (btn.dataset.label) { btn.textContent = btn.dataset.label; }
  }

  // ---------- stap 1 ----------
  function readLead() {
    return {
      first_name: $("vn").value.trim(),
      last_name: $("an").value.trim(),
      phone: $("tel").value.trim(),
      goal: $("doel").value.trim() || null
    };
  }

  function validate(lead) {
    ["vn", "an", "tel"].forEach(function (id) { $(id).removeAttribute("aria-invalid"); });
    if (!lead.first_name) { $("vn").setAttribute("aria-invalid", "true"); $("vn").focus(); return "Vul je voornaam in."; }
    if (!lead.last_name) { $("an").setAttribute("aria-invalid", "true"); $("an").focus(); return "Vul je achternaam in."; }
    if (!PHONE.test(lead.phone.replace(/[\s\-.()]/g, ""))) {
      $("tel").setAttribute("aria-invalid", "true"); $("tel").focus();
      return "Dit telefoonnummer klopt niet. Gebruik bijvoorbeeld 06 12345678.";
    }
    return "";
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (state.busy) return;
    var lead = readLead();
    var problem = validate(lead);
    showErr("err1", problem);
    if (problem) return;

    var btn = $("next");
    busy(btn, true);
    var save = !live ? Promise.resolve({ token: "demo" })
      : state.token ? api("PATCH", "/leads/" + encodeURIComponent(state.token), lead)
      : api("POST", "/leads", lead);
    save.then(function (saved) {
      state.lead = lead;
      state.token = saved.token;
      busy(btn, false);
      openStep2();
    }, function (err) {
      if (err.status === 404) state.token = null;
      busy(btn, false);
      showErr("err1", err.message);
    });
  });

  // ---------- stap 2 ----------
  function openStep2() {
    showErr("err2", "");
    state.chosen = null;
    $("confirm").disabled = true;
    setupWhatsApp();
    step(2);
    refreshSlots();
  }

  function refreshSlots() {
    $("loading").hidden = false;
    $("days").innerHTML = "";
    $("slots").innerHTML = "";
    $("noSlots").hidden = true;
    return loadSlots().then(function (slots) {
      $("loading").hidden = true;
      state.days = groupByDay(slots);
      var free = state.days.findIndex(function (d) { return d.slots.some(function (s) { return s.available; }); });
      $("noSlots").hidden = free !== -1;
      state.dayIdx = Math.max(0, free);
      render();
    }, function (err) {
      $("loading").hidden = true;
      showErr("err2", err.message);
    });
  }

  function groupByDay(slots) {
    var byKey = {}, days = [];
    slots.forEach(function (s) {
      var key = s.starts_at.slice(0, 10);
      if (!byKey[key]) {
        var p = key.split("-");
        byKey[key] = { key: key, date: new Date(+p[0], +p[1] - 1, +p[2]), slots: [] };
        days.push(byKey[key]);
      }
      byKey[key].slots.push({ starts_at: s.starts_at, time: s.starts_at.slice(11, 16), available: s.available });
    });
    return days;
  }

  function render() {
    var daysEl = $("days"), slotsEl = $("slots");
    daysEl.innerHTML = "";
    state.days.forEach(function (d, i) {
      var full = !d.slots.some(function (s) { return s.available; });
      var b = document.createElement("button");
      b.type = "button";
      b.className = "daybtn" + (full ? " full" : "");
      b.setAttribute("aria-pressed", String(i === state.dayIdx));
      b.setAttribute("aria-label", DAY[d.date.getDay()] + " " + d.date.getDate() + " " + MON[d.date.getMonth()] + (full ? ", vol" : ""));
      b.innerHTML = DN[d.date.getDay()] + "<small>" + d.date.getDate() + " " + MN[d.date.getMonth()] + "</small>";
      b.addEventListener("click", function () {
        state.dayIdx = i; state.chosen = null; $("confirm").disabled = true; render();
      });
      daysEl.appendChild(b);
    });

    slotsEl.innerHTML = "";
    var day = state.days[state.dayIdx];
    if (!day) return;
    day.slots.forEach(function (s) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "slot";
      b.textContent = s.time;
      var on = state.chosen && state.chosen.starts_at === s.starts_at;
      b.setAttribute("aria-pressed", String(!!on));
      if (!s.available) { b.disabled = true; b.setAttribute("aria-label", s.time + ", bezet"); }
      b.addEventListener("click", function () {
        state.chosen = { starts_at: s.starts_at, time: s.time, date: day.date };
        $("confirm").disabled = false;
        showErr("err2", "");
        render();
      });
      slotsEl.appendChild(b);
    });
  }

  $("back").addEventListener("click", function () { showErr("err1", ""); step(1); });

  function longDate(d) { return DAY[d.getDay()] + " " + d.getDate() + " " + MON[d.getMonth()]; }
  function endTime(t) { var p = t.split(":"); var m = +p[0] * 60 + +p[1] + 20; return pad(Math.floor(m / 60)) + ":" + pad(m % 60); }

  $("confirm").addEventListener("click", function () {
    if (!state.chosen || state.busy) return;
    var chosen = state.chosen, btn = this;
    busy(btn, true, "Bezig met plannen…");
    var book = live ? api("POST", "/intakes", { lead_token: state.token, starts_at: chosen.starts_at }) : Promise.resolve({});
    book.then(function () {
      busy(btn, false);
      $("doneTitle").textContent = "Top, " + state.lead.first_name + "!";
      $("doneText").textContent = "Je intake staat op " + longDate(chosen.date) + " om " + chosen.time + ". We zien je in de studio, de koffie staat klaar.";
      receipt([
        ["Naam", state.lead.first_name + " " + state.lead.last_name],
        ["Telefoon", state.lead.phone],
        ["Moment", longDate(chosen.date) + ", " + chosen.time + "–" + endTime(chosen.time)],
        ["Met", "Jeroen"],
        ["Kosten", "Gratis"]
      ]);
      sysNote(live ? "" : "In de echte site: lead en intake staan nu in de agenda van Jeroen in de bedrijfsapp. Geen betaling.");
      step(3);
    }, function (err) {
      busy(btn, false);
      btn.disabled = true;
      state.chosen = null;
      showErr("err2", err.message);
      if (err.status === 409 || err.status === 422) refreshSlots().then(function () { showErr("err2", err.message); });
    });
  });

  // ---------- WhatsApp ----------
  function waNumber(who) { return ((C.whatsapp || {})[who] || "").replace(/\D/g, ""); }

  function setupWhatsApp() {
    var any = false;
    document.querySelectorAll("[data-wa]").forEach(function (a) {
      var who = a.dataset.wa, num = waNumber(who);
      if (num) {
        var text = "Hoi " + who + ", ik ben " + state.lead.first_name + " " + state.lead.last_name + ". Ik wil graag een intake plannen.";
        a.href = "https://wa.me/" + num + "?text=" + encodeURIComponent(text);
        a.hidden = false;
        any = true;
      } else {
        a.removeAttribute("href");
        a.setAttribute("role", "button");
        a.tabIndex = 0;
        a.hidden = !C.concept;  // zonder nummer alleen tonen in de conceptversie
        any = any || !!C.concept;
      }
    });
    $("fallback").hidden = !any;
  }

  function onWhatsApp(e) {
    var a = e.target.closest("[data-wa]");
    if (!a) return;
    var hasLink = !!a.getAttribute("href");
    // Een echte link opent WhatsApp zelf (ook met Enter); zonder nummer is het een knop.
    if (e.type === "keydown" && (hasLink || (e.key !== "Enter" && e.key !== " "))) return;
    if (!hasLink) e.preventDefault();
    var who = a.dataset.wa;
    $("doneTitle").textContent = "Dank je, " + state.lead.first_name + "!";
    $("doneText").textContent = "Je gesprek met " + who + " staat open in WhatsApp. We plannen samen een moment.";
    receipt([
      ["Naam", state.lead.first_name + " " + state.lead.last_name],
      ["Telefoon", state.lead.phone],
      ["Contact", "WhatsApp met " + who]
    ]);
    sysNote(hasLink ? "" : "Conceptversie: het WhatsApp-nummer van " + who + " staat nog niet in de instellingen. De lead staat wel al in de bedrijfsapp.");
    step(3);
  }
  $("fallback").addEventListener("click", onWhatsApp);
  $("fallback").addEventListener("keydown", onWhatsApp);

  // ---------- stap 3 ----------
  function receipt(rows) {
    var dl = $("receipt");
    dl.innerHTML = "";
    rows.forEach(function (r) {
      var dt = document.createElement("dt"), dd = document.createElement("dd");
      dt.textContent = r[0]; dd.textContent = r[1];
      dl.appendChild(dt); dl.appendChild(dd);
    });
  }
  function sysNote(text) { $("doneSys").textContent = text; $("doneSys").hidden = !text; }

  $("restart").addEventListener("click", function () { state.chosen = null; step(1); });

  // ---------- start ----------
  if (!live) {
    $("demoNote").hidden = false;
    $("restart").hidden = false;
    // Voorbeeldgegevens, zodat de conceptversie meteen te doorlopen is.
    if (C.concept && !$("vn").value) {
      $("vn").value = "Sanne";
      $("an").value = "de Vries";
      $("tel").value = "06 12345678";
      $("doel").value = "Sterker worden na mijn zwangerschap, en weer een vast sportmoment in de week.";
    }
  }
})();
