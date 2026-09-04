# MonApp

Application web de lecture des fiches **Markdown** rangées sur Google Drive.
Un accueil en nid d'abeille — un hexagone par sous-dossier — puis la liste des
fiches, puis la fiche.

Installable sur téléphone (PWA). Elle s'ouvre sur les fiches qu'elle a déjà
lues — donc sans réseau — et va chercher du frais en arrière-plan. La date des
fiches affichées est toujours indiquée.

**Ce fichier est le seul suivi du projet** : mise en route, décisions et leurs
raisons, pièges, limites connues, phases faites et à venir. Il n'y a pas de
second document ailleurs — deux suivis, et l'un des deux devient faux.

---

## ⚠️ Ce dépôt est PUBLIC — aucun secret n'y entre

**Ne jamais commiter de clé API Google.** L'application n'en a pas besoin :
l'authentification OAuth suffit pour lire Drive. Une clé API est utilisable par
quiconque la lit, et un secret retiré d'un fichier **reste dans l'historique
git pour toujours**.

Ce qui est public par nature, et donc sans risque :

- **l'ID client OAuth** — il figure dans toute application web Google, il est
  visible dans les requêtes du navigateur, et il ne donne rien seul : ce sont
  les **origines autorisées** déclarées dans la console Google qui protègent ;
- la portée demandée, **`drive.readonly`** — lecture seule. Une application
  compromise ne pourrait ni modifier ni supprimer quoi que ce soit sur Drive.

**L'ID client n'est pas dans le code.** Il est saisi dans les Réglages de
l'application et rangé dans le `localStorage` du navigateur : il ne quitte
jamais l'appareil et n'entre pas dans le dépôt. Garder cette séparation.

Prudence aussi avec les **identifiants de dossiers Drive** : ce ne sont pas des
secrets, mais ils renseignent sur une organisation privée. Le dossier racine
est désigné par son **nom** (`MonApp`), résolu à l'exécution — c'est voulu.

---

## Mise en route

