import React, { useState } from 'react';
import { useApp } from '../../store';
import { Building, Plus, AlertCircle } from 'lucide-react';

export function AccountantAssets() {
  const { assets, accountingAccounts, createAsset } = useApp();
  const [showNewAsset, setShowNewAsset] = useState(false);
  
  const [newAsset, setNewAsset] = useState({
    name: '',
    accountId: '',
    purchaseDate: new Date().toISOString().substring(0, 10),
    purchaseValue: 0,
    amortizationType: 'LINEAIRE' as 'LINEAIRE' | 'DEGRESSIF',
    amortizationDurationYears: 5
  });

  const handleSubmit = async () => {
    if (!newAsset.name || !newAsset.accountId || newAsset.purchaseValue <= 0) {
      alert("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    await createAsset(newAsset);
    setShowNewAsset(false);
    setNewAsset({
      name: '', accountId: '', purchaseDate: new Date().toISOString().substring(0, 10),
      purchaseValue: 0, amortizationType: 'LINEAIRE', amortizationDurationYears: 5
    });
  };

  const calculateAmortization = (asset: any) => {
    const currentDate = new Date();
    const purchaseDate = new Date(asset.purchaseDate);
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysElapsed = (currentDate.getTime() - purchaseDate.getTime()) / msPerDay;
    
    if (daysElapsed < 0) return { cumulated: 0, vnc: asset.purchaseValue };
    
    // Règle comptable stricte : prorata temporis en jours (année comptable OHADA = 360 jours)
    const yearsElapsed = daysElapsed / 360;
    const yearlyRate = 1 / asset.amortizationDurationYears;
    const cumulated = Math.min(asset.purchaseValue, asset.purchaseValue * yearlyRate * yearsElapsed);
    return { cumulated, vnc: asset.purchaseValue - cumulated };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 border border-slate-200 rounded-sm shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Building size={20} className="text-indigo-600" />
            Immobilisations & Amortissements
          </h2>
          <p className="text-sm text-slate-500">Registre des actifs (Classe 2) et calculs d'amortissements.</p>
        </div>
        <button 
          onClick={() => setShowNewAsset(!showNewAsset)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-sm text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"
        >
          {showNewAsset ? 'Fermer' : <><Plus size={16} /> Ajouter une immobilisation</>}
        </button>
      </div>

      {showNewAsset && (
        <div className="bg-white border border-indigo-200 rounded-sm p-6 shadow-sm mb-6 animate-in fade-in slide-in-from-top-4">
          <h3 className="font-semibold text-slate-800 mb-4">Nouvelle Immobilisation</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nom du bien</label>
              <input 
                type="text" 
                value={newAsset.name} 
                onChange={e => setNewAsset({...newAsset, name: e.target.value})}
                placeholder="Ex: Véhicule Toyota Hilux"
                className="w-full border border-slate-300 rounded-sm text-sm px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Compte d'immobilisation (Classe 2)</label>
              <select 
                value={newAsset.accountId} 
                onChange={e => setNewAsset({...newAsset, accountId: e.target.value})}
                className="w-full border border-slate-300 rounded-sm text-sm px-3 py-2"
              >
                <option value="">Sélectionner...</option>
                {accountingAccounts.filter((a: any) => a.class === 2).map((a: any) => (
                  <option key={a.id} value={a.id}>{a.accountNumber} - {a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Date d'acquisition</label>
              <input 
                type="date" 
                value={newAsset.purchaseDate} 
                onChange={e => setNewAsset({...newAsset, purchaseDate: e.target.value})}
                className="w-full border border-slate-300 rounded-sm text-sm px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Valeur d'acquisition (GNF)</label>
              <input 
                type="number" 
                value={newAsset.purchaseValue || ''} 
                onChange={e => setNewAsset({...newAsset, purchaseValue: Number(e.target.value)})}
                className="w-full border border-slate-300 rounded-sm text-sm px-3 py-2 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Type d'amortissement</label>
              <select 
                value={newAsset.amortizationType} 
                onChange={e => setNewAsset({...newAsset, amortizationType: e.target.value as any})}
                className="w-full border border-slate-300 rounded-sm text-sm px-3 py-2"
              >
                <option value="LINEAIRE">Linéaire</option>
                <option value="DEGRESSIF">Dégressif</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Durée (Années)</label>
              <input 
                type="number" 
                value={newAsset.amortizationDurationYears || ''} 
                onChange={e => setNewAsset({...newAsset, amortizationDurationYears: Number(e.target.value)})}
                className="w-full border border-slate-300 rounded-sm text-sm px-3 py-2"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button 
              onClick={handleSubmit}
              className="bg-emerald-600 text-white px-6 py-2 rounded-sm text-sm font-bold hover:bg-emerald-700"
            >
              Enregistrer l'immobilisation
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
            <tr>
              <th className="px-6 py-3">Immobilisation</th>
              <th className="px-6 py-3">Compte / Date</th>
              <th className="px-6 py-3 text-right">Valeur d'Acquisition</th>
              <th className="px-6 py-3 text-right">Amort. Cumulés</th>
              <th className="px-6 py-3 text-right">VNC</th>
              <th className="px-6 py-3 text-center">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {assets.length > 0 ? (
              assets.map((asset: any) => {
                const account = accountingAccounts.find((a: any) => a.id === asset.accountId);
                const stats = calculateAmortization(asset);
                return (
                  <tr key={asset.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">{asset.name}</div>
                      <div className="text-xs text-slate-500">{asset.amortizationType} ({asset.amortizationDurationYears} ans)</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-700 font-mono text-xs mb-1">{account?.accountNumber} - {account?.name}</div>
                      <div className="text-slate-500 text-xs">Acquis le {new Date(asset.purchaseDate).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-right font-medium text-slate-800">
                      {asset.purchaseValue.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-mono text-right text-rose-600">
                      {stats.cumulated.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-mono text-right font-bold text-emerald-600">
                      {stats.vnc.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${asset.status === 'ACTIF' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                        {asset.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                  <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
                  Aucune immobilisation enregistrée.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
