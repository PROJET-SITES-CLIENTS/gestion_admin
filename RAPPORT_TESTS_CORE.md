# DOSSIER DE TESTS EXHAUSTIFS — MODULE CORE
> 100 % dérivé du code (références file:line). Septembre 2026.
> Périmètre : Core uniquement (Gérant, Assistante, Comptable, Commercial, RH). BTP/Agro mentionnés uniquement aux points de contact.

---

## PARTIE 1 — LE CYCLE DE VIE NOMINAL COMPLET (chemin doré)

Le scénario « une entreprise Core prend un client et le mène à terme » :

| # | Étape | Acteur | Ce que le code fait exactement |
|---|-------|--------|-------------------------------|
| 1 | **Création du prospect** | Commercial | Form nom+téléphone → stage `NOUVEAU`, qualification `NON_QUALIFIE`, historique « Création du prospect » (`ProspectionCRM.tsx:40-64`) |
| 2 | **Qualification** | Commercial | Select FROID/TIEDE/CHAUD (`types.ts:190`). Le passage à **CHAUD** débloque la conversion (`ProspectionCRM.tsx:664`) |
| 3 | **RDV** | Commercial | « Booker le RDV » (date+heure) → stage auto `RDV_FIXE`, statut `SCHEDULED`, historique (`ProspectionCRM.tsx:137-171`) ; après rencontre → statut `HELD` + compte-rendu libre (`:776-814`) |
| 4 | **Devis** | Commercial | « Créer un Devis » : prospect (≠PERDU) + lignes catalogue (qté/PU/remise 0-100 %), total = Σ qté×PU×(1−remise) ; statut `DRAFT`, validité 30 j (`CommercialProposals.tsx:53-72`) |
| 5 | **Envoi** | Commercial | Bouton Send = alerte simulée + passage `SENT` (`:158-166`) — **rien n'est réellement envoyé** |
| 6 | **Acceptation** | Commercial | Select statut → `ACCEPTED` (`store.tsx:1315-1323`) — **aucun effet automatique** (voir trou T1) |
| 7 | **Conversion en projet** | Commercial | « Gagner l'Affaire » (visible si CHAUD et ≠GAGNE) → `convertProspectToProject` (`store.tsx:1223-1278`) : anti-reconversion (projet existant ?), anti-doublon (confirm), stage → `GAGNE`, création projet avec client/contact/budget parsé depuis `estimatedBudget`, description synthétisée, **notification GERANT** (« Nouvelle affaire convertie ») |
| 8 | **Confirmation commande** | Commercial | « ✓ Confirmer la commande » → `commercialPaymentConfirm: true` (`store.tsx:1077-1079`) — **sans notification** (trou T2) |
| 9 | **Échéancier** | Comptable | Onglet Ventes → dossier → « Échéancier Personnalisé » → défaut **75 % aujourd'hui / 25 % J+21** (`PaymentPlanManager.tsx:11-36`) ; édition libre, somme = 100 % obligatoire |
| 10 | **Proforma** | Comptable | « Verrouiller & Proforma » → plan `LOCKED` + doc `PRO-2026-NNN` + PDF (TVA rétrocalculée depuis le TTC) (`store.tsx:1089-1115`, `pdfGenerator.ts:310-450`) |
| 11 | **Encaissement acompte** | Comptable | « Enregistrer le paiement » (montant libre) → `payInstallmentAndGenerateReceipt` (`store.tsx:879-1012`) : garde anti-surplus, numéro `REC-2026-NNN`, TVA extraite, tranche → `PAID`, différentiel reporté sur la tranche suivante, **transaction CREDIT trésorerie**, **écriture auto VT (Débit 521 TTC / Crédit 701 HT / Crédit 443 TVA)**, reçu PDF, notification |
| 12 | **Débloquage** | auto | 1ʳᵉ tranche payée → `accountantPaymentConfirm: true` → le commercial voit « Validé (Compta) » (`store.tsx:970-978`) |
| 13 | **Solde** | Comptable | Idem étape 11 sur la 2ᵉ tranche → `paymentStatus: 'PAID'`, `status: 'PAYE'` (`:966-969`) |
| 14 | **Dépenses** | Comptable | Saisie (catégorie, TVA déductible optionnelle) → statut `PENDING` → « Payer avec… » → transaction DEBIT d'abord, puis `PAID` + écriture auto AC (`AccountantExpenses.tsx:41-52`) |
| 15 | **Paie (parallèle)** | RH→Gérant | RH génère la fiche (calcul §F4) → `DRAFT` → notification COMPTABLE → RH **valide** → **GÉRANT seul paie** (choix du compte) → 3 transactions (net/CNSS/RTS) + écriture auto BQ 661/521 (`store.tsx:1386-1434`) |
| 16 | **Supervision** | Gérant | Dashboard : trésorerie globale, CA encaissé (`coreRevenue` = tranches PAYÉES réelles, `ManagerView.tsx:39-46`), dépenses en attente, fil d'activité, tâches escaladées, congés en cours |
| 17 | **Relances auto (si retard)** | auto | Polling 15 s : échéance PENDING dépassée → J+7 notification COMMERCIAL, J+14 tâche HIGH COMMERCIAL, J+30 notification ERROR GERANT (`store.tsx:589-618`) |
| 18 | **Clôture** | Gérant | Bilan & P&L sur écritures VALIDATED, équilibre contrôlé à 1 GNF (`AccountantDashboard.tsx:154-157`), TVA nette 443−445, exports CSV |

