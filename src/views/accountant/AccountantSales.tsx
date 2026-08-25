import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../../store';
import { 
  CheckCircle, FileText, Download, Settings, Upload, 
  ArrowLeft, ChevronRight, Calculator, FileCheck, CircleDollarSign, CheckCircle2, AlertCircle, XCircle, FileClock,
  TrendingUp, Calendar, Filter, Plus, Trash2, PieChart, BarChart3, Receipt, Activity, Target
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { Project } from '../../types';
import { ProjectDetails } from '../../components/ProjectDetails';
import { PaymentPlanManager } from '../../components/PaymentPlanManager';
import { generateProformaPDF, generateReceiptPDF } from '../../utils/pdfGenerator';
import { useProjectFilter } from '../../hooks/useProjectFilter';
import { ProjectFilterBar } from '../../components/ProjectFilterBar';

export type ExpenseCategory = 'SALAIRE' | 'LOYER' | 'ELECTRICITE' | 'INTERNET' | 'IMPOTS' | 'AUTRE';

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  description: string;
}

export default function AccountantSales() {
  const { projects, companyConfig, expenses, addExpense, deleteExpense, updateCompanyConfig, confirmPaymentAccountant, generateDocument, savePaymentPlan, payInstallmentAndGenerateReceipt, alertUnpaid } = useApp();
  const { filters, setFilters, filteredProjects } = useProjectFilter(projects);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [activeDashboardTab, setActiveDashboardTab] = useState<'PROJECTS' | 'FINANCES'>('PROJECTS');
  const [paymentPanelMode, setPaymentPanelMode] = useState<'SIMPLE' | 'ADVANCED'>('SIMPLE');
  const [customAmounts, setCustomAmounts] = useState<{ [key: string]: number }>({});
  
  // Expenses and targets state
    const [timeFilter, setTimeFilter] = useState<'DAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'SEMESTER' | 'YEAR' | 'ALL'>('MONTH');
  
  const clientTarget = companyConfig.clientTarget ?? 30; // Default 30 clients
  const targetAmountPerClient = companyConfig.targetAmountPerClient ?? 2000000; // Default 2M GNF per client
  
  // Local state for smooth typing without re-rendering the whole context
  const [localClientTarget, setLocalClientTarget] = useState(clientTarget.toString());
  const [localTargetAmount, setLocalTargetAmount] = useState(targetAmountPerClient.toString());

  // Keep local state in sync if global state changes externally
  useEffect(() => {
    setLocalClientTarget(clientTarget.toString());
    setLocalTargetAmount(targetAmountPerClient.toString());
  }, [clientTarget, targetAmountPerClient]);

  const handleSaveTargets = () => {
    const newClientTarget = parseInt(localClientTarget) || 0;
    const newTargetAmount = parseInt(localTargetAmount) || 0;
    updateCompanyConfig({ 
      ...companyConfig, 
      clientTarget: newClientTarget,
      targetAmountPerClient: newTargetAmount 
    });
  };

  const revenueTarget = clientTarget * targetAmountPerClient;


  const [newExpense, setNewExpense] = useState<Partial<Expense>>({ category: 'AUTRE', amount: 0, date: new Date().toISOString().slice(0, 10), description: '' });

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.amount || !newExpense.category || !newExpense.description) return;
    const expenseToAdd: Expense = {
      id: Date.now().toString(),
      category: newExpense.category as ExpenseCategory,
      amount: Number(newExpense.amount),
      date: newExpense.date || new Date().toISOString().slice(0, 10),
      description: newExpense.description
    };
    addExpense(expenseToAdd);
    setNewExpense({ category: 'AUTRE', amount: 0, date: new Date().toISOString().slice(0, 10), description: '' });
  };

  const handleDeleteExpense = (id: string) => {
    deleteExpense(id);
  };

  // Dashboard calculations
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const allPaidInstallments = useMemo(() => {
    return projects.flatMap(p => {
      const installments = p.paymentPlan?.installments || [];
      if (installments.length > 0) {
        return installments
          .filter((i): i is typeof i & { paymentDate: string } => i.status === 'PAID' && !!i.paymentDate)
          .map(i => ({
             id: i.id,
             projectName: p.name,
             amount: i.amount,
             date: new Date(i.paymentDate),
          }));
      } else if (p.paymentStatus === 'PAID' || p.accountantPaymentConfirm) {
        return [{
          id: p.id + '-legacy',
          projectName: p.name,
          amount: p.budget || 0,
          date: new Date(p.createdAt || Date.now())
        }];
      }
      return [];
    }).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [projects]);

  const filterByTime = (dateObj: Date) => {
    if (timeFilter === 'ALL') return true;
    
    // Convert current time and date to start of the day
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (timeFilter === 'DAY') {
      return dateObj >= startOfToday;
    }

    if (timeFilter === 'WEEK') {
      const startOfWeek = new Date(startOfToday);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      return dateObj >= startOfWeek;
    }

    if (timeFilter === 'MONTH') {
      return dateObj.getMonth() === currentMonth && dateObj.getFullYear() === currentYear;
    }
    
    if (timeFilter === 'QUARTER') {
      const currentQuarter = Math.floor(currentMonth / 3);
      const objQuarter = Math.floor(dateObj.getMonth() / 3);
      return objQuarter === currentQuarter && dateObj.getFullYear() === currentYear;
    }

    if (timeFilter === 'SEMESTER') {
      const currentSemester = Math.floor(currentMonth / 6);
      const objSemester = Math.floor(dateObj.getMonth() / 6);
      return objSemester === currentSemester && dateObj.getFullYear() === currentYear;
    }

    if (timeFilter === 'YEAR') {
      return dateObj.getFullYear() === currentYear;
    }
    return true;
  };

  const filteredRevenues = useMemo(() => allPaidInstallments.filter(r => filterByTime(r.date)), [allPaidInstallments, timeFilter]);
  const filteredExpenses = useMemo(() => expenses.filter(e => filterByTime(new Date(e.date))), [expenses, timeFilter]);

  const totalRevenue = filteredRevenues.reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const profit = totalRevenue - totalExpense;

  const revenueProgress = revenueTarget > 0 ? Math.min((totalRevenue / revenueTarget) * 100, 100) : 0;

  const activeClientsCount = useMemo(() => {
    const projectNames = new Set(filteredRevenues.map(r => r.projectName));
    return projectNames.size;
  }, [filteredRevenues]);

  const clientProgress = clientTarget > 0 ? Math.min((activeClientsCount / clientTarget) * 100, 100) : 0;

  const signatureRef = useRef<HTMLInputElement>(null);
  const stampRef = useRef<HTMLInputElement>(null);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // Auto-initialize standard locked 75/25 payment plan when project has budget but no plan set yet
  useEffect(() => {
    if (selectedProject && selectedProject.budget && !selectedProject.paymentPlan) {
      const price = selectedProject.budget || 0;
      if (price > 0) {
        const defaultPlan = {
          totalAmount: price,
          status: 'LOCKED' as const,
          installments: [
            {
              id: 'acompte',
              name: 'Acompte (75%)',
              percentage: 75,
              amount: Math.round(price * 0.75),
              expectedDate: new Date().toISOString().split('T')[0],
              status: 'PENDING' as const
            },
            {
              id: 'solde',
              name: 'Solde (25%)',
              percentage: 25,
              amount: Math.round(price * 0.25),
              expectedDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              status: 'PENDING' as const
            }
          ]
        };
        savePaymentPlan(selectedProject.id, defaultPlan);
      }
    }
  }, [selectedProjectId, selectedProject, savePaymentPlan]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'signatureUrl' | 'stampUrl') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateCompanyConfig({
          ...companyConfig,
          [field]: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // -------------------------------------------------------------
  // DETAIL VIEW FOR SELECTED PROJECT
  // -------------------------------------------------------------
  if (selectedProject) {
    const hasCommercial = true;
    const hasClient = true;
    const hasProforma = selectedProject.documents?.some(d => d.type === 'PROFORMA');
    const isPaid = selectedProject.paymentStatus === 'PAID';
    const price = selectedProject.budget || 0;

    // Direct Real-time calculations
    const installments = selectedProject.paymentPlan?.installments || [];
    const totalPaid = installments
      .filter(i => i.status === 'PAID')
      .reduce((sum, i) => sum + i.amount, 0);
    const totalRemaining = price - totalPaid;
    const paymentProgress = price > 0 ? (totalPaid / price) * 100 : 0;
    
    // Nearest pending installment
    const pendingInstallments = installments
      .filter(i => i.status === 'PENDING')
      .sort((a, b) => new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime());
    const nextInstallment = pendingInstallments[0] || null;

    return (
      <div className="flex flex-col bg-slate-50/50 rounded-sm animate-in fade-in duration-500">
        
        {/* Navigation & Header */}
        <div className="bg-white px-8 py-5 border-b border-slate-200 sticky top-0 z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 rounded-sm shadow-none print:hidden">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSelectedProjectId(null)}
              className="p-2 hover:bg-slate-50 rounded-sm text-slate-500 hover:text-slate-900 transition-colors border border-slate-200 bg-white"
              title="Retour aux projets"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-3">
                {selectedProject.name}
                {isPaid && <span className="px-2 py-0.5 text-emerald-600 border border-slate-100 bg-transparent text-[10px] rounded uppercase font-semibold tracking-wider">Payé</span>}
              </h2>
              <div className="text-xs text-slate-500 mt-0.5 font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> 
                {selectedProject.status.replace(/_/g, ' ')}
              </div>
            </div>
          </div>
          
          <div className="flex bg-slate-50 p-1.5 rounded-sm border border-slate-100 items-center justify-center gap-2 px-4 shadow-inner">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Montant</span>
            <span className="text-lg font-semibold text-slate-800">{price > 0 ? `${price.toLocaleString('fr-FR')} GNF` : '-'}</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 max-w-7xl mx-auto w-full flex flex-col gap-8 print:p-0 print:m-0">
          
          {/* Bento-style financial dashboard strip */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 print:hidden">
            {/* Box 1: Negotiated total */}
            <div className="bg-white border border-slate-200/85 rounded-sm p-4 shadow-none flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Budget Total Contracté</span>
                <span className="text-xl font-semibold text-slate-900 font-mono">
                  {price > 0 ? `${price.toLocaleString('fr-FR')} GNF` : '-'}
                </span>
                <span className="text-xs text-slate-400 block font-medium">Prix TTC négocié initial</span>
              </div>
              <div className="w-12 h-12 rounded-sm bg-slate-50 text-slate-500 flex items-center justify-center shrink-0">
                <CircleDollarSign size={22} />
              </div>
            </div>

            {/* Box 2: Total paid progress */}
            <div className="bg-white border border-slate-200/85 rounded-sm p-4 shadow-none flex items-center justify-between">
              <div className="space-y-1 w-full mr-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total Encaissé</span>
                <span className="text-xl font-semibold text-emerald-600 font-mono block">
                  {totalPaid.toLocaleString('fr-FR')} GNF
                </span>
                <div className="flex items-center gap-2 mt-1 w-full">
                  <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${paymentProgress}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-emerald-600 shrink-0">{paymentProgress.toFixed(0)}%</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-sm bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 ml-1">
                <CheckCircle2 size={22} />
              </div>
            </div>

            {/* Box 3: Remaining balance */}
            <div className="bg-white border border-slate-200/85 rounded-sm p-4 shadow-none flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Solde Restarant à régler</span>
                <span className={`text-xl font-semibold font-mono ${totalRemaining > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {totalRemaining.toLocaleString('fr-FR')} GNF
                </span>
                <span className="text-xs text-slate-400 block font-medium">Somme totale à recouvrir</span>
              </div>
              <div className={`w-12 h-12 rounded-sm flex items-center justify-center shrink-0 ${totalRemaining > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                <AlertCircle size={22} />
              </div>
            </div>

            {/* Box 4: Next expected installment info */}
            <div className="bg-white border border-slate-200/85 rounded-sm p-4 shadow-none flex items-center justify-between">
              <div className="space-y-1 min-w-0 flex-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Prochaine Échéance</span>
                <span className="text-lg font-semibold text-slate-900 block truncate font-mono">
                  {nextInstallment ? `${nextInstallment.amount.toLocaleString('fr-FR')} GNF` : '0 GNF'}
                </span>
                <span className="text-[10px] text-slate-500 block truncate">
                  {nextInstallment ? `${nextInstallment.name} (le ${new Date(nextInstallment.expectedDate).toLocaleDateString('fr-FR')})` : 'Toutes les tranches soldées !'}
                </span>
              </div>
              <div className="w-12 h-12 rounded-sm bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 ml-2">
                <FileClock size={22} />
              </div>
            </div>
          </div>

          {/* Top Actions & Financial Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
            
            {/* Checklist */}
            <div className="bg-white/80 backdrop-blur-xl border border-white rounded-[2rem] p-4 shadow-none shadow-slate-200/50 flex flex-col gap-6 flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3">Progression du dossier</h3>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 font-medium">Brief Commercial</span>
                  {hasCommercial ? <CheckCircle2 size={18} className="text-emerald-500"/> : <AlertCircle size={18} className="text-amber-500"/>}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 font-medium">Informations Client</span>
                  {hasClient ? <CheckCircle2 size={18} className="text-emerald-500"/> : <AlertCircle size={18} className="text-amber-500"/>}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 font-medium">Facture Proforma</span>
                  {hasProforma ? <CheckCircle2 size={18} className="text-emerald-500"/> : <XCircle size={18} className="text-slate-300"/>}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 font-medium">Paiement Validé</span>
                  {isPaid ? <CheckCircle2 size={18} className="text-emerald-500"/> : <FileClock size={18} className="text-amber-500"/>}
                </div>
              </div>
            </div>

            {/* Actions / Payment Plan */}
            <div className="lg:col-span-2 flex flex-col">
              {!hasCommercial ? (
                <div className="bg-white border border-slate-200 rounded-sm p-4 shadow-none flex items-center justify-center min-h-[200px]">
                   <div className="text-center text-slate-500">
                     <AlertCircle size={48} className="mx-auto mb-4 text-amber-300" />
                     <p className="font-semibold text-slate-700">En attente des données commerciales</p>
                     <p className="text-sm mt-1">Le plan de financement sera disponible une fois le tarif négocié.</p>
                   </div>
                </div>
              ) : paymentPanelMode === 'ADVANCED' ? (
                <div className="flex flex-col gap-4">
                  <PaymentPlanManager project={selectedProject} />
                  <button
                    onClick={() => setPaymentPanelMode('SIMPLE')}
                    className="text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors self-end pr-2 flex items-center gap-1 cursor-pointer"
                  >
                    â†  Retour au suivi simplifié (75% / 25%)
                  </button>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-sm p-4 shadow-none flex flex-col gap-6 flex flex-col gap-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800 uppercase tracking-wide">Suivi Simplifié des Règlements (75% / 25%)</h3>
                      <p className="text-xs text-slate-500">Plan de financement standard pré-configuré et verrouillé</p>
                    </div>
                    <button
                      onClick={() => setPaymentPanelMode('ADVANCED')}
                      className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-sm text-xs font-semibold transition-all cursor-pointer"
                    >
                      Échéancier Personnalisé
                    </button>
                  </div>

                  {/* 75% / 25% cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Acompte (75%) card */}
                    {(() => {
                      const installments = selectedProject.paymentPlan?.installments || [];
                      const acompte = installments.find(i => i.id === 'acompte') || installments[0];
                      const isPaid = acompte?.status === 'PAID';
                      
                      return (
                        <div className={`p-5 rounded-sm border transition-all flex flex-col justify-between gap-4 ${
                          isPaid 
                            ? 'bg-emerald-50/20 border-emerald-200' 
                            : 'bg-white border-slate-200 shadow-none'
                        }`}>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-semibold text-slate-800">
                                1. Acompte de Démarrage ({Math.round(((customAmounts[`${selectedProject.id}_acompte`] !== undefined ? customAmounts[`${selectedProject.id}_acompte`] : (acompte ? acompte.amount : price * 0.75)) / (price || 1)) * 100)}%)
                              </span>
                              <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                                isPaid ? 'text-emerald-600 border border-slate-100 bg-transparent' : 'text-amber-600 border border-slate-100 bg-transparent'
                              }`}>
                                {isPaid ? 'Acquitté' : 'À percevoir'}
                              </span>
                            </div>
                            
                            {!isPaid ? (
                              <div className="mt-1">
                                <label className="text-[9px] uppercase font-semibold text-slate-400 mb-0.5 block">Montant exact encaissé</label>
                                <div className="relative">
                                  <input
                                    type="text"
                                    value={customAmounts[`${selectedProject.id}_acompte`] !== undefined ? customAmounts[`${selectedProject.id}_acompte`].toLocaleString('fr-FR') : (acompte ? acompte.amount : Math.round(price * 0.75)).toLocaleString('fr-FR')}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value.replace(/\D/g, ''), 10) || 0;
                                      setCustomAmounts(prev => ({ ...prev, [`${selectedProject.id}_acompte`]: val }));
                                    }}
                                    className="w-full border-b border-slate-300 focus:border-emerald-500 bg-transparent text-xl font-semibold text-slate-900 font-mono py-1 px-0 outline-none transition-colors pr-8"
                                  />
                                  <span className="absolute right-0 bottom-2 text-xs font-bold text-slate-400">GNF</span>
                                </div>
                              </div>
                            ) : (
                              <div className="text-xl font-semibold text-slate-900 font-mono">
                                {acompte ? acompte.amount.toLocaleString('fr-FR') : Math.round(price * 0.75).toLocaleString('fr-FR')} GNF
                              </div>
                            )}

                            <p className="text-[10px] text-slate-500 leading-normal">
                              Échéance initiale : {acompte ? new Date(acompte.expectedDate).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')}
                            </p>
                            {isPaid && acompte.paymentDate && (
                              <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                                <CheckCircle2 size={11} /> Reçu le {new Date(acompte.paymentDate).toLocaleDateString('fr-FR')}
                              </p>
                            )}
                          </div>

                          <div className="pt-3 border-t border-slate-100/60">
                            {isPaid ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    if (window.confirm('Voulez-vous vraiment signaler un incident de paiement (chèque rejeté, etc.) ? Le projet sera suspendu.')) {
                                      alertUnpaid(selectedProject.id);
                                    }
                                  }}
                                  className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-sm text-xs flex items-center justify-center transition cursor-pointer"
                                  title="Signaler un chèque rejeté ou incident"
                                >
                                  <AlertCircle size={14} />
                                </button>
                                <button
                                  onClick={() => {
                                    const doc = selectedProject.documents?.find(d => d.id === acompte.receiptDocumentId);
                                    if (doc) {
                                      generateReceiptPDF(selectedProject, doc, companyConfig);
                                    } else {
                                      const mockDoc = {
                                        id: acompte.receiptDocumentId || Date.now().toString(),
                                        type: 'RECEIPT' as const,
                                        createdAt: acompte.paymentDate || new Date().toISOString(),
                                        amountPaid: acompte.amount,
                                        installmentId: acompte.id,
                                        installmentName: acompte.name,
                                      };
                                      generateReceiptPDF(selectedProject, mockDoc, companyConfig);
                                    }
                                  }}
                                  className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-sm text-xs flex items-center justify-center gap-1.5 transition shadow-none cursor-pointer"
                                >
                                  <Download size={12} /> Télécharger le reçu
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  if (acompte) {
                                    const amount = customAmounts[`${selectedProject.id}_acompte`] !== undefined ? customAmounts[`${selectedProject.id}_acompte`] : acompte.amount;
                                    payInstallmentAndGenerateReceipt(selectedProject.id, acompte.id, acompte.name, amount).then(newDoc => {
                                      if (newDoc) generateReceiptPDF(selectedProject, newDoc, companyConfig);
                                    });
                                  }
                                }}
                                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-sm text-xs flex items-center justify-center gap-1.5 transition shadow-none shadow-emerald-500/10 cursor-pointer"
                              >
                                <CheckCircle2 size={12} /> Enregistrer le paiement
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Solde (25%) card */}
                    {(() => {
                      const installments = selectedProject.paymentPlan?.installments || [];
                      const acompte = installments.find(i => i.id === 'acompte') || installments[0];
                      const solde = installments.find(i => i.id === 'solde') || installments[1];
                      const isAcomptePaid = acompte?.status === 'PAID';
                      const isPaid = solde?.status === 'PAID';
                      
                      let soldeCountdownText = '';
                      let soldeCountdownBadgeClass = '';
                      let isOverdue = false;

                      if (isAcomptePaid && solde && solde.status === 'PENDING') {
                        const expectedDate = new Date(solde.expectedDate);
                        const today = new Date();
                        expectedDate.setHours(0, 0, 0, 0);
                        today.setHours(0, 0, 0, 0);
                        const diffTime = expectedDate.getTime() - today.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        
                        if (diffDays > 0) {
                          soldeCountdownText = `${diffDays} jour${diffDays > 1 ? 's' : ''} restant${diffDays > 1 ? 's' : ''}`;
                          soldeCountdownBadgeClass = 'bg-blue-50 text-blue-700 border border-blue-100';
                        } else if (diffDays === 0) {
                          soldeCountdownText = "Aujourd'hui";
                          soldeCountdownBadgeClass = 'bg-amber-50 text-amber-700 border border-amber-100';
                        } else {
                          isOverdue = true;
                          const absDays = Math.abs(diffDays);
                          soldeCountdownText = `${absDays} jour${absDays > 1 ? 's' : ''} de retard`;
                          soldeCountdownBadgeClass = 'text-rose-600 border border-slate-100 bg-transparent border border-rose-200';
                        }
                      }

                      return (
                        <div className={`p-5 rounded-sm border transition-all flex flex-col justify-between gap-4 ${
                          !isAcomptePaid 
                            ? 'bg-slate-50/60 border-slate-200 opacity-60' 
                            : isPaid 
                              ? 'bg-emerald-50/20 border-emerald-200' 
                              : 'bg-white border-slate-200 shadow-none'
                        }`}>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-semibold text-slate-800">
                                2. Solde Final ({Math.round(((customAmounts[`${selectedProject.id}_solde`] !== undefined ? customAmounts[`${selectedProject.id}_solde`] : (solde ? solde.amount : price * 0.25)) / (price || 1)) * 100)}%)
                              </span>
                              <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                                !isAcomptePaid
                                  ? 'bg-slate-100 text-slate-400'
                                  : isPaid 
                                    ? 'text-emerald-600 border border-slate-100 bg-transparent' 
                                    : 'text-blue-600 border border-slate-100 bg-transparent'
                              }`}>
                                {!isAcomptePaid ? 'Bloqué' : isPaid ? 'Acquitté' : 'À percevoir'}
                              </span>
                            </div>

                            {!isPaid && isAcomptePaid ? (
                              <div className="mt-1">
                                <label className="text-[9px] uppercase font-semibold text-slate-400 mb-0.5 block">Montant exact encaissé</label>
                                <div className="relative">
                                  <input
                                    type="text"
                                    value={customAmounts[`${selectedProject.id}_solde`] !== undefined ? customAmounts[`${selectedProject.id}_solde`].toLocaleString('fr-FR') : (solde ? solde.amount : Math.round(price * 0.25)).toLocaleString('fr-FR')}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value.replace(/\D/g, ''), 10) || 0;
                                      setCustomAmounts(prev => ({ ...prev, [`${selectedProject.id}_solde`]: val }));
                                    }}
                                    className="w-full border-b border-slate-300 focus:border-emerald-500 bg-transparent text-xl font-semibold text-slate-900 font-mono py-1 px-0 outline-none transition-colors pr-8"
                                  />
                                  <span className="absolute right-0 bottom-2 text-xs font-bold text-slate-400">GNF</span>
                                </div>
                              </div>
                            ) : (
                              <div className="text-xl font-semibold text-slate-900 font-mono opacity-80">
                                {solde ? solde.amount.toLocaleString('fr-FR') : Math.round(price * 0.25).toLocaleString('fr-FR')} GNF
                              </div>
                            )}
                            
                            {!isAcomptePaid ? (
                              <p className="text-[10px] text-slate-400 leading-normal flex items-center gap-1 italic">
                                <AlertCircle size={11} /> Libéré après encaissement de l'acompte
                              </p>
                            ) : (
                              <div className="space-y-1.5">
                                <p className="text-[10px] text-slate-500 leading-normal">
                                  Échéance (J+21) : {solde ? new Date(solde.expectedDate).toLocaleDateString('fr-FR') : ''}
                                </p>
                                {soldeCountdownText && (
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${soldeCountdownBadgeClass}`}>
                                      {soldeCountdownText}
                                    </span>
                                    {isOverdue && (
                                      <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                                    )}
                                  </div>
                                )}
                                {isPaid && solde.paymentDate && (
                                  <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                                    <CheckCircle2 size={11} /> Reçu le {new Date(solde.paymentDate).toLocaleDateString('fr-FR')}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="pt-3 border-t border-slate-100/60">
                            {!isAcomptePaid ? (
                              <button
                                disabled
                                className="w-full py-2 bg-slate-100 text-slate-400 font-semibold rounded-sm text-xs flex items-center justify-center gap-1.5 cursor-not-allowed"
                              >
                                <AlertCircle size={12} /> En attente de l'acompte
                              </button>
                            ) : isPaid ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    if (window.confirm('Voulez-vous vraiment signaler un incident de paiement (chèque rejeté, etc.) ? Le projet sera suspendu.')) {
                                      alertUnpaid(selectedProject.id);
                                    }
                                  }}
                                  className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-sm text-xs flex items-center justify-center transition cursor-pointer"
                                  title="Signaler un chèque rejeté ou incident"
                                >
                                  <AlertCircle size={14} />
                                </button>
                                <button
                                  onClick={() => {
                                    const doc = selectedProject.documents?.find(d => d.id === solde.receiptDocumentId);
                                    if (doc) {
                                      generateReceiptPDF(selectedProject, doc, companyConfig);
                                    } else {
                                    const mockDoc = {
                                      id: solde.receiptDocumentId || Date.now().toString(),
                                      type: 'RECEIPT' as const,
                                      createdAt: solde.paymentDate || new Date().toISOString(),
                                      amountPaid: solde.amount,
                                      installmentId: solde.id,
                                      installmentName: solde.name,
                                    };
                                    generateReceiptPDF(selectedProject, mockDoc, companyConfig);
                                  }
                                }}
                                className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-sm text-xs flex items-center justify-center gap-1.5 transition shadow-none cursor-pointer"
                              >
                                <Download size={12} /> Télécharger le reçu final
                              </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  if (solde) {
                                    const amount = customAmounts[`${selectedProject.id}_solde`] !== undefined ? customAmounts[`${selectedProject.id}_solde`] : solde.amount;
                                    payInstallmentAndGenerateReceipt(selectedProject.id, solde.id, solde.name, amount).then(newDoc => {
                                      if (newDoc) generateReceiptPDF(selectedProject, newDoc, companyConfig);
                                    });
                                  }
                                }}
                                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-sm text-xs flex items-center justify-center gap-1.5 transition shadow-none shadow-emerald-500/10 cursor-pointer"
                              >
                                <CheckCircle2 size={12} /> Enregistrer le paiement du solde
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Generated Documents */}
          {selectedProject.documents && selectedProject.documents.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-sm p-4 shadow-none flex flex-col gap-6 print:hidden">
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3 mb-4">Documents Fiscaux Générés</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedProject.documents.map(d => (
                  <div key={d.id} className="flex items-center gap-4 bg-slate-50 border border-slate-200 px-5 py-4 rounded-sm group hover:border-emerald-300 transition-colors">
                    <div className="bg-white p-2.5 rounded-sm border border-slate-200 text-emerald-600 shadow-none">
                      <FileText size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">
                        {d.type === 'PROFORMA' ? 'Facture Proforma' : d.type === 'RECEIPT' ? 'Reçu de Paiement' : 'Document'}
                      </p>
                      <p className="text-slate-400 text-xs mt-0.5">{new Date(d.createdAt).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <button 
                      className="text-slate-400 hover:text-emerald-600 bg-white border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50 p-2 rounded-sm transition-all shadow-none" 
                      onClick={() => {
                        if (d.type === 'PROFORMA') {
                          generateProformaPDF(selectedProject, companyConfig);
                        } else if (d.type === 'RECEIPT') {
                          generateReceiptPDF(selectedProject, d, companyConfig);
                        }
                      }}
                      title="Télécharger"
                    >
                      <Download size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Project Specs */}
          {(hasClient || hasCommercial) && (
            <div className="mt-4">
              <h3 className="text-xl font-semibold text-slate-900 mb-6 print:hidden">Détails et Cahier des charges</h3>
              <ProjectDetails project={selectedProject} />
            </div>
          )}

        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // DASHBOARD VIEW
  // -------------------------------------------------------------
  return (
    <div className="flex flex-col bg-slate-50/50 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 flex items-center gap-3">
            <Calculator className="text-emerald-600" size={32} />
            Espace Comptabilité
          </h1>
          <p className="text-slate-500 mt-2 text-lg">Gérez la facturation, suivez les encaissements en temps réel et validez les reçus officiels.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
          <div className="bg-slate-50 text-slate-800 px-5 py-3 rounded-sm text-sm font-semibold border border-slate-200 shadow-none flex-1 sm:flex-none text-center">
             {projects.length} {projects.length > 1 ? 'PROJETS EN COURS' : 'PROJET EN COURS'}
          </div>
          <button 
            onClick={() => setShowConfig(!showConfig)}
            className={`px-5 py-3 rounded-sm text-sm font-semibold transition-colors flex items-center justify-center gap-2 flex-1 sm:flex-none
              ${showConfig ? 'bg-slate-900 text-white border border-slate-900' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-none'}`}
          >
            <Settings size={18} /> Configuration Fiscale
          </button>
        </div>
      </div>

      {showConfig && (
        <div className="bg-slate-900 p-4 rounded-sm shadow-none text-slate-300 animate-in slide-in-from-top-4 duration-500 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 text-slate-800 opacity-50 cursor-none">
            <Settings size={200} />
          </div>
          <div className="relative z-10 w-full max-w-4xl mx-auto">
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-2">Signature, Cachet & Banque</h2>
              <p className="text-slate-400">Ces éléments sont automatiquement apposés sur les factures et reçus de paiement.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-slate-800 p-4 rounded-sm border border-slate-700 shadow-inner flex flex-col gap-4">
                <h3 className="font-medium text-slate-300 mb-2 border-b border-slate-700 pb-2">Informations Légales de l'Entreprise</h3>
                
                <div>
                  <label className="text-xs text-slate-500 uppercase font-semibold">Nom de l'entreprise</label>
                  <input type="text" value={companyConfig.companyName || ''} onChange={(e) => updateCompanyConfig({...companyConfig, companyName: e.target.value})} className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-sm p-2.5 text-sm text-slate-200 focus:outline-emerald-500" placeholder="Ex: Mon Agence Web SRL" />
                </div>
                
                <div>
                  <label className="text-xs text-slate-500 uppercase font-semibold">Adresse complète</label>
                  <input type="text" value={companyConfig.companyAddress || ''} onChange={(e) => updateCompanyConfig({...companyConfig, companyAddress: e.target.value})} className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-sm p-2.5 text-sm text-slate-200 focus:outline-emerald-500" placeholder="Ex: 123 Rue de la Paix, 75000 Paris" />
                </div>

                <div>
                  <label className="text-xs text-slate-500 uppercase font-semibold">Identifiant (SIRET / IFU / RCCM)</label>
                  <input type="text" value={companyConfig.companyId || ''} onChange={(e) => updateCompanyConfig({...companyConfig, companyId: e.target.value})} className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-sm p-2.5 text-sm text-slate-200 focus:outline-emerald-500" placeholder="Ex: Siret 12345678900012" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-500 uppercase font-semibold">Email</label>
                    <input type="email" value={companyConfig.companyEmail || ''} onChange={(e) => updateCompanyConfig({...companyConfig, companyEmail: e.target.value})} className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-sm p-2.5 text-sm text-slate-200 focus:outline-emerald-500" placeholder="contact@agence.com" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 uppercase font-semibold">Téléphone</label>
                    <input type="text" value={companyConfig.companyPhone || ''} onChange={(e) => updateCompanyConfig({...companyConfig, companyPhone: e.target.value})} className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-sm p-2.5 text-sm text-slate-200 focus:outline-emerald-500" placeholder="+33 1 23 45 67 89" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-slate-700 pt-4 mt-2">
                  <div>
                    <label className="text-xs text-slate-500 uppercase font-semibold">Objectif Clients (par mois)</label>
                    <input type="number" min="1" value={localClientTarget} onChange={(e) => setLocalClientTarget(e.target.value)} onBlur={handleSaveTargets} onKeyDown={e => e.key === 'Enter' && handleSaveTargets()} className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-sm p-2.5 text-sm text-slate-200 focus:outline-emerald-500" placeholder="Ex: 30" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 uppercase font-semibold">Tarif unitaire cible (GNF)</label>
                    <input type="number" min="0" value={localTargetAmount} onChange={(e) => setLocalTargetAmount(e.target.value)} onBlur={handleSaveTargets} onKeyDown={e => e.key === 'Enter' && handleSaveTargets()} className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-sm p-2.5 text-sm text-slate-200 focus:outline-emerald-500" placeholder="Ex: 2000000" />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-500 uppercase font-semibold">Coordonnées Bancaires (RIB / IBAN)</label>
                  <textarea rows={3} value={companyConfig.bankingDetails || ''} onChange={(e) => updateCompanyConfig({...companyConfig, bankingDetails: e.target.value})} className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-sm p-2.5 text-sm text-slate-200 focus:outline-emerald-500 font-mono" placeholder="Ex: ECOBANK SENEGAL&#10;IBAN: SN76 0001 0200 3000 4567 8901 23&#10;BIC: ECOSNDAXXX" />
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <div className="bg-slate-800 p-4 rounded-sm border border-slate-700 shadow-inner">
                  <label className="flex items-center justify-between font-medium text-slate-300 mb-4">
                    Signature Autorisée
                  </label>
                {companyConfig.signatureUrl ? (
                  <div className="flex flex-col gap-4">
                    <div className="bg-white/5 p-4 rounded-sm flex items-center justify-center h-40 border border-slate-600 border-dashed">
                      <img src={companyConfig.signatureUrl} alt="Signature" className="max-h-full object-contain filter invert opacity-90" />
                    </div>
                    <button onClick={() => signatureRef.current?.click()} className="w-full text-sm text-slate-900 font-semibold px-4 py-3 bg-white rounded-sm hover:bg-slate-200 transition-colors">Modifier la signature</button>
                  </div>
                ) : (
                  <button onClick={() => signatureRef.current?.click()} className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-600 rounded-sm hover:border-blue-500 hover:bg-slate-700/50 transition-colors group">
                    <Upload size={32} className="text-slate-500 mb-3 group-hover:text-blue-400 transition-colors" />
                    <span className="text-sm font-medium text-slate-300">Importer PNG transparent</span>
                  </button>
                )}
                <input type="file" accept="image/*" ref={signatureRef} className="hidden" onChange={(e) => handleFileUpload(e, 'signatureUrl')} />
              </div>

              <div className="bg-slate-800 p-4 rounded-sm border border-slate-700 shadow-inner">
                <label className="flex items-center justify-between font-medium text-slate-300 mb-4">
                  Cachet de l'Entreprise
                </label>
                {companyConfig.stampUrl ? (
                  <div className="flex flex-col gap-4">
                    <div className="bg-white/5 p-4 rounded-sm flex items-center justify-center h-40 border border-slate-600 border-dashed">
                      <img src={companyConfig.stampUrl} alt="Cachet" className="max-h-full object-contain filter invert opacity-90" />
                    </div>
                    <button onClick={() => stampRef.current?.click()} className="w-full text-sm text-slate-900 font-semibold px-4 py-3 bg-white rounded-sm hover:bg-slate-200 transition-colors">Modifier le cachet</button>
                  </div>
                ) : (
                  <button onClick={() => stampRef.current?.click()} className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-600 rounded-sm hover:border-blue-500 hover:bg-slate-700/50 transition-colors group">
                    <Upload size={32} className="text-slate-500 mb-3 group-hover:text-blue-400 transition-colors" />
                    <span className="text-sm font-medium text-slate-300">Importer PNG transparent</span>
                  </button>
                )}
                <input type="file" accept="image/*" ref={stampRef} className="hidden" onChange={(e) => handleFileUpload(e, 'stampUrl')} />
              </div>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* Accountant Tabs */}
      <div className="flex bg-slate-100 p-1.5 rounded-sm w-full max-w-sm shrink-0">
        <button
          onClick={() => setActiveDashboardTab('PROJECTS')}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-sm transition-all ${
            activeDashboardTab === 'PROJECTS' ? 'bg-white text-slate-900 shadow-none' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Projets
        </button>
        <button
          onClick={() => setActiveDashboardTab('FINANCES')}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-sm transition-all ${
            activeDashboardTab === 'FINANCES' ? 'bg-white text-emerald-600 shadow-none' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Trésorerie & Charges
        </button>
      </div>

      {activeDashboardTab === 'PROJECTS' && (
      <div className="animate-in fade-in duration-300">
        <ProjectFilterBar filters={filters} setFilters={setFilters} totalResults={filteredProjects.length} />
        
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filteredProjects.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-500 bg-white rounded-sm border border-slate-200 border-dashed">
              <Calculator size={48} className="text-slate-300 mb-4" />
              <p className="text-lg font-medium">Aucun projet trouvé</p>
              <p className="text-sm">Modifiez vos filtres ou attendez de nouveaux projets.</p>
            </div>
          ) : (
            filteredProjects.map(p => {
            const hasCommercial = true;
            const hasProforma = p.documents?.some(d => d.type === 'PROFORMA');
            const isPaid = p.paymentStatus === 'PAID';
            const price = p.budget || 0;

            // Direct Real-time calculations for each item card
            const installments = p.paymentPlan?.installments || [];
            let totalPaid = installments
              .filter(i => i.status === 'PAID')
              .reduce((sum, i) => sum + i.amount, 0);
            
            if (installments.length === 0 && (p.paymentStatus === 'PAID' || p.accountantPaymentConfirm)) {
              totalPaid = price;
            }
            
            const totalRemaining = price - totalPaid;
            const paymentProgress = price > 0 ? (totalPaid / price) * 100 : 0;
            
            // Overdue check
            const pendingInstallments = installments
              .filter(i => i.status === 'PENDING')
              .sort((a, b) => new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime());
            const nextInstallment = pendingInstallments[0] || null;
            const isOverdue = nextInstallment ? new Date(nextInstallment.expectedDate).getTime() < Date.now() : false;

            return (
              <div 
                key={p.id} 
                className="bg-white p-4 rounded-sm shadow-none border border-slate-200 flex flex-col hover:border-emerald-400 hover:shadow-none transition-all group overflow-hidden"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-sm flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors">
                    <CircleDollarSign size={24} />
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {isPaid ? (
                      <span className="px-3 py-1 text-emerald-600 border border-slate-100 bg-transparent text-[10px] rounded-sm uppercase font-semibold tracking-wider">Payé</span>
                    ) : p.paymentStatus === 'PARTIAL' ? (
                      <span className="px-3 py-1 text-blue-600 border border-slate-100 bg-transparent text-[10px] rounded-sm uppercase font-semibold tracking-wider animate-pulse">Partiel</span>
                    ) : p.commercialPaymentConfirm ? (
                      <span className="px-3 py-1 text-amber-600 border border-slate-100 bg-transparent text-[10px] rounded-sm uppercase font-semibold tracking-wider animate-pulse">Acompte requis</span>
                    ) : (
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] rounded-sm uppercase font-semibold tracking-wider">En attente</span>
                    )}
                  </div>
                </div>
                
                <h3 className="text-lg font-semibold text-slate-900 mb-0.5 line-clamp-1 group-hover:text-emerald-600 transition-colors">
                  {p.name}
                </h3>
                
                <div className="text-xs text-slate-400 font-medium mb-3 uppercase tracking-wider">
                  {p.status.replace(/_/g, ' ')}
                </div>

                {/* Real-time Collections Tracker */}
                <div className="mt-1 space-y-2 bg-slate-50/50 p-4 rounded-sm border border-slate-100 mb-4">
                  
                  {/* MONTANT FINAL VALIDÉ */}
                  <div className="flex justify-between items-center text-xs border-b border-slate-100/80 pb-2 mb-2">
                    <span className="text-slate-600 font-semibold uppercase tracking-wide">Montant Final</span>
                    <span className="text-slate-900 font-semibold font-mono text-sm">{price > 0 ? `${price.toLocaleString('fr-FR')} GNF` : '-'}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-semibold uppercase tracking-wide">Recouvrement</span>
                    <span className="text-emerald-600 font-semibold font-mono">{paymentProgress.toFixed(0)}%</span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-full bg-slate-200/60 h-2 rounded-full overflow-hidden relative">
                    <div 
                      className="bg-emerald-500 h-full transition-all duration-300" 
                      style={{ width: `${paymentProgress}%` }}
                    />
                  </div>

                  {/* Financial Balance Ledger Info */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100/80">
                    <div>
                      <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block">Déjà Encaissé</span>
                      <span className="text-xs font-semibold font-mono text-emerald-600">
                        {totalPaid.toLocaleString('fr-FR')} GNF
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block">Reste à payer</span>
                      <span className={`text-xs font-semibold font-mono ${totalRemaining > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                        {totalRemaining.toLocaleString('fr-FR')} GNF
                      </span>
                    </div>
                  </div>
                </div>

                {/* Upcoming Deadline box */}
                <div className="flex-1 flex flex-col justify-end text-xs mb-5">
                  {nextInstallment ? (
                    <div className={`p-3 rounded-sm border flex flex-col gap-1 ${isOverdue ? 'bg-rose-50/60 border-rose-100 text-rose-700' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                      <div className="flex items-center justify-between font-semibold">
                        <span className="truncate">{nextInstallment.name}</span>
                        <span className="font-mono">{nextInstallment.amount.toLocaleString('fr-FR')} GNF</span>
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-slate-400 mt-0.5">
                        <span>Échéance : {new Date(nextInstallment.expectedDate).toLocaleDateString('fr-FR')}</span>
                        {isOverdue && (
                          <span className="text-rose-600 border border-slate-100 bg-transparent px-1 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wider animate-pulse">Retard</span>
                        )}
                      </div>
                    </div>
                  ) : price > 0 ? (
                    <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-sm text-emerald-700 gap-2 font-semibold text-xs flex items-center justify-center">
                      <CheckCircle2 size={14} /> Solde entièrement recouvré !
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-sm text-slate-400 italic text-center text-xs">
                      En attente du plan de financement...
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={() => setSelectedProjectId(p.id)}
                  className="w-full flex items-center justify-between text-slate-900 hover:bg-slate-50 -mx-4 -mb-4 px-4 py-3 font-semibold text-sm border-t border-slate-100 group/btn transition-colors"
                >
                  <span className="text-slate-400 text-xs font-normal">
                    {new Date(p.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                  <span className="flex items-center gap-1 group-hover/btn:translate-x-1 transition-transform">
                    Ouvrir le dossier <ChevronRight size={18} />
                  </span>
                </button>
              </div>
            );
          })
        )}
        </div>
      </div>
      )}

      {activeDashboardTab === 'FINANCES' && (
      <div className="flex flex-col gap-8 animate-in fade-in duration-300">
        <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-4 rounded-sm border border-slate-200">
          <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
            <span className="text-sm font-semibold text-slate-800 uppercase tracking-widest pl-2 whitespace-nowrap">Periode d'analyse:</span>
            <div className="flex bg-slate-100 p-1 rounded-sm w-full sm:w-auto overflow-x-auto whitespace-nowrap">
               <button onClick={() => setTimeFilter('DAY')} className={`px-4 py-1.5 text-xs font-semibold rounded-sm transition-all shrink-0 ${timeFilter === 'DAY' ? 'bg-white shadow-none text-indigo-600' : 'text-slate-500'}`}>Aujourd'hui</button>
               <button onClick={() => setTimeFilter('WEEK')} className={`px-4 py-1.5 text-xs font-semibold rounded-sm transition-all shrink-0 ${timeFilter === 'WEEK' ? 'bg-white shadow-none text-indigo-600' : 'text-slate-500'}`}>Semaine</button>
               <button onClick={() => setTimeFilter('MONTH')} className={`px-4 py-1.5 text-xs font-semibold rounded-sm transition-all shrink-0 ${timeFilter === 'MONTH' ? 'bg-white shadow-none text-indigo-600' : 'text-slate-500'}`}>Mois</button>
               <button onClick={() => setTimeFilter('QUARTER')} className={`px-4 py-1.5 text-xs font-semibold rounded-sm transition-all shrink-0 ${timeFilter === 'QUARTER' ? 'bg-white shadow-none text-indigo-600' : 'text-slate-500'}`}>Trimestre</button>
               <button onClick={() => setTimeFilter('SEMESTER')} className={`px-4 py-1.5 text-xs font-semibold rounded-sm transition-all shrink-0 ${timeFilter === 'SEMESTER' ? 'bg-white shadow-none text-indigo-600' : 'text-slate-500'}`}>Semestre</button>
               <button onClick={() => setTimeFilter('YEAR')} className={`px-4 py-1.5 text-xs font-semibold rounded-sm transition-all shrink-0 ${timeFilter === 'YEAR' ? 'bg-white shadow-none text-indigo-600' : 'text-slate-500'}`}>Année</button>
               <button onClick={() => setTimeFilter('ALL')} className={`px-4 py-1.5 text-xs font-semibold rounded-sm transition-all shrink-0 ${timeFilter === 'ALL' ? 'bg-white shadow-none text-indigo-600' : 'text-slate-500'}`}>Global</button>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 pr-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-500 whitespace-nowrap">Objectif Clients:</span>
              <input 
                type="number" 
                value={localClientTarget} 
                onChange={e => setLocalClientTarget(e.target.value)}
                onBlur={handleSaveTargets}
                onKeyDown={e => e.key === 'Enter' && handleSaveTargets()}
                className="bg-slate-50 border border-slate-200 rounded-sm px-3 py-1.5 w-20 font-mono text-sm focus:outline-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-500 whitespace-nowrap">Montant par Client:</span>
              <input 
                type="number" 
                value={localTargetAmount} 
                onChange={e => setLocalTargetAmount(e.target.value)}
                onBlur={handleSaveTargets}
                onKeyDown={e => e.key === 'Enter' && handleSaveTargets()}
                className="bg-slate-50 border border-slate-200 rounded-sm px-3 py-1.5 w-32 font-mono text-sm focus:outline-indigo-500"
              />
              <span className="text-xs font-semibold text-slate-400">GNF</span>
            </div>
            <button 
              onClick={handleSaveTargets}
              className="bg-slate-100 hover:bg-indigo-50 text-indigo-600 border border-slate-200 hover:border-indigo-200 rounded-sm px-3 py-1.5 text-xs font-semibold transition-colors shrink-0"
            >
              Valider
            </button>
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-sm px-3 py-1.5 shrink-0">
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider whitespace-nowrap">Total Visé:</span>
              <span className="font-mono font-semibold text-indigo-700 whitespace-nowrap">{revenueTarget.toLocaleString('fr-FR')} GNF</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white border border-slate-200 p-4 rounded-sm shadow-none flex flex-col justify-between group hover:border-emerald-300 transition-colors">
             <div className="flex items-center justify-between mb-4">
               <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Entrées (Revenus)</span>
               <div className="p-2 bg-emerald-50 text-emerald-600 rounded-sm"><TrendingUp size={20}/></div>
             </div>
             <div>
                <div className="text-xl font-mono font-semibold text-emerald-600 mb-2">{totalRevenue.toLocaleString('fr-FR')} <span className="text-sm text-emerald-600/50">GNF</span></div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-3">
                  <div className="h-full bg-emerald-500 transition-all" style={{width: `${revenueProgress}%`}}/>
                </div>
                <div className="text-[10px] font-semibold text-slate-400 mt-2 flex justify-between uppercase tracking-wider">
                  <span>Objectif C.A.</span>
                  <span>{revenueProgress.toFixed(1)}%</span>
                </div>
             </div>
          </div>
          
          <div className="bg-white p-4 rounded-sm border border-slate-200 shadow-none flex flex-col justify-between group hover:border-rose-300 transition-colors">
             <div className="flex items-center justify-between mb-4">
               <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sorties (Charges)</span>
               <div className="p-2 bg-rose-50 text-rose-600 rounded-sm"><Activity size={20}/></div>
             </div>
             <div className="text-xl font-mono font-semibold text-rose-600">{totalExpense.toLocaleString('fr-FR')} <span className="text-sm text-rose-600/50">GNF</span></div>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-sm shadow-none flex flex-col justify-between group hover:border-slate-400 transition-colors">
             <div className="flex items-center justify-between mb-4">
               <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Marge Nette</span>
               <div className="p-2 bg-slate-50 text-slate-600 rounded-sm"><BarChart3 size={20}/></div>
             </div>
             <div>
                <div className="text-xl font-mono font-semibold text-slate-900">{profit.toLocaleString('fr-FR')} <span className="text-sm text-slate-400">GNF</span></div>
             </div>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-sm shadow-none flex flex-col justify-between group hover:border-indigo-300 transition-colors">
             <div className="flex items-center justify-between mb-4">
               <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Objectif Clients</span>
               <div className="p-2 bg-indigo-50 text-indigo-600 rounded-sm"><Target size={20}/></div>
             </div>
             <div>
                <div className="text-xl font-mono font-semibold text-indigo-600 mb-2">{activeClientsCount} <span className="text-sm text-indigo-600/50">/ {clientTarget}</span></div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-3">
                  <div className="h-full bg-indigo-500 transition-all" style={{width: `${clientProgress}%`}}/>
                </div>
                <div className="text-[10px] font-semibold text-slate-400 mt-2 flex justify-between uppercase tracking-wider">
                  <span>Progression</span>
                  <span>{clientProgress.toFixed(1)}%</span>
                </div>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           {/* CHARGES FORM & LIST */}
           <div className="bg-white border border-slate-200 rounded-sm p-4 shadow-none flex flex-col gap-6 flex flex-col gap-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                 <div className="bg-rose-100 text-rose-600 p-2.5 rounded-sm"><Activity size={20} /></div>
                 <div>
                   <h2 className="text-lg font-semibold text-slate-900">Gestion des Charges</h2>
                   <p className="text-xs text-slate-500">Saisissez les dépenses opérationnelles de l'entreprise</p>
                 </div>
              </div>

              <form onSubmit={handleAddExpense} className="flex flex-col gap-3 bg-slate-50 p-4 rounded-sm border border-slate-100">
                 <div className="grid grid-cols-2 gap-3">
                   <div>
                     <label className="text-[10px] uppercase font-semibold text-slate-500 mb-1 block">Catégorie</label>
                     <select value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value as ExpenseCategory})} className="w-full bg-white border border-slate-200 rounded-sm p-2 text-sm focus:outline-rose-500">
                       <option value="SALAIRE">Masse Salariale</option>
                       <option value="LOYER">Loyer</option>
                       <option value="ELECTRICITE">Électricité & Eau</option>
                       <option value="INTERNET">Internet</option>
                       <option value="IMPOTS">Impôts & Taxes</option>
                       <option value="AUTRE">Autre Dépense</option>
                     </select>
                   </div>
                   <div>
                     <label className="text-[10px] uppercase font-semibold text-slate-500 mb-1 block">Montant (GNF)</label>
                     <input type="number" required value={newExpense.amount || ''} onChange={e => setNewExpense({...newExpense, amount: Number(e.target.value)})} className="w-full bg-white border border-slate-200 rounded-sm p-2 text-sm font-mono focus:outline-rose-500" placeholder="0" />
                   </div>
                 </div>
                 <div className="grid grid-cols-3 gap-3">
                   <div className="col-span-2">
                     <label className="text-[10px] uppercase font-semibold text-slate-500 mb-1 block">Titre de la Dépense / Bénéficiaire (ex: Salaire de Jean, Facture EDG...)</label>
                     <input type="text" required value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} className="w-full bg-white border border-slate-200 rounded-sm p-2 text-sm focus:outline-rose-500" placeholder="Ex: Salaire Développeur Frontend..." />
                   </div>
                   <div>
                     <label className="text-[10px] uppercase font-semibold text-slate-500 mb-1 block">Date</label>
                     <input type="date" required value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} className="w-full bg-white border border-slate-200 rounded-sm p-2 text-sm font-mono focus:outline-rose-500" />
                   </div>
                 </div>
                 <button type="submit" className="mt-2 w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-3 rounded-sm transition-colors flex items-center justify-center gap-2">
                   <Plus size={16} /> Ajouter la charge
                 </button>
              </form>

              <div className="flex-1 overflow-y-auto pr-2 space-y-2 max-h-72">
                 {filteredExpenses.length === 0 ? (
                   <p className="text-center text-slate-400 text-xs py-6">Aucune charge ajoutée pour cette période.</p>
                 ) : filteredExpenses.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(e => (
                   <div key={e.id} className="flex items-center justify-between p-3 rounded-sm border border-slate-100 hover:bg-slate-50 group">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                           {e.category === 'SALAIRE' ? 'ð‘”' : e.category === 'LOYER' ? 'ð¢' : e.category === 'ELECTRICITE' ? 'â¡' : e.category === 'INTERNET' ? 'ð' : 'ð§¾'} 
                           {e.description}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium font-mono">{new Date(e.date).toLocaleDateString('fr-FR')} â€¢ {e.category}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-semibold text-rose-600 text-sm">-{e.amount.toLocaleString('fr-FR')}</span>
                        <button onClick={() => handleDeleteExpense(e.id)} className="text-slate-300 hover:text-rose-600 p-1 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                      </div>
                   </div>
                 ))}
              </div>
           </div>

           {/* REVENUS LIST (Read Only) */}
           <div className="bg-white border border-slate-200 rounded-sm p-4 shadow-none flex flex-col gap-6 flex flex-col gap-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                 <div className="bg-emerald-100 text-emerald-600 p-2.5 rounded-sm"><TrendingUp size={20} /></div>
                 <div>
                   <h2 className="text-lg font-semibold text-slate-900">Entrées & Encaissements</h2>
                   <p className="text-xs text-slate-500">Historique des tranches clients réglées</p>
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-2 max-h-[460px]">
                 {filteredRevenues.length === 0 ? (
                   <p className="text-center text-slate-400 text-xs py-6">Aucun encaissement sur cette période.</p>
                 ) : filteredRevenues.map(r => (
                   <div key={r.id} className="flex items-center justify-between p-3 rounded-sm border border-slate-100 bg-slate-50 hover:bg-emerald-50/30 transition-colors">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-800">{r.projectName}</span>
                        <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1.5"><Calendar size={10} /> {r.date.toLocaleDateString('fr-FR')}</span>
                      </div>
                      <span className="font-mono font-semibold text-emerald-600 text-sm">+{r.amount.toLocaleString('fr-FR')}</span>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
      )}
    </div>
  );
}

