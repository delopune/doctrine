import { majVus, lignes } from './lignes.mjs'

const PANE = 'sous-agents'
const vus = new Map()
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

  on('ui.render', { component: 'Pane' }, async ($, e, next) => {
    if (e.requestId !== PANE) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    const now = await $.clock.now()
    const { actifs, recents } = lignes(agents, vus, now)
    const enfants = [Text({ key: 'titre', bold: true, children: [actifs.length + ' en cours'] })]
    if (actifs.length === 0) {
      enfants.push(Text({ key: 'vide', dimColor: true, children: ['Aucun sous-agent en cours.'] }))
    } else {
      for (const a of actifs) {
        enfants.push(Text({ key: 'a-' + a.id, children: ['● ' + a.type + ' — ' + a.mission + ' — ' + a.duree] }))
      }
    }
    if (recents.length > 0) {
      enfants.push(Text({ key: 'sep', children: [' '] }))
      enfants.push(Text({ key: 'recents', dimColor: true, children: ['Récents :'] }))
      for (const r of recents) {
        enfants.push(Text({ key: 'r-' + r.id, dimColor: true, children: ['○ ' + r.type + ' — ' + r.mission + ' — ' + r.statut] }))
      }
    }
    return Box({ flexDirection: 'column', children: enfants })
  })
}
