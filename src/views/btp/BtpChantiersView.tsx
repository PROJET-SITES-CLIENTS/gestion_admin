import React, { useState, useRef } from 'react';
import { useApp } from '../../store';
import { BtpChantierStatus, BtpChiffrageLigne, BtpAvenant } from '../../types';
import { Badge, statusTone, Progress, Modal } from '../../components/ui';
import { openSecureFile } from '../../utils/secureFile';
import { generateOsPDF, generatePvPDF } from '../../utils/pdfGenerator';
import { BtpLotsSection } from '../../components/BtpLotsSection';
import { BtpClosureChecklist, BtpLotPilotage, BtpSTEvaluation } from '../../components/BtpClosure';
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
    btpCautionnements, createBtpCautionnement, libererBtpRetenues, libererCautionnement,
    btpReserves, createBtpReserve, updateBtpReserve,
    btpEngins, btpHeuresEngins, createBtpHeureEngin, btpBonCommandes,
    expenses, addExpense, addTask, btpOffres, validerRhChantier
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
  // Dépense
  const [newExpense, setNewExpense] = useState({ category: 'ACHAT_MARCHANDISE', amountHT: 0, description: '' });
  // Alerte Direction
  const [newAlert, setNewAlert] = useState({ urgency: 'HAUTE', description: '' });
  // Vue Devis Initial
  const [showOffreModal, setShowOffreModal] = useState(false);
  // Avenant
  const [newAvenant, setNewAvenant] = useState({ type: 'montant' as BtpAvenant['type'], objet: '', montant: 0, jours_delai: 0 });
  // Sous-traitance
  const [newST, setNewST] = useState({ entreprise: '', objet: '', montant: 0 });
  const [stEvalId, setStEvalId] = useState<string | null>(null);
  // Cautionnement
  const [newCaut, setNewCaut] = useState({ type: 'bonne_execution' as BtpCautionnementsLocal['type'], assureur_banque: '', montant: 0 });
  // Réserves (Réception)
  const [newReserve, setNewReserve] = useState({ description: '' });
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

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChantierId || newExpense.amountHT <= 0) return;
    const tva = Math.round(newExpense.amountHT * tvaRate);
    await addExpense({
      category: newExpense.category as any,
      amountHT: newExpense.amountHT,
      tvaAmount: tva,
      amountTTC: newExpense.amountHT + tva,
      description: `[BTP] ${newExpense.description}`,
      date: new Date().toISOString().slice(0, 10),
      status: 'PENDING',
      chantier_id: selectedChantierId
    });
    setNewExpense({ category: 'ACHAT_MARCHANDISE', amountHT: 0, description: '' });
    pushToast('Dépense enregistrée et transmise à la comptabilité.', 'SUCCESS');
  };

  const handleAlertDirection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChantierId || !newAlert.description) return;
    await addTask({
      title: `ALERTE CHANTIER: ${selectedChantier?.nom}`,
      description: newAlert.description,
      status: 'TODO',
      priority: newAlert.urgency as 'HAUTE'|'MOYENNE'|'BASSE',
      dueDate: new Date().toISOString().slice(0, 10),
      assignedTo: 'ASSISTANTE'
    });
    setNewAlert({ urgency: 'HAUTE', description: '' });
    pushToast('Alerte transmise à la Direction.', 'WARNING');
  };

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

  const handleAddReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChantierId || !newReserve.description.trim()) return;
    await createBtpReserve({
      chantier_id: selectedChantierId,
      description: newReserve.description,
      date_emission: new Date().toISOString().slice(0, 10),
      statut: 'en_cours'
    });
    setNewReserve({ description: '' });
  };

  const handleLeverReserve = async (id: string) => {
    await updateBtpReserve(id, { 
      statut: 'levee', 
      date_levee: new Date().toISOString().slice(0, 10) 
    });
  };

  const handlePointage = async (employeeId: string) => {
    if (!selectedChantierId) return;
    const heures = pointageHeures[employeeId];
    if (heures === undefined) return;
    // Garde : 0 à 12 heures par jour maximum
    if (heures < 0 || heures > 12) {
      pushToast('Heures invalides : entre 0 et 12 heures par jour.', 'ERROR');
      return;
    }
    // Garde : chantier doit être actif pour pointer
    const chantier = btpChantiers.find(c => c.id === selectedChantierId);
    if (chantier && !['en_cours', 'planification'].includes(chantier.statut)) {
      pushToast(`Impossible de pointer sur un chantier « ${chantier.statut} ».`, 'ERROR');
      return;
    }
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
    const avs = btpAvenants.filter(a => a.chantier_id === selectedChantier.id);
    const rows = [
      ['Chantier', selectedChantier.nom],
      ['Export', new Date().toLocaleString('fr-FR')], [],
      ['=== SITUATIONS DE TRAVAUX ==='],
      ['Periode', 'HT', 'TVA', 'TTC', 'Retenue', 'Net encaisse', 'Statut', 'Facturee le'],
      ...sits.map(s => [s.periode, s.montant_ht ?? '', s.tva_amount ?? 0, s.montant_facture, s.retenue_amount ?? 0, s.montant_facture - (s.retenue_amount ?? 0), s.statut, s.date_facturation ? new Date(s.date_facturation).toLocaleDateString('fr-FR') : '']), [],
      ['=== AVENANTS ==='],
      ['ID', 'Type', 'Objet', 'Montant', 'Jours', 'Statut', 'Date'],
      ...avs.map(a => [a.id.slice(0, 8), a.type, a.objet || '', a.montant || 0, a.jours_delai || 0, a.statut, a.date || '']), [],
      ['=== SYNTHESE FINANCIERE ==='],
      ['Budget marche (avec avenants)', selectedChantier.budget_initial || 0],
      ['Depenses engagees (TTC)', selectedStat?.budget_engage ?? 0],
      ['MO reelle', selectedStat?.cout_mo_reel ?? 0],
      ['Cout engins', selectedStat?.cout_engins ?? 0],
      ['Sous-traitance', selectedStat?.cout_sous_traitance ?? 0],
      ['Retenues bloquees', selectedStat?.retenue_bloquee ?? 0],
      ['Situations facturees', selectedStat?.montant_situations_facturees ?? 0],
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
  // P&L : on utilise le MAX entre budget_engage (achats via dépenses, dont BC)
  // et cout_stock_sorti (valorisation des sorties magasin) pour les matériaux.
  // Les deux canaux se chevauchent : un BC réceptionné crée une dépense PUIS
  // une sortie valorisée — additionner les deux = double comptage.
  // MO, engins et sous-traitance sont des canaux distincts (additionnés).
  const coutsMatieres = Math.max(
    selectedStat?.budget_engage ?? 0,
    selectedStat?.cout_stock_sorti ?? 0
  );
  const coutsTotaux = coutsMatieres +
    (selectedStat?.cout_mo_reel ?? 0) + 
    (selectedStat?.cout_engins ?? 0) + 
    (selectedStat?.cout_sous_traitance ?? 0);
  // NOTE : le serveur APPLIQUE déjà les avenants validés à budget_initial
  // et date_fin_prevue (POST /btp/avenants/:id/valider). On lit donc
  // directement les valeurs du chantier — PAS de re-addition locale
  // (sinon double comptage des montants ET des retards).
  const budgetRevise = selectedChantier?.budget_initial || 0;
  const dateFinRevisee = selectedChantier?.date_fin_prevue ? new Date(selectedChantier.date_fin_prevue) : null;

  const marge = budgetRevise - coutsTotaux;
  const enRetard = dateFinRevisee &&
    dateFinRevisee.getTime() < Date.now() &&
    !['clôturé', 'réception_définitive'].includes(selectedChantier?.statut || '');
  const joursRetard = enRetard && dateFinRevisee ?
    Math.ceil((Date.now() - dateFinRevisee.getTime()) / 86400000) : 0;

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
                {c.statut === 'planification' && (currentRole === 'RH' || currentRole === 'GERANT') && !c.rh_validation && (
                  <button
                    onClick={async (e) => { e.stopPropagation(); await validerRhChantier(c.id); }}
                    className="w-full py-2 mb-2 bg-emerald-600 text-white rounded-lg text-[12.5px] font-semibold hover:bg-emerald-700"
                  >Valider RH (équipes)</button>
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
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await updateBtpChantierStatus(c.id, 'réception_provisoire');
                          generatePvPDF(c, 'provisoire', companyConfig);
                          // Le PV est archivé en GED (condition de la checklist de clôture)
                          addBtpDocument({ chantier_id: c.id, type: 'pv_reception', nom: `PV réception provisoire — ${c.nom}`, description: 'Généré automatiquement à la réception provisoire.' });
                        } catch (err: any) { alert(err.message); }
                      }}
                      className="w-full py-2 bg-indigo-600 text-white rounded-lg text-[12.5px] font-semibold hover:bg-indigo-700"
                    >Réception Provisoire + PV</button>
                  </div>
                )}
                {c.statut === 'réception_provisoire' && (currentRole === 'COND_TRAVAUX' || currentRole === 'GERANT') && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await updateBtpChantierStatus(c.id, 'réception_définitive');
                        generatePvPDF(c, 'définitive', companyConfig);
                        addBtpDocument({ chantier_id: c.id, type: 'pv_reception', nom: `PV réception définitive — ${c.nom}`, description: 'Généré automatiquement à la réception définitive (déclenche la libération RG).' });
                      } catch (err: any) { alert(err.message); }
                    }}
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
                      {dateFinRevisee ? ` · fin prévue ${dateFinRevisee.toLocaleDateString('fr-FR')}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={statusTone(selectedChantier.statut)}>{selectedChantier.statut.replace(/_/g, ' ')}</Badge>
                    
                    {selectedChantier.offre_id && (
                      <button onClick={() => setShowOffreModal(true)} className="btn btn-ghost !py-1.5 !px-2.5 !text-[11px] text-indigo-700" title="Consulter l'offre / devis initial">
                        <FileText size={12} /> Devis Initial
                      </button>
                    )}

                    <button onClick={handleExportCSV} className="btn btn-ghost !py-1.5 !px-2.5 !text-[11px]" title="Export comptable CSV">
                      <Download size={12} /> CSV
                    </button>
                    <button 
                      onClick={handleAlertDirection}
                      className="bg-rose-100 hover:bg-rose-200 text-rose-700 px-3 py-1.5 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors"
                      title="Signaler un risque (Retard, Budget, QHSE) à la Direction"
                    >
                      <AlertTriangle size={12} /> Alerter Direction
                    </button>
                  </div>
                </div>

                {/* Formulaire Alerte Direction */}
                {newAlert.description !== undefined && (
                  <div className="mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm">
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={newAlert.description} 
                        onChange={e => setNewAlert({...newAlert, description: e.target.value})}
                        placeholder="Ex: Risque de dépassement budgétaire sur le gros œuvre..." 
                        className="flex-1 p-1.5 border border-slate-200 rounded-md"
                      />
                      <select 
                        value={newAlert.urgency} 
                        onChange={e => setNewAlert({...newAlert, urgency: e.target.value})}
                        className="p-1.5 border border-slate-200 rounded-md bg-white text-slate-700"
                      >
                        <option value="HAUTE">Urgence Haute</option>
                        <option value="MOYENNE">Urgence Moyenne</option>
                        <option value="BASSE">Info (Basse)</option>
                      </select>
                      <button onClick={handleAlertDirection} className="bg-rose-600 text-white px-3 rounded-md font-semibold hover:bg-rose-700">Envoyer</button>
                    </div>
                  </div>
                )}

                {enRetard && (
                  <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-[12.5px] text-rose-700 flex items-center gap-2 font-medium">
                    <AlertTriangle size={15} />
                    Chantier en retard de {joursRetard} jour{joursRetard > 1 ? 's' : ''}
                    {selectedChantier.penalite_journaliere ? ` — pénalité contractuelle estimée : ${fmt(joursRetard * selectedChantier.penalite_journaliere)} GNF` : ''}.
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-4">
                  <div>
                    <p className="label flex items-center gap-1">Budget révisé {budgetRevise !== selectedChantier.budget_initial && <span className="text-[9px] text-indigo-500 bg-indigo-50 px-1 rounded">Av. inclus</span>}</p>
                    <p className="font-mono font-bold text-[14px] text-slate-900">{fmt(budgetRevise)}</p>
                  </div>
                  <div><p className="label">Dépenses (Achats)</p><p className="font-mono font-bold text-[14px] text-rose-600">{fmt(selectedStat?.budget_engage ?? 0)}</p></div>
                  <div><p className="label" title="Valeur des matériaux sortis du magasin">Stock (Magasin)</p><p className="font-mono font-bold text-[14px] text-amber-600">{fmt(selectedStat?.cout_stock_sorti ?? 0)}</p></div>
                  <div><p className="label">MO réelle</p><p className="font-mono font-bold text-[14px] text-blue-600">{fmt(selectedStat?.cout_mo_reel ?? 0)}</p></div>
                  <div><p className="label">Engins</p><p className="font-mono font-bold text-[14px] text-blue-600">{fmt(selectedStat?.cout_engins ?? 0)}</p></div>
                  <div><p className="label">Sous-traitance</p><p className="font-mono font-bold text-[14px] text-blue-600">{fmt(selectedStat?.cout_sous_traitance ?? 0)}</p></div>
                  <div><p className="label">Marge prév.</p><p className={`font-mono font-bold text-[14px] ${marge >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmt(marge)}</p></div>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1.5">
                    <span>Coûts cumulés : {fmt(coutsTotaux)} / {fmt(budgetRevise)}</span>
                    <span className="font-semibold">{budgetRevise > 0 ? Math.min(999, Math.round((coutsTotaux / budgetRevise) * 100)) : 0}% · avancement {lastAvancement}%</span>
                  </div>
                  <Progress value={budgetRevise > 0 ? (coutsTotaux / budgetRevise) * 100 : 0} tone={marge >= 0 ? 'bg-indigo-500' : 'bg-rose-500'} />
                  {budgetRevise > 0 && (coutsTotaux / budgetRevise) >= 0.8 && lastAvancement < 50 && (
                    <div className="mt-2 text-[11.5px] p-2 rounded bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5 font-medium">
                      <AlertTriangle size={14} />
                      Alerte critique : Plus de 80% du budget consommé, alors que l'avancement est de {lastAvancement}% !
                    </div>
                  )}
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
                      <label className="label">Retenue de garantie (%) {currentRole !== 'GERANT' && <span className="text-slate-400 normal-case">(Gérant seul)</span>}</label>
                      <input type="number" min={0} max={50} className="input !py-1.5" disabled={currentRole !== 'GERANT'}
                        defaultValue={retenuePct} key={`rg-${selectedChantier.id}-${retenuePct}`}
                        onBlur={e => { const v = Math.min(50, Math.max(0, Number(e.target.value))); if (v !== retenuePct) updateBtpChantier(selectedChantier.id, { retenue_garantie_pct: v }); }} />
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
                              <span>{sit.periode}{(sit as any).numero ? <span className="text-slate-400 font-mono font-normal text-[10px] ml-1.5">{(sit as any).numero}</span> : ''}</span>
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
                        <div className="flex gap-4 items-center">
                          <label className="flex items-center gap-2 text-[11.5px] text-slate-600">
                            <input type="checkbox" checked={newSituation.avecTva} onChange={e => setNewSituation({ ...newSituation, avecTva: e.target.checked })} />
                            TVA {companyConfig.tvaRate || 18}% ({fmt(sitTva)} GNF)
                          </label>
                          <label className="flex items-center gap-2 text-[11.5px] text-slate-600" title="Si coché, la TVA n'est pas facturée (reportée sur le client, très courant en BTP sous-traitance).">
                            <input type="checkbox" checked={!newSituation.avecTva} onChange={e => setNewSituation({ ...newSituation, avecTva: !e.target.checked })} />
                            Autoliquidation TVA (BTP)
                          </label>
                        </div>
                        <p className="text-[11px] font-mono text-slate-500 bg-slate-50 border border-slate-100 rounded-md px-2.5 py-1.5">
                          TTC {fmt(sitTtc)} − RG {retenuePct}% ({fmt(sitRetenue)}) = <strong className="text-emerald-700">net {fmt(sitTtc - sitRetenue)} GNF</strong>
                        </p>
                        <button type="submit" className="btn btn-dark w-full">Créer le brouillon</button>
                      </form>
                    )}
                  </div>
                )}
              </div>

              {/* ---- P3-1 : CHECKLIST DE CLÔTURE FORMELLE ---- */}
              <BtpClosureChecklist chantierId={selectedChantier.id} onClosure={() => {}} />

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
                            <button
                              onClick={() => setStEvalId(st.id)}
                              className="text-[9.5px] font-bold text-emerald-600 uppercase border border-emerald-200 px-1.5 py-0.5 rounded hover:bg-emerald-50"
                            >
                              Évaluer & Solder
                            </button>
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
                        <div className="flex justify-between items-center mt-0.5">
                          <p className="text-[10px] text-slate-400">{ct.assureur_banque}{ct.date_fin ? ` · jusqu'au ${new Date(ct.date_fin).toLocaleDateString('fr-FR')}` : ''}</p>
                          {ct.statut === 'active' && (currentRole === 'GERANT' || currentRole === 'COMPTABLE') && (
                            <button onClick={() => libererCautionnement(ct.id)} className="text-[9.5px] font-bold text-emerald-600 uppercase tracking-wide hover:text-emerald-700">Libérer</button>
                          )}
                          {ct.statut !== 'active' && <Badge tone={ct.statut === 'libérée' ? 'emerald' : 'neutral'}>{ct.statut}</Badge>}
                        </div>
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

              {/* ---- DEPENSES ET ACHATS (CORE) ---- */}
              <div className="card p-6 border-l-4 border-l-rose-500">
                <h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-slate-700 mb-4 flex items-center gap-2">
                  <Wallet size={15} className="text-rose-500" /> Dépenses & Achats (Core)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-3">
                    <p className="text-[11px] text-slate-500 mb-2">Historique des décaissements réels affectés au chantier.</p>
                    {expenses.filter(e => e.chantier_id === selectedChantier.id).map(e => (
                      <div key={e.id} className="p-3 border border-slate-200 rounded-md bg-white flex justify-between items-center text-[12px]">
                        <div>
                          <p className="font-semibold text-slate-800">{e.description}</p>
                          <p className="text-slate-500">{new Date(e.date).toLocaleDateString('fr-FR')} • {e.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold font-mono text-rose-600">{fmt(e.amountTTC)}</p>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${e.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : e.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>{e.status}</span>
                        </div>
                      </div>
                    ))}
                    {expenses.filter(e => e.chantier_id === selectedChantier.id).length === 0 && (
                      <p className="text-[12px] text-slate-400 italic">Aucune dépense comptable enregistrée.</p>
                    )}
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <p className="text-[12px] font-semibold text-slate-700 mb-3">Nouvelle Dépense Chantier</p>
                    <form onSubmit={handleAddExpense} className="space-y-3">
                      <select 
                        value={newExpense.category} 
                        onChange={e => setNewExpense({...newExpense, category: e.target.value})}
                        className="w-full p-2 border border-slate-200 rounded-md text-[12px]"
                      >
                        <option value="ACHAT_MARCHANDISE">Achat Matériaux/Marchandises</option>
                        <option value="PRESTATION_SERVICE">Sous-traitance / Prestation</option>
                        <option value="TRANSPORT">Transport & Déplacement</option>
                        <option value="ENTRETIEN">Entretien / Carburant</option>
                        <option value="AUTRE">Autre Imprévu</option>
                      </select>
                      <input 
                        type="text" 
                        value={newExpense.description}
                        onChange={e => setNewExpense({...newExpense, description: e.target.value})}
                        placeholder="Description (ex: Achat ciment chez X)" 
                        className="w-full p-2 border border-slate-200 rounded-md text-[12px]"
                        required 
                      />
                      <div className="flex gap-2 items-center">
                        <input 
                          type="number" 
                          value={newExpense.amountHT || ''}
                          onChange={e => setNewExpense({...newExpense, amountHT: Number(e.target.value)})}
                          placeholder="Montant HT (GNF)" 
                          className="flex-1 p-2 border border-slate-200 rounded-md text-[12px] font-mono"
                          required 
                        />
                        <button type="submit" className="bg-rose-600 text-white px-3 py-2 rounded-md font-semibold text-[12px] hover:bg-rose-700">Valider</button>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">La dépense remontera automatiquement à la comptabilité globale (Core) pour validation.</p>
                    </form>
                  </div>
                </div>
              </div>

              {/* ---- LOTS & TÂCHES (CDC : découpage hiérarchique) ---- */}
              <BtpLotsSection chantierId={selectedChantier.id} />

              {/* ---- P3-2 : PILOTAGE PAR LOT ---- */}
              <BtpLotPilotage chantierId={selectedChantier.id} />

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

              {/* ---- Réserves à la réception ---- */}
              {['réception_provisoire', 'réception_définitive'].includes(selectedChantier.statut) && (
                <div className="card p-6 mt-6">
                  <h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-slate-700 mb-4 flex items-center gap-2">
                    <AlertTriangle size={15} className="text-amber-500" /> Réserves à la réception
                  </h3>
                  <div className="space-y-3">
                    {btpReserves.filter(r => r.chantier_id === selectedChantier.id).map(r => (
                      <div key={r.id} className={`p-3 rounded-lg border ${r.statut === 'levee' ? 'border-emerald-200 bg-emerald-50/30' : 'border-amber-200 bg-amber-50/30'} flex items-center justify-between gap-4`}>
                        <div>
                          <p className={`text-[12.5px] font-semibold ${r.statut === 'levee' ? 'text-emerald-800' : 'text-amber-800'}`}>{r.description}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">Émise le {new Date(r.date_emission).toLocaleDateString('fr-FR')} {r.date_levee && `• Levée le ${new Date(r.date_levee).toLocaleDateString('fr-FR')}`}</p>
                        </div>
                        {r.statut === 'en_cours' ? (
                          <button onClick={() => handleLeverReserve(r.id)} className="btn btn-dark !py-1 !px-2.5 !text-[11px]">
                            Lever la réserve
                          </button>
                        ) : (
                          <Badge tone="success">Levée</Badge>
                        )}
                      </div>
                    ))}
                    {btpReserves.filter(r => r.chantier_id === selectedChantier.id).length === 0 && (
                      <p className="text-[12px] text-slate-400">Aucune réserve enregistrée pour ce chantier.</p>
                    )}
                  </div>
                  
                  {(currentRole === 'GERANT' || currentRole === 'COND_TRAVAUX') && (
                    <form onSubmit={handleAddReserve} className="mt-4 flex gap-2">
                      <input 
                        className="input flex-1 !text-[12px]" 
                        placeholder="Description de la nouvelle réserve (ex: Traces de peinture sur la plinthe...)"
                        value={newReserve.description}
                        onChange={e => setNewReserve({ description: e.target.value })}
                        required
                      />
                      <button type="submit" className="btn btn-ghost !text-[12px]">Ajouter une réserve</button>
                    </form>
                  )}
                </div>
              )}

            </div>
          ) : (
            <div className="card h-64 flex items-center justify-center text-slate-400 text-sm">
              Sélectionnez un chantier pour afficher les détails
            </div>
          )}
        </div>
      </div>

      {/* P3-3 : Évaluation sous-traitant structurée */}
      <Modal
        open={!!stEvalId}
        onClose={() => setStEvalId(null)}
        title="Évaluation du sous-traitant"
        subtitle="Notation multi-critères pondérée (CDC §12)"
      >
        {stEvalId && (() => {
          const st = btpSousTraitances.find(s => s.id === stEvalId);
          if (!st) return null;
          return (
            <BtpSTEvaluation
              sousTraitanceId={st.id}
              entreprise={st.entreprise}
              onEvaluate={(notes: Record<string, number>, commentaire: string) => {
                // B-6 : note PONDÉRÉE (30/25/20/15/10 %) — et non plus une
                // moyenne simple — persistée avec le commentaire, + dépense Core.
                const POIDS: Record<string, number> = { qualite: 30, delais: 25, securite: 20, communication: 15, prix: 10 };
                const noteGlobale = Object.entries(POIDS).reduce((s, [k, p]) => s + ((notes[k] || 0) * p / 100), 0);
                solderBtpSousTraitance(st.id, {
                  note_globale: Math.round(noteGlobale * 10) / 10,
                  commentaire,
                });
                pushToast(`« ${st.entreprise} » évalué à ${noteGlobale.toFixed(1)}/5 (pondéré) — contrat soldé, dépense transmise à la comptabilité.`, 'SUCCESS');
                setStEvalId(null);
              }}
            />
          );
        })()}
      </Modal>

      {showOffreModal && selectedChantier?.offre_id && (
        <Modal title="Détail du Devis Initial" onClose={() => setShowOffreModal(false)} size="lg">
          <div className="space-y-4">
            {(() => {
              const offre = btpOffres.find(o => o.id === selectedChantier.offre_id);
              if (!offre) return <p className="text-sm text-slate-500">Devis introuvable.</p>;
              let chiffrage = null;
              try { if(offre.chiffrage_json) chiffrage = JSON.parse(offre.chiffrage_json); } catch(e){}
              
              if(!chiffrage || !chiffrage.lignes) return <p className="text-sm text-slate-500">Aucun chiffrage détaillé disponible.</p>;

              // Group by Phase
              const grouped: Record<string, any[]> = {};
              chiffrage.lignes.forEach((l: any) => {
                const p = l.phase || 'Général';
                if(!grouped[p]) grouped[p] = [];
                grouped[p].push(l);
              });

              return (
                <div className="space-y-6">
                  <div className="flex justify-between items-end border-b border-slate-100 pb-3">
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Client</p>
                      <p className="font-semibold text-slate-800">{offre.client}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Montant Total Estimé</p>
                      <p className="font-bold text-indigo-700 text-lg font-mono">{fmt(offre.montant_estime)} GNF</p>
                    </div>
                  </div>

                  {Object.entries(grouped).map(([phaseName, lines]) => (
                    <div key={phaseName} className="space-y-2">
                      <h4 className="text-[13px] font-bold text-slate-800 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200">
                        Phase : {phaseName}
                      </h4>
                      <div className="overflow-hidden rounded-lg border border-slate-100">
                        <table className="table-premium w-full text-[11.5px]">
                          <thead>
                            <tr>
                              <th className="text-left w-1/4">Famille</th>
                              <th className="text-left w-1/3">Désignation</th>
                              <th className="text-right">Qté</th>
                              <th className="text-right">PU (GNF)</th>
                              <th className="text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {lines.map((l, i) => (
                              <tr key={i}>
                                <td>{FAMILLES_LABEL[l.famille] || l.famille}</td>
                                <td className="font-medium text-slate-700">{l.designation}</td>
                                <td className="text-right font-mono">{l.quantite}</td>
                                <td className="text-right font-mono text-slate-500">{fmt(l.pu)}</td>
                                <td className="text-right font-mono font-semibold text-slate-800">{fmt(l.quantite * l.pu)}</td>
                              </tr>
                            ))}
                            <tr className="bg-slate-50">
                              <td colSpan={4} className="text-right font-bold text-slate-600">Total Phase</td>
                              <td className="text-right font-mono font-bold text-indigo-700">
                                {fmt(lines.reduce((acc, l) => acc + (l.quantite * l.pu), 0))}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </Modal>
      )}
    </div>
  );
};
