export type Role = 'GERANT' | 'COMMERCIAL' | 'COMPTABLE' | 'RH' | 'ASSISTANTE' | 'ETUDES' | 'COND_TRAVAUX' | 'CHEF_CHANTIER' | 'QHSE_BTP' | 'RESP_MATERIEL' | 'MAGASINIER_BTP' | 'RESP_PRODUCTION' | 'RESP_QUALITE' | 'RESP_AGRO' | 'RESP_STOCKAGE' | 'RESP_TRACABILITE';

export interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: Role;
  plainPassword?: string;
  avatarUrl?: string; // New: Profile avatar
  preferences?: any; // New: User preferences
  isActive?: boolean; // New: To deactivate instead of delete
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
}

export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID';
export type ProjectStatus = 'NOUVEAU' | 'EN_COURS' | 'TERMINE' | 'PAYE' | 'ANNULE';

export interface Document {
  id: string;
  type: 'PROFORMA' | 'RECEIPT' | 'SPECS' | 'INVOICE' | 'CREDIT_NOTE'; // New types
  url?: string; 
  content?: string; 
  amountPaid?: number;
  balance?: number;
  createdAt: string;
}

export interface PaymentInstallment {
  id: string;
  name: string;
  percentage: number;
  amount: number;
  expectedDate: string;
  status: 'PENDING' | 'PAID';
  paymentDate?: string;
  receiptDocumentId?: string;
}

export interface PaymentPlan {
  totalAmount: number;
  installments: PaymentInstallment[];
  status: 'DRAFT' | 'LOCKED';
}

export interface Client {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address?: string;
  industry?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Project {
  id: string;
  clientId?: string; // Link to the new Client entity
  /** Lien vers le prospect CRM converti */
  prospectId?: string;
  /** Lien vers la proposition commerciale (devis) acceptée */
  proposalId?: string;
  name: string;
  clientName: string; // Kept for legacy
  clientContact?: string;
  description?: string;
  budget: number;
  createdAt: string;
  status: ProjectStatus;
  paymentStatus: PaymentStatus;
  documents: Document[];
  commercialPaymentConfirm?: boolean;
  accountantPaymentConfirm?: boolean;
  paymentPlan?: PaymentPlan;
  // Dossiers structurés (utilisés par l'archive ZIP et le plan de paiement)
  clientInfo?: ClientInfo;
  commercialInfo?: CommercialInfo;
}

export interface UploadedFileRef {
  name?: string;
  url?: string;
  base64?: string;
  type?: string;
}

export interface ClientInfo {
  importedLogo?: UploadedFileRef;
  brandGuidelinesFile?: UploadedFileRef;
  importedCompanyPhotos?: UploadedFileRef[];
  importedSpecificImages?: UploadedFileRef[];
  importedContentDocs?: UploadedFileRef[];
  rccmFile?: UploadedFileRef;
  identityFile?: UploadedFileRef;
  [key: string]: any; // champs historiques (importedRccmDoc, etc.)
}

export interface CommercialInfo {
  negotiatedPrice?: number;
  needsSummary?: string;
  notes?: string;
  [key: string]: any;
}

export interface CompanyConfig {
  companyName?: string;
  companyAddress?: string;
  companyId?: string;
  companyEmail?: string;
  companyPhone?: string;
  logoUrl?: string;
  logoBase64?: string;
  stampUrl?: string;
  signatureUrl?: string;
  bankingDetails?: string;
  clientTarget?: number;
  targetAmountPerClient?: number;
  
  // Paramètres RH (Guinée) modifiables par le gérant
  rhSmig?: number; // ex: 440000
  rhCnssEmployerRate?: number; // ex: 13 (%)
  rhCnssEmployeeRate?: number; // ex: 5 (%)
  rhCnssCeiling?: number; // ex: 2500000 ou 5000000
  rhRtsAbattement?: number; // ex: 20 (%)
  rhRtsRate?: number; // ex: 10 (%)
  // Paramètres Comptabilité & TVA
  tvaRate?: number; // ex: 18 (%)
  
  // Paramètres Délégation
  delegations?: Partial<Record<Role, Role>>;

