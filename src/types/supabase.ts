export type PlayerRole = 'batsman' | 'bowler' | 'all-rounder' | 'wicket-keeper';

export interface Player {
  player_id: number;
  player_name: string;
  age: number;
  date_of_birth: string; // Date stored as string in TypeScript
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

export interface IPLSchedule {
  match_id: number;
  match_number: number;
  match_date: string; // Date stored as string in TypeScript
  match_time: string; // Time stored as string in TypeScript
  venue: string;
  city: string;
  team1: string;
  team2: string;
  match_type: string;
  status: string;
  result?: string;
  winner?: string;
  man_of_the_match?: string;
  toss_winner?: string;
  toss_decision?: string;
}

export interface Database {
  public: {
    Tables: {
      players: {
        Row: Player;
        Insert: Omit<Player, 'player_id'>;
        Update: Partial<Player>;
      };
      IPL_Schedule: {
        Row: IPLSchedule;
        Insert: Omit<IPLSchedule, 'match_id'>;
        Update: Partial<IPLSchedule>;
      };
    };
  };
}
