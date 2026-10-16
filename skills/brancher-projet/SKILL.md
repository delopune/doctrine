---
name: brancher-projet
description: Brancher un projet sur la doctrine — déclare le plugin doctrine et superpowers dans `.claude/settings.json`, puis installe dans le projet les skills choisis pour lui (mattpocock/skills, ponytail, et ceux que le projet demande) via `npx skills`. Utiliser au cadrage de tout nouveau projet, quand l'utilisateur dit « branche ce projet », ou quand un projet n'a pas de `skills-lock.json`.
---

# Brancher un projet

Deux étages, pour deux raisons :
- **Plugins** (déclarés dans `.claude/settings.json`) pour ce qui a besoin de hooks : `doctrine` (garde-fou, agents, panneau) et `superpowers`. Une session ouverte sur ce dépôt, sur un autre poste ou dans le cloud, les installe toute seule.
- **Skills copiés dans le projet** (`.claude/skills/`, commités) pour le reste, choisis projet par projet. Ils voyagent avec le dépôt.

## 1. Regarder avant d'écrire

- Racine du projet : `git rev-parse --show-toplevel`. Pas un dépôt git ? Dis-le et propose `git init` ; ne continue pas sans réponse.
- Lis `.claude/settings.json` et `skills-lock.json` s'ils existent. **Ne les écrase jamais.**
- Branche `doc/brancher-doctrine`.

## 2. Déclarer les plugins

Fusionne ces clés avec l'existant (garde toutes les autres clés et entrées) :

```json
{
  "extraKnownMarketplaces": {
    "delopune": { "source": { "source": "github", "repo": "delopune/doctrine" } }
  },
  "enabledPlugins": {
    "doctrine@delopune": true,
    "superpowers@claude-plugins-official": true,
    "context7@claude-plugins-official": true
  }
}
```

Une entrée déjà présente avec une **autre valeur** : ne la change pas, signale-la et demande.
Vérifie le JSON : `node -e "JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8'))"`.

## 3. Choisir les skills du projet

Propose à l'utilisateur une liste courte, **chaque skill avec sa raison** :
- **Socle, toujours proposé** : `mattpocock/skills` (le déroulé spec → tickets → revue) et `DietrichGebert/ponytail` (le minimum qui marche).
- **Selon le projet** : cherche sur skills.sh (`npx skills find <mot-clé>`) ce qui colle au besoin (framework, domaine). Pour un dépôt inconnu, liste d'abord son contenu avec `--list` et lis les `SKILL.md` avant de les proposer : un skill s'exécute avec tous les droits de l'agent.

**Attends la validation.** N'installe rien de non validé.

## 4. Installer

Pour chaque source validée, à la racine du projet, télémétrie coupée :

```bash
DISABLE_TELEMETRY=1 npx -y skills@1.7.2 add <owner/repo> -a claude-code -s '*' -y --copy
```

- `--copy` : de vraies copies, pas des liens symboliques. Elles doivent survivre au commit et au clonage dans le cloud.
- Pour ne prendre que certains skills : `-s nom1 -s nom2` au lieu de `'*'`.
- Sous PowerShell, la variable se pose avant : `$env:DISABLE_TELEMETRY='1'; npx -y skills@1.7.2 add ...`

Vérifie : `.claude/skills/` contient les dossiers attendus, et `skills-lock.json` les liste.

## 5. Commiter

1. Relis `git diff --stat`. Rien d'autre que `.claude/settings.json`, `.claude/skills/` et `skills-lock.json` ne doit partir.
2. Commit `Brancher le projet sur la doctrine`, fusion `--no-ff`, push.
3. Dis en une ligne ce qui a été ajouté et ce qui existait déjà.

Mise à jour plus tard : `DISABLE_TELEMETRY=1 npx -y skills@1.7.2 update -p -y`.
⚠️ `.claude/settings.json` est partagé (commité), pas `settings.local.json` : jamais de secret ni d'information personnelle.
