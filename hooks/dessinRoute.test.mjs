import { test } from 'node:test';
import assert from 'node:assert/strict';
import { svgGlobal, svgChapitre, svgSousEtape, COULEURS } from './dessinRoute.mjs';

function attrs(s) {
  const o = {};
  for (const m of s.matchAll(/([\w-]+)="([^"]*)"/g)) o[m[1]] = m[2];
  return o;
}

function balises(svg, tag) {
  return [...svg.matchAll(new RegExp('<' + tag + '\\b([^>]*?)\\/?>', 'g'))].map((m) => attrs(m[1]));
}

function textes(svg) {
  return [...svg.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)].map((m) => ({ ...attrs(m[1]), contenu: m[2] }));
}

function entete(svg, w, h) {
  const debut = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">';
  assert.ok(svg.startsWith(debut), 'en-tête attendu, reçu : ' + svg.slice(0, 200));
  assert.ok(svg.endsWith('</svg>'));
}

// ---------- COULEURS ----------

test('COULEURS exporte les couleurs de phase et d etat', () => {
  assert.deepEqual(COULEURS, {
    code: '#185FA5',
    test: '#3B6D11',
    echec: '#A32D2D',
    fait: '#5F5E5A',
    afaire: '#D3D1C7',
  });
});

// ---------- svgGlobal ----------

const G = { nbFait: 3, nb: 8, pourcent: 37, segments: ['fait', 'code', 'test'] };
const B = { nbFait: 2, nb: 4, pourcent: 50, segments: ['fait', 'fait', 'code', 'test'] };
const cases = (svg) => balises(svg, 'rect').filter((r) => r['clip-path'] === 'url(#barre-globale)');

test('svgGlobal : en-tête 360 x 58, fond transparent', () => {
  const svg = svgGlobal(G);
  entete(svg, 360, 58);
  assert.equal(balises(svg, 'rect').filter((r) => r.width === '360' && r.height === '58').length, 0);
});

test('svgGlobal : texte gauche « nbFait / nb livrées » en (0, 18)', () => {
  const g = textes(svgGlobal(G)).find((t) => t.x === '0' && t.y === '18');
  assert.ok(g, 'texte gauche absent');
  assert.equal(g.contenu, '3 / 8 livrées');
  assert.equal(g['font-size'], '16');
  assert.equal(g['font-weight'], '500');
  assert.equal(g.fill, '#888780');
});

test('svgGlobal : pourcentage à droite en (360, 18), ancré à la fin', () => {
  const p = textes(svgGlobal(G)).find((t) => t.x === '360' && t.y === '18');
  assert.ok(p, 'pourcentage absent');
  assert.equal(p.contenu, '37 %');
  assert.equal(p['text-anchor'], 'end');
  assert.equal(p['font-size'], '16');
  assert.equal(p['font-weight'], '500');
  assert.equal(p.fill, '#888780');
});

test('svgGlobal : clipPath « barre-globale » exact, 360 x 10 à y 28, rayon 5', () => {
  assert.ok(svgGlobal(B).includes('<clipPath id="barre-globale"><rect x="0" y="28" width="360" height="10" rx="5"/></clipPath>'));
});

test('svgGlobal : fond de barre gris clair en (0, 28, 360, 10), rogné par le clipPath', () => {
  const fond = cases(svgGlobal(B))[0];
  assert.equal(fond.x, '0');
  assert.equal(fond.y, '28');
  assert.equal(fond.width, '360');
  assert.equal(fond.height, '10');
  assert.equal(fond.fill, '#D3D1C7');
});

test('svgGlobal : une case par état présent, largeurs 180 / 90 / 90, ordre fait, code, test', () => {
  const trouvees = cases(svgGlobal(B)).slice(1);
  assert.equal(trouvees.length, 3);
  const attendu = [
    { x: '0', width: '180', fill: COULEURS.fait },
    { x: '180', width: '90', fill: COULEURS.code },
    { x: '270', width: '90', fill: COULEURS.test },
  ];
  trouvees.forEach((c, i) => {
    assert.equal(c.x, attendu[i].x);
    assert.equal(c.y, '28');
    assert.equal(c.width, attendu[i].width);
    assert.equal(c.height, '10');
    assert.equal(c.fill, attendu[i].fill);
    assert.equal(c['clip-path'], 'url(#barre-globale)');
  });
});

