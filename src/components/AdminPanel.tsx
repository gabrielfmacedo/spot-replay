import React, { useState, useEffect, useCallback } from 'react';
import {
  X, Users, Plus, Trash2, Edit2, Search, Loader2,
  Shield, Mail, Phone, Calendar, UserCheck, UserX, RefreshCw,
  BarChart2, TrendingUp, Activity, Link2, UserPlus, Clock,
  Bell, Send, ToggleLeft, ToggleRight, ChevronDown
} from 'lucide-react';
import { supabase } from '../services/supabase';
import {
  adminGetTemplates, adminSendBroadcast, adminSaveDrip,
  adminToggleNotif, adminDeleteNotif,
  type NotifTemplate,
} from '../services/notificationService';

// ── Types ──────────────────────────────────────────────────────────────────────
interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: 'user' | 'admin';
  whatsapp: string | null;
  created_at: string;
  last_sign_in_at: string | null;
}

interface AdminLead {
  id: string;
  full_name: string;
  email: string;
  whatsapp: string | null;
  source: string;
  created_at: string;
  has_account: boolean;
}

interface AdminMetrics {
  total_users: number;
  new_7d: number;
  new_30d: number;
  active_today: number;
  active_7d: number;
  total_leads: number;
  leads_7d: number;
  shared_hands: number;
  online_now: number;
}

interface AdminPanelProps { onClose: () => void; }

type AdminTab = 'dashboard' | 'users' | 'leads' | 'notifs';

// ── Segment options ────────────────────────────────────────────────────────────
const SEGMENTS = [
  { key: 'all',     label: 'Todos os usuários' },
  { key: 'mtt',     label: 'Modalidade: MTT' },
  { key: 'cash',    label: 'Modalidade: CASH' },
  { key: 'spingo',  label: 'Modalidade: SPINGO' },
  { key: 'sng',     label: 'Modalidade: SNG' },
  { key: 'team',    label: 'Joga em time' },
  { key: 'no_team', label: 'Não joga em time' },
];

