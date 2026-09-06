import React, { useMemo } from 'react';
import { useApp } from '../store';
import { Users, UserMinus, UserCheck, Banknote, CalendarCheck, Clock, Brain, Activity } from 'lucide-react';

export const RhDashboard: React.FC = () => {
  const { employees, contracts, leaveRequests, currentRole } = useApp();

  const kpis = useMemo(() => {
    const totalEmployees = employees.length;
    const activeEmployeesList = employees.filter(e => e.isActive);
    const activeEmployees = activeEmployeesList.length;
    const activeContracts = contracts.filter(c => c.status === 'ACTIVE').length;
    
    const grossPayroll = activeEmployeesList.reduce((acc, e) => acc + (e.baseSalary || 0), 0);
    const pendingLeaves = leaveRequests.filter(l => l.status === 'PENDING').length;
    
    const turnover = totalEmployees > 0 ? ((totalEmployees - activeEmployees) / totalEmployees * 100).toFixed(1) : '0';

    return { totalEmployees, activeEmployees, activeContracts, grossPayroll, pendingLeaves, turnover };
  }, [employees, contracts, leaveRequests]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 border border-slate-200 rounded-sm shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Tableau de Bord RH</h2>
          <p className="text-sm text-slate-500">Vue consolidée des ressources humaines.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* KPI: Effectif Total */}
        <div className="bg-white p-5 rounded-sm border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-sm font-medium text-slate-500">Effectif Actif</h3>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-sm"><Users size={18} /></span>
          </div>
          <p className="text-3xl font-bold text-slate-900">{kpis.activeEmployees} <span className="text-sm font-normal text-slate-500">/ {kpis.totalEmployees}</span></p>
        </div>

        {/* KPI: Turnover */}
        <div className="bg-white p-5 rounded-sm border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-sm font-medium text-slate-500">Turnover</h3>
            <span className="p-2 bg-rose-50 text-rose-600 rounded-sm"><UserMinus size={18} /></span>
          </div>
          <p className="text-3xl font-bold text-slate-900">{kpis.turnover}%</p>
        </div>

        {/* KPI: Masse Salariale */}
        <div className="bg-white p-5 rounded-sm border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-sm font-medium text-slate-500">Masse Salariale Mensuelle</h3>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-sm"><Banknote size={18} /></span>
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono">{kpis.grossPayroll.toLocaleString()} <span className="text-sm font-normal text-slate-500">GNF</span></p>
        </div>

        {/* KPI: Congés */}
        <div className="bg-white p-5 rounded-sm border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-sm font-medium text-slate-500">Demandes en attente</h3>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-sm"><CalendarCheck size={18} /></span>
          </div>
          <p className="text-3xl font-bold text-slate-900">{kpis.pendingLeaves}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-sm p-5">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><Clock size={18}/> Alertes & Échéances</h3>
          {/* Real alerts calculated from state */}
          <ul className="space-y-3">
            {contracts.filter(c => c.status === 'ACTIVE' && c.probationEndDate && new Date(c.probationEndDate).getTime() > Date.now() && new Date(c.probationEndDate).getTime() < Date.now() + 15 * 24 * 3600 * 1000).length > 0 && (
              <li className="flex items-center gap-3 p-3 bg-amber-50 text-amber-800 rounded-sm text-sm border border-amber-100">
                <Activity size={16}/> <strong>{contracts.filter(c => c.status === 'ACTIVE' && c.probationEndDate && new Date(c.probationEndDate).getTime() > Date.now() && new Date(c.probationEndDate).getTime() < Date.now() + 15 * 24 * 3600 * 1000).length} Période(s) d'essai</strong> arrive(nt) à échéance d'ici 15 jours.
              </li>
            )}
            {contracts.filter(c => c.status === 'ACTIVE' && c.endDate && new Date(c.endDate).getTime() > Date.now() && new Date(c.endDate).getTime() < Date.now() + 30 * 24 * 3600 * 1000).length > 0 && (
              <li className="flex items-center gap-3 p-3 bg-rose-50 text-rose-800 rounded-sm text-sm border border-rose-100">
                <Activity size={16}/> <strong>{contracts.filter(c => c.status === 'ACTIVE' && c.endDate && new Date(c.endDate).getTime() > Date.now() && new Date(c.endDate).getTime() < Date.now() + 30 * 24 * 3600 * 1000).length} Contrat(s) CDD/Stage</strong> arrive(nt) à expiration d'ici 30 jours.
              </li>
            )}
            {leaveRequests.filter(l => l.status === 'PENDING').length > 0 && (
              <li className="flex items-center gap-3 p-3 bg-blue-50 text-blue-800 rounded-sm text-sm border border-blue-100">
                <Activity size={16}/> <strong>{leaveRequests.filter(l => l.status === 'PENDING').length} Demande(s) de congé</strong> en attente de validation.
              </li>
            )}
            {/* Si aucune alerte */}
            {contracts.filter(c => c.status === 'ACTIVE' && c.probationEndDate && new Date(c.probationEndDate).getTime() > Date.now() && new Date(c.probationEndDate).getTime() < Date.now() + 15 * 24 * 3600 * 1000).length === 0 && 
             contracts.filter(c => c.status === 'ACTIVE' && c.endDate && new Date(c.endDate).getTime() > Date.now() && new Date(c.endDate).getTime() < Date.now() + 30 * 24 * 3600 * 1000).length === 0 && 
             leaveRequests.filter(l => l.status === 'PENDING').length === 0 && (
              <li className="text-slate-500 text-sm italic text-center py-4">Aucune alerte pour le moment.</li>
            )}
          </ul>
        </div>

        <div className="bg-white border border-slate-200 rounded-sm p-5">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><Brain size={18}/> Répartition par Département</h3>
          {/* Simulated breakdown */}
          <div className="space-y-4">
            {['Direction', 'Commercial', 'Comptabilité', 'Ressources Humaines', 'Technique'].map(dept => {
              const count = employees.filter(e => e.department === dept && e.isActive).length;
              const pct = kpis.activeEmployees > 0 ? Math.round((count / kpis.activeEmployees) * 100) : 0;
              return (
                <div key={dept}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">{dept}</span>
                    <span className="font-medium text-slate-900">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
