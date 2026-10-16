// Lecture de feuille-de-route.md et calcul de l'état affiché (bibliothèque pure).

const RE_CHAPITRE = /^##\s+(\d+)\.\s+(.+?)\s*$/;
const RE_SOUS_ETAPE = /^\s*-\s+\[( |x|X)\]\s+(\d+\.\d+)\s+(.+?)\s*$/;
const RE_ETAPE_MISSION = /^\s*\[(\d+(?:\.\d+)?)\]/;

export function parseRoute(texte) {
  if (typeof texte !== 'string') return [];
  const chapitres = [];
  let courant = null;
  for (const ligne of texte.split(/\r?\n/)) {
    const c = RE_CHAPITRE.exec(ligne);
    if (c) {
      courant = { id: c[1], titre: c[2], sous: [] };
      chapitres.push(courant);
      continue;
    }
    const s = RE_SOUS_ETAPE.exec(ligne);
    if (s && courant) {
      courant.sous.push({ id: s[2], titre: s[3], fait: s[1] !== ' ' });
    }
  }
  return chapitres;
}

export function etapeDeMission(description) {
  if (typeof description !== 'string') return null;
  const m = RE_ETAPE_MISSION.exec(description);
  return m ? m[1] : null;
}

export function couleurDominante(phases) {
  if (!Array.isArray(phases) || phases.length === 0) return null;
  if (phases.includes('code')) return 'code';
  if (phases.includes('echec')) return 'echec';
  return 'test';
}

export function modeleRoute(chapitres, actifs) {
  const parEtape = new Map();
  for (const a of actifs || []) {
    if (String(a.type).includes('lecteur')) continue;
    const id = etapeDeMission(a.mission);
    if (id === null) continue;
    if (!parEtape.has(id)) parEtape.set(id, []);
    parEtape.get(id).push(a.phase);
  }

  let globalNb = 0;
  let globalNbFait = 0;
  const segments = [];

  const chapitresModele = chapitres.map((chap) => {
    const phasesChapitre = [];
    const sous = chap.sous.map((s) => {
      const phase = couleurDominante(parEtape.get(s.id) || []);
      const fait = s.fait && phase === null;
      if (phase !== null) phasesChapitre.push(phase);
      segments.push(fait ? 'fait' : (phase !== null ? phase : 'afaire'));
      return { id: s.id, titre: s.titre, phase, fait };
    });
    phasesChapitre.push(...(parEtape.get(chap.id) || []));
    const phase = couleurDominante(phasesChapitre);
    const nb = sous.length;
    const nbFait = sous.filter((s) => s.fait).length;
    globalNb += nb;
    globalNbFait += nbFait;
    return {
      id: chap.id,
      titre: chap.titre,
      phase,
      fait: nb > 0 && nbFait === nb && phase === null,
      nbFait,
      nb,
      sous,
    };
  });

  return {
    chapitres: chapitresModele,
    global: {
      nbFait: globalNbFait,
      nb: globalNb,
      pourcent: globalNb ? Math.round((globalNbFait / globalNb) * 100) : 0,
      segments,
    },
  };
}