test('svgGlobal : état échec présent -> case rouge, états « à faire » non dessinés', () => {
  const svg = svgGlobal({ nbFait: 0, nb: 4, pourcent: 0, segments: ['echec', 'afaire', 'afaire', 'afaire'] });
  const trouvees = cases(svg).slice(1);
  assert.equal(trouvees.length, 1);
  assert.equal(trouvees[0].x, '0');
  assert.equal(trouvees[0].width, '90');
  assert.equal(trouvees[0].fill, COULEURS.echec);
});

test('svgGlobal : largeur arrondie à 0,1 (1 segment sur 7 -> 51.4)', () => {
  const svg = svgGlobal({ nbFait: 1, nb: 7, pourcent: 14, segments: ['code', 'afaire', 'afaire', 'afaire', 'afaire', 'afaire', 'afaire'] });
  const trouvees = cases(svg).slice(1);
  assert.equal(trouvees.length, 1);
  assert.equal(trouvees[0].width, '51.4');
});

test('svgGlobal : nb = 0 -> pas de barre, texte « Feuille de route vide » en (0, 38)', () => {
  const svg = svgGlobal({ nbFait: 0, nb: 0, pourcent: 0, segments: ['afaire'] });
  assert.equal(svg.includes('clipPath'), false);
  assert.equal(balises(svg, 'rect').filter((r) => r.y === '28').length, 0);
  const v = textes(svg).find((t) => t.x === '0' && t.y === '38');
  assert.ok(v, 'texte « vide » absent');
  assert.equal(v.contenu, 'Feuille de route vide');
  assert.equal(v['font-size'], '13');
  assert.equal(v.fill, '#888780');
});

test('svgGlobal : légende, carrés 8x8 en y 45, x 0,64,128,192,256, mots à x+12 en y 52', () => {
  const svg = svgGlobal(G);
  const carres = balises(svg, 'rect').filter((r) => r.width === '8' && r.height === '8');
  assert.equal(carres.length, 5);
  const xs = ['0', '64', '128', '192', '256'];
  const fills = [COULEURS.fait, COULEURS.code, COULEURS.test, COULEURS.echec, COULEURS.afaire];
  carres.forEach((c, i) => {
    assert.equal(c.x, xs[i]);
    assert.equal(c.y, '45');
    assert.equal(c.fill, fills[i]);
  });
  const mots = ['livré', 'code', 'test', 'échec', 'à faire'];
  const txt = textes(svg).filter((t) => t.y === '52');
  assert.equal(txt.length, 5);
  txt.forEach((t, i) => {
    assert.equal(t.x, String(Number(xs[i]) + 12));
    assert.equal(t.contenu, mots[i]);
    assert.equal(t['font-size'], '11');
    assert.equal(t.fill, '#888780');
  });
});

// ---------- svgChapitre ----------

const ch = (extra) => ({ id: 'C1', titre: 'Gare', phase: null, fait: false, nbFait: 2, nb: 5, ...extra });

test('svgChapitre : en-tête 318 x 40 par défaut, largeur passée honorée', () => {
  entete(svgChapitre(ch()), 318, 40);
  entete(svgChapitre(ch(), 200), 200, 40);
});

test('svgChapitre : fait -> fond gris 0,12, texte gris, rature grise 1,5', () => {
  const svg = svgChapitre(ch({ fait: true, nbFait: 5, phase: 'code' }));
  const bande = balises(svg, 'rect')[0];
  assert.equal(bande.x, '0');
  assert.equal(bande.y, '3');
  assert.equal(bande.width, '318');
  assert.equal(bande.height, '34');
  assert.equal(bande.rx, '8');
  assert.equal(bande.fill, '#888780');
  assert.equal(bande['fill-opacity'], '0.12');
  const t = textes(svg).find((x) => x.x === '12' && x.y === '25');
  assert.equal(t.contenu, 'C1. Gare');
  assert.equal(t['font-size'], '15');
  assert.equal(t.fill, '#888780');
  const r = balises(svg, 'line');
  assert.equal(r.length, 1);
  assert.equal(r[0].x1, '12');
  assert.equal(r[0].x2, '78'); // 12 + round(8 * 15 * 0.55) = 12 + 66
  assert.equal(r[0].y1, '20');
  assert.equal(r[0].y2, '20');
  assert.equal(r[0].stroke, '#888780');
  assert.equal(r[0]['stroke-width'], '1.5');
});

