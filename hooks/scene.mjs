import { etapeDeMission } from './route.mjs'

const GRIS = '#888780'
const BUREAU = '#5F5E5A'
const PEAU = '#F0997B'
const JAMBES = '#444441'
const CHEF = '#534AB7'
const CHEMISE = { code: '#185FA5', test: '#3B6D11', echec: '#A32D2D', lecteur: '#5F5E5A' }
const DEBUT = '<svg xmlns="http://www.w3.org/2000/svg" width="360" height="150" viewBox="0 0 360 150" shape-rendering="crispEdges">'

export function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function att(o) {
  return Object.entries(o).map(([k, v]) => `${k}="${esc(v)}"`).join(' ')
}

function el(nom, o, enfants = '') {
  return `<${nom} ${att(o)}>${enfants}</${nom}>`
}

function texte(x, y, taille, contenu, ancre) {
  const o = { x, y, 'font-size': taille, fill: GRIS, 'font-family': 'system-ui, sans-serif' }
  if (ancre) o['text-anchor'] = ancre
  return el('text', o, esc(contenu))
}

function etat(a) {
  return (a.type || '').includes('lecteur') ? 'lecteur' : a.phase
}

export function cleScene(actifs) {
  return actifs.map(a => a.id + ':' + etat(a) + ':' + (etapeDeMission(a.mission) || '')).join('|')
}

function personnage(x, y, chemise) {
  return el('rect', { x: x + 4, y, width: 12, height: 12, fill: PEAU })
    + el('rect', { x: x + 1, y: y + 12, width: 18, height: 20, fill: chemise })
    + el('rect', { x: x + 4, y: y + 32, width: 5, height: 16, fill: JAMBES })
    + el('rect', { x: x + 11, y: y + 32, width: 5, height: 16, fill: JAMBES })
}

function chef(actifs) {
  const x = 14
  const y = 70
  let s = personnage(x, y, CHEF) + texte(x + 10, y - 8, 10, 'chef', 'middle')
  if (actifs.length > 0) {
    s += el('rect', { x: x + 19, y: y + 14, width: 4, height: 14, fill: CHEF }, el('animateTransform', { attributeName: 'transform', type: 'rotate', values: '0 33 84;-25 33 84;0 33 84', dur: '1.6s', repeatCount: 'indefinite' }))
  } else {
    s += texte(x + 26, y + 2, 11, 'Zzz')
      + el('animate', { attributeName: 'opacity', values: '0;1;0', dur: '2s', repeatCount: 'indefinite' })
  }
  return s
}

function emplacement(a, i) {
  const x = 70 + i * 72
  const y = 70
  const e = etat(a)
  const id = etapeDeMission(a.mission)
  const etiquette = id ? '[' + id + ']' : (a.type || '').includes('lecteur') ? 'lecteur' : 'exécutant'
  let s = ''
  if (e === 'lecteur') {
    s += personnage(x, y, CHEMISE.lecteur)
    s += el('rect', { x: x + 18, y: y + 14, width: 10, height: 8, fill: '#D3D1C7' }, el('animate', { attributeName: 'width', values: '10;6;10', dur: '1.2s', repeatCount: 'indefinite' }))
  } else if (e === 'test') {
    s += el('g', {}, personnage(x, y, CHEMISE.test)
      + el('animateTransform', { attributeName: 'transform', type: 'translate', values: '0 0;-14 0;0 0', dur: '2.4s', repeatCount: 'indefinite' }))
    s += el('rect', { x: x + 22, y: y + 28, width: 34, height: 5, fill: BUREAU })
    s += el('rect', { x: x + 40, y: y + 20, width: 10, height: 8, fill: '#97C459' }, el('animate', { attributeName: 'fill', values: '#97C459;#C0DD97;#97C459', dur: '0.8s', repeatCount: 'indefinite' }))
  } else {
    s += personnage(x, y, CHEMISE[e])
    s += el('rect', { x: x + 22, y: y + 28, width: 34, height: 5, fill: BUREAU })
    s += el('rect', { x: x + 30, y: y + 12, width: 20, height: 15, fill: '#2C2C2A' })
    if (e === 'code') {
      s += el('rect', { x: x + 32, y: y + 14, width: 16, height: 11, fill: '#85B7EB' }, el('animate', { attributeName: 'opacity', values: '1;0.6;1', dur: '0.5s', repeatCount: 'indefinite' }))
      s += el('rect', { x: x + 19, y: y + 16, width: 10, height: 4, fill: CHEMISE.code }, el('animateTransform', { attributeName: 'transform', type: 'translate', values: '0 0;0 2;0 0', dur: '0.25s', repeatCount: 'indefinite' }))
    } else {
      s += el('rect', { x: x + 32, y: y + 14, width: 16, height: 11, fill: '#F09595' })
      for (const debut of [null, '0.75s']) {
        const anims = el('animate', { attributeName: 'cy', values: `${y - 4};${y - 30}`, dur: '1.5s', repeatCount: 'indefinite', ...(debut ? { begin: debut } : {}) })
          + el('animate', { attributeName: 'opacity', values: '0.8;0', dur: '1.5s', repeatCount: 'indefinite', ...(debut ? { begin: debut } : {}) })
        s += el('circle', { cx: x + 10, cy: y - 4, r: 4, fill: '#B4B2A9' }, anims)
      }
    }
  }
  s += texte(x + 20, y - 8, 10, etiquette, 'middle')
  return s
}

export function svgScene(actifs) {
  let s = DEBUT
  s += el('rect', { x: 0, y: 118, width: 360, height: 32, fill: GRIS, 'fill-opacity': '0.12' })
  s += chef(actifs)
  actifs.slice(0, 4).forEach((a, i) => { s += emplacement(a, i) })
  if (actifs.length > 4) s += texte(352, 92, 13, '+' + (actifs.length - 4), 'end')
  return s + '</svg>'
}
