import React, { useRef, useEffect } from 'react';
import { Bell, X, ExternalLink, CheckCheck } from 'lucide-react';
import { UserNotification, markNotificationsRead, markAllRead } from '../services/notificationService';

interface Props {
  notifications: UserNotification[];
  userId: string;
  open: boolean;
  onToggle: (open: boolean) => void;
  onRead: (ids: string[]) => void;
  onAllRead: () => void;
  onViewAll: () => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000)     return 'agora';
  if (diff < 3_600_000)  return `${Math.floor(diff / 60_000)}min`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
}

const NotificationBell: React.FC<Props> = ({
  notifications, userId, open, onToggle, onRead, onAllRead, onViewAll,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const unread      = notifications.filter(n => !n.read_at);
  const unreadCount = unread.length;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (open && ref.current && !ref.current.contains(e.target as Node)) onToggle(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onToggle]);

  const handleToggle = async () => {
    const willOpen = !open;
    onToggle(willOpen);
    if (willOpen && unread.length > 0) {
      const ids = unread.map(n => n.id);
      await markNotificationsRead(ids);
      onRead(ids);
    }
  };

  const handleMarkAll = async () => {
    await markAllRead(userId);
    onAllRead();
  };

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={handleToggle}
        className="relative p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
        title="Notificações"
      >
        <Bell size={15} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 rounded-full text-[8px] font-black text-white flex items-center justify-center px-1 shadow-lg">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[22rem] bg-[#0a0f1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[300]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Bell size={11} className="text-blue-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Notificações</span>
              {unreadCount > 0 && (
                <span className="text-[8px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded-full">{unreadCount}</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {notifications.some(n => !n.read_at) && (
                <button
                  onClick={handleMarkAll}
                  className="flex items-center gap-1 text-[9px] text-blue-400 hover:text-blue-300 font-black uppercase transition-colors"
                >
                  <CheckCheck size={10} /> Tudo lido
                </button>
              )}
              <button onClick={() => onToggle(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={13} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto divide-y divide-white/[0.04]" style={{ maxHeight: '380px' }}>
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Bell size={24} className="text-slate-700" />
                <p className="text-[11px] text-slate-600">Nenhuma notificação</p>
              </div>
            ) : (
              notifications.slice(0, 5).map(n => (
                <div
                  key={n.id}
                  className={`px-4 py-3.5 transition-colors ${!n.read_at ? 'bg-blue-500/[0.07]' : 'hover:bg-white/[0.02]'}`}
                >
                  <div className="flex items-start gap-2">
                    {/* Unread dot */}
                    <div className="w-4 shrink-0 flex justify-center pt-1.5">
                      {!n.read_at && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 block" />}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-[12px] font-black leading-snug ${!n.read_at ? 'text-white' : 'text-slate-300'}`}>
                          {n.title}
                        </p>
                        <span className="text-[9px] text-slate-600 shrink-0 mt-0.5">{timeAgo(n.created_at)}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{n.body}</p>
                      {/* Link — prominent button */}
                      {n.link_url && (
                        <a
                          href={n.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => onToggle(false)}
                          className="inline-flex items-center gap-1.5 mt-1 px-3 py-1.5 bg-blue-600/90 hover:bg-blue-500 rounded-lg text-[10px] font-black uppercase text-white transition-colors"
                        >
                          <ExternalLink size={10} />
                          {n.link_label || 'Abrir link'}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Ver todas */}
          {notifications.length > 0 && (
            <div className="border-t border-white/5 px-4 py-3">
              <button
                onClick={() => { onToggle(false); onViewAll(); }}
                className="w-full flex items-center justify-center gap-2 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase text-slate-300 hover:text-white transition-all"
              >
                Ver todas as mensagens
                {notifications.length > 5 && (
                  <span className="bg-blue-500/20 text-blue-400 text-[8px] px-1.5 py-0.5 rounded-full font-black">
                    {notifications.length}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
