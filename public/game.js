const $=id=>document.getElementById(id);
const R=(a,b)=>a+Math.random()*(b-a);
const RI=(a,b)=>Math.floor(R(a,b+1));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const fmt=n=>Math.floor(n).toLocaleString('fr-FR')+' €';
const HALF=600,PITCH=100,ROADW=22;
const rl=v=>Math.round((v+HALF)/PITCH)*PITCH-HALF;
const pick=a=>a[Math.floor(Math.random()*a.length)];

const MOBILE=(()=>{try{return matchMedia('(pointer: coarse)').matches}catch(e){return false}})();

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
  {id:'labo',name:'Agrandir le labo',desc:'Recule la cloison du fond : plus de place pour tes machines.',base:1200,mult:2.4,max:4},
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
  sac1:{name:'Sac de randonnée',desc:'Sac à dos de 10 places (au lieu de 6).',price:600,bag:1},
  sac2:{name:'Sac tactique',desc:'Sac à dos de 16 places.',price:4000,bag:2},
  sac3:{name:'Sac de voyage XXL',desc:'Sac à dos de 24 places.',price:15000,bag:3},
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
    greet:['« Des pots, des séchoirs, des arroseurs. Dites-moi ce qu’il vous faut. »'],
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
    goods:['sac1','sac2','sac3','veste_noire','veste_rouge','veste_blanche','veste_verte','jean_noir','cargo','jean_bleu','casq_bleue','casq_noire','casq_rouge','nu_tete'],
    names:['Fripe & Co','Le Dressing'],clerks:['Capucine','Lucien'],
    greet:['« Un nouveau look, ça aide à passer inaperçu. »','« Essayez, essayez. Les cabines sont au fond. »'],
    talk:['« Les flics reconnaissent les gens aux vêtements. Change de temps en temps. »']},
  graineterie:{label:'Graineterie',short:'Graines',col:'#9a8a2e',floor:'#33301e',deco:'plantes',items:['#8fbf4a','#c9a05a','#e0b020','#6aa84f','#b98a5a'],
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
  lab:{items:[{id:'pot',d:5.2,s:-1.5,pl:null},{id:'sechoir',d:6.4,s:6.8,pl:null}],store:{}},bag:{lv:0,p:{},it:{}},
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
    if(!it||!MM[it.id])return false;
    if(Number.isInteger(it.slot)){if(it.slot<0||it.slot>=LAB_MAX||used.has(it.slot))return false;used.add(it.slot);it.d=4.6+Math.floor(it.slot/LAB_COLS)*3;it.s=-7.5+(it.slot%LAB_COLS)*3;delete it.slot}
    if(typeof it.d!=='number'||typeof it.s!=='number'||!isFinite(it.d)||!isFinite(it.s))return false;
    if(it.pl&&!SM[it.pl.s])it.pl=null;if(it.b&&!SM[it.b.s])it.b=null;return true});
  g.bag=g.bag&&typeof g.bag==='object'?g.bag:{lv:0,p:{},it:{}};g.bag.lv=clamp(g.bag.lv|0,0,3);g.bag.p=g.bag.p||{};g.bag.it=g.bag.it||{};
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

/* ---------- rendu 2D : canevas, caméra, textures ---------- */
const cv=$('gl'),ctx=cv.getContext('2d');
const dk=document.createElement('canvas'),dg=dk.getContext('2d');
let VW=800,VH=600,DPR=1;
const CAM={x:0,z:0,zoom:6,shake:0};
const RC={x:0,z:0},VB={x0:0,x1:0,z0:0,z1:0};
function resize(){const a=$('app');VW=Math.max(1,a.clientWidth);VH=Math.max(1,a.clientHeight);DPR=Math.min(window.devicePixelRatio||1,2);cv.width=Math.round(VW*DPR);cv.height=Math.round(VH*DPR);dk.width=Math.ceil(VW/2);dk.height=Math.ceil(VH/2)}
window.addEventListener('resize',resize);resize();
const hexn=s=>parseInt(s.slice(1),16);
const hex2=h=>'#'+('000000'+h.toString(16)).slice(-6);
const rgbOf=h=>[(h>>16)&255,(h>>8)&255,h&255];
const shade=(h,f)=>{const c=rgbOf(h).map(v=>clamp(Math.round(v*f),0,255));return `rgb(${c[0]},${c[1]},${c[2]})`};
function rr(g,x,y,w,h,r){r=Math.min(r,Math.abs(w)/2,Math.abs(h)/2);g.beginPath();g.moveTo(x+r,y);g.lineTo(x+w-r,y);g.quadraticCurveTo(x+w,y,x+w,y+r);g.lineTo(x+w,y+h-r);g.quadraticCurveTo(x+w,y+h,x+w-r,y+h);g.lineTo(x+r,y+h);g.quadraticCurveTo(x,y+h,x,y+h-r);g.lineTo(x,y+r);g.quadraticCurveTo(x,y,x+r,y);g.closePath()}
const el=(g,x,y,rx,ry,c)=>{g.fillStyle=c;g.beginPath();g.ellipse(x,y,rx,ry,0,0,6.2832);g.fill()};
const toScr=(x,z)=>[(x-RC.x)*CAM.zoom+VW/2,(z-RC.z)*CAM.zoom+VH/2];
const inView=(x,z,r)=>x>VB.x0-r&&x<VB.x1+r&&z>VB.z0-r&&z<VB.z1+r;

/* textures répétées (tuiles en mètres) */
function tile(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);return c}
function mkPat(c,metres){try{const p=ctx.createPattern(c,'repeat');p.setTransform(new DOMMatrix().scale(metres/c.width));return p}catch(e){return null}}
const PAT={};
PAT.asph=mkPat(tile(256,256,(x,w,h)=>{
  x.fillStyle='#34312f';x.fillRect(0,0,w,h);
  for(let i=0;i<9000;i++){const v=40+Math.random()*34|0;x.fillStyle=`rgb(${v},${v-1},${v-3})`;x.fillRect(Math.random()*w,Math.random()*h,1+Math.random()*2,1+Math.random()*2)}
  x.strokeStyle='rgba(10,10,10,.55)';x.lineWidth=1;
  for(let i=0;i<6;i++){x.beginPath();let px=Math.random()*w,py=Math.random()*h;x.moveTo(px,py);for(let k=0;k<6;k++){px+=Math.random()*38-19;py+=Math.random()*38-19;x.lineTo(px,py)}x.stroke()}
  for(let i=0;i<3;i++){x.fillStyle='rgba(0,0,0,.16)';x.beginPath();x.ellipse(Math.random()*w,Math.random()*h,8+Math.random()*14,5+Math.random()*9,Math.random()*3,0,6.3);x.fill()}
}),16);
PAT.conc=mkPat(tile(128,128,(x,w,h)=>{
  x.fillStyle='#a9a59e';x.fillRect(0,0,w,h);
  for(let i=0;i<2200;i++){const v=150+Math.random()*38|0;x.fillStyle=`rgb(${v},${v-3},${v-8})`;x.fillRect(Math.random()*w,Math.random()*h,2,2)}
  x.fillStyle='rgba(60,56,50,.5)';x.fillRect(0,0,w,2);x.fillRect(0,0,2,h);x.fillRect(w/2,0,1,h);x.fillRect(0,h/2,w,1);
}),8);
PAT.grass=mkPat(tile(128,128,(x,w,h)=>{
  x.fillStyle='#4f7d35';x.fillRect(0,0,w,h);
  for(let i=0;i<3200;i++){const g=92+Math.random()*60|0;x.fillStyle=`rgb(${g-40},${g},${g-56})`;x.fillRect(Math.random()*w,Math.random()*h,1,2+Math.random()*2)}
  for(let i=0;i<10;i++){x.fillStyle='rgba(230,230,120,.8)';x.fillRect(Math.random()*w,Math.random()*h,2,2)}
}),8);
PAT.roof=mkPat(tile(128,128,(x,w,h)=>{
  x.fillStyle='#fff';x.fillRect(0,0,w,h);
  for(let i=0;i<1800;i++){const v=Math.random()<.5?0:255;x.fillStyle=`rgba(${v},${v},${v},.25)`;x.fillRect(Math.random()*w,Math.random()*h,2,2)}
}),8);
const GLOW=tile(128,128,(x,w,h)=>{const g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.35,'rgba(255,255,255,.5)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,128,128)});
const GLC={};
const glowOf=c=>GLC[c]||(GLC[c]=tile(128,128,(x,w,h)=>{const g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,c);g.addColorStop(.4,c.replace(/[\d.]+\)$/,m=>(parseFloat(m)*.4)+')'));g.addColorStop(1,c.replace(/[\d.]+\)$/,'0)'));x.fillStyle=g;x.fillRect(0,0,128,128)}));

