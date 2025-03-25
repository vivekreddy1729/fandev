import { supabase } from './supabase';
import { getTeamPlayers } from './players';
import { Player, PlayerRole } from '@/types/supabase';

export async function getUserTeam(userEmail: string, matchId: number): Promise<Player[] | null> {
  try {
    console.log('Getting team for user:', userEmail, 'match:', matchId);
    const { data, error } = await supabase
      .from('user_teams')
      .select('*')
      .eq('user_email', userEmail)
      .eq('match_id', matchId)
      .single();

    if (error) throw error;
    if (!data) return null;

    // Get all player IDs
    const playerIds = Array.from({ length: 11 }, (_, i) => data[`player_${i + 1}`]);

    // Get all unique team names from the players
    const { data: playersData, error: playersError } = await supabase
      .from('players')
      .select('*')
      .in('player_id', playerIds);

    if (playersError) {
      console.error('Error fetching players:', playersError.message);
      return null;
    }
    if (!playersData) return null;

    // Sort players according to their original order and map speciality to role
    const orderedPlayers = playerIds.map((id, index) => {
      const player = playersData.find(p => p.player_id === id);
      if (!player) return undefined;
      
      // Map speciality to role
      const specialityLower = player.speciality.toLowerCase();
      let role: Player['role'] = 'batsman';
      if (specialityLower.includes('wicket-keeper')) role = 'wicket-keeper';
      else if (specialityLower.includes('all-rounder')) role = 'all-rounder';
      else if (specialityLower.includes('bowler')) role = 'bowler';
      
      // Set default points if not present and calculate multiplier (11 - index)
      const points = player.points || 100; // Default points value
      const multiplier = 11 - index;
      return {
        ...player,
        role,
        points,
        calculatedPoints: points * multiplier
      };
    }).filter((p): p is Player => p !== undefined);

    return orderedPlayers;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error in getUserTeam:', error.name, error.message);
    } else if (typeof error === 'object' && error !== null) {
      console.error('Error in getUserTeam:', error);
    } else {
      console.error('Unknown error in getUserTeam');
    }
    return null;
  }
}

export async function saveUserTeam(
  userEmail: string,
  matchId: number,
  players: Player[]
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Saving team for user:', userEmail, 'match:', matchId);
    if (!userEmail) {
      throw new Error('User email is required');
    }

    // Check if team already exists
    const { data: existingTeam, error: checkError } = await supabase
      .from('user_teams')
      .select('*')
      .eq('user_email', userEmail)
      .eq('match_id', matchId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is 'not found' error
      throw checkError;
    }

    const teamData = {
      user_email: userEmail,
      match_id: matchId,
      player_1: players[0].player_id,
      player_2: players[1].player_id,
      player_3: players[2].player_id,
      player_4: players[3].player_id,
      player_5: players[4].player_id,
      player_6: players[5].player_id,
      player_7: players[6].player_id,
      player_8: players[7].player_id,
      player_9: players[8].player_id,
      player_10: players[9].player_id,
      player_11: players[10].player_id,
    };

    const { error } = existingTeam
      ? await supabase
          .from('user_teams')
          .update(teamData)
          .eq('user_email', userEmail)
          .eq('match_id', matchId)
      : await supabase
          .from('user_teams')
          .insert(teamData);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error saving team:', error);
    let errorMessage = 'Unknown error occurred';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
      const supabaseError = error as { message?: string, details?: string };
      errorMessage = supabaseError.message || supabaseError.details || errorMessage;
    }

    return { 
      success: false, 
      error: errorMessage
    };
  }
}

export async function getMatchParticipantCount(matchId: number): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('user_teams')
      .select('*', { count: 'exact' })
      .eq('match_id', matchId);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error getting participant count:', error);
    return 0;
  }
}

export async function hasUserTeamForMatch(userEmail: string, matchId: number): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_teams')
      .select('*')
      .eq('user_email', userEmail)
      .eq('match_id', matchId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  } catch (error) {
    console.error('Error checking for user team:', error);
    return false;
  }
}

interface PlayerResponse {
  player_id: string;
  player_name: string;
  age: number;
  date_of_birth: string;
  nationality: string;
  speciality: string;
  handedness: string;
  team_name: string;
  points: number;
  base_price: number;
  auction_price: number;
  is_capped: boolean;
  is_captain: boolean;
}

