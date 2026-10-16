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
  return mission.length > 38 ? mission.slice(0, 38) + '…' : mission
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

  const cartes = [
    ['en cours', compteurs.enCours, '#1D9E75'],
    ['terminés', compteurs.termines, '#888780'],
    ['échecs', compteurs.echecs, '#E24B4A'],
  ]
  cartes.forEach(([libelle, n, couleur], i) => {
    const x = i * 122
    out.push(`<rect x="${x}" y="0" width="116" height="64" rx="10" fill="#888780" fill-opacity="0.12"/>`)
    out.push(texte(x + 12, 22, { taille: 12, fill: '#888780' }, esc(libelle)))
    out.push(texte(x + 12, 54, { taille: 30, fill: couleur, poids: 500 }, esc(n)))
  })

  let bas = 64
  let y = 76
  for (const a of actifs) {
    const st = stylePhase(a.phase)
    out.push(`<rect x="0" y="${y}" width="360" height="92" rx="10" fill="${st.fond}"/>`)
    out.push(texte(12, y + 20, { taille: 11, fill: st.couleurLibelle, poids: 500 }, esc(libelleType(a.type) + ' · ' + st.nom)))
    out.push(texte(348, y + 24, { taille: 18, fill: couleurChrono(a.ms), poids: 500, ancre: 'end' }, esc(formatChrono(a.ms))))
    out.push(texte(12, y + 46, { taille: 15, fill: '#FFFFFF', poids: 500 }, esc(coupe(a.mission))))
    out.push(texte(12, y + 66, { taille: 12, fill: st.couleurLibelle }, esc(texteEtape(a.etape))))
    out.push(`<rect x="12" y="${y + 76}" width="336" height="6" rx="3" fill="#FFFFFF" fill-opacity="0.25"/>`)
    if (a.etape && a.etape.n > 1) {
      const largeurEtape = Math.round(336 * (a.etape.n - 1) / a.etape.total)
      out.push(`<rect x="12" y="${y + 76}" width="${largeurEtape}" height="6" rx="3" fill="#FFFFFF"/>`)
    }
    bas = y + 92
    y += 100
  }

  if (actifs.length === 0) {
    out.push(texte(0, 100, { taille: 14, fill: '#888780' }, esc('Aucun sous-agent en cours.')))
    bas = 100
  }

  let hauteur = bas
  if (recents.length > 0) {
    let yr = bas + 20
    for (const r of recents) {
      if (r.statut === 'terminé') {
        out.push(texte(0, yr, { taille: 12, fill: '#888780' }, esc('✓ ' + r.mission)))
      } else if (r.statut === 'échec') {
        out.push(texte(0, yr, { taille: 12, fill: '#E24B4A' }, esc('✗ ' + r.mission)))
      } else {
        out.push(texte(0, yr, { taille: 12, fill: '#888780' }, esc('■ ' + r.mission + ' (' + r.statut + ')')))
      }
      yr += 18
    }
    hauteur = yr - 18 + 6
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="${hauteur}" viewBox="0 0 360 ${hauteur}">\n` +
    out.join('\n') + '\n</svg>'
}
