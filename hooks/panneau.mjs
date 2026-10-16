import { majVus, lignes, compteurs } from './lignes.mjs'
import { svgTableau, libelleType, stylePhase, couleurChrono, texteEtape } from './dessin.mjs'
import { phaseAvant, echoue, etapeDe } from './phases.mjs'

const PANE = 'sous-agents'
const vus = new Map()
const phases = new Map()
const etapes = new Map()
let agents = []
let timer = null
let avaitDesActifs = false

async function tick($) {
  agents = await $.agent.list()
  const now = await $.clock.now()
  majVus(vus, agents, now)
  const { actifs } = lignes(agents, vus, now)
  if (actifs.length > 0 && !avaitDesActifs) {
    const ouverts = await $.ui.panes()
    if (!ouverts.some(p => p.id === PANE)) await $.ui.open({ id: PANE, title: 'Sous-agents' })
  }
  avaitDesActifs = actifs.length > 0
  $.ui.invalidate('ui.render')
}

export function register(on) {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'sous-agents', description: 'Ouvrir le panneau des sous-agents' })
    if (timer) timer.cancel()
    timer = $.clock.every(1000, () => { tick($).catch(() => {}) })
    return next(e)
  })

  on('command.run', { command: 'sous-agents' }, async ($) => {
    await $.ui.open({ id: PANE, title: 'Sous-agents', closeOnEscape: true })
    return {}
  })

  on('tool.call', async ($, e, next) => {
    let p = null
    try {
      if (e.agentId) p = phaseAvant(e)
      if (p) { phases.set(e.agentId, p); $.ui.invalidate('ui.render') }
      if (e.agentId && e.tool === 'Bash') { const et = etapeDe(e.command); if (et) { etapes.set(e.agentId, et); $.ui.invalidate('ui.render') } }
    } catch (err) { p = null }
    const r = await next(e)
    try {
      if (p === 'test' && echoue(r)) { phases.set(e.agentId, 'echec'); $.ui.invalidate('ui.render') }
    } catch (err) {}
    return r
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Pane' }, async ($, e, next) => {
    if (e.requestId !== PANE) return next(e)
    const now = await $.clock.now()
    const { actifs, recents } = lignes(agents, vus, now, phases, etapes)
    const c = compteurs(agents)
    if (e.surface !== 'terminal') {
      const { Svg } = $.ui.resolve(e)
      return Svg({ key: 'tableau', source: svgTableau({ actifs, recents, compteurs: c }), alt: c.enCours + ' sous-agents en cours' })
    }
    const { Box, Text } = $.ui.resolve(e)
    const enfants = [Text({ key: 'titre', bold: true, children: [c.enCours + ' en cours'] })]
    if (actifs.length === 0) {
      enfants.push(Text({ key: 'vide', dimColor: true, children: ['Aucun sous-agent en cours.'] }))
    } else {
      for (const a of actifs) {
        const style = stylePhase(a.phase)
        enfants.push(Box({ key: 'a-' + a.id, borderStyle: 'round', flexDirection: 'column', children: [
          Text({ key: 't', color: style.couleurLibelle, bold: true, children: [libelleType(a.type) + ' · ' + style.nom] }),
          Text({ key: 'm', children: [a.mission] }),
          Text({ key: 'e', color: style.couleurLibelle, children: [texteEtape(a.etape)] }),
          Text({ key: 'd', color: couleurChrono(a.ms), children: ['⏱ ' + a.duree] }),
        ] }))
      }
    }
    if (recents.length > 0) {
      enfants.push(Text({ key: 'sep', children: [' '] }))
      enfants.push(Text({ key: 'recents', dimColor: true, children: ['Récents :'] }))
      for (const r of recents) {
        const props = { key: 'r-' + r.id, dimColor: true, children: ['○ ' + r.type + ' — ' + r.mission + ' — ' + r.statut] }
        if (r.statut === 'échec') props.color = '#E24B4A'
        enfants.push(Text(props))
      }
    }
    return Box({ flexDirection: 'column', children: enfants })
  })
}
