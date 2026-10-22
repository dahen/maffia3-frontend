# Maffia 3 – frontend

React, TypeScript, Vite och Tailwind. Kräver Node ≥24.12.

```powershell
npm install
npm run dev
```

Frontend: http://localhost:3046, API-proxy till backend på 127.0.0.1:3047.
Backend måste vara startad och seedad. Login för lokal demo: **GM / 2468**.

```powershell
npm run build
```

Backend serverar sedan `dist/` direkt på port 3047. GM-tabell, simulering,
chatt, broadcasts, historik, loggsida och separat mobil GM-morgonvy ingår.
Spelarens mobilvy kommer senare.

Gemensamma krav, idéer och aktuell arbetsstatus:

- `../maffia3-backend/docs/BESLUT.md` – användarbekräftade krav.
- `../maffia3-backend/docs/PLAN.md` – prioriteringar och framtidsidéer.
- `../maffia3-backend/docs/SESSION.md` – återuppta nästa session här.
- `../maffia3-backend/README.md` – körning och provflöden.

API-typer importeras från `../maffia3-backend/src/contracts.ts`.
De två repositories förväntas ligga som syskon i den lokala arbetsytan.
