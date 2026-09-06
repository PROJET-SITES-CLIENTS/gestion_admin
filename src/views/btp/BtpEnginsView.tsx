import React, { useState } from 'react';
import { useApp } from '../../store';
import { Truck, Wrench, Settings2 } from 'lucide-react';

export const BtpEnginsView = () => {
  const { btpEngins, btpChantiers, currentRole, assignBtpEngin, updateBtpEnginStatus, updateBtpEngin, pushToast } = useApp();
  const [selectedEngin, setSelectedEngin] = useState<string | null>(null);
  const [editEnginId, setEditEnginId] = useState<string | null>(null);
  const [targetChantier, setTargetChantier] = useState('');
  const canManage = ['RESP_MATERIEL', 'GERANT'].includes(currentRole || '');
  const fmt = (n: number) => (n || 0).toLocaleString('fr-FR');

  const engin = btpEngins.find(e => e.id === selectedEngin);
  const editEngin = btpEngins.find(e => e.id === editEnginId);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEngin) return;
    try {
      await assignBtpEngin(selectedEngin, targetChantier || undefined);
      pushToast('Affectation mise à jour.', 'SUCCESS');
      setSelectedEngin(null);
    } catch (err: any) {
      pushToast(err.message || "Erreur lors de l'affectation.", 'ERROR');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editEnginId) return;
    const fd = new FormData(e.currentTarget);
    const updates: any = {};
    const taux = Number(fd.get('taux_horaire'));
    const compteur = Number(fd.get('compteur_horaire'));
    const derniere = fd.get('date_derniere_maintenance') as string;
    const prochaine = fd.get('date_prochaine_maintenance_prevue') as string;
    if (taux !== (editEngin?.taux_horaire ?? 0)) updates.taux_horaire = taux;
    if (compteur !== (editEngin?.compteur_horaire ?? 0)) updates.compteur_horaire = compteur;
    if (derniere && derniere !== (editEngin?.date_derniere_maintenance ?? '')) updates.date_derniere_maintenance = derniere;
    if (prochaine && prochaine !== (editEngin?.date_prochaine_maintenance_prevue ?? '')) updates.date_prochaine_maintenance_prevue = prochaine;

    if (Object.keys(updates).length > 0) {
      await updateBtpEngin(editEnginId, updates);
      pushToast('Engin mis à jour.', 'SUCCESS');
    }
    setEditEnginId(null);
  };

  const statusColors: Record<string, string> = {
    disponible: 'bg-emerald-100 text-emerald-700',
    'affecté': 'bg-blue-100 text-blue-700',
    en_maintenance: 'bg-amber-100 text-amber-700',
    hors_service: 'bg-rose-100 text-rose-700',
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
        <span className="font-serif italic font-normal text-indigo-600 mr-1.5">Le parc</span>matériel & engins
      </h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4"><p className="label">Total engins</p><p className="font-mono font-bold text-xl text-slate-900">{btpEngins.length}</p></div>
        <div className="card p-4"><p className="label">Disponibles</p><p className="font-mono font-bold text-xl text-emerald-600">{btpEngins.filter(e => e.statut === 'disponible').length}</p></div>
        <div className="card p-4"><p className="label">Affectés</p><p className="font-mono font-bold text-xl text-blue-600">{btpEngins.filter(e => e.statut === 'affecté').length}</p></div>
        <div className="card p-4"><p className="label">HS / Maintenance</p><p className="font-mono font-bold text-xl text-rose-600">{btpEngins.filter(e => e.statut === 'en_maintenance' || e.statut === 'hors_service').length}</p></div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="table-premium w-full min-w-[720px]">
          <thead>
            <tr>
              <th>ID Interne</th><th>Type</th><th>Statut</th><th>Affectation</th>
              <th className="text-right">Taux/h (GNF)</th><th className="text-right">Compteur</th>
              <th>Maintenance</th><th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {btpEngins.map(e => {
              const chantier = btpChantiers.find(c => c.id === e.chantier_affecte_id);
              const maintenanceUrgente = e.date_prochaine_maintenance_prevue && new Date(e.date_prochaine_maintenance_prevue) < new Date();
              return (
                <tr key={e.id}>
                  <td className="font-medium text-slate-800">{e.identifiant_interne}</td>
                  <td className="text-slate-600">{e.type}</td>
                  <td><span className={`badge ${statusColors[e.statut] || 'bg-slate-100 text-slate-600'}`}>{e.statut.replace(/_/g, ' ')}</span></td>
                  <td className="text-slate-600">{chantier?.nom || <span className="text-slate-400 italic">Aucune</span>}</td>
                  <td className="text-right font-mono text-slate-700">{e.taux_horaire ? fmt(e.taux_horaire) : <span className="text-slate-300">—</span>}</td>
                  <td className="text-right font-mono text-slate-600">{e.compteur_horaire} h</td>
                  <td>
                    {e.date_prochaine_maintenance_prevue ? (
                      <span className={`text-[11px] ${maintenanceUrgente ? 'text-rose-600 font-semibold' : 'text-slate-500'}`}>
                        {maintenanceUrgente ? '⚠ ' : ''}{new Date(e.date_prochaine_maintenance_prevue).toLocaleDateString('fr-FR')}
                      </span>
                    ) : <span className="text-slate-300 text-[11px]">—</span>}
                  </td>
                  <td className="text-right">
                    {canManage && (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditEnginId(e.id)} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium flex items-center gap-1" title="Éditer taux/compteur/maintenance">
                          <Settings2 size={12} /> Éditer
                        </button>
                        <button onClick={() => setSelectedEngin(e.id)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Affecter</button>
                        {e.statut === 'disponible' || e.statut === 'affecté' ? (
                          <button
                            onClick={() => { if (window.confirm(`Mettre ${e.identifiant_interne} HORS SERVICE ?`)) updateBtpEnginStatus(e.id, 'hors_service'); }}
                            className="text-rose-600 hover:text-rose-800 text-xs font-medium"
                          >HS</button>
                        ) : (
                          <button onClick={() => updateBtpEnginStatus(e.id, 'disponible')} className="text-emerald-600 hover:text-emerald-800 text-xs font-medium">
                            {e.statut === 'en_maintenance' ? <Wrench size={12} className="inline mr-0.5" /> : null}Service
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {btpEngins.length === 0 && (
              <tr><td colSpan={8} className="p-8 text-center text-slate-400">Aucun engin dans le parc.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modale affectation */}
      {engin && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-[3px] flex items-center justify-center z-50" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelectedEngin(null); }}>
          <div className="bg-white rounded-2xl shadow-pop w-full max-w-md overflow-hidden animate-[fade-up_.25s_cubic-bezier(.22,1,.36,1)]">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-[15px] font-bold text-slate-900">Affecter — {engin.identifiant_interne}</h3>
              <p className="text-xs text-slate-500">{engin.type}</p>
            </div>
            <form onSubmit={handleAssign} className="px-6 py-5">
              <label className="label">Chantier de destination</label>
              <select className="input" value={targetChantier} onChange={e => setTargetChantier(e.target.value)}>
                <option value="">— Détacher (rendre disponible) —</option>
                {btpChantiers.filter(c => c.statut === 'planification' || c.statut === 'en_cours').map(c => (
                  <option key={c.id} value={c.id}>{c.nom} ({c.statut})</option>
                ))}
              </select>
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={() => setSelectedEngin(null)} className="btn btn-ghost">Annuler</button>
                <button type="submit" className="btn btn-primary">Valider</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale édition (taux_horaire, compteur, maintenance) */}
      {editEngin && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-[3px] flex items-center justify-center z-50" onMouseDown={(e) => { if (e.target === e.currentTarget) setEditEnginId(null); }}>
          <div className="bg-white rounded-2xl shadow-pop w-full max-w-md overflow-hidden animate-[fade-up_.25s_cubic-bezier(.22,1,.36,1)]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <Truck size={16} className="text-indigo-500" />
              <div>
                <h3 className="text-[15px] font-bold text-slate-900">Éditer — {editEngin.identifiant_interne}</h3>
                <p className="text-xs text-slate-500">Taux d'imputation, compteur horaire et maintenance</p>
              </div>
            </div>
            <form onSubmit={handleEditSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="label">Taux horaire (GNF/h) — imputé au P&L des chantiers</label>
                <input name="taux_horaire" type="number" min={0} className="input font-mono" defaultValue={editEngin.taux_horaire ?? 0} placeholder="ex: 45000" />
              </div>
              <div>
                <label className="label">Compteur horaire (heures)</label>
                <input name="compteur_horaire" type="number" min={0} className="input font-mono" defaultValue={editEngin.compteur_horaire ?? 0} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Dernière maintenance</label>
                  <input name="date_derniere_maintenance" type="date" className="input" defaultValue={editEngin.date_derniere_maintenance || ''} />
                </div>
                <div>
                  <label className="label">Prochaine prévue</label>
                  <input name="date_prochaine_maintenance_prevue" type="date" className="input" defaultValue={editEngin.date_prochaine_maintenance_prevue || ''} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditEnginId(null)} className="btn btn-ghost">Annuler</button>
                <button type="submit" className="btn btn-primary">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
