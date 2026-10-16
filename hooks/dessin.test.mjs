import { test } from 'node:test'
import assert from 'node:assert/strict'
import { svgTableau } from './dessin.mjs'

const un = (extra) => ({
  actifs: [{ id: 'a1', type: 'doctrine:executant', mission: 'Mission', duree: '3 min 12 s', ms: 192000, ...extra }],
  recents: [],
  compteurs: { enCours: 1, termines: 0, echecs: 0 },
})

test('svgTableau : enveloppe <svg ... </svg>', () => {
  const s = svgTableau(un())
  assert.ok(s.startsWith('<svg'))
  assert.ok(s.endsWith('</svg>'))
})

test('svgTableau : échappe la mission', () => {
  const s = svgTableau(un({ mission: 'Coder <le> parseur & co' }))
  assert.ok(s.includes('Coder &lt;le&gt; parseur &amp; co'))
  assert.ok(!s.includes('<le>'))
})

test('svgTableau : couleur de fond selon la phase (code)', () => {
  assert.ok(svgTableau(un({ phase: 'code' })).includes('#185FA5'))
})

test('svgTableau : couleur de fond selon la phase (test)', () => {
  assert.ok(svgTableau(un({ phase: 'test' })).includes('#3B6D11'))
})

test('svgTableau : couleur de fond selon la phase (échec)', () => {
  assert.ok(svgTableau(un({ phase: 'echec' })).includes('#A32D2D'))
})

test('svgTableau : libellé type · phase', () => {
  assert.ok(svgTableau(un({ phase: 'code' })).includes('EXÉCUTANT · CODE'))
  assert.ok(svgTableau(un({ phase: 'test' })).includes('EXÉCUTANT · TEST'))
  assert.ok(svgTableau(un({ phase: 'echec' })).includes('EXÉCUTANT · ÉCHEC DU TEST'))
})

test('svgTableau : chrono', () => {
  assert.ok(svgTableau(un()).includes('3:12'))
})

test('svgTableau : couleur du texte du chrono selon le temps', () => {
  assert.match(svgTableau(un({ ms: 60000 })), /fill="#97C459"[^>]*text-anchor="end"[^>]*>1:00</)
  assert.match(svgTableau(un({ ms: 300000 })), /fill="#EF9F27"[^>]*text-anchor="end"[^>]*>5:00</)
  assert.match(svgTableau(un({ ms: 900000 })), /fill="#F09595"[^>]*text-anchor="end"[^>]*>15:00</)
})

test('svgTableau : sans actif, message dédié', () => {
  const s = svgTableau({ actifs: [], recents: [], compteurs: { enCours: 0, termines: 0, echecs: 0 } })
  assert.ok(s.includes('Aucun sous-agent en cours.'))
})

test('svgTableau : mission longue coupée à 38 caractères + …', () => {
  const longue = 'x'.repeat(60)
  const s = svgTableau(un({ mission: longue }))
  assert.ok(s.includes('x'.repeat(38) + '…'))
  assert.ok(!s.includes('x'.repeat(39)))
})

test('svgTableau : étape affichée et barre de progression proportionnelle', () => {
  const s = svgTableau(un({ etape: { n: 3, total: 5, titre: 'Écrire le test' } }))
  assert.ok(s.includes('Étape 3/5 · Écrire le test'))
  assert.ok(s.includes('width="134"'))
})

test('svgTableau : sans étape, Étape — et pas de barre remplie', () => {
  const s = svgTableau(un({ etape: null }))
  assert.ok(s.includes('Étape —'))
  assert.ok(!s.includes('fill="#FFFFFF"/>'))
})

test('svgTableau : titre d étape de 60 caractères coupé à 40 + …', () => {
  const s = svgTableau(un({ etape: { n: 2, total: 5, titre: 'y'.repeat(60) } }))
  assert.ok(s.includes('y'.repeat(40) + '…'))
  assert.ok(!s.includes('y'.repeat(41)))
})

test('svgTableau : titre d étape échappé', () => {
  const s = svgTableau(un({ etape: { n: 2, total: 5, titre: '<b>' } }))
  assert.ok(s.includes('&lt;b&gt;'))
  assert.ok(!s.includes('<b>'))
})
