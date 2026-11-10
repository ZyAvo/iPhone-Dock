// mon-ecran-version: eb7b2d9c
/* QM27 (v83, lot 2 : v84, lot 3 : v85) — données du jeu : nations, clubs, banques de noms, balais, commentaires, équilibrage.
   Tout est inventé (clubs, joueurs, balais) ; seul le vocabulaire du sport est gardé. Pas d'affichage ici : window.QMD.
   Ajouter une nation : une entrée dans NATIONS (+ ses noms dans NOMS), ses clubs dans CLUBS avec une ligue de LIGUES. */
(function(root){
'use strict';

const NATIONS = {
  ENG:{nom:'Angleterre', court:'ANG', drapeau:'🏴󠁧󠁢󠁥󠁮󠁧󠁿'},
  SCO:{nom:'Écosse', court:'ÉCO', drapeau:'🏴󠁧󠁢󠁳󠁣󠁴󠁿'},
  WAL:{nom:'Pays de Galles', court:'GAL', drapeau:'🏴󠁧󠁢󠁷󠁬󠁳󠁿'},
  IRL:{nom:'Irlande', court:'IRL', drapeau:'🇮🇪'},
  FRA:{nom:'France', court:'FRA', drapeau:'🇫🇷'},
  ITA:{nom:'Italie', court:'ITA', drapeau:'🇮🇹'},
};
const SIX_NATIONS = ['ENG', 'FRA', 'IRL', 'ITA', 'SCO', 'WAL'];

const LIGUES = [
  {id:'bi', nom:'Ligue britannique et irlandaise', court:'Ligue B&I'},
  {id:'fr', nom:'Ligue de France', court:'Ligue FR'},
  {id:'it', nom:"Ligue d'Italie", court:'Ligue IT'},
];

/* [id, nom, ville, nation, ligue, réputation 1-100, couleur 1, couleur 2, capacité du stade] */
const CLUBS = [
  ['bath', 'Bath Basilisks', 'Bath', 'ENG', 'bi', 70, '#2f6b3f', '#e9d58b', 18000],
  ['york', 'York Wyverns', 'York', 'ENG', 'bi', 74, '#7a1f2b', '#f1e6d0', 22000],
  ['canterbury', 'Canterbury Conjurers', 'Canterbury', 'ENG', 'bi', 66, '#3b2f73', '#d9c46a', 16000],
  ['glastonbury', 'Glastonbury Grimoires', 'Glastonbury', 'ENG', 'bi', 52, '#5b3a21', '#c9a96e', 9000],
  ['whitby', 'Whitby Warlocks', 'Whitby', 'ENG', 'bi', 48, '#1d1d24', '#b7b7c4', 8000],
  ['norwich', 'Norwich Nightshades', 'Norwich', 'ENG', 'bi', 58, '#4b2a5e', '#9ad08f', 14000],
  ['oxford', 'Oxford Oracles', 'Oxford', 'ENG', 'bi', 82, '#13294b', '#c8a24b', 30000],
  ['inverness', 'Inverness Kelpies', 'Inverness', 'SCO', 'bi', 64, '#0f4c5c', '#e3e8ea', 15000],
  ['aberdeen', 'Aberdeen Alchemists', 'Aberdeen', 'SCO', 'bi', 72, '#8c1c13', '#f2c14e', 21000],
  ['stirling', 'Stirling Selkies', 'Stirling', 'SCO', 'bi', 50, '#3d5a80', '#e0fbfc', 9000],
  ['conwy', 'Conwy Cauldrons', 'Conwy', 'WAL', 'bi', 46, '#2b2d42', '#ef8354', 7500],
  ['swansea', 'Swansea Sorcerers', 'Swansea', 'WAL', 'bi', 68, '#0b3d2e', '#f4f1de', 19000],
  ['aberystwyth', 'Aberystwyth Augurs', 'Aberystwyth', 'WAL', 'bi', 44, '#6d597a', '#eaac8b', 7000],
  ['galway', 'Galway Banshees', 'Galway', 'IRL', 'bi', 60, '#3a0ca3', '#f7f7f7', 14000],
  ['cork', 'Cork Cloakwings', 'Cork', 'IRL', 'bi', 62, '#9d0208', '#1b1b1e', 15000],
  ['dublin', 'Dublin Druids', 'Dublin', 'IRL', 'bi', 80, '#1b5e20', '#f9d71c', 28000],
  ['rennes', 'Enchanteurs de Rennes', 'Rennes', 'FRA', 'fr', 64, '#b1001c', '#141414', 16000],
  ['paris', 'Gargouilles de Paris', 'Paris', 'FRA', 'fr', 85, '#14213d', '#c0c0c8', 32000],
  ['lyon', 'Mages de Lyon', 'Lyon', 'FRA', 'fr', 78, '#283593', '#e53935', 27000],
  ['carcassonne', 'Sorcières de Carcassonne', 'Carcassonne', 'FRA', 'fr', 46, '#6a1b4d', '#f2cc8f', 8000],
  ['nantes', 'Faucons de Nantes', 'Nantes', 'FRA', 'fr', 62, '#f4d35e', '#1f6f50', 17000],
  ['strasbourg', 'Hiboux de Strasbourg', 'Strasbourg', 'FRA', 'fr', 58, '#1e5aa8', '#f2f2f2', 15000],
  ['besancon', 'Vouivres de Besançon', 'Besançon', 'FRA', 'fr', 44, '#2e7d32', '#ffd166', 7000],
  ['brest', 'Korrigans de Brest', 'Brest', 'FRA', 'fr', 50, '#d00000', '#f7f7f2', 9500],
  ['toulouse', 'Farfadets de Toulouse', 'Toulouse', 'FRA', 'fr', 70, '#5e2b97', '#ffffff', 22000],
  ['bordeaux', 'Spectres de Bordeaux', 'Bordeaux', 'FRA', 'fr', 66, '#1c1c3c', '#e5e5e5', 19000],
  ['marseille', 'Sirènes de Marseille', 'Marseille', 'FRA', 'fr', 74, '#00a6d6', '#ffffff', 26000],
  ['poitiers', 'Mélusines de Poitiers', 'Poitiers', 'FRA', 'fr', 52, '#0b6e4f', '#d4af37', 10000],
  ['lille', 'Comètes de Lille', 'Lille', 'FRA', 'fr', 60, '#c1121f', '#fdf0d5', 16000],
  ['montpellier', 'Mandragores de Montpellier', 'Montpellier', 'FRA', 'fr', 56, '#ff6f00', '#1a2a6c', 13000],
  ['reims', 'Licornes de Reims', 'Reims', 'FRA', 'fr', 48, '#e8e8e8', '#b00020', 9000],
  ['grenoble', 'Sortilèges de Grenoble', 'Grenoble', 'FRA', 'fr', 54, '#264653', '#e9c46a', 11000],
  ['benevento', 'Streghe di Benevento', 'Benevento', 'ITA', 'it', 44, '#3c1642', '#e0c3fc', 7000],
  ['perugia', 'Grifoni di Perugia', 'Perugia', 'ITA', 'it', 48, '#a4161a', '#f5f3f4', 9000],
  ['venezia', 'Fenici di Venezia', 'Venezia', 'ITA', 'it', 66, '#e85d04', '#03071e', 17000],
  ['milano', 'Biscioni di Milano', 'Milano', 'ITA', 'it', 84, '#0c3b2e', '#ffba00', 31000],
  ['torino', 'Talismani di Torino', 'Torino', 'ITA', 'it', 76, '#6a040f', '#f1faee', 25000],
  ['arezzo', 'Chimere di Arezzo', 'Arezzo', 'ITA', 'it', 42, '#9c6644', '#ede0d4', 6500],
  ['napoli', 'Sibille di Napoli', 'Napoli', 'ITA', 'it', 72, '#0077b6', '#caf0f8', 24000],
  ['roma', 'Aruspici di Roma', 'Roma', 'ITA', 'it', 82, '#7b2cbf', '#ffd60a', 30000],
  ['firenze', 'Astrologi di Firenze', 'Firenze', 'ITA', 'it', 68, '#4a148c', '#b388ff', 19000],
  ['palermo', 'Gorgoni di Palermo', 'Palermo', 'ITA', 'it', 56, '#f6aa1c', '#941b0c', 13000],
  ['bologna', 'Folletti di Bologna', 'Bologna', 'ITA', 'it', 62, '#ae2012', '#001219', 16000],
  ['genova', 'Lanterne di Genova', 'Genova', 'ITA', 'it', 58, '#023e8a', '#ffb703', 15000],
  ['verona', 'Incantatori di Verona', 'Verona', 'ITA', 'it', 54, '#3a86ff', '#ffbe0b', 12000],
  ['trieste', 'Spiriti di Trieste', 'Trieste', 'ITA', 'it', 50, '#adb5bd', '#212529', 10000],
  ['bari', 'Draghi di Bari', 'Bari', 'ITA', 'it', 52, '#d62828', '#003049', 12000],
  ['bergamo', 'Befane di Bergamo', 'Bergamo', 'ITA', 'it', 46, '#283618', '#dda15e', 8500],
];

/* Origine des joueurs d'un club selon sa nation : [nation, poids] */
const ORIGINES = {
  ENG:[['ENG', 70], ['SCO', 8], ['WAL', 8], ['IRL', 7], ['FRA', 4], ['ITA', 3]],
  SCO:[['SCO', 65], ['ENG', 15], ['IRL', 8], ['WAL', 6], ['FRA', 3], ['ITA', 3]],
  WAL:[['WAL', 65], ['ENG', 15], ['SCO', 7], ['IRL', 7], ['FRA', 3], ['ITA', 3]],
  IRL:[['IRL', 68], ['ENG', 12], ['SCO', 8], ['WAL', 6], ['FRA', 3], ['ITA', 3]],
  FRA:[['FRA', 85], ['ITA', 5], ['ENG', 3], ['IRL', 3], ['SCO', 2], ['WAL', 2]],
  ITA:[['ITA', 85], ['FRA', 6], ['ENG', 3], ['IRL', 2], ['SCO', 2], ['WAL', 2]],
};

/* Banques de noms (courants et réels, jamais ceux d'un personnage connu de l'univers d'origine) */
const NOMS = {
  ENG:{p:['James','Thomas','Oliver','Jack','Samuel','Daniel','Joseph','Matthew','Luke','Ethan','Callum','Ryan','Adam','Ben','Henry','Edward','Lewis','Toby','Alfie','Archie','Emily','Sophie','Charlotte','Amelia','Grace','Lucy','Hannah','Ellie','Megan','Chloe','Isabel','Rosie','Abigail','Freya','Holly','Jessica','Lauren','Phoebe','Martha','Imogen'],
       n:['Ashworth','Barlow','Bentley','Blackwell','Bradshaw','Brook','Cartwright','Clayton','Cooke','Crossley','Dawson','Denton','Ellison','Fairley','Fletcher','Foster','Garside','Gould','Hadley','Hargreaves','Hartley','Hewitt','Holloway','Hopkins','Kendall','Lambert','Langley','Lowe','Marsh','Mercer','Middleton','Norris','Oakley','Parsons','Pickering','Prescott','Radcliffe','Rowley','Sheridan','Shaw','Simmonds','Stanton','Thornton','Townsend','Walsh','Warren','Whitaker','Winslow','Yates','Hastings']},
  SCO:{p:['Callum','Euan','Fraser','Hamish','Angus','Ross','Lachlan','Calum','Duncan','Alasdair','Ewan','Gregor','Malcolm','Rory','Struan','Kirsty','Isla','Eilidh','Morag','Fiona','Ailsa','Catriona','Mhairi','Skye','Iona','Shona','Heather','Rhona','Kenzie','Elspeth'],
       n:['MacLeod','Campbell','Fraser','Murray','Sinclair','Buchanan','Drummond','Ferguson','Gillespie','Graham','Henderson','Kerr','Lindsay','MacAulay','MacIntyre','MacKenzie','MacNeil','Munro','Ogilvy','Paterson','Ramsay','Robertson','Ross','Sutherland','Urquhart','Wallace','Cameron','Grant','Abernethy','Dunbar']},
  WAL:{p:['Rhys','Dylan','Gethin','Iwan','Owain','Gareth','Dafydd','Emyr','Huw','Aled','Tomos','Cai','Ieuan','Rhodri','Sion','Cerys','Ffion','Seren','Lowri','Nia','Carys','Bethan','Eleri','Gwen','Mali','Elin','Megan','Angharad','Tegan','Rhiannon'],
       n:['Llewellyn','Pritchard','Bowen','Griffiths','Howells','Jenkins','Lloyd','Meredith','Morgan','Parry','Powell','Price','Pugh','Rees','Roberts','Thomas','Vaughan','Watkins','Hughes','Evans','Owen','Prosser','Probert','Gwynne','Bevan','Cadwallader','Maddock','Pryce','Rowlands','Tudor']},
  IRL:{p:['Cian','Darragh','Eoin','Fionn','Oisín','Ronan','Seán','Tadhg','Niall','Cathal','Ciarán','Diarmuid','Colm','Liam','Pádraig','Aoife','Ciara','Niamh','Saoirse','Róisín','Clodagh','Orla','Siobhán','Caoimhe','Áine','Gráinne','Maeve','Sorcha','Éabha','Muireann'],
       n:['Brennan','Byrne','Callaghan','Daly','Doherty','Dunne','Fitzgerald','Gallagher','Healy','Hennessy','Kavanagh','Keane','Kennedy','Madden','McCarthy','McGrath','Nolan','O\'Brien','O\'Connell','O\'Donnell','O\'Neill','O\'Sullivan','Power','Quinlan','Regan','Sheehan','Tierney','Whelan','Cullen','Delaney']},
  FRA:{p:['Lucas','Hugo','Louis','Gabriel','Arthur','Jules','Raphaël','Théo','Nathan','Maxime','Antoine','Baptiste','Clément','Romain','Quentin','Mathis','Victor','Bastien','Adrien','Paul','Léa','Chloé','Manon','Camille','Inès','Jade','Louise','Zoé','Clara','Juliette','Margaux','Élise','Romane','Anaïs','Lucie','Pauline','Mathilde','Agathe','Salomé','Eva'],
       n:['Aubert','Barbier','Bertrand','Blanchard','Boyer','Brunet','Carpentier','Chevalier','Clément','Colin','Delmas','Deschamps','Duval','Fabre','Faure','Fournier','Gaillard','Garnier','Guérin','Hamon','Jacquet','Joly','Lacroix','Lambert','Laurent','Leclerc','Lefèvre','Lemaire','Lenoir','Marchand','Masson','Mercier','Meunier','Moulin','Noël','Perrin','Picard','Poirier','Renard','Rey','Roche','Roussel','Roux','Sabatier','Tessier','Vasseur','Vidal','Vincent','Arnal','Cabrol']},
  ITA:{p:['Lorenzo','Matteo','Leonardo','Alessandro','Francesco','Andrea','Riccardo','Tommaso','Gabriele','Davide','Federico','Simone','Pietro','Marco','Luca','Giulia','Sofia','Aurora','Alice','Ginevra','Chiara','Martina','Beatrice','Francesca','Elena','Sara','Vittoria','Noemi','Camilla','Bianca'],
       n:['Bianchi','Romano','Colombo','Ricci','Marino','Greco','Bruno','Gallo','Conti','De Luca','Mancini','Costa','Giordano','Rizzo','Lombardi','Moretti','Barbieri','Fontana','Santoro','Mariani','Rinaldi','Caruso','Ferrara','Galli','Martini','Leone','Longo','Gentile','Martinelli','Vitale','Serra','Coppola','De Santis','Fabbri','Bellini','Ferri','Pellegrini','Palumbo','Sanna','Orlando']},
};

/* Attributs (1 à 20) : [clé, nom, famille] ; poids par poste : ● = 3 (cible), ○ = 1 (utile) — P poursuiveur, B batteur, A attrapeur, G gardien */
const ATTRS = [
  ['vit','Vitesse','Physique','○○● '], ['acc','Accélération','Physique','●○●○'], ['end','Endurance','Physique','○○○○'], ['for','Force','Physique','○● ○'],
  ['agi','Agilité','Physique','○○●●'], ['ref','Réflexes','Physique',' ○●●'], ['acu','Acuité visuelle','Physique',' ○●○'], ['res','Résistance aux chocs','Physique','○●○○'],
  ['pil','Pilotage','Vol','○○●○'], ['vir','Virages serrés','Vol','○ ● '], ['piq','Piqué','Vol','  ● '], ['equ','Équilibre sur balai','Vol','○●○●'], ['frm','Vol en formation','Vol','●○  '],
  ['pas','Passe','Balle','●   '], ['rec','Réception','Balle','●  ○'], ['tir','Tir','Balle','●   '], ['pre','Précision','Balle','●●  '], ['ctl','Contrôle du souaffle','Balle','●   '],
  ['int','Interception','Balle','○  ○'], ['bou','Bousculade','Balle','○○  '], ['fra','Frappe (batte)','Balle',' ●  '],
  ['vis','Vision du jeu','Mental','●○○○'], ['ant','Anticipation','Mental','○●○●'], ['pla','Placement','Mental','○●○●'], ['dec','Décisions','Mental','○○○○'],
  ['con','Concentration','Mental','○○●●'], ['san','Sang-froid','Mental','● ●○'], ['agr','Agressivité','Mental',' ●  '], ['cou','Courage','Mental',' ○○○'],
  ['equi','Travail d\'équipe','Mental','●○  '], ['det','Détermination','Mental','○○○○'],
];
const GARDIEN = [['arr','Arrêts'], ['cou_a','Couverture des anneaux'], ['sor','Sorties'], ['rel','Relance'], ['com','Commandement']];
const CACHES = [['pot','Potentiel'], ['reg','Régularité'], ['pro','Professionnalisme'], ['amb','Ambition'], ['frag','Fragilité'], ['gm','Matchs importants'], ['ada','Adaptabilité'], ['loy','Loyauté']];
const POSTES = {P:{nom:'Poursuiveur', pl:'Poursuiveurs', court:'P'}, B:{nom:'Batteur', pl:'Batteurs', court:'B'}, A:{nom:'Attrapeur', pl:'Attrapeurs', court:'A'}, G:{nom:'Gardien', pl:'Gardiens', court:'G'}};
/* Pic de forme par poste (âges) */
const PICS = {A:[23, 29], P:[25, 31], B:[26, 32], G:[27, 34]};

/* Balais inventés : vitesse, maniabilité, stabilité (1 à 10), prix */
const BALAIS = [
  {id:'zephyr', nom:'Zéphyr 2', vit:4, man:5, sta:6, prix:180},
  {id:'albatros', nom:'Albatros', vit:5, man:5, sta:7, prix:260},
  {id:'mistral', nom:'Mistral 3', vit:6, man:6, sta:5, prix:340},
  {id:'sirocco', nom:'Sirocco', vit:7, man:6, sta:6, prix:450},
  {id:'strix', nom:'Strix', vit:7, man:8, sta:6, prix:560},
  {id:'aquilon', nom:'Aquilon 7', vit:9, man:7, sta:7, prix:720},
];

/* Météo : poids selon le mois (0 = janvier) et effets */
const METEOS = {
  soleil:{nom:'Soleil', ico:'☀️'}, nuages:{nom:'Nuageux', ico:'⛅'}, pluie:{nom:'Pluie', ico:'🌧️'}, vent:{nom:'Vent fort', ico:'💨'},
  brouillard:{nom:'Brouillard', ico:'🌫️'}, orage:{nom:'Orage', ico:'⛈️'},
};
const METEO_MOIS = m => (m >= 4 && m <= 8) ? {soleil:45, nuages:30, pluie:12, vent:8, brouillard:2, orage:3}
  : (m === 11 || m <= 1) ? {soleil:12, nuages:30, pluie:28, vent:16, brouillard:11, orage:3} : {soleil:22, nuages:32, pluie:22, vent:14, brouillard:7, orage:3};

/* Blessures : [nom, jours min, jours max, poids] — de la contusion d'un jour à la fracture */
const BLESSURES = [
  ['Contusion à l\'épaule', 1, 4, 30], ['Doigts retournés par un cognard', 3, 10, 18], ['Entorse du poignet', 7, 18, 14], ['Côtes froissées', 10, 21, 10],
  ['Commotion légère (voit des vifs d\'or partout)', 7, 14, 9], ['Cheville tordue à l\'atterrissage', 6, 16, 9], ['Clavicule fêlée', 21, 42, 5], ['Fracture du bras', 35, 63, 3],
  ['Torticolis de piqué', 2, 6, 12], ['Brûlure d\'échardes de balai', 1, 3, 10],
];

/* Commentaires : {j} joueur, {c} son club, {a} l'adversaire, {g} gardien adverse, {s} score, {m} minute */
const TEXTES = {
  debut:['Coup d\'envoi ! Le souaffle est lancé et les quatorze joueurs décollent.', 'C\'est parti : les balais fendent l\'air sous les cris du public.', 'Le souaffle monte, les cognards sont lâchés : c\'est parti !'],
  but:['BUT pour {c} ! {j} trompe {g} : {s}.', '{j} enroule son tir dans l\'anneau de gauche. {s}.', 'Passe en triangle et {j} conclut sans trembler. {s}.', '{j} s\'arrache dans la défense et marque. {s}.', 'Quel tir de {j} ! {g} n\'a rien vu passer. {s}.', '{j} fait la feinte du piqué et loge le souaffle au centre. {s}.', 'Encore {j} ! {c} enchaîne. {s}.', 'Contre éclair de {c}, {j} finit l\'action. {s}.'],
  arret:['Superbe parade de {g} devant {j} !', '{g} se détend et repousse le tir de {j}.', '{j} s\'essaie de loin : {g} capte sans trembler.', '{g} sort au bon moment et coupe la trajectoire de {j}.', 'Arrêt réflexe de {g}, le public se lève !'],
  rate:['{j} vise trop haut, le souaffle file au-dessus des anneaux.', 'Tir précipité de {j}, à côté.', '{j} touche le cercle de l\'anneau ! Pas loin.'],
  cognard:['{j} frappe un cognard monstrueux : {a} perd le souaffle.', 'Cognard bien placé de {j}, l\'attaque adverse s\'écroule.', '{j} détourne la trajectoire d\'un poursuiveur adverse d\'un revers sec.', 'Le cognard de {j} siffle aux oreilles de {a}. Ballon perdu !'],
  cognard_att:['{j} envoie un cognard sur l\'attrapeur adverse, qui doit plonger pour l\'éviter.', 'L\'attrapeur adverse est sonné par un cognard de {j} !'],
  cognard_gar:['{j} vise les anneaux : le gardien adverse est bousculé.', 'Cognard sur le gardien adverse, signé {j}. Les anneaux sont exposés.'],
  blessure:['Aïe. {j} reste au sol après le choc : {b}.', '{j} grimace et se tient le bras… {b}.', 'Mauvaise nouvelle pour {c} : {j} est touché ({b}).'],
  faute:['Faute de {j} qui accroche le balai adverse : penalty !', 'Coup de coude de {j}, l\'arbitre siffle un penalty.', '{j} bloque le passage en croisant : penalty.'],
  faute_grave:['FAUTE GRAVE de {j} ! Charge dangereuse, l\'arbitre est furieux. Penalty.', '{j} percute volontairement un adversaire : faute grave et penalty.'],
  penalty_but:['Penalty transformé par {j}. {s}.', '{j} ne tremble pas sur le penalty. {s}.'],
  penalty_rate:['{g} arrête le penalty de {j} !', 'Penalty manqué par {j} !'],
  vif_apercu:['LE VIF D\'OR ! Une lueur dorée près des tribunes… les attrapeurs s\'élancent !', 'Le vif d\'or est apparu ! Les deux attrapeurs foncent en piqué.', 'Un éclat doré au-dessus du terrain : le vif d\'or est là !'],
  vif_cache:['Le vif d\'or disparaît derrière les tribunes. Les attrapeurs reprennent de l\'altitude.', 'Plus de trace du vif d\'or… il s\'est caché.'],
  vif_poursuite:['{j} est à deux mètres du vif d\'or !', 'Course poursuite folle : {j} tend le bras… raté !', '{j} frôle le vif d\'or en rase-mottes.'],
  vif_refus:['{j} tient le vif d\'or à portée mais retient son geste : l\'attraper ferait perdre {c}.', '{j} laisse filer le vif d\'or, {c} est trop loin au score.'],
  vif_attrape:['{j} ATTRAPE LE VIF D\'OR ! +150 pour {c}. Score final : {s}.', 'C\'est fini ! {j} referme la main sur le vif d\'or. {s}.', 'Piqué vertigineux et {j} s\'empare du vif d\'or ! {s}.'],
  temps_mort:['Temps mort demandé par {c}.'],
  remplacement:['Changement pour {c} : {j} entre à la place de {k}.'],
  fin_perdu:['{j} attrape le vif d\'or… mais {c} perd quand même ! {s}.'],
};

/* Équilibrage : tous les chiffres du moteur, à régler sans toucher au code (outils/dev/qm27-essai.mjs vérifie les moyennes) */
const EQ = {
  niveauMin:10, niveauMax:12.6,   // niveau moyen des titulaires (sur 20) du club le moins réputé (40) au plus réputé (85)
  points:{but:10, vif:150, victoire:3, nul:1},
  pas:15,                       // secondes de jeu par pas
  echelleTir:6,               // s dans P(tir) = 1 / (1 + e^(−(A − D) / s))
  baseTir:-0.7,                    // décalage de la sigmoïde
  baseBut:0.40, kBut:0.022, butMin:0.10, butMax:0.80,
  garde:0.55,                   // possession gardée après une action sans tir
  cognard:0.05, blessure:0.035, faute:0.004, fauteGrave:0.12, penalty:0.70,
  vifApparitionMin:20, vifApparitionMax:50, p0:0.00245, vifRef:13, vifCache:0.008, vifMaxMin:240,
  fatigue:0.09, domicile:1.05, jour:0.05,   // jour : forme du jour d'une équipe (écart type)
  refus:0.8,                    // attrapeur « seulement si ça fait gagner » : refuse la prise perdante (+ décisions)
  /* v84 : économie (euros fictifs). Salaire hebdomadaire = base × facteur^(note sur 20 − pivot) × (0,85 + réputation du club / 250) */
  eco:{semaines:44, salaireBase:2500, salaireFacteur:1.6, salairePivot:9, valeurAns:2.4,
       tv:1.3e6, tvRep:15e3, sponsors:0.2e6, sponsorsRep:3.0e6, merch:1.8e6, repasBase:3, entretien:1.2, deplacement:12e3, prime:25e3,
       masse:0.9, staffBase:600, staffFacteur:1.25, effectifMax:22, effectifMin:14, libresMax:60},
  /* v84 : entraînement (progression par semaine) et cohésion */
  ent:{semaines:40, focus:1.7, horsFocus:0.55, cible:1.3, autre:0.6, joue:0.3, intensite:[0.7, 1, 1.3], fatigue:[0, 4, 9], blessure:0.001, cohesion:70},
  usure:1.2,                    // usure des balais par match (sur 100)
  /* v85 : stade et installations (niveaux 1 à 5 ; coût du niveau suivant = base × niveau actuel ; entretien par niveau et par semaine) */
  stade:{tranche:2000, coutPlace:600, semaines:8, max:60000},
  inst:{boutique:{base:400e3, entretien:500, semaines:4}, buvettes:{base:300e3, entretien:400, semaines:3}, tribunes:{base:800e3, entretien:800, semaines:8}, formation:{base:600e3, entretien:1200, semaines:6}},
  /* v85 : carrière */
  carriere:{repSelection:70, licenciement:5, offreSemaine:0.05, chomageOffre:0.6, academieMax:12},
};

/* v84 : staff du club : [clé, nom, groupe entraîné] */
const STAFF = [['entP', 'Entraîneur des poursuiveurs', 'P'], ['entB', 'Entraîneur des batteurs', 'B'], ['entA', 'Entraîneur des attrapeurs', 'A'], ['entG', 'Entraîneur des gardiens', 'G'],
  ['prepa', 'Préparateur physique', ''], ['medecin', 'Médecin', ''], ['recruteur', 'Recruteur', ''], ['formation', 'Responsable de la formation', '']];   // v85 : formation
const EFFETS_STAFF = {entP:'progression des poursuiveurs', entB:'progression des batteurs', entA:'progression des attrapeurs', entG:'progression des gardiens',
  prepa:'physique, récupération, déclin plus lent', medecin:'durée des blessures', recruteur:'estimation du potentiel et des notes au mercato', formation:'potentiel et progrès des jeunes du centre'};
/* v85 : installations du stade */
const INSTALLATIONS = [['boutique', 'Boutique', 'Recettes de la boutique'], ['buvettes', 'Buvettes', 'Recettes de restauration par spectateur'],
  ['tribunes', 'Tribunes couvertes', 'Remplissage du stade'], ['formation', 'Centre de formation', 'Nombre et qualité des jeunes chaque été']];
/* v84 : rôles individuels par poste : [clé, nom, effet] */
const ROLES = {
  P:[['polyvalent', 'Polyvalent', 'Équilibré entre attaque et défense.'], ['meneur', 'Meneur', 'Fait jouer les autres : l\'attaque de l\'équipe compte plus sur lui.'],
     ['finisseur', 'Finisseur', 'Tire beaucoup plus souvent.'], ['harceleur', 'Harceleur', 'Presse le porteur : plus de ballons récupérés.']],
  B:[['equilibre', 'Équilibré', 'Protège et attaque.'], ['protecteur', 'Protecteur', 'Moins de cognards réussis contre son équipe.'], ['chasseur', 'Chasseur', 'Plus de cognards réussis, plus de blessures adverses.']],
  A:[['equilibre', 'Équilibré', 'Ni fougueux ni prudent.'], ['chasseur', 'Chasseur', 'Plus rapide sur le vif d\'or.'], ['tacticien', 'Tacticien', 'Meilleures décisions, marquage plus efficace.']],
  G:[['equilibre', 'Équilibré', 'Classique.'], ['ligne', 'Gardien de ligne', 'Meilleur sur sa ligne.'], ['libero', 'Libéro', 'Sort au-devant : moins de tirs, mais plus faciles.']],
};
/* v84 : entraînement : focus et familles d'attributs travaillées */
const FOCUS = [['technique', 'Technique', ['Vol', 'Balle', 'Gardien']], ['physique', 'Physique', ['Physique']], ['tactique', 'Tactique', ['Mental']], ['repos', 'Repos', []]];
const INTENSITES = [[1, 'Légère'], [2, 'Normale'], [3, 'Intense']];

root.QMD = {INSTALLATIONS, STAFF, EFFETS_STAFF, ROLES, FOCUS, INTENSITES, NATIONS, SIX_NATIONS, LIGUES, CLUBS, ORIGINES, NOMS, ATTRS, GARDIEN, CACHES, POSTES, PICS, BALAIS, METEOS, METEO_MOIS, BLESSURES, TEXTES, EQ};
})(typeof window !== 'undefined' ? window : globalThis);
