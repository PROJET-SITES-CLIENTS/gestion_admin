# ============================================================================
# EINSOF ERP — Préparation du dossier de déploiement (Hostinger mutualisé)
# Usage : powershell -ExecutionPolicy Bypass -File prepare_deploy.ps1
# ============================================================================

$ErrorActionPreference = "Stop"
$deployDir = ".\einsof-deploy"

# 1. Reconstruction propre du frontend
Write-Host ">> Build du frontend (vite)..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw "Echec du build Vite." }

# 2. Création du dossier de déploiement
if (Test-Path $deployDir) { Remove-Item -Recurse -Force $deployDir }
New-Item -ItemType Directory -Force -Path $deployDir | Out-Null

# 3. Frontend compilé
Copy-Item -Path ".\dist\*" -Destination $deployDir -Recurse

# 4. Backend PHP (sans .env : il est créé à la main sur le serveur)
New-Item -ItemType Directory -Force -Path "$deployDir\backend" | Out-Null
foreach ($dir in @("controllers", "core", "utils", "public", "database")) {
  if (Test-Path ".\backend\$dir") {
    Copy-Item -Path ".\backend\$dir" -Destination "$deployDir\backend" -Recurse
  }
}
# Modèle de configuration (à renommer en .env sur le serveur puis à remplir)
Copy-Item -Path ".\backend\.env.example" -Destination "$deployDir\backend\.env.example"

# 5. Base de données et uploads
Copy-Item -Path ".\db.json" -Destination $deployDir -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path "$deployDir\uploads" | Out-Null

# 6. .htaccess racine : routage API + protection des fichiers sensibles + SPA
$htaccessContent = @'
# ============================================================
# EINSOF ERP - Configuration Apache (racine du site)
# ============================================================

# --- Protection des fichiers sensibles ---
<FilesMatch "^(db\.json|\.env.*|.*\.(sql|md|cjs|log))$">
  <IfModule mod_authz_core.c>
    Require all denied
  </IfModule>
  <IfModule !mod_authz_core.c>
    Order allow,deny
    Deny from all
  </IfModule>
</FilesMatch>

# Pas de listage des répertoires
Options -Indexes

<IfModule mod_rewrite.c>
  RewriteEngine On

  # En-tête Authorization transmis au PHP (JWT)
  RewriteCond %{HTTP:Authorization} ^(.*)
  RewriteRule .* - [E=HTTP_AUTHORIZATION:%1]

  # API et fichiers uploadés -> routeur PHP (l'auth est vérifiée par l'application)
  RewriteRule ^api(/.*)?$ backend/public/index.php [L,QSA]
  RewriteRule ^uploads(/.*)?$ backend/public/index.php [L,QSA]

  # Accès direct aux sources du backend interdit.
  # IMPORTANT : la garde REDIRECT_STATUS évite de bloquer la réécriture
  # INTERNE vers backend/public/index.php (sinon l'API renverrait 403).
  RewriteCond %{ENV:REDIRECT_STATUS} ^$
  RewriteRule ^backend/ - [F,L]

  # SPA React : tout le reste sert index.html
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^ index.html [L,QSA]
</IfModule>
'@
Set-Content -Path "$deployDir\.htaccess" -Value $htaccessContent -Encoding UTF8

Write-Host ""
Write-Host "=================================================" -ForegroundColor Green
Write-Host " Dossier pret : $deployDir" -ForegroundColor Green
Write-Host " AVANT d'envoyer sur le serveur :" -ForegroundColor Yellow
Write-Host "  1. Renommer backend/.env.example en backend/.env" -ForegroundColor Yellow
Write-Host "  2. Generer un JWT_SECRET : php -r \"echo bin2hex(random_bytes(32));\"" -ForegroundColor Yellow
Write-Host "  3. Definir ADMIN_PASSWORD (compte initial)" -ForegroundColor Yellow
Write-Host "  4. RAPPEL : db.json contient les donnees reelles" -ForegroundColor Yellow
Write-Host "=================================================" -ForegroundColor Green
