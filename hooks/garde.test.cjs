// garde.test.cjs : tests du hook garde.cjs (node:test + node:assert)
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { decide } = require('./garde.cjs');

const noCount = () => null;
const count5000 = () => 5000;
const count50 = () => 50;

const EDIT_PY = { tool_name: 'Edit', tool_input: { file_path: 'C:/x/app.py' }, cwd: 'C:/x' };

test('a. Edit .py par la session principale -> refus', () => {
  const r = decide(EDIT_PY, {}, noCount);
  assert.ok(r, 'attendu un refus');
  assert.match(r, /doctrine:executant/);
});

test('b. Edit .py avec agent_id -> laisse passer', () => {
  const r = decide({ ...EDIT_PY, agent_id: 'x' }, {}, noCount);
  assert.strictEqual(r, null);
});

test('c. Write .md par la session principale -> laisse passer', () => {
  const r = decide({ tool_name: 'Write', tool_input: { file_path: 'C:/x/notes.md' } }, {}, noCount);
  assert.strictEqual(r, null);
});

test('d. Read .ts de 5000 lignes sans limit -> refus "5000 lignes"', () => {
  const r = decide({ tool_name: 'Read', tool_input: { file_path: 'C:/x/big.ts' } }, {}, count5000);
  assert.ok(r, 'attendu un refus');
  assert.match(r, /5000 lignes/);
});

test('e. Read .ts avec limit 100 (5000 lignes) -> laisse passer', () => {
  const r = decide({ tool_name: 'Read', tool_input: { file_path: 'C:/x/big.ts', limit: 100 } }, {}, count5000);
  assert.strictEqual(r, null);
});

test('f. Read .ts de 50 lignes -> laisse passer', () => {
  const r = decide({ tool_name: 'Read', tool_input: { file_path: 'C:/x/small.ts' } }, {}, count50);
  assert.strictEqual(r, null);
});

test('g. Read .json de 5000 lignes -> laisse passer (pas une extension de code)', () => {
  const r = decide({ tool_name: 'Read', tool_input: { file_path: 'C:/x/data.json' } }, {}, count5000);
  assert.strictEqual(r, null);
});

test('h. Agent sans subagent_type -> refus "general-purpose"', () => {
  const r = decide({ tool_name: 'Agent', tool_input: { prompt: 'fais un truc' } }, {}, noCount);
  assert.ok(r, 'attendu un refus');
  assert.match(r, /general-purpose/);
});

test('i. Agent avec subagent_type doctrine:lecteur -> laisse passer', () => {
  const r = decide({ tool_name: 'Agent', tool_input: { subagent_type: 'doctrine:lecteur' } }, {}, noCount);
  assert.strictEqual(r, null);
});

test('j. DOCTRINE_GARDE=off sur le cas a -> laisse passer', () => {
  const r = decide(EDIT_PY, { DOCTRINE_GARDE: 'off' }, noCount);
  assert.strictEqual(r, null);
});

test('k. Edit APP.PY (majuscules) -> refus', () => {
  const r = decide({ tool_name: 'Edit', tool_input: { file_path: 'C:/x/APP.PY' } }, {}, noCount);
  assert.ok(r, 'attendu un refus');
  assert.match(r, /APP\.PY/);
});

test('l. Read .ts de 5000 lignes -> message "demande à l\'utilisateur." sans le prénom', () => {
  const r = decide({ tool_name: 'Read', tool_input: { file_path: 'C:/x/big.ts' } }, {}, count5000);
  assert.ok(r, 'attendu un refus');
  assert.ok(r.includes("demande à l'utilisateur."), 'attendu « demande à l\'utilisateur. »');
  assert.ok(!r.includes('Max' + 'ime'), 'le prénom ne doit pas apparaître');
});

const GARDE = path.join(__dirname, 'garde.cjs');

test('integration : cas a via node garde.cjs -> JSON deny, code 0', () => {
  const res = spawnSync(process.execPath, [GARDE], { input: JSON.stringify(EDIT_PY), encoding: 'utf8' });
  assert.strictEqual(res.status, 0);
  const out = JSON.parse(res.stdout);
  assert.strictEqual(out.hookSpecificOutput.permissionDecision, 'deny');
  assert.strictEqual(out.hookSpecificOutput.hookEventName, 'PreToolUse');
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /doctrine:executant/);
});

test('integration : stdin non JSON via node garde.cjs -> stdout vide, code 0', () => {
  const res = spawnSync(process.execPath, [GARDE], { input: 'pas du json', encoding: 'utf8' });
  assert.strictEqual(res.status, 0);
  assert.strictEqual(res.stdout, '');
});
