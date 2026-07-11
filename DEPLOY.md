# Déploiement GTpp sur le VPS (aux côtés du projet dataserv)

## 1. DNS
Chez OVH, ajouter un enregistrement A :
```
gtpp.alkaramsoft.ovh  ->  <IP du VPS>   (même IP que alkaramsoft.ovh)
```

## 2. Réseau Docker partagé (une seule fois)
Sur le VPS, pour que `dataserv-nginx` puisse atteindre les conteneurs GTpp :
```bash
docker network create proxy_net
docker network connect proxy_net dataserv-nginx
```

## 3. Cloner le projet sur le VPS
```bash
git clone https://github.com/Karambenkraiem/GTPP.git /opt/gtpp
cd /opt/gtpp
```

Créer un fichier `.env` (jamais commité) à côté de `docker-compose.prod.yml` :
```bash
cat > .env <<'EOF'
POSTGRES_PASSWORD=<mot-de-passe-fort>
JWT_SECRET=<secret-fort>
EOF
# générer des valeurs fortes : openssl rand -base64 32
```

## 4. Premier démarrage
```bash
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
docker compose -f docker-compose.prod.yml exec backend npx prisma db push
docker compose -f docker-compose.prod.yml exec backend npm run db:seed:prod   # optionnel
```

## 5. Certificat SSL (Let's Encrypt, méthode webroot)
`dataserv-nginx` doit avoir un volume webroot pour les challenges ACME, ex. `/var/www/certbot`
monté aussi côté host pour que certbot puisse y écrire :
```bash
certbot certonly --webroot -w /var/www/certbot -d gtpp.alkaramsoft.ovh
```
(Si le certbot du projet 1 est dockerisé plutôt qu'installé sur l'hôte, adapter la commande
en conséquence — le principe reste : écrire le challenge dans le même dossier que celui
servi par `location /.well-known/acme-challenge/` dans `deploy/gtpp.alkaramsoft.ovh.conf`.)

## 6. Brancher le sous-domaine sur dataserv-nginx
Copier `deploy/gtpp.alkaramsoft.ovh.conf` dans le dossier de config de `dataserv-nginx`
(son `conf.d/` ou `sites-enabled/`, selon son montage de volume), puis :
```bash
docker exec dataserv-nginx nginx -t && docker exec dataserv-nginx nginx -s reload
```

## 7. CI/CD (GitHub Actions)
Dans GitHub → Settings → Secrets and variables → Actions, ajouter :
- `VPS_HOST` — IP ou domaine du VPS
- `VPS_USER` — utilisateur SSH
- `VPS_SSH_KEY` — clé privée SSH (celle dont la clé publique est dans `~/.ssh/authorized_keys` du VPS)
- `VPS_SSH_PORT` — port SSH (22 par défaut)
- `VPS_PROJECT_PATH` — chemin du clone sur le VPS (ex. `/opt/gtpp` ou `/opt/steg/GTPP`)
- `ANDROID_KEYSTORE_BASE64` — keystore de signature Android, encodé en base64 (voir §7.1)
- `ANDROID_KEYSTORE_PASSWORD` — mot de passe du keystore
- `ANDROID_KEY_ALIAS` — alias de la clé dans le keystore
- `ANDROID_KEY_PASSWORD` — mot de passe de la clé

À chaque push sur `main` : le workflow build les images (test), compile et **signe l'APK
Android** (job `build-android`), puis se connecte en SSH au VPS, fait `git pull`, rebuild,
relance `docker-compose.prod.yml`, et envoie l'APK par SCP dans `$VPS_PROJECT_PATH/apk-downloads/`
(chemin relatif au clone du projet, quel que soit son emplacement sur le VPS).
Le fichier est servi tel quel par nginx sur `https://gtpp.alkaramsoft.ovh/downloads/gtpp.apk`
(monté en volume lecture seule dans le conteneur `frontend` via `./apk-downloads`, un chemin
relatif au `docker-compose.prod.yml`, cf. ce fichier).

### 7.1 Keystore de signature (une seule fois)

Android exige que toutes les versions d'une même app soient signées avec le **même**
keystore — le perdre signifie ne plus jamais pouvoir publier de mise à jour sans forcer
chaque utilisateur à désinstaller l'ancienne version. Le garder en lieu sûr (gestionnaire
de secrets, coffre-fort numérique) **en dehors du dépôt git** (déjà exclu par
`frontend/android/.gitignore`).

Sur le VPS (une seule fois), depuis le dossier du projet (celui pointé par le secret
`VPS_PROJECT_PATH`, ex. `/opt/steg/GTPP`), créer le dossier de destination des APK avant
le premier déploiement avec la nouvelle config :
```bash
cd $VPS_PROJECT_PATH   # ex. cd /opt/steg/GTPP
mkdir -p apk-downloads
```

Puis encoder le keystore en base64 pour le coller dans le secret GitHub
`ANDROID_KEYSTORE_BASE64` :
```bash
base64 -w0 gtpp-release.keystore   # Linux/macOS
# ou en PowerShell :
[Convert]::ToBase64String([IO.File]::ReadAllBytes("gtpp-release.keystore"))
```

## 8. Mode démo (accès rapide utilisateurs sur la page de login)
La page de login peut afficher un panneau "Accès rapide" avec un bouton par utilisateur réel
(connexion en un clic, mot de passe par défaut `123456`, ou `00000` pour le rôle `guest`).
**Désactivé par défaut** — à n'activer que le temps d'une démonstration, jamais en continu.

Activation/désactivation en direct, sans redéploiement : bouton "Mode démo" dans
**Admin → Utilisateurs** (visible uniquement par un compte `admin`). L'état vit en mémoire
côté backend et repasse à `false` à chaque redémarrage du conteneur backend (donc à chaque
déploiement) — comportement volontaire, sûr par défaut.

Alternative (pour que le mode démo démarre déjà activé après un déploiement) : définir
`DEMO_LOGIN=true` dans le `.env` du VPS avant de relancer le backend — sert uniquement de
valeur initiale au démarrage, le bouton admin reste utilisable ensuite pour basculer.

## Développement local
Rien ne change : `docker compose up -d --build` avec `docker-compose.yml` (Docker Desktop),
comme avant. Le pipeline ne concerne que le déploiement après un push sur `main`.
