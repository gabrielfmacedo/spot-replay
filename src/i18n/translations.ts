export type Lang = 'pt' | 'en' | 'es';

export const LANGUAGES: { id: Lang; label: string; flag: string }[] = [
  { id: 'pt', label: 'Português',  flag: '🇧🇷' },
  { id: 'en', label: 'English',    flag: '🇺🇸' },
  { id: 'es', label: 'Español',    flag: '🇦🇷' },
];

// ─────────────────────────────────────────────────────────────────────────────
// All UI strings. Add new keys here and reference via t(key) everywhere.
// ─────────────────────────────────────────────────────────────────────────────
export const T = {
  // ── App / Header ───────────────────────────────────────────────────────────
  appName: { pt: 'SPOT REPLAY', en: 'SPOT REPLAY', es: 'SPOT REPLAY' },
  share:   { pt: 'COMPARTILHAR', en: 'SHARE', es: 'COMPARTIR' },
  fullscreen: { pt: 'Tela cheia', en: 'Fullscreen', es: 'Pantalla completa' },

  // ── User menu ──────────────────────────────────────────────────────────────
  menuProfile:  { pt: 'PERFIL',    en: 'PROFILE',  es: 'PERFIL' },
  menuSupport:  { pt: 'SUPORTE',   en: 'SUPPORT',  es: 'SOPORTE' },
  menuIdeas:    { pt: 'IDEIAS',    en: 'IDEAS',    es: 'IDEAS' },
  menuLanguage: { pt: 'IDIOMA',    en: 'LANGUAGE', es: 'IDIOMA' },
  menuLogout:   { pt: 'SAIR',      en: 'LOGOUT',   es: 'SALIR' },
  menuAdmin:    { pt: 'ADMIN',     en: 'ADMIN',    es: 'ADMIN' },

  // ── Sidebar ────────────────────────────────────────────────────────────────
  stats:    { pt: 'STATS',   en: 'STATS',   es: 'STATS' },
  config:   { pt: 'CONFIG',  en: 'CONFIG',  es: 'CONFIG' },
  search:   { pt: 'Buscar...', en: 'Search...', es: 'Buscar...' },
  filter:   { pt: 'FLT',    en: 'FLT',     es: 'FLT' },
  clearAll: { pt: 'TUDO',   en: 'ALL',     es: 'TODO' },
  clearFilters: { pt: 'limpar', en: 'clear', es: 'limpiar' },
  handsCount: { pt: 'DE', en: 'OF', es: 'DE' }, // "X de Y mãos"
  hands: { pt: 'mãos', en: 'hands', es: 'manos' },
  noHandsImported: { pt: 'Nenhuma mão importada', en: 'No hands imported', es: 'Ninguna mano importada' },
  orderOldNew: { pt: 'Ordem: antiga → nova', en: 'Order: old → new', es: 'Orden: antiguo → nuevo' },
  orderNewOld: { pt: 'Ordem: nova → antiga', en: 'Order: new → old', es: 'Orden: nuevo → antiguo' },

  // ── Config panel ──────────────────────────────────────────────────────────
  layout:      { pt: 'Layout',         en: 'Layout',          es: 'Diseño' },
  table:       { pt: 'Mesa',           en: 'Table',           es: 'Mesa' },
  border:      { pt: 'Borda',          en: 'Border',          es: 'Borde' },
  cardBack:    { pt: 'Cartas — Verso', en: 'Card Back',       es: 'Reverso de Carta' },
  fourColor:   { pt: 'Baralho 4 cores', en: '4-Color Deck',  es: 'Mazo 4 colores' },
  stacksBB:    { pt: 'Stacks em BB',   en: 'Stacks in BB',    es: 'Stacks en BB' },
  hideNames:   { pt: 'Ocultar nomes',  en: 'Hide names',      es: 'Ocultar nombres' },
  hideResults: { pt: 'Ocultar resultados', en: 'Hide results', es: 'Ocultar resultados' },
  jumpHero:    { pt: 'Jump to Hero',   en: 'Jump to Hero',    es: 'Ir al Hero' },
  actingGlow:  { pt: 'Alerta de ação', en: 'Acting glow',     es: 'Alerta de acción' },
  showSPR:     { pt: 'Mostrar SPR',    en: 'Show SPR',        es: 'Mostrar SPR' },
  summary:     { pt: 'Resumo',         en: 'Summary',         es: 'Resumen' },
  link:        { pt: 'Link',           en: 'Link',            es: 'Enlace' },

  // ── Import panel ──────────────────────────────────────────────────────────
  importTitle:   { pt: 'Importar Hand History', en: 'Import Hand History', es: 'Importar Hand History' },
  importDrag:    { pt: 'Arraste um arquivo .txt/.hh aqui ou', en: 'Drag a .txt/.hh file here or', es: 'Arrastra un archivo .txt/.hh aquí o' },
  importBrowse:  { pt: 'escolha um arquivo', en: 'browse file', es: 'elige un archivo' },
  importPaste:   { pt: 'Ou cole o hand history aqui...', en: 'Or paste hand history here...', es: 'O pega el hand history aquí...' },
  importBtn:     { pt: 'IMPORTAR', en: 'IMPORT', es: 'IMPORTAR' },
  importParsing: { pt: 'Processando...', en: 'Processing...', es: 'Procesando...' },
  importDropHere: { pt: 'Soltar para importar', en: 'Drop to import', es: 'Soltar para importar' },
  importSupported: { pt: 'PS / GGPoker / 888 / Party / WPN / Winamax', en: 'PS / GGPoker / 888 / Party / WPN / Winamax', es: 'PS / GGPoker / 888 / Party / WPN / Winamax' },
  importOrText:   { pt: 'ou arraste e solte um arquivo .txt', en: 'or drag & drop a .txt file', es: 'o arrastra y suelta un archivo .txt' },

  // ── Import failure banner ─────────────────────────────────────────────────
  parseFailTitle: { pt: 'mão(s) não reconhecida(s)', en: 'hand(s) not recognized', es: 'mano(s) no reconocida(s)' },
  parseFailSub:   { pt: 'importadas com sucesso', en: 'imported successfully', es: 'importadas con éxito' },
  parseFailOf:    { pt: 'de', en: 'of', es: 'de' },

  // ── Playback controls ─────────────────────────────────────────────────────
  play:     { pt: 'Reproduzir',  en: 'Play',   es: 'Reproducir' },
  pause:    { pt: 'Pausar',      en: 'Pause',  es: 'Pausar' },
  restart:  { pt: 'Reiniciar',   en: 'Restart', es: 'Reiniciar' },
  prevHand: { pt: 'Mão anterior', en: 'Prev hand', es: 'Mano anterior' },
  nextHand: { pt: 'Próxima mão',  en: 'Next hand', es: 'Siguiente mano' },
  speed:    { pt: 'Velocidade',  en: 'Speed',  es: 'Velocidad' },

  // ── Game labels ────────────────────────────────────────────────────────────
  pot:      { pt: 'POT',  en: 'POT',  es: 'POZO' },
  hand:     { pt: 'MÃO',  en: 'HAND', es: 'MANO' },

  // ── Action labels ─────────────────────────────────────────────────────────
  fold:   { pt: 'Fold',   en: 'Fold',   es: 'Fold' },
  check:  { pt: 'Check',  en: 'Check',  es: 'Check' },
  call:   { pt: 'Call',   en: 'Call',   es: 'Call' },
  raise:  { pt: 'Raise',  en: 'Raise',  es: 'Raise' },
  bet:    { pt: 'Bet',    en: 'Bet',    es: 'Bet' },
  allin:  { pt: 'All-in', en: 'All-in', es: 'All-in' },

  // ── Filter modal ──────────────────────────────────────────────────────────
  filters:       { pt: 'Filtros',         en: 'Filters',          es: 'Filtros' },
  result:        { pt: 'Resultado',       en: 'Result',           es: 'Resultado' },
  all:           { pt: 'Todas',           en: 'All',              es: 'Todas' },
  won:           { pt: 'Ganhou',          en: 'Won',              es: 'Ganó' },
  lost:          { pt: 'Perdeu',          en: 'Lost',             es: 'Perdió' },
  folded:        { pt: 'Foldou',          en: 'Folded',           es: 'Foldó' },
  favorites:     { pt: '★ Favoritas',     en: '★ Favorites',      es: '★ Favoritas' },
  heroAction:    { pt: 'Ação do Hero (Pré-flop)', en: 'Hero Action (Pre-flop)', es: 'Acción del Hero (Pre-flop)' },
  heroPosition:  { pt: 'Posição do Hero', en: 'Hero Position',    es: 'Posición del Hero' },
  stackBBFilter: { pt: 'Stack efetivo do Hero (BB)', en: 'Hero Effective Stack (BB)', es: 'Stack efectivo del Hero (BB)' },
  bbValueFilter: { pt: 'Valor do Big Blind (fichas)', en: 'Big Blind Value (chips)', es: 'Valor del Big Blind (fichas)' },
  myTags:        { pt: 'Minhas Tags',     en: 'My Tags',          es: 'Mis Tags' },
  applyFilters:  { pt: 'Aplicar',         en: 'Apply',            es: 'Aplicar' },
  clearFilterBtn:{ pt: 'Limpar filtros',  en: 'Clear filters',    es: 'Limpiar filtros' },

  // ── Stats ─────────────────────────────────────────────────────────────────
  sessionStats:  { pt: 'Estatísticas da Sessão', en: 'Session Statistics', es: 'Estadísticas de Sesión' },
  handsPlayed:   { pt: 'Mãos Jogadas',    en: 'Hands Played',     es: 'Manos Jugadas' },
  winRate:       { pt: 'Win Rate',        en: 'Win Rate',         es: 'Win Rate' },
  itm:           { pt: 'ITM%',            en: 'ITM%',             es: 'ITM%' },
  profit:        { pt: 'Lucro',           en: 'Profit',           es: 'Ganancia' },
  bbPer100:      { pt: 'BB/100',          en: 'BB/100',           es: 'BB/100' },
  close:         { pt: 'Fechar',          en: 'Close',            es: 'Cerrar' },

  // ── Auth modal ────────────────────────────────────────────────────────────
  login:    { pt: 'Entrar',       en: 'Login',     es: 'Iniciar sesión' },
  logout:   { pt: 'Sair',         en: 'Logout',    es: 'Salir' },
  register: { pt: 'Criar conta',  en: 'Register',  es: 'Registrarse' },
  email:    { pt: 'E-mail',       en: 'E-mail',    es: 'E-mail' },
  password: { pt: 'Senha',        en: 'Password',  es: 'Contraseña' },
  rememberMe: { pt: 'Lembrar por 7 dias', en: 'Remember for 7 days', es: 'Recordar por 7 días' },

  // ── Notifications ─────────────────────────────────────────────────────────
  notifications: { pt: 'Notificações', en: 'Notifications', es: 'Notificaciones' },
  markAllRead:   { pt: 'Marcar todas como lidas', en: 'Mark all as read', es: 'Marcar todas como leídas' },
  noNotifications: { pt: 'Nenhuma notificação', en: 'No notifications', es: 'Sin notificaciones' },

  // ── Coach / Collab ────────────────────────────────────────────────────────
  coachNotes:   { pt: 'Notas do Coach', en: 'Coach Notes', es: 'Notas del Coach' },
  annotation:   { pt: 'Sua anotação',   en: 'Your note',   es: 'Tu anotación' },
  saveNote:     { pt: 'Salvar Anotação', en: 'Save Note',  es: 'Guardar Nota' },
  saving:       { pt: 'Salvando...',    en: 'Saving...',   es: 'Guardando...' },
  studyMaterial:{ pt: 'Material de Estudo', en: 'Study Material', es: 'Material de Estudio' },
  addLink:      { pt: 'Adicionar link', en: 'Add link',    es: 'Agregar enlace' },
  cancel:       { pt: 'Cancelar',       en: 'Cancel',      es: 'Cancelar' },
  add:          { pt: 'Adicionar',      en: 'Add',         es: 'Agregar' },
  noAnnotations:{ pt: 'Nenhuma anotação ainda', en: 'No annotations yet', es: 'Sin anotaciones aún' },

  // ── Severity ──────────────────────────────────────────────────────────────
  severityInfo:    { pt: 'Info',     en: 'Info',     es: 'Info' },
  severityWarning: { pt: 'Atenção',  en: 'Warning',  es: 'Atención' },
  severityCritical:{ pt: 'Crítico',  en: 'Critical', es: 'Crítico' },

  // ── Share / Session ───────────────────────────────────────────────────────
  shareSession:    { pt: 'Compartilhar Sessão', en: 'Share Session', es: 'Compartir Sesión' },
  inviteEmail:     { pt: 'Convidar por e-mail', en: 'Invite by email', es: 'Invitar por correo' },
  accessLink:      { pt: 'Link de acesso',      en: 'Access link',    es: 'Enlace de acceso' },
  copy:            { pt: 'Copiar',              en: 'Copy',           es: 'Copiar' },
  copied:          { pt: 'Copiado!',            en: 'Copied!',        es: '¡Copiado!' },
  invite:          { pt: 'Convidar',            en: 'Invite',         es: 'Invitar' },
  members:         { pt: 'Membros',             en: 'Members',        es: 'Miembros' },
  student:         { pt: 'Aluno',               en: 'Student',        es: 'Alumno' },
  coach:           { pt: 'Coach',               en: 'Coach',          es: 'Coach' },
  canAnnotate:     { pt: 'Pode anotar',         en: 'Can annotate',   es: 'Puede anotar' },
  active:          { pt: 'Ativo',               en: 'Active',         es: 'Activo' },
  pending:         { pt: 'Pendente',            en: 'Pending',        es: 'Pendiente' },
  finalizeReview:  { pt: 'Finalizar',           en: 'Finalize',       es: 'Finalizar' },
  reviewDone:      { pt: 'Revisão finalizada',  en: 'Review finalized', es: 'Revisión finalizada' },
  studentsNotified:{ pt: 'Alunos foram notificados', en: 'Students were notified', es: 'Alumnos fueron notificados' },
  reviewSession:   { pt: 'Revisão da sessão',   en: 'Session review',  es: 'Revisión de sesión' },
  notifyStudents:  { pt: 'Notifica alunos quando concluir as anotações', en: 'Notifies students when you finish annotating', es: 'Notifica alumnos cuando termines de anotar' },

  // ── Ideas page ────────────────────────────────────────────────────────────
  ideasTitle:   { pt: 'IDEIAS DA COMUNIDADE', en: 'COMMUNITY IDEAS', es: 'IDEAS DE LA COMUNIDAD' },
  newIdea:      { pt: 'Nova Ideia',           en: 'New Idea',        es: 'Nueva Idea' },
  submitIdea:   { pt: 'Enviar Ideia',         en: 'Submit Idea',     es: 'Enviar Idea' },
  ideaTitle:    { pt: 'Título da ideia',      en: 'Idea title',      es: 'Título de la idea' },
  ideaDesc:     { pt: 'Descreva sua ideia...', en: 'Describe your idea...', es: 'Describe tu idea...' },
  votes:        { pt: 'votos',                en: 'votes',           es: 'votos' },
  yourVote:     { pt: 'Seu voto',             en: 'Your vote',       es: 'Tu voto' },
  noIdeas:      { pt: 'Nenhuma ideia ainda. Seja o primeiro!', en: 'No ideas yet. Be the first!', es: '¡Aún no hay ideas. Sé el primero!' },

  // ── Landing page ──────────────────────────────────────────────────────────
  landingHero:       { pt: 'O melhor replayer de poker do Brasil', en: 'The best poker replayer', es: 'El mejor replayer de poker' },
  landingSubtitle:   { pt: 'Reviva suas mãos, identifique erros e evolua seu jogo.', en: 'Relive your hands, identify mistakes, and improve your game.', es: 'Revive tus manos, identifica errores y mejora tu juego.' },
  landingCta:        { pt: 'Criar conta gratuita', en: 'Create free account', es: 'Crear cuenta gratis' },
  landingLogin:      { pt: 'Já tenho conta', en: 'I have an account', es: 'Ya tengo cuenta' },
  landingBadge:      { pt: '100% gratuito · sem download · direto no navegador', en: '100% free · no download · right in your browser', es: '100% gratis · sin descarga · directo en el navegador' },
  landingH1Line1:    { pt: 'Revise suas mãos.', en: 'Review your hands.', es: 'Revisa tus manos.' },
  landingH1Line2:    { pt: 'Evolua de verdade.', en: 'Truly improve.', es: 'Evoluciona de verdad.' },
  landingDesc:       { pt: 'O replayer de poker profissional em português — sem pagar caro em dólar, sem instalar nada. Importe seu histórico, assista cada jogada animada na mesa e anote cada erro.', en: 'The professional poker replayer — no expensive USD subscriptions, nothing to install. Import your history, watch each action animated at the table, and annotate every mistake.', es: 'El replayer de poker profesional — sin pagar en dólares, sin instalar nada. Importa tu historial, observa cada jugada animada en la mesa y anota cada error.' },
  landingStat1:      { pt: 'Sites suportados', en: 'Sites supported', es: 'Sitios soportados' },
  landingStat2:      { pt: 'Gratuito', en: 'Free', es: 'Gratis' },
  landingStat3:      { pt: 'Coach integrada', en: 'AI Coach', es: 'Coach integrado' },
  landingQuote:      { pt: '"Finalmente um replayer sério em português, sem mensalidade."', en: '"Finally a serious replayer without monthly fees."', es: '"Por fin un replayer serio sin mensualidad."' },
  landingCreateCard: { pt: 'Criar conta gratuita', en: 'Create free account', es: 'Crear cuenta gratis' },
  landingCardSub:    { pt: 'Sem cartão. Sem dólar. Comece em 30 segundos.', en: 'No credit card. No USD. Start in 30 seconds.', es: 'Sin tarjeta. Sin dólares. Empieza en 30 segundos.' },
  landingHaveAccount:{ pt: 'Já tem conta?', en: 'Already have an account?', es: '¿Ya tienes cuenta?' },
  landingNoAccount:  { pt: 'Não tem conta?', en: "Don't have an account?", es: '¿No tienes cuenta?' },
  landingDoLogin:    { pt: 'Fazer login', en: 'Log in', es: 'Iniciar sesión' },
  landingCreateFree: { pt: 'Criar gratuitamente', en: 'Create for free', es: 'Crear gratis' },
  landingCtaTitle:   { pt: 'Pronto para estudar de verdade?', en: 'Ready to study for real?', es: '¿Listo para estudiar de verdad?' },
  landingCtaSub:     { pt: 'Gratuito. Sem cartão de crédito. Sem dólar. Direto no navegador.', en: 'Free. No credit card. No USD. Right in your browser.', es: 'Gratis. Sin tarjeta de crédito. Sin dólares. Directo en el navegador.' },
  landingFooter:     { pt: 'Feito para jogadores brasileiros', en: 'Built for poker players', es: 'Hecho para jugadores de poker' },
  landingFeaturesTag:{ pt: 'O que você ganha', en: 'What you get', es: 'Qué obtienes' },
  landingFeaturesH2: { pt: 'Tudo que você precisa para evoluir no poker', en: 'Everything you need to improve at poker', es: 'Todo lo que necesitas para mejorar en el poker' },
  landingHowTag:     { pt: 'Como funciona', en: 'How it works', es: 'Cómo funciona' },
  landingHowH2:      { pt: 'Em menos de 1 minuto você já está estudando', en: 'In less than 1 minute you are already studying', es: 'En menos de 1 minuto ya estás estudiando' },
  // Login screen
  loginWelcome:    { pt: 'Bem-vindo de volta', en: 'Welcome back', es: 'Bienvenido de nuevo' },
  loginSubtitle:   { pt: 'Entre na sua conta para continuar', en: 'Sign in to your account to continue', es: 'Entra en tu cuenta para continuar' },
  loginSubmitting: { pt: 'Entrando...', en: 'Signing in...', es: 'Entrando...' },
  loginSubmit:     { pt: 'Entrar', en: 'Sign in', es: 'Entrar' },
  // Register form
  registerSubmit:  { pt: 'Criar minha conta grátis', en: 'Create my free account', es: 'Crear mi cuenta gratis' },
  registerLoading: { pt: 'Criando conta...', en: 'Creating account...', es: 'Creando cuenta...' },
  registerName:    { pt: 'Nome completo', en: 'Full name', es: 'Nombre completo' },
  registerWhatsApp:{ pt: 'WhatsApp', en: 'WhatsApp', es: 'WhatsApp' },
  keepConnected:   { pt: 'Manter conectado', en: 'Stay signed in', es: 'Mantener sesión' },
  remember7d:      { pt: '7 dias', en: '7 days', es: '7 días' },
  rememberAlways:  { pt: 'Sempre', en: 'Always', es: 'Siempre' },
  emailVerifyTitle:{ pt: 'Verifique seu e-mail', en: 'Check your email', es: 'Verifica tu correo' },
  emailVerifySent: { pt: 'Enviamos um link para', en: 'We sent a link to', es: 'Enviamos un enlace a' },
  emailVerifyBack: { pt: 'Confirme e volte aqui para entrar.', en: 'Confirm it and come back here to sign in.', es: 'Confírmalo y vuelve aquí para entrar.' },
  pwdMinChars:     { pt: 'Mínimo 6 caracteres', en: 'Minimum 6 characters', es: 'Mínimo 6 caracteres' },

  // ── Landing — Features ────────────────────────────────────────────────────
  feat1Title: { pt: 'Replay visual na mesa', en: 'Visual table replay', es: 'Replay visual en la mesa' },
  feat1Desc:  { pt: 'Importe qualquer histórico e assista cada ação animada em uma mesa profissional, street por street, com velocidade ajustável.', en: 'Import any hand history and watch each action animated on a professional table, street by street, with adjustable speed.', es: 'Importa cualquier historial y observa cada acción animada en una mesa profesional, calle por calle, con velocidad ajustable.' },
  feat2Title: { pt: 'Anotações por street', en: 'Per-street annotations', es: 'Anotaciones por calle' },
  feat2Desc:  { pt: 'Anote erros e insights fixados em Pré-flop, Flop, Turn e River. Com tags, severidade e pin no step exato da ação.', en: 'Annotate mistakes and insights pinned to Pre-flop, Flop, Turn, and River — with tags, severity, and exact action step.', es: 'Anota errores e insights fijados en Pre-flop, Flop, Turn y River. Con etiquetas, severidad y pin en el step exacto.' },
  feat3Title: { pt: 'Resumo inteligente com IA', en: 'AI-powered smart summary', es: 'Resumen inteligente con IA' },
  feat3Desc:  { pt: 'A IA analisa as anotações, identifica padrões, erros recorrentes e gera um plano de estudo personalizado para você.', en: 'AI analyzes your annotations, identifies patterns and recurring mistakes, and generates a personalized study plan.', es: 'La IA analiza las anotaciones, identifica patrones, errores recurrentes y genera un plan de estudio personalizado.' },
  feat4Title: { pt: 'Multi-site', en: 'Multi-site', es: 'Multi-sitio' },
  feat4Desc:  { pt: 'Suporta PokerStars, GGPoker, 888 Poker, PartyPoker e Bodog. Cole o histórico de qualquer formato.', en: 'Supports PokerStars, GGPoker, 888 Poker, PartyPoker, and Bodog. Paste hand history from any format.', es: 'Soporta PokerStars, GGPoker, 888 Poker, PartyPoker y Bodog. Pega el historial de cualquier formato.' },
  feat5Title: { pt: 'Sessões de estudo', en: 'Study sessions', es: 'Sesiones de estudio' },
  feat5Desc:  { pt: 'Agrupe mãos, filtre por posição, stack e resultado do herói. Encontre exatamente o spot que quer revisar.', en: 'Group hands, filter by position, stack, and hero result. Find exactly the spot you want to review.', es: 'Agrupa manos, filtra por posición, stack y resultado del héroe. Encuentra exactamente el spot que quieres revisar.' },
  feat6Title: { pt: 'Pot Odds & Range Builder', en: 'Pot Odds & Range Builder', es: 'Pot Odds & Range Builder' },
  feat6Desc:  { pt: 'Calcule pot odds em tempo real durante o replay e construa ranges com o editor visual integrado.', en: 'Calculate pot odds in real time during replay and build ranges with the integrated visual editor.', es: 'Calcula pot odds en tiempo real durante el replay y construye ranges con el editor visual integrado.' },
  // Landing — How it works steps
  step1Title: { pt: 'Cole o histórico de mãos', en: 'Paste your hand history', es: 'Pega el historial de manos' },
  step1Desc:  { pt: 'Exporte o .txt do seu cliente (PokerStars, GGPoker etc.) e cole ou importe direto no Spot Replay.', en: 'Export the .txt from your client (PokerStars, GGPoker, etc.) and paste or import directly into Spot Replay.', es: 'Exporta el .txt de tu cliente (PokerStars, GGPoker, etc.) y pégalo o impórtalo directo en Spot Replay.' },
  step2Title: { pt: 'Escolha a mão e assista', en: 'Choose a hand and watch', es: 'Elige una mano y mírala' },
  step2Desc:  { pt: 'Navegue pelas mãos, use o player para avançar ação por ação ou ir direto para o showdown.', en: 'Browse your hands, use the player to step through each action or jump straight to showdown.', es: 'Navega por las manos, usa el reproductor para avanzar acción por acción o ir directo al showdown.' },
  step3Title: { pt: 'Anote, compartilhe e evolua', en: 'Annotate, share, and improve', es: 'Anota, comparte y evoluciona' },
  step3Desc:  { pt: 'Registre seus erros por street, compartilhe com seu coach e receba feedback com anotações em tempo real.', en: 'Record your mistakes by street, share with your coach, and receive real-time annotation feedback.', es: 'Registra tus errores por calle, comparte con tu coach y recibe feedback con anotaciones en tiempo real.' },

  // ── Misc ──────────────────────────────────────────────────────────────────
  loading:      { pt: 'Carregando...', en: 'Loading...', es: 'Cargando...' },
  error:        { pt: 'Erro',          en: 'Error',      es: 'Error' },
  yes:          { pt: 'Sim',           en: 'Yes',        es: 'Sí' },
  no:           { pt: 'Não',           en: 'No',         es: 'No' },
  confirm:      { pt: 'Confirmar',     en: 'Confirm',    es: 'Confirmar' },
  delete:       { pt: 'Excluir',       en: 'Delete',     es: 'Eliminar' },
  remove:       { pt: 'Remover',       en: 'Remove',     es: 'Quitar' },
  save:         { pt: 'Salvar',        en: 'Save',       es: 'Guardar' },
  edit:         { pt: 'Editar',        en: 'Edit',       es: 'Editar' },
  back:         { pt: 'Voltar',        en: 'Back',       es: 'Volver' },
  mobileBlock:  { pt: 'Para uma melhor experiência usando o Spot Replay, acesse o site através do navegador do seu computador ou notebook.', en: 'For the best experience with Spot Replay, please access it from a desktop or laptop browser.', es: 'Para la mejor experiencia con Spot Replay, accede desde el navegador de tu computadora o laptop.' },
  desktopOnly:  { pt: 'Disponível apenas para desktop', en: 'Desktop only', es: 'Solo disponible para escritorio' },
} as const;

export type TKey = keyof typeof T;
