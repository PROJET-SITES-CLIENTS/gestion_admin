<?php
namespace App\controllers;

use App\core\Request;
use App\core\Response;
use App\core\Database;
use App\core\AuthMiddleware;
use App\core\Sanitizer;

/**
 * CRUD générique déclaratif pour les tables de données structurées :
 * modules BTP, Agro et Assistante.
 *
 * Pourquoi : ces tables étaient manipulées uniquement en mémoire côté React
 * (setState local) — toute modification était PERDUE au rechargement de page.
 *
 * Sécurité :
 *  - Tables déclarées dans une liste blanche (aucune table arbitraire).
 *  - Champs validés/nettoyés selon un schéma déclaratif par table.
 *  - Rôles autorisés par table ; identifiants générés côté serveur.
 *
 * Routes :
 *   POST /api/crud/{table}                création
 *   POST /api/crud/{table}/{id}/update    mise à jour partielle
 *   POST /api/crud/{table}/{id}/delete    suppression
 */
class CrudController {

    /** Rôles autorisés sur les tables BTP. */
    private const BTP_ROLES = ['GERANT', 'COMMERCIAL', 'ETUDES', 'COND_TRAVAUX', 'CHEF_CHANTIER', 'QHSE_BTP', 'RESP_MATERIEL', 'MAGASINIER_BTP', 'DEVELOPPEUR'];
    /** Rôles autorisés sur les tables Agro. */
    private const AGRO_ROLES = ['GERANT', 'COMMERCIAL', 'RESP_PRODUCTION', 'RESP_QUALITE', 'RESP_AGRO', 'RESP_STOCKAGE', 'RESP_TRACABILITE', 'DEVELOPPEUR'];
    /** Rôles autorisés sur les tables Assistante. */
    private const ASSISTANTE_ROLES = ['GERANT', 'ASSISTANTE', 'COMMERCIAL', 'DEVELOPPEUR'];

