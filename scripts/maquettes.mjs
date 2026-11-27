#!/usr/bin/env node
// Génère les maquettes cliquables (design/maquettes/index.html) depuis design/jetons.json.
// Sans dépendance, sans réseau : une seule page HTML locale. Données fictives uniquement.
// Usage : node scripts/maquettes.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const racine = new URL('../', import.meta.url);
const j = JSON.parse(readFileSync(new URL('design/jetons.json', racine), 'utf8'));
const c = j.couleurs;
const st = j.statuts;
const m = j.matieres;

// ---------- Données fictives ----------
const membres = [
  'Adam Bernard', 'Alice Petit', 'Arthur Robert', 'Chloé Richard', 'Emma Durand', 'Gabriel Leroy',
  'Hugo Moreau', 'Inès Simon', 'Jade Laurent', 'Jules Lefebvre', 'Léa Michel', 'Léo Garcia',
  'Louis David', 'Louise Bertrand', 'Lucas Roux', 'Manon Vincent', 'Mila Fournier', 'Nathan Morel',
  'Noah Girard', 'Rose André', 'Sacha Mercier', 'Zoé Blanc',
].map((n) => { const [p, f] = n.split(' '); return { prenom: p, nom: f }; })
  .sort((a, b) => a.nom.localeCompare(b.nom));

// ---------- Écrans ----------
// Chaque écran : id, lot, titre, exigences couvertes, onglet actif, contenu HTML.
const ecrans = [];
const ecran = (id, lot, titre, exigences, onglet, corps) => ecrans.push({ id, lot, titre, exigences, onglet, corps });
// Écrans validés au lot 1 et modifiés au lot 2 : à revalider.
const MODIFIES = ['parametres', 'creneaux', 'accueil'];

const go = (id, txt, cls = 'btn-p') => `<button class="${cls}" data-go="${id}">${txt}</button>`;
const section = (t) => `<h3 class="section">${t}</h3>`;
const carte = (html, cls = '') => `<div class="carte ${cls}">${html}</div>`;
const ligne = (g, d, extra = '') => `<div class="ligne" ${extra}><div><div class="l-titre">${g}</div>${d ? `<div class="l-sous">${d}</div>` : ''}</div><span class="chev">›</span></div>`;
const titre = (t, retour) => `<div class="entete">${retour ? `<button class="retour" data-go="${retour}">‹</button>` : ''}<h1>${t}</h1></div>`;
const pastille = (k) => `<span class="pastille s-${k}">${ico[k]} ${st[k].libelle}</span>`;
const ico = { present: '✓', absent: '✕', late: '◷', excused: '≈', preparedPresent: '○' };

// 01 — Bienvenue (mise en route, P1)
ecran('bienvenue', 1, 'Bienvenue (mise en route)', 'P1', 'accueil', `
${titre('Bienvenue')}
<p class="aide">Quatre étapes avant votre premier appel.</p>
${carte(`
<div class="etape faite"><span class="coche">✓</span><div><div class="l-titre">Créer la saison</div><div class="l-sous">Saison 2026-2027, créée automatiquement</div></div></div>
<div class="etape"><span class="num">2</span><div><div class="l-titre">Créer un groupe</div><div class="l-sous">Par exemple « Poussins mercredi »</div></div></div>
${go('groupe-nouveau', 'Créer un groupe')}
<div class="etape"><span class="num">3</span><div><div class="l-titre">Ajouter les membres</div></div></div>
<div class="etape"><span class="num">4</span><div><div class="l-titre">Déclarer les créneaux</div></div></div>
`)}
<p class="note">Un seul bouton à l'écran, sur la première étape qui reste. Décisions du porteur du 2026-11-27 : affiché à la place de l'accueil tant qu'une étape reste et qu'aucun appel n'est enregistré dans la saison, jamais pendant un appel en cours ; saison créée sur une base vide seulement, du 1er septembre au 31 août (dès le 1er juillet, celle de la rentrée).</p>`);

// 02 — Accueil
ecran('accueil', 1, 'Accueil', 'EX-09, EX-17, EX-21, EX-06', 'accueil', `
${titre('Mercredi 26 nov.')}
<div class="recherche" data-go="urgence">🔍 Contact d'urgence : rechercher un membre</div>
${section('Maintenant')}
${carte(`
<div class="l-titre gros">Poussins mercredi</div>
<div class="l-sous">14:00 – 15:30 · Gymnase Jean-Moulin · 22 membres</div>
<div class="duo">${go('annuler', 'Annuler', 'btn-s tiers')}${go('appel', "Faire l'appel", 'btn-p deuxtiers')}</div>
`)}
${section('Appels manquants')}
${carte(`
${ligne('<span class="rouge">●</span> Benjamins lundi', 'Lundi 24 nov. · 18:00', 'data-go="appel"')}
`)}
${carte(`<div class="l-titre">Pas de sauvegarde depuis 34 jours</div><div class="l-sous">Vos données ne vivent que sur cet appareil.</div>${go('donnees', 'Sauvegarder maintenant', 'btn-s')}`, 'bandeau')}
<p class="note">Version finale avec frise et alertes : <a class="lien" data-go="accueil-complet">Accueil complet</a> (lot 2). Ticket 012 (décisions du 2026-11-27) : sans « Annuler » (jalon 2) ni bandeau de sauvegarde (ticket 014) ; appels manquants : 5 au plus, puis « et N autres » ; séance déjà faite : « Appel enregistré », sans bouton ; onglets Accueil, Nouvel appel, Paramètres jusqu'au ticket 013.</p>`);

// 03 — Recherche contact d'urgence
ecran('urgence', 1, "Recherche d'un contact d'urgence", 'EX-06, EX-05', 'accueil', `
${titre("Contact d'urgence", 'accueil')}
<div class="champ actif">gar|</div>
${carte(`
<div class="l-titre gros">Léo Garcia</div><div class="l-sous">Poussins mercredi</div>
<div class="contact"><div><div class="l-titre">Sa mère</div><div class="l-sous mono">06 00 00 00 01</div></div><button class="btn-appel">📞 Appeler</button></div>
<div class="contact"><div><div class="l-titre">Son père</div><div class="l-sous mono">06 00 00 00 02</div></div><button class="btn-appel">📞 Appeler</button></div>
`)}
<p class="note">Contacts affichés dès la saisie, appel en un appui (EX-06 : 2 appuis au plus).</p>`);

// 04 — Appel (interactif)
ecran('appel', 1, 'Appel', 'EX-09 à EX-15', 'appel', `
${titre('Poussins mercredi', 'accueil')}
<div class="l-sous sous-titre">Mer. 26/11/2026 · 14:00 · Gymnase Jean-Moulin</div>
<div class="carte compteur mono" id="compteur"></div>
<div class="brouillon"><span id="chrono" class="mono">0,0 s</span> · <span>Brouillon enregistré à chaque appui</span></div>
<input class="champ" id="filtre" placeholder="🔍 Rechercher (plus de 20 membres)">
<div id="liste-appel"></div>
<button class="btn-s" data-go="ajout">+ Ajouter un membre</button>
<div class="champ multi">Commentaire de la séance (facultatif)</div>
<button class="btn-p" id="enregistrer">Enregistrer l'appel</button>
<p class="note">Le chronomètre ne sert qu'à la démonstration (mesurer NF-01) : absent de l'appli. Après l'enregistrement, retour à l'accueil jusqu'à l'Historique (ticket 013). Séance déjà enregistrée : « L'appel de cette séance est déjà enregistré. », sans bouton (décisions du 2026-11-27). Décision du porteur du 2026-11-27 : « N présents dont M retards », retards compris dans les présents.</p>`);

// 05 — Appel sans créneau (EX-39)
ecran('appel-libre', 1, 'Appel sans créneau', 'EX-39', 'appel', `
${titre('Nouvel appel')}
<p class="aide">Aucun créneau en cours. Choisissez le groupe et la date.</p>
${section('Groupe')}
${carte(`${ligne('Poussins mercredi', '22 membres', 'data-go="appel"')}${ligne('Benjamins lundi', '18 membres', 'data-go="appel"')}${ligne('Adultes jeudi', '25 membres', 'data-go="appel"')}`)}
${section('Date')}
<div class="champ mono">26/11/2026</div>
<p class="note">S'affiche quand on touche « Nouvel appel » sans séance à faire : aucune proposée, ou la proposée déjà enregistrée. Groupes listés par leur nom, sans le nombre de membres au lot 1. Date jamais future, dans la saison active ; l'heure de la séance est celle de l'ouverture de l'appel. Appel du groupe déjà enregistré ce jour-là : « Un appel de Poussins est déjà enregistré le 16/11/2026. En faire un autre ? » (Annuler / Faire un autre appel) (décisions du 2026-11-27).</p>`);

// 06 — Ajout d'un membre pendant l'appel (EX-12)
ecran('ajout', 1, "Ajout d'un membre pendant l'appel", 'EX-12, EX-03', 'appel', `
${titre('Nouveau membre', 'appel')}
<label>Prénom</label><div class="champ">Yanis</div>
<label>Nom</label><div class="champ">Colin</div>
<label>Date de naissance <span class="facultatif">facultative</span></label><div class="champ vide">JJ/MM/AAAA</div>
<p class="aide">Il sera inscrit à « Poussins mercredi » à partir d'aujourd'hui.</p>
<p class="note">Inscrit à la date de la séance : « à partir du 18/11/2026 » pour le rattrapage d'une séance passée (décision du 2026-11-27).</p>
${go('appel', "Ajouter et revenir à l'appel")}`);