test('svgChapitre : en cours -> fond de la phase, texte blanc gras, pas de rature', () => {
  const svg = svgChapitre(ch({ phase: 'code' }));
  const bande = balises(svg, 'rect')[0];
  assert.equal(bande.fill, '#185FA5');
  assert.equal(bande['fill-opacity'], undefined);
  const t = textes(svg).find((x) => x.x === '12' && x.y === '25');
  assert.equal(t.fill, '#FFFFFF');
  assert.equal(t['font-weight'], '500');
  assert.equal(balises(svg, 'line').length, 0);
});

test('svgChapitre : à faire -> fond gris 0,12, texte #6F6E68, pas de rature', () => {
  const svg = svgChapitre(ch());
  const bande = balises(svg, 'rect')[0];
  assert.equal(bande.fill, '#888780');
  assert.equal(bande['fill-opacity'], '0.12');
  const t = textes(svg).find((x) => x.x === '12' && x.y === '25');
  assert.equal(t.fill, '#6F6E68');
  assert.equal(balises(svg, 'line').length, 0);
});

test('svgChapitre : titre coupé à 30 caractères + « … » si plus long', () => {
  const t = textes(svgChapitre(ch({ titre: 'a'.repeat(31) }))).find((x) => x.x === '12' && x.y === '25');
  assert.equal(t.contenu, 'C1. ' + 'a'.repeat(30) + '…');
});

test('svgChapitre : titre de 30 caractères, pas de « … »', () => {
  const t = textes(svgChapitre(ch({ titre: 'a'.repeat(30) }))).find((x) => x.x === '12' && x.y === '25');
  assert.equal(t.contenu, 'C1. ' + 'a'.repeat(30));
});

test('svgChapitre : rature sur le texte tronqué affiché (35 caractères)', () => {
  const svg = svgChapitre(ch({ fait: true, titre: 'a'.repeat(31) }));
  const r = balises(svg, 'line')[0];
  assert.equal(r.x2, String(12 + Math.round(35 * 15 * 0.55))); // 12 + 289 = 301
});

test('svgChapitre : nbFait/nb ancré à droite en (largeur - 12, 25), taille 13, couleur du texte', () => {
  const t = textes(svgChapitre(ch({ nbFait: 2, nb: 5 }), 200)).find((x) => x['text-anchor'] === 'end');
  assert.ok(t, 'compteur absent');
  assert.equal(t.contenu, '2/5');
  assert.equal(t.x, '188');
  assert.equal(t.y, '25');
  assert.equal(t['font-size'], '13');
  assert.equal(t.fill, '#6F6E68');
});

test('svgChapitre : échappement de id et titre', () => {
  const t = textes(svgChapitre(ch({ id: 'C&1', titre: '<a>"\'&' }))).find((x) => x.x === '12' && x.y === '25');
  assert.equal(t.contenu, 'C&amp;1. &lt;a&gt;&quot;&#39;&amp;');
});

// ---------- svgSousEtape ----------

const se = (extra) => ({ id: 'S1', titre: 'Abc', phase: null, fait: false, ...extra });

test('svgSousEtape : en-tête 286 x 30 par défaut, largeur passée honorée', () => {
  entete(svgSousEtape(se()), 286, 30);
  entete(svgSousEtape(se(), 250), 250, 30);
});

test('svgSousEtape : à faire -> bande grise 0,12, texte #6F6E68, pas de nom de phase', () => {
  const svg = svgSousEtape(se());
  const bande = balises(svg, 'rect')[0];
  assert.equal(bande.x, '0');
  assert.equal(bande.y, '2');
  assert.equal(bande.width, '286');
  assert.equal(bande.height, '26');
  assert.equal(bande.rx, '6');
  assert.equal(bande.fill, '#888780');
  assert.equal(bande['fill-opacity'], '0.12');
  const t = textes(svg).find((x) => x.x === '12' && x.y === '19');
  assert.equal(t.contenu, 'S1 Abc');
  assert.equal(t['font-size'], '13');
  assert.equal(t.fill, '#6F6E68');
  assert.equal(balises(svg, 'line').length, 0);
  assert.equal(textes(svg).filter((x) => x['font-size'] === '10').length, 0);
});

