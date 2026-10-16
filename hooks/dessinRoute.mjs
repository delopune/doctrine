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

function rect(x, y, w, h, fill, rx) {
  const r = rx === undefined ? '' : ' rx="' + rx + '"';
  return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"' + r + ' fill="' + fill + '"/>';
}

function texte(x, y, contenu, { size, weight, fill, anchor }) {
  const w = weight === undefined ? '' : ' font-weight="' + weight + '"';
  const a = anchor === undefined ? '' : ' text-anchor="' + anchor + '"';
  return '<text x="' + x + '" y="' + y + '" font-family="system-ui, sans-serif" font-size="' + size + '"' + w + a + ' fill="' + fill + '">' + esc(contenu) + '</text>';
}

function rature(x, y, longueur, couleur) {
  return '<line x1="' + x + '" y1="' + y + '" x2="' + (x + longueur) + '" y2="' + y + '" stroke="' + couleur + '" stroke-width="2"/>';
}

function tronque(s, n) {
  s = String(s);
  return s.length > n ? s.slice(0, n) + '…' : s;
}

function longueurEstimee(s, taille) {
  return Math.round(s.length * taille * 0.55);
}

function style(obj) {
  if (obj.fait) return { fond: COULEURS.afaire, texte: '#5F5E5A' };
  if (obj.phase) return { fond: COULEURS[obj.phase], texte: '#FFFFFF', poids: 500 };
  return { fond: '#B4B2A9', texte: '#2C2C2A' };
}

export function svgGlobal(global) {
  const { nbFait, nb, pourcent, segments } = global;
  let corps = texte(0, 24, nbFait + ' / ' + nb + ' livrées', { size: 22, weight: 500, fill: GRIS });
  corps += texte(360, 24, pourcent + ' %', { size: 22, weight: 500, fill: GRIS, anchor: 'end' });

  if (nb === 0) {
    corps += texte(0, 46, 'Feuille de route vide', { size: 14, fill: GRIS });
  } else {
    const n = segments.length;
    const w = Math.round(((360 - 3 * (n - 1)) / n) * 10) / 10;
    segments.forEach((s, i) => {
      corps += rect(i * (w + 3), 34, w, 18, COULEURS[s], 3);
    });
  }

  LEGENDE.forEach(([cle, mot], i) => {
    const x = i * 70;
    corps += rect(x, 62, 10, 10, COULEURS[cle]);
    corps += texte(x + 14, 72, mot, { size: 12, fill: GRIS });
  });

  return enTete(360, 80, corps);
}

export function svgChapitre(ch, largeur = 318) {
  const s = style(ch);
  const affiche = ch.id + '. ' + tronque(ch.titre, 26);
  let corps = rect(0, 0, largeur, 48, s.fond, 10);
  corps += texte(14, 31, affiche, { size: 20, weight: s.poids, fill: s.texte });
  if (ch.fait) corps += rature(14, 24, longueurEstimee(affiche, 20), s.texte);
  corps += texte(largeur - 14, 31, ch.nbFait + '/' + ch.nb, { size: 18, fill: s.texte, anchor: 'end' });
  return enTete(largeur, 48, corps);
}

export function svgSousEtape(se, largeur = 286, decalage = 0) {
  const s = style(se);
  const affiche = se.id + ' ' + tronque(se.titre, 30);
  let corps = rect(decalage, 0, largeur, 34, s.fond, 7);
  corps += texte(12 + decalage, 22, affiche, { size: 15, weight: s.poids, fill: s.texte });
  if (se.fait) corps += rature(12 + decalage, 17, longueurEstimee(affiche, 15), s.texte);
  if (se.phase && !se.fait) {
    const p = PHASES[se.phase];
    corps += texte(largeur - 12 + decalage, 22, p.nom, { size: 11, weight: 500, fill: p.libelle, anchor: 'end' });
  }
  return enTete(decalage + largeur, 34, corps);
}
