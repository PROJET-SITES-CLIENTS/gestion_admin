# EINSOF ERP — Gestion Admin

ERP multi-métiers pour le marché guinéen (GNF, TVA 18 %, CNSS/RTS) :
direction, commercial/CRM, comptabilité & trésorerie, RH & paie, assistanat,
et deux filières métier — **BTP** (offres, chantiers, engins, QHSE) et
**Agro-alimentaire** (approvisionnement, production, traçabilité).

## Architecture

| Couche | Technologie | Emplacement |
|---|---|---|
| Frontend | React 19 + Vite 6 + Tailwind 4 (recharts, pdfmake, jszip) | `src/` |
| Backend | PHP 8 natif (router + contrôleurs maison, JWT HS256) | `backend/` |
| Données | `db.json` avec verrous `flock` (migration MySQL optionnelle) | racine + `backend/database/` |
| Fichiers clients | `uploads/` (servis uniquement aux utilisateurs authentifiés) | racine |

## Démarrage (développement)

Prérequis : Node.js 18+ et PHP 8.1+ (XAMPP par ex.).

```bash
npm install

# Configuration du backend (OBLIGATOIRE avant le premier lancement)
copy backend\.env.example backend\.env
#   puis renseigner JWT_SECRET (>= 32 caractères) :
#   php -r "echo bin2hex(random_bytes(32));"

npm run dev
```

`npm run dev` démarre :
- le backend PHP sur `http://localhost:8000` (via `dev.js`, adaptez le chemin
  de `php.exe` si nécessaire) ;
- le frontend Vite sur `http://localhost:3005` (proxy `/api` et `/uploads`).

### Comptes de démonstration

| Identifiant | Mot de passe | Rôle |
|---|---|---|
| `admin` | `admin123` | Gérant |
| `compta` | `123456` | Comptable |
| `commercial` | `123456` | Commercial |
| `assistante` | `password123` | Assistante |

> ⚠️ À changer impérativement en production (l'API exige désormais
> 8 caractères minimum pour tout nouveau compte).

## Scripts utiles

| Commande | Description |
|---|---|
| `npm run dev` | Backend PHP + frontend Vite |
| `npm run build` | Build de production du frontend (`dist/`) |
| `npm run lint` | Vérification TypeScript (`tsc --noEmit`) |
| `npm run backup` | Sauvegarde horodatée de `db.json` (`backups/`, 30 conservées) |
| `php -l <fichier>` | Vérification syntaxique PHP |
| `php backend/scripts/migrate_json_to_mysql.php` | Migration optionnelle vers MySQL (voir `backend/database/schema.sql`) |

## Déploiement (hébergement mutualisé type Hostinger)

```powershell
powershell -ExecutionPolicy Bypass -File prepare_deploy.ps1
```

Le dossier `einsof-deploy/` est prêt à être uploadé (SFTP) :
1. renommez `backend/.env.example` en `backend/.env` et remplissez
   `JWT_SECRET` + `ADMIN_PASSWORD` ;
2. le `.htaccess` racine est généré automatiquement (routage `/api` vers le
   routeur PHP, protection de `db.json`/`.env`, fallback SPA) ;
3. planifiez une sauvegarde périodique de `db.json` (c'est la seule source
   de vérité) : `npm run backup` en local ou copie SFTP planifiée.

## Sécurité — mesures en place

- Authentification JWT HS256 (en-tête vérifié, `iat`/`nbf`/`exp`, TTL 12 h).
- Rate limiting sur le login (5 essais / 15 min par utilisateur+IP).
- Mots de passe stockés en **hash bcrypt uniquement**.
- Toutes les routes exigent une authentification ; les données sensibles
  (RH/paie → Gérant+RH, finances → Gérant+Comptable) sont filtrées par rôle.
- Fichiers uploadés : MIME réel vérifié, taille limitée, renommés en UUID,
  servis uniquement aux utilisateurs connectés.
- CORS : same-origin par défaut (whitelist via `CORS_ALLOWED_ORIGINS`).
- Secret JWT **hors base de données** (`backend/.env`, fail-fast si absent).

## Structure du dépôt

```
src/                 Frontend React (views par rôle, composants, store central)
backend/             API PHP (core/, controllers/, public/index.php, .env.example)
scripts/             backup-db.cjs, seed.ts
backups/             Sauvegardes horodatées de db.json (non versionnées)
_archive/            Anciens artefacts (scripts de réparation, déploiements historiques)
```
