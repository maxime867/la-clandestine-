// Carte du Projet Narcos : la carte entière est un seul document JSON numéroté dans Netlify Blobs.
// GET  /api/carte?v=<version>&c=<client>  -> {v, nodes, online} (ou {v, same:true, online} si rien n'a changé)
// POST /api/carte {op:'set', id, data} | {op:'del', ids} | {op:'ping', c, n, s}
// Les écritures sont atomiques (ETag) : deux personnes qui modifient en même temps ne s'écrasent pas.
import { getStore } from "@netlify/blobs";

const SEED = {"equipe-0": {"note": "Cette page.", "o": 0, "parent": "equipe", "status": "fait", "t": 1791995968567, "title": "Carte mentale partagée"}, "equipe-1": {"note": "", "o": 1, "parent": "equipe", "status": "pas", "t": 1791995968567, "title": "Répartir les tâches"}, "equipe-2": {"note": "", "o": 2, "parent": "equipe", "status": "reflexion", "t": 1791995968567, "title": "Tutoriel pour les nouveaux joueurs"}, "equipe": {"color": "#e3a6cf", "note": "", "o": 7, "parent": "root", "status": "", "t": 1791995968567, "title": "Équipe & organisation"}, "graph-0": {"note": "Version principale.", "o": 0, "parent": "graph", "status": "fait", "t": 1791995968567, "title": "Version 2D vue de dessus"}, "graph-1": {"note": "En pause : ne s’ouvrait pas chez tout le monde.", "o": 1, "parent": "graph", "status": "reflexion", "t": 1791995968567, "title": "Version 3D"}, "graph-2": {"note": "", "o": 2, "parent": "graph", "status": "fait", "t": 1791995968567, "title": "Toits différents selon les quartiers"}, "graph-3": {"note": "", "o": 3, "parent": "graph", "status": "reflexion", "t": 1791995968567, "title": "Musique et sons"}, "graph": {"color": "#f5a878", "note": "", "o": 6, "parent": "root", "status": "", "t": 1791995968567, "title": "Graphismes & son"}, "histoire-0": {"note": "Les Tours, Le Port, Les Jardins, Le Vieux Centre.", "o": 0, "parent": "histoire", "status": "fait", "t": 1791995968567, "title": "Quartier des Lilas : 4 secteurs, 4 gangs"}, "histoire-1": {"note": "Alliances, tributs, guerres, cadeaux.", "o": 1, "parent": "histoire", "status": "fait", "t": 1791995968567, "title": "Gérants : Papa Léon, Le Baron, Momo, Madame Vega"}, "histoire-2": {"note": "", "o": 2, "parent": "histoire", "status": "fait", "t": 1791995968567, "title": "Objectif : 10 M€ · prison après 3 arrestations"}, "histoire-3": {"note": "Chapitres, rebondissements, fin différente selon les choix.", "o": 3, "parent": "histoire", "status": "reflexion", "t": 1791995968567, "title": "Missions scénarisées avec une vraie histoire"}, "histoire-4": {"note": "", "o": 4, "parent": "histoire", "status": "pas", "t": 1791995968567, "title": "Cinématiques / dialogues d’intro"}, "histoire": {"color": "#bfc3e6", "note": "", "o": 0, "parent": "root", "status": "", "t": 1791995968567, "title": "Histoire & univers"}, "labo-0": {"note": "Le toit s’efface, la vue zoome.", "o": 0, "parent": "labo", "status": "fait", "t": 1791995968567, "title": "Labo où l’on entre à pied"}, "labo-1": {"note": "Aperçu vert / rouge, déplacer, ranger.", "o": 1, "parent": "labo", "status": "fait", "t": 1791995968567, "title": "Placement libre des machines"}, "labo-2": {"note": "La cloison du fond recule.", "o": 2, "parent": "labo", "status": "fait", "t": 1791995968567, "title": "Agrandir le labo (4 niveaux payants)"}, "labo-3": {"note": "", "o": 3, "parent": "labo", "status": "fait", "t": 1791995968567, "title": "Départ : 2 pots, séchoir installé, robinet, 5 graines"}, "labo-4": {"note": "3 niveaux par machine.", "o": 4, "parent": "labo", "status": "fait", "t": 1791995968567, "title": "Pots, bacs, tables hydroponiques, arroseurs, séchoirs"}, "labo-5": {"note": "", "o": 5, "parent": "labo", "status": "fait", "t": 1791995968567, "title": "Jardinier automatique"}, "labo-6": {"note": "Commande à l’ordinateur du labo.", "o": 6, "parent": "labo", "status": "fait", "t": 1791995968567, "title": "Livraisons en camionnette"}, "labo-7": {"note": "", "o": 7, "parent": "labo", "status": "reflexion", "t": 1791995968567, "title": "Décoration du labo"}, "labo": {"color": "#8ecdb3", "note": "", "o": 1, "parent": "root", "status": "", "t": 1791995968567, "title": "Le labo"}, "mobile-0": {"note": "", "o": 0, "parent": "mobile", "status": "fait", "t": 1791995968567, "title": "Joystick à pied, flèches en voiture"}, "mobile-1": {"note": "", "o": 1, "parent": "mobile", "status": "fait", "t": 1791995968567, "title": "Boutons Frapper et Sac"}, "mobile-2": {"note": "", "o": 2, "parent": "mobile", "status": "pas", "t": 1791995968567, "title": "Tester sur les téléphones de l’équipe"}, "mobile": {"color": "#f7a8c4", "note": "", "o": 5, "parent": "root", "status": "", "t": 1791995968567, "title": "Mobile"}, "multi-0": {"note": "", "o": 0, "parent": "multi", "status": "fait", "t": 1791995968567, "title": "Partie publique et parties privées par code"}, "multi-1": {"note": "", "o": 1, "parent": "multi", "status": "fait", "t": 1791995968567, "title": "Chat et klaxon entre joueurs"}, "multi-2": {"note": "", "o": 2, "parent": "multi", "status": "fait", "t": 1791995968567, "title": "Sauvegarde avec code XXXX-XXXX"}, "multi-3": {"note": "", "o": 3, "parent": "multi", "status": "fait", "t": 1791995968567, "title": "Code sur GitHub (branche version-2d)"}, "multi-4": {"note": "Dire « mets-la en ligne ».", "o": 4, "parent": "multi", "status": "pas", "t": 1791995968567, "title": "Mettre la 2D en ligne sur Render"}, "multi-5": {"note": "", "o": 5, "parent": "multi", "status": "reflexion", "t": 1791995968567, "title": "Classement des joueurs"}, "multi": {"color": "#a8dce6", "note": "", "o": 4, "parent": "root", "status": "", "t": 1791995968567, "title": "Multijoueur & en ligne"}, "perso-0": {"note": "", "o": 0, "parent": "perso", "status": "fait", "t": 1791995968567, "title": "Personnages plus détaillés (assis, KO)"}, "perso-1": {"note": "", "o": 1, "parent": "perso", "status": "fait", "t": 1791995968567, "title": "Frapper et fouiller les passants KO"}, "perso-2": {"note": "Vendu chez les vêtements.", "o": 2, "parent": "perso", "status": "fait", "t": 1791995968567, "title": "Sac à dos de 6 à 24 places"}, "perso-3": {"note": "", "o": 3, "parent": "perso", "status": "fait", "t": 1791995968567, "title": "Police, gangs, go fast"}, "perso-4": {"note": "Coiffures, tenues, couleurs de peau.", "o": 4, "parent": "perso", "status": "reflexion", "t": 1791995968567, "title": "Personnalisation du perso"}, "perso": {"color": "#ffcc5c", "note": "", "o": 3, "parent": "root", "status": "", "t": 1791995968567, "title": "Perso & combat"}, "root": {"note": "Le jeu La Serre Clandestine : 2D vue de dessus, multijoueur, sans compte.", "o": 0, "parent": null, "status": "", "t": 1791995968567, "title": "Projet Narcos"}, "ville-0": {"note": "", "o": 0, "parent": "ville", "status": "fait", "t": 1791995968567, "title": "Voitures qui restent sur la route"}, "ville-1": {"note": "La banque a été déplacée.", "o": 1, "parent": "ville", "status": "fait", "t": 1791995968567, "title": "Bâtiments hors des trottoirs"}, "ville-2": {"note": "", "o": 2, "parent": "ville", "status": "fait", "t": 1791995968567, "title": "Bancs, abribus, terrasse de café, pigeons"}, "ville-3": {"note": "", "o": 3, "parent": "ville", "status": "fait", "t": 1791995968567, "title": "Jour / nuit et météo partagés"}, "ville-4": {"note": "", "o": 4, "parent": "ville", "status": "fait", "t": 1791995968567, "title": "Boutiques : graineterie, jardinerie, concessions, vêtements"}, "ville-5": {"note": "", "o": 5, "parent": "ville", "status": "reflexion", "t": 1791995968567, "title": "Nouveaux quartiers"}, "ville-6": {"note": "", "o": 6, "parent": "ville", "status": "pas", "t": 1791995968567, "title": "Feux rouges et passages piétons"}, "ville": {"color": "#7a83c4", "note": "", "o": 2, "parent": "root", "status": "", "t": 1791995968567, "title": "La ville"}};
const KEY = "carte", PKEY = "presence";
const ST = new Set(["", "fait", "pas", "reflexion"]);
const ID = /^[A-Za-z0-9_-]{1,40}$/;
const COLOR = /^#[0-9a-fA-F]{6}$/;
const MAX_NODES = 2000;

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const str = (v, n) => (typeof v === "string" ? v : "").replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, n);
const num = (v, lo, hi) => { const x = Number(v); return Number.isFinite(x) ? Math.max(lo, Math.min(hi, x)) : 0; };

