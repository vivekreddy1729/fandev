import { Player } from '@/types/supabase';
import { Card, CardContent } from '@/components/ui/card';

interface PlayerCardProps {
  player: Player;
  isDragging?: boolean;
  showTeam?: boolean;
}

export function PlayerCard({ player, isDragging, showTeam = false }: PlayerCardProps) {
  return (
    <Card className={`
      cursor-grab active:cursor-grabbing
      ${isDragging ? 'opacity-50' : 'opacity-100'}
      hover:shadow-md transition-shadow
    `}>
      <CardContent className="p-4">
        <div className="flex flex-col">
          <div className="font-semibold text-sm">{player.player_name}</div>
          <div className="text-xs text-gray-500 mt-1">
            {player.role} • {player.handedness}{showTeam && ` • ${player.team_name}`}
          </div>
          {showTeam ? (
            <div className="text-xs text-gray-500 mt-1">
              {player.nationality} • {player.age} years
            </div>
          ) : player.calculatedPoints && player.points ? (
            <div className="text-xs text-gray-500 mt-1">
              <span className="text-green-600 font-medium">
                ×{(player.calculatedPoints / player.points).toFixed(1)} Multiplier
              </span>
            </div>
          ) : (
            <div className="text-xs text-gray-500 mt-1">
              {player.nationality} • {player.age} years
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