// 07 — Historique
ecran('historique', 1, 'Historique', 'EX-16, EX-17', 'historique', `
${titre('Historique')}
<div class="filtres"><span class="filtre on">Tous les groupes</span><span class="filtre">30 derniers jours</span></div>
${carte(`
${ligne('<span class="rouge">● Appel manquant</span> · Benjamins lundi', 'Lun. 24/11 · 18:00', 'data-go="appel"')}
${ligne('Poussins mercredi', 'Mer. 19/11 · <span class="mono">19/22</span> présents', 'data-go="seance"')}
${ligne('Adultes jeudi', 'Jeu. 20/11 · <span class="mono">21/25</span> présents', 'data-go="seance"')}
${ligne('Benjamins lundi', 'Lun. 17/11 · <span class="mono">16/18</span> présents', 'data-go="seance"')}
${ligne('<span class="gris">Annulée</span> · Poussins mercredi', 'Mer. 12/11', '')}
${ligne('<span class="gris">Non planifiée</span> · Adultes jeudi', 'Jeu. 30/10 · vacances', '')}
`)}
<p class="note">Annulée et Non planifiée viennent du lot 2 (F-13) : montrées ici pour le rendu. Décision du porteur du 2026-11-27 : la période propose aussi « Toutes les saisons », pour consulter les saisons passées.</p>`);

// 08 — Détail et correction d'une séance (EX-18)
ecran('seance', 1, "Détail d'une séance", 'EX-18, EX-13', 'historique', `
${titre('Poussins mercredi', 'historique')}
<div class="l-sous sous-titre">Mer. 19/11/2026 · 14:00 · enregistrée</div>
<div class="carte compteur mono"><span><i class="carre s-present"></i>19 présents</span><span><i class="carre s-absent"></i>2 absents</span><span><i class="carre s-excused"></i>1 excusé</span></div>
${carte(membres.slice(0, 5).map((p, i) => `<div class="rang"><span class="nom">${p.prenom} ${p.nom}</span>${pastille(['present', 'absent', 'present', 'excused', 'present'][i])}</div>`).join(''))}
<p class="aide">Touchez un statut pour le corriger.</p>
<div class="duo">${go('suppression-seance', 'Supprimer la séance', 'btn-s tiers danger')}${go('historique', 'Enregistrer les corrections', 'btn-p deuxtiers')}</div>
<p class="note">Décision du porteur du 2026-11-27 (EX-18) : champ « Commentaire de la séance (facultatif) », comme à l'appel, entre la liste et les boutons.</p>`);

// 09 — Paramètres
ecran('parametres', 1, 'Paramètres', 'EX-01 à EX-07, EX-19 à EX-24', 'parametres', `
${titre('Paramètres')}
${section('Organisation')}
${carte(`${ligne('Saisons', 'Active : 2026-2027', 'data-go="saisons"')}${ligne('Groupes', '3 groupes', 'data-go="groupes"')}${ligne('Membres', '65 membres', 'data-go="membres"')}${ligne('Créneaux', '3 créneaux', 'data-go="creneaux"')}`)}
${section('Réglages')}
${carte(`${ligne('Relance', 'Activée · 30 min', 'data-go="relance"')}${ligne("Alertes d'assiduité", 'Après 3 absences', 'data-go="assiduite"')}`)}
${section('Données')}
${carte(`${ligne('Sauvegarde et restauration', 'Dernière : il y a 34 jours', 'data-go="donnees"')}${ligne('Conservation', '3 saisons', 'data-go="donnees"')}${ligne('Tout effacer', '', 'data-go="tout-effacer"')}`)}
${section('À propos')}
${carte(`${ligne('Confidentialité', '', 'data-go="confidentialite"')}${ligne("Conditions d'utilisation", '', 'data-go="confidentialite"')}${ligne('Licences', '', 'data-go="licences"')}`)}`);

// 10 — Saisons (EX-01)
ecran('saisons', 1, 'Saisons', 'EX-01', 'parametres', `
${titre('Saisons', 'parametres')}
${carte(`
<div class="rang" data-go="saison-edition"><div><div class="l-titre">2026-2027</div><div class="l-sous mono">01/09/2026 – 31/07/2027</div></div><span class="badge">Active</span></div>
<div class="rang"><div><div class="l-titre">2025-2026</div><div class="l-sous mono">01/09/2025 – 31/07/2026</div></div><button class="btn-mini">Activer</button></div>
`)}
${go('saison-edition', 'Nouvelle saison', 'btn-s')}
<p class="note">Supprimer une saison : confirmation qui liste ce qui sera effacé (groupes, créneaux, séances, présences ; pas les membres).</p>`);

// 11 — Groupe (EX-02, EX-04)
ecran('groupe', 1, "Groupe et ses membres", 'EX-02, EX-04', 'parametres', `
${titre('Poussins mercredi', 'groupes')}
<div class="l-sous sous-titre">Saison 2026-2027 · 22 membres inscrits · <a class="lien" data-go="groupe-edition">Renommer ou supprimer</a></div>
${carte(membres.slice(0, 6).map((p) => ligne(`${p.prenom} ${p.nom}`, 'Inscrit depuis le 03/09/2026', 'data-go="membre"')).join(''))}
<div class="duo">${go('groupe', 'Archiver', 'btn-s tiers')}${go('inscription', 'Ajouter des membres', 'btn-p deuxtiers')}</div>`);

// 11a — Liste des groupes (EX-02)
ecran('groupes', 1, 'Groupes', 'EX-02', 'parametres', `
${titre('Groupes', 'parametres')}
<div class="l-sous sous-titre">Saison 2026-2027</div>
${carte(`${ligne('Poussins mercredi', '22 membres · mercredi 14:00', 'data-go="groupe"')}${ligne('Benjamins lundi', '18 membres · lundi 18:00', 'data-go="groupe"')}${ligne('Adultes jeudi', '25 membres · jeudi 20:00', 'data-go="groupe"')}`)}
${go('groupe-nouveau', 'Nouveau groupe')}
<div class="filtres"><span class="filtre">Voir les groupes archivés (1)</span></div>`);

// 11b — Création d'un groupe (EX-02)
ecran('groupe-nouveau', 1, "Création d'un groupe", 'EX-02', 'parametres', `
${titre('Nouveau groupe', 'groupes')}
<label>Nom du groupe</label><div class="champ actif">Poussins mercredi|</div>
<p class="aide">Rattaché à la saison active : 2026-2027.</p>
${go('groupe', 'Créer le groupe')}
<p class="note">Ensuite : ajouter ses membres, puis déclarer son créneau.</p>`);

// 11c — Liste des membres (EX-03)
ecran('membres', 1, 'Membres', 'EX-03', 'parametres', `
${titre('Membres', 'parametres')}
<input class="champ" placeholder="🔍 Rechercher un membre">
<div class="filtres"><span class="filtre on">Tous les groupes</span><span class="filtre">Archivés (4)</span></div>
${carte(membres.slice(0, 7).map((p, i) => ligne(`${p.prenom} ${p.nom}`, ['Poussins mercredi', 'Benjamins lundi', 'Poussins mercredi', 'Adultes jeudi', 'Poussins mercredi', 'Benjamins lundi', 'Aucun groupe'][i], 'data-go="membre"')).join(''))}
<div class="duo">${go('import', 'Importer (CSV)', 'btn-s tiers')}${go('membre-nouveau', 'Nouveau membre', 'btn-p deuxtiers')}</div>
<p class="note">« Importer (CSV) » : lot 2 (F-07).</p>`);

// 14a — Liste des créneaux (EX-07)
ecran('creneaux', 1, 'Créneaux', 'EX-07', 'parametres', `
${titre('Créneaux', 'parametres')}
${carte(`${ligne('Mercredi 14:00 – 15:30', 'Poussins mercredi · Gymnase Jean-Moulin', 'data-go="creneau-modif"')}${ligne('Lundi 18:00 – 19:30', 'Benjamins lundi · Dojo municipal', 'data-go="creneau"')}${ligne('Jeudi 20:00 – 21:30', 'Adultes jeudi · Dojo municipal', 'data-go="creneau"')}`)}
<div class="duo">${go('creneau', 'Chaque semaine', 'btn-s tiers')}${go('creneau-ponctuel', 'Nouveau créneau', 'btn-p deuxtiers')}</div>
${carte(ligne('Stage de Noël', '27, 28 et 29/12 · Poussins et Benjamins', 'data-go="creneau-ponctuel"'))}
<p class="note">Lot 1 : un seul bouton « Nouveau créneau », vers le créneau hebdomadaire ; « Chaque semaine » et les ponctuels arrivent au lot 2 (décision du 2026-11-27).</p>`);

// 12 — Fiche membre (EX-03, EX-04, EX-05)
ecran('membre', 1, 'Fiche membre', 'EX-03, EX-04, EX-05', 'parametres', `
${titre('Léo Garcia', 'membres')}
<label>Prénom</label><div class="champ">Léo</div>
<label>Nom</label><div class="champ">Garcia</div>
<label>Date de naissance <span class="facultatif">facultative</span></label><div class="champ mono">14/03/2017</div>
${section("Contacts d'urgence")}
${carte(`<div class="contact" data-go="contact"><div><div class="l-titre">Sa mère</div><div class="l-sous mono">06 00 00 00 01</div></div><span class="chev">≡</span></div><div class="contact" data-go="contact"><div><div class="l-titre">Son père</div><div class="l-sous mono">06 00 00 00 02</div></div><span class="chev">≡</span></div>`)}
${go('contact', '+ Ajouter un contact', 'btn-s')}<p class="note">≡ : glisser pour changer l'ordre des contacts.</p>
${section('Groupes')}
${carte(`<div class="rang"><div><div class="l-titre">Poussins mercredi</div><div class="l-sous">Depuis le 03/09/2026</div></div><button class="btn-mini" data-go="retrait">Retirer</button></div>`)}${go('inscription', '+ Ajouter à un groupe', 'btn-s')}
<div class="duo">${go('membre', 'Archiver', 'btn-s tiers')}${go('suppression', 'Supprimer', 'btn-s tiers danger')}</div>`);

