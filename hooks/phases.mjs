export function phaseAvant(e) {
  if (e.tool === 'Edit' || e.tool === 'Write' || e.tool === 'NotebookEdit') return 'code'
  if (e.tool === 'Bash' && estTest(e.command)) return 'test'
  return null
}

// ponytail: test detection by command pattern; add a pattern when a project uses another runner
export function estTest(commande) {
  return /(node\s+--test|npm\s+(run\s+)?test|pnpm\s+test|yarn\s+test|pytest|-m\s+unittest|vitest|jest|go\s+test|cargo\s+test|verifier\.py|plugin\s+test)/.test(String(commande ?? ''))
}

export function echoue(r) {
  if (typeof r !== 'object' || r === null) return false
  if (r.isError === true) return true
  return typeof r.text === 'string' &&
    /exit code [1-9]|# fail [1-9]|\bFAILED\b|AssertionError|Traceback \(most recent call last\)/i.test(r.text)
}