function clean(id, d) {
  const n = {
    parent: id === "root" ? null : (typeof d.parent === "string" && ID.test(d.parent) ? d.parent : "root"),
    title: str(d.title, 120), note: str(d.note, 2000),
    status: ST.has(d.status) ? d.status : "",
    o: num(d.o, -1e6, 1e6), ox: Math.round(num(d.ox, -20000, 20000)), oy: Math.round(num(d.oy, -20000, 20000)),
    t: Date.now(), by: str(d.by, 20) || null,
  };
  if (typeof d.color === "string" && COLOR.test(d.color)) n.color = d.color;
  if (d.side === 1 || d.side === -1) n.side = d.side;
  return n;
}
// une idée ne peut pas devenir sa propre descendante
function makesCycle(nodes, id, parent) {
  let p = parent, k = 0;
  while (p && p !== "root" && k++ < 200) { if (p === id) return true; p = nodes[p] && nodes[p].parent; }
  return false;
}
async function readDoc(store) {
  const r = await store.getWithMetadata(KEY, { type: "json", consistency: "strong" });
  if (r && r.data && r.data.nodes) return r;
  const doc = { v: 1, nodes: SEED };
  await store.setJSON(KEY, doc, { onlyIfNew: true });
  return await store.getWithMetadata(KEY, { type: "json", consistency: "strong" });
}
async function online(store, me) {
  const r = await store.get(PKEY, { type: "json", consistency: "strong" }).catch(() => null);
  const now = Date.now(), list = [];
  for (const [c, p] of Object.entries(r || {})) if (now - p.t < 30000) list.push({ c, n: p.n || "", s: p.s || null });
  if (me && !list.some(p => p.c === me)) list.push({ c: me, n: "", s: null });
  return list;
}

