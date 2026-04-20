TELESALES.IT — PACCHETTO FINALE
================================

Quattro file HTML autonomi. Ogni file funziona offline: immagini, font, script
e stili sono inclusi inline. Apri direttamente con doppio click o carica tutto
su qualsiasi hosting statico.

FILE
----
  index.html       Home di presentazione con i 3 link
  landing.html     Landing commerciale pubblica (Telesales × AI Voice)
  app.html         Console interna AI Voice (dashboard + call detail)
  sales-kit.html   Deck commerciale 14 slide (export PDF via Cmd/Ctrl+P)


DEPLOY IN 60 SECONDI
--------------------

NETLIFY DROP (più veloce)
  1. Vai su https://app.netlify.com/drop
  2. Trascina l'intera cartella dist/
  3. Ottieni un URL tipo <nome-random>.netlify.app
  4. Da Site settings → Domain management puoi collegare telesales.it

VERCEL
  1. https://vercel.com/new
  2. "Deploy from file" → seleziona cartella dist/
  3. Stessa logica di Netlify per il dominio custom

CLOUDFLARE PAGES
  1. https://pages.cloudflare.com/
  2. "Upload assets" → carica dist/
  3. Ottimo se hai già il dominio su Cloudflare

Tutti e tre sono gratuiti e servono fino a traffico elevato.


ROUTING CONSIGLIATO SU DOMINIO VERO
-----------------------------------
  telesales.it/                → landing.html   (pubblica, commerciale)
  telesales.it/app             → app.html       (proteggi con basic auth o login)
  telesales.it/sales-kit       → sales-kit.html (link privato per call)

Su Netlify basta un _redirects nella root:
  /app          /app.html          200
  /sales-kit    /sales-kit.html    200


NOTE
----
• Il Sales Kit supporta stampa PDF (Cmd/Ctrl+P, formato landscape).
• Tutti i file sono bilingue IT/EN (toggle in alto a destra).
• App.html: la login è simulata (user/pass qualsiasi). Prima di mettere online
  davvero, proteggi con SSO aziendale o basic auth lato hosting.
• I dati dei case study in sales-kit.html sono realistici ma di esempio:
  aggiornali con le tue metriche reali prima di usarli con clienti.
