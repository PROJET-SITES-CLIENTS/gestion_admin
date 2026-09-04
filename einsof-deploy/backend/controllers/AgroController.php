<?php
namespace App\controllers;

use App\core\Request;
use App\core\Response;
use App\core\Database;
use App\core\AuthMiddleware;
use App\core\Sanitizer;

/**
 * Opérations Agro MULTI-ÉTAPES — exécutées de façon ATOMIQUE côté serveur.
 *
 * Pourquoi : ces opérations touchent plusieurs tables (lot + stock + commande
 * + fiche de traçabilité). Exécutées en plusieurs appels HTTP depuis le
 * navigateur, une coupure réseau au milieu laissait la base incohérente
 * (ex. stock décrémenté sans lot créé). Tout se joue maintenant dans UNE
 * transaction db.json.
 *
 * Validation métier dupliquée côté serveur (le client ne peut plus tricher).
 */
class AgroController {

    private const AGRO_ROLES = ['GERANT', 'COMMERCIAL', 'RESP_PRODUCTION', 'RESP_QUALITE', 'RESP_AGRO', 'RESP_STOCKAGE', 'RESP_TRACABILITE', 'DEVELOPPEUR'];

    /**
     * POST /api/agro/lots-production
     * Crée un lot de production + décrémente les lots de matières premières.
     */
    public function createLotProduction(Request $request) {
        AuthMiddleware::authorize($request, ...self::AGRO_ROLES);
        $body = $request->getBody();

        $nomProduit = Sanitizer::text($body['nom_produit'] ?? '', 200);
        $quantiteProduite = Sanitizer::float($body['quantite_produite'] ?? 0);
        $usages = $body['lots_matiere_premiere_utilises'] ?? [];

        if ($nomProduit === '' || $quantiteProduite <= 0) {
            Response::json(['error' => 'Nom du produit et quantité produite (> 0) obligatoires.'], 400);
        }
        if (!is_array($usages) || empty($usages)) {
            Response::json(['error' => 'Au moins une matière première utilisée est requise.'], 400);
        }

        $idLot = 'PF-' . date('Y') . '-' . substr(bin2hex(random_bytes(4)), 0, 6);
        $cleanUsages = [];
        foreach ($usages as $u) {
            $lotId = Sanitizer::text($u['lot_id'] ?? '', 64);
            $qte = Sanitizer::float($u['quantite_utilisee'] ?? 0);
            if ($lotId === '' || $qte <= 0) {
                Response::json(['error' => 'Usage de matière première invalide.'], 400);
            }
            $cleanUsages[] = ['lot_id' => $lotId, 'quantite_utilisee' => $qte];
        }

        $db = Database::getInstance();
        $mpUpdates = [];
        $userId = (string) ($request->user['id'] ?? '');

        try {
            $createdLot = null;
            $db->transaction(static function ($data) use ($body, $nomProduit, $quantiteProduite, $cleanUsages, $idLot, $userId, &$mpUpdates, &$createdLot) {
                // 1. Validation serveur des stocks AVANT toute écriture.
                $mps = isset($data['agroLotMatierePremieres']) && is_array($data['agroLotMatierePremieres'])
                    ? $data['agroLotMatierePremieres'] : [];

                $mpIndex = [];
                foreach ($mps as $i => $mp) {
                    $mpIndex[$mp['id_lot'] ?? ('#' . $i)] = $i;
                }

                foreach ($cleanUsages as $u) {
                    $idx = $mpIndex[$u['lot_id']] ?? null;
                    if ($idx === null) {
                        throw new \RuntimeException("Lot matière première introuvable : {$u['lot_id']}");
                    }
                    $mp = $mps[$idx];
                    if (($mp['statut'] ?? '') !== 'en_stock') {
                        throw new \RuntimeException("Le lot {$u['lot_id']} n'est pas en stock (statut : {$mp['statut']}).");
                    }
                    $restant = Sanitizer::float($mp['quantite_restante'] ?? $mp['quantite'] ?? 0);
                    if ($restant < $u['quantite_utilisee']) {
                        throw new \RuntimeException("Stock insuffisant pour {$u['lot_id']} (disponible : {$restant}).");
                    }
                }

                // 2. Création du lot de production.
                $createdLot = [
                    'id_lot' => $idLot,
                    'nom_produit' => $nomProduit,
                    'date_fabrication' => Sanitizer::date($body['date_fabrication'] ?? '') ?? date('Y-m-d'),
                    'quantite_produite' => $quantiteProduite,
                    'quantite_restante' => $quantiteProduite,
                    'unite' => Sanitizer::text($body['unite'] ?? '', 20),
                    'statut' => 'planifié',
                    'responsable_production_id' => Sanitizer::text($body['responsable_production_id'] ?? '', 64) ?: $userId,
                    'lots_matiere_premiere_utilises' => Sanitizer::deepText($cleanUsages, 100),
                    'createdAt' => date('c'),
                    'updated_at' => date('c'),
                ];
                if (!isset($data['agroLotProductions']) || !is_array($data['agroLotProductions'])) {
                    $data['agroLotProductions'] = [];
                }
                $data['agroLotProductions'][] = $createdLot;

                // 3. Décrément atomique des stocks MP.
                foreach ($cleanUsages as $u) {
                    $idx = $mpIndex[$u['lot_id']];
                    $restant = Sanitizer::float($mps[$idx]['quantite_restante'] ?? $mps[$idx]['quantite'] ?? 0) - $u['quantite_utilisee'];
                    $data['agroLotMatierePremieres'][$idx]['quantite_restante'] = $restant;
                    if ($restant <= 0) {
                        $data['agroLotMatierePremieres'][$idx]['statut'] = 'épuisé';
                    }
                    $mpUpdates[] = $data['agroLotMatierePremieres'][$idx];
                }

                return $data;
            });
        } catch (\RuntimeException $e) {
            Response::json(['error' => $e->getMessage()], 409);
        }

        Response::json([
            'success' => true,
            'lot' => $createdLot,
            'mp_updates' => $mpUpdates,
        ], 201);
    }

