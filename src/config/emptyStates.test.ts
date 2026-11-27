// P1, NF-06 (ticket 012c) : les textes et boutons des états vides sont ceux de la maquette
// « États vides » (scripts/maquettes.mjs), apostrophe typographique comprise (CONV-03).
import { labels } from '@/config/libelles';

describe('P1 NF-06 états vides : textes de la maquette', () => {
  it.each([
    [
      'Saisons',
      labels.seasons.empty,
      'Aucune saison. Créez-en une pour y ranger vos groupes et vos appels.',
    ],
    ['Saisons, bouton', labels.seasons.create, 'Nouvelle saison'],
    ['Groupes', labels.groups.empty, 'Aucun groupe dans cette saison.'],
    ['Groupes, bouton', labels.groups.createFirst, 'Créer un groupe'],
    ['Groupe sans membre', labels.group.noMember, 'Personne n’est encore inscrit à ce groupe.'],
    ['Groupe sans membre, bouton', labels.group.addMembers, 'Ajouter des membres'],
    ['Membres', labels.members.empty, 'Aucun membre pour l’instant.'],
    ['Membres, bouton', labels.members.create, 'Nouveau membre'],
    [
      'Créneaux',
      labels.slots.empty,
      'Aucun créneau. Déclarez quand vos groupes se réunissent pour que l’appli propose l’appel au bon moment.',
    ],
    ['Créneaux, bouton', labels.slots.create, 'Nouveau créneau'],
    [
      'Recherche sans résultat',
      labels.members.noMatch('xyz'),
      'Aucun membre ne correspond à « xyz ».',
    ],
    [
      'Recherche, conseil',
      labels.members.noMatchHint,
      'Vérifiez l’orthographe, ou cherchez par le prénom.',
    ],
    ['Appel d’un groupe vide', labels.rollCall.noMember, 'Ce groupe n’a aucun membre à appeler.'],
    ['Appel d’un groupe vide, bouton', labels.group.addMembers, 'Ajouter des membres'],
    // Le « + » de la maquette est l'icône du bouton, pas du texte (décision du 2026-11-27).
    ['Membre sans contact, bouton', labels.contacts.add, 'Ajouter un contact'],
    [
      'Membre sans contact',
      labels.contacts.none('Léo Garcia'),
      'Aucun contact d’urgence pour Léo Garcia.',
    ],
  ])('%s', (_case, label, maquette) => {
    expect(label).toBe(maquette);
  });
});
