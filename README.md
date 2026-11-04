# Maffia 3 – frontend

React, TypeScript, Vite och Tailwind. Kräver Node ≥24.12.

```powershell
npm install
npm run dev
```

Frontend: http://localhost:3046, API-proxy till backend på 127.0.0.1:3047.
Backend måste vara startad och seedad. GM-inloggning: `/gm`, lokal demo **GM / 2468**.

```powershell
npm run build
```

Backend serverar sedan `dist/` direkt på port 3047. GM-tabell, simulering,
chatt, broadcasts, historik, loggsida och separat mobil GM-morgonvy ingår.
Mobil spelarvy ingår: roll/vinstvillkor, alla nattvalstyper, grupputförare,
morgonbesked, personlig GM-chatt och gruppchatt med olästindikering.

Fyra separata GM-sidor: **Rollbibliotek** med CRUD, **Partimallar**,
**Spelare** (test/skarpt) och **Starta parti**. Mall och lista måste ha samma
antal roller/spelare. GM granskar, byter eller slumpar om före godkännandet.
Det finns ingen funktion för att spara roller från Spelöversikten.

För telefon på samma wifi: bygg frontend, starta backend med `npm run start:lan`
och öppna `http://<datorns wifi-IPv4>:3047`. På startsidan väljer spelaren sitt namn i dropdownen för Live-partiet och
anger PIN. GM använder `/gm` med manuellt namnfält. Testkonton får slumpade PIN som visas vid genereringen. Telefonen
har ingen partiväljare och följer det enda Live-partiet. Före godkännande
väntar spelaren på GM. Windows-brandväggen behöver tillåta TCP 3047 för Node
från det lokala nätet på privat wifi. Se backend-README för hela startflödet.

Gemensamma krav, idéer och aktuell arbetsstatus:

- `../maffia3-backend/docs/BESLUT.md` – användarbekräftade krav.
- `../maffia3-backend/docs/PLAN.md` – prioriteringar och framtidsidéer.
- `../maffia3-backend/docs/SESSION.md` – återuppta nästa session här.
- `../maffia3-backend/README.md` – körning och provflöden.

API-typer importeras från `../maffia3-backend/src/contracts.ts`.
De två repositories förväntas ligga som syskon i den lokala arbetsytan.


Under Spelare kan GM öppna fristående ankomst/incheckning utan parti.
En gemensam iPad med GM-inloggning använder `/camera`: deltagarna trycker på
sitt namn och tar foto utan egen PIN/mobil. Tavlan visar status för alla.
Livekamera på localhost/HTTPS, kameraväljare på wifi-HTTP. Uteblivna
kan avaktiveras. Start kräver rätt antal aktiva och att alla är incheckade.
Spelarens Spelare-flik visar levande med foton; målval har bildbekräftelse och
GM har miniatyrer. Bilder hämtas via autentiserat API, inte publika filer.

GM styr nedräkningen direkt i nattvyn. Spelarens sticky räknare är grön om allt
är inskickat, annars orange/röd. Automatiska chattpåminnelser är borttagna.

GM har också en separat Uppdateringar-sida med installerad/ny version och
status för uttryckligt startade uppdateringsjobb. Hosttjänsten och releaseflödet
installeras enligt backend-repots `deploy/README.md`; lokalt utan konfiguration
visas att tjänsten ännu inte är inkopplad. Ingen deploy sker vid git push.