// 13 — Confirmation de suppression (ABS-05)
ecran('suppression', 1, "Suppression d'un membre", 'EX-03, ABS-05', 'parametres', `
${titre('Supprimer Léo Garcia ?', 'membre')}
${carte(`<p>Seront effacés <b>définitivement</b> :</p><ul><li>sa fiche et sa date de naissance ;</li><li>ses 2 contacts d'urgence ;</li><li>ses <span class="mono">41</span> présences ;</li><li>ses 2 inscriptions.</li></ul><p class="l-sous">Pour le retirer des listes sans rien effacer, utilisez plutôt « Archiver ».</p>`, 'bandeau')}
<div class="duo">${go('membre', 'Garder', 'btn-s tiers')}${go('groupe', 'Supprimer définitivement', 'btn-p deuxtiers fond-marge')}</div>`);

// 14 — Créneau (EX-07)
ecran('creneau', 1, 'Créneau récurrent', 'EX-07', 'parametres', `
${titre('Nouveau créneau', 'creneaux')}
<label>Jour</label><div class="jours">${['L', 'M', 'Me', 'J', 'V', 'S', 'D'].map((d) => `<span class="jour ${d === 'Me' ? 'on' : ''}">${d}</span>`).join('')}</div>
<div class="deux"><div><label>Début</label><div class="champ mono">14:00</div></div><div><label>Durée</label><div class="champ mono">1 h 30</div></div></div>
<label>Groupe</label><div class="champ">Poussins mercredi ▾</div>
<label>Lieu <span class="facultatif">facultatif</span></label><div class="champ">Gymnase Jean-Moulin</div>
<label>Nom <span class="facultatif">facultatif</span></label><div class="champ vide">Par exemple « Technique »</div>
${go('creneaux', 'Enregistrer le créneau')}
<p class="note">Lot 2 : créneaux ponctuels (F-10) et plusieurs groupes (F-11) s'ajouteront à ce formulaire.</p>`);

// 15 — Données : sauvegarde, restauration, conservation, tout effacer
ecran('donnees', 1, 'Sauvegarde et données', 'EX-19, EX-20, EX-23, EX-24, ABS-06', 'parametres', `
${titre('Sauvegarde', 'parametres')}
${carte(`<div class="l-titre">Ce fichier n'est pas protégé</div><p>Il contient les noms, dates de naissance et contacts d'urgence de vos membres, et toutes leurs présences, <b>en clair</b>. Toute personne qui l'obtient peut les lire. Gardez-le en lieu sûr : sa garde vous revient.</p>`, 'bandeau')}
${go('donnees', 'Exporter une sauvegarde')}
<p class="l-sous">Dernière sauvegarde : il y a 34 jours.</p>
${section('Restaurer')}
${carte(`<p>Remplace <b>toutes</b> les données de l'appareil par celles du fichier. Le fichier est vérifié avant tout changement.</p>${go('restauration', 'Choisir un fichier…', 'btn-s')}`)}
${section('Conservation')}
${carte(`<div class="rang"><span>Garder les</span><span class="champ mini mono">3 ▾</span><span>dernières saisons</span></div><p class="l-sous">1 saison dépasse cette durée : 2023-2024.</p>${go('purge', 'Purger 2023-2024…', 'btn-s')}`)}
${section('Tout effacer')}
${carte(`<p class="l-sous">Efface toutes les données de cet appareil. Double confirmation.</p>${go('tout-effacer', 'Tout effacer…', 'btn-s danger')}`)}`);

// 16 — Base illisible (EX-22)
ecran('illisible', 1, 'Base illisible au démarrage', 'EX-22', null, `
${titre('Vos données ne peuvent pas être ouvertes')}
${carte(`<p>Le fichier de données de l'appli est abîmé. Rien n'a été effacé pour l'instant.</p><p>Vous pouvez restaurer votre dernière sauvegarde, ou repartir de zéro.</p>`)}
${go('accueil', 'Restaurer une sauvegarde')}
${go('illisible', 'Réessayer', 'btn-s')}
${go('bienvenue', 'Repartir de zéro', 'btn-s')}
<p class="note">Jamais de message technique ni de plantage. Une seule maquette, trois variantes.</p>
<p class="note">Réponses du porteur du 2026-11-27 (ticket 014c) : « Repartir de zéro » demande une confirmation (« Repartir de zéro ? », « Les données abîmées seront effacées définitivement. », « Garder » et « Effacer et repartir de zéro »), puis Bienvenue. (1) <b>Abîmée</b> seulement si le fichier est illisible (lecture d'essai ou contrôle du fichier) : cet écran, avec « Réessayer » au-dessus de « Repartir de zéro ». Toute autre erreur montre la variante « réglage refusé ». (2) Si l'effacement échoue : « L'effacement n'a pas abouti. Réessayez. » sous les boutons ; un fichier déjà absent compte comme effacé. (3) Le texte « Vous pouvez restaurer… » reste tel quel jusqu'au ticket 014f, qui ajoute « Restaurer une sauvegarde ». (4) <b>Réglage refusé</b> (ou erreur non reconnue, fichier gardé) : « L'appli n'a pas pu préparer le fichier de données. Rien n'a été effacé. » et un seul bouton, « Réessayer ». <b>Version plus récente</b> : « Vos données viennent d'une version plus récente de l'appli : mettez l'appli à jour. Rien n'a été effacé. », sans aucun bouton.</p>
<p class="note">Décisions automatiques, à relire (ticket 014c) : même titre pour les trois variantes ; avant le 014f, « Réessayer » est le bouton principal et « Repartir de zéro » reste secondaire ; boutons désactivés pendant un nouvel essai ; au démarrage, une vue vide (Papier) tant que la base n'est pas prête.</p>`);

// ---------- Écrans ajoutés à la deuxième passe ----------
const confirmer = (t, retour, corps, oui, ouiVers, non = 'Garder') => `${titre(t, retour)}${carte(corps, 'bandeau')}<div class="duo">${go(retour, non, 'btn-s tiers')}${go(ouiVers, oui, 'btn-p deuxtiers fond-marge')}</div>`;

ecran('accueil-brouillon', 1, 'Accueil avec un appel interrompu', 'EX-14', 'accueil', `
${titre('Mercredi 26 nov.')}
${carte(`<div class="l-titre">Appel en cours</div><div class="l-sous">Poussins mercredi · commencé à 14:03 · 3 absents notés</div><div class="duo">${go('abandon-brouillon', 'Abandonner', 'btn-s tiers')}${go('appel', "Reprendre l'appel", 'btn-p deuxtiers')}</div>`, 'bandeau')}
<p class="note">S'affiche à la réouverture si un brouillon d'appel existe (fermeture forcée, redémarrage). L'appel s'ouvre aussi directement sur le brouillon depuis « Nouvel appel » (« Appel en cours : Poussins mercredi »). Le brouillon naît au premier changement ; tant qu'il existe, un autre appel affiche « Un appel est en cours : … Reprenez-le ou abandonnez-le depuis l'accueil. » avec « Reprendre l'appel » (décisions du 2026-11-27).</p>`);

ecran('abandon-brouillon', 1, "Abandon d'un brouillon d'appel", 'EX-14', 'accueil', confirmer("Abandonner l'appel en cours ?", 'accueil-brouillon',
  `<p>Les statuts déjà notés pour <b>Poussins mercredi</b> seront perdus. Aucune séance ne sera enregistrée.</p>`, 'Abandonner', 'accueil', 'Revenir'));

ecran('invitation-sauvegarde', 1, 'Invitation à sauvegarder (premier appel)', 'EX-21', 'appel', `
${titre('Premier appel enregistré')}
${carte(`<div class="l-titre">Pensez à sauvegarder</div><p>Vos données ne vivent que sur cet appareil. Si vous le perdez ou le changez, seule une sauvegarde permet de les retrouver.</p>`)}
${go('donnees', 'Sauvegarder maintenant')}
${go('historique', 'Plus tard', 'btn-s')}
<p class="note">Une seule fois, après le premier appel enregistré.</p>`);

ecran('saison-edition', 1, "Création ou modification d'une saison", 'EX-01', 'parametres', `
${titre('Saison', 'saisons')}
<label>Nom</label><div class="champ">2026-2027</div>
<div class="deux"><div><label>Début</label><div class="champ mono">01/09/2026</div></div><div><label>Fin</label><div class="champ mono">31/07/2027</div></div></div>
${go('saisons', 'Enregistrer')}
${go('suppression-saison', 'Supprimer la saison', 'btn-s danger')}`);

ecran('suppression-saison', 1, "Suppression d'une saison", 'EX-01, ABS-05', 'parametres', confirmer('Supprimer 2025-2026 ?', 'saison-edition',
  `<p>Seront effacés <b>définitivement</b> : ses <span class="mono">3</span> groupes, <span class="mono">3</span> créneaux, <span class="mono">96</span> séances et toutes leurs présences.</p><p class="l-sous">Les membres sont conservés.</p>`, 'Supprimer définitivement', 'saisons'));

ecran('groupe-edition', 1, "Renommer ou supprimer un groupe", 'EX-02', 'parametres', `
${titre('Modifier le groupe', 'groupe')}
<label>Nom du groupe</label><div class="champ">Poussins mercredi</div>
${go('groupe', 'Enregistrer')}
${go('suppression-groupe', 'Supprimer le groupe', 'btn-s danger')}`);

ecran('suppression-groupe', 1, "Suppression d'un groupe", 'EX-02, ABS-05', 'parametres', confirmer('Supprimer Poussins mercredi ?', 'groupe-edition',
  `<p>Seront effacés <b>définitivement</b> : ses inscriptions, son créneau, ses <span class="mono">31</span> séances et leurs présences.</p><p class="l-sous">Les membres sont conservés. Pour le retirer des écrans sans rien effacer, utilisez plutôt « Archiver ».</p>`, 'Supprimer définitivement', 'groupes'));

ecran('membre-nouveau', 1, "Création d'un membre", 'EX-03, EX-04', 'parametres', `
${titre('Nouveau membre', 'membres')}
<label>Prénom</label><div class="champ">Yanis</div>
<label>Nom</label><div class="champ">Colin</div>
<label>Date de naissance <span class="facultatif">facultative</span></label><div class="champ vide">JJ/MM/AAAA</div>
<label>Groupe <span class="facultatif">facultatif</span></label><div class="champ">Poussins mercredi ▾</div>
${go('membre', 'Créer le membre')}
<p class="note">Les contacts d'urgence s'ajoutent ensuite depuis sa fiche.</p>`);

ecran('inscription', 1, 'Inscription de membres à un groupe', 'EX-04', 'parametres', `
${titre('Ajouter à Poussins mercredi', 'groupe')}
<input class="champ" placeholder="🔍 Rechercher parmi les membres">
${carte(membres.slice(8, 13).map((p, i) => `<div class="rang"><span class="nom">${p.prenom} ${p.nom}</span><span class="case ${i < 2 ? 'on' : ''}">${i < 2 ? '✓' : ''}</span></div>`).join(''))}
<label>À partir du</label><div class="champ mono">26/11/2026</div>
<div class="duo">${go('membre-nouveau', 'Nouveau membre', 'btn-s tiers')}${go('groupe', 'Inscrire 2 membres', 'btn-p deuxtiers')}</div>`);

ecran('retrait', 1, "Retrait d'un membre d'un groupe", 'EX-04', 'parametres', confirmer('Retirer Léo Garcia de Poussins mercredi ?', 'membre',
  `<p>Il n'apparaîtra plus dans l'appel de ce groupe à partir du :</p><div class="champ mono">26/11/2026</div><p class="l-sous">Ses présences passées sont conservées.</p>`, 'Retirer du groupe', 'membre', 'Annuler'));

ecran('contact', 1, "Contact d'urgence", 'EX-05', 'parametres', `
${titre("Contact d'urgence", 'membre')}
<label>Qui est-ce ?</label><div class="champ">Sa mère</div>
<label>Téléphone</label><div class="champ mono">06 00 00 00 01</div>
${go('membre', 'Enregistrer')}
${go('membre', 'Supprimer ce contact', 'btn-s danger')}`);

ecran('creneau-modif', 1, "Modification d'un créneau", 'EX-07', 'parametres', `
${titre('Mercredi 14:00', 'creneaux')}
<label>Jour</label><div class="jours">${['L', 'M', 'Me', 'J', 'V', 'S', 'D'].map((d) => `<span class="jour ${d === 'Me' ? 'on' : ''}">${d}</span>`).join('')}</div>
<div class="deux"><div><label>Début</label><div class="champ mono">14:00</div></div><div><label>Durée</label><div class="champ mono">1 h 30</div></div></div>
<label>Groupe</label><div class="champ">Poussins mercredi ▾</div>
<label>Lieu <span class="facultatif">facultatif</span></label><div class="champ">Gymnase Jean-Moulin</div>
<label>Nom <span class="facultatif">facultatif</span></label><div class="champ vide">Par exemple « Technique »</div>
${go('creneaux', 'Enregistrer')}
${go('suppression-creneau', 'Supprimer le créneau', 'btn-s danger')}
<p class="note">Modifier ou supprimer un créneau ne touche à aucune séance déjà enregistrée (EX-07). Lieu et nom modifiables (décision du 2026-11-27).</p>`);

ecran('suppression-creneau', 1, "Suppression d'un créneau", 'EX-07', 'parametres', confirmer('Supprimer ce créneau ?', 'creneau-modif',
  `<p>Le créneau sera supprimé. L'appel interrompu sur ce créneau sera effacé.</p><p class="l-sous">Les séances déjà enregistrées sont conservées.</p>`, 'Supprimer', 'creneaux') + `
<p class="note">La phrase sur l'appel interrompu n'apparaît que s'il y en a un (décision du 2026-11-27).</p>`);

ecran('suppression-seance', 1, "Suppression d'une séance", 'EX-18', 'historique', confirmer('Supprimer cette séance ?', 'seance',
  `<p>L'appel de <b>Poussins mercredi</b> du <span class="mono">19/11/2026</span> et ses <span class="mono">22</span> présences seront effacés définitivement.</p><p class="l-sous">La date réapparaîtra comme appel manquant.</p>`, 'Supprimer définitivement', 'historique'));

ecran('restauration', 1, "Restauration d'une sauvegarde", 'EX-20', 'parametres', `
${titre('Restaurer ?', 'donnees')}
${carte(`<div class="l-titre">Sauvegarde du 22/10/2026</div><div class="l-sous mono">65 membres · 3 groupes · 112 séances</div><p>Toutes les données actuelles de l'appareil seront <b>remplacées</b> par celles de ce fichier.</p><p>L'appel en cours (Poussins mercredi) sera aussi remplacé.</p>`, 'bandeau')}
<div class="duo">${go('donnees', 'Annuler', 'btn-s tiers')}${go('accueil', 'Remplacer mes données', 'btn-p deuxtiers fond-marge')}</div>
${section('Si le fichier est invalide')}
${carte(`<div class="l-titre">Ce fichier n'est pas une sauvegarde Ki&La</div><p class="l-sous">Rien n'a été modifié. Choisissez un autre fichier.</p>`)}
${go('restauration', 'Choisir un fichier…', 'btn-s')}
${section('Pendant la vérification')}
<p class="l-sous">Vérification du fichier…</p>
<p class="note">Décisions du porteur du 2026-11-27 (tickets 014b et 014e) : « Choisir un fichier… » de l'écran Sauvegarde ouvre cet écran, qui lance le sélecteur ; sélecteur annulé = retour à Sauvegarde. La confirmation nomme l'appel en cours remplacé, s'il y en a un. Pendant la vérification : « Vérification du fichier… ». Messages d'un refus, chacun suivi de « Rien n'a été modifié. Choisissez un autre fichier. » et du bouton « Choisir un fichier… » : « Ce fichier n'est pas une sauvegarde Ki&La » ; « Cette sauvegarde est abîmée ou a été modifiée » ; « Cette sauvegarde vient d'une version plus récente de l'appli : mettez l'appli à jour » ; « La restauration n'a pas abouti ». Après une réussite : l'accueil, sans message.</p>
<p class="note">Décisions automatiques, à relire (ticket 014e) : sans date dans le fichier, le titre est « Sauvegarde » ; appel en cours dont le groupe a été supprimé : « L'appel en cours sera aussi remplacé. » ; un échec du sélecteur s'affiche comme « La restauration n'a pas abouti » ; pendant la restauration, l'écran ne peut pas être quitté (retour caché, boutons désactivés, retour du système bloqué).</p>`);

ecran('purge', 1, 'Purge des anciennes saisons', 'EX-24, ABS-05', 'parametres', confirmer('Purger 2023-2024 ?', 'donnees',
  `<p>Seront effacés <b>définitivement</b> : la saison 2023-2024, ses groupes, créneaux, séances et présences.</p><p class="l-sous">Les membres qui ne figurent plus dans aucune saison conservée sont aussi effacés.</p>`, 'Purger', 'donnees'));

ecran('tout-effacer', 1, 'Tout effacer (double confirmation)', 'EX-23, ABS-05', 'parametres', `
${titre('Tout effacer ?', 'donnees')}
${carte(`<p>Toutes les données de cet appareil seront effacées <b>définitivement</b> : membres, contacts d'urgence, groupes, créneaux, séances, présences et réglages.</p><p class="l-sous">Sans sauvegarde, elles ne pourront pas être retrouvées.</p>`, 'bandeau')}
<label>Pour confirmer, tapez EFFACER</label><div class="champ mono vide">EFFACER</div>
<div class="duo">${go('donnees', 'Garder', 'btn-s tiers')}${go('bienvenue', 'Tout effacer', 'btn-p deuxtiers fond-marge')}</div>
<p class="note">Double confirmation : le bouton, puis le mot à taper.</p>`);

ecran('confidentialite', 1, 'Page légale (confidentialité, conditions)', 'EX-40, EX-41', 'parametres', `
${titre('Confidentialité', 'parametres')}
<div class="l-sous sous-titre">Version du 26/11/2026 · aussi en ligne</div>
${carte(`<h3 class="section">En bref</h3><p><b>Aucune donnée collectée.</b> Tout ce que vous saisissez reste sur cet appareil. L'appli n'envoie rien sur Internet.</p><h3 class="section">Vos membres</h3><p>Texte définitif au document de conformité.</p>`)}
<p class="note">Même gabarit pour les conditions d'utilisation : texte long, titres de section, aucune action.</p>`);

ecran('licences', 1, 'Licences tierces', 'EX-42', 'parametres', `
${titre('Licences', 'parametres')}
${carte(`${ligne('IBM Plex Sans, IBM Plex Mono', 'SIL Open Font License 1.1')}${ligne('React Native', 'MIT')}${ligne('Expo', 'MIT')}${ligne('…', 'Liste générée depuis les dépendances réellement embarquées')}`)}
<p class="note">Un appui ouvre le texte complet de la licence. Liste indicative : elle sera générée au build.</p>`);

ecran('etats-vides', 1, 'États vides (une carte par liste)', 'P1, NF-06', null, `
${titre('États vides')}
<p class="note">Catalogue : chaque carte remplace le contenu de la liste concernée quand elle est vide.</p>
${section('Saisons')}${carte(`<p>Aucune saison. Créez-en une pour y ranger vos groupes et vos appels.</p>${go('saison-edition', 'Nouvelle saison')}`)}
${section('Groupes')}${carte(`<p>Aucun groupe dans cette saison.</p>${go('groupe-nouveau', 'Créer un groupe')}`)}
${section('Groupe sans membre')}${carte(`<p>Personne n'est encore inscrit à ce groupe.</p>${go('inscription', 'Ajouter des membres')}`)}
${section('Membres')}${carte(`<p>Aucun membre pour l'instant.</p>${go('membre-nouveau', 'Nouveau membre')}`)}
${section('Créneaux')}${carte(`<p>Aucun créneau. Déclarez quand vos groupes se réunissent pour que l'appli propose l'appel au bon moment.</p>${go('creneau', 'Nouveau créneau')}`)}
${section('Historique')}${carte(`<p>Aucun appel enregistré. Votre premier appel apparaîtra ici.</p>${go('appel', "Faire l'appel")}`)}
${section('Recherche sans résultat')}${carte(`<p>Aucun membre ne correspond à « xyz ».</p><p class="l-sous">Vérifiez l'orthographe, ou cherchez par le prénom.</p>`)}
${section("Appel d'un groupe vide")}${carte(`<p>Ce groupe n'a aucun membre à appeler.</p>${go('inscription', 'Ajouter des membres', 'btn-s')}`)}
<p class="note">Décisions du porteur du 2026-11-27 : l'appel d'un groupe vide garde aussi « Ajouter un membre » (EX-12) sous la carte ; « + » est l'icône du bouton, le libellé est « Ajouter un contact ».</p>
${section("Membre sans contact d'urgence")}${carte(`<p>Aucun contact d'urgence pour Léo Garcia.</p>${go('contact', '+ Ajouter un contact', 'btn-s')}`)}`);

// 17 — Annuler une séance (lot 2, F-13) : laissée en lien depuis l'accueil, page d'attente
// ========== Lot 2 : F-04 à F-14 ==========
const barre = (p, r, e, a) => `<div class="barre"><i class="s-present" style="width:${p}%"></i><i class="s-late" style="width:${r}%"></i><i class="s-excused" style="width:${e}%"></i><i class="s-absent" style="width:${a}%"></i></div>`;
const taux = (t) => `<span class="mono taux">${t}</span>`;
const frise = () => {
  const jours = [['Lun 24', 'manquant', 'Benjamins'], ['Mer 19', 'fait', 'Poussins'], ['Jeu 20', 'fait', 'Adultes'], ['Mer 26', 'maintenant', 'Poussins'], ['Jeu 27', 'preparee', 'Adultes'], ['Lun 01', 'avenir', 'Benjamins'], ['Mer 03', 'annulee', 'Poussins']];
  const lib = { manquant: 'Appel manquant', fait: 'Fait', maintenant: 'Maintenant', preparee: 'Préparée', avenir: 'À venir', annulee: 'Annulée' };
  return `<div class="frise">${jours.map(([d, k, g]) => `<div class="pastel f-${k}" data-go="${k === 'manquant' || k === 'maintenant' ? 'appel' : k === 'avenir' || k === 'preparee' ? 'preparation' : k === 'fait' ? 'seance' : 'seance-annulee'}"><div class="mono">${d}</div><div class="l-titre">${g}</div><div class="etat">${lib[k]}</div></div>`).join('')}</div>`;
};

// F-12, F-04 — Accueil complet
ecran('accueil-complet', 2, 'Accueil complet (frise et alertes)', 'EX-35, EX-25, EX-09, EX-17', 'accueil', `
${titre('Mercredi 26 nov.')}
<div class="recherche" data-go="urgence">🔍 Contact d'urgence : rechercher un membre</div>
${frise()}
<p class="note">Frise : 28 jours en arrière, 7 en avant, défilement horizontal ; centrée sur aujourd'hui.</p>
${section('Maintenant')}
${carte(`<div class="l-titre gros">Poussins mercredi</div><div class="l-sous">14:00 – 15:30 · Gymnase Jean-Moulin · 22 membres</div><div class="duo">${go('annuler', 'Annuler', 'btn-s tiers')}${go('appel', "Faire l'appel", 'btn-p deuxtiers')}</div>`)}
${section("Alertes d'assiduité")}
${carte(`<div class="rang" data-go="alerte"><div><div class="l-titre">Hugo Moreau</div><div class="l-sous">Poussins mercredi</div></div><span class="rouge mono">4 absences</span></div><div class="rang" data-go="alerte"><div><div class="l-titre">Rose André</div><div class="l-sous">Benjamins lundi</div></div><span class="rouge mono">3 absences</span></div>`)}`);

// F-04 — Traiter une alerte
ecran('alerte', 2, "Alerte d'assiduité", 'EX-25, EX-26', 'accueil', `
${titre('Hugo Moreau', 'accueil-complet')}
<div class="l-sous sous-titre">Poussins mercredi · 4 absences non excusées de suite</div>
${carte(`<div class="l-sous">Dernières séances</div><div class="cases">${['absent', 'absent', 'absent', 'absent', 'present', 'excused'].map((k) => `<span class="cas s-${k}">${ico[k]}</span>`).join('')}</div><p class="l-sous">De la plus récente à la plus ancienne.</p>`)}
${go('urgence', "Voir ses contacts d'urgence", 'btn-s')}
${go('accueil-complet', 'Marquer comme traitée')}
<p class="note">L'alerte réapparaît si la série s'allonge (EX-26).</p>`);

// F-05 — Statistiques
ecran('stats', 2, 'Statistiques', 'EX-27, RM-01', 'stats', `
${titre('Statistiques')}
<div class="filtres"><span class="filtre on">Saison</span><span class="filtre">Ce mois</span><span class="filtre" data-go="periode">Dates…</span></div>
<div class="deux">${carte(`<div class="l-sous">Taux de présence</div><div class="chiffre mono">87 %</div>`)}${carte(`<div class="l-sous">Séances</div><div class="chiffre mono">112</div>`)}</div>
${section('Par groupe')}
${carte(`<div data-go="stats-groupe" class="sg"><div class="rang"><span class="l-titre">Poussins mercredi</span>${taux('91 %')}</div>${barre(84, 7, 4, 5)}</div><div data-go="stats-groupe" class="sg"><div class="rang"><span class="l-titre">Benjamins lundi</span>${taux('82 %')}</div>${barre(74, 8, 5, 13)}</div><div data-go="stats-groupe" class="sg"><div class="rang"><span class="l-titre">Adultes jeudi</span>${taux('—')}</div><p class="l-sous">Aucune séance sur la période.</p></div>`)}
<div class="legende">${['present', 'late', 'excused', 'absent'].map((k) => `<span><i class="carre s-${k}"></i>${st[k].libelle}</span>`).join('')}</div>
<div class="duo">${go('export-csv', 'Exporter (CSV)', 'btn-s tiers')}${go('rapport', 'Rapport PDF', 'btn-s deuxtiers')}</div>
<p class="note">« — » et non 0 % sans séance (RM-01).</p>`);

ecran('periode', 2, 'Choix d\'une période', 'EX-27', 'stats', `
${titre('Période', 'stats')}
<div class="deux"><div><label>Du</label><div class="champ mono">01/09/2026</div></div><div><label>Au</label><div class="champ mono">26/11/2026</div></div></div>
${go('stats', 'Appliquer')}`);

// F-05, F-14 — Groupe : membres et podium
ecran('stats-groupe', 2, 'Statistiques d\'un groupe (podium)', 'EX-27, EX-37', 'stats', `
${titre('Poussins mercredi', 'stats')}
<div class="l-sous sous-titre">Saison 2026-2027 · 12 séances</div>
${section('Podium')}
${carte(`<div class="podium"><div class="marche m2"><div class="mono">2</div>Emma D.<br><span class="mono">96 %</span></div><div class="marche m1"><div class="mono">1</div>Léa M. · Zoé B.<br><span class="mono">100 %</span></div><div class="marche m3"><div class="mono">3</div>Jules L.<br><span class="mono">92 %</span></div></div><p class="l-sous">Ex æquo au même rang.</p>`)}
${section('Par membre')}
${carte([['Zoé Blanc', '100 %'], ['Emma Durand', '96 %'], ['Jules Lefebvre', '92 %'], ['Léa Michel', '100 %'], ['Hugo Moreau', '58 %']].map(([n, t]) => `<div class="rang" data-go="stats-membre"><span>${n}</span>${taux(t)}</div>`).join(''))}
<p class="l-sous">Triés par nom ; 22 membres.</p>`);

ecran('stats-membre', 2, "Statistiques d'un membre", 'EX-27', 'stats', `
${titre('Hugo Moreau', 'stats-groupe')}
<div class="l-sous sous-titre">Poussins mercredi · saison 2026-2027</div>
${carte(`<div class="chiffre mono">58 %</div>${barre(50, 8, 8, 34)}<p class="l-sous mono">6 présent · 1 retard · 1 excusé · 4 absent</p>`)}
${section('Séance par séance')}
${carte(`<div class="cases">${['present', 'present', 'late', 'present', 'excused', 'present', 'present', 'present', 'absent', 'absent', 'absent', 'absent'].map((k) => `<span class="cas s-${k}">${ico[k]}</span>`).join('')}<span class="cas vide"></span></div><p class="l-sous">Case vide : séance hors inscription.</p>`)}`);

// F-06 — Relance
ecran('relance', 2, 'Réglage de la relance', 'EX-28, EX-29', 'parametres', `
${titre('Relance', 'parametres')}
${carte(`<div class="rang"><div><div class="l-titre">Me relancer si l'appel n'est pas fait</div><div class="l-sous">Notification sur cet appareil, jamais envoyée ailleurs</div></div><span class="interrupteur on"></span></div><div class="rang"><span>Après</span><span class="champ mini mono">30 min ▾</span><span>le début du créneau</span></div>`)}
${carte(`<div class="l-titre">Notifications refusées dans les réglages du téléphone</div><p class="l-sous">La relance est activée ici mais ne peut pas s'afficher.</p>${go('relance', 'Ouvrir les réglages du téléphone', 'btn-s')}`, 'bandeau')}
<p class="note">L'interrupteur montre l'état effectif : préférence et permission du système (EX-29).</p>`);

ecran('permission', 2, 'Demande de permission de notification', 'EX-29', 'parametres', `
${titre('Autoriser les notifications ?', 'relance')}
${carte(`<p>Pour vous relancer quand un appel n'est pas fait, l'appli doit afficher des notifications.</p><p class="l-sous">Elles nomment le groupe, jamais un membre. Rien n'est envoyé hors de l'appareil.</p>`)}
${go('relance', 'Continuer')}${go('relance', 'Pas maintenant', 'btn-s')}
<p class="note">Affiché à l'activation de la relance, juste avant la demande du système.</p>`);

ecran('notification', 2, 'Relance sur l\'écran verrouillé', 'EX-28, ABS-04', null, `
<div class="verrou"><div class="mono heure">14:30</div>${carte(`<div class="l-sous">Ki&La · maintenant</div><div class="l-titre">Appel non fait : Poussins mercredi</div><div class="l-sous">Le créneau a commencé à 14:00.</div>`)}</div>
<p class="note">Le groupe seul, jamais un nom de membre. Un appui ouvre l'appel.</p>`);

ecran('assiduite', 2, "Réglage des alertes d'assiduité", 'EX-25', 'parametres', `
${titre("Alertes d'assiduité", 'parametres')}
${carte(`<div class="rang"><span>Alerter après</span><span class="champ mini mono">3 ▾</span><span>absences de suite</span></div><p class="l-sous">Seules les absences non excusées comptent.</p>`)}`);

// F-07 — Import CSV
ecran('import', 2, 'Import CSV : choisir le fichier', 'EX-30', 'parametres', `
${titre('Importer des membres', 'membres')}
${carte(`<p>Préparez un tableau (Excel, LibreOffice…) avec une ligne par membre, enregistré au format <b>CSV</b>.</p><table class="exemple mono"><tr><th>nom</th><th>prenom</th><th>date_naissance</th><th>telephone</th><th>groupe</th></tr><tr><td>Colin</td><td>Yanis</td><td>02/05/2016</td><td>0600000003</td><td>Poussins mercredi</td></tr></table><p class="l-sous">Seuls nom et prénom sont obligatoires. Les autres colonnes sont ignorées.</p>`)}
${go('import-apercu', 'Choisir le fichier…')}`);

ecran('import-apercu', 2, 'Import CSV : aperçu', 'EX-30', 'parametres', `
${titre('Aperçu', 'import')}
<div class="carte compteur mono"><span>24 lignes</span><span>21 à importer</span><span class="rouge">1 invalide</span><span>2 doublons</span></div>
${section('Doublons')}
${carte(`<div class="rang"><div><div class="l-titre">Léo Garcia</div><div class="l-sous mono">14/03/2017 · déjà dans l'appli</div></div><span class="filtre on">Ignorer</span></div><div class="rang"><div><div class="l-titre">Zoé Blanc</div><div class="l-sous mono">déjà dans l'appli</div></div><span class="filtre on">Ignorer</span></div>`)}
${section('Ligne invalide')}
${carte(`<div class="rang"><div><div class="l-titre">Ligne 17</div><div class="l-sous">Prénom manquant</div></div></div>`)}
${go('import-resultat', 'Importer 21 membres')}
<p class="note">Rien n'est écrit avant ce bouton.</p>`);

ecran('import-resultat', 2, 'Import CSV : résultat', 'EX-30', 'parametres', `
${titre('21 membres importés', 'membres')}
${carte(`<p>21 membres ajoutés, dont 18 inscrits à leur groupe. 2 doublons ignorés, 1 ligne invalide.</p>`)}
${go('membres', 'Voir les membres')}`);

ecran('import-erreur', 2, 'Import CSV : fichier illisible', 'EX-30', 'parametres', `
${titre('Fichier non reconnu', 'import')}
${carte(`<p>Ce fichier ne contient pas de colonnes « nom » et « prenom ». Rien n'a été importé.</p>`, 'bandeau')}
${go('import', 'Choisir un autre fichier')}`);

// F-08, F-09 — Exports
ecran('export-csv', 2, 'Export CSV des présences', 'EX-31', 'stats', `
${titre('Exporter les présences', 'stats')}
<label>Groupe</label><div class="champ">Tous les groupes ▾</div>
<div class="deux"><div><label>Du</label><div class="champ mono">01/09/2026</div></div><div><label>Au</label><div class="champ mono">26/11/2026</div></div></div>
${carte(`<p>Le fichier contient les noms des membres et leurs présences, <b>en clair</b>. Partagez-le seulement avec qui doit le recevoir.</p>`, 'bandeau')}
${go('export-csv', 'Exporter (2 418 lignes)')}`);

ecran('rapport', 2, 'Rapport PDF', 'EX-32', 'stats', `
${titre('Rapport PDF', 'stats')}
<label>Période</label><div class="champ">Saison 2026-2027 ▾</div>
<label>Groupes</label><div class="champ">Tous les groupes ▾</div>
${carte(`<div class="feuille"><div class="l-titre">Ki&La · Rapport de présence</div><div class="l-sous mono">01/09/2026 – 26/11/2026</div><div class="barre"><i class="s-present" style="width:80%"></i><i class="s-late" style="width:7%"></i><i class="s-excused" style="width:5%"></i><i class="s-absent" style="width:8%"></i></div><div class="l-sous">Synthèse, puis une page par groupe…</div></div>`)}
${go('rapport', 'Créer et partager le PDF')}
<p class="note">Format A4. Contenu exact : question ouverte du PRD (→ ticket F-09).</p>`);

// F-10, F-11 — Créneau ponctuel et plusieurs groupes
ecran('creneau-ponctuel', 2, 'Créneau ponctuel (plusieurs groupes)', 'EX-33, EX-34', 'parametres', `
${titre('Nouveau créneau', 'creneaux')}
<div class="bascule"><span>Chaque semaine</span><span class="on">À des dates précises</span></div>
<label>Dates</label><div class="filtres"><span class="filtre on mono">27/12</span><span class="filtre on mono">28/12</span><span class="filtre on mono">29/12</span><span class="filtre">+ date</span></div>
<div class="deux"><div><label>Début</label><div class="champ mono">10:00</div></div><div><label>Durée</label><div class="champ mono">3 h</div></div></div>
<label>Groupes</label><div class="filtres"><span class="filtre on">Poussins mercredi</span><span class="filtre on">Benjamins lundi</span><span class="filtre">Adultes jeudi</span></div>
<label>Nom <span class="facultatif">facultatif</span></label><div class="champ">Stage de Noël</div>
${go('creneaux', 'Enregistrer le créneau')}
<p class="note">Récurrent ou ponctuel : un seul formulaire ; plusieurs groupes possibles dans les deux cas. Un ponctuel réclame un appel pour chacune de ses dates passées (EX-33).</p>`);

ecran('appel-multi', 2, 'Appel de plusieurs groupes', 'EX-34', 'appel', `
${titre('Stage de Noël', 'accueil-complet')}
<div class="l-sous sous-titre">Sam. 27/12/2026 · 10:00 · 2 groupes</div>
${section('Poussins mercredi')}
${carte(membres.slice(0, 3).map((p) => `<div class="rang"><span class="nom">${p.prenom} ${p.nom}</span>${pastille('present')}</div>`).join(''))}
${section('Benjamins lundi')}
${carte(membres.slice(3, 6).map((p, i) => `<div class="rang"><span class="nom">${p.prenom} ${p.nom}</span>${pastille(i === 1 ? 'absent' : 'present')}</div>`).join(''))}
${go('historique', "Enregistrer l'appel")}
<p class="note">Chaque présence compte pour le groupe du membre (RM-03).</p>`);

// F-13 — Préparer, annuler, rétablir
ecran('preparation', 2, "Préparation d'un appel", 'EX-36', 'appel', `
${titre('Adultes jeudi', 'accueil-complet')}
<div class="l-sous sous-titre">Jeu. 27/11/2026 · 20:00 · <b>préparation</b></div>
${carte(`<p class="l-sous">La séance n'a pas commencé : notez les excusés à l'avance. Elle ne compte nulle part avant d'être enregistrée le jour venu.</p>`)}
${carte(membres.slice(0, 5).map((p, i) => `<div class="rang"><span class="nom">${p.prenom} ${p.nom}</span>${pastille(i === 2 ? 'excused' : 'preparedPresent')}</div>`).join(''))}
${go('accueil-complet', 'Enregistrer la préparation')}
<p class="note">Deux statuts seulement : Attendu ↔ Excusé. La relance part quand même.</p>`);

ecran('annuler', 2, 'Annuler une séance', 'EX-38', 'accueil', `
${titre("Que s'est-il passé ?", 'accueil-complet')}
<div class="l-sous sous-titre">Poussins mercredi · mer. 26/11/2026 · 14:00</div>
${go('accueil-complet', 'La séance a été annulée', 'btn-s choix')}
${go('accueil-complet', 'Aucune séance prévue ce jour-là', 'btn-s choix')}
<p class="l-sous">Vacances, salle fermée…</p>
${go('accueil-complet', 'Garder la séance')}
<p class="note">Annulée et non planifiée : pas de relance, rien dans les statistiques, distinguées dans l'historique. Possible tant que la séance n'a pas commencé.</p>`);

ecran('seance-annulee', 2, "Séance annulée : rétablir", 'EX-38', 'historique', `
${titre('Poussins mercredi', 'historique')}
<div class="l-sous sous-titre">Mer. 03/12/2026 · <span class="gris">Annulée</span></div>
${carte(`<p>Cette séance est marquée annulée. Elle ne réclame pas d'appel et ne compte pas dans les statistiques.</p>`)}
${go('accueil-complet', 'Rétablir la séance', 'btn-s')}
<p class="note">Une préparation déjà posée revient intacte.</p>`);

ecran('vides-lot2', 2, 'États vides du lot 2', 'EX-25, EX-27', null, `
${titre('États vides')}
${section("Alertes d'assiduité")}${carte(`<p>Aucune alerte : personne n'a manqué ${'3'} séances de suite.</p>`)}
${section('Statistiques')}${carte(`<p>Pas encore de statistiques : elles apparaissent après le premier appel enregistré.</p>${go('appel', "Faire l'appel")}`)}
${section('Frise')}${carte(`<p>Aucun créneau déclaré : la frise se remplira dès votre premier créneau.</p>${go('creneau', 'Nouveau créneau')}`)}
${section('Export sur une période sans séance')}${carte(`<p>Aucune présence sur cette période : rien à exporter.</p>`)}`);

// ---------- Page ----------
const ecransJson = JSON.stringify(ecrans.map(({ id, lot, titre: t, exigences }) => ({ id, lot, titre: t, exigences })));
const membresJson = JSON.stringify(membres);
const statutsJson = JSON.stringify(st);

const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Ki&La — maquettes (lot 1)</title>
<style>
:root{--encre:${c.encre};--marge:${c.marge};--papier:${c.papier};--quad:${c.quadrillage};--blanc:${c.blanc};--texte:${c.texte};--texte2:${c.texteSecondaire};}
*{box-sizing:border-box}body{margin:0;font-family:"IBM Plex Sans",system-ui,sans-serif;background:#e9ecf2;color:var(--texte);display:flex;gap:24px;padding:24px;align-items:flex-start}
.mono{font-family:"IBM Plex Mono",ui-monospace,monospace;font-weight:500}
nav.menu{width:250px;flex:none;font-size:14px;position:sticky;top:24px}
nav.menu h2{font-size:15px;margin:0 0 8px}nav.menu a{display:block;padding:5px 8px;border-radius:6px;color:var(--texte);text-decoration:none;cursor:pointer}
nav.menu a.on{background:var(--encre);color:#fff}nav.menu a .v{float:right}nav.menu .lot{margin:12px 0 4px;color:var(--texte2);font-size:12px;text-transform:uppercase;letter-spacing:.08em}
.boutons button{margin:4px 4px 0 0;font:inherit;font-size:13px;padding:5px 8px;border:1px solid #bbb;border-radius:6px;background:#fff;cursor:pointer}
.appareil{flex:none;width:390px;height:844px;border-radius:36px;border:10px solid #1b2233;overflow:hidden;position:relative;background:var(--papier);box-shadow:0 10px 30px #0003}
.appareil.tablette{width:834px;height:1112px;border-radius:24px}
.fond{position:absolute;inset:0;background-image:linear-gradient(var(--quad) ${m.traitCarreau}px,transparent ${m.traitCarreau}px),linear-gradient(90deg,var(--quad) ${m.traitCarreau}px,transparent ${m.traitCarreau}px);background-size:${m.carreau}px ${m.carreau}px;opacity:.6}
.fond::after{content:"";position:absolute;top:0;bottom:0;left:${m.margeX}px;width:${m.margeLargeur}px;background:var(--marge);opacity:${m.margeOpacite}}
.ecran{position:absolute;inset:0 0 76px 0;overflow-y:auto;padding:16px ${m.retraitDroit}px 24px ${m.retraitContenu}px}
.colonne{max-width:${j.largeurContenuMax}px;margin:0 auto}
.entete{display:flex;align-items:center;gap:8px;margin:8px 0 4px}h1{font-size:30px;font-weight:700;letter-spacing:-.02em;margin:0}
.retour{font-size:30px;border:none;background:none;color:var(--encre);cursor:pointer;min-width:${j.zoneAppuiMin}px;min-height:${j.zoneAppuiMin}px;margin-left:-12px}
.sous-titre{margin-bottom:12px}
.section{font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;margin:20px 0 8px;display:inline-block;border-bottom:2.5px solid var(--marge);padding-bottom:2px}
.carte{background:var(--blanc);border:1px solid var(--quad);border-radius:${j.rayons.carte}px;box-shadow:0 2px 0 rgba(31,58,147,.06);padding:14px;margin:10px 0}
.carte.bandeau{border:1.5px solid var(--marge)}
.l-titre{font-weight:600;font-size:16px}.l-titre.gros{font-size:22px;font-weight:700;letter-spacing:-.01em}.l-sous{color:var(--texte2);font-size:14px}
.aide{color:var(--texte2);font-size:14px}.note{font-size:12.5px;color:var(--texte2);font-style:italic;border-left:3px solid var(--quad);padding-left:8px}
.ligne,.rang,.contact{display:flex;justify-content:space-between;align-items:center;min-height:${j.zoneAppuiMin}px;padding:8px 0;border-bottom:1px solid var(--quad);cursor:pointer;gap:8px}
.ligne:last-child,.rang:last-child,.contact:last-child{border-bottom:none}.chev{color:var(--texte2);font-size:20px}
.btn-p,.btn-s,.btn-mini,.btn-appel{font:inherit;border-radius:${j.rayons.bouton}px;cursor:pointer;min-height:${j.zoneAppuiMin}px}
.btn-p{display:block;width:100%;height:54px;background:var(--encre);color:#fff;border:none;font-weight:600;font-size:17px;margin:12px 0}
.btn-p.fond-marge{background:var(--marge)}
.btn-s{display:block;width:100%;background:#fff;border:1.5px solid var(--quad);color:var(--texte2);font-weight:600;font-size:15px;padding:10px;margin:8px 0}
.btn-s.danger{color:var(--marge)}
.btn-mini{background:#fff;border:1.5px solid var(--quad);color:var(--encre);font-weight:600;padding:0 12px}
.btn-appel{background:var(--encre);color:#fff;border:none;font-weight:600;padding:0 14px}
.duo{display:flex;gap:10px}.duo .tiers{flex:1}.duo .deuxtiers{flex:2}.duo button{margin:12px 0 0}
.badge{background:var(--encre);color:#fff;border-radius:10px;padding:3px 10px;font-size:13px;font-weight:600}
.lien{color:var(--encre);font-weight:600;text-decoration:underline;cursor:pointer}.rouge{color:var(--marge);font-weight:600}.gris{color:var(--texte2);font-weight:600}
.recherche{background:#fff;border:1.5px solid var(--quad);border-radius:${j.rayons.champ}px;padding:12px;color:var(--texte2);cursor:pointer;margin:8px 0;min-height:${j.zoneAppuiMin}px}
label{display:block;font-size:14px;color:var(--texte2);margin:12px 0 4px}.facultatif{font-style:italic}
.champ{display:block;width:100%;background:#fff;border:1.5px solid var(--quad);border-radius:${j.rayons.champ}px;padding:11px 12px;font:inherit;font-size:16px;min-height:${j.zoneAppuiMin}px;margin:6px 0}
.champ.vide{color:var(--texte2)}.champ.actif{border-color:var(--encre)}.champ.multi{min-height:70px;color:var(--texte2)}.champ.mini{width:auto;display:inline-block;margin:0 6px}
.deux{display:flex;gap:10px}.deux>div{flex:1}
.jours{display:flex;gap:6px}.jour{flex:1;text-align:center;border:1.5px solid var(--quad);border-radius:10px;padding:10px 0;background:#fff;font-weight:600}.jour.on{background:var(--encre);color:#fff;border-color:var(--encre)}
.etape{display:flex;gap:12px;align-items:center;padding:10px 0}.etape.faite .l-titre{color:var(--texte2)}.num,.coche{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;border:2px solid var(--quad)}.coche{background:#2e7d4f;border-color:#2e7d4f;color:#fff}
.filtres{display:flex;gap:8px;margin:8px 0}.filtre{border:1.5px solid var(--quad);border-radius:20px;padding:6px 12px;background:#fff;font-size:14px}.filtre.on{border-color:var(--encre);color:var(--encre);font-weight:600}
.pastille{min-width:84px;text-align:center;border-radius:${j.rayons.pastille}px;padding:8px 10px;font-weight:600;font-size:14px;white-space:nowrap}
${Object.entries(st).map(([k, v]) => `.s-${k}{background:${v.fond};color:${v.texte};${v.bordure ? `border:1.5px solid ${v.bordure};` : ''}}`).join('')}
.case{width:30px;height:30px;border-radius:8px;border:2px solid var(--quad);display:flex;align-items:center;justify-content:center;font-weight:700}.case.on{background:var(--encre);border-color:var(--encre);color:#fff}.barre{display:flex;height:12px;border-radius:4px;overflow:hidden;margin:6px 0 12px}.barre i{display:block;height:100%}
.taux{font-size:18px;color:var(--encre)}.chiffre{font-size:26px;color:var(--encre)}.legende{display:flex;gap:12px;font-size:13px;color:var(--texte2);flex-wrap:wrap}
.sg{cursor:pointer}.cases{display:flex;flex-wrap:wrap;gap:4px;margin:6px 0}.cas{width:22px;height:22px;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:12px}.cas.vide{background:var(--quad)}
.frise{display:flex;gap:8px;overflow-x:auto;padding:6px 0}.pastel{flex:none;width:92px;background:#fff;border:1px solid var(--quad);border-radius:12px;padding:8px;font-size:12px;cursor:pointer}.pastel .etat{font-weight:600;margin-top:4px}
.f-manquant{border:1.5px solid var(--marge)}.f-manquant .etat{color:var(--marge)}.f-fait .etat{color:var(--encre)}.f-maintenant{border:2px solid var(--encre)}.f-maintenant .etat{color:var(--encre)}.f-preparee .etat,.f-avenir .etat,.f-annulee .etat{color:var(--texte2)}
.podium{display:flex;align-items:flex-end;gap:6px;text-align:center;font-size:13px}.marche{flex:1;background:var(--quad);border-radius:8px 8px 0 0;padding:6px 2px}.marche .mono{font-size:20px;color:var(--encre)}.m1{height:120px}.m2{height:96px}.m3{height:80px}
.interrupteur{width:50px;height:30px;border-radius:15px;background:var(--quad);position:relative;flex:none}.interrupteur.on{background:var(--encre)}.interrupteur.on::after{content:"";position:absolute;right:3px;top:3px;width:24px;height:24px;border-radius:50%;background:#fff}
.verrou{background:#1b2233;margin:-16px -20px 0 -44px;padding:60px 20px;min-height:500px}.verrou .heure{color:#fff;font-size:56px;text-align:center;margin-bottom:24px}
.exemple{font-size:11px;border-collapse:collapse;width:100%;margin:8px 0}.exemple th,.exemple td{border:1px solid var(--quad);padding:3px}
.bascule{display:flex;border:1.5px solid var(--quad);border-radius:12px;overflow:hidden;margin:8px 0}.bascule span{flex:1;text-align:center;padding:10px;background:#fff}.bascule .on{background:var(--encre);color:#fff;font-weight:600}
.feuille{border:1px solid var(--quad);padding:12px;aspect-ratio:1/1.41;max-height:240px}.btn-s.choix{color:var(--texte);text-align:left}
.carre{display:inline-block;width:10px;height:10px;margin-right:5px;border-radius:2px}
.compteur{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:14px}
.brouillon{font-size:13px;color:var(--texte2);margin:4px 0 8px}
.nom{font-size:18px;font-weight:600}
.onglets{position:absolute;left:0;right:0;bottom:0;height:76px;background:#fff;border-top:1px solid var(--quad);display:flex;justify-content:space-around;align-items:center}
.onglet{font-size:12px;font-weight:600;color:var(--texte2);text-align:center;cursor:pointer;min-width:${j.zoneAppuiMin}px;padding-top:6px}.onglet.on{color:var(--encre)}.onglet .i{font-size:20px;display:block}
.onglet.central .rond{width:58px;height:58px;border-radius:50%;background:var(--encre);color:#fff;display:flex;align-items:center;justify-content:center;font-size:26px;margin:-28px auto 2px;box-shadow:0 6px 14px rgba(31,58,147,.35)}
.toast{position:absolute;left:50%;bottom:96px;transform:translateX(-50%);background:var(--texte);color:#fff;padding:10px 16px;border-radius:12px;font-size:14px;display:none}
aside.relecture{width:300px;flex:none;position:sticky;top:24px;font-size:14px}
aside.relecture h2{font-size:15px;margin:0}aside.relecture .ex{color:#555;font-size:13px;margin:4px 0 10px}
aside.relecture label{color:#333}aside.relecture textarea{width:100%;height:120px;font:inherit;padding:8px;border-radius:8px;border:1px solid #bbb}
.verdicts button{font:inherit;padding:6px 10px;border-radius:8px;border:1px solid #bbb;background:#fff;cursor:pointer;margin:0 4px 6px 0}.verdicts button.on{background:var(--encre);color:#fff;border-color:var(--encre)}
</style></head><body>
<nav class="menu"><h2>Ki&La — maquettes</h2><div id="menu"></div>
<div class="boutons"><button id="bascule">Voir en tablette</button><button id="exporter">Exporter les notes (JSON)</button><button id="copier">Copier les notes</button></div>
<p style="font-size:12px;color:#555">Données fictives. Polices IBM Plex si installées, sinon police du système. Notes gardées dans ce navigateur.</p></nav>
<div class="appareil" id="appareil"><div class="fond"></div>
${ecrans.map((e) => `<section class="ecran" id="e-${e.id}" hidden><div class="colonne">${e.corps}</div></section>`).join('\n')}
<div class="onglets" id="onglets">
<div class="onglet" data-tab="accueil" data-go="accueil"><span class="i">⌂</span>Accueil</div>
<div class="onglet" data-tab="stats" data-go="stats"><span class="i">▥</span>Stats</div>
<div class="onglet central" data-tab="appel" data-go="appel"><div class="rond">✓</div>Nouvel appel</div>
<div class="onglet" data-tab="historique" data-go="historique"><span class="i">☰</span>Historique</div>
<div class="onglet" data-tab="parametres" data-go="parametres"><span class="i">⚙</span>Paramètres</div>
</div><div class="toast" id="toast"></div></div>
<aside class="relecture"><h2 id="r-titre"></h2><div class="ex" id="r-ex"></div>
<div class="verdicts" id="verdicts"><button data-v="ok">✓ Validé</button><button data-v="revoir">À revoir</button><button data-v="refuse">Refusé</button></div>
<label for="r-com">Commentaire</label><textarea id="r-com" placeholder="Ce qui ne va pas, ce qui manque…"></textarea></aside>
<script>
const MODIFIES=${JSON.stringify(MODIFIES)};
const ECRANS=${ecransJson}, MEMBRES=${membresJson}, ST=${statutsJson};
const ONGLET=${JSON.stringify(Object.fromEntries(ecrans.map((e) => [e.id, e.onglet])))};
const CLE='kila-maquettes-notes-v1';
const notes=JSON.parse(localStorage.getItem(CLE)||'{}');
const sauver=()=>localStorage.setItem(CLE,JSON.stringify(notes));
let courant='accueil';
function menu(){document.getElementById('menu').innerHTML=[1,2].map(l=>'<div class="lot">Lot '+l+'</div>'+ECRANS.filter(e=>e.lot===l).map(e=>{const v=(notes[e.id]||{}).verdict;return '<a data-go="'+e.id+'" class="'+(e.id===courant?'on':'')+'">'+e.titre+(MODIFIES.includes(e.id)?' <i>(modifié lot 2)</i>':'')+'<span class="v">'+(v==='ok'?'✓':v==='revoir'?'!':v==='refuse'?'✕':'')+'</span></a>'}).join('')).join('')}
function aller(id){if(!document.getElementById('e-'+id))return;courant=id;document.querySelectorAll('.ecran').forEach(s=>s.hidden=s.id!=='e-'+id);
document.querySelectorAll('.onglet').forEach(o=>o.classList.toggle('on',o.dataset.tab===ONGLET[id]));document.getElementById('onglets').style.display=ONGLET[id]?'flex':'none';
const e=ECRANS.find(x=>x.id===id);document.getElementById('r-titre').textContent=e.titre;document.getElementById('r-ex').textContent='Couvre : '+e.exigences+' · lot '+e.lot;
const n=notes[id]||{};document.getElementById('r-com').value=n.commentaire||'';document.querySelectorAll('#verdicts button').forEach(b=>b.classList.toggle('on',b.dataset.v===n.verdict));
if(id==='appel')demarrerAppel();menu();location.hash=id}
document.addEventListener('click',ev=>{const t=ev.target.closest('[data-go]');if(t){ev.preventDefault();aller(t.dataset.go)}});
document.querySelectorAll('#verdicts button').forEach(b=>b.onclick=()=>{notes[courant]={...(notes[courant]||{}),verdict:b.dataset.v};sauver();aller(courant)});
document.getElementById('r-com').oninput=ev=>{notes[courant]={...(notes[courant]||{}),commentaire:ev.target.value};sauver()};
const exportNotes=()=>JSON.stringify({date:new Date().toISOString().slice(0,10),lot:1,notes:ECRANS.map(e=>({ecran:e.id,titre:e.titre,...(notes[e.id]||{})})).filter(n=>n.verdict||n.commentaire)},null,2);
document.getElementById('exporter').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([exportNotes()],{type:'application/json'}));a.download='notes-maquettes.json';a.click()};
document.getElementById('copier').onclick=()=>navigator.clipboard.writeText(exportNotes()).then(()=>toast('Notes copiées'));
document.getElementById('bascule').onclick=ev=>{const a=document.getElementById('appareil');a.classList.toggle('tablette');ev.target.textContent=a.classList.contains('tablette')?'Voir en téléphone':'Voir en tablette'};
function toast(t){const e=document.getElementById('toast');e.textContent=t;e.style.display='block';setTimeout(()=>e.style.display='none',1800)}
// Appel interactif : Présent → Absent → Retard → Excusé → Présent (EX-10)
const CYCLE=['present','absent','late','excused'],ICO={present:'✓',absent:'✕',late:'◷',excused:'≈'};
let statuts,debut,minuteur;
function demarrerAppel(){statuts=MEMBRES.map(()=> 'present');debut=null;clearInterval(minuteur);document.getElementById('chrono').textContent='Chrono : démarre au premier appui';document.getElementById('filtre').value='';rendreAppel()}
function rendreAppel(){const f=document.getElementById('filtre').value.toLowerCase();
document.getElementById('liste-appel').innerHTML='<div class="carte">'+MEMBRES.map((p,i)=>(p.prenom+' '+p.nom).toLowerCase().includes(f)?'<div class="rang" data-i="'+i+'"><span class="nom">'+p.prenom+' '+p.nom+'</span><span class="pastille s-'+statuts[i]+'">'+ICO[statuts[i]]+' '+ST[statuts[i]].libelle+'</span></div>':'').join('')+'</div>';
const n=k=>statuts.filter(s=>s===k).length;
document.getElementById('compteur').innerHTML=CYCLE.map(k=>'<span><i class="carre s-'+k+'"></i>'+n(k)+' '+ST[k].libelle.toLowerCase()+(n(k)>1&&k!=='late'?'s':'')+'</span>').join('')}
document.getElementById('liste-appel').addEventListener('click',ev=>{const r=ev.target.closest('.rang');if(!r)return;
if(!debut){debut=Date.now();minuteur=setInterval(()=>document.getElementById('chrono').textContent='Chrono : '+((Date.now()-debut)/1000).toFixed(1).replace('.',',')+' s',100)}
const i=+r.dataset.i;statuts[i]=CYCLE[(CYCLE.indexOf(statuts[i])+1)%4];rendreAppel()});
document.getElementById('filtre').oninput=rendreAppel;
document.getElementById('enregistrer').onclick=()=>{clearInterval(minuteur);const s=debut?((Date.now()-debut)/1000).toFixed(1).replace('.',','):'0';toast('Appel enregistré · '+s+' s');setTimeout(()=>aller('historique'),1200)};
aller(location.hash.slice(1)||'accueil');
</script></body></html>`;

mkdirSync(new URL('design/maquettes/', racine), { recursive: true });
writeFileSync(new URL('design/maquettes/index.html', racine), html);
console.log(`design/maquettes/index.html : ${ecrans.length} écrans (${ecrans.filter((e) => e.lot === 1).length} au lot 1).`);
