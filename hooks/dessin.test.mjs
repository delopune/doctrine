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

test('svgTableau : couleur de barre selon le temps', () => {
  assert.ok(svgTableau(un({ ms: 60000 })).includes('#97C459'))
  assert.ok(svgTableau(un({ ms: 300000 })).includes('#EF9F27'))
  assert.ok(svgTableau(un({ ms: 900000 })).includes('#F09595'))
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
