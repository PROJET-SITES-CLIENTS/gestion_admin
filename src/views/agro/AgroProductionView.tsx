import React, { useState } from 'react';
import { useApp } from '../../store';
import { Factory, ShieldAlert, AlertOctagon } from 'lucide-react';

export function AgroProductionView() {
  const { currentUser, currentRole, agroLotProductions, agroLotMatierePremieres, agroCreateLotProduction, agroUpdateProductionStatus, agroAddControleProcess } = useApp();
  const [showNew, setShowNew] = useState(false);
  
  const mps = agroLotMatierePremieres.filter(m => m.statut === 'en_stock');
  
  const [newProd, setNewProd] = useState({ nom_produit: '', date_fabrication: new Date().toISOString().split('T')[0], quantite_produite: 0, unite: 'kg', lots_matiere_premiere_utilises: [] as {lot_id: string, quantite_utilisee: number}[] });

  const handleCreate = async () => {
    await agroCreateLotProduction({ ...newProd, responsable_production_id: currentUser?.id || '1' });
    setShowNew(false);
  };

  const handleControle = async (lot_id: string, isConforme: boolean) => {
    const point = prompt('Point de contrôle (ex: CCP1 Température):');
    if (!point) return;
    await agroAddControleProcess({
      lot_production_id: lot_id,
      point_de_controle: point,
      date: new Date().toISOString(),
      resultat: isConforme ? 'conforme' : 'non_conforme',
      controleur_id: currentUser?.id || '1'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Factory className="w-6 h-6 text-indigo-600" />
          Production & Transformation
        </h2>
        {['RESP_PRODUCTION', 'GERANT'].includes(currentRole || '') && (
          <button onClick={() => setShowNew(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
            + Lancer Production
          </button>
        )}
      </div>

      {showNew && (
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Lancer un Lot de Production</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <input type="text" placeholder="Nom Produit" className="p-2 border rounded" onChange={e => setNewProd({...newProd, nom_produit: e.target.value})} />
            <input type="number" placeholder="Quantité (cible)" className="p-2 border rounded" onChange={e => setNewProd({...newProd, quantite_produite: Number(e.target.value)})} />
            
            <div className="col-span-2 border rounded p-4">
              <p className="font-semibold mb-2">Matières premières utilisées (obligatoire pour traçabilité) :</p>
              {mps.length === 0 ? <p className="text-sm text-red-500">Aucune matière première en stock.</p> : (
                <div className="flex flex-wrap gap-2">
                  {mps.map(mp => (
                    <label key={mp.id_lot} className="flex items-center gap-2 p-2 bg-slate-50 rounded border text-sm hover:bg-slate-100 cursor-pointer">
                      <input type="checkbox" onChange={e => {
                        if (e.target.checked) {
                          const q = prompt('Quantité utilisée (en '+mp.unite+') ?') || '0';
                          setNewProd({...newProd, lots_matiere_premiere_utilises: [...newProd.lots_matiere_premiere_utilises, {lot_id: mp.id_lot, quantite_utilisee: Number(q)}]});
                        } else setNewProd({...newProd, lots_matiere_premiere_utilises: newProd.lots_matiere_premiere_utilises.filter(id => id.lot_id !== mp.id_lot)});
                      }} />
                      {mp.id_lot} - {mp.fournisseur_ou_parcelle} ({mp.quantite}{mp.unite})
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={newProd.lots_matiere_premiere_utilises.length === 0} className="px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50">Créer le lot</button>
            <button onClick={() => setShowNew(false)} className="px-4 py-2 bg-slate-200 text-slate-800 rounded">Annuler</button>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {agroLotProductions.map(lot => (
          <div key={lot.id_lot} className={`bg-white p-4 rounded-lg border shadow-sm ${lot.statut === 'bloqué' ? 'border-red-500 bg-red-50' : 'border-slate-200'}`}>
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-lg flex items-center gap-2">
                  {lot.id_lot} - {lot.nom_produit} ({lot.quantite_restante ?? lot.quantite_produite} {lot.unite} restants)
                  <span className={`px-2 py-1 rounded text-xs ${lot.statut === 'bloqué' ? 'bg-red-200 text-red-800' : 'bg-slate-100 text-slate-700'}`}>
                    {lot.statut.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </h4>
                <p className="text-sm text-slate-500 mt-1">Composé de : {lot.lots_matiere_premiere_utilises.map(l => l.lot_id).join(', ')}</p>
                {lot.decision_deblocage && (
                  <p className="text-sm text-amber-700 mt-2 bg-amber-100 p-2 rounded">Décision de déblocage : {lot.decision_deblocage}</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {lot.statut === 'planifié' && ['RESP_PRODUCTION', 'GERANT'].includes(currentRole || '') && (
                  <button onClick={() => agroUpdateProductionStatus(lot.id_lot, 'en_production')} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded text-sm hover:bg-indigo-200">Démarrer Prod</button>
                )}
                {lot.statut === 'en_production' && (
                  <>
                    {['RESP_QUALITE', 'GERANT'].includes(currentRole || '') && (
                      <div className="flex gap-1 border p-1 rounded bg-slate-50">
                        <span className="text-xs text-slate-500 my-auto ml-1 mr-2">CCP:</span>
                        <button onClick={() => handleControle(lot.id_lot, true)} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200">Valider</button>
                        <button onClick={() => handleControle(lot.id_lot, false)} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200">Défaut</button>
                      </div>
                    )}
                    {['RESP_PRODUCTION', 'GERANT'].includes(currentRole || '') && (
                      <button onClick={() => agroUpdateProductionStatus(lot.id_lot, 'conditionné')} className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 mt-2">Terminer Process</button>
                    )}
                  </>
                )}
                {lot.statut === 'bloqué' && ['RESP_QUALITE'].includes(currentRole || '') && (
                  <button onClick={() => {
                    const dec = prompt("Saisissez la décision de déblocage (déclassement, destruction...) :");
                    if (dec) agroUpdateProductionStatus(lot.id_lot, 'conditionné', dec);
                  }} className="px-3 py-1 bg-red-600 text-white flex items-center gap-1 rounded text-sm hover:bg-red-700">
                    <AlertOctagon className="w-4 h-4" /> Débloquer le lot
                  </button>
                )}
                {lot.statut === 'conditionné' && ['RESP_QUALITE'].includes(currentRole || '') && (
                  <button onClick={() => agroUpdateProductionStatus(lot.id_lot, 'disponible_à_la_vente')} className="px-3 py-1 bg-green-600 text-white flex items-center gap-1 rounded text-sm hover:bg-green-700">
                    <ShieldAlert className="w-4 h-4" /> Libérer pour la Vente
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {agroLotProductions.length === 0 && (
          <div className="p-8 text-center text-slate-500 bg-white rounded-lg border border-slate-200">Aucun lot de production.</div>
        )}
      </div>
    </div>
  );
}
