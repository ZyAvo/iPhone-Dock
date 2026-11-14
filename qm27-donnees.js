// mon-ecran-version: c8d7b57f
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
  /* v106 : treize nations de plus (championnats latin, scandinave et d'Europe centrale) */
  ESP:{nom:'Espagne', court:'ESP', drapeau:'🇪🇸'},
  DEN:{nom:'Danemark', court:'DAN', drapeau:'🇩🇰'},
  SWE:{nom:'Suède', court:'SUÈ', drapeau:'🇸🇪'},
  NOR:{nom:'Norvège', court:'NOR', drapeau:'🇳🇴'},
  FIN:{nom:'Finlande', court:'FIN', drapeau:'🇫🇮'},
  ISL:{nom:'Islande', court:'ISL', drapeau:'🇮🇸'},
  GER:{nom:'Allemagne', court:'ALL', drapeau:'🇩🇪'},
  NED:{nom:'Pays-Bas', court:'P-B', drapeau:'🇳🇱'},
  BEL:{nom:'Belgique', court:'BEL', drapeau:'🇧🇪'},
  LUX:{nom:'Luxembourg', court:'LUX', drapeau:'🇱🇺'},
  POL:{nom:'Pologne', court:'POL', drapeau:'🇵🇱'},
  AUT:{nom:'Autriche', court:'AUT', drapeau:'🇦🇹'},
  CZE:{nom:'Tchéquie', court:'TCH', drapeau:'🇨🇿'},
};
const SIX_NATIONS = ['ENG', 'FRA', 'IRL', 'ITA', 'SCO', 'WAL'];   // les six nations historiques (emblèmes illustrés)
const SELECTIONS = Object.keys(NATIONS);   // v106 : toutes les sélections (Ligue des nations, amicaux)
const TOURNOI = {nom:'Tournoi des Six Emblèmes', court:'Six Emblèmes'};   // v91-v105 : l'ancien tournoi des sélections (palmarès des anciennes saisons)
const LDN = {nom:'Ligue des nations', court:'Ligue des nations', mini:'LDN'};   // v106 : l'été, une saison sur deux (poules puis élimination)
const AMICAUX = {nom:'Matchs amicaux', court:'Amical', fenetres:'Trêve internationale'};   // v106 : trois ou quatre trêves par saison, adversaires tirés au sort

const LIGUES = [   // v106 : quatre championnats de 16 clubs (avant : B&I, France, Italie)
  /* v114 : noms sorciers et régionaux, dans trois langues (local / en / fr) : l'île d'Avalon (Merlin, Morgane), Circé l'enchanteresse
     de la Méditerranée (mont Circé en Italie), l'arbre-monde Yggdrasil, la nuit de Walpurgis (sabbat du Brocken) */
  {id:'bi', nom:'Avalon League', court:'Avalon', noms:{local:['Avalon League', 'Avalon'], en:['Avalon League', 'Avalon'], fr:["Ligue d'Avalon", 'Avalon']}},
  {id:'la', nom:'Lega di Circe', court:'Circe', noms:{local:['Lega di Circe', 'Circe'], en:['Circe League', 'Circe'], fr:['Ligue de Circé', 'Circé']}},
  {id:'sc', nom:'Yggdrasilligaen', court:'Yggdrasil', noms:{local:['Yggdrasilligaen', 'Yggdrasil'], en:['Yggdrasil League', 'Yggdrasil'], fr:["Ligue d'Yggdrasil", 'Yggdrasil']}},
  {id:'ce', nom:'Walpurgisliga', court:'Walpurgis', noms:{local:['Walpurgisliga', 'Walpurgis'], en:['Walpurgis League', 'Walpurgis'], fr:['Ligue de Walpurgis', 'Walpurgis']}},
];
const LIGUES_ANCIENNES = {fr:{id:'fr', nom:'Ligue de France', court:'Ligue FR', noms:{local:['Ligue de France', 'Ligue FR'], en:['League of France', 'France'], fr:['Ligue de France', 'Ligue FR']}},
  it:{id:'it', nom:"Lega d'Italia", court:'Lega IT', noms:{local:["Lega d'Italia", 'Lega IT'], en:['League of Italy', 'Italy'], fr:["Ligue d'Italie", 'Ligue IT']}}};   // palmarès d'avant v106
/* v106 : clubs mis de côté (future deuxième division) ; une partie d'avant v106 les sort du jeu à la fin de sa saison */
const RESERVE = ['nantes', 'lille', 'strasbourg', 'montpellier', 'grenoble', 'poitiers', 'brest', 'reims', 'carcassonne', 'besancon',
  'bologna', 'genova', 'palermo', 'verona', 'bari', 'trieste', 'perugia', 'bergamo', 'benevento', 'arezzo'];

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
  ['rennes', 'Enchanteurs de Rennes', 'Rennes', 'FRA', 'la', 64, '#b1001c', '#141414', 16000],
  ['paris', 'Gargouilles de Paris', 'Paris', 'FRA', 'la', 85, '#14213d', '#c0c0c8', 32000],
  ['lyon', 'Mages de Lyon', 'Lyon', 'FRA', 'la', 78, '#283593', '#e53935', 27000],
  ['carcassonne', 'Sorcières de Carcassonne', 'Carcassonne', 'FRA', 'reserve', 46, '#6a1b4d', '#f2cc8f', 8000],
  ['nantes', 'Faucons de Nantes', 'Nantes', 'FRA', 'reserve', 62, '#f4d35e', '#1f6f50', 17000],
  ['strasbourg', 'Hiboux de Strasbourg', 'Strasbourg', 'FRA', 'reserve', 58, '#1e5aa8', '#f2f2f2', 15000],
  ['besancon', 'Vouivres de Besançon', 'Besançon', 'FRA', 'reserve', 44, '#2e7d32', '#ffd166', 7000],
  ['brest', 'Korrigans de Brest', 'Brest', 'FRA', 'reserve', 50, '#d00000', '#f7f7f2', 9500],
  ['toulouse', 'Farfadets de Toulouse', 'Toulouse', 'FRA', 'la', 70, '#5e2b97', '#ffffff', 22000],
  ['bordeaux', 'Spectres de Bordeaux', 'Bordeaux', 'FRA', 'la', 66, '#1c1c3c', '#e5e5e5', 19000],
  ['marseille', 'Sirènes de Marseille', 'Marseille', 'FRA', 'la', 74, '#00a6d6', '#ffffff', 26000],
  ['poitiers', 'Mélusines de Poitiers', 'Poitiers', 'FRA', 'reserve', 52, '#0b6e4f', '#d4af37', 10000],
  ['lille', 'Comètes de Lille', 'Lille', 'FRA', 'reserve', 60, '#c1121f', '#fdf0d5', 16000],
  ['montpellier', 'Mandragores de Montpellier', 'Montpellier', 'FRA', 'reserve', 56, '#ff6f00', '#1a2a6c', 13000],
  ['reims', 'Licornes de Reims', 'Reims', 'FRA', 'reserve', 48, '#e8e8e8', '#b00020', 9000],
  ['grenoble', 'Sortilèges de Grenoble', 'Grenoble', 'FRA', 'reserve', 54, '#264653', '#e9c46a', 11000],
  ['benevento', 'Streghe di Benevento', 'Benevento', 'ITA', 'reserve', 44, '#3c1642', '#e0c3fc', 7000],
  ['perugia', 'Grifoni di Perugia', 'Perugia', 'ITA', 'reserve', 48, '#a4161a', '#f5f3f4', 9000],
  ['venezia', 'Fenici di Venezia', 'Venezia', 'ITA', 'la', 66, '#e85d04', '#03071e', 17000],
  ['milano', 'Biscioni di Milano', 'Milano', 'ITA', 'la', 84, '#0c3b2e', '#ffba00', 31000],
  ['torino', 'Talismani di Torino', 'Torino', 'ITA', 'la', 76, '#6a040f', '#f1faee', 25000],
  ['arezzo', 'Chimere di Arezzo', 'Arezzo', 'ITA', 'reserve', 42, '#9c6644', '#ede0d4', 6500],
  ['napoli', 'Sibille di Napoli', 'Napoli', 'ITA', 'la', 72, '#0077b6', '#caf0f8', 24000],
  ['roma', 'Aruspici di Roma', 'Roma', 'ITA', 'la', 82, '#7b2cbf', '#ffd60a', 30000],
  ['firenze', 'Astrologi di Firenze', 'Firenze', 'ITA', 'la', 68, '#4b2c6f', '#cdbfe0', 19000],   // v130 : violet aubergine et lavande douce (avant #4a148c / #b388ff, trop vifs)
  ['palermo', 'Gorgoni di Palermo', 'Palermo', 'ITA', 'reserve', 56, '#f6aa1c', '#941b0c', 13000],
  ['bologna', 'Folletti di Bologna', 'Bologna', 'ITA', 'reserve', 62, '#ae2012', '#001219', 16000],
  ['genova', 'Lanterne di Genova', 'Genova', 'ITA', 'reserve', 58, '#023e8a', '#ffb703', 15000],
  ['verona', 'Incantatori di Verona', 'Verona', 'ITA', 'reserve', 54, '#3a86ff', '#ffbe0b', 12000],
  ['trieste', 'Spiriti di Trieste', 'Trieste', 'ITA', 'reserve', 50, '#adb5bd', '#212529', 10000],
  ['bari', 'Draghi di Bari', 'Bari', 'ITA', 'reserve', 52, '#d62828', '#003049', 12000],
  ['bergamo', 'Befane di Bergamo', 'Bergamo', 'ITA', 'reserve', 46, '#283618', '#dda15e', 8500],
  /* v106 : Ligue latine (les 6 premiers clubs français et italiens + 4 espagnols) */
  ['madrid', 'Grifos de Madrid', 'Madrid', 'ESP', 'la', 83, '#f2f2f2', '#6d1a36', 31000],
  ['barcelona', 'Dracs de Barcelona', 'Barcelona', 'ESP', 'la', 80, '#a50044', '#004d98', 29000],
  ['sevilla', 'Salamandras de Sevilla', 'Sevilla', 'ESP', 'la', 68, '#d62828', '#fcbf49', 19000],
  ['toledo', 'Hechiceros de Toledo', 'Toledo', 'ESP', 'la', 58, '#3c1f5c', '#c9a227', 12000],
  /* v106 : Ligue scandinave */
  ['stockholm', 'Stockholm Trollkarlar', 'Stockholm', 'SWE', 'sc', 78, '#0b3d91', '#f5c400', 27000],
  ['goteborg', 'Göteborg Sjörån', 'Göteborg', 'SWE', 'sc', 70, '#004b87', '#e8e8e8', 21000],
  ['uppsala', 'Uppsala Völvor', 'Uppsala', 'SWE', 'sc', 60, '#5c2a7e', '#f2d16b', 13000],
  ['malmo', 'Malmö Mylingar', 'Malmö', 'SWE', 'sc', 55, '#2e2e38', '#9fd3c7', 11000],
  ['oslo', 'Oslo Draugar', 'Oslo', 'NOR', 'sc', 76, '#a4161a', '#0b2545', 25000],
  ['bergen', 'Bergen Huldrer', 'Bergen', 'NOR', 'sc', 68, '#1b4332', '#d8f3dc', 19000],
  ['trondheim', 'Trondheim Nøkker', 'Trondheim', 'NOR', 'sc', 61, '#14213d', '#8ecae6', 14000],
  ['tromso', 'Tromsø Nordlys', 'Tromsø', 'NOR', 'sc', 52, '#2a9d8f', '#e9f5f2', 9000],
  ['kobenhavn', 'København Lindorme', 'København', 'DEN', 'sc', 79, '#c1121f', '#fdf0d5', 28000],
  ['aarhus', 'Aarhus Ellefolk', 'Aarhus', 'DEN', 'sc', 64, '#386641', '#f2e8cf', 16000],
  ['odense', 'Odense Nisser', 'Odense', 'DEN', 'sc', 56, '#9e2a2b', '#ffffff', 11000],
  ['helsinki', 'Helsinki Noidat', 'Helsinki', 'FIN', 'sc', 69, '#002f6c', '#ffffff', 20000],
  ['turku', 'Turku Tietäjät', 'Turku', 'FIN', 'sc', 58, '#7f5539', '#ede0d4', 12000],
  ['tampere', 'Tampere Menninkäiset', 'Tampere', 'FIN', 'sc', 54, '#3a5a40', '#ffb703', 10000],
  ['reykjavik', 'Reykjavík Álfar', 'Reykjavík', 'ISL', 'sc', 60, '#1d3557', '#e63946', 13000],
  ['akureyri', 'Akureyri Tröll', 'Akureyri', 'ISL', 'sc', 47, '#495057', '#f8f9fa', 7500],
  /* v106 : Ligue d'Europe centrale */
  ['berlin', 'Berliner Hexer', 'Berlin', 'GER', 'ce', 82, '#1a1a1a', '#d4af37', 30000],
  ['munchen', 'Münchner Lindwürmer', 'München', 'GER', 'ce', 80, '#0057b8', '#ffffff', 29000],
  ['hamburg', 'Hamburger Klabauter', 'Hamburg', 'GER', 'ce', 68, '#003049', '#f77f00', 19000],
  ['koln', 'Kölner Heinzelmännchen', 'Köln', 'GER', 'ce', 62, '#d62828', '#fefae0', 15000],
  ['krakow', 'Smoki Kraków', 'Kraków', 'POL', 'ce', 74, '#9d0208', '#ffd60a', 24000],
  ['warszawa', 'Syreny Warszawa', 'Warszawa', 'POL', 'ce', 70, '#e5383b', '#ffffff', 21000],
  ['gdansk', 'Gryfy Gdańsk', 'Gdańsk', 'POL', 'ce', 56, '#023e8a', '#ffc300', 11000],
  ['amsterdam', 'Amsterdamse Heksen', 'Amsterdam', 'NED', 'ce', 73, '#ff6b00', '#1d1d1d', 23000],
  ['utrecht', 'Utrechtse Witte Wieven', 'Utrecht', 'NED', 'ce', 57, '#f8f9fa', '#7209b7', 11500],
  ['bruxelles', 'Sorciers de Bruxelles', 'Bruxelles', 'BEL', 'ce', 69, '#6a040f', '#ffba08', 19000],
  ['antwerpen', 'Antwerpse Reuzen', 'Antwerpen', 'BEL', 'ce', 60, '#2b2d42', '#e63946', 13500],
  ['wien', 'Wiener Basilisken', 'Wien', 'AUT', 'ce', 75, '#7b2cbf', '#f1faee', 25000],
  ['salzburg', 'Salzburger Perchten', 'Salzburg', 'AUT', 'ce', 58, '#5e3023', '#f3e9dc', 12000],
  ['praha', 'Golemové Praha', 'Praha', 'CZE', 'ce', 72, '#3d405b', '#e07a5f', 22000],
  ['brno', 'Draci Brno', 'Brno', 'CZE', 'ce', 55, '#38b000', '#081c15', 10500],
  ['luxembourg', 'Melusina Lëtzebuerg', 'Luxembourg', 'LUX', 'ce', 50, '#00a1de', '#ef3340', 8000],
];

