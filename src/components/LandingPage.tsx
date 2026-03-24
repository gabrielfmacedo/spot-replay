import React, { useState, useRef, useEffect } from 'react';
import {
  RotateCcw, Play, Sparkles, ChevronRight, ChevronLeft,
  Eye, EyeOff, Loader2, AlertCircle, CheckCircle2,
  Layers, MessageSquare, BarChart2, Globe,
} from 'lucide-react';
import { supabase } from '../services/supabase';

interface LandingPageProps {
  onSuccess: (user: { id: string; email: string; name: string }) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2)  return digits;
  if (digits.length <= 7)  return `(${digits.slice(0,2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
}

function storeRemember(mode: '7d' | 'always') {
  localStorage.setItem('spot_replay_remember', mode);
  localStorage.setItem('spot_replay_session_set_at', String(Date.now()));
}

// ─── Small building blocks ─────────────────────────────────────────────────────

const Logo = () => (
  <div className="flex items-center gap-2.5">
    <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
      <RotateCcw size={16} className="text-white" />
    </div>
    <span className="text-[15px] font-black uppercase italic tracking-tight text-white">
      SPOT <span className="text-blue-500">REPLAY</span>
    </span>
  </div>
);

const StatBadge = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col items-center gap-0.5">
    <span className="text-2xl font-black text-white">{value}</span>
    <span className="text-[10px] text-slate-500 uppercase tracking-widest">{label}</span>
  </div>
);

const FeatureCard = ({ icon, title, desc, accent }: {
  icon: React.ReactNode; title: string; desc: string; accent: string;
}) => (
  <div className="bg-white/[0.03] border border-white/8 rounded-3xl p-8 hover:border-white/15 hover:bg-white/[0.05] transition-all duration-400">
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${accent}`}>
      {icon}
    </div>
    <h3 className="text-[15px] font-black text-white mb-2">{title}</h3>
    <p className="text-[13px] text-slate-400 leading-relaxed">{desc}</p>
  </div>
);

const Step = ({ n, title, desc }: { n: string; title: string; desc: string }) => (
  <div className="flex gap-5">
    <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
      <span className="text-[13px] font-black text-blue-400">{n}</span>
    </div>
    <div>
      <p className="text-[14px] font-black text-white mb-1">{title}</p>
      <p className="text-[12px] text-slate-500 leading-relaxed">{desc}</p>
    </div>
  </div>
);

// ─── Register Form ────────────────────────────────────────────────────────────

interface RegisterFormProps {
  onSuccess: (user: { id: string; email: string; name: string }) => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) => {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [phone, setPhone]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [remember, setRemember] = useState<'7d' | 'always'>('7d');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [sent, setSent]         = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) { setError('Serviço indisponível. Configure as credenciais do Supabase.'); return; }
    setLoading(true); setError(null);
    try {
      const { data, error: err } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: name, phone: phone.replace(/\D/g, ''), source: 'landing' } },
      });
      if (err) throw err;
      if (data.session) {
        storeRemember(remember);
        const u = data.user!;
        onSuccess({ id: u.id, email: u.email ?? '', name: name || (u.email ?? '') });
      } else {
        setSent(true);
      }
    } catch (err: any) {
      const msg: string = err.message ?? '';
      if (msg.includes('already registered') || msg.includes('already exists'))
        setError('Este e-mail já está cadastrado. Use a opção de login.');
      else if (msg.includes('Password should'))
        setError('A senha deve ter pelo menos 6 caracteres.');
      else
        setError(msg || 'Erro ao criar conta. Tente novamente.');
    } finally { setLoading(false); }
  };

  if (sent) return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
        <CheckCircle2 size={26} className="text-emerald-400" />
      </div>
      <div>
        <p className="text-white font-black text-sm mb-1">Verifique seu e-mail</p>
        <p className="text-slate-500 text-[12px] leading-relaxed max-w-xs">
          Enviamos um link para <span className="text-slate-300 font-semibold">{email}</span>.
          Confirme e volte aqui para entrar.
        </p>
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">Nome completo</label>
        <input type="text" required value={name} onChange={e => setName(e.target.value)}
          placeholder="João Silva"
          className="w-full bg-black/50 border border-white/8 rounded-xl px-4 py-3 text-[13px] text-white placeholder:text-slate-600 outline-none focus:border-blue-500/60 transition-all" />
      </div>
      <div>
        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">E-mail</label>
        <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
          placeholder="joao@email.com"
          className="w-full bg-black/50 border border-white/8 rounded-xl px-4 py-3 text-[13px] text-white placeholder:text-slate-600 outline-none focus:border-blue-500/60 transition-all" />
      </div>
      <div>
        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">WhatsApp</label>
        <input type="tel" required value={phone} onChange={e => setPhone(formatPhone(e.target.value))}
          placeholder="(11) 99999-9999"
          className="w-full bg-black/50 border border-white/8 rounded-xl px-4 py-3 text-[13px] text-white placeholder:text-slate-600 outline-none focus:border-blue-500/60 transition-all" />
      </div>
      <div>
        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">Senha</label>
        <div className="relative">
          <input type={showPwd ? 'text' : 'password'} required value={password}
            onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6}
            className="w-full bg-black/50 border border-white/8 rounded-xl px-4 py-3 pr-11 text-[13px] text-white placeholder:text-slate-600 outline-none focus:border-blue-500/60 transition-all" />
          <button type="button" onClick={() => setShowPwd(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors">
            {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>
      <div>
        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Manter conectado</p>
        <div className="flex gap-2">
          {(['7d', 'always'] as const).map(opt => (
            <button key={opt} type="button" onClick={() => setRemember(opt)}
              className={`flex-1 py-2 rounded-xl text-[11px] font-black uppercase transition-all border ${remember === opt ? 'bg-blue-600/20 border-blue-500/50 text-blue-300' : 'bg-white/5 border-white/8 text-slate-500 hover:border-white/20 hover:text-slate-300'}`}>
              {opt === '7d' ? '7 dias' : 'Sempre'}
            </button>
          ))}
        </div>
      </div>
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
          <AlertCircle size={13} className="text-red-400 shrink-0" />
          <p className="text-[11px] text-red-300">{error}</p>
        </div>
      )}
      <button type="submit" disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-[13px] uppercase tracking-wide bg-blue-600 hover:bg-blue-500 disabled:opacity-60 transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]">
        {loading ? <Loader2 size={15} className="animate-spin" /> : <ChevronRight size={15} />}
        {loading ? 'Criando conta...' : 'Criar minha conta grátis'}
      </button>
    </form>
  );
};

