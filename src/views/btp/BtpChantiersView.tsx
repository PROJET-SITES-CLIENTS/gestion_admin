import React, { useState } from 'react';
import { useApp } from '../../store';
import { BtpChantierStatus } from '../../types';

export const BtpChantiersView = () => {
  const { btpChantiers, currentRole, updateBtpChantierStatus, updateBtpChantier, btpJournaux, createBtpJournal, createBtpSituation, btpSituations, updateBtpSituation } = useApp();
  
  const [selectedChantierId, setSelectedChantierId] = useState<string | null>(null);
  const [newJournal, setNewJournal] = useState({ avancement_pct: 0, commentaire: '', incidents_mineurs: '', effectifs_presents: '10' });
  const [newSituation, setNewSituation] = useState({ periode: '', pct_avancement_declare: 0, montant_facture: 0 });

  const selectedChantier = btpChantiers.find(c => c.id === selectedChantierId);

  const handleStartChantier = async (id: string) => {
    try {
      await updateBtpChantierStatus(id, 'en_cours');
    } catch (err: any) {
      alert(err.message || "Erreur lors du démarrage.");
    }
  };

  const handleAddJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChantierId) return;
    await createBtpJournal({ ...newJournal, chantier_id: selectedChantierId, date: new Date().toISOString() });
    setNewJournal({ avancement_pct: 0, commentaire: '', incidents_mineurs: '', effectifs_presents: '10' });
    alert("Journal ajouté avec succès.");
  };

  const handleCreateSituation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChantierId) return;
    await createBtpSituation({ ...newSituation, chantier_id: selectedChantierId });
    setNewSituation({ periode: '', pct_avancement_declare: 0, montant_facture: 0 });
    alert("Situation brouillon créée.");
  };

  const statusColors = {
    'planification': 'bg-slate-100 text-slate-700',
    'en_cours': 'bg-blue-100 text-blue-700',
    'suspendu': 'bg-red-100 text-red-700',
    'réception_provisoire': 'bg-purple-100 text-purple-700',
    'réception_définitive': 'bg-green-100 text-green-700',
    'clôturé': 'bg-slate-800 text-white'
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Pilotage des Chantiers BTP</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-lg font-semibold text-slate-700">Liste des Chantiers</h2>
          {btpChantiers.map(c => (
            <div 
              key={c.id} 
              onClick={() => setSelectedChantierId(c.id)}
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${selectedChantierId === c.id ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-slate-800">{c.nom}</h3>
                <span className={`text-xs px-2 py-1 rounded font-medium ${statusColors[c.statut]}`}>
                  {c.statut.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-slate-500 mb-3">{c.client} • {c.adresse}</p>
              
              <div className="flex gap-2 mb-3 text-xs">
                <span className={`px-2 py-1 rounded border ${c.rh_validation ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                  RH {c.rh_validation ? '✅' : '❌'}
                </span>
                <span className={`px-2 py-1 rounded border ${c.materiel_validation ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                  MAT {c.materiel_validation ? '✅' : '❌'}
                </span>
              </div>

              {c.statut === 'planification' && (currentRole === 'COND_TRAVAUX' || currentRole === 'GERANT') && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleStartChantier(c.id); }}
                  disabled={!c.rh_validation || !c.materiel_validation}
                  className={`w-full py-2 rounded text-sm font-medium transition-colors ${(!c.rh_validation || !c.materiel_validation) ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                >
                  Démarrer le chantier
                </button>
              )}
              
              {c.statut === 'en_cours' && (currentRole === 'COND_TRAVAUX' || currentRole === 'GERANT') && (
                <button 
                  onClick={(e) => { e.stopPropagation(); updateBtpChantierStatus(c.id, 'réception_provisoire'); }}
                  className="w-full py-2 bg-purple-600 text-white rounded text-sm font-medium hover:bg-purple-700"
                >
                  Déclarer Réception Provisoire
                </button>
              )}
            </div>
          ))}
          {btpChantiers.length === 0 && <p className="text-slate-500 text-sm">Aucun chantier en cours.</p>}
        </div>

        <div className="lg:col-span-2">
          {selectedChantier ? (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                <h2 className="text-xl font-bold text-slate-800 mb-2">{selectedChantier.nom}</h2>
                <div className="flex items-center gap-4 text-sm text-slate-600 mb-6">
                  <span><strong>Client:</strong> {selectedChantier.client}</span>
                  <span><strong>Budget initial:</strong> {selectedChantier.budget_initial.toLocaleString()} GNF</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* ZONE JOURNAL (CHEF_CHANTIER) */}
                  {(currentRole === 'CHEF_CHANTIER' || currentRole === 'GERANT' || currentRole === 'COND_TRAVAUX') && selectedChantier.statut === 'en_cours' && (
                    <form onSubmit={handleAddJournal} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <h3 className="font-semibold text-slate-700 mb-4">Saisir le Journal du Jour</h3>
                      <div className="space-y-3 text-sm">
                        <div>
                          <label className="block text-slate-600 mb-1">Effectifs présents</label>
                          <input type="number" required className="w-full border p-2 rounded" value={newJournal.effectifs_presents} onChange={e => setNewJournal({...newJournal, effectifs_presents: e.target.value})} />
                        </div>
                        <div>
                          <label className="block text-slate-600 mb-1">Avancement global estimé (%)</label>
                          <input type="number" max="100" min="0" required className="w-full border p-2 rounded" value={newJournal.avancement_pct} onChange={e => setNewJournal({...newJournal, avancement_pct: Number(e.target.value)})} />
                        </div>
                        <div>
                          <label className="block text-slate-600 mb-1">Faits marquants / Travaux réalisés</label>
                          <textarea required className="w-full border p-2 rounded" rows={3} value={newJournal.commentaire} onChange={e => setNewJournal({...newJournal, commentaire: e.target.value})}></textarea>
                        </div>
                        <button type="submit" className="w-full bg-slate-800 text-white py-2 rounded hover:bg-slate-700">Enregistrer l'entrée</button>
                      </div>
                    </form>
                  )}

                  {/* ZONE SITUATIONS (COND_TRAVAUX / CPT) */}
                  {(currentRole === 'COND_TRAVAUX' || currentRole === 'GERANT' || currentRole === 'COMPTABLE') && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                      <h3 className="font-semibold text-blue-800 mb-4">Situations de Travaux (Facturation)</h3>
                      
                      <div className="space-y-2 mb-4 max-h-[200px] overflow-y-auto">
                        {btpSituations.filter(s => s.chantier_id === selectedChantier.id).map(sit => (
                          <div key={sit.id} className="bg-white p-3 rounded shadow-sm text-sm border border-slate-100">
                            <div className="flex justify-between font-medium">
                              <span>Période: {sit.periode}</span>
                              <span className="text-blue-700">{sit.montant_facture.toLocaleString()} GNF</span>
                            </div>
                            <div className="text-slate-500 text-xs mt-1">Avancement: {sit.pct_avancement_declare}%</div>
                            
                            <div className="mt-2 pt-2 border-t flex justify-between items-center">
                              <span className="text-xs font-semibold text-slate-600 uppercase">{sit.statut.replace(/_/g, ' ')}</span>
                              
                              {sit.statut === 'brouillon' && (currentRole === 'COND_TRAVAUX' || currentRole === 'GERANT') && (
                                <button onClick={() => updateBtpSituation(sit.id, { statut: 'en_attente_facturation', valide_par_conducteur: true })} className="text-xs bg-blue-600 text-white px-2 py-1 rounded">Valider (Envoi Compta)</button>
                              )}
                              
                              {sit.statut === 'en_attente_facturation' && (currentRole === 'COMPTABLE' || currentRole === 'GERANT') && (
                                <button onClick={() => updateBtpSituation(sit.id, { statut: 'facturée' })} className="text-xs bg-emerald-600 text-white px-2 py-1 rounded">Générer Facture</button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {(currentRole === 'COND_TRAVAUX' || currentRole === 'GERANT') && selectedChantier.statut === 'en_cours' && (
                        <form onSubmit={handleCreateSituation} className="mt-4 pt-4 border-t border-blue-200 text-sm space-y-3">
                          <h4 className="font-medium text-blue-800">Créer une situation</h4>
                          <input type="text" placeholder="Période (ex: Août 2026)" required className="w-full border p-2 rounded" value={newSituation.periode} onChange={e => setNewSituation({...newSituation, periode: e.target.value})} />
                          <div className="flex gap-2">
                            <input type="number" placeholder="% Avanc." required className="w-1/3 border p-2 rounded" value={newSituation.pct_avancement_declare || ''} onChange={e => setNewSituation({...newSituation, pct_avancement_declare: Number(e.target.value)})} />
                            <input type="number" placeholder="Montant GNF" required className="w-2/3 border p-2 rounded" value={newSituation.montant_facture || ''} onChange={e => setNewSituation({...newSituation, montant_facture: Number(e.target.value)})} />
                          </div>
                          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Créer le brouillon</button>
                        </form>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  <h3 className="font-semibold text-slate-700 mb-3">Historique du Journal ({btpJournaux.filter(j => j.chantier_id === selectedChantier.id).length} entrées)</h3>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                    {btpJournaux.filter(j => j.chantier_id === selectedChantier.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(j => (
                      <div key={j.id} className="p-3 bg-slate-50 rounded border border-slate-100 text-sm">
                        <div className="flex justify-between text-slate-500 mb-1 text-xs">
                          <span>{new Date(j.date).toLocaleDateString()}</span>
                          <span>Avancement déclaré : <strong>{j.avancement_pct}%</strong></span>
                        </div>
                        <p className="text-slate-800">{j.commentaire}</p>
                        <p className="text-slate-500 text-xs mt-1">Effectifs présents : {j.effectifs_presents}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-lg h-64 flex items-center justify-center text-slate-400">
              Sélectionnez un chantier pour afficher les détails
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
