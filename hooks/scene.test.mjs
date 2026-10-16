import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cleScene, svgScene, esc } from './scene.mjs'

const actif = (extra) => ({ id: 'a1', type: 'exécutant', mission: '[12.3] Implémenter le module', phase: 'code', ...extra })

function attrs(str) {
  const out = {}
  for (const m of str.matchAll(/([\w:-]+)="([^"]*)"/g)) out[m[1]] = m[2]
  return out
}
function elements(svg, nom) {
  return [...svg.matchAll(new RegExp(`<${nom}\\b([^>]*?)/?>`, 'g'))].map(m => attrs(m[1]))
}
function textes(svg) {
  return [...svg.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)].map(m => ({ ...attrs(m[1]), texte: m[2] }))
}
function contient(liste, attendus) {
  return liste.some(el => Object.entries(attendus).every(([k, v]) => el[k] === String(v)))
}

test('cleScene : même liste donne même clé', () => {
  const liste = [actif(), actif({ id: 'a2', type: 'lecteur', phase: 'test', mission: 'sans étape' })]
  assert.equal(cleScene(liste), cleScene(liste.map(a => ({ ...a }))))
})

test('cleScene : un changement de phase donne une autre clé', () => {
  assert.notEqual(cleScene([actif({ phase: 'code' })]), cleScene([actif({ phase: 'test' })]))
})

test('cleScene : un lecteur ignore la phase, et l\'id d\'étape compte', () => {
  assert.equal(
    cleScene([actif({ type: 'lecteur', phase: 'code' })]),
    cleScene([actif({ type: 'lecteur', phase: 'test' })]),
  )
  assert.notEqual(cleScene([actif({ mission: '[12.3] x' })]), cleScene([actif({ mission: '[12.4] x' })]))
})

test('svgScene : balise racine exacte', () => {
  const s = svgScene([])
  assert.ok(s.startsWith('<svg xmlns="http://www.w3.org/2000/svg" width="360" height="150" viewBox="0 0 360 150" shape-rendering="crispEdges">'))
  assert.ok(s.endsWith('</svg>'))
})

test('svgScene : sol', () => {
  assert.ok(contient(elements(svgScene([]), 'rect'), { x: 0, y: 118, width: 360, height: 32, fill: '#888780', 'fill-opacity': '0.12' }))
})

test('svgScene : au moins une animation dès qu\'il y a un actif', () => {
  assert.match(svgScene([actif()]), /<animate(Transform)?\b/)
})

test('chef sans actif : Zzz animé et pas de bras animé', () => {
  const s = svgScene([])
  assert.ok(textes(s).some(t => t.texte === 'Zzz' && t.x === '40' && t.y === '72' && t['font-size'] === '11' && t.fill === '#888780'))
  assert.ok(contient(elements(s, 'animate'), { attributeName: 'opacity', values: '0;1;0', dur: '2s', repeatCount: 'indefinite' }))
  assert.ok(!contient(elements(s, 'animateTransform'), { type: 'rotate' }))
})

test('chef avec actif : bras en rotation autour de (33, 84), étiquette « chef »', () => {
  const s = svgScene([actif()])
  assert.ok(contient(elements(s, 'animateTransform'), { attributeName: 'transform', type: 'rotate', values: '0 33 84;-25 33 84;0 33 84', dur: '1.6s', repeatCount: 'indefinite' }))
  assert.ok(contient(elements(s, 'rect'), { x: 33, y: 84, width: 4, height: 14, fill: '#534AB7' }))
  assert.ok(contient(elements(s, 'rect'), { x: 15, y: 82, width: 18, height: 20, fill: '#534AB7' }))
  assert.ok(textes(s).some(t => t.texte === 'chef' && t.x === '24' && t.y === '62' && t['text-anchor'] === 'middle' && t['font-size'] === '10' && t.fill === '#888780' && t['font-family'] === 'system-ui, sans-serif'))
})

test('emplacements : x = 70 + i×72, et « +N » au-delà de 4', () => {
  const quatre = [0, 1, 2, 3].map(i => actif({ id: 'a' + i }))
  const r4 = elements(svgScene(quatre), 'rect')
  for (let i = 0; i < 4; i++) assert.ok(contient(r4, { x: 71 + 72 * i, y: 82, width: 18, height: 20 }), 'emplacement ' + i)
  assert.ok(!textes(svgScene(quatre)).some(t => t.texte.startsWith('+')))

  const six = [0, 1, 2, 3, 4, 5].map(i => actif({ id: 'a' + i }))
  const s6 = svgScene(six)
  assert.ok(textes(s6).some(t => t.texte === '+2' && t.x === '352' && t.y === '92' && t['text-anchor'] === 'end' && t['font-size'] === '13' && t.fill === '#888780'))
  assert.ok(!elements(s6, 'rect').some(r => r.x === '359'))
})

