export type PlayerRole = 'batsman' | 'bowler' | 'all-rounder' | 'wicket-keeper';

export interface Player {
  player_id: number;
  player_name: string;
  age: number;
  date_of_birth: string;
  nationality: string;
  speciality: string;
  handedness: string;
  team_name: string;
  role: PlayerRole;
  points: number;
  calculatedPoints?: number;
  base_price: number;
  auction_price: number;
  is_capped: boolean;
  is_captain: boolean;
}

export interface MatchParticipant {
  userEmail: string;
  players: Player[];
}
