import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRoute, etapeDeMission, couleurDominante, modeleRoute } from './route.mjs';

const FEUILLE = [
  '# Feuille de route',
  'Texte libre ignoré',
  '',
  '## 1. Socle',
  '- [x] 1.1 Installer',
  '- [ ] 1.2 Configurer',
  '',
  '## 2. Authentification',
  '  - [X] 2.1 Créer les comptes',
  '- [ ] 2.2 Jeton',
  '- [ ] 2 pas une sous-étape',
  '- [ ] 2.3 Session',
].join('\n');

test('parseRoute lit chapitres et sous-étapes', () => {
  const r = parseRoute(FEUILLE);
  assert.deepEqual(r, [
    { id: '1', titre: 'Socle', sous: [
      { id: '1.1', titre: 'Installer', fait: true },
      { id: '1.2', titre: 'Configurer', fait: false },
    ] },
    { id: '2', titre: 'Authentification', sous: [
      { id: '2.1', titre: 'Créer les comptes', fait: true },
      { id: '2.2', titre: 'Jeton', fait: false },
      { id: '2.3', titre: 'Session', fait: false },
    ] },
  ]);
});

test('parseRoute accepte x minuscule et X majuscule comme coché', () => {
  const r = parseRoute('## 1. A\n- [x] 1.1 a\n- [X] 1.2 b\n- [ ] 1.3 c');
  assert.deepEqual(r[0].sous.map((s) => s.fait), [true, true, false]);
});

test('parseRoute ignore une sous-étape avant tout chapitre', () => {
  const r = parseRoute('- [x] 1.1 orpheline\n## 1. A\n- [ ] 1.2 ok');
  assert.equal(r.length, 1);
  assert.deepEqual(r[0].sous.map((s) => s.id), ['1.2']);
});

test('parseRoute ignore toute autre ligne', () => {
  const r = parseRoute('## 1. A\nune phrase\n### 1.5 sous-titre\n- [ ] sans id\n- 1.4 pas de case\n- [ ] 1.1 vraie');
  assert.deepEqual(r[0].sous.map((s) => s.id), ['1.1']);
});

test('parseRoute gère les fins de ligne \\r\\n', () => {
  const r = parseRoute('## 3. Titre\r\n- [x] 3.1 Étape\r\n- [ ] 3.2 Autre\r\n');
  assert.equal(r[0].titre, 'Titre');
  assert.deepEqual(r[0].sous, [
    { id: '3.1', titre: 'Étape', fait: true },
    { id: '3.2', titre: 'Autre', fait: false },
  ]);
});

test('parseRoute renvoie [] pour un texte non chaîne', () => {
  assert.deepEqual(parseRoute(undefined), []);
  assert.deepEqual(parseRoute(42), []);
  assert.deepEqual(parseRoute(null), []);
});

test('etapeDeMission extrait un id de sous-étape', () => {
  assert.equal(etapeDeMission('[2.3] Coder x'), '2.3');
});

test('etapeDeMission extrait un id de chapitre', () => {
  assert.equal(etapeDeMission('[2] Revoir le chapitre'), '2');
});

test('etapeDeMission accepte des espaces en tête', () => {
  assert.equal(etapeDeMission(' [1.4]x'), '1.4');
});

test('etapeDeMission renvoie null sans id entre crochets', () => {
  assert.equal(etapeDeMission('Coder x'), null);
});

test('etapeDeMission renvoie null pour un non chaîne', () => {
  assert.equal(etapeDeMission(undefined), null);
  assert.equal(etapeDeMission(3), null);
});

test('couleurDominante vide donne null', () => {
  assert.equal(couleurDominante([]), null);
});

test('couleurDominante : code l emporte sur tout', () => {
  assert.equal(couleurDominante(['test', 'code']), 'code');
  assert.equal(couleurDominante(['echec', 'code', 'test']), 'code');
});

test('couleurDominante : sans code, echec l emporte sur test', () => {
  assert.equal(couleurDominante(['test', 'echec']), 'echec');
});

test('couleurDominante : seul test donne test', () => {
  assert.equal(couleurDominante(['test']), 'test');
});

test('couleurDominante : tous identiques donne cette couleur', () => {
  assert.equal(couleurDominante(['echec', 'echec']), 'echec');
  assert.equal(couleurDominante(['test', 'test']), 'test');
  assert.equal(couleurDominante(['code', 'code']), 'code');
});

function chap(route, id) {
  return route.chapitres.find((c) => c.id === id);
}
function sous(route, id) {
  for (const c of route.chapitres) {
    const s = c.sous.find((x) => x.id === id);
    if (s) return s;
  }
  return undefined;
}

const ROUTE = parseRoute(FEUILLE);

test('modeleRoute ignore les actifs dont le type contient lecteur', () => {
  const m = modeleRoute(ROUTE, [{ type: 'lecteur-doc', mission: '[2.2] x', phase: 'code' }]);
  assert.equal(sous(m, '2.2').phase, null);
  assert.equal(chap(m, '2').phase, null);
});

test('modeleRoute ignore les actifs sans id d étape', () => {
  const m = modeleRoute(ROUTE, [{ type: 'dev', mission: 'Coder x', phase: 'code' }]);
  assert.equal(sous(m, '2.2').phase, null);
  assert.equal(chap(m, '2').phase, null);
});