interface UserTeamWithPlayers {
  user_email: string;
  player_1: PlayerResponse | null;
  player_2: PlayerResponse | null;
  player_3: PlayerResponse | null;
  player_4: PlayerResponse | null;
  player_5: PlayerResponse | null;
  player_6: PlayerResponse | null;
  player_7: PlayerResponse | null;
  player_8: PlayerResponse | null;
  player_9: PlayerResponse | null;
  player_10: PlayerResponse | null;
  player_11: PlayerResponse | null;
}

interface MatchParticipant {
  userEmail: string;
  players: Player[];
}

export async function getMatchParticipants(matchId: number): Promise<MatchParticipant[]> {
  try {
    console.log('Getting participants for match:', matchId);
    // Get all user teams with their players for this match
    // First verify if any teams exist for this match
    const { count, error: countError } = await supabase
      .from('user_teams')
      .select('*', { count: 'exact' })
      .eq('match_id', matchId);

    if (countError) {
      console.error('Error checking team count:', countError);
      throw countError;
    }

    if (!count || count === 0) {
      console.log('No teams found for match:', matchId);
      return [];
    }

    console.log(`Found ${count} teams for match:`, matchId);

    // Get all user teams for this match
    const { data: userTeams, error: teamsError } = await supabase
      .from('user_teams')
      .select('*')
      .eq('match_id', matchId);

    if (teamsError) {
      console.error('Error fetching teams:', teamsError);
      throw teamsError;
    }

    if (!userTeams || userTeams.length === 0) {
      console.log('No teams data returned for match:', matchId);
      return [];
    }

    // Get all player IDs from all teams
    const playerIds = userTeams.flatMap(team => [
      team.player_1,
      team.player_2,
      team.player_3,
      team.player_4,
      team.player_5,
      team.player_6,
      team.player_7,
      team.player_8,
      team.player_9,
      team.player_10,
      team.player_11,
    ]).filter(id => id !== null);

    // Get all players data in a single query
    const { data: playersData, error: playersError } = await supabase
      .from('players')
      .select('*')
      .in('player_id', playerIds);

    if (playersError) {
      console.error('Error fetching players:', playersError);
      throw playersError;
    }

    if (!playersData) {
      console.log('No players data returned');
      return [];
    }

    console.log(`Found ${playersData.length} players for ${userTeams.length} teams`);

    if (teamsError) {
      console.error('Error fetching teams:', teamsError);
      throw teamsError;
    }

    if (!userTeams || userTeams.length === 0) {
      console.log('No teams data returned for match:', matchId);
      return [];
    }

    console.log(`Processing ${userTeams.length} teams...`);

    // Transform the data into the expected format
    const participantsWithTeams = userTeams.map((team) => {
      // Get players for this team
      const teamPlayerIds = [
        team.player_1,
        team.player_2,
        team.player_3,
        team.player_4,
        team.player_5,
        team.player_6,
        team.player_7,
        team.player_8,
        team.player_9,
        team.player_10,
        team.player_11,
      ].filter((id): id is string => id !== null);

      const orderedPlayers = teamPlayerIds.map((playerId, index) => {
        const player = playersData.find(p => p.player_id === playerId);
        if (!player) {
          console.error(`Player ${playerId} not found in players data`);
          return null;
        }
        const specialityLower = player.speciality.toLowerCase();
        let role: PlayerRole = 'batsman';
        if (specialityLower.includes('wicket-keeper')) role = 'wicket-keeper';
        else if (specialityLower.includes('all-rounder')) role = 'all-rounder';
        else if (specialityLower.includes('bowler')) role = 'bowler';
        
        const points = player.points || 100;
        const multiplier = 11 - index;
        
        return {
          player_id: player.player_id,
          player_name: player.player_name,
          age: player.age,
          date_of_birth: player.date_of_birth,
          nationality: player.nationality,
          speciality: player.speciality,
          handedness: player.handedness,
          team_name: player.team_name,
          role,
          points,
          calculatedPoints: points * multiplier,
          base_price: player.base_price,
          auction_price: player.auction_price,
          is_capped: player.is_capped,
          is_captain: player.is_captain
        } as unknown as Player;
      }).filter((player): player is Player => player !== null);

      return {
        userEmail: team.user_email,
        players: orderedPlayers
      };
    });

    return participantsWithTeams;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error getting match participants:', error.name, error.message, error.stack);
    } else if (typeof error === 'object' && error !== null) {
      console.error('Error getting match participants:', JSON.stringify(error));
    } else {
      console.error('Unknown error getting match participants:', error);
    }
    return [];
  }
}
