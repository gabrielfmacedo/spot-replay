
import React, { useState, useCallback, useRef } from 'react';
import { X, Sparkles, Copy, Check, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { HandAnnotation } from '../types';
import { generateCoachSummary } from '../services/aiService';

interface CoachSummaryModalProps {
  sessionName: string;
  annotations: HandAnnotation[];
  onClose: () => void;
}

// ── Lightweight markdown → JSX renderer ───────────────────────────────────────
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // H2: ## Title
    if (line.startsWith('## ')) {
      nodes.push(
        <h2 key={key++} className="text-[13px] font-black text-white mt-5 mb-2 flex items-center gap-2">
          {line.slice(3)}
        </h2>
      );
      continue;
    }

    // H3: ### Title
    if (line.startsWith('### ')) {
      nodes.push(
        <h3 key={key++} className="text-[11px] font-black text-slate-300 mt-3 mb-1 uppercase tracking-wide">
          {line.slice(4)}
        </h3>
      );
      continue;
    }

    // Horizontal rule ---
    if (line.trim() === '---') {
      nodes.push(<hr key={key++} className="border-white/10 my-4" />);
      continue;
    }

    // Bullet: - item or * item
    if (line.match(/^[-*] /)) {
      const content = line.slice(2);
      nodes.push(
        <div key={key++} className="flex gap-2 mb-1.5">
          <span className="text-blue-400 font-black mt-0.5 shrink-0">•</span>
          <span className="text-[11px] text-slate-300 leading-relaxed">{inlineMarkdown(content)}</span>
        </div>
      );
      continue;
    }

    // Numbered: 1. item
    if (line.match(/^\d+\. /)) {
      const match = line.match(/^(\d+)\. (.+)/);
      if (match) {
        nodes.push(
          <div key={key++} className="flex gap-2 mb-1.5">
            <span className="text-blue-400 font-black text-[10px] mt-0.5 shrink-0 w-4">{match[1]}.</span>
            <span className="text-[11px] text-slate-300 leading-relaxed">{inlineMarkdown(match[2])}</span>
          </div>
        );
        continue;
      }
    }

    // Empty line
    if (line.trim() === '') {
      nodes.push(<div key={key++} className="h-1" />);
      continue;
    }

    // Regular paragraph
    nodes.push(
      <p key={key++} className="text-[11px] text-slate-300 leading-relaxed mb-1">
        {inlineMarkdown(line)}
      </p>
    );
  }

  return nodes;
}

// Inline: **bold**, *italic*, `code`
function inlineMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0;
  let match;
  let k = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[2]) parts.push(<strong key={k++} className="text-white font-black">{match[2]}</strong>);
    else if (match[3]) parts.push(<em key={k++} className="text-slate-200 italic">{match[3]}</em>);
    else if (match[4]) parts.push(<code key={k++} className="text-emerald-400 bg-emerald-500/10 px-1 rounded text-[10px]">{match[4]}</code>);
    last = match.index + match[0].length;
  }

  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

// ── Component ─────────────────────────────────────────────────────────────────
const CoachSummaryModal: React.FC<CoachSummaryModalProps> = ({
  sessionName, annotations, onClose,
}) => {
  const [status, setStatus]   = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [result, setResult]   = useState('');
  const [error, setError]     = useState('');
  const [copied, setCopied]   = useState(false);
  const scrollRef             = useRef<HTMLDivElement>(null);

  const coachCount = annotations.filter(
    a => (a.author_role === 'coach' || a.author_role === 'owner') && a.text.trim()
  ).length;

  const generate = useCallback(async () => {
    setStatus('loading');
    setResult('');
    setError('');
    try {
      await generateCoachSummary(annotations, (chunk) => {
        setResult(chunk);
        // Auto-scroll
        requestAnimationFrame(() => {
          if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        });
      });
      setStatus('done');
    } catch (e: any) {
      setError(e.message ?? 'Erro ao gerar resumo.');
      setStatus('error');
    }
  }, [annotations]);

  const copyText = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-2xl bg-[#07090f] border border-white/10 rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center">
              <Sparkles size={15} className="text-white" />
            </div>
            <div>
              <h2 className="text-[13px] font-black uppercase text-white tracking-wide">Resumo IA do Coach</h2>
              <p className="text-[9px] text-slate-500 truncate max-w-[300px]">{sessionName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {status === 'done' && (
              <button onClick={copyText}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all ${copied ? 'bg-emerald-600 text-white' : 'bg-white/10 text-slate-300 hover:bg-white/20'}`}>
                {copied ? <Check size={11} /> : <Copy size={11} />}
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 min-h-0">

          {/* Idle state */}
          {status === 'idle' && (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600/20 to-blue-600/20 border border-violet-500/20 flex items-center justify-center">
                <Sparkles size={28} className="text-violet-400" />
              </div>
              <div>
                <p className="text-white font-black text-sm mb-1">Resumo Inteligente</p>
                <p className="text-slate-500 text-[11px] leading-relaxed max-w-sm">
                  A IA vai analisar as <span className="text-amber-400 font-black">{coachCount} anotações</span> do coach
                  e gerar um relatório com padrões, erros recorrentes e um plano de estudo personalizado.
                </p>
              </div>
              {coachCount === 0 ? (
                <div className="flex items-center gap-2 text-amber-400 text-[10px] font-black">
                  <AlertCircle size={13} />
                  Nenhuma anotação de coach com texto encontrada.
                </div>
              ) : (
                <button onClick={generate}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 rounded-2xl text-[11px] font-black uppercase text-white transition-all shadow-lg shadow-violet-500/20 active:scale-95">
                  <Sparkles size={14} />
                  Gerar Resumo com IA
                </button>
              )}
            </div>
          )}

          {/* Loading / streaming */}
          {status === 'loading' && (
            <div>
              {result ? (
                <div className="space-y-0.5">
                  {renderMarkdown(result)}
                  <span className="inline-block w-1.5 h-4 bg-blue-400 animate-pulse rounded-sm ml-0.5 align-middle" />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <Loader2 size={28} className="animate-spin text-violet-400" />
                  <p className="text-slate-500 text-[11px]">Analisando anotações...</p>
                </div>
              )}
            </div>
          )}

          {/* Done */}
          {status === 'done' && result && (
            <div className="space-y-0.5">
              {renderMarkdown(result)}
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <div className="flex items-center gap-2 text-red-400 text-[11px] font-bold bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <AlertCircle size={14} /> {error}
              </div>
              <button onClick={generate}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase text-white transition-all">
                <RefreshCw size={12} /> Tentar Novamente
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {status === 'done' && (
          <div className="px-6 py-3 border-t border-white/5 shrink-0 flex items-center justify-between">
            <p className="text-[8px] text-slate-600">Gerado por Gemini · {coachCount} anotações analisadas</p>
            <button onClick={generate}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-[9px] font-black uppercase text-slate-400 hover:text-white transition-all">
              <RefreshCw size={11} /> Regerar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CoachSummaryModal;