    /**
     * Schéma déclaratif : table => [idKey, roles, createDefaults (callable-free),
     * fields => [champ => spec], autoPrefix (format d'id serveur)]
     * Types de spec : text (max), multiline, int, float, bool, date, enum (valeurs), array.
     */
    private const TABLES = [
        'btpOffres' => [
            'idKey' => 'id', 'roles' => self::BTP_ROLES,
            'defaults' => ['statut' => 'repérée'],
            'userField' => 'created_by',
            'fields' => [
                'client' => ['text', 200], 'objet' => ['text', 300],
                'montant_estime' => ['float'], 'date_limite_depot' => ['date'],
                'date_depot' => ['date'], 'chiffrage_json' => ['multiline', 100000],
                'marge_calculee' => ['float'], 'commentaire_validation_financiere' => ['multiline', 3000],
                'resultat' => ['enum', ['gagnée', 'perdue', 'retirée']],
                'statut' => ['enum', ['repérée', 'en_chiffrage', 'en_validation_financiere', 'en_validation_dg', 'déposée', 'gagnée', 'perdue', 'retirée']],
            ],
        ],
        'btpChantiers' => [
            'idKey' => 'id',
            // RH inclus : validation rh_validation du circuit de démarrage (Phase 3).
            'roles' => ['GERANT', 'RH', 'COMMERCIAL', 'ETUDES', 'COND_TRAVAUX', 'CHEF_CHANTIER', 'QHSE_BTP', 'RESP_MATERIEL', 'MAGASINIER_BTP', 'DEVELOPPEUR'],
            'defaults' => ['statut' => 'planification'],
            'fields' => [
                'offre_id' => ['text', 64], 'nom' => ['text', 250], 'client' => ['text', 200],
                'adresse' => ['text', 300], 'date_debut_prevue' => ['date'], 'date_fin_prevue' => ['date'],
                'budget_initial' => ['float'], 'conducteur_travaux_id' => ['text', 64],
                'chef_chantier_id' => ['text', 64],
                'budget_detail' => ['array'],
                'rh_validation' => ['bool'], 'materiel_validation' => ['bool'],
                'qhse_unlock' => ['bool'], 'dg_unlock' => ['bool'],
                'statut' => ['enum', ['planification', 'en_cours', 'suspendu', 'réception_provisoire', 'réception_définitive', 'clôturé']],
            ],
        ],
        'btpEngins' => [
            'idKey' => 'id', 'roles' => self::BTP_ROLES,
            'fields' => [
                'type' => ['text', 100], 'identifiant_interne' => ['text', 50],
                'chantier_affecte_id' => ['text', 64], 'compteur_horaire' => ['float'],
                'date_derniere_maintenance' => ['date'], 'date_prochaine_maintenance_prevue' => ['date'],
                'statut' => ['enum', ['disponible', 'affecté', 'en_maintenance', 'hors_service']],
            ],
        ],
        'btpIncidents' => [
            'idKey' => 'id', 'roles' => self::BTP_ROLES,
            'defaults' => ['statut' => 'déclaré'],
            'userField' => 'declare_par',
            'fields' => [
                'chantier_id' => ['text', 64], 'date' => ['date'],
                'gravite' => ['enum', ['mineur', 'majeur', 'critique']],
                'description' => ['multiline', 5000], 'mesures_correctives' => ['multiline', 5000],
                'valide_par_dg' => ['bool'],
                'statut' => ['enum', ['déclaré', 'en_investigation', 'mesures_en_cours', 'clôturé']],
            ],
        ],
        'btpJournaux' => [
            'idKey' => 'id', 'roles' => self::BTP_ROLES,
            'userField' => 'created_by',
            'fields' => [
                'chantier_id' => ['text', 64], 'date' => ['date'],
                'effectifs_presents' => ['text', 200], 'avancement_pct' => ['float'],
                'commentaire' => ['multiline', 5000], 'incidents_mineurs' => ['multiline', 3000],
            ],
        ],
        'btpSituations' => [
            'idKey' => 'id', 'roles' => self::BTP_ROLES,
            'defaults' => ['statut' => 'brouillon'],
            'fields' => [
                'chantier_id' => ['text', 64], 'periode' => ['text', 50],
                'pct_avancement_declare' => ['float'], 'montant_facture' => ['float'],
                'valide_par_conducteur' => ['bool'],
                'statut' => ['enum', ['brouillon', 'en_attente_facturation', 'facturée']],
            ],
        ],

        // ---------- EXTENSION BTP — Phase 3 : main d'œuvre ----------
        'btpAffectations' => [
            'idKey' => 'id',
            'roles' => ['GERANT', 'RH', 'COND_TRAVAUX', 'CHEF_CHANTIER', 'DEVELOPPEUR'],
            'defaults' => ['statut' => 'active'],
            'userField' => 'created_by',
            'fields' => [
                'employee_id' => ['text', 64], 'chantier_id' => ['text', 64],
                'date_debut' => ['date'], 'date_fin' => ['date'],
                'role_chantier' => ['text', 100], 'taux_journalier' => ['float'],
                'statut' => ['enum', ['active', 'terminée']],
            ],
        ],
        'btpPointages' => [
            'idKey' => 'id',
            'roles' => ['GERANT', 'COND_TRAVAUX', 'CHEF_CHANTIER', 'DEVELOPPEUR'],
            'userField' => 'created_by',
            'fields' => [
                'employee_id' => ['text', 64], 'chantier_id' => ['text', 64],
                'date' => ['date'], 'heures' => ['float'],
                'presence' => ['enum', ['présent', 'absent', 'congé']],
                'commentaire' => ['text', 500],
            ],
        ],

        // ---------- EXTENSION BTP — Phase 4 : achats & stock ----------
        'btpArticles' => [
            'idKey' => 'id',
            'roles' => ['GERANT', 'RESP_MATERIEL', 'MAGASINIER_BTP', 'DEVELOPPEUR'],
            'fields' => [
                'reference' => ['text', 50], 'designation' => ['text', 200],
                'unite' => ['text', 20], 'pu' => ['float'], 'seuil_alerte' => ['float'],
            ],
        ],
        'btpBonCommandes' => [
            'idKey' => 'id',
            'roles' => ['GERANT', 'COND_TRAVAUX', 'CHEF_CHANTIER', 'RESP_MATERIEL', 'MAGASINIER_BTP', 'DEVELOPPEUR'],
            'defaults' => ['statut' => 'brouillon'],
            'userField' => 'created_by',
            'fields' => [
                'chantier_id' => ['text', 64], 'fournisseur' => ['text', 200],
                'lignes' => ['array'], 'total_ht' => ['float'],
                'date_souhaitee' => ['date'],
                'statut' => ['enum', ['brouillon', 'soumis', 'reçu', 'annulé']],
            ],
        ],
        'btpMouvements' => [
            'idKey' => 'id',
            'roles' => ['GERANT', 'RESP_MATERIEL', 'MAGASINIER_BTP', 'CHEF_CHANTIER', 'DEVELOPPEUR'],
            'userField' => 'created_by',
            'fields' => [
                'article_id' => ['text', 64],
                'type' => ['enum', ['entree', 'sortie_chantier', 'retour']],
                'quantite' => ['float'],
                'chantier_id' => ['text', 64], // '' = dépôt central
                'bc_id' => ['text', 64], 'motif' => ['text', 300],
            ],
        ],

        // ---------- EXTENSION BTP — Phase 5 : GED chantier ----------
        'btpDocuments' => [
            'idKey' => 'id',
            'roles' => ['GERANT', 'COMMERCIAL', 'ETUDES', 'COND_TRAVAUX', 'CHEF_CHANTIER', 'QHSE_BTP', 'RESP_MATERIEL', 'MAGASINIER_BTP', 'ASSISTANTE', 'DEVELOPPEUR'],
            'userField' => 'created_by',
            'fields' => [
                'chantier_id' => ['text', 64],
                'type' => ['enum', ['plan', 'pv_reception', 'attestation', 'contrat', 'photo', 'autre']],
                'nom' => ['text', 200], 'url' => ['text', 300],
                'description' => ['multiline', 2000],
            ],
        ],

        'agroLotMatierePremieres' => [
            'idKey' => 'id_lot', 'roles' => self::AGRO_ROLES, 'idPrefix' => 'MP',
            'defaults' => ['statut' => 'planifié'],
            'userField' => 'created_by',
            'fields' => [
                'fournisseur_ou_parcelle' => ['text', 200], 'date_reception' => ['date'],
                'quantite' => ['float'], 'quantite_restante' => ['float'], 'unite' => ['text', 20],
                'resultat_controle_qualite' => ['enum', ['conforme', 'non_conforme', 'en_attente']],
                'motif_rejet' => ['text', 500], 'emplacement_stockage' => ['text', 100],
                'cout_acquisition' => ['float'],
                'statut' => ['enum', ['planifié', 'réceptionné', 'contrôlé', 'contrôlé_en_attente_resultats', 'accepté', 'rejeté', 'en_stock', 'épuisé']],
            ],
        ],
        'agroLotProductions' => [
            'idKey' => 'id_lot', 'roles' => self::AGRO_ROLES, 'idPrefix' => 'PF',
            'defaults' => ['statut' => 'planifié'],
            'fields' => [
                'nom_produit' => ['text', 200], 'date_fabrication' => ['date'],
                'quantite_produite' => ['float'], 'quantite_restante' => ['float'], 'unite' => ['text', 20],
                'responsable_production_id' => ['text', 64],
                'lots_matiere_premiere_utilises' => ['array'],
                'decision_deblocage' => ['multiline', 2000],
                'statut' => ['enum', ['planifié', 'en_production', 'contrôle_qualité_process', 'conditionné', 'bloqué', 'disponible_à_la_vente', 'épuisé', 'détruit', 'déclassé']],
            ],
        ],
        'agroControles' => [
            'idKey' => 'id', 'roles' => self::AGRO_ROLES,
            'userField' => 'controleur_id',
            'fields' => [
                'lot_production_id' => ['text', 64], 'point_de_controle' => ['text', 200],
                'date' => ['date'],
                'resultat' => ['enum', ['conforme', 'non_conforme']],
                'valeur_mesuree' => ['text', 100], 'seuil_attendu' => ['text', 100],
            ],
        ],
        'agroCommandes' => [
            'idKey' => 'id', 'roles' => self::AGRO_ROLES,
            'defaults' => ['statut' => 'enregistrée'],
            'fields' => [
                'client_id' => ['text', 200], 'client' => ['text', 200],
                'commercial_id' => ['text', 64], 'date_commande' => ['date'],
                'date_livraison_prevue' => ['date'], 'produits_commandes' => ['text', 1000],
                'statut' => ['enum', ['enregistrée', 'confirmée', 'préparée', 'livrée', 'facturée']],
            ],
        ],
        'agroLignesLivrees' => [
            'idKey' => 'id', 'roles' => self::AGRO_ROLES, 'idPrefix' => 'LIV',
            'fields' => [
                'commande_id' => ['text', 64], 'lot_production_id' => ['text', 64],
                'quantite_livree' => ['float'],
            ],
        ],
        'agroFiches' => [
            'idKey' => 'id', 'roles' => self::AGRO_ROLES, 'idPrefix' => 'FT',
            'fields' => [
                'commande_id' => ['text', 64], 'lots_produits_finis' => ['array'],
                'lots_matiere_premiere_origine' => ['array'], 'date_edition' => ['date'],
                'fichier_pdf_url' => ['text', 300],
            ],
        ],
        'agroReclamations' => [
            'idKey' => 'id', 'roles' => self::AGRO_ROLES,
            'defaults' => ['statut' => 'ouverte', 'risque_rappel_signale' => false],
            'fields' => [
                'commande_id' => ['text', 64], 'client_id' => ['text', 200],
                'lot_production_id' => ['text', 64], 'motif' => ['multiline', 3000],
                'date_reclamation' => ['date'], 'risque_rappel_signale' => ['bool'],
                'statut' => ['enum', ['ouverte', 'en_cours', 'clôturée']],
            ],
        ],

        'agendaEvents' => [
            'idKey' => 'id', 'roles' => self::ASSISTANTE_ROLES,
            'fields' => [
                'title' => ['text', 250], 'date' => ['date'], 'time' => ['text', 10],
                'description' => ['multiline', 2000],
                'type' => ['enum', ['MEETING', 'DEADLINE', 'REMINDER']],
            ],
        ],
        'devisRecords' => [
            'idKey' => 'id', 'roles' => self::ASSISTANTE_ROLES,
            'userField' => 'created_by',
            'fields' => [
                'clientName' => ['text', 200], 'items' => ['array'], 'total' => ['float'],
                'notes' => ['multiline', 3000], 'status' => ['enum', ['BROUILLON', 'ENVOYE', 'ACCEPTE', 'REFUSE']],
            ],
        ],
    ];