    /**
     * POST /api/agro/livraisons
     * Prépare une livraison : lignes livrées + décrément PF + statut commande
     * + fiche de traçabilité — atomiquement.
     */
    public function prepareLivraison(Request $request) {
        AuthMiddleware::authorize($request, ...self::AGRO_ROLES);
        $body = $request->getBody();

        $commandeId = Sanitizer::text($body['commande_id'] ?? '', 64);
        $affectations = $body['affectations'] ?? [];

        if ($commandeId === '' || !is_array($affectations) || empty($affectations)) {
            Response::json(['error' => 'Commande et affectations obligatoires.'], 400);
        }

        $cleanAff = [];
        foreach ($affectations as $a) {
            $lotId = Sanitizer::text($a['lot_production_id'] ?? '', 64);
            $qte = Sanitizer::float($a['quantite_livree'] ?? 0);
            if ($lotId === '' || $qte <= 0) {
                Response::json(['error' => 'Affectation invalide.'], 400);
            }
            $cleanAff[] = ['lot_production_id' => $lotId, 'quantite_livree' => $qte];
        }

        $db = Database::getInstance();
        $result = null;

        try {
            $db->transaction(static function ($data) use ($commandeId, $cleanAff, &$result) {
                // 1. La commande doit exister et être en préparation possible.
                $commandeIdx = null;
                foreach ($data['agroCommandes'] ?? [] as $i => $c) {
                    if (($c['id'] ?? '') === $commandeId) { $commandeIdx = $i; break; }
                }
                if ($commandeIdx === null) {
                    throw new \RuntimeException('Commande introuvable.');
                }
                $statut = $data['agroCommandes'][$commandeIdx]['statut'] ?? '';
                if (!in_array($statut, ['enregistrée', 'confirmée'], true)) {
                    throw new \RuntimeException("La commande n'est pas préparable (statut : {$statut}).");
                }

                // 2. Validation des stocks de produits finis.
                $pfIndex = [];
                foreach ($data['agroLotProductions'] ?? [] as $i => $p) {
                    $pfIndex[$p['id_lot'] ?? ('#' . $i)] = $i;
                }
                foreach ($cleanAff as $a) {
                    $idx = $pfIndex[$a['lot_production_id']] ?? null;
                    if ($idx === null) {
                        throw new \RuntimeException("Lot produit fini introuvable : {$a['lot_production_id']}");
                    }
                    $p = $data['agroLotProductions'][$idx];
                    $restant = Sanitizer::float($p['quantite_restante'] ?? $p['quantite_produite'] ?? 0);
                    if ($restant < $a['quantite_livree']) {
                        throw new \RuntimeException("Stock insuffisant pour {$a['lot_production_id']} (disponible : {$restant}).");
                    }
                }

                // 3. Création des lignes livrées + décrément des lots PF.
                $lignes = [];
                $pfUpdates = [];
                foreach ($cleanAff as $a) {
                    $idx = $pfIndex[$a['lot_production_id']];
                    $ligne = [
                        'id' => 'LIV-' . date('Y') . '-' . substr(bin2hex(random_bytes(4)), 0, 6),
                        'commande_id' => $commandeId,
                        'lot_production_id' => $a['lot_production_id'],
                        'quantite_livree' => $a['quantite_livree'],
                        'createdAt' => date('c'),
                    ];
                    $lignes[] = $ligne;
                    if (!isset($data['agroLignesLivrees']) || !is_array($data['agroLignesLivrees'])) {
                        $data['agroLignesLivrees'] = [];
                    }
                    $data['agroLignesLivrees'][] = $ligne;

                    $restant = Sanitizer::float($data['agroLotProductions'][$idx]['quantite_restante'] ?? $data['agroLotProductions'][$idx]['quantite_produite'] ?? 0) - $a['quantite_livree'];
                    $data['agroLotProductions'][$idx]['quantite_restante'] = $restant;
                    if ($restant <= 0) {
                        $data['agroLotProductions'][$idx]['statut'] = 'épuisé';
                    }
                    $data['agroLotProductions'][$idx]['updated_at'] = date('c');
                    $pfUpdates[] = $data['agroLotProductions'][$idx];
                }

                // 4. Commande passée en "préparée".
                $data['agroCommandes'][$commandeIdx]['statut'] = 'préparée';
                $data['agroCommandes'][$commandeIdx]['updated_at'] = date('c');
                $commande = $data['agroCommandes'][$commandeIdx];

                // 5. Fiche de traçabilité descendante (lots MP d'origine).
                $mpOrigins = [];
                foreach ($cleanAff as $a) {
                    $idx = $pfIndex[$a['lot_production_id']];
                    foreach ($data['agroLotProductions'][$idx]['lots_matiere_premiere_utilises'] ?? [] as $mp) {
                        $mpOrigins[$mp['lot_id'] ?? ''] = true;
                    }
                }
                $fiche = [
                    'id' => 'FT-' . date('Y') . '-' . substr(bin2hex(random_bytes(3)), 0, 5),
                    'commande_id' => $commandeId,
                    'lots_produits_finis' => array_map(static fn($a) => $a['lot_production_id'], $cleanAff),
                    'lots_matiere_premiere_origine' => array_keys($mpOrigins),
                    'date_edition' => date('c'),
                    'createdAt' => date('c'),
                ];
                if (!isset($data['agroFiches']) || !is_array($data['agroFiches'])) {
                    $data['agroFiches'] = [];
                }
                $data['agroFiches'][] = $fiche;

                $result = ['lignes' => $lignes, 'fiche' => $fiche, 'commande' => $commande, 'pf_updates' => $pfUpdates];
                return $data;
            });
        } catch (\RuntimeException $e) {
            Response::json(['error' => $e->getMessage()], 409);
        }

        Response::json(['success' => true] + $result, 201);
    }
}