---

## PARTIE 2 — TOUS LES CAS, UN PAR UN

### A — COMMERCIAL (acquisition)

**A1. Création manuelle d'un prospect.** Nom + téléphone requis. Stage `NOUVEAU`, source « Ajout Manuel ». Historique horodaté avec utilisateur. KPI « Leads actifs » +1.

**A2. Import CSV.** Colonnes name,phone,email,source. Fichier < 2 lignes rejeté (`ProspectionCRM.tsx:74-77`). Historique « Import CSV ». Aucune détection de doublon à l'import (⚠ un même prospect peut être importé 2 fois).

**A3. Booker un RDV.** Date+heure requises → stage forcé `RDV_FIXE` même si le prospect était ailleurs, statut `SCHEDULED`, lieu « À définir ». Historique.

**A4. Déroulement du RDV.** Statut modifiable : `HELD`/`CANCELLED`/`NO_SHOW` (+ historique). Compte-rendu post-meeting en texte libre (onglet MEETINGS).

**A5. Déplacement Kanban.** Drag & drop entre les 7 stages, **sans aucune contrainte** : PERDU→GAGNE, GAGNE→NOUVEAU possibles sans confirmation (`ProspectionCRM.tsx:248-267`). Historique « Déplacé de X vers Y ».

**A6. Création d'un devis.** Conditions : titre + prospect (≠PERDU — un GAGNE reste eligible, donc devis pour client existant OK) + ≥ 1 ligne. Remise ligne 0-100 % sans plafond. **Aucune TVA appliquée** mais le total est étiqueté « TTC » (incohérence, trou T3).

**A7. Envoi du devis.** Simulation uniquement (alert). Statut → `SENT`. PDF téléchargeable (`DEV-{id8}`, hors compteur légal).

**A8. Devis accepté / refusé.** Select libre, **aucune garde de transition** (ACCEPTED→DRAFT possible), **aucun effet** : pas de projet, pas de notification, pas de lien automatique. `Project.proposalId` existe dans le type mais n'est **jamais alimenté** (trou T1).

**A9. Conversion prospect → projet.** Bouton visible seulement si `qualification === 'CHAUD' && stage !== 'GAGNE'` — un prospect FROID/TIEDE ne peut PAS être converti. Gardes : (1) projet existe déjà avec ce prospectId → retourne l'existant ; (2) doublon clientName → confirm contournable. Effets : stage GAGNE, projet créé (budget = parseInt du texte `estimatedBudget` nettoyé — ⚠ « 5 millions » → 5), description générée depuis l'historique, notification GERANT SUCCESS.

**A10. Prospect perdu.** Drag vers PERDU. ⚠ Champs `lossReason`/`lossReasonDetail` définis dans le type mais **jamais demandés** — aucune raison de perte capturée (trou T4).

**A11. Création manuelle d'un projet.** Nom seul → dédoublonnage par nom normalisé (trim/lowercase) contre name ET clientName, confirm contournable. Projet créé avec **budget 0**, sans client (`store.tsx:809-822`).

**A12. Annulation d'un projet par le commercial.** Confirm → statut `ANNULE` + **notification COMPTABLE ERROR** (« vérifiez les remboursements ») + **tâche ASSISTANTE MEDIUM** (« Classer le dossier annulé ») (`store.tsx:1128-1129`).

