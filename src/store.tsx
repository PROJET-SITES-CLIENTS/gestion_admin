import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Project, User, Role, CompanyConfig, Expense, ProjectStatus, AuthResponse, Prospect, TreasuryAccount, Transaction, BtpOffre, BtpChantier, BtpJournalChantier, BtpIncidentQHSE, BtpEngin, BtpSituationTravaux, BtpOffreStatus, BtpChantierStatus, BtpEnginStatus, BtpAffectation, BtpPointage, BtpArticle, BtpBonCommande, BtpMouvement, BtpDocument, BtpChantierStat, BtpEmployeeDirectoryEntry, BtpAvenant, BtpOrdreService, BtpSousTraitance, BtpFournisseur, BtpCautionnement, BtpInspection, BtpPrixUnitaire, BtpHeureEngin, LotMatierePremiere, AgroMatierePremiereStatus, LotProduction, AgroProductionStatus, ControleQualiteProcess, CommandeClientAgro, AgroCommandeStatus, LigneCommandeLotLivre, FicheTracabilite, ReclamationClient, AgroReclamationStatus, Task, AppNotification, CalendarEvent, ServiceCatalogItem, ServiceProposal, BtpReserve, BtpHabilitation } from './types';
import { apiFetch, getAuthToken, readApiError } from './apiClient';

export interface Toast {
  id: number;
  message: string;
  type: 'SUCCESS' | 'ERROR' | 'WARNING' | 'INFO';
}

