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

test('svgTableau : libellé, couleur de fond et chrono', () => {
  const s = svgTableau(un())
  assert.ok(s.includes('EXÉCUTANT'))
  assert.ok(s.includes('#0F6E56'))
  assert.ok(s.includes('3:12'))
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
