import React, { useState } from 'react';
import { useApp } from '../../store';
import { Layers, Plus, Filter, Lock, Edit3 } from 'lucide-react';
import { AccountingEntry } from '../../types';

export function AccountantLedger() {
  const { accountingEntries, accountingJournals, accountingAccounts, postAccountingEntry, validateAccountingEntry } = useApp();
  
  const [selectedJournal, setSelectedJournal] = useState<string>('ALL');
  const [showNewEntry, setShowNewEntry] = useState(false);

  // Formulaire Nouvelle Écriture
  const [newEntry, setNewEntry] = useState({
    journalId: '',
    date: new Date().toISOString().substring(0, 10),
    reference: '',
    description: '',
    lines: [{ accountId: '', debit: 0, credit: 0, label: '' }, { accountId: '', debit: 0, credit: 0, label: '' }]
  });

  const filteredEntries = accountingEntries
    .filter(e => selectedJournal === 'ALL' || e.journalId === selectedJournal)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleAddLine = () => {
    setNewEntry(prev => ({
      ...prev,
      lines: [...prev.lines, { accountId: '', debit: 0, credit: 0, label: '' }]
    }));
  };

  const handleUpdateLine = (index: number, field: string, value: any) => {
    const newLines = [...newEntry.lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setNewEntry(prev => ({ ...prev, lines: newLines }));
  };

  const totalDebit = newEntry.lines.reduce((acc, l) => acc + Number(l.debit || 0), 0);
  const totalCredit = newEntry.lines.reduce((acc, l) => acc + Number(l.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const handleSubmit = async () => {
    if (!newEntry.journalId || !newEntry.reference || !newEntry.description) {
      alert("Veuillez remplir les informations générales.");
      return;
    }
    const hasEmptyAccounts = newEntry.lines.some(l => !l.accountId || l.accountId.trim() === '');
    if (hasEmptyAccounts) {
      alert("Veuillez sélectionner un compte pour chaque ligne de l'écriture.");
      return;
    }
    if (!isBalanced) {
      alert("L'écriture n'est pas équilibrée (Débit ≠ Crédit).");
      return;
    }
    await postAccountingEntry(newEntry);
    setShowNewEntry(false);
    setNewEntry({
      journalId: '',
      date: new Date().toISOString().substring(0, 10),
      reference: '',
      description: '',
      lines: [{ accountId: '', debit: 0, credit: 0, label: '' }, { accountId: '', debit: 0, credit: 0, label: '' }]
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 border border-slate-200 rounded-sm shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Layers size={20} className="text-indigo-600" />
            Journaux et Grand Livre
          </h2>
          <p className="text-sm text-slate-500">Saisie des écritures (OD) et consultation de la piste d'audit.</p>
        </div>
        <button 
          onClick={() => setShowNewEntry(!showNewEntry)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-sm text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"
        >
          {showNewEntry ? 'Fermer' : <><Plus size={16} /> Saisir une Écriture</>}
        </button>
      </div>

      {showNewEntry && (
        <div className="bg-white border border-indigo-200 rounded-sm p-6 shadow-sm mb-6 animate-in fade-in slide-in-from-top-4">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Edit3 size={16} className="text-indigo-600" /> Saisie Libre (Partie Double)
          </h3>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Journal</label>
              <select 
                value={newEntry.journalId} 
                onChange={e => setNewEntry({...newEntry, journalId: e.target.value})}
                className="w-full border border-slate-300 rounded-sm text-sm px-3 py-2"
              >
                <option value="">Sélectionner...</option>
                {accountingJournals.map(j => <option key={j.id} value={j.id}>{j.code} - {j.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Date</label>
              <input 
                type="date" 
                value={newEntry.date} 
                onChange={e => setNewEntry({...newEntry, date: e.target.value})}
                className="w-full border border-slate-300 rounded-sm text-sm px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Pièce Jointe / Réf</label>
              <input 
                type="text" 
                value={newEntry.reference} 
                onChange={e => setNewEntry({...newEntry, reference: e.target.value})}
                placeholder="Ex: FAC-2026-001"
                className="w-full border border-slate-300 rounded-sm text-sm px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Libellé de l'opération</label>
              <input 
                type="text" 
                value={newEntry.description} 
                onChange={e => setNewEntry({...newEntry, description: e.target.value})}
                placeholder="Ex: Facture vente marchandises"
                className="w-full border border-slate-300 rounded-sm text-sm px-3 py-2"
              />
            </div>
          </div>

          <table className="w-full text-sm text-left mb-4">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-4 py-2 w-1/3">Compte (SYSCOHADA)</th>
                <th className="px-4 py-2">Libellé ligne</th>
                <th className="px-4 py-2 w-32">Débit (GNF)</th>
                <th className="px-4 py-2 w-32">Crédit (GNF)</th>
              </tr>
            </thead>
            <tbody>
              {newEntry.lines.map((line, idx) => (
                <tr key={idx} className="border-b border-slate-100">
                  <td className="px-4 py-2">
                    <select 
                      value={line.accountId}
                      onChange={e => handleUpdateLine(idx, 'accountId', e.target.value)}
                      className="w-full border border-slate-200 rounded-sm px-2 py-1.5 text-xs"
                    >
                      <option value="">Compte...</option>
                      {accountingAccounts.map(a => <option key={a.id} value={a.id}>{a.accountNumber} - {a.name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input 
                      type="text" 
                      value={line.label} 
                      onChange={e => handleUpdateLine(idx, 'label', e.target.value)}
                      placeholder="Libellé optionnel"
                      className="w-full border border-slate-200 rounded-sm px-2 py-1.5 text-xs"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input 
                      type="number" 
                      value={line.debit || ''} 
                      onChange={e => { handleUpdateLine(idx, 'debit', Number(e.target.value)); handleUpdateLine(idx, 'credit', 0); }}
                      className="w-full border border-slate-200 rounded-sm px-2 py-1.5 text-xs font-mono text-right"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input 
                      type="number" 
                      value={line.credit || ''} 
                      onChange={e => { handleUpdateLine(idx, 'credit', Number(e.target.value)); handleUpdateLine(idx, 'debit', 0); }}
                      className="w-full border border-slate-200 rounded-sm px-2 py-1.5 text-xs font-mono text-right"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-between items-center">
            <button onClick={handleAddLine} className="text-indigo-600 text-sm font-medium hover:underline">+ Ajouter une ligne</button>
            
            <div className="flex items-center gap-6">
              <div className="flex gap-4 font-mono text-sm">
                <span className="text-slate-500">Total Débit : <span className="text-slate-800 font-semibold">{totalDebit.toLocaleString()}</span></span>
                <span className="text-slate-500">Total Crédit : <span className="text-slate-800 font-semibold">{totalCredit.toLocaleString()}</span></span>
              </div>
              
              <button 
                onClick={handleSubmit}
                disabled={!isBalanced}
                className={`px-6 py-2 rounded-sm text-sm font-bold ${isBalanced ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
              >
                Enregistrer l'écriture
              </button>
            </div>
          </div>
          {!isBalanced && totalDebit > 0 && (
            <p className="text-xs text-rose-500 mt-2 text-right">Les montants Débit et Crédit doivent être égaux.</p>
          )}
        </div>
      )}

      {/* Liste des Écritures */}
      <div className="bg-white border border-slate-200 rounded-sm">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-4">
            <Filter size={16} className="text-slate-400" />
            <select 
              value={selectedJournal}
              onChange={e => setSelectedJournal(e.target.value)}
              className="border border-slate-300 rounded-sm text-sm px-3 py-1.5 bg-white font-medium text-slate-700"
            >
              <option value="ALL">Tous les journaux</option>
              {accountingJournals.map(j => <option key={j.id} value={j.id}>{j.code} - {j.name}</option>)}
            </select>
          </div>
          <span className="text-sm font-medium text-slate-500">{filteredEntries.length} écritures trouvées</span>
        </div>
        
        <div className="divide-y divide-slate-100">
          {filteredEntries.map(entry => {
            const journal = accountingJournals.find(j => j.id === entry.journalId);
            return (
              <div key={entry.id} className="p-4 hover:bg-slate-50 transition-colors group">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-xs font-bold">{journal?.code}</span>
                      <span className="text-sm font-medium text-slate-800">{new Date(entry.date).toLocaleDateString()}</span>
                      <span className="text-slate-300">|</span>
                      <span className="text-sm text-slate-600">Réf: <span className="font-mono">{entry.reference}</span></span>
                    </div>
                    <p className="text-sm text-slate-900 font-medium">{entry.description}</p>
                  </div>
                  <div>
                    {entry.status === 'VALIDATED' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                        <Lock size={12} /> Verrouillé
                      </span>
                    ) : (
                      <button 
                        onClick={() => {
                          if(confirm("Le verrouillage est irréversible (Piste d'audit légale). Confirmer ?")) {
                            validateAccountingEntry(entry.id);
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                      >
                        Valider (Verrouiller)
                      </button>
                    )}
                  </div>
                </div>
                
                <table className="w-full text-xs text-left mt-2 border border-slate-200 rounded-sm overflow-hidden">
                  <thead className="bg-slate-100 text-slate-500">
                    <tr>
                      <th className="px-3 py-1.5 w-1/4">Compte</th>
                      <th className="px-3 py-1.5">Libellé</th>
                      <th className="px-3 py-1.5 text-right w-24">Débit</th>
                      <th className="px-3 py-1.5 text-right w-24">Crédit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entry.lines.map((l: any, i: number) => {
                      const account = accountingAccounts.find(a => a.id === l.accountId);
                      return (
                        <tr key={i} className="border-t border-slate-100">
                          <td className="px-3 py-1.5 font-mono font-medium text-slate-700">{account?.accountNumber} - {account?.name}</td>
                          <td className="px-3 py-1.5 text-slate-600">{l.label}</td>
                          <td className="px-3 py-1.5 font-mono text-right text-slate-800">{l.debit > 0 ? l.debit.toLocaleString() : ''}</td>
                          <td className="px-3 py-1.5 font-mono text-right text-slate-800">{l.credit > 0 ? l.credit.toLocaleString() : ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
          
          {filteredEntries.length === 0 && (
            <div className="p-8 text-center text-slate-500">Aucune écriture trouvée dans ce journal.</div>
          )}
        </div>
      </div>
    </div>
  );
}
