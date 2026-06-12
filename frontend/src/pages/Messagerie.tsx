import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare, Pin, Trash2, Send, AlertTriangle, Info, ClipboardList,
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import { messagesApi } from '../lib/api';
import { ROLE_LABELS } from '../types';
import type { Message, TypeMessage } from '../types';

const TYPE_CONFIG: Record<TypeMessage, { label: string; pill: string; border: string; icon: React.ElementType }> = {
  consigne: {
    label: 'Consigne',
    pill: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    border: 'border-l-amber-400',
    icon: ClipboardList,
  },
  information: {
    label: 'Information',
    pill: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    border: 'border-l-blue-400',
    icon: Info,
  },
  alerte: {
    label: 'Alerte',
    pill: 'bg-red-500/20 text-red-300 border border-red-500/30',
    border: 'border-l-red-400',
    icon: AlertTriangle,
  },
};

const PIN_ROLES = ['chef_exploitation', 'chef_centrale', 'directeur', 'admin'];
const DELETE_ANY_ROLES = ['admin', 'chef_exploitation'];

function dayLabel(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return "Aujourd'hui";
  if (isYesterday(d)) return 'Hier';
  return format(d, 'EEEE dd MMMM yyyy', { locale: fr });
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return `Hier ${format(d, 'HH:mm')}`;
  return format(d, 'dd/MM/yyyy HH:mm');
}