interface AppContextType {
  projects: Project[];
  clients: any[]; // New
  expenses: Expense[];
  currentRole: Role | null;
  currentUser: User | null;
  companyConfig: CompanyConfig;
  isReady: boolean;
  setRole: (role: Role) => void;
  login: (u: string, p: string) => Promise<AuthResponse>;
  register: (u: string, p: string, r: string, f: string, l: string) => Promise<AuthResponse>;
  createUser: (u: string, p: string, r: string, f: string, l: string) => Promise<AuthResponse>;
  logout: () => void;
  addProject: (name: string) => Promise<string | undefined>;
  confirmPaymentCommercial: (id: string) => Promise<void>;
  confirmPaymentAccountant: (id: string) => Promise<void>;
  generateDocument: (id: string, type: 'PROFORMA' | 'RECEIPT' | 'SPECS', data?: any) => Promise<string>;
  updateCompanyConfig: (config: CompanyConfig) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  savePaymentPlan: (id: string, plan: any) => Promise<void>;
  updatePaymentInstallment: (projectId: string, installmentId: string, status: 'PENDING' | 'PAID', receiptId?: string) => Promise<void>;
  payInstallmentAndGenerateReceipt: (projectId: string, installmentId: string, installmentName: string, amount: number) => Promise<any>;
  updateProject: (project: Project) => Promise<void>;
  alertUnpaid: (projectId: string) => Promise<void>;
  cancelProject: (projectId: string) => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
  updateExpenseStatus: (id: string, status: 'PENDING'|'PAID'|'REJECTED', reason?: string) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  systemUsers: User[];
  fetchSystemUsers: () => Promise<void>;
  deleteUser: (id: string) => Promise<{ success: boolean; error?: string }>;
  prospects: Prospect[];
  fetchProspects: () => Promise<void>;
  addProspect: (prospect: Omit<Prospect, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string | undefined>;
  updateProspect: (id: string, updates: Partial<Prospect>) => Promise<void>;
  deleteProspect: (id: string) => Promise<void>;
  convertProspectToProject: (id: string) => Promise<string | undefined>;
  
  // Nouveaux ajouts CRM & Catalogue
  catalogue: ServiceCatalogItem[];
  addCatalogueItem: (item: Omit<ServiceCatalogItem, 'id'>) => Promise<void>;
  updateCatalogueItem: (id: string, updates: Partial<ServiceCatalogItem>) => Promise<void>;
  deleteCatalogueItem: (id: string) => Promise<void>;
  
  proposals: ServiceProposal[];
  generateProposal: (proposal: Omit<ServiceProposal, 'id' | 'createdAt'>) => Promise<void>;
  updateProposalStatus: (id: string, status: ServiceProposal['status']) => Promise<void>;
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
  // Messaging
  internalMessages: any[];
  fetchMessages: () => Promise<void>;
  sendMessage: (receiverRole: Role | 'ALL', content: string, attachment?: any) => Promise<void>;
  markAsRead: (msgId: string) => Promise<void>;
  // HR
  employees: any[];
  contracts: any[];
  leaveRequests: any[];
  payslips: any[];
  addEmployee: (emp: any) => Promise<void>;
  addContract: (ctr: any) => Promise<void>;
  addLeaveRequest: (lr: any) => Promise<void>;
  updateLeaveRequestStatus: (id: string, status: 'PENDING'|'APPROVED'|'REJECTED', reason?: string) => Promise<void>;
  registerSalaryAdvance: (employeeId: string, amount: number) => Promise<void>;
  addPayslip: (ps: any) => Promise<void>;
  updatePayslipStatus: (id: string, status: string) => Promise<void>;
  // Accounting (Treasury & SYSCOHADA)
  treasuryAccounts: TreasuryAccount[];
  transactions: Transaction[];
  accountingAccounts: any[];
  accountingJournals: any[];
  accountingEntries: any[];
  assets: any[];
  addTreasuryAccount: (acc: Omit<TreasuryAccount, 'id' | 'balance'>) => Promise<void>;
  addTransaction: (tx: Omit<Transaction, 'id' | 'date'>) => Promise<boolean>;
  postAccountingEntry: (entry: Omit<any, 'id' | 'createdAt' | 'createdBy' | 'status'>) => Promise<void>;
  validateAccountingEntry: (id: string) => Promise<void>;
  createAsset: (asset: Omit<any, 'id' | 'status'>) => Promise<void>;
  createAccountingAccount: (account: Omit<any, 'id'>) => Promise<void>;
  // Communication & Tasks
  tasks: any[];
  notifications: any[];
  addTask: (receiverRole: Role, title: string, content: string, priority?: 'LOW'|'MEDIUM'|'HIGH', link?: string) => Promise<void>;
  updateTaskStatus: (taskId: string, status: 'TODO'|'IN_PROGRESS'|'DONE') => Promise<void>;
  addNotification: (targetRole: Role, message: string, type: 'INFO'|'WARNING'|'SUCCESS'|'ERROR', link?: string) => Promise<void>;
  markNotificationAsRead: (notificationId: string) => Promise<void>;

  // BTP Module
  btpOffres: BtpOffre[];
  btpChantiers: BtpChantier[];
  btpEngins: BtpEngin[];
  btpIncidents: BtpIncidentQHSE[];
  btpJournaux: BtpJournalChantier[];
  btpSituations: BtpSituationTravaux[];
  
  createBtpOffre: (offre: Omit<BtpOffre, 'id' | 'statut' | 'updated_at' | 'created_by'>) => Promise<void>;
  updateBtpOffreStatus: (id: string, status: BtpOffreStatus, commentaire?: string) => Promise<void>;
  updateBtpOffre: (id: string, updates: Partial<BtpOffre>) => Promise<void>;
  
  createBtpChantier: (chantier: Omit<BtpChantier, 'id' | 'statut'>) => Promise<void>;
  updateBtpChantierStatus: (id: string, status: BtpChantierStatus) => Promise<void>;
  updateBtpChantier: (id: string, updates: Partial<BtpChantier>) => Promise<void>;
  
  assignBtpEngin: (enginId: string, chantierId: string | undefined) => Promise<void>;
  updateBtpEnginStatus: (enginId: string, status: BtpEnginStatus) => Promise<void>;
  
  createBtpIncident: (incident: Omit<BtpIncidentQHSE, 'id' | 'statut' | 'declare_par'>) => Promise<void>;
  updateBtpIncidentStatus: (id: string, status: BtpIncidentQHSE['statut'], dgValide?: boolean) => Promise<void>;
  
  createBtpJournal: (journal: Omit<BtpJournalChantier, 'id' | 'created_by'>) => Promise<void>;
  createBtpSituation: (situation: Omit<BtpSituationTravaux, 'id' | 'statut'>) => Promise<void>;
  updateBtpSituation: (id: string, updates: Partial<BtpSituationTravaux>) => Promise<void>;

  // Extension BTP — Phase 1 : boucle économique
  factureBtpSituation: (situationId: string, accountId: string) => Promise<boolean>;
  btpChantierStats: BtpChantierStat[];
  btpEmployeeDirectory: BtpEmployeeDirectoryEntry[];

  // Extension BTP — Phase 3 : main d'œuvre
  btpAffectations: BtpAffectation[];
  createBtpAffectation: (aff: Omit<BtpAffectation, 'id' | 'statut' | 'created_by'>) => Promise<void>;
  terminerBtpAffectation: (id: string) => Promise<void>;
  btpPointages: BtpPointage[];
  createBtpPointage: (p: Omit<BtpPointage, 'id' | 'created_by'>) => Promise<void>;

  // Extension BTP — Phase 4 : achats & stock
  btpArticles: BtpArticle[];
  createBtpArticle: (art: Omit<BtpArticle, 'id'>) => Promise<void>;
  updateBtpArticle: (id: string, updates: Partial<BtpArticle>) => Promise<void>;
  btpBonCommandes: BtpBonCommande[];
  createBtpBonCommande: (bc: Omit<BtpBonCommande, 'id' | 'statut' | 'created_by'>) => Promise<void>;
  soumettreBtpBonCommande: (id: string) => Promise<void>;
  recevoirBtpBonCommande: (id: string) => Promise<boolean>;
  btpMouvements: BtpMouvement[];
  createBtpMouvement: (m: Omit<BtpMouvement, 'id' | 'created_by'>) => Promise<void>;

  // Extension BTP — Phase 5 : GED
  btpDocuments: BtpDocument[];
  addBtpDocument: (doc: Omit<BtpDocument, 'id' | 'created_by'>) => Promise<void>;

  // Extension BTP — Vague 2
  btpAvenants: BtpAvenant[];
  createBtpAvenant: (av: Omit<BtpAvenant, 'id' | 'statut' | 'created_by'>) => Promise<void>;
  validerBtpAvenant: (id: string) => Promise<boolean>;
  rejeterBtpAvenant: (id: string) => Promise<void>;
  btpOrdresService: BtpOrdreService[];
  btpReserves: BtpReserve[];
  btpHabilitations: BtpHabilitation[];
  createBtpReserve: (r: Omit<BtpReserve, 'id' | 'created_by'>) => Promise<void>;
  updateBtpReserve: (id: string, updates: Partial<BtpReserve>) => Promise<void>;
  createBtpHabilitation: (h: Omit<BtpHabilitation, 'id'>) => Promise<void>;
  updateBtpHabilitation: (id: string, updates: Partial<BtpHabilitation>) => Promise<void>;
  btpSousTraitances: BtpSousTraitance[];
  createBtpSousTraitance: (st: Omit<BtpSousTraitance, 'id' | 'statut' | 'created_by'>) => Promise<void>;
  solderBtpSousTraitance: (id: string) => Promise<void>;
  btpFournisseurs: BtpFournisseur[];
  createBtpFournisseur: (f: Omit<BtpFournisseur, 'id'>) => Promise<void>;
  btpCautionnements: BtpCautionnement[];
  createBtpCautionnement: (c: Omit<BtpCautionnement, 'id' | 'statut'>) => Promise<void>;
  libererBtpRetenues: (chantierId: string, accountId: string) => Promise<boolean>;
  btpInspections: BtpInspection[];
  createBtpInspection: (i: Omit<BtpInspection, 'id' | 'statut' | 'inspecteur_id'>) => Promise<void>;
  updateBtpInspection: (id: string, updates: Partial<BtpInspection>) => Promise<void>;
  btpPrixUnitaires: BtpPrixUnitaire[];
  createBtpPrixUnitaire: (p: Omit<BtpPrixUnitaire, 'id'>) => Promise<void>;
  btpHeuresEngins: BtpHeureEngin[];
  createBtpHeureEngin: (h: Omit<BtpHeureEngin, 'id' | 'created_by'>) => Promise<void>;
  validerRhChantier: (id: string) => Promise<void>;
  updateBtpEngin: (id: string, updates: Partial<BtpEngin>) => Promise<void>;
  libererCautionnement: (id: string) => Promise<void>;

  // Agro Module
  agroLotMatierePremieres: LotMatierePremiere[];
  agroLotProductions: LotProduction[];
  agroControles: ControleQualiteProcess[];
  agroCommandes: CommandeClientAgro[];
  agroLignesLivrees: LigneCommandeLotLivre[];
  agroFiches: FicheTracabilite[];
  agroReclamations: ReclamationClient[];

  agroCreateLotMatierePremiere: (lot: Omit<LotMatierePremiere, 'id_lot' | 'statut' | 'created_by'>) => Promise<void>;
  agroUpdateMatierePremiereStatus: (id_lot: string, status: AgroMatierePremiereStatus, resultat_controle?: 'conforme' | 'non_conforme' | 'en_attente', motif_rejet?: string) => Promise<void>;
  
  agroCreateLotProduction: (lot: Omit<LotProduction, 'id_lot' | 'statut' | 'decision_deblocage'>) => Promise<void>;
  agroUpdateProductionStatus: (id_lot: string, status: AgroProductionStatus, decision_deblocage?: string) => Promise<void>;
  
  agroAddControleProcess: (controle: Omit<ControleQualiteProcess, 'id'>) => Promise<void>;
  
  agroCreateCommande: (cmd: Omit<CommandeClientAgro, 'id' | 'statut'>) => Promise<void>;
  agroUpdateCommandeStatus: (id: string, status: AgroCommandeStatus) => Promise<void>;
  
  agroPrepareLivraison: (commande_id: string, affectations: Omit<LigneCommandeLotLivre, 'id' | 'commande_id'>[]) => Promise<void>;
  
  agroCreateReclamation: (rec: Omit<ReclamationClient, 'id' | 'statut' | 'risque_rappel_signale'>) => Promise<void>;

  // Module Assistante
  agendaEvents: CalendarEvent[];
  addAgendaEvent: (event: Omit<CalendarEvent, 'id'>) => Promise<void>;
  deleteAgendaEvent: (id: string) => Promise<void>;

  // Module Assistant
  assistantTasks: any[];
  assistantMeetings: any[];
  assistantDocuments: any[];
  assistantContacts: any[];
  assistantTravels: any[];

  // Helpers Assistant
  crudCreateItem: (table: string, payload: any, context: string) => Promise<any>;
  crudUpdateItem: (table: string, id: string, payload: any, context: string) => Promise<any>;
  crudDeleteItem: (table: string, id: string, context: string) => Promise<boolean>;

  toasts: Toast[];
  pushToast: (message: string, type?: Toast['type']) => void;
  dismissToast: (id: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<any[]>([]); // New
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [companyConfig, setCompanyConfig] = useState<CompanyConfig>({});
  const [systemUsers, setSystemUsers] = useState<User[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [catalogue, setCatalogue] = useState<ServiceCatalogItem[]>([]);
  const [proposals, setProposals] = useState<ServiceProposal[]>([]);
  const [activeMenu, setActiveMenu] = useState('DASHBOARD');
  const [internalMessages, setInternalMessages] = useState<any[]>([]);

  // HR States
  const [employees, setEmployees] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [payslips, setPayslips] = useState<any[]>([]);

  // Accounting States (Treasury & SYSCOHADA)
  const [treasuryAccounts, setTreasuryAccounts] = useState<TreasuryAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accountingAccounts, setAccountingAccounts] = useState<any[]>([]);
  const [accountingJournals, setAccountingJournals] = useState<any[]>([]);
  const [accountingEntries, setAccountingEntries] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);

  // Tasks & Notifications
  const [tasks, setTasks] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  // BTP States
  const [btpOffres, setBtpOffres] = useState<BtpOffre[]>([]);
  const [btpChantiers, setBtpChantiers] = useState<BtpChantier[]>([]);
  const [btpEngins, setBtpEngins] = useState<BtpEngin[]>([]);
  const [btpIncidents, setBtpIncidents] = useState<BtpIncidentQHSE[]>([]);
  const [btpJournaux, setBtpJournaux] = useState<BtpJournalChantier[]>([]);
  const [btpSituations, setBtpSituations] = useState<BtpSituationTravaux[]>([]);

  // Extension BTP States
  const [btpAffectations, setBtpAffectations] = useState<BtpAffectation[]>([]);
  const [btpPointages, setBtpPointages] = useState<BtpPointage[]>([]);
  const [btpArticles, setBtpArticles] = useState<BtpArticle[]>([]);
  const [btpBonCommandes, setBtpBonCommandes] = useState<BtpBonCommande[]>([]);
  const [btpMouvements, setBtpMouvements] = useState<BtpMouvement[]>([]);
  const [btpDocuments, setBtpDocuments] = useState<BtpDocument[]>([]);
  const [btpChantierStats, setBtpChantierStats] = useState<BtpChantierStat[]>([]);
  const [btpEmployeeDirectory, setBtpEmployeeDirectory] = useState<BtpEmployeeDirectoryEntry[]>([]);

  // Extension BTP Vague 2
  const [btpAvenants, setBtpAvenants] = useState<BtpAvenant[]>([]);
  const [btpOrdresService, setBtpOrdresService] = useState<BtpOrdreService[]>([]);
  const [btpReserves, setBtpReserves] = useState<BtpReserve[]>([]);
  const [btpHabilitations, setBtpHabilitations] = useState<BtpHabilitation[]>([]);
  const [btpSousTraitances, setBtpSousTraitances] = useState<BtpSousTraitance[]>([]);
  const [btpFournisseurs, setBtpFournisseurs] = useState<BtpFournisseur[]>([]);
  const [btpCautionnements, setBtpCautionnements] = useState<BtpCautionnement[]>([]);
  const [btpInspections, setBtpInspections] = useState<BtpInspection[]>([]);
  const [btpPrixUnitaires, setBtpPrixUnitaires] = useState<BtpPrixUnitaire[]>([]);
  const [btpHeuresEngins, setBtpHeuresEngins] = useState<BtpHeureEngin[]>([]);

  // Agro States
  const [agroLotMatierePremieres, setAgroLotMatierePremieres] = useState<LotMatierePremiere[]>([]);
  const [agroLotProductions, setAgroLotProductions] = useState<LotProduction[]>([]);
  const [agroControles, setAgroControles] = useState<ControleQualiteProcess[]>([]);
  const [agroCommandes, setAgroCommandes] = useState<CommandeClientAgro[]>([]);
  const [agroLignesLivrees, setAgroLignesLivrees] = useState<LigneCommandeLotLivre[]>([]);
  const [agroFiches, setAgroFiches] = useState<FicheTracabilite[]>([]);
  const [agroReclamations, setAgroReclamations] = useState<ReclamationClient[]>([]);

  // Assistante States
  const [agendaEvents, setAgendaEvents] = useState<CalendarEvent[]>([]);
  const [assistantTasks, setAssistantTasks] = useState<any[]>([]);
  const [assistantMeetings, setAssistantMeetings] = useState<any[]>([]);
  const [assistantDocuments, setAssistantDocuments] = useState<any[]>([]);
  const [assistantContacts, setAssistantContacts] = useState<any[]>([]);
  const [assistantTravels, setAssistantTravels] = useState<any[]>([]);

  // Toasts (retour utilisateur des erreurs API)
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  const pushToast = useCallback((message: string, type: Toast['type'] = 'ERROR') => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev.slice(-4), { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  /** Signalise une erreur d'appel API (remplace les `catch (err) {}` muets). */
  const reportError = useCallback((err: unknown, context: string) => {
    console.error(`[API] ${context}:`, err);
    pushToast(`${context} : échec de la sauvegarde. Vérifiez votre connexion.`, 'ERROR');
  }, [pushToast]);

  /**
   * Appel CRUD générique vers une table whitelistée côté serveur.
   * Retourne l'élément créé, ou null en cas d'échec (toast affiché).
   */
  const crudCreate = useCallback(async <T,>(table: string, payload: object, context: string): Promise<T | null> => {
    try {
      const res = await apiFetch(`/crud/${table}`, { method: 'POST', body: JSON.stringify(payload) });
      if (res.ok) return (await res.json()) as T;
      pushToast(`${context} : ${await readApiError(res)}`, 'ERROR');
      return null;
    } catch (err) {
      reportError(err, context);
      return null;
    }
  }, [pushToast, reportError]);

  const crudUpdate = useCallback(async (table: string, id: string, updates: object, context: string): Promise<any | null> => {
    try {
      const res = await apiFetch(`/crud/${table}/${id}/update`, { method: 'POST', body: JSON.stringify(updates) });
      if (res.ok) return await res.json();
      pushToast(`${context} : ${await readApiError(res)}`, 'ERROR');
      return null;
    } catch (err) {
      reportError(err, context);
      return null;
    }
  }, [pushToast, reportError]);

  /** Suppression via le CRUD générique (réservé GERANT côté serveur) */
  const crudDelete = useCallback(async (table: string, id: string, context: string): Promise<boolean> => {
    try {
      const res = await apiFetch(`/crud/${table}/${id}/delete`, { method: 'POST' });
      if (res.ok) return true;
      pushToast(`${context} : ${await readApiError(res)}`, 'ERROR');
      return false;
    } catch (err) {
      reportError(err, context);
      return false;
    }
  }, [pushToast, reportError]);

  const determineStatus = (p: Project): ProjectStatus => {
    return p.status || 'NOUVEAU';
  };

  const addNotification = async (targetRole: Role | 'ALL', message: string, type: 'INFO'|'WARNING'|'SUCCESS'|'ERROR' = 'INFO', link?: string) => {
    const newNotif = { targetRole, message, type, link, isRead: false };
    try {
      const res = await apiFetch('/notifications', { method: 'POST', body: JSON.stringify(newNotif) });
      if (res.ok) {
        const n = await res.json();
        setNotifications(prev => [...prev, n]);
      }
    } catch (err) { reportError(err, 'Opération'); }
  };

  const addTask = async (receiverRole: Role | 'ALL', title: string, content: string, priority: 'LOW'|'MEDIUM'|'HIGH' = 'MEDIUM', link?: string) => {
    if (!currentUser) return;
    let finalReceiver = receiverRole;
    let finalContent = content;
    
    // Logique de délégation d'absence
    if (receiverRole !== 'ALL' && companyConfig?.delegations && companyConfig.delegations[receiverRole as Role]) {
      finalReceiver = companyConfig.delegations[receiverRole as Role] as Role;
      finalContent = `[Délégué depuis ${receiverRole}] ${content}`;
    }

    const newTask = {
      senderRole: currentUser.role,
      senderName: `${currentUser.firstName} ${currentUser.lastName}`,
      receiverRole: finalReceiver,
      title,
      content: finalContent,
      priority,
      status: 'TODO',
      link,
      escalated: false
    };
    try {
      const res = await apiFetch('/tasks', { method: 'POST', body: JSON.stringify(newTask) });
      if (res.ok) {
        const t = await res.json();
        setTasks(prev => [...prev, t]);
      }
    } catch (err) { reportError(err, 'Opération'); }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('coord_user');
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        if (u.token) {
          setCurrentUser(u);
          setCurrentRole(u.role);
        }
      } catch (e) {}
    }
  }, []);

  // Anti re-renders : si le polling 15 s renvoie des données IDENTIQUES,
  // on ne redistribue rien (les 30 setStates sont sautés) — les saisies en
  // cours dans les formulaires ne sautent plus et l'app ne clignote pas.
  const prevDataJsonRef = useRef<string | null>(null);