/* v114 : noms des clubs et des ligues au choix (Règles et réglages › Noms) : « local » = la langue du pays (CLUBS[1], ville CLUBS[2]),
   « en » = tout en anglais, « fr » = tout en français. NOMS_CLUBS[id] = [anglais, français] ; VILLES_LANGUES[id] = [ville en anglais, en français]
   quand elle diffère de la ville locale. Les ligues portent leurs trois noms dans LIGUES[i].noms (nom long, nom court). */
const NOMS_CLUBS = {
  bath:['Bath Basilisks', 'Basilics de Bath'], york:['York Wyverns', 'Vouivres d\'York'], canterbury:['Canterbury Conjurers', 'Conjurateurs de Cantorbéry'],
  glastonbury:['Glastonbury Grimoires', 'Grimoires de Glastonbury'], whitby:['Whitby Warlocks', 'Sorciers de Whitby'], norwich:['Norwich Nightshades', 'Belladones de Norwich'],
  oxford:['Oxford Oracles', 'Oracles d\'Oxford'], inverness:['Inverness Kelpies', 'Kelpies d\'Inverness'], aberdeen:['Aberdeen Alchemists', 'Alchimistes d\'Aberdeen'],
  stirling:['Stirling Selkies', 'Selkies de Stirling'], conwy:['Conwy Cauldrons', 'Chaudrons de Conwy'], swansea:['Swansea Sorcerers', 'Ensorceleurs de Swansea'],
  aberystwyth:['Aberystwyth Augurs', 'Augures d\'Aberystwyth'], galway:['Galway Banshees', 'Banshees de Galway'], cork:['Cork Cloakwings', 'Capes volantes de Cork'],
  dublin:['Dublin Druids', 'Druides de Dublin'],
  rennes:['Rennes Enchanters', 'Enchanteurs de Rennes'], paris:['Paris Gargoyles', 'Gargouilles de Paris'], lyon:['Lyon Mages', 'Mages de Lyon'],
  carcassonne:['Carcassonne Witches', 'Sorcières de Carcassonne'], nantes:['Nantes Falcons', 'Faucons de Nantes'], strasbourg:['Strasbourg Owls', 'Hiboux de Strasbourg'],
  besancon:['Besançon Wyverns', 'Vouivres de Besançon'], brest:['Brest Korrigans', 'Korrigans de Brest'], toulouse:['Toulouse Sprites', 'Farfadets de Toulouse'],
  bordeaux:['Bordeaux Spectres', 'Spectres de Bordeaux'], marseille:['Marseille Sirens', 'Sirènes de Marseille'], poitiers:['Poitiers Melusines', 'Mélusines de Poitiers'],
  lille:['Lille Comets', 'Comètes de Lille'], montpellier:['Montpellier Mandrakes', 'Mandragores de Montpellier'], reims:['Reims Unicorns', 'Licornes de Reims'],
  grenoble:['Grenoble Spells', 'Sortilèges de Grenoble'],
  benevento:['Benevento Witches', 'Sorcières de Bénévent'], perugia:['Perugia Griffins', 'Griffons de Pérouse'], venezia:['Venice Phoenixes', 'Phénix de Venise'],
  milano:['Milan Serpents', 'Guivres de Milan'], torino:['Turin Talismans', 'Talismans de Turin'], arezzo:['Arezzo Chimeras', 'Chimères d\'Arezzo'],
  napoli:['Naples Sibyls', 'Sibylles de Naples'], roma:['Rome Haruspices', 'Haruspices de Rome'], firenze:['Florence Astrologers', 'Astrologues de Florence'],
  palermo:['Palermo Gorgons', 'Gorgones de Palerme'], bologna:['Bologna Imps', 'Follets de Bologne'], genova:['Genoa Lanterns', 'Lanternes de Gênes'],
  verona:['Verona Charmers', 'Charmeurs de Vérone'], trieste:['Trieste Spirits', 'Esprits de Trieste'], bari:['Bari Dragons', 'Dragons de Bari'],
  bergamo:['Bergamo Befanas', 'Befanas de Bergame'],
  madrid:['Madrid Griffins', 'Griffons de Madrid'], barcelona:['Barcelona Drakes', 'Dracs de Barcelone'], sevilla:['Seville Salamanders', 'Salamandres de Séville'],
  toledo:['Toledo Necromancers', 'Nécromanciens de Tolède'],
  stockholm:['Stockholm Wizards', 'Magiciens de Stockholm'], goteborg:['Gothenburg Nymphs', 'Nymphes de Göteborg'], uppsala:['Uppsala Seeresses', 'Voyantes d\'Uppsala'],
  malmo:['Malmö Wraiths', 'Revenants de Malmö'], oslo:['Oslo Draugr', 'Draugr d\'Oslo'], bergen:['Bergen Hulders', 'Huldres de Bergen'],
  trondheim:['Trondheim Nixies', 'Nixes de Trondheim'], tromso:['Tromsø Auroras', 'Aurores de Tromsø'], kobenhavn:['Copenhagen Lindorms', 'Lindorms de Copenhague'],
  aarhus:['Aarhus Elfkin', 'Elfes d\'Aarhus'], odense:['Odense Nisses', 'Nisses d\'Odense'], helsinki:['Helsinki Shamans', 'Chamanes d\'Helsinki'],
  turku:['Turku Sages', 'Sages de Turku'], tampere:['Tampere Gnomes', 'Gnomes de Tampere'], reykjavik:['Reykjavík Hidden Folk', 'Peuple caché de Reykjavík'],
  akureyri:['Akureyri Trolls', 'Trolls d\'Akureyri'],
  berlin:['Berlin Hexers', 'Envoûteurs de Berlin'], munchen:['Munich Lindwurms', 'Lindwurms de Munich'], hamburg:['Hamburg Kobolds', 'Kobolds de Hambourg'],
  koln:['Cologne Heinzelmen', 'Lutins de Cologne'], krakow:['Kraków Dragons', 'Dragons de Cracovie'], warszawa:['Warsaw Mermaids', 'Ondines de Varsovie'],
  gdansk:['Gdańsk Gryphons', 'Gryphons de Gdańsk'], amsterdam:['Amsterdam Witches', 'Sorcières d\'Amsterdam'], utrecht:['Utrecht White Ladies', 'Dames blanches d\'Utrecht'],
  bruxelles:['Brussels Spellbinders', 'Sorciers de Bruxelles'], antwerpen:['Antwerp Giants', 'Géants d\'Anvers'], wien:['Vienna Basilisks', 'Basilics de Vienne'],
  salzburg:['Salzburg Perchten', 'Perchten de Salzbourg'], praha:['Prague Golems', 'Golems de Prague'], brno:['Brno Wyrms', 'Wyrms de Brno'],
  luxembourg:['Luxembourg Melusines', 'Mélusines de Luxembourg'],
};
const VILLES_LANGUES = {canterbury:[null, 'Cantorbéry'], benevento:[null, 'Bénévent'], perugia:[null, 'Pérouse'], venezia:['Venice', 'Venise'], milano:['Milan', 'Milan'],
  torino:['Turin', 'Turin'], napoli:['Naples', 'Naples'], roma:['Rome', 'Rome'], firenze:['Florence', 'Florence'], palermo:[null, 'Palerme'], bologna:[null, 'Bologne'],
  genova:['Genoa', 'Gênes'], verona:[null, 'Vérone'], bergamo:[null, 'Bergame'], barcelona:[null, 'Barcelone'], sevilla:['Seville', 'Séville'], toledo:[null, 'Tolède'],
  goteborg:['Gothenburg', null], kobenhavn:['Copenhagen', 'Copenhague'], munchen:['Munich', 'Munich'], hamburg:[null, 'Hambourg'], koln:['Cologne', 'Cologne'],
  krakow:[null, 'Cracovie'], warszawa:['Warsaw', 'Varsovie'], bruxelles:['Brussels', null], antwerpen:['Antwerp', 'Anvers'], wien:['Vienna', 'Vienne'],
  salzburg:[null, 'Salzbourg'], praha:['Prague', 'Prague']};