test('modeleRoute colore une sous-étape par son actif', () => {
  const m = modeleRoute(ROUTE, [{ type: 'dev', mission: '[2.2] x', phase: 'test' }]);
  assert.equal(sous(m, '2.2').phase, 'test');
  assert.equal(sous(m, '2.1').phase, null);
});

test('modeleRoute colore un chapitre directement par un actif sur son id', () => {
  const m = modeleRoute(ROUTE, [{ type: 'dev', mission: '[2] Revoir', phase: 'echec' }]);
  assert.equal(chap(m, '2').phase, 'echec');
  assert.equal(sous(m, '2.2').phase, null);
});

test('modeleRoute : une étape cochée en cours s affiche non faite', () => {
  const m = modeleRoute(ROUTE, [{ type: 'dev', mission: '[2.1] x', phase: 'code' }]);
  assert.equal(sous(m, '2.1').fait, false);
  assert.equal(sous(m, '2.1').phase, 'code');
});

test('modeleRoute : une étape cochée sans agent reste faite', () => {
  const m = modeleRoute(ROUTE, []);
  assert.equal(sous(m, '2.1').fait, true);
  assert.equal(sous(m, '1.1').fait, true);
});

test('modeleRoute : phase du chapitre = dominante de ses sous-étapes en cours', () => {
  const m = modeleRoute(ROUTE, [
    { type: 'dev', mission: '[2.2] x', phase: 'test' },
    { type: 'dev', mission: '[2.3] y', phase: 'echec' },
  ]);
  assert.equal(chap(m, '2').phase, 'echec');
});

test('modeleRoute : code prime dans la phase du chapitre', () => {
  const m = modeleRoute(ROUTE, [
    { type: 'dev', mission: '[2.2] x', phase: 'echec' },
    { type: 'dev', mission: '[2.3] y', phase: 'code' },
  ]);
  assert.equal(chap(m, '2').phase, 'code');
});

test('modeleRoute : actif posé sur le chapitre compte dans sa phase', () => {
  const m = modeleRoute(ROUTE, [
    { type: 'dev', mission: '[2.2] x', phase: 'test' },
    { type: 'dev', mission: '[2] y', phase: 'code' },
  ]);
  assert.equal(chap(m, '2').phase, 'code');
});

test('modeleRoute : chapitre fait seulement si tout est fait et sans phase', () => {
  const r = parseRoute('## 4. Tout\n- [x] 4.1 a\n- [x] 4.2 b');
  const fait = modeleRoute(r, []);
  assert.equal(chap(fait, '4').fait, true);
  assert.equal(chap(fait, '4').nbFait, 2);
  assert.equal(chap(fait, '4').nb, 2);

  const enCours = modeleRoute(r, [{ type: 'dev', mission: '[4.1] x', phase: 'test' }]);
  assert.equal(chap(enCours, '4').fait, false);
  assert.equal(chap(enCours, '4').nbFait, 1);
});

test('modeleRoute : chapitre avec actif propre n est pas fait même si tout coché', () => {
  const r = parseRoute('## 4. Tout\n- [x] 4.1 a');
  const m = modeleRoute(r, [{ type: 'dev', mission: '[4] revue', phase: 'code' }]);
  assert.equal(chap(m, '4').fait, false);
  assert.equal(chap(m, '4').phase, 'code');
});

test('modeleRoute : chapitre sans sous-étape n est jamais fait', () => {
  const r = parseRoute('## 5. Vide');
  const m = modeleRoute(r, []);
  assert.equal(chap(m, '5').nb, 0);
  assert.equal(chap(m, '5').fait, false);
});

test('modeleRoute : global compte les faites, pourcent et segments', () => {
  const m = modeleRoute(ROUTE, [{ type: 'dev', mission: '[2.2] x', phase: 'test' }]);
  // 1.1 fait, 1.2 non, 2.1 fait, 2.2 en cours (test), 2.3 à faire
  assert.deepEqual(m.global, {
    nbFait: 2,
    nb: 5,
    pourcent: 40,
    segments: ['fait', 'afaire', 'fait', 'test', 'afaire'],
  });
});

test('modeleRoute : pourcent arrondi', () => {
  const r = parseRoute('## 1. A\n- [x] 1.1 a\n- [ ] 1.2 b\n- [ ] 1.3 c');
  assert.equal(modeleRoute(r, []).global.pourcent, 33);
});

test('modeleRoute : pourcent vaut 0 sans sous-étape', () => {
  const m = modeleRoute(parseRoute('## 1. A'), []);
  assert.deepEqual(m.global, { nbFait: 0, nb: 0, pourcent: 0, segments: [] });
});

test('modeleRoute : chapitres gardent id, titre et sous-étapes au format attendu', () => {
  const m = modeleRoute(ROUTE, []);
  assert.equal(m.chapitres[1].titre, 'Authentification');
  assert.deepEqual(Object.keys(m.chapitres[1]).sort(), ['fait', 'id', 'nb', 'nbFait', 'phase', 'sous', 'titre']);
  assert.deepEqual(Object.keys(m.chapitres[1].sous[0]).sort(), ['fait', 'id', 'phase', 'titre']);
});
