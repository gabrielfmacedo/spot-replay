
import React, { useState } from 'react';
import { X, Mail, Lock, User, Loader2, RotateCcw, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabase';

interface AuthModalProps {
  onSuccess: (user: { id: string; email: string; name: string }) => void;
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ onSuccess, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [sent, setSent]       = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) { setError('Supabase não configurado.'); return; }
    setLoading(true); setError(null);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const u = data.user!;
        onSuccess({ id: u.id, email: u.email ?? '', name: (u.user_metadata?.full_name ?? u.email) ?? '' });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
        if (data.session) {
          const u = data.user!;
          onSuccess({ id: u.id, email: u.email ?? '', name: name || (u.email ?? '') });
        } else {
          setSent(true);
        }
      }
    } catch (err: any) {
      setError(err.message ?? 'Erro na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-6"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm bg-[#0a0f1a] border border-white/10 rounded-[2rem] p-8 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-colors">
          <X size={16} />
        </button>

        {/* Logo */}
        <div className="flex flex-col items-center mb-7">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center mb-3">
            <RotateCcw size={20} className="text-white" />
          </div>
          <h2 className="text-base font-black uppercase italic text-white">SPOT <span className="text-blue-500">REPLAY</span></h2>
          <p className="text-[8px] text-slate-500 uppercase tracking-widest mt-1">Análise colaborativa</p>
        </div>

        {sent ? (
          <div className="text-center py-4">
            <p className="text-emerald-400 font-black text-sm">Verifique seu e-mail!</p>
            <p className="text-slate-500 text-[10px] mt-2">Clique no link enviado para confirmar a conta.</p>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              {(['Login', 'Cadastro'] as const).map((tab, i) => (
                <button
                  key={tab}
                  onClick={() => { setIsLogin(i === 0); setError(null); }}
                  className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${(i === 0) === isLogin ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-500 hover:text-white'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {!isLogin && (
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text" required value={name} onChange={e => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-9 pr-4 text-[11px] text-white outline-none focus:border-blue-500/50 transition-colors"
                  />
                </div>
              )}

              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-9 pr-4 text-[11px] text-white outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>

              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-9 pr-4 text-[11px] text-white outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[10px] font-bold">
                  <AlertCircle size={13} /> {error}
                </div>
              )}

              <button
                type="submit" disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl font-black text-white text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : (isLogin ? 'Entrar' : 'Criar Conta')}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
