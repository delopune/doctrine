# doctrine — un plugin Claude Code

Un chef d'orchestre (Opus) qui décide et ne code pas, des exécutants (Haiku) qui codent, des garde-fous qui le rendent vrai, et un panneau qui montre qui travaille.

## Ce qu'il contient

| Pièce | Fichier | Rôle |
|---|---|---|
| Doctrine | `doctrine.md` | Injectée au démarrage de chaque session (hook `SessionStart`) |
| Garde-fou | `hooks/garde.cjs` | Refuse au chef : écrire du code, lire un fichier de code de plus de 300 lignes, lancer un agent hors liste. Les sous-agents passent toujours |
| Exécutant | `agents/executant.md` | Haiku, le seul qui code. Mission courte, test d'abord, remonte toute question |
| Lecteur | `agents/lecteur.md` | Haiku, lecture seule, compte rendu sourcé `fichier:ligne` |
| Panneau | `hooks/panneau.mjs` | Mod : liste les sous-agents en cours (type, mission, durée) et les 5 derniers. S'ouvre tout seul, ou avec `/sous-agents` |
| Brancher un projet | `skills/brancher-projet/` | Déclare les plugins du projet et installe ses skills via `npx skills` |

## Installer sur un poste

Dans une session Claude Code :

```
/plugin marketplace add delopune/doctrine
```

```
/plugin install doctrine@delopune
```

Puis redémarrer la session. Dans chaque projet, au cadrage : `/doctrine:brancher-projet`.

## Désactiver le garde-fou

Variable d'environnement `DOCTRINE_GARDE=off` avant de lancer Claude, ou désactiver le plugin dans `/plugin`. Le chef ne peut pas le faire seul.

## Tests

```
node --test hooks/garde.test.cjs hooks/lignes.test.mjs
```

```
claude plugin validate . --strict
```
