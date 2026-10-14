/* Instellingen van de website. Dit is het enige bestand dat je hoeft aan te
   passen om live te gaan; zie README.md, "Live zetten". */
window.CLUBHOUSE = {
  // true: toont de conceptbalk, open punten (O4, O7, O10, O12 ...) en de
  // bijschriften bij foto's die nog moeten komen. Zet op false bij livegang.
  concept: true,

  // Adres van de backend voor het intakeformulier.
  //   null  = demomodus: formulier werkt, maar verstuurt niets
  //   "https://api.voorbeeld.nl" = echte backend (zonder / aan het eind)
  apiBase: null,

  // WhatsApp-nummers voor "Geen moment dat past?", internationaal zonder +
  // of spaties, bijvoorbeeld "31612345678". Leeg = knop opent nog niets.
  whatsapp: { Jeroen: "", Marcel: "" },

  // Hoeveel dagen vooruit het intakeformulier momenten toont.
  intakeDays: 14
};

if (window.CLUBHOUSE.concept) document.documentElement.setAttribute("data-concept", "");
