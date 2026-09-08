# AUDIT FINAL — SIMULATION EXHAUSTIVE DU CORE (V2)
> 5 simulations parallèles : Gérant · Assistante · Comptable · RH · Commercial.
> Chaque bouton, chaque formulaire, chaque flux tracés UI → store → API → gardes → effets.
> Calculs (paie, écritures, KPI) refaits à la main. Septembre 2026.

---

## RÉPONSE À LA QUESTION POSÉE : LE COMPTE ASSISTANTE

**La création fonctionne** (vérifiée en live sur la production) : option « Assistante de Direction » dans Équipe & Config, rôle accepté par /auth/register, login OK, interface alimentée. L'impression venait d'avant la correction T30.

**MAIS l'audit confirme un défaut de finition de son espace** : 5 corbeilles visibles mais **mortes (403)**, upload de pièces jointes **mort** (route inexistante), 1 **crash bloquant** (budget de déplacement vide), statuts de déplacement **figés**, bouton « Voir itinéraire » **sans handler**. Détail ci-dessous.

---

## 🔴 12 PROBLÈMES CRITIQUES

| # | Problème | Où | Gravité métier |
|---|----------|-----|----------------|
| **C1** | **Relances auto J+7/J+14/J+30 qui spamment** : la dédup lit des notifications filtrées par rôle → un gérant connecté re-POST la relance COMMERCIAL toutes les 15 s ; la tâche J+14 est recréée à chaque poll ; fenêtres à journée exacte (relance perdue si personne ne poll ce jour-là). Le mécanisme dedupKey (B-8) existe mais n'est pas utilisé ici | `store.tsx:605-635` | Spam + fausses alertes |
| **C2** | **Filtre « Avancement » du Pipeline totalement inopérant** : le select émet STARTING/IN_PROGRESS/COMPLETED, le hook teste NOUVEAU/EN_COURS/TERMINE → aucune branche ne matche, tout s'affiche. PAYE/ANNULE non filtrables du tout | `ProjectFilterBar.tsx:58-60` vs `useProjectFilter.ts:66-73` | Filtre mensonger |
| **C3** | **Numérotation légale corrompue par les sauvegardes partielles de config** : chaque champ de l'onglet Équipe poste `updateCompanyConfig({clé:valeur})` — l'objet partiel remplace le ref → `docCounters` perdu → REC-2026-**001 en doublon** ; le merge serveur superficiel remplace toute la map (perte des compteurs PRO/MAR/SIT) | `ManagerView.tsx` (12 appels partiels) + `store.tsx:1257` + `api/index.ts:489` | Doublons de numéros légaux |
| **C4** | **Le COMPTABLE ne peut rien enregistrer dans la config** (signature, cachet, identité, objectifs) : /config/update est GERANT-only → 403 systématique + toasts d'erreur parasites. **En cascade : la numérotation REC/PRO ne persiste jamais pendant une session comptable** → doublons | `api/index.ts:487` | Blocage + doublons |
| **C5** | **Upload de pièces jointes mort en production** : le trombone poste /api/uploads — cette route n'existe pas dans l'API Vercel → 404 « Upload impossible » à chaque essai, pour tous les rôles | `InternalMessenger.tsx:75` | Fonctionnalité morte |
| **C6** | **T28 inopérant pour les non-RH** : /data n'envoie employees/payslips/leaves qu'aux RH_ROLES → « Mon Dossier », « Mes Bulletins » **toujours vides** pour un commercial ; et sa demande de congé (autorisée par l'UI verrouillée sur soi) → **403 silencieux** : le modal se ferme, rien n'est créé, aucun message | `api/index.ts:355-360` + `store.tsx:1457-1465` | Self-service RH factice |
| **C7** | **Double-encaissement possible** : aucun verrou bouton, aucune garde « tranche déjà PAID », closure périmée sur la garde anti-surplus → 2 clics = 2 reçus, 2 transactions, 2 écritures VALIDATED, TVA comptée 2× | `store.tsx:994-1003` + `AccountantSales.tsx:551,721` | Comptabilité faussée |
| **C8** | **Assistante : 5 corbeilles mortes (403)** — réunions, déplacements, contacts VIP, tâches Eisenhower, documents GED : la suppression CRUD est GERANT-only mais l'UI lui présente la corbeille → toast « Accès refusé » à chaque clic | `api/index.ts:1105` + 5 vues assistant | Espace inachevé |
| **C9** | **Crash bloquant côté Assistante** : vider le budget d'un déplacement → NaN → null stocké → `null.toLocaleString()` au polling suivant → ErrorBoundary ; et sa seule sortie (supprimer) est en 403 → **l'Agenda reste en crash jusqu'à l'intervention du gérant** | `AssistantAgenda.tsx:150,172` | Écran bloqué |
| **C10** | **Kanban CRM sans machine à états** : PERDU→GAGNE par glisser-déposer sans confirmation ni création de projet → prospects « GAGNE » fantômes comptés en CA au reporting ; contournement total de « Gagner l'Affaire » et de sa garde CHAUD | `ProspectionCRM.tsx:248-267` | CRM faussé |
| **C11** | **« Gagner l'Affaire » à échec silencieux** : la vue ignore le retour de convertProspectToProject → confirm refusé ou POST échoué = prospect quand même GAGNE + alerte de succès | `ProspectionCRM.tsx:670-672` | Faux succès |
| **C12** | **Logout ne vide pas les données** : seuls 4 états sont réinitialisés → après logout + login d'un autre compte sur le même navigateur, le nouveau rôle voit les données du précédent (notifications, trésorerie, employés, écritures…) pendant plusieurs secondes | `store.tsx:731-737` | Fuite inter-comptes |

## 🟠 MAJEURS (16)

| # | Problème |
|---|----------|
| M1 | **Fuite /data** : accountingEntries (grand livre), assets, catalogue, proposals + les 7 tables agro envoyés à TOUS les rôles (assistante, commercial…) — présents dans la mémoire/network du navigateur |
| M2 | **L'Assistante peut créer et SIGNER des marchés BTP** (canManage l'inclut + API l'autorise) — hors de son périmètre, d'autant que la signature est un acte de direction |
| M3 | **Sidebar BTP/AGRO visible par tous les rôles** → vues vides muettes (elle ne reçoit presque aucune table BTP) |
| M4 | **Délégations d'absence quasi décoratives** : appliquées uniquement dans addTask côté client — pas les notifications, pas la messagerie, pas le serveur |
| M5 | **Mode Souverain incohérent** : change currentRole mais ni les données reçues ni l'identité JWT → cloche quasi vide, tâches/messages signés GERANT, TaskBoard figé |
| M6 | **Incident impayé sans contrepassation** : la tranche reste PAID, transaction et écriture VALIDATED restent → trésorerie/bilan/TVA gonflés alors que l'UI dit « suspendu » |
| M7 | **T9 (acompte créances) désynchronise l'échéancier** : la tranche ajoutée n'est pas déduite des autres → Σ > budget, puis le paiement du solde est refusé « TROP-PERÇU » de façon incompréhensible |
| M8 | **L'acompte créances ne persiste aucun reçu** dans project.documents → impossible à re-télécharger |
| M9 | **Remboursement client comptabilisé en charge** (Débit 601) au lieu d'extourner la vente (701/443) → résultat minoré |
| M10 | **Écritures VALIDATED modifiables par l'API** (le « verrouillage irréversible » n'est que UI) + la validation T18 se fait en 2 appels non atomiques |
| M11 | **RH peut payer les paies via l'API** (la règle « Gérant seul » n'est qu'un bouton masqué) + les écritures de paie sont générées côté client uniquement → une fiche peut devenir PAID sans écriture |
| M12 | **Bouton « Modifier » du catalogue mort + impasse d'accès** : le catalogue n'est gérable que par le Mode Souverain, et aucun article ne peut être modifié/supprimé dans l'UI |
| M13 | **Échecs silencieux généralisés** : suppression de compte (gardes serveur jamais affichées), relance créances sans dédup, échecs crudCreateItem ignorés dans les 6 formulaires assistant, MAJ optimistes RH sans rollback |
| M14 | **Escalade 48h myope** : calculée seulement par un client qui voit la tâche ; invisible au gérant pour les autres rôles ; le `link` des notifications n'est jamais exploité (pas de navigation) |
| M15 | **Encaissements Ventes créditent toujours le 1er compte de trésorerie** avec mode VIREMENT forcé (le choix de compte/mode n'existe que dans la modale Créances) |
| M16 | **Statuts déplacement figés + bouton « Voir itinéraire » mort + dates inversées acceptées** (Assistante) ; idem annulation de réunion impossible |

## 🟡 MINEURS (sélection)

Recherche pipeline sur le nom seulement (placeholder mensonger) · KPI CRM globaux vs périmètre personnel (3 périmètres incohérents dans le même espace) · remise/quantité devis non clampées (150 % possible) · budget prospect texte libre (« 5 millions » → 5 GNF) · commercial non notifié des acomptes encaissés · CSV sans dédoublonnage ni séparateur « ; » · RDV force le stage (régression GAGNE→RDV_FIXE) · isRead global (lecture partagée entre rôles) · relances réinitialisées par le re-datage J+21 systématique · proforma chiffré sur budget ≠ prix négocié · TVA export : période affichée vs données cumulées + 2 bases de calcul divergentes · immobilisations sans écriture et dégressif factice · tranches sautées liées au même reçu · exceptions TVA flottantes (3×33,33 % refusé) · PAID→REJECTED libre sur dépenses sans extourne · motif de rejet vide accepté · année de paie forcée · heures sup BTP en defaultValue figé (mauvais employé possible) · rhCnssCeiling/rhRtsRate non éditables (le plafond T24 vaut donc toujours 0 en pratique !) · notifications congés → ALL (bruit) · compte 12 absent du plan · échec ARIA sauvegardé quand même · empty-state GED sur mauvaise variable · statuts tâches affichés en anglais · monnaie €/GNF ambiguë · checklist onboarding figée · registerSalaryAdvance orphelin · payslips modifiables après validation (pas de whitelist serveur)

## ✅ VÉRIFIÉS CONFORMES (résistance aux corrections récentes)

T1 (devis ACCEPTED : lien + notif + NEGOCIATION, ordre exact, edges gérés) · T2 (notif COMPTABLE) · T5 (tranche complémentaire + fullyPaid par total) · T7/T11 (gardes montants, front + serveur) · B-9 (CANCELLED exclu) · T25/T26 paie (409 doublon, machine à états serveur, calcul CNSS/RTS exact refait à la main : net 957 000 pour brut 1 100 000) · T27 PDF bulletin · fusion créances Core+BTP · écritures VENTE/ACHAT/SALAIRE équilibrées et auto-validées · gardes rôle serveur systématiques · exclusive débit/crédit OD · T29 confidentiel des deux côtés · tâches auto vers ASSISTANTE.

---

## PRIORITÉS DE CORRECTION PROPOSÉES

1. **C3+C4** (numérotation + config comptable) — risque légal immédiat, même racine : full-spread de la config + élargissement /config/update à FINANCE
2. **C1** (spam relances) — passer sur dedupKey + plages, comme le B-8 BTP
3. **C7** (double-encaissement) — garde statut tranche + verrou bouton
4. **C6** (self-service RH) — tables filtrées par employé dans /data + route congé self-service
5. **C8+C9+C16/M16** (espace Assistante) — suppression par rôles propriétaires, garde budget, statuts déplacement, itinéraire
6. **C2** (filtre avancement) — aligner les valeurs
7. **C5** (upload) — route /api/uploads sur Vercel (stockage base64 en documents)
8. **C10+C11** (CRM) — machine à états kanban + retour de conversion géré
9. **C12** (logout) — reset complet des états
10. M1/M2/M3 (fuites /data + périmètre assistante) — même chantier que B-16