const LANGUES_NOMS = [['local', 'Langue du pays', 'Gargouilles de Paris, Golemové Praha'], ['en', 'Tout en anglais', 'Paris Gargoyles, Prague Golems'], ['fr', 'Tout en français', 'Oracles d\'Oxford, Golems de Prague']];

/* Origine des joueurs d'un club selon sa nation : [nation, poids] */
const ORIGINES = {   // v106 : les nouveaux joueurs d'un club viennent surtout de son pays, un peu des voisins
  ENG:[['ENG', 70], ['SCO', 8], ['WAL', 8], ['IRL', 7], ['FRA', 4], ['ITA', 3]],
  SCO:[['SCO', 65], ['ENG', 15], ['IRL', 8], ['WAL', 6], ['FRA', 3], ['ITA', 3]],
  WAL:[['WAL', 65], ['ENG', 15], ['SCO', 7], ['IRL', 7], ['FRA', 3], ['ITA', 3]],
  IRL:[['IRL', 68], ['ENG', 12], ['SCO', 8], ['WAL', 6], ['FRA', 3], ['ITA', 3]],
  FRA:[['FRA', 82], ['ITA', 5], ['ESP', 5], ['BEL', 3], ['ENG', 3], ['LUX', 2]],
  ITA:[['ITA', 83], ['FRA', 6], ['ESP', 5], ['AUT', 2], ['ENG', 2], ['CZE', 2]],
  ESP:[['ESP', 82], ['FRA', 6], ['ITA', 5], ['ENG', 3], ['IRL', 2], ['GER', 2]],
  SWE:[['SWE', 72], ['NOR', 8], ['DEN', 8], ['FIN', 8], ['ISL', 4]],
  NOR:[['NOR', 72], ['SWE', 10], ['DEN', 8], ['ISL', 6], ['FIN', 4]],
  DEN:[['DEN', 72], ['SWE', 10], ['NOR', 8], ['GER', 6], ['ISL', 4]],
  FIN:[['FIN', 76], ['SWE', 12], ['NOR', 5], ['DEN', 4], ['ISL', 3]],
  ISL:[['ISL', 70], ['NOR', 10], ['DEN', 10], ['SWE', 6], ['FIN', 4]],
  GER:[['GER', 74], ['AUT', 7], ['POL', 6], ['NED', 4], ['CZE', 4], ['BEL', 3], ['LUX', 2]],
  POL:[['POL', 80], ['CZE', 8], ['GER', 8], ['AUT', 4]],
  NED:[['NED', 72], ['BEL', 12], ['GER', 8], ['LUX', 4], ['DEN', 4]],
  BEL:[['BEL', 68], ['NED', 12], ['FRA', 8], ['LUX', 6], ['GER', 6]],
  AUT:[['AUT', 72], ['GER', 12], ['CZE', 8], ['POL', 4], ['ITA', 4]],
  CZE:[['CZE', 78], ['POL', 8], ['AUT', 7], ['GER', 7]],
  LUX:[['LUX', 62], ['BEL', 12], ['FRA', 10], ['GER', 10], ['NED', 6]],
};

/* Banques de noms (courants et réels, jamais ceux d'un personnage connu de l'univers d'origine). v105 : environ 60 prénoms masculins (h),
   60 féminins (f) et 120 à 150 noms par nation ; p = h puis f (tirage à parts égales, et les anciens joueurs gardent leur prénom et leur genre). */
