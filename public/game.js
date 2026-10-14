/* La Serre Clandestine — version 3D (Three.js, fourni dans public/vendor).
   Tout le jeu tient dans ce fichier, découpé en sections « ---------- titre ---------- ». */
import * as THREE from './vendor/three.module.min.js';

const $=id=>document.getElementById(id);
const R=(a,b)=>a+Math.random()*(b-a);
const RI=(a,b)=>Math.floor(R(a,b+1));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const fmt=n=>Math.floor(n).toLocaleString('fr-FR')+' €';
const HALF=600,PITCH=100;
const pick=a=>a[Math.floor(Math.random()*a.length)];
const MOBILE=(()=>{try{return matchMedia('(pointer: coarse)').matches}catch(e){return false}})();
const DEBUG=/[?&]debug=1\b/.test(location.search);
const hexn=s=>parseInt(s.slice(1),16);
const hex2=h=>'#'+('000000'+h.toString(16)).slice(-6);
const rgbOf=h=>[(h>>16)&255,(h>>8)&255,h&255];
const shade=(h,f)=>{const c=rgbOf(h).map(v=>clamp(Math.round(v*f),0,255));return `rgb(${c[0]},${c[1]},${c[2]})`};
function tile(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);return c}
/* mélange déterministe (Fisher-Yates) : même résultat dans tous les navigateurs pour une même graine */
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

/* apparence des personnages */
const PLAYER_LOOK={skin:0xd7a67f,shirt:0x5a6b4a,pants:0x3d5a88,shoe:0xf1f1f1,hair:0x16110e,cap:0xd04a2a,bag:1};
const SKINS=[0xe3b895,0xc99068,0x8d5b3e,0xf0c8a5,0x6e4630],SHIRTS=[0x8c3030,0x2f5f8c,0xd8d2c4,0x3a6b4a,0x222222,0xc9962b,0x6a3f8c],PANTS=[0x2b3550,0x1d1d20,0x4a4036,0x3a4a5a];
const randLook=()=>({skin:pick(SKINS),shirt:pick(SHIRTS),pants:pick(PANTS),shoe:pick([0xf1f1f1,0x222222,0xb5452a]),hair:pick([0x16110e,0x3a2a1c,0x8a6a3a,0x111111]),cap:Math.random()<.35?pick([0xd04a2a,0x2a5ca8,0x222222]):0,bag:Math.random()<.3?1:0});
const lookKey=L=>[L.skin,L.shirt,L.pants,L.shoe,L.hair,L.cap||0,L.bag?1:0].join('.');

/* ---------- données ---------- */
const STRAINS=[
  {id:'jardin',name:'Herbe du jardin',seed:10,time:20,yield:5,price:6,unlock:0},
  {id:'skunk',name:'Skunk',seed:40,time:45,yield:8,price:10,unlock:0},
  {id:'haze',name:'Purple Haze',seed:150,time:90,yield:12,price:16,unlock:500},
  {id:'kush',name:'Kush Royale',seed:500,time:150,yield:18,price:28,unlock:2500},
  {id:'lune',name:'Lune Dorée',seed:1500,time:240,yield:25,price:55,unlock:10000},
];
const SM=Object.fromEntries(STRAINS.map(s=>[s.id,s]));
const DEFD={pm:1,heat:1,cap:0,veh:1,grow:1,seed:1,pot:1,cool:1,raid:1};
/* Un seul quartier (les Lilas), quatre secteurs, quatre gangs. Tu choisis le tien au début. */
const DIS={
  tours:{name:'Les Tours',sx:-1,sz:-1,col:'#5b8def'},
  port:{name:'Le Port',sx:1,sz:-1,col:'#2fb5a5'},
  cite:{name:'Les Jardins',sx:-1,sz:1,col:'#8fbf4a'},
  vieux:{name:'Le Vieux Centre',sx:1,sz:1,col:'#e08a3a'},
};
const BOSSES={
  tonton:{id:'tonton',name:'Papa Léon',col:'#9acd32',cn:'vert',sector:'cite',style:'Vieux jardinier, mains calleuses, parle peu.'},
  baron:{id:'baron',name:'Le Baron',col:'#5b8def',cn:'bleu',sector:'tours',style:'Costard, voix posée, jamais pressé.'},
  momo:{id:'momo',name:'Momo',col:'#2fb5a5',cn:'turquoise',sector:'port',style:'Parle fort, rit fort, n’oublie rien.'},
  vega:{id:'vega',name:'Madame Vega',col:'#e08a3a',cn:'orange',sector:'vieux',style:'Calme, froide, déjà trois coups d’avance.'},
};
const BIDS=Object.keys(BOSSES);
const GOAL=10000000,MAXSTRIKES=3;
for(const k in DIS)DIS[k]={...DEFD,...DIS[k],key:k};
/* Avantage et défaut de chaque gang (appliqués au secteur choisi au départ) */
const PERKS={
  cite:{pro:'La culture pousse 25 % plus vite.',con:'Les véhicules coûtent 15 % de plus.',mod:{grow:1.25,veh:1.15}},
  tours:{pro:'Graines et machines de culture 25 % moins chères.',con:'La chaleur monte 20 % plus vite.',mod:{seed:.75,pot:.75,heat:1.2}},
  port:{pro:'+60 de stock au départ, véhicules 15 % moins chers.',con:'La culture pousse 15 % plus lentement.',mod:{cap:60,veh:.85,grow:.85}},
  vieux:{pro:'La chaleur monte 25 % moins vite.',con:'Les graines coûtent 25 % de plus.',mod:{heat:.75,seed:1.25}},
};
for(const k in PERKS)Object.assign(DIS[k],PERKS[k].mod);
const DKEYS=Object.keys(DIS);
function districtAt(x,z){const sx=x<0?-1:1,sz=z<0?-1:1;return DKEYS.map(k=>DIS[k]).find(d=>d.sx===sx&&d.sz===sz)}
const VEH=[
  {id:'foot',name:'À pied',price:0,cap:0,vmax:11,acc:42,turn:3.4,kind:'foot',color:0xd04a2a},
  {id:'velo',name:'Vélo',price:80,cap:4,vmax:17,acc:26,turn:3.2,kind:'bike',color:0x2a8a4a},
  {id:'scooter',name:'Scooter 50',price:250,cap:8,vmax:26,acc:22,turn:2.9,kind:'scooter',color:0xd04a2a},
  {id:'clio',name:'Clio d’occasion',price:900,cap:25,vmax:44,acc:20,turn:2.3,kind:'car',color:0xb8bcc2},
  {id:'fourgon',name:'Fourgon aménagé',price:7500,cap:80,vmax:38,acc:15,turn:2.0,kind:'van',color:0xf0f0f0},
  {id:'camion',name:'Camion 19 tonnes',price:30000,cap:220,vmax:33,acc:11,turn:1.6,kind:'truck',color:0xd9822b},
  {id:'classeg',name:'Mercedes Classe G',price:95000,cap:50,vmax:66,acc:28,turn:2.1,kind:'suv',color:0x1b1b1f,fast:1},
  {id:'rs6',name:'Audi RS6',price:125000,cap:40,vmax:78,acc:38,turn:2.3,kind:'wagon',color:0x6b7b8c,fast:1},
  {id:'m5',name:'BMW M5',price:140000,cap:30,vmax:83,acc:40,turn:2.4,kind:'sedan',color:0x2447a8,fast:1},
  {id:'bugatti',name:'Bugatti Chiron',price:1500000,cap:20,vmax:115,acc:52,turn:2.5,kind:'hyper',color:0x0f2a5c,fast:1},
];
const VM=Object.fromEntries(VEH.map(v=>[v.id,v]));
const UPS=[
  {id:'labo',name:'Agrandir le labo',desc:'+4 emplacements dans le labo par niveau.',base:1200,mult:2.4,max:4},
  {id:'lamp',name:'Lampes au sodium',desc:'+30 % de vitesse de pousse par niveau, sur tout le labo.',base:250,mult:2,max:8},
  {id:'engrais',name:'Engrais bio',desc:'+20 % de rendement par niveau.',base:400,mult:2.1,max:8},
  {id:'hydro',name:'Fournisseur de graines',desc:'Les graines coûtent 12 % de moins par niveau.',base:2500,mult:2.2,max:5},
  {id:'vent',name:'Ventilation',desc:'La chaleur retombe 25 % plus vite par niveau.',base:300,mult:2,max:6},
  {id:'entrepot',name:'Entrepôt',desc:'+60 de capacité de stock par niveau.',base:500,mult:1.9,max:10},
  {id:'nego',name:'Négociation',desc:'+8 % sur tous les prix de vente par niveau.',base:1500,mult:2.2,max:8},
  {id:'moteur',name:'Préparation moteur',desc:'+4 % de vitesse et d’accélération par niveau, sur tous tes véhicules.',base:3000,mult:2.3,max:8},
  {id:'avocat',name:'Avocat véreux',desc:'Une descente te coûte moins de cash et de marchandise.',base:5000,mult:3,max:3},
];
const TEAM=[
  {id:'livreur',name:'Livreur',desc:'Une camionnette livre les commandes à ta place. Il garde 25 %.',base:2500,mult:1.7,max:10},
  {id:'jardinier',name:'Jardinier',desc:'Arrose, taille, récolte, replante (avec tes graines) et charge les séchoirs : 4 emplacements par recrue.',base:2000,mult:1.7,max:6},
  {id:'dealer',name:'Dealer de rue',desc:'Vend 3 unités toutes les 10 s à 70 % du prix.',base:3500,mult:1.75,max:10},
  {id:'guetteur',name:'Guetteur',desc:'Chaque vente attire 15 % de chaleur en moins.',base:1200,mult:2,max:5},
];
const NAMES=['Kevin du 3e','Un étudiant','Le DJ du samedi','Mamie Jacqueline','Un trader stressé','Le livreur','Une prof de yoga','Le cousin de Momo','Un rappeur local','Le voisin','Un type en trottinette','Le barman','Sofiane','Inès','Un routier','Le gérant du kebab'];

/* ---------- magasins, objets, passants ---------- */
const heatDown=n=>()=>{G.heat=Math.max(0,G.heat-n);return 'Tu te fonds dans la foule. Chaleur -'+n+'.'};
const GOODS={
  mallette:{name:'Mallette renforcée',desc:'+40 de capacité de stock.',price:3000,max:3},
  coffre:{name:'Coffre blindé',desc:'+100 de capacité de stock.',price:9000,max:3},
  brouilleur:{name:'Brouilleur radio',desc:'La chaleur retombe 30 % plus vite.',price:15000,max:2},
  pistolet:{name:'Pistolet de collection',desc:'Pièce de vitrine pour ta planque : +3 % sur tes prix de vente.',price:2500,max:1},
  fusil:{name:'Fusil de chasse ancien',desc:'Pièce de vitrine : +3 % sur tes prix de vente.',price:6500,max:1},
  carabine:{name:'Carabine de tir sportif',desc:'Pièce de vitrine : +3 % sur tes prix de vente.',price:12000,max:1},
  sacs:{name:'Sacs de congélation',desc:'+20 de capacité de stock.',price:400,max:5},
  engrais:{name:'Engrais express',desc:'Fait avancer toutes tes plantes de 30 %. Usage unique.',price:250,use:()=>{G.lab.items.forEach(it=>{const p=it.pl;if(p&&p.hp>0&&p.p<1)p.p=Math.min(1,p.p+.3)});return 'Tes plantes ont drôlement bonne mine.'}},
  tisane:{name:'Tisane apaisante',desc:'Chaleur -15. Usage unique.',price:120,use:heatDown(15)},
  lunettes:{name:'Lunettes de soleil',desc:'Chaleur -10. Usage unique.',price:150,use:heatDown(10)},
  barbe:{name:'Fausse barbe',desc:'Chaleur -25. Usage unique.',price:500,use:heatDown(25)},
  perruque:{name:'Perruque',desc:'Chaleur -40. Usage unique.',price:1200,use:heatDown(40)},
  veste_verte:{name:'Veste kaki',desc:'Ton look de départ.',price:0,look:{shirt:0x5a6b4a}},
  veste_noire:{name:'Veste noire',desc:'Look : veste noire.',price:250,look:{shirt:0x222222}},
  veste_rouge:{name:'Veste bordeaux',desc:'Look : veste bordeaux.',price:250,look:{shirt:0x8c3030}},
  veste_blanche:{name:'Veste crème',desc:'Look : veste claire.',price:300,look:{shirt:0xd8d2c4}},
  jean_bleu:{name:'Jean bleu',desc:'Ton look de départ.',price:0,look:{pants:0x3d5a88}},
  jean_noir:{name:'Pantalon noir',desc:'Look : pantalon noir.',price:200,look:{pants:0x1d1d20}},
  cargo:{name:'Pantalon cargo',desc:'Look : pantalon marron.',price:220,look:{pants:0x4a4036}},
  casq_rouge:{name:'Casquette rouge',desc:'Ton look de départ.',price:0,look:{cap:0xd04a2a}},
  casq_bleue:{name:'Casquette bleue',desc:'Look : casquette bleue.',price:120,look:{cap:0x2a5ca8}},
  casq_noire:{name:'Casquette noire',desc:'Look : casquette noire.',price:120,look:{cap:0x222222}},
  nu_tete:{name:'Pas de casquette',desc:'Look : tête nue.',price:0,look:{cap:0}},
};
const SHOPTYPES={
  banque:{label:'Banque',short:'Banque',col:'#d9b020',floor:'#2e2a22',deco:'vitrines',items:['#d9b020','#b8ab8a','#e9e2d0','#8a6d1c'],bank:1,
    names:['Banque Centrale'],clerks:['M. Duval'],
    greet:['« Bienvenue à la Banque Centrale. Nous ne posons pas de questions. »'],
    talk:['« L’argent au coffre ne craint pas les descentes de police. »','« Discrétion assurée. Nos coffres ont vu passer bien pire que vous. »']},
  armurerie:{label:'Armurerie',short:'Armurerie',col:'#c0392b',floor:'#2b2523',deco:'vitrines',items:['#5a5f66','#7b8088','#3d4147','#8a6a3a'],
    goods:['mallette','coffre','brouilleur','pistolet','fusil','carabine'],names:['Armurerie Lefort','Armurerie du Calibre'],clerks:['Gaston','Bernard'],
    greet:['« Bienvenue. On regarde, on ne touche pas. »','« Une pièce de collection ? Vous êtes au bon endroit. »'],
    talk:['« Le coffre blindé, c’est mon best-seller. Rien ne passe à travers. »','« Les collectionneurs paient bien. Une vitrine, ça fait respectable. »']},
  superette:{label:'Supérette',short:'Supérette',col:'#2e8b57',floor:'#2a3a30',deco:'rayons',items:['#e0b020','#c0392b','#3b6fd4','#f1e8d6'],
    goods:['sacs','engrais','tisane'],names:['Mini-Marché 24h','Supérette Chez Ali','Épicerie du Coin'],clerks:['Ali','Mireille','Hakim'],
    greet:['« Bonjour ! Besoin de quelque chose ? »','« On ferme jamais. Même la nuit. »'],
    talk:['« Le quartier a changé. Les clients ne sont plus les mêmes. »','« Je vois tout passer ici. Tout. »']},
  jardinerie:{label:'Jardinerie',short:'Jardinerie',col:'#6aa84f',floor:'#2c3a24',deco:'plantes',items:['#6aa84f','#8fbf4a','#c98aff','#e0b020'],
    menu:'shop',menuLabel:'Voir le matériel',names:['Jardinerie des Lilas'],clerks:['Rosalie'],
    greet:['« Des pots, des séchoirs, des graines. Dites-moi ce qu’il vous faut. »'],
    talk:['« Une bonne ventilation, voilà le secret. Et ne dites pas que c’est moi qui l’ai dit. »']},
  concession:{label:'Concession auto',short:'Concession',col:'#3b6fd4',floor:'#262a33',deco:'voiture',items:['#c0c4ca','#3b6fd4','#222','#c0392b'],
    menu:'garage',menuLabel:'Voir les véhicules',names:['Auto Lilas','Garage du Port'],clerks:['Stéphane','Nadia'],
    greet:['« Une belle voiture, ça change une vie. Regardez-moi ça. »'],
    talk:['« La Bugatti ? Je n’en ai vendu qu’une. Le client n’a jamais dit ce qu’il faisait. »']},
  bar:{label:'Bar',short:'Bar',col:'#d4872b',floor:'#3a2a1c',deco:'bar',items:['#2e8b57','#d4872b','#c0392b','#e0d6a0'],
    menu:'team',menuLabel:'Recruter du monde',names:['Le Bon Coin','Chez Marcel'],clerks:['Marcel','Josiane'],
    greet:['« Qu’est-ce que je te sers ? »','« Assieds-toi. Ici, on parle franchement. »'],
    talk:['« Les bons éléments traînent ici. Il suffit de savoir les choisir. »','« Un verre, une info. C’est comme ça que ça marche. »']},
  vetements:{label:'Boutique de vêtements',short:'Vêtements',col:'#b05bd1',floor:'#30263a',deco:'portants',items:['#b05bd1','#222','#8c3030','#2f5f8c'],
    goods:['veste_noire','veste_rouge','veste_blanche','veste_verte','jean_noir','cargo','jean_bleu','casq_bleue','casq_noire','casq_rouge','nu_tete'],
    names:['Fripe & Co','Le Dressing'],clerks:['Capucine','Lucien'],
    greet:['« Un nouveau look, ça aide à passer inaperçu. »','« Essayez, essayez. Les cabines sont au fond. »'],
    talk:['« Les flics reconnaissent les gens aux vêtements. Change de temps en temps. »']},
  graineterie:{label:'Graineterie',short:'Graines',col:'#9a8a2e',floor:'#33301e',deco:'graines',items:['#8fbf4a','#c9a05a','#e0b020','#6aa84f','#b98a5a'],
    menu:'shop',menuLabel:'Voir les graines',names:['Graineterie Verte','La Bonne Graine'],clerks:['Gaspard','Lucie'],
    greet:['« Des graines de toutes les variétés, gardées au frais et au sec. »','« Bonjour ! Vous cherchez quelle variété ? »'],
    talk:['« Plus la graine est chère, plus elle rapporte. Mais plus elle met de temps à pousser. »','« Arrosez régulièrement et taillez à mi-pousse : ça change tout. »']},
  deguisement:{label:'Magasin de déguisements',short:'Déguisement',col:'#e0b020',floor:'#3a3320',deco:'rayons',items:['#e0b020','#c0392b','#b05bd1','#2e8b57'],
    goods:['lunettes','barbe','perruque'],names:['Farces & Attrapes','Le Carnaval'],clerks:['Pierrot','Colombine'],
    greet:['« Mardi gras, c’est toute l’année ici ! »'],
    talk:['« Personne ne pose de questions à un homme avec une perruque. »']},
};
const SHOP_PLAN=[['bar','tours'],['superette','tours'],['deguisement','port'],['armurerie','port'],['bar','port'],['armurerie','port'],['vetements','cite'],['superette','cite'],['jardinerie','cite'],['concession','vieux'],['vetements','vieux'],['superette','vieux'],['deguisement','vieux'],['graineterie','cite'],['graineterie','tours'],['concession','port']];
const PNAMES=[['Léa','f'],['Hugo','m'],['Nadia','f'],['Karim','m'],['Chloé','f'],['Maxime','m'],['Fatou','f'],['Théo','m'],['Camille','f'],['Yanis','m'],['Sarah','f'],['Lucas','m'],['Inès','f'],['Mathis','m'],['Julie','f'],['Omar','m'],['Manon','f'],['Adel','m'],['Éva','f'],['Paul','m'],['Rose','f'],['Bastien','m'],['Lina','f'],['Gilles','m']];
const GREETS=['Salut !','Bonjour','Hey','Yo','Ça va ?','Bonsoir'];
const PKINDS={
  etudiant:{label:['Étudiant','Étudiante'],acc:.7,hi:['« Salut ! T’as une minute ? »','« Yo, ça va ? »'],chat:['« Les partiels me tuent. Je dors trois heures par nuit. »','« Ma coloc est un enfer. Elle laisse tout traîner. »','« Je cherche un job, mais personne ne veut de moi. »']},
  retraite:{label:['Retraité','Retraitée'],acc:.1,hi:['« Bonjour, jeune homme. Beau temps, non ? »','« Ah, un visage connu. »'],chat:['« De mon temps, ce quartier était calme. »','« Les jardins étaient plus beaux avant. »','« Je donne du pain aux pigeons tous les matins. »']},
  commercant:{label:['Commerçant','Commerçante'],acc:.35,hi:['« Bonjour ! Les affaires, ça va ? »','« Tiens, notre voisin ! »'],chat:['« Les loyers montent, les clients se font rares. »','« On dit que les gangs ne se battent plus. Tant mieux pour le commerce. »','« Je ferme à vingt heures. Après, c’est le quartier qui prend le relais. »']},
  sportif:{label:['Sportif','Sportive'],acc:.25,hi:['« Salut. Je finis mon tour du quartier. »','« Hey ! Tu cours aussi ? »'],chat:['« Quarante minutes tous les matins. Ça change une vie. »','« Je prépare un semi-marathon. »','« Fais gaffe aux voitures sur le boulevard, ça roule vite. »']},
  touriste:{label:['Touriste','Touriste'],acc:.5,hi:['« Excusez-moi, vous parlez français ? »','« Bonjour ! Belle ville ! »'],chat:['« On m’avait dit que les Lilas étaient dangereux. Je trouve ça charmant. »','« Je cherche un bon restaurant. Vous connaissez ? »','« Les gens sont tellement gentils ici. »']},
  ouvrier:{label:['Ouvrier','Ouvrière'],acc:.5,hi:['« Ça va ? Journée longue... »','« Salut, la forme ? »'],chat:['« Cinq heures de la mat’ tous les jours. Mon dos me lâche. »','« Au port, ça bouge. Plein de camions. »','« Un petit coup de pouce après le boulot, ça ne se refuse pas. »']},
  fetard:{label:['Fêtard','Fêtarde'],acc:.85,hi:['« Ouais ! Y a une soirée ce soir ! »','« Hey toi ! T’as l’air cool ! »'],chat:['« Hier soir c’était complètement dingue. »','« Je connais tous les barmans du quartier. »','« Le DJ du samedi, il est génial. »']},
};


/* ---------- machines du labo ---------- */
/* culture : accueille une plante (vitesse, rendement, soif) · eau : arrose les emplacements autour · transfo : transforme la récolte en produit vendable */
const MACH=[
  {id:'pot',cat:'culture',name:'Pot en terre',tier:1,price:30,speed:1,yld:1,thirst:1,desc:'Une plante. L’entrée de gamme.'},
  {id:'bac',cat:'culture',name:'Bac éclairé',tier:2,price:450,speed:1.4,yld:1.15,thirst:.9,desc:'Lampe intégrée : pousse +40 %, rendement +15 %.'},
  {id:'table',cat:'culture',name:'Table hydroponique',tier:3,price:4000,speed:1.9,yld:1.35,thirst:.45,desc:'Pousse +90 %, rendement +35 %, boit deux fois moins.'},
  {id:'arroseur',cat:'eau',name:'Arroseur automatique',tier:1,price:700,radius:1,desc:'Arrose tout seul les 8 emplacements autour de lui.'},
  {id:'arroseur2',cat:'eau',name:'Arroseur pro',tier:2,price:5000,radius:2,desc:'Arrose tout seul les 24 emplacements autour de lui.'},
  {id:'sechoir',cat:'transfo',name:'Séchoir artisanal',tier:1,price:60,batch:10,time:25,bonus:1,desc:'Transforme jusqu’à 10 unités de récolte en produit vendable, en 25 s.'},
  {id:'sechoir2',cat:'transfo',name:'Séchoir à air pulsé',tier:2,price:2500,batch:30,time:18,bonus:1.1,desc:'30 unités par fournée, 18 s, et 10 % de produit en plus.'},
  {id:'sechoir3',cat:'transfo',name:'Séchoir industriel',tier:3,price:20000,batch:80,time:12,bonus:1.2,desc:'80 unités par fournée, 12 s, et 20 % de produit en plus.'},
];
const MM=Object.fromEntries(MACH.map(m=>[m.id,m]));

/* ---------- état ---------- */
const KEY='serre3d-v1';
const LAB_COLS=6,LAB_ROWS=4,LAB_MAX=LAB_COLS*LAB_ROWS;
/* au départ, le labo a déjà un pot, un séchoir, un robinet (arrosoir plein) et quelques graines */
const CAN_MAX=8;
const newG=(home='cite')=>({v:5,home,inv:{},look:{},began:0,cash:150,bank:0,heat:0,hp:100,strikes:0,strikeT:0,t:0,sel:'jardin',
  seeds:{jardin:3},raw:{},stock:{},lv:{},unlocked:{jardin:1,skunk:1},owned:{foot:1},veh:'foot',earned:0,can:CAN_MAX,deliv:[],
  lab:{items:[{id:'pot',slot:2,pl:null},{id:'sechoir',slot:5,pl:null}],store:{}},
  rel:{baron:0,momo:0,vega:0,tonton:0},ally:{},
  retired:Object.fromEntries(BIDS.filter(b=>BOSSES[b].sector===home).map(b=>[b,1])),
  own:Object.fromEntries(DKEYS.map(k=>[k,k===home?'you':BIDS.find(b=>BOSSES[b].sector===k)]))});
/* anciennes sauvegardes : v4 (2D, pots dans un menu) → v5 (labo en 3D) */
function migrate(g){
  g.home=g.home||'cite';g.inv=g.inv||{};g.look=g.look||{};g.bank=g.bank||0;g.lv=g.lv||{};g.owned=g.owned||{foot:1};g.unlocked=g.unlocked||{jardin:1,skunk:1};
  g.rel=g.rel||{};g.ally=g.ally||{};g.retired=g.retired||{};g.own=g.own||{};
  for(const id of BIDS)g.rel[id]=clamp(g.rel[id]||0,-100,100);
  for(const k of DKEYS)if(!g.own[k])g.own[k]=BIDS.find(b=>BOSSES[b].sector===k);
  g.own[g.home]='you';
  const hb=BIDS.find(b=>BOSSES[b].sector===g.home);if(hb)g.retired[hb]=1;
  if(g.v===4){
    const old=Array.isArray(g.pots)?g.pots:[];
    g.v=5;g.seeds={};g.raw={};g.lab={items:[],store:{sechoir:1}};
    g.lv.labo=Math.min(4,Math.floor((g.lv.pot||0)/5));delete g.lv.pot;
    const n=8+4*g.lv.labo;
    old.forEach((p,i)=>{
      if(i<n)g.lab.items.push({id:'pot',slot:i,pl:p&&SM[p.s]?{s:p.s,p:clamp(+p.p||0,0,1),w:100,hp:100,pr:0}:null});
      else g.lab.store.pot=(g.lab.store.pot||0)+1});
    g.seeds[SM[g.sel]?g.sel:'jardin']=5;delete g.pots;
  }
  g.seeds=g.seeds||{};g.raw=g.raw||{};g.stock=g.stock||{};
  g.lab=g.lab&&typeof g.lab==='object'?g.lab:{items:[],store:{}};
  g.lab.store=g.lab.store||{};
  const used=new Set();
  g.lab.items=(Array.isArray(g.lab.items)?g.lab.items:[]).filter(it=>{
    if(!it||!MM[it.id]||!Number.isInteger(it.slot)||it.slot<0||it.slot>=LAB_MAX||used.has(it.slot))return false;
    used.add(it.slot);if(it.pl&&!SM[it.pl.s])it.pl=null;if(it.b&&!SM[it.b.s])it.b=null;return true});
  if(!SM[g.sel])g.sel='jardin';
  g.can=clamp(typeof g.can==='number'?g.can:CAN_MAX,0,CAN_MAX);
  g.deliv=(Array.isArray(g.deliv)?g.deliv:[]).filter(d=>d&&(d.k==='m'?MM[d.id]:SM[d.id])&&d.n>0);
  if(!g.owned[g.veh])g.veh='foot';
}
let G=null;
try{G=JSON.parse(localStorage.getItem(KEY))}catch(e){}
if(!G||(G.v!==4&&G.v!==5)||typeof G.cash!=='number')G=newG();else migrate(G);
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(G))}catch(e){}};
const lv=id=>G.lv[id]||0;
const inv=id=>(G.inv&&G.inv[id])||0;
const H=()=>DIS[G.home||'cite'];
const ownerOf=(x,z)=>G.own[districtAt(x,z).key];
const mySectors=()=>DKEYS.filter(k=>G.own[k]==='you').length;
const stance=id=>G.ally[id]?'ally':(G.rel[id]||0)<=-50?'war':(G.rel[id]||0)<=-15?'hostile':'neutral';
const addRel=(id,n)=>{
  const s0=stance(id);G.rel[id]=clamp((G.rel[id]||0)+n,-100,100);const s1=stance(id);
  if(s0===s1||G.retired[id])return;
  const b=BOSSES[id],sec=DIS[b.sector].name;
  if(s1==='war')toast(`${b.name} te déclare la guerre. Ses hommes te tireront dessus partout dans le quartier.`,'bad');
  else if(s1==='hostile'&&s0!=='war')toast(`${b.name} ne t’aime pas. Ses hommes te chasseront dans ${sec}.`,'bad');
  else if(s1==='hostile')toast(`${b.name} se calme un peu, mais évite ${sec}.`);
  else if(s1==='neutral')toast(`${b.name} passe l’éponge. Plus de menace de ce côté.`,'good');
};
const mot=()=>1+.04*lv('moteur');
const sumS=o=>STRAINS.reduce((a,s)=>a+(o[s.id]||0),0);
const tot=()=>sumS(G.stock);          // produit fini, vendable
const rawTot=()=>sumS(G.raw);         // récolte à transformer
const seedTot=()=>sumS(G.seeds);
const cap=()=>40+H().cap+60*lv('entrepot')+100*inv('coffre')+40*inv('mallette')+20*inv('sacs')+VEH.reduce((a,v)=>a+(G.owned[v.id]?v.cap:0),0);
const labSlots=()=>Math.min(LAB_MAX,8+4*lv('labo'));
const gspeed=()=>(1+.3*lv('lamp'))*H().grow;
const yieldMult=()=>1+.2*lv('engrais');
const seedCost=s=>Math.max(1,Math.round(s.seed*H().seed*(1-.12*lv('hydro'))));
const machPrice=m=>Math.round(m.price*(m.cat==='culture'?H().pot:1));
const priceMult=()=>(1+.08*lv('nego'))*(1+.03*(inv('pistolet')+inv('fusil')+inv('carabine')))*(1+.1*(mySectors()-1));
const upCost=u=>Math.round(u.base*Math.pow(u.mult,lv(u.id)));
const tmCost=u=>Math.round(u.base*Math.pow(u.mult,lv(u.id)));
const vPrice=v=>Math.round(v.price*H().veh);
const heatMult=()=>H().heat*Math.max(.2,1-.15*lv('guetteur'));

/* ---------- monde : la ville (routes courbes, rivière, mer, port, parc, place, banque) ---------- */
/* repère : x vers l'est, z vers le sud, en mètres, de -600 à 600. Rond-point au centre (0,0).
   Les Tours au nord-ouest, Le Port au nord-est (la mer à l'est), Les Jardins au sud-ouest, Le Vieux Centre au sud-est.
   La rivière « La Sinueuse » traverse la ville d'ouest en est au nord du rond-point et se jette dans la mer. */
const BLK={};
const addRect=(i,j,r)=>{(BLK[i+','+j]=BLK[i+','+j]||[]).push(r)};
function addRectAll(r){const i0=Math.floor((r.x0+HALF)/PITCH),i1=Math.floor((r.x1+HALF)/PITCH),j0=Math.floor((r.z0+HALF)/PITCH),j1=Math.floor((r.z1+HALF)/PITCH);
  for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++)addRect(i,j,r)}
const PAL={tours:[0x8391b4,0x9aa6c4,0x6f7ea3,0xaab4cc],port:[0x4f8a8a,0x5f9a96,0x6d8f94,0x3f7478],cite:[0xe3cfa6,0xd9c194,0xefdcb8,0xcdb489],vieux:[0xc4683e,0xb85c3a,0xd47c4c,0xa95536]};
const HGT={tours:[30,100],port:[8,16],cite:[6,10],vieux:[12,30]};
const GROUND={tours:'rgba(48,60,92,.62)',port:'rgba(34,92,98,.58)',cite:'rgba(70,120,45,.10)',vieux:'rgba(150,106,64,.5)'};
function sty(h){return h}
const jit=h=>{const f=R(.93,1.07),c=rgbOf(h).map(v=>clamp(Math.round(v*f),0,255));return (c[0]<<16)|(c[1]<<8)|c[2]};
const BL=[];for(let i=0;i<144;i++)BL.push({bld:[],trees:[],cars:[],cont:[]});
const binOf=(x,z)=>BL[clamp(Math.floor((x+HALF)/PITCH),0,11)*12+clamp(Math.floor((z+HALF)/PITCH),0,11)];
const lampList=[];
const CARK=['car','car','sedan','wagon','suv','van'];
const CARCOLS=[0x8a2a2a,0x2a4a8a,0xbdbdbd,0x1c1c1f,0x6d7a6a,0xd9d4c0,0x4a4a52,0xa86b2a,0x3d6b5a,0xe8e8ea];
const RPROP=[0x777b82,0x8a8f96,0x5f646b,0x9aa0a6];

/* --- grille d'occupation (3 m) : 0 sol, 1 route, 2 eau, 3 réservé, 4 bâti, 5 ponton --- */
const MS=3,MN=400,MASK=new Uint8Array(MN*MN);
const mc=v=>clamp(Math.floor((v+600)/MS),0,MN-1);
const maskAt=(x,z)=>MASK[mc(z)*MN+mc(x)];
const waterAt=(x,z)=>maskAt(x,z)===2;
function segDist(px,pz,ax,az,bx,bz){const dx=bx-ax,dz=bz-az,l2=dx*dx+dz*dz;let t=l2?((px-ax)*dx+(pz-az)*dz)/l2:0;t=clamp(t,0,1);return Math.hypot(px-ax-dx*t,pz-az-dz*t)}
function rasterLine(pts,hw,fn,closed){
  const n=pts.length;
  for(let k=0;k<n-(closed?0:1);k++){const a=pts[k],b=pts[(k+1)%n];
    const i0=mc(Math.min(a[0],b[0])-hw),i1=mc(Math.max(a[0],b[0])+hw),j0=mc(Math.min(a[1],b[1])-hw),j1=mc(Math.max(a[1],b[1])+hw);
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const x=-600+(i+.5)*MS,z=-600+(j+.5)*MS;if(segDist(x,z,a[0],a[1],b[0],b[1])<=hw)fn(j*MN+i)}}
}
function inPoly(x,z,P){let c=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const a=P[i],b=P[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])c=!c}return c}
function rasterPoly(P,fn){let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;for(const p of P){x0=Math.min(x0,p[0]);x1=Math.max(x1,p[0]);z0=Math.min(z0,p[1]);z1=Math.max(z1,p[1])}
  for(let j=mc(z0);j<=mc(z1);j++)for(let i=mc(x0);i<=mc(x1);i++){const x=-600+(i+.5)*MS,z=-600+(j+.5)*MS;if(inPoly(x,z,P))fn(j*MN+i)}}
function rasterEll(cx,cz,rx,rz,fn){for(let j=mc(cz-rz);j<=mc(cz+rz);j++)for(let i=mc(cx-rx);i<=mc(cx+rx);i++){const x=-600+(i+.5)*MS,z=-600+(j+.5)*MS;if(((x-cx)/rx)**2+((z-cz)/rz)**2<=1)fn(j*MN+i)}}
function rasterRect(x0,z0,x1,z1,fn){for(let j=mc(z0);j<=mc(z1);j++)for(let i=mc(x0);i<=mc(x1);i++)fn(j*MN+i)}
function rectFree(x0,z0,x1,z1,m){for(let j=mc(z0-m);j<=mc(z1+m);j++)for(let i=mc(x0-m);i<=mc(x1+m);i++)if(MASK[j*MN+i])return false;return x0-m>-598&&x1+m<598&&z0-m>-598&&z1+m<598}

/* --- courbes --- */
function smooth(c,step,closed){
  const out=[],n=c.length;
  if(n===2&&!closed){const l=Math.hypot(c[1][0]-c[0][0],c[1][1]-c[0][1]),k=Math.max(1,Math.ceil(l/step));for(let i=0;i<=k;i++)out.push([c[0][0]+(c[1][0]-c[0][0])*i/k,c[0][1]+(c[1][1]-c[0][1])*i/k]);return out}
  const g=i=>closed?c[(i+n)%n]:c[clamp(i,0,n-1)];
  for(let s=0;s<(closed?n:n-1);s++){
    const p0=g(s-1),p1=g(s),p2=g(s+1),p3=g(s+2),l=Math.hypot(p2[0]-p1[0],p2[1]-p1[1]),k=Math.max(1,Math.ceil(l/step));
    for(let i=0;i<k;i++){const t=i/k,t2=t*t,t3=t2*t;
      out.push([0,1].map(d=>.5*((2*p1[d])+(-p0[d]+p2[d])*t+(2*p0[d]-5*p1[d]+4*p2[d]-p3[d])*t2+(-p0[d]+3*p1[d]-3*p2[d]+p3[d])*t3)))}
  }
  if(!closed)out.push(c[n-1].slice());
  return out;
}
const circlePts=(cx,cz,r,n)=>{const o=[];for(let i=0;i<n;i++){const a=i/n*Math.PI*2;o.push([cx+Math.cos(a)*r,cz+Math.sin(a)*r])}return o};

/* --- géographie --- */
const RIVER={w:26,pts:smooth([[-640,-125],[-480,-172],[-330,-140],[-180,-188],[-40,-152],[90,-178],[230,-150],[330,-168],[440,-158]],8)};
const SEA=[[362,-640],[640,-640],[640,-70],[560,-82],[480,-108],[420,-140],[378,-190],[362,-260]];
const LAKE={x:-430,z:455,rx:68,rz:46};
const PARK={x0:-575,z0:330,x1:-290,z1:585};
const ALLOT={x0:-270,z0:470,x1:-175,z1:565};
const PLAZA={x:230,z:300,r:42};
const ISLAND={x:0,z:0,r:20};
const LIGHTHOUSE={x:520,z:-450,r:30};
const QGP={tours:[-300,-345],port:[178,-385],cite:[-420,95],vieux:[410,330]};
const LBLP={tours:[-300,-470],port:[200,-505],cite:[-380,235],vieux:[380,440]};
const BANK={x:96,z:-72,w:40,l:28};
const PIERS=[-250,-340,-430,-520].map(z=>({x0:352,x1:478,z0:z-6,z1:z+6}));
const BOATS=[{x:440,z:-292,th:1.2,l:14,c:0xe8e8ea},{x:500,z:-380,th:-.3,l:10,c:0xc0392b},{x:430,z:-475,th:1.5,l:18,c:0x2d5a8a},{x:560,z:-300,th:.4,l:9,c:0xe8e8ea},{x:470,z:-560,th:-1.2,l:12,c:0xd9b020},{x:580,z:-180,th:2,l:22,c:0x3a3d42,mv:1}];
const CRANES=[{x:470,z:-250},{x:470,z:-430}];

/* --- routes : grandes avenues (w 20) et rues (w 16) --- */
const ROADS=[];
function road(ctrl,w,o){o=o||{};const pts=o.raw?ctrl:smooth(ctrl,8,o.closed);ROADS.push({pts,w,major:w>=18,closed:!!o.closed,name:o.name||''})}
road(circlePts(0,0,31,28),18,{raw:1,closed:1,name:'Rond-point'});
road([[0,-31],[0,-200],[-8,-400],[0,-610]],20,{name:'Avenue Centrale'});
road([[31,0],[200,12],[400,-8],[610,0]],20,{name:'Boulevard de l’Est'});
road([[-22,22],[-150,120],[-330,205],[-610,250]],20,{name:'Allée des Jardins'});
road([[0,31],[30,200],[12,400],[0,610]],20,{name:'Rue du Marché'});
road([[-31,0],[-220,-10],[-420,28],[-610,20]],20,{name:'Rue de l’Ouest'});
road([[22,-22],[140,-120],[220,-260],[238,-420],[230,-610]],20,{name:'Quai du Port'});
road(circlePts(0,0,330,72),20,{raw:1,closed:1,name:'Boulevard Circulaire'});
// Les Tours : quadrillage serré
for(const z of [-520,-420,-320,-235])road([[-610,z],[-6,z]],16);
for(const x of [-500,-380,-260,-140])road([[x,-610],[x,-235]],16);
// Le Port : rues jusqu'aux pontons
for(const z of [-520,-430,-340,-250])road([[4,z],[356,z]],16);
for(const x of [110,300])road([[x,-610],[x,-205]],16);
// Les Jardins : petites rues
road([[-560,26],[-560,320]],16);road([[-462,32],[-470,310]],16);road([[-250,10],[-235,150]],16);
road([[-292,300],[-120,322],[-14,328]],16);road([[-120,175],[-118,450],[-150,610]],16);
// Le Vieux Centre : rues autour de la place
road([[24,180],[150,248],[190,298]],16);road([[270,300],[330,250],[470,205],[610,212]],16);
road([[120,48],[112,300],[92,610]],16);road([[16,450],[300,432],[610,462]],16);
road([[510,6],[530,250],[500,610]],16);road([[230,8],[234,150],[230,258]],16);road([[230,342],[240,440]],16);

function genWorld(){
  const W=i=>{MASK[i]=2},Rv=i=>{MASK[i]=3};
  rasterPoly(SEA,W);rasterLine(RIVER.pts,RIVER.w/2,W);rasterEll(LAKE.x,LAKE.z,LAKE.rx,LAKE.rz,W);
  // ponts : on note où les routes passent au-dessus de l'eau
  for(const r of ROADS)r.wet=r.pts.map(p=>waterAt(p[0],p[1]));
  for(const r of ROADS)rasterLine(r.pts,r.w/2,i=>{MASK[i]=1},r.closed);
  for(const p of PIERS)rasterRect(p.x0,p.z0,p.x1,p.z1,i=>{MASK[i]=5});
  rasterEll(ISLAND.x,ISLAND.z,ISLAND.r,ISLAND.r,Rv);
  rasterRect(PARK.x0,PARK.z0,PARK.x1,PARK.z1,i=>{if(MASK[i]===0)MASK[i]=3});
  rasterRect(ALLOT.x0,ALLOT.z0,ALLOT.x1,ALLOT.z1,i=>{if(MASK[i]===0)MASK[i]=3});
  rasterEll(PLAZA.x,PLAZA.z,PLAZA.r,PLAZA.r,i=>{if(MASK[i]===0)MASK[i]=3});
  rasterEll(LIGHTHOUSE.x,LIGHTHOUSE.z,LIGHTHOUSE.r,LIGHTHOUSE.r,i=>{MASK[i]=3});
  for(const k in QGP){const q=QGP[k];rasterRect(q[0]-24,q[1]-24,q[0]+24,q[1]+24,i=>{if(MASK[i]===0)MASK[i]=3})}
  // collisions fixes : îlot du rond-point, fontaine, phare (l'île), bords de la mer gérés par l'eau
  addRectAll({x0:-13,x1:13,z0:-13,z1:13,h:1.4});
  // la Banque Centrale
  {const b=BANK;mkBld(b.x,b.z,b.w,b.l,14,0xe9e2d0,{bank:1})}
  // bâtiments par quartier
  const SPEC={tours:{st:36,w:[20,30],p:.92},port:{st:32,w:[16,28],p:.8},cite:{st:24,w:[9,15],p:.5},vieux:{st:22,w:[11,19],p:.85}};
  for(const k of DKEYS){
    const d=DIS[k],sp=SPEC[k],[h0,h1]=HGT[k],pal=PAL[k];
    const xa=d.sx<0?-596:4,xb=d.sx<0?-4:596,za=d.sz<0?-596:4,zb=d.sz<0?-4:596;
    for(let z=za;z<zb;z+=sp.st)for(let x=xa;x<xb;x+=sp.st){
      if(Math.random()>sp.p)continue;
      const w=R(sp.w[0],sp.w[1]),l=R(sp.w[0],sp.w[1]),cx=x+sp.st/2+R(-3,3),cz=z+sp.st/2+R(-3,3);
      if(k==='port'&&Math.random()<.28){mkYard(cx,cz);continue}
      if(!rectFree(cx-w/2,cz-l/2,cx+w/2,cz+l/2,3))continue;
      mkBld(cx,cz,w,l,R(h0,h1),pick(pal));
    }
  }
  // arbres : parc, jardins, avenues
  const tc=()=>pick([0x3f7a2a,0x4f8a2f,0x2f6a2a,0x5f8f35]);
  for(let n=0;n<170;n++){const x=R(PARK.x0+6,PARK.x1-6),z=R(PARK.z0+6,PARK.z1-6);
    if(((x-LAKE.x)/(LAKE.rx+8))**2+((z-LAKE.z)/(LAKE.rz+8))**2<1)continue;if(Math.abs(x-(PARK.x0+PARK.x1)/2)<5||Math.abs(z-(PARK.z0+PARK.z1)/2+20)<5)continue;
    binOf(x,z).trees.push({x,z,s:R(.8,1.4),c:tc()})}
  for(let n=0;n<420;n++){const x=R(-596,-6),z=R(6,596);if(maskAt(x,z)!==0)continue;binOf(x,z).trees.push({x,z,s:R(.55,1.05),c:tc()})}
  for(let n=0;n<120;n++){const x=R(6,596),z=R(6,596);if(maskAt(x,z)!==0||Math.random()<.5)continue;binOf(x,z).trees.push({x,z,s:R(.5,.8),c:tc()})}
  for(const r of ROADS){if(!r.major||r.closed&&r.pts.length<40)continue;
    for(let k=0;k<r.pts.length;k+=3){const a=r.pts[k],b=r.pts[Math.min(k+1,r.pts.length-1)];if(a===b)continue;const dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz)||1;
      for(const s of [-1,1]){const x=a[0]-dz/l*s*(r.w/2+5),z=a[1]+dx/l*s*(r.w/2+5);if(maskAt(x,z)===0&&Math.random()<.55)binOf(x,z).trees.push({x,z,s:R(.55,.8),c:tc()})}}}
  // voitures garées le long des rues
  for(const r of ROADS){if(r.major)continue;
    for(let k=2;k<r.pts.length-2;k++){if(Math.random()>.2)continue;const a=r.pts[k-1],b=r.pts[k+1];const dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz)||1;
      const s=Math.random()<.5?-1:1,x=r.pts[k][0]-dz/l*s*(r.w/2-1.5),z=r.pts[k][1]+dx/l*s*(r.w/2-1.5);
      if(maskAt(x,z)!==1||ROADS.some(o=>o!==r&&o.pts.some(p=>Math.abs(p[0]-x)<24&&Math.abs(p[1]-z)<24)))continue;
      const along=Math.abs(dx)>Math.abs(dz),hw=along?2.3:.95,hl=along?.95:2.3,th=Math.atan2(dx/l*(Math.random()<.5?1:-1),dz/l);
      const B=binOf(x,z);if(B.cars.some(c=>Math.hypot(c.x-x,c.z-z)<7))continue;
      B.cars.push({x,z,th:along?(dx>0?Math.PI/2:-Math.PI/2)*(Math.random()<.5?1:-1):(Math.random()<.5?0:Math.PI),k:pick(CARK),c:pick(CARCOLS)});
      addRectAll({x0:x-hw,x1:x+hw,z0:z-hl,z1:z+hl,h:1.7})}}
  // lampadaires
  for(const r of ROADS){let side=1;for(let k=0;k<r.pts.length-1;k+=5){const a=r.pts[k],b=r.pts[k+1],dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz)||1;side=-side;
    const nx=-dz/l*side,nz=dx/l*side,px=a[0]+nx*(r.w/2+1.8),pz=a[1]+nz*(r.w/2+1.8),m=maskAt(px,pz);if(m===2||m===4||m===5)continue;
    lampList.push({px,pz,ax:px-nx*2.6,az:pz-nz*2.6})}}
}
function mkBld(x,z,w,l,h,hex,o){
  w=Math.max(8,Math.round(w/2)*2);l=Math.max(8,Math.round(l/2)*2);h=Math.max(6,Math.round(h/3.5)*3.5);
  const col=o&&o.bank?hex:jit(hex),b={x0:x-w/2,x1:x+w/2,z0:z-l/2,z1:z+l/2,h,col,st:sty(col),props:[],tier:null,off:RI(0,2),litD:[1.7,1.3+3*RI(1,2)],offs:R(0,9),shop:null,bank:o&&o.bank};
  if(!b.bank){const n=RI(1,3);for(let k=0;k<n;k++){const bw=R(1.6,Math.min(3.4,w/4)),bl=R(1.6,Math.min(3.4,l/4));const px=x+R(-w/2+bw+.5,w/2-bw-.5),pz=z+R(-l/2+bl+.5,l/2-bl-.5);b.props.push({x0:px-bw/2,x1:px+bw/2,z0:pz-bl/2,z1:pz+bl/2,h:R(.9,2),st:sty(pick(RPROP))})}}
  if(h>40){const w2=w*.6,l2=l*.6;b.tier={x0:x-w2/2,x1:x+w2/2,z0:z-l2/2,z1:z+l2/2,h:h*R(.15,.3)}}
  // porte : sur le côté qui donne sur une route
  for(const [dx,dz] of shuffle([[0,1],[0,-1],[1,0],[-1,0]])){
    const ex=x+dx*(w/2),ez=z+dz*(l/2);
    let ok=false;for(let t=4;t<=12;t+=2)if(maskAt(ex+dx*t,ez+dz*t)===1){ok=true;break}
    if(ok){b.shop={x:ex+dx*3,z:ez+dz*3};break}
  }
  binOf(x,z).bld.push(b);rasterRect(b.x0,b.z0,b.x1,b.z1,i=>{MASK[i]=4});addRectAll(b.rect={x0:b.x0,x1:b.x1,z0:b.z0,z1:b.z1,h:b.h+(b.tier?b.tier.h:0)});
  return b;
}
function mkYard(cx,cz){
  if(!rectFree(cx-14,cz-12,cx+14,cz+12,2))return;
  const B=binOf(cx,cz);
  for(let a=0;a<2;a++)for(let r=0;r<3;r++){if(Math.random()<.2)continue;const x=cx-7+a*14,z=cz-8+r*8,st=Math.random()<.4?2:1;
    B.cont.push({x0:x-6,x1:x+6,z0:z-2.5,z1:z+2.5,h:2.8*st,st:sty(pick([0xa8402a,0x2d5a8a,0x3f7a4a,0xc29a2a,0x8a8a8a]))});addRectAll({x0:x-6,x1:x+6,z0:z-2.5,z1:z+2.5,h:2.8*st})}
  rasterRect(cx-14,cz-12,cx+14,cz+12,i=>{MASK[i]=4});
}

/* --- graphe des routes : chemins pour la circulation, la police, les gangs, les livreurs --- */
const NODES=[];let RN=[];
const NH=new Map(),nkey=(x,z)=>Math.floor((x+600)/20)+','+Math.floor((z+600)/20);
function buildGraph(){
  ROADS.forEach((r,ri)=>{
    r.cum=[0];for(let k=1;k<r.pts.length;k++)r.cum.push(r.cum[k-1]+Math.hypot(r.pts[k][0]-r.pts[k-1][0],r.pts[k][1]-r.pts[k-1][1]));
    r.len=r.cum[r.cum.length-1]+(r.closed?Math.hypot(r.pts[0][0]-r.pts[r.pts.length-1][0],r.pts[0][1]-r.pts[r.pts.length-1][1]):0);
    let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;for(const p of r.pts){x0=Math.min(x0,p[0]);x1=Math.max(x1,p[0]);z0=Math.min(z0,p[1]);z1=Math.max(z1,p[1])}r.bb=[x0-r.w,z0-r.w,x1+r.w,z1+r.w];
    const base=NODES.length;
    r.pts.forEach((p,k)=>{if(Math.abs(p[0])>606||Math.abs(p[1])>606){NODES.push(null);return}const n={id:NODES.length,x:p[0],z:p[1],r:ri,k,adj:[]};NODES.push(n);const key=nkey(p[0],p[1]);if(!NH.has(key))NH.set(key,[]);NH.get(key).push(n)});
    for(let k=0;k<r.pts.length-(r.closed?0:1);k++){const a=NODES[base+k],b=NODES[base+(k+1)%r.pts.length];if(a&&b){a.adj.push(b.id);b.adj.push(a.id)}}
  });
  for(const n of NODES){if(!n)continue;const ci=Math.floor((n.x+600)/20),cj=Math.floor((n.z+600)/20);
    for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)for(const m of NH.get((ci+a)+','+(cj+b))||[])if(m.r!==n.r&&Math.hypot(m.x-n.x,m.z-n.z)<9&&!n.adj.includes(m.id)){n.adj.push(m.id);m.adj.push(n.id)}}
  // plus grande composante connexe
  const seen=new Uint8Array(NODES.length);let best=[];
  for(const s of NODES){if(!s||seen[s.id])continue;const comp=[],q=[s.id];seen[s.id]=1;while(q.length){const id=q.pop();comp.push(id);for(const m of NODES[id].adj)if(!seen[m]){seen[m]=1;q.push(m)}}if(comp.length>best.length)best=comp}
  const keep=new Set(best);RN=best.map(id=>NODES[id]);
  for(const [k,list] of NH)NH.set(k,list.filter(n=>keep.has(n.id)));
}
function nearestNode(x,z){
  const ci=Math.floor((x+600)/20),cj=Math.floor((z+600)/20);
  for(let rad=0;rad<8;rad++){let best=null,bd=1e9;
    for(let a=-rad;a<=rad;a++)for(let b=-rad;b<=rad;b++){if(Math.max(Math.abs(a),Math.abs(b))!==rad)continue;for(const n of NH.get((ci+a)+','+(cj+b))||[]){const d=Math.hypot(n.x-x,n.z-z);if(d<bd){bd=d;best=n}}}
    if(best)return best}
  let best=RN[0],bd=1e9;for(const n of RN){const d=Math.hypot(n.x-x,n.z-z);if(d<bd){bd=d;best=n}}return best;
}
function astar(s,t){
  if(s===t)return [s];
  const g=new Map([[s.id,0]]),from=new Map(),open=[[Math.hypot(s.x-t.x,s.z-t.z),s.id]],closed=new Set();
  const push=e=>{open.push(e);let i=open.length-1;while(i>0){const p=(i-1)>>1;if(open[p][0]<=open[i][0])break;[open[p],open[i]]=[open[i],open[p]];i=p}};
  const pop=()=>{const top=open[0],last=open.pop();if(open.length){open[0]=last;let i=0;for(;;){const l=2*i+1,r=l+1;let m=i;if(l<open.length&&open[l][0]<open[m][0])m=l;if(r<open.length&&open[r][0]<open[m][0])m=r;if(m===i)break;[open[m],open[i]]=[open[i],open[m]];i=m}}return top};
  let it=0;
  while(open.length&&it++<6000){const [,id]=pop();if(id===t.id)break;if(closed.has(id))continue;closed.add(id);const n=NODES[id],gn=g.get(id);
    for(const m of n.adj){const o=NODES[m],ng=gn+Math.hypot(o.x-n.x,o.z-n.z);if(ng<(g.get(m)??1e18)){g.set(m,ng);from.set(m,id);push([ng+Math.hypot(o.x-t.x,o.z-t.z),m])}}}
  if(!from.has(t.id))return [s,t];
  const path=[t];let c=t.id;while(c!==s.id){c=from.get(c);path.push(NODES[c])}return path.reverse();
}
function roadPos(r,s,off){
  const R0=ROADS[r];if(R0.closed)s=((s%R0.len)+R0.len)%R0.len;else s=clamp(s,0,R0.len);
  const c=R0.cum,n=R0.pts.length;let lo=0,hi=n-1;while(lo<hi){const m=(lo+hi+1)>>1;if(c[m]<=s)lo=m;else hi=m-1}
  const a=R0.pts[lo],b=R0.pts[(lo+1)%n]||a,seg=Math.hypot(b[0]-a[0],b[1]-a[1])||1,t=clamp((s-c[lo])/seg,0,1),tx=(b[0]-a[0])/seg,tz=(b[1]-a[1])/seg;
  return [a[0]+(b[0]-a[0])*t-tz*off,a[1]+(b[1]-a[1])*t+tx*off,tx,tz];
}

function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const _rnd=Math.random;Math.random=mulberry32(20261013);
genWorld();buildGraph();

const SHOPS=[];
function placeShops(){
  const used={};
  for(const B of BL)for(const b of B.bld)if(b.bank&&b.shop){const T=SHOPTYPES.banque,cx=(b.x0+b.x1)/2,cz=(b.z0+b.z1)/2,d=b.shop,ax=Math.abs(d.x-cx)>Math.abs(d.z-cz)?'x':'z';
    const s0={id:SHOPS.length,type:'banque',name:T.names[0],clerk:T.clerks[0],x:d.x,z:d.z,ax,sg:ax==='x'?Math.sign(d.x-cx):Math.sign(d.z-cz),line:pick(T.greet)};b.store=s0;SHOPS.push(s0)}
  for(const [type,dk] of SHOP_PLAN){
    const T=SHOPTYPES[type],pool=[];
    for(const same of [true,false]){
      for(const B of BL){
        for(const b of B.bld){
          if(!b.shop||b.store||b.bank)continue;
          if(same&&districtAt((b.x0+b.x1)/2,(b.z0+b.z1)/2).key!==dk)continue;
          const d=b.shop,key=Math.floor((d.x+HALF)/PITCH)+','+Math.floor((d.z+HALF)/PITCH);
          if((BLK[key]||[]).some(r=>d.x>r.x0-1.2&&d.x<r.x1+1.2&&d.z>r.z0-1.2&&d.z<r.z1+1.2))continue;
          if(SHOPS.some(s=>Math.hypot(s.x-d.x,s.z-d.z)<70))continue;
          pool.push(b);
        }
      }
      if(pool.length)break;
    }
    if(!pool.length)continue;
    const b=pool[Math.floor(Math.random()*pool.length)],d=b.shop,cx=(b.x0+b.x1)/2,cz=(b.z0+b.z1)/2;
    const ax=Math.abs(d.x-cx)>Math.abs(d.z-cz)?'x':'z',sg=ax==='x'?Math.sign(d.x-cx):Math.sign(d.z-cz);
    const n=used[type]||0;used[type]=n+1;
    const s={id:SHOPS.length,type,name:T.names[n%T.names.length],clerk:T.clerks[n%T.clerks.length],x:d.x,z:d.z,ax,sg,line:pick(T.greet)};
    b.store=s;SHOPS.push(s);
  }
}
placeShops();
Math.random=_rnd;

/* minicarte : fond pré-rendu dans le style de la carte de la ville */
const MMC={};
const mmBg=S=>MMC[S]||(MMC[S]=tile(S,S,(x,w,h)=>{
  const k=S/1250,X=v=>(v+625)*k,f=S/300;
  x.fillStyle='#17110f';x.fillRect(0,0,w,h);
  const GC={tours:'#2f3a55',port:'#25494c',cite:'#3d6a2e',vieux:'#6e5638'};
  for(const key of DKEYS){const d=DIS[key];x.fillStyle=GC[key];x.fillRect(X(d.sx<0?-600:0),X(d.sz<0?-600:0),600*k,600*k)}
  x.fillStyle='#4f8a3a';x.fillRect(X(PARK.x0),X(PARK.z0),(PARK.x1-PARK.x0)*k,(PARK.z1-PARK.z0)*k);
  x.fillStyle='#6b5233';x.fillRect(X(ALLOT.x0),X(ALLOT.z0),(ALLOT.x1-ALLOT.x0)*k,(ALLOT.z1-ALLOT.z0)*k);
  x.fillStyle='#2f6f96';x.beginPath();SEA.forEach((p,i)=>i?x.lineTo(X(p[0]),X(p[1])):x.moveTo(X(p[0]),X(p[1])));x.closePath();x.fill();
  x.strokeStyle='#2f6f96';x.lineWidth=RIVER.w*k;x.lineJoin='round';x.lineCap='round';x.beginPath();RIVER.pts.forEach((p,i)=>i?x.lineTo(X(p[0]),X(p[1])):x.moveTo(X(p[0]),X(p[1])));x.stroke();
  x.beginPath();x.ellipse(X(LAKE.x),X(LAKE.z),LAKE.rx*k,LAKE.rz*k,0,0,7);x.fill();
  x.fillStyle='#c9b48a';x.beginPath();x.arc(X(LIGHTHOUSE.x),X(LIGHTHOUSE.z),LIGHTHOUSE.r*k,0,7);x.fill();
  x.fillStyle='#8a6a48';for(const p of PIERS)x.fillRect(X(p.x0),X(p.z0),(p.x1-p.x0)*k,(p.z1-p.z0)*k);
  for(const pass of [0,1]){for(const r of ROADS){x.strokeStyle=pass?(r.major?'#e9dcc0':'#bfb39b'):'#14100e';x.lineWidth=(r.w*(pass?.75:1.15))*k+(pass?0:1.5*f);x.beginPath();r.pts.forEach((p,i)=>i?x.lineTo(X(p[0]),X(p[1])):x.moveTo(X(p[0]),X(p[1])));if(r.closed)x.closePath();x.stroke()}}
  x.fillStyle='#d8cfb8';x.beginPath();x.arc(X(PLAZA.x),X(PLAZA.z),PLAZA.r*k,0,7);x.fill();
  x.fillStyle='#4f8a3a';x.beginPath();x.arc(X(0),X(0),ISLAND.r*k,0,7);x.fill();
  const BC={tours:'#7f8fb8',port:'#5f9a96',cite:'#e3cfa6',vieux:'#c4683e'};
  for(const B of BL){for(const b of B.bld){x.fillStyle=b.bank?'#f1ead6':BC[districtAt(b.x0,b.z0).key];x.fillRect(X(b.x0),X(b.z0),(b.x1-b.x0)*k,(b.z1-b.z0)*k)}
    x.fillStyle='#b56a3a';for(const c of B.cont)x.fillRect(X(c.x0),X(c.z0),(c.x1-c.x0)*k,(c.z1-c.z0)*k)}
}));


/* ---------- moteur 3D : rendu, lumières, matériaux ---------- */
/* repère : x vers l'est, z vers le sud, y vers le haut, en mètres. Un cap « th » regarde vers (sin th, cos th). */
const cv=$('gl');
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas:cv,antialias:!MOBILE,powerPreference:'high-performance'})}
catch(e){const m=$('nogl');if(m)m.hidden=false;throw e}
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,MOBILE?1.3:1.75));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x9ec6e8);scene.fog=new THREE.Fog(0x9ec6e8,170,720);
const camera=new THREE.PerspectiveCamera(62,1,.3,1400);
camera.position.set(0,220,420);camera.lookAt(0,0,0);
let VW=800,VH=600;
function resize(){const a=$('app');VW=Math.max(1,a.clientWidth);VH=Math.max(1,a.clientHeight);renderer.setSize(VW,VH,false);camera.aspect=VW/VH;camera.updateProjectionMatrix()}
window.addEventListener('resize',resize);resize();
const hemi=new THREE.HemisphereLight(0xdde9ff,0x6b5c4a,1.3);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff0d8,2.6);sun.castShadow=true;
{const S=MOBILE?1024:2048,s=sun.shadow;s.mapSize.set(S,S);const c=s.camera;c.left=-80;c.right=80;c.top=80;c.bottom=-80;c.near=1;c.far=520;s.bias=-.0006;s.normalBias=.08}
scene.add(sun,sun.target);
const inLight=new THREE.PointLight(0xfff1dc,0,20,1.1);scene.add(inLight); // éclairage des intérieurs, suit le joueur quand il est dedans
const CAM={shake:0};
const _col=h=>new THREE.Color(h);
const WHITE=new THREE.Color(0xffffff);

/* ---------- géométries fusionnées (une seule géométrie pour des milliers de boîtes) ---------- */
class GB{
  constructor(){this.p=[];this.n=[];this.u=[];this.c=[];this.ix=[]}
  quad(a,b,c,d,nx,ny,nz,uv,cl){
    const i=this.p.length/3;
    this.p.push(a[0],a[1],a[2],b[0],b[1],b[2],c[0],c[1],c[2],d[0],d[1],d[2]);
    for(let k=0;k<4;k++){this.n.push(nx,ny,nz);this.c.push(cl.r,cl.g,cl.b)}
    if(uv)for(let k=0;k<8;k++)this.u.push(uv[k]);else this.u.push(0,0,0,0,0,0,0,0);
    this.ix.push(i,i+1,i+2,i,i+2,i+3);
  }
  tri(a,b,c,nx,ny,nz,cl){
    const i=this.p.length/3;
    this.p.push(a[0],a[1],a[2],b[0],b[1],b[2],c[0],c[1],c[2]);
    for(let k=0;k<3;k++){this.n.push(nx,ny,nz);this.c.push(cl.r,cl.g,cl.b);this.u.push(0,0)}
    this.ix.push(i,i+1,i+2);
  }
  /* boîte alignée sur les axes. o.uS/o.vS : texture de façade en mètres ; o.top:false, o.bottom:true, o.tc : couleur du dessus, o.tS : texture du dessus */
  box(x0,y0,z0,x1,y1,z1,cl,o){
    o=o||{};const uS=o.uS||0,vS=o.vS||1,v0=uS?y0/vS:0,v1=uS?y1/vS:0;
    const U=w=>uS?[0,v0,w/uS,v0,w/uS,v1,0,v1]:null;
    if(o.sides!==false){
      this.quad([x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],1,0,0,U(z1-z0),cl);
      this.quad([x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0],-1,0,0,U(z1-z0),cl);
      this.quad([x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],0,0,1,U(x1-x0),cl);
      this.quad([x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0],0,0,-1,U(x1-x0),cl);
    }
    if(o.top!==false){const S=o.tS;this.quad([x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0],0,1,0,S?[x0/S,z1/S,x1/S,z1/S,x1/S,z0/S,x0/S,z0/S]:null,o.tc||cl)}
    if(o.bottom)this.quad([x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],0,-1,0,null,o.bc||cl);
  }
  /* cylindre (côtés + dessus) */
  cyl(cx,cz,r,y0,y1,seg,cl,tc){
    for(let i=0;i<seg;i++){
      const a0=i/seg*Math.PI*2,a1=(i+1)/seg*Math.PI*2,am=(a0+a1)/2;
      const x0=cx+Math.sin(a0)*r,z0=cz+Math.cos(a0)*r,x1=cx+Math.sin(a1)*r,z1=cz+Math.cos(a1)*r;
      this.quad([x0,y0,z0],[x1,y0,z1],[x1,y1,z1],[x0,y1,z0],Math.sin(am),0,Math.cos(am),null,cl);
      if(tc!==false)this.tri([cx,y1,cz],[x0,y1,z0],[x1,y1,z1],0,1,0,tc||cl);
    }
  }
  /* plan vertical : axe 'x' (normale ±x) ou 'z' (normale ±z) */
  vq(axis,sg,P,a0,a1,y0,y1,cl){
    if(axis==='x'){if(sg<0)this.quad([P,y0,a0],[P,y0,a1],[P,y1,a1],[P,y1,a0],-1,0,0,null,cl);else this.quad([P,y0,a1],[P,y0,a0],[P,y1,a0],[P,y1,a1],1,0,0,null,cl)}
    else{if(sg>0)this.quad([a0,y0,P],[a1,y0,P],[a1,y1,P],[a0,y1,P],0,0,1,null,cl);else this.quad([a1,y0,P],[a0,y0,P],[a0,y1,P],[a1,y1,P],0,0,-1,null,cl)}
  }
  hq(x0,z0,x1,z1,y,cl,S,down){ // plan horizontal (sol, plafond si down)
    const uv=S?[x0/S,z1/S,x1/S,z1/S,x1/S,z0/S,x0/S,z0/S]:null;
    if(down)this.quad([x0,y,z0],[x1,y,z0],[x1,y,z1],[x0,y,z1],0,-1,0,null,cl);
    else this.quad([x0,y,z1],[x1,y,z1],[x1,y,z0],[x0,y,z0],0,1,0,uv,cl);
  }
  /* ajoute une autre géométrie, tournée de a autour de y puis déplacée */
  add(src,x,y,z,a){
    const c=Math.cos(a||0),s=Math.sin(a||0),i0=this.p.length/3;
    for(let i=0;i<src.p.length;i+=3){const px=src.p[i],py=src.p[i+1],pz=src.p[i+2];this.p.push(px*c+pz*s+x,py+y,-px*s+pz*c+z);
      const nx=src.n[i],ny=src.n[i+1],nz=src.n[i+2];this.n.push(nx*c+nz*s,ny,-nx*s+nz*c)}
    for(const v of src.c)this.c.push(v);for(const v of src.u)this.u.push(v);for(const v of src.ix)this.ix.push(v+i0);
  }
  get empty(){return !this.ix.length}
  geo(){
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(this.p,3));
    g.setAttribute('normal',new THREE.Float32BufferAttribute(this.n,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(this.u,2));
    g.setAttribute('color',new THREE.Float32BufferAttribute(this.c,3));
    g.setIndex(this.ix);g.computeBoundingSphere();return g;
  }
}
/* boîte orientée : centre (cx,cz), demi-largeur hw (x local), demi-longueur hl (z local), angle a */
function obox(gb,cx,cz,a,hw,hl,y0,y1,cl){const t=new GB();t.box(-hw,y0,-hl,hw,y1,hl,cl);gb.add(t,cx,0,cz,a)}
/* ruban le long d'une polyligne (routes, rivière, trottoirs). uvS : texture plaquée en coordonnées monde */
function ribbon(gb,pts,hw,y,closed,cl,uvS){
  const n=pts.length;if(n<2)return;const L=[],Rr=[];
  for(let i=0;i<n;i++){
    const a=pts[closed?(i-1+n)%n:Math.max(0,i-1)],b=pts[closed?(i+1)%n:Math.min(n-1,i+1)];
    let dx=b[0]-a[0],dz=b[1]-a[1];const l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;
    L.push([pts[i][0]-dz*hw,y,pts[i][1]+dx*hw]);Rr.push([pts[i][0]+dz*hw,y,pts[i][1]-dx*hw]);
  }
  const seg=closed?n:n-1;
  for(let i=0;i<seg;i++){const j=(i+1)%n;
    const uv=uvS?[L[i][0]/uvS,L[i][2]/uvS,L[j][0]/uvS,L[j][2]/uvS,Rr[j][0]/uvS,Rr[j][2]/uvS,Rr[i][0]/uvS,Rr[i][2]/uvS]:null;
    gb.quad(L[i],L[j],Rr[j],Rr[i],0,1,0,uv,cl)}
}
/* ruban avec une texture qui se répète dans la longueur (marquages) */
function ribbonLen(gb,pts,hw,y,closed,cl,period){
  const n=pts.length;if(n<2)return;let s=0;
  for(let i=0;i<(closed?n:n-1);i++){
    const a=pts[i],b=pts[(i+1)%n],dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz)||1,ux=dx/l,uz=dz/l;
    const s0=s/period,s1=(s+l)/period;s+=l;
    gb.quad([a[0]-uz*hw,y,a[1]+ux*hw],[b[0]-uz*hw,y,b[1]+ux*hw],[b[0]+uz*hw,y,b[1]-ux*hw],[a[0]+uz*hw,y,a[1]-ux*hw],0,1,0,[0,s0,0,s1,1,s1,1,s0],cl)}
}
const meshOf=(gb,mat,o)=>{const m=new THREE.Mesh(gb.geo(),mat);o=o||{};m.castShadow=!!o.cast;m.receiveShadow=o.recv!==false;if(o.parent)o.parent.add(m);else scene.add(m);return m};

/* ---------- textures (dessinées une fois au démarrage) ---------- */
const MAXANI=Math.min(8,renderer.capabilities.getMaxAnisotropy());
function ctex(w,h,draw,rep){const t=new THREE.CanvasTexture(tile(w,h,draw));t.colorSpace=THREE.SRGBColorSpace;if(rep)t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=MAXANI;return t}
const TEX={};
TEX.asph=ctex(256,256,(x,w,h)=>{
  x.fillStyle='#3a3734';x.fillRect(0,0,w,h);
  for(let i=0;i<9000;i++){const v=44+Math.random()*34|0;x.fillStyle=`rgb(${v},${v-1},${v-3})`;x.fillRect(Math.random()*w,Math.random()*h,1+Math.random()*2,1+Math.random()*2)}
  x.strokeStyle='rgba(10,10,10,.5)';x.lineWidth=1;
  for(let i=0;i<5;i++){x.beginPath();let px=Math.random()*w,py=Math.random()*h;x.moveTo(px,py);for(let k=0;k<6;k++){px+=Math.random()*38-19;py+=Math.random()*38-19;x.lineTo(px,py)}x.stroke()}
},true);
TEX.conc=ctex(128,128,(x,w,h)=>{
  x.fillStyle='#b2aea6';x.fillRect(0,0,w,h);
  for(let i=0;i<2200;i++){const v=155+Math.random()*38|0;x.fillStyle=`rgb(${v},${v-3},${v-8})`;x.fillRect(Math.random()*w,Math.random()*h,2,2)}
  x.fillStyle='rgba(60,56,50,.45)';x.fillRect(0,0,w,2);x.fillRect(0,0,2,h);
},true);
TEX.grass=ctex(128,128,(x,w,h)=>{
  x.fillStyle='#55823a';x.fillRect(0,0,w,h);
  for(let i=0;i<3200;i++){const g=96+Math.random()*60|0;x.fillStyle=`rgb(${g-40},${g},${g-56})`;x.fillRect(Math.random()*w,Math.random()*h,1,2+Math.random()*2)}
  for(let i=0;i<8;i++){x.fillStyle='rgba(235,230,130,.8)';x.fillRect(Math.random()*w,Math.random()*h,2,2)}
},true);
TEX.walk=ctex(128,128,(x,w,h)=>{
  x.fillStyle='#bdb7ac';x.fillRect(0,0,w,h);
  for(let i=0;i<1600;i++){const v=172+Math.random()*40|0;x.fillStyle=`rgb(${v},${v-4},${v-10})`;x.fillRect(Math.random()*w,Math.random()*h,2,2)}
  x.strokeStyle='rgba(80,74,66,.5)';x.lineWidth=2;for(let k=0;k<=4;k++){x.beginPath();x.moveTo(k*32,0);x.lineTo(k*32,h);x.moveTo(0,k*32);x.lineTo(w,k*32);x.stroke()}
},true);
/* façade : 8 × 8 fenêtres (3 m de large, 3,5 m par étage) ; l'autre texture allume certaines fenêtres la nuit */
TEX.facade=ctex(512,512,(x,w,h)=>{
  x.fillStyle='#ece8e0';x.fillRect(0,0,w,h);
  for(let i=0;i<6000;i++){const v=212+Math.random()*34|0;x.fillStyle=`rgb(${v},${v-2},${v-6})`;x.fillRect(Math.random()*w,Math.random()*h,2,2)}
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){const X=c*64,Y=r*64;
    x.fillStyle='rgba(0,0,0,.14)';x.fillRect(X,Y+60,64,4);
    x.fillStyle='#d6d0c5';x.fillRect(X+12,Y+12,40,38);
    const g=x.createLinearGradient(0,Y+14,0,Y+48);g.addColorStop(0,'#41536a');g.addColorStop(1,'#212e3c');x.fillStyle=g;x.fillRect(X+14,Y+14,36,34);
    x.fillStyle='rgba(255,255,255,.16)';x.fillRect(X+15,Y+15,14,32);x.fillStyle='#d6d0c5';x.fillRect(X+31,Y+14,2,34)}
},true);
TEX.lit=ctex(512,512,(x,w,h)=>{
  x.fillStyle='#000';x.fillRect(0,0,w,h);
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){if(Math.random()>.4)continue;const X=c*64,Y=r*64,warm=Math.random()<.8,g=x.createLinearGradient(0,Y+14,0,Y+48);
    g.addColorStop(0,warm?'#ffd88a':'#bfe0ff');g.addColorStop(1,warm?'#d88c30':'#6f9fd0');x.fillStyle=g;x.fillRect(X+14,Y+14,36,34)}
},true);
TEX.roof=ctex(128,128,(x,w,h)=>{x.fillStyle='#8d8a85';x.fillRect(0,0,w,h);for(let i=0;i<4000;i++){const v=110+Math.random()*60|0;x.fillStyle=`rgb(${v},${v-2},${v-5})`;x.fillRect(Math.random()*w,Math.random()*h,2,2)}},true);
TEX.glow=ctex(128,128,(x)=>{const g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.35,'rgba(255,255,255,.45)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,128,128)});
TEX.dash=ctex(8,64,(x,w,h)=>{x.clearRect(0,0,w,h);x.fillStyle='#fff';x.fillRect(0,0,w,h*.38)},true);
TEX.cone=ctex(64,128,(x,w,h)=>{x.clearRect(0,0,w,h);const g=x.createLinearGradient(0,h,0,0);g.addColorStop(0,'rgba(255,240,200,.9)');g.addColorStop(1,'rgba(255,240,200,0)');x.fillStyle=g;x.beginPath();x.moveTo(w*.42,h);x.lineTo(w*.58,h);x.lineTo(w,0);x.lineTo(0,0);x.closePath();x.fill()});
TEX.slot=ctex(64,64,(x,w,h)=>{x.clearRect(0,0,w,h);x.strokeStyle='rgba(255,255,255,.9)';x.lineWidth=3;x.setLineDash([7,5]);x.strokeRect(3,3,w-6,h-6)});
TEX.lock=ctex(64,64,(x,w,h)=>{x.fillStyle='rgba(60,20,20,.75)';x.fillRect(0,0,w,h);x.strokeStyle='rgba(224,80,58,.8)';x.lineWidth=3;for(let k=-64;k<64;k+=12){x.beginPath();x.moveTo(k,0);x.lineTo(k+64,64);x.stroke()}});
TEX.ring=ctex(128,128,(x)=>{x.clearRect(0,0,128,128);x.strokeStyle='#fff';x.lineWidth=8;x.beginPath();x.arc(64,64,56,0,7);x.stroke();x.globalAlpha=.25;x.fillStyle='#fff';x.beginPath();x.arc(64,64,52,0,7);x.fill()});
TEX.beam=ctex(16,128,(x,w,h)=>{const g=x.createLinearGradient(0,h,0,0);g.addColorStop(0,'rgba(255,255,255,.75)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,w,h)});
function awningTex(col){return ctex(64,32,(x,w,h)=>{for(let k=0;k<8;k++){x.fillStyle=k%2?'#f1e8d6':col;x.fillRect(k*8,0,8,h)}x.fillStyle='rgba(0,0,0,.18)';x.fillRect(0,h-4,w,4)})}
function signTex(txt,bg,fg){return ctex(512,128,(x,w,h)=>{x.fillStyle=bg;x.fillRect(0,0,w,h);x.strokeStyle='rgba(255,255,255,.35)';x.lineWidth=6;x.strokeRect(6,6,w-12,h-12);
  x.fillStyle=fg;x.textAlign='center';x.textBaseline='middle';let fs=64;x.font=`700 ${fs}px "Bowlby One",Impact,"Arial Black",sans-serif`;
  while(x.measureText(txt).width>w-50&&fs>24){fs-=4;x.font=`700 ${fs}px "Bowlby One",Impact,"Arial Black",sans-serif`}x.fillText(txt,w/2,h/2+4)})}

/* ---------- matériaux ---------- */
const PO=k=>({polygonOffset:true,polygonOffsetFactor:-k,polygonOffsetUnits:-k*3});
const MAT={
  vc:new THREE.MeshLambertMaterial({vertexColors:true}),
  lit:new THREE.MeshBasicMaterial({vertexColors:true}),
  facade:new THREE.MeshLambertMaterial({map:TEX.facade,vertexColors:true,emissiveMap:TEX.lit,emissive:0xffffff,emissiveIntensity:0}),
  roof:new THREE.MeshLambertMaterial({map:TEX.roof,vertexColors:true}),
  inner:new THREE.MeshLambertMaterial({vertexColors:true,emissive:0x3a3632}),
  asph:new THREE.MeshLambertMaterial({map:TEX.asph,...PO(3)}),
  walk:new THREE.MeshLambertMaterial({map:TEX.walk,...PO(2)}),
  dash:new THREE.MeshBasicMaterial({map:TEX.dash,transparent:true,alphaTest:.4,color:0xe9e3d4,...PO(4)}),
  flat:new THREE.MeshLambertMaterial({vertexColors:true,...PO(1)}),
  flat2:new THREE.MeshLambertMaterial({vertexColors:true,...PO(2)}),
  water:new THREE.MeshPhongMaterial({color:0x2c76a0,specular:0x9fd4ff,shininess:70,...PO(1)}),
  glass:new THREE.MeshLambertMaterial({color:0xa9d6ff,transparent:true,opacity:.3,depthWrite:false}),
  pool:new THREE.MeshBasicMaterial({map:TEX.glow,color:0xffb060,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}),
  beam:new THREE.MeshBasicMaterial({map:TEX.cone,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}),
  brake:new THREE.MeshBasicMaterial({color:0xff2a1a}),
  sirR:new THREE.MeshBasicMaterial({color:0xff2020}),sirB:new THREE.MeshBasicMaterial({color:0x2a5cff}),sirOff:new THREE.MeshBasicMaterial({color:0x2a1414}),
  slot:new THREE.MeshBasicMaterial({map:TEX.slot,transparent:true,depthWrite:false,color:0xcfe9a8,...PO(2)}),
  lock:new THREE.MeshBasicMaterial({map:TEX.lock,transparent:true,opacity:.4,depthWrite:false,...PO(2)}),
  skid:new THREE.MeshBasicMaterial({color:0x0a0a0a,transparent:true,opacity:.42,depthWrite:false,...PO(5)}),
  sky:new THREE.MeshBasicMaterial({color:0xc070ff,transparent:true,opacity:.55}),
};
const MATC=new Map(); // matériaux de couleur unie, partagés
const matOf=h=>{let m=MATC.get(h);if(!m){m=new THREE.MeshLambertMaterial({color:h});MATC.set(h,m)}return m};
const ringMat=new Map();
const ringMatOf=c=>{let m=ringMat.get(c);if(!m){m=new THREE.MeshBasicMaterial({map:TEX.ring,color:c,transparent:true,depthWrite:false,...PO(6)});ringMat.set(c,m)}return m};
const beamMatOf=c=>{const k='b'+c;let m=ringMat.get(k);if(!m){m=new THREE.MeshBasicMaterial({map:TEX.beam,color:c,transparent:true,opacity:.6,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});ringMat.set(k,m)}return m};
const GEO={
  ring:(()=>{const g=new THREE.PlaneGeometry(1,1);g.rotateX(-Math.PI/2);return g})(),
  beam:(()=>{const g=new THREE.CylinderGeometry(2.4,2.4,70,16,1,true);g.translate(0,35,0);return g})(),
  head:(()=>{const g=new THREE.PlaneGeometry(9,24);g.rotateX(Math.PI/2);g.translate(0,0,12);return g})(),
  siren:new THREE.BoxGeometry(.5,.16,.3),
};

/* ---------- véhicules (modèles simples en boîtes, avant = +z) ---------- */
const VSPEC={
  car:{L:4.1,W:1.8,h0:.3,h1:.95,ct:1.45,cf:.65,rf:.05,rr:-1.05,cr:-1.5,wb:1.3,wr:.33},
  sedan:{L:4.9,W:1.95,h0:.3,h1:.95,ct:1.45,cf:1.05,rf:.3,rr:-1.1,cr:-1.7,wb:1.55,wr:.35},
  wagon:{L:5,W:2,h0:.3,h1:.98,ct:1.5,cf:1.05,rf:.3,rr:-2.25,cr:-2.4,wb:1.6,wr:.36},
  suv:{L:4.8,W:2,h0:.42,h1:1.15,ct:1.95,cf:.95,rf:.55,rr:-2.15,cr:-2.3,wb:1.5,wr:.42},
  hyper:{L:4.6,W:2.05,h0:.22,h1:.78,ct:1.15,cf:.75,rf:.05,rr:-.9,cr:-1.45,wb:1.45,wr:.36},
};
function cabin(gb,s,GL,RC){
  const xb=s.W*.45,xt=s.W*.38,y0=s.h1,y1=s.ct;
  const FBL=[xb,y0,s.cf],FBR=[-xb,y0,s.cf],RBL=[xb,y0,s.cr],RBR=[-xb,y0,s.cr],FTL=[xt,y1,s.rf],FTR=[-xt,y1,s.rf],RTL=[xt,y1,s.rr],RTR=[-xt,y1,s.rr];
  const nf=Math.hypot(s.cf-s.rf,y1-y0)||1,nr=Math.hypot(s.rr-s.cr,y1-y0)||1,ns=Math.hypot(y1-y0,xb-xt)||1;
  gb.quad(FBR,FBL,FTL,FTR,0,(s.cf-s.rf)/nf,(y1-y0)/nf,null,GL);
  gb.quad(RBL,RBR,RTR,RTL,0,(s.rr-s.cr)/nr,-(y1-y0)/nr,null,GL);
  gb.quad(FBL,RBL,RTL,FTL,(y1-y0)/ns,(xb-xt)/ns,0,null,GL);
  gb.quad(RBR,FBR,FTR,RTR,-(y1-y0)/ns,(xb-xt)/ns,0,null,GL);
  gb.quad(FTR,FTL,RTL,RTR,0,1,0,null,RC);
}
function wheels(gb,hw,wb,wr,D,zs){for(const sx of [-1,1])for(const z of zs||[wb,-wb])gb.box(sx>0?hw-.22:-hw-.05,0,z-wr,sx>0?hw+.05:-hw+.22,wr*2,z+wr,D)}
function riderGB(gb,L,z0,lean){
  const sk=_col(L.skin),sh=_col(L.shirt),pa=_col(L.pants),hm=_col(L.cap||0xd04a2a);
  gb.box(-.2,.62,z0-.1,.2,.82,z0+.5,pa);
  gb.box(-.22,.8,z0-.28+lean*.1,.22,1.42,z0+.02+lean*.25,sh);
  gb.box(-.14,1.42,z0-.22+lean*.3,.14,1.7,z0+.06+lean*.3,sk);
  gb.box(-.16,1.56,z0-.25+lean*.3,.16,1.78,z0+.08+lean*.3,hm);
  for(const sx of [-1,1])gb.box(sx>0?.2:-.33,1.08,z0-.05,sx>0?.33:-.2,1.24,z0+.62,sh);
}
function vehGB(kind,color,o,look){
  const gb=new GB(),lit=new GB(),brk=new GB();
  const C=_col(o.cop?0xf2f2f4:color),D=_col(0x121315),GL=_col(0x1a2532),CH=_col(0x9aa0a6);
  const HC=_col(0xfff2c8),TC=_col(0x7a1010),BC=_col(0xff3020);
  let len=4;
  if(kind==='truck'){
    const hw=1.25;len=9.3;
    gb.box(-.7,.35,-4.6,.7,.85,4.4,D);
    gb.box(-hw,.55,2.55,hw,3.05,4.65,C);
    gb.box(-hw+.08,1.75,4.6,hw-.08,2.85,4.68,GL);
    gb.box(-hw-.01,1.8,3.0,hw+.01,2.75,4.2,GL);
    gb.box(-hw,.9,-4.65,hw,3.95,2.4,_col(0xeeeeee),{tc:_col(0xdddddd)});
    gb.box(-hw-.02,1.6,-4.6,hw+.02,1.85,2.35,_col(0xe07a10));
    wheels(gb,hw,0,.52,D,[3.6,-1.7,-3.5]);
    lit.box(-hw+.1,.75,4.63,-hw+.5,1.0,4.7,HC);lit.box(hw-.5,.75,4.63,hw-.1,1.0,4.7,HC);
    lit.box(-hw+.1,1.0,-4.7,-hw+.4,1.3,-4.64,TC);lit.box(hw-.4,1.0,-4.7,hw-.1,1.3,-4.64,TC);
    brk.box(-hw+.08,.98,-4.73,-hw+.42,1.32,-4.68,BC);brk.box(hw-.42,.98,-4.73,hw-.08,1.32,-4.68,BC);
  }else if(kind==='van'){
    const W=2.05,hw=W/2,L=5.4,hl=L/2;len=L;
    gb.box(-hw,.38,-hl,hw,2.35,hl-1.0,C);
    gb.box(-hw,.38,hl-1.0,hw,1.25,hl,C);
    gb.box(-hw+.06,1.25,hl-1.08,hw-.06,2.22,hl-.72,GL);
    gb.box(-hw-.01,1.35,hl-1.9,hw+.01,2.05,hl-1.05,GL);
    if(o.courier){gb.box(-hw-.02,.95,-hl+.2,hw+.02,1.18,hl-1.1,_col(0xe07a10));gb.box(-.45,2.35,-.4,.45,2.6,.4,_col(0xffa63d))}
    gb.box(-hw+.05,.25,hl-.05,hw-.05,.55,hl+.12,D);gb.box(-hw+.05,.25,-hl-.12,hw-.05,.55,-hl+.05,D);
    wheels(gb,hw,1.75,.38,D);
    lit.box(-hw+.12,.95,hl-.02,-hw+.5,1.15,hl+.03,HC);lit.box(hw-.5,.95,hl-.02,hw-.12,1.15,hl+.03,HC);
    lit.box(-hw+.08,1.1,-hl-.03,-hw+.35,1.6,-hl+.02,TC);lit.box(hw-.35,1.1,-hl-.03,hw-.08,1.6,-hl+.02,TC);
    brk.box(-hw+.06,1.08,-hl-.06,-hw+.37,1.62,-hl-.01,BC);brk.box(hw-.37,1.08,-hl-.06,hw-.06,1.62,-hl-.01,BC);
  }else if(kind==='scooter'){
    len=1.9;
    gb.box(-.22,.25,-.75,.22,.6,.5,C);gb.box(-.12,.3,.5,.12,1.05,.72,C);gb.box(-.42,1.0,.58,.42,1.07,.68,D);
    gb.box(-.2,.6,-.62,.2,.74,.05,D);gb.box(-.07,0,.6,.07,.5,1.0,D);gb.box(-.07,0,-.95,.07,.5,-.55,D);
    lit.box(-.1,.85,.72,.1,1.0,.76,HC);lit.box(-.1,.5,-.8,.1,.6,-.75,TC);brk.box(-.11,.49,-.83,.11,.61,-.79,BC);
    riderGB(gb,look||PLAYER_LOOK,-.35,0);
  }else if(kind==='bike'){
    len=1.8;
    gb.box(-.04,.5,-.48,.04,.58,.48,C);gb.box(-.04,.52,-.08,.04,.95,.02,C);gb.box(-.04,.55,.38,.04,1.05,.46,C);
    gb.box(-.36,1.0,.38,.36,1.06,.46,D);gb.box(-.1,.9,-.2,.1,.98,.05,D);
    gb.box(-.03,0,.42,.03,.68,1.1,D);gb.box(-.03,0,-1.08,.03,.68,-.4,D);
    lit.box(-.06,.9,.46,.06,.98,.5,HC);
    riderGB(gb,look||PLAYER_LOOK,-.2,1);
  }else{
    const s=VSPEC[kind]||VSPEC.car,hw=s.W/2,hl=s.L/2;len=s.L;
    gb.box(-hw,s.h0,-hl,hw,s.h1,hl,C);
    gb.box(-hw+.04,s.h0-.1,hl-.15,hw-.04,s.h0+.2,hl+.08,D);gb.box(-hw+.04,s.h0-.1,-hl-.08,hw-.04,s.h0+.2,-hl+.15,D);
    cabin(gb,s,GL,o.cop?_col(0x1d1f24):C);
    wheels(gb,hw,s.wb,s.wr,D);
    if(o.cop)gb.box(-hw-.012,s.h0+.12,-.95,hw+.012,s.h1-.12,.6,_col(0x1d1f24));
    if(kind==='suv')gb.box(-.35,.55,-hl-.25,.35,1.25,-hl,D);
    if(kind==='wagon'||kind==='suv')for(const sx of [-1,1])gb.box(sx*hw*.8-.03,s.ct,s.rr+.1,sx*hw*.8+.03,s.ct+.06,s.rf-.1,CH);
    if(kind==='hyper')gb.box(-hw+.1,s.h1-.02,-hl+.05,hw-.1,s.h1+.1,-hl+.45,D);
    lit.box(-hw+.14,s.h1-.24,hl-.02,-hw+.55,s.h1-.08,hl+.03,HC);lit.box(hw-.55,s.h1-.24,hl-.02,hw-.14,s.h1-.08,hl+.03,HC);
    lit.box(-hw+.1,s.h1-.25,-hl-.03,-hw+.5,s.h1-.08,-hl+.02,TC);lit.box(hw-.5,s.h1-.25,-hl-.03,hw-.1,s.h1-.08,-hl+.02,TC);
    brk.box(-hw+.08,s.h1-.27,-hl-.06,-hw+.52,s.h1-.06,-hl-.01,BC);brk.box(hw-.52,s.h1-.27,-hl-.06,hw-.08,s.h1-.06,-hl-.01,BC);
  }
  return {gb,lit,brk,len};
}
const VEHGEO=new Map();
function vehGeo(spr,look){
  const lk=(spr.k==='bike'||spr.k==='scooter')?lookKey(look||PLAYER_LOOK):'';
  const key=spr.k+'|'+spr.c+'|'+(spr.cop?1:0)+(spr.courier?1:0)+'|'+lk;
  let g=VEHGEO.get(key);
  if(!g){const r=vehGB(spr.k,spr.c,spr,look);g={body:r.gb.geo(),lit:r.lit.geo(),brk:r.brk.empty?null:r.brk.geo(),len:r.len,key};VEHGEO.set(key,g)}
  return g;
}
function mkVeh(spr,look){
  const g=vehGeo(spr,look),grp=new THREE.Group();
  const body=new THREE.Mesh(g.body,MAT.vc);body.castShadow=true;body.receiveShadow=true;grp.add(body);
  grp.add(new THREE.Mesh(g.lit,MAT.lit));
  if(g.brk){const b=new THREE.Mesh(g.brk,MAT.brake);b.visible=false;grp.add(b);grp.userData.brk=b}
  if(spr.cop){const top=(VSPEC[spr.k]||VSPEC.sedan).ct+.08;const r=new THREE.Mesh(GEO.siren,MAT.sirR),b=new THREE.Mesh(GEO.siren,MAT.sirB);r.position.set(.3,top,-.2);b.position.set(-.3,top,-.2);grp.add(r,b);grp.userData.sir=[r,b]}
  if(spr.k!=='bike'){const hb=new THREE.Mesh(GEO.head,MAT.beam);hb.position.set(0,.12,g.len/2);hb.visible=false;grp.add(hb);grp.userData.beam=hb}
  return grp;
}

/* ---------- personnages (boîtes, membres articulés pour marcher et courir) ---------- */
const HUMGEO=new Map();
function humanGeo(L){
  const key=lookKey(L);let g=HUMGEO.get(key);if(g)return g;
  const sk=_col(L.skin),sh=_col(L.shirt),shD=_col(L.shirt).multiplyScalar(.75),pa=_col(L.pants),so=_col(L.shoe),hr=_col(L.hair),dk=_col(0x1a1410);
  const up=new GB();
  up.box(-.23,0,-.13,.23,.62,.13,sh);
  up.box(-.07,.6,-.07,.07,.7,.07,sk);
  up.box(-.14,.68,-.14,.14,.98,.14,sk);
  up.box(-.15,.88,-.155,.15,1.0,.1,hr);up.box(-.15,.7,-.155,.15,.9,-.09,hr);
  up.box(-.085,.82,.14,-.045,.86,.15,dk);up.box(.045,.82,.14,.085,.86,.15,dk);
  if(L.cap){const c=_col(L.cap),cd=_col(L.cap).multiplyScalar(.7);up.box(-.155,.93,-.155,.155,1.03,.155,c);up.box(-.13,.93,.15,.13,.965,.31,cd)}
  if(L.bag)up.box(-.17,.12,-.27,.17,.55,-.13,_col(0x3c4a2c));
  const arm=new GB();arm.box(-.07,-.56,-.08,.07,0,.08,shD);arm.box(-.06,-.67,-.06,.06,-.56,.06,sk);
  const leg=new GB();leg.box(-.09,-.85,-.1,.09,0,.1,pa);leg.box(-.095,-.95,-.11,.095,-.85,.18,so);
  g={up:up.geo(),arm:arm.geo(),leg:leg.geo()};HUMGEO.set(key,g);return g;
}
function mkHuman(L){
  const g=humanGeo(L),root=new THREE.Group(),hip=new THREE.Group(),upper=new THREE.Group();
  hip.position.y=.95;root.add(hip);hip.add(upper);
  const m=(geo,par,x,y)=>{const o=new THREE.Mesh(geo,MAT.vc);o.castShadow=true;o.receiveShadow=true;o.position.set(x,y,0);par.add(o);return o};
  m(g.up,upper,0,0);
  const aL=m(g.arm,upper,.3,.58),aR=m(g.arm,upper,-.3,.58),lL=m(g.leg,hip,.11,0),lR=m(g.leg,hip,-.11,0);
  root.userData={hip,upper,aL,aR,lL,lR};
  return root;
}
/* idle (respiration), marche et course selon la vitesse ; ph = phase de la foulée */
function animHuman(o,ph,sp,t){
  const u=o.userData,run=clamp((sp-4.2)/2.5,0,1),amp=clamp(sp/3.2,0,1)*(.55+.4*run),s=Math.sin(ph);
  u.lL.rotation.x=s*amp;u.lR.rotation.x=-s*amp;
  u.aL.rotation.x=-s*amp*.9;u.aR.rotation.x=s*amp*.9;
  if(amp<.04){const b=Math.sin(t*1.8);u.upper.rotation.x=b*.012;u.aL.rotation.z=.06+b*.025;u.aR.rotation.z=-.06-b*.025;u.hip.position.y=.95+b*.006}
  else{u.upper.rotation.x=run*.24;u.aL.rotation.z=.05+run*.1;u.aR.rotation.z=-.05-run*.1;u.hip.position.y=.95+Math.abs(Math.cos(ph))*.07*amp-.03*run}
}

/* ---------- objets dynamiques : réutilisés d'une image à l'autre ---------- */
const POOL=new Map(),LIVE=new Map();let liveFrame=0;
function useObj(ent,key,make){
  let L=LIVE.get(ent);
  if(L&&L.key!==key){releaseObj(L);LIVE.delete(ent);L=null}
  if(!L){const arr=POOL.get(key);const o=arr&&arr.length?arr.pop():make();scene.add(o);L={o,key,f:0};LIVE.set(ent,L)}
  L.f=liveFrame;return L.o;
}
function releaseObj(L){scene.remove(L.o);let arr=POOL.get(L.key);if(!arr)POOL.set(L.key,arr=[]);if(arr.length<30)arr.push(L.o)}
function liveEnd(){for(const [e,L] of LIVE)if(L.f!==liveFrame){releaseObj(L);LIVE.delete(e)}liveFrame++}
function drawVehE(ent,spr,x,z,th,brk,look){
  const o=useObj(ent,'v|'+vehGeo(spr,look).key,()=>mkVeh(spr,look));
  o.position.set(x,.05,z);o.rotation.y=th;const u=o.userData;
  if(u.brk)u.brk.visible=!!brk;
  if(u.sir){const fl=Math.floor(performance.now()/150)%2;u.sir[0].material=fl?MAT.sirR:MAT.sirOff;u.sir[1].material=fl?MAT.sirOff:MAT.sirB}
  if(u.beam)u.beam.visible=NIGHT>.25&&!ent.park;
  return o;
}
function drawHumanE(ent,look,x,z,th,ph,sp,t){
  const o=useObj(ent,'h|'+lookKey(look),()=>mkHuman(look));
  o.position.set(x,.05,z);o.rotation.y=th;animHuman(o,ph,sp,t);return o;
}
function drawRing(ent,x,z,r,col,a){
  const o=useObj(ent,'r|'+col,()=>new THREE.Mesh(GEO.ring,ringMatOf(col)));
  o.position.set(x,.12,z);o.scale.set(r*2,1,r*2);o.material.opacity=a==null?1:a;return o;
}
function drawBeam(ent,x,z,col){const o=useObj(ent,'b|'+col,()=>new THREE.Mesh(GEO.beam,beamMatOf(col)));o.position.set(x,0,z);return o}

/* ---------- étiquettes au-dessus des choses (HTML, toujours lisibles) ---------- */
const LBL=new Map();let lblFrame=0;const lblBox=$('labels');const _v=new THREE.Vector3();
function label(key,x,y,z,title,sub,col,bars){
  _v.set(x,y,z).project(camera);
  if(_v.z>1||_v.z<-1||Math.abs(_v.x)>1.15||Math.abs(_v.y)>1.15)return null;
  let e=LBL.get(key);
  if(!e){const d=document.createElement('div');d.className='lbl';const t=document.createElement('b'),s=document.createElement('small');d.append(t,s);lblBox.appendChild(d);e={d,t,s,title:null,sub:null,col:null,bars:null,f:0};LBL.set(key,e)}
  if(e.title!==title){e.title=title;e.t.textContent=title}
  if(e.sub!==sub){e.sub=sub;e.s.textContent=sub||'';e.s.hidden=!sub}
  if(e.col!==col){e.col=col;e.d.style.setProperty('--c',col||'#ffa63d')}
  if(bars){if(!e.bars){e.bars=document.createElement('div');e.bars.className='bars';e.d.appendChild(e.bars)}
    while(e.bars.children.length<bars.length){const i=document.createElement('i');i.appendChild(document.createElement('b'));e.bars.appendChild(i)}
    while(e.bars.children.length>bars.length)e.bars.lastChild.remove();
    bars.forEach((b,i)=>{const el=e.bars.children[i].firstChild;el.style.width=Math.round(clamp(b.v,0,1)*100)+'%';el.style.background=b.c})}
  else if(e.bars){e.bars.remove();e.bars=null}
  e.f=lblFrame;
  e.d.style.transform=`translate(${((_v.x+1)/2*VW).toFixed(1)}px,${((1-_v.y)/2*VH).toFixed(1)}px) translate(-50%,-100%)`;
  return e;
}
function labelsEnd(){for(const [k,e] of LBL)if(e.f!==lblFrame){e.d.remove();LBL.delete(k)}lblFrame++}

/* ---------- effets : fumée, étincelles, pièces, traces de pneus, textes flottants, pluie ---------- */
const PT=[],SKID=[],FL=[];
const WX={lvl:0,target:0};
function ptLayer(n,size,blend){
  const g=new THREE.BufferGeometry(),pos=new Float32Array(n*3),col=new Float32Array(n*4);
  g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('color',new THREE.BufferAttribute(col,4));g.setDrawRange(0,0);
  const o=new THREE.Points(g,new THREE.PointsMaterial({size,map:TEX.glow,vertexColors:true,transparent:true,depthWrite:false,blending:blend||THREE.NormalBlending}));
  o.frustumCulled=false;scene.add(o);return {o,g,pos,col,n};
}
const PL_SMOKE=ptLayer(260,2.2),PL_HOT=ptLayer(300,.55,THREE.AdditiveBlending);
const puff=(x,z,vx,vz,r,life,a)=>{if(PT.length<500)PT.push({k:0,x,y:.5,z,vx,vy:R(.4,1.4),vz,l:life,m:life,a:a||.5})};
function sparks(x,z,n,pow){for(let i=0;i<n;i++){const a=R(0,6.28),s=R(4,(pow||12));if(PT.length<500)PT.push({k:1,x,y:.8,z,vx:Math.cos(a)*s,vy:R(1,5),vz:Math.sin(a)*s,l:R(.15,.4),m:.4,a:1})}}
function coins(x,z,n){for(let i=0;i<n;i++){const a=R(0,6.28),s=R(2,5);if(PT.length<500)PT.push({k:2,x,y:1.2,z,vx:Math.cos(a)*s,vy:R(4,7),vz:Math.sin(a)*s,l:R(.6,1),m:1,a:1})}}
const floater=(x,z,txt,col,big)=>{if(FL.length<14)FL.push({x,z,txt,col,t:0,big,el:null})};
const skidMesh=(()=>{const g=new THREE.PlaneGeometry(1,1);g.rotateX(-Math.PI/2);const m=new THREE.InstancedMesh(g,MAT.skid,500);m.count=0;m.frustumCulled=false;scene.add(m);return m})();
const rainObj=(()=>{const n=700,g=new THREE.BufferGeometry(),p=new Float32Array(n*6);g.setAttribute('position',new THREE.BufferAttribute(p,3));
  const o=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0xbfd0e6,transparent:true,opacity:0,depthWrite:false}));o.frustumCulled=false;o.visible=false;scene.add(o);
  const drops=[];for(let i=0;i<n;i++)drops.push({x:R(-40,40),y:R(0,30),z:R(-40,40),s:R(.8,1.3)});return {o,g,p,drops}})();
function updFx(dt){
  {const slot=Math.floor(Date.now()/90000),f=Math.sin(slot*12.9898)*43758.5453;WX.target=(f-Math.floor(f))<.3?1:0} // météo partagée
  WX.lvl+=(WX.target-WX.lvl)*Math.min(1,dt*.35);
  for(let i=PT.length-1;i>=0;i--){const p=PT[i];p.l-=dt;if(p.l<=0){PT.splice(i,1);continue}
    const d=Math.exp(-(p.k===0?2.2:p.k===2?1.2:1.5)*dt);p.vx*=d;p.vz*=d;
    if(p.k===0)p.vy*=d;else p.vy-=14*dt;
    p.x+=p.vx*dt;p.y=Math.max(.1,p.y+p.vy*dt);p.z+=p.vz*dt}
  for(let i=SKID.length-1;i>=0;i--){SKID[i].t+=dt;if(SKID[i].t>28)SKID.splice(i,1)}
  while(SKID.length>500)SKID.shift();
  for(let i=FL.length-1;i>=0;i--){FL[i].t+=dt;if(FL[i].t>1.6){if(FL[i].el)FL[i].el.remove();FL.splice(i,1)}}
  CAM.shake=Math.max(0,CAM.shake-dt*22);
}
const _m4=new THREE.Matrix4(),_qt=new THREE.Quaternion(),_sc=new THREE.Vector3(),_ps=new THREE.Vector3(),_up=new THREE.Vector3(0,1,0);
function drawFx(){
  // particules
  let ns=0,nh=0;const S=PL_SMOKE,Hh=PL_HOT;
  for(const p of PT){const f=p.l/p.m;
    if(p.k===0){if(ns>=S.n)continue;S.pos.set([p.x,p.y+(1-f)*1.2,p.z],ns*3);S.col.set([.9,.9,.9,p.a*f*.6],ns*4);ns++}
    else{if(nh>=Hh.n)continue;Hh.pos.set([p.x,p.y,p.z],nh*3);if(p.k===1)Hh.col.set([1,.7+.3*f,.35,f],nh*4);else Hh.col.set([1,.8,.15,Math.min(1,f*1.6)],nh*4);nh++}}
  for(const [L,n] of [[S,ns],[Hh,nh]]){L.g.setDrawRange(0,n);if(n){L.g.attributes.position.needsUpdate=true;L.g.attributes.color.needsUpdate=true}}
  // traces de pneus
  let k=0;
  for(const s of SKID){const dx=s.x2-s.x1,dz=s.z2-s.z1,l=Math.hypot(dx,dz);if(l<.01)continue;
    _ps.set((s.x1+s.x2)/2,.1,(s.z1+s.z2)/2);_qt.setFromAxisAngle(_up,Math.atan2(dx,dz));_sc.set(.36,1,l+.05);_m4.compose(_ps,_qt,_sc);skidMesh.setMatrixAt(k++,_m4)}
  skidMesh.count=k;if(k)skidMesh.instanceMatrix.needsUpdate=true;
  // pluie autour de la caméra
  const rn=WX.lvl;rainObj.o.visible=rn>.04;
  if(rainObj.o.visible){rainObj.o.material.opacity=rn*.5;const c=camera.position,p=rainObj.p;let i=0;
    for(const d of rainObj.drops){d.y-=.9*d.s;d.x-=.12*d.s;if(d.y<-2){d.y+=32;d.x=R(-40,40);d.z=R(-40,40)}
      const x=c.x+d.x,z=c.z+d.z,y=c.y-12+d.y;p[i++]=x;p[i++]=y;p[i++]=z;p[i++]=x+.25;p[i++]=y+1.3;p[i++]=z}
    rainObj.g.attributes.position.needsUpdate=true}
  // textes flottants
  for(const f of FL){
    if(!f.el){f.el=document.createElement('div');f.el.className='floater'+(f.big?' big':'');f.el.textContent=f.txt;f.el.style.color=f.col;lblBox.appendChild(f.el)}
    _v.set(f.x,2.2+f.t*1.6,f.z).project(camera);
    if(_v.z>1){f.el.style.opacity=0;continue}
    f.el.style.opacity=clamp(1.6-f.t,0,1)*Math.min(1,f.t*8);
    f.el.style.transform=`translate(${((_v.x+1)/2*VW).toFixed(1)}px,${((1-_v.y)/2*VH).toFixed(1)}px) translate(-50%,-50%)`;
  }
}

/* ---------- ciel, soleil, nuit ---------- */
const TOD={h:18,l:1,n:0,rain:0,label:''};
let NIGHT=0;
function calcTOD(){
  const h=(17.2+Date.now()/35000)%24;TOD.h=h; // horloge partagée : une journée = 14 min réelles, la même pour tous
  let l=h>=8&&h<=17.5?1:h>17.5&&h<20.5?1-(h-17.5)/3:(h>=20.5||h<5)?0:h<8?(h-5)/3:1;
  l=l*l*(3-2*l);const rn=WX.lvl;
  TOD.l=l;TOD.n=Math.max(1-l,rn*.28);TOD.rain=rn;
  const hh=Math.floor(h),mm=Math.floor((h-hh)*60);
  TOD.label=('0'+hh).slice(-2)+':'+('0'+mm).slice(-2)+(rn>.4?' · pluie':l<.3?' · nuit':l<.8?' · crépuscule':'');
}
const SKYC={day:_col(0x9ec6e8),dusk:_col(0xe0956a),night:_col(0x0b1124),rain:_col(0x6e7a88)},_sk=new THREE.Color(),_sd=new THREE.Vector3();
const LAMPMATS=[];
function updSky(fx,fz){
  calcTOD();
  const l=TOD.l,rn=WX.lvl,warm=clamp(1-Math.abs(l-.5)*2.2,0,1);NIGHT=TOD.n;
  _sk.copy(SKYC.night).lerp(SKYC.day,l).lerp(SKYC.dusk,warm*.5).lerp(SKYC.rain,rn*.5*Math.max(l,.25));
  scene.background.copy(_sk);scene.fog.color.copy(_sk);
  scene.fog.near=rn>.3?80:150;scene.fog.far=rn>.3?430:l<.3?560:740;
  if(l>.04){const a=(clamp(TOD.h,5.5,18.5)-6)/12*Math.PI;_sd.set(Math.cos(a)*.85,Math.max(.15,Math.sin(a)),.42).normalize();
    sun.color.setHex(warm>.45?0xffb27a:0xfff0d8);sun.intensity=(.35+2.4*l)*(1-rn*.5)}
  else{_sd.set(-.35,1,-.5).normalize();sun.color.setHex(0x8ea4ff);sun.intensity=.32}
  sun.target.position.set(fx,0,fz);sun.position.set(fx+_sd.x*240,_sd.y*240,fz+_sd.z*240);
  hemi.intensity=(.32+1.0*l)*(1-rn*.25);hemi.color.copy(_sk).lerp(WHITE,.55);
  MAT.facade.emissiveIntensity=clamp(NIGHT*1.25,0,1.1);
  MAT.inner.emissiveIntensity=1+NIGHT*1.6;
  const lo=clamp(NIGHT*1.4-.15,0,1);MAT.pool.opacity=lo*.55;for(const m of LAMPMATS)m.opacity=lo;
  MAT.beam.opacity=clamp((NIGHT-.2)*1.2,0,.5);
  MAT.sky.opacity=.35+NIGHT*.5;
}

/* ---------- la ville en 3D (construite une fois) ---------- */
const SHELLS=[];
function worldUV(g,S){const p=g.attributes.position,uv=g.attributes.uv;for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/S,p.getZ(i)/S);uv.needsUpdate=true}
function buildGround(){
  const tint={tours:0x9aa5c0,port:0x8fbcb8,cite:0xffffff,vieux:0xe2c4a0};
  for(const key of DKEYS){const d=DIS[key],x0=d.sx<0?-700:0,z0=d.sz<0?-700:0;
    const g=new THREE.PlaneGeometry(700,700);g.rotateX(-Math.PI/2);g.translate(x0+350,0,z0+350);worldUV(g,8);
    const m=new THREE.Mesh(g,new THREE.MeshLambertMaterial({map:key==='cite'?TEX.grass:TEX.conc,color:tint[key]}));m.receiveShadow=true;scene.add(m)}
  const fl=new GB(),fl2=new GB(),sand=_col(0xd2c19a),path=_col(0xd8c9a2);
  // parc et jardins ouvriers
  fl.hq(PARK.x0,PARK.z0,PARK.x1,PARK.z1,.02,_col(0x6a9a46));
  {const mx=(PARK.x0+PARK.x1)/2,mz=(PARK.z0+PARK.z1)/2-20,pts=[];
   for(let i=0;i<=30;i++){const t=i/30,u=1-t;pts.push([u*u*u*PARK.x0+3*u*u*t*(mx-60)+3*u*t*t*(mx+40)+t*t*t*PARK.x1,u*u*u*mz+3*u*u*t*(mz-30)+3*u*t*t*(mz+40)+t*t*t*mz])}
   ribbon(fl2,pts,1.6,.04,false,path);ribbon(fl2,[[mx,PARK.z0],[mx,PARK.z1]],1.6,.04,false,path);
   const lp=[];for(let i=0;i<48;i++){const a=i/48*Math.PI*2;lp.push([LAKE.x+Math.cos(a)*(LAKE.rx+7),LAKE.z+Math.sin(a)*(LAKE.rz+7)])}ribbon(fl2,lp,1.6,.04,true,path)}
  fl.hq(ALLOT.x0,ALLOT.z0,ALLOT.x1,ALLOT.z1,.02,_col(0x6b5034));
  const rows=new GB();for(let z=ALLOT.z0+4;z<ALLOT.z1-3;z+=6)rows.box(ALLOT.x0+4,0,z,ALLOT.x1-4,.35,z+3,_col(Math.floor(z/6)%3?0x5f8a35:0x7aa645));
  meshOf(rows,MAT.vc,{cast:true});
  // place du Vieux Centre
  {const pts=circlePts(PLAZA.x,PLAZA.z,PLAZA.r/2,40);ribbon(fl,pts,PLAZA.r/2,.03,true,_col(0xd8c9a6))}
  {const f=new GB();f.cyl(PLAZA.x,PLAZA.z,7.5,0,.6,24,_col(0xb8ad94));f.cyl(PLAZA.x,PLAZA.z,.8,0,2.4,10,_col(0xd8d2c4));meshOf(f,MAT.vc,{cast:true});
   const g=new THREE.CircleGeometry(6.2,24);g.rotateX(-Math.PI/2);g.translate(PLAZA.x,.5,PLAZA.z);scene.add(new THREE.Mesh(g,MAT.water))}
  addRectAll({x0:PLAZA.x-7.5,x1:PLAZA.x+7.5,z0:PLAZA.z-7.5,z1:PLAZA.z+7.5,h:1.2});
  // rond-point
  {const f=new GB();f.cyl(0,0,ISLAND.r+1.5,0,.25,40,_col(0xcbbf98));f.cyl(0,0,ISLAND.r,0,.32,40,_col(0x5f8f3a));f.cyl(0,0,4,0,1.4,16,_col(0x9a9488));f.box(-1,1.4,-1,1,5.5,1,_col(0xc8c0ae));meshOf(f,MAT.vc,{cast:true})}
  // la mer, la rivière, le lac (le sable dessous déborde et fait les berges)
  ribbon(fl,SEA,5,.015,true,sand);
  ribbon(fl,RIVER.pts,RIVER.w/2+3,.015,false,sand);
  {const g=new THREE.CircleGeometry(1,48);g.rotateX(-Math.PI/2);g.scale(LAKE.rx+3,1,LAKE.rz+3);g.translate(LAKE.x,.015,LAKE.z);const c=g.attributes.position.count,col=new Float32Array(c*3);for(let i=0;i<c;i++)col.set([sand.r,sand.g,sand.b],i*3);g.setAttribute('color',new THREE.BufferAttribute(col,3));const m=new THREE.Mesh(g,MAT.flat);m.receiveShadow=true;scene.add(m)}
  const wat=new GB(),wc=_col(0xffffff);
  ribbon(wat,RIVER.pts,RIVER.w/2,.03,false,wc);
  const ws=meshOf(wat,MAT.water,{recv:false});
  {const sh=new THREE.Shape(SEA.map(p=>new THREE.Vector2(p[0],-p[1])));const g=new THREE.ShapeGeometry(sh);g.rotateX(-Math.PI/2);g.translate(0,.03,0);scene.add(new THREE.Mesh(g,MAT.water))}
  {const g=new THREE.CircleGeometry(1,48);g.rotateX(-Math.PI/2);g.scale(LAKE.rx,1,LAKE.rz);g.translate(LAKE.x,.03,LAKE.z);scene.add(new THREE.Mesh(g,MAT.water))}
  meshOf(fl,MAT.flat);meshOf(fl2,MAT.flat2);
  // routes : trottoirs, chaussée, marquages, garde-corps des ponts
  const sw=new GB(),as=new GB(),da=new GB(),rail=new GB(),W1=_col(0xffffff),RC=_col(0x6a6560);
  for(const r of ROADS)ribbon(sw,r.pts,r.w/2+2.6,.035,r.closed,W1,6);
  for(const r of ROADS)ribbon(as,r.pts,r.w/2,.05,r.closed,W1,16);
  for(const r of ROADS)if(r.major&&!(r.closed&&r.pts.length<40))ribbonLen(da,r.pts,.16,.065,r.closed,W1,11);
  for(const r of ROADS){const n=r.pts.length;
    for(let k=0;k<n-1;k++){if(!(r.wet[k]||r.wet[k+1]))continue;const a=r.pts[k],b=r.pts[k+1],dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz)||1,ux=dx/l,uz=dz/l,ang=Math.atan2(dx,dz);
      for(const s of [-1,1]){const ox=-uz*s*(r.w/2+.8),oz=ux*s*(r.w/2+.8);obox(rail,(a[0]+b[0])/2+ox,(a[1]+b[1])/2+oz,ang,.2,l/2+.05,0,1.1,RC)}}}
  meshOf(sw,MAT.walk);meshOf(as,MAT.asph);meshOf(da,MAT.dash,{recv:false});meshOf(rail,MAT.vc,{cast:true});
}
function buildBuildings(){
  const fac=new GB(),roof=new GB(),misc=new GB(),par=_col(0x6f6a64);
  for(const B of BL)for(const b of B.bld){
    if(b.store)continue;
    const c=_col(b.col),top=b.h+(b.tier?b.tier.h:0);
    fac.box(b.x0,0,b.z0,b.x1,b.h,b.z1,c,{uS:24,vS:28,top:false});
    roof.hq(b.x0,b.z0,b.x1,b.z1,b.h,_col(b.col).multiplyScalar(.9),6);
    misc.box(b.x0,b.h,b.z0,b.x1,b.h+.7,b.z0+.35,par);misc.box(b.x0,b.h,b.z1-.35,b.x1,b.h+.7,b.z1,par);
    misc.box(b.x0,b.h,b.z0,b.x0+.35,b.h+.7,b.z1,par);misc.box(b.x1-.35,b.h,b.z0,b.x1,b.h+.7,b.z1,par);
    if(b.tier){const t=b.tier;fac.box(t.x0,b.h,t.z0,t.x1,top,t.z1,c,{uS:24,vS:28,top:false});roof.hq(t.x0,t.z0,t.x1,t.z1,top,_col(b.col).multiplyScalar(.9),6);
      const w=(t.x1-t.x0)*.2;misc.box(t.x0+w*.5,top,t.z0+w*.5,t.x0+w*1.5,top+2,t.z0+w*1.5,_col(0x777b82));misc.box(t.x0+w-.1,top+2,t.z0+w-.1,t.x0+w+.1,top+9,t.z0+w+.1,_col(0x55585e))}
    else for(const p of b.props)misc.box(p.x0,b.h,p.z0,p.x1,b.h+p.h,p.z1,_col(p.st));
  }
  meshOf(fac,MAT.facade,{cast:true});meshOf(roof,MAT.roof);meshOf(misc,MAT.vc,{cast:true});
}
function buildProps(){
  // arbres (instanciés : 2 appels de dessin pour tous)
  const trees=[];for(const B of BL)for(const t of B.trees)trees.push(t);
  const tg=new THREE.CylinderGeometry(.22,.32,2.6,6);tg.translate(0,1.3,0);
  const cg=new THREE.IcosahedronGeometry(1,0);
  const tm=new THREE.InstancedMesh(tg,matOf(0x5a4130),trees.length),cm=new THREE.InstancedMesh(cg,new THREE.MeshLambertMaterial({color:0xffffff,flatShading:true}),trees.length);
  trees.forEach((t,i)=>{const s=t.s*1.25;_qt.setFromAxisAngle(_up,(t.x*7.3+t.z)%6.28);
    _ps.set(t.x,0,t.z);_sc.set(s,s,s);_m4.compose(_ps,_qt,_sc);tm.setMatrixAt(i,_m4);
    _ps.set(t.x,s*4.4,t.z);_sc.set(s*2.8,s*2.4,s*2.8);_m4.compose(_ps,_qt,_sc);cm.setMatrixAt(i,_m4);cm.setColorAt(i,_col(t.c))});
  for(const m of [tm,cm]){m.castShadow=true;m.receiveShadow=true;scene.add(m)}
  // voitures garées (une seule géométrie)
  const pc=new GB();
  for(const B of BL)for(const c of B.cars){const r=vehGB(c.k,c.c,{});pc.add(r.gb,c.x,.05,c.z,c.th);pc.add(r.lit,c.x,.05,c.z,c.th)}
  meshOf(pc,MAT.vc,{cast:true});
  // conteneurs du port
  const ct=new GB();
  for(const B of BL)for(const c of B.cont){const cl=_col(c.st);ct.box(c.x0,0,c.z0,c.x1,c.h,c.z1,cl);for(let x=c.x0+.9;x<c.x1-.5;x+=1.4)ct.box(x,.05,c.z0-.04,x+.12,c.h-.05,c.z1+.04,_col(c.st).multiplyScalar(.8))}
  meshOf(ct,MAT.vc,{cast:true});
  // lampadaires : poteau + bras ; la nuit, halo au sol et lueur de l'ampoule
  const lp=new GB(),pole=_col(0x4a4d52),bulb=_col(0xfff1c8);
  const one=new GB();one.box(-.1,0,-.1,.1,6.6,.1,pole);one.box(-.06,6.4,0,.06,6.55,2.6,pole);one.box(-.22,6.2,2.3,.22,6.42,2.9,_col(0x3a3d42));
  const lit=new GB();lit.box(-.18,6.12,2.36,.18,6.2,2.84,bulb);
  const lt=new GB();
  for(const L of lampList){const a=Math.atan2(L.ax-L.px,L.az-L.pz);lp.add(one,L.px,0,L.pz,a);lt.add(lit,L.px,0,L.pz,a)}
  meshOf(lp,MAT.vc,{cast:false});meshOf(lt,MAT.lit,{recv:false});
  {const g=new THREE.PlaneGeometry(1,1);g.rotateX(-Math.PI/2);const im=new THREE.InstancedMesh(g,MAT.pool,lampList.length);
   lampList.forEach((L,i)=>{_ps.set(L.ax,.09,L.az);_qt.identity();_sc.set(17,1,17);_m4.compose(_ps,_qt,_sc);im.setMatrixAt(i,_m4)});im.frustumCulled=false;scene.add(im)}
  {const g=new THREE.BufferGeometry(),p=new Float32Array(lampList.length*3);lampList.forEach((L,i)=>p.set([L.ax,6.1,L.az],i*3));g.setAttribute('position',new THREE.BufferAttribute(p,3));
   const m=new THREE.PointsMaterial({map:TEX.glow,color:0xffd28a,size:3.2,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});LAMPMATS.push(m);scene.add(new THREE.Points(g,m))}
  // pontons, grues
  const pr=new GB(),wood=_col(0x7a5b3c);
  for(const p of PIERS){pr.box(p.x0,-.6,p.z0,p.x1,.12,p.z1,wood);for(let x=p.x0+6;x<p.x1;x+=12){pr.cyl(x,p.z0-.3,.3,-.6,.9,6,_col(0x3a2a1a));pr.cyl(x,p.z1+.3,.3,-.6,.9,6,_col(0x3a2a1a))}}
  const yel=_col(0xe0b020);
  for(const c of CRANES){for(const [dx,dz] of [[-3,-3],[3,-3],[-3,3],[3,3]])pr.box(c.x+dx-.4,0,c.z+dz-.4,c.x+dx+.4,20,c.z+dz+.4,yel);
    pr.box(c.x-3.6,20,c.z-3.6,c.x+3.6,22,c.z+3.6,yel);pr.box(c.x-12,22,c.z-.8,c.x+30,23.4,c.z+.8,yel);pr.box(c.x-2,22,c.z-2,c.x+2,25,c.z+2,_col(0x2a2c30));
    pr.box(c.x+22,8,c.z-.08,c.x+22.16,22,c.z+.08,_col(0x222222))}
  meshOf(pr,MAT.vc,{cast:true});
  // phare
  const lh=new GB(),L=LIGHTHOUSE;
  lh.cyl(L.x,L.z,L.r,-.5,.35,32,_col(0xd9c9a0));lh.cyl(L.x+3,L.z-2,L.r*.7,-.5,.45,24,_col(0x5f8f35));
  for(let k=0;k<5;k++)lh.cyl(L.x,L.z,3-k*.15,k*4.4,(k+1)*4.4,16,_col(k%2?0xc0392b:0xf2efe8),false);
  lh.cyl(L.x,L.z,2.6,22,22.4,16,_col(0x2a2c30));lh.cyl(L.x,L.z,1.4,25.2,26.4,12,_col(0xc0392b));
  meshOf(lh,MAT.vc,{cast:true});
  {const g=new THREE.CylinderGeometry(1.8,1.8,2.8,12,1,true);g.translate(L.x,23.8,L.z);scene.add(new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:0xffe9a8})))}
  {const g=new THREE.ConeGeometry(22,240,24,1,true);g.translate(0,-120,0);g.rotateZ(Math.PI/2);const m=new THREE.MeshBasicMaterial({color:0xfff0be,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
   const o=new THREE.Mesh(g,m);o.position.set(L.x,23.8,L.z);scene.add(o);LHBEAM.o=o;LHBEAM.m=m}
  // bateaux
  for(const b of BOATS){const g=new GB(),w=b.l/3.6;g.box(-w/2,-.4,-b.l/2,w/2,.7,b.l/2*.55,_col(b.c));g.box(-w*.32,-.4,b.l/2*.55,w*.32,.7,b.l/2,_col(b.c));
    g.box(-w*.4,.7,-b.l/2*.6,w*.4,1.9,b.l*.05,_col(0xe9e4d6));g.box(-w/2-.02,.45,-b.l/2,w/2+.02,.6,b.l/2*.55,_col(0x2a2c30));
    const o=meshOf(g,MAT.vc,{cast:true});b.o=o}
}
const LHBEAM={o:null,m:null};
function animStatic(t){
  for(const b of BOATS){if(b.mv){b.x=532+Math.cos(t*.05)*48;b.z=-330+Math.sin(t*.05)*190;b.th=Math.atan2(Math.cos(t*.05)*190,-Math.sin(t*.05)*48)}
    if(b.o){b.o.position.set(b.x,Math.sin(t*1.3+b.x)*.12,b.z);b.o.rotation.set(Math.sin(t*1.1+b.z)*.03,Math.PI/2-b.th,Math.sin(t*.9+b.x)*.04)}}
  if(LHBEAM.o){LHBEAM.o.rotation.y=t*.45;LHBEAM.m.opacity=clamp(NIGHT*1.2-.2,0,.35);LHBEAM.o.visible=NIGHT>.2}
}

/* ---------- bâtiments visitables : murs avec une vraie porte, intérieur, plafond ---------- */
/* o : x0,z0,x1,z1 (emprise), h (hauteur), nx,nz (normale sortante de la porte), col (façade), ceil (hauteur sous plafond),
   inCol (murs intérieurs), floorCol, sign/signBg/signFg, awning, lm (bâtiment lié au gang du joueur), parent, tier, props */
function shellLocal(sh,d,s){return [sh.fx-sh.nx*d+sh.tx*s,sh.fz-sh.nz*d+sh.tz*s]}
function lbox(sh,gb,d0,d1,s0,s1,y0,y1,cl,rect,o){
  const [ax,az]=shellLocal(sh,d0,s0),[bx,bz]=shellLocal(sh,d1,s1);
  const X0=Math.min(ax,bx),X1=Math.max(ax,bx),Z0=Math.min(az,bz),Z1=Math.max(az,bz);
  gb.box(X0,y0,Z0,X1,y1,Z1,typeof cl==='number'?_col(cl):cl,o);
  if(rect){const r={x0:X0,x1:X1,z0:Z0,z1:Z1,h:y1};if(sh.lm)r.lm=1;addRectAll(r);sh.rects.push(r)}
}
function buildShell(o){
  const t=.4,ceil=o.ceil||4.5,gH=ceil+.15,dw=o.dw||2.6,dh=Math.min(3.1,ceil-.6),h=Math.max(o.h,gH+2.4);
  const cx=(o.x0+o.x1)/2,cz=(o.z0+o.z1)/2,halfN=o.nx?(o.x1-o.x0)/2:(o.z1-o.z0)/2,halfT=o.nx?(o.z1-o.z0)/2:(o.x1-o.x0)/2;
  const sh={...o,t,ceil,gH,dw,dh,h,rects:[],ix0:o.x0+t,ix1:o.x1-t,iz0:o.z0+t,iz1:o.z1-t,tx:-o.nz,tz:o.nx,
    fx:cx+o.nx*(halfN-t),fz:cz+o.nz*(halfN-t),D:2*(halfN-t),W:2*(halfT-t),door:{x:cx+o.nx*halfN,z:cz+o.nz*halfN},
    doorSide:o.nx>0?'x+':o.nx<0?'x-':o.nz>0?'z+':'z-'};
  const fac=new GB(),inn=new GB(),roof=new GB(),misc=new GB(),lit=new GB();
  const fc=_col(o.col),ic=_col(o.inCol||0xe9e3d7);
  const addR=r=>{if(o.lm)r.lm=1;addRectAll(r);sh.rects.push(r)};
  for(const side of ['x+','x-','z+','z-']){
    const isX=side[0]==='x',pos=side[1]==='+';
    const a0=isX?o.z0:o.x0+t,a1=isX?o.z1:o.x1-t,w0=isX?(pos?o.x1-t:o.x0):(pos?o.z1-t:o.z0),w1=w0+t;
    const ia0=isX?sh.iz0:sh.ix0,ia1=isX?sh.iz1:sh.ix1,door=side===sh.doorSide,dc=isX?sh.door.z:sh.door.x;
    const bx=(b0,b1,y0,y1)=>{if(isX)fac.box(w0,y0,b0,w1,y1,b1,fc,{uS:24,vS:28,top:false});else fac.box(b0,y0,w0,b1,y1,w1,fc,{uS:24,vS:28,top:false})};
    const rc=(b0,b1,cam)=>{const r=isX?{x0:w0,x1:w1,z0:b0,z1:b1,h}:{x0:b0,x1:b1,z0:w0,z1:w1,h};if(cam)r.cam=1;addR(r)};
    const segs=door?[[a0,dc-dw/2],[dc+dw/2,a1]]:[[a0,a1]];
    for(const [b0,b1] of segs){bx(b0,b1,0,gH);rc(b0,b1)}
    if(door){bx(dc-dw/2,dc+dw/2,dh,gH);rc(dc-dw/2,dc+dw/2,true)}
    const P=isX?(pos?w0-.02:w1+.02):(pos?w0-.02:w1+.02),sg=pos?-1:1;
    const lin=door?[[ia0,dc-dw/2,0,ceil],[dc+dw/2,ia1,0,ceil],[dc-dw/2,dc+dw/2,dh,ceil]]:[[ia0,ia1,0,ceil]];
    for(const [b0,b1,y0,y1] of lin)inn.vq(isX?'x':'z',sg,P,b0,b1,y0,y1,ic);
    // plinthe
    for(const [b0,b1,y0] of lin)if(y0===0)inn.vq(isX?'x':'z',sg,P+sg*.01,b0,b1,0,.12,_col(0x4a4038));
  }
  // étage(s) au-dessus, toit
  fac.box(o.x0,gH,o.z0,o.x1,h,o.z1,fc,{uS:24,vS:28,top:false});
  roof.hq(o.x0,o.z0,o.x1,o.z1,h,_col(o.col).multiplyScalar(.9),6);
  const par=_col(0x6f6a64);misc.box(o.x0,h,o.z0,o.x1,h+.7,o.z0+.35,par);misc.box(o.x0,h,o.z1-.35,o.x1,h+.7,o.z1,par);misc.box(o.x0,h,o.z0,o.x0+.35,h+.7,o.z1,par);misc.box(o.x1-.35,h,o.z0,o.x1,h+.7,o.z1,par);
  if(o.tier){const tr=o.tier,top=h+tr.h;fac.box(tr.x0,h,tr.z0,tr.x1,top,tr.z1,fc,{uS:24,vS:28,top:false});roof.hq(tr.x0,tr.z0,tr.x1,tr.z1,top,_col(o.col).multiplyScalar(.9),6)}
  if(o.props)for(const p of o.props)misc.box(p.x0,h,p.z0,p.x1,h+p.h,p.z1,_col(p.st));
  // sol, plafond, éclairage
  inn.hq(sh.ix0,sh.iz0,sh.ix1,sh.iz1,.04,_col(o.floorCol||0x8a7a68));
  inn.hq(sh.ix0,sh.iz0,sh.ix1,sh.iz1,ceil,_col(0xf2efe8),0,true);
  for(let d=2;d<sh.D-1;d+=4.5)for(let s=-sh.W/2+2;s<sh.W/2-1;s+=5){const [x,z]=shellLocal(sh,d,s);lit.box(x-.5,ceil-.06,z-.5,x+.5,ceil-.01,z+.5,_col(0xfff6e0),{top:false,bottom:true})}
  // encadrement de porte, enseigne, auvent
  {const x=sh.door.x,z=sh.door.z,nx=o.nx,nz=o.nz;
   for(const sg2 of [-1,1]){const a=sg2*dw/2,b=sg2*(dw/2+.14);lbox(sh,misc,-t-.07,.02,Math.min(a,b),Math.max(a,b),0,dh+.1,0x2a2420)}
   lbox(sh,misc,-t-.07,.02,-dw/2-.14,dw/2+.14,dh,dh+.12,0x2a2420);
   if(o.sign){const g=new THREE.PlaneGeometry(Math.min(7,sh.W*.8),1.25);const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({map:signTex(o.sign,o.signBg||'#222',o.signFg||'#fff')}));
     m.position.set(x+nx*.06,dh+1.05,z+nz*.06);m.rotation.y=Math.atan2(nx,nz);(o.parent||scene).add(m);sh.signM=m}
   if(o.awning){const aw=new THREE.Mesh(new THREE.PlaneGeometry(Math.min(6,sh.W*.7),1.5),new THREE.MeshLambertMaterial({map:awningTex(o.awning),side:THREE.DoubleSide}));
     aw.position.set(x+nx*.72,dh+.05,z+nz*.72);aw.rotation.order='YXZ';aw.rotation.y=Math.atan2(nx,nz);aw.rotation.x=-1.18;aw.castShadow=true;(o.parent||scene).add(aw)}}
  const par0=o.parent||scene,opts={parent:par0};
  meshOf(fac,MAT.facade,{...opts,cast:true});meshOf(roof,MAT.roof,opts);meshOf(misc,MAT.vc,{...opts,cast:true});meshOf(inn,MAT.inner,opts);meshOf(lit,MAT.lit,{...opts,recv:false});
  SHELLS.push(sh);
  return sh;
}
/* place de stationnement au bord de la route la plus proche d'un point */
function roadsideSpot(x,z){
  const n=nearestNode(x,z),rd=ROADS[n.r],k=n.k,a=rd.pts[Math.max(0,k-1)],b=rd.pts[Math.min(rd.pts.length-1,k+1)];
  const dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz)||1,ux=dx/l,uz=dz/l;
  const ox=-uz,oz=ux,side=((x-n.x)*ox+(z-n.z)*oz)>=0?1:-1,off=rd.w/2-2.4;
  return {x:n.x+ox*side*off,z:n.z+oz*side*off,th:Math.atan2(ux,uz)};
}
/* étagère ouverte d'un côté ('d-', 's+', 's-') ou gondole ('top'), garnie de produits */
function shelfUnit(sh,gb,d0,d1,s0,s1,h,open,pickI,rnd){
  const wood=0x6b5440,T=.1;
  lbox(sh,new GB(),d0,d1,s0,s1,0,h,0,true);
  if(open==='top'){lbox(sh,gb,d0,d1,s0,s1,0,h-.05,wood);for(let d=d0+.08;d<d1-.36;d+=.42)lbox(sh,gb,d,d+.34,s0+.08,s1-.08,h-.05,h+.15+rnd()*.15,pickI());return}
  if(open==='d-')lbox(sh,gb,d1-T,d1,s0,s1,0,h,wood);else if(open==='s+')lbox(sh,gb,d0,d1,s0,s0+T,0,h,wood);else lbox(sh,gb,d0,d1,s1-T,s1,0,h,wood);
  const levels=[];for(let y=.08;y<h-.3;y+=.62)levels.push(y);
  for(const y of levels){lbox(sh,gb,d0,d1,s0,s1,y-.05,y,wood);
    if(open==='d-'){for(let s=s0+.08;s<s1-.4;s+=.46)lbox(sh,gb,d0+.06,d1-T-.02,s,s+.36,y,y+.28+rnd()*.2,pickI())}
    else{for(let d=d0+.08;d<d1-.4;d+=.46){const a=open==='s+'?s0+T+.02:s0+.06,b=open==='s+'?s1-.06:s1-T-.02;lbox(sh,gb,d,d+.36,a,b,y,y+.28+rnd()*.2,pickI())}}}
  lbox(sh,gb,d0,d1,s0,s1,h-.05,h,wood);
}
/* intérieur des boutiques : comptoir, vendeur, étagères, déco selon le type */
function furnishStore(sh,s){
  const T=SHOPTYPES[s.type],gb=new GB(),gl=new GB(),D=sh.D,W=sh.W,rnd=mulberry32(s.id*977+13);
  const items=T.items.map(hexn),pickI=()=>items[Math.floor(rnd()*items.length)];
  const cd=clamp(D*.55,2.4,D-2.8),cw=Math.min(W-2.8,5.2);
  lbox(sh,gb,cd,cd+.75,-cw/2,cw/2,0,1.02,0x5a4636,true);
  lbox(sh,gb,cd-.06,cd+.81,-cw/2-.06,cw/2+.06,1.02,1.1,hexn(T.col));
  shelfUnit(sh,gb,D-.62,D,-W/2+.7,W/2-.7,2.5,'d-',pickI,rnd);
  if(W>=6.4)for(const sd of [-1,1]){const dEnd=cd-.8;
    if(dEnd>2.2)shelfUnit(sh,gb,1.3,dEnd,sd>0?W/2-.62:-W/2,sd>0?W/2:-W/2+.62,2.1,sd>0?'s-':'s+',pickI,rnd)}
  const mid=(d0,d1,s0,s1,y1,cl,rect)=>lbox(sh,gb,d0,d1,s0,s1,0,y1,cl,rect);
  switch(T.deco){
    case 'plantes':for(let i=0;i<6;i++){const d=1.3+(i%3)*.9,s0=(i<3?-1:1)*(1.6+rnd()*.4);mid(d,d+.5,s0,s0+.5,.45,0x8a5a3a,true);lbox(sh,gb,d-.15,d+.65,s0-.15,s0+.65,.45,1.1+rnd()*.4,0x4f8a2f)}break;
    case 'voiture':if(D>9&&W>6.5){const [x,z]=shellLocal(sh,cd*.5,0),r=vehGB('hyper',0xc0392b,{});gb.add(r.gb,x,.05,z,Math.atan2(sh.tx,sh.tz));gb.add(r.lit,x,.05,z,Math.atan2(sh.tx,sh.tz));lbox(sh,new GB(),cd*.5-1.1,cd*.5+1.1,-2.4,2.4,0,1.2,0,true)}break;
    case 'bar':for(let i=-2;i<=2;i++){if(Math.abs(i*1.1)>cw/2)continue;mid(cd-.75,cd-.35,i*1.1-.2,i*1.1+.2,.75,0x3a2a1c,false)}for(let s0=-W/2+1;s0<W/2-1.2;s0+=.3)lbox(sh,gb,D-.5,D-.35,s0,s0+.12,2.5,2.85,pickI());break;
    case 'portants':for(const sd of [-1,1]){const s0=sd*Math.min(2.2,W/2-1.6);mid(1.4,1.48,s0-.04,s0+.04,1.6,0x777b82,false);lbox(sh,gb,1.2,1.7,s0-1,s0+1,1.5,1.56,0x777b82);for(let k=0;k<6;k++)lbox(sh,gb,1.25,1.65,s0-.9+k*.32,s0-.7+k*.32,.6,1.5,pickI())}break;
    case 'vitrines':for(const sd of [-1,1]){if(W<7)break;const s0=sd>0?W/2-1.9:-W/2+.7;lbox(sh,gb,1.6,3.2,s0,s0+1.2,0,.85,0x3d4147,true);lbox(sh,gb,1.75,3.05,s0+.15,s0+1.05,.85,.95,pickI());lbox(sh,gl,1.6,3.2,s0,s0+1.2,.85,1.25,0xaad4ff)}break;
    case 'graines':for(let i=0;i<6;i++){const d=1.2+(i%3)*.75,s0=(i<3?-1:1)*1.9-.35;lbox(sh,gb,d,d+.6,s0,s0+.7,0,.55,[0xb89a6a,0xc9a05a,0x8a6d4a][i%3],true);lbox(sh,gb,d+.05,d+.55,s0+.05,s0+.65,.55,.62,0xd9d4c0)}
      for(let s0=-W/2+1;s0<W/2-1.2;s0+=.5)for(const y of [2.55,2.8])lbox(sh,gb,D-.68,D-.62,s0,s0+.4,y,y+.2,0xd9c39a);break;
    default:if(D>8&&W>7.5){for(const s0 of [-2.1,1.5])shelfUnit(sh,gb,1.8,cd-1.3,s0,s0+.6,1.5,'top',pickI,rnd)}
  }
  if(T.bank){lbox(sh,gl,cd+.3,cd+.36,-cw/2,cw/2,1.1,2.3,0xaad4ff);lbox(sh,gb,D-.7,D-.6,-1.3,1.3,.3,2.6,0x8d9096);lbox(sh,gb,D-.78,D-.7,-.2,.2,1.3,1.6,0xd9b020)}
  meshOf(gb,MAT.vc,{cast:true});
  if(!gl.empty)scene.add(new THREE.Mesh(gl.geo(),MAT.glass));
  const [kx,kz]=shellLocal(sh,cd+1.35,0),[tx,tz]=shellLocal(sh,cd-.9,0);
  s.clerkPos={x:kx,z:kz,th:Math.atan2(sh.nx,sh.nz)};s.talk={x:tx,z:tz};
  const clerk=mkHuman({...randLook(),shirt:hexn(T.col),cap:0});clerk.position.set(kx,.05,kz);clerk.rotation.y=s.clerkPos.th;scene.add(clerk);s.clerkM=clerk;
}
function buildStores(){
  for(const B of BL)for(const b of B.bld){
    if(!b.store)continue;const s=b.store,T=SHOPTYPES[s.type];
    for(const k in BLK)BLK[k]=BLK[k].filter(r=>r!==b.rect);
    const nx=s.ax==='x'?s.sg:0,nz=s.ax==='z'?s.sg:0;
    const sh=buildShell({x0:b.x0,z0:b.z0,x1:b.x1,z1:b.z1,h:b.h,nx,nz,col:b.col,ceil:T.bank?5:4.5,inCol:0xe9e3d7,floorCol:hexn(T.floor),
      sign:s.name.toUpperCase(),signBg:T.col,signFg:'#fff',awning:T.bank?null:T.col,tier:b.tier,props:b.tier?null:b.props});
    sh.store=s;s.shell=sh;s.park=roadsideSpot(sh.door.x,sh.door.z);
    furnishStore(sh,s);
    const m=new THREE.Mesh(GEO.ring,ringMatOf(hexn(T.col)));m.position.set(s.x,.12,s.z);m.scale.set(4.6,1,4.6);m.material.opacity=.85;scene.add(m);
  }
}
function buildCity(){buildGround();buildBuildings();buildProps();buildStores()}

/* ---------- sons (WebAudio) ---------- */
const Sfx=(()=>{
  let ac=null,mg=null,nb=null,eng=null,skid=null,rain=null,sir=null,on=true;
  try{on=localStorage.getItem('serre2d-snd')!=='0'}catch(e){}
  function loop(freq,q,type){const s=ac.createBufferSource();s.buffer=nb;s.loop=true;const f=ac.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q;const g=ac.createGain();g.gain.value=0;s.connect(f);f.connect(g);g.connect(mg);s.start();return g}
  function init(){
    if(ac){if(ac.state==='suspended')ac.resume();return}
    try{
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
      ac=new AC();mg=ac.createGain();mg.gain.value=on?.6:0;mg.connect(ac.destination);
      nb=ac.createBuffer(1,ac.sampleRate*1.5,ac.sampleRate);const d=nb.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
      const o1=ac.createOscillator(),o2=ac.createOscillator(),f=ac.createBiquadFilter(),g=ac.createGain();
      o1.type='sawtooth';o2.type='square';f.type='lowpass';f.frequency.value=400;g.gain.value=0;
      o1.connect(f);o2.connect(f);f.connect(g);g.connect(mg);o1.start();o2.start();eng={o1,o2,f,g};
      skid=loop(1900,3,'bandpass');rain=loop(4200,.6,'highpass');
      const so=ac.createOscillator(),sg=ac.createGain();so.type='triangle';so.frequency.value=800;sg.gain.value=0;so.connect(sg);sg.connect(mg);so.start();sir={o:so,g:sg};
    }catch(e){ac=null}
  }
  function burst(dur,freq,vol,type,q){
    if(!ac||!on)return;try{
      const t=ac.currentTime,s=ac.createBufferSource();s.buffer=nb;const f=ac.createBiquadFilter();f.type=type||'lowpass';f.frequency.value=freq;f.Q.value=q||1;
      const g=ac.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(f);f.connect(g);g.connect(mg);s.start(t,Math.random()*.5);s.stop(t+dur+.05)}catch(e){}
  }
  function tone(f,t0,dur,vol,type){
    if(!ac||!on)return;try{
      const t=ac.currentTime+t0,o=ac.createOscillator(),g=ac.createGain();o.type=type||'sine';o.frequency.value=f;
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.01);g.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(g);g.connect(mg);o.start(t);o.stop(t+dur+.05)}catch(e){}
  }
  return {
    init,get on(){return on},
    toggle(){on=!on;try{localStorage.setItem('serre2d-snd',on?'1':'0')}catch(e){}if(mg)mg.gain.value=on?.6:0;if(on)init();return on},
    cash(){tone(988,0,.14,.18,'triangle');tone(1480,.08,.28,.16,'triangle')},
    crash(v){burst(.28,500+v*600,.35+v*.4,'lowpass');tone(70,0,.22,.3+v*.2,'sine')},
    shot(){burst(.12,2400,.55,'bandpass',.8);burst(.35,420,.4,'lowpass')},
    click(){tone(660,0,.06,.1,'square')},
    horn(){tone(392,0,.4,.1,'square');tone(494,0,.4,.1,'square')},
    alert(){tone(520,0,.1,.12,'square');tone(780,.12,.16,.12,'square')},
    update(s){
      if(!ac||!on||!eng)return;
      const t=ac.currentTime;
      if(s.foot||!s.run){eng.g.gain.setTargetAtTime(0,t,.1)}
      else{
        const f=Math.min(1,s.sp/Math.max(1,s.vmax)),gear=Math.min(4,Math.floor(f*5)),fr=f*5-gear;
        const rpm=.15+.85*(s.thr?Math.min(1,fr*.9+.18):fr*.65);
        const base=s.big?34:46,fq=base+rpm*100;
        eng.o1.frequency.setTargetAtTime(fq,t,.05);eng.o2.frequency.setTargetAtTime(fq*.5,t,.05);
        eng.f.frequency.setTargetAtTime(240+rpm*800,t,.08);
        eng.g.gain.setTargetAtTime(.035+(s.thr?.055:.012)+f*.03,t,.08);
      }
      skid.gain.setTargetAtTime(Math.min(.22,Math.max(0,s.slip-3)*.025),t,.04);
      rain.gain.setTargetAtTime(s.rain*.045,t,.5);
      const cd=s.cop;
      if(cd<260){const fq=(Math.floor(t*2.4)%2)?940:700;sir.o.frequency.setTargetAtTime(fq,t,.03);sir.g.gain.setTargetAtTime((1-cd/260)*.09,t,.05)}
      else sir.g.gain.setTargetAtTime(0,t,.1);
    }
  };
})();
addEventListener('pointerdown',()=>Sfx.init(),{once:false});
addEventListener('keydown',()=>Sfx.init());

let curShop=null;
const LOOK0={...PLAYER_LOOK};
function applyLook(){Object.assign(PLAYER_LOOK,LOOK0,G.look||{});delete PLAYER_LOOK.s}
function renderShop(){
  const s=curShop,T=SHOPTYPES[s.type];
  $('shName').textContent=s.name;$('shName').style.color=T.col;
  let h=`<p class="note"><b style="color:${T.col}">${s.clerk}</b> : ${s.line}</p>`;
  h+=`<div class="chips"><button class="btn ghost" data-sh="talk">Discuter avec ${s.clerk}</button>${T.menu?`<button class="btn" data-sh="menu">${T.menuLabel}</button>`:''}</div>`;
  if(T.bank){
    const amts=[1000,10000,100000];
    h+=`<div class="item"><b>Ton coffre : <span style="color:var(--lamp)" id="bkBal">${fmt(G.bank||0)}</span></b><span>L’argent au coffre ne peut pas être saisi lors d’une descente. Il compte pour l’objectif des 10 M€, mais il faut le retirer pour acheter.</span></div>`;
    h+='<div class="chips">'+amts.map(a=>`<button class="btn" data-sh="dep:${a}" data-cost="${a}">Déposer ${fmt(a)}</button>`).join('')+'<button class="btn" data-sh="dep:all">Tout déposer</button></div>';
    h+='<div class="chips">'+amts.map(a=>`<button class="btn ghost" data-sh="wd:${a}"${(G.bank||0)<a?' disabled':''}>Retirer ${fmt(a)}</button>`).join('')+'<button class="btn ghost" data-sh="wd:all">Tout retirer</button></div>';
  }
  if(T.goods){
    h+='<div class="list">'+T.goods.map(id=>{
      const g=GOODS[id];let btn,tag='';
      if(g.look){
        const own=g.price===0||inv(id),worn=Object.keys(g.look).every(k=>PLAYER_LOOK[k]===g.look[k]);
        tag=worn?' <span class="tag ok">Porté</span>':own?' <span class="tag ok">Possédé</span>':'';
        btn=worn?'<button class="btn" disabled>Porté</button>':own?`<button class="btn" data-buy="${id}">Porter</button>`:`<button class="btn" data-buy="${id}" data-cost="${g.price}"${G.cash<g.price?' disabled':''}>${fmt(g.price)}</button>`;
      }else if(g.use){btn=`<button class="btn" data-buy="${id}" data-cost="${g.price}"${G.cash<g.price?' disabled':''}>${fmt(g.price)}</button>`}
      else{const n=inv(id);tag=n?` <span class="tag ok">${n}/${g.max}</span>`:'';btn=n>=g.max?'<button class="btn" disabled>Max</button>':`<button class="btn" data-buy="${id}" data-cost="${g.price}"${G.cash<g.price?' disabled':''}>${fmt(g.price)}</button>`}
      return `<div class="item"><b>${g.name}${tag}</b><span>${g.desc}</span>${btn}</div>`}).join('')+'</div>';
  }
  h+=`<p class="note" id="shCash">Cash : ${fmt(G.cash)}</p>`;
  $('shBody').innerHTML=h;
}
function refreshShop(){
  if(!shopOpen)return;
  document.querySelectorAll('#shBody [data-cost]').forEach(b=>{b.disabled=G.cash<+b.dataset.cost});
  const c=$('shCash');if(c)c.textContent='Cash : '+fmt(G.cash);
  const bk=$('bkBal');if(bk)bk.textContent=fmt(G.bank||0);
}
function openShop(s){
  for(const k in keys)keys[k]=0;
  curShop=s;shopOpen=true;s.line=pick(SHOPTYPES[s.type].greet);
  $('shop').hidden=false;renderShop();
}
function closeShop(){shopOpen=false;curShop=null;$('shop').hidden=true}
function buyGood(id){
  const g=GOODS[id];if(!g)return;
  if(g.look){
    if(g.price>0&&!inv(id)){if(G.cash<g.price)return;G.cash-=g.price;G.inv[id]=1}
    Object.assign(G.look,g.look);applyLook();
  }else if(g.use){
    if(G.cash<g.price)return;G.cash-=g.price;toast(g.use(),'good');
  }else{
    if(inv(id)>=g.max||G.cash<g.price)return;
    G.cash-=g.price;G.inv[id]=inv(id)+1;toast(g.name+' acheté.','good');
  }
  save();renderShop();
}
$('shop').addEventListener('click',e=>{
  const el=e.target.closest('[data-sh],[data-buy]');if(!el||el.disabled)return;
  if(el.dataset.buy){buyGood(el.dataset.buy);return}
  {const [op,v]=String(el.dataset.sh||'').split(':');
   if(op==='dep'||op==='wd'){
     const amt=v==='all'?(op==='dep'?Math.floor(G.cash):(G.bank||0)):+v;
     if(op==='dep'&&amt>0&&G.cash>=amt){G.cash-=amt;G.bank=(G.bank||0)+amt;Sfx.cash();toast(fmt(amt)+' déposés au coffre.','good')}
     else if(op==='wd'&&amt>0&&(G.bank||0)>=amt){G.bank-=amt;G.cash+=amt;Sfx.cash();toast(fmt(amt)+' retirés.','good')}
     save();renderShop();return}}
  if(el.dataset.sh==='talk')clerkTalk(curShop);
  else if(el.dataset.sh==='menu'){const t=SHOPTYPES[curShop.type].menu;menuAt=curShop;closeShop();openMenu(t,true)}
});
$('shExit').onclick=closeShop;

/* ---------- discussions : vendeurs et passants ---------- */
function gossip(){
  const L=[];
  for(const k of DKEYS){const o=G.own[k];L.push(o==='you'?`« ${DIS[k].name}, c’est ton secteur, non ? Les gens en parlent bien. »`:`« ${BOSSES[o].name} tient ${DIS[k].name}. Calme, depuis que les gangs se sont entendus. »`)}
  L.push(G.heat>50?'« Ça patrouille beaucoup en ce moment. Fais gaffe. »':'« La police est tranquille ces temps-ci. »');
  L.push(`« Il est ${TOD.label.split(' · ')[0]}. ${WX.lvl>.4?'Et il pleut, personne ne sort.':'Belle soirée pour faire des affaires.'} »`);
  L.push('« Les clients paient mieux dans les autres secteurs, mais les gérants prélèvent leur part. »');
  L.push('« Il paraît qu’un gang cherche à vendre son secteur. Garde de l’argent de côté. »');
  return pick(L);
}
function lead(x,z,cost){
  if(cost&&G.cash<cost)return '« Reviens quand tu auras de quoi payer. »';
  if(cost)G.cash-=cost;
  if(cost||Math.random()<.5){
    const n=cost?2:1;let o=null;
    for(let i=0;i<n;i++){const p=randRoadPoint(x,z,30,120);o=genOrder(p.x,p.z,1.3)}
    if(o)trackId=o.id;
    return n>1?'« J’en connais deux qui cherchent. Ils t’attendent, regarde la carte. »':'« Un type cherche de quoi fumer. Il t’attend, regarde la carte. »';
  }
  return '« Rien pour le moment. Repasse plus tard. »';
}
function clerkTalk(s){
  const T=SHOPTYPES[s.type];
  openDialog(s.clerk,T.col,{text:pick(T.talk),choices:[
    {label:'Demander des nouvelles du quartier',desc:'Les rumeurs, ça ne coûte rien.',fn:()=>gossip()},
    {label:'Demander si quelqu’un cherche de la marchandise',desc:'Une chance sur deux.',fn:()=>lead(s.x,s.z,0)},
    {label:'Acheter un tuyau (150 €)',desc:'Deux clients garantis.',need:150,fn:()=>lead(s.x,s.z,150)},
    {label:'Au revoir',close:1}]},()=>{if(shopOpen)refreshShop()});
}
function talkPed(p){
  p.hold=999;
  const K=PKINDS[p.kind];
  openDialog(`${p.name} · ${K.label[p.g==='f'?1:0]}`,'#f3e6d6',{text:pick(K.hi),choices:[
    {label:'Discuter',desc:'Un peu de conversation.',fn:()=>{
      const t=pick(K.chat);
      if(Math.random()<.3){const o=genOrder(p.x,p.z,1.25,p.name);trackId=o.id;return t+' Puis : « Au fait, je connais quelqu’un qui cherche. Je t’ai mis la position sur la carte. »'}
      return t}},
    {label:'Lui proposer un échantillon',desc:'1 unité offerte. Risqué.',off:tot()===0,fn:()=>{
      const s=STRAINS.slice().sort((a,b)=>a.price-b.price).find(s=>(G.stock[s.id]||0)>0);if(!s)return '« Tu n’as rien sur toi. »';
      G.stock[s.id]--;
      if(Math.random()<K.acc){const o=genOrder(p.x,p.z,1.3,p.name);trackId=o.id;G.heat=Math.min(100,G.heat+2);return '« Pas mal du tout ! Je t’en prends d’autres, regarde la carte. »'}
      if(Math.random()<.35){G.heat=Math.min(100,G.heat+10);return '« Mais ça va pas ? Je vais appeler la police ! » Il s’éloigne vite. Chaleur +10.'}
      return '« Non merci, ce n’est pas pour moi. »'}},
    {label:'Demander des nouvelles du quartier',desc:'Rumeurs et ragots.',fn:()=>gossip()},
    {label:'Acheter un tuyau (150 €)',desc:'Deux clients garantis.',need:150,fn:()=>lead(p.x,p.z,150)},
    {label:'Partir',close:1}]},()=>{p.hold=.6});
}

/* ---------- vie du quartier : circulation et passants ---------- */
const traffic=[],peds=[],PEDN=MOBILE?18:26;
const LANE=4;
function lanePath(from,wps){
  const pts=[from].concat(wps),segs=[];
  for(let i=1;i<pts.length;i++){const dx=pts[i][0]-pts[i-1][0],dz=pts[i][1]-pts[i-1][1],l=Math.hypot(dx,dz);if(l>.5)segs.push({dx:dx/l,dz:dz/l,end:pts[i]})}
  return segs.map((s,i)=>{
    let ox=-s.dz*LANE,oz=s.dx*LANE;
    const n=segs[i+1];
    if(n&&Math.abs(s.dx*n.dx+s.dz*n.dz)<.2){ox+=-n.dz*LANE;oz+=n.dx*LANE}
    return [s.end[0]+ox,s.end[1]+oz];
  });
}
function newRoute(e){
  const p=randRoadPoint(e.x,e.z,120,380);
  e.path=lanePath([e.x,e.z],pathTo(e.x,e.z,p.x,p.z));
}
function updTraffic(dt,fx,fz,obst){
  let tries=0;
  while(traffic.length<15&&tries++<4){
    const p=randRoadPoint(fx,fz,150,340);
    const e=mkAI({k:pick(CARK),c:pick(CARCOLS)},p.x,p.z,0,2.0);e.civ=1;e.sp=R(13,21);
    newRoute(e);
    if(e.path.length)e.th=Math.atan2(e.path[0][0]-e.x,e.path[0][1]-e.z);
    if(Math.hypot(e.x-fx,e.z-fz)<130)continue;
    traffic.push(e);
  }
  for(let i=traffic.length-1;i>=0;i--){
    const e=traffic[i];
    if(Math.hypot(e.x-fx,e.z-fz)>430){traffic.splice(i,1);continue}
    if(!e.path.length)newRoute(e);
    let blocked=false;
    const fxv=Math.sin(e.th),fzv=Math.cos(e.th);
    for(const o of obst){
      if(o===e)continue;
      const dx=o.x-e.x,dz=o.z-e.z,fwd=dx*fxv+dz*fzv;
      if(fwd>0&&fwd<10+e.v*.7){const lat=Math.abs(dx*fzv-dz*fxv);if(lat<3.1){blocked=true;break}}
    }
    e.stuck=blocked?(e.stuck||0)+dt:0;
    const vt=blocked&&e.stuck<5?0:e.sp;
    followPath(e,dt,vt);
    e.brk=blocked||e.v<e.sp*.6&&e.v>3&&vt<e.v;
  }
}
const ringPos=(s,dir)=>{s=((s%304)+304)%304;const e=37.6;
  if(s<76)return[-e+s,-e,dir>0?Math.PI/2:-Math.PI/2];
  if(s<152)return[e,-e+(s-76),dir>0?0:Math.PI];
  if(s<228)return[e-(s-152),e,dir>0?-Math.PI/2:Math.PI/2];
  return[-e,e-(s-228),dir>0?Math.PI:0]};
const SHOUTS=['Hé !','Attention !','Ralentis !','Fou du volant !','T’es malade ?!','Oh là !'];
let nearMissT=0;
function scarePeds(r){for(const p of peds){const dx=p.x-P.x,dz=p.z-P.z,d=Math.hypot(dx,dz);if(d<r&&d>.01&&p.hold<=0){p.jvx=dx/d*6;p.jvz=dz/d*6;if(Math.random()<.4&&p.sh<=0){p.sh=3;floater(p.x,p.z-2.5,pick(['Ça va, ça va !','Du calme !','Oups !']),'#f3e6d6',false)}}}}
function updPeds(dt,fx,fz){
  nearMissT-=dt;
  let tries=0;
  while(peds.length<PEDN&&tries++<8){
    const n=RN[Math.floor(Math.random()*RN.length)];
    const d=Math.hypot(n.x-fx,n.z-fz);if(d>300||d<30)continue;
    const rd=ROADS[n.r],side=Math.random()<.5?1:-1,sw=(rd.w/2+2.4)*side,q0=roadPos(n.r,rd.cum[n.k],sw);
    {const m=maskAt(q0[0],q0[1]);if(m===2||m===4)continue}
    const nm=pick(PNAMES);peds.push({r:n.r,sw,name:nm[0],g:nm[1],kind:pick(Object.keys(PKINDS)),hold:0,gr:0,s:rd.cum[n.k],dir:Math.random()<.5?1:-1,sp:R(1.1,1.8),look:randLook(),ph:R(0,6),x:0,z:0,th:0,off:R(-.9,.6),jx:0,jz:0,jvx:0,jvz:0,sh:0});
  }
  for(let i=peds.length-1;i>=0;i--){
    const p=peds[i];
    if(p.hold>0){p.hold-=dt;p.th=Math.atan2(P.x-p.x,P.z-p.z);continue}
    p.s+=p.dir*p.sp*dt;p.ph+=p.sp*dt*3.6;
    {const rd=ROADS[p.r];if(!rd.closed&&(p.s<0||p.s>rd.len)){p.dir=-p.dir;p.s=clamp(p.s,0,rd.len)}
     const q=roadPos(p.r,p.s,p.sw+p.off);
     if(waterAt(q[0],q[1])&&!rd.wet.some(Boolean)){p.dir=-p.dir;p.s+=p.dir*p.sp*dt*2}
     p.x=q[0];p.z=q[1];p.th=Math.atan2(q[2]*p.dir,q[3]*p.dir)}
    // esquive : le passant saute de côté quand un véhicule fonce sur lui
    p.sh-=dt;
    {const px=p.x+p.jx,pz=p.z+p.jz,dx=px-P.x,dz=pz-P.z,d=Math.hypot(dx,dz),sp=Math.hypot(P.vx,P.vz);
     if(started&&!HIDE&&P.def.kind!=='foot'&&sp>5&&d<7&&d>.01){
       const fwd=(-dx*P.vx-dz*P.vz)/(d*sp);
       if(fwd<-.2||d<3.5){p.jvx=dx/d*9;p.jvz=dz/d*9;p.ph+=dt*20;
         if(p.sh<=0){p.sh=3.5;floater(px,pz-2.5,pick(SHOUTS),'#ff9a7a',false);
           if(d<3&&sp>9&&nearMissT<=0){nearMissT=6;G.heat=Math.min(100,G.heat+2*heatMult());toast('Tu as failli renverser quelqu’un. Chaleur +2.','bad')}}}}}
    p.jx+=p.jvx*dt;p.jz+=p.jvz*dt;const dm=Math.exp(-5*dt);p.jvx*=dm;p.jvz*=dm;const rt=Math.exp(-.5*dt);p.jx*=rt;p.jz*=rt;
    p.jx=clamp(p.jx,-6,6);p.jz=clamp(p.jz,-6,6);p.x+=p.jx;p.z+=p.jz;
    if(p.gr>0)p.gr-=dt;else if(started&&Math.hypot(p.x-P.x,p.z-P.z)<7&&Math.random()<dt*.6){p.gr=R(25,45);floater(p.x,p.z-2.5,pick(GREETS),'#f3e6d6',false)}
    if(Math.hypot(p.x-fx,p.z-fz)>340)peds.splice(i,1);
  }
}


/* ---------- joueur : à pied ou au volant ---------- */
const P={x:0,z:0,th:0,v:0,vx:0,vz:0,def:VM.foot,steer:0,ph:0,slip:0,sk:[null,null],fwd:0};
function setVehicle(id){
  const d=VM[id];if(!d)return;
  P.def=d;if(id!=='foot')G.veh=id;
  if(d.kind==='foot'||d.kind==='scooter'||d.kind==='bike'){const sp=Math.hypot(P.vx,P.vz);if(sp>d.vmax){P.vx*=d.vmax/sp;P.vz*=d.vmax/sp}}
}
/* ta voiture garée (une seule à la fois dans la ville) */
let CAR=null;
function parkCar(id,x,z,th){
  if(CAR&&CAR.rect)for(const k in BLK)BLK[k]=BLK[k].filter(r=>r!==CAR.rect);
  CAR=id&&id!=='foot'&&VM[id]?{id,x,z,th,park:1}:null;
  if(CAR){CAR.rect={x0:x-1.25,x1:x+1.25,z0:z-1.25,z1:z+1.25,h:1.7};addRectAll(CAR.rect)}
}
function pointFree(x,z,r){
  if(waterAt(x,z)||Math.abs(x)>598||Math.abs(z)>598)return false;
  const list=BLK[Math.floor((x+HALF)/PITCH)+','+Math.floor((z+HALF)/PITCH)]||[];
  for(const b of list){if(b.cam)continue;if(x>b.x0-r&&x<b.x1+r&&z>b.z0-r&&z<b.z1+r)return false}
  return true;
}
function enterCar(){
  if(!CAR)return;const c=CAR;parkCar(null);
  P.x=c.x;P.z=c.z;P.th=c.th;P.vx=P.vz=P.v=0;P.sk=[null,null];setVehicle(c.id);CAMS.dragT=0;Sfx.init();
}
function exitCar(){
  const d=P.def;if(d.kind==='foot')return;
  const fx=Math.sin(P.th),fz=Math.cos(P.th),lx=fz,lz=-fx,half=d.kind==='truck'?2.3:d.kind==='bike'||d.kind==='scooter'?1.1:1.9;
  let ex=null,ez=null;
  for(const [ox,oz] of [[lx*half,lz*half],[-lx*half,-lz*half],[-fx*(half+3),-fz*(half+3)],[fx*(half+3),fz*(half+3)],[lx*(half+1.5),lz*(half+1.5)],[-lx*(half+1.5),-lz*(half+1.5)]]){
    if(pointFree(P.x+ox,P.z+oz,.5)){ex=P.x+ox;ez=P.z+oz;break}}
  if(ex===null){toast('Pas de place pour descendre ici.','bad');return}
  const id=G.veh;parkCar(id,P.x,P.z,P.th);
  setVehicle('foot');P.x=ex;P.z=ez;P.vx=P.vz=P.v=0;P.sk=[null,null];
}
/* point de départ : dans le labo, face aux emplacements ; la voiture choisie garée devant */
function spawnHome(){
  setVehicle('foot');HIDE=null;
  const L=LAB;P.x=L.spawn.x;P.z=L.spawn.z;P.th=L.spawn.th;P.v=0;P.vx=P.vz=0;P.sk=[null,null];
  if(G.veh&&G.veh!=='foot'&&G.owned[G.veh])parkCar(G.veh,L.park.x,L.park.z,L.park.th);else parkCar(null);
  CAMS.yaw=P.th;CAMS.d=4;curShell=shellAt(P.x,P.z);
}
function homeSpawn(){const [qx,qz]=QGP[G.home||'cite'],n=nearestNode(qx,qz);return {x:n.x,z:n.z,n}}
function chooseVehicle(id){
  if(!G.owned[id]||id==='foot')return;G.veh=id;
  const s=menuAt&&menuAt.park?menuAt.park:LAB.park;
  parkCar(id,s.x,s.z,s.th);
}

/* collisions cercle / rectangles (les rectangles « cam » ne bloquent que la caméra) */
function collide(e,r){
  e.x=clamp(e.x,-605,605);e.z=clamp(e.z,-605,605);
  const ci=Math.floor((e.x+HALF)/PITCH),cj=Math.floor((e.z+HALF)/PITCH),list=BLK[ci+','+cj];let hit=0;
  if(!list)return 0;
  for(const b of list){
    if(b.cam)continue;
    const nx=clamp(e.x,b.x0,b.x1),nz=clamp(e.z,b.z0,b.z1),dx=e.x-nx,dz=e.z-nz,d2=dx*dx+dz*dz;
    if(d2<r*r){
      if(d2<1e-6){const l=e.x-b.x0,rr=b.x1-e.x,t=e.z-b.z0,bt=b.z1-e.z,m=Math.min(l,rr,t,bt);
        if(m===l)e.x=b.x0-r;else if(m===rr)e.x=b.x1+r;else if(m===t)e.z=b.z0-r;else e.z=b.z1+r}
      else{const d=Math.sqrt(d2);e.x=nx+dx/d*r;e.z=nz+dz/d*r}
      hit=1}
  }
  return hit;
}

/* ---------- contrôles : clavier, joystick (à pied), flèches (en voiture), glisser pour tourner la caméra ---------- */
const keys={up:0,dn:0,l:0,r:0,sp:0,walk:0};
const KM={arrowup:'up',w:'up',z:'up',arrowdown:'dn',s:'dn',arrowleft:'l',a:'l',q:'l',arrowright:'r',d:'r',' ':'sp'};
addEventListener('keydown',e=>{
  if(e.target&&e.target.tagName==='INPUT')return;
  const kk=e.key.toLowerCase(),k=KM[kk];
  if(e.key==='Shift')keys.walk=1;
  if(e.key==='Escape'){if(mapBig){toggleMap();return}if(talking)return;if(shopOpen){closeShop();return}if(menuOpen){closeMenu();return}}
  if(kk==='n'&&started&&!raidOpen&&!talking&&!ended&&!menuOpen&&!shopOpen){toggleMap();return}
  if((kk==='e'||kk==='enter')&&started&&!paused()){e.preventDefault();act();return}
  if(kk==='r'&&started&&!paused()){actOpt();return}
  if(kk==='t'&&started&&!paused()&&mpReady()){e.preventDefault();openChat();return}
  if(kk==='g'&&started&&!paused()&&P.def.kind!=='foot')startFast();
  if(kk==='h'&&started&&!paused()&&P.def.kind!=='foot')honk();
  if(k&&started&&!menuOpen&&!shopOpen&&!mapBig&&!talking){keys[k]=1;e.preventDefault()}});
addEventListener('keyup',e=>{const k=KM[e.key.toLowerCase()];if(k)keys[k]=0;if(e.key==='Shift')keys.walk=0});
addEventListener('blur',()=>{for(const k in keys)keys[k]=0});
/* flèches à l'écran (en voiture) */
document.querySelectorAll('.cb').forEach(b=>{const k=b.dataset.k;
  const on=e=>{e.preventDefault();keys[k]=1;b.classList.add('on')},off=()=>{keys[k]=0;b.classList.remove('on')};
  b.addEventListener('pointerdown',on);['pointerup','pointerleave','pointercancel'].forEach(t=>b.addEventListener(t,off));
  b.addEventListener('contextmenu',e=>e.preventDefault())});
/* joystick virtuel (à pied) */
const J={x:0,y:0,id:null,cx:0,cy:0,on:false};
{const joy=$('joy'),knob=$('joyK');
 const move=e=>{const R0=joy.clientWidth/2;let dx=e.clientX-J.cx,dy=e.clientY-J.cy;const d=Math.hypot(dx,dy),m=Math.min(d,R0);if(d>0){dx*=m/d;dy*=m/d}J.x=dx/R0;J.y=dy/R0;knob.style.transform=`translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px)`};
 const end=e=>{if(e.pointerId!==J.id)return;J.id=null;J.on=false;J.x=J.y=0;knob.style.transform='';joy.classList.remove('on')};
 joy.addEventListener('pointerdown',e=>{e.preventDefault();if(J.id!==null)return;try{joy.setPointerCapture(e.pointerId)}catch(_){}J.id=e.pointerId;const r=joy.getBoundingClientRect();J.cx=r.left+r.width/2;J.cy=r.top+r.height/2;J.on=true;joy.classList.add('on');move(e);Sfx.init()});
 joy.addEventListener('pointermove',e=>{if(e.pointerId===J.id)move(e)});
 ['pointerup','pointercancel','lostpointercapture'].forEach(t=>joy.addEventListener(t,end));
 joy.addEventListener('contextmenu',e=>e.preventDefault())}
/* glisser sur la vue pour tourner la caméra */
const CAMS={yaw:0,d:7,dragT:0,drag:null};
cv.addEventListener('pointerdown',e=>{if(!started)return;CAMS.drag={id:e.pointerId,x:e.clientX};try{cv.setPointerCapture(e.pointerId)}catch(_){}});
cv.addEventListener('pointermove',e=>{const d=CAMS.drag;if(!d||d.id!==e.pointerId)return;const dx=e.clientX-d.x;d.x=e.clientX;if(Math.abs(dx)>0){CAMS.yaw-=dx*.0065;CAMS.dragT=2.2}});
['pointerup','pointercancel','lostpointercapture'].forEach(t=>cv.addEventListener(t,e=>{if(CAMS.drag&&CAMS.drag.id===e.pointerId)CAMS.drag=null}));
cv.addEventListener('contextmenu',e=>e.preventDefault());

/* déplacement à pied, relatif à la caméra : joystick à fond = course, à moitié = marche */
const WALK=3.1,RUN=8;
function updFoot(dt){
  let ix=J.x,iy=J.y,kb=false;
  if(!J.on){ix=(keys.r?1:0)-(keys.l?1:0);iy=(keys.dn?1:0)-(keys.up?1:0);kb=!!(ix||iy)}
  const mag=Math.min(1,Math.hypot(ix,iy));
  const fx=Math.sin(CAMS.yaw),fz=Math.cos(CAMS.yaw),rx=-fz,rz=fx;
  let mx=fx*(-iy)+rx*ix,mz=fz*(-iy)+rz*ix;const ml=Math.hypot(mx,mz);if(ml>1e-4){mx/=ml;mz/=ml}
  let sp=0;
  if(mag>.12)sp=kb?(keys.walk?WALK:RUN):mag>.8?RUN:WALK*(.5+.5*(mag-.12)/.68);
  P.fwd=mag>.12?Math.max(0,-iy/mag):0;
  const k=Math.min(1,dt*(sp?9:12));
  P.vx+=(mx*sp-P.vx)*k;P.vz+=(mz*sp-P.vz)*k;
  if(sp>.1){let d=Math.atan2(mx,mz)-P.th;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;P.th+=clamp(d,-dt*11,dt*11)}
  const ox=P.x,oz=P.z;P.x+=P.vx*dt;P.z+=P.vz*dt;
  if(waterAt(P.x,P.z)){P.x=ox;P.z=oz;P.vx=P.vz=0}
  collide(P,.42);
  const s=Math.hypot(P.x-ox,P.z-oz)/Math.max(dt,1e-4);
  P.v=s;P.ph+=s*dt*2.3;P.slip=0;P.sk=[null,null];
}

function updPlayer(dt){
  const d=P.def,bike=d.kind==='bike',vmax=d.vmax*(bike?1:mot()),a=d.acc*(bike?1:mot()),foot=d.kind==='foot';
  const fx=Math.sin(P.th),fz=Math.cos(P.th),lx=fz,lz=-fx;
  let vf=P.vx*fx+P.vz*fz,vl=P.vx*lx+P.vz*lz;
  if(keys.up)vf+=a*(1-Math.max(vf,0)/vmax)*dt*(vf<0?3:1);
  else if(keys.dn){if(vf>.5)vf-=38*dt;else vf-=a*.5*(1+vf/(vmax*.3))*dt;vf=Math.max(vf,-vmax*.3)}
  else vf-=Math.sign(vf)*Math.min(Math.abs(vf),(5+.02*vf*vf)*dt);
  if(keys.sp)vf*=Math.max(0,1-1.1*dt);
  const wet=1-.25*WX.lvl;
  const grip=foot?40:keys.sp?1.3*wet:(bike?9:d.kind==='scooter'?6.5:7.2)*wet;
  vl*=Math.exp(-grip*dt);
  P.vx=fx*vf+lx*vl;P.vz=fz*vf+lz*vl;
  const steer=(keys.l?1:0)-(keys.r?1:0);
  P.steer+=(steer-P.steer)*Math.min(1,dt*10);
  const tr=d.turn/(1+Math.abs(vf)/(foot?60:30)),sg=clamp(vf/(foot?1.5:5),-1,1);
  P.th+=P.steer*tr*sg*(keys.sp?1.7:1)*dt;
  const ox=P.x,oz=P.z;
  P.x+=P.vx*dt;P.z+=P.vz*dt;
  // l'eau : on ne roule pas dans la rivière ni dans la mer (les ponts et les pontons, oui)
  {const fx2=Math.sin(P.th),fz2=Math.cos(P.th),rr2=foot?.5:bike?1:2.2;
   if(waterAt(P.x,P.z)||waterAt(P.x+fx2*rr2,P.z+fz2*rr2)){
     const sp=Math.hypot(P.vx,P.vz);P.x=ox;P.z=oz;P.vx*=-.25;P.vz*=-.25;
     if(sp>4){for(let k=0;k<6;k++)puff(P.x+fx2*rr2,P.z+fz2*rr2,R(-3,3),R(-3,3),.7,R(.4,.8),.5);if(sp>9){Sfx.crash(Math.min(1,sp/30));CAM.shake=Math.max(CAM.shake,4)}}}}
  const ex=P.x,ez=P.z,rad=foot?.8:bike?1.1:2.6;
  if(collide(P,rad)){
    const cx=P.x-ex,cz=P.z-ez,nl=Math.hypot(cx,cz);
    if(nl>1e-4){
      const nx=cx/nl,nz=cz/nl,vn=P.vx*nx+P.vz*nz;
      if(vn<0){P.vx-=1.3*vn*nx;P.vz-=1.3*vn*nz}
      P.vx*=.9;P.vz*=.9;
      if(-vn>7){sparks(P.x-nx*rad,P.z-nz*rad,8,14);Sfx.crash(Math.min(1,-vn/30));CAM.shake=Math.max(CAM.shake,Math.min(9,-vn*.35))}
    }
  }
  P.v=P.vx*Math.sin(P.th)+P.vz*Math.cos(P.th);
  P.slip=Math.abs(vl);P.ph+=Math.hypot(P.vx,P.vz)*dt*.75;
  if(!foot&&!bike&&P.slip>4&&Math.hypot(P.vx,P.vz)>5){
    for(let k=0;k<2;k++){const s=k?1:-1,wx=P.x-fx*1.5+lx*.85*s,wz=P.z-fz*1.5+lz*.85*s;
      if(P.sk[k])SKID.push({x1:P.sk[k][0],z1:P.sk[k][1],x2:wx,z2:wz,t:0});
      P.sk[k]=[wx,wz];
      if(Math.random()<dt*30)puff(wx,wz,R(-1.5,1.5),R(-1.5,1.5),.9,R(.6,1.1),.55)}
  }else P.sk=[null,null];
}


/* ---------- caméra à la troisième personne : derrière et au-dessus, suit en douceur, ne traverse pas les murs ---------- */
/* distance libre entre le joueur et la caméra, en suivant le rayon (dx,dz), à la hauteur qui monte de y0 à y1 */
function camRay(px,pz,dx,dz,maxD,y0,y1){
  const cells=new Set();
  for(let k=0;k<=6;k++){const x=px+dx*maxD*k/6,z=pz+dz*maxD*k/6;cells.add(Math.floor((x+HALF)/PITCH)+','+Math.floor((z+HALF)/PITCH))}
  let best=maxD;const m=.32;
  for(const key of cells){const list=BLK[key];if(!list)continue;
    for(const r of list){
      const x0=r.x0-m,x1=r.x1+m,z0=r.z0-m,z1=r.z1+m;
      if(px>x0&&px<x1&&pz>z0&&pz<z1)continue;
      let t0=0,t1=best;
      if(Math.abs(dx)<1e-9){if(px<x0||px>x1)continue}else{let a=(x0-px)/dx,b=(x1-px)/dx;if(a>b){const c=a;a=b;b=c}t0=Math.max(t0,a);t1=Math.min(t1,b)}
      if(Math.abs(dz)<1e-9){if(pz<z0||pz>z1)continue}else{let a=(z0-pz)/dz,b=(z1-pz)/dz;if(a>b){const c=a;a=b;b=c}t0=Math.max(t0,a);t1=Math.min(t1,b)}
      if(t0>t1||t0>=best)continue;
      if(r.h!==undefined&&y0+(y1-y0)*(t0/maxD)>r.h+.3)continue;
      best=t0;
    }}
  return best;
}
function updCamera(dt){
  const kind=P.def.kind,foot=kind==='foot',two=kind==='bike'||kind==='scooter',sh=curShell;
  const dist=foot?7.6:two?8.6:kind==='truck'?16:kind==='van'?13.5:12;
  let hgt=foot?3.4:two?3.9:5.4;
  const py=foot?1.5:two?1.6:1.4;
  if(CAMS.dragT>0&&!CAMS.drag)CAMS.dragT-=dt;
  if(CAMS.dragT<=0){
    const sp=Math.hypot(P.vx,P.vz);let rate=0;
    if(!foot)rate=sp>1.5?3:1.1;else if(sp>.8)rate=1.5*P.fwd;
    if(rate){let d=P.th-CAMS.yaw;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;CAMS.yaw+=d*(1-Math.exp(-dt*rate))}
  }
  if(sh)hgt=Math.min(hgt,sh.ceil-.5-py);
  const fx=Math.sin(CAMS.yaw),fz=Math.cos(CAMS.yaw);
  const free=camRay(P.x,P.z,-fx,-fz,dist,py,py+hgt),allowed=Math.max(1.2,free-.3);
  if(allowed<CAMS.d)CAMS.d=allowed;else CAMS.d+=(allowed-CAMS.d)*(1-Math.exp(-dt*2.2));
  const k=CAMS.d/dist;
  let cx=P.x-fx*CAMS.d,cz=P.z-fz*CAMS.d,cy=py+hgt*(.4+.6*k);
  if(sh)cy=Math.min(sh.camMax||sh.ceil-.4,cy+(1-k)*2.4); // en intérieur, plus la caméra est proche, plus elle monte : vue plongeante
  if(CAM.shake){const s=CAM.shake*.035;cx+=(Math.random()-.5)*s;cy+=(Math.random()-.5)*s;cz+=(Math.random()-.5)*s}
  camera.position.set(cx,Math.max(.6,cy),cz);
  const la=foot?.8:3;camera.lookAt(P.x+fx*la,py+(foot?.15:.5),P.z+fz*la);
}

/* les clients attendent sur le trottoir, pas au milieu de la chaussée */
function sidewalkSnap(x,z){
  if(maskAt(x,z)!==1)return {x,z};
  const n=nearestNode(x,z);if(!n)return {x,z};const rd=ROADS[n.r];
  for(const sd of [1,-1]){const q=roadPos(n.r,rd.cum[n.k],sd*(rd.w/2+2.2)),m=maskAt(q[0],q[1]);
    if(m!==1&&m!==2&&m!==4&&m!==5&&Math.abs(q[0])<596&&Math.abs(q[1])<596)return {x:q[0],z:q[1]}}
  return {x,z};
}

/* ---------- interactions : ce qu'il y a à faire juste devant soi ---------- */
let tgt=null,WP=null,HIDE=null,curShell=null;
function shellAt(x,z){for(const s of SHELLS)if(x>s.ix0&&x<s.ix1&&z>s.iz0&&z<s.iz1)return s;return null}
function findTarget(){
  tgt=null;
  if(!started||ended||paused())return;
  if(P.def.kind!=='foot'){if(Math.abs(P.v)<3.5)tgt={k:'exit',label:'Descendre'};return}
  const sh=curShell;
  if(sh&&sh.lab){tgt=labTarget();if(tgt)return}
  if(sh&&sh.store){const s=sh.store;if(Math.hypot(P.x-s.talk.x,P.z-s.talk.z)<2.3){tgt={k:'shop',s,label:(SHOPTYPES[s.type].bank?'Guichet : ':'Parler à ')+s.clerk};return}}
  let bd=1e9;
  if(CAR&&!sh){const d=Math.hypot(P.x-CAR.x,P.z-CAR.z);if(d<3.9){bd=d;tgt={k:'enter',label:'Monter : '+VM[CAR.id].name}}}
  for(const p of peds){const d=Math.hypot(P.x-p.x,P.z-p.z);if(d<2.6&&d<bd){bd=d;tgt={k:'ped',p,label:'Parler à '+p.name}}}
}
function act(){findTarget();if(!tgt||tgt.k==='info')return;
  switch(tgt.k){case 'exit':exitCar();break;case 'enter':enterCar();break;case 'shop':openShop(tgt.s);break;case 'ped':talkPed(tgt.p);break;default:labDo(tgt)}
  Sfx.click()}
function actOpt(){findTarget();if(tgt&&tgt.opt)labOptions(tgt)}
/* entrer dans une boutique quand on est poursuivi : les flics perdent ta trace s'ils sont assez loin */
function updInside(){
  const sh=shellAt(P.x,P.z);if(sh===curShell)return;
  curShell=sh;
  if(sh&&sh.store&&P.def.kind==='foot'&&(cops.length||threat)){
    const nc=cops.reduce((m,c)=>Math.min(m,Math.hypot(c.x-P.x,c.z-P.z)),1e9);
    if(nc>35){HIDE={s:sh.store,t:0};for(const c of cops)c.path=[];toast(`Tu te planques chez ${sh.store.name}. Les flics perdent ta trace.`,'good')}
    else toast('Les flics t’ont vu entrer. Ils t’attendent dehors.','bad');
  }
  if(!sh&&HIDE){HIDE=null;toast('Tu ressors discrètement.')}
}

/* ---------- IA : chemins sur les routes ---------- */
function pathTo(fx,fz,tx,tz){
  const sN=nearestNode(fx,fz),tN=nearestNode(tx,tz),nodes=astar(sN,tN),w=[];
  for(let i=0;i<nodes.length;i++)if(i%2===0||i===nodes.length-1)w.push([nodes[i].x,nodes[i].z]);
  w.push([tx,tz]);
  return w.filter((p,i)=>!i||Math.hypot(p[0]-w[i-1][0],p[1]-w[i-1][1])>2);
}
function randRoadPoint(cx,cz,rmin,rmax){
  let best=null,bd=1e9;
  for(let k=0;k<40;k++){const n=RN[Math.floor(Math.random()*RN.length)],d=Math.hypot(n.x-cx,n.z-cz);
    if(d>=rmin&&d<=rmax)return {x:n.x,z:n.z,n};const e=d<rmin?rmin-d:d-rmax;if(e<bd){bd=e;best=n}}
  return {x:best.x,z:best.z,n:best};
}
function aiMove(a,tx,tz,dt,vt){
  const dx=tx-a.x,dz=tz-a.z;let d=Math.atan2(dx,dz)-a.th;
  while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;
  a.th+=clamp(d*2.5,-1,1)*a.turn/(1+Math.abs(a.v)/28)*dt;
  const slow=Math.abs(d)>.9?.35:Math.abs(d)>.4?.7:1;
  a.brk=a.v>3&&vt*slow<a.v-2;
  a.v+=(vt*slow-a.v)*Math.min(1,dt*1.8);
  a.x+=Math.sin(a.th)*a.v*dt;a.z+=Math.cos(a.th)*a.v*dt;
  if(collide(a,a.civ?1.9:2.4))a.v*=.85;
}
function followPath(a,dt,vt){
  if(!a.path||!a.path.length)return true;
  const w=a.path[0];
  if(Math.hypot(w[0]-a.x,w[1]-a.z)<(a.path.length>1?14:6)){a.path.shift();if(!a.path.length)return true}
  aiMove(a,a.path[0][0],a.path[0][1],dt,vt);return false;
}
const mkAI=(spr,x,z,th,turn)=>({spr,x,z,th:th||0,v:0,turn:turn||2.2,path:[],t:0,brk:false});

/* ---------- commandes clients ---------- */
let orders=[],oid=1,trackId=null;
function genOrder(px,pz,bonus,nm){
  const av=STRAINS.filter(s=>G.unlocked[s.id]),s=pick(av);
  let x,z;
  if(px!==undefined){x=px;z=pz}
  else if(Math.random()<.6){const p=randRoadPoint(P.x,P.z,60,380);x=p.x;z=p.z}
  else{const n=RN[Math.floor(Math.random()*RN.length)];x=n.x;z=n.z}
  x=clamp(x,-600,600);z=clamp(z,-600,600);{const q=sidewalkSnap(x,z);x=q.x;z=q.z}
  const d=districtAt(x,z),ow=G.own[d.key],rival=ow!=='you'&&!G.ally[ow];
  const o={id:oid++,x,z,s:s.id,qty:RI(3,8+Math.min(12,Math.floor(G.earned/4000))),price:Math.round(s.price*R(.9,1.35)*priceMult()*(rival?1.2:1)*(bonus||1)*(1+.25*TOD.n)*10)/10,ttl:R(130,230),d:d.key,name:nm||pick(NAMES),by:null,cd:0};
  o.rival=rival;o.look=randLook();o.ph=R(0,6);o.nang=R(0,6.28);orders.push(o);return o;
}
function removeOrder(o){orders=orders.filter(q=>q!==o);if(trackId===o.id)trackId=null}
const canDeliver=o=>(G.stock[o.s]||0)>=Math.ceil(o.qty/2);
function sale(o,cut,who){
  const have=G.stock[o.s]||0,n=Math.min(o.qty,have);
  if(n<Math.ceil(o.qty/2)){if(who==='toi')toast(`${o.name} veut ${o.qty} × ${SM[o.s].name}. Tu en as ${have}.`,'bad');return false}
  G.stock[o.s]=have-n;let pay=Math.round(n*o.price*cut);
  const ow=G.own[o.d];
  if(ow!=='you'){
    if(G.ally[ow]){pay-=Math.round(pay*G.ally[ow])}
    else{pay-=Math.round(pay*.1);addRel(ow,-1.5);if(Math.random()<.3)toast(BOSSES[ow].name+' prélève 10 % sur la vente, et n’aime pas te voir chez lui.')}
  }
  G.cash+=pay;G.earned+=pay;
  G.heat=Math.min(100,G.heat+3.5*heatMult()*(who==='toi'?(P.def.kind==='bike'?.7:1):.4)*(n>8?1.2:1));
  toast(`${who==='toi'?'':'Livreur : '}+${fmt(pay)} · ${n} × ${SM[o.s].name} à ${o.name}`,'good');
  floater(o.x,o.z-2,'+'+fmt(pay),'#ffd24a',pay>=500);coins(o.x,o.z,Math.min(14,5+n));if(Math.hypot(P.x-o.x,P.z-o.z)<260)Sfx.cash();
  removeOrder(o);return true;
}
function updOrders(dt){
  for(const o of orders.slice()){
    o.ttl-=dt;if(o.cd>0)o.cd-=dt;
    o.ph+=dt*.8;{const dd=Math.hypot(P.x-o.x,P.z-o.z);if(dd<70)o.nang=Math.atan2(P.x-o.x,P.z-o.z)}
    if(o.ttl<=0&&!o.by){removeOrder(o);continue}
    if(!o.by&&o.cd<=0&&Math.hypot(P.x-o.x,P.z-o.z)<9){if(!sale(o,1,'toi'))o.cd=4}
  }
  const want=Math.min(16,11+Math.floor(G.earned/5000));
  while(orders.length<want)genOrder();
}

/* ---------- police, gangs, livreurs ---------- */
let cops=[],gangs=[],couriers=[],spawnT=0,M=null,mMesh=null;
function updCops(dt){
  const carrying=tot()>0||M;
  const want=carrying?Math.min(6,Math.floor(G.heat/18*(1.15-.5*TOD.n))):0;
  spawnT-=dt;
  if(cops.length<want&&spawnT<=0){const p=randRoadPoint(P.x,P.z,200,300),a=mkAI({k:'sedan',c:0xf2f2f4,cop:1},p.x,p.z,R(0,6.28),2.3);a.catch=0;cops.push(a);spawnT=2.5}
  for(const c of cops.slice()){
    const d=Math.hypot(P.x-c.x,P.z-c.z);
    if((cops.length>want&&d>140)||d>520){cops=cops.filter(q=>q!==c);continue}
    if(HIDE){
      if(!c.path.length){const p=randRoadPoint(c.x,c.z,80,220);c.path=pathTo(c.x,c.z,p.x,p.z)}
      followPath(c,dt,26);c.catch=0;continue}
    c.t-=dt;if(c.t<=0){c.t=.8;c.path=pathTo(c.x,c.z,P.x,P.z)}
    const vt=Math.min(54+G.heat*.22,78)+(M?8:0);
    if(d<45)aiMove(c,P.x,P.z,dt,vt);else followPath(c,dt,vt);
    if(d<6.5&&!curShell)c.catch+=dt*(P.v<8?2:1);else c.catch=Math.max(0,c.catch-dt*2);
    if(c.catch>1.6){arrest();return}
  }
}
const bossHex=id=>hexn(BOSSES[id].col);
let threat=false,chaseToastT=0;
function setupGangs(){
  gangs=[];
  for(const id of BIDS){
    const d=DIS[BOSSES[id].sector];
    for(let n=0;n<2;n++){
      const p=randRoadPoint(d.sx*300,d.sz*300,0,250);
      const g=mkAI({k:'sedan',c:bossHex(id),gang:id},p.x,p.z,R(0,6.28),2.2);
      g.boss=id;g.state='patrol';g.cool=0;g.wait=0;gangs.push(g)}
  }
}
function hitByGang(g,st){
  const b=BOSSES[g.boss];
  g.cool=25;g.state='wait';g.wait=6;
  const frac=st==='war'?.15:.2;
  let lost=0;STRAINS.forEach(s=>{const n=Math.floor((G.stock[s.id]||0)*frac);G.stock[s.id]-=n;lost+=n});
  if(st==='war'){
    const dmg=G.rel[g.boss]<=-80?45:30;G.hp-=dmg;Sfx.shot();CAM.shake=11;floater(P.x,P.z-3,'-'+dmg+' vie','#ff5a40',true);
    toast(`Les hommes de ${b.name} te tirent dessus. Vie -${dmg}, ${lost} unités perdues.`,'bad');
    if(G.hp<=0)gameOver('dead',b.name);
  }else{
    addRel(g.boss,-3);Sfx.crash(.6);CAM.shake=7;
    toast(`Les gars de ${b.name} te passent à tabac et prennent ${lost} unités.`,'bad');
  }
}
function updGangs(dt){
  threat=false;chaseToastT-=dt;
  for(const g of gangs){
    const id=g.boss,b=BOSSES[id];
    if(G.retired[id])continue;
    g.cool=Math.max(0,g.cool-dt);
    const st=stance(id),d=Math.hypot(P.x-g.x,P.z-g.z),inHis=districtAt(P.x,P.z).key===b.sector;
    if(g.state==='wait'){g.wait-=dt;g.v*=.95;g.x+=Math.sin(g.th)*g.v*dt;g.z+=Math.cos(g.th)*g.v*dt;if(g.wait<=0)g.state='patrol';continue}
    const wants=HIDE?false:st==='war'?d<170:st==='hostile'?(inHis&&d<110):false;
    if(wants&&g.state!=='chase'){g.state='chase';if(chaseToastT<=0){chaseToastT=20;toast(`Les gars de ${b.name} te prennent en chasse.`,'bad')}}
    if(g.state==='chase'&&!wants&&(d>200||st==='ally'||st==='neutral'))g.state='patrol';
    if(g.state==='chase'){
      threat=true;
      const vt=st==='war'?(G.rel[id]<=-80?54:46):40;
      g.t-=dt;if(g.t<=0){g.t=.8;g.path=pathTo(g.x,g.z,P.x,P.z)}
      if(d<45)aiMove(g,P.x,P.z,dt,vt);else followPath(g,dt,vt);
      if(d<5&&g.cool<=0&&!curShell){hitByGang(g,st);if(ended)return}
    }else{
      if(!g.path.length){const s=DIS[b.sector],p=randRoadPoint(s.sx*300,s.sz*300,0,260);g.path=pathTo(g.x,g.z,p.x,p.z)}
      followPath(g,dt,22);
    }
  }
}

/* ---------- rencontres avec les gérants ---------- */
let meetCar=null,meetT=110,talking=false,curTalk=null;
function takeStock(n){
  let left=n,val=0;
  for(const s of STRAINS.slice().sort((a,b)=>b.price-a.price)){const q=Math.min(left,G.stock[s.id]||0);if(q>0){G.stock[s.id]-=q;left-=q;val+=q*s.price}}
  return val;
}
const others=id=>BIDS.filter(k=>k!==id&&!G.retired[k]);
const SC={
  tribute(id){
    const b=BOSSES[id],amt=Math.max(500,Math.round(G.cash*.1));
    return {text:`« Tu vends sur mon terrain sans passer me voir. ${fmt(amt)} et on oublie l’affaire. »`,choices:[
      {label:'Payer '+fmt(amt),desc:'Il se calme.',need:amt,fn:()=>{G.cash-=amt;addRel(id,12);return `${b.name} empoche l’enveloppe. « Voilà qui est parler. »`}},
      {label:'Négocier',desc:'Il peut accepter la moitié, ou mal le prendre.',fn:()=>{
        if(Math.random()<.5){const h=Math.min(G.cash,Math.round(amt/2));G.cash-=h;addRel(id,4);return `Il accepte ${fmt(h)}. « Une fois, pas deux. »`}
        addRel(id,-12);return '« Tu me prends pour un clown ? » Il remonte en voiture, furieux.'}},
      {label:'Refuser',desc:'Il le prendra comme une insulte.',fn:()=>{addRel(id,-22);return '« Tu vas le regretter. » La vitre se ferme.'}}]};
  },
  ultimatum(id){
    const b=BOSSES[id],amt=Math.max(3000,Math.round(G.cash*.15));
    return {text:`« Dernier avertissement. Dégage de mes rues ou je m’occupe de toi. » ${b.name} ne sourit pas.`,choices:[
      {label:'Acheter la paix '+fmt(amt),desc:'La tension retombe.',need:amt,fn:()=>{G.cash-=amt;G.rel[id]=Math.max(G.rel[id],-5);return '« Tu as compris. Ne me fais pas regretter. »'}},
      {label:'Proposer une alliance (20 % de tes ventes chez lui)',desc:'Risqué, mais ça peut tout régler.',fn:()=>{
        if(Math.random()<(G.rel[id]>-80?.5:.2)){G.ally[id]=.2;G.rel[id]=10;return 'Il réfléchit longtemps. « D’accord. Mais je surveille. » Alliance conclue.'}
        addRel(id,-10);return 'Il crache par terre. « Pas question. »'}},
      {label:'Négocier',desc:'40 % de chances d’une trêve à moitié prix.',fn:()=>{
        if(Math.random()<.4){const h=Math.min(G.cash,Math.round(amt/2));G.cash-=h;G.rel[id]=-15;return `Trêve. Il prend ${fmt(h)}. « On en reparle. »`}
        addRel(id,-8);return 'Il secoue la tête. La discussion est terminée.'}},
      {label:'Le défier',desc:'Tu gardes ton argent. Et tu gardes un ennemi.',fn:()=>{addRel(id,-20);return 'Il ne répond rien. Il remonte dans sa voiture.'}}]};
  },
  alliance(id){
    const b=BOSSES[id];
    return {text:`« On est voisins, autant s’entendre. Je te laisse vendre chez moi, et tu me laisses 5 % de tes ventes sur mon terrain. »`,choices:[
      {label:'Accepter l’alliance',desc:'Tes ventes chez lui sont tranquilles. 5 % pour lui.',fn:()=>{G.ally[id]=.05;G.rel[id]=Math.max(G.rel[id],30);return `Alliance avec ${b.name}. Ses hommes ne te toucheront plus.`}},
      {label:'Un simple pacte de non-agression',desc:'Pas de lien, pas de commission.',fn:()=>{addRel(id,10);return '« Chacun chez soi. Ça me va. »'}},
      {label:'Décliner',desc:'Il n’aime pas qu’on refuse sa main.',fn:()=>{addRel(id,-6);return '« Tu changeras peut-être d’avis. »'}}]};
  },
  allyDemand(id){
    const b=BOSSES[id],amt=Math.max(2000,Math.round(G.cash*.06));
    return {text:`« Les affaires marchent pour toi. Mon avocat coûte cher, il me faut ${fmt(amt)}. »`,choices:[
      {label:'Payer '+fmt(amt),desc:'Un allié qui te doit une faveur.',need:amt,fn:()=>{G.cash-=amt;addRel(id,8);return '« Tu es un vrai. »'}},
      {label:'Donner la moitié',desc:'Il fera avec.',fn:()=>{const h=Math.min(G.cash,Math.round(amt/2));G.cash-=h;return `Il prend ${fmt(h)}. « Hmm. Merci. »`}},
      {label:'Rompre l’alliance',desc:'Tu retrouves ta liberté et un voisin froid.',fn:()=>{delete G.ally[id];G.rel[id]=0;return '« Très bien. Chacun chez soi, sans rancune. »'}}]};
  },
  help(id){
    const b=BOSSES[id],oth=others(id),o=BOSSES[pick(oth.length?oth:[id])];
    if(o.id===id)return SC.cop(id);
    const amt=Math.max(3000,Math.round(G.cash*.05));
    return {text:`« ${o.name} veut me prendre ma rue. Il me faut des bras et de l’argent. Aide-moi, je te le revaudrai. »`,choices:[
      {label:`L’aider (${fmt(amt)})`,desc:`Tu te brouilles avec ${o.name}.`,need:amt,fn:()=>{
        G.cash-=amt;addRel(id,16);addRel(o.id,-14);
        if(Math.random()<.6){const g=Math.round(amt*2.2);G.cash+=g;return `${b.name} repousse ${o.name}. Il te rend ${fmt(g)}.`}
        return `${b.name} perd du terrain. Il te remercie quand même.`}},
      {label:`Vendre l’info à ${o.name}`,desc:'Tu encaisses, mais ta trahison se saura.',fn:()=>{const g=Math.round(amt*.6);G.cash+=g;addRel(o.id,10);addRel(id,-25);return `${o.name} te paie ${fmt(g)}. ${b.name} ne te le pardonnera pas.`}},
      {label:'Rester neutre',desc:'Ni l’un ni l’autre.',fn:()=>{addRel(id,-3);return '« Je m’en souviendrai. »'}}]};
  },
  loan(id){
    const b=BOSSES[id],n=Math.min(tot(),20);
    if(n<8)return SC.cop(id);
    return {text:`« J’ai un gros client. Avance-moi ${n} unités, je t’en rends le double ce soir. »`,choices:[
      {label:`Prêter ${n} unités`,desc:'55 % de chances de doubler la mise.',fn:()=>{
        const v=takeStock(n);
        if(Math.random()<.55){const g=Math.round(v*2);G.cash+=g;addRel(id,8);return `Ça marche. Il te rend ${fmt(g)}.`}
        addRel(id,-10);return '« Le client a disparu. Pas de chance. » Tu ne reverras rien.'}},
      {label:`Prêter ${Math.floor(n/2)} unités`,desc:'65 % de chances, gain plus faible.',fn:()=>{
        const v=takeStock(Math.floor(n/2));
        if(Math.random()<.65){const g=Math.round(v*1.7);G.cash+=g;addRel(id,5);return `Il te rend ${fmt(g)}.`}
        addRel(id,-6);return 'Rien ne revient.'}},
      {label:'Refuser',desc:'Aucun risque.',fn:()=>{addRel(id,-2);return '« Tant pis. »'}}]};
  },
  cop(id){
    const b=BOSSES[id],amt=Math.round(3000+G.cash*.02);
    const ch=[
      {label:'Payer '+fmt(amt),desc:'Ta chaleur retombe à zéro.',need:amt,fn:()=>{G.cash-=amt;G.heat=0;addRel(id,2);return 'Un coup de fil, et les patrouilles changent de quartier.'}}];
    if(G.strikes>0)ch.push({label:'Faire effacer un casier '+fmt(amt*4),desc:'Retire une arrestation de ton dossier.',need:amt*4,fn:()=>{G.cash-=amt*4;G.strikes--;return 'Un dossier disparaît d’un tiroir.'}});
    ch.push({label:'Refuser',desc:'Tu gardes ton argent.',fn:()=>'« Comme tu veux. »'});
    return {text:`« Un policier ripou me doit un service. Pour ${fmt(amt)}, il peut calmer la police autour de toi. »`,choices:ch};
  },
  sell(id){
    const b=BOSSES[id],sec=DIS[b.sector],price=300000;
    const buy=p=>{G.cash-=p;G.own[b.sector]='you';G.retired[id]=1;delete G.ally[id];return `${b.name} part sans se retourner. ${sec.name} est à toi : clients mieux payés (+10 %) et un gang de moins.`};
    return {text:`« J’arrête la rue. Mon secteur, ${sec.name}, ses clients et ses nuits tranquilles pour ${fmt(price)}. »`,choices:[
      {label:'Acheter '+fmt(price),desc:'Tu prends le secteur.',need:price,fn:()=>buy(price)},
      {label:'Contre-offre à '+fmt(Math.round(price*.65)),desc:'45 % de chances qu’il accepte.',need:Math.round(price*.65),fn:()=>{if(Math.random()<.45)return buy(Math.round(price*.65));addRel(id,-10);return '« Pour qui tu me prends ? » L’offre est retirée.'}},
      {label:'Refuser',desc:'Il vendra peut-être à quelqu’un d’autre.',fn:()=>'« Je reviendrai peut-être. »'}]};
  },
};
function pickScenario(id){
  const opts=[];
  const st=stance(id);
  if(st==='ally')opts.push('allyDemand','loan','cop','cop');
  else if(st==='war')opts.push('ultimatum');
  else if(st==='hostile')opts.push('tribute','tribute','ultimatum');
  else{
    opts.push('alliance','alliance','loan','cop');
    if((G.rel[id]||0)<0)opts.push('tribute');
    if(G.cash>=180000&&G.own[BOSSES[id].sector]===id)opts.push('sell','sell');
  }
  return SC[pick(opts)](id);
}
function startMeeting(){
  const cand=BIDS.filter(id=>!G.retired[id]);
  if(!cand.length){meetT=9999;return}
  const id=pick(cand),b=BOSSES[id];
  const p=randRoadPoint(P.x,P.z,160,260);
  const a=mkAI({k:'sedan',c:bossHex(id)},p.x,p.z,R(0,6.28),2.3);a.boss=id;a.age=0;meetCar=a;
  toast(`${b.name} vient te parler. Suis la flèche : cercle ${b.cn}.`);Sfx.alert();
}
function endMeeting(){meetCar=null;meetT=R(100,170)}
function updMeeting(dt){
  if(!meetCar){meetT-=dt;if(meetT<=0&&!M&&G.earned>=300)startMeeting();return}
  const a=meetCar,d=Math.hypot(P.x-a.x,P.z-a.z);a.age+=dt;
  a.t-=dt;if(a.t<=0){a.t=.8;a.path=pathTo(a.x,a.z,P.x,P.z)}
  if(d>10){if(d<45)aiMove(a,P.x,P.z,dt,30);else followPath(a,dt,34)}else a.v*=.9;
  if(d<14){openTalk(a.boss);return}
  if(a.age>70&&d>300){toast(BOSSES[a.boss].name+' repart. Il repassera.');endMeeting()}
}
function renderChoices(sc){
  $('tText').textContent=sc.text;
  $('tChoices').innerHTML=sc.choices.map((c,i)=>`<button class="item" data-i="${i}"${(c.need&&G.cash<c.need)||c.off?' disabled':''}><b>${c.label}</b><span>${c.desc||''}</span></button>`).join('');
}
function openDialog(name,col,sc,after){
  talking=true;for(const k in keys)keys[k]=0;
  curTalk={sc,after};
  $('talk').hidden=false;$('tName').textContent=name;$('tName').style.color=col;
  renderChoices(sc);
}
function openTalk(id){const b=BOSSES[id];openDialog(b.name,b.col,pickScenario(id),null);curTalk.boss=1}
$('tChoices').addEventListener('click',e=>{
  const el=e.target.closest('[data-i]');if(!el||el.disabled||!curTalk)return;
  if(curTalk.done){closeTalk();return}
  const c=curTalk.sc.choices[+el.dataset.i];if(!c)return;
  if(c.close){closeTalk();return}
  if(c.quick){if(c.fn)c.fn();save();closeTalk();return}
  const res=c.fn?c.fn():'';
  save();
  if(res&&typeof res==='object'){curTalk.sc=res;renderChoices(res);return}
  curTalk.done=1;
  $('tText').textContent=res;
  $('tChoices').innerHTML='<button class="item" data-i="0"><b>OK</b></button>';
});
function closeTalk(){const t=curTalk;talking=false;curTalk=null;$('talk').hidden=true;if(t&&t.after)t.after();else if(!t||t.boss)endMeeting()}
function syncCouriers(){
  const n=lv('livreur');
  while(couriers.length<n){
    const h=homeSpawn(),c=mkAI({k:'van',c:0xf5f5f5,courier:1},h.x,h.z,0,1.9);c.order=null;couriers.push(c)}
}
function updCouriers(dt){
  for(const c of couriers){
    if(!c.order){
      let best=null,bd=1e9;
      for(const o of orders)if(!o.by&&canDeliver(o)&&o.ttl>20){const d=Math.hypot(o.x-c.x,o.z-c.z);if(d<bd){bd=d;best=o}}
      if(best){best.by=c;c.order=best;c.path=pathTo(c.x,c.z,best.x,best.z)}
      else{c.v*=.95;continue}
    }
    if(!orders.includes(c.order)){c.order=null;continue}
    const done=followPath(c,dt,30);
    if(done||Math.hypot(c.order.x-c.x,c.order.z-c.z)<8){
      const o=c.order;c.order=null;
      if(!sale(o,.75,'livreur')){o.by=null;o.cd=10}
    }
  }
}

/* ---------- go fast ---------- */
function startFast(){
  if(M){toast('Tu as déjà un go fast en cours.','bad');return}
  if(!P.def.fast){toast('Il te faut une voiture rapide : Classe G, RS6, M5 ou Bugatti.','bad');return}
  if(tot()<10){toast('Il faut au moins 10 unités en stock pour un go fast.','bad');return}
  let left=Math.min(tot(),50),value=0,units=0;
  for(const s of STRAINS.slice().sort((a,b)=>b.price-a.price)){
    const n=Math.min(left,G.stock[s.id]||0);if(n>0){G.stock[s.id]-=n;left-=n;units+=n;value+=n*s.price*3.5*(1+.08*lv('nego'))}}
  let dest=null;
  for(let n=0;n<40&&!dest;n++){const p=randRoadPoint(0,0,0,850);if(Math.hypot(p.x-P.x,p.z-P.z)>=550)dest=p}
  if(!dest)dest=randRoadPoint(P.x,P.z,400,700);
  const dist=Math.hypot(dest.x-P.x,dest.z-P.z);
  M={dest,units,value:Math.round(value),t:dist/(P.def.vmax*mot()*.5)+20};
  G.heat=Math.max(G.heat,55);
  toast(`Go fast lancé : ${units} unités, ${fmt(M.value)} à la clé. La police est au courant.`,'bad');
  closeMenu();
}
function endFast(){M=null}
function updMission(dt){
  if(!M)return;
  M.t-=dt;
  if(Math.hypot(P.x-M.dest.x,P.z-M.dest.z)<14){
    const pay=M.value+Math.round(M.t*30);G.cash+=pay;G.earned+=pay;
    toast(`Go fast réussi : +${fmt(pay)} !`,'good');endFast();return}
  if(M.t<=0){toast('Go fast raté : la marchandise est perdue.','bad');G.heat=Math.min(100,G.heat+10);endFast()}
}

/* ---------- descente de police ---------- */
let raidOpen=false;
function arrest(){
  G.strikes++;G.strikeT=0;
  if(G.strikes>=MAXSTRIKES){gameOver('prison');return}
  const al=lv('avocat'),cashLoss=[.3,.2,.12,.06][al],stockLoss=[1,.8,.6,.4][al];
  let lost=0;STRAINS.forEach(s=>{const n=Math.floor((G.stock[s.id]||0)*stockLoss);G.stock[s.id]-=n;lost+=n});
  const cl=Math.floor(G.cash*cashLoss);G.cash-=cl;
  const mm=M?M.units:0;if(M)endFast();HIDE=null;
  G.heat=10;cops=[];CAM.shake=8;Sfx.crash(.8);
  spawnHome();
  $('raidP').textContent=`Les flics t’ont coincé. Tu perds ${lost+mm} unités et ${fmt(cl)}.${al?' Ton avocat a limité la casse.':''} Casier : ${G.strikes}/${MAXSTRIKES}. À la troisième arrestation, c’est la prison.`;
  raidOpen=true;$('raid').hidden=false;save();
}
$('raidOk').onclick=()=>{raidOpen=false;$('raid').hidden=true};

/* ---------- fin de partie ---------- */
let ended=false;
function gameOver(kind,by){
  if(ended)return;ended=true;HIDE=null;
  for(const k in keys)keys[k]=0;
  closeMenu();$('talk').hidden=true;$('raid').hidden=true;talking=false;
  const mins=Math.floor(G.t/60),st=`Temps de jeu : ${mins} min. Argent gagné : ${fmt(G.earned)}.`;
  const T={
    win:['VICTOIRE','Tu as atteint 10 000 000 €. Les Lilas sont à toi. '+st],
    prison:['PRISON','Troisième arrestation. Le juge ne rigole pas : tu ne reverras pas les Lilas avant longtemps. '+st],
    dead:['MORT',`${by} a réglé le problème. Ton nom ne sera plus prononcé dans le quartier. `+st],
  }[kind];
  $('endT').textContent=T[0];$('endT').style.color=kind==='win'?'var(--ok)':'var(--heat)';$('endP').textContent=T[1];
  $('end').hidden=false;
  try{localStorage.removeItem(KEY)}catch(e){}
}
$('endOk').onclick=()=>resetGame();


/* ---------- le labo du joueur et les QG des autres gangs ---------- */
let LAB=null,LMGROUP=null;
function placeLandmarks(){
  for(const k in BLK)BLK[k]=BLK[k].filter(r=>!r.lm);
  for(let i=SHELLS.length-1;i>=0;i--)if(SHELLS[i].lab)SHELLS.splice(i,1);
  if(LMGROUP){scene.remove(LMGROUP);LMGROUP.traverse(o=>{if(o.geometry&&!o.userData.shared)o.geometry.dispose()})}
  LMGROUP=new THREE.Group();scene.add(LMGROUP);
  const tw=new GB(),glow=new GB();
  for(const k of DKEYS){
    const [cx,cz]=QGP[k];
    if(k===G.home){LAB=buildLab(cx,cz);continue}
    const c=_col(hexn(DIS[k].col));
    tw.box(cx-12,0,cz-12,cx+12,.15,cz+12,_col(0x2c2724));
    tw.box(cx-6,0,cz-6,cx+6,90,cz+6,c,{uS:24,vS:28,top:false});
    glow.box(cx-6.1,84,cz-6.1,cx+6.1,86,cz+6.1,_col(hexn(DIS[k].col)).lerp(WHITE,.35));
    tw.box(cx-5,90,cz-5,cx+5,91,cz+5,_col(0x3a3d42));
    addRectAll({x0:cx-6,x1:cx+6,z0:cz-6,z1:cz+6,h:90,lm:1});
  }
  meshOf(tw,MAT.facade,{parent:LMGROUP,cast:true});meshOf(glow,MAT.lit,{parent:LMGROUP,recv:false});
  labFloorSync(true);labSync(true);
}
function buildLab(cx,cz){
  const n=nearestNode(cx,cz),dx=n.x-cx,dz=n.z-cz;let nx=0,nz=0;
  if(Math.abs(dx)>Math.abs(dz))nx=Math.sign(dx)||1;else nz=Math.sign(dz)||1;
  const DN=18,WT=26,hx=nx?DN/2:WT/2,hz=nx?WT/2:DN/2;
  const sh=buildShell({x0:cx-hx,x1:cx+hx,z0:cz-hz,z1:cz+hz,h:7.4,nx,nz,col:0x9a6450,ceil:5.4,inCol:0xd9d3c7,floorCol:0x5a5f64,
    sign:'LA SERRE',signBg:'#4b2470',signFg:'#e9ffd0',lm:true,parent:LMGROUP});
  sh.lab=true;sh.camMax=sh.ceil-.9; // sous les rampes de lampes
  const L={sh,slots:[],nx,nz,items:new Map(),floorN:-1,floor:null};
  for(let i=0;i<LAB_MAX;i++){const r=Math.floor(i/LAB_COLS),c=i%LAB_COLS,[x,z]=shellLocal(sh,4.6+r*3,-7.5+c*3);L.slots.push({x,z,r,c})}
  const gb=new GB(),lit=new GB(),W2=sh.W/2,D=sh.D,sR=W2,sL=-W2;
  // sol en béton, paillasson
  {const fl=new GB(),[ax,az]=shellLocal(sh,0,-W2),[bx,bz]=shellLocal(sh,D,W2);fl.hq(Math.min(ax,bx),Math.min(az,bz),Math.max(ax,bx),Math.max(az,bz),.05,WHITE,5);
   const m=new THREE.Mesh(fl.geo(),new THREE.MeshLambertMaterial({map:TEX.conc,color:0x8f9295,...PO(1)}));m.receiveShadow=true;LMGROUP.add(m)}
  lbox(sh,gb,.05,1.1,-1.1,1.1,.05,.08,0x2a2622);
  // le bureau : plateau, pieds, écran, clavier, souris, lampe, papiers, chaise, caisson
  lbox(sh,gb,.7,1.7,-5.6,-2.9,.74,.8,0x6b5440,true);
  for(const [d,s] of [[.75,-5.5],[.75,-3],[1.6,-5.5],[1.6,-3]])lbox(sh,gb,d,d+.08,s,s+.08,0,.74,0x3a2e24);
  lbox(sh,gb,1.0,1.1,-4.8,-3.6,.82,1.62,0x15161a);lbox(sh,gb,1.2,1.5,-4.4,-4.0,.8,.84,0x15161a);
  lbox(sh,lit,1.1,1.13,-4.72,-3.68,.9,1.55,0x4fb3ff);
  lbox(sh,gb,1.42,1.6,-4.65,-3.85,.8,.83,0x24262b);lbox(sh,gb,1.45,1.56,-3.55,-3.45,.8,.83,0x24262b);
  lbox(sh,gb,.85,.95,-5.45,-5.35,.8,1.3,0x2a2c30);lbox(sh,lit,.92,1.15,-5.5,-5.28,1.22,1.3,0xfff0c0);
  lbox(sh,gb,1.15,1.5,-3.35,-3.0,.8,.82,0xf2efe8);lbox(sh,gb,1.2,1.48,-3.3,-3.05,.82,.84,0xe8e2d0);
  lbox(sh,gb,2.0,2.5,-4.5,-3.9,0,.5,0x2a2c30);lbox(sh,gb,2.4,2.5,-4.5,-3.9,.5,1.2,0x2a2c30);
  lbox(sh,gb,.7,1.3,-6.5,-5.85,0,1.1,0x8d9096,true);lbox(sh,gb,1.29,1.31,-6.4,-5.95,.85,.9,0x55585e);
  // évier et robinet, contre le mur de droite (pour remplir l'arrosoir)
  lbox(sh,gb,2.2,3.5,sR-.75,sR,0,.82,0x9aa0a6,true);lbox(sh,gb,2.25,3.45,sR-.72,sR-.03,.82,.9,0xc9cdd2);lbox(sh,gb,2.4,3.3,sR-.6,sR-.12,.865,.905,0x4f5660);
  lbox(sh,gb,2.8,2.9,sR-.12,sR-.02,.9,1.38,0xb8bcc2);lbox(sh,gb,2.8,2.9,sR-.45,sR-.1,1.3,1.38,0xb8bcc2);lbox(sh,gb,2.6,2.7,sR-.14,sR-.04,1.05,1.15,0xc0392b);
  lbox(sh,gb,3.6,3.95,sR-.62,sR-.28,0,.34,0x3f7a4a);lbox(sh,gb,3.75,3.82,sR-.75,sR-.28,.3,.36,0x3f7a4a);
  lbox(sh,gb,4.2,4.9,sR-.72,sR-.05,0,1.0,0x2f6f96,true);lbox(sh,gb,4.3,4.8,sR-.62,sR-.15,1.0,1.05,0x24587a);
  lbox(sh,gb,5.3,5.9,sR-.25,sR-.02,.8,1.4,0x2f8a4a);
  // établi et panneau à outils, contre le mur de gauche
  lbox(sh,gb,6,9.4,sL,sL+.8,.88,.95,0x8a6a48,true);
  for(const d of [6.05,9.25])for(const s of [sL+.05,sL+.68])lbox(sh,gb,d,d+.1,s,s+.08,0,.88,0x5a4636);
  lbox(sh,gb,6,9.4,sL,sL+.05,1.2,2.4,0xb89a6a);
  for(const [d0,d1,y0,y1,c] of [[6.4,6.5,1.5,2.1,0x2a2c30],[6.8,7.4,1.9,2.0,0xc0392b],[7.7,7.8,1.4,2.2,0x2a2c30],[8.1,8.6,1.6,1.75,0x777b82],[8.9,9.0,1.5,2.0,0xe0b020]])lbox(sh,gb,d0,d1,sL+.05,sL+.1,y0,y1,c);
  lbox(sh,gb,6.3,6.8,sL+.2,sL+.6,.95,1.15,0xc0392b);lbox(sh,gb,7.4,8.4,sL+.15,sL+.65,.95,1.0,0x3a3d42);
  // ventilateur sur pied, gaine de ventilation au plafond
  lbox(sh,gb,12.25,12.45,sL+.45,sL+.65,0,1.3,0x2a2c30);lbox(sh,gb,12.05,12.65,sL+.25,sL+.85,1.3,1.95,0x55585e);
  lbox(sh,gb,2,D-1,sR-1.7,sR-1.0,sh.ceil-.8,sh.ceil-.2,0xb8bcc2);
  // sacs de terreau et d'engrais au fond, extincteur, poubelle
  const sacks=[0xb89a6a,0x8a6d4a,0x5f8a35,0xd9d4c0];
  for(let i=0;i<7;i++){const d=D-1.5+(i%2)*.7,s=sL+.3+Math.floor(i/2)*.9,y=i>=6?.4:0;lbox(sh,gb,d,d+.65,s,s+.8,y,y+.4,sacks[i%4])}
  lbox(sh,new GB(),D-1.6,D,sL,sL+3.4,0,.8,0,true);
  lbox(sh,gb,.2,.45,1.7,1.95,0,.65,0xc0392b);lbox(sh,gb,.25,.4,1.75,1.9,.65,.75,0x2a2c30);
  lbox(sh,gb,.3,.8,-7.2,-6.7,0,.75,0x3a3d42);
  // étagères de stockage, à droite en entrant
  lbox(sh,gb,.5,1.3,2.9,6.2,0,2.3,0x6b5440,true);
  for(let i=0;i<10;i++){const s=3.05+(i%5)*.6,y=i<5?.9:1.6;lbox(sh,gb,.6,1.2,s,s+.45,y,y+.5,sacks[i%4])}
  // rampes de lampes de culture au plafond
  for(let r=0;r<LAB_ROWS;r++){lbox(sh,gb,4.25+r*3,4.95+r*3,-9,9,sh.ceil-.5,sh.ceil-.4,0x2a2c30);lbox(sh,lit,4.35+r*3,4.85+r*3,-8.8,8.8,sh.ceil-.53,sh.ceil-.5,0xd9a0ff)}
  const sky=new GB();for(let r=0;r<3;r++){const [ax,az]=shellLocal(sh,3.5+r*4.5,-9),[bx,bz]=shellLocal(sh,6+r*4.5,9);sky.box(Math.min(ax,bx),sh.h+.05,Math.min(az,bz),Math.max(ax,bx),sh.h+.5,Math.max(az,bz),WHITE)}
  meshOf(gb,MAT.vc,{parent:LMGROUP,cast:true});meshOf(lit,MAT.lit,{parent:LMGROUP,recv:false});
  {const m=new THREE.Mesh(sky.geo(),MAT.sky);LMGROUP.add(m)}
  {const [x,z]=shellLocal(sh,2.6,-4.25);L.pc={x,z}}
  {const [x,z]=shellLocal(sh,2.85,sR-1.3);L.tap={x,z}}
  {const [x,z]=shellLocal(sh,3.1,1.5);L.spawn={x,z,th:Math.atan2(-nx,-nz)}}
  L.park=roadsideSpot(sh.door.x,sh.door.z);
  L.group=new THREE.Group();LMGROUP.add(L.group);
  return L;
}
/* tuiles au sol : emplacement libre (pointillés) ou verrouillé (hachures rouges) */
function labFloorSync(force){
  const L=LAB;if(!L)return;const n=labSlots();if(!force&&n===L.floorN)return;L.floorN=n;
  if(L.floor){for(const m of L.floor){L.group.remove(m);m.geometry.dispose()}}
  const a=new GB(),b=new GB(),W1=_col(0xffffff);
  L.slots.forEach((p,i)=>{(i<n?a:b).hq(p.x-1.25,p.z-1.25,p.x+1.25,p.z+1.25,.07,W1)});
  L.floor=[];
  for(const [gb,mat] of [[a,MAT.slot],[b,MAT.lock]])if(!gb.empty){const g=gb.geo(),uv=g.attributes.uv;for(let i=0;i<uv.count;i+=4){uv.setXY(i,0,1);uv.setXY(i+1,1,1);uv.setXY(i+2,1,0);uv.setXY(i+3,0,0)}const m=new THREE.Mesh(g,mat);L.group.add(m);L.floor.push(m)}
}
/* machines installées : un modèle par emplacement, reconstruit seulement quand il change */
const itemAt=i=>G.lab.items.find(it=>it.slot===i)||null;
function itemModel(it){
  const m=MM[it.id],gb=new GB(),lit=new GB(),g=new THREE.Group();let ph=0;
  if(it.id==='pot'){gb.cyl(0,0,.34,0,.5,10,_col(0xb5603a),_col(0x3a2a1c));ph=.5}
  else if(it.id==='bac'){gb.box(-.75,0,-.45,.75,.55,.45,_col(0x4a5a4a),{tc:_col(0x3a2a1c)});for(const s of [-1,1])gb.box(s*.72-.04,.55,-.04,s*.72+.04,2.2,.04,_col(0x2a2c30));gb.box(-.76,2.15,-.12,.76,2.25,.12,_col(0x2a2c30));lit.box(-.7,2.1,-.08,.7,2.15,.08,_col(0xd9a0ff));ph=.55}
  else if(it.id==='table'){for(const [x,z] of [[-.85,-.5],[.85,-.5],[-.85,.5],[.85,.5]])gb.box(x-.04,0,z-.04,x+.04,.85,z+.04,_col(0x9aa0a6));gb.box(-.95,.85,-.6,.95,1.0,.6,_col(0xeef0f2),{tc:_col(0x2f6f96)});gb.box(-.9,.3,-.05,.9,.4,.05,_col(0x2f6f96));
    for(const s of [-1,1])gb.box(s*.92-.04,1,-.04,s*.92+.04,2.5,.04,_col(0x2a2c30));gb.box(-.95,2.45,-.14,.95,2.55,.14,_col(0x2a2c30));lit.box(-.9,2.4,-.1,.9,2.45,.1,_col(0xf0e0ff));ph=1}
  else if(it.cat==='eau'||m.cat==='eau'){const big=it.id==='arroseur2';gb.cyl(0,0,big?.45:.35,0,big?1.3:1,12,_col(0x2f6f96));gb.box(-.04,1,-.04,.04,big?2:1.6,.04,_col(0x9aa0a6));gb.box(-.4,big?1.95:1.55,-.04,.4,big?2.05:1.65,.04,_col(0x9aa0a6))}
  else if(m.cat==='transfo'){const col=[0,0x8d9096,0x5f7488,0x3a3d42][m.tier],h=1.7+.25*m.tier;gb.box(-.65,0,-.5,.65,h,.5,_col(col));gb.box(-.5,.3,.5,.5,h-.3,.53,_col(0x2a2c30));lit.box(-.4,.45,.53,.4,h-.5,.55,_col(0xffb060));gb.box(-.2,h,-.2,.2,h+.25,.2,_col(0x2a2c30))}
  const body=new THREE.Mesh(gb.geo(),MAT.vc);body.castShadow=true;body.receiveShadow=true;g.add(body);
  if(!lit.empty){const l=new THREE.Mesh(lit.geo(),MAT.lit);g.add(l);g.userData.lit=l}
  g.userData.ph=ph;
  return g;
}
const RECT_HALF={pot:.4,bac:.8,table:1,arroseur:.4,arroseur2:.5,sechoir:.7,sechoir2:.7,sechoir3:.7};
function labSync(force){
  const L=LAB;if(!L)return;
  for(let i=0;i<LAB_MAX;i++){
    const it=itemAt(i),key=it?it.id:'',cur=L.items.get(i);
    if(!force&&(cur?cur.key:'')===key)continue;
    if(cur){L.group.remove(cur.g);cur.g.traverse(o=>{if(o.geometry&&!o.userData.shared)o.geometry.dispose()});for(const k in BLK)BLK[k]=BLK[k].filter(r=>r!==cur.rect);L.items.delete(i)}
    if(!it)continue;
    const g=itemModel(it),p=L.slots[i];g.position.set(p.x,.05,p.z);g.rotation.y=Math.atan2(-L.nx,-L.nz);L.group.add(g);
    const hw=RECT_HALF[it.id]||.5,rect={x0:p.x-hw,x1:p.x+hw,z0:p.z-hw,z1:p.z+hw,h:1.2,lm:1};addRectAll(rect);
    L.items.set(i,{key,g,rect,plant:null});
  }
}
/* plantes : grandissent, jaunissent si elles ont soif, fleurissent quand elles sont prêtes */
const PLANT_GEO={stem:(()=>{const g=new THREE.BoxGeometry(.06,1,.06);g.translate(0,.5,0);return g})(),leaf:new THREE.ConeGeometry(.42,.7,6),bud:new THREE.IcosahedronGeometry(.13,0)};
for(const k in PLANT_GEO)PLANT_GEO[k].userData={};
const _pc1=_col(0x4f9a2f),_pc2=_col(0xa08a3a),_pc3=_col(0x6b4a2a);
function plantModel(){
  const g=new THREE.Group(),mat=new THREE.MeshLambertMaterial({color:0x4f9a2f,flatShading:true});
  const stem=new THREE.Mesh(PLANT_GEO.stem,matOf(0x5a7a2a));g.add(stem);
  const leaves=[];for(let k=0;k<3;k++){const l=new THREE.Mesh(PLANT_GEO.leaf,mat);l.position.y=.45+k*.32;l.scale.setScalar(1-k*.22);l.castShadow=true;g.add(l);leaves.push(l)}
  const buds=new THREE.Group();for(let k=0;k<5;k++){const b=new THREE.Mesh(PLANT_GEO.bud,matOf(0xd8f0a0));const a=k/5*6.28;b.position.set(Math.cos(a)*.22,.7+(k%2)*.3,Math.sin(a)*.22);buds.add(b)}
  buds.add(new THREE.Mesh(PLANT_GEO.bud,matOf(0xc9a0ff)));buds.children[5].position.y=1.25;g.add(buds);
  g.traverse(o=>{if(o.geometry)o.userData.shared=1});
  g.userData={mat,leaves,buds};return g;
}
function labVisual(t){
  const L=LAB;if(!L)return;
  const near=Math.hypot(P.x-L.sh.door.x,P.z-L.sh.door.z)<70||(curShell&&curShell.lab);
  L.group.visible=!!near;if(!near)return;
  for(const [i,e] of L.items){
    const it=itemAt(i);if(!it)continue;const m=MM[it.id];
    if(m.cat==='culture'){
      if(it.pl&&!e.plant){e.plant=plantModel();e.plant.position.y=e.g.userData.ph;e.g.add(e.plant)}
      if(!it.pl&&e.plant){e.g.remove(e.plant);e.plant=null}
      if(e.plant){const pl=it.pl,u=e.plant.userData,dead=pl.hp<=0,s=.22+.95*Math.min(1,pl.p);
        e.plant.scale.setScalar(dead?Math.max(.3,s*.8):s);
        u.mat.color.copy(_pc1).lerp(_pc2,dead?0:clamp(1-pl.hp/100,0,1));if(dead)u.mat.color.copy(_pc3);
        e.plant.rotation.z=dead?.5:(1-pl.hp/100)*.25+Math.sin(t*1.3+i)*.02;
        u.buds.visible=pl.p>=1&&!dead}
    }else if(m.cat==='transfo'&&e.g.userData.lit){e.g.userData.lit.material=it.b?MAT.lit:MATOFF}
    else if(m.cat==='eau')e.g.children[0].rotation.y=t*2;
  }
}
const MATOFF=new THREE.MeshBasicMaterial({color:0x2a2c30});

/* ---------- gestion du labo : planter, arroser, tailler, récolter, sécher ---------- */
const slotRC=i=>[Math.floor(i/LAB_COLS),i%LAB_COLS];
const bestSeed=()=>(G.seeds[G.sel]||0)>0?G.sel:(STRAINS.slice().sort((a,b)=>b.price-a.price).find(s=>(G.seeds[s.id]||0)>0)||{}).id;
function harvestYield(it){const pl=it.pl,s=SM[pl.s],m=MM[it.id];return Math.max(1,Math.round(s.yield*yieldMult()*m.yld*(pl.pr===2?1.2:1)*(.6+.4*pl.hp/100)))}
function lPlace(i,id){if(itemAt(i)||i>=labSlots()||!(G.lab.store[id]>0))return;G.lab.store[id]--;G.lab.items.push({id,slot:i,pl:null});labSync();save()}
function lRemove(i){const it=itemAt(i);if(!it||it.b)return;G.lab.items=G.lab.items.filter(x=>x!==it);G.lab.store[it.id]=(G.lab.store[it.id]||0)+1;labSync();save();toast(MM[it.id].name+' rangé dans ton stock.')}
function lPlant(i,s,quiet){const it=itemAt(i);if(!it||MM[it.id].cat!=='culture'||it.pl||!(G.seeds[s]>0))return false;G.seeds[s]--;it.pl={s,p:0,w:100,hp:100,pr:0};if(!quiet){G.sel=s;save()}return true}
function lWater(i){const it=itemAt(i);if(!it||!it.pl||it.pl.hp<=0)return;
  if(G.can<=0){toast('Arrosoir vide : remplis-le au robinet, à droite de l’entrée.','bad');return}
  G.can--;it.pl.w=100;floater(P.x,P.z,'Arrosé · arrosoir '+G.can+'/'+CAN_MAX,'#7fd1ff',false)}
function lTap(){G.can=CAN_MAX;floater(P.x,P.z,'Arrosoir rempli','#7fd1ff',false)}
function lPrune(i){const it=itemAt(i);if(it&&it.pl&&it.pl.pr===1){it.pl.pr=2;floater(P.x,P.z,'Taillée : +20 %','#9ccf6a',false)}}
function lClear(i){const it=itemAt(i);if(it)it.pl=null}
function lHarvest(i,quiet){
  const it=itemAt(i);if(!it||!it.pl||it.pl.p<1||it.pl.hp<=0)return false;
  const y=harvestYield(it);
  if(tot()+rawTot()+y>cap()){if(!quiet)toast('Plus de place pour stocker : vends ou agrandis ton stock.','bad');return false}
  G.raw[it.pl.s]=(G.raw[it.pl.s]||0)+y;if(!quiet){floater(P.x,P.z,'+'+y+' récolte','#9ccf6a',true);toast(`+${y} × ${SM[it.pl.s].name} récoltés. Charge-les dans un séchoir pour pouvoir les vendre.`,'good')}
  it.pl=null;return true;
}
function lLoad(i,quiet){
  const it=itemAt(i);if(!it)return false;const m=MM[it.id];if(m.cat!=='transfo'||it.b)return false;
  const s=STRAINS.filter(v=>(G.raw[v.id]||0)>0).sort((a,b)=>b.price*Math.min(m.batch,G.raw[b.id])-a.price*Math.min(m.batch,G.raw[a.id]))[0];if(!s)return false;
  const n=Math.min(m.batch,G.raw[s.id]);G.raw[s.id]-=n;it.b={s:s.id,n,t:m.time};
  if(!quiet)floater(P.x,P.z,'Séchage : '+n+' u.','#ffb060',false);return true;
}
function itemStatus(it){
  const m=MM[it.id];
  if(m.cat==='culture'){if(!it.pl)return m.desc+' Rien de planté pour l’instant.';const pl=it.pl,s=SM[pl.s];
    if(pl.hp<=0)return `${s.name} : la plante a fané faute d’eau.`;
    return `${s.name} : ${Math.floor(pl.p*100)} % · eau ${Math.round(pl.w)} % · santé ${Math.round(pl.hp)} %${pl.pr===1?' · à tailler':pl.pr===2?' · taillée':''}.`}
  if(m.cat==='transfo')return it.b?`Séchage de ${it.b.n} × ${SM[it.b.s].name} : ${Math.floor(100*(1-it.b.t/m.time))} %.`:m.desc;
  return m.desc;
}
function labTarget(){
  const L=LAB;if(!L)return null;
  let best=-1,bd=1.9;
  L.slots.forEach((p,i)=>{const d=Math.hypot(P.x-p.x,P.z-p.z);if(d<bd){bd=d;best=i}});
  const dpc=Math.hypot(P.x-L.pc.x,P.z-L.pc.z),dtap=Math.hypot(P.x-L.tap.x,P.z-L.tap.z);
  if(dtap<1.8&&(best<0||dtap<bd)&&dtap<=dpc)return G.can>=CAN_MAX?{k:'info',label:`Robinet : ton arrosoir est plein (${G.can}/${CAN_MAX})`}:{k:'tap',label:`Remplir l’arrosoir (${G.can}/${CAN_MAX})`};
  if(dpc<1.8&&(best<0||dpc<bd))return {k:'pc',label:'Ordinateur : gérer le labo'};
  if(best<0)return null;
  const i=best;
  if(i>=labSlots())return {k:'info',slot:i,label:'Emplacement verrouillé : agrandis le labo à l’ordinateur'};
  const it=itemAt(i);
  if(!it){const has=MACH.some(m=>(G.lab.store[m.id]||0)>0);return has?{k:'place',slot:i,label:'Installer une machine ici'}:{k:'info',slot:i,label:'Emplacement libre : achète des machines à la jardinerie ou à l’ordinateur'}}
  const m=MM[it.id];
  if(m.cat==='culture'){
    const pl=it.pl;
    if(!pl){const s=bestSeed();return s?{k:'plant',slot:i,s,label:'Planter : '+SM[s].name,opt:true}:{k:'info',slot:i,label:'Pas de graines : graineterie ou ordinateur',opt:true}}
    if(pl.hp<=0)return {k:'clear',slot:i,label:'Arracher la plante fanée',opt:true};
    if(pl.p>=1)return {k:'harvest',slot:i,label:`Récolter ${SM[pl.s].name} (+${harvestYield(it)})`,opt:true};
    if(pl.w<45)return G.can>0?{k:'water',slot:i,label:`Arroser (arrosoir ${G.can}/${CAN_MAX})`,opt:true}:{k:'info',slot:i,label:'Arrosoir vide : remplis-le au robinet, à droite de l’entrée',opt:true};
    if(pl.pr===1)return {k:'prune',slot:i,label:'Tailler (+20 % de récolte)',opt:true};
    return G.can>0?{k:'water',slot:i,label:`Arroser · ${SM[pl.s].name} ${Math.floor(pl.p*100)} %`,opt:true}:{k:'info',slot:i,label:`${SM[pl.s].name} ${Math.floor(pl.p*100)} % · arrosoir vide`,opt:true};
  }
  if(m.cat==='transfo'){
    if(it.b)return {k:'info',slot:i,label:`Séchage en cours : ${Math.floor(100*(1-it.b.t/m.time))} %`,opt:true};
    if(rawTot()>0)return {k:'load',slot:i,label:`Charger le séchoir (${Math.min(m.batch,rawTot())} u.)`,opt:true};
    return {k:'info',slot:i,label:'Séchoir vide : récolte des plantes pour le charger',opt:true};
  }
  return {k:'info',slot:i,label:m.name+' : arrose les plantes autour',opt:true};
}
function labDo(t){
  switch(t.k){
    case 'pc':menuAt=null;openMenu('labo');return;
    case 'place':{const ids=MACH.filter(m=>(G.lab.store[m.id]||0)>0);if(ids.length===1)lPlace(t.slot,ids[0].id);else placeDialog(t.slot);return}
    case 'plant':lPlant(t.slot,t.s);break;
    case 'water':lWater(t.slot);break;
    case 'tap':lTap();break;
    case 'prune':lPrune(t.slot);break;
    case 'harvest':lHarvest(t.slot);break;
    case 'clear':lClear(t.slot);break;
    case 'load':lLoad(t.slot);break;
  }
  save();
}
function placeDialog(i){
  const ch=MACH.filter(m=>(G.lab.store[m.id]||0)>0).map(m=>({label:`${m.name} (${G.lab.store[m.id]} en stock)`,desc:m.desc,quick:1,fn:()=>lPlace(i,m.id)}));
  ch.push({label:'Fermer',close:1});
  openDialog('Installer une machine','#8fbf4a',{text:`Emplacement ${i+1} : choisis la machine à installer ici.`,choices:ch},()=>{});
}
function labOptions(t){
  const i=t.slot;if(i==null)return;const it=itemAt(i);if(!it){if(i<labSlots())placeDialog(i);return}
  const m=MM[it.id],ch=[];
  if(m.cat==='culture'){
    if(!it.pl){for(const v of STRAINS)if((G.seeds[v.id]||0)>0)ch.push({label:`Planter ${v.name} (${G.seeds[v.id]} graine${G.seeds[v.id]>1?'s':''})`,desc:`Pousse en ${v.time} s · ${v.yield} u. par plante · vente ~${fmt(v.price)}/u.`,quick:1,fn:()=>lPlant(i,v.id)});
      if(!ch.length)ch.push({label:'Aucune graine en stock',desc:'Achète des graines à la graineterie ou commande-les à l’ordinateur du labo.',off:1})}
    else if(it.pl.hp>0){ch.push({label:'Arroser',desc:G.can>0?`Eau de la plante : ${Math.round(it.pl.w)} % · arrosoir ${G.can}/${CAN_MAX}`:'Arrosoir vide : remplis-le au robinet.',off:G.can<=0,quick:1,fn:()=>lWater(i)});
      if(it.pl.pr===1)ch.push({label:'Tailler',desc:'+20 % de récolte.',quick:1,fn:()=>lPrune(i)});
      if(it.pl.p>=1)ch.push({label:'Récolter',desc:`+${harvestYield(it)} unités de récolte.`,quick:1,fn:()=>lHarvest(i)});
      ch.push({label:'Arracher la plante',desc:'Elle sera perdue.',quick:1,fn:()=>lClear(i)})}
    else ch.push({label:'Arracher la plante fanée',quick:1,fn:()=>lClear(i)});
  }
  if(m.cat==='transfo'&&!it.b&&rawTot()>0)ch.push({label:'Charger le séchoir',desc:`Jusqu’à ${m.batch} unités, ${m.time} s.`,quick:1,fn:()=>lLoad(i)});
  const growing=it.pl&&it.pl.hp>0;
  ch.push({label:'Ranger : '+m.name,desc:it.b?'Impossible pendant le séchage.':growing?'Retourne dans ton stock. La plante sera perdue.':'Retourne dans ton stock, à réinstaller où tu veux.',off:!!it.b,quick:1,fn:()=>lRemove(i)});
  ch.push({label:'Fermer',close:1});
  openDialog(m.name,'#8fbf4a',{text:itemStatus(it),choices:ch},()=>{});
}
/* tourne même menu ouvert : croissance, soif, séchage, arroseurs, jardiniers */
let labT=0;
function labTick(dt){
  for(const it of G.lab.items){const m=MM[it.id];
    if(m.cat==='culture'&&it.pl){const pl=it.pl,s=SM[pl.s];if(pl.hp<=0||pl.p>=1)continue;
      pl.w=Math.max(0,pl.w-dt*100/70*m.thirst);
      if(pl.w>0){pl.p=Math.min(1,pl.p+dt*gspeed()*m.speed/s.time);pl.hp=Math.min(100,pl.hp+dt*3)}
      else{pl.hp=Math.max(0,pl.hp-dt*2);if(pl.hp<=0)toast(`Une plante de ${s.name} a fané : il fallait l’arroser.`,'bad')}
      if(pl.pr===0&&pl.p>=.5)pl.pr=1;
      if(pl.p>=1)toastReady(s)}
    else if(m.cat==='transfo'&&it.b){it.b.t-=dt;
      if(it.b.t<=0){const out=Math.round(it.b.n*m.bonus);G.stock[it.b.s]=(G.stock[it.b.s]||0)+out;toast(`Séchoir : +${out} × ${SM[it.b.s].name} prêts à vendre.`,'good');it.b=null}}
  }
  labT+=dt;
  if(labT>=1){labT=0;
    for(const a of G.lab.items){const m=MM[a.id];if(m.cat!=='eau')continue;const [ra,ca]=slotRC(a.slot);
      for(const o of G.lab.items)if(o.pl&&o.pl.hp>0){const [rb,cb]=slotRC(o.slot);if(Math.max(Math.abs(ra-rb),Math.abs(ca-cb))<=m.radius)o.pl.w=100}}
    gardener();
  }
}
let readyT=0;const toastReady=s=>{if(G.t-readyT>20){readyT=G.t;toast(`${s.name} est prête à récolter au labo.`,'good')}};
function gardener(){
  let n=lv('jardinier')*4;if(!n)return;
  const cult=G.lab.items.filter(it=>MM[it.id].cat==='culture').sort((a,b)=>a.slot-b.slot);
  for(const it of cult){if(n<=0)break;n--;
    if(it.pl){if(it.pl.hp<=0)it.pl=null;else if(it.pl.p>=1){if(!lHarvest(it.slot,true))continue}else{it.pl.w=100;if(it.pl.pr===1)it.pl.pr=2;continue}}
    if(!it.pl){const s=bestSeed();if(s)lPlant(it.slot,s,true)}}
  for(const it of G.lab.items)if(MM[it.id].cat==='transfo'&&!it.b&&rawTot()>0)lLoad(it.slot,true);
}
function labAlerts(){
  let dry=0,ready=0,dead=0,prune=0;
  for(const it of G.lab.items){const pl=it.pl;if(!pl)continue;if(pl.hp<=0)dead++;else if(pl.p>=1)ready++;else if(pl.w<30)dry++;else if(pl.pr===1)prune++}
  const a=[];if(ready)a.push(ready+' prête'+(ready>1?'s':''));if(dry)a.push(dry+' à arroser');if(prune)a.push(prune+' à tailler');if(dead)a.push(dead+' fanée'+(dead>1?'s':''));
  return {txt:a.join(' · '),bad:dry>0||dead>0};
}
/* étiquettes au-dessus des emplacements, quand on est dans le labo */
function labLabels(){
  const L=LAB;if(!L||!(curShell&&curShell.lab))return;
  label(L.pc,L.pc.x,1.9,L.pc.z,'Ordinateur','Gérer le labo, commander','#4fb3ff');
  label(L.tap,L.tap.x,1.7,L.tap.z,'Robinet','Arrosoir '+G.can+'/'+CAN_MAX,'#5fb0e0');
  const n=labSlots();
  L.slots.forEach((p,i)=>{
    if(Math.hypot(P.x-p.x,P.z-p.z)>11)return;
    const it=itemAt(i);
    if(!it){if(i<n&&Math.hypot(P.x-p.x,P.z-p.z)<4.5)label(p,p.x,.9,p.z,'Libre','','#a8937f');return}
    const m=MM[it.id];
    if(m.cat==='culture'){const pl=it.pl;
      if(!pl){label(p,p.x,1.4,p.z,m.name,'Vide : à planter','#a8937f');return}
      const s=SM[pl.s],st=pl.hp<=0?'Fanée':pl.p>=1?'Prête !':pl.w<30?'À arroser':pl.pr===1?'À tailler':Math.floor(pl.p*100)+' %';
      label(p,p.x,2.3+(it.id==='table'?.5:0),p.z,s.name,st,pl.hp<=0?'#e0503a':pl.p>=1?'#9ccf6a':pl.w<30?'#7fd1ff':'#8fbf4a',[{v:pl.p,c:'#9ccf6a'},{v:pl.w/100,c:'#5fb0e0'}])}
    else if(m.cat==='transfo')label(p,p.x,2.6,p.z,m.name,it.b?`${it.b.n} × ${SM[it.b.s].name}`:'Vide','#ffb060',it.b?[{v:1-it.b.t/m.time,c:'#ffb060'}]:null);
    else label(p,p.x,2.3,p.z,m.name,'Arrose autour','#5fb0e0');
  });
}

/* ---------- livraisons : ce qu'on commande à l'ordinateur arrive en camionnette devant le labo ---------- */
let DV=null;
const delivFee=c=>Math.max(10,Math.round(c*.1));
function queueDelivery(k,id,n){
  (G.deliv=G.deliv||[]).push({k,id,n});save();
  if(!DV)startDelivery();
  toast('Commande passée : la camionnette arrive au labo dans une minute environ.','good');
}
function startDelivery(){
  const L=LAB;if(!L)return;
  const p=randRoadPoint(L.park.x,L.park.z,170,260),e=mkAI({k:'van',c:0xf5f5f5,courier:1},p.x,p.z,0,1.9);
  e.path=pathTo(e.x,e.z,L.park.x,L.park.z);if(e.path.length)e.th=Math.atan2(e.path[0][0]-e.x,e.path[0][1]-e.z);
  DV={e,t:0};
}
function updDelivery(dt){
  if(!DV){if(G.deliv&&G.deliv.length&&LAB)startDelivery();return}
  const e=DV.e,L=LAB;DV.t+=dt;
  if(DV.left!=null){DV.left-=dt;followPath(e,dt,22);if(DV.left<=0)DV=null;return}
  const done=followPath(e,dt,24);
  if(done||Math.hypot(e.x-L.park.x,e.z-L.park.z)<14||DV.t>80){
    deliverAll();e.v=0;const p=randRoadPoint(e.x,e.z,200,300);e.path=pathTo(e.x,e.z,p.x,p.z);DV.left=12}
}
function deliverAll(){
  const it=G.deliv||[];if(!it.length)return;const parts=[];
  for(const d of it){if(d.k==='m'){G.lab.store[d.id]=(G.lab.store[d.id]||0)+d.n;parts.push(d.n+' × '+MM[d.id].name)}else{G.seeds[d.id]=(G.seeds[d.id]||0)+d.n;parts.push(d.n+' graine'+(d.n>1?'s':'')+' de '+SM[d.id].name)}}
  G.deliv=[];save();toast('Livraison arrivée au labo : '+parts.join(', ')+'.','good');Sfx.alert();
}

/* ---------- économie (tourne même menu ouvert) ---------- */
let dealT=0,saveT=0;
function economy(dt){
  if(ended)return;
  G.t+=dt;
  if(!G.cheat&&G.cash+(G.bank||0)>=GOAL){gameOver('win');return}
  if(G.strikes>0){G.strikeT+=dt;if(G.strikeT>=480){G.strikeT=0;G.strikes--;toast('Un cran de moins sur ton casier.','good')}}
  labTick(dt);
  dealT+=dt;
  if(dealT>=10){dealT=0;const d=lv('dealer');
    for(let n=0;n<d;n++){const s=STRAINS.slice().sort((a,b)=>b.price-a.price).find(s=>(G.stock[s.id]||0)>0);if(!s)break;
      const q=Math.min(3,G.stock[s.id]);G.stock[s.id]-=q;const pay=Math.round(q*s.price*.7*(1+.08*lv('nego')));G.cash+=pay;G.earned+=pay;G.heat=Math.min(100,G.heat+.5*heatMult())}}
  for(const id of BIDS)if((G.rel[id]||0)<0&&!G.retired[id])addRel(id,Math.min(dt*.05,-G.rel[id]));
  saveT+=dt;if(saveT>=4){saveT=0;save()}
}

const mm=$('mm'),mx=mm.getContext('2d');
let mmT=0,trk=null;
let mapBig=false;
function toggleMap(){
  mapBig=!mapBig;for(const k in keys)keys[k]=0;
  const S=mapBig?760:300;mm.width=S;mm.height=S;
  mm.classList.toggle('big',mapBig);$('mmBack').hidden=!mapBig;
  mm.title=mapBig?'Fermer la carte':'Agrandir la carte';
  mmT=0;drawMini();
}
mm.addEventListener('click',e=>{
  if(!started||ended||menuOpen||shopOpen||talking||raidOpen)return;
  if(!mapBig){toggleMap();return}
  const r=mm.getBoundingClientRect(),S=mm.width,k=S/1250,X=v=>(v+625)*k;
  const px=(e.clientX-r.left)/r.width*S,pz=(e.clientY-r.top)/r.height*S;
  let hit=null,bd=24;
  for(const s of SHOPS){const d=Math.hypot(X(s.x)-px,X(s.z)-pz);if(d<bd){bd=d;hit=s}}
  if(hit){
    if(WP&&WP.label===hit.name){WP=null;toast('Repère retiré.')}
    else{WP={x:hit.x,z:hit.z,label:hit.name};toast('Repère posé : '+hit.name+'. Suis la flèche bleue.','good')}
  }
  toggleMap();
});
$('mmBack').addEventListener('click',()=>{if(mapBig)toggleMap()});
function drawMini(){
  const S=mm.width,f=S/300,k=S/1250,X=v=>(v+625)*k,big=mapBig;
  mx.drawImage(mmBg(S),0,0);
  DKEYS.forEach(key=>{const d=DIS[key],ow=G.own[key];mx.fillStyle=(ow==='you'?'#8fbf4a55':BOSSES[ow].col+'38');mx.fillRect(X(d.sx<0?-625:0),X(d.sz<0?-625:0),625*k,625*k)});
  for(const key of DKEYS){const q=QGP[key],c=key===G.home?'#c98aff':(G.own[key]==='you'?'#8fbf4a':BOSSES[G.own[key]].col);mx.fillStyle='#120e0d';mx.fillRect(X(q[0])-6*f,X(q[1])-6*f,12*f,12*f);mx.fillStyle=c;mx.fillRect(X(q[0])-4.5*f,X(q[1])-4.5*f,9*f,9*f)}
  for(const o of orders){mx.fillStyle=(G.own[o.d]!=='you'&&!G.ally[G.own[o.d]])?'#ff4a30':'#ffa63d';mx.beginPath();mx.arc(X(o.x),X(o.z),(o.id===(trk&&trk.id)?5:3)*f,0,7);mx.fill()}
  if(M){mx.fillStyle='#ff7a1a';mx.beginPath();mx.arc(X(M.dest.x),X(M.dest.z),7*f,0,7);mx.fill()}
  couriers.forEach(c=>{mx.fillStyle='#fff';mx.fillRect(X(c.x)-2*f,X(c.z)-2*f,4*f,4*f)});
  gangs.forEach(g=>{if(G.retired[g.boss])return;mx.fillStyle=BOSSES[g.boss].col;mx.fillRect(X(g.x)-3*f,X(g.z)-3*f,6*f,6*f)});
  if(meetCar){mx.strokeStyle=BOSSES[meetCar.boss].col;mx.lineWidth=3*f;mx.beginPath();mx.arc(X(meetCar.x),X(meetCar.z),7*f,0,7);mx.stroke();mx.lineWidth=1}
  cops.forEach(c=>{mx.fillStyle=Math.floor(performance.now()/200)%2?'#ff3030':'#3070ff';mx.beginPath();mx.arc(X(c.x),X(c.z),3.5*f,0,7);mx.fill()});
  for(const sh of SHOPS){
    const T=SHOPTYPES[sh.type];
    mx.fillStyle=T.col;mx.fillRect(X(sh.x)-3.5*f,X(sh.z)-3.5*f,7*f,7*f);mx.strokeStyle='#120e0d';mx.lineWidth=f;mx.strokeRect(X(sh.x)-3.5*f,X(sh.z)-3.5*f,7*f,7*f);
    if(big){mx.font='600 12px "Work Sans",sans-serif';mx.textAlign='center';mx.lineWidth=3;mx.strokeStyle='rgba(18,14,13,.9)';mx.strokeText(T.short,X(sh.x),X(sh.z)-9);mx.fillStyle='#f3e6d6';mx.fillText(T.short,X(sh.x),X(sh.z)-9)}
  }
  for(const o of MP.others.values()){if(o.hid)continue;mx.fillStyle='#7fd1ff';mx.strokeStyle='#0b2230';mx.lineWidth=1.5*f;mx.beginPath();mx.arc(X(o.x),X(o.z),4.5*f,0,7);mx.fill();mx.stroke();
    if(big){mx.font='600 12px "Work Sans",sans-serif';mx.textAlign='center';mx.lineWidth=3;mx.strokeStyle='rgba(18,14,13,.9)';mx.strokeText(o.n,X(o.x),X(o.z)-10);mx.fillStyle='#7fd1ff';mx.fillText(o.n,X(o.x),X(o.z)-10)}}
  if(CAR){mx.fillStyle='#8fbf4a';mx.strokeStyle='#120e0d';mx.lineWidth=f;mx.fillRect(X(CAR.x)-3*f,X(CAR.z)-3*f,6*f,6*f);mx.strokeRect(X(CAR.x)-3*f,X(CAR.z)-3*f,6*f,6*f)}
  mx.lineWidth=1;
  if(WP){mx.strokeStyle='#7fd1ff';mx.lineWidth=2*f;mx.beginPath();mx.arc(X(WP.x),X(WP.z),8*f,0,7);mx.stroke();mx.lineWidth=1}
  mx.save();mx.translate(X(P.x),X(P.z));mx.rotate(Math.PI-P.th);mx.scale(f,f);mx.fillStyle='#fff';mx.strokeStyle='#000';mx.beginPath();mx.moveTo(0,-8);mx.lineTo(6,6);mx.lineTo(0,3);mx.lineTo(-6,6);mx.closePath();mx.fill();mx.stroke();mx.restore();
  if(big){
    mx.textAlign='center';
    for(const key of DKEYS){
      const d=DIS[key],ow=G.own[key],cx=X(LBLP[key][0]),cz=X(LBLP[key][1]);
      mx.font='700 17px "Bowlby One",Impact,sans-serif';mx.lineWidth=4;mx.strokeStyle='rgba(18,14,13,.9)';mx.strokeText(d.name,cx,cz);mx.fillStyle=d.col;mx.fillText(d.name,cx,cz);
      mx.font='600 12px "Work Sans",sans-serif';const t=ow==='you'?'Ton gang':BOSSES[ow].name;mx.lineWidth=3;mx.strokeText(t,cx,cz+16);mx.fillStyle='#f3e6d6';mx.fillText(t,cx,cz+16);
    }
    mx.font='600 13px "Work Sans",sans-serif';mx.lineWidth=3;mx.strokeStyle='rgba(18,14,13,.9)';
    const hint='Touche un magasin pour poser un repère · touche ailleurs pour fermer';
    mx.strokeText(hint,S/2,S-10);mx.fillStyle='#ffa63d';mx.fillText(hint,S/2,S-10);
  }
}
function pickTrack(){
  if(M){trk={id:-1,x:M.dest.x,z:M.dest.z};return}
  let o=orders.find(q=>q.id===trackId);
  if(!o){let bd=1e9;for(const q of orders)if(canDeliver(q)){const d=Math.hypot(q.x-P.x,q.z-P.z);if(d<bd){bd=d;o=q}}}
  trk=o?{id:o.id,x:o.x,z:o.z}:null;
}


/* ---------- affichage : ce qui est utile, seulement quand c'est utile ---------- */
const vis=(el,v)=>{if(el.hidden===!!v)el.hidden=!v};
let lastNite=null,labAlT=0,LABAL={txt:'',bad:false};
function hud(dt){
  findTarget();
  const foot=P.def.kind==='foot',pz=paused(),hudEl=$('hud');
  if(hudEl.classList.contains('car')===foot)hudEl.classList.toggle('car',!foot);
  // bouton d'action contextuel (+ options), ou simple indication
  const ba=$('bAct'),bo=$('bOpt'),hn=$('hint');
  const lb=tgt&&tgt.k!=='info'?tgt.label:'',hint=tgt&&tgt.k==='info'?tgt.label:'';
  if(ba.dataset.l!==lb){ba.dataset.l=lb;vis(ba,lb);$('bActT').textContent=lb}
  if(hn.dataset.l!==hint){hn.dataset.l=hint;vis(hn,hint);hn.textContent=hint}
  vis(bo,tgt&&tgt.opt);
  // joystick à pied, flèches au volant
  vis($('joy'),foot&&!pz);vis($('carCtl'),!foot&&!pz);
  if(!foot||pz){if(J.on){J.on=false;J.id=null;J.x=J.y=0;$('joyK').style.transform=''}}
  vis($('bHorn'),!foot);vis($('bFast'),!foot&&P.def.fast&&!M);vis($('speedo'),!foot);
  if(!foot){$('hSpd').textContent=Math.round(Math.hypot(P.vx,P.vz)*3.6);$('hVeh').textContent=P.def.name}
  if(WP&&Math.hypot(P.x-WP.x,P.z-WP.z)<12){toast('Arrivé : '+WP.label,'good');WP=null}
  // compteurs
  $('hCash').textContent=fmt(G.cash);$('hGoalBar').style.width=Math.min(100,(G.cash+(G.bank||0))/GOAL*100)+'%';
  vis($('hBankBox'),G.bank>0);if(G.bank>0)$('hBank').textContent=fmt(G.bank);
  $('hSeeds').textContent=seedTot();$('hRaw').textContent=rawTot();$('hStock').textContent=tot()+'/'+cap();
  vis($('hHeatBox'),G.heat>=1);if(G.heat>=1){$('hHeat').textContent=Math.round(G.heat)+' %';$('hHeatBar').style.width=G.heat+'%';$('hHeatBox').classList.toggle('hot',G.heat>=60)}
  vis($('hLifeBox'),G.hp<99.5);if(G.hp<99.5){$('hLife').textContent=Math.max(0,Math.round(G.hp));$('hLifeBar').style.width=Math.max(0,G.hp)+'%'}
  vis($('hCasierBox'),G.strikes>0);if(G.strikes>0)$('hCasier').textContent=G.strikes+'/'+MAXSTRIKES;
  $('hClock').textContent=TOD.label;
  const d=districtAt(P.x,P.z),p=$('hDist'),ow=G.own[d.key],dt2=curShell?(curShell.lab?'Ton labo':curShell.store.name):d.name+' · '+(ow==='you'?'à toi':BOSSES[ow].name);
  if(p.textContent!==dt2){p.textContent=dt2;p.style.color=curShell?'#f3e6d6':ow==='you'?'#8fbf4a':BOSSES[ow].col}
  labAlT-=dt;if(labAlT<=0){labAlT=.5;LABAL=labAlerts();const h=$('hLab');vis(h,LABAL.txt);if(LABAL.txt){h.textContent='Labo : '+LABAL.txt;h.classList.toggle('bad',LABAL.bad)}}
  const b=$('banner');
  if(M){vis(b,1);b.style.background='';b.textContent=`GO FAST · ${Math.max(0,Math.ceil(M.t))} s · ${Math.round(Math.hypot(P.x-M.dest.x,P.z-M.dest.z))} m`}
  else if(HIDE){vis(b,1);b.style.background='rgba(60,50,90,.92)';b.textContent=`Caché chez ${HIDE.s.name} · chaleur ${Math.round(G.heat)} %`}
  else vis(b,0);
  mmT-=dt;if(mmT<=0){mmT=.1;pickTrack();drawMini()}
  // flèche de guidage (relative à la caméra) : go fast, repère posé, ou client suivi
  const a=$('arrowBox');let tg=null,lab='',col='#ffa63d';
  if(HIDE||curShell){}
  else if(M){tg=M.dest;lab='Go fast';col='#ff7a1a'}
  else if(WP){tg=WP;lab=WP.label;col='#7fd1ff'}
  else if(trk){const o=orders.find(q=>q.id===trk.id);tg=trk;lab=o?o.name:'Client'}
  if(tg){const dx=tg.x-P.x,dz=tg.z-P.z,dd=Math.hypot(dx,dz);
    if(dd>14){vis(a,1);a.style.color=col;$('arrow').style.transform=`rotate(${CAMS.yaw-Math.atan2(dx,dz)}rad)`;
      const pa=$('arrow').firstElementChild;if(pa.getAttribute('fill')!==col)pa.setAttribute('fill',col);
      const t=lab+' · '+Math.round(dd)+' m';if($('arrowTxt').textContent!==t)$('arrowTxt').textContent=t}
    else vis(a,0)}
  else vis(a,0);
  const nite=TOD.n>.5;
  if(lastNite!==null&&nite!==lastNite)toast(nite?'La nuit tombe : clients mieux payés, moins de patrouilles.':'Le jour se lève : les patrouilles reprennent.',nite?'good':'');
  lastNite=nite;
  const ck=$('hClock');ck.style.color=nite?'#c98aff':'';
}
$('hLab').onclick=()=>{if(!started||!LAB)return;WP={x:LAB.sh.door.x+LAB.nx*4,z:LAB.sh.door.z+LAB.nz*4,label:'Labo'};toast('Repère posé : ton labo. Suis la flèche bleue.','good')};

/* ---------- rendu d'une image ---------- */
const BKEY={fast:{},fastR:{},meet:{},wp:{},trk:{}};
function renderWorld(now,dt,fx,fz){
  const t=now/1000;
  updSky(fx,fz);animStatic(t);
  const pulse=.5+.5*Math.sin(t*3);
  if(started){
    const foot=P.def.kind==='foot';
    if(!playerMesh||playerKey!==lookKey(PLAYER_LOOK))rebuildPlayerMesh();
    playerMesh.visible=foot;
    if(foot){playerMesh.position.set(P.x,.05,P.z);playerMesh.rotation.y=P.th;animHuman(playerMesh,P.ph,P.v,t)}
    else drawVehE(P,{k:P.def.kind,c:P.def.color},P.x,P.z,P.th,keys.dn&&P.v>.5,PLAYER_LOOK);
    if(CAR)drawVehE(CAR,{k:VM[CAR.id].kind,c:VM[CAR.id].color},CAR.x,CAR.z,CAR.th,false,PLAYER_LOOK);
    if(curShell){inLight.intensity=curShell.lab?9:7;inLight.position.set(P.x,curShell.ceil-.7,P.z)}else inLight.intensity=0;
  }else{if(playerMesh)playerMesh.visible=false;inLight.intensity=0}
  for(const e of traffic)drawVehE(e,e.spr,e.x,e.z,e.th,e.brk);
  for(const e of couriers)drawVehE(e,e.spr,e.x,e.z,e.th,e.brk);
  for(const e of gangs)if(!G.retired[e.boss])drawVehE(e,e.spr,e.x,e.z,e.th,e.brk);
  for(const e of cops)drawVehE(e,e.spr,e.x,e.z,e.th,e.brk);
  if(DV)drawVehE(DV.e,DV.e.spr,DV.e.x,DV.e.z,DV.e.th,DV.e.brk);
  if(meetCar)drawVehE(meetCar,meetCar.spr,meetCar.x,meetCar.z,meetCar.th,meetCar.brk);
  for(const p of peds)drawHumanE(p,p.look,p.x,p.z,p.th,p.ph,p.hold>0?0:p.sp,t);
  for(const o of orders){drawHumanE(o,o.look,o.x,o.z,o.nang,0,0,t+o.id);if(started&&Math.hypot(o.x-P.x,o.z-P.z)<160)drawRing(o.ring||(o.ring={}),o.x,o.z,4.2+pulse*.4,o.rival?0xff4a30:0xffa63d,.75)}
  for(const o of MP.others.values()){if(o.hid)continue;
    if(o.k==='foot')drawHumanE(o,o.look||LOOK0,o.x,o.z,o.th,o.ph*3,o.sp,t);else drawVehE(o,{k:o.k,c:o.c},o.x,o.z,o.th,false,o.look||LOOK0);
    drawRing(o.rk||(o.rk={}),o.x,o.z,o.k==='foot'?1.3:3.2,0x7fd1ff,.55)}
  if(started){
    if(M){drawBeam(BKEY.fast,M.dest.x,M.dest.z,0xff7a1a);drawRing(BKEY.fastR,M.dest.x,M.dest.z,14,0xff7a1a,.9)}
    if(meetCar)drawBeam(BKEY.meet,meetCar.x,meetCar.z,hexn(BOSSES[meetCar.boss].col));
    if(WP)drawBeam(BKEY.wp,WP.x,WP.z,0x7fd1ff);
    if(trk&&!M&&!curShell)drawBeam(BKEY.trk,trk.x,trk.z,0xffa63d);
  }
  for(const s of SHOPS)if(s.clerkM)animHuman(s.clerkM,0,0,t+s.id);
  labVisual(t);
  drawFx();
  if(started)worldLabels();
  liveEnd();
  renderer.render(scene,camera);
  labelsEnd();
}
let playerMesh=null,playerKey='';
function rebuildPlayerMesh(){if(playerMesh)scene.remove(playerMesh);playerMesh=mkHuman(PLAYER_LOOK);scene.add(playerMesh);playerKey=lookKey(PLAYER_LOOK)}
function worldLabels(){
  camera.updateMatrixWorld();
  for(const o of orders){const d=Math.hypot(o.x-P.x,o.z-P.z);if(d<48)label(o,o.x,2.35,o.z,`${o.qty} × ${SM[o.s].name} · ${o.price.toFixed(1)} €/u.`,o.name+(canDeliver(o)?'':' · pas assez de stock'),o.rival?'#ff4a30':'#ffa63d')}
  for(const s of SHOPS){const T=SHOPTYPES[s.type];
    if(curShell&&curShell.store===s)label(s,s.clerkPos.x,2.35,s.clerkPos.z,s.clerk,T.label,T.col);
    else if(!curShell&&Math.hypot(s.x-P.x,s.z-P.z)<60)label(s,s.x,4.9,s.z,s.name,T.label,T.col)}
  for(const p of peds)if(p.hold>0)label(p,p.x,2.3,p.z,p.name,'','#f3e6d6');
  for(const g of gangs){if(G.retired[g.boss])continue;const d=Math.hypot(g.x-P.x,g.z-P.z);if(d<70){const b=BOSSES[g.boss];label(g,g.x,2.6,g.z,'Gang de '+b.name,g.state==='chase'?'Te prend en chasse !':'',b.col)}}
  for(const o of MP.others.values()){if(o.hid)continue;const up=o.k==='foot'?2.3:2.9;
    label(o,o.x,up,o.z,o.n,fmt(o.cash)+' · '+(DIS[o.hd]?DIS[o.hd].name:''),'#7fd1ff');
    if(o.bub)label(o.bk||(o.bk={}),o.x,up+1.7,o.z,'« '+o.bub.t+' »','','#f3e6d6')}
  if(MP.myBub&&!HIDE)label(MP,P.x,(P.def.kind==='foot'?2.3:2.9)+.2,P.z,'« '+MP.myBub.t+' »','','#7fd1ff');
  if(DV&&DV.left==null&&Math.hypot(DV.e.x-P.x,DV.e.z-P.z)<80)label(DV,DV.e.x,3.1,DV.e.z,'Livraison pour ton labo','','#ffa63d');
  if(meetCar)label(meetCar,meetCar.x,2.6,meetCar.z,BOSSES[meetCar.boss].name+' veut te parler','',BOSSES[meetCar.boss].col);
  if(CAR&&P.def.kind==='foot'&&!curShell&&Math.hypot(CAR.x-P.x,CAR.z-P.z)<45)label(CAR,CAR.x,2.3,CAR.z,'Ta '+VM[CAR.id].name,'','#8fbf4a');
  if(LAB&&!curShell&&Math.hypot(LAB.sh.door.x-P.x,LAB.sh.door.z-P.z)<90)label(LAB,LAB.sh.door.x,6,LAB.sh.door.z,'Ton labo',LABAL.txt||'','#c98aff');
  labLabels();
}

function toast(msg,cls){
  const t=document.createElement('div');t.className='toast '+(cls||'');t.textContent=msg;const c=$('toasts');c.appendChild(t);
  while(c.children.length>4)c.removeChild(c.firstChild);setTimeout(()=>t.remove(),4500);
}

/* ---------- sauvegarde avec code XXXX-XXXX (base de données de l'artefact) ---------- */
const CALPHA='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
let cloudMsg='',cloudBusy=false,cloudLast=0,codeDraft='';
function genCode(){let c='';const a=new Uint32Array(8);try{crypto.getRandomValues(a)}catch(e){for(let i=0;i<8;i++)a[i]=Math.random()*4294967296}
  for(let i=0;i<8;i++)c+=CALPHA[a[i]%CALPHA.length];return c.slice(0,4)+'-'+c.slice(4)}
function normCode(v){const c=String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'');return c.length===8?c.slice(0,4)+'-'+c.slice(4):null}
async function getDb(){try{if(typeof claude==='undefined'||!claude.use)return null;return await claude.use('db')}catch(e){return null}}
const dbErr=e=>e&&e.code==='quota_exceeded'?'La base de sauvegarde est pleine.':e&&(e.code==='invalid_argument')?'Sauvegarde refusée par le serveur.':'Sauvegarde en ligne indisponible pour l’instant.';
async function cloudPush(){
  if(!G.code||cloudBusy)return false;
  const db=await getDb();if(!db){cloudMsg='Sauvegarde en ligne indisponible : le serveur ne répond pas.';return false}
  cloudBusy=true;
  try{await db.doc('saves/'+G.code).set({t:Date.now(),g:JSON.stringify(G),cash:Math.floor(G.cash)});cloudLast=Date.now();cloudMsg='Sauvegardé en ligne à '+new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})+'.';return true}
  catch(e){cloudMsg=dbErr(e);return false}
  finally{cloudBusy=false}
}
async function makeCode(){
  const db=await getDb();if(!db){cloudMsg='Sauvegarde en ligne indisponible : le serveur ne répond pas.';return}
  try{
    let c=null;
    for(let i=0;i<6&&!c;i++){const t=genCode(),sn=await db.doc('saves/'+t).get();if(!sn.exists)c=t}
    if(!c){cloudMsg='Impossible de créer un code, réessaie.';return}
    G.code=c;save();await cloudPush();
  }catch(e){cloudMsg=dbErr(e)}
}
async function loadCode(raw){
  const c=normCode(raw);if(!c)return 'Le code doit ressembler à ABCD-1234.';
  const db=await getDb();if(!db)return 'Chargement en ligne indisponible : le serveur ne répond pas.';
  try{
    const sn=await db.doc('saves/'+c).get();
    if(!sn.exists)return 'Code introuvable.';
    let g;try{g=JSON.parse(sn.data().g)}catch(e){return 'Sauvegarde illisible.'}
    if(!g||(g.v!==4&&g.v!==5)||typeof g.cash!=='number')return 'Sauvegarde incompatible.';
    g.code=c;g.began=1;
    try{localStorage.setItem(KEY,JSON.stringify(g))}catch(e){return 'Impossible d’écrire la sauvegarde dans ce navigateur.'}
    setTimeout(()=>location.reload(),300);
    return 'Partie chargée, redémarrage…';
  }catch(e){return dbErr(e)}
}
setInterval(()=>{if(G.code&&started&&!ended&&Date.now()-cloudLast>60000)cloudPush().then(()=>{if(menuOpen&&tab==='save')renderMenu()})},15000);


/* ---------- menu de gestion : uniquement à l'ordinateur du labo (et quelques onglets dans les boutiques) ---------- */
let menuOpen=false,tab='labo',confirmReset=false,shopOpen=false,menuOnly=false,menuAt=null;
const paused=()=>!started||menuOpen||raidOpen||talking||ended||shopOpen||mapBig;
const machOwned=id=>(G.lab.store[id]||0)+G.lab.items.filter(it=>it.id===id).length;
function slotCell(i){
  if(i>=labSlots())return '<div class="slot lock" title="Verrouillé">🔒</div>';
  const it=itemAt(i);if(!it)return '<div class="slot free">libre</div>';
  const m=MM[it.id];
  if(m.cat==='culture'){const pl=it.pl;
    if(!pl)return `<div class="slot"><b>${m.name.split(' ')[0]}</b><span>vide</span></div>`;
    const s=SM[pl.s],st=pl.hp<=0?'fanée':pl.p>=1?'prête':pl.w<30?'soif':Math.floor(pl.p*100)+' %';
    return `<div class="slot ${pl.hp<=0?'bad':pl.p>=1?'ok':pl.w<30?'dry':''}"><b>${s.name.split(' ')[0]}</b><span>${st}</span><i class="pg"><i style="width:${Math.round(pl.p*100)}%"></i></i><i class="wt"><i style="width:${Math.round(pl.w)}%"></i></i></div>`}
  if(m.cat==='transfo')return `<div class="slot ${it.b?'run':''}"><b>Séchoir</b><span>${it.b?Math.floor(100*(1-it.b.t/m.time))+' %':'vide'}</span></div>`;
  return '<div class="slot"><b>Arroseur</b><span>auto</span></div>';
}
function slotsHtml(){
  const rows=[];for(let r=LAB_ROWS-1;r>=0;r--){for(let c=0;c<LAB_COLS;c++)rows.push(slotCell(r*LAB_COLS+c))}
  return rows.join('');
}
function tabLabo(){
  let s=`<p class="note">Quartier des Lilas. Tes secteurs : ${mySectors()}/4 (+10 % sur les prix par secteur en plus). Objectif : ${fmt(GOAL)}. Casier : ${G.strikes}/${MAXSTRIKES}.</p>`;
  s+=`<div class="kpis"><div><small>Cash</small><b>${fmt(G.cash)}</b></div><div><small>Graines</small><b>${seedTot()}</b></div><div><small>Récolte</small><b>${rawTot()}</b></div><div><small>Produit</small><b>${tot()}/${cap()}</b></div></div>`;
  s+=`<div><h2>Emplacements · ${G.lab.items.length}/${labSlots()} utilisés</h2><p class="note" style="margin:4px 0 8px">Vue du labo, l’entrée en bas. Dans le labo, approche-toi d’un emplacement pour installer une machine, planter, arroser, tailler, récolter ou charger un séchoir.</p><div class="slots" id="labSlots">${slotsHtml()}</div></div>`;
  const store=MACH.filter(m=>(G.lab.store[m.id]||0)>0);
  if(store.length)s+=`<p class="note" style="color:var(--ok)">À installer : ${store.map(m=>G.lab.store[m.id]+' × '+m.name).join(', ')}.</p>`;
  s+='<div><h2>Tes variétés</h2><div class="list">'+STRAINS.filter(v=>G.unlocked[v.id]||G.seeds[v.id]||G.raw[v.id]||G.stock[v.id]).map(v=>`<div class="item"><b>${v.name}${G.sel===v.id?' <span class="tag ok">plantée par défaut</span>':''}</b><span>Graines ${G.seeds[v.id]||0} · Récolte ${G.raw[v.id]||0} · Produit ${G.stock[v.id]||0} · vente ~${fmt(v.price)}/u.</span>${G.sel===v.id?'':`<button class="btn ghost" data-act="sel:${v.id}">Planter par défaut</button>`}</div>`).join('')+'</div></div>';
  s+=confirmReset?`<div class="chips"><span class="note">Tout effacer ?</span><button class="btn red" data-act="resetyes">Oui, recommencer</button><button class="btn ghost" data-act="resetno">Non</button></div>`:`<div><button class="btn ghost" data-act="reset">Nouvelle partie</button></div>`;
  return s;
}
/* à l'ordinateur : commande livrée (frais) ; à la jardinerie : matériel ; à la graineterie : graines (sur place, sans frais) */
function tabShop(){
  const at=menuAt&&menuAt.type,mach=at!=='graineterie',seeds=at!=='jardinerie',deliv=!at,price=c=>deliv?c+delivFee(c):c;
  let s=deliv?'<p class="note">Ta commande est livrée au labo en camionnette, en une minute environ. Frais de livraison : 10 % (10 € minimum). Sans frais et tout de suite : la jardinerie pour le matériel, la graineterie pour les graines.</p>'
    :`<p class="note">Achat sur place, sans frais. ${mach?'Installe ensuite tes machines sur un emplacement libre du labo.':'Les graines vont directement dans ton stock.'}</p>`;
  if(deliv&&G.deliv&&G.deliv.length)s+=`<p class="note" style="color:var(--ok)">En route vers le labo : ${G.deliv.map(d=>d.n+' × '+(d.k==='m'?MM[d.id].name:'graine de '+SM[d.id].name)).join(', ')}.</p>`;
  if(mach)for(const [cat,title] of [['culture','Culture'],['eau','Arrosage automatique'],['transfo','Transformation de la récolte']]){
    s+=`<div><h2>${title}</h2><div class="list">`+MACH.filter(m=>m.cat===cat).map(m=>{const c=price(machPrice(m)),own=machOwned(m.id);
      return `<div class="item"><b>${m.name} <span class="tag">niv. ${m.tier}</span>${own?` <span class="tag ok">${own} possédé${own>1?'s':''}</span>`:''}</b><span>${m.desc}</span><button class="btn" data-act="bm:${m.id}" data-cost="${c}">${fmt(c)}</button></div>`}).join('')+'</div></div>';
  }
  if(seeds)s+='<div><h2>Graines</h2><div class="list">'+STRAINS.map(v=>{
    if(!G.unlocked[v.id])return `<div class="item"><b>${v.name} <span class="tag">verrouillée</span></b><span>Pousse en ${v.time} s · ${v.yield} u. par plante · vente ~${fmt(v.price)}/u.</span><button class="btn ghost" data-act="unl:${v.id}" data-cost="${v.unlock}">Débloquer ${fmt(v.unlock)}</button></div>`;
    const c=seedCost(v);
    return `<div class="item"><b>${v.name} <span class="tag ok">${G.seeds[v.id]||0} en stock</span></b><span>${fmt(c)} la graine${deliv?' + livraison':''} · pousse en ${v.time} s · ${v.yield} u. par plante · vente ~${fmt(v.price)}/u.</span><span class="buyrow">${[1,5,10].map(n=>`<button class="btn" data-act="bs:${v.id}:${n}" data-cost="${price(c*n)}">×${n}</button>`).join('')}</span></div>`}).join('')+'</div></div>';
  return s;
}
const lvTxt=u=>lv(u.id)+'/'+u.max;
function tabUps(){
  return '<div class="list">'+UPS.map(u=>{const mx=lv(u.id)>=u.max,c=upCost(u);
    return `<div class="item"><b>${u.name} <span class="tag ok">niv. ${lvTxt(u)}</span></b><span>${u.desc}</span>${mx?'<button class="btn" disabled>Max</button>':`<button class="btn" data-act="up:${u.id}" data-cost="${c}">${fmt(c)}</button>`}</div>`}).join('')+'</div>';
}
function tabTeam(){
  return '<p class="note">Ton équipe travaille pendant que tu roules. Les livreurs circulent dans le quartier, les autres restent au labo.</p><div class="list">'+TEAM.map(u=>{const mx=lv(u.id)>=u.max,c=tmCost(u);
    return `<div class="item"><b>${u.name} <span class="tag ok">${lvTxt(u)}</span></b><span>${u.desc}</span>${mx?'<button class="btn" disabled>Complet</button>':`<button class="btn" data-act="hire:${u.id}" data-cost="${c}">Recruter ${fmt(c)}</button>`}</div>`}).join('')+'</div>';
}
function tabGarage(){
  const here=menuAt&&menuAt.park?'devant '+menuAt.name:'devant le labo';
  let s=`<p class="note">Chaque véhicule possédé augmente ta capacité de stock. Le véhicule choisi t’attend ${here}. Les voitures rapides permettent les go fast : livraison chronométrée de 10 à 50 unités, payée 3,5 fois le prix, avec la police aux trousses.</p><div class="list">`;
  s+=VEH.filter(v=>v.id!=='foot').map(v=>{const own=G.owned[v.id],cur=G.veh===v.id,c=vPrice(v);
    const btn=cur?'<button class="btn" disabled>Choisi</button>':own?`<button class="btn" data-act="pick:${v.id}">Le prendre</button>`:`<button class="btn" data-act="buy:${v.id}" data-cost="${c}">Acheter ${fmt(c)}</button>`;
    return `<div class="item"><b>${v.name}${v.fast?' <span class="tag fast">Go fast</span>':''}${own?' <span class="tag ok">Possédé</span>':''}</b><span>${Math.round(v.vmax*(v.kind==='bike'?1:mot())*3.6)} km/h${v.kind==='bike'?' · discret : ventes −30 % de chaleur, la chaleur retombe 40 % plus vite':''} · stock +${v.cap}</span>${btn}</div>`}).join('')+'</div>';
  return s;
}
function tabClients(){
  const list=orders.slice().sort((a,b)=>Math.hypot(a.x-P.x,a.z-P.z)-Math.hypot(b.x-P.x,b.z-P.z));
  return '<p class="note">Les cercles jaunes sont des clients de ton secteur ou de celui d’un allié. Les rouges sont chez un autre gang : ils paient 20 % de plus, mais le gérant prélève 10 % sur la vente. Touche une commande pour la suivre avec la flèche.</p><div class="list">'+list.map(o=>{
    const d=DIS[o.d],ok=canDeliver(o);
    return `<div class="item"><b>${o.name} <span class="tag" style="color:${d.col}">${d.name}</span>${ok?'<span class="tag ok">en stock</span>':''}</b><span>${o.qty} × ${SM[o.s].name} · ${fmt(o.price)}/u. · ${Math.round(Math.hypot(o.x-P.x,o.z-P.z))} m · ${Math.ceil(o.ttl)} s${o.by?' · livreur en route':''}</span><button class="btn ${trackId===o.id?'':'ghost'}" data-act="track:${o.id}">${trackId===o.id?'Suivi':'Suivre'}</button></div>`}).join('')+'</div>';
}
/* code secret : tout débloquer sans finir la partie (la victoire est désactivée) */
const CHEAT='73519246';
function applyCheat(){
  STRAINS.forEach(v=>{G.unlocked[v.id]=1;G.seeds[v.id]=(G.seeds[v.id]||0)+50});
  VEH.forEach(v=>{G.owned[v.id]=1});
  UPS.forEach(u=>{G.lv[u.id]=u.max});TEAM.forEach(u=>{G.lv[u.id]=u.max});
  for(const id in GOODS){const g=GOODS[id];if(g.max)G.inv[id]=g.max;else if(g.look&&g.price>0)G.inv[id]=1}
  for(const [id,n] of [['table',20],['arroseur2',2],['sechoir3',2]])G.lab.store[id]=(G.lab.store[id]||0)+n;
  G.cash=Math.max(G.cash,5000000);G.cheat=1;G.sel='lune';
  const room=cap()-tot()-rawTot();if(room>0)G.stock.lune=(G.stock.lune||0)+room;
  syncCouriers();labFloorSync();save();
  toast('Code secret accepté : tout est débloqué. La partie ne se termine plus.','good');
}
function tabSave(){
  let s='<div><h2 style="margin-bottom:6px">Code secret</h2>'+(G.cheat?'<p class="note" style="color:var(--ok)">Code activé : tout est débloqué, la victoire est désactivée.</p>':'')+'<div class="chips" style="align-items:center"><input id="cheatIn" maxlength="8" inputmode="numeric" placeholder="8 chiffres" aria-label="Code secret" autocomplete="off" style="width:150px"><button class="btn ghost" data-act="cheat">Valider</button></div></div>';
  s+='<p class="note">Ta partie est déjà gardée dans ce navigateur. Un code te permet de la retrouver sur un autre appareil, ou si tu effaces tes données.</p>';
  if(G.code)s+=`<div class="item"><b style="font-family:var(--mono);font-size:26px;letter-spacing:.1em">${G.code}</b><span>Ton code. Garde-le : il suffit pour reprendre ta partie. La partie se sauvegarde en ligne toutes les minutes.</span><button class="btn" data-act="cs:copy">Copier</button></div><div class="chips"><button class="btn" data-act="cs:now">Sauvegarder maintenant</button></div>`;
  else s+='<div class="chips"><button class="btn" data-act="cs:make">Créer mon code de sauvegarde</button></div>';
  s+='<div><h2 style="margin-bottom:6px">Charger une partie</h2><p class="note" style="margin-bottom:8px">Attention : ça remplace ta partie actuelle.</p><div class="chips"><input id="codeIn" value="'+codeDraft+'" placeholder="XXXX-XXXX" maxlength="9" aria-label="Code de sauvegarde" autocomplete="off"><button class="btn ghost" data-act="cs:load">Charger</button></div></div>';
  s+=`<p class="note" id="csMsg" role="status">${cloudMsg}</p>`;
  return s;
}
const giftCost=()=>Math.max(2000,Math.round(G.cash*.01));
function tabBosses(){
  let s='<p class="note">Les gérants te proposent des affaires et des alliances. Un allié te laisse vendre chez lui contre une commission. Vendre chez un gérant non allié, refuser ses demandes ou le trahir fait baisser la relation : à −15 il devient hostile (ses hommes te chassent dans son secteur), à −50 c’est la guerre (ils tirent partout). Les cadeaux réparent la relation, et la rancune s’efface doucement avec le temps.</p><div class="list">';
  s+=BIDS.map(id=>{const b=BOSSES[id],r=G.rel[id],st=G.retired[id]?'retired':stance(id);
    const lab={ally:'Allié',war:'En guerre',hostile:'Hostile',neutral:'Neutre',retired:'Retiré'}[st];
    const cut=G.ally[id]?` Commission : ${Math.round(G.ally[id]*100)} %.`:'';
    return `<div class="item"><b style="color:${b.col}">${b.name} <span class="tag ${st==='ally'?'ok':(st==='war'||st==='hostile')?'fast':''}">${lab}</span></b><span>${b.style} Secteur : ${DIS[b.sector].name}${G.own[b.sector]==='you'?' (à toi)':''}. Relation ${r>0?'+':''}${Math.round(r)}.${cut}</span>${G.retired[id]?'':`<button class="btn" data-act="gift:${id}" data-cost="${giftCost()}">Cadeau ${fmt(giftCost())}</button>`}</div>`}).join('')+'</div>';
  return s;
}
const TABS={labo:['Le labo',tabLabo],shop:['Commander',tabShop],ups:['Améliorations',tabUps],team:['Équipe',tabTeam],garage:['Garage',tabGarage],clients:['Clients',tabClients],bosses:['Les gérants',tabBosses],mp:['Multijoueur',tabMp],save:['Sauvegarde',tabSave]};
function renderMenu(){
  const sc=$('body').scrollTop;
  $('mTitle').textContent=tab==='shop'&&menuAt?menuAt.name:TABS[tab][0];$('body').innerHTML=TABS[tab][1]();$('body').scrollTop=sc;
  $('tabs').hidden=menuOnly;
  document.querySelectorAll('#tabs .tab').forEach(t=>t.setAttribute('aria-selected',String(t.dataset.act==='tab:'+tab)));
  refreshMenu();
}
function refreshMenu(){
  document.querySelectorAll('#body [data-cost]').forEach(b=>{b.disabled=G.cash<+b.dataset.cost});
  const ls=$('labSlots');if(ls)ls.innerHTML=slotsHtml();
}
/* only : menu réduit à un onglet (jardinerie, concession, bar, multijoueur hors du labo) */
function openMenu(t,only){menuOpen=true;if(t)tab=t;menuOnly=!!only;if(!only)menuAt=null;confirmReset=false;for(const k in keys)keys[k]=0;$('menu').hidden=false;$('body').scrollTop=0;renderMenu()}
function closeMenu(){menuOpen=false;menuOnly=false;$('menu').hidden=true}
$('bAct').onclick=act;$('bOpt').onclick=actOpt;
$('mClose').onclick=closeMenu;$('bFast').onclick=startFast;
$('menu').addEventListener('click',e=>{
  const el=e.target.closest('[data-act]');if(!el||el.disabled)return;
  const [k,v,v2]=el.dataset.act.split(':');
  switch(k){
    case 'tab':if(menuOnly)return;tab=v;confirmReset=false;$('body').scrollTop=0;break;
    case 'sel':G.sel=v;break;
    case 'unl':{const c=SM[v].unlock;if(G.cash>=c&&!G.unlocked[v]){G.cash-=c;G.unlocked[v]=1;G.sel=v;toast(SM[v].name+' débloquée : achète ses graines.','good')}break}
    case 'bm':{const m=MM[v];if(!m)break;const c0=machPrice(m),c=menuAt?c0:c0+delivFee(c0);if(G.cash>=c){G.cash-=c;Sfx.cash();
      if(menuAt){G.lab.store[v]=(G.lab.store[v]||0)+1;toast(m.name+' acheté. Installe-le sur un emplacement libre du labo.','good')}else queueDelivery('m',v,1)}break}
    case 'bs':{const s=SM[v],n=+v2||1;if(!s||!G.unlocked[v])break;const c0=seedCost(s)*n,c=menuAt?c0:c0+delivFee(c0);if(G.cash>=c){G.cash-=c;Sfx.cash();
      if(menuAt){G.seeds[v]=(G.seeds[v]||0)+n;toast(`+${n} graine${n>1?'s':''} de ${s.name}.`,'good')}else queueDelivery('s',v,n)}break}
    case 'up':{const u=UPS.find(x=>x.id===v),c=upCost(u);if(G.cash>=c&&lv(v)<u.max){G.cash-=c;G.lv[v]=lv(v)+1;if(v==='labo'){labFloorSync();toast('Le labo s’agrandit : 4 emplacements de plus.','good')}}break}
    case 'hire':{const u=TEAM.find(x=>x.id===v),c=tmCost(u);if(G.cash>=c&&lv(v)<u.max){G.cash-=c;G.lv[v]=lv(v)+1;syncCouriers()}break}
    case 'buy':{const c=vPrice(VM[v]);if(G.cash>=c&&!G.owned[v]){G.cash-=c;G.owned[v]=1;chooseVehicle(v);Sfx.cash();toast(VM[v].name+' achetée. Elle t’attend '+(menuAt&&menuAt.park?'devant la concession':'devant le labo')+'.','good')}break}
    case 'pick':chooseVehicle(v);toast(VM[v].name+' t’attend '+(menuAt&&menuAt.park?'devant '+menuAt.name:'devant le labo')+'.','good');break;
    case 'track':trackId=+v;break;
    case 'gift':{const c=giftCost();if(G.cash>=c){G.cash-=c;addRel(v,8);toast(BOSSES[v].name+' apprécie le geste.','good')}break}
    case 'cs':{
      const done=()=>{if(menuOpen&&tab==='save')renderMenu()};
      if(v==='copy'){try{navigator.clipboard.writeText(G.code);cloudMsg='Code copié.'}catch(e){cloudMsg='Copie impossible : recopie le code à la main.'}break}
      cloudMsg='…';
      if(v==='make')makeCode().then(done);
      else if(v==='now')cloudPush().then(done);
      else if(v==='load'){codeDraft=(($('codeIn')||{}).value||'').replace(/[^A-Za-z0-9-]/g,'');loadCode(($('codeIn')||{}).value).then(m=>{cloudMsg=m;done()})}
      break}
    case 'mp':{const done=()=>{if(menuOpen&&tab==='mp')renderMenu()};
      if(v==='create')startParty(true);else if(v==='join')startParty(false,($('partyTabIn')||{}).value);else if(v==='public')startParty(false,'PUBLIC');
      else if(v==='leave'){mpLeave().then(()=>{MP.msg='Tu joues seul. Reviens quand tu veux avec « Rejoindre la partie publique ».';done()})}
      else if(v==='copy'){try{navigator.clipboard.writeText(MP.code);MP.msg='Code copié.'}catch(e){MP.msg='Copie impossible : recopie le code à la main.'}}
      break}
    case 'nick':{const n=cleanTxt(($('nickIn')||{}).value,18);if(n){MP.nick=n;MP.last='';try{localStorage.setItem('serre-nick',n)}catch(e){}toast('Pseudo : '+n,'good')}break}
    case 'cheat':{const c2=(($('cheatIn')||{}).value||'').replace(/\D/g,'');if(c2===CHEAT)applyCheat();else toast('Code incorrect.','bad');break}
    case 'reset':confirmReset=true;break;
    case 'resetno':confirmReset=false;break;
    case 'resetyes':resetGame();return;
  }
  save();renderMenu();
});
setInterval(()=>{if(menuOpen)refreshMenu();refreshShop()},400);
setInterval(()=>{if(menuOpen&&tab==='mp'&&$('mpList'))$('mpList').innerHTML=mpListHtml()},1000);


/* ---------- démarrage ---------- */
let started=false;
$('goBtn').onclick=()=>{
  $('goRow').hidden=true;$('goals').hidden=true;$('pickBox').hidden=false;
  $('dgrid').innerHTML=DKEYS.map(k=>{const d=DIS[k],b=BOSSES[BIDS.find(x=>BOSSES[x].sector===k)],pk=PERKS[k];
    return `<button class="dcard" data-home="${k}" style="--c:${d.col}"><h3>${d.name}</h3><span class="war">Tu prends la place de ${b.name}.</span><span class="pro">+ ${pk.pro}</span><span class="con">− ${pk.con}</span></button>`}).join('');
};
$('dgrid').onclick=e=>{
  const c=e.target.closest('[data-home]');if(!c)return;
  G=newG(c.dataset.home);G.began=1;save();beginGame(true);
};
$('startLoad').onclick=async()=>{const m=$('startMsg');m.textContent='…';m.textContent=await loadCode($('startCode').value)};
function beginGame(fresh){
  applyLook();
  $('start').hidden=true;$('hud').hidden=false;started=true;
  placeLandmarks();spawnHome();
  ended=false;HIDE=null;meetCar=null;meetT=110;setupGangs();syncCouriers();
  couriers.forEach(c=>{const p=randRoadPoint(homeSpawn().x,homeSpawn().z,10,60);c.x=p.x;c.z=p.z});
  orders.slice().forEach(removeOrder);
  if(fresh){setTimeout(()=>toast('Ton labo a déjà un pot, un séchoir et 3 graines. Plante dans le pot, puis arrose : l’arrosoir se remplit au robinet, à droite de l’entrée.'),600);setTimeout(()=>toast('Le reste s’achète à la jardinerie (matériel) et à la graineterie (graines), ou se commande à l’ordinateur du labo, livré en camionnette.'),7000)}
  else setTimeout(()=>toast('De retour au labo.'),400);
}
function resetGame(){
  endFast();cops=[];couriers=[];
  gangs=[];orders.slice().forEach(removeOrder);
  meetCar=null;HIDE=null;DV=null;parkCar(null);
  G=newG();applyLook();save();started=false;ended=false;talking=false;raidOpen=false;closeMenu();closeShop();
  $('end').hidden=true;$('talk').hidden=true;$('raid').hidden=true;$('hud').hidden=true;$('start').hidden=false;
  $('goRow').hidden=false;$('goals').hidden=false;$('pickBox').hidden=true;
}

/* ---------- collisions entre véhicules ---------- */
let bumpT=0;
function bumps(dt){
  bumpT-=dt;
  const list=traffic.concat(cops,gangs.filter(g=>!G.retired[g.boss]),couriers,meetCar?[meetCar]:[]);
  const rp=P.def.kind==='foot'?1.2:P.def.kind==='scooter'||P.def.kind==='bike'?1.5:2.2;
  for(const e of list){
    const dx=P.x-e.x,dz=P.z-e.z,d2=dx*dx+dz*dz,rad=rp+(e.spr.k==='truck'?3.4:2.1);
    if(d2>=rad*rad||d2<1e-4)continue;
    const d=Math.sqrt(d2),nx=dx/d,nz=dz/d,pen=rad-d;
    const rv=(P.vx-Math.sin(e.th)*e.v)*nx+(P.vz-Math.cos(e.th)*e.v)*nz;
    P.x+=nx*pen*.65;P.z+=nz*pen*.65;e.x-=nx*pen*.35;e.z-=nz*pen*.35;
    if(rv<0){
      P.vx+=nx*-rv*.8;P.vz+=nz*-rv*.8;e.v*=Math.max(.3,1+rv*.02);
      if(-rv>5&&bumpT<=0){
        bumpT=.3;sparks(P.x-nx*rp,P.z-nz*rp,7,14);Sfx.crash(Math.min(1,-rv/28));CAM.shake=Math.max(CAM.shake,Math.min(9,-rv*.4));
        if(e.civ&&-rv>11){G.heat=Math.min(100,G.heat+2.5);floater(P.x,P.z-3,'Accrochage !','#ffa63d',false)}
      }
    }
  }
}

/* ---------- multijoueur : parties privées par code (capacité room) ----------
   Un joueur crée une partie et reçoit un code ; ses amis entrent le même code.
   Chaque code est un salon à part : seuls ceux qui ont le code se voient.
   Rien n'est stocké : l'argent, la serre et la police restent propres à chaque joueur. */
const MP={state:'loading',why:'',room:null,g:null,code:'',on:false,others:new Map(),nick:'',last:'',sendT:0,myBub:null,count:0,msg:'',busy:false};
try{MP.nick=localStorage.getItem('serre-nick')||''}catch(e){}
const cleanTxt=(s,n)=>String(s==null?'':s).replace(/[\u0000-\u001f\u007f-\u009f­​-‏‪-‮⁠-⁯﻿]/g,'').replace(/\s+/g,' ').trim().slice(0,n);
if(!cleanTxt(MP.nick,18))MP.nick='Joueur-'+Math.random().toString(36).slice(2,6).toUpperCase();
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const MPK=new Set(['foot','bike','scooter','car','van','truck','suv','wagon','sedan','hyper']);
const pnum=(v,a,b,d)=>typeof v==='number'&&isFinite(v)?clamp(v,a,b):d;
const pcol=(v,d)=>Math.round(pnum(v,0,0xffffff,d));
const mpReady=()=>!!MP.g&&MP.on;
const partyCode=v=>{const c=String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'');return c==='PUBLIC'||c.length===5?c:null};
const partyName=c=>c==='PUBLIC'?'publique':c;
const MPVER='serveur v2 · 3D';
function newPartyCode(){let c='';const a=new Uint32Array(5);try{crypto.getRandomValues(a)}catch(e){for(let i=0;i<5;i++)a[i]=Math.random()*4294967296}
  for(let i=0;i<5;i++)c+=CALPHA[a[i]%CALPHA.length];return c}
function mpSync(peers){
  const seen=new Set();
  for(const p of peers){
    if(p.sameTab||p.kind!=='viewer')continue;
    const pr=p.presence||{};
    if(typeof pr.x!=='number'||typeof pr.z!=='number')continue;
    seen.add(p.peer);
    let o=MP.others.get(p.peer);
    const x=pnum(pr.x,-610,610,0),z=pnum(pr.z,-610,610,0),th=pnum(pr.th,-1e3,1e3,0);
    if(!o){o={x,z,th,ph:0,sp:0,bub:null,lk:''};MP.others.set(p.peer,o);
      if(started)toast(cleanTxt(pr.n,18)+' a rejoint la partie.','chat')}
    o.tx=x;o.tz=z;o.tth=th;o.n=cleanTxt(pr.n,18)||'Joueur';
    o.k=MPK.has(pr.k)?pr.k:'foot';o.c=pcol(pr.c,0xd04a2a);o.cash=pnum(pr.cash,0,1e12,0);
    o.hd=typeof pr.hd==='string'&&DIS[pr.hd]?pr.hd:'';o.hid=pr.hid===1;
    const lk=[pcol(pr.sh,0x5a6b4a),pcol(pr.pa,0x3d5a88),pcol(pr.cp,0)].join(',');
    if(lk!==o.lk){o.lk=lk;const [sh,pa,cp]=lk.split(',').map(Number);o.look={...LOOK0,shirt:sh,pants:pa,cap:cp}}
  }
  for(const [k,o] of MP.others)if(!seen.has(k)){MP.others.delete(k);if(started)toast(o.n+' a quitté la partie.')}
  MP.count=MP.others.size;
}
function mpUpdate(dt){
  for(const o of MP.others.values()){
    if(Math.hypot(o.tx-o.x,o.tz-o.z)>60){o.x=o.tx;o.z=o.tz;o.th=o.tth}
    const k=1-Math.exp(-dt*10),px=o.x,pz=o.z;
    o.x+=(o.tx-o.x)*k;o.z+=(o.tz-o.z)*k;
    let d=o.tth-o.th;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;o.th+=d*k;
    o.sp=o.sp*.8+.2*Math.hypot(o.x-px,o.z-pz)/Math.max(dt,1e-3);o.ph+=o.sp*dt*.75;
    if(o.bub&&(o.bub.ttl-=dt)<=0)o.bub=null;
    // on ne traverse pas les autres joueurs
    if(started&&!HIDE&&!o.hid&&!paused()){
      const dx=P.x-o.x,dz=P.z-o.z,dd=Math.hypot(dx,dz),r=(P.def.kind==='foot'?.9:P.def.kind==='bike'||P.def.kind==='scooter'?1.4:2.2)+(o.k==='foot'?.9:o.k==='bike'||o.k==='scooter'?1.4:o.k==='truck'?3.4:2.1);
      if(dd<r&&dd>.01){const nx=dx/dd,nz=dz/dd;P.x+=nx*(r-dd);P.z+=nz*(r-dd);const vn=P.vx*nx+P.vz*nz;if(vn<0){P.vx-=1.4*vn*nx;P.vz-=1.4*vn*nz;if(-vn>6){Sfx.crash(Math.min(1,-vn/30));CAM.shake=Math.max(CAM.shake,Math.min(7,-vn*.3))}}}
    }
  }
  if(MP.myBub&&(MP.myBub.ttl-=dt)<=0)MP.myBub=null;
  MP.sendT-=dt;
  if(MP.g&&MP.sendT<=0){
    MP.sendT=.1;
    const st=started&&!ended?{n:MP.nick,x:Math.round(P.x*10)/10,z:Math.round(P.z*10)/10,th:Math.round(P.th*100)/100,k:P.def.kind,c:P.def.color,
      sh:PLAYER_LOOK.shirt,pa:PLAYER_LOOK.pants,cp:PLAYER_LOOK.cap||0,cash:Math.floor(G.cash+(G.bank||0)),hd:G.home,hid:HIDE?1:0}:{n:MP.nick,x:null,z:null};
    const s=JSON.stringify(st);
    if(s!==MP.last){MP.last=s;MP.g.presence(st).catch(()=>{})}
  }
  const on=$('hOnline'),show=started;
  if(on.hidden!==!show)on.hidden=!show;
  {const t=mpStatusTxt(),c=MP.g?'#7fd1ff':MP.state==='loading'||MP.state==='solo'?'#a8937f':'#ff7a6a';
   if(on.textContent!==t)on.textContent=t;if(on.style.color!==c)on.style.color=c;
   const sm=$('mpStartStatus');if(sm&&sm.textContent!==t){sm.textContent=t;sm.style.color=c}}
  const bc=$('bChat'),sc=mpReady();if(bc.hidden!==!sc)bc.hidden=!sc;
}
const mpErr=e=>{const c=e&&e.code;return c==='limit_reached'?'Trop de parties ouvertes, réessaie dans un instant.':c==='not_permitted'||c==='not_granted'?'Tu n’as pas accès au multijoueur sur cette page.':c==='invalid_argument'?'Code invalide.':'Connexion impossible pour l’instant, réessaie.'};
async function mpJoin(code,quiet){
  code=partyCode(code);if(!code)return 'Le code fait 5 caractères, par exemple K7QPM.';
  if(!MP.room)return 'Le multijoueur n’est pas disponible : ouvre le jeu par l’adresse du serveur.';
  if(MP.busy)return 'Connexion en cours…';
  MP.busy=true;
  try{
    await mpLeave(true);
    const g=await MP.room.join('p-'+code.toLowerCase());
    MP.g=g;MP.code=code;MP.last='';MP.on=g.connected();MP.others.clear();MP.count=0;
    g.onConnection(c=>{if(MP.g===g)MP.on=c},()=>{});
    g.onPeers(ch=>{if(MP.g===g)mpSync(ch.peers)},()=>{if(MP.g===g){MP.g=null;MP.others.clear();MP.count=0;toast('Connexion à la partie perdue. Rejoins-la avec le code.','bad')}});
    g.on('chat',m=>{
      if(MP.g!==g)return;
      const t=cleanTxt(m.data&&m.data.t,120);if(!t)return;
      if(m.sameTab){MP.myBub={t,ttl:6};toast('Toi : '+t,'chat');return}
      const o=MP.others.get(m.peer),n=o?o.n:'Quelqu’un';
      if(o)o.bub={t,ttl:6};
      toast(n+' : '+t,'chat');Sfx.click();
    },()=>{});
    g.on('horn',m=>{
      if(MP.g!==g||m.sameTab)return;const o=MP.others.get(m.peer);if(!o||!started)return;
      if(Math.hypot(o.x-P.x,o.z-P.z)<140){Sfx.horn();floater(o.x,o.z-3,'Tut tut !','#7fd1ff',false)}
    },()=>{});
    try{localStorage.setItem('serre-party',code)}catch(e){}
    MP.state='ok';MP.why='';
    if(!quiet&&started)toast(code==='PUBLIC'?'Tu es dans la partie publique.':'Partie '+code+' rejointe. Donne ce code à tes amis.','good');
    return code==='PUBLIC'?'Tu es dans la partie publique : tous ceux qui ouvrent le jeu sans code s’y retrouvent.':'Tu es dans la partie privée '+code+'. Donne ce code à tes amis pour qu’ils te rejoignent.';
  }catch(e){MP.why=mpErr(e);if(!MP.g)MP.state='error';return MP.why}
  finally{MP.busy=false}
}
async function mpLeave(keep){
  const g=MP.g;MP.g=null;MP.code='';MP.others.clear();MP.count=0;MP.on=false;
  if(!keep){MP.state='solo';try{localStorage.setItem('serre-party','SOLO')}catch(e){}}
  if(g){try{await g.leave()}catch(e){}}
}
async function mpInit(){
  let room=null;
  try{if(typeof claude!=='undefined'&&claude.use)room=await claude.use('room')}catch(e){room=null}
  if(!room){MP.state='off';MP.why='Le multijoueur ne peut pas joindre le serveur. Ouvre le jeu par son adresse (par exemple http://localhost:3000), pas en double-cliquant sur le fichier.';if(menuOpen&&tab==='mp')renderMenu();return}
  MP.room=room;
  room.onConnection(()=>{},e=>{MP.state='off';MP.why=mpErr(e);MP.g=null;MP.others.clear();MP.count=0});
  // tout le monde arrive dans la partie publique, sauf s'il avait rejoint une partie privée ou choisi de jouer seul
  let saved=null;try{saved=localStorage.getItem('serre-party')}catch(e){}
  if(saved==='SOLO'){MP.state='solo'}
  else{
    const code=partyCode(saved)||'PUBLIC';
    for(let i=0;i<5&&!MP.g;i++){const r=await mpJoin(code,true);if(MP.g)break;if(/accès|invalide/.test(r))break;await new Promise(ok=>setTimeout(ok,2500))}
    if(MP.g&&started)toast(MP.code==='PUBLIC'?'Connecté à la partie publique.':'De retour dans la partie '+MP.code+'.','good');
  }
  if(menuOpen&&tab==='mp')renderMenu();
}
function mpStatusTxt(){
  if(MP.g)return `Partie ${partyName(MP.code)} · ${MP.count+1} joueur${MP.count?'s':''}${MP.on?'':' · connexion…'}`;
  if(MP.state==='loading'||MP.busy)return 'Multijoueur : connexion…';
  if(MP.state==='solo')return 'Multijoueur : tu joues seul';
  return 'Multijoueur : hors ligne (touche ici)';
}
function openChat(){if(!mpReady())return;for(const k in keys)keys[k]=0;$('chatBar').hidden=false;setTimeout(()=>$('chatIn').focus(),0)}
function closeChat(){$('chatBar').hidden=true;$('chatIn').blur()}
function sendChat(){
  const t=cleanTxt($('chatIn').value,120);if(!t||!MP.g){closeChat();return}
  MP.g.emit('chat',{t}).catch(e=>toast(e&&e.code==='not_permitted'?'Message refusé par le serveur.':'Message non envoyé.','bad'));
  $('chatIn').value='';closeChat();
}
$('chatSend').onclick=sendChat;$('chatClose').onclick=closeChat;
$('chatIn').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();sendChat()}else if(e.key==='Escape'){e.preventDefault();closeChat()}});
$('bChat').onclick=openChat;
$('hOnline').onclick=()=>{if(started&&!ended&&!paused())openMenu('mp',true)};
function mpListHtml(){
  if(!MP.g)return '';
  const rows=[{n:MP.nick,me:1,cash:G.cash+(G.bank||0),hd:G.home,v:P.def.name}];
  for(const o of MP.others.values())rows.push({n:o.n,cash:o.cash,hd:o.hd,v:(VEH.find(v=>v.kind===o.k)||{}).name||'',hid:o.hid});
  rows.sort((a,b)=>b.cash-a.cash);
  return (MP.others.size?'':'<p class="note">Personne d’autre pour l’instant. Envoie le code à tes amis.</p>')+'<div class="list">'+rows.map((r,i)=>`<div class="item"><b class="${r.me?'mp-me':''}">${i+1}. ${esc(r.n)}${r.me?' <span class="tag ok">toi</span>':''}${r.hid?' <span class="tag">caché</span>':''}</b><span>${fmt(r.cash)} · ${r.hd&&DIS[r.hd]?esc(DIS[r.hd].name):'?'} · ${esc(r.v)}</span></div>`).join('')+'</div>';
}
function tabMp(){
  let s='';
  if(!MP.room){
    s+=`<div class="item"><b style="color:#ff7a6a">Multijoueur indisponible ${MP.state==='loading'?'(connexion…)':''}</b><span>${esc(MP.why||'Connexion au salon en cours…')}</span></div>`;
    s+=mpHelp();return s;
  }
  if(MP.g){
    const pub=MP.code==='PUBLIC';
    s+=`<div class="item"><b style="font-family:var(--mono);font-size:${pub?22:30}px;letter-spacing:.14em;color:#7fd1ff">${pub?'PUBLIQUE':MP.code}</b><span>${pub?'Partie publique : tous ceux qui ouvrent le jeu sans code sont ici, rien à faire.':'Partie privée. Tes amis entrent ce code ici ou sur l’écran d’accueil pour te rejoindre.'}${MP.on?'':' Connexion…'}</span>${pub?'':'<button class="btn" data-act="mp:copy">Copier</button>'}</div>`;
    s+=`<div class="chips">${pub?'<button class="btn" data-act="mp:create">Créer une partie privée</button>':'<button class="btn ghost" data-act="mp:public">Retour à la partie publique</button>'}<button class="btn ghost" data-act="mp:leave">Jouer seul</button></div>`;
  }else{
    if(MP.state==='error')s+=`<p class="note" style="color:#ff7a6a">${esc(MP.why)}</p>`;
    s+='<div class="chips"><button class="btn" data-act="mp:public">Rejoindre la partie publique</button><button class="btn ghost" data-act="mp:create">Créer une partie privée</button></div>';
  }
  if(!MP.g||MP.code==='PUBLIC')s+=`<div class="chips" style="align-items:center"><input id="partyTabIn" placeholder="CODE" maxlength="5" aria-label="Code de partie privée" autocomplete="off" style="width:120px;letter-spacing:.18em"><button class="btn ghost" data-act="mp:join">Rejoindre une partie privée</button></div>`;
  if(MP.msg)s+=`<p class="note" role="status">${esc(MP.msg)}</p>`;
  s+=`<div class="chips" style="align-items:center"><input id="nickIn" value="${esc(MP.nick)}" maxlength="18" aria-label="Pseudo" autocomplete="off" style="text-transform:none;width:180px"><button class="btn ghost" data-act="nick">Changer de pseudo</button></div>`;
  if(MP.g)s+=`<div><h2 style="margin-bottom:6px">Joueurs de la partie</h2><div id="mpList">${mpListHtml()}</div></div>`;
  s+=mpHelp();
  return s;
}
function mpHelp(){
  return `<div><h2 style="margin-bottom:6px">Tes amis ne te voient pas ?</h2><div class="list">
  <div class="item"><b>1. Même adresse</b><span>Tout le monde ouvre la même adresse du jeu (celle de ton serveur). Aucun compte n’est nécessaire.</span></div>
  <div class="item"><b>2. Même version</b><span>En bas de cet onglet, tout le monde doit voir « ${MPVER} ». Sinon, rechargez la page.</span></div>
  <div class="item"><b>3. Serveur réveillé</b><span>Sur un hébergement gratuit, le serveur s’endort : le premier joueur attend environ 30 secondes, puis rechargez.</span></div>
  <div class="item"><b>4. Même partie</b><span>Sans code, tout le monde est dans la partie publique. Avec un code, il faut le même code pour tout le monde.</span></div>
  </div><p class="note" style="margin-top:8px">${MPVER}</p></div>`;
}
async function startParty(create,code,msgEl){
  const set=m=>{MP.msg=m;if(msgEl)msgEl.textContent=m;if(menuOpen&&tab==='mp')renderMenu()};
  set('…');
  set(await mpJoin(create?newPartyCode():code));
}
$('partyNew').onclick=()=>startParty(true,null,$('partyMsg'));
$('partyJoin').onclick=()=>startParty(false,$('partyIn').value,$('partyMsg'));
mpInit();


/* ---------- boucle ---------- */
/* une étape de simulation (sans dessin) */
function simStep(real,dt){
  economy(real);
  let near=9999;
  if(!paused()){
    if(P.def.kind==='foot')updFoot(dt);else updPlayer(dt);
    updInside();if(HIDE)HIDE.t+=dt;
    updOrders(dt);updCops(dt);updGangs(dt);
    if(!ended){
      updCouriers(dt);updMission(dt);updMeeting(dt);updDelivery(dt);
      updTraffic(dt,P.x,P.z,[P].concat(traffic,cops,gangs,couriers));updPeds(dt,P.x,P.z);if(!curShell)bumps(dt);
      if(!threat)G.hp=Math.min(100,G.hp+1.2*dt);
      near=cops.reduce((m,c)=>Math.min(m,Math.hypot(c.x-P.x,c.z-P.z)),1e9);
      let dec=.45*(1+.25*lv('vent'))*(1+.3*inv('brouilleur'))*(near>180?1.8:near>90?1:.15);
      if(tot()===0&&!M)dec*=2;
      if(P.def.kind==='bike')dec*=1.4;
      if(HIDE)dec=Math.max(dec,4);
      G.heat=Math.max(0,G.heat-dec*dt);
    }
  }
  return near;
}
let last=performance.now(),orbit=0;
function frame(now){
  requestAnimationFrame(frame);
  const real=clamp((now-last)/1000,0,1),dt=Math.min(.05,real);last=now;
  mpUpdate(dt);
  if(!started){
    orbit+=real*.04;const fx=Math.sin(orbit)*240,fz=Math.cos(orbit*1.3)*240;
    updTraffic(dt,fx,fz,traffic);updPeds(dt,fx,fz);updFx(real);
    camera.position.set(fx+Math.sin(orbit*.7)*180,150,fz+Math.cos(orbit*.7)*180);camera.lookAt(fx,0,fz);
    renderWorld(now,dt,fx,fz);return}
  const near=simStep(real,dt);
  updFx(real);updCamera(dt);hud(dt);renderWorld(now,dt,P.x,P.z);
  Sfx.update({run:!menuOpen&&!ended&&!talking,foot:P.def.kind==='foot'||P.def.kind==='bike',sp:Math.hypot(P.vx,P.vz),vmax:P.def.vmax*(P.def.kind==='bike'?1:mot()),thr:!!keys.up,slip:P.slip,big:P.def.kind==='truck'||P.def.kind==='van',rain:WX.lvl,cop:cops.length?near:9999});
}
function honk(){if(P.def.kind==='foot')return;Sfx.init();Sfx.horn();scarePeds(16);if(mpReady())MP.g.emit('horn',{}).catch(()=>{})}
$('bHorn').onclick=()=>{if(started&&!paused())honk()};
$('bSnd').onclick=()=>{const o=Sfx.toggle();$('bSnd').textContent=o?'🔊':'🔇';$('bSnd').setAttribute('aria-label',o?'Couper le son':'Remettre le son')};
$('bSnd').textContent=Sfx.on?'🔊':'🔇';
buildCity();
placeLandmarks();
if(DEBUG)window.__serre={get G(){return G},P,LAB:()=>LAB,act,actOpt,labDo,labTarget,itemAt,lPlace,lPlant,lHarvest,lLoad,lWater,openMenu,closeMenu,
  get curShell(){return curShell},get CAR(){return CAR},enterCar,exitCar,J,keys,CAMS,camera,SHOPS,SHELLS,tot,rawTot,seedTot,orders:()=>orders,sale,genOrder,economy,labTick,
  get tgt(){findTarget();return tgt},teleport:(x,z,th)=>{P.x=x;P.z=z;if(th!=null){P.th=th;CAMS.yaw=th}P.vx=P.vz=0;curShell=shellAt(x,z)},renderer,scene,MP,chooseVehicle,copsN:()=>cops.length,nearCop:()=>Math.round(cops.reduce((m,c)=>Math.min(m,Math.hypot(c.x-P.x,c.z-P.z)),1e9)),hide:()=>!!HIDE,mission:()=>M&&{units:M.units,value:M.value},
  step:sec=>{for(let t=0;t<sec;t+=.05){mpUpdate(.05);simStep(.05,.05);updFx(.05);updCamera(.05)}hud(0)}};
if(G.began){beginGame(false)}else{$('start').hidden=false}
requestAnimationFrame(frame);
