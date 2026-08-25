import React, { useState, useEffect } from 'react';
import { Project, PaymentPlan, PaymentInstallment } from '../types';
import { useApp } from '../store';
import { AlertCircle, CheckCircle2, Calculator, FileCheck, FileText, Plus, Trash2, Download } from 'lucide-react';
import { generateReceiptPDF } from '../utils/pdfGenerator';

export const PaymentPlanManager = ({ project }: { project: Project }) => {
  const { savePaymentPlan, payInstallmentAndGenerateReceipt, generateDocument, companyConfig } = useApp();
  const price = project.commercialInfo?.negotiatedPrice || 0;
  
  const [draftPlan, setDraftPlan] = useState<PaymentPlan>(() => {
    if (project.paymentPlan) return project.paymentPlan;
    // Default plan: 50% / 50%
    return {
      status: 'DRAFT',
      totalAmount: price,
      installments: [
        {
          id: '1',
          name: 'Acompte de démarrage (Maquette sous 1 sem)',
          percentage: 75,
          amount: price * 0.75,
          expectedDate: new Date().toISOString().split('T')[0],
          status: 'PENDING'
        },
        {
          id: '2',
          name: 'Solde final (Avant déploiement)',
          percentage: 25,
          amount: price * 0.25,
          expectedDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'PENDING'
        }
      ]
    };
  });

  useEffect(() => {
    if (project.paymentPlan) {
      setDraftPlan(project.paymentPlan);
    } else {
      setDraftPlan({
        status: 'DRAFT',
        totalAmount: price,
        installments: [
          {
            id: '1',
            name: 'Acompte de démarrage (Maquette sous 1 sem)',
            percentage: 75,
            amount: price * 0.75,
            expectedDate: new Date().toISOString().split('T')[0],
            status: 'PENDING'
          },
          {
            id: '2',
            name: 'Solde final (Avant déploiement)',
            percentage: 25,
            amount: price * 0.25,
            expectedDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'PENDING'
          }
        ]
      });
    }
  }, [project.id]);

  // Keep LOCKED plans updated in real time (e.g., as accountant confirms payments)
  const isServerPlanLocked = project.paymentPlan?.status === 'LOCKED';
  const installmentsSerialized = JSON.stringify(project.paymentPlan?.installments);

  useEffect(() => {
    if (isServerPlanLocked && project.paymentPlan) {
      setDraftPlan(project.paymentPlan);
    }
  }, [isServerPlanLocked, installmentsSerialized, project.paymentPlan]);

  const isLocked = project.paymentPlan?.status === 'LOCKED';
  
  const handleUpdateDraft = (index: number, field: keyof PaymentInstallment, value: any) => {
    const newInstallments = [...draftPlan.installments];
    
    if (field === 'percentage') {
      const parsed = parseFloat(value) || 0;
      newInstallments[index] = {
        ...newInstallments[index],
        percentage: parsed,
        amount: price * (parsed / 100)
      };
    } else {
      newInstallments[index] = {
        ...newInstallments[index],
        [field]: value
      };
    }
    
    setDraftPlan({ ...draftPlan, installments: newInstallments });
  };

  const handleAddInstallment = () => {
    setDraftPlan({
      ...draftPlan,
      installments: [
        ...draftPlan.installments,
        {
          id: Date.now().toString(),
          name: 'Nouvelle Tranche',
          percentage: 0,
          amount: 0,
          expectedDate: new Date().toISOString().split('T')[0],
          status: 'PENDING'
        }
      ]
    });
  };

  const handleRemoveInstallment = (index: number) => {
    const newInstallments = [...draftPlan.installments];
    newInstallments.splice(index, 1);
    setDraftPlan({ ...draftPlan, installments: newInstallments });
  };

  const totalPercentage = draftPlan.installments.reduce((acc, inst) => acc + (inst.percentage || 0), 0);
  const isValid = totalPercentage === 100;

  const handleSaveDraft = async () => {
    if (!isValid) return alert('Le total des pourcentages doit être exactement 100%');
    await savePaymentPlan(project.id, { ...draftPlan, totalAmount: price });
    alert('Plan de paiement sauvegardé.');
  };

  const handleGenerateProforma = async () => {
    if (!isValid) return alert('Le total des pourcentages doit être 100%');
    if (!project.paymentPlan) {
      await savePaymentPlan(project.id, { ...draftPlan, totalAmount: price, status: 'LOCKED' });
    } else {
      await savePaymentPlan(project.id, { ...project.paymentPlan, status: 'LOCKED' });
    }
    
    await generateDocument(project.id, 'PROFORMA', {
      amountPaid: 0,
      balance: price
    });
    alert('Facture Proforma générée avec succès ! Plan de paiement verrouillé.');
  };

  // 1-Click Action: Mark paid AND auto-generate & download receipt PDF!
  const handlePayAndGenerateReceipt = async (installment: PaymentInstallment) => {
    if (!window.confirm(`Confirmer l'encaissement de la tranche "${installment.name}" d'un montant de ${installment.amount.toLocaleString('fr-FR')} GNF ?\nUn reçu de règlement officiel sera automatiquement généré et téléchargé.`)) {
      return;
    }

    try {
      // Use atomic store action to record payment and construct the receipt in one call
      const newDoc = await payInstallmentAndGenerateReceipt(
        project.id,
        installment.id,
        installment.name,
        installment.amount
      );
      
      if (newDoc) {
        // Download the PDF instantly on-the-fly with correct financials
        generateReceiptPDF(project, newDoc, companyConfig);
      }
    } catch (err) {
      console.error(err);
      alert("Une erreur est survenue lors de l'enregistrement.");
    }
  };

  // Re-download an existing receipt
  const handleDownloadExistingReceipt = (installment: PaymentInstallment) => {
    const doc = project.documents?.find(d => d.id === installment.receiptDocumentId);
    if (doc) {
      generateReceiptPDF(project, doc, companyConfig);
    } else {
      // Fallback if document not found in history, generate a dynamic mock
      const mockDoc = {
        id: installment.receiptDocumentId || Date.now().toString(),
        type: 'RECEIPT' as const,
        createdAt: installment.paymentDate || new Date().toISOString(),
        amountPaid: installment.amount,
        installmentId: installment.id,
        installmentName: installment.name,
      };
      generateReceiptPDF(project, mockDoc, companyConfig);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-sm p-4 shadow-none flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 uppercase tracking-wide">Échéancier de Facturation</h3>
          <p className="text-sm text-slate-500">Configurez et suivez les jalons de paiement pour un total de {price.toLocaleString('fr-FR')} GNF</p>
        </div>
        {!isLocked && (
           <span className={`text-xs font-semibold px-3 py-1 rounded-full ${isValid ? 'text-emerald-600 border border-slate-100 bg-transparent' : 'text-rose-600 border border-slate-100 bg-transparent'}`}>
             Quote-Part: {totalPercentage}%
           </span>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {draftPlan.installments.map((inst, idx) => (
          <div key={inst.id} className={`flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-50 p-4 rounded-sm border ${inst.status === 'PAID' ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200'}`}>
            <div className="flex-1 w-full flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Intitulé de la tranche</label>
                {isLocked ? (
                  <div className="text-sm font-semibold text-slate-800">{inst.name}</div>
                ) : (
                  <input type="text" value={inst.name} onChange={(e) => handleUpdateDraft(idx, 'name', e.target.value)} className="w-full text-sm p-2 rounded-sm border border-slate-300 focus:outline-emerald-500" />
                )}
              </div>
              
              <div className="w-full sm:w-24">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Quote-part</label>
                {isLocked ? (
                  <div className="text-sm font-semibold text-slate-800">{inst.percentage}%</div>
                ) : (
                  <div className="relative">
                    <input type="number" value={inst.percentage} onChange={(e) => handleUpdateDraft(idx, 'percentage', e.target.value)} className="w-full text-sm p-2 rounded-sm border border-slate-300 focus:outline-emerald-500 pr-8" />
                    <span className="absolute right-3 top-2 text-slate-400 text-sm">%</span>
                  </div>
                )}
              </div>

              <div className="w-full sm:w-32">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Montant</label>
                <div className="text-sm font-semibold text-emerald-600 font-mono mt-1">{inst.amount.toLocaleString('fr-FR')} GNF</div>
              </div>

              <div className="w-full sm:w-36">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Date butoir</label>
                {isLocked ? (
                  <div className="text-sm text-slate-700 font-medium">{new Date(inst.expectedDate).toLocaleDateString('fr-FR')}</div>
                ) : (
                  <input type="date" value={inst.expectedDate} onChange={(e) => handleUpdateDraft(idx, 'expectedDate', e.target.value)} className="w-full text-sm p-2 rounded-sm border border-slate-300 focus:outline-emerald-500" />
                )}
              </div>
            </div>

            {/* Actions for this installment */}
            <div className="flex items-center gap-2 mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-200 w-full sm:w-auto">
              {!isLocked && (
                <button onClick={() => handleRemoveInstallment(idx)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-sm transition-colors ml-auto sm:ml-0" title="Supprimer la tranche">
                  <Trash2 size={18} />
                </button>
              )}
              {isLocked && (
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {inst.status === 'PAID' ? (
                     <div className="flex flex-col items-end w-full sm:w-auto">
                       <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded-full uppercase">
                         <CheckCircle2 size={11} /> Réglé
                       </span>
                       <button 
                         onClick={() => handleDownloadExistingReceipt(inst)} 
                         className="text-[10px] text-blue-600 hover:text-blue-800 hover:underline mt-1.5 flex items-center gap-1"
                         title="Télécharger à nouveau le reçu PDF"
                       >
                         <Download size={10} /> Reçu acquitté
                       </button>
                     </div>
                  ) : (
                    <button 
                      onClick={() => handlePayAndGenerateReceipt(inst)}
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-sm transition-all shadow-none flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <CheckCircle2 size={13} /> Enregistrer & Reçu
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {!isLocked && (
        <div className="flex items-center justify-between mt-2 pt-4 border-t border-slate-100">
          <button onClick={handleAddInstallment} className="text-sm font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-2 transition-colors">
            <Plus size={18} /> Ajouter une tranche
          </button>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={handleSaveDraft}
              className="text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-sm transition-colors"
            >
              Enregistrer brouillon
            </button>
            <button 
               onClick={handleGenerateProforma}
               disabled={!isValid}
               className={`text-sm font-semibold px-4 py-2.5 rounded-sm transition-all shadow-none flex items-center gap-2 ${isValid ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-none' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
            >
              <FileText size={18} /> Verrouiller & Proforma
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

