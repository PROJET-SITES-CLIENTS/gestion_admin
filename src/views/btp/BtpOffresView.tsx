import React, { useState } from 'react';
import { useApp } from '../../store';
import { BtpOffreStatus } from '../../types';

export const BtpOffresView = () => {
  const { btpOffres, currentRole, createBtpOffre, updateBtpOffreStatus, updateBtpOffre } = useApp();
  const [showCreate, setShowCreate] = useState(false);
  const [newOffre, setNewOffre] = useState({ client: '', objet: '', montant_estime: 0, date_limite_depot: '' });
  
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createBtpOffre(newOffre);
    setShowCreate(false);
    setNewOffre({ client: '', objet: '', montant_estime: 0, date_limite_depot: '' });
  };

  const statusColumns: { id: BtpOffreStatus, label: string }[] = [
    { id: 'repérée', label: 'Repérée' },
    { id: 'en_chiffrage', label: 'En chiffrage' },
    { id: 'en_validation_financiere', label: 'Validation CPT' },
    { id: 'en_validation_dg', label: 'Validation DG' },
    { id: 'déposée', label: 'Déposée' },
    { id: 'gagnée', label: 'Gagnée' },
    { id: 'perdue', label: 'Perdue' }
  ];

  const handleStatusChange = async (offreId: string, currentStatus: BtpOffreStatus, action: string) => {
    let nextStatus: BtpOffreStatus = currentStatus;
    if (action === 'CHIFRER') nextStatus = 'en_chiffrage';
    if (action === 'SOUMETTRE_CPT') nextStatus = 'en_validation_financiere';
    if (action === 'VALIDER_CPT') nextStatus = 'en_validation_dg';
    if (action === 'REFUSER_CPT') {
      const commentaire = window.prompt("Motif du refus financier (obligatoire) :");
      if (!commentaire) return;
      await updateBtpOffreStatus(offreId, 'en_chiffrage', commentaire);
      return;
    }
    if (action === 'VALIDER_DG') nextStatus = 'déposée';
    if (action === 'GAGNER') nextStatus = 'gagnée';
    if (action === 'PERDRE') nextStatus = 'perdue';
    
    await updateBtpOffreStatus(offreId, nextStatus);
  };

  const handleMontantChange = async (id: string, montant: number) => {
    await updateBtpOffre(id, { montant_estime: montant });
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900"><span className="font-serif italic font-normal text-indigo-600 mr-1.5">Les appels</span>d'offres BTP</h1>
        {(currentRole === 'COMMERCIAL' || currentRole === 'GERANT' || currentRole === 'ETUDES') && (
          <button onClick={() => setShowCreate(true)} className="bg-blue-600 text-white px-4 py-2 rounded shadow-sm hover:bg-blue-700">
            Nouvelle Offre
          </button>
        )}
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white p-4 rounded shadow mb-6 max-w-xl">
          <h2 className="text-lg font-semibold mb-4">Créer une offre</h2>
          <div className="space-y-4">
            <input required type="text" placeholder="Client" className="border p-2 w-full rounded" value={newOffre.client} onChange={e => setNewOffre({...newOffre, client: e.target.value})} />
            <input required type="text" placeholder="Objet de l'appel d'offres" className="border p-2 w-full rounded" value={newOffre.objet} onChange={e => setNewOffre({...newOffre, objet: e.target.value})} />
            <input required type="number" placeholder="Montant estimé" className="border p-2 w-full rounded" value={newOffre.montant_estime} onChange={e => setNewOffre({...newOffre, montant_estime: Number(e.target.value)})} />
            <div>
               <label className="block text-xs text-slate-500 mb-1">Date limite de dépôt</label>
               <input required type="date" className="border p-2 w-full rounded" value={newOffre.date_limite_depot} onChange={e => setNewOffre({...newOffre, date_limite_depot: e.target.value})} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-slate-600 font-medium">Annuler</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-medium rounded shadow-sm hover:bg-blue-700">Enregistrer</button>
            </div>
          </div>
        </form>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {statusColumns.map(col => (
          <div key={col.id} className="min-w-[320px] max-w-[320px] bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h3 className="font-semibold text-slate-700 mb-4 flex justify-between items-center">
              {col.label} 
              <span className="bg-white border text-xs px-2 py-1 rounded-full text-slate-600 font-medium shadow-sm">{btpOffres.filter(o => o.statut === col.id).length}</span>
            </h3>
            
            <div className="space-y-3">
              {btpOffres.filter(o => o.statut === col.id).map(o => {
                const isLocked = ['déposée', 'gagnée', 'perdue', 'retirée'].includes(o.statut);
                
                return (
                  <div key={o.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                    <div className="font-medium text-slate-800 leading-tight mb-1">{o.objet}</div>
                    <div className="text-sm text-slate-500 mb-3">{o.client}</div>
                    
                    <div className="mb-3">
                      <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Montant Estimé (GNF)</label>
                      <input 
                        type="number" 
                        value={o.montant_estime}
                        onChange={(e) => handleMontantChange(o.id, Number(e.target.value))}
                        disabled={isLocked || (currentRole !== 'ETUDES' && currentRole !== 'GERANT')}
                        className={`w-full text-sm font-medium border p-2 rounded ${isLocked ? 'bg-slate-100 text-slate-500' : 'bg-white focus:ring-1 focus:border-blue-500'}`}
                      />
                    </div>
                    
                    {o.commentaire_validation_financiere && o.statut === 'en_chiffrage' && (
                      <div className="text-xs bg-red-50 text-red-700 p-2 rounded border border-red-100 mb-3">
                        <strong className="block mb-1">Refus CPT :</strong> {o.commentaire_validation_financiere}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-2 mt-2 border-t border-slate-100">
                      {o.statut === 'repérée' && (currentRole === 'ETUDES' || currentRole === 'GERANT') && (
                        <button onClick={() => handleStatusChange(o.id, o.statut, 'CHIFRER')} className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium px-3 py-1.5 rounded transition-colors w-full">Démarrer Chiffrage</button>
                      )}
                      
                      {o.statut === 'en_chiffrage' && (currentRole === 'ETUDES' || currentRole === 'GERANT') && (
                        <button onClick={() => handleStatusChange(o.id, o.statut, 'SOUMETTRE_CPT')} className="text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium px-3 py-1.5 rounded transition-colors w-full">Soumettre Compta</button>
                      )}
                      
                      {o.statut === 'en_validation_financiere' && (currentRole === 'COMPTABLE' || currentRole === 'GERANT') && (
                        <div className="flex gap-2 w-full">
                          <button onClick={() => handleStatusChange(o.id, o.statut, 'VALIDER_CPT')} className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium px-2 py-1.5 rounded transition-colors flex-1">Valider</button>
                          <button onClick={() => handleStatusChange(o.id, o.statut, 'REFUSER_CPT')} className="text-xs bg-red-50 hover:bg-red-100 text-red-700 font-medium px-2 py-1.5 rounded transition-colors flex-1">Refuser</button>
                        </div>
                      )}
                      
                      {o.statut === 'en_validation_dg' && currentRole === 'GERANT' && (
                        <button onClick={() => handleStatusChange(o.id, o.statut, 'VALIDER_DG')} className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium px-3 py-1.5 rounded transition-colors w-full">Valider & Déposer</button>
                      )}
                      
                      {o.statut === 'déposée' && (currentRole === 'COMMERCIAL' || currentRole === 'GERANT') && (
                        <div className="flex gap-2 w-full">
                          <button onClick={() => handleStatusChange(o.id, o.statut, 'GAGNER')} className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium px-2 py-1.5 rounded transition-colors flex-1">Gagnée</button>
                          <button onClick={() => handleStatusChange(o.id, o.statut, 'PERDRE')} className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium px-2 py-1.5 rounded transition-colors flex-1">Perdue</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
