import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ACTIFS, majVus, formatDuree, lignes, formatChrono, compteurs } from './lignes.mjs'

test('formatDuree', () => {
  assert.equal(formatDuree(0), '0 s')
  assert.equal(formatDuree(45999), '45 s')
  assert.equal(formatDuree(185000), '3 min 05 s')
  assert.equal(formatDuree(3720000), '1 h 02 min')
})

test('majVus enregistre seulement les actifs et ne réécrit pas un id déjà vu', () => {
  const vus = new Map()
  const agents = [
    { id: 'a1', status: 'running' },
    { id: 'a2', status: 'completed' },
    { id: 'a3', status: 'pending' },
  ]
  majVus(vus, agents, 1000)
  assert.deepEqual([...vus.entries()], [['a1', 1000], ['a3', 1000]])
  majVus(vus, [{ id: 'a1', status: 'running' }], 5000)
  assert.equal(vus.get('a1'), 1000)
})

test('lignes : durée d un actif depuis sa première vue', () => {
  const vus = new Map([['a1', 1000]])
  const agents = [{ id: 'a1', type: 'doctrine:executant', description: 'X', status: 'running' }]
  const { actifs } = lignes(agents, vus, 6000)
  assert.deepEqual(actifs, [{ id: 'a1', type: 'doctrine:executant', mission: 'X', duree: '5 s', ms: 5000 }])
})

test('lignes : chaque actif porte ms = now - vu', () => {
  const vus = new Map([['a1', 1000]])
  const agents = [{ id: 'a1', type: 't', status: 'running' }]
  const { actifs } = lignes(agents, vus, 6000)
  assert.equal(typeof actifs[0].ms, 'number')
  assert.equal(actifs[0].ms, 5000)
})

test('formatChrono', () => {
  assert.equal(formatChrono(0), '0:00')
  assert.equal(formatChrono(24000), '0:24')
  assert.equal(formatChrono(192000), '3:12')
  assert.equal(formatChrono(3725000), '1:02:05')
})

test('compteurs : enCours = actifs, termines = completed, echecs = failed', () => {
  const agents = [
    { id: 'a1', status: 'running' },
    { id: 'a2', status: 'pending' },
    { id: 'c1', status: 'completed' },
    { id: 'c2', status: 'completed' },
    { id: 'f1', status: 'failed' },
    { id: 'k1', status: 'killed' },
  ]
  assert.deepEqual(compteurs(agents), { enCours: 2, termines: 2, echecs: 1 })
})

test('lignes : mission = name si description absente, sinon "(sans mission)"', () => {
  const vus = new Map()
  const agents = [
    { id: 'a1', type: 't', status: 'running', name: 'nom' },
    { id: 'a2', type: 't', status: 'running' },
  ]
  const { actifs } = lignes(agents, vus, 0)
  assert.equal(actifs[0].mission, 'nom')
  assert.equal(actifs[1].mission, '(sans mission)')
})

test('lignes : 7 terminés → 5 récents, le premier est le dernier de la liste ; failed → échec', () => {
  const agents = []
  for (let i = 1; i <= 7; i++) {
    agents.push({ id: 'c' + i, type: 't', description: 'm' + i, status: 'completed' })
  }
  agents[2].status = 'failed'
  const { recents } = lignes(agents, new Map(), 0)
  assert.equal(recents.length, 5)
  assert.equal(recents[0].id, 'c7')
  assert.equal(recents[4].id, 'c3')
  assert.equal(recents[4].statut, 'échec')
  assert.equal(recents[0].statut, 'terminé')
})

test('ACTIFS', () => {
  assert.deepEqual(ACTIFS, ['pending', 'running', 'waiting', 'idle'])
})
