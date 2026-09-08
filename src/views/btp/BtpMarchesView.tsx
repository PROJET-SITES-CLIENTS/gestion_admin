import React, { useState } from 'react';
import { useApp } from '../../store';
import { FileSignature, Plus, CheckCircle2, Building2, TrendingUp, TrendingDown } from 'lucide-react';
import { Badge, statusTone, Modal, EmptyState } from '../../components/ui';
import { BtpMarcheStatus } from '../../types';

const STATUS_LABELS: Record<BtpMarcheStatus, string> = {
  brouillon: 'Brouillon', en_validation: 'En validation', signe: 'Signé',
  os_recu: 'OS reçu', en_cours: 'En cours', suspendu: 'Suspendu',
  acheve: 'Achevé', resilie: 'Résilié', cloture: 'Clôturé',
};

const STATUS_TONES: Record<BtpMarcheStatus, 'neutral' | 'gold' | 'emerald' | 'amber' | 'rose' | 'blue'> = {
  brouillon: 'neutral', en_validation: 'gold', signe: 'blue', os_recu: 'blue',
  en_cours: 'blue', suspendu: 'amber', acheve: 'emerald', resilie: 'rose', cloture: 'emerald',
};

export const BtpMarchesView = () => {
  const { btpMarches, btpChantiers, currentRole, createBtpMarche, updateBtpMarche, signerBtpMarche, pushToast } = useApp();
  const [showCreate, setShowCreate] = useState(false);
  const [newMarche, setNewMarche] = useState({
    client_nom: '', objet: '', montant_ht: 0, tva_rate: 18,
    retenue_garantie_pct: 5, penalite_journaliere: 0, conditions_paiement: '',
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fmt = (n: number) => (n || 0).toLocaleString('fr-FR');
  const canManage = ['GERANT', 'COMMERCIAL', 'ETUDES', 'COMPTABLE'].includes(currentRole || ''); // M2 : ASSISTANTE retirée (création/signature hors périmètre)

  const selected = btpMarches.find(m => m.id === selectedId);
  const selectedChantiers = selected ? btpChantiers.filter(c => c.marche_id === selected.id) : [];

  const handleCreate = async () => {
    if (!newMarche.client_nom.trim() || !newMarche.objet.trim() || newMarche.montant_ht <= 0) {
      pushToast('Client, objet et montant HT obligatoires.', 'ERROR');
      return;
    }
    const tva = Math.round(newMarche.montant_ht * newMarche.tva_rate / 100);
    await createBtpMarche({
      ...newMarche,
      montant_ttc: newMarche.montant_ht + tva,
    } as any);
    setShowCreate(false);
    setNewMarche({ client_nom: '', objet: '', montant_ht: 0, tva_rate: 18, retenue_garantie_pct: 5, penalite_journaliere: 0, conditions_paiement: '' });
  };

  // KPIs
  const totalEngage = btpMarches.filter(m => !['resilie', 'cloture'].includes(m.statut)).reduce((s, m) => s + m.montant_ttc, 0);
  const enCours = btpMarches.filter(m => ['signe', 'os_recu', 'en_cours'].includes(m.statut)).length;
  const suspendus = btpMarches.filter(m => m.statut === 'suspendu').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
            <span className="font-serif italic font-normal text-indigo-600 mr-1.5">Les marchés</span>& contrats
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">Chaîne contractuelle : Offre gagnée → Marché signé → Chantiers</p>
        </div>
        {canManage && (
          <button onClick={() => setShowCreate(true)} className="btn btn-primary">
            <Plus size={14} /> Nouveau marché
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-5"><p className="label">Total marchés</p><p className="font-mono font-bold text-xl">{btpMarches.length}</p></div>
        <div className="card p-5"><p className="label">Engagé TTC</p><p className="font-mono font-bold text-xl text-indigo-600">{fmt(totalEngage)}</p></div>
        <div className="card p-5"><p className="label">En cours</p><p className="font-mono font-bold text-xl text-blue-600">{enCours}</p></div>
        <div className="card p-5"><p className="label">Suspendus</p><p className={`font-mono font-bold text-xl ${suspendus > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{suspendus}</p></div>
      </div>

      {/* Liste */}
      {btpMarches.length === 0 ? (
        <div className="card">
          <EmptyState icon={<FileSignature size={20} />} title="Aucun marché" hint="Les marchés formalisent la relation contractuelle client. Créez-en un après avoir gagné une offre." />
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-premium w-full min-w-[720px]">
            <thead>
              <tr>
                <th>Numéro</th><th>Client</th><th>Objet</th>
                <th className="text-right">Montant TTC</th><th>Statut</th>
                <th>Chantiers</th><th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {btpMarches.map(m => {
                const chantiers = btpChantiers.filter(c => c.marche_id === m.id);
                return (
                  <tr key={m.id} onClick={() => setSelectedId(m.id)} className="cursor-pointer">
                    <td className="font-mono text-[11.5px] text-indigo-600 font-semibold">{m.numero}</td>
                    <td className="font-semibold text-slate-800">{m.client_nom}</td>
                    <td className="text-slate-600 max-w-[200px] truncate">{m.objet}</td>
                    <td className="text-right font-mono font-bold">{fmt(m.montant_ttc)}</td>
                    <td><Badge tone={STATUS_TONES[m.statut] || 'neutral'}>{STATUS_LABELS[m.statut]}</Badge></td>
                    <td className="text-center font-mono">{chantiers.length}</td>
                    <td className="text-center">
                      {m.statut === 'brouillon' && currentRole === 'GERANT' && (
                        <button onClick={(e) => { e.stopPropagation(); signerBtpMarche(m.id); }} className="btn btn-primary !py-1 !px-2.5 !text-[10.5px]">
                          <CheckCircle2 size={11} /> Signer
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Fiche marché (modal) */}
      <Modal open={!!selected} onClose={() => setSelectedId(null)} title={selected?.numero || ''} subtitle={selected?.client_nom} wide>
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div><p className="label">Objet</p><p className="text-sm font-semibold">{selected.objet}</p></div>
              <div><p className="label">Montant HT</p><p className="font-mono font-bold">{fmt(selected.montant_ht)} GNF</p></div>
              <div><p className="label">TVA ({selected.tva_rate}%)</p><p className="font-mono">{fmt(selected.montant_ttc - selected.montant_ht)} GNF</p></div>
              <div><p className="label">Montant TTC</p><p className="font-mono font-bold text-lg text-indigo-600">{fmt(selected.montant_ttc)} GNF</p></div>
              <div><p className="label">Retenue garantie</p><p className="font-mono">{selected.retenue_garantie_pct || 0}%</p></div>
              <div><p className="label">Pénalité/jour</p><p className="font-mono">{fmt(selected.penalite_journaliere || 0)} GNF</p></div>
            </div>
            {selected.conditions_paiement && (
              <div><p className="label">Conditions de paiement</p><p className="text-sm text-slate-600">{selected.conditions_paiement}</p></div>
            )}
            <div>
              <p className="label">Chantiers liés ({selectedChantiers.length})</p>
              {selectedChantiers.length === 0 ? (
                <p className="text-sm text-slate-400">Aucun chantier rattaché. Créez un chantier avec ce marché.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {selectedChantiers.map(c => <Badge key={c.id} tone={statusTone(c.statut)}>{c.nom}</Badge>)}
                </div>
              )}
            </div>
            {selected.statut === 'brouillon' && currentRole === 'GERANT' && (
              <button onClick={() => { signerBtpMarche(selected.id); setSelectedId(null); }} className="btn btn-primary w-full">
                <CheckCircle2 size={14} /> Signer le marché
              </button>
            )}
          </div>
        )}
      </Modal>

      {/* Création */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouveau marché" subtitle="Formalise la relation contractuelle" wide>
        <div className="space-y-4">
          <div>
            <label className="label">Client</label>
            <input className="input" value={newMarche.client_nom} onChange={e => setNewMarche({ ...newMarche, client_nom: e.target.value })} placeholder="Nom du client" />
          </div>
          <div>
            <label className="label">Objet du marché</label>
            <input className="input" value={newMarche.objet} onChange={e => setNewMarche({ ...newMarche, objet: e.target.value })} placeholder="Construction, rénovation..." />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Montant HT (GNF)</label>
              <input type="number" className="input font-mono" value={newMarche.montant_ht || ''} onChange={e => setNewMarche({ ...newMarche, montant_ht: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">TVA (%)</label>
              <input type="number" className="input font-mono" value={newMarche.tva_rate} onChange={e => setNewMarche({ ...newMarche, tva_rate: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">RG (%)</label>
              <input type="number" className="input font-mono" value={newMarche.retenue_garantie_pct} onChange={e => setNewMarche({ ...newMarche, retenue_garantie_pct: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <label className="label">Conditions de paiement</label>
            <input className="input" value={newMarche.conditions_paiement} onChange={e => setNewMarche({ ...newMarche, conditions_paiement: e.target.value })} placeholder="Ex: 30% acompte, solde à la réception" />
          </div>
          <p className="text-[12.5px] font-mono bg-indigo-50 border border-indigo-100 rounded-lg p-3">
            TTC estimé : <strong>{fmt(newMarche.montant_ht * (1 + newMarche.tva_rate / 100))} GNF</strong>
          </p>
          <button onClick={handleCreate} disabled={!newMarche.client_nom.trim() || newMarche.montant_ht <= 0} className="btn btn-primary w-full">Créer le marché</button>
        </div>
      </Modal>
    </div>
  );
};
