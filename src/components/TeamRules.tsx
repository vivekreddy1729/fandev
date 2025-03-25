import { Player, PlayerRole } from '@/types/supabase';

export interface TeamRules {
  maxPlayers: number;
  maxPlayersPerTeam: number;
  roleLimits: {
    [key in PlayerRole]: number;
  };
}

export const TEAM_RULES: TeamRules = {
  maxPlayers: 11,
  maxPlayersPerTeam: 6,
  roleLimits: {
    'batsman': 4,
    'bowler': 4,
    'all-rounder': 2,
    'wicket-keeper': 1
  }
};

export function validateTeamSelection(players: Player[]): { 
  isValid: boolean; 
  errors: string[];
  currentCounts: { [key in PlayerRole]: number };
} {
  const errors: string[] = [];
  const currentCounts = {
    'batsman': 0,
    'bowler': 0,
    'all-rounder': 0,
    'wicket-keeper': 0
  };

  // Count players by role and team
  const teamCounts: { [key: string]: number } = {};
  players.forEach(player => {
    currentCounts[player.role]++;
    teamCounts[player.team_name] = (teamCounts[player.team_name] || 0) + 1;
  });

  // Check total players
  if (players.length > TEAM_RULES.maxPlayers) {
    errors.push(`Team can have maximum ${TEAM_RULES.maxPlayers} players`);
  }

  // Check role limits
  Object.entries(TEAM_RULES.roleLimits).forEach(([role, limit]) => {
    const count = currentCounts[role as PlayerRole];
    if (count > limit) {
      errors.push(`Maximum ${limit} ${role}(s) allowed, currently have ${count}`);
    }
  });

  // Check per-team limits
  Object.entries(teamCounts).forEach(([team, count]) => {
    if (count > TEAM_RULES.maxPlayersPerTeam) {
      errors.push(`Maximum ${TEAM_RULES.maxPlayersPerTeam} players allowed from ${team}, currently have ${count}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    currentCounts
  };
}

export function calculatePlayerPoints(players: Player[]): Player[] {
  const multipliers = Array.from({ length: 11 }, (_, i) => 11 - i);
  return players.map((player, index) => ({
    ...player,
    calculatedPoints: player.points * (multipliers[index] || 1)
  }));
}
