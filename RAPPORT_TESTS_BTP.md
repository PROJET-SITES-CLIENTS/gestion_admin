# DOSSIER DE TESTS EXHAUSTIFS — ENTREPRISE BTP (Core + BTP synchronisés)
> 100 % dérivé du code (références file:line). Septembre 2026.
> Compagnon du RAPPORT_TESTS_CORE.md. Périmètre : le cycle complet d'une entreprise BTP utilisant le Core ET le module BTP comme un seul bloc.

---

## PARTIE 1 — LE CYCLE DE VIE NOMINAL BTP (chemin doré avec synchro Core)

```
PROSPECT CRM ──lien prospect_id──► OFFRE BTP (repérée)
  → Chiffrage ETUDES (5 familles, BPU, marge %) → montant de vente
  → Validation COMPTA (refus motivé possible) → Validation DG (GERANT)
  → Déposée → GAGNÉE ══════════ DÉCLENCHEUR SYNCHRONISÉ ══════════
       ├─ Marché MAR-2026-NNN auto-créé (brouillon, RG 5%, TVA config)
       ├─ Chantier auto-créé (planification, budget = montant, chiffrage importé)
       ├─ Prospect CRM → GAGNE + historique « Marché MAR-… créé »   [SYNERGIE A]
       └─ Notif COND_TRAVAUX « planifier les ressources »
  → Signature GERANT (brouillon → signe) + notif COND_TRAVAUX
  → Validations de démarrage : RH (équipes) + RESP_MATERIEL (engins)
  → Démarrage (COND_TRAVAUX) → OS « démarrage » auto + PDF
  → EXÉCUTION : lots/tâches WBS · pointages 0-12h (coût MO = h/8 × taux)
       · heures engins (coût = h × taux) · BC magasin → soumis → réception
         ══ SYNCHRO ══ stock + dépense Core PENDING (TVA config, chantier_id)
         + notif COMPTABLE
       · incidents QHSE (critique → suspension + OS arrêt + notif GERANT
         + tâche ASSISTANTE ; reprise = double validation QHSE+DG → OS reprise)
  → SITUATIONS : brouillon → validée conducteur → en_attente_facturation
       + tâche COMPTABLE « Facturer la situation »
  → FACTURATION (COMPTABLE/GERANT, endpoint atomique serveur)
       ├─ statut facturée + date
       ├─ Transaction CREDIT du NET (TTC − RG) + solde compte      [trésorerie]
       ├─ Écriture SYSCOHADA VENTE 701/443/521                      [SYNERGIE B]
       ├─ RG accumulée dans retenue_bloquee (stats serveur)
       └─ Notif GERANT « X encaissés, RG bloquée : Y »
  → Créances comptable : chantier visible avec restant = budget − facturé,
     RG bloquée, situations en attente, réserves                   [SYNERGIE D]
  → Dashboard Gérant : CA consolidé Core + BTP                     [SYNERGIE C]
  → Avenants (GERANT, atomique) → budget/délai chantier révisés
  → Réception provisoire + PV PDF → réserves → lever les réserves
  → Réception définitive + PV → tâche COMPTABLE « Libérer RG »
  → Libération RG (COMPTABLE) → transaction CREDIT du total + notif GERANT
  → Clôture : checklist 8 conditions (+exceptions) → marge finale persistée
  → Paie : pointages BTP → heures sup suggérées dans RhPayroll (25 000 GNF/h)
```

---

## PARTIE 2 — CAS PAR CAS

### A — AVANT-VENTE (offres → marchés)

**A1. Création d'offre.** Rôles UI : COMMERCIAL/GERANT/ETUDES. Lien prospect optionnel (pré-remplit client/objet/montant). Statut initial forcé `repérée` serveur (STRICT_STATUS_TABLES).

**A2. Chiffrage ETUDES.** 5 familles (MATÉRIAUX/MO/MATÉRIEL/ST/SOUS-TRAITANCE/FRAIS GÉN.), insertion depuis la BPU (bibliothèque de prix réutilisable), `vente = coût × (1 + marge%)` (marge 0-200 %). Sauvé dans `chiffrage_json` + `marge_calculee`. Ce montant devient le budget du chantier si gagné.

**A3. Pipeline offres (7 colonnes).** repérée → en_chiffrage (ETUDES) → en_validation_financiere → validation COMPTABLE (refus = retour chiffrage + motif stocké) → en_validation_dg → déposée (**GERANT seul**) → gagnée/perdue (COMMERCIAL/GERANT). Montant verrouillé après dépôt (sauf ETUDES/GERANT, garde serveur miroir). ⚠ Machine à états UI uniquement (voir B-2).

