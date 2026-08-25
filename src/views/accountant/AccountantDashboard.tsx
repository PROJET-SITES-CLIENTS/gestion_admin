import React from 'react';
import { useApp } from '../../store';
import { Activity, Wallet, TrendingUp, TrendingDown, Gem } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, PageHeader, SectionTitle, Stat, EmptyState } from '../../components/ui';

/* Info-bulle personnalisée (premium) */
const ChartTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass border border-slate-200/80 rounded-lg shadow-lift px-3.5 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-[12.5px] font-mono text-slate-800">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.stroke }} />
          <span className="capitalize text-slate-500 font-sans text-[11.5px]">{p.dataKey}</span>
          <span className="ml-auto font-semibold">{(p.value ?? 0).toLocaleString('fr-FR')}</span>
        </p>
      ))}
    </div>
  );
};

export function AccountantDashboard() {
  const { transactions, expenses, treasuryAccounts } = useApp();

  const totalBalance = treasuryAccounts.reduce((acc, curr) => acc + curr.balance, 0);

  const revenusTTC = transactions.filter(t => t.type === 'CREDIT' && t.category !== 'TRANSFERT').reduce((acc, t) => acc + t.amount, 0);
  const depensesTTC = transactions.filter(t => t.type === 'DEBIT' && t.category !== 'TRANSFERT').reduce((acc, t) => acc + t.amount, 0);

  // Approximation HT pour P&L (TVA guinéenne 18 %)
  const revenusHT = revenusTTC / 1.18;
  const depensesHT = expenses.filter(e => e.status === 'PAID').reduce((acc, e) => acc + (e.amountHT || e.amountTTC), 0);

  const rhCosts = transactions
    .filter(t => t.type === 'DEBIT' && ['SALAIRE', 'CHARGES_SOCIALES', 'IMPOTS'].includes(t.category))
    .reduce((acc, t) => acc + t.amount, 0);

  const totalCharges = depensesHT + rhCosts;
  const margeNette = revenusHT - totalCharges;
  const marginPercentage = revenusHT > 0 ? (margeNette / revenusHT) * 100 : 0;

  // Agrégation RÉELLE des transactions par mois (12 derniers mois)
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
      const bucket = byKey.get(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      if (!bucket) continue;
      if (t.type === 'CREDIT') bucket.revenus += t.amount;
      else if (t.type === 'DEBIT') bucket.depenses += t.amount;
    }
    return months;
  })();

  const hasFlux = transactions.length > 0;
  const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      <PageHeader
        accent="Le compte"
        title="de résultat"
        subtitle="Vue d'ensemble de la santé financière — valeurs estimées hors taxes (TVA 18 %)."
      />

      {/* ---- KPIs ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Stat
          label="Chiffre d'affaires HT"
          value={fmt(revenusHT)}
          icon={<TrendingUp size={17} />}
          accent="gold"
          hint={`Encaissé TTC : ${fmt(revenusTTC)} GNF`}
        />
        <Stat
          label="Charges d'exploitation"
          value={fmt(depensesHT)}
          icon={<TrendingDown size={17} />}
          accent="rose"
          hint="Dépenses fournisseurs payées (HT)"
        />
        <Stat
          label="Masse salariale & sociale"
          value={fmt(rhCosts)}
          icon={<Wallet size={17} />}
          accent="blue"
          hint="Salaires, CNSS et RTS"
        />
        <Stat
          label="Bénéfice net"
          value={fmt(margeNette)}
          icon={<Gem size={17} />}
          accent={margeNette >= 0 ? 'emerald' : 'rose'}
          hint={`Trésorerie globale : ${fmt(totalBalance)} GNF · marge ${marginPercentage.toFixed(1)} %`}
        />
      </div>

      {/* ---- Graphique ---- */}
      <Card className="p-6">
        <SectionTitle icon={<Activity size={15} />}>
          Évolution du cashflow — 12 derniers mois
        </SectionTitle>

        {hasFlux ? (
          <div className="h-[300px] w-full -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#B89042" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#B89042" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorDep" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#BE4141" stopOpacity={0.16} />
                    <stop offset="95%" stopColor="#BE4141" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="#E2DFD8" />
                <XAxis
                  dataKey="name" axisLine={false} tickLine={false} dy={8}
                  tick={{ fill: '#A9A399', fontSize: 11, fontWeight: 500 }}
                />
                <YAxis
                  tickFormatter={(val) => (val >= 1000000 ? `${Math.round(val / 1000000)}M` : val >= 1000 ? `${Math.round(val / 1000)}k` : `${val}`)}
                  axisLine={false} tickLine={false} dx={-6} width={44}
                  tick={{ fill: '#A9A399', fontSize: 11, fontWeight: 500 }}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#DCC791', strokeDasharray: '4 4' }} />
                <Area type="monotone" dataKey="revenus" name="Revenus" stroke="#9C7434" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" activeDot={{ r: 4, fill: '#9C7434', stroke: '#fff', strokeWidth: 2 }} />
                <Area type="monotone" dataKey="depenses" name="Dépenses" stroke="#BE4141" strokeWidth={2.5} fillOpacity={1} fill="url(#colorDep)" activeDot={{ r: 4, fill: '#BE4141', stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState
            icon={<Activity size={20} />}
            title="Aucun flux enregistré"
            hint="Enregistrez des encaissements et des dépenses : la courbe du cashflow apparaîtra ici automatiquement."
          />
        )}
      </Card>
    </div>
  );
}
