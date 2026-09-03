import React, { useState, useRef } from 'react';
import { useApp } from '../../store';
import { BtpChantierStatus, BtpChiffrageLigne } from '../../types';
import { Badge, statusTone, Progress } from '../../components/ui';
import { openSecureFile } from '../../utils/secureFile';
import { Wallet, Users, Clock, FileText, Upload, Plus, CheckCircle2 } from 'lucide-react';

const FAMILLES_LABEL: Record<string, string> = {
  MATERIAUX: 'Matériaux', MAIN_OEUVRE: 'Main d\'œuvre', MATERIEL: 'Matériel',
  SOUS_TRAITANCE: 'Sous-traitance', FRAIS_GENERAUX: 'Frais généraux',
};

export const BtpChantiersView = () => {
  const {
    btpChantiers, currentRole, updateBtpChantierStatus, updateBtpChantier,
    btpJournaux, createBtpJournal, btpSituations, createBtpSituation, updateBtpSituation, factureBtpSituation,
    treasuryAccounts, btpChantierStats, btpEmployeeDirectory,
    btpAffectations, createBtpAffectation, terminerBtpAffectation,
    btpPointages, createBtpPointage,
    btpDocuments, addBtpDocument, pushToast,
  } = useApp();
  const [selectedChantierId, setSelectedChantierId] = useState<string | null>(null);
  const [newJournal, setNewJournal] = useState({ avancement_pct: 0, commentaire: '', incidents_mineurs: '', effectifs_presents: '10' });
  const [newSituation, setNewSituation] = useState({ periode: '', pct_avancement_declare: 0, montant_facture: 0 });
  const [factureAccount, setFactureAccount] = useState('');

  // Affectation
  const [newAff, setNewAff] = useState({ employee_id: '', role_chantier: '', taux_journalier: 0 });
  // Pointage (date + heures par employé affecté)
  const [pointageDate, setPointageDate] = useState(new Date().toISOString().slice(0, 10));
  const [pointageHeures, setPointageHeures] = useState<Record<string, number>>({});
  // GED
  const [docForm, setDocForm] = useState({ type: 'plan' as 'plan' | 'pv_reception' | 'attestation' | 'contrat' | 'photo' | 'autre', nom: '', description: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const selectedChantier = btpChantiers.find(c => c.id === selectedChantierId);
  const selectedStat = btpChantierStats.find(s => s.id === selectedChantierId);
  const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });

  const handleStartChantier = async (id: string) => {
    try {
      await updateBtpChantierStatus(id, 'en_cours');
    } catch (err: any) {
      alert(err.message || 'Erreur lors du démarrage.');
    }
  };

  const handleAddJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChantierId) return;
    await createBtpJournal({ ...newJournal, chantier_id: selectedChantierId, date: new Date().toISOString() });
    setNewJournal({ avancement_pct: 0, commentaire: '', incidents_mineurs: '', effectifs_presents: '10' });
  };

  const handleCreateSituation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChantierId) return;
    await createBtpSituation({ ...newSituation, chantier_id: selectedChantierId });
    setNewSituation({ periode: '', pct_avancement_declare: 0, montant_facture: 0 });
  };

  const handleFacture = async (sitId: string) => {
    if (!factureAccount) {
      pushToast('Choisissez d\'abord le compte de trésorerie ci-dessus.', 'WARNING');
      return;
    }
    await factureBtpSituation(sitId, factureAccount);
  };

  const handleAddAffectation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChantierId || !newAff.employee_id) return;
    await createBtpAffectation({
      employee_id: newAff.employee_id,
      chantier_id: selectedChantierId,
      date_debut: new Date().toISOString().slice(0, 10),
      role_chantier: newAff.role_chantier,
      taux_journalier: newAff.taux_journalier,
    });
    setNewAff({ employee_id: '', role_chantier: '', taux_journalier: 0 });
  };

  const handlePointage = async (employeeId: string) => {
    if (!selectedChantierId) return;
    const heures = pointageHeures[employeeId];
    if (!heures && heures !== 0) return;
    await createBtpPointage({
      employee_id: employeeId,
      chantier_id: selectedChantierId,
      date: pointageDate,
      heures,
      presence: heures > 0 ? 'présent' : 'absent',
    });
    setPointageHeures(prev => { const n = { ...prev }; delete n[employeeId]; return n; });
  };

  const handleUploadDoc = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (!selectedChantierId || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    if (!docForm.nom.trim()) { pushToast('Renseignez le nom du document avant l\'upload.', 'WARNING'); return; }
    setUploading(true);
    try {
      const base64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch('/api/uploads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('coord_user') ? { Authorization: `Bearer ${JSON.parse(localStorage.getItem('coord_user')!).token}` } : {}),
        },
        body: JSON.stringify({ filename: file.name, base64 }),
      });
      if (res.ok) {
        const up = await res.json();
        await addBtpDocument({ chantier_id: selectedChantierId, type: docForm.type, nom: docForm.nom, url: up.url, description: docForm.description });
        setDocForm({ type: 'plan', nom: '', description: '' });
      } else {
        pushToast('Upload impossible.', 'ERROR');
      }
    } catch {
      pushToast('Upload impossible (fichier trop volumineux ?).', 'ERROR');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const statusColors: Record<string, string> = {
    'planification': 'bg-slate-100 text-slate-700',
    'en_cours': 'bg-blue-100 text-blue-700',
    'suspendu': 'bg-rose-100 text-rose-700',
    'réception_provisoire': 'bg-indigo-100 text-indigo-700',
    'réception_définitive': 'bg-emerald-100 text-emerald-700',
    'clôturé': 'bg-slate-800 text-white'
  };

  const chantierAffs = selectedChantierId ? btpAffectations.filter(a => a.chantier_id === selectedChantierId) : [];
  const activeAffs = chantierAffs.filter(a => a.statut === 'active');
  const empName = (id: string) => {
    const e = btpEmployeeDirectory.find(x => x.id === id);
    return e ? `${e.firstName} ${e.lastName}`.trim() : id;
  };
  const budgetDetail = selectedChantier?.budget_detail;
  const marge = selectedChantier && selectedStat
    ? selectedChantier.budget_initial - selectedStat.budget_engage - selectedStat.cout_mo_reel
    : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
        <span className="font-serif italic font-normal text-indigo-600 mr-1.5">Le pilotage</span>des chantiers
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ============ LISTE ============ */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-slate-500">Liste des chantiers</h2>
          {btpChantiers.map(c => (
            <div
              key={c.id}
              onClick={() => { setSelectedChantierId(c.id); setFactureAccount(''); }}
              className={`card cursor-pointer p-4 transition-all ${selectedChantierId === c.id ? '!border-indigo-300 shadow-lift' : 'card-hover'}`}
            >
              <div className="flex justify-between items-start mb-2 gap-2">
                <h3 className="font-semibold text-slate-800 text-[14px] leading-tight">{c.nom}</h3>
                <span className={`text-[10px] px-2 py-1 rounded-md font-bold ${statusColors[c.statut]}`}>
                  {c.statut.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <p className="text-[12px] text-slate-500 mb-3">{c.client} • {c.adresse}</p>

              <div className="flex gap-2 mb-3 text-[10.5px]">
                <span className={`px-2 py-1 rounded border font-semibold ${c.rh_validation ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                  RH {c.rh_validation ? '✓' : '✗'}
                </span>
                <span className={`px-2 py-1 rounded border font-semibold ${c.materiel_validation ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                  MAT {c.materiel_validation ? '✓' : '✗'}
                </span>
                <span className="px-2 py-1 rounded border border-slate-200 text-slate-500 font-mono ml-auto">
                  {fmt(c.budget_initial / 1e6)}M
                </span>
              </div>

              {c.statut === 'planification' && (currentRole === 'RESP_MATERIEL' || currentRole === 'GERANT') && !c.materiel_validation && (
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    await updateBtpChantier(c.id, { materiel_validation: true });
                    pushToast(`Matériel validé pour « ${c.nom} ».`, 'SUCCESS');
                  }}
                  className="w-full py-2 mb-2 bg-blue-600 text-white rounded-lg text-[12.5px] font-semibold hover:bg-blue-700"
                >
                  Valider le Matériel (Resp. Matériel)
                </button>
              )}

              {c.statut === 'planification' && (currentRole === 'COND_TRAVAUX' || currentRole === 'GERANT') && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleStartChantier(c.id); }}
                  disabled={!c.rh_validation || !c.materiel_validation}
                  className={`w-full py-2 rounded-lg text-[12.5px] font-semibold transition-colors ${(!c.rh_validation || !c.materiel_validation) ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                >
                  Démarrer le chantier
                </button>
              )}

              {c.statut === 'en_cours' && (currentRole === 'COND_TRAVAUX' || currentRole === 'GERANT') && (
                <button
                  onClick={(e) => { e.stopPropagation(); updateBtpChantierStatus(c.id, 'réception_provisoire'); }}
                  className="w-full py-2 bg-indigo-600 text-white rounded-lg text-[12.5px] font-semibold hover:bg-indigo-700"
                >
                  Déclarer Réception Provisoire
                </button>
              )}
            </div>
          ))}
          {btpChantiers.length === 0 && <p className="text-slate-500 text-sm">Aucun chantier.</p>}
        </div>

        {/* ============ DÉTAIL ============ */}
        <div className="lg:col-span-2">
          {selectedChantier ? (
            <div className="space-y-5">

              {/* ---- En-tête + P&L (Phase 1) ---- */}
              <div className="card p-6">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{selectedChantier.nom}</h2>
                    <p className="text-[12.5px] text-slate-500 mt-0.5">
                      {selectedChantier.client} · {selectedChantier.adresse}
                    </p>
                  </div>
                  <Badge tone={statusTone(selectedChantier.statut)}>{selectedChantier.statut.replace(/_/g, ' ')}</Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="label">Budget initial</p>
                    <p className="font-mono font-bold text-[15px] text-slate-900">{fmt(selectedChantier.budget_initial)}</p>
                  </div>
                  <div>
                    <p className="label">Engagé (dépenses)</p>
                    <p className="font-mono font-bold text-[15px] text-rose-600">{fmt(selectedStat?.budget_engage ?? 0)}</p>
                  </div>
                  <div>
                    <p className="label">MO réelle (pointages)</p>
                    <p className="font-mono font-bold text-[15px] text-blue-600">{fmt(selectedStat?.cout_mo_reel ?? 0)}</p>
                  </div>
                  <div>
                    <p className="label">Marge prévisionnelle</p>
                    <p className={`font-mono font-bold text-[15px] ${marge >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmt(marge)}</p>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1.5">
                    <span>Consommation : {fmt((selectedStat?.budget_engage ?? 0) + (selectedStat?.cout_mo_reel ?? 0))} / {fmt(selectedChantier.budget_initial)}</span>
                    <span className="font-semibold">
                      {selectedChantier.budget_initial > 0 ? Math.min(999, Math.round((((selectedStat?.budget_engage ?? 0) + (selectedStat?.cout_mo_reel ?? 0)) / selectedChantier.budget_initial) * 100)) : 0}%
                    </span>
                  </div>
                  <Progress value={selectedChantier.budget_initial > 0 ? (((selectedStat?.budget_engage ?? 0) + (selectedStat?.cout_mo_reel ?? 0)) / selectedChantier.budget_initial) * 100 : 0} tone={marge >= 0 ? 'bg-indigo-500' : 'bg-rose-500'} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-[11.5px]">
                  <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 font-mono">
                    Situations facturées : {fmt(selectedStat?.montant_situations_facturees ?? 0)}
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-100 font-mono">
                    En attente : {fmt(selectedStat?.montant_situations_attente ?? 0)}
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-slate-50 text-slate-600 border border-slate-200 font-mono">
                    {Math.round(selectedStat?.heures_pointees ?? 0)} h pointées
                  </span>
                </div>

                {/* Budget prévisionnel détaillé (issu du chiffrage) */}
                {budgetDetail?.lignes?.length ? (
                  <div className="mt-5 pt-4 border-t border-slate-100">
                    <p className="label">Budget prévisionnel (chiffrage de l'offre)</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(
                        budgetDetail.lignes.reduce((acc: Record<string, number>, l: BtpChiffrageLigne) => {
                          acc[l.famille] = (acc[l.famille] ?? 0) + l.quantite * l.pu;
                          return acc;
                        }, {})
                      ).map(([fam, total]: [string, number]) => (
                        <span key={fam} className="text-[11px] px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono">
                          {FAMILLES_LABEL[fam] ?? fam} : {fmt(total)}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* ---- Main d'œuvre (Phase 3) ---- */}
              <div className="card p-6">
                <h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-slate-700 mb-4 flex items-center gap-2">
                  <Users size={15} className="text-indigo-500" /> Main d'œuvre & pointage
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Affectations */}
                  <div>
                    <p className="label">Équipe affectée ({activeAffs.length})</p>
                    <div className="space-y-2 mb-3">
                      {chantierAffs.length === 0 && <p className="text-[12px] text-slate-400">Aucune affectation.</p>}
                      {chantierAffs.map(a => (
                        <div key={a.id} className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-100 bg-slate-50/60">
                          <div className="flex-1 min-w-0">
                            <p className="text-[12.5px] font-semibold text-slate-800 truncate">{empName(a.employee_id)}</p>
                            <p className="text-[10.5px] text-slate-400">{a.role_chantier || '—'} · {fmt(a.taux_journalier)} GNF/j</p>
                          </div>
                          {a.statut === 'active' ? (
                            <button onClick={() => terminerBtpAffectation(a.id)} className="text-[10px] text-slate-400 hover:text-rose-600 font-semibold uppercase tracking-wide">Terminer</button>
                          ) : (
                            <Badge tone="neutral">terminée</Badge>
                          )}
                        </div>
                      ))}
                    </div>

                    {['COND_TRAVAUX', 'CHEF_CHANTIER', 'GERANT', 'RH'].includes(currentRole || '') && (
                      <form onSubmit={handleAddAffectation} className="space-y-2 pt-3 border-t border-slate-100">
                        <div className="grid grid-cols-2 gap-2">
                          <select required className="input !py-1.5 !text-[12px]" value={newAff.employee_id} onChange={e => setNewAff({ ...newAff, employee_id: e.target.value })}>
                            <option value="">Employé…</option>
                            {btpEmployeeDirectory.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                          </select>
                          <input className="input !py-1.5 !text-[12px]" placeholder="Rôle (Maçon…)" value={newAff.role_chantier} onChange={e => setNewAff({ ...newAff, role_chantier: e.target.value })} />
                        </div>
                        <div className="flex gap-2">
                          <input type="number" min={0} className="input !py-1.5 !text-[12px] flex-1" placeholder="Taux journalier (GNF)" value={newAff.taux_journalier || ''} onChange={e => setNewAff({ ...newAff, taux_journalier: Number(e.target.value) })} />
                          <button type="submit" disabled={!newAff.employee_id} className="btn btn-dark !py-1.5 !px-3 !text-[11px] shrink-0"><Plus size={12} /> Affecter</button>
                        </div>
                        <p className="text-[10px] text-slate-400">L'affectation notifie le RH pour validation du démarrage.</p>
                      </form>
                    )}
                  </div>

                  {/* Pointage du jour */}
                  <div>
                    <p className="label">Pointage</p>
                    <div className="flex items-center gap-2 mb-3">
                      <input type="date" className="input !py-1.5 !text-[12px] w-40" value={pointageDate} onChange={e => setPointageDate(e.target.value)} />
                      <span className="text-[10.5px] text-slate-400">par employé affecté actif</span>
                    </div>
                    {activeAffs.length === 0 ? (
                      <p className="text-[12px] text-slate-400">Affectez d'abord des employés pour pointer.</p>
                    ) : (
                      <div className="space-y-2">
                        {activeAffs.map(a => (
                          <div key={a.id} className="flex items-center gap-2">
                            <span className="text-[12px] text-slate-700 flex-1 truncate">{empName(a.employee_id)}</span>
                            <input
                              type="number" min={0} max={12}
                              className="input !py-1 !px-2 !w-16 text-right !text-[12px]"
                              placeholder="h"
                              value={pointageHeures[a.employee_id] ?? ''}
                              onChange={e => setPointageHeures(prev => ({ ...prev, [a.employee_id]: Number(e.target.value) }))}
                            />
                            <button
                              onClick={() => handlePointage(a.employee_id)}
                              disabled={pointageHeures[a.employee_id] === undefined}
                              className="btn btn-ghost !py-1 !px-2 !text-[10.5px] shrink-0"
                            ><Clock size={11} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ---- Journal + Situations ---- */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {(currentRole === 'CHEF_CHANTIER' || currentRole === 'GERANT' || currentRole === 'COND_TRAVAUX') && selectedChantier.statut === 'en_cours' && (
                  <form onSubmit={handleAddJournal} className="card p-5">
                    <h3 className="font-bold text-slate-700 text-[13px] uppercase tracking-wide mb-4">Journal du jour</h3>
                    <div className="space-y-3 text-sm">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="label">Effectifs présents</label>
                          <input type="number" required className="input" value={newJournal.effectifs_presents} onChange={e => setNewJournal({ ...newJournal, effectifs_presents: e.target.value })} />
                        </div>
                        <div>
                          <label className="label">Avancement (%)</label>
                          <input type="number" max={100} min={0} required className="input" value={newJournal.avancement_pct || ''} onChange={e => setNewJournal({ ...newJournal, avancement_pct: Number(e.target.value) })} />
                        </div>
                      </div>
                      <div>
                        <label className="label">Travaux réalisés</label>
                        <textarea required className="input" rows={2} value={newJournal.commentaire} onChange={e => setNewJournal({ ...newJournal, commentaire: e.target.value })} />
                      </div>
                      <button type="submit" className="btn btn-dark w-full">Enregistrer l'entrée</button>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 max-h-[180px] overflow-y-auto space-y-2">
                      {btpJournaux.filter(j => j.chantier_id === selectedChantier.id)
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .slice(0, 6)
                        .map(j => (
                          <div key={j.id} className="p-2.5 bg-slate-50 rounded-md border border-slate-100 text-[12px]">
                            <div className="flex justify-between text-slate-400 text-[10.5px] mb-0.5">
                              <span>{new Date(j.date).toLocaleDateString('fr-FR')}</span>
                              <span><strong>{j.avancement_pct}%</strong> · {j.effectifs_presents} pers.</span>
                            </div>
                            <p className="text-slate-700 leading-snug">{j.commentaire}</p>
                          </div>
                        ))}
                    </div>
                  </form>
                )}

                {(currentRole === 'COND_TRAVAUX' || currentRole === 'GERANT' || currentRole === 'COMPTABLE') && (
                  <div className="card p-5">
                    <h3 className="font-bold text-blue-800 text-[13px] uppercase tracking-wide mb-4 flex items-center gap-2">
                      <Wallet size={14} /> Situations de travaux
                    </h3>

                    {(currentRole === 'COMPTABLE' || currentRole === 'GERANT') && (
                      <div className="mb-3">
                        <label className="label">Compte d'encaissement (facturation)</label>
                        <select className="input !py-1.5 !text-[12px]" value={factureAccount} onChange={e => setFactureAccount(e.target.value)}>
                          <option value="">— Choisir le compte —</option>
                          {treasuryAccounts.map(a => <option key={a.id} value={a.id}>{a.name} ({fmt(a.balance)} GNF)</option>)}
                        </select>
                      </div>
                    )}

                    <div className="space-y-2 mb-4 max-h-[200px] overflow-y-auto">
                      {btpSituations.filter(s => s.chantier_id === selectedChantier.id).map(sit => (
                        <div key={sit.id} className="bg-slate-50/70 p-3 rounded-lg border border-slate-100 text-[12.5px]">
                          <div className="flex justify-between font-semibold">
                            <span>{sit.periode}</span>
                            <span className="text-indigo-700 font-mono">{fmt(sit.montant_facture)} GNF</span>
                          </div>
                          <div className="text-slate-400 text-[10.5px] mt-0.5">Avancement : {sit.pct_avancement_declare}%</div>

                          <div className="mt-2 pt-2 border-t border-slate-200/70 flex justify-between items-center">
                            <Badge tone={statusTone(sit.statut)}>{sit.statut.replace(/_/g, ' ')}</Badge>

                            {sit.statut === 'brouillon' && (currentRole === 'COND_TRAVAUX' || currentRole === 'GERANT') && (
                              <button onClick={() => updateBtpSituation(sit.id, { statut: 'en_attente_facturation', valide_par_conducteur: true })} className="btn btn-ghost !py-1 !px-2.5 !text-[10.5px]">Valider → Compta</button>
                            )}
                            {sit.statut === 'en_attente_facturation' && (currentRole === 'COMPTABLE' || currentRole === 'GERANT') && (
                              <button onClick={() => handleFacture(sit.id)} className="btn btn-primary !py-1 !px-2.5 !text-[10.5px]">
                                <CheckCircle2 size={11} /> Facturer & encaisser
                              </button>
                            )}
                            {sit.statut === 'facturée' && sit.date_facturation && (
                              <span className="text-[10px] text-emerald-600 font-semibold">encaissée le {new Date(sit.date_facturation).toLocaleDateString('fr-FR')}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {(currentRole === 'COND_TRAVAUX' || currentRole === 'GERANT') && selectedChantier.statut === 'en_cours' && (
                      <form onSubmit={handleCreateSituation} className="pt-3 border-t border-slate-100 space-y-2 text-[12.5px]">
                        <input type="text" placeholder="Période (ex: Sept 2026)" required className="input" value={newSituation.periode} onChange={e => setNewSituation({ ...newSituation, periode: e.target.value })} />
                        <div className="flex gap-2">
                          <input type="number" placeholder="% Avanc." required className="input w-1/3" value={newSituation.pct_avancement_declare || ''} onChange={e => setNewSituation({ ...newSituation, pct_avancement_declare: Number(e.target.value) })} />
                          <input type="number" placeholder="Montant GNF" required className="input w-2/3" value={newSituation.montant_facture || ''} onChange={e => setNewSituation({ ...newSituation, montant_facture: Number(e.target.value) })} />
                        </div>
                        <button type="submit" className="btn btn-dark w-full">Créer le brouillon</button>
                      </form>
                    )}
                  </div>
                )}
              </div>

              {/* ---- GED (Phase 5) ---- */}
              <div className="card p-6">
                <h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-slate-700 mb-4 flex items-center gap-2">
                  <FileText size={15} className="text-indigo-500" /> Documents du chantier ({btpDocuments.filter(d => d.chantier_id === selectedChantier.id).length})
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    {btpDocuments.filter(d => d.chantier_id === selectedChantier.id).length === 0 && (
                      <p className="text-[12px] text-slate-400">Plans, PV de réception, attestations… aucun document pour l'instant.</p>
                    )}
                    {btpDocuments.filter(d => d.chantier_id === selectedChantier.id).map(d => (
                      <button
                        key={d.id}
                        onClick={() => openSecureFile(d.url)}
                        title="Ouvrir le document (téléchargement sécurisé)"
                        className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/40 transition-colors group text-left"
                      >
                        <span className="h-8 w-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0 group-hover:bg-white">
                          <FileText size={13} />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[12.5px] font-semibold text-slate-800 truncate">{d.nom}</span>
                          <span className="block text-[10px] text-slate-400 uppercase tracking-wide">{d.type.replace('_', ' ')}{d.description ? ` · ${d.description}` : ''}</span>
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="rounded-lg border border-dashed border-slate-300 p-4 space-y-2.5 bg-slate-50/50">
                    <div className="grid grid-cols-2 gap-2">
                      <select className="input !py-1.5 !text-[12px]" value={docForm.type} onChange={e => setDocForm({ ...docForm, type: e.target.value as typeof docForm.type })}>
                        <option value="plan">Plan</option>
                        <option value="pv_reception">PV de réception</option>
                        <option value="attestation">Attestation</option>
                        <option value="contrat">Contrat</option>
                        <option value="photo">Photo</option>
                        <option value="autre">Autre</option>
                      </select>
                      <input className="input !py-1.5 !text-[12px]" placeholder="Nom du document" value={docForm.nom} onChange={e => setDocForm({ ...docForm, nom: e.target.value })} />
                    </div>
                    <input className="input !py-1.5 !text-[12px]" placeholder="Description (optionnel)" value={docForm.description} onChange={e => setDocForm({ ...docForm, description: e.target.value })} />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || !docForm.nom.trim()}
                      className="btn btn-ghost w-full"
                    >
                      <Upload size={13} /> {uploading ? 'Envoi en cours…' : 'Choisir un fichier et téléverser'}
                    </button>
                    <input ref={fileInputRef} type="file" className="hidden" onChange={handleUploadDoc} accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.zip,.txt" />
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="card h-64 flex items-center justify-center text-slate-400 text-sm">
              Sélectionnez un chantier pour afficher les détails
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
