import React, { useState } from 'react';
import { useApp } from '../../store';
import { BookOpen, Search, Plus, Filter, AlertCircle } from 'lucide-react';

export function AccountantChart() {
  const { accountingAccounts, createAccountingAccount } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<number | 'ALL'>('ALL');
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [newAccount, setNewAccount] = useState({ accountNumber: '', name: '', class: 1 });

  const handleCreateAccount = async () => {
    if (!newAccount.accountNumber || !newAccount.name) {
      alert("Veuillez remplir tous les champs.");
      return;
    }
    await createAccountingAccount(newAccount);
    setShowNewAccount(false);
    setNewAccount({ accountNumber: '', name: '', class: 1 });
  };

  const filteredAccounts = accountingAccounts
    .filter((a: any) => selectedClass === 'ALL' || a.class === selectedClass)
    .filter((a: any) => 
      a.accountNumber.includes(searchTerm) || 
      a.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a: any, b: any) => a.accountNumber.localeCompare(b.accountNumber));

  // Default OHADA Classes
  const OHADA_CLASSES = [
    { id: 1, name: 'Classe 1 - Comptes de ressources durables' },
    { id: 2, name: 'Classe 2 - Comptes d\'actif immobilisé' },
    { id: 3, name: 'Classe 3 - Comptes de stocks' },
    { id: 4, name: 'Classe 4 - Comptes de tiers (Clients, Fournisseurs, État)' },
    { id: 5, name: 'Classe 5 - Comptes de trésorerie (Banque, Caisse)' },
    { id: 6, name: 'Classe 6 - Comptes de charges' },
    { id: 7, name: 'Classe 7 - Comptes de produits' },
    { id: 8, name: 'Classe 8 - Comptes des autres charges et produits' },
    { id: 9, name: 'Classe 9 - Comptes de la comptabilité analytique' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 border border-slate-200 rounded-sm shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <BookOpen size={20} className="text-indigo-600" />
            Plan Comptable SYSCOHADA
          </h2>
          <p className="text-sm text-slate-500">Gestion des comptes et nomenclature OHADA.</p>
        </div>
        <button 
          className="bg-indigo-600 text-white px-4 py-2 rounded-sm text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"
          onClick={() => setShowNewAccount(!showNewAccount)}
        >
          {showNewAccount ? 'Fermer' : <><Plus size={16} /> Nouveau Compte</>}
        </button>
      </div>

      {showNewAccount && (
        <div className="bg-white border border-indigo-200 rounded-sm p-6 shadow-sm mb-6 animate-in fade-in slide-in-from-top-4">
          <h3 className="font-semibold text-slate-800 mb-4">Créer un nouveau compte</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Classe</label>
              <select 
                value={newAccount.class} 
                onChange={e => setNewAccount({...newAccount, class: Number(e.target.value)})}
                className="w-full border border-slate-300 rounded-sm text-sm px-3 py-2"
              >
                {[1,2,3,4,5,6,7,8,9].map(c => (
                  <option key={c} value={c}>Classe {c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Numéro de compte</label>
              <input 
                type="text" 
                value={newAccount.accountNumber} 
                onChange={e => setNewAccount({...newAccount, accountNumber: e.target.value})}
                placeholder="Ex: 411001"
                className="w-full border border-slate-300 rounded-sm text-sm px-3 py-2 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Libellé du compte</label>
              <input 
                type="text" 
                value={newAccount.name} 
                onChange={e => setNewAccount({...newAccount, name: e.target.value})}
                placeholder="Ex: Client XYZ"
                className="w-full border border-slate-300 rounded-sm text-sm px-3 py-2"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button 
              onClick={handleCreateAccount}
              className="bg-emerald-600 text-white px-6 py-2 rounded-sm text-sm font-bold hover:bg-emerald-700"
            >
              Enregistrer le compte
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-6">
        <div className="col-span-1 space-y-4">
          <div className="bg-white border border-slate-200 rounded-sm p-4">
            <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Filter size={16} /> Classes
            </h3>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedClass('ALL')}
                className={`w-full text-left px-3 py-2 rounded-sm text-sm ${selectedClass === 'ALL' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                Toutes les classes
              </button>
              {OHADA_CLASSES.map(cls => (
                <button
                  key={cls.id}
                  onClick={() => setSelectedClass(cls.id)}
                  className={`w-full text-left px-3 py-2 rounded-sm text-xs transition-colors ${selectedClass === cls.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  {cls.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-3">
          <div className="bg-white border border-slate-200 rounded-sm overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="relative w-96">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher un compte (numéro ou nom)..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <span className="text-sm font-medium text-slate-500">{filteredAccounts.length} comptes trouvés</span>
            </div>

            <div className="overflow-x-auto h-[600px] overflow-y-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Compte</th>
                    <th className="px-6 py-3">Intitulé SYSCOHADA</th>
                    <th className="px-6 py-3">Classe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAccounts.length > 0 ? (
                    filteredAccounts.map((account: any) => (
                      <tr key={account.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-3 font-mono font-medium text-slate-700">
                          {account.accountNumber}
                        </td>
                        <td className="px-6 py-3 text-slate-800">
                          {account.name}
                        </td>
                        <td className="px-6 py-3">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                            Classe {account.class}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center">
                        <div className="inline-flex flex-col items-center justify-center text-slate-400">
                          <AlertCircle size={32} className="mb-2 opacity-50" />
                          <p>Aucun compte ne correspond à votre recherche.</p>
                          {accountingAccounts.length === 0 && (
                            <p className="text-xs mt-1">Le plan comptable n'a pas été initialisé.</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
