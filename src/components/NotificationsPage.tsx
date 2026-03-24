import React from 'react';
import { X, Bell, ExternalLink, CheckCheck } from 'lucide-react';
import { UserNotification, markNotificationsRead, markAllRead } from '../services/notificationService';

interface Props {
  notifications: UserNotification[];
  userId: string;
  onClose: () => void;
  onRead: (ids: string[]) => void;
  onAllRead: () => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000)     return 'agora';
  if (diff < 3_600_000)  return `${Math.floor(diff / 60_000)}min atrás`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h atrás`;
  const d = Math.floor(diff / 86_400_000);
  return d === 1 ? 'ontem' : `${d} dias atrás`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

const NotificationsPage: React.FC<Props> = ({ notifications, userId, onClose, onRead, onAllRead }) => {
  const unread = notifications.filter(n => !n.read_at);

  const handleMarkAll = async () => {
    await markAllRead(userId);
    onAllRead();
  };

  const handleMarkOne = async (id: string) => {
    await markNotificationsRead([id]);
    onRead([id]);
  };

  return (
    <div className="fixed inset-0 z-[450] bg-[#02040a] flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/40 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
            <Bell size={15} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-widest text-white">Mensagens</h1>
            <p className="text-[10px] text-slate-500">{notifications.length} no total · {unread.length} não lidas</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unread.length > 0 && (
            <button
              onClick={handleMarkAll}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase text-slate-300 hover:text-white transition-all"
            >
              <CheckCheck size={12} /> Marcar todas como lidas
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 border border-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Bell size={40} className="text-slate-800" />
            <p className="text-slate-600 font-black uppercase text-sm">Nenhuma mensagem</p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto py-6 px-4 space-y-2">
            {notifications.map(n => (
              <div
                key={n.id}
                className={`rounded-2xl border px-5 py-4 transition-colors ${
                  !n.read_at
                    ? 'bg-blue-500/[0.06] border-blue-500/20'
                    : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg mt-0.5">
                    <span className="text-[10px] font-black text-white">SR</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {!n.read_at && <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />}
                        <p className={`text-[13px] font-black leading-snug ${!n.read_at ? 'text-white' : 'text-slate-200'}`}>
                          {n.title}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-slate-600" title={fmtDate(n.created_at)}>
                          {timeAgo(n.created_at)}
                        </span>
                        {!n.read_at && (
                          <button
                            onClick={() => handleMarkOne(n.id)}
                            className="text-[9px] text-slate-600 hover:text-blue-400 uppercase font-black transition-colors"
                            title="Marcar como lida"
                          >
                            ✓
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-[12px] text-slate-400 mt-1.5 leading-relaxed">{n.body}</p>

                    {n.link_url && (
                      <a
                        href={n.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 rounded-xl text-[11px] font-black text-white uppercase tracking-wide transition-all"
                      >
                        <ExternalLink size={12} />
                        {n.link_label || 'Abrir link'}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
