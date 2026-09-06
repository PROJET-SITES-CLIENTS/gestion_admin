# Pattern d'Architecture : "Modules Sectoriels Compartimentés" (Vertical-to-Core)

## 1. Philosophie Générale
L'ERP "Gestion Admin" a vocation à être générique dans son noyau (Core), tout en supportant des logiques métiers extrêmement spécifiques à certains secteurs d'activité (BTP, Agro, Retail, Restauration...).

Pour éviter que le **Core** ne devienne une "usine à gaz" ingérable contenant les règles de tous les métiers, nous utilisons le pattern **"Vertical-to-Core" (ou Package Métier Compartimenté)**.

**Le principe fondamental :**
> *Chaque secteur (ex: BTP) est un silo opérationnel étanche avec ses propres entités, son propre lexique et sa propre comptabilité analytique. Cependant, chaque mouvement financier de ce silo redescend (remonte) obligatoirement sous forme d'écriture standardisée dans le Grand Livre Comptable du Core.*

## 2. Structure d'un Module Sectoriel (ex: BTP)

Un module sectoriel est structuré autour des piliers suivants :

1. **Dashboard Sectoriel** : Vue métier pure (Ex: Chantiers en cours, rentabilité chantier).
2. **Gestion Opérationnelle** : Entités propres au métier (Ex: `btpChantiers`, `btpEngins`, `btpSituations`).
3. **Logistique & Stocks Métier** : Silo de stock spécifique, valorisé selon les règles du métier (Ex: Magasin BTP, retour chantier).
4. **Comptabilité Analytique Métier** : Vue financière micro (Ex: Dépenses vs Budget d'un chantier précis, retenues de garantie).

## 3. La Règle d'Or de Synchronisation (Le Pont "Vertical → Core")

### Ce qui reste dans le vertical :
- Les devis métiers complexes (ex: Devis avec lots, phases, avenants).
- Les factures de situation (avancement en %).
- Le suivi des heures spécifiques.

### Ce qui est synchronisé vers le Core :
Chaque événement à impact financier ou RH général doit déclencher un **Hook de Synchronisation** vers le Core.

| Action dans le Module Sectoriel | Résultat dans le Core |
| :--- | :--- |
| Validation d'une **Facture Client BTP** | Génération automatique d'une écriture au **Crédit (Vente)** dans le Grand Livre (Core). |
| Validation d'une **Dépense Chantier** | Génération automatique d'une écriture au **Débit (Charge)** dans le Grand Livre (Core). |
| Validation des **Heures travaillées** (Chantier) | Remontée des heures brutes dans le **Module RH (Core)** pour l'édition de la paie. |

### Flux Unidirectionnel
La logique de remontée est **strictement unidirectionnelle** pour les détails analytiques :
**Détail Analytique (BTP) ➡️ Écritures Générales Consolidées (Core)**
*(On ne modifie jamais une facture BTP depuis le module Comptable Core. Le Core est en lecture seule sur les données générées par les modules sectoriels).*

## 4. Avantages de ce Pattern

1. **Évolutivité (Scalabilité)** : Demain, si l'on ajoute un module "Restauration", le Core Comptable n'aura pas besoin d'être réécrit. Le module Restauration se contentera de "pousser" ses tickets de caisse dans le Grand Livre via l'API standard.
2. **Maintenabilité** : Les bugs d'un module (ex: Agro) n'impactent pas les opérations du BTP.
3. **Sécurité et Droits (RBAC)** : 
   - Le *Chef de Chantier* ne voit que son silo opérationnel.
   - Le *Comptable BTP* voit tout le silo BTP.
   - Le *Comptable Core* voit la santé de l'entreprise globale, sans être pollué par les avenants ou les pointages de chantier.

## 5. Standardisation pour les Futurs Modules
Pour tout nouveau package sectoriel (Retail, Transport...), le développeur devra implémenter :
1. Les **Tables** préfixées (`retailSales`, `retailStocks`).
2. Les **Contrôleurs Métiers** (`RetailController.php`).
3. Les **Vues** dédiées dans `src/views/retail/`.
4. Les **Hooks financiers** (Appels à `AccountingService::createEntry()` lors des encaissements/décaissements).