/* ---------- temps, soleil, météo ---------- */
const TOD={h:18,l:1,n:0,tint:'rgba(0,0,0,0)',sx:0,sz:0,sa:.3,rain:0,label:''};
const WX={lvl:0,target:0,t:R(70,140)};
function calcTOD(){
  const h=(17.2+Date.now()/35000)%24;TOD.h=h; // horloge partagée : une journée = 14 min réelles, la même pour tous
  let l=h>=8&&h<=17.5?1:h>17.5&&h<20.5?1-(h-17.5)/3:(h>=20.5||h<5)?0:h<8?(h-5)/3:1;
  l=l*l*(3-2*l);
  const warm=clamp(1-Math.abs(l-.5)*2.2,0,1),rn=WX.lvl;
  const n=Math.max(1-l,rn*.28);
  const c0=[7,11,40],c1=[120,52,34],c2=[40,55,78];
  let col=c0.map((v,i)=>v+(c1[i]-v)*warm*(1-n*.4));
  col=col.map((v,i)=>v+(c2[i]-v)*rn*.5);
  const a=Math.min(.74,.72*n+.06*warm);
  TOD.l=l;TOD.n=n;TOD.rain=rn;TOD.tint=`rgba(${col.map(Math.round).join(',')},${a.toFixed(3)})`;
  const sa=(clamp(h,6,18)-6)/12*Math.PI;
  const len=(.22+1.0*Math.pow(Math.abs(Math.cos(sa)),1.4))*(l>.05?1:0)+(l>.05?0:.5);
  TOD.sx=-Math.cos(sa)*len*(l>.05?1:.4);TOD.sz=(-Math.sin(sa)*.55-.05)*(l>.05?1:-1)*(l>.05?1:.5);
  TOD.sa=.34*l*(1-rn*.7)+.1;
  const hh=Math.floor(h),mm=Math.floor((h-hh)*60);
  TOD.label=('0'+hh).slice(-2)+':'+('0'+mm).slice(-2)+(rn>.4?' · pluie':l<.3?' · nuit':l<.8?' · crépuscule':'');
}

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
const STY=new Map();
function sty(h){let s=STY.get(h);if(!s){s={N:shade(h,1.0),W:shade(h,.86),E:shade(h,.62),S:shade(h,.5),R:shade(h,1.1),L:shade(h,1.32),D:shade(h,.4)};STY.set(h,s)}return s}
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
  addRectAll({x0:-13,x1:13,z0:-13,z1:13});addRectAll({x0:PLAZA.x-6,x1:PLAZA.x+6,z0:PLAZA.z-6,z1:PLAZA.z+6});
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
      addRectAll({x0:x-hw,x1:x+hw,z0:z-hl,z1:z+hl})}}
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
  for(const [dx,dz] of [[0,1],[0,-1],[1,0],[-1,0]].sort(()=>Math.random()-.5)){
    const ex=x+dx*(w/2),ez=z+dz*(l/2);
    let ok=false;for(let t=4;t<=12;t+=2)if(maskAt(ex+dx*t,ez+dz*t)===1){ok=true;break}
    if(ok){b.shop={x:ex+dx*3,z:ez+dz*3};break}
  }
  binOf(x,z).bld.push(b);rasterRect(b.x0,b.z0,b.x1,b.z1,i=>{MASK[i]=4});addRectAll({x0:b.x0,x1:b.x1,z0:b.z0,z1:b.z1});
  return b;
}
function mkYard(cx,cz){
  if(!rectFree(cx-14,cz-12,cx+14,cz+12,2))return;
  const B=binOf(cx,cz);
  for(let a=0;a<2;a++)for(let r=0;r<3;r++){if(Math.random()<.2)continue;const x=cx-7+a*14,z=cz-8+r*8,st=Math.random()<.4?2:1;
    B.cont.push({x0:x-6,x1:x+6,z0:z-2.5,z1:z+2.5,h:2.8*st,st:sty(pick([0xa8402a,0x2d5a8a,0x3f7a4a,0xc29a2a,0x8a8a8a]))});addRectAll({x0:x-6,x1:x+6,z0:z-2.5,z1:z+2.5})}
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

/* ---------- sprites de véhicules (vue de dessus, pré-rendus) ---------- */
const PPM=14;
const CS={
  car:{L:4.0,W:1.76,cf:.85,rf:.15,rr:-.95,cr:-1.5,rad:.5,wb:1.25},
  sedan:{L:4.9,W:1.95,cf:1.25,rf:.4,rr:-1.0,cr:-1.75,rad:.55,wb:1.5},
  wagon:{L:5.0,W:2.0,cf:1.2,rf:.35,rr:-1.9,cr:-2.2,rad:.5,wb:1.55},
  suv:{L:4.7,W:1.96,cf:1.0,rf:.75,rr:-1.95,cr:-2.05,rad:.2,wb:1.45},
  hyper:{L:4.55,W:2.04,cf:.95,rf:.1,rr:-.95,cr:-1.5,rad:.8,wb:1.4},
  bus:{L:11,W:2.55,cf:4.7,rf:4.3,rr:-5.2,cr:-5.4,rad:.3,wb:3.9},
  van:{L:5.4,W:2.0,cf:1.75,rf:1.2,rr:-2.55,cr:-2.6,rad:.3,wb:1.7},
};
const glassG=(g,x0,x1)=>{const l=g.createLinearGradient(x0,0,x1,0);l.addColorStop(0,'#0b121c');l.addColorStop(1,'#34506f');return l};
function paintCar(g,kind,col,o){
  const k=CS[kind],L=k.L,W=k.W,hw=W/2,hl=L/2,r=k.rad,cop=o.cop;
  const base=cop?0xf2f2f4:col;
  g.fillStyle='#09090b';
  for(const sx of [-1,1])for(const sy of [-1,1]){rr(g,sx*k.wb-.4,sy>0?hw-.22:-hw-.1,.8,.32,.09);g.fill()}
  g.beginPath();
  g.moveTo(-hl+r*.55,-hw);g.lineTo(hl-r*1.5,-hw);g.quadraticCurveTo(hl-.06,-hw+.03,hl,-hw*.55);
  g.lineTo(hl,hw*.55);g.quadraticCurveTo(hl-.06,hw-.03,hl-r*1.5,hw);g.lineTo(-hl+r*.55,hw);
  g.quadraticCurveTo(-hl,hw,-hl,hw-r*.55);g.lineTo(-hl,-hw+r*.55);g.quadraticCurveTo(-hl,-hw,-hl+r*.55,-hw);g.closePath();
  const bg=g.createLinearGradient(0,-hw,0,hw);
  bg.addColorStop(0,shade(base,.6));bg.addColorStop(.2,shade(base,.95));bg.addColorStop(.5,shade(base,1.22));bg.addColorStop(.8,shade(base,.95));bg.addColorStop(1,shade(base,.6));
  g.fillStyle=bg;g.fill();g.strokeStyle='rgba(0,0,0,.55)';g.lineWidth=.06;g.stroke();
  if(kind==='van'){
    g.fillStyle=glassG(g,k.rf,k.cf);g.beginPath();g.moveTo(k.cf,-hw*.82);g.lineTo(k.rf,-hw*.9);g.lineTo(k.rf,hw*.9);g.lineTo(k.cf,hw*.82);g.closePath();g.fill();
    g.strokeStyle='rgba(0,0,0,.22)';g.lineWidth=.05;for(let x=-2.3;x<1.0;x+=.62){g.beginPath();g.moveTo(x,-hw*.88);g.lineTo(x,hw*.88);g.stroke()}
    g.fillStyle='rgba(255,255,255,.14)';rr(g,-2.5,-hw*.5,3.5,hw*.35,.2);g.fill();
    if(o.courier){g.fillStyle='#ffa63d';rr(g,-.2,-.35,.7,.7,.12);g.fill();g.fillStyle='#e07a10';g.fillRect(-hl+.1,-hw+.18,L-.5,.1);g.fillRect(-hl+.1,hw-.28,L-.5,.1)}
  }else{
    g.fillStyle='rgba(255,255,255,.12)';rr(g,k.cf,-hw*.7,hl-.25-k.cf,hw*.32,.3);g.fill();
    if(kind==='hyper'){g.fillStyle='rgba(0,0,0,.55)';rr(g,-hl+.3,-.16,L-.8,.32,.1);g.fill();g.strokeStyle='rgba(255,255,255,.5)';g.lineWidth=.05;g.beginPath();g.moveTo(-.9,-hw*.82);g.quadraticCurveTo(-.2,0,-.9,hw*.82);g.stroke()}
    g.fillStyle=glassG(g,k.rf,k.cf);g.beginPath();g.moveTo(k.cf,-hw*.84);g.lineTo(k.rf,-hw*.76);g.lineTo(k.rf,hw*.76);g.lineTo(k.cf,hw*.84);g.closePath();g.fill();
    const rg=g.createLinearGradient(k.cr,0,k.rr,0);rg.addColorStop(0,'#0b121c');rg.addColorStop(1,'#2a3e57');
    g.fillStyle=rg;g.beginPath();g.moveTo(k.rr,-hw*.76);g.lineTo(k.cr,-hw*.82);g.lineTo(k.cr,hw*.82);g.lineTo(k.rr,hw*.76);g.closePath();g.fill();
    const roofC=cop?0x25272b:base;
    const rg2=g.createLinearGradient(0,-hw*.78,0,hw*.78);rg2.addColorStop(0,shade(roofC,.8));rg2.addColorStop(.5,shade(roofC,1.25));rg2.addColorStop(1,shade(roofC,.8));
    g.fillStyle=rg2;rr(g,k.rr,-hw*.8,k.rf-k.rr,hw*1.6,k.rad*.5);g.fill();
    g.strokeStyle='rgba(8,12,20,.85)';g.lineWidth=.07;g.beginPath();g.moveTo(k.rr,-hw*.8);g.lineTo(k.rf,-hw*.8);g.moveTo(k.rr,hw*.8);g.lineTo(k.rf,hw*.8);g.stroke();
    if(kind==='wagon'||kind==='suv'){g.strokeStyle='rgba(215,220,226,.9)';g.lineWidth=.07;g.beginPath();g.moveTo(k.rr+.1,-hw*.55);g.lineTo(k.rf-.1,-hw*.55);g.moveTo(k.rr+.1,hw*.55);g.lineTo(k.rf-.1,hw*.55);g.stroke()}
    if(kind==='suv'){el(g,-hl-.2,0,.5,.5,'#101012');el(g,-hl-.2,0,.3,.3,'#2a2a2e');g.fillStyle='rgba(255,255,255,.1)';g.fillRect(k.rr,-.2,k.rf-k.rr,.4)}
    if(cop){g.fillStyle='#14161a';g.fillRect(k.cf,-.2,hl-k.cf-.2,.4);g.fillRect(-hl+.2,-.2,hl-.2+k.cr,.4);g.fillStyle='#0d0e10';rr(g,-.35,-hw*.62,.7,hw*1.24,.1);g.fill()}
  }
  g.fillStyle='#fff6d6';rr(g,hl-.2,-hw*.82,.2,.46,.06);g.fill();rr(g,hl-.2,hw*.82-.46,.2,.46,.06);g.fill();
  g.fillStyle='#b01414';rr(g,-hl,-hw*.84,.12,.5,.04);g.fill();rr(g,-hl,hw*.84-.5,.12,.5,.04);g.fill();
  g.fillStyle=shade(base,.85);rr(g,(kind==='van'?k.cf:k.cf)-.35,-hw-.12,.28,.16,.05);g.fill();rr(g,k.cf-.35,hw-.04,.28,.16,.05);g.fill();
}
function paintBus(g,col){
  const L=11,W=2.55,hw=W/2,hl=L/2;
  g.fillStyle='#09090b';for(const x of [3.6,-3.4])for(const sy of [-1,1]){rr(g,x-.55,sy>0?hw-.22:-hw-.1,1.1,.32,.1);g.fill()}
  const bg=g.createLinearGradient(0,-hw,0,hw);bg.addColorStop(0,shade(col,.65));bg.addColorStop(.25,shade(col,1));bg.addColorStop(.5,shade(col,1.2));bg.addColorStop(.75,shade(col,1));bg.addColorStop(1,shade(col,.65));
  g.fillStyle=bg;rr(g,-hl,-hw,L,W,.45);g.fill();g.strokeStyle='rgba(0,0,0,.55)';g.lineWidth=.06;g.stroke();
  g.fillStyle='#e9e6dc';rr(g,-hl+.3,-hw*.72,L-.9,hw*1.44,.3);g.fill();
  g.fillStyle='#9aa0a6';rr(g,-1.6,-.55,1.5,1.1,.12);g.fill();rr(g,1.2,-.45,1.1,.9,.12);g.fill();
  g.fillStyle='rgba(30,40,55,.9)';g.fillRect(-hl+.4,-hw+.05,L-1.2,.18);g.fillRect(-hl+.4,hw-.23,L-1.2,.18);
  g.fillStyle=glassG(g,hl,hl-.5);g.fillRect(hl-.45,-hw*.8,.4,hw*1.6);
  g.fillStyle='#fff6d6';rr(g,hl-.12,-hw*.85,.12,.4,.04);g.fill();rr(g,hl-.12,hw*.85-.4,.12,.4,.04);g.fill();
  g.fillStyle='#b01414';rr(g,-hl,-hw*.85,.12,.4,.04);g.fill();rr(g,-hl,hw*.85-.4,.12,.4,.04);g.fill();
}
function paintTruck(g,col){
  const L=9.3,W=2.5,hw=W/2;
  g.fillStyle='#09090b';
  for(const x of [3.3,-1.6,-3.3])for(const sy of [-1,1]){rr(g,x-.55,sy>0?hw-.25:-hw-.1,1.1,.35,.1);g.fill()}
  g.fillStyle='#202226';g.fillRect(-4,-.8,7.4,1.6);
  const bg=g.createLinearGradient(0,-hw,0,hw);bg.addColorStop(0,'#9a9ea4');bg.addColorStop(.3,'#e9eaec');bg.addColorStop(.6,'#f6f6f7');bg.addColorStop(1,'#9a9ea4');
  g.fillStyle=bg;rr(g,-4.65,-hw,7.3,W,.18);g.fill();g.strokeStyle='rgba(0,0,0,.5)';g.lineWidth=.06;g.stroke();
  g.strokeStyle='rgba(0,0,0,.18)';g.lineWidth=.05;for(let x=-4.2;x<2.5;x+=.9){g.beginPath();g.moveTo(x,-hw+.1);g.lineTo(x,hw-.1);g.stroke()}
  g.fillStyle='#e07a10';g.fillRect(-4.5,-.18,7.0,.36);g.fillRect(2.3,-hw+.05,.3,W-.1);
  const cg=g.createLinearGradient(0,-hw,0,hw);cg.addColorStop(0,shade(col,.6));cg.addColorStop(.5,shade(col,1.2));cg.addColorStop(1,shade(col,.6));
  g.fillStyle=cg;g.beginPath();g.moveTo(2.85,-hw+.1);g.lineTo(4.15,-hw+.1);g.quadraticCurveTo(4.7,-hw+.1,4.7,-hw+.6);g.lineTo(4.7,hw-.6);g.quadraticCurveTo(4.7,hw-.1,4.15,hw-.1);g.lineTo(2.85,hw-.1);g.closePath();g.fill();
  g.strokeStyle='rgba(0,0,0,.5)';g.lineWidth=.06;g.stroke();
  g.fillStyle=glassG(g,4.5,3.8);g.beginPath();g.moveTo(4.4,-hw*.8);g.lineTo(3.8,-hw*.86);g.lineTo(3.8,hw*.86);g.lineTo(4.4,hw*.8);g.closePath();g.fill();
  g.fillStyle=shade(col,1.3);rr(g,3.0,-hw*.78,.75,W*.78,.15);g.fill();
  g.fillStyle='#fff6d6';rr(g,4.55,-hw*.78,.15,.4,.05);g.fill();rr(g,4.55,hw*.78-.4,.15,.4,.05);g.fill();
  g.fillStyle='#b01414';rr(g,-4.65,-hw*.85,.12,.45,.04);g.fill();rr(g,-4.65,hw*.85-.45,.12,.45,.04);g.fill();
}
function paintScooter(g,col){
  g.fillStyle='#09090b';rr(g,-1.0,-.1,.5,.2,.08);g.fill();rr(g,.68,-.1,.5,.2,.08);g.fill();
  g.fillStyle=shade(col,1);rr(g,-.8,-.32,1.5,.64,.22);g.fill();g.strokeStyle='rgba(0,0,0,.5)';g.lineWidth=.05;g.stroke();
  g.fillStyle='#17171a';rr(g,-.75,-.2,.8,.4,.14);g.fill();
  g.fillStyle=shade(col,1.2);rr(g,.2,-.18,.45,.36,.1);g.fill();
  g.strokeStyle='#d8dbe0';g.lineWidth=.08;g.beginPath();g.moveTo(.62,-.42);g.lineTo(.62,.42);g.stroke();
  g.fillStyle='#fff6d6';rr(g,.72,-.1,.1,.2,.04);g.fill();
  g.strokeStyle='#5a6b4a';g.lineWidth=.15;g.lineCap='round';g.beginPath();g.moveTo(-.05,-.22);g.lineTo(.6,-.4);g.moveTo(-.05,.22);g.lineTo(.6,.4);g.stroke();
  el(g,-.08,0,.22,.3,'#5a6b4a');el(g,.6,-.4,.06,.06,'#d7a67f');el(g,.6,.4,.06,.06,'#d7a67f');
  el(g,.05,0,.17,.17,'#d04a2a');el(g,.12,0,.08,.14,'#1a1a1c');
  g.lineCap='butt';
}
function paintBike(g,col,ped){
  // roues
  g.fillStyle='#0b0b0d';rr(g,.42,-.07,.62,.14,.07);g.fill();rr(g,-1.02,-.07,.62,.14,.07);g.fill();
  g.strokeStyle='#8a8f96';g.lineWidth=.03;g.beginPath();g.moveTo(.45,0);g.lineTo(1.01,0);g.moveTo(-.99,0);g.lineTo(-.43,0);g.stroke();
  // cadre
  g.strokeStyle=shade(col,1.15);g.lineWidth=.11;g.lineCap='round';g.beginPath();g.moveTo(-.72,0);g.lineTo(.72,0);g.stroke();
  g.strokeStyle=shade(col,.75);g.lineWidth=.06;g.beginPath();g.moveTo(-.72,0);g.lineTo(-.15,0);g.stroke();
  // guidon
  g.strokeStyle='#2a2a2e';g.lineWidth=.07;g.beginPath();g.moveTo(.58,-.36);g.lineTo(.58,.36);g.stroke();
  // cycliste : jambes (pédalage), bras, dos, tête
  const pa=Math.sin(ped||0)*.16;
  g.strokeStyle='#3d5a88';g.lineWidth=.14;g.beginPath();g.moveTo(-.2,-.13);g.lineTo(.1+pa,-.16);g.moveTo(-.2,.13);g.lineTo(.1-pa,.16);g.stroke();
  g.strokeStyle='#5a6b4a';g.lineWidth=.12;g.beginPath();g.moveTo(-.1,-.2);g.lineTo(.56,-.34);g.moveTo(-.1,.2);g.lineTo(.56,.34);g.stroke();
  el(g,-.15,0,.24,.26,'#5a6b4a');
  el(g,.56,-.34,.05,.05,'#d7a67f');el(g,.56,.34,.05,.05,'#d7a67f');
  el(g,.06,0,.15,.15,'#d04a2a');el(g,.12,0,.07,.12,'#1a1a1c');
  g.lineCap='butt';
}
const SPR=new Map();
function getSpr(s){
  const key=s.k+'|'+s.c+'|'+(s.cop?1:0)+(s.courier?1:0);
  let r=SPR.get(key);if(r)return r;
  let L=4.9,W=2;if(s.k==='truck'){L=9.3;W=2.5}else if(s.k==='bus'){L=11;W=2.55}else if(s.k==='scooter'){L=1.9;W=.9}else{L=CS[s.k].L;W=CS[s.k].W}
  const cw=Math.ceil((L+1.4)*PPM),ch=Math.ceil((W+1.0)*PPM),c=document.createElement('canvas');c.width=cw;c.height=ch;
  const g=c.getContext('2d');g.setTransform(PPM,0,0,PPM,cw/2,ch/2);
  if(s.k==='bus')paintBus(g,s.c);else if(s.k==='truck')paintTruck(g,s.c);else if(s.k==='scooter')paintScooter(g,s.c);else paintCar(g,s.k,s.c,s);
  r={cv:c,cw,ch,L,W};SPR.set(key,r);return r;
}

/* ---------- personnages (vue de dessus, dessinés à chaque image) ---------- */
/* repère local : +x = devant, +y = à droite. mode : undefined (marche/course/arrêt), 'sit' (assis), 'chat' (discute), 'ko' (allongé) ; punch 0..1 = coup de poing */
const PLAYER_LOOK={skin:0xd7a67f,shirt:0x5a6b4a,pants:0x3d5a88,shoe:0xf1f1f1,hair:0x16110e,cap:0xd04a2a,bag:1};
const SKINS=[0xe3b895,0xc99068,0x8d5b3e,0xf0c8a5,0x6e4630],SHIRTS=[0x8c3030,0x2f5f8c,0xd8d2c4,0x3a6b4a,0x222222,0xc9962b,0x6a3f8c],PANTS=[0x2b3550,0x1d1d20,0x4a4036,0x3a4a5a];
const randLook=()=>({skin:pick(SKINS),shirt:pick(SHIRTS),pants:pick(PANTS),shoe:pick([0xf1f1f1,0x222222,0xb5452a]),hair:pick([0x16110e,0x3a2a1c,0x8a6a3a,0x111111]),cap:Math.random()<.35?pick([0xd04a2a,0x2a5ca8,0x222222]):0,bag:Math.random()<.3?1:0,long:Math.random()<.35?1:0});
const HS=2.7,VS=1.3;
function lookStyle(L){
  if(!L.s)L.s={skin:hex2(L.skin),skinD:shade(L.skin,.78),shirt:hex2(L.shirt),shirtL:shade(L.shirt,1.28),shirtD:shade(L.shirt,.68),pants:hex2(L.pants),pantsD:shade(L.pants,.7),shoe:hex2(L.shoe),
    hair:hex2(L.hair),hairL:shade(L.hair||0x222222,1.6),cap:L.cap?hex2(L.cap):0,capD:L.cap?shade(L.cap,.68):0,capL:L.cap?shade(L.cap,1.25):0};
  return L.s;
}
/* membre : segment arrondi d'un point à un autre */
function limb(g,x0,y0,x1,y1,w,c){g.strokeStyle=c;g.lineWidth=w;g.beginPath();g.moveTo(x0,y0);g.lineTo(x1,y1);g.stroke()}
function drawHuman(x,z,th,L,ph,sp,sc,mode,punch){
  if(!inView(x,z,5))return;
  const S=lookStyle(L);
  ctx.save();
  ctx.lineCap='round';
  // ombre portée
  ctx.fillStyle=`rgba(0,0,0,${TOD.sa*.85})`;ctx.beginPath();
  if(mode==='ko')ctx.ellipse(x+TOD.sx*.4,z+TOD.sz*.4,.85*sc,.42*sc,Math.PI/2-th,0,6.3);
  else ctx.ellipse(x+TOD.sx*.4*sc,z+TOD.sz*.4*sc,.42*sc,.32*sc,Math.PI/2-th,0,6.3);
  ctx.fill();
  ctx.translate(x,z);ctx.rotate(Math.PI/2-th);ctx.scale(sc,sc);
  if(mode==='ko'){
    // allongé sur le dos : tête vers l'avant, bras écartés
    limb(ctx,-.05,-.12,-.62,-.17,.13,S.pants);limb(ctx,-.05,.12,-.6,.24,.13,S.pants);
    el(ctx,-.68,-.17,.08,.07,S.shoe);el(ctx,-.66,.25,.08,.07,S.shoe);
    limb(ctx,.3,-.2,.42,-.52,.09,S.shirtD);limb(ctx,.3,.2,.12,.5,.09,S.shirtD);
    el(ctx,.44,-.56,.05,.05,S.skin);el(ctx,.1,.54,.05,.05,S.skin);
    ctx.fillStyle=S.shirt;rr(ctx,-.08,-.22,.46,.44,.14);ctx.fill();
    el(ctx,.14,-.06,.12,.08,S.shirtL);
    el(ctx,.5,0,.13,.12,S.skin);el(ctx,.55,0,.1,.12,S.hair);
    ctx.restore();return;
  }
  const walk=mode==='sit'?0:Math.min(1,sp/2.6),run=clamp((sp-4.5)/4,0,1),sw=Math.sin(ph)*walk*(1+run*.5);
  // jambes et chaussures
  if(mode==='sit'){
    limb(ctx,0,-.11,.38,-.12,.15,S.pants);limb(ctx,0,.11,.38,.12,.15,S.pants);
    el(ctx,.47,-.12,.09,.07,S.shoe);el(ctx,.47,.12,.09,.07,S.shoe);
  }else{
    const lA=sw*.36,lB=-sw*.36;
    limb(ctx,0,-.11,lA,-.12,.15,S.pantsD);limb(ctx,0,.11,lB,.12,.15,S.pantsD);
    el(ctx,lA+.08,-.12,.1,.065,S.shoe);el(ctx,lB+.08,.12,.1,.065,S.shoe);
  }
  // bras : épaule → coude → main (balancement opposé aux jambes, coup de poing à droite)
  const pk=punch>0?Math.sin(Math.min(1,punch)*Math.PI):0;
  const arm=(sy,swing,ext)=>{const ex=swing*.28+ext*.18,ey=sy*(.31-ext*.08),hx=swing*.5+ext*.62,hy=sy*(.3-ext*.2);
    limb(ctx,0,sy*.27,ex,ey,.12,S.shirtD);limb(ctx,ex,ey,hx,hy,.1,S.shirt);el(ctx,hx+.03,hy,.06,.06,S.skin);return [hx,hy]};
  if(mode==='sit'){arm(-1,.2,0);arm(1,.2,0)}
  else if(mode==='chat'){arm(-1,-sw*.6,0);const g=.3+.25*Math.sin(performance.now()/260+x);arm(1,g,.3)}
  else{arm(-1,-sw*.7+pk*.2,0);arm(1,sw*.7*(1-pk),pk*1.6)}
  // sac à dos
  if(L.bag){ctx.fillStyle='#3c4a2c';rr(ctx,-.38,-.17,.2,.34,.07);ctx.fill();ctx.fillStyle='#2c3820';ctx.fillRect(-.24,-.17,.04,.34)}
  // buste : épaules larges, ombré
  ctx.fillStyle=S.shirtD;ctx.beginPath();ctx.ellipse(-.02,0,.18,.33,0,0,6.3);ctx.fill();
  ctx.fillStyle=S.shirt;ctx.beginPath();ctx.ellipse(.01,0,.15,.3,0,0,6.3);ctx.fill();
  el(ctx,.06,-.09,.07,.15,S.shirtL);
  ctx.fillStyle=S.shirtD;ctx.fillRect(.1,-.04,.05,.08); // col
  // tête : cou, oreilles, visage, nez, cheveux ou casquette
  el(ctx,.04,0,.06,.07,S.skinD);
  el(ctx,.04,-.135,.03,.035,S.skinD);el(ctx,.04,.135,.03,.035,S.skinD);
  el(ctx,.05,0,.13,.13,S.skin);
  el(ctx,.17,0,.035,.025,S.skinD);
  if(S.cap){el(ctx,.01,0,.14,.145,S.cap);el(ctx,-.01,-.04,.06,.07,S.capL);ctx.fillStyle=S.capD;rr(ctx,.1,-.11,.17,.22,.08);ctx.fill()}
  else{el(ctx,-.02,0,.13,.14,S.hair);el(ctx,.06,0,.07,.12,S.hair);el(ctx,-.03,-.05,.05,.06,S.hairL);
    if(L.long){el(ctx,-.12,0,.08,.15,S.hair)}}
  ctx.restore();
}

/* ---------- immeubles : murs en perspective, fenêtres, toits ---------- */
const KP=.0028,HC=70;
function poly(a,b,c,d,e,f,g,h){ctx.beginPath();ctx.moveTo(a,b);ctx.lineTo(c,d);ctx.lineTo(e,f);ctx.lineTo(g,h);ctx.closePath();ctx.fill()}
function box(x0,z0,x1,z1,h0,h1,S,o){
  const cx=RC.x,cz=RC.z,f0=1+Math.min(h0,HC)*KP,f1=1+Math.min(h1,HC)*KP;
  const ax0=cx+(x0-cx)*f0,ax1=cx+(x1-cx)*f0,az0=cz+(z0-cz)*f0,az1=cz+(z1-cz)*f0;
  const bx0=cx+(x0-cx)*f1,bx1=cx+(x1-cx)*f1,bz0=cz+(z0-cz)*f1,bz1=cz+(z1-cz)*f1;
  const faces=[];
  if(cx<x0){ctx.fillStyle=S.W;poly(ax0,az0,ax0,az1,bx0,bz1,bx0,bz0);faces.push(0)}
  if(cx>x1){ctx.fillStyle=S.E;poly(ax1,az0,ax1,az1,bx1,bz1,bx1,bz0);faces.push(1)}
  if(cz<z0){ctx.fillStyle=S.N;poly(ax0,az0,ax1,az0,bx1,bz0,bx0,bz0);faces.push(2)}
  if(cz>z1){ctx.fillStyle=S.S;poly(ax0,az1,ax1,az1,bx1,bz1,bx0,bz1);faces.push(3)}
  if(o&&o.win&&faces.length){
    const nF=Math.min(Math.floor((h1-h0)/3.5),20);
    if(nF>=1){
      for(const fc of faces){
        const th=fc<2?Math.abs(bx0-ax0):Math.abs(bz0-az0);
        if(th*CAM.zoom<5)continue;
        const lw=clamp(th/nF*.55,.12,1.5);
        const seg=(t,out)=>{
          const lx0=ax0+(bx0-ax0)*t,lx1=ax1+(bx1-ax1)*t,lz0=az0+(bz0-az0)*t,lz1=az1+(bz1-az1)*t;
          if(fc===0)out(lx0,lz0,lx0,lz1);else if(fc===1)out(lx1,lz0,lx1,lz1);else if(fc===2)out(lx0,lz0,lz0===0?lx1:lx1,lz0);else out(lx0,lz1,lx1,lz1);
        };
        ctx.lineWidth=lw;ctx.setLineDash([1.7,1.3]);ctx.lineDashOffset=0;ctx.strokeStyle='rgba(18,28,46,.82)';ctx.beginPath();
        for(let f=0;f<nF;f++)seg((f+.5)/nF,(a,b,c,d)=>{ctx.moveTo(a,b);ctx.lineTo(c,d)});
        ctx.stroke();
        if(TOD.n>.25){
          ctx.setLineDash(o.litD);ctx.strokeStyle=`rgba(255,${200+((o.seed*3)|0)%40},120,${clamp(TOD.n*1.3,0,.95)})`;
          for(let ph=0;ph<3;ph++){ctx.lineDashOffset=ph*1.9+o.offs;ctx.beginPath();for(let f=ph;f<nF;f+=3)seg((f+.5)/nF,(a,b,c,d)=>{ctx.moveTo(a,b);ctx.lineTo(c,d)});ctx.stroke()}
        }
        ctx.setLineDash([]);
      }
    }
  }
  ctx.fillStyle=S.R;ctx.fillRect(bx0,bz0,bx1-bx0,bz1-bz0);
  if(o&&o.tex&&PAT.roof){ctx.globalAlpha=.16;ctx.fillStyle=PAT.roof;ctx.fillRect(bx0,bz0,bx1-bx0,bz1-bz0);ctx.globalAlpha=1}
  if(o&&o.rim){ctx.strokeStyle=S.L;ctx.lineWidth=.55;ctx.strokeRect(bx0+.3,bz0+.3,bx1-bx0-.6,bz1-bz0-.6)}
  return [bx0,bz0,bx1,bz1];
}
/* immeubles par quartier : maisons à toit à deux pans (Jardins), toits mansardés en zinc (Vieux Centre), tours vitrées (Tours), hangars en tôle (Port) */
const ROOFC=['#9a4a32','#7a3a2a','#8a5a3a','#5a5f66','#a0563a'];
function roofLines(x0,z0,x1,z1,along,step,col,w){
  ctx.strokeStyle=col;ctx.lineWidth=w;ctx.beginPath();
  if(along==='x')for(let z=z0+step;z<z1-step*.3;z+=step){ctx.moveTo(x0,z);ctx.lineTo(x1,z)}
  else for(let x=x0+step;x<x1-step*.3;x+=step){ctx.moveTo(x,z0);ctx.lineTo(x,z1)}
  ctx.stroke();
}
function drawBld(b){
  const k=b.dk||(b.dk=b.bank?'bank':districtAt((b.x0+b.x1)/2,(b.z0+b.z1)/2).key);
  const o={win:true,tex:k!=='cite',rim:k==='tours'||k==='bank',litD:b.litD,offs:b.offs,seed:b.off*7+b.offs};
  const r=box(b.x0,b.z0,b.x1,b.z1,0,b.h,b.st,o);
  const w=r[2]-r[0],h=r[3]-r[1];
  let top=b.h;
  if(k==='cite'&&!b.tier){
    // toit à deux pans, faîtage dans le sens de la longueur, avec débord
    const rc=b.rc||(b.rc=ROOFC[(b.off*3+Math.floor(b.offs))%ROOFC.length]),hx=w>=h,ov=.5;
    const x0=r[0]-ov,z0=r[1]-ov,x1=r[2]+ov,z1=r[3]+ov,mx=(x0+x1)/2,mz=(z0+z1)/2;
    const lit=hx?(TOD.sz<0?1:0):(TOD.sx<0?1:0);
    ctx.fillStyle=lit?shade(hexn(rc),1.15):shade(hexn(rc),.78);
    if(hx)ctx.fillRect(x0,z0,x1-x0,mz-z0);else ctx.fillRect(x0,z0,mx-x0,z1-z0);
    ctx.fillStyle=lit?shade(hexn(rc),.78):shade(hexn(rc),1.15);
    if(hx)ctx.fillRect(x0,mz,x1-x0,z1-mz);else ctx.fillRect(mx,z0,x1-mx,z1-z0);
    roofLines(x0,z0,x1,z1,hx?'x':'z',.7,'rgba(30,14,8,.28)',.12);
    ctx.strokeStyle='rgba(40,20,12,.75)';ctx.lineWidth=.35;ctx.beginPath();if(hx){ctx.moveTo(x0,mz);ctx.lineTo(x1,mz)}else{ctx.moveTo(mx,z0);ctx.lineTo(mx,z1)}ctx.stroke();
    ctx.strokeStyle='rgba(0,0,0,.35)';ctx.lineWidth=.15;ctx.strokeRect(x0,z0,x1-x0,z1-z0);
    // cheminée
    const cx=hx?x0+(x1-x0)*.72:mx+1,cz=hx?mz-1:z0+(z1-z0)*.3;
    ctx.fillStyle='#6a5a52';ctx.fillRect(cx-.5,cz-.5,1,1);ctx.fillStyle='#2a2220';ctx.fillRect(cx-.3,cz-.3,.6,.6);
    // velux
    if(b.off%2===0){ctx.fillStyle='rgba(60,90,120,.85)';const vx=hx?x0+(x1-x0)*.3:mx-2.2,vz=hx?mz-2.2:z0+(z1-z0)*.6;ctx.fillRect(vx,vz,1.2,1.4);ctx.strokeStyle='#ddd';ctx.lineWidth=.12;ctx.strokeRect(vx,vz,1.2,1.4)}
    return;
  }
  if(k==='vieux'&&!b.tier){
    // toit mansardé : bande de zinc avec lucarnes, terrasson clair au centre, souches de cheminées
    const m=Math.min(2.6,w*.22,h*.22);
    ctx.fillStyle='#5f6870';ctx.fillRect(r[0],r[1],w,h);
    ctx.fillStyle='#8a939a';ctx.fillRect(r[0]+m,r[1]+m,w-2*m,h-2*m);
    roofLines(r[0],r[1],r[2],r[3],'z',.55,'rgba(20,24,28,.25)',.08);
    ctx.fillStyle='#e6dccb';
    for(let x=r[0]+m+1;x<r[2]-m-1;x+=3.2){ctx.fillRect(x,r[1]+.35,1.1,m-.7);ctx.fillRect(x,r[3]-m+.35,1.1,m-.7)}
    for(let z=r[1]+m+1;z<r[3]-m-1;z+=3.2){ctx.fillRect(r[0]+.35,z,m-.7,1.1);ctx.fillRect(r[2]-m+.35,z,m-.7,1.1)}
    if(TOD.n>.3){ctx.fillStyle=`rgba(255,210,130,${clamp(TOD.n,0,.8)})`;for(let x=r[0]+m+1;x<r[2]-m-1;x+=6.4)ctx.fillRect(x+.2,r[1]+.55,.7,m-1.1)}
    ctx.fillStyle='#a0563a';for(const f of [.25,.7]){const cx=r[0]+w*f,cz=r[1]+h*.5;ctx.fillRect(cx-.9,cz-.45,1.8,.9);ctx.fillStyle='#3a2a22';for(let i=0;i<3;i++)ctx.fillRect(cx-.7+i*.55,cz-.2,.35,.4);ctx.fillStyle='#a0563a'}
    ctx.strokeStyle='rgba(30,30,36,.6)';ctx.lineWidth=.25;ctx.strokeRect(r[0],r[1],w,h);
    for(const p of b.props)box(p.x0,p.z0,p.x1,p.z1,b.h,b.h+p.h,p.st,null);
    return;
  }
  if(k==='port'&&!b.tier){
    // hangar : tôle ondulée, puits de lumière
    roofLines(r[0],r[1],r[2],r[3],w>=h?'z':'x',.45,'rgba(0,0,0,.22)',.1);
    ctx.fillStyle='rgba(190,225,240,.55)';
    if(w>=h)for(let x=r[0]+3;x<r[2]-3;x+=6)ctx.fillRect(x,r[1]+h*.3,1.4,h*.4);else for(let z=r[1]+3;z<r[3]-3;z+=6)ctx.fillRect(r[0]+w*.3,z,w*.4,1.4);
    for(const p of b.props)box(p.x0,p.z0,p.x1,p.z1,b.h,b.h+p.h,p.st,null);
    return;
  }
  if(b.tier){const t=b.tier;const r2=box(t.x0,t.z0,t.x1,t.z1,b.h,b.h+t.h,b.st,{win:true,tex:true,rim:true,litD:b.litD,offs:b.offs,seed:b.off});top=b.h+t.h;
    // reflets sur le toit vitré, hélisurface sur les plus hautes
    if(top>85&&b.off===0){const cx=(r2[0]+r2[2])/2,cz=(r2[1]+r2[3])/2,rad=Math.min(r2[2]-r2[0],r2[3]-r2[1])*.3;ctx.strokeStyle='#e0b020';ctx.lineWidth=.5;ctx.beginPath();ctx.arc(cx,cz,rad,0,6.3);ctx.stroke();
      ctx.font=`700 ${rad*1.1}px "Bowlby One",Impact,sans-serif`;ctx.textAlign='center';ctx.fillStyle='#e0b020';ctx.fillText('H',cx,cz+rad*.4)}}
  else for(const p of b.props)box(p.x0,p.z0,p.x1,p.z1,b.h,b.h+p.h,p.st,null);
  if(k==='tours'){const g=ctx.createLinearGradient(r[0],r[1],r[2],r[3]);g.addColorStop(0,'rgba(255,255,255,.14)');g.addColorStop(.5,'rgba(255,255,255,0)');g.addColorStop(1,'rgba(120,160,220,.12)');ctx.fillStyle=g;ctx.fillRect(r[0],r[1],w,h)}
  if(b.bank){
    ctx.fillStyle='#d9cfb6';ctx.beginPath();ctx.moveTo(r[0]+2,r[1]+h*.5);ctx.lineTo((r[0]+r[2])/2,r[1]+2);ctx.lineTo(r[2]-2,r[1]+h*.5);ctx.lineTo((r[0]+r[2])/2,r[3]-2);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#b8ab8a';ctx.lineWidth=.4;ctx.stroke();
    ctx.font='700 4.6px "Bowlby One",Impact,sans-serif';ctx.textAlign='center';ctx.fillStyle='#8a6d1c';ctx.fillText('BANQUE',(r[0]+r[2])/2,(r[1]+r[3])/2+1.6);
    ctx.fillStyle='#d9b020';ctx.beginPath();ctx.arc((r[0]+r[2])/2,(r[1]+r[3])/2-4.2,1.6,0,6.3);ctx.fill()}
  if(b.tier){const t=b.tier,tw=(t.x1-t.x0)*.2;box(t.x0+tw*.5,t.z0+tw*.5,t.x0+tw*1.5,t.z0+tw*1.5,top,top+2,sty(0x777b82),null);
    if(TOD.n>.3&&Math.floor(performance.now()/700)%2){const f=1+Math.min(top+2,HC)*KP;const px=RC.x+(t.x0+tw-RC.x)*f,pz=RC.z+(t.z0+tw-RC.z)*f;ctx.fillStyle='#ff3a2a';ctx.beginPath();ctx.arc(px,pz,.7,0,6.3);ctx.fill()}}
}
function shadowPoly(x0,z0,x1,z1,h){
  const sx=TOD.sx*Math.min(h,60),sz=TOD.sz*Math.min(h,60);
  if(Math.abs(sx)+Math.abs(sz)<.3)return;
  const pts=[[x0,z0],[x1,z0],[x1,z1],[x0,z1],[x0+sx,z0+sz],[x1+sx,z0+sz],[x1+sx,z1+sz],[x0+sx,z1+sz]];
  pts.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
  const lo=[],up=[];
  for(const p of pts){while(lo.length>=2&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p)}
  for(let i=pts.length-1;i>=0;i--){const p=pts[i];while(up.length>=2&&cr(up[up.length-2],up[up.length-1],p)<=0)up.pop();up.push(p)}
  lo.pop();up.pop();const hull=lo.concat(up);
  ctx.beginPath();ctx.moveTo(hull[0][0],hull[0][1]);for(let i=1;i<hull.length;i++)ctx.lineTo(hull[i][0],hull[i][1]);ctx.closePath();ctx.fill();
}
function drawTree(t){
  const f=1+6*KP,x=RC.x+(t.x-RC.x)*f,z=RC.z+(t.z-RC.z)*f,r=3.4*t.s;
  if(!inView(x,z,r+2))return;
  ctx.fillStyle=`rgba(0,0,0,${TOD.sa*.75})`;ctx.beginPath();ctx.arc(t.x+TOD.sx*5,t.z+TOD.sz*5,r*.95,0,6.3);ctx.fill();
  ctx.fillStyle=shade(t.c,.62);ctx.beginPath();ctx.arc(x,z,r,0,6.3);ctx.fill();
  ctx.fillStyle=shade(t.c,.9);ctx.beginPath();ctx.arc(x-r*.12,z-r*.12,r*.78,0,6.3);ctx.fill();
  ctx.fillStyle=shade(t.c,1.22);ctx.beginPath();ctx.arc(x-r*.3,z-r*.3,r*.42,0,6.3);ctx.fill();
}

/* ---------- effets : particules, traces de pneus, textes flottants, pluie ---------- */
const PT=[],SKID=[],FL=[],RAIN=[];
for(let i=0;i<150;i++)RAIN.push({x:Math.random(),y:Math.random(),s:R(.8,1.4)});
const puff=(x,z,vx,vz,r,life,a)=>{if(PT.length<520)PT.push({k:0,x,z,vx,vz,r,l:life,m:life,a:a||.5})};
function sparks(x,z,n,pow){for(let i=0;i<n;i++){const a=R(0,6.28),s=R(4,(pow||12));if(PT.length<520)PT.push({k:1,x,z,vx:Math.cos(a)*s,vz:Math.sin(a)*s,r:0,l:R(.15,.4),m:.4,a:1})}}
function coins(x,z,n){for(let i=0;i<n;i++){const a=R(0,6.28),s=R(5,13);if(PT.length<520)PT.push({k:2,x,z,vx:Math.cos(a)*s,vz:Math.sin(a)*s,r:.45,l:R(.5,.9),m:.9,a:1})}}
const floater=(x,z,txt,col,big)=>{if(FL.length<14)FL.push({x,z,txt,col,t:0,big})};
function updFx(dt){
  {const slot=Math.floor(Date.now()/90000),f=Math.sin(slot*12.9898)*43758.5453;WX.target=(f-Math.floor(f))<.3?1:0} // météo partagée
  WX.lvl+=(WX.target-WX.lvl)*Math.min(1,dt*.35);
  for(let i=PT.length-1;i>=0;i--){const p=PT[i];p.l-=dt;if(p.l<=0){PT.splice(i,1);continue}
    const d=Math.exp(-(p.k===0?2.2:p.k===2?3:1.5)*dt);p.vx*=d;p.vz*=d;p.x+=p.vx*dt;p.z+=p.vz*dt}
  for(let i=SKID.length-1;i>=0;i--){SKID[i].t+=dt;if(SKID[i].t>28)SKID.splice(i,1)}
  for(let i=FL.length-1;i>=0;i--){FL[i].t+=dt;if(FL[i].t>1.6)FL.splice(i,1)}
  CAM.shake=Math.max(0,CAM.shake-dt*22);
  for(const r of RAIN){r.y+=dt*1.5*r.s;r.x-=dt*.25*r.s;if(r.y>1){r.y-=1;r.x=Math.random()}if(r.x<0)r.x+=1}
}
function drawFx(){
  ctx.lineCap='round';
  ctx.lineWidth=.38;
  for(const s of SKID){if(s.x1<VB.x0-4||s.x1>VB.x1+4||s.z1<VB.z0-4||s.z1>VB.z1+4)continue;ctx.strokeStyle=`rgba(8,8,8,${(.55*(1-s.t/28)).toFixed(3)})`;ctx.beginPath();ctx.moveTo(s.x1,s.z1);ctx.lineTo(s.x2,s.z2);ctx.stroke()}
}
function drawParticles(){
  for(const p of PT){
    if(!inView(p.x,p.z,3))continue;
    const f=p.l/p.m;
    if(p.k===0){ctx.fillStyle=`rgba(225,225,225,${(p.a*f*.7).toFixed(3)})`;ctx.beginPath();ctx.arc(p.x,p.z,p.r*(1+(1-f)*1.8),0,6.3);ctx.fill()}
    else if(p.k===1){ctx.strokeStyle=`rgba(255,${180+60*f|0},90,${f.toFixed(2)})`;ctx.lineWidth=.3;ctx.beginPath();ctx.moveTo(p.x,p.z);ctx.lineTo(p.x-p.vx*.06,p.z-p.vz*.06);ctx.stroke()}
    else{ctx.fillStyle=`rgba(255,200,40,${Math.min(1,f*1.6).toFixed(2)})`;ctx.beginPath();ctx.arc(p.x,p.z,p.r*(.6+f*.6),0,6.3);ctx.fill();ctx.fillStyle=`rgba(255,250,200,${Math.min(1,f*1.5).toFixed(2)})`;ctx.beginPath();ctx.arc(p.x-.12,p.z-.12,p.r*.3,0,6.3);ctx.fill()}
  }
}

/* ---------- véhicules : ombre + sprite + feux ---------- */
const LIGHTS=[];
function drawVeh(e,now,big){
  const s=getSpr(e.spr);
  if(!inView(e.x,e.z,s.L*VS))return;
  const th=e.th;
  ctx.save();
  ctx.translate(e.x+TOD.sx*1.3,e.z+TOD.sz*1.3);ctx.rotate(Math.PI/2-th);ctx.scale(VS,VS);
  ctx.fillStyle=`rgba(0,0,0,${TOD.sa})`;rr(ctx,-s.L/2,-s.W/2,s.L,s.W,.6);ctx.fill();
  ctx.restore();
  ctx.save();ctx.translate(e.x,e.z);ctx.rotate(Math.PI/2-th);ctx.scale(VS,VS);
  ctx.drawImage(s.cv,-s.cw/2/PPM,-s.ch/2/PPM,s.cw/PPM,s.ch/PPM);
  const k=e.spr.k,hl=s.L/2;
  if(e.brk){ctx.fillStyle='#ff4a3a';rr(ctx,-hl-.02,-s.W*.42,.2,.5,.05);ctx.fill();rr(ctx,-hl-.02,s.W*.42-.5,.2,.5,.05);ctx.fill()}
  if(e.spr.cop){
    const fl=Math.floor(now/150)%2;
    ctx.fillStyle=fl?'#ff2a2a':'#4a0a0a';rr(ctx,-.3,-.9,.6,.8,.12);ctx.fill();
    ctx.fillStyle=fl?'#0a1a4a':'#3a6aff';rr(ctx,-.3,.1,.6,.8,.12);ctx.fill();
    LIGHTS.push({t:'siren',x:e.x,z:e.z,c:fl?'rgba(255,40,40,.8)':'rgba(60,110,255,.8)'});
  }
  ctx.restore();
  if(!e.park)LIGHTS.push({t:'head',x:e.x,z:e.z,th,big:k==='truck'||k==='van',brk:e.brk,hl:hl*VS});
}
function drawBike(x,z,th,col,ped){
  if(!inView(x,z,4))return;
  ctx.save();ctx.translate(x+TOD.sx*1.0,z+TOD.sz*1.0);ctx.rotate(Math.PI/2-th);ctx.scale(VS*1.45,VS*1.45);
  ctx.fillStyle=`rgba(0,0,0,${TOD.sa*.8})`;rr(ctx,-1.05,-.3,2.1,.6,.3);ctx.fill();ctx.restore();
  ctx.save();ctx.translate(x,z);ctx.rotate(Math.PI/2-th);ctx.scale(VS*1.45,VS*1.45);
  paintBike(ctx,col,ped);ctx.restore();
}
/* les autres joueurs (multijoueur) */
function drawOthers(now){
  for(const o of MP.others.values()){
    if(o.hid)continue;
    if(o.k==='foot')drawHuman(o.x,o.z,o.th,o.look,o.ph,o.sp,HS);
    else if(o.k==='bike')drawBike(o.x,o.z,o.th,o.c,o.ph*3);
    else drawVeh({x:o.x,z:o.z,th:o.th,spr:{k:o.k,c:o.c},brk:false},now);
    if(inView(o.x,o.z,6)){const pu=.5+.5*Math.sin(now/300+o.x);ring(o.x,o.z,3+pu*.6,'#7fd1ff',.25,.5)}
  }
}
function drawPlayer(now){
  const d=P.def,sp=Math.hypot(P.vx,P.vz);
  if(HIDE&&(d.kind==='foot'||d.kind==='bike'))return;
  if(d.kind==='foot'){
    drawHuman(P.x,P.z,P.th,PLAYER_LOOK,P.ph,sp,inLab()?2.1:HS,undefined,punchT>0?1-punchT/PUNCH_TIME:0);
    return;
  }
  if(d.kind==='bike'){drawBike(P.x,P.z,P.th,d.color,P.ph*3);return}
  const s={k:d.kind==='scooter'?'scooter':d.kind,c:d.color};
  const e={x:P.x,z:P.z,th:P.th,spr:s,brk:keys.dn&&P.v>.5};
  drawVeh(e,now);
}

/* ---------- repères au sol : commandes, rendez-vous, mission ---------- */
function ring(x,z,r,col,w,a){ctx.strokeStyle=col;ctx.globalAlpha=a;ctx.lineWidth=w;ctx.beginPath();ctx.arc(x,z,r,0,6.3);ctx.stroke();ctx.globalAlpha=1}
function drawOrderMark(o,now){
  if(!inView(o.x,o.z,12))return;
  const col=o.rival?'#ff4a30':'#ffa63d',t=now/1000,tk=o.id===trackId;
  ctx.fillStyle=col;ctx.globalAlpha=.12+(tk?.08:0);ctx.beginPath();ctx.arc(o.x,o.z,4.6,0,6.3);ctx.fill();ctx.globalAlpha=1;
  for(let k=0;k<2;k++){const f=(t*.55+k*.5)%1;ring(o.x,o.z,1.6+f*3.8,col,.45,(1-f)*.7)}
  ring(o.x,o.z,4.6,col,tk?.9:.55,.95);
  ctx.strokeStyle='#fff';ctx.lineWidth=.45;ctx.globalAlpha=.9;ctx.beginPath();ctx.arc(o.x,o.z,5.4,-Math.PI/2,-Math.PI/2+6.2832*clamp(o.ttl/230,0,1));ctx.stroke();ctx.globalAlpha=1;
}
function drawBeacon(x,z,r,col,t){
  if(!inView(x,z,r+10))return;
  ctx.fillStyle=col;ctx.globalAlpha=.14;ctx.beginPath();ctx.arc(x,z,r,0,6.3);ctx.fill();ctx.globalAlpha=1;
  for(let k=0;k<3;k++){const f=(t*.5+k/3)%1;ring(x,z,r*(.35+.65*f),col,.7,(1-f)*.8)}
  ring(x,z,r,col,.9,1);
}

/* ---------- lumière : nuit, lampadaires, phares, gyrophares ---------- */
function lightPass(now){
  const n=TOD.n,w=dk.width,h=dk.height,sc=.5*CAM.zoom,ox=w/2-RC.x*sc,oz=h/2-RC.z*sc;
  if(n>.015){
    dg.setTransform(1,0,0,1,0,0);dg.globalCompositeOperation='source-over';dg.globalAlpha=1;dg.clearRect(0,0,w,h);
    dg.fillStyle=TOD.tint;dg.fillRect(0,0,w,h);
    dg.globalCompositeOperation='destination-out';
    const lr=22*sc;
    dg.globalAlpha=.97;
    for(const L of lampList){const sx=ox+L.ax*sc,sy=oz+L.az*sc;if(sx<-lr||sx>w+lr||sy<-lr||sy>h+lr)continue;dg.drawImage(GLOW,sx-lr,sy-lr,lr*2,lr*2)}
    for(const k of visB){for(const b of k.bld)if(b.shop){const sx=ox+b.shop.x*sc,sy=oz+b.shop.z*sc,r=12*sc;dg.globalAlpha=.8;dg.drawImage(GLOW,sx-r,sy-r,r*2,r*2)}}
    if(LAB){const li=started&&P.def.kind==='foot'&&inLab(),sx=ox+LAB.cx*sc,sy=oz+LAB.cz*sc,r=34*sc;dg.globalAlpha=.9;dg.drawImage(GLOW,sx-r,sy-r,r*2,r*2);
      if(li){const R0=lrect(0,LAB_D,-LAB_W/2,LAB_W/2);dg.globalAlpha=.86;dg.fillStyle='#000';dg.fillRect(ox+R0.x0*sc,oz+R0.z0*sc,(R0.x1-R0.x0)*sc,(R0.z1-R0.z0)*sc)}}
    dg.globalAlpha=1;
    for(const L of LIGHTS){
      const sx=ox+L.x*sc,sy=oz+L.z*sc;
      if(sx<-60*sc||sx>w+60*sc||sy<-60*sc||sy>h+60*sc)continue;
      if(L.t==='head'){
        dg.save();dg.translate(sx,sy);dg.rotate(Math.PI/2-L.th);
        const len=(L.big?36:30)*sc,w0=.9*sc,w1=(L.big?11:9)*sc;
        const gr=dg.createLinearGradient(0,0,len,0);gr.addColorStop(0,'rgba(0,0,0,1)');gr.addColorStop(.6,'rgba(0,0,0,.5)');gr.addColorStop(1,'rgba(0,0,0,0)');
        dg.fillStyle=gr;dg.beginPath();dg.moveTo(L.hl*sc*.6,-w0);dg.lineTo(len,-w1);dg.lineTo(len,w1);dg.lineTo(L.hl*sc*.6,w0);dg.closePath();dg.fill();
        const r=7*sc;dg.drawImage(GLOW,-r,-r,r*2,r*2);
        dg.restore();
      }else{const r=14*sc;dg.drawImage(GLOW,sx-r,sy-r,r*2,r*2)}
    }
    dg.globalCompositeOperation='source-over';
    ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.drawImage(dk,0,0,cv.width,cv.height);
  }
  // halos additifs, dans le repère du monde
  ctx.setTransform(DPR*CAM.zoom,0,0,DPR*CAM.zoom,DPR*(VW/2-RC.x*CAM.zoom),DPR*(VH/2-RC.z*CAM.zoom));
  ctx.globalCompositeOperation='lighter';
  const ga=clamp(n*1.4,0,1);
  if(ga>.05){
    const wl=glowOf('rgba(255,170,70,.55)'),hot=glowOf('rgba(255,225,170,.9)');
    for(const L of lampList){if(!inView(L.ax,L.az,12))continue;
      ctx.globalAlpha=ga*.55;ctx.drawImage(wl,L.ax-17,L.az-17,34,34);
      ctx.globalAlpha=ga;ctx.drawImage(hot,L.ax-2.2,L.az-2.2,4.4,4.4)}
    const sh=glowOf('rgba(255,150,60,.5)');
    for(const k of visB)for(const b of k.bld)if(b.shop&&inView(b.shop.x,b.shop.z,12)){ctx.globalAlpha=ga*.5;ctx.drawImage(sh,b.shop.x-9,b.shop.z-9,18,18)}
  }
  const red=glowOf('rgba(255,40,30,.8)');
  for(const L of LIGHTS){
    if(L.t==='siren'){ctx.globalAlpha=.55+.35*(1-ga);const g2=glowOf(L.c);ctx.drawImage(g2,L.x-11,L.z-11,22,22)}
    else if(L.brk&&ga>.0||L.brk){const bx=L.x-Math.sin(L.th)*L.hl,bz=L.z-Math.cos(L.th)*L.hl;ctx.globalAlpha=.9;ctx.drawImage(red,bx-2.8,bz-2.8,5.6,5.6)}
    else if(ga>.2){const bx=L.x-Math.sin(L.th)*L.hl,bz=L.z-Math.cos(L.th)*L.hl;ctx.globalAlpha=ga*.45;ctx.drawImage(red,bx-1.6,bz-1.6,3.2,3.2)}
  }
  if(LAB&&!(started&&P.def.kind==='foot'&&inLab())&&inView(LAB.cx,LAB.cz,60)){const lm={x:LAB.cx,z:LAB.cz};
    const pul=.75+.25*Math.sin(now/600),vg=glowOf('rgba(200,90,255,.55)');
    ctx.globalAlpha=(.25+.5*ga)*pul;ctx.drawImage(vg,lm.x-38,lm.z-38,76,76);
  }
  for(const lm of LM)if(!lm.home&&inView(lm.x,lm.z,60)){ctx.globalAlpha=.5+.3*Math.sin(now/500);ctx.drawImage(glowOf(`rgba(${rgbOf(lm.col).join(',')},.7)`),lm.x-26,lm.z-26,52,52)}
  if(ga>.1&&inView(LIGHTHOUSE.x,LIGHTHOUSE.z,260)){ctx.save();ctx.translate(LIGHTHOUSE.x,LIGHTHOUSE.z);ctx.rotate(now/1400);
    const g=ctx.createLinearGradient(0,0,230,0);g.addColorStop(0,'rgba(255,240,190,.6)');g.addColorStop(1,'rgba(255,240,190,0)');
    ctx.globalAlpha=ga;ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(230,-24);ctx.lineTo(230,24);ctx.closePath();ctx.fill();
    ctx.drawImage(glowOf('rgba(255,230,160,.9)'),-8,-8,16,16);ctx.restore()}
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
}

/* ---------- affichage tête haute dans le canevas : étiquettes, flèches de bord ---------- */
function pill(sx,sy,txt,col,sub){
  ctx.font='600 12px "Work Sans",system-ui,sans-serif';
  const w=Math.max(ctx.measureText(txt).width,sub?ctx.measureText(sub).width:0)+14,h=sub?32:20;
  ctx.fillStyle='rgba(20,15,13,.82)';rr(ctx,sx-w/2,sy-h,w,h,6);ctx.fill();
  ctx.fillStyle=col;ctx.fillRect(sx-w/2,sy-h+3,3,h-6);
  ctx.fillStyle='#f3e6d6';ctx.textAlign='center';ctx.fillText(txt,sx,sy-h+(sub?14:14));
  if(sub){ctx.fillStyle='#a8937f';ctx.font='500 11px "Work Sans",system-ui,sans-serif';ctx.fillText(sub,sx,sy-h+27)}
}
function edgeMark(x,z,col,txt){
  const s=toScr(x,z),px=clamp(s[0],28,VW-28),py=clamp(s[1],74,VH-120);
  if(px===s[0]&&py===s[1])return;
  const a=Math.atan2(s[1]-py,s[0]-px);
  ctx.save();ctx.translate(px,py);
  ctx.fillStyle='rgba(20,15,13,.85)';ctx.beginPath();ctx.arc(0,0,13,0,6.3);ctx.fill();
  ctx.fillStyle=col;ctx.rotate(a);ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(-4,-7);ctx.lineTo(-1,0);ctx.lineTo(-4,7);ctx.closePath();ctx.fill();
  ctx.restore();
  if(txt){ctx.font='600 10px "IBM Plex Mono",monospace';ctx.fillStyle=col;ctx.textAlign='center';ctx.fillText(txt,px,py+(py<VH/2?27:-19))}
}
function drawHUDLayer(now){
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.textBaseline='alphabetic';
  for(const o of orders){
    const d=Math.hypot(o.x-P.x,o.z-P.z);
    if(d<48){const s=toScr(o.x,o.z);const col=o.rival?'#ff4a30':'#ffa63d';pill(s[0],s[1]-4*CAM.zoom-8,`${o.qty} × ${SM[o.s].name} · ${o.price.toFixed(1)} €/u.`,col,o.name+(canDeliver(o)?'':' · pas assez dans ton sac'))}
  }
  labHUD();
  if(LAB&&!inLab()&&Math.hypot(LAB.sh.door.x-P.x,LAB.sh.door.z-P.z)<70){const q=toScr(LAB.sh.door.x,LAB.sh.door.z);pill(q[0],q[1]-16,'Ton labo',LABAL.txt?'#c98aff':'#8fbf4a',LABAL.txt||'Entre par la porte')}
  if(CAR&&P.def.kind==='foot'&&!inLab()&&Math.hypot(CAR.x-P.x,CAR.z-P.z)<45){const q=toScr(CAR.x,CAR.z);pill(q[0],q[1]-20,'Ta '+VM[CAR.id].name,'#8fbf4a')}
  if(DV&&DV.left==null&&Math.hypot(DV.e.x-P.x,DV.e.z-P.z)<80){const q=toScr(DV.e.x,DV.e.z);pill(q[0],q[1]-20,'Livraison pour ton labo','#ffa63d')}
  for(const sh of SHOPS){
    const d=Math.hypot(sh.x-P.x,sh.z-P.z),T=SHOPTYPES[sh.type];
    if(d<60){const q=toScr(sh.x,sh.z);pill(q[0],q[1]-16,sh.name,T.col,T.label)}
  }
  for(const p of peds){
    if(p.hold>0){const q=toScr(p.x,p.z);pill(q[0],q[1]-22,p.name,'#f3e6d6')}
    else if(p.ko>0&&Math.hypot(p.x-P.x,p.z-P.z)<25){const q=toScr(p.x,p.z);pill(q[0],q[1]-14,p.name+' · KO',p.looted?'#a8937f':'#ffd24a',p.looted?'déjà fouillé':'fouille-le')}
  }
  for(const g of gangs){
    if(G.retired[g.boss]||!inView(g.x,g.z,10))continue;
    const st=stance(g.boss),s=toScr(g.x,g.z),c=BOSSES[g.boss].col;
    ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(s[0],s[1]-3.2*CAM.zoom-3);ctx.lineTo(s[0]-6,s[1]-3.2*CAM.zoom-13);ctx.lineTo(s[0]+6,s[1]-3.2*CAM.zoom-13);ctx.closePath();ctx.fill();
    if(g.state==='chase'){ctx.font='700 14px "Work Sans",sans-serif';ctx.textAlign='center';ctx.fillStyle='#ff4a30';ctx.fillText('!',s[0],s[1]-3.2*CAM.zoom-17)}
  }
  for(const o of MP.others.values()){
    if(o.hid||!inView(o.x,o.z,8))continue;
    const s=toScr(o.x,o.z),up=(o.k==='foot'||o.k==='bike'?2.2:3.2)*CAM.zoom+10;
    pill(s[0],s[1]-up,o.n,'#7fd1ff',fmt(o.cash)+' · '+(DIS[o.hd]?DIS[o.hd].name:''));
    if(o.bub)pill(s[0],s[1]-up-38,'« '+o.bub.t+' »','#f3e6d6');
  }
  if(MP.myBub&&started&&!HIDE){const s=toScr(P.x,P.z);pill(s[0],s[1]-3*CAM.zoom-10,'« '+MP.myBub.t+' »','#7fd1ff')}
  if(meetCar&&inView(meetCar.x,meetCar.z,30)){const s=toScr(meetCar.x,meetCar.z);pill(s[0],s[1]-9*CAM.zoom*.6-14,BOSSES[meetCar.boss].name+' veut te parler',BOSSES[meetCar.boss].col)}
  for(const f of FL){
    const s=toScr(f.x,f.z-f.t*3.2),a=clamp(1.6-f.t,0,1)*Math.min(1,f.t*8);
    ctx.globalAlpha=a;ctx.font=`700 ${f.big?24:17}px "Work Sans",sans-serif`;ctx.textAlign='center';
    ctx.lineWidth=4;ctx.strokeStyle='rgba(20,12,8,.9)';ctx.strokeText(f.txt,s[0],s[1]);ctx.fillStyle=f.col;ctx.fillText(f.txt,s[0],s[1]);ctx.globalAlpha=1;
  }
  if(started){
    if(WP)edgeMark(WP.x,WP.z,'#7fd1ff',Math.round(Math.hypot(WP.x-P.x,WP.z-P.z))+' m · '+WP.label);
    if(M)edgeMark(M.dest.x,M.dest.z,'#ff7a1a',Math.round(Math.hypot(M.dest.x-P.x,M.dest.z-P.z))+' m');
    if(meetCar)edgeMark(meetCar.x,meetCar.z,BOSSES[meetCar.boss].col,BOSSES[meetCar.boss].name);
    if(trk&&!M)edgeMark(trk.x,trk.z,'#ffa63d',Math.round(Math.hypot(trk.x-P.x,trk.z-P.z))+' m');
  }
}

/* ---------- dessin du sol : quartiers, eau, routes, ponts, port, parc, place ---------- */
const WAVES=[];
for(let n=0;n<320;n++){const x=R(340,610),z=R(-610,-60);if(waterAt(x,z))WAVES.push({x,z,p:R(0,6.3),s:R(.6,1.2)})}
for(let n=0;n<90;n++){const p=RIVER.pts[RI(0,RIVER.pts.length-1)];if(waterAt(p[0],p[1]))WAVES.push({x:p[0]+R(-7,7),z:p[1]+R(-5,5),p:R(0,6.3),s:R(.5,.9)})}
const polyPath=(pts,closed)=>{const p=new Path2D();pts.forEach((q,i)=>i?p.lineTo(q[0],q[1]):p.moveTo(q[0],q[1]));if(closed)p.closePath();return p};
const SEAP=polyPath(SEA,true),RIVP=polyPath(RIVER.pts,false);
for(const r of ROADS){
  r.p2d=polyPath(r.pts,r.closed);
  // ponts : tronçons au-dessus de l'eau, garde-corps des deux côtés
  r.bridges=[];let k=0;const n=r.pts.length;
  while(k<n){if(!r.wet[k]){k++;continue}let e=k;while(e<n&&r.wet[e])e++;
    const a=Math.max(0,k-2),b=Math.min(n-1,e+1),side=s=>{const o=[];for(let i=a;i<=b;i++){const p=r.pts[i],q=r.pts[Math.min(n-1,i+1)],pp=r.pts[Math.max(0,i-1)],dx=q[0]-pp[0],dz=q[1]-pp[1],l=Math.hypot(dx,dz)||1;o.push([p[0]-dz/l*s*(r.w/2+.6),p[1]+dx/l*s*(r.w/2+.6)])}return polyPath(o,false)};
    r.bridges.push([side(1),side(-1)]);k=e}
}
const roadInView=r=>!(r.bb[0]>VB.x1||r.bb[2]<VB.x0||r.bb[1]>VB.z1||r.bb[3]<VB.z0);
function drawBoat(b,t){
  if(!inView(b.x,b.z,b.l))return;
  const bob=Math.sin(t*1.3+b.x)*.08;
  ctx.save();ctx.translate(b.x,b.z);ctx.rotate(b.th+bob);
  ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(.6,.6,b.l/2,b.l/6,0,0,6.3);ctx.fill();
  ctx.fillStyle=hex2(b.c);ctx.beginPath();ctx.moveTo(b.l/2,0);ctx.quadraticCurveTo(b.l/4,-b.l/5.5,-b.l/2,-b.l/7);ctx.lineTo(-b.l/2,b.l/7);ctx.quadraticCurveTo(b.l/4,b.l/5.5,b.l/2,0);ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,.35)';ctx.lineWidth=.2;ctx.stroke();
  ctx.fillStyle='#e9e4d6';rr(ctx,-b.l/5,-b.l/14,b.l/3,b.l/7,.3);ctx.fill();
  ctx.restore();
  if(b.mv)for(let k=1;k<4;k++){ctx.strokeStyle=`rgba(255,255,255,${.25/k})`;ctx.lineWidth=.4;ctx.beginPath();ctx.arc(b.x-Math.cos(b.th)*(b.l/2+k*3),b.z-Math.sin(b.th)*(b.l/2+k*3),k*1.6,0,6.3);ctx.stroke()}
}
function drawGround(now){
  const t=now/1000;
  // les quatre quartiers
  for(const key of DKEYS){const d=DIS[key],x0=d.sx<0?-640:0,z0=d.sz<0?-640:0;
    if(x0>VB.x1||x0+640<VB.x0||z0>VB.z1||z0+640<VB.z0)continue;
    ctx.fillStyle=key==='cite'?(PAT.grass||'#4f7d35'):(PAT.conc||'#a09c95');ctx.fillRect(x0,z0,640,640);
    ctx.fillStyle=GROUND[key];ctx.fillRect(x0,z0,640,640)}
  if(WX.lvl>.05){ctx.fillStyle=`rgba(14,22,38,${(WX.lvl*.3).toFixed(3)})`;ctx.fillRect(VB.x0,VB.z0,VB.x1-VB.x0,VB.z1-VB.z0)}
  // parc des Jardins, jardins ouvriers
  if(inView((PARK.x0+PARK.x1)/2,(PARK.z0+PARK.z1)/2,200)){
    ctx.fillStyle=PAT.grass||'#4f7d35';ctx.fillRect(PARK.x0,PARK.z0,PARK.x1-PARK.x0,PARK.z1-PARK.z0);
    ctx.fillStyle='rgba(140,200,90,.16)';ctx.fillRect(PARK.x0,PARK.z0,PARK.x1-PARK.x0,PARK.z1-PARK.z0);
    ctx.strokeStyle='rgba(225,210,170,.9)';ctx.lineWidth=3;ctx.setLineDash([]);ctx.beginPath();
    const mx=(PARK.x0+PARK.x1)/2,mz=(PARK.z0+PARK.z1)/2-20;
    ctx.moveTo(PARK.x0,mz);ctx.bezierCurveTo(mx-60,mz-30,mx+40,mz+40,PARK.x1,mz);ctx.moveTo(mx,PARK.z0);ctx.lineTo(mx,PARK.z1);
    ctx.ellipse(LAKE.x,LAKE.z,LAKE.rx+7,LAKE.rz+7,0,0,6.3);ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,.45)';ctx.lineWidth=.6;ctx.setLineDash([3,3]);ctx.strokeRect(PARK.x0+1,PARK.z0+1,PARK.x1-PARK.x0-2,PARK.z1-PARK.z0-2);ctx.setLineDash([]);
  }
  if(inView((ALLOT.x0+ALLOT.x1)/2,(ALLOT.z0+ALLOT.z1)/2,80)){
    ctx.fillStyle='#6b5034';ctx.fillRect(ALLOT.x0,ALLOT.z0,ALLOT.x1-ALLOT.x0,ALLOT.z1-ALLOT.z0);
    for(let z=ALLOT.z0+4;z<ALLOT.z1-3;z+=6){ctx.fillStyle=(Math.floor(z/6)%3)?'#5f8a35':'#7aa645';ctx.fillRect(ALLOT.x0+4,z,ALLOT.x1-ALLOT.x0-8,3)}
    ctx.strokeStyle='#d8c9a2';ctx.lineWidth=.8;ctx.strokeRect(ALLOT.x0,ALLOT.z0,ALLOT.x1-ALLOT.x0,ALLOT.z1-ALLOT.z0);
  }
  // la mer, la rivière, le lac
  ctx.lineJoin='round';ctx.lineCap='round';
  if(VB.x1>330&&VB.z0<-40){
    ctx.fillStyle='#d9c9a0';ctx.strokeStyle='#d9c9a0';ctx.lineWidth=7;ctx.stroke(SEAP);
    const g=ctx.createLinearGradient(360,0,610,0);g.addColorStop(0,'#2f7aa3');g.addColorStop(1,'#1d557a');ctx.fillStyle=g;ctx.fill(SEAP);
  }
  if(VB.z0<-100&&VB.z1>-220){
    ctx.strokeStyle='#cbbf98';ctx.lineWidth=RIVER.w+6;ctx.stroke(RIVP);
    ctx.strokeStyle='#2f7aa3';ctx.lineWidth=RIVER.w;ctx.stroke(RIVP);
    ctx.strokeStyle='rgba(120,190,225,.35)';ctx.lineWidth=RIVER.w*.35;ctx.stroke(RIVP);
  }
  if(inView(LAKE.x,LAKE.z,90)){ctx.fillStyle='#cbbf98';ctx.beginPath();ctx.ellipse(LAKE.x,LAKE.z,LAKE.rx+2.5,LAKE.rz+2.5,0,0,6.3);ctx.fill();
    const g=ctx.createRadialGradient(LAKE.x-10,LAKE.z-8,0,LAKE.x,LAKE.z,LAKE.rx);g.addColorStop(0,'#5fa5c8');g.addColorStop(1,'#2a6d94');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(LAKE.x,LAKE.z,LAKE.rx,LAKE.rz,0,0,6.3);ctx.fill()}
  ctx.strokeStyle='rgba(220,240,255,.45)';ctx.lineWidth=.35;ctx.beginPath();
  for(const w of WAVES){if(!inView(w.x,w.z,4))continue;const o=Math.sin(t*w.s+w.p)*1.5;ctx.moveTo(w.x-1.6+o,w.z);ctx.quadraticCurveTo(w.x+o,w.z-.9,w.x+1.6+o,w.z)}ctx.stroke();
  // île du phare
  if(inView(LIGHTHOUSE.x,LIGHTHOUSE.z,50)){const L=LIGHTHOUSE;
    ctx.fillStyle='#d9c9a0';ctx.beginPath();ctx.arc(L.x,L.z,L.r,0,6.3);ctx.fill();ctx.fillStyle='#5f8f35';ctx.beginPath();ctx.arc(L.x+3,L.z-2,L.r*.7,0,6.3);ctx.fill();
    ctx.fillStyle='#f2efe8';ctx.beginPath();ctx.arc(L.x,L.z,5,0,6.3);ctx.fill();ctx.fillStyle='#c0392b';ctx.beginPath();ctx.arc(L.x,L.z,3,0,6.3);ctx.fill();ctx.fillStyle='#ffe9a8';ctx.beginPath();ctx.arc(L.x,L.z,1.4,0,6.3);ctx.fill()}
  // pontons, grues, bateaux
  for(const p of PIERS){if(!inView((p.x0+p.x1)/2,(p.z0+p.z1)/2,70))continue;
    ctx.fillStyle='#7a5b3c';ctx.fillRect(p.x0,p.z0,p.x1-p.x0,p.z1-p.z0);ctx.strokeStyle='rgba(30,18,8,.45)';ctx.lineWidth=.25;ctx.beginPath();for(let x=p.x0+1.5;x<p.x1;x+=1.5){ctx.moveTo(x,p.z0);ctx.lineTo(x,p.z1)}ctx.stroke();
    ctx.fillStyle='#3a2a1a';for(let x=p.x0+6;x<p.x1;x+=12){ctx.beginPath();ctx.arc(x,p.z0-.3,.6,0,6.3);ctx.arc(x,p.z1+.3,.6,0,6.3);ctx.fill()}}
  for(const b of BOATS){if(b.mv){b.th+=.0006;b.x=532+Math.cos(t*.05)*48;b.z=-330+Math.sin(t*.05)*190;b.th=Math.atan2(Math.cos(t*.05)*190,-Math.sin(t*.05)*48)}drawBoat(b,t)}
  // la place du Vieux Centre
  if(inView(PLAZA.x,PLAZA.z,60)){const P0=PLAZA;
    ctx.fillStyle='#d8c9a6';ctx.beginPath();ctx.arc(P0.x,P0.z,P0.r,0,6.3);ctx.fill();
    ctx.strokeStyle='rgba(120,95,60,.35)';ctx.lineWidth=.3;for(let r=8;r<P0.r;r+=5){ctx.beginPath();ctx.arc(P0.x,P0.z,r,0,6.3);ctx.stroke()}
    ctx.beginPath();for(let a=0;a<12;a++){const q=a/12*6.283;ctx.moveTo(P0.x+Math.cos(q)*8,P0.z+Math.sin(q)*8);ctx.lineTo(P0.x+Math.cos(q)*P0.r,P0.z+Math.sin(q)*P0.r)}ctx.stroke();
    ctx.fillStyle='#b8ad94';ctx.beginPath();ctx.arc(P0.x,P0.z,7.5,0,6.3);ctx.fill();ctx.fillStyle='#4f95bd';ctx.beginPath();ctx.arc(P0.x,P0.z,6,0,6.3);ctx.fill();
    ctx.fillStyle='rgba(220,240,255,.8)';ctx.beginPath();ctx.arc(P0.x,P0.z,1.4+Math.sin(t*3)*.3,0,6.3);ctx.fill()}
  // les routes : trottoirs, chaussée, marquages
  const vis=ROADS.filter(roadInView);
  ctx.strokeStyle='#a69e90';for(const r of vis){ctx.lineWidth=r.w+5;ctx.stroke(r.p2d)}
  ctx.strokeStyle=PAT.asph||'#2f2d2c';for(const r of vis){ctx.lineWidth=r.w;ctx.stroke(r.p2d)}
  for(const r of vis)for(const [a,b] of r.bridges){ctx.strokeStyle='#5a4f45';ctx.lineWidth=1.6;ctx.stroke(a);ctx.stroke(b);ctx.strokeStyle='#e6dfcf';ctx.lineWidth=.8;ctx.stroke(a);ctx.stroke(b)}
  ctx.lineCap='butt';
  ctx.strokeStyle='rgba(235,230,218,.8)';ctx.lineWidth=.3;ctx.setLineDash([4,7]);for(const r of vis)if(r.major&&!(r.closed&&r.pts.length<40))ctx.stroke(r.p2d);ctx.setLineDash([]);
  // îlot du rond-point
  if(inView(0,0,40)){ctx.fillStyle='#cbbf98';ctx.beginPath();ctx.arc(0,0,ISLAND.r+1.5,0,6.3);ctx.fill();ctx.fillStyle=PAT.grass||'#4f7d35';ctx.beginPath();ctx.arc(0,0,ISLAND.r,0,6.3);ctx.fill();
    ctx.fillStyle='#9a9488';ctx.beginPath();ctx.arc(0,0,6,0,6.3);ctx.fill();ctx.fillStyle='#d8d2c4';ctx.beginPath();ctx.arc(0,0,3.6,0,6.3);ctx.fill();
    ctx.strokeStyle='#e0b020';ctx.lineWidth=.6;ctx.beginPath();ctx.arc(0,0,12,0,6.3);ctx.stroke()}
  // grues du port (au-dessus des pontons)
  for(const c of CRANES){if(!inView(c.x,c.z,30))continue;ctx.strokeStyle='#e0b020';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(c.x-10,c.z);ctx.lineTo(c.x+8,c.z-14);ctx.stroke();ctx.lineWidth=.5;ctx.strokeRect(c.x-2,c.z-2,4,4)}
  ctx.lineCap='butt';ctx.lineJoin='miter';
  // pas des QG
  for(const lm of LM){if(!inView(lm.x,lm.z,40))continue;
    if(lm.home){ctx.fillStyle='#2c2724';ctx.fillRect(lm.x-20,lm.z-20,40,40);ctx.strokeStyle='#d9b020';ctx.lineWidth=.6;ctx.setLineDash([2.5,2.5]);ctx.strokeRect(lm.x-19.5,lm.z-19.5,39,39);ctx.setLineDash([])}
    else{ctx.fillStyle='rgba(20,16,14,.55)';ctx.fillRect(lm.x-12,lm.z-12,24,24);ctx.strokeStyle=DIS[lm.k].col;ctx.lineWidth=.5;ctx.strokeRect(lm.x-11.5,lm.z-11.5,23,23)}}
}

