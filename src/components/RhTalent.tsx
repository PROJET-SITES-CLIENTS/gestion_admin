import React, { useState } from 'react';
import { Target, Award, BrainCircuit } from 'lucide-react';

export const RhTalent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'PERFORMANCE' | 'TRAINING'>('PERFORMANCE');

  return (
    <div className="bg-white border border-slate-200 rounded-sm min-h-[500px]">
      <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Talents & Développement</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('PERFORMANCE')}
            className={`px-4 py-1.5 text-sm font-medium rounded-sm ${activeTab === 'PERFORMANCE' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Évaluations & OKRs
          </button>
          <button 
            onClick={() => setActiveTab('TRAINING')}
            className={`px-4 py-1.5 text-sm font-medium rounded-sm ${activeTab === 'TRAINING' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Formations & Compétences
          </button>
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'PERFORMANCE' && (
          <div className="text-center py-16 space-y-4">
            <Target size={48} className="mx-auto text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-800">Évaluation de la performance</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              Planifiez les entretiens annuels, fixez les OKR/KPI individuels et suivez l'évolution de la carrière de chaque collaborateur.
            </p>
            <div className="pt-4 flex justify-center gap-4">
              <button className="bg-indigo-600 text-white px-6 py-2 rounded-sm font-medium hover:bg-indigo-700 shadow-sm">
                Programmer une évaluation
              </button>
            </div>
          </div>
        )}

        {activeTab === 'TRAINING' && (
          <div className="text-center py-16 space-y-4">
            <BrainCircuit size={48} className="mx-auto text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-800">Catalogue de Formation & Skills Matrix</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              Gérez les habilitations, suivez les formations obligatoires (Sécurité, RGPD) et visualisez la cartographie des compétences de l'entreprise.
            </p>
            <div className="pt-4 flex justify-center gap-4">
              <button className="bg-white border border-slate-300 text-slate-700 px-6 py-2 rounded-sm font-medium hover:bg-slate-50 shadow-sm flex items-center gap-2 mx-auto">
                <Award size={16}/> Voir la cartographie
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