  // Modules et Permissions
  activeModules?: string[]; // e.g. ['BTP']
  /** Compteurs de numérotation légale des documents (PRO_2026: 3, REC_2026: 7...) */
  docCounters?: Record<string, number>;
  btpPermissions?: Record<string, Record<string, boolean>>;
}

export type TreasuryAccountType = 'BANQUE' | 'CAISSE' | 'MOBILE_MONEY';

export interface TreasuryAccount {
  id: string;
  name: string;
  type: TreasuryAccountType;
  balance: number;
}

export type TransactionType = 'CREDIT' | 'DEBIT' | 'TRANSFERT_INTERNE'; // New: Internal transfer

export interface Transaction {
  id: string;
  accountId: string;
  type: TransactionType;
  amount: number;
  date: string;
  referenceId?: string; // id projet, dépense ou paie
  category: string;
  description: string;
  isReconciled?: boolean; // New: Bank reconciliation
  attachmentUrl?: string; // New: Receipt for transaction
}

export type ExpenseCategory = 'ACHAT_MARCHANDISE' | 'SALAIRE' | 'CHARGES_SOCIALES' | 'LOYER' | 'ELECTRICITE' | 'INTERNET' | 'IMPOTS' | 'FOURNITURES' | 'AUTRE';
export interface Expense {
  id: string;
  category: ExpenseCategory;
  amountHT: number;
  tvaAmount: number;
  amountTTC: number;
  /** Ancien format (avant TVA) — encore présent dans les données seed. */
  amount?: number;
  description: string;
  date: string;
  status: 'PENDING' | 'PAID' | 'REJECTED' | 'CANCELLED';
  rejectionReason?: string;
  accountId?: string; // Compte utilisé pour le paiement
  attachmentUrl?: string; // New: Proof of purchase
  /** Rattachement à un chantier BTP (rentabilité par chantier). */
  chantier_id?: string;
}

export type ProspectQualification = 'CHAUD' | 'TIEDE' | 'FROID' | 'NON_QUALIFIE';
export type ProspectStage = 'NOUVEAU' | 'CONTACTE' | 'RDV_FIXE' | 'PROPOSITION' | 'NEGOCIATION' | 'GAGNE' | 'PERDU';

export interface ProspectMeeting {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  location: string;
  status: 'SCHEDULED' | 'HELD' | 'CANCELLED' | 'NO_SHOW';
  report?: string;
  isSyncedToCalendar?: boolean; // New: Pour Google Calendar/Outlook
}

export interface ProspectHistory {
  id: string;
  date: string;
  action: string;
  user?: string;
}

export interface ProspectInteraction {
  id: string;
  date: string;
  notes: string;
}

export interface ContactList {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  ownerId?: string; // S'il appartient à un commercial spécifique
  createdAt: string;
}

export interface Prospect {
  id: string;
  name: string;
  company?: string;
  jobTitle?: string;
  phone: string;
  email?: string;
  source?: string;
  tags?: string[];
  listId?: string; // Référence à ContactList
  ownerId?: string; // Attribution au commercial (ID utilisateur)
  
  qualification: ProspectQualification;
  stage: ProspectStage;
  probability?: number; // Probabilité de closing (en %)
  
  interactions: ProspectInteraction[];
  meetings: ProspectMeeting[];
  history: ProspectHistory[];
  
  projectType?: string;
  estimatedBudget?: string;
  objectives?: string;

  nextActionDate?: string;
  lossReason?: string; // Motif court (Prix, Concurrent, etc.)
  lossReasonDetail?: string; // Détail libre
  documents?: Document[]; // Devis, contrats, propositions
  createdAt: string;
  updatedAt: string;
}

export interface ServiceProposal {
  id: string;
  prospectId: string;
  title: string;
  items: { catalogItemId: string; quantity: number; unitPrice: number; discount?: number }[];
  totalAmount: number;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  validUntil: string;
}

// --- MODULE ASSISTANTE ---
export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  description?: string;
  type: 'MEETING' | 'DEADLINE' | 'REMINDER';
}

export interface InternalRequest {
  id: string;
  senderRole: Role;
  senderName: string;
  title: string;
  content: string;
  status: 'PENDING' | 'PROCESSING' | 'DONE';
  createdAt: string;
}

