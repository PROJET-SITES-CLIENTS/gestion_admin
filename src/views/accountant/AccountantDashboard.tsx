import React from 'react';
import { useApp } from '../../store';
import { Activity, Target, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

export function AccountantDashboard() {
  const { transactions, expenses, treasuryAccounts } = useApp();

  const totalBalance = treasuryAccounts.reduce((acc, curr) => acc + curr.balance, 0);

  const revenusTTC = transactions.filter(t => t.type === 'CREDIT' && t.category !== 'TRANSFERT').reduce((acc, t) => acc + t.amount, 0);
  const depensesTTC = transactions.filter(t => t.type === 'DEBIT' && t.category !== 'TRANSFERT').reduce((acc, t) => acc + t.amount, 0);

  // Approximation HT pour P&L
  const revenusHT = revenusTTC / 1.18;
  const depensesHT = expenses.filter(e => e.status === 'PAID').reduce((acc, e) => acc + (e.amountHT || e.amountTTC), 0); // If amountHT missing, fallback

  // Also include RH costs (Salaires & Charges) which don't have TVA
  const rhCosts = transactions.filter(t => t.type === 'DEBIT' && (t.category === 'SALAIRE' || t.category === 'CHARGES_SOCIALES' || t.category === 'IMPOTS')).reduce((acc, t) => acc + t.amount, 0);

  const totalCharges = depensesHT + rhCosts;
  const margeNette = revenusHT - totalCharges;
  const marginPercentage = revenusHT > 0 ? (margeNette / revenusHT) * 100 : 0;

  // Graphique : agrégation RÉELLE des transactions par mois (12 derniers mois)
  // (l'ancienne version affichait des pourcentages mockés).
  const chartData = (() => {
    const now = new Date();
    const months: { key: string; name: string; revenus: number; depenses: number }[] = [];
    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        name: monthNames[d.getMonth()],
        revenus: 0,
        depenses: 0
      });
    }

    const byKey = new Map(months.map(m => [m.key, m]));

    for (const t of transactions) {
      const d = new Date(t.date);
      if (isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const bucket = byKey.get(key);
      if (!bucket) continue;
      if (t.type === 'CREDIT') bucket.revenus += t.amount;
      else if (t.type === 'DEBIT') bucket.depenses += t.amount;
    }

    return months;
  })();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Bilan & Compte de Résultat (P&L)</h2>
        <p className="text-sm text-slate-500">Vue d'ensemble de la santé financière (valeurs estimées Hors Taxes).</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 border border-slate-200 rounded-sm shadow-sm">
          <p className="text-xs uppercase font-bold text-slate-500">Chiffre d'Affaires HT</p>
          <p className="text-2xl font-bold font-mono mt-1 text-slate-800">{revenusHT.toLocaleString(undefined, {maximumFractionDigits:0})} <span className="text-sm">GNF</span></p>
        </div>
        <div className="bg-white p-5 border border-slate-200 rounded-sm shadow-sm">
          <p className="text-xs uppercase font-bold text-slate-500">Charges d'Exploitation</p>
          <p className="text-2xl font-bold font-mono mt-1 text-rose-600">{depensesHT.toLocaleString(undefined, {maximumFractionDigits:0})} <span className="text-sm">GNF</span></p>
        </div>
        <div className="bg-white p-5 border border-slate-200 rounded-sm shadow-sm">
          <p className="text-xs uppercase font-bold text-slate-500">Masse Salariale & Social</p>
          <p className="text-2xl font-bold font-mono mt-1 text-rose-600">{rhCosts.toLocaleString(undefined, {maximumFractionDigits:0})} <span className="text-sm">GNF</span></p>
        </div>
        <div className={`p-5 rounded-sm shadow-sm ${margeNette >= 0 ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
          <p className="text-xs uppercase font-bold opacity-90">Bénéfice Net</p>
          <div className="flex justify-between items-end">
            <p className="text-2xl font-bold font-mono mt-1">{margeNette.toLocaleString(undefined, {maximumFractionDigits:0})} <span className="text-sm">GNF</span></p>
            <span className="text-sm font-bold bg-white/20 px-2 py-0.5 rounded-sm">{marginPercentage.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-sm p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Activity size={16} className="text-indigo-600" /> Évolution du Cashflow (YTD)
        </h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorDep" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e11d48" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#e11d48" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
              <YAxis tickFormatter={(val) => `${val / 1000000}M`} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dx={-10} />
              <Area type="monotone" dataKey="revenus" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              <Area type="monotone" dataKey="depenses" stroke="#e11d48" strokeWidth={3} fillOpacity={1} fill="url(#colorDep)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