**A4. Offre GAGNÉE (le grand déclencheur).** Gardes AVANT persistance : chantier existant pour cette offre → refus ; montant ≤ 0 → refus. Puis dans l'ordre : statut persisté → marché MAR-AAAA-NNN (TVA config, RG 5 %) → compteur → chantier (budget + chiffrage) → notif COND_TRAVAUX → **prospect CRM → GAGNE + historique**. ⚠ Orchestration 100 % côté client (voir B-4).

**A5. Offre PERDUE.** Statut seul. ⚠ Aucune synchro CRM (le prospect reste actif), aucun motif (B-14).

**A6. Marché.** Auto (offre gagnée) ou manuel (GERANT/COMMERCIAL/ETUDES/COMPTABLE/ASSISTANTE). Machine à états serveur complète (9 états, brouillon→…→cloture). Signature : GERANT + statut brouillon côté UI → `signe` + notif COND_TRAVAUX. ⚠ 6 statuts sur 9 sans UI (updateBtpMarche importé jamais utilisé) ; signature non verrouillée serveur (B-17) ; upload du marché signé inexistant.

**A7. Avenants.** 4 types (montant/délai/montant_delai/pénalité). Soumission COND_TRAVAUX/ETUDES/GERANT → notif GERANT. Validation **atomique serveur, GERANT seul** : 409 si déjà traité ou chantier clôturé ; budget ±, délai +, garde budget ≥ 0 ; notif COND_TRAVAUX. ⚠ Ne touche jamais le marché d'origine (B-13) ; pas d'écriture compta ; rejet sans endpoint atomique.

### B — EXÉCUTION

**B-1. Chantier.** Statuts : planification → en_cours → suspendu → réception_provisoire → réception_définitive → clôturé. Démarrage exige **double validation RH + Matériel** (garde client uniquement — trou). Chaque transition génère l'OS correspondant (démarrage/arrêt/reprise/réception) + PDF. Réception définitive → tâche COMPTABLE « Libérer RG » si RG > 0.

**B-2. Lots & tâches.** LOT-001 auto, WBS avec dépendances (non exploitées), priorités, avancement = % tâches terminées, boutons Terminer/Rouvrir. Gardes serveur budget ≥ 0, avancement 0-100. ⚠ BtpLotPilotage : écart toujours 0 (coût réel non branché).

**B-3. Main-d'œuvre.** Affectations (taux journalier GNF) → notif RH. Pointages 0-12 h (gardes client + serveur sur UPDATE seulement). Coût MO serveur = `(heures/8) × taux_journalier`. ⚠ Sans affectation → coût 0 (marge surévaluée). Heures → heures sup paie Core.

**B-4. Engins.** disponible/affecté/en_maintenance/hors_service. Affectation : HS/maintenance non affectables (garde front + serveur), exclusivité 1 chantier. HS → détachement auto + notif COND_TRAVAUX. Heures engin → coût = h × taux_horaire. ⚠ Compteur horaire jamais incrémenté automatiquement.

**B-5. Magasin.** Stock 100 % dérivé des mouvements (entree/sortie_chantier/retour). BC multi-lignes : brouillon → soumis (notif GERANT + tâche MAGASINIER) → **réception atomique serveur** : mouvements d'entrée par ligne + BC reçu + **dépense Core ACHAT_MARCHANDISE PENDING (TVA config, chantier_id)** + notif COMPTABLE. Gardes anti-stock-négatif CLIENT uniquement (B-11). Statut initial forcé brouillon (impossible de créer un BC déjà reçu).

