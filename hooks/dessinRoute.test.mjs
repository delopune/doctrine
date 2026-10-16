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

test('svgGlobal : en-tête 360 x 80, fond transparent', () => {
  const svg = svgGlobal(G);
  entete(svg, 360, 80);
  assert.equal(balises(svg, 'rect').filter((r) => r.width === '360' && r.height === '80').length, 0);
});

test('svgGlobal : texte gauche « nbFait / nb livrées » en (0, 24)', () => {
  const g = textes(svgGlobal(G)).find((t) => t.x === '0' && t.y === '24');
  assert.ok(g, 'texte gauche absent');
  assert.equal(g.contenu, '3 / 8 livrées');
  assert.equal(g['font-size'], '22');
  assert.equal(g['font-weight'], '500');
  assert.equal(g.fill, '#888780');
});

test('svgGlobal : pourcentage à droite en (360, 24), ancré à la fin', () => {
  const p = textes(svgGlobal(G)).find((t) => t.x === '360' && t.y === '24');
  assert.ok(p, 'pourcentage absent');
  assert.equal(p.contenu, '37 %');
  assert.equal(p['text-anchor'], 'end');
  assert.equal(p['font-size'], '22');
  assert.equal(p['font-weight'], '500');
  assert.equal(p.fill, '#888780');
});

test('svgGlobal : une case par segment, largeur 118 pour 3 segments', () => {
  const cases = balises(svgGlobal(G), 'rect').filter((r) => r.y === '34');
  assert.equal(cases.length, 3);
  const couleurs = [COULEURS.fait, COULEURS.code, COULEURS.test];
  cases.forEach((c, i) => {
    assert.equal(c.width, '118');
    assert.equal(c.height, '18');
    assert.equal(c.rx, '3');
    assert.equal(Number(c.x), i * 121);
    assert.equal(c.fill, couleurs[i]);
  });
});

test('svgGlobal : largeur arrondie à 0,1 (7 segments -> 48.9, pas de x decale)', () => {
  const cases = balises(svgGlobal({ ...G, segments: Array(7).fill('afaire') }), 'rect').filter((r) => r.y === '34');
  assert.equal(cases.length, 7);
  cases.forEach((c, i) => {
    assert.equal(c.width, '48.9');
    assert.ok(Math.abs(Number(c.x) - i * 51.9) < 1e-9, 'x=' + c.x + ' pour i=' + i);
  });
});

test('svgGlobal : nb = 0 -> pas de case, texte « Feuille de route vide »', () => {
  const svg = svgGlobal({ nbFait: 0, nb: 0, pourcent: 0, segments: ['afaire'] });
  assert.equal(balises(svg, 'rect').filter((r) => r.y === '34').length, 0);
  const v = textes(svg).find((t) => t.x === '0' && t.y === '46');
  assert.ok(v, 'texte « vide » absent');
  assert.equal(v.contenu, 'Feuille de route vide');
  assert.equal(v['font-size'], '14');
  assert.equal(v.fill, '#888780');
});

test('svgGlobal : légende, carrés 10x10 en x 0,70,140,210,280 et mots à x+14', () => {
  const svg = svgGlobal(G);
  const carres = balises(svg, 'rect').filter((r) => r.width === '10' && r.height === '10');
  assert.equal(carres.length, 5);
  const xs = ['0', '70', '140', '210', '280'];
  const fills = [COULEURS.fait, COULEURS.code, COULEURS.test, COULEURS.echec, COULEURS.afaire];
  carres.forEach((c, i) => {
    assert.equal(c.x, xs[i]);
    assert.equal(c.y, '62');
    assert.equal(c.fill, fills[i]);
  });
  const mots = ['livré', 'code', 'test', 'échec', 'à faire'];
  const txt = textes(svg).filter((t) => t.y === '72');
  assert.equal(txt.length, 5);
  txt.forEach((t, i) => {
    assert.equal(t.x, String(Number(xs[i]) + 14));
    assert.equal(t.contenu, mots[i]);
    assert.equal(t['font-size'], '12');
    assert.equal(t.fill, '#888780');
  });
});

// ---------- svgChapitre ----------

const ch = (extra) => ({ id: 'C1', titre: 'Gare', phase: null, fait: false, nbFait: 2, nb: 5, ...extra });

test('svgChapitre : en-tête 318 x 48 par défaut, largeur passée honorée', () => {
  entete(svgChapitre(ch()), 318, 48);
  entete(svgChapitre(ch(), 200), 200, 48);
});