    // ------------------------------------------------------------------
    // Création
    // ------------------------------------------------------------------
    public function create(Request $request, $table) {
        $schema = self::schemaFor($table);
        AuthMiddleware::authorize($request, ...$schema['roles']);
        $body = $request->getBody();

        $item = [];

        // Valeurs par défaut serveur (statuts initiaux des workflows).
        foreach ($schema['defaults'] as $key => $value) {
            $item[$key] = $value;
        }

        // Identifiant généré serveur (format lisible par table).
        $idKey = $schema['idKey'];
        $item[$idKey] = self::generateTableId($table, $schema);

        // Champs fournis, filtrés par le schéma. Les champs de WORKFLOW
        // (statut, risque_rappel_signale) sont ignorés à la création :
        // seul le serveur décide de l'état initial.
        foreach ($schema['fields'] as $field => $spec) {
            if ($field === 'statut' || $field === 'risque_rappel_signale') {
                continue;
            }
            if (array_key_exists($field, $body)) {
                $item[$field] = self::cast($body[$field], $spec);
            }
        }

        // Traçabilité utilisateur + horodatage.
        if (!empty($schema['userField'])) {
            $item[$schema['userField']] = (string) ($request->user['id'] ?? '');
        }
        $item['updated_at'] = date('c');
        $item['createdAt'] = date('c');

        Database::getInstance()->insertTableItem($table, $item);
        Response::json($item, 201);
    }

