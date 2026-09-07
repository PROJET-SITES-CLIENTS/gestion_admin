import React, { useState } from 'react';
import { useApp } from '../store';
import { ShieldAlert, FileSignature, Stethoscope, Scale, Plus, X, Save } from 'lucide-react';

export const RhAdmin: React.FC = () => {
  const { contracts, employees, addContract, currentRole } = useApp();
  const [activeTab, setActiveTab] = useState<'CONTRACTS' | 'MEDICAL' | 'DISCIPLINARY'>('CONTRACTS');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleCreateContract = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const type = fd.get('type') as string;
    const endDate = fd.get('endDate') as string;
    // Garde : CDD et STAGIAIRE exigent une date de fin
    if (['CDD', 'STAGIAIRE', 'APPRENTI'].includes(type) && !endDate) {
      alert(`Un contrat ${type} exige une date de fin.`);
      return;
    }
    const ctr = {
      employeeId: fd.get('employeeId') as string,
      type: type as any,
      startDate: fd.get('startDate') as string,
      endDate: endDate,
      probationEndDate: fd.get('probationEndDate') as string,
      status: 'ACTIVE'
    };
    addContract(ctr);
    setShowAddForm(false);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-sm min-h-[500px]">
      <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Admin & Conformité Légale</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('CONTRACTS')}
            className={`px-4 py-1.5 text-sm font-medium rounded-sm ${activeTab === 'CONTRACTS' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Contrats
          </button>
          <button 
            onClick={() => setActiveTab('MEDICAL')}
            className={`px-4 py-1.5 text-sm font-medium rounded-sm ${activeTab === 'MEDICAL' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Visites Médicales
          </button>
          <button 
            onClick={() => setActiveTab('DISCIPLINARY')}
            className={`px-4 py-1.5 text-sm font-medium rounded-sm ${activeTab === 'DISCIPLINARY' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Disciplinaire
          </button>
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'CONTRACTS' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center gap-4">
              <div className="flex items-center gap-3 bg-blue-50 text-blue-800 p-4 rounded-sm border border-blue-100 flex-1">
                <ShieldAlert size={20} className="shrink-0"/>
                <p className="text-sm">Ce registre assure le suivi légal des contrats, des périodes d'essai et l'archivage sécurisé obligatoire.</p>
              </div>
              {(currentRole === 'GERANT' || currentRole === 'RH') && (
                <button 
                  onClick={() => setShowAddForm(true)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-sm text-sm font-medium hover:bg-indigo-700 flex items-center gap-2 whitespace-nowrap"
                >
                  <Plus size={16}/> Nouveau Contrat
                </button>
              )}
            </div>
            
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Employé</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Début</th>
                  <th className="py-3 px-4">Fin prévue</th>
                  <th className="py-3 px-4">Fin Période d'essai</th>
                  <th className="py-3 px-4">Statut</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map(c => {
                  const emp = employees.find(e => e.id === c.employeeId);
                  return (
                  <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-slate-800">{emp ? `${emp.firstName} ${emp.lastName}` : 'Inconnu'}</td>
                    <td className="py-3 px-4 text-slate-600 font-semibold">{c.type}</td>
                    <td className="py-3 px-4 text-slate-600">{new Date(c.startDate).toLocaleDateString('fr-FR')}</td>
                    <td className="py-3 px-4 text-slate-600">{c.endDate ? new Date(c.endDate).toLocaleDateString('fr-FR') : '-'}</td>
                    <td className="py-3 px-4 text-slate-600">{c.probationEndDate ? new Date(c.probationEndDate).toLocaleDateString('fr-FR') : '-'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-sm text-xs font-semibold ${
                        c.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                        c.status === 'EXPIRED' ? 'bg-rose-100 text-rose-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                  )
                })}
                {contracts.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-slate-500">Aucun contrat enregistré.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'MEDICAL' && (
          <div className="text-center py-16 space-y-4">
            <Stethoscope size={48} className="mx-auto text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-800">Suivi Médical Obligatoire</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              Gardez une trace des visites médicales d'embauche, périodiques et de reprise. Configurez des alertes pour les prochains rendez-vous.
            </p>
          </div>
        )}

        {activeTab === 'DISCIPLINARY' && (
          <div className="text-center py-16 space-y-4">
            <Scale size={48} className="mx-auto text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-800">Gestion Disciplinaire & Contentieux</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              Historisez les avertissements, mises à pied, et gérez la documentation légale associée aux litiges prud'homaux de manière confidentielle.
            </p>
          </div>
        )}
      </div>

      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowAddForm(false)} />
          <div className="relative bg-white rounded-sm shadow-xl w-full max-w-md">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-900">Nouveau Contrat</h2>
              <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-700"><X size={20}/></button>
            </div>
            <form onSubmit={handleCreateContract} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Employé *</label>
                <select name="employeeId" required className="w-full border p-2 rounded-sm">
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Type de Contrat *</label>
                <select name="type" required className="w-full border p-2 rounded-sm">
                  <option value="CDI">CDI</option>
                  <option value="CDD">CDD</option>
                  <option value="STAGIAIRE">Stage</option>
                  <option value="FREELANCE">Freelance / Consultant</option>
                  <option value="APPRENTI">Alternance</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Date de début *</label>
                  <input name="startDate" type="date" required className="w-full border p-2 rounded-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Date de fin</label>
                  <input name="endDate" type="date" className="w-full border p-2 rounded-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Fin Période d'essai</label>
                <input name="probationEndDate" type="date" className="w-full border p-2 rounded-sm" />
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-sm">Annuler</button>
                <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-sm font-semibold flex items-center gap-2 hover:bg-indigo-700">
                  <Save size={16}/> Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
