
export type ActionType = 'FOLD' | 'CHECK' | 'CALL' | 'RAISE' | 'BET' | 'POST_SB' | 'POST_BB' | 'COLLECTED' | 'SHOWS' | 'MUCKS' | 'UNCALLED_RETURN';

export type StreetName = 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN' | 'ALLIN_REVEAL';

export interface PlayerAction {
  playerName: string;
  type: ActionType;
  amount?: number;
  cards?: string[];
  street: 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN';
}

export interface StreetStartAction {
  type: 'STREET_START';
  street: StreetName;
}

export type ActionWithPause = PlayerAction | StreetStartAction;

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
  reviewed_at?: string | null;
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

export interface StudyLink {
  url: string;
  label: string;
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
  study_links?: StudyLink[];
  updated_at: string;
}

// ── Coach v3 types ────────────────────────────────────────────────────────────

export interface CoachRelation {
  id: string;
  coach_id: string;
  student_id: string;
  created_at: string;
  coach_email?: string;
  student_email?: string;
}

export interface ReviewSession {
  id: string;
  student_id: string;
  coach_id: string;
  name: string;
  status: 'pending' | 'annotating' | 'done' | 'confirmed';
  created_at: string;
  updated_at: string;
  finalized_at: string | null;
  student_confirmed_at: string | null;
  // computed server-side (not stored as column, derived from hands_json length)
  hands_count?: number;
  // joined
  student_email?: string;
  coach_email?: string;
  annotations_count?: number;
}

export interface ReviewAnnotation {
  id: string;
  review_session_id: string;
  hand_key: string;
  author_id: string;
  author_name: string;
  author_role: string;
  text: string;
  tags: string[];
  starred: boolean;
  street: string;
  severity: 'info' | 'warning' | 'critical';
  step_index?: number;
  study_links?: StudyLink[];
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
