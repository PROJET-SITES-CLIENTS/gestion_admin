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
  // Paramètres Comptabilité & TVA
  tvaRate?: number; // ex: 18 (%)
  
  // Paramètres Délégation
  delegations?: Partial<Record<Role, Role>>;

  // Modules et Permissions
  activeModules?: string[]; // e.g. ['BTP']
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
  status: 'PENDING' | 'PAID' | 'REJECTED';
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

export interface Prospect {
  id: string;
  name: string;
  phone: string;
  email?: string;
  source?: string;
  qualification: ProspectQualification;
  stage: ProspectStage;
  
  interactions: ProspectInteraction[];
  meetings: ProspectMeeting[];
  history: ProspectHistory[];
  
  projectType?: string;
  estimatedBudget?: string;
  objectives?: string;

  nextActionDate?: string;
  lossReason?: string; // New: Why it was lost
  documents?: Document[]; // New: Devis etc for prospect
  createdAt: string;
  updatedAt: string;
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
  userId?: string; // S'il a un compte utilisateur
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  cnssNumber?: string;
  birthDate?: string;
  address?: string;
  bankDetails?: string; // New: RIB
  emergencyContact?: string; // New: Emergency contact
  maritalStatus?: string; // New
  hireDate: string;
  position: string;
  department: string;
  baseSalary: number;
  isActive: boolean; // Note: false means suspended/terminated
  documents?: { name: string; url?: string }[];
  leaveBalance?: number; // New: Number of remaining leave days
}

export type ContractType = 'CDI' | 'CDD' | 'STAGIAIRE' | 'APPRENTI';

export interface Contract {
  id: string;
  employeeId: string;
  type: ContractType;
  startDate: string;
  endDate?: string;
  probationEndDate?: string;
  status: 'ACTIVE' | 'TERMINATED' | 'EXPIRED';
  fileUrl?: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  leaveType?: 'ANNUAL' | 'SICK' | 'MATERNITY' | 'UNPAID'; // New
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SalaryAdvance {
  id: string;
  employeeId: string;
  amount: number;
  date: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REIMBURSED';
  monthToDeduct: number; // e.g. 8 for August
  yearToDeduct: number;
}

export interface Payslip {
  id: string;
  employeeId: string;
  month: number;
  year: number;
  baseSalary: number;
  bonuses: number; // Includes general bonuses
  overtimeAmount?: number; // New: Heures sup
  grossSalary: number;
  cnssEmployeeAmount: number;
  cnssEmployerAmount: number;
  rtsAmount: number;
  deductions?: number; // New: For salary advances etc.
  netSalary: number;
  status: 'DRAFT' | 'VALIDATED' | 'PAID';
  pdfUrl?: string; // New: PDF Export
  createdAt: string;
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
  nom: string;
  client: string;
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
