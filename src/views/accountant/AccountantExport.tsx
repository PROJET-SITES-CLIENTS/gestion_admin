import React from 'react';
import { useApp } from '../../store';
import { Download, FileSpreadsheet, Table } from 'lucide-react';

/**
 * FIX 11 : Export CSV comptable
 * Exports : Grand Livre (écritures), Trésorerie (transactions), TVA (résumé fiscal)
 */
export function AccountantExport() {
  const { projects, transactions, expenses, treasuryAccounts, payslips, companyConfig } = useApp();

  const downloadCSV = (filename: string, rows: (string | number)[][]) => {
    const csv = '\uFEFF' + rows.map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  };

  const exportTreasury = () => {
    const rows = [
      ['DATE', 'TYPE', 'COMPTE', 'CATÉGORIE', 'DESCRIPTION', 'RÉFÉRENCE', 'MONTANT (GNF)'],
      ...transactions
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .map(t => {
          const acc = treasuryAccounts.find(a => a.id === t.accountId);
          return [
            new Date(t.date).toLocaleDateString('fr-FR'),
            t.type,
            acc?.name || t.accountId,
            t.category,
            t.description,
            t.referenceId || '',
            t.amount,
          ];
        }),
      [],
      ['TOTAL ENTRÉES', transactions.filter(t => t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0)],
      ['TOTAL SORTIES', transactions.filter(t => t.type === 'DEBIT').reduce((s, t) => s + t.amount, 0)],
      ['SOLDE NET', transactions.reduce((s, t) => s + (t.type === 'CREDIT' ? t.amount : -t.amount), 0)],
    ];
    downloadCSV(`Tresorerie_${new Date().toISOString().split('T')[0]}.csv`, rows);
  };

  const exportTVA = () => {
    const tvaRate = companyConfig?.tvaRate || 18;
    const collected = transactions.filter(t => t.type === 'CREDIT' && t.category === 'VENTE');
    const deductible = expenses.filter(e => e.status === 'PAID' && e.tvaAmount > 0);

    const tvaCollected = collected.reduce((s, t) => s + Math.round(t.amount - t.amount / (1 + tvaRate / 100)), 0);
    const tvaDeductible = deductible.reduce((s, e) => s + (e.tvaAmount || 0), 0);

    const rows = [
      ['DÉCLARATION TVA', `${tvaRate}%`],
      ['Période', new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })],
      [],
      ['TVA COLLECTÉE (ventes)'],
      ['DATE', 'PROJET', 'MONTANT TTC', 'MONTANT HT', 'TVA'],
      ...collected.map(t => [
        new Date(t.date).toLocaleDateString('fr-FR'),
        t.description,
        t.amount,
        Math.round(t.amount / (1 + tvaRate / 100)),
        Math.round(t.amount - t.amount / (1 + tvaRate / 100)),
      ]),
      ['TOTAL TVA COLLECTÉE', '', '', '', tvaCollected],
      [],
      ['TVA DÉDUCTIBLE (achats)'],
      ['DATE', 'DESCRIPTION', 'MONTANT TTC', 'MONTANT HT', 'TVA'],
      ...deductible.map(e => [
        e.date,
        e.description,
        e.amountTTC,
        e.amountHT,
        e.tvaAmount,
      ]),
      ['TOTAL TVA DÉDUCTIBLE', '', '', '', tvaDeductible],
      [],
      ['TVA NETTE À PAYER', '', '', '', tvaCollected - tvaDeductible],
    ];
    downloadCSV(`Declaration_TVA_${new Date().toISOString().split('T')[0]}.csv`, rows);
  };

  const exportProjects = () => {
    const rows = [
      ['PROJET', 'CLIENT', 'STATUT', 'PAIEMENT', 'BUDGET', 'ENCAISSÉ', 'RESTANT'],
      ...projects.map(p => {
        const paid = (p.paymentPlan?.installments || [])
          .filter(i => i.status === 'PAID')
          .reduce((s, i) => s + (i.amount || 0), 0);
        return [
          p.name,
          p.clientName,
          p.status,
          p.paymentStatus,
          p.budget || 0,
          paid,
          Math.max(0, (p.budget || 0) - paid),
        ];
      }),
    ];
    downloadCSV(`Projets_${new Date().toISOString().split('T')[0]}.csv`, rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
            <span className="font-serif italic font-normal text-indigo-600 mr-1.5">Les exports</span>comptables
          </h2>
          <p className="text-[13px] text-slate-500 mt-1">Téléchargez vos données au format CSV (compatible Excel).</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button onClick={exportTreasury} className="card card-hover p-6 text-left group">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-50 border border-indigo-200/70 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-100">
              <Table size={22} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Journal de Trésorerie</h3>
              <p className="text-[13px] text-slate-500 mt-1">Toutes les transactions avec totaux entrées/sorties</p>
              <p className="text-[11px] text-slate-400 mt-2">{transactions.length} transactions</p>
            </div>
          </div>
        </button>

        <button onClick={exportTVA} className="card card-hover p-6 text-left group">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-50 border border-emerald-200/70 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Déclaration TVA</h3>
              <p className="text-[13px] text-slate-500 mt-1">TVA collectée / déductible / nette à payer ({companyConfig?.tvaRate || 18}%)</p>
              <p className="text-[11px] text-slate-400 mt-2">Prêt pour le fisc</p>
            </div>
          </div>
        </button>

        <button onClick={exportProjects} className="card card-hover p-6 text-left group">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-50 border border-blue-200/70 flex items-center justify-center text-blue-600 group-hover:bg-blue-100">
              <Download size={22} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Situation Projets</h3>
              <p className="text-[13px] text-slate-500 mt-1">Budget / encaissé / restant dû par projet</p>
              <p className="text-[11px] text-slate-400 mt-2">{projects.length} projets</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
