import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../store';
import { Send, Paperclip, Check, CheckCheck, UserCircle, Users, Briefcase, FileText } from 'lucide-react';
import { Role } from '../types';

export default function InternalMessenger() {
  const { currentUser, internalMessages, sendMessage, markAsRead } = useApp();
  const [selectedChannel, setSelectedChannel] = useState<Role | 'ALL'>('ALL');
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Channels to select from
  const channels: { id: Role | 'ALL', label: string, icon: React.ReactNode }[] = [
    { id: 'ALL', label: 'Général', icon: <Users size={16} /> },
    { id: 'GERANT', label: 'Direction', icon: <Briefcase size={16} /> },
    { id: 'COMMERCIAL', label: 'Service Commercial', icon: <Users size={16} /> },
    { id: 'COMPTABLE', label: 'Comptabilité', icon: <FileText size={16} /> },
    { id: 'RH', label: 'Ressources Humaines', icon: <UserCircle size={16} /> },
    { id: 'ASSISTANTE', label: 'Assistante', icon: <Briefcase size={16} /> },
  ];

  // Filter messages based on channel
  const filteredMessages = (internalMessages || []).filter(msg => {
    if (selectedChannel === 'ALL') {
      return msg.receiverRole === 'ALL';
    }
    return (
      (msg.receiverRole === selectedChannel && msg.senderId === currentUser?.id) ||
      (msg.receiverRole === currentUser?.role && msg.senderRole === selectedChannel) ||
      (msg.receiverRole === selectedChannel && msg.senderRole === currentUser?.role) ||
      (msg.receiverRole === selectedChannel && currentUser?.role === selectedChannel)
    );
  }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Mark as read when opening a channel
  useEffect(() => {
    filteredMessages.forEach(msg => {
      if (!msg.isRead && msg.senderId !== currentUser?.id) {
        markAsRead(msg.id);
      }
    });
    // Scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [filteredMessages, currentUser?.id, markAsRead]);

  const handleSend = () => {
    if (!messageText.trim()) return;
    sendMessage(selectedChannel, messageText);
    setMessageText('');
  };

  return (
    <div className="flex h-[calc(100vh-80px)] lg:h-[800px] bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
      {/* Sidebar Channels */}
      <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0 hidden md:flex">
        <div className="p-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">Messagerie Interne</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {channels.map(channel => {
            // Count unread for this channel
            const unreadCount = (internalMessages || []).filter(m => 
              !m.isRead && 
              m.senderId !== currentUser?.id && 
              ((channel.id === 'ALL' && m.receiverRole === 'ALL') || 
               (channel.id !== 'ALL' && m.senderRole === channel.id && m.receiverRole === currentUser?.role))
            ).length;

            return (
              <button
                key={channel.id}
                onClick={() => setSelectedChannel(channel.id)}
                className={`w-full flex items-center justify-between p-3 rounded-sm transition-colors ${selectedChannel === channel.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-200'}`}
              >
                <div className="flex items-center gap-3">
                  {channel.icon}
                  <span className="text-sm">{channel.label}</span>
                </div>
                {unreadCount > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 relative">
        <div className="p-4 border-b border-slate-200 bg-white flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
            {channels.find(c => c.id === selectedChannel)?.icon}
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">{channels.find(c => c.id === selectedChannel)?.label}</h3>
            <p className="text-xs text-slate-500">
              {selectedChannel === 'ALL' ? 'Discussion générale de l\'entreprise' : `Canal sécurisé avec ${channels.find(c => c.id === selectedChannel)?.label}`}
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
                    
                    {msg.attachment && (
                      <div className={`mt-2 p-2 rounded flex items-center gap-2 text-xs ${isMine ? 'bg-indigo-700/50' : 'bg-slate-100'}`}>
                        <Paperclip size={14} />
                        <span className="font-semibold truncate flex-1">{msg.attachment.name}</span>
                        <button className="px-2 py-1 bg-white text-indigo-600 rounded shadow-sm font-semibold hover:bg-slate-50 transition-colors">
                          Ouvrir
                        </button>
                      </div>
                    )}
                    
                    <div className={`text-[10px] text-right mt-1.5 flex justify-end items-center gap-1 ${isMine ? 'text-indigo-200' : 'text-slate-400'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {isMine && (
                        msg.isRead ? <CheckCheck size={12} className="text-indigo-200" /> : <Check size={12} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white border-t border-slate-200 flex items-end gap-2 shrink-0">
          <button className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-sm transition-colors" title="Joindre un fichier (Devis, Facture, etc.)">
            <Paperclip size={20} />
          </button>
          <div className="flex-1 bg-slate-50 border border-slate-200 rounded-sm overflow-hidden focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
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
              placeholder="Écrivez votre message... (Entrée pour envoyer)"
              className="w-full bg-transparent border-0 p-3 text-sm focus:ring-0 resize-none max-h-32"
              style={{ minHeight: '44px' }}
            />
          </div>
          <button 
            onClick={handleSend}
            disabled={!messageText.trim()}
            className="p-3 bg-indigo-600 text-white rounded-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