test('svgChapitre : bande faite, rature et couleurs grises', () => {
  const svg = svgChapitre(ch({ fait: true, nbFait: 5, phase: 'code' }));
  const bande = balises(svg, 'rect')[0];
  assert.equal(bande.width, '318');
  assert.equal(bande.height, '48');
  assert.equal(bande.rx, '10');
  assert.equal(bande.fill, '#D3D1C7');
  const t = textes(svg).find((x) => x.x === '14' && x.y === '31');
  assert.equal(t.contenu, 'C1. Gare');
  assert.equal(t['font-size'], '20');
  assert.equal(t.fill, '#5F5E5A');
  const r = balises(svg, 'line');
  assert.equal(r.length, 1);
  assert.equal(r[0].x1, '14');
  assert.equal(r[0].x2, '102'); // 14 + round(8 * 20 * 0.55) = 14 + 88
  assert.equal(r[0].y1, '24');
  assert.equal(r[0].y2, '24');
  assert.equal(r[0].stroke, '#5F5E5A');
  assert.equal(r[0]['stroke-width'], '2');
});

test('svgChapitre : en cours -> fond de la phase, texte blanc gras, pas de rature', () => {
  const svg = svgChapitre(ch({ phase: 'code' }));
  assert.equal(balises(svg, 'rect')[0].fill, '#185FA5');
  const t = textes(svg).find((x) => x.x === '14' && x.y === '31');
  assert.equal(t.fill, '#FFFFFF');
  assert.equal(t['font-weight'], '500');
  assert.equal(balises(svg, 'line').length, 0);
});

test('svgChapitre : à faire -> fond gris clair, texte foncé, pas de rature', () => {
  const svg = svgChapitre(ch());
  assert.equal(balises(svg, 'rect')[0].fill, '#B4B2A9');
  const t = textes(svg).find((x) => x.x === '14' && x.y === '31');
  assert.equal(t.fill, '#2C2C2A');
  assert.equal(balises(svg, 'line').length, 0);
});

test('svgChapitre : titre coupé à 26 caractères + « … » si plus long', () => {
  const svg = svgChapitre(ch({ titre: 'abcdefghijklmnopqrstuvwxyz0123' }));
  const t = textes(svg).find((x) => x.x === '14' && x.y === '31');
  assert.equal(t.contenu, 'C1. abcdefghijklmnopqrstuvwxyz…');
});

test('svgChapitre : titre de 26 caractères, pas de « … »', () => {
  const t = textes(svgChapitre(ch({ titre: 'abcdefghijklmnopqrstuvwxyz' }))).find((x) => x.x === '14' && x.y === '31');
  assert.equal(t.contenu, 'C1. abcdefghijklmnopqrstuvwxyz');
});

test('svgChapitre : rature sur le texte tronqué affiché', () => {
  const svg = svgChapitre(ch({ fait: true, titre: 'abcdefghijklmnopqrstuvwxyz0123' }));
  const r = balises(svg, 'line')[0];
  assert.equal(r.x2, String(14 + Math.round(31 * 20 * 0.55))); // 4 + 26 + 1 = 31 caracteres
});

test('svgChapitre : nbFait/nb ancré à droite en (largeur - 14, 31)', () => {
  const t = textes(svgChapitre(ch({ nbFait: 2, nb: 5 }), 200)).find((x) => x['text-anchor'] === 'end');
  assert.ok(t, 'compteur absent');
  assert.equal(t.contenu, '2/5');
  assert.equal(t.x, '186');
  assert.equal(t.y, '31');
  assert.equal(t['font-size'], '18');
});

test('svgChapitre : échappement de id et titre', () => {
  const t = textes(svgChapitre(ch({ id: 'C&1', titre: '<a>"\'&' }))).find((x) => x.x === '14' && x.y === '31');
  assert.equal(t.contenu, 'C&amp;1. &lt;a&gt;&quot;&#39;&amp;');
});

// ---------- svgSousEtape ----------

const se = (extra) => ({ id: 'S1', titre: 'Abc', phase: null, fait: false, ...extra });

test('svgSousEtape : en-tête 286 x 34 par défaut, largeur passée honorée', () => {
  entete(svgSousEtape(se()), 286, 34);
  entete(svgSousEtape(se(), 250), 250, 34);
});

test('svgSousEtape : à faire -> bande grise, texte, pas de nom de phase', () => {
  const svg = svgSousEtape(se());
  const bande = balises(svg, 'rect')[0];
  assert.equal(bande.width, '286');
  assert.equal(bande.height, '34');
  assert.equal(bande.rx, '7');
  assert.equal(bande.fill, '#B4B2A9');
  const t = textes(svg).find((x) => x.x === '12' && x.y === '22');
  assert.equal(t.contenu, 'S1 Abc');
  assert.equal(t['font-size'], '15');
  assert.equal(t.fill, '#2C2C2A');
  assert.equal(balises(svg, 'line').length, 0);
  assert.equal(textes(svg).filter((x) => x['font-size'] === '11').length, 0);
});

