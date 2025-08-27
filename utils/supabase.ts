import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

export function subscribeToScores(game: string, cb: (payload: any) => void): RealtimeChannel {
  return supabase
    .channel(`leaderboard-${game}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leaderboard', filter: `game=eq.${game}` }, cb)
    .subscribe();
}

export function subscribeToAchievements(game: string, cb: (payload: any) => void): RealtimeChannel {
  return supabase
    .channel(`achievements-${game}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'achievements', filter: `game=eq.${game}` }, cb)
    .subscribe();
}