/* ---------- le rendu complet d'une image ---------- */
let visB=[];
function render(now){
  calcTOD();
  const z=CAM.zoom,sk=CAM.shake/z;
  RC.x=CAM.x+(sk?(Math.random()-.5)*sk*2:0);RC.z=CAM.z+(sk?(Math.random()-.5)*sk*2:0);
  const hw=VW/2/z,hh=VH/2/z;VB.x0=RC.x-hw;VB.x1=RC.x+hw;VB.z0=RC.z-hh;VB.z1=RC.z+hh;
  LIGHTS.length=0;
  ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.fillStyle='#120e0d';ctx.fillRect(0,0,cv.width,cv.height);
  ctx.setTransform(DPR*z,0,0,DPR*z,DPR*(VW/2-RC.x*z),DPR*(VH/2-RC.z*z));
  drawGround(now);
  const LABIN=started&&P.def.kind==='foot'&&inLab();
  if(LABIN)drawLabInside(now);drawLabDoor(now);
  const mg=40+.22*Math.max(hw,hh);
  const i0=clamp(Math.floor((VB.x0-mg+HALF)/PITCH),0,11),i1=clamp(Math.floor((VB.x1+mg+HALF)/PITCH),0,11),j0=clamp(Math.floor((VB.z0-mg+HALF)/PITCH),0,11),j1=clamp(Math.floor((VB.z1+mg+HALF)/PITCH),0,11);
  visB=[];
  for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++)visB.push(BL[i*12+j]);
  drawFx();
  // ombres portées
  ctx.fillStyle=`rgba(0,0,0,${TOD.sa})`;
  for(const B of visB){
    for(const b of B.bld){if(b.x1<VB.x0-60||b.x0>VB.x1+60||b.z1<VB.z0-60||b.z0>VB.z1+60)continue;shadowPoly(b.x0,b.z0,b.x1,b.z1,b.h+(b.tier?b.tier.h:0))}
    for(const c of B.cont)shadowPoly(c.x0,c.z0,c.x1,c.z1,c.h);
  }
  if(LAB&&!LABIN&&inView(LAB.cx,LAB.cz,80))shadowPoly(LAB.sh.x0,LAB.sh.z0,LAB.sh.x1,LAB.sh.z1,6);
  for(const lm of LM)if(inView(lm.x,lm.z,60))shadowPoly(lm.x-lm.hs,lm.z-lm.hs,lm.x+lm.hs,lm.z+lm.hs,lm.home?10:90);
  // voitures garées, conteneurs
  for(const B of visB){
    for(const c of B.cars)drawVeh({x:c.x,z:c.z,th:c.th,spr:{k:c.k,c:c.c},brk:false,park:true},now);
    for(const c of B.cont){
      if(!inView((c.x0+c.x1)/2,(c.z0+c.z1)/2,14))continue;
      const r=box(c.x0,c.z0,c.x1,c.z1,0,c.h,c.st,null);
      ctx.strokeStyle='rgba(0,0,0,.28)';ctx.lineWidth=.18;ctx.beginPath();for(let x=r[0]+1;x<r[2];x+=1.7){ctx.moveTo(x,r[1]);ctx.lineTo(x,r[3])}ctx.stroke();
    }
  }
  // lampadaires (poteau + bras)
  ctx.strokeStyle='#4a4d52';ctx.lineCap='round';
  for(const L of lampList){if(!inView(L.px,L.pz,4))continue;ctx.lineWidth=.22;ctx.beginPath();ctx.moveTo(L.px,L.pz);ctx.lineTo(L.ax,L.az);ctx.stroke();ctx.fillStyle='#3a3d42';ctx.beginPath();ctx.arc(L.px,L.pz,.35,0,6.3);ctx.fill();ctx.fillStyle=TOD.n>.2?'#ffe3b0':'#c9c3b8';ctx.beginPath();ctx.arc(L.ax,L.az,.5,0,6.3);ctx.fill()}
  ctx.lineCap='butt';
  drawCityProps(now/1000);
  // marqueurs au sol
  for(const o of orders)drawOrderMark(o,now);
  if(M)drawBeacon(M.dest.x,M.dest.z,14,'#ff7a1a',now/1000);
  if(meetCar)drawBeacon(meetCar.x,meetCar.z,9,BOSSES[meetCar.boss].col,now/1000);
  for(const sh of SHOPS)if(inView(sh.x,sh.z,14))drawShopFront(sh,now);
  // piétons, clients
  for(const p of peds)drawHuman(p.x,p.z,p.th,p.look,p.ph,p.hold>0||p.ko>0?0:p.sp,HS,p.ko>0?'ko':undefined);
  drawCityNPC(now/1000);
  for(const o of orders)drawHuman(o.x+2.8,o.z,o.nang,o.look,o.ph,0,HS);
  // véhicules
  for(const e of traffic)drawVeh(e,now);
  for(const e of couriers)drawVeh(e,now);
  for(const e of gangs)if(!G.retired[e.boss])drawVeh(e,now);
  for(const e of cops)drawVeh(e,now);
  if(meetCar)drawVeh(meetCar,now);
  if(DV)drawVeh(DV.e,now);
  if(CAR){const V=VM[CAR.id];if(V.kind==='bike')drawBike(CAR.x,CAR.z,CAR.th,V.color,0);else drawVeh({x:CAR.x,z:CAR.z,th:CAR.th,spr:{k:V.kind,c:V.color},brk:false,park:true},now)}
  if(started){
    if(!HIDE&&!LABIN&&(P.def.kind==='foot'||P.def.kind==='scooter'||P.def.kind==='bike')){const pu=.5+.5*Math.sin(now/300);ring(P.x,P.z,2.6+pu*.5,'#ffffff',.2,.35)}
    drawPlayer(now);
  }
  drawOthers(now);
  // émetteurs et fumées
  drawParticles();
  drawPigeons(now/1000);
  // arbres et bâtiments, du plus bas au plus haut
  for(const B of visB)for(const t of B.trees)drawTree(t);
  const vb=[];
  for(const B of visB)for(const b of B.bld){if(b.x1<VB.x0-mg||b.x0>VB.x1+mg||b.z1<VB.z0-mg||b.z0>VB.z1+mg)continue;vb.push(b)}
  vb.sort((p,q)=>p.h-q.h);
  for(const b of vb)drawBld(b);
  if(!LABIN)drawLabRoof(now);
  drawCityTop(now/1000);
  // points de repère
  for(const lm of LM){
    if(!inView(lm.x,lm.z,70))continue;
    if(lm.home){
      const hs=lm.hs;
      const r=box(lm.x-hs,lm.z-hs,lm.x+hs,lm.z+hs,0,3.4,sty(0x3b342d),{tex:true});
      const gl=box(lm.x-hs+.8,lm.z-hs+.8,lm.x+hs-.8,lm.z+hs-.8,3.4,9.5,{N:'rgba(150,215,110,.55)',W:'rgba(130,195,95,.55)',E:'rgba(100,160,75,.55)',S:'rgba(85,140,62,.55)',R:'rgba(140,210,100,.5)',L:'#cfe9a8'},{});
      ctx.strokeStyle='rgba(235,245,215,.65)';ctx.lineWidth=.35;ctx.beginPath();
      const w=gl[2]-gl[0],h=gl[3]-gl[1];
      for(let k=1;k<8;k++){ctx.moveTo(gl[0]+w*k/8,gl[1]);ctx.lineTo(gl[0]+w*k/8,gl[3]);ctx.moveTo(gl[0],gl[1]+h*k/8);ctx.lineTo(gl[2],gl[1]+h*k/8)}ctx.stroke();
      ctx.strokeRect(gl[0],gl[1],w,h);
      const pul=.55+.25*Math.sin(now/500);
      ctx.fillStyle=`rgba(230,110,255,${pul})`;ctx.fillRect(gl[0]+w*.3,gl[1]+h*.3,w*.4,h*.4);
      ctx.fillStyle=`rgba(255,200,255,${pul})`;ctx.fillRect(gl[0]+w*.42,gl[1]+h*.42,w*.16,h*.16);
      ctx.font='700 4.2px "Bowlby One",Impact,sans-serif';ctx.textAlign='center';ctx.fillStyle='#e9ffd0';ctx.strokeStyle='rgba(15,25,8,.8)';ctx.lineWidth=.6;ctx.strokeText('SERRE',(gl[0]+gl[2])/2,(gl[1]+gl[3])/2+1.6);ctx.fillText('SERRE',(gl[0]+gl[2])/2,(gl[1]+gl[3])/2+1.6);
    }else{
      const r=box(lm.x-lm.hs,lm.z-lm.hs,lm.x+lm.hs,lm.z+lm.hs,0,90,lm.st,{tex:true,rim:true,win:true,litD:[1.7,1.3],offs:0,seed:3});
      ctx.fillStyle=lm.st.L;ctx.beginPath();ctx.arc((r[0]+r[2])/2,(r[1]+r[3])/2,2.2,0,6.3);ctx.fill();
    }
  }
  // pluie, nuit, halos
  lightPass(now);
  drawParticlesTop();
  ctx.setTransform(DPR,0,0,DPR,0,0);
  if(WX.lvl>.04){
    ctx.strokeStyle=`rgba(190,205,230,${(WX.lvl*.45).toFixed(2)})`;ctx.lineWidth=1;ctx.beginPath();
    for(const r of RAIN){const x=r.x*VW,y=r.y*VH;ctx.moveTo(x,y);ctx.lineTo(x-3,y+13*r.s)}ctx.stroke();
  }
  drawHUDLayer(now);
}
function drawParticlesTop(){}

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

