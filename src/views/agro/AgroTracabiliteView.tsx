import React, { useState } from 'react';
import { useApp } from '../../store';
import { Network, Search, AlertTriangle, FileText, ShoppingCart } from 'lucide-react';

export function AgroTracabiliteView() {
  const { currentUser, currentRole, agroCommandes, agroLotProductions, agroLotMatierePremieres, agroLignesLivrees, agroFiches, agroReclamations, agroCreateCommande, agroUpdateCommandeStatus, agroPrepareLivraison, agroCreateReclamation, pushToast } = useApp();
  
  const [searchLot, setSearchLot] = useState('');
  const [tracabilityResult, setTracabilityResult] = useState<any>(null);

  const [showNewCmd, setShowNewCmd] = useState(false);
  const [newCmd, setNewCmd] = useState({ client_id: '', date_livraison_prevue: new Date().toISOString().split('T')[0], produits_commandes: '' });

  const [livraisonModal, setLivraisonModal] = useState<{commandeId: string} | null>(null);
  const [livraisonForm, setLivraisonForm] = useState({ lot_production_id: '', quantite_livree: 0 });

  const [reclamationModal, setReclamationModal] = useState<{commandeId: string, clientId: string} | null>(null);
  const [reclamationForm, setReclamationForm] = useState({ lot_production_id: '', motif: '' });

  const executeSearch = () => {
    if (!searchLot) return;
    
    const lotMatiere = agroLotMatierePremieres.find(l => l.id_lot === searchLot);
    const lotProduit = agroLotProductions.find(l => l.id_lot === searchLot);
    
    if (lotProduit) {
      const amont = lotProduit.lots_matiere_premiere_utilises.map(u => agroLotMatierePremieres.find(m => m.id_lot === u.lot_id)).filter(Boolean);
      const lignesL = agroLignesLivrees.filter(l => l.lot_production_id === searchLot);
      const aval = lignesL.map(l => {
        const cmd = agroCommandes.find(c => c.id === l.commande_id);
        return { client: cmd?.client_id || 'Inconnu', quantite_livree: l.quantite_livree };
      });
      const reclamations = agroReclamations.filter(r => r.lot_production_id === searchLot);
      setTracabilityResult({ type: 'PF', lot: lotProduit, amont, aval, reclamations });
    } else if (lotMatiere) {
      const aval = agroLotProductions.filter(p => p.lots_matiere_premiere_utilises.some(u => u.lot_id === lotMatiere.id_lot));
      setTracabilityResult({ type: 'MP', lot: lotMatiere, aval });
    } else {
      setTracabilityResult({ error: "Lot introuvable." });
    }
  };

  const handleLivraison = async () => {
    if(!livraisonModal || !livraisonForm.lot_production_id || livraisonForm.quantite_livree <= 0) return;
    try {
      await agroPrepareLivraison(livraisonModal.commandeId, [livraisonForm]);
      setLivraisonModal(null);
    } catch (e: any) {
      alert("Erreur: " + e.message);
    }
  };

  const handleReclamation = async () => {
    if(!reclamationModal || !reclamationForm.motif) return;
    try {
      await agroCreateReclamation({
        commande_id: reclamationModal.commandeId,
        client_id: reclamationModal.clientId,
        motif: reclamationForm.motif,
        date_reclamation: new Date().toISOString(),
        lot_production_id: reclamationForm.lot_production_id || undefined
      });
      setReclamationModal(null);
    } catch(e: any) {
      alert("Erreur: " + e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900"><span className="font-serif italic font-normal text-amber-600 mr-1.5">La traçabilité</span>& ventes</h2>
        {['COMMERCIAL', 'GERANT'].includes(currentRole || '') && (
          <button onClick={() => setShowNewCmd(true)} className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700">
            + Nouvelle Commande
          </button>
        )}
      </div>

      {showNewCmd && <div className="bg-white p-4 rounded shadow mb-6 space-y-4">
            <h3 className="font-bold">Nouvelle Commande Client</h3>
            <div className="grid grid-cols-2 gap-4">
              <input type="text" placeholder="ID Client" className="p-2 border rounded" onChange={e => setNewCmd({...newCmd, client_id: e.target.value})} />
              <input type="date" className="p-2 border rounded" onChange={e => setNewCmd({...newCmd, date_livraison_prevue: e.target.value})} />
              <input type="text" placeholder="Produits demandés" className="p-2 border rounded col-span-2" onChange={e => setNewCmd({...newCmd, produits_commandes: e.target.value})} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { agroCreateCommande({...newCmd, commercial_id: currentUser?.id || '1'}); setShowNewCmd(false); }} className="px-4 py-2 bg-orange-600 text-white rounded">Enregistrer</button>
              <button onClick={() => setShowNewCmd(false)} className="px-4 py-2 bg-slate-200 text-slate-800 rounded">Annuler</button>
            </div>
          </div>
      }

      {/* MOTEUR DE RECHERCHE TRACABILITE */}
      <div className="bg-slate-800 text-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Search className="w-5 h-5"/> Moteur de Traçabilité Globale</h3>
        <div className="flex gap-4">
          <input 
            type="text" 
            placeholder="Entrez un ID de Lot (Matière ou Produit Fini)..." 
            className="p-2 rounded flex-1 text-slate-900 font-mono"
            value={searchLot}
            onChange={e => setSearchLot(e.target.value)}
          />
          <button onClick={executeSearch} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded font-semibold text-white">
            Tracer
          </button>
        </div>

        {tracabilityResult && (
          <div className="mt-6 bg-slate-700 p-4 rounded border border-slate-600">
            {tracabilityResult.error ? (
              <p className="text-red-400">{tracabilityResult.error}</p>
            ) : tracabilityResult.type === 'PF' ? (
              <div>
                <h4 className="text-xl font-bold text-orange-400 mb-2">PRODUIT FINI : {tracabilityResult.lot.id_lot}</h4>
                
                <div className="grid grid-cols-2 gap-6 mt-4">
                  <div className="bg-slate-800 p-4 rounded border border-slate-600">
                    <h5 className="font-semibold text-slate-300 border-b border-slate-600 pb-2 mb-2">⬆️ ASCENDANT (Matières Premières)</h5>
                    <ul className="space-y-2 text-sm text-slate-300">
                      {tracabilityResult.amont.map((mp: any) => (
                        <li key={mp.id_lot}>- {mp.id_lot} ({mp.fournisseur_ou_parcelle})</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="bg-slate-800 p-4 rounded border border-slate-600">
                    <h5 className="font-semibold text-slate-300 border-b border-slate-600 pb-2 mb-2">⬇️ AVAL (Clients Livrés)</h5>
                    <ul className="space-y-2 text-sm text-slate-300">
                      {tracabilityResult.aval.length === 0 ? <li>Aucun client livré.</li> : tracabilityResult.aval.map((c: any, idx: number) => (
                        <li key={idx} className="text-red-400 font-medium">- {c.client} ({c.quantite_livree} unités)</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {tracabilityResult.reclamations.length > 0 && (
                  <div className="mt-4 bg-red-900/50 p-4 rounded border border-red-500">
                    <h5 className="font-semibold text-red-400 flex items-center gap-2"><AlertTriangle className="w-5 h-5"/> Réclamations Liées</h5>
                    <ul className="mt-2 text-sm">
                      {tracabilityResult.reclamations.map((r: any) => (
                        <li key={r.id}>- {r.date_reclamation.split('T')[0]} : {r.motif}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <h4 className="text-xl font-bold text-emerald-400 mb-2">MATIÈRE PREMIÈRE : {tracabilityResult.lot.id_lot}</h4>
                <div className="bg-slate-800 p-4 rounded border border-slate-600 mt-4">
                  <h5 className="font-semibold text-slate-300 border-b border-slate-600 pb-2 mb-2">⬇️ AVAL (Lots Produits)</h5>
                  <ul className="space-y-2 text-sm text-slate-300">
                    {tracabilityResult.aval.length === 0 ? <li>Pas encore utilisée.</li> : tracabilityResult.aval.map((p: any) => (
                      <li key={p.id_lot}>- {p.id_lot} ({p.nom_produit})</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {livraisonModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96 max-w-full">
            <h3 className="text-lg font-bold mb-4">Préparer Expédition</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Sélectionner Lot PF</label>
                <select className="w-full border rounded p-2" onChange={e => setLivraisonForm({...livraisonForm, lot_production_id: e.target.value})}>
                  <option value="">-- Choisir un lot en stock --</option>
                  {agroLotProductions.filter(p => p.statut === 'disponible_à_la_vente').map(p => (
                    <option key={p.id_lot} value={p.id_lot}>{p.id_lot} ({p.quantite_restante ?? p.quantite_produite} restants)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Quantité livrée</label>
                <input type="number" className="w-full border rounded p-2" value={livraisonForm.quantite_livree || ''} onChange={e => setLivraisonForm({...livraisonForm, quantite_livree: Number(e.target.value)})} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setLivraisonModal(null)} className="px-4 py-2 bg-slate-200 text-slate-800 rounded">Annuler</button>
              <button onClick={handleLivraison} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Expédier</button>
            </div>
          </div>
        </div>
      )}

      {reclamationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96 max-w-full">
            <h3 className="text-lg font-bold mb-4">Nouvelle Réclamation</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Lot de Production Concerné (Optionnel)</label>
                <select className="w-full border rounded p-2" onChange={e => setReclamationForm({...reclamationForm, lot_production_id: e.target.value})}>
                  <option value="">-- Aucun lot spécifique --</option>
                  {agroLotProductions.map(p => (
                    <option key={p.id_lot} value={p.id_lot}>{p.id_lot} ({p.nom_produit})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Motif / Description</label>
                <textarea className="w-full border rounded p-2" rows={3} onChange={e => setReclamationForm({...reclamationForm, motif: e.target.value})}></textarea>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setReclamationModal(null)} className="px-4 py-2 bg-slate-200 text-slate-800 rounded">Annuler</button>
              <button onClick={handleReclamation} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Déclarer Litige</button>
            </div>
          </div>
        </div>
      )}

      {/* COMMANDES */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        <h3 className="p-4 border-b font-bold bg-slate-50 flex items-center gap-2"><ShoppingCart className="w-5 h-5"/> Commandes Client</h3>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
            <tr>
              <th className="p-4">Client ID</th>
              <th className="p-4">Produits</th>
              <th className="p-4">Date Prévue</th>
              <th className="p-4">Statut</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {agroCommandes.map(cmd => (
              <tr key={cmd.id} className="hover:bg-slate-50">
                <td className="p-4 font-medium">{cmd.client_id}</td>
                <td className="p-4">{cmd.produits_commandes}</td>
                <td className="p-4">{cmd.date_livraison_prevue}</td>
                <td className="p-4"><span className="px-2 py-1 bg-slate-100 rounded text-xs">{cmd.statut.toUpperCase()}</span></td>
                <td className="p-4 flex gap-2">
                      {cmd.statut === 'enregistrée' && ['RESP_STOCKAGE', 'GERANT'].includes(currentRole || '') && (
                        <button onClick={() => setLivraisonModal({commandeId: cmd.id})} className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">Préparer Expédition</button>
                      )}
                      {cmd.statut === 'préparée' && ['RESP_STOCKAGE', 'GERANT'].includes(currentRole || '') && (
                        <button onClick={() => agroUpdateCommandeStatus(cmd.id, 'livrée')} className="px-2 py-1 bg-teal-600 text-white rounded text-xs hover:bg-teal-700">Marquer Livrée</button>
                      )}
                      {cmd.statut === 'livrée' && ['COMMERCIAL', 'GERANT'].includes(currentRole || '') && (
                        <button onClick={() => agroUpdateCommandeStatus(cmd.id, 'facturée')} className="px-2 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700">Facturer</button>
                      )}
                      {['préparée', 'livrée', 'facturée'].includes(cmd.statut) && ['RESP_TRACABILITE', 'GERANT', 'COMMERCIAL'].includes(currentRole || '') && (
                          <div className="flex gap-2">
                            <button onClick={() => {
                              const fiche = agroFiches.find(f => f.commande_id === cmd.id);
                              if(fiche) alert(`Fiche: ${fiche.id}\nLots finis: ${fiche.lots_produits_finis.join(', ')}\nMP d'origine: ${fiche.lots_matiere_premiere_origine.join(', ')}`);
                              else pushToast('Fiche non trouvée.', 'INFO');
                            }} className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs hover:bg-emerald-200 flex items-center gap-1">
                              <FileText className="w-3 h-3"/> Voir Fiche
                            </button>
                            <button onClick={() => setReclamationModal({commandeId: cmd.id, clientId: cmd.client_id})} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3"/> Réclamation
                            </button>
                          </div>
                      )}
                </td>
              </tr>
            ))}
            {agroCommandes.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-slate-500">Aucune commande.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      
    </div>
  );
}
