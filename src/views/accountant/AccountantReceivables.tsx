import React, { useState } from 'react';
import { useApp } from '../../store';
import { AlertTriangle, PhoneCall, Mail, CheckCircle2, Clock, Receipt, FileText, Download } from 'lucide-react';
import { Badge, statusTone, Modal } from '../../components/ui';
import { generateReceiptPDF } from '../../utils/pdfGenerator';

/**
 * Créances clients + Enregistrement d'acomptes
 * 
 * Le comptable voit :
 * - Qui doit combien (budget - déjà payé)
 * - Un bouton pour enregistrer un acompte (montant libre + compte + reçu)
 * - Un bouton pour relancer le client (notification au commercial)
 */
export function AccountantReceivables() {
  const {
    projects, treasuryAccounts, addTransaction, pushToast,
    addNotification, companyConfig, updateProject, autoGenerateAccountingEntry,
    // SYNERGIE D : inclure les chantiers BTP dans les créances
    btpChantiers, btpChantierStats, btpSituations, btpReserves,
  } = useApp();

  const [showPayment, setShowPayment] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentAccount, setPaymentAccount] = useState('');
  const [paymentRef, setPaymentRef] = useState('');

  const fmt = (n: number) => (n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 });

  // ══════════════════════════════════════════════════════════
  // Créances CORE : projets (budget - échéances payées)
  // ══════════════════════════════════════════════════════════
  const coreReceivables = projects
    .filter(p => p.status !== 'ANNULE')
    .map(p => {
      const paidFromPlan = (p.paymentPlan?.installments || [])
        .filter(i => i.status === 'PAID')
        .reduce((s, i) => s + (i.amount || 0), 0);
      const budget = p.budget || 0;
      const remaining = Math.max(0, budget - paidFromPlan);
      const isFullyPaid = remaining === 0 || p.paymentStatus === 'PAID';
      const overdue = !isFullyPaid && remaining > 0 && p.paymentPlan?.installments?.some(i =>
        i.status === 'PENDING' && new Date(i.expectedDate) < new Date()
      );
      return { ...p, source: 'core' as const, paidFromPlan, remaining, isFullyPaid, overdue };
    })
    .filter(p => p.budget > 0);

  // ══════════════════════════════════════════════════════════
  // SYNERGIE D : Créances BTP (chantiers : budget - situations facturées)
  // Le comptable voit maintenant l'argent réel dû par les clients BTP
  // ══════════════════════════════════════════════════════════
  const btpReceivables = (btpChantiers || [])
    .filter(c => !['clôturé', 'réception_définitive'].includes(c.statut))
    .map(c => {
      const stat = (btpChantierStats || []).find(s => s.id === c.id);
      const factured = stat?.montant_situations_facturees || 0;
      const enAttente = stat?.montant_situations_attente || 0;
      const budget = c.budget_initial || 0;
      const remaining = Math.max(0, budget - factured);
      const rgBloquee = stat?.retenue_bloquee || 0;
      const isFullyPaid = remaining === 0 && enAttente === 0;
      // Retard : situations en attente dont l'échéance est dépassée
      const overdue = enAttente > 0 && (btpSituations || []).some(s =>
        s.chantier_id === c.id && s.statut === 'en_attente_facturation'
      );
      const reservesOuvertes = (btpReserves || []).filter(r => r.chantier_id === c.id && !['levée', 'levee', 'annulée', 'annulee'].includes(r.statut)).length;
      return {
        ...c,
        source: 'btp' as const,
        clientName: c.client,
        name: c.nom,
        budget,
        paidFromPlan: factured,
        remaining,
        isFullyPaid,
        overdue,
        rgBloquee,
        enAttente,
        reservesOuvertes,
      };
    })
    .filter(c => c.budget > 0);

  // Fusionner et trier
  const receivables = [...coreReceivables, ...btpReceivables].sort((a, b) => b.remaining - a.remaining);

  const totalReceivable = receivables.filter(r => !r.isFullyPaid).reduce((s, r) => s + r.remaining, 0);
  const overdueCount = receivables.filter(r => r.overdue).length;
  const totalRgBloquee = btpReceivables.reduce((s, r) => s + (r as any).rgBloquee, 0);
  const selectedProject = receivables.find(r => r.id === showPayment);

  const handleRecordPayment = async () => {
    if (!selectedProject || !paymentAccount) return;
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) {
      pushToast('Montant invalide.', 'ERROR');
      return;
    }
    // L'acompte créances ne s'applique qu'aux projets Core (les chantiers BTP
    // passent par la facturation de situations).
    if (selectedProject.source === 'btp') {
      pushToast('Chantier BTP : encaissez via la facturation de situations (module BTP).', 'ERROR');
      return;
    }
    if (amount > selectedProject.remaining) {
      pushToast(`Le montant (${fmt(amount)} GNF) dépasse la créance restante (${fmt(selectedProject.remaining)} GNF).`, 'ERROR');
      return;
    }

    const ok = await addTransaction({
      accountId: paymentAccount,
      type: 'CREDIT',
      amount,
      referenceId: selectedProject.id,
      category: 'ACOMPTE_CLIENT',
      description: `Acompte client — ${selectedProject.name}${paymentRef ? ` (Réf: ${paymentRef})` : ''}`,
    });

    if (ok) {
      // ══════════════════════════════════════════════════════════
      // T9 : l'acompte est désormais un VRAI encaissement synchronisé —
      // 1. il est inscrit dans l'échéancier (tranche PAID) donc la
      //    créance affichée baisse réellement,
      // 2. il génère l'écriture comptable VENTE (701/443) avec TVA,
      // 3. il met à jour les statuts de paiement du projet.
      // ══════════════════════════════════════════════════════════
      const today = new Date().toISOString().slice(0, 10);
      const proj = projects.find(p => p.id === selectedProject.id);
      if (!proj) return;
      const currentPlan = proj.paymentPlan || { status: 'DRAFT', installments: [] } as any;
      const newInstallment = {
        id: `acompte-${Date.now()}`,
        name: paymentRef ? `Acompte (${paymentRef})` : 'Acompte',
        percentage: 0,
        amount,
        expectedDate: today,
        status: 'PAID',
        paymentDate: new Date().toISOString(),
      };
      const installments = [...(currentPlan.installments || []), newInstallment];
      const totalPaidNow = selectedProject.paidFromPlan + amount;
      const fullyPaid = totalPaidNow >= (proj.budget || 0) - 0.5;
      await updateProject({
        ...proj,
        paymentPlan: { ...currentPlan, installments },
        paymentStatus: fullyPaid ? 'PAID' : 'PARTIAL',
        status: fullyPaid ? 'PAYE' : 'EN_COURS',
        accountantPaymentConfirm: true,
      } as any);

      // 2. Écriture comptable SYSCOHADA (701 HT / 443 TVA / 52x TTC)
      await autoGenerateAccountingEntry('VENTE', amount, `Acompte créance — ${selectedProject.name}`);

      // Générer le reçu PDF
      const doc = {
        id: newInstallment.id,
        amountPaid: amount,
        createdAt: new Date().toISOString(),
        balance: selectedProject.remaining - amount,
        installmentName: 'Acompte',
      };
      try {
        await generateReceiptPDF(selectedProject, doc, companyConfig);
      } catch { /* PDF non bloquant */ }

      await addNotification('COMMERCIAL', `Acompte de ${fmt(amount)} GNF enregistré pour « ${selectedProject.name} ». Restant : ${fmt(selectedProject.remaining - amount)} GNF.`, 'SUCCESS');
      pushToast(`Acompte de ${fmt(amount)} GNF enregistré (plan + écriture comptable mis à jour). Reçu téléchargé.`, 'SUCCESS');
      setShowPayment(null);
      setPaymentAmount('');
      setPaymentRef('');
    }
  };

  const handleRelance = async (projectName: string, clientName: string, remaining: number) => {
    await addNotification(
      'COMMERCIAL',
      `RELANCE : « ${clientName} » doit encore ${fmt(remaining)} GNF sur le projet « ${projectName} ». Merci de contacter le client pour le règlement.`,
      'WARNING'
    );
    pushToast(`Relance envoyée au commercial pour « ${clientName} ».`, 'SUCCESS');
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
            <span className="font-serif italic font-normal text-indigo-600 mr-1.5">Les créances</span>& relances clients
          </h2>
          <p className="text-[13px] text-slate-500 mt-1">Suivi des soldes clients, enregistrement d'acomptes et relances.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="card p-4">
            <p className="label">Total à recouvrer</p>
            <p className="font-mono font-bold text-lg text-indigo-600">{fmt(totalReceivable)} GNF</p>
          </div>
          <div className="card p-4">
            <p className="label">Échéances dépassées</p>
            <p className={`font-mono font-bold text-lg ${overdueCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{overdueCount}</p>
          </div>
          {totalRgBloquee > 0 && (
            <div className="card p-4">
              <p className="label">RG bloquées (BTP)</p>
              <p className="font-mono font-bold text-lg text-amber-600">{fmt(totalRgBloquee)} GNF</p>
            </div>
          )}
          {btpReceivables.length > 0 && (
            <div className="card p-4">
              <p className="label">Chantiers BTP</p>
              <p className="font-mono font-bold text-lg text-blue-600">{btpReceivables.filter(r => !r.isFullyPaid).length}</p>
            </div>
          )}
        </div>
      </div>

      {/* Table des créances */}
      <div className="card overflow-x-auto">
        <table className="table-premium w-full min-w-[800px]">
          <thead>
            <tr>
              <th>Source</th>
              <th>Projet / Chantier</th>
              <th>Client</th>
              <th className="text-right">Budget</th>
              <th className="text-right">Encaissé</th>
              <th className="text-right">Restant dû</th>
              <th>Statut</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {receivables.length === 0 && (
              <tr><td colSpan={8} className="p-8 text-center text-slate-400">Aucun projet avec budget.</td></tr>
            )}
            {receivables.map(r => (
              <tr key={r.id} className={r.overdue ? 'bg-rose-50/30' : ''}>
                <td>
                  <span className={`badge ${(r as any).source === 'btp' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    {(r as any).source === 'btp' ? '🏗 BTP' : 'Core'}
                  </span>
                </td>
                <td className="font-semibold text-slate-800">{r.name}</td>
                <td className="text-slate-600">{r.clientName}</td>
                <td className="text-right font-mono">{fmt(r.budget)}</td>
                <td className="text-right font-mono text-emerald-600">{fmt(r.paidFromPlan)}</td>
                <td className={`text-right font-mono font-bold ${r.remaining > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {r.isFullyPaid ? '— Soldé' : fmt(r.remaining)}
                  {(r as any).rgBloquee > 0 && (
                    <span className="block text-[9.5px] text-amber-600 font-normal">RG : {fmt((r as any).rgBloquee)}</span>
                  )}
                </td>
                <td>
                  {r.isFullyPaid ? <Badge tone="emerald">Soldé</Badge>
                    : r.overdue ? <Badge tone="rose"><AlertTriangle size={10} className="mr-1" />En retard</Badge>
                    : <Badge tone="amber"><Clock size={10} className="mr-1" />En attente</Badge>}
                  {(r as any).source === 'btp' && (r as any).enAttente > 0 && (
                    <span className="block text-[9.5px] text-slate-400 mt-1">Situations : {fmt((r as any).enAttente)}</span>
                  )}
                </td>
                <td className="text-center">
                  <div className="flex justify-center gap-1.5">
                    {!r.isFullyPaid && (
                      <>
                        <button
                          onClick={() => { setShowPayment(r.id); setPaymentAccount(treasuryAccounts[0]?.id || ''); }}
                          className="btn btn-primary !py-1 !px-2.5 !text-[10.5px]"
                          title="Enregistrer un acompte"
                        >
                          <Receipt size={11} /> Acompte
                        </button>
                        <button
                          onClick={() => handleRelance(r.name, r.clientName, r.remaining)}
                          className="btn btn-ghost !py-1 !px-2.5 !text-[10.5px]"
                          title="Envoyer une relance au commercial"
                        >
                          <PhoneCall size={11} /> Relancer
                        </button>
                      </>
                    )}
                    {r.isFullyPaid && (
                      <span className="text-[10px] text-emerald-600 font-bold uppercase">✓ Payé</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modale : enregistrer un acompte */}
      <Modal
        open={!!showPayment}
        onClose={() => setShowPayment(null)}
        title={`Enregistrer un acompte — ${selectedProject?.name || ''}`}
        subtitle={`Restant dû : ${fmt(selectedProject?.remaining || 0)} GNF`}
      >
        <div className="space-y-4">
          <div>
            <label className="label">Montant reçu (GNF)</label>
            <input
              type="number"
              className="input font-mono text-lg"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder={`Max ${fmt(selectedProject?.remaining || 0)}`}
              autoFocus
            />
          </div>
          <div>
            <label className="label">Compte de trésorerie</label>
            <select className="input" value={paymentAccount} onChange={(e) => setPaymentAccount(e.target.value)}>
              <option value="">— Choisir —</option>
              {treasuryAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name} ({acc.type}) — {fmt(acc.balance)} GNF</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Référence (chèque, virement…)</label>
            <input className="input" value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="N° chèque, référence virement…" />
          </div>
          {paymentAmount && Number(paymentAmount) > 0 && (
            <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-100 text-[12.5px] text-indigo-800">
              <p className="font-semibold mb-1">Récapitulatif :</p>
              <p>Montant : <strong className="font-mono">{fmt(Number(paymentAmount))} GNF</strong></p>
              <p>Restant après : <strong className="font-mono">{fmt((selectedProject?.remaining || 0) - Number(paymentAmount))} GNF</strong></p>
              <p className="text-[11px] mt-1 text-indigo-500">Un reçu PDF sera automatiquement généré et téléchargé.</p>
            </div>
          )}
          <button
            onClick={handleRecordPayment}
            disabled={!paymentAmount || Number(paymentAmount) <= 0 || !paymentAccount}
            className="btn btn-primary w-full"
          >
            <Receipt size={14} /> Enregistrer l'acompte + générer le reçu
          </button>
        </div>
      </Modal>
    </div>
  );
}
