import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { Plus, Search, FileText, Send, Check, X, Printer, Trash2 } from 'lucide-react';
import { generateCommercialProposalPDF } from '../utils/pdfGenerator';

export const CommercialProposals: React.FC = () => {
  const { catalogue, proposals, prospects, generateProposal, updateProposalStatus, addCatalogueItem, currentRole, companyConfig } = useApp();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewProposal, setShowNewProposal] = useState(false);
  const [showNewCatalogItem, setShowNewCatalogItem] = useState(false);
  const [activeTab, setActiveTab] = useState<'PROPOSALS' | 'CATALOG'>('PROPOSALS');
  
  // New Catalog Item State
  const [catCategory, setCatCategory] = useState('');
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catPrice, setCatPrice] = useState(0);
  
  // New Proposal State
  const [selectedProspectId, setSelectedProspectId] = useState('');
  const [proposalTitle, setProposalTitle] = useState('');
  const [selectedItems, setSelectedItems] = useState<{ catalogItemId: string; quantity: number; unitPrice: number; discount?: number }[]>([]);

  // Derived data
  const filteredProposals = proposals.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    prospects.find(pr => pr.id === p.prospectId)?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeProspects = prospects.filter(p => p.stage !== 'PERDU');

  // Proposal Creation Logic
  const handleAddItem = (catalogItemId: string) => {
    const item = catalogue.find(c => c.id === catalogItemId);
    if (item) {
      setSelectedItems([...selectedItems, { catalogItemId, quantity: 1, unitPrice: item.basePrice, discount: 0 }]);
    }
  };

  const handleUpdateItem = (index: number, field: string, value: number) => {
    const newItems = [...selectedItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setSelectedItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const newTotalAmount = selectedItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100)), 0);

  const handleCreateProposal = async () => {
    if (!selectedProspectId || !proposalTitle || selectedItems.length === 0) {
      alert("Veuillez remplir tous les champs obligatoires et ajouter au moins un service.");
      return;
    }
    
    await generateProposal({
      prospectId: selectedProspectId,
      title: proposalTitle,
      items: selectedItems,
      totalAmount: newTotalAmount,
      status: 'DRAFT',
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // Valid 30 days
    });
    
    setShowNewProposal(false);
    setSelectedProspectId('');
    setProposalTitle('');
    setSelectedItems([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 border border-slate-200 rounded-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Propositions & Devis</h2>
          <p className="text-sm text-slate-500">Générez des offres commerciales depuis votre catalogue de services.</p>
        </div>
        <div className="flex gap-2">
          {currentRole === 'GERANT' && (
            <button 
              onClick={() => setActiveTab(activeTab === 'CATALOG' ? 'PROPOSALS' : 'CATALOG')}
              className="border border-slate-200 text-slate-700 px-4 py-2 rounded-sm text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              {activeTab === 'CATALOG' ? 'Voir Devis' : 'Gérer Catalogue'}
            </button>
          )}
          <button 
            onClick={() => setShowNewProposal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-sm text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"
          >
            <Plus size={16} /> Créer un Devis
          </button>
        </div>
      </div>

      {activeTab === 'PROPOSALS' && (
        <div className="bg-white border border-slate-200 rounded-sm">
          <div className="p-4 border-b border-slate-100">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Rechercher par titre ou client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-sm text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Titre de l'offre</th>
                  <th className="px-4 py-3">Prospect</th>
                  <th className="px-4 py-3">Date de validité</th>
                  <th className="px-4 py-3">Montant TTC</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProposals.length > 0 ? (
                  filteredProposals.map(p => {
                    const prospect = prospects.find(pr => pr.id === p.prospectId);
                    return (
                      <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-900">{p.title}</td>
                        <td className="px-4 py-3 text-slate-600">{prospect?.name || 'Inconnu'}</td>
                        <td className="px-4 py-3 text-slate-500">{new Date(p.validUntil).toLocaleDateString('fr-FR')}</td>
                        <td className="px-4 py-3 text-slate-900 font-mono">{p.totalAmount.toLocaleString()} GNF</td>
                        <td className="px-4 py-3">
                          <select 
                            value={p.status}
                            onChange={(e) => updateProposalStatus(p.id, e.target.value as any)}
                            className={`px-2 py-1 rounded-sm text-xs font-semibold outline-none border-0 cursor-pointer ${
                              p.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' :
                              p.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                              p.status === 'SENT' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            <option value="DRAFT">Brouillon</option>
                            <option value="SENT">Envoyé</option>
                            <option value="ACCEPTED">Accepté</option>
                            <option value="REJECTED">Refusé</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right space-x-3">
                          <button 
                            onClick={() => generateCommercialProposalPDF(p, prospect, catalogue, companyConfig)}
                            className="text-slate-500 hover:text-slate-800" title="Imprimer PDF"
                          >
                            <Printer size={16} />
                          </button>
                          <button 
                            onClick={() => {
                              alert(`Simulation : Email/WhatsApp envoyé à ${prospect?.name} avec le devis en pièce jointe.`);
                              updateProposalStatus(p.id, 'SENT');
                            }}
                            className="text-emerald-600 hover:text-emerald-800" title="Envoyer au client"
                          >
                            <Send size={16} />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                      Aucune proposition générée.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Catalogue View for GERANT */}
      {activeTab === 'CATALOG' && currentRole === 'GERANT' && (
        <div className="bg-white border border-slate-200 rounded-sm p-6 relative">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-md font-semibold text-slate-900">Catalogue de Services Standardisés</h3>
            <button 
              onClick={() => setShowNewCatalogItem(true)}
              className="border border-indigo-200 text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-sm text-sm font-medium hover:bg-indigo-100 flex items-center gap-2"
            >
              <Plus size={14} /> Ajouter un service
            </button>
          </div>
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Catégorie</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Prix de base</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {catalogue.map(cat => (
                <tr key={cat.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600 font-medium">{cat.category}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800">{cat.name}</div>
                    <div className="text-xs text-slate-500">{cat.description}</div>
                  </td>
                  <td className="px-4 py-3 font-mono">{cat.basePrice.toLocaleString()} GNF</td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-indigo-600 hover:underline">Modifier</button>
                  </td>
                </tr>
              ))}
              {catalogue.length === 0 && (
                <tr><td colSpan={4} className="text-center py-8 text-slate-500">Catalogue vide. Ajoutez des services via le panel gérant.</td></tr>
              )}
            </tbody>
          </table>

          {showNewCatalogItem && (
            <div className="absolute top-0 right-0 w-80 bg-white border border-slate-200 shadow-xl rounded-sm p-5 z-20">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold text-slate-800">Nouveau Service</h4>
                <button onClick={() => setShowNewCatalogItem(false)} className="text-slate-400 hover:text-slate-600"><X size={16}/></button>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <label className="block text-slate-600 mb-1">Catégorie</label>
                  <input type="text" value={catCategory} onChange={e => setCatCategory(e.target.value)} className="w-full border p-2 rounded-sm" placeholder="Ex: Développement Web" />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Nom du service</label>
                  <input type="text" value={catName} onChange={e => setCatName(e.target.value)} className="w-full border p-2 rounded-sm" placeholder="Ex: Site Vitrine Basic" />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Description</label>
                  <textarea value={catDesc} onChange={e => setCatDesc(e.target.value)} className="w-full border p-2 rounded-sm" placeholder="Description courte..." />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Prix de base (GNF)</label>
                  <input type="number" value={catPrice} onChange={e => setCatPrice(Number(e.target.value))} className="w-full border p-2 rounded-sm font-mono" />
                </div>
                <button 
                  onClick={async () => {
                    if(!catName || !catPrice) return;
                    await addCatalogueItem({ category: catCategory || 'Général', name: catName, description: catDesc, basePrice: catPrice });
                    setShowNewCatalogItem(false);
                    setCatName(''); setCatDesc(''); setCatPrice(0); setCatCategory('');
                  }}
                  className="w-full bg-indigo-600 text-white p-2 rounded-sm font-medium hover:bg-indigo-700 mt-2"
                >
                  Ajouter au catalogue
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* NEW PROPOSAL MODAL */}
      {showNewProposal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowNewProposal(false)}></div>
          <div className="relative bg-white rounded-sm shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-200 bg-slate-50">
              <h2 className="text-xl font-bold text-slate-900">Générateur de Devis</h2>
              <button onClick={() => setShowNewProposal(false)} className="text-slate-400 hover:text-slate-700 bg-white p-1 rounded-full border border-slate-200">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Infos */}
              <div className="col-span-1 border-r border-slate-100 md:pr-6 space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Titre de la proposition *</label>
                  <input 
                    type="text" 
                    value={proposalTitle}
                    onChange={e => setProposalTitle(e.target.value)}
                    placeholder="Ex: Refonte Site Web Corporate"
                    className="w-full border border-slate-300 rounded-sm p-2 text-sm focus:border-indigo-500 outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Prospect / Client *</label>
                  <select 
                    value={selectedProspectId}
                    onChange={e => setSelectedProspectId(e.target.value)}
                    className="w-full border border-slate-300 rounded-sm p-2 text-sm focus:border-indigo-500 outline-none transition-colors"
                  >
                    <option value="">-- Sélectionnez un prospect --</option>
                    {activeProspects.map(p => (
                      <option key={p.id} value={p.id}>{p.name} {p.company ? `(${p.company})` : ''}</option>
                    ))}
                  </select>
                </div>
                
                <div className="pt-4">
                  <label className="block text-xs font-semibold text-indigo-700 uppercase mb-3 flex items-center gap-2"><Plus size={14}/>Catalogue de Services</label>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {catalogue.map(cat => (
                      <div key={cat.id} className="border border-slate-200 bg-white p-3 rounded-sm text-sm hover:border-indigo-400 hover:shadow-sm cursor-pointer flex justify-between items-center group transition-all" onClick={() => handleAddItem(cat.id)}>
                        <div>
                          <div className="font-semibold text-slate-800">{cat.name}</div>
                          <div className="text-slate-500 text-xs font-mono mt-1">{cat.basePrice.toLocaleString()} GNF</div>
                        </div>
                        <div className="bg-slate-100 p-1.5 rounded-sm group-hover:bg-indigo-100 group-hover:text-indigo-700 text-slate-400 transition-colors">
                          <Plus size={14} />
                        </div>
                      </div>
                    ))}
                    {catalogue.length === 0 && (
                      <p className="text-xs text-slate-500 italic">Le catalogue est vide.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Lignes du devis */}
              <div className="col-span-1 md:col-span-2 flex flex-col h-full">
                <h3 className="text-xs font-semibold text-slate-600 uppercase mb-3">Lignes de la proposition</h3>
                
                <div className="flex-1 overflow-y-auto border border-slate-200 rounded-sm bg-white">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3 text-left">Service</th>
                        <th className="py-2 px-3 w-20 text-center">Qté</th>
                        <th className="py-2 px-3 w-32 text-right">Prix Unitaire</th>
                        <th className="py-2 px-3 w-20 text-center">Remise %</th>
                        <th className="py-2 px-3 w-32 text-right">Total HT</th>
                        <th className="py-2 px-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedItems.map((item, idx) => {
                        const catItem = catalogue.find(c => c.id === item.catalogItemId);
                        const lineTotal = item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100);
                        return (
                          <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-2 px-3 font-medium text-slate-800">{catItem?.name}</td>
                            <td className="py-2 px-3">
                              <input type="number" min="1" value={item.quantity} onChange={(e) => handleUpdateItem(idx, 'quantity', Number(e.target.value))} className="w-full border border-slate-300 rounded-sm p-1 text-center outline-none focus:border-indigo-500" />
                            </td>
                            <td className="py-2 px-3">
                              <input type="number" value={item.unitPrice} onChange={(e) => handleUpdateItem(idx, 'unitPrice', Number(e.target.value))} className="w-full border border-slate-300 rounded-sm p-1 text-right font-mono text-xs outline-none focus:border-indigo-500" />
                            </td>
                            <td className="py-2 px-3">
                              <input type="number" min="0" max="100" value={item.discount || 0} onChange={(e) => handleUpdateItem(idx, 'discount', Number(e.target.value))} className="w-full border border-slate-300 rounded-sm p-1 text-center outline-none focus:border-indigo-500" />
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">{lineTotal.toLocaleString()}</td>
                            <td className="py-2 px-3 text-center">
                              <button onClick={() => handleRemoveItem(idx)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14}/></button>
                            </td>
                          </tr>
                        )
                      })}
                      {selectedItems.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-slate-400 italic">
                            <FileText size={32} className="mx-auto mb-3 opacity-20" />
                            Aucun service ajouté. Cliquez sur un élément du catalogue à gauche.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="bg-slate-900 p-5 mt-4 flex justify-between items-center rounded-sm shadow-inner text-white">
                  <div className="text-sm text-slate-300 uppercase font-semibold">Total Net à payer (TTC)</div>
                  <div className="text-2xl font-bold font-mono tracking-tight">{newTotalAmount.toLocaleString()} <span className="text-sm font-normal text-slate-400">GNF</span></div>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-200 flex justify-end gap-3 bg-slate-50 rounded-b-sm">
              <button onClick={() => setShowNewProposal(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-200 rounded-sm text-sm font-medium transition-colors">Annuler</button>
              <button 
                onClick={handleCreateProposal}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-sm text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"
              >
                <Check size={16} /> Enregistrer le Devis
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