// ── NotifCompose Modal ─────────────────────────────────────────────────────────
const NotifComposeModal: React.FC<{ onClose: () => void; onSent: () => void }> = ({ onClose, onSent }) => {
  const [title,      setTitle]      = useState('');
  const [body,       setBody]       = useState('');
  const [linkUrl,    setLinkUrl]    = useState('');
  const [linkLabel,  setLinkLabel]  = useState('');
  const [type,       setType]       = useState<'broadcast' | 'drip'>('broadcast');
  const [segment,    setSegment]    = useState('all');
  const [delayNum,   setDelayNum]   = useState('1');
  const [delayUnit,  setDelayUnit]  = useState<'minutes' | 'hours' | 'days'>('days');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [sentInfo,   setSentInfo]   = useState<{ recipients: number } | null>(null);

  const delayMinutes =
    delayUnit === 'minutes' ? Number(delayNum) :
    delayUnit === 'hours'   ? Number(delayNum) * 60 :
                              Number(delayNum) * 1440;

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) { setError('Título e mensagem são obrigatórios.'); return; }
    setLoading(true); setError('');
    try {
      if (type === 'broadcast') {
        const result = await adminSendBroadcast(title, body, linkUrl, linkLabel, segment);
        setSentInfo(result);
        onSent();
      } else {
        await adminSaveDrip(title, body, linkUrl, linkLabel, segment, delayMinutes);
        onSent(); onClose();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar');
    } finally { setLoading(false); }
  };

  if (sentInfo) return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
          <Send size={24} className="text-emerald-400" />
        </div>
        <div>
          <p className="text-base font-black text-white">Broadcast enviado!</p>
          <p className="text-sm text-slate-400 mt-1">
            <span className="text-emerald-400 font-black text-lg">{sentInfo.recipients}</span> usuários receberam a notificação.
          </p>
        </div>
        <button onClick={onClose} className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase text-slate-300 transition-all">
          Fechar
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-white/5 shrink-0">
          <h2 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
            <Bell size={14} className="text-blue-400" /> Nova Notificação
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"><X size={16} /></button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4 flex-1">
          {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-[11px] text-red-400">{error}</div>}

          {/* Tipo */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-2">Tipo</label>
            <div className="flex gap-2">
              {(['broadcast', 'drip'] as const).map(t => (
                <button key={t} type="button" onClick={() => setType(t)}
                  className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase border transition-all ${type === t ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}>
                  {t === 'broadcast' ? '📢 Broadcast' : '⏱ Drip / Funil'}
                </button>
              ))}
            </div>
            <p className="text-[9px] text-slate-600 mt-1.5">
              {type === 'broadcast'
                ? 'Enviado agora para todos os usuários do segmento selecionado.'
                : 'Enviado automaticamente após um período desde o cadastro do usuário.'}
            </p>
          </div>

          {/* Título */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Título <span className="text-red-400">*</span></label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Atualização importante"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50" />
          </div>

          {/* Mensagem */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Mensagem <span className="text-red-400">*</span></label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={4} placeholder="Texto da notificação…"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 resize-none" />
          </div>

          {/* Link (opcional) */}
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase text-slate-500">Link (opcional)</label>
            <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://…"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50" />
            {linkUrl && (
              <input value={linkLabel} onChange={e => setLinkLabel(e.target.value)} placeholder="Label do botão (ex: Ver oferta)"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50" />
            )}
          </div>

          {/* Segmento */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Segmento</label>
            <div className="relative">
              <select value={segment} onChange={e => setSegment(e.target.value)}
                className="w-full appearance-none bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 pr-8">
                {SEGMENTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {/* Drip delay */}
          {type === 'drip' && (
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Enviar após</label>
              <div className="flex gap-2">
                <input
                  type="number" min="1" value={delayNum} onChange={e => setDelayNum(e.target.value)}
                  className="w-24 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                />
                <div className="relative flex-1">
                  <select value={delayUnit} onChange={e => setDelayUnit(e.target.value as typeof delayUnit)}
                    className="w-full appearance-none bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 pr-8">
                    <option value="minutes">minutos</option>
                    <option value="hours">horas</option>
                    <option value="days">dias</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
              </div>
              <p className="text-[9px] text-slate-600 mt-1">= {delayMinutes.toLocaleString('pt-BR')} minutos após o cadastro</p>
            </div>
          )}
        </div>

        <div className="px-5 pb-5 shrink-0">
          <button onClick={handleSend} disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl text-[11px] font-black uppercase tracking-widest text-white transition-all flex items-center justify-center gap-2">
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            {type === 'broadcast' ? 'Enviar agora' : 'Salvar sequência'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}
function fmtDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'agora';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}min`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  const d = Math.floor(diff / 86_400_000);
  return d === 1 ? 'ontem' : `${d}d`;
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard: React.FC<{
  label: string;
  value: number | string;
  sub?: string;
  color?: string;
  icon: React.ReactNode;
}> = ({ label, value, sub, color = 'text-white', icon }) => (
  <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex flex-col gap-2">
    <div className="flex items-center justify-between">
      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</span>
      <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-slate-400">{icon}</div>
    </div>
    <span className={`text-3xl font-black ${color}`}>{value}</span>
    {sub && <span className="text-[9px] text-slate-600">{sub}</span>}
  </div>
);

// ── Add User Modal ────────────────────────────────────────────────────────────
const AddUserModal: React.FC<{ onClose: () => void; onCreated: () => void }> = ({ onClose, onCreated }) => {
  const [email, setEmail]       = useState('');
  const [name, setName]         = useState('');
  const [phone, setPhone]       = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole]         = useState<'user' | 'admin'>('user');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true); setError('');
    try {
      const { error: err } = await supabase.rpc('admin_create_user', {
        p_email: email, p_password: password, p_full_name: name,
        p_phone: phone || null, p_role: role,
      });
      if (err) throw err;
      onCreated(); onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar usuário');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h2 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
            <Plus size={14} className="text-blue-400" /> Novo Usuário
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-[11px] text-red-400">{error}</div>}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Nome completo</label>
            <input value={name} onChange={e => setName(e.target.value)} required placeholder="João Silva"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50" />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">E-mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="joao@email.com"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50" />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">WhatsApp</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+55 11 99999-9999"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50" />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Senha</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} placeholder="mínimo 6 caracteres"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50" />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Papel</label>
            <div className="flex gap-2">
              {(['user', 'admin'] as const).map(r => (
                <button key={r} type="button" onClick={() => setRole(r)}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase border transition-all ${role === r ? (r === 'admin' ? 'bg-purple-600 border-purple-600 text-white' : 'bg-blue-600 border-blue-600 text-white') : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}>
                  {r === 'admin' ? '👑 Admin' : '👤 Usuário'}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl text-[11px] font-black uppercase tracking-widest text-white transition-all flex items-center justify-center gap-2">
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Criar Usuário
          </button>
        </form>
      </div>
    </div>
  );
};

// ── Edit User Modal ───────────────────────────────────────────────────────────
const EditUserModal: React.FC<{ user: AdminUser; onClose: () => void; onSaved: () => void }> = ({ user, onClose, onSaved }) => {
  const [name, setName]       = useState(user.full_name || '');
  const [role, setRole]       = useState<'user' | 'admin'>(user.role);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true); setError('');
    try {
      const { error: err } = await supabase.rpc('admin_update_user', { p_user_id: user.id, p_full_name: name, p_role: role });
      if (err) throw err;
      onSaved(); onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h2 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2"><Edit2 size={14} className="text-blue-400" /> Editar</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-[11px] text-red-400">{error}</div>}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">E-mail</label>
            <div className="text-sm text-slate-400 bg-white/5 border border-white/5 rounded-lg px-3 py-2">{user.email}</div>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Nome</label>
            <input value={name} onChange={e => setName(e.target.value)} required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50" />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Papel</label>
            <div className="flex gap-2">
              {(['user', 'admin'] as const).map(r => (
                <button key={r} type="button" onClick={() => setRole(r)}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase border transition-all ${role === r ? (r === 'admin' ? 'bg-purple-600 border-purple-600 text-white' : 'bg-blue-600 border-blue-600 text-white') : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}>
                  {r === 'admin' ? '👑 Admin' : '👤 Usuário'}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl text-[11px] font-black uppercase tracking-widest text-white transition-all flex items-center justify-center gap-2">
            {loading ? <Loader2 size={13} className="animate-spin" /> : <UserCheck size={13} />} Salvar
          </button>
        </form>
      </div>
    </div>
  );
};

// ── Delete Confirm ────────────────────────────────────────────────────────────
const DeleteConfirm: React.FC<{ user: AdminUser; onClose: () => void; onDeleted: () => void }> = ({ user, onClose, onDeleted }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleDelete = async () => {
    if (!supabase) return;
    setLoading(true); setError('');
    try {
      const { error: err } = await supabase.rpc('admin_delete_user', { p_user_id: user.id });
      if (err) throw err;
      onDeleted(); onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0"><UserX size={18} className="text-red-400" /></div>
          <div>
            <p className="text-sm font-black text-white">Excluir usuário?</p>
            <p className="text-[11px] text-slate-400">{user.full_name || user.email}</p>
          </div>
        </div>
        {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-[11px] text-red-400">{error}</div>}
        <p className="text-[11px] text-slate-500">Esta ação é irreversível. O usuário e todos os seus dados serão excluídos permanentemente.</p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors">Cancelar</button>
          <button onClick={handleDelete} disabled={loading}
            className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white transition-colors flex items-center justify-center gap-1">
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Excluir
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main AdminPanel ───────────────────────────────────────────────────────────
const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const [tab, setTab]               = useState<AdminTab>('dashboard');
  const [metrics, setMetrics]       = useState<AdminMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [users, setUsers]           = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [leads, setLeads]           = useState<AdminLead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [templates, setTemplates]   = useState<NotifTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [search, setSearch]         = useState('');
  const [showAdd, setShowAdd]       = useState(false);
  const [editUser, setEditUser]     = useState<AdminUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!supabase) return;
    setMetricsLoading(true);
    try {
      const { data } = await supabase.rpc('admin_get_metrics');
      setMetrics(data as AdminMetrics);
    } catch { /* ignore */ } finally { setMetricsLoading(false); }
  }, []);

  const fetchUsers = useCallback(async () => {
    if (!supabase) return;
    setUsersLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_users');
      if (error) throw error;
      setUsers((data as AdminUser[]) || []);
    } catch { /* ignore */ } finally { setUsersLoading(false); }
  }, []);

  const fetchLeads = useCallback(async () => {
    if (!supabase) return;
    setLeadsLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_leads');
      if (error) throw error;
      setLeads((data as AdminLead[]) || []);
    } catch { /* ignore */ } finally { setLeadsLoading(false); }
  }, []);

  const fetchTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      setTemplates(await adminGetTemplates());
    } catch { /* ignore */ } finally { setTemplatesLoading(false); }
  }, []);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);
  useEffect(() => { if (tab === 'users')  fetchUsers();    }, [tab, fetchUsers]);
  useEffect(() => { if (tab === 'leads')  fetchLeads();    }, [tab, fetchLeads]);
  useEffect(() => { if (tab === 'notifs') fetchTemplates(); }, [tab, fetchTemplates]);

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase();
    return u.email.toLowerCase().includes(q) || (u.full_name || '').toLowerCase().includes(q) || (u.whatsapp || '').includes(q);
  });
  const filteredLeads = leads.filter(l => {
    const q = search.toLowerCase();
    return l.email.toLowerCase().includes(q) || (l.full_name || '').toLowerCase().includes(q) || (l.whatsapp || '').includes(q);
  });

  const TABS: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
    { key: 'dashboard', label: 'Dashboard',    icon: <BarChart2 size={13} /> },
    { key: 'users',     label: 'Usuários',     icon: <Users size={13} /> },
    { key: 'leads',     label: 'Leads',        icon: <UserPlus size={13} /> },
    { key: 'notifs',    label: 'Notificações', icon: <Bell size={13} /> },
  ];

  return (
    <>
      <div className="fixed inset-0 z-[400] flex flex-col bg-[#02040a] text-slate-100">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/40 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center">
              <Shield size={15} className="text-purple-400" />
            </div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-widest text-white">Backoffice</h1>
              <p className="text-[10px] text-slate-500">Spot Replay · Painel Admin</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { fetchMetrics(); if (tab === 'users') fetchUsers(); if (tab === 'leads') fetchLeads(); if (tab === 'notifs') fetchTemplates(); }}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 border border-white/10 transition-colors" title="Recarregar">
              <RefreshCw size={14} className={metricsLoading || usersLoading || leadsLoading || templatesLoading ? 'animate-spin' : ''} />
            </button>
            <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 border border-white/10 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-white/5 bg-black/20 shrink-0">
          {TABS.map(({ key, label, icon }) => (
            <button key={key} onClick={() => { setTab(key); setSearch(''); }}
              className={`flex items-center gap-2 px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-colors border-b-2 ${tab === key ? 'border-purple-500 text-purple-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
              {icon}{label}
            </button>
          ))}
        </div>

        {/* ── DASHBOARD TAB ─────────────────────────────────────────────────────── */}
        {tab === 'dashboard' && (
          <div className="flex-1 overflow-auto px-6 py-6">
            {metricsLoading ? (
              <div className="flex items-center justify-center h-40"><Loader2 size={22} className="animate-spin text-slate-500" /></div>
            ) : metrics ? (
              <div className="space-y-6">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-3">Usuários</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard label="Total" value={metrics.total_users} icon={<Users size={14} />} color="text-white" />
                    <StatCard label="Online Agora" value={metrics.online_now} sub="últimos 5 min" icon={<Activity size={14} />} color="text-emerald-400" />
                    <StatCard label="Ativos Hoje" value={metrics.active_today} sub="último login hoje" icon={<Clock size={14} />} color="text-blue-400" />
                    <StatCard label="Ativos 7d" value={metrics.active_7d} icon={<TrendingUp size={14} />} color="text-sky-400" />
                  </div>
                </div>

                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-3">Novos Cadastros</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <StatCard label="Últimos 7 dias" value={metrics.new_7d} icon={<UserPlus size={14} />} color="text-amber-400" />
                    <StatCard label="Últimos 30 dias" value={metrics.new_30d} icon={<Calendar size={14} />} color="text-orange-400" />
                    <StatCard label="Leads Totais" value={metrics.total_leads} sub={`${metrics.leads_7d} novos (7d)`} icon={<Mail size={14} />} color="text-purple-400" />
                  </div>
                </div>

                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-3">Engajamento</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <StatCard label="Mãos Compartilhadas" value={metrics.shared_hands} icon={<Link2 size={14} />} color="text-cyan-400" />
                    <StatCard
                      label="Taxa de Conversão"
                      value={metrics.total_leads > 0 ? `${Math.round((metrics.total_users / metrics.total_leads) * 100)}%` : '—'}
                      sub="leads → usuários"
                      icon={<TrendingUp size={14} />}
                      color="text-emerald-400"
                    />
                    <StatCard
                      label="Retenção 7d"
                      value={metrics.total_users > 0 ? `${Math.round((metrics.active_7d / metrics.total_users) * 100)}%` : '—'}
                      sub="usuários ativos / total"
                      icon={<Activity size={14} />}
                      color="text-blue-400"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-600 py-12 text-sm">Não foi possível carregar métricas</div>
            )}
          </div>
        )}

        {/* ── USERS TAB ─────────────────────────────────────────────────────────── */}
        {tab === 'users' && (
          <>
            <div className="flex items-center gap-3 px-6 py-3 border-b border-white/5 bg-black/20 shrink-0">
              <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                <Search size={13} className="text-slate-500 shrink-0" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, e-mail ou WhatsApp…"
                  className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 focus:outline-none" />
                {search && <button onClick={() => setSearch('')} className="text-slate-500 hover:text-white transition-colors"><X size={12} /></button>}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                <Users size={12} />
                <span className="font-black text-slate-300">{filteredUsers.length}</span>
                {search && <span>de {users.length}</span>}
                <span>usuários</span>
              </div>
              <button onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-lg active:scale-95">
                <Plus size={13} /> Novo
              </button>
            </div>
            <div className="flex-1 overflow-auto px-6 py-4">
              {usersLoading ? (
                <div className="flex items-center justify-center h-40 gap-3 text-slate-500"><Loader2 size={20} className="animate-spin" /><span className="text-sm">Carregando…</span></div>
              ) : filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-600"><Users size={32} /><p className="text-sm">{search ? 'Nenhum resultado' : 'Nenhum usuário'}</p></div>
              ) : (
                <div className="rounded-xl border border-white/5 overflow-hidden">
                  <div className="grid grid-cols-[1fr_1fr_120px_100px_100px_80px] gap-3 px-4 py-2.5 bg-white/[0.03] border-b border-white/5 text-[9px] font-black uppercase tracking-widest text-slate-500">
                    <span>E-mail</span><span>Nome</span><span><Phone size={9} className="inline mr-1" />WhatsApp</span>
                    <span><Calendar size={9} className="inline mr-1" />Cadastro</span><span><Clock size={9} className="inline mr-1" />Último acesso</span><span>Ações</span>
                  </div>
                  {filteredUsers.map((u, i) => (
                    <div key={u.id} className={`grid grid-cols-[1fr_1fr_120px_100px_100px_80px] gap-3 px-4 py-3 items-center hover:bg-white/[0.02] ${i > 0 ? 'border-t border-white/[0.04]' : ''}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm text-slate-200 truncate">{u.email}</span>
                        {u.role === 'admin' && (
                          <span className="shrink-0 flex items-center gap-0.5 bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase">
                            <Shield size={7} /> admin
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-slate-300 truncate">{u.full_name || <span className="text-slate-600 italic">—</span>}</span>
                      <span className="text-[11px] text-slate-400 font-mono truncate">{u.whatsapp || <span className="text-slate-600 italic">—</span>}</span>
                      <span className="text-[11px] text-slate-500">{fmtDate(u.created_at)}</span>
                      <span className="text-[11px] text-slate-500" title={fmtDateTime(u.last_sign_in_at)}>{timeAgo(u.last_sign_in_at)}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditUser(u)} className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors" title="Editar"><Edit2 size={13} /></button>
                        <button onClick={() => setDeleteUser(u)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Excluir"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── LEADS TAB ─────────────────────────────────────────────────────────── */}
        {tab === 'leads' && (
          <>
            <div className="flex items-center gap-3 px-6 py-3 border-b border-white/5 bg-black/20 shrink-0">
              <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                <Search size={13} className="text-slate-500 shrink-0" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, e-mail ou WhatsApp…"
                  className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 focus:outline-none" />
                {search && <button onClick={() => setSearch('')} className="text-slate-500 hover:text-white transition-colors"><X size={12} /></button>}
              </div>
              <div className="text-[10px] text-slate-500">
                <span className="font-black text-slate-300">{filteredLeads.length}</span> leads
              </div>
            </div>
            <div className="flex-1 overflow-auto px-6 py-4">
              {leadsLoading ? (
                <div className="flex items-center justify-center h-40 gap-3 text-slate-500"><Loader2 size={20} className="animate-spin" /><span className="text-sm">Carregando…</span></div>
              ) : filteredLeads.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-600"><Mail size={32} /><p className="text-sm">{search ? 'Nenhum resultado' : 'Nenhum lead'}</p></div>
              ) : (
                <div className="rounded-xl border border-white/5 overflow-hidden">
                  <div className="grid grid-cols-[1fr_1fr_130px_80px_80px_80px] gap-3 px-4 py-2.5 bg-white/[0.03] border-b border-white/5 text-[9px] font-black uppercase tracking-widest text-slate-500">
                    <span>E-mail</span><span>Nome</span><span>WhatsApp</span><span>Origem</span><span>Conta</span><span>Data</span>
                  </div>
                  {filteredLeads.map((l, i) => (
                    <div key={l.id} className={`grid grid-cols-[1fr_1fr_130px_80px_80px_80px] gap-3 px-4 py-3 items-center hover:bg-white/[0.02] ${i > 0 ? 'border-t border-white/[0.04]' : ''}`}>
                      <span className="text-sm text-slate-200 truncate">{l.email}</span>
                      <span className="text-sm text-slate-300 truncate">{l.full_name || <span className="text-slate-600 italic">—</span>}</span>
                      <span className="text-[11px] text-slate-400 font-mono truncate">{l.whatsapp || <span className="text-slate-600 italic">—</span>}</span>
                      <span className="text-[10px] text-slate-500 uppercase">{l.source}</span>
                      <span>
                        {l.has_account
                          ? <span className="text-[8px] font-black uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 rounded-full px-2 py-0.5">Sim</span>
                          : <span className="text-[8px] font-black uppercase bg-white/5 text-slate-500 border border-white/10 rounded-full px-2 py-0.5">Não</span>}
                      </span>
                      <span className="text-[11px] text-slate-500">{fmtDate(l.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── NOTIFS TAB ────────────────────────────────────────────────────────── */}
        {tab === 'notifs' && (
          <>
            <div className="flex items-center gap-3 px-6 py-3 border-b border-white/5 bg-black/20 shrink-0">
              <div className="flex-1">
                <p className="text-[10px] text-slate-400">
                  <span className="font-black text-slate-200">{templates.length}</span> campanhas criadas ·{' '}
                  <span className="font-black text-emerald-400">{templates.filter(t => t.is_active).length}</span> ativas
                </p>
              </div>
              <button onClick={() => setShowCompose(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-lg active:scale-95">
                <Plus size={13} /> Nova notificação
              </button>
            </div>
            <div className="flex-1 overflow-auto px-6 py-4">
              {templatesLoading ? (
                <div className="flex items-center justify-center h-40 gap-3 text-slate-500"><Loader2 size={20} className="animate-spin" /></div>
              ) : templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-600">
                  <Bell size={32} />
                  <p className="text-sm">Nenhuma notificação criada</p>
                  <button onClick={() => setShowCompose(true)} className="text-[10px] font-black uppercase text-blue-400 hover:text-blue-300 transition-colors">
                    + Criar primeira
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {templates.map(t => (
                    <div key={t.id} className={`bg-white/[0.02] border rounded-xl px-4 py-3.5 transition-colors ${t.is_active ? 'border-white/8' : 'border-white/[0.04] opacity-60'}`}>
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-[12px] font-black text-white">{t.title}</p>
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
                              t.type === 'broadcast'
                                ? 'bg-blue-500/15 text-blue-400 border-blue-500/20'
                                : 'bg-amber-500/15 text-amber-400 border-amber-500/20'
                            }`}>
                              {t.type === 'broadcast' ? '📢 Broadcast' : '⏱ Drip'}
                            </span>
                            <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-500">
                              {SEGMENTS.find(s => s.key === t.segment)?.label ?? t.segment}
                            </span>
                            {t.type === 'drip' && t.drip_delay_minutes != null && (
                              <span className="text-[8px] text-slate-600">
                                após {t.drip_delay_minutes >= 1440
                                  ? `${(t.drip_delay_minutes / 1440).toFixed(0)}d`
                                  : t.drip_delay_minutes >= 60
                                  ? `${(t.drip_delay_minutes / 60).toFixed(0)}h`
                                  : `${t.drip_delay_minutes}min`}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">{t.body}</p>
                          {t.link_url && (
                            <p className="text-[9px] text-blue-500/70 mt-0.5 truncate">{t.link_url}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <div className="text-right mr-2">
                            <p className="text-[10px] font-black text-white">{t.delivered_count.toLocaleString()}</p>
                            <p className="text-[8px] text-slate-600">entregues</p>
                          </div>
                          {/* Toggle active */}
                          <button
                            onClick={async () => {
                              await adminToggleNotif(t.id, !t.is_active);
                              fetchTemplates();
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${t.is_active ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-slate-600 hover:bg-white/5'}`}
                            title={t.is_active ? 'Pausar' : 'Ativar'}
                          >
                            {t.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                          </button>
                          {/* Delete */}
                          <button
                            onClick={async () => {
                              if (!confirm(`Excluir "${t.title}"?`)) return;
                              await adminDeleteNotif(t.id);
                              fetchTemplates();
                            }}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-2 pt-2 border-t border-white/5">
                        <span className="text-[9px] text-slate-600">{fmtDate(t.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>  {/* end main fixed container */}

      {showAdd    && <AddUserModal    onClose={() => setShowAdd(false)}    onCreated={fetchUsers} />}
      {editUser   && <EditUserModal   user={editUser}  onClose={() => setEditUser(null)}  onSaved={fetchUsers} />}
      {deleteUser && <DeleteConfirm   user={deleteUser} onClose={() => setDeleteUser(null)} onDeleted={fetchUsers} />}
      {showCompose && <NotifComposeModal onClose={() => setShowCompose(false)} onSent={fetchTemplates} />}
    </>
  );
};

export default AdminPanel;