**B-6. QHSE.** Inspections (planifiée/réalisée/clôturée). Incidents 3 gravités ; **critique → suspension + OS arrêt + notif GERANT ERROR + tâche ASSISTANTE HIGH** (chaîne côté client — trou B-3 si déclaré par QHSE_BTP : l'OS échoue en 403). Reprise = double validation QHSE + DG → OS reprise. Habilitations avec badges expiration + notif RH J-30.

### C — FINANCE BTP & FUSION CORE

**C-1. Situations.** Création (COND_TRAVAUX/GERANT, chantier en_cours) : HT → TVA (ou autoliquidation) → TTC → RG = round(TTC × pct). Statut initial forcé brouillon. Validation conducteur → en_attente_facturation + tâche COMPTABLE. Machine serveur : brouillon → en_attente → facturée|annulée (terminaux). ⚠ Pas de numérotation SIT- (UUID + période).

**C-2. Facturation atomique serveur** (`/btp/situations/:id/facturer`, FINANCE) : gardes (statut, compte, montant > 0, retenue ≤ montant) → facturée + date + **transaction CREDIT du NET** + solde + notif GERANT → côté client : écriture VENTE 701/443/521. ⚠ **Écriture faussée** : basée sur le NET, TVA rétrocalculée même en autoliquidation, RG absente du grand livre (B-1 critique).

**C-3. Retenue de garantie.** Accumulée serveur par situation facturée non libérée. Libération : conditions (réception définitive/clôturé) + rôles FINANCE + endpoint atomique → toutes les situations marquées + transaction CREDIT du total + notif GERANT. ⚠ Tout-ou-rien ; **aucune écriture comptable** pour la libération.

**C-4. Coûts & stats serveur** (btpChantierStats) : budget_engage (Σ dépenses ≠ REJECTED ⚠ inclut CANCELLED), cout_mo_reel, cout_engins, cout_stock_sorti (sorties valorisées), cout_sous_traitance, retenue_bloquee, montants facturés/en attente. ⚠ **3 formules de marge cohabitent** (fiche avec max() anti-double-comptage, dashboard sans stock, clôture additionnant tout) → marge_finale potentiellement faussée (B-5).

**C-5. Clôture.** Checklist 8 conditions (travaux, heures imputées, factures contrôlées, réserves levées, docs finaux GED, engins réaffectés, lots terminés, marge) + exceptions basculables. GERANT/COMPTABLE. Persiste statut clôturé + date + marge_finale + checklist. ⚠ Exceptions sans motif saisi ; ne déclenche rien côté marché (état cloture jamais atteint).

### D — TRANSVERSE

**D-1. Dashboard BTP.** KPIs (chantiers actifs, avancement pondéré par budget, situations facturées ⚠ TTC alors que trésorerie = net, marge sans stock, RG bloquées, retards + pénalités calculées), courbe S (valeur acquise carry-forward vs facturé cumulé, normalisée budget total), budget vs consommé, frise planning avec marqueur aujourd'hui.

**D-2. Permissions.** Matrice 11 actions × 8 rôles persistée dans la config (GERANT seul). ⚠ **100 % décorative** : aucune vue ni route ne la lit (B-7). Les droits réels = rôles en dur des vues + CRUD_TABLES serveur.

**D-3. Notifications auto (polling 15 s).** Budget > 90 % → COND_TRAVAUX ; > 100 % → GERANT ; offre J-3 → ETUDES / jour J → GERANT ; habilitation J-30/expirée → RH ; stock bas → MAGASINIER ; retard J+1 → COND_TRAVAUX / J+7 → GERANT. ⚠ Anti-doublon cassé multi-rôles (spam si ≥ 2 rôles connectés) ; fenêtres exactes (alerte perdue si personne connecté ce jour-là).

**D-4. Serveur.** 25 tables BTP CRUD + 5 endpoints atomiques (facturer, valider avenant, libérer retenues, recevoir BC, valider-rh) + /btp/stats (route morte côté client, duplique /data). VALID_TRANSITIONS sur 4 tables seulement. ⚠ /data sert toutes les tables BTP à **tous** les rôles authentifiés (fuite : budgets, marges, taux journaliers).

---

## PARTIE 3 — LA CARTE DES CIRCULATIONS CORE ↔ BTP

| # | Circulation | Sens | État |
|---|-------------|------|------|
| 1 | Offre liée au prospect CRM (prospect_id) | Core→BTP | ✅ |
| 2 | Offre gagnée → prospect GAGNE + historique | BTP→Core | ✅ (client) |
| 3 | Réception BC → dépense Core PENDING + notif COMPTABLE | BTP→Core | ✅ atomique serveur |
| 4 | Dépense Core payée → écriture ACHAT (TVA réelle) | Core interne | ✅ alimente budget_engage |
| 5 | Situation facturée → transaction trésorerie (NET) | BTP→Core | ✅ atomique serveur |
| 6 | Situation facturée → écriture VENTE 701/443 | BTP→Core | ⚠ **faussée** (base NET, TVA inventée, RG absente) |
| 7 | Libération RG → transaction trésorerie | BTP→Core | ✅ mais **sans écriture** |
| 8 | Chantiers → créances comptable fusionnées | BTP→Core | ✅ |
| 9 | Situations facturées → CA dashboard Gérant | BTP→Core | ✅ |
| 10 | Pointages → heures sup paie Core | BTP→Core | ✅ (taux 25 000 GNF/h codé dur) |
| 11 | Employés RH → annuaire/affectations/taux MO | Core→BTP | ✅ |
| 12 | Avenant validé → budget chantier | BTP interne | ✅ mais **marché figé** |
| 13 | Avenant/marché → compta | BTP→Core | ❌ aucune écriture |
| 14 | Sous-traitance soldée → paiement/dépense | BTP→Core | ❌ invisible financièrement |
| 15 | Offre perdue → prospect CRM | BTP→Core | ❌ absente |
| 16 | Chantier ↔ Projet Core | bidirectionnel | ❌ jamais (chaînes parallèles) |

---

## PARTIE 4 — TROUS PAR CRITICITÉ

### 🔴 CRITIQUES (comptabilité fausse / sécurité contournable / flux cassable)

| # | Trou | Réf |
|---|------|-----|
| B-1 | Écriture VENTE basée sur le NET : 701/443 sous-évalués, TVA inventée en autoliquidation, RG jamais au 411, libération RG sans écriture → grand livre faux sur tout le cycle RG | `store.tsx:1910,2441-2449` |
| B-2 | `btpChantiers`/`btpOffres`/`btpBonCommandes`/`btpAvenants` hors VALID_TRANSITIONS : double validation contournable, BC « reçu » sans stock/dépense, avenant « validé » sans budget, offre « gagnée » sans gardes | `api/index.ts:837-876` |
| B-3 | Suspension incident critique : OS d'arrêt en 403 si déclaré par QHSE_BTP (btpOs interdit) ; chaîne entière côté client | `store.tsx:1848`, `api/index.ts:175` |
| B-4 | Orchestration offre gagnée côté client : marché sans chantier (ou doublon MAR au 2ᵉ clic), compteur incrémenté même si échec | `store.tsx:1653-1718` |
| B-5 | 3 marges incohérentes ; marge_finale de clôture en double comptage matériaux | `BtpClosure.tsx:130,156` vs `BtpChantiersView.tsx:281-296` |
| B-8 | Anti-doublon notifications multi-rôles cassé → spam 15 s dès 2 rôles connectés | `store.tsx:518-523` + `api:365` |
| B-16 | /data sert budgets/marges/taux journaliers BTP à TOUS les rôles authentifiés | `api/index.ts:367-368` |

### 🟠 MAJEURS

B-6 sous-traitance financièrement invisible + évaluation non persistée · B-7 matrice permissions décorative · B-9 budget_engage inclut les dépenses CANCELLED · B-10 pointage : gardes 0-12 h absentes à la CRÉATION · B-11 stock négatif possible via API · B-12 réception définitive avec réserves ouvertes (le PV ment) · B-13 avenant ne met pas à jour le marché · B-14 offre perdue sans retour CRM ni motif · B-15 numérotation MAR non atomique + situations sans numéro SIT- · B-17 signature marché non verrouillée serveur + création directe 'signe' possible · B-18 RG % modifiable sans avenant ni trace · B-19 cautionnements sans effet financier, sans alerte échéance, code mort (`handleLiberer` mauvais paramètre)

### 🟡 MOYENS

Exceptions de clôture sans motif saisi · `e.matricule` QHSE jamais servi (N/A permanent) · KPI « encaissées en trésorerie » compte le TTC (net réel) · courbe S normalisée sur budget total incluant clôturés · `mesures_correctives` incident non saisissable · états incidents intermédiaires non exposés · compteur horaire engin manuel · `cout_mo_reel`=0 sans affectation · docs finaux : le PV téléchargé n'est pas enregistré en GED (checklist bloquée) · suppression sans cascade (orphelins) · rôles serveur surdimensionnés vs UI · statut 'retirée' d'offre sans UI · stats dupliquées /data + /btp/stats · hint "50/50" vs 75/25 (Core) · double orthographe réserves levée/levee

---

## PARTIE 5 — MATRICE NOTIFICATIONS BTP↔CORE (résumé)

| Événement | → Cible | Origine |
|-----------|---------|---------|
| Offre gagnée | COND_TRAVAUX + CRM (GAGNE) | client |
| Marché créé/signé | GERANT / COND_TRAVAUX | client |
| Avenant soumis/validé | GERANT / COND_TRAVAUX | client + serveur |
| Validation RH chantier | COND_TRAVAUX | serveur |
| Affectation employé | RH | client |
| Incident critique | GERANT + tâche ASSISTANTE | client ⚠ fragile |
| Engin HS | COND_TRAVAUX | client |
| BC soumis/réceptionné | GERANT+MAGASINIER / COMPTABLE | client + serveur |
| Situation en attente/facturée | tâche COMPTABLE / GERANT | client + serveur |
| Réception définitive | tâche COMPTABLE (RG) | client |
| Budget > 90/100 %, retards, échéances, stock bas, habilitations | COND_TRAVAUX/GERANT/ETUDES/MAGASINIER/RH | polling ⚠ spam |

## PARTIE 6 — DOCUMENTS BTP

| Document | Numérotation | Générateur |
|----------|--------------|------------|
| Marché | MAR-2026-NNN ✅ (compteur, non atomique) | — |
| OS (démarrage/arrêt/reprise/réception) | UUID | generateOsPDF ✅ |
| PV réception provisoire/définitif | PV-PRO/PV-DÉF-{date} | generatePvPDF ✅ |
| Situation | **aucune** (UUID + période) | ❌ |
| Proforma offre BTP | ❌ inexistant | ❌ |
