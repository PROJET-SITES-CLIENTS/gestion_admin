import React, { useState } from 'react';
import { useApp } from '../store';
import { Layers, Plus, Trash2, ChevronRight, ChevronDown, Users, Calendar } from 'lucide-react';
import { Badge, statusTone, Progress } from './ui';
import { BtpLot, BtpTache } from '../types';

/**
 * Section Lots & Tâches — intégrée dans la fiche chantier.
 * Découpage hiérarchique : Chantier → Lot → Tâche (WBS)
 */
export const BtpLotsSection: React.FC<{ chantierId: string }> = ({ chantierId }) => {
  const {
    btpLots, btpTaches, createBtpLot, updateBtpLot,
    createBtpTache, updateBtpTache, currentRole, btpEmployeeDirectory,
  } = useApp();

  const [showAddLot, setShowAddLot] = useState(false);
  const [newLot, setNewLot] = useState({ nom: '', description: '', budget: 0 });
  const [expandedLot, setExpandedLot] = useState<string | null>(null);
  const [showAddTache, setShowAddTache] = useState<string | null>(null);
  const [newTache, setNewTache] = useState({ nom: '', date_debut: '', date_fin: '', assigne_a: '', duree_jours: 0 });

  const lots = btpLots.filter(l => l.chantier_id === chantierId);
  const fmt = (n: number) => (n || 0).toLocaleString('fr-FR');
  const canManage = ['GERANT', 'COND_TRAVAUX', 'CHEF_CHANTIER', 'ETUDES'].includes(currentRole || '');

  const lotTaches = (lotId: string) => btpTaches.filter(t => t.lot_id === lotId);

  const lotStats = (lot: BtpLot) => {
    const taches = lotTaches(lot.id);
    const done = taches.filter(t => t.statut === 'terminee').length;
    const avancement = taches.length > 0 ? Math.round((done / taches.length) * 100) : lot.avancement_pct;
    return { total: taches.length, done, avancement };
  };

  const handleCreateLot = async () => {
    if (!newLot.nom.trim()) return;
    const numero = `LOT-${String(lots.length + 1).padStart(3, '0')}`;
    await createBtpLot({
      chantier_id: chantierId,
      numero,
      nom: newLot.nom,
      description: newLot.description,
      budget: newLot.budget,
    });
    setNewLot({ nom: '', description: '', budget: 0 });
    setShowAddLot(false);
  };

  const handleCreateTache = async (lotId: string) => {
    if (!newTache.nom.trim()) return;
    await createBtpTache({
      lot_id: lotId,
      chantier_id: chantierId,
      nom: newTache.nom,
      date_debut: newTache.date_debut,
      date_fin: newTache.date_fin,
      assigne_a: newTache.assigne_a || undefined,
      duree_jours: newTache.duree_jours || undefined,
    });
    setNewTache({ nom: '', date_debut: '', date_fin: '', assigne_a: '', duree_jours: 0 });
    setShowAddTache(null);
  };

  // Budget total des lots vs budget chantier
  const totalBudgetLots = lots.reduce((s, l) => s + l.budget, 0);
  const avancementGlobal = lots.length > 0
    ? Math.round(lots.reduce((s, l) => s + lotStats(l).avancement, 0) / lots.length)
    : 0;

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-slate-700 flex items-center gap-2">
          <Layers size={15} className="text-indigo-500" /> Lots & Tâches ({lots.length})
        </h3>
        {canManage && (
          <button onClick={() => setShowAddLot(!showAddLot)} className="btn btn-ghost !py-1.5 !px-3 !text-[11px]">
            <Plus size={12} /> Lot
          </button>
        )}
      </div>

      {/* Résumé */}
      {lots.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
            <p className="label !mb-1">Budget alloué aux lots</p>
            <p className="font-mono font-bold text-[14px]">{fmt(totalBudgetLots)} GNF</p>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
            <p className="label !mb-1">Avancement moyen</p>
            <p className="font-mono font-bold text-[14px]">{avancementGlobal}%</p>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
            <p className="label !mb-1">Tâches totales</p>
            <p className="font-mono font-bold text-[14px]">{lots.reduce((s, l) => s + lotStats(l).total, 0)}</p>
          </div>
        </div>
      )}

      {/* Ajout lot */}
      {showAddLot && (
        <div className="flex gap-2 items-end mb-4 pb-4 border-b border-slate-100">
          <div className="flex-1">
            <label className="label">Nom du lot</label>
            <input className="input !py-1.5 !text-[12px]" value={newLot.nom} onChange={e => setNewLot({ ...newLot, nom: e.target.value })} placeholder="Gros œuvre, Électricité, Plomberie..." />
          </div>
          <div className="w-32">
            <label className="label">Budget (GNF)</label>
            <input type="number" className="input !py-1.5 !text-[12px] font-mono" value={newLot.budget || ''} onChange={e => setNewLot({ ...newLot, budget: Number(e.target.value) })} />
          </div>
          <button onClick={handleCreateLot} disabled={!newLot.nom.trim()} className="btn btn-dark !py-1.5 !px-3 shrink-0"><Plus size={13} /></button>
        </div>
      )}

      {/* Liste des lots */}
      {lots.length === 0 ? (
        <p className="text-[12px] text-slate-400">Découpez le chantier en lots (métiers, zones, phases) pour un suivi fin.</p>
      ) : (
        <div className="space-y-2">
          {lots.map(lot => {
            const stats = lotStats(lot);
            const isExpanded = expandedLot === lot.id;
            return (
              <div key={lot.id} className="rounded-lg border border-slate-100 overflow-hidden">
                {/* En-tête du lot */}
                <button
                  onClick={() => setExpandedLot(isExpanded ? null : lot.id)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors text-left"
                >
                  {isExpanded ? <ChevronDown size={14} className="text-slate-400 shrink-0" /> : <ChevronRight size={14} className="text-slate-400 shrink-0" />}
                  <span className="font-mono text-[10.5px] text-indigo-600 font-bold shrink-0">{lot.numero}</span>
                  <span className="font-semibold text-[13px] text-slate-800 flex-1 truncate">{lot.nom}</span>
                  <span className="font-mono text-[11px] text-slate-600 shrink-0">{fmt(lot.budget)}</span>
                  <Badge tone={statusTone(lot.statut)}>{lot.statut}</Badge>
                  <span className="font-mono text-[11px] text-slate-500 shrink-0 w-10 text-right">{stats.avancement}%</span>
                </button>

                {/* Barre d'avancement */}
                <div className="px-3 pb-2">
                  <Progress value={stats.avancement} tone="bg-indigo-500" />
                </div>

                {/* Tâches (déplié) */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] font-bold uppercase text-slate-400">Tâches ({stats.total})</p>
                      {canManage && (
                        <button onClick={() => setShowAddTache(lot.id)} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 uppercase">+ Tâche</button>
                      )}
                    </div>

                    {lotTaches(lot.id).length === 0 ? (
                      <p className="text-[11px] text-slate-400">Aucune tâche. Ajoutez des tâches pour le suivi WBS.</p>
                    ) : (
                      <div className="space-y-1">
                        {lotTaches(lot.id).map(t => {
                          const assigne = btpEmployeeDirectory.find(e => e.id === t.assigne_a);
                          return (
                            <div key={t.id} className="flex items-center gap-2 p-2 rounded-md bg-white border border-slate-100">
                              <button
                                onClick={() => updateBtpTache(t.id, {
                                  statut: t.statut === 'terminee' ? 'en_cours' : 'terminee',
                                  avancement_pct: t.statut === 'terminee' ? 0 : 100,
                                })}
                                className={`w-4 h-4 rounded border shrink-0 ${t.statut === 'terminee' ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-emerald-400'}`}
                              />
                              <span className={`text-[12px] flex-1 ${t.statut === 'terminee' ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                {t.nom}
                              </span>
                              {assigne && <span className="text-[10px] text-slate-400 shrink-0">{assigne.firstName} {assigne.lastName}</span>}
                              {t.date_fin && <span className="text-[10px] text-slate-400 shrink-0">{new Date(t.date_fin).toLocaleDateString('fr-FR')}</span>}
                              {t.priorite === 'critique' && <Badge tone="rose">!</Badge>}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Ajout tâche */}
                    {showAddTache === lot.id && (
                      <div className="mt-2 flex gap-2 items-end">
                        <div className="flex-1">
                          <input className="input !py-1.5 !text-[12px]" placeholder="Nom de la tâche" value={newTache.nom} onChange={e => setNewTache({ ...newTache, nom: e.target.value })} />
                        </div>
                        <input type="date" className="input !py-1.5 !text-[12px] !w-32" value={newTache.date_debut} onChange={e => setNewTache({ ...newTache, date_debut: e.target.value })} />
                        <input type="date" className="input !py-1.5 !text-[12px] !w-32" value={newTache.date_fin} onChange={e => setNewTache({ ...newTache, date_fin: e.target.value })} />
                        <select className="input !py-1.5 !text-[12px] !w-28" value={newTache.assigne_a} onChange={e => setNewTache({ ...newTache, assigne_a: e.target.value })}>
                          <option value="">Assigner…</option>
                          {btpEmployeeDirectory.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                        </select>
                        <button onClick={() => handleCreateTache(lot.id)} disabled={!newTache.nom.trim()} className="btn btn-dark !py-1.5 !px-2.5 shrink-0"><Plus size={12} /></button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