    // ------------------------------------------------------------------
    // Mise à jour partielle
    // ------------------------------------------------------------------
    public function update(Request $request, $table, $id) {
        $schema = self::schemaFor($table);
        AuthMiddleware::authorize($request, ...$schema['roles']);
        $body = $request->getBody();

        $idKey = $schema['idKey'];
        $updated = Database::getInstance()->updateTableItem($table, $idKey, $id,
            static function ($item) use ($body, $schema) {
                foreach ($schema['fields'] as $field => $spec) {
                    if (array_key_exists($field, $body)) {
                        $item[$field] = CrudController::cast($body[$field], $spec);
                    }
                }
                $item['updated_at'] = date('c');
                return $item;
            }
        );

        if (!$updated) {
            Response::json(['error' => 'Élément non trouvé.'], 404);
        }
        Response::json($updated);
    }

    // ------------------------------------------------------------------
    // Suppression
    // ------------------------------------------------------------------
    public function delete(Request $request, $table, $id) {
        $schema = self::schemaFor($table);
        AuthMiddleware::authorize($request, 'GERANT');
        $deleted = Database::getInstance()->deleteTableItem($table, $schema['idKey'], $id);
        if (!$deleted) {
            Response::json(['error' => 'Élément non trouvé.'], 404);
        }
        Response::json(['success' => true]);
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------
    private static function schemaFor(string $table): array {
        $schema = self::TABLES[$table] ?? null;
        if ($schema === null) {
            Response::json(['error' => 'Table inconnue.'], 404);
        }
        return $schema;
    }

    /** Identifiant lisible : <PREFIX>-<année>-<6 aléatoires> ou hex. */
    private static function generateTableId(string $table, array $schema): string {
        if (!empty($schema['idPrefix'])) {
            return $schema['idPrefix'] . '-' . date('Y') . '-' . substr(bin2hex(random_bytes(4)), 0, 6);
        }
        return Database::generateId();
    }

    /** Applique la spec de champ (nettoyage / typage / énumération). */
    private static function cast($value, array $spec) {
        [$type, $param] = [$spec[0], $spec[1] ?? null];
        switch ($type) {
            case 'text':
                return Sanitizer::text($value, is_int($param) ? $param : 2000);
            case 'multiline':
                return Sanitizer::multiline($value, is_int($param) ? $param : 20000);
            case 'int':
                return Sanitizer::int($value, 0);
            case 'float':
                return Sanitizer::float($value, 0.0);
            case 'bool':
                return Sanitizer::bool($value);
            case 'date':
                return Sanitizer::date($value) ?? '';
            case 'enum':
                return Sanitizer::pick($value, is_array($param) ? $param : []) ?? '';
            case 'array':
                return is_array($value) ? Sanitizer::deepText($value, 500) : [];
            default:
                return null;
        }
    }
}
