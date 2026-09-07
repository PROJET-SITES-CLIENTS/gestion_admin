import React, { useState } from 'react';
import { useApp } from '../../store';
import { Plus, CheckCircle, Receipt } from 'lucide-react';
import { ExpenseCategory, Expense } from '../../types';

export function AccountantExpenses() {
  const { expenses, addExpense, updateExpenseStatus, treasuryAccounts, addTransaction, btpChantiers, companyConfig } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [chantierFilter, setChantierFilter] = useState('');
  const [newExp, setNewExp] = useState<Partial<Expense>>({
    category: 'AUTRE', amountHT: 0, tvaAmount: 0, amountTTC: 0, date: new Date().toISOString().slice(0, 10), description: '', chantier_id: ''
  });
  const [hasTva, setHasTva] = useState(false);

  const handleAmountChange = (val: number, withTva: boolean) => {
    if (withTva) {
      const tvaRate = (companyConfig.tvaRate || 18) / 100;
      const tva = Math.round(val * tvaRate);
      setNewExp(prev => ({ ...prev, amountHT: val, tvaAmount: tva, amountTTC: val + tva }));
    } else {
      setNewExp(prev => ({ ...prev, amountHT: val, tvaAmount: 0, amountTTC: val }));
    }
  };

  const handleAdd = () => {
    if (!newExp.description || !newExp.amountTTC) return;
    addExpense({
      category: newExp.category as ExpenseCategory,
      amountHT: newExp.amountHT || 0,
      tvaAmount: newExp.tvaAmount || 0,
      amountTTC: newExp.amountTTC || 0,
      description: newExp.description,
      date: newExp.date || new Date().toISOString().slice(0, 10),
      chantier_id: newExp.chantier_id || '',
      status: 'PENDING'
    });
    setShowAdd(false);
    setNewExp({ category: 'AUTRE', amountHT: 0, tvaAmount: 0, amountTTC: 0, date: new Date().toISOString().slice(0, 10), description: '', chantier_id: '' });
  };

  const markPaid = async (expense: Expense, accountId: string) => {
    // Transaction D'ABORD : si elle échoue, la dépense n'est pas marquée PAYÉE
    const ok = await addTransaction({
      accountId,
      type: 'DEBIT',
      amount: expense.amountTTC || expense.amount || 0,
      referenceId: expense.id,
      category: expense.category,
      description: `Paiement Charge: ${expense.description}`
    });
    if (ok) await updateExpenseStatus(expense.id, 'PAID');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Dépenses & Fournisseurs</h2>
          <p className="text-sm text-slate-500">Gérez les charges, les dettes fournisseurs et la TVA déductible.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2">
          <Plus size={16} /> Nouvelle Dépense
        </button>
      </div>

      {showAdd && (
        <div className="bg-white p-6 border border-slate-200 rounded-sm shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800">Saisir une Dépense / Facture Fournisseur</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Catégorie</label>
              <select value={newExp.category} onChange={e => setNewExp({...newExp, category: e.target.value as ExpenseCategory})} className="w-full border-slate-300 rounded-sm text-sm">
                <option value="ACHAT_MARCHANDISE">Achat Marchandises</option>
                <option value="LOYER">Loyer</option>
                <option value="ELECTRICITE">Électricité / Eau</option>
                <option value="INTERNET">Internet & Télécom</option>
                <option value="FOURNITURES">Fournitures de bureau</option>
                <option value="AUTRE">Autre charge</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Description / Motif</label>
              <input type="text" value={newExp.description} onChange={e => setNewExp({...newExp, description: e.target.value})} className="w-full border-slate-300 rounded-sm text-sm" placeholder="Ex: Facture Orange, Matériel..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">TVA Déductible ? (18%)</label>
              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" checked={hasTva} onChange={e => {
                  setHasTva(e.target.checked);
                  handleAmountChange(newExp.amountHT || 0, e.target.checked);
                }} className="rounded text-indigo-600 focus:ring-indigo-500" />
                <span className="text-sm text-slate-700">Oui, la facture inclut de la TVA récupérable</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Rattacher à un chantier BTP (optionnel)</label>
              <select value={newExp.chantier_id || ''} onChange={e => setNewExp({ ...newExp, chantier_id: e.target.value })} className="w-full border-slate-300 rounded-sm text-sm">
                <option value="">— Aucun (charge générale) —</option>
                {btpChantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Montant HT (GNF)</label>
              <input type="number" value={newExp.amountHT} onChange={e => handleAmountChange(Number(e.target.value), hasTva)} className="w-full border-slate-300 rounded-sm text-sm font-mono" />
            </div>
          </div>
          
          <div className="bg-slate-50 p-4 rounded-sm flex justify-between items-center">
            <div className="flex gap-8">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">TVA Déductible</p>
                <p className="font-mono text-slate-700">{newExp.tvaAmount?.toLocaleString()} GNF</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">Montant Total (TTC)</p>
                <p className="font-mono font-bold text-xl text-indigo-700">{newExp.amountTTC?.toLocaleString()} GNF</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(false)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-sm text-sm font-medium">Annuler</button>
              <button onClick={handleAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-sm text-sm font-medium">Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* Filtre par chantier (rentabilité BTP) */}
      {btpChantiers.length > 0 && (
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Filtrer par chantier</label>
          <select value={chantierFilter} onChange={e => setChantierFilter(e.target.value)} className="border-slate-300 rounded-sm text-sm py-1.5 px-2 max-w-xs">
            <option value="">Toutes les dépenses</option>
            {btpChantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-sm shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-600 font-medium">
            <tr>
              <th className="py-3 px-6">Date</th>
              <th className="py-3 px-6">Catégorie</th>
              <th className="py-3 px-6">Description</th>
              <th className="py-3 px-6 text-right">Montant HT</th>
              <th className="py-3 px-6 text-right">TVA</th>
              <th className="py-3 px-6 text-right">TTC</th>
              <th className="py-3 px-6 text-center">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {expenses.filter(exp => !chantierFilter || exp.chantier_id === chantierFilter).slice().sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(exp => (
              <tr key={exp.id} className="hover:bg-slate-50">
                <td className="py-3 px-6 text-slate-500">{new Date(exp.date).toLocaleDateString()}</td>
                <td className="py-3 px-6"><span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-sm text-[10px] uppercase font-bold">{exp.category}</span></td>
                <td className="py-3 px-6 font-medium text-slate-800">
                  {exp.description}
                  {exp.chantier_id && (
                    <span className="ml-2 text-[9.5px] font-bold uppercase tracking-wide text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-1.5 py-0.5 align-middle">
                      {btpChantiers.find(c => c.id === exp.chantier_id)?.nom?.slice(0, 22) ?? 'chantier'}
                    </span>
                  )}
                </td>
                <td className="py-3 px-6 text-right font-mono text-slate-600">{(exp.amountHT ?? exp.amount)?.toLocaleString()}</td>
                <td className="py-3 px-6 text-right font-mono text-slate-500">{exp.tvaAmount > 0 ? `+${exp.tvaAmount?.toLocaleString()}` : '-'}</td>
                <td className="py-3 px-6 text-right font-mono font-bold text-slate-800">{(exp.amountTTC ?? exp.amount)?.toLocaleString()} GNF</td>
                <td className="py-3 px-6 text-center">
                  {exp.status === 'PAID' ? (
                    <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-sm text-xs font-semibold">PAYÉ</span>
                  ) : exp.status === 'REJECTED' ? (
                    <div className="flex flex-col items-center group relative cursor-help">
                      <span className="bg-rose-100 text-rose-700 px-2 py-1 rounded-sm text-xs font-semibold">REJETÉ</span>
                      {exp.rejectionReason && (
                        <div className="hidden group-hover:block absolute bottom-full mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded shadow-lg z-10">
                          {exp.rejectionReason}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1 items-center">
                      <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-sm text-xs font-semibold mb-1">À PAYER</span>
                      <div className="flex items-center gap-1">
                        <select onChange={(e) => {
                          if (e.target.value && window.confirm(`Payer ${(exp.amountTTC ?? exp.amount ?? 0).toLocaleString('fr-FR')} GNF via « ${treasuryAccounts.find(a => a.id === e.target.value)?.name} » ?`)) {
                            markPaid(exp, e.target.value);
                          } else {
                            e.target.value = '';
                          }
                        }} className="text-[10px] border-slate-300 rounded-sm py-1 pr-6" defaultValue="">
                          <option value="" disabled>Payer avec...</option>
                          {treasuryAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                        <button 
                          onClick={() => {
                            const reason = window.prompt('Motif du rejet :');
                            if (reason !== null) {
                              updateExpenseStatus(exp.id, 'REJECTED', reason);
                            }
                          }}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-sm transition-colors"
                          title="Rejeter la dépense"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </button>
                      </div>
                    </div>
                  )}
                  {/* Annulation (suppression logique) */}
                  {exp.status !== 'CANCELLED' && exp.status !== 'PAID' && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Annuler la dépense « ${exp.description} » (${(exp.amountTTC ?? exp.amount ?? 0).toLocaleString('fr-FR')} GNF) ?\n\nLa dépense sera marquée ANNULEE et exclue de tous les calculs.`)) {
                          updateExpenseStatus(exp.id, 'CANCELLED' as any, 'Annulée par le comptable');
                        }
                      }}
                      className="p-1.5 text-slate-500 hover:bg-slate-100 border border-slate-200 rounded-sm transition-colors"
                      title="Annuler la dépense"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
                    </button>
                  )}
                  {exp.status === 'CANCELLED' && (
                    <span className="bg-slate-200 text-slate-500 px-2 py-1 rounded-sm text-xs font-semibold">ANNULÉE</span>
                  )}
                </td>
              </tr>
            ))}
            {expenses.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-slate-500">Aucune dépense.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