// ─── Login Screen (full-page feel) ───────────────────────────────────────────

interface LoginScreenProps {
  onBack: () => void;
  onSuccess: (user: { id: string; email: string; name: string }) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onBack, onSuccess }) => {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [remember, setRemember] = useState<'7d' | 'always'>('7d');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) { setError('Serviço indisponível.'); return; }
    setLoading(true); setError(null);
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) throw err;
      storeRemember(remember);
      const u = data.user!;
      onSuccess({ id: u.id, email: u.email ?? '', name: u.user_metadata?.full_name ?? (u.email ?? '') });
    } catch (err: any) {
      const msg: string = err.message ?? '';
      if (msg.includes('Invalid login credentials'))
        setError('E-mail ou senha incorretos.');
      else
        setError(msg || 'Erro ao entrar. Tente novamente.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#02040a] flex flex-col">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-blue-600/8 rounded-full blur-[100px]" />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 border-b border-white/5 bg-[#02040a]/90 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo />
          <button onClick={onBack}
            className="flex items-center gap-1.5 text-[11px] font-black uppercase text-slate-400 hover:text-white transition-colors tracking-widest">
            <ChevronLeft size={14} /> Voltar
          </button>
        </div>
      </nav>

      {/* Centered login card */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-[#070c18] border border-white/10 rounded-[2rem] p-10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

            {/* Icon + title */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
                <RotateCcw size={24} className="text-white" />
              </div>
              <h1 className="text-[20px] font-black text-white mb-1">Bem-vindo de volta</h1>
              <p className="text-[12px] text-slate-500">Entre na sua conta para continuar</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">E-mail</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com" autoFocus
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3.5 text-[13px] text-white placeholder:text-slate-600 outline-none focus:border-blue-500/60 focus:bg-black/70 transition-all" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">Senha</label>
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} required value={password}
                    onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3.5 pr-11 text-[13px] text-white placeholder:text-slate-600 outline-none focus:border-blue-500/60 focus:bg-black/70 transition-all" />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors">
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Remember */}
              <div>
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Manter conectado</p>
                <div className="flex gap-2">
                  {(['7d', 'always'] as const).map(opt => (
                    <button key={opt} type="button" onClick={() => setRemember(opt)}
                      className={`flex-1 py-2 rounded-xl text-[11px] font-black uppercase transition-all border ${remember === opt ? 'bg-blue-600/20 border-blue-500/50 text-blue-300' : 'bg-white/5 border-white/8 text-slate-500 hover:border-white/20 hover:text-slate-300'}`}>
                      {opt === '7d' ? '7 dias' : 'Sempre'}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
                  <AlertCircle size={13} className="text-red-400 shrink-0" />
                  <p className="text-[11px] text-red-300">{error}</p>
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-black text-[13px] uppercase tracking-wide bg-blue-600 hover:bg-blue-500 disabled:opacity-60 transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98] mt-2">
                {loading ? <Loader2 size={15} className="animate-spin" /> : <ChevronRight size={15} />}
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            <p className="text-center text-[11px] text-slate-600 mt-6">
              Não tem conta?{' '}
              <button onClick={onBack} className="text-blue-400 hover:text-blue-300 font-black transition-colors">
                Criar gratuitamente
              </button>
            </p>
          </div>

          {/* Powered note */}
          <p className="text-center text-[10px] text-slate-700 mt-6">
            Spot Replay · Feito para jogadores brasileiros
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── Landing Page (register mode) ────────────────────────────────────────────

const LandingPage: React.FC<LandingPageProps> = ({ onSuccess }) => {
  const [showLogin, setShowLogin] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  // Allow body scroll while landing is mounted (index.css sets overflow:hidden for the app)
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'auto';
    return () => { document.body.style.overflow = prev || ''; };
  }, []);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Login mode → completely different screen
  if (showLogin) {
    return <LoginScreen onBack={() => setShowLogin(false)} onSuccess={onSuccess} />;
  }

  return (
    <div className="bg-[#02040a] text-slate-100 font-sans">

      {/* Background glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-blue-600/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[400px] bg-emerald-600/4 rounded-full blur-[100px]" />
        <div className="absolute top-16 left-12 text-[120px] text-white/[0.015] font-black leading-none select-none">♠</div>
        <div className="absolute top-48 right-20 text-[90px] text-red-500/[0.02] font-black leading-none select-none">♥</div>
        <div className="absolute bottom-32 left-1/4 text-[80px] text-blue-500/[0.02] font-black leading-none select-none">♦</div>
        <div className="absolute bottom-20 right-1/3 text-[100px] text-emerald-500/[0.015] font-black leading-none select-none">♣</div>
      </div>

      <div className="relative z-10">

        {/* ── Navbar ─────────────────────────────────────────────────── */}
        <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#02040a]/85 backdrop-blur-xl">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <Logo />
            <button onClick={() => setShowLogin(true)}
              className="flex items-center gap-1.5 text-[11px] font-black uppercase text-slate-400 hover:text-white transition-colors tracking-widest">
              Já tenho conta <ChevronRight size={13} />
            </button>
          </div>
        </nav>

        {/* ── Hero ───────────────────────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-6 pt-20 pb-32 grid lg:grid-cols-2 gap-16 items-center">
          {/* Copy */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-300">
                100% gratuito · sem download · direto no navegador
              </span>
            </div>

            <div>
              <h1 className="text-4xl lg:text-5xl font-black leading-[1.1] text-white mb-5">
                Revise suas mãos.<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                  Evolua de verdade.
                </span>
              </h1>
              <p className="text-[16px] text-slate-400 leading-relaxed max-w-lg">
                O replayer de poker profissional em português — sem pagar caro em dólar, sem instalar nada.
                Importe seu histórico, assista cada jogada animada na mesa e anote cada erro.
              </p>
            </div>

            <div className="flex gap-8 pt-2">
              <StatBadge value="5+" label="Sites suportados" />
              <div className="w-px bg-white/8" />
              <StatBadge value="100%" label="Gratuito" />
              <div className="w-px bg-white/8" />
              <StatBadge value="IA" label="Coach integrada" />
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {['PokerStars', 'GGPoker', '888 Poker', 'PartyPoker', 'Bodog'].map(site => (
                <span key={site} className="text-[10px] font-semibold text-slate-500 bg-white/5 border border-white/8 rounded-full px-3 py-1">
                  {site}
                </span>
              ))}
            </div>

            <p className="text-[12px] text-slate-600 italic">
              "Finalmente um replayer sério em português, sem mensalidade."
            </p>
          </div>

          {/* Register form card */}
          <div ref={formRef} className="lg:pl-8">
            <div className="bg-[#070c18] border border-white/10 rounded-[2rem] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.7)] relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />
              <div className="mb-7">
                <h2 className="text-[18px] font-black text-white mb-1">Criar conta gratuita</h2>
                <p className="text-[12px] text-slate-500">Sem cartão. Sem dólar. Comece em 30 segundos.</p>
              </div>
              <RegisterForm onSuccess={onSuccess} />
              <p className="text-center text-[11px] text-slate-600 mt-4">
                Já tem conta?{' '}
                <button onClick={() => setShowLogin(true)}
                  className="text-blue-400 hover:text-blue-300 font-black transition-colors">
                  Fazer login
                </button>
              </p>
            </div>
          </div>
        </section>

        {/* ── Features ───────────────────────────────────────────────── */}
        <section className="border-t border-white/5 bg-white/[0.01]">
          <div className="max-w-6xl mx-auto px-6 py-24">
            <div className="text-center mb-14">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-3">O que você ganha</p>
              <h2 className="text-[28px] font-black text-white">
                Tudo que você precisa para evoluir no poker
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <FeatureCard icon={<Play size={22} className="text-blue-400" />}
                accent="bg-blue-500/15 border border-blue-500/20"
                title="Replay visual na mesa"
                desc="Importe qualquer histórico e assista cada ação animada em uma mesa profissional, street por street, com velocidade ajustável." />
              <FeatureCard icon={<MessageSquare size={22} className="text-emerald-400" />}
                accent="bg-emerald-500/15 border border-emerald-500/20"
                title="Anotações por street"
                desc="Anote erros e insights fixados em Pré-flop, Flop, Turn e River. Com tags, severidade e pin no step exato da ação." />
              <FeatureCard icon={<Sparkles size={22} className="text-violet-400" />}
                accent="bg-violet-500/15 border border-violet-500/20"
                title="Resumo inteligente com IA"
                desc="A IA analisa as anotações, identifica padrões, erros recorrentes e gera um plano de estudo personalizado para você." />
              <FeatureCard icon={<Globe size={22} className="text-orange-400" />}
                accent="bg-orange-500/15 border border-orange-500/20"
                title="Multi-site"
                desc="Suporta PokerStars, GGPoker, 888 Poker, PartyPoker e Bodog. Cole o histórico de qualquer formato." />
              <FeatureCard icon={<Layers size={22} className="text-sky-400" />}
                accent="bg-sky-500/15 border border-sky-500/20"
                title="Sessões de estudo"
                desc="Agrupe mãos, filtre por posição, stack e resultado do herói. Encontre exatamente o spot que quer revisar." />
              <FeatureCard icon={<BarChart2 size={22} className="text-pink-400" />}
                accent="bg-pink-500/15 border border-pink-500/20"
                title="Pot Odds & Range Builder"
                desc="Calcule pot odds em tempo real durante o replay e construa ranges com o editor visual integrado." />
            </div>

            {/* App preview screenshot — full width below features */}
            <div className="mt-16 rounded-2xl overflow-hidden border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.8)]">
              <img
                src="/app-preview.png"
                alt="Spot Replay — replayer de poker"
                className="w-full h-auto block"
              />
            </div>
          </div>
        </section>

        {/* ── How it works ───────────────────────────────────────────── */}
        <section className="border-t border-white/5">
          <div className="max-w-3xl mx-auto px-6 py-24">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-4 text-center">Como funciona</p>
            <h2 className="text-[26px] font-black text-white mb-10 text-center">Em menos de 1 minuto você já está estudando</h2>
            <div className="space-y-7">
              <Step n="1" title="Cole o histórico de mãos"
                desc="Exporte o .txt do seu cliente (PokerStars, GGPoker etc.) e cole ou importe direto no Spot Replay." />
              <Step n="2" title="Escolha a mão e assista"
                desc="Navegue pelas mãos, use o player para avançar ação por ação ou ir direto para o showdown." />
              <Step n="3" title="Anote, compartilhe e evolua"
                desc="Registre seus erros por street, compartilhe com seu coach e receba feedback com anotações em tempo real." />
            </div>
          </div>
        </section>

        {/* ── Bottom CTA ─────────────────────────────────────────────── */}
        <section className="border-t border-white/5 bg-gradient-to-b from-blue-950/10 to-transparent">
          <div className="max-w-2xl mx-auto px-6 py-24 text-center">
            <h2 className="text-[30px] font-black text-white mb-4">Pronto para estudar de verdade?</h2>
            <p className="text-[14px] text-slate-500 mb-10 leading-relaxed">
              Gratuito. Sem cartão de crédito. Sem dólar. Direto no navegador.
            </p>
            <button onClick={scrollToForm}
              className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black text-[14px] uppercase tracking-wide transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98]">
              <RotateCcw size={16} /> Criar conta gratuita
            </button>
          </div>
        </section>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <footer className="border-t border-white/5 py-10 px-6">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <Logo />
            <p className="text-[10px] text-slate-700">
              © {new Date().getFullYear()} Spot Replay · Feito para jogadores brasileiros
            </p>
          </div>
        </footer>

      </div>
    </div>
  );
};

export default LandingPage;