export interface InternalMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: Role;
  receiverRole: Role | 'ALL';
  content: string;
  attachment?: {
    name: string;
    url?: string;
  };
  timestamp: string;
  isRead: boolean;
}

export interface ServiceCatalogItem {
  id: string;
  category: string;
  name: string;
  description: string;
  basePrice: number;
}

// --- MODULE RH ---

export interface Employee {
  id: string;
  userId?: string; 
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  cnssNumber?: string;
  birthDate?: string;
  address?: string;
  bankDetails?: string; 
  emergencyContact?: string; 
  maritalStatus?: string;
  managerId?: string; // Hiérarchie
  hireDate: string;
  position: string;
  department: string;
  baseSalary: number;
  workSchedule?: string; // ex: 40h/semaine
  isActive: boolean; 
  documents?: { id: string; name: string; url?: string; type: string; uploadDate: string }[];
  leaveBalance?: number; 
  rttBalance?: number;
}

export interface CareerEvent {
  id: string;
  employeeId: string;
  date: string;
  type: 'PROMOTION' | 'SALARY_INCREASE' | 'DEPARTMENT_CHANGE' | 'ROLE_CHANGE';
  description: string;
  oldValue?: string;
  newValue?: string;
}

export type ContractType = 'CDI' | 'CDD' | 'STAGIAIRE' | 'APPRENTI' | 'FREELANCE';

export interface Contract {
  id: string;
  employeeId: string;
  type: ContractType;
  startDate: string;
  endDate?: string;
  probationEndDate?: string;
  probationStatus?: 'IN_PROGRESS' | 'CONFIRMED' | 'REJECTED' | 'RENEWED';
  status: 'ACTIVE' | 'TERMINATED' | 'EXPIRED';
  fileUrl?: string;
}

export interface OnboardingTask {
  id: string;
  employeeId: string;
  type: 'ONBOARDING' | 'OFFBOARDING';
  title: string;
  category: 'IT' | 'ADMIN' | 'FORMATION' | 'MATERIEL';
  dueDate: string;
  isCompleted: boolean;
  assignedToRole?: Role; // ex: 'RH' ou 'ASSISTANTE'
}

export type LeaveType = 'ANNUAL' | 'SICK' | 'MATERNITY' | 'PATERNITY' | 'UNPAID' | 'RTT' | 'EXCEPTIONAL';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  leaveType: LeaveType;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  attachmentUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  checkIn?: string; // HH:mm
  checkOut?: string; // HH:mm
  isRemote: boolean;
  overtimeHours?: number;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'ON_LEAVE';
}

export interface SalaryAdvance {
  id: string;
  employeeId: string;
  amount: number;
  date: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REIMBURSED';
  monthToDeduct: number; 
  yearToDeduct: number;
}

export interface Payslip {
  id: string;
  employeeId: string;
  month: number;
  year: number;
  baseSalary: number;
  bonuses: number; 
  overtimeAmount?: number; 
  grossSalary: number;
  cnssEmployeeAmount: number;
  cnssEmployerAmount: number;
  rtsAmount: number;
  deductions?: number; 
  netSalary: number;
  status: 'DRAFT' | 'VALIDATED' | 'PAID';
  pdfUrl?: string; 
  createdAt: string;
}

export interface PerformanceReview {
  id: string;
  employeeId: string;
  reviewerId: string;
  date: string;
  type: 'ANNUAL' | 'SEMI_ANNUAL' | 'PROBATION';
  score?: number; // Sur 10 ou 5
  comments: string;
  goalsForNextPeriod: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
}

export interface TrainingCourse {
  id: string;
  title: string;
  description: string;
  provider: 'INTERNAL' | 'EXTERNAL';
  isMandatory: boolean;
  validityMonths?: number; // Durée de validité de l'habilitation
}

export interface TrainingRecord {
  id: string;
  employeeId: string;
  courseId: string;
  completionDate: string;
  expiryDate?: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  certificateUrl?: string;
}

export interface MedicalVisit {
  id: string;
  employeeId: string;
  date: string;
  type: 'EMBAUCHE' | 'PERIODIQUE' | 'REPRISE';
  doctorName?: string;
  fitForWork: boolean;
  restrictions?: string;
  nextDueDate?: string;
}

