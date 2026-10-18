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
  vieux:{name:'Les Grands Boulevards',sx:0,sz:0,col:'#d9b77a'},
  butte:{name:'La Butte',sx:1,sz:1,col:'#c0603a'},
};
/* Deux quartiers séparés par la rivière : le Sud, où tu travailles pour El Refe, et le Nord, tenu par le gang de Madame Vega. */
const BOSSES={
  refe:{id:'refe',name:'El Refe',col:'#e0b020',cn:'doré',sector:'sud',style:'Il tient le Sud depuis vingt ans. Dents en or, mémoire d’éléphant.'},
  vega:{id:'vega',name:'Madame Vega',col:'#e08a3a',cn:'orange',sector:'nord',style:'La patronne du Nord. Calme, froide, déjà trois coups d’avance.'},
};
const QD={nord:{key:'nord',name:'Quartier Nord',col:'#e08a3a',cx:-40,cz:-420},sud:{key:'sud',name:'Quartier Sud',col:'#e0b020',cx:-20,cz:400},centre:{key:'centre',name:'Centre-ville',col:'#d9d2c0',cx:0,cz:0}};
const QKEYS=['nord','sud'];
let _rz=null;
const RAILZ=214;
function riverZ(x){
  if(!_rz){_rz=[];const P=RIVER.pts,xa=P[0][0],xb=P[P.length-1][0];
    for(let xi=-640;xi<=640;xi+=10){const xc=clamp(xi,xa+.01,xb-.01);let best=P[P.length-1][1];
      for(let i=0;i<P.length-1;i++){const a=P[i],b=P[i+1];if((a[0]-xc)*(b[0]-xc)<=0&&a[0]!==b[0]){best=a[1]+(b[1]-a[1])*(xc-a[0])/(b[0]-a[0]);break}}_rz.push(best)}}
  return _rz[clamp(Math.round((x+640)/10),0,_rz.length-1)];
}
const quarterAt=(x,z)=>z<riverZ(x)?QD.nord:z<RAILZ?QD.centre:QD.sud;
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
function districtAt(x,z){const q=quarterAt(x,z).key;return DIS[q==='nord'?(x<0?'tours':'port'):q==='centre'?'vieux':(x<0?'cite':'butte')]}
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
  bouquet:{name:'Bouquet de roses',desc:'Un bouquet à la main, tu passes pour un amoureux : chaleur -8. Usage unique.',price:60,use:heatDown(8)},
  gerbe:{name:'Gerbe de fleurs',desc:'Personne n’arrête un homme qui va à un enterrement : chaleur -20. Usage unique.',price:300,use:heatDown(20)},
  orchidee:{name:'Orchidée rare',desc:'Pour ta planque, elle impressionne les clients : +3 % sur tes prix de vente.',price:1800,max:1},
  telephone:{name:'Téléphone prépayé',desc:'Les gérants t’envoient un message au lieu de venir te chercher.',price:300,max:1},
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
    names:['Banque Centrale'],clerks:['M. Duval, le banquier'],
    greet:['« Bienvenue à la Banque Centrale. Nous ne posons pas de questions. »'],
    talk:['« L’argent au coffre ne craint pas les descentes de police. »','« Discrétion assurée. Nos coffres ont vu passer bien pire que vous. »']},
  armurerie:{label:'Armurerie',short:'Armurerie',col:'#c0392b',floor:'#2b2523',deco:'vitrines',items:['#5a5f66','#7b8088','#3d4147','#8a6a3a'],
    goods:['mallette','coffre','brouilleur','pistolet','fusil','carabine'],names:['Armurerie Lefort','Armurerie du Calibre'],clerks:['Gaston','Bernard'],
    greet:['« Bienvenue. On regarde, on ne touche pas. »','« Une pièce de collection ? Vous êtes au bon endroit. »'],
    talk:['« Le coffre blindé, c’est mon best-seller. Rien ne passe à travers. »','« Les collectionneurs paient bien. Une vitrine, ça fait respectable. »']},
  superette:{label:'Supérette',short:'Supérette',col:'#2e8b57',floor:'#2a3a30',deco:'rayons',items:['#e0b020','#c0392b','#3b6fd4','#f1e8d6'],
    goods:['telephone','sacs','engrais','tisane'],names:['Mini-Marché 24h','Supérette Chez Ali','Épicerie du Coin'],clerks:['Ali','Mireille','Hakim'],
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
  fleuriste:{label:'Fleuriste',short:'Fleuriste',col:'#e86a9a',floor:'#33262c',deco:'plantes',items:['#e86a9a','#f1e8d6','#c0392b','#e0b020','#8fbf4a'],
    goods:['bouquet','gerbe','orchidee','engrais'],names:['Au Jardin de Rose','Les Fleurs du Mal'],clerks:['Rose','Anémone'],
    greet:['« Des fleurs pour quelqu’un de spécial ? »','« Bonjour ! Tout est frais de ce matin. »'],
    talk:['« Un homme avec un bouquet, personne ne le soupçonne de rien. »','« Les orchidées, c’est capricieux. Comme certains clients. »']},
  commissariat:{label:'Commissariat',short:'Police',col:'#2f6fd0',floor:'#232832',deco:'vitrines',items:['#2f6fd0','#d8d2c4','#1f2e4a','#c0392b'],police:1,
    names:['Commissariat central'],clerks:['Brigadier Morel'],
    greet:['« Commissariat central. C’est pour une plainte ? »','« Bonjour. Asseyez-vous, on va s’occuper de vous. »'],
    talk:['« On a beaucoup de travail en ce moment. Les gangs, la drogue… vous voyez le genre. »','« Si vous avez quelque chose à nous dire, c’est le moment. »']},
  deguisement:{label:'Magasin de déguisements',short:'Déguisement',col:'#e0b020',floor:'#3a3320',deco:'rayons',items:['#e0b020','#c0392b','#b05bd1','#2e8b57'],
    goods:['lunettes','barbe','perruque'],names:['Farces & Attrapes','Le Carnaval'],clerks:['Pierrot','Colombine'],
    greet:['« Mardi gras, c’est toute l’année ici ! »'],
    talk:['« Personne ne pose de questions à un homme avec une perruque. »']},
};
const SHOP_PLAN=[['vetements','vieux'],['armurerie','vieux'],['fleuriste','vieux'],['bar','vieux'],['superette','vieux'],['concession','vieux'],['vetements','vieux'],['deguisement','vieux'],['jardinerie','cite'],['graineterie','cite'],['superette','cite'],['fleuriste','cite'],['bar','cite'],['vetements','butte'],['superette','butte'],['bar','butte'],['armurerie','butte'],['graineterie','tours'],['bar','tours'],['superette','tours'],['vetements','tours'],['armurerie','port'],['concession','port'],['bar','port'],['deguisement','port'],['jardinerie','port']];
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
const newG=(home='cite')=>({v:5,home,story:{q:'intro',cut:0,dead:0,paid:0,f:{}},inv:{},look:{},began:0,cash:150,bank:0,heat:0,hp:100,strikes:0,strikeT:0,t:0,sel:'jardin',
  seeds:{jardin:5},raw:{},stock:{},lv:{},unlocked:{jardin:1,skunk:1},owned:{foot:1},veh:'foot',earned:0,can:CAN_MAX,deliv:[],
  lab:{items:[{id:'pot',d:5.2,s:-1.5,pl:null},{id:'pot',d:5.2,s:.5,pl:null},{id:'sechoir',d:4.2,s:4.4,pl:null}],store:{}},bag:{lv:0,p:{},it:{}},
  rel:{refe:20,vega:0},ally:{refe:.0001},retired:{},own:{nord:'vega',sud:'you'},clean:0,biz:{},laund:0});
