# La Serre Clandestine

Jeu en 2D vu de dessus, dans le quartier des Lilas, avec multijoueur en ligne. Il tourne bien sur téléphone.
**Aucun compte n'est nécessaire** : il suffit d'ouvrir l'adresse du jeu.
Le jeu et son serveur tiennent dans ce dossier, **sans dépendance à installer** : il faut seulement Node.js.

```
la-serre-clandestine/
├── server.js              ← le serveur (pages du jeu + multijoueur + sauvegardes)
├── package.json
├── public/
│   ├── index.html         ← la page du jeu (affichage, menus)
│   ├── game.js            ← tout le jeu
│   ├── claude-shim.js     ← branche le multijoueur et les sauvegardes du jeu sur server.js
├── data/                  ← créé tout seul : les sauvegardes en ligne (saves.json)
├── CLAUDE.md              ← notes pour Claude Code
└── README.md
```

Les joueurs ne peuvent pas modifier le jeu : ils reçoivent seulement la page. Seul celui qui héberge le serveur peut changer les fichiers.

## 1. Jouer sur ton ordinateur

1. Installe **Node.js** (version 18 ou plus) depuis https://nodejs.org
2. Ouvre un terminal dans ce dossier, puis lance :
   ```
   node server.js
   ```
3. Ouvre **http://localhost:3000** dans ton navigateur.

Ne double-clique pas sur `public/index.html` : le jeu marcherait, mais sans le multijoueur. Il faut passer par l'adresse du serveur.

### Jouer avec des amis sur le même Wi-Fi

Trouve l'adresse IP de ton ordinateur (par exemple `192.168.1.20`). Sur Windows, tape `ipconfig` dans un terminal ; sur Mac, va dans Réglages → Wi-Fi → Détails.
Tes amis ouvrent alors `http://192.168.1.20:3000`. Si ça ne marche pas, autorise Node.js dans le pare-feu.

## 2. Mettre le jeu en ligne (gratuit) : jouer avec n'importe qui

L'exemple utilise **Render**. Railway, Fly.io ou n'importe quel hébergeur Node.js fonctionnent pareil.

1. Crée un compte sur https://github.com et mets ce dossier dans un nouveau dépôt.
   Le plus simple : bouton **New repository**, puis **uploading an existing file**, et glisse tous les fichiers sauf `data/`.
2. Crée un compte sur https://render.com, puis **New → Web Service** et choisis ton dépôt.
3. Réglages :
   - **Runtime** : Node
   - **Build Command** : laisse vide (ou `npm install`)
   - **Start Command** : `node server.js`
   - **Instance type** : Free
4. Clique sur **Create Web Service**. Au bout de 1 à 2 minutes, Render te donne une adresse du type `https://la-serre-clandestine.onrender.com`.
5. Envoie cette adresse à tes amis : c'est tout. Ils n'ont besoin d'aucun compte.

À savoir avec l'offre gratuite de Render :
- Le serveur s'endort après 15 minutes sans joueur. Le premier qui arrive attend environ 30 secondes.
- Le disque est effacé à chaque redémarrage, donc **les sauvegardes en ligne par code (XXXX-XXXX) peuvent disparaître**. La sauvegarde dans le navigateur de chaque joueur, elle, reste. Pour garder les sauvegardes en ligne, ajoute un disque persistant (option payante chez Render) et définis la variable `DATA_DIR` sur le chemin du disque.

## 3. Comment jouer ensemble

- **Sans rien faire**, tous ceux qui ouvrent l'adresse se retrouvent dans la **partie publique**.
- **Partie privée** : Menu → Multijoueur → **Créer une partie**. Donne le code de 5 caractères à tes amis. Ils l'entrent dans le même onglet et cliquent sur **Rejoindre**.
- **T** : chat. **H** : klaxon. L'étiquette en haut à droite indique la partie et le nombre de joueurs, ou « hors ligne » en rouge si le serveur ne répond pas.
- Chacun garde son argent, son labo, sa police et ses gangs. Ce qui est partagé : la ville, l'heure, la météo, les positions et le chat.

## Réglages (variables d'environnement)

| Variable   | Par défaut | Rôle |
|------------|------------|------|
| `PORT`     | `3000`     | port du serveur (Render le fixe tout seul) |
| `DATA_DIR` | `./data`   | dossier des sauvegardes en ligne |

## Deux modes