const NOMS = {
  ENG:{h:['James','Thomas','Oliver','Jack','Samuel','Daniel','Joseph','Matthew','Luke','Ethan','Callum','Ryan','Adam','Ben','Henry','Edward','Lewis','Toby','Alfie','Archie','William','George','Charlie','Harrison','Joshua','Alexander','Benjamin','Isaac','Max','Theo','Leo','Freddie','Jacob','Noah','Elliot','Reuben','Sebastian','Tobias','Dominic','Frederick','Jasper','Rupert','Nathaniel','Barnaby','Christopher','Michael','Andrew','Peter','Simon','Stephen','Mark','Jonathan','Nicholas','Robert','Richard','Anthony','Joel','Aaron','Connor'],
       f:['Emily','Sophie','Charlotte','Amelia','Grace','Lucy','Hannah','Ellie','Megan','Chloe','Isabel','Rosie','Abigail','Freya','Holly','Jessica','Lauren','Phoebe','Martha','Imogen','Olivia','Ava','Mia','Ella','Evie','Poppy','Sienna','Florence','Matilda','Daisy','Alice','Harriet','Eleanor','Georgia','Rebecca','Sarah','Rachel','Laura','Natalie','Victoria','Bethany','Jasmine','Kate','Emma','Anna','Zoe','Millie','Esme','Beatrice','Penelope','Ruby','Scarlett','Maisie','Elizabeth','Catherine','Joanna','Naomi','Tilly','Faye','Rosalind'],
       n:['Ashworth','Barlow','Bentley','Blackwell','Bradshaw','Brook','Cartwright','Clayton','Cooke','Crossley','Dawson','Denton','Ellison','Fairley','Fletcher','Foster','Garside','Gould','Hadley','Hargreaves','Hartley','Hewitt','Holloway','Hopkins','Kendall','Lambert','Langley','Lowe','Marsh','Mercer','Middleton','Norris','Oakley','Parsons','Pickering','Prescott','Radcliffe','Rowley','Sheridan','Shaw','Simmonds','Stanton','Thornton','Townsend','Walsh','Warren','Whitaker','Winslow','Yates','Hastings','Ackroyd','Ainsworth','Allerton','Appleby','Armitage','Ashby','Atherton','Bainbridge','Barker','Barnes','Bartlett','Baxter','Beckett','Bellamy','Benson','Birch','Bishop','Booth','Bramley','Briggs','Broadbent','Buckley','Burton','Butler','Carver','Chadwick','Chapman','Coates','Collier','Cowley','Crane','Dale','Davenport','Dixon','Draper','Eastwood','Elliott','Emerson','Farrow','Fenwick','Fielding','Foxley','Gardner','Gibbs','Goodwin','Greaves','Hales','Hammond','Harding','Hawkins','Haywood','Hollis','Holt','Horton','Ingram','Jarvis','Kirby','Knowles','Lancaster','Latham','Lockwood','Mallory','Mason','Metcalfe','Milner','Morley','Nash','Newman','Nicholls','Oldham','Osborne','Palmer','Payne','Pearce','Penrose','Pollard','Porter','Ratcliffe','Redfern','Rhodes','Ridley','Rushworth','Sadler','Sanderson','Sargent','Sawyer','Sexton','Shepherd','Slater','Spencer','Stokes','Sumner','Swift','Tanner','Thwaite','Tillotson','Turnbull','Underwood','Wainwright','Webster','Wheeler','Whitmore','Wilkinson','Woodhouse']},
  SCO:{h:['Callum','Euan','Fraser','Hamish','Angus','Ross','Lachlan','Calum','Duncan','Alasdair','Ewan','Gregor','Malcolm','Rory','Struan','Andrew','Archie','Blair','Bruce','Cameron','Craig','Dougal','Douglas','Finlay','Gordon','Graeme','Iain','Innes','Jamie','Keir','Kenneth','Logan','Murdo','Neil','Robbie','Ruaridh','Scott','Stuart','Torquil','Alistair','Archibald','Brodie','Colin','Fergus','Gavin','Grant','Hector','Kyle','Lennox','Lewis','Magnus','Ninian','Ewen','Robert','Alexander','Thomas','Calan','Callan','Hugh','Jock'],
       f:['Kirsty','Isla','Eilidh','Morag','Fiona','Ailsa','Catriona','Mhairi','Skye','Iona','Shona','Heather','Rhona','Kenzie','Elspeth','Aileen','Alison','Annie','Bonnie','Caitlin','Christina','Elsie','Effie','Esme','Fenella','Flora','Freya','Georgina','Gillian','Greer','Hannah','Isobel','Jean','Jessie','Kirsten','Leah','Lorna','Maisie','Mairi','Marion','Moira','Morven','Nicola','Rachel','Rowan','Sheena','Sophie','Una','Lesley','Ishbel','Kenna','Thea','Rosslyn','Senga','Euphemia','Alexis','Beth','Eilish','Shonagh'],
       n:['MacLeod','Campbell','Fraser','Murray','Sinclair','Buchanan','Drummond','Ferguson','Gillespie','Graham','Henderson','Kerr','Lindsay','MacAulay','MacIntyre','MacKenzie','MacNeil','Munro','Ogilvy','Paterson','Ramsay','Robertson','Ross','Sutherland','Urquhart','Wallace','Cameron','Grant','Abernethy','Dunbar','Aitken','Allan','Anderson','Baird','Balfour','Boyd','Brodie','Bruce','Burns','Cairns','Chalmers','Christie','Crawford','Cunningham','Dalgleish','Davidson','Dickson','Douglas','Duff','Elliot','Erskine','Findlay','Fleming','Forbes','Forsyth','Galbraith','Gibson','Gordon','Gow','Guthrie','Haig','Hamilton','Hay','Hunter','Inglis','Innes','Irvine','Jardine','Johnston','Keith','Kidd','Kinnear','Kirkland','Lamont','Leslie','Liddell','Little','Logan','Mackay','MacDonald','MacGregor','MacInnes','MacKinnon','MacLean','MacPherson','MacRae','Maxwell','McBride','McCallum','McDougall','McEwan','McFarlane','McGill','McLaren','McNab','Menzies','Moffat','Morrison','Muir','Napier','Nicolson','Pringle','Rae','Reid','Rennie','Ritchie','Scott','Stewart','Strachan','Swanson','Tait','Thomson','Wilson','Wishart','Young','Aird','Dunlop','Lennox','Lyall','Mathieson','Melville','Mowat','Rankin','Shearer','Souter','Tulloch','Waddell','Weir','Bannerman','Carnegie','Cochrane','Dewar','Fyfe','Laird','Lauder','Rutherford']},
  WAL:{h:['Rhys','Dylan','Gethin','Iwan','Owain','Gareth','Dafydd','Emyr','Huw','Aled','Tomos','Cai','Ieuan','Rhodri','Sion','Alun','Arwel','Bryn','Caradog','Carwyn','Cledwyn','Dai','Deiniol','Dewi','Dyfan','Eifion','Elis','Emlyn','Gruffydd','Gwilym','Gwion','Hywel','Idris','Ifan','Islwyn','Llŷr','Macsen','Meirion','Osian','Peredur','Rhydian','Steffan','Taliesin','Tegid','Trystan','Wyn','Ynyr','Brychan','Cadoc','Cynan','Einion','Geraint','Glyn','Iestyn','Ioan','Math','Prys','Rhun','Twm','Gwyn'],
       f:['Cerys','Ffion','Seren','Lowri','Nia','Carys','Bethan','Eleri','Gwen','Mali','Elin','Megan','Angharad','Tegan','Rhiannon','Alaw','Anwen','Awen','Betsan','Branwen','Catrin','Delyth','Eirlys','Elain','Eluned','Enfys','Glenys','Gwenllian','Gwenno','Haf','Heledd','Heulwen','Lleucu','Llinos','Luned','Mabli','Mair','Mererid','Morwenna','Nerys','Nesta','Olwen','Rhian','Rhoswen','Sara','Sian','Sioned','Tanwen','Tirion','Wenna','Ceinwen','Dilys','Efa','Gwyneth','Lois','Menna','Siwan','Teleri','Manon','Eirian'],
       n:['Llewellyn','Pritchard','Bowen','Griffiths','Howells','Jenkins','Lloyd','Meredith','Morgan','Parry','Powell','Price','Pugh','Rees','Roberts','Thomas','Vaughan','Watkins','Hughes','Evans','Owen','Prosser','Probert','Gwynne','Bevan','Cadwallader','Maddock','Pryce','Rowlands','Tudor','Beddoe','Breese','Davies','Edwards','Ellis','Gittins','Gough','Griffin','Gwyther','Harries','Hopkin','Humphreys','Jarman','Jones','Kinsey','Lewis','Llywelyn','Madoc','Mathias','Mostyn','Nicholas','Perkins','Phillips','Pennant','Powys','Preece','Prothero','Pryor','Rowland','Samuel','Trevor','Walters','Wynn','Bennett','Brace','Daniel','David','Dyer','Eynon','Gower','Hoskins','Jeffreys','John','Kendrick','Lougher','Merrick','Moses','Owens','Parkhouse','Penry','Philpin','Pumphrey','Rhydderch','Richards','Rosser','Sayce','Seys','Stradling','Treharne','Upton','Voyle','Waters','Wogan','Yorath','Bowden','Cadogan','Caradoc','Cradock','Ednyfed','Gwilliam','Ithel','Jenkin','Kemeys','Lewys','Mathew','Meyrick','Morris','Nanney','Picton','Prydderch','Rhys','Salusbury','Vychan']},
  IRL:{h:['Cian','Darragh','Eoin','Fionn','Oisín','Ronan','Seán','Tadhg','Niall','Cathal','Ciarán','Diarmuid','Colm','Liam','Pádraig','Aidan','Alan','Barry','Brendan','Brian','Cormac','Conor','Conall','Declan','Dónal','Donnacha','Eamon','Enda','Fergal','Fiachra','Finbar','Garrett','Kevin','Killian','Lorcan','Mícheál','Odhrán','Pearse','Peadar','Ruairí','Senan','Shane','Tiernan','Ultan','Cillian','Dara','Emmet','Kieran','Rian','Seosamh','Darren','Dermot','Fintan','Jarlath','Turlough','Colman','Muiris','Proinsias','Caolán','Daithí'],
       f:['Aoife','Ciara','Niamh','Saoirse','Róisín','Clodagh','Orla','Siobhán','Caoimhe','Áine','Gráinne','Maeve','Sorcha','Éabha','Muireann','Ailbhe','Aisling','Aoibheann','Bláthnaid','Bríd','Clíona','Dearbhla','Deirdre','Eimear','Eileen','Emer','Fiadh','Fionnuala','Gobnait','Laoise','Líadan','Mairéad','Máire','Nuala','Órfhlaith','Ríona','Rónait','Sadhbh','Sinéad','Úna','Darina','Doireann','Ellen','Fidelma','Isolde','Mella','Neasa','Nessa','Oonagh','Ríonach','Sláine','Treasa','Aoibhinn','Caitríona','Ciannait','Méabh','Ailís','Brónach','Cáit','Eithne'],
       n:['Brennan','Byrne','Callaghan','Daly','Doherty','Dunne','Fitzgerald','Gallagher','Healy','Hennessy','Kavanagh','Keane','Kennedy','Madden','McCarthy','McGrath','Nolan','O\'Brien','O\'Connell','O\'Donnell','O\'Neill','O\'Sullivan','Power','Quinlan','Regan','Sheehan','Tierney','Whelan','Cullen','Delaney','Ahern','Barrett','Boland','Bourke','Boyle','Brady','Buckley','Cahill','Carey','Carroll','Casey','Clancy','Coakley','Coleman','Collins','Concannon','Connolly','Corcoran','Costello','Coughlan','Cronin','Crowley','Cunningham','Curran','Deasy','Dempsey','Devlin','Dolan','Donnelly','Donovan','Dooley','Dowling','Doyle','Duggan','Egan','Fahy','Fallon','Farrell','Feeney','Flanagan','Flynn','Foley','Gaffney','Garvey','Geraghty','Gilligan','Gleeson','Griffin','Hanlon','Hayes','Hegarty','Higgins','Hogan','Horgan','Hurley','Kearney','Keating','Kelleher','Kenny','Keogh','Kinsella','Lalor','Lenihan','Lynch','Mahony','Maguire','McAuliffe','McCann','McDermott','McEvoy','McGovern','McKenna','McLoughlin','McNamara','Meagher','Molloy','Moloney','Moran','Mulcahy','Mullan','Murphy','Naughton','O\'Callaghan','O\'Dwyer','O\'Flaherty','O\'Mahony','O\'Reilly','O\'Rourke','O\'Shea','Phelan','Quigley','Quinn','Rafferty','Redmond','Roche','Ryan','Scanlon','Shanahan','Slattery','Sweeney','Toomey','Tracey','Twomey','Ward','Hickey','Hartnett','Fennelly','Moynihan','Lacey','Mooney','Brosnan','Cleary','Considine','Dunphy','Galvin','Hanrahan','Lyons','Morrissey']},
  FRA:{h:['Lucas','Hugo','Louis','Gabriel','Arthur','Jules','Raphaël','Théo','Nathan','Maxime','Antoine','Baptiste','Clément','Romain','Quentin','Mathis','Victor','Bastien','Adrien','Paul','Alexandre','Benjamin','Charles','Corentin','Damien','Dorian','Édouard','Émile','Étienne','Florian','François','Gaël','Guillaume','Jérémy','Julien','Kévin','Léo','Loïc','Lucien','Marius','Martin','Mathéo','Nicolas','Olivier','Pierre','Rémi','Robin','Samuel','Sébastien','Simon','Thibault','Thomas','Timothée','Tristan','Valentin','Yann','Yanis','Axel','Benoît','Gaspard','Noé'],
       f:['Léa','Chloé','Manon','Camille','Inès','Jade','Louise','Zoé','Clara','Juliette','Margaux','Élise','Romane','Anaïs','Lucie','Pauline','Mathilde','Agathe','Salomé','Eva','Adèle','Alice','Amandine','Apolline','Aurélie','Bérénice','Capucine','Céline','Charlotte','Claire','Constance','Diane','Éloïse','Emma','Estelle','Faustine','Hélène','Héloïse','Iris','Joséphine','Justine','Laure','Léonie','Lina','Lisa','Louna','Maëlle','Marine','Mélanie','Nina','Noémie','Océane','Ophélie','Rose','Sarah','Solène','Suzanne','Victoire','Violette','Yasmine','Garance'],
       n:['Aubert','Barbier','Bertrand','Blanchard','Boyer','Brunet','Carpentier','Chevalier','Clément','Colin','Delmas','Deschamps','Duval','Fabre','Faure','Fournier','Gaillard','Garnier','Guérin','Hamon','Jacquet','Joly','Lacroix','Lambert','Laurent','Leclerc','Lefèvre','Lemaire','Lenoir','Marchand','Masson','Mercier','Meunier','Moulin','Noël','Perrin','Picard','Poirier','Renard','Rey','Roche','Roussel','Roux','Sabatier','Tessier','Vasseur','Vidal','Vincent','Arnal','Cabrol','Adam','Andrieu','Arnaud','Bailly','Baron','Barre','Besson','Blanc','Bonnet','Bouvier','Brun','Caron','Chauvin','Collet','Cordier','Courtois','Cousin','Dumas','Dupont','Durand','Dubois','Fleury','Fontaine','Fortin','Gauthier','Germain','Gilbert','Girard','Gros','Guillot','Hébert','Huet','Humbert','Jacob','Julien','Lebrun','Leblanc','Lecomte','Leroy','Lemoine','Marie','Martin','Michaud','Millet','Morel','Muller','Olivier','Pagès','Payet','Petit','Philippe','Prévost','Rivière','Robin','Rolland','Rousseau','Royer','Simon','Thomas','Vallet','Vautrin','Aubry','Bousquet','Cazals','Combes','Delaunay','Dupuis','Ferrand','Guilhem','Labbé','Langlois','Marty','Maury','Pujol','Rigal','Teyssier','Vernet','Bourdon','Carré','Charpentier','Couderc','Delorme','Gay','Léger','Mallet','Maréchal','Pascal','Poulain','Raynaud','Salmon','Tardieu','Valette','Verdier','Alibert','Bonnafous','Cassagne','Delpech','Escande','Fabié']},
  ITA:{h:['Lorenzo','Matteo','Leonardo','Alessandro','Francesco','Andrea','Riccardo','Tommaso','Gabriele','Davide','Federico','Simone','Pietro','Marco','Luca','Alberto','Antonio','Angelo','Bruno','Carlo','Cristian','Daniele','Diego','Edoardo','Elia','Emanuele','Enrico','Fabio','Filippo','Giacomo','Giorgio','Giovanni','Giuseppe','Jacopo','Manuel','Massimo','Mattia','Michele','Nicolò','Paolo','Raffaele','Roberto','Salvatore','Samuele','Sergio','Stefano','Valerio','Vincenzo','Umberto','Ettore','Gianluca','Luigi','Nicola','Ottavio','Renato','Tiziano','Vittorio','Alessio','Dario','Ivo'],
       f:['Giulia','Sofia','Aurora','Alice','Ginevra','Chiara','Martina','Beatrice','Francesca','Elena','Sara','Vittoria','Noemi','Camilla','Bianca','Alessia','Anna','Arianna','Benedetta','Carlotta','Caterina','Cecilia','Claudia','Costanza','Elisa','Eleonora','Emma','Federica','Gaia','Giada','Greta','Ilaria','Irene','Laura','Letizia','Lucia','Ludovica','Maria','Marta','Matilde','Michela','Nicole','Paola','Rebecca','Serena','Silvia','Sveva','Teresa','Valentina','Viola','Agnese','Angelica','Asia','Debora','Emilia','Fiamma','Giorgia','Linda','Margherita','Rachele'],
       n:['Bianchi','Romano','Colombo','Ricci','Marino','Greco','Bruno','Gallo','Conti','De Luca','Mancini','Costa','Giordano','Rizzo','Lombardi','Moretti','Barbieri','Fontana','Santoro','Mariani','Rinaldi','Caruso','Ferrara','Galli','Martini','Leone','Longo','Gentile','Martinelli','Vitale','Serra','Coppola','De Santis','Fabbri','Bellini','Ferri','Pellegrini','Palumbo','Sanna','Orlando','Amato','Basile','Battaglia','Bernardi','Bianco','Bonetti','Bruni','Caputo','Carbone','Cattaneo','Cirillo','Colonna','Conte','Cristiani','D\'Amico','D\'Angelo','De','Rosa','Donati','Esposito','Farina','Ferraro','Fiore','Gatti','Giuliani','Grasso','Guerra','Lanza','Lombardo','Mancuso','Marchetti','Marini','Mazza','Messina','Monti','Morelli','Negri','Neri','Palmieri','Parisi','Pace','Pagano','Piras','Poli','Porcu','Riva','Rossetti','Rossi','Ruggiero','Russo','Sala','Salvi','Sartori','Silvestri','Testa','Valentini','Villa','Zanetti','Zanella','Agostini','Albanese','Arena','Barone','Benedetti','Bertolini','Brambilla','Castelli','Cocco','Corsi','Damiani','Di','Stefano','Fadda','Ferrante','Franco','Gentili','Grassi','Leoni','Longhi','Lucchesi','Magri','Mele','Melis','Montanari','Mura','Nardi','Orsini','Pellegrino','Pepe','Piazza','Pozzi','Rocca','Romeo','Sacco','Santini','Sorrentino','Tedesco','Toscano','Vacca','Valli','Vitali','Zappa']},
  ESP:{h:['Alejandro','Pablo','Daniel','Javier','Adrián','Álvaro','Diego','Hugo','Marcos','Sergio','Carlos','Mario','Iván','Rubén','Raúl','Jorge','Alberto','Fernando','Rafael','Andrés','Manuel','Antonio','Miguel','Ignacio','Gonzalo','Íñigo','Unai','Jaime','Óscar','Víctor','Enrique','Luis','Joaquín','Rodrigo','Martín','Samuel','Bruno','Nicolás','Guillermo','Tomás','Lucas','Aitor','Pau','Jordi','Xavier','Mateo','Ángel','Eduardo'],
       f:['Lucía','María','Paula','Laura','Marta','Andrea','Carmen','Sara','Alba','Elena','Claudia','Irene','Nerea','Julia','Ana','Cristina','Noelia','Rocío','Natalia','Patricia','Beatriz','Silvia','Raquel','Lorena','Teresa','Inés','Pilar','Aitana','Martina','Carla','Valeria','Olivia','Ainhoa','Leire','Nuria','Montse','Marina','Sofía','Celia','Blanca','Esther','Mireia','Gemma','Alicia','Isabel','Victoria'],
       n:['García','Martínez','López','Sánchez','Pérez','Gómez','Fernández','Ruiz','Díaz','Moreno','Muñoz','Álvarez','Romero','Alonso','Gutiérrez','Navarro','Torres','Domínguez','Vázquez','Ramos','Gil','Ramírez','Serrano','Blanco','Molina','Morales','Suárez','Ortega','Delgado','Castro','Ortiz','Rubio','Marín','Sanz','Iglesias','Medina','Garrido','Cortés','Castillo','Santos','Lozano','Guerrero','Cano','Prieto','Méndez','Cruz','Calvo','Gallego','Vidal','León','Márquez','Herrera','Peña','Flores','Cabrera','Campos','Vega','Fuentes','Carrasco','Diez','Caballero','Reyes','Nieto','Aguilar','Pascual','Santana','Herrero','Lorenzo','Montero','Hidalgo','Giménez','Ibáñez','Ferrer','Durán','Santiago','Benítez','Mora','Vicente','Arias','Vargas','Carmona','Crespo','Román','Pastor','Soto','Sáez','Velasco','Moya','Soler','Parra','Esteban','Bravo','Gallardo','Rojas','Echeverría','Aranda','Urquiza','Zubizarreta','Goikoetxea','Etxeberria','Puig','Vilanova','Casals']},
  DEN:{h:['Mads','Rasmus','Mikkel','Frederik','Christian','Anders','Jonas','Kasper','Oliver','Emil','Magnus','Nikolaj','Søren','Lars','Jens','Henrik','Peter','Thomas','Martin','Jesper','Morten','Simon','Mathias','Tobias','Lasse','Jakob','Asger','Malthe','Viktor','Aksel','Laurits','Carl','William','Noah','Oscar','Elias','Villads','Bertil','Esben','Troels','Torben','Ulrik','Niels','Kristian','Bjarke'],
       f:['Anna','Emma','Ida','Freja','Clara','Laura','Sofie','Mathilde','Cecilie','Line','Julie','Maja','Signe','Astrid','Karoline','Josefine','Mette','Camilla','Louise','Katrine','Marie','Pernille','Sara','Christina','Rikke','Tove','Nanna','Ingrid','Johanne','Alberte','Agnes','Esther','Karla','Liva','Sigrid','Silje','Dorthe','Hanne','Lise','Birgitte','Ellen','Vigga','Asta','Merete'],
       n:['Jensen','Nielsen','Hansen','Pedersen','Andersen','Christensen','Larsen','Sørensen','Rasmussen','Jørgensen','Petersen','Madsen','Kristensen','Olsen','Thomsen','Christiansen','Poulsen','Johansen','Møller','Mortensen','Knudsen','Jakobsen','Mikkelsen','Olesen','Frederiksen','Laursen','Henriksen','Lund','Schmidt','Eriksen','Holm','Kristiansen','Clausen','Simonsen','Svendsen','Andreasen','Iversen','Østergaard','Jeppesen','Vestergaard','Nissen','Lauridsen','Kjær','Jepsen','Mogensen','Bach','Thygesen','Friis','Dahl','Bruun','Lind','Skov','Damgaard','Brandt','Juhl','Toft','Holst','Bang','Krogh','Winther','Overgaard','Bundgaard','Thorsen','Kirkegaard','Rask','Lykke','Ravn','Gregersen','Mathiesen','Bertelsen','Fisker','Hald','Kofoed','Wulff','Egholm','Kjeldsen']},
  SWE:{h:['Erik','Lars','Karl','Anders','Johan','Per','Nils','Lennart','Mikael','Jan','Hans','Olof','Gustav','Axel','Oskar','Viktor','Filip','Emil','Linus','Isak','Hugo','Ludvig','Alexander','Sebastian','Jonas','Fredrik','Henrik','Magnus','Mattias','Andreas','Daniel','Joakim','Niklas','Pontus','Rasmus','Simon','Albin','Elias','Melker','Vilgot','Teodor','Valter','Sixten','Folke','Måns','Björn','Gunnar','Sven'],
       f:['Anna','Eva','Maria','Karin','Sara','Lena','Kerstin','Emma','Ingrid','Linnea','Elin','Ida','Klara','Maja','Ebba','Alva','Wilma','Astrid','Saga','Freja','Elsa','Alice','Julia','Moa','Matilda','Tilda','Hanna','Johanna','Sofia','Frida','Josefin','Malin','Therese','Jenny','Amanda','Lovisa','Agnes','Signe','Tove','Stina','Märta','Greta','Sigrid','Selma','Vera'],
       n:['Andersson','Johansson','Karlsson','Nilsson','Eriksson','Larsson','Olsson','Persson','Svensson','Gustafsson','Pettersson','Jonsson','Jansson','Hansson','Bengtsson','Jönsson','Lindberg','Jakobsson','Magnusson','Lindström','Olofsson','Lindqvist','Lindgren','Berg','Axelsson','Bergström','Lundberg','Lind','Lundgren','Lundqvist','Mattsson','Berglund','Fredriksson','Sandberg','Henriksson','Forsberg','Sjöberg','Wallin','Engström','Eklund','Danielsson','Lundin','Håkansson','Björk','Bergman','Gunnarsson','Holm','Wikström','Samuelsson','Isaksson','Fransson','Bergqvist','Nyström','Holmberg','Arvidsson','Löfgren','Söderberg','Nyberg','Blomqvist','Claesson','Nordström','Mårtensson','Lundström','Viklund','Björklund','Eliasson','Pålsson','Berggren','Sandström','Lund','Nordin','Ström','Åberg','Hermansson','Ekström','Holmgren','Sundberg','Hedlund','Dahlberg','Hellström','Sjögren','Abrahamsson','Falk','Öberg','Ek']},
  NOR:{h:['Ole','Lars','Jan','Per','Bjørn','Kjell','Svein','Arne','Knut','Hans','Geir','Tor','Terje','Morten','Rune','Trond','Espen','Øyvind','Eirik','Håkon','Sindre','Magnus','Sander','Jonas','Henrik','Kristian','Martin','Andreas','Even','Vegard','Aksel','Mathias','Tobias','Fredrik','Sigurd','Halvor','Torstein','Erlend','Audun','Gaute','Ivar','Leif','Steinar','Vidar','Ulrik','Kasper','Jørgen'],
       f:['Anne','Inger','Kari','Marit','Ingrid','Liv','Eva','Berit','Astrid','Bjørg','Hilde','Anna','Solveig','Marianne','Randi','Ida','Silje','Hege','Tone','Nina','Kristin','Ragnhild','Ingeborg','Sigrid','Synnøve','Guro','Tuva','Thea','Nora','Emma','Sara','Maja','Ingvild','Live','Selma','Frida','Oda','Mathilde','Vilde','Hedda','Tiril','Mari','Siri','Torunn','Aud','Sunniva'],
       n:['Hansen','Johansen','Olsen','Larsen','Andersen','Pedersen','Nilsen','Kristiansen','Jensen','Karlsen','Johnsen','Pettersen','Eriksen','Berg','Haugen','Hagen','Johannessen','Andreassen','Jacobsen','Dahl','Jørgensen','Halvorsen','Henriksen','Lund','Sørensen','Jakobsen','Moen','Gundersen','Iversen','Strand','Solberg','Svendsen','Eide','Knutsen','Martinsen','Paulsen','Bakken','Kristoffersen','Mathisen','Lie','Amundsen','Rasmussen','Solheim','Ruud','Kristensen','Bakke','Myhre','Sæther','Lunde','Tangen','Hauge','Fredriksen','Vik','Holm','Haugland','Aas','Bøe','Ødegård','Nygård','Nordby','Brekke','Sandvik','Lien','Fjeld','Aasen','Strøm','Moe','Tveit','Rønning','Vold','Hovland','Sunde','Berge','Engen','Midtbø','Rønningen']},
  FIN:{h:['Juha','Timo','Matti','Kari','Mikko','Jari','Antti','Jukka','Mika','Markku','Pekka','Hannu','Heikki','Seppo','Janne','Ari','Sami','Petri','Ville','Tuomas','Jussi','Lauri','Eero','Aleksi','Joonas','Onni','Väinö','Eino','Leevi','Elias','Oliver','Aatu','Veeti','Niilo','Otto','Akseli','Kasper','Joel','Arttu','Riku','Teemu','Toni','Olli','Jarkko','Ilkka','Esa','Tapio'],
       f:['Anna','Maria','Liisa','Hanna','Elina','Johanna','Laura','Tiina','Sari','Päivi','Riikka','Minna','Satu','Kaisa','Heidi','Katja','Anu','Emilia','Aino','Helmi','Sofia','Ellen','Venla','Eevi','Aada','Lilja','Iida','Siiri','Pihla','Noora','Ella','Oona','Veera','Inka','Milla','Nelli','Saara','Tuuli','Kirsi','Marjut','Leena','Pirjo','Hilkka','Aili','Sanni'],
       n:['Korhonen','Virtanen','Mäkinen','Nieminen','Mäkelä','Hämäläinen','Laine','Heikkinen','Koskinen','Järvinen','Lehtonen','Lehtinen','Saarinen','Salminen','Heinonen','Niemi','Heikkilä','Kinnunen','Salonen','Turunen','Salo','Laitinen','Tuominen','Rantanen','Karjalainen','Jokinen','Mattila','Savolainen','Lahtinen','Ahonen','Hiltunen','Hirvonen','Lindholm','Leppänen','Kallio','Väisänen','Miettinen','Aaltonen','Manninen','Pitkänen','Lappalainen','Seppälä','Huttunen','Ojala','Kauppinen','Laaksonen','Kettunen','Hakala','Leinonen','Mustonen','Toivonen','Räsänen','Peltonen','Rautio','Kivelä','Halonen','Koivisto','Vainio','Hyvönen','Pesonen','Honkanen','Anttila','Niskanen','Laakso','Suominen','Rinne','Kokkonen','Lundqvist','Eskola','Valtonen','Ikonen','Partanen','Hakkarainen','Korpela']},
  ISL:{h:['Jón','Sigurður','Guðmundur','Gunnar','Ólafur','Einar','Kristján','Magnús','Stefán','Jóhann','Björn','Árni','Þórður','Halldór','Ragnar','Bjarni','Helgi','Pétur','Sveinn','Haraldur','Jónas','Ari','Aron','Atli','Birkir','Davíð','Egill','Elías','Emil','Gylfi','Hannes','Hörður','Ingi','Kári','Logi','Orri','Rúnar','Sindri','Snorri','Tómas','Viktor','Þór','Ásgeir','Hilmar'],
       f:['Guðrún','Anna','Sigríður','Kristín','Margrét','Helga','Sigrún','Ingibjörg','María','Jóhanna','Katrín','Ragnheiður','Elín','Hildur','Þórunn','Ásta','Erla','Eva','Hrefna','Lilja','Sara','Sólveig','Embla','Hekla','Freyja','Saga','Ylfa','Iðunn','Rakel','Agnes','Brynja','Dagný','Elísabet','Hulda','Íris','Karen','Una','Védís','Þóra','Unnur','Bryndís','Gerður','Arna','Edda'],
       n:['Jónsson','Sigurðsson','Guðmundsson','Gunnarsson','Ólafsson','Einarsson','Kristjánsson','Magnússon','Stefánsson','Jóhannsson','Björnsson','Árnason','Þórðarson','Halldórsson','Ragnarsson','Bjarnason','Helgason','Pétursson','Sveinsson','Haraldsson','Jónasson','Arason','Atlason','Birkisson','Davíðsson','Egilsson','Gylfason','Hannesson','Harðarson','Ingason','Kárason','Logason','Orrason','Rúnarsson','Snorrason','Tómasson','Viktorsson','Þórsson','Ásgeirsson','Hilmarsson','Jónsdóttir','Sigurðardóttir','Guðmundsdóttir','Gunnarsdóttir','Ólafsdóttir','Einarsdóttir','Kristjánsdóttir','Magnúsdóttir','Stefánsdóttir','Jóhannsdóttir','Björnsdóttir','Árnadóttir','Halldórsdóttir','Ragnarsdóttir','Bjarnadóttir','Helgadóttir','Pétursdóttir','Sveinsdóttir','Haraldsdóttir','Hannesdóttir','Snorradóttir','Egilsdóttir']},
  GER:{h:['Lukas','Leon','Finn','Jonas','Paul','Felix','Maximilian','Elias','Ben','Noah','Luca','Tim','Jan','Niklas','Moritz','Philipp','Julian','Tobias','Florian','Sebastian','Fabian','Dominik','Matthias','Stefan','Andreas','Michael','Thomas','Markus','Christian','Daniel','Alexander','Johannes','Simon','David','Erik','Anton','Emil','Jakob','Konstantin','Leonhard','Valentin','Benedikt','Kilian','Lennart','Henrik','Theo','Mats','Jannik','Torben'],
       f:['Anna','Lena','Lea','Laura','Hannah','Leonie','Sophie','Marie','Julia','Lisa','Sarah','Katharina','Johanna','Lara','Mia','Emma','Clara','Charlotte','Ida','Paula','Greta','Frieda','Mathilda','Nele','Pia','Jana','Franziska','Theresa','Christina','Sabine','Petra','Andrea','Stefanie','Melanie','Nicole','Kerstin','Anja','Vanessa','Svenja','Annika','Jule','Luisa','Antonia','Helene','Magdalena','Elisa','Merle'],
       n:['Müller','Schmidt','Schneider','Fischer','Weber','Meyer','Wagner','Becker','Schulz','Hoffmann','Schäfer','Koch','Bauer','Richter','Klein','Wolf','Schröder','Neumann','Schwarz','Zimmermann','Braun','Krüger','Hofmann','Hartmann','Lange','Schmitt','Werner','Schmitz','Krause','Meier','Lehmann','Schmid','Schulze','Maier','Köhler','Herrmann','König','Walter','Mayer','Huber','Kaiser','Fuchs','Peters','Lang','Scholz','Möller','Weiß','Jung','Hahn','Schubert','Vogel','Friedrich','Keller','Günther','Frank','Berger','Winkler','Roth','Beck','Lorenz','Baumann','Franke','Albrecht','Schuster','Simon','Ludwig','Böhm','Winter','Kraus','Martin','Schumacher','Krämer','Vogt','Stein','Jäger','Otto','Sommer','Groß','Seidel','Heinrich','Brandt','Haas','Schreiber','Graf','Dietrich','Ziegler','Kuhn','Kühn','Pohl','Engel','Horn','Busch','Bergmann','Thomas','Voigt','Sauer','Arnold']},
  NED:{h:['Daan','Sem','Lucas','Levi','Finn','Milan','Jesse','Thijs','Bram','Ruben','Lars','Stijn','Tim','Niels','Jasper','Wouter','Joost','Pieter','Maarten','Bas','Sander','Koen','Jeroen','Rik','Floris','Gijs','Teun','Siem','Mees','Luuk','Thomas','Hidde','Jelle','Sjoerd','Joris','Willem','Hendrik','Dirk','Gerrit','Bart','Roel','Tygo','Jurre','Wessel','Mats'],
       f:['Emma','Julia','Sophie','Lotte','Fleur','Sanne','Anouk','Lisa','Eva','Femke','Iris','Noor','Tess','Sara','Lieke','Isa','Fenna','Jet','Roos','Maud','Vera','Marloes','Esther','Ingrid','Annemiek','Wendy','Linda','Mirjam','Floor','Nina','Lynn','Saar','Yara','Evi','Liv','Mila','Puck','Hanna','Merel','Ilse','Romy','Demi','Anne','Maartje','Nienke'],
       n:['de Jong','Jansen','de Vries','van den Berg','van Dijk','Bakker','Janssen','Visser','Smit','Meijer','de Boer','Mulder','de Groot','Bos','Vos','Peters','Hendriks','van Leeuwen','Dekker','Brouwer','de Wit','Dijkstra','Smits','de Graaf','van der Meer','van der Linden','Kok','Jacobs','de Haan','Vermeulen','van den Heuvel','van der Veen','van den Broek','de Bruijn','de Bruin','van der Heijden','Schouten','van Beek','Willems','van Vliet','van de Ven','Hoekstra','Maas','Verhoeven','Koster','van Dam','van der Wal','Prins','Blom','Huisman','Peeters','de Jonge','Kuipers','van Veen','Post','Kuiper','Veenstra','Kramer','van den Brink','Scholten','van Wijk','Postma','Martens','Vink','de Ruiter','Timmermans','Groen','Gerritsen','Jonker','van Loon','Boer','van der Velde','Willemsen','Smeets','Lammers']},
  BEL:{h:['Lucas','Louis','Noah','Arthur','Jules','Victor','Adam','Liam','Mathis','Nathan','Hugo','Thomas','Maxime','Simon','Arnaud','Julien','Nicolas','Antoine','Guillaume','Pieter','Jens','Wout','Lander','Seppe','Robbe','Thibault','Bert','Stijn','Tom','Koen','Jef','Wannes','Matthias','Michiel','Bram','Kobe','Siebe','Cédric','Grégory','Benoît','Olivier','Sébastien','Laurent','Xavier','Dries'],
       f:['Emma','Olivia','Louise','Mila','Alice','Juliette','Elena','Camille','Lina','Marie','Lotte','Fien','Nore','Lien','Jana','Ellen','Hanne','Elise','Charlotte','Manon','Chloé','Laura','Sarah','Julie','Lisa','Amélie','Noémie','Céline','Sofie','Leen','Ine','Eline','Kaat','Margot','Febe','Roos','Anaïs','Pauline','Mathilde','Valérie','Nathalie','Isabelle','Delphine','Hélène','Annelies'],
       n:['Peeters','Janssens','Maes','Jacobs','Mertens','Willems','Claes','Goossens','Wouters','De Smet','Dubois','Lambert','Dupont','Martin','Simon','Leclercq','Dumont','Laurent','Lemaire','Renard','Michel','Mathieu','Lejeune','Gérard','Denis','Hermans','Aerts','Pauwels','Smets','Vermeulen','Van Damme','De Backer','Verbeke','Desmet','Vandenberghe','Declercq','Wuyts','Coppens','Michiels','Hendrickx','Martens','Lemmens','Bogaert','Cools','Segers','Vervoort','Stevens','Baert','Verstraete','Moens','Delvaux','Collard','Lecomte','Piron','Wauters','Gilson','Dethier','Fontaine','Henrard','Lenaerts','Verhaegen','Van Hoof','Geerts','Van de Velde','Vandamme','Sterckx','Thys']},
  LUX:{h:['Luca','Noah','Gabriel','Léo','Tom','Ben','Max','Liam','Mathis','Jules','Paul','Nico','Lucas','Tim','Leon','Felix','Luc','Marc','Jean','Pierre','Laurent','Philippe','Michel','Patrick','Gilles','Yves','Claude','Joé','Charel','Gil','Jang','Pit','Mil','Raoul','Jeff','Steve','Sven','Kevin','Pol','Lex','Mike','Ricardo','Tiago','Jos'],
       f:['Emma','Léa','Mia','Sophie','Lara','Lena','Zoé','Chloé','Laura','Julie','Sarah','Anne','Marie','Claire','Sandra','Nathalie','Martine','Carole','Isabelle','Monique','Christiane','Nadine','Joëlle','Josiane','Fabienne','Michèle','Lynn','Lisa','Elena','Nora','Tessy','Lily','Romy','Maïté','Jil','Liz','Kim','Mandy','Sandy','Tania','Ana','Inês','Beatriz','Rita','Sylvie'],
       n:['Schmit','Muller','Weber','Wagner','Hoffmann','Thill','Schmitz','Klein','Becker','Kremer','Meyer','Schroeder','Reuter','Kieffer','Hansen','Ries','Welter','Majerus','Feller','Wolff','Bertemes','Faber','Simon','Steffen','Peters','Hilbert','Bauler','Kayser','Weis','Kohn','Mangen','Zeimet','Lentz','Frising','Theis','Goergen','Schiltz','Nilles','Jacoby','Gaasch','Heinen','Reding','Wirtz','Goedert','Hoss','Thein','Back','Biver','Krier','Frisch','Hentges','Flammang','Ewen','Kirsch','Dos Santos','Ferreira','Da Silva','Pereira','Gonçalves']},
  POL:{h:['Jakub','Kacper','Szymon','Filip','Jan','Mateusz','Bartosz','Michał','Wojciech','Piotr','Paweł','Tomasz','Krzysztof','Marcin','Łukasz','Adam','Dawid','Kamil','Rafał','Grzegorz','Maciej','Damian','Sebastian','Patryk','Hubert','Igor','Oskar','Wiktor','Antoni','Franciszek','Aleksander','Stanisław','Tymon','Ignacy','Bruno','Leon','Mikołaj','Dominik','Karol','Konrad','Artur','Daniel','Przemysław','Zbigniew','Jarosław'],
       f:['Zuzanna','Julia','Maja','Zofia','Hanna','Lena','Alicja','Maria','Amelia','Oliwia','Wiktoria','Natalia','Aleksandra','Agnieszka','Katarzyna','Magdalena','Joanna','Anna','Małgorzata','Ewa','Monika','Karolina','Paulina','Dominika','Martyna','Weronika','Kinga','Marta','Justyna','Patrycja','Gabriela','Laura','Emilia','Pola','Nina','Liliana','Antonina','Iga','Helena','Barbara','Dorota','Beata','Izabela','Klaudia','Sylwia'],
       n:['Nowak','Kowalski','Wiśniewski','Wójcik','Kowalczyk','Kamiński','Lewandowski','Zieliński','Szymański','Woźniak','Dąbrowski','Kozłowski','Jankowski','Mazur','Wojciechowski','Kwiatkowski','Krawczyk','Kaczmarek','Piotrowski','Grabowski','Zając','Pawłowski','Michalski','Król','Wieczorek','Jabłoński','Wróbel','Nowakowski','Majewski','Olszewski','Stępień','Malinowski','Jaworski','Adamczyk','Dudek','Nowicki','Pawlak','Górski','Witkowski','Walczak','Sikora','Baran','Rutkowski','Michalak','Szewczyk','Ostrowski','Tomaszewski','Pietrzak','Zalewski','Wróblewski','Marciniak','Jasiński','Zawadzki','Bąk','Jakubowski','Sadowski','Duda','Włodarczyk','Wilk','Chmielewski','Borkowski','Sokołowski','Szczepański','Sawicki','Lis','Kucharski','Kalinowski','Wysocki','Mazurek','Kubiak','Kołodziej','Czarnecki']},
  AUT:{h:['Lukas','Tobias','David','Jakob','Maximilian','Elias','Paul','Felix','Simon','Julian','Florian','Fabian','Stefan','Thomas','Michael','Andreas','Markus','Christoph','Martin','Manuel','Patrick','Dominik','Matthias','Bernhard','Georg','Johannes','Clemens','Valentin','Leopold','Ferdinand','Konstantin','Raphael','Moritz','Noah','Jonas','Leon','Anton','Emil','Vinzenz','Benedikt','Lorenz','Theodor','Gregor','Severin','Quirin'],
       f:['Anna','Hannah','Sophie','Lena','Marie','Laura','Lea','Julia','Sarah','Katharina','Johanna','Magdalena','Theresa','Elisabeth','Valentina','Emilia','Lina','Mia','Emma','Leonie','Christina','Barbara','Andrea','Sabine','Petra','Claudia','Martina','Verena','Teresa','Franziska','Viktoria','Antonia','Rosa','Paulina','Helena','Klara','Ida','Amelie','Leni','Marlene','Romana','Gertraud','Hemma','Waltraud','Ingrid'],
       n:['Gruber','Huber','Bauer','Wagner','Müller','Pichler','Steiner','Moser','Mayer','Hofer','Leitner','Berger','Fuchs','Eder','Fischer','Schmid','Winkler','Weber','Schwarz','Maier','Schneider','Reiter','Mayr','Schmidt','Wimmer','Egger','Brunner','Lang','Baumgartner','Auer','Binder','Lechner','Wolf','Wallner','Aigner','Ebner','Koller','Lehner','Haas','Schuster','Holzer','Lackner','Wieser','Strasser','Pirker','Hofmann','Stadler','Riegler','Pfeiffer','Kofler','Rainer','Hauser','Grabner','Kaiser','Unterberger','Kogler','Hackl','Pölzl','Gasser','Hinterberger','Ortner','Zauner','Kern','Mader','Prem','Thaler']},
  CZE:{h:['Jakub','Jan','Tomáš','Lukáš','Matěj','Adam','Ondřej','Vojtěch','Filip','David','Petr','Martin','Pavel','Jiří','Josef','Karel','Václav','Michal','Marek','Radek','Roman','Zdeněk','Milan','Vladimír','Miroslav','Daniel','Dominik','Šimon','Antonín','Tadeáš','Kryštof','Viktor','Štěpán','Prokop','Vít','Matyáš','Kamil','Aleš','Libor','Dalibor','Bohumil','Jaromír','Ladislav','Oldřich'],
       f:['Eliška','Tereza','Anna','Adéla','Natálie','Karolína','Kristýna','Barbora','Klára','Lucie','Kateřina','Veronika','Michaela','Markéta','Petra','Jana','Lenka','Hana','Zuzana','Monika','Simona','Alena','Ivana','Martina','Šárka','Pavla','Vendula','Nikola','Sofie','Viktorie','Amálie','Julie','Ema','Rozálie','Magdaléna','Bára','Laura','Linda','Daniela','Denisa','Dagmar','Radka','Blanka','Věra','Libuše'],
       n:['Novák','Svoboda','Novotný','Dvořák','Černý','Procházka','Kučera','Veselý','Horák','Němec','Marek','Pospíšil','Pokorný','Hájek','Král','Jelínek','Růžička','Beneš','Fiala','Sedláček','Doležal','Zeman','Kolář','Navrátil','Čermák','Vaněk','Urban','Blažek','Kříž','Kovář','Kratochvíl','Bartoš','Vlček','Polák','Musil','Kopecký','Šimek','Konečný','Malý','Holub','Štěpánek','Čech','Kadlec','Staněk','Dostál','Soukup','Šťastný','Mareš','Moravec','Sýkora','Tichý','Valenta','Vávra','Matoušek','Říha','Bureš','Ševčík','Hruška','Mašek','Pavlík','Janda','Hrubý','Mach','Dušek','Šebesta','Skála','Tůma','Kopal','Štěpán']},
};
for (const N of Object.values(NOMS)) N.p = [...N.h, ...N.f];

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
/* [nom, jours min, jours max, poids]. v98 : durées allongées — une blessure sur deux environ fait manquer au moins un match
   (la semaine du match compte déjà 7 jours de soins). Les 4 premières servent aussi aux blessures d'entraînement (plafonnées à 12 jours). */
