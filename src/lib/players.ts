import { supabase } from './supabase';
import { Player } from '@/types/supabase';

function mapSpecialityToRole(speciality: string): 'batsman' | 'bowler' | 'all-rounder' | 'wicket-keeper' {
  const specialityLower = speciality.toLowerCase();
  if (specialityLower.includes('wicket-keeper')) return 'wicket-keeper';
  if (specialityLower.includes('all-rounder')) return 'all-rounder';
  if (specialityLower.includes('bowler')) return 'bowler';
  return 'batsman';
}

export async function getTeamPlayers(teamName: string): Promise<Player[]> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('team_name', teamName);

  if (error) {
    console.error('Error fetching players:', error);
    return [];
  }

  return (data || []).map(player => ({
    ...player,
    role: mapSpecialityToRole(player.speciality),
    points: 100 // Default points, adjust as needed
  }));
}
