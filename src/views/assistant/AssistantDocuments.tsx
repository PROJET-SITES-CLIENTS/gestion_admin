import React, { useState } from 'react';
import { useApp } from '../../store';
import { AssistantDocument } from '../../types';
import { FileText, Plus, ShieldAlert, AlertTriangle, CheckCircle, Trash2, Edit2, ShieldCheck, Download, Archive } from 'lucide-react';

export default function AssistantDocuments() {
  const { assistantDocuments, crudCreateItem, crudUpdateItem, crudDeleteItem } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [formData, setFormData] = useState<Partial<AssistantDocument>>({
    title: '', category: 'ADMINISTRATIF', url: '', isConfidential: false, status: 'VALID', expirationDate: ''
  });

  const handleSave = async () => {
    if (!formData.title?.trim()) return;
    if (editingId) {
      await crudUpdateItem('assistantDocuments', editingId, formData, 'Modification document');
    } else {
      await crudCreateItem('assistantDocuments', formData, 'Création document');
    }
    setShowForm(false);
    setEditingId(null);
    setFormData({ title: '', category: 'ADMINISTRATIF', url: '', isConfidential: false, status: 'VALID', expirationDate: '' });
  };

  const getStatusBadge = (doc: AssistantDocument) => {
    if (doc.expirationDate && doc.status === 'VALID') {
      const today = new Date();
      const expDate = new Date(doc.expirationDate);
      const diffTime = expDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) return <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-[10px] font-bold">EXPIRÉ</span>;
      if (diffDays <= 30) return <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold">EXPIRE BIENTÔT ({diffDays}J)</span>;
    }
    
    switch (doc.status) {
      case 'VALID': return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">VALIDE</span>;
      case 'EXPIRING': return <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold">À RENOUVELLER</span>;
      case 'EXPIRED': return <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-[10px] font-bold">EXPIRÉ</span>;
      case 'ARCHIVED': return <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">ARCHIVÉ</span>;
      default: return null;
    }
  };

  const filteredDocs = assistantDocuments.filter((d: AssistantDocument) => {
    const matchSearch = d.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-sm border border-slate-200">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Gestion Documentaire & Échéances</h2>
          <p className="text-sm text-slate-500">Centralisation, traçabilité et alertes d'expiration</p>
        </div>
        <div className="flex items-center gap-3">
          <input 
            type="text" 
            placeholder="Rechercher un document..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border border-slate-200 p-2 rounded-sm text-sm w-64"
          />
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-200 p-2 rounded-sm text-sm"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="VALID">Valide</option>
            <option value="EXPIRING">À Renouveler</option>
            <option value="EXPIRED">Expiré</option>
            <option value="ARCHIVED">Archivé</option>
          </select>
          <button onClick={() => { setFormData({ title: '', category: 'ADMINISTRATIF', url: '', isConfidential: false, status: 'VALID', expirationDate: '' }); setEditingId(null); setShowForm(!showForm); }} className="bg-purple-600 text-white px-4 py-2 rounded-sm text-sm font-semibold hover:bg-purple-700 flex items-center gap-2">
            <Plus size={16} /> Nouveau Document
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white p-4 rounded-sm border border-slate-200 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input type="text" placeholder="Titre du document" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="col-span-2 border p-2 rounded-sm text-sm" />
            <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as any})} className="border p-2 rounded-sm text-sm">
              <option value="ADMINISTRATIF">Administratif</option>
              <option value="CONTRAT">Contrat</option>
              <option value="ASSURANCE">Assurance</option>
              <option value="LEGAL">Légal</option>
              <option value="AUTRE">Autre</option>
            </select>
            <input type="date" value={formData.expirationDate || ''} onChange={e => setFormData({...formData, expirationDate: e.target.value})} className="border p-2 rounded-sm text-sm" title="Date d'expiration (optionnel)" />
            <input type="url" placeholder="URL du document (Drive, SharePoint...)" value={formData.url || ''} onChange={e => setFormData({...formData, url: e.target.value})} className="col-span-2 border p-2 rounded-sm text-sm" />
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" id="confid" checked={formData.isConfidential} onChange={e => setFormData({...formData, isConfidential: e.target.checked})} className="rounded text-purple-600" />
              <label htmlFor="confid" className="text-sm text-slate-700 font-medium flex items-center gap-1">
                <ShieldAlert size={14} className="text-rose-500" /> Marquer comme Strictement Confidentiel (Accès Dirigeant/Assistante uniquement)
              </label>
            </div>
            <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="border p-2 rounded-sm text-sm col-span-2">
              <option value="VALID">Valide</option>
              <option value="EXPIRING">À renouveler (bientôt expiré)</option>
              <option value="EXPIRED">Expiré</option>
              <option value="ARCHIVED">Archivé</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Annuler</button>
            <button onClick={handleSave} className="px-4 py-2 bg-purple-600 text-white text-sm rounded-sm font-semibold">Enregistrer</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
            <tr>
              <th className="p-3 font-semibold">Document</th>
              <th className="p-3 font-semibold">Catégorie</th>
              <th className="p-3 font-semibold">Statut</th>
              <th className="p-3 font-semibold">Échéance</th>
              <th className="p-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredDocs.map((doc: AssistantDocument) => (
              <tr key={doc.id} className="hover:bg-slate-50 transition-colors group">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-purple-500" />
                    <span className="font-semibold text-slate-800">{doc.title}</span>
                    {doc.isConfidential && <ShieldAlert size={14} className="text-rose-500" title="Confidentiel" />}
                  </div>
                </td>
                <td className="p-3 text-slate-500">{doc.category}</td>
                <td className="p-3">{getStatusBadge(doc)}</td>
                <td className="p-3 text-slate-500">{doc.expirationDate ? new Date(doc.expirationDate).toLocaleDateString('fr-FR') : '-'}</td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {doc.url && (
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-1 text-slate-400 hover:text-blue-600" title="Ouvrir le fichier">
                        <Download size={16} />
                      </a>
                    )}
                    {doc.status !== 'ARCHIVED' && (
                      <button onClick={() => crudUpdateItem('assistantDocuments', doc.id, { status: 'ARCHIVED' }, 'Archivage')} className="p-1 text-slate-400 hover:text-amber-600" title="Archiver">
                        <Archive size={16} />
                      </button>
                    )}
                    <button onClick={() => { setFormData(doc); setEditingId(doc.id); setShowForm(true); }} className="p-1 text-slate-400 hover:text-purple-600"><Edit2 size={16}/></button>
                    <button onClick={() => crudDeleteItem('assistantDocuments', doc.id, 'Suppression')} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 size={16}/></button>
                  </div>
                </td>
              </tr>
            ))}
            {assistantDocuments.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-400">Aucun document administratif enregistré.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
