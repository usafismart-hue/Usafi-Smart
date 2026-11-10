/* ==========================================================================
   USAFI SMART — Homepage script
   Renders the service cards.

   PHASE 1 NOTE: this list is STATIC and has NO prices on purpose.
   Prices are controlled by the platform. In Phase 7 this array will be
   replaced by services loaded from Firebase (services/ and pricing/),
   managed from the Admin Dashboard.
   ========================================================================== */
(function () {
  "use strict";

  var SERVICES = [
    { id: "home",         icon: "🏠", name: "Usafi wa Nyumbani",       desc: "Usafi wa kawaida wa vyumba, jiko, bafu na sakafu." },
    { id: "office",       icon: "🏢", name: "Usafi wa Ofisi",          desc: "Mazingira safi na ya kitaalamu kwa timu yako." },
    { id: "deep",         icon: "✨", name: "Usafi wa Kina",           desc: "Usafi wa kina wa kila kona, unaofaa kwa kuhamia au msimu." },
    { id: "sofa",         icon: "🛋️", name: "Usafi wa Makochi",        desc: "Ondoa madoa na harufu kwenye makochi yako." },
    { id: "carpet",       icon: "🧼", name: "Usafi wa Mazulia",        desc: "Mazulia yanarudi kuwa safi na yenye mwonekano mpya." },
    { id: "construction", icon: "🧱", name: "Usafi Baada ya Ujenzi",   desc: "Ondoa vumbi na mabaki ya ujenzi kabla ya kuhamia." }
  ];

  var grid = document.getElementById("services-grid");
  if (!grid) return;

  // Build with DOM methods (no innerHTML) so data can never inject markup.
  var frag = document.createDocumentFragment();

  SERVICES.forEach(function (s) {
    var card = document.createElement("article");
    card.className = "card service-card";

    var icon = document.createElement("div");
    icon.className = "service-card__icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = s.icon;

    var title = document.createElement("h3");
    title.textContent = s.name;

    var desc = document.createElement("p");
    desc.textContent = s.desc;

    var link = document.createElement("a");
    link.className = "service-card__link";
    link.href = "customer/booking.html?service=" + encodeURIComponent(s.id);
    link.textContent = "Agiza huduma hii →";
    link.setAttribute("aria-label", "Agiza " + s.name);

    card.appendChild(icon);
    card.appendChild(title);
    card.appendChild(desc);
    card.appendChild(link);
    frag.appendChild(card);
  });

  grid.replaceChildren(frag);
})();
