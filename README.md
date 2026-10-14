# Carte du Projet Narcos

Carte mentale de l’équipe, modifiable à plusieurs : chaque modification apparaît chez tout le monde en une ou deux secondes.

- `index.html` : la carte (une seule page).
- `netlify/functions/carte.mjs` : le serveur. La carte entière est rangée dans Netlify Blobs (magasin `carte-narcos`, clé `carte`). Les écritures sont atomiques, donc deux personnes qui modifient en même temps ne s’écrasent pas.
- `seed.json` : le contenu de départ, utilisé seulement si la carte est vide.

## Mettre en ligne sur Netlify

1. Sur https://app.netlify.com : **Add new site → Import an existing project → GitHub**, puis choisis ce dépôt.
2. Laisse les réglages proposés (ils viennent de `netlify.toml`) et clique **Deploy**.
3. Netlify donne une adresse du type `https://xxx.netlify.app` : envoie-la à l’équipe. Pas de compte à créer pour eux.

Ouverte sans serveur (fichier sur l’ordinateur), la page marche quand même, mais elle n’enregistre que sur cet appareil.