export interface DisciplinaryAction {
  id: string;
  employeeId: string;
  date: string;
  type: 'VERBAL_WARNING' | 'WRITTEN_WARNING' | 'SUSPENSION' | 'DISMISSAL';
  reason: string;
  documentUrl?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorId: string;
  targetDepartments: string[]; // 'ALL' pour tout le monde
  createdAt: string;
  isImportant: boolean;
}

export interface ExpenseReport {
  id: string;
  employeeId: string;
  date: string;
  amount: number;
  category: 'TRAVEL' | 'MEAL' | 'SUPPLIES' | 'OTHER';
  description: string;
  receiptUrl?: string;
  status: 'PENDING' | 'APPROVED_MANAGER' | 'APPROVED_RH' | 'REJECTED' | 'REIMBURSED';
  rejectionReason?: string;
}

// --- MODULE COMMUNICATION UNIFIÉ ---

export interface Task {
  id: string;
  senderRole: Role;
  senderName: string;
  receiverRole: Role;
  title: string;
  content: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: string;
  updatedAt?: string;
  link?: string; // Optional URL/Route to handle the task
  escalated?: boolean;
}

export interface AppNotification {
  id: string;
  userId?: string; 
  targetRole: Role; 
  message: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR';
  isRead: boolean;
  createdAt: string;
  link?: string;
}

// --- MODULE BTP ---

export type BtpOffreStatus = 'repérée' | 'en_chiffrage' | 'en_validation_financiere' | 'en_validation_dg' | 'déposée' | 'gagnée' | 'perdue' | 'retirée';
export type BtpChantierStatus = 'planification' | 'en_cours' | 'suspendu' | 'réception_provisoire' | 'réception_définitive' | 'clôturé';
export type BtpIncidentGravite = 'mineur' | 'majeur' | 'critique';
export type BtpEnginStatus = 'disponible' | 'affecté' | 'en_maintenance' | 'hors_service';
export type BtpIncidentStatus = 'déclaré' | 'en_investigation' | 'mesures_en_cours' | 'clôturé';
export type BtpSituationStatus = 'brouillon' | 'en_attente_facturation' | 'facturée';

export interface BtpOffre {
  id: string;
  /** FK vers le prospect CRM — établit le lien CRM ↔ BTP */
  prospect_id?: string;
  client: string;
  objet: string;
  montant_estime: number;
  date_limite_depot: string;
  statut: BtpOffreStatus;
  chiffrage_json?: string; 
  marge_calculee?: number;
  commentaire_validation_financiere?: string;
  date_depot?: string;
  resultat?: 'gagnée' | 'perdue' | 'retirée';
  created_by: string;
  updated_at: string;
}

export interface BtpChantier {
  id: string;
  offre_id?: string;
  /** FK vers le marché signé (chaîne CDC : Affaire → Marché → Projet → Chantier) */
  marche_id?: string;
  nom: string;
  client: string;
  client_id?: string;
  adresse: string;
  date_debut_prevue: string;
  date_fin_prevue?: string;
  budget_initial: number;
  statut: BtpChantierStatus;
  conducteur_travaux_id?: string;
  chef_chantier_id?: string;
  rh_validation?: boolean;
  materiel_validation?: boolean;
  qhse_unlock?: boolean;
  dg_unlock?: boolean;
  /** Budget prévisionnel détaillé — transféré du chiffrage de l'offre gagnée. */
  budget_detail?: BtpChiffrage;
  /** Retenue de garantie (% appliqué à chaque situation). */
  retenue_garantie_pct?: number;
  /** Pénalité de retard contractuelle (GNF/jour de retard). */
  penalite_journaliere?: number;
}

// ══════════════════════════════════════════════════════════════════
// NOUVELLES ENTITÉS CDC — Marché, Lot, Tâche (chaîne hiérarchique)
// ══════════════════════════════════════════════════════════════════

export type BtpMarcheStatus =
  | 'brouillon' | 'en_validation' | 'signe' | 'os_recu'
  | 'en_cours' | 'suspendu' | 'acheve' | 'resilie' | 'cloture';

