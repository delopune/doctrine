export const ACTIFS = ['pending', 'running', 'waiting', 'idle']

// ponytail: elapsed time counts from the first poll that saw the agent (±1 s); use a spawn timestamp if the API ever exposes one
export function majVus(vus, agents, now) {
  for (const a of agents) {
    if (ACTIFS.includes(a.status) && !vus.has(a.id)) vus.set(a.id, now)
  }
}

function deuxChiffres(n) {
  return n < 10 ? '0' + n : String(n)
}

export function formatDuree(ms) {
  const s = Math.max(0, Math.floor(ms / 1000))
  if (s < 60) return s + ' s'
  if (s < 3600) return Math.floor(s / 60) + ' min ' + deuxChiffres(s % 60) + ' s'
  return Math.floor(s / 3600) + ' h ' + deuxChiffres(Math.floor((s % 3600) / 60)) + ' min'
}

export function formatChrono(ms) {
  const s = Math.max(0, Math.floor(ms / 1000))
  if (s < 3600) return Math.floor(s / 60) + ':' + deuxChiffres(s % 60)
  return Math.floor(s / 3600) + ':' + deuxChiffres(Math.floor((s % 3600) / 60)) + ':' + deuxChiffres(s % 60)
}

export function compteurs(agents) {
  return {
    enCours: agents.filter(a => ACTIFS.includes(a.status)).length,
    termines: agents.filter(a => a.status === 'completed').length,
    echecs: agents.filter(a => a.status === 'failed').length,
  }
}

const STATUTS = { completed: 'terminé', failed: 'échec', killed: 'arrêté' }

export function lignes(agents, vus, now) {
  const actifs = agents
    .filter(a => ACTIFS.includes(a.status))
    .map(a => ({
      id: a.id,
      type: a.type,
      mission: a.description || a.name || '(sans mission)',
      duree: formatDuree(now - (vus.get(a.id) ?? now)),
      ms: now - (vus.get(a.id) ?? now),
    }))
  const recents = agents
    .filter(a => !ACTIFS.includes(a.status))
    .slice(-5)
    .reverse()
    .map(a => ({
      id: a.id,
      type: a.type,
      mission: a.description || a.name || '(sans mission)',
      statut: STATUTS[a.status] ?? a.status,
    }))
  return { actifs, recents }
}