  const fetchData = async () => {
    if (!currentUser) return;
    try {
      const res = await apiFetch('/data');
      if (res.ok) {
        const data = await res.json();

        // Données inchangées → aucune redistribution (anti-clignotement).
        const dataJson = JSON.stringify(data);
        if (dataJson === prevDataJsonRef.current) {
          setIsReady(true);
          return;
        }
        prevDataJsonRef.current = dataJson;

        const rawProjects = data.projects || [];
        const sanitizedProjects = rawProjects.map((p: Project) => ({
          ...p,
          status: determineStatus(p)
        }));
        setProjects(sanitizedProjects);
        setClients(data.clients || []); // New
        setCompanyConfig(data.companyConfig || {});
        setExpenses(data.expenses || []);
        setProspects(data.prospects || []);
        setCatalogue(data.catalogue || []);
        setProposals(data.proposals || []);
        setInternalMessages(data.internal_messages || []);
        setEmployees(data.employees || []);
        setContracts(data.contracts || []);
        setLeaveRequests(data.leave_requests || []);
        setPayslips(data.payslips || []);
        setTreasuryAccounts(data.treasury_accounts || []);
        setTransactions(data.transactions || []);
        setAccountingAccounts(data.accountingAccounts || []);
        setAccountingJournals(data.accountingJournals || []);
        setAccountingEntries(data.accountingEntries || []);
        setAssets(data.assets || []);
        
        // Timeout & Escalade (48h) — l'escalade est PERSISTÉE serveur,
        // sinon elle était recalculée (et perdue) à chaque rafraîchissement.
        const rawTasks = data.tasks || [];
        const now = new Date();
        const processedTasks = rawTasks.map((t: Task) => {
          if (t.status === 'TODO' && t.priority === 'HIGH' && !t.escalated) {
            const ageHours = (now.getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60);
            if (ageHours > 48) {
              apiFetch(`/tasks/${t.id}/update`, { method: 'POST', body: JSON.stringify({ escalated: true }) }).catch(() => {});
              return { ...t, escalated: true };
            }
          }
          return t;
        });
        setTasks(processedTasks);
        setNotifications(data.notifications || []);
        
        // BTP Data
        setBtpOffres(data.btpOffres || []);
        setBtpChantiers(data.btpChantiers || []);
        setBtpEngins(data.btpEngins || []);
        setBtpIncidents(data.btpIncidents || []);
        setBtpJournaux(data.btpJournaux || []);
        setBtpSituations(data.btpSituations || []);

        // Extension BTP
        setBtpAffectations(data.btpAffectations || []);
        setBtpPointages(data.btpPointages || []);
        setBtpArticles(data.btpArticles || []);
        setBtpBonCommandes(data.btpBonCommandes || []);
        setBtpMouvements(data.btpMouvements || []);
        setBtpDocuments(data.btpDocuments || []);
        setBtpChantierStats(data.btpChantierStats || []);
        setBtpEmployeeDirectory(data.btpEmployeeDirectory || []);
        setBtpAvenants(data.btpAvenants || []);
        setBtpOrdresService(data.btpOs || []);
        setBtpReserves(data.btpReserves || []);
        setBtpHabilitations(data.btpHabilitations || []);
        setBtpSousTraitances(data.btpSousTraitances || []);
        setBtpFournisseurs(data.btpFournisseurs || []);
        setBtpCautionnements(data.btpCautionnements || []);
        setBtpInspections(data.btpInspections || []);
        setBtpPrixUnitaires(data.btpPrixUnitaires || []);
        setBtpHeuresEngins(data.btpHeuresEngins || []);

        // Agro Data
        setAgroLotMatierePremieres(data.agroLotMatierePremieres || []);
        setAgroLotProductions(data.agroLotProductions || []);
        setAgroControles(data.agroControles || []);
        setAgroCommandes(data.agroCommandes || []);
        setAgroLignesLivrees(data.agroLignesLivrees || []);
        setAgroFiches(data.agroFiches || []);
        setAgroReclamations(data.agroReclamations || []);

        // Assistante
        setAgendaEvents(data.agendaEvents || []);
        setAssistantTasks(data.assistantTasks || []);
        setAssistantMeetings(data.assistantMeetings || []);
        setAssistantDocuments(data.assistantDocuments || []);
        setAssistantContacts(data.assistantContacts || []);
        setAssistantTravels(data.assistantTravels || []);

        setIsReady(true);
      } else if (res.status !== 401) {
        // 401 est déjà géré globalement (déconnexion) ; les autres
        // échecs sont signalés à l'utilisateur au lieu d'être muets.
        pushToast('Impossible de charger les données (erreur serveur).', 'ERROR');
      }
    } catch (err) {
      console.error('Failed to fetch data', err);
      pushToast('Connexion au serveur impossible. Le backend est-il démarré ?', 'ERROR');
    }
  };

  const fetchSystemUsers = async () => {
    try {
      const res = await apiFetch('/users');
      if (res.ok) {
        const d = await res.json();
        if (d.success && d.users) setSystemUsers(d.users);
      }
    } catch (err) { reportError(err, 'Opération'); }
  };