/* ---------- magasins : placement, façades, intérieur ---------- */
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
    s.park=roadsideSpot(s.x,s.z);b.store=s;SHOPS.push(s);
  }
}
placeShops();
Math.random=_rnd;
function drawShopFront(s,now){
  const T=SHOPTYPES[s.type];
  ctx.save();ctx.translate(s.x,s.z);
  if(s.ax==='x')ctx.transform(s.sg,0,0,1,0,0);else ctx.transform(0,s.sg,1,0,0,0);
  for(let k=0;k<8;k++){ctx.fillStyle=k%2?'#f1e8d6':T.col;ctx.fillRect(-3,-4.4+k*1.1,3.6,1.1)}
  ctx.strokeStyle='rgba(0,0,0,.4)';ctx.lineWidth=.2;ctx.strokeRect(-3,-4.4,3.6,8.8);
  ctx.restore();
  if(Math.hypot(P.x-s.x,P.z-s.z)<45){const f=(now/1200)%1;ring(s.x,s.z,1.6+f*2.4,T.col,.35,(1-f)*.8)}
}
function shopSvg(T){
  let o='';
  for(let x=0;x<=360;x+=30)o+=`<path d="M${x} 0V170" stroke="rgba(255,255,255,.05)"/>`;
  for(let y=0;y<=170;y+=30)o+=`<path d="M0 ${y}H360" stroke="rgba(255,255,255,.05)"/>`;
  o+='<rect width="360" height="30" fill="rgba(0,0,0,.4)"/>';
  for(let i=0;i<10;i++)o+=`<rect x="${14+i*34}" y="6" width="26" height="18" rx="2" fill="${T.items[i%T.items.length]}" opacity=".9"/>`;
  switch(T.deco){
    case 'coffre':break;
    case 'vitrines':for(const x of [16,274])o+=`<rect x="${x}" y="70" width="70" height="46" fill="rgba(140,190,230,.1)" stroke="rgba(160,200,235,.6)"/><rect x="${x+8}" y="80" width="54" height="6" fill="#15110f"/><rect x="${x+8}" y="98" width="54" height="6" fill="#15110f"/>`;break;
    case 'plantes':for(let i=0;i<7;i++)o+=`<circle cx="${26+i*50}" cy="${i%2?118:96}" r="13" fill="#4f8a2f"/><circle cx="${26+i*50}" cy="${i%2?118:96}" r="6" fill="#8fbf4a"/>`;break;
    case 'voiture':o+='<rect x="30" y="84" width="92" height="44" rx="14" fill="#3b6fd4"/><rect x="52" y="92" width="48" height="28" rx="8" fill="#0b121c"/><rect x="250" y="84" width="82" height="44" rx="14" fill="#c0392b"/><rect x="270" y="92" width="42" height="28" rx="8" fill="#0b121c"/>';break;
    case 'bar':for(let i=0;i<6;i++)o+=`<circle cx="${130+i*20}" cy="92" r="6" fill="#6b4a2c"/>`;o+='<rect x="20" y="100" width="60" height="30" rx="4" fill="#5a3a22"/><rect x="280" y="100" width="60" height="30" rx="4" fill="#5a3a22"/>';break;
    case 'portants':for(const x of [20,270])for(let i=0;i<5;i++)o+=`<rect x="${x+i*14}" y="76" width="9" height="34" rx="2" fill="${T.items[i%T.items.length]}"/>`;break;
    default:for(const y of [76,108])o+=`<rect x="20" y="${y}" width="80" height="12" fill="rgba(255,255,255,.1)"/><rect x="260" y="${y}" width="80" height="12" fill="rgba(255,255,255,.1)"/>`;
  }
  o+=`<rect x="120" y="58" width="120" height="16" rx="3" fill="${T.col}"/><rect x="120" y="58" width="120" height="4" fill="rgba(255,255,255,.25)"/>`;
  o+=`<circle cx="180" cy="46" r="9" fill="#d7a67f"/><rect x="168" y="52" width="24" height="8" rx="4" fill="${T.col}" opacity=".85"/>`;
  o+='<rect x="140" y="152" width="80" height="18" fill="rgba(0,0,0,.35)"/><circle cx="180" cy="136" r="8" fill="#5a6b4a" stroke="#f3e6d6" stroke-width="1.5"/>';
  return `<svg viewBox="0 0 360 170" style="width:100%;border-radius:8px;border:1px solid var(--line);background:${T.floor}" aria-hidden="true">${o}</svg>`;
}
let curShop=null;
const LOOK0={...PLAYER_LOOK};
function applyLook(){Object.assign(PLAYER_LOOK,LOOK0,G.look||{});delete PLAYER_LOOK.s}
function renderShop(){
  const s=curShop,T=SHOPTYPES[s.type];
  $('shName').textContent=s.name;$('shName').style.color=T.col;
  let h=shopSvg(T)+`<p class="note"><b style="color:${T.col}">${s.clerk}</b> : ${s.line}</p>`;
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
      if(g.bag){const own=G.bag.lv>=g.bag;tag=own?' <span class="tag ok">Possédé</span>':'';btn=own?'<button class="btn" disabled>Possédé</button>':`<button class="btn" data-buy="${id}" data-cost="${g.price}"${G.cash<g.price?' disabled':''}>${fmt(g.price)}</button>`}
      else if(g.look){
        const own=g.price===0||inv(id),worn=Object.keys(g.look).every(k=>PLAYER_LOOK[k]===g.look[k]);
        tag=worn?' <span class="tag ok">Porté</span>':own?' <span class="tag ok">Possédé</span>':'';
        btn=worn?'<button class="btn" disabled>Porté</button>':own?`<button class="btn" data-buy="${id}">Porter</button>`:`<button class="btn" data-buy="${id}" data-cost="${g.price}"${G.cash<g.price?' disabled':''}>${fmt(g.price)}</button>`;
      }else if(g.use){const n=G.bag.it[id]||0;tag=n?` <span class="tag ok">${n} dans le sac</span>`:'';btn=`<button class="btn" data-buy="${id}" data-cost="${g.price}"${G.cash<g.price?' disabled':''}>${fmt(g.price)}</button>`}
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
  if(g.bag){
    if(G.bag.lv>=g.bag||G.cash<g.price)return;G.cash-=g.price;G.bag.lv=g.bag;toast(`${g.name} : ${bagPlaces()} places dans ton sac.`,'good');
  }else if(g.look){
    if(g.price>0&&!inv(id)){if(G.cash<g.price)return;G.cash-=g.price;G.inv[id]=1}
    Object.assign(G.look,g.look);applyLook();
  }else if(g.use){
    if(G.cash<g.price)return;if(!bagAddItem(id,1)){toast('Ton sac est plein.','bad');return}G.cash-=g.price;toast(g.name+' rangé dans ton sac (B ou 🎒 pour l’utiliser).','good');
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
    {label:'Lui proposer un échantillon',desc:'1 unité offerte, prise dans ton sac. Risqué.',off:bagTot()===0,fn:()=>{
      const s=STRAINS.slice().sort((a,b)=>a.price-b.price).find(s=>(G.bag.p[s.id]||0)>0);if(!s)return '« Tu n’as rien sur toi. »';
      G.bag.p[s.id]--;
      if(Math.random()<K.acc){const o=genOrder(p.x,p.z,1.3,p.name);trackId=o.id;G.heat=Math.min(100,G.heat+2);return '« Pas mal du tout ! Je t’en prends d’autres, regarde la carte. »'}
      if(Math.random()<.35){G.heat=Math.min(100,G.heat+10);return '« Mais ça va pas ? Je vais appeler la police ! » Il s’éloigne vite. Chaleur +10.'}
      return '« Non merci, ce n’est pas pour moi. »'}},
    {label:'Demander des nouvelles du quartier',desc:'Rumeurs et ragots.',fn:()=>gossip()},
    {label:'Acheter un tuyau (150 €)',desc:'Deux clients garantis.',need:150,fn:()=>lead(p.x,p.z,150)},
    {label:'Partir',close:1}]},()=>{p.hold=.6});
}


