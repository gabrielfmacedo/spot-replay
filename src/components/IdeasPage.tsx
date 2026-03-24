import React, { useState, useEffect, useCallback } from 'react';
import { X, Lightbulb, Send, ChevronUp, Loader2, RefreshCw } from 'lucide-react';
import { fetchIdeas, submitIdea, upsertVote, deleteVote, type Idea } from '../services/ideasService';

interface Props {
  currentUser: { id: string; name: string } | null;
  onClose: () => void;
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  open:     { label: 'Aberta',    cls: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  planned:  { label: 'Planejada', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  done:     { label: 'Feita',     cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  rejected: { label: 'Recusada',  cls: 'bg-red-500/15 text-red-400 border-red-500/20' },
};

const IdeasPage: React.FC<Props> = ({ currentUser, onClose }) => {
  const [ideas, setIdeas]           = useState<Idea[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [votingId, setVotingId]     = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm]     = useState(false);
  const [title, setTitle]           = useState('');
  const [desc, setDesc]             = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchIdeas(currentUser?.id ?? null);
      setIdeas(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar ideias');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { load(); }, [load]);

  const handleVote = async (idea: Idea, points: number) => {
    if (!currentUser) return;
    setVotingId(idea.id);
    try {
      if (idea.my_vote === points) {
        await deleteVote(idea.id, currentUser.id);
      } else {
        await upsertVote(idea.id, currentUser.id, points);
      }
      await load();
    } catch {
      // silently ignore vote error
    } finally {
      setVotingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (title.trim().length < 5) { setSubmitErr('Título muito curto (mínimo 5 caracteres)'); return; }
    setSubmitting(true);
    setSubmitErr(null);
    try {
      await submitIdea(currentUser.id, currentUser.name, title, desc);
      setTitle('');
      setDesc('');
      setShowForm(false);
      await load();
    } catch (e: unknown) {
      setSubmitErr(e instanceof Error ? e.message : 'Erro ao enviar ideia');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-md flex flex-col">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-6 border-b border-white/10 bg-black/60 shrink-0">
        <div className="flex items-center gap-3">
          <Lightbulb size={16} className="text-amber-400" />
          <span className="text-sm font-black uppercase tracking-widest text-white">Ideias da Comunidade</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} title="Atualizar" className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
            <RefreshCw size={14} />
          </button>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

          {/* Submit banner / form */}
          {currentUser ? (
            showForm ? (
              <form onSubmit={handleSubmit} className="bg-[#0a0f1a] border border-white/10 rounded-2xl p-5 space-y-3">
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Nova ideia</p>
                <div>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Título da sua ideia (min. 5 caracteres)"
                    maxLength={120}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-[13px] font-bold text-white placeholder:text-slate-600 outline-none focus:border-blue-500/50 transition-colors"
                  />
                </div>
                <div>
                  <textarea
                    value={desc}
                    onChange={e => setDesc(e.target.value)}
                    placeholder="Descreva sua ideia com mais detalhes (opcional)..."
                    maxLength={1000}
                    rows={3}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-[13px] text-white placeholder:text-slate-600 outline-none focus:border-blue-500/50 transition-colors resize-none"
                  />
                  <p className="text-[9px] text-slate-600 text-right mt-0.5">{desc.length}/1000</p>
                </div>
                {submitErr && <p className="text-[11px] text-red-400">{submitErr}</p>}
                <div className="flex gap-2">
                  <button type="submit" disabled={submitting}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-[11px] font-black uppercase text-white transition-colors disabled:opacity-50">
                    {submitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                    Enviar
                  </button>
                  <button type="button" onClick={() => { setShowForm(false); setSubmitErr(null); }}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[11px] font-black uppercase text-slate-400 transition-colors">
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <button onClick={() => setShowForm(true)}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 rounded-2xl text-[11px] font-black uppercase text-amber-400 transition-colors">
                <Lightbulb size={13} /> Sugerir uma nova ideia
              </button>
            )
          ) : (
            <div className="text-center py-3 text-[11px] text-slate-500">Faça login para enviar e votar em ideias.</div>
          )}

          {/* Error */}
          {error && (
            <div className="text-center py-4 text-[11px] text-red-400">{error}</div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 size={20} className="animate-spin text-slate-600" />
            </div>
          )}

          {/* Ideas list */}
          {!loading && ideas.length === 0 && !error && (
            <div className="text-center py-12 text-slate-600 text-[13px]">Nenhuma ideia ainda. Seja o primeiro!</div>
          )}

          {!loading && ideas.map(idea => (
            <div key={idea.id} className="bg-[#0a0f1a] border border-white/10 rounded-2xl p-4 flex gap-4">
              {/* Vote column */}
              <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                <div className="flex flex-col gap-0.5">
                  {[5, 4, 3, 2, 1].map(p => (
                    <button
                      key={p}
                      disabled={!currentUser || votingId === idea.id}
                      onClick={() => handleVote(idea, p)}
                      title={`Dar ${p} ponto${p > 1 ? 's' : ''}`}
                      className={`w-7 h-5 rounded text-[9px] font-black transition-all border ${
                        idea.my_vote === p
                          ? 'bg-amber-500 border-amber-400 text-black'
                          : 'bg-white/5 border-white/10 text-slate-500 hover:border-amber-500/40 hover:text-amber-400'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <div className="text-center mt-1">
                  <div className="text-[14px] font-black text-white leading-none">{idea.total_points}</div>
                  <div className="text-[8px] text-slate-600 leading-none mt-0.5">{idea.vote_count} {idea.vote_count === 1 ? 'voto' : 'votos'}</div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 mb-1">
                  <p className="text-[13px] font-black text-white flex-1">{idea.title}</p>
                  <span className={`shrink-0 text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${STATUS_BADGE[idea.status]?.cls ?? ''}`}>
                    {STATUS_BADGE[idea.status]?.label}
                  </span>
                </div>
                {idea.description && (
                  <p className="text-[11px] text-slate-400 leading-relaxed mb-2">{idea.description}</p>
                )}
                <div className="flex items-center gap-2 text-[9px] text-slate-600">
                  <ChevronUp size={10} />
                  <span>{idea.author_name}</span>
                  <span>·</span>
                  <span>{new Date(idea.created_at).toLocaleDateString('pt-BR')}</span>
                  {idea.my_vote && (
                    <><span>·</span><span className="text-amber-500">Seu voto: {idea.my_vote}pt</span></>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer tip */}
      <div className="h-10 flex items-center justify-center border-t border-white/5 bg-black/40 shrink-0">
        <p className="text-[9px] text-slate-600">Cada usuário pode dar de 1 a 5 pontos por ideia · Clique no número para votar ou remover o voto</p>
      </div>
    </div>
  );
};

export default IdeasPage;