test('étiquette : id d\'étape entre crochets, sinon lecteur ou exécutant', () => {
  const s = svgScene([
    actif({ mission: '[12.3] Implémenter' }),
    actif({ id: 'a2', type: 'lecteur', mission: 'sans étape', phase: 'code' }),
    actif({ id: 'a3', type: 'exécutant', mission: 'sans étape' }),
  ])
  const t = textes(s)
  assert.ok(t.some(x => x.texte === '[12.3]' && x.x === '90' && x.y === '62' && x['text-anchor'] === 'middle' && x['font-size'] === '10' && x.fill === '#888780' && x['font-family'] === 'system-ui, sans-serif'))
  assert.ok(t.some(x => x.texte === 'lecteur' && x.x === '162' && x.y === '62'))
  assert.ok(t.some(x => x.texte === 'exécutant' && x.x === '234' && x.y === '62'))
})

test('le texte de la mission n\'apparaît pas dans la scène', () => {
  assert.ok(!svgScene([actif({ mission: '[12.3] Implémenter XYZ' })]).includes('Implémenter XYZ'))
})

test('état code : chemise bleue, bureau, écran, dalle animée, bras qui tape', () => {
  const s = svgScene([actif({ phase: 'code' })])
  const r = elements(s, 'rect')
  assert.ok(contient(r, { x: 71, y: 82, width: 18, height: 20, fill: '#185FA5' }))
  assert.ok(contient(r, { x: 92, y: 98, width: 34, height: 5, fill: '#5F5E5A' }))
  assert.ok(contient(r, { x: 100, y: 82, width: 20, height: 15, fill: '#2C2C2A' }))
  assert.ok(contient(r, { x: 102, y: 84, width: 16, height: 11, fill: '#85B7EB' }))
  assert.ok(contient(elements(s, 'animate'), { attributeName: 'opacity', values: '1;0.6;1', dur: '0.5s', repeatCount: 'indefinite' }))
  assert.ok(contient(r, { x: 89, y: 86, width: 10, height: 4, fill: '#185FA5' }))
  assert.ok(contient(elements(s, 'animateTransform'), { attributeName: 'transform', type: 'translate', values: '0 0;0 2;0 0', dur: '0.25s', repeatCount: 'indefinite' }))
})

test('état test : chemise verte, banc, voyant animé, personnage dans un g qui glisse de -14', () => {
  const s = svgScene([actif({ phase: 'test' })])
  const r = elements(s, 'rect')
  assert.ok(contient(r, { x: 71, y: 82, width: 18, height: 20, fill: '#3B6D11' }))
  assert.ok(contient(r, { x: 92, y: 98, width: 34, height: 5, fill: '#5F5E5A' }))
  assert.ok(contient(r, { x: 110, y: 90, width: 10, height: 8 }))
  assert.ok(contient(elements(s, 'animate'), { attributeName: 'fill', values: '#97C459;#C0DD97;#97C459', dur: '0.8s', repeatCount: 'indefinite' }))
  const groupes = [...s.matchAll(/<g\b[^>]*>([\s\S]*?)<\/g>/g)].map(m => m[1])
  assert.ok(groupes.some(g => g.includes('#3B6D11') && g.includes('attributeName="transform"') && g.includes('type="translate"') && g.includes('values="0 0;-14 0;0 0"') && g.includes('dur="2.4s"')))
})

test('état echec : chemise rouge, dalle figée, deux fumées décalées de 0.75 s', () => {
  const s = svgScene([actif({ phase: 'echec' })])
  const r = elements(s, 'rect')
  assert.ok(contient(r, { x: 71, y: 82, width: 18, height: 20, fill: '#A32D2D' }))
  assert.ok(contient(r, { x: 102, y: 84, width: 16, height: 11, fill: '#F09595' }))
  assert.ok(!contient(elements(s, 'animate'), { values: '1;0.6;1' }))
  const fumees = elements(s, 'circle').filter(c => c.cx === '80' && c.r === '4' && c.fill === '#B4B2A9')
  assert.equal(fumees.length, 2)
  const anims = elements(s, 'animate')
  assert.equal(anims.filter(a => a.attributeName === 'cy' && a.values === '66;40' && a.dur === '1.5s' && a.repeatCount === 'indefinite').length, 2)
  assert.equal(anims.filter(a => a.attributeName === 'opacity' && a.values === '0.8;0' && a.dur === '1.5s').length, 2)
  assert.equal(anims.filter(a => a.begin === '0.75s').length, 2)
})

test('état lecteur : chemise grise, livre dont la largeur oscille', () => {
  const s = svgScene([actif({ type: 'lecteur', phase: 'code' })])
  const r = elements(s, 'rect')
  assert.ok(contient(r, { x: 71, y: 82, width: 18, height: 20, fill: '#5F5E5A' }))
  assert.ok(contient(r, { x: 88, y: 84, width: 10, height: 8, fill: '#D3D1C7' }))
  assert.ok(contient(elements(s, 'animate'), { attributeName: 'width', values: '10;6;10', dur: '1.2s', repeatCount: 'indefinite' }))
})

test('esc : & < > sont échappés, <b> devient &lt;b&gt;', () => {
  assert.equal(esc('<b>'), '&lt;b&gt;')
  assert.equal(esc('a & <b>'), 'a &amp; &lt;b&gt;')
  const q = esc('"\'')
  assert.ok(!q.includes('"') && !q.includes("'"))
})
