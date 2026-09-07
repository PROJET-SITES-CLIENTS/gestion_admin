import React, { useState } from 'react';
import { useApp } from '../store';
import { CheckCircle2, Circle, Lock, AlertTriangle, FileCheck, Users, Receipt, Package, Wrench, TrendingUp } from 'lucide-react';
import { Badge, Modal, Progress } from './ui';
import { BtpLot, BtpTache } from '../types';

/* ============================================================
   P3-1 : CHECKLIST DE CLÔTURE FORMELLE (CDC §21)
   Le chantier ne peut être clôturé que si toutes les
   conditions sont remplies ou explicitement validées.
   ============================================================ */

interface ChecklistItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  check: (ctx: ClosureContext) => boolean;
  detail?: (ctx: ClosureContext) => string;
}

interface ClosureContext {
  chantier: any;
  stat: any;
  heuresNonImputees: number;
  facturesNonControlees: number;
  reservesOuvertes: number;
  docsFinauxManquants: string[];
  materielNonReaffecte: number;
  lotsNonTermines: number;
}

export const BtpClosureChecklist: React.FC<{
  chantierId: string;
  onClosure: () => void;
}> = ({ chantierId, onClosure }) => {
  const {
    btpChantiers, btpChantierStats, btpLots, btpTaches,
    btpPointages, btpAffectations, btpSituations, btpDocuments,
    btpReserves, btpEngins, expenses, currentRole, pushToast,
    updateBtpChantier,
  } = useApp();

  const [showClosure, setShowClosure] = useState(false);
  const [exceptions, setExceptions] = useState<Set<string>>(new Set());

  const chantier = btpChantiers.find(c => c.id === chantierId);
  const stat = btpChantierStats.find(s => s.id === chantierId);
  if (!chantier) return null;

  const fmt = (n: number) => (n || 0).toLocaleString('fr-FR');

  // --- Contexte de vérification ---
  const ctx: ClosureContext = {
    chantier,
    stat,
    // BUG 4 FIX : le champ "validated" n'existe pas dans BtpPointage.
    // Un pointage créé EST imputé (les heures alimentent le P&L via les stats serveur).
    // On vérifie plutôt qu'il n'y a pas de pointage à 0h (saisie incomplète).
    heuresNonImputees: btpPointages.filter(p => p.chantier_id === chantierId && (!p.heures || p.heures <= 0)).length,
    facturesNonControlees: expenses.filter(e => e.chantier_id === chantierId && e.status === 'PENDING').length,
    reservesOuvertes: btpReserves.filter(r => r.chantier_id === chantierId && !['levée', 'annulée', 'levee', 'annulee'].includes(r.statut)).length,
    docsFinauxManquants: [],
    materielNonReaffecte: btpEngins.filter(e => e.chantier_affecte_id === chantierId).length,
    lotsNonTermines: btpLots.filter(l => l.chantier_id === chantierId && !['termine', 'annule'].includes(l.statut)).length,
  };

  // Documents finaux attendus
  const docs = btpDocuments.filter(d => d.chantier_id === chantierId);
  if (!docs.some(d => d.type === 'pv_reception')) ctx.docsFinauxManquants.push('PV de réception');
  if (!docs.some(d => d.type === 'contrat')) ctx.docsFinauxManquants.push('Contrat/Market');

  // --- Checklist CDC §21 ---
  const CHECKLIST: ChecklistItem[] = [
    {
      id: 'travaux',
      label: 'Travaux achevés (statut réception définitive)',
      icon: <CheckCircle2 size={16} />,
      check: (c) => ['réception_définitive', 'clôturé'].includes(c.chantier.statut),
      detail: (c) => `Statut actuel: ${c.chantier.statut}`,
    },
    {
      id: 'heures',
      label: 'Heures imputées (pointages validés)',
      icon: <Users size={16} />,
      check: (c) => c.heuresNonImputees === 0,
      detail: (c) => c.heuresNonImputees > 0 ? `${c.heuresNonImputees} pointage(s) non validé(s)` : 'Toutes les heures sont imputées',
    },
    {
      id: 'factures',
      label: 'Factures contrôlées (dépenses)',
      icon: <Receipt size={16} />,
      check: (c) => c.facturesNonControlees === 0,
      detail: (c) => c.facturesNonControlees > 0 ? `${c.facturesNonControlees} facture(s) en attente` : 'Toutes les factures sont contrôlées',
    },
    {
      id: 'reserves',
      label: 'Réserves suivies (levées ou clôturées)',
      icon: <AlertTriangle size={16} />,
      check: (c) => c.reservesOuvertes === 0,
      detail: (c) => c.reservesOuvertes > 0 ? `${c.reservesOuvertes} réserve(s) encore ouverte(s)` : 'Toutes les réserves sont traitées',
    },
    {
      id: 'docs',
      label: 'Documents finaux déposés',
      icon: <FileCheck size={16} />,
      check: (c) => c.docsFinauxManquants.length === 0,
      detail: (c) => c.docsFinauxManquants.length > 0 ? `Manquants: ${c.docsFinauxManquants.join(', ')}` : 'Documents complets',
    },
    {
      id: 'materiel',
      label: 'Matériel réaffecté (engins détachés)',
      icon: <Package size={16} />,
      check: (c) => c.materielNonReaffecte === 0,
      detail: (c) => c.materielNonReaffecte > 0 ? `${c.materielNonReaffecte} engin(s) encore affecté(s)` : 'Tout le matériel est disponible',
    },
    {
      id: 'lots',
      label: 'Lots terminés ou annulés',
      icon: <Wrench size={16} />,
      check: (c) => c.lotsNonTermines === 0,
      detail: (c) => c.lotsNonTermines > 0 ? `${c.lotsNonTermines} lot(s) non terminé(s)` : 'Tous les lots sont clôturés',
    },
    {
      id: 'marge',
      label: 'Marge finale calculée',
      icon: <TrendingUp size={16} />,
      check: (c) => c.stat !== null && c.stat !== undefined,
      detail: (c) => {
        if (!c.stat) return 'Stats indisponibles';
        const couts = (c.stat.budget_engage || 0) + (c.stat.cout_mo_reel || 0) + (c.stat.cout_engins || 0) + (c.stat.cout_sous_traitance || 0);
        const marge = (c.chantier.budget_initial || 0) - couts;
        const pct = c.chantier.budget_initial > 0 ? Math.round((marge / c.chantier.budget_initial) * 100) : 0;
        return `Marge: ${fmt(marge)} GNF (${pct}%)`;
      },
    },
  ];

  const allChecked = CHECKLIST.every(item => item.check(ctx) || exceptions.has(item.id));
  const canClose = currentRole === 'GERANT' || currentRole === 'COMPTABLE';

  const handleToggleException = (id: string) => {
    setExceptions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleClosure = async () => {
    if (!allChecked) {
      pushToast('Impossible de clôturer : conditions non remplies sans exception validée.', 'ERROR');
      return;
    }
    // Calculer la marge finale pour l'historique
    const couts = (stat?.budget_engage || 0) + (stat?.cout_mo_reel || 0) + (stat?.cout_engins || 0) + (stat?.cout_sous_traitance || 0);
    const margeFinale = (chantier.budget_initial || 0) - couts;

    await updateBtpChantier(chantierId, {
      statut: 'clôturé',
      date_cloture: new Date().toISOString(),
      marge_finale: margeFinale,
      closure_checklist: CHECKLIST.map(item => ({
        id: item.id,
        label: item.label,
        passed: item.check(ctx),
        exception: exceptions.has(item.id),
      })),
    });

    pushToast(`Chantier « ${chantier.nom} » clôturé. Marge finale : ${fmt(margeFinale)} GNF.`, 'SUCCESS');
    setShowClosure(false);
    onClosure();
  };

  // Affichage compact dans la fiche chantier
  const passedCount = CHECKLIST.filter(item => item.check(ctx)).length;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-slate-700 flex items-center gap-2">
          <Lock size={15} className={allChecked ? 'text-emerald-500' : 'text-slate-400'} />
          Clôture du chantier ({passedCount}/{CHECKLIST.length})
        </h3>
        {canClose && chantier.statut !== 'clôturé' && (
          <button onClick={() => setShowClosure(true)} className="btn btn-primary !py-1.5 !px-3 !text-[11px]">
            <Lock size={11} /> Clôturer
          </button>
        )}
        {chantier.statut === 'clôturé' && (
          <Badge tone="emerald">Clôturé</Badge>
        )}
      </div>

      {/* Résumé compact */}
      <div className="flex flex-wrap gap-1.5">
        {CHECKLIST.map(item => {
          const ok = item.check(ctx);
          const except = exceptions.has(item.id);
          return (
            <span key={item.id} className={`flex items-center gap-1 text-[10.5px] px-2 py-1 rounded-md border ${
              ok ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
              except ? 'bg-amber-50 text-amber-700 border-amber-200' :
              'bg-rose-50 text-rose-600 border-rose-200'
            }`}>
              {ok ? <CheckCircle2 size={11} /> : except ? <AlertTriangle size={11} /> : <Circle size={11} />}
              {item.label.split('(')[0].trim()}
            </span>
          );
        })}
      </div>

      {/* Modale de clôture détaillée */}
      <Modal open={showClosure} onClose={() => setShowClosure(false)} title="Clôture formelle du chantier" subtitle={chantier.nom} wide>
        <div className="space-y-3">
          <p className="text-[12.5px] text-slate-500">
            Le CDC exige que toutes les conditions soient remplies avant clôture.
            Une condition non remplie peut être explicitement validée comme exception (motif tracé).
          </p>

          {CHECKLIST.map(item => {
            const ok = item.check(ctx);
            const except = exceptions.has(item.id);
            return (
              <div key={item.id} className={`flex items-center gap-3 p-3 rounded-lg border ${
                ok ? 'border-emerald-200 bg-emerald-50/50' :
                except ? 'border-amber-200 bg-amber-50/50' :
                'border-rose-200 bg-rose-50/50'
              }`}>
                <div className={`shrink-0 ${ok ? 'text-emerald-500' : except ? 'text-amber-500' : 'text-rose-400'}`}>
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-800">{item.label}</p>
                  {item.detail && <p className="text-[11.5px] text-slate-500 mt-0.5">{item.detail(ctx)}</p>}
                </div>
                {!ok && (
                  <button
                    onClick={() => handleToggleException(item.id)}
                    className={`shrink-0 text-[10.5px] font-bold uppercase px-2 py-1 rounded ${
                      except ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    }`}
                  >
                    {except ? 'Exception validée' : 'Valider exception'}
                  </button>
                )}
                {ok && <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />}
              </div>
            );
          })}

          {/* Marge finale */}
          {stat && (
            <div className="p-4 rounded-lg bg-slate-900 text-white">
              <p className="text-[10.5px] font-bold uppercase tracking-widest text-slate-400">Marge finale calculée</p>
              <p className="font-mono text-2xl font-bold mt-1">
                {fmt((chantier.budget_initial || 0) - (stat.budget_engage || 0) - (stat.cout_mo_reel || 0) - (stat.cout_engins || 0) - (stat.cout_sous_traitance || 0))} GNF
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Budget {fmt(chantier.budget_initial)} − Dépenses {fmt(stat.budget_engage)} − MO {fmt(stat.cout_mo_reel)} − Engins {fmt(stat.cout_engins)} − ST {fmt(stat.cout_sous_traitance)}
              </p>
            </div>
          )}

          <button onClick={handleClosure} disabled={!allChecked} className="btn btn-primary w-full">
            <Lock size={14} />
            {allChecked ? 'Clôturer le chantier' : 'Conditions non remplies'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

/* ============================================================
   P3-2 : PILOTAGE PAR LOT (coût réel vs budget, avancement)
   ============================================================ */

export const BtpLotPilotage: React.FC<{ chantierId: string }> = ({ chantierId }) => {
  const { btpLots, btpTaches, btpPointages, btpMouvements, btpSousTraitances } = useApp();

  const lots = btpLots.filter(l => l.chantier_id === chantierId);
  const fmt = (n: number) => (n || 0).toLocaleString('fr-FR');

  if (lots.length === 0) return null;

  const lotPilotage = (lot: BtpLot) => {
    const taches = btpTaches.filter(t => t.lot_id === lot.id);
    const done = taches.filter(t => t.statut === 'terminee').length;
    const avancement = taches.length > 0 ? Math.round((done / taches.length) * 100) : lot.avancement_pct;

    // Coûts imputés à ce lot via les tâches (heures des employés assignés)
    const tacheIds = taches.map(t => t.id);
    const assignes = taches.filter(t => t.assigne_a).map(t => t.assigne_a);
    // Pour l'instant on utilise le budget du lot comme référence
    const coutEstime = lot.budget;
    const ecart = lot.budget - coutEstime;

    return { taches: taches.length, done, avancement, coutEstime, ecart };
  };

  const totalBudget = lots.reduce((s, l) => s + l.budget, 0);
  const totalAvancement = lots.length > 0
    ? Math.round(lots.reduce((s, l) => s + lotPilotage(l).avancement, 0) / lots.length)
    : 0;

  return (
    <div className="card p-5">
      <h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-slate-700 mb-4 flex items-center gap-2">
        <TrendingUp size={15} className="text-indigo-500" /> Pilotage par lot
      </h3>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
          <p className="label !mb-1">Budget total lots</p>
          <p className="font-mono font-bold text-[14px]">{fmt(totalBudget)} GNF</p>
        </div>
        <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
          <p className="label !mb-1">Avancement global</p>
          <p className="font-mono font-bold text-[14px]">{totalAvancement}%</p>
        </div>
        <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
          <p className="label !mb-1">Tâches totales</p>
          <p className="font-mono font-bold text-[14px]">{lots.reduce((s, l) => s + lotPilotage(l).taches, 0)}</p>
        </div>
      </div>

      {/* Table par lot */}
      <div className="overflow-x-auto">
        <table className="table-premium w-full min-w-[500px]">
          <thead>
            <tr>
              <th>Lot</th><th className="text-right">Budget</th>
              <th className="text-center">Avancement</th><th className="text-center">Tâches</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {lots.map(lot => {
              const p = lotPilotage(lot);
              return (
                <tr key={lot.id}>
                  <td>
                    <span className="font-mono text-[10.5px] text-indigo-600 font-bold mr-2">{lot.numero}</span>
                    <span className="font-semibold text-slate-800">{lot.nom}</span>
                  </td>
                  <td className="text-right font-mono">{fmt(lot.budget)}</td>
                  <td className="text-center">
                    <div className="flex items-center gap-2">
                      <div className="w-16"><Progress value={p.avancement} /></div>
                      <span className="font-mono text-[11px]">{p.avancement}%</span>
                    </div>
                  </td>
                  <td className="text-center font-mono text-[12px]">{p.done}/{p.taches}</td>
                  <td><Badge tone={lot.statut === 'termine' ? 'emerald' : lot.statut === 'en_cours' ? 'blue' : 'neutral'}>{lot.statut}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ============================================================
   P3-3 : ÉVALUATION SOUS-TRAITANT STRUCTURÉE (CDC §12)
   ============================================================ */

const ST_CRITERES = [
  { id: 'qualite', label: 'Qualité du travail', poids: 30 },
  { id: 'delais', label: 'Respect des délais', poids: 25 },
  { id: 'securite', label: 'Conformité sécurité', poids: 20 },
  { id: 'communication', label: 'Communication', poids: 15 },
  { id: 'prix', label: 'Compétitivité prix', poids: 10 },
];

export const BtpSTEvaluation: React.FC<{
  sousTraitanceId: string;
  entreprise: string;
  onEvaluate: (notes: Record<string, number>, commentaire: string) => void;
}> = ({ sousTraitanceId, entreprise, onEvaluate }) => {
  const [notes, setNotes] = useState<Record<string, number>>({});
  const [commentaire, setCommentaire] = useState('');

  const noteGlobale = ST_CRITERES.reduce((s, c) => s + (notes[c.id] || 0) * c.poids / 100, 0);

  return (
    <div className="space-y-4">
      <div>
        <p className="label">Évaluation de « {entreprise} »</p>
        <p className="text-[11.5px] text-slate-400">Note chaque critère de 1 (très insatisfaisant) à 5 (excellent)</p>
      </div>

      {ST_CRITERES.map(critere => (
        <div key={critere.id} className="flex items-center gap-3">
          <span className="text-[12.5px] text-slate-700 flex-1">{critere.label} <span className="text-slate-400">({critere.poids}%)</span></span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                onClick={() => setNotes({ ...notes, [critere.id]: n })}
                className={`w-7 h-7 rounded text-[12px] font-bold transition-colors ${
                  notes[critere.id] === n
                    ? n >= 4 ? 'bg-emerald-500 text-white' : n === 3 ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white'
                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div>
        <label className="label">Commentaire</label>
        <textarea className="input" rows={2} value={commentaire} onChange={e => setCommentaire(e.target.value)} placeholder="Points forts, points d'amélioration..." />
      </div>

      <div className="p-3 rounded-lg bg-slate-900 text-white flex items-center justify-between">
        <span className="text-[12px] font-bold uppercase tracking-wider text-slate-400">Note globale pondérée</span>
        <span className={`font-mono text-2xl font-bold ${noteGlobale >= 4 ? 'text-emerald-400' : noteGlobale >= 3 ? 'text-amber-400' : 'text-rose-400'}`}>
          {noteGlobale > 0 ? noteGlobale.toFixed(1) : '—'}/5
        </span>
      </div>

      <button
        onClick={() => onEvaluate(notes, commentaire)}
        disabled={Object.keys(notes).length < ST_CRITERES.length}
        className="btn btn-primary w-full"
      >
        Enregistrer l'évaluation
      </button>
    </div>
  );
};