test('svgSousEtape : fait -> fond gris 0,12, texte gris, rature grise 1,5, pas de nom de phase', () => {
  const svg = svgSousEtape(se({ fait: true, phase: 'test' }));
  const bande = balises(svg, 'rect')[0];
  assert.equal(bande.fill, '#888780');
  assert.equal(bande['fill-opacity'], '0.12');
  const t = textes(svg).find((x) => x.x === '12' && x.y === '19');
  assert.equal(t.fill, '#888780');
  const r = balises(svg, 'line');
  assert.equal(r.length, 1);
  assert.equal(r[0].x1, '12');
  assert.equal(r[0].x2, '55'); // 12 + round(6 * 13 * 0.55) = 12 + 43
  assert.equal(r[0].y1, '15');
  assert.equal(r[0].y2, '15');
  assert.equal(r[0].stroke, '#888780');
  assert.equal(r[0]['stroke-width'], '1.5');
  assert.equal(textes(svg).filter((x) => x['font-size'] === '10').length, 0);
});

test('svgSousEtape : en cours -> fond de phase, texte blanc gras', () => {
  const svg = svgSousEtape(se({ phase: 'echec' }));
  const bande = balises(svg, 'rect')[0];
  assert.equal(bande.fill, '#A32D2D');
  assert.equal(bande['fill-opacity'], undefined);
  const t = textes(svg).find((x) => x.x === '12' && x.y === '19');
  assert.equal(t.fill, '#FFFFFF');
  assert.equal(t['font-weight'], '500');
  assert.equal(balises(svg, 'line').length, 0);
});

test('svgSousEtape : nom de phase à x 276, y 19, taille 10, couleur du libellé', () => {
  const cas = [
    ['code', 'CODE', '#B5D4F4'],
    ['test', 'TEST', '#C0DD97'],
    ['echec', 'ÉCHEC DU TEST', '#F7C1C1'],
  ];
  for (const [phase, nom, couleur] of cas) {
    const n = textes(svgSousEtape(se({ phase }))).find((x) => x['font-size'] === '10');
    assert.ok(n, 'nom de phase absent pour ' + phase);
    assert.equal(n.contenu, nom);
    assert.equal(n.x, '276');
    assert.equal(n.y, '19');
    assert.equal(n['text-anchor'], 'end');
    assert.equal(n['font-weight'], '500');
    assert.equal(n.fill, couleur);
  }
});

test('svgSousEtape : nom de phase suit la largeur passée', () => {
  const n = textes(svgSousEtape(se({ phase: 'code' }), 250)).find((x) => x['font-size'] === '10');
  assert.equal(n.x, '240');
});

test('svgSousEtape : titre coupé à 34 caractères + « … »', () => {
  const t = textes(svgSousEtape(se({ titre: 'a'.repeat(35) }))).find((x) => x.x === '12' && x.y === '19');
  assert.equal(t.contenu, 'S1 ' + 'a'.repeat(34) + '…');
});

test('svgSousEtape : titre de 34 caractères, pas de « … »', () => {
  const t = textes(svgSousEtape(se({ titre: 'a'.repeat(34) }))).find((x) => x.x === '12' && x.y === '19');
  assert.equal(t.contenu, 'S1 ' + 'a'.repeat(34));
});

test('svgSousEtape : échappement de id et titre', () => {
  const t = textes(svgSousEtape(se({ id: 'S<1', titre: '"x"' }))).find((x) => x.x === '12' && x.y === '19');
  assert.equal(t.contenu, 'S&lt;1 &quot;x&quot;');
});

test('svgSousEtape : décalage 72 -> svg 358 de large, bande à x 72, texte à x 84', () => {
  const svg = svgSousEtape(se(), 286, 72);
  entete(svg, 358, 30);
  const bande = balises(svg, 'rect')[0];
  assert.equal(bande.x, '72');
  assert.equal(bande.width, '286');
  const t = textes(svg).find((x) => x.y === '19');
  assert.equal(t.x, '84');
});

test('svgSousEtape : décalage 72, rature commence à x 84', () => {
  const svg = svgSousEtape(se({ fait: true, phase: 'test' }), 286, 72);
  const r = balises(svg, 'line');
  assert.equal(r.length, 1);
  assert.equal(r[0].x1, '84');
  assert.equal(r[0].x2, '127'); // 84 + round(6 * 13 * 0.55) = 84 + 43
});

test('svgSousEtape : décalage 72, nom de phase à x 348', () => {
  const n = textes(svgSousEtape(se({ phase: 'code' }), 286, 72)).find((x) => x['font-size'] === '10');
  assert.equal(n.x, '348');
});

test('svgSousEtape : sans décalage, bande à x 0 et svg 286 de large', () => {
  const svg = svgSousEtape(se());
  entete(svg, 286, 30);
  assert.equal(balises(svg, 'rect')[0].x, '0');
});
