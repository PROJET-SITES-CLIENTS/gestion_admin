import React, { useState } from 'react';
import { useApp } from '../../store';
import { Wand2, Download, Copy, Check, Save, FileText } from 'lucide-react';

export default function AssistantAria() {
  const { crudCreateItem } = useApp();
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatedDoc, setGeneratedDoc] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSaveGed = async () => {
    if (!generatedDoc.trim()) return;
    const title = prompt('Titre du document à sauvegarder dans la GED :', 'Document IA - ' + new Date().toLocaleDateString('fr-FR'));
    if (title) {
      await crudCreateItem('assistantDocuments', {
        title,
        category: 'ADMINISTRATIF',
        isConfidential: false,
        status: 'VALID',
        url: '' // Dans un cas réel, on uploaderait le contenu généré en PDF vers un storage, et on récupérerait l'URL.
      }, 'Sauvegarde GED');
      alert('Document sauvegardé dans la GED !');
    }
  };

  const handleGenerateDocument = () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    // Simulation du temps de génération de l'IA
    setTimeout(() => {
      setGeneratedDoc(`[EN-TÊTE DE L'ENTREPRISE]\n\nObjet : ${aiPrompt}\n\nMadame, Monsieur,\n\nSuite à votre demande concernant "${aiPrompt}", nous vous prions de bien vouloir trouver ci-joint les documents nécessaires ainsi que les informations demandées.\n\nNous restons à votre entière disposition pour tout complément d'information ou pour organiser une rencontre si vous le jugez utile.\n\nDans l'attente de votre retour, veuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.\n\nLa Direction.`);
      setIsGenerating(false);
    }, 1500);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedDoc);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0">
      {/* Left: Chat AI */}
      <div className="w-full lg:w-1/3 bg-white border border-slate-200 rounded-sm flex flex-col h-[500px] lg:h-full shrink-0">
        <div className="p-4 border-b border-slate-200 bg-purple-50/50 flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-100 rounded-sm flex items-center justify-center text-purple-600">
            <Wand2 size={18} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Agent ARIA</h3>
            <p className="text-xs text-slate-500">Assistant de rédaction</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-purple-100 rounded-sm flex items-center justify-center shrink-0">
              <Wand2 size={16} className="text-purple-600" />
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-sm rounded-tl-none text-sm text-slate-700">
              Bonjour ! Je suis ARIA, votre assistante IA. Je peux vous aider à rédiger vos correspondances professionnelles. Quel document souhaitez-vous créer aujourd'hui ? (ex: Convocation AG, Lettre de mise en demeure, Réponse à une réclamation...)
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Ex: Rédige une lettre d'invitation pour le séminaire annuel..."
            className="w-full border border-slate-200 rounded-sm p-3 text-sm resize-none h-24 mb-3 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleGenerateDocument();
              }
            }}
          />
          <button
            onClick={handleGenerateDocument}
            disabled={isGenerating || !aiPrompt.trim()}
            className="w-full py-2 bg-purple-600 text-white rounded-sm text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Génération...</span>
            ) : (
              <><Wand2 size={16} /> Générer le document</>
            )}
          </button>
        </div>
      </div>

      {/* Right: Preview / Editeur */}
      <div className="flex-1 bg-white border border-slate-200 rounded-sm flex flex-col h-[500px] lg:h-full">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="font-semibold text-slate-800 text-sm">Résultat</h3>
          <div className="flex gap-2">
            <button onClick={handleCopy} disabled={!generatedDoc} className="p-2 text-slate-600 hover:bg-slate-200 rounded-sm disabled:opacity-50 transition-colors" title="Copier">
              {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
            </button>
            <button onClick={handleSaveGed} disabled={!generatedDoc} className="p-2 text-slate-600 hover:bg-slate-200 rounded-sm disabled:opacity-50 transition-colors" title="Sauvegarder dans GED">
              <Save size={16} />
            </button>
          </div>
        </div>
        <div className="flex-1 p-6 overflow-y-auto bg-slate-100/50">
          {generatedDoc ? (
            <textarea
              className="w-full h-full min-h-[400px] p-8 border border-slate-200 rounded-sm shadow-sm bg-white text-sm resize-none focus:outline-none"
              value={generatedDoc}
              onChange={(e) => setGeneratedDoc(e.target.value)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
              <FileText size={48} className="text-slate-200" />
              <p className="text-sm">Le document généré s'affichera ici.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
