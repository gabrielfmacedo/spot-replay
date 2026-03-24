
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, RotateCcw,
  ChevronLeft, ChevronRight, List, FileUp, Upload, Loader2,
  Search, X, BarChart2, Calculator,
  Share2, Layers, AlignLeft, NotebookPen, Copy, Link2,
  LogOut, User, Maximize2, Minimize2, Settings2, Shield,
  ZoomIn, ZoomOut, SlidersHorizontal, ChevronDown, Star, MessageSquare, ArrowDownUp
} from 'lucide-react';
import { HandHistory, PlayerAction, HandNotes as HandNotesMap, HandNote, ActionType, ReplaySession } from './types';
import { parseHandHistory } from './services/parser';
import PlayerSeat from './components/PlayerSeat';
import Card from './components/Card';

import SessionStats from './components/SessionStats';
import PotOddsWidget from './components/PotOddsWidget';
import RangeBuilder from './components/RangeBuilder';
import HandSummary from './components/HandSummary';
import AuthModal from './components/AuthModal';
import SessionManager from './components/SessionManager';
import ShareModal from './components/ShareModal';
import CollabNotesPanel from './components/CollabNotesPanel';
import CoachSummaryModal from './components/CoachSummaryModal';
import FilterModal, { type NumericFilter } from './components/FilterModal';
import NotificationBell from './components/NotificationBell';
import NotificationToast from './components/NotificationToast';
import NotificationsPage from './components/NotificationsPage';
import PlayerNoteModal from './components/PlayerNoteModal';
import PlayerSeatMinimal from './components/PlayerSeatMinimal';
import LandingPage from './components/LandingPage';
import IdeasPage from './components/IdeasPage';
import AdminPanel from './components/AdminPanel';
import ProfileModal from './components/ProfileModal';
import PlayerNoteHistory from './components/PlayerNoteHistory';
import FloatingHandNote from './components/FloatingHandNote';
import type { PlayerNoteData } from './components/PlayerNoteModal';
import { lastNoteText, migratePlayerNote } from './components/PlayerNoteModal';
import { encodeHand, getSharedHandFromURL } from './utils/shareHand';
import { evaluateCards, getBoardTexture, getBestFiveCards } from './utils/pokerEval';
import { THEMES, DEFAULT_THEME, getTheme } from './utils/themes';
import { supabase } from './services/supabase';
import {
  loadHandNotesFromDB, upsertHandNote,
  loadPlayerNotesFromDB, upsertPlayerNote,
  getAllSessionAnnotations,
} from './services/collabService';
import {
  getMyNotifications, markNotificationsRead, markAllRead,
  checkDripNotifications, subscribeToMyNotifications,
  type UserNotification,
} from './services/notificationService';
import type { HandAnnotation } from './types';

const FIXED_SEATS = [
  { top: '-6%',  left: '50%'  },
  { top: '-6%',  left: '84%'  },
  { top: '38%',  left: '106%' },
  { top: '94%',  left: '102%' },
  { top: '108%', left: '68%'  },
  { top: '108%', left: '32%'  },
  { top: '94%',  left: '-2%'  },
  { top: '38%',  left: '-6%'  },
  { top: '-6%',  left: '16%'  },
];


// Minimal seats — same oval layout but with extra vertical breathing room at the bottom
// so expanding action pills don't overlap.
const MINIMAL_SEATS = [
  { top:   '6%', left: '50%'  }, // seat 1 — top center
  { top:  '14%', left: '90%'  }, // seat 2 — upper right
  { top:  '50%', left: '108%' }, // seat 3 — right
  { top:  '93%', left: '91%'  }, // seat 4 — lower right
  { top: '112%', left: '68%'  }, // seat 5 — bottom right
  { top: '112%', left: '32%'  }, // seat 6 — bottom left
  { top:  '93%', left:  '9%'  }, // seat 7 — lower left
  { top:  '50%', left: '-8%'  }, // seat 8 — left
  { top:  '14%', left: '10%'  }, // seat 9 — upper left
];

const BATCH_SIZE = 50;
const SPEED_PRESETS = [2000, 1000, 500, 250];
const SPEED_LABELS  = ['0.5×', '1×', '2×', '4×'];

function heroVPIPed(hand: HandHistory): boolean {
  const hero = hand.players.find(p => p.isHero);
  if (!hero) return false;
  return hand.actions.some(a => a.playerName === hero.name && a.street === 'PREFLOP' && (a.type === 'CALL' || a.type === 'RAISE'));
}
function heroPFRed(hand: HandHistory): boolean {
  const hero = hand.players.find(p => p.isHero);
  if (!hero) return false;
  return hand.actions.some(a => a.playerName === hero.name && a.street === 'PREFLOP' && a.type === 'RAISE');
}
function hero3Betted(hand: HandHistory): boolean {
  const hero = hand.players.find(p => p.isHero);
  if (!hero) return false;
  const pf = hand.actions.filter(a => a.street === 'PREFLOP' && (a.type === 'RAISE' || a.type === 'BET'));
  let raiseIdx = 0;
  for (const a of pf) { if (a.type === 'RAISE' || a.type === 'BET') { raiseIdx++; if (raiseIdx >= 2 && a.playerName === hero.name) return true; } }
  return false;
}
function heroCalledPF(hand: HandHistory): boolean {
  const hero = hand.players.find(p => p.isHero);
  if (!hero) return false;
  return hand.actions.some(a => a.playerName === hero.name && a.street === 'PREFLOP' && a.type === 'CALL');
}

