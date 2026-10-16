import { test } from 'node:test'
import assert from 'node:assert/strict'
import { phaseAvant, estTest, echoue, etapeDe } from './phases.mjs'

test('phaseAvant : Edit, Write, NotebookEdit → code', () => {
  assert.equal(phaseAvant({ tool: 'Edit' }), 'code')
  assert.equal(phaseAvant({ tool: 'Write' }), 'code')
  assert.equal(phaseAvant({ tool: 'NotebookEdit' }), 'code')
})

test('phaseAvant : Bash qui lance des tests → test', () => {
  const commandes = [
    'node --test x.test.mjs',
    'npm test',
    'npm run test',
    'pytest -q',
    'python -m pytest',
    'python -m unittest',
    'npx vitest run',
    'npx jest',
    'go test ./...',
    'cargo test',
    'python verifier.py',
  ]
  for (const command of commandes) {
    assert.equal(phaseAvant({ tool: 'Bash', command }), 'test', command)
  }
})

test('phaseAvant : autres outils et commandes → null', () => {
  assert.equal(phaseAvant({ tool: 'Bash', command: 'ls -la' }), null)
  assert.equal(phaseAvant({ tool: 'Read' }), null)
})

test('echoue : détecte un échec', () => {
  assert.equal(echoue({ isError: true, text: '' }), true)
  assert.equal(echoue({ text: 'Exit code 1' }), true)
  assert.equal(echoue({ text: '# pass 3\n# fail 2' }), true)
  assert.equal(echoue({ text: 'FAILED tests/a.py' }), true)
  assert.equal(echoue({ text: 'Traceback (most recent call last)' }), true)
})

test('echoue : pas d échec → false', () => {
  assert.equal(echoue({ text: '# pass 3\n# fail 0' }), false)
  assert.equal(echoue({ text: 'Exit code 0' }), false)
  assert.equal(echoue(undefined), false)
})

test('etapeDe : annonce ETAPE n/total titre', () => {
  assert.deepEqual(etapeDe('echo "ETAPE 2/5 Écrire le test"'), { n: 2, total: 5, titre: 'Écrire le test' })
  assert.deepEqual(etapeDe("echo 'ETAPE 1/3 Lire'"), { n: 1, total: 3, titre: 'Lire' })
  assert.deepEqual(etapeDe('echo ETAPE 4/4'), { n: 4, total: 4, titre: '' })
})

test('etapeDe : hors annonce ou hors bornes → null', () => {
  assert.equal(etapeDe('ls -la'), null)
  assert.equal(etapeDe(undefined), null)
  assert.equal(etapeDe('echo "ETAPE 0/5 x"'), null)
  assert.equal(etapeDe('echo "ETAPE 6/5 x"'), null)
})

test('estTest : une annonce d étape n est jamais un test', () => {
  assert.equal(estTest('echo "ETAPE 2/5 Lancer le test"'), false)
})
