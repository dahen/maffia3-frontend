# Läs först vid fortsatt arbete

Detta är frontend-repot för version 3. Backend ligger i ../maffia3-backend.
Läs ../maffia3-backend/docs/SESSION.md, BESLUT.md och PLAN.md före fortsatt arbete.
Det gemensamma API-kontraktet är ../maffia3-backend/src/contracts.ts.

Användaren prioriterar nu GM-vy och simulering. GM använder dator: ingen
sidledsskroll vid normal skärmstorlek, så lite höjdskroll som möjligt, kompakt
tabell med informationen samlad. Mobil GM är sekundärt; spelare använder bara
mobil. Inga stora dashboards/paneler som tränger undan överblicken.

Tema ska gå att byta per parti. Djungel/djur är första temat, med god kontrast.
Status behöver text eller symbol utöver färg. Behåll osparade utkast vid
liveuppdateringar och visa sparfel utan att tappa texten.

Uppdatera de gemensamma dokumenten när arbetet förändras. Ingen deploy är beställd.
Gör löpande commits av fungerande delsteg med tydliga meddelanden. Användaren
har uttryckligen bett om ordentlig Git-historik och push till GitHub.
