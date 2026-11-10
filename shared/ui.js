/* ==========================================================================
   USAFI SMART — Shared UI behaviour (no Firebase here)
   - Responsive navigation toggle
   - Header shadow on scroll
   - Footer year
   ========================================================================== */
(function () {
  "use strict";

  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".nav__toggle");
  var menu = document.getElementById("nav-menu");

  /* ---- Mobile menu ---- */
  function setMenu(open) {
    if (!toggle || !menu) return;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Funga menyu" : "Fungua menyu");
    menu.classList.toggle("is-open", open);
  }

  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      setMenu(toggle.getAttribute("aria-expanded") !== "true");
    });

    // Close after choosing a link
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });

    // Close with Escape
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        setMenu(false);
        toggle.focus();
      }
    });

    // Close when tapping outside the header
    document.addEventListener("click", function (e) {
      if (header && !header.contains(e.target)) setMenu(false);
    });

    // Reset when the layout switches to desktop
    window.matchMedia("(min-width: 900px)").addEventListener("change", function (mq) {
      if (mq.matches) setMenu(false);
    });
  }

  /* ---- Header shadow on scroll ---- */
  function onScroll() {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 4);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---- Footer year ---- */
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