const BLESSURES = [
  ['Contusion à l\'épaule', 2, 6, 25], ['Doigts retournés par un cognard', 6, 14, 16], ['Entorse du poignet', 10, 24, 14], ['Côtes froissées', 12, 28, 10],
  ['Commotion légère (voit des vifs d\'or partout)', 9, 20, 9], ['Cheville tordue à l\'atterrissage', 10, 26, 10], ['Claquage en plein piqué', 14, 35, 6],
  ['Clavicule fêlée', 28, 56, 5], ['Fracture du bras', 42, 84, 3], ['Ligaments du genou arrachés à l\'atterrissage', 70, 140, 1],
  ['Torticolis de piqué', 3, 8, 10], ['Brûlure d\'échardes de balai', 1, 4, 8],
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
  banc:5,                         // v86 : 7 titulaires + 5 remplaçants (3 changements par match)
  niveauMin:10, niveauMax:12.6,   // niveau moyen des titulaires (sur 20) du club le moins réputé (40) au plus réputé (85)
  points:{but:10, vif:150, victoire:3, nul:1},
  pas:15,                       // secondes de jeu par pas
  echelleTir:6,               // s dans P(tir) = 1 / (1 + e^(−(A − D) / s))
  baseTir:-0.7,                    // décalage de la sigmoïde
  baseBut:0.385, kBut:0.022, butMin:0.10, butMax:0.80,   // v89 : baseBut 0,40 avant les dispositions et les zones d'attaque
  garde:0.55,                   // possession gardée après une action sans tir
  cognard:0.05, blessure:0.035, faute:0.004, fauteGrave:0.12, penalty:0.70,
  vifApparitionMin:20, vifApparitionMax:50, p0:0.00245, vifRef:13, vifCache:0.008, vifMaxMin:240,
  fatigue:0.09, domicile:1.05, jour:0.05,   // jour : forme du jour d'une équipe (écart type)
  refus:0.8,                    // attrapeur « seulement si ça fait gagner » : refuse la prise perdante (+ décisions)
  /* v84 : économie (Gallions fictifs). Salaire hebdomadaire = base × facteur^(note sur 20 − pivot) × (0,85 + réputation du club / 250) */
  eco:{semaines:44, salaireBase:2500, salaireFacteur:1.6, salairePivot:9, valeurAns:2.4,
       tv:2.4e6, tvRep:20e3,   /* v113 : 1,3e6 et 15e3 avant : les petits clubs démarraient à 85-90 % du plafond, sans marge pour recruter */
       sponsors:0.2e6, sponsorsRep:3.0e6, merch:1.8e6, repasBase:3, entretien:1.2, deplacement:12e3, prime:25e3,
       masse:0.9, staffBase:600, staffFacteur:1.25, effectifMax:22, effectifMin:14, libresMax:60},
  /* v84 : entraînement (progression par semaine) et cohésion */
  ent:{semaines:35, focus:1.7, horsFocus:0.55, cible:1.3, autre:0.6, joue:0.3, intensite:[0.7, 1, 1.3], fatigue:[0, 4, 9], blessure:0.001, cohesion:70},
  charge:{match:0.5, plancher:0.6, baisse:0.25, fixe:2.5, repos:9, entrainement:0.4},   // v96 : fatigue cumulée (voir QM.recuperer)
  usure:1.2,                    // usure des balais par match (sur 100)
  /* v85 : stade et installations (niveaux 1 à 5 ; coût du niveau suivant = base × niveau actuel ; entretien par niveau et par semaine) */
  stade:{tranche:2000, coutPlace:600, semaines:8, max:60000},
  inst:{boutique:{base:400e3, entretien:500, semaines:4}, buvettes:{base:300e3, entretien:400, semaines:3}, tribunes:{base:800e3, entretien:800, semaines:8}, formation:{base:600e3, entretien:1200, semaines:6}},
  /* v85 : carrière */
  carriere:{repSelection:70, licenciement:5, offreSemaine:0.05, chomageOffre:0.6, academieMax:12},
  /* v88 : domaine du club. Bâtiments (niveau 1 à 5) : coût du niveau suivant = base × niveau actuel, entretien par niveau et par semaine.
     boutique, buvettes, tribunes (= le stade) et formation reprennent les réglages de « inst » ci-dessus. */
  bat:{infirmerie:{base:350e3, entretien:300, semaines:4}, aire:{base:450e3, entretien:350, semaines:5}, hangar:{base:250e3, entretien:200, semaines:3},
       salle:{base:250e3, entretien:200, semaines:3}, voliere:{base:200e3, entretien:150, semaines:3}, divination:{base:300e3, entretien:200, semaines:4},
       trophees:{base:300e3, entretien:150, semaines:4}, residence:{base:400e3, entretien:300, semaines:5}},
  partenaires:{maillot:0.7, panneaux:0.3, offres:3, panneauxBase:4},   // part des sponsors : maillot 70 %, panneaux 30 % (tous vendus)
  supporters:{depart:60, equilibre:55},
  banque:{tauxMin:0.03, tauxMax:0.09, maxRevenus:0.6, frais:0.02},
  evenements:0.04,              // chance d'un petit événement au domaine chaque semaine
};

