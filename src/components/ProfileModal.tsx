import React, { useState, useEffect } from 'react';
import { X, User, Mail, Lock, Save, Loader2, Eye, EyeOff, CheckCircle, AlertCircle, Link2, Trash2 } from 'lucide-react';
import { supabase } from '../services/supabase';

interface ProfileData {
  full_name: string;
  modality: string;
  plays_for_team: boolean;
  team_name: string;
  poker_nick: string;
}

interface ProfileModalProps {
  user: { id: string; email: string; name: string };
  onClose: () => void;
  onNameChange?: (name: string) => void;
}

interface SharedHand {
  id: string;
  title: string | null;
  created_at: string;
}

type Tab = 'profile' | 'account' | 'shared';

const ProfileModal: React.FC<ProfileModalProps> = ({ user, onClose, onNameChange }) => {
  const [tab, setTab] = useState<Tab>('profile');

  // Profile fields
  const [profile, setProfile] = useState<ProfileData>({
    full_name: user.name,
    modality: '',
    plays_for_team: false,
    team_name: '',
    poker_nick: '',
  });
  const [profileLoading, setProfileLoading]   = useState(false);
  const [profileSaving, setProfileSaving]     = useState(false);
  const [profileMsg, setProfileMsg]           = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Account fields
  const [newEmail,    setNewEmail]    = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPw,      setShowPw]      = useState(false);
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountMsg,    setAccountMsg]    = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [sharedHands,       setSharedHands]       = useState<SharedHand[]>([]);
  const [sharedLoading,     setSharedLoading]      = useState(false);
  const [copiedShareId,     setCopiedShareId]      = useState<string | null>(null);

  // Load profile from DB
  useEffect(() => {
    if (!supabase) return;
    setProfileLoading(true);
    Promise.resolve(
      supabase
        .from('profiles')
        .select('full_name, modality, plays_for_team, team_name, poker_nick')
        .eq('id', user.id)
        .single()
    ).then(({ data }) => {
      if (data) {
        setProfile({
          full_name:      data.full_name     || user.name,
          modality:       data.modality      || '',
          plays_for_team: data.plays_for_team || false,
          team_name:      data.team_name      || '',
          poker_nick:     data.poker_nick     || '',
        });
      }
    }).finally(() => setProfileLoading(false));
  }, [user.id, user.name]);

  useEffect(() => {
    if (tab !== 'shared' || !supabase) return;
    setSharedLoading(true);
    Promise.resolve(
      supabase
        .from('shared_hands')
        .select('id, title, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
    ).then(({ data }) => setSharedHands((data as SharedHand[]) ?? []))
      .finally(() => setSharedLoading(false));
  }, [tab, user.id]);

  const deleteShared = async (id: string) => {
    if (!supabase) return;
    await supabase.from('shared_hands').delete().eq('id', id);
    setSharedHands(prev => prev.filter(h => h.id !== id));
  };

  const copyShareLink = (id: string) => {
    const url = `${window.location.origin}${window.location.pathname}?share=${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedShareId(id);
      setTimeout(() => setCopiedShareId(null), 2000);
    });
  };

  const fmtDateTime = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

  const saveProfile = async () => {
    if (!supabase) return;
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const { error } = await supabase.from('profiles').update({
        full_name:      profile.full_name,
        modality:       profile.modality      || null,
        plays_for_team: profile.plays_for_team,
        team_name:      profile.plays_for_team ? profile.team_name : null,
        poker_nick:     profile.poker_nick     || null,
      }).eq('id', user.id);
      if (error) throw error;
      // Also update auth metadata for name
      await supabase.auth.updateUser({ data: { full_name: profile.full_name } });
      onNameChange?.(profile.full_name);
      setProfileMsg({ type: 'ok', text: 'Perfil salvo com sucesso!' });
    } catch (err: unknown) {
      setProfileMsg({ type: 'err', text: err instanceof Error ? err.message : 'Erro ao salvar' });
    } finally {
      setProfileSaving(false);
    }
  };

  const saveAccount = async () => {
    if (!supabase) return;
    if (!newEmail && !newPassword) return;
    setAccountSaving(true);
    setAccountMsg(null);
    try {
      const updates: { email?: string; password?: string } = {};
      if (newEmail)    updates.email    = newEmail;
      if (newPassword) updates.password = newPassword;
      const { error } = await supabase.auth.updateUser(updates);
      if (error) throw error;
      setNewEmail('');
      setNewPassword('');
      setAccountMsg({ type: 'ok', text: newEmail ? 'Verifique seu novo e-mail para confirmar a alteração.' : 'Senha alterada com sucesso!' });
    } catch (err: unknown) {
      setAccountMsg({ type: 'err', text: err instanceof Error ? err.message : 'Erro ao atualizar' });
    } finally {
      setAccountSaving(false);
    }
  };

  const MODALITIES = ['MTT', 'CASH', 'SPINGO', 'SNG'] as const;

  return (
    <div
      className="fixed inset-0 z-[450] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-[#0d1117] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center">
              <User size={14} className="text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-black text-white">{user.name.split(' ')[0]}</p>
              <p className="text-[10px] text-slate-500">{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5">
          {([
            { key: 'profile', label: 'Perfil',         icon: <User  size={11} /> },
            { key: 'account', label: 'Conta',           icon: <Mail  size={11} /> },
            { key: 'shared',  label: 'Compartilhadas',  icon: <Link2 size={11} /> },
          ] as const).map(({ key, label, icon }) => (
            <button
              key={key} onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[10px] font-black uppercase tracking-widest transition-colors border-b-2 ${tab === key ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
            >
              {icon}{label}
            </button>
          ))}
        </div>

        {/* ── Profile Tab ── */}
        {tab === 'profile' && (
          <div className="p-5 space-y-4">
            {profileLoading ? (
              <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-slate-500" /></div>
            ) : (
              <>
                {/* Name */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Nome</label>
                  <input
                    value={profile.full_name}
                    onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                {/* Modality */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Modalidade</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {MODALITIES.map(m => (
                      <button
                        key={m}
                        onClick={() => setProfile(p => ({ ...p, modality: p.modality === m ? '' : m }))}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border transition-all ${profile.modality === m ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Team */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Jogo em time?</label>
                  <div className="flex gap-2 mb-2">
                    {[true, false].map(v => (
                      <button
                        key={String(v)}
                        onClick={() => setProfile(p => ({ ...p, plays_for_team: v }))}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase border transition-all ${profile.plays_for_team === v ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
                      >
                        {v ? 'Sim' : 'Não'}
                      </button>
                    ))}
                  </div>
                  {profile.plays_for_team && (
                    <input
                      value={profile.team_name}
                      onChange={e => setProfile(p => ({ ...p, team_name: e.target.value }))}
                      placeholder="Nome do time"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50"
                    />
                  )}
                </div>

                {/* Nick */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Nick nos sites</label>
                  <input
                    value={profile.poker_nick}
                    onChange={e => setProfile(p => ({ ...p, poker_nick: e.target.value }))}
                    placeholder="Ex: HeroPlayer88, TheJediMonk..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                {profileMsg && (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] ${profileMsg.type === 'ok' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    {profileMsg.type === 'ok' ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
                    {profileMsg.text}
                  </div>
                )}

                <button
                  onClick={saveProfile} disabled={profileSaving}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl text-[11px] font-black uppercase tracking-widest text-white transition-all flex items-center justify-center gap-2"
                >
                  {profileSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  Salvar Perfil
                </button>
              </>
            )}
          </div>
        )}

        {/* ── Account Tab ── */}
        {tab === 'account' && (
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">E-mail atual</label>
              <div className="text-sm text-slate-400 bg-white/5 border border-white/5 rounded-lg px-3 py-2">{user.email}</div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                <Mail size={9} className="inline mr-1" />Novo e-mail (opcional)
              </label>
              <input
                type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                placeholder="novo@email.com"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                <Lock size={9} className="inline mr-1" />Nova senha (opcional)
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  placeholder="mínimo 6 caracteres"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 pr-9 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50"
                />
                <button
                  type="button" onClick={() => setShowPw(p => !p)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

            {accountMsg && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] ${accountMsg.type === 'ok' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                {accountMsg.type === 'ok' ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
                {accountMsg.text}
              </div>
            )}

            <button
              onClick={saveAccount}
              disabled={accountSaving || (!newEmail && !newPassword)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-xl text-[11px] font-black uppercase tracking-widest text-white transition-all flex items-center justify-center gap-2"
            >
              {accountSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Salvar Alterações
            </button>
          </div>
        )}

        {/* ── Shared Hands Tab ── */}
        {tab === 'shared' && (
          <div className="p-5">
            {sharedLoading ? (
              <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-slate-500" /></div>
            ) : sharedHands.length === 0 ? (
              <div className="text-center py-8 text-slate-600 text-[11px]">
                <Link2 size={24} className="mx-auto mb-2 opacity-30" />
                Nenhuma mão compartilhada ainda.<br />
                Use o botão SHARE na barra inferior do replayer.
              </div>
            ) : (
              <div className="space-y-2">
                {sharedHands.map(h => (
                  <div key={h.id} className="flex items-center gap-2 bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-white truncate">{h.title ?? 'Mão'}</p>
                      <p className="text-[9px] text-slate-500">{fmtDateTime(h.created_at)}</p>
                    </div>
                    <button
                      onClick={() => copyShareLink(h.id)}
                      className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all ${copiedShareId === h.id ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
                    >
                      <Link2 size={10} />{copiedShareId === h.id ? 'OK!' : 'Link'}
                    </button>
                    <button
                      onClick={() => deleteShared(h.id)}
                      className="shrink-0 p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 border border-white/5 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileModal;
