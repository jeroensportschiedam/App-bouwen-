# De Impact Club — website (preview)

Dit is een eerste, **niet-live preview** van de nieuwe website voor De Impact
Club (voorheen Jeroen Sport). Bedoeld om de nieuwe uitstraling te laten zien
— walnoot, zwart staal, oxblood en oud koper — en om te dienen als fundament
voor de echte site.

## Lokaal draaien

```bash
cd web
npm install
npm run dev
```

Open <http://localhost:3000>.

## Waar zit wat

- **Design tokens (kleuren):** `app/globals.css`, sectie `:root`. Pas hier
  `--oxblood`, `--walnut`, `--koper`, `--greige` etc. aan om het hele palet
  in één keer te wijzigen. De tokens zijn gekoppeld aan Tailwind-classes via
  `tailwind.config.ts` (bijv. `bg-oxblood`, `text-koper-light`).
- **Kopfont:** ook een token (`--font-heading` in `globals.css`). Rechtsonder
  in de preview zit een "Aa"-knop waarmee je live kunt wisselen tussen de
  serif (moodboard-sfeer) en Righteous (huidig merk) — puur een hulpmiddel
  om die knoop door te hakken, hoort niet in de definitieve site thuis.
- **Content (prijzen, regels, locaties):** `content/aanbod.ts`. Eén bestand,
  niets hard-coded in de pagina's. Pas hier aan, niet in de componenten.
- **Sfeerbeelden:** nu nog CSS-placeholders (`components/Sfeerbeeld.tsx`),
  duidelijk gelabeld, omdat de zaal nog verbouwd wordt. Zodra er foto's zijn:
  zet ze in `public/images/` en vervang de placeholder door een
  `next/image`.
- **Pagina's:** `app/*/page.tsx`, één map per route (`/club`, `/fundament`,
  `/tarieven`, `/vragen`, `/contact`, `/privacy`, `/voorwaarden`).

## Status / wat hier bewust nog niet in zit

- **Niet live, geen deploy.** Puur lokaal te bekijken.
- Aanvraagformulier (`/contact`) is alleen UI — verstuurt nog niets. Hoe
  aanvragen straks binnenkomen (bestaande backend, e-mail of CRM) is nog een
  open punt.
- Geen koppeling met de bestaande backend/apps (creditpool-engine e.d.). Als
  de site straks verder gebouwd wordt richting productie, eerst de bestaande
  backend en apps onderzoeken voordat er een eigen datalaag bij komt.
- Fotografie is placeholder. Kleurpalet en kopfont staan hierboven als
  makkelijk wisselbare tokens, juist omdat dit nog open punten zijn.
- `npm audit` toont bekende kwetsbaarheden in Next.js 14 die vooral
  self-hosted/live servers raken; voor een eventuele live deploy eerst
  dependencies actualiseren en een security-review doen.
