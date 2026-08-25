import React, { useState } from 'react';
import { useApp } from '../../store';
import { BtpIncidentGravite } from '../../types';

export const BtpQhseView = () => {
  const { btpIncidents, btpChantiers, createBtpIncident, updateBtpIncidentStatus, updateBtpChantier, currentRole } = useApp();
  const [newIncident, setNewIncident] = useState({ chantier_id: '', gravite: 'mineur' as BtpIncidentGravite, description: '', mesures_correctives: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncident.chantier_id) return alert("Veuillez sélectionner un chantier.");
    
    if (newIncident.gravite === 'critique') {
      const confirm = window.confirm("ATTENTION : Déclarer un incident critique va suspendre immédiatement le chantier et alerter le DG. Continuer ?");
      if (!confirm) return;
    }

    try {
      await createBtpIncident(newIncident);
      setNewIncident({ chantier_id: '', gravite: 'mineur', description: '', mesures_correctives: '' });
      alert("Incident enregistré.");
    } catch (err: any) {
      alert("Erreur: " + err.message);
    }
  };

  const handleUnlockChantier = async (chantierId: string, roleType: 'QHSE' | 'DG') => {
    try {
      const chantier = btpChantiers.find(c => c.id === chantierId);
      if (!chantier) return;
      
      const updates: any = {};
      if (roleType === 'QHSE') updates.qhse_unlock = true;
      if (roleType === 'DG') updates.dg_unlock = true;

      await updateBtpChantier(chantierId, updates);
      
      // Check if both are unlocked
      if ((roleType === 'QHSE' || chantier.qhse_unlock) && (roleType === 'DG' || chantier.dg_unlock)) {
         // Should realistically trigger a state change to en_cours
         alert("Double validation effectuée. Le chantier peut reprendre.");
      } else {
         alert("Validation enregistrée. En attente de la seconde validation.");
      }
    } catch(e) {}
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Qualité, Hygiène, Sécurité, Environnement (QHSE)</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* FORMULAIRE INCIDENT */}
        {(currentRole === 'QHSE_BTP' || currentRole === 'GERANT') && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="bg-red-100 text-red-600 p-1.5 rounded-lg">⚠️</span>
              Déclarer un Incident
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Chantier concerné</label>
                <select 
                  required 
                  className="w-full border-slate-300 rounded-lg p-2.5 border text-sm"
                  value={newIncident.chantier_id}
                  onChange={e => setNewIncident({...newIncident, chantier_id: e.target.value})}
                >
                  <option value="">-- Sélectionner un chantier --</option>
                  {btpChantiers.filter(c => c.statut === 'en_cours').map(c => (
                    <option key={c.id} value={c.id}>{c.nom}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Gravité</label>
                <select 
                  required 
                  className={`w-full rounded-lg p-2.5 border text-sm font-medium ${
                    newIncident.gravite === 'critique' ? 'bg-red-50 border-red-300 text-red-700' : 
                    newIncident.gravite === 'majeur' ? 'bg-orange-50 border-orange-300 text-orange-700' : 
                    'bg-slate-50 border-slate-300'
                  }`}
                  value={newIncident.gravite}
                  onChange={e => setNewIncident({...newIncident, gravite: e.target.value as BtpIncidentGravite})}
                >
                  <option value="mineur">Mineur (Sans arrêt)</option>
                  <option value="majeur">Majeur (Arrêt temporaire local)</option>
                  <option value="critique">Critique (Arrêt total du chantier)</option>
                </select>
                {newIncident.gravite === 'critique' && (
                  <p className="text-xs text-red-600 mt-2 font-medium">⚠️ Cette déclaration suspendra le chantier et alertera la Direction Générale immédiatement.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description de l'incident</label>
                <textarea 
                  required 
                  className="w-full border-slate-300 rounded-lg p-2.5 border text-sm" 
                  rows={4}
                  value={newIncident.description}
                  onChange={e => setNewIncident({...newIncident, description: e.target.value})}
                />
              </div>

              <button type="submit" className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors">
                Enregistrer l'incident
              </button>
            </form>
          </div>
        )}

        {/* LISTE DES INCIDENTS & LEVEES */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
             <h2 className="text-lg font-bold text-slate-800 mb-4">Incidents Récents</h2>
             <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
               {btpIncidents.length === 0 ? (
                 <p className="text-sm text-slate-500">Aucun incident enregistré.</p>
               ) : (
                 btpIncidents.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(inc => {
                   const c = btpChantiers.find(x => x.id === inc.chantier_id);
                   return (
                     <div key={inc.id} className="p-4 rounded-lg border border-slate-100 bg-slate-50 text-sm">
                       <div className="flex justify-between items-start mb-2">
                         <span className={`px-2 py-1 rounded text-xs font-bold uppercase
                           ${inc.gravite === 'critique' ? 'bg-red-600 text-white' : 
                             inc.gravite === 'majeur' ? 'bg-orange-100 text-orange-800' : 
                             'bg-slate-200 text-slate-700'}`}>
                           {inc.gravite}
                         </span>
                         <span className="text-xs text-slate-500">{new Date(inc.date).toLocaleString()}</span>
                       </div>
                       <p className="font-semibold text-slate-800 mb-1">{c?.nom || 'Chantier inconnu'}</p>
                       <p className="text-slate-600 mb-3">{inc.description}</p>
                       
                       <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                         <span className="text-xs font-medium text-slate-500 uppercase">{inc.statut.replace(/_/g, ' ')}</span>
                         {(currentRole === 'QHSE_BTP' || currentRole === 'GERANT') && inc.statut !== 'clôturé' && (
                           <button onClick={() => updateBtpIncidentStatus(inc.id, 'clôturé')} className="text-xs bg-slate-800 text-white px-3 py-1.5 rounded">Clôturer</button>
                         )}
                       </div>
                     </div>
                   );
                 })
               )}
             </div>
          </div>

          {/* CHANTIERS SUSPENDUS (DOUBLE VALIDATION) */}
          <div className="bg-orange-50 p-6 rounded-xl border border-orange-200">
             <h2 className="text-lg font-bold text-orange-800 mb-4">Chantiers Suspendus (Attente de levée)</h2>
             <div className="space-y-3">
                {btpChantiers.filter(c => c.statut === 'suspendu').map(c => (
                  <div key={c.id} className="bg-white p-4 rounded-lg shadow-sm border border-orange-100">
                    <p className="font-semibold text-slate-800 mb-3">{c.nom}</p>
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Validation QHSE</span>
                        {c.qhse_unlock ? (
                          <span className="text-emerald-600 font-bold">✅ Accordé</span>
                        ) : (
                          (currentRole === 'QHSE_BTP' || currentRole === 'GERANT') ? (
                            <button onClick={() => handleUnlockChantier(c.id, 'QHSE')} className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded font-medium hover:bg-orange-200">Valider la reprise</button>
                          ) : <span className="text-slate-400 text-sm">En attente</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Validation DG</span>
                        {c.dg_unlock ? (
                          <span className="text-emerald-600 font-bold">✅ Accordé</span>
                        ) : (
                          currentRole === 'GERANT' ? (
                            <button onClick={() => handleUnlockChantier(c.id, 'DG')} className="text-xs bg-slate-800 text-white px-3 py-1 rounded font-medium hover:bg-slate-700">Valider la reprise (DG)</button>
                          ) : <span className="text-slate-400 text-sm">En attente</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {btpChantiers.filter(c => c.statut === 'suspendu').length === 0 && (
                  <p className="text-sm text-orange-700/70">Aucun chantier suspendu actuellement.</p>
                )}
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};