**A13. Relances automatiques d'échéance.** Conditions : projet avec paymentPlan, statut ≠ ANNULE/PAYE, 1ʳᵉ échéance PENDING en retard. J+7 → notification COMMERCIAL WARNING ; J+14 → tâche HIGH COMMERCIAL (⚠ créée hors `addTask`, donc **la délégation d'absence ne s'applique pas**) ; J+30 → notification GERANT ERROR. Anti-doublon par message.

**A14. Alerté d'un impayé.** Réception notification ERROR « suspendre les travaux et relancer le client » ; le projet repasse `PENDING`/`accountantPaymentConfirm: false`.

**A15. Attribution d'un prospect.** Sélecteur « Attribué à » **réservé GERANT**. Un commercial voit ses prospects attribués + les non-attribués dans le CRM, mais **seulement les attribués** dans le reporting (périmètres incohérents).

**A16. Reporting.** CA pipeline pondéré (× probabilité, défaut 50 %), CA gagné (budget prospect, pas projet), taux conversion, **objectif mensuel hardcodé** (500 M GNF gérant / 100 M GNF commercial — non lié à la config), commission 5 % (visible commercial uniquement).

**Restrictions commercial :** vue unique (pas d'accès compta/RH/gérant), pas d'échéancier, pas d'encaissement, pas de catalogue (onglet caché, réservé gérant — mais **inaccessible par routage** car le gérant ouvre ManagerView, pas CommercialView), pas de suppression de projet, pas de conversion d'un prospect non-CHAUD.

---

### B — COMPTABLE : facturation & encaissements

**B1. Découverte de la confirmation commande.** Le comptable voit « Attesté (En vérif.) » sur le projet (commercialPaymentConfirm). ⚠ **Aucune notification** n'est émise à la confirmation — découverte par polling 15 s uniquement (trou T2).

**B2. Échéancier par défaut.** Bouton « Échéancier Personnalisé » → brouillon 75 % (aujourd'hui) / 25 % (J+21), base = `negotiatedPrice || budget`. ⚠ Le commentaire du code dit « 50%/50% » alors que le code produit 75/25.

**B3. Échéancier personnalisé.** Ajout/suppression de tranches, intitulé, quote-part % (recalcule le montant), date butoir. **Somme des pourcentages = 100 % obligatoire** (boutons désactivés sinon).

**B4. Brouillon vs verrouillage.** « Enregistrer brouillon » → `DRAFT` (modifiable). « Verrouiller & Proforma » → `LOCKED` (readonly) + doc `PRO-AAAA-NNN` + PDF proforma (TVA extraite du TTC : HT = TTC/(1+taux)). Protection serveur : un non-FINANCE ne peut pas écraser un plan contenant des échéances PAYÉES (`api/index.ts:661-667`).

**B5. Encaissement d'une tranche (mode simple ou échéancier).** Montant saisi libre « Montant exact encaissé ». Séquence : garde anti-surplus (sur **budget**, pas sur le prix négocié ⚠) → numéro REC-AAAA-NNN → TVA proportionnelle extraite → tranche → PAID avec montant réel → **différentiel reporté sur la tranche suivante** → toutes les tranches restantes re-datées **J+21** → transaction CREDIT (VENTE) sur le compte choisi → **écriture auto VT** (521 TTC / 701 HT / 443 TVA, DRAFT) → reçu PDF → notification COMPTABLE SUCCESS avec détail HT/TVA.

**B6. Paiement complet.** Dernière tranche payée → `paymentStatus: 'PAID'` + `accountantPaymentConfirm: true` + `status: 'PAYE'`.

**B7. Paiement partiel.** → `PARTIAL` + `EN_COURS`. Si c'est la 1ʳᵉ tranche (index 0 ou id 'acompte') → `accountantPaymentConfirm: true` débloque le commercial.

**B8. ⚠ Paiement partiel de la DERNIÈRE tranche.** Le différentiel est reporté sur la tranche suivante… qui n'existe pas → **projet jamais PAID, plan déséquilibré vs budget** (trou T5).

**B9. Trop-perçu.** Garde : montant > restant → refus + toast « TROP-PERÇU… Créez un avoir ». ⚠ **Aucune fonction avoir n'existe** dans tout le code (trou T6).

**B10. ⚠ Montant ≤ 0.** `payInstallmentAndGenerateReceipt` n'a **aucune garde basse** : un montant 0 ou négatif produit un reçu, une transaction et une écriture (trou T7).

**B11. ⚠ Double-clic.** Le bouton n'est pas désactivé pendant l'appel async → reçus/transactions/écritures dupliqués. Numérotation REC non atomique → même numéro possible (trou T8).

**B12. ⚠ Acompte libre depuis l'onglet Créances.** Montant libre + compte + référence → transaction `ACOMPTE_CLIENT` + reçu PDF + notification COMMERCIAL. **MAIS** : (a) le paymentPlan n'est pas touché → **la créance affichée ne baisse pas** ; (b) **aucune écriture comptable** ; (c) **aucune TVA** — 3 désynchronisations majeures avec le flux Ventes (trou T9, le plus grave du module).

**B13. Relance manuelle d'une créance.** Bouton → **exactement une notification COMMERCIAL WARNING**. Pas d'email/SMS, pas d'historique de relance, pas de niveaux.

**B14. Incident de paiement (chèque rejeté).** Bouton rouge + confirm → `alertUnpaid` : projet → `PENDING`, `accountantPaymentConfirm: false`, notification COMMERCIAL ERROR « suspendre les travaux ».

**B15. ⚠ Remboursement.** `refundProject` existe (projet ANNULE seulement, plafonné au remboursable, doc REC, transaction DEBIT, écriture ACHAT, notification GERANT) mais **AUCUNE vue ne l'appelle** — fonctionnalité invisible (trou T10).

**B16. Créances BTP fusionnées.** (Synergie D) Les chantiers BTP apparaissent avec RG bloquée et situations en attente — badge 🏗 BTP. Côté Core pur : rien.

---

### C — DÉPENSES

**C1. Saisie rapide (onglet Ventes).** Catégorie SALAIRE/LOYER/ELECTRICITE/INTERNET/IMPOTS/AUTRE, **TVA forcée 0** (HT=TTC), statut PENDING. Suppression directe possible. ⚠ Garde `!amount` laisse passer un **montant négatif** (trou T11).

**C2. Saisie détaillée (onglet Dépenses).** Catégories étendues + **checkbox « TVA Déductible ? (18 %) »** : TVA calculée sur le HT + TTC. Rattachement optionnel à un chantier BTP (filtre par chantier, badge).

**C3. Paiement d'une dépense.** « Payer avec… » (compte) + confirm → **transaction DEBIT d'abord** (TTC) ; si et seulement si elle réussit → statut `PAID` + notification ALL SUCCESS + **écriture auto ACHAT** (601 HT / 445 TVA / 521 TTC). ⚠ L'écriture **rétrocalcule la TVA depuis le TTC quel que soit le tvaAmount réel** : une dépense sans TVA produit de la TVA fictive (trou T12).

**C4. Rejet.** Bouton ✕ + motif obligatoire (prompt) → `REJECTED` + notification ALL WARNING avec motif.

**C5. Annulation logique.** Bouton ⊘ + confirm → `CANCELLED`, exclue des calculs.

**C6. Justificatifs.** `attachmentUrl` prévu dans le type mais **aucun upload dans l'UI** (trou T13).

---

### D — TRÉSORERIE

**D1. Création de compte.** Nom + type (**BANQUE / CAISSE / MOBILE_MONEY**) + solde initial ≥ 0. Réservé GERANT/COMPTABLE (serveur).

**D2. Transactions automatiques.** Encaissements (CREDIT VENTE), acomptes (CREDIT ACOMPTE_CLIENT), dépenses (DEBIT), remboursements (DEBIT), paie (3 DEBIT : net/CNSS/RTS). Validation serveur : type, compte, montant > 0, delta de solde appliqué.

**D3. ⚠ Transfert interne.** Supporté par le serveur (débite la source, crédite la cible) mais **aucun bouton UI** (trou T14).

**D4. ⚠ Découvert.** Aucune garde : un DEBIT peut rendre le solde négatif (trou T15).

**D5. ⚠ Rapprochement bancaire.** Champ `isReconciled` jamais édité, aucun écran (trou T16). Pas d'édition/annulation de transaction.

---

### E — COMPTABILITÉ GÉNÉRALE

**E1. Écritures auto.** VENTE (VT : 521=TTC / 701=HT / 443=TVA), ACHAT (AC : 601=HT / 445=TVA / 521=TTC), SALAIRE (BQ : 661=coût total / 521=coût total — **sans ventilation 422/431**). Toutes naissent **DRAFT**. ⚠ Si le plan comptable est vide → **retour silencieux** (rien, aucune alerte) ; si un compte 52/70/60/66 manque → **fallback sur le premier compte de la liste** (compte au hasard) (trou T17).

**E2. Écriture manuelle.** Partie double : journal (VT/AC/BQ/CA/OD), date, réf, libellé, N lignes débit/crédit **mutuellement exclusives** ; garde équilibre |D−C| < 0,01 ET D > 0 côté client + serveur.

**E3. Validation/verrouillage.** Confirm « irréversible (piste d'audit légale) » → `VALIDATED` + date. Aucune route de suppression d'écriture n'existe.

**E4. Bilan & P&L.** **Uniquement les écritures VALIDATED**. Classes 1-5 → Actif/Passif, 6-8 → Charges/Produits. Résultat net = Produits − Charges. Contrôle d'équilibre |Actif − (Passif + Résultat)| < 1 GNF → badge ÉQUILIBRÉ/DÉSÉQUILIBRÉ. ⚠ Les écritures auto DRAFT n'alimentent **rien** tant que non validées manuellement (trou T18) ; pas de compte 12 (résultat) au plan.

**E5. Plan comptable SYSCOHADA.** 19 comptes seed (101, 162, 213, 241, 244, 311, 401, 411, 422, 431, **443**, **445**, 521, 571, 601, 613, 661, 701, 706), 5 journaux (VT/AC/BQ/CA/OD). Création de compte (classe/numéro/libellé). Pas de modification/suppression.

**E6. TVA.** Collectée = solde créditeur du 443 (VALIDATED) ; Déductible = solde débiteur du 445 ; Nette = C − D → « à décaisser » ou « crédit de TVA ». ⚠ **Aucune périodicité** (cumul depuis l'origine) ; export TVA incohérent (période affichée = mois courant, données = tout l'historique) ; 2 bases de calcul différentes (écritures vs transactions) (trou T19). Déclaration : placeholder « Bientôt disponible ».

**E7. Immobilisations.** Création (compte classe 2, valeur > 0, date, **LINEAIRE ou DEGRESSIF**, durée). Amortissement **prorata en jours / année 360 j** calculé à la volée, VNC. ⚠ **DEGRESSIF jamais implémenté** (calcul toujours linéaire) ; **aucune écriture d'amortissement** (compte 28 absent) ; **aucune cession** (trou T20).

**E8. Exports CSV** (`;`, BOM UTF-8) : Journal de trésorerie (avec totaux), Déclaration TVA, Situation projets. ⚠ Pas d'export du grand livre/balance/bilan/dépenses/paies malgré le commentaire.

---

### F — RH / PAIE

**F1. Création employé.** Prénom/nom/email/tél/poste/**département (5 valeurs : Direction, Commercial, Comptabilité, RH, Technique)**/salaire de base/date d'embauche. `isActive: true`. ⚠ CNSS, RIB, urgence, marital, adresse : **affichés en détail mais jamais saisissables ni éditables** (backend `updateEmployee` existe, jamais branché) (trou T21). Checklist d'onboarding **hardcodée non cliquable**.

**F2. Contrats.** Types : **CDI, CDD, STAGIAIRE, FREELANCE, APPRENTI** (libellé « Alternance »). Garde : date de fin obligatoire pour CDD/STAGIAIRE/APPRENTI. Statut forcé ACTIVE. Alertes dashboard : période d'essai < 15 j (ambre), CDD/Stage fin < 30 j (rose). ⚠ Pas de renouvellement, jamais de passage auto à EXPIRED, pas de terminaison, **pas de PDF de contrat** (trou T22).

**F3. Congés.** Types : ANNUAL, SICK, MATERNITY, PATERNITY, RTT, UNPAID, EXCEPTIONAL. Jours = ceil((fin−début)/1j)+1, min 1. Workflow PENDING → APPROVED/REJECTED (RH ou GÉRANT ; motif obligatoire au refus). Notifications : création → GERANT INFO ; décision → ALL. Garde serveur self-service : un non-RH ne peut demander que pour lui-même (⚠ non reflété côté front : le sélecteur liste tous les employés). ⚠ **endDate < startDate accepté** (jours forcés à 1) ; **aucun décompte de solde** (leaveBalance jamais décrémenté) ; **aucun effet sur la paie** (UNPAID ne déduit rien) (trou T23).

**F4. Calcul de paie (exact).** Base = salaire + heures sup (suggestion auto : heures BTP × 25 000 GNF, taux codé dur).
```
CNSS salarié  = base × 5 %        (rhCnssEmployeeRate configurable)
CNSS patronal = base × 13 %       (stockée, hors net, coût employeur)
RTS           = base × (1−20 %) × 10 %   (abattement puis taux)
Net à payer   = base − CNSS salarié − RTS
Coût total    = net + CNSS (sal.+pat.) + RTS
```
⚠ **Plafond CNSS (`rhCnssCeiling`) défini mais jamais appliqué** ; **SMIG jamais vérifié** (on peut payer sous le SMIG) ; primes forcées à 0 ; `deductions` ignoré ; `rhRtsRate` non éditable en UI (trou T24).

**F5. Génération + validation.** RH (ou gérant) génère → `DRAFT` + notification COMPTABLE INFO (« attend le paiement »). Validation → `VALIDATED` (RH ou gérant). ⚠ **Aucune unicité employé+mois+année** : 2 fiches pour le même mois possibles (trou T25).

**F6. Paiement.** **GÉRANT SEUL** (bouton invisible pour RH/comptable) : modal choix du compte → `PAID` + **3 transactions** (DEBIT net/SALAIRE, DEBIT CNSS totale/CHARGES_SOCIALES, DEBIT RTS/IMPOTS) + **écriture auto BQ** (661 = coût total / 521 = coût total). ⚠ **Aucune garde de transition** : re-payer une fiche re-génère transactions + écriture (**double comptabilisation**) (trou T26). ⚠ Le comptable notifié **ne voit aucune fiche de paie** dans sa vue (aucune référence à payslips dans AccountantView).

**F7. PDF bulletin.** ⚠ Bouton Download **sans handler** — aucun bulletin PDF n'existe dans pdfGenerator (trou T27).

**F8. ⚠ Onglets « Mon Dossier / Mes Absences / Mes Bulletins » (non-RH).** Rendus pour COMMERCIAL/COMPTABLE/ASSISTANTE mais **sans aucun filtrage** : un commercial voit **tous les employés, tous les congés, toutes les fiches de paie de l'entreprise** (trou T28 — le plus grave côté confidentialité).

**F9. Placeholders.** Pointage (bouton sans onClick), Notes de frais, Talent/OKRs/Formations, Visites médicales, Disciplinaire : **statiques**. `registerSalaryAdvance` : fonction orpheline (crée une tâche comptable HIGH) jamais appelée.

---

### G — ASSISTANTE DE DIRECTION

**G1. Réunions.** Création (titre requis ; lieu, date, heure, participants texte libre, ordre du jour). Actions : marquer tenue (PLANNED↔HELD), supprimer, **rédiger/modifier le C.R.** (prompt navigateur, stocké dans `report`, affiché sous la carte). ⚠ Statut CANCELED défini mais **aucun bouton** pour annuler une réunion.

**G2. Déplacements.** Destination (requise), motif, dates, budget prévisionnel GNF. Suppression. ⚠ **Aucune validation endDate > startDate** ; aucun bouton de changement de statut (Planifié/En cours/Terminé affichés mais figés) ; bouton « Voir itinéraire » **sans handler**.

**G3. Requêtes internes reçues.** Tâches à destination ASSISTANTE : « En cours » (TODO→IN_PROGRESS), « Terminer » (→DONE). Badge URGENT si HIGH.

**G4. Matrice Eisenhower.** Tâches classées par Importance × Urgence en 4 quadrants. Création avec **date d'échéance (stockée, jamais exploitée)** et **délégation** : si délégué à un rôle → une vraie tâche globale `addTask` est poussée dans la boîte du rôle (avec délégation d'absence appliquée). ⚠ En **édition**, changer le délégué ne re-pousse pas de tâche. Actions : avancer statut, éditer, supprimer.

**G5. GED.** Document : titre, catégorie (ADMINISTRATIF/CONTRAT/ASSURANCE/LEGAL/AUTRE), date d'expiration optionnelle, **URL externe** (pas d'upload de fichier), statut. Badge dynamique : EXPIRÉ (<0 j), EXPIRE BIENTÔT (≤30 j). Actions : ouvrir l'URL, archiver, éditer, supprimer. ⚠ **Case « Strictement Confidentiel » purement décorative** : aucun filtrage par rôle — quiconque accède à la vue voit tout (trou T29).

**G6. Agent ARIA.** Chat simulé (setTimeout 1,5 s → template de lettre fixe). Copier (clipboard OK). ⚠ « Sauvegarder dans GED » crée une entrée **vide** — le contenu généré n'est pas stocké.

**G7. Carnet VIP.** Contacts (nom, organisation, rôle, catégorie PARTENAIRE/INVESTISSEUR/INSTITUTION/PRESTATAIRE/AUTRE, tél, email, notes) ; isVip forcé true. Édition/suppression. ⚠ Recherche par **manipulation directe du DOM** (fragile).

**G8. Requêtes automatiques reçues.** Projet annulé → tâche « Classer le dossier annulé » (MEDIUM). Incident QHSE critique → tâche URGENCE (HIGH).

⚠ **Aucun rappel automatique** n'existe pour l'agenda (l'API `agendaEvents` est orpheline, jamais appelée par aucune vue).

---

### H — GÉRANT

**H1. Dashboard.** Trésorerie globale (Σ soldes), **CA encaissé** (= Σ tranches réellement PAYÉES ; projet PAID sans plan → budget entier ; + situations BTP facturées si module actif) vs CA attendu (Σ budgets), dépenses en attente (rouge si > 0), collaborateurs, fil d'activité (15 dernières notifications, **toutes cibles**), tâches escaladées (HIGH + TODO + > 48 h), congés approuvés en cours.

**H2. Pipeline.** Liste + filtres (recherche **nom uniquement**, période, avancement — PAYE/ANNULE non filtrables, paiement). Actions : détail (lecture seule), **supprimer** (confirm). **Aucune création/édition** — le gérant passe par le Mode Souverain.

**H3. Prospection.** Table lecture seule + suppression. Pas de création/édition (vue Commercial via Mode Souverain).

**H4. Équipe.** Création de compte : prénom, nom, identifiant (auto-normalisé), mot de passe ≥ 8, **rôle limité à COMMERCIAL/COMPTABLE/RH/GERANT** — ⚠ **impossible de créer un compte ASSISTANTE depuis l'UI** (trou T30). Suppression (confirm) sauf `admin` et le dernier gérant actif (garde serveur). ⚠ Pas d'édition de rôle/mot de passe, pas de désactivation sans suppression.

**H5. Configuration.** Modules métier (toggle BTP + garde chantiers actifs), délégations d'absence (5 rôles), paie Guinée (SMIG 440 000, CNSS 5/13 %, abattement RTS 20 % — ⚠ `rhRtsRate` et plafond CNSS non éditables), matrice permissions BTP. ⚠ **Identité entreprise, logo, cachet, signature vivent côté COMPTABLE** (AccountantSales) ; **le taux de TVA n'est éditable NULLE PART** (18 % codé dur en défaut) (trou T31).

**H6. Mode Souverain.** Le gérant bascule `currentRole` vers n'importe quel rôle → la vue change. ⚠ Incohérences : TaskBoard et Messenger filtrent sur `currentUser.role` (restent GERANT) ; notifications suivent `currentRole` (le gérant déguisé perd ses alertes GERANT) ; les envois restent signés GERANT côté serveur.

---

### I — TRANSVERSE

**I1. Tâches & requêtes.** Création par n'importe quel rôle : destinataire (ALL/GERANT/COMMERCIAL/COMPTABLE/RH/ASSISTANTE), priorité LOW/MEDIUM/HIGH, titre, contenu. Seul le destinataire change le statut (TODO→IN_PROGRESS→DONE, immuable). **Escalade auto** : HIGH + TODO + > 48 h → `escalated: true` persisté + alerte dashboard gérant. **Délégation d'absence** : appliquée dans `addTask` uniquement (destinataire réécrit + préfixe « [Délégué depuis X] »).

**I2. Messagerie.** Canaux par rôle (Général, Direction, Commercial, Comptable†, RH†, Assistante — †libellés croisés à vérifier). Anti-usurpation serveur (expéditeur dérivé du token). Pièces jointes réelles (upload authentifié, ouverture sécurisée blob 60 s). Accusés ✓/✓✓. Badges non-lus. ⚠ `isRead` **global au message** : si 2 comptes partagent un rôle, le premier qui lit efface le badge de l'autre. Pas de 1:1 par utilisateur.

**I3. Notifications.** Cloche filtrée par rôle courant, 12 max affichées, pastilles par type. ⚠ Lecture **globale par rôle** ; champ `link` stocké mais jamais utilisé pour naviguer ; pas de « tout marquer lu » ; pas d'émetteur tracé.

---

## PARTIE 3 — SYNTHÈSE DES TROUS PAR CRITICITÉ

### 🔴 CRITIQUE (fausse la comptabilité / la confidentialité / bloque un flux)
| # | Trou | Localisation |
|---|------|--------------|
| T9 | Acompte créances : créance non réduite, pas d'écriture, pas de TVA | `AccountantReceivables.tsx:93-133` |
| T28 | « Mon Dossier » RH : tous les employés/paies visibles par tous les rôles | `RhView.tsx:121-125` |
| T12 | TVA fantôme : écriture ACHAT rétrocalcule la TVA même si tvaAmount=0 | `store.tsx:2308-2310` |
| T26 | Re-paiement de paie = double comptabilisation (aucune garde de transition) | `store.tsx:1386-1434` |
| T5 | Paiement partiel de la dernière tranche → projet jamais PAYE | `store.tsx:951-953` |
| T7 | Encaissement montant ≤ 0 accepté (aucune garde basse) | `store.tsx:879+` |
| T1 | Devis ACCEPTED ne crée rien — `proposalId` jamais alimenté | `store.tsx:1315-1323` |
| T2 | « Confirmer la commande » muet (aucune notification compta) | `store.tsx:1077-1079` |

### 🟠 MAJEUR (données fausses ou fonctionnalités fantômes)
| # | Trou |
|---|------|
| T8 | Numérotation REC/PRO non atomique → doublons possibles |
| T10 | Remboursement : fonction complète sans UI |
| T11 | Montants négatifs acceptés en dépenses |
| T17 | Écritures auto : fallback compte au hasard + retour silencieux si plan vide |
| T18 | Écritures auto DRAFT jamais validées → bilan/TVA vides |
| T24 | Plafond CNSS et SMIG configurés mais jamais appliqués |
| T25 | Doublons de paie (pas d'unicité employé+mois) |
| T27 | PDF bulletin de paie inexistant (bouton mort) |
| T29 | GED « Confidentiel » non protégé |
| T30 | Impossible de créer un compte ASSISTANTE depuis l'UI |
| T31 | Taux de TVA non éditable ; identité/cachet/signature côté comptable uniquement |
| T6 | Message « Créez un avoir » mais aucun avoir n'existe |

### 🟡 MOYEN (UX / robustesse)
T3 (devis HT étiqueté TTC), T4 (motif de perte jamais capturé), T13 (justificatifs dépenses sans upload), T14 (transfert interne sans UI), T15 (pas d'anti-découvert), T16 (rapprochement inexistant), T19 (TVA sans périodicité, 2 bases), T20 (dégressif non implémenté, pas de cession), T21 (CNSS/RIB non saisissables), T22 (contrats sans PDF/expiration), T23 (congés sans effet paie/solde), Kanban sans contrainte, périmètres CRM/reporting incohérents, délégations partielles (notifications/messagerie non reroutées), isRead partagé par rôle, Mode Souverain incohérent, objectif commercial hardcodé, recherche projet sans client, exports manquants (grand livre, paies).

---

## PARTIE 4 — MATRICE DES NOTIFICATIONS CORE

| Événement | → Destinataire | Type |
|-----------|----------------|------|
| Affaire convertie (prospect→projet) | GERANT | SUCCESS |
| Projet annulé | COMPTABLE | ERROR |
| Projet annulé | ASSISTANTE (tâche) | MEDIUM |
| Encaissement reçu (HT/TVA détaillés) | COMPTABLE | SUCCESS |
| Acompte créances enregistré | COMMERCIAL | SUCCESS |
| Relance manuelle créance | COMMERCIAL | WARNING |
| Relance auto J+7 / J+30 | COMMERCIAL / GERANT | WARNING / ERROR |
| Relance auto J+14 | COMMERCIAL (tâche) | HIGH |
| Alerte impayé | COMMERCIAL | ERROR |
| Remboursement | GERANT | INFO |
| Dépense soumise | COMPTABLE | INFO |
| Dépense payée / rejetée | ALL | SUCCESS / WARNING |
| Demande de congé | GERANT | INFO |
| Congé approuvé/refusé | ALL | SUCCESS/WARNING |
| Fiche de paie générée | COMPTABLE | INFO |

## PARTIE 5 — DOCUMENTS GÉNÉRÉS CORE

| Document | Numéro légal (base) | Réf. affichée PDF | Écart |
|----------|--------------------|--------------------|-------|
| Devis | aucun | DEV-{id8} | hors compteur |
| Proforma | PRO-2026-NNN | PRO-{client5}-{année}-{id4} | ⚠ ≠ |
| Reçu | REC-2026-NNN | RE-{id6}-{année} | ⚠ ≠ |
| Facture FAC | préfixe prévu, **jamais utilisé** | — | — |
| Bulletin paie / contrat | — | — | inexistants |