export default async (req) => {
  const store = getStore({ name: "carte-narcos", consistency: "strong" });
  const url = new URL(req.url);
  if (req.method === "GET") {
    const r = await readDoc(store);
    const v = r.data.v, since = Number(url.searchParams.get("v")) || 0;
    const on = await online(store, str(url.searchParams.get("c"), 16));
    return since === v ? json({ v, same: true, online: on }) : json({ v, nodes: r.data.nodes, online: on });
  }
  if (req.method !== "POST") return json({ error: "méthode non prise en charge" }, 405);
  const raw = await req.text();
  if (raw.length > 400000) return json({ error: "trop gros" }, 413);
  let b; try { b = JSON.parse(raw); } catch { return json({ error: "JSON invalide" }, 400); }

  if (b.op === "ping") {
    const c = str(b.c, 16); if (!c) return json({ error: "client manquant" }, 400);
    const cur = (await store.get(PKEY, { type: "json", consistency: "strong" }).catch(() => null)) || {};
    const now = Date.now();
    for (const k of Object.keys(cur)) if (now - cur[k].t > 60000) delete cur[k];
    cur[c] = { n: str(b.n, 20), s: typeof b.s === "string" && ID.test(b.s) ? b.s : null, t: now };
    await store.setJSON(PKEY, cur);
    return json({ online: await online(store, c) });
  }

  for (let attempt = 0; attempt < 8; attempt++) {
    const r = await readDoc(store);
    const doc = { v: r.data.v, nodes: { ...r.data.nodes } };
    if (b.op === "set") {
      if (!ID.test(b.id || "") || !b.data || typeof b.data !== "object") return json({ error: "idée invalide" }, 400);
      if (!doc.nodes[b.id] && Object.keys(doc.nodes).length >= MAX_NODES) return json({ error: "carte pleine" }, 409);
      const n = clean(b.id, b.data);
      if (n.parent && (n.parent === b.id || makesCycle(doc.nodes, b.id, n.parent))) return json({ error: "déplacement impossible" }, 400);
      doc.nodes[b.id] = n;
    } else if (b.op === "put") {
      // plusieurs idées d'un coup (annuler / rétablir une suppression ou un déplacement)
      const src = b.nodes && typeof b.nodes === "object" && !Array.isArray(b.nodes) ? b.nodes : null;
      if (!src) return json({ error: "idées invalides" }, 400);
      const ids = Object.keys(src).filter(i => ID.test(i) && src[i] && typeof src[i] === "object").slice(0, MAX_NODES);
      for (const i of ids) { if (!doc.nodes[i] && Object.keys(doc.nodes).length >= MAX_NODES) return json({ error: "carte pleine" }, 409); doc.nodes[i] = clean(i, src[i]); }
      for (const i of ids) { const pa = doc.nodes[i].parent; if (pa && (pa === i || makesCycle(doc.nodes, i, pa))) return json({ error: "déplacement impossible" }, 400); }
    } else if (b.op === "del") {
      const ids = Array.isArray(b.ids) ? b.ids.filter(i => typeof i === "string" && ID.test(i) && i !== "root") : [];
      // retirer aussi tout ce qui était rangé dessous
      const gone = new Set(ids);let grew = true;
      while (grew) { grew = false; for (const [k, n] of Object.entries(doc.nodes)) if (!gone.has(k) && n.parent && gone.has(n.parent)) { gone.add(k); grew = true; } }
      for (const i of gone) delete doc.nodes[i];
    } else return json({ error: "opération inconnue" }, 400);
    doc.v = r.data.v + 1;
    const w = await store.setJSON(KEY, doc, { onlyIfMatch: r.etag });
    if (w.modified) return json({ v: doc.v, nodes: doc.nodes });
    await new Promise(res => setTimeout(res, 40 + Math.random() * 120));
  }
  return json({ error: "trop de modifications en même temps, réessaie" }, 409);
};

export const config = { path: "/api/carte" };
