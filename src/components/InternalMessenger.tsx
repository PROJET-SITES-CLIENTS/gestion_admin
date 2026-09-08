import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../store';
import { Send, Paperclip, Check, CheckCheck, UserCircle, Users, Briefcase, FileText, Menu } from 'lucide-react';
import { Role } from '../types';
import { openSecureFile } from '../utils/secureFile';

export default function InternalMessenger() {
  const { currentUser, currentRole, internalMessages, sendMessage, markAsRead, pushToast } = useApp();
  const [selectedChannel, setSelectedChannel] = useState<Role | 'ALL'>('ALL');
  const [messageText, setMessageText] = useState('');
  const [pendingFile, setPendingFile] = useState<{ name: string; url: string } | null>(null);
  const [mobileChannelsOpen, setMobileChannelsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const markedRef = useRef<Set<string>>(new Set());

  const channels: { id: Role | 'ALL', label: string, icon: React.ReactNode }[] = [
    { id: 'ALL', label: 'Général', icon: <Users size={16} /> },
    { id: 'GERANT', label: 'Direction', icon: <Briefcase size={16} /> },
    { id: 'COMMERCIAL', label: 'Service Commercial', icon: <Users size={16} /> },
    { id: 'COMPTABLE', label: 'Comptabilité', icon: <FileText size={16} /> },
    { id: 'RH', label: 'Ressources Humaines', icon: <UserCircle size={16} /> },
    { id: 'ASSISTANTE', label: 'Assistante', icon: <Briefcase size={16} /> },
  ];

  // Messages du canal courant (mémoïsé pour éviter les effets en boucle)
  // M5 : le filtrage suit le rôle AFFICHÉ (currentRole) — cohérent en Mode
  // Souverain, où l'expéditeur reste signé de son identité JWT réelle.
  const effectiveRole = currentRole || currentUser?.role;
  const filteredMessages = useMemo(() => {
    return (internalMessages || []).filter(msg => {
      if (selectedChannel === 'ALL') {
        return msg.receiverRole === 'ALL';
      }
      return (
        (msg.receiverRole === selectedChannel && msg.senderId === currentUser?.id) ||
        (msg.receiverRole === effectiveRole && msg.senderRole === selectedChannel) ||
        (msg.receiverRole === selectedChannel && msg.senderRole === effectiveRole) ||
        (msg.receiverRole === selectedChannel && effectiveRole === selectedChannel)
      );
    }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [internalMessages, selectedChannel, currentUser?.id, effectiveRole]);

  // Marquer comme lus UNE SEULE FOIS par message (audit : boucle de re-render)
  useEffect(() => {
    for (const msg of filteredMessages) {
      if (!msg.isRead && msg.senderId !== currentUser?.id && !markedRef.current.has(msg.id)) {
        markedRef.current.add(msg.id);
        markAsRead(msg.id);
      }
    }
  }, [filteredMessages, currentUser?.id, markAsRead]);

  // Scroll vers le bas quand le canal change ou qu'un message arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [filteredMessages.length, selectedChannel]);

  const handleSend = () => {
    if (!messageText.trim() && !pendingFile) return;
    sendMessage(selectedChannel, messageText || pendingFile!.name, pendingFile || undefined);
    setMessageText('');
    setPendingFile(null);
  };

  // Upload d'une pièce jointe (paperclip fonctionnel — audit : bouton factice)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
        setPendingFile({ name: file.name, url: up.url });
      } else {
        pushToast('Upload impossible.', 'ERROR');
      }
    } catch {
      pushToast('Upload impossible (fichier trop volumineux ?).', 'ERROR');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const currentChannel = channels.find(c => c.id === selectedChannel);

  return (
    <div className="flex h-[calc(100vh-120px)] lg:h-[800px] card overflow-hidden !p-0">
      {/* Sidebar Canaux — desktop + drawer mobile */}
      <div className={`w-64 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0 fixed inset-y-0 left-0 z-40 md:static md:z-auto transition-transform duration-300 ${mobileChannelsOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Canaux</h2>
          <button onClick={() => setMobileChannelsOpen(false)} className="md:hidden text-slate-400 hover:text-slate-700" aria-label="Fermer les canaux">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {channels.map(channel => {
            const unreadCount = (internalMessages || []).filter(m =>
              !m.isRead && m.senderId !== currentUser?.id &&
              ((channel.id === 'ALL' && m.receiverRole === 'ALL') ||
               (channel.id !== 'ALL' && m.senderRole === channel.id && m.receiverRole === currentUser?.role))
            ).length;
            return (
              <button
                key={channel.id}
                onClick={() => { setSelectedChannel(channel.id); setMobileChannelsOpen(false); }}
                className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${selectedChannel === channel.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-200'}`}
              >
                <div className="flex items-center gap-3">
                  {channel.icon}
                  <span className="text-sm">{channel.label}</span>
                </div>
                {unreadCount > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Overlay mobile */}
      {mobileChannelsOpen && (
        <div className="fixed inset-0 z-30 bg-slate-950/50 md:hidden" onClick={() => setMobileChannelsOpen(false)} />
      )}

      {/* Zone de chat */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 relative">
        <div className="p-4 border-b border-slate-200 bg-white flex items-center gap-3 shrink-0">
          <button onClick={() => setMobileChannelsOpen(true)} className="md:hidden h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500" aria-label="Changer de canal">
            <Menu size={16} />
          </button>
          <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
            {currentChannel?.icon}
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">{currentChannel?.label}</h3>
            <p className="text-xs text-slate-500">
              {selectedChannel === 'ALL' ? 'Discussion générale de l\'entreprise' : `Canal sécurisé avec ${currentChannel?.label}`}
            </p>
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {filteredMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <UserCircle size={48} className="opacity-20 mb-4" />
              <p>Aucun message dans ce canal pour l'instant.</p>
              <p className="text-sm">Envoyez un message pour démarrer la discussion.</p>
            </div>
          ) : (
            filteredMessages.map(msg => {
              const isMine = msg.senderId === currentUser?.id;
              return (
                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] ${isMine ? 'bg-indigo-600 text-white rounded-l-lg rounded-tr-lg' : 'bg-white border border-slate-200 text-slate-800 rounded-r-lg rounded-tl-lg'} p-3 shadow-sm`}>
                    {!isMine && (
                      <div className="text-[10px] font-bold text-indigo-600 mb-1 flex items-center gap-1">
                        {msg.senderName} ({msg.senderRole})
                      </div>
                    )}
                    <div className="text-sm whitespace-pre-wrap">{msg.content}</div>

                    {msg.attachment?.url && (
                      <button
                        onClick={() => openSecureFile(msg.attachment!.url!)}
                        className={`mt-2 p-2 rounded flex items-center gap-2 text-xs w-full ${isMine ? 'bg-indigo-700/50 hover:bg-indigo-700/70' : 'bg-slate-100 hover:bg-slate-200'} transition-colors`}
                      >
                        <Paperclip size={14} />
                        <span className="font-semibold truncate flex-1 text-left">{msg.attachment.name}</span>
                        <span className="px-2 py-1 bg-white text-indigo-600 rounded font-semibold">Ouvrir</span>
                      </button>
                    )}

                    <div className={`text-[10px] text-right mt-1.5 flex justify-end items-center gap-1 ${isMine ? 'text-indigo-200' : 'text-slate-400'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      {isMine && (msg.isRead ? <CheckCheck size={12} className="text-indigo-200" /> : <Check size={12} />)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Saisie */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-end gap-2 shrink-0">
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.zip,.txt" />
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`p-3 rounded-lg transition-colors ${pendingFile ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
            title="Joindre un fichier"
            aria-label="Joindre un fichier"
          >
            <Paperclip size={20} />
          </button>
          {pendingFile && (
            <span className="flex items-center gap-1.5 text-[11.5px] bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg px-2.5 py-1.5 max-w-[180px]">
              <Paperclip size={11} className="shrink-0" />
              <span className="truncate">{pendingFile.name}</span>
              <button onClick={() => setPendingFile(null)} className="text-indigo-400 hover:text-rose-500 shrink-0" aria-label="Retirer la pièce jointe">✕</button>
            </span>
          )}
          <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg overflow-hidden focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
            <textarea
              rows={1}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Écrivez votre message… (Entrée pour envoyer)"
              className="w-full bg-transparent border-0 p-3 text-sm focus:ring-0 resize-none max-h-32"
              style={{ minHeight: '44px' }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!messageText.trim() && !pendingFile}
            className="btn btn-primary !p-3"
            aria-label="Envoyer"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
