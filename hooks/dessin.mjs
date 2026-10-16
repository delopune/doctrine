import { formatChrono } from './lignes.mjs'

const POLICE = 'system-ui, sans-serif'

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function coupe(mission) {
  return mission.length > 42 ? mission.slice(0, 42) + '…' : mission
}

function coupeTitre(titre) {
  return titre.length > 40 ? titre.slice(0, 40) + '…' : titre
}

export function texteEtape(etape) {
  if (!etape) return 'Étape —'
  return 'Étape ' + etape.n + '/' + etape.total + (etape.titre ? ' · ' + coupeTitre(etape.titre) : '')
}

export function libelleType(type) {
  const t = String(type ?? '')
  if (t.includes('executant')) return 'EXÉCUTANT'
  if (t.includes('lecteur')) return 'LECTEUR'
  return t.toUpperCase()
}

export function stylePhase(phase) {
  if (phase === 'test') return { fond: '#3B6D11', couleurLibelle: '#C0DD97', nom: 'TEST' }
  if (phase === 'echec') return { fond: '#A32D2D', couleurLibelle: '#F7C1C1', nom: 'ÉCHEC DU TEST' }
  return { fond: '#185FA5', couleurLibelle: '#B5D4F4', nom: 'CODE' }
}

export function couleurChrono(ms) {
  if (ms < 120000) return '#97C459'
  if (ms < 600000) return '#EF9F27'
  return '#F09595'
}

function texte(x, y, { taille, fill, poids, ancre }, contenu) {
  return `<text x="${x}" y="${y}" font-size="${taille}" fill="${fill}"` +
    (poids ? ` font-weight="${poids}"` : '') +
    (ancre ? ` text-anchor="${ancre}"` : '') +
    ` font-family="${POLICE}">${contenu}</text>`
}

export function svgTableau({ actifs, recents, compteurs }) {
  const out = []

  out.push(texte(0, 14, { taille: 13, fill: '#888780' },
    `<tspan fill="#1D9E75" font-weight="500">${esc(compteurs.enCours)}</tspan>` +
    ' en cours · ' +
    `<tspan font-weight="500">${esc(compteurs.termines)}</tspan>` +
    ' terminés · ' +
    `<tspan fill="#E24B4A" font-weight="500">${esc(compteurs.echecs)}</tspan>` +
    ' échecs'))

  let bas = 26
  let y = 26
  for (const a of actifs) {
    const st = stylePhase(a.phase)
    out.push(`<rect x="0" y="${y}" width="360" height="72" rx="8" fill="${st.fond}"/>`)
    out.push(texte(12, y + 18, { taille: 10, fill: st.couleurLibelle, poids: 500 }, esc(libelleType(a.type) + ' · ' + st.nom)))
    out.push(texte(348, y + 20, { taille: 14, fill: couleurChrono(a.ms), poids: 500, ancre: 'end' }, esc(formatChrono(a.ms))))
    out.push(texte(12, y + 38, { taille: 13, fill: '#FFFFFF', poids: 500 }, esc(coupe(a.mission))))
    out.push(texte(12, y + 54, { taille: 11, fill: st.couleurLibelle }, esc(texteEtape(a.etape))))
    out.push(`<rect x="12" y="${y + 62}" width="336" height="4" rx="2" fill="#FFFFFF" fill-opacity="0.25"/>`)
    if (a.etape && a.etape.n > 1) {
      const largeurEtape = Math.round(336 * (a.etape.n - 1) / a.etape.total)
      out.push(`<rect x="12" y="${y + 62}" width="${largeurEtape}" height="4" rx="2" fill="#FFFFFF"/>`)
    }
    bas = y + 72
    y += 78
  }

  if (actifs.length === 0) {
    out.push(texte(0, 44, { taille: 13, fill: '#888780' }, esc('Aucun sous-agent en cours.')))
    bas = 44
  }

  let hauteur = bas
  if (recents.length > 0) {
    let yr = bas + 18
    for (const r of recents) {
      if (r.statut === 'terminé') {
        out.push(texte(0, yr, { taille: 11, fill: '#888780' }, esc('✓ ' + r.mission)))
      } else if (r.statut === 'échec') {
        out.push(texte(0, yr, { taille: 11, fill: '#E24B4A' }, esc('✗ ' + r.mission)))
      } else {
        out.push(texte(0, yr, { taille: 11, fill: '#888780' }, esc('■ ' + r.mission + ' (' + r.statut + ')')))
      }
      yr += 16
    }
    hauteur = yr - 16 + 6
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="${hauteur}" viewBox="0 0 360 ${hauteur}">\n` +
    out.join('\n') + '\n</svg>'
}