/* v84 : staff du club : [clé, nom, groupe entraîné] */
const STAFF = [['entP', 'Entraîneur des poursuiveurs', 'P'], ['entB', 'Entraîneur des batteurs', 'B'], ['entA', 'Entraîneur des attrapeurs', 'A'], ['entG', 'Entraîneur des gardiens', 'G'],
  ['prepa', 'Préparateur physique', ''], ['medecin', 'Médecin', ''], ['recruteur', 'Recruteur', ''], ['formation', 'Responsable de la formation', '']];   // v85 : formation
const EFFETS_STAFF = {entP:'progression des poursuiveurs', entB:'progression des batteurs', entA:'progression des attrapeurs', entG:'progression des gardiens',
  prepa:'physique, récupération, déclin plus lent', medecin:'durée des blessures', recruteur:'estimation du potentiel et des notes au mercato', formation:'potentiel et progrès des jeunes du centre'};
/* v85 : installations du stade */
const INSTALLATIONS = [['boutique', 'Boutique', 'Recettes de la boutique'], ['buvettes', 'Buvettes', 'Recettes de restauration par spectateur'],
  ['tribunes', 'Tribunes couvertes', 'Remplissage du stade'], ['formation', 'Centre de formation', 'Nombre et qualité des jeunes chaque été']];
