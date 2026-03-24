
import { HandAnnotation } from '../types';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

function getApiKey(): string {
  // Exposed via vite.config.ts define block
  const key = (process.env.GEMINI_API_KEY as string) || '';
  if (!key) throw new Error('GEMINI_API_KEY não configurada no .env');
  return key;
}

function buildPrompt(annotations: HandAnnotation[]): string {
  const coachNotes = annotations
    .filter(a => (a.author_role === 'coach' || a.author_role === 'owner') && a.text.trim().length > 0);

  if (coachNotes.length === 0) throw new Error('Nenhuma anotação de coach com texto encontrada.');

  const formatted = coachNotes.map((ann, i) => {
    const parts: string[] = [`Mão ${i + 1}`];
    if (ann.street && ann.street !== 'GENERAL') parts.push(`(${ann.street})`);
    if (ann.severity === 'warning')  parts.push('[ATENÇÃO]');
    if (ann.severity === 'critical') parts.push('[CRÍTICO]');
    if (ann.tags?.length > 0)        parts.push(`Tags: ${ann.tags.join(', ')}`);
    parts.push(`"${ann.text.trim()}"`);
    return parts.join(' — ');
  }).join('\n\n');

  const critical = coachNotes.filter(a => a.severity === 'critical').length;
  const warning  = coachNotes.filter(a => a.severity === 'warning').length;
  const streets  = [...new Set(coachNotes.map(a => a.street).filter(s => s && s !== 'GENERAL'))];

  return `Você é um assistente especializado em análise de poker para treinamento de jogadores de torneios.

Abaixo estão ${coachNotes.length} anotações de um coach revisando a sessão de um aluno.
Estatísticas: ${critical} críticas, ${warning} alertas, streets comentadas: ${streets.join(', ') || 'geral'}.

Produza um relatório em português, estruturado com markdown, contendo exatamente estas seções:

## 📋 Resumo da Sessão
(2-3 frases concisas sobre os temas principais da revisão)

## 🔴 Problemas Críticos
(apenas erros marcados como críticos ou que aparecem em 3+ mãos — seja específico, cite streets e situações)

## ⚠️ Padrões a Corrigir
(agrupe erros recorrentes por categoria: sizing, frequência, seleção de mãos, posição, etc.)

## ✅ Pontos Positivos
(se o coach elogiou algo, destaque — se não houver, omita esta seção)

## 🎯 Plano de Estudo Semanal
(exatamente 5 ações concretas e mensuráveis que o aluno deve trabalhar, em ordem de prioridade)

---
Regras:
- Use terminologia de poker (cbet, 3bet, SPR, equity, EV, etc.) quando adequado
- Seja direto e prático — o aluno quer saber o que fazer, não teorias longas
- Se um problema se repete, diga claramente quantas vezes apareceu
- Cada item do plano de estudo deve ter uma ação específica (ex: "Estude ranges de open em CO com 20-30bb usando solver")

ANOTAÇÕES DO COACH:
${formatted}`;
}

export async function generateCoachSummary(
  annotations: HandAnnotation[],
  onChunk?: (text: string) => void
): Promise<string> {
  const key    = getApiKey();
  const prompt = buildPrompt(annotations);

  // Use streaming if callback provided
  if (onChunk) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.65, maxOutputTokens: 2000 },
        }),
      }
    );

    if (!res.ok || !res.body) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any)?.error?.message ?? `Erro ${res.status}`);
    }

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let full = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      // SSE: each line is "data: {...}" or empty
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const json = line.slice(6).trim();
        if (!json || json === '[DONE]') continue;
        try {
          const parsed = JSON.parse(json);
          const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
          if (text) { full += text; onChunk(full); }
        } catch { /* partial chunk, skip */ }
      }
    }
    return full;
  }

  // Non-streaming fallback
  const res = await fetch(`${GEMINI_URL}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.65, maxOutputTokens: 2000 },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message ?? `Erro ${res.status}`);
  }

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Sem resposta da IA.';
}
