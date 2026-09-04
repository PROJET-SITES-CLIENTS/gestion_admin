import React, { useState, useMemo } from 'react';
import { useApp } from '../../store';
import { Package, ShoppingCart, ArrowLeftRight, Plus, Trash2, CheckCircle2, Send } from 'lucide-react';
import { Card, PageHeader, SectionTitle, Badge, EmptyState, Modal } from '../../components/ui';
import { BtpBonCommandeLigne } from '../../types';

type Tab = 'STOCK' | 'BC' | 'MOUVEMENTS';

export const BtpMagasinView = () => {
  const {
    currentRole, btpArticles, btpBonCommandes, btpMouvements, btpChantiers,
    createBtpArticle, createBtpBonCommande, soumettreBtpBonCommande, recevoirBtpBonCommande,
    createBtpMouvement, btpFournisseurs, createBtpFournisseur,
  } = useApp();

  const [tab, setTab] = useState<Tab>('STOCK');
  const [showFournisseur, setShowFournisseur] = useState(false);
  const [newFournisseur, setNewFournisseur] = useState({ nom: '', telephone: '', specialite: '' });
  const canManage = ['RESP_MATERIEL', 'MAGASINIER_BTP', 'GERANT'].includes(currentRole || '');
  const canBC = canManage || ['COND_TRAVAUX', 'CHEF_CHANTIER'].includes(currentRole || '');

  // ---- Stock dérivé des mouvements : dépôt + par chantier ----
  const stock = useMemo(() => {
    const map = new Map<string, { depot: number; chantiers: Map<string, number> }>();
    const key = (id: string) => { if (!map.has(id)) map.set(id, { depot: 0, chantiers: new Map() }); return map.get(id)!; };
    for (const m of btpMouvements) {
      const entry = key(m.article_id);
      if (m.type === 'entree') {
        entry.depot += m.quantite;
      } else if (m.type === 'sortie_chantier') {
        entry.depot -= m.quantite;
        const cid = m.chantier_id || '';
        if (cid) entry.chantiers.set(cid, (entry.chantiers.get(cid) ?? 0) + m.quantite);
      } else if (m.type === 'retour') {
        const cid = m.chantier_id || '';
        if (cid) entry.chantiers.set(cid, (entry.chantiers.get(cid) ?? 0) - m.quantite);
        entry.depot += m.quantite;
      }
    }
    return map;
  }, [btpMouvements]);

  const articleName = (id: string) => btpArticles.find(a => a.id === id)?.designation ?? id;
  const chantierName = (id: string) => btpChantiers.find(c => c.id === id)?.nom ?? id;
  const fmt = (n: number) => n.toLocaleString('fr-FR');

  // ---- Formulaires ----
  const [showArticle, setShowArticle] = useState(false);
  const [newArticle, setNewArticle] = useState({ reference: '', designation: '', unite: 'u', pu: 0, seuil_alerte: 0 });

  const [showBC, setShowBC] = useState(false);
  const [newBC, setNewBC] = useState({ chantier_id: '', fournisseur: '', date_souhaitee: '' });
  const [bcLignes, setBcLignes] = useState<BtpBonCommandeLigne[]>([]);
  const [bcPick, setBcPick] = useState('');

  const [showMvt, setShowMvt] = useState(false);
  const [newMvt, setNewMvt] = useState({ article_id: '', type: 'sortie_chantier' as 'entree' | 'sortie_chantier' | 'retour', quantite: 0, chantier_id: '', motif: '', cout_unitaire: 0 });

  const bcTotal = bcLignes.reduce((a, l) => a + l.quantite * l.pu, 0);

  const handleCreateArticle = async () => {
    if (!newArticle.designation.trim()) return;
    await createBtpArticle(newArticle);
    setNewArticle({ reference: '', designation: '', unite: 'u', pu: 0, seuil_alerte: 0 });
    setShowArticle(false);
  };

  const handleCreateBC = async () => {
    if (!newBC.fournisseur.trim() || !newBC.chantier_id || bcLignes.length === 0) return;
    await createBtpBonCommande({ ...newBC, lignes: bcLignes, total_ht: bcTotal });
    setNewBC({ chantier_id: '', fournisseur: '', date_souhaitee: '' });
    setBcLignes([]);
    setShowBC(false);
  };

  const handleCreateMvt = async () => {
    if (!newMvt.article_id || newMvt.quantite <= 0) return;
    if (newMvt.type !== 'entree' && !newMvt.chantier_id) return;
    // Valorisation auto depuis le PU catalogue (éditable) pour l'imputation chantier.
    const art = btpArticles.find(a => a.id === newMvt.article_id);
    await createBtpMouvement({
      ...newMvt,
      cout_unitaire: newMvt.type === 'sortie_chantier' ? (newMvt.cout_unitaire || art?.pu || 0) : undefined,
      chantier_id: newMvt.type === 'entree' ? '' : newMvt.chantier_id,
    } as any);
    setNewMvt({ article_id: '', type: 'sortie_chantier', quantite: 0, chantier_id: '', motif: '', cout_unitaire: 0 });
    setShowMvt(false);
  };

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'STOCK', label: 'Stock', icon: <Package size={15} /> },
    { id: 'BC', label: `Bons de commande (${btpBonCommandes.filter(b => b.statut === 'soumis').length} à réceptionner)`, icon: <ShoppingCart size={15} /> },
    { id: 'MOUVEMENTS', label: 'Mouvements', icon: <ArrowLeftRight size={15} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        accent="Le magasin"
        title="& les approvisionnements"
        subtitle="Catalogue, stock dépôt/chantier, bons de commande — la réception crée automatiquement la dépense comptable."
        actions={canManage && (
          <>
            <button onClick={() => setShowFournisseur(true)} className="btn btn-ghost"><Plus size={14} /> Fournisseur</button>
            <button onClick={() => setShowMvt(true)} className="btn btn-ghost"><ArrowLeftRight size={14} /> Mouvement</button>
            <button onClick={() => setShowArticle(true)} className="btn btn-ghost"><Plus size={14} /> Article</button>
          </>
        )}
      />

      {/* Onglets */}
      <div className="flex items-center gap-1 bg-slate-100/80 border border-slate-200/70 rounded-lg p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-[12.5px] font-semibold transition-all ${tab === t.id ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-500 hover:text-slate-800'}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ==================== STOCK ==================== */}
      {tab === 'STOCK' && (
        <Card>
          {btpArticles.length === 0 ? (
            <EmptyState icon={<Package size={20} />} title="Catalogue vide" hint="Créez vos articles (ciment, ferraille, agglo…) pour suivre les stocks." />
          ) : (
            <div className="overflow-x-auto">
              <table className="table-premium w-full min-w-[680px]">
                <thead>
                  <tr>
                    <th>Référence</th><th>Désignation</th><th>PU</th>
                    <th className="text-right">Stock dépôt</th><th>Chantiers</th><th>Alerte</th>
                  </tr>
                </thead>
                <tbody>
                  {btpArticles.map(a => {
                    const st = stock.get(a.id);
                    const depot = st?.depot ?? 0;
                    const chantiers = Array.from(st?.chantiers.entries() ?? []).filter(([, q]) => q > 0);
                    const low = a.seuil_alerte ? depot <= a.seuil_alerte : false;
                    return (
                      <tr key={a.id}>
                        <td className="font-mono text-[11.5px] text-slate-500">{a.reference || '—'}</td>
                        <td className="font-semibold text-slate-800">{a.designation}</td>
                        <td className="font-mono text-[12px]">{fmt(a.pu)} <span className="text-slate-400 font-sans text-[10px]">GNF/{a.unite}</span></td>
                        <td className={`text-right font-mono font-bold ${low ? 'text-rose-600' : 'text-slate-800'}`}>{depot.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} <span className="text-slate-400 font-sans text-[10px]">{a.unite}</span></td>
                        <td>
                          {chantiers.length === 0 ? <span className="text-slate-300 text-xs">—</span> : (
                            <div className="flex flex-wrap gap-1">
                              {chantiers.map(([cid, q]) => (
                                <Badge key={cid} tone="blue">{chantierName(cid)} : {q}</Badge>
                              ))}
                            </div>
                          )}
                        </td>
                        <td>{low ? <Badge tone="rose">seuil atteint</Badge> : <span className="text-slate-300 text-xs">—</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ==================== BONS DE COMMANDE ==================== */}
      {tab === 'BC' && (
        <div className="space-y-4">
          {canBC && (
            <div className="flex justify-end">
              <button onClick={() => setShowBC(true)} className="btn btn-primary"><Plus size={14} /> Nouveau bon de commande</button>
            </div>
          )}
          {btpBonCommandes.length === 0 ? (
            <Card><EmptyState icon={<ShoppingCart size={20} />} title="Aucun bon de commande" hint="Les demandes d'approvisionnement des chantiers apparaîtront ici." /></Card>
          ) : [...btpBonCommandes].reverse().map(bc => (
            <Card key={bc.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-[11px] text-slate-400">BC-{bc.id.slice(0, 8)}</span>
                    <Badge tone={bc.statut === 'reçu' ? 'emerald' : bc.statut === 'soumis' ? 'amber' : bc.statut === 'annulé' ? 'rose' : 'neutral'}>{bc.statut}</Badge>
                  </div>
                  <p className="text-[14px] font-bold text-slate-900 mt-1">{bc.fournisseur}</p>
                  <p className="text-[12px] text-slate-500">{chantierName(bc.chantier_id)}{bc.date_reception ? ` · réceptionné le ${new Date(bc.date_reception).toLocaleDateString('fr-FR')}` : ''}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-[15px] text-slate-900">{fmt(bc.total_ht)} <span className="text-[10px] font-sans text-slate-400">GNF HT</span></p>
                  {bc.statut === 'brouillon' && canBC && (
                    <button onClick={() => soumettreBtpBonCommande(bc.id)} className="btn btn-dark !py-1.5 !px-3 !text-[11px] mt-2"><Send size={12} /> Soumettre</button>
                  )}
                  {bc.statut === 'soumis' && canManage && (
                    <button onClick={() => recevoirBtpBonCommande(bc.id)} className="btn btn-primary !py-1.5 !px-3 !text-[11px] mt-2"><CheckCircle2 size={12} /> Réceptionner</button>
                  )}
                </div>
              </div>
              <div className="rounded-lg border border-slate-100 overflow-hidden">
                <table className="table-premium w-full">
                  <thead><tr><th>Article</th><th className="text-right">Qté</th><th className="text-right">PU</th><th className="text-right">Total</th></tr></thead>
                  <tbody>
                    {bc.lignes.map((l, i) => (
                      <tr key={i}>
                        <td className="!py-2">{l.designation}</td>
                        <td className="!py-2 text-right font-mono">{l.quantite}</td>
                        <td className="!py-2 text-right font-mono">{fmt(l.pu)}</td>
                        <td className="!py-2 text-right font-mono font-semibold">{fmt(l.quantite * l.pu)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {bc.statut === 'reçu' && (
                <p className="text-[11px] text-emerald-600 mt-2.5 flex items-center gap-1.5">
                  <CheckCircle2 size={12} /> Réception traitée : stock approvisionné et dépense transmise à la comptabilité (TVA 18 % incluse).
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* ==================== MOUVEMENTS ==================== */}
      {tab === 'MOUVEMENTS' && (
        <Card>
          {btpMouvements.length === 0 ? (
            <EmptyState icon={<ArrowLeftRight size={20} />} title="Aucun mouvement" hint="Sorties vers chantiers, retours au dépôt et réceptions s'enregistreront ici." />
          ) : (
            <div className="overflow-x-auto">
              <table className="table-premium w-full min-w-[620px]">
                <thead><tr><th>Date</th><th>Article</th><th>Type</th><th className="text-right">Qté</th><th>Destination / Origine</th><th>Motif</th></tr></thead>
                <tbody>
                  {[...btpMouvements].reverse().map(m => (
                    <tr key={m.id}>
                      <td className="text-[11.5px] text-slate-500 font-mono">{m.createdAt ? new Date(m.createdAt).toLocaleDateString('fr-FR') : '—'}</td>
                      <td className="font-semibold text-slate-800">{articleName(m.article_id)}</td>
                      <td>
                        <Badge tone={m.type === 'entree' ? 'emerald' : m.type === 'sortie_chantier' ? 'blue' : 'amber'}>
                          {m.type === 'entree' ? 'entrée dépôt' : m.type === 'sortie_chantier' ? 'sortie chantier' : 'retour dépôt'}
                        </Badge>
                      </td>
                      <td className="text-right font-mono font-semibold">{m.quantite.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}</td>
                      <td className="text-[12px] text-slate-600">{m.chantier_id ? chantierName(m.chantier_id) : 'Dépôt central'}</td>
                      <td className="text-[11.5px] text-slate-500 max-w-[220px] truncate">{m.motif || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ==================== MODALES ==================== */}
      <Modal open={showArticle} onClose={() => setShowArticle(false)} title="Nouvel article" subtitle="Catalogue magasin">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Référence</label><input className="input" value={newArticle.reference} onChange={e => setNewArticle({ ...newArticle, reference: e.target.value })} placeholder="CIM-50" /></div>
            <div><label className="label">Unité</label><input className="input" value={newArticle.unite} onChange={e => setNewArticle({ ...newArticle, unite: e.target.value })} placeholder="sac, u, m³…" /></div>
          </div>
          <div><label className="label">Désignation</label><input className="input" value={newArticle.designation} onChange={e => setNewArticle({ ...newArticle, designation: e.target.value })} placeholder="Ciment 50 kg" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Prix unitaire (GNF)</label><input type="number" className="input" value={newArticle.pu || ''} onChange={e => setNewArticle({ ...newArticle, pu: Number(e.target.value) })} /></div>
            <div><label className="label">Seuil d'alerte</label><input type="number" className="input" value={newArticle.seuil_alerte || ''} onChange={e => setNewArticle({ ...newArticle, seuil_alerte: Number(e.target.value) })} /></div>
          </div>
          <button onClick={handleCreateArticle} disabled={!newArticle.designation.trim()} className="btn btn-primary w-full">Enregistrer l'article</button>
        </div>
      </Modal>

      <Modal open={showBC} onClose={() => setShowBC(false)} title="Nouveau bon de commande" subtitle="Approvisionnement chantier" wide>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <label className="label">Chantier</label>
              <select className="input" value={newBC.chantier_id} onChange={e => setNewBC({ ...newBC, chantier_id: e.target.value })}>
                <option value="">— Choisir —</option>
                {btpChantiers.filter(c => c.statut !== 'clôturé').map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Fournisseur</label>
              <select className="input" value={newBC.fournisseur} onChange={e => setNewBC({ ...newBC, fournisseur: e.target.value })}>
                <option value="">— Choisir / saisir —</option>
                {btpFournisseurs.map(f => <option key={f.id} value={f.nom}>{f.nom}{f.specialite ? ` (${f.specialite})` : ''}</option>)}
                <option value="__saisir">✏️ Saisir un nouveau nom…</option>
              </select>
              {newBC.fournisseur === '__saisir' && (
                <input className="input mt-2" placeholder="Nom du fournisseur" onChange={e => setNewBC({ ...newBC, fournisseur: e.target.value })} />
              )}
            </div>
            <div><label className="label">Date souhaitée</label><input type="date" className="input" value={newBC.date_souhaitee} onChange={e => setNewBC({ ...newBC, date_souhaitee: e.target.value })} /></div>
          </div>

          <div>
            <label className="label">Lignes de commande</label>
            <div className="flex gap-2 mb-2">
              <select className="input flex-1" value={bcPick} onChange={e => setBcPick(e.target.value)}>
                <option value="">Ajouter un article du catalogue…</option>
                {btpArticles.map(a => <option key={a.id} value={a.id}>{a.designation} ({fmt(a.pu)} GNF/{a.unite})</option>)}
              </select>
              <button
                type="button"
                onClick={() => {
                  const art = btpArticles.find(a => a.id === bcPick);
                  if (!art) return;
                  setBcLignes(prev => [...prev, { article_id: art.id, designation: art.designation, quantite: 1, pu: art.pu }]);
                  setBcPick('');
                }}
                disabled={!bcPick}
                className="btn btn-ghost shrink-0"
              ><Plus size={14} /></button>
            </div>
            {bcLignes.length > 0 && (
              <div className="rounded-lg border border-slate-100 overflow-hidden">
                <table className="table-premium w-full">
                  <thead><tr><th>Article</th><th className="text-right">Qté</th><th className="text-right">PU</th><th className="text-right">Total</th><th></th></tr></thead>
                  <tbody>
                    {bcLignes.map((l, i) => (
                      <tr key={i}>
                        <td className="!py-2">{l.designation}</td>
                        <td className="!py-2 text-right"><input type="number" min={0} className="input !py-1 !px-2 !w-20 text-right" value={l.quantite} onChange={e => setBcLignes(prev => prev.map((x, j) => j === i ? { ...x, quantite: Number(e.target.value) } : x))} /></td>
                        <td className="!py-2 text-right"><input type="number" min={0} className="input !py-1 !px-2 !w-28 text-right" value={l.pu} onChange={e => setBcLignes(prev => prev.map((x, j) => j === i ? { ...x, pu: Number(e.target.value) } : x))} /></td>
                        <td className="!py-2 text-right font-mono font-semibold">{fmt(l.quantite * l.pu)}</td>
                        <td className="!py-2 text-right"><button onClick={() => setBcLignes(prev => prev.filter((_, j) => j !== i))} className="text-slate-300 hover:text-rose-500"><Trash2 size={14} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-right text-[13px] font-mono font-bold text-slate-800 mt-2">Total HT : {fmt(bcTotal)} GNF</p>
          </div>

          <button onClick={handleCreateBC} disabled={!newBC.fournisseur.trim() || !newBC.chantier_id || bcLignes.length === 0} className="btn btn-primary w-full">Créer le bon de commande (brouillon)</button>
        </div>
      </Modal>

      <Modal open={showFournisseur} onClose={() => setShowFournisseur(false)} title="Nouveau fournisseur" subtitle="Répertoire des fournisseurs BTP">
        <div className="space-y-3">
          <div><label className="label">Nom</label><input className="input" value={newFournisseur.nom} onChange={e => setNewFournisseur({ ...newFournisseur, nom: e.target.value })} placeholder="SOGUIPRA…" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Téléphone</label><input className="input" value={newFournisseur.telephone} onChange={e => setNewFournisseur({ ...newFournisseur, telephone: e.target.value })} /></div>
            <div><label className="label">Spécialité</label><input className="input" value={newFournisseur.specialite} onChange={e => setNewFournisseur({ ...newFournisseur, specialite: e.target.value })} placeholder="Ciment, ferraillage…" /></div>
          </div>
          <button
            onClick={async () => {
              if (!newFournisseur.nom.trim()) return;
              await createBtpFournisseur(newFournisseur);
              setNewFournisseur({ nom: '', telephone: '', specialite: '' });
              setShowFournisseur(false);
            }}
            disabled={!newFournisseur.nom.trim()}
            className="btn btn-primary w-full"
          >Enregistrer</button>
        </div>
      </Modal>

      <Modal open={showMvt} onClose={() => setShowMvt(false)} title="Nouveau mouvement de stock" subtitle="Sortie vers un chantier ou retour au dépôt">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Type</label>
              <select className="input" value={newMvt.type} onChange={e => setNewMvt({ ...newMvt, type: e.target.value as typeof newMvt.type })}>
                <option value="sortie_chantier">Sortie → chantier</option>
                <option value="retour">Retour → dépôt</option>
                <option value="entree">Entrée manuelle dépôt</option>
              </select>
            </div>
            <div>
              <label className="label">Article</label>
              <select className="input" value={newMvt.article_id} onChange={e => setNewMvt({ ...newMvt, article_id: e.target.value })}>
                <option value="">— Choisir —</option>
                {btpArticles.map(a => <option key={a.id} value={a.id}>{a.designation}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Quantité</label><input type="number" min={0} className="input" value={newMvt.quantite || ''} onChange={e => setNewMvt({ ...newMvt, quantite: Number(e.target.value) })} /></div>
            {newMvt.type !== 'entree' && (
              <div>
                <label className="label">Chantier</label>
                <select className="input" value={newMvt.chantier_id} onChange={e => setNewMvt({ ...newMvt, chantier_id: e.target.value })}>
                  <option value="">— Choisir —</option>
                  {btpChantiers.filter(c => c.statut === 'en_cours').map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </div>
            )}
          </div>
          {newMvt.type === 'sortie_chantier' && (
            <div>
              <label className="label">Valorisation unitaire (imputation chantier, GNF)</label>
              <input
                type="number" min={0} className="input"
                placeholder={String(btpArticles.find(a => a.id === newMvt.article_id)?.pu ?? 0)}
                value={newMvt.cout_unitaire || ''}
                onChange={e => setNewMvt({ ...newMvt, cout_unitaire: Number(e.target.value) })}
              />
              <p className="text-[10.5px] text-slate-400 mt-1">Vide = prix catalogue. × quantité imputé au P&L du chantier.</p>
            </div>
          )}
          <div><label className="label">Motif</label><input className="input" value={newMvt.motif} onChange={e => setNewMvt({ ...newMvt, motif: e.target.value })} placeholder="Dalle R+2, fondations…" /></div>
          <button onClick={handleCreateMvt} disabled={!newMvt.article_id || newMvt.quantite <= 0 || (newMvt.type !== 'entree' && !newMvt.chantier_id)} className="btn btn-primary w-full">Enregistrer le mouvement</button>
        </div>
      </Modal>
    </div>
  );
};
