import React, { useMemo } from 'react';
import { useApp } from '../store';
import { BarChart3, TrendingUp, Users, Target, CheckCircle, Percent } from 'lucide-react';

export const CommercialReporting: React.FC = () => {
  const { currentRole, currentUser, prospects, proposals } = useApp();

  // Filter prospects based on role
  const relevantProspects = useMemo(() => {
    if (currentRole === 'COMMERCIAL') {
      return prospects.filter(p => p.ownerId === currentUser?.id);
    }
    return prospects;
  }, [prospects, currentRole, currentUser]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    let pipelineValue = 0;
    let wonValue = 0;
    let wonCount = 0;
    let totalCount = relevantProspects.length;

    relevantProspects.forEach(p => {
      const budget = parseInt((p.estimatedBudget || '0').replace(/[^0-9]/g, ''), 10) || 0;
      
      if (p.stage === 'GAGNE') {
        wonValue += budget;
        wonCount++;
      } else if (p.stage !== 'PERDU') {
        const prob = p.probability !== undefined && p.probability !== null ? p.probability : 50;
        pipelineValue += (budget * prob) / 100;
      }
    });

    const conversionRate = totalCount > 0 ? Math.round((wonCount / totalCount) * 100) : 0;
    
    // Simulate an objective for demonstration
    const MONTHLY_OBJECTIVE = currentRole === 'GERANT' ? 500000000 : 100000000; 
    const objectiveCompletion = Math.min(100, Math.round((wonValue / MONTHLY_OBJECTIVE) * 100));
    
    // Estimate commission (e.g., 5% of won)
    const estimatedCommission = wonValue * 0.05;

    return { pipelineValue, wonValue, wonCount, conversionRate, objectiveCompletion, estimatedCommission, MONTHLY_OBJECTIVE };
  }, [relevantProspects, currentRole]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 border border-slate-200 rounded-sm shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {currentRole === 'GERANT' ? 'Pilotage Commercial (Manager)' : 'Mes Performances'}
          </h2>
          <p className="text-sm text-slate-500">Vue consolidée des performances de vente en temps réel.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white p-5 rounded-sm border border-slate-200 shadow-sm transition-transform hover:-translate-y-1">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-sm font-medium text-slate-500">CA Pipeline (Pondéré)</h3>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-sm"><TrendingUp size={18} /></span>
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono">{kpis.pipelineValue.toLocaleString()} <span className="text-sm font-normal text-slate-500">GNF</span></p>
          <div className="w-full bg-slate-100 h-1.5 mt-3 rounded-full overflow-hidden">
            <div className="bg-blue-500 h-full w-full opacity-50"></div>
          </div>
        </div>
        
        {/* KPI 2 */}
        <div className="bg-white p-5 rounded-sm border border-slate-200 shadow-sm transition-transform hover:-translate-y-1">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-sm font-medium text-slate-500">CA Gagné (Réalisé)</h3>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-sm"><CheckCircle size={18} /></span>
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono">{kpis.wonValue.toLocaleString()} <span className="text-sm font-normal text-slate-500">GNF</span></p>
          <div className="w-full bg-slate-100 h-1.5 mt-3 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full w-full"></div>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-5 rounded-sm border border-slate-200 shadow-sm transition-transform hover:-translate-y-1">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-sm font-medium text-slate-500">Taux de Conversion</h3>
            <span className="p-2 bg-orange-50 text-orange-600 rounded-sm"><Percent size={18} /></span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{kpis.conversionRate}%</p>
          <div className="w-full bg-slate-100 h-1.5 mt-3 rounded-full overflow-hidden">
            <div className={`h-full transition-all ${kpis.conversionRate > 20 ? 'bg-emerald-500' : 'bg-orange-500'}`} style={{ width: `${Math.min(100, kpis.conversionRate)}%` }}></div>
          </div>
        </div>
        
        {/* KPI 4 */}
        <div className="bg-white p-5 rounded-sm border border-slate-200 shadow-sm transition-transform hover:-translate-y-1">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-sm font-medium text-slate-500">Objectif Mensuel</h3>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-sm"><Target size={18} /></span>
          </div>
          <div className="flex items-end gap-2">
            <p className="text-2xl font-bold text-indigo-600">{kpis.objectiveCompletion}%</p>
          </div>
          <div className="w-full bg-slate-100 h-1.5 mt-3 rounded-full overflow-hidden">
            <div className="bg-indigo-600 h-full transition-all" style={{ width: `${kpis.objectiveCompletion}%` }}></div>
          </div>
          <p className="text-xs text-slate-400 mt-2">Sur {kpis.MONTHLY_OBJECTIVE.toLocaleString()} GNF</p>
        </div>
      </div>

      {currentRole === 'COMMERCIAL' && (
        <div className="bg-emerald-900 rounded-sm p-6 text-white shadow-md flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2"><BarChart3 size={20}/> Projection des Commissions</h3>
            <p className="text-emerald-100/80 text-sm mt-1">Vos commissions potentielles estimées sur les affaires gagnées ce mois-ci (5%).</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold font-mono text-emerald-300">
              {kpis.estimatedCommission.toLocaleString()} <span className="text-lg">GNF</span>
            </div>
          </div>
        </div>
      )}
      
      {currentRole === 'GERANT' && (
        <div className="bg-slate-900 rounded-sm p-6 text-white shadow-md">
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4"><Users size={20}/> Classement de l'équipe</h3>
          <p className="text-slate-400 text-sm mb-4">Le tableau de bord détaillé de l'équipe sera disponible ici (Classement par CA, Taux de conversion individuel).</p>
          <div className="border border-slate-700 rounded-sm p-4 text-center text-slate-500 bg-slate-800/50 italic text-sm">
            Module Leaderboard en cours de construction.
          </div>
        </div>
      )}
    </div>
  );
};