1. Dans la [console Google Cloud](https://console.cloud.google.com/), créer un
   **ID client OAuth** de type « Application Web », activer l'**API Drive**, et
   déclarer l'origine autorisée : `https://<compte>.github.io`.
2. Ouvrir l'application, aller dans **Réglages**, coller l'ID client et le nom
   du dossier racine.
3. Se connecter. L'application lit l'arborescence et affiche un hexagone par
   sous-dossier.

## Organisation sur Drive

```
MonApp/              ← dossier racine (nom réglable)
├── Recettes/        ← un hexagone
│   └── pain.md
└── Plantes/         ← un hexagone
    └── basilic.md
```

## Format d'une fiche

Un fichier `.md` avec un frontmatter YAML. Le champ **`type:`** commande
l'affichage : une recette montre ses macros, une plante son arrosage.

```markdown
---
titre: Pain au levain
type: recette
portions: 4
temps_preparation: 30
temps_cuisson: 45
kcal_portion: 240
proteines_g: 8
glucides_g: 44
lipides_g: 2
tags: [pain, levain]
---

Le corps de la fiche, en Markdown.
```

Champs lus : `titre` ou `nom`, `type`, `tags`,
`portions`, `temps_preparation`, `temps_cuisson`,
`kcal_portion`, `proteines_g`, `glucides_g`, `lipides_g`,
`nom_botanique`, `arrosage_jours`, `confiance_identification`.

Un champ absent n'est pas affiché ; un type inconnu retombe sur l'affichage
simple.

---

## Technique

**Aucun build, aucune dépendance npm.** Tout est statique et se lit tel quel.

| Fichier | Rôle |
|---|---|
| `index.html` | l'application entière — HTML, CSS et JS |
| `manifest.json` | rend l'application installable |
| `sw.js` | service worker : installabilité et hors ligne |
| `icon-192.png` · `icon-512.png` | icônes, `any maskable` |

Chargés depuis un CDN : `marked` (rendu Markdown) et le client Google Identity
Services.

### Déploiement

GitHub Pages, branche `main`, racine — servi sous
`https://<compte>.github.io/monapp/`.

**Tous les chemins sont relatifs (`./`), et ils doivent le rester** : le site
n'est pas à la racine du domaine, un chemin absolu sortirait de la portée de
l'application et casserait l'installation.

### Deux mémoires, deux responsables

**Le service worker garde la coquille** : la page, le manifeste, les icônes.
Réseau d'abord, cache en secours — un déploiement est donc visible au
chargement suivant, pas à celui d'après. Il **n'intercepte rien** de ce qui
vient de Google.

**L'application garde les fiches**, elle, dans le stockage local
(`hbr_fiches`). Elle s'ouvre donc pleine et sans réseau, puis va chercher du
frais en arrière-plan si la connexion silencieuse aboutit.

La règle qui rend ce cache acceptable : **les fiches sont datées et la date
s'affiche**. « Fiches du 4 septembre à 21:15 », ou « Hors connexion — fiches
du … » quand la reconnexion échoue. Un cache qui se tait est un cache qui
ment ; celui-ci dit toujours de quand il date, et « Recharger les fiches »
reste le geste qui rafraîchit.

Au-delà de 3 Mo, rien n'est mémorisé : le stockage refuserait de toute façon.

Après modification de `sw.js`, incrémenter `VERSION` — sinon les anciens
fichiers restent en cache.

### Refaire les icônes

Hexagone **pointe en haut** — la même forme que le nid d'abeille de l'accueil :
mousse `#3f7357` sur fond `#16211c`, petit hexagone `#f7f8f4` au centre.

Leurs sommets tiennent dans un rayon de **0,38** du côté, à l'intérieur de la
zone sûre de 0,40 des icônes `maskable` : sans cette marge, Android rogne les
pointes au découpage.

---

## Pièges vérifiés à la dure

Ceux qui ont coûté du temps. À relire avant de rouvrir le code.

**Une collision de cascade CSS** — le panneau des réglages ne pouvait pas se
fermer. `.hidden{display:none}` était déclaré **avant** `.sheet{display:flex}`.
Même spécificité → la dernière déclaration gagne, donc `.hidden` ne cachait
rien. Corrigé en déplaçant `.hidden` en **fin** de feuille, pas avec un
`!important` — qui aurait masqué le vrai problème et gêné la suite.

**Le service worker n'est pas optionnel.** Chrome n'offre l'installation que si
un service worker répond aux requêtes ; le manifeste seul ne suffit pas.

**`skipWaiting()` est nécessaire.** Sans lui, un service worker neuf attend la
fermeture de tous les onglets avant de prendre la main : une correction
déployée resterait invisible pendant des jours sur un téléphone qui ne ferme
jamais rien.

**Côté console Google**, deux erreurs rencontrées et leur cause :

| Erreur | Cause |
|---|---|
| `401 invalid_client` · `no registered origin` | l'origine `https://<compte>.github.io` n'était pas déclarée |
| `403 access_denied` | le compte n'était pas inscrit comme utilisateur test de l'application OAuth |

---

## Limites connues

Écrites plutôt que passées sous silence. Aucune ne gêne aujourd'hui.

- **Le jeton Google dure environ 1 h.** L'application ne le renouvelle pas en
  cours de session : au-delà, il faut recharger.
- **Seuls les enfants directs d'un thème sont lus.** Une fiche rangée dans un
  sous-sous-dossier reste invisible.
- **La reconnexion silencieuse n'a pas été éprouvée sur un vrai compte Google.**
  Elle est écrite, pas testée.
- Pas de recherche, pas de tri, pas d'édition. Lecture seule, par choix.

---

## Phases du projet

### Phase 1 — lire Drive · *faite le 2 septembre 2026*

`index.html` seul, en un commit. L'application lit l'arborescence, affiche un
hexagone par thème et rend les fiches. Elle n'est ni installable, ni
consultable hors ligne, et redemande la connexion à chaque ouverture.

### Phase 2 — en faire une application · *faite le 4 septembre 2026*

Sept commits. Trois acquis :

- **installable** — manifeste, icônes `maskable`, service worker ;
- **utilisable hors ligne** — la coquille et les fiches, ces dernières datées ;
- **la connexion tient** — reconnexion silencieuse, plus de bouton à chaque
  ouverture.

Avec, au passage, la collision de cascade qui empêchait toute fermeture du
panneau des réglages, et un README qui affirmait encore que les fiches sont
toujours relues sur Drive — devenu faux une heure plus tôt. **Une phrase d'état
se périme comme n'importe quelle donnée.**

### Phase 3 — confort de lecture · *à venir*

- renouveler le jeton en cours de session, ou dire clairement qu'il a expiré ;
- descendre dans les sous-sous-dossiers ;
- recherche et filtre par `tags` — la donnée est déjà lue, rien n'est affiché ;
- vérifier la reconnexion silencieuse sur le téléphone.

### Phase 4 — pas décidée

Édition des fiches depuis l'application (elle demanderait une portée Drive en
écriture, donc un vrai arbitrage de sécurité), ou ouverture à d'autres
utilisateurs (l'application OAuth devrait sortir du cercle des testeurs).

Rien de tout cela n'est engagé.
