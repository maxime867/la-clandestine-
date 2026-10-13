# La Serre Clandestine — notes pour Claude Code

Jeu 2D (canvas) en vue de dessus, en français, avec un serveur Node.js **sans dépendance**. Aucun compte n'est demandé aux joueurs.

## Lancer
`node server.js` puis http://localhost:3000 (variables `PORT`, `DATA_DIR`).

## Fichiers
- `public/index.html` : tout le jeu (HTML + CSS + JS dans un seul fichier, ~2700 lignes). Le code est découpé en sections commentées `/* ---------- titre ---------- */`. Principales sections :
  - **données** : variétés (`STRAINS`), véhicules (`VEH`), améliorations (`UPS`), équipe (`TEAM`), magasins (`SHOPTYPES`, `SHOP_PLAN`, `GOODS`), gangs (`DIS`, `BOSSES`, `PERKS`).
  - **état** : `newG()`, sauvegarde locale `localStorage['serre3d-v1']`, `migrate()` pour les anciennes sauvegardes.
  - **monde** : la ville est générée avec un aléatoire à graine fixe (`mulberry32(20261013)`), donc identique pour tous les joueurs. Routes = polylignes dans `ROADS` (avenues `w` 20, rues `w` 16). Eau : `RIVER`, `SEA`, `LAKE`. Lieux : `PARK`, `ALLOT`, `PLAZA`, `ISLAND`, `LIGHTHOUSE`, `BANK`, `PIERS`, `QGP` (QG des gangs). Grille d'occupation `MASK` (cases de 3 m : 0 sol, 1 route, 2 eau, 3 réservé, 4 bâti, 5 ponton).
  - **graphe des routes** : `buildGraph()`, `nearestNode()`, `astar()`, `roadPos()`. Toute l'IA (circulation, police, gangs, livreurs) passe par `pathTo()` et `randRoadPoint()`.
  - **rendu** : `drawGround()` (sol, eau, routes, ponts, port), puis `render()` (ombres, véhicules, personnages, bâtiments en fausse perspective via `box()`, lumière jour/nuit dans `lightPass()`).
  - **multijoueur** : section `multijoueur : parties privées par code`. Elle utilise `claude.use('room')` (salons, présence, événements `chat` et `horn`).
  - **sauvegarde avec code** : utilise `claude.use('db')` → `db.doc('saves/XXXX-XXXX').get()/set()`.
- `public/claude-shim.js` : réimplémente `window.claude.use('room')` et `use('db')` au-dessus de `server.js`. Le jeu a d'abord été écrit pour claude.ai ; sur claude.ai, l'adaptateur ne fait rien.
- `server.js` : fichiers statiques, mini-serveur WebSocket fait main (RFC 6455) sur `/ws`, API `GET/POST /api/doc?path=saves/XXXX-XXXX`, persistance dans `data/saves.json`.

## Protocole WebSocket (JSON)
Client → serveur : `{t:'join',room}`, `{t:'leave',room}`, `{t:'presence',room,p}`, `{t:'emit',room,topic,data}`.
Serveur → client : `{t:'hello',peer}`, `{t:'joined',room,peers:[{peer,presence}]}`, `{t:'join_err',room,code}`, `{t:'pres',room,peer,p}`, `{t:'left',room,peer}`, `{t:'ev',room,topic,data,peer}` (l'émetteur reçoit aussi ses propres événements).
Limites : nom de salon `^[a-z0-9][a-z0-9_.-]{0,47}$`, présence et événements 4 Ko max, 60 messages/s par connexion. La partie publique est le salon `p-public`, les parties privées `p-<code>`.

## Conventions
- Tous les textes du jeu sont en français.
- Ce qu'envoient les autres joueurs est non fiable : on le nettoie (`cleanTxt`, `pnum`, `pcol`) et on l'insère avec `textContent` ou `esc()`.
- Après une modification, ouvre http://localhost:3000 dans deux navigateurs pour vérifier le multijoueur.
