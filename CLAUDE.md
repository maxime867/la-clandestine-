# La Serre Clandestine — notes pour Claude Code

Jeu en 3D (Three.js) à la troisième personne, en français, avec un serveur Node.js **sans dépendance**. Aucun compte n'est demandé aux joueurs.

## Lancer
`node server.js` puis http://localhost:3000 (variables `PORT`, `DATA_DIR`).
Mode test : http://localhost:3000/?debug=1 expose `window.__serre` (état, téléportation, `step(secondes)` pour faire avancer la simulation sans dessiner).

## Fichiers
- `public/index.html` : la page (HUD, menus, styles). Charge `claude-shim.js` puis `game.js` (module ES).
- `public/game.js` : tout le jeu, découpé en sections `/* ---------- titre ---------- */`. Principales sections :
  - **données** : variétés (`STRAINS`), véhicules (`VEH`), améliorations (`UPS`), équipe (`TEAM`), magasins (`SHOPTYPES`, `SHOP_PLAN`, `GOODS`), gangs (`DIS`, `BOSSES`, `PERKS`).
  - **machines du labo** : `MACH` (catégories `culture`, `eau`, `transfo`, niveaux 1 à 3).
  - **état** : `newG()` (v5), sauvegarde locale `localStorage['serre3d-v1']`, `migrate()` convertit les anciennes sauvegardes 2D (v4).
  - **monde** : la ville est générée avec un aléatoire à graine fixe (`mulberry32(20261013)`), donc identique pour tous les joueurs. Routes = polylignes dans `ROADS`. Grille d'occupation `MASK`. Collisions : rectangles dans `BLK` (`h` = hauteur pour la caméra, `cam:1` = bloque seulement la caméra, `lm:1` = lié au labo, reconstruit).
  - **moteur 3D** : `GB` (géométries fusionnées), textures dessinées en canvas, `buildCity()` (sol, eau, routes, immeubles, arbres instanciés, lampadaires), véhicules `vehGB`/`mkVeh`, personnages `mkHuman`/`animHuman` (idle, marche, course), objets dynamiques réutilisés (`useObj`), étiquettes HTML (`label`).
  - **bâtiments visitables** : `buildShell()` fait des murs avec une vraie porte, un intérieur, un plafond ; `furnishStore()` meuble les boutiques ; `SHELLS` liste les intérieurs (`shellAt`).
  - **joueur** : à pied (`updFoot`, joystick relatif à la caméra) ou au volant (`updPlayer`). Une seule voiture garée à la fois (`CAR`, `parkCar`, `enterCar`, `exitCar`).
  - **caméra** : `updCamera()` à la troisième personne, rayon `camRay()` contre `BLK` pour ne pas traverser les murs, plafond respecté en intérieur.
  - **labo** : `buildLab()`, emplacements `LAB.slots` (6 × 4, `labSlots()` débloqués), actions `lPlace/lPlant/lWater/lPrune/lHarvest/lLoad/lRemove`, `labTick()` (croissance, soif, séchage, arroseurs, jardiniers).
  - **menu** : seulement à l'ordinateur du labo (`labDo` → `openMenu`) ; les boutiques ouvrent un seul onglet (`openMenu(tab,true)`, `menuAt` = la boutique).
  - **multijoueur** : `claude.use('room')` (salons, présence, événements `chat` et `horn`). **Sauvegarde avec code** : `claude.use('db')`.
- `public/vendor/three.module.min.js` : Three.js r169 (licence MIT dans `THREE-LICENSE.txt`).
- `public/claude-shim.js` : réimplémente `window.claude.use('room')` et `use('db')` au-dessus de `server.js`.
- `server.js` : fichiers statiques, mini-serveur WebSocket fait main (RFC 6455) sur `/ws`, API `GET/POST /api/doc?path=saves/XXXX-XXXX`, persistance dans `data/saves.json`.

## Protocole WebSocket (JSON)
Client → serveur : `{t:'join',room}`, `{t:'leave',room}`, `{t:'presence',room,p}`, `{t:'emit',room,topic,data}`.
Serveur → client : `{t:'hello',peer}`, `{t:'joined',room,peers:[{peer,presence}]}`, `{t:'join_err',room,code}`, `{t:'pres',room,peer,p}`, `{t:'left',room,peer}`, `{t:'ev',room,topic,data,peer}` (l'émetteur reçoit aussi ses propres événements).
Limites : nom de salon `^[a-z0-9][a-z0-9_.-]{0,47}$`, présence et événements 4 Ko max, 60 messages/s par connexion. La partie publique est le salon `p-public`, les parties privées `p-<code>`.

## Conventions
- Tous les textes du jeu sont en français.
- Repère : x vers l'est, z vers le sud, y vers le haut ; un cap `th` regarde vers `(sin th, cos th)`.
- Ce qu'envoient les autres joueurs est non fiable : on le nettoie (`cleanTxt`, `pnum`, `pcol`) et on l'insère avec `textContent` ou `esc()`.
- Après une modification, ouvre http://localhost:3000 dans deux navigateurs pour vérifier le multijoueur.
