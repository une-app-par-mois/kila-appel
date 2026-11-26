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
<p class="note">Un seul bouton à l'écran, sur la première étape qui reste.</p>`);

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
<p class="note">Lot 2 : la frise des séances (F-12) et les alertes d'assiduité (F-04) prendront place ici.</p>`);

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
<button class="btn-p" id="enregistrer">Enregistrer l'appel</button>`);

// 05 — Appel sans créneau (EX-39)
ecran('appel-libre', 1, 'Appel sans créneau', 'EX-39', 'appel', `
${titre('Nouvel appel')}
<p class="aide">Aucun créneau en cours. Choisissez le groupe et la date.</p>
${section('Groupe')}
${carte(`${ligne('Poussins mercredi', '22 membres', 'data-go="appel"')}${ligne('Benjamins lundi', '18 membres', 'data-go="appel"')}${ligne('Adultes jeudi', '25 membres', 'data-go="appel"')}`)}
${section('Date')}
<div class="champ mono">26/11/2026</div>
<p class="note">S'affiche quand on touche « Nouvel appel » hors de tout créneau proche.</p>`);

// 06 — Ajout d'un membre pendant l'appel (EX-12)
ecran('ajout', 1, "Ajout d'un membre pendant l'appel", 'EX-12, EX-03', 'appel', `
${titre('Nouveau membre', 'appel')}
<label>Prénom</label><div class="champ">Yanis</div>
<label>Nom</label><div class="champ">Colin</div>
<label>Date de naissance <span class="facultatif">facultative</span></label><div class="champ vide">JJ/MM/AAAA</div>
<p class="aide">Il sera inscrit à « Poussins mercredi » à partir d'aujourd'hui.</p>
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
<p class="note">Annulée et Non planifiée viennent du lot 2 (F-13) : montrées ici pour le rendu.</p>`);

// 08 — Détail et correction d'une séance (EX-18)
ecran('seance', 1, "Détail d'une séance", 'EX-18, EX-13', 'historique', `
${titre('Poussins mercredi', 'historique')}
<div class="l-sous sous-titre">Mer. 19/11/2026 · 14:00 · enregistrée</div>
<div class="carte compteur mono"><span><i class="carre s-present"></i>19 présents</span><span><i class="carre s-absent"></i>2 absents</span><span><i class="carre s-excused"></i>1 excusé</span></div>
${carte(membres.slice(0, 5).map((p, i) => `<div class="rang"><span class="nom">${p.prenom} ${p.nom}</span>${pastille(['present', 'absent', 'present', 'excused', 'present'][i])}</div>`).join(''))}
<p class="aide">Touchez un statut pour le corriger.</p>
<div class="duo">${go('historique', 'Supprimer la séance', 'btn-s tiers danger')}${go('historique', 'Enregistrer les corrections', 'btn-p deuxtiers')}</div>`);

// 09 — Paramètres
ecran('parametres', 1, 'Paramètres', 'EX-01 à EX-07, EX-19 à EX-24', 'parametres', `
${titre('Paramètres')}
${section('Organisation')}
${carte(`${ligne('Saisons', 'Active : 2026-2027', 'data-go="saisons"')}${ligne('Groupes', '3 groupes', 'data-go="groupes"')}${ligne('Membres', '65 membres', 'data-go="membres"')}${ligne('Créneaux', '3 créneaux', 'data-go="creneaux"')}`)}
${section('Données')}
${carte(`${ligne('Sauvegarde et restauration', 'Dernière : il y a 34 jours', 'data-go="donnees"')}${ligne('Conservation', '3 saisons', 'data-go="donnees"')}${ligne('Tout effacer', '', 'data-go="donnees"')}`)}
${section('À propos')}
${carte(`${ligne('Confidentialité', '')}${ligne("Conditions d'utilisation", '')}${ligne('Licences', '')}`)}`);

// 10 — Saisons (EX-01)
ecran('saisons', 1, 'Saisons', 'EX-01', 'parametres', `
${titre('Saisons', 'parametres')}
${carte(`
<div class="rang"><div><div class="l-titre">2026-2027</div><div class="l-sous mono">01/09/2026 – 31/07/2027</div></div><span class="badge">Active</span></div>
<div class="rang"><div><div class="l-titre">2025-2026</div><div class="l-sous mono">01/09/2025 – 31/07/2026</div></div><button class="btn-mini">Activer</button></div>
`)}
${go('saisons', 'Nouvelle saison', 'btn-s')}
<p class="note">Supprimer une saison : confirmation qui liste ce qui sera effacé (groupes, créneaux, séances, présences ; pas les membres).</p>`);

