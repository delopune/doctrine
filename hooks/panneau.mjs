import { majVus, lignes, compteurs } from './lignes.mjs'
import { svgTableau, libelleType, stylePhase, couleurChrono, texteEtape } from './dessin.mjs'
import { phaseAvant, echoue, etapeDe } from './phases.mjs'
import { parseRoute, modeleRoute } from './route.mjs'
import { svgGlobal, svgChapitre, svgSousEtape, COULEURS } from './dessinRoute.mjs'
import { svgScene, cleScene } from './scene.mjs'

const PANE = 'sous-agents'
const vus = new Map()
const phases = new Map()
const etapes = new Map()
let agents = []
let timer = null
let avaitDesActifs = false
let routeTexte = null
let cleCourante = null
let sourceScene = ''
const ouverts = new Set()
let masquer = false
// ponytail: sub-step indent in px, tune it on screen if the rows do not line up under the chapter bars
const DECALAGE = 72

async function tick($) {
  try { routeTexte = await $.fs.read('feuille-de-route.md') } catch (err) { routeTexte = null }
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

function enteteRoute($, route, ui, terminal) {
  const { Box, Button, Svg, Text } = ui
  const enfants = []
  if (terminal) {
    enfants.push(Text({ key: 'route-global', bold: true, children: [route.global.nbFait + '/' + route.global.nb + ' livrées · ' + route.global.pourcent + ' %'] }))
  } else {
    enfants.push(Svg({ key: 'route-global', source: svgGlobal(route.global), alt: route.global.nbFait + ' sur ' + route.global.nb + ' étapes livrées' }))
  }
  enfants.push(Button({ key: 'route-masquer', label: masquer ? 'Afficher les étapes livrées' : 'Masquer les étapes livrées', onPress: async () => { masquer = !masquer; $.ui.invalidate('ui.render'); await $.store.set('masquer', masquer) } }))
  for (const ch of route.chapitres) {
    if (masquer && ch.fait) continue
    const couleur = ch.phase ? COULEURS[ch.phase] : undefined
    const titreCh = terminal
      ? Text({ key: 'c-' + ch.id, bold: true, color: couleur, dimColor: ch.fait, children: [(ch.fait ? '✓ ' : '') + ch.id + '. ' + ch.titre + '  ' + ch.nbFait + '/' + ch.nb] })
      : Svg({ key: 'c-' + ch.id, source: svgChapitre(ch), alt: ch.id + '. ' + ch.titre })
    enfants.push(Box({ key: 'ch-' + ch.id, flexDirection: 'row', alignItems: 'center', gap: 1, children: [
      Button({ key: 'b-' + ch.id, plain: true, label:ouverts.has(ch.id) ? '▾' : '▸', onPress: () => { if (ouverts.has(ch.id)) ouverts.delete(ch.id); else ouverts.add(ch.id); $.ui.invalidate('ui.render') } }),
      titreCh,
    ] }))
    if (!ouverts.has(ch.id)) continue
    for (const se of ch.sous) {
      if (masquer && se.fait) continue
      const couleurSe = se.phase ? COULEURS[se.phase] : undefined
      enfants.push(terminal
        ? Text({ key: 's-' + se.id, color: couleurSe, dimColor: se.fait, children: ['    ' + (se.fait ? '✓ ' : '• ') + se.id + ' ' + se.titre] })
        : Svg({ key: 's-' + se.id, source: svgSousEtape(se, 286, DECALAGE), alt: se.id + ' ' + se.titre }))
    }
  }
  return Box({ flexDirection: 'column', children: enfants })
}

export function register(on) {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'sous-agents', description: 'Ouvrir le panneau des sous-agents' })
    if (timer) timer.cancel()
    timer = $.clock.every(1000, () => { tick($).catch(() => {}) })
    const m = await $.store.get('masquer')
    masquer = m === true
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
    const route = routeTexte === null ? null : modeleRoute(parseRoute(routeTexte), actifs)
    const ui = $.ui.resolve(e)
    if (e.surface !== 'terminal') {
      const { Svg, Box } = ui
      const ancien = Svg({ key: 'tableau', source: svgTableau({ actifs, recents, compteurs: c }), alt: c.enCours + ' sous-agents en cours' })
      const k = cleScene(actifs)
      if (k !== cleCourante) { cleCourante = k; sourceScene = svgScene(actifs) }
      const scene = Svg({ key: 'scene', source: sourceScene, alt: 'Bureau des sous-agents', isInteractive: true })
      if (route === null) return Box({ flexDirection: 'column', children: [scene, ancien] })
      return Box({ flexDirection: 'column', children: [enteteRoute($, route, ui, false), scene, ancien] })
    }
    const { Box, Text } = ui
    const enfants = route === null ? [] : [enteteRoute($, route, ui, true)]
    enfants.push(Text({ key: 'titre', bold: true, children: [c.enCours + ' en cours'] }))
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
