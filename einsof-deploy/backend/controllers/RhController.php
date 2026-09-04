<?php
namespace App\controllers;

use App\core\Request;
use App\core\Response;
use App\core\Database;
use App\core\AuthMiddleware;
use App\core\Sanitizer;

/**
 * Module RH — employés, contrats, congés, paie.
 *
 * Toutes les routes exigent le rôle GERANT ou RH (l'ancienne version était
 * totalement anonyme : salaires et données personnelles accessibles à tous).
 * Réécrite sur core\Database (l'ancienne version lisait un chemin
 * backend/backend/data/db.json inexistant et appelait $req->body() qui n'existe pas).
 */
class RhController {

    private const ROLES_RH = ['GERANT', 'RH'];

    // ------------------------------------------------------------------
    // Lecture
    // ------------------------------------------------------------------
    public function getRhData(Request $request) {
        AuthMiddleware::authorize($request, ...self::ROLES_RH);
        $db = Database::getInstance();
        Response::json([
            'employees' => array_values($db->getTable('employees')),
            'contracts' => array_values($db->getTable('contracts')),
            'leave_requests' => array_values($db->getTable('leave_requests')),
            'payslips' => array_values($db->getTable('payslips'))
        ]);
    }

    // ------------------------------------------------------------------
    // Employés
    // ------------------------------------------------------------------
    public function createEmployee(Request $request) {
        AuthMiddleware::authorize($request, ...self::ROLES_RH);
        $body = $request->getBody();

        $firstName = Sanitizer::text($body['firstName'] ?? '', 100);
        $lastName = Sanitizer::text($body['lastName'] ?? '', 100);
        if ($firstName === '' || $lastName === '') {
            Response::json(['error' => 'Prénom et nom obligatoires.'], 400);
        }

        $newEmployee = [
            'id' => Database::generateId(),
            'userId' => Sanitizer::text($body['userId'] ?? '', 64),
            'firstName' => $firstName,
            'lastName' => $lastName,
            'email' => Sanitizer::text($body['email'] ?? '', 190),
            'phone' => Sanitizer::text($body['phone'] ?? '', 40),
            'cnssNumber' => Sanitizer::text($body['cnssNumber'] ?? '', 40),
            'birthDate' => Sanitizer::date($body['birthDate'] ?? '') ?? '',
            'address' => Sanitizer::text($body['address'] ?? '', 300),
            'bankDetails' => Sanitizer::text($body['bankDetails'] ?? '', 100),
            'emergencyContact' => Sanitizer::text($body['emergencyContact'] ?? '', 150),
            'maritalStatus' => Sanitizer::text($body['maritalStatus'] ?? '', 30),
            'hireDate' => Sanitizer::date($body['hireDate'] ?? '') ?? date('Y-m-d'),
            'position' => Sanitizer::text($body['position'] ?? '', 150),
            'department' => Sanitizer::text($body['department'] ?? '', 100),
            'baseSalary' => max(0, Sanitizer::float($body['baseSalary'] ?? 0)),
            'leaveBalance' => max(0, Sanitizer::int($body['leaveBalance'] ?? 0)),
            'isActive' => true,
            'documents' => [],
            'createdAt' => date('c'),
        ];

        Database::getInstance()->insertTableItem('employees', $newEmployee);
        Response::json($newEmployee, 201);
    }

