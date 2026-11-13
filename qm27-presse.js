// mon-ecran-version: 89e4e7fe
/* QM27 (v94) — conférences de presse, sans affichage. Expose window.QMP. Chargé après qm27-vestiaire.js.
   Après chaque match : 1 à 3 questions (réglage), posées par des médias différents et tirées selon le contexte
   (résultat, vif d'or, joueurs du match, blessures, série, classement, objectif, mercato, vestiaire, supporters, finances,
   arbitrage, météo, prochain adversaire, sélections, contrat, rumeurs du Chicaneur…). Chaque réponse a un ton et des effets :
   moral du groupe ou d'un joueur, confiance du président, supporters, réputation, relation avec la presse (0 à 100).
   La Gazette du sorcier publie ensuite un article qui reprend les réponses. */
(function(root){
'use strict';
const D = root.QMD, EQ = D.EQ;
const Q = () => root.QM, C = () => root.QMC, H = () => root.QMH;
const borne = (x, a, b) => Math.max(a, Math.min(b, x));
const nomJ = j => Q().nomJ(j);

const MEDIAS = {
  gazette:['La Gazette du sorcier', 'Ambroise Fétu'], souaffle:['Le Souaffle', 'Hector Cognard'], radio:['Radio Balai', 'Gaspard Vivier'],
  local:['La Voix {deVille}', 'Odile Ferrand'], chicaneur:['Le Chicaneur', 'Zéphyrine Lune'], hebdo:['Sorcière Hebdo', 'Mélusine Broc'],
};
/* [libellé, titres possibles de la Gazette] */
const TONS = {
  collectif:['Collectif', ['« Tous ensemble » : {c} fait bloc', 'Le collectif de {c} fait plaisir à voir']],
  elogieux:['Élogieux', ['{m} sous le charme de {j}', '{j}, pièce maîtresse de {c}']],
  ambitieux:['Ambitieux', ['{c} vise les sommets', 'L\'ambition s\'affiche à {c}']],
  humble:['Humble', ['{m} garde les pieds sur terre', 'À {c}, on reste humble']],
  exigeant:['Exigeant', ['{m} en veut plus', '« On peut faire beaucoup mieux », prévient {m}']],
  confiant:['Confiant', ['{m} affiche sa confiance', '{c} ne doute de rien']],
  provocateur:['Provocateur', ['{m} jette de l\'huile sur le feu', 'La petite phrase de {m} qui fait parler']],
  combatif:['Combatif', ['{m} appelle au combat', '{c} ne lâchera rien']],
  protecteur:['Protecteur', ['{m} fait bouclier', '{m} protège ses joueurs']],
  critique:['Critique', ['{m} règle ses comptes', 'Le vestiaire de {c} piqué au vif']],
  calme:['Calme', ['{m} ne s\'affole pas', 'Sérénité à {c}']],
  drole:['Drôle', ['{m} fait rire la salle de presse', 'L\'humour de {m}, arme anti-crise']],
  evasif:['Évasif', ['{m} botte en touche', 'Silence radio à {c}']],
  respectueux:['Respectueux', ['{m} salue {adv}', 'Fair-play à {c}']],
  franc:['Franc', ['{m} joue cartes sur table', 'Le constat lucide de {m}']],
  polemique:['Polémique', ['{m} s\'en prend à l\'arbitre', 'Polémique après {c} – {adv}']],
};
/* effets : eq = moral de tout le groupe, j = moral du joueur visé, aut = les autres, conf = président, supp = supporters, rep = réputation, pr = relation presse */
const SUJETS = {
  /* ---- le résultat (toujours la première question) ---- */
  victoire:{res:1, m:'gazette', q:['Belle victoire contre {adv}. Qu\'est-ce qui a fait la différence ?', '{sc} face à {adv}. Quel est votre sentiment ?', 'Une victoire de plus. Qu\'avez-vous préféré ce soir ?'],
    cible:x => x.top, r:[
    ['collectif', 'Le collectif. Tout le monde a tiré dans le même sens.', {eq:3, pr:1}],
    ['elogieux', '{j} a été immense ce soir, il faut le dire.', {j:8, aut:-1, pr:2}],
    ['ambitieux', 'On joue le haut du tableau et on ne s\'en cache plus.', {conf:2, supp:2, eq:1, pr:1}],
    ['humble', 'Rien n\'est fait. On savoure ce soir et on se remet au travail demain.', {eq:1, conf:1}],
    ['exigeant', 'On a gagné, mais j\'ai vu trop de déchet. On peut faire beaucoup mieux.', {eq:-1, conf:1, pr:1}]]},
  large:{res:1, m:'souaffle', q:['{sc} ! Une démonstration. Vous attendiez-vous à un tel écart ?', '{adv} n\'a jamais existé ce soir. C\'est votre match référence ?'],
    r:[
    ['respectueux', 'Non, et je respecte trop {adv} pour en rajouter.', {rep:0.4, pr:2, eq:1}],
    ['confiant', 'Oui. C\'est le niveau que j\'attends chaque semaine.', {eq:2, conf:2, pr:1}],
    ['provocateur', 'On aurait pu en mettre davantage.', {supp:3, rep:-0.3, pr:1, eq:1}],
    ['collectif', 'Quand les poursuiveurs combinent comme ça, on est injouables.', {eq:3}]]},
  arrache:{res:1, m:'radio', q:['Menés une bonne partie du match, sauvés par le vif d\'or. Un hold-up ?', 'Sans le vif d\'or, vous perdiez. Cette victoire vous suffit-elle ?'],
    cible:x => x.attrapeur, r:[
    ['elogieux', 'Le vif d\'or fait partie du jeu. {j} a fait son travail, et très bien.', {j:8, eq:1, pr:1}],
    ['franc', 'On a eu de la réussite, il faut l\'admettre. Le contenu ne me plaît pas.', {eq:-1, conf:1, pr:2}],
    ['combatif', 'Les équipes qui ne lâchent rien finissent par être récompensées.', {eq:3, supp:2}],
    ['evasif', 'Je ne retiens que le résultat.', {pr:-1}]]},
  defaite:{res:-1, m:'gazette', q:['Une défaite difficile face à {adv}. Comment l\'expliquez-vous ?', '{sc}. Qu\'est-ce qui n\'a pas fonctionné ?', 'Défaite contre {adv}. Que dites-vous à vos joueurs ce soir ?'],
    r:[
    ['protecteur', 'J\'en prends la responsabilité. C\'est moi qui ai préparé ce match.', {eq:2, conf:1, pr:1}],
    ['critique', 'Certains n\'étaient pas au niveau, et ils le savent.', {eq:-4, conf:1}],
    ['polemique', 'L\'arbitrage nous a coûté cher ce soir.', {supp:2, rep:-0.5, pr:-1}],
    ['respectueux', '{adv} a été meilleur, tout simplement. Bravo à eux.', {rep:0.4, pr:2, supp:-1}],
    ['calme', 'Une défaite ne fait pas une saison. On analyse et on avance.', {eq:1}]]},
  lourde:{res:-1, m:'souaffle', q:['{sc}… Une humiliation. Que s\'est-il passé ?', 'Vos supporters ont quitté les tribunes avant la fin. Que leur dites-vous ?'],
    r:[
    ['humble', 'Je présente mes excuses aux supporters. Ils méritent mieux que ça.', {supp:3, conf:-1, pr:2}],
    ['protecteur', 'Je ne lâcherai pas mes joueurs, surtout pas ce soir.', {eq:4, supp:-1}],
    ['critique', 'Ce soir, personne n\'a mérité son maillot. Il y aura des conséquences.', {eq:-5, conf:2, supp:1}],
    ['evasif', 'Je n\'ai rien à ajouter.', {pr:-3}]]},
  vifPerdu:{res:-1, m:'radio', q:['Vous meniez, et {adv} vous prend tout sur le vif d\'or. Frustrant ?', 'Un vif d\'or et tout s\'écroule. Comment digérer ça ?'],
    cible:x => x.attrapeur, r:[
    ['calme', 'C\'est le Quidditch. On doit apprendre à fermer un match.', {eq:1, pr:1}],
    ['critique', '{j} doit faire mieux, et le sait très bien.', {j:-8, aut:1, conf:1}],
    ['drole', 'Le vif d\'or n\'a pas été juste avec nous. Je vais lui écrire.', {pr:2}],
    ['collectif', 'Les poursuiveurs ont fait un match énorme, c\'est ce que je retiens.', {eq:2, j:-2}]]},
  nul:{res:0, m:'gazette', q:['Un match nul, ce n\'est pas fréquent au Quidditch. Le résultat vous convient-il ?', '{sc} : personne n\'a su faire la différence. Votre analyse ?'],
    r:[
    ['collectif', 'On prend le point, le groupe a montré du caractère.', {eq:2}],
    ['ambitieux', 'Il fallait gagner, point final.', {conf:1, eq:-1, supp:1}],
    ['drole', 'Au moins, personne ne pourra dire qu\'on a perdu.', {pr:2}],
    ['calme', 'On fera mieux la semaine prochaine.', {eq:1}]]},

  /* ---- les joueurs du match ---- */
  vedette:{w:x => x.top && x.notes[x.top.id] >= 7.8 ? 4 : 0, m:'souaffle', cible:x => x.top,
    q:['{j} a encore brillé ce soir. Est-ce le meilleur joueur du championnat ?', '{j}, note de {nt} sur 10 : que pensez-vous de cette prestation ?'],
    r:[
    ['elogieux', 'Pour moi, oui. Je ne l\'échangerais contre personne.', {j:7, aut:-1, pr:1}],
    ['exigeant', 'Un grand match, mais {j} peut encore progresser.', {j:2, eq:1}],
    ['collectif', '{j} brille parce que les autres travaillent dans l\'ombre.', {eq:2, j:-2}],
    ['drole', 'Ne lui dites pas, ou on va me demander une augmentation.', {pr:2, j:1}]]},
  decevant:{w:x => x.flop && x.notes[x.flop.id] <= 5.2 ? 3 : 0, m:'souaffle', cible:x => x.flop,
    q:['{j} est passé à côté de son match. Sa place est-elle menacée ?', '{nt} sur 10 pour {j}. Que lui avez-vous dit ?'],
    r:[
    ['protecteur', 'J\'ai confiance. Tout le monde a le droit à un jour sans.', {j:6, eq:1}],
    ['exigeant', 'Il faudra montrer autre chose à l\'entraînement.', {j:-4, conf:1}],
    ['critique', 'La concurrence est ouverte. Personne n\'est intouchable.', {j:-6, aut:1}],
    ['evasif', 'Je ne parlerai pas d\'un joueur en particulier.', {pr:-1}]]},
  attrapeurBattu:{w:x => x.vifAdv && !x.vifPerdu && x.attrapeur ? 2 : 0, m:'radio', cible:x => x.attrapeur,
    q:['{adv} a attrapé le vif d\'or. Le duel des attrapeurs était-il perdu d\'avance pour {j} ?', 'Le duel des attrapeurs a tourné en faveur de {adv}. Un problème à ce poste ?'],
    r:[
    ['protecteur', '{j} n\'y est pour rien, le match s\'est perdu ailleurs.', {j:5, eq:-1}],
    ['critique', 'Oui. Un attrapeur doit gagner ces duels-là.', {j:-6, conf:1}],
    ['respectueux', 'Leur attrapeur a fait un très grand match.', {pr:1, rep:0.2}]]},
  blessure:{w:x => x.blesse ? 5 : 0, m:'local', cible:x => x.blesse,
    q:['{j} est sorti blessé. Avez-vous des nouvelles ?', 'La blessure de {j} vous inquiète-t-elle ?'],
    r:[
    ['calme', 'Les guérisseurs s\'en occupent. J\'espère que ce n\'est rien de grave.', {j:3, pr:1}],
    ['franc', 'Ce n\'est pas bon signe. On va devoir faire sans un moment.', {eq:-1, pr:1}],
    ['polemique', 'Leurs batteurs y sont allés très fort. La fédération devrait regarder ça.', {supp:2, rep:-0.3, eq:1}],
    ['evasif', 'Je ne suis pas guérisseur. Demandez à l\'infirmerie.', {pr:-3}]]},
  jeune:{w:x => x.jeune ? 3 : 0, m:'local', cible:x => x.jeune,
    q:['{j}, {age} ans, a impressionné. Le moment est-il venu de lui confier une place de titulaire ?', 'On a beaucoup parlé de {j} ce soir. Que représente {j} pour le club ?'],
    r:[
    ['confiant', 'Oui, la place est méritée.', {j:8, aut:-1}],
    ['calme', 'Doucement. Il faut protéger les jeunes, {j} a le temps.', {j:2, pr:1}],
    ['ambitieux', 'C\'est l\'avenir du club, je n\'ai aucun doute.', {j:5, supp:2, pr:1}],
    ['drole', 'Surtout, {j} a impressionné à la cantine.', {j:1, pr:2}]]},
  starAdverse:{w:x => x.topAdv && x.notes[x.topAdv.id] >= 8 ? 2 : 0, m:'souaffle', cible:x => x.topAdv,
    q:['{j}, chez {adv}, vous a fait souffrir. Aimeriez-vous l\'avoir dans votre équipe ?'],
    r:[
    ['respectueux', 'Quel joueur ! Évidemment, qui ne voudrait pas ?', {eq:-2, pr:2, supp:-1}],
    ['confiant', 'J\'ai mieux dans mon effectif.', {eq:2, pr:1}],
    ['franc', 'On l\'a laissé jouer, c\'est notre faute.', {eq:1}]], visePasMoi:true},

  /* ---- la saison ---- */
  serieV:{w:x => x.serie >= 3 && x.res > 0 ? 4 : 0, m:'gazette', q:['{n} victoires d\'affilée. Jusqu\'où peut aller {c} ?', 'Encore une victoire, la {n}e de suite. Quel est le secret ?'],
    r:[
    ['ambitieux', 'Tout en haut.', {conf:2, supp:3, eq:1, pr:1}],
    ['humble', 'Match après match. Rien de plus.', {eq:1}],
    ['drole', 'Ce soir, jusqu\'à la buvette.', {pr:2, eq:1}],
    ['collectif', 'Le secret, c\'est un groupe qui vit bien.', {eq:3}]]},
  serieD:{w:x => x.serie >= 3 && x.res < 0 ? 5 : 0, m:'gazette', q:['{n} défaites de suite. Est-ce la crise à {c} ?', 'Encore une défaite, la {n}e d\'affilée. Comment sortir de cette spirale ?'],
    r:[
    ['calme', 'Non. On travaille, les résultats vont revenir.', {eq:1, pr:1}],
    ['combatif', 'C\'est maintenant qu\'on va voir qui sont les vrais compétiteurs.', {eq:2, supp:1}],
    ['critique', 'Certains joueurs vont devoir se regarder dans le miroir.', {eq:-3, conf:1}],
    ['protecteur', 'Si quelqu\'un doit payer, c\'est moi.', {eq:3, conf:-2, pr:2}]]},
  leader:{w:x => x.rang === 1 && x.journee >= 5 ? 3 : 0, m:'souaffle', q:['{c} est en tête du championnat. Êtes-vous désormais l\'équipe à battre ?', 'Premiers au classement : la pression change-t-elle de camp ?'],
    r:[
    ['ambitieux', 'Oui, et on ne va pas se cacher.', {conf:2, supp:2, eq:1}],
    ['humble', 'Le favori, c\'est celui qui sera en tête à la dernière journée.', {pr:1, eq:1}],
    ['provocateur', 'La pression est sur les autres : ils ont plus de moyens que nous.', {rep:0.2, pr:1, supp:1}]]},
  bas:{w:x => x.rang && x.rang >= x.nClubs - 2 && x.journee >= 6 ? 4 : 0, m:'local', q:['{c} pointe à la {rang}e place. La situation vous inquiète-t-elle ?', 'Le bas du classement, c\'est votre réalité. Comment en sortir ?'],
    r:[
    ['calme', 'Non. Il reste beaucoup de matchs à jouer.', {eq:1}],
    ['franc', 'La situation est sérieuse, et nous en sommes conscients.', {conf:1, pr:2, eq:-1}],
    ['critique', 'J\'attends des renforts au prochain mercato.', {conf:-2, supp:1, eq:-2}],
    ['combatif', 'On va se battre jusqu\'au bout, j\'en fais le serment.', {supp:2, eq:2}]]},
  objectifBas:{w:x => x.vise && x.rang > x.vise + 2 && x.journee >= 8 ? 3 : 0, m:'gazette', q:['Le président vise : « {obj} ». Est-ce encore réaliste ?'],
    r:[
    ['confiant', 'Oui, j\'y crois toujours.', {conf:1, supp:1}],
    ['franc', 'Il faudra sans doute revoir nos ambitions.', {conf:-3, pr:2, eq:1}],
    ['evasif', 'Je ne commente pas les objectifs du président.', {pr:-1}]]},
  objectifHaut:{w:x => x.vise && x.rang < x.vise - 1 && x.journee >= 8 ? 3 : 0, m:'gazette', q:['Vous faites mieux que l\'objectif fixé (« {obj} »). Faut-il le revoir à la hausse ?'],
    r:[
    ['ambitieux', 'Oui, on ne s\'interdit plus rien.', {conf:2, supp:2, eq:1}],
    ['humble', 'Non, restons humbles. La saison est longue.', {conf:1, pr:1}],
    ['drole', 'Demandez au président, c\'est lui qui signe les parchemins.', {pr:2, conf:-1}]]},
  debut:{w:x => x.journee === 1 ? 6 : 0, m:'radio', q:['Premier match de la saison. Quel est votre objectif cette année ?'],
    r:[
    ['ambitieux', 'Le titre. Rien d\'autre.', {conf:2, supp:2, eq:1}],
    ['calme', 'Faire mieux que la saison dernière, étape par étape.', {conf:1}],
    ['drole', 'Prendre du plaisir, et en donner. Et gagner, si possible.', {pr:2, supp:1}]]},
  fin:{w:x => x.journee && x.journee === x.derniere ? 6 : 0, m:'gazette', q:['Dernier match de la saison. Quel bilan en tirez-vous ?'],
    r:[
    ['collectif', 'Positif. Le groupe a énormément grandi.', {eq:2}],
    ['franc', 'Mitigé. On attendait plus, moi le premier.', {conf:1, eq:-1, pr:1}],
    ['evasif', 'On en reparlera après les vacances.', {pr:-1}]]},
  prochain:{w:x => x.prochain ? 2 : 0, m:'radio', q:['Prochain rendez-vous : {prochain}. Un mot sur cet adversaire ?', '{prochain} la semaine prochaine. Vous y pensez déjà ?'],
    r:[
    ['respectueux', 'Une très belle équipe. Il faudra être parfaits.', {pr:1, eq:1}],
    ['confiant', 'On ira pour gagner, comme partout.', {eq:2, supp:1}],
    ['provocateur', 'Je ne connais même pas le nom de leur gardien.', {supp:2, rep:-0.4, pr:2}],
    ['evasif', 'Chaque chose en son temps.', {}]]},
  tactique:{w:() => 1, m:'souaffle', q:['Vos choix tactiques ont surpris ce soir. Pouvez-vous les expliquer ?', 'Votre plan de jeu a-t-il été respecté ?'],
    r:[
    ['evasif', 'Je ne dévoile pas mes plans à la presse.', {pr:-1}],
    ['confiant', 'Le plan était clair et les joueurs l\'ont appliqué.', {eq:1}],
    ['collectif', 'Les joueurs ont fait mieux que ce que j\'avais dessiné au tableau.', {eq:2, rep:-0.1}],
    ['franc', 'J\'ai peut-être trop compliqué les choses.', {eq:1, pr:2, conf:-1}]]},
  arbitre:{w:x => x.fautes >= 6 || x.penAdv >= 2 ? 3 : 0, m:'radio', q:['Plusieurs décisions de l\'arbitre ont fait débat. Votre avis ?', '{fautes} fautes sifflées ce soir. L\'arbitre a-t-il été à la hauteur ?'],
    r:[
    ['respectueux', 'Un match difficile à arbitrer. Je ne l\'accablerai pas.', {rep:0.3, pr:1}],
    ['polemique', 'Il a sifflé à sens unique.', {supp:2, rep:-0.5, conf:-1}],
    ['drole', 'Les arbitres auraient besoin de balais plus rapides.', {pr:2}],
    ['evasif', 'Je garde mon avis pour la fédération.', {pr:-1, rep:0.1}]]},
  meteo:{w:x => ['pluie', 'orage', 'brouillard', 'vent'].includes(x.meteo) ? 2 : 0, m:'local', q:['Jouer par ce temps ({meteoNom}), qu\'est-ce que ça change pour vos joueurs ?'],
    r:[
    ['confiant', 'Rien. On s\'entraîne par tous les temps.', {eq:1}],
    ['drole', 'Par ce temps-là, ce n\'est plus du Quidditch, c\'est de la loterie.', {pr:2}],
    ['franc', 'On aurait dû s\'adapter plus vite. C\'est mon erreur.', {eq:1, pr:1}]]},

  /* ---- le club ---- */
  rumeur:{w:x => x.ouvert && x.star && x.riche ? 4 : 0, m:'gazette', cible:x => x.star, q:['On dit que {riche} s\'intéresse à {j}. Est-ce un joueur à vendre ?', '{riche} prépare une offre pour {j}. Que répondez-vous ?'],
    r:[
    ['protecteur', 'Personne ne partira. {j} n\'est pas à vendre.', {j:4, supp:2}],
    ['franc', 'Tout le monde a un prix.', {j:-6, conf:2, supp:-2}],
    ['evasif', 'Je ne commente pas les rumeurs.', {pr:-1}],
    ['provocateur', 'Si {riche} veut voir {j} de près, qu\'ils achètent un billet.', {supp:3, pr:2, j:3, rep:-0.2}]]},
  recrues:{w:x => x.ouvert ? 2 : 0, m:'radio', q:['Le mercato est ouvert. Allez-vous recruter ?', 'Des renforts sont-ils prévus pendant le mercato ?'],
    r:[
    ['ambitieux', 'Oui, un ou deux profils très précis.', {eq:-1, conf:1, supp:1}],
    ['collectif', 'Non, j\'ai confiance en ce groupe.', {eq:3, supp:-1}],
    ['drole', 'Ça dépend du président et de son coffre à Gringotts.', {conf:-1, pr:2}]]},
  menace:{w:x => x.confiance < 35 ? 5 : 0, m:'gazette', q:['On dit votre poste menacé. Avez-vous toujours la confiance du président ?', 'Le président semble s\'impatienter. Craignez-vous pour votre avenir ?'],
    r:[
    ['calme', 'Je me sens soutenu. Je ne pense qu\'au prochain match.', {eq:1}],
    ['combatif', 'Si on me juge sur un mois, c\'est qu\'on ne me connaît pas.', {conf:-2, pr:2, supp:1}],
    ['confiant', 'Les résultats parleront pour moi.', {eq:1, conf:1}],
    ['evasif', 'Question suivante.', {pr:-2}]]},
  contrat:{w:x => x.finContrat ? 3 : 0, m:'gazette', q:['Votre contrat arrive à échéance. Allez-vous prolonger ?'],
    r:[
    ['confiant', 'Je veux rester, c\'est clair.', {conf:2, supp:1}],
    ['calme', 'On en discute avec le président, rien ne presse.', {pr:1}],
    ['provocateur', 'J\'écoute toutes les propositions.', {conf:-4, rep:0.3, pr:2}]]},
  vestiaire:{w:x => x.ambiance < 45 || x.mecontent ? 3 : 0, m:'hebdo', cible:x => x.mecontent, q:['On parle de tensions dans votre vestiaire. Que se passe-t-il ?'],
    r:[
    ['evasif', 'Tout va bien, ce sont des rumeurs.', {pr:-1}],
    ['franc', 'Il y a des frustrations, c\'est normal, et on en parle entre nous.', {eq:2, pr:1}],
    ['critique', 'Ceux qui ne sont pas contents connaissent le chemin de la porte.', {eq:-4, conf:1}],
    ['exigeant', 'Si {j} veut plus de temps de jeu, l\'entraînement est là pour le prouver.', {j:-5, aut:1}, x => !!x.mecontent]]},
  suppFache:{w:x => x.supp != null && x.supp < 40 ? 3 : 0, m:'local', q:['Les supporters grondent. Que voulez-vous leur dire ?'],
    r:[
    ['humble', 'Je comprends leur frustration. On va tout donner pour eux.', {supp:3, pr:1}],
    ['combatif', 'Qu\'ils continuent à pousser, on a besoin d\'eux.', {supp:2, eq:1}],
    ['provocateur', 'Je ne travaille pas pour les tribunes.', {supp:-4, pr:1}]]},
  suppRavi:{w:x => x.supp != null && x.supp >= 75 && x.domicile ? 2 : 0, m:'local', q:['Le stade était en feu ce soir. Un mot pour vos supporters ?'],
    r:[
    ['collectif', 'Merci. Ce sont eux, notre huitième joueur.', {supp:3, eq:1}],
    ['ambitieux', 'Ils méritent un trophée. On va essayer de le leur offrir.', {supp:3, conf:1}],
    ['drole', 'Qu\'ils viennent encore plus nombreux : la buvette a besoin d\'eux.', {supp:1, pr:2}]]},
  finances:{w:x => x.budget < 0 ? 3 : 0, m:'gazette', q:['Les comptes du club sont dans le rouge. Cela pèse-t-il sur le groupe ?'],
    r:[
    ['calme', 'Les joueurs ne pensent qu\'au terrain.', {eq:1}],
    ['franc', 'Il faudra peut-être vendre, oui.', {eq:-3, conf:2}],
    ['drole', 'Demandez aux gobelins de Gringotts.', {pr:2, conf:-1}]]},
  appeles:{w:x => x.appeles >= 2 ? 2 : 0, m:'souaffle', q:['{n2} de vos joueurs sont appelés en sélection. Une fierté ou un problème ?'],
    r:[
    ['elogieux', 'Une fierté. Ils le méritent.', {eq:2, pr:1}],
    ['franc', 'Un problème : on jouera sans eux en championnat.', {pr:1, conf:1}],
    ['drole', 'J\'espère surtout qu\'ils reviendront entiers.', {pr:2}]]},
  selection:{w:x => x.sixn ? 6 : 0, m:'souaffle', q:['Tout le pays rêve de la {tournoi}. Est-ce un objectif réaliste ?', 'Sélectionner, c\'est choisir. Avez-vous des regrets sur votre liste ?'],
    r:[
    ['ambitieux', 'Oui. Nous avons les joueurs pour aller au bout.', {eq:2, rep:0.3, pr:1}],
    ['humble', 'D\'autres nations sont mieux armées. Nous jouerons crânement.', {eq:1, pr:1}],
    ['evasif', 'Je ne parle pas des absents.', {pr:-1}]]},

  /* ---- la presse à scandale ---- */
  animagus:{w:x => x.attrapeur ? 1 : 0, m:'chicaneur', cible:x => x.attrapeur, q:['Le Chicaneur affirme que {j} est un Animagus qui se transforme en hirondelle pendant les matchs. Vous confirmez ?'],
    r:[
    ['drole', 'Je ne confirme ni ne démens.', {pr:2}],
    ['evasif', 'Ridicule. Question suivante.', {pr:-2}],
    ['drole', 'Si c\'était possible, je lui aurais demandé depuis longtemps.', {pr:3, j:1}]]},
  vifEnsorcele:{w:() => 1, m:'chicaneur', q:['Nos lecteurs pensent que le vif d\'or est ensorcelé par le ministère. Votre avis ?'],
    r:[
    ['drole', 'Ça expliquerait certaines choses.', {pr:2, rep:-0.1}],
    ['calme', 'Le vif d\'or est le seul arbitre honnête de ce sport.', {pr:2}],
    ['evasif', 'Je ne lis pas Le Chicaneur.', {pr:-3}]]},
  balai:{w:() => 1, m:'chicaneur', q:['Vrai ou faux : vous dormez avec votre balai ?'],
    r:[
    ['drole', 'Seulement les veilles de match.', {pr:3}],
    ['evasif', 'Ma vie privée ne regarde que moi.', {pr:-1}],
    ['drole', 'Faux. C\'est le balai qui dort avec moi.', {pr:3}]]},
  ronflak:{w:x => x.domicile ? 1 : 0, m:'chicaneur', q:['Un Ronflak Cornu aurait été aperçu dans vos tribunes. Est-ce un porte-bonheur ?'],
    r:[
    ['drole', 'S\'il revient la semaine prochaine, je lui offre un abonnement.', {pr:3, supp:1}],
    ['calme', 'Je n\'ai vu que des supporters, et ils étaient formidables.', {supp:1}],
    ['provocateur', 'Vous devriez consulter, sincèrement.', {pr:-3}]]},
  diner:{w:x => x.riche ? 1 : 0, m:'hebdo', q:['On vous aurait vu dîner au Chaudron Baveur avec le président de {riche}. Un nouveau projet ?'],
    r:[
    ['evasif', 'On parlait de la pluie et du beau temps.', {pr:1}],
    ['protecteur', 'Je me sens très bien à {c}. Fin de l\'histoire.', {conf:2, supp:1}],
    ['provocateur', 'Il paie bien et ses dîners sont excellents.', {conf:-3, pr:3, supp:-1}]]},
  robe:{w:() => 1, m:'hebdo', q:['Votre robe de sorcier sur le banc fait jaser. Un commentaire ?'],
    r:[
    ['drole', 'Elle porte chance, je ne la change plus.', {pr:2}],
    ['calme', 'Je laisse la mode à Sorcière Hebdo.', {pr:1}],
    ['evasif', 'On parle de Quidditch, ici ?', {pr:-2}]]},
};
const PAS_DE_COMMENTAIRE = {pr:-2}, QUITTER = {pr:-5, rep:-0.2};

/* ---------- Contexte du match ---------- */
function contexte(M, X){
  const moi = X.joueur, adv = 1 - moi, mg = M.manager, U = !X.sixn && mg && mg.club ? M.clubs[mg.club] : null;
  const d = X.score[moi] - X.score[adv], vifMoi = X.vif === moi, vifAdv = X.vif === adv;
  const notes = Q().notesMatch(X), mien = id => X.perf[id] && X.perf[id].eq === moi;
  const joues = Object.keys(notes).map(id => M.joueurs[id]).filter(Boolean);
  const mes = joues.filter(j => mien(j.id)).sort((a, b) => notes[b.id] - notes[a.id]), siens = joues.filter(j => !mien(j.id)).sort((a, b) => notes[b.id] - notes[a.id]);
  const S = Q().semaine(M), x = {M, X, U, mg, moi, d, notes, res:Math.sign(d), vifMoi, vifAdv, sixn:!!X.sixn, domicile:moi === 0 && X.domicile, meteo:X.meteo,
    meteoNom:((D.METEOS[X.meteo] || {}).nom || '').toLowerCase(), adv:X.e[adv].nom, c:X.e[moi].nom, sc:`${X.score[moi]}–${X.score[adv]}`,
    top:mes[0], flop:mes.length > 1 ? mes[mes.length - 1] : null, topAdv:siens[0], fautes:X.stats[moi].fautes, penAdv:X.stats[adv].pen,
    tournoi:D.LDN.nom, confiance:mg ? mg.confiance : 60};   // v106 : la Ligue des nations remplace le Tournoi des Six Emblèmes
  x.vifPerdu = d < 0 && vifAdv && X.score[moi] > X.score[adv] - EQ.points.vif;
  x.arrache = d > 0 && vifMoi && X.score[moi] - EQ.points.vif <= X.score[adv] - 30;   // mené d'au moins trois buts avant le vif d'or
  x.ecartButs = (X.stats[moi].buts - X.stats[adv].buts) * 10;
  const a = X.e[moi].A && X.e[moi].A[0]; x.attrapeur = a && M.joueurs[a] || null;
  const bl = (X.bless || []).find(b => b.eq === moi && M.joueurs[b.id]); x.blesse = bl ? M.joueurs[bl.id] : null;
  x.jeune = mes.find(j => j.age <= 20 && notes[j.id] >= 6.6 && j !== x.top) || null;
  if (U){
    const T = M.tables[U.ligue] && M.tables[U.ligue][U.id], forme = (T && T.forme || []).slice(), r = x.res > 0 ? 'V' : x.res < 0 ? 'D' : 'N';
    let n = 1; for (let i = forme.length - 1; i >= 0 && forme[i] === r; i--) n++; x.serie = n;
    const CL = Q().classement(M, U.ligue); x.rang = CL.findIndex(l => l.id === U.id) + 1; x.nClubs = CL.length;
    x.journee = S && S.journee || 0; x.derniere = Math.max(0, ...M.calendrier.map(s => s.journee || 0));
    if (mg.objectif){ x.vise = mg.objectif.vise; x.obj = mg.objectif.txt; }
    x.ouvert = C() && C().mercatoOuvert(S);
    const eff = U.effectif.map(id => M.joueurs[id]).filter(Boolean).sort((p, q) => Q().note20(q, q.poste) - Q().note20(p, p.poste));
    x.star = eff[0] || null;
    const riches = Object.values(M.clubs).filter(c => c.id !== U.id && c.rep >= U.rep + 6).sort((p, q) => q.rep - p.rep);
    x.riche = riches.length ? riches[Math.abs(Q().melange(M.graine, X.idMatch || 0, 'riche')) % Math.min(3, riches.length)].nom : null;
    x.supp = U.dom ? U.dom.supp : null; x.budget = U.budget;
    x.ambiance = H() ? H().ambiance(M, U) : 60; const mc = H() ? H().mecontents(M, U) : []; x.mecontent = mc[0] || null;
    x.appeles = U.effectif.filter(id => M.joueurs[id] && M.joueurs[id].inter).length;
    const p = root.QMG && root.QMG.profil ? root.QMG.profil(M) : null; x.finContrat = !!(p && p.contrat && p.contrat.fin <= M.saison && x.journee >= 10);
    for (let i = M.semaine; i < M.calendrier.length && !x.prochain; i++){
      const m = (M.calendrier[i].matchs || []).find(m => m.ligue !== 'sixn' && (m.dom === U.id || m.ext === U.id) && !m.res && m.id !== X.idMatch);
      if (m) x.prochain = M.clubs[m.dom === U.id ? m.ext : m.dom].nom;
    }
    x.ville = U.ville || U.nom;
  } else { x.serie = 0; x.ville = x.c; x.budget = 0; x.ambiance = 60; }
  x.deVille = (/^[aeiouyhéèêâîôûAEIOUYHÉÈÊÂÎÔÛ]/.test(x.ville) ? 'd\'' : 'de ') + x.ville;
  return x;
}
const remplir = (t, x, cible) => String(t).replace(/\{(\w+)\}/g, (s, k) => k === 'j' ? (cible ? nomJ(cible) : '') : k === 'nt' ? String(cible ? x.notes[cible.id] : '').replace('.', ',')
  : k === 'age' ? (cible ? cible.age : '') : k === 'n' ? x.serie : k === 'n2' ? x.appeles : k === 'm' ? (x.mg ? x.mg.nom : '') : k === 'rang' ? x.rang : x[k] != null ? x[k] : s);

/* ---------- La conférence ---------- */
function conference(M, X, n){
  if (X.presse) return X.presse;
  const x = contexte(M, X), r = Q().hasard(Q().melange(M.graine, X.idMatch || X.graine || 0, 'presse'));
  const k0 = x.res > 0 ? (x.arrache ? 'arrache' : x.ecartButs >= 150 && x.d >= 250 ? 'large' : 'victoire') : x.res < 0 ? (x.vifPerdu ? 'vifPerdu' : x.ecartButs <= -150 && x.d <= -250 ? 'lourde' : 'defaite') : 'nul';
  const choisis = [k0], medias = new Set([SUJETS[k0].m]);
  let pool = Object.entries(SUJETS).filter(([k, s]) => s.w && s.w(x) > 0);
  while (choisis.length < borne(n || 3, 1, 3) && pool.length){
    const tot = pool.reduce((t, [k, s]) => t + s.w(x) * (medias.has(s.m) ? 0.25 : 1), 0); let v = r() * tot, pick = pool[0];
    for (const p of pool){ v -= p[1].w(x) * (medias.has(p[1].m) ? 0.25 : 1); if (v <= 0){ pick = p; break; } }
    choisis.push(pick[0]); medias.add(pick[1].m);
    const cib = pick[1].cible ? pick[1].cible(x) : null;
    pool = pool.filter(p => p !== pick && !(cib && p[1].cible && p[1].cible(x) === cib) && !(pick[1].m === 'chicaneur' && p[1].m === 'chicaneur'));
  }
  const qs = choisis.map(k => {
    const s = SUJETS[k], cible = s.cible ? s.cible(x) : null, [media, journaliste] = MEDIAS[s.m];
    return {k, media:remplir(media, x), journaliste, cible:cible ? cible.id : null, visePasMoi:!!s.visePasMoi,
      q:remplir(s.q[Math.floor(r() * s.q.length)], x, cible),
      r:s.r.filter(a => !a[3] || a[3](x)).map(a => ({ton:a[0], t:remplir(a[1], x, cible), fx:a[2]}))};
  });
  X.presse = {qs, i:0, faits:[], fin:false, ctx:{c:x.c, adv:x.adv, m:x.mg ? x.mg.nom : '', sixn:x.sixn}};
  return X.presse;
}
/* applique les effets, renvoie les puces [libellé, valeur, type] */
function appliquer(M, X, fx, cibleId){
  const mg = M.manager, U = !X.sixn && mg && mg.club ? M.clubs[mg.club] : null, out = [];
  const ids = U ? U.effectif : [...['P', 'B', 'A', 'G'].flatMap(p => X.e[X.joueur][p] || []), ...(X.e[X.joueur].banc || [])];
  const eff = ids.map(id => M.joueurs[id]).filter(Boolean), cible = cibleId && M.joueurs[cibleId] && ids.includes(cibleId) ? M.joueurs[cibleId] : null;
  const mor = (j, v) => { j.moral = borne(j.moral + v, 5, 100); };
  if (fx.eq){ for (const j of eff) mor(j, fx.eq); out.push(['Moral du groupe', fx.eq]); }
  if (fx.j && cible){ mor(cible, fx.j); out.push([nomJ(cible), fx.j]); }
  if (fx.aut){ for (const j of eff) if (j !== cible) mor(j, fx.aut); out.push([cible ? 'Les autres joueurs' : 'Moral du groupe', fx.aut]); }
  if (fx.conf && U){ mg.confiance = Math.round(borne(mg.confiance + fx.conf, 0, 100) * 10) / 10; out.push(['Président', fx.conf]); }
  if (fx.supp && U && U.dom){ U.dom.supp = borne(U.dom.supp + fx.supp, 0, 100); out.push(['Supporters', fx.supp]); }
  if (mg && mg.presse == null) mg.presse = 50;
  if (fx.rep && mg){ const v = fx.rep * (fx.rep > 0 ? 0.6 + mg.presse / 125 : 1); mg.rep = Math.round(borne(mg.rep + v, 1, 100) * 10) / 10; out.push(['Réputation', Math.round(v * 10) / 10]); }
  if (fx.pr && mg){ mg.presse = Math.round(borne(mg.presse + fx.pr, 0, 100)); out.push(['Presse', fx.pr]); }
  return out;
}
function repondre(M, X, idx){
  const P = X.presse; if (!P || P.fin) return null;
  const q = P.qs[P.i], a = idx >= 0 ? q.r[idx] : null, fx = a ? a.fx : idx === -2 ? QUITTER : PAS_DE_COMMENTAIRE;
  const puces = appliquer(M, X, fx, q.cible);
  P.faits.push({q:q.q, media:q.media, ton:a ? a.ton : 'evasif', t:a ? a.t : idx === -2 ? '(Tu quittes la salle de presse.)' : 'Pas de commentaire.', puces, cible:q.cible, poids:Object.values(fx).reduce((s, v) => s + Math.abs(v), 0)});
  P.i++;
  if (idx === -2 || P.i >= P.qs.length) terminer(M, X);
  return puces;
}
function terminer(M, X){
  const P = X.presse; P.fin = true;
  const mg = M.manager, cx = P.ctx, h = H() ? H().etat(M) : null;
  const marquant = P.faits.filter(f => f.ton !== 'evasif').sort((a, b) => b.poids - a.poids)[0] || P.faits[0];
  const L = TONS[marquant.ton][1], cible = marquant.cible && M.joueurs[marquant.cible];
  let titre = L[Math.abs(Q().melange(M.graine, X.idMatch || 0, marquant.ton)) % L.length].replace('{c}', cx.c).replace('{m}', cx.m).replace('{adv}', cx.adv).replace('{j}', cible ? nomJ(cible) : cx.c);
  const corps = `Après ${cx.c} – ${cx.adv}, en conférence de presse :\n\n` + P.faits.map(f => `${f.media} : « ${f.q} »\n— « ${f.t} »`).join('\n\n')
    + `\n\nRelation avec la presse : ${mg && mg.presse != null ? mg.presse : 50} / 100.`;
  Q().message(M, `La Gazette du sorcier : ${titre}`, corps, 'presse');
  if (h){ h.presse = h.presse || {}; h.presse[X.idMatch || ('t' + (M.tic || 0))] = P.faits.map(f => f.ton); const ks = Object.keys(h.presse); for (const k of ks.slice(0, Math.max(0, ks.length - 30))) delete h.presse[k]; }
}
/* compatibilité : l'ancienne question unique */
function questionPresse(M, X){ const P = conference(M, X, 1), q = P.qs[0]; return {k:q.k, q:q.q, r:q.r.map((a, i) => [String(i), a.t])}; }

root.QMP = {conference, repondre, contexte, TONS, SUJETS, MEDIAS, questionPresse};
})(typeof window !== 'undefined' ? window : globalThis);
