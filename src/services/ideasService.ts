import { supabase } from './supabase';

export interface Idea {
  id: string;
  user_id: string;
  author_name: string;
  title: string;
  description: string | null;
  status: 'open' | 'planned' | 'done' | 'rejected';
  created_at: string;
  total_points: number;       // aggregated client-side
  vote_count: number;         // number of voters
  my_vote: number | null;     // current user's vote (1-5) or null
}

export interface RawIdea {
  id: string;
  user_id: string;
  author_name: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
}

export interface RawVote {
  idea_id: string;
  user_id: string;
  points: number;
}

export async function fetchIdeas(userId: string | null): Promise<Idea[]> {
  if (!supabase) return [];

  const [ideasRes, votesRes] = await Promise.all([
    supabase.from('ideas').select('*').order('created_at', { ascending: false }),
    supabase.from('idea_votes').select('idea_id, user_id, points'),
  ]);

  if (ideasRes.error) throw ideasRes.error;

  const ideas: RawIdea[] = ideasRes.data ?? [];
  const votes: RawVote[] = votesRes.data ?? [];

  return ideas.map(idea => {
    const ideaVotes = votes.filter(v => v.idea_id === idea.id);
    const total_points = ideaVotes.reduce((s, v) => s + v.points, 0);
    const vote_count = ideaVotes.length;
    const myVote = userId ? (ideaVotes.find(v => v.user_id === userId)?.points ?? null) : null;
    return {
      ...idea,
      status: idea.status as Idea['status'],
      total_points,
      vote_count,
      my_vote: myVote,
    };
  }).sort((a, b) => b.total_points - a.total_points);
}

export async function submitIdea(userId: string, authorName: string, title: string, description: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('ideas').insert({
    user_id: userId,
    author_name: authorName,
    title: title.trim(),
    description: description.trim() || null,
  });
  if (error) throw error;
}

export async function upsertVote(ideaId: string, userId: string, points: number): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('idea_votes').upsert(
    { idea_id: ideaId, user_id: userId, points },
    { onConflict: 'idea_id,user_id' }
  );
  if (error) throw error;
}

export async function deleteVote(ideaId: string, userId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('idea_votes').delete()
    .eq('idea_id', ideaId).eq('user_id', userId);
  if (error) throw error;
}