/* ---------- cible d'interaction : ce qu'il y a à faire juste à côté de soi ---------- */
let tgt=null,WP=null,HIDE=null;
function findTarget(){
  tgt=null;
  if(!started||ended||paused())return;
  if(HIDE){tgt={k:'unhide',label:'Sortir de la cachette'};return}
  if(P.def.kind!=='foot'){if(Math.abs(P.v)<3.5)tgt={k:'exit',label:'Descendre'};return}
  if(inLab()){tgt=labTarget();return}
  let bd=1e9;
  const chased=cops.length>0||threat,nc=cops.reduce((m,c)=>Math.min(m,Math.hypot(c.x-P.x,c.z-P.z)),1e9);
  for(const s of SHOPS){const d=Math.hypot(P.x-s.x,P.z-s.z)-1;if(d<4&&d<bd){bd=d;
    tgt=chased?(nc>35?{k:'hide',s,label:'Se cacher : '+s.name}:{k:'info',label:'Flics trop près pour se cacher'}):{k:'shop',s,label:'Entrer : '+s.name}}}
  if(LAB){const d=Math.hypot(P.x-LAB.sh.door.x,P.z-LAB.sh.door.z);if(d<3.2&&d<bd){bd=d;tgt={k:'enterlab',label:'Entrer dans le labo'}}}
  if(CAR){const d=Math.hypot(P.x-CAR.x,P.z-CAR.z);if(d<4.2&&d<bd){bd=d;tgt={k:'enter',label:'Monter : '+VM[CAR.id].name}}}
  for(const p of peds){const d=Math.hypot(P.x-p.x,P.z-p.z);if(d>=3.4||d>=bd)continue;
    if(p.ko>0){if(!p.looted){bd=d;tgt={k:'loot',p,label:'Fouiller '+p.name}}}
    else if(!(p.flee>0)){bd=d;tgt={k:'ped',p,label:'Parler à '+p.name}}}
}
function startHide(s){
  HIDE={s,t:0};P.vx=P.vz=P.v=0;for(const k in keys)keys[k]=0;
  for(const c of cops)c.path=[];
  toast(`Tu te planques chez ${s.name}. Les flics perdent ta trace.`,'good');
}
function endHide(){if(!HIDE)return;HIDE=null;toast('Tu ressors discrètement.')}
function act(){findTarget();if(!tgt||tgt.k==='info')return;
  switch(tgt.k){
    case 'exit':exitCar();break;case 'enter':enterCar();break;
    case 'shop':openShop(tgt.s);break;case 'hide':startHide(tgt.s);break;case 'unhide':endHide();break;
    case 'ped':talkPed(tgt.p);break;case 'loot':lootPed(tgt.p);break;
    case 'enterlab':{const [x,z]=labWorld(1.6,0);P.x=x;P.z=z;P.th=LAB.spawn.th;P.vx=P.vz=0;break}
    default:labDo(tgt)}
  Sfx.click()}
function actOpt(){findTarget();if(tgt&&tgt.opt)labOptions(tgt)}