/* v88 : bâtiments du domaine. [clé, nom, icône du plan, ce que fait chaque niveau, vue ouverte depuis le bâtiment,
   améliorations au choix au niveau 3 puis au niveau 5 : [clé, nom, effet]]. La clé « tribunes » est le stade (capacité à part). */
const BATIMENTS = [
  ['tribunes', 'Stade', 'stade', 'Tribunes couvertes : le stade se remplit mieux (+2 % par niveau au-dessus de 2).', 'stade',
    [['loges', 'Loges des mécènes', 'Recettes VIP à chaque match à domicile.'], ['ecran', 'Écran géant enchanté', 'Affluence +4 %.']],
    [['lanternes', 'Lanternes féeriques', 'Matchs en soirée : billetterie +10 %.'], ['dragon', 'Dragon de pierre gardien', 'Avantage du terrain +2 %.']]],
  ['boutique', 'Bazar du club', 'bazar', 'Recettes de la boutique (×0,85 au niveau 1, ×1,45 au niveau 5) et un produit de plus en rayon par niveau.', 'boutique',
    [['hibou', 'Vente par hibou', 'La boutique vend aussi les semaines sans match à domicile (+25 %).'], ['atelier', 'Atelier de maillots', 'Nouveau produit : maillots éditions spéciales.']],
    [['echarpes', 'Écharpes qui changent de couleur', 'Nouveau produit vedette.'], ['chocolat', 'Vifs d\'or en chocolat', 'Nouveau produit vedette.']]],
  ['buvettes', 'Taverne du stade', 'taverne', 'Recettes de restauration par spectateur (×0,85 au niveau 1, ×1,45 au niveau 5).', null,
    [['chaudron', 'Chaudron géant', 'Restauration +15 %.'], ['ouverte', 'Taverne ouverte en semaine', 'Recettes même sans match à domicile.']],
    [['hydromel', 'Hydromel maison', 'Restauration +15 %, les supporters adorent.'], ['banquets', 'Banquets d\'après-match', 'Recettes VIP après les victoires à domicile.']]],
  ['formation', 'Pensionnat des jeunes ailes', 'pensionnat', 'Centre de formation : plus de jeunes chaque été, et de meilleurs.', 'formation',
    [['dortoirs', 'Dortoirs agrandis', '2 places de plus au centre.'], ['terrain', 'Terrain miniature', 'Les jeunes du centre progressent 25 % plus vite.']],
    [['detection', 'Réseau de détection dans les écoles', 'Chaque été, un des nouveaux est un prodige.'], ['bourses', 'Bourses d\'études', 'Un jeune de plus chaque été.']]],
  ['infirmerie', 'Infirmerie', 'infirmerie', 'Blessures plus courtes : −6 % par niveau.', 'infirmerie',
    [['serre', 'Serre de plantes médicinales', 'Blessures légères (10 jours ou moins) : 3 jours de moins.'], ['bains', 'Bains chauds enchantés', 'La fatigue part 25 % plus vite.']],
    [['apothicaire', 'Apothicaire attitré', 'Une potion de forme par mois (fiche du joueur).'], ['guerisseur', 'Guérisseur réputé', 'Blessures graves (plus de 3 semaines) : −30 %.']]],
  ['aire', 'Aire d\'envol', 'aire', 'Terrain d\'entraînement : progression de tous (+4 % par niveau au-dessus de 2).', 'entrainement',
    [['anneaux', 'Anneaux mobiles', 'Poursuiveurs et gardiens : +10 % de progression.'], ['cognards', 'Cognards apprivoisés', 'Batteurs : +15 % de progression.']],
    [['brumes', 'Vents et brumes artificiels', 'La météo gêne deux fois moins ton équipe.'], ['vifs', 'Volière à vifs d\'or d\'exercice', 'Attrapeurs : +20 % de progression.']]],
  ['hangar', 'Hangar à balais', 'hangar', 'Balais mieux entretenus : vitesse et maniabilité (+0,3 par niveau au-dessus de 2).', 'balais',
    [['etabli', 'Établi d\'artisan', 'Balais neufs 25 % moins chers.'], ['vernis', 'Vernis anti-usure', 'Les balais s\'usent deux fois moins vite.']],
    [['fabricant', 'Contrat avec un fabricant', '16 000 Gallions de sponsoring par saison.'], ['prototype', 'Prototype maison', 'Un balai unique : +1 partout.']]],
  ['salle', 'Salle commune', 'salle', 'Vestiaires : la cohésion monte plus vite (+0,25 par semaine et par niveau au-dessus de 2).', 'tactique',
    [['cheminee', 'Cheminée et fauteuils', 'Le moral baisse moins après une défaite.'], ['tableau', 'Tableau noir enchanté', 'Cohésion +0,5 par semaine.']],
    [['portraits', 'Portraits des légendes du club', 'Moral de l\'équipe en hausse à domicile.'], ['jeunes', 'Coin des jeunes', 'Les moins de 22 ans progressent 10 % plus vite.']]],
  ['voliere', 'Volière à hiboux', 'voliere', 'Recrutement : ton recruteur estime mieux le potentiel (+1,5 par niveau au-dessus de 2).', 'mercato',
    [['grandsducs', 'Grands-ducs voyageurs', 'Les clubs vendeurs demandent 8 % de moins.'], ['correspondants', 'Correspondants à l\'étranger', 'Estimations encore plus justes (+3).']],
    [['espion', 'Hibou espion', 'Composition adverse connue avant chaque match.'], ['agent', 'Agent attitré', 'Salaires demandés 10 % plus bas.']]],
  ['divination', 'Cabinet de divination', 'divination', 'Rapport sur l\'adversaire avant chaque match : plus de détails à chaque niveau.', null,
    [['boule', 'Boule de cristal', 'La météo du prochain match est connue une semaine avant.'], ['pensine', 'Pensine des matchs', 'Cohésion +1 après chaque match.']],
    [['astres', 'Carte du ciel', 'Force +1,5 % contre les 4 premiers du classement.'], ['prophetie', 'Prophétie du vif', 'Ton attrapeur +3 % sur le vif d\'or.']]],
  ['trophees', 'Salle des trophées', 'trophees', 'Visites payantes chaque semaine, selon le niveau et le palmarès.', 'trophees',
    [['fantome', 'Guide-fantôme', 'Visites 50 % plus chères.'], ['archives', 'Archives du club', 'Réputation +1 à chaque titre, les supporters s\'en souviennent.']],
    [['musee', 'Musée du Quidditch', 'Visites doublées.'], ['legendes', 'Allée des légendes', 'Supporters +1 par mois.']]],
  ['residence', 'Résidence des joueurs', 'residence', 'La fatigue part plus vite (+4 % par niveau au-dessus de 1).', null,
    [['chambres', 'Chambres insonorisées', 'La fatigue part encore 15 % plus vite.'], ['jardin', 'Jardin d\'hiver', 'Le moral remonte plus vite chaque semaine.']],
    [['manoir', 'Manoir des stars', 'Salaires demandés 5 % plus bas, les vedettes aiment venir.'], ['spa', 'Thermes du club', 'Blessures −10 % et fatigue −10 %.']]],
];
/* v89 : manies des joueurs : [clé, nom, postes, effet, attributs qui la rendent probable] */
const MANIES = [
  ['loin', 'Tire de loin', 'P', 'Tente plus souvent sa chance, de plus loin.', ['tir', 'pre']],
  ['passeur', 'Cherche la passe', 'P', 'Fait mieux jouer les autres poursuiveurs.', ['pas', 'vis']],
  ['provoc', 'Provoque les fautes', 'P', 'Les défenseurs commettent plus de fautes sur lui.', ['agi', 'cou']],
  ['cogneur', 'Frappe à boulet rouge', 'B', 'Ses cognards blessent plus souvent.', ['fra', 'for']],
  ['garde', 'Garde du corps', 'B', 'Protège le porteur du souafle des cognards.', ['pla', 'equi']],
  ['feinte', 'Feinte de Wronski', 'A', 'Un peu plus dangereux sur le vif d\'or.', ['piq', 'san']],
  ['oeil', 'Œil de lynx', 'A', 'Repère le vif d\'or plus vite.', ['acu', 'con']],
  ['mur', 'Reste sur sa ligne', 'G', 'Meilleur sur les tirs de près.', ['pla', 'ref']],
  ['relance', 'Relance vite', 'G', 'Après un arrêt, son équipe garde mieux le souafle.', ['vis', 'pas']],
  ['tete', 'Tête brûlée', 'PBAG', 'Commet plus de fautes en défense, mais ne lâche rien.', ['agr', 'cou']],
];
/* v88 : produits du Bazar : [clé, nom, attrait, prix unitaire de base (unités internes : 5 = 1 Gallion), amélioration qui le débloque] */
const PRODUITS = [
  ['echarpe', 'Écharpes aux couleurs du club', 1, 15, null], ['maillot', 'Maillots officiels', 1.3, 60, null], ['peluche', 'Vifs d\'or en peluche', 0.9, 18, null],
  ['balai', 'Balais miniatures', 0.8, 25, null], ['chapeau', 'Chapeaux pointus', 0.7, 20, null], ['fanion', 'Fanions et drapeaux', 0.6, 8, null],
  ['edition', 'Maillots éditions spéciales', 1.1, 90, 'atelier'], ['echarpe2', 'Écharpes qui changent de couleur', 1.4, 35, 'echarpes'], ['choco', 'Vifs d\'or en chocolat', 1.2, 6, 'chocolat'],
];
/* v88 : partenaires inventés (sponsor maillot et panneaux) */
const SPONSORS = ['Balais Aquilon', 'Chocolaterie Lune d\'Or', 'La Gazette du Soir', 'Chaudrons Martel', 'Hydromel Brasse-Brume', 'Plumes & Parchemins', 'Thés de la Pythie',
  'Potions Mirabelle', 'Fromagerie des Trois Lunes', 'Assurances Paratonnerre', 'Bottes de Sept Lieues', 'Sorbets Givre-Doux', 'Lunettes Œil-de-Lynx', 'Cheminée Express',
  'Banque des Gobelins', 'Encres Corbeau', 'Grimoires Ardoise', 'Confiserie Feu Follet', 'Ménagerie Griffe & Plume', 'Radio Sorcière FM'];
