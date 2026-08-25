import React, { useState } from 'react';
import { useApp } from '../../store';
import { Building, Plus, ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react';
import { TreasuryAccount, TreasuryAccountType } from '../../types';

export function AccountantTreasury() {
  const { treasuryAccounts, transactions, addTreasuryAccount } = useApp();
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAcc, setNewAcc] = useState<{name: string, type: TreasuryAccountType}>({ name: '', type: 'BANQUE' });

  const totalBalance = treasuryAccounts.reduce((acc, curr) => acc + curr.balance, 0);

  const handleAdd = () => {
    if (newAcc.name) {
      addTreasuryAccount(newAcc);
      setShowAddAccount(false);
      setNewAcc({ name: '', type: 'BANQUE' });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900"><span className="font-serif italic font-normal text-indigo-600 mr-1.5">La trésorerie</span>& comptes</h2>
          <p className="text-sm text-slate-500">Gérez vos comptes bancaires, caisses et mobile money.</p>
        </div>
        <button onClick={() => setShowAddAccount(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2">
          <Plus size={16} /> Ajouter un compte
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 text-white p-6 rounded-sm shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-slate-400 text-sm font-medium">Solde Global</p>
            <h3 className="text-3xl font-bold mt-1 font-mono">{totalBalance.toLocaleString()} <span className="text-lg text-slate-400">GNF</span></h3>
          </div>
          <Wallet className="self-end text-slate-700 mt-4" size={48} />
        </div>

        {treasuryAccounts.map(acc => (
          <div key={acc.id} className="bg-white border border-slate-200 p-6 rounded-sm shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <p className="text-slate-500 text-xs font-semibold uppercase">{acc.type}</p>
                <Building size={16} className="text-slate-400" />
              </div>
              <p className="font-bold text-slate-800 mt-1 truncate">{acc.name}</p>
              <h3 className="text-2xl font-bold mt-3 font-mono text-slate-700">{acc.balance.toLocaleString()} <span className="text-sm">GNF</span></h3>
            </div>
          </div>
        ))}
      </div>

      {showAddAccount && (
        <div className="bg-white p-4 border border-slate-200 rounded-sm shadow-sm flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-600 mb-1">Nom du compte</label>
            <input type="text" value={newAcc.name} onChange={e => setNewAcc({...newAcc, name: e.target.value})} className="w-full border-slate-300 rounded-sm text-sm" placeholder="Ex: Ecobank Principal" />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
            <select value={newAcc.type} onChange={e => setNewAcc({...newAcc, type: e.target.value as TreasuryAccountType})} className="w-full border-slate-300 rounded-sm text-sm">
              <option value="BANQUE">Banque</option>
              <option value="CAISSE">Caisse (Espèces)</option>
              <option value="MOBILE_MONEY">Mobile Money</option>
            </select>
          </div>
          <button onClick={handleAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-sm text-sm font-medium">Créer</button>
          <button onClick={() => setShowAddAccount(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-sm text-sm font-medium">Annuler</button>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-sm shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">Historique des Transactions</h3>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-600 font-medium">
            <tr>
              <th className="py-3 px-6">Date</th>
              <th className="py-3 px-6">Compte</th>
              <th className="py-3 px-6">Catégorie</th>
              <th className="py-3 px-6">Description</th>
              <th className="py-3 px-6 text-right">Montant</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transactions.slice().sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(tx => {
              const acc = treasuryAccounts.find(a => a.id === tx.accountId);
              return (
                <tr key={tx.id} className="hover:bg-slate-50">
                  <td className="py-3 px-6 text-slate-500">{new Date(tx.date).toLocaleString()}</td>
                  <td className="py-3 px-6 font-medium">{acc?.name || 'Inconnu'}</td>
                  <td className="py-3 px-6"><span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-sm text-[10px] uppercase font-bold tracking-wider">{tx.category}</span></td>
                  <td className="py-3 px-6 text-slate-700">{tx.description}</td>
                  <td className={`py-3 px-6 text-right font-bold font-mono ${tx.type === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    <div className="flex items-center justify-end gap-1">
                      {tx.type === 'CREDIT' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      {tx.amount.toLocaleString()} GNF
                    </div>
                  </td>
                </tr>
              )
            })}
            {transactions.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-slate-500">Aucune transaction enregistrée.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
