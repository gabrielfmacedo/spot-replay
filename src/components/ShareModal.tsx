
import React, { useState, useEffect, useCallback } from 'react';
import {
  X, Share2, Mail, Users, Trash2, Loader2, Copy, Check,
  Shield, GraduationCap, AlertCircle, RefreshCw
} from 'lucide-react';
import { ReplaySession, SessionMember } from '../types';
import { getSessionMembers, inviteMember, removeMember } from '../services/collabService';

interface ShareModalProps {
  session: ReplaySession;
  onClose: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ session, onClose }) => {
  const [members, setMembers]     = useState<SessionMember[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [email, setEmail]         = useState('');
  const [role, setRole]           = useState<'coach' | 'student'>('student');
  const [canAnnotate, setCanAnnotate] = useState(true);
  const [inviting, setInviting]   = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const m = await getSessionMembers(session.id);
      setMembers(m);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [session.id]);

  useEffect(() => { load(); }, [load]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setInviting(true); setError(null);
    try {
      await inviteMember(session.id, email.trim().toLowerCase(), role, canAnnotate);
      setEmail('');
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!confirm('Remover este membro?')) return;
    try {
      await removeMember(memberId);
      setMembers(prev => prev.filter(m => m.id !== memberId));
    } catch (e: any) {
      setError(e.message);
    }
  };

  const copyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?session=${session.id}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const roleIcon = (r: string) =>
    r === 'coach' ? <Shield size={10} className="text-amber-400" /> : <GraduationCap size={10} className="text-blue-400" />;

  const roleLabel = (r: string) =>
    r === 'coach'
      ? <span className="text-[7px] font-black uppercase bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">Coach</span>
      : <span className="text-[7px] font-black uppercase bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full">Aluno</span>;

  const statusBadge = (s: string) =>
    s === 'accepted'
      ? <span className="text-[7px] font-black uppercase bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">Ativo</span>
      : <span className="text-[7px] font-black uppercase bg-slate-500/20 text-slate-400 px-1.5 py-0.5 rounded-full">Pendente</span>;

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-6"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-[#0a0f1a] border border-white/10 rounded-[2rem] shadow-2xl flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <Share2 size={18} className="text-blue-400" />
            <div>
              <h2 className="text-sm font-black uppercase italic text-white">Compartilhar Sessão</h2>
              <p className="text-[9px] text-slate-500 truncate max-w-[220px]">{session.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Invite link */}
        <div className="px-6 py-4 border-b border-white/5 shrink-0">
          <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-2">Link de acesso</p>
          <div className="flex gap-2">
            <div className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-slate-400 truncate">
              {window.location.origin}/...?session={session.id.slice(0, 8)}...
            </div>
            <button
              onClick={copyLink}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${linkCopied ? 'bg-emerald-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
              {linkCopied ? <Check size={12} /> : <Copy size={12} />}
              {linkCopied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>

        {/* Invite form */}
        <div className="px-6 py-4 border-b border-white/5 shrink-0">
          <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-3">Convidar por e-mail</p>
          <form onSubmit={handleInvite} className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-9 pr-3 text-[11px] text-white outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>
              <select
                value={role}
                onChange={e => setRole(e.target.value as 'coach' | 'student')}
                className="bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-[11px] text-white outline-none focus:border-blue-500/50 transition-colors"
              >
                <option value="student">Aluno</option>
                <option value="coach">Coach</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => setCanAnnotate(v => !v)}
                  className={`w-8 h-4 rounded-full transition-all relative ${canAnnotate ? 'bg-blue-600' : 'bg-white/10'}`}
                >
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${canAnnotate ? 'left-4' : 'left-0.5'}`} />
                </div>
                <span className="text-[10px] text-slate-400">Pode anotar</span>
              </label>
              <button
                type="submit"
                disabled={inviting || !email.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl text-[9px] font-black uppercase text-white transition-all"
              >
                {inviting ? <Loader2 size={12} className="animate-spin" /> : <Users size={12} />}
                Convidar
              </button>
            </div>
          </form>

          {error && (
            <div className="flex items-center gap-2 mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[10px] font-bold">
              <AlertCircle size={13} /> {error}
            </div>
          )}
        </div>

        {/* Members list */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4 space-y-2 min-h-0">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Membros ({members.length})</p>
            <button onClick={load} className="p-1 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-colors">
              <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {loading && (
            <div className="flex justify-center py-6">
              <Loader2 size={20} className="animate-spin text-blue-400" />
            </div>
          )}

          {!loading && members.length === 0 && (
            <p className="text-center text-slate-600 text-[10px] uppercase font-black py-6">Nenhum membro ainda</p>
          )}

          {!loading && members.map(m => (
            <div key={m.id} className="flex items-center gap-3 bg-white/[0.03] border border-white/5 rounded-2xl p-3">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-[10px] font-black text-white shrink-0">
                {m.email[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-[10px] font-black text-white truncate">{m.email}</p>
                  {roleLabel(m.role)}
                  {statusBadge(m.status)}
                </div>
                {m.can_annotate && (
                  <p className="text-[8px] text-slate-600 mt-0.5">Pode anotar</p>
                )}
              </div>
              <button
                onClick={() => handleRemove(m.id)}
                className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-600 hover:text-red-400 transition-colors shrink-0"
                title="Remover"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
