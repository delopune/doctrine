// Dessin SVG de la feuille de route : barre globale, ligne de chapitre, ligne de sous-étape.
// Fonctions pures, aucune dépendance.

export const COULEURS = {
  code: '#185FA5',
  test: '#3B6D11',
  echec: '#A32D2D',
  fait: '#5F5E5A',
  afaire: '#D3D1C7',
};

const PHASES = {
  code: { nom: 'CODE', libelle: '#B5D4F4' },
  test: { nom: 'TEST', libelle: '#C0DD97' },
  echec: { nom: 'ÉCHEC DU TEST', libelle: '#F7C1C1' },
};

const GRIS = '#888780';
const GRIS_AFAIRE = '#6F6E68';
const LEGENDE = [
  ['fait', 'livré'],
  ['code', 'code'],
  ['test', 'test'],
  ['echec', 'échec'],
  ['afaire', 'à faire'],
];

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function enTete(w, h, corps) {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' + corps + '</svg>';
}

function rect(x, y, w, h, fill, { rx, opacite, clip } = {}) {
  const r = rx === undefined ? '' : ' rx="' + rx + '"';
  const o = opacite === undefined ? '' : ' fill-opacity="' + opacite + '"';
  const c = clip === undefined ? '' : ' clip-path="' + clip + '"';
  return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"' + r + ' fill="' + fill + '"' + o + c + '/>';
}

function texte(x, y, contenu, { size, weight, fill, anchor }) {
  const w = weight === undefined ? '' : ' font-weight="' + weight + '"';
  const a = anchor === undefined ? '' : ' text-anchor="' + anchor + '"';
  return '<text x="' + x + '" y="' + y + '" font-family="system-ui, sans-serif" font-size="' + size + '"' + w + a + ' fill="' + fill + '">' + esc(contenu) + '</text>';
}

function rature(x, y, longueur, couleur, epaisseur) {
  return '<line x1="' + x + '" y1="' + y + '" x2="' + (x + longueur) + '" y2="' + y + '" stroke="' + couleur + '" stroke-width="' + epaisseur + '"/>';
}

function tronque(s, n) {
  s = String(s);
  return s.length > n ? s.slice(0, n) + '…' : s;
}

function longueurEstimee(s, taille) {
  return Math.round(s.length * taille * 0.55);
}

function style(obj) {
  if (obj.fait) return { fond: GRIS, opacite: '0.12', texte: GRIS };
  if (obj.phase) return { fond: COULEURS[obj.phase], texte: '#FFFFFF', poids: 500 };
  return { fond: GRIS, opacite: '0.12', texte: GRIS_AFAIRE };
}

export function svgGlobal(global) {
  const { nbFait, nb, pourcent, segments } = global;
  let corps = texte(0, 18, nbFait + ' / ' + nb + ' livrées', { size: 16, weight: 500, fill: GRIS });
  corps += texte(360, 18, pourcent + ' %', { size: 16, weight: 500, fill: GRIS, anchor: 'end' });

  if (nb === 0) {
    corps += texte(0, 38, 'Feuille de route vide', { size: 13, fill: GRIS });
  } else {
    const clip = 'url(#barre-globale)';
    corps += '<clipPath id="barre-globale"><rect x="0" y="28" width="360" height="10" rx="5"/></clipPath>';
    corps += rect(0, 28, 360, 10, COULEURS.afaire, { clip });
    let x = 0;
    for (const etat of ['fait', 'code', 'test', 'echec']) {
      const compte = segments.filter((s) => s === etat).length;
      if (compte === 0) continue;
      const w = Math.round((360 * compte / nb) * 10) / 10;
      corps += rect(x, 28, w, 10, COULEURS[etat], { clip });
      x = Math.round((x + w) * 10) / 10;
    }
  }

  LEGENDE.forEach(([cle, mot], i) => {
    const x = i * 64;
    corps += rect(x, 45, 8, 8, COULEURS[cle]);
    corps += texte(x + 12, 52, mot, { size: 11, fill: GRIS });
  });

  return enTete(360, 58, corps);
}

export function svgChapitre(ch, largeur = 318) {
  const s = style(ch);
  const affiche = ch.id + '. ' + tronque(ch.titre, 30);
  let corps = rect(0, 3, largeur, 34, s.fond, { rx: 8, opacite: s.opacite });
  corps += texte(12, 25, affiche, { size: 15, weight: s.poids, fill: s.texte });
  if (ch.fait) corps += rature(12, 20, longueurEstimee(affiche, 15), s.texte, 1.5);
  corps += texte(largeur - 12, 25, ch.nbFait + '/' + ch.nb, { size: 13, fill: s.texte, anchor: 'end' });
  return enTete(largeur, 40, corps);
}

export function svgSousEtape(se, largeur = 286, decalage = 0) {
  const s = style(se);
  const affiche = se.id + ' ' + tronque(se.titre, 34);
  let corps = rect(decalage, 2, largeur, 26, s.fond, { rx: 6, opacite: s.opacite });
  corps += texte(decalage + 12, 19, affiche, { size: 13, weight: s.poids, fill: s.texte });
  if (se.fait) corps += rature(decalage + 12, 15, longueurEstimee(affiche, 13), s.texte, 1.5);
  if (se.phase && !se.fait) {
    const p = PHASES[se.phase];
    corps += texte(decalage + largeur - 10, 19, p.nom, { size: 10, weight: 500, fill: p.libelle, anchor: 'end' });
  }
  return enTete(decalage + largeur, 30, corps);
}