/**
 * Marché / Contrat — formalise la relation contractuelle client.
 * Chaîne : Offre gagnée → Marché signé → Chantier(s) créé(s)
 */
export interface BtpMarche {
  id: string;
  numero: string;               // MAR-2026-001
  offre_id?: string;            // FK vers l'offre gagnée
  client_id?: string;           // FK entité client
  client_nom: string;
  objet: string;
  montant_ht: number;
  tva_rate: number;
  montant_ttc: number;
  date_signature?: string;
  date_demarrage_prevue?: string;
  date_fin_prevue?: string;
  retenue_garantie_pct?: number;
  penalite_journaliere?: number;
  conditions_paiement?: string;
  statut: BtpMarcheStatus;
  documents?: { nom: string; url?: string; type?: string }[];
  created_by?: string;
  createdAt?: string;
}

export type BtpLotStatus = 'planifie' | 'en_cours' | 'termine' | 'suspendu' | 'annule';

/**
 * Lot — découpage du chantier par métier, zone ou phase.
 * Hérite d'un budget propre et d'un avancement indépendant.
 */
export interface BtpLot {
  id: string;
  chantier_id: string;
  numero: string;               // LOT-001
  nom: string;
  description?: string;
  responsable_id?: string;      // FK employé
  budget: number;
  date_debut?: string;
  date_fin?: string;
  avancement_pct: number;
  statut: BtpLotStatus;
  created_by?: string;
}

export type BtpTacheStatus = 'a_faire' | 'en_cours' | 'terminee' | 'bloquee' | 'annulee';
export type BtpTachePriorite = 'basse' | 'normale' | 'haute' | 'critique';

/**
 * Tâche WBS — unité de travail atomique sous un lot.
 * Supporte les dépendances et l'assignation.
 */
export interface BtpTache {
  id: string;
  lot_id: string;
  chantier_id: string;          // dénormalisé pour requêtes rapides
  nom: string;
  description?: string;
  assigne_a?: string;           // FK employé
  date_debut?: string;
  date_fin?: string;
  duree_jours?: number;
  depend_de?: string;           // FK tâche antérieure
  avancement_pct: number;
  priorite: BtpTachePriorite;
  statut: BtpTacheStatus;
  created_by?: string;
}

export interface BtpJournalChantier {
  id: string;
  chantier_id: string;
  date: string;
  effectifs_presents?: string; 
  avancement_pct: number;
  commentaire?: string;
  incidents_mineurs?: string;
  created_by: string;
}

export interface BtpIncidentQHSE {
  id: string;
  chantier_id: string;
  date: string;
  gravite: BtpIncidentGravite;
  description: string;
  mesures_correctives?: string;
  statut: BtpIncidentStatus;
  declare_par: string;
  valide_par_dg?: boolean;
}

export interface BtpEngin {
  id: string;
  type: string;
  identifiant_interne: string;
  statut: BtpEnginStatus;
  chantier_affecte_id?: string;
  compteur_horaire: number;
  /** Taux horaire d'imputation au chantier (GNF/h). */
  taux_horaire?: number;
  date_derniere_maintenance?: string;
  date_prochaine_maintenance_prevue?: string;
}

export interface BtpSituationTravaux {
  id: string;
  chantier_id: string;
  numero?: string; // SIT-2026-NNN (B-15 : traçabilité documentaire)
  periode: string;
  pct_avancement_declare: number;
  montant_facture: number;
  montant_ht?: number;
  tva_amount?: number;
  retenue_amount?: number;
  retenue_liberee?: boolean;
  valide_par_conducteur?: boolean;
  statut: BtpSituationStatus;
  date_facturation?: string;
}

// --- EXTENSION BTP (Phases 1-5) ---

/** Ligne de chiffrage structurée (Phase 2 — éditeur ETUDES). */
export interface BtpChiffrageLigne {
  famille: 'MATERIAUX' | 'MAIN_OEUVRE' | 'MATERIEL' | 'SOUS_TRAITANCE' | 'FRAIS_GENERAUX';
  phase?: string; // e.g., "Terrassement", "Gros Œuvre", "Finitions"
  designation: string;
  quantite: number;
  pu: number;
}