/* anciennes sauvegardes : v4 (2D, pots dans un menu) → v5 (labo en 3D) */
function migrate(g){
  g.home=g.home||'cite';g.inv=g.inv||{};g.look=g.look||{};g.bank=g.bank||0;g.lv=g.lv||{};g.owned=g.owned||{foot:1};g.unlocked=g.unlocked||{jardin:1,skunk:1};
  g.rel=g.rel||{};g.ally=g.ally||{};g.retired=g.retired||{};g.own=g.own||{};
  // ancienne carte à quatre secteurs : on passe aux deux quartiers, le labo est dans le Sud
  if(!g.own||!('nord' in g.own)){g.own={nord:'vega',sud:'you'};g.rel={refe:20,vega:0};g.ally={refe:.0001};g.retired={};g.home='cite'}
  for(const id of BIDS)g.rel[id]=clamp(g.rel[id]||0,-100,100);
  g.clean=Math.max(0,+g.clean||0);g.biz=g.biz&&typeof g.biz==='object'?g.biz:{};g.laund=+g.laund||0;
  if(g.v===4){
    const old=Array.isArray(g.pots)?g.pots:[];
    g.v=5;g.seeds={};g.raw={};g.lab={items:[],store:{}};
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
  // toujours au moins un séchoir posé dans le labo
  if(!g.lab.items.some(it=>MM[it.id].cat==='transfo')){
    const sid=['sechoir3','sechoir2','sechoir'].find(id=>(g.lab.store[id]||0)>0)||'sechoir';if(g.lab.store[sid])g.lab.store[sid]--;
    const spots=[[4.2,4.4],[6.4,6.8],[4.2,9.5],[7.6,9.5],[8.5,4.4]];
    const sp=spots.find(([d,s])=>!g.lab.items.some(it=>Math.abs(it.d-d)<1.8&&Math.abs(it.s-s)<1.8))||spots[0];
    g.lab.items.push({id:sid,d:sp[0],s:sp[1],pl:null})}
  if(!SM[g.sel])g.sel='jardin';
  g.can=clamp(typeof g.can==='number'?g.can:CAN_MAX,0,CAN_MAX);
  g.deliv=(Array.isArray(g.deliv)?g.deliv:[]).filter(d=>d&&(d.k==='m'?MM[d.id]:SM[d.id])&&d.n>0);
  if(!g.owned[g.veh])g.veh='foot';
  if(!g.story||typeof g.story!=='object')g.story={q:'variete',cut:0,dead:1,paid:0,f:{}};g.story.f=g.story.f||{};
}
let G=null;
try{G=JSON.parse(localStorage.getItem(KEY))}catch(e){}
if(!G||(G.v!==4&&G.v!==5)||typeof G.cash!=='number')G=newG();else migrate(G);
const save=()=>{try{localStorage.setItem(G&&G.mode==='multi'?'serre-mp-v1':KEY,JSON.stringify(G))}catch(e){}};
const lv=id=>G.lv[id]||0;
const inv=id=>(G.inv&&G.inv[id])||0;
const HOMEP={...DEFD};const H=()=>HOMEP;
const ownerOf=(x,z)=>G.own[quarterAt(x,z).key];
const mySectors=()=>QKEYS.filter(k=>G.own[k]==='you').length;
const stance=id=>G.ally[id]?'ally':(G.rel[id]||0)<=-50?'war':(G.rel[id]||0)<=-15?'hostile':'neutral';
const addRel=(id,n)=>{
  const s0=stance(id);G.rel[id]=clamp((G.rel[id]||0)+n,-100,100);const s1=stance(id);
  if(s0===s1||G.retired[id])return;
  const b=BOSSES[id],sec=QD[b.sector].name;
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
const priceMult=()=>(1+.08*lv('nego'))*(1+.03*(inv('pistolet')+inv('fusil')+inv('carabine')+inv('orchidee')))*(1+.1*(mySectors()-1));
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
const PAL={tours:[0x8391b4,0x9aa6c4,0x6f7ea3,0xaab4cc],port:[0x4f8a8a,0x5f9a96,0x6d8f94,0x3f7478],cite:[0xe3cfa6,0xd9c194,0xefdcb8,0xcdb489],vieux:[0xe8dcc0,0xdccfae,0xefe4cc,0xd2c4a2,0xc9b893],butte:[0xc4683e,0xb85c3a,0xd47c4c,0xa95536,0x9a8a7a]};
const HGT={tours:[30,100],port:[8,16],cite:[6,10],vieux:[14,32],butte:[12,28]};
const GROUND={tours:'rgba(48,60,92,.62)',port:'rgba(34,92,98,.58)',cite:'rgba(70,120,45,.10)',vieux:'rgba(176,150,112,.45)',butte:'rgba(140,86,64,.42)'};
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
function segRect(ax,az,bx,bz,x0,z0,x1,z1){
  const inR=(x,z)=>x>=x0&&x<=x1&&z>=z0&&z<=z1;if(inR(ax,az)||inR(bx,bz))return 0;
  const cr=(px,pz,qx,qz,rx,rz,sx,sz)=>{const d=(qx-px)*(sz-rz)-(qz-pz)*(sx-rx);if(!d)return false;const t=((rx-px)*(sz-rz)-(rz-pz)*(sx-rx))/d,u=((rx-px)*(qz-pz)-(rz-pz)*(qx-px))/d;return t>=0&&t<=1&&u>=0&&u<=1};
  if(cr(ax,az,bx,bz,x0,z0,x1,z0)||cr(ax,az,bx,bz,x1,z0,x1,z1)||cr(ax,az,bx,bz,x1,z1,x0,z1)||cr(ax,az,bx,bz,x0,z1,x0,z0))return 0;
  const pd=(x,z)=>Math.hypot(Math.max(x0-x,0,x-x1),Math.max(z0-z,0,z-z1));
  return Math.min(pd(ax,az),pd(bx,bz),segDist(x0,z0,ax,az,bx,bz),segDist(x1,z0,ax,az,bx,bz),segDist(x0,z1,ax,az,bx,bz),segDist(x1,z1,ax,az,bx,bz));
}
/* marge entre un rectangle et le bord du trottoir le plus proche (négatif = empiète) */
function roadClear(x0,z0,x1,z1){
  let m=1e9;
  for(const r of ROADS){
    if(!r.bb0){let a=1e9,b=-1e9,c=1e9,d=-1e9;for(const p of r.pts){a=Math.min(a,p[0]);b=Math.max(b,p[0]);c=Math.min(c,p[1]);d=Math.max(d,p[1])}r.bb0=[a,c,b,d]}
    const e=r.w/2+2.5,bb=r.bb0;if(bb[0]-e-20>x1||bb[2]+e+20<x0||bb[1]-e-20>z1||bb[3]+e+20<z0)continue;
    const P=r.pts,n=P.length;
    for(let i=0;i<n-(r.closed?0:1);i++){const a=P[i],b=P[(i+1)%n];const d=segRect(a[0],a[1],b[0],b[1],x0,z0,x1,z1)-e;if(d<m)m=d}
  }
  return m;
}
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

/* --- géographie : nouvelle carte (Nord, centre-ville, Sud) ---
   Le Nord (Madame Vega) : Les Tours au nord-ouest, Le Port au nord-est (la mer, les pontons, le phare).
   La rivière « La Sinueuse » sépare le Nord du centre-ville et se jette dans la mer.
   Le centre-ville : la place de la République au milieu, la Banque Centrale, le commissariat, les grands boulevards et les boutiques.
   La voie ferrée (RAILZ) sépare le centre-ville du Sud (El Refe) : Les Jardins au sud-ouest (parc, lac, jardins ouvriers, ton labo), La Butte au sud-est (cités, stade). */
const RIVER={w:26,pts:smooth([[-640,-200],[-480,-226],[-330,-204],[-180,-236],[-40,-210],[90,-230],[230,-206],[330,-220],[440,-214]],8)};
const SEA=[[392,-640],[640,-640],[640,-140],[570,-150],[500,-176],[445,-200],[410,-236],[396,-280],[392,-330]];
const LAKE={x:-495,z:495,rx:58,rz:40};
const PARK={x0:-590,z0:385,x1:-380,z1:590};
const ALLOT={x0:-360,z0:495,x1:-270,z1:585};
const STADIUM={x0:300,z0:492,x1:450,z1:585};
const PLAZA={x:0,z:0,r:46};
const ISLAND={x:0,z:0,r:0};
const LIGHTHOUSE={x:595,z:-595,r:26};
const RAIL={w:9,pts:[[-640,RAILZ],[640,RAILZ]]};
const QGP={tours:[-210,-382],port:[175,-385],cite:[-400,337],butte:[360,382]};
const LBLP={tours:[-330,-560],port:[150,-575],vieux:[-300,-60],cite:[-470,300],butte:[300,420]};
const BANK={x:125,z:-75,w:44,l:30};
const COMMI={x:-125,z:85,w:40,l:30};
const PIERS=[-340,-430,-520].map(z=>({x0:380,x1:505,z0:z-6,z1:z+6}));
const BOATS=[{x:455,z:-318,th:1.2,l:14,c:0xe8e8ea},{x:525,z:-405,th:-.3,l:10,c:0xc0392b},{x:455,z:-498,th:1.5,l:18,c:0x2d5a8a},{x:600,z:-260,th:.4,l:9,c:0xe8e8ea},{x:520,z:-590,th:-1.2,l:12,c:0xd9b020},{x:580,z:-180,th:2,l:22,c:0x3a3d42,mv:1}];
const CRANES=[{x:470,z:-340},{x:470,z:-520}];

/* --- routes : grandes avenues (w 20) et rues (w 16) --- */
const ROADS=[];
function road(ctrl,w,o){o=o||{};const pts=o.raw?ctrl:smooth(ctrl,8,o.closed);ROADS.push({pts,w,major:w>=18,closed:!!o.closed,name:o.name||''})}
const qN=x=>riverZ(x)-32,qS=x=>riverZ(x)+34; // quais au nord et au sud de la rivière
const riv=(f,x0,x1)=>{const o=[];for(let x=x0;x<=x1;x+=40)o.push([x,f(x)]);if(o[o.length-1][0]!==x1)o.push([x1,f(x1)]);return o};
// centre-ville : le rond-point autour de la place, les grands axes, les diagonales
road(circlePts(0,0,58,40),18,{raw:1,closed:1,name:'Place de la République'});
road([[0,-58],[0,-300],[-6,-450],[0,-610]],20,{name:'Avenue de la République'});
road([[0,58],[4,300],[-4,460],[0,610]],20,{name:'Avenue du Midi'});
road([[-58,0],[-300,-6],[-450,4],[-610,0]],20,{name:'Boulevard Haussmann'});
road([[58,0],[300,6],[445,0],[610,0]],20,{name:'Boulevard Voltaire'});
road([[-41,-41],[-170,-130],[-320,-178],[-330,-260],[-330,-610]],20,{name:'Avenue des Tours'});
road([[41,-41],[150,-120],[228,-178],[240,-260],[240,-610]],20,{name:'Avenue du Port'});
road([[-41,41],[-160,130],[-300,214],[-370,298]],16,{name:'Allée des Jardins'});
road([[41,41],[170,140],[300,214],[370,300]],16,{name:'Rue de la Butte'});
road(riv(qS,-610,330).concat([[400,-160],[440,-80],[445,0]]),16,{name:'Quai de la Sinueuse'});
road([[-610,190],[-300,186],[0,190],[300,194],[610,190]],20,{name:'Boulevard du Midi'});
road([[-610,-110],[-300,-104],[0,-110],[300,-112],[425,-112]],16,{name:'Rue Saint-Honoré'});
road([[-610,100],[-300,104],[0,100],[300,96],[610,100]],16,{name:'Rue de la Paix'});
for(const x of [-360,-250,-130,130,300])road([[x,qS(x)],[x,190]],16);
road([[470,0],[470,190]],16);
// deux ponts de plus, à l'ouest et à l'est
road([[-470,190],[-470,-150],[-490,-240],[-510,-300],[-510,-610]],16,{name:'Rue du Pont-Neuf'});
road([[360,190],[360,-150],[345,-250],[330,-340],[330,-610]],16,{name:'Rue des Docks'});
// le Nord : quai, boulevard, quadrillage des Tours, rues du Port jusqu'aux pontons
road(riv(qN,-610,360),16,{name:'Quai Nord'});
road([[-610,-430],[0,-430],[388,-430]],20,{name:'Boulevard du Nord'});
for(const z of [-520,-340])road([[-610,z],[388,z]],16);
for(const x of [-390,-270,-150,110])road([[x,-610],[x,qN(x)]],16);
// le Sud : Les Jardins et La Butte
road([[-610,300],[-450,295],[-300,310],[-120,300],[0,298],[150,292],[330,310],[610,298]],16,{name:'Rue des Lilas'});
road([[-250,190],[-252,330],[-215,450],[-195,610]],16,{name:'Rue du Parc'});
road([[300,190],[255,250],[250,330],[232,460],[240,610]],16,{name:'Rue des Écoles'});
road([[-120,300],[-110,440],[-128,610]],16,{name:'Rue Pasteur'});
road([[120,300],[110,460],[130,610]],16,{name:'Rue Victor-Hugo'});
road([[0,468],[200,470],[300,462],[460,470],[610,468]],16,{name:'Avenue du Stade'});
road([[470,300],[500,390],[480,468]],16,{name:'Rue des Pins'});

function genWorld(){
  const W=i=>{MASK[i]=2};
  rasterPoly(SEA,W);rasterLine(RIVER.pts,RIVER.w/2,W);rasterEll(LAKE.x,LAKE.z,LAKE.rx,LAKE.rz,W);
  for(const r of ROADS)r.wet=r.pts.map(p=>waterAt(p[0],p[1]));
  // voie ferrée : réservée avant les routes (les routes la traversent : passages à niveau)
  rasterLine(RAIL.pts,RAIL.w/2,i=>{if(MASK[i]===0)MASK[i]=3});
  for(const r of ROADS)rasterLine(r.pts,r.w/2,i=>{MASK[i]=1},r.closed);
  for(const p of PIERS)rasterRect(p.x0,p.z0,p.x1,p.z1,i=>{MASK[i]=5});
  const res=i=>{if(MASK[i]===0)MASK[i]=3};
  rasterRect(PARK.x0,PARK.z0,PARK.x1,PARK.z1,res);rasterRect(ALLOT.x0,ALLOT.z0,ALLOT.x1,ALLOT.z1,res);rasterRect(STADIUM.x0,STADIUM.z0,STADIUM.x1,STADIUM.z1,res);
  rasterEll(PLAZA.x,PLAZA.z,PLAZA.r,PLAZA.r,res);
  rasterEll(LIGHTHOUSE.x,LIGHTHOUSE.z,LIGHTHOUSE.r,LIGHTHOUSE.r,i=>{MASK[i]=3});
  for(const k in QGP){const q=QGP[k];rasterRect(q[0]-24,q[1]-24,q[0]+24,q[1]+24,res)}
  addRectAll({x0:PLAZA.x-7,x1:PLAZA.x+7,z0:PLAZA.z-7,z1:PLAZA.z+7});
  // stade : tribunes
  for(const [x0,z0,x1,z1] of [[STADIUM.x0,STADIUM.z0,STADIUM.x1,STADIUM.z0+8],[STADIUM.x0,STADIUM.z1-8,STADIUM.x1,STADIUM.z1]])addRectAll({x0,x1,z0,z1});
  // la Banque Centrale et le commissariat, au centre-ville
  const special=(b,hex,h,o)=>{let best=null;
    for(let r=0;r<140&&!best;r+=4)for(let a=0;a<16&&!best;a++){const x=b.x+Math.cos(a/16*6.283)*r,z=b.z+Math.sin(a/16*6.283)*r;
      if(rectFree(x-b.w/2,z-b.l/2,x+b.w/2,z+b.l/2,1)&&roadClear(x-b.w/2,z-b.l/2,x+b.w/2,z+b.l/2)>=1&&roadClear(x-b.w/2,z-b.l/2,x+b.w/2,z+b.l/2)<=8)best=[x,z]}
    if(best){b.x=best[0];b.z=best[1]}
    return mkBld(b.x,b.z,b.w,b.l,h,hex,o)};
  special(BANK,0xe9e2d0,14,{bank:1});
  special(COMMI,0x6f8fb8,12,{police:1});
  // immeubles par secteur
  const SPEC={tours:{st:36,w:[20,30],p:.92},port:{st:32,w:[16,28],p:.8},vieux:{st:22,w:[11,19],p:.92},cite:{st:24,w:[9,15],p:.5},butte:{st:30,w:[14,26],p:.8}};
  for(const k of DKEYS){
    const sp=SPEC[k],[h0,h1]=HGT[k],pal=PAL[k];
    for(let z=-596;z<596;z+=sp.st)for(let x=-596;x<596;x+=sp.st){
      const cx=x+sp.st/2+R(-3,3),cz=z+sp.st/2+R(-3,3);
      if(districtAt(cx,cz).key!==k)continue;
      if(Math.random()>sp.p)continue;
      const w=R(sp.w[0],sp.w[1]),l=R(sp.w[0],sp.w[1]);
      if(k==='port'&&Math.random()<.28){mkYard(cx,cz);continue}
      if(!rectFree(cx-w/2,cz-l/2,cx+w/2,cz+l/2,3))continue;
      let W=Math.max(8,Math.round(w/2)*2),L=Math.max(8,Math.round(l/2)*2),ok=false;
      for(let n=0;n<4&&W>=8&&L>=8;n++){if(roadClear(cx-W/2,cz-L/2,cx+W/2,cz+L/2)>=.5){ok=true;break}W-=2;L-=2}
      if(ok)mkBld(cx,cz,W,L,R(h0,h1),pick(pal));
    }
  }
  // arbres : parc, jardins, avenues
  const tc=()=>pick([0x3f7a2a,0x4f8a2f,0x2f6a2a,0x5f8f35]);
  for(let n=0;n<170;n++){const x=R(PARK.x0+6,PARK.x1-6),z=R(PARK.z0+6,PARK.z1-6);
    if(((x-LAKE.x)/(LAKE.rx+8))**2+((z-LAKE.z)/(LAKE.rz+8))**2<1)continue;if(Math.abs(x-(PARK.x0+PARK.x1)/2)<5||Math.abs(z-(PARK.z0+PARK.z1)/2+20)<5)continue;
    binOf(x,z).trees.push({x,z,s:R(.8,1.4),c:tc()})}
  for(let n=0;n<460;n++){const x=R(-596,-6),z=R(RAILZ+8,596);if(maskAt(x,z)!==0)continue;binOf(x,z).trees.push({x,z,s:R(.55,1.05),c:tc()})}
  for(let n=0;n<160;n++){const x=R(6,596),z=R(RAILZ+8,596);if(maskAt(x,z)!==0||Math.random()<.4)continue;binOf(x,z).trees.push({x,z,s:R(.5,.85),c:tc()})}
  for(let n=0;n<90;n++){const x=R(-596,0),z=R(-596,-260);if(maskAt(x,z)!==0||Math.random()<.4)continue;binOf(x,z).trees.push({x,z,s:R(.5,.8),c:tc()})}
  for(const r of ROADS){if(!r.major||r.closed)continue;
    for(let k=0;k<r.pts.length;k+=3){const a=r.pts[k],b=r.pts[Math.min(k+1,r.pts.length-1)];if(a===b)continue;const dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz)||1;
      for(const s of [-1,1]){const x=a[0]-dz/l*s*(r.w/2+5),z=a[1]+dx/l*s*(r.w/2+5);if(maskAt(x,z)===0&&Math.random()<.55)binOf(x,z).trees.push({x,z,s:R(.55,.8),c:tc()})}}}
  // arbres autour de la place
  for(let i=0;i<16;i++){const a=i/16*6.283,x=PLAZA.x+Math.cos(a)*(PLAZA.r-3),z=PLAZA.z+Math.sin(a)*(PLAZA.r-3);binOf(x,z).trees.push({x,z,s:.7,c:0x4f8a2f})}
  // voitures garées le long des rues
  for(const r of ROADS){if(r.major)continue;
    for(let k=2;k<r.pts.length-2;k++){if(Math.random()>.2)continue;const a=r.pts[k-1],b=r.pts[k+1];const dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz)||1;
      const s=Math.random()<.5?-1:1,x=r.pts[k][0]-dz/l*s*(r.w/2-1.5),z=r.pts[k][1]+dx/l*s*(r.w/2-1.5);
      if(maskAt(x,z)!==1||ROADS.some(o=>o!==r&&o.pts.some(p=>Math.abs(p[0]-x)<24&&Math.abs(p[1]-z)<24)))continue;
      const along=Math.abs(dx)>Math.abs(dz),hw=along?2.3:.95,hl=along?.95:2.3;
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
  const col=o&&(o.bank||o.police)?hex:jit(hex),b={x0:x-w/2,x1:x+w/2,z0:z-l/2,z1:z+l/2,h,col,st:sty(col),props:[],tier:null,off:RI(0,2),litD:[1.7,1.3+3*RI(1,2)],offs:R(0,9),shop:null,bank:o&&o.bank,police:o&&o.police};
  if(!b.bank&&!b.police){const n=RI(1,3);for(let k=0;k<n;k++){const bw=R(1.6,Math.min(3.4,w/4)),bl=R(1.6,Math.min(3.4,l/4));const px=x+R(-w/2+bw+.5,w/2-bw-.5),pz=z+R(-l/2+bl+.5,l/2-bl-.5);b.props.push({x0:px-bw/2,x1:px+bw/2,z0:pz-bl/2,z1:pz+bl/2,h:R(.9,2),st:sty(pick(RPROP))})}}
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
  if(!rectFree(cx-14,cz-12,cx+14,cz+12,2)||roadClear(cx-14,cz-12,cx+14,cz+12)<.5)return;
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
let ZPOLY=null,ZPATH=null;
function zonePolys(){
  if(ZPOLY)return ZPOLY;
  const rz=[];for(let x=-640;x<=640;x+=20)rz.push([x,riverZ(x)]);
  const north=(a,b)=>{const o=[[a,-640],[b,-640]];for(let i=rz.length-1;i>=0;i--){const [x,z]=rz[i];if(x>=a&&x<=b)o.push([x,z])}return o};
  return ZPOLY={tours:north(-640,0),port:north(0,640),vieux:[...rz,[640,RAILZ],[-640,RAILZ]],cite:[[-640,RAILZ],[0,RAILZ],[0,640],[-640,640]],butte:[[0,RAILZ],[640,RAILZ],[640,640],[0,640]]};
}
function zonePaths(){if(!ZPATH){ZPATH={};const Z=zonePolys();for(const k in Z)ZPATH[k]=polyPath(Z[k],true)}return ZPATH}
const mmBg=S=>MMC[S]||(MMC[S]=tile(S,S,(x,w,h)=>{
  const k=S/1250,X=v=>(v+625)*k,f=S/300;
  x.fillStyle='#17110f';x.fillRect(0,0,w,h);
  const GC={tours:'#2f3a55',port:'#25494c',vieux:'#5c5040',cite:'#3d6a2e',butte:'#5c3c30'},Z=zonePolys();
  const poly=(P)=>{x.beginPath();P.forEach((p,i)=>i?x.lineTo(X(p[0]),X(p[1])):x.moveTo(X(p[0]),X(p[1])));x.closePath()};
  for(const key of DKEYS){x.fillStyle=GC[key];poly(Z[key]);x.fill()}
  x.fillStyle='#4f8a3a';x.fillRect(X(PARK.x0),X(PARK.z0),(PARK.x1-PARK.x0)*k,(PARK.z1-PARK.z0)*k);
  x.fillStyle='#6b5233';x.fillRect(X(ALLOT.x0),X(ALLOT.z0),(ALLOT.x1-ALLOT.x0)*k,(ALLOT.z1-ALLOT.z0)*k);
  x.fillStyle='#4f9a3a';x.fillRect(X(STADIUM.x0),X(STADIUM.z0),(STADIUM.x1-STADIUM.x0)*k,(STADIUM.z1-STADIUM.z0)*k);
  x.fillStyle='#2f6f96';poly(SEA);x.fill();
  x.strokeStyle='#2f6f96';x.lineWidth=RIVER.w*k;x.lineJoin='round';x.lineCap='round';x.beginPath();RIVER.pts.forEach((p,i)=>i?x.lineTo(X(p[0]),X(p[1])):x.moveTo(X(p[0]),X(p[1])));x.stroke();
  x.beginPath();x.ellipse(X(LAKE.x),X(LAKE.z),LAKE.rx*k,LAKE.rz*k,0,0,7);x.fill();
  x.fillStyle='#c9b48a';x.beginPath();x.arc(X(LIGHTHOUSE.x),X(LIGHTHOUSE.z),LIGHTHOUSE.r*k,0,7);x.fill();
  x.fillStyle='#8a6a48';for(const p of PIERS)x.fillRect(X(p.x0),X(p.z0),(p.x1-p.x0)*k,(p.z1-p.z0)*k);
  x.strokeStyle='#7a7068';x.lineWidth=6*k+f;x.lineCap='butt';x.beginPath();x.moveTo(0,X(RAILZ));x.lineTo(w,X(RAILZ));x.stroke();
  x.strokeStyle='#2a2420';x.lineWidth=f*.8;x.setLineDash([3*f,3*f]);x.beginPath();x.moveTo(0,X(RAILZ));x.lineTo(w,X(RAILZ));x.stroke();x.setLineDash([]);x.lineCap='round';
  for(const pass of [0,1]){for(const r of ROADS){x.strokeStyle=pass?(r.major?'#e9dcc0':'#bfb39b'):'#14100e';x.lineWidth=(r.w*(pass?.75:1.15))*k+(pass?0:1.5*f);x.beginPath();r.pts.forEach((p,i)=>i?x.lineTo(X(p[0]),X(p[1])):x.moveTo(X(p[0]),X(p[1])));if(r.closed)x.closePath();x.stroke()}}
  x.fillStyle='#d8cfb8';x.beginPath();x.arc(X(PLAZA.x),X(PLAZA.z),PLAZA.r*k,0,7);x.fill();
  x.fillStyle='#4f95bd';x.beginPath();x.arc(X(PLAZA.x),X(PLAZA.z),7*k,0,7);x.fill();
  const BC={tours:'#7f8fb8',port:'#5f9a96',vieux:'#dccdac',cite:'#e3cfa6',butte:'#b8684a'};
  for(const B of BL){for(const b of B.bld){x.fillStyle=b.bank?'#f1ead6':b.police?'#4f7fd0':BC[districtAt((b.x0+b.x1)/2,(b.z0+b.z1)/2).key];x.fillRect(X(b.x0),X(b.z0),(b.x1-b.x0)*k,(b.z1-b.z0)*k)}
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
const KP=.0019,HC=55;
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
  const k=b.dk||(b.dk=b.bank?'bank':b.police?'police':districtAt((b.x0+b.x1)/2,(b.z0+b.z1)/2).key);
  const o={win:true,tex:k!=='cite',rim:k==='tours'||k==='bank'||k==='police',litD:b.litD,offs:b.offs,seed:b.off*7+b.offs};
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
  if(b.police){
    const cx=(r[0]+r[2])/2,cz=(r[1]+r[3])/2;ctx.fillStyle='#24314a';ctx.fillRect(r[0]+1.5,r[1]+1.5,w-3,h-3);
    ctx.strokeStyle='#d8d2c4';ctx.lineWidth=.35;ctx.strokeRect(r[0]+1.5,r[1]+1.5,w-3,h-3);
    ctx.fillStyle='#e9e2d0';ctx.beginPath();ctx.arc(cx,cz-1.2,4.2,0,6.3);ctx.fill();ctx.strokeStyle='#2f6fd0';ctx.lineWidth=.5;ctx.beginPath();ctx.arc(cx,cz-1.2,6.5,0,6.3);ctx.stroke();
    ctx.font='700 4.2px "Bowlby One",Impact,sans-serif';ctx.textAlign='center';ctx.fillStyle='#2f6fd0';ctx.fillText('POLICE',cx,cz+5.6);
    ctx.fillStyle=Math.floor(performance.now()/500)%2?'#2f6fd0':'#d03a2a';ctx.beginPath();ctx.arc(cx,cz-1.2,1.6,0,6.3);ctx.fill()}
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
const floater=(x,z,txt,col,big)=>{if(typeof REMOTE!=='undefined'&&REMOTE)return;if(FL.length<14)FL.push({x,z,txt,col,t:0,big})};
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
  if(e.spr.cop&&!e.calm){
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
    if(o.hid||(isMulti()&&o.cm!==CREW.code&&inLab(o.x,o.z)))continue;
    const oin=inLab(o.x,o.z),sc=oin?2.1:HS;
    if(o.k==='foot')drawHuman(o.x,o.z,o.th,o.look,o.ph,o.sp,sc,undefined,o.pk>0?1-o.pk/.38:0);
    else if(o.k==='bike')drawBike(o.x,o.z,o.th,o.c,o.ph*3);
    else drawVeh({x:o.x,z:o.z,th:o.th,spr:{k:o.k,c:o.c},brk:false},now);
    if(inView(o.x,o.z,6)){const pu=.5+.5*Math.sin(now/300+o.x);ring(o.x,o.z,oin?1.1+pu*.2:3+pu*.6,enemy(o)?'#ff5a40':'#7fd1ff',oin?.08:.25,.5)}
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
    if(o.hid||!inView(o.x,o.z,8)||(isMulti()&&o.cm!==CREW.code&&inLab(o.x,o.z))||(inLab()!==inLab(o.x,o.z)&&P.def.kind==='foot'))continue;
    const s=toScr(o.x,o.z),up=(o.k==='foot'||o.k==='bike'?2.2:3.2)*CAM.zoom+10;
    pill(s[0],s[1]-up,o.n,enemy(o)?'#ff7a5a':'#7fd1ff',isMulti()?(o.cm?(o.cm===CREW.code?'Ton équipe':'Équipe '+o.cm):'')+' · '+fmt(o.cash):fmt(o.cash)+' · '+(DIS[o.hd]?DIS[o.hd].name:''));
    if(o.bub)pill(s[0],s[1]-up-38,'« '+o.bub.t+' »','#f3e6d6');
  }
  if(MP.myBub&&started&&!HIDE){const s=toScr(P.x,P.z);pill(s[0],s[1]-3*CAM.zoom-10,'« '+MP.myBub.t+' »','#7fd1ff')}
  if(meetCar&&inView(meetCar.x,meetCar.z,30)){const s=toScr(meetCar.x,meetCar.z);pill(s[0],s[1]-9*CAM.zoom*.6-14,BOSSES[meetCar.boss].name+' veut te parler',BOSSES[meetCar.boss].col)}
  for(const f of FL){
    const s=toScr(f.x,f.z-f.t*3.2),a=clamp(1.6-f.t,0,1)*Math.min(1,f.t*8);
    ctx.globalAlpha=a;ctx.font=`700 ${f.big?24:17}px "Work Sans",sans-serif`;ctx.textAlign='center';
    ctx.lineWidth=4;ctx.strokeStyle='rgba(20,12,8,.9)';ctx.strokeText(f.txt,s[0],s[1]);ctx.fillStyle=f.col;ctx.fillText(f.txt,s[0],s[1]);ctx.globalAlpha=1;
  }
  if(started&&!INT){
    if(WP)edgeMark(WP.x,WP.z,'#7fd1ff',Math.round(Math.hypot(WP.x-P.x,WP.z-P.z))+' m · '+WP.label);
    if(M)edgeMark(M.dest.x,M.dest.z,'#ff7a1a',Math.round(Math.hypot(M.dest.x-P.x,M.dest.z-P.z))+' m');
    if(meetCar)edgeMark(meetCar.x,meetCar.z,BOSSES[meetCar.boss].col,BOSSES[meetCar.boss].name);
    if(QT&&!M&&!WP)edgeMark(QT.x,QT.z,'#ffd24a',QT.label);
    if(trk&&!M)edgeMark(trk.x,trk.z,'#ffa63d',Math.round(Math.hypot(trk.x-P.x,trk.z-P.z))+' m');
  }
}

/* ---------- dessin du sol : quartiers, eau, routes, ponts, port, parc, place ---------- */
const WAVES=[];
for(let n=0;n<320;n++){const x=R(390,610),z=R(-610,-140);if(waterAt(x,z))WAVES.push({x,z,p:R(0,6.3),s:R(.6,1.2)})}
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
  // les secteurs : Tours et Port au nord, les grands boulevards au centre, Jardins et Butte au sud
  {const Z=zonePaths();for(const key of DKEYS){if(!Z[key])continue;ctx.fillStyle=key==='cite'?(PAT.grass||'#4f7d35'):(PAT.conc||'#a09c95');ctx.fill(Z[key]);ctx.fillStyle=GROUND[key];ctx.fill(Z[key])}}
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
  if(VB.x1>370&&VB.z0<-120){
    ctx.fillStyle='#d9c9a0';ctx.strokeStyle='#d9c9a0';ctx.lineWidth=7;ctx.stroke(SEAP);
    const g=ctx.createLinearGradient(360,0,610,0);g.addColorStop(0,'#2f7aa3');g.addColorStop(1,'#1d557a');ctx.fillStyle=g;ctx.fill(SEAP);
  }
  if(VB.z0<-170&&VB.z1>-260){
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
  for(const b of BOATS){if(b.mv){b.th+=.0006;b.x=545+Math.cos(t*.05)*40;b.z=-400+Math.sin(t*.05)*130;b.th=Math.atan2(Math.cos(t*.05)*130,-Math.sin(t*.05)*40)}drawBoat(b,t)}
  // la place de la République
  if(inView(PLAZA.x,PLAZA.z,60)){const P0=PLAZA;
    ctx.fillStyle='#d8c9a6';ctx.beginPath();ctx.arc(P0.x,P0.z,P0.r,0,6.3);ctx.fill();
    ctx.strokeStyle='rgba(120,95,60,.35)';ctx.lineWidth=.3;for(let r=8;r<P0.r;r+=5){ctx.beginPath();ctx.arc(P0.x,P0.z,r,0,6.3);ctx.stroke()}
    ctx.beginPath();for(let a=0;a<12;a++){const q=a/12*6.283;ctx.moveTo(P0.x+Math.cos(q)*8,P0.z+Math.sin(q)*8);ctx.lineTo(P0.x+Math.cos(q)*P0.r,P0.z+Math.sin(q)*P0.r)}ctx.stroke();
    ctx.fillStyle='#b8ad94';ctx.beginPath();ctx.arc(P0.x,P0.z,7.5,0,6.3);ctx.fill();ctx.fillStyle='#4f95bd';ctx.beginPath();ctx.arc(P0.x,P0.z,6,0,6.3);ctx.fill();
    ctx.fillStyle='rgba(220,240,255,.8)';ctx.beginPath();ctx.arc(P0.x,P0.z,1.4+Math.sin(t*3)*.3,0,6.3);ctx.fill()}
  drawRailStadium(t);
  // les routes : trottoirs, chaussée, marquages
  const vis=ROADS.filter(roadInView);
  ctx.strokeStyle='#a69e90';for(const r of vis){ctx.lineWidth=r.w+5;ctx.stroke(r.p2d)}
  ctx.strokeStyle=PAT.asph||'#2f2d2c';for(const r of vis){ctx.lineWidth=r.w;ctx.stroke(r.p2d)}
  for(const r of vis)for(const [a,b] of r.bridges){ctx.strokeStyle='#5a4f45';ctx.lineWidth=1.6;ctx.stroke(a);ctx.stroke(b);ctx.strokeStyle='#e6dfcf';ctx.lineWidth=.8;ctx.stroke(a);ctx.stroke(b)}
  ctx.lineCap='butt';
  ctx.strokeStyle='rgba(235,230,218,.8)';ctx.lineWidth=.3;ctx.setLineDash([4,7]);for(const r of vis)if(r.major&&!(r.closed&&r.pts.length<40))ctx.stroke(r.p2d);ctx.setLineDash([]);
  // îlot du rond-point
  if(ISLAND.r&&inView(0,0,40)){ctx.fillStyle='#cbbf98';ctx.beginPath();ctx.arc(0,0,ISLAND.r+1.5,0,6.3);ctx.fill();ctx.fillStyle=PAT.grass||'#4f7d35';ctx.beginPath();ctx.arc(0,0,ISLAND.r,0,6.3);ctx.fill();
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
  if(INT){drawInterior(now);ctx.setTransform(DPR,0,0,DPR,0,0);drawHUDLayer(now);return}
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
    for(const c of B.cars)drawVeh({x:c.x,z:c.z,th:c.th,spr:c.cop?{k:c.k,c:c.c,cop:1}:{k:c.k,c:c.c},calm:true,brk:false,park:true},now);
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
  drawDogs(now/1000);
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
    if(!HIDE&&!LABIN&&!CINE&&(P.def.kind==='foot'||P.def.kind==='scooter'||P.def.kind==='bike')){const pu=.5+.5*Math.sin(now/300);ring(P.x,P.z,2.6+pu*.5,'#ffffff',.2,.35)}
    if(!CINE)drawPlayer(now);
  }
  drawOthers(now);
  drawStory(now);
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
  drawStoryTop(now);
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
  for(const B of BL)for(const b of B.bld)if(b.police&&b.shop){const T=SHOPTYPES.commissariat,cx=(b.x0+b.x1)/2,cz=(b.z0+b.z1)/2,d=b.shop,ax=Math.abs(d.x-cx)>Math.abs(d.z-cz)?'x':'z';
    const s0={id:SHOPS.length,type:'commissariat',name:T.names[0],clerk:T.clerks[0],x:d.x,z:d.z,ax,sg:ax==='x'?Math.sign(d.x-cx):Math.sign(d.z-cz),line:pick(T.greet)};b.store=s0;SHOPS.push(s0);
    const sp=roadsideSpot(d.x,d.z);s0.park=sp;
    for(const o of [-7,7]){const x=sp.x+Math.sin(sp.th)*o,z=sp.z+Math.cos(sp.th)*o,B2=binOf(x,z);
      if(maskAt(x,z)!==1||B2.cars.some(c=>Math.hypot(c.x-x,c.z-z)<6))continue;
      B2.cars.push({x,z,th:sp.th,k:'sedan',c:0xf2f2f4,cop:1});const along=Math.abs(Math.sin(sp.th))>Math.abs(Math.cos(sp.th)),hw=along?2.3:.95,hl=along?.95:2.3;addRectAll({x0:x-hw,x1:x+hw,z0:z-hl,z1:z+hl})}}
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
  const chased=cops.some(c=>!c.calm)||threat,nc=cops.reduce((m,c)=>Math.min(m,Math.hypot(c.x-P.x,c.z-P.z)),1e9);
  for(const s of SHOPS){const d=Math.hypot(P.x-s.x,P.z-s.z)-1;if(d<4&&d<bd){bd=d;
    tgt=chased?(nc>22?{k:'hide',s,label:'Se cacher : '+s.name}:{k:'info',label:'Flics trop près pour se cacher'}):{k:'shop',s,label:'Entrer : '+s.name}}}
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
const traffic=[],peds=[],PEDN=MOBILE?38:58,TRAFN=MOBILE?18:26;
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
  for(let i=0;i<nodes.length;i++)w.push([nodes[i].x,nodes[i].z]);
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
  keepOnRoad(a,dt);
}
/* rappel vers la chaussée : une voiture qui mord sur le trottoir est ramenée sur la route (sauf flics et gangs en pleine poursuite) */
function keepOnRoad(a,dt){
  if(maskAt(a.x,a.z)===1&&maskAt(a.x+Math.sin(a.th)*2,a.z+Math.cos(a.th)*2)===1)return;
  if(!a.civ&&!a.spr.courier&&Math.hypot(a.x-P.x,a.z-P.z)<30)return;
  const n=nearestNode(a.x,a.z);if(!n)return;
  const r=ROADS[n.r],P0=r.pts,k=n.k;let best=null,bd=1e9;
  for(const j of [k-1,k]){const i0=r.closed?(j+P0.length)%P0.length:j;if(i0<0||i0>=P0.length-(r.closed?0:1))continue;const p=P0[i0],q=P0[(i0+1)%P0.length];
    const dx=q[0]-p[0],dz=q[1]-p[1],l2=dx*dx+dz*dz||1;let t=((a.x-p[0])*dx+(a.z-p[1])*dz)/l2;t=Math.max(0,Math.min(1,t));
    const x=p[0]+dx*t,z=p[1]+dz*t,d=Math.hypot(a.x-x,a.z-z);if(d<bd){bd=d;best={x,z,ux:dx/Math.sqrt(l2),uz:dz/Math.sqrt(l2)}}}
  if(!best)return;
  const lim=r.w/2-1.6;if(bd<=lim)return;
  const ox=(a.x-best.x)/bd,oz=(a.z-best.z)/bd,tx=best.x+ox*lim,tz=best.z+oz*lim,k2=Math.min(1,dt*(bd-lim>4?10:5));
  a.x+=(tx-a.x)*k2;a.z+=(tz-a.z)*k2;a.v*=Math.exp(-dt*1.5);
}
function followPath(a,dt,vt){
  if(!a.path||!a.path.length)return true;
  const w=a.path[0];
  if(Math.hypot(w[0]-a.x,w[1]-a.z)<(a.path.length>1?8:6)){a.path.shift();if(!a.path.length)return true}
  const w0=a.path[0];
  // ralentir avant un virage serré
  if(a.path.length>1){const w1=a.path[1],dx0=w0[0]-a.x,dz0=w0[1]-a.z,dx1=w1[0]-w0[0],dz1=w1[1]-w0[1],l0=Math.hypot(dx0,dz0),l1=Math.hypot(dx1,dz1);
    if(l0<26&&l1>.5){const c=(dx0*dx1+dz0*dz1)/(l0*l1||1);if(c<.85)vt=Math.min(vt,7+16*Math.max(0,c))}}
  aiMove(a,w0[0],w0[1],dt,vt);return false;
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
  const d=quarterAt(x,z),ow=G.own[d.key],rival=!!ow&&ow!=='you'&&!G.ally[ow];
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
  if(ow&&ow!=='you'){
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
    const d=QD[BOSSES[id].sector];
    for(let n=0;n<3;n++){
      const p=randRoadPoint(d.cx,d.cz,0,250);
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
    const st=stance(id),d=Math.hypot(P.x-g.x,P.z-g.z),inHis=quarterAt(P.x,P.z).key===b.sector;
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
      if(!g.path.length){const s=QD[b.sector],p=randRoadPoint(s.cx,s.cz,0,260);g.path=pathTo(g.x,g.z,p.x,p.z)}
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
    const b=BOSSES[id],sec=QD[b.sector],price=300000;
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
    if(storyAt('libre')&&G.cash>=180000&&G.own[BOSSES[id].sector]===id)opts.push('sell','sell');
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
  if(res===null)return;
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
  try{localStorage.removeItem(G.mode==='multi'?'serre-mp-v1':KEY)}catch(e){}
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
    if(!QGP[k])continue;
    const [cx,cz]=QGP[k];
    if(k===G.home){LAB=buildLab(cx,cz);continue}
    if(k==='tours')continue;
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
  if(!G.cheat&&G.cash+(G.clean||0)+(G.bank||0)>=GOAL){gameOver('win');return}
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
  for(const q of QKEYS){const ow=G.own[q];mx.fillStyle=(ow==='you'?'#8fbf4a40':BOSSES[ow].col+'38');mx.beginPath();
    if(q==='nord'){mx.moveTo(X(-625),X(-625));mx.lineTo(X(625),X(-625));for(let x=625;x>=-625;x-=25)mx.lineTo(X(x),X(riverZ(x)))}
    else{mx.rect(X(-625),X(RAILZ),X(625)-X(-625),X(625)-X(RAILZ))}
    mx.closePath();mx.fill()}
  for(const key of ['cite','port','butte']){const q=QGP[key],c=key===G.home?'#c98aff':key==='port'?BOSSES.vega.col:BOSSES.refe.col;mx.fillStyle='#120e0d';mx.fillRect(X(q[0])-6*f,X(q[1])-6*f,12*f,12*f);mx.fillStyle=c;mx.fillRect(X(q[0])-4.5*f,X(q[1])-4.5*f,9*f,9*f)}
  for(const o of orders){mx.fillStyle=(G.own[o.d]&&G.own[o.d]!=='you'&&!G.ally[G.own[o.d]])?'#ff4a30':'#ffa63d';mx.beginPath();mx.arc(X(o.x),X(o.z),(o.id===(trk&&trk.id)?5:3)*f,0,7);mx.fill()}
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
  for(const o of MP.others.values()){if(o.hid)continue;mx.fillStyle=enemy(o)?'#ff5a40':'#7fd1ff';mx.strokeStyle='#0b2230';mx.lineWidth=1.5*f;mx.beginPath();mx.arc(X(o.x),X(o.z),4.5*f,0,7);mx.fill();mx.stroke();
    if(big){mx.font='600 12px "Work Sans",sans-serif';mx.textAlign='center';mx.lineWidth=3;mx.strokeStyle='rgba(18,14,13,.9)';mx.strokeText(o.n,X(o.x),X(o.z)-10);mx.fillStyle='#7fd1ff';mx.fillText(o.n,X(o.x),X(o.z)-10)}}
  if(CAR){mx.fillStyle='#8fbf4a';mx.strokeStyle='#120e0d';mx.lineWidth=f;mx.fillRect(X(CAR.x)-3*f,X(CAR.z)-3*f,6*f,6*f);mx.strokeRect(X(CAR.x)-3*f,X(CAR.z)-3*f,6*f,6*f)}
  if(DV){mx.fillStyle='#ffa63d';mx.fillRect(X(DV.e.x)-2.5*f,X(DV.e.z)-2.5*f,5*f,5*f)}
  mx.lineWidth=1;
  if(WP){mx.strokeStyle='#7fd1ff';mx.lineWidth=2*f;mx.beginPath();mx.arc(X(WP.x),X(WP.z),8*f,0,7);mx.stroke();mx.lineWidth=1}
  mx.save();mx.translate(X(P.x),X(P.z));mx.rotate(Math.PI-P.th);mx.scale(f,f);mx.fillStyle='#fff';mx.strokeStyle='#000';mx.beginPath();mx.moveTo(0,-8);mx.lineTo(6,6);mx.lineTo(0,3);mx.lineTo(-6,6);mx.closePath();mx.fill();mx.stroke();mx.restore();
  if(big){
    mx.textAlign='center';
    for(const key of QKEYS){
      const d=QD[key],ow=G.own[key],cx=X(d.cx),cz=X(key==='nord'?-500:470);
      mx.font='700 19px "Bowlby One",Impact,sans-serif';mx.lineWidth=4;mx.strokeStyle='rgba(18,14,13,.9)';mx.strokeText(d.name,cx,cz);mx.fillStyle=d.col;mx.fillText(d.name,cx,cz);
      mx.font='600 12px "Work Sans",sans-serif';const t=key==='sud'?(G.retired.refe?'À toi':'Ton quartier · El Refe'):ow==='you'?'À toi':BOSSES[ow].name;mx.lineWidth=3;mx.strokeText(t,cx,cz+16);mx.fillStyle='#f3e6d6';mx.fillText(t,cx,cz+16);
    }
    {const cx=X(0),cz=X(-150);mx.font='700 19px "Bowlby One",Impact,sans-serif';mx.lineWidth=4;mx.strokeStyle='rgba(18,14,13,.9)';mx.strokeText('Centre-ville',cx,cz);mx.fillStyle='#e9dcc0';mx.fillText('Centre-ville',cx,cz);
     mx.font='600 12px "Work Sans",sans-serif';mx.lineWidth=3;mx.strokeText('Neutre · banque, police',cx,cz+16);mx.fillStyle='#f3e6d6';mx.fillText('Neutre · banque, police',cx,cz+16)}
    mx.font='600 11px "Work Sans",sans-serif';
    for(const key of DKEYS){const d=DIS[key],cx=X(LBLP[key][0]),cz=X(LBLP[key][1])+30;mx.lineWidth=3;mx.strokeStyle='rgba(18,14,13,.9)';mx.strokeText(d.name,cx,cz);mx.fillStyle='rgba(243,230,214,.75)';mx.fillText(d.name,cx,cz)}
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
  vis($('bPunch'),foot&&!pz&&!inside&&!HIDE&&!INT);
  {const bt=`${bagTot()} u. · ${bagUsed()}/${bagPlaces()}`;if($('hBag').textContent!==bt)$('hBag').textContent=bt;$('hBagBox').classList.toggle('full',bagUsed()>=bagPlaces())}
  // joystick à pied, flèches au volant
  vis($('joy'),foot&&!pz&&!HIDE);vis($('carCtl'),!foot&&!pz);
  if(!foot||pz){if(J.on){J.on=false;J.id=null;J.x=J.y=0;$('joyK').style.transform=''}}
  vis($('bHorn'),!foot);vis($('bFast'),!foot&&P.def.fast&&!M);vis($('speedo'),!foot);
  if(!foot){$('hSpd').textContent=Math.round(Math.hypot(P.vx,P.vz)*3.6);$('hVeh').textContent=P.def.name}
  if(WP&&Math.hypot(P.x-WP.x,P.z-WP.z)<12){toast('Arrivé : '+WP.label,'good');WP=null}
  // compteurs
  $('hCash').textContent=fmt(G.cash);$('hGoalBar').style.width=Math.min(100,(G.cash+(G.clean||0)+(G.bank||0))/GOAL*100)+'%';$('hClean').textContent=fmt(G.clean||0);
  vis($('hBankBox'),G.bank>0);if(G.bank>0)$('hBank').textContent=fmt(G.bank);
  $('hSeeds').textContent=seedTot();$('hRaw').textContent=rawTot();$('hStock').textContent=tot()+'/'+cap();
  vis($('hHeatBox'),G.heat>=1);if(G.heat>=1){$('hHeat').textContent=Math.round(G.heat)+' %';$('hHeatBar').style.width=G.heat+'%';$('hHeatBox').classList.toggle('hot',G.heat>=60)}
  vis($('hLifeBox'),G.hp<99.5);if(G.hp<99.5){$('hLife').textContent=Math.max(0,Math.round(G.hp));$('hLifeBar').style.width=Math.max(0,G.hp)+'%'}
  vis($('hCasierBox'),G.strikes>0);if(G.strikes>0)$('hCasier').textContent=G.strikes+'/'+MAXSTRIKES;
  $('hClock').textContent=TOD.label;
  const d=quarterAt(P.x,P.z),p=$('hDist'),ow=G.own[d.key],dt2=inside?'Ton labo':HIDE?'Chez '+HIDE.s.name:INT?INT.name:d.name+' · '+districtAt(P.x,P.z).name;
  if(p.textContent!==dt2){p.textContent=dt2;p.style.color=inside||HIDE||!ow?'#f3e6d6':ow==='you'?'#8fbf4a':BOSSES[ow].col}
  labAlT-=dt;if(labAlT<=0){labAlT=.5;LABAL=labAlerts();const h=$('hLab');vis(h,LABAL.txt);if(LABAL.txt){h.textContent='Labo : '+LABAL.txt;h.classList.toggle('bad',LABAL.bad)}}
  const b=$('banner');
  if(M){vis(b,1);b.style.background='';b.textContent=`GO FAST · ${Math.max(0,Math.ceil(M.t))} s · ${Math.round(Math.hypot(P.x-M.dest.x,P.z-M.dest.z))} m`}
  else if(HIDE){vis(b,1);b.style.background='rgba(60,50,90,.92)';b.textContent=`Caché chez ${HIDE.s.name} · chaleur ${Math.round(G.heat)} %`}
  else if(PLACE){vis(b,1);b.style.background='rgba(40,90,50,.92)';b.textContent=PLACE.ok?'Placement : aperçu vert, « Poser ici » pour valider':'Placement : avance ou tourne-toi'}
  else if(SBAN&&!INT){vis(b,1);b.style.background=SBAN.bg;b.textContent=SBAN.txt}
  else vis(b,0);
  mmT-=dt;if(mmT<=0){mmT=.1;pickTrack();drawMini()}
  // flèche de guidage : go fast, repère posé, ou client suivi
  const a=$('arrowBox');let tg=null,lab='',col='#ffa63d';
  if(HIDE||inside||INT){}
  else if(M){tg=M.dest;lab='Go fast';col='#ff7a1a'}
  else if(WP){tg=WP;lab=WP.label;col='#7fd1ff'}
  else if((QT=questTarget())){tg=QT;lab=QT.label;col='#ffd24a'}
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
const paused=()=>!started||!!CINE||menuOpen||raidOpen||talking||ended||shopOpen||mapBig||bagOpen;
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
  let s=`<p class="note">Quartier des Lilas. Tes quartiers : ${mySectors()}/2 (+10 % sur les prix par quartier en plus). Argent propre : ${fmt(G.clean||0)}. Objectif : ${fmt(GOAL)}. Casier : ${G.strikes}/${MAXSTRIKES}.</p>`;
  s+=`<div class="kpis"><div><small>Cash</small><b>${fmt(G.cash)}</b></div><div><small>Graines</small><b>${seedTot()}</b></div><div><small>Récolte</small><b>${rawTot()}</b></div><div><small>Produit</small><b>${tot()}/${cap()}</b></div></div>`;
  s+=`<div><h2>Tes machines · ${G.lab.items.length}</h2><p class="note" style="margin:4px 0 8px">Tu poses tes machines où tu veux dans le labo : approche-toi d’un endroit libre, « Poser une machine », puis place l’aperçu devant toi. Profondeur utilisable : ${Math.round(labDmax())} m sur ${Math.round(LAB?LAB.sh.D:17)} m${lv('labo')<4?' (agrandis le labo dans Améliorations)':''}.</p><div class="slots" id="labSlots">${slotsHtml()}</div></div>`;
  const store=MACH.filter(m=>(G.lab.store[m.id]||0)>0);
  if(store.length)s+=`<p class="note" style="color:var(--ok)">À installer : ${store.map(m=>G.lab.store[m.id]+' × '+m.name).join(', ')}.</p>`;
  s+='<div><h2>Tes variétés</h2><div class="list">'+STRAINS.filter(v=>G.unlocked[v.id]||G.seeds[v.id]||G.raw[v.id]||G.stock[v.id]).map(v=>`<div class="item"><b>${v.name}${G.sel===v.id?' <span class="tag ok">plantée par défaut</span>':''}</b><span>Graines ${G.seeds[v.id]||0} · Récolte ${G.raw[v.id]||0} · Produit ${G.stock[v.id]||0} · vente ~${fmt(v.price)}/u.</span>${G.sel===v.id?'':`<button class="btn ghost" data-act="sel:${v.id}">Planter par défaut</button>`}</div>`).join('')+'</div></div>';
  s+=confirmReset?`<div class="chips"><span class="note">Tout effacer ?</span><button class="btn red" data-act="resetyes">Oui, recommencer</button><button class="btn ghost" data-act="resetno">Non</button></div>`:`<div class="chips"><button class="btn ghost" data-act="lobby">Retour au lobby</button><button class="btn ghost" data-act="reset">${G.mode==='multi'?'Repartir de zéro (ton argent)':'Nouvelle partie'}</button></div>`;
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
    const btn=cur?'<button class="btn" disabled>Choisi</button>':own?`<button class="btn" data-act="pick:${v.id}">Le prendre</button>`:`<button class="btn" data-act="buy:${v.id}"${vehClean(v.id)?((G.clean||0)<c?' disabled':''):` data-cost="${c}"`}>Acheter ${fmt(c)}${vehClean(v.id)?' (propre)':''}</button>`;
    return `<div class="item"><b>${v.name}${v.fast?' <span class="tag fast">Go fast</span>':''}${own?' <span class="tag ok">Possédé</span>':''}</b><span>${Math.round(v.vmax*(v.kind==='bike'?1:mot())*3.6)} km/h${v.kind==='bike'?' · discret : ventes −30 % de chaleur, la chaleur retombe 40 % plus vite':''} · stock +${v.cap}</span>${btn}</div>`}).join('')+'</div>';
  return s;
}
function tabClients(){
  const list=orders.slice().sort((a,b)=>Math.hypot(a.x-P.x,a.z-P.z)-Math.hypot(b.x-P.x,b.z-P.z));
  return '<p class="note">Les cercles jaunes sont des clients de ton secteur ou de celui d’un allié. Les rouges sont chez un autre gang : ils paient 20 % de plus, mais le gérant prélève 10 % sur la vente. Touche une commande pour la suivre avec la flèche.</p><div class="list">'+list.map(o=>{
    const d=QD[o.d]||QD.sud,ok=canDeliver(o);
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
    return `<div class="item"><b style="color:${b.col}">${b.name} <span class="tag ${st==='ally'?'ok':(st==='war'||st==='hostile')?'fast':''}">${lab}</span></b><span>${b.style} Quartier : ${QD[b.sector].name}${G.own[b.sector]==='you'?' (à toi)':''}. Relation ${r>0?'+':''}${Math.round(r)}.${cut}</span>${G.retired[id]?'':`<button class="btn" data-act="gift:${id}" data-cost="${giftCost()}">Cadeau ${fmt(giftCost())}</button>`}</div>`}).join('')+'</div>';
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
    case 'buy':{if(buyVehicle(v)){toast(VM[v].name+' achetée. Elle t’attend '+(menuAt&&menuAt.park?'devant la concession':'devant le labo')+'.','good')}break}
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
    case 'lobby':save();location.reload();return;
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
$('goBtn').onclick=()=>{G=newG('cite');G.began=1;save();beginGame(true)};
const _pickOld=()=>{
  $('goRow').hidden=true;$('goals').hidden=true;$('pickBox').hidden=false;
  $('dgrid').innerHTML=DKEYS.map(k=>{const d=DIS[k],b=BOSSES[BIDS.find(x=>BOSSES[x].sector===k)],pk=PERKS[k];
    return `<button class="dcard" data-home="${k}" style="--c:${d.col}"><h3>${d.name}</h3><span class="war">Ton quartier. ${b.name} a raccroché : la place est libre.</span><span class="pro">+ ${pk.pro}</span><span class="con">− ${pk.con}</span></button>`}).join('');
};
$('dgrid').onclick=e=>{
  const c=e.target.closest('[data-home]');if(!c)return;
  G=newG(c.dataset.home);G.began=1;save();beginGame(true);
};
$('startLoad').onclick=async()=>{const m=$('startMsg');m.textContent='…';m.textContent=await loadCode($('startCode').value)};
function beginGame(fresh){
  applyLook();
  $('start').hidden=true;$('hud').hidden=false;started=true;
  placeLandmarks();spawnHome();storySetup();
  ended=false;HIDE=null;meetCar=null;meetT=110;setupGangs();syncCouriers();
  couriers.forEach(c=>{const p=randRoadPoint(homeSpawn().x,homeSpawn().z,10,60);c.x=p.x;c.z=p.z});
  orders.slice().forEach(removeOrder);
  if(fresh)storyBegin();
  else storyBegin()
  if(0){setTimeout(()=>toast('Ton labo a déjà deux pots, un séchoir installé et 5 graines. Plante, puis arrose : l’arrosoir se remplit au robinet, à droite de l’entrée.'),600);setTimeout(()=>toast('Le reste s’achète à la jardinerie (matériel) et à la graineterie (graines), ou se commande à l’ordinateur du labo, livré en camionnette.'),7000)}
}
function resetGame(){
  try{localStorage.removeItem(G&&G.mode==='multi'?'serre-mp-v1':KEY)}catch(e){}location.reload();return;
  endFast();cops=[];couriers=[];
  gangs=[];orders.slice().forEach(removeOrder);
  meetCar=null;HIDE=null;DV=null;parkCar(null);CINE=null;$('cine').hidden=true;
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
const partyCode=v=>{const c=String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'');return c==='PUBLIC'||c==='MULTI'||c.length===5?c:null};
const partyName=c=>c==='PUBLIC'?'publique':c==='MULTI'?'multijoueur':c;
const MPVER='serveur v2 · 2D';
function newPartyCode(){let c='';const a=new Uint32Array(5);try{crypto.getRandomValues(a)}catch(e){for(let i=0;i<5;i++)a[i]=Math.random()*4294967296}
  for(let i=0;i<5;i++)c+=CALPHA[a[i]%CALPHA.length];return c}
function mpSync(peers){
  const seen=new Set(),TM={};
  for(const p of peers){
    if(p.sameTab){MP.me=String(p.peer);continue}
    if(p.kind!=='viewer')continue;
    const pr=p.presence||{};
    if(typeof pr.cm==='string'&&/^[A-Z0-9]{5}$/.test(pr.cm))(TM[pr.cm]=TM[pr.cm]||[]).push(cleanTxt(pr.n,18)||'Joueur');
    if(typeof pr.x!=='number'||typeof pr.z!=='number')continue;
    seen.add(p.peer);
    let o=MP.others.get(p.peer);
    const x=pnum(pr.x,-610,610,0),z=pnum(pr.z,-610,610,0),th=pnum(pr.th,-1e3,1e3,0);
    if(!o){o={x,z,th,ph:0,sp:0,bub:null,lk:''};MP.others.set(p.peer,o);
      if(started)toast(cleanTxt(pr.n,18)+' a rejoint la partie.','chat')}
    o.tx=x;o.tz=z;o.tth=th;o.cm=typeof pr.cm==='string'?pr.cm.slice(0,8):'';o.id=String(p.peer);o.n=cleanTxt(pr.n,18)||'Joueur';
    o.k=MPK.has(pr.k)?pr.k:'foot';o.c=pcol(pr.c,0xd04a2a);o.cash=pnum(pr.cash,0,1e12,0);
    o.hd=typeof pr.hd==='string'&&DIS[pr.hd]?pr.hd:'';o.hid=pr.hid===1;
    const lk=[pcol(pr.sh,0x5a6b4a),pcol(pr.pa,0x3d5a88),pcol(pr.cp,0)].join(',');
    if(lk!==o.lk){o.lk=lk;const [sh,pa,cp]=lk.split(',').map(Number);o.look={...LOOK0,shirt:sh,pants:pa,cap:cp}}
  }
  for(const [k,o] of MP.others)if(!seen.has(k)){MP.others.delete(k);if(started)toast(o.n+' a quitté la partie.')}
  MP.count=MP.others.size;
  if(isMulti()&&CREW.code&&started)(TM[CREW.code]=TM[CREW.code]||[]).push(MP.nick);
  MP.teams=TM;
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
    if(started&&!HIDE&&!o.hid&&!paused()&&!(isMulti()&&o.cm!==CREW.code&&inLab(o.x,o.z))){
      const dx=P.x-o.x,dz=P.z-o.z,dd=Math.hypot(dx,dz),r=(P.def.kind==='foot'?.9:P.def.kind==='bike'||P.def.kind==='scooter'?1.4:2.2)+(o.k==='foot'?.9:o.k==='bike'||o.k==='scooter'?1.4:o.k==='truck'?3.4:2.1);
      if(dd<r&&dd>.01){const nx=dx/dd,nz=dz/dd;P.x+=nx*(r-dd);P.z+=nz*(r-dd);const vn=P.vx*nx+P.vz*nz;if(vn<0){P.vx-=1.4*vn*nx;P.vz-=1.4*vn*nz;if(-vn>6){Sfx.crash(Math.min(1,-vn/30));CAM.shake=Math.max(CAM.shake,Math.min(7,-vn*.3))}}}
    }
  }
  if(MP.myBub&&(MP.myBub.ttl-=dt)<=0)MP.myBub=null;
  MP.sendT-=dt;
  if(MP.g&&MP.sendT<=0){
    MP.sendT=.1;
    const st=started&&!ended?{n:MP.nick,x:Math.round(P.x*10)/10,z:Math.round(P.z*10)/10,th:Math.round(P.th*100)/100,k:P.def.kind,c:P.def.color,
      sh:PLAYER_LOOK.shirt,pa:PLAYER_LOOK.pants,cp:PLAYER_LOOK.cap||0,cash:Math.floor(G.cash+(G.bank||0)),hd:G.home,hid:HIDE||INT?1:0,cm:G.mode==='multi'&&CREW.code?CREW.code:''}:{n:MP.nick,x:null,z:null};
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
    const code=started&&G.mode!=='multi'?(partyCode(saved)||'PUBLIC'):'MULTI';
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

/* ---------- argent sale / argent propre, commerces de blanchiment ---------- */
/* G.cash = argent sale (ventes), G.clean = argent propre. Les commerces (laverie, kebab…) blanchissent le sale en propre, chaque minute, avec une limite. */
const BIZT={
  laverie:{name:'Laverie',short:'LAVERIE',price:12000,cap:1200,col:'#6fb7e0',desc:'Machines à pièces, personne ne compte les cycles.'},
  kebab:{name:'Kebab',short:'KEBAB',price:18000,cap:2000,col:'#e0503a',desc:'Des broches qui tournent jour et nuit, et des tickets de caisse à volonté.'},
  coiffeur:{name:'Salon de coiffure',short:'COIFFURE',price:35000,cap:3600,col:'#c98aff',desc:'Des clientes fidèles… sur le papier.'},
  lavage:{name:'Station de lavage',short:'LAVAGE AUTO',price:70000,cap:6500,col:'#3fa0c0',desc:'Paiement en liquide uniquement. Parfait.'},
  garage:{name:'Garage',short:'GARAGE',price:140000,cap:12000,col:'#a0a6ad',desc:'Des réparations que personne ne vérifie.'},
  boite:{name:'Boîte de nuit',short:'NIGHT-CLUB',price:350000,cap:30000,col:'#ff3fa0',desc:'Les entrées, les bouteilles, le vestiaire : tout se paie en liquide.'},
};
const BIZ_FEE=.12;
let BIZS=[];
const myBiz=()=>Object.keys(G.biz||{}).length;
const totalMoney=()=>G.cash+(G.clean||0)+(G.bank||0);
function payDirty(c){if(G.cash<c)return false;G.cash-=c;return true}
function payClean(c){if((G.clean||0)<c)return false;G.clean-=c;return true}
const vehClean=id=>!['bike','scooter','foot'].includes(VM[id].kind);
function buyVehicle(id,price){
  const v=VM[id];if(!v||G.owned[id])return false;price=price==null?vPrice(v):price;
  const clean=vehClean(id);
  if(clean?!payClean(price):!payDirty(price)){toast(clean?`Il faut ${fmt(price)} d’argent propre : pour une voiture, le concessionnaire n’accepte pas le liquide.`:'Pas assez d’argent.','bad');return false}
  G.owned[id]=1;chooseVehicle(id);Sfx.cash();if(clean)STO().f.carBought=1;save();return true;
}
/* façades libres (pas de magasin) : maison familiale, hall d'El Refe, commerces à vendre… */
function facadeSpots(zoneKey,quarter){
  const out=[];
  for(const B of BL)for(const b of B.bld){
    if(!b.shop||b.store||b.bank)continue;
    const d=b.shop;if(zoneKey&&districtAt(d.x,d.z).key!==zoneKey)continue;if(quarter&&quarterAt(d.x,d.z).key!==quarter)continue;
    const key=Math.floor((d.x+HALF)/PITCH)+','+Math.floor((d.z+HALF)/PITCH);
    if((BLK[key]||[]).some(r=>d.x>r.x0-1.2&&d.x<r.x1+1.2&&d.z>r.z0-1.2&&d.z<r.z1+1.2))continue;
    if(SHOPS.some(s=>Math.hypot(s.x-d.x,s.z-d.z)<28))continue;
    const cx=(b.x0+b.x1)/2,cz=(b.z0+b.z1)/2,ax=Math.abs(d.x-cx)>Math.abs(d.z-cz)?'x':'z',sg=ax==='x'?Math.sign(d.x-cx):Math.sign(d.z-cz);
    const nx=ax==='x'?sg:0,nz=ax==='z'?sg:0,fx=ax==='x'?(sg>0?b.x1:b.x0):d.x,fz=ax==='z'?(sg>0?b.z1:b.z0):d.z;
    let ok=true;for(const a of [2,3.5,5,6.5])for(const t of [-2.5,0,2.5])if(!pointFree(fx+nx*a-nz*t,fz+nz*a+nx*t,.5))ok=false;
    if(!ok)continue;
    out.push({x:d.x,z:d.z,fx,fz,nx,nz,tx:-nz,tz:nx,ax,sg,bh:b.h||8});
  }
  return out;
}
const spotAt=(s,a,t)=>[s.fx+s.nx*a+s.tx*t,s.fz+s.nz*a+s.tz*t];
const hash2=(x,z)=>((Math.round(x*7)*73856093)^(Math.round(z*7)*19349663))>>>0;
function bizSetup(avoid){
  BIZS=[];
  const far=(s,list,r)=>list.every(o=>Math.hypot(o.x-s.x,o.z-s.z)>r);
  const pickN=(q,types)=>{
    const c=facadeSpots(null,q).filter(s=>far(s,avoid,45)&&!(LAB&&Math.hypot(s.x-LAB.sh.door.x,s.z-LAB.sh.door.z)<40)).sort((a,b)=>hash2(a.x,a.z)%9973-hash2(b.x,b.z)%9973);
    let i=0;
    for(const s of c){if(i>=types.length)break;if(!far(s,BIZS,70))continue;BIZS.push(Object.assign(s,{id:q[0]+(i+1),type:types[i],q}));i++}
  };
  pickN('sud',['laverie','kebab','coiffeur','lavage','garage','boite']);
  pickN('centre',['laverie','kebab','coiffeur','lavage','boite']);
  pickN('nord',['laverie','kebab','garage']);
}
const bizOpenToBuy=b=>b.q!=='nord'||G.own.nord==='you';
let lauT=0;
function launderTick(dt){
  lauT+=dt;if(lauT<2)return;const step=lauT;lauT=0;
  for(const id in G.biz){
    const b=G.biz[id],T=BIZT[b.type];if(!T)continue;
    if(b.closed>0){b.closed=Math.max(0,b.closed-step);continue}
    G.clean=(G.clean||0)+T.cap*.03*step/60; // un peu de vrai chiffre d'affaires
    const amt=Math.min(G.cash,T.cap*step/60);if(amt<=0)continue;
    G.cash-=amt;G.clean+=amt*(1-BIZ_FEE);G.laund=(G.laund||0)+amt;b.total=(b.total||0)+amt;
  }
}
function bizTarget(){
  let best=null,bd=4;
  for(const b of BIZS){const d=Math.hypot(P.x-b.x,P.z-b.z);if(d>=bd)continue;bd=d;const T=BIZT[b.type],own=G.biz[b.id];
    if(own)best={k:'biz',b,label:`${T.name} : tes comptes`};
    else if(!bizOpenToBuy(b))best={k:'info',label:`${T.name} à vendre… mais le Nord appartient à Madame Vega`};
    else if(!storyAt('blanch_biz'))best={k:'info',label:`${T.name} à vendre (${fmt(T.price)})`};
    else best={k:'biz',b,label:`Acheter : ${T.name} (${fmt(T.price)})`}}
  return best;
}
function bizAct(b){
  const T=BIZT[b.type],own=G.biz[b.id];
  if(own){
    openDialog(T.name,T.col,{text:`${T.desc} Blanchit jusqu’à ${fmt(T.cap)} d’argent sale par minute (frais ${Math.round(BIZ_FEE*100)} %). Déjà blanchi ici : ${fmt(own.total||0)}.${own.closed>0?` Fermé encore ${Math.ceil(own.closed)} s après l’attaque du Nord.`:''}`,choices:[{label:'OK',close:1}]},()=>{});
    return}
  const first=!myBiz()&&STO().f.firstBizDirty;
  const can=first?G.cash>=T.price:(G.clean||0)>=T.price;
  openDialog('À vendre : '+T.name,T.col,{text:`${T.desc} Prix : ${fmt(T.price)} ${first?'(le Blanchisseur s’occupe des papiers : tu peux payer en argent sale, pour cette fois)':'en argent propre (un notaire, des papiers, une banque)'}. Une fois à toi, il blanchit jusqu’à ${fmt(T.cap)} par minute.`,choices:[
    {label:`Acheter ${fmt(T.price)}${first?' (sale)':' (propre)'}`,desc:can?'Les clés te sont remises tout de suite.':first?'Pas assez d’argent sale.':`Il te manque ${fmt(T.price-(G.clean||0))} d’argent propre.`,off:!can,fn:()=>{
      if(first?!payDirty(T.price):!payClean(T.price))return '« Revenez avec l’argent. »';
      G.biz[b.id]={type:b.type,t:G.t,total:0};Sfx.cash();save();
      return `${T.name} est à toi. Elle blanchira ton argent sale automatiquement, ${fmt(T.cap)} par minute au maximum.`}},
    {label:'Plus tard',close:1}]},()=>{});
}
function drawBizFronts(now){
  for(const b of BIZS){
    if(!inView(b.x,b.z,22))continue;
    const T=BIZT[b.type],own=G.biz[b.id],open=bizOpenToBuy(b);
    ctx.save();ctx.translate(b.x,b.z);
    if(b.ax==='x')ctx.transform(b.sg,0,0,1,0,0);else ctx.transform(0,b.sg,1,0,0,0);
    for(let k=0;k<6;k++){ctx.fillStyle=k%2?'#f1e8d6':own?T.col:'#8a8580';ctx.fillRect(-2.6,-3.3+k*1.1,3.2,1.1)}
    ctx.strokeStyle='rgba(0,0,0,.4)';ctx.lineWidth=.2;ctx.strokeRect(-2.6,-3.3,3.2,6.6);
    ctx.restore();
    // enseigne lisible, posée sur le trottoir devant la porte
    const [sx,sz]=spotAt(b,2.7,0),txt=own?T.short:'À VENDRE',night=TOD.n>.35;
    ctx.font='700 1.35px "Bowlby One",Impact,sans-serif';ctx.textAlign='center';
    const w=ctx.measureText(txt).width+1;
    ctx.fillStyle=own?'rgba(20,16,14,.85)':'rgba(245,240,230,.92)';rr(ctx,sx-w/2,sz-1.05,w,1.6,.3);ctx.fill();
    if(own&&night){ctx.save();ctx.shadowColor=T.col;ctx.shadowBlur=14;ctx.fillStyle=T.col;ctx.fillText(txt,sx,sz+.25);ctx.restore()}
    else{ctx.fillStyle=own?T.col:open?'#c0392b':'#7a6f66';ctx.fillText(txt,sx,sz+.25)}
    if(!own&&Math.hypot(P.x-b.x,P.z-b.z)<40){ctx.font='600 .9px "Work Sans",sans-serif';ctx.fillStyle='#f3e6d6';ctx.strokeStyle='rgba(15,10,8,.85)';ctx.lineWidth=.25;const t2=T.name+' · '+fmt(T.price);ctx.strokeText(t2,sx,sz+1.6);ctx.fillText(t2,sx,sz+1.6)}
    if(own&&own.closed>0){ctx.strokeStyle='#e0503a';ctx.lineWidth=.35;ctx.beginPath();ctx.moveTo(sx-2,sz-1);ctx.lineTo(sx+2,sz+.6);ctx.moveTo(sx+2,sz-1);ctx.lineTo(sx-2,sz+.6);ctx.stroke()}
  }
}

/* ---------- dialogues : répliques composées à la volée (El Refe, Vega, passants…), jamais deux fois la même d'affilée ---------- */
const RECENT=[];
function fresh(gen,tries){
  for(let i=0;i<(tries||25);i++){const s=gen();if(!RECENT.includes(s)){RECENT.push(s);if(RECENT.length>160)RECENT.shift();return s}}
  return gen();
}
const pk=a=>a[Math.floor(Math.random()*a.length)];
function ctxVars(){
  const h=TOD.label.split(' · ')[0],rain=WX.lvl>.35,night=TOD.n>.5;
  return {h,rain,night,heat:Math.round(G.heat),paid:fmt((G.story&&G.story.paid)||0),earned:fmt(G.earned),cash:fmt(G.cash),clean:fmt(G.clean||0),biz:myBiz(),ch:chapterOf()};
}
function chapterOf(){try{return CHAP_OF[STO().q]||1}catch(e){return 1}}
const W={
  weather:v=>v.rain?pk(['Avec cette pluie','Sous ce déluge','Avec ce temps de chien']):v.night?pk(['À cette heure-ci','Avec cette nuit noire','La nuit tombée']):pk(['Avec ce soleil','Par un temps pareil','En plein jour comme ça']),
};
/* --- El Refe --- */
const REFE_OPEN=['Tiens, le petit.','Regarde qui voilà.','Mon élève préféré.','Ah, le gamin des Lilas.','T’as une sale tête aujourd’hui.','Encore toi ?','Approche, approche.','Salut, champion.','Fais vite, j’ai du monde.','Le revoilà.','Toujours vivant, à ce que je vois.','Assieds-toi pas, t’es pas chez toi.','Tiens donc.','Qui c’est qui vient me voir…','T’as l’air pressé.','Ah, mon petit investissement.'];
const REFE_BODY={
  all:['Ici, tout le monde me doit quelque chose. Toi aussi.','Tu sais combien de gamins comme toi j’ai vus passer ? Très peu sont restés debout.','Le respect, ça se gagne en euros, pas en paroles.','Mes 30 %, je les compte tous les soirs. Je n’oublie jamais un centime.','La rue, c’est un échiquier. Toi, t’es un pion. Pour l’instant.','J’ai commencé avec moins que toi : un vélo volé et une grande gueule.','Ne fais jamais confiance à un client qui paie trop vite.','Les flics du Sud, je les connais par leur prénom.','Tu m’as déjà rapporté {paid}. Continue comme ça.','{W}, les clients restent chez eux. Mais ils fument quand même.','Il est {h}. Les meilleurs clients dorment encore, ou ne sont pas encore couchés.','Un bon vendeur, ça sourit, ça encaisse et ça disparaît.','Ton père t’a mis dehors ? Le mien m’a mis dehors deux fois. La deuxième, j’ai racheté sa maison.','Jamais de marchandise chez ta mère. Jamais.','Les dents en or, je les ai payées en liquide. Le dentiste n’a pas posé de questions.','Si un jour tu entends mon nom dans la bouche d’un flic, tu oublies le tien.','Le quartier change, mais les règles restent les mêmes.','Trois choses à ne jamais faire : parler, compter devant les gens, et me mentir.'],
  heat:['T’es brûlant, petit. Les bleus te sentent à trois rues.','Ta chaleur est à {heat} %. Calme-toi avant de revenir me voir.'],
  night:['La nuit, c’est notre heure. Les clients sont plus généreux et les flics plus fatigués.'],
  rain:['La pluie, c’est bon pour nous : les patrouilles restent au sec.'],
  c2:['Les bleus sont partout cette semaine. Fais-toi petit.','Le Nord, c’est chez Vega. Le Sud, c’est chez moi. Tant que chacun reste chez soi, tout le monde est content.','Vega et moi, on se connaît depuis trente ans. Ça ne veut pas dire qu’on s’aime.','Si je te vois traîner de l’autre côté de la rivière, on aura une discussion.','Opération Lilas, qu’ils appellent ça. Dans un mois, ils seront partis. Nous, on sera toujours là.'],
  c3:['On m’a dit que tu fréquentais le Blanchisseur. Fais attention à qui tu confies ton argent.','Une laverie ? T’as la fibre du commerce, maintenant ?','L’argent propre, c’est pour les banquiers. Nous, on compte en liasses.','Tu blanchis, tu blanchis… et ma part, elle est propre aussi ?'],
  c4:['Il y a un flic qui pose des questions sur moi. Tu saurais pas qui, par hasard ?','Je sens que tu me caches quelque chose, petit.','Tes commerces poussent comme des champignons. C’est beau, la réussite. C’est fragile, aussi.'],
};
const REFE_CLOSE=[' Allez, file.',' Maintenant dégage, tu fais peur aux clients.',' Et n’oublie pas ma part.',' On se reverra.',' Bonne chance, tu vas en avoir besoin.','',' Ciao.',' Va gagner de l’argent. Pour nous deux.'];
const fill=(s,v)=>s.replace(/\{(\w+)\}/g,(_,k)=>k==='W'?W.weather(v):v[k]!=null?v[k]:'');
function refeLine(){
  return fresh(()=>{const v=ctxVars();let pool=REFE_BODY.all.slice();
    if(v.heat>45)pool=pool.concat(REFE_BODY.heat,REFE_BODY.heat);if(v.night)pool=pool.concat(REFE_BODY.night);if(v.rain)pool=pool.concat(REFE_BODY.rain);
    if(v.ch>=2)pool=pool.concat(REFE_BODY.c2);if(v.ch>=3)pool=pool.concat(REFE_BODY.c3,REFE_BODY.c3);if(v.ch>=4)pool=pool.concat(REFE_BODY.c4,REFE_BODY.c4);
    return '« '+pk(REFE_OPEN)+' '+fill(pk(pool),v)+pk(REFE_CLOSE)+' »'});
}
const REFE_WAR=['Tu croyais que j’allais te laisser partir avec mon argent ?','Tu crois que Vega va te protéger ? Elle te vendra au premier prix.','Mes hommes connaissent ton adresse. Celle de ton labo aussi.','J’ai fait de toi quelqu’un. Je peux te défaire en une nuit.','Vega t’a monté la tête. Elle te lâchera, comme elle lâche tout le monde.','Chaque commerce que tu ouvres, je le brûlerai.'];
const refeWarLine=()=>fresh(()=>'« '+pk(['Toi.','Le traître.','Tiens, le petit ingrat.','Tu as du culot de venir ici.'])+' '+pk(REFE_WAR)+' »');
/* --- Madame Vega --- */
const VEGA_BODY=['Au Nord, on ne crie pas. On règle.','Je ne t’aime pas encore. Mais tu me rapportes, et ça compte.','Les hommes de Refe parlent trop. Toi, tu écoutes. Continue.','Il y a deux sortes de gens dans ce quartier : ceux qui comptent, et ceux qu’on compte.','{W}, mes dealers rentrent plus tôt. Ce n’est pas une excuse pour toi.','Le jour où Refe tombera, il faudra quelqu’un pour tenir le Sud.','Je joue aux échecs depuis que j’ai six ans. Je n’ai jamais perdu contre un homme pressé.','Ton labo tourne bien, à ce qu’on me dit. Ne t’endors pas.','Trente ans que je tiens le Nord. Personne ne m’a jamais pris un trottoir.','Un commerce propre, c’est une porte de sortie. Pense à la tienne.'];
const vegaLine=()=>fresh(()=>{const v=ctxVars();return '« '+pk(['Assieds-toi.','Tu es en retard.','Je t’écoute.','Bonsoir.','Te voilà.','Approche.'])+' '+fill(pk(VEGA_BODY),v)+' »'});
/* --- le Blanchisseur et le flic --- */
const BL_BODY=['L’argent sale, c’est comme une chemise tachée : il faut le bon produit, la bonne température, et de la patience.','Une laverie, un kebab, un garage… Plus il y a de liquide qui passe, moins on regarde le tien.','Ne blanchis jamais plus que ce que ton commerce peut raisonnablement gagner.','Le fisc s’ennuie avec les petits. Reste petit le plus longtemps possible.','Une facture, deux factures, trois factures… Au bout d’un moment, même toi tu y crois.','Je lave aussi à la main, si tu es pressé. Mais c’est plus cher.'];
const blLine=()=>fresh(()=>'« '+pk(['Ah, mon jeune ami.','Asseyez-vous, le café est bon ici.','Toujours ponctuel.','Vous avez taché quelque chose ?'])+' '+pk(BL_BODY)+' »');
const TP_BODY=['Les patrouilles changent d’itinéraire tous les mardis. Le commissaire est un maniaque.','On m’a mis dans les pattes un stagiaire. Il ne sait rien, tant mieux.','Le commissaire veut ta tête, mais il n’a pas de preuves. Garde ça comme ça.','Ici, je suis personne. Un type qui attend un bus. Ne m’appelle pas par mon nom.','Mes collègues pensent que je suis malade. Je le suis : malade de ce boulot.'];
const tpLine=()=>fresh(()=>'« '+pk(['Ne me regarde pas.','Fais comme si on ne se connaissait pas.','Vite.','T’as cinq minutes.'])+' '+pk(TP_BODY)+' »');

/* --- passants : salutations et conversations toujours différentes --- */
const PED_TOPICS={
  etudiant:['Les partiels me tuent, je dors trois heures par nuit.','Ma coloc laisse tout traîner, j’en peux plus.','Je cherche un job, mais personne ne veut de moi.','Mon prof de droit dit que la loi protège tout le monde. Il habite pas ici.','Je révise au café de la place, c’est plus calme qu’à la fac.','J’ai raté mon bus trois fois cette semaine.'],
  retraite:['De mon temps, ce quartier était calme.','Les jardins étaient plus beaux avant.','Je donne du pain aux pigeons tous les matins.','Mon mari jouait aux boules ici, sur la place.','La boulangère a augmenté ses prix. Encore.','Je connais tout le monde dans le Sud. Enfin, presque.'],
  commercant:['Les loyers montent, les clients se font rares.','Je ferme à vingt heures. Après, c’est le quartier des autres.','Une nouvelle laverie a ouvert ? Encore une. Qui lave autant de linge ?','Les livreurs me bloquent la rue toute la journée.','Mon fils veut reprendre la boutique. Je lui souhaite du courage.','Les touristes achètent des cartes postales, les gens d’ici achètent du crédit.'],
  sportif:['Quarante minutes tous les matins, ça change une vie.','Je prépare un semi-marathon.','Fais gaffe aux voitures sur le boulevard, ça roule vite.','Le parc des Jardins, c’est le meilleur parcours de la ville.','Le pont sur la rivière, c’est mon fractionné préféré.'],
  touriste:['On m’avait dit que les Lilas étaient dangereux. Je trouve ça charmant.','Je cherche un bon restaurant. Vous connaissez ?','Les gens sont tellement gentils ici.','Le phare, au bout du port, il se visite ?','J’ai pris cent photos de la rivière.'],
  ouvrier:['Cinq heures de la mat’ tous les jours. Mon dos me lâche.','Au port, ça bouge. Plein de camions.','Un petit coup de pouce après le boulot, ça ne se refuse pas.','Mon chef me paie en retard, encore.','On refait le pont, il paraît. Ça fait dix ans qu’on le dit.'],
  fetard:['Hier soir c’était complètement dingue.','Je connais tous les barmans du quartier.','Le DJ du samedi, il est génial.','Ce soir, c’est soirée au Bon Coin. Viens !','J’ai perdu mes clés. Encore.'],
};
const PED_WORLD=[
  v=>v.rain?'Quel temps pourri, hein ?':'Il fait bon, aujourd’hui.',
  v=>v.night?'Il est tard pour se promener.':'Belle journée pour traîner dehors.',
  v=>v.heat>45?'Il y a des flics partout ce soir. Il s’est passé quelque chose ?':'C’est calme, en ce moment. Ça fait du bien.',
  v=>v.ch>=5?'On dit que le Nord et le Sud vont se faire la guerre. J’ai peur pour mes enfants.':'On dit que le Nord et le Sud s’entendent bien. Tant mieux.',
  v=>v.biz?'Les nouveaux commerces du quartier marchent bien, on dirait.':'Il manque des commerces dans le coin. Une laverie, au moins.',
  ()=>'Vous avez vu le bus ? Il passe quand il veut.',
  ()=>'Mon voisin joue de la trompette à minuit. Je vais le tuer.',
  ()=>'Le kebab du coin fait les meilleures frites de la ville.',
  ()=>'Il paraît qu’El Refe a des dents en or. Je l’ai jamais vu sourire.',
  ()=>'Madame Vega a offert des fournitures à l’école du Nord. Drôle de bonne femme.',
  ()=>'Au Sud, tout le monde paie El Refe. Même la boulangère, il paraît.',
  v=>v.ch===2?'Opération Lilas, ils disent à la radio. Des flics à chaque coin de rue.':'Les flics sont repartis, on respire un peu.',
  ()=>'La police a encore arrêté quelqu’un près de la rivière.',
];
const PED_HI=['Salut !','Bonjour.','Ça va ?','Bonsoir.','Oui ?','Tu veux quoi ?','Hé, salut.','On se connaît ?','Je t’écoute.','Bonjour, jeune homme.','Coucou.','Oh, tu m’as fait peur.'];
const pedHi=K=>fresh(()=>'« '+pk(PED_HI)+(Math.random()<.5?' '+pk(K.hi).replace(/[«»]/g,'').trim():'')+' »');
function pedChat(p){
  return fresh(()=>{const v=ctxVars(),a=pk(PED_TOPICS[p.kind]||PED_TOPICS.etudiant),b=Math.random()<.55?' '+pk(PED_WORLD)(v):'';return '« '+a+b+' »'});
}
gossip=function(){const v=ctxVars();return fresh(()=>'« '+pk(PED_WORLD)(v)+' '+pk(PED_WORLD)(v)+' »')};

/* --- chercher quelqu'un : on demande aux passants et aux commerçants, indice après indice --- */
const CLUES={
  blanch:{who:'le Blanchisseur',q:'blanch_find',lines:[
    'Le Blanchisseur ? Il ne quitte jamais le Sud, paraît-il. Il aime l’odeur du café, pas celle de la rue.',
    'Il prend son café tous les jours sur la place de la République, au centre-ville, côté terrasse.',
    'Costume blanc, journal plié, toujours seul à sa table. Sur la place de la République. Tu ne peux pas le rater.']},
  taupe:{who:'le flic infiltré',q:'taupe_find',lines:[
    'Un flic en civil ? Il y en a un qui traîne dans le Nord, en bas des tours.',
    'Il fait semblant d’attendre un bus qui ne vient jamais. Toujours le même abribus.',
    'Blouson gris, casquette noire, un café froid à la main. À un arrêt de bus des Tours, près de la grande avenue.']},
};
function clueActive(){const q=STO().q;for(const k in CLUES)if(CLUES[k].q===q&&(STO().clue[k]||0)<3)return k;return null}
function askInfo(base){
  const k=clueActive();if(!k)return null;
  const C=CLUES[k],s=STO(),n=s.clue[k]||0;
  if(Math.random()<base){s.clue[k]=n+1;save();toast(`Indice ${n+1}/3 sur ${C.who} noté dans ton carnet (touche l’objectif pour le relire).`,'good');
    if(n+1===3)setTimeout(()=>toast('Une zone de recherche est apparue sur ta carte. À toi de le trouver.','good'),900);
    return '« '+C.lines[n]+' »'}
  return '« '+pk(['Connais pas.','Jamais entendu parler.','Demande à quelqu’un d’autre.','Je ne me mêle pas de ça.','Tu poses beaucoup de questions, toi.','Aucune idée, désolé.','Hmm… non. Essaie au bar, ils savent tout là-bas.','Les commerçants savent plus de choses que moi.'])+' »';
}
const askLabel=()=>{const k=clueActive();return k?`Demander des infos sur ${CLUES[k].who}`:null};
talkPed=function(p){
  p.hold=999;
  const K=PKINDS[p.kind],ask=askLabel(),base={retraite:.42,commercant:.45,etudiant:.25,sportif:.2,touriste:.08,ouvrier:.3,fetard:.35}[p.kind]||.25;
  const ch=[];
  if(ask)ch.push({label:ask,desc:'Peut-être qu’il sait quelque chose.',fn:()=>{
    if(Math.random()<.18&&G.cash>=30)return {text:'« Ça dépend… Ça vaut combien pour toi ? »',choices:[{label:'Donner 30 €',fn:()=>{G.cash-=30;return askInfo(Math.min(.95,base*2.2))}},{label:'Laisser tomber',close:1}]};
    return askInfo(base)}});
  ch.push({label:'Discuter',desc:'Un peu de conversation.',fn:()=>{
    const t=pedChat(p);
    if(Math.random()<.25){const o=genOrder(p.x,p.z,1.25,p.name);trackId=o.id;return t+' Puis : « Au fait, je connais quelqu’un qui cherche. Je t’ai mis la position sur la carte. »'}
    return t}});
  ch.push({label:'Lui proposer un échantillon',desc:'1 unité offerte, prise dans ton sac. Risqué.',off:bagTot()===0,fn:()=>{
      const s=STRAINS.slice().sort((a,b)=>a.price-b.price).find(s=>(G.bag.p[s.id]||0)>0);if(!s)return '« Tu n’as rien sur toi. »';
      G.bag.p[s.id]--;
      if(Math.random()<K.acc){const o=genOrder(p.x,p.z,1.3,p.name);trackId=o.id;G.heat=Math.min(100,G.heat+2);return '« Pas mal du tout ! Je t’en prends d’autres, regarde la carte. »'}
      if(Math.random()<.35){G.heat=Math.min(100,G.heat+10);return '« Mais ça va pas ? Je vais appeler la police ! » Chaleur +10.'}
      return '« Non merci, ce n’est pas pour moi. »'}});
  ch.push({label:'Acheter un tuyau (150 €)',desc:'Deux clients garantis.',need:150,fn:()=>lead(p.x,p.z,150)});
  ch.push({label:'Partir',close:1});
  openDialog(`${p.name} · ${K.label[p.g==='f'?1:0]}`,'#f3e6d6',{text:pedHi(K),choices:ch},()=>{p.hold=.6});
};
clerkTalk=function(s){
  const T=SHOPTYPES[s.type],ask=askLabel(),base=s.type==='bar'?(INT&&INT.drink?.85:.6):.5;
  const ch=[];
  if(ask)ch.push({label:ask,desc:s.type==='bar'?'Les barmans savent tout. Un verre aide.':'Les commerçants voient passer tout le monde.',fn:()=>askInfo(base)});
  ch.push({label:'Demander des nouvelles du quartier',desc:'Les rumeurs, ça ne coûte rien.',fn:()=>gossip()},
    {label:'Demander si quelqu’un cherche de la marchandise',desc:'Une chance sur deux.',fn:()=>lead(s.x,s.z,0)},
    {label:'Acheter un tuyau (150 €)',desc:'Deux clients garantis.',need:150,fn:()=>lead(s.x,s.z,150)},
    {label:'Au revoir',close:1});
  openDialog(s.clerk,T.col,{text:fresh(()=>'« '+pk(T.talk).replace(/[«»]/g,'').trim()+' '+pk(PED_WORLD)(ctxVars())+' »'),choices:ch},()=>{});
};

/* ---------- intérieurs des magasins : on entre, on prend dans les rayons, on paie à la caisse ---------- */
/* Pendant qu'on est dans un magasin, la ville est figée : on se déplace dans une pièce à part (INT.p), le joueur reste devant la porte. */
var INT=null;
const ISC=2.1;
const CLERK_LOOKS={banque:{skin:0xe3b895,shirt:0x2a2f3a,pants:0x1d1d20,shoe:0x222222,hair:0x3a2a1c,cap:0},concession:{skin:0xc99068,shirt:0x34405a,pants:0x1d1d20,shoe:0x111111,hair:0x111111,cap:0},
  bar:{skin:0xf0c8a5,shirt:0xf1e8d6,pants:0x222222,shoe:0x3a2a1c,hair:0x8a6a3a,cap:0},
  commissariat:{skin:0xc99068,shirt:0x1f2e4a,pants:0x1a2236,shoe:0x111111,hair:0x16110e,cap:0x1a2236}};
function shopItems(s){
  const T=SHOPTYPES[s.type],out=[];
  if(T.goods)for(const id of T.goods){const g=GOODS[id];if(g)out.push({kind:'good',id,name:g.name,price:g.price,col:g.look?(g.look.shirt!=null?hex2(g.look.shirt):g.look.pants!=null?hex2(g.look.pants):g.look.cap!=null?(g.look.cap?hex2(g.look.cap):'#d7a67f'):'#888'):pick(T.items),look:!!g.look})}
  if(s.type==='graineterie')for(const v of STRAINS)out.push(G.unlocked[v.id]?{kind:'seed',id:v.id,name:'Graines de '+v.name+' ×5',price:seedCost(v)*5,col:'#8fbf4a'}:{kind:'unlock',id:v.id,name:'Débloquer '+v.name,price:v.unlock,col:'#c9a05a'});
  if(s.type==='jardinerie')for(const m of MACH)out.push({kind:'mach',id:m.id,name:m.name,price:machPrice(m),col:m.cat==='culture'?'#a0502e':m.cat==='eau'?'#2f6f96':'#8d9096'});
  if(s.type==='concession')for(const v of VEH)if(v.id!=='foot')out.push({kind:'car',id:v.id,name:v.name,price:vPrice(v),col:hex2(v.color)});
  if(s.type==='bar')for(const u of TEAM)out.push({kind:'hire',id:u.id,name:u.name,price:tmCost(u),col:'#d4872b'});
  return out;
}
function itemState(it){
  if(it.kind==='good'){const g=GOODS[it.id];
    if(g.bag)return G.bag.lv>=g.bag?'Déjà à toi':'';
    if(g.look){const worn=Object.keys(g.look).every(k=>PLAYER_LOOK[k]===g.look[k]);return worn?'Porté':(g.price===0||inv(it.id))?'own':''}
    if(g.max)return inv(it.id)>=g.max?'Maximum atteint':''}
  if(it.kind==='car')return G.owned[it.id]?'own':'';
  if(it.kind==='hire'){const u=TEAM.find(x=>x.id===it.id);return lv(it.id)>=u.max?'Complet':''}
  return '';
}
function buildInterior(s){
  const T=SHOPTYPES[s.type],car=s.type==='concession',W=car?36:26,D=car?24:18;
  const I={s,name:s.name,type:s.type,T,W,D,walls:[],spots:[],basket:[],p:{x:W/2,z:D-1.8,th:Math.PI,vx:0,vz:0,v:0,ph:0},clerk:null,deco:[],t:0};
  const wall=(x0,z0,x1,z1,k)=>{const r={x0,z0,x1,z1,k};I.walls.push(r);return r};
  wall(-1,-1,W+1,.4);wall(-1,0,.4,D+1);wall(W-.4,0,W+1,D+1);wall(-1,D-.4,W/2-1.8,D+1);wall(W/2+1.8,D-.4,W+1,D+1);
  I.door={x:W/2,z:D-1.1};
  const items=shopItems(s);
  if(car){
    // showroom : voitures en épi, deux-roues près de l'entrée, bureau vitré au fond à droite
    const slots=[[11,10],[18,10],[25,10],[11,17.5],[18,17.5],[25,17.5],[32,17.5]],bikes=[[8,21.6],[12,21.6]];
    let ci=0,bi=0;
    for(const it of items){const v=VM[it.id],sm=v.kind==='bike'||v.kind==='scooter';
      if(v.kind==='truck'){it.x=3.2;it.z=12;it.th=0;it.sx=6;it.sz=12;I.spots.push(it);wall(1.4,5.6,5,18.4,'car');continue}
      const sl=sm?bikes[bi++]:slots[ci++];if(!sl)continue;
      it.x=sl[0];it.z=sl[1];it.th=sm?Math.PI/2:.3;it.sx=sl[0];it.sz=sl[1]+(sm?1.8:3.6);I.spots.push(it);
      if(!sm)wall(sl[0]-1.9,sl[1]-2.6,sl[0]+1.9,sl[1]+2.6,'car')}
    I.office={x0:W-10,z0:.4,x1:W-.4,z1:6.2,door:{x:W-6,z:6.9},desk:{x:W-5.2,z:2.6}};
    wall(W-10,5.8,W-7.4,6.3,'glass');wall(W-4.6,5.8,W-.4,6.3,'glass');wall(W-10.3,.4,W-9.8,6.3,'glass');
    wall(W-7,1.9,W-3.4,3.1,'desk');
    I.clerk={x:W-5.2,z:1.3,th:0,look:CLERK_LOOKS.concession,name:s.clerk};
    I.reg={x:W-6,z:7.4,label:'Parler au vendeur'};
  }else{
    // caisse à gauche, rayons à droite (deux étagères + un mur)
    wall(1.6,3.6,8.6,4.8,'counter');
    I.clerk={x:5,z:2.4,th:0,look:CLERK_LOOKS[s.type]||{skin:pick(SKINS),shirt:hexn(T.col),pants:0x2b3550,shoe:0x222222,hair:0x16110e,cap:0},name:s.clerk};
    I.reg={x:5,z:6.1,label:s.type==='banque'?'Guichet de la banque':s.type==='bar'?'Comptoir du bar':s.type==='commissariat'?'Accueil du commissariat':'Caisse'};
    if(s.type==='bar'){
      const seats=[[13,6],[20,6],[13,12],[20,12]];
      items.forEach((it,i)=>{const [tx,tz]=seats[i%4];wall(tx-1.2,tz-1.2,tx+1.2,tz+1.2,'table');it.x=tx+1.9;it.z=tz;it.sx=tx+3.3;it.sz=tz;it.look=randLook();it.seat=1;I.spots.push(it)});
      for(const [x,z] of [[3,10],[3,14],[8,13]]){wall(x-.9,z-.9,x+.9,z+.9,'stool');I.deco.push({k:'patron',x,z,look:randLook(),th:R(0,6)})}
    }else if(s.type==='commissariat'){
      wall(11,3.6,24,4.8,'counter');wall(18,8,24.6,8.6,'rack');wall(18,12,24.6,12.6,'rack');
      for(const [x,z] of [[13,11],[13,15]])I.deco.push({k:'bench',x,z});
      I.deco.push({k:'patron',x:20,z:2.4,look:CLERK_LOOKS.commissariat,th:0},{k:'patron',x:15.6,z:10.6,look:randLook(),th:Math.PI/2},{k:'plant',x:2,z:15},{k:'plant',x:24,z:15.5});
    }else if(s.type==='banque'){
      wall(11,3.6,24,4.8,'counter');I.deco.push({k:'vault',x:21,z:1.4});I.deco.push({k:'plant',x:2,z:15},{k:'plant',x:24,z:15},{k:'bench',x:13,z:11});
    }else{
      const rows=[{z0:5.4,z1:6.4,sz:7.6},{z0:10.4,z1:11.4,sz:12.6},{z0:.4,z1:1.4,sz:2.6}];
      const per=6,xs=[...Array(per)].map((_,i)=>12.2+i*2.2);
      rows.slice(0,2).forEach(r=>wall(11,r.z0,24.6,r.z1,'rack'));wall(11,.4,24.6,1.4,'rack');
      items.forEach((it,i)=>{const r=rows[Math.floor(i/per)%3],x=xs[i%per];it.x=x;it.z=(r.z0+r.z1)/2;it.sx=x;it.sz=r.sz;I.spots.push(it)});
      I.deco.push({k:s.type==='jardinerie'||s.type==='graineterie'?'plant':'crate',x:2.2,z:15.5},{k:'plant',x:24.4,z:15.5});
    }
  }
  return I;
}
function enterShop(s){
  for(const k in keys)keys[k]=0;
  if(PLACE)cancelPlace(true);
  INT=buildInterior(s);INT.cam={x:CAM.x,z:CAM.z,zoom:CAM.zoom};s.line=pick(SHOPTYPES[s.type].greet);
  Sfx.click();
  setTimeout(()=>{if(INT&&INT.s===s)toast(`${s.clerk} : ${s.line}`)},300);
}
openShop=enterShop;
function exitShop(force){
  if(!INT)return;
  if(INT.basket.length&&!force){
    openDialog(INT.s.clerk,INT.T.col,{text:'« Vous partez sans payer ? Je reprends les articles, alors. »',choices:[
      {label:'Reposer les articles et sortir',fn:()=>{INT.basket=[];exitShop(true);return 'Tu reposes tout sur les étagères.'}},
      {label:'Rester',close:1}]},()=>{});
    return}
  const c=INT.cam;INT=null;CAM.x=P.x;CAM.z=P.z;CAM.zoom=c?c.zoom:CAM.zoom;Sfx.click();save();
}
function intCollide(e,r){
  for(const b of INT.walls){const nx=clamp(e.x,b.x0,b.x1),nz=clamp(e.z,b.z0,b.z1),dx=e.x-nx,dz=e.z-nz,d2=dx*dx+dz*dz;
    if(d2<r*r){if(d2<1e-6){e.z=b.z1+r;continue}const d=Math.sqrt(d2);e.x=nx+dx/d*r;e.z=nz+dz/d*r}}
}
function updInterior(dt){
  const I=INT;I.t+=dt;if(CINE||talking)return;
  const p=I.p;let ix=J.x,iy=J.y,kb=false;
  if(!J.on){ix=(keys.r?1:0)-(keys.l?1:0);iy=(keys.dn?1:0)-(keys.up?1:0);kb=!!(ix||iy)}
  const mag=Math.min(1,Math.hypot(ix,iy));let mx=ix,mz=iy;const ml=Math.hypot(mx,mz);if(ml>1e-4){mx/=ml;mz/=ml}
  let sp=0;if(mag>.12)sp=kb?(keys.walk?2.4:5.4):mag>.8?5.4:2.4*(.5+.5*(mag-.12)/.68);
  const k=Math.min(1,dt*(sp?10:12));p.vx+=(mx*sp-p.vx)*k;p.vz+=(mz*sp-p.vz)*k;
  if(sp>.1){let d=Math.atan2(mx,mz)-p.th;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;p.th+=clamp(d,-dt*12,dt*12)}
  const ox=p.x,oz=p.z;p.x+=p.vx*dt;p.z+=p.vz*dt;intCollide(p,.5);
  p.x=clamp(p.x,.9,I.W-.9);if(p.z>I.D-.5){exitShop();p.z=I.D-1.2;p.vz=0}
  p.v=Math.hypot(p.x-ox,p.z-oz)/Math.max(dt,1e-4);p.ph+=p.v*dt*3.4;
}
function intZoom(){return clamp(Math.min(VW/(INT.W+3),(VH-60)/(INT.D+4)),15,48)}
function intCamera(dt){
  const I=INT,z=intZoom(),hw=VW/2/z,hh=VH/2/z;
  let tx=I.W/2,tz=I.D/2;
  if(2*hw<I.W+2)tx=clamp(I.p.x,hw-1,I.W-hw+1);if(2*hh<I.D+2)tz=clamp(I.p.z,hh-1.5,I.D-hh+1);
  const k=1-Math.exp(-dt*7);CAM.x+=(tx-CAM.x)*k;CAM.z+=(tz-CAM.z)*k;CAM.zoom+=(z-CAM.zoom)*k;CAM.shake=Math.max(0,CAM.shake-dt*14);
}
const basketTot=()=>INT?INT.basket.reduce((a,b)=>a+b.price,0):0;
function intTarget(){
  const I=INT,p=I.p;let best=null,bd=2.2;
  for(const it of I.spots){const d=Math.hypot(p.x-it.sx,p.z-it.sz);if(d>=bd)continue;bd=d;const st=itemState(it);
    if(it.kind==='car')best={k:'icar',it,label:st==='own'?`${it.name} : déjà à toi`:`Voir : ${it.name} (${fmt(it.price)})`};
    else if(it.kind==='hire')best=st?{k:'info',label:`${it.name} : ${st}`}:{k:'ihire',it,label:`Recruter : ${it.name} (${fmt(it.price)})`};
    else if(st==='own')best={k:'iwear',it,label:'Porter : '+it.name};
    else if(st)best={k:'info',label:`${it.name} : ${st}`};
    else if(I.basket.some(b=>b.key===it.kind+it.id)&&(it.kind!=='seed'))best={k:'iput',it,label:'Reposer : '+it.name};
    else best={k:'itake',it,label:`Prendre : ${it.name} (${fmt(it.price)})`}}
  {const d=Math.hypot(p.x-I.reg.x,p.z-I.reg.z);if(d<bd+.3){bd=d;
    best=I.basket.length?{k:'ipay',label:`Payer à la caisse : ${I.basket.length} article${I.basket.length>1?'s':''} · ${fmt(basketTot())}`}:{k:'ireg',label:I.type==='banque'?'Guichet : parler au banquier':I.type==='commissariat'?'Accueil : parler au brigadier':I.type==='bar'?'Commander au comptoir':I.type==='concession'?'Parler au vendeur':'Parler à '+I.clerk.name}}}
  if(Math.hypot(p.x-I.door.x,p.z-I.door.z)<bd+.6)best={k:'iexit',label:'Sortir'};
  return best;
}
function takeItem(it){
  const I=INT;
  if(it.kind==='good'){const g=GOODS[it.id];if(g.use&&bagRoomItem(it.id)<=I.basket.filter(b=>b.id===it.id).length+0){toast('Ton sac est plein.','bad');return}}
  I.basket.push({key:it.kind+it.id,kind:it.kind,id:it.id,name:it.name,price:it.price});
  floater(INT.p.x,INT.p.z,'+ '+it.name,'#ffd24a',false);Sfx.click();
  if(it.kind==='good'&&GOODS[it.id].look){Object.assign(PLAYER_LOOK,GOODS[it.id].look);delete PLAYER_LOOK.s;toast('Tu l’essaies. Paie à la caisse pour le garder.')}
}
function applyBought(b){
  if(b.kind==='good'){const g=GOODS[b.id];
    if(g.bag){G.bag.lv=Math.max(G.bag.lv,g.bag)}
    else if(g.look){G.inv[b.id]=1;Object.assign(G.look,g.look)}
    else if(g.use){bagAddItem(b.id,1)}
    else G.inv[b.id]=inv(b.id)+1}
  else if(b.kind==='seed'){G.seeds[b.id]=(G.seeds[b.id]||0)+5;STO().f.boughtSeeds=1}
  else if(b.kind==='unlock'){G.unlocked[b.id]=1;G.sel=b.id}
  else if(b.kind==='mach'){G.lab.store[b.id]=(G.lab.store[b.id]||0)+1}
}
function payDialog(){
  const I=INT,tot=basketTot();
  const list=I.basket.map(b=>`${b.name} : ${fmt(b.price)}`).join(' · ');
  openDialog(I.clerk.name+' · caisse',I.T.col,{text:`${list}. Total : ${fmt(tot)}. Tu as ${fmt(G.cash)} d’argent sale sur toi.`,choices:[
    {label:'Payer '+fmt(tot),desc:G.cash>=tot?'En liquide.':'Pas assez : repose quelque chose.',off:G.cash<tot,fn:()=>{
      if(!payDirty(tot))return '« Il manque de l’argent. »';
      I.basket.forEach(applyBought);const n=I.basket.length;I.basket=[];applyLook();Sfx.cash();save();
      return pick(['« Merci, bonne journée ! »','« Et voilà. Le ticket ? Non ? Comme vous voulez. »','« Revenez quand vous voulez. »'])+` (${n} article${n>1?'s':''} payé${n>1?'s':''})`}},
    ...I.basket.slice(0,4).map((b,i)=>({label:'Reposer : '+b.name,desc:'Retirer du panier.',fn:()=>{I.basket.splice(i,1);applyLook();return '« Pas de souci. »'}})),
    {label:'Continuer mes achats',close:1}]},()=>{});
}
function bankDialog(){
  const I=INT,amts=[1000,10000,100000];
  const ch=[];
  for(const a of amts)ch.push({label:'Déposer '+fmt(a),desc:'Argent propre uniquement.',off:(G.clean||0)<a,quick:1,fn:()=>{if(payClean(a)){G.bank=(G.bank||0)+a;Sfx.cash();toast(fmt(a)+' déposés au coffre.','good')}setTimeout(bankDialog,50)}});
  ch.push({label:'Tout déposer',desc:fmt(G.clean||0)+' propres.',off:(G.clean||0)<1,quick:1,fn:()=>{const a=Math.floor(G.clean||0);G.clean-=a;G.bank=(G.bank||0)+a;Sfx.cash();setTimeout(bankDialog,50)}});
  ch.push({label:'Tout retirer',desc:'Retour en argent propre.',off:!(G.bank>0),quick:1,fn:()=>{G.clean=(G.clean||0)+G.bank;G.bank=0;setTimeout(bankDialog,50)}});
  ch.push({label:'Parler au banquier',fn:()=>pick(['« Nous ne prenons que l’argent propre. Le reste, ce n’est pas notre métier. »','« Le coffre est à l’abri des descentes de police. »','« Un relevé de compte propre, c’est la meilleure des cartes de visite. »'])});
  ch.push({label:'Fermer',close:1});
  openDialog(I.clerk.name+' · Banque',I.T.col,{text:`Ton coffre : ${fmt(G.bank||0)}. Argent propre sur toi : ${fmt(G.clean||0)}. Argent sale : ${fmt(G.cash)} (refusé au guichet).`,choices:ch},()=>{});
}
function barDialog(){
  const I=INT;
  openDialog(I.clerk.name+' · Bar',I.T.col,{text:pick(I.T.talk),choices:[
    {label:'Un verre (8 €)',desc:'Chaleur -3, et le barman parle plus volontiers.',need:8,fn:()=>{G.cash-=8;G.heat=Math.max(0,G.heat-3);INT.drink=1;return pick(['« À la tienne. »','« Sers-toi, c’est la maison qui… non, c’est 8 €. »','« Un petit verre, ça délie les langues. »'])}},
    {label:'Parler',desc:'Rumeurs, clients, et peut-être plus.',fn:()=>{clerkTalk(I.s);return null}},
    {label:'Fermer',close:1}]},()=>{});
}
function hireDialog(it){
  const u=TEAM.find(x=>x.id===it.id),c=tmCost(u),names=['Yanis','Bilal','Steve','Moussa','Kevin','Nina','Jordan','Sofia','Malik','Lenny'];
  const nm=pick(names);
  openDialog(`${nm} · ${u.name}`,'#d4872b',{text:`« Je cherche du boulot. ${u.desc} » Tu en as ${lv(u.id)}/${u.max}.`,choices:[
    {label:'Engager pour '+fmt(c),desc:'Payé en liquide.',off:G.cash<c,fn:()=>{if(!payDirty(c))return '« Reviens avec l’argent. »';G.lv[u.id]=lv(u.id)+1;syncCouriers();save();return `« Je commence quand tu veux, patron. » ${nm} rejoint ton équipe.`}},
    {label:'Non merci',close:1}]},()=>{});
}
/* concession : on choisit la voiture, le vendeur t'emmène dans son bureau, on négocie */
function carDialog(it){
  const v=VM[it.id];
  if(G.owned[it.id]){openDialog(INT.clerk.name,INT.T.col,{text:`« Elle est déjà à vous. Je vous la sors ? »`,choices:[{label:'Oui, devant la concession',fn:()=>{menuAt=INT.s;chooseVehicle(it.id);menuAt=null;return '« Elle vous attend dehors. »'}},{label:'Non',close:1}]},()=>{});return}
  const clean=vehClean(it.id);
  openDialog(INT.clerk.name,INT.T.col,{text:`« ${pick(['Belle bête, hein ?','Vous avez l’œil.','Celle-là, elle ne restera pas longtemps.'])} ${v.name} : ${Math.round(v.vmax*(v.kind==='bike'?1:mot())*3.6)} km/h, ${v.cap} de coffre${v.fast?', parfaite pour les longs trajets pressés':''}. ${fmt(it.price)}${clean?'. Une voiture, ça se paie par virement : argent propre uniquement.':', en liquide si vous voulez.'} »`,choices:[
    {label:'Je la veux. On en parle ?',desc:'Il t’emmène dans son bureau pour négocier.',fn:()=>{setTimeout(()=>officeScene(it),60);return null}},
    {label:'Je regarde seulement',close:1}]},()=>{});
}
function officeScene(it){
  const I=INT,o=I.office,v=VM[it.id];closeTalk();
  const p=I.p,start={x:p.x,z:p.z},cl={x:it.sx+1.2,z:it.sz};
  const beats=[
    {d:2.6,who:'Le vendeur',txt:'« Excellent choix. Venez, on sera mieux dans mon bureau. »',f(c,k){
      const w=eio(seg(k,.1,1));c.npc.x=cl.x+(o.door.x-cl.x)*w;c.npc.z=cl.z+(o.door.z-.6-cl.z)*w;c.p.x=start.x+(o.door.x-1.1-start.x)*w;c.p.z=start.z+(o.door.z+.6-start.z)*w;
      c.npc.sp=k<1?2.2:0;c.p.sp=k<1?2.2:0;c.npc.th=faceTo(c.npc.x,c.npc.z,o.door.x,o.door.z-2);c.p.th=faceTo(c.p.x,c.p.z,o.door.x,o.door.z-2);c.npc.mode=c.p.mode=undefined;c.cam=[(c.p.x+o.door.x)/2,(c.p.z+o.door.z)/2-1,1]}},
    {d:2.6,nar:'Le bureau sent le café froid et le cuir neuf.',f(c,k){
      c.npc.x=o.desk.x;c.npc.z=o.desk.z-1.3;c.npc.th=0;c.npc.mode='sit';c.npc.sp=0;c.p.x=o.desk.x;c.p.z=o.desk.z+1.4;c.p.th=Math.PI;c.p.mode='sit';c.p.sp=0;c.cam=[o.desk.x,o.desk.z+.4,1.25]}},
    {d:3,who:'Le vendeur',txt:`« Alors, ${v.name}… Je vous la fais à ${fmt(it.price)}. Prix catalogue. Mais on peut discuter. »`,f(c,k){c.npc.mode='chat'}},
  ];
  startCine(beats,{space:'int',actors:{p:{look:PLAYER_LOOK},npc:{look:I.clerk.look}},onEnd:()=>{I.seat={npc:{x:o.desk.x,z:o.desk.z-1.3},p:{x:o.desk.x,z:o.desk.z+1.4}};I.p.x=o.door.x;I.p.z=o.door.z+.8;negotiate(it)}});
}
function negotiate(it){
  const I=INT,v=VM[it.id],base=it.price;let cur=base,mood=1,fails=0;
  const clean=()=>vehClean(it.id);
  const offer=(f,pr)=>({label:`Proposer ${fmt(Math.round(cur*f))}`,desc:`−${Math.round((1-f)*100)} %`,off:fails>=3,fn:()=>{
    const o=Math.round(cur*f);
    if(Math.random()<pr*mood){cur=o;mood*=.85;return step(pick([`« Hmm… ${fmt(o)}. Vous êtes dur en affaires. Allez, d’accord. »`,`« ${fmt(o)} ? Vous allez me mettre à la rue. Bon. Va pour ${fmt(o)}. »`,`« Je ne devrais pas… mais ${fmt(o)}, c’est d’accord. »`]))}
    fails++;mood*=.7;
    if(f<.85){cur=Math.round(cur*1.03);return step(`« Vous vous moquez de moi ? Pour la peine, c’est ${fmt(cur)} maintenant. »`)}
    return step(fails>=3?`« Bon. ${fmt(cur)}, c’est mon dernier prix. À prendre ou à laisser. »`:pick(['« Non. Impossible. »','« Vous rêvez, mon ami. »','« Mon patron me tuerait. »']))}});
  function step(txt){return {text:txt+` Prix actuel : ${fmt(cur)}${clean()?' (argent propre)':''}.`,choices:choices()}}
  function choices(){return [
    {label:`Signer à ${fmt(cur)}`,desc:clean()?`Virement en argent propre (tu as ${fmt(G.clean||0)}).`:`En liquide (tu as ${fmt(G.cash)}).`,fn:()=>{
      if(!buyVehicleAt(it.id,cur))return {text:clean()?`« ${fmt(cur)} en argent propre, monsieur. Pas un centime en liquide. Revenez quand vous aurez de quoi. »`:'« Il vous manque de l’argent. »',choices:[{label:'Partir',close:1}]};
      I.seat=null;return `« Félicitations ! » Il te tend les clés. ${v.name} t’attend devant la concession.`}},
    offer(.95,.8),offer(.9,.5),offer(.8,.22),
    {label:'Partir',desc:'Il garde la voiture pour un autre.',fn:()=>{I.seat=null;return '« Dommage. Ma porte reste ouverte. »'}}]}
  openDialog(I.clerk.name+' · bureau',I.T.col,{text:`Il croise les mains sur le bureau. Prix demandé : ${fmt(cur)}${clean()?' (argent propre uniquement)':''}.`,choices:choices()},()=>{I.seat=null});
}
function buyVehicleAt(id,price){const prev=menuAt;menuAt=INT&&INT.s;const ok=buyVehicle(id,price);menuAt=prev;return ok}
function intAct(t){
  if(!t)return;
  switch(t.k){
    case 'itake':takeItem(t.it);break;
    case 'iput':{const i=INT.basket.findIndex(b=>b.key===t.it.kind+t.it.id);if(i>=0)INT.basket.splice(i,1);applyLook();break}
    case 'iwear':{Object.assign(G.look,GOODS[t.it.id].look);applyLook();save();break}
    case 'ipay':payDialog();break;
    case 'ireg':if(INT.type==='banque')bankDialog();else if(INT.type==='commissariat')policeDialog();else if(INT.type==='bar')barDialog();else clerkTalk(INT.s);break;
    case 'icar':carDialog(t.it);break;
    case 'ihire':hireDialog(t.it);break;
    case 'iexit':exitShop();break;
  }
  Sfx.click();
}
/* ---------- dessin d'un intérieur ---------- */
function drawShelfItem(it,t){
  const x=it.x,z=it.z;
  if(it.kind==='seed'||it.kind==='unlock'){for(let k=0;k<3;k++){ctx.fillStyle=k%2?'#e9e2d0':it.col;rr(ctx,x-.75+k*.5,z-.35,.42,.7,.06);ctx.fill()}if(it.kind==='unlock'){ctx.fillStyle='#2a2220';rr(ctx,x-.25,z-.2,.5,.4,.08);ctx.fill()}return}
  if(it.kind==='mach'){const m=MM[it.id];if(m.cat==='culture'){el(ctx,x,z,.4,.4,it.id==='pot'?'#a0502e':it.id==='bac'?'#4a5a4a':'#dfe3e6');el(ctx,x,z,.28,.28,'#3a2a1c')}else if(m.cat==='eau'){el(ctx,x,z,.38,.38,'#2f6f96');el(ctx,x,z,.2,.2,'#24587a')}else{ctx.fillStyle='#8d9096';rr(ctx,x-.5,z-.4,1,.8,.08);ctx.fill();ctx.fillStyle='#2a2c30';ctx.fillRect(x-.2,z-.2,.4,.4)}return}
  if(it.kind==='good'&&it.look){ctx.fillStyle=it.col;rr(ctx,x-.5,z-.4,1,.8,.18);ctx.fill();ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(x-.04,z-.4,.08,.8);ctx.strokeStyle='#b8bcc2';ctx.lineWidth=.06;ctx.beginPath();ctx.moveTo(x-.2,z-.45);ctx.lineTo(x,z-.62);ctx.lineTo(x+.2,z-.45);ctx.stroke();return}
  ctx.fillStyle=it.col;rr(ctx,x-.55,z-.38,1.1,.76,.1);ctx.fill();ctx.fillStyle='rgba(255,255,255,.25)';ctx.fillRect(x-.55,z-.38,1.1,.16);
}
function drawInterior(now){
  const I=INT,T=I.T,t=now/1000;
  ctx.fillStyle='#0d0a09';ctx.fillRect(-60,-60,I.W+120,I.D+120);
  // sol : carrelage
  ctx.fillStyle=T.floor||'#2e2a26';ctx.fillRect(0,0,I.W,I.D);
  ctx.strokeStyle='rgba(255,255,255,.05)';ctx.lineWidth=.05;ctx.beginPath();for(let x=0;x<=I.W;x+=2){ctx.moveTo(x,0);ctx.lineTo(x,I.D)}for(let z=0;z<=I.D;z+=2){ctx.moveTo(0,z);ctx.lineTo(I.W,z)}ctx.stroke();
  if(I.type==='concession'){const g=ctx.createLinearGradient(0,0,I.W,I.D);g.addColorStop(0,'rgba(255,255,255,.06)');g.addColorStop(.5,'rgba(255,255,255,0)');g.addColorStop(1,'rgba(255,255,255,.05)');ctx.fillStyle=g;ctx.fillRect(0,0,I.W,I.D)}
  // lumière douce sous les plafonniers
  for(let x=6;x<I.W;x+=10)for(let z=5;z<I.D;z+=8){const g=ctx.createRadialGradient(x,z,.5,x,z,7);g.addColorStop(0,'rgba(255,236,200,.10)');g.addColorStop(1,'rgba(255,236,200,0)');ctx.fillStyle=g;ctx.fillRect(x-7,z-7,14,14)}
  // paillasson + porte
  ctx.fillStyle='#3a2a1c';rr(ctx,I.W/2-1.6,I.D-1.4,3.2,1,.15);ctx.fill();
  ctx.fillStyle='rgba(255,220,150,.18)';ctx.fillRect(I.W/2-1.8,I.D-.4,3.6,.6);
  ctx.font='600 .55px "Work Sans",sans-serif';ctx.textAlign='center';ctx.fillStyle='#d7c9b6';ctx.fillText('SORTIE',I.W/2,I.D-.7);
  // meubles
  for(const w of I.walls){
    const wd=w.x1-w.x0,hd=w.z1-w.z0;
    if(!w.k){ctx.fillStyle='#231c19';ctx.fillRect(w.x0,w.z0,wd,hd);continue}
    if(w.k==='rack'){ctx.fillStyle='#4a3a2c';rr(ctx,w.x0,w.z0,wd,hd,.12);ctx.fill();ctx.fillStyle='#6a5440';ctx.fillRect(w.x0+.1,w.z0+.1,wd-.2,.12)}
    else if(w.k==='counter'||w.k==='desk'){ctx.fillStyle=w.k==='desk'?'#5a3a22':'#6b4a2c';rr(ctx,w.x0,w.z0,wd,hd,.14);ctx.fill();ctx.fillStyle='rgba(255,255,255,.12)';ctx.fillRect(w.x0+.1,w.z0+.08,wd-.2,.14)}
    else if(w.k==='glass'){ctx.fillStyle='rgba(150,200,230,.35)';ctx.fillRect(w.x0,w.z0,wd,hd);ctx.strokeStyle='rgba(200,230,250,.6)';ctx.lineWidth=.06;ctx.strokeRect(w.x0,w.z0,wd,hd)}
    else if(w.k==='table'){el(ctx,(w.x0+w.x1)/2,(w.z0+w.z1)/2,wd/2,hd/2,'#5a3a22');el(ctx,(w.x0+w.x1)/2,(w.z0+w.z1)/2,wd/2-.15,hd/2-.15,'#6b4a2c');el(ctx,(w.x0+w.x1)/2+.3,(w.z0+w.z1)/2-.2,.16,.16,'#d4872b')}
    else if(w.k==='stool'){el(ctx,(w.x0+w.x1)/2,(w.z0+w.z1)/2,.5,.5,'#3a2a1c')}
  }
  if(I.office){const o=I.office;ctx.fillStyle='rgba(120,90,60,.25)';ctx.fillRect(o.x0,o.z0,o.x1-o.x0,o.z1-o.z0);ctx.font='600 .6px "Work Sans",sans-serif';ctx.fillStyle='#d7c9b6';ctx.fillText('BUREAU',o.door.x,o.z0+.9);
    el(ctx,o.desk.x-1.2,o.desk.z-.1,.25,.2,'#f1e8d6');ctx.fillStyle='#1a1a1a';ctx.fillRect(o.desk.x+.3,o.desk.z-.35,.9,.6)}
  for(const d of I.deco){
    if(d.k==='plant'){el(ctx,d.x,d.z,.6,.6,'#5a3a22');for(let i=0;i<6;i++){const a=i+t*.2;el(ctx,d.x+Math.cos(a)*.45,d.z+Math.sin(a)*.45,.35,.2,'#4f9a2f')}}
    else if(d.k==='crate'){ctx.fillStyle='#8a6a3a';ctx.fillRect(d.x-.7,d.z-.7,1.4,1.4);ctx.strokeStyle='#5a4428';ctx.lineWidth=.08;ctx.strokeRect(d.x-.7,d.z-.7,1.4,1.4)}
    else if(d.k==='vault'){el(ctx,d.x,d.z,1.3,1.3,'#8d9096');el(ctx,d.x,d.z,1,1,'#5f646b');ctx.strokeStyle='#d9b020';ctx.lineWidth=.12;ctx.beginPath();ctx.arc(d.x,d.z,.6,0,6.3);ctx.stroke()}
    else if(d.k==='bench'){ctx.fillStyle='#5a3a22';ctx.fillRect(d.x-2,d.z-.4,4,.8)}
    else if(d.k==='patron')drawHuman(d.x,d.z,d.th,d.look,0,0,ISC,'sit');
  }
  // articles et vendeurs
  for(const it of I.spots){
    if(it.kind==='car'){const V=VM[it.id];if(V.kind==='bike')drawBike(it.x,it.z,it.th,V.color,0);else drawVeh({x:it.x,z:it.z,th:it.th,spr:{k:V.kind==='scooter'?'scooter':V.kind,c:V.color},brk:false,park:true},now);
      ctx.fillStyle='rgba(255,255,255,.08)';ctx.beginPath();ctx.arc(it.x,it.z,3,0,6.3);ctx.fill();continue}
    if(it.kind==='hire'){drawHuman(it.x,it.z,-Math.PI/2,it.look,0,0,ISC,'sit');continue}
    drawShelfItem(it,t);
  }
  if(I.clerk&&!(CINE&&CINE.space==='int')&&!I.seat)drawHuman(I.clerk.x,I.clerk.z,I.clerk.th,I.clerk.look,0,0,ISC,talking?'chat':undefined);
  if(I.seat){drawHuman(I.seat.npc.x,I.seat.npc.z,0,I.clerk.look,0,0,ISC,'chat');drawHuman(I.seat.p.x,I.seat.p.z,Math.PI,PLAYER_LOOK,0,0,ISC,'sit')}
  // repère de la caisse
  if(!I.basket.length||I.type!=='concession'){const f=(t*.8)%1;ring(I.reg.x,I.reg.z,.6+f*.6,I.T.col,.08,(1-f)*.6)}
  // joueur (ou acteurs de la cinématique)
  if(CINE&&CINE.space==='int')drawCineActors(ISC);
  else if(!I.seat)drawHuman(I.p.x,I.p.z,I.p.th,PLAYER_LOOK,I.p.ph,Math.hypot(I.p.vx,I.p.vz),ISC);
  // étiquettes des articles proches
  ctx.textAlign='center';
  for(const it of I.spots){const d=Math.hypot(I.p.x-it.sx,I.p.z-it.sz);if(d>4.2||CINE)continue;
    const st=itemState(it),inB=I.basket.some(b=>b.key===it.kind+it.id),a=clamp(1.4-d/3.5,0,1);ctx.globalAlpha=a;
    const lbl=it.name,pr=st&&st!=='own'?st:st==='own'?'À toi':fmt(it.price)+(inB?' · dans le panier':'');
    const yy=it.kind==='car'?it.z-3.2:it.z-1.1;
    ctx.font='700 .62px "Work Sans",sans-serif';const w=Math.max(ctx.measureText(lbl).width,ctx.measureText(pr).width)+.8;
    ctx.fillStyle='rgba(20,15,13,.85)';rr(ctx,it.x-w/2,yy-1.25,w,1.45,.2);ctx.fill();
    ctx.fillStyle='#f3e6d6';ctx.fillText(lbl,it.x,yy-.55);ctx.font='600 .52px "Work Sans",sans-serif';ctx.fillStyle=inB?'#9ccf6a':'#ffd24a';ctx.fillText(pr,it.x,yy+.05);ctx.globalAlpha=1}
  // enseigne de la boutique
  ctx.font='700 .9px "Bowlby One",Impact,sans-serif';ctx.fillStyle=T.col;ctx.fillText(I.name.toUpperCase(),I.W/2,-.25);
}

/* ---------- histoire : cinq chapitres, El Refe (le Sud), Madame Vega (le Nord), le Blanchisseur, le flic infiltré, la trahison ---------- */
/* G.story = {v, q: objectif en cours, cut: El Refe prend 30 %, dead: El Refe est mort, paid: total versé, f: drapeaux, clue: indices trouvés} */
var CINE=null,QT=null,SBAN=null;
const REFE_CUT=.3;
const LOOKS={
  refe:{skin:0x8d5b3e,shirt:0xf2f2f2,pants:0x1d1d20,shoe:0xf1f1f1,hair:0x111111,cap:0x111111},
  side:{skin:0xc99068,shirt:0x2f5f8c,pants:0x2b3550,shoe:0x222222,hair:0x16110e,cap:0xd04a2a},
  dad:{skin:0xe3b895,shirt:0x6b6b70,pants:0x3a3a40,shoe:0x3a2a1c,hair:0x9a948c,cap:0},
  vega:{skin:0xd9a882,shirt:0x7a1f2b,pants:0x1d1d20,shoe:0x111111,hair:0x111111,cap:0,long:1},
  guard:{skin:0x6e4630,shirt:0x1d1d20,pants:0x1d1d20,shoe:0x111111,hair:0x111111,cap:0},
  blanch:{skin:0xf0c8a5,shirt:0xf4f1ea,pants:0xf4f1ea,shoe:0x7a5a3a,hair:0xc9c4bc,cap:0},
  taupe:{skin:0xe3b895,shirt:0x6d7076,pants:0x2b3550,shoe:0x222222,hair:0x3a2a1c,cap:0x1d1d20},
  nord:{skin:0xc99068,shirt:0xc9a02a,pants:0x1d1d20,shoe:0x111111,hair:0x111111,cap:0x1d1d20},
};
/* ---------- les chapitres et leurs objectifs ---------- */
const CHAPTERS=[
  {n:1,t:'À la rue',q:['intro','refe','vente','labo','plante','arrose','recolte','seche','sac','clients5','graines','benef','choix','c_labo','c_dealer','c_veh','refe2']},
  {n:2,t:'Les bleus',q:['tel','police','equipe','variete','vega','vega_liv','cash5k','refe3']},
  {n:3,t:'L’argent sale',q:['blanch_find','blanch_biz','lave5k','biz2','voiture','banque','blanch2']},
  {n:4,t:'La taupe',q:['taupe_find','taupe_pay','taupe_tip','biz3','net50k','taupe2']},
  {n:5,t:'La trahison',q:['guerre','defend','lieut','net150k','cache','refe_final']},
  {n:6,t:'Le patron des Lilas',q:['libre']},
];
const QORDER=CHAPTERS.flatMap(c=>c.q);
const CHAP_OF=Object.fromEntries(CHAPTERS.flatMap(c=>c.q.map(q=>[q,c.n])));
const qIdx=q=>QORDER.indexOf(q);
function STO(){
  if(G.mode==='multi'){if(!G.story||G.story.q!=='libre'||G.story.v!==2)G.story={v:2,q:'libre',cut:0,dead:1,paid:0,f:{deal:1,blanchMet:1,firstBizDirty:1,taupeMet:1},clue:{}};return G.story}
  if(!G.story)G.story={q:'intro',cut:0,dead:0,paid:0,f:{},clue:{}};
  const s=G.story;if(!s.f)s.f={};if(!s.clue)s.clue={};
  if(s.v!==2){ // sauvegardes d'avant les chapitres : on reprend au chapitre 2 (Refe vivant, 30 %)
    s.v=2;
    if(qIdx(s.q)<0||qIdx(s.q)>qIdx('c_veh')||s.dead){s.q=qIdx(s.q)>=0&&qIdx(s.q)<qIdx('refe')?s.q:'tel';s.dead=0;s.cut=1;s.f.deal=1}
  }
  return s;
}
const storyAt=q=>qIdx(STO().q)>=qIdx(q);
const labOpen=()=>storyAt('labo');
const war=()=>storyAt('guerre')&&!STO().dead;

/* ---------- lieux (mêmes pour tous les joueurs) ---------- */
let SPOT=null;
function nearestFacade(list,x,z,avoid){let b=null,bd=1e9;for(const s of list){if(avoid&&avoid.some(a=>Math.hypot(a.x-s.x,a.z-s.z)<45))continue;const d=Math.hypot(s.x-x,s.z-z);if(d<bd){bd=d;b=s}}return b}
function qgSpot(key){
  const [cx,cz]=QGP[key],r=roadsideSpot(cx,cz),dx=r.x-cx,dz=r.z-cz,l=Math.hypot(dx,dz)||1,nx=dx/l,nz=dz/l;
  return {x:cx+nx*9,z:cz+nz*9,nx,nz,tx:-nz,tz:nx,fx:cx+nx*7,fz:cz+nz*7};
}
function storySetup(){
  STO();if(!LAB)return;
  const door=LAB.sh.door,dl=s=>Math.hypot(s.x-door.x,s.z-door.z);
  const south=facadeSpots(null,'sud'),north=facadeSpots(null,'nord');
  const home=south.filter(s=>dl(s)>80&&dl(s)<300).sort((a,b)=>Math.abs(dl(a)-170)-Math.abs(dl(b)-170))[0]||south[0];
  const refe=south.filter(s=>s!==home&&Math.hypot(s.x-home.x,s.z-home.z)>90&&dl(s)>50).sort((a,b)=>Math.abs(dl(a)-120)-Math.abs(dl(b)-120))[0]||south.find(s=>s!==home);
  const lt1=nearestFacade(south,180,420,[refe,home]),lt2=nearestFacade(south,-180,300,[refe,home,lt1]);
  // le Blanchisseur : à une table de la terrasse de la place de la République
  let bt=CITY.props.filter(p=>p.k==='table').sort((a,b)=>Math.hypot(a.x-PLAZA.x-30,a.z-PLAZA.z)-Math.hypot(b.x-PLAZA.x-30,b.z-PLAZA.z))[0]||{x:PLAZA.x+20,z:PLAZA.z,a:0};
  const blanch={x:bt.x+Math.sin(bt.a+Math.PI)*1.5,z:bt.z+Math.cos(bt.a+Math.PI)*1.5,th:Math.atan2(bt.x-(bt.x+Math.sin(bt.a+Math.PI)*1.5),bt.z-(bt.z+Math.cos(bt.a+Math.PI)*1.5)),table:bt};
  CITY.npc=CITY.npc.filter(n=>Math.hypot(n.x-blanch.x,n.z-blanch.z)>1.2);
  // le flic infiltré : à un abribus des Tours, près de l'avenue centrale
  const sh=CITY.props.filter(p=>p.k==='shelter'&&quarterAt(p.x,p.z).key==='nord').sort((a,b)=>Math.hypot(a.x+120,a.z+330)-Math.hypot(b.x+120,b.z+330))[0]||{x:-150,z:-320,a:0};
  const taupe={x:sh.x+Math.sin(sh.a)*1.6+Math.cos(sh.a)*2.6,z:sh.z+Math.cos(sh.a)*1.6-Math.sin(sh.a)*2.6,th:sh.a};
  CITY.npc=CITY.npc.filter(n=>Math.hypot(n.x-taupe.x,n.z-taupe.z)>1.5);
  SPOT={home,refe,lt1,lt2,blanch,taupe,vega:qgSpot('port'),cache:qgSpot('butte')};
  bizSetup([home,refe,lt1,lt2].filter(Boolean));
  buildStoryNPC();
}
/* ---------- personnages de l'histoire ---------- */
let SNPC=[];
function mkNPC(o){return Object.assign({th:0,ph:0,sp:0,mode:'chat',punch:0,hp:100,max:100,dmg:9,cd:0,fight:false,ko:false,stag:0,talkT:0},o,{hx:o.x,hz:o.z})}
function buildStoryNPC(){
  const S=SPOT,s=STO();SNPC=[];
  const at=(sp,a,t)=>spotAt(sp,a,t);
  {const [x,z]=at(S.refe,2.4,0);SNPC.push(mkNPC({id:'refe',name:'El Refe',look:LOOKS.refe,x,z,th:Math.atan2(S.refe.nx,S.refe.nz),col:'#ffd24a',show:()=>!s.dead&&!storyAt('cache'),talk:talkRefe,noHit:1}))}
  {const [x,z]=at(S.refe,1.8,2.6);SNPC.push(mkNPC({id:'refe_side',name:'',look:LOOKS.side,x,z,th:Math.atan2(S.refe.nx,S.refe.nz),mode:'sit',chair:1,show:()=>!s.dead&&!storyAt('guerre')}))}
  {const v=S.vega;SNPC.push(mkNPC({id:'vega',name:'Madame Vega',look:LOOKS.vega,x:v.x,z:v.z,th:Math.atan2(v.nx,v.nz),col:BOSSES.vega.col,show:()=>storyAt('vega'),talk:talkVega,noHit:1}));
    for(const t of [-2.6,2.6])SNPC.push(mkNPC({id:'vg'+t,name:'',look:LOOKS.guard,x:v.x+v.tx*t-v.nx*.6,z:v.z+v.tz*t-v.nz*.6,th:Math.atan2(v.nx,v.nz),mode:undefined,show:()=>storyAt('vega'),noHit:1}))}
  {const b=S.blanch;SNPC.push(mkNPC({id:'blanch',name:'Le Blanchisseur',unknown:'Homme en blanc',look:LOOKS.blanch,x:b.x,z:b.z,th:b.th,mode:'sit',col:'#f4f1ea',show:()=>true,known:()=>!!s.f.blanchMet,talk:talkBlanch,noHit:1}))}
  {const t=S.taupe;SNPC.push(mkNPC({id:'taupe',name:'Le flic infiltré',unknown:'Un type qui attend le bus',look:LOOKS.taupe,x:t.x,z:t.z,th:t.th,mode:undefined,col:'#7fd1ff',show:()=>true,known:()=>!!s.f.taupeMet,talk:talkTaupe,noHit:1}))}
}
const npcById=id=>SNPC.find(n=>n.id===id);
/* combattants : lieutenants, gardes, hommes du Nord, El Refe à la fin */
let FIGHTERS=[];
function addFighter(o){const f=mkNPC(Object.assign({mode:undefined,aggro:7,leash:60},o));FIGHTERS.push(f);return f}
function spawnLieutenants(){
  const s=STO();FIGHTERS=FIGHTERS.filter(f=>f.group!=='lt');
  [['lt1','Le Grec'],['lt2','Sacha']].forEach(([k,name])=>{if(s.f['down_'+k])return;const sp=SPOT[k];if(!sp)return;const [x,z]=spotAt(sp,2.4,0);
    addFighter({id:k,name,look:{...LOOKS.nord,shirt:k==='lt1'?0x2a2f3a:0x5a1f2b},x,z,hp:130,max:130,dmg:10,group:'lt',col:'#ff7a5a',onDown:()=>{s.f['down_'+k]=1;s.f.lieutDown=(s.f.lieutDown||0)+1;toast(`${name} est hors jeu. ${s.f.lieutDown}/2 lieutenants d’El Refe.`,'good');G.heat=Math.max(G.heat,55)}});
    const [gx,gz]=spotAt(sp,3.2,2.2);addFighter({id:k+'g',name:'Garde',look:LOOKS.nord,x:gx,z:gz,hp:60,max:60,dmg:7,group:'lt'})});
}
function spawnHideout(){
  FIGHTERS=FIGHTERS.filter(f=>f.group!=='cache');const c=SPOT.cache;
  addFighter({id:'refeF',name:'El Refe',look:LOOKS.refe,x:c.x,z:c.z,hp:240,max:240,dmg:12,group:'cache',col:'#ffd24a',aggro:10,boss:1,onDown:refeDown});
  for(const t of [-3,3])addFighter({id:'cg'+t,name:'Garde du corps',look:LOOKS.guard,x:c.x+c.tx*t+c.nx,z:c.z+c.tz*t+c.nz,hp:80,max:80,dmg:8,group:'cache',aggro:12});
}
/* ---------- les objectifs ---------- */
const nearestShop=type=>{let b=null,bd=1e9;for(const s of SHOPS)if(s.type===type){const d=Math.hypot(s.x-P.x,s.z-P.z);if(d<bd){bd=d;b=s}}return b};
const shopTgt=type=>{const s=nearestShop(type);return s?{x:s.x,z:s.z,label:s.name}:null};
const labTgt=()=>inLab()||!LAB?null:{x:LAB.sh.door.x,z:LAB.sh.door.z,label:'Ton labo'};
const npcTgt=id=>{const n=npcById(id);return n?{x:n.x,z:n.z,label:n.name}:null};
function clientTgt(){
  if(bagTot()===0)return LAB?{x:LAB.sh.door.x,z:LAB.sh.door.z,label:'Labo : remplis ton sac'}:null;
  let b=null,bd=1e9;for(const o of orders)if(canDeliver(o)){const d=Math.hypot(o.x-P.x,o.z-P.z);if(d<bd){bd=d;b=o}}
  return b?{x:b.x,z:b.z,label:b.name}:null;
}
const plants=()=>G.lab.items.filter(it=>it.pl);
const F=()=>STO().f;
const crew=()=>lv('dealer')+lv('jardinier')+lv('livreur');
const Q={
  intro:{t:'À la rue',d:'Regarde la scène.'},
  refe:{t:'Va voir El Refe',d:'Il tient le hall d’un immeuble du Quartier Sud, pas loin de chez toi. Suis la flèche jaune et parle-lui (bouton d’action ou E).',who:'Toi',say:'« El Refe connaît tout le monde. Lui, il saura quoi faire. »',tg:()=>npcTgt('refe'),done:()=>F().deal},
  vente:{t:'Vends à ton premier client',d:'El Refe t’a donné 6 unités. Approche-toi du client (cercle jaune) : la vente se fait toute seule.',who:'El Refe',say:'« Tu t’approches, tu donnes, tu encaisses. Pas de blabla. Et 30 % pour moi. »',
    tg:()=>{const o=orders.find(q=>q.tuto);return o?{x:o.x,z:o.z,label:o.name}:clientTgt()},done:()=>F().sale1},
  labo:{t:'Entre dans ton labo',d:'El Refe t’a laissé les clés d’un local, plus loin dans le Sud. Suis la flèche et entre.',who:'El Refe',say:'« Le local est à toi. Tu y fais pousser, tu y fais sécher, et tu me ramènes ma part. »',tg:labTgt,done:()=>inLab()},
  plante:{t:'Plante une graine',d:'Approche-toi d’un pot et appuie sur le bouton d’action : « Planter ».',who:'El Refe',say:'« Une graine, un pot. Commence petit. »',tg:labTgt,done:()=>plants().length>0},
  arrose:{t:'Arrose ta plante',d:'Remplis l’arrosoir au robinet (à droite de l’entrée), puis arrose le pot.',who:'El Refe',say:'« Sans eau, elle fane. Garde un œil sur la jauge bleue. »',tg:labTgt,done:()=>F().water},
  recolte:{t:'Récolte quand c’est mûr',d:'La plante pousse toute seule (20 s pour l’herbe du jardin). Taille-la à mi-pousse pour +20 %, puis récolte à 100 %.',tg:labTgt,done:()=>F().harvest||rawTot()>0||tot()>0},
  seche:{t:'Fais sécher la récolte',d:'Approche-toi du séchoir et charge la récolte. Le produit sec part dans la réserve.',tg:labTgt,done:()=>F().dry||tot()>0},
  sac:{t:'Remplis ton sac',d:'Attends la fin du séchage, puis va aux étagères de la réserve (à droite de l’entrée) : « Remplir mon sac ».',tg:labTgt,done:()=>F().take},
  clients5:{t:'Vends à 5 clients',d:'Les clients sont les cercles jaunes. Replante entre deux tournées : le labo travaille pendant que tu vends.',who:'El Refe',say:'« Un client content en ramène deux. »',tg:clientTgt,prog:()=>`${Math.min(5,(F().sales||0)-(F().s0||0))} / 5 clients`,done:()=>(F().sales||0)-(F().s0||0)>=5},
  graines:{t:'Achète des graines',d:'Entre à la graineterie, prends un paquet dans les rayons, puis paie à la caisse.',who:'El Refe',say:'« Plus de graines, plus de plantes. Plus de plantes, plus de ma part. »',tg:()=>shopTgt('graineterie'),done:()=>F().boughtSeeds},
  benef:{t:'Gagne 400 €',d:'Continue de vendre. El Refe prend 30 % au passage.',tg:clientTgt,prog:()=>`${fmt(Math.max(0,G.earned-(F().e0||0)))} / 400 €`,done:()=>G.earned-(F().e0||0)>=400},
  choix:{t:'Choisis par quoi commencer',d:'Touche cet objectif pour choisir : agrandir le labo, recruter un dealer ou acheter un véhicule.',done:()=>!!F().choice},
  c_labo:{t:'Agrandis ton labo',d:'À l’ordinateur du labo (à gauche de l’entrée), onglet Améliorations : « Agrandir le labo ».',tg:labTgt,prog:()=>fmt(G.cash)+' / '+fmt(upCost(UPS[0])),done:()=>lv('labo')>=1},
  c_dealer:{t:'Recrute un dealer de rue',d:'Au bar (les candidats sont assis aux tables) ou à l’ordinateur du labo, onglet Équipe.',tg:()=>shopTgt('bar'),prog:()=>fmt(G.cash)+' / '+fmt(tmCost(TEAM[2])),done:()=>lv('dealer')>=1},
  c_veh:{t:'Achète un deux-roues',d:'À la concession : un vélo (80 €) ou un scooter (250 €). Les voitures, elles, se paient en argent propre.',tg:()=>shopTgt('concession'),done:()=>Object.keys(G.owned).some(k=>k!=='foot'&&G.owned[k])},
  refe2:{t:'Retourne voir El Refe',d:'Il a quelque chose à te dire.',tg:()=>npcTgt('refe'),done:()=>F().refe2},
  vega:{t:'Va voir Madame Vega',d:'La patronne du Nord veut te rencontrer devant sa tour du Port. Traverse la rivière… et ne le dis pas à El Refe.',who:'Message de Madame Vega',say:'« Le petit de Refe ? Viens me voir. On a peut-être des choses à se dire. »',tg:()=>npcTgt('vega'),done:()=>F().vega1},
  vega_liv:{t:'Livre les clients de Vega',d:'Trois clients de Vega, dans le Nord, attendent chacun 5 unités (cercles jaunes « Client de Vega »). Elle paie bien, et elle ne prend rien.',who:'Madame Vega',say:'« Trois clients. Pas un de moins. Je verrai ce que tu vaux. »',
    tg:()=>{const o=orders.find(q=>q.vega);return o?{x:o.x,z:o.z,label:o.name}:null},prog:()=>`${F().vliv||0} / 3 livrés`,done:()=>(F().vliv||0)>=3},
  tel:{t:'Achète un téléphone',d:'Dans une supérette. Avec un téléphone, les gérants t’envoient un message au lieu de venir te chercher.',who:'El Refe',say:'« Les flics écoutent les rues, pas les téléphones prépayés. Achète-toi un téléphone. »',tg:()=>shopTgt('superette'),done:()=>inv('telephone')>0},
  equipe:{t:'Monte une équipe',d:'Recrute au moins deux personnes (dealer, jardinier ou livreur), au bar ou à l’ordinateur.',tg:()=>shopTgt('bar'),prog:()=>`${Math.min(2,crew())} / 2`,done:()=>crew()>=2},
  variete:{t:'Débloque une nouvelle variété',d:'À la graineterie (rayon du fond) ou à l’ordinateur du labo. Les variétés chères rapportent plus.',tg:()=>shopTgt('graineterie'),done:()=>STRAINS.filter(s=>G.unlocked[s.id]).length>=3},
  police:{t:'Sème la police',d:'Opération Lilas : les flics quadrillent le quartier, en voiture et à pied, avec des barrages. Fais-toi prendre en chasse, puis échappe-leur : cache-toi dans une boutique, ou roule vite et loin.',who:'El Refe',say:'« Un gars qui ne sait pas semer les flics, c’est un gars en prison. »',done:()=>F().escaped},
  cash5k:{t:'Mets 5 000 € de côté',d:'Accumule 5 000 € d’argent sale.',prog:()=>fmt(G.cash)+' / 5 000 €',done:()=>G.cash>=5000},
  refe3:{t:'Retourne voir El Refe',d:'Il a remarqué tes liasses.',tg:()=>npcTgt('refe'),done:()=>F().refe3},
  blanch_find:{t:'Trouve le Blanchisseur',d:'Personne ne sait où il est… sauf ceux qui savent. Demande aux passants et aux commerçants (« Demander des infos »). Pas de flèche : c’est à toi de le trouver.',clue:'blanch',done:()=>F().blanchMet},
  blanch_biz:{t:'Ouvre ta première laverie',d:'Les commerces « À VENDRE » sont dans le Sud. Pour le premier, le Blanchisseur accepte ton argent sale.',who:'Le Blanchisseur',say:'« Une laverie. Les pièces tombent, personne ne compte. »',tg:()=>{const b=BIZS.find(b=>b.type==='laverie'&&b.q==='sud');return b?{x:b.x,z:b.z,label:'Laverie à vendre'}:null},done:()=>myBiz()>=1},
  lave5k:{t:'Blanchis 5 000 €',d:'Tes commerces transforment ton argent sale en argent propre, chaque minute. Garde du sale sur toi pour qu’ils aient de quoi laver.',prog:()=>`${fmt(Math.max(0,(G.laund||0)-(F().l0||0)))} / 5 000 €`,done:()=>(G.laund||0)-(F().l0||0)>=5000},
  biz2:{t:'Ouvre un deuxième commerce',d:'Celui-là se paie en argent propre. Un kebab, par exemple.',tg:()=>{const b=BIZS.find(b=>!G.biz[b.id]&&bizOpenToBuy(b));return b?{x:b.x,z:b.z,label:BIZT[b.type].name}:null},prog:()=>`${myBiz()} / 2`,done:()=>myBiz()>=2},
  voiture:{t:'Achète une voiture propre',d:'À la concession : choisis une voiture, négocie dans le bureau, et paie en argent propre.',tg:()=>shopTgt('concession'),done:()=>F().carBought},
  banque:{t:'Mets 10 000 € à la banque',d:'Seul l’argent propre est accepté au guichet. Ce qui est au coffre ne peut pas être saisi.',tg:()=>shopTgt('banque'),prog:()=>fmt(G.bank||0)+' / 10 000 €',done:()=>(G.bank||0)>=10000},
  blanch2:{t:'Retourne voir le Blanchisseur',d:'Il a un nom à te donner.',tg:()=>npcTgt('blanch'),done:()=>F().blanch2},
  taupe_find:{t:'Trouve le flic infiltré',d:'Un policier mange à tous les râteliers. Demande aux passants et aux commerçants. Pas de flèche.',clue:'taupe',done:()=>F().taupeMet},
  taupe_pay:{t:'Achète le flic',d:'Il veut 5 000 € pour te renseigner. Parle-lui.',tg:()=>npcTgt('taupe'),done:()=>F().taupePaid},
  taupe_tip:{t:'Profite de son tuyau',d:'Il t’enverra bientôt un message sur un contrôle de police. Pendant le contrôle, vends 15 unités hors de la zone rouge.',prog:()=>ZONE?`${F().tipSold||0} / 15 unités · contrôle : ${Math.ceil(ZONE.t)} s`:'En attente de son message…',done:()=>F().tipDone},
  biz3:{t:'Possède trois commerces',d:'Plus tu as de commerces, plus tu blanchis vite.',prog:()=>`${myBiz()} / 3`,done:()=>myBiz()>=3},
  net50k:{t:'Pèse 50 000 €',d:'Argent sale + argent propre + banque.',prog:()=>fmt(totalMoney())+' / 50 000 €',done:()=>totalMoney()>=50000},
  taupe2:{t:'Rendez-vous avec le flic',d:'Il a appris quelque chose sur El Refe.',tg:()=>npcTgt('taupe'),done:()=>F().taupe2},
  guerre:{t:'Va voir Madame Vega',d:'El Refe veut maintenant 50 % de tout, tes commerces compris. Seule la patronne du Nord peut t’aider à lui tenir tête.',tg:()=>npcTgt('vega'),done:()=>F().war},
  defend:{t:'Défends tes commerces',d:'Les hommes d’El Refe attaquent tes commerces. Va sur place et mets-les KO avant qu’ils ne cassent tout.',tg:()=>ATK?{x:ATK.x,z:ATK.z,label:'Attaque d’El Refe'}:null,prog:()=>`${F().repelled||0} / 3 attaques repoussées${ATK?` · ${Math.ceil(ATK.t)} s`:''}`,done:()=>(F().repelled||0)>=3},
  lieut:{t:'Élimine les lieutenants d’El Refe',d:'Le flic t’a donné leurs adresses dans le Sud : Le Grec et Sacha. Ils ont des gardes.',tg:()=>{const f=FIGHTERS.find(f=>f.group==='lt'&&!f.ko&&f.name!=='Garde');return f?{x:f.x,z:f.z,label:f.name}:null},prog:()=>`${F().lieutDown||0} / 2`,done:()=>(F().lieutDown||0)>=2},
  net150k:{t:'Pèse 150 000 €',d:'La guerre coûte cher. Remplis les caisses avant l’assaut final.',prog:()=>fmt(totalMoney())+' / 150 000 €',done:()=>totalMoney()>=150000},
  cache:{t:'Trouve la planque d’El Refe',d:'Le flic a trouvé où il se cache : son QG de La Butte, au sud-est. Vas-y.',tg:()=>({x:SPOT.cache.x,z:SPOT.cache.z,label:'Planque d’El Refe'}),done:()=>F().cacheFound},
  refe_final:{t:'Tue El Refe',d:'Il est là, avec ses gardes du corps. C’est la seule façon d’effacer ta dette.',tg:()=>{const f=FIGHTERS.find(f=>f.id==='refeF');return f&&!f.ko?{x:f.x,z:f.z,label:'El Refe'}:null},prog:()=>`Déjà versé à El Refe : ${fmt(STO().paid||0)}`,done:()=>STO().dead},
  libre:{t:'Deviens le patron des Lilas',d:'Le Sud est à toi. Le jour où Madame Vega voudra vendre le Nord, achète-le. Et atteins 10 000 000 €.',prog:()=>fmt(totalMoney())+' / 10 000 000 €',done:()=>false},
};
function questTarget(){const q=Q[STO().q];if(!q||!q.tg||CINE||INT)return null;const t=q.tg();return t&&Math.hypot(t.x-P.x,t.z-P.z)>6?t:null}
function nextQuest(){
  const s=STO(),cur=s.q,c0=CHAP_OF[cur];
  let n;
  if(cur==='choix')n='c_'+(s.f.choice||'veh');
  else if(cur.startsWith('c_'))n='refe2';
  else n=QORDER[qIdx(cur)+1]||'libre';
  s.q=n;questStart(n);renderQuest(true);save();
  if(CHAP_OF[n]!==c0)chapterCard(CHAP_OF[n]);
}
function chapterCard(n){
  const C=CHAPTERS.find(c=>c.n===n);if(!C)return;
  setTimeout(()=>{if(!CINE)startCine([{d:3.4,title:1,ttl:[n<6?'Chapitre '+n:'Épilogue',C.t],f(){}}],{space:INT?'int':'world',keep:1})},1200);
}
function questStart(q){
  const s=STO(),f=s.f;
  if(q==='clients5')f.s0=f.sales||0;
  if(q==='benef')f.e0=G.earned;
  if(q==='choix')f.asked=0;
  if(q==='lave5k')f.l0=G.laund||0;
  if(q==='vega_liv')spawnVegaOrders();
  if(q==='taupe_tip'){f.tipSold=0;setTimeout(()=>tipZone(true),20000)}
  if(q==='defend'){f.repelled=f.repelled||0;ATKT=25}
  if(q==='lieut'){spawnLieutenants();phoneMsg('📱 Le flic infiltré','#7fd1ff','Les deux lieutenants d’El Refe : Le Grec tient un hall à La Butte, Sacha traîne dans les Jardins. Ils ont chacun un garde. Je n’ai rien dit.')}
  if(q==='cache'){spawnHideout();phoneMsg('📱 Le flic infiltré','#7fd1ff','El Refe a quitté son hall. Il se cache dans son QG de La Butte, avec ses gardes du corps. C’est maintenant ou jamais.')}
  if(q==='vega')phoneMsg('📱 Madame Vega',BOSSES.vega.col,'Le petit de Refe ? Viens me voir devant ma tour du Port, dans le Nord. Seul. Et ce rendez-vous ne regarde pas El Refe.');
}
let qChkT=0,qFlash=0;
function questCheck(dt){
  qChkT-=dt;if(qChkT>0)return;qChkT=.25;
  const s=STO(),q=Q[s.q];if(!q||!q.done||s.q==='intro')return;
  if(q.done()){toast('Objectif atteint : '+q.t,'good');Sfx.cash();qFlash=1.2;
    if(s.q==='tel')setTimeout(()=>toast('📱 Les gérants t’enverront maintenant un message au lieu de venir te voir.','good'),900);
    nextQuest()}
}
let qOpen=false,qLast='';
function renderQuest(force){
  const el=$('quest');if(!el)return;
  if(G.mode==='multi'){vis(el,started&&!CINE);if(started&&!CINE)crewCard(el);return}
  const s=STO(),q=Q[s.q],show=!!q&&started&&!CINE&&s.q!=='intro';
  vis(el,show);if(!show)return;
  const ch=CHAP_OF[s.q],C=CHAPTERS.find(c=>c.n===ch),idx=C.q.filter(x=>!x.startsWith('c_')||x===s.q).indexOf(s.q)+1,tot=C.q.filter(x=>!x.startsWith('c_')).length+(C.n===1?1:0);
  let pr=q.prog?q.prog():'';
  if(q.clue){const n=s.clue[q.clue]||0;pr=`Indices : ${n} / 3${n>=3?' · cherche dans la zone sur la carte':''}`}
  const h=`${s.q}|${qOpen}|${pr}|${q.clue?s.clue[q.clue]:''}`;
  if(!force&&h===qLast)return;qLast=h;
  $('qC').textContent=ch<6?`Chapitre ${ch} · ${C.t} · ${idx}/${tot}`:'Épilogue';
  $('qT').textContent=q.t;$('qD').textContent=q.d;vis($('qD'),qOpen);
  const sy=$('qS');
  if(q.clue){const n=s.clue[q.clue]||0;vis(sy,qOpen&&n>0);sy.textContent=n?'Carnet : '+CLUES[q.clue].lines.slice(0,n).map((l,i)=>`${i+1}. ${l}`).join(' '):''}
  else{vis(sy,qOpen&&!!q.say);if(q.say)sy.textContent=(q.who||'')+' : '+q.say}
  vis($('qP'),!!pr);$('qP').textContent=pr;
  el.classList.toggle('open',qOpen);
}
function questClick(){if(STO().q==='choix'){askChoice();return}qOpen=!qOpen;renderQuest(true)}

/* ---------- les dialogues des personnages ---------- */
function acceptDeal(){
  const s=STO();s.cut=1;s.f.deal=1;
  bagAddProd('jardin',6);
  const r=npcById('refe'),p=randRoadPoint(r.x,r.z,35,75),o=genOrder(p.x,p.z,1,'Un client d’El Refe');
  o.s='jardin';o.qty=4;o.price=8;o.ttl=1e9;o.tuto=1;o.rival=false;o.d=quarterAt(o.x,o.z).key;
  save();
  return '« Bien. Tiens, 6 unités pour commencer. Un client attend au coin de la rue : va le voir. Et n’oublie jamais : 30 % pour moi. À vie. »';
}
function talkRefe(){
  const s=STO(),q=s.q,col='#e0b020',ok=[{label:'OK',close:1}];
  if(q==='refe'){
    const deal={label:'Marché conclu',desc:'El Refe prendra 30 % de tout ce que tu gagnes.',fn:acceptDeal};
    openDialog('El Refe',col,{text:'« Alors c’est toi, le gamin qu’on a mis dehors ? Écoute bien. Je t’apprends tout : faire pousser, vendre, éviter les flics. Je te file même un local, ici, dans le Sud. En échange, je prends 30 % de tout ce que tu gagnes. À vie. »',choices:[
      deal,{label:'30 % à vie ? C’est du vol.',desc:'Tenter de négocier.',fn:()=>({text:'« Du vol ? Le vol, c’est de dormir sur un banc avec 150 € en poche. C’est ça ou la rue, petit. »',choices:[deal]})}]},()=>{});
    return}
  if(q==='refe2'){
    openDialog('El Refe',col,{text:refeLine()+' « Écoute bien. Les bleus lancent une opération sur les Lilas : patrouilles, barrages, flics à pied. Ça va chauffer pendant des semaines. Achète-toi un téléphone, monte une équipe, et apprends à les semer. »',choices:[{label:'Compris',fn:()=>{s.f.refe2=1;return '« Et souviens-toi : où que tu ailles, 30 % pour moi. »'}}]},()=>{});
    return}
  if(q==='refe3'){
    openDialog('El Refe',col,{text:`« Tu as ${fmt(G.cash)} en liasses dans les poches. C’est de l’argent sale : pas de voiture, pas de commerce, pas de banque avec ça. Il te faut le Blanchisseur. Je ne sais pas où il se planque, ce vieux renard. Demande autour de toi. »`,choices:[{label:'Je vais le trouver',fn:()=>{s.f.refe3=1;return '« Et quand il aura lavé ton argent, il sera propre… et toujours à 30 % pour moi. »'}}]},()=>{});
    return}
  if(war()){openDialog('El Refe',col,{text:refeWarLine(),choices:ok},()=>{});return}
  openDialog('El Refe',col,{text:refeLine(),choices:[{label:'Combien je t’ai rapporté ?',fn:()=>`« ${fmt(s.paid||0)}. Et ce n’est qu’un début. »`},{label:'Partir',close:1}]},()=>{});
}
function spawnVegaOrders(){
  const v=npcById('vega');orders.filter(o=>o.vega).forEach(removeOrder);
  const s=STRAINS.filter(x=>G.unlocked[x.id]).sort((a,b)=>a.price-b.price)[0];
  const done=F().vliv||0;
  for(let i=done;i<3;i++){const p=randRoadPoint(v.x,v.z,90,320);const o=genOrder(p.x,p.z,1.2,'Client de Vega');o.s=s.id;o.qty=5;o.ttl=1e9;o.vega=1;o.price=Math.round(s.price*1.3*10)/10}
}
function talkVega(){
  const s=STO(),q=s.q,col=BOSSES.vega.col,ok=[{label:'OK',close:1}];
  if(q==='vega'){
    openDialog('Madame Vega',col,{text:'« Alors c’est toi, le petit de Refe. Ici, c’est le Nord : mon trottoir, mes règles. Refe te prend 30 % ? Moi, je ne prends rien à ceux qui travaillent bien. Trois de mes clients attendent de la marchandise. Montre-moi ce que tu vaux. »',choices:[{label:'C’est comme si c’était fait',fn:()=>{s.f.vega1=1;G.ally.vega=.0001;G.rel.vega=Math.max(G.rel.vega||0,10);return '« Et pas un mot à Refe. Il n’aime pas qu’on traverse la rivière. »'}}]},()=>{});return}
  if(q==='guerre'){
    openDialog('Madame Vega',col,{text:'« Je sais. Refe veut 50 % de tout, tes commerces compris. Trente ans que je le connais : il finit toujours par dévorer ceux qu’il a nourris. Je t’aide. Les siens ne passeront pas la rivière. Mais c’est à toi de le finir. »',choices:[{label:'Marché conclu',fn:()=>{startWar();return '« Défends tes commerces. Et quand ce sera le moment, finis-en avec lui. »'}}]},()=>{});return}
  openDialog('Madame Vega',col,{text:vegaLine(),choices:ok},()=>{});
}
function startWar(){
  const s=STO();s.f.war=1;delete G.ally.refe;G.rel.refe=-100;G.ally.vega=.0001;G.rel.vega=Math.max(G.rel.vega||0,30);
  toast('Guerre ouverte avec El Refe : ses voitures dorées te tireront dessus dans le Sud. Madame Vega te couvre dans le Nord.','bad');
  setupGangs();save();
}
function talkBlanch(){
  const s=STO(),q=s.q,col='#f4f1ea';
  if(!s.f.blanchMet){
    if(q!=='blanch_find'||(s.clue.blanch||0)<1){openDialog('Homme en blanc',col,{text:pk(['« Pardon ? Je ne vous connais pas. »','« Je lis mon journal, jeune homme. »','« Il fait beau, n’est-ce pas ? »']),choices:[{label:'Partir',close:1}]},()=>{});return}
    openDialog('Homme en blanc',col,{text:'« Vous me cherchiez, je crois. On m’a dit qu’un jeune homme posait des questions sur moi dans tout le Sud. Asseyez-vous. »',choices:[{label:'C’est El Refe qui m’envoie',fn:()=>{s.f.blanchMet=1;s.f.firstBizDirty=1;
      return '« Refe… Il vous prend combien ? Trente pour cent ? Il ne change pas. Écoutez-moi : l’argent sale, il faut le faire passer dans un commerce. Une laverie, un kebab, un garage. Le commerce encaisse, déclare, paie ses impôts, et votre argent ressort propre. Pour le premier, je m’occupe des papiers : vous pourrez le payer en liquide. Ensuite, ce sera de l’argent propre, comme tout le monde. »'}}]},()=>{});
    return}
  if(q==='blanch2'){openDialog('Le Blanchisseur',col,{text:'« Vous apprenez vite. Un conseil : tôt ou tard, la police s’intéressera à vos commerces. Il y a un flic, dans le Nord, qui mange à tous les râteliers. Il en sait plus sur Refe que Refe lui-même. Trouvez-le avant qu’il ne vous trouve. Je ne connais pas son nom. Personne ne le connaît. »',choices:[{label:'Je vais le trouver',fn:()=>{s.f.blanch2=1;return '« Bonne chance. Et changez de chemise, vous avez une tache. »'}}]},()=>{});return}
  const lim=Math.max(0,20000-(s.f.blDay||0));
  openDialog('Le Blanchisseur',col,{text:blLine()+` Je peux aussi laver à la main : 35 % de commission, ${fmt(lim)} au maximum pour l’instant.`,choices:[
    ...[1000,5000,20000].map(a=>({label:`Laver ${fmt(a)} (tu récupères ${fmt(a*.65)})`,off:G.cash<a||lim<a,fn:()=>{G.cash-=a;G.clean=(G.clean||0)+a*.65;G.laund=(G.laund||0)+a;s.f.blDay=(s.f.blDay||0)+a;Sfx.cash();return '« Voilà. Comme neuf. »'}})),
    {label:'Partir',close:1}]},()=>{});
}
function talkTaupe(){
  const s=STO(),q=s.q,col='#7fd1ff';
  if(!s.f.taupeMet){
    if(q!=='taupe_find'||(s.clue.taupe||0)<1){openDialog('Un type qui attend le bus',col,{text:pk(['« Le 42 ? Il passe quand il veut. »','« Je ne suis pas d’ici. »','« Tu veux quoi ? »']),choices:[{label:'Partir',close:1}]},()=>{});return}
    openDialog('Un type qui attend le bus',col,{text:'« Tu m’as trouvé. Bravo. Ne me regarde pas, regarde la route. Oui, je suis flic. Et oui, je peux t’être utile. »',choices:[{label:'Combien ?',fn:()=>{s.f.taupeMet=1;return '« 5 000 €. En liquide. Et ensuite, je te préviens des contrôles, des descentes, de ce que prépare le commissaire. Tu me trouveras ici. »'}}]},()=>{});return}
  if(q==='taupe_pay'){openDialog('Le flic infiltré',col,{text:'« Alors, ces 5 000 € ? »',choices:[{label:'Payer 5 000 € (sale)',off:G.cash<5000,fn:()=>{G.cash-=5000;s.f.taupePaid=1;TIPT=60;return '« Marché conclu. Garde ton téléphone allumé. »'}},{label:'Plus tard',close:1}]},()=>{});return}
  if(q==='taupe2'){openDialog('Le flic infiltré',col,{text:'« Écoute bien. El Refe sait tout : tes commerces, le Blanchisseur, tes rendez-vous avec Vega. Il va exiger 50 % de tout ce que tu gagnes, et si tu refuses, il te balance à mes collègues. La seule qui peut t’aider, c’est Vega. Va la voir. »',choices:[{label:'Merci',fn:()=>{s.f.taupe2=1;return '« Je n’ai rien dit. »'}}]},()=>{});return}
  const ch=[{label:'Effacer ma chaleur (2 000 €)',off:G.cash<2000||G.heat<5,fn:()=>{G.cash-=2000;G.heat=0;return '« C’est fait. Personne ne te cherche, pour l’instant. »'}},
    {label:'Effacer un casier (8 000 €)',off:G.cash<8000||!G.strikes,fn:()=>{G.cash-=8000;G.strikes--;return '« Un dossier a disparu. »'}},
    {label:'Les positions des patrouilles (500 €)',off:G.cash<500,fn:()=>{G.cash-=500;REVEAL=90;return '« Regarde ta carte. Tu as une minute et demie. »'}},
    {label:'Partir',close:1}];
  openDialog('Le flic infiltré',col,{text:tpLine(),choices:ch},()=>{});
}
function askChoice(){
  const s=STO();if(s.q!=='choix'||paused())return;s.f.asked=1;
  const c=(id,label,desc)=>({label,desc,fn:()=>{s.f.choice=id;return id==='labo'?'« Bon choix. Plus de place, plus de pots, plus de récolte. Va à l’ordinateur du labo. »':id==='dealer'?'« Un dealer, ça vend pendant que tu dors. Passe au bar, il y a du monde qui cherche du boulot. »':'« Avec des roues, tu feras trois fois plus de clients. File à la concession. »'}});
  openDialog('El Refe','#e0b020',{text:'Un message d’El Refe : « Tu as fait tes premiers billets. Maintenant, tu choisis : tu investis dans quoi ? »',choices:[
    c('labo','Agrandir le labo',`Plus de place pour les machines · ${fmt(upCost(UPS[0]))}`),
    c('dealer','Recruter un dealer de rue',`Il vend ta réserve à ta place · ${fmt(tmCost(TEAM[2]))}`),
    c('veh','Acheter un deux-roues','Vélo 80 €, scooter 250 €, à la concession')]},()=>{});
}
function refeDown(){
  const s=STO();s.dead=1;s.cut=0;G.retired.refe=1;G.own.sud='you';
  CAM.shake=6;Sfx.crash(.7);G.heat=Math.max(G.heat,70);
  toast('El Refe est mort. Ta dette est effacée. Le Sud est à toi.','good');save();
  setTimeout(()=>startCine([
    {d:3.4,nar:'Le roi du Sud est tombé. Les liasses, les trottoirs, les dettes : tout change de main ce soir.',f(){}},
    {d:3.6,who:'Madame Vega',txt:'« Le Sud est à toi. Le Nord reste à moi. On sera de bons voisins… n’est-ce pas ? »',f(){}},
    {d:3,title:1,ttl:['Fin','Le patron des Lilas'],f(){}}],{space:'world',keep:1}),2200);
}

/* ---------- combats : coups de poing contre les personnages de l'histoire ---------- */
function fighterHit(f){
  if(f.ko)return;
  if(!f.fight){FIGHTERS.filter(o=>o.group&&o.group===f.group&&!o.ko).forEach(o=>{o.fight=true;o.cd=1});f.fight=true;f.cd=1;toast(f.boss?'El Refe se jette sur toi !':`${f.name} se bat !`,'bad')}
  const dmg=Math.round(R(13,19));f.hp-=dmg;f.stag=.25;const fx=f.x-P.x,fz=f.z-P.z,l=Math.hypot(fx,fz)||1;f.x+=fx/l*1.1;f.z+=fz/l*1.1;
  CAM.shake=Math.max(CAM.shake,3);Sfx.crash(.3);floater(f.x,f.z-2.5,'-'+dmg,'#ffd24a',false);
  if(f.hp<=0){f.ko=true;f.fight=false;floater(f.x,f.z-2.5,'KO','#ff5a40',true);if(f.onDown)f.onDown(f)}
}
function updFighters(dt){
  let fighting=false;
  for(const f of FIGHTERS){
    f.punch=Math.max(0,f.punch-dt*2.6);f.stag=Math.max(0,f.stag-dt);f.ph+=f.sp*dt*1.6;
    if(f.ko)continue;
    const d=Math.hypot(P.x-f.x,P.z-f.z);
    if(!f.fight){
      const hx=f.hx-f.x,hz=f.hz-f.z,hd=Math.hypot(hx,hz);
      if(hd>.3){f.x+=hx/hd*Math.min(hd,3*dt);f.z+=hz/hd*Math.min(hd,3*dt);f.th=Math.atan2(hx,hz);f.sp=3}else{f.sp=0;if(d<16)f.th=Math.atan2(P.x-f.x,P.z-f.z)}
      if(f.hp<f.max)f.hp=Math.min(f.max,f.hp+dt*5);
      if(d<f.aggro&&!inLab()&&!INT&&P.def.kind==='foot'&&!paused()){FIGHTERS.filter(o=>o.group===f.group&&!o.ko).forEach(o=>{o.fight=true;o.cd=1.2});toast(`${f.name} t’a reconnu !`,'bad')}
      continue}
    if(paused()||INT)continue;
    fighting=true;
    if(d>f.leash||inLab()){f.fight=false;continue}
    f.th=Math.atan2(P.x-f.x,P.z-f.z);
    if(d>2.3&&!(f.stag>0)){const s=P.def.kind==='foot'?4.4:0;f.x+=Math.sin(f.th)*s*dt;f.z+=Math.cos(f.th)*s*dt;f.sp=s;collide(f,.45)}else f.sp=0;
    f.cd-=dt;
    if(d<2.9&&f.cd<=0&&P.def.kind==='foot'){
      f.cd=R(.9,1.4);f.punch=1;const dmg=R(f.dmg*.8,f.dmg*1.2);G.hp-=dmg;CAM.shake=Math.max(CAM.shake,4);Sfx.crash(.35);floater(P.x,P.z-2.5,'-'+Math.round(dmg)+' vie','#ff5a40',false);
      if(G.hp<=10)knockedOut(f);
    }
  }
  if(fighting)threat=true;
}
function knockedOut(f){
  G.hp=35;const loss=Math.floor(G.cash*.1);G.cash-=loss;
  for(const o of FIGHTERS)if(o.group===f.group){o.fight=false;if(!o.ko)o.hp=o.max}
  const [x,z]=[P.x+R(-3,3),P.z+R(-3,3)];if(pointFree(x,z,.5)){P.x=x;P.z=z}
  openDialog(f.name,'#ff7a5a',{text:`Tu te réveilles sur le trottoir, la tête qui tourne. On t’a pris ${fmt(loss)}. Reprends des forces avant d’y retourner.`,choices:[{label:'Se relever',close:1}]},()=>{});
}
/* ---------- attaques du Nord sur tes commerces (chapitre 5) ---------- */
let ATK=null,ATKT=0;
function updAttacks(dt){
  if(STO().q!=='defend'||paused())return;
  if(!ATK){ATKT-=dt;if(ATKT>0)return;
    const own=BIZS.filter(b=>G.biz[b.id]);const b=own.length?pick(own):{x:LAB.sh.door.x,z:LAB.sh.door.z,id:null,nx:0,nz:1,tx:1,tz:0,fx:LAB.sh.door.x,fz:LAB.sh.door.z};
    const [x,z]=spotAt(b,3.5,0);ATK={x,z,b,t:150};FIGHTERS=FIGHTERS.filter(f=>f.group!=='atk');
    for(const t of [-1.6,1.6])addFighter({id:'atk'+t,name:'Homme de Refe',look:{...LOOKS.nord,shirt:pick([0xc9a02a,0x8a6a1a,0x1d1d20])},x:x+b.tx*t,z:z+b.tz*t,hp:55,max:55,dmg:7,group:'atk',aggro:14,leash:80});
    phoneMsg('📱 Madame Vega',BOSSES.vega.col,`Les hommes de Refe sont devant ${b.id?'ta '+BIZT[G.biz[b.id].type].name.toLowerCase():'ton labo'} ! Vas-y, vite, avant qu’ils ne cassent tout.`);
    return}
  ATK.t-=dt;
  const left=FIGHTERS.filter(f=>f.group==='atk'&&!f.ko).length;
  if(!left){F().repelled=(F().repelled||0)+1;toast(`Attaque repoussée (${F().repelled}/3).`,'good');ATK=null;ATKT=R(70,120);FIGHTERS=FIGHTERS.filter(f=>f.group!=='atk');return}
  if(ATK.t<=0){
    const loss=Math.floor(G.cash*.1);G.cash-=loss;if(ATK.b.id&&G.biz[ATK.b.id])G.biz[ATK.b.id].closed=180;
    toast(`Trop tard : les hommes de Refe ont tout cassé${ATK.b.id?', le commerce est fermé 3 minutes':''} et pris ${fmt(loss)}.`,'bad');
    ATK=null;ATKT=R(60,100);FIGHTERS=FIGHTERS.filter(f=>f.group!=='atk');
  }
}
/* ---------- le flic infiltré : tuyaux par téléphone ---------- */
let TIPT=0,ZONE=null,REVEAL=0,RAID=null,raidT=600,opT=40;
function tipZone(forQuest){
  const p=randRoadPoint(P.x,P.z,120,260),q=quarterAt(p.x,p.z),zn=districtAt(p.x,p.z).name;
  ZONE={x:p.x,z:p.z,r:95,t:forQuest?150:120,q:!!forQuest};
  phoneMsg('📱 Le flic infiltré','#7fd1ff',`Contrôle de police dans ${zn} (${q.name}) pendant ${Math.round(ZONE.t/60*10)/10} min. Zone rouge sur ta carte : n’y vends rien, n’y passe pas avec ton sac plein.${forQuest?' Pendant ce temps, vends ailleurs : la police est occupée.':''}`);
}
function updTips(dt){
  const s=STO();
  if(ZONE){ZONE.t-=dt;const inZ=Math.hypot(P.x-ZONE.x,P.z-ZONE.z)<ZONE.r;
    if(inZ&&!INT&&!inLab()&&bagTot()>0&&!paused())G.heat=Math.min(100,G.heat+6*dt);
    if(ZONE.t<=0){if(ZONE.q&&s.q==='taupe_tip'&&!s.f.tipDone){toast('Le contrôle est terminé, mais tu n’as pas assez vendu. Il t’enverra un autre tuyau.','bad');setTimeout(()=>tipZone(true),30000)}ZONE=null}}
  REVEAL=Math.max(0,REVEAL-dt);
  if(opLilas()&&!ZONE&&!paused()){opT-=dt;if(opT<=0){opT=R(110,170);const p=randRoadPoint(P.x,P.z,110,240);ZONE={x:p.x,z:p.z,r:80,t:100,q:false};toast(`Opération Lilas : barrage de police dans ${districtAt(p.x,p.z).name}. Zone rouge sur la carte : évite-la avec ton sac plein.`,'bad')}}
  if(s.f.taupePaid&&!s.dead&&s.q!=='taupe_tip'){TIPT-=dt;if(TIPT<=0){TIPT=R(150,240);
    const r=Math.random();
    if(r<.35)tipZone(false);
    else if(r<.65&&!RAID){RAID={t:120,warned:1};phoneMsg('📱 Le flic infiltré','#7fd1ff','Descente prévue sur ton labo dans 2 minutes. Vide la réserve : remplis ton sac et va vendre ailleurs.')}
    else{REVEAL=90;phoneMsg('📱 Le flic infiltré','#7fd1ff','Je t’envoie les positions de toutes les patrouilles. Regarde ta carte : tu as une minute et demie.')}}}
  // descentes sur le labo (à partir du chapitre 3), annoncées seulement si tu as acheté le flic
  if(G.mode!=='multi'&&storyAt('blanch_find')&&!RAID){raidT-=dt;if(raidT<=0){raidT=R(500,800);if(Math.random()<.5)RAID={t:s.f.taupePaid?120:2,warned:s.f.taupePaid};if(RAID&&RAID.warned)phoneMsg('📱 Le flic infiltré','#7fd1ff','Descente prévue sur ton labo dans 2 minutes. Vide la réserve !')}}
  if(RAID){RAID.t-=dt;if(RAID.t<=0){
    const n=tot()+rawTot();
    if(n>0){let lost=0;for(const v of STRAINS){const a=Math.floor((G.stock[v.id]||0)*.6),b=Math.floor((G.raw[v.id]||0)*.6);G.stock[v.id]-=a;G.raw[v.id]=(G.raw[v.id]||0)-b;lost+=a+b}
      toast(`Descente de police au labo : ${lost} unités saisies dans la réserve.${RAID.warned?'':' Si seulement quelqu’un t’avait prévenu…'}`,'bad')}
    else toast('Descente de police au labo : la réserve était vide. Ils repartent bredouilles.','good');
    RAID=null;save()}}
}
/* ---------- téléphone ---------- */
const PHONE=[];
function phoneMsg(from,col,text){
  if(inv('telephone')>0){PHONE.push({from,col,text});if(PHONE.length>6)PHONE.shift();toast(`${from} : nouveau message.`);Sfx.alert();phoneBtn()}
  else toast(from.replace('📱 ','')+' : '+text);
}
function phoneBtn(){const b=$('bPhone');if(!b)return;vis(b,inv('telephone')>0);$('phN').textContent=PHONE.length||'';b.classList.toggle('ring',PHONE.length>0)}
function readPhone(){
  if(!PHONE.length){openDialog('📱 Téléphone','#7fd1ff',{text:'Aucun nouveau message.',choices:[{label:'Fermer',close:1}]},()=>{});return}
  const m=PHONE.shift();phoneBtn();
  if(m.boss){if(G.retired[m.boss]){readPhone();return}openDialog('📱 '+BOSSES[m.boss].name,BOSSES[m.boss].col,pickScenario(m.boss),null);curTalk.boss=1;return}
  openDialog(m.from,m.col,{text:m.text,choices:[{label:'OK',close:1}]},()=>{});
}
$('bPhone').onclick=()=>{if(started&&!ended&&!paused())readPhone()};
{const _sm=startMeeting;startMeeting=function(){
  if(!storyAt('vega')){meetT=60;return}
  if(inv('telephone')>0){
    const cand=BIDS.filter(id=>!G.retired[id]&&id!=='refe');if(!cand.length){meetT=9999;return}
    const id=pick(cand);if(!PHONE.some(m=>m.boss===id)){PHONE.push({boss:id,from:'📱 '+BOSSES[id].name});toast(`📱 Nouveau message de ${BOSSES[id].name}.`);Sfx.alert();phoneBtn()}
    meetT=R(110,180);return}
  _sm();
}}

/* ---------- la police : beaucoup de patrouilles, en voiture et à pied ---------- */
const COP_LOOK={skin:0xe3b895,shirt:0x1f2e4a,pants:0x1a2236,shoe:0x111111,hair:0x16110e,cap:0x1a2236};
let FCOPS=[];
/* semer la police : les flics ne savent où tu es que s'ils te voient (SEE m). Hors de leur vue pendant LOSE s, ils perdent ta trace. */
const CHASE={lost:0,on:0,tip:0,lostT:0};
const copSee=()=>TOD.n>.5?55:75,COP_LOSE=5;
const copLOS=(x0,z0,x1,z1)=>{const d=Math.hypot(x1-x0,z1-z0),n=Math.ceil(d/2.5);for(let i=1;i<n;i++){const t=i/n;if(maskAt(x0+(x1-x0)*t,z0+(z1-z0)*t)===4)return false}return true};
const copSpeed=()=>{const pv=P.def.vmax*(P.def.kind==='bike'||P.def.kind==='foot'?1:mot());return clamp(pv*.86+3,24,72)+(M?4:0)};
updCops=function(dt){
  const carrying=bagTot()>0||M,night=TOD.n,op=opLilas();
  const patrol=Math.max(2,Math.round((op?9:5)*(1-.3*night)))+(G.heat>=40?1:0);
  const chase=HIDE?0:(carrying||G.heat>=60)?Math.min(6,Math.floor(G.heat/18*(1.15-.5*night))):0;
  const want=patrol+chase;
  spawnT-=dt;
  if(cops.length<want&&spawnT<=0){const nc=cops.filter(c=>!c.calm).length<chase,p=randRoadPoint(P.x,P.z,nc?170:80,nc?280:230),a=mkAI({k:'sedan',c:0xf2f2f4,cop:1},p.x,p.z,R(0,6.28),2.3);a.catch=0;a.calm=true;a.path=[];cops.push(a);spawnT=chase>cops.filter(c=>!c.calm).length?2.5:3}
  const ord=cops.slice().sort((a,b)=>Math.hypot(a.x-P.x,a.z-P.z)-Math.hypot(b.x-P.x,b.z-P.z));
  ord.forEach((c,i)=>{const w=i<chase;if(c.calm&&w){c.path=[];c.t=0;const d=Math.hypot(c.x-P.x,c.z-P.z);}c.calm=!w});
  let chasing=0,seeNow=0;const SEE=copSee(),vt=copSpeed();
  for(const c of cops.slice()){
    const d=Math.hypot(P.x-c.x,P.z-c.z);
    if((cops.length>want&&d>160)||d>520){cops=cops.filter(q=>q!==c);continue}
    if(c.calm||HIDE){c.catch=0;
      if(!c.path.length){const p=randRoadPoint(P.x,P.z,30,200);c.path=lanePath([c.x,c.z],pathTo(c.x,c.z,p.x,p.z))}
      followPath(c,dt,HIDE?26:19);continue}
    chasing++;
    // savoir partagé par radio : tant qu'un flic te voit, tous savent où tu es ; sinon ils filent vers le dernier endroit connu
    if(d<12||d<SEE&&copLOS(c.x,c.z,P.x,P.z))seeNow=1;
    const lk=CHASE.lk||[P.x,P.z],blind=CHASE.lost>.3;
    c.t-=dt;if(c.t<=0){c.t=.8;c.path=pathTo(c.x,c.z,lk[0],lk[1])}
    if(d<45&&!blind)aiMove(c,P.x,P.z,dt,vt);else if(followPath(c,dt,blind?vt*.8:vt)&&blind){c.v*=.9}
    if(d<6.5&&!inLab())c.catch+=dt*(P.v<8?2:1);else c.catch=Math.max(0,c.catch-dt*2);
    if(c.catch>1.6){arrest();return}
  }
  // début de poursuite : le central donne ta position pendant 6 s ; ensuite il faut qu'un flic te voie
  if(!chasing){CHASE.lost=-6;CHASE.lk=[P.x,P.z]}
  else{if(!CHASE.on)CHASE.lost=-6;if(seeNow)CHASE.lost=Math.min(CHASE.lost,0);else CHASE.lost+=dt;if(CHASE.lost<=0)CHASE.lk=[P.x,P.z]}
  const lost=CHASE.lost;CHASE.on=chasing;CHASE.tip-=dt;
  if(chasing&&CHASE.tip<=0&&!(G.tipChase>2)){CHASE.tip=90;G.tipChase=(G.tipChase||0)+1;toast('Police aux trousses : sors de leur vue (virages, ruelles, ponts) pendant '+COP_LOSE+' s pour les semer, ou cache-toi dans une boutique.','bad')}
  if(chasing&&lost>=COP_LOSE){
    G.heat=Math.min(G.heat,12);for(const c of cops){c.calm=true;c.path=[];c.catch=0}chasing=0;CHASE.on=0;CHASE.lostT=3;
    toast('Tu les as semés ! Ils ont perdu ta trace.','good');Sfx.cash&&Sfx.cash()}
  CHASE.lostT=Math.max(0,CHASE.lostT-dt);
  // semer la police : une poursuite qui se termine sans arrestation
  const s=STO();if(chasing)s.f.wasChased=1;else if(s.f.wasChased&&G.heat<35){s.f.wasChased=0;s.f.escaped=1;if(s.q==='police')toast('Tu as semé la police !','good')}
  updFootCops(dt);
};
function updFootCops(dt){
  const want=opLilas()?(MOBILE?8:12):(MOBILE?4:6);let tries=0;
  while(FCOPS.length<want&&tries++<6){
    const n=RN[Math.floor(Math.random()*RN.length)],d=Math.hypot(n.x-P.x,n.z-P.z);if(d>260||d<50)continue;
    const rd=ROADS[n.r],side=Math.random()<.5?1:-1,sw=(rd.w/2+2.4)*side,q0=roadPos(n.r,rd.cum[n.k],sw);{const m=maskAt(q0[0],q0[1]);if(m===2||m===4)continue}
    const c={r:n.r,sw,s:rd.cum[n.k],dir:Math.random()<.5?1:-1,sp:1.5,ph:0,x:q0[0],z:q0[1],th:0,run:0,grab:0};
    FCOPS.push(c,Object.assign({},c,{off:1.1}));
  }
  for(let i=FCOPS.length-1;i>=0;i--){const c=FCOPS[i],d=Math.hypot(P.x-c.x,P.z-c.z);
    if(d>320){FCOPS.splice(i,1);continue}
    const hot=G.heat>=60&&d<45&&P.def.kind==='foot'&&!HIDE&&!inLab();
    if(hot){c.run=1;c.th=Math.atan2(P.x-c.x,P.z-c.z);const s=8.4;c.x+=Math.sin(c.th)*s*dt;c.z+=Math.cos(c.th)*s*dt;c.ph+=s*dt*1.6;c.v=s;collide(c,.45);
      if(d<1.8){c.grab+=dt;if(c.grab>1.2){FCOPS.length=0;arrest();return}}else c.grab=Math.max(0,c.grab-dt)}
    else{if(c.run){c.run=0;continue}c.v=c.sp;c.s+=c.dir*c.sp*dt;c.ph+=c.sp*dt*3.6;const rd=ROADS[c.r];if(!rd.closed&&(c.s<0||c.s>rd.len)){c.dir=-c.dir;c.s=clamp(c.s,0,rd.len)}
      const q=roadPos(c.r,c.s,c.sw+(c.off||0));c.x=q[0];c.z=q[1];c.th=Math.atan2(q[2]*c.dir,q[3]*c.dir)}}
}
/* chapitre 2 : opération de police sur les Lilas (beaucoup plus de flics, barrages) */
const opLilas=()=>storyAt('tel')&&!storyAt('blanch_find');
const witness=r=>cops.some(c=>c.calm&&Math.hypot(c.x-P.x,c.z-P.z)<r)||FCOPS.some(c=>Math.hypot(c.x-P.x,c.z-P.z)<r*.6);
let copSeenT=0;
const copVisible=c=>REVEAL>0||!c.calm||Math.hypot(c.x-P.x,c.z-P.z)<170;

/* ---------- raccords : ventes (30 % pour El Refe), labo, combats, cibles ---------- */
function refeTake(before,where){
  const s=STO(),gain=G.cash-before;
  if(!s.cut||s.dead||gain<=0)return;
  const c=Math.round(gain*REFE_CUT);G.cash-=c;G.earned-=c;s.paid=(s.paid||0)+c;
  if(where)floater(where.x,where.z-4,'-'+fmt(c)+' El Refe','#ff9a7a',false);
}
{const _sale=sale;sale=function(o,cut,who){
  const b=G.cash,n0=bagTot(),ok=_sale(o,cut,who);
  if(ok){refeTake(b,o);
    if(who==='toi'){const s=STO();s.f.sale1=1;s.f.sales=(s.f.sales||0)+1;if(o.vega)s.f.vliv=(s.f.vliv||0)+1;
      if(ZONE&&s.q==='taupe_tip'&&Math.hypot(o.x-ZONE.x,o.z-ZONE.z)>ZONE.r){s.f.tipSold=(s.f.tipSold||0)+(n0-bagTot());if(s.f.tipSold>=15)s.f.tipDone=1}
      if(storyAt('vega')&&witness(45)&&copSeenT<=0){copSeenT=20;G.heat=Math.max(G.heat,62);toast('Une patrouille t’a vu vendre ! Elle te prend en chasse.','bad')}}}
  return ok}}
{const _eco=economy;economy=function(dt){const b=G.cash;_eco(dt);refeTake(b,null);copSeenT-=dt}}
{const _um=updMission;updMission=function(dt){const b=G.cash,had=!!M;_um(dt);if(had&&!M&&G.cash>b){STO().f.gofast=1;refeTake(b,P)}}}
{const _w=lWater;lWater=function(it){const c=G.can;_w(it);if(G.can<c)STO().f.water=1}}
{const _h=lHarvest;lHarvest=function(it,q){const r=_h(it,q);if(r)STO().f.harvest=1;return r}}
{const _l=lLoad;lLoad=function(it,q){const r=_l(it,q);if(r)STO().f.dry=1;return r}}
{const _t=bagTake;bagTake=function(){const b=bagTot();_t();if(bagTot()>b)STO().f.take=1}}
{const _d=doPunch;doPunch=function(){if(INT||CINE)return;_d()}}
{const _hp=hitPed;hitPed=function(p,fx,fz){_hp(p,fx,fz);if(storyAt('vega')&&witness(50)){G.heat=Math.max(G.heat,70);toast('Des policiers t’ont vu frapper quelqu’un !','bad')}}}
{const _c=updCombat;updCombat=function(dt){
  const was=punchHit,on=punchT>0;_c(dt);
  if(on&&!was&&punchHit){const fx=Math.sin(P.th),fz=Math.cos(P.th);let best=null,bd=3.6;
    for(const f of FIGHTERS){if(f.ko)continue;const dx=f.x-P.x,dz=f.z-P.z,d=Math.hypot(dx,dz);if(d<bd&&(dx*fx+dz*fz)/(d||1)>.3){bd=d;best=f}}
    if(best){fighterHit(best);return}
    for(const n of SNPC){if(!n.show()||!n.noHit)continue;const dx=n.x-P.x,dz=n.z-P.z,d=Math.hypot(dx,dz);if(d<3.4&&(dx*fx+dz*fz)/(d||1)>.3){floater(n.x,n.z-2.5,n.id==='refe'?'« Encore une fois et t’es mort. »':'« Hé ! Calme-toi. »','#ffd24a',false);n.talkT=2;break}}}}}
{const _f=findTarget;findTarget=function(){
  if(INT){tgt=CINE||talking?null:intTarget();return}
  _f();
  if(!started||ended||paused()||P.def.kind!=='foot'||inLab())return;
  if(tgt&&tgt.k==='enterlab'&&!labOpen())tgt={k:'info',label:F().deal?'Fermé à clé : vends d’abord à ton client':'Fermé à clé. Va d’abord voir El Refe.'};
  const bz=bizTarget();if(bz&&(!tgt||tgt.k==='ped'||tgt.k==='info'))tgt=bz;
  let bd=4.2;
  for(const n of SNPC){if(!n.show()||!n.talk)continue;const d=Math.hypot(P.x-n.x,P.z-n.z);if(d<bd&&(!tgt||tgt.k==='ped'||tgt.k==='info'||tgt.k==='biz'||tgt.k==='npc')){bd=d;const nm=n.known&&!n.known()?n.unknown:n.name;tgt={k:'npc',n,label:'Parler : '+nm}}}
}}
{const _a=act;act=function(){findTarget();
  if(INT){intAct(tgt);return}
  if(tgt&&tgt.k==='npc'){tgt.n.talk();Sfx.click();return}
  if(tgt&&tgt.k==='biz'){bizAct(tgt.b);Sfx.click();return}
  _a()};$('bAct').onclick=act}
addEventListener('keydown',e=>{if(INT&&e.key==='Escape'&&!talking&&!CINE){exitShop();e.preventDefault()}});

/* ---------- cinématiques : intro devant la maison, bureau du concessionnaire, cartons de chapitre ---------- */
const eio=k=>k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
const seg=(k,a,b)=>clamp((k-a)/(b-a),0,1);
function faceTo(ax,az,bx,bz){return Math.atan2(bx-ax,bz-az)}
function cinePos(a,t){return spotAt(SPOT.home,a,t)}
function startCine(beats,o){
  o=o||{};const ac=o.actors||{};
  const c={beats,i:0,t:0,space:o.space||'world',kind:o.kind||'',onEnd:o.onEnd,keep:o.keep,door:0,cam:null,
    p:Object.assign({show:0,x:0,z:0,th:0,sp:0,ph:0,look:PLAYER_LOOK},ac.p||{}),npc:Object.assign({show:0,x:0,z:0,th:0,sp:0,ph:0,look:LOOKS.dad},ac.npc||{}),bag:{show:0,x:0,z:0,h:0,r:0}};
  if(o.space==='int'){c.p.show=c.npc.show=1;c.p.x=INT.p.x;c.p.z=INT.p.z}
  CINE=c;for(const k in keys)keys[k]=0;
  $('hud').hidden=true;$('cine').hidden=false;cineBeat();
  beats[0].f(c,0);applyCineCam(1);
}
function cineZoom(){return CINE&&CINE.space==='int'?intZoom():clamp(Math.min(VW,VH)/19,15,46)}
function applyCineCam(snap){const c=CINE;if(!c||!c.cam)return;const z=cineZoom()*c.cam[2],k=snap?1:.12,tz=c.cam[1]+70/z;CAM.x+=(c.cam[0]-CAM.x)*k;CAM.z+=(tz-CAM.z)*k;CAM.zoom+=(z-CAM.zoom)*k}
function cineBeat(){
  const c=CINE,b=c.beats[c.i];if(!b)return;
  const sub=$('cineSub'),tt=$('cineTitle');
  vis(tt,!!b.title);vis(sub,!b.title);
  if(b.title){const t=b.ttl||['Chapitre 1','À la rue'];tt.querySelector('small').textContent=t[0];tt.querySelector('b').textContent=t[1];tt.style.animation='none';void tt.offsetWidth;tt.style.animation=''}
  $('cineWho').textContent=b.who||'';vis($('cineWho'),!!b.who);
  $('cineTxt').textContent=b.txt||b.nar||'';$('cineTxt').classList.toggle('nar',!!b.nar);
  sub.classList.remove('in');void sub.offsetWidth;sub.classList.add('in');
  $('cineSkip').textContent=c.beats.length>1?'Passer ⏭':'Continuer';
}
function cineNext(){const c=CINE;if(!c)return;c.beats[c.i].f(c,1);c.i++;c.t=0;if(c.i>=c.beats.length){endCine();return}cineBeat()}
function updCine(real){
  const c=CINE;if(!c)return;
  const dt=Math.min(.05,real);c.t+=dt;const b=c.beats[c.i];
  b.f(c,Math.min(1,c.t/b.d));
  c.p.ph+=c.p.sp*dt*1.6;c.npc.ph+=c.npc.sp*dt*1.6;
  if(c.t>=b.d)cineNext();
  if(CINE){applyCineCam(false);CAM.shake=Math.max(0,CAM.shake-dt*14)}
  if(c.space==='world'){updTraffic(dt,CAM.x,CAM.z,traffic);updPeds(dt,CAM.x,CAM.z)}
}
function endCine(){
  const c=CINE;if(!c)return;
  c.shoved=c.landed=c.slam=1;
  for(let i=c.i;i<c.beats.length;i++)c.beats[i].f(c,1);
  CINE=null;$('cine').hidden=true;$('hud').hidden=false;
  if(c.onEnd)c.onEnd(c);
}
function drawCineActors(sc){
  const c=CINE;if(!c)return;
  if(c.npc.show)drawHuman(c.npc.x,c.npc.z,c.npc.th,c.npc.look,c.npc.ph,c.npc.sp,sc,c.npc.mode,c.npc.punch||0);
  if(c.p.show)drawHuman(c.p.x,c.p.z,c.p.th,c.p.look||PLAYER_LOOK,c.p.ph,c.p.sp,sc,c.p.mode,0);
}
/* intro : le père met son fils dehors */
const CBEATS=[
  {d:2.6,nar:'Les Lilas. Un jour de trop.',f(c,k){c.door=0;c.npc.show=0;c.p.show=0;c.bag.show=0;c.cam=[...cinePos(4.5-1.5*k,0),.85+.15*k]}},
  {d:3.6,who:'Le père',txt:'« Trois mois que tu traînes. Pas d’école, pas de boulot, rien ! »',f(c,k){
    c.door=1;c.npc.show=1;c.p.show=1;c.bag.show=0;
    const w=eio(seg(k,0,.45));const [px,pz]=cinePos(-.4+3.4*w,.5),[dx,dz]=cinePos(-.6+1.3*w,-.5);
    c.p.x=px;c.p.z=pz;c.p.sp=k<.45?2:0;c.p.mode=undefined;c.npc.x=dx;c.npc.z=dz;c.npc.sp=k<.45?1.5:0;c.npc.mode=k>.45?'chat':undefined;
    c.p.th=faceTo(px,pz,dx,dz);c.npc.th=faceTo(dx,dz,px,pz);c.npc.punch=0;c.cam=[...cinePos(2.4,0),1]}},
  {d:2.8,who:'Toi',txt:'« Papa, attends… Je vais trouver un truc, promis. »',f(c,k){
    const [px,pz]=cinePos(3,.5),[dx,dz]=cinePos(.7,-.5);c.p.x=px;c.p.z=pz;c.p.sp=0;c.p.mode='chat';c.npc.x=dx;c.npc.z=dz;c.npc.mode=undefined;c.npc.punch=0;
    c.p.th=faceTo(px,pz,dx,dz);c.npc.th=faceTo(dx,dz,px,pz);c.cam=[...cinePos(2.2,0),1.08]}},
  {d:2.9,who:'Le père',txt:'« T’as dix-neuf ans. Ici, c’est terminé. Dehors ! »',f(c,k){
    const sh=seg(k,.42,.7),w=1-Math.pow(1-sh,3);
    const [dx,dz]=cinePos(.7+1.2*seg(k,.3,.5),-.45),[px,pz]=cinePos(3+2.6*w,.5+.4*w);
    c.npc.x=dx;c.npc.z=dz;c.npc.punch=k>.35&&k<.62?seg(k,.35,.62):0;c.npc.mode=undefined;
    c.p.x=px;c.p.z=pz;c.p.mode=k>.68?'ko':undefined;c.p.sp=0;c.p.th=faceTo(px,pz,dx,dz);c.npc.th=faceTo(dx,dz,px,pz);
    if(k>.45&&!c.shoved){c.shoved=1;CAM.shake=5;Sfx.crash(.4)}
    c.cam=[...cinePos(3.2,.3),1]}},
  {d:2.4,who:'Le père',txt:'« Et prends tes affaires ! »',f(c,k){
    const t=seg(k,.2,.62),[ax,az]=cinePos(1.3,-.4),[bx,bz]=cinePos(5.8,2.6);
    c.bag.show=k>.18?1:0;c.bag.x=ax+(bx-ax)*t;c.bag.z=az+(bz-az)*t;c.bag.h=Math.sin(t*Math.PI)*2.2;c.bag.r=t*7;
    c.npc.punch=k>.1&&k<.4?seg(k,.1,.4):0;c.p.mode='ko';
    if(t>=1&&!c.landed){c.landed=1;Sfx.crash(.15)}}},
  {d:1.8,nar:'La porte claque.',f(c,k){
    c.npc.show=k<.15?1:0;c.door=k<.2?1:0;c.p.mode='ko';
    if(k>.2&&!c.slam){c.slam=1;CAM.shake=4;Sfx.crash(.6)}}},
  {d:3.2,who:'Toi',txt:'« … 150 € en poche. Plus de toit. »',f(c,k){
    c.door=0;c.npc.show=0;c.p.mode=k<.3?'ko':undefined;c.p.sp=0;
    const [px,pz]=cinePos(5.4,.9);c.p.x=px;c.p.z=pz;const [fx,fz]=cinePos(0,0);c.p.th=faceTo(px,pz,fx,fz);c.cam=[...cinePos(4.4,.8),1.1]}},
  {d:3.4,who:'Toi',txt:'« El Refe. Lui, il saura quoi faire. »',f(c,k){
    const w=eio(seg(k,0,.35)),[ax,az]=cinePos(5.4,.9),[bx,bz]=cinePos(5.8,2.3),r=npcById('refe');
    c.p.x=ax+(bx-ax)*w;c.p.z=az+(bz-az)*w;c.p.sp=k<.35?2:0;c.p.mode=undefined;c.bag.show=k<.33?1:0;
    c.p.th=k<.35?faceTo(ax,az,bx,bz):faceTo(c.p.x,c.p.z,r.x,r.z);
    c.cam=[c.p.x,c.p.z,1.1-.45*eio(seg(k,.3,1))]}},
  {d:2.8,title:1,ttl:['Chapitre 1','À la rue'],f(c,k){c.cam=[c.p.x,c.p.z,.6]}},
];
function startIntro(){
  if(!SPOT)return;
  setVehicle('foot');HIDE=null;closeMenu();
  startCine(CBEATS,{space:'world',kind:'intro',actors:{npc:{look:LOOKS.dad}},onEnd:()=>{
    const [x,z]=cinePos(5.8,2.3),r=npcById('refe');P.x=x;P.z=z;P.th=faceTo(x,z,r.x,r.z);P.vx=P.vz=P.v=0;CAM.x=x;CAM.z=z;
    const s=STO();if(s.q==='intro'){s.q='refe';questStart('refe')}
    save();renderQuest(true);setTimeout(()=>toast('Suis la flèche jaune jusqu’à El Refe.'),500)}});
}
$('cineSkip').onclick=e=>{e.stopPropagation();endCine()};
$('cine').addEventListener('click',e=>{if(e.target.closest('#cineSkip'))return;cineNext()});
addEventListener('keydown',e=>{if(!CINE)return;if(e.key==='Escape'){endCine();e.preventDefault()}else if(e.key===' '||e.key==='Enter'){cineNext();e.preventDefault()}},true);

/* ---------- dessin ---------- */
function drawDoor(open){
  const s=SPOT.home,[ax,az]=spotAt(s,0,-1.4),[bx,bz]=spotAt(s,0,1.4);
  if(open){const [i1x,i1z]=spotAt(s,-.45,-1.4),[i2x,i2z]=spotAt(s,-.45,1.4);ctx.fillStyle='#ffd08a';poly(ax,az,bx,bz,i2x,i2z,i1x,i1z);
    const [hx,hz]=spotAt(s,0,1.4),[ex,ez]=spotAt(s,-.2,1.25);ctx.strokeStyle='#5a3a22';ctx.lineWidth=.32;ctx.beginPath();ctx.moveTo(hx,hz);ctx.lineTo(ex-s.nx*2.4,ez-s.nz*2.4);ctx.stroke()}
  else{ctx.strokeStyle='#5a3a22';ctx.lineWidth=.42;ctx.beginPath();ctx.moveTo(ax,az);ctx.lineTo(bx,bz);ctx.stroke()}
  ctx.strokeStyle='#2a201a';ctx.lineWidth=.22;const [c1x,c1z]=spotAt(s,.05,-1.6),[c2x,c2z]=spotAt(s,.05,1.6);ctx.beginPath();ctx.moveTo(c1x,c1z);ctx.lineTo(c2x,c2z);ctx.stroke();
}
function drawLightSpill(){
  const s=SPOT.home,[ox,oz]=spotAt(s,0,0),g=ctx.createRadialGradient(ox,oz,.5,ox,oz,7);
  g.addColorStop(0,'rgba(255,205,130,.55)');g.addColorStop(1,'rgba(255,205,130,0)');
  const [a1x,a1z]=spotAt(s,0,-1.4),[a2x,a2z]=spotAt(s,0,1.4),[b1x,b1z]=spotAt(s,7,-4.2),[b2x,b2z]=spotAt(s,7,4.2);
  ctx.fillStyle=g;poly(a1x,a1z,a2x,a2z,b2x,b2z,b1x,b1z);
}
function nameTag(x,z,txt,col){ctx.font='700 1.2px "Work Sans",sans-serif';ctx.textAlign='center';ctx.lineWidth=.35;ctx.strokeStyle='rgba(15,10,8,.85)';ctx.fillStyle=col;ctx.strokeText(txt,x,z);ctx.fillText(txt,x,z)}
function drawStory(now){
  if(!SPOT)return;
  const c=CINE,t=now/1000;
  drawBizFronts(now);
  if(c&&c.space==='world'&&c.kind==='intro'){
    if(c.door)drawLightSpill();
    if(c.bag.show){const b=c.bag;ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(b.x,b.z,.7,.45,0,0,6.3);ctx.fill();
      ctx.save();ctx.translate(b.x,b.z-b.h);ctx.rotate(b.r);ctx.fillStyle='#3c4a2c';rr(ctx,-.6,-.45,1.2,.9,.22);ctx.fill();ctx.fillStyle='#2c3820';ctx.fillRect(-.6,-.08,1.2,.16);ctx.restore()}
    drawCineActors(HS);
  }
  // zones : contrôle de police, zone de recherche
  if(ZONE&&inView(ZONE.x,ZONE.z,ZONE.r+10)){ctx.strokeStyle='rgba(224,80,58,.55)';ctx.lineWidth=1.2;ctx.setLineDash([4,3]);ctx.beginPath();ctx.arc(ZONE.x,ZONE.z,ZONE.r,0,6.3);ctx.stroke();ctx.setLineDash([])}
  // personnages de l'histoire
  for(const n of SNPC){if(!n.show()||!inView(n.x,n.z,8))continue;
    if(n.chair){ctx.fillStyle='#d9d4c8';rr(ctx,n.x-.55,n.z-.55,1.1,1.1,.2);ctx.fill()}
    if(n.id==='blanch'){const tb=SPOT.blanch.table;if(tb){el(ctx,tb.x+.2,tb.z-.1,.32,.25,'#f1e8d6')}}
    const q=STO().q,hl=(n.id==='refe'&&(q==='refe'||q==='refe2'||q==='refe3'))||(n.id==='vega'&&['vega','guerre'].includes(q))||(n.id==='blanch'&&q==='blanch2')||(n.id==='taupe'&&['taupe_pay','taupe2'].includes(q));
    if(hl&&!c)drawBeacon(n.x,n.z,5,n.col||'#ffd24a',t);
    drawHuman(n.x,n.z,n.th,n.look,n.ph,n.sp,HS,n.talkT>0?'chat':n.mode,n.punch>0?1-n.punch:0);
    n.talkT=Math.max(0,n.talkT-.016);
    if(n.name){const known=!n.known||n.known(),d=Math.hypot(P.x-n.x,P.z-n.z);
      if(known||d<7)nameTag(n.x,n.z-2.7,known?n.name:'?',n.col||'#ffd24a')}
  }
  for(const f of FIGHTERS){if(!inView(f.x,f.z,8))continue;
    drawHuman(f.x,f.z,f.th,f.look,f.ph,f.sp,HS,f.ko?'ko':undefined,f.punch>0?1-f.punch:0);
    if(!f.ko){nameTag(f.x,f.z-2.7,f.name,f.col||'#ff9a7a');if(f.fight||f.hp<f.max){const w=3;ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(f.x-w/2,f.z-2.4,w,.32);ctx.fillStyle='#e0503a';ctx.fillRect(f.x-w/2,f.z-2.4,w*clamp(f.hp/f.max,0,1),.32)}}}
  for(const fc of FCOPS){if(inView(fc.x,fc.z,5))drawHuman(fc.x,fc.z,fc.th,COP_LOOK,fc.ph,fc.v||1.5,HS,undefined,0)}
}
function drawStoryTop(){if(SPOT&&inView(SPOT.home.fx,SPOT.home.fz,12))drawDoor(!!(CINE&&CINE.kind==='intro'&&CINE.door))}
/* minicarte : zones, personnages connus, cachettes */
{const _dm=drawMini;drawMini=function(){
  _dm();if(!started||!SPOT)return;
  const S=mm.width,f=S/300,k=S/1250,X=v=>(v+625)*k,s=STO();
  if(ZONE){mx.fillStyle='rgba(224,80,58,.28)';mx.strokeStyle='#e0503a';mx.lineWidth=1.5*f;mx.beginPath();mx.arc(X(ZONE.x),X(ZONE.z),ZONE.r*k,0,7);mx.fill();mx.stroke()}
  const q=Q[s.q];
  if(q&&q.clue&&(s.clue[q.clue]||0)>=3){const tgt=q.clue==='blanch'?SPOT.blanch:SPOT.taupe,ox=((hash2(tgt.x,tgt.z)%60)-30),oz=((hash2(tgt.z,tgt.x)%60)-30);
    mx.strokeStyle='#ffd24a';mx.lineWidth=2*f;mx.setLineDash([5*f,4*f]);mx.beginPath();mx.arc(X(tgt.x+ox),X(tgt.z+oz),70*k,0,7);mx.stroke();mx.setLineDash([]);mx.lineWidth=1}
  for(const n of SNPC){if(!n.show()||!n.name||(n.known&&!n.known()))continue;mx.fillStyle=n.col||'#ffd24a';mx.strokeStyle='#120e0d';mx.lineWidth=f;mx.beginPath();mx.arc(X(n.x),X(n.z),4*f,0,7);mx.fill();mx.stroke()}
  for(const ft of FIGHTERS){if(ft.ko||ft.name==='Garde'||ft.name==='Garde du corps')continue;mx.fillStyle='#ff5a40';mx.beginPath();mx.arc(X(ft.x),X(ft.z),3.5*f,0,7);mx.fill()}
  for(const b of BIZS){if(!G.biz[b.id])continue;mx.fillStyle=BIZT[b.type].col;mx.fillRect(X(b.x)-3*f,X(b.z)-3*f,6*f,6*f)}
}}

/* ---------- démarrage et boucle ---------- */
function storyBegin(){
  STO();PHONE.length=0;FIGHTERS=[];ATK=null;ZONE=null;RAID=null;FCOPS=[];
  const s=STO();
  if(s.q==='lieut')spawnLieutenants();
  if(s.q==='cache'||s.q==='refe_final')spawnHideout();
  if(s.f.taupePaid)TIPT=90;
  if(war())startWar();
  if(s.q==='vega_liv')spawnVegaOrders();
  if(s.q==='taupe_tip'&&!ZONE)setTimeout(()=>tipZone(true),15000);
  if(s.q==='intro'){setTimeout(startIntro,60);return}
  if(!labOpen()&&SPOT){const [x,z]=cinePos(5.8,2.3),r=npcById('refe');P.x=x;P.z=z;CAM.x=x;CAM.z=z;P.th=faceTo(x,z,r.x,r.z)}
  renderQuest(true);
}
function updStory(dt){
  if(!started||ended)return;
  STO();
  if(!SPOT)storySetup();
  launderTick(dt);
  const pz=paused();
  if(!pz&&!INT){updFighters(dt);updAttacks(dt);
    if(STO().q==='cache'&&Math.hypot(P.x-SPOT.cache.x,P.z-SPOT.cache.z)<30)F().cacheFound=1}
  for(const n of SNPC)n.ph+=n.sp*dt;
  updTips(dt);
  if(!CINE){questCheck(dt);if(STO().q==='choix'&&!F().asked&&!pz)askChoice()}
  qFlash=Math.max(0,qFlash-dt);const qe=$('quest');if(qe)qe.classList.toggle('flash',qFlash>0);
  // bandeau : contrôle de police, descente annoncée, attaque
  SBAN=null;
  if(ZONE&&Math.hypot(P.x-ZONE.x,P.z-ZONE.z)<ZONE.r)SBAN={txt:`Zone de contrôle de police · ${Math.ceil(ZONE.t)} s${bagTot()?' · ton sac attire l’attention !':''}`,bg:'rgba(180,40,30,.92)'};
  else if(RAID&&RAID.warned)SBAN={txt:`Descente annoncée sur ton labo dans ${Math.ceil(RAID.t)} s`,bg:'rgba(180,90,30,.92)'};
  else if(CHASE.on&&!HIDE)SBAN=CHASE.lost>.4?{txt:`Ils t’ont perdu de vue · encore ${Math.max(1,Math.ceil(COP_LOSE-CHASE.lost))} s et tu les sèmes`,bg:'rgba(40,110,60,.92)'}:{txt:'Police aux trousses · sors de leur vue pour les semer',bg:'rgba(30,60,170,.92)'};
  else if(ATK)SBAN={txt:`Attaque d’El Refe en cours · ${Math.ceil(ATK.t)} s`,bg:'rgba(150,110,20,.92)'};
  renderQuest(false);phoneBtn();
}
$('quest').onclick=questClick;

/* ---------- lobby (mode histoire / mode multijoueur) et équipes ---------- */
/* Mode multijoueur : pas d'histoire. Tous les joueurs du mode multijoueur sont dans la même ville (salon « p-multi »).
   Ils forment des équipes de 4 au plus (code à 5 caractères, salon d'équipe « t-code ») ; il peut y avoir autant d'équipes qu'on veut.
   Chaque équipe a sa serre : machines, plantes, graines, récolte, réserve, améliorations du labo et équipe de dealers sont communs.
   Chacun garde son argent, son sac, ses véhicules. Un joueur fait autorité (« chef de serre ») : il fait pousser les plantes et diffuse
   l'état ; les autres lui envoient leurs actions. Si le chef part, le suivant reprend. Sauvegarde sur le serveur (crews/CODE) toutes les 30 s.
   Les labos de toutes les équipes sont au même endroit, mais chacun ne voit que sa propre serre et ses coéquipiers à l'intérieur. */
var CREW={code:'',host:'',lastSnap:0,joinedAt:0,synced:false,seq:0,lastOpT:0,ack:{},t:null,mem:new Map(),snapT:0,saveT:20,payT:6,inc:0,loading:false,electT:0,hostName:''};
const MKEY='serre-mp-v1',TEAM_MAX=4;
const SH_LV=['labo','lamp','engrais','hydro','vent','entrepot','livreur','jardinier','dealer','guetteur'];
const isMulti=()=>!!G&&G.mode==='multi';
const crewOn=()=>isMulti()&&!!CREW.code&&!!CREW.t&&!!MP.me;
const crewHost=()=>crewOn()&&CREW.host===MP.me;
const crewClient=()=>crewOn()&&!crewHost();
let REMOTE=0,DELTA=null;
function readSave(k){try{const g=JSON.parse(localStorage.getItem(k));return g&&(g.v===4||g.v===5)&&typeof g.cash==='number'?g:null}catch(e){return null}}

/* ---------- lobby ---------- */
const STORY_SAVED=!!(G&&G.began&&G.mode!=='multi');
function lobbyInit(){
  $('storyCont').hidden=!STORY_SAVED;
  $('storyInfo').textContent=STORY_SAVED?`Histoire en cours : ${fmt(G.cash+(G.clean||0)+(G.bank||0))}, ${(G.story&&CHAP_OF[G.story.q])?(CHAP_OF[G.story.q]<6?'chapitre '+CHAP_OF[G.story.q]:'épilogue'):'chapitre 1'}.`:'';
  const m=readSave(MKEY);
  const cc=$('crewCont');cc.hidden=!(m&&m.crew);if(m&&m.crew)cc.textContent='Reprendre mon équipe '+m.crew;
  $('crewNick').value=MP.nick;
  lobbyTeams();setInterval(()=>{if(!started)lobbyTeams()},1000);
}
/* les équipes en jeu, vues depuis la ville du mode multijoueur */
function lobbyTeams(){
  const el=$('teamList');if(!el)return;
  const T=MP.code==='MULTI'&&MP.teams?MP.teams:{},codes=Object.keys(T).sort((a,b)=>T[b].length-T[a].length);
  const h=codes.map(c=>c+T[c].join()).join('|')+MP.code;if(el.dataset.h===h)return;el.dataset.h=h;
  if(MP.code!=='MULTI'){el.innerHTML='<p class="note">Connexion à la ville du mode multijoueur…</p>';return}
  el.innerHTML=codes.length?codes.map(c=>{const n=T[c].length,full=n>=TEAM_MAX;
    return `<div class="item"><b>Équipe ${esc(c)} <span class="tag ${full?'fast':'ok'}">${n}/${TEAM_MAX}</span></b><span>${T[c].map(esc).join(', ')}</span><button class="btn ghost" data-team="${esc(c)}"${full?' disabled':''}>${full?'Complète':'Rejoindre'}</button></div>`}).join('')
    :'<p class="note">Aucune équipe en jeu pour l’instant. Crée la tienne !</p>';
}
$('teamList').addEventListener('click',e=>{const b=e.target.closest('[data-team]');if(b&&!b.disabled)startCrew(b.dataset.team,false)});
function startStory(fresh){
  if(fresh){G=newG('cite');G.began=1}
  G.mode='story';save();
  let sv=null;try{sv=localStorage.getItem('serre-party')}catch(e){}
  const pc=partyCode(sv);if(MP.room&&MP.code==='MULTI')mpJoin(pc&&pc!=='MULTI'?pc:'PUBLIC',true);
  beginGame(fresh);
}
$('goBtn').onclick=()=>{if(STORY_SAVED){$('storyWarn').hidden=false;return}startStory(true)};
$('storyNewYes').onclick=()=>startStory(true);
$('storyCont').onclick=()=>startStory(false);
function crewMsg(t){$('crewMsg').textContent=t}
let crewBusy=false;
async function startCrew(code,create){
  if(crewBusy)return;
  const nk=cleanTxt($('crewNick').value,18);if(nk){MP.nick=nk;MP.last='';try{localStorage.setItem('serre-nick',nk)}catch(e){}}
  if(!MP.room){crewMsg(MP.state==='loading'?'Connexion au serveur en cours… réessaie dans quelques secondes.':'Multijoueur indisponible : ouvre le jeu par l’adresse du serveur.');return}
  if(create)code=newPartyCode();
  code=partyCode(code);if(!code||code==='PUBLIC'||code==='MULTI'){crewMsg('Le code fait 5 caractères, par exemple K7QPM.');return}
  crewBusy=true;crewMsg('Connexion à l’équipe '+code+'…');
  try{
    const r=await teamJoin(code);
    if(r!=='ok'){crewMsg(r);return}
  }finally{crewBusy=false}
  const m=readSave(MKEY);
  if(m){G=m;migrate(G)}else G=newG('cite');
  G.mode='multi';G.began=1;if(G.crew!==code){G.lab=newG('cite').lab;G.seeds={jardin:5};G.raw={};G.stock={};for(const k of SH_LV)delete G.lv[k];G.deliv=[]}
  G.crew=code;save();
  Object.assign(CREW,{code,host:'',lastSnap:0,joinedAt:performance.now(),synced:false,seq:0,ack:{},created:!!create});
  beginGame(false);
  toast(create?`Équipe ${code} créée (4 joueurs au plus). D’autres équipes jouent dans la même ville.`:`Tu as rejoint l’équipe ${code}. Synchronisation de la serre…`,'good');
  worldJoin();
}
$('crewNew').onclick=()=>startCrew(null,true);
$('crewJoin').onclick=()=>startCrew($('crewIn').value,false);
$('crewCont').onclick=()=>{const m=readSave(MKEY);if(m&&m.crew)startCrew(m.crew,false)};
$('crewIn').addEventListener('keydown',e=>{if(e.key==='Enter')$('crewJoin').click()});
/* salon d'équipe : présence (pseudo), messages de la serre ; on refuse d'entrer si l'équipe a déjà 4 joueurs */
async function teamJoin(code){
  if(CREW.t){try{await CREW.t.leave()}catch(e){}CREW.t=null}
  let t;try{t=await MP.room.join('t-'+code.toLowerCase())}catch(e){return 'Connexion à l’équipe impossible : '+mpErr(e)}
  const mem=new Map();let got=false;
  const sync=peers=>{mem.clear();for(const p of peers){if(p.sameTab){MP.me=String(p.peer);continue}const pr=p.presence||{};if(pr.cm===code)mem.set(String(p.peer),cleanTxt(pr.n,18)||'Joueur')}got=true};
  const off=t.onPeers(ch=>sync(ch.peers),()=>{});
  for(let i=0;i<20&&!got;i++)await new Promise(ok=>setTimeout(ok,100));
  await new Promise(ok=>setTimeout(ok,500));
  if(mem.size>=TEAM_MAX){off();try{await t.leave()}catch(e){}return `L’équipe ${code} est complète (${TEAM_MAX}/${TEAM_MAX}). Crée la tienne ou rejoins une autre équipe.`}
  CREW.t=t;CREW.mem=mem;
  t.presence({n:MP.nick,cm:code}).catch(()=>{});
  t.onPeers(ch=>{if(CREW.t!==t)return;sync(ch.peers);CREW.mem=mem},()=>{});
  t.on('crew',m=>{if(CREW.t===t)onCrewMsg(m)},()=>{});
  return 'ok';
}
/* tout le mode multijoueur partage la même ville */
async function worldJoin(){
  for(let i=0;i<8;i++){
    while(MP.busy)await new Promise(ok=>setTimeout(ok,200));
    if(MP.g&&MP.code==='MULTI')return;
    await mpJoin('MULTI',true);
    if(MP.g&&MP.code==='MULTI')return;
    await new Promise(ok=>setTimeout(ok,3000));
  }
}

/* ---------- état partagé ---------- */
const r2=v=>Math.round(v*100)/100;
const keyOf=it=>it?`${it.id}|${(+it.d).toFixed(2)}|${(+it.s).toFixed(2)}`:null;
function findItem(k){if(!k)return null;const [id,d,s]=k.split('|');return G.lab.items.find(it=>it.id===id&&Math.abs(it.d-d)<.03&&Math.abs(it.s-s)<.03)||null}
const nz=o=>{const r={};for(const k in o)if(o[k]>0)r[k]=o[k];return r};
function sharedOut(){
  return {it:G.lab.items.map(it=>[it.id,r2(it.d),r2(it.s),it.pl?[it.pl.s,Math.round(it.pl.p*1000)/1000,Math.round(it.pl.w),Math.round(it.pl.hp),it.pl.pr|0]:0,it.b?[it.b.s,it.b.n,Math.round(it.b.t*10)/10]:0]),
    st:nz(G.lab.store),se:nz(G.seeds),ra:nz(G.raw),sk:nz(G.stock),lv:Object.fromEntries(SH_LV.filter(k=>lv(k)).map(k=>[k,lv(k)])),un:STRAINS.filter(s=>G.unlocked[s.id]).map(s=>s.id)};
}
const cnt=(o,ok)=>{const r={};if(o&&typeof o==='object')for(const k in o)if(ok(k)){const v=Math.floor(pnum(o[k],0,1e6,0));if(v>0)r[k]=v}return r};
const lvMax=k=>{const u=UPS.find(x=>x.id===k)||TEAM.find(x=>x.id===k);return u?u.max:0};
function applyShared(S){
  if(!S||!Array.isArray(S.it))return;
  const pool=G.lab.items.slice(),out=[],skip=PLACE&&PLACE.k0;
  for(const e of S.it.slice(0,60)){
    if(!Array.isArray(e))continue;const [id,d,s,pl,b]=e;if(!MM[id]||!isFinite(d)||!isFinite(s))continue;
    const k=`${id}|${(+d).toFixed(2)}|${(+s).toFixed(2)}`;if(skip&&k===skip)continue;
    let it=pool.find(o=>o.id===id&&Math.abs(o.d-d)<.03&&Math.abs(o.s-s)<.03);
    if(it)pool.splice(pool.indexOf(it),1);else it={id,d:+d,s:+s,pl:null};
    it.d=clamp(+d,2,LAB_D);it.s=clamp(+s,-LAB_W/2,LAB_W/2);
    it.pl=Array.isArray(pl)&&SM[pl[0]]?{s:pl[0],p:pnum(pl[1],0,1,0),w:pnum(pl[2],0,100,100),hp:pnum(pl[3],0,100,100),pr:clamp(pl[4]|0,0,2)}:null;
    it.b=Array.isArray(b)&&SM[b[0]]?{s:b[0],n:clamp(b[1]|0,0,999),t:pnum(b[2],0,1e4,0)}:null;
    out.push(it);
  }
  G.lab.items=out;
  G.lab.store=cnt(S.st,k=>!!MM[k]);G.seeds=cnt(S.se,k=>!!SM[k]);G.raw=cnt(S.ra,k=>!!SM[k]);G.stock=cnt(S.sk,k=>!!SM[k]);
  for(const k of SH_LV)G.lv[k]=clamp(Math.floor(pnum(S.lv&&S.lv[k],0,99,0)),0,lvMax(k));
  if(Array.isArray(S.un))for(const id of S.un)if(SM[id])G.unlocked[id]=1;
  labSync();labZoneSync();syncCouriers();
}
function sendCrew(d){if(CREW.t)CREW.t.emit('crew',d).catch(()=>{})}
function sendOp(o){CREW.seq++;CREW.lastOpT=performance.now();sendCrew({k:'op',n:CREW.seq,o})}
function broadcastSnap(){CREW.snapT=.8;sendCrew({k:'snap',h:MP.me,a:CREW.ack,s:sharedOut()})}

/* ---------- messages ---------- */
function onCrewMsg(m){
  const d=m.data||{};if(!isMulti()||m.sameTab)return;
  const from=String(m.peer||'');
  if(d.k==='snap'){
    if(crewHost()){if(from<MP.me){CREW.host=from;toast('Un autre joueur reprend la gestion de la serre.')}else return}
    if(CREW.host&&CREW.host!==from&&performance.now()-CREW.lastSnap<4000&&from>CREW.host)return;
    CREW.host=from;CREW.lastSnap=performance.now();
    const myAck=d.a&&typeof d.a==='object'?(+d.a[MP.me]||0):0;
    if(myAck<CREW.seq&&performance.now()-CREW.lastOpT<2500)return;
    applyShared(d.s);if(!CREW.synced){CREW.synced=true;toast('Labo synchronisé avec la serre '+CREW.code+'.','good')}
    return}
  if(d.k==='op'&&crewHost()){applyOp(from,d.o||{});CREW.ack[from]=Math.max(CREW.ack[from]||0,+d.n||0);CREW.snapT=Math.min(CREW.snapT,.05);return}
  if(d.k==='give'&&d.to===MP.me){
    let got=0,back={};for(const s of STRAINS){const n=Math.floor(pnum(d.p&&d.p[s.id],0,1e5,0));if(!n)continue;const k=bagAddProd(s.id,n);got+=k;if(n>k)back[s.id]=n-k}
    if(Object.keys(back).length)sendOp({t:'drop',p:back});
    if(got){floater(P.x,P.z,'+'+got+' dans le sac','#ffa63d',true);toast(`Tu prends ${got} unités dans la réserve commune (${bagUsed()}/${bagPlaces()} places).`,'good');STO().f.take=1}
    else toast('La réserve commune est vide, ou ton sac est plein.','bad');
    save();return}
  if(d.k==='pay'&&Array.isArray(d.to)&&d.to.includes(MP.me)){const a=Math.floor(pnum(d.amt,0,1e7,0));if(a>0){G.cash+=a;G.earned+=a;if(a>=20)toast(`Équipe de la serre : +${fmt(a)} (ta part des ventes des dealers et livreurs).`,'good')}}
}
/* le chef applique les actions des autres joueurs */
function applyOp(from,o){
  const it=findItem(o.k);REMOTE=1;
  try{
    switch(o.t){
      case 'pl':if(it&&SM[o.s])lPlant(it,o.s,true);break;
      case 'wa':if(it){const c=G.can;G.can=CAN_MAX;lWater(it);G.can=c}break;
      case 'pr':if(it)lPrune(it);break;
      case 'hv':if(it)lHarvest(it,true);break;
      case 'cl':if(it)lClear(it);break;
      case 'ld':if(it)lLoad(it,true);break;
      case 'rm':if(it&&!it.b){G.lab.items=G.lab.items.filter(x=>x!==it);G.lab.store[it.id]=(G.lab.store[it.id]||0)+1;labSync()}break;
      case 'mv':{if(!MM[o.id]||!isFinite(o.d)||!isFinite(o.s))break;
        if(o.k){if(it&&placeOk(it.id,+o.d,+o.s,it)){it.d=+o.d;it.s=+o.s;labSync()}}
        else if((G.lab.store[o.id]||0)>0&&placeOk(o.id,+o.d,+o.s)){G.lab.store[o.id]--;G.lab.items.push({id:o.id,d:+o.d,s:+o.s,pl:null});labSync()}
        break}
      case 'dl':{
        for(const [f,obj,ok] of [['se',G.seeds,k=>!!SM[k]],['st',G.lab.store,k=>!!MM[k]]]){const src=o[f];if(!src||typeof src!=='object')continue;
          for(const k in src)if(ok(k)){const v=Math.round(pnum(src[k],-1e5,1e5,0));obj[k]=Math.max(0,(obj[k]||0)+v)}}
        if(o.lv&&typeof o.lv==='object')for(const k of SH_LV){const v=Math.round(pnum(o.lv[k],-20,20,0));if(v)G.lv[k]=clamp(lv(k)+v,0,lvMax(k))}
        if(Array.isArray(o.un))for(const id of o.un)if(SM[id])G.unlocked[id]=1;
        labZoneSync();syncCouriers();break}
      case 'take':{const give={};for(const s of STRAINS){const want=Math.floor(pnum(o.p&&o.p[s.id],0,1e5,0)),n=Math.min(want,G.stock[s.id]||0);if(n>0){G.stock[s.id]-=n;give[s.id]=n}}
        sendCrew({k:'give',to:from,p:give});break}
      case 'drop':for(const s of STRAINS){const n=Math.floor(pnum(o.p&&o.p[s.id],0,1e5,0));if(n>0)G.stock[s.id]=(G.stock[s.id]||0)+n}break;
      case 'eg':G.lab.items.forEach(x=>{const p=x.pl;if(p&&p.hp>0&&p.p<1)p.p=Math.min(1,p.p+.3)});break;
    }
  }finally{REMOTE=0}
}

/* ---------- actions des joueurs (non-chefs) : appliquées tout de suite chez soi, puis envoyées au chef ---------- */
function dBase(f,k,n){if(DELTA&&DELTA[f])DELTA[f][k]=(DELTA[f][k]||0)+n}
{const o=lPlant;lPlant=function(it,s,q){const r=o(it,s,q);if(r&&!REMOTE&&crewClient()){dBase('se',s,-1);sendOp({t:'pl',k:keyOf(it),s})}return r}}
{const o=lWater;lWater=function(it){const c=G.can;o(it);if(!REMOTE&&G.can<c&&crewClient())sendOp({t:'wa',k:keyOf(it)})}}
{const o=lPrune;lPrune=function(it){const was=it&&it.pl&&it.pl.pr;o(it);if(!REMOTE&&crewClient()&&was===1&&it.pl&&it.pl.pr===2)sendOp({t:'pr',k:keyOf(it)})}}
{const o=lHarvest;lHarvest=function(it,q){const k=keyOf(it),r=o(it,q);if(r&&!REMOTE&&crewClient())sendOp({t:'hv',k});return r}}
{const o=lClear;lClear=function(it){const k=keyOf(it);o(it);if(!REMOTE&&crewClient())sendOp({t:'cl',k})}}
{const o=lLoad;lLoad=function(it,q){const k=keyOf(it),r=o(it,q);if(r&&!REMOTE&&crewClient())sendOp({t:'ld',k});return r}}
{const o=lRemove;lRemove=function(it){const k=keyOf(it),had=G.lab.items.includes(it);o(it);if(had&&!G.lab.items.includes(it)&&crewClient()){dBase('st',it.id,1);sendOp({t:'rm',k})}}}
{const o=startPlace;startPlace=function(id,item){const k0=item?keyOf(item):null,had=item?null:(G.lab.store[id]||0);o(id,item);if(PLACE){PLACE.k0=k0;if(!item&&crewClient()&&(G.lab.store[id]||0)<had)dBase('st',id,-1)}}}
{const o=cancelPlace;cancelPlace=function(q){const p=PLACE;o(q);if(p&&!p.item&&crewClient())dBase('st',p.id,1)}}
{const o=dropPlace;dropPlace=function(){const p=PLACE&&{k0:PLACE.k0,id:PLACE.item?PLACE.item.id:PLACE.id,d:PLACE.d,s:PLACE.s,ok:PLACE.ok};o();if(p&&p.ok&&!PLACE&&crewClient())sendOp({t:'mv',k:p.k0,id:p.id,d:r2(p.d),s:r2(p.s)})}}
{const o=bagTake;bagTake=function(){
  if(!crewClient())return o();
  if(!tot()){toast('La réserve commune est vide : séchez la récolte d’abord.','bad');return}
  sendOp({t:'take',p:nz(G.stock)});toast('Demande envoyée au chef de serre…')}}
{const o=bagDrop;bagDrop=function(){
  if(!crewClient())return o();
  const p=nz(G.bag.p);if(!Object.keys(p).length){toast('Rien à déposer.','bad');return}
  for(const s in p)G.stock[s]=(G.stock[s]||0)+p[s];G.bag.p={};sendOp({t:'drop',p});save();toast('Produit déposé dans la réserve commune.','good')}}
{const o=useItem;useItem=function(id){const n=G.bag.it[id]||0;o(id);if(id==='engrais'&&crewClient()&&(G.bag.it[id]||0)<n)sendOp({t:'eg'})}}
/* achats qui ajoutent au labo commun (graines, machines, améliorations, recrues, variétés) : on envoie la différence */
function capShared(){return {se:{...G.seeds},st:{...G.lab.store},lv:Object.fromEntries(SH_LV.map(k=>[k,lv(k)])),un:{...G.unlocked}}}
function deltaBegin(){if(crewClient()&&!DELTA)DELTA=capShared()}
function deltaEnd(){
  if(!DELTA)return;const b=DELTA;DELTA=null;if(!crewClient())return;
  const a=capShared(),o={t:'dl'};let any=false;
  for(const f of ['se','st','lv']){const r={};for(const k of new Set([...Object.keys(a[f]),...Object.keys(b[f])])){const v=(a[f][k]||0)-(b[f][k]||0);if(v){r[k]=v;any=true}}if(Object.keys(r).length)o[f]=r}
  const un=Object.keys(a.un).filter(k=>a.un[k]&&!b.un[k]);if(un.length){o.un=un;any=true}
  if(any)sendOp(o);
}
for(const id of ['menu','tChoices','shop']){const el=$(id);if(!el)continue;el.addEventListener('click',deltaBegin,true);el.addEventListener('click',()=>setTimeout(deltaEnd,0))}
{const o=deliverAll;deliverAll=function(){deltaBegin();o();deltaEnd()}}
{const o=intAct;intAct=function(t){deltaBegin();o(t);deltaEnd()}}
/* seul le chef fait pousser et fait travailler l'équipe ; ce que rapportent dealers et livreurs est partagé */
{const o=labTick;labTick=function(dt){if(crewClient())return;o(dt)}}
{const o=syncCouriers;syncCouriers=function(){if(crewClient()){couriers.length=0;return}o()}}
{const o=economy;economy=function(dt){
  if(crewClient()){const d=G.lv.dealer;G.lv.dealer=0;o(dt);G.lv.dealer=d;return}
  const b=G.cash;o(dt);if(crewHost()&&G.cash>b)CREW.inc+=G.cash-b}}
{const o=sale;sale=function(q,cut,who){const b=G.cash,r=o(q,cut,who);if(r&&who==='livreur'&&crewHost())CREW.inc+=G.cash-b;return r}}
{const o=toast;toast=function(...a){if(REMOTE)return;o(...a)}}

/* ---------- chef de serre : élection, diffusion, sauvegarde ---------- */
const crewMembers=()=>[MP.me,...CREW.mem.keys()].filter(Boolean).map(String).sort();
async function becomeHost(){
  CREW.host=MP.me;
  if(!CREW.synced&&!CREW.loading){
    CREW.loading=true;
    try{const db=await getDb();if(db){const sn=await db.doc('crews/'+CREW.code).get();if(sn.exists){const S=JSON.parse(sn.data().s);applyShared(S)}}}catch(e){}
    CREW.loading=false;CREW.synced=true;
  }
  if(crewHost())broadcastSnap()
}
async function crewSaveDoc(){
  try{const db=await getDb();if(db)await db.doc('crews/'+CREW.code).set({t:Date.now(),s:JSON.stringify(sharedOut())})}catch(e){}
}
function updCrew(dt){
  if(!isMulti()||!started||!CREW.code)return;
  if(!crewOn())return;
  CREW.electT-=dt;
  if(CREW.electT<=0){CREW.electT=1;
    const mem=crewMembers(),now=performance.now();
    const alive=CREW.host&&(CREW.host===MP.me||(mem.includes(CREW.host)&&now-CREW.lastSnap<4500));
    if(!alive&&now-CREW.joinedAt>2600&&!CREW.loading){const h=mem[0];if(h===MP.me)becomeHost();else{CREW.host=h;CREW.lastSnap=now}}
    const hn=CREW.host===MP.me?'toi':(CREW.mem.get(CREW.host)||'…');CREW.hostName=hn;
  }
  if(crewHost()){
    CREW.snapT-=dt;if(CREW.snapT<=0)broadcastSnap();
    CREW.saveT-=dt;if(CREW.saveT<=0){CREW.saveT=30;crewSaveDoc()}
    CREW.payT-=dt;if(CREW.payT<=0){CREW.payT=6;
      const to=[...CREW.mem.keys()],n=to.length+1;
      if(to.length&&CREW.inc>=n){const share=Math.floor(CREW.inc/n);G.cash-=share*to.length;G.earned-=share*to.length;sendCrew({k:'pay',to,amt:share})}
      CREW.inc=0}
  }
}
{const o=updStory;updStory=function(dt){o(dt);updCrew(dt)}}
/* carte « Serre partagée » à la place de l'objectif */
function crewCard(el){
  el.classList.add('crew');
  const mem=[...CREW.mem.values()];
  const n=mem.length+1,h=`${G.pvpWins||0}|${CREW.code}|${mem.join()}|${CREW.hostName}|${CREW.synced}|${qOpen}|${crewOn()}|${Object.keys(MP.teams||{}).length}`;
  if(el.dataset.h===h)return;el.dataset.h=h;
  $('qC').textContent='Mode multijoueur · serre de ton équipe';
  $('qT').textContent=(CREW.code?`Équipe ${CREW.code} · ${n}/${TEAM_MAX}`:'Serre partagée')+(qOpen?' ▴':' ▾');
  vis($('qC'),qOpen);vis($('qD'),qOpen);
  vis($('qP'),qOpen);$('qP').textContent=!crewOn()?'Connexion…':!CREW.synced&&!crewHost()?'Synchronisation du labo…':crewHost()?'Tu gères la serre (les plantes poussent chez toi)':'Chef de serre : '+CREW.hostName;
  $('qD').textContent=`Avec toi : ${mem.length?mem.join(', '):'personne pour l’instant. Donne le code '+CREW.code+' à tes amis.'}${(()=>{const o=Object.keys(MP.teams||{}).filter(c=>c!==CREW.code).length;return o?` · ${o} autre${o>1?'s':''} équipe${o>1?'s':''} en ville`:''})()}`;vis($('qD'),qOpen);
  vis($('qS'),qOpen);$('qS').textContent=`Labo, graines, récolte, réserve et équipe sont communs ; ton argent et ton sac restent à toi. Rivaux (en rouge) : frappe-les pour les dépouiller, ou braque leur serre depuis la porte du labo (Options). Bagarres gagnées : ${G.pvpWins||0}.`;
}
if(/[?&]debug=1\b/.test(location.search))window.__crew={get MP(){return MP},get CREW(){return CREW},sharedOut,applyShared,startCrew,startStory,crewHost,crewClient,crewMembers};

/* ---------- conflits entre équipes (mode multijoueur) : bagarres de rue et braquages de serre ---------- */
/* Un joueur frappe un joueur d'une autre équipe : la victime encaisse chez elle (événement « pvp » dans la ville).
   À 0 de vie, elle est KO : elle perd 30 % du produit de son sac et 10 % de son argent sale, qui vont à l'agresseur, puis repart de son labo.
   Braquage : devant la porte du labo, « Options » propose de braquer la serre d'une équipe rivale. Il faut tenir 25 s devant la porte ;
   l'équipe visée est prévenue et peut venir défendre. Réussi : le chef de la serre visée cède 25 % de la réserve et de la récolte. */
const PVP={g:null,last:new Map(),raid:null,alert:null,cool:0,pend:null};
const RAID_TIME=25,RAID_R=9;
const enemy=o=>isMulti()&&!!o&&!!o.cm&&o.cm!==CREW.code;
const inWorld=()=>started&&!ended&&!INT&&!HIDE&&!inLab()&&!CINE;
function pvpSend(d){if(MP.g&&MP.code==='MULTI')MP.g.emit('pvp',d).catch(()=>{})}
function pvpAttach(){
  const g=MP.g;if(!g||PVP.g===g||MP.code!=='MULTI')return;PVP.g=g;
  g.on('pvp',m=>{if(MP.g===g)onPvp(m)},()=>{});
}
/* coup de poing : on cherche d'abord un joueur d'une équipe rivale devant soi */
{const o=updCombat;updCombat=function(dt){
  const was=punchHit,on=punchT>0;o(dt);
  if(!(on&&!was&&punchHit)||!isMulti()||!inWorld())return;
  const fx=Math.sin(P.th),fz=Math.cos(P.th);let best=null,bd=3.6;
  for(const q of MP.others.values()){if(!enemy(q)||q.hid||q.k!=='foot'||inLab(q.x,q.z))continue;const dx=q.x-P.x,dz=q.z-P.z,d=Math.hypot(dx,dz);if(d<bd&&(dx*fx+dz*fz)/(d||1)>.3){bd=d;best=q}}
  if(!best)return;
  const dmg=Math.round(R(12,18));
  pvpSend({k:'hit',to:best.id,d:dmg,fx:Math.round(fx*100)/100,fz:Math.round(fz*100)/100,tm:CREW.code});
  floater(best.x,best.z-2.5,'-'+dmg,'#ffd24a',false);best.pk=.38;CAM.shake=Math.max(CAM.shake,2.5);Sfx.crash(.3);
  G.heat=Math.min(100,G.heat+4*heatMult());
  if(witness(50)){G.heat=Math.max(G.heat,65);toast('Des policiers t’ont vu te battre !','bad')}
}}
function onPvp(m){
  if(!isMulti()||m.sameTab)return;
  const d=m.data||{},from=String(m.peer||''),att=MP.others.get(from),now=performance.now();
  switch(d.k){
    case 'hit':{
      if(att)att.pk=.38;
      if(d.to!==MP.me){const v=MP.others.get(String(d.to));if(v&&inView(v.x,v.z,8))floater(v.x,v.z-2.5,'-'+Math.round(pnum(d.d,0,30,0)),'#ffd24a',false);return}
      if(!att||!enemy(att)||!inWorld()||P.def.kind!=='foot')return;
      if(now-(PVP.last.get(from)||0)<280)return;PVP.last.set(from,now);
      if(Math.hypot(att.x-P.x,att.z-P.z)>7)return;
      const dmg=clamp(Math.round(pnum(d.d,0,30,12)),8,20);
      G.hp-=dmg;CAM.shake=Math.max(CAM.shake,5);Sfx.crash(.4);floater(P.x,P.z-2.5,'-'+dmg+' vie','#ff5a40',false);
      P.vx+=pnum(d.fx,-1,1,0)*7;P.vz+=pnum(d.fz,-1,1,0)*7;threat=true;
      if(!PVP.hitT||now-PVP.hitT>6000)toast(`${att.n} (équipe ${att.cm}) te tombe dessus ! Riposte avec 👊 ou F.`,'bad');PVP.hitT=now;
      if(G.hp<=0)pvpKO(from,att);
      return}
    case 'ko':{
      const an=cleanTxt(d.an,18)||'Quelqu’un',vn=cleanTxt(d.vn,18)||'Quelqu’un';
      if(d.by===MP.me){G.pvpWins=(G.pvpWins||0)+1;toast(`${vn} est KO ! Tu ramasses ce qu’il avait sur lui.`,'good');Sfx.cash();save()}
      else if(MP.others.size)toast(`${an} a mis ${vn} KO.`);
      return}
    case 'loot':{
      if(d.to!==MP.me)return;
      let got=0;for(const s of STRAINS){const n=Math.floor(pnum(d.p&&d.p[s.id],0,5000,0));if(n)got+=bagAddProd(s.id,n)}
      const c=Math.floor(pnum(d.c,0,1e7,0));G.cash+=c;G.earned+=c;
      if(got||c){floater(P.x,P.z-3,(c?'+'+fmt(c):'')+(got?` +${got} u.`:''),'#ffd24a',true);coins(P.x,P.z,10);
        toast(d.raid?`Braquage réussi : ${got} unités dans ton sac${c?' et '+fmt(c):''}.`:`Butin : ${got} unités${c?' et '+fmt(c):''}.`,'good')}
      else if(d.raid)toast('Braquage réussi… mais leur réserve était vide.','bad');
      if(d.raid)PVP.pend=null;
      save();return}
    case 'raid':{
      if(d.team!==CREW.code)return;
      PVP.alert={by:from,bn:cleanTxt(d.bn,18)||'?',bt:cleanTxt(d.bt,8),t:RAID_TIME+2};
      toast(`ALERTE : ${PVP.alert.bn} (équipe ${PVP.alert.bt}) braque votre serre ! Viens défendre la porte du labo.`,'bad');Sfx.alert();
      if(LAB)WP={x:LAB.sh.door.x,z:LAB.sh.door.z,label:'Défendre la serre'};
      return}
    case 'raidx':{if(d.team===CREW.code&&PVP.alert){PVP.alert=null;toast('Le braquage de votre serre a échoué.','good');if(WP&&WP.label==='Défendre la serre')WP=null}return}
    case 'raidok':{
      if(d.team!==CREW.code)return;
      PVP.alert=null;if(WP&&WP.label==='Défendre la serre')WP=null;
      if(crewHost()){
        const p={};let n=0;
        for(const s of STRAINS){const a=Math.floor((G.stock[s.id]||0)*.25),b=Math.floor((G.raw[s.id]||0)*.25);if(a){G.stock[s.id]-=a}if(b){G.raw[s.id]-=b}if(a+b){p[s.id]=a+b;n+=a+b}}
        pvpSend({k:'loot',to:from,p,c:0,raid:1});CREW.snapT=0;save();
        toast(`Votre serre a été braquée : ${n} unités volées dans la réserve.`,'bad');
      }else toast('Votre serre a été braquée !','bad');
      return}
  }
}
function pvpKO(attacker,att){
  const p={};let n=0;
  for(const s of STRAINS){const k=Math.floor((G.bag.p[s.id]||0)*.3);if(k){G.bag.p[s.id]-=k;p[s.id]=k;n+=k}}
  const c=Math.floor(G.cash*.1);G.cash-=c;
  pvpSend({k:'loot',to:attacker,p,c});
  pvpSend({k:'ko',by:attacker,an:att?att.n:'',vn:MP.nick});
  if(PVP.raid)raidStop(true);
  G.hp=45;G.pvpLoss=(G.pvpLoss||0)+1;spawnHome();save();
  openDialog('KO','#ff5a40',{text:`${att?att.n:'Quelqu’un'} (équipe ${att?att.cm:'?'}) t’a mis KO. Il est reparti avec ${n} unités de ton sac et ${fmt(c)}. Tu te réveilles dans ton labo.`,choices:[{label:'Se relever',close:1}]},()=>{});
}
/* braquage d'une serre rivale, depuis la porte du labo */
{const o=findTarget;findTarget=function(){o();if(tgt&&tgt.k==='enterlab'&&isMulti()&&Object.keys(MP.teams||{}).some(c=>c!==CREW.code))tgt.opt=true}}
{const o=actOpt;actOpt=function(){findTarget();if(tgt&&tgt.k==='enterlab'&&isMulti()){raidMenu();return}o()};$('bOpt').onclick=actOpt}
function raidMenu(){
  const T=MP.teams||{},rivals=Object.keys(T).filter(c=>c!==CREW.code);
  if(PVP.cool>0){openDialog('Braquage','#ff5a40',{text:`Trop tôt : tes hommes sont encore repérés. Attends ${Math.ceil(PVP.cool)} s.`,choices:[{label:'OK',close:1}]},()=>{});return}
  openDialog('Braquer une serre rivale','#ff5a40',{text:`Choisis l’équipe à braquer. Il faudra tenir ${RAID_TIME} secondes devant la porte du labo : l’équipe visée sera prévenue et pourra venir se défendre. Si tu réussis, tu repars avec un quart de sa réserve.`,choices:[
    ...rivals.slice(0,5).map(c=>({label:`Équipe ${c}`,desc:T[c].join(', '),fn:()=>{raidStart(c);return `Le braquage commence. Reste devant la porte ${RAID_TIME} secondes. Ils arrivent peut-être…`}})),
    {label:'Entrer dans mon labo',quick:1,fn:()=>{const [x,z]=labWorld(1.6,0);P.x=x;P.z=z;P.th=LAB.spawn.th;P.vx=P.vz=0}},
    {label:'Annuler',close:1}]},()=>{});
}
function raidStart(code){
  PVP.raid={team:code,t:RAID_TIME};
  pvpSend({k:'raid',team:code,bn:MP.nick,bt:CREW.code});
  G.heat=Math.min(100,G.heat+10);
}
function raidStop(fail){
  const r=PVP.raid;if(!r)return;PVP.raid=null;
  if(fail){pvpSend({k:'raidx',team:r.team});toast('Braquage raté.','bad')}
}
function updPvp(dt){
  if(!isMulti()||!started)return;
  pvpAttach();
  PVP.cool=Math.max(0,PVP.cool-dt);
  for(const o of MP.others.values())if(o.pk>0)o.pk=Math.max(0,o.pk-dt);
  if(PVP.alert){PVP.alert.t-=dt;if(PVP.alert.t<=0)PVP.alert=null}
  const r=PVP.raid;
  if(r&&!paused()){
    const d=LAB?Math.hypot(P.x-LAB.sh.door.x,P.z-LAB.sh.door.z):99;
    if(d>RAID_R||INT||inLab()||P.def.kind!=='foot'){raidStop(true);return}
    r.t-=dt;
    if(r.t<=0){PVP.raid=null;PVP.cool=120;PVP.pend={t:6};pvpSend({k:'raidok',team:r.team});toast('Braquage réussi ! Le butin arrive…','good')}
  }
  if(PVP.pend){PVP.pend.t-=dt;if(PVP.pend.t<=0){PVP.pend=null;toast('Personne de cette équipe ne gardait la réserve : rien à prendre cette fois.','bad')}}
  if(PVP.raid)SBAN={txt:`Braquage de la serre ${PVP.raid.team} · ${Math.ceil(PVP.raid.t)} s · reste devant la porte`,bg:'rgba(180,40,30,.92)'};
  else if(PVP.alert)SBAN={txt:`Votre serre est braquée par ${PVP.alert.bn} · ${Math.ceil(PVP.alert.t)} s · défends la porte !`,bg:'rgba(180,40,30,.92)'};
}
{const o=updStory;updStory=function(dt){o(dt);updPvp(dt)}}
if(/[?&]debug=1\b/.test(location.search))window.__pvp={get raid(){return PVP.raid},paused:()=>paused(),PVP};

/* ---------- ordinateur du labo : un bureau avec des applis au lieu d'une barre d'onglets ---------- */
/* Ouvrir l'ordinateur montre le « bureau » : une grille de grosses tuiles (faciles à toucher sur mobile),
   chacune avec un petit résumé en direct et un point rouge quand quelque chose t'attend.
   Une tuile ouvre l'appli en plein écran ; « ← Bureau » (ou Échap) ramène au bureau. Les boutiques gardent leur menu à un seul onglet. */
const PC_APPS=[
  ['labo','🌿','Labo'],['shop','📦','Commander'],['ups','🔧','Améliorer'],
  ['team','👥','Équipe'],['garage','🚗','Garage'],['clients','📍','Clients'],
  ['bosses','🤝','Gérants'],['mp','🌐','En ligne'],['save','💾','Sauvegarde']];
const pcSafe=(f,d='')=>{try{return f()}catch(e){return d}};
function pcBadge(id){
  switch(id){
    case 'labo':{const it=G.lab.items.filter(i=>i.pl),rdy=it.filter(i=>i.pl.p>=1&&i.pl.hp>0).length,dry=it.filter(i=>i.pl.p<1&&i.pl.w<30&&i.pl.hp>0).length;
      return rdy?[`${rdy} prête${rdy>1?'s':''}`,1]:dry?[`${dry} assoiffée${dry>1?'s':''}`,1]:[`${it.length} plante${it.length>1?'s':''}`,0]}
    case 'shop':{const n=(G.deliv||[]).length;return n?[`${n} en route`,0]:[`${seedTot()} graines`,0]}
    case 'ups':{const n=UPS.filter(u=>lv(u.id)<u.max&&G.cash>=upCost(u)).length;return n?[`${n} possible${n>1?'s':''}`,1]:['Rien à prendre',0]}
    case 'team':{const n=TEAM.reduce((a,u)=>a+lv(u.id),0);return [`${n} recrue${n>1?'s':''}`,0]}
    case 'garage':return [VM[G.veh]?VM[G.veh].name:'À pied',0];
    case 'clients':{const n=orders.filter(o=>canDeliver(o)).length;return orders.length?[`${orders.length} commande${orders.length>1?'s':''}`,n?1:0]:['Personne',0]}
    case 'bosses':{const w=BIDS.filter(b=>!G.retired[b]&&['war','hostile'].includes(stance(b))).length;return w?[`${w} hostile${w>1?'s':''}`,1]:['Calme',0]}
    case 'mp':{const n=MP.others?MP.others.size:0;return [n?`${n} en ligne`:'Seul ici',0]}
    case 'save':return [G.code?G.code:'Pas de code',0];
  }
  return ['',0];
}
function tabHome(){
  const k=(l,v)=>`<div><small>${l}</small><b>${v}</b></div>`;
  let s=`<div class="kpis">${k('Sale',fmt(G.cash))}${k('Propre',fmt(G.clean||0))}${k('Produit',pcSafe(()=>tot()+'/'+cap()))}${k('Récolte',pcSafe(rawTot,0))}</div>`;
  s+='<div class="apps">'+PC_APPS.map(([id,ic,nm])=>{const [b,warn]=pcSafe(()=>pcBadge(id),['',0]);
    return `<button class="app${warn?' warn':''}" data-act="tab:${id}" aria-label="${nm}${b?' : '+esc(String(b)):''}"><i aria-hidden="true">${ic}</i><b>${nm}</b><small>${esc(String(b))}</small></button>`}).join('')+'</div>';
  s+='<p class="note">Touche une appli pour l’ouvrir. Le point rouge veut dire que quelque chose t’attend.</p>';
  return s;
}
TABS.home=['Ordinateur',tabHome];
/* bouton retour dans l'en-tête */
{const h=$('mTitle').parentNode,b=document.createElement('button');
  b.className='btn ghost';b.id='mBack';b.type='button';b.dataset.act='tab:home';b.textContent='← Bureau';b.hidden=true;
  h.insertBefore(b,$('mTitle'))}
{const o=renderMenu;renderMenu=function(){
  if(!TABS[tab])tab='home';
  o();
  $('tabs').hidden=true;
  $('mBack').hidden=menuOnly||tab==='home';
  $('menu').classList.toggle('pcHome',tab==='home'&&!menuOnly);
}}
/* ouvrir l'ordinateur (sans boutique) arrive sur le bureau */
{const o=openMenu;openMenu=function(t,only){if(!only&&(!t||t==='labo'))t='home';o(t,only)}}
/* Échap : d'abord revenir au bureau, puis fermer */
addEventListener('keydown',e=>{
  if(e.key!=='Escape'||!menuOpen||menuOnly||tab==='home'||talking||bagOpen)return;
  tab='home';confirmReset=false;$('body').scrollTop=0;renderMenu();e.preventDefault();e.stopImmediatePropagation();
},true);

/* ---------- manette (API Gamepad : Xbox, PlayStation, Switch Pro…) ---------- */
/* À pied : stick gauche ou croix = marcher, A = action, X = frapper, Y = options, Start = sac, Select = carte.
   Au volant : RT = accélérer, LT = freiner / reculer, stick gauche ou croix = tourner, B = frein à main, X = klaxon, RB = go fast.
   Menus, dialogues, boutiques, lobby : croix ou stick = se déplacer entre les boutons, A = valider, B = retour / fermer. */
const GP={idx:null,prev:[],held:{},joy:false,nav:0,last:null,on:false,rumble:0};
const GPB={A:0,B:1,X:2,Y:3,LB:4,RB:5,LT:6,RT:7,SEL:8,START:9,UP:12,DOWN:13,LEFT:14,RIGHT:15};
const GP_DZ=.22;
function gpPad(){
  let pads=[];try{pads=navigator.getGamepads?navigator.getGamepads():[]}catch(e){}
  if(GP.idx!==null&&pads[GP.idx]&&pads[GP.idx].connected)return pads[GP.idx];
  for(const p of pads)if(p&&p.connected){GP.idx=p.index;return p}
  return null;
}
const gpVal=(p,i)=>{const b=p.buttons[i];return b?(typeof b==='object'?(b.pressed?Math.max(b.value,.5):b.value):b):0};
function gpRumble(ms=90,s=.5,w=.3){const p=gpPad();try{p&&p.vibrationActuator&&p.vibrationActuator.playEffect('dual-rumble',{duration:ms,strongMagnitude:s,weakMagnitude:w})}catch(e){}}
function gpKey(key){document.body.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}))}
function gpSetKey(k,v){if(v&&!GP.held[k]){keys[k]=1;GP.held[k]=1}else if(!v&&GP.held[k]){keys[k]=0;GP.held[k]=0}}
function gpRelease(){for(const k in GP.held)if(GP.held[k]){keys[k]=0;GP.held[k]=0}if(GP.joy){GP.joy=false;if(J.id===null){J.on=false;J.x=J.y=0}}}
/* fenêtre ouverte au premier plan (pour naviguer entre ses boutons) */
function gpRoot(){
  if(CINE)return null;
  for(const id of ['talk','raid','end','bag','shop','menu','start']){const e=$(id);if(e&&!e.hidden&&e.getClientRects().length)return e}
  return null;
}
function gpItems(root){
  return [...root.querySelectorAll('button,input,summary,[role="button"],a[href]')].filter(e=>!e.disabled&&e.getClientRects().length&&!e.closest('[hidden]')&&getComputedStyle(e).visibility!=='hidden');
}
function gpFocus(el){
  if(GP.last&&GP.last!==el)GP.last.classList.remove('gpf');
  GP.last=el;if(!el)return;el.classList.add('gpf');
  try{el.focus({preventScroll:true})}catch(e){}
  el.scrollIntoView({block:'nearest',inline:'nearest'});
}
function gpMove(root,dx,dy){
  const it=gpItems(root);if(!it.length)return;
  const cur=GP.last&&it.includes(GP.last)?GP.last:null;
  if(!cur){gpFocus(it[0]);return}
  const a=cur.getBoundingClientRect(),ax=a.left+a.width/2,ay=a.top+a.height/2;
  let best=null,bs=1e9;
  for(const e of it){if(e===cur)continue;const b=e.getBoundingClientRect(),bx=b.left+b.width/2,by=b.top+b.height/2;
    const along=(bx-ax)*dx+(by-ay)*dy,across=Math.abs((bx-ax)*dy-(by-ay)*dx);
    if(along<=2)continue;const sc=along+across*2.2;if(sc<bs){bs=sc;best=e}}
  if(!best){// rien dans cette direction : on fait le tour de la liste
    const i=it.indexOf(cur),n=dx+dy>0?it[(i+1)%it.length]:it[(i-1+it.length)%it.length];best=n}
  gpFocus(best);
}
function gpLoop(now){
  requestAnimationFrame(gpLoop);
  const p=gpPad();
  if(!p){if(GP.on){GP.on=false;gpRelease();document.body.classList.remove('gp')}return}
  if(!GP.on){GP.on=true;document.body.classList.add('gp')}
  if(started&&!GP.told&&!CINE){GP.told=1;toast('🎮 Manette prête. A : action · X : frapper · Y : options · Start : sac · Select : carte · B : retour. Au volant : RT / LT, B frein à main.','good')}
  const btn=[];for(let i=0;i<17;i++)btn[i]=gpVal(p,i)>.5;
  const down=i=>btn[i]&&!GP.prev[i];
  const ax=p.axes[0]||0,ay=p.axes[1]||0,mag=Math.hypot(ax,ay);
  if(btn.some(Boolean)||mag>GP_DZ)document.body.classList.add('gp');
  const root=gpRoot();
  // cinématique : A = suite, B ou Start = passer
  if(CINE){gpRelease();if(down(GPB.A))gpKey('Enter');else if(down(GPB.B)||down(GPB.START))gpKey('Escape');GP.prev=btn;return}
  // carte en grand
  if(mapBig){gpRelease();if(down(GPB.B)||down(GPB.SEL)||down(GPB.A))toggleMap();GP.prev=btn;return}
  if(root){
    gpRelease();
    // déplacement entre les boutons : croix (à chaque appui) ou stick (répétition)
    let dx=0,dy=0;
    if(down(GPB.UP))dy=-1;else if(down(GPB.DOWN))dy=1;else if(down(GPB.LEFT))dx=-1;else if(down(GPB.RIGHT))dx=1;
    else if(mag>.6&&now>GP.nav){if(Math.abs(ax)>Math.abs(ay))dx=Math.sign(ax);else dy=Math.sign(ay)}
    if(mag<.35&&!btn[GPB.UP]&&!btn[GPB.DOWN]&&!btn[GPB.LEFT]&&!btn[GPB.RIGHT])GP.nav=0;
    if(dx||dy){gpMove(root,dx,dy);GP.nav=now+(GP.nav?140:320)}
    // stick droit : faire défiler la fenêtre
    const ry=p.axes[3]||0;if(Math.abs(ry)>.3){const sc=root.querySelector('#body,#shBody,#bagBody,.sheet');if(sc)sc.scrollTop+=ry*14}
    if(down(GPB.A)){const it=gpItems(root);const el=GP.last&&it.includes(GP.last)?GP.last:null;
      if(el){if(el.tagName==='INPUT')el.focus();else el.click();
        // après un clic, la fenêtre peut avoir été redessinée : on se remet sur un bouton présent
        setTimeout(()=>{const r=gpRoot();if(r&&!(GP.last&&r.contains(GP.last)&&GP.last.isConnected)){const l=gpItems(r);if(l.length)gpFocus(l[0])}},60)}
      else gpMove(root,0,1)}
    if(down(GPB.B)){
      if(root.id==='talk'){}
      else if(root.id==='bag')closeBag();
      else if(root.id!=='start')gpKey('Escape')}
    if(down(GPB.START)&&root.id==='bag')closeBag();
    GP.prev=btn;return}
  if(GP.last){GP.last.classList.remove('gpf');GP.last=null}
  if(!started||ended||paused()){gpRelease();GP.prev=btn;return}
  const foot=P.def.kind==='foot';
  if(foot){
    // stick gauche analogique (comme le joystick tactile) ou croix
    if(J.id===null){
      if(mag>GP_DZ){const m=Math.min(1,(mag-GP_DZ)/(1-GP_DZ));J.x=ax/mag*m;J.y=ay/mag*m;J.on=true;GP.joy=true}
      else if(GP.joy){GP.joy=false;J.on=false;J.x=J.y=0}
    }
    gpSetKey('up',btn[GPB.UP]);gpSetKey('dn',btn[GPB.DOWN]);gpSetKey('l',btn[GPB.LEFT]);gpSetKey('r',btn[GPB.RIGHT]);gpSetKey('sp',false);
    gpSetKey('walk',btn[10]);
    if(down(GPB.X)){doPunch();gpRumble(70,.35,.2)}
  }else{
    if(GP.joy){GP.joy=false;if(J.id===null){J.on=false;J.x=J.y=0}}
    gpSetKey('up',gpVal(p,GPB.RT)>.15||btn[GPB.UP]||btn[GPB.A]&&false);
    gpSetKey('dn',gpVal(p,GPB.LT)>.15||btn[GPB.DOWN]);
    gpSetKey('l',ax<-.35||btn[GPB.LEFT]);gpSetKey('r',ax>.35||btn[GPB.RIGHT]);
    gpSetKey('sp',btn[GPB.B]);gpSetKey('walk',false);
    if(down(GPB.X))honk();
    if(down(GPB.RB))startFast();
    // vibre un peu en accélérant fort ou en dérapant
    if(P.slip>.5&&now>GP.rumble){GP.rumble=now+250;gpRumble(120,.25,.4)}
  }
  if(down(GPB.A))act();
  if(down(GPB.Y))actOpt();
  if(down(GPB.START))openBag();
  if(down(GPB.SEL))toggleMap();
  if(down(GPB.LB)&&mpReady&&mpReady())openChat();
  GP.prev=btn;
}
addEventListener('gamepadconnected',e=>{GP.idx=e.gamepad.index;if(!started){const r=gpRoot();if(r){const l=gpItems(r);if(l.length)gpFocus(l[0])}}});
addEventListener('gamepaddisconnected',e=>{if(GP.idx===e.gamepad.index){GP.idx=null;gpRelease();if(started)toast('🎮 Manette déconnectée.','bad')}});
addEventListener('touchstart',()=>{document.body.classList.remove('gp')},{passive:true});
/* une vibration quand on prend un coup ou qu'on se fait arrêter */
{const o=arrest;arrest=function(){gpRumble(400,1,.8);return o.apply(this,arguments)}}
requestAnimationFrame(gpLoop);
if(/[?&]debug=1\b/.test(location.search))window.__pad={GP,gpRoot,gpItems};

/* ---------- nouvelle carte : voie ferrée et train, stade, commissariat ---------- */
/* voie ferrée entre le centre-ville et le Sud ; un train de banlieue passe régulièrement */
const TRAIN={per:75,len:4,car:17};
function trainX(t){const ph=(t%(TRAIN.per*2))/TRAIN.per,dir=ph<1?1:-1,u=ph<1?ph:ph-1;return {x:dir>0?-760+u*1520:760-u*1520,dir}}
function drawRailStadium(t){
  if(VB.z0<RAILZ+10&&VB.z1>RAILZ-10){
    const x0=Math.max(-640,VB.x0-5),x1=Math.min(640,VB.x1+5);
    ctx.fillStyle='#7d746b';ctx.fillRect(x0,RAILZ-3.4,x1-x0,6.8);
    ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(x0,RAILZ+2.6,x1-x0,.8);
    ctx.fillStyle='#5a4432';for(let x=Math.floor(x0/1.6)*1.6;x<x1;x+=1.6)ctx.fillRect(x,RAILZ-1.9,.55,3.8);
    ctx.fillStyle='#c9c6bf';ctx.fillRect(x0,RAILZ-1.15,x1-x0,.22);ctx.fillRect(x0,RAILZ+.93,x1-x0,.22);
    // grillage de chaque côté
    ctx.strokeStyle='rgba(60,60,60,.55)';ctx.lineWidth=.15;ctx.beginPath();ctx.moveTo(x0,RAILZ-4.4);ctx.lineTo(x1,RAILZ-4.4);ctx.moveTo(x0,RAILZ+4.4);ctx.lineTo(x1,RAILZ+4.4);ctx.stroke();
  }
  const S=STADIUM;
  if(inView((S.x0+S.x1)/2,(S.z0+S.z1)/2,120)){
    ctx.fillStyle='#4f8a35';ctx.fillRect(S.x0,S.z0,S.x1-S.x0,S.z1-S.z0);
    const px0=S.x0+12,px1=S.x1-12,pz0=S.z0+12,pz1=S.z1-12,pw=px1-px0,ph=pz1-pz0;
    for(let i=0;i<10;i++){ctx.fillStyle=i%2?'#5f9a3f':'#56913a';ctx.fillRect(px0+i*pw/10,pz0,pw/10,ph)}
    ctx.strokeStyle='rgba(255,255,255,.85)';ctx.lineWidth=.35;ctx.strokeRect(px0,pz0,pw,ph);
    ctx.beginPath();ctx.moveTo(px0+pw/2,pz0);ctx.lineTo(px0+pw/2,pz1);ctx.stroke();
    ctx.beginPath();ctx.arc(px0+pw/2,pz0+ph/2,7,0,6.3);ctx.stroke();
    for(const [x,s] of [[px0,1],[px1,-1]]){ctx.strokeRect(s>0?x:x-12,pz0+ph/2-14,12,28);ctx.strokeRect(s>0?x:x-4,pz0+ph/2-6,4,12);ctx.fillStyle='#eee';ctx.fillRect(s>0?x-1.2:x,pz0+ph/2-3,1.2,6)}
    // tribunes (nord et sud)
    for(const [z0,z1] of [[S.z0,S.z0+8],[S.z1-8,S.z1]]){box(S.x0,z0,S.x1,z1,0,5,sty(0x8a8f96),null);
      for(let x=S.x0+2;x<S.x1-2;x+=3){ctx.fillStyle=['#c0392b','#2f6fd0','#e0b020'][Math.floor(x/9)%3];ctx.fillRect(x,z0+1.5,2,z1-z0-3)}}
  }
}
/* le train passe par-dessus le sol (dessiné après les routes) */
{const _dg=drawGround;drawGround=function(now){_dg(now);
  const t=now/1000,{x,dir}=trainX(t),L=TRAIN.len*TRAIN.car;
  if(VB.z0>RAILZ+6||VB.z1<RAILZ-6||x+L<VB.x0-10||x-L>VB.x1+10)return;
  for(let i=0;i<TRAIN.len;i++){const cx=x-dir*(i*TRAIN.car+TRAIN.car/2);
    ctx.fillStyle='rgba(0,0,0,.28)';ctx.fillRect(cx-TRAIN.car/2+.6+TOD.sx*1.2,RAILZ-1.6+TOD.sz*1.2,TRAIN.car-1.2,3.4);
    ctx.fillStyle='#e9e6df';rr(ctx,cx-TRAIN.car/2+.4,RAILZ-1.7,TRAIN.car-.8,3.4,i===0||i===TRAIN.len-1?1.2:.3);ctx.fill();
    ctx.fillStyle='#2f6fd0';ctx.fillRect(cx-TRAIN.car/2+.4,RAILZ-.35,TRAIN.car-.8,.7);
    ctx.fillStyle='#9aa3ad';for(let k=-3;k<=3;k++)ctx.fillRect(cx+k*2.1-.4,RAILZ-1.2,.8,.5);
    if(TOD.n>.35){ctx.fillStyle='rgba(255,220,150,.75)';for(let k=-3;k<=3;k++)ctx.fillRect(cx+k*2.1-.4,RAILZ+.7,.8,.5)}}
  // phares de la motrice
  const hx=x+dir*.2;if(TOD.n>.3){ctx.fillStyle='rgba(255,240,190,.35)';ctx.beginPath();ctx.moveTo(hx,RAILZ-1.4);ctx.lineTo(hx+dir*22,RAILZ-5);ctx.lineTo(hx+dir*22,RAILZ+5);ctx.lineTo(hx,RAILZ+1.4);ctx.fill()}
  // bruit quand il passe près du joueur
  if(Math.abs(x-P.x)<60&&Math.abs(RAILZ-P.z)<70&&!TRAIN.honk){TRAIN.honk=1;try{Sfx.horn()}catch(e){}}
  if(Math.abs(x-P.x)>200)TRAIN.honk=0;
}}

/* ---------- le commissariat : amende, enveloppe, renseignements ---------- */
function policeDialog(){
  const I=INT,fine=8000*Math.max(1,G.strikes),bribe=Math.round(1500+G.heat*60);
  const ch=[];
  ch.push({label:`Payer une amende (${fmt(fine)})`,desc:G.strikes?`Efface une arrestation de ton casier (${G.strikes}/${MAXSTRIKES}). Argent propre uniquement.`:'Ton casier est vierge.',off:!G.strikes||(G.clean||0)<fine,fn:()=>{
    if(!G.strikes)return '« Votre casier est vierge, monsieur. Pour l’instant. »';
    if(!payClean(fine))return '« L’amende se règle par virement, en argent propre. Pas en billets froissés. »';
    G.strikes--;Sfx.cash();save();return `« Voilà, c’est réglé. Une ligne de moins dans votre dossier. » Casier : ${G.strikes}/${MAXSTRIKES}.`}});
  ch.push({label:`Glisser une enveloppe (${fmt(bribe)})`,desc:'Le brigadier oublie ta tête : chaleur à 0. Argent sale. Risqué.',off:G.cash<bribe||G.heat<1,fn:()=>{
    if(!payDirty(bribe))return '« Une enveloppe vide ? Très drôle. »';
    if(Math.random()<.2){G.heat=Math.min(100,G.heat+30);save();return '« Tentative de corruption d’un agent ?! » Il garde l’enveloppe ET appelle ses collègues. Chaleur +30.'}
    G.heat=0;Sfx.cash();save();return '« Je ne vous ai jamais vu. » L’enveloppe disparaît dans un tiroir.'}});
  ch.push({label:'Demander des nouvelles du quartier',fn:()=>pick([
    '« Les patrouilles tournent surtout la nuit. Et près des grands boulevards. »',
    '« On surveille les commerces qui encaissent trop de liquide. Laveries, kebabs… »',
    `« La chaleur dans le quartier ? ${G.heat>60?'Vous êtes dans tous nos rapports, monsieur.':G.heat>25?'Votre nom revient de temps en temps.':'Calme. Pour l’instant.'} »`,
    '« Le Nord, c’est la Vega. Le Sud, El Refe. Et nous au milieu, au centre-ville. »'])});
  ch.push({label:'Partir',close:1});
  openDialog(I.clerk.name+' · Accueil',I.T.col,{text:`Il lève les yeux de son écran. Casier : ${G.strikes}/${MAXSTRIKES}. Chaleur : ${Math.round(G.heat)} %.`,choices:ch},()=>{});
}
/* entrer au commissariat avec de la marchandise dans le sac : mauvaise idée */
{const o=enterShop;enterShop=function(s){o(s);
  if(s.type==='commissariat'&&bagTot()>0&&Math.random()<.35){G.heat=Math.min(100,G.heat+20);setTimeout(()=>toast('Le brigadier fixe ton sac un peu trop longtemps… Chaleur +20.','bad'),900)}};openShop=enterShop}
/* poursuivi par la police : pas question de se cacher au commissariat */
{const o=findTarget;findTarget=function(){o();if(tgt&&tgt.k==='hide'&&tgt.s.type==='commissariat')tgt={k:'info',label:'Te cacher au commissariat ? Mauvaise idée.'}}}

/* ---------- code de la route : feux, stops, giratoire, limitations, distances, piétons ---------- */
/* Les carrefours sont trouvés sur le graphe des routes. Avec une grande avenue : feux tricolores (deux axes qui alternent).
   Entre petites rues : stop (arrêt complet, puis on passe si c'est libre). Autour de la place : giratoire (on cède le passage à ceux qui tournent).
   Limitations : 50 km/h sur les avenues, 40 km/h dans les rues, 30 km/h dans les Jardins et à La Butte.
   Les voitures gardent leurs distances, s'arrêtent pour les piétons sur la chaussée, et la police note les feux rouges grillés. */
const INTER=[],IGRID=new Map(),IG=40;
const igKey=(x,z)=>Math.floor((x+640)/IG)+','+Math.floor((z+640)/IG);
(function(){
  const J=[];
  for(const n of RN)for(const m of n.adj){const o=NODES[m];if(o&&o.r!==n.r){J.push(n);break}}
  for(const n of J){
    let c=INTER.find(I=>Math.hypot(I.sx/I.n-n.x,I.sz/I.n-n.z)<18);
    if(!c){c={sx:0,sz:0,n:0,nodes:[],roads:new Set()};INTER.push(c)}
    c.sx+=n.x;c.sz+=n.z;c.n++;c.nodes.push(n);c.roads.add(n.r);
  }
  INTER.forEach((I,id)=>{
    I.id=id;I.x=I.sx/I.n;I.z=I.sz/I.n;
    const rs=[...I.roads].map(r=>ROADS[r]);
    I.R=Math.max(...rs.map(r=>r.w))/2+2.5;
    const ring=rs.some(r=>r.closed),major=rs.some(r=>r.major&&!r.closed);
    I.type=ring?'round':major?'light':'stop';
    // branches : directions des routes qui partent du carrefour
    const arms=[];
    for(const n of I.nodes)for(const m of n.adj){const o=NODES[m];if(!o||I.nodes.includes(o))continue;if(Math.hypot(o.x-I.x,o.z-I.z)<Math.hypot(n.x-I.x,n.z-I.z))continue;const dx=o.x-n.x,dz=o.z-n.z,l=Math.hypot(dx,dz);if(l<1)continue;
      const a=Math.atan2(dx/l,dz/l);if(arms.some(b=>Math.abs(Math.atan2(Math.sin(a-b.a),Math.cos(a-b.a)))<.45))continue;
      arms.push({a,ux:dx/l,uz:dz/l,w:ROADS[o.r].w,ring:ROADS[o.r].closed})}
    I.arms=arms;I.ax=arms.length?arms[0].a:0;
    I.off=((Math.abs(I.x)*7+Math.abs(I.z)*3)%22);
    const k=igKey(I.x,I.z);if(!IGRID.has(k))IGRID.set(k,[]);IGRID.get(k).push(I);
  });
})();
let TL_T=0;
const axisOf=(I,x,z)=>{const a=Math.atan2(x-I.x,z-I.z);return Math.abs(Math.cos(a-I.ax))>=.7071?0:1};
function lightState(I,ax){const t=(TL_T+I.off)%22;if(ax===0)return t<8?'g':t<10?'y':'r';return t>=11&&t<19?'g':t>=19&&t<21?'y':'r'}
/* le prochain carrefour devant un véhicule */
function interAhead(e){
  const hx=Math.sin(e.th),hz=Math.cos(e.th);let best=null,bf=1e9;
  for(const [ox,oz] of [[0,0],[hx*IG*.6,hz*IG*.6]]){const ci=Math.floor((e.x+ox+640)/IG),cj=Math.floor((e.z+oz+640)/IG);
    for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)for(const I of IGRID.get((ci+a)+','+(cj+b))||[]){
      const dx=I.x-e.x,dz=I.z-e.z,fwd=dx*hx+dz*hz,lat=Math.abs(dx*hz-dz*hx);
      if(fwd<-2||fwd>45||lat>I.R+5)continue;if(fwd<bf){bf=fwd;best=I}}}
  return best?{I:best,fwd:bf}:null;
}
const brakeV=d=>Math.sqrt(2*4.5*Math.max(0,d)); // vitesse qui permet de s'arrêter dans la distance d
const VEHS=()=>traffic.concat(cops,gangs||[],couriers||[]);
/* personne ne roule dans le carrefour (sauf ceux qui attendent à leur ligne) */
function interClear(I,e){
  const list=VEHS();if(P.def.kind!=='foot')list.push(P);
  for(const o of list){if(o===e)continue;const d=Math.hypot(o.x-I.x,o.z-I.z),v=Math.abs(o.v||Math.hypot(o.vx||0,o.vz||0));
    if(d<I.R+1&&v>.5)return false;
    if(d<I.R+10&&v>3&&o.go===I.id)return false;
    if(I.type==='round'&&d<I.R+14&&v>2&&o.onRing)return false}
  return true;
}
/* vitesse permise par le carrefour devant (null = rien à respecter) */
function interRule(e,dt){
  const A=interAhead(e);if(!A){e.wait=null;return null}
  const I=A.I,d=A.fwd-(I.R+6);
  if(e.go===I.id)return null;
  if(d<-1){e.go=I.id;return null}
  if(I.type==='round'&&e.onRing)return null;
  if(I.type==='light'){
    const s=lightState(I,axisOf(I,e.x,e.z));
    if(s==='g'){if(d<3)e.go=I.id;return null}
    if(s==='y'&&d<e.v*.8){e.go=I.id;return null}
    return brakeV(d-1.2);
  }
  // stop (arrêt complet) ou giratoire (cédez le passage)
  if(!e.wait||e.wait.id!==I.id)e.wait={id:I.id,t:0};
  if(d>2.5)return Math.max(I.type==='round'?4:2,brakeV(d-1));
  if(I.type==='stop'&&e.v>1){return 0}
  e.wait.t+=dt;
  if((I.type==='round'||e.wait.t>.9)&&interClear(I,e)||e.wait.t>7){e.go=I.id;e.wait=null;return null}
  return 0;
}
/* limitations de vitesse (m/s) */
function speedLimit(e){
  const n=nearestNode(e.x,e.z);if(!n)return 14;const r=ROADS[n.r];e.onRing=r.closed;
  if(r.closed)return 9;
  const dk=districtAt(e.x,e.z).key;
  if(dk==='cite'||dk==='butte')return r.major?11:8.5;
  return r.major?14:11;
}
updTraffic=function(dt,fx,fz,obst){
  TL_T+=dt;
  let tries=0;
  while(traffic.length<TRAFN&&tries++<4){
    const p=randRoadPoint(fx,fz,150,340);
    const bus=Math.random()<.08,e=mkAI(bus?{k:'bus',c:pick([0x2f6fb0,0xd8c23a,0x3a9a5a])}:{k:pick(CARK),c:pick(CARCOLS)},p.x,p.z,0,bus?3:2.0);
    e.civ=1;e.base=bus?R(9,11):R(11.5,14.5);e.sp=e.base;
    newRoute(e);
    if(e.path.length)e.th=Math.atan2(e.path[0][0]-e.x,e.path[0][1]-e.z);
    if(Math.hypot(e.x-fx,e.z-fz)<130)continue;
    traffic.push(e);
  }
  for(let i=traffic.length-1;i>=0;i--){
    const e=traffic[i];
    if(Math.hypot(e.x-fx,e.z-fz)>430){traffic.splice(i,1);continue}
    if(!e.path.length)newRoute(e);
    if(!e.base)e.base=e.sp||12;
    const hx=Math.sin(e.th),hz=Math.cos(e.th);
    // distance au véhicule (ou au joueur) devant
    let gap=1e9;
    for(const o of obst){if(o===e)continue;const dx=o.x-e.x,dz=o.z-e.z,fwd=dx*hx+dz*hz;if(fwd<=0||fwd>40)continue;if(Math.abs(dx*hz-dz*hx)<2.9)gap=Math.min(gap,fwd)}
    // piétons sur la chaussée devant : on s'arrête
    for(const p of peds){if(p.ko>0)continue;const dx=p.x-e.x,dz=p.z-e.z,fwd=dx*hx+dz*hz;if(fwd<=0||fwd>16)continue;if(Math.abs(dx*hz-dz*hx)<2.6&&maskAt(p.x,p.z)===1)gap=Math.min(gap,fwd+1.5)}
    let vt=Math.min(e.base,speedLimit(e));
    vt=Math.min(vt,brakeV(gap-6.5));
    const blockedByCar=vt<.5;
    const r=interRule(e,dt);if(r!=null)vt=Math.min(vt,r);
    // jamais bloqué pour toujours (sauf à un feu rouge ou un stop, où on attend son tour)
    e.stuck=blockedByCar&&(r==null||r>.5)?(e.stuck||0)+dt:0;if(e.stuck>9){vt=6;if(e.stuck>12)e.stuck=0}
    e.sp=vt;
    if(vt<e.v)e.v=Math.max(vt,e.v-9*dt); // freinage franc
    followPath(e,dt,vt);
    e.brk=vt<e.v-1||vt<.5&&e.v>.3;
  }
};
/* feu rouge grillé par le joueur sous les yeux d'une patrouille */
let RLW={id:-1,d:0,cd:0};
function checkRedLight(dt){
  RLW.cd=Math.max(0,RLW.cd-dt);
  if(!started||paused()||P.def.kind==='foot'||Math.abs(P.v)<6){RLW.id=-1;return}
  const A=interAhead(P);if(!A||A.I.type!=='light'){RLW.id=-1;return}
  const I=A.I,d=A.fwd-(I.R+6);
  if(RLW.id===I.id&&RLW.d>0&&d<=0&&lightState(I,axisOf(I,P.x,P.z))==='r'&&RLW.cd<=0){
    RLW.cd=8;
    if(cops.some(c=>c.calm&&Math.hypot(c.x-P.x,c.z-P.z)<80)||FCOPS.some(c=>Math.hypot(c.x-P.x,c.z-P.z)<40)){G.heat=Math.min(100,G.heat+12);toast('Feu rouge grillé sous les yeux d’une patrouille ! Chaleur +12.','bad')}
    else if(Math.random()<.5)toast('Feu rouge grillé…');
  }
  RLW.id=I.id;RLW.d=d;
}
{const o=updStory;updStory=function(dt){o(dt);checkRedLight(dt)}}
/* dessin : lignes d'arrêt, feux, panneaux stop, cédez-le-passage */
function drawSignals(){
  const night=TOD.n>.35;
  for(const I of INTER){if(!inView(I.x,I.z,I.R+12))continue;
    for(const A of I.arms){
      if(I.type==='round'&&A.ring)continue;
      const hw=A.w/2,R0=I.R+6,rx=A.uz,rz=-A.ux; // à droite pour qui arrive par cette branche
      const sx=I.x+A.ux*R0,sz=I.z+A.uz*R0;
      // ligne d'arrêt sur la voie qui arrive
      ctx.strokeStyle='rgba(240,236,226,.85)';ctx.lineWidth=I.type==='round'?.3:.6;if(I.type==='round')ctx.setLineDash([.8,.8]);
      ctx.beginPath();ctx.moveTo(sx,sz);ctx.lineTo(sx+rx*(hw-.6),sz+rz*(hw-.6));ctx.stroke();ctx.setLineDash([]);
      const px=sx+rx*(hw+1.3)+A.ux*.6,pz=sz+rz*(hw+1.3)+A.uz*.6;
      if(I.type==='light'){
        const s=lightState(I,axisOf(I,I.x+A.ux*10,I.z+A.uz*10)),c=s==='g'?'#3fd06a':s==='y'?'#f2c230':'#ff3b2f';
        ctx.fillStyle='#1d1f22';ctx.beginPath();ctx.arc(px,pz,.95,0,6.3);ctx.fill();
        if(night){ctx.fillStyle=c+'55';ctx.beginPath();ctx.arc(px,pz,2.2,0,6.3);ctx.fill()}
        ctx.fillStyle=c;ctx.beginPath();ctx.arc(px,pz,.62,0,6.3);ctx.fill();
      }else if(I.type==='stop'){
        ctx.fillStyle='#c62a22';ctx.beginPath();for(let k=0;k<8;k++){const a=k/8*6.283+.39;ctx.lineTo(px+Math.cos(a)*.95,pz+Math.sin(a)*.95)}ctx.closePath();ctx.fill();
        ctx.strokeStyle='#fff';ctx.lineWidth=.12;ctx.stroke();
      }else{
        ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(px+A.ux*.9,pz+A.uz*.9);ctx.lineTo(px-A.ux*.6+rx*.8,pz-A.uz*.6+rz*.8);ctx.lineTo(px-A.ux*.6-rx*.8,pz-A.uz*.6-rz*.8);ctx.closePath();ctx.fill();
        ctx.strokeStyle='#c62a22';ctx.lineWidth=.22;ctx.stroke();
      }
    }
  }
}
{const _dg=drawGround;drawGround=function(now){_dg(now);drawSignals()}}
if(/[?&]debug=1\b/.test(location.search))window.__rules={INTER,lightState,interAhead,get T(){return TL_T},traffic:()=>traffic};

/* ---------- plus de vie : passages piétons, chiens promenés, enseignes des boutiques ---------- */
/* passages piétons : de part et d'autre de chaque carrefour */
const CROSS=[];
(function(){
  const near=(r,x,z)=>CROSS.some(c=>Math.hypot(c.x-x,c.z-z)<(c.r===r?20:9));
  for(const n of RN){
    const R0=ROADS[n.r];if(!R0||R0.closed&&R0.pts.length>60)continue;
    for(const mid of n.adj){const m=NODES[mid];if(!m||m.r===n.r)continue;
      const wo=ROADS[m.r].w,s0=R0.cum[n.k];
      for(const sg of [-1,1]){const s=s0+sg*(wo/2+3.2);if(!R0.closed&&(s<4||s>R0.len-4))continue;
        const q=roadPos(n.r,s,0);if(maskAt(q[0],q[1])!==1||near(n.r,q[0],q[1]))continue;
        // pas sur l'autre route ni dans le carrefour lui-même
        if(Math.hypot(q[0]-m.x,q[1]-m.z)<wo/2+1.5)continue;
        CROSS.push({r:n.r,x:q[0],z:q[1],a:Math.atan2(q[3],q[2]),w:R0.w})}}
  }
})();
function drawCrosswalks(){
  ctx.fillStyle='rgba(236,232,222,.78)';
  for(const c of CROSS){if(!inView(c.x,c.z,c.w))continue;
    ctx.save();ctx.translate(c.x,c.z);ctx.rotate(c.a);
    for(let y=-c.w/2+1;y<c.w/2-.6;y+=1.25)ctx.fillRect(-1.5,y,3,.62);
    ctx.restore()}
}
{const _dg=drawGround;drawGround=function(now){_dg(now);drawCrosswalks()}}
/* chiens promenés par certains passants */
const DOGC=['#c9a05a','#3a2a1c','#f1ece2','#8a6a48','#222222','#b5651d'];
function drawDogs(t){
  for(const p of peds){
    if(p.dog===undefined){p.dog=Math.random()<.13;p.dogc=pick(DOGC);p.dsz=R(.75,1.15)}
    if(!p.dog||p.ko>0||!inView(p.x,p.z,6))continue;
    const fx=Math.sin(p.th),fz=Math.cos(p.th),moving=(p.hold>0?0:p.sp)>.3,wig=Math.sin((p.ph||0)*2.2+t*3)*(moving?.35:.15);
    const dx=p.x+fx*1.9-fz*(.9+wig),dz=p.z+fz*1.9+fx*(.9+wig),sc=p.dsz;
    // laisse
    ctx.strokeStyle='rgba(30,25,20,.7)';ctx.lineWidth=.07;ctx.beginPath();ctx.moveTo(p.x+fz*.5,p.z-fx*.5);ctx.quadraticCurveTo((p.x+dx)/2,(p.z+dz)/2+.3,dx,dz);ctx.stroke();
    ctx.save();ctx.translate(dx,dz);ctx.rotate(Math.PI/2-p.th);ctx.scale(sc,sc);
    ctx.fillStyle=`rgba(0,0,0,${TOD.sa*.7})`;ctx.beginPath();ctx.ellipse(.15,.12,.62,.3,0,0,6.3);ctx.fill();
    const lg=moving?Math.sin(t*12+(p.ph||0))*.12:0;
    ctx.fillStyle=p.dogc;
    for(const [lx,ly,ph] of [[.32,-.18,1],[.32,.18,-1],[-.32,-.18,-1],[-.32,.18,1]]){ctx.fillRect(lx+lg*ph-.05,ly-.05,.1,.1)}
    el(ctx,0,0,.5,.24,p.dogc);el(ctx,.52,0,.2,.17,p.dogc);el(ctx,.62,-.12,.08,.05,shade(hexn(p.dogc),.6));el(ctx,.62,.12,.08,.05,shade(hexn(p.dogc),.6));
    ctx.strokeStyle=p.dogc;ctx.lineWidth=.08;ctx.beginPath();ctx.moveTo(-.48,0);ctx.lineTo(-.72,Math.sin(t*9)*.15);ctx.stroke();
    ctx.restore();
  }
}
/* enseignes lumineuses devant chaque boutique (en néon la nuit) */
{const _sf=drawShopFront;drawShopFront=function(s,now){
  _sf(s,now);const T=SHOPTYPES[s.type],nx=s.ax==='x'?s.sg:0,nz=s.ax==='z'?s.sg:0,sx=s.x+nx*1.8,sz=s.z+nz*1.8,night=TOD.n>.35;
  const txt=T.short.toUpperCase();ctx.font='700 1.15px "Bowlby One",Impact,sans-serif';ctx.textAlign='center';
  const w=ctx.measureText(txt).width+.9;
  ctx.fillStyle='rgba(18,14,12,.86)';rr(ctx,sx-w/2,sz-.95,w,1.45,.3);ctx.fill();
  if(night){ctx.save();ctx.shadowColor=T.col;ctx.shadowBlur=16;ctx.fillStyle=T.col;ctx.fillText(txt,sx,sz+.2);ctx.restore()}
  else{ctx.fillStyle=T.col;ctx.fillText(txt,sx,sz+.2)}
}}


/* ---------- boucle ---------- */
/* une étape de simulation (sans dessin) */
function simStep(real,dt){
  economy(real);
  let near=9999;
  if(INT){if(!paused())updInterior(dt)}
  else if(!paused()){
    if(HIDE){HIDE.t+=dt;P.vx=P.vz=P.v=0}else if(P.def.kind==='foot')updFoot(dt);else updPlayer(dt);
    updCombat(dt);updPlace();
    updOrders(dt);updCops(dt);updGangs(dt);
    if(!ended){
      updCouriers(dt);updMission(dt);updMeeting(dt);updDelivery(dt);
      updTraffic(dt,P.x,P.z,[P].concat(traffic,cops,gangs,couriers));updPeds(dt,P.x,P.z);if(!HIDE&&!inLab())bumps(dt);
      updPigeons(dt);
      if(!threat)G.hp=Math.min(100,G.hp+1.2*dt);
      near=cops.reduce((m,c)=>c.calm?m:Math.min(m,Math.hypot(c.x-P.x,c.z-P.z)),1e9);
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
  const near=simStep(real,dt);updStory(dt);
  updFx(real);if(CINE)updCine(real);else if(INT)intCamera(dt);else updCamera(dt);hud(dt);render(now);
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
  step:sec=>{for(let t=0;t<sec;t+=.05){mpUpdate(.05);simStep(.05,.05);updStory(.05);updFx(.05);if(CINE)updCine(.05);else updCamera(.05)}hud(0)},
  story:{get S(){return G.story},get SPOT(){return SPOT},get CINE(){return CINE},get INT(){return INT},endCine,cineNext,talkRefe,readPhone,PHONE,Q,get cops(){return cops},startMeeting,askChoice,npc:npcById,get FIGHTERS(){return FIGHTERS},get FCOPS(){return FCOPS},talkPed,enterShop,exitShop,intAct,intTarget,get SNPC(){return SNPC},BIZS:()=>BIZS,bizAct,nextQuest,get ZONE(){return ZONE},CROSS}};
$('start').hidden=false;lobbyInit();
requestAnimationFrame(frame);