    public function updateEmployee(Request $request, $id) {
        AuthMiddleware::authorize($request, ...self::ROLES_RH);
        $body = $request->getBody();

        $editable = ['email', 'phone', 'cnssNumber', 'address', 'bankDetails',
                     'emergencyContact', 'maritalStatus', 'position', 'department',
                     'birthDate', 'hireDate', 'userId'];

        $updated = Database::getInstance()->updateTableItem('employees', 'id', $id,
            static function ($emp) use ($body, $editable) {
                foreach ($editable as $field) {
                    if (array_key_exists($field, $body)) {
                        $emp[$field] = in_array($field, ['birthDate', 'hireDate'])
                            ? (Sanitizer::date($body[$field]) ?? $emp[$field])
                            : Sanitizer::text($body[$field], 300);
                    }
                }
                if (isset($body['firstName'])) $emp['firstName'] = Sanitizer::text($body['firstName'], 100);
                if (isset($body['lastName'])) $emp['lastName'] = Sanitizer::text($body['lastName'], 100);
                if (isset($body['baseSalary'])) $emp['baseSalary'] = max(0, Sanitizer::float($body['baseSalary']));
                if (isset($body['leaveBalance'])) $emp['leaveBalance'] = max(0, Sanitizer::int($body['leaveBalance']));
                if (isset($body['isActive'])) $emp['isActive'] = Sanitizer::bool($body['isActive'], true);
                $emp['updatedAt'] = date('c');
                return $emp;
            }
        );

        if (!$updated) {
            Response::json(['error' => 'Employé non trouvé.'], 404);
        }
        Response::json($updated);
    }

    // ------------------------------------------------------------------
    // Contrats
    // ------------------------------------------------------------------
    public function createContract(Request $request) {
        AuthMiddleware::authorize($request, ...self::ROLES_RH);
        $body = $request->getBody();

        $employeeId = Sanitizer::text($body['employeeId'] ?? '', 64);
        $type = Sanitizer::pick($body['type'] ?? '', ['CDI', 'CDD', 'STAGIAIRE', 'APPRENTI']) ?? 'CDD';
        $startDate = Sanitizer::date($body['startDate'] ?? '');
        if ($employeeId === '' || $startDate === null) {
            Response::json(['error' => 'Employé et date de début obligatoires.'], 400);
        }

        $newContract = [
            'id' => Database::generateId(),
            'employeeId' => $employeeId,
            'type' => $type,
            'startDate' => $startDate,
            'endDate' => Sanitizer::date($body['endDate'] ?? '') ?? '',
            'probationEndDate' => Sanitizer::date($body['probationEndDate'] ?? '') ?? '',
            'status' => 'ACTIVE',
            'fileUrl' => Sanitizer::text($body['fileUrl'] ?? '', 300),
            'createdAt' => date('c'),
        ];

        Database::getInstance()->insertTableItem('contracts', $newContract);
        Response::json($newContract, 201);
    }

    // ------------------------------------------------------------------
    // Congés
    // ------------------------------------------------------------------
    public function createLeaveRequest(Request $request) {
        // Cohérence avec la visibilité des données (GET /api/data ne renvoie
        // les congés qu'aux rôles GERANT/RH) : la création est réservée aux mêmes rôles.
        AuthMiddleware::authorize($request, ...self::ROLES_RH);
        $body = $request->getBody();

        $employeeId = Sanitizer::text($body['employeeId'] ?? '', 64);
        $startDate = Sanitizer::date($body['startDate'] ?? '');
        $endDate = Sanitizer::date($body['endDate'] ?? '');
        if ($employeeId === '' || $startDate === null || $endDate === null) {
            Response::json(['error' => 'Employé et dates obligatoires.'], 400);
        }

        $newReq = [
            'id' => Database::generateId(),
            'employeeId' => $employeeId,
            'startDate' => $startDate,
            'endDate' => $endDate,
            'daysCount' => max(0, Sanitizer::int($body['daysCount'] ?? 0)),
            'leaveType' => Sanitizer::pick($body['leaveType'] ?? 'ANNUAL', ['ANNUAL', 'SICK', 'MATERNITY', 'UNPAID']) ?? 'ANNUAL',
            'reason' => Sanitizer::multiline($body['reason'] ?? '', 2000),
            'status' => 'PENDING',
            'createdAt' => date('c'),
        ];

        Database::getInstance()->insertTableItem('leave_requests', $newReq);
        Response::json($newReq, 201);
    }