test('svgSousEtape : fait -> rature de x 12 à 12 + round(6 * 15 * 0.55), pas de nom de phase', () => {
  const svg = svgSousEtape(se({ fait: true, phase: 'test' }));
  assert.equal(balises(svg, 'rect')[0].fill, '#D3D1C7');
  const t = textes(svg).find((x) => x.x === '12' && x.y === '22');
  assert.equal(t.fill, '#5F5E5A');
  const r = balises(svg, 'line');
  assert.equal(r.length, 1);
  assert.equal(r[0].x1, '12');
  assert.equal(r[0].x2, '62'); // 12 + round(49.5) = 62
  assert.equal(r[0].y1, '17');
  assert.equal(r[0].y2, '17');
  assert.equal(r[0].stroke, '#5F5E5A');
  assert.equal(r[0]['stroke-width'], '2');
  assert.equal(textes(svg).filter((x) => x['font-size'] === '11').length, 0);
});

test('svgSousEtape : en cours -> fond de phase, texte blanc gras', () => {
  const svg = svgSousEtape(se({ phase: 'echec' }));
  assert.equal(balises(svg, 'rect')[0].fill, '#A32D2D');
  const t = textes(svg).find((x) => x.x === '12' && x.y === '22');
  assert.equal(t.fill, '#FFFFFF');
  assert.equal(t['font-weight'], '500');
  assert.equal(balises(svg, 'line').length, 0);
});

test('svgSousEtape : nom de phase à droite, couleur du libellé', () => {
  const cas = [
    ['code', 'CODE', '#B5D4F4'],
    ['test', 'TEST', '#C0DD97'],
    ['echec', 'ÉCHEC DU TEST', '#F7C1C1'],
  ];
  for (const [phase, nom, couleur] of cas) {
    const n = textes(svgSousEtape(se({ phase }))).find((x) => x['font-size'] === '11');
    assert.ok(n, 'nom de phase absent pour ' + phase);
    assert.equal(n.contenu, nom);
    assert.equal(n.x, '274');
    assert.equal(n.y, '22');
    assert.equal(n['text-anchor'], 'end');
    assert.equal(n['font-weight'], '500');
    assert.equal(n.fill, couleur);
  }
});

test('svgSousEtape : nom de phase suit la largeur passée', () => {
  const n = textes(svgSousEtape(se({ phase: 'code' }), 250)).find((x) => x['font-size'] === '11');
  assert.equal(n.x, '238');
});

test('svgSousEtape : titre coupé à 30 caractères + « … »', () => {
  const t = textes(svgSousEtape(se({ titre: 'a'.repeat(31) }))).find((x) => x.x === '12' && x.y === '22');
  assert.equal(t.contenu, 'S1 ' + 'a'.repeat(30) + '…');
});

test('svgSousEtape : titre de 30 caractères, pas de « … »', () => {
  const t = textes(svgSousEtape(se({ titre: 'a'.repeat(30) }))).find((x) => x.x === '12' && x.y === '22');
  assert.equal(t.contenu, 'S1 ' + 'a'.repeat(30));
});

test('svgSousEtape : échappement de id et titre', () => {
  const t = textes(svgSousEtape(se({ id: 'S<1', titre: '"x"' }))).find((x) => x.x === '12' && x.y === '22');
  assert.equal(t.contenu, 'S&lt;1 &quot;x&quot;');
});

test('svgSousEtape : décalage 72 -> svg 358 de large, bande à x 72, texte à x 84', () => {
  const svg = svgSousEtape(se(), 286, 72);
  entete(svg, 358, 34);
  const bande = balises(svg, 'rect')[0];
  assert.equal(bande.x, '72');
  assert.equal(bande.width, '286');
  const t = textes(svg).find((x) => x.y === '22');
  assert.equal(t.x, '84');
});

test('svgSousEtape : décalage 72, rature commence à x 84', () => {
  const svg = svgSousEtape(se({ fait: true, phase: 'test' }), 286, 72);
  const r = balises(svg, 'line');
  assert.equal(r.length, 1);
  assert.equal(r[0].x1, '84');
  assert.equal(r[0].x2, '134'); // 84 + round(49.5) = 134
});

test('svgSousEtape : décalage 72, nom de phase à x 346', () => {
  const n = textes(svgSousEtape(se({ phase: 'code' }), 286, 72)).find((x) => x['font-size'] === '11');
  assert.equal(n.x, '346');
});

test('svgSousEtape : sans décalage, bande à x 0 et svg 286 de large', () => {
  const svg = svgSousEtape(se());
  entete(svg, 286, 34);
  assert.equal(balises(svg, 'rect')[0].x, '0');
});