/* ---------- vie du quartier : circulation et passants ---------- */
const traffic=[],peds=[],PEDN=MOBILE?28:40,TRAFN=MOBILE?16:22;
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
  while(traffic.length<TRAFN&&tries++<4){
    const p=randRoadPoint(fx,fz,150,340);
    const bus=Math.random()<.08,e=mkAI(bus?{k:'bus',c:pick([0x2f6fb0,0xd8c23a,0x3a9a5a])}:{k:pick(CARK),c:pick(CARCOLS)},p.x,p.z,0,bus?3:2.0);e.civ=1;e.sp=bus?R(10,13):R(13,21);
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
    const nm=pick(PNAMES);peds.push({r:n.r,sw,name:nm[0],g:nm[1],kind:pick(Object.keys(PKINDS)),hold:0,gr:0,s:rd.cum[n.k],dir:Math.random()<.5?1:-1,sp:Math.random()<.14?R(3.4,4.3):R(1.1,1.8),look:randLook(),ph:R(0,6),x:0,z:0,th:0,off:R(-.9,.6),jx:0,jz:0,jvx:0,jvz:0,sh:0});
  }
  for(let i=peds.length-1;i>=0;i--){
    const p=peds[i];
    if(pedSpecial(p,dt)){if(Math.hypot(p.x-fx,p.z-fz)>340)peds.splice(i,1);continue}
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


/* ---------- joueur : à pied (joystick) ou au volant (flèches) ---------- */
const P={x:0,z:0,th:0,v:0,vx:0,vz:0,def:VM.foot,steer:0,ph:0,slip:0,sk:[null,null]};
function setVehicle(id){
  const d=VM[id];if(!d)return;
  P.def=d;if(id!=='foot')G.veh=id;
  if(d.kind==='foot'||d.kind==='scooter'||d.kind==='bike'){const sp=Math.hypot(P.vx,P.vz);if(sp>d.vmax){P.vx*=d.vmax/sp;P.vz*=d.vmax/sp}}
}
/* collisions cercle / rectangles */
function collide(e,r){
  e.x=clamp(e.x,-605,605);e.z=clamp(e.z,-605,605);
  const ci=Math.floor((e.x+HALF)/PITCH),cj=Math.floor((e.z+HALF)/PITCH),list=BLK[ci+','+cj];let hit=0;
  if(!list)return 0;
  for(const b of list){
    const nx=clamp(e.x,b.x0,b.x1),nz=clamp(e.z,b.z0,b.z1),dx=e.x-nx,dz=e.z-nz,d2=dx*dx+dz*dz;
    if(d2<r*r){
      if(d2<1e-6){const l=e.x-b.x0,rr=b.x1-e.x,t=e.z-b.z0,bt=b.z1-e.z,m=Math.min(l,rr,t,bt);
        if(m===l)e.x=b.x0-r;else if(m===rr)e.x=b.x1+r;else if(m===t)e.z=b.z0-r;else e.z=b.z1+r}
      else{const d=Math.sqrt(d2);e.x=nx+dx/d*r;e.z=nz+dz/d*r}
      hit=1}
  }
  return hit;
}
/* ta voiture garée (une seule à la fois dans la ville) */
let CAR=null;
function parkCar(id,x,z,th){
  if(CAR&&CAR.rect)for(const k in BLK)BLK[k]=BLK[k].filter(r=>r!==CAR.rect);
  CAR=id&&id!=='foot'&&VM[id]?{id,x,z,th,park:1}:null;
  if(CAR){CAR.rect={x0:x-1.4,x1:x+1.4,z0:z-1.4,z1:z+1.4};addRectAll(CAR.rect)}
}
function pointFree(x,z,r){
  if(waterAt(x,z)||Math.abs(x)>598||Math.abs(z)>598)return false;
  const list=BLK[Math.floor((x+HALF)/PITCH)+','+Math.floor((z+HALF)/PITCH)]||[];
  for(const b of list){if(x>b.x0-r&&x<b.x1+r&&z>b.z0-r&&z<b.z1+r)return false}
  return true;
}
function enterCar(){
  if(!CAR)return;const c=CAR;parkCar(null);
  P.x=c.x;P.z=c.z;P.th=c.th;P.vx=P.vz=P.v=0;P.sk=[null,null];setVehicle(c.id);Sfx.init();
}
function exitCar(){
  const d=P.def;if(d.kind==='foot')return;
  const fx=Math.sin(P.th),fz=Math.cos(P.th),lx=fz,lz=-fx,half=d.kind==='truck'?2.6:d.kind==='bike'||d.kind==='scooter'?1.3:2.2;
  let ex=null,ez=null;
  for(const [ox,oz] of [[lx*half,lz*half],[-lx*half,-lz*half],[-fx*(half+3.5),-fz*(half+3.5)],[fx*(half+3.5),fz*(half+3.5)],[lx*(half+1.5),lz*(half+1.5)],[-lx*(half+1.5),-lz*(half+1.5)]]){
    if(pointFree(P.x+ox,P.z+oz,.5)){ex=P.x+ox;ez=P.z+oz;break}}
  if(ex===null){toast('Pas de place pour descendre ici.','bad');return}
  const id=G.veh;parkCar(id,P.x,P.z,P.th);
  setVehicle('foot');P.x=ex;P.z=ez;P.vx=P.vz=P.v=0;P.sk=[null,null];
}
/* point de départ : dans le labo, près de l'entrée ; la voiture choisie garée devant */
function spawnHome(){
  setVehicle('foot');HIDE=null;
  const L=LAB;P.x=L.spawn.x;P.z=L.spawn.z;P.th=L.spawn.th;P.v=0;P.vx=P.vz=0;P.sk=[null,null];
  if(G.veh&&G.veh!=='foot'&&G.owned[G.veh])parkCar(G.veh,L.park.x,L.park.z,L.park.th);else parkCar(null);
  CAM.x=P.x;CAM.z=P.z;CAM.zoom=labZoom();
}
function chooseVehicle(id){
  if(!G.owned[id]||id==='foot')return;G.veh=id;
  if(P.def.kind!=='foot'){setVehicle(id);return}
  const s=menuAt&&menuAt.park?menuAt.park:LAB.park;
  parkCar(id,s.x,s.z,s.th);
}

/* ---------- contrôles : clavier, joystick (à pied), flèches (au volant) ---------- */
const keys={up:0,dn:0,l:0,r:0,sp:0,walk:0};
const KM={arrowup:'up',w:'up',z:'up',arrowdown:'dn',s:'dn',arrowleft:'l',a:'l',q:'l',arrowright:'r',d:'r',' ':'sp'};
addEventListener('keydown',e=>{
  if(e.target&&e.target.tagName==='INPUT')return;
  const kk=e.key.toLowerCase(),k=KM[kk];
  if(e.key==='Shift')keys.walk=1;
  if(e.key==='Escape'&&bagOpen){closeBag();return}
  if((kk==='b'||kk==='i')&&started&&!ended){if(bagOpen)closeBag();else if(!paused())openBag();return}
  if(kk==='f'&&started&&!paused()){doPunch();return}
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
document.querySelectorAll('.cb').forEach(b=>{const k=b.dataset.k;
  const on=e=>{e.preventDefault();keys[k]=1;b.classList.add('on')},off=()=>{keys[k]=0;b.classList.remove('on')};
  b.addEventListener('pointerdown',on);['pointerup','pointerleave','pointercancel'].forEach(t=>b.addEventListener(t,off));
  b.addEventListener('contextmenu',e=>e.preventDefault())});
/* joystick virtuel (à pied) : vers le haut de l'écran = vers le haut de la carte */
const J={x:0,y:0,id:null,cx:0,cy:0,on:false};
{const joy=$('joy'),knob=$('joyK');
 const move=e=>{const R0=joy.clientWidth/2;let dx=e.clientX-J.cx,dy=e.clientY-J.cy;const d=Math.hypot(dx,dy),m=Math.min(d,R0);if(d>0){dx*=m/d;dy*=m/d}J.x=dx/R0;J.y=dy/R0;knob.style.transform=`translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px)`};
 const end=e=>{if(e.pointerId!==J.id)return;J.id=null;J.on=false;J.x=J.y=0;knob.style.transform='';joy.classList.remove('on')};
 joy.addEventListener('pointerdown',e=>{e.preventDefault();if(J.id!==null)return;try{joy.setPointerCapture(e.pointerId)}catch(_){}J.id=e.pointerId;const r=joy.getBoundingClientRect();J.cx=r.left+r.width/2;J.cy=r.top+r.height/2;J.on=true;joy.classList.add('on');move(e);Sfx.init()});
 joy.addEventListener('pointermove',e=>{if(e.pointerId===J.id)move(e)});
 ['pointerup','pointercancel','lostpointercapture'].forEach(t=>joy.addEventListener(t,end));
 joy.addEventListener('contextmenu',e=>e.preventDefault())}

/* déplacement à pied : joystick à fond = course, à moitié = marche ; plus lent dans le labo, pour placer les machines */
function updFoot(dt){
  let ix=J.x,iy=J.y,kb=false;
  if(!J.on){ix=(keys.r?1:0)-(keys.l?1:0);iy=(keys.dn?1:0)-(keys.up?1:0);kb=!!(ix||iy)}
  const mag=Math.min(1,Math.hypot(ix,iy)),inside=inLab();
  const RUN=inside?5.2:9.5,WALK=inside?2.4:4;
  let mx=ix,mz=iy;const ml=Math.hypot(mx,mz);if(ml>1e-4){mx/=ml;mz/=ml}
  let sp=0;
  if(mag>.12)sp=kb?(keys.walk?WALK:RUN):mag>.8?RUN:WALK*(.5+.5*(mag-.12)/.68);
  const k=Math.min(1,dt*(sp?10:12));
  P.vx+=(mx*sp-P.vx)*k;P.vz+=(mz*sp-P.vz)*k;
  if(sp>.1){let d=Math.atan2(mx,mz)-P.th;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;P.th+=clamp(d,-dt*12,dt*12)}
  const ox=P.x,oz=P.z;P.x+=P.vx*dt;P.z+=P.vz*dt;
  if(waterAt(P.x,P.z)){P.x=ox;P.z=oz;P.vx=P.vz=0}
  collide(P,.45);
  const s=Math.hypot(P.x-ox,P.z-oz)/Math.max(dt,1e-4);
  P.v=s;P.ph+=s*dt*(inside?3.4:1.6);P.slip=0;P.sk=[null,null];
}
const labZoom=()=>clamp(Math.min(VW,VH)/15,22,46);
function updCamera(dt){
  const sp=Math.hypot(P.vx,P.vz),k0=P.def.kind,m=clamp(Math.min(VW,VH)/760,.62,1.3),inside=k0==='foot'&&inLab();
  const zt=inside?labZoom():clamp((k0==='foot'?9.2:k0==='scooter'||k0==='bike'?8:7.3)-sp*.04,3,9.5)*m;
  CAM.zoom+=(zt-CAM.zoom)*(1-Math.exp(-dt*(inside?4:2.5)));
  const mx=VW*.2/CAM.zoom,mz=VH*.2/CAM.zoom,la=inside?.15:.7;
  let tx=P.x+clamp(P.vx*la,-mx,mx),tz=P.z+clamp(P.vz*la,-mz,mz);
  if(inside){const sh=LAB.sh,hw=VW/2/CAM.zoom,hh=VH/2/CAM.zoom;
    tx=(sh.x1-sh.x0)<2*hw?(sh.x0+sh.x1)/2:clamp(tx,sh.x0+hw-1,sh.x1-hw+1);tz=(sh.z1-sh.z0)<2*hh?(sh.z0+sh.z1)/2:clamp(tz,sh.z0+hh-1,sh.z1-hh+1)}
  const kk=1-Math.exp(-dt*6);
  CAM.x+=(tx-CAM.x)*kk;CAM.z+=(tz-CAM.z)*kk;
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
    if(d>=rmin&&d<=rmax)return {x:n.x,z:n.z};const e=d<rmin?rmin-d:d-rmax;if(e<bd){bd=e;best=n}}
  return {x:best.x,z:best.z};
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
  x=clamp(x,-600,600);z=clamp(z,-600,600);
  const d=districtAt(x,z),ow=G.own[d.key],rival=ow!=='you'&&!G.ally[ow];
  const o={id:oid++,x,z,s:s.id,qty:RI(3,8+Math.min(12,Math.floor(G.earned/4000))),price:Math.round(s.price*R(.9,1.35)*priceMult()*(rival?1.2:1)*(bonus||1)*(1+.25*TOD.n)*10)/10,ttl:R(130,230),d:d.key,name:nm||pick(NAMES),by:null,cd:0};
  o.rival=rival;o.look=randLook();o.ph=R(0,6);o.nang=R(0,6.28);orders.push(o);return o;
}
function removeOrder(o){orders=orders.filter(q=>q!==o);if(trackId===o.id)trackId=null}
const canDeliver=(o,src)=>((src||G.bag.p)[o.s]||0)>=Math.ceil(o.qty/2);
function sale(o,cut,who){
  const src=who==='toi'?G.bag.p:G.stock,have=src[o.s]||0,n=Math.min(o.qty,have);
  if(n<Math.ceil(o.qty/2)){if(who==='toi')toast(`${o.name} veut ${o.qty} × ${SM[o.s].name}. Tu en as ${have} dans ton sac.`,'bad');return false}
  src[o.s]=have-n;let pay=Math.round(n*o.price*cut);
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
    o.ph+=dt*.8;{const dd=Math.hypot(P.x-o.x,P.z-o.z);if(dd<70)o.nang=Math.atan2(P.x-(o.x+2.8),P.z-o.z)}
    if(o.ttl<=0&&!o.by){removeOrder(o);continue}
    if(!o.by&&o.cd<=0&&Math.hypot(P.x-o.x,P.z-o.z)<9){if(!sale(o,1,'toi'))o.cd=4}
  }
  const want=Math.min(16,11+Math.floor(G.earned/5000));
  while(orders.length<want)genOrder();
}

/* ---------- police, gangs, livreurs ---------- */
let cops=[],gangs=[],couriers=[],spawnT=0,M=null,mMesh=null;
function updCops(dt){
  const carrying=bagTot()>0||M;
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
    if(d<6.5&&!inLab())c.catch+=dt*(P.v<8?2:1);else c.catch=Math.max(0,c.catch-dt*2);
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
  let lost=0;STRAINS.forEach(s=>{const n=Math.floor((G.bag.p[s.id]||0)*frac);G.bag.p[s.id]-=n;lost+=n});
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
      if(d<5&&g.cool<=0&&!inLab()){hitByGang(g,st);if(ended)return}
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
      for(const o of orders)if(!o.by&&canDeliver(o,G.stock)&&o.ttl>20){const d=Math.hypot(o.x-c.x,o.z-c.z);if(d<bd){bd=d;best=o}}
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
  if(bagTot()<10){toast('Il faut au moins 10 unités dans ton sac pour un go fast (remplis-le à la réserve du labo).','bad');return}
  let left=Math.min(bagTot(),50),value=0,units=0;
  for(const s of STRAINS.slice().sort((a,b)=>b.price-a.price)){
    const n=Math.min(left,G.bag.p[s.id]||0);if(n>0){G.bag.p[s.id]-=n;left-=n;units+=n;value+=n*s.price*3.5*(1+.08*lv('nego'))}}
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
  let lost=0;STRAINS.forEach(s=>{const n=Math.floor((G.bag.p[s.id]||0)*stockLoss);G.bag.p[s.id]-=n;lost+=n});
  const cl=Math.floor(G.cash*cashLoss);G.cash-=cl;
  const mm=M?M.units:0;if(M)endFast();HIDE=null;
  G.heat=10;cops=[];CAM.shake=8;Sfx.crash(.8);
  spawnHome();
  $('raidP').textContent=`Les flics t’ont coincé. Ils vident ton sac : ${lost+mm} unités perdues, et ${fmt(cl)} saisis.${al?' Ton avocat a limité la casse.':''} Casier : ${G.strikes}/${MAXSTRIKES}. À la troisième arrestation, c’est la prison.`;
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


/* ---------- le labo du joueur (on y entre à pied) et les QG des autres gangs ---------- */
let LM=[],LAB=null;
function roadsideSpot(x,z){
  const n=nearestNode(x,z),rd=ROADS[n.r],k=n.k,a=rd.pts[Math.max(0,k-1)],b=rd.pts[Math.min(rd.pts.length-1,k+1)];
  const dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz)||1,ux=dx/l,uz=dz/l;
  const ox=-uz,oz=ux,side=((x-n.x)*ox+(z-n.z)*oz)>=0?1:-1,off=rd.w/2-2.4;
  return {x:n.x+ox*side*off,z:n.z+oz*side*off,th:Math.atan2(ux,uz)};
}
function homeSpawn(){const [qx,qz]=QGP[G.home||'cite'],n=nearestNode(qx,qz);return {x:n.x,z:n.z,n}}
function placeLandmarks(){
  LM=[];
  for(const k in BLK)BLK[k]=BLK[k].filter(r=>!r.lm);
  for(const k of DKEYS){
    const [cx,cz]=QGP[k];
    if(k===G.home){LAB=buildLab(cx,cz);continue}
    LM.push({k,x:cx,z:cz,hs:6,col:hexn(DIS[k].col),st:sty(hexn(DIS[k].col))});addRectAll({x0:cx-6,x1:cx+6,z0:cz-6,z1:cz+6,lm:1});
  }
  labZoneSync(true);labSync(true);
}
/* repère local du labo : d = profondeur depuis la porte (vers l'intérieur), s = latéral (à droite en entrant) */
const LAB_D=17.4,LAB_W=25.4,DOOR_W=1.4;
function buildLab(cx,cz){
  const n=nearestNode(cx,cz),dx=n.x-cx,dz=n.z-cz;let nx=0,nz=0;
  if(Math.abs(dx)>Math.abs(dz))nx=Math.sign(dx)||1;else nz=Math.sign(dz)||1;
  const DN=LAB_D+.6,WT=LAB_W+.6,hx=nx?DN/2:WT/2,hz=nx?WT/2:DN/2;
  const sh={x0:cx-hx,x1:cx+hx,z0:cz-hz,z1:cz+hz,nx,nz,tx:nz,tz:-nx,D:LAB_D,W:LAB_W,fx:cx+nx*(DN/2-.3),fz:cz+nz*(DN/2-.3)};
  const L={sh,nx,nz,items:new Map(),zoneLv:-1,cx,cz};LAB=L;
  const W2=LAB_W/2,wall=(d0,d1,s0,s1,extra)=>{const r=Object.assign(lrect(d0,d1,s0,s1),{lm:1,h:6},extra||{});addRectAll(r);return r};
  sh.walls=[wall(-.3,0,-W2-.3,-DOOR_W),wall(-.3,0,DOOR_W,W2+.3),wall(LAB_D,LAB_D+.3,-W2-.3,W2+.3),wall(-.3,LAB_D+.3,-W2-.3,-W2),wall(-.3,LAB_D+.3,W2,W2+.3)];
  // meubles fixes (repère local) : on ne peut rien poser dessus
  sh.fixL=[
    {d0:.7,d1:1.7,s0:-5.6,s1:-2.9,k:'desk'},{d0:.7,d1:1.3,s0:-6.5,s1:-5.85,k:'cab'},
    {d0:2.2,d1:3.5,s0:W2-.75,s1:W2,k:'sink'},{d0:4.2,d1:4.9,s0:W2-.72,s1:W2-.05,k:'barrel'},
    {d0:6,d1:8.8,s0:-W2,s1:-W2+.8,k:'bench'},{d0:LAB_D-1.6,d1:LAB_D,s0:-W2,s1:-W2+3.4,k:'sacks'},
    {d0:.5,d1:1.3,s0:2.9,s1:6.2,k:'shelf'}];
  for(const f of sh.fixL)wall(f.d0,f.d1,f.s0,f.s1,{h:1.2});
  sh.door=(([x,z])=>({x,z}))(labWorld(-1.6,0));
  {const [x,z]=labWorld(2.5,-4.25);L.pc={x,z}}
  {const [x,z]=labWorld(2.85,W2-1.4);L.tap={x,z}}
  {const [x,z]=labWorld(2.0,4.55);L.res={x,z}}
  {const [x,z]=labWorld(3.1,1.5);L.spawn={x,z,th:Math.atan2(-nx,-nz)}}
  L.park=roadsideSpot(sh.door.x,sh.door.z);
  return L;
}
const labWorld=(d,s)=>{const sh=LAB.sh;return [sh.fx-sh.nx*d+sh.tx*s,sh.fz-sh.nz*d+sh.tz*s]};
function labLocal(x,z){const sh=LAB.sh,dx=x-sh.fx,dz=z-sh.fz;return [-(dx*sh.nx+dz*sh.nz),dx*sh.tx+dz*sh.tz]}
function lrect(d0,d1,s0,s1){const [ax,az]=labWorld(d0,s0),[bx,bz]=labWorld(d1,s1);return {x0:Math.min(ax,bx),x1:Math.max(ax,bx),z0:Math.min(az,bz),z1:Math.max(az,bz)}}
function inLab(x,z){if(!LAB)return false;if(x==null){x=P.x;z=P.z}const [d,s]=labLocal(x,z);return d>0&&d<LAB_D&&Math.abs(s)<LAB_W/2}
/* zone utilisable : une cloison au fond recule quand on agrandit le labo */
const ZONE_D=[9.2,11.4,14.2,16.0];
const labDmax=()=>lv('labo')>=ZONE_D.length?LAB_D:ZONE_D[lv('labo')];
function labZoneSync(force){
  const L=LAB;if(!L)return;const lvl=lv('labo');if(!force&&lvl===L.zoneLv)return;L.zoneLv=lvl;
  for(const k in BLK)BLK[k]=BLK[k].filter(r=>!r.zone);
  const Dm=labDmax();if(Dm>=LAB_D-.01)return;
  addRectAll(Object.assign(lrect(Dm,Dm+.25,-LAB_W/2,LAB_W/2),{lm:1,zone:1,h:6}));
  // si le joueur est derrière la cloison (vieille sauvegarde), on le ramène
  if(inLab()){const [d,s]=labLocal(P.x,P.z);if(d>Dm-.4){const [x,z]=labWorld(Dm-1,s);P.x=x;P.z=z}}
}
const FOOT={pot:.42,bac:.85,table:1.05,arroseur:.42,arroseur2:.52,sechoir:.7,sechoir2:.72,sechoir3:.75};
function placeOk(id,d,s,ignore){
  const h=FOOT[id]||.5,W2=LAB_W/2;
  if(d-h<2.7||d+h>labDmax()-.2||s-h<-W2+.45||s+h>W2-.45)return false;
  for(const r of LAB.sh.fixL)if(d+h>r.d0-.15&&d-h<r.d1+.15&&s+h>r.s0-.15&&s-h<r.s1+.15)return false;
  for(const it of G.lab.items){if(it===ignore)continue;const h2=FOOT[it.id]||.5;if(Math.abs(it.d-d)<h+h2+.25&&Math.abs(it.s-s)<h+h2+.25)return false}
  return true;
}
function labSync(force){
  const L=LAB;if(!L)return;
  const live=new Set(G.lab.items);
  for(const [it,e] of L.items)if(force||!live.has(it)||e.d!==it.d||e.s!==it.s||e.id!==it.id){for(const k in BLK)BLK[k]=BLK[k].filter(r=>r!==e.rect);L.items.delete(it)}
  for(const it of G.lab.items){
    if(L.items.has(it))continue;
    const [x,z]=labWorld(it.d,it.s),h=FOOT[it.id]||.5,rect={x0:x-h,x1:x+h,z0:z-h,z1:z+h,h:1.2,lm:1};addRectAll(rect);
    L.items.set(it,{rect,d:it.d,s:it.s,id:it.id,x,z});
  }
}

/* ---------- poser une machine où on veut ---------- */
let PLACE=null; // {id, item (si on déplace une machine), d, s, ok}
function startPlace(id,item){
  if(PLACE)cancelPlace(true);
  if(item){G.lab.items=G.lab.items.filter(x=>x!==item);labSync()}else{if(!(G.lab.store[id]>0))return;G.lab.store[id]--}
  PLACE={id,item:item||null,d:0,s:0,ok:false};updPlace();
  toast('Place la machine : aperçu vert = possible. « Poser ici » pour valider, « Options » pour annuler.');
}
function updPlace(){
  if(!PLACE||!LAB)return;
  if(!inLab()){cancelPlace();return}
  const h=FOOT[PLACE.id]||.5,fx=Math.sin(P.th),fz=Math.cos(P.th),ahead=h+1.15;
  let [d,s]=labLocal(P.x+fx*ahead,P.z+fz*ahead);d=Math.round(d*4)/4;s=Math.round(s*4)/4;
  PLACE.d=d;PLACE.s=s;PLACE.ok=placeOk(PLACE.id,d,s,null);
}
function dropPlace(){
  if(!PLACE||!PLACE.ok)return;
  const it=PLACE.item||{id:PLACE.id,pl:null};it.d=PLACE.d;it.s=PLACE.s;G.lab.items.push(it);
  PLACE=null;labSync();save();Sfx.click();
}
function cancelPlace(quiet){
  if(!PLACE)return;
  if(PLACE.item)G.lab.items.push(PLACE.item);else G.lab.store[PLACE.id]=(G.lab.store[PLACE.id]||0)+1;
  PLACE=null;labSync();save();if(!quiet)toast('Placement annulé.');
}

/* ---------- gestion du labo : planter, arroser, tailler, récolter, sécher ---------- */
const bestSeed=()=>(G.seeds[G.sel]||0)>0?G.sel:(STRAINS.slice().sort((a,b)=>b.price-a.price).find(s=>(G.seeds[s.id]||0)>0)||{}).id;
function harvestYield(it){const pl=it.pl,s=SM[pl.s],m=MM[it.id];return Math.max(1,Math.round(s.yield*yieldMult()*m.yld*(pl.pr===2?1.2:1)*(.6+.4*pl.hp/100)))}
function lRemove(it){if(!it||it.b)return;G.lab.items=G.lab.items.filter(x=>x!==it);G.lab.store[it.id]=(G.lab.store[it.id]||0)+1;labSync();save();toast(MM[it.id].name+' rangé dans ton stock.')}
function lPlant(it,s,quiet){if(!it||MM[it.id].cat!=='culture'||it.pl||!(G.seeds[s]>0))return false;G.seeds[s]--;it.pl={s,p:0,w:100,hp:100,pr:0};if(!quiet){G.sel=s;save()}return true}
function lWater(it){if(!it||!it.pl||it.pl.hp<=0)return;
  if(G.can<=0){toast('Arrosoir vide : remplis-le au robinet, à droite de l’entrée.','bad');return}
  G.can--;it.pl.w=100;floater(P.x,P.z,'Arrosé · arrosoir '+G.can+'/'+CAN_MAX,'#7fd1ff',false)}
function lTap(){G.can=CAN_MAX;floater(P.x,P.z,'Arrosoir rempli','#7fd1ff',false)}
function lPrune(it){if(it&&it.pl&&it.pl.pr===1){it.pl.pr=2;floater(P.x,P.z,'Taillée : +20 %','#9ccf6a',false)}}
function lClear(it){if(it)it.pl=null}
function lHarvest(it,quiet){
  if(!it||!it.pl||it.pl.p<1||it.pl.hp<=0)return false;
  const y=harvestYield(it);
  if(tot()+rawTot()+y>cap()){if(!quiet)toast('Plus de place dans la réserve du labo : vends ou agrandis ton stockage.','bad');return false}
  G.raw[it.pl.s]=(G.raw[it.pl.s]||0)+y;if(!quiet){floater(P.x,P.z,'+'+y+' récolte','#9ccf6a',true);toast(`+${y} × ${SM[it.pl.s].name} récoltés. Charge-les dans un séchoir pour pouvoir les vendre.`,'good')}
  it.pl=null;return true;
}
function lLoad(it,quiet){
  if(!it)return false;const m=MM[it.id];if(m.cat!=='transfo'||it.b)return false;
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
/* ce qu'il y a à faire juste devant soi, dans le labo */
function labTarget(){
  const L=LAB;if(!L)return null;
  if(PLACE)return PLACE.ok?{k:'drop',label:'Poser ici : '+MM[PLACE.id].name,opt:true}:{k:'info',label:'Pas de place ici : avance ou tourne-toi',opt:true};
  const fx=Math.sin(P.th),fz=Math.cos(P.th);
  let best=null,bd=1e9;
  for(const [it,e] of L.items){const dx=e.x-P.x,dz=e.z-P.z,dist=Math.hypot(dx,dz)-(FOOT[it.id]||.5);if(dist>1.4)continue;
    const facing=(dx*fx+dz*fz)/(Math.hypot(dx,dz)||1),score=dist-facing*.6;if(score<bd){bd=score;best=it}}
  const dpc=Math.hypot(P.x-L.pc.x,P.z-L.pc.z),dtap=Math.hypot(P.x-L.tap.x,P.z-L.tap.z),dres=Math.hypot(P.x-L.res.x,P.z-L.res.z);
  if(dtap<1.7&&(!best||dtap<bd+.4))return G.can>=CAN_MAX?{k:'info',label:`Robinet : ton arrosoir est plein (${G.can}/${CAN_MAX})`}:{k:'tap',label:`Remplir l’arrosoir (${G.can}/${CAN_MAX})`};
  if(dpc<1.8&&(!best||dpc<bd+.4))return {k:'pc',label:'Ordinateur : gérer le labo'};
  if(dres<1.8&&(!best||dres<bd+.4))return resTarget();
  if(best)return itemTarget(best);
  const [d]=labLocal(P.x,P.z);
  if(d<1.6)return null;
  const has=MACH.some(m=>(G.lab.store[m.id]||0)>0);
  return has?{k:'place',label:'Poser une machine ici'}:null;
}
function itemTarget(it){
  const m=MM[it.id];
  if(m.cat==='culture'){
    const pl=it.pl;
    if(!pl){const s=bestSeed();return s?{k:'plant',it,s,label:'Planter : '+SM[s].name,opt:true}:{k:'info',it,label:'Pas de graines : graineterie ou ordinateur',opt:true}}
    if(pl.hp<=0)return {k:'clear',it,label:'Arracher la plante fanée',opt:true};
    if(pl.p>=1)return {k:'harvest',it,label:`Récolter ${SM[pl.s].name} (+${harvestYield(it)})`,opt:true};
    if(pl.w<45)return G.can>0?{k:'water',it,label:`Arroser (arrosoir ${G.can}/${CAN_MAX})`,opt:true}:{k:'info',it,label:'Arrosoir vide : remplis-le au robinet, à droite de l’entrée',opt:true};
    if(pl.pr===1)return {k:'prune',it,label:'Tailler (+20 % de récolte)',opt:true};
    return G.can>0?{k:'water',it,label:`Arroser · ${SM[pl.s].name} ${Math.floor(pl.p*100)} %`,opt:true}:{k:'info',it,label:`${SM[pl.s].name} ${Math.floor(pl.p*100)} % · arrosoir vide`,opt:true};
  }
  if(m.cat==='transfo'){
    if(it.b)return {k:'info',it,label:`Séchage en cours : ${Math.floor(100*(1-it.b.t/m.time))} %`,opt:true};
    if(rawTot()>0)return {k:'load',it,label:`Charger le séchoir (${Math.min(m.batch,rawTot())} u.)`,opt:true};
    return {k:'info',it,label:'Séchoir vide : récolte des plantes pour le charger',opt:true};
  }
  return {k:'info',it,label:m.name+' : arrose les plantes autour',opt:true};
}
function labDo(t){
  switch(t.k){
    case 'pc':menuAt=null;openMenu('labo');return;
    case 'place':{const ids=MACH.filter(m=>(G.lab.store[m.id]||0)>0);if(ids.length===1)startPlace(ids[0].id);else placeDialog();return}
    case 'drop':dropPlace();return;
    case 'take':bagTake();return;
    case 'plant':lPlant(t.it,t.s);break;
    case 'water':lWater(t.it);break;
    case 'tap':lTap();break;
    case 'prune':lPrune(t.it);break;
    case 'harvest':lHarvest(t.it);break;
    case 'clear':lClear(t.it);break;
    case 'load':lLoad(t.it);break;
  }
  save();
}
function placeDialog(){
  const ch=MACH.filter(m=>(G.lab.store[m.id]||0)>0).map(m=>({label:`${m.name} (${G.lab.store[m.id]} en stock)`,desc:m.desc,quick:1,fn:()=>startPlace(m.id)}));
  ch.push({label:'Fermer',close:1});
  openDialog('Poser une machine','#8fbf4a',{text:'Choisis la machine. Tu la places ensuite toi-même, devant toi.',choices:ch},()=>{});
}
function labOptions(t){
  if(t.k==='drop'||(PLACE&&t.k==='info')){openDialog('Placement','#8fbf4a',{text:'Pour placer la machine, avance ou tourne-toi : l’aperçu devient vert quand il y a la place.',choices:[{label:'Annuler le placement',quick:1,fn:()=>cancelPlace()},{label:'Continuer',close:1}]},()=>{});return}
  if(t.k==='take'||t.res){resOptions();return}
  const it=t.it;if(!it)return;
  const m=MM[it.id],ch=[];
  if(m.cat==='culture'){
    if(!it.pl){for(const v of STRAINS)if((G.seeds[v.id]||0)>0)ch.push({label:`Planter ${v.name} (${G.seeds[v.id]} graine${G.seeds[v.id]>1?'s':''})`,desc:`Pousse en ${v.time} s · ${v.yield} u. par plante · vente ~${fmt(v.price)}/u.`,quick:1,fn:()=>lPlant(it,v.id)});
      if(!ch.length)ch.push({label:'Aucune graine en stock',desc:'Achète des graines à la graineterie ou commande-les à l’ordinateur du labo.',off:1})}
    else if(it.pl.hp>0){ch.push({label:'Arroser',desc:G.can>0?`Eau de la plante : ${Math.round(it.pl.w)} % · arrosoir ${G.can}/${CAN_MAX}`:'Arrosoir vide : remplis-le au robinet.',off:G.can<=0,quick:1,fn:()=>lWater(it)});
      if(it.pl.pr===1)ch.push({label:'Tailler',desc:'+20 % de récolte.',quick:1,fn:()=>lPrune(it)});
      if(it.pl.p>=1)ch.push({label:'Récolter',desc:`+${harvestYield(it)} unités de récolte.`,quick:1,fn:()=>lHarvest(it)});
      ch.push({label:'Arracher la plante',desc:'Elle sera perdue.',quick:1,fn:()=>lClear(it)})}
    else ch.push({label:'Arracher la plante fanée',quick:1,fn:()=>lClear(it)});
  }
  if(m.cat==='transfo'&&!it.b&&rawTot()>0)ch.push({label:'Charger le séchoir',desc:`Jusqu’à ${m.batch} unités, ${m.time} s.`,quick:1,fn:()=>lLoad(it)});
  const busy=!!it.b||!!(it.pl&&it.pl.hp>0&&it.pl.p>0);
  ch.push({label:'Déplacer : '+m.name,desc:busy?'Impossible tant qu’elle travaille (plante ou séchage en cours).':'Tu la reposes où tu veux.',off:busy,quick:1,fn:()=>{it.pl=null;startPlace(it.id,it)}});
  ch.push({label:'Ranger : '+m.name,desc:it.b?'Impossible pendant le séchage.':it.pl&&it.pl.hp>0?'Retourne dans ton stock. La plante sera perdue.':'Retourne dans ton stock.',off:!!it.b,quick:1,fn:()=>lRemove(it)});
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
      if(it.b.t<=0){const out=Math.round(it.b.n*m.bonus);G.stock[it.b.s]=(G.stock[it.b.s]||0)+out;toast(`Séchoir : +${out} × ${SM[it.b.s].name} dans la réserve du labo.`,'good');it.b=null}}
  }
  labT+=dt;
  if(labT>=1){labT=0;
    for(const a of G.lab.items){const m=MM[a.id];if(m.cat!=='eau')continue;const R0=m.radius===1?3.4:5.8;
      for(const o of G.lab.items)if(o.pl&&o.pl.hp>0&&Math.hypot(o.d-a.d,o.s-a.s)<=R0)o.pl.w=100}
    gardener();
  }
}
let readyT=0;const toastReady=s=>{if(G.t-readyT>20){readyT=G.t;toast(`${s.name} est prête à récolter au labo.`,'good')}};
function gardener(){
  let n=lv('jardinier')*4;if(!n)return;
  const cult=G.lab.items.filter(it=>MM[it.id].cat==='culture').sort((a,b)=>a.d-b.d||a.s-b.s);
  for(const it of cult){if(n<=0)break;n--;
    if(it.pl){if(it.pl.hp<=0)it.pl=null;else if(it.pl.p>=1){if(!lHarvest(it,true))continue}else{it.pl.w=100;if(it.pl.pr===1)it.pl.pr=2;continue}}
    if(!it.pl){const s=bestSeed();if(s)lPlant(it,s,true)}}
  for(const it of G.lab.items)if(MM[it.id].cat==='transfo'&&!it.b&&rawTot()>0)lLoad(it,true);
}
function labAlerts(){
  let dry=0,ready=0,dead=0,prune=0;
  for(const it of G.lab.items){const pl=it.pl;if(!pl)continue;if(pl.hp<=0)dead++;else if(pl.p>=1)ready++;else if(pl.w<30)dry++;else if(pl.pr===1)prune++}
  const a=[];if(ready)a.push(ready+' prête'+(ready>1?'s':''));if(dry)a.push(dry+' à arroser');if(prune)a.push(prune+' à tailler');if(dead)a.push(dead+' fanée'+(dead>1?'s':''));
  return {txt:a.join(' · '),bad:dry>0||dead>0};
}

