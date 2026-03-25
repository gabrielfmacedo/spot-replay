
import React, { useState, useEffect, useCallback } from 'react';
import {
  X, Cloud, Users, Clock, Folder, Trash2, Share2, LogIn,
  Loader2, AlertCircle, RefreshCw, CheckCircle2, Bell
} from 'lucide-react';
import { HandHistory, ReplaySession, SessionMember } from '../types';
import {
  getMySessions, getSharedSessions, getPendingInvites,
  createSession, deleteSession, acceptInvite, loadSessionHands,
} from '../services/collabService';

interface SessionManagerProps {
  hands: HandHistory[];
  user: { id: string; email: string; name: string };
  onLoadSession: (session: ReplaySession, hands: HandHistory[], role: 'owner' | 'coach' | 'student') => void;
  onShare: (session: ReplaySession) => void;
  onClose: () => void;
}

type Tab = 'mine' | 'shared' | 'pending';

const SessionManager: React.FC<SessionManagerProps> = ({
  hands, user, onLoadSession, onShare, onClose,
}) => {
  const [tab, setTab]         = useState<Tab>('mine');
  const [mine, setMine]       = useState<ReplaySession[]>([]);
  const [shared, setShared]   = useState<(ReplaySession & { my_role: string })[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [saving, setSaving]   = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [openingId, setOpeningId]     = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [m, s, p] = await Promise.all([getMySessions(), getSharedSessions(), getPendingInvites()]);
      setMine(m); setShared(s); setPending(p);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (hands.length > 0) {
      const room = hands[0]?.room ?? '';
      const date = new Date().toLocaleDateString('pt-BR');
      setSessionName(`${room} · ${date}`);
    }
  }, [hands]);

  const handleSave = async () => {
    if (!sessionName.trim() || hands.length === 0) return;
    setSaving(true); setError(null);
    try {
      const session = await createSession(hands, sessionName.trim());
      await refresh();
      setTab('mine');
      onShare(session); // open share modal right after saving
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta sessão?')) return;
    try {
      await deleteSession(id);
      setMine(prev => prev.filter(s => s.id !== id));
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleOpen = async (sessionId: string, role: 'owner' | 'coach' | 'student', sessionMeta: ReplaySession) => {
    setOpeningId(sessionId);
    try {
      const h = await loadSessionHands(sessionId);
      onLoadSession(sessionMeta, h, role);
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setOpeningId(null);
    }
  };

  const handleAccept = async (sessionId: string) => {
    try {
      await acceptInvite(sessionId);
      await refresh();
      setTab('shared');
    } catch (e: any) {
      setError(e.message);
    }
  };

  const fmt = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'mine',    label: 'Minhas',       count: mine.length },
    { id: 'shared',  label: 'Compartilhadas', count: shared.length },
    { id: 'pending', label: 'Pendentes',    count: pending.length },
  ];

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-6"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-2xl bg-[#0a0f1a] border border-white/10 rounded-[2rem] shadow-2xl flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <Cloud size={18} className="text-blue-400" />
            <div>
              <h2 className="text-sm font-black uppercase italic text-white">Sessões Cloud</h2>
              <p className="text-[9px] text-slate-500">{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Save current session */}
        {hands.length > 0 && (
          <div className="px-6 py-3 border-b border-white/5 shrink-0 bg-blue-500/5">
            <p className="text-[8px] text-blue-400 font-black uppercase tracking-widest mb-2">Salvar sessão atual ({hands.length} mãos)</p>
            <div className="flex gap-2">
              <input
                value={sessionName}
                onChange={e => setSessionName(e.target.value)}
                placeholder="Nome da sessão..."
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[11px] text-white outline-none focus:border-blue-500/50 transition-colors"
              />
              <button
                onClick={handleSave}
                disabled={saving || !sessionName.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl text-[9px] font-black uppercase text-white transition-all flex items-center gap-1.5"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Cloud size={13} />}
                Salvar
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4 shrink-0">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${tab === t.id ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-500 hover:text-white'}`}
            >
              {t.label}
              {t.count > 0 && (
                <span className={`text-[8px] px-1 rounded-full ${tab === t.id ? 'bg-white/20' : 'bg-white/10'}`}>{t.count}</span>
              )}
            </button>
          ))}
          <button onClick={refresh} className="ml-auto p-1.5 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-colors">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4 space-y-2 min-h-0">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[10px] font-bold mb-2">
              <AlertCircle size={13} /> {error}
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-blue-400" />
            </div>
          )}

          {/* Mine */}
          {!loading && tab === 'mine' && (
            mine.length === 0
              ? <p className="text-center text-slate-600 text-[10px] uppercase font-black py-10">Nenhuma sessão salva</p>
              : mine.map(s => (
                  <div key={s.id} className="flex items-center gap-3 bg-white/[0.03] border border-white/5 rounded-2xl p-3 hover:border-white/10 transition-all">
                    <Folder size={18} className="text-blue-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black text-white truncate">{s.name}</p>
                      <p className="text-[8px] text-slate-500">{s.hand_count} mãos · {fmt(s.updated_at)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onShare(s)}
                        title="Compartilhar"
                        className="p-1.5 hover:bg-blue-500/10 rounded-lg text-slate-500 hover:text-blue-400 transition-colors"
                      >
                        <Share2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        title="Excluir"
                        className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                      <button
                        onClick={() => handleOpen(s.id, 'owner', s)}
                        disabled={openingId === s.id}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-[9px] font-black text-white transition-all"
                      >
                        {openingId === s.id ? <Loader2 size={11} className="animate-spin" /> : <LogIn size={11} />}
                        Abrir
                      </button>
                    </div>
                  </div>
                ))
          )}

          {/* Shared */}
          {!loading && tab === 'shared' && (
            shared.length === 0
              ? <p className="text-center text-slate-600 text-[10px] uppercase font-black py-10">Nenhuma sessão compartilhada</p>
              : shared.map(s => (
                  <div key={s.id} className={`flex items-center gap-3 border rounded-2xl p-3 hover:border-white/10 transition-all ${s.reviewed_at ? 'bg-emerald-500/[0.04] border-emerald-500/20' : 'bg-white/[0.03] border-white/5'}`}>
                    <div className="relative shrink-0">
                      <Users size={18} className={s.reviewed_at ? 'text-emerald-400' : 'text-purple-400'} />
                      {s.reviewed_at && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-[#02040a]" title="Revisão concluída pelo coach" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[11px] font-black text-white truncate">{s.name}</p>
                        <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full ${s.my_role === 'coach' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>
                          {s.my_role}
                        </span>
                        {s.reviewed_at && (
                          <span className="flex items-center gap-0.5 text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                            <CheckCircle2 size={8} /> Revisado
                          </span>
                        )}
                      </div>
                      <p className="text-[8px] text-slate-500">
                        por {s.owner_email} · {s.hand_count} mãos · {fmt(s.updated_at)}
                        {s.reviewed_at && ` · Coach concluiu em ${fmt(s.reviewed_at)}`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleOpen(s.id, s.my_role as any, s)}
                      disabled={openingId === s.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-[9px] font-black text-white transition-all shrink-0"
                    >
                      {openingId === s.id ? <Loader2 size={11} className="animate-spin" /> : <LogIn size={11} />}
                      Abrir
                    </button>
                  </div>
                ))
          )}

          {/* Pending */}
          {!loading && tab === 'pending' && (
            pending.length === 0
              ? <p className="text-center text-slate-600 text-[10px] uppercase font-black py-10">Nenhum convite pendente</p>
              : pending.map((p: any) => (
                  <div key={p.id} className="flex items-center gap-3 bg-amber-500/5 border border-amber-500/20 rounded-2xl p-3">
                    <Clock size={18} className="text-amber-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black text-white truncate">{p.session_name}</p>
                      <p className="text-[8px] text-slate-500">Convidado por {p.owner_email} como <span className="text-amber-400 font-black">{p.role}</span></p>
                    </div>
                    <button
                      onClick={() => handleAccept(p.session_id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-[9px] font-black text-white transition-all shrink-0"
                    >
                      <CheckCircle2 size={11} /> Aceitar
                    </button>
                  </div>
                ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionManager;
