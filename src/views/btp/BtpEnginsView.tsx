import React, { useState } from 'react';
import { useApp } from '../../store';

export const BtpEnginsView = () => {
  const { btpEngins, btpChantiers, assignBtpEngin, updateBtpEnginStatus, currentRole } = useApp();
  const [selectedEngin, setSelectedEngin] = useState<string | null>(null);
  const [targetChantier, setTargetChantier] = useState<string>('');

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEngin) return;
    try {
      await assignBtpEngin(selectedEngin, targetChantier || undefined);
      setSelectedEngin(null);
      setTargetChantier('');
      alert("Affectation mise à jour !");
    } catch (err: any) {
      alert(err.message || "Erreur lors de l'affectation.");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Parc Matériel & Engins</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <p className="text-slate-500 text-sm font-medium">Total Engins</p>
          <p className="text-3xl font-bold text-slate-800">{btpEngins.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <p className="text-slate-500 text-sm font-medium">Disponibles</p>
          <p className="text-3xl font-bold text-emerald-600">{btpEngins.filter(e => e.statut === 'disponible').length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <p className="text-slate-500 text-sm font-medium">En Maintenance / HS</p>
          <p className="text-3xl font-bold text-red-600">{btpEngins.filter(e => e.statut === 'en_maintenance' || e.statut === 'hors_service').length}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-600">
              <th className="p-4 font-semibold">ID Interne</th>
              <th className="p-4 font-semibold">Type</th>
              <th className="p-4 font-semibold">Statut</th>
              <th className="p-4 font-semibold">Affectation</th>
              <th className="p-4 font-semibold">Horodatage</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {btpEngins.map(e => {
              const chantier = btpChantiers.find(c => c.id === e.chantier_affecte_id);
              return (
                <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-4 font-medium text-slate-800">{e.identifiant_interne}</td>
                  <td className="p-4 text-slate-600">{e.type}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium 
                      ${e.statut === 'disponible' ? 'bg-emerald-100 text-emerald-700' : 
                        e.statut === 'affecté' ? 'bg-blue-100 text-blue-700' : 
                        'bg-red-100 text-red-700'}`}>
                      {e.statut.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4 text-slate-600">
                    {chantier ? chantier.nom : <span className="text-slate-400 italic">Aucune</span>}
                  </td>
                  <td className="p-4 text-slate-600">
                    {e.compteur_horaire} h
                  </td>
                  <td className="p-4 text-right">
                    {(currentRole === 'RESP_MATERIEL' || currentRole === 'GERANT') && (
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => setSelectedEngin(e.id)} 
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                        >
                          Affecter
                        </button>
                        {e.statut !== 'hors_service' && (
                          <button 
                            onClick={() => updateBtpEnginStatus(e.id, 'hors_service')} 
                            className="text-red-600 hover:text-red-800 text-xs font-medium"
                          >
                            Déclarer HS
                          </button>
                        )}
                        {e.statut !== 'disponible' && e.statut !== 'affecté' && (
                          <button 
                            onClick={() => updateBtpEnginStatus(e.id, 'disponible')} 
                            className="text-emerald-600 hover:text-emerald-800 text-xs font-medium"
                          >
                            Remettre en service
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {btpEngins.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">Aucun engin dans le parc.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedEngin && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Affecter un Engin</h3>
            <form onSubmit={handleAssign}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Choisir le Chantier</label>
                <select 
                  className="w-full border-slate-300 rounded-lg p-2.5 border text-sm"
                  value={targetChantier}
                  onChange={e => setTargetChantier(e.target.value)}
                >
                  <option value="">-- Détacher (Rendre disponible) --</option>
                  {btpChantiers.filter(c => c.statut === 'planification' || c.statut === 'en_cours').map(c => (
                    <option key={c.id} value={c.id}>{c.nom} ({c.statut})</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setSelectedEngin(null)} 
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
                >
                  Valider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
