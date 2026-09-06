import React, { useState } from 'react';
import { useApp } from '../../store';
import { BtpOffreStatus, BtpOffre, BtpChiffrageLigne } from '../../types';
import { Modal } from '../../components/ui';
import { Calculator, Plus, Trash2 } from 'lucide-react';

const FAMILLES: { id: BtpChiffrageLigne['famille'], label: string }[] = [
  { id: 'MATERIAUX', label: 'Matériaux' },
  { id: 'MAIN_OEUVRE', label: 'Main d\'œuvre' },
  { id: 'MATERIEL', label: 'Matériel' },
  { id: 'SOUS_TRAITANCE', label: 'Sous-traitance' },
  { id: 'FRAIS_GENERAUX', label: 'Frais généraux' },
];

/** Éditeur de chiffrage structuré (Phase 2 — rôle ETUDES) + BPU (Vague 2). */
const ChiffrageModal: React.FC<{
  offre: BtpOffre | null;
  onClose: () => void;
  onSave: (payload: { chiffrage_json: string; montant_estime: number; marge_calculee: number }) => void;
}> = ({ offre, onClose, onSave }) => {
  const { btpPrixUnitaires, createBtpPrixUnitaire, pushToast } = useApp();
  const existing: BtpChiffrageLigne[] = (() => {
    try { return offre?.chiffrage_json ? (JSON.parse(offre.chiffrage_json).lignes ?? []) : []; }
    catch { return []; }
  })();
  const existingMarge = (() => {
    try { return offre?.chiffrage_json ? (JSON.parse(offre.chiffrage_json).marge_pct ?? 20) : 20; }
    catch { return 20; }
  })();

  const [lignes, setLignes] = useState<BtpChiffrageLigne[]>(existing);
  const [margePct, setMargePct] = useState<number>(existingMarge);
  const [bpuPick, setBpuPick] = useState('');
  const [familleActive, setFamilleActive] = useState<BtpChiffrageLigne['famille']>('MATERIAUX');

  const coutTotal = lignes.reduce((a, l) => a + l.quantite * l.pu, 0);
  const montantVente = coutTotal * (1 + margePct / 100);
  const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });

  const famillesTotaux = FAMILLES.map(f => ({
    ...f,
    total: lignes.filter(l => l.famille === f.id).reduce((a, l) => a + l.quantite * l.pu, 0),
  }));

  if (!offre) return null;

  return (
    <Modal open={!!offre} onClose={onClose} title={`Chiffrage — ${offre.objet}`} subtitle={`${offre.client} · le montant de vente alimente automatiquement l'offre`} wide>
      <div className="space-y-4">
        {/* Bibliothèque de prix (BPU) */}
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="label">Bibliothèque de prix ({btpPrixUnitaires.length})</label>
            <select
              className="input"
              value={bpuPick}
              onChange={e => {
                const p = btpPrixUnitaires.find(x => x.id === e.target.value);
                if (p) {
                  setLignes(prev => [...prev, { famille: p.famille, designation: p.designation, quantite: 1, pu: p.pu }]);
                  setBpuPick('');
                }
              }}
            >
              <option value="">Insérer un prix de référence…</option>
              {btpPrixUnitaires.map(p => (
                <option key={p.id} value={p.id}>{p.designation} — {p.pu.toLocaleString('fr-FR')} GNF/{p.unite} ({FAMILLES.find(f => f.id === p.famille)?.label})</option>
              ))}
            </select>
          </div>
          <button
            onClick={async () => {
              const nouvelles = lignes.filter(l => l.designation.trim() && l.pu > 0);
              for (const l of nouvelles) {
                await createBtpPrixUnitaire({ designation: l.designation, unite: 'u', pu: l.pu, famille: l.famille, source: 'manuel' });
              }
              pushToast(`${nouvelles.length} prix enregistrés dans la bibliothèque.`, 'SUCCESS');
            }}
            disabled={lignes.length === 0}
            className="btn btn-ghost shrink-0"
            title="Enregistrer les lignes comme prix réutilisables"
          ><Plus size={13} /> BPU</button>
        </div>

        {/* Ajout de ligne manuelle */}
        <AddChiffrageLine familleDefault={familleActive} onFamilleChange={setFamilleActive} onAdd={(l) => setLignes(prev => [...prev, l])} />

        {/* Lignes */}
        {lignes.length > 0 && (
          <div className="rounded-lg border border-slate-100 overflow-hidden">
            <table className="table-premium w-full">
              <thead><tr><th>Phase</th><th>Famille</th><th>Désignation</th><th className="text-right">Qté</th><th className="text-right">PU</th><th className="text-right">Total</th><th></th></tr></thead>
              <tbody>
                {lignes.map((l, i) => (
                  <tr key={i}>
                    <td className="!py-2"><span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">{l.phase || 'Général'}</span></td>
                    <td className="!py-2"><span className="text-[10.5px] font-bold uppercase tracking-wide text-slate-400">{FAMILLES.find(f => f.id === l.famille)?.label}</span></td>
                    <td className="!py-2">{l.designation}</td>
                    <td className="!py-2 text-right font-mono">{l.quantite}</td>
                    <td className="!py-2 text-right font-mono">{fmt(l.pu)}</td>
                    <td className="!py-2 text-right font-mono font-semibold">{fmt(l.quantite * l.pu)}</td>
                    <td className="!py-2 text-right"><button onClick={() => setLignes(prev => prev.filter((_, j) => j !== i))} className="text-slate-300 hover:text-rose-500"><Trash2 size={13} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Répartition + totaux */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-slate-100 p-4 space-y-2 bg-slate-50/60">
            <p className="label !mb-2">Répartition des coûts</p>
            {famillesTotaux.map(f => (
              <div key={f.id} className="flex items-center gap-2 text-[12px]">
                <span className="w-28 text-slate-500 truncate">{f.label}</span>
                <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full rounded-full bg-indigo-400" style={{ width: `${coutTotal > 0 ? (f.total / coutTotal) * 100 : 0}%` }} />
                </div>
                <span className="font-mono text-slate-700 w-24 text-right">{fmt(f.total)}</span>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-4 space-y-3">
            <div className="flex justify-between items-center text-[13px]">
              <span className="text-slate-600 font-medium">Coût total</span>
              <span className="font-mono font-bold text-slate-900">{fmt(coutTotal)} GNF</span>
            </div>
            <div className="flex justify-between items-center text-[13px]">
              <span className="text-slate-600 font-medium">Marge visée</span>
              <span className="flex items-center gap-2">
                <input type="number" min={0} max={200} className="input !py-1 !px-2 !w-20 text-right" value={margePct} onChange={e => setMargePct(Number(e.target.value))} />
                <span className="text-slate-500">%</span>
              </span>
            </div>
            <div className="hairline-gold" />
            <div className="flex justify-between items-baseline">
              <span className="text-[13px] font-bold text-slate-700">Montant de vente</span>
              <span className="font-mono font-bold text-[17px] gold-text">{fmt(montantVente)} GNF</span>
            </div>
            <p className="text-[10.5px] text-slate-400 leading-snug">Marge : {fmt(montantVente - coutTotal)} GNF — ce montant deviendra le budget prévisionnel du chantier si l'offre est gagnée.</p>
          </div>
        </div>

        <button
          onClick={() => onSave({
            chiffrage_json: JSON.stringify({ lignes, cout_total: coutTotal, marge_pct: margePct }),
            montant_estime: Math.round(montantVente),
            marge_calculee: Math.round(montantVente - coutTotal),
          })}
          disabled={lignes.length === 0 || coutTotal <= 0}
          className="btn btn-primary w-full"
        >
          Enregistrer le chiffrage ({fmt(montantVente)} GNF)
        </button>
      </div>
    </Modal>
  );
};

const AddChiffrageLine: React.FC<{
  familleDefault: BtpChiffrageLigne['famille'];
  onFamilleChange: (f: BtpChiffrageLigne['famille']) => void;
  onAdd: (l: BtpChiffrageLigne) => void;
}> = ({ familleDefault, onFamilleChange, onAdd }) => {
  const [famille, setFamille] = useState<BtpChiffrageLigne['famille']>(familleDefault);
  const [designation, setDesignation] = useState('');
  const [quantite, setQuantite] = useState(1);
  const [pu, setPu] = useState(0);

  const [phase, setPhase] = useState('');

  // Synchronise la famille par défaut si elle change à l'extérieur
  React.useEffect(() => setFamille(familleDefault), [familleDefault]);

  return (
    <div className="grid grid-cols-12 gap-2 items-end">
      <div className="col-span-2">
        <label className="label">Phase / Lot</label>
        <input className="input" value={phase} onChange={e => setPhase(e.target.value)} placeholder="Gros oeuvre..." />
      </div>
      <div className="col-span-2">
        <label className="label">Famille</label>
        <select className="input" value={famille} onChange={e => { const f = e.target.value as BtpChiffrageLigne['famille']; setFamille(f); onFamilleChange(f); }}>
          {FAMILLES.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
      </div>
      <div className="col-span-3">
        <label className="label">Désignation</label>
        <input className="input" value={designation} onChange={e => setDesignation(e.target.value)} placeholder="Ciment, ferraillage…" />
      </div>
      <div className="col-span-2">
        <label className="label">Qté</label>
        <input type="number" min={0} className="input" value={quantite || ''} onChange={e => setQuantite(Number(e.target.value))} />
      </div>
      <div className="col-span-2">
        <label className="label">PU (GNF)</label>
        <input type="number" min={0} className="input" value={pu || ''} onChange={e => setPu(Number(e.target.value))} />
      </div>
      <button
        onClick={() => { if (!designation.trim() || quantite <= 0 || pu <= 0) return; onAdd({ famille, designation, quantite, pu, phase: phase || undefined }); setDesignation(''); setQuantite(1); setPu(0); }}
        disabled={!designation.trim() || quantite <= 0 || pu <= 0}
        className="btn btn-dark col-span-1 !px-0"
        title="Ajouter la ligne"
      ><Plus size={15} /></button>
    </div>
  );
};

export const BtpOffresView = () => {
  const { btpOffres, currentRole, createBtpOffre, updateBtpOffreStatus, updateBtpOffre } = useApp();
  const [showCreate, setShowCreate] = useState(false);
  const [newOffre, setNewOffre] = useState({ client: '', objet: '', montant_estime: 0, date_limite_depot: '' });
  const [chiffrageOffre, setChiffrageOffre] = useState<BtpOffre | null>(null);
  
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createBtpOffre(newOffre);
    setShowCreate(false);
    setNewOffre({ client: '', objet: '', montant_estime: 0, date_limite_depot: '' });
  };

  const statusColumns: { id: BtpOffreStatus, label: string }[] = [
    { id: 'repérée', label: 'Repérée' },
    { id: 'en_chiffrage', label: 'En chiffrage' },
    { id: 'en_validation_financiere', label: 'Validation CPT' },
    { id: 'en_validation_dg', label: 'Validation DG' },
    { id: 'déposée', label: 'Déposée' },
    { id: 'gagnée', label: 'Gagnée' },
    { id: 'perdue', label: 'Perdue' }
  ];

  const handleStatusChange = async (offreId: string, currentStatus: BtpOffreStatus, action: string) => {
    let nextStatus: BtpOffreStatus = currentStatus;
    if (action === 'CHIFRER') nextStatus = 'en_chiffrage';
    if (action === 'SOUMETTRE_CPT') nextStatus = 'en_validation_financiere';
    if (action === 'VALIDER_CPT') nextStatus = 'en_validation_dg';
    if (action === 'REFUSER_CPT') {
      const commentaire = window.prompt("Motif du refus financier (obligatoire) :");
      if (!commentaire) return;
      await updateBtpOffreStatus(offreId, 'en_chiffrage', commentaire);
      return;
    }
    if (action === 'VALIDER_DG') nextStatus = 'déposée';
    if (action === 'GAGNER') nextStatus = 'gagnée';
    if (action === 'PERDRE') nextStatus = 'perdue';
    
    await updateBtpOffreStatus(offreId, nextStatus);
  };

  const handleMontantChange = async (id: string, montant: number) => {
    await updateBtpOffre(id, { montant_estime: montant });
  };

  const handleSaveChiffrage = async (payload: { chiffrage_json: string; montant_estime: number; marge_calculee: number }) => {
    if (!chiffrageOffre) return;
    await updateBtpOffre(chiffrageOffre.id, payload);
    setChiffrageOffre(null);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900"><span className="font-serif italic font-normal text-indigo-600 mr-1.5">Les appels</span>d'offres BTP</h1>
        {(currentRole === 'COMMERCIAL' || currentRole === 'GERANT' || currentRole === 'ETUDES') && (
          <button onClick={() => setShowCreate(true)} className="bg-blue-600 text-white px-4 py-2 rounded shadow-sm hover:bg-blue-700">
            Nouvelle Offre
          </button>
        )}
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white p-4 rounded shadow mb-6 max-w-xl">
          <h2 className="text-lg font-semibold mb-4">Créer une offre</h2>
          <div className="space-y-4">
            <input required type="text" placeholder="Client" className="border p-2 w-full rounded" value={newOffre.client} onChange={e => setNewOffre({...newOffre, client: e.target.value})} />
            <input required type="text" placeholder="Objet de l'appel d'offres" className="border p-2 w-full rounded" value={newOffre.objet} onChange={e => setNewOffre({...newOffre, objet: e.target.value})} />
            <input required type="number" placeholder="Montant estimé" className="border p-2 w-full rounded" value={newOffre.montant_estime} onChange={e => setNewOffre({...newOffre, montant_estime: Number(e.target.value)})} />
            <div>
               <label className="block text-xs text-slate-500 mb-1">Date limite de dépôt</label>
               <input required type="date" className="border p-2 w-full rounded" value={newOffre.date_limite_depot} onChange={e => setNewOffre({...newOffre, date_limite_depot: e.target.value})} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-slate-600 font-medium">Annuler</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-medium rounded shadow-sm hover:bg-blue-700">Enregistrer</button>
            </div>
          </div>
        </form>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {statusColumns.map(col => (
          <div key={col.id} className="min-w-[320px] max-w-[320px] bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h3 className="font-semibold text-slate-700 mb-4 flex justify-between items-center">
              {col.label} 
              <span className="bg-white border text-xs px-2 py-1 rounded-full text-slate-600 font-medium shadow-sm">{btpOffres.filter(o => o.statut === col.id).length}</span>
            </h3>
            
            <div className="space-y-3">
              {btpOffres.filter(o => o.statut === col.id).map(o => {
                const isLocked = ['déposée', 'gagnée', 'perdue', 'retirée'].includes(o.statut);
                
                return (
                  <div key={o.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                    <div className="font-medium text-slate-800 leading-tight mb-1">{o.objet}</div>
                    <div className="text-sm text-slate-500 mb-3">{o.client}</div>
                    
                    <div className="mb-3">
                      <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Montant Estimé (GNF)</label>
                      <input
                        type="number"
                        defaultValue={o.montant_estime}
                        key={`montant-${o.id}-${o.montant_estime}`}
                        onBlur={(e) => { const v = Number(e.target.value); if (v !== o.montant_estime) handleMontantChange(o.id, v); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                        disabled={isLocked || (currentRole !== 'ETUDES' && currentRole !== 'GERANT')}
                        className={`input ${isLocked ? 'opacity-60' : ''}`}
                      />
                    </div>
                    
                    {o.commentaire_validation_financiere && o.statut === 'en_chiffrage' && (
                      <div className="text-xs bg-red-50 text-red-700 p-2 rounded border border-red-100 mb-3">
                        <strong className="block mb-1">Refus CPT :</strong> {o.commentaire_validation_financiere}
                      </div>
                    )}

                    {o.marge_calculee ? (
                      <p className="text-[10.5px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-2 py-1 mb-3 font-mono">
                        Chiffré : marge {o.marge_calculee.toLocaleString('fr-FR')} GNF
                      </p>
                    ) : null}

                    <div className="flex flex-wrap gap-2 pt-2 mt-2 border-t border-slate-100">
                      {(o.statut === 'repérée' || o.statut === 'en_chiffrage') && (currentRole === 'ETUDES' || currentRole === 'GERANT') && (
                        <button onClick={() => setChiffrageOffre(o)} className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium px-3 py-1.5 rounded transition-colors w-full flex items-center justify-center gap-1.5">
                          <Calculator size={12} /> {o.chiffrage_json ? 'Modifier le chiffrage' : 'Chiffrer (détail)'}
                        </button>
                      )}
                      {o.statut === 'repérée' && (currentRole === 'ETUDES' || currentRole === 'GERANT') && (
                        <button onClick={() => handleStatusChange(o.id, o.statut, 'CHIFRER')} className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium px-3 py-1.5 rounded transition-colors w-full">Démarrer Chiffrage</button>
                      )}
                      
                      {o.statut === 'en_chiffrage' && (currentRole === 'ETUDES' || currentRole === 'GERANT') && (
                        <button onClick={() => handleStatusChange(o.id, o.statut, 'SOUMETTRE_CPT')} className="text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium px-3 py-1.5 rounded transition-colors w-full">Soumettre Compta</button>
                      )}
                      
                      {o.statut === 'en_validation_financiere' && (currentRole === 'COMPTABLE' || currentRole === 'GERANT') && (
                        <div className="flex gap-2 w-full">
                          <button onClick={() => handleStatusChange(o.id, o.statut, 'VALIDER_CPT')} className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium px-2 py-1.5 rounded transition-colors flex-1">Valider</button>
                          <button onClick={() => handleStatusChange(o.id, o.statut, 'REFUSER_CPT')} className="text-xs bg-red-50 hover:bg-red-100 text-red-700 font-medium px-2 py-1.5 rounded transition-colors flex-1">Refuser</button>
                        </div>
                      )}
                      
                      {o.statut === 'en_validation_dg' && currentRole === 'GERANT' && (
                        <button onClick={() => handleStatusChange(o.id, o.statut, 'VALIDER_DG')} className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium px-3 py-1.5 rounded transition-colors w-full">Valider & Déposer</button>
                      )}
                      
                      {o.statut === 'déposée' && (currentRole === 'COMMERCIAL' || currentRole === 'GERANT') && (
                        <div className="flex gap-2 w-full">
                          <button onClick={() => handleStatusChange(o.id, o.statut, 'GAGNER')} className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium px-2 py-1.5 rounded transition-colors flex-1">Gagnée</button>
                          <button onClick={() => handleStatusChange(o.id, o.statut, 'PERDRE')} className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium px-2 py-1.5 rounded transition-colors flex-1">Perdue</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <ChiffrageModal offre={chiffrageOffre} onClose={() => setChiffrageOffre(null)} onSave={handleSaveChiffrage} />
    </div>
  );
};
