import React, { useState } from 'react';
import { useApp } from '../store';
import { Users, FileText, Calendar, Plus, Calculator, Settings, Building, FileSignature, CheckCircle, Clock } from 'lucide-react';
import { Employee, Contract, LeaveRequest, Payslip } from '../types';

export default function RhView() {
  const { employees, contracts, leaveRequests, payslips, companyConfig, addEmployee, addLeaveRequest, addPayslip, addContract, updateLeaveRequestStatus, updatePayslipStatus, treasuryAccounts, registerSalaryAdvance } = useApp();
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'EMPLOYEE', 'CONTRACT', 'LEAVE', 'PAYSLIP'

  const cnssRateTotal = (companyConfig.rhCnssEmployerRate || 13) + (companyConfig.rhCnssEmployeeRate || 5);

  const calculatePayslip = (baseSalary: number) => {
    const employeeCnss = baseSalary * ((companyConfig.rhCnssEmployeeRate || 5) / 100);
    const employerCnss = baseSalary * ((companyConfig.rhCnssEmployerRate || 13) / 100);
    const baseRts = baseSalary - (baseSalary * ((companyConfig.rhRtsAbattement || 20) / 100));
    
    // Simplification RTS: 10% on the abated base for illustration (should be progressive)
    const rtsAmount = baseRts * 0.10; 
    
    const netSalary = baseSalary - employeeCnss - rtsAmount;
    
    return { employeeCnss, employerCnss, rtsAmount, netSalary };
  };

  const handleCreateEmployee = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const emp = {
      firstName: fd.get('firstName') as string,
      lastName: fd.get('lastName') as string,
      email: fd.get('email') as string,
      phone: fd.get('phone') as string,
      cnssNumber: fd.get('cnssNumber') as string,
      position: fd.get('position') as string,
      department: fd.get('department') as string,
      baseSalary: Number(fd.get('baseSalary')),
    };
    addEmployee(emp);
    setShowAddModal(false);
  };

  const handleCreateContract = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const ctr = {
      employeeId: fd.get('employeeId') as string,
      type: fd.get('type') as any,
      startDate: fd.get('startDate') as string,
      endDate: fd.get('endDate') as string,
    };
    addContract(ctr);
    setShowAddModal(false);
  };

  const handleCreateLeave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const sd = new Date(fd.get('startDate') as string);
    const ed = new Date(fd.get('endDate') as string);
    const days = Math.ceil((ed.getTime() - sd.getTime()) / (1000 * 3600 * 24));
    
    const lr = {
      employeeId: fd.get('employeeId') as string,
      startDate: fd.get('startDate') as string,
      endDate: fd.get('endDate') as string,
      reason: fd.get('reason') as string,
      daysCount: days > 0 ? days : 1
    };
    addLeaveRequest(lr);
    setShowAddModal(false);
  };

  const handleCreatePayslip = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const empId = fd.get('employeeId') as string;
    const emp = employees.find(x => x.id === empId);
    if (!emp) return;

    const base = emp.baseSalary;
    const calc = calculatePayslip(base);
    
    const ps = {
      employeeId: empId,
      month: Number(fd.get('month')),
      year: new Date().getFullYear(),
      baseSalary: base,
      bonuses: 0,
      grossSalary: base,
      cnssEmployeeAmount: calc.employeeCnss,
      cnssEmployerAmount: calc.employerCnss,
      rtsAmount: calc.rtsAmount,
      netSalary: calc.netSalary
    };
    addPayslip(ps);
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Espace Ressources Humaines</h1>
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-sm shadow-inner border border-slate-200">
          {[
            { id: 'DASHBOARD', label: 'Tableau de Bord', icon: Building },
            { id: 'EMPLOYEES', label: 'Employés', icon: Users },
            { id: 'CONTRACTS', label: 'Contrats', icon: FileSignature },
            { id: 'LEAVES', label: 'Congés', icon: Calendar },
            { id: 'PAYROLL', label: 'Paie (Guinée)', icon: Calculator },
            { id: 'DECLARATIONS', label: 'Déclarations', icon: FileText }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)} 
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-sm transition-colors ${activeTab === tab.id ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/50' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-sm border border-slate-200 min-h-[500px]">
        {/* --- DASHBOARD --- */}
        {activeTab === 'DASHBOARD' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-800">Aperçu RH</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-sm">
                <p className="text-sm text-indigo-600 font-medium">Effectif Actif</p>
                <p className="text-3xl font-bold text-indigo-900 mt-1">{employees.length}</p>
              </div>
              <div className="p-4 bg-green-50 border border-green-100 rounded-sm">
                <p className="text-sm text-green-600 font-medium">Contrats en cours</p>
                <p className="text-3xl font-bold text-green-900 mt-1">{contracts.filter(c => c.status === 'ACTIVE').length}</p>
              </div>
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-sm">
                <p className="text-sm text-amber-600 font-medium">Demandes de congés</p>
                <p className="text-3xl font-bold text-amber-900 mt-1">{leaveRequests.filter(l => l.status === 'PENDING').length}</p>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-sm">
                <p className="text-sm text-slate-600 font-medium">Masse Salariale Brute</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {employees.reduce((acc, e) => acc + (e.baseSalary || 0), 0).toLocaleString()} GNF
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-6 mt-8">
              <div className="border border-slate-200 rounded-sm p-4">
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><Clock size={18}/> Fins de contrats approchantes (CDD)</h3>
                {contracts.filter(c => c.type === 'CDD').length === 0 ? (
                  <p className="text-slate-500 text-sm">Aucun CDD en cours.</p>
                ) : (
                  <ul className="space-y-2">
                    {contracts.filter(c => c.type === 'CDD').map(c => {
                      const emp = employees.find(e => e.id === c.employeeId);
                      return (
                        <li key={c.id} className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded-sm">
                          <span>{emp?.firstName} {emp?.lastName}</span>
                          <span className="text-amber-600 font-medium">{c.endDate}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <div className="border border-slate-200 rounded-sm p-4">
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><Settings size={18}/> Paramètres Paie (Guinée)</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex justify-between border-b border-slate-100 pb-2"><span>SMIG Appliqué:</span> <strong>{(companyConfig.rhSmig || 440000).toLocaleString()} GNF</strong></li>
                  <li className="flex justify-between border-b border-slate-100 pb-2"><span>Taux CNSS Employé:</span> <strong>{companyConfig.rhCnssEmployeeRate || 5}%</strong></li>
                  <li className="flex justify-between border-b border-slate-100 pb-2"><span>Taux CNSS Employeur:</span> <strong>{companyConfig.rhCnssEmployerRate || 13}%</strong></li>
                  <li className="flex justify-between border-b border-slate-100 pb-2"><span>Abattement RTS:</span> <strong>{companyConfig.rhRtsAbattement || 20}%</strong></li>
                </ul>
                <p className="text-xs text-slate-500 mt-4">* Modifiables par le Gérant dans Configuration.</p>
              </div>
            </div>
          </div>
        )}

        {/* --- EMPLOYEES --- */}
        {activeTab === 'EMPLOYEES' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-800">Dossiers du Personnel</h2>
              <button onClick={() => {setModalType('EMPLOYEE'); setShowAddModal(true)}} className="bg-indigo-600 text-white px-4 py-2 rounded-sm flex items-center gap-2 text-sm hover:bg-indigo-700">
                <Plus size={16} /> Nouvel Employé
              </button>
            </div>
            
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                <tr>
                  <th className="py-3 px-4">Employé</th>
                  <th className="py-3 px-4">Poste</th>
                  <th className="py-3 px-4">N° CNSS</th>
                  <th className="py-3 px-4">Embauche</th>
                  <th className="py-3 px-4 text-right">Salaire Brut (GNF)</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{e.firstName} {e.lastName}</div>
                      <div className="text-xs text-slate-500">{e.email}</div>
                    </td>
                    <td className="py-3 px-4">{e.position} <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full ml-1">{e.department}</span></td>
                    <td className="py-3 px-4">{e.cnssNumber || 'Non renseigné'}</td>
                    <td className="py-3 px-4">{new Date(e.hireDate).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-right font-medium">{e.baseSalary?.toLocaleString()}</td>
                    <td className="py-3 px-4 text-center">
                      <button 
                        onClick={() => {
                          const amount = window.prompt(`Montant de l'avance sur salaire pour ${e.firstName} ${e.lastName} (en GNF) :`);
                          if (amount && !isNaN(Number(amount))) {
                            registerSalaryAdvance(e.id, Number(amount));
                            alert('Demande envoyée à la comptabilité.');
                          }
                        }}
                        className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-sm hover:bg-indigo-100 font-medium"
                      >
                        Avance sur salaire
                      </button>
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-slate-500">Aucun employé enregistré.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* --- PAYROLL --- */}
        {activeTab === 'PAYROLL' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-800">Édition des Bulletins de Paie</h2>
              <button onClick={() => {setModalType('PAYSLIP'); setShowAddModal(true)}} className="bg-emerald-600 text-white px-4 py-2 rounded-sm flex items-center gap-2 text-sm hover:bg-emerald-700">
                <Calculator size={16} /> Générer un bulletin
              </button>
            </div>
            
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                <tr>
                  <th className="py-3 px-4">Mois/Année</th>
                  <th className="py-3 px-4">Employé</th>
                  <th className="py-3 px-4 text-right">Brut (GNF)</th>
                  <th className="py-3 px-4 text-right">RTS</th>
                  <th className="py-3 px-4 text-right">CNSS (-{companyConfig.rhCnssEmployeeRate || 5}%)</th>
                  <th className="py-3 px-4 text-right text-emerald-700">Net à payer</th>
                  <th className="py-3 px-4 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payslips.map(p => {
                  const emp = employees.find(e => e.id === p.employeeId);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-medium">{p.month}/{p.year}</td>
                      <td className="py-3 px-4">{emp?.firstName} {emp?.lastName}</td>
                      <td className="py-3 px-4 text-right">{p.grossSalary?.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-amber-600">-{p.rtsAmount?.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-amber-600">-{p.cnssEmployeeAmount?.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-700">{p.netSalary?.toLocaleString()}</td>
                      <td className="py-3 px-4 text-center">
                        {p.status === 'PAID' ? (
                          <span className="px-2 py-1 rounded-sm text-xs bg-emerald-100 text-emerald-700">PAYÉ</span>
                        ) : (
                          <button onClick={() => {
                            if (treasuryAccounts.length === 0) {
                              alert("Veuillez d'abord créer un compte de trésorerie (Banque/Caisse) dans l'espace Comptabilité.");
                              return;
                            }
                            updatePayslipStatus(p.id, 'PAID', treasuryAccounts[0]?.id)
                          }} className="text-xs bg-emerald-50 text-emerald-600 px-2 py-1 rounded-sm hover:bg-emerald-100 font-medium">
                            Marquer Payé
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {payslips.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-slate-500">Aucun bulletin généré.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        
        {/* --- CONTRACTS --- */}
        {activeTab === 'CONTRACTS' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-800">Gestion des Contrats</h2>
              <button onClick={() => {setModalType('CONTRACT'); setShowAddModal(true)}} className="bg-indigo-600 text-white px-4 py-2 rounded-sm flex items-center gap-2 text-sm hover:bg-indigo-700">
                <Plus size={16} /> Nouveau Contrat
              </button>
            </div>
            
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                <tr>
                  <th className="py-3 px-4">Employé</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Date début</th>
                  <th className="py-3 px-4">Date fin (CDD)</th>
                  <th className="py-3 px-4 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contracts.map(c => {
                  const emp = employees.find(e => e.id === c.employeeId);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-medium">{emp?.firstName} {emp?.lastName}</td>
                      <td className="py-3 px-4"><span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-sm text-xs font-semibold">{c.type}</span></td>
                      <td className="py-3 px-4">{new Date(c.startDate).toLocaleDateString()}</td>
                      <td className="py-3 px-4">{c.endDate ? new Date(c.endDate).toLocaleDateString() : '-'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded-sm text-xs ${c.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{c.status}</span>
                      </td>
                    </tr>
                  )
                })}
                {contracts.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-slate-500">Aucun contrat enregistré.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* --- LEAVES --- */}
        {activeTab === 'LEAVES' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-800">Congés & Absences</h2>
              <button onClick={() => {setModalType('LEAVE'); setShowAddModal(true)}} className="bg-indigo-600 text-white px-4 py-2 rounded-sm flex items-center gap-2 text-sm hover:bg-indigo-700">
                <Calendar size={16} /> Saisir un congé
              </button>
            </div>
            
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                <tr>
                  <th className="py-3 px-4">Employé</th>
                  <th className="py-3 px-4">Période</th>
                  <th className="py-3 px-4">Jours</th>
                  <th className="py-3 px-4">Motif</th>
                  <th className="py-3 px-4 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaveRequests.map(l => {
                  const emp = employees.find(e => e.id === l.employeeId);
                  return (
                    <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-medium">{emp?.firstName} {emp?.lastName}</td>
                      <td className="py-3 px-4">{new Date(l.startDate).toLocaleDateString()} au {new Date(l.endDate).toLocaleDateString()}</td>
                      <td className="py-3 px-4">{l.daysCount} j</td>
                      <td className="py-3 px-4 text-slate-500 truncate max-w-[200px]">{l.reason}</td>
                      <td className="py-3 px-4 text-center">
                        {l.status === 'PENDING' ? (
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => updateLeaveRequestStatus(l.id, 'APPROVED')} className="text-xs bg-emerald-50 text-emerald-600 px-2 py-1 rounded-sm hover:bg-emerald-100 font-medium">Accepter</button>
                            <button onClick={() => {
                              const reason = window.prompt("Motif du refus :");
                              if (reason !== null) {
                                updateLeaveRequestStatus(l.id, 'REJECTED', reason);
                              }
                            }} className="text-xs bg-rose-50 text-rose-600 px-2 py-1 rounded-sm hover:bg-rose-100 font-medium">Refuser</button>
                          </div>
                        ) : l.status === 'REJECTED' ? (
                          <div className="flex flex-col items-center group relative cursor-help">
                            <span className="px-2 py-1 rounded-sm text-xs bg-rose-100 text-rose-700">REFUSÉ</span>
                            {l.rejectionReason && (
                              <div className="hidden group-hover:block absolute bottom-full mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded shadow-lg z-10">
                                {l.rejectionReason}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className={`px-2 py-1 rounded-sm text-xs ${l.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{l.status}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {leaveRequests.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-slate-500">Aucune demande de congé.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* --- DECLARATIONS --- */}
        {activeTab === 'DECLARATIONS' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-800">Déclarations (CNSS & Impôts)</h2>
            </div>
            
            <div className="bg-slate-50 border border-slate-200 rounded-sm p-6 text-center">
              <FileText size={48} className="mx-auto text-slate-400 mb-4" />
              <h3 className="font-semibold text-slate-800 text-lg mb-2">Tableau de Bord des Déclarations</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                Retrouvez ici le récapitulatif mensuel et trimestriel pour vos télé-déclarations eCNSS et vos versements RTS aux impôts.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                <div className="bg-white p-4 border border-slate-200 rounded-sm">
                  <p className="text-xs font-semibold uppercase text-slate-500 mb-1">Masse Salariale Brute (Mois en cours)</p>
                  <p className="text-2xl font-bold text-slate-800">
                    {payslips.filter(p => p.month === new Date().getMonth() + 1).reduce((acc, p) => acc + (p.grossSalary || 0), 0).toLocaleString()} GNF
                  </p>
                </div>
                <div className="bg-white p-4 border border-slate-200 rounded-sm">
                  <p className="text-xs font-semibold uppercase text-slate-500 mb-1">Total CNSS (Sal.+Patronal)</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {payslips.filter(p => p.month === new Date().getMonth() + 1).reduce((acc, p) => acc + (p.cnssEmployeeAmount || 0) + (p.cnssEmployerAmount || 0), 0).toLocaleString()} GNF
                  </p>
                </div>
                <div className="bg-white p-4 border border-slate-200 rounded-sm">
                  <p className="text-xs font-semibold uppercase text-slate-500 mb-1">Total RTS à reverser</p>
                  <p className="text-2xl font-bold text-rose-600">
                    {payslips.filter(p => p.month === new Date().getMonth() + 1).reduce((acc, p) => acc + (p.rtsAmount || 0), 0).toLocaleString()} GNF
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* MODALS */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-sm w-full max-w-xl shadow-xl overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50">
              <h2 className="font-bold text-slate-800">
                {modalType === 'EMPLOYEE' && 'Nouvel Employé'}
                {modalType === 'PAYSLIP' && 'Générer un Bulletin de Paie'}
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            <div className="p-6">
              
              {modalType === 'EMPLOYEE' && (
                <form onSubmit={handleCreateEmployee} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Prénom</label>
                      <input name="firstName" required className="w-full border border-slate-300 rounded-sm p-2 text-sm outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Nom</label>
                      <input name="lastName" required className="w-full border border-slate-300 rounded-sm p-2 text-sm outline-none focus:border-indigo-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                      <input name="email" type="email" required className="w-full border border-slate-300 rounded-sm p-2 text-sm outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Téléphone</label>
                      <input name="phone" required className="w-full border border-slate-300 rounded-sm p-2 text-sm outline-none focus:border-indigo-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Poste</label>
                      <input name="position" required className="w-full border border-slate-300 rounded-sm p-2 text-sm outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Département</label>
                      <input name="department" required className="w-full border border-slate-300 rounded-sm p-2 text-sm outline-none focus:border-indigo-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">N° CNSS</label>
                      <input name="cnssNumber" className="w-full border border-slate-300 rounded-sm p-2 text-sm outline-none focus:border-indigo-500" placeholder="Optionnel si non immatriculé" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Salaire Brut de base (GNF)</label>
                      <input name="baseSalary" type="number" required className="w-full border border-slate-300 rounded-sm p-2 text-sm outline-none focus:border-indigo-500" />
                    </div>
                  </div>
                  <div className="pt-4 flex justify-end">
                    <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-sm text-sm font-medium hover:bg-indigo-700">Enregistrer</button>
                  </div>
                </form>
              )}

              {modalType === 'PAYSLIP' && (
                <form onSubmit={handleCreatePayslip} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Employé</label>
                    <select name="employeeId" required className="w-full border border-slate-300 rounded-sm p-2 text-sm outline-none focus:border-indigo-500">
                      <option value="">Sélectionner un employé...</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName} - Brut: {e.baseSalary?.toLocaleString()} GNF</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Mois (1-12)</label>
                      <input name="month" type="number" min="1" max="12" defaultValue={new Date().getMonth() + 1} required className="w-full border border-slate-300 rounded-sm p-2 text-sm outline-none focus:border-indigo-500" />
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 p-4 border border-blue-100 rounded-sm mt-4">
                    <p className="text-xs text-blue-800 flex items-center gap-1 mb-2"><Calculator size={14}/> <strong>Note de calcul :</strong></p>
                    <ul className="text-xs text-blue-700 space-y-1 list-disc pl-4">
                      <li>La CNSS est calculée à {companyConfig.rhCnssEmployeeRate || 5}% (part salariale) et {companyConfig.rhCnssEmployerRate || 13}% (part patronale).</li>
                      <li>Le RTS est calculé après l'abattement forfaitaire de {companyConfig.rhRtsAbattement || 20}%.</li>
                    </ul>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-sm text-sm font-medium hover:bg-emerald-700">Générer le bulletin</button>
                  </div>
                </form>
              )}

              {modalType === 'CONTRACT' && (
                <form onSubmit={handleCreateContract} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Employé</label>
                    <select name="employeeId" required className="w-full border border-slate-300 rounded-sm p-2 text-sm outline-none focus:border-indigo-500">
                      <option value="">Sélectionner un employé...</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Type de Contrat</label>
                      <select name="type" required className="w-full border border-slate-300 rounded-sm p-2 text-sm outline-none focus:border-indigo-500">
                        <option value="CDI">CDI</option>
                        <option value="CDD">CDD</option>
                        <option value="STAGE">STAGE</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Date de début</label>
                      <input name="startDate" type="date" required className="w-full border border-slate-300 rounded-sm p-2 text-sm outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Date de fin (Si CDD/Stage)</label>
                      <input name="endDate" type="date" className="w-full border border-slate-300 rounded-sm p-2 text-sm outline-none focus:border-indigo-500" />
                    </div>
                  </div>
                  <div className="pt-4 flex justify-end">
                    <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-sm text-sm font-medium hover:bg-indigo-700">Créer le contrat</button>
                  </div>
                </form>
              )}

              {modalType === 'LEAVE' && (
                <form onSubmit={handleCreateLeave} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Employé</label>
                    <select name="employeeId" required className="w-full border border-slate-300 rounded-sm p-2 text-sm outline-none focus:border-indigo-500">
                      <option value="">Sélectionner un employé...</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Date de début</label>
                      <input name="startDate" type="date" required className="w-full border border-slate-300 rounded-sm p-2 text-sm outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Date de fin</label>
                      <input name="endDate" type="date" required className="w-full border border-slate-300 rounded-sm p-2 text-sm outline-none focus:border-indigo-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Motif</label>
                    <textarea name="reason" required rows={3} className="w-full border border-slate-300 rounded-sm p-2 text-sm outline-none focus:border-indigo-500" placeholder="Raison du congé..."></textarea>
                  </div>
                  <div className="pt-4 flex justify-end">
                    <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-sm text-sm font-medium hover:bg-indigo-700">Soumettre</button>
                  </div>
                </form>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
