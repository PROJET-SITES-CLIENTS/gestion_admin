import React, { useState } from 'react';
import { useApp } from '../store';
import { Calculator, FileText, CheckCircle, Download, FileSignature, X, Save } from 'lucide-react';

export const RhPayroll: React.FC = () => {
  const { payslips, employees, companyConfig, treasuryAccounts, addPayslip, updatePayslipStatus, currentRole, btpPointages } = useApp();
  const [activeTab, setActiveTab] = useState<'PAYSLIPS' | 'EXPENSES'>('PAYSLIPS');
  const [showAddForm, setShowAddForm] = useState(false);
  const [formEmpId, setFormEmpId] = useState('');
  const [formMonth, setFormMonth] = useState(new Date().getMonth() + 1);
  const [paymentModal, setPaymentModal] = useState<{ isOpen: boolean; payslipId: string | null }>({ isOpen: false, payslipId: null });

  const calculatePayslip = (baseSalary: number) => {
    const employeeCnss = baseSalary * ((companyConfig.rhCnssEmployeeRate || 5) / 100);
    const employerCnss = baseSalary * ((companyConfig.rhCnssEmployerRate || 13) / 100);
    const baseRts = baseSalary - (baseSalary * ((companyConfig.rhRtsAbattement || 20) / 100));
    
    const rtsAmount = baseRts * ((companyConfig.rhRtsRate || 10) / 100); 
    
    const netSalary = baseSalary - employeeCnss - rtsAmount;
    
    return { employeeCnss, employerCnss, rtsAmount, netSalary };
  };

  const handleCreatePayslip = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const empId = fd.get('employeeId') as string;
    const emp = employees.find(x => x.id === empId);
    if (!emp) return;

    const overtimeAmount = Number(fd.get('overtimeAmount') || 0);
    const base = emp.baseSalary;
    const calc = calculatePayslip(base + overtimeAmount);

    const ps = {
      employeeId: empId,
      month: Number(fd.get('month')),
      year: new Date().getFullYear(),
      baseSalary: base,
      bonuses: 0,
      overtimeAmount,
      grossSalary: base + overtimeAmount,
      cnssEmployeeAmount: calc.employeeCnss,
      cnssEmployerAmount: calc.employerCnss,
      rtsAmount: calc.rtsAmount,
      netSalary: calc.netSalary,
      status: 'DRAFT'
    };
    addPayslip(ps);
    setShowAddForm(false);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-sm min-h-[500px]">
      <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Paie & Rémunération</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('PAYSLIPS')}
            className={`px-4 py-1.5 text-sm font-medium rounded-sm ${activeTab === 'PAYSLIPS' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Fiches de Paie
          </button>
          <button 
            onClick={() => setActiveTab('EXPENSES')}
            className={`px-4 py-1.5 text-sm font-medium rounded-sm ${activeTab === 'EXPENSES' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Notes de Frais
          </button>
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'PAYSLIPS' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-slate-50 p-4 border border-slate-200 rounded-sm mb-6">
              <p className="text-sm text-slate-600">Gérez les fiches de paie mensuelles de vos collaborateurs. Le calcul (SMIG, CNSS, RTS) est automatique selon la configuration.</p>
              {(currentRole === 'GERANT' || currentRole === 'RH') && (
                <button 
                  onClick={() => setShowAddForm(true)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-sm text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"
                >
                  <Calculator size={16}/> Générer Fiche de Paie
                </button>
              )}
            </div>

            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Période</th>
                  <th className="py-3 px-4">Employé</th>
                  <th className="py-3 px-4 text-right">Salaire Brut</th>
                  <th className="py-3 px-4 text-right">Prélèvement (CNSS+RTS)</th>
                  <th className="py-3 px-4 text-right">Salaire Net</th>
                  <th className="py-3 px-4 text-center">Statut</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payslips.map(ps => {
                  const emp = employees.find(e => e.id === ps.employeeId);
                  return (
                    <tr key={ps.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium text-slate-800">{ps.month}/{ps.year}</td>
                      <td className="py-3 px-4 text-slate-600">{emp?.firstName} {emp?.lastName}</td>
                      <td className="py-3 px-4 text-right font-mono">{ps.grossSalary.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-mono text-rose-600">
                        -{((ps.cnssEmployeeAmount || 0) + (ps.rtsAmount || 0)).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">{ps.netSalary.toLocaleString()}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded-sm text-xs font-semibold ${
                          ps.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                          ps.status === 'VALIDATED' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {ps.status === 'PAID' ? 'Payée' : ps.status === 'VALIDATED' ? 'Validée' : 'Brouillon'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {ps.status === 'DRAFT' && (currentRole === 'GERANT' || currentRole === 'RH') && (
                          <button onClick={() => updatePayslipStatus(ps.id, 'VALIDATED')} className="text-blue-600 hover:underline text-xs">Valider</button>
                        )}
                        {ps.status === 'VALIDATED' && currentRole === 'GERANT' && (
                          <button onClick={() => setPaymentModal({ isOpen: true, payslipId: ps.id })} className="text-emerald-600 hover:underline text-xs font-semibold">Marquer Payée</button>
                        )}
                        <button className="text-slate-500 hover:text-slate-800" title="Télécharger PDF">
                          <Download size={16}/>
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {payslips.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-slate-500">Aucune fiche de paie générée.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'EXPENSES' && (
          <div className="text-center py-16 space-y-4">
            <FileSignature size={48} className="mx-auto text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-800">Gestion des Notes de Frais</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              Ce module permet aux employés de soumettre leurs dépenses (déplacements, repas, fournitures) avec justificatifs pour remboursement.
            </p>
          </div>
        )}
      </div>

      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowAddForm(false)} />
          <div className="relative bg-white rounded-sm shadow-xl w-full max-w-md">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-900">Générer une Fiche de Paie</h2>
              <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-700"><X size={20}/></button>
            </div>
            <form onSubmit={handleCreatePayslip} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Employé *</label>
                <select 
                  name="employeeId" 
                  required 
                  className="w-full border p-2 rounded-sm"
                  value={formEmpId}
                  onChange={e => setFormEmpId(e.target.value)}
                >
                  <option value="">Sélectionnez un employé...</option>
                  {employees.filter(e => e.isActive).map(e => (
                    <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Mois *</label>
                  <select 
                    name="month" 
                    required 
                    className="w-full border p-2 rounded-sm"
                    value={formMonth}
                    onChange={e => setFormMonth(Number(e.target.value))}
                  >
                    {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                      <option key={m} value={m}>Mois {m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Montant Heures Sup / BTP (GNF)</label>
                  {(() => {
                    // Calcul Automatique BTP : si l'employé a pointé sur des chantiers ce mois-ci
                    const btpMonthPoints = (btpPointages || []).filter(p => {
                      if(p.employee_id !== formEmpId) return false;
                      const d = new Date(p.date);
                      return (d.getMonth() + 1) === formMonth && d.getFullYear() === new Date().getFullYear();
                    });
                    const btpHeures = btpMonthPoints.reduce((acc, p) => acc + (p.heures || 0), 0);
                    const suggestedBtpOvertime = formEmpId ? Math.round(btpHeures * 25000) : 0; // Estimation 25,000 GNF/h BTP

                    return (
                      <div>
                        <input name="overtimeAmount" type="number" defaultValue={suggestedBtpOvertime} className="w-full border p-2 rounded-sm font-mono" />
                        {btpHeures > 0 && (
                          <p className="text-[10px] text-indigo-600 mt-1 font-semibold flex items-center gap-1">
                            <CheckCircle size={10} /> 
                            {btpHeures}h importées depuis les chantiers BTP
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-sm">Annuler</button>
                <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-sm font-semibold flex items-center gap-2 hover:bg-indigo-700">
                  <Save size={16}/> Générer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {paymentModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setPaymentModal({ isOpen: false, payslipId: null })} />
          <div className="relative bg-white rounded-sm shadow-xl w-full max-w-sm">
            <div className="p-5 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">Paiement du Salaire</h2>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              if (paymentModal.payslipId) {
                updatePayslipStatus(paymentModal.payslipId, 'PAID', fd.get('accountId') as string);
                setPaymentModal({ isOpen: false, payslipId: null });
              }
            }} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Compte à débiter *</label>
                <select name="accountId" required className="w-full border p-2 rounded-sm">
                  {treasuryAccounts?.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} ({acc.type}) — Solde : {acc.balance.toLocaleString('fr-FR')} GNF</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setPaymentModal({ isOpen: false, payslipId: null })} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-sm">Annuler</button>
                <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-sm font-semibold hover:bg-emerald-700">
                  Confirmer le paiement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
