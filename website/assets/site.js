/* Menu op telefoon en de reviewknoppen. */
(function () {
  var btn = document.getElementById("menuBtn");
  var menu = document.getElementById("menu");
  if (btn && menu) {
    btn.addEventListener("click", function () {
      var open = menu.hidden;
      menu.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
      btn.textContent = open ? "Sluiten" : "Menu";
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !menu.hidden) { menu.hidden = true; btn.setAttribute("aria-expanded", "false"); btn.textContent = "Menu"; btn.focus(); }
    });
  }

  var reviews = document.getElementById("reviews");
  if (reviews) {
    var step = function () { var card = reviews.querySelector(".review"); return card ? card.getBoundingClientRect().width + 16 : 340; };
    document.getElementById("rPrev").addEventListener("click", function () { reviews.scrollBy({ left: -step(), behavior: "smooth" }); });
    document.getElementById("rNext").addEventListener("click", function () { reviews.scrollBy({ left: step(), behavior: "smooth" }); });
  }
})();