/* ---------- dessin du labo ---------- */
/* intérieur (vu d'en haut, le toit enlevé) quand on est dedans ; toit de serre vu de dehors sinon */
const lpoly=(pts)=>{ctx.beginPath();pts.forEach(([d,s],i)=>{const [x,z]=labWorld(d,s);i?ctx.lineTo(x,z):ctx.moveTo(x,z)});ctx.closePath()};
function lfill(d0,d1,s0,s1,c){ctx.fillStyle=c;const r=lrect(d0,d1,s0,s1);ctx.fillRect(r.x0,r.z0,r.x1-r.x0,r.z1-r.z0)}
function lbox(d0,d1,s0,s1,h,col,o){const r=lrect(d0,d1,s0,s1);return box(r.x0,r.z0,r.x1,r.z1,0,h,typeof col==='object'?col:sty(col),o||null)}
function plantTop(x,z,p,hp,ready,sz,t){
  const dead=hp<=0,n=5+Math.floor(Math.min(1,p)*4),len=(.16+.5*Math.min(1,p))*sz;
  const g=dead?'#6b4a2a':hp<40?'#a08a3a':hp<75?'#7aa03a':'#4f9a2f',gl=dead?'#8a6a40':hp<40?'#c0a850':'#7fc54a';
  ctx.save();ctx.translate(x,z);
  for(let i=0;i<n;i++){const a=i/n*6.283+(dead?0:Math.sin(t*1.2+x+i)*.05);ctx.save();ctx.rotate(a);
    ctx.fillStyle=i%2?g:gl;ctx.beginPath();ctx.ellipse(len*.55,0,len*.55,len*.17,0,0,6.3);ctx.fill();
    ctx.strokeStyle='rgba(20,40,10,.5)';ctx.lineWidth=.02;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(len,0);ctx.stroke();ctx.restore()}
  if(ready&&!dead){for(let i=0;i<6;i++){const a=i/6*6.283+.3;el(ctx,Math.cos(a)*len*.45,Math.sin(a)*len*.45,.07*sz,.07*sz,i%2?'#e8f5c0':'#d8b0ff')}el(ctx,0,0,.1*sz,.1*sz,'#c98aff')}
  else el(ctx,0,0,.06*sz,.06*sz,dead?'#5a3a20':'#3f7a24');
  ctx.restore();
}
function drawMachine(it,d,s,t,ghost){
  const m=MM[it.id],[x,z]=labWorld(d,s);
  if(ghost){ctx.globalAlpha=.55}
  if(it.id==='pot'){el(ctx,x+.08,z+.08,.38,.38,'rgba(0,0,0,.25)');el(ctx,x,z,.38,.38,ghost||'#a0502e');el(ctx,x,z,.31,.31,ghost?'rgba(0,0,0,.2)':'#3a2a1c')}
  else if(it.id==='bac'){lbox(d-.42,d+.42,s-.78,s+.78,.55,ghost?{N:ghost,W:ghost,E:ghost,S:ghost,R:ghost}:0x4a5a4a);if(!ghost){lfill(d-.32,d+.32,s-.68,s+.68,'#3a2a1c')}}
  else if(it.id==='table'){lbox(d-.6,d+.6,s-.98,s+.98,.95,ghost?{N:ghost,W:ghost,E:ghost,S:ghost,R:ghost}:0xdfe3e6);if(!ghost){const r=lrect(d-.5,d+.5,s-.9,s+.9),f=1+.95*KP,cx=RC.x,cz=RC.z;
      const X=v=>cx+(v-cx)*f,Z=v=>cz+(v-cz)*f;ctx.fillStyle='#2f6f96';ctx.fillRect(X(r.x0),Z(r.z0),X(r.x1)-X(r.x0),Z(r.z1)-Z(r.z0));
      ctx.strokeStyle='#eef0f2';ctx.lineWidth=.08;ctx.beginPath();for(let k=1;k<4;k++){const a=k/4;ctx.moveTo(X(r.x0)+(X(r.x1)-X(r.x0))*a,Z(r.z0));ctx.lineTo(X(r.x0)+(X(r.x1)-X(r.x0))*a,Z(r.z1))}ctx.stroke()}}
  else if(m.cat==='eau'){const big=it.id==='arroseur2',r=big?.48:.38;el(ctx,x,z,r,r,ghost||'#2f6f96');el(ctx,x,z,r*.55,r*.55,ghost?'rgba(0,0,0,.2)':'#24587a');
    if(!ghost){const a=t*2.4;ctx.strokeStyle='#b8bcc2';ctx.lineWidth=.08;ctx.beginPath();ctx.moveTo(x-Math.cos(a)*r*1.2,z-Math.sin(a)*r*1.2);ctx.lineTo(x+Math.cos(a)*r*1.2,z+Math.sin(a)*r*1.2);ctx.stroke();
      const R0=m.radius===1?3.4:5.8;ctx.strokeStyle='rgba(127,209,255,.18)';ctx.lineWidth=.06;ctx.setLineDash([.3,.3]);ctx.beginPath();ctx.arc(x,z,R0,0,6.3);ctx.stroke();ctx.setLineDash([]);
      for(let k=0;k<3;k++){const f=(t*.8+k/3)%1;ctx.strokeStyle=`rgba(127,209,255,${(1-f)*.35})`;ctx.lineWidth=.07;ctx.beginPath();ctx.arc(x,z,r+f*(R0-r),a+k*2,a+k*2+.7);ctx.stroke()}}}
  else if(m.cat==='transfo'){const h=FOOT[it.id]||.7,col=[0,0x8d9096,0x5f7488,0x3a3d42][m.tier];
    const rr0=lbox(d-h*.75,d+h*.75,s-h,s+h,1.7+.25*m.tier,ghost?{N:ghost,W:ghost,E:ghost,S:ghost,R:ghost}:col);
    if(!ghost){const cx=(rr0[0]+rr0[2])/2,cz=(rr0[1]+rr0[3])/2;ctx.fillStyle=it.b?`rgba(255,176,96,${.7+.3*Math.sin(t*5)})`:'#2a2c30';ctx.fillRect(cx-.35,cz-.35,.7,.7);
      for(let k=0;k<3;k++){ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(rr0[0]+.15,rr0[1]+.2+k*.3,(rr0[2]-rr0[0])-.3,.08)}
      if(it.b){const f=1-it.b.t/m.time;ctx.fillStyle='#2a2c30';ctx.fillRect(rr0[0],rr0[3]+.15,rr0[2]-rr0[0],.16);ctx.fillStyle='#ffb060';ctx.fillRect(rr0[0],rr0[3]+.15,(rr0[2]-rr0[0])*f,.16)}}}
  ctx.globalAlpha=1;
  if(!ghost&&m.cat==='culture'&&it.pl){const pl=it.pl,sz=it.id==='pot'?1:it.id==='bac'?1.35:1.6;
    const lift=it.id==='pot'?0:it.id==='bac'?.55:.95,f=1+lift*KP,px=RC.x+(x-RC.x)*f,pz=RC.z+(z-RC.z)*f;
    if(it.id==='pot')plantTop(px,pz,pl.p,pl.hp,pl.p>=1,sz,t);
    else{const r=lrect(d,d,s-.5,s+.5);plantTop(RC.x+(r.x0-RC.x)*f,RC.z+(r.z0-RC.z)*f,pl.p,pl.hp,pl.p>=1,sz*.8,t);plantTop(RC.x+(r.x1-RC.x)*f,RC.z+(r.z1-RC.z)*f,pl.p,pl.hp,pl.p>=1,sz*.8,t)}
    // barres : croissance (vert) et eau (bleu)
    const bx=x-.55,bz=z+(FOOT[it.id]||.5)+.25;
    ctx.fillStyle='rgba(20,15,13,.75)';ctx.fillRect(bx-.05,bz-.05,1.2,.42);
    ctx.fillStyle=pl.hp<=0?'#e0503a':'#9ccf6a';ctx.fillRect(bx,bz,1.1*Math.min(1,pl.p),.14);
    ctx.fillStyle=pl.w<30?'#ff9a7a':'#5fb0e0';ctx.fillRect(bx,bz+.18,1.1*pl.w/100,.14)}
}
function drawLabInside(now){
  const L=LAB;if(!L)return;
  const t=now/1000,W2=LAB_W/2,Dm=labDmax();
  // sol : béton, zone verrouillée derrière la cloison, paillasson, marquage jaune
  lfill(0,LAB_D,-W2,W2,'#6d7176');
  if(PAT.conc){ctx.globalAlpha=.35;ctx.fillStyle=PAT.conc;const r=lrect(0,LAB_D,-W2,W2);ctx.fillRect(r.x0,r.z0,r.x1-r.x0,r.z1-r.z0);ctx.globalAlpha=1}
  if(Dm<LAB_D){lfill(Dm,LAB_D,-W2,W2,'#2a2624');ctx.strokeStyle='rgba(255,166,61,.25)';ctx.lineWidth=.25;ctx.beginPath();for(let s=-W2;s<W2;s+=1.6){const [ax,az]=labWorld(Dm,s),[bx,bz]=labWorld(LAB_D,s+1.6);ctx.moveTo(ax,az);ctx.lineTo(bx,bz)}ctx.stroke()}
  lfill(0,1.1,-1.1,1.1,'#2a2622');
  ctx.strokeStyle='#e0b020';ctx.lineWidth=.12;ctx.setLineDash([.6,.4]);lpoly([[2.6,-W2+.9],[2.6,W2-.9],[Dm-.2,W2-.9],[Dm-.2,-W2+.9]]);ctx.stroke();ctx.setLineDash([]);
  // lumière des rampes de culture (violette)
  for(let r=0;r<4;r++){const d=4.6+r*3;if(d>Dm)break;lfill(d-1.1,d+1.1,-W2+.6,W2-.6,'rgba(201,138,255,.07)');lfill(d-.15,d+.15,-W2+.8,W2-.8,'rgba(230,190,255,.12)')}
  // murs
  for(const w of L.sh.walls)box(w.x0,w.z0,w.x1,w.z1,0,2.6,sty(0xd9d3c7),null);
  if(Dm<LAB_D){const r=lbox(Dm,Dm+.25,-W2,W2,2.6,0xcfc8bb);const [sx,sz]=labWorld(Dm-.9,0);
    ctx.font='700 .62px "Work Sans",sans-serif';ctx.textAlign='center';ctx.fillStyle='rgba(20,15,13,.8)';const tw=ctx.measureText('AGRANDIR À L’ORDINATEUR').width+.6;ctx.fillRect(sx-tw/2,sz-.5,tw,.75);ctx.fillStyle='#ffa63d';ctx.fillText('AGRANDIR À L’ORDINATEUR',sx,sz+.05)}
  // meubles : bureau et ordinateur, chaise, caisson, évier et robinet, tonneau, établi, sacs, étagères
  lbox(.7,1.7,-5.6,-2.9,.8,0x6b5440);
  {const r=lbox(1.0,1.1,-4.8,-3.6,1.62,0x15161a);ctx.fillStyle=`rgba(79,179,255,${.55+.25*Math.sin(t*2)})`;ctx.fillRect(r[0],r[1],r[2]-r[0],r[3]-r[1])}
  lbox(1.2,1.5,-4.4,-4.0,.84,0x24262b);lbox(1.15,1.5,-3.35,-3.0,.84,0xf2efe8);
  {const [x,z]=labWorld(2.1,-4.25);el(ctx,x,z,.38,.38,'#2a2c30');el(ctx,x,z,.28,.28,'#3a3d42')}
  lbox(.7,1.3,-6.5,-5.85,1.1,0x8d9096);
  lbox(2.2,3.5,W2-.75,W2,.9,0x9aa0a6);{const r=lrect(2.4,3.3,W2-.6,W2-.12);ctx.fillStyle='#4f5660';ctx.fillRect(r.x0,r.z0,r.x1-r.x0,r.z1-r.z0)}
  {const [x,z]=labWorld(2.85,W2-.15);el(ctx,x,z,.14,.14,'#c0392b');el(ctx,x,z,.07,.07,'#e9ecef')}
  {const [x,z]=labWorld(3.75,W2-.45);el(ctx,x,z,.24,.24,'#3f7a4a');el(ctx,x,z,.14,.14,'#2f5a3a')} // arrosoir posé
  {const [x,z]=labWorld(4.55,W2-.38);el(ctx,x,z,.36,.36,'#2f6f96');el(ctx,x,z,.24,.24,'#24587a')}
  lbox(6,8.8,-W2,-W2+.8,.95,0x8a6a48);{const r=lrect(6.3,6.8,-W2+.2,-W2+.6);ctx.fillStyle='#c0392b';ctx.fillRect(r.x0,r.z0,r.x1-r.x0,r.z1-r.z0)}
  const sacks=[0xb89a6a,0x8a6d4a,0x5f8a35,0xd9d4c0];
  for(let i=0;i<7;i++){const d=LAB_D-1.5+(i%2)*.7,s=-W2+.3+Math.floor(i/2)*.9;lbox(d,d+.65,s,s+.8,.4+(i>=6?.4:0),sacks[i%4])}
  lbox(.5,1.3,2.9,6.2,2.3,0x6b5440);
  for(let i=0;i<5;i++){const s=3.05+i*.6,col=sacks[i%4];const r=lrect(.6,1.2,s,s+.45),f=1+2.3*KP;ctx.fillStyle=hex2(col);ctx.fillRect(RC.x+(r.x0-RC.x)*f,RC.z+(r.z0-RC.z)*f,(r.x1-r.x0)*f,(r.z1-r.z0)*f)}
  {const [x,z]=labWorld(.33,1.8);el(ctx,x,z,.14,.14,'#c0392b')} // extincteur
  // machines, puis l'aperçu de celle qu'on place
  const its=G.lab.items.slice().sort((a,b)=>b.d-a.d);
  for(const it of its)drawMachine(it,it.d,it.s,t,null);
  if(PLACE)drawMachine({id:PLACE.id},PLACE.d,PLACE.s,t,PLACE.ok?'rgba(127,224,138,1)':'rgba(255,90,64,1)');
}
function drawLabRoof(now){
  const L=LAB;if(!L)return;const sh=L.sh;
  if(!inView(L.cx,L.cz,40))return;
  const r=box(sh.x0,sh.z0,sh.x1,sh.z1,0,4.2,sty(0x7a5a4a),{win:true,litD:[1.7,1.3],offs:2,seed:4});
  const gl=box(sh.x0+.8,sh.z0+.8,sh.x1-.8,sh.z1-.8,4.2,6.4,{N:'rgba(150,215,110,.55)',W:'rgba(130,195,95,.55)',E:'rgba(100,160,75,.55)',S:'rgba(85,140,62,.55)',R:'rgba(140,210,100,.5)',L:'#cfe9a8'},{});
  const w=gl[2]-gl[0],h=gl[3]-gl[1],t=now/1000,pul=.55+.25*Math.sin(t*2);
  ctx.fillStyle=`rgba(201,138,255,${.25+.2*pul})`;for(let k=0;k<4;k++){ctx.fillRect(gl[0]+w*.08,gl[1]+h*(.15+k*.2),w*.84,h*.06)}
  ctx.strokeStyle='rgba(235,245,215,.65)';ctx.lineWidth=.35;ctx.beginPath();
  for(let k=1;k<10;k++){ctx.moveTo(gl[0]+w*k/10,gl[1]);ctx.lineTo(gl[0]+w*k/10,gl[3])}for(let k=1;k<6;k++){ctx.moveTo(gl[0],gl[1]+h*k/6);ctx.lineTo(gl[2],gl[1]+h*k/6)}ctx.stroke();ctx.strokeRect(gl[0],gl[1],w,h);
  ctx.font='700 4.2px "Bowlby One",Impact,sans-serif';ctx.textAlign='center';ctx.fillStyle='#e9ffd0';ctx.strokeStyle='rgba(15,25,8,.8)';ctx.lineWidth=.6;ctx.strokeText('LA SERRE',(gl[0]+gl[2])/2,(gl[1]+gl[3])/2+1.6);ctx.fillText('LA SERRE',(gl[0]+gl[2])/2,(gl[1]+gl[3])/2+1.6);
}
/* devant la porte : auvent, enseigne au néon, cercle d'entrée */
function drawLabDoor(now){
  const L=LAB;if(!L||!inView(L.sh.door.x,L.sh.door.z,20))return;
  const W=DOOR_W+.6;ctx.globalAlpha=1;
  lfill(-1.4,0,-W,W,'#3a2a4a');for(let k=0;k<6;k++)lfill(-1.4,-1.2,-W+k*W/3,-W+(k+.5)*W/3,'#c98aff');
  if(!inLab()&&P.def.kind==='foot'){const f=(now/1200)%1;ring(L.sh.door.x,L.sh.door.z,1.4+f*2.2,'#c98aff',.35,(1-f)*.8)}
}
/* étiquettes du labo (dans le repère de l'écran) */
function labHUD(){
  const L=LAB;if(!L||!inLab())return;
  const near=(o,r)=>Math.hypot(P.x-o.x,P.z-o.z)<r;
  if(near(L.pc,5)){const q=toScr(L.pc.x,L.pc.z);pill(q[0],q[1]-20,'Ordinateur','#4fb3ff','Gérer le labo, commander')}
  if(near(L.tap,5)){const q=toScr(L.tap.x,L.tap.z);pill(q[0],q[1]-20,'Robinet','#5fb0e0','Arrosoir '+G.can+'/'+CAN_MAX)}
  if(near(L.res,5)){const q=toScr(L.res.x,L.res.z);pill(q[0],q[1]-24,'Réserve du labo','#ffa63d',`${tot()} u. de produit · récolte ${rawTot()}`)}
  if(tgt&&tgt.it){const e=L.items.get(tgt.it);if(e){const it=tgt.it,m=MM[it.id],q=toScr(e.x,e.z);
    const name=m.cat==='culture'&&it.pl?SM[it.pl.s].name:m.name;
    const st=m.cat==='culture'?(it.pl?(it.pl.hp<=0?'Fanée':it.pl.p>=1?'Prête !':`${Math.floor(it.pl.p*100)} % · eau ${Math.round(it.pl.w)} %`):'Vide : à planter'):m.cat==='transfo'?(it.b?`${it.b.n} × ${SM[it.b.s].name} · ${Math.floor(100*(1-it.b.t/m.time))} %`:'Vide'):'Arrose autour';
    pill(q[0],q[1]-(FOOT[it.id]||.5)*CAM.zoom-14,name,'#8fbf4a',st)}}
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


/* ---------- sac à dos : ce que tu portes sur toi (produit à vendre, objets) ---------- */
/* une place = 10 unités d'une variété, ou 5 objets identiques. Le produit séché arrive dans la réserve du labo : on remplit le sac aux étagères. */
const BAGS=[{name:'Sac à dos',places:6},{name:'Sac de randonnée',places:10},{name:'Sac tactique',places:16},{name:'Sac de voyage XXL',places:24}];
const PROD_STACK=10,ITEM_STACK=5;
const bagTot=()=>sumS(G.bag.p);
const bagPlaces=()=>BAGS[G.bag.lv].places;
function bagUsed(){let n=0;for(const s of STRAINS)n+=Math.ceil((G.bag.p[s.id]||0)/PROD_STACK);for(const id in G.bag.it)n+=Math.ceil((G.bag.it[id]||0)/ITEM_STACK);return n}
function bagRoomProd(s){const have=G.bag.p[s]||0,free=Math.max(0,bagPlaces()-bagUsed());return free*PROD_STACK+(have%PROD_STACK?PROD_STACK-have%PROD_STACK:0)}
function bagRoomItem(id){const have=G.bag.it[id]||0,free=Math.max(0,bagPlaces()-bagUsed());return free*ITEM_STACK+(have%ITEM_STACK?ITEM_STACK-have%ITEM_STACK:0)}
function bagAddProd(s,n){const k=Math.min(n,bagRoomProd(s));if(k>0)G.bag.p[s]=(G.bag.p[s]||0)+k;return Math.max(0,k)}
function bagAddItem(id,n){const k=Math.min(n,bagRoomItem(id));if(k>0)G.bag.it[id]=(G.bag.it[id]||0)+k;return Math.max(0,k)}
function bagTake(){
  let moved=0;
  for(const s of STRAINS.slice().sort((a,b)=>b.price-a.price)){const n=G.stock[s.id]||0;if(!n)continue;const k=bagAddProd(s.id,n);G.stock[s.id]-=k;moved+=k}
  if(moved){floater(P.x,P.z,'+'+moved+' dans le sac','#ffa63d',true);toast(`Tu prends ${moved} unités de produit dans ton sac (${bagUsed()}/${bagPlaces()} places).`,'good')}
  else toast(tot()?'Ton sac est plein : prends un sac plus grand dans une boutique de vêtements.':'La réserve du labo est vide : sèche ta récolte d’abord.','bad');
  save();
}
function bagDrop(){
  let moved=0;
  for(const s of STRAINS){const n=G.bag.p[s.id]||0;if(!n)continue;const k=Math.min(n,Math.max(0,cap()-tot()-rawTot()));G.stock[s.id]=(G.stock[s.id]||0)+k;G.bag.p[s.id]-=k;moved+=k}
  toast(moved?`${moved} unités reposées dans la réserve du labo.`:'Rien à déposer, ou la réserve est pleine.',moved?'good':'bad');save();
}
function resTarget(){return tot()>0?{k:'take',label:`Remplir mon sac (réserve : ${tot()} u.)`,opt:true}:{k:'info',res:1,label:'Réserve du labo vide : sèche ta récolte d’abord',opt:bagTot()>0}}
function resOptions(){
  openDialog('Réserve du labo','#ffa63d',{text:`Réserve : ${tot()} u. de produit. Ton sac : ${bagTot()} u., ${bagUsed()}/${bagPlaces()} places.`,choices:[
    {label:'Remplir mon sac',desc:'Les variétés les plus chères d’abord.',off:!tot(),quick:1,fn:bagTake},
    {label:'Déposer le produit de mon sac',desc:'Il retourne dans la réserve.',off:!bagTot(),quick:1,fn:bagDrop},
    {label:'Fermer',close:1}]},()=>{});
}
let bagOpen=false;
function openBag(){if(!started||ended)return;bagOpen=true;for(const k in keys)keys[k]=0;$('bag').hidden=false;renderBag()}
function closeBag(){bagOpen=false;$('bag').hidden=true}
function renderBag(){
  const B=BAGS[G.bag.lv],used=bagUsed(),cells=[];
  for(const s of STRAINS){let n=G.bag.p[s.id]||0;while(n>0){const k=Math.min(PROD_STACK,n);cells.push(`<div class="bagc prod"><b>${s.name}</b><span>${k} u.</span></div>`);n-=k}}
  for(const id in G.bag.it){const g=GOODS[id];let n=G.bag.it[id]||0;if(!g)continue;while(n>0){const k=Math.min(ITEM_STACK,n);cells.push(`<div class="bagc obj"><b>${g.name}</b><span>× ${k}</span><button class="btn" data-use="${id}">Utiliser</button></div>`);n-=k}}
  while(cells.length<B.places)cells.push('<div class="bagc empty">libre</div>');
  let h=`<p class="note">${B.name} : <b>${used}/${B.places}</b> places · ${bagTot()} u. de produit. Une place = ${PROD_STACK} unités d’une variété ou ${ITEM_STACK} objets identiques.</p><div class="bagGrid">${cells.join('')}</div>`;
  h+=`<p class="note">Remplis ton sac à la réserve du labo, sur les étagères à droite de l’entrée : les clients se servent dans ton sac.${G.bag.lv<3?' Pour un sac plus grand : boutiques de vêtements (Fripe & Co, Le Dressing).':''}</p>`;
  if(bagTot())h+='<div class="chips"><button class="btn ghost" data-dump="1">Jeter tout le produit (si la police te colle)</button></div>';
  $('bagBody').innerHTML=h;$('bagTitle').textContent=B.name;
}
function useItem(id){const g=GOODS[id];if(!g||!g.use||!(G.bag.it[id]>0))return;G.bag.it[id]--;if(!G.bag.it[id])delete G.bag.it[id];toast(g.use(),'good');save();renderBag()}
$('bag').addEventListener('click',e=>{
  const u=e.target.closest('[data-use]');if(u){useItem(u.dataset.use);return}
  if(e.target.closest('[data-dump]')){const n=bagTot();G.bag.p={};toast(`Tu jettes ${n} unités dans une bouche d’égout. Plus rien sur toi.`,'bad');save();renderBag()}
});
$('bagClose').onclick=closeBag;$('bBag').onclick=openBag;$('hBagBox').onclick=openBag;

/* ---------- frapper et dépouiller (à pied, sur les passants) ---------- */
const PUNCH_TIME=.38;let punchT=0,punchHit=false;
function doPunch(){if(!started||P.def.kind!=='foot'||punchT>0||paused()||PLACE)return;punchT=PUNCH_TIME;punchHit=false;Sfx.init()}
function updCombat(dt){
  if(punchT<=0)return;punchT-=dt;
  if(punchHit||punchT>PUNCH_TIME*.55)return;punchHit=true;
  const fx=Math.sin(P.th),fz=Math.cos(P.th);let hit=null,bd=3.4;
  for(const p of peds){if(p.ko>0)continue;const dx=p.x-P.x,dz=p.z-P.z,d=Math.hypot(dx,dz);if(d<bd&&(dx*fx+dz*fz)/(d||1)>.4){bd=d;hit=p}}
  if(hit)hitPed(hit,fx,fz);
}
function hitPed(p,fx,fz){
  p.hp=(p.hp==null?100:p.hp)-R(30,45);p.jvx=fx*9;p.jvz=fz*9;p.hold=0;
  CAM.shake=Math.max(CAM.shake,2.5);Sfx.crash(.25);
  G.heat=Math.min(100,G.heat+5*heatMult());
  if(cops.some(c=>Math.hypot(c.x-P.x,c.z-P.z)<60))G.heat=Math.max(G.heat,70);
  if(p.hp<=0){p.ko=35;p.looted=0;p.flee=0;floater(p.x,p.z,'KO','#ffd24a',true);toast(`${p.name} est KO. Tu peux le dépouiller.`)}
  else{p.flee=7;p.fset=0;floater(p.x,p.z,pick(['Aïe !','Arrête !','Au secours !','Hé, ça va pas ?!']),'#ff9a7a',false)}
}
/* appelé pour chaque passant dans updPeds : KO = ne bouge plus ; frappé = s'enfuit en courant */
function pedSpecial(p,dt){
  if(p.ko>0){p.ko-=dt;if(p.ko<=0){p.hp=60;p.flee=8;p.fset=0}return true}
  if(p.flee>0){
    if(!p.fset){p.fset=1;p.sp0=p.sp0||p.sp;p.sp=4.6;const q=roadPos(p.r,p.s,0);p.dir=((p.x-P.x)*q[2]+(p.z-P.z)*q[3])>=0?1:-1}
    p.flee-=dt;if(p.flee<=0){p.sp=p.sp0||1.4;p.fset=0}}
  return false;
}
function lootPed(p){
  if(!p||!(p.ko>0)||p.looted)return;p.looted=1;
  const cash=RI(5,70),got=['+'+fmt(cash)];G.cash+=cash;G.earned+=cash;
  if(Math.random()<.35){const id=pick(['tisane','lunettes','barbe','engrais']);if(bagAddItem(id,1))got.push(GOODS[id].name)}
  if(Math.random()<.15){const s=pick(STRAINS.filter(v=>G.unlocked[v.id])),k=bagAddProd(s.id,RI(1,3));if(k)got.push(k+' × '+s.name)}
  G.heat=Math.min(100,G.heat+4*heatMult());coins(p.x,p.z,8);Sfx.cash();
  toast(`Tu fouilles ${p.name} : ${got.join(', ')}.`,'good');save();
}
$('bPunch').addEventListener('pointerdown',e=>{e.preventDefault();doPunch()});


/* ---------- vie de la ville : bancs, poubelles, bouches d'incendie, bacs à fleurs, abribus, terrasse de café, gens assis ou qui discutent, pigeons ---------- */
/* placement à graine fixe : tout le monde voit les mêmes bancs au même endroit */
const CITY={props:[],npc:[],flocks:[]};
const PS=1.6; // le mobilier est dessiné à l'échelle des personnages (grossis pour la lisibilité)
function buildCityLife(){
  const rr=mulberry32(4242),RR=(a,b)=>a+rr()*(b-a);
  const taken=[];
  const nearTaken=(x,z,d)=>taken.some(p=>Math.abs(p[0]-x)<d&&Math.abs(p[1]-z)<d&&Math.hypot(p[0]-x,p[1]-z)<d);
  const nearDoor=(x,z)=>SHOPS.some(s=>Math.hypot(s.x-x,s.z-z)<9)||(LAB&&Math.hypot(LAB.sh.door.x-x,LAB.sh.door.z-z)<12);
  const nearLamp=(x,z)=>lampList.some(L=>Math.abs(L.px-x)<2.4&&Math.abs(L.pz-z)<2.4);
  const okAt=(x,z,r)=>{
    for(const [ox,oz] of [[0,0],[r,0],[-r,0],[0,r],[0,-r]]){const m=maskAt(x+ox,z+oz);if(m===1||m===2||m===4||m===5)return false}
    return pointFree(x,z,r+.4)&&!nearDoor(x,z)&&!nearLamp(x,z)&&!nearTaken(x,z,6);
  };
  const lookAt=(x,z,ox,oz)=>Math.atan2(ox-x,oz-z);
  const rect=(x,z,hw,hd)=>addRectAll({x0:x-hw,x1:x+hw,z0:z-hd,z1:z+hd});
  const sit=(x,z,th)=>CITY.npc.push({x,z,th,mode:'sit',look:randLook(),t:RR(0,50)});
  const stand=(x,z,th,mode)=>CITY.npc.push({x,z,th,mode,look:randLook(),t:RR(0,50)});
  ROADS.forEach((r,ri)=>{
    const step=r.w>=20?34:42;
    for(let s=RR(6,step);s<r.len-6;s+=step*RR(.8,1.25)){
      const side=rr()<.5?1:-1,c=roadPos(ri,s,0),busy=r.w>=20&&rr()<.22;
      const off=(r.w/2+(busy?4.6:3.8))*side,q=roadPos(ri,s,off),x=q[0],z=q[1];
      if(!okAt(x,z,busy?3.4:1.6))continue;
      const a=lookAt(x,z,c[0],c[1]);taken.push([x,z]);
      const ax=Math.cos(a),az=-Math.sin(a); // le long du trottoir
      if(busy){
        CITY.props.push({k:'shelter',x,z,a});rect(x-Math.sin(a)*1.2,z-Math.cos(a)*1.2,Math.abs(ax)*3.3+.4,Math.abs(az)*3.3+.4);
        const n=1+Math.floor(rr()*3);
        for(let k=0;k<n;k++){const u=RR(-2.4,2.4);
          if(k===0&&rr()<.6)sit(x+ax*u-Math.sin(a)*.6,z+az*u-Math.cos(a)*.6,a);
          else stand(x+ax*u+Math.sin(a)*RR(.4,1.6),z+az*u+Math.cos(a)*RR(.4,1.6),a+RR(-.6,.6),'idle')}
        continue}
      const k=rr();
      if(k<.4){CITY.props.push({k:'bench',x,z,a});rect(x,z,1.5,1.5);if(rr()<.55)sit(x,z,a);if(rr()<.2)sit(x+ax*.9,z+az*.9,a)}
      else if(k<.62){CITY.props.push({k:'bin',x,z,a});rect(x,z,.5,.5)}
      else if(k<.78){CITY.props.push({k:'hyd',x,z,a});rect(x,z,.4,.4)}
      else if(k<.9){CITY.props.push({k:'plant',x,z,a});rect(x,z,.95,.95)}
      else{const n=2+Math.floor(rr()*2);for(let j=0;j<n;j++){const an=j/n*Math.PI*2+RR(0,.5),px=x+Math.sin(an)*1.3,pz=z+Math.cos(an)*1.3;stand(px,pz,lookAt(px,pz,x,z),'chat')}}
    }
  });
  // terrasse de café sur la place : tables, parasols, clients assis
  const P0=PLAZA;
  for(let i=0;i<10;i++){
    const an=i/10*Math.PI*2+.2,rd=14+(i%2)*6,x=P0.x+Math.sin(an)*rd,z=P0.z+Math.cos(an)*rd;
    if(!pointFree(x,z,2)||maskAt(x,z)===1)continue;
    CITY.props.push({k:'table',x,z,a:an,c:i%2?'#c0392b':'#e8e2d4'});rect(x,z,.7,.7);
    const nch=2+Math.floor(rr()*2);
    for(let j=0;j<nch;j++){const ca=j/nch*Math.PI*2+an,cx=x+Math.sin(ca)*1.5,cz=z+Math.cos(ca)*1.5,th=lookAt(cx,cz,x,z);
      CITY.props.push({k:'chair',x:cx,z:cz,a:th});
      if(rr()<.75)sit(cx,cz,th)}
  }
  // le parc : bancs avec du monde, petits groupes
  for(let i=0;i<30;i++){
    const x=RR(PARK.x0+15,PARK.x1-15),z=RR(PARK.z0+15,PARK.z1-15);
    if(!pointFree(x,z,1.5)||waterAt(x,z)||nearTaken(x,z,8))continue;taken.push([x,z]);
    if(rr()<.55){const a=RR(0,6.28),ax=Math.cos(a),az=-Math.sin(a);CITY.props.push({k:'bench',x,z,a});rect(x,z,1.5,1.5);if(rr()<.7)sit(x,z,a);if(rr()<.35)sit(x+ax*.9,z+az*.9,a)}
    else{const n=2+Math.floor(rr()*2);for(let j=0;j<n;j++){const an=j/n*6.28,px=x+Math.sin(an)*1.3,pz=z+Math.cos(an)*1.3;stand(px,pz,lookAt(px,pz,x,z),'chat')}}
  }
  // pigeons : quelques volées sur la place, dans le parc et sur les trottoirs
  const spots=[[P0.x+8,P0.z-14],[P0.x-16,P0.z+6],[P0.x+3,P0.z+17],[(PARK.x0+PARK.x1)/2,(PARK.z0+PARK.z1)/2-20],[PARK.x0+60,PARK.z1-50]];
  for(let i=0;i<16&&taken.length;i++){const p=taken[Math.floor(rr()*taken.length)];spots.push([p[0]+RR(-4,4),p[1]+RR(-4,4)])}
  for(const [x,z] of spots){const f={x,z,fly:0,birds:[]},n=6+Math.floor(rr()*6);
    for(let k=0;k<n;k++){const ox=RR(-3.5,3.5),oz=RR(-3.5,3.5);f.birds.push({ox,oz,x:x+ox,z:z+oz,y:0,th:RR(0,6.28),ph:RR(0,6),vx:0,vy:0,vz:0})}
    CITY.flocks.push(f)}
}
/* mobilier (sous les personnages) */
function drawCityProps(t){
  for(const p of CITY.props){
    if(!inView(p.x,p.z,6))continue;
    ctx.save();ctx.translate(p.x,p.z);ctx.rotate(-p.a);ctx.scale(PS,PS);
    // repère local : +y = vers la route
    ctx.fillStyle=`rgba(0,0,0,${TOD.sa*.7})`;
    switch(p.k){
      case 'bench':
        ctx.fillRect(-.95+TOD.sx*.3,-.32+TOD.sz*.3,1.9,.62);
        ctx.fillStyle='#2c3034';ctx.fillRect(-.82,-.26,.08,.52);ctx.fillRect(.74,-.26,.08,.52);
        ctx.fillStyle='#8a5a34';for(const y of [-.14,.02,.18])ctx.fillRect(-.95,y-.06,1.9,.11);
        ctx.fillStyle='#6a4426';ctx.fillRect(-.95,-.32,1.9,.1);break;
      case 'bin':el(ctx,TOD.sx*.2,TOD.sz*.2,.3,.3,ctx.fillStyle);el(ctx,0,0,.28,.28,'#2f5a3a');el(ctx,0,0,.2,.2,'#1e3a26');break;
      case 'hyd':el(ctx,0,0,.17,.17,'#c0392b');ctx.fillStyle='#8a2a20';ctx.fillRect(-.24,-.05,.48,.1);el(ctx,0,0,.08,.08,'#e05040');break;
      case 'plant':ctx.fillRect(-.6+TOD.sx*.3,-.6+TOD.sz*.3,1.2,1.2);ctx.fillStyle='#a8a198';ctx.fillRect(-.56,-.56,1.12,1.12);el(ctx,0,0,.5,.5,'#4f7a32');el(ctx,-.1,-.1,.32,.32,'#6a9a3a');
        for(let k=0;k<4;k++)el(ctx,Math.cos(k*1.6)*.3,Math.sin(k*1.6)*.3,.07,.07,k%2?'#e0b020':'#d04a6a');break;
      case 'shelter':
        ctx.fillRect(-2.2+TOD.sx*.8,-.85+TOD.sz*.8,4.4,1.6);
        ctx.fillStyle='#2c3034';ctx.fillRect(-1.5,-.62,3,.32); // banc
        ctx.fillStyle='rgba(150,200,220,.35)';ctx.fillRect(-2.2,-.85,4.4,1.6); // toit vitré
        ctx.strokeStyle='#34404a';ctx.lineWidth=.1;ctx.strokeRect(-2.2,-.85,4.4,1.6);ctx.beginPath();ctx.moveTo(0,-.85);ctx.lineTo(0,.75);ctx.stroke();
        ctx.fillStyle='#f0e6c8';ctx.fillRect(2.05,-.7,.12,1.2);
        ctx.fillStyle='#2f6fb0';ctx.fillRect(-.35+2.8,.85,.7,.45);ctx.font='700 .32px "Work Sans",sans-serif';ctx.textAlign='center';ctx.fillStyle='#fff';ctx.fillText('BUS',2.8,1.18);break;
      case 'table':break;
      case 'chair':ctx.fillStyle='#8a3a2a';ctx.fillRect(-.2,-.2,.4,.4);ctx.fillRect(-.2,-.28,.4,.1);break;
    }
    ctx.restore();
  }
}
/* parasols de la terrasse (au-dessus des clients) */
function drawCityTop(t){
  for(const p of CITY.props){if(p.k!=='table'||!inView(p.x,p.z,8))continue;
    const r=1.5*PS,f=1+2.4*KP,x=RC.x+(p.x-RC.x)*f,z=RC.z+(p.z-RC.z)*f;
    ctx.fillStyle=`rgba(0,0,0,${TOD.sa*.6})`;ctx.beginPath();ctx.arc(p.x+TOD.sx*2.4,p.z+TOD.sz*2.4,r,0,6.3);ctx.fill();
    for(let k=0;k<8;k++){ctx.fillStyle=k%2?p.c:'#f4efe4';ctx.beginPath();ctx.moveTo(x,z);ctx.arc(x,z,r,k/8*6.283,(k+1)/8*6.283);ctx.closePath();ctx.fill()}
    ctx.strokeStyle='rgba(0,0,0,.25)';ctx.lineWidth=.08;ctx.beginPath();ctx.arc(x,z,r,0,6.3);ctx.stroke();el(ctx,x,z,.12,.12,'#ddd')}
}
/* gens immobiles : dessinés seulement près de l'écran */
function drawCityNPC(t){
  for(const c of CITY.npc){if(!inView(c.x,c.z,4))continue;drawHuman(c.x,c.z,c.th,c.look,0,0,2.1,c.mode==='idle'?undefined:c.mode,0)}
}
/* pigeons : picorent, s'envolent quand on approche, puis reviennent se poser */
function updPigeons(dt){
  for(const f of CITY.flocks){
    const d=Math.hypot(f.x-P.x,f.z-P.z);if(d>160)continue;
    const near=started&&(d<(P.def.kind==='foot'?(P.v>6?9:5):14)||punchT>0&&d<8);
    if(near&&f.fly<=0){f.fly=R(7,11);if(d<60)Sfx.click&&0;for(const b of f.birds){const a=Math.atan2(b.x-P.x,b.z-P.z)+R(-.6,.6),s=R(6,10);b.vx=Math.sin(a)*s;b.vz=Math.cos(a)*s;b.vy=R(4,6);b.th=a}}
    if(f.fly>0)f.fly-=dt;
    for(const b of f.birds){
      if(f.fly>2){b.vy=Math.max(b.vy-dt*1.2,.6);b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt}
      else if(f.fly>0||b.y>0){const tx=f.x+b.ox,tz=f.z+b.oz,dx=tx-b.x,dz=tz-b.z,dd=Math.hypot(dx,dz);
        if(dd>.3){const sp=Math.min(10,dd*1.2);b.x+=dx/dd*sp*dt;b.z+=dz/dd*sp*dt;b.th=Math.atan2(dx,dz)}
        b.y=Math.max(0,b.y-dt*Math.max(2,b.y*.8));if(dd<=.3)b.y=0}
      else{b.ph+=dt*(3+Math.sin(b.ox*9)*.8);if(Math.sin(b.ph*.21+b.oz)>.96)b.th+=dt*2}
    }
  }
}
function drawPigeons(t){
  for(const f of CITY.flocks){if(!inView(f.x,f.z,80))continue;
    for(const b of f.birds){if(!inView(b.x,b.z,3))continue;
      const up=b.y,sc=.55*(1+Math.min(up,12)*.04),flap=up>0?Math.sin(t*28+b.ox*5):0,peck=up>0?0:Math.max(0,Math.sin(b.ph*2))*.12;
      if(up>0){ctx.fillStyle='rgba(0,0,0,.18)';ctx.beginPath();ctx.ellipse(b.x+up*.35,b.z+up*.25,.3,.18,0,0,6.3);ctx.fill()}
      ctx.save();ctx.translate(b.x,b.z-up*.15);ctx.rotate(Math.PI/2-b.th);ctx.scale(sc,sc);
      if(up>0){ctx.fillStyle='#8a8f98';ctx.beginPath();ctx.ellipse(0,-.38*(.6+.4*flap),.22,.42*(.5+.5*Math.abs(flap)),0,0,6.3);ctx.ellipse(0,.38*(.6+.4*flap),.22,.42*(.5+.5*Math.abs(flap)),0,0,6.3);ctx.fill()}
      el(ctx,0,0,.32,.18,'#7a7f88');el(ctx,-.25,0,.12,.1,'#5a5f68');el(ctx,.24+peck,0,.12,.11,'#5f6672');el(ctx,.35+peck,0,.05,.03,'#e0a040');
      if(!up){ctx.fillStyle='rgba(90,160,120,.6)';ctx.fillRect(.14+peck*.5,-.08,.06,.16)}
      ctx.restore()}}
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
  if(DV){mx.fillStyle='#ffa63d';mx.fillRect(X(DV.e.x)-2.5*f,X(DV.e.z)-2.5*f,5*f,5*f)}
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
  if(!o){let bd=1e9;for(const q of orders)if(canDeliver(q)||canDeliver(q,G.stock)&&bagTot()===0){const d=Math.hypot(q.x-P.x,q.z-P.z);if(d<bd){bd=d;o=q}}}
  trk=o?{id:o.id,x:o.x,z:o.z}:null;
}


/* ---------- affichage : ce qui est utile, seulement quand c'est utile ---------- */
const vis=(el,v)=>{if(el.hidden===!!v)el.hidden=!v};
let lastNite=null,labAlT=0,LABAL={txt:'',bad:false};
function hud(dt){
  findTarget();
  const foot=P.def.kind==='foot',pz=paused(),hudEl=$('hud'),inside=foot&&inLab();
  if(hudEl.classList.contains('car')===foot)hudEl.classList.toggle('car',!foot);
  // bouton d'action contextuel (+ options), ou simple indication
  const ba=$('bAct'),bo=$('bOpt'),hn=$('hint');
  const lb=tgt&&tgt.k!=='info'?tgt.label:'',hint=tgt&&tgt.k==='info'?tgt.label:'';
  if(ba.dataset.l!==lb){ba.dataset.l=lb;vis(ba,lb);$('bActT').textContent=lb}
  if(hn.dataset.l!==hint){hn.dataset.l=hint;vis(hn,hint);hn.textContent=hint}
  vis(bo,tgt&&tgt.opt);
  vis($('bPunch'),foot&&!pz&&!inside&&!HIDE);
  {const bt=`${bagTot()} u. · ${bagUsed()}/${bagPlaces()}`;if($('hBag').textContent!==bt)$('hBag').textContent=bt;$('hBagBox').classList.toggle('full',bagUsed()>=bagPlaces())}
  // joystick à pied, flèches au volant
  vis($('joy'),foot&&!pz&&!HIDE);vis($('carCtl'),!foot&&!pz);
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
  const d=districtAt(P.x,P.z),p=$('hDist'),ow=G.own[d.key],dt2=inside?'Ton labo':HIDE?'Chez '+HIDE.s.name:d.name+' · '+(ow==='you'?'à toi':BOSSES[ow].name);
  if(p.textContent!==dt2){p.textContent=dt2;p.style.color=inside||HIDE?'#f3e6d6':ow==='you'?'#8fbf4a':BOSSES[ow].col}
  labAlT-=dt;if(labAlT<=0){labAlT=.5;LABAL=labAlerts();const h=$('hLab');vis(h,LABAL.txt);if(LABAL.txt){h.textContent='Labo : '+LABAL.txt;h.classList.toggle('bad',LABAL.bad)}}
  const b=$('banner');
  if(M){vis(b,1);b.style.background='';b.textContent=`GO FAST · ${Math.max(0,Math.ceil(M.t))} s · ${Math.round(Math.hypot(P.x-M.dest.x,P.z-M.dest.z))} m`}
  else if(HIDE){vis(b,1);b.style.background='rgba(60,50,90,.92)';b.textContent=`Caché chez ${HIDE.s.name} · chaleur ${Math.round(G.heat)} %`}
  else if(PLACE){vis(b,1);b.style.background='rgba(40,90,50,.92)';b.textContent=PLACE.ok?'Placement : aperçu vert, « Poser ici » pour valider':'Placement : avance ou tourne-toi'}
  else vis(b,0);
  mmT-=dt;if(mmT<=0){mmT=.1;pickTrack();drawMini()}
  // flèche de guidage : go fast, repère posé, ou client suivi
  const a=$('arrowBox');let tg=null,lab='',col='#ffa63d';
  if(HIDE||inside){}
  else if(M){tg=M.dest;lab='Go fast';col='#ff7a1a'}
  else if(WP){tg=WP;lab=WP.label;col='#7fd1ff'}
  else if(trk){const o=orders.find(q=>q.id===trk.id);tg=trk;lab=o?o.name:'Client'}
  if(tg){const dx=tg.x-P.x,dz=tg.z-P.z,dd=Math.hypot(dx,dz);
    if(dd>14){vis(a,1);a.style.color=col;$('arrow').style.transform=`rotate(${Math.atan2(dx,-dz)}rad)`;
      const pa=$('arrow').firstElementChild;if(pa.getAttribute('fill')!==col)pa.setAttribute('fill',col);
      const t=lab+' · '+Math.round(dd)+' m';if($('arrowTxt').textContent!==t)$('arrowTxt').textContent=t}
    else vis(a,0)}
  else vis(a,0);
  const nite=TOD.n>.5;
  if(lastNite!==null&&nite!==lastNite)toast(nite?'La nuit tombe : clients mieux payés, moins de patrouilles.':'Le jour se lève : les patrouilles reprennent.',nite?'good':'');
  lastNite=nite;
  const ck=$('hClock');ck.style.color=nite?'#c98aff':'';
}
$('hLab').onclick=()=>{if(!started||!LAB)return;WP={x:LAB.sh.door.x,z:LAB.sh.door.z,label:'Labo'};toast('Repère posé : ton labo. Suis la flèche bleue.','good')};

function toast(msg,cls){
  const t=document.createElement('div');t.className='toast '+(cls||'');t.textContent=msg;const c=$('toasts');c.appendChild(t);
  while(c.children.length>(MOBILE?2:4))c.removeChild(c.firstChild);setTimeout(()=>t.remove(),4500);
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
const paused=()=>!started||menuOpen||raidOpen||talking||ended||shopOpen||mapBig||bagOpen;
const machOwned=id=>(G.lab.store[id]||0)+G.lab.items.filter(it=>it.id===id).length;
function machCell(it){
  const m=MM[it.id];
  if(m.cat==='culture'){const pl=it.pl;
    if(!pl)return `<div class="slot"><b>${m.name}</b><span>vide</span></div>`;
    const s=SM[pl.s],st=pl.hp<=0?'fanée':pl.p>=1?'prête':pl.w<30?'soif':Math.floor(pl.p*100)+' %';
    return `<div class="slot ${pl.hp<=0?'bad':pl.p>=1?'ok':pl.w<30?'dry':''}"><b>${s.name}</b><span>${m.name.split(' ')[0]} · ${st}</span><i class="pg"><i style="width:${Math.round(pl.p*100)}%"></i></i><i class="wt"><i style="width:${Math.round(pl.w)}%"></i></i></div>`}
  if(m.cat==='transfo')return `<div class="slot ${it.b?'run':''}"><b>${m.name}</b><span>${it.b?Math.floor(100*(1-it.b.t/m.time))+' %':'vide'}</span></div>`;
  return `<div class="slot"><b>${m.name}</b><span>auto</span></div>`;
}
function slotsHtml(){
  if(!G.lab.items.length)return '<p class="note">Aucune machine posée.</p>';
  return G.lab.items.slice().sort((a,b)=>a.d-b.d||a.s-b.s).map(machCell).join('');
}
function tabLabo(){
  let s=`<p class="note">Quartier des Lilas. Tes secteurs : ${mySectors()}/4 (+10 % sur les prix par secteur en plus). Objectif : ${fmt(GOAL)}. Casier : ${G.strikes}/${MAXSTRIKES}.</p>`;
  s+=`<div class="kpis"><div><small>Cash</small><b>${fmt(G.cash)}</b></div><div><small>Graines</small><b>${seedTot()}</b></div><div><small>Récolte</small><b>${rawTot()}</b></div><div><small>Produit</small><b>${tot()}/${cap()}</b></div></div>`;
  s+=`<div><h2>Tes machines · ${G.lab.items.length}</h2><p class="note" style="margin:4px 0 8px">Tu poses tes machines où tu veux dans le labo : approche-toi d’un endroit libre, « Poser une machine », puis place l’aperçu devant toi. Profondeur utilisable : ${Math.round(labDmax())} m sur ${Math.round(LAB?LAB.sh.D:17)} m${lv('labo')<4?' (agrandis le labo dans Améliorations)':''}.</p><div class="slots" id="labSlots">${slotsHtml()}</div></div>`;
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
    :`<p class="note">Achat sur place, sans frais. ${mach?'Ensuite, pose tes machines où tu veux dans le labo.':'Les graines vont directement dans ton stock.'}</p>`;
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
  G.cash=Math.max(G.cash,5000000);G.cheat=1;G.bag.lv=3;G.sel='lune';
  const room=cap()-tot()-rawTot();if(room>0)G.stock.lune=(G.stock.lune||0)+room;
  syncCouriers();labZoneSync();save();
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
      if(menuAt){G.lab.store[v]=(G.lab.store[v]||0)+1;toast(m.name+' acheté. Pose-le où tu veux dans le labo.','good')}else queueDelivery('m',v,1)}break}
    case 'bs':{const s=SM[v],n=+v2||1;if(!s||!G.unlocked[v])break;const c0=seedCost(s)*n,c=menuAt?c0:c0+delivFee(c0);if(G.cash>=c){G.cash-=c;Sfx.cash();
      if(menuAt){G.seeds[v]=(G.seeds[v]||0)+n;toast(`+${n} graine${n>1?'s':''} de ${s.name}.`,'good')}else queueDelivery('s',v,n)}break}
    case 'up':{const u=UPS.find(x=>x.id===v),c=upCost(u);if(G.cash>=c&&lv(v)<u.max){G.cash-=c;G.lv[v]=lv(v)+1;if(v==='labo'){labZoneSync();toast('La cloison du fond recule : ton labo s’agrandit.','good')}}break}
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
  if(fresh){setTimeout(()=>toast('Ton labo a déjà un pot, un séchoir et 3 graines. Plante dans le pot, puis arrose : l’arrosoir se remplit au robinet, à droite de l’entrée. Ta voiture t’attend devant le labo.'),600);setTimeout(()=>toast('Le reste s’achète à la jardinerie (matériel) et à la graineterie (graines), ou se commande à l’ordinateur du labo, livré en camionnette.'),7000)}
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
    const dx=P.x-e.x,dz=P.z-e.z,d2=dx*dx+dz*dz,rad=rp+(e.spr.k==='truck'||e.spr.k==='bus'?3.4:2.1);
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
const MPVER='serveur v2 · 2D';
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
    if(HIDE){HIDE.t+=dt;P.vx=P.vz=P.v=0}else if(P.def.kind==='foot')updFoot(dt);else updPlayer(dt);
    updCombat(dt);updPlace();
    updOrders(dt);updCops(dt);updGangs(dt);
    if(!ended){
      updCouriers(dt);updMission(dt);updMeeting(dt);updDelivery(dt);
      updTraffic(dt,P.x,P.z,[P].concat(traffic,cops,gangs,couriers));updPeds(dt,P.x,P.z);if(!HIDE&&!inLab())bumps(dt);
      updPigeons(dt);
      if(!threat)G.hp=Math.min(100,G.hp+1.2*dt);
      near=cops.reduce((m,c)=>Math.min(m,Math.hypot(c.x-P.x,c.z-P.z)),1e9);
      let dec=.45*(1+.25*lv('vent'))*(1+.3*inv('brouilleur'))*(near>180?1.8:near>90?1:.15);
      if(bagTot()===0&&!M)dec*=2;
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
    orbit+=real*.05;CAM.x=Math.sin(orbit)*260;CAM.z=Math.cos(orbit*1.3)*260;CAM.zoom=Math.min(VW,VH)<600?2.6:3.6;
    updTraffic(dt,CAM.x,CAM.z,traffic);updPeds(dt,CAM.x,CAM.z);updFx(real);render(now);return}
  const near=simStep(real,dt);
  updFx(real);updCamera(dt);hud(dt);render(now);
  Sfx.update({run:!menuOpen&&!ended&&!talking,foot:P.def.kind==='foot'||P.def.kind==='bike',sp:Math.hypot(P.vx,P.vz),vmax:P.def.vmax*(P.def.kind==='bike'?1:mot()),thr:!!keys.up,slip:P.slip,big:P.def.kind==='truck'||P.def.kind==='van',rain:WX.lvl,cop:cops.length?near:9999});
}
function honk(){if(HIDE||P.def.kind==='foot')return;Sfx.init();Sfx.horn();scarePeds(16);if(mpReady())MP.g.emit('horn',{}).catch(()=>{})}
$('bHorn').onclick=()=>{if(started&&!paused())honk()};
$('bSnd').onclick=()=>{const o=Sfx.toggle();$('bSnd').textContent=o?'🔊':'🔇';$('bSnd').setAttribute('aria-label',o?'Couper le son':'Remettre le son')};
$('bSnd').textContent=Sfx.on?'🔊':'🔇';
placeLandmarks();
buildCityLife();
const DEBUG=/[?&]debug=1\b/.test(location.search);
if(DEBUG)window.__serre={get G(){return G},P,LAB:()=>LAB,act,actOpt,labDo,labTarget,startPlace,dropPlace,cancelPlace,get PLACE(){return PLACE},bagTake,bagDrop,bagTot,bagUsed,bagPlaces,openBag,closeBag,doPunch,lootPed,peds:()=>peds,hitPed,CITY,
  lPlant,lHarvest,lLoad,lWater,openMenu,closeMenu,get CAR(){return CAR},enterCar,exitCar,J,keys,CAM,SHOPS,tot,rawTot,seedTot,orders:()=>orders,sale,genOrder,economy,labTick,inLab:()=>inLab(),labWorld,
  get tgt(){findTarget();return tgt},teleport:(x,z,th)=>{P.x=x;P.z=z;if(th!=null)P.th=th;P.vx=P.vz=0;CAM.x=x;CAM.z=z},MP,chooseVehicle,copsN:()=>cops.length,hide:()=>!!HIDE,mission:()=>M&&{units:M.units,value:M.value},
  step:sec=>{for(let t=0;t<sec;t+=.05){mpUpdate(.05);simStep(.05,.05);updFx(.05);updCamera(.05)}hud(0)}};
if(G.began){beginGame(false)}else{$('start').hidden=false}
requestAnimationFrame(frame);