À l'ouverture, un lobby propose :
- **Mode histoire** (solo) : les cinq chapitres avec El Refe, décrits ci-dessous.
- **Mode multijoueur** : pas d'histoire. « Créer une serre » donne un code à 5 caractères ; tes amis le tapent dans « Rejoindre une serre ». Vous entrez tous dans le même labo : machines, plantes, graines, récolte, réserve, améliorations et équipe sont communs. Chacun garde son argent, son sac et ses véhicules, et ce que rapportent les dealers et livreurs est partagé. La serre est sauvegardée sur le serveur : on la retrouve avec « Reprendre la serre ».

## L'histoire

Tu as dix-neuf ans et ton père vient de te mettre dehors. La ville est coupée en deux par la rivière : le **Sud**, tenu par **El Refe**, et le **Nord**, tenu par **Madame Vega**. Une carte « Objectif » en haut à gauche et une flèche jaune te guident à travers cinq chapitres :

1. **À la rue** : El Refe t'apprend à vendre et te confie un labo, contre 30 % de tes gains à vie.
2. **Les bleus** : opération de police sur les Lilas (patrouilles, flics à pied, barrages). Téléphone, équipe, et premiers contacts avec Madame Vega.
3. **L'argent sale** : trouve le Blanchisseur en interrogeant les passants (pas de flèche), ouvre des commerces (laverie, kebab…) pour blanchir. Les voitures se paient en argent propre.
4. **La taupe** : trouve le flic infiltré, achète-le ; il te prévient des contrôles et des descentes jusqu'à la fin.
5. **La trahison** : El Refe veut 50 %. Défends tes commerces, élimine ses lieutenants, puis lui. Sa mort est la fin de l'histoire ; l'épilogue continue jusqu'à 10 M€.

Les magasins se visitent : on prend dans les rayons et on paie à la caisse. À la concession, le vendeur t'emmène dans son bureau pour négocier.

## Le labo

Au départ, le labo a déjà un bureau avec l'ordinateur, deux pots, un séchoir déjà installé, un robinet et 5 graines.
1. Approche-toi du pot pour **planter**, puis **arrose** : l'arrosoir (8 arrosages) se remplit au **robinet**, à droite de l'entrée.
2. **Taille** à mi-pousse (+20 % de récolte), **récolte**, puis charge la récolte dans le **séchoir** : c'est le produit séché que tu vends aux clients.
3. Pour t'agrandir :
   - **Jardinerie** : machines (pots, bacs, tables hydroponiques, arroseurs, séchoirs, en 3 niveaux), sur place, sans frais.
   - **Graineterie** : graines, sur place, sans frais.
   - **Ordinateur du labo** : commande de tout, livrée par camionnette devant le labo en une minute environ (frais de livraison : 10 %, 10 € minimum).
   - **Concessionnaires** (Auto Lilas et Garage du Port) : véhicules.
4. **Tu places toi-même** chaque machine : approche-toi d'un endroit libre, « Poser une machine ici », puis avance ou tourne-toi jusqu'à ce que l'aperçu soit vert. « Options » sur une machine permet de la **déplacer** ou de la ranger.
5. **Agrandis le labo** (Améliorations → Agrandir le labo, 4 niveaux payants) : la cloison du fond recule et libère de la place. Embauche un jardinier (Équipe) pour automatiser.

## Le sac à dos

Le produit séché arrive dans la **réserve** du labo (étagères à droite de l'entrée). Pour vendre, remplis ton **sac à dos** à la réserve : les clients se servent dans ton sac.
- Une place = 10 unités d'une variété ou 5 objets identiques. Sac de départ : 6 places ; plus grands (10, 16, 24 places) dans les boutiques de vêtements.
- Les objets achetés (tisane, lunettes, engrais…) vont dans le sac : touche **B** ou l'icône 🎒 pour les utiliser.
- Si la police t'arrête ou qu'un gang te tombe dessus, c'est ton sac qu'ils vident. La réserve du labo reste.

## Commandes du jeu

- **À pied** : joystick en bas à gauche (ou ZQSD / flèches, Maj pour marcher), bouton d'action à droite (ou E), Options (ou R).
- **En voiture** : flèches à l'écran (ou ZQSD / flèches), DRIFT = frein à main (Espace), H : klaxon, G : go fast. Le bouton d'action devient « Descendre ».
- **Frapper** : bouton 👊 (ou F), à pied. Un passant mis KO peut être **fouillé** (bouton d'action) : argent, parfois un objet ou du produit. Ça fait monter la chaleur.
- **Partout** : B : sac à dos · N : carte · T : chat.
- On entre dans le labo à pied, par la porte (le toit s'efface et la vue zoome). Poursuivi par la police ? Descends et cache-toi dans une boutique avant qu'ils soient trop près.
