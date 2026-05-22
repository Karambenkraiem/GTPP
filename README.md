# GTpp — Journal d'Exploitation Turbine à Gaz

Application de gestion opérationnelle de la **Centrale Turbine à Gaz GE 9001E — STEG La Goulette**.

## Stack technique

- **Frontend** : React 18 + TypeScript + Vite + TailwindCSS
- **Backend** : Node.js + Express + Prisma ORM
- **Base de données** : PostgreSQL 16
- **Déploiement** : Docker Compose

## Lancement rapide

```bash
# Copier et adapter les variables d'environnement
cp .env.example .env

# Démarrer l'application complète
docker compose up --build
```

- Frontend : http://localhost:5173  
- Backend API : http://localhost:3004/api  
- Base de données : localhost:5434

## Compte administrateur par défaut

| Matricule | Mot de passe    |
|-----------|-----------------|
| ADMIN001  | Admin@GTpp2024  |

> Changer le mot de passe après la première connexion.

## Modules

- **Journée** — Gestion des journées d'exploitation et postes de quart
- **Relevés Chef Bloc** — Relevés techniques toutes les 2h (turbine, générateur, huile, vibrations, échappement)
- **Relevés Opérateur** — Relevés périodiques opérateurs
- **Manœuvres** — Journal des manœuvres d'exploitation
- **Alarmes** — Suivi des alarmes
- **Ordres de Travaux** — Gestion des OT maintenance
- **Matériels Défectueux** — Suivi des défauts équipements
- **Administration** — Gestion utilisateurs et seuils d'alarme
