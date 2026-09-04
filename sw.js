/* Service worker de MonApp.
 *
 * Il existe pour deux raisons, dans cet ordre :
 *   1. Chrome n'offre l'installation d'une PWA que si un service worker
 *      répond aux requêtes. Le manifeste seul ne suffit pas.
 *   2. La coquille de l'application (une seule page) devient consultable hors
 *      ligne, ce qui est le comportement attendu d'une application installée.
 *
 * CE QUI N'EST DÉLIBÉRÉMENT PAS MIS EN CACHE : tout ce qui vient de Google.
 * Les fiches sont lues sur Drive à chaque affichage. Les servir depuis un
 * cache montrerait une version périmée d'une fiche qu'on vient de corriger —
 * une application de lecture qui ment sur son contenu ne vaut rien. Ces
 * requêtes ne sont donc pas interceptées du tout : le navigateur les traite
 * comme si ce fichier n'existait pas.
 */
const VERSION = 'monapp-v1';

/* Chemins RELATIFS : le site est servi sous /monapp/ par GitHub Pages, pas à
 * la racine du domaine. Un chemin absolu viserait le mauvais endroit. */
const COQUILLE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (evenement) => {
  evenement.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(COQUILLE))
      // Sans cela, un service worker neuf attend la fermeture de tous les
      // onglets avant de prendre la main : une correction déployée resterait
      // invisible pendant des jours sur un téléphone qui ne ferme jamais rien.
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (evenement) => {
  evenement.waitUntil(
    caches.keys()
      .then((noms) => Promise.all(
        noms.filter((n) => n !== VERSION).map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (evenement) => {
  const requete = evenement.request;

  // Seules les lectures de NOTRE origine passent par ici. Google Drive,
  // l'authentification et les polices vont directement au réseau.
  if (requete.method !== 'GET') return;
  if (new URL(requete.url).origin !== self.location.origin) return;

  // Réseau d'abord : un déploiement sur Pages doit être visible au prochain
  // chargement, pas au suivant. Le cache n'est qu'un filet pour le hors ligne.
  evenement.respondWith(
    fetch(requete)
      .then((reponse) => {
        if (reponse && reponse.ok) {
          const copie = reponse.clone();
          caches.open(VERSION).then((cache) => cache.put(requete, copie));
        }
        return reponse;
      })
      .catch(() => caches.match(requete).then(
        (enCache) => enCache || caches.match('./index.html')
      ))
  );
});