const App: React.FC = () => {
  const [hands,            setHands]            = useState<HandHistory[]>([]);
  const [currentHandIndex, setCurrentHandIndex] = useState(0);
  const [currentStep,      setCurrentStep]      = useState(0);
  const [isPlaying,        setIsPlaying]        = useState(false);
  const [playbackSpeed,    setPlaybackSpeed]    = useState(1000);
  const [showImport,       setShowImport]       = useState(true);
  const [importText,       setImportText]       = useState('');
  const [isSidebarOpen,    setIsSidebarOpen]    = useState(true);
  const [displayMode,      setDisplayMode]      = useState<'chips' | 'bb'>('chips');
  const [isParsing,        setIsParsing]        = useState(false);
  const [parsingProgress,  setParsingProgress]  = useState(0);
  const [visibleHandsCount,setVisibleHandsCount]= useState(40);
  const [sidebarSearch,    setSidebarSearch]    = useState('');
  const [sidebarFilter,    setSidebarFilter]    = useState<'all' | 'win' | 'lose' | 'fold' | 'star' | 'vpip' | 'pfr' | '3bet' | 'call'>('all');
  const [handsReversed,    setHandsReversed]    = useState(false);
  // Sprint 1 features
  const [hideResults,      setHideResults]      = useState(false);
  const [isDragOver,       setIsDragOver]       = useState(false);
  // Sprint 2 features
  const [showStats,        setShowStats]        = useState(false);
  const [showPotOdds,      setShowPotOdds]      = useState(false);
  const [handNotes,        setHandNotes]        = useState<HandNotesMap>({});
  // Sprint 3 features
  const [showRangeBuilder, setShowRangeBuilder] = useState(false);
  const quizMode = false;
  const [quizDecision,     setQuizDecision]     = useState<{ actual: ActionType; street: string; userPick: ActionType | null; revealed: boolean } | null>(null);
  const [shareCopied,      setShareCopied]      = useState(false);
  // Sprint 5 features
  const [currentTheme,     setCurrentTheme]     = useState(() => localStorage.getItem('spot_replay_theme') ?? DEFAULT_THEME);
  const [tableLayout,      setTableLayout]      = useState<'classic' | 'minimal'>(() => { const v = localStorage.getItem('spot_replay_layout'); return (v === 'classic' || v === 'minimal' ? v : 'classic'); });
  const [cardBack,         setCardBack]         = useState(() => localStorage.getItem('spot_replay_cardback') ?? 'red');
  const [cardStyle,        setCardStyle]        = useState<'off' | 'text' | 'bg'>(() => (localStorage.getItem('spot_replay_cardstyle') as 'off' | 'text' | 'bg') ?? 'off');
  const [showThemePicker,  setShowThemePicker]  = useState(false);
  const [showHandSummary,  setShowHandSummary]  = useState(false);
  // Layout features
  const [showFilterModal,  setShowFilterModal]   = useState(false);
  const [showNotePanel,    setShowNotePanel]     = useState(false);
  const [autoJumpHero,     setAutoJumpHero]      = useState(false);
  const [tagFilter,        setTagFilter]         = useState('');
  // Custom tags (user-defined)
  const [customTags,       setCustomTags]        = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('spot_replay_custom_tags') || '[]'); } catch { return []; }
  });
  // Player notes (villain book)
  const [playerNotes,      setPlayerNotes]       = useState<Record<string, PlayerNoteData>>({});
  const [playerNoteTarget, setPlayerNoteTarget]  = useState<string | null>(null);
  const [tableZoom,      setTableZoom]      = useState(1.0);
  const [isFullscreen,   setIsFullscreen]   = useState(false);
  const [showAppShare,   setShowAppShare]   = useState(false);
  const appShareRef = useRef<HTMLDivElement>(null);
  const [hidePlayerNames,setHidePlayerNames]= useState(false);
  const [actingGlow,     setActingGlow]     = useState(true);
  const [showSPR,        setShowSPR]        = useState(false);
  const [showSettings,   setShowSettings]   = useState(false);
  const [positionFilter, setPositionFilter] = useState('');
  // Auth state
  const [authChecked,      setAuthChecked]      = useState(false);
  const [currentUser,      setCurrentUser]      = useState<{ id: string; email: string; name: string } | null>(null);
  const [isAdmin,          setIsAdmin]          = useState(false);
  const [showAdminPanel,   setShowAdminPanel]   = useState(false);
  const [showProfile,          setShowProfile]          = useState(false);
  const [stackBBFilter,      setStackBBFilter]      = useState<NumericFilter | null>(null);
  const [bbValueFilter,      setBBValueFilter]       = useState<NumericFilter | null>(null);
  const [notifications,      setNotifications]       = useState<UserNotification[]>([]);
  const [toastNotif,         setToastNotif]          = useState<UserNotification | null>(null);
  const [bellOpen,           setBellOpen]            = useState(false);
  const [showUnreadBanner,   setShowUnreadBanner]    = useState(false);
  const [showNotificationsPage, setShowNotificationsPage] = useState(false);
  const [copyHandDone,       setCopyHandDone]        = useState(false);
  const [shareHandDone,      setShareHandDone]       = useState(false);
  const [shareHandLoading,   setShareHandLoading]    = useState(false);
  const [playerNoteHistoryTarget, setPlayerNoteHistoryTarget] = useState<string | null>(null);
  const [showAuthModal,    setShowAuthModal]    = useState(false);
  const [showSessionMgr,   setShowSessionMgr]  = useState(false);
  const [cloudSession,     setCloudSession]     = useState<{ session: ReplaySession; role: 'owner' | 'coach' | 'student' } | null>(null);
  const [shareTarget,      setShareTarget]      = useState<ReplaySession | null>(null);
  const [collabAnnotations, setCollabAnnotations] = useState<Record<string, HandAnnotation[]>>({});
  const [showAISummary,    setShowAISummary]     = useState(false);
  const [showIdeasPage,    setShowIdeasPage]     = useState(false);
  const [showUserMenu,     setShowUserMenu]      = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const fileInputRef    = useRef<HTMLInputElement>(null);
  const sidebarListRef  = useRef<HTMLDivElement>(null);

  const currentHand = hands[currentHandIndex];

  // ── Auth init ─────────────────────────────────────────────────────────────
  const loadNotesFromDB = useCallback(async (userId: string) => {
    try {
      const [hn, pn] = await Promise.all([loadHandNotesFromDB(userId), loadPlayerNotesFromDB(userId)]);
      setHandNotes(prev => ({ ...prev, ...hn }));
      setPlayerNotes(prev => ({ ...prev, ...pn }));
    } catch { /* offline / DB not migrated */ }
  }, []);

  useEffect(() => {
    // If Supabase is not configured, skip auth entirely
    if (!supabase) { setAuthChecked(true); return; }

    // Check "remember me" expiry before session resolution
    const rememberMode = localStorage.getItem('spot_replay_remember');
    const setAt = parseInt(localStorage.getItem('spot_replay_session_set_at') ?? '0', 10);
    if (rememberMode === '7d' && Date.now() - setAt > 7 * 86_400_000) {
      supabase.auth.signOut();
      localStorage.removeItem('spot_replay_remember');
      localStorage.removeItem('spot_replay_session_set_at');
    }

    // Use onAuthStateChange — fires INITIAL_SESSION on load, then SIGNED_IN / SIGNED_OUT
    let prevUserId: string | null = null;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u = session.user;
        // If a different user logged in, clear all session state
        if (prevUserId && prevUserId !== u.id) {
          setHands([]);
          setCurrentHandIndex(0);
          setCurrentStep(0);
          setHandNotes({});
          setPlayerNotes({});
          setShowImport(true);
        }
        prevUserId = u.id;
        setCurrentUser({ id: u.id, email: u.email ?? '', name: u.user_metadata?.full_name ?? u.email ?? '' });
        loadNotesFromDB(u.id);
        // Fetch admin role
        Promise.resolve(supabase.rpc('is_admin')).then(({ data }) => setIsAdmin(!!data)).catch(() => setIsAdmin(false));
      } else {
        prevUserId = null;
        setCurrentUser(null);
        setIsAdmin(false);
        // Clear hands on logout so next user starts fresh
        setHands([]);
        setCurrentHandIndex(0);
        setCurrentStep(0);
        setHandNotes({});
        setShowImport(true);
      }
      setAuthChecked(true);
    });
    return () => subscription.unsubscribe();
  }, [loadNotesFromDB]);

  // ── last_seen_at heartbeat (for admin online-now metric) ──────────────────
  useEffect(() => {
    if (!currentUser || !supabase) return;
    const update = () => supabase!.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', currentUser.id).then(() => {});
    update();
    const interval = setInterval(update, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // ── Notifications: load + drip check + realtime ────────────────────────────
  useEffect(() => {
    if (!currentUser || !supabase) return;
    // Load existing notifications; show unread banner if any
    getMyNotifications().then(loaded => {
      setNotifications(loaded);
      const unreadCount = loaded.filter(n => !n.read_at).length;
      if (unreadCount > 0) setShowUnreadBanner(true);
    }).catch(() => {});
    // Deliver any pending drip notifications for this user
    checkDripNotifications().catch(() => {});
    // Realtime: new notifications pushed by admin broadcast
    const channel = subscribeToMyNotifications(currentUser.id, (n) => {
      setNotifications(prev => [n, ...prev]);
      setToastNotif(n);
      setShowUnreadBanner(false); // toast is already showing, don't double-notify
    });
    return () => { if (supabase) supabase.removeChannel(channel); };
  }, [currentUser]);

  // ── Fullscreen ────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // ── App share dropdown — close on outside click ───────────────────────────
  useEffect(() => {
    if (!showAppShare) return;
    const handler = (e: MouseEvent) => {
      if (appShareRef.current && !appShareRef.current.contains(e.target as Node)) setShowAppShare(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAppShare]);

  // ── User menu — close on outside click ────────────────────────────────────
  useEffect(() => {
    if (!showUserMenu) return;
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showUserMenu]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  }, []);

  // ── localStorage ─────────────────────────────────────────────────────────
  useEffect(() => {
    // Check for shared hand in URL first
    const shared = getSharedHandFromURL();
    if (shared) {
      setHands([shared]);
      setShowImport(false);
      window.history.replaceState(null, '', window.location.pathname);
      return;
    }
    // Check for ?session=UUID (cloud session invite link)
    const params = new URLSearchParams(window.location.search);
    const sessionParam = params.get('session');
    if (sessionParam) {
      window.history.replaceState(null, '', window.location.pathname);
      setShowSessionMgr(true);
      return;
    }
    const shareParam = params.get('share');
    if (shareParam && supabase) {
      window.history.replaceState(null, '', window.location.pathname);
      supabase.from('shared_hands').select('hand_json').eq('id', shareParam).single()
        .then(({ data }) => {
          if (data?.hand_json) {
            setHands([data.hand_json as HandHistory]);
            setShowImport(false);
          }
        });
      return;
    }
    // Hands are NOT persisted in localStorage (would leak across users).
    // The import screen is always shown on fresh load.
  }, []);


  useEffect(() => {
    try {
      const saved = localStorage.getItem('spot_replay_notes');
      if (saved) setHandNotes(JSON.parse(saved) as HandNotesMap);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    localStorage.setItem('spot_replay_notes', JSON.stringify(handNotes));
  }, [handNotes]);

  useEffect(() => {
    localStorage.setItem('spot_replay_custom_tags', JSON.stringify(customTags));
  }, [customTags]);

  // Apply theme CSS variables
  useEffect(() => {
    const t = getTheme(currentTheme);
    const root = document.documentElement;
    root.style.setProperty('--table-felt', t.felt);
    root.style.setProperty('--table-rail', t.rail);
    root.style.setProperty('--table-rail-border', t.railBorder);
    root.style.setProperty('--app-bg', t.bg);
    localStorage.setItem('spot_replay_theme', currentTheme);
  }, [currentTheme]);

  useEffect(() => {
    localStorage.setItem('spot_replay_layout', tableLayout);
  }, [tableLayout]);

  useEffect(() => {
    const BACKS: Record<string, string> = {
      red:   '#991b1b',
      blue:  '#1e3a8a',
      black: '#111827',
      green: '#14532d',
    };
    document.documentElement.style.setProperty('--card-back-bg', BACKS[cardBack] ?? BACKS.red);
    localStorage.setItem('spot_replay_cardback', cardBack);
  }, [cardBack]);

  useEffect(() => {
    localStorage.setItem('spot_replay_cardstyle', cardStyle);
  }, [cardStyle]);

  useEffect(() => { setVisibleHandsCount(40); }, [sidebarSearch, sidebarFilter]);

  // ── Derived values ────────────────────────────────────────────────────────
  const bigBlindValue = useMemo(() => {
    if (!currentHand) return 1;
    // Primary: use the actual POST_BB action amount (always exact, works for all rooms)
    const bbAction = currentHand.actions.find(a => a.type === 'POST_BB' && a.amount > 0);
    if (bbAction) return bbAction.amount;
    // Fallback: parse from stakes string (e.g. "60000/120000" or "0.5/1")
    const parts = currentHand.stakes.split('/');
    if (parts.length >= 2) {
      const bb = parseFloat(parts[1].replace(/[^0-9.]/g, ''));
      if (bb > 0) return bb;
    }
    return 1;
  }, [currentHand]);

  const actionsWithPauses = useMemo(() => {
    if (!currentHand) return [];
    const enriched: (PlayerAction | { type: 'STREET_START'; street: string })[] = [];

    const pre      = currentHand.actions.filter(a => a.street === 'PREFLOP' && a.type !== 'POST_SB' && a.type !== 'POST_BB');
    const flop     = currentHand.actions.filter(a => a.street === 'FLOP');
    const turn     = currentHand.actions.filter(a => a.street === 'TURN');
    const river    = currentHand.actions.filter(a => a.street === 'RIVER');
    const showdown = currentHand.actions.filter(a => a.street === 'SHOWDOWN' || a.type === 'COLLECTED');

    // Detect all-in runout: no player actions on a board street, but there IS a board and showdown reveals
    const showsCount = showdown.filter(a => a.type === 'SHOWS').length;
    const isAllinPreflop  = flop.length === 0 && turn.length === 0 && river.length === 0 && showsCount >= 2 && currentHand.board.length >= 3;
    const isAllinOnFlop   = flop.length > 0   && turn.length === 0 && river.length === 0 && showsCount >= 2 && currentHand.board.length >= 4;
    const isAllinOnTurn   = turn.length > 0   && river.length === 0                       && showsCount >= 2 && currentHand.board.length === 5;

    enriched.push(...pre);
    if (isAllinPreflop) enriched.push({ type: 'STREET_START', street: 'ALLIN_REVEAL' });
    if (currentHand.board.length >= 3 || flop.length > 0)    { enriched.push({ type: 'STREET_START', street: 'FLOP' });     enriched.push(...flop); }
    if (isAllinOnFlop)  enriched.push({ type: 'STREET_START', street: 'ALLIN_REVEAL' });
    if (currentHand.board.length >= 4 || turn.length > 0)    { enriched.push({ type: 'STREET_START', street: 'TURN' });     enriched.push(...turn); }
    if (isAllinOnTurn)  enriched.push({ type: 'STREET_START', street: 'ALLIN_REVEAL' });
    if (currentHand.board.length >= 5 || river.length > 0)   { enriched.push({ type: 'STREET_START', street: 'RIVER' });    enriched.push(...river); }
    if (showdown.length > 0 || currentHand.board.length === 5){ enriched.push({ type: 'STREET_START', street: 'SHOWDOWN' }); enriched.push(...showdown); }

    return enriched;
  }, [currentHand]);

  const filteredHandsWithIndex = useMemo(() => {
    const CARD_RANKS = 'AKQJT98765432';
    return hands
      .map((hand, idx) => ({ hand, idx }))
      .filter(({ hand, idx }) => {
        const noteKey = `${hand.room}_${hand.id}`;
        const note = handNotes[noteKey];

        if (sidebarFilter === 'win'  && hand.summary.heroStatus !== 'win')  return false;
        if (sidebarFilter === 'lose' && hand.summary.heroStatus !== 'lose') return false;
        if (sidebarFilter === 'fold' && hand.summary.heroStatus !== 'none') return false;
        if (sidebarFilter === 'star' && !note?.starred) return false;
        if (sidebarFilter === 'vpip' && !heroVPIPed(hand))  return false;
        if (sidebarFilter === 'pfr'  && !heroPFRed(hand))   return false;
        if (sidebarFilter === '3bet' && !hero3Betted(hand)) return false;
        if (sidebarFilter === 'call' && !heroCalledPF(hand)) return false;
        if (positionFilter && hand.summary.heroPos !== positionFilter) return false;
        if (tagFilter && !note?.tags?.includes(tagFilter)) return false;

        if (stackBBFilter) {
          const hero = hand.players.find(p => p.isHero);
          const bbAct = hand.actions.find(a => a.type === 'POST_BB' && (a.amount ?? 0) > 0);
          if (hero && bbAct?.amount) {
            const stackBB = hero.initialStack / bbAct.amount;
            const { op, val, val2 } = stackBBFilter;
            const pass =
              op === 'gt'      ? stackBB > val :
              op === 'lt'      ? stackBB < val :
              op === 'eq'      ? Math.abs(stackBB - val) < 1 :
              /* between */      stackBB >= val && stackBB <= (val2 ?? val);
            if (!pass) return false;
          }
        }
        if (bbValueFilter) {
          const bbAct = hand.actions.find(a => a.type === 'POST_BB' && (a.amount ?? 0) > 0);
          if (bbAct?.amount) {
            const bbV = bbAct.amount;
            const { op, val, val2 } = bbValueFilter;
            const pass =
              op === 'gt'      ? bbV > val :
              op === 'lt'      ? bbV < val :
              op === 'eq'      ? bbV === val :
              /* between */      bbV >= val && bbV <= (val2 ?? val);
            if (!pass) return false;
          }
        }

        if (sidebarSearch.trim()) {
          const q = sidebarSearch.toLowerCase().trim();
          const qUp = q.toUpperCase();

          // By hand number
          if (String(idx + 1) === q || hand.id.includes(q)) return true;
          // By stakes or position
          if (hand.stakes.toLowerCase().includes(q)) return true;
          if (hand.summary.heroPos.toLowerCase() === q) return true;
          // By note text or tags
          if (note?.text?.toLowerCase().includes(q)) return true;
          if (note?.tags?.some(t => t.toLowerCase().includes(q))) return true;
          // By hero cards e.g. "AK", "99", "K9"
          if (
            qUp.length === 2 &&
            CARD_RANKS.includes(qUp[0]) &&
            CARD_RANKS.includes(qUp[1])
          ) {
            const heroRanks = hand.summary.heroCards.map(c => c[0].toUpperCase());
            if (qUp[0] === qUp[1]) {
              // Pocket pair: need two of the same rank
              return heroRanks.filter(r => r === qUp[0]).length >= 2;
            }
            return heroRanks.includes(qUp[0]) && heroRanks.includes(qUp[1]);
          }
          return false;
        }
        return true;
      });
    return handsReversed ? filtered.slice().reverse() : filtered;
  }, [hands, sidebarFilter, sidebarSearch, handNotes, positionFilter, tagFilter, stackBBFilter, bbValueFilter, handsReversed]);

  // ── Step effect ───────────────────────────────────────────────────────────
  // Tracks previous hand to distinguish "hand changed" from "toggle changed"
  const prevHandRef = useRef<typeof currentHand>(null);

  useEffect(() => {
    const handChanged = prevHandRef.current !== currentHand;
    prevHandRef.current = currentHand as typeof currentHand;

    if (!currentHand) return;

    if (!autoJumpHero) {
      // Only reset to 0 when the hand itself changes, not when toggle is turned off
      if (handChanged) setCurrentStep(0);
      return;
    }

    // Auto-jump: walk actionsWithPauses to find hero's first voluntary PREFLOP action
    const hero = currentHand.players.find(p => p.isHero);
    if (!hero) { setCurrentStep(0); return; }

    for (let i = 0; i < actionsWithPauses.length; i++) {
      const a = actionsWithPauses[i] as any;
      // Stop searching once we pass preflop
      if (a.type === 'STREET_START' && a.street !== 'PREFLOP') break;
      if (
        a.playerName === hero.name &&
        a.type !== 'POST_SB' &&
        a.type !== 'POST_BB' &&
        a.type !== 'STREET_START'
      ) {
        setCurrentStep(i);
        return;
      }
    }
    setCurrentStep(0);
  }, [currentHand, autoJumpHero]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Navigation callbacks ──────────────────────────────────────────────────
  const nextStep = useCallback(() => {
    if (!currentHand) return;
    if (currentStep >= actionsWithPauses.length) { setIsPlaying(false); return; }

    // Quiz mode: intercept hero action
    if (quizMode && !quizDecision) {
      const next = actionsWithPauses[currentStep];
      if (next && (next as any).type !== 'STREET_START') {
        const pa = next as PlayerAction;
        const heroName = currentHand.players.find(p => p.isHero)?.name ?? '';
        if (pa.playerName === heroName && pa.type !== 'POST_SB' && pa.type !== 'POST_BB') {
          // Derive current street without depending on gameState
          let street = 'PREFLOP';
          for (let i = 0; i < currentStep; i++) {
            const a = actionsWithPauses[i];
            if ((a as any).type === 'STREET_START') street = (a as any).street;
          }
          setQuizDecision({ actual: pa.type, street, userPick: null, revealed: false });
          setIsPlaying(false);
          return;
        }
      }
    }

    setCurrentStep(p => p + 1);
  }, [currentHand, currentStep, actionsWithPauses, quizMode, quizDecision]);

  const prevStep = useCallback(() => setCurrentStep(p => Math.max(0, p - 1)), []);

  const nextHand = useCallback(() => {
    setCurrentHandIndex(p => {
      if (p < hands.length - 1) return p + 1;
      return p;
    });
    setCurrentStep(0);
    setIsPlaying(false);
  }, [hands.length]);

  const prevHand = useCallback(() => {
    setCurrentHandIndex(p => Math.max(0, p - 1));
    setCurrentStep(0);
    setIsPlaying(false);
  }, []);

  const jumpToStreet = useCallback((target: string) => {
    if (!currentHand) return;
    setIsPlaying(false);
    if (target === 'PREFLOP') { setCurrentStep(0); return; }
    const idx = actionsWithPauses.findIndex(a => (a as any).type === 'STREET_START' && (a as any).street === target);
    setCurrentStep(idx !== -1 ? idx + 1 : actionsWithPauses.length);
  }, [currentHand, actionsWithPauses]);

  // Jump to next hero decision point
  const jumpToHeroAction = useCallback(() => {
    if (!currentHand) return;
    const hero = currentHand.players.find(p => p.isHero);
    if (!hero) return;
    setIsPlaying(false);
    // Search from currentStep forward (wrap around)
    const total = actionsWithPauses.length;
    for (let offset = 1; offset <= total; offset++) {
      const i = (currentStep + offset) % total;
      const action = actionsWithPauses[i];
      if ((action as any).type !== 'STREET_START') {
        const pa = action as PlayerAction;
        if (pa.playerName === hero.name && pa.type !== 'POST_SB' && pa.type !== 'POST_BB') {
          setCurrentStep(i); // pause BEFORE hero acts — user sees the decision
          return;
        }
      }
    }
  }, [currentHand, currentStep, actionsWithPauses]);

  const handleNoteChange = useCallback((key: string, note: HandNote) => {
    setHandNotes(prev => ({ ...prev, [key]: note }));
    if (currentUser) upsertHandNote(currentUser.id, key, note).catch(() => {});
  }, [currentUser]);

  const handlePlayerNoteSave = useCallback((playerName: string, data: PlayerNoteData) => {
    setPlayerNotes(prev => ({ ...prev, [playerName]: data }));
    if (currentUser) upsertPlayerNote(currentUser.id, playerName, data).catch(() => {});
  }, [currentUser]);

  const handleLoadSession = useCallback((session: ReplaySession, h: HandHistory[], role: 'owner' | 'coach' | 'student') => {
    setHands(h);
    setCurrentHandIndex(0);
    setCurrentStep(0);
    setIsPlaying(false);
    setShowImport(false);
    setCloudSession({ session, role });
    setShowSessionMgr(false);
    // Load all annotations for this session (for sidebar indicators)
    getAllSessionAnnotations(session.id)
      .then(setCollabAnnotations)
      .catch(() => {});
  }, []);

  const handleLogout = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    setCurrentUser(null);
    setCloudSession(null);
  }, []);

  // Quiz mode helpers
  const quizCategory = (type: ActionType) => {
    if (type === 'FOLD')  return 'fold';
    if (type === 'CHECK' || type === 'CALL') return 'passive';
    return 'aggressive'; // BET, RAISE
  };


  // Share current hand
  const handleShare = useCallback(() => {
    if (!currentHand) return;
    const encoded = encodeHand(currentHand);
    const url = `${window.location.origin}${window.location.pathname}#h=${encoded}`;
    navigator.clipboard.writeText(url).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    });
  }, [currentHand]);

  const handleCopyHand = useCallback(() => {
    if (!currentHand?.rawText) return;
    navigator.clipboard.writeText(currentHand.rawText).then(() => {
      setCopyHandDone(true);
      setTimeout(() => setCopyHandDone(false), 2000);
    });
  }, [currentHand]);

  const handleShareHandDB = useCallback(async () => {
    if (!currentHand || !supabase || !currentUser) return;
    setShareHandLoading(true);
    try {
      const { data, error } = await supabase
        .from('shared_hands')
        .insert({
          user_id: currentUser.id,
          title: `${currentHand.room} #${currentHand.id}`,
          hand_json: currentHand,
          raw_text: currentHand.rawText ?? null,
        })
        .select('id')
        .single();
      if (error) throw error;
      const url = `${window.location.origin}${window.location.pathname}?share=${data.id}`;
      await navigator.clipboard.writeText(url);
      setShareHandDone(true);
      setTimeout(() => setShareHandDone(false), 3000);
    } catch (e) {
      console.error('Share hand error:', e);
    } finally {
      setShareHandLoading(false);
    }
  }, [currentHand, currentUser]);

  const cycleSpeed = useCallback(() => {
    setPlaybackSpeed(prev => {
      const idx = SPEED_PRESETS.indexOf(prev);
      return SPEED_PRESETS[(idx + 1) % SPEED_PRESETS.length];
    });
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      switch (e.code) {
        case 'Space':     e.preventDefault(); if (currentHand) setIsPlaying(p => !p); break;
        case 'ArrowRight':e.preventDefault(); nextStep();  break;
        case 'ArrowLeft': e.preventDefault(); prevStep();  break;
        case 'ArrowUp':   e.preventDefault(); prevHand();  break;
        case 'ArrowDown': e.preventDefault(); nextHand();  break;
        case 'KeyH':      if (!e.ctrlKey && !e.metaKey) jumpToHeroAction(); break;
        case 'KeyF':      if (!e.ctrlKey && !e.metaKey) jumpToStreet('FLOP');    break;
        case 'KeyT':      if (!e.ctrlKey && !e.metaKey) jumpToStreet('TURN');    break;
        case 'KeyR':      if (!e.ctrlKey && !e.metaKey) jumpToStreet('RIVER');   break;
        case 'KeyP':      if (!e.ctrlKey && !e.metaKey) jumpToStreet('PREFLOP'); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentHand, nextStep, prevStep, nextHand, prevHand, jumpToHeroAction, jumpToStreet]);

  // ── Auto-play ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(nextStep, playbackSpeed);
    return () => clearInterval(id);
  }, [isPlaying, nextStep, playbackSpeed]);

  // ── Drag & drop ───────────────────────────────────────────────────────────
  const handleDragOver  = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false); }, []);
  const handleDrop      = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) { const reader = new FileReader(); reader.onload = ev => processImportIncremental(ev.target?.result as string); reader.readAsText(file); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Import ────────────────────────────────────────────────────────────────
  const processImportIncremental = async (text: string) => {
    setIsParsing(true); setParsingProgress(0); setHands([]);
    const blocks = text.split(/(?=PokerStars Hand #|\*{5} Hand(?:History| #| ID)|888poker|Winamax Poker|(?:^|\n)Poker Hand #|(?:^|\n)Game #\d)/i).filter(b => b.trim().length > 50);
    const total = blocks.length;
    if (total === 0) { alert('Nenhum histórico válido encontrado.'); setIsParsing(false); return; }
    let processed = 0; const all: HandHistory[] = [];
    const processChunk = () => {
      const end = Math.min(processed + BATCH_SIZE, total);
      const parsed = parseHandHistory(blocks.slice(processed, end).join('\n\n'));
      all.push(...parsed); processed = end;
      setParsingProgress(Math.round((processed / total) * 100));
      if (processed < total) setTimeout(processChunk, 10);
      else { setHands(all); setIsParsing(false); setShowImport(false); setShowStats(false); setCurrentHandIndex(0); setCurrentStep(0); setIsPlaying(false); }
    };
    processChunk();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => processImportIncremental(ev.target?.result as string);
    reader.readAsText(file);
  };


  const handleSidebarScroll = () => {
    if (!sidebarListRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = sidebarListRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 200) setVisibleHandsCount(p => Math.min(p + 40, filteredHandsWithIndex.length));
  };

  // ── Game state ────────────────────────────────────────────────────────────
  const gameState = useMemo(() => {
    const state: any = { currentStep, currentPot: 0, street: 'PREFLOP', visibleBoard: [], playerStates: {} };
    if (!currentHand) return state;
    state.currentPot = currentHand.totalPot;

    currentHand.players.forEach(p => {
      state.playerStates[p.name] = { stack: p.initialStack, currentBet: 0, hasFolded: false, isActing: false, lastActionType: '', revealedCards: undefined, isWinner: false, isLoser: false };
    });

    currentHand.actions.filter(a => a.type === 'POST_SB' || a.type === 'POST_BB').forEach(a => {
      const ps = state.playerStates[a.playerName]; if (!ps) return;
      ps.stack -= (a.amount || 0); ps.currentBet = a.amount || 0; state.currentPot += (a.amount || 0);
    });

    let maxBet = 0;
    Object.values(state.playerStates).forEach((ps: any) => { if (ps.currentBet > maxBet) maxBet = ps.currentBet; });

    const winners   = new Set(currentHand.actions.filter(a => a.type === 'COLLECTED').map(a => a.playerName));
    const showActs  = currentHand.actions.filter(a => a.type === 'SHOWS');
    const muckActs  = currentHand.actions.filter(a => a.type === 'MUCKS');
    const heroName  = currentHand.players.find(p => p.isHero)?.name ?? '';

    for (let i = 0; i < currentStep; i++) {
      const action = actionsWithPauses[i];
      if ((action as any).type === 'STREET_START') {
        const newStreet = (action as any).street;
        state.street = newStreet; maxBet = 0;
        Object.values(state.playerStates).forEach((ps: any) => { ps.currentBet = 0; ps.lastActionType = ''; });
        // All-in runout: reveal all hole cards immediately, before board is dealt
        if (newStreet === 'ALLIN_REVEAL') {
          if (!hideResults) {
            showActs.forEach(a => {
              const ps = state.playerStates[a.playerName];
              if (ps) ps.revealedCards = a.cards;
            });
          } else {
            showActs.filter(a => a.playerName === heroName).forEach(a => {
              const ps = state.playerStates[a.playerName];
              if (ps) ps.revealedCards = a.cards;
            });
          }
          continue; // street stays 'ALLIN_REVEAL'; board revealed by subsequent FLOP/TURN/RIVER steps
        }
        // At showdown: reveal all cards and winners/losers simultaneously
        if (newStreet === 'SHOWDOWN') {
          if (!hideResults) {
            showActs.forEach(a => {
              const ps = state.playerStates[a.playerName];
              if (ps) ps.revealedCards = a.cards;
            });
            muckActs.forEach(a => {
              const ps = state.playerStates[a.playerName];
              if (ps) { ps.lastActionType = 'MUCKS'; ps.revealedCards = undefined; }
            });
            currentHand.players.forEach(p => {
              const ps = state.playerStates[p.name]; if (!ps) return;
              if (winners.has(p.name)) ps.isWinner = true;
              else if (!ps.hasFolded) ps.isLoser = true;
            });
          } else {
            // hideResults: only reveal hero cards
            showActs.filter(a => a.playerName === heroName).forEach(a => {
              const ps = state.playerStates[a.playerName];
              if (ps) ps.revealedCards = a.cards;
            });
          }
        }
        continue;
      }
      const pa = action as PlayerAction;
      const ps = state.playerStates[pa.playerName]; if (!ps) continue;
      ps.lastActionType = pa.type;

      if (pa.type === 'FOLD') { ps.hasFolded = true; ps.currentBet = 0; }
      else if (pa.type === 'SHOWS') {
        if (!hideResults || pa.playerName === heroName) ps.revealedCards = pa.cards;
      }
      else if (pa.type === 'MUCKS') { ps.lastActionType = 'MUCKS'; ps.revealedCards = undefined; }
      else if (pa.type === 'CHECK' || pa.type === 'COLLECTED') { /* nothing */ }
      else if (pa.type === 'UNCALLED_RETURN') {
        const amt = pa.amount || 0;
        ps.stack += amt; state.currentPot = Math.max(0, state.currentPot - amt); ps.currentBet = Math.max(0, ps.currentBet - amt);
      } else {
        let total = pa.amount || 0;
        if (pa.type === 'CALL') total = maxBet;
        if (pa.type === 'RAISE' || pa.type === 'BET') { if (total > maxBet) maxBet = total; }
        const diff = total - ps.currentBet;
        ps.stack = Math.max(0, ps.stack - diff); state.currentPot += diff; ps.currentBet = total;
      }
    }

    if (currentStep === actionsWithPauses.length) {
      currentHand.players.forEach(p => {
        const ps = state.playerStates[p.name]; if (!ps) return;
        if (!hideResults) {
          if (winners.has(p.name)) ps.isWinner = true;
          else if (!ps.hasFolded) ps.isLoser = true;
        }
        const sa = showActs.find(a => a.playerName === p.name);
        if (sa && (!hideResults || p.name === heroName)) ps.revealedCards = sa.cards;
        const ma = muckActs.find(a => a.playerName === p.name);
        if (ma) { ps.lastActionType = 'MUCKS'; ps.revealedCards = undefined; }
      });
    }

    const sIdx = ['PREFLOP', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN'].indexOf(state.street);
    if (sIdx >= 1) state.visibleBoard = currentHand.board.slice(0, 3);
    if (sIdx >= 2) state.visibleBoard = currentHand.board.slice(0, 4);
    if (sIdx >= 3) state.visibleBoard = currentHand.board.slice(0, 5);

    if (currentStep < actionsWithPauses.length && state.street !== 'SHOWDOWN') {
      const next = actionsWithPauses[currentStep];
      if (next && (next as any).type !== 'STREET_START') {
        const ns = state.playerStates[(next as PlayerAction).playerName];
        if (ns) ns.isActing = true;
      }
    }
    return state;
  }, [currentHand, currentStep, actionsWithPauses, hideResults]);

  // ── SPR (Stack-to-Pot Ratio) ──────────────────────────────────────────────
  const spr = useMemo(() => {
    if (!currentHand || gameState.currentPot <= 0) return null;
    const activeStacks = currentHand.players
      .filter(p => {
        const ps = gameState.playerStates[p.name];
        return ps && !ps.hasFolded;
      })
      .map(p => gameState.playerStates[p.name].stack)
      .filter(s => s > 0);
    if (activeStacks.length < 2) return null;
    const effectiveStack = Math.min(...activeStacks);
    return effectiveStack / gameState.currentPot;
  }, [currentHand, gameState]);

  const currentSpeedIdx = SPEED_PRESETS.indexOf(playbackSpeed);
  const handKey = currentHand ? `${currentHand.room}_${currentHand.id}` : '';

  // ── Board texture ─────────────────────────────────────────────────────────
  const boardTexture = useMemo(
    () => getBoardTexture(gameState.visibleBoard),
    [gameState.visibleBoard]
  );

  // Minimal table oval border — derived from theme swatch color
  const minimalStyle = useMemo(() => {
    const hex = getTheme(currentTheme).swatch.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return {
      background: 'rgba(255,255,255,0.02)',
      borderRadius: '50% / 50%',
      border: `2px solid rgba(${r},${g},${b},0.45)`,
      outline: `6px solid rgba(${r},${g},${b},0.08)`,
      outlineOffset: '-1px',
      boxShadow: 'inset 0 0 60px rgba(0,0,0,0.4)',
    };
  }, [currentTheme]);

  // ── Winning board card highlight ──────────────────────────────────────────
  // Only shown at showdown (≥1 villain revealed cards + full board).
  // Highlights the board cards that are part of the winning 5-card hand.
  const winningBoardCards = useMemo((): Set<string> => {
    if (!currentHand || gameState.visibleBoard.length < 5) return new Set();

    // Need at least one opponent with revealed cards (real showdown)
    const revealedOpponents = currentHand.players
      .filter(p => !p.isHero)
      .map(p => gameState.playerStates[p.name]?.revealedCards)
      .filter((c): c is string[] => !!(c?.length === 2));

    if (revealedOpponents.length === 0) return new Set();

    // Find the player (hero or revealed villain) with the best hand
    const hero = currentHand.players.find(p => p.isHero);
    let sourceCards: string[] | null = hero?.cards?.length ? hero.cards : null;
    let bestScore = sourceCards
      ? (evaluateCards(sourceCards, gameState.visibleBoard)?.score ?? -1)
      : -1;

    for (const cards of revealedOpponents) {
      const sc = evaluateCards(cards, gameState.visibleBoard)?.score ?? -1;
      if (sc > bestScore) { bestScore = sc; sourceCards = cards; }
    }

    if (!sourceCards) return new Set();

    const best5 = getBestFiveCards(sourceCards, gameState.visibleBoard);
    if (!best5) return new Set();

    const boardSet = new Set(gameState.visibleBoard);
    return new Set(best5.filter(c => boardSet.has(c)));
  }, [currentHand, gameState]);

  // ─────────────────────────────────────────────────────────────────────────
  // ── Auth gate ──────────────────────────────────────────────────────────────
  if (!authChecked) {
    return (
      <div className="flex h-screen bg-[#02040a] items-center justify-center">
        <Loader2 size={28} className="text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <LandingPage
        onSuccess={user => setCurrentUser(user)}
      />
    );
  }

  return (
    <div
      className="flex h-screen bg-[#02040a] text-slate-100 overflow-hidden font-sans relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >

      {/* ── Drag & drop overlay ─────────────────────────────────────────────── */}
      {isDragOver && (
        <div className="absolute inset-0 z-[500] pointer-events-none flex items-center justify-center">
          <div className="absolute inset-0 bg-blue-600/10 border-4 border-dashed border-blue-500 rounded-none" />
          <div className="relative z-10 bg-[#0a0f1a]/95 border border-blue-500 rounded-3xl px-16 py-10 flex flex-col items-center gap-4 shadow-[0_0_60px_rgba(59,130,246,0.3)]">
            <FileUp size={48} className="text-blue-400" />
            <span className="text-xl font-black text-white uppercase tracking-widest">Soltar para importar</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">PS / GGPoker / 888 / Party / WPN / Winamax</span>
          </div>
        </div>
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className={`transition-all duration-300 border-r border-white/5 bg-black/40 flex flex-col h-full z-[210] shrink-0 ${isSidebarOpen ? 'w-60' : 'w-0 overflow-hidden'}`}>

        {/* Top action row: STATS | CONFIG */}
        <div className="p-2 border-b border-white/5 flex items-center gap-1 shrink-0">
          <button onClick={() => setShowStats(true)} title="Estatísticas"
            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[9px] font-black uppercase text-slate-400 hover:text-blue-400 hover:bg-white/5 transition-colors">
            <BarChart2 size={13} /> STATS
          </button>
          <div className="w-px h-4 bg-white/10" />
          <button onClick={() => setShowSettings(p => !p)} title="Configurações"
            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[9px] font-black uppercase transition-colors ${showSettings ? 'text-blue-400 bg-blue-500/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
            <Settings2 size={13} /> CONFIG
          </button>
        </div>

        {/* Cloud session badge */}
        {cloudSession && (
          <div className="px-3 py-1 shrink-0">
            <span className="flex items-center gap-1 text-[7px] font-black bg-blue-500/20 text-blue-400 px-2 py-1 rounded-lg uppercase">
              <Layers size={8} /> Sessão: {cloudSession.session.name.slice(0,20)} · {cloudSession.role}
            </span>
          </div>
        )}

        {/* Settings panel */}
        {showSettings && (
          <div className="px-3 py-3 border-b border-white/5 space-y-3 shrink-0 bg-white/[0.02]">
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Layout</p>
              <div className="flex gap-1.5 mb-3">
                {([
                  { key: 'classic', label: '◼ Classic' },
                  { key: 'minimal', label: '○ Minimal'  },
                ] as const).map(({ key, label }) => (
                  <button key={key} onClick={() => setTableLayout(key)}
                    className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all ${tableLayout === key ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}>
                    {label}
                  </button>
                ))}
              </div>
              <>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 mt-2">
                  {tableLayout === 'classic' ? 'Mesa' : 'Borda'}
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {THEMES.map(t => (
                    <button key={t.id} onClick={() => setCurrentTheme(t.id)} title={t.name}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${currentTheme === t.id ? 'border-white scale-110 shadow-[0_0_8px_rgba(255,255,255,0.4)]' : 'border-white/20 opacity-60 hover:opacity-100 hover:scale-105'}`}
                      style={{ background: t.swatch }} />
                  ))}
                </div>
              </>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 mt-2">Cartas — Verso</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {([
                  { id: 'red',   color: '#991b1b', label: 'Vermelho' },
                  { id: 'blue',  color: '#1e3a8a', label: 'Azul' },
                  { id: 'black', color: '#111827', label: 'Preto' },
                  { id: 'green', color: '#14532d', label: 'Verde' },
                ]).map(b => (
                  <button key={b.id} onClick={() => setCardBack(b.id)} title={b.label}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${cardBack === b.id ? 'border-white scale-110 shadow-[0_0_8px_rgba(255,255,255,0.4)]' : 'border-white/20 opacity-60 hover:opacity-100 hover:scale-105'}`}
                    style={{ background: b.color }} />
                ))}
              </div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-slate-300">Baralho 4 cores</span>
                <div className="flex gap-1">
                  {(['off', 'text', 'bg'] as const).map(s => (
                    <button key={s} onClick={() => setCardStyle(s)}
                      className={`text-[9px] font-black px-1.5 py-0.5 rounded transition-all ${cardStyle === s ? 'bg-blue-600 text-white' : 'bg-white/10 text-slate-400 hover:bg-white/20'}`}>
                      {s === 'off' ? 'OFF' : s === 'text' ? '4C' : 'BG'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {([
                ['Stacks em BB',      displayMode === 'bb',  () => setDisplayMode(p => p === 'chips' ? 'bb' : 'chips')],
                ['Ocultar nomes',     hidePlayerNames,       () => setHidePlayerNames(p => !p)],
                ['Ocultar resultados',hideResults,           () => setHideResults(p => !p)],
                ['Jump to Hero',      autoJumpHero,          () => setAutoJumpHero(p => !p)],
                ['Alerta de ação',    actingGlow,            () => setActingGlow(p => !p)],
                ['Mostrar SPR',       showSPR,               () => setShowSPR(p => !p)],
              ] as [string, boolean, () => void][]).map(([label, active, toggle]) => (
                <label key={label} className="flex items-center justify-between cursor-pointer">
                  <span className="text-[10px] text-slate-300">{label}</span>
                  <div onClick={toggle} className={`w-7 h-3.5 rounded-full relative transition-all cursor-pointer ${active ? 'bg-blue-600' : 'bg-white/10'}`}>
                    <div className={`absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full shadow transition-all ${active ? 'left-3.5' : 'left-0.5'}`} />
                  </div>
                </label>
              ))}
            </div>
            {currentHand && (
              <div className="flex gap-1 flex-wrap">
                <button onClick={() => setShowHandSummary(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[9px] font-black text-slate-400 hover:text-white transition-all border border-white/10">
                  <AlignLeft size={11} /> Resumo
                </button>
                <button onClick={handleShare}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-black transition-all border ${shareCopied ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'}`}>
                  <Share2 size={11} /> {shareCopied ? 'OK!' : 'Link'}
                </button>
                {/* Range button hidden — not implemented yet */}
              </div>
            )}
          </div>
        )}


        {/* ── Hand info panel ──────────────────────────────────────────────── */}
        {currentHand && (
          <div className="mx-2 my-2 shrink-0 bg-white/[0.03] border border-white/8 rounded-xl overflow-hidden">
            {/* Room + badges */}
            <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5 border-b border-white/5">
              <span className="text-[9px] font-black text-white uppercase tracking-widest truncate">{currentHand.room}</span>
              <div className="flex items-center gap-1 shrink-0">
                {currentHand.isKnockout && (
                  <span className="text-[7px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-full uppercase tracking-wider">PKO</span>
                )}
                {currentHand.tournamentId && (
                  <span className="text-[7px] font-black bg-blue-500/15 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded-full uppercase tracking-wider">MTT</span>
                )}
              </div>
            </div>

            {/* Info rows */}
            <div className="px-3 py-2 space-y-1">
              {currentHand.tournamentId && (
                <div className="flex items-center justify-between">
                  <span className="text-[8px] text-slate-500 uppercase tracking-wider">Torneio</span>
                  <span className="text-[8px] font-black text-slate-300">#{currentHand.tournamentId}</span>
                </div>
              )}
              {currentHand.buyIn && (
                <div className="flex items-center justify-between">
                  <span className="text-[8px] text-slate-500 uppercase tracking-wider">Buy-in</span>
                  <span className="text-[8px] font-black text-white">{currentHand.buyIn}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[8px] text-slate-500 uppercase tracking-wider">Blinds</span>
                <span className="text-[8px] font-black text-slate-300">{currentHand.stakes}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[8px] text-slate-500 uppercase tracking-wider">Jogo</span>
                <span className="text-[8px] font-black text-slate-300 truncate max-w-[110px] text-right">{currentHand.gameType}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[8px] text-slate-500 uppercase tracking-wider">Jogadores</span>
                <span className="text-[8px] font-black text-slate-300">{currentHand.players.length}</span>
              </div>
              {currentHand.summary.heroPos && (
                <div className="flex items-center justify-between">
                  <span className="text-[8px] text-slate-500 uppercase tracking-wider">Posição</span>
                  <span className="text-[8px] font-black text-blue-400 uppercase">{currentHand.summary.heroPos}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-0.5 border-t border-white/5 mt-0.5">
                <span className="text-[7px] text-slate-600 uppercase tracking-wider">Mão #</span>
                <span className="text-[7px] text-slate-600 truncate max-w-[110px] text-right">{currentHand.id}</span>
              </div>
            </div>
          </div>
        )}

        {/* Search + filter bar */}
        <div className="px-2 pt-2 pb-1.5 shrink-0 space-y-1.5">
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input type="text" value={sidebarSearch} onChange={e => setSidebarSearch(e.target.value)} placeholder="Buscar..."
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-6 pr-6 py-1.5 text-[10px] text-slate-300 placeholder:text-slate-600 outline-none focus:border-blue-500/50 transition-colors" />
              {sidebarSearch && <button onClick={() => setSidebarSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"><X size={9} /></button>}
            </div>
            <button onClick={() => setShowFilterModal(true)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all ${(sidebarFilter !== 'all' || positionFilter || tagFilter || stackBBFilter || bbValueFilter) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20'}`}>
              <SlidersHorizontal size={11} />
              {(sidebarFilter !== 'all' || positionFilter || tagFilter || stackBBFilter || bbValueFilter) ? '●' : 'FLT'}
            </button>
            <button
              onClick={() => setHandsReversed(v => !v)}
              title={handsReversed ? 'Ordem: antiga → nova' : 'Ordem: nova → antiga'}
              className={`p-1.5 rounded-lg border transition-all ${handsReversed ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20'}`}
            >
              <ArrowDownUp size={11} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">{filteredHandsWithIndex.length} de {hands.length} mãos</span>
            <div className="flex items-center gap-2">
              {(sidebarFilter !== 'all' || positionFilter || tagFilter || stackBBFilter || bbValueFilter) && (
                <button onClick={() => { setSidebarFilter('all'); setPositionFilter(''); setTagFilter(''); setStackBBFilter(null); setBBValueFilter(null); }} className="text-[9px] text-red-400 hover:text-red-300 font-black uppercase transition-colors">
                  ✕ limpar
                </button>
              )}
              {hands.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm(`Remover todas as ${hands.length} mãos importadas?`)) {
                      setHands([]); setHandNotes({}); setCurrentHandIndex(0); setCurrentStep(0); setIsPlaying(false);
                    }
                  }}
                  title="Limpar todas as mãos"
                  className="text-[9px] text-slate-600 hover:text-red-400 font-black uppercase transition-colors flex items-center gap-0.5"
                >
                  <X size={9} /> tudo
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Hand list */}
        <div ref={sidebarListRef} onScroll={handleSidebarScroll} className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-2 space-y-1 min-h-0">
          {hands.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-12 text-center px-4">
              <FileUp size={20} className="text-slate-700" />
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-700">Nenhuma mão importada</p>
            </div>
          )}
          {filteredHandsWithIndex.slice(0, visibleHandsCount).map(({ hand, idx }) => {
            const { heroStatus, heroCards, heroPos } = hand.summary;
            const isSelected = currentHandIndex === idx;
            const noteKey = `${hand.room}_${hand.id}`;
            const note = handNotes[noteKey];
            const hasNote = note?.text || (note?.tags?.length ?? 0) > 0;
            const isStarred = note?.starred;
            const coachAnns = collabAnnotations[noteKey] ?? [];
            const hasCoachNote = coachAnns.some(a => a.author_role === 'coach' || a.author_role === 'owner');
            const hasWarning = coachAnns.some(a => a.severity === 'warning' || a.severity === 'critical');
            return (
              <button key={hand.id + idx} onClick={() => { setCurrentHandIndex(idx); setCurrentStep(0); setIsPlaying(false); }}
                className={`w-full text-left px-3 py-2.5 rounded-xl transition-all border ${isSelected ? 'bg-blue-600/15 border-blue-500/60 shadow-[0_0_12px_rgba(59,130,246,0.15)]' : 'bg-white/[0.04] border-transparent hover:bg-white/[0.07] hover:border-white/10'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    {!hideResults && (
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${heroStatus === 'win' ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]' : heroStatus === 'lose' ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]' : 'bg-slate-600'}`} />
                    )}
                    <span className="text-[11px] font-black text-white">{hand.stakes}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isStarred && <Star size={10} className="text-amber-400 fill-amber-400" />}
                    {hasNote && <MessageSquare size={10} className="text-blue-400" />}
                    {hasCoachNote && (
                      <span title="Nota do coach" className={`w-2 h-2 rounded-full shrink-0 ${hasWarning ? 'bg-red-400 shadow-[0_0_5px_rgba(248,113,113,0.7)]' : 'bg-amber-400 shadow-[0_0_5px_rgba(251,191,36,0.7)]'}`} />
                    )}
                    <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md ${isSelected ? 'bg-blue-500/20 text-blue-300' : 'bg-white/5 text-slate-400'}`}>{heroPos}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    {heroCards.map((c, i) => (
                      <div key={i}>
                        <Card code={c} size="sm" />
                      </div>
                    ))}
                  </div>
                  <span className="text-[9px] text-slate-500 font-bold ml-auto">#{idx + 1}</span>
                </div>
              </button>
            );
          })}
          {filteredHandsWithIndex.length === 0 && (
            <div className="text-center py-8 text-slate-600 text-[9px] font-black uppercase">Nenhuma mão encontrada</div>
          )}
        </div>

        {/* Calculators (bottom) */}
        <div className="border-t border-white/5 shrink-0">
          <button onClick={() => setShowPotOdds(p => !p)}
            className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-2">
              <Calculator size={12} className="text-blue-400" />
              <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Calculadoras</span>
            </div>
            <ChevronDown size={12} className={`text-slate-600 transition-transform ${showPotOdds ? 'rotate-180' : ''}`} />
          </button>
          {showPotOdds && (
            <div className="px-3 pb-3">
              <PotOddsWidget currentPot={gameState.currentPot} bigBlindValue={bigBlindValue} displayMode={displayMode} onClose={() => setShowPotOdds(false)} />
            </div>
          )}
        </div>
      </aside>

      {/* ── Main area ────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col relative min-w-0">

        {/* Header — minimal */}
        <header className="h-12 flex items-center justify-between px-4 bg-black/40 border-b border-white/5 z-[200] backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(p => !p)} className={`p-1.5 rounded-lg transition-colors ${isSidebarOpen ? 'text-blue-500 bg-blue-500/10' : 'text-slate-400 hover:bg-white/5'}`}>
              <List size={18} />
            </button>
            <div className="flex items-center gap-2">
              <RotateCcw size={15} className="text-blue-500" />
              <h1 className="text-sm font-black tracking-tighter uppercase italic">SPOT <span className="text-blue-500">REPLAY</span></h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hands.length > 0 && (
              <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5">
                <button onClick={() => setTableZoom(z => Math.max(0.5, +(z - 0.1).toFixed(1)))} className="text-slate-400 hover:text-white transition-colors p-0.5"><ZoomOut size={12} /></button>
                <span className="text-[10px] font-black text-slate-400 w-8 text-center">{Math.round(tableZoom * 100)}%</span>
                <button onClick={() => setTableZoom(z => Math.min(1.5, +(z + 0.1).toFixed(1)))} className="text-slate-400 hover:text-white transition-colors p-0.5"><ZoomIn size={12} /></button>
              </div>
            )}
            {/* Share app button */}
            <div className="relative" ref={appShareRef}>
              <button
                onClick={() => setShowAppShare(v => !v)}
                title="Compartilhar"
                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors border ${showAppShare ? 'bg-blue-500/15 border-blue-500/30 text-blue-400' : 'text-slate-400 hover:text-white hover:bg-white/5 border-white/10'}`}
              >
                <Share2 size={12} /> Compartilhar
              </button>
              {showAppShare && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-[#0a0f1a] border border-white/10 rounded-2xl shadow-2xl z-[300] overflow-hidden">
                  <p className="text-[8px] font-black uppercase text-slate-600 tracking-widest px-4 pt-3 pb-2">Compartilhar Spot Replay</p>
                  {(() => {
                    const url = window.location.origin;
                    const text = encodeURIComponent('Confira o Spot Replay — replayer de poker profissional em português, 100% gratuito!');
                    const urlEnc = encodeURIComponent(url);
                    return (
                      <div className="pb-2">
                        <a href={`https://wa.me/?text=${text}%20${urlEnc}`} target="_blank" rel="noopener noreferrer" onClick={() => setShowAppShare(false)}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-[11px] font-black text-[#25D366]">
                          <span className="text-base leading-none">💬</span> WhatsApp
                        </a>
                        <a href={`https://t.me/share/url?url=${urlEnc}&text=${text}`} target="_blank" rel="noopener noreferrer" onClick={() => setShowAppShare(false)}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-[11px] font-black text-[#2CA5E0]">
                          <span className="text-base leading-none">✈️</span> Telegram
                        </a>
                        <a href={`https://twitter.com/intent/tweet?url=${urlEnc}&text=${text}`} target="_blank" rel="noopener noreferrer" onClick={() => setShowAppShare(false)}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-[11px] font-black text-slate-300">
                          <span className="text-base leading-none">𝕏</span> Twitter / X
                        </a>
                        <div className="border-t border-white/5 mt-1 pt-1">
                          <button
                            onClick={() => { navigator.clipboard.writeText(url); setShowAppShare(false); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-[11px] font-black text-slate-400 hover:text-white"
                          >
                            <Copy size={12} /> Copiar link
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
            <button onClick={toggleFullscreen} title="Tela cheia" className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 border border-white/10 transition-colors">
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
            {currentUser ? (
              <div className="flex items-center gap-1">
                <NotificationBell
                  notifications={notifications}
                  userId={currentUser.id}
                  open={bellOpen}
                  onToggle={o => { setBellOpen(o); if (o) setShowUnreadBanner(false); }}
                  onRead={ids => setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, read_at: new Date().toISOString() } : n))}
                  onAllRead={() => setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })))}
                  onViewAll={() => { setBellOpen(false); setShowNotificationsPage(true); }}
                />
                {isAdmin && (
                  <button
                    onClick={() => setShowAdminPanel(true)}
                    title="Painel Admin"
                    className="p-2 rounded-lg text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 border border-purple-500/20 transition-colors"
                  >
                    <Shield size={13} />
                  </button>
                )}
                {/* Unified user menu */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setShowUserMenu(v => !v)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black transition-colors border ${showUserMenu ? 'bg-white/10 border-white/20 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5 border-white/10'}`}
                  >
                    <User size={12} />
                    <span className="hidden lg:inline">{currentUser.name.split(' ')[0]}</span>
                    <ChevronDown size={10} className={`transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                  </button>
                  {showUserMenu && (
                    <div className="absolute right-0 top-full mt-2 w-44 bg-[#0a0f1a] border border-white/10 rounded-2xl shadow-2xl z-[300] overflow-hidden py-1">
                      <button
                        onClick={() => { setShowProfile(true); setShowUserMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-[11px] font-black text-slate-300 hover:text-white"
                      >
                        <User size={12} className="text-slate-500" /> PERFIL
                      </button>
                      <a
                        href="https://wa.me/5521990970439?text=Preciso+de+ajuda+no+Spot+Replay"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setShowUserMenu(false)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-[11px] font-black text-[#25D366] hover:text-[#25D366]"
                      >
                        <MessageSquare size={12} /> SUPORTE
                      </a>
                      <button
                        onClick={() => { setShowIdeasPage(true); setShowUserMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-[11px] font-black text-amber-400 hover:text-amber-300"
                      >
                        <Star size={12} /> IDEIAS
                      </button>
                      <div className="border-t border-white/5 my-1" />
                      <button
                        onClick={() => { handleLogout(); setShowUserMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-500/10 transition-colors text-[11px] font-black text-slate-500 hover:text-red-400"
                      >
                        <LogOut size={12} /> SAIR
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAuthModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-black uppercase text-white transition-all border border-white/20">
                <User size={13} /> ENTRAR
              </button>
            )}
            <button onClick={() => { setShowImport(true); setImportText(''); }} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-[10px] font-black transition-all shadow-lg active:scale-95">
              IMPORTAR
            </button>
          </div>
        </header>

        {/* Table + Controls */}
        <main className="flex-1 flex flex-col items-center p-2 relative z-10 overflow-hidden">
          {showImport ? (
            /* ── Import screen (inline, replaces table area) ──────────────────── */
            <div className="flex-1 w-full flex items-center justify-center p-4 md:p-8">
              <div className="w-full max-w-2xl space-y-6">

                {/* Parsing overlay */}
                {isParsing && (
                  <div className="fixed inset-0 z-[400] bg-[#02040a]/90 backdrop-blur-sm flex flex-col items-center justify-center gap-6">
                    <Loader2 size={48} className="text-blue-500 animate-spin" />
                    <div className="text-center">
                      <p className="text-xl font-black text-white uppercase italic mb-3">Processando {parsingProgress}%</p>
                      <div className="w-64 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 transition-all duration-300 shadow-[0_0_12px_rgba(37,99,235,0.8)]" style={{ width: `${parsingProgress}%` }} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Header text */}
                <div className="text-center">
                  <h1 className="text-2xl font-black text-white uppercase italic tracking-tight">
                    Importe suas mãos
                  </h1>
                  <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold mt-1.5">
                    PokerStars · GGPoker · 888poker · PartyPoker · WPN · Winamax
                  </p>
                </div>

                {/* Two-column: file drop + paste */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* File drop */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); e.stopPropagation(); e.currentTarget.dataset.over = '1'; e.currentTarget.classList.add('border-blue-500/60', 'bg-blue-600/5'); }}
                    onDragLeave={e => { e.currentTarget.classList.remove('border-blue-500/60', 'bg-blue-600/5'); }}
                    onDrop={e => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove('border-blue-500/60', 'bg-blue-600/5'); handleDrop(e); }}
                    className="group flex flex-col items-center justify-center gap-4 h-48 border-2 border-dashed border-white/10 rounded-2xl cursor-pointer hover:border-blue-500/50 hover:bg-blue-600/5 transition-all"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                      <FileUp size={22} className="text-slate-500 group-hover:text-blue-400 transition-colors" />
                    </div>
                    <div className="text-center">
                      <p className="text-[12px] font-black text-slate-300 group-hover:text-white transition-colors">Arraste o arquivo .txt</p>
                      <p className="text-[10px] text-slate-600 mt-0.5">ou clique para selecionar</p>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".txt" className="hidden" />
                  </div>

                  {/* Paste text */}
                  <div className="flex flex-col gap-3 h-48">
                    <textarea
                      value={importText}
                      onChange={e => setImportText(e.target.value)}
                      placeholder="Ou cole o hand history aqui..."
                      className="flex-1 w-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-3 font-mono text-[10px] text-slate-300 placeholder:text-slate-700 outline-none focus:border-blue-500/40 resize-none transition-colors"
                    />
                    <button
                      onClick={() => processImportIncremental(importText)}
                      disabled={!importText.trim() || isParsing}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl font-black text-white text-[11px] uppercase tracking-widest transition-all active:scale-95"
                    >
                      Iniciar Review
                    </button>
                  </div>
                </div>

                {/* Cancel — only when there are already hands loaded */}
                {hands.length > 0 && (
                  <div className="text-center">
                    <button
                      onClick={() => setShowImport(false)}
                      className="text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-300 transition-colors"
                    >
                      ← Voltar para o review
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : hands.length > 0 ? (
            <>
              <div className="flex-1 w-full flex items-center justify-center min-h-0">
                <div className={`relative w-full max-w-3xl aspect-[2.1/1] py-1 ${tableLayout === 'classic' ? 'perspective-container' : ''}`}>
                  <div style={{ transform: `scale(${tableZoom})`, transformOrigin: 'center center', transition: 'transform 0.2s ease', width: '100%', height: '100%' }}>
                  <div
                    className={`${tableLayout === 'classic' ? 'poker-table-surface' : ''} w-full h-full flex flex-col items-center justify-center`}
                    style={tableLayout === 'minimal' ? minimalStyle : { background: getTheme(currentTheme).felt }}
                  >
                    {tableLayout === 'classic' && <div className="poker-table-rail" />}

                    {/* Pot + Board */}
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <div className={`px-3 py-1 rounded-full flex items-center gap-2 backdrop-blur-xl shadow-2xl ${tableLayout === 'minimal' ? 'bg-black/60 border border-white/15' : 'bg-black/90 border border-white/20 border-b-2 border-b-blue-600'}`}>
                        <span className={`text-[8px] font-black uppercase tracking-widest opacity-90 ${tableLayout === 'minimal' ? 'text-slate-400' : 'text-blue-400'}`}>POT</span>
                        <span className="text-sm md:text-base font-mono-poker text-white font-bold tracking-tight">
                          {displayMode === 'bb' ? `${(gameState.currentPot / bigBlindValue).toFixed(1)} bb` : Math.floor(gameState.currentPot).toLocaleString()}
                        </span>
                        {showSPR && spr !== null && (
                          <>
                            <div className="w-px h-3 bg-white/15" />
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider">SPR</span>
                            <span className={`text-[11px] font-mono-poker font-black ${spr < 4 ? 'text-red-400' : spr < 10 ? 'text-amber-400' : 'text-emerald-400'}`}>
                              {spr.toFixed(1)}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex justify-center items-center gap-1.5 md:gap-2 h-20 md:h-28 w-full">
                        {gameState.visibleBoard.length > 0 ? (
                          gameState.visibleBoard.map((c: string, i: number) => {
                            const isWinning = winningBoardCards.has(c);
                            return (
                              <div
                                key={`${c}-${i}`}
                                className="transition-all duration-500"
                                style={{
                                  position: 'relative',
                                  zIndex: isWinning ? 10 : 1,
                                  transform: isWinning ? 'scale(1.14) translateY(-3px)' : 'scale(1) translateY(0)',
                                  filter: isWinning
                                    ? 'drop-shadow(0 0 10px rgba(250,204,21,0.9)) drop-shadow(0 0 24px rgba(250,204,21,0.5))'
                                    : winningBoardCards.size > 0 ? 'brightness(0.55)' : undefined,
                                }}
                              >
                                <Card code={c} size="lg" animate cardStyle={cardStyle} />
                              </div>
                            );
                          })
                        ) : (
                          <div className="opacity-[0.05] text-2xl md:text-3xl font-black italic tracking-[0.8em] select-none uppercase">SPOT REPLAY</div>
                        )}
                      </div>
                    </div>

                    {/* Player seats */}
                    <div className="absolute inset-0 pointer-events-none z-[150]">
                      {(tableLayout === 'classic' ? FIXED_SEATS : MINIMAL_SEATS).map((pos, idx) => {
                        const seatNum = idx + 1;
                        const p = currentHand?.players.find(p => p.seat === seatNum);
                        const ps = p ? gameState.playerStates[p.name] : null;
                        return (
                          <div key={`seat-${seatNum}`} className="pointer-events-auto">
                            {tableLayout === 'minimal' ? (
                              <PlayerSeatMinimal
                                player={p ? { ...p, stack: ps?.stack ?? p.initialStack } : undefined}
                                position={pos}
                                isActing={ps?.isActing}
                                hasFolded={ps?.hasFolded}
                                currentBet={ps?.currentBet}
                                lastActionType={ps?.lastActionType}
                                revealedCards={ps?.revealedCards}
                                isWinner={ps?.isWinner}
                                isLoser={ps?.isLoser}
                                isDealer={currentHand?.buttonSeat === seatNum}
                                displayMode={displayMode}
                                bigBlindValue={bigBlindValue}
                                hidePlayerNames={hidePlayerNames}
                                onToggleDisplay={() => setDisplayMode(p => p === 'chips' ? 'bb' : 'chips')}
                                playerNote={p ? lastNoteText(playerNotes[p.name]) : ''}
                                playerNoteLabel={p ? (playerNotes[p.name]?.label ?? '') : ''}
                                onPlayerNote={name => setPlayerNoteTarget(name)}
                                cardStyle={cardStyle}
                                isKnockout={currentHand?.isKnockout}
                                actingGlow={actingGlow}
                              />
                            ) : (
                              <PlayerSeat
                                player={p ? { ...p, stack: ps?.stack ?? p.initialStack } : undefined}
                                position={pos}
                                isActing={ps?.isActing}
                                hasFolded={ps?.hasFolded}
                                currentBet={ps?.currentBet}
                                lastActionType={ps?.lastActionType}
                                revealedCards={ps?.revealedCards}
                                isWinner={ps?.isWinner}
                                isLoser={ps?.isLoser}
                                isDealer={currentHand?.buttonSeat === seatNum}
                                displayMode={displayMode}
                                bigBlindValue={bigBlindValue}
                                hidePlayerNames={hidePlayerNames}
                                onToggleDisplay={() => setDisplayMode(p => p === 'chips' ? 'bb' : 'chips')}
                                playerNote={p ? lastNoteText(playerNotes[p.name]) : ''}
                                playerNoteLabel={p ? (playerNotes[p.name]?.label ?? '') : ''}
                                onPlayerNote={name => setPlayerNoteTarget(name)}
                                cardStyle={cardStyle}
                                isKnockout={currentHand?.isKnockout}
                                actingGlow={actingGlow}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  </div>{/* zoom wrapper */}
                </div>
              </div>

              {/* ── Range Builder (floating, from settings) ───────────────────── */}
              {showRangeBuilder && (
                <div className="absolute bottom-[7rem] left-4 z-[260]">
                  <RangeBuilder onClose={() => setShowRangeBuilder(false)} />
                </div>
              )}

              {/* ── Note panel: collab stays inline; solo = draggable floating ── */}
              {showNotePanel && currentHand && cloudSession && currentUser && (
                <div className="w-[95%] max-w-4xl mb-1 bg-[#0a0f1a]/95 backdrop-blur-3xl border border-white/10 rounded-[1.5rem] shadow-2xl overflow-hidden z-[249] shrink-0">
                  <CollabNotesPanel
                    session={cloudSession.session}
                    handKey={handKey}
                    currentUser={currentUser}
                    userRole={cloudSession.role}
                    canAnnotate={true}
                    currentStreet={gameState.street}
                    currentStep={currentStep}
                    allAnnotations={Object.values(collabAnnotations).flat()}
                    onOpenAISummary={() => setShowAISummary(true)}
                  />
                </div>
              )}

              {/* ── Controls bar ──────────────────────────────────────────────── */}
              <div className="relative mb-1 w-[95%] max-w-4xl bg-[#0a0f1a]/95 backdrop-blur-3xl border border-white/10 rounded-[1.5rem] p-1.5 shadow-[0_15px_40px_rgba(0,0,0,0.8)] flex items-center justify-between gap-2 z-[250] shrink-0">

                {/* Left: counter + progress + MARCAR + NOTE */}
                <div className="flex items-center gap-2 pl-2 shrink-0">
                  <div className="flex flex-col items-center min-w-[36px]">
                    <span className="text-[8px] font-black text-slate-500 uppercase">MÃO</span>
                    <span className="text-[11px] font-black text-white">{currentHandIndex + 1}/{hands.length}</span>
                  </div>
                  <div className="flex flex-col gap-1 w-16">
                    <span className="text-[8px] font-black text-blue-500 uppercase italic leading-none">{gameState.street}</span>
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.6)] transition-all duration-200" style={{ width: `${actionsWithPauses.length ? (currentStep / actionsWithPauses.length) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <div className="w-px h-6 bg-white/10 mx-1" />
                  {/* ★ MARCAR */}
                  <button
                    onClick={() => currentHand && handleNoteChange(handKey, { ...(handNotes[handKey] ?? { text: '', tags: [], starred: false }), starred: !handNotes[handKey]?.starred })}
                    disabled={!currentHand}
                    title="Marcar mão favorita"
                    className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all disabled:opacity-20 ${handNotes[handKey]?.starred ? 'bg-amber-500/15 border-amber-500/40 text-amber-400' : 'bg-white/5 border-white/10 text-slate-400 hover:text-amber-400 hover:border-amber-500/30'}`}
                  >
                    <Star size={12} className={handNotes[handKey]?.starred ? 'fill-amber-400' : ''} /> ★
                  </button>
                  {/* 📝 NOTE */}
                  <button
                    onClick={() => setShowNotePanel(p => !p)}
                    disabled={!currentHand}
                    title="Nota da mão"
                    className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all disabled:opacity-20 ${showNotePanel ? 'bg-blue-500/15 border-blue-500/40 text-blue-400' : handNotes[handKey]?.text ? 'bg-white/5 border-blue-500/30 text-blue-400' : 'bg-white/5 border-white/10 text-slate-400 hover:text-blue-400 hover:border-blue-500/30'}`}
                  >
                    <NotebookPen size={12} /> NOTE
                  </button>
                  {/* 📋 COPY HAND */}
                  <button
                    onClick={handleCopyHand}
                    disabled={!currentHand?.rawText}
                    title="Copiar histórico original da mão"
                    className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all disabled:opacity-20 ${copyHandDone ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'bg-white/5 border-white/10 text-slate-400 hover:text-teal-400 hover:border-teal-500/30'}`}
                  >
                    <Copy size={12} /> {copyHandDone ? 'OK!' : 'COPY'}
                  </button>
                  {/* 🔗 SHARE HAND */}
                  {currentUser && (
                    <button
                      onClick={handleShareHandDB}
                      disabled={!currentHand || shareHandLoading}
                      title="Compartilhar mão — cria link permanente"
                      className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all disabled:opacity-20 ${shareHandDone ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'bg-white/5 border-white/10 text-slate-400 hover:text-purple-400 hover:border-purple-500/30'}`}
                    >
                      <Link2 size={12} /> {shareHandDone ? 'COPIADO!' : shareHandLoading ? '...' : 'SHARE'}
                    </button>
                  )}
                </div>

                {/* Center: navigation */}
                <div className="flex items-center gap-1.5">
                  <button onClick={prevHand}  disabled={currentHandIndex === 0}              className="p-2 hover:bg-white/10 rounded-lg transition-all disabled:opacity-10 text-slate-400 active:scale-90"><ChevronLeft  size={18} /></button>
                  <button onClick={prevStep}                                                  className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all text-slate-300 active:scale-90"><SkipBack      size={18} /></button>
                  <button onClick={() => setIsPlaying(p => !p)}                              className="w-11 h-11 bg-blue-600 hover:bg-blue-500 text-white rounded-[0.8rem] flex items-center justify-center shadow-lg transition-all active:scale-95">
                    {isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" className="ml-0.5" />}
                  </button>
                  <button onClick={nextStep}                                                  className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all text-slate-300 active:scale-90"><SkipForward   size={18} /></button>
                  <button onClick={nextHand}  disabled={currentHandIndex === hands.length - 1} className="p-2 hover:bg-white/10 rounded-lg transition-all disabled:opacity-10 text-slate-400 active:scale-90"><ChevronRight size={18} /></button>

                  {/* Speed */}
                  <button onClick={cycleSpeed} title="Velocidade" className="ml-1 px-2 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[9px] font-black text-blue-400 transition-all active:scale-95 min-w-[34px] text-center">
                    {currentSpeedIdx >= 0 ? SPEED_LABELS[currentSpeedIdx] : '1×'}
                  </button>
                </div>

                {/* Right: street jump */}
                <div className="flex items-center justify-end gap-1 pr-3 shrink-0">
                  {(['PREFLOP', 'FLOP', 'TURN', 'RIVER'] as const).map(s => {
                    const available = s === 'PREFLOP' || (
                      (s === 'FLOP'  && currentHand?.board.length >= 3) ||
                      (s === 'TURN'  && currentHand?.board.length >= 4) ||
                      (s === 'RIVER' && currentHand?.board.length >= 5)
                    );
                    return (
                      <button
                        key={s} disabled={!available} onClick={() => jumpToStreet(s)}
                        className={`px-2.5 py-1.5 rounded-md text-[9px] font-black transition-all ${gameState.street === s ? 'bg-blue-600 text-white shadow-lg' : available ? 'bg-white/5 hover:bg-white/10 text-slate-400' : 'opacity-10 grayscale'}`}
                      >
                        {s === 'PREFLOP' ? 'PRE' : s}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : null}

        </main>
      </div>

      {/* ── Session Stats modal ─────────────────────────────────────────────── */}
      {showStats && (
        <SessionStats hands={hands} onClose={() => setShowStats(false)} />
      )}

      {/* ── Hand Summary modal ───────────────────────────────────────────────── */}
      {showHandSummary && currentHand && (
        <HandSummary
          hand={currentHand}
          bigBlindValue={bigBlindValue}
          displayMode={displayMode}
          onClose={() => setShowHandSummary(false)}
        />
      )}

      {/* ── Theme picker close on outside click ──────────────────────────────── */}
      {showThemePicker && (
        <div className="fixed inset-0 z-[290]" onClick={() => setShowThemePicker(false)} />
      )}

      {/* ── Player Note modal ────────────────────────────────────────────────── */}
      {playerNoteTarget && (
        <PlayerNoteModal
          playerName={playerNoteTarget}
          data={migratePlayerNote(playerNotes[playerNoteTarget] ?? {})}
          onSave={handlePlayerNoteSave}
          onClose={() => setPlayerNoteTarget(null)}
          onViewHistory={name => { setPlayerNoteTarget(null); setPlayerNoteHistoryTarget(name); }}
        />
      )}

      {/* ── Player Note History (draggable) ───────────────────────────────────── */}
      {playerNoteHistoryTarget && (
        <PlayerNoteHistory
          playerName={playerNoteHistoryTarget}
          data={migratePlayerNote(playerNotes[playerNoteHistoryTarget] ?? {})}
          onSave={handlePlayerNoteSave}
          onClose={() => setPlayerNoteHistoryTarget(null)}
        />
      )}

      {/* ── Filter modal ─────────────────────────────────────────────────────── */}
      {showFilterModal && (
        <FilterModal
          sidebarFilter={sidebarFilter}
          positionFilter={positionFilter}
          tagFilter={tagFilter}
          stackBBFilter={stackBBFilter}
          bbValueFilter={bbValueFilter}
          customTags={customTags}
          onApply={(f, p, t, sbbf, bbvf) => { setSidebarFilter(f); setPositionFilter(p); setTagFilter(t); setStackBBFilter(sbbf); setBBValueFilter(bbvf); }}
          onClose={() => setShowFilterModal(false)}
        />
      )}

      {/* ── Floating Hand Note (draggable, solo mode only) ────────────────────── */}
      {showNotePanel && currentHand && !cloudSession && (
        <FloatingHandNote
          handKey={handKey}
          note={handNotes[handKey]}
          onChange={handleNoteChange}
          customTags={customTags}
          onCreateTag={name => setCustomTags(prev => prev.includes(name) ? prev : [...prev, name])}
          onClose={() => setShowNotePanel(false)}
        />
      )}

      {/* ── Notification Toast (real-time, user is online) ───────────────────── */}
      {toastNotif && (
        <NotificationToast
          notification={toastNotif}
          onClose={() => setToastNotif(null)}
        />
      )}

      {/* ── Unread banner (user was offline, has pending messages) ───────────── */}
      {showUnreadBanner && !bellOpen && !toastNotif && (() => {
        const count = notifications.filter(n => !n.read_at).length;
        if (count === 0) return null;
        return (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[550] flex items-center gap-3 bg-[#0d1420] border border-blue-500/25 rounded-2xl px-5 py-3 shadow-[0_8px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
              <span className="text-[9px] font-black text-white">SR</span>
            </div>
            <p className="text-[11px] font-black text-white">
              {count === 1 ? '1 mensagem não lida' : `${count} mensagens não lidas`}
            </p>
            <button
              onClick={() => { setBellOpen(true); setShowUnreadBanner(false); }}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-[10px] font-black text-white uppercase tracking-wider transition-all active:scale-95"
            >
              Ver
            </button>
            <button
              onClick={() => setShowUnreadBanner(false)}
              className="p-1 text-slate-500 hover:text-white transition-colors"
            >
              <X size={13} />
            </button>
          </div>
        );
      })()}

      {/* ── Notifications Page (full-screen) ─────────────────────────────────── */}
      {showNotificationsPage && currentUser && (
        <NotificationsPage
          notifications={notifications}
          userId={currentUser.id}
          onClose={() => setShowNotificationsPage(false)}
          onRead={ids => setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, read_at: new Date().toISOString() } : n))}
          onAllRead={() => setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })))}
        />
      )}

      {/* ── Ideas Page (full-screen) ─────────────────────────────────────────── */}
      {showIdeasPage && (
        <IdeasPage
          currentUser={currentUser}
          onClose={() => setShowIdeasPage(false)}
        />
      )}

      {/* ── Admin Panel ──────────────────────────────────────────────────────── */}
      {showAdminPanel && isAdmin && (
        <AdminPanel onClose={() => setShowAdminPanel(false)} />
      )}

      {/* ── Profile Modal ─────────────────────────────────────────────────────── */}
      {showProfile && currentUser && (
        <ProfileModal
          user={currentUser}
          onClose={() => setShowProfile(false)}
          onNameChange={name => setCurrentUser(u => u ? { ...u, name } : u)}
        />
      )}

      {/* ── Auth modal ───────────────────────────────────────────────────────── */}
      {showAuthModal && (
        <AuthModal
          onSuccess={user => { setCurrentUser(user); setShowAuthModal(false); }}
          onClose={() => setShowAuthModal(false)}
        />
      )}

      {/* ── Session Manager modal ─────────────────────────────────────────────── */}
      {showSessionMgr && currentUser && (
        <SessionManager
          hands={hands}
          user={currentUser}
          onLoadSession={handleLoadSession}
          onShare={session => { setShareTarget(session); setShowSessionMgr(false); }}
          onClose={() => setShowSessionMgr(false)}
        />
      )}

      {/* ── Share Modal ───────────────────────────────────────────────────────── */}
      {shareTarget && (
        <ShareModal
          session={shareTarget}
          onClose={() => setShareTarget(null)}
        />
      )}

      {/* ── Coach AI Summary Modal ────────────────────────────────────────────── */}
      {showAISummary && cloudSession && (
        <CoachSummaryModal
          sessionName={cloudSession.session.name}
          annotations={Object.values(collabAnnotations).flat()}
          onClose={() => setShowAISummary(false)}
        />
      )}

    </div>
  );
};

export default App;