export interface BtpChiffrage {
  lignes: BtpChiffrageLigne[];
  cout_total: number;
  marge_pct: number;
}

/** Affectation d'un employé RH à un chantier (Phase 3). */
export interface BtpAffectation {
  id: string;
  employee_id: string;
  chantier_id: string;
  date_debut: string;
  date_fin?: string;
  role_chantier?: string;
  taux_journalier: number;
  statut: 'active' | 'terminée';
  created_by?: string;
}

/** Pointage journalier (Phase 3). */
export interface BtpPointage {
  id: string;
  employee_id: string;
  chantier_id: string;
  date: string;
  heures: number;
  presence?: 'présent' | 'absent' | 'congé';
  commentaire?: string;
  created_by?: string;
}

/** Article de stock magasin (Phase 4). */
export interface BtpArticle {
  id: string;
  reference?: string;
  designation: string;
  unite: string;
  pu: number;
  seuil_alerte?: number;
}

export type BtpBonCommandeStatus = 'brouillon' | 'soumis' | 'reçu' | 'annulé';

export interface BtpBonCommandeLigne {
  article_id: string;
  designation: string;
  quantite: number;
  pu: number;
}

export interface BtpBonCommande {
  id: string;
  chantier_id: string;
  fournisseur: string;
  lignes: BtpBonCommandeLigne[];
  total_ht: number;
  date_souhaitee?: string;
  statut: BtpBonCommandeStatus;
  date_reception?: string;
  created_by?: string;
}

export type BtpMouvementType = 'entree' | 'sortie_chantier' | 'retour';

/** Mouvement de stock : '' = dépôt central (Phase 4). */
export interface BtpMouvement {
  id: string;
  article_id: string;
  type: BtpMouvementType;
  quantite: number;
  /** Valorisation unitaire à la sortie (imputation chantier). */
  cout_unitaire?: number;
  chantier_id?: string;
  bc_id?: string;
  motif?: string;
  created_by?: string;
}

export type BtpDocumentType = 'plan' | 'pv_reception' | 'attestation' | 'contrat' | 'photo' | 'autre';

/** GED chantier (Phase 5). */
export interface BtpDocument {
  id: string;
  chantier_id: string;
  type: BtpDocumentType;
  nom: string;
  url: string;
  description?: string;
  created_by?: string;
}

/** Agrégats financiers par chantier — calculés côté serveur (Phase 1). */
export interface BtpChantierStat {
  id: string;
  budget_engage: number;
  montant_situations_facturees: number;
  montant_situations_attente: number;
  cout_mo_reel: number;
  heures_pointees: number;
  cout_engins: number;
  cout_stock_sorti: number;
  cout_sous_traitance: number;
  retenue_bloquee: number;
}

/** Annuaire light (sans données personnelles ni salaires). */
export interface BtpEmployeeDirectoryEntry {
  id: string;
  firstName: string;
  lastName: string;
  position?: string;
}

// --- EXTENSION BTP — Vague 2 ---

export type BtpAvenantType = 'montant' | 'delai' | 'montant_delai' | 'penalite';
export type BtpAvenantStatus = 'brouillon' | 'validé' | 'rejeté';

/** Avenant (ATS) : modification contractualisée du marché. */
export interface BtpAvenant {
  id: string;
  chantier_id: string;
  type: BtpAvenantType;
  objet: string;
  /** Delta : positif (hausse), négatif (pénalité/baisse). */
  montant: number;
  jours_delai?: number;
  date: string;
  statut: BtpAvenantStatus;
  created_by?: string;
}

/** Ordre de Service : démarrage / arrêt / reprise / réception. */
export interface BtpOrdreService {
  id: string;
  chantier_id: string;
  type: 'démarrage' | 'arrêt' | 'reprise' | 'réception';
  date: string;
  motif?: string;
  created_by?: string;
}

/** Réserve émise lors de la réception des travaux (Point 3) */
export interface BtpReserve {
  id: string;
  chantier_id: string;
  description: string;
  date_emission: string;
  statut: 'en_cours' | 'levee';
  date_levee?: string;
  commentaire_levee?: string;
  created_by?: string;
}

