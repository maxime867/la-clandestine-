# La Serre Clandestine — notes pour Claude Code

Jeu 2D (canvas) vu de dessus, en français, avec un serveur Node.js **sans dépendance**. Aucun compte n'est demandé aux joueurs.

## Lancer
`node server.js` puis http://localhost:3000 (variables `PORT`, `DATA_DIR`).
Mode test : http://localhost:3000/?debug=1 expose `window.__serre` (état, téléportation, `step(secondes)` pour faire avancer la simulation sans dessiner).

## Fichiers
- `public/index.html` : la page (HUD, menus, styles). Charge `claude-shim.js` puis `game.js`.
- `public/game.js` : tout le jeu (script classique), découpé en sections `/* ---------- titre ---------- */`. Principales sections :
  - **données** : variétés (`STRAINS`), véhicules (`VEH`), améliorations (`UPS`), équipe (`TEAM`), magasins (`SHOPTYPES`, `SHOP_PLAN`, `GOODS`), gangs (`DIS`, `BOSSES`, `PERKS`).
  - **machines du labo** : `MACH` (catégories `culture`, `eau`, `transfo`, niveaux 1 à 3).
  - **état** : `newG()` (v5), sauvegarde locale `localStorage['serre3d-v1']`, `migrate()` convertit les anciennes sauvegardes (v4 : pots dans un menu).
  - **monde** : la ville est générée avec un aléatoire à graine fixe (`mulberry32(20261013)`), donc identique pour tous les joueurs. Routes = polylignes dans `ROADS`. Grille d'occupation `MASK` (cases de 3 m : 0 sol, 1 route, 2 eau, 3 réservé, 4 bâti, 5 ponton). Collisions : rectangles dans `BLK` (`lm:1` = lié au labo, reconstruit).
  - **rendu** : `drawGround()`, puis `render()` (ombres, mobilier, personnages, véhicules, bâtiments en fausse perspective via `box()`, lumière jour/nuit dans `lightPass()`). Immeubles par quartier dans `drawBld()` : toits à deux pans (Jardins), mansardes en zinc (Vieux Centre), tours vitrées (Tours), hangars (Port).
  - **personnages** : `drawHuman(x,z,th,look,ph,vitesse,échelle,mode,coup)` avec les modes `sit`, `chat`, `ko`.
  - **joueur** : à pied (`updFoot`, joystick : haut de l'écran = nord) ou au volant (`updPlayer`, flèches). Une seule voiture garée à la fois (`CAR`, `parkCar`, `enterCar`, `exitCar`).
  - **labo** : un vrai bâtiment au QG du joueur ; on y entre à pied par la porte, le toit disparaît et la caméra zoome. Repère local `(d, s)` : d = profondeur depuis la porte, s = latéral (`labWorld`, `labLocal`, `inLab`). Placement libre : `startPlace(id, item)` / `updPlace()` / `dropPlace()` / `cancelPlace()` (aperçu vert/rouge, `placeOk`, empreintes `FOOT`, meubles fixes `LAB.sh.fixL`). La cloison du fond (`labZoneSync`, `ZONE_D`) recule avec « Agrandir le labo ». Actions : `lPlant/lWater/lPrune/lHarvest/lClear/lLoad/lRemove(it)`, `labTick()` (croissance, soif, séchage, arroseurs, jardiniers). Dessin : `drawLabInside`, `drawLabRoof`, `drawLabDoor`, `labHUD`.
  - **livraisons** : ce qu'on commande à l'ordinateur arrive en camionnette (`DV`, `queueDelivery`).
  - **sac à dos** : `G.bag = {lv, p, it}` (produit et objets portés). Une place = 10 unités d'une variété ou 5 objets (`BAGS`, 6 → 24 places, vendus chez les vêtements). On le remplit à la réserve du labo (`bagTake`). Le joueur vend depuis son sac ; livreurs et dealers vendent depuis la réserve (`G.stock`). Police, gangs et arrestation prennent dans le sac.
  - **frapper / dépouiller** : `doPunch()` (F ou bouton 👊), `hitPed()`, passant KO (`p.ko`) puis `lootPed()`. `pedSpecial()` gère KO et fuite dans `updPeds`.
  - **vie de la ville** : `buildCityLife()` pose bancs, poubelles, bouches d'incendie, bacs à fleurs, abribus, terrasse de café sur la place (aléatoire à graine fixe) et des gens assis, à l'arrêt de bus ou qui discutent (`CITY.npc`) ; pigeons (`CITY.flocks`) qui s'envolent quand on approche ; bus et joggeurs.
  - **menu** : seulement à l'ordinateur du labo (`labDo` → `openMenu`) ; les boutiques ouvrent un seul onglet (`openMenu(tab,true)`, `menuAt` = la boutique).
  - **multijoueur** : `claude.use('room')` (salons, présence, événements `chat` et `horn`). **Sauvegarde avec code** : `claude.use('db')`.
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