    public function updateLeaveRequest(Request $request, $id) {
        AuthMiddleware::authorize($request, ...self::ROLES_RH);
        $body = $request->getBody();

        $status = Sanitizer::pick($body['status'] ?? '', ['PENDING', 'APPROVED', 'REJECTED']);
        if ($status === null) {
            Response::json(['error' => 'Statut invalide.'], 400);
        }

        $updated = Database::getInstance()->updateTableItem('leave_requests', 'id', $id,
            static function ($lv) use ($status, $body) {
                $lv['status'] = $status;
                if ($status === 'REJECTED') {
                    $lv['rejectionReason'] = Sanitizer::multiline($body['rejectionReason'] ?? '', 1000);
                }
                $lv['updatedAt'] = date('c');
                return $lv;
            }
        );

        if (!$updated) {
            Response::json(['error' => 'Demande non trouvée.'], 404);
        }
        Response::json($updated);
    }

    // ------------------------------------------------------------------
    // Paie
    // ------------------------------------------------------------------
    public function createPayslip(Request $request) {
        AuthMiddleware::authorize($request, ...self::ROLES_RH);
        $body = $request->getBody();

        $employeeId = Sanitizer::text($body['employeeId'] ?? '', 64);
        if ($employeeId === '') {
            Response::json(['error' => 'Employé obligatoire.'], 400);
        }

        // Accepte les deux variantes de clés utilisées historiquement par le front.
        $cnssEmployee = isset($body['cnssEmployeeAmount'])
            ? Sanitizer::float($body['cnssEmployeeAmount'])
            : Sanitizer::float($body['employeeCnssAmount'] ?? 0);
        $cnssEmployer = isset($body['cnssEmployerAmount'])
            ? Sanitizer::float($body['cnssEmployerAmount'])
            : Sanitizer::float($body['employerCnssAmount'] ?? 0);

        $newPayslip = [
            'id' => Database::generateId(),
            'employeeId' => $employeeId,
            'month' => max(1, min(12, Sanitizer::int($body['month'] ?? (int) date('n')))),
            'year' => Sanitizer::int($body['year'] ?? (int) date('Y')),
            'baseSalary' => max(0, Sanitizer::float($body['baseSalary'] ?? 0)),
            'bonuses' => max(0, Sanitizer::float($body['bonuses'] ?? 0)),
            'overtimeAmount' => max(0, Sanitizer::float($body['overtimeAmount'] ?? 0)),
            'grossSalary' => max(0, Sanitizer::float($body['grossSalary'] ?? 0)),
            'cnssEmployeeAmount' => max(0, $cnssEmployee),
            'cnssEmployerAmount' => max(0, $cnssEmployer),
            'rtsAmount' => max(0, Sanitizer::float($body['rtsAmount'] ?? 0)),
            'deductions' => max(0, Sanitizer::float($body['deductions'] ?? 0)),
            'netSalary' => max(0, Sanitizer::float($body['netSalary'] ?? 0)),
            'status' => 'DRAFT',
            'pdfUrl' => Sanitizer::text($body['pdfUrl'] ?? '', 300),
            'createdAt' => date('c'),
        ];

        Database::getInstance()->insertTableItem('payslips', $newPayslip);
        Response::json($newPayslip, 201);
    }

    public function updatePayslip(Request $request, $id) {
        AuthMiddleware::authorize($request, ...self::ROLES_RH);
        $body = $request->getBody();

        $status = Sanitizer::pick($body['status'] ?? '', ['DRAFT', 'VALIDATED', 'PAID']);
        if ($status === null) {
            Response::json(['error' => 'Statut invalide.'], 400);
        }

        $updated = Database::getInstance()->updateTableItem('payslips', 'id', $id,
            static function ($p) use ($status) {
                $p['status'] = $status;
                $p['updatedAt'] = date('c');
                return $p;
            }
        );

        if (!$updated) {
            Response::json(['error' => 'Fiche de paie non trouvée.'], 404);
        }
        Response::json($updated);
    }
}
