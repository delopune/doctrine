// garde.cjs : hook PreToolUse de la doctrine. Empêche la session principale d'écrire du code,
// de lire de gros fichiers de code, ou de lancer des types d'agents non autorisés.
// Les sous-agents (agent_id présent) ne sont jamais bloqués.
const fs = require('fs');
const path = require('path');

const CODE_EXT = new Set([
  '.py', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.go', '.rs', '.java', '.kt', '.cs',
  '.cpp', '.cc', '.c', '.h', '.hpp', '.rb', '.php', '.swift', '.sh', '.ps1', '.bat', '.css',
  '.scss', '.sass', '.less', '.html', '.htm', '.vue', '.svelte', '.sql', '.lua', '.dart', '.r',
]);
const AGENTS_AUTORISES = new Set([
  'doctrine:executant', 'doctrine:lecteur', 'Explore', 'Plan', 'claude-code-guide', 'statusline-setup',
]);
const LIMITE_LIGNES = 300;

function estCode(chemin) {
  return typeof chemin === 'string' && CODE_EXT.has(path.extname(chemin).toLowerCase());
}

// Renvoie null (laisser passer) ou le message de refus.
function decide(input, env, countLines) {
  if (env && env.DOCTRINE_GARDE === 'off') return null;
  if (typeof input.agent_id === 'string' && input.agent_id !== '') return null;

  const outil = input.tool_name;
  const ti = input.tool_input || {};

  if (outil === 'Edit' || outil === 'Write' || outil === 'NotebookEdit') {
    const chemin = ti.file_path || ti.notebook_path;
    if (estCode(chemin)) {
      return `Doctrine : le chef d'orchestre n'écrit pas de code (${chemin}). Confie une mission à doctrine:executant.`;
    }
    return null;
  }

  if (outil === 'Read') {
    const chemin = ti.file_path;
    if (!estCode(chemin)) return null;
    if (typeof ti.limit === 'number' && ti.limit <= LIMITE_LIGNES) return null;
    const n = typeof countLines === 'function' ? countLines(chemin) : null;
    if (typeof n !== 'number' || n <= LIMITE_LIGNES) return null;
    return `Doctrine : ${chemin} fait ${n} lignes. Confie la lecture à doctrine:lecteur, ou lis une plage précise (limit ≤ 300). Au 3e échec du lecteur, demande à l'utilisateur.`;
  }

  if (outil === 'Agent' || outil === 'Task') {
    const type = ti.subagent_type;
    if (typeof type === 'string' && AGENTS_AUTORISES.has(type)) return null;
    return `Doctrine : type d'agent « ${type || 'general-purpose'} » refusé. Utilise doctrine:executant pour coder, doctrine:lecteur pour lire (ou Explore / Plan).`;
  }

  return null;
}

function compteurReel(chemin) {
  try {
    const contenu = fs.readFileSync(chemin, 'utf8');
    return (contenu.match(/\n/g) || []).length + 1;
  } catch (e) {
    return null;
  }
}

module.exports = { decide };

if (require.main === module) {
  let brut = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (morceau) => { brut += morceau; });
  process.stdin.on('end', () => {
    // ponytail: fail open on bad input so a broken hook never blocks every tool; tighten if it gets abused
    let input;
    try {
      input = JSON.parse(brut);
    } catch (e) {
      process.exit(0);
    }
    if (!input || typeof input !== 'object') process.exit(0);

    const message = decide(input, process.env, compteurReel);
    if (!message) process.exit(0);

    const sortie = {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: message,
      },
    };
    // Sortie après écriture complète : évite la troncature de stdout sur pipe Windows.
    process.stdout.write(JSON.stringify(sortie), () => process.exit(0));
  });
}
