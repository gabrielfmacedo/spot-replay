# Sistema Colaborativo de Análise — Plano de Implementação

## Conceito

Coach sobe um arquivo de hand history → compartilha com aluno por e-mail →
ambos abrem a mesma sessão → coach adiciona anotações em cada mão →
aluno vê em tempo real, com destaque "nota do coach".

O aluno também pode adicionar suas próprias notas. Ambos veem as anotações
do outro, separadas por cor/autor.

---

## Arquitetura

```
Supabase Auth
  └─ replay_sessions       (hand histories na nuvem)
       └─ session_members  (coach, student, roles)
       └─ hand_annotations (notas por mão, por autor)
                 └─ Realtime subscription → sync ao vivo
```

### Fluxo completo

1. Coach cria conta / faz login
2. Importa arquivo → clica "Salvar na nuvem" → cria `replay_session`
3. Clica "Compartilhar" → digita e-mail do aluno → cria `session_member` (pending)
4. Aluno recebe e-mail com link `spot-replay.com/session/{id}` → cria conta → aceita
5. Ambos abrem a sessão → navegam pelas mãos
6. Coach escreve nota em qualquer mão → `hand_annotations` INSERT
7. Supabase Realtime dispara → aluno vê a nota aparecer instantaneamente
8. Aluno responde com sua própria nota → coach vê em tempo real

---

## Database (já criado em migration_collab.sql)

| Tabela             | Descrição                                     |
|--------------------|-----------------------------------------------|
| `replay_sessions`  | JSON das mãos + owner + nome                  |
| `session_members`  | Usuários com acesso + role + status            |
| `hand_annotations` | Notas por mão, autor, tags, starred            |

### Roles
- **coach**: pode convidar, anotar, ver tudo
- **student**: pode anotar (se `can_annotate=true`), vê tudo

---

## Componentes a criar

### 1. `AuthModal.tsx` (atualizar Auth.tsx existente)
- Login / Cadastro com e-mail + senha
- "Entrar com Google" (opcional, via Supabase OAuth)
- Persiste sessão no localStorage via Supabase SDK

### 2. `SessionManager.tsx`
Modal de gerenciamento de sessões cloud:
- Aba "Minhas Sessões" — lista de `replay_sessions` onde `owner_id = me`
  - Botão "Abrir", "Renomear", "Excluir"
  - Botão "Compartilhar" → abre ShareModal
- Aba "Compartilhadas comigo" — `session_members` onde `user_id = me AND status = accepted`
  - Badge de role (COACH / STUDENT)
  - Botão "Abrir"
- Botão "Salvar sessão atual" → sobe a sessão em memória para a nuvem

### 3. `ShareSessionModal.tsx`
- Campo de e-mail do convidado
- Seletor de role (Coach / Student)
- Toggle "Pode anotar?" (padrão: true)
- Lista de membros atuais com botão de remover
- Copia link de convite para clipboard

### 4. `CollabNotesPanel.tsx`
Substitui/estende HandNotes quando a sessão é cloud:
- Mostra **todas** as anotações da mão atual agrupadas por autor
- Aba "Minhas notas" | Aba "Notas do coach/aluno"
- Cada nota exibe: avatar inicial, nome, role badge, tags, texto
- Badge "COACH" amarelo-ouro | Badge "STUDENT" azul
- Textarea para nova nota (salva em Supabase no onChange debounced)
- Real-time: subscription a `hand_annotations` filtrada por `session_id`

### 5. `useCollabSession.ts` (hook)
```ts
interface CollabSession {
  session: ReplaySession | null;
  members: SessionMember[];
  annotations: Record<string, HandAnnotation[]>; // handKey → notas
  myRole: 'owner' | 'coach' | 'student' | null;
  saveSession: (hands: HandHistory[], name: string) => Promise<void>;
  updateAnnotation: (handKey: string, note: Partial<HandAnnotation>) => Promise<void>;
  inviteMember: (email: string, role: string) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  subscribeToAnnotations: () => () => void; // returns unsubscribe fn
}
```

---

## Mudanças em App.tsx

### Estado novo
```ts
const [user, setUser] = useState<User | null>(null);
const [cloudSession, setCloudSession] = useState<ReplaySession | null>(null);
const [showSessionManager, setShowSessionManager] = useState(false);
const [showShareModal, setShowShareModal] = useState(false);
const [collabAnnotations, setCollabAnnotations] = useState<Record<string, HandAnnotation[]>>({});
```

