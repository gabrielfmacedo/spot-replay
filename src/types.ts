
export type ActionType = 'FOLD' | 'CHECK' | 'CALL' | 'RAISE' | 'BET' | 'POST_SB' | 'POST_BB' | 'COLLECTED' | 'SHOWS' | 'MUCKS' | 'UNCALLED_RETURN';

export interface PlayerAction {
  playerName: string;
  type: ActionType;
  amount?: number;
  cards?: string[]; 
  street: 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN';
}

export interface Player {
  name: string;
  seat: number;
  stack: number;
  initialStack: number;
  cards?: string[];
  isHero: boolean;
  position: string;
  isActive: boolean;
  bounty?: string; // e.g. "€4.50" — only set in KO tournaments
}

export interface HandHistory {
  id: string;
  room: string;
  gameType: string;
  stakes: string;
  buyIn?: string;
  tournamentId?: string;
  isKnockout?: boolean;
  players: Player[];
  board: string[];
  actions: PlayerAction[];
  totalPot: number;
  buttonSeat: number;
  summary: {
    heroStatus: 'win' | 'lose' | 'none';
    heroCards: string[];
    heroPos: string;
  };
  rawText?: string;
}

export interface Notification {
  id: string;
  title: string;
  content: string;
  type: 'offer' | 'info' | 'alert';
  isRead: boolean;
  timestamp: number;
  link?: string;
}

export interface AdSlot {
  id: string;
  imageUrl: string;
  link: string;
  title: string;
  position: 'sidebar' | 'table';
}

export interface HandNote {
  text: string;
  tags: string[];
  starred: boolean;
}

export type HandNotes = Record<string, HandNote>;

// ── Collab types ──────────────────────────────────────────────────────────────

export interface ReplaySession {
  id: string;
  owner_id: string;
  owner_email: string;
  name: string;
  room: string | null;
  hand_count: number;
  created_at: string;
  updated_at: string;
}

export interface SessionMember {
  id: string;
  session_id: string;
  user_id: string | null;
  email: string;
  role: 'coach' | 'student';
  can_annotate: boolean;
  status: 'pending' | 'accepted';
}

export interface HandAnnotation {
  id: string;
  session_id: string;
  hand_key: string;
  author_id: string;
  author_name: string;
  author_role: string;
  text: string;
  tags: string[];
  starred: boolean;
  street: string;        // 'GENERAL' | 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN'
  severity: 'info' | 'warning' | 'critical';
  step_index?: number;
  updated_at: string;
}

export interface GameState {
  currentStep: number;
  currentPot: number;
  street: 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN';
  visibleBoard: string[];
  playerStates: Record<string, {
    stack: number;
    currentBet: number;
    hasFolded: boolean;
    isActing: boolean;
    lastActionType: string;
    revealedCards?: string[];
    isWinner?: boolean;
  }>;
}
