import React, { useState } from 'react';
import { useApp } from '../../store';
import { Truck, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export function AgroApproView() {
  const { currentRole, agroLotMatierePremieres, agroCreateLotMatierePremiere, agroUpdateMatierePremiereStatus } = useApp();
  const [showNew, setShowNew] = useState(false);
  const [newLot, setNewLot] = useState({ fournisseur_ou_parcelle: '', quantite: 0, unite: 'kg', cout_acquisition: 0 });
  const [qaModal, setQaModal] = useState<{lotId: string, type: 'accept' | 'reject'} | null>(null);
  const [qaText, setQaText] = useState('');

  const handleCreate = async () => {
    try {
      await agroCreateLotMatierePremiere(newLot);
      setShowNew(false);
    } catch (e: any) {
      alert("Erreur: " + e.message);
    }
  };

  const handleQaSubmit = async () => {
    if (!qaModal || !qaText) return;
    try {
      if (qaModal.type === 'accept') {
        await agroUpdateMatierePremiereStatus(qaModal.lotId, 'accepté', 'conforme');
      } else {
        await agroUpdateMatierePremiereStatus(qaModal.lotId, 'rejeté', 'non_conforme', qaText);
      }
      setQaModal(null);
      setQaText('');
    } catch (e: any) {
      alert("Erreur: " + e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900"><span className="font-serif italic font-normal text-amber-600 mr-1.5">L'approvisionnement</span>& stock MP</h2>
        {['RESP_AGRO', 'RESP_STOCKAGE', 'GERANT'].includes(currentRole || '') && (
          <button onClick={() => setShowNew(true)} className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700">
            + Planifier Réception
          </button>
        )}
      </div>

      {showNew && (
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Nouvelle Réception</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <input type="text" placeholder="Fournisseur ou Parcelle" className="p-2 border rounded" onChange={e => setNewLot({...newLot, fournisseur_ou_parcelle: e.target.value})} />
            <input type="number" placeholder="Quantité" className="p-2 border rounded" onChange={e => setNewLot({...newLot, quantite: Number(e.target.value)})} />
            <select className="p-2 border rounded" onChange={e => setNewLot({...newLot, unite: e.target.value})}>
              <option value="kg">kg</option>
              <option value="tonnes">tonnes</option>
              <option value="litres">litres</option>
            </select>
            <input type="number" placeholder="Coût d'acquisition total" className="p-2 border rounded" onChange={e => setNewLot({...newLot, cout_acquisition: Number(e.target.value)})} />
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="px-4 py-2 bg-emerald-600 text-white rounded">Enregistrer</button>
            <button onClick={() => setShowNew(false)} className="px-4 py-2 bg-slate-200 text-slate-800 rounded">Annuler</button>
          </div>
        </div>
      )}

      {qaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96 max-w-full">
            <h3 className="text-lg font-bold mb-4">
              {qaModal.type === 'accept' ? 'Valider le Contrôle' : 'Rejeter le Lot'}
            </h3>
            <p className="text-sm text-slate-600 mb-2">
              {qaModal.type === 'accept' ? 'Saisissez les résultats (ex: pH, Taux HR):' : 'Spécifiez le motif détaillé du rejet:'}
            </p>
            <textarea 
              className="w-full border rounded p-2 mb-4" 
              rows={3} 
              value={qaText} 
              onChange={e => setQaText(e.target.value)}
              placeholder="..."
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => {setQaModal(null); setQaText('');}} className="px-4 py-2 bg-slate-200 text-slate-800 rounded">Annuler</button>
              <button onClick={handleQaSubmit} className={`px-4 py-2 text-white rounded ${qaModal.type === 'accept' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
            <tr>
              <th className="p-4">Lot ID</th>
              <th className="p-4">Fournisseur / Origine</th>
              <th className="p-4">Quantité</th>
              <th className="p-4">Statut</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {agroLotMatierePremieres.map(lot => (
              <tr key={lot.id_lot} className="hover:bg-slate-50">
                <td className="p-4 font-mono font-medium text-slate-700">{lot.id_lot}</td>
                <td className="p-4">{lot.fournisseur_ou_parcelle}</td>
                <td className="p-4">{lot.quantite_restante ?? lot.quantite} {lot.unite}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    lot.statut === 'en_stock' ? 'bg-emerald-100 text-emerald-700' :
                    lot.statut === 'rejeté' ? 'bg-red-100 text-red-700' :
                    lot.statut === 'épuisé' ? 'bg-slate-300 text-slate-800' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {lot.statut.replace(/_/g, ' ').toUpperCase()}
                  </span>
                  {lot.motif_rejet && (
                    <div className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> {lot.motif_rejet}
                    </div>
                  )}
                </td>
                <td className="p-4 flex gap-2">
                  {lot.statut === 'planifié' && ['RESP_STOCKAGE', 'GERANT'].includes(currentRole || '') && (
                    <button onClick={() => agroUpdateMatierePremiereStatus(lot.id_lot, 'réceptionné')} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200">Marquer Réceptionné</button>
                  )}
                  {lot.statut === 'réceptionné' && ['RESP_QUALITE', 'GERANT'].includes(currentRole || '') && (
                    <button onClick={() => agroUpdateMatierePremiereStatus(lot.id_lot, 'contrôlé')} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs hover:bg-purple-200">Prendre pour Contrôle</button>
                  )}
                    {lot.statut === 'contrôlé' && ['RESP_QUALITE', 'GERANT'].includes(currentRole || '') && (
                      <div className="flex flex-col gap-1">
                        <button onClick={() => setQaModal({lotId: lot.id_lot, type: 'accept'})} className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs hover:bg-emerald-200" title="Saisir Résultat et Accepter">Valider (Conforme)</button>
                        <button onClick={() => setQaModal({lotId: lot.id_lot, type: 'reject'})} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200" title="Saisir Résultat et Rejeter">Rejeter (Non Conforme)</button>
                      </div>
                    )}
                  {lot.statut === 'accepté' && ['RESP_STOCKAGE', 'GERANT'].includes(currentRole || '') && (
                    <button onClick={() => agroUpdateMatierePremiereStatus(lot.id_lot, 'en_stock')} className="px-2 py-1 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-700">Mettre en Stock</button>
                  )}
                </td>
              </tr>
            ))}
            {agroLotMatierePremieres.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-slate-500">Aucun lot de matière première.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
