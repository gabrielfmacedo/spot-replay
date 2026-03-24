import React, { useEffect, useRef, useState } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { UserNotification } from '../services/notificationService';

interface Props {
  notification: UserNotification;
  onClose: () => void;
}

const DURATION = 7000;

const NotificationToast: React.FC<Props> = ({ notification, onClose }) => {
  const [progress, setProgress] = useState(100);
  const [visible,  setVisible]  = useState(false);
  const startRef = useRef(Date.now());
  const rafRef   = useRef<number>(0);

  // Slide-in on mount
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  useEffect(() => {
    startRef.current = Date.now();
    const tick = () => {
      const elapsed  = Date.now() - startRef.current;
      const remaining = Math.max(0, 100 - (elapsed / DURATION) * 100);
      setProgress(remaining);
      if (remaining > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        onClose();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [onClose]);

  return (
    <div
      className="fixed bottom-6 right-5 z-[600] w-[22rem] overflow-hidden rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] transition-all duration-300"
      style={{
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.97)',
        opacity:   visible ? 1 : 0,
        background: 'linear-gradient(135deg, #0d1420 0%, #0a1128 100%)',
        border: '1px solid rgba(99,130,246,0.25)',
      }}
    >
      {/* Header — sender */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          {/* Avatar */}
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg">
            <span className="text-[9px] font-black text-white">SR</span>
          </div>
          <div>
            <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest leading-none">Spot Replay</p>
            <p className="text-[8px] text-slate-600 leading-none mt-0.5">agora</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-600 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X size={12} />
        </button>
      </div>

      {/* Message body */}
      <div className="px-4 pb-3 space-y-2">
        <p className="text-[13px] font-black text-white leading-snug">{notification.title}</p>
        <p className="text-[11px] text-slate-300 leading-relaxed">{notification.body}</p>

        {/* Action button — full width, prominent */}
        {notification.link_url && (
          <a
            href={notification.link_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="mt-1 flex items-center justify-center gap-2 w-full py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 rounded-xl text-[11px] font-black text-white uppercase tracking-wider transition-all"
          >
            <ExternalLink size={12} />
            {notification.link_label || 'Abrir link'}
          </a>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-[3px] bg-white/5">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
          style={{ width: `${progress}%`, transition: 'width 60ms linear' }}
        />
      </div>
    </div>
  );
};

export default NotificationToast;
