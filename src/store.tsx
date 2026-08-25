import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Project, User, Role, CompanyConfig, Expense, ProjectStatus, AuthResponse, Prospect, TreasuryAccount, Transaction, BtpOffre, BtpChantier, BtpJournalChantier, BtpIncidentQHSE, BtpEngin, BtpSituationTravaux, BtpOffreStatus, BtpChantierStatus, BtpEnginStatus, LotMatierePremiere, AgroMatierePremiereStatus, LotProduction, AgroProductionStatus, ControleQualiteProcess, CommandeClientAgro, AgroCommandeStatus, LigneCommandeLotLivre, FicheTracabilite, ReclamationClient, AgroReclamationStatus, Task, AppNotification, CalendarEvent } from './types';
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
  // Accounting
  treasuryAccounts: TreasuryAccount[];
  transactions: Transaction[];
  addTreasuryAccount: (acc: Omit<TreasuryAccount, 'id' | 'balance'>) => Promise<void>;
  addTransaction: (tx: Omit<Transaction, 'id' | 'date'>) => Promise<void>;
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

  // Retour utilisateur (toasts) — remplace les catch silencieux
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
  const [activeMenu, setActiveMenu] = useState('DASHBOARD');
  const [internalMessages, setInternalMessages] = useState<any[]>([]);

  // HR States
  const [employees, setEmployees] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [payslips, setPayslips] = useState<any[]>([]);

  // Accounting States
  const [treasuryAccounts, setTreasuryAccounts] = useState<TreasuryAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

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
    } catch (err) {}
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
    } catch (err) {}
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

  const fetchData = async () => {
    if (!currentUser) return;
    try {
      const res = await apiFetch('/data');
      if (res.ok) {
        const data = await res.json();
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
        setInternalMessages(data.internal_messages || []);
        setEmployees(data.employees || []);
        setContracts(data.contracts || []);
        setLeaveRequests(data.leave_requests || []);
        setPayslips(data.payslips || []);
        setTreasuryAccounts(data.treasury_accounts || []);
        setTransactions(data.transactions || []);
        
        // Timeout & Escalade (48h)
        const rawTasks = data.tasks || [];
        const now = new Date();
        const processedTasks = rawTasks.map((t: Task) => {
          if (t.status === 'TODO' && t.priority === 'HIGH' && !t.escalated) {
            const ageHours = (now.getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60);
            if (ageHours > 48) {
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
    } catch (err) {}
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
    } catch (err) {}
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
    } catch (err) {}
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
    
    // Auto-generate transaction
    // Use the first treasury account if available
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
    } catch (err) {}
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
    } catch (err) {}
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
      }
    } catch (err) {}
  };

  const deleteExpense = async (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    try {
      await apiFetch(`/expenses/${id}/delete`, { method: 'POST' });
    } catch (err) {}
  };

  const updateCompanyConfig = async (config: CompanyConfig) => {
    setCompanyConfig(config);
    try {
      await apiFetch('/config/update', {
        method: 'POST',
        body: JSON.stringify(config)
      });
    } catch (err) {}
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
    } catch (err) {}
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
    } catch (err) {}
  };

  const deleteProspect = async (id: string) => {
    setProspects(prev => prev.filter(p => p.id !== id));
    try {
      await apiFetch(`/prospects/${id}/delete`, { method: 'POST' });
    } catch (err) {}
  };

  const convertProspectToProject = async (id: string) => {
    const prospect = prospects.find(p => p.id === id);
    if (!prospect) return undefined;

    await updateProspect(id, { stage: 'GAGNE' });

    try {
      const res = await apiFetch('/projects', {
        method: 'POST',
        body: JSON.stringify({ name: prospect.name, budget: 0 })
      });
      if (res.ok) {
        const newProj = await res.json();
        const interactions = prospect.interactions || [];
        const prospectNotes = interactions.map(i => `${new Date(i.date).toLocaleDateString()}: ${i.notes}`).join('\n\n') + (prospect.notes ? '\n\n' + prospect.notes : '');
        const description = `Lead converti depuis ${prospect.source || 'Inconnu'}.\nTYPE PROJET: ${prospect.projectType || 'Non spécifié'}\nOBJECTIFS: ${prospect.objectives || 'Non spécifié'}${prospectNotes ? '\n\nHISTORIQUE APPELS:\n' + prospectNotes : ''}`;
        
        await syncProject(newProj.id, {
          description,
          budget: prospect.estimatedBudget ? Number(prospect.estimatedBudget) : 0,
          clientName: prospect.name,
          clientContact: prospect.phone + (prospect.email ? ' / ' + prospect.email : '')
        });
        return newProj.id;
      }
    } catch (err) {}
    return undefined;
  };

  // HR Methods
  const addEmployee = async (emp: any) => {
    try {
      const res = await apiFetch('/rh/employees', { method: 'POST', body: JSON.stringify(emp) });
      if (res.ok) {
        const d = await res.json();
        setEmployees(prev => [...prev, d]);
      }
    } catch (e) {}
  };

  const addContract = async (ctr: any) => {
    try {
      const res = await apiFetch('/rh/contracts', { method: 'POST', body: JSON.stringify(ctr) });
      if (res.ok) {
        const d = await res.json();
        setContracts(prev => [...prev, d]);
      }
    } catch (e) {}
  };

  const addLeaveRequest = async (lr: any) => {
    try {
      const res = await apiFetch('/rh/leaves', { method: 'POST', body: JSON.stringify(lr) });
      if (res.ok) {
        const d = await res.json();
        setLeaveRequests(prev => [...prev, d]);
        await addNotification('GERANT', `Une nouvelle demande de congé a été soumise.`, 'INFO');
      }
    } catch (e) {}
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
    } catch (e) {}
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
    } catch (e) {}
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
      }
    } catch (e) {}
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
    } catch (err) {}
  };

  const addTransaction = async (tx: Omit<Transaction, 'id' | 'date'>) => {
    try {
      const res = await apiFetch('/accounting/transactions', {
        method: 'POST',
        body: JSON.stringify(tx)
      });
      if (res.ok) {
        const newTx = await res.json();
        setTransactions(prev => [...prev, newTx]);
        
        // Update local balance
        setTreasuryAccounts(prev => prev.map(acc => {
          if (acc.id === tx.accountId) {
            return {
              ...acc,
              balance: tx.type === 'CREDIT' ? acc.balance + tx.amount : acc.balance - tx.amount
            };
          }
          return acc;
        }));
      }
    } catch (err) {}
  };

  // --- COMMUNICATION & TASKS ---
  
  const updateTaskStatus = async (taskId: string, status: 'TODO'|'IN_PROGRESS'|'DONE') => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
    try {
      await apiFetch(`/tasks/${taskId}/update`, {
        method: 'POST',
        body: JSON.stringify({ status })
      });
    } catch(err) {}
  };

  const markNotificationAsRead = async (notificationId: string) => {
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n));
    try {
      await apiFetch(`/notifications/${notificationId}/read`, { method: 'POST' });
    } catch(err) {}
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
        await createBtpChantier({
          offre_id: o.id,
          nom: `Chantier - ${o.objet}`,
          client: o.client,
          adresse: 'A définir',
          date_debut_prevue: new Date().toISOString(),
          budget_initial: o.montant_estime
        });
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

    if (status === 'en_cours' && (!chantier.rh_validation || !chantier.materiel_validation)) {
      throw new Error("Validation RH et Matériel obligatoires avant le démarrage du chantier.");
    }
    const updated = await crudUpdate('btpChantiers', id, { statut: status }, 'Changement statut chantier');
    if (updated) setBtpChantiers(prev => prev.map(c => c.id === id ? updated : c));
  };

  const updateBtpChantier = async (id: string, updates: Partial<BtpChantier>) => {
    const updated = await crudUpdate('btpChantiers', id, updates, 'Mise à jour chantier');
    if (updated) setBtpChantiers(prev => prev.map(c => c.id === id ? updated : c));
  };

  const assignBtpEngin = async (enginId: string, chantierId: string | undefined) => {
    const engin = btpEngins.find(e => e.id === enginId);
    if (!engin) return;
    if (chantierId && engin.statut === 'affecté' && engin.chantier_affecte_id !== chantierId) {
      throw new Error("Cet engin est déjà affecté à un autre chantier en cours.");
    }
    const updated = await crudUpdate('btpEngins', enginId, {
      statut: chantierId ? 'affecté' : 'disponible',
      chantier_affecte_id: chantierId
    }, 'Affectation engin');
    if (updated) setBtpEngins(prev => prev.map(e => e.id === enginId ? updated : e));
  };

  const updateBtpEnginStatus = async (enginId: string, status: BtpEnginStatus) => {
    const updated = await crudUpdate('btpEngins', enginId, { statut: status }, 'Statut engin');
    if (updated) setBtpEngins(prev => prev.map(e => e.id === enginId ? updated : e));
    if (status === 'hors_service') {
      const e = btpEngins.find(x => x.id === enginId);
      if (e?.chantier_affecte_id) {
        await addNotification('COND_TRAVAUX', `L'engin ${e.identifiant_interne} est hors service !`, 'ERROR');
      }
    }
  };

  const createBtpIncident = async (incident: Omit<BtpIncidentQHSE, 'id' | 'statut' | 'declare_par'>) => {
    const created = await crudCreate<BtpIncidentQHSE>('btpIncidents', incident, 'Déclaration incident');
    if (created) setBtpIncidents(prev => [...prev, created]);

    if (incident.gravite === 'critique') {
      await updateBtpChantierStatus(incident.chantier_id, 'suspendu');
      await addNotification('GERANT', `INCIDENT CRITIQUE sur le chantier ID ${incident.chantier_id} ! Chantier suspendu.`, 'ERROR');
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

    // Un lot accepté et disponible passe en stock.
    const nextStatus = status === 'accepté' ? 'en_stock' : status;
    const updates: Partial<LotMatierePremiere> = {
      statut: nextStatus,
      resultat_controle_qualite: resultat_controle || lot.resultat_controle_qualite,
      motif_rejet: motif_rejet || lot.motif_rejet,
      qualite_validated_by: currentRole === 'RESP_QUALITE' ? currentUser?.id : lot.qualite_validated_by
    };
    const updated = await crudUpdate('agroLotMatierePremieres', id_lot, updates, 'Statut lot MP');
    if (updated) setAgroLotMatierePremieres(prev => prev.map(l => l.id_lot === id_lot ? updated : l));
  };

  const agroCreateLotProduction = async (lot: Partial<LotProduction>) => {
    // Vérification: tous les lots utilisés doivent être en stock et avoir une quantité suffisante
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

    const payload: Partial<LotProduction> = {
      ...lot,
      statut: 'planifié',
      quantite_restante: lot.quantite_produite // init PF quantité
    };
    const created = await crudCreate<LotProduction>('agroLotProductions', payload, 'Création lot production');
    if (!created) return;

    // Décrémenter le stock des MP utilisées
    if (lot.lots_matiere_premiere_utilises) {
      for (const usage of lot.lots_matiere_premiere_utilises) {
        const mp = agroLotMatierePremieres.find(x => x.id_lot === usage.lot_id);
        if (!mp) continue;
        const newRestante = (mp.quantite_restante ?? mp.quantite) - usage.quantite_utilisee;
        const updated = await crudUpdate('agroLotMatierePremieres', usage.lot_id, {
          quantite_restante: newRestante,
          statut: newRestante <= 0 ? 'épuisé' : mp.statut
        }, 'Décrément stock MP');
        if (updated) {
          setAgroLotMatierePremieres(prev => prev.map(l => l.id_lot === usage.lot_id ? updated : l));
        }
      }
    }

    setAgroLotProductions(prev => [...prev, created]);
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
    // Vérifier les stocks AVANT toute écriture serveur
    const clonedProductions = [...agroLotProductions];
    const missing: string[] = [];

    for (const aff of affectations) {
      const prodIndex = clonedProductions.findIndex(p => p.id_lot === aff.lot_production_id);
      if (prodIndex === -1) {
        missing.push(aff.lot_production_id);
        continue;
      }
      const prod = clonedProductions[prodIndex];
      const stock = prod.quantite_restante ?? prod.quantite_produite;
      if (stock < aff.quantite_livree) {
        throw new Error(`Quantité insuffisante pour le lot ${prod.id_lot} (Stock: ${stock}).`);
      }
      clonedProductions[prodIndex] = {
        ...prod,
        quantite_restante: stock - aff.quantite_livree,
        statut: stock - aff.quantite_livree <= 0 ? 'épuisé' : prod.statut
      } as LotProduction;
    }
    if (missing.length > 0) {
      throw new Error(`Lots introuvables: ${missing.join(', ')}`);
    }

    // 1. Lignes livrées
    for (const aff of affectations) {
      const created = await crudCreate<LigneCommandeLotLivre>('agroLignesLivrees', { ...aff, commande_id }, 'Ligne de livraison');
      if (created) setAgroLignesLivrees(prev => [...prev, created]);
    }

    // 2. Décrément du stock des lots produits
    const prodMap = new Map(clonedProductions.map(p => [p.id_lot, p]));
    for (const p of clonedProductions) {
      const original = agroLotProductions.find(x => x.id_lot === p.id_lot);
      if (original && p.quantite_restante !== original.quantite_restante) {
        const updated = await crudUpdate('agroLotProductions', p.id_lot, {
          quantite_restante: p.quantite_restante,
          statut: p.statut
        }, 'Mise à jour lot');
        if (updated) prodMap.set(p.id_lot, updated);
      }
    }
    setAgroLotProductions(prev => prev.map(p => prodMap.get(p.id_lot) || p));

    // 3. Commande passée en "préparée"
    await agroUpdateCommandeStatus(commande_id, 'préparée');

    // 4. Fiche de traçabilité descendante
    const mp_origins = new Set<string>();
    affectations.forEach(a => {
      const p = agroLotProductions.find(x => x.id_lot === a.lot_production_id);
      if (p) {
        p.lots_matiere_premiere_utilises.forEach(mp => mp_origins.add(mp.lot_id));
      }
    });
    const createdFiche = await crudCreate<FicheTracabilite>('agroFiches', {
      commande_id,
      lots_produits_finis: affectations.map(a => a.lot_production_id),
      lots_matiere_premiere_origine: Array.from(mp_origins),
      date_edition: new Date().toISOString()
    }, 'Fiche de traçabilité');
    if (createdFiche) setAgroFiches(prev => [...prev, createdFiche]);
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
      toasts,
      pushToast,
      dismissToast
  }), [
      projects, clients, expenses, currentRole, currentUser, companyConfig, isReady, systemUsers, prospects, activeMenu, internalMessages, employees, contracts, leaveRequests, payslips, treasuryAccounts, transactions, tasks, notifications, btpOffres, btpChantiers, btpEngins, btpIncidents, btpJournaux, btpSituations, agroLotMatierePremieres, agroLotProductions, agroControles, agroCommandes, agroLignesLivrees, agroFiches, agroReclamations, agendaEvents, toasts
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
