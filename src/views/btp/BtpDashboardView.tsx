import React from 'react';
import { useApp } from '../../store';
import { BtpChantierStat } from '../../types';
import { HardHat, ShieldAlert, Truck, TrendingUp, Wallet, Activity, CalendarRange } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, PageHeader, SectionTitle, Stat, Badge, statusTone, EmptyState } from '../../components/ui';

const ChartTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass border border-slate-200/80 rounded-lg shadow-lift px-3.5 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-[12.5px] font-mono text-slate-800">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="capitalize text-slate-500 font-sans text-[11.5px]">{p.name}</span>
          <span className="ml-auto font-semibold">{(p.value ?? 0).toLocaleString('fr-FR')}</span>
        </p>
      ))}
    </div>
  );
};

export const BtpDashboardView = () => {
  const {
    btpChantiers, btpSituations, btpIncidents, btpEngins, btpChantierStats, btpJournaux,
  } = useApp();

  const statById = new Map<string, BtpChantierStat>(btpChantierStats.map(s => [s.id, s] as [string, BtpChantierStat]));
  const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });

  // ---- KPIs ----
  const actifs = btpChantiers.filter(c => c.statut === 'en_cours');
  const planification = btpChantiers.filter(c => c.statut === 'planification');
  const incidentsOuverts = btpIncidents.filter(i => i.statut !== 'clôturé');
  const enginsDispo = btpEngins.filter(e => e.statut === 'disponible').length;

  // Avancement pondéré par budget (dernier journal de chaque chantier actif)
  const avancementPondere = (() => {
    let sumBudget = 0, sumAvancement = 0;
    for (const c of actifs) {
      const journaux = btpJournaux.filter(j => j.chantier_id === c.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const av = journaux[0]?.avancement_pct ?? 0;
      sumBudget += c.budget_initial || 0;
      sumAvancement += (av / 100) * (c.budget_initial || 0);
    }
    return sumBudget > 0 ? Math.round((sumAvancement / sumBudget) * 100) : 0;
  })();

  const situationsFacturees = btpSituations.filter(s => s.statut === 'facturée').reduce((a, s) => a + s.montant_facture, 0);
  const margeGlobale = btpChantiers.reduce((acc, c) => {
    const st = statById.get(c.id);
    if (!st) return acc;
    return acc + (c.budget_initial || 0) - st.budget_engage - st.cout_mo_reel;
  }, 0);

  // ---- Données du graphe budget vs consommé ----
  const chartData = actifs.concat(planification).slice(0, 8).map(c => {
    const st = statById.get(c.id);
    return {
      nom: c.nom.length > 18 ? c.nom.slice(0, 16) + '…' : c.nom,
      Budget: c.budget_initial || 0,
      Engagé: st?.budget_engage ?? 0,
      'MO réelle': Math.round(st?.cout_mo_reel ?? 0),
      Facturé: st?.montant_situations_facturees ?? 0,
    };
  });

  // ---- Planning frise : fenêtre commune min(début) → max(fin) ----
  const planningRows = btpChantiers
    .filter(c => c.date_debut_prevue)
    .map(c => ({ ...c, debut: new Date(c.date_debut_prevue).getTime(), fin: c.date_fin_prevue ? new Date(c.date_fin_prevue).getTime() : Date.now() + 90 * 86400000 }));
  const minDate = planningRows.length ? Math.min(...planningRows.map(r => r.debut)) : 0;
  const maxDate = planningRows.length ? Math.max(...planningRows.map(r => r.fin), Date.now()) : 1;
  const span = Math.max(1, maxDate - minDate);
  const todayPct = ((Date.now() - minDate) / span) * 100;

  return (
    <div className="space-y-6">
      <PageHeader
        accent="La tour"
        title="de contrôle BTP"
        subtitle="Pilotage consolidé : avancement, rentabilité, sécurité et ressources — l'économie des chantiers connectée au noyau."
      />

      {/* ---- KPIs ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
        <Stat label="Chantiers actifs" value={String(actifs.length)} icon={<HardHat size={17} />} accent="gold" hint={`${planification.length} en planification`} />
        <Stat label="Avancement pondéré" value={`${avancementPondere} %`} icon={<Activity size={17} />} accent="blue" hint="pondéré par budget" />
        <Stat label="Situations facturées" value={fmt(situationsFacturees)} icon={<TrendingUp size={17} />} accent="emerald" hint="encaissées en trésorerie" />
        <Stat label="Marge prévisionnelle" value={fmt(margeGlobale)} icon={<Wallet size={17} />} accent={margeGlobale >= 0 ? 'gold' : 'rose'} hint="budget − engagé − MO" />
        <Stat label="Incidents ouverts" value={String(incidentsOuverts.length)} icon={<ShieldAlert size={17} />} accent={incidentsOuverts.length > 0 ? 'rose' : 'emerald'} hint="toutes gravités" />
        <Stat label="Engins disponibles" value={`${enginsDispo}/${btpEngins.length}`} icon={<Truck size={17} />} accent="blue" hint="parc matériel" />
      </div>

      {/* ---- Budget vs consommé ---- */}
      <Card className="p-6">
        <SectionTitle icon={<Activity size={15} />}>Budget vs consommé — chantiers actifs & en planification</SectionTitle>
        {chartData.length === 0 ? (
          <EmptyState icon={<HardHat size={20} />} title="Aucun chantier à comparer" hint="Les chantiers créés apparaîtront ici avec leur budget, leur consommation et leurs situations." />
        ) : (
          <div className="h-[340px] w-full -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="#E2DFD8" />
                <XAxis dataKey="nom" axisLine={false} tickLine={false} dy={8} tick={{ fill: '#A9A399', fontSize: 10.5, fontWeight: 500 }} interval={0} angle={-12} height={44} />
                <YAxis
                  tickFormatter={(v) => (v >= 1e9 ? `${Math.round(v / 1e9)}Md` : v >= 1e6 ? `${Math.round(v / 1e6)}M` : `${v}`)}
                  axisLine={false} tickLine={false} dx={-6} width={44}
                  tick={{ fill: '#A9A399', fontSize: 11, fontWeight: 500 }}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(220,199,145,0.08)' }} />
                <Legend wrapperStyle={{ fontSize: 11.5, color: '#868077', paddingTop: 8 }} iconType="circle" iconSize={8} />
                <Bar dataKey="Budget" fill="#DCC791" radius={[5, 5, 0, 0]} maxBarSize={26} />
                <Bar dataKey="Engagé" fill="#BE4141" radius={[5, 5, 0, 0]} maxBarSize={26} />
                <Bar dataKey="MO réelle" fill="#4A7AA3" radius={[5, 5, 0, 0]} maxBarSize={26} />
                <Bar dataKey="Facturé" fill="#257D53" radius={[5, 5, 0, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ---- Planning frise ---- */}
        <Card className="p-6">
          <SectionTitle icon={<CalendarRange size={15} />}>Planning des chantiers</SectionTitle>
          {planningRows.length === 0 ? (
            <EmptyState icon={<CalendarRange size={20} />} title="Aucune date planifiée" hint="Renseignez les dates de début et fin prévues sur les chantiers." />
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute top-0 bottom-0 z-10 w-px bg-rose-400/70" style={{ left: `${Math.min(100, Math.max(0, todayPct))}%` }} />
                <div className="absolute -top-1 z-10 text-[9px] font-bold text-rose-500 uppercase tracking-wider" style={{ left: `${Math.min(97, Math.max(0, todayPct))}%` }}>auj.</div>
                {planningRows.map(c => {
                  const left = ((c.debut - minDate) / span) * 100;
                  const width = Math.max(1.5, ((c.fin - c.debut) / span) * 100);
                  return (
                    <div key={c.id} className="mb-3.5 last:mb-0">
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="font-semibold text-slate-700 truncate pr-2">{c.nom}</span>
                        <span className="text-slate-400 shrink-0">{new Date(c.debut).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })} → {new Date(c.fin).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })}</span>
                      </div>
                      <div className="h-5 rounded-md bg-slate-100 relative overflow-hidden">
                        <div
                          className={`absolute inset-y-0 rounded-md flex items-center px-2 ${
                            c.statut === 'clôturé' ? 'bg-slate-400' :
                            c.statut === 'suspendu' ? 'bg-rose-400' :
                            c.statut === 'en_cours' ? 'bg-gradient-to-r from-indigo-400 to-indigo-500' :
                            'bg-indigo-200'
                          }`}
                          style={{ left: `${left}%`, width: `${width}%` }}
                        >
                          <span className="text-[9px] font-bold text-white/95 uppercase tracking-wide truncate">{c.statut.replace('_', ' ')}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        {/* ---- Incidents récents ---- */}
        <Card className="p-6">
          <SectionTitle icon={<ShieldAlert size={15} />}>Incidents QHSE récents</SectionTitle>
          {btpIncidents.length === 0 ? (
            <EmptyState icon={<ShieldAlert size={20} />} title="Aucun incident déclaré" hint="La sécurité d'abord : restons sur cette lancée." />
          ) : (
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {[...btpIncidents]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 8)
                .map(inc => {
                  const chantier = btpChantiers.find(c => c.id === inc.chantier_id);
                  return (
                    <div key={inc.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50/60">
                      <span className={`mt-1 h-2 w-2 rounded-full shrink-0 ${inc.gravite === 'critique' ? 'bg-rose-500' : inc.gravite === 'majeur' ? 'bg-amber-500' : 'bg-blue-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12.5px] text-slate-800 leading-snug">{inc.description}</p>
                        <p className="text-[10.5px] text-slate-400 mt-1">
                          {chantier?.nom ?? inc.chantier_id} · {new Date(inc.date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <Badge tone={statusTone(inc.statut)}>{inc.statut}</Badge>
                    </div>
                  );
                })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