/** Habilitation/Certification employé BTP (Point 9) */
export interface BtpHabilitation {
  id: string;
  employee_id: string;
  type_habilitation: string; // ex: 'CACES R482', 'Habilitation Électrique H0B0'
  date_obtention: string;
  date_expiration: string;
  document_url?: string;
}

// --- EXTENSION BTP — Vague 3 ---
export interface BtpSousTraitance {
  id: string;
  chantier_id: string;
  entreprise: string;
  objet: string;
  montant: number;
  date_debut?: string;
  date_fin_prevue?: string;
  statut: 'en_cours' | 'soldée' | 'résiliée';
  created_by?: string;
}

export interface BtpFournisseur {
  id: string;
  nom: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  nif?: string;
  specialite?: string;
}

export interface BtpCautionnement {
  id: string;
  chantier_id: string;
  type: 'soumission' | 'bonne_execution' | 'decennale' | 'avance';
  assureur_banque: string;
  montant: number;
  date_debut?: string;
  date_fin?: string;
  statut: 'active' | 'libérée' | 'apurée';
}

export interface BtpInspection {
  id: string;
  chantier_id: string;
  date: string;
  type: 'inspection' | 'audit' | 'visite';
  constats?: string;
  actions_correctives?: string;
  gravite?: 'mineure' | 'majeure' | 'critique';
  statut: 'planifiée' | 'réalisée' | 'clôturée';
  inspecteur_id?: string;
}

/** Bibliothèque de prix unitaires (BPU) réutilisable dans les chiffrages. */
export interface BtpPrixUnitaire {
  id: string;
  designation: string;
  unite: string;
  pu: number;
  famille: BtpChiffrageLigne['famille'];
  source?: 'manuel' | 'achat';
}

/** Heures d'engin imputées à un chantier (coût = heures × taux_horaire). */
export interface BtpHeureEngin {
  id: string;
  engin_id: string;
  chantier_id: string;
  date: string;
  heures: number;
  created_by?: string;
}

// --- AGROALIMENTAIRE / AGROBUSINESS MODELS ---

export type AgroMatierePremiereStatus = 'planifié' | 'réceptionné' | 'contrôlé' | 'contrôlé_en_attente_resultats' | 'accepté' | 'rejeté' | 'en_stock' | 'épuisé';

export interface LotMatierePremiere {
  id_lot: string;
  fournisseur_ou_parcelle: string;
  date_reception: string;
  quantite: number;
  quantite_restante?: number;
  unite: string;
  statut: AgroMatierePremiereStatus;
  resultat_controle_qualite?: 'conforme' | 'non_conforme' | 'en_attente';
  motif_rejet?: string;
  emplacement_stockage?: string;
  cout_acquisition: number;
  created_by?: string;
  qualite_validated_by?: string;
}

export type AgroProductionStatus = 'planifié' | 'en_production' | 'contrôle_qualité_process' | 'conditionné' | 'bloqué' | 'disponible_à_la_vente' | 'épuisé' | 'détruit' | 'déclassé';

export interface LotProduction {
  id_lot: string;
  nom_produit: string;
  date_fabrication: string;
  quantite_produite: number;
  quantite_restante?: number;
  unite: string;
  statut: AgroProductionStatus;
  responsable_production_id: string;
  lots_matiere_premiere_utilises: { lot_id: string; quantite_utilisee: number }[];
  decision_deblocage?: string;
}

export interface ControleQualiteProcess {
  id: string;
  lot_production_id: string;
  point_de_controle: string; // CCP
  date: string;
  resultat: 'conforme' | 'non_conforme';
  valeur_mesuree?: string;
  seuil_attendu?: string;
  controleur_id: string;
}

export type AgroCommandeStatus = 'enregistrée' | 'confirmée' | 'préparée' | 'livrée' | 'facturée';

export interface CommandeClientAgro {
  id: string;
  client_id: string;
  statut: AgroCommandeStatus;
  commercial_id: string;
  date_livraison_prevue: string;
  produits_commandes?: string;
}

export interface LigneCommandeLotLivre {
  id: string;
  commande_id: string;
  lot_production_id: string;
  quantite_livree: number;
}

