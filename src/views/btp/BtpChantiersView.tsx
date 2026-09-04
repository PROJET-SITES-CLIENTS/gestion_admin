import React, { useState, useRef } from 'react';
import { useApp } from '../../store';
import { BtpChantierStatus, BtpChiffrageLigne, BtpAvenant } from '../../types';
import { Badge, statusTone, Progress } from '../../components/ui';
import { openSecureFile } from '../../utils/secureFile';
import { generateOsPDF, generatePvPDF } from '../../utils/pdfGenerator';
import {
  Wallet, Users, Clock, FileText, Upload, Plus, CheckCircle2, AlertTriangle,
  FileSignature, ShieldCheck, Truck, Download, XCircle, Ban,
} from 'lucide-react';

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
    btpDocuments, addBtpDocument, pushToast, companyConfig,
    btpAvenants, createBtpAvenant, validerBtpAvenant, rejeterBtpAvenant,
    btpOrdresService, btpSousTraitances, createBtpSousTraitance, solderBtpSousTraitance,
    btpCautionnements, createBtpCautionnement, libererBtpRetenues,
    btpEngins, btpHeuresEngins, createBtpHeureEngin, btpBonCommandes,
  } = useApp();

  const [selectedChantierId, setSelectedChantierId] = useState<string | null>(null);
  const [newJournal, setNewJournal] = useState({ avancement_pct: 0, commentaire: '', incidents_mineurs: '', effectifs_presents: '10' });
  const [factureAccount, setFactureAccount] = useState('');
  const [retenueAccount, setRetenueAccount] = useState('');

  // Situation : HT + TVA + retenue
  const [newSituation, setNewSituation] = useState({ periode: '', pct_avancement_declare: 0, montant_ht: 0, avecTva: true });
  // Affectation / pointage
  const [newAff, setNewAff] = useState({ employee_id: '', role_chantier: '', taux_journalier: 0 });
  const [pointageDate, setPointageDate] = useState(new Date().toISOString().slice(0, 10));
  const [pointageHeures, setPointageHeures] = useState<Record<string, number>>({});
  // Heures engins
  const [enginHeures, setEnginHeures] = useState({ engin_id: '', heures: 0 });
  // Avenant
  const [newAvenant, setNewAvenant] = useState({ type: 'montant' as BtpAvenant['type'], objet: '', montant: 0, jours_delai: 0 });
  // Sous-traitance
  const [newST, setNewST] = useState({ entreprise: '', objet: '', montant: 0 });
  // Cautionnement
  const [newCaut, setNewCaut] = useState({ type: 'bonne_execution' as BtpCautionnementsLocal['type'], assureur_banque: '', montant: 0 });
  // GED
  const [docForm, setDocForm] = useState({ type: 'plan' as 'plan' | 'pv_reception' | 'attestation' | 'contrat' | 'photo' | 'autre', nom: '', description: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  type BtpCautionnementsLocal = { type: 'soumission' | 'bonne_execution' | 'decennale' | 'avance' };

  const selectedChantier = btpChantiers.find(c => c.id === selectedChantierId);
  const selectedStat = btpChantierStats.find(s => s.id === selectedChantierId);
  const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
  const tvaRate = (companyConfig.tvaRate || 18) / 100;
  const retenuePct = selectedChantier?.retenue_garantie_pct || 0;

  const handleStartChantier = async (id: string) => {
    try { await updateBtpChantierStatus(id, 'en_cours'); } catch (err: any) { alert(err.message); }
  };

  const handleAddJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChantierId) return;
    await createBtpJournal({ ...newJournal, chantier_id: selectedChantierId, date: new Date().toISOString() });
    setNewJournal({ avancement_pct: 0, commentaire: '', incidents_mineurs: '', effectifs_presents: '10' });
  };

  // Situation : HT → TVA → TTC → retenue (le net encaissé est calculé côté serveur)
  const sitTva = newSituation.avecTva ? Math.round(newSituation.montant_ht * tvaRate) : 0;
  const sitTtc = newSituation.montant_ht + sitTva;
  const sitRetenue = Math.round(sitTtc * (retenuePct / 100));

  const handleCreateSituation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChantierId) return;
    await createBtpSituation({
      ...newSituation,
      chantier_id: selectedChantierId,
      montant_facture: sitTtc,
      montant_ht: newSituation.montant_ht,
      tva_amount: sitTva,
      retenue_amount: sitRetenue,
    } as any);
    setNewSituation({ periode: '', pct_avancement_declare: 0, montant_ht: 0, avecTva: true });
  };

  const handleFacture = async (sitId: string) => {
    if (!factureAccount) { pushToast('Choisissez d\'abord le compte de trésorerie.', 'WARNING'); return; }
    await factureBtpSituation(sitId, factureAccount);
  };

  const handleAddAffectation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChantierId || !newAff.employee_id) return;
    await createBtpAffectation({
      employee_id: newAff.employee_id, chantier_id: selectedChantierId,
      date_debut: new Date().toISOString().slice(0, 10),
      role_chantier: newAff.role_chantier, taux_journalier: newAff.taux_journalier,
    });
    setNewAff({ employee_id: '', role_chantier: '', taux_journalier: 0 });
  };

  const handlePointage = async (employeeId: string) => {
    if (!selectedChantierId) return;
    const heures = pointageHeures[employeeId];
    if (heures === undefined) return;
    await createBtpPointage({ employee_id: employeeId, chantier_id: selectedChantierId, date: pointageDate, heures, presence: heures > 0 ? 'présent' : 'absent' });
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
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const stored = localStorage.getItem('coord_user');
      const res = await fetch('/api/uploads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(stored ? { Authorization: `Bearer ${JSON.parse(stored).token}` } : {}) },
        body: JSON.stringify({ filename: file.name, base64 }),
      });
      if (res.ok) {
        const up = await res.json();
        await addBtpDocument({ chantier_id: selectedChantierId, type: docForm.type, nom: docForm.nom, url: up.url, description: docForm.description });
        setDocForm({ type: 'plan', nom: '', description: '' });
      } else pushToast('Upload impossible.', 'ERROR');
    } catch { pushToast('Upload impossible (fichier trop volumineux ?).', 'ERROR'); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleExportCSV = () => {
    if (!selectedChantier) return;
    const sits = btpSituations.filter(s => s.chantier_id === selectedChantier.id);
    const rows = [
      ['Chantier', selectedChantier.nom],
      ['Export', new Date().toLocaleString('fr-FR')], [],
      ['Periode', 'HT', 'TVA', 'TTC', 'Retenue', 'Net encaisse', 'Statut', 'Facturee le'],
      ...sits.map(s => [s.periode, s.montant_ht ?? '', s.tva_amount ?? 0, s.montant_facture, s.retenue_amount ?? 0, s.montant_facture - (s.retenue_amount ?? 0), s.statut, s.date_facturation ? new Date(s.date_facturation).toLocaleDateString('fr-FR') : '']), [],
      ['Depenses engagees (TTC)', selectedStat?.budget_engage ?? 0],
      ['MO reelle', selectedStat?.cout_mo_reel ?? 0],
      ['Cout engins', selectedStat?.cout_engins ?? 0],
      ['Sous-traitance', selectedStat?.cout_sous_traitance ?? 0],
      ['Retenues bloquees', selectedStat?.retenue_bloquee ?? 0],
    ];
    const csv = '\uFEFF' + rows.map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Chantier_${selectedChantier.nom.replace(/\s+/g, '_')}_export.csv`;
    a.click();
  };

  const statusColors: Record<string, string> = {
    'planification': 'bg-slate-100 text-slate-700', 'en_cours': 'bg-blue-100 text-blue-700',
    'suspendu': 'bg-rose-100 text-rose-700', 'réception_provisoire': 'bg-indigo-100 text-indigo-700',
    'réception_définitive': 'bg-emerald-100 text-emerald-700', 'clôturé': 'bg-slate-800 text-white'
  };

  const chantierAffs = selectedChantierId ? btpAffectations.filter(a => a.chantier_id === selectedChantierId) : [];
  const activeAffs = chantierAffs.filter(a => a.statut === 'active');
  const empName = (id: string) => {
    const e = btpEmployeeDirectory.find(x => x.id === id);
    return e ? `${e.firstName} ${e.lastName}`.trim() : id;
  };
  const chantierAvenants = selectedChantierId ? btpAvenants.filter(a => a.chantier_id === selectedChantierId) : [];
  const chantierOS = selectedChantierId ? btpOrdresService.filter(o => o.chantier_id === selectedChantierId) : [];
  const chantierST = selectedChantierId ? btpSousTraitances.filter(s => s.chantier_id === selectedChantierId) : [];
  const chantierCauts = selectedChantierId ? btpCautionnements.filter(c => c.chantier_id === selectedChantierId) : [];
  const chantierHeuresEngins = selectedChantierId ? btpHeuresEngins.filter(h => h.chantier_id === selectedChantierId) : [];
  const enginsDispos = btpEngins.filter(e => e.statut !== 'hors_service');

  const budgetDetail = selectedChantier?.budget_detail;
  const coutsTotaux = (selectedStat?.budget_engage ?? 0) + (selectedStat?.cout_mo_reel ?? 0) + (selectedStat?.cout_engins ?? 0) + (selectedStat?.cout_sous_traitance ?? 0);
  const marge = selectedChantier ? selectedChantier.budget_initial - coutsTotaux : 0;
  const enRetard = selectedChantier?.date_fin_prevue &&
    new Date(selectedChantier.date_fin_prevue).getTime() < Date.now() &&
    !['clôturé', 'réception_définitive'].includes(selectedChantier.statut);
  const joursRetard = enRetard && selectedChantier?.date_fin_prevue ?
    Math.ceil((Date.now() - new Date(selectedChantier.date_fin_prevue).getTime()) / 86400000) : 0;

  // Rapprochement chiffrage / réalisé par famille (réel mappé depuis les stats)
  const rapprochement: { famille: string; prevu: number; reel: number }[] = budgetDetail?.lignes?.length ? [
    { famille: 'Matériaux', prevu: sumFamille('MATERIAUX'), reel: selectedStat?.cout_stock_sorti ?? 0 },
    { famille: 'Main d\'œuvre', prevu: sumFamille('MAIN_OEUVRE'), reel: selectedStat?.cout_mo_reel ?? 0 },
    { famille: 'Matériel', prevu: sumFamille('MATERIEL'), reel: selectedStat?.cout_engins ?? 0 },
    { famille: 'Sous-traitance', prevu: sumFamille('SOUS_TRAITANCE'), reel: selectedStat?.cout_sous_traitance ?? 0 },
    { famille: 'Frais généraux', prevu: sumFamille('FRAIS_GENERAUX'), reel: 0 },
  ] : [];
  function sumFamille(f: string) {
    return (budgetDetail?.lignes ?? [])
      .filter((l: BtpChiffrageLigne) => l.famille === f)
      .reduce((a: number, l: BtpChiffrageLigne) => a + l.quantite * l.pu, 0);
  }

  const lastAvancement = (() => {
    if (!selectedChantierId) return 0;
    const js = btpJournaux.filter(j => j.chantier_id === selectedChantierId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return js[0]?.avancement_pct ?? 0;
  })();

  return (
    <div className="space-y-6">
      <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
        <span className="font-serif italic font-normal text-indigo-600 mr-1.5">Le pilotage</span>des chantiers
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ============ LISTE ============ */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-slate-500">Liste des chantiers</h2>
          {btpChantiers.map(c => {
            const retard = c.date_fin_prevue && new Date(c.date_fin_prevue).getTime() < Date.now() && !['clôturé', 'réception_définitive'].includes(c.statut);
            const st = btpChantierStats.find(s => s.id === c.id);
            return (
              <div
                key={c.id}
                onClick={() => { setSelectedChantierId(c.id); setFactureAccount(''); setRetenueAccount(''); }}
                className={`card cursor-pointer p-4 transition-all ${selectedChantierId === c.id ? '!border-indigo-300 shadow-lift' : 'card-hover'}`}
              >
                <div className="flex justify-between items-start mb-2 gap-2">
                  <h3 className="font-semibold text-slate-800 text-[14px] leading-tight">{c.nom}</h3>
                  <span className={`text-[10px] px-2 py-1 rounded-md font-bold shrink-0 ${statusColors[c.statut]}`}>
                    {c.statut.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <p className="text-[12px] text-slate-500 mb-2">{c.client} • {c.adresse}</p>
                {retard && (
                  <p className="text-[10.5px] font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-md px-2 py-1 mb-2 flex items-center gap-1">
                    <AlertTriangle size={11} /> Retard : {Math.ceil((Date.now() - new Date(c.date_fin_prevue!).getTime()) / 86400000)} j
                    {c.penalite_journaliere ? ` (pénalité ${fmt(c.penalite_journaliere)} GNF/j)` : ''}
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5 mb-3 text-[10.5px]">
                  <span className={`px-2 py-1 rounded border font-semibold ${c.rh_validation ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>RH {c.rh_validation ? '✓' : '✗'}</span>
                  <span className={`px-2 py-1 rounded border font-semibold ${c.materiel_validation ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>MAT {c.materiel_validation ? '✓' : '✗'}</span>
                  {!!st?.retenue_bloquee && <span className="px-2 py-1 rounded border border-amber-200 bg-amber-50 text-amber-700 font-mono">RG {fmt(st.retenue_bloquee)}</span>}
                  <span className="px-2 py-1 rounded border border-slate-200 text-slate-500 font-mono ml-auto">{fmt(c.budget_initial / 1e6)}M</span>
                </div>

                {c.statut === 'planification' && (currentRole === 'RESP_MATERIEL' || currentRole === 'GERANT') && !c.materiel_validation && (
                  <button
                    onClick={async (e) => { e.stopPropagation(); await updateBtpChantier(c.id, { materiel_validation: true }); pushToast(`Matériel validé pour « ${c.nom} ».`, 'SUCCESS'); }}
                    className="w-full py-2 mb-2 bg-blue-600 text-white rounded-lg text-[12.5px] font-semibold hover:bg-blue-700"
                  >Valider le Matériel</button>
                )}
                {c.statut === 'planification' && (currentRole === 'COND_TRAVAUX' || currentRole === 'GERANT') && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleStartChantier(c.id); }}
                    disabled={!c.rh_validation || !c.materiel_validation}
                    className={`w-full py-2 rounded-lg text-[12.5px] font-semibold transition-colors ${(!c.rh_validation || !c.materiel_validation) ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                  >Démarrer le chantier</button>
                )}
                {c.statut === 'en_cours' && (currentRole === 'COND_TRAVAUX' || currentRole === 'GERANT') && (
                  <div className="space-y-1.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); updateBtpChantierStatus(c.id, 'réception_provisoire'); generatePvPDF(c, 'provisoire', companyConfig); }}
                      className="w-full py-2 bg-indigo-600 text-white rounded-lg text-[12.5px] font-semibold hover:bg-indigo-700"
                    >Réception Provisoire + PV</button>
                  </div>
                )}
                {c.statut === 'réception_provisoire' && (currentRole === 'COND_TRAVAUX' || currentRole === 'GERANT') && (
                  <button
                    onClick={(e) => { e.stopPropagation(); updateBtpChantierStatus(c.id, 'réception_définitive'); generatePvPDF(c, 'définitive', companyConfig); }}
                    className="w-full py-2 bg-emerald-600 text-white rounded-lg text-[12.5px] font-semibold hover:bg-emerald-700"
                  >Réception Définitive + PV (libère RG)</button>
                )}
              </div>
            );
          })}
          {btpChantiers.length === 0 && <p className="text-slate-500 text-sm">Aucun chantier.</p>}
        </div>

        {/* ============ DÉTAIL ============ */}
        <div className="lg:col-span-2">
          {selectedChantier ? (
            <div className="space-y-5">

              {/* ---- En-tête + P&L complet ---- */}
              <div className="card p-6">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{selectedChantier.nom}</h2>
                    <p className="text-[12.5px] text-slate-500 mt-0.5">
                      {selectedChantier.client} · {selectedChantier.adresse}
                      {selectedChantier.date_fin_prevue ? ` · fin prévue ${new Date(selectedChantier.date_fin_prevue).toLocaleDateString('fr-FR')}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={statusTone(selectedChantier.statut)}>{selectedChantier.statut.replace(/_/g, ' ')}</Badge>
                    <button onClick={handleExportCSV} className="btn btn-ghost !py-1.5 !px-2.5 !text-[11px]" title="Export comptable CSV">
                      <Download size={12} /> CSV
                    </button>
                  </div>
                </div>

                {enRetard && (
                  <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-[12.5px] text-rose-700 flex items-center gap-2 font-medium">
                    <AlertTriangle size={15} />
                    Chantier en retard de {joursRetard} jour{joursRetard > 1 ? 's' : ''}
                    {selectedChantier.penalite_journaliere ? ` — pénalité contractuelle estimée : ${fmt(joursRetard * selectedChantier.penalite_journaliere)} GNF` : ''}.
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                  <div><p className="label">Budget marché</p><p className="font-mono font-bold text-[14px] text-slate-900">{fmt(selectedChantier.budget_initial)}</p></div>
                  <div><p className="label">Dépenses</p><p className="font-mono font-bold text-[14px] text-rose-600">{fmt(selectedStat?.budget_engage ?? 0)}</p></div>
                  <div><p className="label">MO réelle</p><p className="font-mono font-bold text-[14px] text-blue-600">{fmt(selectedStat?.cout_mo_reel ?? 0)}</p></div>
                  <div><p className="label">Engins</p><p className="font-mono font-bold text-[14px] text-blue-600">{fmt(selectedStat?.cout_engins ?? 0)}</p></div>
                  <div><p className="label">Sous-traitance</p><p className="font-mono font-bold text-[14px] text-blue-600">{fmt(selectedStat?.cout_sous_traitance ?? 0)}</p></div>
                  <div><p className="label">Marge prév.</p><p className={`font-mono font-bold text-[14px] ${marge >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmt(marge)}</p></div>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1.5">
                    <span>Coûts cumulés : {fmt(coutsTotaux)} / {fmt(selectedChantier.budget_initial)}</span>
                    <span className="font-semibold">{selectedChantier.budget_initial > 0 ? Math.min(999, Math.round((coutsTotaux / selectedChantier.budget_initial) * 100)) : 0}% · avancement {lastAvancement}%</span>
                  </div>
                  <Progress value={selectedChantier.budget_initial > 0 ? (coutsTotaux / selectedChantier.budget_initial) * 100 : 0} tone={marge >= 0 ? 'bg-indigo-500' : 'bg-rose-500'} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-[11.5px]">
                  <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 font-mono">Facturé : {fmt(selectedStat?.montant_situations_facturees ?? 0)}</span>
                  <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-100 font-mono">En attente : {fmt(selectedStat?.montant_situations_attente ?? 0)}</span>
                  <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-100 font-mono">RG bloquée : {fmt(selectedStat?.retenue_bloquee ?? 0)}</span>
                  <span className="px-2.5 py-1 rounded-md bg-slate-50 text-slate-600 border border-slate-200 font-mono">{Math.round(selectedStat?.heures_pointees ?? 0)} h MO · {chantierHeuresEngins.reduce((a, h) => a + h.heures, 0)} h engins</span>
                </div>

                {/* Paramètres marché : retenue % + pénalité */}
                {(currentRole === 'GERANT' || currentRole === 'COND_TRAVAUX') && (
                  <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 md:grid-cols-2 gap-3">
                    <div>
                      <label className="label">Retenue de garantie (%)</label>
                      <input type="number" min={0} max={50} className="input !py-1.5"
                        defaultValue={retenuePct} key={`rg-${selectedChantier.id}-${retenuePct}`}
                        onBlur={e => { const v = Number(e.target.value); if (v !== retenuePct) updateBtpChantier(selectedChantier.id, { retenue_garantie_pct: v }); }} />
                    </div>
                    <div>
                      <label className="label">Pénalité de retard (GNF/jour)</label>
                      <input type="number" min={0} className="input !py-1.5"
                        defaultValue={selectedChantier.penalite_journaliere ?? 0} key={`pj-${selectedChantier.id}-${selectedChantier.penalite_journaliere ?? 0}`}
                        onBlur={e => { const v = Number(e.target.value); if (v !== (selectedChantier.penalite_journaliere ?? 0)) updateBtpChantier(selectedChantier.id, { penalite_journaliere: v }); }} />
                    </div>
                  </div>
                )}

                {/* Rapprochement chiffrage / réalisé par famille */}
                {rapprochement.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-slate-100">
                    <p className="label">Rapprochement chiffrage / réalisé (par famille)</p>
                    <div className="space-y-1.5">
                      {rapprochement.map(r => {
                        const ecart = r.prevu - r.reel;
                        return (
                          <div key={r.famille} className="flex items-center gap-3 text-[12px]">
                            <span className="w-28 text-slate-500 truncate">{r.famille}</span>
                            <span className="w-24 text-right font-mono text-slate-700">{fmt(r.prevu)}</span>
                            <span className="text-slate-300">→</span>
                            <span className="w-24 text-right font-mono font-semibold text-slate-900">{fmt(r.reel)}</span>
                            <span className={`ml-auto font-mono font-semibold ${ecart >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {ecart >= 0 ? '+' : ''}{fmt(ecart)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2">Réalisé : matériaux = sorties de stock valorisées ; MO = pointages×taux ; matériel = heures engins×taux ; FG = suivies via dépenses comptables.</p>
                  </div>
                )}
              </div>

              {/* ---- Avenants (Vague 2) ---- */}
              <div className="card p-6">
                <h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-slate-700 mb-4 flex items-center gap-2">
                  <FileSignature size={15} className="text-indigo-500" /> Avenants ({chantierAvenants.length})
                </h3>
                <div className="space-y-2 mb-4">
                  {chantierAvenants.length === 0 && <p className="text-[12px] text-slate-400">Aucun avenant.</p>}
                  {chantierAvenants.map(av => (
                    <div key={av.id} className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50/60">
                      <span className="font-mono text-[10.5px] text-slate-400">{av.id}</span>
                      <span className="text-[12.5px] font-semibold text-slate-800 flex-1 min-w-[140px]">{av.objet || av.type.replace('_', ' ')}</span>
                      {av.montant !== 0 && (
                        <span className={`font-mono text-[12px] font-bold ${av.montant > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {av.montant > 0 ? '+' : ''}{fmt(av.montant)} GNF
                        </span>
                      )}
                      {!!av.jours_delai && <Badge tone="blue">+{av.jours_delai} j</Badge>}
                      <Badge tone={av.statut === 'validé' ? 'emerald' : av.statut === 'rejeté' ? 'rose' : 'amber'}>{av.statut}</Badge>
                      {av.statut === 'brouillon' && currentRole === 'GERANT' && (
                        <div className="flex gap-1.5">
                          <button onClick={() => validerBtpAvenant(av.id)} className="btn btn-primary !py-1 !px-2.5 !text-[10.5px]">Valider & appliquer</button>
                          <button onClick={() => rejeterBtpAvenant(av.id)} className="btn btn-ghost !py-1 !px-2.5 !text-[10.5px]"><XCircle size={11} /></button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {['COND_TRAVAUX', 'GERANT', 'ETUDES'].includes(currentRole || '') && (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!selectedChantierId) return;
                    await createBtpAvenant({ ...newAvenant, chantier_id: selectedChantierId, date: new Date().toISOString().slice(0, 10) });
                    setNewAvenant({ type: 'montant', objet: '', montant: 0, jours_delai: 0 });
                  }} className="pt-3 border-t border-slate-100 grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
                    <div>
                      <label className="label">Type</label>
                      <select className="input !py-1.5 !text-[12px]" value={newAvenant.type} onChange={e => setNewAvenant({ ...newAvenant, type: e.target.value as BtpAvenant['type'] })}>
                        <option value="montant">Montant</option>
                        <option value="delai">Délai</option>
                        <option value="montant_delai">Montant + délai</option>
                        <option value="penalite">Pénalité</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="label">Objet</label>
                      <input className="input !py-1.5 !text-[12px]" value={newAvenant.objet} onChange={e => setNewAvenant({ ...newAvenant, objet: e.target.value })} placeholder="Travaux supplémentaires…" required />
                    </div>
                    <div>
                      <label className="label">Montant ± (GNF)</label>
                      <input type="number" className="input !py-1.5 !text-[12px]" value={newAvenant.montant || ''} onChange={e => setNewAvenant({ ...newAvenant, montant: Number(e.target.value) })} />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="label">Jours</label>
                        <input type="number" min={0} className="input !py-1.5 !text-[12px]" value={newAvenant.jours_delai || ''} onChange={e => setNewAvenant({ ...newAvenant, jours_delai: Number(e.target.value) })} />
                      </div>
                      <button type="submit" className="btn btn-dark !py-1.5 !px-3 shrink-0"><Plus size={13} /></button>
                    </div>
                  </form>
                )}
              </div>

              {/* ---- Main d'œuvre + heures engins ---- */}
              <div className="card p-6">
                <h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-slate-700 mb-4 flex items-center gap-2">
                  <Users size={15} className="text-indigo-500" /> Main d'œuvre, pointage & engins
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                          {a.statut === 'active'
                            ? <button onClick={() => terminerBtpAffectation(a.id)} className="text-[10px] text-slate-400 hover:text-rose-600 font-semibold uppercase">Terminer</button>
                            : <Badge tone="neutral">terminée</Badge>}
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
                      </form>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="label !mb-0">Pointage & heures engins</p>
                      <input type="date" className="input !py-1 !w-36 !text-[12px]" value={pointageDate} onChange={e => setPointageDate(e.target.value)} />
                    </div>
                    {activeAffs.length === 0
                      ? <p className="text-[12px] text-slate-400 mb-3">Affectez d'abord des employés pour pointer.</p>
                      : (
                        <div className="space-y-2 mb-4">
                          {activeAffs.map(a => (
                            <div key={a.id} className="flex items-center gap-2">
                              <span className="text-[12px] text-slate-700 flex-1 truncate">{empName(a.employee_id)}</span>
                              <input type="number" min={0} max={12} className="input !py-1 !px-2 !w-16 text-right !text-[12px]" placeholder="h"
                                value={pointageHeures[a.employee_id] ?? ''} onChange={e => setPointageHeures(prev => ({ ...prev, [a.employee_id]: Number(e.target.value) }))} />
                              <button onClick={() => handlePointage(a.employee_id)} disabled={pointageHeures[a.employee_id] === undefined} className="btn btn-ghost !py-1 !px-2 !text-[10.5px] shrink-0"><Clock size={11} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    {/* Heures d'engin (imputation au chantier) */}
                    {['COND_TRAVAUX', 'CHEF_CHANTIER', 'RESP_MATERIEL', 'GERANT'].includes(currentRole || '') && (
                      <div className="pt-3 border-t border-slate-100 flex gap-2 items-end">
                        <div className="flex-1">
                          <label className="label">Heures engin (imputation)</label>
                          <select className="input !py-1.5 !text-[12px]" value={enginHeures.engin_id} onChange={e => setEnginHeures({ ...enginHeures, engin_id: e.target.value })}>
                            <option value="">Engin…</option>
                            {enginsDispos.map(en => (
                              <option key={en.id} value={en.id}>{en.identifiant_interne} — {en.type}{en.taux_horaire ? ` (${fmt(en.taux_horaire)} GNF/h)` : ' (taux à définir)'}</option>
                            ))}
                          </select>
                        </div>
                        <input type="number" min={0} max={24} className="input !py-1.5 !w-20 !text-[12px]" placeholder="h" value={enginHeures.heures || ''} onChange={e => setEnginHeures({ ...enginHeures, heures: Number(e.target.value) })} />
                        <button
                          onClick={async () => {
                            if (!selectedChantierId || !enginHeures.engin_id || enginHeures.heures <= 0) return;
                            await createBtpHeureEngin({ engin_id: enginHeures.engin_id, chantier_id: selectedChantierId, date: pointageDate, heures: enginHeures.heures });
                            setEnginHeures({ engin_id: '', heures: 0 });
                          }}
                          disabled={!enginHeures.engin_id || enginHeures.heures <= 0}
                          className="btn btn-dark !py-1.5 !px-3 shrink-0"
                        ><Plus size={13} /></button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ---- Journal + Situations (TVA + retenues) ---- */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {(currentRole === 'CHEF_CHANTIER' || currentRole === 'GERANT' || currentRole === 'COND_TRAVAUX') && selectedChantier.statut === 'en_cours' && (
                  <form onSubmit={handleAddJournal} className="card p-5">
                    <h3 className="font-bold text-slate-700 text-[13px] uppercase tracking-wide mb-4">Journal du jour</h3>
                    <div className="space-y-3 text-sm">
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="label">Effectifs</label><input type="number" required className="input" value={newJournal.effectifs_presents} onChange={e => setNewJournal({ ...newJournal, effectifs_presents: e.target.value })} /></div>
                        <div><label className="label">Avancement (%)</label><input type="number" max={100} min={0} required className="input" value={newJournal.avancement_pct || ''} onChange={e => setNewJournal({ ...newJournal, avancement_pct: Number(e.target.value) })} /></div>
                      </div>
                      <div><label className="label">Travaux réalisés</label><textarea required className="input" rows={2} value={newJournal.commentaire} onChange={e => setNewJournal({ ...newJournal, commentaire: e.target.value })} /></div>
                      <button type="submit" className="btn btn-dark w-full">Enregistrer</button>
                    </div>
                  </form>
                )}

                {(currentRole === 'COND_TRAVAUX' || currentRole === 'GERANT' || currentRole === 'COMPTABLE') && (
                  <div className="card p-5">
                    <h3 className="font-bold text-blue-800 text-[13px] uppercase tracking-wide mb-4 flex items-center gap-2">
                      <Wallet size={14} /> Situations (HT / TVA / retenue)
                    </h3>

                    {(currentRole === 'COMPTABLE' || currentRole === 'GERANT') && (
                      <div className="mb-3">
                        <label className="label">Compte d'encaissement</label>
                        <select className="input !py-1.5 !text-[12px]" value={factureAccount} onChange={e => setFactureAccount(e.target.value)}>
                          <option value="">— Choisir —</option>
                          {treasuryAccounts.map(a => <option key={a.id} value={a.id}>{a.name} ({fmt(a.balance)})</option>)}
                        </select>
                      </div>
                    )}

                    <div className="space-y-2 mb-4 max-h-[240px] overflow-y-auto">
                      {btpSituations.filter(s => s.chantier_id === selectedChantier.id).map(sit => {
                        const net = sit.montant_facture - (sit.retenue_amount ?? 0);
                        return (
                          <div key={sit.id} className="bg-slate-50/70 p-3 rounded-lg border border-slate-100 text-[12px]">
                            <div className="flex justify-between font-semibold">
                              <span>{sit.periode}</span>
                              <span className="text-indigo-700 font-mono">{fmt(sit.montant_facture)} TTC</span>
                            </div>
                            <div className="text-[10.5px] text-slate-400 mt-0.5 font-mono">
                              HT {fmt(sit.montant_ht ?? sit.montant_facture)}
                              {sit.tva_amount ? ` · TVA ${fmt(sit.tva_amount)}` : ''}
                              {sit.retenue_amount ? ` · RG ${fmt(sit.retenue_amount)}${sit.retenue_liberee ? ' (libérée)' : ''}` : ''}
                              {' '}· net {fmt(net)}
                            </div>
                            <div className="mt-2 pt-2 border-t border-slate-200/70 flex justify-between items-center gap-2 flex-wrap">
                              <Badge tone={statusTone(sit.statut)}>{sit.statut.replace(/_/g, ' ')}</Badge>
                              <div className="flex gap-1.5">
                                {sit.statut === 'brouillon' && (currentRole === 'COND_TRAVAUX' || currentRole === 'GERANT') && (
                                  <button onClick={() => updateBtpSituation(sit.id, { statut: 'en_attente_facturation', valide_par_conducteur: true })} className="btn btn-ghost !py-1 !px-2.5 !text-[10.5px]">Valider → Compta</button>
                                )}
                                {sit.statut === 'en_attente_facturation' && (currentRole === 'COMPTABLE' || currentRole === 'GERANT') && (
                                  <button onClick={() => handleFacture(sit.id)} className="btn btn-primary !py-1 !px-2.5 !text-[10.5px]"><CheckCircle2 size={11} /> Facturer</button>
                                )}
                                {sit.statut === 'facturée' && sit.date_facturation && (
                                  <span className="text-[10px] text-emerald-600 font-semibold">le {new Date(sit.date_facturation).toLocaleDateString('fr-FR')}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Libération des retenues (après réception définitive) */}
                    {(currentRole === 'COMPTABLE' || currentRole === 'GERANT') && ['réception_définitive', 'clôturé'].includes(selectedChantier.statut) && (selectedStat?.retenue_bloquee ?? 0) > 0 && (
                      <div className="mb-4 p-3 rounded-lg border border-amber-200 bg-amber-50 flex flex-wrap items-center gap-2">
                        <span className="text-[12px] text-amber-800 font-medium flex-1">
                          Libérer {fmt(selectedStat?.retenue_bloquee ?? 0)} GNF de retenues de garantie :
                        </span>
                        <select className="input !py-1.5 !w-40 !text-[11.5px]" value={retenueAccount} onChange={e => setRetenueAccount(e.target.value)}>
                          <option value="">Compte…</option>
                          {treasuryAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                        <button onClick={() => retenueAccount && libererBtpRetenues(selectedChantier.id, retenueAccount)} disabled={!retenueAccount} className="btn btn-primary !py-1.5 !px-3 !text-[11px]">Libérer</button>
                      </div>
                    )}

                    {(currentRole === 'COND_TRAVAUX' || currentRole === 'GERANT') && selectedChantier.statut === 'en_cours' && (
                      <form onSubmit={handleCreateSituation} className="pt-3 border-t border-slate-100 space-y-2 text-[12.5px]">
                        <input type="text" placeholder="Période (ex: Sept 2026)" required className="input" value={newSituation.periode} onChange={e => setNewSituation({ ...newSituation, periode: e.target.value })} />
                        <div className="flex gap-2">
                          <input type="number" placeholder="% Avanc." required className="input w-1/3" value={newSituation.pct_avancement_declare || ''} onChange={e => setNewSituation({ ...newSituation, pct_avancement_declare: Number(e.target.value) })} />
                          <input type="number" placeholder="Montant HT" required className="input w-2/3" value={newSituation.montant_ht || ''} onChange={e => setNewSituation({ ...newSituation, montant_ht: Number(e.target.value) })} />
                        </div>
                        <label className="flex items-center gap-2 text-[11.5px] text-slate-600">
                          <input type="checkbox" checked={newSituation.avecTva} onChange={e => setNewSituation({ ...newSituation, avecTva: e.target.checked })} />
                          TVA {companyConfig.tvaRate || 18}% ({fmt(sitTva)} GNF)
                        </label>
                        <p className="text-[11px] font-mono text-slate-500 bg-slate-50 border border-slate-100 rounded-md px-2.5 py-1.5">
                          TTC {fmt(sitTtc)} − RG {retenuePct}% ({fmt(sitRetenue)}) = <strong className="text-emerald-700">net {fmt(sitTtc - sitRetenue)} GNF</strong>
                        </p>
                        <button type="submit" className="btn btn-dark w-full">Créer le brouillon</button>
                      </form>
                    )}
                  </div>
                )}
              </div>

              {/* ---- OS + Sous-traitance + Cautionnements ---- */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* OS */}
                <div className="card p-5">
                  <h3 className="font-bold text-slate-700 text-[12px] uppercase tracking-wide mb-3">Ordres de Service ({chantierOS.length})</h3>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto">
                    {chantierOS.length === 0 && <p className="text-[12px] text-slate-400">Générés automatiquement (démarrage, arrêt, réception).</p>}
                    {[...chantierOS].reverse().map(os => (
                      <button key={os.id} onClick={() => generateOsPDF(selectedChantier, os, companyConfig)} className="w-full text-left p-2.5 rounded-lg border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/40 transition-colors">
                        <div className="flex justify-between items-center">
                          <span className="text-[12px] font-semibold text-slate-800 capitalize">{os.type}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{new Date(os.date).toLocaleDateString('fr-FR')}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">{os.id} · cliquer pour le PDF</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sous-traitance */}
                <div className="card p-5">
                  <h3 className="font-bold text-slate-700 text-[12px] uppercase tracking-wide mb-3">Sous-traitance ({chantierST.filter(s => s.statut === 'en_cours').length})</h3>
                  <div className="space-y-2 mb-3 max-h-[140px] overflow-y-auto">
                    {chantierST.length === 0 && <p className="text-[12px] text-slate-400">Aucun sous-traitant.</p>}
                    {chantierST.map(st => (
                      <div key={st.id} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/60">
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-[12px] font-semibold text-slate-800 truncate">{st.entreprise}</span>
                          <span className="font-mono text-[11px] text-slate-600">{fmt(st.montant)}</span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-[10px] text-slate-400 truncate">{st.objet}</span>
                          {st.statut === 'en_cours' && currentRole === 'GERANT' && (
                            <button onClick={() => solderBtpSousTraitance(st.id)} className="text-[9.5px] font-bold text-emerald-600 uppercase">Solder</button>
                          )}
                          {st.statut !== 'en_cours' && <Badge tone={st.statut === 'soldée' ? 'emerald' : 'rose'}>{st.statut}</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                  {['COND_TRAVAUX', 'GERANT'].includes(currentRole || '') && (
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      if (!selectedChantierId) return;
                      await createBtpSousTraitance({ chantier_id: selectedChantierId, entreprise: newST.entreprise, objet: newST.objet, montant: newST.montant });
                      setNewST({ entreprise: '', objet: '', montant: 0 });
                    }} className="pt-2.5 border-t border-slate-100 space-y-1.5">
                      <input className="input !py-1.5 !text-[12px]" placeholder="Entreprise" required value={newST.entreprise} onChange={e => setNewST({ ...newST, entreprise: e.target.value })} />
                      <div className="flex gap-1.5">
                        <input type="number" className="input !py-1.5 !text-[12px] flex-1" placeholder="Montant" required value={newST.montant || ''} onChange={e => setNewST({ ...newST, montant: Number(e.target.value) })} />
                        <button type="submit" className="btn btn-dark !py-1.5 !px-2.5 shrink-0"><Plus size={12} /></button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Cautionnements */}
                <div className="card p-5">
                  <h3 className="font-bold text-slate-700 text-[12px] uppercase tracking-wide mb-3 flex items-center gap-1.5"><ShieldCheck size={13} className="text-indigo-500" /> Cautionnements ({chantierCauts.length})</h3>
                  <div className="space-y-2 mb-3 max-h-[140px] overflow-y-auto">
                    {chantierCauts.length === 0 && <p className="text-[12px] text-slate-400">Soumission, bonne exécution, décennale…</p>}
                    {chantierCauts.map(ct => (
                      <div key={ct.id} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/60">
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-[11.5px] font-semibold text-slate-800">{ct.type.replace('_', ' ')}</span>
                          <span className="font-mono text-[11px] text-slate-600">{fmt(ct.montant)}</span>
                        </div>
                        <p className="text-[10px] text-slate-400">{ct.assureur_banque}{ct.date_fin ? ` · jusqu'au ${new Date(ct.date_fin).toLocaleDateString('fr-FR')}` : ''}</p>
                      </div>
                    ))}
                  </div>
                  {['GERANT', 'COMPTABLE'].includes(currentRole || '') && (
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      if (!selectedChantierId) return;
                      await createBtpCautionnement({ ...newCaut, chantier_id: selectedChantierId });
                      setNewCaut({ type: 'bonne_execution', assureur_banque: '', montant: 0 });
                    }} className="pt-2.5 border-t border-slate-100 space-y-1.5">
                      <div className="flex gap-1.5">
                        <select className="input !py-1.5 !text-[11.5px] flex-1" value={newCaut.type} onChange={e => setNewCaut({ ...newCaut, type: e.target.value as BtpCautionnementsLocal['type'] })}>
                          <option value="soumission">Soumission</option>
                          <option value="bonne_execution">Bonne exécution</option>
                          <option value="decennale">Décennale</option>
                          <option value="avance">Avance</option>
                        </select>
                        <input type="number" className="input !py-1.5 !text-[12px] w-24" placeholder="GNF" required value={newCaut.montant || ''} onChange={e => setNewCaut({ ...newCaut, montant: Number(e.target.value) })} />
                      </div>
                      <div className="flex gap-1.5">
                        <input className="input !py-1.5 !text-[12px] flex-1" placeholder="Assureur / Banque" required value={newCaut.assureur_banque} onChange={e => setNewCaut({ ...newCaut, assureur_banque: e.target.value })} />
                        <button type="submit" className="btn btn-dark !py-1.5 !px-2.5 shrink-0"><Plus size={12} /></button>
                      </div>
                    </form>
                  )}
                </div>
              </div>

              {/* ---- GED ---- */}
              <div className="card p-6">
                <h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-slate-700 mb-4 flex items-center gap-2">
                  <FileText size={15} className="text-indigo-500" /> Documents du chantier ({btpDocuments.filter(d => d.chantier_id === selectedChantier.id).length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    {btpDocuments.filter(d => d.chantier_id === selectedChantier.id).length === 0 && (
                      <p className="text-[12px] text-slate-400">Plans, PV, attestations… aucun document pour l'instant.</p>
                    )}
                    {btpDocuments.filter(d => d.chantier_id === selectedChantier.id).map(d => (
                      <button key={d.id} onClick={() => openSecureFile(d.url)} title="Ouvrir (téléchargement sécurisé)"
                        className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/40 transition-colors group text-left">
                        <span className="h-8 w-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0 group-hover:bg-white"><FileText size={13} /></span>
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
                        <option value="plan">Plan</option><option value="pv_reception">PV de réception</option>
                        <option value="attestation">Attestation</option><option value="contrat">Contrat</option>
                        <option value="photo">Photo</option><option value="autre">Autre</option>
                      </select>
                      <input className="input !py-1.5 !text-[12px]" placeholder="Nom du document" value={docForm.nom} onChange={e => setDocForm({ ...docForm, nom: e.target.value })} />
                    </div>
                    <input className="input !py-1.5 !text-[12px]" placeholder="Description (optionnel)" value={docForm.description} onChange={e => setDocForm({ ...docForm, description: e.target.value })} />
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploading || !docForm.nom.trim()} className="btn btn-ghost w-full">
                      <Upload size={13} /> {uploading ? 'Envoi…' : 'Téléverser'}
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
