import React from 'react';
import { useApp } from '../../store';
import { Receipt, ArrowDownRight, ArrowUpRight } from 'lucide-react';

export function AccountantTaxes() {
  const { accountingEntries, accountingAccounts, companyConfig } = useApp();

  const tvaRate = companyConfig.tvaRate || 18;

  // TVA Collectée (sur les ventes) : Compte 443 (Crédit)
  const tvaCollecteeAcc = accountingAccounts.find(a => a.accountNumber.startsWith('443'));
  const tvaCollectee = !tvaCollecteeAcc ? 0 : accountingEntries
    .filter(e => e.status === 'VALIDATED')
    .flatMap(e => e.lines)
    .filter(l => l.accountId === tvaCollecteeAcc.id)
    .reduce((acc, l) => acc + ((l.credit || 0) - (l.debit || 0)), 0);

  // TVA Déductible (sur les achats) : Compte 445 (Débit)
  const tvaDeductibleAcc = accountingAccounts.find(a => a.accountNumber.startsWith('445'));
  const tvaDeductible = !tvaDeductibleAcc ? 0 : accountingEntries
    .filter(e => e.status === 'VALIDATED')
    .flatMap(e => e.lines)
    .filter(l => l.accountId === tvaDeductibleAcc.id)
    .reduce((acc, l) => acc + ((l.debit || 0) - (l.credit || 0)), 0);

  // TVA Nette à payer
  const tvaNette = tvaCollectee - tvaDeductible;

  // Calcul factice pour affichage HT (rétrocalculé depuis la TVA pour le visuel)
  const ventesTTC = tvaCollectee > 0 ? (tvaCollectee / (tvaRate / 100)) * (1 + (tvaRate / 100)) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-xl font-bold text-slate-800">TVA & Fiscalité</h2>
        <p className="text-sm text-slate-500">Déclaration de TVA (Taux en vigueur : {tvaRate}%)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 p-6 rounded-sm shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <ArrowDownRight size={16} />
            </div>
            <h3 className="text-sm font-bold text-slate-700">TVA Collectée (Ventes)</h3>
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono mt-4">{tvaCollectee.toLocaleString(undefined, {maximumFractionDigits:0})} <span className="text-sm">GNF</span></p>
          <p className="text-xs text-slate-500 mt-1">D'après les écritures validées du compte 443</p>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-sm shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
              <ArrowUpRight size={16} />
            </div>
            <h3 className="text-sm font-bold text-slate-700">TVA Déductible (Achats)</h3>
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono mt-4">{tvaDeductible.toLocaleString(undefined, {maximumFractionDigits:0})} <span className="text-sm">GNF</span></p>
          <p className="text-xs text-slate-500 mt-1">D'après les écritures validées du compte 445</p>
        </div>

        <div className={`p-6 rounded-sm shadow-sm flex flex-col justify-center ${tvaNette > 0 ? 'bg-indigo-600 text-white' : 'bg-emerald-500 text-white'}`}>
          <h3 className="text-sm font-bold opacity-90">{tvaNette > 0 ? 'TVA à décaisser (Dû à l\'État)' : 'Crédit de TVA (À reporter)'}</h3>
          <p className="text-3xl font-bold font-mono mt-2">{Math.abs(tvaNette).toLocaleString(undefined, {maximumFractionDigits:0})} <span className="text-base">GNF</span></p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-sm shadow-sm p-6 flex items-center justify-center gap-4 text-slate-500">
        <Receipt size={48} className="opacity-50" />
        <div>
          <p className="font-semibold text-slate-700">Génération du Cerfa / Déclaration (Bientôt disponible)</p>
          <p className="text-sm">Le bouton d'export de la liasse fiscale sera connecté ici prochainement.</p>
        </div>
      </div>
    </div>
  );
}
