import React, { useState } from 'react';
import { useApp } from '../../store';
import { BtpIncidentGravite } from '../../types';
import { Badge, statusTone } from '../../components/ui';
import { ClipboardCheck } from 'lucide-react';

export const BtpQhseView = () => {
  const {
    btpIncidents, btpChantiers, createBtpIncident, updateBtpIncidentStatus, updateBtpChantier, updateBtpChantierStatus, currentRole,
    btpInspections, createBtpInspection, updateBtpInspection, pushToast,
    btpHabilitations, createBtpHabilitation, updateBtpHabilitation, btpEmployeeDirectory
  } = useApp();
  const [newIncident, setNewIncident] = useState({ chantier_id: '', gravite: 'mineur' as BtpIncidentGravite, description: '', mesures_correctives: '' });
  const [newInsp, setNewInsp] = useState({ chantier_id: '', type: 'inspection' as 'inspection' | 'audit' | 'visite', date: new Date().toISOString().slice(0, 10), constats: '', actions_correctives: '', gravite: 'mineure' as 'mineure' | 'majeure' | 'critique' });
  const [newHab, setNewHab] = useState({ employee_id: '', type_habilitation: '', date_obtention: '', date_expiration: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncident.chantier_id) return pushToast('Veuillez sélectionner un chantier.', 'INFO');
    
    if (newIncident.gravite === 'critique') {
      const confirm = window.confirm("ATTENTION : Déclarer un incident critique va suspendre immédiatement le chantier et alerter le DG. Continuer ?");
      if (!confirm) return;
    }

    try {
      await createBtpIncident(newIncident);
      setNewIncident({ chantier_id: '', gravite: 'mineur', description: '', mesures_correctives: '' });
      pushToast('Incident enregistré.', 'INFO');
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

      // Double validation complète → reprise automatique du chantier
      const qhseOk = roleType === 'QHSE' || chantier.qhse_unlock === true;
      const dgOk = roleType === 'DG' || chantier.dg_unlock === true;

      if (qhseOk && dgOk) {
        await updateBtpChantierStatus(chantierId, 'en_cours');
        pushToast('Double validation accordée : chantier repris (en_cours).', 'SUCCESS');
      } else {
        pushToast('Validation enregistrée. En attente de la seconde validation.', 'INFO');
      }
    } catch (e: any) {
      pushToast(e?.message || 'Erreur lors de la validation.', 'ERROR');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 mb-6"><span className="font-serif italic font-normal text-indigo-600 mr-1.5">La vigilance</span>QHSE</h1>

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

      {/* ============ INSPECTIONS PRÉVENTIVES (Vague 2) ============ */}
      <div className="mt-6 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <ClipboardCheck size={18} className="text-indigo-500" />
          Inspections & Audits Préventifs ({btpInspections.length})
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulaire */}
          {(currentRole === 'QHSE_BTP' || currentRole === 'GERANT') && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newInsp.chantier_id) return;
                await createBtpInspection({ ...newInsp, statut: newInsp.constats ? 'réalisée' : 'planifiée' } as any);
                setNewInsp({ chantier_id: '', type: 'inspection', date: new Date().toISOString().slice(0, 10), constats: '', actions_correctives: '', gravite: 'mineure' });
              }}
              className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200"
            >
              <div className="grid grid-cols-2 gap-3">
                <select required className="w-full border-slate-300 rounded-lg p-2.5 border text-sm" value={newInsp.chantier_id} onChange={e => setNewInsp({ ...newInsp, chantier_id: e.target.value })}>
                  <option value="">Chantier…</option>
                  {btpChantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
                <select className="w-full border-slate-300 rounded-lg p-2.5 border text-sm" value={newInsp.type} onChange={e => setNewInsp({ ...newInsp, type: e.target.value as typeof newInsp.type })}>
                  <option value="inspection">Inspection</option>
                  <option value="audit">Audit</option>
                  <option value="visite">Visite</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="date" required className="w-full border-slate-300 rounded-lg p-2.5 border text-sm" value={newInsp.date} onChange={e => setNewInsp({ ...newInsp, date: e.target.value })} />
                <select className="w-full border-slate-300 rounded-lg p-2.5 border text-sm" value={newInsp.gravite} onChange={e => setNewInsp({ ...newInsp, gravite: e.target.value as typeof newInsp.gravite })}>
                  <option value="mineure">Gravité mineure</option>
                  <option value="majeure">Gravité majeure</option>
                  <option value="critique">Gravité critique</option>
                </select>
              </div>
              <textarea className="w-full border-slate-300 rounded-lg p-2.5 border text-sm" rows={2} placeholder="Constats (vide = inspection planifiée)" value={newInsp.constats} onChange={e => setNewInsp({ ...newInsp, constats: e.target.value })} />
              <textarea className="w-full border-slate-300 rounded-lg p-2.5 border text-sm" rows={2} placeholder="Actions correctives" value={newInsp.actions_correctives} onChange={e => setNewInsp({ ...newInsp, actions_correctives: e.target.value })} />
              <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700">
                {newInsp.constats ? 'Enregistrer l\'inspection réalisée' : 'Planifier l\'inspection'}
              </button>
            </form>
          )}

          {/* Liste */}
          <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
            {btpInspections.length === 0 && <p className="text-sm text-slate-400">Aucune inspection planifiée — la prévention commence ici.</p>}
            {[...btpInspections].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(insp => {
              const c = btpChantiers.find(x => x.id === insp.chantier_id);
              return (
                <div key={insp.id} className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/60">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="text-[12.5px] font-bold text-slate-800 capitalize">{insp.type}</span>
                    <Badge tone={statusTone(insp.statut)}>{insp.statut}</Badge>
                    {insp.gravite && <Badge tone={insp.gravite === 'critique' ? 'rose' : insp.gravite === 'majeure' ? 'amber' : 'blue'}>{insp.gravite}</Badge>}
                    <span className="ml-auto text-[10.5px] text-slate-400 font-mono">{new Date(insp.date).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <p className="text-[11.5px] text-slate-500">{c?.nom ?? insp.chantier_id}</p>
                  {insp.constats && <p className="text-[12px] text-slate-700 mt-1.5 leading-snug"><strong>Constats :</strong> {insp.constats}</p>}
                  {insp.actions_correctives && <p className="text-[11.5px] text-indigo-700 mt-1 leading-snug"><strong>Actions :</strong> {insp.actions_correctives}</p>}
                  {insp.statut === 'réalisée' && (currentRole === 'QHSE_BTP' || currentRole === 'GERANT') && (
                    <button onClick={() => updateBtpInspection(insp.id, { statut: 'clôturée' })} className="mt-2 text-[10.5px] font-bold text-emerald-600 uppercase tracking-wide hover:text-emerald-700">✓ Clôturer</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ============ HABILITATIONS & CERTIFICATIONS (Point 9) ============ */}
      <div className="mt-6 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <ClipboardCheck size={18} className="text-emerald-500" />
          Habilitations & Certifications Sécurité
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {(currentRole === 'QHSE_BTP' || currentRole === 'RH' || currentRole === 'GERANT') && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newHab.employee_id) return;
                await createBtpHabilitation(newHab);
                setNewHab({ employee_id: '', type_habilitation: '', date_obtention: '', date_expiration: '' });
                pushToast('Habilitation enregistrée', 'SUCCESS');
              }}
              className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200"
            >
              <select required className="w-full border-slate-300 rounded-lg p-2.5 border text-sm" value={newHab.employee_id} onChange={e => setNewHab({ ...newHab, employee_id: e.target.value })}>
                <option value="">Sélectionner un employé…</option>
                {btpEmployeeDirectory.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}{e.position ? ` (${e.position})` : ''}</option>)}
              </select>
              <input required type="text" className="w-full border-slate-300 rounded-lg p-2.5 border text-sm" placeholder="Type (ex: CACES R482, Habilitation H0B0...)" value={newHab.type_habilitation} onChange={e => setNewHab({ ...newHab, type_habilitation: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Date Obtention</label>
                  <input type="date" required className="w-full border-slate-300 rounded-lg p-2.5 border text-sm" value={newHab.date_obtention} onChange={e => setNewHab({ ...newHab, date_obtention: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Date Expiration</label>
                  <input type="date" required className="w-full border-slate-300 rounded-lg p-2.5 border text-sm" value={newHab.date_expiration} onChange={e => setNewHab({ ...newHab, date_expiration: e.target.value })} />
                </div>
              </div>
              <button type="submit" className="w-full bg-emerald-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700">Enregistrer l'habilitation</button>
            </form>
          )}

          <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
            {btpHabilitations.length === 0 && <p className="text-sm text-slate-400">Aucune habilitation enregistrée.</p>}
            {[...btpHabilitations].sort((a, b) => new Date(a.date_expiration).getTime() - new Date(b.date_expiration).getTime()).map(hab => {
              const emp = btpEmployeeDirectory.find(e => e.id === hab.employee_id);
              const expDate = new Date(hab.date_expiration);
              const isExpired = expDate.getTime() < Date.now();
              const isExpiringSoon = expDate.getTime() < Date.now() + 30 * 24 * 60 * 60 * 1000 && !isExpired;
              
              return (
                <div key={hab.id} className={`p-3.5 rounded-lg border ${isExpired ? 'border-red-200 bg-red-50' : isExpiringSoon ? 'border-amber-200 bg-amber-50' : 'border-slate-100 bg-slate-50'} flex justify-between items-center`}>
                  <div>
                    <p className="text-[13px] font-bold text-slate-800">{emp ? `${emp.firstName} ${emp.lastName}` : 'Employé inconnu'}</p>
                    <p className="text-[12px] text-slate-600 font-medium">{hab.type_habilitation}</p>
                    <p className="text-[11px] text-slate-500 mt-1">Expire le : {expDate.toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div>
                    {isExpired ? <Badge tone="rose">Expirée</Badge> : isExpiringSoon ? <Badge tone="amber">Bientôt expirée</Badge> : <Badge tone="success">Valide</Badge>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
