import React, { useMemo } from 'react';
import { useApp } from '../../store';
import { Activity, Wallet, TrendingUp, TrendingDown, Gem, Target } from 'lucide-react';
import { PageHeader, Stat } from '../../components/ui';

export function AccountantDashboard() {
  const { accountingAccounts, accountingEntries } = useApp();

  // Calculer la balance de chaque compte
  const balances = useMemo(() => {
    const map: Record<string, number> = {};
    accountingEntries.filter(e => e.status === 'VALIDATED').forEach(entry => {
      entry.lines.forEach(line => {
        if (!map[line.accountId]) map[line.accountId] = 0;
        // Par convention : Débit = positif, Crédit = négatif
        map[line.accountId] += (Number(line.debit) || 0) - (Number(line.credit) || 0);
      });
    });
    return map;
  }, [accountingEntries]);

  const { actifs, passifs, charges, produits } = useMemo(() => {
    let actifs = 0; let passifs = 0; let charges = 0; let produits = 0;
    
    accountingAccounts.forEach(account => {
      const balance = balances[account.id] || 0;
      if (balance === 0) return;

      // Règle d'or de la comptabilité SYSCOHADA :
      // Classes 1 à 5 = Bilan (Patrimoine)
      // Classes 6 à 9 = Compte de Résultat (Gestion)
      // Solde Débiteur (balance > 0) = Actif (Bilan) ou Charge (Résultat)
      // Solde Créditeur (balance < 0) = Passif (Bilan) ou Produit (Résultat)

      if (account.class >= 1 && account.class <= 5) {
        if (balance > 0) {
          actifs += balance;
        } else {
          passifs += Math.abs(balance);
        }
      } else if (account.class >= 6 && account.class <= 8) {
        if (balance > 0) {
          charges += balance;
        } else {
          produits += Math.abs(balance);
        }
      }
    });

    return { actifs, passifs, charges, produits };
  }, [accountingAccounts, balances]);

  const resultatNet = produits - charges;
  const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });

  return (
    <div className="space-y-8">
      <PageHeader
        accent="États"
        title="Financiers OHADA"
        subtitle="Bilan Actif/Passif et Compte de résultat générés à partir des écritures validées (Grand Livre)."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat
          label="Chiffre d'Affaires (Produits)"
          value={fmt(produits)}
          icon={<TrendingUp size={17} />}
          accent="gold"
          hint="Classes 7 & 8 (Comptes créditeurs)"
        />
        <Stat
          label="Charges d'exploitation"
          value={fmt(charges)}
          icon={<TrendingDown size={17} />}
          accent="rose"
          hint="Classe 6 (Comptes débiteurs)"
        />
        <Stat
          label="Résultat Net"
          value={fmt(resultatNet)}
          icon={<Gem size={17} />}
          accent={resultatNet >= 0 ? 'emerald' : 'rose'}
          hint="Produits - Charges"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* COMPTE DE RÉSULTAT */}
        <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center gap-2">
            <Activity size={18} className="text-indigo-600" />
            <h3 className="font-semibold text-slate-900">Compte de Résultat</h3>
          </div>
          <div className="p-4 space-y-6">
            <div>
              <h4 className="text-sm font-bold text-slate-700 uppercase mb-2 border-b border-slate-100 pb-1">Produits (Classe 7-8)</h4>
              <div className="flex justify-between text-sm font-mono text-emerald-600 font-medium">
                <span>Total Produits</span>
                <span>{fmt(produits)} GNF</span>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-700 uppercase mb-2 border-b border-slate-100 pb-1">Charges (Classe 6)</h4>
              <div className="flex justify-between text-sm font-mono text-rose-600 font-medium">
                <span>Total Charges</span>
                <span>{fmt(charges)} GNF</span>
              </div>
            </div>
            <div className={`mt-4 p-3 rounded-sm flex justify-between font-bold text-sm ${resultatNet >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              <span>RÉSULTAT NET</span>
              <span className="font-mono">{fmt(resultatNet)} GNF</span>
            </div>
          </div>
        </div>

        {/* BILAN */}
        <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center gap-2">
            <Target size={18} className="text-indigo-600" />
            <h3 className="font-semibold text-slate-900">Bilan Comptable (OHADA)</h3>
          </div>
          <div className="p-4 space-y-6">
            <div>
              <h4 className="text-sm font-bold text-slate-700 uppercase mb-2 border-b border-slate-100 pb-1">Actif (Emplois)</h4>
              <div className="space-y-1">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Immobilisations (Cl. 2) & Trésorerie (Cl. 5)</span>
                </div>
                <div className="flex justify-between text-sm font-mono text-slate-800 font-bold mt-2">
                  <span>TOTAL ACTIF</span>
                  <span>{fmt(actifs)} GNF</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-700 uppercase mb-2 border-b border-slate-100 pb-1">Passif (Ressources)</h4>
              <div className="space-y-1">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Capitaux (Cl. 1) & Dettes (Cl. 4)</span>
                </div>
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Résultat Net de l'exercice</span>
                  <span className="font-mono">{fmt(resultatNet)}</span>
                </div>
                <div className="flex justify-between text-sm font-mono text-slate-800 font-bold mt-2">
                  <span>TOTAL PASSIF</span>
                  <span>{fmt(passifs + resultatNet)} GNF</span>
                </div>
              </div>
            </div>
            
            {/* L'équation fondamentale de la comptabilité : Actif = Passif */}
            <div className={`mt-4 p-3 rounded-sm flex justify-between font-bold text-sm ${Math.abs(actifs - (passifs + resultatNet)) < 1 ? 'bg-indigo-50 text-indigo-700' : 'bg-rose-50 text-rose-700'}`}>
              <span>ÉQUILIBRE BILANCIEL</span>
              <span className="font-mono">{Math.abs(actifs - (passifs + resultatNet)) < 1 ? 'ÉQUILIBRÉ' : 'DÉSÉQUILIBRÉ'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