  const createUser = async (username: string, password: string, role: string, firstName: string, lastName: string) => {
    try {
      const res = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, password, role, firstName, lastName })
      });
      const d = await res.json();
      if (d.success && d.user) return { success: true };
      return { success: false, error: d.error || "Erreur d'inscription" };
    } catch (err) {
      return { success: false, error: 'Erreur réseau' };
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchData();
      if (currentUser.role === 'GERANT') {
        fetchSystemUsers();
      }
      const intervalId = setInterval(() => {
        fetchData();
      }, 15000);
      return () => clearInterval(intervalId);
    } else {
      setProjects([]);
      setExpenses([]);
      setSystemUsers([]);
      setProspects([]);
      setIsReady(true);
    }
  }, [currentUser]);

  const login = async (username: string, password: string): Promise<AuthResponse> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success && data.user && data.token) {
        const userObj = { ...data.user, token: data.token };
        setCurrentUser(userObj);
        setCurrentRole(data.user.role);
        localStorage.setItem('coord_user', JSON.stringify(userObj));
        return { success: true };
      }
      return { success: false, error: data.error || 'Erreur de connexion' };
    } catch (err) {
      return { success: false, error: 'Erreur réseau' };
    }
  };

  const deleteUser = async (id: string) => {
    try {
      const res = await apiFetch(`/users/${id}/delete`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSystemUsers(prev => prev.filter(u => u.id !== id));
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (err) {
      return { success: false, error: 'Erreur réseau' };
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setCurrentRole(null);
    localStorage.removeItem('coord_user');
  };

  const syncProject = async (id: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    try {
      await apiFetch(`/projects/${id}/update`, {
        method: 'POST',
        body: JSON.stringify(updates)
      });
      fetchData();
    } catch (err) { reportError(err, 'Opération'); }
  };

  const sendMessage = async (receiverRole: Role | 'ALL', content: string, attachment?: any) => {
    if (!currentUser) return;
    try {
      // Le serveur dérive l'expéditeur du token (anti-usurpation).
      const res = await apiFetch('/messages', {
        method: 'POST',
        body: JSON.stringify({ receiverRole, content, attachment })
      });
      if (res.ok) {
        const newMessage = await res.json();
        setInternalMessages(prev => [...prev, newMessage]);
      } else {
        pushToast(`Envoi du message : ${await readApiError(res)}`, 'ERROR');
      }
    } catch (err) {
      reportError(err, 'Envoi du message');
    }
  };

  const markAsRead = async (msgId: string) => {
    setInternalMessages(prev => 
      prev.map(m => m.id === msgId ? { ...m, isRead: true } : m)
    );
    apiFetch(`/messages/${msgId}/read`, { method: 'POST' }).catch(() => {});
  };

  const updateProject = async (updatedProject: Project) => {
    await syncProject(updatedProject.id, {
      ...updatedProject,
      status: determineStatus(updatedProject)
    });
  };

  const addProject = async (name: string) => {
    try {
      const res = await apiFetch('/projects', {
        method: 'POST',
        body: JSON.stringify({ name, budget: 0 })
      });
      if (res.ok) {
        const p = await res.json();
        setProjects(prev => [...prev, { ...p, status: determineStatus(p) }]);
        return p.id;
      }
    } catch (err) { reportError(err, 'Opération'); }
    return undefined;
  };

  const savePaymentPlan = async (id: string, plan: any) => {
    await syncProject(id, { paymentPlan: plan });
  };

  const updatePaymentInstallment = async (projectId: string, installmentId: string, status: 'PENDING' | 'PAID', receiptId?: string) => {
    const p = projects.find(p => p.id === projectId);
    if (!p || !p.paymentPlan) return;
    
    let allPaid = true;
    const updatedInstallments = p.paymentPlan.installments.map(inst => {
      if (inst.id === installmentId) {
        const updatedInst = { 
          ...inst, 
          status, 
          paymentDate: status === 'PAID' ? new Date().toISOString() : undefined,
          receiptDocumentId: receiptId || inst.receiptDocumentId 
        };
        if (updatedInst.status !== 'PAID') allPaid = false;
        return updatedInst;
      }
      if (inst.status !== 'PAID') allPaid = false;
      return inst;
    });

    const paymentPlan = { ...p.paymentPlan, installments: updatedInstallments };
    const updates: Partial<Project> = { paymentPlan };

    if (allPaid) {
      updates.paymentStatus = 'PAID';
      updates.accountantPaymentConfirm = true;
      updates.status = 'PAYE';
    } else if (updatedInstallments.some(i => i.status === 'PAID')) {
      updates.paymentStatus = 'PARTIAL';
    } else {
      updates.paymentStatus = 'PENDING';
    }

    await syncProject(projectId, updates);
  };

  const payInstallmentAndGenerateReceipt = async (
    projectId: string,
    installmentId: string,
    installmentName: string,
    amount: number
  ) => {
    const p = projects.find(proj => proj.id === projectId);
    if (!p) return null;

    const docId = Date.now().toString();
    const newDoc: any = {
      id: docId,
      type: 'RECEIPT',
      createdAt: new Date().toISOString(),
      installmentId,
      installmentName,
      amountPaid: amount,
      balance: (p.budget || 0) - amount
    };

    let allPaid = true;
    const installments = p.paymentPlan?.installments || [];
    const paymentDateStr = new Date().toISOString();
    
    const newExpectedDate = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const currentInstIndex = installments.findIndex(i => i.id === installmentId);
    const originalAmount = installments[currentInstIndex]?.amount || amount;
    const diff = originalAmount - amount;

    const updatedInstallments = installments.map((inst, index) => {
      if (inst.id === installmentId) {
        const updatedInst = {
          ...inst,
          amount: amount,
          status: 'PAID' as const,
          paymentDate: paymentDateStr,
          receiptDocumentId: docId
        };
        if (updatedInst.status !== 'PAID') allPaid = false;
        return updatedInst;
      }
      
      if (index === currentInstIndex + 1 && inst.status !== 'PAID') {
        allPaid = false;
        return {
          ...inst,
          amount: Math.max(0, inst.amount + diff),
          expectedDate: newExpectedDate
        };
      }

      if (inst.status !== 'PAID') {
        allPaid = false;
        return {
          ...inst,
          expectedDate: newExpectedDate
        };
      }
      return inst;
    });

    const paymentPlan = p.paymentPlan ? { ...p.paymentPlan, installments: updatedInstallments } : undefined;
    const documents = [...(p.documents || []), newDoc];
    const updates: Partial<Project> = { documents, paymentPlan };

    if (allPaid) {
      updates.paymentStatus = 'PAID';
      updates.accountantPaymentConfirm = true;
      updates.status = 'PAYE';
    } else if (updatedInstallments.some(i => i.status === 'PAID')) {
      updates.paymentStatus = 'PARTIAL';
      const acompteIndex = installments.findIndex(i => i.id === installmentId);
      const isFirstInstallment = acompteIndex === 0 || installmentId === 'acompte';
      if (isFirstInstallment) {
        updates.accountantPaymentConfirm = true;
      }
    } else {
      updates.paymentStatus = 'PENDING';
    }

    updates.status = determineStatus({ ...p, ...updates } as any);

    await syncProject(projectId, updates);
    
    // Auto-generate transaction — avertir si aucun compte de trésorerie
    const mainAccount = treasuryAccounts[0];
    if (mainAccount) {
        await addTransaction({
            accountId: mainAccount.id,
            type: 'CREDIT',
            amount: amount,
            referenceId: docId,
            category: 'VENTE',
            description: `Encaissement ${installmentName} - Projet: ${p.name}`
        });
    } else {
        pushToast('ATTENTION : encaissement enregistré SANS écriture de trésorerie (aucun compte créé). Créez un compte dans la Comptabilité.', 'WARNING');
    }

    await addNotification('COMPTABLE', `Un encaissement de ${amount.toLocaleString()} GNF a été enregistré pour le projet ${p.name}.`, 'SUCCESS');

    return newDoc;
  };

  const confirmPaymentCommercial = async (id: string) => {
    await syncProject(id, { commercialPaymentConfirm: true });
  };

  const confirmPaymentAccountant = async (id: string) => {
    await syncProject(id, { 
      accountantPaymentConfirm: true, 
      paymentStatus: 'PAID', 
      status: 'PAYE' 
    });
  };

  const generateDocument = async (id: string, type: 'PROFORMA' | 'RECEIPT' | 'SPECS', data: any = {}) => {
    const p = projects.find(p => p.id === id);
    if (!p) return '';
    const newDoc: any = {
      id: Date.now().toString(),
      type,
      createdAt: new Date().toISOString(),
      ...data
    };
    const documents = [...(p.documents || []), newDoc];
    const tempStatus = p.status || 'NOUVEAU';
    await syncProject(id, { documents, status: tempStatus });
    return newDoc.id;
  };

  const deleteProject = async (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    try {
      await apiFetch(`/projects/${id}/delete`, { method: 'POST' });
    } catch (err) { reportError(err, 'Opération'); }
  };

  const cancelProject = async (id: string) => {
    const p = projects.find(proj => proj.id === id);
    if (!p) return;
    await syncProject(id, { status: 'ANNULE' });
    await addNotification('COMPTABLE', `Le projet "${p.name}" a été annulé par le commercial. Veuillez vérifier les éventuels remboursements.`, 'ERROR');
    await addTask('ASSISTANTE', `Classer le dossier annulé: ${p.name}`, `Le projet a été annulé. Merci de clôturer le dossier client.`, 'MEDIUM');
  };

  const alertUnpaid = async (id: string) => {
    const p = projects.find(proj => proj.id === id);
    if (!p) return;
    // On repasse le projet en attente de paiement si ce n'est pas déjà le cas
    await syncProject(id, { paymentStatus: 'PENDING', accountantPaymentConfirm: false });
    await addNotification('COMMERCIAL', `ALERTE IMPAYÉ: Le paiement pour le projet "${p.name}" a été rejeté ou est introuvable. Veuillez suspendre les travaux et relancer le client.`, 'ERROR');
  };

  const addExpense = async (expense: Omit<Expense, 'id'>) => {
    try {
      const res = await apiFetch('/expenses', {
        method: 'POST',
        body: JSON.stringify(expense)
      });
      if (res.ok) {
        const e = await res.json();
        setExpenses(prev => [...prev, e]);
        await addNotification('COMPTABLE', `Une nouvelle dépense de ${expense.amountTTC.toLocaleString()} GNF a été soumise pour validation.`, 'INFO');
      }
    } catch (err) { reportError(err, 'Opération'); }
  };

  const updateExpenseStatus = async (id: string, status: 'PENDING' | 'PAID' | 'REJECTED', reason?: string) => {
    const exp = expenses.find(e => e.id === id);
    if (!exp) return;
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, status, rejectionReason: reason } : e));
    try {
      await apiFetch(`/expenses/${id}/update`, { method: 'POST', body: JSON.stringify({ status, rejectionReason: reason }) });
      if (status === 'REJECTED') {
        await addNotification('ALL', `La note de frais de ${exp.amountTTC.toLocaleString()} GNF a été rejetée. Motif: ${reason || 'Non spécifié'}`, 'WARNING');
      } else if (status === 'PAID') {
        await addNotification('ALL', `La note de frais de ${exp.amountTTC.toLocaleString()} GNF a été payée.`, 'SUCCESS');
        // --- GÉNÉRATION AUTOMATIQUE ÉCRITURE COMPTABLE ---
        autoGenerateAccountingEntry('ACHAT', exp.amountTTC, `Dépense : ${exp.description}`);
      }
    } catch (err) { reportError(err, 'Opération'); }
  };

  const deleteExpense = async (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    try {
      await apiFetch(`/expenses/${id}/delete`, { method: 'POST' });
    } catch (err) { reportError(err, 'Opération'); }
  };

  const updateCompanyConfig = async (config: CompanyConfig) => {
    setCompanyConfig(config);
    try {
      await apiFetch('/config/update', {
        method: 'POST',
        body: JSON.stringify(config)
      });
    } catch (err) { reportError(err, 'Opération'); }
  };

  const fetchProspects = async () => {};

  const addProspect = async (prospect: Omit<Prospect, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const res = await apiFetch('/prospects', {
        method: 'POST',
        body: JSON.stringify(prospect)
      });
      if (res.ok) {
        const p = await res.json();
        setProspects(prev => [...prev, p]);
      }
    } catch (err) { reportError(err, 'Opération'); }
    return undefined;
  };

  const updateProspect = async (id: string, updates: Partial<Prospect>) => {
    try {
      const res = await apiFetch(`/prospects/${id}/update`, {
        method: 'POST',
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const updatedP = await res.json();
        setProspects(prev => prev.map(p => p.id === id ? updatedP : p));
      }
    } catch (err) { reportError(err, 'Opération'); }
  };

  const deleteProspect = async (id: string) => {
    setProspects(prev => prev.filter(p => p.id !== id));
    try {
      await apiFetch(`/prospects/${id}/delete`, { method: 'POST' });
    } catch (err) { reportError(err, 'Opération'); }
  };

  const convertProspectToProject = async (id: string) => {
    const prospect = prospects.find(p => p.id === id);
    if (!prospect) return undefined;

    // Éviter les doublons de clics ou de drag-and-drop
    const existingProject = projects.find(p => (p as any).prospectId === id);
    if (existingProject) {
      await updateProspect(id, { stage: 'GAGNE' }); // S'assurer que le CRM est bien synchronisé
      return existingProject;
    }

    await updateProspect(id, { stage: 'GAGNE' });

    try {
      const res = await apiFetch('/projects', {
        method: 'POST',
        body: JSON.stringify({ 
          name: prospect.name + (prospect.company ? ` - ${prospect.company}` : ''), 
          clientName: prospect.name,
          clientContact: `${prospect.phone} ${prospect.email || ''}`,
          prospectId: id,
          budget: 0 
        })
      });
      if (res.ok) {
        const newProj = await res.json();
        const interactions = prospect.interactions || [];
        const prospectNotes = interactions.map(i => `${new Date(i.date).toLocaleDateString()}: ${i.notes}`).join('\n\n') + (prospect.notes ? '\n\n' + prospect.notes : '');
        const description = `Lead converti depuis ${prospect.source || 'Inconnu'}.\nTYPE PROJET: ${prospect.projectType || 'Non spécifié'}\nOBJECTIFS: ${prospect.objectives || 'Non spécifié'}${prospectNotes ? '\n\nHISTORIQUE APPELS:\n' + prospectNotes : ''}`;
        
        await syncProject(newProj.id, {
          description,
          budget: prospect.estimatedBudget ? parseInt(prospect.estimatedBudget.replace(/[^0-9]/g, ''), 10) || 0 : 0,
          clientName: prospect.name,
          clientContact: prospect.phone + (prospect.email ? ' / ' + prospect.email : '')
        });
        // Notification : nouvelle affaire convertie
        await addNotification('GERANT', `Nouvelle affaire convertie : « ${prospect.name} » (projet #${newProj.id.slice(0, 8)}).`, 'SUCCESS');
        return newProj.id;
      }
    } catch (err) { reportError(err, 'Opération'); }
    return undefined;
  };

  // --- Nouveaux Ajouts CRM & Catalogue ---
  const addCatalogueItem = async (item: Omit<ServiceCatalogItem, 'id'>) => {
    try {
      const res = await apiFetch('/crud/catalogue', { method: 'POST', body: JSON.stringify(item) });
      if (res.ok) {
        const newItem = await res.json();
        setCatalogue(prev => [...prev, newItem]);
        pushToast('Article ajouté au catalogue', 'SUCCESS');
      }
    } catch (e) { reportError(e, 'Opération'); }
  };
  const updateCatalogueItem = async (id: string, updates: Partial<ServiceCatalogItem>) => {
    try {
      const res = await apiFetch(`/crud/catalogue/${id}/update`, { method: 'POST', body: JSON.stringify(updates) });
      if (res.ok) {
        const updated = await res.json();
        setCatalogue(prev => prev.map(c => c.id === id ? updated : c));
      }
    } catch (e) { reportError(e, 'Opération'); }
  };
  const deleteCatalogueItem = async (id: string) => {
    setCatalogue(prev => prev.filter(c => c.id !== id));
    try { await apiFetch(`/crud/catalogue/${id}/delete`, { method: 'POST' }); } catch (e) {}
  };
  
  const generateProposal = async (proposal: Omit<ServiceProposal, 'id' | 'createdAt'>) => {
    try {
      const res = await apiFetch('/crud/proposals', { method: 'POST', body: JSON.stringify(proposal) });
      if (res.ok) {
        const newProposal = await res.json();
        setProposals(prev => [...prev, newProposal]);
        pushToast('Proposition générée avec succès', 'SUCCESS');
      }
    } catch (e) { reportError(e, 'Opération'); }
  };
  const updateProposalStatus = async (id: string, status: ServiceProposal['status']) => {
    try {
      const res = await apiFetch(`/crud/proposals/${id}/update`, { method: 'POST', body: JSON.stringify({ status }) });
      if (res.ok) {
        const updated = await res.json();
        setProposals(prev => prev.map(p => p.id === id ? updated : p));
      }
    } catch (e) { reportError(e, 'Opération'); }
  };

  // HR Methods
  const addEmployee = async (emp: any) => {
    try {
      const res = await apiFetch('/rh/employees', { method: 'POST', body: JSON.stringify(emp) });
      if (res.ok) {
        const d = await res.json();
        setEmployees(prev => [...prev, d]);
      }
    } catch (e) { reportError(e, 'Opération'); }
  };

  const addContract = async (ctr: any) => {
    try {
      const res = await apiFetch('/rh/contracts', { method: 'POST', body: JSON.stringify(ctr) });
      if (res.ok) {
        const d = await res.json();
        setContracts(prev => [...prev, d]);
      }
    } catch (e) { reportError(e, 'Opération'); }
  };

  const addLeaveRequest = async (lr: any) => {
    try {
      const res = await apiFetch('/rh/leaves', { method: 'POST', body: JSON.stringify(lr) });
      if (res.ok) {
        const d = await res.json();
        setLeaveRequests(prev => [...prev, d]);
        await addNotification('GERANT', `Une nouvelle demande de congé a été soumise.`, 'INFO');
      }
    } catch (e) { reportError(e, 'Opération'); }
  };

  const updateLeaveRequestStatus = async (id: string, status: 'PENDING' | 'APPROVED' | 'REJECTED', reason?: string) => {
    setLeaveRequests(prev => prev.map(l => l.id === id ? { ...l, status, rejectionReason: reason } : l));
    try {
      await apiFetch(`/rh/leaves/${id}/update`, { method: 'POST', body: JSON.stringify({ status, rejectionReason: reason }) });
      if (status === 'REJECTED') {
        await addNotification('ALL', `Une demande de congé a été rejetée. Motif: ${reason || 'Non spécifié'}`, 'WARNING');
      } else if (status === 'APPROVED') {
        await addNotification('ALL', `Une demande de congé a été approuvée.`, 'SUCCESS');
      }
    } catch (e) { reportError(e, 'Opération'); }
  };

  const registerSalaryAdvance = async (employeeId: string, amount: number) => {
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return;
    await addTask('COMPTABLE', `Avance sur salaire pour ${emp.firstName} ${emp.lastName}`, `Le département RH a validé une avance de ${amount.toLocaleString()} GNF pour ${emp.firstName} ${emp.lastName}. Veuillez procéder au décaissement immédiat.`, 'HIGH');
  };

  const addPayslip = async (ps: any) => {
    try {
      const res = await apiFetch('/rh/payslips', { method: 'POST', body: JSON.stringify(ps) });
      if (res.ok) {
        const d = await res.json();
        setPayslips(prev => [...prev, d]);
        await addNotification('COMPTABLE', `Une nouvelle fiche de paie a été générée et attend le paiement.`, 'INFO');
      }
    } catch (e) { reportError(e, 'Opération'); }
  };

  const updatePayslipStatus = async (id: string, status: string, accountId?: string) => {
    const payslip = payslips.find(p => p.id === id);
    setPayslips(prev => prev.map(p => p.id === id ? { ...p, status } : p));
    try {
      await apiFetch(`/rh/payslips/${id}/update`, { method: 'POST', body: JSON.stringify({ status }) });
      
      if (status === 'PAID' && payslip && accountId) {
        // Auto-generate transaction for Net Salary
        await addTransaction({
          accountId: accountId,
          type: 'DEBIT',
          amount: payslip.netSalary,
          referenceId: payslip.id,
          category: 'SALAIRE',
          description: `Salaire Net - Employé ID: ${payslip.employeeId} (${payslip.month}/${payslip.year})`
        });
        
        // Auto-generate transaction for CNSS
        const totalCnss = (payslip.employeeCnssAmount || 0) + (payslip.employerCnssAmount || 0);
        if (totalCnss > 0) {
          await addTransaction({
            accountId: accountId,
            type: 'DEBIT',
            amount: totalCnss,
            referenceId: payslip.id,
            category: 'CHARGES_SOCIALES',
            description: `CNSS Globale - Employé ID: ${payslip.employeeId} (${payslip.month}/${payslip.year})`
          });
        }
        
        // Auto-generate transaction for RTS
        if (payslip.rtsAmount && payslip.rtsAmount > 0) {
          await addTransaction({
            accountId: accountId,
            type: 'DEBIT',
            amount: payslip.rtsAmount,
            referenceId: payslip.id,
            category: 'IMPOTS',
            description: `RTS - Employé ID: ${payslip.employeeId} (${payslip.month}/${payslip.year})`
          });
        }
        
        // --- GÉNÉRATION AUTOMATIQUE ÉCRITURE COMPTABLE ---
        const totalSalaryCost = payslip.netSalary + totalCnss + (payslip.rtsAmount || 0);
        autoGenerateAccountingEntry('SALAIRE', totalSalaryCost, `Paie ${payslip.month}/${payslip.year} - ID: ${payslip.employeeId}`);
        
      }
    } catch (e) { reportError(e, 'Opération'); }
  };

  const addTreasuryAccount = async (acc: Omit<TreasuryAccount, 'id' | 'balance'>) => {
    try {
      const res = await apiFetch('/accounting/accounts', {
        method: 'POST',
        body: JSON.stringify(acc)
      });
      if (res.ok) {
        const newAcc = await res.json();
        setTreasuryAccounts(prev => [...prev, newAcc]);
      }
    } catch (err) { reportError(err, 'Opération'); }
  };

  const addTransaction = async (tx: Omit<Transaction, 'id' | 'date'>): Promise<boolean> => {
    try {
      const res = await apiFetch('/accounting/transactions', {
        method: 'POST',
        body: JSON.stringify(tx)
      });
      if (res.ok) {
        const newTx = await res.json();
        setTransactions(prev => [...prev, newTx]);

        // Update local balance (le serveur a déjà appliqué le sien)
        setTreasuryAccounts(prev => prev.map(acc => {
          if (acc.id === tx.accountId) {
            return {
              ...acc,
              balance: tx.type === 'CREDIT' ? acc.balance + tx.amount : acc.balance - tx.amount
            };
          }
          return acc;
        }));
        return true;
      }
      pushToast(await readApiError(res, 'Transaction refusée'), 'ERROR');
      return false;
    } catch (err) { reportError(err, 'Opération'); return false; }
  };

  // --- COMMUNICATION & TASKS ---
  
  const updateTaskStatus = async (taskId: string, status: 'TODO'|'IN_PROGRESS'|'DONE') => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
    try {
      await apiFetch(`/tasks/${taskId}/update`, {
        method: 'POST',
        body: JSON.stringify({ status })
      });
    } catch (err) { reportError(err, 'Opération'); }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n));
    try {
      await apiFetch(`/notifications/${notificationId}/read`, { method: 'POST' });
    } catch (err) { reportError(err, 'Opération'); }
  };

  // --- BTP METHODS (persistés via /api/crud/* — auparavant perdus au rechargement) ---

  const createBtpOffre = async (offre: Omit<BtpOffre, 'id' | 'statut' | 'updated_at' | 'created_by'>) => {
    const created = await crudCreate<BtpOffre>('btpOffres', offre, 'Création offre');
    if (created) setBtpOffres(prev => [...prev, created]);
  };

  const updateBtpOffreStatus = async (id: string, status: BtpOffreStatus, commentaire?: string) => {
    const updates: Partial<BtpOffre> = { statut: status };
    if (status === 'en_chiffrage' && commentaire) {
      updates.commentaire_validation_financiere = commentaire;
    }
    const updated = await crudUpdate('btpOffres', id, updates, 'Mise à jour offre');
    if (updated) setBtpOffres(prev => prev.map(o => o.id === id ? updated : o));

    if (status === 'gagnée') {
      const o = btpOffres.find(x => x.id === id);
      if (o) {
        // Garde d'unicité : ne pas créer un 2e chantier si un existe déjà
        const chantierExistant = btpChantiers.some(c => c.offre_id === id);
        if (chantierExistant) {
          pushToast('Un chantier existe déjà pour cette offre.', 'WARNING');
          return;
        }
        // Garde montant : refuser budget 0 (offre non chiffrée)
        if (!o.montant_estime || o.montant_estime <= 0) {
          pushToast("Impossible : montant estimé à 0. Chiffrez l'offre avant de la déclarer gagnée.", 'ERROR');
          return;
        }
        // Le chiffrage validé devient le budget prévisionnel du chantier.
        let budgetDetail: any = undefined;
        try { budgetDetail = o.chiffrage_json ? JSON.parse(o.chiffrage_json) : undefined; } catch { /* chiffrage illisible : ignoré */ }
        await createBtpChantier({
          offre_id: o.id,
          nom: `Chantier - ${o.objet}`,
          client: o.client,
          adresse: 'A définir',
          date_debut_prevue: new Date().toISOString(),
          budget_initial: o.montant_estime,
          ...(budgetDetail ? { budget_detail: budgetDetail } : {})
        } as any);
        await addNotification('COND_TRAVAUX', `Nouveau chantier gagné: ${o.objet}. Veuillez planifier les ressources.`, 'SUCCESS');
      }
    }
  };

  const updateBtpOffre = async (id: string, updates: Partial<BtpOffre>) => {
    const updated = await crudUpdate('btpOffres', id, updates, 'Mise à jour offre');
    if (updated) setBtpOffres(prev => prev.map(o => o.id === id ? updated : o));
  };

  const createBtpChantier = async (chantier: Omit<BtpChantier, 'id' | 'statut'>) => {
    const created = await crudCreate<BtpChantier>('btpChantiers', chantier, 'Création chantier');
    if (created) setBtpChantiers(prev => [...prev, created]);
  };

  const updateBtpChantierStatus = async (id: string, status: BtpChantierStatus) => {
    const chantier = btpChantiers.find(c => c.id === id);
    if (!chantier) return;

    if (status === 'en_cours' && chantier.statut === 'planification' && (!chantier.rh_validation || !chantier.materiel_validation)) {
      throw new Error("Validation RH et Matériel obligatoires avant le démarrage du chantier.");
    }

    // À la suspension : reset des unlocks pour forcer une nouvelle double validation
    const updates: any = { statut: status };
    if (status === 'suspendu') {
      updates.qhse_unlock = false;
      updates.dg_unlock = false;
    }

    const updated = await crudUpdate('btpChantiers', id, updates, 'Changement statut chantier');
    if (updated) setBtpChantiers(prev => prev.map(c => c.id === id ? updated : c));

    // Ordres de Service automatiques aux transitions officielles.
    // "reprise" si le chantier ÉTAIT suspendu et repasse en_cours,
    // sinon "démarrage" pour un premier lancement.
    const osType: BtpOrdreService['type'] | null =
      status === 'suspendu' ? 'arrêt' :
      status === 'réception_provisoire' || status === 'réception_définitive' ? 'réception' :
      status === 'en_cours' ? (chantier.statut === 'suspendu' ? 'reprise' : 'démarrage') : null;
    if (osType) {
      const os = await crudCreate<BtpOrdreService>('btpOs', {
        chantier_id: id,
        type: osType,
        date: new Date().toISOString(),
        motif: `Passage automatique en « ${status} »`
      }, 'Ordre de Service');
      if (os) setBtpOrdresService(prev => [...prev, os]);
    }

    // Réception définitive → tâche compta pour libérer les retenues de garantie.
    if (status === 'réception_définitive') {
      const st = btpChantierStats.find(s => s.id === id);
      if (st && st.retenue_bloquee > 0) {
        await addTask('COMPTABLE', `Libérer les retenues de garantie — ${chantier.nom}`,
          `Réception définitive prononcée : ${st.retenue_bloquee.toLocaleString('fr-FR')} GNF de retenues sont libérables (Pilotage Chantiers → Situations).`, 'HIGH');
      }
    }
  };

  const updateBtpChantier = async (id: string, updates: Partial<BtpChantier>) => {
    const updated = await crudUpdate('btpChantiers', id, updates, 'Mise à jour chantier');
    if (updated) setBtpChantiers(prev => prev.map(c => c.id === id ? updated : c));
  };

  /** Validation RH dédiée (endpoint sécurisé champ unique) */
  const validerRhChantier = async (id: string) => {
    try {
      const res = await apiFetch(`/btp/chantiers/${id}/valider-rh`, { method: 'POST', body: JSON.stringify({}) });
      if (res.ok) {
        setBtpChantiers(prev => prev.map(c => c.id === id ? { ...c, rh_validation: true } : c));
        pushToast('Validation RH accordée.', 'SUCCESS');
      } else {
        pushToast(await readApiError(res, 'Validation impossible'), 'ERROR');
      }
    } catch (err) {
      reportError(err, 'Validation RH');
    }
  };

  /** Mise à jour complète d'un engin (taux_horaire, compteur, maintenance…) */
  const updateBtpEngin = async (id: string, updates: Partial<BtpEngin>) => {
    const updated = await crudUpdate('btpEngins', id, updates, 'Mise à jour engin');
    if (updated) setBtpEngins(prev => prev.map(e => e.id === id ? updated : e));
  };

  /** Libérer un cautionnement */
  const libererCautionnement = async (id: string) => {
    const updated = await crudUpdate('btpCautionnements', id, { statut: 'libérée' }, 'Libération caution');
    if (updated) setBtpCautionnements(prev => prev.map(c => c.id === id ? updated : c));
  };

  const assignBtpEngin = async (enginId: string, chantierId: string | undefined) => {
    const engin = btpEngins.find(e => e.id === enginId);
    if (!engin) return;
    // Garde : impossible d'affecter un engin HS ou en maintenance
    if (chantierId && ['hors_service', 'en_maintenance'].includes(engin.statut)) {
      throw new Error(`Impossible d'affecter un engin ${engin.statut.replace(/_/g, ' ')}.`);
    }
    // Garde : exclusivité d'affectation
    if (chantierId && engin.statut === 'affecté' && engin.chantier_affecte_id !== chantierId) {
      throw new Error("Cet engin est déjà affecté à un autre chantier en cours.");
    }
    // NOTE : `chantierId ?? ''` — JSON.stringify élimine `undefined`, il faut
    // envoyer une chaîne vide pour DÉSAFFECTER l'engin côté serveur.
    const updated = await crudUpdate('btpEngins', enginId, {
      statut: chantierId ? 'affecté' : 'disponible',
      chantier_affecte_id: chantierId ?? ''
    }, 'Affectation engin');
    if (updated) setBtpEngins(prev => prev.map(e => e.id === enginId ? updated : e));
  };

  const updateBtpEnginStatus = async (enginId: string, status: BtpEnginStatus) => {
    // Au passage HS : détacher l'engin de son chantier
    const engin = btpEngins.find(e => e.id === enginId);
    const updates: any = { statut: status };
    if (status === 'hors_service' && engin?.chantier_affecte_id) {
      updates.chantier_affecte_id = '';
    }
    const updated = await crudUpdate('btpEngins', enginId, updates, 'Statut engin');
    if (updated) setBtpEngins(prev => prev.map(e => e.id === enginId ? updated : e));
    if (status === 'hors_service') {
      if (engin?.chantier_affecte_id) {
        await addNotification('COND_TRAVAUX', `L'engin ${engin.identifiant_interne} est hors service ! (détaché du chantier)`, 'ERROR');
      }
    }
  };

  const createBtpIncident = async (incident: Omit<BtpIncidentQHSE, 'id' | 'statut' | 'declare_par'>) => {
    const created = await crudCreate<BtpIncidentQHSE>('btpIncidents', incident, 'Déclaration incident');
    if (created) setBtpIncidents(prev => [...prev, created]);

    if (incident.gravite === 'critique') {
      await updateBtpChantierStatus(incident.chantier_id, 'suspendu');
      await addNotification('GERANT', `INCIDENT CRITIQUE sur le chantier ID ${incident.chantier_id} ! Chantier suspendu.`, 'ERROR');
      await addTask(
        'ASSISTANTE',
        `URGENCE QHSE : Incident Critique (Chantier ${incident.chantier_id})`,
        `Un incident critique a été déclaré : ${incident.description}. Le chantier est automatiquement suspendu. Merci d'entamer les procédures d'urgence (Assurances, information Client, RH).`,
        'HIGH'
      );
    }
  };

  const updateBtpIncidentStatus = async (id: string, status: BtpIncidentQHSE['statut'], dgValide?: boolean) => {
    const updates: Partial<BtpIncidentQHSE> = { statut: status };
    if (dgValide !== undefined) updates.valide_par_dg = dgValide;
    const updated = await crudUpdate('btpIncidents', id, updates, 'Statut incident');
    if (updated) setBtpIncidents(prev => prev.map(i => i.id === id ? updated : i));
  };

  const createBtpJournal = async (journal: Omit<BtpJournalChantier, 'id' | 'created_by'>) => {
    const created = await crudCreate<BtpJournalChantier>('btpJournaux', journal, 'Journal de chantier');
    if (created) setBtpJournaux(prev => [...prev, created]);
  };

  const createBtpSituation = async (situation: Omit<BtpSituationTravaux, 'id' | 'statut'>) => {
    const created = await crudCreate<BtpSituationTravaux>('btpSituations', situation, 'Situation de travaux');
    if (created) setBtpSituations(prev => [...prev, created]);
  };

  const updateBtpSituation = async (id: string, updates: Partial<BtpSituationTravaux>) => {
    const updated = await crudUpdate('btpSituations', id, updates, 'Situation de travaux');
    if (updated) setBtpSituations(prev => prev.map(s => s.id === id ? updated : s));

    // Tâche automatique : situation mise en attente de facturation → compta.
    if (updated && updates.statut === 'en_attente_facturation') {
      const sit = updated;
      await addTask('COMPTABLE', `Facturer la situation « ${sit.periode} » (${sit.montant_facture.toLocaleString('fr-FR')} GNF)`,
        `Situation validée par le conducteur : à facturer depuis le pilotage du chantier.`, 'MEDIUM');
    }
  };

  // --- EXTENSION BTP — Phase 1 : facturation atomique situation → trésorerie ---
  const factureBtpSituation = async (situationId: string, accountId: string): Promise<boolean> => {
    try {
      const res = await apiFetch(`/btp/situations/${situationId}/facturer`, {
        method: 'POST',
        body: JSON.stringify({ accountId })
      });
      if (res.ok) {
        const d = await res.json();
        setBtpSituations(prev => prev.map(s => s.id === situationId ? d.situation : s));
        if (d.transaction) setTransactions(prev => [...prev, d.transaction]);
        setTreasuryAccounts(prev => prev.map(acc =>
          acc.id === accountId ? { ...acc, balance: acc.balance + d.transaction.amount } : acc
        ));
        pushToast(`Situation facturée : ${d.transaction.amount.toLocaleString('fr-FR')} GNF encaissés.`, 'SUCCESS');
        return true;
      }
      pushToast(await readApiError(res, 'Facturation impossible'), 'ERROR');
      return false;
    } catch (err) {
      reportError(err, 'Facturation situation');
      return false;
    }
  };

  // --- EXTENSION BTP — Phase 3 : main d'œuvre ---
  const createBtpAffectation = async (aff: Omit<BtpAffectation, 'id' | 'statut' | 'created_by'>) => {
    const created = await crudCreate<BtpAffectation>('btpAffectations', aff, 'Affectation');
    if (created) {
      setBtpAffectations(prev => [...prev, created]);
      const chantier = btpChantiers.find(c => c.id === aff.chantier_id);
      await addNotification('RH', `Nouvelle affectation sur le chantier « ${chantier?.nom ?? aff.chantier_id} » : validation RH requise avant démarrage.`, 'INFO');
    }
  };

  const terminerBtpAffectation = async (id: string) => {
    const updated = await crudUpdate('btpAffectations', id, { statut: 'terminée' }, 'Fin d\'affectation');
    if (updated) setBtpAffectations(prev => prev.map(a => a.id === id ? updated : a));
  };

  const createBtpPointage = async (p: Omit<BtpPointage, 'id' | 'created_by'>) => {
    const created = await crudCreate<BtpPointage>('btpPointages', p, 'Pointage');
    if (created) setBtpPointages(prev => [...prev, created]);
  };

  // --- EXTENSION BTP — Phase 4 : achats & stock ---
  const createBtpArticle = async (art: Omit<BtpArticle, 'id'>) => {
    const created = await crudCreate<BtpArticle>('btpArticles', art, 'Article');
    if (created) setBtpArticles(prev => [...prev, created]);
  };

  const updateBtpArticle = async (id: string, updates: Partial<BtpArticle>) => {
    const updated = await crudUpdate('btpArticles', id, updates, 'Article');
    if (updated) setBtpArticles(prev => prev.map(a => a.id === id ? updated : a));
  };

  const createBtpBonCommande = async (bc: Omit<BtpBonCommande, 'id' | 'statut' | 'created_by'>) => {
    const created = await crudCreate<BtpBonCommande>('btpBonCommandes', bc, 'Bon de commande');
    if (created) setBtpBonCommandes(prev => [...prev, created]);
  };

  const soumettreBtpBonCommande = async (id: string) => {
    const updated = await crudUpdate('btpBonCommandes', id, { statut: 'soumis' }, 'Soumission BC');
    if (updated) {
      setBtpBonCommandes(prev => prev.map(b => b.id === id ? updated : b));
      await addNotification('GERANT', `Bon de commande soumis (${updated.total_ht.toLocaleString('fr-FR')} GNF HT — ${updated.fournisseur}) : en attente de réception magasin.`, 'INFO');
      await addTask('MAGASINIER_BTP', `Réceptionner le BC ${updated.fournisseur} (${updated.total_ht.toLocaleString('fr-FR')} GNF HT)`,
        `Bon de commande à réceptionner dans Magasin & Achats : la réception crée les entrées de stock et la dépense comptable.`, 'MEDIUM');
    }
  };

  const recevoirBtpBonCommande = async (id: string): Promise<boolean> => {
    try {
      const res = await apiFetch(`/btp/bons/${id}/recevoir`, { method: 'POST', body: JSON.stringify({}) });
      if (res.ok) {
        const d = await res.json();
        setBtpBonCommandes(prev => prev.map(b => b.id === id ? d.bon_commande : b));
        if (d.mouvements?.length) setBtpMouvements(prev => [...prev, ...d.mouvements]);
        if (d.expense) setExpenses(prev => [...prev, d.expense]);
        pushToast('BC réceptionné : stock approvisionné et dépense transmise à la comptabilité.', 'SUCCESS');
        return true;
      }
      pushToast(await readApiError(res, 'Réception impossible'), 'ERROR');
      return false;
    } catch (err) {
      reportError(err, 'Réception BC');
      return false;
    }
  };

  const createBtpMouvement = async (m: Omit<BtpMouvement, 'id' | 'created_by'>) => {
    const created = await crudCreate<BtpMouvement>('btpMouvements', m, 'Mouvement de stock');
    if (created) setBtpMouvements(prev => [...prev, created]);
  };

  // --- EXTENSION BTP — Phase 5 : GED ---
  const addBtpDocument = async (doc: Omit<BtpDocument, 'id' | 'created_by'>) => {
    const created = await crudCreate<BtpDocument>('btpDocuments', doc, 'Document chantier');
    if (created) setBtpDocuments(prev => [...prev, created]);
  };

  const createBtpReserve = async (r: Omit<BtpReserve, 'id' | 'created_by'>) => {
    const created = await crudCreate<BtpReserve>('btpReserves', r, 'Réserve de chantier');
    if (created) setBtpReserves(prev => [...prev, created]);
  };

  const updateBtpReserve = async (id: string, updates: Partial<BtpReserve>) => {
    const updated = await crudUpdate('btpReserves', id, updates, 'Statut réserve');
    if (updated) setBtpReserves(prev => prev.map(x => x.id === id ? updated : x));
  };

  const createBtpHabilitation = async (h: Omit<BtpHabilitation, 'id'>) => {
    const created = await crudCreate<BtpHabilitation>('btpHabilitations', h, 'Habilitation employé');
    if (created) setBtpHabilitations(prev => [...prev, created]);
  };

  const updateBtpHabilitation = async (id: string, updates: Partial<BtpHabilitation>) => {
    const updated = await crudUpdate('btpHabilitations', id, updates, 'Habilitation employé');
    if (updated) setBtpHabilitations(prev => prev.map(x => x.id === id ? updated : x));
  };

  // --- EXTENSION BTP — Vague 3 ---
  const createBtpAvenant = async (av: Omit<BtpAvenant, 'id' | 'statut' | 'created_by'>) => {
    const created = await crudCreate<BtpAvenant>('btpAvenants', av, 'Avenant');
    if (created) {
      setBtpAvenants(prev => [...prev, created]);
      await addNotification('GERANT', `Avenant ${created.id} en attente de validation (${av.type.replace('_', ' ')}).`, 'INFO');
    }
  };

  const validerBtpAvenant = async (id: string): Promise<boolean> => {
    try {
      const res = await apiFetch(`/btp/avenants/${id}/valider`, { method: 'POST', body: JSON.stringify({}) });
      if (res.ok) {
        const d = await res.json();
        setBtpAvenants(prev => prev.map(a => a.id === id ? d.avenant : a));
        if (d.chantier) setBtpChantiers(prev => prev.map(c => c.id === d.chantier.id ? d.chantier : c));
        pushToast('Avenant validé : budget et calendrier mis à jour.', 'SUCCESS');
        return true;
      }
      pushToast(await readApiError(res, 'Validation impossible'), 'ERROR');
      return false;
    } catch (err) {
      reportError(err, 'Validation avenant');
      return false;
    }
  };

  const rejeterBtpAvenant = async (id: string) => {
    const updated = await crudUpdate('btpAvenants', id, { statut: 'rejeté' }, 'Rejet avenant');
    if (updated) setBtpAvenants(prev => prev.map(a => a.id === id ? updated : a));
  };

  const createBtpSousTraitance = async (st: Omit<BtpSousTraitance, 'id' | 'statut' | 'created_by'>) => {
    const created = await crudCreate<BtpSousTraitance>('btpSousTraitances', st, 'Sous-traitance');
    if (created) setBtpSousTraitances(prev => [...prev, created]);
  };

  const solderBtpSousTraitance = async (id: string) => {
    const updated = await crudUpdate('btpSousTraitances', id, { statut: 'soldée' }, 'Solde sous-traitance');
    if (updated) setBtpSousTraitances(prev => prev.map(s => s.id === id ? updated : s));
  };

  const createBtpFournisseur = async (f: Omit<BtpFournisseur, 'id'>) => {
    const created = await crudCreate<BtpFournisseur>('btpFournisseurs', f, 'Fournisseur');
    if (created) setBtpFournisseurs(prev => [...prev, created]);
  };

  const createBtpCautionnement = async (c: Omit<BtpCautionnement, 'id' | 'statut'>) => {
    const created = await crudCreate<BtpCautionnement>('btpCautionnements', c, 'Cautionnement');
    if (created) setBtpCautionnements(prev => [...prev, created]);
  };

  const libererBtpRetenues = async (chantierId: string, accountId: string): Promise<boolean> => {
    try {
      const res = await apiFetch(`/btp/chantiers/${chantierId}/liberer-retenues`, {
        method: 'POST',
        body: JSON.stringify({ accountId })
      });
      if (res.ok) {
        const d = await res.json();
        if (d.transaction) {
          setTransactions(prev => [...prev, d.transaction]);
          setTreasuryAccounts(prev => prev.map(acc =>
            acc.id === accountId ? { ...acc, balance: acc.balance + d.transaction.amount } : acc
          ));
        }
        // Les situations libérées seront rechargées au prochain fetchData.
        fetchData();
        pushToast(`Retenues libérées : ${(d.total_libere ?? 0).toLocaleString('fr-FR')} GNF encaissés.`, 'SUCCESS');
        return true;
      }
      pushToast(await readApiError(res, 'Libération impossible'), 'ERROR');
      return false;
    } catch (err) {
      reportError(err, 'Libération retenues');
      return false;
    }
  };

  const createBtpInspection = async (i: Omit<BtpInspection, 'id' | 'statut' | 'inspecteur_id'>) => {
    const created = await crudCreate<BtpInspection>('btpInspections', i, 'Inspection QHSE');
    if (created) setBtpInspections(prev => [...prev, created]);
  };

  const updateBtpInspection = async (id: string, updates: Partial<BtpInspection>) => {
    const updated = await crudUpdate('btpInspections', id, updates, 'Inspection QHSE');
    if (updated) setBtpInspections(prev => prev.map(i => i.id === id ? updated : i));
  };

  const createBtpPrixUnitaire = async (p: Omit<BtpPrixUnitaire, 'id'>) => {
    const created = await crudCreate<BtpPrixUnitaire>('btpPrixUnitaires', p, 'Prix unitaire');
    if (created) setBtpPrixUnitaires(prev => [...prev, created]);
  };

  const createBtpHeureEngin = async (h: Omit<BtpHeureEngin, 'id' | 'created_by'>) => {
    const created = await crudCreate<BtpHeureEngin>('btpHeuresEngins', h, 'Heures engin');
    if (created) setBtpHeuresEngins(prev => [...prev, created]);
  };

  // --- AGRO METHODS (persistées via /api/crud/*) ---
  const agroCreateLotMatierePremiere = async (lot: Omit<LotMatierePremiere, 'id_lot' | 'statut' | 'created_by'>) => {
    const created = await crudCreate<LotMatierePremiere>('agroLotMatierePremieres', lot, 'Création lot MP');
    if (created) setAgroLotMatierePremieres(prev => [...prev, created]);
  };

  const agroUpdateMatierePremiereStatus = async (id_lot: string, status: AgroMatierePremiereStatus, resultat_controle?: 'conforme' | 'non_conforme' | 'en_attente', motif_rejet?: string) => {
    const lot = agroLotMatierePremieres.find(l => l.id_lot === id_lot);
    if (!lot) return;

    if (['accepté', 'rejeté', 'contrôlé'].includes(status) && currentRole !== 'RESP_QUALITE' && currentRole !== 'GERANT') {
      throw new Error("Seul le Responsable Qualité (ou le Gérant) peut valider ou rejeter un lot.");
    }
    if (status === 'rejeté' && !motif_rejet) {
      throw new Error("Le motif de rejet est obligatoire.");
    }
    if (status === 'accepté' && lot.resultat_controle_qualite !== 'conforme' && resultat_controle !== 'conforme') {
      throw new Error("Un lot doit être conforme pour être accepté.");
    }

    // Workflow en deux étapes : 'accepté' (validation QA) PUIS 'en_stock'
    // (décision du Responsable Stockage via le bouton "Mettre en Stock").
    const updates: Partial<LotMatierePremiere> = {
      statut: status,
      resultat_controle_qualite: resultat_controle || lot.resultat_controle_qualite,
      motif_rejet: motif_rejet || lot.motif_rejet,
      qualite_validated_by: currentRole === 'RESP_QUALITE' ? currentUser?.id : lot.qualite_validated_by
    };
    const updated = await crudUpdate('agroLotMatierePremieres', id_lot, updates, 'Statut lot MP');
    if (updated) setAgroLotMatierePremieres(prev => prev.map(l => l.id_lot === id_lot ? updated : l));
  };

  const agroCreateLotProduction = async (lot: Partial<LotProduction>) => {
    // Double validation UX (rapide) — la validation FAIBLE côté serveur est
    // faite de façon ATOMIQUE par /api/agro/lots-production (une seule
    // transaction : création du lot + décrément des stocks MP).
    const invalids = lot.lots_matiere_premiere_utilises?.filter(u => {
      const l = agroLotMatierePremieres.find(x => x.id_lot === u.lot_id);
      if (!l || l.statut !== 'en_stock') return true;
      const quantiteRestante = l.quantite_restante ?? l.quantite;
      if (quantiteRestante < u.quantite_utilisee) return true;
      return false;
    });

    if (invalids && invalids.length > 0) {
      throw new Error("Impossible d'utiliser des lots qui ne sont pas en_stock ou avec quantité insuffisante.");
    }

    try {
      const res = await apiFetch('/agro/lots-production', {
        method: 'POST',
        body: JSON.stringify({
          nom_produit: lot.nom_produit,
          date_fabrication: lot.date_fabrication,
          quantite_produite: lot.quantite_produite,
          unite: lot.unite,
          responsable_production_id: lot.responsable_production_id,
          lots_matiere_premiere_utilises: lot.lots_matiere_premiere_utilises
        })
      });
      if (res.ok) {
        const d = await res.json();
        setAgroLotProductions(prev => [...prev, d.lot]);
        // Miroir local des stocks MP mis à jour par le serveur
        setAgroLotMatierePremieres(prev => prev.map(mp => {
          const upd = (d.mp_updates || []).find((u: any) => u.id_lot === mp.id_lot);
          return upd || mp;
        }));
      } else {
        throw new Error(await readApiError(res, 'Création lot production impossible'));
      }
    } catch (err) {
      if (err instanceof Error && err.message && !err.message.includes('échec de la sauvegarde')) {
        pushToast(err.message, 'ERROR');
      } else {
        reportError(err, 'Création lot production');
      }
    }
  };

  const agroUpdateProductionStatus = async (id_lot: string, status: AgroProductionStatus, decision_deblocage?: string) => {
    if (status === "conditionné" && currentRole !== "RESP_PRODUCTION" && currentRole !== "GERANT") throw new Error("Non autorisé.");
    if ((status === "disponible_à_la_vente" || decision_deblocage) && currentRole !== "RESP_QUALITE" && currentRole !== "GERANT") throw new Error("Seul le Qualiticien peut libérer.");
    
    if (status === "conditionné") {
      const hasControle = agroControles.some(c => c.lot_production_id === id_lot);
      if (!hasControle) throw new Error("Impossible de clôturer: aucun contrôle qualité (CCP) effectué.");
    }

    const updates: Partial<LotProduction> = { statut: status };
    if (decision_deblocage) updates.decision_deblocage = decision_deblocage;
    const updated = await crudUpdate('agroLotProductions', id_lot, updates, 'Statut lot production');
    if (updated) setAgroLotProductions(prev => prev.map(l => l.id_lot === id_lot ? updated : l));
  };

  const agroAddControleProcess = async (controle: Omit<ControleQualiteProcess, 'id'>) => {
    const created = await crudCreate<ControleQualiteProcess>('agroControles', controle, 'Contrôle qualité');
    if (!created) return;
    setAgroControles(prev => [...prev, created]);

    // Bloquer automatiquement le lot si non_conforme
    if (created.resultat === 'non_conforme') {
      const lot = agroLotProductions.find(l => l.id_lot === created.lot_production_id);
      if (lot && lot.statut !== 'bloqué') {
        const updated = await crudUpdate('agroLotProductions', created.lot_production_id, { statut: 'bloqué' }, 'Blocage lot');
        if (updated) setAgroLotProductions(prev => prev.map(l => l.id_lot === created.lot_production_id ? updated : l));
        await addNotification('GERANT', `Lot ${created.lot_production_id} bloqué automatiquement suite à un contrôle non conforme.`, 'ERROR');
        await addNotification('RESP_QUALITE', `Lot ${created.lot_production_id} bloqué automatiquement. Action requise.`, 'ERROR');
        await addNotification('RESP_PRODUCTION', `Lot ${created.lot_production_id} bloqué (Contrôle: ${created.point_de_controle}).`, 'ERROR');
      }
    }
  };
  const agroCreateCommande = async (cmd: Omit<CommandeClientAgro, 'id' | 'statut'>) => {
    const created = await crudCreate<CommandeClientAgro>('agroCommandes', cmd, 'Création commande');
    if (created) setAgroCommandes(prev => [...prev, created]);
  };

  const agroUpdateCommandeStatus = async (id: string, status: AgroCommandeStatus) => {
    const updated = await crudUpdate('agroCommandes', id, { statut: status }, 'Statut commande');
    if (updated) setAgroCommandes(prev => prev.map(c => c.id === id ? updated : c));
  };

  const agroPrepareLivraison = async (commande_id: string, affectations: Omit<LigneCommandeLotLivre, 'id' | 'commande_id'>[]) => {
    // Validation UX rapide côté client ; l'opération est exécutée de façon
    // ATOMIQUE par /api/agro/livraisons (lignes + stock + commande + fiche
    // dans UNE transaction serveur — plus de risques d'état incohérent).
    const commande = agroCommandes.find(c => c.id === commande_id);
    if (!commande) {
      throw new Error('Commande introuvable.');
    }
    if (!['enregistrée', 'confirmée'].includes(commande.statut)) {
      throw new Error(`La commande n'est pas préparable (statut : ${commande.statut}).`);
    }
    for (const aff of affectations) {
      const prod = agroLotProductions.find(p => p.id_lot === aff.lot_production_id);
      if (!prod) {
        throw new Error(`Lot introuvable : ${aff.lot_production_id}`);
      }
      const stock = prod.quantite_restante ?? prod.quantite_produite;
      if (stock < aff.quantite_livree) {
        throw new Error(`Quantité insuffisante pour le lot ${prod.id_lot} (Stock: ${stock}).`);
      }
    }

    try {
      const res = await apiFetch('/agro/livraisons', {
        method: 'POST',
        body: JSON.stringify({ commande_id, affectations })
      });
      if (res.ok) {
        const d = await res.json();
        setAgroLignesLivrees(prev => [...prev, ...d.lignes]);
        setAgroLotProductions(prev => prev.map(p => {
          const upd = (d.pf_updates || []).find((u: any) => u.id_lot === p.id_lot);
          return upd || p;
        }));
        setAgroCommandes(prev => prev.map(c => c.id === commande_id ? d.commande : c));
        setAgroFiches(prev => [...prev, d.fiche]);
      } else {
        throw new Error(await readApiError(res, 'Préparation de livraison impossible'));
      }
    } catch (err) {
      if (err instanceof Error && err.message && !err.message.includes('échec de la sauvegarde')) {
        pushToast(err.message, 'ERROR');
      } else {
        reportError(err, 'Préparation de livraison');
      }
    }
  };

  const agroCreateReclamation = async (rec: Omit<ReclamationClient, 'id' | 'statut' | 'risque_rappel_signale'>) => {
    // Détection préalable du risque de rappel (>= 2 réclamations sur le même lot)
    const shouldAlert = !!rec.lot_production_id &&
      [...agroReclamations.filter(r => r.lot_production_id === rec.lot_production_id), rec as any].length >= 2;

    const created = await crudCreate<ReclamationClient>('agroReclamations', {
      ...rec,
      risque_rappel_signale: shouldAlert
    }, 'Création réclamation');
    if (!created) return;
    setAgroReclamations(prev => [...prev, created]);

    if (shouldAlert) {
      await addNotification('GERANT', `ALERTE RAPPEL : Plusieurs réclamations détectées pour le lot ${created.lot_production_id}.`, 'ERROR');
    }
  };

  // --- ASSISTANTE : agenda persisté ---
  const addAgendaEvent = async (event: Omit<CalendarEvent, 'id'>) => {
    const created = await crudCreate<CalendarEvent>('agendaEvents', event, 'Événement agenda');
    if (created) setAgendaEvents(prev => [...prev, created]);
  };

  const deleteAgendaEvent = async (id: string) => {
    try {
      const res = await apiFetch(`/crud/agendaEvents/${id}/delete`, { method: 'POST' });
      if (res.ok) {
        setAgendaEvents(prev => prev.filter(e => e.id !== id));
      } else {
        pushToast(`Suppression événement : ${await readApiError(res)}`, 'ERROR');
      }
    } catch (err) {
      reportError(err, 'Suppression événement');
    }
  };

  // --- COMPTABILITÉ (SYSCOHADA) ---
  const postAccountingEntry = async (entry: Omit<any, 'id' | 'createdAt' | 'createdBy' | 'status'>) => {
    // Vérification de la partie double avant envoi au serveur
    const debit = entry.lines.reduce((acc: number, l: any) => acc + (l.debit || 0), 0);
    const credit = entry.lines.reduce((acc: number, l: any) => acc + (l.credit || 0), 0);
    if (Math.abs(debit - credit) > 0.01) {
      pushToast('L\'écriture est déséquilibrée (Débit ≠ Crédit).', 'ERROR');
      return;
    }
    const created = await crudCreate<any>('accountingEntries', entry, 'Écriture comptable');
    if (created) setAccountingEntries(prev => [...prev, created]);
  };

  const validateAccountingEntry = async (id: string) => {
    const updated = await crudUpdate<any>('accountingEntries', id, { status: 'VALIDATED', validatedAt: new Date().toISOString() }, 'Validation écriture');
    if (updated) setAccountingEntries(prev => prev.map(e => e.id === id ? updated : e));
  };

  const createAsset = async (asset: Omit<any, 'id' | 'status'>) => {
    const created = await crudCreate<any>('assets', asset, 'Immobilisation');
    if (created) setAssets(prev => [...prev, created]);
  };

  const createAccountingAccount = async (account: Omit<any, 'id'>) => {
    const created = await crudCreate<any>('accountingAccounts', account, 'Compte comptable');
    if (created) setAccountingAccounts(prev => [...prev, created]);
  };

  // Liaison automatique Trésorerie -> Grand Livre
  const autoGenerateAccountingEntry = async (type: 'VENTE' | 'ACHAT' | 'SALAIRE', amount: number, label: string) => {
    if (accountingJournals.length === 0 || accountingAccounts.length === 0) return;
    
    // Trouver les journaux
    const journalVentes = accountingJournals.find(j => j.code === 'VT') || accountingJournals[0];
    const journalAchats = accountingJournals.find(j => j.code === 'AC') || accountingJournals[0];
    const journalBanque = accountingJournals.find(j => j.code === 'BQ') || accountingJournals[0];

    // Trouver les comptes de base
    const compteBanque = accountingAccounts.find(a => a.accountNumber.startsWith('52')) || accountingAccounts[0];
    const compteVente = accountingAccounts.find(a => a.accountNumber.startsWith('70')) || accountingAccounts[0];
    const compteAchat = accountingAccounts.find(a => a.accountNumber.startsWith('60')) || accountingAccounts[0];
    const compteSalaire = accountingAccounts.find(a => a.accountNumber.startsWith('66')) || accountingAccounts[0];
    
    // Trouver les comptes de TVA
    const tvaCollecteeAcc = accountingAccounts.find(a => a.accountNumber.startsWith('443')) || accountingAccounts[0];
    const tvaDeductibleAcc = accountingAccounts.find(a => a.accountNumber.startsWith('445')) || accountingAccounts[0];

    const tvaRate = companyConfig.tvaRate || 18;
    const ht = amount / (1 + (tvaRate / 100));
    const tva = amount - ht;

    let entry: any = null;

    if (type === 'VENTE') {
      entry = {
        journalId: journalVentes.id,
        date: new Date().toISOString(),
        reference: 'AUTO-VT',
        description: label,
        status: 'DRAFT',
        lines: [
          { accountId: compteBanque.id, debit: amount, credit: 0, label: label },
          { accountId: compteVente.id, debit: 0, credit: ht, label: 'HT - ' + label },
          { accountId: tvaCollecteeAcc.id, debit: 0, credit: tva, label: 'TVA - ' + label }
        ]
      };
    } else if (type === 'ACHAT') {
      entry = {
        journalId: journalAchats.id,
        date: new Date().toISOString(),
        reference: 'AUTO-AC',
        description: label,
        status: 'DRAFT',
        lines: [
          { accountId: compteAchat.id, debit: ht, credit: 0, label: 'HT - ' + label },
          { accountId: tvaDeductibleAcc.id, debit: tva, credit: 0, label: 'TVA - ' + label },
          { accountId: compteBanque.id, debit: 0, credit: amount, label: label }
        ]
      };
    } else if (type === 'SALAIRE') {
      entry = {
        journalId: journalBanque.id,
        date: new Date().toISOString(),
        reference: 'AUTO-RH',
        description: label,
        status: 'DRAFT',
        lines: [
          { accountId: compteSalaire.id, debit: amount, credit: 0, label: label },
          { accountId: compteBanque.id, debit: 0, credit: amount, label: label }
        ]
      };
    }

    if (entry) {
      entry.lines = entry.lines.filter((l: any) => l.debit > 0 || l.credit > 0);
      await postAccountingEntry(entry);
    }
  };

  const contextValue = React.useMemo(() => ({
      projects,
      clients,
      expenses,
      currentRole,
      currentUser,
      companyConfig,
      isReady,
      setRole: setCurrentRole,
      login,
      register: createUser,
      createUser,
      logout,
      addProject,
      confirmPaymentCommercial,
      confirmPaymentAccountant,
      generateDocument,
      updateCompanyConfig,
      deleteProject,
      savePaymentPlan,
      updatePaymentInstallment,
      payInstallmentAndGenerateReceipt,
      updateProject,
      addExpense,
      deleteExpense,
      deleteUser,
      systemUsers,
      fetchSystemUsers,
      prospects,
      fetchProspects,
      addProspect,
      updateProspect,
      deleteProspect,
      convertProspectToProject,
      catalogue,
      addCatalogueItem,
      updateCatalogueItem,
      deleteCatalogueItem,
      proposals,
      generateProposal,
      updateProposalStatus,
      activeMenu,
      setActiveMenu,
      internalMessages,
      fetchMessages: fetchData,
      sendMessage,
      markAsRead,
      employees,
      contracts,
      leaveRequests,
      payslips,
      addEmployee,
      addContract,
      addLeaveRequest,
      updateLeaveRequestStatus,
      addPayslip,
      updatePayslipStatus,
      treasuryAccounts,
      transactions,
      addTreasuryAccount,
      addTransaction,
      tasks,
      notifications,
      addTask,
      updateTaskStatus,
      addNotification,
      markNotificationAsRead,
      btpOffres,
      btpChantiers,
      btpEngins,
      btpIncidents,
      btpJournaux,
      btpSituations,
      createBtpOffre,
      updateBtpOffreStatus,
      updateBtpOffre,
      createBtpChantier,
      updateBtpChantierStatus,
      updateBtpChantier,
      assignBtpEngin,
      updateBtpEnginStatus,
      createBtpIncident,
      updateBtpIncidentStatus,
      createBtpJournal,
      createBtpSituation,
      updateBtpSituation,
      factureBtpSituation,
      btpChantierStats,
      btpEmployeeDirectory,
      btpAffectations,
      createBtpAffectation,
      terminerBtpAffectation,
      btpPointages,
      createBtpPointage,
      btpArticles,
      createBtpArticle,
      updateBtpArticle,
      btpBonCommandes,
      createBtpBonCommande,
      soumettreBtpBonCommande,
      recevoirBtpBonCommande,
      btpMouvements,
      createBtpMouvement,
      btpDocuments,
      addBtpDocument,
      btpAvenants,
      createBtpAvenant,
      validerBtpAvenant,
      rejeterBtpAvenant,
      btpOrdresService,
      btpReserves,
      createBtpReserve,
      updateBtpReserve,
      btpHabilitations,
      createBtpHabilitation,
      updateBtpHabilitation,
      btpSousTraitances,
      createBtpSousTraitance,
      solderBtpSousTraitance,
      btpFournisseurs,
      createBtpFournisseur,
      btpCautionnements,
      createBtpCautionnement,
      libererBtpRetenues,
      btpInspections,
      createBtpInspection,
      updateBtpInspection,
      btpPrixUnitaires,
      createBtpPrixUnitaire,
      btpHeuresEngins,
      createBtpHeureEngin,
      validerRhChantier,
      updateBtpEngin,
      libererCautionnement,
      agroLotMatierePremieres,
      agroLotProductions,
      agroControles,
      agroCommandes,
      agroLignesLivrees,
      agroFiches,
      agroReclamations,
      agroCreateLotMatierePremiere,
      agroUpdateMatierePremiereStatus,
      agroCreateLotProduction,
      agroUpdateProductionStatus,
      agroAddControleProcess,
      agroCreateCommande,
      agroUpdateCommandeStatus,
      agroPrepareLivraison,
      agroCreateReclamation,
      agendaEvents,
      addAgendaEvent,
      deleteAgendaEvent,
      
      // Accounting (SYSCOHADA)
      accountingAccounts,
      accountingJournals,
      accountingEntries,
      assets,
      postAccountingEntry,
      validateAccountingEntry,
      createAsset,
      createAccountingAccount,
      
      // Assistant Module
      assistantTasks,
      assistantMeetings,
      assistantDocuments,
      assistantContacts,
      assistantTravels,
      crudCreateItem: crudCreate,
      crudUpdateItem: crudUpdate,
      crudDeleteItem: crudDelete,

      toasts,
      pushToast,
      dismissToast
  }), [
      projects, clients, expenses, currentRole, currentUser, companyConfig, isReady, systemUsers, prospects, catalogue, proposals, activeMenu, internalMessages, employees, contracts, leaveRequests, payslips, treasuryAccounts, transactions, tasks, notifications, btpOffres, btpChantiers, btpEngins, btpIncidents, btpJournaux, btpSituations, btpAffectations, btpPointages, btpArticles, btpBonCommandes, btpMouvements, btpDocuments, btpChantierStats, btpEmployeeDirectory, btpAvenants, btpOrdresService, btpSousTraitances, btpFournisseurs, btpCautionnements, btpInspections, btpPrixUnitaires, btpHeuresEngins, btpReserves, btpHabilitations,
      createBtpReserve, updateBtpReserve, createBtpHabilitation, updateBtpHabilitation, agroLotMatierePremieres, agroLotProductions, agroControles, agroCommandes, agroLignesLivrees, agroFiches, agroReclamations, agendaEvents, accountingAccounts, accountingJournals, accountingEntries, assets, toasts,
      assistantTasks, assistantMeetings, assistantDocuments, assistantContacts, assistantTravels, crudCreate, crudUpdate, crudDelete
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