export default function Messagerie() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [contenu, setContenu] = useState('');
  const [type, setType] = useState<TypeMessage>('information');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevLenRef = useRef(0);

  useEffect(() => {
    localStorage.setItem('gtpp_messages_last_read', new Date().toISOString());
    queryClient.invalidateQueries({ queryKey: ['messages-count'] });
  }, []);

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ['messages'],
    queryFn: () => messagesApi.list(),
    refetchInterval: 10_000,
  });

  useEffect(() => {
    if (messages.length > prevLenRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: prevLenRef.current === 0 ? 'auto' : 'smooth' });
    }
    prevLenRef.current = messages.length;
    if (messages.length > 0) {
      localStorage.setItem('gtpp_messages_last_read', new Date().toISOString());
      queryClient.invalidateQueries({ queryKey: ['messages-count'] });
    }
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: (data: { contenu: string; type: TypeMessage }) => messagesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      setContenu('');
    },
  });

  const pinMutation = useMutation({
    mutationFn: (id: string) => messagesApi.toggleEpingle(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => messagesApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages'] }),
  });

  const canPin = PIN_ROLES.includes(user?.role ?? '');
  const canDeleteMsg = (auteurId: string) =>
    user?.id === auteurId || DELETE_ANY_ROLES.includes(user?.role ?? '');

  const handleSend = () => {
    if (!contenu.trim() || sendMutation.isPending) return;
    sendMutation.mutate({ contenu, type });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const pinnedMessages = messages.filter(m => m.is_epingle);
  const regularMessages = messages.filter(m => !m.is_epingle);

  // Group by calendar day
  const dayGroups: { day: string; label: string; items: Message[] }[] = [];
  regularMessages.forEach(msg => {
    const day = new Date(msg.cree_le).toDateString();
    const group = dayGroups.find(g => g.day === day);
    if (group) group.items.push(msg);
    else dayGroups.push({ day, label: dayLabel(msg.cree_le), items: [msg] });
  });

  const renderMessage = (msg: Message) => {
    const cfg = TYPE_CONFIG[msg.type];
    const TypeIcon = cfg.icon;
    const isOwn = msg.auteur_id === user?.id;

    return (
      <div key={msg.id} className={`flex gap-2.5 group ${isOwn ? 'flex-row-reverse' : ''}`}>
        {/* Avatar */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-white self-start mt-0.5">
          {msg.auteur?.prenom?.[0]}{msg.auteur?.nom?.[0]}
        </div>

        {/* Bubble */}
        <div className={`min-w-0 max-w-[78%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
          <div className={`bg-slate-800 rounded-xl px-3.5 py-2.5 border-l-[3px] ${cfg.border} w-full`}>
            {/* Header */}
            <div className={`flex items-center gap-2 mb-1 flex-wrap ${isOwn ? 'flex-row-reverse' : ''}`}>
              <span className="text-white text-xs font-semibold leading-none">
                {isOwn ? 'Moi' : `${msg.auteur?.prenom} ${msg.auteur?.nom}`}
              </span>
              {!isOwn && (
                <span className="text-slate-500 text-xs">
                  {ROLE_LABELS[msg.auteur?.role as keyof typeof ROLE_LABELS] || msg.auteur?.role}
                </span>
              )}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${cfg.pill}`}>
                <TypeIcon size={9} />
                {cfg.label}
              </span>
              {msg.is_epingle && (
                <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
                  <Pin size={9} /> Épinglé
                </span>
              )}
              <span className="text-slate-500 text-[10px] ml-auto">{timeLabel(msg.cree_le)}</span>
            </div>
            {/* Content */}
            <p className="text-slate-200 text-sm whitespace-pre-wrap break-words leading-relaxed">
              {msg.contenu}
            </p>
          </div>

          {/* Actions (show on hover) */}
          <div className={`flex items-center gap-1 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isOwn ? 'flex-row-reverse' : ''}`}>
            {canPin && (
              <button
                onClick={() => pinMutation.mutate(msg.id)}
                className={`text-[11px] flex items-center gap-0.5 px-1.5 py-0.5 rounded transition-colors ${
                  msg.is_epingle
                    ? 'text-amber-400 hover:text-amber-300'
                    : 'text-slate-500 hover:text-amber-400'
                }`}
              >
                <Pin size={10} />
                {msg.is_epingle ? 'Désépingler' : 'Épingler'}
              </button>
            )}
            {canDeleteMsg(msg.auteur_id) && (
              <button
                onClick={() => {
                  if (confirm('Supprimer ce message ?')) deleteMutation.mutate(msg.id);
                }}
                className="text-[11px] text-slate-500 hover:text-red-400 flex items-center gap-0.5 px-1.5 py-0.5 rounded transition-colors"
              >
                <Trash2 size={10} />
                Supprimer
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 flex-shrink-0 bg-slate-900 border-b border-slate-700 px-4 py-3 flex items-center gap-3">
        <MessageSquare size={18} className="text-blue-400 flex-shrink-0" />
        <div className="min-w-0">
          <h1 className="text-white font-semibold text-base leading-tight">
            Messagerie & Consignes de Conduite
          </h1>
          <p className="text-slate-400 text-xs">
            {messages.length} message{messages.length !== 1 ? 's' : ''} · actualisation auto. 10s
          </p>
        </div>
      </div>

      {/* Pinned messages */}
      {pinnedMessages.length > 0 && (
        <div className="flex-shrink-0 max-h-56 overflow-y-auto bg-amber-500/5 border-b border-amber-500/20 px-4 py-3">
          <p className="text-amber-400 text-xs font-semibold mb-2.5 flex items-center gap-1.5">
            <Pin size={11} />
            Messages épinglés ({pinnedMessages.length})
          </p>
          <div className="space-y-3">
            {pinnedMessages.map(m => renderMessage(m))}
          </div>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 px-4 py-4 pb-44">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : regularMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500">
            <MessageSquare size={48} className="mb-4 opacity-20" />
            <p className="text-sm font-medium">Aucun message</p>
            <p className="text-xs mt-1 text-slate-600">
              Rédigez la première consigne ou information ci-dessous
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {dayGroups.map(({ day, label, items }) => (
              <div key={day}>
                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-slate-800" />
                  <span className="text-slate-500 text-xs capitalize px-2">{label}</span>
                  <div className="flex-1 h-px bg-slate-800" />
                </div>
                <div className="space-y-3">
                  {items.map(m => renderMessage(m))}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area - sticky bottom */}
      <div className="sticky bottom-0 z-10 flex-shrink-0 border-t border-slate-700 bg-slate-900 px-4 py-3">
        {/* Type selector */}
        <div className="flex gap-2 mb-2">
          {(['information', 'consigne', 'alerte'] as TypeMessage[]).map(t => {
            const cfg = TYPE_CONFIG[t];
            const TypeIcon = cfg.icon;
            return (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-2.5 py-1 rounded-full text-xs flex items-center gap-1 transition-colors border ${
                  type === t ? cfg.pill : 'text-slate-500 border-slate-700 hover:border-slate-500 hover:text-slate-300'
                }`}
              >
                <TypeIcon size={10} />
                {cfg.label}
              </button>
            );
          })}
        </div>

        {/* Text input + send */}
        <div className="flex gap-2 items-end">
          <textarea
            value={contenu}
            onChange={e => setContenu(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              type === 'consigne'
                ? 'Écrire une consigne de conduite...'
                : type === 'alerte'
                ? "Décrire l'alerte ou l'anomalie..."
                : 'Écrire une information ou un message...'
            }
            rows={2}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
          />
          <button
            onClick={handleSend}
            disabled={!contenu.trim() || sendMutation.isPending}
            className="px-3 h-[52px] bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-white transition-colors flex items-center gap-1.5 flex-shrink-0"
          >
            <Send size={15} />
            <span className="text-sm hidden sm:inline">Envoyer</span>
          </button>
        </div>
        <p className="text-slate-600 text-xs mt-1">Ctrl+Entrée pour envoyer</p>
      </div>
    </div>
  );
}
