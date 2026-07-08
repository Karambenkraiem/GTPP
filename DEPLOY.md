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
- `VPS_PROJECT_PATH` — chemin du clone sur le VPS (ex. `/opt/gtpp`)

À chaque push sur `main` : le workflow build les images (test), puis se connecte en SSH
au VPS, fait `git pull`, rebuild et relance `docker-compose.prod.yml`.

## 8. Activer temporairement le mode démo (accès rapide utilisateurs)
La page de login peut afficher un panneau "Accès rapide" avec un bouton par utilisateur réel
(connexion en un clic, mot de passe par défaut `123456`, ou `00000` pour le rôle `guest`).
**Désactivé par défaut** — à n'activer que le temps d'une démonstration, jamais en continu.

```bash
cd /opt/gtpp
git pull origin main
echo "DEMO_LOGIN=true" >> .env
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

Une fois la démo terminée, désactiver impérativement :
```bash
sed -i '/^DEMO_LOGIN=/d' .env
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

## Développement local
Rien ne change : `docker compose up -d --build` avec `docker-compose.yml` (Docker Desktop),
comme avant. Le pipeline ne concerne que le déploiement après un push sur `main`.
