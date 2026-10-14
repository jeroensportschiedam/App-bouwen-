# Website The Clubhouse

De nieuwe website van The Clubhouse (Schiedam). Vervangt de one.com-site op
jeroen-sport.nl (CLAUDE.md §10). Vijf pagina's met de teksten uit het document
Websiteteksten (3 okt 2026) en de huisstijl uit CLAUDE.md §13.

| Pagina | Bestand |
| --- | --- |
| Home | `index.html` |
| Hoe het werkt | `hoe-het-werkt.html` |
| Prijzen | `prijzen.html` |
| Over ons | `over-ons.html` |
| Intake aanvragen | `intake.html` |

Gewone HTML, CSS en JavaScript. Geen buildstap en geen pakketten om bij te
houden: de map kan zo naar elke webhosting, ook naar one.com.

## Bekijken

- **Snel:** open `index.html` in je browser. Het intakeformulier draait dan in
  demomodus en verstuurt niets.
- **Met de echte intakeflow:** start de backend (zie `backend/README.md`) en
  open <http://localhost:8000/site/>. Het formulier maakt dan echt een lead en
  een intake aan in de database.

## Instellingen

Alles staat in `assets/config.js`:

| Instelling | Betekenis |
| --- | --- |
| `concept` | `true` toont de conceptbalk, de open punten (O4, O7, O10, O12 …), de bijschriften bij foto's die nog moeten komen en de concept-reviews. |
| `apiBase` | `null` = demomodus. Adres van de backend = echte leads en intakes. |
| `whatsapp` | Nummers van Jeroen en Marcel voor "Geen moment dat past?", internationaal zonder `+` (bijv. `31612345678`). |
| `intakeDays` | Hoeveel dagen vooruit het formulier intakemomenten toont (nu 14). |

## Intake aanvragen

Volgens CLAUDE.md §10:

1. **Wie ben je?** Voornaam, achternaam, telefoon en optioneel "Wat wil je
   bereiken?". Hier ontstaat altijd een `Lead`, ook als de bezoeker daarna
   WhatsApp kiest. Gaat de bezoeker terug en past iets aan, dan wordt dezelfde
   lead bijgewerkt.
2. **Kies een moment.** Dinsdag t/m donderdag, starts 15:00 tot en met 17:00,
   blokken van 20 minuten (21 per week). Bezette momenten zijn doorgestreept.
   Past er niets: WhatsApp met Jeroen of Marcel.
3. **Bevestiging.** De intake staat in de agenda van Jeroen. Nooit een betaling.

De regels zelf staan in de backend (`backend/app/leadflow.py`), met tests in
`backend/tests/test_leadflow.py`.

### API die de website gebruikt

| Methode | Pad | Doel |
| --- | --- | --- |
| `POST` | `/leads` | Lead aanmaken. Geeft een `token` terug. |
| `PATCH` | `/leads/{token}` | Lead bijwerken (bezoeker ging terug naar stap 1). |
| `GET` | `/intake-slots?days=14` | Intakemomenten met `available: true/false`. |
| `POST` | `/intakes` | Intake plannen: `{ "lead_token", "starts_at" }`. 409 = bezet. |

Foutmeldingen komen als `{ "detail": "..." }` in gewone taal terug; de website
toont ze direct. Draait de site op een ander domein dan de backend, zet dat
domein dan in `WEBSITE_ORIGINS` op de server.

## Foto's plaatsen

Elke foto is nu een kleurvlak met korrel (`<div class="ph">`). Na de
fotoshoot: zet de foto in een map `img/` en geef het vlak de foto mee.

```html
<div class="ph" style="--img:url('img/clubtraining.jpg')" aria-hidden="true">
```

Het bijschrift (`<span class="cap">`) zegt welke foto waar hoort en is alleen
zichtbaar in de conceptversie.

## Live zetten

Nog te doen voordat `concept` op `false` kan:

- [ ] **O4** losse PT: €65 of €69 (staat nu op €65)
- [ ] **O10** PT + Club na de lancering (staat nu op €375, zie CLAUDE.md §4)
- [ ] **O12** PT als rittenkaart (staat nu als €69 per sessie)
- [ ] **O7** domein onder de nieuwe naam
- [ ] **O6** duur van een training (staat nu nergens op de site)
- [ ] Teamteksten van Jeroen en Marcel, en portretten
- [ ] Foto's en video van de fotoshoot
- [ ] Toestemming van de leden voor de reviews (tot die tijd alleen zichtbaar in de conceptversie)
- [ ] Adres, KvK-nummer en een privacyverklaring (het formulier vraagt naam en telefoonnummer)
- [ ] WhatsApp-nummers in `config.js`
- [ ] Backend online, `apiBase` invullen, `WEBSITE_ORIGINS` op de server zetten
- [ ] Spambescherming en rate limiting op `/leads` en `/intakes`