// 11 — Groupe (EX-02, EX-04)
ecran('groupe', 1, "Groupe et ses membres", 'EX-02, EX-04', 'parametres', `
${titre('Poussins mercredi', 'groupes')}
<div class="l-sous sous-titre">Saison 2026-2027 · 22 membres inscrits</div>
${carte(membres.slice(0, 6).map((p) => ligne(`${p.prenom} ${p.nom}`, 'Inscrit depuis le 03/09/2026', 'data-go="membre"')).join(''))}
<div class="duo">${go('groupe', 'Archiver', 'btn-s tiers')}${go('ajout', 'Ajouter un membre', 'btn-p deuxtiers')}</div>`);

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
<div class="duo">${go('membres', 'Importer (CSV)', 'btn-s tiers')}${go('ajout', 'Nouveau membre', 'btn-p deuxtiers')}</div>
<p class="note">« Importer (CSV) » : lot 2 (F-07).</p>`);

// 14a — Liste des créneaux (EX-07)
ecran('creneaux', 1, 'Créneaux', 'EX-07', 'parametres', `
${titre('Créneaux', 'parametres')}
${carte(`${ligne('Mercredi 14:00 – 15:30', 'Poussins mercredi · Gymnase Jean-Moulin', 'data-go="creneau"')}${ligne('Lundi 18:00 – 19:30', 'Benjamins lundi · Dojo municipal', 'data-go="creneau"')}${ligne('Jeudi 20:00 – 21:30', 'Adultes jeudi · Dojo municipal', 'data-go="creneau"')}`)}
${go('creneau', 'Nouveau créneau')}`);

// 12 — Fiche membre (EX-03, EX-04, EX-05)
ecran('membre', 1, 'Fiche membre', 'EX-03, EX-04, EX-05', 'parametres', `
${titre('Léo Garcia', 'membres')}
<label>Prénom</label><div class="champ">Léo</div>
<label>Nom</label><div class="champ">Garcia</div>
<label>Date de naissance <span class="facultatif">facultative</span></label><div class="champ mono">14/03/2017</div>
${section("Contacts d'urgence")}
${carte(`<div class="contact"><div><div class="l-titre">Sa mère</div><div class="l-sous mono">06 00 00 00 01</div></div><span class="chev">≡</span></div><div class="contact"><div><div class="l-titre">Son père</div><div class="l-sous mono">06 00 00 00 02</div></div><span class="chev">≡</span></div>`)}
<button class="btn-s">+ Ajouter un contact</button>
${section('Groupes')}
${carte(ligne('Poussins mercredi', 'Depuis le 03/09/2026'))}
<div class="duo">${go('membre', 'Archiver', 'btn-s tiers')}${go('suppression', 'Supprimer', 'btn-s tiers danger')}</div>`);

// 13 — Confirmation de suppression (ABS-05)
ecran('suppression', 1, "Suppression d'un membre", 'EX-03, ABS-05', 'parametres', `
${titre('Supprimer Léo Garcia ?', 'membre')}
${carte(`<p>Seront effacés <b>définitivement</b> :</p><ul><li>sa fiche et sa date de naissance ;</li><li>ses 2 contacts d'urgence ;</li><li>ses <span class="mono">41</span> présences.</li></ul><p class="l-sous">Pour le retirer des listes sans rien effacer, utilisez plutôt « Archiver ».</p>`, 'bandeau')}
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
${carte(`<p>Remplace <b>toutes</b> les données de l'appareil par celles du fichier. Le fichier est vérifié avant tout changement.</p>${go('donnees', 'Choisir un fichier…', 'btn-s')}`)}
${section('Conservation')}
${carte(`<div class="rang"><span>Garder les</span><span class="champ mini mono">3 ▾</span><span>dernières saisons</span></div><p class="l-sous">1 saison dépasse cette durée : 2023-2024.</p><button class="btn-s">Purger 2023-2024…</button>`)}
${section('Tout effacer')}
${carte(`<p class="l-sous">Efface toutes les données de cet appareil. Double confirmation.</p><button class="btn-s danger">Tout effacer…</button>`)}`);

// 16 — Base illisible (EX-22)
ecran('illisible', 1, 'Base illisible au démarrage', 'EX-22', null, `
${titre('Vos données ne peuvent pas être ouvertes')}
${carte(`<p>Le fichier de données de l'appli est abîmé. Rien n'a été effacé pour l'instant.</p><p>Vous pouvez restaurer votre dernière sauvegarde, ou repartir de zéro.</p>`)}
${go('accueil', 'Restaurer une sauvegarde')}
${go('bienvenue', 'Repartir de zéro', 'btn-s')}
<p class="note">Jamais de message technique ni de plantage.</p>`);

// 17 — Annuler une séance (lot 2, F-13) : laissée en lien depuis l'accueil, page d'attente
ecran('annuler', 2, 'Annuler une séance', 'EX-38 (lot 2)', 'accueil', `
${titre('Que s\'est-il passé ?', 'accueil')}
<p class="note">Lot 2 : maquette à venir (F-13).</p>`);

ecran('stats', 2, 'Statistiques', 'EX-27 (lot 2)', 'stats', `
${titre('Statistiques')}
<p class="note">Lot 2 : maquette à venir (F-05, F-09, F-14).</p>`);

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
.rouge{color:var(--marge);font-weight:600}.gris{color:var(--texte2);font-weight:600}
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
const ECRANS=${ecransJson}, MEMBRES=${membresJson}, ST=${statutsJson};
const ONGLET=${JSON.stringify(Object.fromEntries(ecrans.map((e) => [e.id, e.onglet])))};
const CLE='kila-maquettes-notes-v1';
const notes=JSON.parse(localStorage.getItem(CLE)||'{}');
const sauver=()=>localStorage.setItem(CLE,JSON.stringify(notes));
let courant='accueil';
function menu(){document.getElementById('menu').innerHTML=[1,2].map(l=>'<div class="lot">Lot '+l+'</div>'+ECRANS.filter(e=>e.lot===l).map(e=>{const v=(notes[e.id]||{}).verdict;return '<a data-go="'+e.id+'" class="'+(e.id===courant?'on':'')+'">'+e.titre+'<span class="v">'+(v==='ok'?'✓':v==='revoir'?'!':v==='refuse'?'✕':'')+'</span></a>'}).join('')).join('')}
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