### Header
- Avatar do usuário (iniciais) no canto direito quando logado
- Botão "LOGIN" quando não logado
- Botão "CLOUD" → abre SessionManager quando logado
- Badge de "sessão compartilhada" quando cloudSession ativo

### Sidebar
- Indicador de sessão cloud no topo: "📡 Compartilhada com 2 pessoas"
- Anotações do coach aparecem com borda dourada nas hand cards

### Notas
- Quando cloudSession ativo: HandNotes lê/escreve no Supabase
- Quando offline: comportamento atual (localStorage)
- CollabNotesPanel mostra notas de todos os participantes

---

## API / Serviços

### `src/services/collabService.ts`
```ts
// Criar sessão
export async function createSession(hands: HandHistory[], name: string): Promise<ReplaySession>

// Buscar sessões do usuário
export async function getMySessions(): Promise<ReplaySession[]>

// Buscar sessões compartilhadas comigo
export async function getSharedSessions(): Promise<ReplaySession[]>

// Carregar sessão completa (hands + members + annotations)
export async function loadSession(sessionId: string): Promise<{
  session: ReplaySession;
  members: SessionMember[];
  annotations: HandAnnotation[];
}>

// Convidar membro
export async function inviteMember(sessionId: string, email: string, role: string): Promise<void>

// Salvar/atualizar anotação
export async function upsertAnnotation(
  sessionId: string,
  handKey: string,
  note: { text: string; tags: string[]; starred: boolean }
): Promise<void>

// Subscribe Realtime
export function subscribeToAnnotations(
  sessionId: string,
  onUpdate: (annotation: HandAnnotation) => void
): RealtimeChannel
```

---

## UX Detail — Notas Colaborativas

```
┌─────────────────────────────────────────┐
│ Mão #47 · AKo · BTN                    │
├─────────────────────────────────────────┤
│ 🟡 COACH — gabrielf                     │
│ ┌─────────────────────────────────────┐ │
│ │ Essa bet sizing tá pequena demais  │ │
│ │ no flop paired. Villain vai sempre │ │
│ │ continuar com Jx.                  │ │
│ └─────────────────────────────────────┘ │
│ Tags: [Erro] [Spot]                    │
│                                         │
│ 🔵 STUDENT — marcelo                   │
│ ┌─────────────────────────────────────┐ │
│ │ Entendi, achei que tinha fold       │ │
│ │ equity suficiente pra bettar small │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ Sua nota:                               │
│ ┌─────────────────────────────────────┐ │
│ │ _                                  │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## Ordem de implementação (por sprint)

### Sprint Collab-1 — Auth + Cloud Sessions
1. Atualizar `Auth.tsx` → modal de login/cadastro completo
2. Criar `collabService.ts` com createSession + getMySessions + loadSession
3. Criar `SessionManager.tsx` (aba Minhas / Compartilhadas)
4. Integrar em App.tsx: botão "CLOUD" no header, salvar sessão, carregar sessão
5. Rodar `migration_collab.sql` no Supabase

### Sprint Collab-2 — Compartilhamento + Notas Colaborativas
1. Criar `ShareSessionModal.tsx`
2. Criar `CollabNotesPanel.tsx` (substituindo HandNotes quando em cloud session)
3. Adicionar `upsertAnnotation` e `subscribeToAnnotations` ao collabService
4. Real-time: Supabase Realtime subscription em App.tsx
5. UX: badge de coach/aluno, animação quando nova nota chega ao vivo

### Sprint Collab-3 — Polish + Invite via link
1. Link de convite com token (deep link `?invite=TOKEN`)
2. Aceitar convite pelo link → login automático → redirect para sessão
3. Notificação in-app quando coach adiciona nota ("Gabriel adicionou nota na mão #47")
4. Filtro na sidebar: "★ Marcadas pelo coach"
5. Export PDF do review completo com todas as notas

---

## Variáveis de ambiente necessárias

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Já existem em `src/services/supabase.ts` — verificar se estão no `.env`.

---

## Diferencial competitivo

Nenhuma ferramenta web de replay oferece isso. Ferramentas desktop (PT4, HM3)
têm export/import de notas mas não colaboração em tempo real.

O workflow completo seria:
1. Coach assiste sessão do aluno → sobe o arquivo
2. Marca as mãos problemáticas com tags + texto
3. Compartilha o link com aluno
4. Aluno abre no celular/computador → vê cada nota do coach mão a mão
5. Aluno responde / faz perguntas em cada mão
6. Ambos podem assistir a revisão juntos via screen share com a ferramenta
   já mostrando as anotações em sincronia

Isso transforma o Spot Replay em uma plataforma de coaching,
não só um replayer.