export interface FicheTracabilite {
  id: string;
  commande_id: string;
  lots_produits_finis: string[];
  lots_matiere_premiere_origine: string[];
  date_edition: string;
  fichier_pdf_url?: string;
}

export type AgroReclamationStatus = 'ouverte' | 'en_cours' | 'clôturée';

export interface ReclamationClient {
  id: string;
  commande_id: string;
  client_id: string;
  lot_production_id?: string;
  motif: string;
  statut: AgroReclamationStatus;
  date_reclamation: string;
  risque_rappel_signale: boolean;
}

// ------------------------------------------------------------------
// MODULE COMPTABILITÉ & TRÉSORERIE (SYSCOHADA)
// ------------------------------------------------------------------

export interface AccountingAccount {
  id: string; // Ex: "411000"
  accountNumber: string; // Numéro du compte (ex: 411000)
  name: string; // Nom (ex: Clients - Ventes de biens)
  class: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9; // Classe SYSCOHADA
  isSubAccount: boolean;
  parentAccountId?: string;
}

export interface AccountingJournal {
  id: string; // Ex: "VT", "ACH", "BQ", "CA", "OD"
  code: string; // Ex: "VT"
  name: string; // Ex: "Journal des Ventes"
  type: 'ACHATS' | 'VENTES' | 'TRESORERIE' | 'OPERATIONS_DIVERSES' | 'A_NOUVEAUX';
}

export interface AccountingEntryLine {
  id: string;
  accountId: string; // Réf vers AccountingAccount.id
  debit: number;
  credit: number;
  label: string; // Libellé de la ligne
}

export type AccountingEntryStatus = 'DRAFT' | 'VALIDATED'; // VALIDATED = Verrouillé (Piste d'audit)

export interface AccountingEntry {
  id: string;
  journalId: string; // Réf vers AccountingJournal.id
  date: string;
  reference: string; // Ex: Numéro de facture, ID de paie
  description: string; // Libellé général de l'écriture
  lines: AccountingEntryLine[]; // Débit/Crédit (doivent s'équilibrer)
  status: AccountingEntryStatus;
  createdBy: string;
  createdAt: string;
  validatedAt?: string; // Horodatage pour la piste d'audit
}

export type AssetAmortizationType = 'LINEAIRE' | 'DEGRESSIF';

export interface Asset {
  id: string;
  name: string; // Ex: Véhicule de service
  accountId: string; // Réf vers le compte classe 2
  purchaseDate: string;
  purchaseValue: number;
  amortizationType: AssetAmortizationType;
  amortizationDurationYears: number; // Durée de vie en années
  status: 'ACTIF' | 'CEDE' | 'REFORME';
}

// --- MODULE ASSISTANT DE DIRECTION ---
export interface AssistantTask {
  id: string;
  title: string;
  description?: string;
  importance: 'HAUTE' | 'BASSE'; // Matrice Eisenhower
  urgence: 'HAUTE' | 'BASSE';
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  dueDate?: string;
  delegatedTo?: string; // ID ou nom de la personne à qui c'est délégué
  createdAt: string;
}

export interface AssistantMeeting {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  participants: string; // ex: "DG, DAF, Client XYZ"
  agenda: string;
  status: 'PLANNED' | 'HELD' | 'CANCELED';
  report?: string; // Compte Rendu (CR)
}

export interface AssistantDocument {
  id: string;
  title: string;
  category: 'CONTRAT' | 'ADMINISTRATIF' | 'ASSURANCE' | 'LEGAL' | 'AUTRE';
  url: string;
  isConfidential: boolean;
  expirationDate?: string;
  status: 'VALID' | 'EXPIRING' | 'EXPIRED' | 'ARCHIVED';
  createdAt: string;
}

export interface AssistantContact {
  id: string;
  name: string;
  organization: string;
  role: string;
  phone: string;
  email: string;
  category: 'PARTENAIRE' | 'INVESTISSEUR' | 'INSTITUTION' | 'PRESTATAIRE' | 'AUTRE';
  notes?: string;
  isVip: boolean;
}

export interface AssistantTravel {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  purpose: string;
  budget: number;
  status: 'PLANNED' | 'ONGOING' | 'COMPLETED' | 'CANCELED';
  itineraryNotes?: string;
}
