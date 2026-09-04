# MonApp

Application web de lecture des fiches **Markdown** rangées sur Google Drive.
Un accueil en nid d'abeille — un hexagone par sous-dossier — puis la liste des
fiches, puis la fiche.

Installable sur téléphone (PWA), consultable hors ligne pour la coquille de
l'application. Les fiches, elles, sont toujours relues sur Drive.

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