const EVENEMENTS = [
  ['Un cognard échappé', 'Un cognard s\'est échappé de sa malle et a traversé le toit de la volière. Réparations payées.', -12000],
  ['Inspection du ministère', 'Les inspecteurs du ministère ont trouvé le domaine en ordre et sont repartis les bras chargés d\'écharpes.', 8000],
  ['Tempête sur le domaine', 'Une tempête a arraché deux panneaux publicitaires. Les annonceurs ont été dédommagés.', -6000],
  ['Visite d\'une école', 'Une classe entière est venue visiter le domaine. Les enfants ont dévalisé le Bazar.', 5000],
  ['Lutins dans la taverne', 'Des lutins ont vidé la réserve de la taverne pendant la nuit. Il a fallu tout racheter.', -4000],
  ['Gala de charité', 'Le gala organisé au stade a rapporté un peu d\'argent au club et beaucoup de sympathie.', 10000],
  ['Gnomes au jardin', 'Les gnomes ont retourné la pelouse de l\'aire d\'envol. Un jardinier a dû passer la semaine à les chasser.', -3000],
];
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

root.QMD = {NOMS_CLUBS, VILLES_LANGUES, LANGUES_NOMS, TOURNOI, LDN, AMICAUX, SELECTIONS, LIGUES_ANCIENNES, RESERVE, MANIES, BATIMENTS, PRODUITS, SPONSORS, EVENEMENTS, INSTALLATIONS, STAFF, EFFETS_STAFF, ROLES, FOCUS, INTENSITES, NATIONS, SIX_NATIONS, LIGUES, CLUBS, ORIGINES, NOMS, ATTRS, GARDIEN, CACHES, POSTES, PICS, BALAIS, METEOS, METEO_MOIS, BLESSURES, TEXTES, EQ};
})(typeof window !== 'undefined' ? window : globalThis);
